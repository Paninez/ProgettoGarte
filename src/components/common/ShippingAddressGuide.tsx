import React, { useState, useEffect } from "react";
import {
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Phone,
  User,
  Mail,
  Sparkles,
  Info,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { AddressAutocompleteInput } from "./AddressAutocompleteInput";
import { parseAddressAndCustomer, getShippingValidation } from "../../lib/packlinkParser";

interface ShippingAddressGuideProps {
  customerName: string;
  setCustomerName?: (val: string) => void;
  phone: string;
  setPhone?: (val: string) => void;
  email?: string;
  setEmail?: (val: string) => void;
  address: string;
  setAddress: (val: string) => void;
  readOnly?: boolean;
  className?: string;
  compact?: boolean;
}

export function ShippingAddressGuide({
  customerName,
  setCustomerName,
  phone,
  setPhone,
  email = "",
  setEmail,
  address,
  setAddress,
  readOnly = false,
  className = "",
  compact = false,
}: ShippingAddressGuideProps) {
  const [showStructuredInputs, setShowStructuredInputs] = useState(false);

  // Validation state
  const validation = getShippingValidation(customerName, address, phone, email);
  const { parsed, isComplete, missingFields, hasName, hasStreet, hasCap, hasCity, hasProvince, hasPhone } = validation;

  // Local structured fields state
  const [street, setStreet] = useState(parsed.street || "");
  const [cap, setCap] = useState(parsed.postalCode || "");
  const [city, setCity] = useState(parsed.city || "");
  const [province, setProvince] = useState(parsed.province || "");

  // Update local structured fields when address changes externally
  useEffect(() => {
    setStreet(parsed.street || "");
    setCap(parsed.postalCode || "");
    setCity(parsed.city || "");
    setProvince(parsed.province || "");
  }, [address]);

  // Assemble full address from structured fields
  const handleUpdateStructured = (newStreet: string, newCap: string, newCity: string, newProv: string) => {
    setStreet(newStreet);
    setCap(newCap);
    setCity(newCity);
    setProvince(newProv);

    const parts: string[] = [];
    if (newStreet.trim()) parts.push(newStreet.trim());
    
    let locationPart = "";
    if (newCap.trim()) locationPart += newCap.trim() + " ";
    if (newCity.trim()) locationPart += newCity.trim();
    if (newProv.trim()) locationPart += ` (${newProv.trim().toUpperCase()})`;
    
    if (locationPart.trim()) parts.push(locationPart.trim());

    const assembled = parts.join(", ");
    setAddress(assembled);
  };

  return (
    <div className={`rounded-xl border border-slate-200 bg-slate-50/40 p-3 space-y-2.5 ${className}`}>
      {/* Header status bar */}
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs text-slate-600 font-medium flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 text-slate-400" />
          <span>Indirizzo di Spedizione</span>
          {isComplete && (
            <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded font-semibold">
              Completo
            </span>
          )}
        </div>

        {!readOnly && (
          <button
            type="button"
            onClick={() => setShowStructuredInputs(!showStructuredInputs)}
            className="text-[11px] font-medium text-slate-600 hover:text-indigo-600 flex items-center gap-1 bg-white hover:bg-slate-50 border border-slate-200 px-2 py-1 rounded-md shadow-2xs transition-colors cursor-pointer"
          >
            <span>{showStructuredInputs ? "Testo Unico" : "Campi Dettagliati"}</span>
            {showStructuredInputs ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        )}
      </div>

      {/* Editing section */}
      {!readOnly && (
        <div className="space-y-3 pt-1">
          {showStructuredInputs ? (
            /* Structured inputs view (Street, CAP, City, Prov) */
            <div className="bg-white p-3 rounded-xl border border-indigo-100 shadow-2xs space-y-2.5 animate-fade-in">
              <div className="text-[11px] font-bold text-indigo-900 flex items-center gap-1">
                <Info className="h-3.5 w-3.5 text-indigo-600" />
                <span>Compilazione guidata campi di spedizione:</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                <div className="sm:col-span-6">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Via e Numero Civico *
                  </label>
                  <input
                    type="text"
                    placeholder="Es: Via Roma 12"
                    value={street}
                    onChange={(e) => handleUpdateStructured(e.target.value, cap, city, province)}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    CAP (5 cifre) *
                  </label>
                  <input
                    type="text"
                    maxLength={5}
                    placeholder="00100"
                    value={cap}
                    onChange={(e) => handleUpdateStructured(street, e.target.value.replace(/\D/g, ""), city, province)}
                    className="w-full text-xs px-2 py-1.5 border border-slate-300 rounded-lg text-center font-mono font-bold outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Città / Comune *
                  </label>
                  <input
                    type="text"
                    placeholder="Roma"
                    value={city}
                    onChange={(e) => handleUpdateStructured(street, cap, e.target.value, province)}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                </div>

                <div className="sm:col-span-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Prov *
                  </label>
                  <input
                    type="text"
                    maxLength={2}
                    placeholder="RM"
                    value={province}
                    onChange={(e) => handleUpdateStructured(street, cap, city, e.target.value.toUpperCase())}
                    className="w-full text-xs px-1 py-1.5 border border-slate-300 rounded-lg text-center font-mono font-bold uppercase outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                </div>
              </div>

              <div className="text-[10px] text-slate-500 font-mono bg-slate-50 p-1.5 rounded border border-slate-200">
                Risultato assemblato: <strong className="text-slate-800">{address || "(Vuoto)"}</strong>
              </div>
            </div>
          ) : (
            /* Fast single input with Google Places Autocomplete */
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center justify-between">
                <span>Cerca o Inserisci Indirizzo Completo (Via, Civico, CAP, Città, Prov)</span>
                <span className="text-[10px] text-indigo-600 font-normal">Autocompletamento Google Maps attivo</span>
              </label>
              <AddressAutocompleteInput
                value={address}
                onChange={setAddress}
                placeholder="Es: Via Roma 12, 00100 Roma (RM)..."
                multiline={!compact}
                rows={compact ? 1 : 2}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
