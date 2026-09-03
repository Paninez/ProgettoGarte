import { getShippingValidation, isCartRequiringCourier } from "../../lib/packlinkParser";
import { generateWhatsAppMessage } from "../../utils/whatsappExport";
import { isDataImmediata } from "../../lib/dateUtils";
import { StrikeBadge } from "./StrikeBadge";
import React, { useState } from "react";
import { motion } from "motion/react";
import { AddressAutocompleteInput } from "../common/AddressAutocompleteInput";
import {
  Archive,
  ArrowLeft,
  Check,
  Copy,
  User,
  Info,
  MapPin,
  Phone,
  Mail,
  Edit,
  Trash2,
  CheckCircle,
  Plus,
  Minus,
  Eye,
  ShoppingBag,
  Truck,
  X,
  ExternalLink,
  Lock,
  Tag,
  FileText,
  MessageCircle,
  Loader2,
  Clock,
  Flag,
  AlertTriangle,
  ShieldAlert,
} from "lucide-react";
import {
  Carrello,
  Spedizione,
  OggettoMagazzino,
  GradingItem,
  GradingGroup,
  ListinoGradingItem,
  CustomerLoyalty,
  DettaglioCarrello,
} from "../../types";
import { GradingItemsTable } from "./GradingItemsTable";
import { shortenUrlJSONP } from "../../lib/urlUtils";
import { WhatsAppChoiceModal } from "../common/WhatsAppChoiceModal";
import { sendWhatsAppMessage } from "../../lib/whatsapp";
import { ClientLoyaltyCard } from "./ClientLoyaltyCard";
import { calculateTierFromSpent, calculateLevelFromXP, TIERS_CONFIG } from "../../lib/loyaltyEngine";

interface CartDetailsEditableProps {
  customGlobalTags: string[];
  setCustomGlobalTags: (tags: string[]) => void;
  selectedCart: Carrello;
  setSelectedCartId: (id: string | null) => void;
  activeClientName: string;
  setActiveClientName: (val: string) => void;
  activeClientEmail: string;
  setActiveClientEmail: (val: string) => void;
  activeClientPhone: string;
  setActiveClientPhone: (val: string) => void;
  activeClientAddress: string;
  setActiveClientAddress: (val: string) => void;
  activeClientTag: string;
  setActiveClientTag: (val: string) => void;
  activeClientNote?: string;
  setActiveClientNote?: (val: string) => void;
  activeClientNoteInterne?: string;
  setActiveClientNoteInterne?: (val: string) => void;
  activeClientStrike: number;
  setActiveClientStrike: (val: number) => void;
  activeClientCattivoData: string;
  setActiveClientCattivoData: (val: string) => void;
  copiedField: string | null;
  handleCopy: (text: string, field: string) => void;
  isEditingClient: boolean;
  setIsEditingClient: (val: boolean) => void;
  onUpdateCartStrikes?: (cartId: string, strike: number, cattivoData: string) => Promise<void>;
  userRole: string;
  setDeleteConfirmText: (val: string) => void;
  setCartIdToDelete: (val: string) => void;
  groupedCartItems: any[];
  selectedItemIndexes: number[];
  setSelectedItemIndexes: React.Dispatch<React.SetStateAction<number[]>>;
  handleToggleSelectForGroup: (id: string, group: any) => void;
  handleSelectQuantityForGroup: (id: string, group: any, quantity: number) => void;
  handleDecrementQuantity: (indexes: number[]) => void;
  handleIncrementQuantity: (id: string, prezzo: number, idSpedizione?: string) => void;
  handlePriceChangeForGroup: (indexes: number[], newPrice: number) => void;
  handleAccontoChangeForGroup?: (indexes: number[], acconto: number) => void;
  handleAccontoChangeGradingItem?: (id: string, acconto: number) => void;
  handleTogglePaidForGroup: (indexes: number[], currentlyPaid: boolean) => void;
  handleTogglePosticipatoForGroup: (indexes: number[], currentlyPosticipato: boolean) => void;
  handleRemoveGroupFromCart: (indexes: number[]) => void;
  handleSplitGroupItem?: (indexes: number[]) => void;
  activeGradingItems: GradingItem[];
  isEditable: boolean;
  gruppiGrading: GradingGroup[];
  selectedGradingIds: string[];
  setSelectedGradingIds: React.Dispatch<React.SetStateAction<string[]>>;
  isShipped: boolean;
  listinoGrading: ListinoGradingItem[];
  viewedGradingStatusId: string | null;
  setViewedGradingStatusId: (val: string | null) => void;
  getDirectImageUrl: (url: string) => string;
  onUpdateCard: (id: string, updates: Partial<GradingItem>) => void | Promise<void>;
  handleTogglePaidGradingItem: (id: string) => void;
  handleTogglePosticipatoGradingItem: (id: string) => void;
  onUploadPhoto?: (file: File, folderType?: string, customName?: string, subFolderName?: string) => Promise<string>;
  handleRemoveGradingItem: (id: string) => void;

  setIsAddingGrading: (val: boolean) => void;
  cartTotals: {
    totaleCarrello: number;
    totalePagato: number;
    totaleAcconti?: number;
    rimanenza: number;
  };
  handleSaveActiveCart: (showSuccessMsg?: boolean) => void;
  isEditingItems: boolean;
  handleStartShipment: () => void;

  selectedCartShipment: Spedizione | null;
  handleDeliverShipment?: (idSpedizione: string, idCarrello: string) => void;
  handleUpdateShipmentStatus?: (idSpedizione: string, idCarrello: string, newStatus: string) => void;
  handleGoToLiveCart?: (cart: Carrello) => void;
  onDeleteCart: (id: string) => void;
  relatedShipments: Spedizione[];
  showClosedOnly: boolean;
  handleGoToShipment: (shipment: Spedizione) => void;
  magazzino: OggettoMagazzino[];
  reservedInOtherCarts: Record<string, number> | ((id: string) => number);
  activeCartItems: any[];
  setIsEditingItems: (val: boolean) => void;
  handleAddItemToCart: (id: string) => void;
  onOpenImportModal?: () => void;
  loyaltyProfiles?: CustomerLoyalty[];
  carrelli?: Carrello[];
  dettagli?: DettaglioCarrello[];
  onNavigate?: (tab: string) => void;
}

export const CartDetailsEditable: React.FC<CartDetailsEditableProps> = React.memo(({
  customGlobalTags,
  setCustomGlobalTags,
  loyaltyProfiles = [],
  carrelli = [],
  dettagli = [],
  onNavigate,
  selectedCart,
  setSelectedCartId,
  activeClientName,
  setActiveClientName,
  activeClientEmail,
  setActiveClientEmail,
  activeClientPhone,
  setActiveClientPhone,
  activeClientAddress,
  setActiveClientAddress,
  activeClientTag,
  setActiveClientTag,
  activeClientNote = "",
  setActiveClientNote,
  activeClientNoteInterne = "",
  setActiveClientNoteInterne,
  activeClientStrike,
  setActiveClientStrike,
  activeClientCattivoData,
  setActiveClientCattivoData,
  copiedField,
  handleCopy,
  isEditingClient,
  setIsEditingClient,
  onUpdateCartStrikes,
  userRole,
  setDeleteConfirmText,
  setCartIdToDelete,
  groupedCartItems,
  selectedItemIndexes,
  setSelectedItemIndexes,
  handleToggleSelectForGroup,
  handleSelectQuantityForGroup,
  handleDecrementQuantity,
  handleIncrementQuantity,
  handlePriceChangeForGroup,
  handleAccontoChangeForGroup,
  handleAccontoChangeGradingItem,
  handleTogglePaidForGroup,
  handleTogglePosticipatoForGroup,
  handleRemoveGroupFromCart,
  handleSplitGroupItem,
  activeGradingItems,
  isEditable,
  gruppiGrading,
  selectedGradingIds,
  setSelectedGradingIds,
  isShipped,
  listinoGrading,
  viewedGradingStatusId,
  setViewedGradingStatusId,
  getDirectImageUrl,
  onUpdateCard,
  handleTogglePaidGradingItem,
  handleTogglePosticipatoGradingItem,
  onUploadPhoto,
  handleRemoveGradingItem,

  setIsAddingGrading,
  cartTotals,
  handleSaveActiveCart,
  isEditingItems,
  handleStartShipment,

  selectedCartShipment,
  handleDeliverShipment,
  onDeleteCart,
  relatedShipments,
  showClosedOnly,
  handleGoToShipment,
  magazzino,
  reservedInOtherCarts,
  activeCartItems,
  setIsEditingItems,
  handleAddItemToCart,
  onOpenImportModal,
}) => {
  const [zoomedImage, setZoomedImage] = React.useState<string | null>(null);
  const [showUnpaidOnly, setShowUnpaidOnly] = React.useState(false);
  const [isExportingWa, setIsExportingWa] = React.useState(false);
  const [isWaModalOpen, setIsWaModalOpen] = React.useState(false);
  const [waMessage, setWaMessage] = React.useState("");
  const visibleGroupedCartItems = React.useMemo(() => groupedCartItems.filter((g: any) => !showUnpaidOnly || (!g.tuttiPagati && g.prezzoUnitario > 0)), [groupedCartItems, showUnpaidOnly]);
  const [customTagInput, setCustomTagInput] = React.useState("");
  const [editingAccontoId, setEditingAccontoId] = React.useState<string | null>(null);
  const [tempAccontoValue, setTempAccontoValue] = React.useState<string>("");

  const [itemSearchQuery, setItemSearchQuery] = React.useState("");
  const [isItemDropdownOpen, setIsItemDropdownOpen] = React.useState(false);
  const itemComboboxRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (itemComboboxRef.current && !itemComboboxRef.current.contains(event.target as Node)) {
        setIsItemDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const availableInventoryItems = React.useMemo(() => {
    return magazzino
      .map((m) => {
        const otherReserved = typeof reservedInOtherCarts === "function"
          ? reservedInOtherCarts(m.ID_Oggetto)
          : ((reservedInOtherCarts as any)[m.ID_Oggetto] || 0);
        const currentInCart = activeCartItems.filter(
          (item) => item.ID_Oggetto === m.ID_Oggetto,
        ).length;
        const realAvailable = Math.max(
          0,
          m.Quantità_Disponibile - otherReserved - currentInCart,
        );
        return { ...m, realAvailable };
      })
      .filter((m) => m.realAvailable > 0 || m.Quantità_Disponibile > 0);
  }, [magazzino, reservedInOtherCarts, activeCartItems]);

  const filteredInventoryItems = React.useMemo(() => {
    if (!itemSearchQuery.trim()) {
      return availableInventoryItems;
    }
    const searchTerms = itemSearchQuery.toLowerCase().trim().split(/\s+/).filter(Boolean);
    return availableInventoryItems.filter((item) => {
      const name = item.Nome.toLowerCase();
      const id = item.ID_Oggetto.toLowerCase();
      return searchTerms.every((term) => name.includes(term) || id.includes(term));
    });
  }, [availableInventoryItems, itemSearchQuery]);

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
      
      if (visibleGroupedCartItems.length > 0) {
        msg += `📦 *OGGETTI NEL CARRELLO:*\n\n`;
        
        const groupedStandard: any = {};
        visibleGroupedCartItems.forEach((item: any) => {
          const m = magazzino.find(x => x.ID_Oggetto === item.ID_Oggetto);
          const name = m ? m.Nome : item.nome;
          const dataSped = m?.Data_Spedizione_Presunta || "";
          
          const key = `${name}_${item.tuttiPagati}_${item.prezzoUnitario}_${dataSped}`;
          if (!groupedStandard[key]) {
            groupedStandard[key] = { count: 0, name, paid: item.tuttiPagati, price: item.prezzoUnitario, acconto: 0, dataSped };
          }
          groupedStandard[key].count += item.quantity;
          
          if (!item.tuttiPagati) {
            toPay += Number(item.prezzoUnitario || 0) * (item.quantity - item.paidQuantity);
            if (item.accontoPagato) {
              toPay -= item.accontoPagato;
              groupedStandard[key].acconto += item.accontoPagato;
            }
          }
        });

        const byDate: Record<string, any[]> = {};
        Object.values(groupedStandard).forEach((g: any) => {
          const dateKey = g.dataSped || "Immediata";
          if (!byDate[dateKey]) byDate[dateKey] = [];
          byDate[dateKey].push(g);
        });

        if (byDate["Immediata"] && byDate["Immediata"].length > 0) {
          msg += `*Disponibilità immediata:*\n`;
          byDate["Immediata"].forEach(g => {
            let priceStr = g.paid ? 'Pagato ✅' : `Non pagato ❌ (€${(Number(g.price || 0) * Number(g.count || 0)).toFixed(2)})`;
            if (!g.paid && g.acconto > 0) {
              const remaining = Math.max(0, Number(g.price || 0) * Number(g.count || 0) - g.acconto);
              priceStr = `Pagato parzialmente 🟡 (Rimangono €${remaining.toFixed(2)} • Acconto: €${g.acconto.toFixed(2)})`;
            }
            msg += `- *${g.name}* x${g.count} - ${priceStr}\n`;
          });
          msg += `\n`;
        }

        const futureDates = Object.keys(byDate).filter(k => k !== "Immediata").sort();
        futureDates.forEach(date => {
          msg += `*Disponibilità dal ${date}:*\n`;
          byDate[date].forEach(g => {
            let priceStr = g.paid ? 'Pagato ✅' : `Non pagato ❌ (€${(Number(g.price || 0) * Number(g.count || 0)).toFixed(2)})`;
            if (!g.paid && g.acconto > 0) {
              const remaining = Math.max(0, Number(g.price || 0) * Number(g.count || 0) - g.acconto);
              priceStr = `Pagato parzialmente 🟡 (Rimangono €${remaining.toFixed(2)} • Acconto: €${g.acconto.toFixed(2)})`;
            }
            msg += `- *${g.name}* x${g.count} - ${priceStr}\n`;
          });
          msg += `\n`;
        });
      }

      const filteredGrading = activeGradingItems.filter(item => !item.Reso && (!showUnpaidOnly || (!item.Pagato_Singolarmente && item.Costo_Cliente > 0)));
      if (filteredGrading.length > 0) {
        msg += `🔍 *SERVIZIO GRADING:*\n`;
        for (const g of filteredGrading) {
          const name = g.Nome_Carta || (g as any).Nome_Oggetto || 'Oggetto Grading';
          const group = gruppiGrading.find(gr => gr.ID_Gruppo_Grading === g.ID_Gruppo_Grading);
          
          const details: string[] = [];
          if (g.Tipologia_Servizio) details.push(`Servizio: ${g.Tipologia_Servizio}`);
          if (group?.Stato_Gruppo) details.push(`Stato: ${formatStatoHuman(group.Stato_Gruppo)}`);
          
          const detailsStr = details.length > 0 ? ` (${details.join(' • ')})` : '';
          
          let gPriceStr = g.Pagato_Singolarmente ? 'Pagato ✅' : `Non pagato ❌ (€${Number(g.Costo_Cliente || 0).toFixed(2)})`;
          if (!g.Pagato_Singolarmente && g.Acconto_Pagato) {
             const remaining = Math.max(0, Number(g.Costo_Cliente || 0) - Number(g.Acconto_Pagato || 0));
             gPriceStr = `Pagato parzialmente 🟡 (Rimangono €${remaining.toFixed(2)} • Acconto: €${Number(g.Acconto_Pagato || 0).toFixed(2)})`;
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
          
          if (!g.Pagato_Singolarmente) {
            toPay += Number(g.Costo_Cliente || 0);
            if (g.Acconto_Pagato) toPay -= Number(g.Acconto_Pagato || 0);
          }
        }
        msg += `\n`;
      }
      
      if (selectedCartShipment) {
        msg += `🚚 *INFO SPEDIZIONE:*\n`;
        msg += `- Corriere: ${selectedCartShipment.Corriere || 'Non specificato'}\n`;
        if (selectedCartShipment.Costo_Spedizione) {
           msg += `- Costo: €${selectedCartShipment.Costo_Spedizione}\n`;
        }
        if (selectedCartShipment.Tracking) {
           msg += `- Tracking: ${selectedCartShipment.Tracking}\n`;
        }
        msg += `\n`;
        
        let shipmentPhotosText = "";
        let photoCount = 1;
        const allShipmentItems = [...activeCartItems, ...activeGradingItems].filter(i => !i.Reso && i.ID_Spedizione === selectedCartShipment.ID_Spedizione);
        for (const item of allShipmentItems) {
          if (item.Link_Foto) {
            const fotoLinks = item.Link_Foto.split(',').filter(Boolean);
            for (let idx = 0; idx < fotoLinks.length; idx++) {
              const short = await shortenUrlJSONP(fotoLinks[idx].trim());
              shipmentPhotosText += `- Foto ${photoCount}: ${short}\n`;
              photoCount++;
            }
          }
        }
        if (shipmentPhotosText) {
          msg += `📸 *FOTO SPEDIZIONE & CONTROLLO QUALITÀ:*\n` + shipmentPhotosText + `\n`;
        }
      }

      if (toPay > 0) {
        msg += `----------------------------------------\n`;
        msg += `💰 *TOTALE ANCORA DA PAGARE:* €${Number(toPay || 0).toFixed(2)}\n`;
      }
      
      msg += `\nPer qualsiasi dubbio o domanda contattami.\nGrazie mille! ✨`;

      sendWhatsAppMessage(msg, selectedCart.Telefono || activeClientPhone || "");
    } catch (err) {
      console.error(err);
      alert("Errore durante l'esportazione WhatsApp");
    } finally {
      setIsExportingWa(false);
    }
  };

  const basePredefined = ["📦 Spedizione Richiesta", "⏳ Pagamento Posticipato", "Spedizione con corriere", "Consegna A mano Napoli", "Consegna a Mano Roma", "Consegna Vinted", "Aspetto Dopo Le Vacanze"];
  const predefinedTagsList = Array.from(new Set([...basePredefined, ...(customGlobalTags || [])]));
  const currentTags = (activeClientTag || "").split(",").map(t => t.trim()).filter(Boolean);
  const customTags = currentTags.filter(t => !predefinedTagsList.includes(t));

  const togglePredefinedTag = (tag: string) => {
    let tags = [...currentTags];
    if (tags.includes(tag)) {
      tags = tags.filter(t => t !== tag);
    } else {
      tags.push(tag);
    }
    setActiveClientTag(tags.join(", "));
  };

  const removeCustomTag = (tagToRemove: string) => {
    const newTags = currentTags.filter(t => t !== tagToRemove);
    setActiveClientTag(newTags.join(", "));
  };

  const addCustomTag = () => {
    if (customTagInput.trim()) {
      const trimmed = customTagInput.trim();
      const newTags = [...currentTags, trimmed];
      setActiveClientTag(newTags.join(", "));
      
      if (!(customGlobalTags || []).includes(trimmed) && !basePredefined.includes(trimmed)) {
        setCustomGlobalTags([...(customGlobalTags || []), trimmed]);
      }
      setCustomTagInput("");
    }
  };
  
  const deleteGlobalTag = (e: React.MouseEvent, tagToDelete: string) => {
    e.stopPropagation();
    const newGlobal = (customGlobalTags || []).filter(t => t !== tagToDelete);
    setCustomGlobalTags(newGlobal);
    // optionally remove from current cart if it was there? No, just keep it on the cart as a normal custom tag
  };

  const isReadyForImmediateShipping = React.useMemo(() => {
    const unshipped = activeCartItems?.filter(d => !d.ID_Spedizione) || [];
    const numOggetti = unshipped.length;
    
    if (numOggetti === 0) return false;
    
    return unshipped.every(d => {
      const magItem = magazzino.find(m => m.ID_Oggetto === d.ID_Oggetto);
      return isDataImmediata(magItem?.Data_Spedizione_Presunta);
    });
  }, [activeCartItems, magazzino]);

  return (
    <>
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-6 space-y-6 pb-28 md:pb-6"
      >
        {isReadyForImmediateShipping && (
          <div className="bg-emerald-500 text-white font-bold text-sm sm:text-base text-center py-2.5 px-4 rounded-xl shadow-md border-2 border-emerald-600 uppercase tracking-widest animate-in fade-in zoom-in duration-300">
            TUTTI GLI OGGETTI DISPONIBILI POSSIBILE DA SPEDIRE
          </div>
        )}
        {/* Back to List Button for Mobile & Desktop */}
        <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setSelectedCartId(null)}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Torna alla Lista
          </button>
          <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded-md font-bold font-mono">
            {selectedCart.ID_Carrello}
          </span>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="h-12 w-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xl shadow-md shrink-0">
              {activeClientName ? activeClientName.substring(0, 2).toUpperCase() : "??"}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100 uppercase tracking-widest shrink-0">
                  Dettaglio Ordine
                </span>
                <span className="text-xs text-slate-400 font-mono flex items-center">
                  {selectedCart.ID_Carrello}
                  <button
                    onClick={() => handleCopy(selectedCart.ID_Carrello, "id")}
                    className="ml-1 hover:text-indigo-500 transition-colors"
                  >
                    {copiedField === "id" ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                  </button>
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-0.5">
                <h2 className="text-2xl font-bold text-slate-900 leading-tight">
                  {activeClientName || "Nuovo Cliente"}
                </h2>

                {activeClientName && (                  (() => {
                    const handleStrikeUpdate = (cartId: string, strike: number, cattivoData: string) => {
                      setActiveClientStrike(strike);
                      setActiveClientCattivoData(cattivoData);
                      if (onUpdateCartStrikes) {
                        onUpdateCartStrikes(cartId, strike, cattivoData);
                      }
                    };
                    return (
                      <div className="ml-1 flex items-center">
                        <StrikeBadge
                          strikesCount={activeClientStrike || 0}
                          cattivoData={activeClientCattivoData || ""}
                          clientName={activeClientName}
                          cartId={selectedCart.ID_Carrello}
                          onUpdateStrikes={handleStrikeUpdate}
                        />
                      </div>
                    );
                  })()
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button
                type="button"
                onClick={handleExportWhatsApp}
                disabled={isExportingWa}
                className="flex items-center space-x-1.5 px-3 py-1.5 border border-green-200 text-green-700 bg-green-50 hover:bg-green-100 rounded-xl text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 shrink-0"
                title="Esporta per WhatsApp"
              >
                {isExportingWa ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
                <span className="inline">{isExportingWa ? 'Exporting...' : 'WhatsApp'}</span>
              </button>
            {isEditable && userRole === "admin" && (
              <button
                onClick={() => {
                  setCartIdToDelete(selectedCart.ID_Carrello);
                  setDeleteConfirmText("");
                }}
                className="flex items-center space-x-1.5 px-3 py-1.5 border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
              >
                <Trash2 className="h-4 w-4" />
                <span className="hidden sm:inline">Elimina</span>
              </button>
            )}
            <span
              className={"px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider border flex items-center space-x-1.5 " + (
                selectedCart.Stato_Carrello === "Completato"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                  : selectedCart.Stato_Carrello === "Spedizione_Ricevuta_da_Consegnare"
                  ? "bg-emerald-100 border-emerald-300 text-emerald-800"
                  : selectedCart.Stato_Carrello === "Pronto_per_Spedizione"
                  ? "bg-blue-50 border-blue-200 text-blue-700"
                  : "bg-slate-50 border-slate-200 text-slate-700"
              )}
            >
              {selectedCart.Stato_Carrello === "Spedizione_Ricevuta_da_Consegnare" && <CheckCircle className="h-4 w-4" />}
              {selectedCart.Stato_Carrello === "Pronto_per_Spedizione" && <ShoppingBag className="h-4 w-4" />}
              {selectedCart.Stato_Carrello === "Aperto" && <ShoppingBag className="h-4 w-4" />}
              <span>{selectedCart.Stato_Carrello.replace(/_/g, " ")}</span>
            </span>
          </div>
        </div>

        {/* Redesigned Dati Cliente e Spedizione */}
        <div className="bg-slate-50/50 border border-slate-200 rounded-xl p-3 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center space-x-1.5 text-slate-700">
              <User className="h-4 w-4 text-indigo-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider">Cliente & Spedizione</h3>
            </div>
            {isEditable && (
              <button
                onClick={() => {
                  if (isEditingClient) {
                    if (!activeClientName.trim()) {
                      alert("Il nome cliente non può essere vuoto.");
                      return;
                    }
                    setIsEditingClient(false);
                    handleSaveActiveCart(true);
                  } else {
                    setIsEditingClient(true);
                  }
                }}
                className="flex items-center space-x-1 px-2.5 py-1 rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer text-[10px] font-bold shadow-xs"
              >
                {isEditingClient ? <><Check className="h-3 w-3 text-emerald-500"/><span>Salva Info</span></> : <><Edit className="h-3 w-3"/><span>Modifica</span></>}
              </button>
            )}
          </div>
          
          {isEditable && isEditingClient ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 animate-in fade-in slide-in-from-top-2">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nome Cliente <span className="text-rose-500">*</span></label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                    <User className="h-4 w-4 text-slate-400" />
                  </div>
                  <input type="text" value={activeClientName} onChange={(e) => setActiveClientName(e.target.value)} className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Telefono</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                    <Phone className="h-4 w-4 text-slate-400" />
                  </div>
                  <input type="tel" inputMode="tel" autoComplete="tel" value={activeClientPhone} onChange={(e) => setActiveClientPhone(e.target.value)} className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-base sm:text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Email</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                    <Mail className="h-4 w-4 text-slate-400" />
                  </div>
                  <input type="email" value={activeClientEmail} onChange={(e) => setActiveClientEmail(e.target.value)} className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
                </div>
              </div>
              <div className="md:col-span-2 lg:col-span-4 space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                  <span>Indirizzo Completo di Spedizione</span>
                </label>
                <div className="relative">
                  <div className="absolute top-2.5 left-2.5 flex items-start pointer-events-none">
                    <MapPin className="h-4 w-4 text-slate-400" />
                  </div>
                  <textarea
                    rows={2}
                    value={activeClientAddress}
                    onChange={(e) => setActiveClientAddress(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none"
                    placeholder="Via, CAP, Città, Provincia, ecc..."
                  />
                </div>
              </div>

              {/* Note al Carrello / Stampa Etichetta */}
              <div className="md:col-span-2 lg:col-span-2 space-y-1.5 mt-1">
                <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-amber-600" />
                  Note al Carrello (Visibili)
                </label>
                <textarea
                  rows={2}
                  value={activeClientNote}
                  onChange={(e) => setActiveClientNote && setActiveClientNote(e.target.value)}
                  placeholder="Es: Consegnare di pomeriggio, Codice Citofono 1234..."
                  className="w-full px-3 py-2 border border-amber-300 bg-amber-50/40 rounded-lg text-sm font-medium focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none resize-y"
                />
              </div>

              {/* Note Interne (Private) */}
              <div className="md:col-span-2 lg:col-span-2 space-y-1.5 mt-1">
                <label className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-indigo-600" />
                  Note Interne (Private)
                </label>
                <textarea
                  rows={2}
                  value={activeClientNoteInterne}
                  onChange={(e) => setActiveClientNoteInterne && setActiveClientNoteInterne(e.target.value)}
                  placeholder="Note private per lo staff. Non verranno stampate o mostrate..."
                  className="w-full px-3 py-2 border border-indigo-200 bg-indigo-50/40 text-indigo-900 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-y placeholder-indigo-300"
                />
              </div>

              <div className="md:col-span-2 lg:col-span-4 space-y-2 mt-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tag / Info Spedizione Rapida</label>
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                    <div className="flex-1 space-y-2">
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                            <Tag className="h-4 w-4 text-slate-400" />
                          </div>
                          <input type="text" value={customTagInput} onChange={(e) => setCustomTagInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomTag(); } }} placeholder="Aggiungi tag (Premi Invio)" className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
                        </div>
                        <button type="button" onClick={addCustomTag} className="px-3 py-2 bg-indigo-50 text-indigo-600 font-bold rounded-lg text-sm border border-indigo-100 hover:bg-indigo-100 transition-colors shrink-0">Aggiungi</button>
                      </div>
                      {customTags.length > 0 && (
                        <div className="flex flex-wrap gap-2 p-2 bg-slate-50 rounded-lg border border-slate-100 items-center min-h-[40px]">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">Personalizzati:</span>
                          {customTags.map((tag) => (
                            <span key={tag} className="flex items-center gap-1.5 px-2 py-1 rounded bg-indigo-100 border border-indigo-200 text-indigo-700 text-xs font-bold shadow-sm">
                              {tag}
                              <button type="button" onClick={() => removeCustomTag(tag)} className="hover:bg-indigo-200 rounded-full p-0.5 text-indigo-500 hover:text-indigo-800 transition-colors focus:outline-none">
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 sm:w-1/2">
                      {predefinedTagsList.map((tag) => {
                        const isCustomGlobal = (customGlobalTags || []).includes(tag) && !basePredefined.includes(tag);
                        return (
                          <div key={tag} className={"group relative flex items-center px-3 py-1.5 rounded-lg border transition-colors cursor-pointer " + (currentTags.includes(tag) ? "bg-indigo-100 border-indigo-200 text-indigo-700 shadow-sm" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50")} onClick={() => togglePredefinedTag(tag)}>
                            <span className="text-xs font-bold uppercase">{tag}</span>
                            {isCustomGlobal && (
                              <button type="button" onClick={(e) => deleteGlobalTag(e, tag)} className="ml-1.5 -mr-1 p-0.5 rounded-full hover:bg-slate-200/50 text-slate-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 focus:outline-none" title="Rimuovi dai tag salvati">
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm shadow-sm shrink-0">
                  {(activeClientName || "?").substring(0, 2).toUpperCase()}
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-x-3 gap-y-1">
                  <span className="text-sm font-bold text-slate-900 leading-none">{activeClientName || "N/A"}</span>
                  
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
                    {activeClientPhone && (
                      <span className="flex items-center font-mono">
                        <Phone className="h-3 w-3 mr-1 text-slate-400" />
                        {activeClientPhone}
                      </span>
                    )}
                    {activeClientEmail && (
                      <span className="flex items-center">
                        <Mail className="h-3 w-3 mr-1 text-slate-400" />
                        {activeClientEmail}
                      </span>
                    )}
                    {activeClientAddress ? (
                      <span className="flex items-center text-slate-700 font-semibold bg-indigo-50/50 px-2 py-0.5 rounded border border-indigo-100/80 max-w-[200px] md:max-w-[300px] truncate" title={activeClientAddress}>
                        <MapPin className="h-3.5 w-3.5 mr-1 text-indigo-600 shrink-0" />
                        <span className="truncate">{activeClientAddress}</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsEditingClient(true)}
                        className="text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                        title="Clicca per inserire l'indirizzo di spedizione nei dati cliente"
                      >
                        <MapPin className="h-3 w-3 text-rose-500" />
                        <span>Indirizzo Mancante (Inserisci)</span>
                      </button>
                    )}
                    {!activeClientPhone && !activeClientEmail && !activeClientAddress && (
                      <span className="text-slate-400 italic">Nessun contatto aggiunto</span>
                    )}
                  </div>
                </div>
              </div>
              
              {currentTags.length > 0 && (
                <div className="shrink-0 flex flex-wrap items-center gap-1.5">
                  {currentTags.map(tag => (
                    <div key={tag} className="flex items-center space-x-1 text-indigo-700 font-bold bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded text-[9px] shadow-sm uppercase tracking-wider">
                      <Tag className="h-2.5 w-2.5" />
                      <span>{tag}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
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

        {/* Totals & Bivio Buttons */}
        <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="grid grid-cols-3 gap-6 text-center sm:text-left">
            <div>
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest block">
                Totale
              </span>
              <span className="text-sm font-bold font-mono text-slate-800">
                € {cartTotals.totaleCarrello.toFixed(2)}
              </span>
            </div>
            <div>
              <span className="text-[9px] text-emerald-500 font-bold uppercase tracking-widest block">
                Pagato
              </span>
              <span className="text-sm font-bold font-mono text-emerald-600 block">
                € {cartTotals.totalePagato.toFixed(2)}
              </span>
              {!!cartTotals.totaleAcconti && cartTotals.totaleAcconti > 0 && (
                <span className="text-[9px] font-semibold text-indigo-600 block">
                  (incl. € {cartTotals.totaleAcconti.toFixed(2)} acc.)
                </span>
              )}
            </div>
            <div>
              <span className="text-[9px] text-amber-500 font-bold uppercase tracking-widest block">
                Da Pagare
              </span>
              <span className="text-sm font-bold font-mono text-amber-700">
                € {cartTotals.rimanenza.toFixed(2)}
              </span>
            </div>
          </div>

          {isEditable && (
            <div className="flex flex-wrap gap-3 w-full sm:w-auto justify-end">
              {/* Auto-save indicator / Manual save */}
              <button
                type="button"
                onClick={() => handleSaveActiveCart(false)}
                disabled={!isEditingItems}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-widest transition-colors shadow-xs ${
                  isEditingItems
                    ? "bg-amber-100 text-amber-700 border border-amber-300 cursor-pointer hover:bg-amber-200 animate-pulse"
                    : "bg-white text-slate-400 border border-slate-200 cursor-default"
                }`}
              >
                {isEditingItems ? "Salvataggio..." : "Salvato"}
              </button>
              {/* Bivio 2: Procedi a Spedizione */}
              <button
                type="button"
                onClick={handleStartShipment}
                className="flex-1 sm:flex-none px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100 cursor-pointer"
              >
                Procedi a Spedizione
              </button>
            </div>
          )}
        </div>

        {/* MULTIPLE SHIPMENTS VISUALIZATION */}
        {relatedShipments && relatedShipments.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
            <h4 className="font-bold text-slate-700 text-xs uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-100 pb-2">
              📦 Spedizioni Precedenti
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
              {relatedShipments.map((shipment, idx) => {
                const shipTags = [
                  ...(selectedCart?.Tag ? selectedCart.Tag.split(",") : []),
                  ...(shipment.Tag ? shipment.Tag.split(",") : [])
                ].map(t => t.trim()).filter(Boolean);
                const uniqueShipTags = Array.from(new Set(shipTags));

                return (
                  <div key={shipment.ID_Spedizione} className="bg-slate-50 border border-slate-150 p-3 rounded-xl space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-extrabold text-slate-500 uppercase tracking-wider text-[10px]">Spedizione {idx + 1}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
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
                    <div className="flex justify-between items-center text-slate-600">
                      <span className="font-semibold text-slate-400">ID:</span>
                      <span className="font-mono text-indigo-600">{shipment.ID_Spedizione}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600">
                      <span className="font-semibold text-slate-400">Data:</span>
                      <span className="font-medium">{shipment.Data_Spedizione}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600">
                      <span className="font-semibold text-slate-400">Tracking:</span>
                      <span className="font-mono bg-white px-1.5 py-0.5 border border-slate-200 rounded">{shipment.Tracking || "N/D"}</span>
                    </div>
                    {uniqueShipTags.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {uniqueShipTags.map((t, tIdx) => (
                          <span key={tIdx} className="px-2 py-0.5 bg-indigo-50 text-indigo-800 border border-indigo-200 rounded-full text-[9px] font-semibold">
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                    {handleGoToShipment && (
                      <div className="pt-2 border-t border-slate-200/60 flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleGoToShipment(shipment)}
                          className="flex items-center space-x-1 px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded text-[9px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                          title="Vedi dettagli spedizione in Logistica"
                        >
                          <Archive className="h-3 w-3" />
                          <span>Vedi Spedizione</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Cart Items Table */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-slate-700 text-xs uppercase tracking-widest">
              Articoli Inseriti
            </h4>
            <div className="flex justify-end pt-2 pb-1 ml-2">
              <label className="flex items-center space-x-1.5 cursor-pointer bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm hover:border-indigo-200 transition-colors">
                <input
                  type="checkbox"
                  checked={showUnpaidOnly}
                  onChange={(e) => setShowUnpaidOnly(e.target.checked)}
                  className="rounded border-slate-300 text-rose-600 focus:ring-rose-500 h-4 w-4"
                />
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  Da Pagare
                </span>
              </label>
            </div>
            {isEditable && (
              <div ref={itemComboboxRef} className="relative w-full max-w-[280px]">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="+ Cerca e Aggiungi Oggetto..."
                    value={itemSearchQuery}
                    onFocus={() => setIsItemDropdownOpen(true)}
                    onChange={(e) => {
                      setItemSearchQuery(e.target.value);
                      setIsItemDropdownOpen(true);
                    }}
                    className="w-full px-3 py-2 pl-8 pr-8 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-800 placeholder-slate-400 font-medium transition-all shadow-xs hover:border-slate-400"
                  />
                  <Plus className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                  {itemSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setItemSearchQuery("")}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {isItemDropdownOpen && (
                  <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl max-h-72 overflow-y-auto divide-y divide-slate-100 scrollbar-thin animate-slide-up">
                    {filteredInventoryItems.length === 0 ? (
                      <div className="p-3 text-slate-400 text-xs italic text-center">
                        Nessun articolo corrispondente
                      </div>
                    ) : (
                      filteredInventoryItems.map((m, idx) => {
                        const isDisabled = m.realAvailable === 0;
                        return (
                          <button
                            key={`${m.ID_Oggetto}-${idx}`}
                            type="button"
                            disabled={isDisabled}
                            onClick={() => {
                              handleAddItemToCart(m.ID_Oggetto);
                              setItemSearchQuery("");
                              setIsItemDropdownOpen(false);
                            }}
                            className={`w-full text-left p-2.5 flex flex-col gap-1 transition-colors hover:bg-slate-50 cursor-pointer ${
                              isDisabled ? "opacity-50 cursor-not-allowed bg-slate-50/50" : ""
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span className="font-semibold text-slate-800 text-xs line-clamp-2">
                                {m.Nome}
                              </span>
                              <span className="shrink-0 font-bold text-indigo-600 text-xs">
                                €{m.Prezzo_Vendita}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="font-mono text-slate-400">
                                ID: {m.ID_Oggetto}
                              </span>
                              {isDisabled ? (
                                <span className="font-bold text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded-sm">
                                  ESAURITO / RISERVATO
                                </span>
                              ) : (
                                <span className="font-semibold text-slate-500">
                                  Disp:{" "}
                                  <strong className="text-emerald-600">
                                    {m.realAvailable}
                                  </strong>{" "}
                                  / {m.Quantità_Disponibile}
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Handheld & Mobile optimized List layout (hidden on desktop) */}
          <div className="md:hidden space-y-3">
            {visibleGroupedCartItems.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-2xl">
                Il carrello è vuoto. Seleziona oggetti dall'inventario per aggiungerli.
              </div>
            ) : (
              visibleGroupedCartItems.map((g, idx) => (
                <div
                  key={`${g.ID_Oggetto}-${idx}`}
                  className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col p-3 gap-3"
                >
                  {/* Top row: Image & Name & Delete */}
                  <div className="flex items-start gap-3">
                    {/* Name & ID */}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-slate-800 line-clamp-2 leading-tight mb-1">
                        {g.nome}
                      </h4>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-mono text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                          ID: {g.ID_Oggetto}
                        </span>
                        {isEditable && g.quantity > 1 && handleSplitGroupItem && (
                          <button
                            type="button"
                            onClick={() => handleSplitGroupItem(g.originalIndexes)}
                            className="px-1.5 py-0.5 text-[9px] font-bold bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded cursor-pointer border border-indigo-100"
                          >
                            Sdoppia
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Delete button */}
                    <div className="shrink-0">
                      <button
                        type="button"
                        onClick={() => handleRemoveGroupFromCart(g.originalIndexes)}
                        className="p-1.5 text-rose-500 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Middle row: Qty & Price */}
                  <div className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-lg p-2">
                    {/* Qty */}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-500 font-bold uppercase">Qtà</span>
                      {isEditable ? (
                        <div className="flex items-center bg-white border border-slate-200 rounded-lg shadow-sm">
                          <button
                            type="button"
                            onClick={() => handleDecrementQuantity(g.originalIndexes)}
                            className="w-7 h-7 flex items-center justify-center font-bold text-slate-600 hover:bg-slate-50 rounded-l-lg"
                          >
                            -
                          </button>
                          <span className="w-6 text-center font-bold text-slate-800 text-xs">
                            {g.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleIncrementQuantity(g.ID_Oggetto, g.prezzoUnitario, g.idSpedizione)}
                            className="w-7 h-7 flex items-center justify-center font-bold text-slate-600 hover:bg-slate-50 rounded-r-lg"
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <span className="font-bold text-slate-800 text-sm">{g.quantity}</span>
                      )}
                    </div>
                    
                    {/* Price */}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-500 font-bold uppercase">Prezzo</span>
                      {isEditable ? (
                        <div className="flex items-center gap-1">
                          <span className="text-slate-400 text-sm font-semibold">€</span>
                          <input
                            type="number"
                            step="0.01"
                            value={g.prezzoUnitario}
                            onChange={(e) => handlePriceChangeForGroup(g.originalIndexes, parseFloat(e.target.value) || 0)}
                            className="w-16 px-1.5 py-1 border border-slate-300 rounded text-right text-sm bg-white font-mono font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                      ) : (
                        <span className="font-mono font-bold text-sm text-slate-800">€ {g.prezzoUnitario.toFixed(2)}</span>
                      )}
                    </div>
                  </div>

                  {/* Sub-info row (Tot, Acconto, Status) */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono border-t border-slate-100 pt-2">
                    <div className="flex flex-wrap gap-1">
                      {g.quantity > 1 && (
                        <span className="text-indigo-600 font-bold bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                          Tot: €{(g.prezzoUnitario * g.quantity).toFixed(2)}
                        </span>
                      )}
                      {(g.accontoPagato > 0 || g.paidQuantity > 0) && (
                        <span className="text-blue-700 font-bold bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                          Pagato: €{((g.paidQuantity * g.prezzoUnitario) + g.accontoPagato).toFixed(2)}
                        </span>
                      )}
                      {!g.tuttiPagati && (g.accontoPagato > 0 || g.paidQuantity > 0) && (
                        <span className="text-rose-600 font-bold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100">
                          Resta: €{Math.max(0, (g.quantity - g.paidQuantity) * g.prezzoUnitario - g.accontoPagato).toFixed(2)}
                        </span>
                      )}
                      {(g.isPreordine || (g.paidQuantity > 0 && g.paidQuantity < g.quantity)) && (
                        <span className={`font-bold px-1.5 py-0.5 rounded border ${g.isPreordine ? "text-amber-600 bg-amber-50 border-amber-200" : "text-blue-600 bg-blue-50 border-blue-200"}`}>
                          {g.isPreordine ? "Preordine" : "Pagati"}: {g.paidQuantity}/{g.quantity}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions Row (Payments & Logistics) */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {/* Payment Status Button */}
                    <div className="flex-1">
                      {g.tuttiPagati ? (
                        <button
                          type="button"
                          disabled={!isEditable}
                          onClick={() => handleTogglePaidForGroup(g.originalIndexes, g.tuttiPagati)}
                          className="w-full flex items-center justify-center space-x-1 px-2 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border cursor-pointer bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100/70 disabled:cursor-not-allowed"
                        >
                          <CheckCircle className="h-3 w-3 text-emerald-500" />
                          <span>Pagato</span>
                        </button>
                      ) : (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={!isEditable}
                            onClick={() => handleTogglePaidForGroup(g.originalIndexes, g.tuttiPagati)}
                            className="flex-1 flex items-center justify-center space-x-1 px-2 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border cursor-pointer bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100/70 disabled:cursor-not-allowed"
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                            <span>{g.accontoPagato > 0 ? "Salda" : "Paga"}</span>
                          </button>
                          
                          <button
                            type="button"
                            disabled={!isEditable}
                            onClick={() => handleTogglePosticipatoForGroup(g.originalIndexes, g.tuttiPosticipati)}
                            className={`px-2 py-1.5 rounded-lg border transition-all cursor-pointer ${g.tuttiPosticipati ? 'bg-purple-100 border-purple-300 text-purple-800' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'}`}
                            title="Posticipa"
                          >
                            <Clock className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Logistics */}
                    <div className="flex-1 flex justify-end">
                      {!g.tuttiPagati ? (
                        <div className="w-full inline-flex items-center justify-center space-x-1 px-2 py-1.5 rounded-lg text-[9px] font-bold bg-slate-100 border border-slate-200 text-slate-400 select-none">
                          <Lock className="h-3 w-3" />
                          <span>Inibito</span>
                        </div>
                      ) : g.quantity > 1 ? (
                        <div className="inline-flex items-center space-x-1 bg-white border border-slate-200 rounded-lg p-0.5 shadow-2xs">
                          <button
                            type="button"
                            disabled={!isEditable || g.selezionatiCount === 0}
                            onClick={() => handleSelectQuantityForGroup(g.ID_Oggetto, g, g.selezionatiCount - 1)}
                            className="p-1 text-slate-400 hover:bg-slate-100 rounded-md border border-transparent hover:text-slate-600 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <div className="flex items-center px-1">
                            <Truck className={`h-3 w-3 mr-1 ${g.selezionatiCount > 0 ? "text-indigo-600" : "text-slate-400"}`} />
                            <span className="text-[10px] font-bold font-mono min-w-[12px] text-center text-slate-700">
                              {g.selezionatiCount}/{g.quantity}
                            </span>
                          </div>
                          <button
                            type="button"
                            disabled={!isEditable || g.selezionatiCount === g.quantity}
                            onClick={() => handleSelectQuantityForGroup(g.ID_Oggetto, g, g.selezionatiCount + 1)}
                            className="p-1 text-slate-400 hover:bg-slate-100 rounded-md border border-transparent hover:text-slate-600 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={!isEditable}
                          onClick={() => handleToggleSelectForGroup(g.ID_Oggetto, g)}
                          className={`w-full inline-flex items-center justify-center space-x-1 px-2 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border cursor-pointer ${
                            g.tuttiSelezionati
                              ? "bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100/70"
                              : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                          } disabled:cursor-not-allowed`}
                        >
                          <Truck className={`h-3 w-3 ${g.tuttiSelezionati ? "text-indigo-600" : "text-slate-400"}`} />
                          <span>{g.tuttiSelezionati ? "Spedibile" : "Spedisci"}</span>
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {/* Acconto Input (if editing) */}
                  {isEditable && handleAccontoChangeForGroup && !g.tuttiPagati && (
                    <div className="mt-1">
                      {editingAccontoId === g.ID_Oggetto ? (
                        <div className="flex items-center gap-2 p-2 bg-blue-50/50 rounded-lg border border-blue-100">
                          <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Acconto €</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={tempAccontoValue}
                            onChange={(e) => setTempAccontoValue(e.target.value)}
                            onBlur={() => {
                              if (editingAccontoId === g.ID_Oggetto) {
                                handleAccontoChangeForGroup(g.originalIndexes, parseFloat(tempAccontoValue) || 0);
                              }
                            }}
                            className="flex-1 w-full px-2 py-1 border border-indigo-300 rounded text-right text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white text-indigo-900 font-mono"
                            placeholder="0.00"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => {
                              handleAccontoChangeForGroup(g.originalIndexes, parseFloat(tempAccontoValue) || 0);
                              setEditingAccontoId(null);
                            }}
                            className="p-1 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingAccontoId(g.ID_Oggetto);
                            setTempAccontoValue(g.accontoPagato ? g.accontoPagato.toString() : "");
                          }}
                          className="w-full text-center py-1 bg-slate-50 hover:bg-blue-50 text-slate-500 hover:text-blue-600 border border-slate-100 rounded-lg text-[10px] font-bold uppercase transition-colors"
                        >
                          {g.accontoPagato ? `Modifica Acconto (€${g.accontoPagato.toFixed(2)})` : "+ Aggiungi Acconto"}
                        </button>
                      )}
                    </div>
                  )}

                </div>
              ))
            )}
          </div>

          {/* Desktop Layout */}
          <div className="hidden md:block border border-slate-150 rounded-xl overflow-x-auto shadow-3xs scrollbar-thin">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-150">
                <tr>
                  <th className="px-4 py-2.5">Articolo</th>
                  <th className="px-4 py-2.5 text-center">Qtà</th>
                  <th className="px-4 py-2.5 text-right">Prezzo Cad.</th>
                  <th className="px-4 py-2.5 text-center">Pagamento</th>
                  <th className="px-4 py-2.5 text-center">Spedizione</th>
                  <th className="px-4 py-2.5 text-center">Azioni</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-slate-100 text-slate-700">
                {visibleGroupedCartItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400 text-xs border-dashed border-slate-200">
                      Il carrello è vuoto. Seleziona oggetti dall'inventario per aggiungerli.
                    </td>
                  </tr>
                ) : (
                  visibleGroupedCartItems.map((g, idx) => (
                    <tr key={`${g.ID_Oggetto}-${idx}`} className={`hover:bg-slate-50/50 transition-colors ${g.tuttiPosticipati ? 'bg-purple-50/60 border-l-4 border-purple-400' : ''}`}>
                      <td className="px-4 py-2.5">
                        <div className="flex flex-col gap-1 min-w-[200px]">
                          <span className="font-bold text-slate-800 line-clamp-2 leading-tight">
                            {g.nome}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                              ID: {g.ID_Oggetto}
                            </span>
                            {isEditable && g.quantity > 1 && handleSplitGroupItem && (
                              <button
                                type="button"
                                onClick={() => handleSplitGroupItem(g.originalIndexes)}
                                className="px-1.5 py-0.5 text-[9px] font-bold bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded border border-indigo-100 transition-colors"
                              >
                                Sdoppia
                              </button>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {isEditable && !g.idSpedizione ? (
                          <div className="inline-flex items-center bg-white border border-slate-200 rounded-lg shadow-sm">
                            <button
                              type="button"
                              onClick={() => handleDecrementQuantity(g.originalIndexes)}
                              className="w-7 h-7 flex items-center justify-center font-bold text-slate-600 hover:bg-slate-50 rounded-l-lg transition-colors cursor-pointer"
                            >
                              -
                            </button>
                            <span className="w-8 text-center font-bold text-slate-800 text-xs">
                              {g.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleIncrementQuantity(g.ID_Oggetto, g.prezzoUnitario, g.idSpedizione)}
                              className="w-7 h-7 flex items-center justify-center font-bold text-slate-600 hover:bg-slate-50 rounded-r-lg transition-colors cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold border font-mono bg-slate-50 text-slate-700 border-slate-200">
                            {g.quantity} pz
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono">
                        <div className="flex flex-col items-end gap-1 min-w-[100px]">
                          {isEditable && !g.tuttiPagati ? (
                            <div className="relative">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-sans">
                                €
                              </span>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={g.prezzoUnitario === 0 ? "" : g.prezzoUnitario}
                                onChange={(e) =>
                                  handlePriceChangeForGroup(
                                    g.originalIndexes,
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                className="w-24 pl-6 pr-2 py-1.5 text-right bg-white border border-slate-300 text-slate-800 text-xs font-bold rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm"
                                placeholder="0.00"
                              />
                            </div>
                          ) : (
                            <span className="font-bold text-slate-800 text-sm">
                              € {g.prezzoUnitario.toFixed(2)}
                            </span>
                          )}
                          
                          {(g.quantity > 1 || g.accontoPagato > 0) && (
                            <div className="text-[10px] flex flex-col items-end gap-0.5 font-bold mt-1">
                              {g.quantity > 1 && (
                                <span className="text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                                  Tot: €{(g.prezzoUnitario * g.quantity).toFixed(2)}
                                </span>
                              )}
                              {g.accontoPagato > 0 && (
                                <span className="text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                                  Acc: €{g.accontoPagato.toFixed(2)}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <div className="flex flex-col gap-1 items-center">
                          {isEditable ? (
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleTogglePaidForGroup(g.originalIndexes, g.tuttiPagati)}
                                className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border cursor-pointer ${
                                  g.tuttiPagati
                                    ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100/70"
                                    : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                                }`}
                              >
                                {g.tuttiPagati && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>}
                                <span>{g.tuttiPagati ? "Pagato" : "Da Pagare"}</span>
                              </button>
                              {!g.tuttiPagati && (
                                <button
                                  type="button"
                                  onClick={() => handleTogglePosticipatoForGroup(g.originalIndexes, g.tuttiPosticipati)}
                                  className={`p-1.5 rounded-full border transition-colors cursor-pointer ${
                                    g.tuttiPosticipati 
                                      ? "bg-purple-100 border-purple-200 text-purple-700" 
                                      : "bg-white border-slate-200 text-slate-400 hover:bg-slate-50"
                                  }`}
                                  title={g.tuttiPosticipati ? "Rimuovi posticipato" : "Segna come posticipato"}
                                >
                                  <Clock className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              g.tuttiPagati 
                                ? "bg-emerald-50 border border-emerald-200 text-emerald-700" 
                                : g.tuttiPosticipati 
                                  ? "bg-purple-100 border border-purple-200 text-purple-700" 
                                  : "bg-amber-50 border border-amber-200 text-amber-700"
                            }`}>
                              {g.tuttiPagati ? (
                                <>
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                                  <span>PAGATO</span>
                                </>
                              ) : g.tuttiPosticipati ? (
                                <>
                                  <Clock className="h-2.5 w-2.5" />
                                  <span>POSTICIPATO</span>
                                </>
                              ) : (
                                <>
                                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                                  <span>DA PAGARE</span>
                                </>
                              )}
                            </span>
                          )}
                          
                          {/* Acconto */}
                          {isEditable && !g.tuttiPagati && (
                            <div className="relative w-24 mt-1">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-[9px] font-bold uppercase">
                                Acc:
                              </span>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={g.accontoPagato || ""}
                                onChange={(e) => {
                                  if (handleAccontoChangeForGroup) {
                                    handleAccontoChangeForGroup(g.originalIndexes, parseFloat(e.target.value) || 0);
                                  }
                                }}
                                className="w-full pl-8 pr-2 py-1 text-right bg-white border border-slate-200 text-slate-700 text-[10px] font-bold rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all shadow-2xs placeholder-slate-300"
                                placeholder="0.00"
                              />
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {!g.tuttiPagati ? (
                          <div
                            className="inline-flex items-center space-x-1 px-2 py-1 rounded-lg text-[9px] font-bold bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed select-none mx-auto"
                            title="Paga questo articolo per sbloccare l'invio"
                          >
                            <Lock className="h-2.5 w-2.5" />
                            <span>Inibito</span>
                          </div>
                        ) : g.quantity > 1 ? (
                          <div className="inline-flex items-center bg-white border border-slate-200 rounded-lg p-0.5 shadow-2xs mx-auto">
                            <button
                              type="button"
                              disabled={!isEditable || g.selezionatiCount === 0}
                              onClick={() => handleSelectQuantityForGroup(g.ID_Oggetto, g, g.selezionatiCount - 1)}
                              className="p-1 text-slate-400 hover:bg-slate-100 rounded border border-transparent hover:text-slate-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <div className="flex items-center px-2 min-w-[36px] justify-center">
                              <Truck className={`h-3 w-3 mr-1 ${g.selezionatiCount > 0 ? "text-indigo-600" : "text-slate-400"}`} />
                              <span className="text-[10px] font-bold font-mono text-slate-700">
                                {g.selezionatiCount}
                              </span>
                            </div>
                            <button
                              type="button"
                              disabled={!isEditable || g.selezionatiCount >= g.quantity}
                              onClick={() => handleSelectQuantityForGroup(g.ID_Oggetto, g, g.selezionatiCount + 1)}
                              className="p-1 text-slate-400 hover:bg-slate-100 rounded border border-transparent hover:text-slate-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            disabled={!isEditable}
                            onClick={() => handleToggleSelectForGroup(g.ID_Oggetto, g)}
                            className={`inline-flex items-center justify-center space-x-1 px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all border cursor-pointer mx-auto ${
                              g.tuttiSelezionati
                                ? "bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100/70"
                                : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                            } disabled:cursor-not-allowed`}
                          >
                            <Truck className={`h-3 w-3 ${g.tuttiSelezionati ? "text-indigo-600" : "text-slate-400"}`} />
                            <span>{g.tuttiSelezionati ? "Spedibile" : "Spedisci"}</span>
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveGroupFromCart(g.originalIndexes)}
                          className="p-1.5 text-rose-500 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer mx-auto flex items-center justify-center w-8 h-8"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          
        </div>

        {/* GRADING ITEMS IN ACTIVE ORDER */}
        <GradingItemsTable
          activeGradingItems={activeGradingItems}
          isEditable={isEditable}
          gruppiGrading={gruppiGrading}
          selectedGradingIds={selectedGradingIds}
          setSelectedGradingIds={setSelectedGradingIds}
          isShipped={isShipped}
          listinoGrading={listinoGrading}
          viewedGradingStatusId={viewedGradingStatusId}
          setViewedGradingStatusId={setViewedGradingStatusId}
          getDirectImageUrl={getDirectImageUrl}
          onUpdateCard={onUpdateCard}
          handleTogglePaidGradingItem={handleTogglePaidGradingItem}
          handleTogglePosticipatoGradingItem={handleTogglePosticipatoGradingItem}
          handleAccontoChangeGradingItem={handleAccontoChangeGradingItem}
          onUploadPhoto={onUploadPhoto}
          handleRemoveGradingItem={handleRemoveGradingItem}
          onAddClick={() => {
            setIsAddingGrading(true);
          }}
        />
      </motion.div>

      

      {zoomedImage && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 backdrop-blur-sm p-4 animate-in fade-in duration-200 cursor-zoom-out"
          onClick={() => setZoomedImage(null)}
        >
          <div
            className="relative max-w-7xl w-full max-h-[95vh] flex flex-col items-center justify-center cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
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
        onSavePhone={(newPhone) => setActiveClientPhone(newPhone)}
      />
    </>
  );
});
