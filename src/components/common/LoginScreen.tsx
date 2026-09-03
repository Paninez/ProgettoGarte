import React, { useState, useEffect } from "react";
import {
  Layers,
  ShieldCheck,
  ShieldAlert,
  Lock,
  User as UserIcon,
  ExternalLink,
  Loader2,
  RefreshCw,
  AlertCircle,
  Smartphone,
  Info,
  XCircle,
} from "lucide-react";

interface LoginScreenProps {
  isProd: boolean;
  handleToggleEnvironment: (prod: boolean) => void;
  setLoginError: (error: string | null) => void;
  handleLogin: () => void;
  loginError: string | null;
  isLoggingIn?: boolean;
  onCancelLogin?: () => void;
}

export function LoginScreen({
  isProd,
  handleToggleEnvironment,
  setLoginError,
  handleLogin,
  loginError,
  isLoggingIn = false,
  onCancelLogin,
}: LoginScreenProps) {
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [isInIframe, setIsInIframe] = useState(false);
  const [pendingTimer, setPendingTimer] = useState(0);
  const [showSlowWarning, setShowSlowWarning] = useState(false);

  // Check mobile & iframe context
  useEffect(() => {
    try {
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent || "");
      setIsMobileDevice(isMobile);
      setIsInIframe(window.self !== window.top);
    } catch {
      // safe fallback
    }
  }, []);

  // Track pending login duration to provide rescue options if popup is hidden/blocked
  useEffect(() => {
    let interval: any = null;
    if (isLoggingIn) {
      setPendingTimer(0);
      setShowSlowWarning(false);
      interval = setInterval(() => {
        setPendingTimer((prev) => {
          const next = prev + 1;
          if (next >= 6) {
            setShowSlowWarning(true);
          }
          return next;
        });
      }, 1000);
    } else {
      setPendingTimer(0);
      setShowSlowWarning(false);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isLoggingIn]);

  const handleOpenNewTab = () => {
    try {
      window.open(window.location.href, "_blank", "noopener,noreferrer");
    } catch (e) {
      window.location.href = window.location.href;
    }
  };

  return (
    <div className="min-h-screen min-h-[100dvh] bg-slate-50 flex flex-col items-center justify-center p-4 sm:p-6 text-slate-800 antialiased selection:bg-indigo-500 selection:text-white">
      <div
        id="login-card"
        className="bg-white p-6 sm:p-10 rounded-3xl shadow-xl border border-slate-100 max-w-md w-full text-center space-y-6 sm:space-y-7 animate-fade-in"
      >
        {/* Header section */}
        <div className="space-y-3">
          <div className="p-3.5 sm:p-4 bg-indigo-50 text-indigo-600 rounded-2xl inline-block shadow-sm ring-1 ring-indigo-500/10">
            <Layers className="h-9 w-9 sm:h-10 sm:w-10" />
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">
            Gestionale Spedizioni
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-xs mx-auto leading-relaxed">
            Gestione integrata per inventario, magazzino, ordini e grading.
          </p>
        </div>

        {/* Environment Selector */}
        <div className="space-y-2 text-left">
          <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block pl-1">
            Seleziona Ambiente
          </span>
          <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
            <button
              type="button"
              disabled={isLoggingIn}
              onClick={() => {
                handleToggleEnvironment(true);
                setLoginError(null);
              }}
              className={`py-2.5 sm:py-3 px-3 sm:px-4 rounded-xl text-xs font-bold tracking-wide transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
                isProd
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/15"
                  : "text-slate-600 hover:text-slate-900"
              } ${isLoggingIn ? "opacity-60 cursor-not-allowed" : ""}`}
            >
              <ShieldCheck className="h-4 w-4 shrink-0" />
              <span className="truncate">PROD</span>
            </button>
            <button
              type="button"
              disabled={isLoggingIn}
              onClick={() => {
                handleToggleEnvironment(false);
                setLoginError(null);
              }}
              className={`py-2.5 sm:py-3 px-3 sm:px-4 rounded-xl text-xs font-bold tracking-wide transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
                !isProd
                  ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/15"
                  : "text-slate-600 hover:text-slate-900"
              } ${isLoggingIn ? "opacity-60 cursor-not-allowed" : ""}`}
            >
              <ShieldAlert className="h-4 w-4 shrink-0" />
              <span className="truncate">DEV</span>
            </button>
          </div>

          {!isProd && (
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 text-[11px] rounded-xl leading-relaxed flex gap-2 items-start animate-fade-in">
              <Lock className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                Accesso limitato all'<strong>owner del progetto</strong>.
              </span>
            </div>
          )}
        </div>

        {/* Primary Login Area */}
        <div className="space-y-3 pt-1">
          {/* Main Action Button */}
          <button
            type="button"
            onClick={handleLogin}
            disabled={isLoggingIn}
            className={`w-full inline-flex items-center justify-center space-x-2.5 px-5 py-4 sm:py-4.5 text-white rounded-2xl font-bold text-sm sm:text-base transition-all shadow-lg hover:shadow-xl cursor-pointer ${
              isProd
                ? "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20 active:bg-indigo-800"
                : "bg-amber-600 hover:bg-amber-700 shadow-amber-600/20 active:bg-amber-800"
            } ${
              isLoggingIn
                ? "opacity-90 cursor-wait pointer-events-none"
                : "transform hover:-translate-y-0.5 active:translate-y-0"
            }`}
          >
            {isLoggingIn ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Autenticazione in corso ({pendingTimer}s)...</span>
              </>
            ) : (
              <>
                <UserIcon className="h-5 w-5" />
                <span>Accedi con Google</span>
              </>
            )}
          </button>

          {/* Active Logging In Cancel / Rescue Box */}
          {isLoggingIn && (
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-left space-y-2.5 animate-fade-in">
              <div className="flex items-center justify-between text-xs text-slate-700 font-medium">
                <span className="flex items-center gap-1.5">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin text-indigo-600" />
                  In attesa della finestra di login Google...
                </span>
                {onCancelLogin && (
                  <button
                    type="button"
                    onClick={onCancelLogin}
                    className="text-[11px] font-bold text-rose-600 hover:text-rose-700 px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 transition-colors cursor-pointer"
                  >
                    Annulla
                  </button>
                )}
              </div>

              {showSlowWarning && (
                <div className="pt-2 border-t border-slate-200 space-y-2 animate-fade-in">
                  <p className="text-[11px] text-amber-800 leading-snug">
                    Se il popup non è visibile, il browser mobile potrebbe averlo bloccato o minimizzato in un'altra scheda.
                  </p>
                  <button
                    type="button"
                    onClick={handleOpenNewTab}
                    className="w-full py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                  >
                    <ExternalLink className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Apri l'app in Nuova Scheda ↗</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Target Environment Indicator */}
          <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400 font-medium pt-0.5">
            <span>Accesso in:</span>
            <span
              className={`uppercase font-bold px-2 py-0.5 rounded text-[10px] ${
                isProd ? "bg-indigo-50 text-indigo-700" : "bg-amber-50 text-amber-900"
              }`}
            >
              {isProd ? "Produzione (PROD)" : "Sviluppo (DEV)"}
            </span>
          </div>

          {/* Direct Open in New Tab Helper */}
          {(isInIframe || isMobileDevice) && !isLoggingIn && (
            <div className="pt-2">
              <button
                type="button"
                onClick={handleOpenNewTab}
                className="w-full inline-flex items-center justify-center space-x-2 py-2.5 px-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-all shadow-md text-xs cursor-pointer border border-slate-700 active:scale-[0.99]"
              >
                <ExternalLink className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span>Apri in Nuova Scheda del Browser ↗</span>
              </button>
              <p className="text-[10px] text-slate-400 mt-1.5 flex items-center justify-center gap-1">
                <Smartphone className="h-3 w-3 text-slate-400" />
                Consigliato su smartphone per evitare blocchi popup
              </p>
            </div>
          )}
        </div>

        {/* Error Banner */}
        {loginError && !isLoggingIn && (
          <div className="p-4 sm:p-5 bg-rose-50 border border-rose-200 text-rose-900 text-xs sm:text-sm rounded-2xl font-medium flex flex-col gap-3 animate-fade-in shadow-sm text-left">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="h-5 w-5 shrink-0 text-rose-600 mt-0.5" />
              <div className="space-y-1">
                <strong className="text-rose-950 font-bold block">Attenzione:</strong>
                <p className="text-xs text-rose-800 leading-relaxed">{loginError}</p>
              </div>
            </div>

            <div className="pt-2 border-t border-rose-200/60 flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={handleLogin}
                className="flex-1 py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Riprova Login</span>
              </button>
              <button
                type="button"
                onClick={handleOpenNewTab}
                className="flex-1 py-2 px-3 bg-white hover:bg-slate-50 text-slate-800 font-bold rounded-xl text-xs transition-colors border border-rose-300 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ExternalLink className="h-3.5 w-3.5 text-slate-600" />
                <span>Apri Nuova Scheda</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
