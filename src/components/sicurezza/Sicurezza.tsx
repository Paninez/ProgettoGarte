import { useDatabase } from "../../context/DatabaseContext";
import React, { useState } from "react";
import { FolderOpen, Lock, Settings, RefreshCw, ShieldCheck, UserIcon, Trash2, ShieldAlert, FileText, ExternalLink } from "lucide-react";
import { UtenteRegistrato } from "../../types";
import { DbAuditLogModal } from "./DbAuditLogModal";

interface SicurezzaProps {
  spreadsheetId: string | null;
  isProd: boolean;

  user: any;

  dbLoading: boolean;
  setIsSettingsOpen: (val: boolean) => void;
  handleLoadDatabase: () => void;
  runSecuritySelfTests: () => void;
  testsRunning: boolean;
  newRegEmail: string;
  setNewRegEmail: (val: string) => void;
  newRegRole: "owner" | "moderatore" | "utente";
  setNewRegRole: (val: "owner" | "moderatore" | "utente") => void;
  handleAddRegisteredUser: (email: string, role: string) => void;

  handleDeleteRegisteredUser: (email: string) => void;
  handleUpdateRegisteredUserRole?: (email: string, role: "owner" | "moderatore" | "utente") => void;
  ownerEmail: string;
  safetyLogs: string[];
  testResults: any[];
  token?: string | null;
  backupFolderId?: string;
}

export const Sicurezza: React.FC<SicurezzaProps> = React.memo(({
  spreadsheetId,
  isProd,
  user,
  dbLoading,
  setIsSettingsOpen,
  handleLoadDatabase,
  runSecuritySelfTests,
  testsRunning,
  newRegEmail,
  setNewRegEmail,
  newRegRole,
  setNewRegRole,
  handleAddRegisteredUser,
  handleDeleteRegisteredUser,
  handleUpdateRegisteredUserRole,
  ownerEmail,
  safetyLogs,
  testResults,
  token,
  backupFolderId
}) => {
  const { userRole, currentOperatore, registeredUsers } = useDatabase();

  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  return (
    <div className="space-y-8 animate-fade-in text-slate-800">
      {/* Connessione Database & Stato Sync (Spostato qui per pulizia visiva delle tabelle) */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between bg-white rounded-2xl border border-slate-200 p-4 gap-4 shadow-sm">
        <div className="flex items-center space-x-3 min-w-0">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl flex-shrink-0">
            <FolderOpen className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">ID Foglio Google Collegato</span>
            <span className="font-mono text-xs text-slate-700 font-semibold truncate block max-w-xs md:max-w-md">{spreadsheetId}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Stato Ambiente Badge */}
          <div className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-[10px] font-bold uppercase tracking-wider ${
            isProd 
              ? "bg-emerald-50/80 text-emerald-700 border-emerald-200/60" 
              : "bg-amber-50/80 text-amber-800 border-amber-200/60"
          }`} title="Ambiente di lavoro attivo">
            <span className={`h-1.5 w-1.5 rounded-full ${isProd ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
            <span>Ambiente: {isProd ? "PROD" : "DEV"}</span>
            <Lock className="h-3 w-3 text-slate-400 shrink-0" />
          </div>

          <div className="text-right hidden sm:block">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
              {userRole === "owner" ? "Owner Attivo" : "Operatore Attivo"}
            </span>
            <span className="text-xs font-bold text-indigo-700">
              {userRole === "owner" ? (user?.displayName || "Owner") : currentOperatore}
            </span>
          </div>

          <div className="h-4 w-[1px] bg-slate-200 hidden sm:block"></div>

          <button
            onClick={() => setIsSettingsOpen(true)}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-150 rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-xs"
          >
            <Settings className="h-3.5 w-3.5 text-indigo-600 animate-pulse" />
            <span>Backup & Config</span>
          </button>

          <button
            onClick={() => handleLoadDatabase()}
            disabled={dbLoading}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 disabled:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${dbLoading ? "animate-spin" : ""}`} />
            <span>{dbLoading ? "Sincronizzazione..." : "Sincronizza"}</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-emerald-600 animate-pulse" />
              Pannello Controllo Sicurezza & Cyber-Audit
            </h2>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
              userRole === "owner" 
                ? "bg-emerald-50 text-emerald-700 border border-emerald-150" 
                : userRole === "moderatore"
                ? "bg-indigo-50 text-indigo-700 border border-indigo-150"
                : "bg-amber-50 text-amber-700 border border-amber-150"
            }`}>
              <span className={`h-1.5 w-1.5 rounded-full ${userRole === "owner" ? "bg-emerald-500" : userRole === "moderatore" ? "bg-indigo-500" : "bg-amber-500"}`} />
              Ruolo: {(userRole || "").toUpperCase()}
            </span>
          </div>
          <p className="text-slate-500 text-sm mt-1">
            Audit di sicurezza integrato per evitare cancellazioni accidentali e regolare gli accessi di produzione.
          </p>
        </div>
        <button
          onClick={runSecuritySelfTests}
          disabled={testsRunning}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold rounded-xl text-xs transition-all shadow-md cursor-pointer flex items-center gap-2 shrink-0"
        >
          {testsRunning ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
          <span>Esegui Audit di Sicurezza</span>
        </button>
      </div>

      {/* Optimized Multi-Layer Security Management Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Database Registro Utenti Certificati (Fogli di Calcolo Google) */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6 flex flex-col justify-between">
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight flex items-center gap-1.5">
                  <UserIcon className="h-4 w-4 text-indigo-600" />
                  Registro Utenti Certificati (Google Sheets)
                </h3>
                <p className="text-slate-400 text-xs">
                  Salva e abilita i ruoli autorizzati direttamente nel database condiviso su Google Drive.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] bg-slate-100 px-2 py-1 rounded-lg font-mono text-slate-500">
                  Tabella: Utenti_Registrati
                </span>
                {userRole !== "owner" && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-amber-50 border border-amber-200 text-amber-800 animate-pulse">
                    <Lock className="h-3 w-3" />
                    <span>Sola Lettura</span>
                  </span>
                )}
              </div>
            </div>

            {userRole === "owner" ? (
              <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-4 space-y-4">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Aggiungi Nuovo Utente Autorizzato</h4>
                <div className="flex flex-col md:flex-row gap-3 items-end">
                  <div className="flex-1 space-y-1.5 w-full">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Indirizzo Email Gmail</label>
                    <input
                      type="email"
                      value={newRegEmail}
                      onChange={(e) => setNewRegEmail(e.target.value)}
                      placeholder="esempio.operatore@gmail.com"
                      className="w-full px-3 py-2 bg-white border border-slate-250 rounded-xl text-xs focus:ring-1 focus:ring-indigo-500 text-slate-800 font-medium"
                    />
                  </div>

                  <div className="w-full md:w-48 space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Ruolo Autorizzazione</label>
                    <select
                      value={newRegRole}
                      onChange={(e) => setNewRegRole(e.target.value as any)}
                      className="w-full px-3 py-2 bg-white border border-slate-250 rounded-xl text-xs focus:ring-1 focus:ring-indigo-500 text-slate-800 font-medium"
                    >
                      <option value="utente">Utente (Visualizzazione)</option>
                      <option value="moderatore">Moderatore (Gestione Spedizioni)</option>
                      <option value="owner">Owner (Amministrazione Completa)</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (!newRegEmail) return;
                      handleAddRegisteredUser(newRegEmail, newRegRole);
                    }}
                    className="w-full md:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm shrink-0 cursor-pointer h-[36px]"
                  >
                    Registra Utente
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-amber-800 text-xs flex items-start gap-2">
                <Lock className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <span>Solo l'Owner primario può aggiungere o eliminare utenti registrati in questo database.</span>
              </div>
            )}

            <div className="overflow-x-auto border border-slate-150 rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-150 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="p-3">Email Utente</th>
                    <th className="p-3">Ruolo</th>
                    <th className="p-3">Data Registrazione</th>
                    {userRole === "owner" && <th className="p-3 text-right">Azioni</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150">
                  {registeredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={userRole === "owner" ? 4 : 3} className="p-6 text-center text-slate-400 font-medium">
                        Nessun utente registrato in tabella. Usa il modulo sovrastante per registrare il primo.
                      </td>
                    </tr>
                  ) : (
                    registeredUsers.map((regUser, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-3 font-semibold text-slate-800">{regUser.Email}</td>
                        <td className="p-3">
                          {userRole === "owner" && regUser.Email.toLowerCase().trim() !== "tuccillostefano@gmail.com" && regUser.Email.toLowerCase().trim() !== ownerEmail.toLowerCase().trim() ? (
                            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg w-fit gap-1">
                              {["owner", "moderatore", "utente"].map((roleOption) => (
                                <button
                                  key={roleOption}
                                  onClick={() => {
                                    if (regUser.Ruolo !== roleOption && handleUpdateRegisteredUserRole) {
                                      handleUpdateRegisteredUserRole(regUser.Email, roleOption as any);
                                    }
                                  }}
                                  className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all shadow-3xs cursor-pointer ${
                                    regUser.Ruolo === roleOption
                                      ? roleOption === "owner"
                                        ? "bg-emerald-600 text-white shadow-sm"
                                        : roleOption === "moderatore"
                                        ? "bg-indigo-600 text-white shadow-sm"
                                        : "bg-slate-700 dark:bg-slate-600 text-white shadow-sm"
                                      : "bg-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 hover:bg-white dark:hover:bg-slate-700"
                                  }`}
                                >
                                  {roleOption}
                                </button>
                              ))}
                            </div>
                          ) : (
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              regUser.Ruolo === "owner"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-150"
                                : regUser.Ruolo === "moderatore"
                                ? "bg-indigo-50 text-indigo-700 border border-indigo-150"
                                : "bg-slate-50 text-slate-600 border border-slate-200"
                            }`}>
                              {regUser.Ruolo.toUpperCase()}
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-slate-500 font-medium">{regUser.Data_Registrazione || "-"}</td>
                        {userRole === "owner" && (
                          <td className="p-3 text-right">
                            <button
                              onClick={() => {
                                if (userToDelete === regUser.Email) {
                                  handleDeleteRegisteredUser(regUser.Email);
                                  setUserToDelete(null);
                                } else {
                                  setUserToDelete(regUser.Email);
                                  // Auto-reset after 3s
                                  setTimeout(() => setUserToDelete(null), 3000);
                                }
                              }}
                              disabled={regUser.Email.toLowerCase().trim() === "tuccillostefano@gmail.com" || regUser.Email.toLowerCase().trim() === ownerEmail.toLowerCase().trim()}
                              className={`p-2 rounded-lg transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed shadow-3xs flex items-center gap-1 ${
                                userToDelete === regUser.Email
                                  ? "bg-rose-600 text-white"
                                  : "text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-600 dark:bg-rose-950/30 dark:hover:bg-rose-600"
                              }`}
                              title="Elimina utente"
                            >
                              {userToDelete === regUser.Email ? (
                                <span className="text-[10px] font-bold uppercase">Conferma</span>
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Safety Logs */}
        <div className="lg:col-span-1 bg-white border border-slate-200 rounded-2xl p-0 shadow-xs flex flex-col overflow-hidden min-h-[400px]">
          <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-emerald-400" />
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-tight">
                Log & Audit Trail Sicurezza
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsAuditModalOpen(true)}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded flex items-center gap-1 transition-colors shadow-xs"
                title="Apri ispettore log DB avanzato"
              >
                <FileText className="w-3 h-3" />
                <span>Ispreziona Audit DB</span>
              </button>
              <button
                onClick={() => navigator.clipboard.writeText(safetyLogs.join("\n"))}
                className="text-slate-400 hover:text-white transition-colors p-1"
                title="Copia log"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
              </button>
            </div>
          </div>
          <div className="flex-grow overflow-y-auto bg-slate-950 p-4 space-y-1.5 scrollbar-thin min-h-[300px] max-h-[480px]">
            {safetyLogs.length === 0 ? (
              <div className="text-slate-500 text-center py-24 text-xs font-mono">Nessun log registrato in questa sessione.</div>
            ) : (
              safetyLogs.map((log, idx) => {
                const match = log.match(/^\[(.*?)\] (.*)/);
                let time = "";
                let msg = log;
                if (match) {
                  time = match[1];
                  msg = match[2];
                }
                const isError = msg.includes("ERRORE") || msg.includes("fallit");
                const isWarning = msg.includes("WARNING");
                const isSuccess = msg.includes("SUCCESSO") || msg.includes("correttamente") || msg.includes("completata");
                
                let msgClass = "text-slate-300";
                if (isError) msgClass = "text-rose-400 font-bold";
                else if (isWarning) msgClass = "text-amber-400";
                else if (isSuccess) msgClass = "text-emerald-400";
                
                return (
                  <div key={idx} className="font-mono text-[10px] leading-relaxed break-words whitespace-pre-wrap flex items-start gap-2 hover:bg-slate-900/50 p-1 rounded transition-colors">
                    <span className="text-slate-600 shrink-0 select-none">[{time || "SYS"}]</span>
                    <span className={msgClass}>{msg}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Test Results list */}
      {testResults.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight">Risultati dell'Audit di Produzione</h3>
            <p className="text-slate-400 text-xs">Esito delle simulazioni di aggressione e corruzione per testare la robustezza.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {testResults.map((t, idx) => (
              <div key={idx} className="border border-slate-150 rounded-xl p-4 space-y-2 bg-slate-50/50">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs text-slate-800">{t.name}</h4>
                  <span className={`px-2 py-0.5 rounded-md font-bold text-[9px] ${
                    t.status === "PASSED" 
                       ? "bg-emerald-100 text-emerald-800" 
                       : t.status === "WARNING" 
                       ? "bg-amber-100 text-amber-850" 
                       : "bg-rose-100 text-rose-800"
                  }`}>
                    {t.status}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">{t.description}</p>
                <div className="text-[10px] bg-white border border-slate-200 rounded p-2 text-slate-600 font-mono">
                  {t.details}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Database Audit Log Modal */}
      <DbAuditLogModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        safetyLogs={safetyLogs}
        token={token}
        backupFolderId={backupFolderId}
      />
    </div>
  );
});
