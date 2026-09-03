import React from "react";
import { CheckCircle, ShieldAlert } from "lucide-react";
import { ListinoGradingItem } from "../../types";

interface GradingPriceListProps {
  userRole?: string;
  isEditingListino: boolean;
  setIsEditingListino: (val: boolean) => void;
  startEditingListino: () => void;
  localListino: ListinoGradingItem[];
  setLocalListino: React.Dispatch<React.SetStateAction<ListinoGradingItem[]>>;
  listinoGrading: ListinoGradingItem[];
  handleSavePriceList: () => Promise<void>;
  listinoSaveLoading: boolean;
}

export function GradingPriceList({
  userRole,
  isEditingListino,
  setIsEditingListino,
  startEditingListino,
  localListino,
  setLocalListino,
  listinoGrading,
  handleSavePriceList,
  listinoSaveLoading,
}: GradingPriceListProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-3xs space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-slate-800 text-base">Listino Costi e Servizi di Gradazione</h3>
          <p className="text-xs text-slate-400 font-medium">Configura i prezzi addebitati al cliente e i costi effettivi di spedizione/acquisto per calcolare i margini</p>
        </div>

        {userRole === "utente" ? (
          <div className="flex items-center gap-1 text-[11px] font-bold text-slate-400 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-150">
            <ShieldAlert className="h-4 w-4 text-amber-500 shrink-0" />
            <span>Sola lettura (Moderatore/Owner per modificare)</span>
          </div>
        ) : (
          <div>
            {!isEditingListino ? (
              <button
                onClick={startEditingListino}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-2xs cursor-pointer transition-all active:scale-95"
              >
                Modifica Listino
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsEditingListino(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-all"
                >
                  Annulla
                </button>
                <button
                  onClick={handleSavePriceList}
                  disabled={listinoSaveLoading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-2xs cursor-pointer transition-all active:scale-95 flex items-center gap-1.5"
                >
                  <CheckCircle className="h-4 w-4" />
                  <span>{listinoSaveLoading ? "Salvataggio..." : "Salva Listino"}</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Listino Table */}
      <div className="border border-slate-150 rounded-xl overflow-x-auto scrollbar-thin">
        <table className="w-full min-w-[650px] text-left">
          <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-150">
            <tr>
              <th className="px-6 py-3.5">Tipologia Servizio</th>
              <th className="px-6 py-3.5 text-right">Costo al Cliente (€)</th>
              <th className="px-6 py-3.5 text-right">Costo di Acquisto per Noi (€)</th>
              <th className="px-6 py-3.5 text-right">Margine Lordo (€)</th>
            </tr>
          </thead>
          <tbody className="text-xs divide-y divide-slate-100 text-slate-700">
            {(isEditingListino ? localListino : listinoGrading).map((item, idx) => {
              const calculatedMargin = item.Costo_Cliente - item.Costo_Acquisto;
              return (
                <tr key={item.Tipologia_Servizio} className="hover:bg-slate-50/50">
                  <td className="px-6 py-4 font-bold text-slate-800">{item.Tipologia_Servizio}</td>
                  <td className="px-6 py-4 text-right font-mono">
                    {isEditingListino ? (
                      <div className="inline-flex items-center space-x-1.5">
                        <span className="text-slate-400">€</span>
                        <input
                          type="number"
                          step="0.01"
                          value={item.Costo_Cliente}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            const updated = [...localListino];
                            updated[idx].Costo_Cliente = val;
                            setLocalListino(updated);
                          }}
                          className="w-24 px-2 py-1 border border-slate-300 rounded text-right bg-white text-slate-900 font-mono text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>
                    ) : (
                      <span className="font-semibold text-slate-800">€ {item.Costo_Cliente.toFixed(2)}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right font-mono">
                    {isEditingListino ? (
                      <div className="inline-flex items-center space-x-1.5">
                        <span className="text-slate-400">€</span>
                        <input
                          type="number"
                          step="0.01"
                          value={item.Costo_Acquisto}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            const updated = [...localListino];
                            updated[idx].Costo_Acquisto = val;
                            setLocalListino(updated);
                          }}
                          className="w-24 px-2 py-1 border border-slate-300 rounded text-right bg-white text-slate-900 font-mono text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>
                    ) : (
                      <span className="font-semibold text-slate-500">€ {item.Costo_Acquisto.toFixed(2)}</span>
                    )}
                  </td>
                  <td
                    className={`px-6 py-4 text-right font-extrabold font-mono ${
                      calculatedMargin > 0
                        ? "text-emerald-600"
                        : calculatedMargin === 0
                        ? "text-slate-500 bg-slate-50"
                        : "text-rose-600"
                    }`}
                  >
                    € {calculatedMargin.toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
