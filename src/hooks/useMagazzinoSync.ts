import { useDatabase } from "../context/DatabaseContext";
import { rowToDettaglio, rowToGradingItem, clearSheetRange, deleteSheetRow } from "../lib/googleApi";
import { appendSheetRow, deleteRowByID, updateSheetRow, updateSheetRows, fetchSheetRows, fetchSheetRowsBatch, appendSheetRows } from "../lib/googleApi";
import { logDbChange, FieldDiff } from "../lib/dbAuditLogger";
import { OggettoMagazzino, DettaglioCarrello, Carrello, Spedizione, CustomerLoyalty } from "../types";

export function useMagazzinoSync() {
  const { 
    magazzino, setMagazzino,
    carrelli, setCarrelli,
    dettagli, setDettagli,
    spreadsheetId, token, driveFolders,
    currentOperatore, addSafetyLog, loyaltyProfiles,
    user, userRole, setSafetyLogs, handleLoadDatabase, oggettiInGrading
  } = useDatabase();

  const handleAddItem = async (item: Omit<OggettoMagazzino, "ID_Oggetto">) => {
    if (!spreadsheetId || !token) return;
    if (userRole !== "owner") {
      alert("Azione non consentita: solo l'utente Owner può aggiungere articoli al magazzino.");
      return;
    }
    const newId = `OBJ-${Date.now().toString().slice(-4)}`;
    const newRow = [
      newId,
      item.Nome,
      item.Quantità_Disponibile,
      item.Costo_Acquisto,
      item.Prezzo_Vendita,
      item.Is_Preordine ? "TRUE" : "FALSE",
      item.Acconto_Pagato || 0,
      item.Data_Arrivo_Prevista || "",
      item.Stato_Preordine || "",
      item.Is_Carta_Singola ? "TRUE" : "FALSE",
      item.Espansione || "",
      item.Rarità || "",
      item.Condizione || "",
      item.Lingua || "",
      item.Gradata ? "TRUE" : "FALSE",
      item.Archiviata ? "TRUE" : "FALSE",
      item.Storico_Costi || "",
      item.Costo_Spedizione_Lotto || 0,
      item.Costo_Dogana_Lotto || 0,
      item.Costo_Accessori_Lotto || 0,
      item.Data_Spedizione_Presunta || "",
      item.Tag || ""
    ];

    await appendSheetRow(spreadsheetId, "Magazzino!A:V", newRow, token);

    logDbChange(token, driveFolders?.backupId, {
      table: "Magazzino",
      operation: "INSERIMENTO",
      recordId: newId,
      recordName: item.Nome,
      operator: currentOperatore,
      userEmail: user?.email,
      details: {
        Quantità: item.Quantità_Disponibile,
        Costo: `€${Number(item.Costo_Acquisto || 0).toFixed(2)}`,
        Prezzo: `€${Number(item.Prezzo_Vendita || 0).toFixed(2)}`,
        Preordine: item.Is_Preordine ? "Sì" : "No",
        Espansione: item.Espansione || "N/D"
      }
    }, setSafetyLogs);

    // Also record a financial expense for initial stock purchase if stock is > 0 or if there is an acconto
    if (item.Quantità_Disponibile > 0 || (item.Is_Preordine && item.Acconto_Pagato && item.Acconto_Pagato > 0)) {
      const costoTotale = item.Is_Preordine ? (item.Acconto_Pagato || 0) : (item.Quantità_Disponibile * item.Costo_Acquisto);
      if (costoTotale > 0) {
        const todayStr = new Date().toISOString().split("T")[0];
        const expenseRow = [
          todayStr,
          "Uscita",
          costoTotale,
          item.Is_Preordine ? "Acconto Preordine" : "Acquisto Stock",
          `${item.Is_Preordine ? 'Acconto preordine' : 'Acquisto iniziale stock'} ${newId} - ${item.Nome}`
        ];
        await appendSheetRow(spreadsheetId, "Finanze!A:E", expenseRow, token);
      }
    }

    await handleLoadDatabase();
  };

  // Restock warehouse item
  const handleRestockItem = async (itemId: string, addedQty: number, newCostPerUnit: number, breakdown?: any) => {
    if (!spreadsheetId || !token) return;

    const existing = magazzino.find(m => m.ID_Oggetto === itemId);
    if (!existing) throw new Error("Articolo non trovato");

    const oldQty = Number(existing.Quantità_Disponibile) || 0;
    const oldCost = Number(existing.Costo_Acquisto) || 0;
    
    const totalOldCost = oldQty * oldCost;
    const totalAddedCost = addedQty * newCostPerUnit;
    const newQty = oldQty + addedQty;
    const newAvgCost = newQty > 0 ? (totalOldCost + totalAddedCost) / newQty : 0;

    
    let newStorico = existing.Storico_Costi || "[]";
    if (breakdown) {
      try {
        const parsed = JSON.parse(newStorico);
        parsed.push(breakdown);
        newStorico = JSON.stringify(parsed);
      } catch (e) {
        newStorico = JSON.stringify([breakdown]);
      }
    }

    await handleEditItem({
      ...existing,
      Quantità_Disponibile: newQty,
      Costo_Acquisto: newAvgCost,
      Storico_Costi: newStorico,
      Costo_Spedizione_Lotto: breakdown ? breakdown.costoSpedizione : 0,
      Costo_Dogana_Lotto: breakdown ? breakdown.costoTasse : 0,
      Costo_Accessori_Lotto: breakdown ? breakdown.altriCosti : 0
    });

    if (addedQty > 0) {
      const todayStr = new Date().toISOString().split("T")[0];
      const expenseRow = [
        todayStr,
        "Uscita",
        totalAddedCost,
        "Acquisto Stock",
        `Rifornimento ${itemId} - ${existing.Nome} (+${addedQty})`
      ];
      await appendSheetRow(spreadsheetId, "Finanze!A:E", expenseRow, token);
      await handleLoadDatabase();
    }
  };

  // Edit warehouse item
  const handleEditItem = async (updatedItem: OggettoMagazzino) => {
    if (!spreadsheetId || !token) return;
    if (userRole !== "owner") {
      alert("Azione non consentita: solo l'utente Owner può modificare articoli nel magazzino.");
      return;
    }

    // Fetch raw rows to find index
    const rows = await fetchSheetRows(spreadsheetId, "Magazzino!A:V", token);
    const index = rows.findIndex((r) => r[0]?.toString() === updatedItem.ID_Oggetto);
    if (index === -1) {
      throw new Error("Articolo non trovato nel database per l'aggiornamento.");
    }

    const rowNum = index + 1; // 1-based index in the absolute range
    const updatedValues = [
      updatedItem.ID_Oggetto,
      updatedItem.Nome,
      updatedItem.Quantità_Disponibile,
      updatedItem.Costo_Acquisto,
      updatedItem.Prezzo_Vendita,
      updatedItem.Is_Preordine ? "TRUE" : "FALSE",
      updatedItem.Acconto_Pagato || 0,
      updatedItem.Data_Arrivo_Prevista || "",
      updatedItem.Stato_Preordine || "",
      updatedItem.Is_Carta_Singola ? "TRUE" : "FALSE",
      updatedItem.Espansione || "",
      updatedItem.Rarità || "",
      updatedItem.Condizione || "",
      updatedItem.Lingua || "",
      updatedItem.Gradata ? "TRUE" : "FALSE",
      updatedItem.Archiviata ? "TRUE" : "FALSE",
      updatedItem.Storico_Costi || "",
      updatedItem.Costo_Spedizione_Lotto || 0,
      updatedItem.Costo_Dogana_Lotto || 0,
      updatedItem.Costo_Accessori_Lotto || 0,
      updatedItem.Data_Spedizione_Presunta || "",
      updatedItem.Tag || ""
    ];

    const oldItem = magazzino.find(m => m.ID_Oggetto === updatedItem.ID_Oggetto);
    const diffs: FieldDiff[] = [];
    if (oldItem) {
      diffs.push({ field: "Nome", oldValue: oldItem.Nome, newValue: updatedItem.Nome });
      diffs.push({ field: "Quantità_Disponibile", oldValue: oldItem.Quantità_Disponibile, newValue: updatedItem.Quantità_Disponibile });
      diffs.push({ field: "Costo_Acquisto", oldValue: `€${Number(oldItem.Costo_Acquisto || 0).toFixed(2)}`, newValue: `€${Number(updatedItem.Costo_Acquisto || 0).toFixed(2)}` });
      diffs.push({ field: "Prezzo_Vendita", oldValue: `€${Number(oldItem.Prezzo_Vendita || 0).toFixed(2)}`, newValue: `€${Number(updatedItem.Prezzo_Vendita || 0).toFixed(2)}` });
      diffs.push({ field: "Is_Preordine", oldValue: oldItem.Is_Preordine ? "TRUE" : "FALSE", newValue: updatedItem.Is_Preordine ? "TRUE" : "FALSE" });
      diffs.push({ field: "Espansione", oldValue: oldItem.Espansione || "", newValue: updatedItem.Espansione || "" });
      diffs.push({ field: "Condizione", oldValue: oldItem.Condizione || "", newValue: updatedItem.Condizione || "" });
      diffs.push({ field: "Archiviata", oldValue: oldItem.Archiviata ? "TRUE" : "FALSE", newValue: updatedItem.Archiviata ? "TRUE" : "FALSE" });
      diffs.push({ field: "Tag", oldValue: oldItem.Tag || "", newValue: updatedItem.Tag || "" });
    }

    await updateSheetRow(spreadsheetId, `Magazzino!A${rowNum}:V${rowNum}`, updatedValues, token);

    logDbChange(token, driveFolders?.backupId, {
      table: "Magazzino",
      operation: "MODIFICA",
      recordId: updatedItem.ID_Oggetto,
      recordName: updatedItem.Nome,
      operator: currentOperatore,
      userEmail: user?.email,
      diffs
    }, setSafetyLogs);

    await handleLoadDatabase();
  };

  // Bulk update dates (Data_Arrivo_Prevista and/or Data_Spedizione_Presunta)
  const handleBulkUpdateDates = async (
    updates: {
      id: string;
      dataArrivoPrevista?: string | null;
      dataSpedizionePresunta?: string | null;
    }[]
  ) => {
    if (!spreadsheetId || !token) return;
    if (userRole !== "owner") {
      alert("Azione non consentita: solo l'utente Owner può modificare articoli nel magazzino.");
      return;
    }

    if (!updates || updates.length === 0) return;

    const rows = await fetchSheetRows(spreadsheetId, "Magazzino!A:V", token);

    for (const update of updates) {
      const index = rows.findIndex((r) => r[0]?.toString() === update.id);
      if (index === -1) continue;

      const oldItem = magazzino.find(m => m.ID_Oggetto === update.id);
      if (!oldItem) continue;

      const rowNum = index + 1;
      const finalDataArrivo = update.dataArrivoPrevista !== undefined 
        ? (update.dataArrivoPrevista || "") 
        : (oldItem.Data_Arrivo_Prevista || "");
        
      const finalDataSpedizione = update.dataSpedizionePresunta !== undefined 
        ? (update.dataSpedizionePresunta || "") 
        : (oldItem.Data_Spedizione_Presunta || "");

      const updatedValues = [
        oldItem.ID_Oggetto,
        oldItem.Nome,
        oldItem.Quantità_Disponibile,
        oldItem.Costo_Acquisto,
        oldItem.Prezzo_Vendita,
        oldItem.Is_Preordine ? "TRUE" : "FALSE",
        oldItem.Acconto_Pagato || 0,
        finalDataArrivo,
        oldItem.Stato_Preordine || "",
        oldItem.Is_Carta_Singola ? "TRUE" : "FALSE",
        oldItem.Espansione || "",
        oldItem.Rarità || "",
        oldItem.Condizione || "",
        oldItem.Lingua || "",
        oldItem.Gradata ? "TRUE" : "FALSE",
        oldItem.Archiviata ? "TRUE" : "FALSE",
        oldItem.Storico_Costi || "",
        oldItem.Costo_Spedizione_Lotto || 0,
        oldItem.Costo_Dogana_Lotto || 0,
        oldItem.Costo_Accessori_Lotto || 0,
        finalDataSpedizione,
        oldItem.Tag || ""
      ];

      await updateSheetRow(spreadsheetId, `Magazzino!A${rowNum}:V${rowNum}`, updatedValues, token);
    }

    await handleLoadDatabase();
  };

  // Delete item from warehouse
  const handleDeleteItem = async (itemId: string) => {
    if (!spreadsheetId || !token) return;
    if (userRole !== "owner") {
      alert("Azione non consentita: solo l'utente Owner può eliminare articoli.");
      return;
    }

    const targetItem = magazzino.find(m => m.ID_Oggetto === itemId);
    await deleteRowByID(spreadsheetId, "Magazzino", itemId, token);

    logDbChange(token, driveFolders?.backupId, {
      table: "Magazzino",
      operation: "ELIMINAZIONE",
      recordId: itemId,
      recordName: targetItem?.Nome || "Articolo Magazzino",
      operator: currentOperatore,
      userEmail: user?.email,
      rawNote: `Articolo ID ${itemId} (${targetItem?.Nome || "N/A"}) rimosso permanentemente dal foglio Magazzino.`
    }, setSafetyLogs);

    await handleLoadDatabase();
  };

  const handleSettlePreorder = async (
    item: OggettoMagazzino, 
    costoUnitario: number, 
    quantitaAcquistata: number,
    costoSpedizione: number = 0,
    costoDogana: number = 0,
    altroCosto: number = 0
  ) => {
    if (!spreadsheetId || !token) return;
    if (userRole !== "owner") {
      alert("Azione non consentita: solo l'utente Owner può saldare i preordini.");
      return;
    }

    const importoArticoli = costoUnitario * quantitaAcquistata;
    const importoSaldatoTotale = importoArticoli + costoSpedizione + costoDogana + altroCosto;

    // 1. Aggiungi voce in Finanze
    const todayStr = new Date().toISOString().split("T")[0];
    
    const extraDetails = [];
    if (costoSpedizione > 0) extraDetails.push(`Sped: €${costoSpedizione.toFixed(2)}`);
    if (costoDogana > 0) extraDetails.push(`Dogana: €${costoDogana.toFixed(2)}`);
    if (altroCosto > 0) extraDetails.push(`Altro: €${altroCosto.toFixed(2)}`);
    
    const detailsStr = extraDetails.length > 0 ? ` [${extraDetails.join(', ')}]` : '';

    const expenseRow = [
      todayStr,
      "Uscita",
      importoSaldatoTotale,
      "Acquisto Preordine",
      `Acquisto definitivo preordine ${item.ID_Oggetto} - ${item.Nome} (${quantitaAcquistata} pz)${detailsStr}`
    ];
    
    if (importoSaldatoTotale > 0) {
       await appendSheetRow(spreadsheetId, "Finanze!A:E", expenseRow, token);
    }

    // 2. Aggiorna articolo in Magazzino
    const qtyForDiv = quantitaAcquistata > 0 ? quantitaAcquistata : 1;
    const breakdownData = {
      lotto: "Saldo Preordine",
      qty: quantitaAcquistata,
      costoSpedizione: costoSpedizione / qtyForDiv,
      costoTasse: costoDogana / qtyForDiv,
      altriCosti: altroCosto / qtyForDiv,
      costoOggetto: costoUnitario,
      costoUnitario: (importoArticoli + costoSpedizione + costoDogana + altroCosto) / qtyForDiv,
      date: new Date().toISOString()
    };
    
    let newStorico = item.Storico_Costi || "[]";
    try {
      const parsed = JSON.parse(newStorico);
      parsed.push(breakdownData);
      newStorico = JSON.stringify(parsed);
    } catch (e) {
      newStorico = JSON.stringify([breakdownData]);
    }

    await handleEditItem({
      ...item,
      Stato_Preordine: "Saldato",
      Costo_Acquisto: (importoArticoli + costoSpedizione + costoDogana + altroCosto) / qtyForDiv,
      Quantità_Disponibile: quantitaAcquistata,
      Acconto_Pagato: importoSaldatoTotale,
      Storico_Costi: newStorico
    });
  };

  // Add registered user

  const handleDistributeItemToCarts = async (
    itemId: string,
    distributions: { cartId: string; clientName?: string; quantity: number; isPaid?: boolean }[]
  ) => {
    if (!spreadsheetId || !token) return;
    if (userRole === "utente") {
      alert("Azione non consentita: solo Owner e Moderatore possono distribuire articoli ai carrelli.");
      return;
    }

    const itemInfo = magazzino.find(m => m.ID_Oggetto === itemId);
    if (!itemInfo) throw new Error("Articolo non trovato.");

    const newCartRows: any[][] = [];
    const newDetailRows: any[][] = [];

    // Check which carts are new and generate detailed items
    distributions.forEach(d => {
      let currentCartId = d.cartId;
      if (d.cartId === "new" && d.clientName) {
        currentCartId = `CART-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
        newCartRows.push([
          currentCartId,
          d.clientName,
          "Aperto",
          0,
          "",
          "",
          "",
          "",
          "0",
          "",
          ""
        ]);
      }
      
      // Generate DettaglioCarrello entries based on quantity
      for (let i = 0; i < d.quantity; i++) {
        newDetailRows.push([
          currentCartId,
          itemId,
          d.isPaid ? "TRUE" : "FALSE",
          itemInfo.Prezzo_Vendita,
          "FALSE", // Pagamento_Posticipato
          0, // Acconto_Pagato
          "", // ID_Spedizione
          "FALSE" // Reso
        ]);
      }
    });

    if (newCartRows.length > 0) {
      await appendSheetRows(spreadsheetId, "Clienti_Carrelli!A:K", newCartRows, token);
    }
    
    if (newDetailRows.length > 0) {
      await appendSheetRows(spreadsheetId, "Dettaglio_Carrello!A:H", newDetailRows, token);
    }

    // RECALCULATE STATUS AND TOTAL PAID FOR EXISTING CARTS IN THE DATABASE
    const existingCartsDists = distributions.filter(d => d.cartId !== "new");
    if (existingCartsDists.length > 0) {
      const cartRows = await fetchSheetRows(spreadsheetId, "Clienti_Carrelli!A:K", token);
      for (const d of existingCartsDists) {
        const cart = carrelli.find(c => c.ID_Carrello === d.cartId);
        if (!cart) continue;

        const existingDetails = dettagli.filter((item) => item.ID_Carrello === d.cartId);
        const existingGrading = oggettiInGrading.filter((g) => g.ID_Carrello === d.cartId);

        let computedTotaleCarrello = 0;
        let computedTotalePagato = 0;

        existingDetails.forEach((item) => {
          computedTotaleCarrello += item.Prezzo_Registrato || 0;
          if (item.Pagato_Singolarmente) {
            computedTotalePagato += item.Prezzo_Registrato || 0;
          } else if (item.Acconto_Pagato) {
            computedTotalePagato += item.Acconto_Pagato || 0;
          }
        });

        existingGrading.forEach((g) => {
          computedTotaleCarrello += g.Costo_Cliente || 0;
          if (g.Pagato_Singolarmente) {
            computedTotalePagato += g.Costo_Cliente || 0;
          } else if (g.Acconto_Pagato) {
            computedTotalePagato += g.Acconto_Pagato || 0;
          }
        });

        // Add newly distributed items
        for (let i = 0; i < d.quantity; i++) {
          computedTotaleCarrello += itemInfo.Prezzo_Vendita;
          if (d.isPaid) {
            computedTotalePagato += itemInfo.Prezzo_Vendita;
          }
        }

        const computedRimanenza = Math.max(0, computedTotaleCarrello - computedTotalePagato);

        // Reset status since there are new unshipped items
        let newStatus = cart.Stato_Carrello;
        if (
          newStatus === "Spedizione_Ricevuta_da_Consegnare" ||
          newStatus === "Completato" ||
          newStatus === "Pronto_per_Spedizione"
        ) {
          newStatus = "Aperto";
        }

        // OPTIMISTIC UPDATE FOR CARRELLI STATE
        setCarrelli(prev => prev.map(c => {
          if (c.ID_Carrello === d.cartId) {
            return {
              ...c,
              Stato_Carrello: newStatus,
              Totale_Pagato: computedTotalePagato
            };
          }
          return c;
        }));

        const cartIdx = cartRows.findIndex((r) => r[0]?.toString() === d.cartId);
        if (cartIdx !== -1) {
          const rowNum = cartIdx + 1; // index 0 is headers in fetchSheetRows A:J
          const updatedRowValues = [
            cart.ID_Carrello,
            cart.Nome_Cliente,
            newStatus,
            computedTotalePagato,
            cart.Telefono || "",
            cart.Email || "",
            cart.Indirizzo_Spedizione || "",
            cart.Tag || "",
            cart.Strike?.toString() || "0",
            cart.Cattivo_Data ? `'${cart.Cattivo_Data}` : "",
            cart.Note || ""
          ];
          await updateSheetRow(spreadsheetId, `Clienti_Carrelli!A${rowNum}:K${rowNum}`, updatedRowValues, token);
        }
      }
    }

    await handleLoadDatabase();
  };

  // Complete delivery / Mark Completato


  return {
    handleAddItem,
    handleRestockItem,
    handleEditItem,
    handleBulkUpdateDates,
    handleDeleteItem,
    handleSettlePreorder,
    handleDistributeItemToCarts
  };
}
