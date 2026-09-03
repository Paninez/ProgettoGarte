import React from "react";
import { DashboardProps } from "./dashboard/dashboardUtils";
import { useDashboardLogic } from "./dashboard/useDashboardLogic";
import { DashboardKPIs } from "./dashboard/DashboardKPIs";
import { DashboardChart } from "./dashboard/DashboardChart";
import { DashboardInventoryTable } from "./dashboard/DashboardInventoryTable";

const Dashboard: React.FC<DashboardProps> = ({ onNavigate, userRole }) => {
  const {
    stats,
    chartData,
    filterPill,
    setFilterPill,
    expandedGroups,
    toggleGroup,
    showCols,
    setShowCols,
    tableData,
  } = useDashboardLogic();

  return (
    <div
      className="min-h-[100dvh] bg-[#F1F5F9] dark:bg-[#121212] text-slate-900 dark:text-slate-100 p-6 font-sans transition-colors duration-300 pb-[calc(6rem+env(safe-area-inset-bottom))]"
      id="dashboard-root"
    >
      {/* 1. ABOVE THE FOLD - WIDGETS */}
      <div className="mb-8 space-y-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-white">
          Dashboard Magazzino
        </h1>

        <DashboardKPIs stats={stats} onNavigate={onNavigate} />

        <DashboardChart chartData={chartData} />
      </div>

      {/* 2. GRANULAR MANAGEMENT & GROUPED TABLE */}
      <DashboardInventoryTable
        tableData={tableData}
        filterPill={filterPill}
        setFilterPill={setFilterPill}
        expandedGroups={expandedGroups}
        toggleGroup={toggleGroup}
        showCols={showCols}
        setShowCols={setShowCols}
        onNavigate={onNavigate}
      />
    </div>
  );
};

export default React.memo(Dashboard);
