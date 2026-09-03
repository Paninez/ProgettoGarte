import { useDatabase } from "../context/DatabaseContext";
import { rowToDettaglio, rowToGradingItem, clearSheetRange, deleteSheetRow, findOrCreateDriveFolder, findFolder, createFolder, uploadImageToDrive } from "../lib/googleApi";
import { appendSheetRow, deleteRowByID, updateSheetRow, updateSheetRows, fetchSheetRows, fetchSheetRowsBatch, appendSheetRows } from "../lib/googleApi";
import { logDbChange, FieldDiff } from "../lib/dbAuditLogger";
import { Carrello, DettaglioCarrello, OggettoMagazzino, Spedizione, GradingItem } from "../types";
import { useDriveUpload } from "./useDriveUpload";

// Traccia il numero di aggiornamenti di stato delle spedizioni concorrenti in corso per prevenire rubberbanding (race conditions)
let activeShipmentUpdatesCount = 0;

export function useSpedizioniSync() {
  const { handleUploadPhoto } = useDriveUpload();
  const { isProd,
    magazzino, setMagazzino,
    carrelli, setCarrelli,
    dettagli, setDettagli,
    spedizioni, setSpedizioni,
    oggettiInGrading,
    spreadsheetId, token, driveFolders,
    currentOperatore, addSafetyLog,
    user, userRole, setSafetyLogs, handleLoadDatabase, dbInitialized
  } = useDatabase();
  
  // You might need handleUploadPhoto if it's used inside handleUploadShipmentPhotos. 
  // Let's pass it as an argument or just extract it later.
  const handleProceedToShipment = async (
    cartId: string,
    shipmentType: string,
    tracking: string,
    selectedIndexes: number[],
    selectedGradingIds?: string[],
    photos?: File[],
    shippingCost?: number,
    activeCartItems?: any[],
    activeGradingItems?: any[]
  ) => {
    if (!spreadsheetId || !token) return;
    if (userRole === "utente") {
      alert("Azione non consentita: solo Owner e Moderatore possono procedere alla spedizione.");
      return;
    }
    if (!dbInitialized) {
      alert("Errore: Il database locale non è ancora completamente caricato. Attendi prima di procedere.");
      return;
    }

    // 1. Find the cart info
    const cart = carrelli.find((c) => c.ID_Carrello === cartId);
    if (!cart) throw new Error("Carrello non trovato.");

    // Filter detailed items belonging to this cart
    const allCartItems: DettaglioCarrello[] = activeCartItems 
      ? activeCartItems.map((i: any) => ({ ...i, ID_Carrello: i.ID_Carrello || cartId } as DettaglioCarrello))
      : dettagli.filter((d) => d.ID_Carrello === cartId);

    // Split into shipped, remaining, and already shipped items
    // Note: selectedIndexes corresponds to indices in allCartItems (which includes already shipped items)
    const shippedItems: DettaglioCarrello[] = [];
    const remainingItems: DettaglioCarrello[] = [];
    const alreadyShippedItems: DettaglioCarrello[] = [];

    allCartItems.forEach((item, idx) => {
      // Strict Cart ID validation to prevent leaking items from other carts
      if (item.ID_Carrello !== cartId) {
        return;
      }

      if (item.ID_Spedizione) {
        alreadyShippedItems.push(item);
      } else if (selectedIndexes.includes(idx)) {
        shippedItems.push(item);
      } else {
        remainingItems.push(item);
      }
    });

    // 1b. Filter grading items belonging to this cart
    const cartGradingItems: GradingItem[] = activeGradingItems
      ? activeGradingItems.filter((g) => g.ID_Carrello === cartId)
      : oggettiInGrading.filter((g) => g.ID_Carrello === cartId);
    
    const shippedGradingItems: GradingItem[] = [];
    const remainingGradingItems: GradingItem[] = [];

    cartGradingItems.forEach((g) => {
      const isSelected = selectedGradingIds?.includes(g.ID_Oggetto_Grading);
      const isAlreadyDelivered = !!g.ID_Spedizione || !!(g.Link_Foto_Ritornata && g.Metodo_Consegna);
      
      if (isSelected && g.ID_Carrello === cartId && !isAlreadyDelivered) {
        shippedGradingItems.push(g);
      } else if (!isAlreadyDelivered) {
        remainingGradingItems.push(g);
      }
    });

    if (shippedItems.length === 0 && shippedGradingItems.length === 0) {
      throw new Error("Nessun articolo o carta selezionato per la spedizione.");
    }

    const isPartial = remainingItems.length > 0 || remainingGradingItems.length > 0;
    // 4. Update cart status and prepayment totals in Clienti_Carrelli
    const cartsRows = await fetchSheetRows(spreadsheetId, "Clienti_Carrelli!A:K", token).catch(() => fetchSheetRows(spreadsheetId, "Clienti_Carrelli!A:J", token));
    const cartIdx = cartsRows.findIndex((r) => r[0]?.toString() === cartId);
    if (cartIdx === -1) throw new Error("Carrello non trovato nel database.");

    // Calculate shipped items financials
    let shippedTotalValue = 0;
    let shippedPaidValue = 0;
    shippedItems.forEach((item) => {
      shippedTotalValue += item.Prezzo_Registrato;
      if (item.Pagato_Singolarmente) {
        shippedPaidValue += item.Prezzo_Registrato;
      } else if (item.Acconto_Pagato) {
        shippedPaidValue += item.Acconto_Pagato;
      }
    });

    // Calculate shipped grading items financials
    let shippedGradingTotalValue = 0;
    let shippedGradingPaidValue = 0;
    shippedGradingItems.forEach((g) => {
      shippedGradingTotalValue += g.Costo_Cliente;
      if (g.Pagato_Singolarmente) {
        shippedGradingPaidValue += g.Costo_Cliente;
      } else if (g.Acconto_Pagato) {
        shippedGradingPaidValue += g.Acconto_Pagato;
      }
    });

    const totalShippedValue = shippedTotalValue + shippedGradingTotalValue;
    const totalShippedPaidValue = shippedPaidValue + shippedGradingPaidValue;
    const shippedRemainingUnpaid = totalShippedValue - totalShippedPaidValue;

    const financeShippedValue = shippedTotalValue;
    const financeShippedPaidValue = shippedPaidValue;
    const financeShippedRemainingUnpaid = financeShippedValue - financeShippedPaidValue;

    // 5. Create shipment entry in Logistica_Spedizioni
    const shipId = `SHIP-${Date.now().toString().slice(-6)}`;
    const todayStr = new Date().toISOString().split("T")[0];

    // Map item IDs to names
    const shippedNamesParts: string[] = [];
    if (shippedItems.length > 0) {
      shippedNamesParts.push(
        ...shippedItems.map((item) => {
          const info = magazzino.find((m) => m.ID_Oggetto === item.ID_Oggetto);
          return `${info ? info.Nome : "Articolo"} (ID: ${item.ID_Oggetto})`;
        })
      );
    }
    if (shippedGradingItems.length > 0) {
      shippedNamesParts.push(
        ...shippedGradingItems.map((g) => `${g.Nome_Carta} (Grading PSA/BGS, ID: ${g.ID_Oggetto_Grading})`)
      );
    }
    const shippedNames = shippedNamesParts.join(", ");

    // Prepare tags ensuring the chosen delivery method (e.g. "Corriere", "Vinted", "Consegna a mano") is included
    const existingTags = (cart.Tag || "").split(",").map((t) => t.trim()).filter(Boolean);
    const deliveryMethods = ["Vinted", "Corriere", "A Mano Roma", "A Mano Napoli", "Consegna a mano"];
    const cleanedTags = existingTags.filter((t) => !deliveryMethods.includes(t));
    if (shipmentType) {
      cleanedTags.push(shipmentType);
    }
    const finalShipmentTags = cleanedTags.join(", ");

    const shipmentRow = [
      shipId,
      cartId,
      "", // Link_Foto
      todayStr,
      shipmentType === "Consegna a mano" ? "N/A" : (tracking || "N/A"),
      "Preparazione Pacco",
      shippedNames,
      cart.Nome_Cliente || "",
      cart.Indirizzo_Spedizione || "",
      cart.Telefono || "",
      finalShipmentTags, // Tag (so it has "Corriere", "Vinted", etc.)
      shipmentType, // Corriere / Tipo Spedizione
      shippingCost || 0 // Costo_Spedizione
    ];
    await appendSheetRow(spreadsheetId, "Logistica_Spedizioni!A:M", shipmentRow, token);

        // Keep original cart, add any newly paid amount to Totale_Pagato
    const newTotalePagato = (cart.Totale_Pagato || 0) + shippedRemainingUnpaid;
    const isOriginalEmpty = remainingItems.length === 0 && remainingGradingItems.length === 0;
    const finalCartStatus = cart.Stato_Carrello;
    
    const updatedOriginalCartRow = [
      cartId,
      cart.Nome_Cliente,
      finalCartStatus,
      newTotalePagato,
      cart.Telefono || "",
      cart.Email || "",
      cart.Indirizzo_Spedizione || "",
      cart.Tag || "",
      cart.Strike?.toString() || "0",
      cart.Cattivo_Data || "",
      cart.Note || ""
    ];
    await updateSheetRow(spreadsheetId, `Clienti_Carrelli!A${cartIdx + 1}:K${cartIdx + 1}`, updatedOriginalCartRow, token);

    // 6. Scale stock levels from Magazzino
    const magazzinoRows = await fetchSheetRows(spreadsheetId, "Magazzino!A:E", token);
    const shippedCounts: Record<string, number> = {};
    for (const item of shippedItems) {
      shippedCounts[item.ID_Oggetto] = (shippedCounts[item.ID_Oggetto] || 0) + 1;
    }
    for (const [itemId, qtyToSubtract] of Object.entries(shippedCounts)) {
      const magIdx = magazzinoRows.findIndex((r) => r[0]?.toString() === itemId);
      if (magIdx !== -1) {
        const rowData = magazzinoRows[magIdx];
        const currentQty = parseInt(rowData[2]) || 0;
        const newQty = Math.max(0, currentQty - qtyToSubtract);
        const updatedRow = [
          rowData[0],
          rowData[1],
          newQty,
          rowData[3],
          rowData[4]
        ];
        await updateSheetRow(spreadsheetId, `Magazzino!A${magIdx + 1}:E${magIdx + 1}`, updatedRow, token);
      }
    }

    // 7. Synchronize Dettaglio_Carrello
    const allDetailRows = await fetchSheetRows(spreadsheetId, "Dettaglio_Carrello!A2:H2000", token);
    const otherDetails = allDetailRows
      .map(rowToDettaglio)
      .filter((d) => d.ID_Carrello !== cartId && d.ID_Carrello !== "");

    // Set shipped items as paid and attach shipId
    const shippedItemsUpdated = shippedItems.map(item => ({
      ...item,
      Pagato_Singolarmente: true,
      ID_Spedizione: shipId
    }));

    const combinedDetails = [...otherDetails, ...alreadyShippedItems, ...remainingItems, ...shippedItemsUpdated];
    
    const valuesToWrite = combinedDetails.map((d) => [
      d.ID_Carrello,
      d.ID_Oggetto,
      d.Pagato_Singolarmente ? "TRUE" : "FALSE",
      d.Prezzo_Registrato,
      d.Pagamento_Posticipato ? "TRUE" : "FALSE",
      d.Acconto_Pagato || 0,
      d.ID_Spedizione || "",
      d.Reso ? "TRUE" : "FALSE"
    ]);

    while (valuesToWrite.length < 2000) {
      valuesToWrite.push(["", "", "", "", "", "", "", ""]);
    }
    await updateSheetRows(spreadsheetId, `Dettaglio_Carrello!A2:H2001`, valuesToWrite, token);

    // 7.5 Synchronize Oggetti_In_Grading
    if (selectedGradingIds && selectedGradingIds.length > 0) {
      const allGradingRows = await fetchSheetRows(spreadsheetId, "Oggetti_In_Grading!A2:P2000", token);
      const items = allGradingRows.map(rowToGradingItem).filter((item) => item.ID_Oggetto_Grading !== "");
      
      const updatedItems = items.map((item) => {
        if (selectedGradingIds.includes(item.ID_Oggetto_Grading) && item.ID_Carrello === cartId) {
          return {
            ...item,
            Metodo_Consegna: "Spedita",
            Pagato_Singolarmente: true,
            ID_Spedizione: shipId
          };
        }
        return item;
      });

      const gradingValues = updatedItems.map((g) => [
        g.ID_Oggetto_Grading,
        g.ID_Carrello,
        g.Nome_Carta || (g as any).Nome_Oggetto || "",
        g.Tipologia_Servizio || (g as any).Compagnia_Grading || "",
        g.Costo_Cliente,
        g.Costo_Acquisto,
        g.Margine_Lordo,
        g.Link_Foto || "",
        g.Pagato_Singolarmente ? "TRUE" : "FALSE",
        g.ID_Gruppo_Grading || "",
        g.Link_Foto_Ritornata || "",
        g.Metodo_Consegna || "",
        g.Pagamento_Posticipato ? "TRUE" : "FALSE",
        g.Acconto_Pagato || 0,
        g.ID_Spedizione || "",
        g.Reso ? "TRUE" : "FALSE"
      ]);

      while (gradingValues.length < 2000) {
        gradingValues.push(["", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""]);
      }
      await updateSheetRows(spreadsheetId, `Oggetti_In_Grading!A2:P2001`, gradingValues, token);
      addSafetyLog(`Oggetti in grading spediti (${selectedGradingIds.join(", ")}) mossa in spedita nel carrello ${cartId}.`);
    }
    // 8. Register Finance revenue entry (for the remainder unpaid balance of standard items)
    if (financeShippedRemainingUnpaid > 0) {
      const financeRow = [
        todayStr,
        "Entrata",
        financeShippedRemainingUnpaid,
        "Vendita Carrello",
        `Saldo spedizione ${shipId} (${isOriginalEmpty ? "Completo" : "Parziale"}) per ${cart.Nome_Cliente} - Operatore ${currentOperatore}`
      ];
      await appendSheetRow(spreadsheetId, "Finanze!A:E", financeRow, token);
    }

    await handleLoadDatabase();
  };

  const handleUpdateShipmentStatus = async (spedizioneId: string, cartId: string, newStatus: string) => {
    console.log(`[DEBUG] [handleUpdateShipmentStatus] Inizio aggiornamento spedizione. ID Spedizione: "${spedizioneId}", ID Carrello: "${cartId}", Nuovo Stato: "${newStatus}"`);
    
    if (!spreadsheetId || !token) {
      console.warn("[DEBUG] [handleUpdateShipmentStatus] Abortito: spreadsheetId o token mancanti.");
      return;
    }
    if (userRole === "utente") {
      alert("Azione non consentita: solo Owner e Moderatore possono consegnare le spedizioni.");
      console.warn("[DEBUG] [handleUpdateShipmentStatus] Abortito: ruolo utente non autorizzato.");
      return;
    }
    if (!dbInitialized) {
      alert("Errore: Il database locale non è ancora completamente caricato. Attendi prima di procedere.");
      console.warn("[DEBUG] [handleUpdateShipmentStatus] Abortito: database non ancora inizializzato.");
      return;
    }

    // Initialize pending map and register optimistic update to prevent rubberbanding
    if (!(window as any).pendingSpedizioniUpdates) {
      (window as any).pendingSpedizioniUpdates = new Map<string, any>();
    }
    const currentPending = (window as any).pendingSpedizioniUpdates.get(spedizioneId) || {};
    (window as any).pendingSpedizioniUpdates.set(spedizioneId, { ...currentPending, Stato_Consegna: newStatus });

    // Incrementa il contatore delle scritture concorrenti attive prima di avviare il background process
    activeShipmentUpdatesCount++;

    // Ottimistic UI update
    console.log("[DEBUG] [handleUpdateShipmentStatus] Applicazione aggiornamento ottimistico UI...");
    setSpedizioni(prev => prev.map(s => 
      s.ID_Spedizione === spedizioneId ? { ...s, Stato_Consegna: newStatus } : s
    ));

    // Eseguiamo il network asincrono in background per non bloccare la UI
    (async () => {
      try {
        console.log("[DEBUG] [handleUpdateShipmentStatus] Lettura righe da 'Logistica_Spedizioni!A:M' in corso...");
        const shipRows = await fetchSheetRows(spreadsheetId, "Logistica_Spedizioni!A:M", token);
        console.log(`[DEBUG] [handleUpdateShipmentStatus] Lettura completata. Righe trovate: ${shipRows.length}`);
        
        const shipIdx = shipRows.findIndex((r) => r[0]?.toString().trim().toLowerCase() === spedizioneId.trim().toLowerCase());
        console.log(`[DEBUG] [handleUpdateShipmentStatus] Ricerca ID "${spedizioneId}": riga trovata all'indice ${shipIdx} (riga reale sul foglio: ${shipIdx + 1})`);
        
        if (shipIdx === -1) {
          throw new Error(`Spedizione con ID "${spedizioneId}" non trovata nel foglio Logistica_Spedizioni.`);
        }

        const oldRow = shipRows[shipIdx] || [];
        const oldStatus = oldRow[5]?.toString() || "";
        const updatedShipRow = [
          oldRow[0]?.toString() || "", // ID
          oldRow[1]?.toString() || "", // CartID
          oldRow[2]?.toString() || "", // Photos
          oldRow[3]?.toString() || "", // Date
          oldRow[4]?.toString() || "", // Tracking
          newStatus, // New Delivery status
          oldRow[6]?.toString() || "", // Oggetti_Spediti
          oldRow[7]?.toString() || "", // Nome_Cliente
          oldRow[8]?.toString() || "", // Indirizzo_Spedizione
          oldRow[9]?.toString() || "", // Telefono
          oldRow[10]?.toString() || "", // Tag
          oldRow[11]?.toString() || "", // Corriere
          oldRow[12] !== undefined ? (parseFloat(oldRow[12]?.toString()) || 0) : 0 // Costo_Spedizione
        ];
        
        const targetRange = `Logistica_Spedizioni!A${shipIdx + 1}:M${shipIdx + 1}`;
        console.log(`[DEBUG] [handleUpdateShipmentStatus] Scrittura riga aggiornata su Google Sheets. Range: "${targetRange}"...`, updatedShipRow);
        
        await updateSheetRow(spreadsheetId, targetRange, updatedShipRow, token);

        logDbChange(token, driveFolders?.backupId, {
          table: "Logistica_Spedizioni",
          operation: "MODIFICA",
          recordId: spedizioneId,
          recordName: oldRow[7]?.toString() || "Spedizione Cliente",
          operator: currentOperatore,
          userEmail: user?.email,
          diffs: [
            { field: "Stato_Consegna", oldValue: oldStatus, newValue: newStatus }
          ]
        }, setSafetyLogs);
        console.log("[DEBUG] [handleUpdateShipmentStatus] Scrittura completata con successo su Google Sheets.");
      } catch (err: any) {
        // Clear pending update on failure to revert
        if ((window as any).pendingSpedizioniUpdates) {
          (window as any).pendingSpedizioniUpdates.delete(spedizioneId);
        }
        if (err?.name === "AuthExpiredError" || err?.message?.includes("Autenticazione scaduta")) {
          console.warn("[DEBUG] [handleUpdateShipmentStatus] ERRORE durante il processo:", err.message);
        } else {
          console.error("[DEBUG] [handleUpdateShipmentStatus] ERRORE durante il processo:", err);
        }
        await handleLoadDatabase();
      } finally {
        // Decrementa il contatore delle scritture concorrenti
        activeShipmentUpdatesCount--;
        if (activeShipmentUpdatesCount === 0) {
          console.log("[DEBUG] [handleUpdateShipmentStatus] Nessun altro aggiornamento concorrente in corso. Inizio sincronizzazione handleLoadDatabase()...");
          const startTime = Date.now();
          await handleLoadDatabase();
          console.log(`[DEBUG] [handleUpdateShipmentStatus] handleLoadDatabase() COMPLETATO in ${Date.now() - startTime}ms. Interfaccia allineata!`);
        } else {
          console.log(`[DEBUG] [handleUpdateShipmentStatus] Salto handleLoadDatabase() poiché ci sono ancora ${activeShipmentUpdatesCount} aggiornamenti attivi.`);
        }
      }
    })(); // Fine background IIFE
    return Promise.resolve();
  };

  const handleReturnItem = async (shipmentId: string, itemId: string, isGrading: boolean) => {
    if (!spreadsheetId || !token) return;
    if (userRole === "utente") {
      alert("Azione non consentita: solo Owner e Moderatore possono processare resi.");
      return;
    }

    try {
      if (isGrading) {
        // Update its Reso flag in Oggetti_In_Grading
        const gRows = await fetchSheetRows(spreadsheetId, "Oggetti_In_Grading!A:P", token);
        const gIdx = gRows.findIndex(r => r[0]?.toString() === itemId);
        if (gIdx !== -1) {
          const oldRow = gRows[gIdx];
          const newRow = [...oldRow];
          // Ensure the array has 16 columns
          while (newRow.length < 16) newRow.push("");
          newRow[15] = "TRUE"; // Reso is col P
          await updateSheetRow(spreadsheetId, `Oggetti_In_Grading!A${gIdx + 1}:P${gIdx + 1}`, newRow, token);
        }
      } else {
        // Re-stock in Magazzino
        const magRows = await fetchSheetRows(spreadsheetId, "Magazzino!A:E", token);
        const magIdx = magRows.findIndex(r => r[0]?.toString() === itemId);
        if (magIdx !== -1) {
          const mRow = magRows[magIdx];
          const currentQty = parseInt(mRow[2]) || 0;
          const newRow = [...mRow];
          newRow[2] = (currentQty + 1).toString();
          await updateSheetRow(spreadsheetId, `Magazzino!A${magIdx + 1}:E${magIdx + 1}`, newRow, token);
        }

        // Mark Reso in Dettaglio_Carrello
        const detRows = await fetchSheetRows(spreadsheetId, "Dettaglio_Carrello!A:H", token);
        const detIdx = detRows.findIndex(r => r[1]?.toString() === itemId && r[6]?.toString() === shipmentId);
        if (detIdx !== -1) {
          const oldRow = detRows[detIdx];
          const newRow = [...oldRow];
          while (newRow.length < 8) newRow.push("");
          newRow[7] = "TRUE";
          await updateSheetRow(spreadsheetId, `Dettaglio_Carrello!A${detIdx + 1}:H${detIdx + 1}`, newRow, token);
        }
      }

      addSafetyLog(`Reso processato per oggetto ${itemId} dalla spedizione ${shipmentId}`);
      await handleLoadDatabase();
    } catch (err: any) {
      console.error(err);
      alert("Errore durante il reso dell'articolo: " + err.message);
    }
  };

  const handleUploadShipmentPhotos = async (shipmentId: string, cartId: string, photos: File[]) => {
    if (!spreadsheetId || !token) return;
    if (photos.length === 0) return;
    
    // 1. Determine folder ID
    let folderId = driveFolders?.spedizioneClienteId || "";
    if (!folderId) {
      folderId = await findOrCreateDriveFolder(token, isProd);
    }
    
    const cart = carrelli.find(c => c.ID_Carrello === cartId);
    const cartName = cart ? cart.Nome_Cliente : "Sconosciuto";
    const subFolderName = `${cartName}-${cartId}`;
    
    // 2. Upload photos
    const uploadedUrls: string[] = [];
    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      const customName = `Spedizione-${cartId}-FotoAggiuntiva${i + 1}-${Date.now()}`;
      try {
        let subFolderId = await findFolder(token, subFolderName, folderId);
        if (!subFolderId) {
          subFolderId = await createFolder(token, subFolderName, folderId);
        }
        const url = await uploadImageToDrive(photo, subFolderId, token, customName);
        uploadedUrls.push(url);
      } catch (err: any) {
        throw new Error(`Errore durante il caricamento foto: ${err.message || err}`);
      }
    }
    
    // 3. Update shipment row
    const shipRows = await fetchSheetRows(spreadsheetId, "Logistica_Spedizioni!A:M", token);
    const shipIdx = shipRows.findIndex((r) => r[0]?.toString().trim() === shipmentId.trim());
    if (shipIdx === -1) throw new Error("Spedizione non trovata nel database.");
    
    const row = shipRows[shipIdx];
    // Fill to 13 columns if not present
    while (row.length < 13) row.push("");
    
    // Append to existing Link_Foto_Oggetti (index 2)
    const existingLinks = row[2]?.toString().trim() || "";
    const newLinksStr = uploadedUrls.join(",");
    let combinedLinks = existingLinks;
    if (existingLinks && existingLinks !== "Consegna a mano") {
      combinedLinks = `${existingLinks},${newLinksStr}`;
    } else {
      combinedLinks = newLinksStr;
    }
    row[2] = combinedLinks;
    
    if (!(window as any).pendingSpedizioniUpdates) {
      (window as any).pendingSpedizioniUpdates = new Map<string, any>();
    }
    const currentPendingPhoto = (window as any).pendingSpedizioniUpdates.get(shipmentId) || {};
    (window as any).pendingSpedizioniUpdates.set(shipmentId, { ...currentPendingPhoto, Link_Foto_Oggetti: combinedLinks });

    try {
      await updateSheetRow(spreadsheetId, `Logistica_Spedizioni!A${shipIdx + 1}:M${shipIdx + 1}`, row, token);
      
      // Update local state
      setSpedizioni(prev => prev.map(s => 
        s.ID_Spedizione === shipmentId ? { ...s, Link_Foto_Oggetti: combinedLinks } : s
      ));
      
      // Refresh DB silently
      await handleLoadDatabase();
    } catch (err) {
      if ((window as any).pendingSpedizioniUpdates) {
        (window as any).pendingSpedizioniUpdates.delete(shipmentId);
      }
      throw err;
    }
  };

  const handleUpdateShipmentCost = async (shipmentId: string, newCost: number) => {
    // Initialize pending map and register optimistic update to prevent rubberbanding
    if (!(window as any).pendingSpedizioniUpdates) {
      (window as any).pendingSpedizioniUpdates = new Map<string, any>();
    }
    const currentPending = (window as any).pendingSpedizioniUpdates.get(shipmentId) || {};
    (window as any).pendingSpedizioniUpdates.set(shipmentId, { ...currentPending, Costo_Spedizione: newCost });

    // Local state update for immediate feedback
    setSpedizioni((prev) =>
      prev.map((s) => (s.ID_Spedizione === shipmentId ? { ...s, Costo_Spedizione: newCost } : s))
    );

    if (!spreadsheetId || !token) return;

    try {
      const shipRows = await fetchSheetRows(spreadsheetId, "Logistica_Spedizioni!A:M", token);
      const shipIdx = shipRows.findIndex((r) => r[0]?.toString() === shipmentId);
      if (shipIdx !== -1) {
        const oldRow = shipRows[shipIdx];
        const updatedShipRow = [
          oldRow[0], // ID
          oldRow[1], // CartID
          oldRow[2], // Photos
          oldRow[3], // Date
          oldRow[4], // Tracking
          oldRow[5], // Status
          oldRow[6] || "", // Oggetti_Spediti
          oldRow[7] || "", // Nome_Cliente
          oldRow[8] || "", // Indirizzo_Spedizione
          oldRow[9] || "", // Telefono
          oldRow[10] || "", // Tag
          oldRow[11] || "", // Corriere
          newCost // Costo_Spedizione
        ];
        await updateSheetRow(spreadsheetId, `Logistica_Spedizioni!A${shipIdx + 1}:M${shipIdx + 1}`, updatedShipRow, token);
      }
    } catch (err: any) {
      // Clear pending update on failure to revert
      if ((window as any).pendingSpedizioniUpdates) {
        (window as any).pendingSpedizioniUpdates.delete(shipmentId);
      }
      if (err?.name === "AuthExpiredError" || err?.message?.includes("Autenticazione scaduta")) {
        console.warn("Errore aggiornamento costo spedizione:", err.message);
      } else {
        console.error("Errore aggiornamento costo spedizione:", err);
      }
      handleLoadDatabase(); // Revert on error
    }
  };

  const handleUpdateShipmentTag = async (shipmentId: string, newTag: string) => {
    const methods = ["Vinted", "Corriere", "A Mano Roma", "A Mano Napoli", "Consegna a mano"];
    const foundMethod = (newTag || "").split(",").map((t) => t.trim()).find((t) => methods.includes(t));

    // Initialize pending map and register optimistic update to prevent rubberbanding
    if (!(window as any).pendingSpedizioniUpdates) {
      (window as any).pendingSpedizioniUpdates = new Map<string, any>();
    }
    const currentPending = (window as any).pendingSpedizioniUpdates.get(shipmentId) || {};
    (window as any).pendingSpedizioniUpdates.set(shipmentId, {
      ...currentPending,
      Tag: newTag,
      ...(foundMethod ? { Corriere: foundMethod } : {})
    });

    // Local state update for immediate feedback
    setSpedizioni((prev) =>
      prev.map((s) => (s.ID_Spedizione === shipmentId ? { ...s, Tag: newTag, ...(foundMethod ? { Corriere: foundMethod } : {}) } : s))
    );

    if (!spreadsheetId || !token) return;

    try {
      const shipRows = await fetchSheetRows(spreadsheetId, "Logistica_Spedizioni!A:M", token);
      const shipIdx = shipRows.findIndex((r) => r[0]?.toString() === shipmentId);
      if (shipIdx !== -1) {
        const oldRow = shipRows[shipIdx];
        const updatedCorriere = foundMethod !== undefined ? foundMethod : (oldRow[11] || "");
        const updatedShipRow = [
          oldRow[0], // ID
          oldRow[1], // CartID
          oldRow[2], // Photos
          oldRow[3], // Date
          oldRow[4], // Tracking
          oldRow[5], // Status
          oldRow[6] || "", // Oggetti_Spediti
          oldRow[7] || "", // Nome_Cliente
          oldRow[8] || "", // Indirizzo_Spedizione
          oldRow[9] || "", // Telefono
          newTag, // Tag
          updatedCorriere, // Corriere
          oldRow[12] || 0 // Costo_Spedizione
        ];
        await updateSheetRow(spreadsheetId, `Logistica_Spedizioni!A${shipIdx + 1}:M${shipIdx + 1}`, updatedShipRow, token);
      }
    } catch (err: any) {
      // Clear pending update on failure to revert
      if ((window as any).pendingSpedizioniUpdates) {
        (window as any).pendingSpedizioniUpdates.delete(shipmentId);
      }
      if (err?.name === "AuthExpiredError" || err?.message?.includes("Autenticazione scaduta")) {
        console.warn("Errore aggiornamento tag spedizione:", err.message);
      } else {
        console.error("Errore aggiornamento tag spedizione:", err);
      }
      handleLoadDatabase();
    }
  };

  // Add custom manual transaction in Finances


  return {
    handleProceedToShipment,
    handleUpdateShipmentStatus,
    handleReturnItem,
    handleUploadShipmentPhotos,
    handleUpdateShipmentCost,
    handleUpdateShipmentTag
  };
}
