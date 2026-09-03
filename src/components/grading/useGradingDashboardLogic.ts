import React, { useState, useMemo } from "react";
import { useDatabase } from "../../context/DatabaseContext";
import { GradingGroup, ListinoGradingItem, GradingItem } from "../../types";
import { GradingDashboardProps } from "./gradingUtils";

export function useGradingDashboardLogic(props: GradingDashboardProps) {
  const { onSaveGroup, onAssignCards, onSaveListino } = props;
  const { gruppiGrading, oggettiInGrading, listinoGrading, carrelli, userRole } = useDatabase();

  const [activeSubTab, setActiveSubTab] = useState<"lotti" | "listino">("lotti");
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [lottiFilter, setLottiFilter] = useState<"attivi" | "chiusi" | "tutti">("attivi");
  const [selectedUnassignedCards, setSelectedUnassignedCards] = useState<string[]>([]);

  // Modal / Form state for creating a Group
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [saveLoading, setSaveLoading] = useState(false);

  // Listino edit state
  const [localListino, setLocalListino] = useState<ListinoGradingItem[]>([]);
  const [isEditingListino, setIsEditingListino] = useState(false);
  const [listinoSaveLoading, setListinoSaveLoading] = useState(false);

  // Initialize local listino when editing starts
  const startEditingListino = () => {
    setLocalListino(JSON.parse(JSON.stringify(listinoGrading)));
    setIsEditingListino(true);
  };

  const selectedGroup = useMemo(() => {
    return gruppiGrading.find((g) => g.ID_Gruppo_Grading === selectedGroupId) || null;
  }, [gruppiGrading, selectedGroupId]);

  const filteredGroups = useMemo(() => {
    return gruppiGrading.filter((g) => {
      if (lottiFilter === "attivi") {
        return g.Stato_Gruppo !== "Chiuso";
      }
      if (lottiFilter === "chiusi") {
        return g.Stato_Gruppo === "Chiuso";
      }
      return true;
    });
  }, [gruppiGrading, lottiFilter]);

  // Filter out any grading items that don't belong to any existing cart
  const filteredOggettiInGrading = useMemo(() => {
    return oggettiInGrading.filter((item) => {
      if (!item.ID_Carrello) return false;
      return carrelli.some((c) => c.ID_Carrello === item.ID_Carrello);
    });
  }, [oggettiInGrading, carrelli]);

  // Cards currently associated with the selected group
  const groupCards = useMemo(() => {
    if (!selectedGroupId) return [];
    return filteredOggettiInGrading.filter((item) => item.ID_Gruppo_Grading === selectedGroupId);
  }, [filteredOggettiInGrading, selectedGroupId]);

  // Financial statistics of the selected group
  const groupStats = useMemo(() => {
    let totalCards = groupCards.length;
    let totalRevenue = 0;
    let totalCost = 0;
    let totalMargin = 0;

    groupCards.forEach((c) => {
      totalRevenue += c.Costo_Cliente;
      totalCost += c.Costo_Acquisto;
      totalMargin += c.Margine_Lordo;
    });

    return { totalCards, totalRevenue, totalCost, totalMargin };
  }, [groupCards]);

  // Cards that are unassigned (both PSA and BGS)
  const unassignedCards = useMemo(() => {
    if (!selectedGroup) return [];
    return filteredOggettiInGrading.filter((item) => {
      const isUnassigned = !item.ID_Gruppo_Grading;
      return isUnassigned;
    });
  }, [filteredOggettiInGrading, selectedGroup]);

  const [unassignedPage, setUnassignedPage] = useState(1);
  const ITEMS_PER_PAGE_UNASSIGNED = 15;
  const totalUnassignedPages = Math.ceil(unassignedCards.length / ITEMS_PER_PAGE_UNASSIGNED);

  const paginatedUnassignedCards = useMemo(() => {
    const startIndex = (unassignedPage - 1) * ITEMS_PER_PAGE_UNASSIGNED;
    return unassignedCards.slice(startIndex, startIndex + ITEMS_PER_PAGE_UNASSIGNED);
  }, [unassignedCards, unassignedPage]);

  // Handle creating a new Group
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) {
      alert("Il nome del lotto non può essere vuoto.");
      return;
    }
    setSaveLoading(true);

    const groupId = `GRP-${Date.now().toString().slice(-6)}`;
    const newGroup: GradingGroup = {
      ID_Gruppo_Grading: groupId,
      Nome_Gruppo: newGroupName.trim(),
      Compagnia: "PSA/BGS",
      Data_Creazione: new Date().toLocaleDateString("it-IT"),
      Stato_Gruppo: "In Preparazione",
    };

    try {
      await onSaveGroup(newGroup);
      setSelectedGroupId(groupId);
      setIsCreatingGroup(false);
      setNewGroupName("");
    } catch (err: any) {
      alert("Errore durante la creazione del gruppo: " + err.message);
    } finally {
      setSaveLoading(false);
    }
  };

  // Handle group status change
  const handleStatusChange = async (newStatus: "In Preparazione" | "Spedito" | "Ritornato" | "Chiuso") => {
    if (!selectedGroup) return;

    if (newStatus === "Chiuso") {
      const missingDeliveryOrPhoto = groupCards.filter(
        (c) => !c.Link_Foto_Ritornata || !c.Metodo_Consegna
      );

      if (missingDeliveryOrPhoto.length > 0) {
        alert(
          `Impossibile chiudere il lotto:\n` +
            `Ci sono ${missingDeliveryOrPhoto.length} carte non ancora consegnate/spedite al possessore.\n` +
            `Per chiudere il lotto, ogni carta deve avere una "Foto Risultato Grading" caricata e un "Metodo Consegna" selezionato.\n\n` +
            `Carte non pronte:\n` +
            missingDeliveryOrPhoto.map((c) => `- ${c.Nome_Carta} (ID: ${c.ID_Oggetto_Grading})`).join("\n")
        );
        return;
      }
    }

    const updated = { ...selectedGroup, Stato_Gruppo: newStatus };
    try {
      await onSaveGroup(updated);
    } catch (err: any) {
      alert("Errore nell'aggiornamento dello stato: " + err.message);
    }
  };

  // Assign card to the selected group
  const handleAssignCard = async (cardId: string) => {
    if (!selectedGroupId) return;
    try {
      await onAssignCards(selectedGroupId, [cardId]);
    } catch (err: any) {
      alert("Errore nell'associazione della carta: " + err.message);
    }
  };

  const handleToggleUnassignedCard = (cardId: string) => {
    setSelectedUnassignedCards((prev) =>
      prev.includes(cardId) ? prev.filter((id) => id !== cardId) : [...prev, cardId]
    );
  };

  const handleAssignMultipleCards = async () => {
    if (!selectedGroupId || selectedUnassignedCards.length === 0) return;
    try {
      await onAssignCards(selectedGroupId, selectedUnassignedCards);
      setSelectedUnassignedCards([]);
    } catch (err: any) {
      alert("Errore nell'associazione delle carte: " + err.message);
    }
  };

  // Unassign card from the group
  const handleUnassignCard = async (cardId: string) => {
    try {
      await onAssignCards("", [cardId]);
    } catch (err: any) {
      alert("Errore nella rimozione della carta: " + err.message);
    }
  };

  // Save the price list
  const handleSavePriceList = async () => {
    setListinoSaveLoading(true);
    try {
      await onSaveListino(localListino);
      setIsEditingListino(false);
    } catch (err: any) {
      alert("Errore nel salvataggio del listino: " + err.message);
    } finally {
      setListinoSaveLoading(false);
    }
  };

  // Export group cards to CSV format
  const handleExportCSV = () => {
    if (!selectedGroup) return;
    if (groupCards.length === 0) {
      alert("Nessuna carta presente in questo gruppo da esportare.");
      return;
    }

    const headers = [
      "Nome carrello",
      "Id GRADAZIONE",
      "Nome Carta",
      "Servizio grading scelto",
      "Costo di acquisto",
      "Check spedizione",
    ];

    const rows = groupCards.map((c) => {
      const cartInfo = carrelli.find((car) => car.ID_Carrello === c.ID_Carrello);
      const cartName = cartInfo ? cartInfo.Nome_Cliente : c.ID_Carrello;
      return [
        `"${(cartName || "").replace(/"/g, '""')}"`,
        `"${(c.ID_Oggetto_Grading || "").replace(/"/g, '""')}"`,
        `"${(c.Nome_Carta || "").replace(/"/g, '""')}"`,
        `"${(c.Tipologia_Servizio || "").replace(/"/g, '""')}"`,
        (c.Costo_Acquisto || 0).toFixed(2),
        "",
      ];
    });

    const totalCount = groupCards.length;
    const totalCost = groupCards.reduce((sum, c) => sum + c.Costo_Acquisto, 0);
    const emptyRow = ["", "", "", "", "", ""];
    const summaryRow1 = ["Totale Oggetti", totalCount.toString(), "", "", "", ""];
    const summaryRow2 = ["Totale Costo spedizione", totalCost.toFixed(2), "", "", "", ""];

    const csvString = [
      headers.join(","),
      ...rows.map((e) => e.join(",")),
      emptyRow.join(","),
      summaryRow1.join(","),
      summaryRow2.join(","),
    ].join("\r\n");

    const blob = new Blob(["\uFEFF" + csvString], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    const fileName = `${selectedGroup.Nome_Gruppo.replace(/\s+/g, "_")}_lista_spedizione_grading.csv`;
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return {
    gruppiGrading,
    oggettiInGrading,
    listinoGrading,
    carrelli,
    userRole,
    activeSubTab,
    setActiveSubTab,
    selectedGroupId,
    setSelectedGroupId,
    lottiFilter,
    setLottiFilter,
    selectedUnassignedCards,
    setSelectedUnassignedCards,
    isCreatingGroup,
    setIsCreatingGroup,
    newGroupName,
    setNewGroupName,
    saveLoading,
    localListino,
    setLocalListino,
    isEditingListino,
    setIsEditingListino,
    listinoSaveLoading,
    startEditingListino,
    selectedGroup,
    filteredGroups,
    filteredOggettiInGrading,
    groupCards,
    groupStats,
    unassignedCards,
    unassignedPage,
    setUnassignedPage,
    totalUnassignedPages,
    paginatedUnassignedCards,
    handleCreateGroup,
    handleStatusChange,
    handleAssignCard,
    handleToggleUnassignedCard,
    handleAssignMultipleCards,
    handleUnassignCard,
    handleSavePriceList,
    handleExportCSV,
  };
}
