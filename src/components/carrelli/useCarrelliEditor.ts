
import React, { useState, useMemo, useEffect } from "react";
import { useDatabase } from "../../context/DatabaseContext";
import { isDataImmediata } from "../../lib/dateUtils";
import {
  Carrello,
  DettaglioCarrello,
  OggettoMagazzino,
  Spedizione,
  StatoCarrello,
  Operatore,
  GradingItem,
  ListinoGradingItem,
  GradingGroup,
  CustomerLoyalty
} from "../../types";
import { ImportProposal } from "./ImportFormModal";
import { CarrelliProps, getCartItemPaidStates } from "./carrelliUtils";
import { getShippingValidation, isCartRequiringCourier } from "../../lib/packlinkParser";

export function useCarrelliEditor(props: CarrelliProps) {
  const {
    onSaveCart,
    onUpdateCartHeader,
    onBatchSaveCarts,
    onProceedToShipment,
    onUpdateShipmentStatus,
    onDeleteCart,
    showClosedOnly = false,
    onUploadPhoto,
    onUpdateCard,
    selectedCartId: propSelectedCartId,
    onSelectCartId: propOnSelectCartId,
    onSelectClosedCartId,
    onSelectLiveCartId,
    onNavigate,
    token,
    addSafetyLog,
    onUpdateCartPayment,
    loyaltyProfiles = [],
  } = props;

  const {
    carrelli,
    dettagli,
    magazzino,
    spedizioni,
    currentOperatore,
    userRole,
    oggettiInGrading,
    listinoGrading,
    gruppiGrading,
    customGlobalTags,
    setCustomGlobalTags
  } = useDatabase();

  const [localSelectedCartId, setLocalSelectedCartId] = useState<string | null>(null);
  const selectedCartId = propSelectedCartId !== undefined ? propSelectedCartId : localSelectedCartId;
  const setSelectedCartId = propOnSelectCartId !== undefined ? propOnSelectCartId : setLocalSelectedCartId;
  const [isCreating, setIsCreating] = useState(false);
  const [isPayPalSyncModalOpen, setIsPayPalSyncModalOpen] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");
  const [newClientEmail, setNewClientEmail] = useState("");
  const [newClientAddress, setNewClientAddress] = useState("");

  // Local active client details states
  const [activeClientName, setActiveClientName] = useState("");
  const [activeClientPhone, setActiveClientPhone] = useState("");
  const [activeClientEmail, setActiveClientEmail] = useState("");
  const [activeClientAddress, setActiveClientAddress] = useState("");
  const [activeClientTag, setActiveClientTag] = useState("");
  const [activeClientNote, setActiveClientNote] = useState("");
  const [activeClientNoteInterne, setActiveClientNoteInterne] = useState("");
  const [activeClientStrike, setActiveClientStrike] = useState(0);
  const [activeClientCattivoData, setActiveClientCattivoData] = useState("");
  const [isImportFormModalOpen, setIsImportFormModalOpen] = useState(false);
  const [isEditingClient, setIsEditingClient] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  
  const [importReport, setImportReport] = useState<{
    totalSourceRows: number;
    importedRows: number;
    emailsNotLoaded: any[];
    resultUpdates: any[];
  } | null>(null);

  React.useEffect(() => {
    if (importReport) {
      const timer = setTimeout(() => setImportReport(null), 10000);
      return () => clearTimeout(timer);
    }
  }, [importReport]);


  const handleCopy = (text: string, field: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1500);
  };

  // Search and status filter
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("Tutti");
  const [tagFilter, setTagFilter] = useState<string>("Tutti");
  const [filterProduct, setFilterProduct] = useState("");
  const [loyaltyTierFilter, setLoyaltyTierFilter] = useState<string>("Tutti");
  const [sortOption, setSortOption] = useState<"Nessuno" | "Da Pagare" | "Saldato" | "Alfabetico (A-Z)" | "Alfabetico (Z-A)" | "Oggetti (Crescente)" | "Oggetti (Decrescente)" | "Grading (Crescente)" | "Grading (Decrescente)" | "Strike (Crescente)" | "Strike (Decrescente)" | "Ultimo Contatto (Meno recente)" | "Ultimo Contatto (Più recente)">("Nessuno");
  const [emptyCartsOnly, setEmptyCartsOnly] = useState<boolean>(false);
  const [strikeFilter, setStrikeFilter] = useState<"Tutti" | "Senza strike" | "Con strike" | "Cattivi">("Tutti");
  const [hasObjectsOnly, setHasObjectsOnly] = useState<boolean>(false);
  const [unpaidOnly, setUnpaidOnly] = useState<boolean>(false);
  const [readyForShippingOnly, setReadyForShippingOnly] = useState<boolean>(false);

  // Local cart items editor state (cloned from original detailed records when selected)
  const [activeCartItems, setActiveCartItems] = useState<DettaglioCarrello[]>([]);
  const [isEditingItems, setIsEditingItems] = useState(false);

  // List of indexes of items marked for partial or full shipment
  const [selectedItemIndexes, setSelectedItemIndexes] = useState<number[]>([]);
  // List of IDs of grading items marked for shipment
  const [selectedGradingIds, setSelectedGradingIds] = useState<string[]>([]);

  // Reset selected item indexes and grading IDs to empty (not selected by default) when cart selection changes
  useEffect(() => {
    setSelectedItemIndexes([]);
    setSelectedGradingIds([]);
  }, [selectedCartId]);

  // Shipment flow state
  const [showShipmentModal, setShowShipmentModal] = useState(false);
  const [shipmentPhotos, setShipmentPhotos] = useState<File[]>([]);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [shipmentLoading, setShipmentLoading] = useState(false);

  // Local active grading items editor state
  const [activeGradingItems, setActiveGradingItems] = useState<GradingItem[]>([]);
  const [isAddingGrading, setIsAddingGrading] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);

  // Synchronize activeGradingItems when selectedCartId or oggettiInGrading changes
  useEffect(() => {
    if (selectedCartId) {
      if (!isEditingItems) {
        const items = oggettiInGrading.filter((item) => item.ID_Carrello === selectedCartId);
        setActiveGradingItems(items);
      }
    } else {
      setActiveGradingItems([]);
    }
  }, [oggettiInGrading, selectedCartId, isEditingItems]);

  // Custom delete confirmation modal state
  const [cartIdToDelete, setCartIdToDelete] = useState<string | null>(null);
  const [viewedGradingStatusId, setViewedGradingStatusId] = useState<string | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeletingProcess, setIsDeletingProcess] = useState(false);

  const selectedCart = useMemo(() => {
    return carrelli.find((c) => c.ID_Carrello === selectedCartId) || null;
  }, [carrelli, selectedCartId]);

  // Client name validator with intuitive warning descriptions
  const clientNameValidation = useMemo(() => {
    if (!newClientName) {
      return { isValid: false, warning: "Il nome del cliente è obbligatorio e non può essere vuoto." };
    }
    const trimmed = newClientName.trim();
    if (trimmed.length < 2) {
      return { isValid: false, warning: "Il nome inserito è troppo corto. Deve contenere almeno 2 caratteri." };
    }
    const activeDuplicate = carrelli.find(
      (c) =>
        c.Nome_Cliente.trim().toLowerCase() === trimmed.toLowerCase() &&
        c.Stato_Carrello !== "Spedizione_Ricevuta_da_Consegnare" &&
        c.Stato_Carrello !== "Completato"
    );
    if (activeDuplicate) {
      return { isValid: false, warning: `Un ordine attivo o in lavorazione intestato a "${trimmed}" è già presente nel sistema. Puoi creare un nuovo ordine con questo nome solo se i precedenti sono già in consegna o completati.` };
    }
    const lettersRegex = /^[a-zA-ZÀ-ÿ0-9\s'\-]+$/;
    if (!lettersRegex.test(trimmed)) {
      return { isValid: false, warning: "Il nome contiene caratteri speciali non consentiti. Usa solo lettere, numeri e spazi." };
    }
    return { isValid: true, warning: null };
  }, [newClientName, carrelli]);

  // Helper to get reserved counts for each item across other active/unshipped carts
  const reservedInOtherCarts = useMemo(() => {
    const counts: Record<string, number> = {};
    carrelli.forEach((c) => {
      const isShippedOrDone = c.Stato_Carrello === "Spedizione_Ricevuta_da_Consegnare" || c.Stato_Carrello === "Completato";
      if (c.ID_Carrello !== selectedCartId && !isShippedOrDone) {
        const cartDets = dettagli.filter((d) => d.ID_Carrello === c.ID_Carrello && !d.ID_Spedizione);
        cartDets.forEach((d) => {
          counts[d.ID_Oggetto] = (counts[d.ID_Oggetto] || 0) + 1;
        });
      }
    });
    return counts;
  }, [carrelli, dettagli, selectedCartId]);

  // Original items in selected cart
  const originalCartItems = useMemo(() => {
    if (!selectedCartId) return [];
    return dettagli.filter((d) => d.ID_Carrello === selectedCartId);
  }, [dettagli, selectedCartId]);

  // Filtered carts list
  const filteredCarts = useMemo(() => {
    // console.log("CARRELLI COUNT:", carrelli.length);

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

    // --- PRECOMPUTATION TO AVOID EXPENSIVE LOOPS ---
    const magazzinoMap = new Map();
    magazzino.forEach(m => {
        magazzinoMap.set(m.ID_Oggetto, {
            ...m,
            normalizedNome: normalizeString(m.Nome || "")
        });
    });

    const dettagliByCart = new Map();
    dettagli.forEach(d => {
        if (!dettagliByCart.has(d.ID_Carrello)) dettagliByCart.set(d.ID_Carrello, []);
        dettagliByCart.get(d.ID_Carrello).push({
            ...d,
            normalizedId: normalizeString(d.ID_Oggetto || "")
        });
    });

    const gradingByCart = new Map();
    oggettiInGrading.forEach(g => {
        if (!gradingByCart.has(g.ID_Carrello)) gradingByCart.set(g.ID_Carrello, []);
        gradingByCart.get(g.ID_Carrello).push({
            ...g,
            normalizedNomeCarta: normalizeString(g.Nome_Carta || ""),
            normalizedNomeOggetto: normalizeString((g as any).Nome_Oggetto || ""),
            normalizedId: normalizeString(g.ID_Oggetto_Grading || "")
        });
    });

    const searchTerms = search.trim() ? normalizeString(search).split(" ").filter(Boolean) : [];
    const prodQueries = filterProduct.trim() 
      ? filterProduct.split(',').map(q => normalizeString(q).split(" ").filter(Boolean)).filter(q => q.length > 0) 
      : [];
    // --- END PRECOMPUTATION ---

    let result = carrelli.filter((c) => {
      let matchSearch = true;
      if (searchTerms.length > 0) {
        matchSearch = searchTerms.every((term) => {
          return (
            normalizeString(c.Nome_Cliente).includes(term) ||
            normalizeString(c.ID_Carrello).includes(term) ||
            normalizeString(c.Telefono).includes(term) ||
            normalizeString(c.Email).includes(term) ||
            normalizeString(c.Tag).includes(term)
          );
        });
      }

      const matchStatus = statusFilter === "Tutti" || c.Stato_Carrello === statusFilter;
      
      const cartDettagli = dettagliByCart.get(c.ID_Carrello) || [];
      const cartGrading = gradingByCart.get(c.ID_Carrello) || [];
      const cartDettagliUnshipped = cartDettagli.filter((d: any) => !d.ID_Spedizione);
      const cartGradingUnshipped = cartGrading.filter((g: any) => !g.ID_Spedizione);

      let matchTag = false;
      if (tagFilter === "Tutti") {
        matchTag = true;
      } else if (tagFilter === "🔴 Cattivi") {
        matchTag = !!c.Tag && c.Tag.includes("🔴 Cattivi");
      } else if (tagFilter === "⏳ Pagamento Posticipato") {
        const hasPosticipato = cartDettagliUnshipped.some((d: any) => d.Pagamento_Posticipato) || cartGradingUnshipped.some((g: any) => g.Pagamento_Posticipato);
        matchTag = (c.Tag || "").split(",").map(t => t.trim()).includes(tagFilter) || hasPosticipato;
      } else {
        matchTag = (c.Tag || "").split(",").map(t => t.trim()).includes(tagFilter);
      }
      
      let matchProduct = true;
      if (prodQueries.length > 0) {
        matchProduct = prodQueries.every(queryTerms => {
          return cartDettagliUnshipped.some((d: any) => {
            const m = magazzinoMap.get(d.ID_Oggetto);
            const name = m?.normalizedNome || "";
            const id = d.normalizedId;
            return queryTerms.every((term: string) => name.includes(term) || id.includes(term));
          }) || cartGradingUnshipped.some((g: any) => {
            const name = g.normalizedNomeCarta;
            const objName = g.normalizedNomeOggetto;
            const id = g.normalizedId;
            return queryTerms.every((term: string) => name.includes(term) || objName.includes(term) || id.includes(term));
          });
        });
      }

      const hasObjects = () => cartDettagliUnshipped.length > 0 || cartGradingUnshipped.length > 0;
      const matchHasObjects = !hasObjectsOnly || hasObjects();

      const hasUnpaid = () => {
        const itemStates = getCartItemPaidStates(cartDettagliUnshipped, cartGradingUnshipped);

        if (prodQueries.length > 0) {
          return itemStates.some((item) => {
            if (item.isPaid) return false;
            
            return prodQueries.some(queryTerms => {
              if (item.type === "dettaglio") {
                const d = item.ref as any;
                const m = magazzinoMap.get(d.ID_Oggetto);
                const name = m?.normalizedNome || "";
                const id = d.normalizedId;
                return queryTerms.every((term: string) => name.includes(term) || id.includes(term));
              } else {
                const g = item.ref as any;
                const name = g.normalizedNomeCarta;
                const objName = g.normalizedNomeOggetto;
                const id = g.normalizedId;
                return queryTerms.every((term: string) => name.includes(term) || objName.includes(term) || id.includes(term));
              }
            });
          });
        }

        return itemStates.some((item) => !item.isPaid && item.price > 0);
      };
      const matchUnpaidOnly = !unpaidOnly || hasUnpaid();
      const matchEmptyCarts = !emptyCartsOnly || !hasObjects();
      
      const matchReadyForShipping = !readyForShippingOnly || (() => {
        if (cartDettagliUnshipped.length === 0) return false;
        return cartDettagliUnshipped.every((d: any) => {
          const magItem = magazzinoMap.get(d.ID_Oggetto);
          return isDataImmediata(magItem?.Data_Spedizione_Presunta);
        });
      })();

      let matchStrike = true;
      if (strikeFilter === "Senza strike") {
        matchStrike = !c.Strike || c.Strike === 0;
      } else if (strikeFilter === "Con strike") {
        matchStrike = (c.Strike || 0) >= 1;
      } else if (strikeFilter === "Cattivi") {
        matchStrike = !!(c.Cattivo_Data && c.Cattivo_Data.trim().length > 0);
      }

      let matchLoyaltyTier = true;
      if (loyaltyTierFilter !== "Tutti") {
        const clientNameLower = c.Nome_Cliente ? c.Nome_Cliente.trim().toLowerCase() : "";
        const clientEmailLower = c.Email ? c.Email.trim().toLowerCase() : "";
        const profile = loyaltyProfiles.find(
          (p) =>
            p.customerId === clientEmailLower ||
            p.customerId === clientNameLower ||
            (p.email && p.email.toLowerCase() === clientEmailLower)
        );
        const tierName = profile ? profile.tier : "Rookie Collector";
        matchLoyaltyTier = tierName === loyaltyTierFilter;
      }

      return matchSearch && matchStatus && matchTag && matchProduct && matchHasObjects && matchEmptyCarts && matchUnpaidOnly && matchStrike && matchReadyForShipping && matchLoyaltyTier;
    });

    if (sortOption !== "Nessuno") {
      result.sort((a, b) => {
        if (sortOption === "Alfabetico (A-Z)") {
          return a.Nome_Cliente.localeCompare(b.Nome_Cliente);
        } else if (sortOption === "Alfabetico (Z-A)") {
          return b.Nome_Cliente.localeCompare(a.Nome_Cliente);
        } else if (sortOption === "Oggetti (Decrescente)") {
          const countA = (dettagliByCart.get(a.ID_Carrello) || []).length;
          const countB = (dettagliByCart.get(b.ID_Carrello) || []).length;
          return countB - countA;
        } else if (sortOption === "Oggetti (Crescente)") {
          const countA = (dettagliByCart.get(a.ID_Carrello) || []).length;
          const countB = (dettagliByCart.get(b.ID_Carrello) || []).length;
          return countA - countB;
        } else if (sortOption === "Strike (Decrescente)") {
          return (b.Strike || 0) - (a.Strike || 0);
        } else if (sortOption === "Strike (Crescente)") {
          return (a.Strike || 0) - (b.Strike || 0);
        } else if (sortOption === "Grading (Decrescente)") {
          const countA = (gradingByCart.get(a.ID_Carrello) || []).length;
          const countB = (gradingByCart.get(b.ID_Carrello) || []).length;
          return countB - countA;
        } else if (sortOption === "Grading (Crescente)") {
          const countA = (gradingByCart.get(a.ID_Carrello) || []).length;
          const countB = (gradingByCart.get(b.ID_Carrello) || []).length;
          return countA - countB;
        } else if (sortOption === "Ultimo Contatto (Meno recente)") {
          const getTs = (c: Carrello) => {
            if (!c.Data_Ultimo_Messaggio) return 0;
            const t = new Date(c.Data_Ultimo_Messaggio).getTime();
            return isNaN(t) ? 0 : t;
          };
          return getTs(a) - getTs(b);
        } else if (sortOption === "Ultimo Contatto (Più recente)") {
          const getTs = (c: Carrello) => {
            if (!c.Data_Ultimo_Messaggio) return 0;
            const t = new Date(c.Data_Ultimo_Messaggio).getTime();
            return isNaN(t) ? 0 : t;
          };
          return getTs(b) - getTs(a);
        } else {
          const getDaPagare = (cart: Carrello) => {
            const cartDettagli = dettagliByCart.get(cart.ID_Carrello) || [];
            const cartGrading = gradingByCart.get(cart.ID_Carrello) || [];
            const totaleCarrello =
              cartDettagli.reduce((sum: number, d: any) => sum + d.Prezzo_Registrato, 0) +
              cartGrading.reduce((sum: number, g: any) => sum + g.Costo_Cliente, 0);
            const totalePagato =
              cartDettagli.reduce((sum: number, d: any) => sum + (d.Pagato_Singolarmente ? d.Prezzo_Registrato : (d.Acconto_Pagato || 0)), 0) +
              cartGrading.reduce((sum: number, g: any) => sum + (g.Pagato_Singolarmente ? g.Costo_Cliente : (g.Acconto_Pagato || 0)), 0);
            return totaleCarrello - totalePagato;
          };
          const daPagareA = getDaPagare(a);
          const daPagareB = getDaPagare(b);

          if (sortOption === "Da Pagare") {
            return daPagareB - daPagareA;
          } else {
            return daPagareA - daPagareB;
          }
        }
      });
    }

    return result;
  }, [carrelli, search, statusFilter, tagFilter, showClosedOnly, filterProduct, sortOption, hasObjectsOnly, emptyCartsOnly, unpaidOnly, readyForShippingOnly, strikeFilter, dettagli, oggettiInGrading, magazzino, loyaltyTierFilter, loyaltyProfiles]);

  // Track the last loaded cart ID to know if selection actually changed
  const lastSelectedCartIdRef = React.useRef<string | null>(null);

  // Keep activeCartItems in sync with dettagli when database is reloaded or cart selection changes
  useEffect(() => {
    const isCartChanged = lastSelectedCartIdRef.current !== selectedCartId;
    lastSelectedCartIdRef.current = selectedCartId;

    if (selectedCartId) {
      if (isCartChanged || !isEditingItems) {
        const items = dettagli
          .filter((d) => d.ID_Carrello === selectedCartId)
          .map((d) => ({
            ID_Carrello: d.ID_Carrello,
            ID_Oggetto: d.ID_Oggetto,
            Pagato_Singolarmente: d.Pagato_Singolarmente,
            Prezzo_Registrato: d.Prezzo_Registrato,
            Pagamento_Posticipato: d.Pagamento_Posticipato,
            Acconto_Pagato: d.Acconto_Pagato || 0,
            ID_Spedizione: d.ID_Spedizione,
            Reso: d.Reso
          }));
        setActiveCartItems(items);
        if (isCartChanged) {
          setIsEditingItems(false);
        }
      }
    } else {
      setActiveCartItems([]);
      setIsEditingItems(false);
    }
  }, [dettagli, selectedCartId, isEditingItems]);

  // Keep activeClient details in sync with selectedCart when database is reloaded or cart selection changes
  useEffect(() => {
    if (selectedCart) {
      if (!isEditingClient) {
        setActiveClientName(selectedCart.Nome_Cliente);
        setActiveClientPhone(selectedCart.Telefono || "");
        setActiveClientEmail(selectedCart.Email || "");
        setActiveClientAddress(selectedCart.Indirizzo_Spedizione || "");
        setActiveClientTag(selectedCart.Tag || "");
        setActiveClientNote(selectedCart.Note || "");
        setActiveClientNoteInterne(selectedCart.Note_Interne || "");
        setActiveClientStrike(selectedCart.Strike || 0);
        setActiveClientCattivoData(selectedCart.Cattivo_Data || "");
      }
    } else {
      setActiveClientName("");
      setActiveClientPhone("");
      setActiveClientEmail("");
      setActiveClientAddress("");
      setActiveClientTag("");
      setActiveClientNote("");
      setActiveClientNoteInterne("");
      setActiveClientStrike(0);
      setActiveClientCattivoData("");
      setIsEditingClient(false);
    }
  }, [selectedCart, isEditingClient]);

  // Load cart items into local editor state on cart selection
  const handleUpdateCartPhone = async (cartId: string, phone: string) => {
    const cart = carrelli.find(c => c.ID_Carrello === cartId);
    if (!cart) return;
    const updatedCart = { ...cart, Telefono: phone.trim() };
    if (onUpdateCartHeader) {
      await onUpdateCartHeader(updatedCart);
    } else {
      const cItems = dettagli.filter(d => d.ID_Carrello === cartId);
      const gItems = oggettiInGrading.filter(g => g.ID_Carrello === cartId);
      await onSaveCart(updatedCart, cItems, gItems);
    }
  };

  const handleUpdateCartLastMessage = async (cartId: string, timestamp?: string) => {
    const timeToSet = timestamp || new Date().toISOString();
    try {
      const stored = localStorage.getItem("CARRELLI_LAST_MSG_TIMESTAMPS");
      const map = stored ? JSON.parse(stored) : {};
      map[cartId] = timeToSet;
      localStorage.setItem("CARRELLI_LAST_MSG_TIMESTAMPS", JSON.stringify(map));
    } catch (e) {
      console.warn("Could not save last msg timestamp to localStorage", e);
    }

    const cart = carrelli.find(c => c.ID_Carrello === cartId);
    if (!cart) return;
    const updatedCart = { ...cart, Data_Ultimo_Messaggio: timeToSet };
    if (onUpdateCartHeader) {
      await onUpdateCartHeader(updatedCart);
    } else {
      const cItems = dettagli.filter(d => d.ID_Carrello === cartId);
      const gItems = oggettiInGrading.filter(g => g.ID_Carrello === cartId);
      await onSaveCart(updatedCart, cItems, gItems);
    }
  };

  const handleSelectCart = (cart: Carrello) => {
    if (selectedCartId === cart.ID_Carrello) {
      setSelectedCartId(null);
      return;
    }
    setSelectedCartId(cart.ID_Carrello);
    const items = dettagli
      .filter((d) => d.ID_Carrello === cart.ID_Carrello)
      .map((d) => ({
        ID_Carrello: d.ID_Carrello,
        ID_Oggetto: d.ID_Oggetto,
        Pagato_Singolarmente: d.Pagato_Singolarmente,
        Prezzo_Registrato: d.Prezzo_Registrato,
        Pagamento_Posticipato: d.Pagamento_Posticipato,
        Acconto_Pagato: d.Acconto_Pagato,
        ID_Spedizione: d.ID_Spedizione,
        Reso: d.Reso
      }));
    setActiveCartItems(items);
    setIsEditingItems(false);

    // Initialize client details
    setActiveClientName(cart.Nome_Cliente);
    setActiveClientPhone(cart.Telefono || "");
    setActiveClientEmail(cart.Email || "");
    setActiveClientAddress(cart.Indirizzo_Spedizione || "");
    setActiveClientTag(cart.Tag || "");
    setActiveClientNote(cart.Note || "");
    setActiveClientNoteInterne(cart.Note_Interne || "");
    setActiveClientStrike(cart.Strike || 0);
    setActiveClientCattivoData(cart.Cattivo_Data || "");
    setIsEditingClient(false);
  };

  // Apply imported proposals
  
  const handleTogglePaymentTag = async (cartId: string) => {
    const cart = carrelli.find(c => c.ID_Carrello === cartId);
    if (!cart) return;
    const currentTag = cart.Tag || "";
    let newTag = currentTag;
    if (currentTag === "⏳ Pagamento Posticipato") {
      newTag = "";
    } else {
      newTag = "⏳ Pagamento Posticipato";
    }
    const updatedCart = { ...cart, Tag: newTag };
    if (onUpdateCartHeader) {
      await onUpdateCartHeader(updatedCart);
    } else {
      const cartDettagli = dettagli.filter(d => d.ID_Carrello === cartId);
      const cartGrading = oggettiInGrading.filter(g => g.ID_Carrello === cartId);
      await onSaveCart(updatedCart, cartDettagli, cartGrading);
    }
  };

  const handleToggleShipmentTag = async (cartId: string) => {
    const cart = carrelli.find(c => c.ID_Carrello === cartId);
    if (!cart) return;
    const currentTag = cart.Tag || "";
    let tags = currentTag.split(",").map(t => t.trim()).filter(Boolean);
    
    if (tags.includes("📦 Spedizione Richiesta")) {
      tags = tags.filter(t => t !== "📦 Spedizione Richiesta");
    } else {
      tags.push("📦 Spedizione Richiesta");
    }
    
    const updatedCart = { ...cart, Tag: tags.join(", ") };
    try {
      if (onUpdateCartHeader) {
        await onUpdateCartHeader(updatedCart);
      } else {
        const cartGrading = oggettiInGrading.filter(g => g.ID_Carrello === cartId);
        await onSaveCart(updatedCart, dettagli.filter(d => d.ID_Carrello === cartId), cartGrading);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateCartTag = async (cartId: string, newTag: string) => {
    const cart = carrelli.find(c => c.ID_Carrello === cartId);
    if (!cart) return;
    const updatedCart = { ...cart, Tag: newTag };
    try {
      if (onUpdateCartHeader) {
        await onUpdateCartHeader(updatedCart);
      } else {
        const cartGrading = oggettiInGrading.filter(g => g.ID_Carrello === cartId);
        await onSaveCart(updatedCart, dettagli.filter(d => d.ID_Carrello === cartId), cartGrading);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateCartAddress = async (cartId: string, newAddress: string) => {
    const cart = carrelli.find(c => c.ID_Carrello === cartId);
    if (!cart) return;
    const updatedCart = { ...cart, Indirizzo_Spedizione: newAddress };
    try {
      if (onUpdateCartHeader) {
        await onUpdateCartHeader(updatedCart);
      } else {
        const cartGrading = oggettiInGrading.filter(g => g.ID_Carrello === cartId);
        await onSaveCart(updatedCart, dettagli.filter(d => d.ID_Carrello === cartId), cartGrading);
      }
      if (selectedCartId === cartId) {
        setActiveClientAddress(newAddress);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateCartNote = async (cartId: string, newNote: string) => {
    const cart = carrelli.find(c => c.ID_Carrello === cartId);
    if (!cart) return;
    const updatedCart = { ...cart, Note: newNote };
    try {
      if (onUpdateCartHeader) {
        await onUpdateCartHeader(updatedCart);
      } else {
        const cartGrading = oggettiInGrading.filter(g => g.ID_Carrello === cartId);
        await onSaveCart(updatedCart, dettagli.filter(d => d.ID_Carrello === cartId), cartGrading);
      }
      if (selectedCartId === cartId) {
        setActiveClientNote(newNote);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateCartStrikes = async (cartId: string, strike: number, cattivoData: string) => {
    const cart = carrelli.find(c => c.ID_Carrello === cartId);
    if (!cart) return;
    const updatedCart = { ...cart, Strike: strike, Cattivo_Data: cattivoData };
    try {
      if (onUpdateCartHeader) {
        await onUpdateCartHeader(updatedCart);
      } else {
        const cartGrading = oggettiInGrading.filter(g => g.ID_Carrello === cartId);
        await onSaveCart(updatedCart, dettagli.filter(d => d.ID_Carrello === cartId), cartGrading);
      }
      if (selectedCartId === cartId) {
        setActiveClientStrike(strike);
        setActiveClientCattivoData(cattivoData);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleReopenCart = async (cartId: string) => {
    const cart = carrelli.find(c => c.ID_Carrello === cartId);
    if (!cart) return;
    try {
      const cartGrading = oggettiInGrading.filter(g => g.ID_Carrello === cartId);
      await onSaveCart({ ...cart, Stato_Carrello: "Aperto" }, dettagli.filter(d => d.ID_Carrello === cartId), cartGrading);
    } catch (e) {
      console.error(e);
    }
  };

  const handleApplyFormProposals = async (proposals: ImportProposal[]) => {
    try {
      const proposalsByTarget: Record<string, ImportProposal[]> = {};
      
      for (const p of proposals) {
        if (!p.selected) continue;
        
        const key = p.matchedCartId ? `CART_${p.matchedCartId}` : `NEW_${p.clientName.trim().toLowerCase()}`;
        if (!proposalsByTarget[key]) {
           proposalsByTarget[key] = [];
        }
        proposalsByTarget[key].push(p);
      }
      
      const updatesToApply: { cart: Carrello; items: Omit<DettaglioCarrello, "ID_Carrello">[]; gradingItems?: GradingItem[] }[] = [];

      for (const [key, props] of Object.entries(proposalsByTarget)) {
        let cart: Carrello | undefined;
        let cartItems: Omit<DettaglioCarrello, "ID_Carrello">[] = [];
        let cartGrading: GradingItem[] = [];
        
        const isNew = key.startsWith("NEW_");
        
        if (!isNew) {
          const cartId = key.replace("CART_", "");
          cart = carrelli.find(c => c.ID_Carrello === cartId);
        }
        
        const propWithEmail = props.find(p => p.clientEmail);
        const propWithPhone = props.find(p => p.clientPhone);
        const propWithAddress = props.find(p => p.clientAddress);
        const propWithTag = props.find(p => p.clientTag);

        if (cart) {
          // get existing items
          const existingDets = dettagli.filter(d => d.ID_Carrello === cart!.ID_Carrello);
          cartItems = existingDets.map(d => {
             const { ID_Carrello, ...rest } = d;
             return rest;
          });
          cartGrading = oggettiInGrading.filter(g => g.ID_Carrello === cart!.ID_Carrello);
          // Update cart info if provided
          cart = { ...cart };
          if (propWithEmail) cart.Email = propWithEmail.clientEmail?.trim();
          if (propWithPhone) cart.Telefono = propWithPhone.clientPhone?.trim();
          if (propWithAddress) cart.Indirizzo_Spedizione = propWithAddress.clientAddress?.trim();
          if (propWithTag) {
            const existingTags = (cart.Tag || "").split(",").map(t => t.trim()).filter(Boolean);
            const newTags = propWithTag.clientTag?.split(",").map(t => t.trim()).filter(Boolean) || [];
            cart.Tag = Array.from(new Set([...existingTags, ...newTags])).join(", ");
          }
        } else {
          // Create new cart
          const clientName = props[0].clientName.trim();
          cart = {
            ID_Carrello: `CART-${Date.now().toString().slice(-6)}-${Math.floor(Math.random()*1000)}`,
            Nome_Cliente: clientName,
            Stato_Carrello: "Aperto",
            Totale_Pagato: 0,
            Telefono: propWithPhone?.clientPhone?.trim() || "",
            Email: propWithEmail?.clientEmail?.trim() || "",
            Indirizzo_Spedizione: propWithAddress?.clientAddress?.trim() || "",
            Tag: propWithTag?.clientTag?.trim() || ""
          };
          cartItems = [];
        }
        
        // append new items
        for (const p of props) {
          if (p.matchedItemId) {
            const qty = p.requestedQuantity || 1;
            for (let i = 0; i < qty; i++) {
              const magItem = magazzino.find(m => m.ID_Oggetto === p.matchedItemId);
              cartItems.push({
                ID_Oggetto: p.matchedItemId!,
                Pagato_Singolarmente: p.isPaid || false,
                Prezzo_Registrato: magItem ? magItem.Prezzo_Vendita : 0
              });
            }
          }
        }
        
        updatesToApply.push({ cart, items: cartItems, gradingItems: cartGrading });
      }
      
      if (onBatchSaveCarts) {
        await onBatchSaveCarts(updatesToApply);
      } else {
        for (const update of updatesToApply) {
          await onSaveCart(update.cart, update.items, update.gradingItems);
        }
      }
      
      return { success: true, updates: updatesToApply, proposalsByTarget };
    } catch (err: any) {
      alert("Errore durante l'importazione: " + err.message);
      return { success: false, error: err.message };
    }
  };

  // Create new cart
  const handleCreateCart = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = clientNameValidation;
    if (!validation.isValid) {
      alert(`Attenzione! È necessario correggere il campo prima di procedere:

${validation.warning}`);
      return;
    }

    const trimmedName = newClientName.trim();
    const cartId = `CART-${Date.now().toString().slice(-6)}`;
    const newCart: Carrello = {
      ID_Carrello: cartId,
      Nome_Cliente: trimmedName,
      Stato_Carrello: "Aperto",
      Totale_Pagato: 0,
      Telefono: "",
      Email: "",
      Indirizzo_Spedizione: "",
      Tag: "",
    };

    try {
      await onSaveCart(newCart, []);
      setSelectedCartId(cartId);
      setActiveCartItems([]);
      setIsCreating(false);
      setNewClientName("");
      setNewClientPhone("");
      setNewClientEmail("");
      setNewClientAddress("");
    } catch (err: any) {
      alert("Errore durante la creazione dell'ordine: " + err.message);
    }
  };

  // Add item from warehouse to the active cart state
  const handleAddItemToCart = (itemId: string) => {
    const warehouseItem = magazzino.find((m) => m.ID_Oggetto === itemId);
    if (!warehouseItem) return;

    // REQUIREMENT: "nei carrelli non posso creare piu entries di oggetti se sono maggiori delle rimanenze in magazzino"
    // Taking other active carts reservations into account:
    const otherReserved = reservedInOtherCarts[itemId] || 0;
    const currentCount = activeCartItems.filter((item) => item.ID_Oggetto === itemId).length;
    const maxAllowed = warehouseItem.Quantità_Disponibile - otherReserved;

    if (currentCount >= maxAllowed) {
      alert(`Impossibile aggiungere un altro "${warehouseItem.Nome}".
Quantità massima disponibile raggiunta (${maxAllowed} unità, tenendo conto delle riserve in altri carrelli attivi).`);
      return;
    }

    setActiveCartItems([
      ...activeCartItems,
      {
        ID_Carrello: selectedCartId || "",
        ID_Oggetto: itemId,
        Pagato_Singolarmente: false,
        Prezzo_Registrato: warehouseItem.Prezzo_Vendita,
      },
    ]);
    setIsEditingItems(true);
  };

  // Increment quantity of a specific item in the cart by adding 1 unit
  const handleIncrementQuantity = (itemId: string, prezzoRegistrato: number, idSpedizione?: string) => {
    const warehouseItem = magazzino.find((m) => m.ID_Oggetto === itemId);
    if (!warehouseItem) return;

    const otherReserved = reservedInOtherCarts[itemId] || 0;
    const currentCount = activeCartItems.filter((item) => item.ID_Oggetto === itemId).length;
    const maxAllowed = warehouseItem.Quantità_Disponibile - otherReserved;

    if (currentCount >= maxAllowed) {
      alert(`Impossibile aggiungere un altro "${warehouseItem.Nome}".
Quantità massima disponibile raggiunta (${maxAllowed} unità, tenendo conto delle riserve in altri carrelli attivi).`);
      return;
    }

    setActiveCartItems([
      ...activeCartItems,
      {
        ID_Oggetto: itemId,
        ID_Carrello: selectedCart!.ID_Carrello,
        Prezzo_Registrato: prezzoRegistrato,
        Pagato_Singolarmente: false,
        ID_Spedizione: idSpedizione || undefined,
        Acconto_Pagato: 0,
      },
    ]);
    setIsEditingItems(true);
  };

  // Decrement quantity of a specific item in the cart by removing 1 unit
  const handleDecrementQuantity = (indexes: number[]) => {
    if (indexes.length === 0) return;
    const indexToRemove = indexes[indexes.length - 1];
    setActiveCartItems(activeCartItems.filter((_, idx) => idx !== indexToRemove));
    setIsEditingItems(true);
  };

  // Update item custom registered price
  const handlePriceChange = (index: number, price: number) => {
    const updated = activeCartItems.map((item, i) => {
      if (i === index) {
        return { ...item, Prezzo_Registrato: price };
      }
      return item;
    });
    setActiveCartItems(updated);
    setIsEditingItems(true);
  };

  // Compute stats of active local cart including grading items
  const cartTotals = useMemo(() => {
    let totaleCarrello = 0;
    let totalePagato = 0;
    let totaleAcconti = 0;
    activeCartItems.forEach((item) => {
      if (item.Reso) return;
      totaleCarrello += item.Prezzo_Registrato;
      if (item.Pagato_Singolarmente) {
        totalePagato += item.Prezzo_Registrato;
      } else if (item.Acconto_Pagato) {
        totalePagato += item.Acconto_Pagato;
        totaleAcconti += item.Acconto_Pagato;
      }
    });
    activeGradingItems.forEach((g) => {
      if (g.Reso) return;
      totaleCarrello += g.Costo_Cliente;
      if (g.Pagato_Singolarmente) {
        totalePagato += g.Costo_Cliente;
      } else if (g.Acconto_Pagato) {
        totalePagato += g.Acconto_Pagato;
        totaleAcconti += g.Acconto_Pagato;
      }
    });
    return {
      totaleCarrello,
      totalePagato,
      totaleAcconti,
      rimanenza: Math.max(0, totaleCarrello - totalePagato),
    };
  }, [activeCartItems, activeGradingItems]);

  // Compute stats of items selected for shipment
  const selectedTotals = useMemo(() => {
    let totaleSpedizione = 0;
    let totalePagato = 0;
    selectedItemIndexes.forEach((idx) => {
      const item = activeCartItems[idx];
      if (item) {
        totaleSpedizione += item.Prezzo_Registrato;
        if (item.Pagato_Singolarmente) {
          totalePagato += item.Prezzo_Registrato;
        } else if (item.Acconto_Pagato) {
          totalePagato += item.Acconto_Pagato;
        }
      }
    });
    selectedGradingIds.forEach((id) => {
      const gItem = activeGradingItems.find((g) => g.ID_Oggetto_Grading === id);
      if (gItem) {
        totaleSpedizione += gItem.Costo_Cliente;
        if (gItem.Pagato_Singolarmente) {
          totalePagato += gItem.Costo_Cliente;
        } else if (gItem.Acconto_Pagato) {
          totalePagato += gItem.Acconto_Pagato;
        }
      }
    });
    return {
      totaleSpedizione,
      totalePagato,
      rimanenza: totaleSpedizione - totalePagato,
    };
  }, [activeCartItems, selectedItemIndexes, activeGradingItems, selectedGradingIds]);

  const isEditable = useMemo(() => {
    return (selectedCart ? selectedCart.Stato_Carrello === "Aperto" : false) && userRole !== "utente";
  }, [selectedCart, userRole]);

  const isShipped = useMemo(() => {
    return selectedCart ? (selectedCart.Stato_Carrello === "Spedizione_Ricevuta_da_Consegnare" || selectedCart.Stato_Carrello === "Completato") : false;
  }, [selectedCart]);

  // Group items by ID_Oggetto
  const groupedCartItems = useMemo(() => {
    const groups: {
      [key: string]: {
        ID_Oggetto: string;
        originalIndexes: number[];
        quantity: number;
        paidQuantity: number;
        isPreordine: boolean;
        prezzoUnitario: number;
        tuttiPagati: boolean;
        tuttiPosticipati: boolean;
        tuttiSelezionati: boolean;
        selezionatiCount: number;
        nome: string;
        accontoPagato: number;
        idSpedizione?: string;
      };
    } = {};

    activeCartItems.forEach((item, idx) => {
      if (item.ID_Spedizione || item.Reso) return;
      const originalInfo = magazzino.find((m) => m.ID_Oggetto === item.ID_Oggetto);
      const nome = originalInfo ? originalInfo.Nome : "Articolo Sconosciuto";
      const isPreordine = originalInfo ? !!originalInfo.Is_Preordine : false;
      const groupKey = `${item.ID_Oggetto}|${item.Prezzo_Registrato}|${item.ID_Spedizione || 'da_spedire'}`;

      if (!groups[groupKey]) {
        groups[groupKey] = {
          ID_Oggetto: item.ID_Oggetto,
          originalIndexes: [],
          quantity: 0,
          paidQuantity: 0,
          isPreordine,
          prezzoUnitario: item.Prezzo_Registrato,
          tuttiPagati: true,
          tuttiPosticipati: true,
          tuttiSelezionati: true,
          selezionatiCount: 0,
          nome,
          accontoPagato: 0,
          idSpedizione: item.ID_Spedizione || undefined,
        };
      }

      const g = groups[groupKey];
      g.originalIndexes.push(idx);
      g.quantity += 1;
      const isItemPaid = item.Pagato_Singolarmente || (item.Prezzo_Registrato > 0 && (item.Acconto_Pagato || 0) >= item.Prezzo_Registrato);
      if (isItemPaid) {
        g.paidQuantity += 1;
      } else {
        g.tuttiPagati = false;
        if (item.Acconto_Pagato) {
          g.accontoPagato += item.Acconto_Pagato;
        }
      }
      if (!item.Pagamento_Posticipato) {
        g.tuttiPosticipati = false;
      }
      if (selectedItemIndexes.includes(idx)) {
        g.selezionatiCount += 1;
      } else {
        g.tuttiSelezionati = false;
      }
    });

    Object.values(groups).forEach((g) => {
      const groupTotal = g.prezzoUnitario * g.quantity;
      if (!g.tuttiPagati && g.accontoPagato > 0) {
        if (groupTotal > 0 && g.accontoPagato >= groupTotal) {
          g.paidQuantity = g.quantity;
          g.tuttiPagati = true;
        } else if (g.prezzoUnitario > 0) {
          const extraPaidByAcconto = Math.floor(g.accontoPagato / g.prezzoUnitario);
          if (extraPaidByAcconto > 0) {
            g.paidQuantity = Math.min(g.quantity, g.paidQuantity + extraPaidByAcconto);
          }
          if (g.paidQuantity >= g.quantity) {
            g.tuttiPagati = true;
          }
        }
      }
    });

    return Object.values(groups);
  }, [activeCartItems, selectedItemIndexes, magazzino]);

  // Handle toggling select for a whole group of items
  const handleToggleSelectForGroup = (itemId: string, g: any) => {
    if (g.tuttiSelezionati) {
      // Remove all original indexes
      setSelectedItemIndexes((prev) => prev.filter((idx) => !g.originalIndexes.includes(idx)));
    } else {
      // Add all missing original indexes
      const indexesToAdd = g.originalIndexes.filter((idx: number) => !selectedItemIndexes.includes(idx));
      setSelectedItemIndexes((prev) => [...prev, ...indexesToAdd]);
    }
  };

  // Handle setting a specific quantity to select for shipment
  const handleSelectQuantityForGroup = (itemId: string, g: any, quantity: number) => {
    setSelectedItemIndexes((prev) => {
      // First remove all of this group's indexes
      const filtered = prev.filter(idx => !g.originalIndexes.includes(idx));
      // Then add exactly the quantity requested (from the beginning of originalIndexes)
      const toAdd = g.originalIndexes.slice(0, quantity);
      return [...filtered, ...toAdd];
    });
  };

  // Handle price changes for all items in a group
  const handlePriceChangeForGroup = (indexes: number[], price: number) => {
    const updated = activeCartItems.map((item, idx) => {
      if (indexes.includes(idx)) {
        return { ...item, Prezzo_Registrato: price };
      }
      return item;
    });
    setActiveCartItems(updated);
    setIsEditingItems(true);
  };

  // Handle acconto changes for all items in a group
  const handleAccontoChangeForGroup = (indexes: number[], acconto: number) => {
    const maxGroupAcconto = activeCartItems
      .filter((item, idx) => indexes.includes(idx) && !item.Pagato_Singolarmente)
      .reduce((sum, item) => sum + (item.Prezzo_Registrato || 0), 0);

    const clampedAcconto = Math.min(Math.max(0, acconto), maxGroupAcconto);
    let remainingAcconto = clampedAcconto;

    const groupIndices = indexes.filter(idx => !activeCartItems[idx].Pagato_Singolarmente);
    if (groupIndices.length === 0) return;

    const updated = activeCartItems.map((item, idx) => {
      if (groupIndices.includes(idx)) {
        let newAcconto = 0;
        if (remainingAcconto > 0 && (item.Prezzo_Registrato || 0) > 0) {
          if (remainingAcconto >= item.Prezzo_Registrato) {
            newAcconto = item.Prezzo_Registrato;
            remainingAcconto -= item.Prezzo_Registrato;
          } else {
            newAcconto = remainingAcconto;
            remainingAcconto = 0;
          }
        }
        const isPaid = (item.Prezzo_Registrato || 0) > 0 && newAcconto >= item.Prezzo_Registrato;
        return {
           ...item,
           Acconto_Pagato: newAcconto,
          Pagato_Singolarmente: isPaid ? true : item.Pagato_Singolarmente
        };
      }
      return item;
    });

    setActiveCartItems(updated);
    setIsEditingItems(true);
  };

  const handleAccontoChangeGradingItem = (cardId: string, acconto: number) => {
    setActiveGradingItems((prev) =>
      prev.map((g) => {
        if (g.ID_Oggetto_Grading === cardId) {
          const maxGradingAcconto = Math.max(0, g.Costo_Cliente || 0);
          const clampedAcconto = Math.min(Math.max(0, acconto), maxGradingAcconto);
          const isPaid = maxGradingAcconto > 0 && clampedAcconto >= maxGradingAcconto;
          return { 
            ...g, 
            Acconto_Pagato: clampedAcconto,
            Pagato_Singolarmente: isPaid ? true : g.Pagato_Singolarmente
          };
        }
        return g;
      })
    );
    setIsEditingItems(true);
  };

    // Handle toggling posticipato status for all items in a group
  const handleTogglePosticipatoForGroup = (indexes: number[], currentPosticipato: boolean) => {
    const targetVal = !currentPosticipato;
    const updated = activeCartItems.map((item, idx) => {
      if (indexes.includes(idx)) {
        return { ...item, Pagamento_Posticipato: targetVal, Pagato_Singolarmente: targetVal ? false : item.Pagato_Singolarmente };
      }
      return item;
    });
    setActiveCartItems(updated);
    setIsEditingItems(true);
  };

  // Handle toggling paid status for all items in a group
  const handleTogglePaidForGroup = (indexes: number[], currentTuttiPagati: boolean) => {
    const targetVal = !currentTuttiPagati;
    const updated = activeCartItems.map((item, idx) => {
      if (indexes.includes(idx)) {
        return { 
          ...item, 
          Pagato_Singolarmente: targetVal, 
          Pagamento_Posticipato: targetVal ? false : item.Pagamento_Posticipato,
          Acconto_Pagato: targetVal ? item.Prezzo_Registrato : 0
        };
      }
      return item;
    });
    setActiveCartItems(updated);
    setIsEditingItems(true);

    if (!targetVal) {
      setSelectedItemIndexes((prev) => prev.filter((idx) => !indexes.includes(idx)));
    }
  };

  // Handle removing all items in a group from the cart
  
  const handleSplitGroupItem = (indexes: number[]) => {
    if (indexes.length <= 1) return; // Can't split a group of 1
    const idxToSplit = indexes[indexes.length - 1]; // Take the last one
    
    const updated = [...activeCartItems];
    // Slightly change the price to force it into a new group
    updated[idxToSplit] = {
      ...updated[idxToSplit],
      Prezzo_Registrato: (updated[idxToSplit].Prezzo_Registrato || 0) - 0.0001
    };
    
    setActiveCartItems(updated);
    setIsEditingItems(true);
  };

  const handleRemoveGroupFromCart = (indexes: number[]) => {
    const updated = activeCartItems.filter((_, idx) => !indexes.includes(idx));
    setActiveCartItems(updated);
    setSelectedItemIndexes(prev => prev.filter(idx => !indexes.includes(idx)));
    setIsEditingItems(true);
  };

  const handleTogglePosticipatoGradingItem = (cardId: string) => {
    setActiveGradingItems((prev) =>
      prev.map((g) => {
        if (g.ID_Oggetto_Grading === cardId) {
          const targetVal = !g.Pagamento_Posticipato;
          return { ...g, Pagamento_Posticipato: targetVal, Pagato_Singolarmente: targetVal ? false : g.Pagato_Singolarmente };
        }
        return g;
      })
    );
    setIsEditingItems(true);
  };

  const handleTogglePaidGradingItem = (cardId: string) => {
    setActiveGradingItems((prev) =>
      prev.map((g) => {
        if (g.ID_Oggetto_Grading === cardId) {
          const isGradingPaid = g.Pagato_Singolarmente || (g.Costo_Cliente > 0 && (g.Acconto_Pagato || 0) >= g.Costo_Cliente);
          const targetVal = !isGradingPaid;
          return { 
            ...g, 
            Pagato_Singolarmente: targetVal, 
            Pagamento_Posticipato: targetVal ? false : g.Pagamento_Posticipato,
            Acconto_Pagato: targetVal ? g.Costo_Cliente : 0 
          };
        }
        return g;
      })
    );
    setIsEditingItems(true);
  };

  const handleRemoveGradingItem = (cardId: string) => {
    setActiveGradingItems((prev) => prev.filter((g) => g.ID_Oggetto_Grading !== cardId));
    setIsEditingItems(true);
  };

  const handleSaveMultipleWizardItems = (itemsToSave: { name: string; service: string; photoUrls: string[] }[]) => {
    const newGradingItems: GradingItem[] = itemsToSave.map(item => ({
      ID_Oggetto_Grading: `GRADING_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      Nome_Carta: item.name,
      ID_Carrello: selectedCart!.ID_Carrello,
      Tipologia_Servizio: item.service,
      Link_Foto: item.photoUrls.join(','),
      Costo_Cliente: 0,
      Costo_Acquisto: 0,
      Margine_Lordo: 0,
      Pagato_Singolarmente: false,
      Acconto_Pagato: 0,
    }));
    setActiveGradingItems(prev => [...prev, ...newGradingItems]);
    setIsEditingItems(true);
  };


  // Auto-save effect
  useEffect(() => {
    if (isEditingItems && selectedCart) {
      const timeoutId = setTimeout(() => {
        handleSaveActiveCart(true);
      }, 2000); // 2000ms debounce
      return () => clearTimeout(timeoutId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditingItems, activeCartItems, activeGradingItems, activeClientName, activeClientPhone, activeClientEmail, activeClientAddress, activeClientTag, activeClientNote, activeClientNoteInterne, activeClientStrike, activeClientCattivoData]);

  // Save Cart state to Sheets (Doppio Bivio A: Solo Visualizzazione / Salva)
  const handleSaveActiveCart = async (silent: boolean = false) => {
    if (!selectedCart) return;

    if (!activeClientName.trim()) {
      if (!silent) alert("Il nome cliente non può essere vuoto.");
      return;
    }

    const updatedCart: Carrello = {
      ...selectedCart,
      Nome_Cliente: activeClientName.trim(),
      Telefono: activeClientPhone.trim(),
      Email: activeClientEmail.trim(),
      Indirizzo_Spedizione: activeClientAddress.trim(),
      Tag: activeClientTag.trim(),
      Note: activeClientNote.trim(),
      Note_Interne: activeClientNoteInterne.trim(),
      Strike: activeClientStrike,
      Cattivo_Data: activeClientCattivoData,
      Totale_Pagato: cartTotals.totalePagato,
    };

    try {
      if (!silent) {
        setIsEditingClient(false);
      }
      await onSaveCart(updatedCart, activeCartItems, activeGradingItems);
      
      if (!silent) {
        setIsEditingItems(false);
      }
    } catch (err: any) {
      if (!silent) {
        alert("Errore nel salvataggio: " + err.message);
      } else {
        console.error("Autosave error:", err);
      }
    }
  };

  // Start shipment flow (Doppio Bivio B: Procedi a Spedizione)
  const handleStartShipment = () => {
    const totalItemsCount = activeCartItems.length + activeGradingItems.length;
    if (totalItemsCount === 0) {
      alert("Impossibile spedire un carrello vuoto.");
      return;
    }
    const totalSelectedCount = selectedItemIndexes.length + selectedGradingIds.length;
    if (totalSelectedCount === 0) {
      alert("Seleziona almeno un articolo o una carta da spedire.");
      return;
    }

    // REQUIREMENT: "non puoi permettere che un oggetto venga spedito prima che venga pagato"
    const totalCartValue = activeCartItems.reduce((acc, curr) => acc + (curr.Prezzo_Registrato || 0), 0) + 
                           activeGradingItems.reduce((acc, curr) => acc + (curr.Costo_Cliente || 0), 0);
    const cartIsFullyPaid = selectedCart ? (selectedCart.Totale_Pagato >= totalCartValue) : false;

    if (!cartIsFullyPaid) {
      const itemStates = getCartItemPaidStates(activeCartItems, activeGradingItems, selectedCart?.Totale_Pagato);

      const hasUnpaidSelectedItems = selectedItemIndexes.some((idx) => {
        const state = itemStates[idx];
        return !state?.isPaid;
      });

      const hasUnpaidSelectedGrading = selectedGradingIds.some((id) => {
        const gIdx = activeGradingItems.findIndex(g => g.ID_Oggetto_Grading === id);
        if (gIdx === -1) return false;
        const state = itemStates[activeCartItems.length + gIdx];
        return !state?.isPaid;
      });

      if (hasUnpaidSelectedItems || hasUnpaidSelectedGrading) {
        alert("Attenzione! Non puoi spedire oggetti non ancora pagati. Assicurati che l'intero carrello sia pagato, oppure che i singoli articoli da spedire risultino saldati.");
        return;
      }
    }

    // Check if any selected items are out of stock in warehouse before proceeding
    let missingItems: string[] = [];
    selectedItemIndexes.forEach((idx) => {
      const cartItem = activeCartItems[idx];
      if (!cartItem) return;
      const warehouseItem = magazzino.find((m) => m.ID_Oggetto === cartItem.ID_Oggetto);
      if (!warehouseItem || warehouseItem.Quantità_Disponibile <= 0) {
        const name = warehouseItem ? warehouseItem.Nome : `ID: ${cartItem.ID_Oggetto}`;
        if (!missingItems.includes(name)) missingItems.push(name);
      }
    });

    if (missingItems.length > 0) {
      alert(`Attenzione! Alcuni articoli selezionati sono esauriti in magazzino: ${missingItems.join(", ")}. Puoi procedere, ma controlla le giacenze.`);
    }

    setShipmentPhotos([]);
    setTrackingNumber("");
    setShowShipmentModal(true);
  };

  // Handle Photo selection (appends to previous selections to support multiple sessions/types of upload)
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setShipmentPhotos((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  // Confirm Shipment Action (saves files to Drive, updates sheets)
  const handleConfirmShipment = async (e: React.FormEvent, shipmentType: string, trackingNum: string, shippingCost?: number) => {
    e.preventDefault();
    const isHandDelivery = shipmentType === "Consegna a mano" || shipmentType === "Ritiro in Sede";
    if (!isHandDelivery && shipmentPhotos.length === 0) {
      alert("È obbligatorio caricare almeno una foto per il controllo qualità, oppure spunta \x27Consegna a mano\x27.");
      return;
    }

    setShipmentLoading(true);
    try {
      // First save current cart details if there were changes, to make sure DB is synced
      const updatedCart: Carrello = {
        ...selectedCart!,
        Totale_Pagato: cartTotals.totalePagato,
      };
      await onSaveCart(updatedCart, activeCartItems, activeGradingItems);

      const effectiveShipmentType = shipmentType || (isHandDelivery ? "Consegna a mano" : "Corriere");
      // Trigger the backend shipment workflow
      await onProceedToShipment(selectedCartId!, effectiveShipmentType, trackingNum, selectedItemIndexes, selectedGradingIds, shipmentPhotos, shippingCost, activeCartItems, activeGradingItems);

      setShowShipmentModal(false);
      setSelectedCartId(null);
    } catch (err: any) {
      alert("Errore durante l'invio della spedizione: " + err.message);
    } finally {
      setShipmentLoading(false);
    }
  };

  // Mark a shipment as "Delivered / Completato"
  const handleDeliverShipment = async (spedizioneId: string, cartId: string) => {
    try {
      await onUpdateShipmentStatus(spedizioneId, cartId, 'Consegnato');
      if (selectedCartId === cartId) {
        setSelectedCartId(null);
      }
    } catch (err: any) {
      alert("Errore durante il completamento della consegna: " + err.message);
    }
  };

  // Find shipment record of selected cart
  const selectedCartShipment = useMemo(() => {
    if (!selectedCartId) return null;
    return spedizioni.find((s) => s.ID_Carrello === selectedCartId) || null;
  }, [spedizioni, selectedCartId]);

  // Find all shipments (including partial splits) generated from the selected cart
  const relatedShipments = useMemo(() => {
    if (!selectedCartId) return [];
    return spedizioni.filter(
      (s) => s.ID_Carrello === selectedCartId || s.ID_Carrello.startsWith(selectedCartId + "-S-")
    );
  }, [spedizioni, selectedCartId]);

  // Filter only ongoing shipments (exclude "Consegnato" and "Reso Completato")
  const ongoingRelatedShipments = useMemo(() => {
    return relatedShipments.filter((s) => s.Stato_Consegna !== "Consegnato" && s.Stato_Consegna !== "Reso Completato");
  }, [relatedShipments]);

  // Handle redirection to a specific shipment's details in the closed carts / shipments tab

  // Handle redirection from closed carts back to the live cart of the same client
  const handleGoToLiveCart = async (cart: import("../../types").Carrello) => {
    if (onNavigate) {
      // Find open cart with the same client name (case insensitive)
      const targetName = (cart.Nome_Cliente || "").trim().toLowerCase();
      const openCart = carrelli.find(c => {
        const cName = (c.Nome_Cliente || "").trim().toLowerCase();
        const stato = (c.Stato_Carrello || "").trim();
        return cName === targetName && 
          stato !== "Spedizione_Ricevuta_da_Consegnare" && 
          stato !== "Completato";
      });
      
      const setter = onSelectLiveCartId || setSelectedCartId;
      
      if (openCart && setter) {
        setter(openCart.ID_Carrello);
        onNavigate("carrelli");
      } else {
        // Automatically create a new cart since none is open
        const trimmedName = (cart.Nome_Cliente || "").trim();
        const newCartId = `CART-${Date.now().toString().slice(-6)}`;
        const newCart: import("../../types").Carrello = {
          ID_Carrello: newCartId,
          Nome_Cliente: trimmedName,
          Stato_Carrello: "Aperto",
          Totale_Pagato: 0,
          Telefono: cart.Telefono || "",
          Email: cart.Email || "",
          Indirizzo_Spedizione: cart.Indirizzo_Spedizione || "",
          Tag: cart.Tag || "",
        };
        try {
          await onSaveCart(newCart, []);
          if (setter) setter(newCartId);
          onNavigate("carrelli");
        } catch (err: any) {
          alert("Nessun carrello attivo e impossibile crearne uno nuovo: " + err.message);
        }
      }
    }
  };

  const handleGoToShipment = (shipment: Spedizione) => {
    if (onNavigate) {
      onNavigate("spedizioni");
    }
  };


  return {
    activeCartItems,
    activeClientAddress,
    activeClientCattivoData,
    activeClientEmail,
    activeClientName,
    activeClientNote,
    activeClientNoteInterne,
    activeClientPhone,
    activeClientStrike,
    activeClientTag,
    activeGradingItems,
    carrelli,
    cartIdToDelete,
    cartTotals,
    clientNameValidation,
    copiedField,
    customGlobalTags,
    deleteConfirmText,
    dettagli,
    emptyCartsOnly,
    filterProduct,
    filteredCarts,
    groupedCartItems,
    gruppiGrading,
    handleAccontoChangeForGroup,
    handleAccontoChangeGradingItem,
    handleAddItemToCart,
    handleApplyFormProposals,
    handleConfirmShipment,
    handleCopy,
    handleCreateCart,
    handleDecrementQuantity,
    handleGoToLiveCart,
    handleGoToShipment,
    handleIncrementQuantity,
    handlePriceChangeForGroup,
    handleRemoveGradingItem,
    handleRemoveGroupFromCart,
    handleReopenCart,
    handleSaveActiveCart,
    handleSaveMultipleWizardItems,
    handleSelectCart,
    handleSelectQuantityForGroup,
    handleSplitGroupItem,
    handleStartShipment,
    handleTogglePaidForGroup,
    handleTogglePaidGradingItem,
    handleTogglePaymentTag,
    handleTogglePosticipatoForGroup,
    handleTogglePosticipatoGradingItem,
    handleToggleSelectForGroup,
    handleToggleShipmentTag,
    handleUpdateCartAddress,
    handleUpdateCartNote,
    handleUpdateCartPhone,
    handleUpdateCartLastMessage,
    handleUpdateCartStrikes,
    handleUpdateCartTag,
    hasObjectsOnly,
    importReport,
    isAddingGrading,
    isCreating,
    isDeletingProcess,
    isEditable,
    isEditingClient,
    isEditingItems,
    isImportFormModalOpen,
    isPayPalSyncModalOpen,
    isShipped,
    listinoGrading,
    loyaltyTierFilter,
    magazzino,
    newClientName,
    oggettiInGrading,
    readyForShippingOnly,
    relatedShipments,
    reservedInOtherCarts,
    search,
    selectedCart,
    selectedCartId,
    selectedCartShipment,
    selectedGradingIds,
    selectedItemIndexes,
    setActiveClientAddress,
    setActiveClientCattivoData,
    setActiveClientEmail,
    setActiveClientName,
    setActiveClientNote,
    setActiveClientNoteInterne,
    setActiveClientPhone,
    setActiveClientStrike,
    setActiveClientTag,
    setCartIdToDelete,
    setCustomGlobalTags,
    setDeleteConfirmText,
    setEmptyCartsOnly,
    setFilterProduct,
    setHasObjectsOnly,
    setImportReport,
    setIsAddingGrading,
    setIsCreating,
    setIsDeletingProcess,
    setIsEditingClient,
    setIsEditingItems,
    setIsImportFormModalOpen,
    setIsPayPalSyncModalOpen,
    setLoyaltyTierFilter,
    setNewClientName,
    setReadyForShippingOnly,
    setSearch,
    setSelectedCartId,
    setSelectedGradingIds,
    setSelectedItemIndexes,
    setShowShipmentModal,
    setSortOption,
    setStatusFilter,
    setStrikeFilter,
    setTagFilter,
    setUnpaidOnly,
    setViewedGradingStatusId,
    shipmentLoading,
    showShipmentModal,
    sortOption,
    statusFilter,
    strikeFilter,
    tagFilter,
    unpaidOnly,
    userRole,
    viewedGradingStatusId,
  };
}
