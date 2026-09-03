import React, { useState, useEffect } from "react";
import { X, Calendar, DollarSign, Tag, FileText, Check, AlertCircle } from "lucide-react";
import { Finanza } from "../../types";

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTransaction: (transaction: Finanza) => Promise<void>;
  userRole: string;
}

const COMMON_ENTRATE_CATEGORIES = ["Vendita", "Rimborso", "Servizio", "Altro"];
const COMMON_USCITE_CATEGORIES = ["Acquisto Stock", "Spedizione", "Commissioni", "Utenze/Software", "Tasse", "Altro"];

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({
  isOpen,
  onClose,
  onAddTransaction,
  userRole,
}) => {
  const [tipo, setTipo] = useState<"Entrata" | "Uscita">("Uscita");
  const [importo, setImporto] = useState<string>("");
  const [data, setData] = useState<string>("");
  const [categoria, setCategoria] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [customCategory, setCustomCategory] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Set default date to today when modal opens
  useEffect(() => {
    if (isOpen) {
      const today = new Date().toISOString().split("T")[0];
      setData(today);
      setTipo("Uscita");
      setImporto("");
      setCategoria("");
      setCustomCategory("");
      setNote("");
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const categories = tipo === "Entrata" ? COMMON_ENTRATE_CATEGORIES : COMMON_USCITE_CATEGORIES;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (userRole !== "owner") {
      setError("Azione non consentita: solo l'utente Owner può registrare movimenti finanziari.");
      return;
    }

    const parsedImporto = parseFloat(importo);
    if (isNaN(parsedImporto) || parsedImporto <= 0) {
      setError("Inserisci un importo valido e maggiore di zero.");
      return;
    }

    if (!data) {
      setError("Seleziona una data valida.");
      return;
    }

    const finalCategory = (categoria === "Altro" || !categoria) ? (customCategory.trim() || "Altro") : categoria;

    setIsSubmitting(true);
    try {
      const newTx: Finanza = {
        Data: data,
        Tipo: tipo,
        Importo: parsedImporto,
        Categoria: finalCategory,
        Note: note.trim(),
      };

      await onAddTransaction(newTx);
      onClose();
    } catch (err: any) {
      console.error("Errore durante l'inserimento del movimento:", err);
      setError(err?.message || "Si è verificato un errore durante il salvataggio.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h2 className="text-sm font-black text-slate-800">Nuovo Movimento Manuale</h2>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mt-0.5">
              Registra un ingresso o una spesa extra
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {error && (
            <div className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-[11px] text-red-700 font-medium">
              <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Toggle Type (Entrata vs Uscita) */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
              Tipo Movimento
            </label>
            <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setTipo("Uscita");
                  setCategoria("");
                }}
                className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  tipo === "Uscita"
                    ? "bg-white text-rose-600 shadow-sm border border-slate-200/50 font-black"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Spesa (Uscita)
              </button>
              <button
                type="button"
                onClick={() => {
                  setTipo("Entrata");
                  setCategoria("");
                }}
                className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  tipo === "Entrata"
                    ? "bg-white text-emerald-600 shadow-sm border border-slate-200/50 font-black"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Ingresso (Entrata)
              </button>
            </div>
          </div>

          {/* Importo and Data row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Importo */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                Importo (€)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <DollarSign className="h-3.5 w-3.5 text-slate-400" />
                </div>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0.00"
                  value={importo}
                  onChange={(e) => setImporto(e.target.value)}
                  className="block w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white placeholder:text-slate-400 font-bold text-slate-700"
                />
              </div>
            </div>

            {/* Data */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                Data
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                </div>
                <input
                  type="date"
                  required
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                  className="block w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white font-medium text-slate-700"
                />
              </div>
            </div>
          </div>

          {/* Categoria Selection */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
              Categoria
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Tag className="h-3.5 w-3.5 text-slate-400" />
              </div>
              <select
                required
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="block w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white text-slate-700 font-medium cursor-pointer"
              >
                <option value="" disabled>Seleziona una categoria</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Custom Category if Altro is selected */}
          {(categoria === "Altro" || !categoria) && (
            <div className="space-y-1.5 animate-in slide-in-from-top-1.5 duration-100">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                Specifica Categoria
              </label>
              <input
                type="text"
                placeholder="E.g., Cancelleria, Riparazioni, etc."
                required={categoria === "Altro"}
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                className="block w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white text-slate-700 font-medium"
              />
            </div>
          )}

          {/* Note / Descrizione */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
              Note / Descrizione
            </label>
            <div className="relative">
              <div className="absolute top-2.5 left-3 pointer-events-none">
                <FileText className="h-3.5 w-3.5 text-slate-400" />
              </div>
              <textarea
                placeholder="Dettagli aggiuntivi sul movimento..."
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="block w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white text-slate-700 font-medium placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Actions Footer */}
          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100 mt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-4 py-2 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                tipo === "Entrata"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-rose-600 hover:bg-rose-700"
              } disabled:opacity-50`}
            >
              {isSubmitting ? (
                <span className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
              {isSubmitting ? "Salvataggio..." : "Registra Movimento"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
