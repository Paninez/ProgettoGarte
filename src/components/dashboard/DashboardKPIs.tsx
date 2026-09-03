import React from "react";
import {
  ShoppingCart,
  Users,
  Receipt,
  Wallet,
  PackageSearch,
  BarChart3,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { DashboardStats, formatCurrency } from "./dashboardUtils";

interface DashboardKPIsProps {
  stats: DashboardStats;
  onNavigate: (tab: string) => void;
}

export function DashboardKPIs({ stats, onNavigate }: DashboardKPIsProps) {
  return (
    <div className="space-y-6">
      {/* Cart Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col justify-between hover:border-indigo-300 transition-colors cursor-pointer group"
          onClick={() => onNavigate("carrelli")}
        >
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Carrelli Totali
              </p>
              <h2 className="text-2xl font-mono font-bold mt-1 text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 transition-colors">
                {stats.cartStats.totaleCarrelli}
              </h2>
            </div>
            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg shrink-0">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Aperti/Pronti:</span>
            <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
              {stats.cartStats.carrelliAperti}
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Media Carte / Box
              </p>
              <h2 className="text-2xl font-mono font-bold mt-1 text-slate-800 dark:text-slate-100">
                {stats.cartStats.mediaOggettiPerCarrello.toFixed(1)}
              </h2>
            </div>
            <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg shrink-0">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate">
              {stats.cartStats.totaleOggettiAcquistati} oggetti distribuiti
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Spesa Media
              </p>
              <h2 className="text-2xl font-mono font-bold mt-1 text-purple-600 dark:text-purple-500">
                {formatCurrency(stats.cartStats.spesaMediaPerCarrello)}
              </h2>
            </div>
            <div className="p-2 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg shrink-0">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate">Per ogni carrello</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Ricavi Tot. Carrelli
              </p>
              <h2 className="text-2xl font-mono font-bold mt-1 text-amber-600 dark:text-amber-500">
                {formatCurrency(stats.cartStats.spesaTotaleCarrelli)}
              </h2>
            </div>
            <div className="p-2 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg shrink-0">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate">Valore generato ordini</p>
          </div>
        </div>
      </div>

      {/* Financial Valuation Strip */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Valore Totale a Magazzino */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Valore Totale Mercato
              </p>
              <h2 className="text-3xl font-mono font-bold mt-1 text-slate-800 dark:text-slate-100">
                {formatCurrency(stats.valoreVenditaMagazzino)}
              </h2>
            </div>
            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
              <PackageSearch className="w-5 h-5" />
            </div>
          </div>
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Costo Acquisto:{" "}
              <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                {formatCurrency(stats.valoreCostoMagazzino)}
              </span>
            </p>
          </div>
        </div>

        {/* Capitale Circolante vs Margine */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Capitale Congelato (Stock)
              </p>
              <h2 className="text-3xl font-mono font-bold mt-1 text-amber-600 dark:text-amber-500">
                {formatCurrency(stats.valoreCostoMagazzino)}
              </h2>
            </div>
            <div className="p-2 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Profitti (Margine):{" "}
              <span
                className={`font-mono font-bold ${
                  stats.utile >= 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {formatCurrency(stats.utile)}
              </span>
            </p>
          </div>
        </div>

        {/* Forecast Entrate (Carrelli) */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl shadow-sm border border-blue-200 dark:border-blue-900/50 flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Forecast Entrate
              </p>
              <h2 className="text-3xl font-mono font-bold mt-1 text-blue-600 dark:text-blue-500">
                {formatCurrency(stats.forecastEntrate)}
              </h2>
            </div>
            <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
              <BarChart3 className="w-5 h-5" />
            </div>
          </div>
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-tight">
              Entrate stimate dai carrelli
              <br />
              aperti o in spedizione
            </p>
          </div>
        </div>
      </div>

      {/* Top Performers & Dead Stock */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Performers */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl shadow-sm border border-emerald-100 dark:border-emerald-900/30 flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Top Performers
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin">
            {stats.topPerformers.length === 0 ? (
              <p className="text-xs text-slate-400 italic">Nessun dato di vendita.</p>
            ) : (
              <div className="space-y-2">
                {stats.topPerformers.map((item) => (
                  <div key={item.ID_Oggetto} className="flex justify-between items-center text-xs">
                    <span className="truncate pr-2 font-medium">{item.Nome}</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold whitespace-nowrap pl-2">
                      {formatCurrency(stats.itemRevenue[item.ID_Oggetto] || 0)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Dead Stock */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl shadow-sm border border-rose-100 dark:border-rose-900/30 flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <TrendingDown className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Dead Stock
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin">
            {stats.deadStock.length === 0 ? (
              <p className="text-xs text-slate-400 italic">Nessun dead stock.</p>
            ) : (
              <div className="space-y-2">
                {stats.deadStock.map((item) => (
                  <div key={item.ID_Oggetto} className="flex justify-between items-center text-xs">
                    <span className="truncate pr-2 font-medium">{item.Nome}</span>
                    <span className="font-mono text-rose-600 dark:text-rose-400 font-bold whitespace-nowrap pl-2">
                      {formatCurrency(item.Quantità_Disponibile * item.Costo_Acquisto)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
