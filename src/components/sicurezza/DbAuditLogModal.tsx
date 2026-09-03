import React, { useState, useMemo } from "react";
import { ShieldCheck, Search, Filter, Download, FileText, CheckCircle2, AlertTriangle, X, RefreshCw } from "lucide-react";

interface DbAuditLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  safetyLogs: string[];
  token?: string | null;
  backupFolderId?: string;
}

export const DbAuditLogModal: React.FC<DbAuditLogModalProps> = ({
  isOpen,
  onClose,
  safetyLogs,
  token,
  backupFolderId
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTable, setSelectedTable] = useState<string>("TUTTI");
  const [effectiveOnly, setEffectiveOnly] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);

  const filteredLogs = useMemo(() => {
    return safetyLogs.filter((log) => {
      // Table filter
      if (selectedTable !== "TUTTI") {
        if (!log.toUpperCase().includes(`[${selectedTable}]`) && !log.toUpperCase().includes(`[TABELLA: ${selectedTable}]`)) {
          return false;
        }
      }

      // Effective changes filter
      if (effectiveOnly) {
        if (!log.includes("MODIFICA EFFETTIVA") && !log.includes("INSERIMENTO")) {
          return false;
        }
      }

      // Search term filter
      if (searchTerm.trim() !== "") {
        const query = searchTerm.toLowerCase();
        if (!log.toLowerCase().includes(query)) {
          return false;
        }
      }

      return true;
    });
  }, [safetyLogs, selectedTable, effectiveOnly, searchTerm]);

  if (!isOpen) return null;

  const downloadAuditLogFromDrive = async () => {
    if (!token || !backupFolderId) {
      alert("Integrazione Google Drive non disponibile o token non valido.");
      return;
    }
    setIsDownloading(true);
    try {
      // Search for audit_log.csv in Drive
      const query = `'${backupFolderId}' in parents and name='audit_log.csv' and trashed=false`;
      const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id)&supportsAllDrives=true&includeItemsFromAllDrives=true`;
      const res = await fetch(searchUrl, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Ricerca file audit_log.csv su Drive fallita.");
      const data = await res.json();
      if (!data.files || data.files.length === 0) {
        alert("Il file audit_log.csv non è ancora stato creato su Google Drive per questo ambiente.");
        return;
      }

      const fileId = data.files[0].id;
      const downloadRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&supportsAllDrives=true`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!downloadRes.ok) throw new Error("Download audit_log.csv fallito.");
      const content = await downloadRes.text();

      // Trigger browser download
      const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit_log_drive_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error(err);
      alert(`Errore scaricamento log da Drive: ${err.message}`);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">Audit Log Operazioni Database (Google Drive Sync)</h2>
              <p className="text-xs text-slate-400">
                Registro in tempo reale di tutte le modifiche alle tabelle, diff righe e verifiche efficacia cambi.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar & Filters */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-grow max-w-lg">
            <div className="relative flex-grow">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cerca per ID, nome articolo, operatore, campo..."
                className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <select
              value={selectedTable}
              onChange={(e) => setSelectedTable(e.target.value)}
              className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs rounded-lg px-3 py-1.5 text-slate-800 dark:text-slate-200 focus:outline-hidden"
            >
              <option value="TUTTI">Tutte le Tabelle</option>
              <option value="MAGAZZINO">Magazzino</option>
              <option value="CLIENTI_CARRELLI">Clienti / Carrelli</option>
              <option value="DETTAGLIO_CARRELLO">Dettaglio Carrello</option>
              <option value="LOGISTICA_SPEDIZIONI">Logistica Spedizioni</option>
              <option value="FINANZE">Finanze</option>
              <option value="GRADING">Grading</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={effectiveOnly}
                onChange={(e) => setEffectiveOnly(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500"
              />
              <span>Solo Cambi Effettivi</span>
            </label>

            <button
              onClick={downloadAuditLogFromDrive}
              disabled={isDownloading || !token}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              {isDownloading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>Scarica audit_log.csv Drive</span>
            </button>
          </div>
        </div>

        {/* Content Console */}
        <div className="flex-grow overflow-y-auto p-4 bg-slate-950 font-mono text-xs space-y-3 scrollbar-thin">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              <ShieldCheck className="w-10 h-10 mx-auto text-slate-700 mb-2" />
              Nessun log operativo trovato per i filtri selezionati.
            </div>
          ) : (
            filteredLogs.map((log, idx) => {
              const isNonEffective = log.includes("MODIFICA NON EFFETTIVA");
              const isEffective = log.includes("MODIFICA EFFETTIVA") || log.includes("INSERIMENTO");
              const isError = log.includes("ERRORE");

              return (
                <div
                  key={idx}
                  className={`p-3 rounded-xl border leading-relaxed break-words whitespace-pre-wrap transition-colors ${
                    isNonEffective
                      ? "bg-amber-950/30 border-amber-800/50 text-amber-300"
                      : isEffective
                      ? "bg-emerald-950/30 border-emerald-800/50 text-emerald-200"
                      : isError
                      ? "bg-rose-950/30 border-rose-800/50 text-rose-300"
                      : "bg-slate-900 border-slate-800 text-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5 mb-1.5 text-[10px] text-slate-400">
                    <div className="flex items-center gap-2">
                      {isNonEffective ? (
                        <span className="inline-flex items-center gap-1 text-amber-400 font-bold bg-amber-900/50 px-1.5 py-0.5 rounded">
                          <AlertTriangle className="w-3 h-3" /> CAMBI NON EFFETTIVI
                        </span>
                      ) : isEffective ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400 font-bold bg-emerald-900/50 px-1.5 py-0.5 rounded">
                          <CheckCircle2 className="w-3 h-3" /> CAMBI EFFETTIVI
                        </span>
                      ) : (
                        <span className="text-slate-400">REGISTRO DB</span>
                      )}
                    </div>
                  </div>
                  <div>{log}</div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-100 dark:bg-slate-800 px-6 py-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
          <div>
            Totale Voci Mostrate: <strong className="text-slate-900 dark:text-white">{filteredLogs.length}</strong> / {safetyLogs.length}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-lg font-medium transition-colors"
          >
            Chiudi Modal
          </button>
        </div>
      </div>
    </div>
  );
};
