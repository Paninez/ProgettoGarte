import React, { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Finanza } from "../../types";
import { TrendingUp, TrendingDown } from "lucide-react";

interface VirtualizedFinanzaDesktopProps {
  data: Finanza[];
  formatDate: (date: string) => string;
}

export function VirtualizedFinanzaDesktop({ data, formatDate }: VirtualizedFinanzaDesktopProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 52,
    overscan: 10,
  });

  return (
    <div ref={parentRef} style={{ height: "calc(100vh - 200px)", overflow: "auto", width: "100%" }}>
      <div style={{ height: `${virtualizer.getTotalSize()}px`, width: "100%", position: "relative" }}>
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const item = data[virtualRow.index];
          const isIncome = item.Tipo === "Entrata";
          return (
            <div
              key={virtualRow.index}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
              className="flex items-center px-6 py-2 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0"
            >
              <div className="w-[120px] text-xs text-slate-500 font-medium">{formatDate(item.Data)}</div>
              <div className="w-[130px]">
                <span
                  className={`inline-flex items-center px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                    isIncome
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-rose-50 text-rose-700 border border-rose-200"
                  }`}
                >
                  {isIncome ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                  {item.Tipo}
                </span>
              </div>
              <div className="w-[140px] text-right pr-4 font-mono font-bold text-slate-700 text-sm">
                {isIncome ? "+" : "-"}€{Math.abs(item.Importo).toFixed(2)}
              </div>
              <div className="w-[180px]">
                <span className="inline-block px-2 py-1 bg-slate-100 text-slate-600 rounded text-[10px] font-bold uppercase tracking-wider">
                  {item.Categoria || "N/D"}
                </span>
              </div>
              <div className="flex-1 text-xs text-slate-600 truncate pr-4" title={item.Note}>
                {item.Note || "-"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
