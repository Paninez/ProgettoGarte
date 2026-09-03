import React, { useState } from "react";
import { Package, Award, Truck, MapPin, Search, AlertTriangle, Edit3 } from "lucide-react";
import { Carrello, DettaglioCarrello, OggettoMagazzino, GradingItem } from "../../types";
import { ShippingAddressGuide } from "../common/ShippingAddressGuide";
import { getShippingValidation } from "../../lib/packlinkParser";

interface ShipmentModalProps {
  selectedCart: Carrello;
  activeClientName: string;
  setActiveClientName?: (val: string) => void;
  activeClientAddress: string;
  setActiveClientAddress?: (val: string) => void;
  activeClientPhone: string;
  setActiveClientPhone?: (val: string) => void;
  activeClientEmail: string;
  setActiveClientEmail?: (val: string) => void;
  selectedItemIndexes: number[];
  activeCartItems: Omit<DettaglioCarrello, "ID_Carrello">[];
  magazzino: OggettoMagazzino[];
  selectedGradingIds: string[];
  activeGradingItems: GradingItem[];
  handleConfirmShipment: (e: React.FormEvent, shipmentType: string, tracking: string, shippingCost?: number) => void;
  shipmentLoading: boolean;
  setShowShipmentModal: (val: boolean) => void;
}

export const ShipmentModal: React.FC<ShipmentModalProps> = ({
  selectedCart,
  activeClientName,
  setActiveClientName,
  activeClientAddress,
  setActiveClientAddress,
  activeClientPhone,
  setActiveClientPhone,
  activeClientEmail,
  setActiveClientEmail,
  selectedItemIndexes,
  activeCartItems,
  magazzino,
  selectedGradingIds,
  activeGradingItems,
  handleConfirmShipment,
  shipmentLoading,
  setShowShipmentModal,
}) => {
  const [shipmentType, setShipmentType] = useState<string>("Corriere");
  const [trackingNumber, setTrackingNumber] = useState<string>("");
  const [shippingCost, setShippingCost] = useState<string>("");
  const [isEditingAddress, setIsEditingAddress] = useState<boolean>(false);

  const validation = getShippingValidation(
    activeClientName,
    activeClientAddress,
    activeClientPhone,
    activeClientEmail
  );

  const calculateShipmentTotals = () => {
    let totaleSpedizione = 0;
    let totalePagato = 0;

    selectedItemIndexes.forEach((idx) => {
      const item = activeCartItems[idx];
      if (item) {
        totaleSpedizione += item.Prezzo_Registrato || 0;
        if (item.Pagato_Singolarmente) {
          totalePagato += item.Prezzo_Registrato || 0;
        } else if (item.Acconto_Pagato) {
          totalePagato += item.Acconto_Pagato || 0;
        }
      }
    });

    selectedGradingIds.forEach((id) => {
      const g = activeGradingItems.find((item) => item.ID_Oggetto_Grading === id);
      if (g) {
        totaleSpedizione += g.Costo_Cliente || 0;
        if (g.Pagato_Singolarmente) {
          totalePagato += g.Costo_Cliente || 0;
        } else if (g.Acconto_Pagato) {
          totalePagato += g.Acconto_Pagato || 0;
        }
      }
    });

    return {
      totaleSpedizione,
      totalePagato,
      rimanenza: Math.max(0, totaleSpedizione - totalePagato),
    };
  };

  const selectedTotals = calculateShipmentTotals();

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-sans">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6">
        <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <Package className="h-6 w-6 text-indigo-600" />
            <span>Nuova Spedizione</span>
          </h2>
          <button
            onClick={() => setShowShipmentModal(false)}
            className="text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            ×
          </button>
        </div>

        {/* Guida Dati Spedizione & Destinatario */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
              Dati Destinatario & Spedizione
            </h3>
            {setActiveClientAddress && (
              <button
                type="button"
                onClick={() => setIsEditingAddress(!isEditingAddress)}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs hover:bg-indigo-50 transition-colors cursor-pointer"
              >
                <Edit3 className="h-3.5 w-3.5 text-indigo-500" />
                <span>{isEditingAddress ? "Chiudi Modifica" : "Modifica Dati"}</span>
              </button>
            )}
          </div>

          {isEditingAddress && setActiveClientAddress ? (
            <div className="space-y-3 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Nome Destinatario</label>
                  <input
                    type="text"
                    value={activeClientName}
                    onChange={(e) => setActiveClientName && setActiveClientName(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Telefono (Corriere)</label>
                  <input
                    type="text"
                    value={activeClientPhone}
                    onChange={(e) => setActiveClientPhone && setActiveClientPhone(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Email</label>
                  <input
                    type="email"
                    value={activeClientEmail}
                    onChange={(e) => setActiveClientEmail && setActiveClientEmail(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                </div>
              </div>

              <ShippingAddressGuide
                customerName={activeClientName}
                setCustomerName={setActiveClientName}
                phone={activeClientPhone}
                setPhone={setActiveClientPhone}
                email={activeClientEmail}
                setEmail={setActiveClientEmail}
                address={activeClientAddress}
                setAddress={setActiveClientAddress}
              />
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-3">
                <div>
                  <span className="block text-slate-400 text-xs font-bold mb-1">Nome</span>
                  <span className="font-semibold text-slate-700">{activeClientName || "Non specificato"}</span>
                </div>
                <div>
                  <span className="block text-slate-400 text-xs font-bold mb-1">Telefono</span>
                  <span className="font-semibold text-slate-700">{activeClientPhone || "Non specificato"}</span>
                </div>
                <div>
                  <span className="block text-slate-400 text-xs font-bold mb-1">Email</span>
                  <span className="font-semibold text-slate-700">{activeClientEmail || "Non specificata"}</span>
                </div>
                <div>
                  <span className="block text-slate-400 text-xs font-bold mb-1">Indirizzo</span>
                  <span className="font-semibold text-slate-700">{activeClientAddress || "Non specificato"}</span>
                </div>
              </div>

              {shipmentType === "Corriere" && (
                <div>
                  {validation.isComplete ? (
                    <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs font-semibold flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                      <span>Dati completi per etichetta corriere (CAP: {validation.parsed.postalCode}, {validation.parsed.city} {validation.parsed.province})</span>
                    </div>
                  ) : (
                    <div className="p-2.5 bg-amber-50 border border-amber-300 rounded-lg text-amber-900 text-xs flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                        <div>
                          <span className="font-bold block">Dati incompleti per corriere:</span>
                          <span className="text-[11px] text-amber-800">Mancano: {validation.missingFields.join(", ")}</span>
                        </div>
                      </div>
                      {setActiveClientAddress && (
                        <button
                          type="button"
                          onClick={() => setIsEditingAddress(true)}
                          className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[10px] font-bold uppercase transition-colors shrink-0 cursor-pointer"
                        >
                          Compila Ora
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mb-6">
          <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wide mb-3 flex items-center justify-between">
            <span>Riepilogo Articoli da Spedire</span>
            <span className="bg-indigo-100 text-indigo-700 py-0.5 px-2 rounded-full text-[10px]">
              {selectedItemIndexes.length + selectedGradingIds.length} elementi
            </span>
          </h3>
          <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-white text-xs px-3">
            {selectedItemIndexes.map((idx) => {
              const item = activeCartItems[idx];
              if (!item) return null;
              const product = magazzino.find((m) => m.ID_Oggetto === item.ID_Oggetto);
              return (
                <div key={`${item.ID_Oggetto}-${idx}`} className="py-2 flex items-center justify-between">
                  <span className="font-medium text-slate-700 truncate pr-4">
                    {product ? product.Nome : `Articolo sconosciuto (${item.ID_Oggetto})`}
                  </span>
                  <span className="font-mono text-slate-500 shrink-0 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                    ID: {item.ID_Oggetto}
                  </span>
                </div>
              );
            })}
            {(() => {
              const selectedGradingItems = activeGradingItems.filter((g) =>
                selectedGradingIds.includes(g.ID_Oggetto_Grading)
              );
              if (selectedGradingItems.length === 0) return null;
              return (
                <>
                  {selectedGradingItems.map((g, gIdx) => (
                    <div key={`${g!.ID_Oggetto_Grading}-${gIdx}`} className="py-2 flex justify-between items-center text-slate-700">
                      <span className="font-medium text-slate-800 flex items-center gap-1.5">
                        <Award className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                        <span>{g!.Nome_Carta} (Grading)</span>
                      </span>
                      <span className="font-mono text-emerald-700 bg-emerald-50 border border-emerald-100/50 px-2 py-0.5 rounded font-extrabold text-[10px]">
                        Gradata
                      </span>
                    </div>
                  ))}
                </>
              );
            })()}
          </div>
        </div>

        <form onSubmit={(e) => handleConfirmShipment(e, shipmentType, trackingNumber, parseFloat(shippingCost.replace(',','.')) || 0)} className="space-y-6">
          <div className="space-y-3">
            <label className="text-xs font-extrabold text-slate-700 block uppercase tracking-wide">
              Tipo di Spedizione *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div 
                onClick={() => setShipmentType("Corriere")}
                className={`relative border-2 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all ${shipmentType === "Corriere" ? "border-indigo-600 bg-indigo-50" : "border-slate-200 bg-white hover:border-indigo-300"}`}
              >
                <Truck className={`h-6 w-6 mb-2 ${shipmentType === "Corriere" ? "text-indigo-600" : "text-slate-400"}`} />
                <span className={`text-sm font-bold ${shipmentType === "Corriere" ? "text-indigo-800" : "text-slate-600"}`}>Corriere</span>
              </div>
              <div 
                onClick={() => setShipmentType("Vinted")}
                className={`relative border-2 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all ${shipmentType === "Vinted" ? "border-teal-600 bg-teal-50" : "border-slate-200 bg-white hover:border-teal-300"}`}
              >
                <Search className={`h-6 w-6 mb-2 ${shipmentType === "Vinted" ? "text-teal-600" : "text-slate-400"}`} />
                <span className={`text-sm font-bold ${shipmentType === "Vinted" ? "text-teal-800" : "text-slate-600"}`}>Vinted</span>
              </div>
              <div 
                onClick={() => setShipmentType("Consegna a mano")}
                className={`relative border-2 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all ${shipmentType === "Consegna a mano" ? "border-amber-600 bg-amber-50" : "border-slate-200 bg-white hover:border-amber-300"}`}
              >
                <MapPin className={`h-6 w-6 mb-2 ${shipmentType === "Consegna a mano" ? "text-amber-600" : "text-slate-400"}`} />
                <span className={`text-sm font-bold ${shipmentType === "Consegna a mano" ? "text-amber-800" : "text-slate-600"}`}>Consegna a mano</span>
              </div>
            </div>
          </div>

          <div className={`space-y-1 transition-opacity ${shipmentType === "Consegna a mano" ? "opacity-50 pointer-events-none" : "opacity-100"}`}>
            <label className="text-xs font-extrabold text-slate-700 block uppercase tracking-wide">Codice Tracking (Opzionale)</label>
            <input
              type="text"
              placeholder="Es. DHL-983173921"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              disabled={shipmentType === "Consegna a mano"}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 text-gray-900 bg-white"
            />
          </div>
          
          <div className={`space-y-1 transition-opacity ${shipmentType === "Consegna a mano" ? "opacity-50 pointer-events-none" : "opacity-100"}`}>
            <label className="text-xs font-extrabold text-slate-700 block uppercase tracking-wide">Costo Spedizione da Rimborsare (Opzionale)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">€</span>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={shippingCost}
                onChange={(e) => setShippingCost(e.target.value)}
                disabled={shipmentType === "Consegna a mano"}
                className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 text-gray-900 bg-white"
              />
            </div>
            <p className="text-[10px] text-slate-500 font-medium">L'importo che il cliente deve rimborsare per questa spedizione.</p>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
            <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-widest">Resoconto Finanziario Oggetti Spediti:</span>
            <div className="text-xs text-slate-600 flex justify-between">
              <span>Totale Oggetti Selezionati:</span>
              <span className="font-bold font-mono">€ {selectedTotals.totaleSpedizione.toFixed(2)}</span>
            </div>
            <div className="text-xs text-slate-600 flex justify-between">
              <span>Acconto Già Pagato:</span>
              <span className="font-bold font-mono">€ {selectedTotals.totalePagato.toFixed(2)}</span>
            </div>
            <div className="text-xs font-bold text-slate-800 flex justify-between pt-1 border-t border-slate-200 mt-1">
              <span>Rimanenza da Saldare:</span>
              <span className="font-mono text-sm">€ {selectedTotals.rimanenza.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex space-x-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowShipmentModal(false)}
              disabled={shipmentLoading}
              className="flex-1 py-3 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={shipmentLoading}
              className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-md shadow-indigo-100 flex items-center justify-center space-x-2"
            >
              {shipmentLoading ? (
                <span>Elaborazione...</span>
              ) : (
                <>
                  <Truck className="h-4 w-4" />
                  <span>Conferma Spedizione</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
