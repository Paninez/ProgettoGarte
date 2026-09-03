import React from "react";
import { Zap, Crown } from "lucide-react";
import { LoyaltyConfig } from "../../types";
import { TIERS_CONFIG } from "../../lib/loyaltyEngine";

interface LoyaltyAdminSettingsProps {
  loyaltyConfig: LoyaltyConfig;
  onUpdateConfig: (newConfig: LoyaltyConfig) => void;
}

export function LoyaltyAdminSettings({
  loyaltyConfig,
  onUpdateConfig,
}: LoyaltyAdminSettingsProps) {
  return (
    <div className="space-y-6">
      {/* Multiplier Setup */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
        <div>
          <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-500" />
            <span>Gestione Multiplicatori XP & Eventi Speciali</span>
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Imposta moltiplicatori per eventi speciali come Double XP Weekend, Black Friday, Pokémon Day, ecc.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
              Moltiplicatore XP Attivo
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3].map((m) => (
                <button
                  key={m}
                  onClick={() =>
                    onUpdateConfig({
                      ...loyaltyConfig,
                      xpMultiplier: m,
                      doubleXpActive: m > 1,
                    })
                  }
                  className={`py-3 rounded-xl font-black text-sm border transition-all cursor-pointer ${
                    loyaltyConfig.xpMultiplier === m
                      ? "bg-amber-400 text-amber-950 border-amber-500 shadow-md"
                      : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {m}x Multiplier
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
              Nome Evento / Promozione Attiva
            </label>
            <input
              type="text"
              value={loyaltyConfig.activeEventName || ""}
              onChange={(e) =>
                onUpdateConfig({
                  ...loyaltyConfig,
                  activeEventName: e.target.value,
                })
              }
              placeholder="Es. Black Friday Double XP"
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* All Tiers Master List Reference */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
          <Crown className="h-5 w-5 text-amber-500" />
          <span>Struttura Tiers Ufficiali Collezionista</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {TIERS_CONFIG.map((t) => (
            <div
              key={t.tier}
              className={`p-4 rounded-2xl border ${t.borderStyle} bg-slate-50/50 dark:bg-slate-800/30 space-y-2`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-black px-2.5 py-0.5 rounded-md ${t.badgeBg}`}>{t.tier}</span>
                <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                  ≥ €{t.minSpent.toLocaleString()}
                </span>
              </div>
              <ul className="space-y-1 pt-2 border-t border-slate-200 dark:border-slate-700">
                {t.perks.map((p, idx) => (
                  <li key={idx} className="text-[11px] text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
