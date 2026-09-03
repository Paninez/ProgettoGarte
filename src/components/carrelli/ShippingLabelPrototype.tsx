import React, { useState, useEffect } from "react";
import {
  Printer,
  Copy,
  Check,
  MessageCircle,
  Truck,
  MapPin,
  User,
  Phone,
  QrCode,
  ChevronDown,
  ChevronUp,
  FileText,
  Edit3,
  X,
} from "lucide-react";
import { GradingItem } from "../../types";

interface ShippingLabelPrototypeProps {
  cartId: string;
  clientName: string;
  clientPhone: string;
  clientAddress: string;
  cartStatus: string;
  shipmentStatus?: string;
  trackingNumber?: string;
  groupedCartItems?: any[];
  activeGradingItems?: GradingItem[];
  cartTotals?: {
    totaleCarrello: number;
    totalePagato: number;
    totaleAcconti?: number;
    rimanenza: number;
  };
  tags?: string;
  note?: string;
  onExportWhatsApp: () => void;
  isExportingWa?: boolean;
  onUpdateAddress?: (newAddress: string) => void | Promise<void>;
  onUpdateNote?: (newNote: string) => void | Promise<void>;
}

export const ShippingLabelPrototype: React.FC<ShippingLabelPrototypeProps> = ({
  cartId,
  clientName,
  clientPhone,
  clientAddress,
  cartStatus,
  shipmentStatus,
  trackingNumber,
  cartTotals,
  tags = "",
  note = "",
  onExportWhatsApp,
  isExportingWa = false,
  onUpdateAddress,
  onUpdateNote,
}) => {
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  // Local interactive address state
  const [currentAddress, setCurrentAddress] = useState(clientAddress || "");
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [tempAddress, setTempAddress] = useState(clientAddress || "");

  // Local interactive note state
  const [currentNote, setCurrentNote] = useState(note || "");
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [tempNote, setTempNote] = useState(note || "");

  useEffect(() => {
    if (!isEditingAddress) {
      setCurrentAddress(clientAddress || "");
    }
  }, [clientAddress, isEditingAddress]);

  useEffect(() => {
    if (!isEditingNote) {
      setCurrentNote(note || "");
    }
  }, [note, isEditingNote]);

  const daPagare = cartTotals ? Math.max(0, cartTotals.rimanenza) : 0;
  const isFullyPaid = daPagare <= 0.01;

  // Format clean copyable text for shipping label (strictly recipient data + internal order ID)
  const generateLabelText = () => {
    let text = `========================================\n`;
    text += `   JANA NO SEKAI - ETICHETTA SPEDIZIONE  \n`;
    text += `========================================\n`;
    text += `NUMERO SPEDIZIONE: #${cartId}\n`;
    text += `----------------------------------------\n`;
    text += `DESTINATARIO:\n`;
    text += `Nome e Cognome: ${clientName || "Non specificato"}\n`;
    text += `Tel: ${clientPhone || "Non specificato"}\n`;
    text += `Indirizzo Spedizione: ${clientAddress || "Non specificato"}\n`;
    if (currentNote && currentNote.trim()) {
      text += `----------------------------------------\n`;
      text += `NOTE / ISTRUZIONI: ${currentNote.trim()}\n`;
    }
    text += `========================================\n`;

    return text;
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(generateLabelText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    // Dedicated clean printable pop-up window optimized for A5 Portrait stacking
    const printWindow = window.open("", "_blank", "width=850,height=980");
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Etichetta Spedizione</title>
          <style>
            @page { 
              size: A5 portrait; 
              margin: 4mm; 
            }
            body { 
              font-family: "Arial Narrow", "sans-serif-condensed", sans-serif; 
              font-stretch: condensed;
              margin: 0; 
              padding: 3px; 
              color: #000; 
              background: #fff; 
              display: flex;
              flex-direction: column;
              align-items: center;
            }
            /* Stackable narrow A5 shipping label container */
            .label-box { 
              width: 134mm; 
              height: 96mm; 
              border: 3.5px solid #000; 
              padding: 6px; 
              box-sizing: border-box; 
              display: flex;
              flex-direction: column;
              page-break-inside: avoid;
              margin-bottom: 6mm; /* Allows clean spacing for stacking multiple labels */
            }
            .upper-half {
              height: 53%;
              border-bottom: 2.5px dashed #000;
              display: flex;
              flex-direction: column;
              gap: 3px;
              box-sizing: border-box;
              padding-bottom: 5px;
            }
            .lower-half {
              height: 47%;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              box-sizing: border-box;
              padding-top: 5px;
            }
            .recipient-title { 
              font-size: 10px; 
              font-weight: 900; 
              text-transform: uppercase; 
              letter-spacing: 0.5px; 
              color: #000; 
              border-bottom: 1.5px solid #000; 
              padding-bottom: 1px; 
            }
            .recipient-name { 
              font-size: 28px; 
              font-weight: 950; 
              text-transform: uppercase; 
              margin: 0; 
              line-height: 1.05; 
              color: #000; 
              letter-spacing: -0.2px;
            }
            .phone-row { 
              font-size: 16px; 
              font-weight: 900; 
              font-family: monospace; 
              border: 1.5px solid #000;
              padding: 1px 5px;
              background: #fff;
              width: fit-content;
              margin: 1px 0;
            }
            .address-box { 
              background: #fff; 
              border: 2px solid #000; 
              padding: 6px; 
              font-size: 18px; 
              font-weight: 950; 
              white-space: pre-wrap; 
              line-height: 1.2; 
              color: #000; 
              text-transform: uppercase;
              flex-grow: 1;
            }
            .note-container {
              flex-grow: 1;
              display: flex;
              flex-direction: column;
              gap: 3px;
            }
            .note-title {
              font-size: 9px;
              font-weight: 900;
              text-transform: uppercase;
              color: #000;
            }
            .note-box { 
              background: #fff; 
              border: 1.5px dashed #000; 
              padding: 6px; 
              font-size: 11px; 
              font-weight: 900; 
              color: #000; 
              white-space: pre-wrap; 
              line-height: 1.2; 
              flex-grow: 1;
              margin-bottom: 2px;
            }
            .footer { 
              font-size: 8px; 
              font-weight: 900; 
              color: #000; 
              text-transform: uppercase; 
              text-align: right; 
              border-top: 1.5px solid #000; 
              padding-top: 3px; 
              display: flex;
              justify-content: space-between;
            }
          </style>
        </head>
        <body>
          <!-- First Label Box -->
          <div class="label-box">
            <div class="upper-half">
              <div class="recipient-title">👤 DESTINATARIO</div>
              <div class="recipient-name">${clientName || "NOME DESTINATARIO MANCANTE"}</div>
              ${clientPhone ? `<div class="phone-row">📞 Tel: ${clientPhone}</div>` : ""}
              <div class="address-box">📍 INDIRIZZO:<br/>${clientAddress || "Indirizzo non specificato"}</div>
            </div>

            <div class="lower-half">
              <div class="note-container">
                <span class="note-title">📝 ISTRUZIONI CONSEGNA / NOTE:</span>
                <div class="note-box">${currentNote && currentNote.trim() ? currentNote.trim() : ""}</div>
              </div>
              <div class="footer">
                <span>DATA STAMPA: ${new Date().toLocaleDateString("it-IT")}</span>
              </div>
            </div>
          </div>
          
          <script>
            window.onload = function() {
              window.focus();
              setTimeout(function() { window.print(); }, 250);
            };
          </script>
        </body>
        </html>
      `);
      printWindow.document.close();
    } else {
      window.print();
    }
  };

  return (
    <div className="bg-slate-900 text-slate-100 rounded-2xl p-4 sm:p-5 shadow-lg border border-slate-800 space-y-4 print:bg-white print:text-black print:p-0 print:shadow-none print:border-none">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800 print:hidden">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold text-lg">
            🏷️
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <span>Etichetta Spedizione</span>
              <span className="bg-indigo-500/20 text-indigo-300 text-[9px] font-bold px-2 py-0.5 rounded border border-indigo-500/30">
                Ottimizzato A5 (Impilabile)
              </span>
            </h3>
            <p className="text-[10px] text-slate-400">
              Disposizione a colonna stretta con caratteri extra grandi per la massima leggibilità
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onExportWhatsApp}
            disabled={isExportingWa}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50 shrink-0"
            title="Apri o invia messaggio WhatsApp"
          >
            <MessageCircle className="h-4 w-4" />
            <span>WhatsApp</span>
          </button>

          <button
            type="button"
            onClick={handleCopyText}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 transition-all cursor-pointer shrink-0"
            title="Copia dati indirizzo ed etichetta"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-emerald-400" />
                <span className="text-emerald-400">Copiato!</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 text-slate-400" />
                <span>Copia Indirizzo</span>
              </>
            )}
          </button>

          {/* MAIN STAMPA ETICHETTA BUTTON */}
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black tracking-wide transition-all shadow-md hover:shadow-indigo-500/20 cursor-pointer shrink-0 active:scale-95 border border-indigo-400/40"
            title="Apri finestra di stampa o stampa etichetta"
          >
            <Printer className="h-4 w-4 text-white" />
            <span>🖨️ Stampa A5</span>
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors shrink-0"
            title={isExpanded ? "Riduci" : "Espandi"}
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* THE PHYSICAL LABEL PROTOTYPE CARD (Print target) - Optimized narrow A5 stacked view */}
      {isExpanded && (
        <div 
          className="printable-shipping-label max-w-[430px] mx-auto !bg-white !text-slate-900 rounded-lg p-2.5 border-3 border-slate-950 shadow-xl relative overflow-hidden print:border-3 print:border-black print:rounded-none"
          style={{ fontFamily: '"Arial Narrow", sans-serif-condensed, sans-serif', fontStretch: 'condensed' }}
        >
          {/* Upper half: recipient details only */}
          <div className="border-b-2 border-dashed border-slate-950 pb-2.5 space-y-2">
            <div className="flex items-center justify-between border-b border-slate-300 pb-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-800 flex items-center gap-1">
                <User className="h-3.5 w-3.5 text-slate-950" /> DESTINATARIO SPEDIZIONE
              </span>
              {clientPhone && (
                <a
                  href={`https://wa.me/${clientPhone.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[9px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-300 flex items-center gap-0.5 print:hidden"
                >
                  <MessageCircle className="h-3 w-3" />
                  <span>WhatsApp</span>
                </a>
              )}
            </div>

            {/* Recipient Name - Condensed / Bold */}
            <div>
              <span className="text-[9px] font-bold uppercase text-slate-500 block mb-0.5">Nome e Cognome:</span>
              <h2 className="text-2xl font-black text-slate-950 uppercase tracking-tight leading-none">
                {clientName || "NOME DESTINATARIO MANCANTE"}
              </h2>
            </div>

            {/* Phone & Address */}
            <div className="space-y-2 pt-0.5">
              {clientPhone ? (
                <div className="flex items-center gap-1 font-mono font-black bg-white px-2 py-0.5 rounded border border-slate-950 w-fit text-slate-950 text-sm">
                  <Phone className="h-3.5 w-3.5 text-slate-700 shrink-0" />
                  <span>{clientPhone}</span>
                </div>
              ) : (
                <div className="text-[10px] text-rose-600 font-bold italic">
                  ⚠️ Telefono non inserito
                </div>
              )}

              {/* Indirizzo di Spedizione */}
              <div className="bg-white p-2 rounded border-2 border-slate-950 space-y-0.5">
                <span className="text-[9px] font-black uppercase text-indigo-900 flex items-center gap-0.5">
                  <MapPin className="h-3.5 w-3.5 text-indigo-700 shrink-0" /> INDIRIZZO DI SPEDIZIONE:
                </span>
                <div className="font-black text-base text-slate-950 leading-tight uppercase">
                  {clientAddress && clientAddress.trim() ? (
                    <p className="whitespace-pre-wrap">{clientAddress.trim()}</p>
                  ) : (
                    <p className="text-rose-600 italic font-medium text-xs">
                      ⚠️ Indirizzo non specificato.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Lower half: Notes and manual actions */}
          <div className="pt-2.5 space-y-2">
            {/* Note dell'Ordine di Spedizione */}
            <div className="bg-amber-50/50 border border-amber-300 p-2.5 rounded space-y-1 relative">
              <div className="flex items-center justify-between border-b border-amber-200 pb-0.5">
                <span className="text-[9px] font-black uppercase text-amber-950 flex items-center gap-1">
                  <FileText className="h-3.5 w-3.5 text-amber-800 shrink-0" /> NOTE CONSEGNA:
                </span>
                {!isEditingNote && (
                  <button
                    type="button"
                    onClick={() => {
                      setTempNote(currentNote);
                      setIsEditingNote(true);
                    }}
                    className="text-[9px] font-extrabold text-amber-950 hover:text-amber-900 bg-amber-200/50 hover:bg-amber-200 px-1.5 py-0.5 rounded border border-amber-300 flex items-center gap-0.5 transition-colors cursor-pointer print:hidden"
                    title="Modifica o aggiungi note"
                  >
                    <Edit3 className="h-2.5 w-2.5" />
                    <span>Modifica</span>
                  </button>
                )}
              </div>

              {isEditingNote ? (
                <div className="space-y-1.5 pt-0.5 print:hidden">
                  <textarea
                    rows={2}
                    value={tempNote}
                    onChange={(e) => setTempNote(e.target.value)}
                    placeholder="Note di consegna (citofono, orari)..."
                    className="w-full p-2 text-xs font-bold border border-amber-500 rounded focus:outline-none focus:ring-1 focus:ring-amber-400 bg-white text-slate-900"
                    autoFocus
                  />
                  <div className="flex items-center gap-1.5 justify-end">
                    <button
                      type="button"
                      onClick={() => setIsEditingNote(false)}
                      className="px-2 py-0.5 text-[10px] font-bold text-amber-950 hover:bg-amber-200/50 rounded transition-colors cursor-pointer"
                    >
                      Annulla
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        const trimmed = tempNote.trim();
                        setCurrentNote(trimmed);
                        setIsEditingNote(false);
                        if (onUpdateNote) {
                          await onUpdateNote(trimmed);
                        }
                      }}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black rounded shadow flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <Check className="h-3 w-3 stroke-[3]" />
                      <span>Salva</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  {currentNote && currentNote.trim() ? (
                    <p className="font-extrabold text-xs text-slate-900 whitespace-pre-wrap">
                      {currentNote.trim()}
                    </p>
                  ) : (
                    <div className="flex items-center justify-between py-0.5 print:hidden">
                      <p className="text-amber-800 italic font-medium text-[10px]">
                        Nessuna nota inserita.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setTempNote("");
                          setIsEditingNote(true);
                        }}
                        className="text-[9px] font-extrabold text-amber-950 bg-amber-200/50 hover:bg-amber-200 border border-amber-300 px-1.5 py-0.5 rounded flex items-center gap-0.5 cursor-pointer transition-colors"
                      >
                        <Edit3 className="h-2.5 w-2.5" /> Aggiungi
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer Bar */}
            <div className="flex items-center justify-between pt-1 border-t border-slate-300 text-[8px] font-black text-slate-500 uppercase tracking-wider">
              <span>LOGISTICA SPEDIZIONI</span>
              <span>DATA: {new Date().toLocaleDateString("it-IT")}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
