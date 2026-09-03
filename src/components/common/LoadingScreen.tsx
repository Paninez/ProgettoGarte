import React, { useState, useEffect } from "react";
import { Layers, RefreshCw, LogOut } from "lucide-react";
import { clearSession } from "../../lib/firebase";

interface LoadingScreenProps {
  onCancel?: () => void;
  timeoutMs?: number;
}

export function LoadingScreen({ onCancel, timeoutMs = 8000 }: LoadingScreenProps) {
  const [showRescue, setShowRescue] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowRescue(true);
    }, timeoutMs);
    return () => clearTimeout(timer);
  }, [timeoutMs]);

  const handleReset = () => {
    clearSession();
    window.location.reload();
  };

  return (
    <div className="min-h-[100dvh] bg-slate-50 flex flex-col items-center justify-center p-6 text-center font-sans text-slate-800">
      <div className="space-y-5 max-w-sm w-full bg-white p-8 rounded-3xl shadow-lg border border-slate-100 animate-fade-in">
        <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl mx-auto flex items-center justify-center shadow-inner">
          <Layers className="h-8 w-8 animate-bounce" />
        </div>

        <div className="space-y-1.5">
          <h2 className="text-lg font-bold text-slate-900">Autenticazione in corso...</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Inizializzazione ambiente e verifica delle credenziali Google.
          </p>
        </div>

        {showRescue && (
          <div className="pt-4 border-t border-slate-100 space-y-2.5 animate-fade-in">
            <p className="text-[11px] text-amber-700 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
              L'autenticazione sta richiedendo più tempo del previsto. Se hai chiuso la finestra di login su cellulare, puoi riprovare.
            </p>
            <div className="flex gap-2">
              {onCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  className="flex-1 py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Torna al Login</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleReset}
                className="flex-1 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors border border-slate-200 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Ricarica</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
