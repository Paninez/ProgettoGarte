import React from "react";
import {
  Zap,
  Users,
  Coins,
  Award,
  Trophy,
  Crown,
  Sliders,
} from "lucide-react";
import { CustomerLoyalty, LoyaltyConfig } from "../../types";

interface LoyaltyHeaderProps {
  loyaltyConfig: LoyaltyConfig;
  loyaltyProfiles: CustomerLoyalty[];
  totalSystemSpent: number;
  totalSystemXP: number;
  avgLevel: number;
  activeSubTab: "leaderboard" | "customer" | "admin";
  setActiveSubTab: (tab: "leaderboard" | "customer" | "admin") => void;
}

export function LoyaltyHeader({
  loyaltyConfig,
  loyaltyProfiles,
  totalSystemSpent,
  totalSystemXP,
  avgLevel,
  activeSubTab,
  setActiveSubTab,
}: LoyaltyHeaderProps) {
  return (
    <div className="space-y-6">
      {/* EVENT BANNER HEADER */}
      {loyaltyConfig.doubleXpActive && (
        <div className="bg-gradient-to-r from-amber-500 via-purple-600 to-indigo-600 rounded-2xl p-4 text-white shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4 border border-amber-300/30 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-md">
              <Zap className="h-7 w-7 text-amber-300 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-amber-400 text-amber-950 font-black text-[10px] uppercase px-2 py-0.5 rounded-full tracking-wider">
                  EVENTO SPECIALE ATTIVO
                </span>
                <span className="text-xs font-bold text-amber-200">
                  {loyaltyConfig.xpMultiplier}x MULTIPLIER XP
                </span>
              </div>
              <h2 className="text-lg font-black tracking-tight">{loyaltyConfig.activeEventName}</h2>
              <p className="text-xs text-amber-100">
                Tutti gli ordini completati ora assegnano il doppio dei Punti XP ed avanzamenti di livello accelerati!
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveSubTab("admin")}
            className="whitespace-nowrap px-4 py-2 bg-white text-indigo-950 hover:bg-amber-100 font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
          >
            Gestisci Eventi XP
          </button>
        </div>
      )}

      {/* TOP STATS STRIP */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Clienti Fidelizzati</span>
            <Users className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{loyaltyProfiles.length}</div>
          <span className="text-[11px] text-slate-500 font-medium">Iscritti al programma</span>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Spesa Generata</span>
            <Coins className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            € {totalSystemSpent.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-slate-500 font-medium">Totale spesa ordini completati</span>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Punti XP Assegnati</span>
            <Zap className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
            {totalSystemXP.toLocaleString("it-IT")} XP
          </div>
          <span className="text-[11px] text-slate-500 font-medium">Punti totali in circolazione</span>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Livello Medio</span>
            <Award className="h-4 w-4 text-purple-500" />
          </div>
          <div className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">
            Lvl {avgLevel}
          </div>
          <span className="text-[11px] text-slate-500 font-medium">Progressione media clienti</span>
        </div>
      </div>

      {/* SUB TAB NAVIGATION */}
      <div className="bg-slate-100 dark:bg-slate-800/60 p-1.5 rounded-2xl flex items-center gap-1 border border-slate-200 dark:border-slate-700">
        <button
          onClick={() => setActiveSubTab("leaderboard")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
            activeSubTab === "leaderboard"
              ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
          }`}
        >
          <Trophy className="h-4 w-4" />
          <span>Classifica & Leaderboard</span>
        </button>
        <button
          onClick={() => setActiveSubTab("customer")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
            activeSubTab === "customer"
              ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
          }`}
        >
          <Crown className="h-4 w-4" />
          <span>Scheda Loyalty Cliente</span>
        </button>
        <button
          onClick={() => setActiveSubTab("admin")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
            activeSubTab === "admin"
              ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
          }`}
        >
          <Sliders className="h-4 w-4" />
          <span>Configurazione & Eventi Admin</span>
        </button>
      </div>
    </div>
  );
}
