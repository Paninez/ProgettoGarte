import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Mail,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  DollarSign,
  Trash2,
  Check,
  RotateCcw,
  Sparkles,
  Search,
  Package,
  Tag,
  Euro,
  Calculator,
  UserCheck
} from "lucide-react";
import { Carrello, DettaglioCarrello, OggettoMagazzino, GradingItem } from "../../types";
import { getCartItemPaidStates } from "./carrelliUtils";
import {
  PayPalEmailPayment,
  searchPayPalEmails,
  matchPaymentsWithCarts,
  markGmailMessageProcessed,
  saveProcessedEmailRecord
} from "../../lib/paypalGmail";
import { googleSignIn } from "../../lib/firebase";

export interface SelectedItemAllocation {
  key: string;
  itemId: string;
  itemType: "dettaglio" | "grading";
  itemIndex: number;
  itemIndices?: number[];
  itemName: string;
  itemPrice: number;
  currentAcconto: number;
  allocatedAmount: number;
  markAsPaid: boolean;
  quantity?: number;
}

export interface GroupedCartItem {
  key: string;
  itemId: string;
  itemType: "dettaglio" | "grading";
  itemIndices: number[];
  itemName: string;
  rawName: string;
  itemPrice: number;
  currentAcconto: number;
  quantity: number;
  isAlreadyPaid: boolean;
}

export const getGroupedCartItemsForCart = (
  cartDettagli: DettaglioCarrello[],
  cartGrading: GradingItem[],
  magazzino: OggettoMagazzino[]
): GroupedCartItem[] => {
  const result: GroupedCartItem[] = [];

  // 1. Group Dettagli by ID_Oggetto
  const dettaglioGroups: Record<string, { items: DettaglioCarrello[]; indices: number[] }> = {};
  cartDettagli.forEach((d, idx) => {
    const id = d.ID_Oggetto || `dettaglio_unnamed_${idx}`;
    if (!dettaglioGroups[id]) {
      dettaglioGroups[id] = { items: [], indices: [] };
    }
    dettaglioGroups[id].items.push(d);
    dettaglioGroups[id].indices.push(idx);
  });

  Object.entries(dettaglioGroups).forEach(([id, group]) => {
    const magItem = magazzino.find((m) => m.ID_Oggetto === id);
    const rawName = magItem ? magItem.Nome : id;
    const qty = group.items.length;
    const itemName = qty > 1 ? `x${qty} ${rawName}` : rawName;
    const itemPrice = group.items.reduce((sum, item) => sum + (item.Prezzo_Registrato || 0), 0);
    const currentAcconto = group.items.reduce((sum, item) => sum + (item.Acconto_Pagato || 0), 0);
    const isAlreadyPaid = group.items.every(
      (item) => item.Pagato_Singolarmente || (item.Prezzo_Registrato > 0 && (item.Acconto_Pagato || 0) >= item.Prezzo_Registrato)
    ) || (itemPrice > 0 && currentAcconto >= itemPrice);

    result.push({
      key: `dettaglio:${id}`,
      itemId: id,
      itemType: "dettaglio",
      itemIndices: group.indices,
      itemName,
      rawName,
      itemPrice,
      currentAcconto,
      quantity: qty,
      isAlreadyPaid
    });
  });

  // 2. Group Grading by ID_Oggetto_Grading
  const gradingGroups: Record<string, { items: GradingItem[]; indices: number[] }> = {};
  cartGrading.forEach((g, idx) => {
    const id = g.ID_Oggetto_Grading || `grading_unnamed_${idx}`;
    if (!gradingGroups[id]) {
      gradingGroups[id] = { items: [], indices: [] };
    }
    gradingGroups[id].items.push(g);
    gradingGroups[id].indices.push(idx);
  });

  Object.entries(gradingGroups).forEach(([id, group]) => {
    const first = group.items[0];
    const rawName = first.Nome_Carta || "Carta Grading";
    const qty = group.items.length;
    const labelService = first.Tipologia_Servizio ? ` (${first.Tipologia_Servizio})` : "";
    const itemName = qty > 1 ? `x${qty} ${rawName}${labelService}` : `${rawName}${labelService}`;
    const itemPrice = group.items.reduce((sum, item) => sum + (item.Costo_Cliente || 0), 0);
    const currentAcconto = group.items.reduce((sum, item) => sum + (item.Acconto_Pagato || 0), 0);
    const isAlreadyPaid = group.items.every(
      (item) => item.Pagato_Singolarmente || (item.Costo_Cliente > 0 && (item.Acconto_Pagato || 0) >= item.Costo_Cliente)
    ) || (itemPrice > 0 && currentAcconto >= itemPrice);

    result.push({
      key: `grading:${id}`,
      itemId: id,
      itemType: "grading",
      itemIndices: group.indices,
      itemName,
      rawName,
      itemPrice,
      currentAcconto,
      quantity: qty,
      isAlreadyPaid
    });
  });

  return result;
};

interface PayPalSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  carts: Carrello[];
  dettagli?: DettaglioCarrello[];
  magazzino?: OggettoMagazzino[];
  oggettiInGrading?: GradingItem[];
  token: string | null;
  onUpdateCartPayment: (
    cartId: string,
    addedAmount: number,
    transactionNote?: string,
    itemPaymentInfo?: any
  ) => Promise<void>;
  addSafetyLog: (msg: string) => void;
}

interface CartSearchComboboxProps {
  carts: Carrello[];
  dettagli: DettaglioCarrello[];
  oggettiInGrading: GradingItem[];
  selectedCartId: string;
  onSelectCart: (cartId: string) => void;
  disabled?: boolean;
}

const CartSearchCombobox: React.FC<CartSearchComboboxProps> = ({
  carts,
  dettagli,
  oggettiInGrading,
  selectedCartId,
  onSelectCart,
  disabled
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const selectedCart = carts.find((c) => c.ID_Carrello === selectedCartId);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (selectedCart) {
      setSearchTerm(selectedCart.Nome_Cliente ? `${selectedCart.Nome_Cliente} (${selectedCart.ID_Carrello})` : selectedCart.ID_Carrello);
    } else if (!selectedCartId) {
      setSearchTerm("");
    }
  }, [selectedCartId, selectedCart]);

  const getCartRemaining = (cartId: string) => {
    const cDettagli = dettagli.filter((d) => d.ID_Carrello === cartId);
    const cGrading = oggettiInGrading.filter((g) => g.ID_Carrello === cartId);
    const totalCost =
      cDettagli.reduce((sum, d) => sum + (d.Prezzo_Registrato || 0), 0) +
      cGrading.reduce((sum, g) => sum + (g.Costo_Cliente || 0), 0);
    const targetCart = carts.find((c) => c.ID_Carrello === cartId);
    const paid = targetCart ? targetCart.Totale_Pagato || 0 : 0;
    return Math.max(0, totalCost - paid);
  };

  const filteredCarts = carts.filter((c) => {
    if (!searchTerm.trim()) return true;
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
    const searchTerms = normalizeString(searchTerm).split(" ").filter(Boolean);
    const normName = normalizeString(c.Nome_Cliente);
    const normId = normalizeString(c.ID_Carrello);
    return searchTerms.every(term => normName.includes(term) || normId.includes(term));
  });

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div className="relative flex items-center">
        <input
          type="text"
          disabled={disabled}
          placeholder="Digita il nome del cliente o codice carrello..."
          value={searchTerm}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
          }}
          className="w-full pl-9 pr-8 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60 placeholder:text-slate-400"
        />
        <Search className="w-4 h-4 text-slate-400 absolute left-2.5 pointer-events-none" />
        {searchTerm && !disabled && (
          <button
            type="button"
            onClick={() => {
              setSearchTerm("");
              onSelectCart("");
              setIsOpen(true);
            }}
            className="absolute right-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            title="Svuota selezione"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {isOpen && !disabled && (
        <div className="absolute z-30 mt-1 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700/60 text-xs">
          {filteredCarts.length === 0 ? (
            <div className="p-3 text-slate-400 italic text-center">
              Nessun carrello trovato per "{searchTerm}"
            </div>
          ) : (
            filteredCarts.map((c) => {
              const remaining = getCartRemaining(c.ID_Carrello);
              const isSelected = c.ID_Carrello === selectedCartId;

              return (
                <button
                  key={c.ID_Carrello}
                  type="button"
                  onClick={() => {
                    onSelectCart(c.ID_Carrello);
                    setSearchTerm(c.Nome_Cliente ? `${c.Nome_Cliente} (${c.ID_Carrello})` : c.ID_Carrello);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left p-2.5 flex items-center justify-between gap-2 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition cursor-pointer ${
                    isSelected ? "bg-indigo-50/80 dark:bg-indigo-950/80 font-bold" : ""
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">
                      {c.Nome_Cliente || "Senza Nome"}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      ID: {c.ID_Carrello}
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-slate-400 block">Da pagare ancora</span>
                    <span
                      className={`font-mono font-bold ${
                        remaining > 0
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-emerald-600 dark:text-emerald-400"
                      }`}
                    >
                      € {remaining.toFixed(2)}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export const PayPalSyncModal: React.FC<PayPalSyncModalProps> = ({
  isOpen,
  onClose,
  carts,
  dettagli = [],
  magazzino = [],
  oggettiInGrading = [],
  token: initialToken,
  onUpdateCartPayment,
  addSafetyLog
}) => {
  const [activeToken, setActiveToken] = useState<string | null>(initialToken);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('subject:"Hai ricevuto denaro"');
  const [payments, setPayments] = useState<PayPalEmailPayment[]>([]);
  const [selectedMatches, setSelectedMatches] = useState<Record<string, string>>({}); // emailMsgId -> cartId
  const [selectedItems, setSelectedItems] = useState<Record<string, SelectedItemAllocation[]>>({}); // emailMsgId -> SelectedItemAllocation[]
  const [approvedIds, setApprovedIds] = useState<Set<string>>(new Set());
  const [discardedIds, setDiscardedIds] = useState<Set<string>>(new Set());
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [processingBatch, setProcessingBatch] = useState(false);
  const [filterText, setFilterText] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "discarded" | "duplicate">("all");

  const autoDistributeAmount = (
    paymentAmount: number,
    allocs: SelectedItemAllocation[]
  ): SelectedItemAllocation[] => {
    let remaining = paymentAmount;
    return allocs.map((alloc) => {
      const remainingCost = Math.max(0, alloc.itemPrice - alloc.currentAcconto);
      let autoAmount = alloc.itemPrice > 0 ? Math.min(remaining, remainingCost) : remaining;
      if (autoAmount < 0) autoAmount = 0;
      remaining = Math.max(0, remaining - autoAmount);

      const totalAcconto = alloc.currentAcconto + autoAmount;
      const isFullyPaid = alloc.itemPrice > 0 ? totalAcconto >= alloc.itemPrice : true;

      return {
        ...alloc,
        allocatedAmount: parseFloat(autoAmount.toFixed(2)),
        markAsPaid: isFullyPaid
      };
    });
  };

  if (!isOpen) return null;

  const handleGoogleAuth = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await googleSignIn();
      if (res && res.accessToken) {
        setActiveToken(res.accessToken);
        addSafetyLog("Autenticazione Google Workspace completata con successo.");
      }
    } catch (err: any) {
      console.error("Errore autenticazione Google:", err);
      setErrorMsg("Impossibile completare l'accesso con Google. Riprova.");
    } finally {
      setLoading(false);
    }
  };

  const buildInitialAllocationsForCart = (cartId: string, paymentAmount: number): SelectedItemAllocation[] => {
    if (!cartId) return [];
    const cartDettagli = dettagli.filter((d) => d.ID_Carrello === cartId);
    const cartGrading = oggettiInGrading.filter((g) => g.ID_Carrello === cartId);
    const groupedItems = getGroupedCartItemsForCart(cartDettagli, cartGrading, magazzino);

    const unpaidAllocations: SelectedItemAllocation[] = groupedItems
      .filter((item) => !item.isAlreadyPaid)
      .map((item) => ({
        key: item.key,
        itemId: item.itemId,
        itemType: item.itemType,
        itemIndex: item.itemIndices[0],
        itemIndices: item.itemIndices,
        itemName: item.itemName,
        itemPrice: item.itemPrice,
        currentAcconto: item.currentAcconto,
        allocatedAmount: 0,
        markAsPaid: false,
        quantity: item.quantity
      }));

    if (unpaidAllocations.length > 0) {
      return autoDistributeAmount(paymentAmount, unpaidAllocations);
    }
    return [];
  };

  const handleFetchEmails = async () => {
    if (!activeToken) {
      setErrorMsg("Effettua prima l'accesso con Google per leggere le email di Gmail.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      addSafetyLog(`Avvio scansione Gmail con query: ${searchQuery}`);
      const rawPayments = await searchPayPalEmails(activeToken, searchQuery, 20);

      if (rawPayments.length === 0) {
        setPayments([]);
        setErrorMsg("Nessuna email di pagamento PayPal trovata con i filtri inseriti.");
        addSafetyLog("Scansione Gmail: nessuna email PayPal trovata.");
      } else {
        const matched = matchPaymentsWithCarts(rawPayments, carts);
        setPayments(matched);

        // Pre-select matches in dropdown state and auto-allocate items
        const initialSelections: Record<string, string> = {};
        const initialItems: Record<string, SelectedItemAllocation[]> = {};

        matched.forEach((p) => {
          if (p.matchedCartId) {
            initialSelections[p.id] = p.matchedCartId;
            const allocs = buildInitialAllocationsForCart(p.matchedCartId, p.amount);
            if (allocs.length > 0) {
              initialItems[p.id] = allocs;
            }
          }
        });
        setSelectedMatches(initialSelections);
        setSelectedItems(initialItems);

        addSafetyLog(`Scansione Gmail completata: trovate ${matched.length} email PayPal.`);
      }
    } catch (err: any) {
      console.error("Errore scansione Gmail PayPal:", err);
      setErrorMsg(`Errore nella lettura delle email: ${err.message || "Permessi Gmail mancanti o scaduti."}`);
      addSafetyLog(`ERRORE scansione Gmail: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCartChange = (paymentId: string, cartId: string) => {
    setSelectedMatches((prev) => ({
      ...prev,
      [paymentId]: cartId
    }));

    const payment = payments.find((p) => p.id === paymentId);
    const paymentAmount = payment ? payment.amount : 0;
    const allocs = buildInitialAllocationsForCart(cartId, paymentAmount);

    setSelectedItems((prev) => {
      const next = { ...prev };
      if (allocs.length > 0) {
        next[paymentId] = allocs;
      } else {
        delete next[paymentId];
      }
      return next;
    });
  };

  // Approve a single payment 1-to-1
  const handleApproveSingle = async (payment: PayPalEmailPayment) => {
    const cartId = selectedMatches[payment.id];
    if (!cartId) {
      setErrorMsg(`Seleziona un carrello di destinazione prima di approvare il pagamento di €${payment.amount.toFixed(2)}.`);
      return;
    }

    const targetCart = carts.find((c) => c.ID_Carrello === cartId);
    const cartName = targetCart ? targetCart.Nome_Cliente : cartId;
    const allocations = selectedItems[payment.id] || [];
    const itemNamesStr = allocations.map((a) => `${a.itemName} (€${a.allocatedAmount.toFixed(2)})`).join(", ");

    setProcessingId(payment.id);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const noteText = `Pagamento PayPal ${payment.transactionId ? `(Tx: ${payment.transactionId})` : ""} del ${
        payment.dateStr
      } da ${payment.payerName || payment.payerEmail || "Cliente"}${
        allocations.length > 0 ? ` - Articoli (${allocations.length}): ${itemNamesStr}` : ""
      }`;

      await onUpdateCartPayment(
        cartId,
        payment.amount,
        noteText,
        allocations.length > 0
          ? allocations.map((a) => ({
              itemId: a.itemId,
              itemType: a.itemType,
              itemIndex: a.itemIndex,
              markItemAsPaid: a.markAsPaid,
              itemName: a.itemName,
              amount: a.allocatedAmount
            }))
          : undefined
      );

      // Save processed record locally to prevent duplicates in future
      saveProcessedEmailRecord(payment.id, payment.transactionId);

      // Mark Gmail message processed (remove UNREAD)
      if (activeToken) {
        await markGmailMessageProcessed(activeToken, payment.id).catch((e) =>
          console.warn("Impossibile rimuovere etichetta da Gmail:", e)
        );
      }

      setApprovedIds((prev) => new Set(prev).add(payment.id));
      setSuccessMsg(`Pagamento di €${payment.amount.toFixed(2)} registrato con successo sul carrello ${cartId}!`);
      addSafetyLog(
        `Approvato pagamento PayPal di €${payment.amount.toFixed(2)} per carrello ${cartId}${
          allocations.length > 0 ? ` (Articoli: ${itemNamesStr})` : ""
        }.`
      );
    } catch (err: any) {
      console.error(`Errore registrazione pagamento per carrello ${cartId}:`, err);
      setErrorMsg(`Errore durante la registrazione: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  // Discard a single payment proposal
  const handleDiscardSingle = (paymentId: string) => {
    setDiscardedIds((prev) => new Set(prev).add(paymentId));
  };

  // Restore a discarded payment proposal
  const handleRestoreSingle = (paymentId: string) => {
    setDiscardedIds((prev) => {
      const next = new Set(prev);
      next.delete(paymentId);
      return next;
    });
  };

  // Batch approve all pending matched items
  const handleBatchApproveValid = async () => {
    const pendingValid = payments.filter(
      (p) =>
        selectedMatches[p.id] &&
        !p.isAlreadyProcessed &&
        !approvedIds.has(p.id) &&
        !discardedIds.has(p.id)
    );

    if (pendingValid.length === 0) {
      setErrorMsg("Nessun pagamento pronto e associato da approvare.");
      return;
    }

    setProcessingBatch(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    let count = 0;
    for (const payment of pendingValid) {
      const cartId = selectedMatches[payment.id];
      if (!cartId) continue;
      const allocations = selectedItems[payment.id] || [];
      const itemNamesStr = allocations.map((a) => `${a.itemName} (€${a.allocatedAmount.toFixed(2)})`).join(", ");

      try {
        const noteText = `Pagamento PayPal ${payment.transactionId ? `(Tx: ${payment.transactionId})` : ""} del ${
          payment.dateStr
        } da ${payment.payerName || payment.payerEmail || "Cliente"}${
          allocations.length > 0 ? ` - Articoli (${allocations.length}): ${itemNamesStr}` : ""
        }`;

        await onUpdateCartPayment(
          cartId,
          payment.amount,
          noteText,
          allocations.length > 0
            ? allocations.map((a) => ({
                itemId: a.itemId,
                itemType: a.itemType,
                itemIndex: a.itemIndex,
                markItemAsPaid: a.markAsPaid,
                itemName: a.itemName,
                amount: a.allocatedAmount
              }))
            : undefined
        );

        saveProcessedEmailRecord(payment.id, payment.transactionId);

        if (activeToken) {
          await markGmailMessageProcessed(activeToken, payment.id).catch((e) =>
            console.warn("Mark Gmail processed error:", e)
          );
        }

        setApprovedIds((prev) => new Set(prev).add(payment.id));
        count++;
      } catch (e: any) {
        console.error("Batch approve single error:", payment.id, e);
      }
    }

    setProcessingBatch(false);
    if (count > 0) {
      setSuccessMsg(`Approvati e registrati con successo ${count} pagamenti PayPal!`);
      addSafetyLog(`Approvati in blocco ${count} pagamenti PayPal.`);
    }
  };

  // Filter payments list for viewing
  const filteredPayments = payments.filter((p) => {
    const isApproved = approvedIds.has(p.id);
    const isDiscarded = discardedIds.has(p.id);
    const isDup = p.isAlreadyProcessed;
    const isPending = !isApproved && !isDiscarded && !isDup;

    if (statusFilter === "pending" && !isPending) return false;
    if (statusFilter === "approved" && !isApproved) return false;
    if (statusFilter === "discarded" && !isDiscarded) return false;
    if (statusFilter === "duplicate" && !isDup) return false;

    if (filterText.trim()) {
      const txt = filterText.toLowerCase();
      const matchName = p.payerName.toLowerCase().includes(txt);
      const matchEmail = p.payerEmail.toLowerCase().includes(txt);
      const matchTx = p.transactionId.toLowerCase().includes(txt);
      const matchNote = p.note.toLowerCase().includes(txt);
      const cartId = selectedMatches[p.id] || "";
      const matchCart = cartId.toLowerCase().includes(txt);
      const allocations = selectedItems[p.id] || [];
      const matchItem = allocations.some((a) => (a.itemName || "").toLowerCase().includes(txt));
      return matchName || matchEmail || matchTx || matchNote || matchCart || matchItem;
    }

    return true;
  });

  const pendingCount = payments.filter(
    (p) => !approvedIds.has(p.id) && !discardedIds.has(p.id) && !p.isAlreadyProcessed && selectedMatches[p.id]
  ).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <Mail className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 leading-snug">
                Verifica & Riconciliazione Pagamenti PayPal da Gmail
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Esamina ciascun pagamento trovato, verifica l'importo incassato, seleziona il carrello o l'articolo specifico ed approva le modifiche.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Auth Banner if no token */}
          {!activeToken ? (
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-amber-900 dark:text-amber-200 text-sm">
                    Autenticazione Google Workspace Richiesta
                  </h4>
                  <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                    Autorizza l'accesso in sola lettura a Gmail per leggere le notifiche PayPal di pagamento ed evitare inserimenti duplicati.
                  </p>
                </div>
              </div>

              <button
                onClick={handleGoogleAuth}
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-slate-700 font-medium text-xs rounded-lg border border-slate-300 shadow-sm hover:bg-slate-50 focus:outline-none transition shrink-0 cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                </svg>
                Accedi con Google
              </button>
            </div>
          ) : null}

          {/* Search & Fetch Bar */}
          <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder='Filtro ricerca Gmail (es. subject:"Hai ricevuto denaro")'
                className="w-full pl-3 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <button
              onClick={handleFetchEmails}
              disabled={loading || !activeToken}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-sm transition disabled:opacity-50 shrink-0 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Scansiona Email Gmail
            </button>
          </div>

          {/* Feedback messages */}
          {errorMsg && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-xl text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Proposal List Section */}
          {payments.length > 0 && (
            <div className="space-y-4">
              {/* Toolbar & Filter Options */}
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 mr-1">
                    Filtra Stato:
                  </span>
                  <button
                    onClick={() => setStatusFilter("all")}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition cursor-pointer ${
                      statusFilter === "all"
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    Tutti ({payments.length})
                  </button>
                  <button
                    onClick={() => setStatusFilter("pending")}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition cursor-pointer ${
                      statusFilter === "pending"
                        ? "bg-amber-600 text-white"
                        : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    Da Riconciliare ({payments.filter((p) => !approvedIds.has(p.id) && !discardedIds.has(p.id) && !p.isAlreadyProcessed).length})
                  </button>
                  <button
                    onClick={() => setStatusFilter("approved")}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition cursor-pointer ${
                      statusFilter === "approved"
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    Approvati ({approvedIds.size})
                  </button>
                  <button
                    onClick={() => setStatusFilter("discarded")}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition cursor-pointer ${
                      statusFilter === "discarded"
                        ? "bg-slate-600 text-white"
                        : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    Scartati ({discardedIds.size})
                  </button>
                  <button
                    onClick={() => setStatusFilter("duplicate")}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition cursor-pointer ${
                      statusFilter === "duplicate"
                        ? "bg-purple-600 text-white"
                        : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    Duplicati ({payments.filter((p) => p.isAlreadyProcessed).length})
                  </button>
                </div>

                <div className="relative min-w-[180px]">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={filterText}
                    onChange={(e) => setFilterText(e.target.value)}
                    placeholder="Cerca nome, tx, articolo..."
                    className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
                  />
                </div>
              </div>

              {/* Batch Action Bar */}
              {pendingCount > 0 && (
                <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 rounded-xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span className="text-xs font-medium text-indigo-900 dark:text-indigo-200">
                      Ci sono <strong>{pendingCount}</strong> pagamenti associati pronti per la registrazione.
                    </span>
                  </div>
                  <button
                    onClick={handleBatchApproveValid}
                    disabled={processingBatch}
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow transition disabled:opacity-50 shrink-0 cursor-pointer"
                  >
                    {processingBatch ? "Elaborazione..." : `Approva Tutti i Pronti (${pendingCount})`}
                  </button>
                </div>
              )}

              {/* Cards List for 1-to-1 proposal review */}
              <div className="space-y-4">
                {filteredPayments.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-400 italic bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                    Nessun pagamento corrisponde ai filtri selezionati.
                  </div>
                ) : (
                  filteredPayments.map((p) => {
                    const isApproved = approvedIds.has(p.id);
                    const isDiscarded = discardedIds.has(p.id);
                    const isDuplicate = p.isAlreadyProcessed;
                    const isProcessingThis = processingId === p.id;
                    const currentCartId = selectedMatches[p.id] || "";
                    const targetCart = carts.find((c) => c.ID_Carrello === currentCartId);

                    // Filter items for targetCart
                    const cartDettagli = targetCart
                      ? dettagli.filter((d) => d.ID_Carrello === targetCart.ID_Carrello)
                      : [];
                    const cartGrading = targetCart
                      ? oggettiInGrading.filter((g) => g.ID_Carrello === targetCart.ID_Carrello)
                      : [];

                    // Calculate cart totals
                    const cartTotalCost =
                      cartDettagli.reduce((sum, d) => sum + (d.Prezzo_Registrato || 0), 0) +
                      cartGrading.reduce((sum, g) => sum + (g.Costo_Cliente || 0), 0);
                    const cartCurrentPaid = targetCart ? targetCart.Totale_Pagato || 0 : 0;
                    const cartNewPaid = cartCurrentPaid + p.amount;
                    const cartRemainingAfter = Math.max(0, cartTotalCost - cartNewPaid);

                    const selectedItem = selectedItems[p.id];

                    return (
                      <div
                        key={p.id}
                        className={`p-4 rounded-xl border transition-all ${
                          isApproved
                            ? "bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/80"
                            : isDiscarded
                            ? "bg-slate-100/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 opacity-60"
                            : isDuplicate
                            ? "bg-purple-50/40 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800/60"
                            : "bg-white dark:bg-slate-800/90 border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600 shadow-sm"
                        }`}
                      >
                        {/* BANNER EVIDENTE IMPORTO INCASSATO */}
                        <div className="bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/30 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-xs shrink-0">
                              <DollarSign className="w-6 h-6 stroke-[2.5]" />
                            </div>
                            <div>
                              <span className="text-[10px] font-extrabold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider block">
                                Importo Pagato dal Cliente (PayPal)
                              </span>
                              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-tight">
                                € {p.amount.toFixed(2)}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap text-xs">
                            <span className="font-mono text-[11px] font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xs">
                              🗓️ {p.dateStr}
                            </span>
                            {p.transactionId && (
                              <span className="font-mono text-[11px] text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xs">
                                Tx: {p.transactionId}
                              </span>
                            )}
                            {/* Badges */}
                            {isDuplicate && (
                              <span className="px-2.5 py-1 bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 font-bold text-[11px] rounded-lg">
                                Già Registrato (Duplicato)
                              </span>
                            )}
                            {isApproved && (
                              <span className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-bold text-[11px] rounded-lg flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Approvato
                              </span>
                            )}
                            {isDiscarded && (
                              <span className="px-2.5 py-1 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-[11px] rounded-lg">
                                Scartato
                              </span>
                            )}
                          </div>
                        </div>

                        {/* MITTENTE E SNIPPET EMAIL */}
                        <div className="mt-3 space-y-1">
                          <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                            Mittente PayPal: <span className="text-indigo-600 dark:text-indigo-400 font-bold">{p.payerName || "Nome sconosciuto"}</span>{" "}
                            {p.payerEmail ? `<${p.payerEmail}>` : ""}
                          </div>

                          {p.snippet && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 italic line-clamp-2 bg-slate-50 dark:bg-slate-900/60 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                              "{p.snippet}"
                            </p>
                          )}

                          {/* Match Confidence Badge */}
                          {!isApproved && !isDiscarded && (
                            <div className="mt-1 flex items-center gap-2">
                              {p.matchScore && p.matchScore >= 85 ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                                  🟢 Associazione Sicura ({p.matchScore}%): {p.matchReason}
                                </span>
                              ) : p.matchScore && p.matchScore >= 65 ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                                  🟡 Associazione Probabile ({p.matchScore}%) - Verifica prima di confermare: {p.matchReason}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                  ⚪ Nessuna associazione automatica ad alta sicurezza: Seleziona manualmente il carrello sottostante.
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* SELEZIONE CARRELLO E AZIONI */}
                        <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700 flex flex-col md:flex-row md:items-start justify-between gap-4">
                          <div className="flex-1 space-y-3">
                            {/* Dropdown / Combobox Carrello */}
                            <div>
                              <label className="block text-[10px] font-extrabold uppercase text-slate-500 dark:text-slate-400 mb-1">
                                Carrello Cliente Associato:
                              </label>
                              <CartSearchCombobox
                                carts={carts}
                                dettagli={dettagli}
                                oggettiInGrading={oggettiInGrading}
                                selectedCartId={currentCartId}
                                onSelectCart={(cartId) => handleCartChange(p.id, cartId)}
                                disabled={isApproved || isDiscarded || isProcessingThis}
                              />
                            </div>

                            {/* SE CARRELLO SELEZIONATO: MOSTRA RIEPILOGO FINANZIARIO E SELEZIONE ARTICOLO */}
                            {targetCart && (
                              <div className="p-3 bg-slate-50 dark:bg-slate-900/80 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-3">
                                {/* Quadro Economico Carrello */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                                  <div className="bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                                    <span className="text-[10px] text-slate-400 font-medium block">Totale Carrello</span>
                                    <span className="font-bold text-slate-800 dark:text-slate-200">€ {cartTotalCost.toFixed(2)}</span>
                                  </div>
                                  <div className="bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                                    <span className="text-[10px] text-slate-400 font-medium block">Da Pagare Attualmente</span>
                                    <span className="font-bold text-amber-600 dark:text-amber-400">€ {Math.max(0, cartTotalCost - cartCurrentPaid).toFixed(2)}</span>
                                  </div>
                                  <div className="bg-emerald-50 dark:bg-emerald-950/40 p-2 rounded-lg border border-emerald-200 dark:border-emerald-800">
                                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold block">+ Questo Pagamento</span>
                                    <span className="font-extrabold text-emerald-600 dark:text-emerald-400">+ € {p.amount.toFixed(2)}</span>
                                  </div>
                                  <div className="bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                                    <span className="text-[10px] text-slate-400 font-medium block">Rimanente dopo Pagamento</span>
                                    <span className={`font-bold ${cartRemainingAfter === 0 && cartTotalCost > 0 ? 'text-emerald-600 font-black' : 'text-slate-800 dark:text-slate-200'}`}>
                                      € {cartRemainingAfter.toFixed(2)}
                                    </span>
                                  </div>
                                </div>

                                {/* Status Result */}
                                <div className="text-[11px] font-semibold px-1">
                                  {cartTotalCost > 0 ? (
                                    cartNewPaid >= cartTotalCost ? (
                                      <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-bold">
                                        🟢 Con questo pagamento il carrello risulterà SALDATO COMPLETAMENTE.
                                      </span>
                                    ) : (
                                      <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                        🟡 Acconto Parziale: rimarranno ancora <strong>€ {cartRemainingAfter.toFixed(2)}</strong> da saldare sul carrello.
                                      </span>
                                    )
                                  ) : (
                                    <span className="text-slate-500">Nessun costo totale calcolato sul carrello.</span>
                                  )}
                                </div>

                                {/* SELEZIONE ARTICOLI SPECIFICI O MOLTEPLICITA' */}
                                <div className="border-t border-slate-200 dark:border-slate-700 pt-3 space-y-3">
                                  {(() => {
                                    const availableCartItems = getGroupedCartItemsForCart(cartDettagli, cartGrading, magazzino)
                                      .filter((item) => !item.isAlreadyPaid);

                                    const currentAllocations = selectedItems[p.id] || [];
                                    const totalAllocated = currentAllocations.reduce((sum, a) => sum + (a.allocatedAmount || 0), 0);

                                    const handleToggleItem = (item: typeof availableCartItems[0]) => {
                                      const exists = currentAllocations.some(a => a.key === item.key);
                                      let next: SelectedItemAllocation[];
                                      if (exists) {
                                        next = currentAllocations.filter(a => a.key !== item.key);
                                      } else {
                                        next = [
                                          ...currentAllocations,
                                          {
                                            key: item.key,
                                            itemId: item.itemId,
                                            itemType: item.itemType,
                                            itemIndex: item.itemIndices[0],
                                            itemIndices: item.itemIndices,
                                            itemName: item.itemName,
                                            itemPrice: item.itemPrice,
                                            currentAcconto: item.currentAcconto,
                                            allocatedAmount: 0,
                                            markAsPaid: false,
                                            quantity: item.quantity
                                          }
                                        ];
                                      }
                                      const distributed = autoDistributeAmount(p.amount, next);
                                      setSelectedItems(prev => ({ ...prev, [p.id]: distributed }));
                                    };

                                    const handleSelectAllUnpaid = () => {
                                      const initial: SelectedItemAllocation[] = availableCartItems.map(i => ({
                                        key: i.key,
                                        itemId: i.itemId,
                                        itemType: i.itemType,
                                        itemIndex: i.itemIndices[0],
                                        itemIndices: i.itemIndices,
                                        itemName: i.itemName,
                                        itemPrice: i.itemPrice,
                                        currentAcconto: i.currentAcconto,
                                        allocatedAmount: 0,
                                        markAsPaid: false,
                                        quantity: i.quantity
                                      }));
                                      const distributed = autoDistributeAmount(p.amount, initial);
                                      setSelectedItems(prev => ({ ...prev, [p.id]: distributed }));
                                    };

                                    const handleClearSelection = () => {
                                      setSelectedItems(prev => {
                                        const copy = { ...prev };
                                        delete copy[p.id];
                                        return copy;
                                      });
                                    };

                                    return (
                                      <div className="space-y-2.5">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                          <label className="text-[11px] font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                            <Package className="w-3.5 h-3.5 text-indigo-500" />
                                            Seleziona Articoli / Copie Pagate con questo Movimento (€{p.amount.toFixed(2)}):
                                          </label>

                                          <div className="flex items-center gap-1.5 flex-wrap">
                                            {availableCartItems.length > 0 && (
                                              <button
                                                type="button"
                                                disabled={isApproved || isDiscarded || isProcessingThis}
                                                onClick={handleSelectAllUnpaid}
                                                className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 dark:text-indigo-300 rounded-md text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                                              >
                                                <Sparkles className="w-3 h-3" />
                                                Seleziona Tutti
                                              </button>
                                            )}

                                            {currentAllocations.length > 0 && (
                                              <button
                                                type="button"
                                                disabled={isApproved || isDiscarded || isProcessingThis}
                                                onClick={handleClearSelection}
                                                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 rounded-md text-[10px] font-semibold transition cursor-pointer"
                                              >
                                                Svuota (Generico)
                                              </button>
                                            )}
                                          </div>
                                        </div>

                                        {availableCartItems.length === 0 ? (
                                          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold italic flex items-center gap-1 p-2 bg-emerald-50 dark:bg-emerald-950/40 rounded-md border border-emerald-200 dark:border-emerald-800">
                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                            Tutti gli articoli di questo carrello risultano già pagati.
                                          </p>
                                        ) : (
                                          <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                                            {availableCartItems.map((item) => {
                                              const isChecked = currentAllocations.some(a => a.key === item.key);
                                              const currentAlloc = currentAllocations.find(a => a.key === item.key);
                                              const remainingToPay = Math.max(0, item.itemPrice - item.currentAcconto);

                                              return (
                                                <div
                                                  key={item.key}
                                                  className={`p-2 rounded-lg border text-xs transition flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                                                    isChecked
                                                      ? "bg-indigo-50/90 border-indigo-300 dark:bg-indigo-950/50 dark:border-indigo-700"
                                                      : "bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                                                  }`}
                                                >
                                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                                    <input
                                                      type="checkbox"
                                                      disabled={isApproved || isDiscarded || isProcessingThis}
                                                      checked={isChecked}
                                                      onChange={() => handleToggleItem(item)}
                                                      className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer shrink-0"
                                                    />
                                                    <div className="min-w-0 flex-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                                      <span className="shrink-0 text-[9px] px-1.5 py-0.2 rounded font-mono bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold">
                                                        {item.itemType === "dettaglio" ? "🎴 Magazzino" : "🪪 Grading"}
                                                      </span>
                                                      <span className="font-bold text-slate-800 dark:text-slate-100 truncate text-[11px] max-w-[180px] sm:max-w-[240px]">
                                                        {item.itemName}
                                                      </span>
                                                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono ml-auto sm:ml-0">
                                                        €{item.itemPrice.toFixed(2)}
                                                        {item.currentAcconto > 0 && <span className="text-amber-600 dark:text-amber-400 ml-1">(Acc: €{item.currentAcconto.toFixed(2)})</span>}
                                                        <span className="font-semibold text-slate-700 dark:text-slate-300 ml-1">Rim: €{remainingToPay.toFixed(2)}</span>
                                                        {item.isAlreadyPaid && <span className="text-emerald-600 font-bold ml-1">✓ Pagato</span>}
                                                      </span>
                                                    </div>
                                                  </div>

                                                  {isChecked && currentAlloc && (
                                                    <div className="flex items-center gap-2 shrink-0 bg-white dark:bg-slate-900 p-1.5 rounded-md border border-indigo-200 dark:border-indigo-800/80">
                                                      <div className="flex items-center gap-1">
                                                        <span className="text-[10px] font-semibold text-slate-500">Quota:</span>
                                                        <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">€</span>
                                                        <input
                                                          type="number"
                                                          step="0.01"
                                                          min="0"
                                                          disabled={isApproved || isDiscarded || isProcessingThis}
                                                          value={currentAlloc.allocatedAmount}
                                                          onChange={(e) => {
                                                            const val = parseFloat(e.target.value) || 0;
                                                            setSelectedItems(prev => ({
                                                              ...prev,
                                                              [p.id]: (prev[p.id] || []).map(a => {
                                                                if (a.key === item.key) {
                                                                  const tot = a.currentAcconto + val;
                                                                  return {
                                                                    ...a,
                                                                    allocatedAmount: val,
                                                                    markAsPaid: a.itemPrice > 0 ? tot >= a.itemPrice : true
                                                                  };
                                                                }
                                                                return a;
                                                              })
                                                            }));
                                                          }}
                                                          className="w-16 p-1 text-xs font-bold border border-slate-300 dark:border-slate-600 rounded bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-right focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                                        />
                                                      </div>

                                                      <label className="flex items-center gap-1 text-[10px] font-bold text-indigo-700 dark:text-indigo-300 cursor-pointer">
                                                        <input
                                                          type="checkbox"
                                                          disabled={isApproved || isDiscarded || isProcessingThis}
                                                          checked={currentAlloc.markAsPaid}
                                                          onChange={(e) => {
                                                            const checked = e.target.checked;
                                                            setSelectedItems(prev => ({
                                                              ...prev,
                                                              [p.id]: (prev[p.id] || []).map(a => a.key === item.key ? { ...a, markAsPaid: checked } : a)
                                                            }));
                                                          }}
                                                          className="w-3.5 h-3.5 text-indigo-600 rounded focus:ring-indigo-500"
                                                        />
                                                        <span>Saldato</span>
                                                      </label>
                                                    </div>
                                                  )}
                                                </div>
                                              );
                                            })}
                                          </div>
                                        )}

                                        {currentAllocations.length > 0 ? (
                                          <div className="p-2.5 bg-indigo-50/80 dark:bg-indigo-950/40 rounded-lg border border-indigo-200 dark:border-indigo-800 text-xs space-y-1">
                                            <div className="flex items-center justify-between font-bold text-indigo-900 dark:text-indigo-200">
                                              <span>Articoli Selezionati ({currentAllocations.length}):</span>
                                              <span className="font-mono">
                                                Totale Assegnato: €{totalAllocated.toFixed(2)} / €{p.amount.toFixed(2)}
                                              </span>
                                            </div>
                                            {Math.abs(totalAllocated - p.amount) < 0.01 ? (
                                              <p className="text-[11px] text-emerald-700 dark:text-emerald-300 flex items-center gap-1 font-semibold">
                                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                                L'importo del pagamento PayPal (€{p.amount.toFixed(2)}) copre esattamente gli articoli selezionati.
                                              </p>
                                            ) : totalAllocated < p.amount ? (
                                              <p className="text-[11px] text-amber-700 dark:text-amber-300 flex items-center gap-1 font-semibold">
                                                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                                                I restanti €{(p.amount - totalAllocated).toFixed(2)} verranno registrati come acconto generico sul carrello.
                                              </p>
                                            ) : (
                                              <p className="text-[11px] text-red-600 dark:text-red-400 flex items-center gap-1 font-semibold">
                                                <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                                                L'importo assegnato agli articoli (€{totalAllocated.toFixed(2)}) supera l'incasso PayPal (€{p.amount.toFixed(2)}).
                                              </p>
                                            )}
                                          </div>
                                        ) : (
                                          <p className="text-[11px] text-slate-500 dark:text-slate-400 bg-slate-100/70 dark:bg-slate-800/60 p-2 rounded-md italic">
                                            ℹ️ Nessun articolo selezionato: il pagamento di <strong>€{p.amount.toFixed(2)}</strong> verrà accreditato come saldo/acconto generico su tutto il carrello.
                                          </p>
                                        )}
                                      </div>
                                    );
                                  })()}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Pulsanti Azione */}
                          <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                            {isDiscarded ? (
                              <button
                                type="button"
                                onClick={() => handleRestoreSingle(p.id)}
                                className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg transition cursor-pointer"
                                title="Ripristina elemento scartato"
                              >
                                <RotateCcw className="w-3.5 h-3.5" /> Ripristina
                              </button>
                            ) : isApproved ? (
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 px-3 py-2 bg-emerald-100/60 dark:bg-emerald-950/40 rounded-lg">
                                <Check className="w-4 h-4" /> Registrato
                              </span>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleApproveSingle(p)}
                                  disabled={!currentCartId || isProcessingThis || isDuplicate}
                                  className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow transition disabled:opacity-40 cursor-pointer"
                                  title={isDuplicate ? "Pagamento già registrato precedentemente" : "Applica questo pagamento al carrello selezionato"}
                                >
                                  {isProcessingThis ? (
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Check className="w-3.5 h-3.5" />
                                  )}
                                  Applica Pagamento
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleDiscardSingle(p.id)}
                                  className="inline-flex items-center gap-1 px-2.5 py-2.5 bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-600 dark:bg-slate-700/60 dark:hover:bg-red-950/40 dark:hover:text-red-400 text-xs font-semibold rounded-xl transition cursor-pointer"
                                  title="Scarta questa proposta"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Security & Operation Info */}
          <div className="bg-slate-50 dark:bg-slate-900/60 rounded-xl p-4 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 space-y-1.5">
            <div className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-200">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Protezione da Duplicati & Controllo Completo</span>
            </div>
            <p>
              • Ogni email approvata viene memorizzata col proprio identificativo unico e ID transazione PayPal, impedendo qualsiasi registrazione duplicata in futuro.
            </p>
            <p>
              • Puoi selezionare l'articolo specifico pagato (o saldare il carrello in toto), tenendo sotto controllo gli acconti e il saldo finale.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100 transition cursor-pointer"
          >
            Chiudi
          </button>

          {pendingCount > 0 && (
            <button
              onClick={handleBatchApproveValid}
              disabled={processingBatch}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-md transition disabled:opacity-50 cursor-pointer"
            >
              {processingBatch ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
              Conferma Tutti i Pronti ({pendingCount})
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
