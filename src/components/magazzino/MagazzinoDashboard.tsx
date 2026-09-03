import React, { useMemo } from "react";
import { OggettoMagazzino } from "../../types";
import { Package, TrendingUp, AlertTriangle, Box, Clock } from "lucide-react";

interface MagazzinoDashboardProps {
  items: OggettoMagazzino[];
  allocatedCounts: Record<string, number>;
}

export const MagazzinoDashboard: React.FC<MagazzinoDashboardProps> = ({ items, allocatedCounts }) => {
  const stats = useMemo(() => {
    let totalItems = 0;
    let totalValue = 0;
    let lowStockCount = 0;
    let preordersCount = 0;
    let outOfStockCount = 0;

    items.forEach(item => {
      const allocated = allocatedCounts[item.ID_Oggetto] || 0;
      const available = (item.Quantità_Disponibile || 0) - allocated;
      
      if (item.Is_Preordine) {
        preordersCount++;
        // Solo il valore di acconto per preordini o il totale per preordini?
        totalValue += (item.Acconto_Pagato || 0);
      } else {
        if (available > 0) {
          totalItems += available;
          totalValue += (item.Costo_Acquisto || 0) * available;
        } else if (available <= 0) {
          outOfStockCount++;
        }
        
        if (available > 0 && available <= 3 && !(item.Is_Carta_Singola || item.Nome.includes("[Carta Singola]"))) {
          lowStockCount++;
        }
      }
    });

    return { totalItems, totalValue, lowStockCount, preordersCount, outOfStockCount };
  }, [items, allocatedCounts]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Prodotti Disponibili</h3>
            <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
              <Package className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-900">{stats.totalItems}</div>
          <p className="text-xs text-slate-400 font-medium mt-1">Unità fisiche a magazzino</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Valore Magazzino</h3>
            <div className="h-8 w-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-900">€{stats.totalValue.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</div>
          <p className="text-xs text-slate-400 font-medium mt-1">Basato sui costi di acquisto</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Scorte in Esaurimento</h3>
            <div className="h-8 w-8 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-900">{stats.lowStockCount}</div>
          <p className="text-xs text-slate-400 font-medium mt-1">Sotto le 3 unità</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Preordini Attivi</h3>
            <div className="h-8 w-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-900">{stats.preordersCount}</div>
          <p className="text-xs text-slate-400 font-medium mt-1">In attesa o saldati</p>
        </div>
      </div>
    </div>
  );
};
