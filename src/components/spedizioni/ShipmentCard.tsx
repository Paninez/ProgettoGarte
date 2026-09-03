import React from "react";
import { Spedizione, Carrello, DettaglioCarrello, GradingItem, OggettoMagazzino } from "../../types";
import {
  Upload,
  Eye,
  CheckCircle,
  Box,
  Calendar,
  User,
  MapPin,
  Phone,
  Tag,
  MessageCircle,
  Printer,
  ExternalLink,
  X,
  ArrowLeft,
  Truck,
} from "lucide-react";
import { getTrackingUrl, SpedizioniProps } from "./spedizioniUtils";
import { AddressAutocompleteInput } from "../common/AddressAutocompleteInput";
import { ShippingAddressGuide } from "../common/ShippingAddressGuide";
import { getShippingValidation } from "../../lib/packlinkParser";

interface ShipmentCardProps {
  key?: React.Key;
  shipment: Spedizione;
  cart?: Carrello;
  dettagliCarrelli: DettaglioCarrello[];
  oggettiInGrading: GradingItem[];
  magazzino: OggettoMagazzino[];
  editingShipmentId: string | null;
  setEditingShipmentId: (id: string | null) => void;
  editingAddressValue: string;
  setEditingAddressValue: (val: string) => void;
  isSavingAddress: boolean;
  handleStartEditAddress: (shipmentId: string, currentAddr: string) => void;
  handleSaveAddress: (shipment: Spedizione, cart?: Carrello) => Promise<void>;
  isShipmentPaid: (shipmentId: string) => boolean;
  handleToggleShipmentPaid: (shipmentId: string) => void;
  handleToggleOperatorTag: (shipment: Spedizione, operator: "Giana" | "Eto" | "Paki") => void;
  handleToggleSingleTag: (shipment: Spedizione, tagToToggle: string) => void;
  handleSetDeliveryMethod: (shipment: Spedizione, method: string) => void;
  handleSendWhatsApp: (shipment: Spedizione, cart?: Carrello) => void;
  setPrintingShipment: (shipment: Spedizione) => void;
  uploadingShipmentId: string | null;
  setUploadingShipmentId: (id: string | null) => void;
  onUpdateShipmentStatus: SpedizioniProps["onUpdateShipmentStatus"];
  onUpdateShipmentTag?: SpedizioniProps["onUpdateShipmentTag"];
  onUpdateShipmentCost?: SpedizioniProps["onUpdateShipmentCost"];
  onNavigateToCart: SpedizioniProps["onNavigateToCart"];
  onReturnItem?: SpedizioniProps["onReturnItem"];
  onUploadShipmentPhotos?: SpedizioniProps["onUploadShipmentPhotos"];
}

export function ShipmentCard({
  shipment,
  cart,
  dettagliCarrelli,
  oggettiInGrading,
  magazzino,
  editingShipmentId,
  setEditingShipmentId,
  editingAddressValue,
  setEditingAddressValue,
  isSavingAddress,
  handleStartEditAddress,
  handleSaveAddress,
  isShipmentPaid,
  handleToggleShipmentPaid,
  handleToggleOperatorTag,
  handleToggleSingleTag,
  handleSetDeliveryMethod,
  handleSendWhatsApp,
  setPrintingShipment,
  uploadingShipmentId,
  setUploadingShipmentId,
  onUpdateShipmentStatus,
  onUpdateShipmentTag,
  onUpdateShipmentCost,
  onNavigateToCart,
  onReturnItem,
  onUploadShipmentPhotos,
}: ShipmentCardProps) {
  const customerName = cart?.Nome_Cliente || shipment.Nome_Cliente || "Cliente Sconosciuto";
  const address = cart?.Indirizzo_Spedizione || shipment.Indirizzo_Spedizione || "";
  const phone = cart?.Telefono || shipment.Telefono || "";

  // Combine unique tags from both cart and shipment (excluding operator label tags)
  const allRawTags = [
    ...(cart?.Tag ? cart.Tag.split(",") : []),
    ...(shipment.Tag ? shipment.Tag.split(",") : []),
  ]
    .map((t) => t.trim())
    .filter((t) => Boolean(t) && !["Giana", "Eto", "Paki"].includes(t));
  const tagsList = Array.from(new Set(allRawTags));

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
      <div>
        {/* Destinatario Name - In Grande e ben leggibile */}
        <div className="mb-3 bg-gradient-to-r from-indigo-50 via-slate-50 to-white dark:from-slate-800 dark:via-slate-800 dark:to-slate-900 p-3.5 rounded-xl border border-indigo-100 dark:border-slate-700 shadow-2xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-extrabold text-indigo-500 uppercase tracking-widest block">
              Destinatario
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleSendWhatsApp(shipment, cart)}
                className="flex items-center gap-1 px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold tracking-wider transition-all shadow-2xs cursor-pointer active:scale-95"
                title="Invia info spedizione via WhatsApp"
              >
                <MessageCircle className="h-3 w-3" />
                <span>WhatsApp</span>
              </button>
              <button
                onClick={() => setPrintingShipment(shipment)}
                className="flex items-center gap-1 px-2 py-0.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold tracking-wider transition-all shadow-2xs cursor-pointer active:scale-95"
                title="Stampa Etichetta Spedizione"
              >
                <Printer className="h-3 w-3" />
                <span>Etichetta</span>
              </button>
            </div>
          </div>
          <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <span>{customerName}</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[11px] font-bold text-slate-400">ID Spedizione:</span>
            <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 bg-white/80 dark:bg-slate-700 px-1.5 py-0.5 rounded border border-slate-200/60 dark:border-slate-600">
              {shipment.ID_Spedizione}
            </span>
          </div>
        </div>

        <div className="flex justify-between items-start mb-3 gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
              {shipment.ID_Carrello}
            </span>
            <span
              className={`text-xs font-extrabold px-2.5 py-1 rounded-full ${
                shipment.Stato_Consegna === "Consegnato"
                  ? "bg-emerald-100 text-emerald-800"
                  : shipment.Stato_Consegna === "Spedito"
                  ? "bg-purple-100 text-purple-800"
                  : shipment.Stato_Consegna === "Consegna Pacco allo spedizioniere"
                  ? "bg-amber-100 text-amber-800"
                  : shipment.Stato_Consegna.includes("Reso")
                  ? "bg-rose-100 text-rose-800"
                  : "bg-indigo-100 text-indigo-800"
              }`}
            >
              {shipment.Stato_Consegna}
            </span>
          </div>

          {/* Quick Operator Label Selector */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            {["Giana", "Eto", "Paki"].map((op) => {
              const active = (shipment.Tag || "").split(",").map((t) => t.trim()).includes(op);
              return (
                <button
                  key={op}
                  type="button"
                  onClick={() => handleToggleOperatorTag(shipment, op as any)}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                    active
                      ? op === "Giana"
                        ? "bg-rose-600 text-white shadow-2xs scale-105"
                        : op === "Eto"
                        ? "bg-sky-600 text-white shadow-2xs scale-105"
                        : "bg-purple-600 text-white shadow-2xs scale-105"
                      : "text-slate-400 hover:text-slate-700"
                  }`}
                >
                  {op}
                </button>
              );
            })}
          </div>
        </div>

        {/* Multi-step progress bar */}
        {shipment.Stato_Consegna !== "Reso in Lavorazione" && shipment.Stato_Consegna !== "Reso Completato" && (
          <div className="relative mb-5 px-1 py-1">
            <div className="absolute top-1/2 left-4 right-4 -translate-y-1/2 h-1 bg-slate-200 dark:bg-slate-700 rounded-full z-0" />
            <div
              className={`absolute top-1/2 left-4 -translate-y-1/2 h-1 rounded-full z-0 transition-all duration-300 ${
                shipment.Stato_Consegna === "Preparazione Pacco"
                  ? "w-1/6 bg-indigo-500"
                  : shipment.Stato_Consegna === "Consegna Pacco allo spedizioniere"
                  ? "w-1/2 bg-amber-500"
                  : shipment.Stato_Consegna === "Spedito"
                  ? "w-5/6 bg-purple-500"
                  : "w-[calc(100%-2rem)] bg-emerald-500"
              }`}
            />
            <div className="relative flex justify-between items-center z-10">
              <div className="relative flex flex-col items-center justify-center gap-2 z-10 w-1/4">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    shipment.Stato_Consegna === "Preparazione Pacco" ||
                    shipment.Stato_Consegna === "Consegna Pacco allo spedizioniere" ||
                    shipment.Stato_Consegna === "Spedito" ||
                    shipment.Stato_Consegna === "Consegnato"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-slate-200 text-slate-500"
                  }`}
                >
                  <Box className="w-3 h-3" />
                </div>
                <span
                  className={`text-[9px] font-bold uppercase tracking-wider text-center ${
                    shipment.Stato_Consegna === "Preparazione Pacco" ? "text-indigo-600 font-black" : "text-slate-500"
                  }`}
                >
                  Prep.
                </span>
              </div>
              <div className="relative flex flex-col items-center justify-center gap-2 z-10 w-1/4">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    shipment.Stato_Consegna === "Consegna Pacco allo spedizioniere" ||
                    shipment.Stato_Consegna === "Spedito" ||
                    shipment.Stato_Consegna === "Consegnato"
                      ? "bg-amber-500 text-white shadow-sm"
                      : "bg-slate-200 text-slate-500"
                  }`}
                >
                  <User className="w-3 h-3" />
                </div>
                <span
                  className={`text-[9px] font-bold uppercase tracking-wider text-center ${
                    shipment.Stato_Consegna === "Consegna Pacco allo spedizioniere" ? "text-amber-600 font-black" : "text-slate-500"
                  }`}
                >
                  Spediz.
                </span>
              </div>
              <div className="relative flex flex-col items-center justify-center gap-2 z-10 w-1/4">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    shipment.Stato_Consegna === "Spedito" || shipment.Stato_Consegna === "Consegnato"
                      ? "bg-purple-600 text-white shadow-sm"
                      : "bg-slate-200 text-slate-500"
                  }`}
                >
                  <Truck className="w-3 h-3" />
                </div>
                <span
                  className={`text-[9px] font-bold uppercase tracking-wider text-center ${
                    shipment.Stato_Consegna === "Spedito" ? "text-purple-600 font-black" : "text-slate-500"
                  }`}
                >
                  In Viaggio
                </span>
              </div>
              <div className="relative flex flex-col items-center justify-center gap-2 z-10 w-1/4">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    shipment.Stato_Consegna === "Consegnato"
                      ? "bg-emerald-500 text-white shadow-sm"
                      : "bg-slate-200 text-slate-500"
                  }`}
                >
                  <CheckCircle className="w-3 h-3" />
                </div>
                <span
                  className={`text-[9px] font-bold uppercase tracking-wider text-center ${
                    shipment.Stato_Consegna === "Consegnato" ? "text-emerald-600" : "text-slate-500"
                  }`}
                >
                  Arrivato
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3 mb-5">
          {/* Indirizzo Spedizione con Modifica */}
          <div className="bg-slate-50/90 p-3 rounded-xl border border-slate-200 space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                <span>Indirizzo Spedizione</span>
              </div>
              {editingShipmentId !== shipment.ID_Spedizione && (
                <button
                  type="button"
                  onClick={() => handleStartEditAddress(shipment.ID_Spedizione, address)}
                  className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded border border-indigo-200 transition-colors flex items-center gap-1 cursor-pointer"
                  title="Modifica indirizzo di spedizione"
                >
                  <span>{address ? "Modifica" : "+ Inserisci"}</span>
                </button>
              )}
            </div>

            {editingShipmentId === shipment.ID_Spedizione ? (
              <div className="space-y-2 pt-1">
                <ShippingAddressGuide
                  customerName={customerName}
                  phone={phone}
                  address={editingAddressValue}
                  setAddress={setEditingAddressValue}
                  compact={true}
                />
                <div className="flex items-center gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setEditingShipmentId(null)}
                    className="px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded transition-colors cursor-pointer"
                    disabled={isSavingAddress}
                  >
                    Annulla
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveAddress(shipment, cart)}
                    disabled={isSavingAddress}
                    className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-2xs flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isSavingAddress ? "Salvataggio..." : "Salva Indirizzo"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="font-semibold text-slate-800 text-xs flex items-start justify-between gap-2">
                  {address && address.trim() ? (
                    <>
                      <p className="whitespace-pre-wrap flex-1 min-w-0">{address.trim()}</p>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address.trim())}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-200/80 transition-colors shrink-0 flex items-center gap-0.5"
                        title="Apri su Google Maps"
                      >
                        <span>Mappa</span>
                        <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    </>
                  ) : (
                    <span className="text-rose-600 italic font-medium text-xs block py-0.5">
                      ⚠️ Nessun indirizzo specificato
                    </span>
                  )}
                </div>

                {(() => {
                  const isCorriere = (shipment.Tag || "").includes("Corriere") || (cart?.Tag || "").includes("Corriere") || (!((shipment.Tag || "").includes("Vinted") || (shipment.Tag || "").includes("Consegna a Mano")));
                  if (!isCorriere) return null;
                  const val = getShippingValidation(customerName, address, phone, cart?.Email);
                  if (val.isComplete) {
                    return (
                      <div className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-flex items-center gap-1">
                        <CheckCircle className="h-3 w-3 text-emerald-600" />
                        <span>Pronto per etichetta (CAP {val.parsed.postalCode} {val.parsed.province})</span>
                      </div>
                    );
                  }
                  return (
                    <div className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-300 flex items-center justify-between gap-1">
                      <span>⚠️ Dati incompleti: {val.missingFields.join(", ")}</span>
                      <button
                        type="button"
                        onClick={() => handleStartEditAddress(shipment.ID_Spedizione, address)}
                        className="underline hover:text-amber-950 font-bold ml-1"
                      >
                        Correggi
                      </button>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          {/* Telefono */}
          {phone && (
            <div className="flex items-center gap-2 text-xs text-slate-600 px-1">
              <Phone className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span className="font-medium text-slate-500">Tel:</span>
              <a href={`tel:${phone}`} className="font-bold text-indigo-600 hover:underline">
                {phone}
              </a>
            </div>
          )}

          <div className="flex items-center gap-2 text-xs text-slate-600 px-1 pt-1">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-slate-500">Data:</span>
            <span className="font-semibold text-slate-700">{shipment.Data_Spedizione}</span>
          </div>

          {/* Reminder Spedizione Pagata / Da Pagare & Costo */}
          <div className="flex flex-col gap-2 pt-2 pb-2 border-t border-b border-dashed border-slate-200 my-2">
            <div className="flex items-center justify-between gap-2 text-xs px-1">
              <span className="text-slate-500 font-medium">Stato Rimborso:</span>
              <button
                onClick={() => handleToggleShipmentPaid(shipment.ID_Spedizione)}
                className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider transition-all border flex items-center gap-1 cursor-pointer select-none ${
                  isShipmentPaid(shipment.ID_Spedizione)
                    ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                    : "bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isShipmentPaid(shipment.ID_Spedizione) ? "bg-emerald-500" : "bg-rose-500"
                  }`}
                />
                {isShipmentPaid(shipment.ID_Spedizione) ? "già pagata" : "da pagare spedizione"}
              </button>
            </div>

            <div className="flex items-center justify-between gap-2 text-xs px-1">
              <span className="text-slate-500 font-medium">Costo (da rimborsare):</span>
              <div className="flex items-center gap-1">
                <span className="font-bold text-slate-700">
                  €{Number(shipment.Costo_Spedizione || 0).toFixed(2)}
                </span>
                {onUpdateShipmentCost && (
                  <button
                    onClick={() => {
                      const res = prompt(
                        "Inserisci costo spedizione da rimborsare (€):",
                        (shipment.Costo_Spedizione || 0).toString()
                      );
                      if (res !== null) {
                        const val = parseFloat(res.replace(",", "."));
                        if (!isNaN(val)) onUpdateShipmentCost(shipment.ID_Spedizione, val);
                      }
                    }}
                    className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-1.5 py-0.5 rounded border border-indigo-200 cursor-pointer"
                  >
                    Modifica
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Delivery Method selector & Tags */}
          <div className="space-y-2 pt-1 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs px-1">
              <span className="text-slate-500 font-medium flex items-center gap-1">
                <Truck className="h-3.5 w-3.5 text-slate-400" />
                <span>Modalità Spedizione:</span>
              </span>
              <select
                value={
                  tagsList.find((t) =>
                    ["Vinted", "Corriere", "A Mano Roma", "A Mano Napoli", "Consegna a mano"].includes(t)
                  ) || shipment.Corriere || ""
                }
                onChange={(e) => handleSetDeliveryMethod(shipment, e.target.value)}
                className="text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="">Non specificata</option>
                <option value="Corriere">Corriere</option>
                <option value="Vinted">Vinted</option>
                <option value="A Mano Roma">A Mano Roma</option>
                <option value="A Mano Napoli">A Mano Napoli</option>
                <option value="Consegna a mano">Consegna a mano</option>
              </select>
            </div>

            {/* Tags Pills */}
            <div className="flex flex-wrap items-center gap-1 px-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-0.5 mr-1">
                <Tag className="h-3 w-3" />
                <span>Tag:</span>
              </span>
              {tagsList.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md border border-slate-200 group"
                >
                  <span>{tag}</span>
                  {onUpdateShipmentTag && (
                    <button
                      type="button"
                      onClick={() => handleToggleSingleTag(shipment, tag)}
                      className="text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                      title="Rimuovi tag"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  )}
                </span>
              ))}
              {onUpdateShipmentTag && (
                <button
                  type="button"
                  onClick={() => {
                    const newTag = prompt("Inserisci nuovo tag per la spedizione:");
                    if (newTag && newTag.trim()) {
                      handleToggleSingleTag(shipment, newTag.trim());
                    }
                  }}
                  className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-1.5 py-0.5 rounded border border-indigo-200 transition-colors cursor-pointer"
                >
                  + Tag
                </button>
              )}
            </div>
          </div>

          {/* Tracking */}
          {shipment.Tracking && shipment.Tracking !== "N/A" && (
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
              <span className="font-bold text-slate-500 block mb-1">Codice Tracking:</span>
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono font-bold text-indigo-600 break-all">
                  {shipment.Tracking}
                </span>
                {(() => {
                  const trackUrl = getTrackingUrl(shipment.Tracking);
                  if (trackUrl) {
                    return (
                      <a
                        href={trackUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors shrink-0"
                      >
                        <span>Traccia</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    );
                  }
                  return null;
                })()}
              </div>
            </div>
          )}

          {/* Oggetti Spediti */}
          <div className="text-xs">
            <span className="font-bold text-slate-500 block mb-1">Contenuto Spedizione:</span>
            <div className="bg-white border border-slate-200 rounded-xl p-2 max-h-40 overflow-y-auto custom-scrollbar">
              {(() => {
                const sDetails = dettagliCarrelli.filter(
                  (d) => d.ID_Carrello === shipment.ID_Carrello
                );
                const sGrading = oggettiInGrading.filter(
                  (g) => g.ID_Carrello === shipment.ID_Carrello
                );

                if (sDetails.length === 0 && sGrading.length === 0) {
                  return shipment.Oggetti_Spediti ? (
                    <ul className="space-y-1">
                      {shipment.Oggetti_Spediti.split(",").map((item, i) => (
                        <li
                          key={i}
                          className="bg-slate-50 border border-slate-150 p-2 rounded-lg text-slate-700 text-xs font-medium"
                        >
                          {item.trim()}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className="italic text-xs text-slate-400">Nessun dettaglio</span>
                  );
                }

                return (
                  <ul className="space-y-1 mt-1 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
                    {sDetails.map((item, i) => {
                      const info = magazzino.find((m) => m.ID_Oggetto === item.ID_Oggetto);
                      return (
                        <li
                          key={`d-${i}`}
                          className={`bg-slate-50 border p-2 rounded-lg text-xs font-medium flex items-center justify-between gap-2 ${
                            item.Reso
                              ? "border-rose-200 bg-rose-50 text-rose-700 opacity-80"
                              : "border-slate-150 text-slate-700"
                          }`}
                        >
                          <div className="flex-1 truncate">
                            {item.Reso ? <span className="font-bold mr-1">[RESO]</span> : null}
                            {info ? info.Nome : "Articolo"} (ID: {item.ID_Oggetto})
                          </div>
                          {!item.Reso && onReturnItem && shipment.Stato_Consegna === "Consegnato" && (
                            <button
                              onClick={() => {
                                onReturnItem(shipment.ID_Spedizione, item.ID_Oggetto, false);
                              }}
                              className="text-[9px] font-bold text-rose-600 bg-rose-100 hover:bg-rose-200 px-1.5 py-0.5 rounded transition-colors shrink-0 cursor-pointer"
                              title="Effettua il reso di questo articolo"
                            >
                              Reso
                            </button>
                          )}
                        </li>
                      );
                    })}
                    {sGrading.map((g, i) => (
                      <li
                        key={`g-${i}`}
                        className={`bg-slate-50 border p-2 rounded-lg text-xs font-medium flex items-center justify-between gap-2 ${
                          g.Reso
                            ? "border-rose-200 bg-rose-50 text-rose-700 opacity-80"
                            : "border-slate-150 text-slate-700"
                        }`}
                      >
                        <div className="flex-1 truncate">
                          {g.Reso ? <span className="font-bold mr-1">[RESO]</span> : null}
                          {g.Nome_Carta} (Grading, ID: {g.ID_Oggetto_Grading})
                        </div>
                        {!g.Reso && onReturnItem && shipment.Stato_Consegna === "Consegnato" && (
                          <button
                            onClick={() => {
                              onReturnItem(shipment.ID_Spedizione, g.ID_Oggetto_Grading, true);
                            }}
                            className="text-[9px] font-bold text-rose-600 bg-rose-100 hover:bg-rose-200 px-1.5 py-0.5 rounded transition-colors shrink-0 cursor-pointer"
                            title="Effettua il reso di questa carta in grading"
                          >
                            Reso
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                );
              })()}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3.5 mt-auto">
        <button
          onClick={() => handleSendWhatsApp(shipment, cart)}
          className="flex-1 sm:flex-none px-3.5 py-2.5 min-h-[40px] bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-2xs active:scale-95 cursor-pointer"
          title="Invia dettagli spedizione via WhatsApp"
        >
          <MessageCircle className="h-4 w-4" />
          <span>WhatsApp</span>
        </button>

        <button
          onClick={() => setPrintingShipment(shipment)}
          className="flex-1 sm:flex-none px-3.5 py-2.5 min-h-[40px] bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-2xs active:scale-95 cursor-pointer border border-indigo-500/30"
          title="Stampa subito l'etichetta di spedizione"
        >
          <Printer className="h-4 w-4" />
          <span>Stampa Etichetta</span>
        </button>

        <button
          onClick={() => onNavigateToCart(shipment.ID_Carrello)}
          className="flex-1 sm:flex-none px-3.5 py-2.5 min-h-[40px] bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-colors text-center flex items-center justify-center cursor-pointer border border-indigo-200"
        >
          Vedi Carrello
        </button>

        {shipment.Link_Foto_Oggetti && shipment.Link_Foto_Oggetti !== "Consegna a mano" && (
          <button
            onClick={() => {
              const urls = shipment.Link_Foto_Oggetti.split(",");
              urls.forEach((url) => window.open(url.trim(), "_blank"));
            }}
            className="flex-1 sm:flex-none px-3.5 py-2.5 min-h-[40px] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors text-center flex items-center justify-center cursor-pointer border border-slate-300"
            title="Vedi Foto Controllo Qualità"
          >
            <Eye className="h-4 w-4 mr-1.5" />
            <span>Vedi Foto</span>
          </button>
        )}

        {onUploadShipmentPhotos && (
          <label
            className={`flex-1 sm:flex-none px-3.5 py-2.5 min-h-[40px] bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-colors text-center flex items-center justify-center cursor-pointer border border-slate-200 ${
              uploadingShipmentId === shipment.ID_Spedizione ? "opacity-50 pointer-events-none" : ""
            }`}
            title="Aggiungi Foto QC"
          >
            <Upload className="h-4 w-4 mr-1.5" />
            <span>
              {uploadingShipmentId === shipment.ID_Spedizione ? "Caricamento..." : "Aggiungi Foto"}
            </span>
            <input
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                if (e.target.files && onUploadShipmentPhotos) {
                  setUploadingShipmentId(shipment.ID_Spedizione);
                  try {
                    await onUploadShipmentPhotos(
                      shipment.ID_Spedizione,
                      shipment.ID_Carrello,
                      Array.from(e.target.files)
                    );
                  } catch (err: any) {
                    alert(err.message || err);
                  } finally {
                    setUploadingShipmentId(null);
                  }
                }
              }}
            />
          </label>
        )}

        {shipment.Stato_Consegna === "Preparazione Pacco" && (
          <button
            onClick={() => {
              onUpdateShipmentStatus(
                shipment.ID_Spedizione,
                shipment.ID_Carrello,
                "Consegna Pacco allo spedizioniere"
              );
            }}
            className="w-full sm:flex-1 px-3.5 py-2.5 min-h-[40px] bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl text-xs font-extrabold transition-colors flex justify-center items-center gap-1.5 cursor-pointer border border-amber-200"
          >
            <User className="h-4 w-4" />
            Consegna Corriere
          </button>
        )}

        {shipment.Stato_Consegna === "Consegna Pacco allo spedizioniere" && (
          <button
            onClick={() => {
              onUpdateShipmentStatus(shipment.ID_Spedizione, shipment.ID_Carrello, "Spedito");
            }}
            className="w-full sm:flex-1 px-3.5 py-2.5 min-h-[40px] bg-purple-50 hover:bg-purple-100 text-purple-800 rounded-xl text-xs font-extrabold transition-colors flex justify-center items-center gap-1.5 cursor-pointer border border-purple-200"
          >
            <Truck className="h-4 w-4" />
            Segna Spedito
          </button>
        )}

        {shipment.Stato_Consegna === "Spedito" && (
          <button
            onClick={() => {
              onUpdateShipmentStatus(shipment.ID_Spedizione, shipment.ID_Carrello, "Consegnato");
            }}
            className="w-full sm:flex-1 px-3.5 py-2.5 min-h-[40px] bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-extrabold transition-colors flex justify-center items-center gap-1.5 cursor-pointer border border-emerald-200"
          >
            <CheckCircle className="h-4 w-4" />
            Segna Consegnato
          </button>
        )}

        {shipment.Stato_Consegna === "Consegnato" && (
          <button
            onClick={() => {
              onUpdateShipmentStatus(
                shipment.ID_Spedizione,
                shipment.ID_Carrello,
                "Reso in Lavorazione"
              );
            }}
            className="w-full sm:flex-1 px-3.5 py-2.5 min-h-[40px] bg-rose-50 hover:bg-rose-100 text-rose-800 rounded-xl text-xs font-extrabold transition-colors flex justify-center items-center gap-1.5 cursor-pointer border border-rose-200"
          >
            <ArrowLeft className="h-4 w-4" />
            Avvia Reso
          </button>
        )}

        {shipment.Stato_Consegna === "Reso in Lavorazione" && (
          <div className="w-full sm:flex-1 flex gap-2">
            <button
              onClick={() => {
                onUpdateShipmentStatus(
                  shipment.ID_Spedizione,
                  shipment.ID_Carrello,
                  "Reso Completato"
                );
              }}
              className="flex-1 px-3.5 py-2.5 min-h-[40px] bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-extrabold transition-colors flex justify-center items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <CheckCircle className="h-4 w-4" />
              Completa Reso
            </button>
            <button
              onClick={() => {
                onUpdateShipmentStatus(
                  shipment.ID_Spedizione,
                  shipment.ID_Carrello,
                  "Consegnato"
                );
              }}
              className="px-3 py-2.5 min-h-[40px] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors flex justify-center items-center cursor-pointer border border-slate-300"
              title="Annulla Reso"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
