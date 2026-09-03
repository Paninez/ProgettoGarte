import { useDatabase } from "../context/DatabaseContext";
import { processSaveQueue } from "../lib/saveQueue";
import { rowToDettaglio, rowToGradingItem, clearSheetRange, deleteSheetRow } from "../lib/googleApi";
import { appendSheetRow, deleteRowByID, updateSheetRow, updateSheetRows, fetchSheetRows, fetchSheetRowsBatch, appendSheetRows } from "../lib/googleApi";
import { logDbChange, FieldDiff } from "../lib/dbAuditLogger";
import { Carrello, DettaglioCarrello, OggettoMagazzino, CustomerLoyalty, GradingItem } from "../types";

export function useCarrelliSync() {
  const { 
    magazzino, setMagazzino,
    carrelli, setCarrelli,
    dettagli, setDettagli,
    spreadsheetId, token, driveFolders,
    currentOperatore, addSafetyLog, loyaltyProfiles, setLoyaltyProfiles, loyaltyConfig,
    user, userRole, setSafetyLogs, handleLoadDatabase, dbInitialized, oggettiInGrading, setOggettiInGrading
  } = useDatabase();

  const handleDeleteCart = async (cartId: string) => {
    if (!spreadsheetId || !token) return;
    if (userRole === "utente") {
      alert("Azione non consentita: solo Owner e Moderatore possono eliminare ordini.");
      return;
    }
    const targetCart = carrelli.find(c => c.ID_Carrello === cartId);
    
    // 1. Delete cart row in Clienti_Carrelli
    await deleteRowByID(spreadsheetId, "Clienti_Carrelli", cartId, token);
    
    logDbChange(token, driveFolders?.backupId, {
      table: "Clienti_Carrelli",
      operation: "ELIMINAZIONE",
      recordId: cartId,
      recordName: targetCart?.Nome_Cliente || "Carrello Cliente",
      operator: currentOperatore,
      userEmail: user?.email,
      rawNote: `Ordine ID ${cartId} per cliente "${targetCart?.Nome_Cliente || 'N/A'}" ed i suoi articoli di dettaglio eliminati permanentemente.`
    }, setSafetyLogs);

    // 2. Clear detail items belonging to this cart
    const allDetailRows = await fetchSheetRows(spreadsheetId, "Dettaglio_Carrello!A2:H2000", token);
    const otherDetails = allDetailRows
      .map(rowToDettaglio)
      .filter((d) => d.ID_Carrello !== cartId && d.ID_Carrello !== "");

    // Clear and rewrite details
    const valuesToWrite = otherDetails.map((d) => [
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

    // 3. Clear grading items belonging to this cart
    const allGradingRows = await fetchSheetRows(spreadsheetId, "Oggetti_In_Grading!A2:P2000", token);
    const otherGrading = allGradingRows
      .map(rowToGradingItem)
      .filter((g) => g.ID_Carrello !== cartId && g.ID_Oggetto_Grading !== "");

    const gradingValues = otherGrading.map((g) => [
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

    addSafetyLog(`Dettagli carrello dell'ordine ${cartId} rimossi dal foglio Dettaglio_Carrello e Oggetti_In_Grading.`);

    await handleLoadDatabase();
  };

  const handleBatchSaveCarts = async (
    updates: {
      cart: Carrello;
      items: Omit<DettaglioCarrello, "ID_Carrello">[];
      gradingItems?: GradingItem[];
    }[]
  ) => {
    if (!spreadsheetId || !token) return;
    if (userRole === "utente") {
      alert("Azione non consentita: solo Owner e Moderatore possono modificare i carrelli.");
      return;
    }
    if (!dbInitialized) {
      alert("Errore: Il database locale non è ancora completamente caricato. Attendi il completamento prima di salvare.");
      return;
    }

    const newCartsToAppend: any[][] = [];
    
    // Fetch directly from sheets to prevent any empty local state overwriting other cards' details/grading
    const sheetDetailRows = await fetchSheetRows(spreadsheetId, "Dettaglio_Carrello!A2:H2000", token);
    let currentDetails = sheetDetailRows.map(rowToDettaglio).filter((d) => d.ID_Carrello !== "");

    const sheetGradingRows = await fetchSheetRows(spreadsheetId, "Oggetti_In_Grading!A2:P2000", token);
    let currentGrading = sheetGradingRows.map(rowToGradingItem).filter((g) => g.ID_Oggetto_Grading !== "");

    for (const { cart, items, gradingItems } of updates) {
      const cartIdx = carrelli.findIndex((c) => c.ID_Carrello === cart.ID_Carrello);
      const cartRowValues = [
        cart.ID_Carrello,
        cart.Nome_Cliente,
        cart.Stato_Carrello,
        cart.Totale_Pagato,
        cart.Telefono || "",
        cart.Email || "",
        cart.Indirizzo_Spedizione || "",
        cart.Tag || "",
        cart.Strike?.toString() || "0",
        cart.Cattivo_Data || "",
        cart.Note || "",
        cart.Data_Ultimo_Messaggio ? `'${cart.Data_Ultimo_Messaggio}` : ""
      ];

      if (cartIdx === -1) {
        newCartsToAppend.push(cartRowValues);
      } else {
        const rowNum = cartIdx + 2;
        await updateSheetRow(spreadsheetId, `Clienti_Carrelli!A${rowNum}:L${rowNum}`, cartRowValues, token);
      }

      // Update currentDetails
      currentDetails = currentDetails.filter((d) => d.ID_Carrello !== cart.ID_Carrello && d.ID_Carrello !== "");
      const newDetailsMapped: import('../types').DettaglioCarrello[] = items.map((i) => ({
        ID_Carrello: cart.ID_Carrello,
        ID_Oggetto: i.ID_Oggetto,
        Pagato_Singolarmente: i.Pagato_Singolarmente,
        Prezzo_Registrato: i.Prezzo_Registrato,
        Pagamento_Posticipato: i.Pagamento_Posticipato,
        Acconto_Pagato: i.Acconto_Pagato,
        ID_Spedizione: i.ID_Spedizione || "",
        Reso: i.Reso
      }));
      currentDetails = [...currentDetails, ...newDetailsMapped];

      // Update currentGrading
      if (gradingItems) {
        currentGrading = currentGrading.filter((g) => g.ID_Carrello !== cart.ID_Carrello && g.ID_Oggetto_Grading !== "");
        const newGradingMapped = gradingItems.map((g) => ({
          ...g,
          ID_Carrello: cart.ID_Carrello,
          Margine_Lordo: g.Costo_Cliente - g.Costo_Acquisto
        }));
        currentGrading = [...currentGrading, ...newGradingMapped];
      }
    }

    if (newCartsToAppend.length > 0) {
      await appendSheetRows(spreadsheetId, "Clienti_Carrelli!A:L", newCartsToAppend, token);
    }

    // Rewrite Dettaglio_Carrello
    const valuesToWrite = currentDetails.map((d) => [
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

    // Rewrite Oggetti_In_Grading
    const gValues = currentGrading.map(g => [
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

    while (gValues.length < 2000) {
      gValues.push(["", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""]);
    }
    await updateSheetRows(spreadsheetId, `Oggetti_In_Grading!A2:P2001`, gValues, token);

    await handleLoadDatabase();
  };


  // HardDrive Cart & Detailed items (Bivio A)
  const handleSaveCart = async (
    cart: Carrello,
    items: Omit<DettaglioCarrello, "ID_Carrello">[],
    gradingItems?: GradingItem[],
    silent: boolean = false
  ) => {
    if (userRole === "utente") {
      alert("Azione non consentita: solo Owner e Moderatore possono modificare i carrelli.");
      return Promise.reject(new Error("Unauthorized"));
    }
    if (!dbInitialized) {
      console.warn("[_handleSaveCartInternal] Salvataggio bloccato: Il database locale non è ancora completamente caricato o inizializzato.");
      if (!silent) {
        alert("Errore: Il database non è ancora completamente caricato. Attendi il completamento prima di salvare.");
      }
      return;
    }

    // RECALCULATE CART STATUS AND TOTAL PAID SAFELY BEFORE SAVING
    // Normalize item states first (Auto-toggle Pagato_Singolarmente if deposit covers the cost)
    const normalizedItems = items.map((item) => {
      const isPaid = item.Pagato_Singolarmente || (item.Prezzo_Registrato > 0 && (item.Acconto_Pagato || 0) >= item.Prezzo_Registrato);
      return {
        ...item,
        Pagato_Singolarmente: isPaid,
        Acconto_Pagato: isPaid ? item.Prezzo_Registrato : (item.Acconto_Pagato || 0),
      };
    });

    const resolvedGradingItems = gradingItems !== undefined ? gradingItems : oggettiInGrading.filter(g => g.ID_Carrello === cart.ID_Carrello);
    const normalizedGradingItems = resolvedGradingItems.map((g) => {
      const isPaid = g.Pagato_Singolarmente || (g.Costo_Cliente > 0 && (g.Acconto_Pagato || 0) >= g.Costo_Cliente);
      return {
        ...g,
        Pagato_Singolarmente: isPaid,
        Acconto_Pagato: isPaid ? g.Costo_Cliente : (g.Acconto_Pagato || 0),
      };
    });

    let calculatedTotaleCarrello = 0;
    let calculatedTotalePagato = 0;

    normalizedItems.forEach((item) => {
      calculatedTotaleCarrello += item.Prezzo_Registrato || 0;
      if (item.Pagato_Singolarmente) {
        calculatedTotalePagato += item.Prezzo_Registrato || 0;
      } else if (item.Acconto_Pagato) {
        calculatedTotalePagato += item.Acconto_Pagato || 0;
      }
    });

    normalizedGradingItems.forEach((g) => {
      calculatedTotaleCarrello += g.Costo_Cliente || 0;
      if (g.Pagato_Singolarmente) {
        calculatedTotalePagato += g.Costo_Cliente || 0;
      } else if (g.Acconto_Pagato) {
        calculatedTotalePagato += g.Acconto_Pagato || 0;
      }
    });

    const calculatedRimanenza = Math.max(0, calculatedTotaleCarrello - calculatedTotalePagato);

    let finalStato = cart.Stato_Carrello;

    const finalCart: Carrello = {
      ...cart,
      Totale_Pagato: calculatedTotalePagato,
      Stato_Carrello: finalStato,
    };

    // OPTIMISTIC UPDATES (React state) - MUST execute unconditionally with finalCart
    const cartIdxOpt = carrelli.findIndex((c) => c.ID_Carrello === finalCart.ID_Carrello);
    if (cartIdxOpt === -1) {
      setCarrelli(prev => [...prev, finalCart]);
    } else {
      setCarrelli(prev => {
        const next = [...prev];
        next[cartIdxOpt] = finalCart;
        return next;
      });
    }

    // 2. Synchronize Detailed items
    const otherDetails = dettagli.filter((d) => d.ID_Carrello !== finalCart.ID_Carrello && d.ID_Carrello !== "");
    const newDetailsMapped: import('../types').DettaglioCarrello[] = normalizedItems.map((i) => ({
      ID_Carrello: finalCart.ID_Carrello,
      ID_Oggetto: i.ID_Oggetto,
      Pagato_Singolarmente: i.Pagato_Singolarmente,
      Prezzo_Registrato: i.Prezzo_Registrato,
      Pagamento_Posticipato: i.Pagamento_Posticipato,
      Acconto_Pagato: i.Acconto_Pagato,
      ID_Spedizione: i.ID_Spedizione || "",
      Reso: i.Reso
    }));
    const combinedDetails = [...otherDetails, ...newDetailsMapped];
    setDettagli(combinedDetails); // OPTIMISTIC UPDATE

    // 3. Synchronize Grading items
    const existingGradingList = oggettiInGrading.filter((g) => g.ID_Oggetto_Grading !== "");
    const otherGrading = existingGradingList.filter((g) => g.ID_Carrello !== finalCart.ID_Carrello && g.ID_Oggetto_Grading !== "");
    const newGradingMapped = normalizedGradingItems.map((g) => ({
      ...g,
      ID_Carrello: finalCart.ID_Carrello,
      Margine_Lordo: g.Costo_Cliente - g.Costo_Acquisto
    }));
    const combinedGrading = [...otherGrading, ...newGradingMapped];
    setOggettiInGrading(combinedGrading); // OPTIMISTIC UPDATE
    return new Promise<void>((resolve, reject) => {
      window.cartSaveQueue = window.cartSaveQueue || [];
      window.cartSaveQueue.push(async () => {
        try {
          await _performNetworkSave(cart, finalCart, normalizedItems, normalizedGradingItems, newDetailsMapped, newGradingMapped, silent);
        } catch (e: any) {
          if (e?.name === "AuthExpiredError" || e?.message?.includes("Autenticazione scaduta")) {
            console.warn("Save error (Auth Expired):", e.message);
          } else {
            console.error("Save error:", e);
          }
        }
      });
      processSaveQueue();
      // Unlock UI immediately
      resolve();
    });
  };

  const handleUpdateCartPayment = async (
    cartId: string,
    addedAmount: number,
    transactionNote?: string,
    itemPaymentInfo?: {
      itemId?: string;
      itemType?: 'dettaglio' | 'grading';
      itemIndex?: number;
      itemIndices?: number[];
      markItemAsPaid?: boolean;
      itemName?: string;
      amount?: number;
    } | Array<{
      itemId: string;
      itemType: 'dettaglio' | 'grading';
      itemIndex?: number;
      itemIndices?: number[];
      markItemAsPaid?: boolean;
      itemName?: string;
      amount?: number;
    }>
  ) => {
    const targetCart = carrelli.find((c) => c.ID_Carrello === cartId);
    if (!targetCart) throw new Error("Carrello non trovato.");

    let currentItems = dettagli.filter((d) => d.ID_Carrello === cartId);
    let currentGrading = oggettiInGrading.filter((g) => g.ID_Carrello === cartId);

    if (itemPaymentInfo) {
      const allocations = Array.isArray(itemPaymentInfo) ? itemPaymentInfo : [itemPaymentInfo];

      const dettaglioAllocations = allocations.filter(a => a.itemType === 'dettaglio' && a.itemId);
      if (dettaglioAllocations.length > 0) {
        dettaglioAllocations.forEach(alloc => {
          const matchingItems = currentItems.filter((it, idx) =>
            alloc.itemIndices ? alloc.itemIndices.includes(idx) : (alloc.itemIndex !== undefined ? alloc.itemIndex === idx : it.ID_Oggetto === alloc.itemId)
          );
          if (matchingItems.length === 0) return;

          const groupTotalPrice = matchingItems.reduce((s, it) => s + (it.Prezzo_Registrato || 0), 0);
          const groupTotalAcconto = matchingItems.reduce((s, it) => s + (it.Acconto_Pagato || 0), 0);
          const groupRemainingPrice = matchingItems.reduce((s, it) => s + Math.max(0, (it.Prezzo_Registrato || 0) - (it.Acconto_Pagato || 0)), 0);

          const allocAmount = alloc.amount !== undefined ? alloc.amount : (allocations.length === 1 ? addedAmount : 0);
          const newTotalGroupAcconto = groupTotalAcconto + allocAmount;

          let isFullyPaid = false;
          if (alloc.markItemAsPaid !== undefined) {
            isFullyPaid = alloc.markItemAsPaid;
          } else if (groupTotalPrice > 0) {
            isFullyPaid = newTotalGroupAcconto >= groupTotalPrice;
          } else {
            isFullyPaid = true;
          }

          currentItems = currentItems.map((item) => {
            const isMatch = matchingItems.includes(item);
            if (!isMatch) return item;

            const remainingItemPrice = Math.max(0, (item.Prezzo_Registrato || 0) - (item.Acconto_Pagato || 0));
            let itemAddedAmount = 0;
            if (groupRemainingPrice > 0) {
              itemAddedAmount = allocAmount * (remainingItemPrice / groupRemainingPrice);
            } else if (groupTotalPrice > 0) {
              itemAddedAmount = allocAmount * ((item.Prezzo_Registrato || 0) / groupTotalPrice);
            } else {
              itemAddedAmount = allocAmount / matchingItems.length;
            }

            const newAcconto = (item.Acconto_Pagato || 0) + itemAddedAmount;

            return {
              ...item,
              Pagato_Singolarmente: isFullyPaid,
              Acconto_Pagato: newAcconto
            };
          });
        });
      }

      const gradingAllocations = allocations.filter(a => a.itemType === 'grading' && a.itemId);
      if (gradingAllocations.length > 0) {
        gradingAllocations.forEach(alloc => {
          const matchingItems = currentGrading.filter((g, idx) =>
            alloc.itemIndices ? alloc.itemIndices.includes(idx) : (alloc.itemIndex !== undefined ? alloc.itemIndex === idx : g.ID_Oggetto_Grading === alloc.itemId)
          );
          if (matchingItems.length === 0) return;

          const groupTotalPrice = matchingItems.reduce((s, g) => s + (g.Costo_Cliente || 0), 0);
          const groupTotalAcconto = matchingItems.reduce((s, g) => s + (g.Acconto_Pagato || 0), 0);
          const groupRemainingPrice = matchingItems.reduce((s, g) => s + Math.max(0, (g.Costo_Cliente || 0) - (g.Acconto_Pagato || 0)), 0);

          const allocAmount = alloc.amount !== undefined ? alloc.amount : (allocations.length === 1 ? addedAmount : 0);
          const newTotalGroupAcconto = groupTotalAcconto + allocAmount;

          let isFullyPaid = false;
          if (alloc.markItemAsPaid !== undefined) {
            isFullyPaid = alloc.markItemAsPaid;
          } else if (groupTotalPrice > 0) {
            isFullyPaid = newTotalGroupAcconto >= groupTotalPrice;
          } else {
            isFullyPaid = true;
          }

          currentGrading = currentGrading.map((g) => {
            const isMatch = matchingItems.includes(g);
            if (!isMatch) return g;

            const remainingItemPrice = Math.max(0, (g.Costo_Cliente || 0) - (g.Acconto_Pagato || 0));
            let itemAddedAmount = 0;
            if (groupRemainingPrice > 0) {
              itemAddedAmount = allocAmount * (remainingItemPrice / groupRemainingPrice);
            } else if (groupTotalPrice > 0) {
              itemAddedAmount = allocAmount * ((g.Costo_Cliente || 0) / groupTotalPrice);
            } else {
              itemAddedAmount = allocAmount / matchingItems.length;
            }

            const newAcconto = (g.Acconto_Pagato || 0) + itemAddedAmount;

            return {
              ...g,
              Pagato_Singolarmente: isFullyPaid,
              Acconto_Pagato: newAcconto
            };
          });
        });
      }
    }

    const newTotalPaid = (targetCart.Totale_Pagato || 0) + addedAmount;

    let totalCartCost = currentItems.reduce((sum, item) => sum + (item.Prezzo_Registrato || 0), 0);
    totalCartCost += currentGrading.reduce((sum, g) => sum + (g.Costo_Cliente || 0), 0);

    let newStatus = targetCart.Stato_Carrello;
    if ((newStatus as string) === "In Attesa") {
      newStatus = "Aperto";
    }

    const updatedCart: Carrello = {
      ...targetCart,
      Totale_Pagato: newTotalPaid,
      Stato_Carrello: newStatus
    };

    await handleSaveCart(updatedCart, currentItems, currentGrading, true);

    if (spreadsheetId && token && addedAmount > 0) {
      (async () => {
        try {
          const todayStr = new Date().toLocaleDateString("it-IT");
      const itemNames = Array.isArray(itemPaymentInfo)
        ? itemPaymentInfo.map(i => i.itemName || i.itemId).filter(Boolean).join(", ")
        : itemPaymentInfo?.itemName;
      const itemSuffix = itemNames ? ` - Articoli: ${itemNames}` : "";

      const financeRow = [
        todayStr,
        "Entrata",
        addedAmount,
        "Incasso PayPal",
        transactionNote || `Incasso PayPal per ${targetCart.Nome_Cliente} (${cartId})${itemSuffix}`
      ];
      await appendSheetRow(spreadsheetId, "Finanze!A:E", financeRow, token).catch((e) => console.warn("Finanze log error:", e));
        } catch (err) {
          if (err?.name === "AuthExpiredError" || err?.message?.includes("Autenticazione scaduta")) {
            console.warn("Background finance log error:", err.message);
          } else {
            console.error("Background finance log error:", err);
          }
        }
      })();
    }
  };

  const _performNetworkSave = async (
    cart: Carrello,
    finalCart: Carrello,
    normalizedItems: any[],
    normalizedGradingItems: any[],
    newDetailsMapped: import('../types').DettaglioCarrello[],
    newGradingMapped: any[],
    silent: boolean = false
  ) => {
    if (!spreadsheetId || !token) return;

    // 1. HardDrive main Cart row using finalCart
    const cartRows = await fetchSheetRows(spreadsheetId, "Clienti_Carrelli!A:L", token);
    const cartIdx = cartRows.findIndex((r) => r[0]?.toString() === finalCart.ID_Carrello);

    const cartRowValues = [
      finalCart.ID_Carrello,
      finalCart.Nome_Cliente,
      finalCart.Stato_Carrello,
      finalCart.Totale_Pagato,
      finalCart.Telefono || "",
      finalCart.Email || "",
      finalCart.Indirizzo_Spedizione || "",
      finalCart.Tag || "",
      finalCart.Strike?.toString() || "0",
      finalCart.Cattivo_Data ? `'${finalCart.Cattivo_Data}` : "",
      finalCart.Note || "",
      finalCart.Data_Ultimo_Messaggio ? `'${finalCart.Data_Ultimo_Messaggio}` : ""
    ];

    if (cartIdx === -1) {
      // Append new
      await appendSheetRow(spreadsheetId, "Clienti_Carrelli!A:L", cartRowValues, token);
      logDbChange(token, driveFolders?.backupId, {
        table: "Clienti_Carrelli",
        operation: "INSERIMENTO",
        recordId: finalCart.ID_Carrello,
        recordName: finalCart.Nome_Cliente,
        operator: currentOperatore,
        userEmail: user?.email,
        details: {
          Cliente: finalCart.Nome_Cliente,
          Stato: finalCart.Stato_Carrello,
          Totale_Pagato: `€${Number(finalCart.Totale_Pagato || 0).toFixed(2)}`,
          Numero_Articoli: normalizedItems.length
        }
      }, setSafetyLogs);
    } else {
      // Update existing
      const rowNum = cartIdx + 1;
      await updateSheetRow(spreadsheetId, `Clienti_Carrelli!A${rowNum}:L${rowNum}`, cartRowValues, token);

      const oldCart = carrelli.find(c => c.ID_Carrello === finalCart.ID_Carrello);
      if (oldCart) {
        const diffs: FieldDiff[] = [
          { field: "Nome_Cliente", oldValue: oldCart.Nome_Cliente, newValue: finalCart.Nome_Cliente },
          { field: "Stato_Carrello", oldValue: oldCart.Stato_Carrello, newValue: finalCart.Stato_Carrello },
          { field: "Totale_Pagato", oldValue: `€${Number(oldCart.Totale_Pagato || 0).toFixed(2)}`, newValue: `€${Number(finalCart.Totale_Pagato || 0).toFixed(2)}` },
          { field: "Telefono", oldValue: oldCart.Telefono || "", newValue: finalCart.Telefono || "" },
          { field: "Email", oldValue: oldCart.Email || "", newValue: finalCart.Email || "" },
          { field: "Indirizzo_Spedizione", oldValue: oldCart.Indirizzo_Spedizione || "", newValue: finalCart.Indirizzo_Spedizione || "" },
          { field: "Tag", oldValue: oldCart.Tag || "", newValue: finalCart.Tag || "" },
          { field: "Note", oldValue: oldCart.Note || "", newValue: finalCart.Note || "" }
        ];

        logDbChange(token, driveFolders?.backupId, {
          table: "Clienti_Carrelli",
          operation: "MODIFICA",
          recordId: finalCart.ID_Carrello,
          recordName: finalCart.Nome_Cliente,
          operator: currentOperatore,
          userEmail: user?.email,
          diffs
        }, setSafetyLogs);
      }
    }

    // --- SECURE SHEET MERGING: Fetch true current rows directly from Google Sheets ---
    const sheetDetailRows = await fetchSheetRows(spreadsheetId, "Dettaglio_Carrello!A2:H2000", token);
        const sheetOtherDetails = sheetDetailRows
      .map(rowToDettaglio)
      .filter((d) => d.ID_Carrello !== finalCart.ID_Carrello && d.ID_Carrello !== "");
    const sheetAlreadyShippedForThisCart = sheetDetailRows
      .map(rowToDettaglio)
      .filter((d) => d.ID_Carrello === finalCart.ID_Carrello && d.ID_Spedizione);
    
    // Do not include shipped items from newDetailsMapped to prevent duplication
    const newUnshippedDetailsMapped = newDetailsMapped.filter((d) => !d.ID_Spedizione);
    
    const sheetCombinedDetails = [...sheetOtherDetails, ...sheetAlreadyShippedForThisCart, ...newUnshippedDetailsMapped];

    // Build values to write
    const valuesToWrite = sheetCombinedDetails.map((d) => [
      d.ID_Carrello,
      d.ID_Oggetto,
      d.Pagato_Singolarmente ? "TRUE" : "FALSE",
      d.Prezzo_Registrato,
      d.Pagamento_Posticipato ? "TRUE" : "FALSE",
      d.Acconto_Pagato || 0,
      d.ID_Spedizione || "",
      d.Reso ? "TRUE" : "FALSE"
    ]);

    // Pad array with empty strings up to row 2000 to clear any deleted rows safely in a single operation
    while (valuesToWrite.length < 2000) {
      valuesToWrite.push(["", "", "", "", "", "", "", ""]);
    }
    
    await updateSheetRows(spreadsheetId, `Dettaglio_Carrello!A2:H2001`, valuesToWrite, token);

    // --- SECURE SHEET MERGING: Fetch true current grading rows directly from Google Sheets ---
    const sheetGradingRows = await fetchSheetRows(spreadsheetId, "Oggetti_In_Grading!A2:P2000", token);
    const sheetExistingGradingList = sheetGradingRows.map(rowToGradingItem).filter((g) => g.ID_Oggetto_Grading !== "");
    const sheetOtherGrading = sheetExistingGradingList.filter((g) => g.ID_Carrello !== finalCart.ID_Carrello && g.ID_Oggetto_Grading !== "");

    const sheetCombinedGrading = [...sheetOtherGrading, ...newGradingMapped];

    // Detect grading items transitioning to Unpaid state
    const prevGradingForThisCart = sheetExistingGradingList.filter((g) => g.ID_Carrello === cart.ID_Carrello);
    const transitionedUnpaidGrading: GradingItem[] = [];
    prevGradingForThisCart.forEach((prevItem) => {
      if (prevItem.Pagato_Singolarmente) {
        const newItem = newGradingMapped.find((n) => n.ID_Oggetto_Grading === prevItem.ID_Oggetto_Grading);
        if (!newItem || !newItem.Pagato_Singolarmente) {
          transitionedUnpaidGrading.push(prevItem);
        }
      }
    });

    // Detect standard cart items transitioning to Unpaid state
    const prevDetailsForThisCart = sheetDetailRows.map(rowToDettaglio).filter((d) => d.ID_Carrello === cart.ID_Carrello);
    const transitionedUnpaidDetails: any[] = [];

    prevDetailsForThisCart.forEach((prevItem) => {
      if (prevItem.Pagato_Singolarmente) {
        const newItem = newDetailsMapped.find((n) => n.ID_Oggetto === prevItem.ID_Oggetto);
        if (!newItem || !newItem.Pagato_Singolarmente) {
          transitionedUnpaidDetails.push(prevItem);
        }
      }
    });

    const gradingValues = sheetCombinedGrading.map((g) => [
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

    // Record each transitioned paid/unpaid grading item transaction in Finanze
    const existingFinanceRows = await fetchSheetRows(spreadsheetId, "Finanze!A:E", token);
    const todayStr = new Date().toISOString().split("T")[0];

    // 1. Delete transactions for transitioned unpaid grading items
    if (transitionedUnpaidGrading.length > 0) {
      const indicesToDelete: number[] = [];
      existingFinanceRows.forEach((row, rIdx) => {
        const matches = transitionedUnpaidGrading.some((item) => 
          row[4]?.toString().includes(`(ID Carta: ${item.ID_Oggetto_Grading})`) &&
          (row[4]?.toString().includes("Saldo pagato gradazione") || row[4]?.toString().includes("Pagamento gradazione"))
        );
        if (matches && !indicesToDelete.includes(rIdx)) {
          indicesToDelete.push(rIdx);
        }
      });
      indicesToDelete.sort((a, b) => b - a);
      for (const idx of indicesToDelete) {
        await deleteSheetRow(spreadsheetId, "Finanze", idx, token);
      }
    }

    // 2. Add transactions for new/increased Accontos on grading items
    for (const item of newGradingMapped) {
      if (!item.Pagato_Singolarmente) {
        const newAcconto = item.Acconto_Pagato || 0;
        if (newAcconto > 0) {
          const alreadyLoggedAcconto = existingFinanceRows
            .filter((row) => 
              row[1]?.toString() === "Entrata" &&
              row[3]?.toString() === "Acconto Pagamento" &&
              row[4]?.toString().includes(`(ID Carta: ${item.ID_Oggetto_Grading})`)
            )
            .reduce((sum, row) => sum + (parseFloat(row[2]) || 0), 0);

          const accontoDiff = newAcconto - alreadyLoggedAcconto;
          if (accontoDiff > 0) {
            const financeRow = [
              todayStr,
              "Entrata",
              accontoDiff,
              "Acconto Pagamento",
              `Acconto gradazione: ${item.Nome_Carta} (ID Carta: ${item.ID_Oggetto_Grading}) per cliente ${cart.Nome_Cliente}`
            ];
            await appendSheetRow(spreadsheetId, "Finanze!A:E", financeRow, token);
            existingFinanceRows.push(financeRow);
          }
        }
      }
    }

    // 3. Add transactions for transitioned paid grading items (ONLY REMAINING BALANCE)
    for (const item of newGradingMapped) {
      if (item.Pagato_Singolarmente) {
        const prevItem = prevGradingForThisCart.find((prev) => prev.ID_Oggetto_Grading === item.ID_Oggetto_Grading);
        if (!prevItem || !prevItem.Pagato_Singolarmente) {
          const alreadyLoggedSaldo = existingFinanceRows.some((row) => 
            row[4]?.toString().includes(`(ID Carta: ${item.ID_Oggetto_Grading})`) &&
            (row[4]?.toString().includes("Saldo pagato gradazione") || row[4]?.toString().includes("Pagamento gradazione"))
          );

          if (!alreadyLoggedSaldo) {
            const alreadyLoggedAcconto = existingFinanceRows
              .filter((row) => 
                row[1]?.toString() === "Entrata" &&
                row[3]?.toString() === "Acconto Pagamento" &&
                row[4]?.toString().includes(`(ID Carta: ${item.ID_Oggetto_Grading})`)
              )
              .reduce((sum, row) => sum + (parseFloat(row[2]) || 0), 0);

            const remainingBalance = Math.max(0, item.Costo_Cliente - alreadyLoggedAcconto);
            if (remainingBalance > 0) {
              const financeRow = [
                todayStr,
                "Entrata",
                remainingBalance,
                "Servizio Grading",
                `Saldo pagato gradazione: ${item.Nome_Carta} (ID Carta: ${item.ID_Oggetto_Grading}) per cliente ${cart.Nome_Cliente}`
              ];
              await appendSheetRow(spreadsheetId, "Finanze!A:E", financeRow, token);
              existingFinanceRows.push(financeRow);
            }
          }
        }
      }
    }

    // Group standard cart items by ID_Oggetto for precise group-level finance accounting
    const uniqueObjectIds = Array.from(new Set([
      ...newDetailsMapped.map((d) => d.ID_Oggetto),
      ...prevDetailsForThisCart.map((d) => d.ID_Oggetto)
    ]));

    for (const idOggetto of uniqueObjectIds) {
      if (!idOggetto) continue;

      const groupItems = newDetailsMapped.filter((d) => d.ID_Oggetto === idOggetto);
      const groupPrevItems = prevDetailsForThisCart.filter((d) => d.ID_Oggetto === idOggetto);
      const magObj = magazzino.find((m) => m.ID_Oggetto === idOggetto);
      const itemName = magObj ? magObj.Nome : idOggetto;
      const groupQty = groupItems.length;

      // 4. Delete transactions if paid count decreased
      const prevPaidCount = groupPrevItems.filter((p) => p.Pagato_Singolarmente).length;
      const currPaidCount = groupItems.filter((c) => c.Pagato_Singolarmente).length;

      if (prevPaidCount > 0 && currPaidCount < prevPaidCount) {
        const indicesToDelete: number[] = [];
        existingFinanceRows.forEach((row, rIdx) => {
          if (
            row[4]?.toString().includes(`(ID Oggetto: ${idOggetto})`) &&
            row[4]?.toString().includes(`per cliente ${cart.Nome_Cliente}`) &&
            (row[4]?.toString().includes("Saldo pagato articolo") || row[4]?.toString().includes("Pagamento articolo"))
          ) {
            indicesToDelete.push(rIdx);
          }
        });
        indicesToDelete.sort((a, b) => b - a);
        for (const idx of indicesToDelete) {
          await deleteSheetRow(spreadsheetId, "Finanze", idx, token);
          existingFinanceRows.splice(idx, 1);
        }
      }

      // 5. Add transactions for new/increased Accontos on this item group
      const currentGroupAcconto = groupItems.reduce(
        (sum, item) => sum + (!item.Pagato_Singolarmente ? (item.Acconto_Pagato || 0) : 0),
        0
      );

      if (currentGroupAcconto > 0) {
        const alreadyLoggedAcconto = existingFinanceRows
          .filter((row) => 
            row[1]?.toString() === "Entrata" &&
            row[3]?.toString() === "Acconto Pagamento" &&
            row[4]?.toString().includes(`(ID Oggetto: ${idOggetto})`) &&
            row[4]?.toString().includes(`per cliente ${cart.Nome_Cliente}`)
          )
          .reduce((sum, row) => sum + (parseFloat(row[2]) || 0), 0);

        const accontoDiff = currentGroupAcconto - alreadyLoggedAcconto;
        if (accontoDiff > 0) {
          const financeRow = [
            todayStr,
            "Entrata",
            accontoDiff,
            "Acconto Pagamento",
            `Acconto articolo: ${itemName}${groupQty > 1 ? ` (x${groupQty})` : ""} (ID Oggetto: ${idOggetto}) per cliente ${cart.Nome_Cliente}`
          ];
          await appendSheetRow(spreadsheetId, "Finanze!A:E", financeRow, token);
          existingFinanceRows.push(financeRow);
        }
      }

      // 6. Add transactions for paid standard cart items in this group
      if (currPaidCount > 0) {
        const totalPriceOfPaidItems = groupItems
          .filter((item) => item.Pagato_Singolarmente)
          .reduce((sum, item) => sum + item.Prezzo_Registrato, 0);

        const alreadyLoggedSaldo = existingFinanceRows
          .filter((row) => 
            row[1]?.toString() === "Entrata" &&
            row[3]?.toString() === "Vendita Carrello" &&
            row[4]?.toString().includes(`(ID Oggetto: ${idOggetto})`) &&
            row[4]?.toString().includes(`per cliente ${cart.Nome_Cliente}`) &&
            (row[4]?.toString().includes("Saldo pagato articolo") || row[4]?.toString().includes("Pagamento articolo"))
          )
          .reduce((sum, row) => sum + (parseFloat(row[2]) || 0), 0);

        const alreadyLoggedAcconto = existingFinanceRows
          .filter((row) => 
            row[1]?.toString() === "Entrata" &&
            row[3]?.toString() === "Acconto Pagamento" &&
            row[4]?.toString().includes(`(ID Oggetto: ${idOggetto})`) &&
            row[4]?.toString().includes(`per cliente ${cart.Nome_Cliente}`)
          )
          .reduce((sum, row) => sum + (parseFloat(row[2]) || 0), 0);

        const remainingBalance = Math.max(0, totalPriceOfPaidItems - alreadyLoggedAcconto - alreadyLoggedSaldo);
        if (remainingBalance > 0) {
          const financeRow = [
            todayStr,
            "Entrata",
            remainingBalance,
            "Vendita Carrello",
            `Saldo pagato articolo: ${itemName}${currPaidCount > 1 ? ` (x${currPaidCount})` : ""} (ID Oggetto: ${idOggetto}) per cliente ${cart.Nome_Cliente}`
          ];
          await appendSheetRow(spreadsheetId, "Finanze!A:E", financeRow, token);
          existingFinanceRows.push(financeRow);
        }
      }
    }

    await handleLoadDatabase(undefined, silent);
  };

  // HardDrive/Update Grading Group in database


  // Lightweight cart header updater that does NOT touch Dettaglio_Carrello or Oggetti_In_Grading
  const handleUpdateCartHeader = async (
    updatedCart: Carrello,
    silent: boolean = true
  ) => {
    if (!spreadsheetId || !token) return;
    if (userRole === "utente") return;

    // Optimistic state update
    setCarrelli(prev => {
      const idx = prev.findIndex(c => c.ID_Carrello === updatedCart.ID_Carrello);
      if (idx === -1) return [...prev, updatedCart];
      const next = [...prev];
      next[idx] = updatedCart;
      return next;
    });

    try {
      const cartRows = await fetchSheetRows(spreadsheetId, "Clienti_Carrelli!A:L", token);
      const cartIdx = cartRows.findIndex((r) => r[0]?.toString() === updatedCart.ID_Carrello);

      const cartRowValues = [
        updatedCart.ID_Carrello,
        updatedCart.Nome_Cliente,
        updatedCart.Stato_Carrello,
        updatedCart.Totale_Pagato,
        updatedCart.Telefono || "",
        updatedCart.Email || "",
        updatedCart.Indirizzo_Spedizione || "",
        updatedCart.Tag || "",
        updatedCart.Strike?.toString() || "0",
        updatedCart.Cattivo_Data ? `'${updatedCart.Cattivo_Data}` : "",
        updatedCart.Note || "",
        updatedCart.Data_Ultimo_Messaggio ? `'${updatedCart.Data_Ultimo_Messaggio}` : ""
      ];

      if (cartIdx === -1) {
        await appendSheetRow(spreadsheetId, "Clienti_Carrelli!A:L", cartRowValues, token);
      } else {
        const rowNum = cartIdx + 1;
        await updateSheetRow(spreadsheetId, `Clienti_Carrelli!A${rowNum}:L${rowNum}`, cartRowValues, token);
      }
    } catch (e) {
      console.error("Error updating cart header:", e);
    }
  };

  return {
    handleDeleteCart,
    handleBatchSaveCarts,
    handleSaveCart,
    handleUpdateCartHeader,
    handleUpdateCartPayment
  };
}
