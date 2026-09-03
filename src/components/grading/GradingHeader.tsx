import React from "react";
import { Award, Plus, FolderOpen, Sliders } from "lucide-react";

interface GradingHeaderProps {
  activeSubTab: "lotti" | "listino";
  setActiveSubTab: (tab: "lotti" | "listino") => void;
  userRole?: string;
  setIsCreatingGroup: (val: boolean) => void;
}

export function GradingHeader({
  activeSubTab,
  setActiveSubTab,
  userRole,
  setIsCreatingGroup,
}: GradingHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200/85">
      <div className="space-y-1">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl">
            <Award className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-800">Grading Hub</h1>
            <p className="text-xs text-slate-500 font-medium">Gestione lotti di spedizione, monitoraggio e listino prezzi</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {/* Sub Navigation Switcher */}
        <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200/80">
          <button
            onClick={() => setActiveSubTab("lotti")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === "lotti"
                ? "bg-white text-indigo-700 shadow-3xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <FolderOpen className="h-4 w-4" />
            <span>Lotti Grading</span>
          </button>
          <button
            onClick={() => setActiveSubTab("listino")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === "listino"
                ? "bg-white text-indigo-700 shadow-3xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Sliders className="h-4 w-4" />
            <span>Listino Prezzi</span>
          </button>
        </div>

        {activeSubTab === "lotti" && userRole !== "utente" && (
          <button
            onClick={() => setIsCreatingGroup(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md hover:shadow-lg shadow-indigo-100 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Nuovo Lotto</span>
          </button>
        )}
      </div>
    </div>
  );
}
