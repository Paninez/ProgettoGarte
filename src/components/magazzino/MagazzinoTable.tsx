import React, { useRef, useState, useEffect } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { OggettoMagazzino } from "../../types";
import { Search, Edit2, Check, X, AlertTriangle, AlertCircle, Trash2, Share2, PackagePlus, Banknote, Video, Download, Calendar, CheckSquare, Square, Filter } from "lucide-react";
import { MagazzinoBulkDateModal } from "./MagazzinoBulkDateModal";

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return isMobile;
}


const areDesktopRowsEqual = (prev: any, next: any) => {
  if (prev.item !== next.item) return false;
  if (prev.isSelected !== next.isSelected) return false;
  if (prev.isEditing !== next.isEditing) return false;
  if (prev.allocated !== next.allocated) return false;
  if (prev.inlineEditingDateId !== next.inlineEditingDateId) return false;
  if (prev.inlineLoadingId !== next.inlineLoadingId) return false;
  if (prev.loading !== next.loading) return false;
  if (next.isEditing) {
    if (prev.editName !== next.editName) return false;
    if (prev.editQty !== next.editQty) return false;
    if (prev.editCosto !== next.editCosto) return false;
    if (prev.editPrezzo !== next.editPrezzo) return false;
    if (prev.editDataSpedizionePresunta !== next.editDataSpedizionePresunta) return false;
    if (prev.editTag !== next.editTag) return false;
  }
  const isInline = next.inlineEditingDateId === next.item.ID_Oggetto;
  if (isInline) {
    if (prev.inlineDateValue !== next.inlineDateValue) return false;
  }
  return true;
};

const MagazzinoDesktopRow = React.memo((props: any) => {
  const {
    item, virtualRow, isSelected, isEditing, allocated,
    desktopVirtualizer, handleToggleSelect, editName, setEditName,
    editDataSpedizionePresunta, setEditDataSpedizionePresunta,
    getPresetValue, editTag, setEditTag, inlineEditingDateId,
    inlineLoadingId, inlineDateValue, setInlineDateValue,
    handleSaveInlineDate, setInlineEditingDateId, editQty, setEditQty,
    editCosto, setEditCosto, editPrezzo, setEditPrezzo, userRole, loading,
    handleSaveEdit, setEditingId, handleStartEdit,
    onStartDistribute, onSettlePreorder, onStartMeet,
    setDeleteConfirmText, setItemIdToDelete
  } = props;

  const total = parseInt(item.Quantita) || 0;
  const available = total - allocated;
  const isLow = available <= 3;
  const isOut = available === 0;

  return (
                    <tr key={item.ID_Oggetto} ref={desktopVirtualizer.measureElement} data-index={virtualRow.index} className={`hover:bg-slate-50/80 transition-colors group relative hover:z-50 ${isSelected ? "bg-indigo-50/30" : ""}`}>
                      {/* Checkbox selection */}
                      <td className="px-3 py-4 text-center w-10">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => handleToggleSelect(item.ID_Oggetto, e as any)}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer h-4 w-4"
                        />
                      </td>

                      {/* ID */}
                      <td className="px-5 py-4 font-mono text-slate-400">{item.ID_Oggetto}</td>

                      {/* Nome */}
                      <td className="px-6 py-4">
                        {isEditing ? (
                          <div className="flex flex-col space-y-2">
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="w-full px-3 py-2 border border-indigo-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-slate-900 bg-white font-medium text-xs shadow-sm"
                            />
                            <div className="flex flex-col space-y-1 bg-indigo-50/50 p-2 rounded-lg border border-indigo-100">
                              <div className="flex items-center space-x-2">
                                <span className="text-[9px] text-indigo-700 font-bold uppercase tracking-wider whitespace-nowrap">Sped. Presunta:</span>
                                <div className="relative flex-1 flex items-center">
                                  <input
                                    type="text"
                                    value={editDataSpedizionePresunta}
                                    onChange={(e) => setEditDataSpedizionePresunta(e.target.value)}
                                    className="w-full pr-8 pl-2 py-1 text-xs border border-indigo-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 bg-white shadow-sm font-semibold"
                                    placeholder="Es. Fine Mese, 15/09..."
                                  />
                                  <div className="absolute right-1.5 flex items-center">
                                    <input
                                      type="date"
                                      onChange={(e) => {
                                        if (e.target.value) {
                                          const d = new Date(e.target.value);
                                          const formatted = d.toLocaleDateString("it-IT");
                                          setEditDataSpedizionePresunta(formatted);
                                        }
                                      }}
                                      className="absolute inset-0 opacity-0 cursor-pointer w-6 h-6"
                                    />
                                    <button
                                      type="button"
                                      className="p-0.5 rounded text-indigo-600 hover:bg-indigo-50 transition-colors"
                                      title="Seleziona data da calendario"
                                    >
                                      <Calendar className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {["Immediata", "A breve", "Settimana Prox", "Mese Prossimo"].map((preset) => (
                                  <button
                                    key={preset}
                                    type="button"
                                    onClick={() => setEditDataSpedizionePresunta(getPresetValue(preset))}
                                    className={`px-1.5 py-0.5 rounded text-[9px] border transition-all ${
                                      editDataSpedizionePresunta === getPresetValue(preset)
                                        ? "bg-indigo-600 text-white border-indigo-600 font-semibold"
                                        : "bg-white hover:bg-indigo-100 hover:text-indigo-700 text-slate-500 border-slate-200"
                                    }`}
                                  >
                                    {preset}
                                  </button>
                                ))}
                                 {editDataSpedizionePresunta && (
                                  <button
                                    type="button"
                                    onClick={() => setEditDataSpedizionePresunta("")}
                                    className="px-1.5 py-0.5 rounded text-[9px] bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 transition-colors font-medium"
                                  >
                                    Cancella
                                  </button>
                                )}
                              </div>
                              {setEditTag && (
                                <div className="flex items-center space-x-2 mt-2 pt-2 border-t border-indigo-100/50">
                                  <span className="text-[9px] text-indigo-700 font-bold uppercase tracking-wider whitespace-nowrap">Tag / Attributi:</span>
                                  <input
                                    type="text"
                                    value={editTag}
                                    onChange={(e) => setEditTag(e.target.value)}
                                    className="w-full px-2 py-1 text-xs border border-indigo-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 bg-white shadow-sm"
                                    placeholder="carte singole, box, gradate..."
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col space-y-1">
                            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                              <span className="font-medium text-slate-800">{item.Nome}</span>
                              {item.Tag && item.Tag.split(",").map((t, idx) => {
                                const trimmed = t.trim();
                                if (!trimmed) return null;
                                return (
                                  <span key={idx} className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-150 shadow-2xs">
                                    {trimmed}
                                  </span>
                                );
                              })}
                              {(item.Is_Carta_Singola || item.Nome.includes("[Carta Singola]")) && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-150">
                                  Carta Singola
                                </span>
                              )}
                              {item.Condizione && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-slate-100 text-slate-700 border border-slate-250">
                                  {item.Condizione}
                                </span>
                              )}
                              {item.Espansione && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-sans text-slate-500 bg-slate-50 border border-slate-200">
                                  {item.Espansione}
                                </span>
                              )}
                            </div>
                            {item.Is_Preordine && (
                              <div className="flex items-center gap-1.5 flex-wrap text-[10px] text-slate-500 font-medium">
                                <span className="text-indigo-600 font-semibold">
                                  Preordine {item.Stato_Preordine ? `(${item.Stato_Preordine.replace("_", " ")})` : ""}
                                </span>
                                {item.Data_Arrivo_Prevista && (
                                  <span className="text-slate-400">
                                    • Arrivo: {new Date(item.Data_Arrivo_Prevista).toLocaleDateString("it-IT")}
                                  </span>
                                )}
                              </div>
                            )}
                            {inlineEditingDateId === item.ID_Oggetto ? (
                              <div className="mt-1.5 bg-indigo-50/75 p-2.5 rounded-xl border border-indigo-100/90 space-y-1.5 w-64 shadow-sm animate-fade-in">
                                <div className="flex items-center justify-between text-[9px] text-indigo-700 font-bold uppercase tracking-wider">
                                  <span>Data Spedizione</span>
                                  {inlineLoadingId === item.ID_Oggetto && <span className="animate-pulse text-indigo-600">Salvataggio...</span>}
                                </div>
                                <div className="flex items-center gap-1">
                                  <div className="relative flex-1 flex items-center">
                                    <input
                                      type="text"
                                      value={inlineDateValue}
                                      onChange={(e) => setInlineDateValue(e.target.value)}
                                      className="w-full pr-8 pl-2 py-0.5 text-[11px] border border-indigo-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 bg-white font-semibold"
                                      placeholder="Fine Mese, 15/09..."
                                      disabled={inlineLoadingId === item.ID_Oggetto}
                                    />
                                    <div className="absolute right-1 flex items-center">
                                      <input
                                        type="date"
                                        onChange={(e) => {
                                          if (e.target.value) {
                                            const d = new Date(e.target.value);
                                            const formatted = d.toLocaleDateString("it-IT");
                                            setInlineDateValue(formatted);
                                          }
                                        }}
                                        className="absolute inset-0 opacity-0 cursor-pointer w-5 h-5"
                                        disabled={inlineLoadingId === item.ID_Oggetto}
                                      />
                                      <button type="button" className="p-0.5 rounded text-indigo-600 hover:bg-indigo-50" title="Calendario">
                                        <Calendar className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleSaveInlineDate(item)}
                                    disabled={inlineLoadingId === item.ID_Oggetto}
                                    className="p-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded transition-colors shadow-sm cursor-pointer"
                                    title="Salva"
                                  >
                                    <Check className="w-3 h-3 font-bold" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setInlineEditingDateId(null)}
                                    disabled={inlineLoadingId === item.ID_Oggetto}
                                    className="p-1 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded transition-colors shadow-sm cursor-pointer"
                                    title="Annulla"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {["Immediata", "A breve", "Settimana Prox", "Mese Prossimo"].map((preset) => (
                                    <button
                                      key={preset}
                                      type="button"
                                      onClick={() => setInlineDateValue(getPresetValue(preset))}
                                      disabled={inlineLoadingId === item.ID_Oggetto}
                                      className={`px-1.5 py-0.5 rounded text-[8px] border transition-all cursor-pointer ${
                                        inlineDateValue === getPresetValue(preset)
                                          ? "bg-indigo-600 text-white border-indigo-600 font-bold"
                                          : "bg-white hover:bg-indigo-50 text-slate-500 border-slate-200"
                                      }`}
                                    >
                                      {preset}
                                    </button>
                                  ))}
                                  {inlineDateValue && (
                                    <button
                                      type="button"
                                      onClick={() => setInlineDateValue("")}
                                      disabled={inlineLoadingId === item.ID_Oggetto}
                                      className="px-1.5 py-0.5 rounded text-[8px] bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100 font-medium ml-auto cursor-pointer"
                                    >
                                      Svuota
                                    </button>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 mt-1 select-none">
                                {item.Data_Spedizione_Presunta ? (
                                  <span
                                    onClick={() => handleStartInlineDateEdit(item)}
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 text-[9px] uppercase tracking-wide font-bold cursor-pointer transition-all active:scale-95 shadow-sm"
                                    title="Clicca per modificare rapidamente la data di spedizione"
                                  >
                                    📅 Spedizione Presunta: {item.Data_Spedizione_Presunta}
                                    <span className="text-[9px] text-amber-500 font-normal hover:text-amber-800 ml-0.5">✏️</span>
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleStartInlineDateEdit(item)}
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-50 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 border border-slate-200 text-[9px] uppercase tracking-wide font-bold transition-all active:scale-95 cursor-pointer shadow-sm"
                                    title="Imposta data spedizione presunta"
                                  >
                                    <Calendar className="w-2.5 h-2.5 text-slate-400 hover:text-indigo-500" /> Imposta Spedizione
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Quantità */}
                      <td className="px-6 py-4 text-center font-mono">
                        {isEditing ? (
                          <input
                            type="number"
                            min="0"
                            value={editQty}
                            onChange={(e) => setEditQty(parseInt(e.target.value) || 0)}
                            className="w-24 px-3 py-2 border border-indigo-500 rounded-lg text-center focus:outline-none text-slate-900 bg-white shadow-sm"
                          />
                        ) : (
                          <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
                            <span className={isLow ? "font-bold text-amber-700" : "text-slate-700 font-bold"}>
                              {available} pz
                            </span>
                            <span className="text-xs text-slate-500 font-medium whitespace-nowrap">
                              ({allocated} allocati / {total} totali)
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Costo Acquisto */}
                      <td className="px-6 py-4 text-right font-mono text-slate-600 relative group cursor-help z-10 hover:z-50">
                        {isEditing ? (
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={editCosto}
                            onChange={(e) => setEditCosto(parseFloat(e.target.value) || 0)}
                            className="w-28 px-3 py-2 border border-indigo-500 rounded-lg text-right focus:outline-none text-slate-900 bg-white shadow-sm"
                          />
                        ) : (
                          
                          <>
                            <span className={item.Storico_Costi ? "underline decoration-dashed decoration-slate-300 underline-offset-4" : ""}>
                              € {item.Costo_Acquisto.toFixed(2)}
                            </span>
                            {renderCostTooltip(item)}
                          </>
                        )}
                      </td>

                      {/* Prezzo Vendita */}
                      <td className="px-6 py-4 text-right font-mono font-semibold text-slate-700">
                        {isEditing ? (
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={editPrezzo}
                            onChange={(e) => setEditPrezzo(parseFloat(e.target.value) || 0)}
                            className="w-28 px-3 py-2 border border-indigo-500 rounded-lg text-right focus:outline-none text-slate-900 bg-white shadow-sm"
                          />
                        ) : (
                          `€ ${item.Prezzo_Vendita.toFixed(2)}`
                        )}
                      </td>

                      {/* Stato */}
                      <td className="px-6 py-4 text-center align-middle">
                        {isOut ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-rose-50 border border-rose-100 text-rose-700 rounded-full text-[10px] font-bold uppercase">
                            <span className="w-1.5 h-1.5 bg-rose-400 rounded-full"></span>
                            Esaurito
                          </span>
                        ) : isLow ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-amber-50 border border-amber-100 text-amber-700 rounded-full text-[10px] font-bold uppercase">
                            <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-ping"></span>
                            Scorte Basse
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-full text-[10px] font-bold uppercase">
                            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></span>
                            Ottimo
                          </span>
                        )}
                      </td>

                      {/* Azioni */}
                      <td className="px-6 py-4 text-center align-middle">
                        {userRole === "owner" ? (
                          isEditing ? (
                            <div className="flex items-center justify-center space-x-2">
                              <button
                                onClick={() => handleSaveEdit(item.ID_Oggetto)}
                                disabled={loading}
                                className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                                title="Salva modifiche"
                              >
                                <Check className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                disabled={loading}
                                className="p-1 text-slate-400 hover:bg-slate-100 rounded-md transition-colors"
                                title="Annulla"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex flex-wrap items-center justify-center gap-1">
                              {onSettlePreorder && item.Is_Preordine && item.Stato_Preordine !== 'Saldato' && item.Stato_Preordine !== 'Arrivato' && (
                                <button
                                  onClick={() => onSettlePreorder(item)}
                                  className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors inline-flex cursor-pointer"
                                  title="Salda Preordine"
                                >
                                  <Banknote className="h-3.5 w-3.5" />
                                </button>
                              )}
                              {onStartDistribute && available > 0 && (
                                <button
                                  onClick={() => onStartDistribute(item)}
                                  className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors inline-flex cursor-pointer"
                                  title="Distribuisci a Carrelli"
                                >
                                  <Share2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                              {onStartMeet && (
                                <button
                                  onClick={() => onStartMeet(item)}
                                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors inline-flex cursor-pointer"
                                  title="Organizza Meet"
                                >
                                  <Video className="h-3.5 w-3.5" />
                                </button>
                              )}
                              <button
                                onClick={() => handleStartEdit(item)}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors inline-flex cursor-pointer"
                                title="Modifica articolo"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              {onDeleteItem && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setItemIdToDelete(item.ID_Oggetto);
                                    setDeleteConfirmText("");
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors inline-flex cursor-pointer"
                                  title="Elimina articolo"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          )
                        ) : (
                          <div className="flex flex-wrap items-center justify-center gap-1">
                            <span className="text-[10px] text-slate-400 italic font-medium">Lettura</span>
                            {onStartMeet && (
                              <button
                                onClick={() => onStartMeet(item)}
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors inline-flex cursor-pointer"
                                title="Organizza Meet"
                              >
                                <Video className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
  );
}, areDesktopRowsEqual);

const areMobileCardsEqual = (prev: any, next: any) => {
  if (prev.item !== next.item) return false;
  if (prev.isSelected !== next.isSelected) return false;
  if (prev.isEditing !== next.isEditing) return false;
  if (prev.allocated !== next.allocated) return false;
  if (prev.inlineEditingDateId !== next.inlineEditingDateId) return false;
  if (prev.inlineLoadingId !== next.inlineLoadingId) return false;
  if (prev.loading !== next.loading) return false;
  if (next.isEditing) {
    if (prev.editName !== next.editName) return false;
    if (prev.editQty !== next.editQty) return false;
    if (prev.editCosto !== next.editCosto) return false;
    if (prev.editPrezzo !== next.editPrezzo) return false;
    if (prev.editDataSpedizionePresunta !== next.editDataSpedizionePresunta) return false;
    if (prev.editTag !== next.editTag) return false;
  }
  const isInline = next.inlineEditingDateId === next.item.ID_Oggetto;
  if (isInline) {
    if (prev.inlineDateValue !== next.inlineDateValue) return false;
  }
  return true;
};

const MagazzinoMobileCard = React.memo((props: any) => {
  const {
    item, virtualRow, isSelected, isEditing, allocated,
    mobileVirtualizer, handleToggleSelect, editName, setEditName,
    editDataSpedizionePresunta, setEditDataSpedizionePresunta,
    getPresetValue, editTag, setEditTag, inlineEditingDateId,
    inlineLoadingId, inlineDateValue, setInlineDateValue,
    handleSaveInlineDate, setInlineEditingDateId, editQty, setEditQty,
    editCosto, setEditCosto, editPrezzo, setEditPrezzo, userRole, loading,
    handleSaveEdit, setEditingId, handleStartEdit,
    onStartDistribute, onSettlePreorder, onStartMeet,
    setDeleteConfirmText, setItemIdToDelete
  } = props;

  const total = parseInt(item.Quantita) || 0;
  const available = total - allocated;
  const isLow = available <= 3;
  const isOut = available === 0;

  return (
                <div key={item.ID_Oggetto} ref={mobileVirtualizer.measureElement} data-index={virtualRow.index} className={`p-4 space-y-3 absolute w-full transition-colors ${isSelected ? "bg-indigo-50/40" : ""}`} style={{ top: 0, left: 0, transform: `translateY(${virtualRow.start}px)` }}>
                  {/* Header: Checkbox, Name and status badge */}
                  <div className="flex justify-between items-start gap-2.5">
                    <div className="pt-0.5 shrink-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => handleToggleSelect(item.ID_Oggetto, e as any)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer h-4 w-4"
                      />
                    </div>
                    <div className="space-y-0.5 min-w-0 flex-1">
                      {isEditing ? (
                        <div className="flex flex-col space-y-2 w-full">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full px-2.5 py-1.5 border border-indigo-500 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 bg-white"
                            placeholder="Nome Articolo"
                          />
                          <div className="flex flex-col space-y-1 bg-indigo-50/50 p-2 rounded-lg border border-indigo-100 w-full">
                            <div className="flex items-center space-x-2 w-full">
                              <span className="text-[9px] text-indigo-700 font-bold uppercase tracking-wider whitespace-nowrap">Sped. Presunta:</span>
                              <div className="relative flex-1 flex items-center">
                                <input
                                  type="text"
                                  value={editDataSpedizionePresunta}
                                  onChange={(e) => setEditDataSpedizionePresunta(e.target.value)}
                                  className="w-full pr-8 pl-2 py-1 text-xs border border-indigo-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 bg-white shadow-sm font-semibold"
                                  placeholder="Fine Mese, 15/09..."
                                />
                                <div className="absolute right-1.5 flex items-center">
                                  <input
                                    type="date"
                                    onChange={(e) => {
                                      if (e.target.value) {
                                        const d = new Date(e.target.value);
                                        const formatted = d.toLocaleDateString("it-IT");
                                        setEditDataSpedizionePresunta(formatted);
                                      }
                                    }}
                                    className="absolute inset-0 opacity-0 cursor-pointer w-6 h-6"
                                  />
                                  <button
                                    type="button"
                                    className="p-0.5 rounded text-indigo-600 hover:bg-indigo-50 transition-colors"
                                    title="Seleziona data da calendario"
                                  >
                                    <Calendar className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {["Immediata", "A breve", "Settimana Prox", "Mese Prossimo"].map((preset) => (
                                <button
                                  key={preset}
                                  type="button"
                                  onClick={() => setEditDataSpedizionePresunta(getPresetValue(preset))}
                                  className={`px-1.5 py-0.5 rounded text-[9px] border transition-all ${
                                    editDataSpedizionePresunta === getPresetValue(preset)
                                      ? "bg-indigo-600 text-white border-indigo-600 font-semibold"
                                      : "bg-white hover:bg-indigo-100 hover:text-indigo-700 text-slate-500 border-slate-200"
                                  }`}
                                >
                                  {preset}
                                </button>
                              ))}
                              {editDataSpedizionePresunta && (
                                <button
                                  type="button"
                                  onClick={() => setEditDataSpedizionePresunta("")}
                                  className="px-1.5 py-0.5 rounded text-[9px] bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 transition-colors font-medium"
                                >
                                  Cancella
                                </button>
                              )}
                            </div>
                            {setEditTag && (
                              <div className="flex items-center space-x-2 mt-2 pt-2 border-t border-indigo-100/50 w-full">
                                <span className="text-[9px] text-indigo-700 font-bold uppercase tracking-wider whitespace-nowrap">Tag / Attributi:</span>
                                <input
                                  type="text"
                                  value={editTag}
                                  onChange={(e) => setEditTag(e.target.value)}
                                  className="w-full px-2 py-1 text-xs border border-indigo-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 bg-white"
                                  placeholder="carte singole, box, gradate..."
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col space-y-1">
                          <h4 className="font-bold text-slate-800 text-xs leading-tight">{item.Nome}</h4>
                          {item.Tag && (
                            <div className="flex flex-wrap gap-1 mt-0.5">
                              {item.Tag.split(",").map((t, idx) => {
                                const trimmed = t.trim();
                                if (!trimmed) return null;
                                return (
                                  <span key={idx} className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-150 shadow-2xs">
                                    {trimmed}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                          {item.Is_Preordine && (
                            <div className="flex items-center gap-1.5 flex-wrap text-[10px] text-slate-500 font-medium mt-0.5">
                              <span className="text-indigo-600 font-semibold">
                                Preordine {item.Stato_Preordine ? `(${item.Stato_Preordine.replace("_", " ")})` : ""}
                              </span>
                              {item.Data_Arrivo_Prevista && (
                                <span className="text-slate-400">
                                  • Arrivo: {new Date(item.Data_Arrivo_Prevista).toLocaleDateString("it-IT")}
                                </span>
                              )}
                            </div>
                          )}
                          {inlineEditingDateId === item.ID_Oggetto ? (
                            <div className="mt-1.5 bg-indigo-50/75 p-2 rounded-lg border border-indigo-100/90 space-y-1 w-full shadow-sm" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-between text-[9px] text-indigo-700 font-bold uppercase tracking-wider">
                                <span>Spedizione Presunta</span>
                                {inlineLoadingId === item.ID_Oggetto && <span className="animate-pulse text-indigo-600">Salvataggio...</span>}
                              </div>
                              <div className="flex items-center gap-1 w-full">
                                <div className="relative flex-1 flex items-center">
                                  <input
                                    type="text"
                                    value={inlineDateValue}
                                    onChange={(e) => setInlineDateValue(e.target.value)}
                                    className="w-full pr-8 pl-2 py-0.5 text-[11px] border border-indigo-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 bg-white font-semibold"
                                    placeholder="Fine Mese, 15/09..."
                                    disabled={inlineLoadingId === item.ID_Oggetto}
                                  />
                                  <div className="absolute right-1 flex items-center">
                                    <input
                                      type="date"
                                      onChange={(e) => {
                                        if (e.target.value) {
                                          const d = new Date(e.target.value);
                                          const formatted = d.toLocaleDateString("it-IT");
                                          setInlineDateValue(formatted);
                                        }
                                      }}
                                      className="absolute inset-0 opacity-0 cursor-pointer w-5 h-5"
                                      disabled={inlineLoadingId === item.ID_Oggetto}
                                    />
                                    <button type="button" className="p-0.5 rounded text-indigo-600 hover:bg-indigo-50" title="Calendario">
                                      <Calendar className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleSaveInlineDate(item)}
                                  disabled={inlineLoadingId === item.ID_Oggetto}
                                  className="p-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded transition-colors shadow-sm cursor-pointer"
                                  title="Salva"
                                >
                                  <Check className="w-3 h-3 font-bold" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setInlineEditingDateId(null)}
                                  disabled={inlineLoadingId === item.ID_Oggetto}
                                  className="p-1 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded transition-colors shadow-sm cursor-pointer"
                                  title="Annulla"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {["Immediata", "A breve", "Settimana Prox", "Mese Prossimo"].map((preset) => (
                                  <button
                                    key={preset}
                                    type="button"
                                    onClick={() => setInlineDateValue(getPresetValue(preset))}
                                    disabled={inlineLoadingId === item.ID_Oggetto}
                                    className={`px-1 py-0.5 rounded text-[8px] border transition-all cursor-pointer ${
                                      inlineDateValue === getPresetValue(preset)
                                        ? "bg-indigo-600 text-white border-indigo-600 font-bold"
                                        : "bg-white hover:bg-indigo-50 text-slate-500 border-slate-200"
                                    }`}
                                  >
                                    {preset}
                                  </button>
                                ))}
                                {inlineDateValue && (
                                  <button
                                    type="button"
                                    onClick={() => setInlineDateValue("")}
                                    disabled={inlineLoadingId === item.ID_Oggetto}
                                    className="px-1 py-0.5 rounded text-[8px] bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100 font-medium ml-auto cursor-pointer"
                                  >
                                    Svuota
                                  </button>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 mt-1 select-none" onClick={(e) => e.stopPropagation()}>
                              {item.Data_Spedizione_Presunta ? (
                                <span
                                  onClick={() => handleStartInlineDateEdit(item)}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200 text-[8px] font-medium cursor-pointer transition-all active:scale-95 shadow-2xs"
                                  title="Clicca per modificare la data di spedizione"
                                >
                                  <Calendar className="w-2.5 h-2.5 text-slate-500" />
                                  <span>Spedizione: {item.Data_Spedizione_Presunta}</span>
                                  <span className="text-[8px] text-slate-400 hover:text-slate-600 ml-0.5">✏️</span>
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleStartInlineDateEdit(item)}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-50 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 border border-slate-200 text-[8px] font-medium transition-all active:scale-95 cursor-pointer shadow-2xs"
                                  title="Imposta data spedizione al cliente"
                                >
                                  <Calendar className="w-2 h-2 text-slate-400 hover:text-indigo-500" /> Imposta Spedizione
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                      <div className="text-[9px] text-slate-400 font-mono mt-1">ID: {item.ID_Oggetto}</div>
                    </div>

                    <div className="shrink-0">
                      {isOut ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-rose-50 border border-rose-100 text-rose-700 rounded-md text-[8px] font-bold uppercase">
                          <span className="w-1 h-1 bg-rose-400 rounded-full"></span>
                          Esaurito
                        </span>
                      ) : isLow ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-50 border border-amber-100 text-amber-700 rounded-md text-[8px] font-bold uppercase">
                          <span className="w-1 h-1 bg-amber-400 rounded-full animate-ping"></span>
                          Basso
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-md text-[8px] font-bold uppercase">
                          <span className="w-1 h-1 bg-emerald-400 rounded-full"></span>
                          Ottimo
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Content grid */}
                  <div className="grid grid-cols-3 gap-2 bg-slate-50 border border-slate-100 p-2.5 rounded-xl text-[10px]">
                    {/* Qty */}
                    <div className="space-y-0.5 col-span-3 sm:col-span-1">
                      <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider block">Quantità</span>
                      {isEditing ? (
                        <input
                          type="number"
                          min="0"
                          value={editQty}
                          onChange={(e) => setEditQty(parseInt(e.target.value) || 0)}
                          className="w-full px-1.5 py-0.5 border border-indigo-500 rounded text-center text-xs text-slate-900 bg-white font-mono"
                        />
                      ) : (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className={`font-bold font-mono ${isLow ? "text-amber-700 font-extrabold" : "text-slate-700"}`}>
                            {available} pz
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium whitespace-nowrap">
                            ({allocated} allocati / {total} totali)
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Cost */}
                    <div className="space-y-0.5 text-right">
                      <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider block">Costo Acq.</span>
                      {isEditing ? (
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={editCosto}
                          onChange={(e) => setEditCosto(parseFloat(e.target.value) || 0)}
                          className="w-full px-1.5 py-0.5 border border-indigo-500 rounded text-right text-xs text-slate-900 bg-white font-mono"
                        />
                      ) : (
                        <span className={`font-semibold text-slate-600 font-mono relative group cursor-help z-10 hover:z-50 ${item.Storico_Costi ? "underline decoration-dashed decoration-slate-300 underline-offset-4" : ""}`}>
                          €{item.Costo_Acquisto.toFixed(2)}
                        
                          {renderCostTooltip(item)}
                        </span>
                      )}
                    </div>

                    {/* Price */}
                    <div className="space-y-0.5 text-right">
                      <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider block">Prezzo Ven.</span>
                      {isEditing ? (
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={editPrezzo}
                          onChange={(e) => setEditPrezzo(parseFloat(e.target.value) || 0)}
                          className="w-full px-1.5 py-0.5 border border-indigo-500 rounded text-right text-xs text-slate-900 bg-white font-mono"
                        />
                      ) : (
                        <span className="font-bold text-slate-800 font-mono">
                          €{item.Prezzo_Vendita.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions row */}
                  <div className="flex flex-wrap justify-start sm:justify-end items-center gap-2 pt-2 border-t border-slate-100">
                    {userRole === "owner" ? (
                      isEditing ? (
                        <>
                          <button
                            onClick={() => handleSaveEdit(item.ID_Oggetto)}
                            disabled={loading}
                            className="flex items-center space-x-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-[9px] font-bold uppercase tracking-wider border border-emerald-150 cursor-pointer shrink-0 whitespace-nowrap"
                          >
                            <Check className="h-3 w-3" />
                            <span>Salva</span>
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            disabled={loading}
                            className="flex items-center space-x-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[9px] font-bold uppercase tracking-wider cursor-pointer shrink-0 whitespace-nowrap"
                          >
                            <X className="h-3 w-3" />
                            <span>Annulla</span>
                          </button>
                        </>
                      ) : (
                        <>
                          {onSettlePreorder && item.Is_Preordine && item.Stato_Preordine !== 'Saldato' && item.Stato_Preordine !== 'Arrivato' && (
                            <button
                              onClick={() => onSettlePreorder(item)}
                              className="flex items-center space-x-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-[9px] font-bold uppercase tracking-wider border border-emerald-150 cursor-pointer shrink-0 whitespace-nowrap"
                            >
                              <Banknote className="h-3 w-3" />
                              <span>Salda Preordine</span>
                            </button>
                          )}
                          {onStartDistribute && available > 0 && (
                            <button
                              onClick={() => onStartDistribute(item)}
                              className="flex items-center space-x-1 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[9px] font-bold uppercase tracking-wider border border-indigo-150 cursor-pointer shrink-0 whitespace-nowrap"
                            >
                              <Share2 className="h-3 w-3" />
                              <span>Distribuisci</span>
                            </button>
                          )}
                          {onStartMeet && (
                            <button
                              onClick={() => onStartMeet(item)}
                              className="flex items-center space-x-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-[9px] font-bold uppercase tracking-wider border border-blue-150 cursor-pointer shrink-0 whitespace-nowrap"
                            >
                              <Video className="h-3 w-3" />
                              <span>Meet</span>
                            </button>
                          )}
                          <button
                            onClick={() => handleStartEdit(item)}
                            className="flex items-center space-x-1 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[9px] font-bold uppercase tracking-wider border border-indigo-150 cursor-pointer shrink-0 whitespace-nowrap"
                          >
                            <Edit2 className="h-3 w-3" />
                            <span>Modifica</span>
                          </button>
                          {onDeleteItem && (
                            <button
                              type="button"
                              onClick={() => {
                                setItemIdToDelete(item.ID_Oggetto);
                                setDeleteConfirmText("");
                              }}
                              className="flex items-center space-x-1 px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-[9px] font-bold uppercase tracking-wider border border-rose-150 cursor-pointer shrink-0 whitespace-nowrap"
                            >
                              <Trash2 className="h-3 w-3" />
                              <span>Elimina</span>
                            </button>
                          )}
                        </>
                      )
                    ) : (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] text-slate-400 italic font-medium">Lettura</span>
                        {onStartMeet && (
                          <button
                            onClick={() => onStartMeet(item)}
                            className="flex items-center space-x-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-[9px] font-bold uppercase tracking-wider border border-blue-150 cursor-pointer shrink-0 whitespace-nowrap"
                          >
                            <Video className="h-3 w-3" />
                            <span>Meet</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
  );
}, areMobileCardsEqual);

interface MagazzinoTableProps {
  dettagli?: any[];
  filteredItems: OggettoMagazzino[];
  allocatedCounts?: Record<string, number>;
  search: string;
  setSearch: (val: string) => void;
  selectedTag?: string;
  setSelectedTag?: (val: string) => void;
  allUniqueTags?: string[];
  userRole: "owner" | "moderatore" | "utente";
  editingId: string | null;
  editName: string;
  setEditName: (val: string) => void;
  editQty: number;
  setEditQty: (val: number) => void;
  editCosto: number;
  setEditCosto: (val: number) => void;
  editPrezzo: number;
  setEditPrezzo: (val: number) => void;
  editDataSpedizionePresunta: string;
  setEditDataSpedizionePresunta: (val: string) => void;
  editTag?: string;
  setEditTag?: (val: string) => void;
  handleStartEdit: (item: OggettoMagazzino) => void;
  handleSaveEdit: (id: string) => void;
  setEditingId: (val: string | null) => void;
  loading: boolean;
  onDeleteItem?: (id: string) => void;
  setItemIdToDelete: (id: string | null) => void;
  setDeleteConfirmText: (text: string) => void;
  onStartDistribute?: (item: OggettoMagazzino) => void;
  onSettlePreorder?: (item: OggettoMagazzino) => void;
  onStartMeet?: (item: OggettoMagazzino) => void;
  onEditItem?: (item: OggettoMagazzino) => Promise<void>;
  onBulkUpdateDates?: (
    updates: {
      id: string;
      dataArrivoPrevista?: string | null;
      dataSpedizionePresunta?: string | null;
    }[]
  ) => Promise<void>;
}


const renderCostTooltip = (item: OggettoMagazzino) => {
  if (!item.Storico_Costi) return null;
  try {
    const history = JSON.parse(item.Storico_Costi);
    if (!Array.isArray(history) || history.length === 0) return null;
    
    const lastEntry = history[history.length - 1];
    const avgPrice = item.Costo_Acquisto;
    const totalLots = history.length;
    const displayHistory = history.slice(-3).reverse();

    return (
      <div className="absolute z-[9999] invisible group-hover:visible opacity-0 group-hover:opacity-100 top-full right-0 mt-2 w-72 bg-slate-900 text-white text-xs rounded-xl shadow-xl border border-slate-700 transition-all duration-200 p-3 pointer-events-none text-left">
        <div className="flex justify-between items-center border-b border-slate-700 pb-2 mb-2">
           <div className="space-y-0.5">
             <div className="text-[9px] text-slate-400 uppercase tracking-wider">Prezzo Medio</div>
             <div className="font-bold text-indigo-300 text-sm font-mono">€{avgPrice.toFixed(2)}</div>
           </div>
           <div className="space-y-0.5 text-right">
             <div className="text-[9px] text-slate-400 uppercase tracking-wider">Ultimo Acquisto</div>
             <div className="font-bold text-emerald-400 text-sm font-mono">€{(lastEntry.costoUnitario || 0).toFixed(2)}</div>
           </div>
        </div>

        <div className="font-bold text-slate-300 mb-2 border-b border-slate-700 pb-1 uppercase tracking-wider text-[10px] flex justify-between items-center">
          <span>Storico Lotti</span>
          {totalLots > 3 && (
            <span className="text-[8px] text-slate-400 font-normal normal-case">Ultimi 3 di {totalLots}</span>
          )}
        </div>
        <div className="space-y-3 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
          {displayHistory.map((entry: any, i: number) => (
            <div key={i} className="space-y-1">
              <div className="font-semibold text-slate-200 flex justify-between items-center">
                <span>{entry.lotto || "Lotto Sconosciuto"}</span>
                <span className="text-slate-400 font-normal text-[10px]">({entry.qty} pz)</span>
              </div>
              <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px] text-slate-300 font-mono bg-slate-800/50 p-1.5 rounded">
                <span className="text-slate-400">Oggetto: <span className="text-slate-200">€{(entry.costoOggetto || 0).toFixed(2)}</span></span>
                <span className="text-slate-400">Sped.: <span className="text-slate-200">€{(entry.costoSpedizione || 0).toFixed(2)}</span></span>
                <span className="text-slate-400">Tasse: <span className="text-slate-200">€{(entry.costoTasse || 0).toFixed(2)}</span></span>
                <span className="text-slate-400">Altri: <span className="text-slate-200">€{(entry.altriCosti || 0).toFixed(2)}</span></span>
                <span className="font-bold text-white col-span-2 mt-1 pt-1 border-t border-slate-700/50 flex justify-between">
                  <span>Totale Unitario:</span>
                  <span className="text-emerald-400">€{(entry.costoUnitario || 0).toFixed(2)}</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  } catch (e) {
    return null;
  }
};

export const MagazzinoTable: React.FC<MagazzinoTableProps> = React.memo(({
  dettagli,
  filteredItems,
  allocatedCounts = {},
  search,
  setSearch,
  selectedTag = "",
  setSelectedTag,
  allUniqueTags = [],
  userRole,
  editingId,
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
  editTag = "",
  setEditTag,
  handleStartEdit,
  handleSaveEdit,
  setEditingId,
  loading,
  onDeleteItem,
  setItemIdToDelete,
  setDeleteConfirmText,
  onStartDistribute,
  onSettlePreorder,
  onStartMeet,
  onEditItem,
  onBulkUpdateDates,
}) => {
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [isBulkDateModalOpen, setIsBulkDateModalOpen] = React.useState(false);
  const [inlineEditingDateId, setInlineEditingDateId] = React.useState<string | null>(null);
  const [inlineDateValue, setInlineDateValue] = React.useState("");
  const [inlineLoadingId, setInlineLoadingId] = React.useState<string | null>(null);
  const [localSearch, setLocalSearch] = React.useState(search);

  React.useEffect(() => {
    setLocalSearch(search);
  }, [search]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocalSearch(val);
    
    // We can just use a simple timeout for debounce
    if ((window as any)._searchTimeout) {
      clearTimeout((window as any)._searchTimeout);
    }
    (window as any)._searchTimeout = setTimeout(() => {
      setSearch(val);
    }, 300);
  };

  const handleToggleSelect = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const isAllSelected = filteredItems.length > 0 && filteredItems.every((i) => selectedIds.includes(i.ID_Oggetto));
  const isSomeSelected = selectedIds.length > 0 && !isAllSelected;

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredItems.map((i) => i.ID_Oggetto));
    }
  };

  const selectedItemsList = React.useMemo(() => {
    return filteredItems.filter((i) => selectedIds.includes(i.ID_Oggetto));
  }, [filteredItems, selectedIds]);

  const handleConfirmBulkUpdate = async (
    updates: {
      id: string;
      dataArrivoPrevista?: string | null;
      dataSpedizionePresunta?: string | null;
    }[]
  ) => {
    if (onBulkUpdateDates) {
      await onBulkUpdateDates(updates);
    } else if (onEditItem) {
      for (const update of updates) {
        const item = filteredItems.find((i) => i.ID_Oggetto === update.id);
        if (!item) continue;
        const newItem = { ...item };
        if (update.dataArrivoPrevista !== undefined) {
          newItem.Data_Arrivo_Prevista = update.dataArrivoPrevista || "";
        }
        if (update.dataSpedizionePresunta !== undefined) {
          newItem.Data_Spedizione_Presunta = update.dataSpedizionePresunta || "";
        }
        await onEditItem(newItem);
      }
    }
    setSelectedIds([]);
  };

  const handleStartInlineDateEdit = (item: OggettoMagazzino) => {
    setInlineEditingDateId(item.ID_Oggetto);
    setInlineDateValue(item.Data_Spedizione_Presunta || "");
  };

  const handleSaveInlineDate = async (item: OggettoMagazzino) => {
    if (!onEditItem) return;
    setInlineLoadingId(item.ID_Oggetto);
    try {
      await onEditItem({
        ...item,
        Data_Spedizione_Presunta: inlineDateValue,
      });
      setInlineEditingDateId(null);
    } catch (err: any) {
      alert("Errore durante il salvataggio rapido della data: " + err.message);
    } finally {
      setInlineLoadingId(null);
    }
  };
  const getPresetValue = (preset: string) => {
    if (preset === "Immediata" || preset === "A breve") return preset;
    const now = new Date();
    if (preset === "Settimana Prox") {
      now.setDate(now.getDate() + 7);
    } else if (preset === "Mese Prossimo") {
      now.setDate(now.getDate() + 30);
    }
    return now.toLocaleDateString("it-IT");
  };
  
  
  
  const isMobile = useIsMobile();
  const desktopParentRef = useRef<HTMLDivElement>(null);
  const desktopVirtualizer = useVirtualizer({
    count: isMobile ? 0 : filteredItems.length,
    getScrollElement: () => desktopParentRef.current,
    estimateSize: () => 65,
    overscan: 5,
  });

  const mobileParentRef = useRef<HTMLDivElement>(null);
  const mobileVirtualizer = useVirtualizer({
    count: isMobile ? filteredItems.length : 0,
    getScrollElement: () => mobileParentRef.current,
    estimateSize: () => 200,
    overscan: 5,
  });


  const handleExportInventoryCSV = () => {
    if (filteredItems.length === 0) {
      alert("Nessun articolo trovato da esportare.");
      return;
    }
    const headers = [
      "ID Oggetto",
      "Nome Articolo",
      "Quantita Totale",
      "Quantita Allocata",
      "Quantita Libera",
      "Costo Acquisto (€)",
      "Prezzo Vendita (€)",
      "Preordine"
    ];

    const rows = filteredItems.map((item) => {
      const total = item.Quantità_Disponibile || 0;
      const allocated = allocatedCounts[item.ID_Oggetto] || 0;
      const free = Math.max(0, total - allocated);
      return [
        item.ID_Oggetto,
        item.Nome || "",
        total.toString(),
        allocated.toString(),
        free.toString(),
        (item.Costo_Acquisto || 0).toFixed(2),
        (item.Prezzo_Vendita || 0).toFixed(2),
        item.Is_Preordine ? "Si" : "No"
      ];
    });

    const escapeCsv = (val: string) => {
      const str = val || "";
      if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r") || str.includes(";")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csvContent = [
      headers.map(escapeCsv).join(","),
      ...rows.map(row => row.map(escapeCsv).join(","))
    ].join("\r\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `inventario_magazzino_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="bg-white rounded-2xl border border-slate-250/70 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between gap-3 bg-slate-50/40">
          <div className="flex flex-1 max-w-2xl gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Filtra inventario per nome o ID..."
                value={localSearch}
                onChange={handleSearchChange}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-250 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 bg-white"
              />
            </div>
            {setSelectedTag && (
              <select
                value={selectedTag}
                onChange={(e) => setSelectedTag(e.target.value)}
                className="px-3 py-2 border border-slate-250 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 bg-white cursor-pointer"
              >
                <option value="">Tutti i Tag / Attributi</option>
                {allUniqueTags.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag.toUpperCase()}
                  </option>
                ))}
              </select>
            )}
          </div>
          <button
            type="button"
            onClick={handleExportInventoryCSV}
            className="flex items-center space-x-1.5 px-3 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all shadow-sm cursor-pointer border border-emerald-200 shrink-0"
            title="Esporta Inventario (CSV)"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Esporta CSV</span>
          </button>
        </div>

        {/* BARRA FILTRO TAG / ATTRIBUTI RAPIDI */}
        {allUniqueTags && allUniqueTags.length > 0 && setSelectedTag && (
          <div className="px-4 py-3 bg-slate-50/70 border-b border-slate-200 flex flex-wrap md:flex-nowrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 select-none">
              <Filter className="w-3.5 h-3.5 text-indigo-500" />
              <span>Filtro Rapido Tag:</span>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth pb-1 md:pb-0 w-full select-none">
              <button
                type="button"
                onClick={() => setSelectedTag("")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer border ${
                  selectedTag === ""
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                    : "bg-white text-slate-600 border-slate-200/80 hover:bg-slate-50 hover:text-slate-800"
                }`}
              >
                Tutti i Prodotti
              </button>
              {allUniqueTags.map((tag) => {
                const isSelected = selectedTag.toLowerCase() === tag.toLowerCase();
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setSelectedTag(tag)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer border flex items-center gap-1.5 ${
                      isSelected
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                        : "bg-white text-slate-600 border-slate-200/80 hover:bg-slate-50 hover:text-slate-800"
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 text-white" />}
                    <span>{tag}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* BULK ACTIONS BAR */}
        {selectedIds.length > 0 && (
          <div className="p-3 bg-indigo-50/90 border-b border-indigo-150 flex flex-wrap items-center justify-between gap-3 animate-fade-in">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full bg-indigo-600 text-white font-bold text-xs shadow-xs">
                {selectedIds.length}
              </span>
              <span className="text-xs font-semibold text-indigo-950">
                {selectedIds.length === 1 ? "articolo selezionato" : "articoli selezionati"}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsBulkDateModalOpen(true)}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <Calendar className="h-3.5 w-3.5" />
                <span>Modifica Date (Arrivo / Spedizione)</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-600 rounded-xl text-xs font-medium border border-slate-200 transition-colors cursor-pointer"
              >
                Deseleziona
              </button>
            </div>
          </div>
        )}

        <div ref={desktopParentRef} className="hidden md:block overflow-auto" style={{ maxHeight: 'calc(100dvh - 200px)' }}>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200 bg-slate-50/70">
                <th className="px-3 py-4 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = isSomeSelected;
                    }}
                    onChange={handleToggleSelectAll}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer h-4 w-4"
                    title={isAllSelected ? "Deseleziona tutti" : "Seleziona tutti"}
                  />
                </th>
                <th className="px-5 py-4">ID</th>
                <th className="px-5 py-4">Nome Articolo</th>
                <th className="px-5 py-4 text-center">Scorte</th>
                <th className="px-5 py-4 text-right">Costo Acquisto</th>
                <th className="px-5 py-4 text-right">Prezzo Vendita</th>
                <th className="px-5 py-4 text-center">Stato</th>
                <th className="px-5 py-4 text-center">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="h-12 w-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-300">
                        <PackagePlus className="h-6 w-6" />
                      </div>
                      <div className="text-sm font-semibold text-slate-600">Nessun articolo trovato</div>
                      <p className="text-xs text-slate-400">Modifica i filtri o aggiungi nuovi articoli al magazzino.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                <>
                {desktopVirtualizer.getVirtualItems().length > 0 && (
                  <tr style={{ height: `${desktopVirtualizer.getVirtualItems()[0].start}px` }}></tr>
                )}
{desktopVirtualizer.getVirtualItems().map((virtualRow) => {
                  const item = filteredItems[virtualRow.index];
                  const isSelected = selectedIds.includes(item.ID_Oggetto);
                  const isEditing = editingId === item.ID_Oggetto;
                  const allocated = allocatedCounts[item.ID_Oggetto] || 0;
                  return (
                    <MagazzinoDesktopRow
                      key={item.ID_Oggetto}
                      item={item} virtualRow={virtualRow} isSelected={isSelected}
                      isEditing={isEditing} allocated={allocated}
                      desktopVirtualizer={desktopVirtualizer} handleToggleSelect={handleToggleSelect}
                      editName={editName} setEditName={setEditName}
                      editDataSpedizionePresunta={editDataSpedizionePresunta} setEditDataSpedizionePresunta={setEditDataSpedizionePresunta}
                      getPresetValue={getPresetValue} editTag={editTag} setEditTag={setEditTag}
                      inlineEditingDateId={inlineEditingDateId} inlineLoadingId={inlineLoadingId}
                      inlineDateValue={inlineDateValue} setInlineDateValue={setInlineDateValue}
                      handleSaveInlineDate={handleSaveInlineDate} setInlineEditingDateId={setInlineEditingDateId}
                      editQty={editQty} setEditQty={setEditQty} editCosto={editCosto} setEditCosto={setEditCosto}
                      editPrezzo={editPrezzo} setEditPrezzo={setEditPrezzo} userRole={userRole} loading={loading}
                      handleSaveEdit={handleSaveEdit} setEditingId={setEditingId} handleStartEdit={handleStartEdit}
                      onStartDistribute={onStartDistribute} onSettlePreorder={onSettlePreorder} onStartMeet={onStartMeet}
                      setDeleteConfirmText={setDeleteConfirmText} setItemIdToDelete={setItemIdToDelete} onDeleteItem={onDeleteItem}
                    />
                  );
                })}
                {desktopVirtualizer.getVirtualItems().length > 0 && (
                  <tr style={{ height: `${desktopVirtualizer.getTotalSize() - desktopVirtualizer.getVirtualItems()[desktopVirtualizer.getVirtualItems().length - 1].end}px` }}></tr>
                )}
                </>
              )}
            </tbody>
          </table>
        </div>

        {/* MOBILE VIEW (CARD LAYOUT) */}
        <div ref={mobileParentRef} className="md:hidden divide-y divide-slate-100 bg-white overflow-auto" style={{ maxHeight: 'calc(100dvh - 200px)' }}>
          <div style={{ height: `${mobileVirtualizer.getTotalSize()}px`, width: "100%", position: "relative" }}>
          {filteredItems.length === 0 ? (
            <div className="p-12 flex flex-col items-center justify-center space-y-3 text-center">
              <div className="h-12 w-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-300">
                <PackagePlus className="h-6 w-6" />
              </div>
              <div className="text-sm font-semibold text-slate-600">Nessun articolo trovato</div>
              <p className="text-xs text-slate-400">Modifica i filtri o aggiungi nuovi articoli al magazzino.</p>
            </div>
          ) : (
            mobileVirtualizer.getVirtualItems().map((virtualRow) => {
              const item = filteredItems[virtualRow.index];
              const isSelected = selectedIds.includes(item.ID_Oggetto);
              const isEditing = editingId === item.ID_Oggetto;
              const allocated = allocatedCounts[item.ID_Oggetto] || 0;
              return (
                <MagazzinoMobileCard
                  key={item.ID_Oggetto}
                  item={item} virtualRow={virtualRow} isSelected={isSelected}
                  isEditing={isEditing} allocated={allocated}
                  mobileVirtualizer={mobileVirtualizer} handleToggleSelect={handleToggleSelect}
                  editName={editName} setEditName={setEditName}
                  editDataSpedizionePresunta={editDataSpedizionePresunta} setEditDataSpedizionePresunta={setEditDataSpedizionePresunta}
                  getPresetValue={getPresetValue} editTag={editTag} setEditTag={setEditTag}
                  inlineEditingDateId={inlineEditingDateId} inlineLoadingId={inlineLoadingId}
                  inlineDateValue={inlineDateValue} setInlineDateValue={setInlineDateValue}
                  handleSaveInlineDate={handleSaveInlineDate} setInlineEditingDateId={setInlineEditingDateId}
                  editQty={editQty} setEditQty={setEditQty} editCosto={editCosto} setEditCosto={setEditCosto}
                  editPrezzo={editPrezzo} setEditPrezzo={setEditPrezzo} userRole={userRole} loading={loading}
                  handleSaveEdit={handleSaveEdit} setEditingId={setEditingId} handleStartEdit={handleStartEdit}
                  onStartDistribute={onStartDistribute} onSettlePreorder={onSettlePreorder} onStartMeet={onStartMeet}
                  setDeleteConfirmText={setDeleteConfirmText} setItemIdToDelete={setItemIdToDelete} onDeleteItem={onDeleteItem}
                />
              );
            })
          )}
          </div>
        </div>

        
      </div>

      <MagazzinoBulkDateModal
        isOpen={isBulkDateModalOpen}
        onClose={() => setIsBulkDateModalOpen(false)}
        selectedItems={selectedItemsList}
        onConfirmBulkUpdate={handleConfirmBulkUpdate}
      />
    </>
  );
});
