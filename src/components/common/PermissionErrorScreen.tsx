import React from 'react';
import { ShieldAlert, RefreshCw } from 'lucide-react';
import { User } from 'firebase/auth';

interface PermissionErrorScreenProps {
  isProd: boolean;
  dbPermissionError: { resourceId: string; type: "sheets" | "drive" };
  user: User | null;
  spreadsheetId: string;
  setDbPermissionError: (error: any) => void;
  handleToggleEnvironment: (prod: boolean) => void;
  handleLoadDatabase: () => void;
  handleLogout: () => void;
}

export function PermissionErrorScreen({
  isProd,
  dbPermissionError,
  user,
  spreadsheetId,
  setDbPermissionError,
  handleToggleEnvironment,
  handleLoadDatabase,
  handleLogout
}: PermissionErrorScreenProps) {
  return (
    <div className="min-h-[100dvh] bg-slate-50 flex flex-col justify-between font-sans">
      {/* Environment toggle banner */}
      <div className="w-full bg-slate-950 text-white px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shadow-md">
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${isProd ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
          <span className="font-bold uppercase tracking-wider">
            {isProd ? "AMBIENTE DI PRODUZIONE (PROD)" : "AMBIENTE DI SVILUPPO / TEST (DEV)"}
          </span>
        </div>
        <div className="flex items-center gap-1.5 bg-slate-800 p-0.5 rounded-xl border border-slate-700">
          <button
            type="button"
            onClick={() => {
              setDbPermissionError(null);
              handleToggleEnvironment(true);
            }}
            className={`px-3 py-1 rounded-lg text-[10px] font-bold tracking-wider transition-all cursor-pointer ${
              isProd ? "bg-indigo-600 text-white shadow-xs" : "text-slate-400 hover:text-white"
            }`}
          >
            PROD
          </button>
          <button
            type="button"
            onClick={() => {
              setDbPermissionError(null);
              handleToggleEnvironment(false);
            }}
            className={`px-3 py-1 rounded-lg text-[10px] font-bold tracking-wider transition-all cursor-pointer ${
              !isProd ? "bg-amber-600 text-white shadow-xs" : "text-slate-400 hover:text-white"
            }`}
          >
            DEV
          </button>
        </div>
      </div>

      <div className="flex-grow flex items-center justify-center p-6 animate-fade-in">
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 max-w-xl w-full space-y-6 text-center">
          <div className="inline-flex p-4 bg-rose-50 text-rose-600 rounded-2xl mb-2">
            <ShieldAlert className="h-10 w-10 animate-pulse" />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Permessi Insufficienti (Accesso Negato)
            </h2>
            <p className="text-sm text-slate-500 leading-relaxed max-w-md mx-auto">
              L'applicazione è configurata per salvare i dati esclusivamente nei cloud ufficiali dell'Owner dell'ambiente per prevenire la dispersione di dati su archivi privati.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-5 text-left space-y-4">
            <div className="space-y-1.5">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Risorsa Richiesta</span>
              <span className="block font-mono text-[11px] bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-700 select-all break-all shadow-3xs">
                {dbPermissionError.resourceId}
              </span>
              <span className="text-[10px] font-medium text-slate-500 block">
                {dbPermissionError.type === "sheets" 
                  ? "📄 ID Foglio Google Sheets Ufficiale" 
                  : "📁 ID Cartella Root Google Drive Ufficiale"}
              </span>
            </div>

            <div className="border-t border-slate-200/60 pt-3 space-y-2">
              <h4 className="text-xs font-bold text-slate-800">Cosa fare per sbloccare l'accesso:</h4>
              <ol className="list-decimal pl-4 text-xs text-slate-600 space-y-1.5 leading-relaxed">
                <li>
                  Contatta l'<strong>Owner / Amministratore dell'hosting di questo ambiente</strong>.
                </li>
                <li>
                  Chiedi di condividere l'accesso in <strong>Scrittura / Modifica (Editor)</strong> per il tuo account Google (<span className="font-semibold text-slate-800">{user?.email}</span>) sulle seguenti risorse ufficiali:
                  <ul className="list-disc pl-4 mt-1 space-y-1 text-slate-500">
                    <li>Il file Google Sheet ufficiale: <code className="text-rose-600 bg-rose-50 px-1 py-0.5 rounded font-mono text-[10px]">d/{spreadsheetId}</code></li>
                    <li>Le cartelle Google Drive del progetto: <code className="text-rose-600 bg-rose-50 px-1 py-0.5 rounded font-mono text-[10px]">{isProd ? "19Zlvat9kyMK9fmfLRdobH8rA1gr5ALO7" : "1ul4JbUkg3pNcClpEDQNzgwFq_mJnsDtW"}</code></li>
                  </ul>
                </li>
                <li>
                  Assicurati che l'Owner ti dia i <strong>diritti di modifica delle cartelle</strong> per poter caricare le foto e modificare l'Excel ufficiale.
                </li>
                <li>
                  Una volta ricevuti i permessi dall'Owner, clicca sul pulsante qui sotto per ricaricare.
                </li>
              </ol>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setDbPermissionError(null);
                handleLoadDatabase();
              }}
              className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-colors shadow-md flex items-center justify-center space-x-2 cursor-pointer"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Riprova Sincronizzazione</span>
            </button>
            
            <button
              type="button"
              onClick={handleLogout}
              className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors border border-slate-200 cursor-pointer"
            >
              Disconnetti Account
            </button>
          </div>
        </div>
      </div>
      
      {/* Humble branding */}
      <div className="p-4 text-center text-[10px] text-slate-400 font-medium">
        SISTEMA GESTIONALE • Host Environment Protection Mode
      </div>
    </div>
  );
}
