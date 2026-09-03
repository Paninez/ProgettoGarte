import { useState, useMemo } from "react";
import { useDatabase } from "../../context/DatabaseContext";
import { Spedizione, Carrello } from "../../types";
import { sendWhatsAppMessage } from "../../lib/whatsapp";
import { getTrackingUrl, SpedizioniProps } from "./spedizioniUtils";

const ITEMS_PER_PAGE = 12;

export function useSpedizioniLogic(props: SpedizioniProps) {
  const { onUpdateShipmentTag, onSaveCart } = props;
  const { spedizioni, carrelli, dettagli: dettagliCarrelli, magazzino, oggettiInGrading } = useDatabase();

  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"da_gestire" | "consegnate" | "resi">("da_gestire");
  const [operatorFilter, setOperatorFilter] = useState<"tutti" | "Giana" | "Eto" | "Paki" | "unassigned">("tutti");
  const [printingShipment, setPrintingShipment] = useState<Spedizione | null>(null);
  const [editingShipmentId, setEditingShipmentId] = useState<string | null>(null);
  const [uploadingShipmentId, setUploadingShipmentId] = useState<string | null>(null);
  const [editingAddressValue, setEditingAddressValue] = useState<string>("");
  const [isSavingAddress, setIsSavingAddress] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState(1);

  const [paidShipments, setPaidShipments] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem("paid_shipments_reminders");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const handleToggleShipmentPaid = (shipmentId: string) => {
    setPaidShipments((prev) => {
      const updated = { ...prev, [shipmentId]: !prev[shipmentId] };
      localStorage.setItem("paid_shipments_reminders", JSON.stringify(updated));
      return updated;
    });
  };

  const isShipmentPaid = (shipmentId: string) => {
    return !!paidShipments[shipmentId];
  };

  const handleStartEditAddress = (shipmentId: string, currentAddr: string) => {
    setEditingShipmentId(shipmentId);
    setEditingAddressValue(currentAddr || "");
  };

  const handleToggleOperatorTag = (shipment: Spedizione, operator: "Giana" | "Eto" | "Paki") => {
    if (!onUpdateShipmentTag) return;
    const currentRawTags = (shipment.Tag || "").split(",").map((t) => t.trim()).filter(Boolean);
    const hasOperator = currentRawTags.includes(operator);
    const cleanedTags = currentRawTags.filter((t) => !["Giana", "Eto", "Paki"].includes(t));
    if (!hasOperator) {
      cleanedTags.push(operator);
    }
    const newTagString = cleanedTags.join(", ");
    onUpdateShipmentTag(shipment.ID_Spedizione, newTagString);
  };

  const handleToggleSingleTag = (shipment: Spedizione, tagToToggle: string) => {
    if (!onUpdateShipmentTag) return;
    const currentRawTags = (shipment.Tag || "").split(",").map((t) => t.trim()).filter(Boolean);
    const hasTag = currentRawTags.includes(tagToToggle);
    let newTags;
    if (hasTag) {
      newTags = currentRawTags.filter((t) => t !== tagToToggle);
    } else {
      newTags = [...currentRawTags, tagToToggle];
    }
    onUpdateShipmentTag(shipment.ID_Spedizione, newTags.join(", "));
  };

  const handleSetDeliveryMethod = (shipment: Spedizione, method: string) => {
    if (!onUpdateShipmentTag) return;
    const currentRawTags = (shipment.Tag || "").split(",").map((t) => t.trim()).filter(Boolean);
    const methods = ["Vinted", "Corriere", "A Mano Roma", "A Mano Napoli", "Consegna a mano"];
    const cleanedTags = currentRawTags.filter((t) => !methods.includes(t));
    if (method) {
      cleanedTags.push(method);
    }
    onUpdateShipmentTag(shipment.ID_Spedizione, cleanedTags.join(", "));
  };

  const handleSaveAddress = async (shipment: Spedizione, cart?: Carrello) => {
    if (!cart) {
      alert("Carrello associato non trovato.");
      return;
    }
    if (!onSaveCart) return;
    setIsSavingAddress(true);
    try {
      const cartDettagli = dettagliCarrelli.filter((d) => d.ID_Carrello === cart.ID_Carrello);
      const cartGrading = oggettiInGrading.filter((g) => g.ID_Carrello === cart.ID_Carrello);
      await onSaveCart({ ...cart, Indirizzo_Spedizione: editingAddressValue.trim() }, cartDettagli, cartGrading);
      setEditingShipmentId(null);
    } catch (err) {
      console.error("Errore salvataggio indirizzo:", err);
    } finally {
      setIsSavingAddress(false);
    }
  };

  const handleSendWhatsApp = (shipment: Spedizione, cart?: Carrello) => {
    const customerName = cart?.Nome_Cliente || shipment.Nome_Cliente || "Cliente";
    const phone = cart?.Telefono || shipment.Telefono || "";
    const address = cart?.Indirizzo_Spedizione || shipment.Indirizzo_Spedizione || "";

    const allRawTags = [
      ...(cart?.Tag ? cart.Tag.split(",") : []),
      ...(shipment.Tag ? shipment.Tag.split(",") : []),
    ].map((t) => t.trim()).filter(Boolean);
    const tagsList = Array.from(new Set(allRawTags));

    let msg = `----------------------------------------\n`;
    msg += `Ciao *${customerName}*! 👋\n`;
    msg += `Ecco i dettagli della tua spedizione:\n\n`;

    if (shipment.Oggetti_Spediti) {
      msg += `📦 *OGGETTI IN SPEDIZIONE:*\n`;
      const items = shipment.Oggetti_Spediti.split(",").map((i) => i.trim()).filter(Boolean);
      items.forEach((item) => {
        msg += `- *${item}*\n`;
      });
      msg += `\n`;
    }

    msg += `📍 *DESTINAZIONE & MODALITÀ:*\n`;
    if (address.trim()) {
      msg += `- *Indirizzo:* ${address.trim()}\n`;
    } else {
      const vintedTag = tagsList.find((t) => t.toLowerCase().includes("vinted"));
      const napoliTag = tagsList.find((t) => t.toLowerCase().includes("napoli"));
      const romaTag = tagsList.find((t) => t.toLowerCase().includes("roma"));
      const manoTag = tagsList.find((t) => t.toLowerCase().includes("mano") || t.toLowerCase().includes("ritiro"));

      if (vintedTag) {
        msg += `- *Modalità:* Spedizione Vinted (${vintedTag})\n`;
      } else if (napoliTag) {
        msg += `- *Modalità:* Consegna a mano Napoli (${napoliTag})\n`;
      } else if (romaTag) {
        msg += `- *Modalità:* Consegna a mano Roma (${romaTag})\n`;
      } else if (manoTag) {
        msg += `- *Modalità:* Consegna a mano (${manoTag})\n`;
      } else if (tagsList.length > 0) {
        msg += `- *Modalità / Tag:* ${tagsList.join(", ")}\n`;
      } else {
        msg += `- *Modalità:* Consegna a mano / Indirizzo non specificato\n`;
      }
    }
    msg += `\n`;

    msg += `🚚 *INFORMAZIONI SPEDIZIONE:*\n`;
    msg += `- *Stato Consegna:* *${shipment.Stato_Consegna || "In gestione"}*\n`;
    if (shipment.Tracking && shipment.Tracking !== "N/A") {
      msg += `- *Codice Tracking:* *${shipment.Tracking}*\n`;
      const trackUrl = getTrackingUrl(shipment.Tracking);
      if (trackUrl) {
        msg += `- *Link Tracciamento:* ${trackUrl}\n`;
      }
    }
    if (shipment.Data_Spedizione) {
      msg += `- *Data Spedizione:* ${shipment.Data_Spedizione}\n`;
    }
    msg += `\n`;
    msg += `----------------------------------------\n`;
    msg += `Per qualsiasi dubbio o domanda contattami.\nGrazie mille! ✨`;

    sendWhatsAppMessage(msg, phone);
  };

  const filtered = useMemo(() => {
    return spedizioni
      .filter((s) => {
        let matchSearch = true;
        if (search.trim()) {
          const q = search.toLowerCase();
          matchSearch =
            s.ID_Spedizione.toLowerCase().includes(q) ||
            (s.Tracking && s.Tracking.toLowerCase().includes(q)) ||
            (s.Oggetti_Spediti && s.Oggetti_Spediti.toLowerCase().includes(q)) ||
            (s.Nome_Cliente && s.Nome_Cliente.toLowerCase().includes(q)) ||
            (s.Indirizzo_Spedizione && s.Indirizzo_Spedizione.toLowerCase().includes(q)) ||
            (s.Telefono && s.Telefono.toLowerCase().includes(q)) ||
            (s.Tag && s.Tag.toLowerCase().includes(q));
        }

        let matchStatus = true;
        if (activeTab === "da_gestire") {
          matchStatus =
            s.Stato_Consegna === "Preparazione Pacco" ||
            s.Stato_Consegna === "Consegna Pacco allo spedizioniere" ||
            s.Stato_Consegna === "Spedito";
        } else if (activeTab === "consegnate") {
          matchStatus = s.Stato_Consegna === "Consegnato";
        } else if (activeTab === "resi") {
          matchStatus = s.Stato_Consegna === "Reso in Lavorazione" || s.Stato_Consegna === "Reso Completato";
        }

        let matchOperator = true;
        const currentTags = (s.Tag || "").split(",").map((t) => t.trim());
        if (operatorFilter === "Giana") {
          matchOperator = currentTags.includes("Giana");
        } else if (operatorFilter === "Eto") {
          matchOperator = currentTags.includes("Eto");
        } else if (operatorFilter === "Paki") {
          matchOperator = currentTags.includes("Paki");
        } else if (operatorFilter === "unassigned") {
          matchOperator =
            !currentTags.includes("Giana") && !currentTags.includes("Eto") && !currentTags.includes("Paki");
        }

        return matchSearch && matchStatus && matchOperator;
      })
      .sort((a, b) => new Date(b.Data_Spedizione).getTime() - new Date(a.Data_Spedizione).getTime());
  }, [spedizioni, search, activeTab, operatorFilter]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);

  const paginatedShipments = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filtered, currentPage]);

  return {
    spedizioni,
    carrelli,
    dettagliCarrelli,
    magazzino,
    oggettiInGrading,
    search,
    setSearch,
    activeTab,
    setActiveTab,
    operatorFilter,
    setOperatorFilter,
    printingShipment,
    setPrintingShipment,
    editingShipmentId,
    setEditingShipmentId,
    uploadingShipmentId,
    setUploadingShipmentId,
    editingAddressValue,
    setEditingAddressValue,
    isSavingAddress,
    currentPage,
    setCurrentPage,
    totalPages,
    filtered,
    paginatedShipments,
    isShipmentPaid,
    handleToggleShipmentPaid,
    handleStartEditAddress,
    handleToggleOperatorTag,
    handleToggleSingleTag,
    handleSetDeliveryMethod,
    handleSaveAddress,
    handleSendWhatsApp,
  };
}
