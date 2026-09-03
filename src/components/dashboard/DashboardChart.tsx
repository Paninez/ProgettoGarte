import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from "recharts";
import { MonthlyFinancialPoint, formatCurrency } from "./dashboardUtils";

interface DashboardChartProps {
  chartData: MonthlyFinancialPoint[];
}

export function DashboardChart({ chartData }: DashboardChartProps) {
  return (
    <div className="bg-white dark:bg-slate-900 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Trend Finanziario Mensile
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Entrate, Uscite e Utile Netto nel tempo</p>
        </div>
      </div>

      <div className="h-72 w-full">
        {chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-slate-400">
            Dati finanziari insufficienti per generare il grafico.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={100}>
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `€${v}`} />
              <Tooltip
                formatter={(value: any) => formatCurrency(Number(value))}
                contentStyle={{
                  backgroundColor: "rgba(15, 23, 42, 0.9)",
                  borderRadius: "8px",
                  border: "none",
                  color: "#fff",
                  fontSize: "12px",
                }}
              />
              <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
              <ReferenceLine y={0} stroke="#94a3b8" />
              <Bar dataKey="Entrate" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
              <Bar dataKey="Uscite" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
              <Bar dataKey="Utile" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
