import React from "react";
import { FolderOpen, X } from "lucide-react";

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  newGroupName: string;
  setNewGroupName: (name: string) => void;
  handleCreateGroup: (e: React.FormEvent) => Promise<void>;
  saveLoading: boolean;
}

export function CreateGroupModal({
  isOpen,
  onClose,
  newGroupName,
  setNewGroupName,
  handleCreateGroup,
  saveLoading,
}: CreateGroupModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-150 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
              <FolderOpen className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg">Nuovo Lotto Grading</h3>
              <p className="text-xs text-slate-400 font-medium">Crea un gruppo per raggruppare le spedizioni</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleCreateGroup} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Nome del Lotto / Spedizione</label>
            <input
              type="text"
              placeholder="Es. PSA Express Marzo 2025"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              autoFocus
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-150">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={saveLoading || !newGroupName.trim()}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 shadow-md hover:shadow-lg shadow-indigo-100"
            >
              {saveLoading ? "Creazione in corso..." : "Crea Lotto"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
