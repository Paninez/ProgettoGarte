import React from "react";
import {
  Search,
  Filter,
  Download,
  Users,
  ChevronRight,
} from "lucide-react";
import { CustomerLoyalty } from "../../types";
import { TIERS_CONFIG } from "../../lib/loyaltyEngine";

interface LoyaltyLeaderboardProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  tierFilter: string;
  setTierFilter: (t: string) => void;
  sortBy: "spent" | "xp" | "orders" | "tokens";
  setSortBy: (s: "spent" | "xp" | "orders" | "tokens") => void;
  handleExportCSV: () => void;
  filteredProfiles: CustomerLoyalty[];
  paginatedProfiles: CustomerLoyalty[];
  leaderboardPage: number;
  setLeaderboardPage: React.Dispatch<React.SetStateAction<number>>;
  totalLeaderboardPages: number;
  setSelectedCustomerId: (id: string) => void;
  setActiveSubTab: (tab: "leaderboard" | "customer" | "admin") => void;
}

export function LoyaltyLeaderboard({
  searchQuery,
  setSearchQuery,
  tierFilter,
  setTierFilter,
  sortBy,
  setSortBy,
  handleExportCSV,
  filteredProfiles,
  paginatedProfiles,
  leaderboardPage,
  setLeaderboardPage,
  totalLeaderboardPages,
  setSelectedCustomerId,
  setActiveSubTab,
}: LoyaltyLeaderboardProps) {
  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cerca cliente per nome o email..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Filter by Tier */}
          <div className="flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold px-3 py-2 text-slate-700 dark:text-slate-300 outline-none"
            >
              <option value="ALL">Tutti i Tier</option>
              {TIERS_CONFIG.map((t) => (
                <option key={t.tier} value={t.tier}>
                  {t.tier} (≥ €{t.minSpent})
                </option>
              ))}
            </select>
          </div>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold px-3 py-2 text-slate-700 dark:text-slate-300 outline-none"
          >
            <option value="spent">Ordina per: Spesa Totale</option>
            <option value="xp">Ordina per: Punti XP</option>
            <option value="orders">Ordina per: Numero Ordini</option>
            <option value="tokens">Ordina per: Collector Tokens</option>
          </select>

          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
            title="Esporta Report CSV"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Esporta CSV</span>
          </button>
        </div>
      </div>

      {/* Grid of Profile Cards */}
      {filteredProfiles.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center shadow-sm">
          <Users className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <h3 className="font-extrabold text-slate-700 dark:text-slate-300">Nessun cliente trovato</h3>
          <p className="text-xs text-slate-400 mt-1">Prova a modificare i filtri di ricerca o il tier selezionato.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedProfiles.map((profile, index) => {
              const actualRank = (leaderboardPage - 1) * 12 + index + 1;
              const tier = TIERS_CONFIG.find((t) => t.tier === profile.tier) || TIERS_CONFIG[0];
              return (
                <div
                  key={profile.customerId}
                  onClick={() => {
                    setSelectedCustomerId(profile.customerId);
                    setActiveSubTab("customer");
                  }}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer group hover:border-indigo-300 relative overflow-hidden"
                >
                  {/* Rank Badge */}
                  <div
                    className={`absolute top-0 right-0 w-12 h-12 flex items-center justify-center font-black text-xs rounded-bl-2xl ${
                      actualRank === 1
                        ? "bg-amber-400 text-amber-950 shadow-sm"
                        : actualRank === 2
                        ? "bg-slate-300 text-slate-900"
                        : actualRank === 3
                        ? "bg-amber-700 text-white"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                    }`}
                  >
                    #{actualRank}
                  </div>

                  <div className="flex items-center gap-3 mb-3 pr-10">
                    <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-black text-sm relative shrink-0">
                      {profile.customerName.slice(0, 2).toUpperCase()}
                      <div className="absolute -bottom-1 -right-1 bg-amber-400 text-amber-950 text-[9px] font-black px-1.5 py-0.2 rounded-full border border-white">
                        Lvl {profile.level}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-extrabold text-sm text-slate-900 dark:text-white truncate group-hover:text-indigo-600 transition-colors">
                        {profile.customerName}
                      </h3>
                      <p className="text-[11px] text-slate-400 truncate">{profile.email || profile.customerId}</p>

                      {/* Tier Pill */}
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border ${tier.badgeBg}`}>
                          {tier.tier}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-2 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl text-center border border-slate-100 dark:border-slate-800">
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Speso</span>
                      <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                        € {profile.totalSpent.toLocaleString("it-IT", { minimumFractionDigits: 0 })}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Punti XP</span>
                      <span className="text-xs font-black text-amber-600 dark:text-amber-400">
                        {profile.xp.toLocaleString()} XP
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Tokens</span>
                      <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">
                        {profile.collectorTokens} 💎
                      </span>
                    </div>
                  </div>

                  {/* Bottom Info */}
                  <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span>
                      Ordini Completati: <strong className="text-slate-800 dark:text-slate-200">{profile.totalOrders}</strong>
                    </span>
                    <span className="text-indigo-600 font-bold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                      Apri Profilo <ChevronRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {totalLeaderboardPages > 1 && (
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="text-xs text-slate-500 font-medium">
                Pagina <span className="text-slate-900 dark:text-white font-bold">{leaderboardPage}</span> di{" "}
                <span className="text-slate-900 dark:text-white font-bold">{totalLeaderboardPages}</span>
                <span className="ml-2">({filteredProfiles.length} profili totali)</span>
              </div>
              <div className="flex items-center gap-1 overflow-x-auto max-w-full pb-1 sm:pb-0">
                <button
                  onClick={() => setLeaderboardPage((p) => Math.max(1, p - 1))}
                  disabled={leaderboardPage === 1}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  Precedente
                </button>
                <div className="flex items-center gap-1 px-2">
                  {Array.from({ length: totalLeaderboardPages }).map((_, i) => {
                    const p = i + 1;
                    const isNearCurrent = Math.abs(p - leaderboardPage) <= 1;
                    const isEdge = p === 1 || p === totalLeaderboardPages;

                    if (isNearCurrent || isEdge) {
                      return (
                        <button
                          key={p}
                          onClick={() => setLeaderboardPage(p)}
                          className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                            leaderboardPage === p
                              ? "bg-indigo-600 text-white"
                              : "bg-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                          }`}
                        >
                          {p}
                        </button>
                      );
                    }

                    if (p === 2 || p === totalLeaderboardPages - 1) {
                      return (
                        <span key={p} className="text-slate-400 px-1">
                          ...
                        </span>
                      );
                    }

                    return null;
                  })}
                </div>
                <button
                  onClick={() => setLeaderboardPage((p) => Math.min(totalLeaderboardPages, p + 1))}
                  disabled={leaderboardPage === totalLeaderboardPages}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  Successiva
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
