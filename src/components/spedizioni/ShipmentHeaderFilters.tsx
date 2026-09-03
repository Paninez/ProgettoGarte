import React from "react";
import { Truck, Search, Zap } from "lucide-react";

interface ShipmentHeaderFiltersProps {
  search: string;
  setSearch: (val: string) => void;
  activeTab: "da_gestire" | "consegnate" | "resi";
  setActiveTab: (tab: "da_gestire" | "consegnate" | "resi") => void;
  operatorFilter: "tutti" | "Giana" | "Eto" | "Paki" | "unassigned";
  setOperatorFilter: (op: "tutti" | "Giana" | "Eto" | "Paki" | "unassigned") => void;
  onOpenPacklinkExport?: () => void;
  pendingCorriereCount?: number;
}

export function ShipmentHeaderFilters({
  search,
  setSearch,
  activeTab,
  setActiveTab,
  operatorFilter,
  setOperatorFilter,
  onOpenPacklinkExport,
  pendingCorriereCount = 0,
}: ShipmentHeaderFiltersProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Truck className="h-6 w-6 text-indigo-600 shrink-0" />
            <span>Logistica Spedizioni</span>
          </h2>
          {onOpenPacklinkExport && (
            <button
              type="button"
              onClick={onOpenPacklinkExport}
              className="lg:hidden flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs transition-all active:scale-95 cursor-pointer whitespace-nowrap"
              title="Estrai spedizioni corriere per Packlink PRO / Zapier"
            >
              <Zap className="h-3.5 w-3.5 text-amber-300 fill-amber-300" />
              <span>Packlink PRO</span>
              {pendingCorriereCount > 0 && (
                <span className="bg-amber-400 text-indigo-950 text-[10px] font-black px-1.5 py-0.2 rounded-full">
                  {pendingCorriereCount}
                </span>
              )}
            </button>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full lg:w-auto">
          {onOpenPacklinkExport && (
            <button
              type="button"
              onClick={onOpenPacklinkExport}
              className="hidden lg:flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs transition-all active:scale-95 cursor-pointer whitespace-nowrap"
              title="Estrai spedizioni corriere per Packlink PRO / Zapier"
            >
              <Zap className="h-4 w-4 text-amber-300 fill-amber-300" />
              <span>Packlink PRO / Zapier</span>
              {pendingCorriereCount > 0 && (
                <span className="ml-1 bg-amber-400 text-indigo-950 text-[10px] font-black px-1.5 py-0.2 rounded-full">
                  {pendingCorriereCount}
                </span>
              )}
            </button>
          )}

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cerca Cliente, ID, Tracking, Tag..."
              className="pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-xs sm:text-sm w-full focus:ring-2 focus:ring-indigo-500 outline-none bg-white font-medium"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
            <button
              onClick={() => setActiveTab("da_gestire")}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all text-center cursor-pointer ${
                activeTab === "da_gestire"
                  ? "bg-white text-indigo-700 shadow-2xs"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Da Gestire
            </button>
            <button
              onClick={() => setActiveTab("consegnate")}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all text-center cursor-pointer ${
                activeTab === "consegnate"
                  ? "bg-white text-indigo-700 shadow-2xs"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Consegnate
            </button>
            <button
              onClick={() => setActiveTab("resi")}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all text-center cursor-pointer ${
                activeTab === "resi"
                  ? "bg-white text-rose-700 shadow-2xs"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Resi
            </button>
          </div>
        </div>
      </div>

      {/* Operator Filter Selector Bar */}
      <div className="flex items-center gap-1.5 bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200/80 overflow-x-auto custom-scrollbar">
        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-2 shrink-0">
          Filtra Label:
        </span>
        <button
          type="button"
          onClick={() => setOperatorFilter("tutti")}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            operatorFilter === "tutti"
              ? "bg-white text-slate-900 shadow-2xs border border-slate-200"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          Tutti
        </button>
        <button
          type="button"
          onClick={() => setOperatorFilter("Giana")}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
            operatorFilter === "Giana"
              ? "bg-rose-600 text-white shadow-2xs"
              : "text-rose-700 hover:bg-rose-100/70"
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-rose-400 shrink-0"></span>
          <span>Giana</span>
        </button>
        <button
          type="button"
          onClick={() => setOperatorFilter("Eto")}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
            operatorFilter === "Eto"
              ? "bg-sky-600 text-white shadow-2xs"
              : "text-sky-700 hover:bg-sky-100/70"
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-sky-400 shrink-0"></span>
          <span>Eto</span>
        </button>
        <button
          type="button"
          onClick={() => setOperatorFilter("Paki")}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
            operatorFilter === "Paki"
              ? "bg-purple-600 text-white shadow-2xs"
              : "text-purple-700 hover:bg-purple-100/70"
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-purple-400 shrink-0"></span>
          <span>Paki</span>
        </button>
        <button
          type="button"
          onClick={() => setOperatorFilter("unassigned")}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            operatorFilter === "unassigned"
              ? "bg-white text-slate-800 shadow-2xs border border-slate-200"
              : "text-slate-400 hover:text-slate-600"
          }`}
        >
          Senza Label
        </button>
      </div>
    </div>
  );
}
