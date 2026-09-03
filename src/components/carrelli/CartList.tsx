import { isDataImmediata } from "../../lib/dateUtils";
import { StrikeBadge } from "./StrikeBadge";
import React, { useMemo, useState, useEffect } from "react";
import { motion } from "motion/react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef } from "react";
import { Plus, Search, ChevronRight, FileText, Download, MessageCircle, Package, Clock, Mail, Globe, Smartphone, AlertTriangle, ShieldAlert, Flag, X } from "lucide-react";
import { Carrello, DettaglioCarrello, GradingItem, CustomerLoyalty } from "../../types";
import { generateWhatsAppMessage } from "../../utils/whatsappExport";
import { sendWhatsAppMessage } from "../../lib/whatsapp";
import { FilterAutocomplete } from "./FilterAutocomplete";
import { getShippingValidation, isCartRequiringCourier } from "../../lib/packlinkParser";

interface CartListProps {
  showClosedOnly: boolean;
  selectedCartId: string | null;
  isCreating: boolean;
  setIsCreating: (val: boolean) => void;
  newClientName: string;
  setNewClientName: (val: string) => void;
  handleCreateCart: (e: React.FormEvent) => void;
  clientNameValidation: { isValid: boolean; warning: string };
  search: string;
  setSearch: (val: string) => void;
  statusFilter: string;
  setStatusFilter: (val: string) => void;
  tagFilter?: string;
  setTagFilter?: (val: string) => void;
  uniqueTags?: string[];
  filterProduct?: string;
  setFilterProduct?: (val: string) => void;
  sortOption?: "Nessuno" | "Da Pagare" | "Saldato" | "Alfabetico (A-Z)" | "Alfabetico (Z-A)" | "Oggetti (Crescente)" | "Oggetti (Decrescente)" | "Grading (Crescente)" | "Grading (Decrescente)" | "Strike (Crescente)" | "Strike (Decrescente)" | "Ultimo Contatto (Meno recente)" | "Ultimo Contatto (Più recente)";
  setSortOption?: (val: "Nessuno" | "Da Pagare" | "Saldato" | "Alfabetico (A-Z)" | "Alfabetico (Z-A)" | "Oggetti (Crescente)" | "Oggetti (Decrescente)" | "Grading (Crescente)" | "Grading (Decrescente)" | "Strike (Crescente)" | "Strike (Decrescente)" | "Ultimo Contatto (Meno recente)" | "Ultimo Contatto (Più recente)") => void;
  hasObjectsOnly?: boolean;
  setHasObjectsOnly?: (val: boolean) => void;
  emptyCartsOnly?: boolean;
  setEmptyCartsOnly?: (val: boolean) => void;
  strikeFilter?: "Tutti" | "Senza strike" | "Con strike" | "Cattivi";
  setStrikeFilter?: (val: "Tutti" | "Senza strike" | "Con strike" | "Cattivi") => void;
  unpaidOnly?: boolean;
  setUnpaidOnly?: (val: boolean) => void;
  readyForShippingOnly?: boolean;
  setReadyForShippingOnly?: (val: boolean) => void;
  filteredCarts: Carrello[];
  handleSelectCart: (c: Carrello) => void;
  onUpdateCartPhone?: (cartId: string, phone: string) => Promise<void>;
  onUpdateCartLastMessage?: (cartId: string, timestamp?: string) => Promise<void>;
  onUpdateCartTag?: (cartId: string, tag: string) => Promise<void>;
  onUpdateCartStrikes?: (cartId: string, strike: number, cattivoData: string) => Promise<void>;
  onToggleShipmentTag?: (cartId: string) => Promise<void>;
  onTogglePaymentTag?: (cartId: string) => Promise<void>;
  dettagli: DettaglioCarrello[];
  oggettiInGrading: GradingItem[];
  gruppiGrading?: any[];
  onOpenImportModal?: () => void;
  onOpenPayPalSyncModal?: () => void;
  magazzino?: import("../../types").OggettoMagazzino[];
  uniqueProductNames?: string[];
  uniqueClientNames?: string[];
  userRole?: string;
  loyaltyProfiles?: CustomerLoyalty[];
  loyaltyTierFilter?: string;
  setLoyaltyTierFilter?: (val: string) => void;
}



// Helper to evaluate paid state of each item considering Pagato_Singolarmente and Acconto_Pagato
const getCartItemPaidStates = (
  cartDettagli: DettaglioCarrello[],
  cartGrading: GradingItem[]
) => {
  const items = [
    ...cartDettagli.map((d) => ({
      type: "dettaglio" as const,
      ref: d,
      price: d.Prezzo_Registrato || 0,
      pagatoSingolarmente: !!d.Pagato_Singolarmente,
      accontoPagato: d.Acconto_Pagato || 0,
      isPaid: !!d.Pagato_Singolarmente,
    })),
    ...cartGrading.map((g) => ({
      type: "grading" as const,
      ref: g,
      price: g.Costo_Cliente || 0,
      pagatoSingolarmente: !!g.Pagato_Singolarmente,
      accontoPagato: g.Acconto_Pagato || 0,
      isPaid: !!g.Pagato_Singolarmente,
    })),
  ];

  let accontoPool = items.reduce(
    (sum, item) => sum + (!item.pagatoSingolarmente ? item.accontoPagato : 0),
    0
  );

  // First pass: items where accontoPagato >= price
  items.forEach((item) => {
    if (!item.isPaid && item.price > 0 && item.accontoPagato >= item.price) {
      item.isPaid = true;
      accontoPool -= item.price;
    }
  });

  // Second pass: use remaining accontoPool for remaining unpaid items
  items.forEach((item) => {
    if (!item.isPaid && item.price > 0 && accontoPool >= item.price) {
      item.isPaid = true;
      accontoPool -= item.price;
    }
  });

  return items;
};


function VirtualizedGrid({ rowCount, rowHeight, listHeight, columns, filteredCarts, renderCartCard }: { rowCount: number, rowHeight: number, listHeight: number | string, columns: number, filteredCarts: any[], renderCartCard: (c: any) => React.ReactNode }) {
  const parentRef = useRef<HTMLDivElement>(null);
  
  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: 5,
  });
  
  return (
    <div ref={parentRef} style={{ height: listHeight, overflow: 'auto', width: '100%' }}>
      <div style={{ height: `${virtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const startIndex = virtualRow.index * columns;
          const rowCarts = filteredCarts.slice(startIndex, startIndex + columns);
          
          return (
            <div
              key={virtualRow.index}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
                display: 'grid',
                gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                gap: '0.5rem',
                paddingBottom: '0.5rem',
                boxSizing: 'border-box',
              }}
            >
              {rowCarts.map((c) => renderCartCard(c))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const CartList: React.FC<CartListProps> = React.memo(({


  showClosedOnly,
  selectedCartId,
  isCreating,
  setIsCreating,
  newClientName,
  setNewClientName,
  handleCreateCart,
  clientNameValidation,
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
  tagFilter,
  setTagFilter,
  uniqueTags = [],
  filterProduct,
  setFilterProduct,
  sortOption,
  setSortOption,
  hasObjectsOnly,
  setHasObjectsOnly,
  emptyCartsOnly,
  setEmptyCartsOnly,
  strikeFilter,
  setStrikeFilter,
  unpaidOnly,
  setUnpaidOnly,
  readyForShippingOnly,
  setReadyForShippingOnly,
  filteredCarts,
  handleSelectCart,
  onUpdateCartPhone,
  onUpdateCartLastMessage,
  onUpdateCartTag,
  onUpdateCartStrikes,
  onToggleShipmentTag,
  onTogglePaymentTag,
  dettagli,
  oggettiInGrading,
  gruppiGrading,
  onOpenImportModal,
  onOpenPayPalSyncModal,
  magazzino = [],
  uniqueProductNames = [],
  uniqueClientNames = [],
  userRole,
  loyaltyProfiles = [],
  loyaltyTierFilter = "Tutti",
  setLoyaltyTierFilter,
}) => {
  const dettagliMap = useMemo(() => {
    const map = new Map<string, DettaglioCarrello[]>();
    for (const d of dettagli) {
      if (d.ID_Spedizione) continue;
      let arr = map.get(d.ID_Carrello);
      if (!arr) {
        arr = [];
        map.set(d.ID_Carrello, arr);
      }
      arr.push(d);
    }
    return map;
  }, [dettagli]);

  const gradingMap = useMemo(() => {
    const map = new Map<string, GradingItem[]>();
    for (const g of oggettiInGrading) {
      if (g.ID_Spedizione) continue;
      let arr = map.get(g.ID_Carrello);
      if (!arr) {
        arr = [];
        map.set(g.ID_Carrello, arr);
      }
      arr.push(g);
    }
    return map;
  }, [oggettiInGrading]);

  const magazzinoMap = useMemo(() => {
    if (!magazzino) return new Map();
    const map = new Map<string, import("../../types").OggettoMagazzino>();
    for (const m of magazzino) {
      map.set(m.ID_Oggetto, m);
    }
    return map;
  }, [magazzino]);

  const globalSummaryStats = useMemo(() => {
    let totalDaPagare = 0;
    let totalPagato = 0;
    for (const c of filteredCarts) {
      const cartDettagli = dettagliMap.get(c.ID_Carrello) || [];
      const cartGrading = gradingMap.get(c.ID_Carrello) || [];
       
      for (const d of cartDettagli) {
        if (!d.Pagato_Singolarmente) {
          totalDaPagare += Math.max(0, d.Prezzo_Registrato - (d.Acconto_Pagato || 0));
          totalPagato += (d.Acconto_Pagato || 0);
        } else {
          totalPagato += d.Prezzo_Registrato;
        }
      }
      for (const g of cartGrading) {
        if (!g.Pagato_Singolarmente) {
          totalDaPagare += Math.max(0, g.Costo_Cliente - (g.Acconto_Pagato || 0));
          totalPagato += (g.Acconto_Pagato || 0);
        } else {
          totalPagato += g.Costo_Cliente;
        }
      }
    }
    return { totalDaPagare, totalPagato };
  }, [filteredCarts, dettagliMap, gradingMap]);

  const productSearchStats = useMemo(() => {
    if (!filterProduct || filterProduct.trim().length === 0) return null;
    
    let totalCartsWithProduct = 0;
    let totalPaidCarts = 0;
    let totalUnpaidCarts = 0;
    let totalItemsWithProduct = 0;
    let totalPaidItems = 0;
    let totalUnpaidItems = 0;
    
    const normalizeString = (str: string): string => {
      if (!str) return "";
      return str
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/['’]/g, "")
        .replace(/[\s\u00a0]+/g, " ")
        .trim();
    };

    const prodQueries = filterProduct.split(',').map(q => normalizeString(q)).filter(Boolean);
    
    for (const c of filteredCarts) {
      const cartDettagli = dettagliMap.get(c.ID_Carrello) || [];
      const cartGrading = gradingMap.get(c.ID_Carrello) || [];
       
      let hasProduct = false;
      let allProductItemsPaid = true;
       
      for (const d of cartDettagli) {
        const m = magazzinoMap.get(d.ID_Oggetto);
        const name = normalizeString(m?.Nome || "");
        const id = normalizeString(d.ID_Oggetto || "");
        const itemMatches = prodQueries.some(query => {
          const queryTerms = query.split(" ").filter(Boolean);
          return queryTerms.every(term => name.includes(term) || id.includes(term));
        });
        if (itemMatches) {
          hasProduct = true;
          totalItemsWithProduct++;
          if (d.Pagato_Singolarmente) {
            totalPaidItems++;
          } else {
            totalUnpaidItems++;
            allProductItemsPaid = false;
          }
        }
      }

      for (const g of cartGrading) {
        const name = normalizeString(g.Nome_Carta || (g as any).Nome_Oggetto || "");
        const desc = normalizeString((g as any).Descrizione || "");
        const id = normalizeString(g.ID_Oggetto_Grading || "");
        const itemMatches = prodQueries.some(query => {
          const queryTerms = query.split(" ").filter(Boolean);
          return queryTerms.every(term => name.includes(term) || desc.includes(term) || id.includes(term));
        });
        if (itemMatches) {
          hasProduct = true;
          totalItemsWithProduct++;
          if (g.Pagato_Singolarmente) {
            totalPaidItems++;
          } else {
            totalUnpaidItems++;
            allProductItemsPaid = false;
          }
        }
      }
       
      if (hasProduct) {
        totalCartsWithProduct++;
        if (allProductItemsPaid) {
          totalPaidCarts++;
        } else {
          totalUnpaidCarts++;
        }
      }
    }
    
    if (totalCartsWithProduct === 0) return null;
    
    return {
      totalCartsWithProduct, totalPaidCarts, totalUnpaidCarts,
      totalItemsWithProduct, totalPaidItems, totalUnpaidItems
    };
  }, [filteredCarts, filterProduct, dettagliMap, gradingMap, magazzinoMap]);

  const resiPerCliente = useMemo(() => {
    if (!showClosedOnly) return new Map<string, number>();
    const map = new Map<string, number>();
    const cartToClient = new Map<string, string>();
    for (const c of filteredCarts) {
      if (c.Nome_Cliente) {
        cartToClient.set(c.ID_Carrello, c.Nome_Cliente.trim());
      }
    }
    const countReso = (items: any[]) => {
      for (const item of items) {
        if (item.Reso) {
          const clientName = cartToClient.get(item.ID_Carrello);
          if (clientName) {
            map.set(clientName, (map.get(clientName) || 0) + 1);
          }
        }
      }
    };
    countReso(dettagli);
    countReso(oggettiInGrading);
    return map;
  }, [filteredCarts, dettagli, oggettiInGrading, showClosedOnly]);

  const [columns, setColumns] = useState(1);

  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      if (w < 640) {
        setColumns(1);
      } else if (selectedCartId) {
        setColumns(w >= 1024 ? 1 : 2);
      } else {
        if (w >= 1280) setColumns(4);
        else if (w >= 1024) setColumns(3);
        else setColumns(2);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [selectedCartId]);

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

  const [localMsgMap, setLocalMsgMap] = React.useState<Record<string, string>>(() => {
    try {
      const stored = localStorage.getItem("CARRELLI_LAST_MSG_TIMESTAMPS");
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  const getCartLastMsgTimestamp = (c: Carrello, map: Record<string, string>): number => {
    const raw = map[c.ID_Carrello] || c.Data_Ultimo_Messaggio;
    if (!raw) return 0;
    const t = new Date(raw).getTime();
    return isNaN(t) ? 0 : t;
  };

  const formatLastContactDate = (rawDate?: string): { label: string; isRecent: boolean; isNever: boolean } => {
    if (!rawDate || !rawDate.trim()) {
      return { label: "Mai informato", isRecent: false, isNever: true };
    }
    const d = new Date(rawDate);
    if (isNaN(d.getTime())) {
      return { label: rawDate, isRecent: false, isNever: false };
    }
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / (60 * 1000));
    const diffHours = Math.floor(diffMs / (3600 * 1000));
    const diffDays = Math.floor(diffMs / (24 * 3600 * 1000));

    const timeStr = d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
    const dateStr = d.toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" });

    const isToday = d.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = d.toDateString() === yesterday.toDateString();

    let label = "";
    if (diffMins < 2) {
      label = "Proprio ora";
    } else if (diffMins < 60) {
      label = `${diffMins} min fa`;
    } else if (isToday) {
      label = `Oggi alle ${timeStr}`;
    } else if (isYesterday) {
      label = `Ieri alle ${timeStr}`;
    } else if (diffDays < 7) {
      label = `${diffDays} gg fa (${dateStr.slice(0, 5)})`;
    } else {
      label = `${dateStr} ${timeStr}`;
    }

    const isRecent = diffHours < 12;
    return { label, isRecent, isNever: false };
  };

  const handleExportWhatsApp = (c: Carrello, onlyFiltered: boolean = false, phoneOverride?: string) => {
    if (!magazzino) return;
    const isFiltering = onlyFiltered && !!filterProduct && filterProduct.trim().length > 0;
    const term = isFiltering ? filterProduct.toLowerCase() : '';
    
    const msg = generateWhatsAppMessage(
      c,
      dettagli,
      oggettiInGrading,
      magazzino,
      gruppiGrading || [],
      isFiltering,
      filterProduct || '',
      term,
      undefined,
      loyaltyProfiles,
      filteredCarts
    );

    const activePhone = phoneOverride || c.Telefono;
    sendWhatsAppMessage(msg, activePhone);

    const nowIso = new Date().toISOString();
    setLocalMsgMap(prev => {
      const next = { ...prev, [c.ID_Carrello]: nowIso };
      try {
        localStorage.setItem("CARRELLI_LAST_MSG_TIMESTAMPS", JSON.stringify(next));
      } catch (e) {
        console.warn("Could not save CARRELLI_LAST_MSG_TIMESTAMPS", e);
      }
      return next;
    });

    if (onUpdateCartLastMessage) {
      onUpdateCartLastMessage(c.ID_Carrello, nowIso);
    }

    setWhatsAppCartList(prev => prev.map(cart => cart.ID_Carrello === c.ID_Carrello ? { ...cart, Data_Ultimo_Messaggio: nowIso } : cart));
  };

  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = React.useState(false);
  const [whatsAppCartList, setWhatsAppCartList] = React.useState<Carrello[]>([]);
  const [contactedCartIds, setContactedCartIds] = React.useState<string[]>([]);
  const [phoneInputs, setPhoneInputs] = React.useState<Record<string, string>>({});
  const [savingPhones, setSavingPhones] = React.useState<Record<string, boolean>>({});

  // Bulk send state & automation triggers
  const [isBulkSending, setIsBulkSending] = React.useState(false);
  const [bulkSendMode, setBulkSendMode] = React.useState<"focus" | "timer" | null>(null);
  const [bulkTimerSeconds, setBulkTimerSeconds] = React.useState(3);
  const [timerProgress, setTimerProgress] = React.useState(100);
  const [countdownValue, setCountdownValue] = React.useState(0);

  const contactedCartIdsRef = React.useRef(contactedCartIds);
  const whatsAppCartListRef = React.useRef(whatsAppCartList);
  const phoneInputsRef = React.useRef(phoneInputs);

  React.useEffect(() => {
    contactedCartIdsRef.current = contactedCartIds;
  }, [contactedCartIds]);

  React.useEffect(() => {
    whatsAppCartListRef.current = whatsAppCartList;
  }, [whatsAppCartList]);

  React.useEffect(() => {
    phoneInputsRef.current = phoneInputs;
  }, [phoneInputs]);

  // Stop bulk send
  const handleStopBulkSend = React.useCallback(() => {
    setIsBulkSending(false);
    setBulkSendMode(null);
  }, []);

  // Start bulk send
  const handleStartBulkSend = (mode: "focus" | "timer") => {
    const remaining = whatsAppCartListRef.current.filter(c => !contactedCartIdsRef.current.includes(c.ID_Carrello));
    if (remaining.length === 0) {
      alert("Nessun cliente rimanente nella coda!");
      return;
    }

    setIsBulkSending(true);
    setBulkSendMode(mode);

    // Trigger first client immediately
    const nextCart = remaining[0];
    const hasPhone = nextCart.Telefono || phoneInputsRef.current[nextCart.ID_Carrello];
    if (hasPhone) {
      handleExportWhatsApp(nextCart, false, phoneInputsRef.current[nextCart.ID_Carrello]);
      setContactedCartIds(prev => [...prev, nextCart.ID_Carrello]);
    } else {
      setContactedCartIds(prev => [...prev, nextCart.ID_Carrello]);
    }
  };

  // 1. Focus Mode loop
  React.useEffect(() => {
    if (!isBulkSending || bulkSendMode !== "focus") return;

    const handleWindowFocus = () => {
      // Small timeout to let screen transitions finish elegantly
      setTimeout(() => {
        const remaining = whatsAppCartListRef.current.filter(c => !contactedCartIdsRef.current.includes(c.ID_Carrello));
        if (remaining.length > 0) {
          const nextCart = remaining[0];
          const hasPhone = nextCart.Telefono || phoneInputsRef.current[nextCart.ID_Carrello];
          if (hasPhone) {
            handleExportWhatsApp(nextCart, false, phoneInputsRef.current[nextCart.ID_Carrello]);
            setContactedCartIds(prev => [...prev, nextCart.ID_Carrello]);
          } else {
            // Skip empty phone number to avoid blocking the queue
            setContactedCartIds(prev => [...prev, nextCart.ID_Carrello]);
          }
        } else {
          setIsBulkSending(false);
          setBulkSendMode(null);
        }
      }, 500);
    };

    window.addEventListener("focus", handleWindowFocus);
    return () => {
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, [isBulkSending, bulkSendMode]);

  // 2. Timer Mode loop
  React.useEffect(() => {
    if (!isBulkSending || bulkSendMode !== "timer") return;

    setCountdownValue(bulkTimerSeconds);
    setTimerProgress(100);

    const intervalId = setInterval(() => {
      setCountdownValue(prev => {
        if (prev <= 1) {
          const remaining = whatsAppCartListRef.current.filter(c => !contactedCartIdsRef.current.includes(c.ID_Carrello));
          if (remaining.length > 0) {
            const nextCart = remaining[0];
            const hasPhone = nextCart.Telefono || phoneInputsRef.current[nextCart.ID_Carrello];
            if (hasPhone) {
              handleExportWhatsApp(nextCart, false, phoneInputsRef.current[nextCart.ID_Carrello]);
              setContactedCartIds(prev => [...prev, nextCart.ID_Carrello]);
            } else {
              setContactedCartIds(prev => [...prev, nextCart.ID_Carrello]);
            }
            setTimerProgress(100);
            return bulkTimerSeconds;
          } else {
            setIsBulkSending(false);
            setBulkSendMode(null);
            clearInterval(intervalId);
            return 0;
          }
        } else {
          const nextValue = prev - 1;
          setTimerProgress((nextValue / bulkTimerSeconds) * 100);
          return nextValue;
        }
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [isBulkSending, bulkSendMode, bulkTimerSeconds]);

  const [showProductSuggestions, setShowProductSuggestions] = React.useState(false);
  const [productFilterCursor, setProductFilterCursor] = React.useState(-1);

  const activeProductSearchTerm = filterProduct ? filterProduct.split(',').pop()?.trim().toLowerCase() : "";
  const productFilterSuggestions = useMemo(() => {
    if (!activeProductSearchTerm || activeProductSearchTerm.length === 0) return [];
    return (uniqueProductNames || []).filter(name => name.toLowerCase().includes(activeProductSearchTerm)).slice(0, 30);
  }, [uniqueProductNames, activeProductSearchTerm]);

  const handleProductSuggestionClick = (suggestion: string) => {
    if (!filterProduct) return;
    const parts = filterProduct.split(',');
    parts.pop(); // remove the last typed partial term
    const newValue = parts.length > 0 ? parts.join(',') + ', ' + suggestion + ', ' : suggestion + ', ';
    if (setFilterProduct) setFilterProduct(newValue);
    setShowProductSuggestions(false);
    setProductFilterCursor(-1);
  };
  
  const handleProductFilterKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showProductSuggestions || productFilterSuggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setProductFilterCursor(prev => (prev < productFilterSuggestions.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setProductFilterCursor(prev => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === 'Enter') {
      if (productFilterCursor >= 0 && productFilterCursor < productFilterSuggestions.length) {
        e.preventDefault();
        handleProductSuggestionClick(productFilterSuggestions[productFilterCursor]);
      } else if (productFilterSuggestions.length === 1) {
        e.preventDefault();
        handleProductSuggestionClick(productFilterSuggestions[0]);
      }
    } else if (e.key === 'Escape') {
      setShowProductSuggestions(false);
      setProductFilterCursor(-1);
    }
  };

  const handleOpenWhatsAppModal = () => {
    // Sort in chronological order (oldest contacted or never contacted first, most recent last)
    const sorted = [...filteredCarts].sort((a, b) => {
      const tA = getCartLastMsgTimestamp(a, localMsgMap);
      const tB = getCartLastMsgTimestamp(b, localMsgMap);
      if (tA === 0 && tB !== 0) return -1;
      if (tB === 0 && tA !== 0) return 1;
      return tA - tB;
    });

    setWhatsAppCartList(sorted);
    setContactedCartIds([]);
    setPhoneInputs({});
    setSavingPhones({});
    
    setIsWhatsAppModalOpen(true);
  };
  
  const handleSavePhone = async (cartId: string) => {
    if (onUpdateCartPhone && phoneInputs[cartId]) {
      setSavingPhones(prev => ({ ...prev, [cartId]: true }));
      await onUpdateCartPhone(cartId, phoneInputs[cartId]);
      setWhatsAppCartList(prev => prev.map(c => c.ID_Carrello === cartId ? { ...c, Telefono: phoneInputs[cartId] } : c));
      setSavingPhones(prev => ({ ...prev, [cartId]: false }));
    }
  };

  const handleExportDistinta = () => {
    if (filteredCarts.length === 0) {
      alert("Nessun carrello trovato con i filtri attuali.");
      return;
    }

    const headers = [
      "ID Ordine",
      "Cliente",
      "Telefono",
      "Email",
      "Indirizzo Spedizione",
      "Tag",
      "Stato Ordine",
      "Tipo Oggetto",
      "Nome Oggetto",
      "Note / Descrizione",
      "Stato Pagamento",
      "Acconto Versato (€)",
      "Prezzo (€)"
    ];

    const rows: string[][] = [];

    filteredCarts.forEach((cart) => {
      const cartDettagli = dettagli.filter((d) => d.ID_Carrello === cart.ID_Carrello && !d.ID_Spedizione);
      const cartGrading = oggettiInGrading.filter((g) => g.ID_Carrello === cart.ID_Carrello && !g.ID_Spedizione);

      if (cartDettagli.length === 0 && cartGrading.length === 0) {
        rows.push([
          cart.ID_Carrello,
          cart.Nome_Cliente || "",
          cart.Telefono || "",
          cart.Email || "",
          cart.Indirizzo_Spedizione || "",
          cart.Tag || "",
          cart.Stato_Carrello.replace(/_/g, " "),
          "-",
          "Nessun oggetto",
          "",
          "-",
          "0",
          "0"
        ]);
      } else {
        cartDettagli.forEach((d) => {
          const magItem = magazzino.find(m => m.ID_Oggetto === d.ID_Oggetto);
          const name = magItem ? magItem.Nome : `Oggetto ${d.ID_Oggetto}`;
          const isPaid = d.Pagato_Singolarmente;
          rows.push([
            cart.ID_Carrello,
            cart.Nome_Cliente || "",
            cart.Telefono || "",
            cart.Email || "",
            cart.Indirizzo_Spedizione || "",
            cart.Tag || "",
            cart.Stato_Carrello.replace(/_/g, " "),
            "Standard",
            name,
            "",
            isPaid ? "PAGATO" : "DA PAGARE",
            (d.Acconto_Pagato || 0).toFixed(2),
            (d.Prezzo_Registrato || 0).toFixed(2)
          ]);
        });

        cartGrading.forEach((g) => {
          const name = g.Nome_Carta || `Grading ${g.ID_Oggetto_Grading}`;
          const isPaid = g.Pagato_Singolarmente;
          rows.push([
            cart.ID_Carrello,
            cart.Nome_Cliente || "",
            cart.Telefono || "",
            cart.Email || "",
            cart.Indirizzo_Spedizione || "",
            cart.Tag || "",
            cart.Stato_Carrello.replace(/_/g, " "),
            "Grading",
            name,
            g.Tipologia_Servizio || "",
            isPaid ? "PAGATO" : "DA PAGARE",
            (g.Acconto_Pagato || 0).toFixed(2),
            (g.Costo_Cliente || 0).toFixed(2)
          ]);
        });
      }
    });

    const escapeCsv = (val: string) => {
      const str = val || "";
      if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r") || str.includes(";")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csvContent = [
      headers.map(escapeCsv).join(","),
      ...rows.map(row => row.map(escapeCsv).join(","))
    ].join("\r\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `distinta_ordini_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className={`space-y-6 ${selectedCartId ? "hidden lg:block" : "block"}`}
    >
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight font-sans">
          {showClosedOnly ? "Spedizioni" : "Ordini Clienti"}
        </h2>
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <button
            type="button"
            onClick={handleExportDistinta}
            className="flex flex-1 md:flex-none justify-center items-center space-x-1.5 px-3 py-2.5 min-h-[40px] bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all shadow-2xs cursor-pointer border border-emerald-200 active:scale-95"
            title="Esporta distinta (CSV)"
          >
            <Download className="h-4 w-4" />
            <span className="md:inline">Esporta</span>
          </button>
          {!showClosedOnly && (
          <button
            type="button"
            onClick={handleOpenWhatsAppModal}
            className="flex flex-1 md:flex-none justify-center items-center space-x-1.5 px-3 py-2.5 min-h-[40px] bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all shadow-2xs cursor-pointer active:scale-95"
            title="Invia messaggi WhatsApp a tutti gli ordini filtrati"
          >
            <MessageCircle className="h-4 w-4" />
            <span className="md:inline">Informa Clienti</span>
          </button>
          )}

        {!showClosedOnly && userRole !== "utente" && (
          <>
            {onOpenImportModal && (
              <button
                type="button"
                onClick={onOpenImportModal}
                className="flex flex-1 md:flex-none justify-center items-center space-x-2 px-3 py-2.5 min-h-[40px] bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all shadow-2xs cursor-pointer border border-indigo-200 active:scale-95"
              >
                <FileText className="h-4 w-4" />
                <span>Importa</span>
              </button>
            )}
            {onOpenPayPalSyncModal && (
              <button
                type="button"
                onClick={onOpenPayPalSyncModal}
                className="flex flex-1 md:flex-none justify-center items-center space-x-1.5 px-3 py-2.5 min-h-[40px] bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all shadow-2xs cursor-pointer border border-blue-200 active:scale-95"
                title="Riconcilia pagamenti ricevuti via PayPal tramite Gmail"
              >
                <Mail className="h-4 w-4 text-blue-600" />
                <span>PayPal</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsCreating(true)}
              className="flex flex-1 md:flex-none justify-center items-center space-x-2 px-3.5 py-2.5 min-h-[40px] bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all shadow-2xs cursor-pointer active:scale-95"
            >
              <Plus className="h-4 w-4" />
              <span>Nuovo Ordine</span>
            </button>
          </>
        )}
        </div>
      </div>

      {/* Create Form inline/modal */}
      {isCreating && (
        <form
          onSubmit={handleCreateCart}
          className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-4 animate-scale-up"
        >
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest border-b border-slate-200 pb-2">
            Nuovo Ordine
          </h3>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Nome Cliente / Ordine *
            </label>
            <input
              type="text"
              required
              list="client-search-autocomplete"
              placeholder="Es. Mario Rossi"
              value={newClientName}
              onChange={(e) => setNewClientName(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 font-sans"
            />
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Le altre informazioni del cliente (telefono, email, indirizzo di
              spedizione) possono essere compilate in un secondo momento dal
              pannello dettagli dell'ordine.
            </p>
          </div>

          {/* Live validation feedback warning */}
          {newClientName && (
            <div
              className={`p-3 rounded-xl border text-xs space-y-1 flex items-start space-x-2 ${
                clientNameValidation.isValid
                  ? "bg-emerald-50/50 border-emerald-100 text-emerald-800"
                  : "bg-amber-50/70 border-amber-200 text-amber-800"
              }`}
            >
              <div className="mt-0.5 font-bold">
                {clientNameValidation.isValid ? "✓" : "⚠"}
              </div>
              <div>
                <span className="font-bold">Stato Campo Nome:</span>{" "}
                {clientNameValidation.isValid
                  ? "Nome valido e pronto per la creazione."
                  : clientNameValidation.warning}
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setIsCreating(false);
                setNewClientName("");
              }}
              className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 uppercase tracking-wider cursor-pointer"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={!clientNameValidation.isValid}
              className={`px-4 py-1.5 text-xs font-bold uppercase tracking-widest rounded-xl shadow-xs cursor-pointer transition-all ${
                clientNameValidation.isValid
                  ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                  : "bg-slate-200 text-slate-500 cursor-not-allowed dark:bg-slate-700 dark:text-slate-400"
              }`}
            >
              Crea Ordine
            </button>
          </div>
        </form>
      )}

      {/* Filters */}
        <div className="flex flex-col gap-3 mb-4 bg-slate-50/80 p-4 rounded-xl border border-slate-200/80 shadow-xs">
          {/* First Row: Search Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className={`h-4 w-4 ${search ? 'text-indigo-500 font-bold' : 'text-slate-400'}`} />
              </div>
              <input
                type="text"
                list="client-search-autocomplete"
                placeholder="Cerca cliente, ID, telefono, tag..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={`w-full pl-9 pr-9 py-2.5 border rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-900 bg-white shadow-xs transition-all ${
                  search 
                    ? "border-indigo-400 bg-indigo-50/10 ring-2 ring-indigo-500/10" 
                    : "border-slate-300 hover:border-slate-400"
                }`}
              />
              <datalist id="client-search-autocomplete">
                {uniqueClientNames?.map((name, i) => (
                  <option key={i} value={name} />
                ))}
              </datalist>
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute inset-y-0 right-0 pr-2.5 flex items-center justify-center text-slate-400 hover:text-slate-600 active:text-slate-800 transition-colors cursor-pointer"
                  title="Cancella ricerca"
                >
                  <span className="p-1 hover:bg-slate-100 rounded-full flex items-center justify-center">
                    <X className="h-3.5 w-3.5" />
                  </span>
                </button>
              )}
            </div>

            {setFilterProduct && (
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className={`h-4 w-4 ${filterProduct ? 'text-indigo-500 font-bold' : 'text-slate-400'}`} />
                </div>
                <input
                  type="text"
                  placeholder="Filtra per prodotto (separa con virgola per ricerca multipla)..."
                  value={filterProduct || ""}
                  onChange={(e) => {
                    setFilterProduct(e.target.value);
                    setShowProductSuggestions(true);
                    setProductFilterCursor(-1);
                  }}
                  onFocus={() => setShowProductSuggestions(true)}
                  onBlur={() => {
                    // Short timeout to allow click event to fire on suggestion
                    setTimeout(() => setShowProductSuggestions(false), 200);
                  }}
                  onKeyDown={handleProductFilterKeyDown}
                  className={`w-full pl-9 pr-9 py-2.5 border rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-900 bg-white shadow-xs transition-all ${
                    filterProduct 
                      ? "border-indigo-400 bg-indigo-50/10 ring-2 ring-indigo-500/10" 
                      : "border-slate-300 hover:border-slate-400"
                  }`}
                />
                {filterProduct && (
                  <button
                    type="button"
                    onClick={() => {
                      setFilterProduct("");
                      setShowProductSuggestions(false);
                    }}
                    className="absolute inset-y-0 right-0 pr-2.5 flex items-center justify-center text-slate-400 hover:text-slate-600 active:text-slate-800 transition-colors cursor-pointer"
                    title="Cancella filtro"
                  >
                    <span className="p-1 hover:bg-slate-100 rounded-full flex items-center justify-center">
                      <X className="h-3.5 w-3.5" />
                    </span>
                  </button>
                )}
                {showProductSuggestions && productFilterSuggestions.length > 0 && (
                  <div className="absolute top-full z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                    {productFilterSuggestions.map((suggestion, idx) => (
                      <div
                        key={idx}
                        className={`px-4 py-2 text-sm cursor-pointer transition-colors ${
                          idx === productFilterCursor ? "bg-indigo-50 text-indigo-700 font-medium" : "text-slate-700 hover:bg-slate-50"
                        }`}
                        onClick={() => handleProductSuggestionClick(suggestion)}
                      >
                        {suggestion}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Second Row: Dropdown Filters */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {/* 1. Status Dropdown */}
            {setStatusFilter && (
              <div className="relative w-full">
                <FilterAutocomplete
                  value={statusFilter || "Tutti"}
                  onChange={(val) => setStatusFilter(val)}
                  options={showClosedOnly ? [
                    { value: "Tutti", label: "Tutti gli Stati" },
                    { value: "Spedizione_Ricevuta_da_Consegnare", label: "In Consegna" },
                    { value: "Completato", label: "Consegnati" }
                  ] : [
                    { value: "Tutti", label: "Tutti gli Stati" },
                    { value: "Aperto", label: "Aperti" },
                    { value: "In_Spedizione", label: "In Spedizione" }
                  ]}
                />
              </div>
            )}

            {/* 2. Strike Filter */}
            {setStrikeFilter && (
              <div className="relative w-full">
                <FilterAutocomplete
                  value={strikeFilter || "Tutti"}
                  onChange={(val) => setStrikeFilter(val as any)}
                  options={[
                    { value: "Tutti", label: "Tutti (Strike)" },
                    { value: "Senza strike", label: "Senza strike" },
                    { value: "Con strike", label: "Con strike (>= 1)" },
                    { value: "Cattivi", label: "Cattivi" }
                  ]}
                />
              </div>
            )}

            {/* 3. Tag Dropdown */}
            {setTagFilter && (
              <div className="relative w-full">
                <FilterAutocomplete
                  value={tagFilter || "Tutti"}
                  onChange={(val) => setTagFilter(val)}
                  options={[
                    { value: "Tutti", label: "Tutti i Tag" },
                    { value: "", label: "Senza tag" },
                    ...(uniqueTags || [])
                      .filter(tag => tag !== "⏳ Pagamento Posticipato" && tag !== "📦 Spedizione Richiesta")
                      .map(tag => ({ value: tag, label: tag }))
                  ]}
                />
              </div>
            )}

            {/* 4. Loyalty Tier Filter */}
            {setLoyaltyTierFilter && (
              <div className="relative w-full">
                <FilterAutocomplete
                  value={loyaltyTierFilter || "Tutti"}
                  onChange={(val) => setLoyaltyTierFilter(val)}
                  options={[
                    { value: "Tutti", label: "Tutti i Livelli" },
                    { value: "Rookie Collector", label: "Rookie Collector 🌱" },
                    { value: "Binder Keeper", label: "Binder Keeper 📘" },
                    { value: "Elite Buyer", label: "Elite Buyer 🎒" },
                    { value: "Slab Hunter", label: "Slab Hunter 🛡️" },
                    { value: "Master Collector", label: "Master Collector 👑" },
                    { value: "Legendary Investor", label: "Legendary Investor 💎" }
                  ]}
                />
              </div>
            )}

            {/* 5. Sort Dropdown */}
            {setSortOption && (
              <div className="relative w-full">
                <FilterAutocomplete
                  value={sortOption || "Nessuno"}
                  onChange={(val) => setSortOption(val as any)}
                  options={[
                    { value: "Nessuno", label: "Nessun Ordine" },
                    { value: "Da Pagare", label: "Ord. Da Pagare (Decresc.)" },
                    { value: "Saldato", label: "Ord. Da Pagare (Cresc.)" },
                    { value: "Alfabetico (A-Z)", label: "Alfabetico (A-Z)" },
                    { value: "Alfabetico (Z-A)", label: "Alfabetico (Z-A)" },
                    { value: "Oggetti (Decrescente)", label: "Ogg. Magazzino (Decresc.)" },
                    { value: "Oggetti (Crescente)", label: "Ogg. Magazzino (Cresc.)" },
                    { value: "Grading (Decrescente)", label: "Ogg. Grading (Decresc.)" },
                    { value: "Grading (Crescente)", label: "Ogg. Grading (Cresc.)" },
                    { value: "Strike (Decrescente)", label: "Strike (Decresc.)" },
                    { value: "Strike (Crescente)", label: "Strike (Cresc.)" },
                    { value: "Ultimo Contatto (Meno recente)", label: "Ultimo WhatsApp (Meno recente ⏳)" },
                    { value: "Ultimo Contatto (Più recente)", label: "Ultimo WhatsApp (Più recente 🕒)" }
                  ]}
                />
              </div>
            )}
          </div>

          {/* Third Row: Quick Toggles */}
          <div className="flex flex-wrap gap-2 items-center pt-1 border-t border-slate-100 mt-1">
            {setTagFilter && (
              <button
                type="button"
                onClick={() => setTagFilter(tagFilter === "⏳ Pagamento Posticipato" ? "Tutti" : "⏳ Pagamento Posticipato")}
                className={`px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider border transition-all shrink-0 flex items-center gap-1.5 shadow-sm ${tagFilter === "⏳ Pagamento Posticipato" ? "bg-purple-100 text-purple-800 border-purple-300" : "bg-white text-slate-600 border-slate-200 hover:bg-purple-50 hover:text-purple-700"}`}
              >
                <Clock className="h-3 w-3" />
                <span>Pag. Posticipati</span>
              </button>
            )}
            {setUnpaidOnly && (
              <button
                type="button"
                onClick={() => setUnpaidOnly(!unpaidOnly)}
                className={`px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider border transition-all shrink-0 flex items-center gap-1.5 shadow-sm ${unpaidOnly ? "bg-rose-100 text-rose-800 border-rose-300" : "bg-white text-slate-600 border-slate-200 hover:bg-rose-50 hover:text-rose-700"}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${unpaidOnly ? "bg-rose-500" : "bg-slate-300"}`}></span>
                <span>Da Pagare</span>
              </button>
            )}
            {setReadyForShippingOnly && (
              <button
                type="button"
                onClick={() => setReadyForShippingOnly(!readyForShippingOnly)}
                className={`px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider border transition-all shrink-0 flex items-center gap-1.5 shadow-sm ${readyForShippingOnly ? "bg-emerald-100 text-emerald-800 border-emerald-300" : "bg-white text-slate-600 border-slate-200 hover:bg-emerald-50 hover:text-emerald-700"}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${readyForShippingOnly ? "bg-emerald-500" : "bg-slate-300"}`}></span>
                <span>Spedibili</span>
              </button>
            )}
            {setHasObjectsOnly && (
              <button
                type="button"
                onClick={() => {
                  setHasObjectsOnly(!hasObjectsOnly);
                  if (!hasObjectsOnly && setEmptyCartsOnly) setEmptyCartsOnly(false);
                }}
                className={`px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider border transition-all shrink-0 flex items-center gap-1.5 shadow-sm ${hasObjectsOnly ? "bg-indigo-100 text-indigo-800 border-indigo-300" : "bg-white text-slate-600 border-slate-200 hover:bg-indigo-50 hover:text-indigo-700"}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${hasObjectsOnly ? "bg-indigo-500" : "bg-slate-300"}`}></span>
                <span>Con Oggetti</span>
              </button>
            )}
            {setEmptyCartsOnly && (
              <button
                type="button"
                onClick={() => {
                  setEmptyCartsOnly(!emptyCartsOnly);
                  if (!emptyCartsOnly && setHasObjectsOnly) setHasObjectsOnly(false);
                }}
                className={`px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider border transition-all shrink-0 flex items-center gap-1.5 shadow-sm ${emptyCartsOnly ? "bg-amber-100 text-amber-800 border-amber-300" : "bg-white text-slate-600 border-slate-200 hover:bg-amber-50 hover:text-amber-700"}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${emptyCartsOnly ? "bg-amber-500" : "bg-slate-300"}`}></span>
                <span>Vuoti</span>
              </button>
            )}
          </div>
        </div>
      
      
      {/* Global Filter Summary */}
      <div className="mb-3 flex items-center justify-between bg-white border border-slate-200 px-3 py-2 rounded-xl shadow-sm">
        <div className="text-xs font-medium text-slate-600">
          <span className="font-bold text-slate-800">{filteredCarts.length}</span> {filteredCarts.length === 1 ? 'carrello trovato' : 'carrelli trovati'}
        </div>
        {(globalSummaryStats.totalDaPagare > 0 || globalSummaryStats.totalPagato > 0) && (
          <div className="flex gap-3 text-[10px] font-bold">
            {globalSummaryStats.totalPagato > 0 && (
              <span className="text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
                Incassato: €{globalSummaryStats.totalPagato.toFixed(2)}
              </span>
            )}
            {globalSummaryStats.totalDaPagare > 0 && (
              <span className="text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                Da incassare: €{globalSummaryStats.totalDaPagare.toFixed(2)}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Global Product Search Stats */}
      {productSearchStats && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 flex flex-col gap-2 shadow-sm mb-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-indigo-900">
              🛒 {productSearchStats.totalCartsWithProduct} carrelli contengono "{filterProduct}"
            </span>
            <div className="flex gap-2 text-[10px] font-bold">
              <span className="text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-200">
                {productSearchStats.totalPaidCarts} {productSearchStats.totalPaidCarts === 1 ? 'Carr. Pagato' : 'Carr. Pagati'}
              </span>
              <span className="text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-200">
                {productSearchStats.totalUnpaidCarts} {productSearchStats.totalUnpaidCarts === 1 ? 'Carr. Da Pagare' : 'Carr. Da Pagare'}
              </span>
            </div>
          </div>
          
          <div className="flex items-center justify-between pt-2 border-t border-indigo-200/50">
             <span className="text-[11px] font-bold text-indigo-800 flex items-center gap-1">
               <FileText className="w-3.5 h-3.5" />
               {productSearchStats.totalItemsWithProduct} Oggetti Totali (di questo tipo)
             </span>
             <div className="flex gap-2 text-[10px] font-bold">
              <span className="text-emerald-700 bg-emerald-100/50 px-1.5 py-0.5 rounded border border-emerald-200/50">
                {productSearchStats.totalPaidItems} Art. Pagati
              </span>
              <span className="text-amber-700 bg-amber-100/50 px-1.5 py-0.5 rounded border border-amber-200/50">
                {productSearchStats.totalUnpaidItems} Art. Da Pagare
              </span>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      <div className="pr-1">
        {filteredCarts.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-2xl">
            Nessun ordine trovato.
          </div>
        ) : (
          (() => {
            const isSearchingProduct = !!filterProduct && filterProduct.trim().length > 0;
            const isMobileScreen = typeof window !== "undefined" && window.innerWidth < 640;
            const rowHeight = isSearchingProduct ? (isMobileScreen ? 140 : 125) : (isMobileScreen ? 120 : 100);
            const rowCount = Math.ceil(filteredCarts.length / columns);
            const listHeight = "calc(100dvh - 250px)";

            const renderCartCard = (c: Carrello) => {
              const isSelected = c.ID_Carrello === selectedCartId;
              let badgeColor = "bg-slate-100 text-slate-700 border-slate-200";
              if (c.Stato_Carrello === "Aperto")
                badgeColor = "bg-blue-50 text-blue-700 border-blue-150";
              else if (c.Stato_Carrello === "Pronto_per_Spedizione")
                badgeColor = "bg-indigo-50 text-indigo-700 border-indigo-150";
              else if (c.Stato_Carrello === "Spedizione_Ricevuta_da_Consegnare")
                badgeColor = "bg-amber-50 text-amber-700 border-amber-150";
              else if (c.Stato_Carrello === "Completato")
                badgeColor = "bg-emerald-50 text-emerald-700 border-emerald-150";

              const cartDettagli = dettagliMap.get(c.ID_Carrello) || [];
              const cartGrading = gradingMap.get(c.ID_Carrello) || [];
              const numOggetti = cartDettagli.length;
              const numGrading = cartGrading.length;

              const totaleCarrello =
                cartDettagli.reduce((sum, d) => sum + d.Prezzo_Registrato, 0) +
                cartGrading.reduce((sum, g) => sum + g.Costo_Cliente, 0);

              const totaleAcconti =
                cartDettagli.reduce(
                  (sum, d) => sum + (!d.Pagato_Singolarmente ? (d.Acconto_Pagato || 0) : 0),
                  0
                ) +
                cartGrading.reduce(
                  (sum, g) => sum + (!g.Pagato_Singolarmente ? (g.Acconto_Pagato || 0) : 0),
                  0
                );

              const totalePagato =
                cartDettagli.reduce(
                  (sum, d) =>
                    sum +
                    (d.Pagato_Singolarmente
                      ? d.Prezzo_Registrato
                      : d.Acconto_Pagato || 0),
                  0
                ) +
                cartGrading.reduce(
                  (sum, g) =>
                    sum +
                    (g.Pagato_Singolarmente
                      ? g.Costo_Cliente
                      : g.Acconto_Pagato || 0),
                  0
                );

              const daPagare = Math.max(0, totaleCarrello - totalePagato);

              const isReadyForImmediateShipping =
                numOggetti > 0 &&
                cartDettagli.every((d) => {
                  const m = magazzinoMap.get(d.ID_Oggetto);
                  return isDataImmediata(m?.Data_Spedizione_Presunta);
                });

              const hasPosticipatoItems =
                cartDettagli.some((d) => d.Pagamento_Posticipato) ||
                cartGrading.some((g) => g.Pagamento_Posticipato);
              const isPosticipato =
                c.Tag?.includes("⏳ Pagamento Posticipato") || hasPosticipatoItems;

              let matchedCount = 0;
              let matchedPaidCount = 0;

              if (isSearchingProduct && magazzinoMap.size > 0) {
                const normalizeString = (str: string): string => {
                  if (!str) return "";
                  return str
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "")
                    .toLowerCase()
                    .replace(/['’]/g, "")
                    .replace(/[\s\u00a0]+/g, " ")
                    .trim();
                };
                const prodQueries = filterProduct.split(',').map(q => normalizeString(q)).filter(Boolean);
                const itemStates = getCartItemPaidStates(cartDettagli, cartGrading);

                itemStates.forEach((item) => {
                  if (item.type === "dettaglio") {
                    const d = item.ref as DettaglioCarrello;
                    const m = magazzinoMap.get(d.ID_Oggetto);
                    const name = normalizeString(m?.Nome || "");
                    const id = normalizeString(d.ID_Oggetto || "");
                    const itemMatches = prodQueries.some(query => {
                      const queryTerms = query.split(" ").filter(Boolean);
                      return queryTerms.every(term => name.includes(term) || id.includes(term));
                    });
                    if (itemMatches) {
                      matchedCount++;
                      if (item.isPaid) matchedPaidCount++;
                    }
                  } else {
                    const g = item.ref as GradingItem;
                    const name = normalizeString(g.Nome_Carta || (g as any).Nome_Oggetto || "");
                    const desc = normalizeString((g as any).Descrizione || "");
                    const id = normalizeString(g.ID_Oggetto_Grading || "");
                    const itemMatches = prodQueries.some(query => {
                      const queryTerms = query.split(" ").filter(Boolean);
                      return queryTerms.every(term => name.includes(term) || desc.includes(term) || id.includes(term));
                    });
                    if (itemMatches) {
                      matchedCount++;
                      if (item.isPaid) matchedPaidCount++;
                    }
                  }
                });
              }

              return (
                <div
                  key={c.ID_Carrello}
                  onClick={() => handleSelectCart(c)}
                  className={`p-2 rounded-xl border cursor-pointer flex flex-col justify-between h-full box-border overflow-hidden gap-1 ${
                    isSelected
                      ? (isReadyForImmediateShipping ? "bg-emerald-100 border-emerald-400 shadow-sm ring-1 ring-emerald-300" : "bg-indigo-50 border-indigo-300 shadow-sm ring-1 ring-indigo-200")
                      : (isReadyForImmediateShipping ? "bg-emerald-50 border-emerald-300 hover:border-emerald-400 hover:bg-emerald-100 shadow-sm" : "bg-white border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 shadow-sm")
                  }`}
                >
                  {/* RIGA 1: Nome Carrello - Saldo da pagare o Saldo pagato */}
                  <div className="flex items-center justify-between gap-2 min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0 truncate">
                      <span
                        className="font-bold text-xs text-slate-900 dark:text-white truncate"
                        title={c.Nome_Cliente ? c.Nome_Cliente : `Carrello Anonimo`}
                      >
                        {c.Nome_Cliente && c.Nome_Cliente.trim() ? c.Nome_Cliente : `Carrello ${c.ID_Carrello}`}
                      </span>
                      {c.Telefono && (
                        <span className="text-[10px] text-slate-500 font-mono shrink-0 truncate">
                          {c.Telefono}
                        </span>
                      )}
                      {showClosedOnly && c.Nome_Cliente && resiPerCliente.get(c.Nome_Cliente.trim()) ? (
                        <span className="shrink-0 bg-rose-100 text-rose-700 border border-rose-200 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider" title={`${resiPerCliente.get(c.Nome_Cliente.trim())} resi effettuati in totale da questo cliente`}>
                          Resi: {resiPerCliente.get(c.Nome_Cliente.trim())}
                        </span>
                      ) : null}
                    </div>

                    <div
                      className={`text-[9.5px] font-bold font-mono text-right shrink-0 ${
                        daPagare > 0
                          ? "text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100"
                          : "text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100"
                      }`}
                    >
                      {daPagare > 0 ? (
                        <span className="whitespace-nowrap">
                          €{daPagare.toFixed(2)} da pag.
                          {totaleAcconti > 0 && (
                            <span className="text-[8px] text-indigo-600 font-semibold ml-1">
                              (Acc. -€{totaleAcconti.toFixed(2)})
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="whitespace-nowrap">€{totalePagato.toFixed(2)} sald.</span>
                      )}
                    </div>
                  </div>

                  {/* RIGA 2: Informazioni Cartellini - N oggetti nel carrello N oggetti grading */}
                  <div className="flex items-center justify-between gap-2 min-w-0">
                    {/* Informazioni Cartellini */}
                    <div className="flex items-center gap-1 shrink-0 min-w-0 overflow-hidden">
                      {c.ID_Carrello.includes("-S-") && (() => {
                        const parentId = c.ID_Carrello.split("-S-")[0];
                        return (
                          <span 
                            className="bg-purple-50 text-purple-700 px-1 py-0.5 rounded text-[8px] font-bold border border-purple-200 whitespace-nowrap flex items-center gap-0.5" 
                            title={`Generato da carrello padre #${parentId}`}
                          >
                            <span className="inline-block transform scale-90">🔗</span> #{parentId}
                          </span>
                        );
                      })()}

                      {c.Nome_Cliente && c.Nome_Cliente.trim() && (
                        <div className="shrink-0 flex items-center">
                          <StrikeBadge
                            strikesCount={c.Strike || 0}
                            cattivoData={c.Cattivo_Data || ""}
                            clientName={c.Nome_Cliente}
                            cartId={c.ID_Carrello}
                            onUpdateStrikes={onUpdateCartStrikes}
                            showText={false}
                          />
                        </div>
                      )}

                      {c.Stato_Carrello && c.Stato_Carrello !== "Aperto" && (
                        <span
                          className={`px-1 py-0.5 rounded text-[7.5px] font-bold uppercase tracking-wider border whitespace-nowrap ${badgeColor}`}
                        >
                          {c.Stato_Carrello.replace(/_/g, " ")}
                        </span>
                      )}

                      {(() => {
                        const lastMsgTime = localMsgMap[c.ID_Carrello] || c.Data_Ultimo_Messaggio;
                        if (!lastMsgTime) return null;
                        const { label } = formatLastContactDate(lastMsgTime);
                        return (
                          <span
                            className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-1 py-0.5 rounded text-[7.5px] font-semibold whitespace-nowrap flex items-center gap-0.5 shrink-0"
                            title={`Ultimo messaggio inviato: ${lastMsgTime}`}
                          >
                            <Clock className="h-2.5 w-2.5 text-emerald-600 inline" />
                            {label}
                          </span>
                        );
                      })()}
                    </div>

                    {/* N oggetti nel carrello N oggetti grading */}
                    <div className="flex items-center gap-1 shrink-0">
                      {(numOggetti > 0 || numGrading > 0) ? (
                        <div className="flex gap-1">
                          {numOggetti > 0 && (
                            <span
                              className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[8.5px] font-bold border border-slate-200 whitespace-nowrap"
                              title="Oggetti nel carrello"
                            >
                              📦 {numOggetti} {numOggetti === 1 ? "oggetto" : "oggetti"}
                            </span>
                          )}
                          {numGrading > 0 && (
                            <span
                              className="bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded text-[8.5px] font-bold border border-indigo-200 whitespace-nowrap"
                              title="Oggetti in grading"
                            >
                              ⭐ {numGrading} {numGrading === 1 ? "grading" : "grading"}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span
                          className="bg-slate-50 text-slate-400 px-1.5 py-0.5 rounded text-[8.5px] font-semibold border border-slate-200 whitespace-nowrap"
                          title="Nessun oggetto nel carrello"
                        >
                          📭 Vuoto
                        </span>
                      )}
                    </div>
                  </div>

                  {/* RIGA 3: Tag assegnati al carrello - Pulsantini rapidi per cambiare stato carrello Delay o spedizione richiesta */}
                  <div className="flex items-center justify-between gap-2 min-w-0">
                    {/* Tag assegnati al carrello */}
                    <div className="flex items-center gap-1 min-w-0 truncate overflow-hidden">
                      {(c.Tag || "")
                        .split(",")
                        .map(t => t.replace(/🟨/g, "").replace("🔴 Cattivi", "").replace(/\s{2,}/g, " ").trim())
                        .filter(t => t && !t.includes("📦") && !t.includes("⏳") && !t.includes("Spedizione Richiesta") && !t.includes("Pagamento Posticipato"))
                        .map((displayTag, idx) => (
                          <span
                            key={displayTag + idx}
                            className={`px-1 py-0.5 rounded text-[7.5px] font-bold tracking-wider border whitespace-nowrap truncate max-w-[80px] ${
                              displayTag.includes("Pronto Per Spedire")
                                ? "bg-green-100 text-green-800 border-green-200"
                                : displayTag.includes("Napoli")
                                ? "bg-blue-100 text-blue-800 border-blue-200"
                                : displayTag.includes("Roma")
                                ? "bg-orange-100 text-orange-800 border-orange-200"
                                : displayTag.includes("Vinted")
                                ? "bg-teal-100 text-teal-800 border-teal-200"
                                : displayTag.includes("Corriere")
                                ? "bg-sky-100 text-sky-800 border-sky-200"
                                : displayTag.includes("Aspetto Dopo Le Vacanze")
                                ? "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200"
                                : "bg-indigo-100 text-indigo-800 border-indigo-200"
                            }`}
                          >
                            {displayTag}
                          </span>
                        ))}
                    </div>

                    {/* Pulsantini rapidi per cambiare stato carrello Delay o spedizione richiesta */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {onTogglePaymentTag && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onTogglePaymentTag(c.ID_Carrello);
                          }}
                          className={
                            "p-1.5 min-w-[30px] min-h-[30px] flex items-center justify-center rounded-lg transition-all border shadow-2xs cursor-pointer active:scale-95 " +
                            (isPosticipato
                              ? "bg-purple-100 border-purple-300 text-purple-700 font-bold"
                              : "bg-white border-slate-200 text-slate-400 hover:text-purple-600 hover:bg-purple-50")
                          }
                          title="Pulsante rapido Delay (Pagamento Posticipato)"
                        >
                          <Clock className="h-3.5 w-3.5" />
                        </button>
                      )}

                      {onToggleShipmentTag && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleShipmentTag(c.ID_Carrello);
                          }}
                          className={
                            "p-1.5 min-w-[30px] min-h-[30px] flex items-center justify-center rounded-lg transition-all border shadow-2xs cursor-pointer active:scale-95 " +
                            (c.Tag?.includes("📦 Spedizione Richiesta")
                              ? "bg-amber-100 border-amber-300 text-amber-700 font-bold"
                              : "bg-white border-slate-200 text-slate-400 hover:text-amber-600 hover:bg-amber-50")
                          }
                          title="Pulsante rapido Spedizione Richiesta"
                        >
                          <Package className="h-3.5 w-3.5" />
                        </button>
                      )}

                      <ChevronRight className="h-4 w-4 text-slate-300 ml-0.5" />
                    </div>
                  </div>

                  {/* Synthetic Indicator for Search */}
                  {isSearchingProduct && matchedCount > 0 && (
                    <div className="bg-indigo-50/80 px-1.5 py-0.5 rounded text-[8.5px] border border-indigo-100/50">
                      <span className="text-indigo-800 font-medium">
                        Trovati {matchedCount} "{filterProduct}" —{" "}
                        <span
                          className={`font-bold ${
                            matchedPaidCount === matchedCount
                              ? "text-emerald-600"
                              : "text-rose-600"
                          }`}
                        >
                          {matchedPaidCount}/{matchedCount} Pag.
                        </span>
                      </span>
                    </div>
                  )}

                  {/* Immediate Shipping Banner */}
                  {isReadyForImmediateShipping && (
                    <div className="bg-emerald-500 text-white text-[8.5px] uppercase font-bold text-center py-0.5 px-1 rounded tracking-wider">
                      TUTTI GLI OGGETTI DISPONIBILI POSSIBILE DA SPEDIRE
                    </div>
                  )}
                </div>
              );
            };


            return <VirtualizedGrid 
                rowCount={rowCount} 
                rowHeight={rowHeight} 
                listHeight={listHeight} 
                columns={columns} 
                filteredCarts={filteredCarts} 
                renderCartCard={renderCartCard} 
            />;

          })()
        )}
      </div>

      {isWhatsAppModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex flex-col justify-between shrink-0 gap-2">
              <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="h-5 w-5 text-emerald-500" />
                    <h3 className="font-bold text-slate-800 text-lg">
                      Informa Clienti (WhatsApp)
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    {contactedCartIds.length > 0 && (
                      <button
                        onClick={() => setContactedCartIds([])}
                        className="text-xs bg-slate-200 hover:bg-slate-300 text-slate-700 px-2.5 py-1 rounded-lg font-semibold transition-colors flex items-center gap-1"
                        title="Reimposta la coda di invio"
                      >
                        🔄 Azzera inviati ({contactedCartIds.length})
                      </button>
                    )}
                    <button
                      onClick={() => {
                        handleStopBulkSend();
                        setIsWhatsAppModalOpen(false);
                      }}
                      className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200 transition-colors"
                    >
                      ✕
                    </button>
                  </div>
              </div>
              <div className="text-xs text-slate-600 bg-slate-100 p-2 rounded-md border border-slate-200 flex flex-col gap-0.5">
                <div>
                  <strong>Filtri Attuali:</strong> {filterProduct && filterProduct.trim().length > 0 ? `"${filterProduct}"` : "Nessun filtro prodotto" } | {search ? `Ricerca "${search}"` : "Nessuna ricerca"} | {statusFilter} | {tagFilter || 'Tutti i Tag'}
                </div>
                <div className="text-[11px] text-slate-500">
                  ⚡ <em>Ordinati per ultimo invio: chi non ha mai ricevuto messaggi o è stato contattato meno di recente è in cima alla coda.</em>
                </div>
              </div>
            </div>
            <div className="p-4 overflow-y-auto flex-1 space-y-3">
              {(() => {
                const remaining = whatsAppCartList.filter(c => !contactedCartIds.includes(c.ID_Carrello));
                const contacted = whatsAppCartList.filter(c => contactedCartIds.includes(c.ID_Carrello));

                if (remaining.length === 0) {
                  return (
                    <div className="text-center py-8 space-y-3">
                      <div className="inline-flex items-center justify-center p-3 bg-emerald-100 text-emerald-700 rounded-full">
                        <MessageCircle className="h-6 w-6" />
                      </div>
                      <div className="text-slate-700 font-bold text-base">
                        Tutti i clienti ({whatsAppCartList.length}) sono stati contattati!
                      </div>
                      <p className="text-xs text-slate-500">
                        La coda di invio è completata. Puoi chiudere la finestra o azzerare la coda per ricominciare.
                      </p>
                      {contacted.length > 0 && (
                        <button
                          onClick={() => setContactedCartIds([])}
                          className="mt-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1.5"
                        >
                          🔄 Ricomincia coda da capo
                        </button>
                      )}
                    </div>
                  );
                }
                
                const nextCart = remaining[0];
                const hasPhone = nextCart.Telefono || phoneInputs[nextCart.ID_Carrello];
                const nextLastMsgInfo = formatLastContactDate(localMsgMap[nextCart.ID_Carrello] || nextCart.Data_Ultimo_Messaggio);
                
                return (
                  <>
                    {isBulkSending ? (
                      <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-xl p-4 mb-4 shadow-md flex flex-col gap-3 animate-pulse">
                        <div className="flex justify-between items-center">
                          <span className="font-extrabold text-xs uppercase tracking-wider flex items-center gap-1.5 text-emerald-100">
                            ⚡ Invio di Massa Attivo
                          </span>
                          <span className="bg-emerald-900/40 text-emerald-100 px-2 py-0.5 rounded-full text-[11px] font-bold">
                            Modo: {bulkSendMode === "focus" ? "Auto-Focus 👀" : `Timer (${countdownValue}s) ⏱️`}
                          </span>
                        </div>
                        
                        <div className="text-center py-2">
                          <p className="text-xs text-emerald-100">Apertura automatica della chat per:</p>
                          <p className="text-lg font-black">{nextCart.Nome_Cliente || `Carrello #${nextCart.ID_Carrello}`}</p>
                          <p className="text-xs font-mono text-emerald-200 mt-0.5">📞 {nextCart.Telefono || phoneInputs[nextCart.ID_Carrello]}</p>
                        </div>

                        {bulkSendMode === "timer" && (
                          <div className="w-full bg-emerald-950/40 rounded-full h-2 overflow-hidden">
                            <div 
                              className="bg-amber-400 h-2 transition-all duration-1000 ease-linear" 
                              style={{ width: `${timerProgress}%` }}
                            />
                          </div>
                        )}

                        <div className="text-xs bg-emerald-950/30 p-2.5 rounded-lg border border-emerald-500/20 text-center">
                          {bulkSendMode === "focus" ? (
                            <span>
                              👉 <strong>Come funziona:</strong> premi Invio su WhatsApp per spedire. Non appena <strong>ritornerai con il mouse/focus su questa pagina</strong>, l'app aprirà automaticamente la chat del cliente successivo!
                            </span>
                          ) : (
                            <span>
                              👉 <strong>Come funziona:</strong> ogni {bulkTimerSeconds} secondi l'app aprirà una nuova chat. Spedisci il messaggio e attendi che la sequenza continui.
                            </span>
                          )}
                        </div>

                        <button
                          onClick={handleStopBulkSend}
                          className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-extrabold uppercase transition-all shadow-md flex items-center justify-center gap-1.5"
                        >
                          ⏹️ Interrompi Invio di Massa
                        </button>
                      </div>
                    ) : (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-4 shadow-sm flex flex-col gap-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-200/40 pb-2.5">
                          <div className="text-xs font-extrabold text-emerald-800 uppercase tracking-wider">
                            Coda di invio: <span className="text-emerald-950 font-black text-sm">{remaining.length}</span> da contattare
                          </div>
                          
                          <div className="flex flex-wrap gap-1.5">
                            <button
                              onClick={() => handleStartBulkSend("focus")}
                              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm transition-colors cursor-pointer"
                              title="Apre in automatico il cliente successivo quando rimetti a fuoco questa pagina"
                            >
                              ⚡ Invio di Massa (Auto-Focus)
                            </button>
                            <button
                              onClick={() => {
                                const sec = prompt("Inserisci l'intervallo in secondi tra un invio e l'altro (minimo 2):", "3");
                                if (sec === null) return;
                                const parsedSec = parseInt(sec, 10);
                                if (isNaN(parsedSec) || parsedSec < 2) {
                                  alert("Inserisci un numero valido maggiore o uguale a 2.");
                                  return;
                                }
                                setBulkTimerSeconds(parsedSec);
                                handleStartBulkSend("timer");
                              }}
                              className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm transition-colors cursor-pointer"
                              title="Apre un cliente ogni X secondi in sequenza"
                            >
                              ⏱️ Invio di Massa (Timer)
                            </button>
                          </div>
                        </div>

                        {hasPhone ? (
                          <div className="flex flex-col gap-2 pt-1">
                            <button
                              onClick={() => {
                                handleExportWhatsApp(nextCart, false, phoneInputs[nextCart.ID_Carrello]);
                                setContactedCartIds(prev => [...prev, nextCart.ID_Carrello]);
                              }}
                              className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white rounded-xl text-base font-black uppercase tracking-wide transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                            >
                              <MessageCircle className="h-5 w-5" />
                              Invia a {nextCart.Nome_Cliente || `Carrello #${nextCart.ID_Carrello}`}
                            </button>
                            
                            {filterProduct && filterProduct.trim().length > 0 && (
                              <button
                                onClick={() => {
                                  handleExportWhatsApp(nextCart, true, phoneInputs[nextCart.ID_Carrello]);
                                  setContactedCartIds(prev => [...prev, nextCart.ID_Carrello]);
                                }}
                                className="w-full py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold uppercase transition-all flex items-center justify-center gap-2 cursor-pointer"
                              >
                                Invia solo filtrato a {nextCart.Nome_Cliente || `Carrello #${nextCart.ID_Carrello}`}
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="text-xs text-rose-600 font-medium">
                            ⚠️ Il prossimo cliente ({nextCart.Nome_Cliente || 'Senza Nome'}) non ha il numero di telefono. Inseriscilo nella lista sottostante per poter procedere.
                          </div>
                        )}
                      </div>
                    )}

                    <div className="space-y-2">
                      <div className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
                        Lista clienti in attesa ({remaining.length})
                      </div>
                      {remaining.map((c, idx) => {
                        const lastMsgInfo = formatLastContactDate(localMsgMap[c.ID_Carrello] || c.Data_Ultimo_Messaggio);
                        return (
                          <div key={`${c.ID_Carrello}-${idx}`} className="flex flex-col p-3 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-emerald-300 transition-colors gap-2.5">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div>
                                <div className="font-bold text-slate-900 dark:text-white text-sm">
                                  {c.Nome_Cliente || `Carrello #${c.ID_Carrello}`}
                                </div>
                                <div className="flex flex-wrap items-center gap-2 mt-0.5">
                                  <span className={`text-[11px] flex items-center gap-1 font-medium ${lastMsgInfo.isNever ? "text-slate-400" : "text-emerald-700 font-semibold"}`}>
                                    <Clock className="h-3 w-3 inline text-slate-400" />
                                    {lastMsgInfo.label}
                                  </span>
                                  {c.Telefono && (
                                    <span className="text-[11px] text-slate-500 font-mono">
                                      📞 {c.Telefono}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex flex-wrap items-center gap-2 shrink-0">
                                <button
                                  onClick={() => {
                                    if (!c.Telefono && !phoneInputs[c.ID_Carrello]) {
                                      alert("Inserisci un numero di telefono prima di inviare!");
                                      return;
                                    }
                                    if (!c.Telefono && phoneInputs[c.ID_Carrello]) {
                                      handleSavePhone(c.ID_Carrello);
                                    }
                                    handleExportWhatsApp(c, false, phoneInputs[c.ID_Carrello]);
                                    setContactedCartIds(prev => [...prev, c.ID_Carrello]);
                                  }}
                                  className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                                >
                                  <Smartphone className="h-3.5 w-3.5 text-emerald-600" />
                                  <span>Invia</span>
                                </button>
                                {filterProduct && filterProduct.trim().length > 0 && (
                                  <button
                                    onClick={() => {
                                      if (!c.Telefono && !phoneInputs[c.ID_Carrello]) {
                                        alert("Inserisci un numero di telefono prima di inviare!");
                                        return;
                                      }
                                      if (!c.Telefono && phoneInputs[c.ID_Carrello]) {
                                        handleSavePhone(c.ID_Carrello);
                                      }
                                      handleExportWhatsApp(c, true, phoneInputs[c.ID_Carrello]);
                                      setContactedCartIds(prev => [...prev, c.ID_Carrello]);
                                    }}
                                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-800 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                                  >
                                    <MessageCircle className="h-3.5 w-3.5" />
                                    <span>Solo Filtrato</span>
                                  </button>
                                )}
                              </div>
                            </div>
                            {/* Phone Input if missing */}
                            {!c.Telefono && (
                              <div className="flex items-center gap-2 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                                <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider shrink-0">Telefono:</span>
                                <input 
                                  type="tel"
                                  inputMode="tel"
                                  autoComplete="tel"
                                  placeholder="es. 393331234567"
                                  value={phoneInputs[c.ID_Carrello] || ''}
                                  onChange={(e) => setPhoneInputs(prev => ({ ...prev, [c.ID_Carrello]: e.target.value }))}
                                  className="flex-1 px-3 py-2 text-base sm:text-xs border border-rose-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white font-mono"
                                />
                                <button 
                                  type="button"
                                  onClick={() => handleSavePhone(c.ID_Carrello)}
                                  disabled={savingPhones[c.ID_Carrello] || !phoneInputs[c.ID_Carrello]}
                                  className="px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold uppercase rounded-lg disabled:opacity-50 transition-colors cursor-pointer shrink-0"
                                >
                                  {savingPhones[c.ID_Carrello] ? '...' : 'Salva'}
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {contacted.length > 0 && (
                      <div className="pt-3 border-t border-slate-100">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                          Già contattati in questa sessione ({contacted.length})
                        </div>
                        <div className="space-y-1.5 opacity-70">
                          {contacted.map((c) => {
                            const lastMsgInfo = formatLastContactDate(localMsgMap[c.ID_Carrello] || c.Data_Ultimo_Messaggio);
                            return (
                              <div key={`contacted-${c.ID_Carrello}`} className="flex items-center justify-between p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                                <span className="font-semibold text-slate-700">{c.Nome_Cliente || `Carrello #${c.ID_Carrello}`}</span>
                                <span className="text-[11px] text-emerald-700 font-medium">{lastMsgInfo.label}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 shrink-0 flex justify-end">
              <button
                onClick={() => setIsWhatsAppModalOpen(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-sm font-bold transition-colors"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
});
