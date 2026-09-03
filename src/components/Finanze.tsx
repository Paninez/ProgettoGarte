import React, { useState, useMemo } from "react";
import { useDatabase } from "../context/DatabaseContext";
import { Wallet, Filter, Plus } from "lucide-react";
import { FinanzeProps, TabType, formatDate } from "./finanze/finanzeUtils";
import { FinanzeSummaryCards } from "./finanze/FinanzeSummaryCards";
import { VirtualizedFinanzaDesktop } from "./finanze/VirtualizedFinanzaDesktop";
import { VirtualizedFinanzaMobile } from "./finanze/VirtualizedFinanzaMobile";
import { AddTransactionModal } from "./finanze/AddTransactionModal";

export const Finanze: React.FC<FinanzeProps> = ({ onAddTransaction }) => {
  const { finanze, userRole } = useDatabase();
  const [activeTab, setActiveTab] = useState<TabType>("Tutti");
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const filteredFinanze = useMemo(() => {
    let filtered = finanze;
    if (activeTab !== "Tutti") {
      filtered = filtered.filter((f) => f.Tipo === activeTab);
    }
    if (searchTerm.trim()) {
      const lower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (f) =>
          (f.Categoria || "").toLowerCase().includes(lower) ||
          (f.Note || "").toLowerCase().includes(lower) ||
          (f.Data || "").includes(lower)
      );
    }
    return filtered.sort((a, b) => {
      const da = new Date(a.Data).getTime();
      const db = new Date(b.Data).getTime();
      if (!isNaN(da) && !isNaN(db)) return db - da;
      return 0;
    });
  }, [finanze, activeTab, searchTerm]);

  const totalEntrate = useMemo(
    () => finanze.filter((f) => f.Tipo === "Entrata").reduce((acc, curr) => acc + curr.Importo, 0),
    [finanze]
  );
  const totalUscite = useMemo(
    () => finanze.filter((f) => f.Tipo === "Uscita").reduce((acc, curr) => acc + curr.Importo, 0),
    [finanze]
  );
  const balance = totalEntrate - totalUscite;

  return (
    <div className="space-y-6" id="finanze-root">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <Wallet className="h-6 w-6 text-indigo-600" />
            Finanze
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">Gestione entrate e uscite</p>
        </div>
        {userRole === "owner" ? (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-sm hover:bg-indigo-700 transition-all cursor-pointer select-none w-full md:w-auto"
          >
            <Plus className="h-4 w-4" />
            Nuovo Movimento
          </button>
        ) : (
          <div className="text-[10px] bg-slate-100 text-slate-500 px-3 py-1.5 rounded-lg font-bold uppercase tracking-wider self-start md:self-end border border-slate-200">
            Solo Owner può aggiungere movimenti
          </div>
        )}
      </div>

      <FinanzeSummaryCards totalEntrate={totalEntrate} totalUscite={totalUscite} balance={balance} />

      <div className="bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50/50">
          <div className="flex bg-slate-100/80 p-1 rounded-xl w-full md:w-auto overflow-x-auto">
            {(["Tutti", "Entrata", "Uscita"] as TabType[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === tab
                    ? "bg-white text-indigo-700 shadow-sm border border-slate-200/50"
                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="relative w-full md:w-64 shrink-0">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Filter className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Filtra movimenti..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white shadow-xs transition-all placeholder:text-slate-400"
            />
          </div>
        </div>

        <div className="hidden md:block overflow-x-auto">
          <div className="w-full text-left">
            <div className="grid grid-cols-[120px_130px_140px_180px_1fr] text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200 bg-slate-50/60 px-6 py-3.5 items-center">
              <div>Data</div>
              <div>Tipo</div>
              <div className="text-right pr-4">Importo</div>
              <div>Categoria</div>
              <div>Note / Descrizione</div>
            </div>
            {filteredFinanze.length === 0 ? (
              <div className="px-6 py-12 text-center text-slate-400">
                <p className="font-semibold text-slate-600">Nessun movimento trovato.</p>
              </div>
            ) : (
              <VirtualizedFinanzaDesktop data={filteredFinanze} formatDate={formatDate} />
            )}
          </div>
        </div>

        <div className="md:hidden bg-white">
          {filteredFinanze.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">Nessun movimento trovato.</div>
          ) : (
            <VirtualizedFinanzaMobile data={filteredFinanze} formatDate={formatDate} />
          )}
        </div>

        <div className="p-3 bg-slate-50/60 border-t border-slate-200 text-[11px] font-semibold text-slate-500 text-right px-6">
          Mostrati {filteredFinanze.length} di {finanze.length} movimenti
        </div>
      </div>

      {onAddTransaction && (
        <AddTransactionModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onAddTransaction={onAddTransaction}
          userRole={userRole}
        />
      )}
    </div>
  );
};

export default React.memo(Finanze);
