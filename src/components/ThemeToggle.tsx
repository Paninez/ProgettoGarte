import React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "../hooks/useTheme";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="flex items-center justify-center w-full h-full p-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 active:scale-95 rounded-xl border border-slate-150 dark:border-slate-700 transition-all cursor-pointer bg-white dark:bg-slate-900 shadow-3xs"
      title="Cambia Tema"
    >
      {theme === "light" ? (
        <Moon className="h-4 w-4 text-slate-500" />
      ) : (
        <Sun className="h-4 w-4 text-amber-500" />
      )}
    </button>
  );
}
