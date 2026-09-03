import React, { useState } from "react";
import { OggettoMagazzino } from "../../types";
import { X, PackagePlus } from "lucide-react";

interface MagazzinoRestockModalProps {
  item: OggettoMagazzino;
  onClose: () => void;
  onRestock: (itemId: string, addedQty: number, newCostPerUnit: number, breakdown?: any) => Promise<void>;
}

export const MagazzinoRestockModal: React.FC<MagazzinoRestockModalProps> = ({ item, onClose, onRestock }) => {
  const [addedQty, setAddedQty] = useState<number>(0);
  const [newCost, setNewCost] = useState<number>(item.Costo_Acquisto || 0);
  const [costType, setCostType] = useState<"unitario" | "lotto" | "breakdown">("unitario");
  const [loading, setLoading] = useState(false);
  const [nomeLotto, setNomeLotto] = useState(new Date().toLocaleDateString("it-IT", { month: "short", year: "numeric", day: "numeric" }) + " (Restock)");
  const [costoSpedizione, setCostoSpedizione] = useState(0);
  const [costoTasse, setCostoTasse] = useState(0);
  const [altriCosti, setAltriCosti] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (addedQty <= 0) {
      alert("La quantità deve essere maggiore di 0");
      return;
    }
    if (newCost < 0) {
      alert("Il costo non può essere negativo");
      return;
    }
    setLoading(true);
    try {
      
      let unitCost = newCost;
      let breakdownData = null;
      
      if (costType === "lotto" && addedQty > 0) {
        unitCost = newCost / addedQty;
      } else if (costType === "breakdown" && addedQty > 0) {
        const total = newCost + costoSpedizione + costoTasse + altriCosti;
        unitCost = total / addedQty;
        breakdownData = {
          lotto: nomeLotto,
          qty: addedQty,
          costoSpedizione: costoSpedizione,
          costoTasse: costoTasse,
          altriCosti: altriCosti,
          costoOggetto: newCost,
          costoUnitario: unitCost,
          date: new Date().toISOString()
        };
      } else if (costType === "breakdown" && addedQty === 0) {
        unitCost = 0;
      }

      // se non usiamo breakdown nel costType, lo aggiungiamo comunque come single
      if (!breakdownData) {
        breakdownData = {
          lotto: nomeLotto,
          qty: addedQty,
          costoSpedizione: 0,
          costoTasse: 0,
          altriCosti: 0,
          costoOggetto: costType === "lotto" ? newCost : newCost * addedQty,
          costoUnitario: unitCost,
          date: new Date().toISOString()
        };
      }

      await onRestock(item.ID_Oggetto, addedQty, unitCost, breakdownData);
      onClose();
    } catch (err: any) {
      alert("Errore durante il rifornimento: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const oldQty = item.Quantità_Disponibile || 0;
  const oldCost = item.Costo_Acquisto || 0;
  const unitCostToUse = (costType === "lotto" && addedQty > 0) ? newCost / addedQty : (costType === "breakdown" && addedQty > 0) ? (newCost + costoSpedizione + costoTasse + altriCosti) / addedQty : newCost;
  const newAvgCost = (addedQty > 0) ? ((oldQty * oldCost) + (addedQty * unitCostToUse)) / (oldQty + addedQty) : oldCost;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600">
              <PackagePlus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Rifornisci Articolo</h2>
              <p className="text-xs text-slate-500 font-medium">Aggiungi scorte a magazzino</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 mb-4">
            <div className="text-sm font-bold text-slate-900">{item.Nome}</div>
            <div className="text-xs text-slate-500 mt-1">
              Scorta attuale: {oldQty} pz a €{oldCost.toFixed(2)} /pz
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Quantità da Aggiungere
              </label>
              <input
                type="number"
                min="1"
                step="1"
                required
                value={addedQty || ""}
                onChange={(e) => setAddedQty(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  {costType === "unitario" ? "Nuovo Costo Unit. (€)" : "Costo Totale Merce (€)"}
                </label>
                <select 
                  value={costType} 
                  onChange={(e) => setCostType(e.target.value as "unitario" | "lotto" | "breakdown")}
                  className="text-[9px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded px-1 py-0.5 outline-none cursor-pointer"
                >
                  <option value="unitario">Unitario</option>
                  <option value="lotto">Totale Lotto</option>
                  <option value="breakdown">Break-down Avanzato</option>
                </select>
              </div>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={newCost === 0 ? "" : newCost}
                onChange={(e) => setNewCost(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>
          </div>

          {costType === "breakdown" && (
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-3">
              <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Breakdown Costi (Totali per il lotto)</div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Nome Lotto / Riferimento
                  </label>
                  <input
                    type="text"
                    value={nomeLotto}
                    onChange={(e) => setNomeLotto(e.target.value)}
                    className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Costo Spedizione (€)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={costoSpedizione === 0 ? "" : costoSpedizione}
                    onChange={(e) => setCostoSpedizione(Number(e.target.value))}
                    className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Tasse / Dogana (€)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={costoTasse === 0 ? "" : costoTasse}
                    onChange={(e) => setCostoTasse(Number(e.target.value))}
                    className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Altri Costi (€)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={altriCosti === 0 ? "" : altriCosti}
                    onChange={(e) => setAltriCosti(Number(e.target.value))}
                    className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>
          )}

          {addedQty > 0 && (
            <div className="bg-indigo-50 text-indigo-800 p-3 rounded-xl text-xs space-y-1">
              <div className="flex justify-between">
                <span>Costo totale rifornimento:</span>
                <span className="font-bold">€{(costType === "lotto" ? newCost : costType === "breakdown" ? newCost + costoSpedizione + costoTasse + altriCosti : addedQty * newCost).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Nuova giacenza:</span>
                <span className="font-bold">{oldQty + addedQty} pz</span>
              </div>
              <div className="flex justify-between">
                <span>Nuovo costo medio ponderato:</span>
                <span className="font-bold">€{newAvgCost.toFixed(2)} /pz</span>
              </div>
            </div>
          )}

          <div className="pt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={loading || addedQty <= 0}
              className={`px-4 py-2 text-sm font-bold text-white rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
                loading || addedQty <= 0 ? "bg-slate-300 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700 active:scale-95"
              }`}
            >
              {loading ? "Salvataggio..." : "Conferma Rifornimento"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
