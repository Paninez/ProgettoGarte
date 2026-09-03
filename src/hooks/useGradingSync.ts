import { useDatabase } from "../context/DatabaseContext";
import { rowToDettaglio, rowToGradingItem, clearSheetRange, deleteSheetRow } from "../lib/googleApi";
import { appendSheetRow, deleteRowByID, updateSheetRow, updateSheetRows, fetchSheetRows } from "../lib/googleApi";
import { logDbChange, FieldDiff } from "../lib/dbAuditLogger";
import { GradingGroup, GradingItem, ListinoGradingItem } from "../types";
import { useDriveUpload } from "./useDriveUpload";

export function useGradingSync() {
  const { 
    gruppiGrading, setGruppiGrading,
    oggettiInGrading, setOggettiInGrading,
    listinoGrading, setListinoGrading,
    spreadsheetId, token, driveFolders,
    currentOperatore, addSafetyLog,
    userRole, setSafetyLogs, handleLoadDatabase
  } = useDatabase();
  
  const { handleUploadPhoto } = useDriveUpload();

  const handleSaveGradingGroup = async (group: GradingGroup) => {
    if (!spreadsheetId || !token) return;
    if (userRole === "utente") {
      alert("Azione non consentita: solo Owner e Moderatore possono modificare i gruppi grading.");
      return;
    }

    // Check if transitioning to "Spedito"
    const prevGroup = gruppiGrading.find((g) => g.ID_Gruppo_Grading === group.ID_Gruppo_Grading);
    const isTransitioningToSpedito = group.Stato_Gruppo === "Spedito" && (!prevGroup || prevGroup.Stato_Gruppo !== "Spedito");
    const isTransitioningFromSpedito = prevGroup && prevGroup.Stato_Gruppo === "Spedito" && group.Stato_Gruppo !== "Spedito";

    const rows = await fetchSheetRows(spreadsheetId, "Gruppi_Grading!A:E", token);
    const idx = rows.findIndex((r) => r[0]?.toString() === group.ID_Gruppo_Grading);
    const values = [
      group.ID_Gruppo_Grading,
      group.Nome_Gruppo,
      group.Compagnia,
      group.Data_Creazione,
      group.Stato_Gruppo
    ];
    if (idx === -1) {
      await appendSheetRow(spreadsheetId, "Gruppi_Grading!A:E", values, token);
    } else {
      await updateSheetRow(spreadsheetId, `Gruppi_Grading!A${idx + 1}:E${idx + 1}`, values, token);
    }

    if (isTransitioningToSpedito) {
      const groupCards = oggettiInGrading.filter((c) => c.ID_Gruppo_Grading === group.ID_Gruppo_Grading);
      const totalCost = groupCards.reduce((sum, c) => sum + (c.Costo_Acquisto || 0), 0);

      if (totalCost > 0) {
        // Prevent duplicate transaction entries for this group by querying the spreadsheet
        const existingFinanceRows = await fetchSheetRows(spreadsheetId, "Finanze!A:E", token);
        const alreadyCharged = existingFinanceRows.some((row) => 
          row[1]?.toString() === "Uscita" && 
          row[4]?.toString().includes(`(ID Lotto: ${group.ID_Gruppo_Grading})`)
        );

        if (!alreadyCharged) {
          const todayStr = new Date().toISOString().split("T")[0];
          const txRow = [
            todayStr,
            "Uscita",
            totalCost,
            "Costi di grading",
            `Addebito costo totale gradazione lotto: ${group.Nome_Gruppo} (ID Lotto: ${group.ID_Gruppo_Grading})`
          ];
          await appendSheetRow(spreadsheetId, "Finanze!A:E", txRow, token);
        }
      }
    }

    if (isTransitioningFromSpedito) {
      const existingFinanceRows = await fetchSheetRows(spreadsheetId, "Finanze!A:E", token);
      const indicesToDelete: number[] = [];
      existingFinanceRows.forEach((row, rIdx) => {
        if (row[1]?.toString() === "Uscita" && row[4]?.toString().includes(`(ID Lotto: ${group.ID_Gruppo_Grading})`)) {
          indicesToDelete.push(rIdx);
        }
      });
      indicesToDelete.sort((a, b) => b - a);
      for (const idx of indicesToDelete) {
        await deleteSheetRow(spreadsheetId, "Finanze", idx, token);
      }
    }

    await handleLoadDatabase();
  };

  // Assign multiple cards to a grading group
  const handleAssignCardsToGroup = async (groupId: string, cardIds: string[]) => {
    if (!spreadsheetId || !token) return;
    if (userRole === "utente") {
      alert("Azione non consentita: solo Owner e Moderatore possono assegnare carte ai gruppi grading.");
      return;
    }
    const allGradingRows = await fetchSheetRows(spreadsheetId, "Oggetti_In_Grading!A2:P2000", token);
    const items = allGradingRows.map(rowToGradingItem).filter((item) => item.ID_Oggetto_Grading !== "");
    
    // Update matching items with the groupId
    const updatedItems = items.map((item) => {
      if (cardIds.includes(item.ID_Oggetto_Grading)) {
        return { ...item, ID_Gruppo_Grading: groupId };
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
    await handleLoadDatabase();
  };

  // Update a single card's fields (returned photo, delivery method)
  const handleUpdateGradingCard = async (cardId: string, updates: Partial<GradingItem>) => {
    if (!spreadsheetId || !token) return;
    if (userRole === "utente") {
      alert("Azione non consentita: solo Owner e Moderatore possono modificare le carte in grading.");
      return;
    }
    const allGradingRows = await fetchSheetRows(spreadsheetId, "Oggetti_In_Grading!A2:P2000", token);
    const items = allGradingRows.map(rowToGradingItem).filter((item) => item.ID_Oggetto_Grading !== "");
    
    const targetItem = items.find((item) => item.ID_Oggetto_Grading === cardId);
    const oldAcconto = targetItem ? (targetItem.Acconto_Pagato || 0) : 0;
    const newAcconto = updates.Acconto_Pagato !== undefined ? updates.Acconto_Pagato : oldAcconto;
    const isTransitioningToPaid = targetItem && !targetItem.Pagato_Singolarmente && updates.Pagato_Singolarmente === true;
    const isTransitioningToUnpaid = targetItem && targetItem.Pagato_Singolarmente && updates.Pagato_Singolarmente === false;
    const isAccontoIncreased = targetItem && !targetItem.Pagato_Singolarmente && !updates.Pagato_Singolarmente && newAcconto > oldAcconto;

    const updatedItems = items.map((item) => {
      if (item.ID_Oggetto_Grading === cardId) {
        return { ...item, ...updates };
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

    const existingFinanceRows = await fetchSheetRows(spreadsheetId, "Finanze!A:E", token);
    const todayStr = new Date().toISOString().split("T")[0];

    if (targetItem && !updates.Pagato_Singolarmente && newAcconto > 0) {
      const alreadyLoggedAcconto = existingFinanceRows
        .filter((row) => 
          row[1]?.toString() === "Entrata" &&
          row[3]?.toString() === "Acconto Pagamento" &&
          row[4]?.toString().includes(`(ID Carta: ${targetItem.ID_Oggetto_Grading})`)
        )
        .reduce((sum, row) => sum + (parseFloat(row[2]) || 0), 0);

      const accontoDiff = newAcconto - alreadyLoggedAcconto;
      if (accontoDiff > 0) {
        const cartsRows = await fetchSheetRows(spreadsheetId, "Clienti_Carrelli!A:K", token);
        const cartRow = cartsRows.find((r) => r[0]?.toString() === targetItem.ID_Carrello);
        const clientName = cartRow ? cartRow[1]?.toString() : "N/A";

        const financeRow = [
          todayStr,
          "Entrata",
          accontoDiff,
          "Acconto Pagamento",
          `Acconto gradazione: ${targetItem.Nome_Carta} (ID Carta: ${targetItem.ID_Oggetto_Grading}) per cliente ${clientName}`
        ];
        await appendSheetRow(spreadsheetId, "Finanze!A:E", financeRow, token);
        existingFinanceRows.push(financeRow);
      }
    }

    if (isTransitioningToPaid && targetItem) {
      const alreadyLogged = existingFinanceRows.some((row) => 
        row[4]?.toString().includes(`(ID Carta: ${targetItem.ID_Oggetto_Grading})`) &&
        (row[4]?.toString().includes("Saldo pagato gradazione") || row[4]?.toString().includes("Pagamento gradazione"))
      );

      const alreadyLoggedAcconto = existingFinanceRows
        .filter((row) => 
          row[1]?.toString() === "Entrata" &&
          row[3]?.toString() === "Acconto Pagamento" &&
          row[4]?.toString().includes(`(ID Carta: ${targetItem.ID_Oggetto_Grading})`)
        )
        .reduce((sum, row) => sum + (parseFloat(row[2]) || 0), 0);

      const remainingBalance = Math.max(0, targetItem.Costo_Cliente - alreadyLoggedAcconto);

      if (!alreadyLogged && remainingBalance > 0) {
        const cartsRows = await fetchSheetRows(spreadsheetId, "Clienti_Carrelli!A:K", token);
        const cartRow = cartsRows.find((r) => r[0]?.toString() === targetItem.ID_Carrello);
        const clientName = cartRow ? cartRow[1]?.toString() : "N/A";
        
        const financeRow = [
          todayStr,
          "Entrata",
          remainingBalance,
          "Servizio Grading",
          `Saldo pagato gradazione: ${targetItem.Nome_Carta} (ID Carta: ${targetItem.ID_Oggetto_Grading}) per cliente ${clientName}`
        ];
        await appendSheetRow(spreadsheetId, "Finanze!A:E", financeRow, token);
      }
    }

    if (isTransitioningToUnpaid && targetItem) {
      const indicesToDelete: number[] = [];
      existingFinanceRows.forEach((row, rIdx) => {
        if (
          row[4]?.toString().includes(`(ID Carta: ${targetItem.ID_Oggetto_Grading})`) &&
          (row[4]?.toString().includes("Saldo pagato gradazione") || row[4]?.toString().includes("Pagamento gradazione"))
        ) {
          indicesToDelete.push(rIdx);
        }
      });
      indicesToDelete.sort((a, b) => b - a);
      for (const idx of indicesToDelete) {
        await deleteSheetRow(spreadsheetId, "Finanze", idx, token);
      }
    }

    await handleLoadDatabase();
  };

  // HardDrive dynamic price list to spreadsheet
  const handleSaveListino = async (items: ListinoGradingItem[]) => {
    if (!spreadsheetId || !token) return;
    if (userRole !== "owner") {
      alert("Azione non consentita: solo l'utente Owner può modificare il listino grading.");
      return;
    }
    const rowValues = items.map((item) => [
      item.Tipologia_Servizio,
      item.Costo_Cliente.toString(),
      item.Costo_Acquisto.toString()
    ]);

    while (rowValues.length < 100) {
      rowValues.push(["", "", ""]);
    }
    await updateSheetRows(spreadsheetId, `Listino_Grading!A2:C101`, rowValues, token);
    await handleLoadDatabase();
  };

  // Proceed to shipment (Bivio B: decrease Warehouse stock + financial entries)


  return {
    handleSaveGradingGroup,
    handleAssignCardsToGroup,
    handleUpdateGradingCard,
    handleSaveListino
  };
}
