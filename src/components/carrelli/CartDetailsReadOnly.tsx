import { StrikeBadge } from "./StrikeBadge";
import React, { useState } from "react";
import { motion } from "motion/react";
import { MessageCircle,
  ArrowLeft,
  Check,
  Copy,
  CheckCircle,
  User,
  Info,
  ShoppingBag, Clock,
  Eye,
  Plus,
  Camera,
  Upload,
  Award,
  Tag,
  X,
  Loader2,
  Flag,
  AlertTriangle,
  Truck,
  FileText,
  Lock,
} from "lucide-react";
import { Carrello, Spedizione, GradingItem, GradingGroup, CustomerLoyalty, DettaglioCarrello } from "../../types";
import { OggettoMagazzino } from "../../types";
import { shortenUrlJSONP } from "../../lib/urlUtils";
import { WhatsAppChoiceModal } from "../common/WhatsAppChoiceModal";
import { sendWhatsAppMessage } from "../../lib/whatsapp";
import { ClientLoyaltyCard } from "./ClientLoyaltyCard";
import { calculateTierFromSpent, calculateLevelFromXP, TIERS_CONFIG } from "../../lib/loyaltyEngine";

interface CartDetailsReadOnlyProps {
  magazzino?: OggettoMagazzino[];
  selectedCart: Carrello;
  setSelectedCartId: (id: string | null) => void;
  activeClientName: string;
  activeClientEmail: string;
  activeClientPhone: string;
  activeClientAddress: string;
  activeClientTag: string;
  activeClientNote?: string;
  activeClientNoteInterne?: string;
  activeClientStrike?: number;
  activeClientCattivoData?: string;
  copiedField: string | null;
  handleCopy: (text: string, field: string) => void;
  selectedCartShipment: Spedizione | null;
  relatedShipments: Spedizione[];
  handleUpdateShipmentStatus: (idSpedizione: string, idCarrello: string, newStatus: string) => void;
  handleGoToLiveCart?: (cart: import("../../types").Carrello) => void;
  groupedCartItems: any[];
  getDirectImageUrl: (url: string) => string;
  activeGradingItems: GradingItem[];
  gruppiGrading: GradingGroup[];
  isShipped: boolean;
  onUploadPhoto?: (file: File, folderType?: string, customName?: string, subFolderName?: string) => Promise<string>;
  onUpdateCard?: (id: string, updates: Partial<GradingItem>) => Promise<void>;
  onUpdateCartTag?: (cartId: string, tag: string) => Promise<void>;
  onUpdateCartAddress?: (cartId: string, address: string) => Promise<void>;
  onUpdateCartNote?: (cartId: string, note: string) => Promise<void>;
  onUpdateCartStrikes?: (cartId: string, strike: number, cattivoData: string) => Promise<void>;
  onReopenCart?: (cartId: string) => Promise<void>;
  userRole?: "owner" | "moderatore" | "utente";
  loyaltyProfiles?: CustomerLoyalty[];
  carrelli?: Carrello[];
  dettagli?: DettaglioCarrello[];
  onNavigate?: (tab: string) => void;
}

export const CartDetailsReadOnly: React.FC<CartDetailsReadOnlyProps> = React.memo(({
  selectedCart,
  setSelectedCartId,
  activeClientName,
  activeClientEmail,
  activeClientPhone,
  activeClientAddress,
  activeClientTag,
  activeClientNote = "",
  activeClientNoteInterne = "",
  copiedField,
  handleCopy,
  selectedCartShipment,
  relatedShipments,
  handleUpdateShipmentStatus,
  handleGoToLiveCart,
  groupedCartItems,
  getDirectImageUrl,
  activeGradingItems,
  gruppiGrading,
  isShipped,
  onUploadPhoto,
  onUpdateCard,
  onUpdateCartTag,
  onUpdateCartAddress,
  onUpdateCartNote,
  onUpdateCartStrikes,
  magazzino = [],
  onReopenCart,
  userRole,
  loyaltyProfiles = [],
  carrelli = [],
  dettagli = [],
  onNavigate,
}) => {
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [showUnpaidOnly, setShowUnpaidOnly] = useState(false);
  const [isExportingWa, setIsExportingWa] = useState(false);
  const [isWaModalOpen, setIsWaModalOpen] = useState(false);
  const [waMessage, setWaMessage] = useState("");

  const formatStatoHuman = (stato?: string) => {
    if (!stato) return "";
    switch (stato) {
      case "In_Attesa":
        return "In attesa ⏳";
      case "In_Lavorazione":
        return "In lavorazione ⚙️";
      case "Spedito_Al_Grading":
        return "Spedito al grading 📦";
      case "Rientrato":
        return "Rientrato in sede 🏢";
      case "Completato":
        return "Completato ✅";
      case "Annullato":
        return "Annullato ❌";
      case "In_Attesa_Pagamento":
        return "In attesa pagamento ⏳";
      default:
        return stato.replace(/_/g, " ");
    }
  };

  const handleExportWhatsApp = async () => {
    setIsExportingWa(true);
    try {
      const fullCartId = selectedCart.ID_Carrello;

      const clientLoyalty = loyaltyProfiles?.find(p => 
        (p.email && p.email.toLowerCase() === (selectedCart.Email || activeClientEmail || "").toLowerCase()) ||
        (p.customerName && p.customerName.toLowerCase() === (activeClientName || selectedCart.Nome_Cliente || "").toLowerCase())
      );
      const customerCompletedCarts = (carrelli || []).filter(c => 
        c.Stato_Carrello === "Completato" &&
        ((selectedCart.Email && c.Email && c.Email.toLowerCase() === selectedCart.Email.toLowerCase()) ||
         (c.Nome_Cliente && c.Nome_Cliente.toLowerCase() === (activeClientName || selectedCart.Nome_Cliente || "").toLowerCase()))
      );
      const calculatedSpent = customerCompletedCarts.reduce((acc, c) => acc + Number(c.Totale_Pagato || 0), 0);
      const historicalSpent = clientLoyalty?.totalSpent ?? calculatedSpent;
      const currentTier = clientLoyalty?.tier 
        ? TIERS_CONFIG.find(t => t.tier === clientLoyalty.tier) || calculateTierFromSpent(historicalSpent)
        : calculateTierFromSpent(historicalSpent);
      const level = clientLoyalty?.level ?? calculateLevelFromXP(clientLoyalty?.xp ?? Math.floor(historicalSpent * 10));

      const getTierEmoji = (tierName: string): string => {
        switch (tierName) {
          case "Rookie Collector": return "⚪";
          case "Binder Keeper": return "📁";
          case "Card Hunter": return "🔍";
          case "Treasure Seeker": return "🧭";
          case "Vault Master": return "🔒";
          case "Legendary Collector": return "🔥";
          case "Grail Hunter": return "🏆";
          case "Mythic Collector": return "✨";
          case "Hall of Fame": return "👑";
          default: return "⭐";
        }
      };
      const tierEmoji = getTierEmoji(currentTier.tier);

      let msg = `🌸 *Jana No Sekai* — *Riepilogo Ordine*\n`;
      msg += `----------------------------------------\n`;
      msg += activeClientName 
        ? `Ciao *${activeClientName}* [ *${currentTier.tier}* Lvl *${level}* ${tierEmoji} ]! 👋\n` 
        : `Ciao! [ *${currentTier.tier}* Lvl *${level}* ${tierEmoji} ] 👋\n`;
      msg += `Ecco il riepilogo dettagliato del tuo ordine:\n\n`;
      
      let toPay = 0;
      
      if (groupedCartItems.length > 0) {
        msg += `📦 *OGGETTI NEL CARRELLO:*\n\n`;
        
        const groupedStandard: any = {};
        groupedCartItems.forEach(g => {
          const name = g.nome || 'Articolo';
          // Find the corresponding warehouse item to retrieve Data_Spedizione_Presunta
          const warehouseItem = (magazzino || []).find((m: any) => m.ID_Oggetto === g.ID_Oggetto);
          const dataSped = warehouseItem?.Data_Spedizione_Presunta || "";
          g.items.forEach((item: any) => {
            const key = `${name}_${item.Pagato_Singolarmente}_${item.Prezzo_Registrato}_${dataSped}`;
            if (!groupedStandard[key]) {
              groupedStandard[key] = { count: 0, name, paid: item.Pagato_Singolarmente, price: item.Prezzo_Registrato, acconto: 0, dataSped };
            }
            groupedStandard[key].count++;
            if (!item.Pagato_Singolarmente) {
              toPay += item.Prezzo_Registrato;
              if (item.Acconto_Pagato) {
                toPay -= item.Acconto_Pagato;
                groupedStandard[key].acconto += item.Acconto_Pagato;
              }
            }
          });
        });

        const byDate: Record<string, any[]> = {};
        Object.values(groupedStandard).forEach((g: any) => {
          const dateKey = g.dataSped || "Immediata";
          if (!byDate[dateKey]) byDate[dateKey] = [];
          byDate[dateKey].push(g);
        });

        // 1. Disponibilità Immediata
        if (byDate["Immediata"] && byDate["Immediata"].length > 0) {
          msg += `*Disponibilità immediata:*\n`;
          byDate["Immediata"].forEach(g => {
            let priceStr = g.paid ? 'Pagato ✅' : `Non pagato ❌ (€${(g.price * g.count).toFixed(2)})`;
            if (!g.paid && g.acconto > 0) {
              const remaining = Math.max(0, g.price * g.count - g.acconto);
              priceStr = `Pagato parzialmente 🟡 (Rimangono €${remaining.toFixed(2)} • Acconto: €${g.acconto.toFixed(2)})`;
            }
            msg += `- *${g.name}* x${g.count} - ${priceStr}\n`;
          });
          msg += `\n`;
        }

        // 2. Disponibilità Future (ordinate per data, se possibile)
        const futureDates = Object.keys(byDate).filter(k => k !== "Immediata").sort();
        futureDates.forEach(date => {
          msg += `*Disponibilità dal ${date}:*\n`;
          byDate[date].forEach(g => {
            let priceStr = g.paid ? 'Pagato ✅' : `Non pagato ❌ (€${(g.price * g.count).toFixed(2)})`;
            if (!g.paid && g.acconto > 0) {
              const remaining = Math.max(0, g.price * g.count - g.acconto);
              priceStr = `Pagato parzialmente 🟡 (Rimangono €${remaining.toFixed(2)} • Acconto: €${g.acconto.toFixed(2)})`;
            }
            msg += `- *${g.name}* x${g.count} - ${priceStr}\n`;
          });
          msg += `\n`;
        });
      }

      if (activeGradingItems.length > 0) {
        msg += `🔍 *SERVIZIO GRADING:*\n`;
        for (const g of activeGradingItems) {
          const name = g.Nome_Carta || (g as any).Nome_Oggetto || 'Oggetto Grading';
          const group = gruppiGrading.find(gr => gr.ID_Gruppo_Grading === g.ID_Gruppo_Grading);
          
          const details: string[] = [];
          if (g.Tipologia_Servizio) details.push(`Servizio: ${g.Tipologia_Servizio}`);
          if (group?.Stato_Gruppo) details.push(`Stato: ${formatStatoHuman(group.Stato_Gruppo)}`);
          
          const detailsStr = details.length > 0 ? ` (${details.join(' • ')})` : '';
          
          let gPriceStr = g.Pagato_Singolarmente ? 'Pagato ✅' : `Non pagato ❌ (€${g.Costo_Cliente.toFixed(2)})`;
          if (!g.Pagato_Singolarmente && g.Acconto_Pagato) {
             const remaining = Math.max(0, g.Costo_Cliente - g.Acconto_Pagato);
             gPriceStr = `Pagato parzialmente 🟡 (Rimangono €${remaining.toFixed(2)} • Acconto: €${g.Acconto_Pagato.toFixed(2)})`;
          }
          msg += `- *${name}*${detailsStr} — ${gPriceStr}\n`;
          
          if (g.Link_Foto) {
            const fotoLinks = g.Link_Foto.split(',').filter(Boolean);
            for (let i = 0; i < fotoLinks.length; i++) {
              const short = await shortenUrlJSONP(fotoLinks[i].trim());
              msg += `  - 📸 Foto ${i + 1}: ${short}\n`;
            }
          }
          if (g.Link_Foto_Ritornata) {
            const short = await shortenUrlJSONP(g.Link_Foto_Ritornata.trim());
            msg += `  - 📸 Risultato Grading: ${short}\n`;
          }
          
          if (!g.Pagato_Singolarmente) toPay += g.Costo_Cliente;
        }
        msg += `\n`;
      }
      
      let shipmentPhotosText = "";
      let photoCount = 1;
      if (relatedShipments && relatedShipments.length > 0) {
        for (const shipment of relatedShipments) {
          if (shipment.Link_Foto_Oggetti) {
            const fotoLinks = shipment.Link_Foto_Oggetti.split(',').filter(Boolean);
            for (let idx = 0; idx < fotoLinks.length; idx++) {
              const short = await shortenUrlJSONP(fotoLinks[idx].trim());
              shipmentPhotosText += `- Foto ${photoCount}: ${short}\n`;
              photoCount++;
            }
          }
        }
      } else if (selectedCartShipment && selectedCartShipment.Link_Foto_Oggetti) {
        const fotoLinks = selectedCartShipment.Link_Foto_Oggetti.split(',').filter(Boolean);
        for (let idx = 0; idx < fotoLinks.length; idx++) {
          const short = await shortenUrlJSONP(fotoLinks[idx].trim());
          shipmentPhotosText += `- Foto ${idx + 1}: ${short}\n`;
        }
      }

      if (shipmentPhotosText) {
        msg += `📸 *FOTO SPEDIZIONE & CONTROLLO QUALITÀ:*\n` + shipmentPhotosText + `\n`;
      }

      msg += `----------------------------------------\n`;
      msg += `💳 *RIEPILOGO PAGAMENTI:*\n`;
      if (toPay > 0) {
        msg += `- *Totale da saldare:* *€${toPay.toFixed(2)}*\n\n`;
      } else {
        msg += `- *Stato Ordine:* *Interamente Pagato ✅*\n\n`;
      }
      
      msg += `\nPer qualsiasi dubbio o domanda contattami.\nGrazie mille! ✨`;
      
      sendWhatsAppMessage(msg, selectedCart.Telefono || activeClientPhone || "");
    } finally {
      setIsExportingWa(false);
    }
  };

  // Calculate totals for ReadOnly cart
  let calcTotale = 0;
  let calcPagato = 0;
  let calcRemaining = 0;

  groupedCartItems.forEach((g: any) => {
    (g.items || []).forEach((item: any) => {
      if (item.Reso) return;
      const price = item.Prezzo_Registrato || 0;
      calcTotale += price;
      if (item.Pagato_Singolarmente) {
        calcPagato += price;
      } else {
        if (item.Acconto_Pagato) {
          calcPagato += item.Acconto_Pagato;
          calcRemaining += Math.max(0, price - item.Acconto_Pagato);
        } else {
          calcRemaining += price;
        }
      }
    });
  });

  activeGradingItems.forEach((g: any) => {
    if (g.Reso) return;
    const cost = g.Costo_Cliente || 0;
    calcTotale += cost;
    if (g.Pagato_Singolarmente) {
      calcPagato += cost;
    } else {
      if (g.Acconto_Pagato) {
        calcPagato += g.Acconto_Pagato;
        calcRemaining += Math.max(0, cost - g.Acconto_Pagato);
      } else {
        calcRemaining += cost;
      }
    }
  });

  const cartTotalsCalc = {
    totaleCarrello: calcTotale,
    totalePagato: calcPagato,
    rimanenza: calcRemaining,
  };

  return (
    <>
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-6 space-y-6 pb-28 md:pb-6"
      >
        {/* Back to List Button for Mobile & Desktop */}
        <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setSelectedCartId(null)}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5 text-slate-500" />
            <span>Torna alla Lista</span>
          </button>
          
        </div>

        {/* Cart Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-5 border-b border-slate-150 gap-4 bg-slate-50/40 p-4 -mx-6 -mt-6 rounded-t-2xl">
          <div className="flex items-center space-x-3">
            <div className="h-11 w-11 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-base shadow-sm shrink-0">
              {(activeClientName || selectedCart.Nome_Cliente || "?")
                .substring(0, 2)
                .toUpperCase()}
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center space-x-2">
                <span className="text-[10px] text-indigo-600 font-extrabold uppercase tracking-widest bg-indigo-50/80 px-2 py-0.5 rounded-md border border-indigo-100/50">
                  RIEPILOGO ORDINE SPEDITO
                </span>
                <span
                  onClick={() => handleCopy(selectedCart.ID_Carrello, "cartId")}
                  className="group inline-flex items-center space-x-1 px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 rounded text-[10px] font-mono transition-all cursor-pointer border border-slate-200/60"
                  title="Clicca per copiare l'ID del carrello"
                >
                  <span className="font-semibold">
                    {selectedCart.ID_Carrello}
                  </span>
                  {copiedField === "cartId" ? (
                    <Check className="h-2.5 w-2.5 text-emerald-500 shrink-0" />
                  ) : (
                    <Copy className="h-2.5 w-2.5 text-slate-400 group-hover:text-slate-600 shrink-0" />
                  )}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-1.5 leading-tight">
                  <span>{activeClientName || selectedCart.Nome_Cliente}</span>
                </h3>
                {(() => {
                  const clientName = activeClientName || selectedCart.Nome_Cliente;
                  if (!clientName) return null;
                  return (
                    <div className="ml-1 flex items-center">
                      <StrikeBadge
                        strikesCount={selectedCart.Strike || 0}
                        cattivoData={selectedCart.Cattivo_Data || ""}
                        clientName={clientName}
                        cartId={selectedCart.ID_Carrello}
                        onUpdateStrikes={onUpdateCartStrikes}
                      />
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {handleGoToLiveCart && (
              <button
                type="button"
                onClick={() => handleGoToLiveCart(selectedCart)}
                className="flex items-center space-x-1.5 px-3 py-2 border border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl text-[10px] font-bold uppercase tracking-wider shadow-sm transition-all cursor-pointer"
                title="Vai al carrello live di questo cliente"
              >
                <ShoppingBag className="h-3.5 w-3.5" />
                <span>Carrello Live</span>
              </button>
            )}
            <button
                type="button"
                onClick={handleExportWhatsApp}
                disabled={isExportingWa}
                className="flex items-center space-x-1.5 px-3 py-2 border border-green-200 text-green-700 bg-green-50 hover:bg-green-100 rounded-xl text-[10px] font-bold uppercase tracking-wider shadow-sm transition-all cursor-pointer disabled:opacity-50"
                title="Esporta per WhatsApp"
              >
                {isExportingWa ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MessageCircle className="h-3.5 w-3.5" />}
                <span>{isExportingWa ? 'Exporting...' : 'WhatsApp'}</span>
              </button>
            {userRole !== "utente" && selectedCart.Stato_Carrello === "Spedizione_Ricevuta_da_Consegnare" &&
              selectedCartShipment && (
                <button
                  onClick={() =>
                    handleUpdateShipmentStatus(
                      selectedCartShipment.ID_Spedizione,
                      selectedCart.ID_Carrello,
                      "Consegnato"
                    )
                  }
                  className="flex items-center space-x-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider shadow-sm transition-all cursor-pointer active:scale-95"
                >
                  <CheckCircle className="h-3.5 w-3.5" />
                  <span>Consegna Completata</span>
                </button>
              )}
            {userRole !== "utente" && selectedCart.Stato_Carrello === "Pronto_per_Spedizione" && onReopenCart && (
              <button
                type="button"
                onClick={() => onReopenCart(selectedCart.ID_Carrello)}
                className="flex items-center space-x-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider shadow-sm transition-all cursor-pointer active:scale-95"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Riporta ad Aperto</span>
              </button>
            )}
            <span
              className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider border shadow-3xs ${
                selectedCart.Stato_Carrello === "Spedizione_Ricevuta_da_Consegnare"
                  ? "bg-amber-50 text-amber-700 border-amber-200/60 animate-pulse"
                  : selectedCart.Stato_Carrello === "Pronto_per_Spedizione"
                  ? "bg-indigo-50 text-indigo-700 border-indigo-200/60"
                  : "bg-emerald-50 text-emerald-700 border-emerald-200/60"
              }`}
            >
              {selectedCart.Stato_Carrello.replace(/_/g, " ")}
            </span>
          </div>
        </div>

        {/* SEZIONE FIDELIZZAZIONE & TIER CLIENTE */}
        {(() => {
          const clientLoyalty = loyaltyProfiles?.find(p => 
            (p.email && p.email.toLowerCase() === (selectedCart.Email || activeClientEmail || "").toLowerCase()) ||
            (p.customerName && p.customerName.toLowerCase() === (activeClientName || selectedCart.Nome_Cliente || "").toLowerCase())
          );
          const customerCompletedCarts = (carrelli || []).filter(c => 
            c.Stato_Carrello === "Completato" &&
            ((selectedCart.Email && c.Email && c.Email.toLowerCase() === selectedCart.Email.toLowerCase()) ||
             (c.Nome_Cliente && c.Nome_Cliente.toLowerCase() === (activeClientName || selectedCart.Nome_Cliente || "").toLowerCase()))
          );
          const calculatedSpent = customerCompletedCarts.reduce((acc, c) => acc + Number(c.Totale_Pagato || 0), 0);
          return (
            <ClientLoyaltyCard
              clientName={activeClientName || selectedCart.Nome_Cliente || ""}
              clientEmail={activeClientEmail || selectedCart.Email || ""}
              loyaltyProfile={clientLoyalty}
              historicalSpent={calculatedSpent}
              onNavigate={onNavigate}
            />
          );
        })()}

        {/* 1. SEZIONE FOTO CONTROLLO QUALITA CON PREVIEW */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3">
          <div className="flex items-center space-x-2 pb-1.5 border-b border-slate-200">
            <Camera className="h-4.5 w-4.5 text-indigo-500 shrink-0" />
            <h4 className="font-extrabold text-slate-800 text-[11px] uppercase tracking-wider">
              Foto Controllo Qualità
            </h4>
          </div>
          {selectedCartShipment?.Link_Foto_Oggetti ? (
            <div className="grid grid-cols-2 gap-4">
              {selectedCartShipment.Link_Foto_Oggetti.split(",")
                .filter(Boolean)
                .map((link, idx) => (
                  <div
                    key={idx}
                    className="relative group rounded-xl overflow-hidden border border-slate-200 bg-slate-50 shadow-3xs aspect-video max-h-44 transition-all hover:border-indigo-200 cursor-pointer"
                    onClick={() => setZoomedImage(link)}
                  >
                    <img
                      src={getDirectImageUrl(link)}
                      alt={`Spedizione ${selectedCartShipment.ID_Spedizione} - Foto ${idx + 1}`}
                      className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-slate-950/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button className="bg-white/95 hover:bg-white text-slate-900 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1 shadow-sm transition-all cursor-pointer">
                        <Eye className="h-3.5 w-3.5" />
                        <span>Ingrandisci Foto {idx + 1}</span>
                      </button>
                    </div>
                    <span className="absolute bottom-2 left-2 bg-slate-900/80 text-white text-[9px] font-extrabold px-2 py-0.5 rounded tracking-wide uppercase pointer-events-none">
                      Foto {idx + 1}
                    </span>
                  </div>
                ))}
            </div>
          ) : (
            <div className="p-8 border border-dashed border-slate-200 rounded-xl text-center text-slate-400 bg-slate-50/50 flex flex-col items-center justify-center space-y-2">
              <Camera className="h-6 w-6 text-slate-300" />
              <p className="text-sm font-semibold">
                Nessuna foto caricata per il controllo qualità.
              </p>
            </div>
          )}
        </div>


        {/* 2. INFORMAZIONI DI SPEDIZIONE */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4">
          <div className="flex items-center space-x-2 pb-2 border-b border-slate-200">
            <Truck className="h-5 w-5 text-indigo-500 shrink-0" />
            <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">
              Dettagli Logistica
            </h4>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h5 className="text-[10px] text-slate-500 font-extrabold uppercase tracking-widest">
                Destinazione
              </h5>
              <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm text-sm space-y-2">
                <div className="flex gap-2 items-start">
                  <User className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">{activeClientName || selectedCart.Nome_Cliente || "Non fornito"}</div>
                    {(activeClientPhone || selectedCart.Telefono) && <div className="text-slate-500 text-xs">{activeClientPhone || selectedCart.Telefono}</div>}
                  </div>
                </div>
                <div className="flex gap-2 items-start border-t border-slate-100 pt-2">
                  <Flag className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                  <div className="font-medium text-slate-700 leading-tight">
                    {activeClientAddress || selectedCart.Indirizzo_Spedizione || "Indirizzo non fornito"}
                  </div>
                </div>
                {(activeClientNote || selectedCart.Note) && (
                  <div className="flex gap-2 items-start border-t border-slate-100 pt-2 text-amber-900 bg-amber-50 p-2 rounded-lg border border-amber-200 text-xs">
                    <FileText className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-extrabold uppercase text-[9px] text-amber-700 block">Note Carrello / Etichetta:</span>
                      <span className="font-bold">{activeClientNote || selectedCart.Note}</span>
                    </div>
                  </div>
                )}
                {(activeClientNoteInterne || selectedCart.Note_Interne) && (
                  <div className="flex gap-2 items-start border-t border-slate-100 pt-2 text-indigo-900 bg-indigo-50/50 p-2 rounded-lg border border-indigo-200 text-xs">
                    <Lock className="h-3.5 w-3.5 text-indigo-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-extrabold uppercase text-[9px] text-indigo-700 block">Note Interne (Private):</span>
                      <span className="font-bold">{activeClientNoteInterne || selectedCart.Note_Interne}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <h5 className="text-[10px] text-slate-500 font-extrabold uppercase tracking-widest">
                Stato Spedizioni
              </h5>
              <div className="space-y-2">
                {relatedShipments && relatedShipments.length > 0 ? (
                  relatedShipments.map((shipment, idx) => (
                    <div key={shipment.ID_Spedizione} className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm text-sm flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-800">{shipment.Tracking ? shipment.Tracking : "Tracking N/A"}</span>
                        <span className="text-xs text-slate-400">ID: <span className="font-mono">{shipment.ID_Spedizione}</span></span>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        shipment.Stato_Consegna === "Reso Completato"
                          ? "bg-slate-100 text-slate-800 border border-slate-300"
                          : shipment.Stato_Consegna === "Reso in Lavorazione"
                          ? "bg-rose-100 text-rose-800 border border-rose-200"
                          : shipment.Stato_Consegna === "Consegnato"
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                          : "bg-amber-100 text-amber-800 border border-amber-200 animate-pulse"
                      }`}>
                        {shipment.Stato_Consegna}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-slate-400 italic bg-white border border-slate-200 p-3 rounded-xl text-center">Nessuna spedizione trovata</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 3. ARTICOLI IN GRADAZIONE IN QUESTA SPEDIZIONE */}
        {activeGradingItems.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
              <div className="flex items-center space-x-2">
                <Award className="h-4.5 w-4.5 text-indigo-500 shrink-0" />
                <h4 className="font-extrabold text-slate-800 text-[11px] uppercase tracking-wider">
                  Grading PSA/BGS in Spedizione ({activeGradingItems.length})
                </h4>
              </div>
            </div>

            
            {/* Mobile Layout */}
            <div className="md:hidden space-y-3">
              {activeGradingItems.map((g) => {
                const group = g.ID_Gruppo_Grading
                  ? gruppiGrading.find((grp) => grp.ID_Gruppo_Grading === g.ID_Gruppo_Grading)
                  : null;
                const isGroupReturnedOrClosed = group && (group.Stato_Gruppo === "Ritornato" || group.Stato_Gruppo === "Chiuso");

                return (
                  <div key={g.ID_Oggetto_Grading} className={`bg-white border border-slate-200 rounded-xl shadow-sm p-3 flex flex-col gap-3 ${g.Pagamento_Posticipato ? 'border-l-4 border-l-purple-400' : ''}`}>
                    <div className="flex gap-3">
                      <div className="shrink-0">
                        {g.Link_Foto ? (
                          <a href={g.Link_Foto} target="_blank" rel="noreferrer" className="block w-12 h-12 border border-slate-200 rounded-lg overflow-hidden shadow-3xs hover:scale-105 transition-all">
                            <img src={getDirectImageUrl(g.Link_Foto)} alt="Thumbnail" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          </a>
                        ) : (
                          <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-lg flex items-center justify-center border border-slate-155 text-[9px]">N/D</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-slate-800 line-clamp-2 leading-tight mb-1">{g.Nome_Carta}</h4>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-mono text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">ID: {g.ID_Oggetto_Grading}</span>
                          <span className="font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100/50 px-1.5 py-0.5 rounded-lg text-[9px] uppercase whitespace-nowrap">{g.Tipologia_Servizio}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 rounded-lg p-2 border border-slate-100">
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[10px] text-slate-500 font-bold uppercase">Foto Ritorno</span>
                        {g.Link_Foto_Ritornata ? (
                          <div className="flex items-center gap-2">
                            <a href={g.Link_Foto_Ritornata} target="_blank" rel="noreferrer" className="block w-10 h-10 border border-slate-200 rounded-lg overflow-hidden shadow-3xs">
                              <img src={getDirectImageUrl(g.Link_Foto_Ritornata)} alt="Ritornata" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            </a>
                            {userRole !== "utente" && (
                              <button
                                type="button"
                                onClick={async () => {
                                  await onUpdateCard?.(g.ID_Oggetto_Grading, { Link_Foto_Ritornata: "" });
                                }}
                                className="text-rose-500 hover:text-rose-700 text-[10px] font-bold cursor-pointer"
                              >
                                Rimuovi
                              </button>
                            )}
                          </div>
                        ) : isGroupReturnedOrClosed ? (
                          userRole !== "utente" ? (
                            <label className="cursor-pointer inline-flex items-center justify-center gap-1 px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[10px] font-bold border border-indigo-100/70 transition-all w-24">
                              <Plus className="h-3 w-3" />
                              <span>Carica</span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (!file || !onUploadPhoto || !onUpdateCard) return;
                                  try {
                                    const customName = `${g.Nome_Carta}-Ritorno-${g.ID_Carrello}`;
                                    const subFolderName = `${selectedCart.Nome_Cliente}-${selectedCart.ID_Carrello}`;
                                    const url = await onUploadPhoto(file, "ritornoSpedizioneId", customName, subFolderName);
                                    await onUpdateCard(g.ID_Oggetto_Grading, { Link_Foto_Ritornata: url });
                                    alert("Foto ritirata caricata con successo!");
                                  } catch (err) {
                                    alert("Errore caricamento foto: " + (err as Error).message);
                                  }
                                }}
                              />
                            </label>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">Non caricata</span>
                          )
                        ) : (
                          <span className="text-slate-400 italic text-[10px]">In Attesa</span>
                        )}
                      </div>
                      
                      <div className="flex flex-col gap-1.5 min-w-[120px]">
                        <span className="text-[10px] text-slate-500 font-bold uppercase">Metodo Consegna</span>
                        <select
                          value={g.Metodo_Consegna || ""}
                          disabled={!g.Link_Foto_Ritornata || isShipped}
                          onChange={async (e) => {
                            await onUpdateCard?.(g.ID_Oggetto_Grading, { Metodo_Consegna: e.target.value });
                          }}
                          className="px-2 py-1.5 text-[11px] border border-slate-300 bg-white text-slate-700 font-semibold rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 disabled:bg-slate-50"
                        >
                          <option value="">- Scegli -</option>
                          <option value="Ritiro a mano">A mano</option>
                          <option value="Consegna">Consegna a domicilio</option>
                          <option value="Spedizione">Spedizione Tracciata</option>
                        </select>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Layout */}
            <div className="hidden md:block border border-slate-150 rounded-xl overflow-x-auto overflow-hidden shadow-3xs scrollbar-thin">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-150">
                  <tr>
                    <th className="px-4 py-2.5">Miniatura</th>
                    <th className="px-4 py-2.5">Nome Carta</th>
                    <th className="px-4 py-2.5">Livello Scelto</th>
                    <th className="px-4 py-2.5 text-center">
                      Foto Risultato Grading
                    </th>
                    <th className="px-4 py-2.5 text-center">Metodo Consegna</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-slate-100 text-slate-700">
                  {activeGradingItems.map((g) => {
                    const group = g.ID_Gruppo_Grading
                      ? gruppiGrading.find(
                          (grp) =>
                            grp.ID_Gruppo_Grading === g.ID_Gruppo_Grading,
                        )
                      : null;
                    const isGroupReturnedOrClosed =
                      group &&
                      (group.Stato_Gruppo === "Ritornato" ||
                        group.Stato_Gruppo === "Chiuso");
                    return (
                      <tr
                        key={g.ID_Oggetto_Grading}
                        className={`hover:bg-slate-50/50 transition-colors ${g.Pagamento_Posticipato ? 'bg-purple-50/60 border-l-4 border-purple-400' : ''}`}
                      >
                        {/* Miniatura carta */}
                        <td className="px-4 py-2.5">
                          {g.Link_Foto ? (
                            <a
                              href={g.Link_Foto}
                              target="_blank"
                              rel="noreferrer"
                              className="block w-10 h-10 border border-slate-200 rounded-lg overflow-hidden shadow-3xs hover:scale-105 transition-all"
                            >
                              <img
                                src={getDirectImageUrl(g.Link_Foto)}
                                alt="Thumbnail"
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            </a>
                          ) : (
                            <div className="w-10 h-10 bg-slate-50 text-slate-400 rounded-lg flex items-center justify-center border border-slate-155 text-[9px]">
                              N/D
                            </div>
                          )}
                        </td>

                        {/* Nome Carta */}
                        <td className="px-4 py-2.5">
                          <span className="font-bold text-slate-800 block">
                            {g.Nome_Carta}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            ID: {g.ID_Oggetto_Grading}
                          </span>
                        </td>

                        {/* Livello Scelto */}
                        <td className="px-4 py-2.5">
                          <span className="font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100/50 px-2.5 py-0.5 rounded-lg text-[10px] uppercase whitespace-nowrap font-sans font-bold">
                            {g.Tipologia_Servizio}
                          </span>
                        </td>

                        {/* Foto Risultato Grading */}
                        <td className="px-4 py-2.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {g.Link_Foto_Ritornata ? (
                              <div className="flex items-center gap-2">
                                <a
                                  href={g.Link_Foto_Ritornata}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="block w-10 h-10 border border-slate-200 rounded-lg overflow-hidden shadow-3xs hover:scale-105 transition-all"
                                >
                                  <img
                                    src={getDirectImageUrl(
                                      g.Link_Foto_Ritornata,
                                    )}
                                    alt="Ritornata"
                                    className="w-full h-full object-cover"
                                    referrerPolicy="no-referrer"
                                  />
                                </a>
                                {userRole !== "utente" && (
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      await onUpdateCard?.(
                                        g.ID_Oggetto_Grading,
                                        { Link_Foto_Ritornata: "" },
                                      );
                                    }}
                                    className="text-rose-500 hover:text-rose-700 text-[10px] font-bold cursor-pointer"
                                  >
                                    Rimuovi
                                  </button>
                                )}
                              </div>
                            ) : isGroupReturnedOrClosed ? (
                              userRole !== "utente" ? (
                                <label className="cursor-pointer inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[10px] font-bold border border-indigo-100/70 transition-all">
                                  <Plus className="h-3 w-3" />
                                  <span>Carica Foto</span>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={async (e) => {
                                      const file = e.target.files?.[0];
                                      if (
                                        !file ||
                                        !onUploadPhoto ||
                                        !onUpdateCard
                                      )
                                        return;
                                      try {
                                        const customName = `${g.Nome_Carta}-Ritorno-${g.ID_Carrello}`;
                                        const subFolderName = `${selectedCart.Nome_Cliente}-${selectedCart.ID_Carrello}`;
                                        const url = await onUploadPhoto(
                                          file,
                                          "ritornoSpedizioneId",
                                          customName,
                                          subFolderName
                                        );
                                        await onUpdateCard(g.ID_Oggetto_Grading, {
                                          Link_Foto_Ritornata: url,
                                        });
                                        alert(
                                          "Foto ritirata caricata con successo!",
                                        );
                                      } catch (err: any) {
                                        alert(
                                          "Errore caricamento foto: " +
                                            err.message,
                                        );
                                      }
                                    }}
                                  />
                                </label>
                              ) : (
                                <span className="text-[10px] text-slate-400 italic">Non caricata</span>
                              )
                            ) : (
                              <span className="text-slate-400 italic text-[10px]">
                                In Attesa di Lotto
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Metodo Consegna */}
                        <td className="px-4 py-2.5 text-center">
                          <select
                            value={g.Metodo_Consegna || ""}
                            disabled={!g.Link_Foto_Ritornata || isShipped}
                            title={
                              isShipped
                                ? "Il metodo di consegna non può essere modificato dopo la spedizione"
                                : !g.Link_Foto_Ritornata
                                  ? "Carica prima la foto della carta ritirata per abilitare la consegna"
                                  : "Seleziona il metodo di spedizione/consegna"
                            }
                            onChange={async (e) => {
                              await onUpdateCard?.(g.ID_Oggetto_Grading, {
                                Metodo_Consegna: e.target.value,
                              });
                            }}
                            className="px-2 py-1 text-[11px] border border-slate-300 bg-white text-slate-700 font-semibold rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 disabled:bg-slate-50 disabled:cursor-not-allowed"
                          >
                            <option value="">- Scegli -</option>
                            <option value="Ritiro a mano">A mano</option>
                            <option value="Spedizione">Spedizione</option>
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 4. ARTICOLI STANDARD IN QUESTA SPEDIZIONE */}
        {groupedCartItems.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
              <div className="flex items-center space-x-2">
                <ShoppingBag className="h-4.5 w-4.5 text-indigo-500 shrink-0" />
                <h4 className="font-extrabold text-slate-800 text-[11px] uppercase tracking-wider">
                  Articoli Standard della Spedizione ({groupedCartItems.length})
                </h4>
              </div>
            </div>

            
            {/* Mobile Layout */}
            <div className="md:hidden space-y-3">
              {groupedCartItems.map((g, idx) => (
                <div key={`${g.ID_Oggetto}-${idx}`} className={`bg-white border border-slate-200 rounded-xl shadow-sm p-3 flex flex-col gap-3 ${g.tuttiPosticipati ? 'border-l-4 border-l-purple-400' : ''}`}>
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1">
                      <h4 className="text-sm font-bold text-slate-800 leading-tight mb-1">{g.nome}</h4>
                      <span className="text-[9px] font-mono text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">ID: {g.ID_Oggetto}</span>
                    </div>
                    <div className="text-right shrink-0 flex flex-col items-end gap-1">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border font-mono ${
                        g.isPreordine ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-slate-50 text-slate-700 border-slate-200"
                      }`}>
                        {g.isPreordine ? `${g.paidQuantity} / ${g.quantity} pz` : `${g.quantity} pz`}
                      </span>
                      {g.isPreordine && <span className="text-[9px] text-amber-600 font-semibold uppercase">Preordine</span>}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-slate-500 font-bold uppercase">Prezzo Unitario</span>
                      <span className="font-mono font-bold text-sm text-slate-800">€ {g.prezzoUnitario.toFixed(2)}</span>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {g.tuttiPagati ? (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 border border-emerald-200 text-emerald-700">
                          <CheckCircle className="h-2.5 w-2.5 text-emerald-500" />
                          <span>PAGATO</span>
                        </span>
                      ) : g.tuttiPosticipati ? (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 border border-purple-200 text-purple-700">
                          <Clock className="h-2.5 w-2.5" />
                          <span>POSTICIPATO</span>
                        </span>
                      ) : (
                        <div className="flex flex-col items-end gap-1">
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 border border-amber-200 text-amber-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                            <span>DA PAGARE</span>
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {(g.quantity > 1 || g.accontoPagato > 0) && (
                    <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono border-t border-slate-100 pt-2">
                      {g.quantity > 1 && (
                        <span className="text-indigo-600 font-bold bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                          Tot: €{(g.prezzoUnitario * g.quantity).toFixed(2)}
                        </span>
                      )}
                      {g.accontoPagato > 0 && (
                        <span className="text-blue-700 font-bold bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                          Acc: €{g.accontoPagato.toFixed(2)}
                        </span>
                      )}
                      {!g.tuttiPagati && g.accontoPagato > 0 && (
                        <span className="text-rose-600 font-bold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100">
                          Resta: €{Math.max(0, (g.prezzoUnitario * g.quantity) - g.accontoPagato).toFixed(2)}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Desktop Layout */}
            <div className="hidden md:block border border-slate-150 rounded-xl overflow-hidden overflow-x-auto shadow-3xs scrollbar-thin">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-150">
                  <tr>
                    <th className="px-4 py-2.5">Articolo</th>
                    <th className="px-4 py-2.5 text-center">Quantità</th>
                    <th className="px-4 py-2.5 text-right">Prezzo Unitario</th>
                    <th className="px-4 py-2.5 text-center">Stato Pagamento</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-slate-100 text-slate-700">
                  {groupedCartItems.map((g, idx) => (
                    <tr key={`${g.ID_Oggetto}-${idx}`} className={`hover:bg-slate-50/50 transition-colors ${g.tuttiPosticipati ? 'bg-purple-50/60 border-l-4 border-purple-400' : ''}`}>
                      <td className="px-4 py-2.5">
                        <span className="font-bold text-slate-800 block">
                          {g.nome}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          ID: {g.ID_Oggetto}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border font-mono ${
                          g.isPreordine
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-slate-50 text-slate-700 border-slate-200"
                        }`}>
                          {g.isPreordine ? `${g.paidQuantity} / ${g.quantity} pz` : `${g.quantity} pz`}
                        </span>
                        {g.isPreordine && (
                          <span className="block text-[9px] text-amber-600 font-semibold uppercase mt-0.5">
                            Preordine
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right font-semibold font-mono">
                        <div className="flex flex-col items-end justify-center">
                          <span>€ {g.prezzoUnitario.toFixed(2)}</span>
                          {(g.quantity > 1 || g.accontoPagato > 0) && (
                            <div className="text-[10px] font-mono mt-0.5 flex items-center justify-end gap-1 flex-wrap">
                              {g.quantity > 1 && (
                                <span className="text-indigo-600 font-bold">
                                  Tot: €{(g.prezzoUnitario * g.quantity).toFixed(2)}
                                </span>
                              )}
                              {g.accontoPagato > 0 && (
                                <span className="text-blue-700 font-medium">
                                  • Acc: €{g.accontoPagato.toFixed(2)}
                                </span>
                              )}
                              {!g.tuttiPagati && g.accontoPagato > 0 && (
                                <span className="text-rose-600 font-bold">
                                  (Resta: €{Math.max(0, (g.prezzoUnitario * g.quantity) - g.accontoPagato).toFixed(2)})
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {g.tuttiPagati ? (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 border border-emerald-200 text-emerald-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                            <span>PAGATO</span>
                          </span>
                        ) : g.tuttiPosticipati ? (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 border border-purple-200 text-purple-700">
                            <Clock className="h-2.5 w-2.5" />
                            <span>POSTICIPATO</span>
                          </span>
                        ) : (
                          <div className="flex flex-col items-center gap-1">
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 border border-amber-200 text-amber-700">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                              <span>DA PAGARE</span>
                            </span>
                            {g.accontoPagato > 0 && (
                              <span className="text-[9px] text-blue-600 font-bold bg-blue-50 px-1 py-0.5 rounded">
                                Acconto: €{g.accontoPagato.toFixed(2)}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </motion.div>

      {/* Zoom Modal */}
      {zoomedImage && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 backdrop-blur-sm p-4 animate-in fade-in duration-200 cursor-zoom-out" 
          onClick={() => setZoomedImage(null)}
        >
          <div className="relative max-w-7xl w-full max-h-[95vh] flex flex-col items-center justify-center cursor-default" onClick={(e) => e.stopPropagation()}>
            <button 
              onClick={() => setZoomedImage(null)}
              className="absolute -top-12 right-0 bg-white/10 hover:bg-white/20 text-white rounded-full p-2 transition-colors cursor-pointer"
            >
              <X className="h-6 w-6" />
            </button>
            <img 
              src={getDirectImageUrl(zoomedImage)} 
              alt="Zoomed" 
              className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl" 
              referrerPolicy="no-referrer" 
            />
          </div>
        </div>
      )}

      {/* WhatsApp Choice Modal */}
      <WhatsAppChoiceModal
        isOpen={isWaModalOpen}
        onClose={() => setIsWaModalOpen(false)}
        message={waMessage}
        phone={activeClientPhone || selectedCart.Telefono}
        clientName={activeClientName || selectedCart.Nome_Cliente}
        orderId={selectedCart.ID_Carrello}
      />
    </>
  );
});
