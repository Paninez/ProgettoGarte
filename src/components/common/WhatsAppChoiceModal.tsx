import React, { useState, useEffect } from 'react';
import { 
  MessageCircle, 
  X, 
  Copy, 
  Check, 
  Phone, 
  Send 
} from 'lucide-react';
import { 
  sendWhatsAppMessage, 
  formatPhoneForWhatsApp 
} from '../../lib/whatsapp';

interface WhatsAppChoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: string;
  phone?: string;
  clientName?: string;
  orderId?: string;
  onSavePhone?: (newPhone: string) => Promise<void> | void;
}

export const WhatsAppChoiceModal: React.FC<WhatsAppChoiceModalProps> = ({
  isOpen,
  onClose,
  message,
  phone = '',
  clientName = '',
  orderId = '',
  onSavePhone,
}) => {
  const [phoneInput, setPhoneInput] = useState(phone);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPhoneInput(phone);
      setCopied(false);
    }
  }, [isOpen, phone]);

  if (!isOpen) return null;

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text', err);
    }
  };

  const handleSend = () => {
    // Save phone if provided and changed
    if (onSavePhone && phoneInput !== phone && phoneInput.trim().length > 0) {
      onSavePhone(phoneInput.trim());
    }
    sendWhatsAppMessage(message, phoneInput);
    onClose();
  };

  const formattedPhone = formatPhoneForWhatsApp(phoneInput);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] border border-slate-100">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-600 to-green-600 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/10 rounded-xl backdrop-blur-sm">
              <MessageCircle className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">Invia Messaggio WhatsApp</h3>
              <p className="text-xs text-emerald-100 font-medium">
                {clientName ? `Per ${clientName}` : 'Invia riepilogo al cliente'} {orderId ? `(#${orderId})` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-5 flex-1">
          {/* Phone Number Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
              <span>Numero di Telefono Destinatario</span>
              {formattedPhone && (
                <span className="text-[10px] text-emerald-600 font-mono font-semibold">
                  Formattato: +{formattedPhone}
                </span>
              )}
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="es. 393331234567 o 3331234567"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-base sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none font-mono"
              />
            </div>
            {!formattedPhone && (
              <p className="text-[11px] text-amber-600 bg-amber-50 p-2 rounded-lg border border-amber-200">
                ⚠️ Nessun numero specificato. WhatsApp si aprirà per permetterti di selezionare il contatto manualmente.
              </p>
            )}
          </div>

          {/* Preview of Formatted Message */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Anteprima Messaggio:
              </label>
              <button
                type="button"
                onClick={handleCopyText}
                className="flex items-center space-x-1 text-xs text-slate-600 hover:text-emerald-600 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-lg transition-colors"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copied ? 'Copiato!' : 'Copia testo'}</span>
              </button>
            </div>
            <div className="bg-slate-900 text-slate-100 p-3.5 rounded-xl text-xs font-mono whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed border border-slate-800 shadow-inner">
              {message}
            </div>
          </div>

        </div>

        {/* Footer Action Buttons */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 shrink-0 flex justify-end gap-2 items-center">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Annulla
          </button>
          
          <button
            type="button"
            onClick={handleSend}
            className="flex items-center justify-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all active:scale-95 cursor-pointer"
          >
            <Send className="h-4 w-4" />
            <span>Apri in WhatsApp</span>
          </button>
        </div>

      </div>
    </div>
  );
};
