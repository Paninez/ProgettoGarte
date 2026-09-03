import React from "react";
import {
  Inbox,
  FileDown,
  TrendingUp,
  X,
  Plus,
  CheckCircle,
} from "lucide-react";
import { GradingGroup, GradingItem, Carrello } from "../../types";
import { getDirectImageUrl, GradingDashboardProps } from "./gradingUtils";

interface GradingGroupDetailProps {
  selectedGroup: GradingGroup | null;
  userRole?: string;
  groupStats: {
    totalCards: number;
    totalRevenue: number;
    totalCost: number;
    totalMargin: number;
  };
  groupCards: GradingItem[];
  carrelli: Carrello[];
  unassignedCards: GradingItem[];
  paginatedUnassignedCards: GradingItem[];
  selectedUnassignedCards: string[];
  unassignedPage: number;
  setUnassignedPage: React.Dispatch<React.SetStateAction<number>>;
  totalUnassignedPages: number;
  handleStatusChange: (newStatus: "In Preparazione" | "Spedito" | "Ritornato" | "Chiuso") => Promise<void>;
  handleExportCSV: () => void;
  handleUnassignCard: (cardId: string) => Promise<void>;
  handleAssignCard: (cardId: string) => Promise<void>;
  handleToggleUnassignedCard: (cardId: string) => void;
  handleAssignMultipleCards: () => Promise<void>;
  setSelectedUnassignedCards: React.Dispatch<React.SetStateAction<string[]>>;
  onUpdateCard?: GradingDashboardProps["onUpdateCard"];
  onUploadPhoto?: GradingDashboardProps["onUploadPhoto"];
}

export function GradingGroupDetail({
  selectedGroup,
  userRole,
  groupStats,
  groupCards,
  carrelli,
  unassignedCards,
  paginatedUnassignedCards,
  selectedUnassignedCards,
  unassignedPage,
  setUnassignedPage,
  totalUnassignedPages,
  handleStatusChange,
  handleExportCSV,
  handleUnassignCard,
  handleAssignCard,
  handleToggleUnassignedCard,
  handleAssignMultipleCards,
  setSelectedUnassignedCards,
  onUpdateCard,
  onUploadPhoto,
}: GradingGroupDetailProps) {
  if (!selectedGroup) {
    return (
      <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center shadow-3xs flex flex-col items-center justify-center h-full min-h-[400px]">
        <div className="p-4 bg-indigo-50 text-indigo-600 rounded-full mb-4">
          <Inbox className="h-8 w-8" />
        </div>
        <h4 className="font-bold text-slate-700 mb-1.5">Nessun lotto selezionato</h4>
        <p className="text-xs text-slate-400 max-w-sm">
          Seleziona un lotto di spedizione dalla barra laterale sinistra per visualizzarne i dettagli, associare le carte, analizzare i margini ed esportare i dati.
        </p>
      </div>
    );
  }

  const showReturnedFields = selectedGroup.Stato_Gruppo === "Ritornato" || selectedGroup.Stato_Gruppo === "Chiuso";

  return (
    <div className="space-y-6">
      {/* Status Indicator & CSV Export Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-3xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
            ID Lotto: {selectedGroup.ID_Gruppo_Grading}
          </span>
          <h3 className="font-bold text-slate-800 text-base">{selectedGroup.Nome_Gruppo}</h3>

          {/* Status Select dropdown */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">Stato Lotto:</span>
            <select
              value={selectedGroup.Stato_Gruppo}
              disabled={userRole === "utente"}
              onChange={(e) => handleStatusChange(e.target.value as any)}
              className={`px-2.5 py-1 text-xs border border-slate-300 bg-white text-slate-700 font-semibold rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                userRole === "utente" ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              <option value="In Preparazione">In Preparazione</option>
              <option value="Spedito">Spedito</option>
              <option value="Ritornato">Ritornato</option>
              <option value="Chiuso">Chiuso</option>
            </select>
          </div>
        </div>

        {/* CSV Export Button */}
        <button
          onClick={handleExportCSV}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-3xs w-full sm:w-auto shrink-0"
        >
          <FileDown className="h-4 w-4 shrink-0" />
          <span className="whitespace-nowrap">Esporta Lista Spedizione (CSV)</span>
        </button>
      </div>

      {/* KPI Metrics Widgets */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-3xs space-y-1">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Totale Carte</span>
          <span className="text-xl font-extrabold text-slate-800">{groupStats.totalCards}</span>
        </div>
        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-3xs space-y-1">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Proiezioni Incassi</span>
          <span className="text-xl font-extrabold text-slate-800">€ {groupStats.totalRevenue.toFixed(2)}</span>
        </div>
        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-3xs space-y-1">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Costo Spedizione Totale</span>
          <span className="text-xl font-extrabold text-slate-800">€ {groupStats.totalCost.toFixed(2)}</span>
        </div>
        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-3xs space-y-1 border-l-2 border-l-emerald-500">
          <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider block flex items-center gap-1">
            <TrendingUp className="h-3.5 w-3.5" /> Margine Lordo Calcolato
          </span>
          <span className="text-xl font-extrabold text-emerald-600">€ {groupStats.totalMargin.toFixed(2)}</span>
        </div>
      </div>

      {/* CARDS LIST IN THE SELECTED GROUP */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-3xs space-y-4">
        <h4 className="font-bold text-slate-700 text-xs uppercase tracking-widest">Carte incluse in questo lotto</h4>

        <div className="space-y-4">
          {/* Desktop View */}
          <div className="hidden md:block border border-slate-100 rounded-xl overflow-x-auto scrollbar-thin">
            <table className="w-full min-w-[900px] text-left">
              <thead className="bg-slate-50 text-[9px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">
                <tr>
                  <th className="px-4 py-2.5">Miniatura</th>
                  <th className="px-4 py-2.5">Nome Carta</th>
                  <th className="px-4 py-2.5">Servizio</th>
                  {showReturnedFields && (
                    <>
                      <th className="px-4 py-2.5 text-center">Foto Risultato Grading</th>
                      <th className="px-4 py-2.5 text-center">Metodo Consegna</th>
                    </>
                  )}
                  <th className="px-4 py-2.5 text-center">Pagamento</th>
                  <th className="px-4 py-2.5 text-center">Rimuovi</th>
                </tr>
              </thead>
              <tbody className="text-xs divide-y divide-slate-100 text-slate-700">
                {groupCards.length === 0 ? (
                  <tr>
                    <td colSpan={showReturnedFields ? 7 : 5} className="px-4 py-12 text-center text-slate-400 text-xs">
                      Nessuna carta associata a questo lotto. Associa le carte in sospeso usando il pannello sottostante.
                    </td>
                  </tr>
                ) : (
                  groupCards.map((c) => {
                    const cartInfo = carrelli.find((car) => car.ID_Carrello === c.ID_Carrello);
                    const cartName = cartInfo ? cartInfo.Nome_Cliente : c.ID_Carrello;
                    const isShipped = cartInfo
                      ? cartInfo.Stato_Carrello === "Spedizione_Ricevuta_da_Consegnare" ||
                        cartInfo.Stato_Carrello === "Completato"
                      : false;

                    return (
                      <tr key={c.ID_Oggetto_Grading} className="hover:bg-slate-50/30">
                        <td className="px-4 py-2.5">
                          {c.Link_Foto ? (
                            <div className="flex gap-1">
                              {c.Link_Foto.split(",").map((url, idx) => (
                                <a
                                  key={idx}
                                  href={url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="block w-10 h-10 border border-slate-200 rounded-lg overflow-hidden shrink-0 shadow-3xs"
                                >
                                  <img
                                    src={getDirectImageUrl(url)}
                                    alt={`Carta ${idx + 1}`}
                                    referrerPolicy="no-referrer"
                                    className="w-full h-full object-cover"
                                  />
                                </a>
                              ))}
                            </div>
                          ) : (
                            <div className="w-10 h-10 bg-slate-100 text-slate-400 border border-slate-150 rounded-lg flex items-center justify-center shrink-0">
                              N/D
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-2.5 font-bold text-slate-800">
                          <div className="max-w-[200px] truncate">{c.Nome_Carta}</div>
                          <div className="text-[10px] text-slate-400 font-mono flex items-center gap-2">
                            <span>ID: {c.ID_Oggetto_Grading}</span>
                            <span>•</span>
                            <span className="text-indigo-600 font-sans font-semibold">Carrello: {cartName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 font-medium">{c.Tipologia_Servizio}</td>

                        {showReturnedFields && (
                          <>
                            <td className="px-4 py-2.5 text-center">
                              {c.Link_Foto_Ritornata ? (
                                <div className="flex items-center justify-center gap-2">
                                  <a
                                    href={c.Link_Foto_Ritornata}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="block w-8 h-8 border border-slate-200 rounded-lg overflow-hidden shrink-0 shadow-3xs"
                                  >
                                    <img
                                      src={getDirectImageUrl(c.Link_Foto_Ritornata)}
                                      alt="Risultato Grading"
                                      referrerPolicy="no-referrer"
                                      className="w-full h-full object-cover"
                                    />
                                  </a>
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      await onUpdateCard?.(c.ID_Oggetto_Grading, { Link_Foto_Ritornata: "" });
                                    }}
                                    className="text-rose-500 hover:text-rose-700 text-[10px] font-bold cursor-pointer"
                                  >
                                    Rimuovi
                                  </button>
                                </div>
                              ) : (
                                <label className="cursor-pointer inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[10px] font-bold transition-all border border-indigo-100">
                                  <Plus className="h-3 w-3" />
                                  <span>Carica Foto</span>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={async (e) => {
                                      const file = e.target.files?.[0];
                                      if (!file || !onUploadPhoto || !onUpdateCard) return;
                                      try {
                                        const customName = `${c.Nome_Carta}-Ritorno-${c.ID_Carrello}`;
                                        const cartObj = carrelli.find((cart) => cart.ID_Carrello === c.ID_Carrello);
                                        const subFolderName = cartObj
                                          ? `${cartObj.Nome_Cliente}-${cartObj.ID_Carrello}`
                                          : `Carrello-${c.ID_Carrello}`;
                                        const url = await onUploadPhoto(file, "ritornoSpedizioneId", customName, subFolderName);
                                        await onUpdateCard(c.ID_Oggetto_Grading, { Link_Foto_Ritornata: url });
                                      } catch (err: any) {
                                        alert("Errore caricamento foto: " + err.message);
                                      }
                                    }}
                                  />
                                </label>
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              <select
                                value={c.Metodo_Consegna || ""}
                                disabled={!c.Link_Foto_Ritornata || isShipped}
                                title={
                                  isShipped
                                    ? "Modifiche bloccate: Carrello già spedito o completato"
                                    : !c.Link_Foto_Ritornata
                                    ? "Carica prima la foto per sbloccare"
                                    : "Seleziona metodo consegna"
                                }
                                onChange={async (e) => {
                                  await onUpdateCard?.(c.ID_Oggetto_Grading, { Metodo_Consegna: e.target.value });
                                }}
                                className="px-2 py-1 text-xs border border-slate-300 bg-white text-slate-700 font-semibold rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                              >
                                <option value="">Seleziona...</option>
                                <option value="Ritiro a mano">Ritiro a mano</option>
                                <option value="Spedizione">Spedizione</option>
                              </select>
                            </td>
                          </>
                        )}

                        <td className="px-4 py-2.5 text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                              c.Pagato_Singolarmente
                                ? "bg-emerald-50 border-emerald-100 text-emerald-700"
                                : "bg-amber-50 border-amber-100 text-amber-700"
                            }`}
                          >
                            {c.Pagato_Singolarmente ? "Pagato" : "Sospeso"}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          {userRole !== "utente" && (
                            <button
                              type="button"
                              onClick={() => handleUnassignCard(c.ID_Oggetto_Grading)}
                              className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-1.5 rounded-lg border border-transparent hover:border-rose-100 cursor-pointer transition-all"
                              title="Rimuovi carta da questo lotto"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile View */}
          <div className="md:hidden space-y-3">
            {groupCards.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
                Nessuna carta associata a questo lotto.
              </div>
            ) : (
              groupCards.map((c) => {
                const cartInfo = carrelli.find((car) => car.ID_Carrello === c.ID_Carrello);
                const cartName = cartInfo ? cartInfo.Nome_Cliente : c.ID_Carrello;
                const isShipped = cartInfo
                  ? cartInfo.Stato_Carrello === "Spedizione_Ricevuta_da_Consegnare" ||
                    cartInfo.Stato_Carrello === "Completato"
                  : false;

                return (
                  <div
                    key={c.ID_Oggetto_Grading}
                    className="p-3 bg-white border border-slate-200/80 rounded-xl shadow-3xs space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {c.Link_Foto ? (
                          <div className="flex gap-1 shrink-0">
                            {c.Link_Foto.split(",").map((url, idx) => (
                              <a
                                key={idx}
                                href={url}
                                target="_blank"
                                rel="noreferrer"
                                className="block w-9 h-9 border border-slate-200 rounded-lg overflow-hidden shrink-0 shadow-3xs"
                              >
                                <img
                                  src={getDirectImageUrl(url)}
                                  alt={`Carta ${idx + 1}`}
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-cover"
                                />
                              </a>
                            ))}
                          </div>
                        ) : (
                          <div className="w-9 h-9 bg-slate-100 text-slate-450 rounded-lg flex items-center justify-center shrink-0 border border-slate-200 text-[9px]">
                            N/D
                          </div>
                        )}
                        <div className="min-w-0">
                          <h5 className="font-bold text-slate-800 text-[11px] leading-tight truncate">{c.Nome_Carta}</h5>
                          <div className="flex flex-wrap gap-x-2 items-center text-[9px] text-slate-400 font-mono mt-0.5">
                            <span>ID: {c.ID_Oggetto_Grading}</span>
                            <span>•</span>
                            <span className="font-sans text-indigo-600 font-semibold truncate max-w-[120px]">
                              Cart: {cartName}
                            </span>
                          </div>
                          <div className="text-[9px] text-slate-500 font-medium mt-0.5 truncate">
                            Servizio: <span className="font-semibold text-slate-700">{c.Tipologia_Servizio}</span>
                          </div>
                        </div>
                      </div>

                      {userRole !== "utente" && (
                        <button
                          type="button"
                          onClick={() => handleUnassignCard(c.ID_Oggetto_Grading)}
                          className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-1 rounded-md border border-transparent hover:border-rose-100 cursor-pointer transition-all shrink-0"
                          title="Rimuovi dal gruppo"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1.5 border-t border-slate-100/60">
                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase border ${
                          c.Pagato_Singolarmente
                            ? "bg-emerald-50 border-emerald-100 text-emerald-700"
                            : "bg-amber-50 border-amber-100 text-amber-700"
                        }`}
                      >
                        {c.Pagato_Singolarmente ? "Pagato" : "Sospeso"}
                      </span>
                      {showReturnedFields && (
                        <div>
                          {c.Link_Foto_Ritornata && c.Metodo_Consegna ? (
                            <span className="inline-flex items-center gap-0.5 px-1 py-0.5 bg-emerald-50 text-emerald-700 text-[9px] font-bold rounded border border-emerald-100">
                              <CheckCircle className="h-2 w-2" />
                              <span>Consegnata</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 px-1 py-0.5 bg-amber-50 text-amber-700 text-[9px] font-bold rounded border border-amber-100">
                              <span>In Attesa</span>
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {showReturnedFields && (
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100/60 text-[9px]">
                        <div className="flex flex-col gap-1 bg-white p-1.5 rounded-lg border border-slate-150 justify-center">
                          <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400">Foto Risultato</span>
                          {c.Link_Foto_Ritornata ? (
                            <div className="flex items-center justify-between gap-1">
                              <a
                                href={c.Link_Foto_Ritornata}
                                target="_blank"
                                rel="noreferrer"
                                className="block w-6 h-6 border border-slate-200 rounded overflow-hidden shrink-0"
                              >
                                <img
                                  src={getDirectImageUrl(c.Link_Foto_Ritornata)}
                                  alt="Ritornata"
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                              </a>
                              <button
                                type="button"
                                onClick={async () => {
                                  await onUpdateCard?.(c.ID_Oggetto_Grading, { Link_Foto_Ritornata: "" });
                                }}
                                className="text-rose-500 hover:text-rose-700 font-bold text-[8px] cursor-pointer"
                              >
                                Rimuovi
                              </button>
                            </div>
                          ) : (
                            <label className="cursor-pointer inline-flex items-center justify-center gap-0.5 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded text-[9px] font-bold transition-all border border-indigo-100">
                              <Plus className="h-2.5 w-2.5" />
                              <span>Carica</span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (!file || !onUploadPhoto || !onUpdateCard) return;
                                  try {
                                    const customName = `${c.Nome_Carta}-Ritorno-${c.ID_Carrello}`;
                                    const cartObj = carrelli.find((cart) => cart.ID_Carrello === c.ID_Carrello);
                                    const subFolderName = cartObj
                                      ? `${cartObj.Nome_Cliente}-${cartObj.ID_Carrello}`
                                      : `Carrello-${c.ID_Carrello}`;
                                    const url = await onUploadPhoto(file, "ritornoSpedizioneId", customName, subFolderName);
                                    await onUpdateCard(c.ID_Oggetto_Grading, { Link_Foto_Ritornata: url });
                                  } catch (err: any) {
                                    alert("Errore caricamento foto: " + err.message);
                                  }
                                }}
                              />
                            </label>
                          )}
                        </div>

                        <div className="flex flex-col gap-1 bg-white p-1.5 rounded-lg border border-slate-150 justify-center">
                          <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400">Consegna</span>
                          <select
                            value={c.Metodo_Consegna || ""}
                            disabled={!c.Link_Foto_Ritornata || isShipped}
                            title={
                              isShipped
                                ? "Modifiche bloccate"
                                : !c.Link_Foto_Ritornata
                                ? "Carica prima la foto"
                                : "Scegli metodo"
                            }
                            onChange={async (e) => {
                              await onUpdateCard?.(c.ID_Oggetto_Grading, { Metodo_Consegna: e.target.value });
                            }}
                            className="w-full px-1 py-0.5 border border-slate-300 bg-white text-slate-700 font-semibold rounded text-[9px] focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                          >
                            <option value="">Scegli</option>
                            <option value="Ritiro a mano">A mano</option>
                            <option value="Spedizione">Spedizione</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ASSIGN PENDING CARDS WORKFLOW */}
      <div className="bg-indigo-50/40 border border-indigo-100/60 rounded-2xl p-5 shadow-3xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-bold text-indigo-900 text-sm">Associa Carte In Sospeso</h4>
            <p className="text-[11px] text-slate-500">
              Mostra tutte le carte in grading non ancora associate ad alcun lotto.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-2 py-1 bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-lg text-xs font-bold font-mono">
              Disponibili: {unassignedCards.length}
            </span>
            {unassignedCards.length > 0 && (
              <button
                onClick={() => {
                  if (selectedUnassignedCards.length === unassignedCards.length) {
                    setSelectedUnassignedCards([]);
                  } else {
                    setSelectedUnassignedCards(unassignedCards.map((c) => c.ID_Oggetto_Grading));
                  }
                }}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
              >
                {selectedUnassignedCards.length === unassignedCards.length ? "Deseleziona Tutto" : "Seleziona Tutto"}
              </button>
            )}
            {userRole !== "utente" && selectedUnassignedCards.length > 0 && (
              <button
                onClick={handleAssignMultipleCards}
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-md active:scale-95 flex items-center gap-2"
              >
                <Plus className="h-3 w-3" />
                <span>Aggiungi {selectedUnassignedCards.length} Selezionate</span>
              </button>
            )}
          </div>
        </div>

        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {unassignedCards.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs border border-dashed border-indigo-200/50 rounded-xl bg-white">
              Nessuna carta in sospeso trovata. Tutte le carte sono già state assegnate a un lotto.
            </div>
          ) : (
            <>
              {paginatedUnassignedCards.map((c) => {
                const cartInfo = carrelli.find((car) => car.ID_Carrello === c.ID_Carrello);
                const cartName = cartInfo ? cartInfo.Nome_Cliente : c.ID_Carrello;
                return (
                  <div
                    key={c.ID_Oggetto_Grading}
                    className={`bg-white border p-2 sm:p-3 rounded-xl flex items-center justify-between shadow-2xs gap-2 cursor-pointer transition-colors ${
                      selectedUnassignedCards.includes(c.ID_Oggetto_Grading)
                        ? "border-indigo-400 bg-indigo-50/30"
                        : "border-slate-150 hover:border-indigo-200"
                    }`}
                    onClick={() => handleToggleUnassignedCard(c.ID_Oggetto_Grading)}
                  >
                    <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
                        checked={selectedUnassignedCards.includes(c.ID_Oggetto_Grading)}
                        onChange={() => handleToggleUnassignedCard(c.ID_Oggetto_Grading)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      {c.Link_Foto ? (
                        <div className="flex gap-1 shrink-0 items-center">
                          {c.Link_Foto.split(",").map((url, idx) => (
                            <div
                              key={idx}
                              className="w-8 h-8 sm:w-10 sm:h-10 border border-slate-150 rounded-lg overflow-hidden shrink-0"
                            >
                              <img
                                src={getDirectImageUrl(url)}
                                alt={`Thumbnail ${idx + 1}`}
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-slate-50 text-slate-400 rounded-lg flex items-center justify-center shrink-0 border border-slate-150 text-[9px] sm:text-[10px]">
                          N/D
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800 text-[11px] sm:text-xs truncate leading-tight">
                          {c.Nome_Carta}
                        </p>
                        <p className="text-[9px] sm:text-[10px] text-slate-400 whitespace-nowrap truncate mt-0.5">
                          Servizio: {c.Tipologia_Servizio} | ID: {c.ID_Oggetto_Grading}
                        </p>
                        <p className="text-[9px] sm:text-[10px] text-indigo-600 font-semibold truncate">
                          Carrello: {cartName}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
                      <span className="font-bold text-indigo-600 text-[11px] sm:text-xs font-mono">
                        € {c.Costo_Cliente.toFixed(2)}
                      </span>
                      {userRole !== "utente" && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAssignCard(c.ID_Oggetto_Grading);
                          }}
                          className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition-all border border-indigo-100 flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="h-3 w-3" />
                          <span className="hidden sm:inline">Aggiungi</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {totalUnassignedPages > 1 && (
                <div className="flex justify-between items-center pt-2 text-xs">
                  <button
                    disabled={unassignedPage === 1}
                    onClick={() => setUnassignedPage((p) => Math.max(1, p - 1))}
                    className="px-2 py-1 bg-white border border-slate-200 rounded disabled:opacity-50"
                  >
                    Precedente
                  </button>
                  <span className="text-slate-500">
                    Pagina {unassignedPage} di {totalUnassignedPages}
                  </span>
                  <button
                    disabled={unassignedPage === totalUnassignedPages}
                    onClick={() => setUnassignedPage((p) => Math.min(totalUnassignedPages, p + 1))}
                    className="px-2 py-1 bg-white border border-slate-200 rounded disabled:opacity-50"
                  >
                    Successiva
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
