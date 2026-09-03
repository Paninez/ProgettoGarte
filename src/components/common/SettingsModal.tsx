import React from 'react';
import { HardDrive, X, FileUp, FileDown, RefreshCw, Settings } from 'lucide-react';

interface SettingsModalProps {
  isSettingsOpen: boolean;
  setIsSettingsOpen: (isOpen: boolean) => void;
  driveFolders: any;
  createBackup: (type: "giornaliero" | "orario_1" | "orario_2" | "manuale", label: string, customData?: any) => Promise<void>;
  handleExportFullLiveJson: () => void;
  handleImportBackup: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fetchDriveBackups: () => void;
  driveBackupsLoading: boolean;
  driveBackups: any[];
  handleRestoreCloudBackup: (id: string, name: string) => void;
  dbLoading: boolean;
  userRole: string;
  spreadsheetId: string;
  setSpreadsheetId: (id: string) => void;
  handleLoadDatabase: () => void;
}

export function SettingsModal({
  isSettingsOpen,
  setIsSettingsOpen,
  driveFolders,
  createBackup,
  handleExportFullLiveJson,
  handleImportBackup,
  fetchDriveBackups,
  driveBackupsLoading,
  driveBackups,
  handleRestoreCloudBackup,
  dbLoading,
  userRole,
  spreadsheetId,
  setSpreadsheetId,
  handleLoadDatabase
}: SettingsModalProps) {
  if (!isSettingsOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 md:p-8 space-y-6 animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl">
              <HardDrive className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">Impostazioni & Backup Dati</h3>
              <p className="text-xs text-slate-400">Archiviazione separata, backup orari/giornalieri e ripristino di emergenza</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsSettingsOpen(false)}
            className="p-1.5 hover:bg-slate-50 text-slate-400 hover:text-slate-700 rounded-xl transition-all cursor-pointer"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Backups */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <HardDrive className="h-4 w-4 text-emerald-500" />
                  Backup Manuale & Ripristino (Drive)
                </h4>
                <p className="text-xs text-slate-500">Salva un file JSON di emergenza della sessione nel Cloud Drive.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <button
                onClick={() => createBackup("manuale", "Backup Manuale Utente")}
                disabled={!driveFolders?.backupId}
                className="flex items-center justify-center space-x-2 px-3 py-3 bg-white border-2 border-emerald-100 hover:border-emerald-300 hover:bg-emerald-50 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-emerald-700 font-bold text-xs uppercase tracking-wider shadow-xs transition-all cursor-pointer"
              >
                <FileUp className="h-4 w-4" />
                <span>Backup Cloud</span>
              </button>
              
              <button
                onClick={handleExportFullLiveJson}
                className="flex items-center justify-center space-x-2 px-3 py-3 bg-white border-2 border-indigo-100 hover:border-indigo-300 hover:bg-indigo-50 rounded-xl text-indigo-700 font-bold text-xs uppercase tracking-wider shadow-xs transition-all cursor-pointer"
              >
                <FileDown className="h-4 w-4" />
                <span>Esporta JSON</span>
              </button>
              
              <label className="relative group block cursor-pointer">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportBackup}
                  className="hidden"
                />
                <div className="flex items-center justify-center space-x-2 px-3 py-3 bg-white border-2 border-amber-100 group-hover:border-amber-300 group-hover:bg-amber-50 rounded-xl text-amber-700 font-bold text-xs uppercase tracking-wider shadow-xs transition-all">
                  <FileDown className="h-4 w-4" />
                  <span>Ripristina JSON</span>
                </div>
              </label>
            </div>
            
            {driveFolders?.backupId && (
              <div className="mt-4 border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex items-center justify-between">
                  <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Elenco Backup in Cloud</h5>
                  <button 
                    onClick={fetchDriveBackups} 
                    disabled={driveBackupsLoading}
                    className="text-slate-500 hover:text-indigo-600 transition-colors p-1"
                    title="Aggiorna lista"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${driveBackupsLoading ? "animate-spin" : ""}`} />
                  </button>
                </div>
                <div className="max-h-48 overflow-y-auto bg-white p-2 space-y-2">
                  {driveBackupsLoading && driveBackups.length === 0 ? (
                    <div className="text-center py-4 text-xs text-slate-400">Caricamento backup...</div>
                  ) : driveBackups.length === 0 ? (
                    <div className="text-center py-4 text-xs text-slate-400">Nessun backup trovato nel Cloud.</div>
                  ) : (
                    driveBackups.map((b) => (
                      <div key={b.id} className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-50 p-2.5 rounded-lg border border-slate-100 gap-2 hover:border-indigo-100 transition-colors">
                        <div className="overflow-hidden">
                          <p className="text-xs font-bold text-slate-700 truncate">{b.name}</p>
                          <p className="text-[10px] text-slate-500">{new Date(b.createdTime).toLocaleString("it-IT")}</p>
                        </div>
                        <button
                          onClick={() => handleRestoreCloudBackup(b.id, b.name)}
                          disabled={dbLoading}
                          className="shrink-0 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white border border-indigo-200 text-indigo-600 hover:bg-indigo-50 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          <FileDown className="h-3 w-3" />
                          <span>Ripristina</span>
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
            
            {!driveFolders?.backupId && (
              <p className="text-[10px] text-amber-600 bg-amber-50 p-2 rounded border border-amber-100 mt-2">
                Nessuna cartella di backup trovata su Drive. Contatta l'amministratore.
              </p>
            )}
          </div>

          {/* Configurazione Sheet ID */}
          {userRole === "owner" && (
            <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div>
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Settings className="h-4 w-4 text-indigo-500" />
                  Impostazioni Archiviazione Condivisa
                </h4>
                <p className="text-xs text-slate-500">Modifica l'ID del foglio di calcolo Google come database primario.</p>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">ID Foglio Google (Spreadsheet ID)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={spreadsheetId || ""}
                    onChange={(e) => {
                      let val = e.target.value.trim();
                      if (val.includes("/d/")) {
                        const match = val.match(/\/d\/([a-zA-Z0-9-_]+)/);
                        if (match) val = match[1];
                      }
                      setSpreadsheetId(val);
                    }}
                    placeholder="Es. 1BxiMvs0XRYFgwnX..."
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-xl focus:ring-1 focus:ring-indigo-500 text-xs font-mono text-slate-700 bg-white"
                  />
                  <button
                    onClick={() => handleLoadDatabase()}
                    disabled={dbLoading || !spreadsheetId}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-400 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-2 shrink-0"
                  >
                    {dbLoading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <HardDrive className="h-3.5 w-3.5" />}
                    <span>Applica</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
