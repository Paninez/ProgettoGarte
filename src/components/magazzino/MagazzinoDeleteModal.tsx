import React from "react";
import { Trash2 } from "lucide-react";
import { OggettoMagazzino } from "../../types";

interface MagazzinoDeleteModalProps {
  itemIdToDelete: string | null;
  items: OggettoMagazzino[];
  deleteConfirmText: string;
  setDeleteConfirmText: (text: string) => void;
  loading: boolean;
  onClose: () => void;
  onConfirmDelete: () => Promise<void>;
}

export function MagazzinoDeleteModal({
  itemIdToDelete,
  items,
  deleteConfirmText,
  setDeleteConfirmText,
  loading,
  onClose,
  onConfirmDelete,
}: MagazzinoDeleteModalProps) {
  if (!itemIdToDelete) return null;

  const targetItem = items.find((item) => item.ID_Oggetto === itemIdToDelete);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-md p-6 md:p-8 space-y-6 animate-slide-up text-slate-900">
        <div className="flex items-center space-x-3 text-rose-600">
          <div className="p-2.5 bg-rose-50 rounded-2xl">
            <Trash2 className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-base font-bold uppercase tracking-tight">Conferma Eliminazione Articolo</h3>
            <p className="text-[11px] text-slate-400 font-bold">
              Questa operazione è irreversibile e impatterà le giacenze correnti.
            </p>
          </div>
        </div>

        <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 text-xs leading-relaxed text-rose-800">
          <p className="font-semibold">ATTENZIONE:</p>
          <p className="mt-1">
            Stai eliminando l'articolo <strong>{targetItem?.Nome || itemIdToDelete}</strong> (ID: {itemIdToDelete}) dal
            magazzino.
          </p>
          <p className="mt-2 font-medium">
            Per procedere, digita la parola{" "}
            <strong className="font-extrabold bg-white px-1.5 py-0.5 border border-rose-150 rounded text-rose-900">
              ELIMINA
            </strong>{" "}
            in lettere maiuscole nel campo sottostante:
          </p>
        </div>

        <div className="space-y-2">
          <input
            type="text"
            placeholder="ELIMINA"
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-center text-sm font-bold tracking-widest uppercase focus:ring-2 focus:ring-rose-500 focus:border-rose-500 focus:outline-none text-slate-900 bg-white"
            disabled={loading}
          />
        </div>

        <div className="flex space-x-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-600 uppercase tracking-wider transition-all cursor-pointer"
          >
            Annulla
          </button>
          <button
            type="button"
            disabled={deleteConfirmText !== "ELIMINA" || loading}
            onClick={onConfirmDelete}
            className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-md shadow-rose-100"
          >
            {loading ? "Eliminazione..." : "Sì, Elimina"}
          </button>
        </div>
      </div>
    </div>
  );
}
