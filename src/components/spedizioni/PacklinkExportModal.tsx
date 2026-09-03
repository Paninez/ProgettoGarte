import React, { useState, useMemo } from "react";
import {
  X,
  Truck,
  FileSpreadsheet,
  Download,
  Copy,
  Check,
  AlertTriangle,
  ExternalLink,
  Edit2,
  RefreshCw,
  Box,
  Zap,
} from "lucide-react";
import { Spedizione, Carrello, DettaglioCarrello, GradingItem } from "../../types";
import { useDatabase } from "../../context/DatabaseContext";
import { parseAddressAndCustomer, formatPacklinkCsv } from "../../lib/packlinkParser";
import { exportPacklinkShipmentsToSheet } from "../../lib/googleApi";

interface PacklinkExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveCart?: (
    cart: Carrello,
    dettagli: DettaglioCarrello[],
    grading?: GradingItem[],
    silent?: boolean
  ) => Promise<void>;
}

export function PacklinkExportModal({
  isOpen,
  onClose,
  onSaveCart,
}: PacklinkExportModalProps) {
  const {
    spedizioni,
    carrelli,
    dettagli,
    oggettiInGrading,
    spreadsheetId,
    token,
    addSafetyLog,
  } = useDatabase();

  const [selectedShipmentIds, setSelectedShipmentIds] = useState<string[]>([]);
  const [hasInitializedSelection, setHasInitializedSelection] = useState(false);

  // Parcel defaults
  const [defaultWeight, setDefaultWeight] = useState<number>(0.5);
  const [defaultLength, setDefaultLength] = useState<number>(20);
  const [defaultWidth, setDefaultWidth] = useState<number>(15);
  const [defaultHeight, setDefaultHeight] = useState<number>(5);
  const [defaultContent, setDefaultContent] = useState<string>("Carte Collezionabili / Gadget");

  // Inline address editing
  const [editingShipmentId, setEditingShipmentId] = useState<string | null>(null);
  const [tempAddress, setTempAddress] = useState<string>("");
  const [isSavingAddress, setIsSavingAddress] = useState(false);

  // Status feedback
  const [isSyncingSheet, setIsSyncingSheet] = useState(false);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null);
  const [copiedCsv, setCopiedCsv] = useState(false);

  // Filter eligible courier shipments ready for label creation
  const eligibleShipments = useMemo(() => {
    return spedizioni.filter((s) => {
      // Must be courier
      const isCorriere =
        s.Corriere === "Corriere" ||
        (s.Tag || "").toLowerCase().includes("corriere") ||
        (s.Tag || "").toLowerCase().includes("spedizione con corriere");

      // Must be in initial packaging / label creation state
      const isLabelCreationState =
        s.Stato_Consegna === "Preparazione Pacco" ||
        s.Stato_Consegna === "Creazione Etichetta" ||
        !s.Stato_Consegna ||
        s.Stato_Consegna === "In attesa";

      return isCorriere && isLabelCreationState;
    });
  }, [spedizioni]);

  // Initialize selection when eligible shipments change or modal opens
  React.useEffect(() => {
    if (isOpen && !hasInitializedSelection) {
      setSelectedShipmentIds(eligibleShipments.map((s) => s.ID_Spedizione));
      setHasInitializedSelection(true);
    }
  }, [isOpen, eligibleShipments, hasInitializedSelection]);

  // Reset initialization when modal closes
  React.useEffect(() => {
    if (!isOpen) {
      setHasInitializedSelection(false);
      setSyncSuccessMsg(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggleSelect = (id: string) => {
    setSelectedShipmentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedShipmentIds.length === eligibleShipments.length) {
      setSelectedShipmentIds([]);
    } else {
      setSelectedShipmentIds(eligibleShipments.map((s) => s.ID_Spedizione));
    }
  };

  const selectedShipments = eligibleShipments.filter((s) =>
    selectedShipmentIds.includes(s.ID_Spedizione)
  );

  // Parse all eligible shipments with address diagnostics
  const parsedRows = eligibleShipments.map((s) => {
    const cart = carrelli.find((c) => c.ID_Carrello === s.ID_Carrello);
    const parsed = parseAddressAndCustomer(
      cart?.Nome_Cliente || s.Nome_Cliente,
      cart?.Indirizzo_Spedizione || s.Indirizzo_Spedizione,
      cart?.Telefono || s.Telefono,
      cart?.Email,
      s.Oggetti_Spediti || defaultContent
    );
    return {
      shipment: s,
      cart,
      parsed,
    };
  });

  // Handle saving inline address
  const handleSaveInlineAddress = async (shipment: Spedizione, cart?: Carrello) => {
    if (!cart || !onSaveCart) return;
    setIsSavingAddress(true);
    try {
      const cartDettagli = dettagli.filter((d) => d.ID_Carrello === cart.ID_Carrello);
      const cartGrading = oggettiInGrading.filter((g) => g.ID_Carrello === cart.ID_Carrello);
      await onSaveCart(
        { ...cart, Indirizzo_Spedizione: tempAddress.trim() },
        cartDettagli,
        cartGrading,
        true
      );
      setEditingShipmentId(null);
    } catch (err: any) {
      alert("Errore salvataggio indirizzo: " + err.message);
    } finally {
      setIsSavingAddress(false);
    }
  };

  // Export to Google Sheets (Tab: Export_Packlink)
  const handleExportToGoogleSheets = async () => {
    if (!spreadsheetId || !token) {
      alert("Database non connesso o token non disponibile.");
      return;
    }
    if (selectedShipments.length === 0) {
      alert("Seleziona almeno una spedizione da esportare.");
      return;
    }

    setIsSyncingSheet(true);
    setSyncSuccessMsg(null);
    try {
      const formattedRows = selectedShipments.map((s) => {
        const cart = carrelli.find((c) => c.ID_Carrello === s.ID_Carrello);
        const parsed = parseAddressAndCustomer(
          cart?.Nome_Cliente || s.Nome_Cliente,
          cart?.Indirizzo_Spedizione || s.Indirizzo_Spedizione,
          cart?.Telefono || s.Telefono,
          cart?.Email,
          s.Oggetti_Spediti || defaultContent
        );

        return [
          s.ID_Spedizione,
          s.ID_Carrello,
          s.Data_Spedizione || new Date().toISOString().split("T")[0],
          parsed.fullName,
          parsed.firstName,
          parsed.lastName,
          parsed.company || "",
          parsed.street,
          parsed.postalCode,
          parsed.city,
          parsed.province,
          parsed.country,
          parsed.phone,
          parsed.email,
          parsed.content || defaultContent,
          defaultWeight,
          defaultLength,
          defaultWidth,
          defaultHeight,
          s.Corriere || "Corriere",
          s.Stato_Consegna || "Preparazione Pacco",
          `Carrello: ${s.ID_Carrello} | ${s.Nome_Cliente}`,
        ];
      });

      const res = await exportPacklinkShipmentsToSheet(spreadsheetId, formattedRows, token);
      addSafetyLog(
        `Esportate ${res.rowCount} spedizioni con corriere nella scheda '${res.sheetTitle}' per Zapier / Packlink.`
      );
      setSyncSuccessMsg(
        `Scritte con successo ${res.rowCount} spedizioni nella scheda "${res.sheetTitle}"!`
      );
    } catch (err: any) {
      alert("Errore durante l'esportazione su Google Sheets: " + err.message);
    } finally {
      setIsSyncingSheet(false);
    }
  };

  // Download CSV for Packlink PRO
  const handleDownloadCsv = () => {
    if (selectedShipments.length === 0) {
      alert("Seleziona almeno una spedizione da esportare.");
      return;
    }

    const customPkgs: Record<string, any> = {};
    selectedShipments.forEach((s) => {
      customPkgs[s.ID_Spedizione] = {
        weight: defaultWeight,
        length: defaultLength,
        width: defaultWidth,
        height: defaultHeight,
      };
    });

    const csvContent = formatPacklinkCsv(selectedShipments, carrelli, customPkgs);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const today = new Date().toISOString().split("T")[0];
    link.setAttribute("href", url);
    link.setAttribute("download", `packlink_spedizioni_${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Copy CSV to clipboard
  const handleCopyCsv = () => {
    if (selectedShipments.length === 0) {
      alert("Seleziona almeno una spedizione.");
      return;
    }
    const customPkgs: Record<string, any> = {};
    selectedShipments.forEach((s) => {
      customPkgs[s.ID_Spedizione] = {
        weight: defaultWeight,
        length: defaultLength,
        width: defaultWidth,
        height: defaultHeight,
      };
    });
    const csvContent = formatPacklinkCsv(selectedShipments, carrelli, customPkgs);
    navigator.clipboard.writeText(csvContent);
    setCopiedCsv(true);
    setTimeout(() => setCopiedCsv(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-100">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
                <span>Estrazione Spedizioni Corriere (Packlink PRO / Zapier)</span>
                <span className="bg-indigo-100 text-indigo-800 text-xs px-2 py-0.5 rounded-full font-bold">
                  {eligibleShipments.length} pronte
                </span>
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Estrai le spedizioni con corriere nello stato "Creazione Etichetta / Preparazione Pacco" su Google Sheet o CSV.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 custom-scrollbar flex-1">
          {/* Quick Info & Parcel Defaults Settings */}
          <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-3.5 flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
            <div className="flex items-center gap-3">
              <Zap className="h-5 w-5 text-amber-500 shrink-0" />
              <div className="text-xs text-indigo-950">
                <span className="font-extrabold block">Integrazione Zapier / Packlink:</span>
                <span>
                  I dati vengono scritti nella scheda <strong>Export_Packlink</strong> del tuo Google Sheet o esportati in formato CSV pronto per Packlink PRO.
                </span>
              </div>
            </div>

            {/* Package Dimensions defaults */}
            <div className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-lg border border-indigo-200/60 text-xs font-semibold text-slate-700">
              <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1 mr-1">
                <Box className="h-3 w-3" /> Pacco default:
              </span>
              <label className="flex items-center gap-1">
                <span className="text-slate-500">Peso:</span>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  className="w-14 px-1.5 py-0.5 border border-slate-200 rounded text-center font-mono font-bold bg-slate-50 text-slate-800"
                  value={defaultWeight}
                  onChange={(e) => setDefaultWeight(parseFloat(e.target.value) || 0.5)}
                />
                <span>kg</span>
              </label>
              <span className="text-slate-300">|</span>
              <label className="flex items-center gap-1">
                <span className="text-slate-500">Dim (LxWxH):</span>
                <input
                  type="number"
                  className="w-10 px-1 py-0.5 border border-slate-200 rounded text-center font-mono text-xs bg-slate-50"
                  value={defaultLength}
                  onChange={(e) => setDefaultLength(parseInt(e.target.value) || 20)}
                />
                x
                <input
                  type="number"
                  className="w-10 px-1 py-0.5 border border-slate-200 rounded text-center font-mono text-xs bg-slate-50"
                  value={defaultWidth}
                  onChange={(e) => setDefaultWidth(parseInt(e.target.value) || 15)}
                />
                x
                <input
                  type="number"
                  className="w-10 px-1 py-0.5 border border-slate-200 rounded text-center font-mono text-xs bg-slate-50"
                  value={defaultHeight}
                  onChange={(e) => setDefaultHeight(parseInt(e.target.value) || 5)}
                />
                <span>cm</span>
              </label>
            </div>
          </div>

          {/* Success Banner if exported */}
          {syncSuccessMsg && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl flex items-center justify-between text-xs font-bold animate-fade-in">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>{syncSuccessMsg}</span>
              </div>
              {spreadsheetId && (
                <a
                  href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=0`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-900 bg-emerald-100 hover:bg-emerald-200 px-2 py-1 rounded transition-colors"
                >
                  <span>Apri Google Sheet</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          )}

          {/* Shipments List & Validation Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
            <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={
                      eligibleShipments.length > 0 &&
                      selectedShipmentIds.length === eligibleShipments.length
                    }
                    onChange={handleSelectAll}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span className="text-xs font-bold text-slate-700">
                    Seleziona Tutte ({selectedShipmentIds.length}/{eligibleShipments.length})
                  </span>
                </label>
              </div>
              <span className="text-[11px] text-slate-500 font-medium">
                Verifica che gli indirizzi siano completi di Via, Civico, CAP e Città
              </span>
            </div>

            {eligibleShipments.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <Truck className="h-8 w-8 mx-auto text-slate-300" />
                <p className="text-sm font-semibold">
                  Nessuna spedizione con corriere in attesa di etichetta trovata.
                </p>
                <p className="text-xs text-slate-400">
                  Le spedizioni appariranno qui quando mandi un carrello in spedizione con corriere.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto custom-scrollbar">
                {parsedRows.map(({ shipment, cart, parsed }) => {
                  const isSelected = selectedShipmentIds.includes(shipment.ID_Spedizione);
                  const isEditingThis = editingShipmentId === shipment.ID_Spedizione;

                  return (
                    <div
                      key={shipment.ID_Spedizione}
                      className={`p-3.5 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                        isSelected ? "bg-indigo-50/20" : "bg-white opacity-70"
                      }`}
                    >
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(shipment.ID_Spedizione)}
                          className="w-4 h-4 mt-1 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer shrink-0"
                        />

                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-extrabold text-xs text-slate-900">
                              {parsed.fullName || "Cliente sconosciuto"}
                            </span>
                            <span className="text-[10px] font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 border border-slate-200">
                              {shipment.ID_Spedizione}
                            </span>
                            <span className="text-[10px] font-mono text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 font-bold">
                              Carrello {shipment.ID_Carrello}
                            </span>
                            {parsed.phone && (
                              <span className="text-[10px] text-slate-500">
                                📞 {parsed.phone}
                              </span>
                            )}
                          </div>

                          {/* Address display or edit */}
                          {isEditingThis ? (
                            <div className="flex items-center gap-2 mt-1">
                              <input
                                type="text"
                                value={tempAddress}
                                onChange={(e) => setTempAddress(e.target.value)}
                                placeholder="Es: Via Roma 12, 00100 Roma (RM)"
                                className="w-full text-xs px-2.5 py-1.5 border border-indigo-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                              />
                              <button
                                type="button"
                                disabled={isSavingAddress}
                                onClick={() => handleSaveInlineAddress(shipment, cart)}
                                className="px-2.5 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-colors shrink-0 disabled:opacity-50 cursor-pointer"
                              >
                                {isSavingAddress ? "Salvataggio..." : "Salva"}
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingShipmentId(null)}
                                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors shrink-0 cursor-pointer"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-xs text-slate-600">
                              <span className="font-medium truncate">
                                📍 {parsed.rawAddress || "Nessun indirizzo specificato"}
                              </span>
                              {cart && onSaveCart && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingShipmentId(shipment.ID_Spedizione);
                                    setTempAddress(parsed.rawAddress || "");
                                  }}
                                  className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-0.5 shrink-0 bg-indigo-50 hover:bg-indigo-100 px-1.5 py-0.5 rounded cursor-pointer"
                                >
                                  <Edit2 className="h-2.5 w-2.5" />
                                  <span>Modifica</span>
                                </button>
                              )}
                            </div>
                          )}

                          {/* Parsed details & Warning chips */}
                          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                            {parsed.street && (
                              <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono">
                                Via: {parsed.street}
                              </span>
                            )}
                            {parsed.postalCode ? (
                              <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 py-0.5 rounded font-mono font-bold">
                                CAP: {parsed.postalCode}
                              </span>
                            ) : (
                              <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded font-bold flex items-center gap-1">
                                <AlertTriangle className="h-2.5 w-2.5 text-amber-600" />
                                CAP mancante
                              </span>
                            )}
                            {parsed.city && (
                              <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono">
                                Città: {parsed.city}
                              </span>
                            )}
                            {parsed.province ? (
                              <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono font-bold">
                                Prov: {parsed.province}
                              </span>
                            ) : (
                              <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded font-bold flex items-center gap-1">
                                <AlertTriangle className="h-2.5 w-2.5 text-amber-600" />
                                Prov. mancante
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Content summary */}
                      <div className="text-[11px] text-slate-500 sm:text-right max-w-xs truncate shrink-0">
                        <span className="font-semibold text-slate-700 block">
                          {shipment.Oggetti_Spediti ? `${shipment.Oggetti_Spediti.split(",").length} articoli` : "Carte/Gadget"}
                        </span>
                        <span className="text-[10px] text-slate-400 truncate block">
                          {shipment.Oggetti_Spediti || "Contenuto standard"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-600 font-medium">
            <span className="font-bold text-slate-900">{selectedShipments.length}</span> di{" "}
            <span className="font-bold text-slate-900">{eligibleShipments.length}</span> spedizioni selezionate
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleCopyCsv}
              disabled={selectedShipments.length === 0}
              className="flex-1 sm:flex-none px-3.5 py-2.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-2xs disabled:opacity-50 cursor-pointer"
            >
              {copiedCsv ? (
                <>
                  <Check className="h-4 w-4 text-emerald-600" />
                  <span className="text-emerald-700">CSV Copiato!</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 text-slate-500" />
                  <span>Copia CSV</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleDownloadCsv}
              disabled={selectedShipments.length === 0}
              className="flex-1 sm:flex-none px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-extrabold transition-colors flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
            >
              <Download className="h-4 w-4" />
              <span>Scarica CSV Packlink PRO</span>
            </button>

            <button
              type="button"
              onClick={handleExportToGoogleSheets}
              disabled={selectedShipments.length === 0 || isSyncingSheet}
              className="w-full sm:w-auto px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-indigo-200 disabled:opacity-50 cursor-pointer"
            >
              {isSyncingSheet ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Scrittura Foglio in corso...</span>
                </>
              ) : (
                <>
                  <FileSpreadsheet className="h-4 w-4" />
                  <span>Scrivi su Foglio Google (Tab Zapier)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
