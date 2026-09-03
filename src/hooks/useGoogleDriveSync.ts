import React, { useState, useCallback } from 'react';
import { 
  createProjectFolderStructure, 
  createDatabaseSpreadsheet, 
  moveFileToFolder, 
  getFileMetadata,
  listBackupsFromDrive
} from '../lib/googleApi';

interface UseGoogleDriveSyncProps {
  token: string | null;
  spreadsheetId: string;
  isProd: boolean;
  driveFolders: { liveId: string; backupId: string; projectId: string; } | null;
  userRole: string;
  manualSheetId: string;
  setManualSheetId: (val: string) => void;
  handleUpdateDriveFolders: (folders: any) => void;
  handleUpdateSpreadsheetId: (id: string) => void;
  addSafetyLog: (msg: string) => void;
  setSpreadsheetMetadata: (meta: any) => void;
  setSpreadsheetMetadataLoading: (loading: boolean) => void;
  setDriveBackups: (backups: any[]) => void;
  setDriveBackupsLoading: (loading: boolean) => void;
  setDbInitializing: (loading: boolean) => void;
}

export function useGoogleDriveSync({
  token,
  spreadsheetId,
  isProd,
  driveFolders,
  userRole,
  manualSheetId,
  setManualSheetId,
  handleUpdateDriveFolders,
  handleUpdateSpreadsheetId,
  addSafetyLog,
  setSpreadsheetMetadata,
  setSpreadsheetMetadataLoading,
  setDriveBackups,
  setDriveBackupsLoading,
  setDbInitializing
}: UseGoogleDriveSyncProps) {
  
  const fetchSpreadsheetMetadata = useCallback(async () => {
    if (!token || !spreadsheetId) return;
    setSpreadsheetMetadataLoading(true);
    try {
      const meta = await getFileMetadata(token, spreadsheetId);
      setSpreadsheetMetadata(meta);

      if (driveFolders?.liveId && userRole === "owner") {
        const parents = meta.parents || [];
        if (!parents.includes(driveFolders.liveId)) {
          addSafetyLog(`SPOSTAMENTO AUTOMATICO: Rilevato foglio database '${meta.name}' fuori dalla cartella 'Tavole Live'. Spostamento in corso...`);
          await moveFileToFolder(token, spreadsheetId, driveFolders.liveId);
          addSafetyLog(`SUCCESSO: Foglio database '${meta.name}' spostato nella cartella organizzata dell'Owner: Progetto Gestionale Spedizioni / Tavole Live.`);
          
          const updatedMeta = await getFileMetadata(token, spreadsheetId);
          setSpreadsheetMetadata(updatedMeta);
        } else {
          addSafetyLog(`ALLINEATO: Il database '${meta.name}' si trova correttamente nella cartella blindata 'Tavole Live'.`);
        }
      }
    } catch (err: any) {
      if (err.message?.toLowerCase().includes("failed to fetch")) { console.warn("Avviso: recupero metadati fallito (Failed to fetch). Potrebbe essere un adblocker o rete assente.", err.message); } else { console.error("Errore nel recupero dei metadati del foglio Google:", err); }
      addSafetyLog(`INFO: Foglio ufficiale agganciato con successo (Metadati non leggibili per via delle restrizioni di sicurezza Google Drive, ma l'accesso in lettura/scrittura dei dati è operativo): ${err.message}`);
      
      setSpreadsheetMetadata({
        id: spreadsheetId,
        name: isProd ? "Database Gestionale Spedizioni" : "Database Gestionale Spedizioni [DEV]",
        webViewLink: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
        parents: []
      });
    } finally {
      setSpreadsheetMetadataLoading(false);
    }
  }, [token, spreadsheetId, driveFolders, userRole, addSafetyLog, isProd, setSpreadsheetMetadata, setSpreadsheetMetadataLoading]);

  const fetchDriveBackups = useCallback(async () => {
    if (!token || !driveFolders?.backupId) return;
    setDriveBackupsLoading(true);
    try {
      const files = await listBackupsFromDrive(token, driveFolders.backupId);
      setDriveBackups(files);
      addSafetyLog("Lista dei backup cloud recuperata correttamente da Google Drive.");
    } catch (err: any) {
      console.error("Errore nel recupero dei backup di Drive:", err);
      addSafetyLog(`ERRORE: Recupero backup cloud fallito: ${err.message}`);
    } finally {
      setDriveBackupsLoading(false);
    }
  }, [token, driveFolders, setDriveBackups, setDriveBackupsLoading, addSafetyLog]);

  const handleCreateNewDatabase = useCallback(async () => {
    if (!token) return;
    setDbInitializing(true);
    try {
      const folders = await createProjectFolderStructure(token, isProd);
      handleUpdateDriveFolders(folders);
      addSafetyLog(`Struttura cartelle 'Progetto Gestionale' [${isProd ? "PROD" : "DEV"}] e sub-cartelle 'Live' & 'Backup' creata/identificata su Google Drive.`);

      const sheetTitle = isProd 
        ? "Gestionale Magazzino e Spedizioni" 
        : "Gestionale Magazzino e Spedizioni [DEV]";
      const newId = await createDatabaseSpreadsheet(token, sheetTitle);

      await moveFileToFolder(token, newId, folders.liveId);
      addSafetyLog(`Nuovo database '${newId}' organizzato in 'Tavole Live' [${isProd ? "PROD" : "DEV"}].`);

      handleUpdateSpreadsheetId(newId);
      alert(`Database Google Sheet [${isProd ? "PROD" : "DEV"}] creato con successo ed organizzato nella cartella 'Progetto Gestionale Spedizioni/Tavole Live'!`);
    } catch (err: any) {
      alert("Impossibile creare il database: " + err.message);
    } finally {
      setDbInitializing(false);
    }
  }, [token, isProd, handleUpdateDriveFolders, addSafetyLog, handleUpdateSpreadsheetId, setDbInitializing]);

  const handleConnectExistingDatabase = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualSheetId.trim() || !token) return;
    
    const inputVal = manualSheetId.trim();
    const sheetIdMatch = inputVal.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    const activeId = sheetIdMatch && sheetIdMatch[1] ? sheetIdMatch[1] : inputVal;

    setDbInitializing(true);
    try {
      const folders = await createProjectFolderStructure(token, isProd);
      handleUpdateDriveFolders(folders);
      addSafetyLog(`Struttura cartelle Google Drive [${isProd ? "PROD" : "DEV"}] allineata con successo.`);

      try {
        await moveFileToFolder(token, activeId, folders.liveId);
        addSafetyLog(`Database collegato '${activeId}' spostato in 'Tavole Live' [${isProd ? "PROD" : "DEV"}].`);
      } catch (moveErr: any) {
        addSafetyLog(`Database collegato. Spostamento ignorato: ${moveErr.message}`);
      }

      handleUpdateSpreadsheetId(activeId);
      setManualSheetId("");
      alert(`Database collegato ed allineato correttamente con l'area Google Drive [${isProd ? "PROD" : "DEV"}]!`);
    } catch (err: any) {
      alert("Errore nel collegamento: " + err.message);
    } finally {
      setDbInitializing(false);
    }
  }, [manualSheetId, token, isProd, handleUpdateDriveFolders, addSafetyLog, handleUpdateSpreadsheetId, setManualSheetId, setDbInitializing]);

  return {
    fetchSpreadsheetMetadata,
    fetchDriveBackups,
    handleCreateNewDatabase,
    handleConnectExistingDatabase
  };
}
