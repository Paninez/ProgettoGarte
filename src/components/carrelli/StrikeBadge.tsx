import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Flag, AlertTriangle, X, CheckCircle, Clock } from 'lucide-react';

interface StrikeBadgeProps {
  strikesCount: number;
  cattivoData: string;
  clientName: string;
  cartId: string;
  onUpdateStrikes?: (cartId: string, strike: number, cattivoData: string) => void | Promise<void>;
  readOnly?: boolean;
  showText?: boolean;
}

export const StrikeBadge: React.FC<StrikeBadgeProps> = ({
  strikesCount,
  cattivoData,
  clientName,
  cartId,
  onUpdateStrikes,
  readOnly = false,
  showText = true,
}) => {
  const [dialogState, setDialogState] = useState<{ isOpen: boolean; action: 'add' | 'remove' | null }>({ isOpen: false, action: null });
  const isCattivo = strikesCount >= 3 || !!cattivoData;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (readOnly || !onUpdateStrikes) return;

    if (isCattivo) {
      setDialogState({ isOpen: true, action: 'remove' });
      return;
    }
    setDialogState({ isOpen: true, action: 'add' });
  };

  const handleConfirm = () => {
    if (!onUpdateStrikes || !dialogState.action) return;

    if (dialogState.action === 'remove') {
      onUpdateStrikes(cartId, 0, "");
    } else if (dialogState.action === 'add') {
      const nextCount = strikesCount + 1;
      let newCattivoData = cattivoData || "";
      if (nextCount >= 3) {
        newCattivoData = new Date().toISOString();
      }
      onUpdateStrikes(cartId, nextCount, newCattivoData);
    }
    setDialogState({ isOpen: false, action: null });
  };

  const maxStrikes = 3;
  
  // Calculate dates if cattivo
  let startDateStr = "";
  let daysLeft = 0;
  let isExpired = false;
  
  if (isCattivo && cattivoData) {
    const d = new Date(cattivoData);
    let startDate = d;
    // Check if it's a legacy future date (+28 days)
    if (d.getTime() > Date.now() + 2 * 24 * 60 * 60 * 1000) {
      startDate = new Date(d.getTime() - 28 * 24 * 60 * 60 * 1000);
    }
    
    startDateStr = startDate.toLocaleDateString('it-IT');
    const now = new Date();
    const diffTime = now.getTime() - startDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    daysLeft = Math.max(0, 30 - diffDays);
    isExpired = diffDays >= 30;
  }

  return (
    <>
      {dialogState.isOpen && createPortal(
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/60 p-4"
          onClick={(e) => { e.stopPropagation(); setDialogState({ isOpen: false, action: null }); }}
        >
          <div 
            className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {dialogState.action === 'remove' ? (
              <>
                <div className="flex items-center space-x-3 text-emerald-600 mb-4">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 leading-tight">Gestione Stato Cattivo</h3>
                </div>
                
                <div className="mb-6 space-y-4">
                  <p className="text-sm text-slate-600">
                    Il cliente <span className="font-bold text-slate-900">{clientName}</span> è attualmente nello stato <strong>CATTIVO</strong>.
                  </p>
                  
                  {cattivoData && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500 font-medium">Data infrazione:</span>
                        <span className="font-bold text-slate-900">{startDateStr}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500 font-medium">Scadenza (30 gg):</span>
                        {isExpired ? (
                          <span className="font-bold text-emerald-600 flex items-center gap-1"><CheckCircle className="w-4 h-4"/> Terminato</span>
                        ) : (
                          <span className="font-bold text-amber-600 flex items-center gap-1"><Clock className="w-4 h-4"/> {daysLeft} gg rimasti</span>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <p className="text-sm text-slate-600">
                    Vuoi rimuovere lo stato e azzerare tutti i cartellini?
                  </p>
                </div>
                
                <div className="flex space-x-3">
                  <button
                    onClick={() => setDialogState({ isOpen: false, action: null })}
                    className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors"
                  >
                    Chiudi
                  </button>
                  <button
                    onClick={handleConfirm}
                    className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-sm transition-colors"
                  >
                    Rimuovi Stato
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center space-x-3 text-amber-600 mb-4">
                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                    {strikesCount + 1 >= 3 ? (
                      <AlertTriangle className="w-6 h-6 text-rose-600" />
                    ) : (
                      <Flag className="w-6 h-6 text-amber-600" />
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 leading-tight">
                    {strikesCount + 1 >= 3 ? "Cartellino Rosso" : "Cartellino Giallo"}
                  </h3>
                </div>
                <div className="text-sm text-slate-600 mb-6 space-y-3">
                  <p>
                    Stai per assegnare un nuovo cartellino a <span className="font-bold text-slate-900">{clientName}</span>.
                  </p>
                  {strikesCount + 1 >= 3 ? (
                    <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl font-medium">
                      ⚠️ ATTENZIONE: Questo è il 3° cartellino. Il cliente diventerà <strong>CATTIVO</strong> per i prossimi 30 giorni.
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-xl">
                      <span className="font-bold">Stato:</span>
                      <div className="flex gap-1">
                        {Array.from({ length: 3 }).map((_, i) => (
                          <div 
                            key={i} 
                            className={`w-3 h-4 rounded-sm border ${i <= strikesCount ? "bg-amber-400 border-amber-500" : "bg-slate-200 border-slate-300"}`}
                          />
                        ))}
                      </div>
                      <span className="text-xs font-bold opacity-80">({strikesCount + 1}/3)</span>
                    </div>
                  )}
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setDialogState({ isOpen: false, action: null })}
                    className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors"
                  >
                    Annulla
                  </button>
                  <button
                    onClick={handleConfirm}
                    className={`flex-1 px-4 py-2 text-white rounded-xl font-bold shadow-sm transition-colors ${
                      strikesCount + 1 >= 3 ? "bg-rose-600 hover:bg-rose-700" : "bg-amber-500 hover:bg-amber-600"
                    }`}
                  >
                    Conferma
                  </button>
                </div>
              </>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Existing Badge UI */}
      {isCattivo ? (
        <div
          onClick={handleClick}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full border border-rose-500/30 bg-gradient-to-r from-rose-500/10 to-rose-600/10 text-rose-700 shadow-[0_0_8px_rgba(225,29,72,0.2)] transition-all ${
            !readOnly ? "cursor-pointer hover:shadow-[0_0_12px_rgba(225,29,72,0.4)] hover:border-rose-500/50 active:scale-95" : ""
          } animate-pulse-slow`}
          title={`Cartellino Rosso (CATTIVO) - Iniziato il: ${startDateStr} (${isExpired ? 'Terminato' : daysLeft + ' gg rimasti'})${!readOnly ? '\nClicca per gestire' : ''}`}
        >
          <AlertTriangle className="w-3.5 h-3.5 fill-rose-600 text-rose-600 drop-shadow-[0_0_2px_rgba(225,29,72,0.5)]" />
          {showText && <span className="text-[11px] font-black tracking-wider uppercase drop-shadow-sm">Cattivo</span>}
          {!readOnly && (
             <div className="ml-1 opacity-60 hover:opacity-100 bg-rose-200/50 rounded-full p-0.5">
               <X className="w-3 h-3" />
             </div>
          )}
        </div>
      ) : (
        (!readOnly || strikesCount > 0) && (
          <div 
            onClick={handleClick}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg border transition-all ${
              strikesCount > 0 
                ? "border-amber-200 bg-amber-50" 
                : "border-slate-200 bg-white"
            } ${!readOnly ? "cursor-pointer hover:border-amber-300 hover:bg-amber-100 active:scale-95 shadow-sm" : ""}`}
            title={!readOnly ? `Aggiungi cartellino giallo (${strikesCount}/3)` : `${strikesCount} Cartellini gialli`}
          >
            <div className="flex gap-0.5">
              {Array.from({ length: maxStrikes }).map((_, i) => (
                <div 
                  key={i} 
                  className={`w-2.5 h-3.5 rounded-[2px] border ${
                    i < strikesCount 
                      ? "bg-amber-400 border-amber-500 shadow-[0_1px_2px_rgba(251,191,36,0.4)]" 
                      : "bg-slate-100 border-slate-300"
                  } transition-colors`}
                />
              ))}
            </div>
            {showText && strikesCount > 0 && (
              <span className="text-[10px] font-bold text-amber-700 ml-1">
                {strikesCount}/3
              </span>
            )}
            {!readOnly && strikesCount === 0 && showText && (
              <span className="text-[10px] font-bold text-slate-500 ml-1">
                + Cartellino
              </span>
            )}
          </div>
        )
      )}
    </>
  );
};
