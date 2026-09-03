import React from "react";
import { CheckCircle, X } from "lucide-react";

interface ImportReportNotificationProps {
  importReport: {
    importedRows: number;
    totalSourceRows: number;
    emailsNotLoaded: { clientName: string; itemDescription: string }[];
  } | null;
  onClose: () => void;
}

export function ImportReportNotification({ importReport, onClose }: ImportReportNotificationProps) {
  if (!importReport) return null;

  return (
    <div className="fixed top-6 right-6 z-[60] w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in slide-in-from-top-8 fade-in duration-300">
      <div className="p-4 flex items-start gap-4">
        <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl shrink-0 mt-0.5">
          <CheckCircle className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-bold text-slate-800">Importazione Completata</h4>
          <p className="text-xs text-slate-500 mt-1">
            {importReport.importedRows} righe aggiornate / create su {importReport.totalSourceRows} sorgenti.
          </p>

          {importReport.emailsNotLoaded.length > 0 && (
            <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
              <h5 className="text-[10px] font-bold text-amber-800 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                Avvisi Email ({importReport.emailsNotLoaded.length})
              </h5>
              <div className="text-[10px] text-amber-700/90 font-medium space-y-1 pr-1 max-h-20 overflow-y-auto">
                {importReport.emailsNotLoaded.map((p, i) => (
                  <div
                    key={i}
                    className="flex justify-between gap-2 border-b border-amber-200/50 pb-1 mb-1 last:border-0 last:pb-0 last:mb-0"
                  >
                    <span className="font-bold truncate">{p.clientName}</span>
                    <span className="truncate opacity-75">{p.itemDescription}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
