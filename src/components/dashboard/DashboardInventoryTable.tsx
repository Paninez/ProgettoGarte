import React from "react";
import {
  ChevronDown,
  ChevronRight,
  Settings2,
  Edit,
  Download,
} from "lucide-react";
import { OggettoMagazzino } from "../../types";
import { formatCurrency, calculateROI } from "./dashboardUtils";

interface DashboardInventoryTableProps {
  tableData: Record<string, OggettoMagazzino[]>;
  filterPill: string;
  setFilterPill: (pill: string) => void;
  expandedGroups: Record<string, boolean>;
  toggleGroup: (groupName: string) => void;
  showCols: {
    sku: boolean;
    costo: boolean;
    roi: boolean;
    giacenza: boolean;
  };
  setShowCols: React.Dispatch<
    React.SetStateAction<{
      sku: boolean;
      costo: boolean;
      roi: boolean;
      giacenza: boolean;
    }>
  >;
  onNavigate: (tab: string) => void;
}

export function DashboardInventoryTable({
  tableData,
  filterPill,
  setFilterPill,
  expandedGroups,
  toggleGroup,
  showCols,
  setShowCols,
  onNavigate,
}: DashboardInventoryTableProps) {
  const exportArticleCsv = (item: OggettoMagazzino) => {
    const headers = [
      "ID Oggetto",
      "Nome",
      "Costo Acquisto (€)",
      "Prezzo Vendita (€)",
      "Quantita Disponibile",
      "Preordine",
    ];
    const row = [
      item.ID_Oggetto,
      item.Nome,
      item.Costo_Acquisto.toFixed(2),
      item.Prezzo_Vendita.toFixed(2),
      item.Quantità_Disponibile.toString(),
      item.Is_Preordine ? "Si" : "No",
    ];
    const escapeCsv = (val: string) =>
      val.includes(",") || val.includes('"') ? `"${val.replace(/"/g, '""')}"` : val;
    const csvContent = [headers.map(escapeCsv).join(","), row.map(escapeCsv).join(",")].join("\r\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `articolo_${item.ID_Oggetto}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* 2. GRANULAR MANAGEMENT */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-800 dark:text-slate-100">
            Inventario & Analisi Margini
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Vista raggruppata per serie/set con calcolo ROI e giacenze
          </p>
        </div>

        {/* Filters and toggles */}
        <div className="flex flex-wrap items-center gap-2">
          {["Tutti", "Box Sigillati", "Singole", "JAP", "ENG"].map((pill) => (
            <button
              key={pill}
              onClick={() => setFilterPill(pill)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                filterPill === pill
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50"
              }`}
            >
              {pill}
            </button>
          ))}

          {/* Columns Visibility dropdown/button */}
          <div className="relative group">
            <button className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5 hover:bg-slate-50 cursor-pointer">
              <Settings2 className="w-3.5 h-3.5" />
              <span>Colonne</span>
            </button>
            <div className="absolute right-0 mt-1 w-44 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg p-2 hidden group-hover:block z-10">
              <label className="flex items-center gap-2 p-1.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded cursor-pointer">
                <input
                  type="checkbox"
                  checked={showCols.sku}
                  onChange={(e) => setShowCols((c) => ({ ...c, sku: e.target.checked }))}
                />
                <span>Mostra ID / SKU</span>
              </label>
              <label className="flex items-center gap-2 p-1.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded cursor-pointer">
                <input
                  type="checkbox"
                  checked={showCols.costo}
                  onChange={(e) => setShowCols((c) => ({ ...c, costo: e.target.checked }))}
                />
                <span>Mostra Costo</span>
              </label>
              <label className="flex items-center gap-2 p-1.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded cursor-pointer">
                <input
                  type="checkbox"
                  checked={showCols.roi}
                  onChange={(e) => setShowCols((c) => ({ ...c, roi: e.target.checked }))}
                />
                <span>Mostra ROI Margin</span>
              </label>
              <label className="flex items-center gap-2 p-1.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded cursor-pointer">
                <input
                  type="checkbox"
                  checked={showCols.giacenza}
                  onChange={(e) => setShowCols((c) => ({ ...c, giacenza: e.target.checked }))}
                />
                <span>Mostra Giacenza</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Grouped Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                <th className="p-3 w-10"></th>
                <th className="p-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Nome Gruppo / Articolo
                </th>
                {showCols.sku && (
                  <th className="p-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    ID / SKU
                  </th>
                )}
                {showCols.costo && (
                  <th className="p-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-right">
                    Costo Acquisto
                  </th>
                )}
                <th className="p-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-right">
                  Prezzo Vendita
                </th>
                {showCols.roi && (
                  <th className="p-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-right">
                    ROI %
                  </th>
                )}
                {showCols.giacenza && (
                  <th className="p-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-center">
                    Giacenza
                  </th>
                )}
                <th className="p-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-center">
                  Azioni
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {Object.entries(tableData).map(([groupName, groupItems]) => {
                const items = groupItems as OggettoMagazzino[];
                const isExpanded = expandedGroups[groupName];
                const totalGiacenza = items.reduce((acc, curr) => acc + curr.Quantità_Disponibile, 0);

                return (
                  <React.Fragment key={groupName}>
                    {/* Parent Row */}
                    <tr
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors ${
                        isExpanded ? "bg-slate-50 dark:bg-slate-800/30" : ""
                      }`}
                      onClick={() => toggleGroup(groupName)}
                    >
                      <td className="p-3 text-slate-400">
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </td>
                      <td className="p-3 font-medium text-sm text-slate-800 dark:text-slate-200">
                        {groupName} <span className="text-[10px] text-slate-400 ml-2 font-normal">({items.length} varianti)</span>
                      </td>
                      {showCols.sku && <td></td>}
                      {showCols.costo && <td></td>}
                      <td></td>
                      {showCols.roi && <td></td>}
                      {showCols.giacenza && (
                        <td className="p-3 text-center">
                          <span className="font-mono text-xs font-bold text-slate-600 dark:text-slate-400">
                            {totalGiacenza}
                          </span>
                        </td>
                      )}
                      <td></td>
                    </tr>

                    {/* Children Rows */}
                    {isExpanded &&
                      items.map((item) => {
                        const roi = Number(calculateROI(item.Costo_Acquisto, item.Prezzo_Vendita));
                        const isLowStock = item.Quantità_Disponibile <= 3 && item.Quantità_Disponibile > 0;
                        const isOutOfStock = item.Quantità_Disponibile === 0;
                        return (
                          <tr
                            key={item.ID_Oggetto}
                            className="bg-white dark:bg-slate-900 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors"
                          >
                            <td className="p-3"></td>
                            <td className="p-3 pl-8 text-xs font-medium text-slate-600 dark:text-slate-300">
                              {item.Nome}
                            </td>

                            {showCols.sku && (
                              <td className="p-3 text-xs font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
                                {item.ID_Oggetto}
                              </td>
                            )}

                            {showCols.costo && (
                              <td className="p-3 text-xs font-mono text-right text-slate-600 dark:text-slate-400">
                                {formatCurrency(item.Costo_Acquisto)}
                              </td>
                            )}

                            <td className="p-3 text-xs font-mono font-bold text-right text-slate-800 dark:text-slate-200">
                              {formatCurrency(item.Prezzo_Vendita)}
                            </td>

                            {showCols.roi && (
                              <td
                                className={`p-3 text-xs font-mono font-bold text-right ${
                                  roi > 50 ? "text-emerald-600 dark:text-emerald-400" : "text-slate-600 dark:text-slate-400"
                                }`}
                              >
                                {roi}%
                              </td>
                            )}

                            {showCols.giacenza && (
                              <td className="p-3 text-center">
                                <span
                                  className={`inline-flex items-center justify-center px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                                    isOutOfStock
                                      ? "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400"
                                      : isLowStock
                                      ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                                      : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                                  }`}
                                >
                                  {item.Quantità_Disponibile}
                                </span>
                              </td>
                            )}
                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onNavigate("magazzino");
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded transition-colors"
                                  title="Modifica Inventario"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    exportArticleCsv(item);
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded transition-colors"
                                  title="Esporta CSV"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>

          {Object.keys(tableData).length === 0 && (
            <div className="p-12 text-center text-slate-500 dark:text-slate-400 text-sm">
              Nessun articolo corrispondente ai filtri selezionati.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
