import { useDatabase } from "../context/DatabaseContext";
import { rowToDettaglio, rowToGradingItem, clearSheetRange, deleteSheetRow } from "../lib/googleApi";
import { appendSheetRow, deleteRowByID, fetchSheetRows } from "../lib/googleApi";
import { logDbChange } from "../lib/dbAuditLogger";
import { Finanza } from "../types";

export function useFinanzeSync() {
  const { 
    finanze, setFinanze,
    spreadsheetId, token, driveFolders,
    currentOperatore, addSafetyLog,
    user, userRole, setSafetyLogs, handleLoadDatabase
  } = useDatabase();

  const handleAddTransaction = async (tx: Finanza) => {
    if (!spreadsheetId || !token) return;
    if (userRole !== "owner") {
      alert("Azione non consentita: solo l'utente Owner può aggiungere transazioni.");
      return;
    }
    const rowValues = [
      tx.Data,
      tx.Tipo,
      tx.Importo,
      tx.Categoria,
      tx.Note
    ];
    await appendSheetRow(spreadsheetId, "Finanze!A:E", rowValues, token);

    logDbChange(token, driveFolders?.backupId, {
      table: "Finanze",
      operation: "INSERIMENTO",
      recordId: `${tx.Tipo}-${tx.Data}`,
      recordName: tx.Categoria,
      operator: currentOperatore,
      userEmail: user?.email,
      details: {
        Data: tx.Data,
        Tipo: tx.Tipo,
        Importo: `€${Number(tx.Importo || 0).toFixed(2)}`,
        Categoria: tx.Categoria,
        Note: tx.Note || ""
      }
    }, setSafetyLogs);

    await handleLoadDatabase();
  };






  return {
    handleAddTransaction
  };
}
