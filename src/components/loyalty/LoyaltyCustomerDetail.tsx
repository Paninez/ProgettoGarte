import React from "react";
import {
  Crown,
  Star,
  Coins,
  Zap,
  Trophy,
  ShieldCheck,
  CheckCircle2,
  Award,
  Lock,
  Gift,
  RotateCcw,
  TrendingUp,
  Flame,
  Plus,
} from "lucide-react";
import { CustomerLoyalty, CustomerLoyaltyHistory, TierConfig } from "../../types";
import {
  ALL_BADGES,
  ALL_MISSIONS,
  calculateXPForLevel,
} from "../../lib/loyaltyEngine";
import { renderBadgeIcon } from "./loyaltyUtils";

interface LoyaltyCustomerDetailProps {
  loyaltyProfiles: CustomerLoyalty[];
  loyaltyHistory: CustomerLoyaltyHistory[];
  activeProfile: CustomerLoyalty | null;
  activeTierThreshold: {
    nextTier: TierConfig | null;
    neededSpent: number;
    progressPercent: number;
  } | null;
  activeTierConfig: TierConfig;
  selectedCustomerId: string;
  setSelectedCustomerId: (id: string) => void;
  userRole?: string;
  setTargetCustomer: (id: string) => void;
  setShowManualModal: (val: boolean) => void;
  handleOpenEditModal: (profile: CustomerLoyalty) => void;
  setShowCreateModal: (val: boolean) => void;
  luckyPullResult: { title: string; reward: string } | null;
  isSpinning: boolean;
  handleTriggerLuckyPull: () => void;
}

export function LoyaltyCustomerDetail({
  loyaltyProfiles,
  loyaltyHistory,
  activeProfile,
  activeTierThreshold,
  activeTierConfig,
  selectedCustomerId,
  setSelectedCustomerId,
  userRole,
  setTargetCustomer,
  setShowManualModal,
  handleOpenEditModal,
  setShowCreateModal,
  luckyPullResult,
  isSpinning,
  handleTriggerLuckyPull,
}: LoyaltyCustomerDetailProps) {
  return (
    <div className="space-y-6">
      {/* Customer Selector Dropdown Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Crown className="h-5 w-5 text-indigo-600" />
          <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Seleziona Cliente:
          </span>
          <select
            value={activeProfile?.customerId || ""}
            onChange={(e) => setSelectedCustomerId(e.target.value)}
            className="flex-1 sm:flex-initial bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-extrabold px-3 py-2 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {loyaltyProfiles.map((p) => (
              <option key={p.customerId} value={p.customerId}>
                {p.customerName} (Lvl {p.level} • {p.tier})
              </option>
            ))}
          </select>
        </div>
        {activeProfile && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                setTargetCustomer(activeProfile.customerId);
                setShowManualModal(true);
              }}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-amber-950 font-black text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Zap className="h-3.5 w-3.5" />
              <span>Assegna Bonus XP</span>
            </button>
            {userRole !== "utente" && (
              <button
                onClick={() => handleOpenEditModal(activeProfile)}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>Gestisci Livello/Tier</span>
              </button>
            )}
            {userRole !== "utente" && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Nuovo Profilo</span>
              </button>
            )}
          </div>
        )}
      </div>

      {activeProfile && (
        <>
          {/* CUSTOMER HERO CARD */}
          <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
              <Trophy className="h-64 w-64 text-amber-400" />
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-400 to-amber-500 text-slate-950 font-black text-2xl flex items-center justify-center shadow-lg relative border-2 border-amber-300">
                  {activeProfile.customerName.slice(0, 2).toUpperCase()}
                  <div className="absolute -bottom-2 -right-2 bg-indigo-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full border border-indigo-400">
                    Lvl {activeProfile.level}
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-[10px] font-black px-2.5 py-0.5 rounded-md uppercase tracking-wider ${activeTierConfig.badgeBg}`}
                    >
                      {activeProfile.tier}
                    </span>
                    {activeProfile.prestigeLevel && activeProfile.prestigeLevel > 0 ? (
                      <span className="text-amber-300 font-black text-xs flex items-center gap-0.5">
                        <Star className="h-3.5 w-3.5 fill-amber-300" /> Prestige {activeProfile.prestigeLevel}
                      </span>
                    ) : null}
                  </div>
                  <h2 className="text-2xl font-black text-white">{activeProfile.customerName}</h2>
                  <p className="text-xs text-slate-300 font-medium">{activeProfile.email || activeProfile.customerId}</p>
                </div>
              </div>

              {/* Summary Metrics */}
              <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                <div className="text-center px-3 border-r border-white/10">
                  <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block">Spesa Totale</span>
                  <span className="text-lg font-black text-emerald-400">
                    € {activeProfile.totalSpent.toLocaleString("it-IT", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="text-center px-3 border-r border-white/10">
                  <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block">Ordini Completati</span>
                  <span className="text-lg font-black text-white">{activeProfile.totalOrders}</span>
                </div>
                <div className="text-center px-3">
                  <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block">Collector Tokens</span>
                  <span className="text-lg font-black text-amber-300 flex items-center justify-center gap-1">
                    <Coins className="h-4 w-4" /> {activeProfile.collectorTokens}
                  </span>
                </div>
              </div>
            </div>

            {/* PROGRESS BARS SECTION */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-white/10 relative z-10">
              {/* XP Level Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-extrabold text-amber-300 flex items-center gap-1.5">
                    <Zap className="h-4 w-4" /> Punti Esperienza (XP)
                  </span>
                  <span className="font-bold text-slate-300">
                    {activeProfile.xp.toLocaleString()} / {activeProfile.nextTierXP.toLocaleString()} XP
                  </span>
                </div>
                <div className="h-3 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-white/10">
                  <div
                    className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-500 shadow-sm"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.max(
                          5,
                          ((activeProfile.xp - calculateXPForLevel(activeProfile.level)) /
                            (activeProfile.nextTierXP - calculateXPForLevel(activeProfile.level))) *
                            100
                        )
                      )}%`,
                    }}
                  />
                </div>
                <p className="text-[10px] text-slate-400">
                  Mancano{" "}
                  <strong className="text-white">
                    {Math.max(0, activeProfile.nextTierXP - activeProfile.xp).toLocaleString()} XP
                  </strong>{" "}
                  per raggiungere il Livello {activeProfile.level + 1}
                </p>
              </div>

              {/* Tier Spent Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-extrabold text-indigo-300 flex items-center gap-1.5">
                    <Trophy className="h-4 w-4" /> Avanzamento Prossimo Tier
                  </span>
                  <span className="font-bold text-slate-300">
                    {activeTierThreshold?.nextTier
                      ? `Prossimo: ${activeTierThreshold.nextTier.tier}`
                      : "Tier Massimo Raggiunto!"}
                  </span>
                </div>
                <div className="h-3 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-white/10">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500 shadow-sm"
                    style={{ width: `${activeTierThreshold?.progressPercent || 100}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-400">
                  {activeTierThreshold?.nextTier ? (
                    <>
                      Spendi ancora{" "}
                      <strong className="text-emerald-400">€ {activeTierThreshold.neededSpent.toFixed(2)}</strong> per
                      sbloccare il Tier <strong className="text-white">{activeTierThreshold.nextTier.tier}</strong>
                    </>
                  ) : (
                    <span className="text-amber-300 font-bold">✨ Hai raggiunto il massimo Tier Hall of Fame!</span>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* TIER PERKS & BENEFITS */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                <span>Benefici e Privilegi Sbloccati ({activeProfile.tier})</span>
              </h3>
              <span className="text-[10px] font-extrabold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md">
                Attivi sul profilo
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {activeTierConfig.perks.map((perk, i) => (
                <div
                  key={i}
                  className="bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 p-3.5 rounded-xl flex items-center gap-3"
                >
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{perk}</span>
                </div>
              ))}
            </div>
          </div>

          {/* BADGES GALLERY SHOWCASE */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Award className="h-4 w-4 text-amber-500" />
                <span>
                  Collezione Badge & Riconoscimenti ({activeProfile.badges.length}/{ALL_BADGES.length})
                </span>
              </h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {ALL_BADGES.map((badge) => {
                const isUnlocked = activeProfile.badges.includes(badge.id);
                return (
                  <div
                    key={badge.id}
                    className={`p-4 rounded-2xl border flex flex-col items-center text-center transition-all ${
                      isUnlocked
                        ? "bg-white dark:bg-slate-800/80 border-amber-300 dark:border-amber-500/30 shadow-sm"
                        : "bg-slate-50 dark:bg-slate-850/40 border-slate-200 dark:border-slate-800 opacity-40 grayscale"
                    }`}
                  >
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-2.5 ${
                        isUnlocked ? "bg-amber-100 dark:bg-amber-950/60 text-amber-600" : "bg-slate-200 text-slate-400"
                      }`}
                    >
                      {renderBadgeIcon(badge.icon, "h-6 w-6")}
                    </div>
                    <span className="font-black text-xs text-slate-900 dark:text-white line-clamp-1">{badge.name}</span>
                    <span className="text-[10px] text-slate-500 mt-1 line-clamp-2">{badge.description}</span>
                    <div className="mt-2.5 flex items-center gap-1">
                      {isUnlocked ? (
                        <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                          Sbloccato ✓
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold text-slate-400 flex items-center gap-0.5">
                          <Lock className="h-2.5 w-2.5" /> Bloccato
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* MISSIONS & LUCKY PULL */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Missions List */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <Flame className="h-4 w-4 text-rose-500" />
                  <span>Missioni Attive & Sfide Collezionista</span>
                </h3>
              </div>
              <div className="space-y-3">
                {ALL_MISSIONS.map((mission) => {
                  const isCompleted = activeProfile.completedMissions.includes(mission.id);
                  return (
                    <div
                      key={mission.id}
                      className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 p-4 rounded-xl flex items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-xs text-slate-900 dark:text-white">{mission.title}</span>
                          <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.2 rounded">
                            +{mission.rewardXP} XP • +{mission.rewardTokens} Tokens
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">{mission.description}</p>
                      </div>
                      <button
                        disabled={isCompleted}
                        className={`px-3 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all ${
                          isCompleted
                            ? "bg-emerald-100 text-emerald-800 cursor-default"
                            : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm cursor-pointer"
                        }`}
                      >
                        {isCompleted ? "Completata ✓" : "In Corso"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Lucky Pull Interactive Card */}
            <div className="bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 text-white rounded-2xl p-5 shadow-lg border border-indigo-500/30 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="bg-amber-400 text-amber-950 font-black text-[10px] px-2 py-0.5 rounded-full uppercase">
                    BONUS EXTRA
                  </span>
                  <Gift className="h-5 w-5 text-amber-300" />
                </div>
                <h3 className="font-black text-base text-white">Lucky Pull Wheel</h3>
                <p className="text-xs text-slate-300 mt-1">
                  Metti alla prova la fortuna per ricevere XP bonus, tokens o sconti esclusivi sul prossimo ordine!
                </p>
                {luckyPullResult && (
                  <div className="mt-4 p-3 bg-white/10 rounded-xl border border-amber-300/40 text-center animate-pulse">
                    <div className="font-black text-amber-300 text-sm">{luckyPullResult.title}</div>
                    <div className="text-xs font-bold text-white mt-0.5">{luckyPullResult.reward}</div>
                  </div>
                )}
              </div>
              <button
                onClick={handleTriggerLuckyPull}
                disabled={isSpinning}
                className="mt-6 w-full py-3 bg-gradient-to-r from-amber-400 to-amber-500 text-amber-950 font-black text-xs rounded-xl shadow-lg hover:brightness-110 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <RotateCcw className={`h-4 w-4 ${isSpinning ? "animate-spin" : ""}`} />
                <span>{isSpinning ? "Giro in corso..." : "Gira la Ruota Lucky Pull"}</span>
              </button>
            </div>
          </div>

          {/* TIMELINE / HISTORY LOGS */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-indigo-500" />
              <span>Storico Attività & Progressione Ordini</span>
            </h3>
            <div className="space-y-2">
              {loyaltyHistory.filter((h) => h.customerId === activeProfile.customerId).length === 0 ? (
                <p className="text-xs text-slate-400 italic p-4 text-center">
                  Nessuno storico registrato per questo cliente.
                </p>
              ) : (
                loyaltyHistory
                  .filter((h) => h.customerId === activeProfile.customerId)
                  .map((log) => (
                    <div
                      key={log.id}
                      className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 rounded-lg text-indigo-600">
                          <Zap className="h-4 w-4" />
                        </div>
                        <div>
                          <span className="font-bold text-slate-800 dark:text-slate-200 block">{log.reason}</span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(log.createdAt).toLocaleString("it-IT")}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-amber-600 block">+{log.xpEarned} XP</span>
                        {log.tokensEarned > 0 && (
                          <span className="text-[10px] font-bold text-indigo-600">+{log.tokensEarned} Tokens</span>
                        )}
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
