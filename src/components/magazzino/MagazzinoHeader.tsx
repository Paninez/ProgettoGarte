import React from "react";
import { Plus, X, ShieldCheck, Zap, LayoutDashboard, List, History, Box } from "lucide-react";

interface MagazzinoHeaderProps {
  userRole: "owner" | "moderatore" | "utente";
  isAdding: boolean;
  setIsAdding: (val: boolean) => void;
  isAddingSingleCards?: boolean;
  setIsAddingSingleCards?: (val: boolean) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const MagazzinoHeader: React.FC<MagazzinoHeaderProps> = ({
  userRole,
  isAdding,
  setIsAdding,
  isAddingSingleCards = false,
  setIsAddingSingleCards,
  activeTab,
  setActiveTab
}) => {
  return (
    <div className="flex flex-col gap-6 pb-6 border-b border-slate-200/85">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight font-sans">
              Magazzino & Inventario
            </h2>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase shrink-0 ${
                userRole === "owner"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-150"
                  : userRole === "moderatore"
                  ? "bg-indigo-50 text-indigo-700 border border-indigo-150"
                  : "bg-amber-50 text-amber-750 border border-amber-150"
              }`}
            >
              {userRole === "owner" ? "Accesso Completo" : "Solo Lettura"}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 font-medium">
            Gestisci prodotti, carte singole, giacenze e preordini
          </p>
        </div>

        {userRole === "owner" ? (
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto shrink-0">
            {setIsAddingSingleCards && (
              <button
                onClick={() => {
                  if (isAdding) setIsAdding(false);
                  setIsAddingSingleCards(!isAddingSingleCards);
                }}
                className={`flex items-center justify-center space-x-1.5 px-3.5 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all shadow-sm cursor-pointer shrink-0 ${
                  isAddingSingleCards 
                    ? "bg-slate-100 text-slate-700 border border-slate-200" 
                    : "bg-indigo-600 hover:bg-indigo-700 text-white border border-transparent"
                }`}
              >
                {isAddingSingleCards ? <X className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
                <span>{isAddingSingleCards ? "Chiudi" : "Rapido Carte"}</span>
              </button>
            )}
            <button
              onClick={() => {
                if (isAddingSingleCards && setIsAddingSingleCards) setIsAddingSingleCards(false);
                setIsAdding(!isAdding);
              }}
              className={`flex items-center justify-center space-x-1.5 px-3.5 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all shadow-sm cursor-pointer shrink-0 ${
                isAdding ? "bg-slate-100 text-slate-700 border border-slate-200" : "bg-slate-900 hover:bg-slate-800 text-white"
              }`}
            >
              {isAdding ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              <span>{isAdding ? "Annulla" : "Nuovo Lotto"}</span>
            </button>
          </div>
        ) : (
          <div className="inline-flex items-center space-x-1.5 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 text-xs font-semibold self-start sm:self-auto shrink-0">
            <ShieldCheck className="h-4 w-4 text-amber-500" />
            <span>{userRole === "moderatore" ? "Moderatore" : "Utente"} (Sola Lettura)</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {[
          { id: "dashboard", label: "Panoramica", icon: LayoutDashboard },
          { id: "inventario", label: "Inventario", icon: List },
          { id: "preordini", label: "Preordini", icon: History },
          { id: "esauriti", label: "Esauriti", icon: Box },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all whitespace-nowrap shrink-0 ${
              activeTab === tab.id
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-200/60"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
