/**
 * @file ClientLoyaltyCard.tsx
 * @description Dedicated loyalty badge and tier status card component.
 * Displays customer's historical spending, loyalty level, collector tokens, progress bar,
 * and active tier perks cleanly integrated into the cart view.
 */

import React from "react";
import {
  Crown,
  Sparkles,
  TrendingUp,
  Zap,
  ShieldCheck,
  ChevronRight,
  Flame,
  FolderHeart,
  Search,
  Compass,
  Lock,
  Trophy,
  User,
} from "lucide-react";
import { CustomerLoyalty } from "../../types";
import {
  calculateTierFromSpent,
  calculateNextTierThreshold,
  calculateLevelFromXP,
  TIERS_CONFIG,
} from "../../lib/loyaltyEngine";

interface ClientLoyaltyCardProps {
  clientName: string;
  clientEmail?: string;
  loyaltyProfile?: CustomerLoyalty | null;
  historicalSpent?: number;
  onNavigate?: (tab: string) => void;
  compact?: boolean;
}

export const ClientLoyaltyCard: React.FC<ClientLoyaltyCardProps> = ({
  clientName,
  loyaltyProfile,
  historicalSpent = 0,
  onNavigate,
}) => {
  // Use profile values or calculate dynamically based on spent
  const totalSpent = loyaltyProfile?.totalSpent ?? historicalSpent;
  const xp = loyaltyProfile?.xp ?? Math.floor(totalSpent * 10);
  const level = loyaltyProfile?.level ?? calculateLevelFromXP(xp);
  const collectorTokens = loyaltyProfile?.collectorTokens ?? Math.floor(totalSpent / 50);

  const currentTier = loyaltyProfile?.tier
    ? TIERS_CONFIG.find((t) => t.tier === loyaltyProfile.tier) || calculateTierFromSpent(totalSpent)
    : calculateTierFromSpent(totalSpent);

  const { nextTier, neededSpent, progressPercent } = calculateNextTierThreshold(totalSpent);

  const getTierIcon = (iconName: string) => {
    switch (iconName) {
      case "Crown":
        return Crown;
      case "Sparkles":
        return Sparkles;
      case "Trophy":
        return Trophy;
      case "Flame":
        return Flame;
      case "Lock":
        return Lock;
      case "Compass":
        return Compass;
      case "Search":
        return Search;
      case "FolderHeart":
        return FolderHeart;
      default:
        return User;
    }
  };

  const IconComp = getTierIcon(currentTier.iconName);

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-4 shadow-md border border-slate-700/60 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -left-8 -top-8 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-700/60 relative z-10">
        <div className="flex items-center space-x-2.5">
          <div
            className="p-2 rounded-xl text-white shadow-inner flex items-center justify-center shrink-0"
            style={{ backgroundColor: currentTier.color }}
          >
            <IconComp className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 flex items-center gap-1">
                <Crown className="h-3 w-3 text-amber-400" />
                Loyalty & Rep Status
              </span>
            </div>
            <h4 className="text-sm font-black text-white flex items-center gap-2">
              <span>{currentTier.tier}</span>
              <span className="text-[10px] bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 px-2 py-0.5 rounded-full font-mono">
                Lvl {level}
              </span>
            </h4>
          </div>
        </div>

        {onNavigate && (
          <button
            type="button"
            onClick={() => onNavigate("loyalty")}
            className="flex items-center space-x-1 text-[11px] font-bold text-amber-300 hover:text-amber-200 bg-amber-400/10 hover:bg-amber-400/20 px-2.5 py-1 rounded-xl border border-amber-400/30 transition-all cursor-pointer"
          >
            <span>Dettagli Loyalty</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-2 my-3 relative z-10 text-center">
        <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-2">
          <p className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider">Speso Storico</p>
          <p className="text-xs sm:text-sm font-black text-emerald-400 font-mono mt-0.5">
            €{totalSpent.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>

        <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-2">
          <p className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider">XP Accumulati</p>
          <p className="text-xs sm:text-sm font-black text-indigo-300 font-mono mt-0.5">
            {xp.toLocaleString("it-IT")} <span className="text-[9px] text-indigo-400">XP</span>
          </p>
        </div>

        <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-2">
          <p className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider">Tokens 💎</p>
          <p className="text-xs sm:text-sm font-black text-amber-300 font-mono mt-0.5">
            {collectorTokens} <span className="text-[9px] text-amber-400">Tokens</span>
          </p>
        </div>
      </div>

      {/* Progress to next Tier */}
      {nextTier ? (
        <div className="space-y-1.5 pt-1 relative z-10">
          <div className="flex justify-between items-center text-[10px] text-slate-300">
            <span className="font-semibold flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-amber-400" />
              Prossimo Tier: <strong className="text-amber-300">{nextTier.tier}</strong>
            </span>
            <span className="font-mono text-slate-400">
              Mancano <strong className="text-emerald-400">€{neededSpent.toFixed(2)}</strong>
            </span>
          </div>
          <div className="w-full bg-slate-950/80 h-2 rounded-full overflow-hidden p-0.5 border border-slate-700/50">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-amber-400 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      ) : (
        <div className="pt-1 text-center text-[10px] text-amber-300 font-bold tracking-wider uppercase flex items-center justify-center gap-1">
          <Sparkles className="h-3 w-3 text-amber-400" />
          <span>Massimo Tier Raggiunto — Leggenda del Vault!</span>
        </div>
      )}

      {/* Active Tier Perks */}
      {currentTier.perks && currentTier.perks.length > 0 && (
        <div className="mt-3 pt-2 border-t border-slate-700/60 relative z-10">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
            <Zap className="h-3 w-3 text-amber-400" />
            Benefici Attivi del Tier:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {currentTier.perks.map((perk, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 text-[10px] bg-indigo-950/80 text-indigo-200 border border-indigo-700/50 px-2 py-0.5 rounded-lg font-medium"
              >
                <ShieldCheck className="h-2.5 w-2.5 text-emerald-400 shrink-0" />
                {perk}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
