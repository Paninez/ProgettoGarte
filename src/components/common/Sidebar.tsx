import React from 'react';
import { 
  TrendingUp, 
  Package, 
  ShoppingCart, 
  Archive, 
  Award, 
  Database, 
  Crown, 
  ShieldCheck, 
  LogOut 
} from 'lucide-react';
import { ThemeToggle } from '../ThemeToggle';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userRole: string;
  user: any;
  currentOperatore: string;
  handleLogout: () => void;
}

export function Sidebar({
  activeTab,
  setActiveTab,
  userRole,
  user,
  currentOperatore,
  handleLogout
}: SidebarProps) {
  return (
    <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-slate-200 p-6 justify-between shrink-0">
      <div className="space-y-8">
        {/* Logo Brand */}
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
            M
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-indigo-900 uppercase">ManagerHub</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Gestione Spedizioni</p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="space-y-1">
          {[
            { id: "dashboard", label: "Dashboard", icon: TrendingUp },
            { id: "magazzino", label: "Magazzino Stock", icon: Package },
            { id: "carrelli", label: "Ordini", icon: ShoppingCart },
            { id: "spedizioni", label: "Spedizioni", icon: Archive },
            { id: "grading", label: "Gruppi Grading", icon: Award },
            { id: "finanze", label: "Registro Finanze", icon: Database },
            { id: "loyalty", label: "Loyalty & Rep", icon: Crown },
            { id: "sicurezza", label: "Sicurezza & Audit", icon: ShieldCheck }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? "bg-indigo-50 text-indigo-700 font-semibold"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? "text-indigo-600" : "text-slate-400"}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* User profile & operator switch */}
      <div className="space-y-4 pt-6 border-t border-slate-100">
        <div className="bg-slate-50 rounded-xl p-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-700 font-semibold text-xs text-center">
            {user?.displayName?.slice(0, 2).toUpperCase() || "GA"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {userRole === "owner" ? "Owner" : "Operatore"}
            </p>
            <p className="text-sm font-semibold text-indigo-600 truncate">
              {userRole === "owner" ? (user?.displayName || "Owner") : currentOperatore}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <div className="flex-1">
            <ThemeToggle />
          </div>
          <button
            onClick={handleLogout}
            className="flex-1 flex justify-center items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50/50 transition-colors border border-rose-100"
          >
            <LogOut className="h-3.5 w-3.5 text-rose-500" />
            <span>Esci</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
