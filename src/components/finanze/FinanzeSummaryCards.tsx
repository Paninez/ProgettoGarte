import React from "react";
import { TrendingUp, TrendingDown, Wallet } from "lucide-react";

interface FinanzeSummaryCardsProps {
  totalEntrate: number;
  totalUscite: number;
  balance: number;
}

export function FinanzeSummaryCards({ totalEntrate, totalUscite, balance }: FinanzeSummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden shadow-sm">
        <div className="flex items-center gap-2 text-slate-500 font-bold uppercase tracking-wider text-[11px] mb-2">
          <TrendingUp className="h-4 w-4 text-emerald-500" /> Entrate Totali
        </div>
        <div className="text-2xl font-black text-slate-800">€{totalEntrate.toFixed(2)}</div>
      </div>
      <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden shadow-sm">
        <div className="flex items-center gap-2 text-slate-500 font-bold uppercase tracking-wider text-[11px] mb-2">
          <TrendingDown className="h-4 w-4 text-rose-500" /> Uscite Totali
        </div>
        <div className="text-2xl font-black text-slate-800">€{totalUscite.toFixed(2)}</div>
      </div>
      <div className="bg-indigo-600 border border-indigo-500 rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden shadow-md text-white">
        <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-[11px] mb-2 text-indigo-100">
          <Wallet className="h-4 w-4 text-indigo-200" /> Saldo Attuale
        </div>
        <div className="text-2xl font-black text-white">€{balance.toFixed(2)}</div>
      </div>
    </div>
  );
}
