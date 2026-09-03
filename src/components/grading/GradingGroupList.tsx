import React from "react";
import { Plus, ChevronRight } from "lucide-react";
import { GradingGroup, GradingItem } from "../../types";

interface GradingGroupListProps {
  userRole?: string;
  setIsCreatingGroup: (val: boolean) => void;
  lottiFilter: "attivi" | "chiusi" | "tutti";
  setLottiFilter: (filter: "attivi" | "chiusi" | "tutti") => void;
  filteredGroups: GradingGroup[];
  selectedGroupId: string | null;
  setSelectedGroupId: (id: string | null) => void;
  filteredOggettiInGrading: GradingItem[];
}

export function GradingGroupList({
  userRole,
  setIsCreatingGroup,
  lottiFilter,
  setLottiFilter,
  filteredGroups,
  selectedGroupId,
  setSelectedGroupId,
  filteredOggettiInGrading,
}: GradingGroupListProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-3xs space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400">Lotti di Spedizione</h3>
        {userRole !== "utente" && (
          <button
            onClick={() => setIsCreatingGroup(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-2xs cursor-pointer transition-all active:scale-95"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Nuovo</span>
          </button>
        )}
      </div>

      {/* Lotti Active/Archive filters */}
      <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-[10px] font-bold">
        <button
          type="button"
          onClick={() => setLottiFilter("attivi")}
          className={`flex-1 py-1 rounded-lg transition-all cursor-pointer ${
            lottiFilter === "attivi" ? "bg-white text-indigo-700 shadow-3xs" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          Attivi
        </button>
        <button
          type="button"
          onClick={() => setLottiFilter("chiusi")}
          className={`flex-1 py-1 rounded-lg transition-all cursor-pointer ${
            lottiFilter === "chiusi" ? "bg-white text-indigo-700 shadow-3xs" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          Archiviati
        </button>
        <button
          type="button"
          onClick={() => setLottiFilter("tutti")}
          className={`flex-1 py-1 rounded-lg transition-all cursor-pointer ${
            lottiFilter === "tutti" ? "bg-white text-indigo-700 shadow-3xs" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          Tutti
        </button>
      </div>

      {/* Group List */}
      <div className="space-y-2 max-h-[500px] overflow-y-auto">
        {filteredGroups.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs">
            {lottiFilter === "attivi"
              ? "Nessun lotto di grading attivo."
              : lottiFilter === "chiusi"
              ? "Nessun lotto di grading chiuso/archiviato."
              : "Nessun lotto di grading configurato."}
          </div>
        ) : (
          filteredGroups.map((g) => {
            const isSelected = g.ID_Gruppo_Grading === selectedGroupId;
            const cardCount = filteredOggettiInGrading.filter((c) => c.ID_Gruppo_Grading === g.ID_Gruppo_Grading).length;
            return (
              <button
                key={g.ID_Gruppo_Grading}
                onClick={() => setSelectedGroupId(g.ID_Gruppo_Grading)}
                className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                  isSelected ? "bg-indigo-50/70 border-indigo-200" : "bg-slate-50/50 border-slate-200 hover:bg-slate-50"
                }`}
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex px-1.5 py-0.5 text-[9px] font-bold rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                      {g.Compagnia || "PSA/BGS"}
                    </span>
                    <span className="font-bold text-slate-800 text-sm truncate">{g.Nome_Gruppo}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-slate-400">
                    <span>Data: {g.Data_Creazione}</span>
                    <span>•</span>
                    <span className="font-semibold text-indigo-600">
                      {cardCount} {cardCount === 1 ? "carta" : "carte"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                      g.Stato_Gruppo === "In Preparazione"
                        ? "bg-amber-50 text-amber-700 border border-amber-100"
                        : g.Stato_Gruppo === "Spedito"
                        ? "bg-indigo-50 text-indigo-700 border border-indigo-100"
                        : g.Stato_Gruppo === "Ritornato"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                        : "bg-slate-100 text-slate-500 border border-slate-250"
                    }`}
                  >
                    {g.Stato_Gruppo}
                  </span>
                  <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
