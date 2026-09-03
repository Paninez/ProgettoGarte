import { useState, useMemo, useCallback } from "react";
import { useDatabase } from "../../context/DatabaseContext";
import { OggettoMagazzino, CustomerLoyalty } from "../../types";

export interface MagazzinoProps {
  onAddItem: (item: Omit<OggettoMagazzino, "ID_Oggetto">) => Promise<void>;
  onEditItem: (item: OggettoMagazzino) => Promise<void>;
  onBulkUpdateDates?: (
    updates: {
      id: string;
      dataArrivoPrevista?: string | null;
      dataSpedizionePresunta?: string | null;
    }[]
  ) => Promise<void>;
  onRestockItem?: (itemId: string, addedQty: number, newCostPerUnit: number) => Promise<void>;
  onDeleteItem?: (id: string) => Promise<void>;
  onDistributeItemToCarts?: (
    itemId: string,
    distributions: { cartId: string; clientName?: string; quantity: number; isPaid?: boolean }[]
  ) => Promise<void>;
  onSettlePreorder?: (
    item: OggettoMagazzino,
    costoUnitario: number,
    quantitaAcquistata: number,
    costoSpedizione: number,
    costoDogana: number,
    altroCosto: number
  ) => Promise<void>;
  loyaltyProfiles?: CustomerLoyalty[];
}

export function useMagazzinoLogic(props: MagazzinoProps) {
  const { onEditItem, onDeleteItem } = props;
  const { magazzino: items, carrelli, dettagli, currentOperatore, userRole, loyaltyProfiles } = useDatabase();

  const [search, setSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState<string>("");
  const [isAdding, setIsAdding] = useState(false);
  const [isAddingSingleCards, setIsAddingSingleCards] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [settlingPreorderItem, setSettlingPreorderItem] = useState<OggettoMagazzino | null>(null);

  // Dynamic tags derived from all items
  const allUniqueTags = useMemo(() => {
    const tagsSet = new Set<string>();
    items.forEach((item) => {
      if (item.Tag) {
        item.Tag.split(",").forEach((t) => {
          const trimmed = t.trim().toLowerCase();
          if (trimmed) {
            tagsSet.add(trimmed);
          }
        });
      }
    });
    return Array.from(tagsSet).sort();
  }, [items]);

  // Calcolo allocati
  const allocatedCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    if (!carrelli || !dettagli) return counts;

    // Create a Set of active cart IDs for O(1) lookup
    const activeCartIds = new Set();
    carrelli.forEach((c) => {
      if (c.Stato_Carrello === "Aperto" || c.Stato_Carrello === "Pronto_per_Spedizione") {
        activeCartIds.add(c.ID_Carrello);
      }
    });

    // Single pass over dettagli
    dettagli.forEach((d) => {
      if (activeCartIds.has(d.ID_Carrello) && !d.ID_Spedizione) {
        counts[d.ID_Oggetto] = (counts[d.ID_Oggetto] || 0) + 1;
      }
    });

    return counts;
  }, [carrelli, dettagli]);

  // Edit Item Form State
  const [editName, setEditName] = useState("");
  const [editQty, setEditQty] = useState(0);
  const [editCosto, setEditCosto] = useState(0);
  const [editPrezzo, setEditPrezzo] = useState(0);
  const [editDataSpedizionePresunta, setEditDataSpedizionePresunta] = useState("");
  const [editTag, setEditTag] = useState("");

  const [loading, setLoading] = useState(false);

  // Custom delete item confirmation modal state
  const [itemIdToDelete, setItemIdToDelete] = useState<string | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [distributingItem, setDistributingItem] = useState<OggettoMagazzino | null>(null);
  const [meetItem, setMeetItem] = useState<OggettoMagazzino | null>(null);

  const [activeTab, setActiveTab] = useState("dashboard");
  const [subTab, setSubTab] = useState("standard");

  const filteredItems = useMemo(() => {
    let filtered = items;

    if (activeTab === "inventario") {
      filtered = filtered.filter((item) => {
        if (item.Is_Preordine) return false;
        const allocated = allocatedCounts[item.ID_Oggetto] || 0;
        const available = item.Quantità_Disponibile - allocated;

        if (subTab === "standard") {
          return !(item.Is_Carta_Singola || item.Nome.includes("[Carta Singola]")) && available > 0;
        } else if (subTab === "singole") {
          return (item.Is_Carta_Singola || item.Nome.includes("[Carta Singola]")) && available > 0;
        } else if (subTab === "tutti") {
          return available > 0;
        }
        return false;
      });
    } else if (activeTab === "preordini") {
      filtered = filtered.filter((item) => item.Is_Preordine);
    } else if (activeTab === "esauriti") {
      filtered = filtered.filter((item) => {
        if (item.Is_Preordine) return false;
        const allocated = allocatedCounts[item.ID_Oggetto] || 0;
        const available = item.Quantità_Disponibile - allocated;

        if (subTab === "standard") {
          return !(item.Is_Carta_Singola || item.Nome.includes("[Carta Singola]")) && available <= 0;
        } else if (subTab === "singole") {
          return (item.Is_Carta_Singola || item.Nome.includes("[Carta Singola]")) && available <= 0;
        }
        return available <= 0;
      });
    }

    if (selectedTag) {
      filtered = filtered.filter((item) => {
        if (!item.Tag) return false;
        return item.Tag.split(",").some((t) => t.trim().toLowerCase() === selectedTag.toLowerCase());
      });
    }

    return filtered.filter(
      (item) =>
        item.Nome.toLowerCase().includes(search.toLowerCase()) ||
        item.ID_Oggetto.toLowerCase().includes(search.toLowerCase())
    );
  }, [items, search, selectedTag, activeTab, subTab, allocatedCounts]);

  const handleStartEdit = useCallback((item: OggettoMagazzino) => {
    setEditingId(item.ID_Oggetto);
    setEditName(item.Nome);
    setEditQty(item.Quantità_Disponibile);
    setEditCosto(item.Costo_Acquisto);
    setEditPrezzo(item.Prezzo_Vendita);
    setEditDataSpedizionePresunta(item.Data_Spedizione_Presunta || "");
    setEditTag(item.Tag || "");
  }, []);

  const handleSaveEdit = useCallback(async (id: string) => {
    if (!editName.trim()) {
      alert("Il nome dell'articolo non può essere vuoto.");
      return;
    }

    const originalItem = items.find((m) => m.ID_Oggetto === id);
    if (!originalItem) return;

    setLoading(true);
    try {
      await onEditItem({
        ...originalItem,
        Nome: editName,
        Quantità_Disponibile: editQty,
        Costo_Acquisto: editCosto,
        Prezzo_Vendita: editPrezzo,
        Data_Spedizione_Presunta: editDataSpedizionePresunta,
        Tag: editTag,
      });
      setEditingId(null);
    } catch (err: any) {
      alert("Errore durante l'aggiornamento: " + err.message);
    } finally {
      setLoading(false);
    }
  }, [editName, items, editQty, editCosto, editPrezzo, editDataSpedizionePresunta, editTag, onEditItem]);

  const handleConfirmDelete = useCallback(async () => {
    if (deleteConfirmText !== "ELIMINA" || !itemIdToDelete || !onDeleteItem) return;
    setLoading(true);
    try {
      await onDeleteItem(itemIdToDelete);
      setItemIdToDelete(null);
      setDeleteConfirmText("");
    } catch (err: any) {
      alert("Errore di eliminazione: " + err.message);
    } finally {
      setLoading(false);
    }
  }, [deleteConfirmText, itemIdToDelete, onDeleteItem]);

  return {
    items,
    carrelli,
    dettagli,
    currentOperatore,
    userRole,
    loyaltyProfiles,
    search,
    setSearch,
    selectedTag,
    setSelectedTag,
    allUniqueTags,
    isAdding,
    setIsAdding,
    isAddingSingleCards,
    setIsAddingSingleCards,
    editingId,
    setEditingId,
    settlingPreorderItem,
    setSettlingPreorderItem,
    allocatedCounts,
    editName,
    setEditName,
    editQty,
    setEditQty,
    editCosto,
    setEditCosto,
    editPrezzo,
    setEditPrezzo,
    editDataSpedizionePresunta,
    setEditDataSpedizionePresunta,
    editTag,
    setEditTag,
    loading,
    itemIdToDelete,
    setItemIdToDelete,
    deleteConfirmText,
    setDeleteConfirmText,
    distributingItem,
    setDistributingItem,
    meetItem,
    setMeetItem,
    activeTab,
    setActiveTab,
    subTab,
    setSubTab,
    filteredItems,
    handleStartEdit,
    handleSaveEdit,
    handleConfirmDelete,
  };
}
