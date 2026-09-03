import React from "react";
import { Info, X, Plus } from "lucide-react";
import { GradingItem, GradingGroup, Carrello } from "../../types";
import { getDirectImageUrl } from "./carrelliUtils";

interface GradingStatusModalProps {
  viewedGradingStatusId: string | null;
  setViewedGradingStatusId: (id: string | null) => void;
  activeGradingItems: GradingItem[];
  gruppiGrading: GradingGroup[];
  isEditable: boolean;
  carrelli: Carrello[];
  onUpdateCard?: (id: string, updates: Partial<GradingItem>) => Promise<void>;
  onUploadPhoto?: (file: File, context: string, customName?: string, subFolderName?: string) => Promise<string>;
}

export function GradingStatusModal({
  viewedGradingStatusId,
  setViewedGradingStatusId,
  activeGradingItems,
  gruppiGrading,
  isEditable,
  carrelli,
  onUpdateCard,
  onUploadPhoto,
}: GradingStatusModalProps) {
  if (!viewedGradingStatusId) return null;

  const item = activeGradingItems.find((g) => g.ID_Oggetto_Grading === viewedGradingStatusId);
  if (!item) return null;

  const group = item.ID_Gruppo_Grading
    ? gruppiGrading.find((grp) => grp.ID_Gruppo_Grading === item.ID_Gruppo_Grading)
    : null;
  const isGroupReturnedOrClosed = group && (group.Stato_Gruppo === "Ritornato" || group.Stato_Gruppo === "Chiuso");

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col border border-slate-200">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg">
              <Info className="h-4 w-4" />
            </div>
            <h3 className="font-extrabold text-slate-800 text-sm">Stato Grading</h3>
          </div>
          <button
            type="button"
            onClick={() => setViewedGradingStatusId(null)}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-full transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto max-h-[70vh] space-y-6 text-sm">
          <div className="space-y-4">
            <div>
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Livello Servizio</h4>
              <span className="font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100/50 px-2.5 py-1 rounded-lg text-[11px] uppercase font-bold inline-block">
                {item.Tipologia_Servizio}
              </span>
            </div>

            <div>
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Lotto / Stato</h4>
              {group ? (
                <div className="space-y-1">
                  <span className="font-semibold text-slate-700 block">{group.Nome_Gruppo}</span>
                  <span
                    className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded-md border ${
                      group.Stato_Gruppo === "In Preparazione"
                        ? "bg-amber-50 text-amber-700 border-amber-100"
                        : group.Stato_Gruppo === "Spedito"
                        ? "bg-indigo-50 text-indigo-700 border-indigo-100"
                        : group.Stato_Gruppo === "Ritornato"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                        : "bg-slate-100 text-slate-600 border-slate-200"
                    }`}
                  >
                    {group.Stato_Gruppo}
                  </span>
                </div>
              ) : (
                <span className="text-amber-600 font-medium italic text-xs">Non ancora associata a un lotto</span>
              )}
            </div>

            <div>
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Foto Risultato Grading</h4>
              <div className="flex flex-col items-start gap-2">
                {item.Link_Foto_Ritornata ? (
                  <div className="flex items-center gap-3">
                    <a
                      href={item.Link_Foto_Ritornata}
                      target="_blank"
                      rel="noreferrer"
                      className="block w-16 h-16 border border-slate-200 rounded-lg overflow-hidden shadow-3xs hover:scale-105 transition-all"
                    >
                      <img
                        src={getDirectImageUrl(item.Link_Foto_Ritornata)}
                        alt="Ritornata"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </a>
                    {isEditable && (
                      <button
                        type="button"
                        onClick={async () => {
                          await onUpdateCard?.(item.ID_Oggetto_Grading, { Link_Foto_Ritornata: "" });
                        }}
                        className="text-rose-500 hover:text-rose-700 text-xs font-bold cursor-pointer"
                      >
                        Rimuovi
                      </button>
                    )}
                  </div>
                ) : isGroupReturnedOrClosed ? (
                  isEditable ? (
                    <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition-all border border-indigo-100">
                      <Plus className="h-3.5 w-3.5" />
                      <span>Carica Foto</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file || !onUploadPhoto || !onUpdateCard) return;
                          try {
                            const customName = `${item.Nome_Carta}-Ritorno-${item.ID_Carrello}`;
                            const cartObj = carrelli.find((c) => c.ID_Carrello === item.ID_Carrello);
                            const subFolderName = cartObj
                              ? `${cartObj.Nome_Cliente}-${cartObj.ID_Carrello}`
                              : `Carrello-${item.ID_Carrello}`;
                            const url = await onUploadPhoto(file, "ritornoSpedizioneId", customName, subFolderName);
                            await onUpdateCard(item.ID_Oggetto_Grading, { Link_Foto_Ritornata: url });
                          } catch (err: any) {
                            alert("Errore caricamento foto: " + err.message);
                          }
                        }}
                      />
                    </label>
                  ) : (
                    <span className="text-slate-400 italic">Nessuna foto</span>
                  )
                ) : (
                  <span className="text-slate-500 text-xs bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                    Attendi Ritorno Lotto
                  </span>
                )}
              </div>
            </div>

            <div>
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Prezzo Servizio</h4>
              <span className="font-semibold font-mono text-slate-800 text-base">€ {item.Costo_Cliente.toFixed(2)}</span>
            </div>
          </div>
        </div>
        <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button
            type="button"
            onClick={() => setViewedGradingStatusId(null)}
            className="px-4 py-2 bg-white text-slate-700 border border-slate-300 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-50 transition-colors shadow-xs cursor-pointer"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
}
