import React, { useState } from 'react';
import {
  Menu, X, TrendingUp, Package, ShoppingCart, Archive, Award, Database, Crown, ShieldCheck, RefreshCw, Settings, LogOut, MoreHorizontal
} from 'lucide-react';
import { ThemeToggle } from '../ThemeToggle';

interface MobileMenuProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  dbLoading: boolean;
  handleLoadDatabase: () => void;
  setIsSettingsOpen: (isOpen: boolean) => void;
  userRole: string;
  user: any;
  currentOperatore: string;
  handleLogout: () => void;
}

export function MobileMenu({
  isSidebarOpen,
  setIsSidebarOpen,
  activeTab,
  setActiveTab,
  dbLoading,
  handleLoadDatabase,
  setIsSettingsOpen,
  userRole,
  user,
  currentOperatore,
  handleLogout
}: MobileMenuProps) {
  
  const mainTabs = [
    { id: "dashboard", label: "Home", icon: TrendingUp },
    { id: "magazzino", label: "Stock", icon: Package },
    { id: "carrelli", label: "Ordini", icon: ShoppingCart },
    { id: "spedizioni", label: "Spedizioni", icon: Archive },
  ];

  const secondaryTabs = [
    { id: "grading", label: "Gruppi Grading", icon: Award },
    { id: "finanze", label: "Registro Finanze", icon: Database },
    { id: "loyalty", label: "Loyalty & Reputation", icon: Crown },
    { id: "sicurezza", label: "Sicurezza & Audit", icon: ShieldCheck }
  ];

  return (
    <>
      {/* BOTTOM NAVIGATION BAR FOR MOBILE (iOS style) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-[90] pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.05)] select-none">
        <div className="flex items-center justify-between px-2 h-16">
          {mainTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setIsSidebarOpen(false);
                }}
                className={`flex-1 flex flex-col items-center justify-center h-full space-y-1 transition-colors active:bg-slate-50 cursor-pointer rounded-lg mx-1 ${
                  isActive ? "text-indigo-600" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                <Icon className={`h-5 w-5 ${isActive ? "fill-indigo-50/50 stroke-[2.5]" : "stroke-[2]"}`} />
                <span className={`text-[10px] font-medium tracking-tight ${isActive ? "font-bold" : ""}`}>
                  {tab.label}
                </span>
              </button>
            );
          })}
          
          <button
            onClick={() => setIsSidebarOpen(true)}
            className={`flex-1 flex flex-col items-center justify-center h-full space-y-1 transition-colors active:bg-slate-50 cursor-pointer rounded-lg mx-1 ${
              isSidebarOpen || secondaryTabs.some(t => t.id === activeTab) ? "text-indigo-600" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <Menu className={`h-5 w-5 ${(isSidebarOpen || secondaryTabs.some(t => t.id === activeTab)) ? "fill-indigo-50/50 stroke-[2.5]" : "stroke-[2]"}`} />
            <span className={`text-[10px] font-medium tracking-tight ${(isSidebarOpen || secondaryTabs.some(t => t.id === activeTab)) ? "font-bold" : ""}`}>
              Altro
            </span>
          </button>
        </div>
      </div>

      {/* EXPANDABLE MOBILE MENU DRAWER OVERLAY */}
      {isSidebarOpen && (
        <div className="lg:hidden">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 animate-fade-in cursor-pointer"
            onClick={() => setIsSidebarOpen(false)}
          />
          
          {/* iOS-style bottom sheet / drawer (can slide from bottom or right) - Using right slide as before, but full height minus safe areas */}
          <aside className="fixed inset-y-0 right-0 w-80 max-w-[85vw] bg-white shadow-2xl border-l border-slate-200 z-50 flex flex-col justify-between p-5 animate-slide-left pt-safe pb-safe select-none">
            <div className="space-y-4">
              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-base shadow-md shadow-indigo-600/20">
                    M
                  </div>
                  <div>
                    <h1 className="text-sm font-extrabold tracking-tight text-indigo-900 uppercase">ManagerHub</h1>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Gestione Spedizioni</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full transition-all cursor-pointer active:scale-95"
                  title="Chiudi menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Quick Utilities Grid */}
              <div className="space-y-1.5 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider px-0.5">
                  Strumenti & Opzioni
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleLoadDatabase()}
                    disabled={dbLoading}
                    className="flex flex-col items-center justify-center p-2 bg-white hover:bg-indigo-50 text-slate-700 rounded-xl border border-slate-200/80 transition-all cursor-pointer active:scale-95 shadow-sm"
                    title="Sincronizza Database"
                  >
                    <RefreshCw className={`h-4 w-4 mb-1 ${dbLoading ? "animate-spin text-indigo-600" : "text-indigo-600"}`} />
                    <span className="text-[9px] font-bold leading-tight">Sincronizza</span>
                  </button>
                  
                  <div className="flex flex-col items-center justify-center p-1 bg-white hover:bg-indigo-50 rounded-xl border border-slate-200/80 transition-all cursor-pointer shadow-sm">
                    <div className="h-6 flex items-center justify-center">
                      <ThemeToggle />
                    </div>
                    <span className="text-[9px] font-bold leading-tight text-slate-700 mt-0.5">Notte</span>
                  </div>
                    
                  <button
                    type="button"
                    onClick={() => {
                      setIsSettingsOpen(true);
                      setIsSidebarOpen(false);
                    }}
                    className="flex flex-col items-center justify-center p-2 bg-white hover:bg-indigo-50 text-slate-700 rounded-xl border border-slate-200/80 transition-all cursor-pointer active:scale-95 shadow-sm"
                    title="Backup e Configurazione"
                  >
                    <Settings className="h-4 w-4 mb-1 text-indigo-600" />
                    <span className="text-[9px] font-bold leading-tight">Backup</span>
                  </button>
                </div>
              </div>

              {/* Drawer Navigation Links */}
              <nav className="space-y-1.5 overflow-y-auto max-h-[50vh] pr-1 hide-scrollbar">
                <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2 px-1">
                  Altre Funzioni
                </div>
                {secondaryTabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id);
                        setIsSidebarOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl text-sm font-medium transition-all cursor-pointer active:scale-[0.98] ${
                        isActive
                          ? "bg-indigo-50 text-indigo-700 font-semibold"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      <Icon className={`h-5 w-5 ${isActive ? "text-indigo-600" : "text-slate-400"}`} />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
            
            {/* User Profile / Logout (Bottom of Drawer) */}
            <div className="mt-auto pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl">
                <div className="flex items-center space-x-3 overflow-hidden">
                  <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold shrink-0">
                    {currentOperatore.charAt(0).toUpperCase()}
                  </div>
                  <div className="truncate">
                    <p className="text-xs font-bold text-slate-700 truncate">{currentOperatore}</p>
                    <p className="text-[10px] text-slate-500 uppercase font-semibold">{userRole}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    handleLogout();
                    setIsSidebarOpen(false);
                  }}
                  className="p-2 text-rose-500 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer active:scale-95 shrink-0"
                  title="Logout"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
