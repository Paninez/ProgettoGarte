import React from "react";
import { Award, Plus, Trash2, CheckCircle, Clock, Truck, Camera, Upload, Info, ChevronRight, Lock } from "lucide-react";
import { GradingItem, GradingGroup, ListinoGradingItem } from "../../types";

interface GradingItemsTableProps {
  activeGradingItems: GradingItem[];
  isEditable: boolean;
  gruppiGrading: GradingGroup[];
  selectedGradingIds: string[];
  setSelectedGradingIds: React.Dispatch<React.SetStateAction<string[]>>;
  isShipped: boolean;
  listinoGrading: ListinoGradingItem[];
  viewedGradingStatusId: string | null;
  setViewedGradingStatusId: (id: string | null) => void;
  getDirectImageUrl: (url: string) => string;
  onUpdateCard: (id: string, updates: Partial<GradingItem>) => void | Promise<void>;
  handleTogglePaidGradingItem: (id: string) => void;
  handleTogglePosticipatoGradingItem: (id: string) => void;
  handleAccontoChangeGradingItem?: (id: string, acconto: number) => void;
  onUploadPhoto?: (file: File, folderType?: string, customName?: string, subFolderName?: string) => Promise<string>;
  handleRemoveGradingItem: (id: string) => void;
  onAddClick: () => void;
}

export const GradingItemsTable: React.FC<GradingItemsTableProps> = ({
  activeGradingItems,
  isEditable,
  gruppiGrading,
  selectedGradingIds,
  setSelectedGradingIds,
  isShipped,
  listinoGrading,
  viewedGradingStatusId,
  setViewedGradingStatusId,
  getDirectImageUrl,
  onUpdateCard,
  handleTogglePaidGradingItem,
  handleTogglePosticipatoGradingItem,
  handleAccontoChangeGradingItem,
  onUploadPhoto,
  handleRemoveGradingItem,
  onAddClick,
}) => {
  const visibleGradingItems = activeGradingItems.filter(g => !g.ID_Spedizione);
  const [editingAccontoId, setEditingAccontoId] = React.useState<string | null>(null);
  const [tempAccontoValue, setTempAccontoValue] = React.useState<string>("");
  
  return (
    <>
            {/* GRADING ITEMS IN ACTIVE ORDER */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Award className="h-5 w-5 text-indigo-600" />
                  <h4 className="font-bold text-slate-700 text-xs uppercase tracking-widest">Servizio Grading Carte ({visibleGradingItems.length})</h4>
                </div>
                {isEditable && (
                  <button
                    type="button"
                    onClick={() => {
                      onAddClick();
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold shadow-3xs cursor-pointer transition-all active:scale-95"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>+ Aggiungi Carta a Grading</span>
                  </button>
                )}
              </div>

              {/* Desktop Table (hidden on mobile) */}
              <div className="hidden md:block border border-slate-200 rounded-xl overflow-x-auto scrollbar-thin">
                <table className="w-full min-w-[1100px] text-left">
                  <thead className="bg-slate-50 text-[9px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">Miniatura</th>
                      <th className="px-4 py-3">Nome Carta</th>
                      <th className="px-4 py-3 text-right">Prezzo Servizio</th>
                      <th className="px-4 py-3 text-center">Stato Grading</th>
                      <th className="px-4 py-3 text-center">Metodo Consegna</th>
                      <th className="px-4 py-3 text-center">In Spedizione</th>
                      <th className="px-4 py-3 text-center">Stato Pagamento</th>
                      {isEditable && <th className="px-4 py-3 text-center">Azioni</th>}
                    </tr>
                  </thead>
                  <tbody className="text-xs divide-y divide-slate-100 text-slate-700">
                    {visibleGradingItems.length === 0 ? (
                      <tr>
                        <td colSpan={isEditable ? 10 : 9} className="px-4 py-8 text-center text-slate-400 text-xs">
                          Nessuna carta aggiunta per il servizio di grading in questo ordine.
                        </td>
                      </tr>
                    ) : (
                      visibleGradingItems.map((g, gIdx) => {
                        const group = g.ID_Gruppo_Grading ? gruppiGrading.find((grp) => grp.ID_Gruppo_Grading === g.ID_Gruppo_Grading) : null;
                        const isGroupReturnedOrClosed = group && (group.Stato_Gruppo === "Ritornato" || group.Stato_Gruppo === "Chiuso");
                        const isSelectedForShipment = selectedGradingIds.includes(g.ID_Oggetto_Grading);
                        const isGradingPaid = g.Pagato_Singolarmente || (g.Costo_Cliente > 0 && (g.Acconto_Pagato || 0) >= g.Costo_Cliente);
                        return (
                          <tr key={`${g.ID_Oggetto_Grading}-${gIdx}`} className={`hover:bg-slate-50/40 transition-colors ${g.Pagamento_Posticipato ? 'bg-purple-50/60 border-l-4 border-purple-400' : ''}`}>
                            <td className="px-4 py-2.5">
                              {g.Link_Foto ? (
                                <div className="flex gap-1">
                                  {g.Link_Foto.split(',').map((url, idx) => (
                                    <a key={idx} href={url} target="_blank" rel="noreferrer" className="block w-10 h-10 border border-slate-250 rounded-lg overflow-hidden shadow-3xs hover:scale-105 transition-all">
                                      <img src={getDirectImageUrl(url)} alt={`Thumbnail ${idx+1}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                    </a>
                                  ))}
                                </div>
                              ) : (
                                <div className="w-10 h-10 bg-slate-50 text-slate-400 rounded-lg flex items-center justify-center border border-slate-150 text-[10px]">N/D</div>
                              )}
                            </td>
                            <td className="px-4 py-2.5">
                              <span className="font-bold text-slate-800">{g.Nome_Carta}</span>
                              {g.ID_Spedizione && <span className="inline-block ml-2 bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full text-[9px] font-bold tracking-widest uppercase shadow-2xs border border-indigo-100">📦 Spedito ({g.ID_Spedizione})</span>}
                              <span className="block text-[10px] text-slate-400 font-mono">ID: {g.ID_Oggetto_Grading}</span>
                              <div className="mt-1">
                                {g.Link_Foto_Ritornata && g.Metodo_Consegna ? (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-50 text-emerald-700 text-[9px] font-bold rounded-md border border-emerald-100">
                                    <CheckCircle className="h-2 w-2" />
                                    <span>Consegnata</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-50 text-amber-700 text-[9px] font-bold rounded-md border border-amber-100">
                                    <span>In Attesa di Consegna</span>
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-2.5 text-right font-mono font-semibold">
                              <div className="flex flex-col items-end gap-0.5">
                                <span className="text-slate-800 font-bold">€ {g.Costo_Cliente.toFixed(2)}</span>
                                <span className="text-[10px] text-indigo-600 font-semibold">{g.Tipologia_Servizio}</span>
                                {g.Acconto_Pagato > 0 && (
                                  <span className="text-[10px] text-blue-700 font-semibold bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
                                    Acconto: € {g.Acconto_Pagato.toFixed(2)}
                                  </span>
                                )}
                                {!g.Pagato_Singolarmente && g.Acconto_Pagato > 0 && (
                                  <span className="text-[10px] text-rose-600 font-semibold bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">
                                    Resta: € {Math.max(0, g.Costo_Cliente - g.Acconto_Pagato).toFixed(2)}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              <div
                                onClick={() => setViewedGradingStatusId(g.ID_Oggetto_Grading)}
                                className="inline-flex flex-col items-center justify-center cursor-pointer group p-1.5 -m-1.5 rounded hover:bg-slate-50 transition-colors"
                              >
                                {group ? (
                                  <span className={`inline-block px-1.5 py-0.5 text-[9px] font-bold rounded-md border whitespace-nowrap mb-0.5 transition-colors ${
                                    group.Stato_Gruppo === "In Preparazione" ? "bg-amber-50 text-amber-700 border-amber-100 group-hover:bg-amber-100" :
                                    group.Stato_Gruppo === "Spedito" ? "bg-indigo-50 text-indigo-700 border-indigo-100 group-hover:bg-indigo-100" :
                                    group.Stato_Gruppo === "Ritornato" ? "bg-emerald-50 text-emerald-700 border-emerald-100 group-hover:bg-emerald-100" :
                                    "bg-slate-100 text-slate-600 border-slate-200 group-hover:bg-slate-200"
                                  }`}>
                                    {group.Stato_Gruppo}
                                  </span>
                                ) : (
                                  <span className="text-amber-600 font-medium italic text-[10px] whitespace-nowrap mb-0.5">Attesa Lotto</span>
                                )}
                                <span className="text-[9px] text-slate-400 group-hover:text-indigo-500 font-medium flex items-center gap-0.5 transition-colors">
                                  Vedi Dettagli <ChevronRight className="h-3 w-3" />
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              <select
                                value={g.Metodo_Consegna || ""}
                                disabled={!g.Link_Foto_Ritornata || !isEditable || isShipped}
                                title={isShipped ? "Il metodo di consegna non può essere modificato dopo la spedizione" : !g.Link_Foto_Ritornata ? "Carica prima la foto della carta ritirata per abilitare la consegna" : "Seleziona il metodo di spedizione/consegna"}
                                onChange={async (e) => {
                                  await onUpdateCard?.(g.ID_Oggetto_Grading, { Metodo_Consegna: e.target.value });
                                }}
                                className="px-2 py-1 text-[11px] border border-slate-300 bg-white text-slate-700 font-semibold rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 disabled:bg-slate-50 disabled:cursor-not-allowed"
                              >
                                <option value="">- Scegli -</option>
                                <option value="Ritiro a mano">A mano</option>
                                <option value="Spedizione">Spedizione</option>
                              </select>
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              <div className="flex items-center justify-center">
                                {!isGroupReturnedOrClosed ? (
                                  <div 
                                    className="inline-flex items-center space-x-1 px-2 py-1 rounded bg-slate-100 border border-slate-200 text-[9px] font-bold text-slate-400 cursor-not-allowed select-none"
                                    title="Attendi che il lotto sia ritornato per spedire"
                                  >
                                    <Lock className="h-2.5 w-2.5 text-slate-400" />
                                    <span>Attendi Lotto</span>
                                  </div>
                                ) : !g.Link_Foto_Ritornata || !g.Metodo_Consegna ? (
                                  <div 
                                    className="inline-flex items-center space-x-1 px-2 py-1 rounded bg-slate-100 border border-slate-200 text-[9px] font-bold text-slate-400 cursor-not-allowed select-none"
                                    title="Carica foto e seleziona metodo di consegna per abilitare la spedizione"
                                  >
                                    <Lock className="h-2.5 w-2.5 text-slate-400" />
                                    <span>Completa Dati</span>
                                  </div>
                                ) : !isGradingPaid ? (
                                  <div 
                                    className="inline-flex items-center space-x-1 px-2 py-1 rounded bg-slate-100 border border-slate-200 text-[9px] font-bold text-slate-400 cursor-not-allowed select-none"
                                    title="La carta deve essere pagata per essere spedita"
                                  >
                                    <Lock className="h-2.5 w-2.5 text-slate-400" />
                                    <span>Paga Carta</span>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    disabled={!isEditable}
                                    onClick={() => {
                                      if (isSelectedForShipment) {
                                        setSelectedGradingIds((prev) => prev.filter((id) => id !== g.ID_Oggetto_Grading));
                                      } else {
                                        setSelectedGradingIds((prev) => [...prev, g.ID_Oggetto_Grading]);
                                      }
                                    }}
                                    className={`inline-flex items-center space-x-1 px-2 py-1 rounded text-[9px] font-bold uppercase tracking-wider transition-all border shadow-3xs ${
                                      isSelectedForShipment
                                        ? "bg-indigo-600 border-indigo-600 text-white hover:bg-indigo-700 cursor-pointer"
                                        : "bg-indigo-50 border-indigo-100 text-indigo-700 hover:bg-indigo-100 cursor-pointer"
                                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                                  >
                                    <Truck className="h-3 w-3" />
                                    <span>{isSelectedForShipment ? "Incluso" : "Includi"}</span>
                                  </button>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              <div className="flex flex-col items-center gap-1.5 justify-center">
                                <button
                                  type="button"
                                  disabled={!isEditable}
                                  onClick={() => handleTogglePaidGradingItem(g.ID_Oggetto_Grading)}
                                  className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border cursor-pointer ${
                                    isGradingPaid
                                      ? "bg-emerald-50 border-emerald-250 text-emerald-700 hover:bg-emerald-100/70"
                                      : "bg-amber-50 border-amber-250 text-amber-700 hover:bg-amber-100/70"
                                  } disabled:cursor-not-allowed`}
                                >
                                  <span className={`h-1.5 w-1.5 rounded-full ${isGradingPaid ? "bg-emerald-500" : "bg-amber-500"}`}></span>
                                  <span>{isGradingPaid ? "Pagato" : (g.Acconto_Pagato > 0 ? "Salda" : "Da Pagare")}</span>
                                </button>
                                {!g.Pagato_Singolarmente && (
                                  <button
                                    type="button"
                                    disabled={!isEditable}
                                    onClick={() => handleTogglePosticipatoGradingItem(g.ID_Oggetto_Grading)}
                                    className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider transition-all border cursor-pointer ${
                                      g.Pagamento_Posticipato
                                        ? "bg-purple-100 border-purple-300 text-purple-800"
                                        : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                                    } disabled:cursor-not-allowed`}
                                  >
                                    <Clock className="h-2.5 w-2.5" />
                                    <span>{g.Pagamento_Posticipato ? "Posticipato" : "Posticipa"}</span>
                                  </button>
                                )}
                                {!g.Pagato_Singolarmente && isEditable && handleAccontoChangeGradingItem && (
                                  editingAccontoId === g.ID_Oggetto_Grading ? (
                                    <div className="flex items-center gap-1 mt-1">
                                      <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={tempAccontoValue}
                                        onChange={(e) => setTempAccontoValue(e.target.value)}
                                        onBlur={() => {
                                          if (editingAccontoId === g.ID_Oggetto_Grading) {
                                            handleAccontoChangeGradingItem(g.ID_Oggetto_Grading, parseFloat(tempAccontoValue) || 0);
                                          }
                                        }}
                                        className="w-16 px-1.5 py-0.5 border border-indigo-300 rounded text-right text-[10px] focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white text-indigo-900 font-mono"
                                        placeholder="0.00"
                                        autoFocus
                                      />
                                      <button
                                        type="button"
                                        onClick={() => {
                                          handleAccontoChangeGradingItem(g.ID_Oggetto_Grading, parseFloat(tempAccontoValue) || 0);
                                          setEditingAccontoId(null);
                                        }}
                                        className="p-1 bg-emerald-100 text-emerald-700 rounded-full hover:bg-emerald-200 transition-colors"
                                      >
                                        <CheckCircle className="h-3 w-3" />
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingAccontoId(g.ID_Oggetto_Grading);
                                        setTempAccontoValue(g.Acconto_Pagato ? g.Acconto_Pagato.toString() : "");
                                      }}
                                      className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider transition-all border cursor-pointer bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 mt-0.5"
                                    >
                                      <span>{g.Acconto_Pagato > 0 ? `Acconto: €${g.Acconto_Pagato.toFixed(2)}` : 'Dai Acconto'}</span>
                                    </button>
                                  )
                                )}
                              </div>
                            </td>
                            {isEditable && (
                              <td className="px-4 py-2.5 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveGradingItem(g.ID_Oggetto_Grading)}
                                  className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg border border-transparent hover:border-rose-100 transition-all cursor-pointer"
                                  title="Rimuovi Carta"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </td>
                            )}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Handheld/Mobile Optimized List layout (hidden on desktop) */}
              <div className="md:hidden space-y-2.5">
                {visibleGradingItems.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                    Nessuna carta aggiunta per il servizio di grading.
                  </div>
                ) : (
                  visibleGradingItems.map((g, gIdx) => {
                    const group = g.ID_Gruppo_Grading ? gruppiGrading.find((grp) => grp.ID_Gruppo_Grading === g.ID_Gruppo_Grading) : null;
                    const isGroupReturnedOrClosed = group && (group.Stato_Gruppo === "Ritornato" || group.Stato_Gruppo === "Chiuso");
                    const isSelectedForShipment = selectedGradingIds.includes(g.ID_Oggetto_Grading);
                    return (
                      <div key={`${g.ID_Oggetto_Grading}-${gIdx}`} className={`p-2.5 bg-white border rounded-xl space-y-2.5 shadow-2xs transition-colors ${g.Pagamento_Posticipato ? 'border-purple-300 bg-purple-50/50' : 'border-slate-200'}`}>
                        {/* Row 1: Left has thumbnail image + Card details, Right has Delete if editable */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center space-x-2.5 min-w-0">
                            {g.Link_Foto ? (
                              <div className="flex gap-1 shrink-0 items-center">
                                {g.Link_Foto.split(',').map((url, idx) => (
                                  <a key={idx} href={url} target="_blank" rel="noreferrer" className="block w-9 h-9 border border-slate-200 rounded-lg overflow-hidden shrink-0 shadow-3xs hover:scale-105 transition-transform">
                                    <img src={getDirectImageUrl(url)} alt={`Thumbnail ${idx+1}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                  </a>
                                ))}
                              </div>
                            ) : (
                              <div className="w-9 h-9 bg-slate-50 text-slate-400 rounded-lg flex items-center justify-center shrink-0 border border-slate-200 text-[10px] font-semibold">N/D</div>
                            )}
                            <div className="min-w-0">
                              <h5 className="font-bold text-slate-800 text-[11px] leading-tight truncate">{g.Nome_Carta}</h5>
                              {g.ID_Spedizione && <span className="inline-block mt-0.5 mb-0.5 bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-full text-[8px] font-bold tracking-widest uppercase shadow-2xs border border-indigo-100">📦 Spedito ({g.ID_Spedizione})</span>}
                              <p className="text-[9px] text-slate-400 font-medium mt-0.5">{g.Tipologia_Servizio}</p>
                            </div>
                          </div>
                          {isEditable && !g.ID_Spedizione && (
                      <button
                        type="button"
                        onClick={() => handleRemoveGradingItem(g.ID_Oggetto_Grading)}
                              className="p-1 text-rose-500 hover:bg-rose-50 rounded-md transition-colors cursor-pointer shrink-0"
                              title="Rimuovi"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Row 2: Status Box & Delivery Select side-by-side */}
                        <div className="grid grid-cols-2 gap-2 text-[9px]">
                          {/* Stato Grading Clickable Row */}
                          <div
                            onClick={() => setViewedGradingStatusId(g.ID_Oggetto_Grading)}
                            className="flex items-center justify-between p-1.5 bg-slate-50 border border-slate-150 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors"
                          >
                            <div className="min-w-0">
                              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wide block">Stato Grading</span>
                              {group ? (
                                <span className={`text-[10px] font-bold truncate block ${
                                  group.Stato_Gruppo === "In Preparazione" ? "text-amber-600" :
                                  group.Stato_Gruppo === "Spedito" ? "text-indigo-600" :
                                  group.Stato_Gruppo === "Ritornato" ? "text-emerald-600" :
                                  "text-slate-600"
                                }`}>
                                  {group.Stato_Gruppo}
                                </span>
                              ) : (
                                <span className="text-amber-600 font-bold italic text-[10px] block">Attesa Lotto</span>
                              )}
                            </div>
                            <ChevronRight className="h-3 w-3 text-slate-400 shrink-0" />
                          </div>

                          {/* Delivery Method select */}
                          <div className="flex flex-col gap-0.5 justify-center bg-white p-1.5 rounded-lg border border-slate-150">
                            <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider block">Consegna</span>
                            <select
                              value={g.Metodo_Consegna || ""}
                              disabled={!g.Link_Foto_Ritornata || !isEditable || isShipped}
                              title={isShipped ? "Il metodo di consegna non può essere modificato dopo la spedizione" : !g.Link_Foto_Ritornata ? "Carica prima la foto della carta ritirata per abilitare la consegna" : "Seleziona il metodo di spedizione/consegna"}
                              onChange={async (e) => {
                                await onUpdateCard?.(g.ID_Oggetto_Grading, { Metodo_Consegna: e.target.value });
                              }}
                              className="w-full px-1 py-0.5 text-[9px] border border-slate-200 bg-white text-slate-700 font-semibold rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                            >
                              <option value="">Scegli</option>
                              <option value="Ritiro a mano">A mano</option>
                              <option value="Spedizione">Spedizione</option>
                            </select>
                          </div>
                        </div>

                        {/* Row 3: Shipment control + Footer Details */}
                        <div className="flex items-center justify-between pt-1.5 border-t border-slate-100/65">
                          {/* Shipment control for mobile */}
                          <div>
                            {!isGroupReturnedOrClosed ? (
                              <span 
                                className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[8px] font-bold bg-slate-50 border border-slate-200 text-slate-400"
                                title="Attendi che il lotto sia ritornato per spedire"
                              >
                                <Lock className="h-2 w-2 text-slate-400" />
                                <span>Attendi Lotto</span>
                              </span>
                            ) : !g.Link_Foto_Ritornata || !g.Metodo_Consegna ? (
                              <span 
                                className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[8px] font-bold bg-slate-50 border border-slate-200 text-slate-400"
                                title="Carica foto e seleziona metodo di consegna per abilitare la spedizione"
                              >
                                <Lock className="h-2 w-2 text-slate-400" />
                                <span>Completa Dati</span>
                              </span>
                            ) : !g.Pagato_Singolarmente ? (
                              <span 
                                className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[8px] font-bold bg-slate-50 border border-slate-200 text-slate-400"
                                title="La carta deve essere pagata per essere spedita"
                              >
                                <Lock className="h-2 w-2 text-slate-400" />
                                <span>Paga Carta</span>
                              </span>
                            ) : (
                              <button
                                type="button"
                                disabled={!isEditable}
                                onClick={() => {
                                  if (isSelectedForShipment) {
                                    setSelectedGradingIds((prev) => prev.filter((id) => id !== g.ID_Oggetto_Grading));
                                  } else {
                                    setSelectedGradingIds((prev) => [...prev, g.ID_Oggetto_Grading]);
                                  }
                                }}
                                className={`inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-wide border cursor-pointer transition-all ${
                                  isSelectedForShipment
                                    ? "bg-indigo-600 border-indigo-600 text-white"
                                    : "bg-indigo-50 border-indigo-100 text-indigo-700"
                                } disabled:opacity-50`}
                              >
                                <Truck className="h-2.5 w-2.5" />
                                <span>{isSelectedForShipment ? "Incluso Sped." : "Non Spedito"}</span>
                              </button>
                            )}
                          </div>

                          {/* Footer details: price & payment toggle */}
                          <div className="flex flex-col gap-1 text-xs">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold font-mono text-slate-700 text-[10px]">€ {g.Costo_Cliente.toFixed(2)}</span>
                              {g.Acconto_Pagato > 0 && (
                                <span className="text-[8px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1 py-0.5 rounded">
                                  Acconto: €{g.Acconto_Pagato.toFixed(2)}
                                </span>
                              )}
                              {!g.Pagato_Singolarmente && g.Acconto_Pagato > 0 && (
                                <span className="text-[8px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1 py-0.5 rounded">
                                  Resta: €{Math.max(0, g.Costo_Cliente - g.Acconto_Pagato).toFixed(2)}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                disabled={!isEditable}
                                onClick={() => handleTogglePaidGradingItem(g.ID_Oggetto_Grading)}
                                className={`inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-black uppercase transition-all border cursor-pointer ${
                                  g.Pagato_Singolarmente
                                    ? "bg-emerald-50 border-emerald-250 text-emerald-700"
                                    : "bg-amber-50 border-amber-250 text-amber-700"
                                } disabled:cursor-not-allowed`}
                              >
                                <span>{g.Pagato_Singolarmente ? "Pagato" : "Sospeso"}</span>
                              </button>
                              {!g.Pagato_Singolarmente && (
                                <button
                                  type="button"
                                  disabled={!isEditable}
                                  onClick={() => handleTogglePosticipatoGradingItem(g.ID_Oggetto_Grading)}
                                  className={`inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[8px] font-black uppercase transition-all border cursor-pointer ${
                                    g.Pagamento_Posticipato
                                      ? "bg-purple-100 border-purple-300 text-purple-800"
                                      : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                                  } disabled:cursor-not-allowed`}
                                >
                                  <Clock className="h-2 w-2" />
                                  <span>{g.Pagamento_Posticipato ? "Postic." : "Posticipa"}</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Warning Banner for active grading items */}
              {visibleGradingItems.length > 0 && (
                <div className="p-3.5 bg-indigo-50/50 border border-indigo-150/70 rounded-xl text-xs text-indigo-950 flex items-start gap-2.5">
                  <Award className="h-4.5 w-4.5 text-indigo-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold">Info Servizio Grading Carte:</p>
                    <p className="text-slate-600">
                      Questo ordine include {visibleGradingItems.length} carte in grading. Una volta che le carte ritornano da PSA/BGS (lotto in stato "Ritornato" o "Chiuso"), per completare e chiudere il flusso di gradazione è obbligatorio caricare la <strong>Foto Risultato Grading</strong> e impostare il <strong>Metodo di Consegna</strong> per ogni carta.
                    </p>
                  </div>
                </div>
              )}
            </div>


    </>
  );
};
