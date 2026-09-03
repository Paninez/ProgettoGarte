import React, { useState } from "react";
import { OggettoMagazzino } from "../../types";
import { X, Banknote } from "lucide-react";

interface MagazzinoSettlePreorderModalProps {
  item: OggettoMagazzino;
  allocatedCount: number;
  onClose: () => void;
  onConfirm: (item: OggettoMagazzino, costoUnitario: number, quantitaAcquistata: number, costoSpedizione: number, costoDogana: number, altroCosto: number) => Promise<void>;
}

export const MagazzinoSettlePreorderModal: React.FC<MagazzinoSettlePreorderModalProps> = ({
  item,
  allocatedCount,
  onClose,
  onConfirm,
}) => {
  const [costoUnitario, setCostoUnitario] = useState<number>(item.Costo_Acquisto || 0);
  const [quantitaAcquistata, setQuantitaAcquistata] = useState<number>(allocatedCount > 0 ? allocatedCount : item.Quantità_Disponibile);
  const [costoSpedizione, setCostoSpedizione] = useState<number>(0);
  const [costoDogana, setCostoDogana] = useState<number>(0);
  const [altroCosto, setAltroCosto] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (costoUnitario < 0 || quantitaAcquistata <= 0 || costoSpedizione < 0 || costoDogana < 0 || altroCosto < 0) {
      if (quantitaAcquistata <= 0) {
        alert("La quantità acquistata deve essere maggiore di 0.");
      } else {
        alert("I valori non possono essere negativi.");
      }
      return;
    }
    
    setLoading(true);
    try {
      await onConfirm(item, costoUnitario, quantitaAcquistata, costoSpedizione, costoDogana, altroCosto);
      onClose();
    } catch (error: any) {
      alert("Errore durante il saldo: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col animate-scale-up">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg">
              <Banknote className="w-5 h-5" />
            </div>
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              Acquista Preordine Definitivo
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-6">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs text-slate-600">
            <p><strong>Articolo:</strong> {item.Nome}</p>
            <p><strong>Prezzo di Vendita (assegnato ai clienti):</strong> €{item.Prezzo_Vendita.toFixed(2)}</p>
            <p className="mt-1 pt-1 border-t border-slate-200 text-indigo-700"><strong>Quantità attualmente allocata ai clienti:</strong> {allocatedCount} pz</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Quantità Totale Acquistata
            </label>
            <input
              type="number"
              step="1"
              min="0"
              required
              value={quantitaAcquistata}
              onChange={(e) => setQuantitaAcquistata(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-900 font-mono font-semibold"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Inserisci la quantità effettiva che hai confermato dal fornitore.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Costo di Acquisto Unitario (€)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              required
              value={costoUnitario}
              onChange={(e) => setCostoUnitario(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-900 font-mono font-semibold"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Spedizione (€)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={costoSpedizione}
                onChange={(e) => setCostoSpedizione(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-900 font-mono font-semibold"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Dogana (€)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={costoDogana}
                onChange={(e) => setCostoDogana(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-900 font-mono font-semibold"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Altro (€)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={altroCosto}
                onChange={(e) => setAltroCosto(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-900 font-mono font-semibold"
              />
            </div>
          </div>

          <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100">
            <p className="text-[11px] font-bold text-emerald-800 text-center">
              Spesa Totale: €{((costoUnitario * quantitaAcquistata) + costoSpedizione + costoDogana + altroCosto).toFixed(2)}
            </p>
          </div>

          <div className="flex justify-end pt-2 gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-colors cursor-pointer"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-[10px] uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
            >
              {loading ? "Elaborazione..." : "Conferma Acquisto"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
