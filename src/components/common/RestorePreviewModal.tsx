import React, { useState } from 'react';
import { 
  X, 
  Database, 
  Package, 
  ShoppingCart, 
  Receipt, 
  Truck, 
  DollarSign, 
  Layers, 
  Award, 
  Tag, 
  Users, 
  AlertTriangle, 
  CheckCircle, 
  FileJson,
  Cloud,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { verifyBackupIntegrity } from '../../lib/dataValidation';

interface RestorePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (sanitizedData: any) => Promise<void> | void;
  backupData: any;
  fileName: string;
  isCloud?: boolean;
}

export const RestorePreviewModal: React.FC<RestorePreviewModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  backupData,
  fileName,
  isCloud = false,
}) => {
  const [showWarnings, setShowWarnings] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  if (!isOpen || !backupData) return null;

  // Run integrity check on the parsed backup JSON
  const integrity = verifyBackupIntegrity(backupData);
  const { valid, errors, stats } = integrity;
  
  // Calculate total records in the backup
  const totalRecords = Object.values(stats).reduce((sum, count) => sum + count, 0);

  // Setup list of categories to display with translations, icons, and colors
  const categories = [
    {
      key: 'Magazzino',
      label: 'Magazzino / Inventario',
      description: 'Prodotti, carte singole, preordini, e storico costi lotto.',
      icon: Package,
      colorClass: 'text-blue-600 bg-blue-50 border-blue-100',
    },
    {
      key: 'Carrelli',
      label: 'Carrelli Clienti',
      description: 'Anagrafiche clienti, stato del carrello, strikes e tags.',
      icon: ShoppingCart,
      colorClass: 'text-emerald-600 bg-emerald-50 border-emerald-100',
    },
    {
      key: 'Dettagli',
      label: 'Dettagli Carrelli',
      description: 'Associazioni tra prodotti in magazzino e singoli carrelli.',
      icon: Receipt,
      colorClass: 'text-indigo-600 bg-indigo-50 border-indigo-100',
    },
    {
      key: 'Spedizioni',
      label: 'Spedizioni e Consegne',
      description: 'Logistica di spedizione, codici di tracking, e stati di consegna.',
      icon: Truck,
      colorClass: 'text-purple-600 bg-purple-50 border-purple-100',
    },
    {
      key: 'Finanze',
      label: 'Registrazioni di Cassa',
      description: 'Entrate, uscite, flussi monetari e note finanziarie.',
      icon: DollarSign,
      colorClass: 'text-amber-600 bg-amber-50 border-amber-100',
    },
    {
      key: 'Gruppi_Grading',
      label: 'Gruppi Grading',
      description: 'Lotti di carte raggruppati per l\'invio agli enti di certificazione.',
      icon: Layers,
      colorClass: 'text-cyan-600 bg-cyan-50 border-cyan-100',
    },
    {
      key: 'Oggetti_Grading',
      label: 'Oggetti in Grading',
      description: 'Singole carte in processo di gradazione, costi e foto correlate.',
      icon: Award,
      colorClass: 'text-rose-600 bg-rose-50 border-rose-100',
    },
    {
      key: 'Listino_Grading',
      label: 'Listino Servizi Grading',
      description: 'Prezzario dei servizi di grading clienti vs acquisto.',
      icon: Tag,
      colorClass: 'text-teal-600 bg-teal-50 border-teal-100',
    },
    {
      key: 'Utenti',
      label: 'Utenti Registrati',
      description: 'Account e email registrate con relativi ruoli autorizzativi.',
      icon: Users,
      colorClass: 'text-slate-600 bg-slate-100 border-slate-200',
    },
  ];

  const handleExecuteRestore = async () => {
    setIsConfirming(true);
    try {
      // Pass the sanitized data payload or original if missing
      await onConfirm(backupData);
      onClose();
    } catch (err) {
      console.error("[RestorePreviewModal] Errore nel ripristino:", err);
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-100">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-slate-800 rounded-xl border border-slate-700">
              {isCloud ? (
                <Cloud className="h-6 w-6 text-sky-400" />
              ) : (
                <FileJson className="h-6 w-6 text-amber-400" />
              )}
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">Anteprima Ripristino Database</h3>
              <p className="text-xs text-slate-400 font-mono mt-0.5 truncate max-w-md sm:max-w-xl">
                File: {fileName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isConfirming}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          
          {/* Integrity Banner */}
          {valid ? (
            <div className="flex items-start space-x-3 p-3.5 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl">
              <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-900">Formato Valido</p>
                <p className="text-xs leading-normal text-emerald-700 mt-0.5">
                  L'integrità del file è stata verificata con successo. Tutti i campi obbligatori sono presenti e formattati correttamente.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-amber-50 border-2 border-amber-200 rounded-xl space-y-3">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs font-bold uppercase tracking-wider text-amber-900">Anomalie di Integrità Rilevate</p>
                  <p className="text-xs leading-normal text-amber-700 mt-0.5">
                    Il file presenta {errors.length} anomalie di formato o campi non standard. È possibile procedere lo stesso effettuando un ripristino parziale/sanitizzato dei dati validi.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowWarnings(!showWarnings)}
                  className="flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold text-amber-800 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors cursor-pointer"
                >
                  <span>{showWarnings ? 'Nascondi' : 'Mostra'}</span>
                  {showWarnings ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </button>
              </div>

              {showWarnings && (
                <div className="bg-white border border-amber-200 rounded-lg p-3 max-h-36 overflow-y-auto font-mono text-[11px] text-slate-700 space-y-1 divide-y divide-amber-100/60 shadow-inner">
                  {errors.map((error, idx) => (
                    <div key={idx} className="pt-1 first:pt-0 text-amber-800">
                      • {error}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Records Summary Title */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center justify-between">
              <span>Riepilogo Dati del File ({totalRecords} record totali)</span>
              <span className="font-mono text-slate-400 text-[10px] normal-case bg-slate-100 px-2 py-0.5 rounded-full">
                Sorgente: {isCloud ? 'Google Drive (Cloud)' : 'File Locale'}
              </span>
            </h4>

            {/* Grid of database sections */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {categories.map((cat) => {
                const count = stats[cat.key] || 0;
                const Icon = cat.icon;
                return (
                  <div 
                    key={cat.key}
                    className={`p-3 rounded-xl border flex items-start justify-between transition-all ${
                      count > 0 
                        ? 'bg-white border-slate-200/80 shadow-xs hover:border-slate-300' 
                        : 'bg-slate-50/50 border-slate-100 opacity-60'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className={`p-2 rounded-lg border ${cat.colorClass}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold text-slate-800">{cat.label}</p>
                        <p className="text-[10px] text-slate-500 leading-normal max-w-[200px]">
                          {cat.description}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs font-bold font-mono px-2 py-1 rounded-lg ${
                        count > 0 
                          ? 'bg-slate-900 text-white' 
                          : 'bg-slate-200 text-slate-500'
                      }`}>
                        {count}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {integrity.sanitized?.config && (
              <div className="mt-4 p-3 bg-indigo-50 border border-indigo-100 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between text-indigo-900 gap-2">
                <div className="flex items-start sm:items-center space-x-2 text-[11px] leading-relaxed">
                  <span className="flex h-2 w-2 rounded-full bg-indigo-500 animate-pulse shrink-0 mt-1 sm:mt-0" />
                  <div>
                    <span className="font-bold">Impostazioni Locali Rilevate:</span>{' '}
                    <span className="text-indigo-700">Il backup include i contatti dei gestori, i promemoria di pagamento, il tema dell'app e la cronologia email PayPal Gmail.</span>
                  </div>
                </div>
                <span className="shrink-0 text-[9px] font-extrabold uppercase bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full self-start sm:self-center select-none">
                  Sincronizzato
                </span>
              </div>
            )}
          </div>

          {/* Overwrite Danger Alert */}
          <div className="p-4 bg-red-50 border-2 border-red-100 rounded-xl flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-red-900">Pericolo: Sovrascrittura dei Dati</p>
              <p className="text-xs leading-relaxed text-red-700 mt-1">
                Confermando, i dati attualmente presenti sul foglio di calcolo Google Sheet attivo <strong className="text-red-900 font-bold">verranno eliminati e sostituiti</strong> con quelli mostrati in questa anteprima.
              </p>
              <p className="text-xs leading-relaxed text-red-700 mt-1.5 font-medium">
                🛡️ <span className="underline">Protezione Attiva</span>: Un backup d'emergenza automatico verrà salvato in Google Drive prima di procedere.
              </p>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 shrink-0 flex flex-col sm:flex-row gap-3 justify-between items-center">
          <button
            type="button"
            onClick={onClose}
            disabled={isConfirming}
            className="w-full sm:w-auto px-4 py-2.5 bg-slate-200 hover:bg-slate-300 disabled:opacity-50 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Annulla
          </button>

          <button
            type="button"
            onClick={handleExecuteRestore}
            disabled={isConfirming}
            className="w-full sm:w-auto flex items-center justify-center space-x-2 px-6 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white shadow-md shadow-red-600/10 hover:shadow-red-700/20 active:scale-98 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            <Database className="h-4 w-4" />
            <span>
              {isConfirming ? 'Ripristino in corso...' : 'Sì, Sovrascrivi e Ripristina'}
            </span>
          </button>
        </div>

      </div>
    </div>
  );
};
