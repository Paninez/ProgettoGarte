import React, { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Finanza } from "../../types";
import { TrendingUp, TrendingDown } from "lucide-react";

interface VirtualizedFinanzaMobileProps {
  data: Finanza[];
  formatDate: (date: string) => string;
}

export function VirtualizedFinanzaMobile({ data, formatDate }: VirtualizedFinanzaMobileProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 88,
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
              className="p-4 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors"
            >
              <div className="flex justify-between items-start mb-2">
                <div className="text-xs font-medium text-slate-500">{formatDate(item.Data)}</div>
                <div
                  className={`text-sm font-bold flex items-center ${
                    isIncome ? "text-emerald-600" : "text-rose-600"
                  }`}
                >
                  {isIncome ? <TrendingUp className="w-3.5 h-3.5 mr-1" /> : <TrendingDown className="w-3.5 h-3.5 mr-1" />}
                  {isIncome ? "+" : "-"}€{Math.abs(item.Importo).toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-800 line-clamp-1">{item.Categoria || "N/D"}</div>
                <div className="text-[10px] text-slate-500 mt-1 line-clamp-2">{item.Note}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
