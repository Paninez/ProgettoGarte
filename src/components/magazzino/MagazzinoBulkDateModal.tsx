import React, { useState } from "react";
import { OggettoMagazzino } from "../../types";
import { Calendar, Clock, Check, X, AlertCircle, RefreshCw, Sparkles, CheckSquare, Square } from "lucide-react";

interface MagazzinoBulkDateModalProps {
  selectedItems: OggettoMagazzino[];
  isOpen: boolean;
  onClose: () => void;
  onConfirmBulkUpdate: (
    updates: {
      id: string;
      dataArrivoPrevista?: string | null;
      dataSpedizionePresunta?: string | null;
    }[]
  ) => Promise<void>;
}

export const MagazzinoBulkDateModal: React.FC<MagazzinoBulkDateModalProps> = ({
  selectedItems,
  isOpen,
  onClose,
  onConfirmBulkUpdate,
}) => {
  const [updateArrivo, setUpdateArrivo] = useState(true);
  const [dataArrivoVal, setDataArrivoVal] = useState("");

  const [updateSpedizione, setUpdateSpedizione] = useState(true);
  const [dataSpedizioneVal, setDataSpedizioneVal] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || selectedItems.length === 0) return null;

  // Preset generators for Data Arrivo (ISO YYYY-MM-DD)
  const setArrivoDaysFromNow = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    setDataArrivoVal(d.toISOString().slice(0, 10));
    setUpdateArrivo(true);
  };

  // Preset values for Spedizione Presunta
  const getPresetSpedizione = (type: string): string => {
    const now = new Date();
    if (type === "Immediata") return "Immediata";
    if (type === "A breve") return "A breve";
    if (type === "Settimana Prox") {
      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      return nextWeek.toLocaleDateString("it-IT");
    }
    if (type === "Mese Prossimo") {
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 15);
      return nextMonth.toLocaleDateString("it-IT");
    }
    return "";
  };

  const handleApply = async () => {
    if (!updateArrivo && !updateSpedizione) {
      setError("Seleziona almeno una data da aggiornare.");
      return;
    }

    setError(null);
    setIsSaving(true);
    try {
      const updates = selectedItems.map((item) => {
        const payload: {
          id: string;
          dataArrivoPrevista?: string | null;
          dataSpedizionePresunta?: string | null;
        } = { id: item.ID_Oggetto };

        if (updateArrivo) {
          payload.dataArrivoPrevista = dataArrivoVal.trim();
        }
        if (updateSpedizione) {
          payload.dataSpedizionePresunta = dataSpedizioneVal.trim();
        }
        return payload;
      });

      await onConfirmBulkUpdate(updates);
      onClose();
    } catch (err: any) {
      console.error("Errore salvataggio bulk date:", err);
      setError(err?.message || "Errore durante l'aggiornamento massivo delle date.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-scale-in">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center space-x-2.5">
            <div className="h-9 w-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm sm:text-base">Modifica Date Massiva</h3>
              <p className="text-xs text-slate-500">
                Aggiorna le date per {selectedItems.length} {selectedItems.length === 1 ? "articolo selezionato" : "articoli selezionati"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 space-y-5 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Data di Arrivo Prevista */}
          <div className={`p-3.5 rounded-xl border transition-all ${updateArrivo ? "border-indigo-200 bg-indigo-50/20" : "border-slate-200 bg-slate-50/50 opacity-70"}`}>
            <div className="flex items-center justify-between mb-2">
              <label 
                className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer select-none"
                onClick={() => setUpdateArrivo(!updateArrivo)}
              >
                {updateArrivo ? (
                  <CheckSquare className="h-4 w-4 text-indigo-600 shrink-0" />
                ) : (
                  <Square className="h-4 w-4 text-slate-400 shrink-0" />
                )}
                <span>Data di Arrivo Prevista in Magazzino</span>
              </label>
              {dataArrivoVal && updateArrivo && (
                <button
                  type="button"
                  onClick={() => setDataArrivoVal("")}
                  className="text-[10px] text-rose-600 hover:text-rose-700 font-medium"
                >
                  Svuota / Rimuovi
                </button>
              )}
            </div>

            {updateArrivo && (
              <div className="space-y-2 mt-2">
                <div className="relative">
                  <input
                    type="date"
                    value={dataArrivoVal}
                    onChange={(e) => setDataArrivoVal(e.target.value)}
                    className="w-full pl-3 pr-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white text-slate-800"
                  />
                </div>
                <div className="flex flex-wrap gap-1">
                  <button
                    type="button"
                    onClick={() => setArrivoDaysFromNow(0)}
                    className="px-2 py-1 rounded text-[10px] font-medium bg-white hover:bg-indigo-50 text-slate-600 border border-slate-200"
                  >
                    Oggi
                  </button>
                  <button
                    type="button"
                    onClick={() => setArrivoDaysFromNow(7)}
                    className="px-2 py-1 rounded text-[10px] font-medium bg-white hover:bg-indigo-50 text-slate-600 border border-slate-200"
                  >
                    +7 giorni
                  </button>
                  <button
                    type="button"
                    onClick={() => setArrivoDaysFromNow(15)}
                    className="px-2 py-1 rounded text-[10px] font-medium bg-white hover:bg-indigo-50 text-slate-600 border border-slate-200"
                  >
                    +15 giorni
                  </button>
                  <button
                    type="button"
                    onClick={() => setArrivoDaysFromNow(30)}
                    className="px-2 py-1 rounded text-[10px] font-medium bg-white hover:bg-indigo-50 text-slate-600 border border-slate-200"
                  >
                    +30 giorni
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Data Spedizione Presunta / Disponibilità Cliente */}
          <div className={`p-3.5 rounded-xl border transition-all ${updateSpedizione ? "border-indigo-200 bg-indigo-50/20" : "border-slate-200 bg-slate-50/50 opacity-70"}`}>
            <div className="flex items-center justify-between mb-2">
              <label 
                className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer select-none"
                onClick={() => setUpdateSpedizione(!updateSpedizione)}
              >
                {updateSpedizione ? (
                  <CheckSquare className="h-4 w-4 text-indigo-600 shrink-0" />
                ) : (
                  <Square className="h-4 w-4 text-slate-400 shrink-0" />
                )}
                <span>Data di Disponibilità per la Spedizione al Cliente</span>
              </label>
              {dataSpedizioneVal && updateSpedizione && (
                <button
                  type="button"
                  onClick={() => setDataSpedizioneVal("")}
                  className="text-[10px] text-rose-600 hover:text-rose-700 font-medium"
                >
                  Svuota / Rimuovi
                </button>
              )}
            </div>

            {updateSpedizione && (
              <div className="space-y-2 mt-2">
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={dataSpedizioneVal}
                    onChange={(e) => setDataSpedizioneVal(e.target.value)}
                    placeholder="Es. Immediata, Fine Mese, 15/09..."
                    className="w-full pr-8 pl-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-slate-800 bg-white font-semibold"
                  />
                  <div className="absolute right-2 flex items-center">
                    <input
                      type="date"
                      onChange={(e) => {
                        if (e.target.value) {
                          const d = new Date(e.target.value);
                          setDataSpedizioneVal(d.toLocaleDateString("it-IT"));
                        }
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer w-6 h-6"
                    />
                    <button type="button" className="p-0.5 rounded text-indigo-600 hover:bg-indigo-50" title="Calendario">
                      <Calendar className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {["Immediata", "A breve", "Settimana Prox", "Mese Prossimo"].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setDataSpedizioneVal(getPresetSpedizione(preset));
                        setUpdateSpedizione(true);
                      }}
                      className={`px-2 py-1 rounded text-[10px] font-medium border transition-all ${
                        dataSpedizioneVal === getPresetSpedizione(preset)
                          ? "bg-indigo-600 text-white border-indigo-600 font-bold"
                          : "bg-white hover:bg-indigo-50 text-slate-600 border-slate-200"
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* List of Affected Items */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
              <span>Articoli che verranno aggiornati ({selectedItems.length})</span>
            </div>
            <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-slate-50/40 p-1">
              {selectedItems.map((item) => (
                <div key={item.ID_Oggetto} className="px-2.5 py-1.5 text-xs flex items-center justify-between gap-2">
                  <div className="truncate font-medium text-slate-700">{item.Nome}</div>
                  <div className="text-[10px] text-slate-400 shrink-0 font-mono">
                    {item.Data_Spedizione_Presunta || "Nessuna data"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/70 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            Annulla
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={isSaving}
            className="flex items-center space-x-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                <span>Salvataggio in corso...</span>
              </>
            ) : (
              <>
                <Check className="h-3.5 w-3.5" />
                <span>Applica a {selectedItems.length} articoli</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
