import React from 'react';
import { 
  TrendingUp, 
  Package, 
  ShoppingCart, 
  Archive, 
  Award, 
  Database, 
  ShieldCheck 
} from 'lucide-react';

interface MobileHeaderProps {
  userRole: string;
  user: any;
  currentOperatore: string;
  activeTab: string;
}

export function MobileHeader({ userRole, user, currentOperatore, activeTab }: MobileHeaderProps) {
  return (
    <header className="lg:hidden bg-white border-b border-slate-200 px-3.5 py-2.5 flex items-center justify-between shadow-3xs z-30 shrink-0">
      <div className="flex items-center space-x-2.5 min-w-0">
        <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm shadow-indigo-600/20">
          M
        </div>
        <div className="min-w-0">
          <h1 className="text-xs font-bold text-slate-900 leading-none tracking-tight">ManagerHub</h1>
          <span className="text-[10px] text-indigo-600 font-bold leading-none block truncate mt-0.5">
            {userRole === "owner" ? `${user?.displayName || "Owner"} (Owner)` : currentOperatore}
          </span>
        </div>
      </div>
      
      {/* Active Section Indicator Pill */}
      <div className="min-w-0 flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-xl border border-slate-200/80">
        {activeTab === "dashboard" && <TrendingUp className="h-3.5 w-3.5 text-indigo-600 shrink-0" />}
        {activeTab === "magazzino" && <Package className="h-3.5 w-3.5 text-indigo-600 shrink-0" />}
        {activeTab === "carrelli" && <ShoppingCart className="h-3.5 w-3.5 text-indigo-600 shrink-0" />}
        {activeTab === "spedizioni" && <Archive className="h-3.5 w-3.5 text-indigo-600 shrink-0" />}
        {activeTab === "grading" && <Award className="h-3.5 w-3.5 text-indigo-600 shrink-0" />}
        {activeTab === "finanze" && <Database className="h-3.5 w-3.5 text-indigo-600 shrink-0" />}
        {activeTab === "sicurezza" && <ShieldCheck className="h-3.5 w-3.5 text-indigo-600 shrink-0" />}
        <span className="text-xs font-extrabold text-slate-800 truncate capitalize">
          {activeTab === "magazzino" ? "Magazzino Stock" :
           activeTab === "carrelli" ? "Ordini" :
           activeTab === "grading" ? "Gruppi Grading" :
           activeTab === "finanze" ? "Finanze" :
           activeTab === "sicurezza" ? "Sicurezza" : activeTab}
        </span>
      </div>
    </header>
  );
}
