import React, { useState } from "react";
import { OggettoMagazzino } from "../../types";
import { Clock, Plus, Trash2, PackageOpen, Calculator, Calendar } from "lucide-react";

interface MagazzinoAddItemProps {
  onAddItem: (item: Omit<OggettoMagazzino, "ID_Oggetto">) => Promise<void>;
  onRestockItem?: (itemId: string, addedQty: number, newCostPerUnit: number, breakdown?: any) => Promise<void>;
  items?: OggettoMagazzino[];
  setIsAdding: (val: boolean) => void;
  setActiveTab?: (tab: string) => void;
}

interface RifornimentoItem {
  id: string;
  nome: string;
  qty: number;
  costoMerce: number; // Costo totale della merce per questa riga
  prezzoVendita: number; // Prezzo di vendita UNITARIO
  selectedItemId?: string; // ID of the existing item to restock
  tag?: string;
}

export const MagazzinoAddItem: React.FC<MagazzinoAddItemProps> = ({
  onAddItem,
  onRestockItem,
  items: inventoryItems = [],
  setIsAdding,
  setActiveTab
}) => {
  const [items, setItems] = useState<RifornimentoItem[]>([
    { id: Math.random().toString(), nome: "", qty: 1, costoMerce: 0, prezzoVendita: 0, tag: "" }
  ]);

  const [costoSpedizione, setCostoSpedizione] = useState(0);
  const [costoTasse, setCostoTasse] = useState(0);
  const [altriCosti, setAltriCosti] = useState(0);
  const [markupPercent, setMarkupPercent] = useState(0);
  const [nomeLotto, setNomeLotto] = useState(new Date().toLocaleDateString("it-IT", { month: "short", year: "numeric", day: "numeric" }) + " (Iniziale)");
  const [tipoRipartizione, setTipoRipartizione] = useState<"proporzionale" | "uguale">("proporzionale");

  // Pre-order state
  const [isPreordine, setIsPreordine] = useState(false);
  const [accontoPagato, setAccontoPagato] = useState(0);
  const [dataArrivo, setDataArrivo] = useState("");
  const [dataSpedizionePresunta, setDataSpedizionePresunta] = useState("");

  const [loading, setLoading] = useState(false);

  const addItemRow = () => {
    setItems([...items, { id: Math.random().toString(), nome: "", qty: 1, costoMerce: 0, prezzoVendita: 0, tag: "" }]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof RifornimentoItem, value: any) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const totaleCostoMercePura = items.reduce((sum, item) => sum + (item.costoMerce || 0), 0);
  const totaleQty = items.reduce((sum, item) => sum + (item.qty || 0), 0);
  const extraCosti = (costoSpedizione || 0) + (costoTasse || 0) + (altriCosti || 0);

  const itemsCalculated = items.map(item => {
    const qty = item.qty || 1;
    const itemCostoMerce = item.costoMerce || 0;
    
    let extraPerQuestoItem = 0;
    let spedizioneProQuota = 0;
    let tasseProQuota = 0;
    let altriCostiProQuota = 0;
    
    if (tipoRipartizione === "proporzionale" && totaleCostoMercePura > 0) {
      const ratio = itemCostoMerce / totaleCostoMercePura;
      spedizioneProQuota = (costoSpedizione || 0) * ratio;
      tasseProQuota = (costoTasse || 0) * ratio;
      altriCostiProQuota = (altriCosti || 0) * ratio;
      altriCostiProQuota = (altriCosti || 0) * ratio;
      extraPerQuestoItem = extraCosti * ratio;
    } else if (tipoRipartizione === "uguale" && totaleQty > 0) {
      const ratio = qty / totaleQty;
      spedizioneProQuota = (costoSpedizione || 0) * ratio;
      tasseProQuota = (costoTasse || 0) * ratio;
      extraPerQuestoItem = extraCosti * ratio;
    }

    const costoTotaleRiga = itemCostoMerce + extraPerQuestoItem;
    const costoUnitarioBreakEven = costoTotaleRiga / qty;
    const costoUnitarioSuggerito = costoUnitarioBreakEven * (1 + (markupPercent || 0) / 100);

    return {
      ...item,
      extraCosti: extraPerQuestoItem,
      spedizioneProQuota,
      tasseProQuota,
      altriCostiProQuota,
      costoTotaleRiga,
      costoUnitarioBreakEven,
      costoUnitarioSuggerito
    };
  });

  const costoTotaleLotto = totaleCostoMercePura + extraCosti;
  
  const totaleVenditaPrevista = itemsCalculated.reduce((sum, item) => sum + ((item.prezzoVendita || 0) * (item.qty || 0)), 0);
  const roi = totaleVenditaPrevista - costoTotaleLotto;
  const roiPercent = costoTotaleLotto > 0 ? (roi / costoTotaleLotto) * 100 : 0;

  const handleAddNewItem = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const hasEmptyNames = items.some(i => !i.nome.trim());
    if (hasEmptyNames) {
      alert("Inserisci un nome valido per tutti gli articoli.");
      return;
    }
    const hasInvalidQty = items.some(i => i.qty <= 0);
    if (hasInvalidQty && !isPreordine) {
      alert("La quantità deve essere maggiore di zero per tutti gli articoli.");
      return;
    }

    setLoading(true);
    try {
      for (const item of itemsCalculated) {
        const existingItem = inventoryItems.find(inv => inv.Nome.toLowerCase() === item.nome.toLowerCase());
        
        if (existingItem && onRestockItem && !isPreordine) {
          await onRestockItem(
            existingItem.ID_Oggetto,
            item.qty,
            item.costoUnitarioBreakEven,
            {
              lotto: nomeLotto || "Lotto Rifornimento",
              qty: item.qty,
              costoSpedizione: item.spedizioneProQuota,
              costoTasse: item.tasseProQuota,
              altriCosti: item.altriCostiProQuota,
              costoOggetto: item.costoMerce,
              costoUnitario: item.costoUnitarioBreakEven,
              date: new Date().toISOString()
            }
          );
        } else {
          await onAddItem({
            Nome: item.nome,
            Quantità_Disponibile: item.qty,
            Costo_Acquisto: isPreordine ? 0 : item.costoUnitarioBreakEven,
            Prezzo_Vendita: item.prezzoVendita,
            Is_Preordine: isPreordine,
            Data_Spedizione_Presunta: dataSpedizionePresunta,
            Tag: item.tag || "",
            ...(isPreordine && {
              Acconto_Pagato: 0,
              Data_Arrivo_Prevista: dataArrivo,
              Stato_Preordine: "In_Attesa"
            }),
            Storico_Costi: JSON.stringify([{
              lotto: nomeLotto || "Lotto Iniziale",
              qty: item.qty,
              costoSpedizione: item.spedizioneProQuota,
              costoTasse: item.tasseProQuota,
              altriCosti: item.altriCostiProQuota,
              costoOggetto: item.costoMerce,
              costoUnitario: item.costoUnitarioBreakEven,
              date: new Date().toISOString()
            }]),
            Costo_Spedizione_Lotto: item.spedizioneProQuota,
            Costo_Dogana_Lotto: item.tasseProQuota,
            Costo_Accessori_Lotto: item.altriCostiProQuota
          });
        }
      }

      setIsAdding(false);
      if (setActiveTab) {
        setActiveTab(isPreordine ? "preordini" : "inventario");
      }
    } catch (err: any) {
      alert("Errore durante l'aggiunta dell'articolo: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center p-4 sm:p-6 z-[100] overflow-y-auto">
      <form
        onSubmit={handleAddNewItem}
        className="bg-white w-full max-w-5xl rounded-2xl border border-slate-200/90 shadow-2xl space-y-6 animate-scale-up my-auto"
      >
        <div className="p-6 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2">
            <PackageOpen className="w-4 h-4 text-indigo-500 shrink-0" />
            <span>Nuovo Rifornimento (Lotto)</span>
          </h3>
          <button type="button" onClick={() => setIsAdding(false)} className="md:hidden absolute top-4 right-4 p-2 text-slate-400 hover:bg-slate-100 rounded-full">
            ✕
          </button>
        <label className="flex items-center space-x-2 cursor-pointer group shrink-0">
          <div className={`p-1.5 rounded-lg transition-colors ${isPreordine ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'}`}>
            <Clock className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">È un preordine?</span>
          <input
            type="checkbox"
            checked={isPreordine}
            onChange={(e) => setIsPreordine(e.target.checked)}
            className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
          />
        </label>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LATO SINISTRO: Lista Articoli */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex justify-between items-center mb-2">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-3 mb-4">
              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Articoli nel Lotto</h4>
              <div className="flex items-center gap-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Nome Lotto:</label>
                <input 
                  type="text" 
                  value={nomeLotto} 
                  onChange={e => setNomeLotto(e.target.value)}
                  className="px-2.5 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="Es. Lotto 1"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={addItemRow}
              className="text-[10px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg flex items-center transition-colors"
            >
              <Plus className="w-3 h-3 mr-1" />
              Aggiungi Articolo
            </button>
          </div>

          <div className="space-y-3">
            {itemsCalculated.map((item, index) => (
              <div key={item.id} className="bg-slate-50 border border-slate-200 rounded-xl p-4 relative group">
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="absolute -right-2 -top-2 bg-white border border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600 rounded-full p-1.5 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Rimuovi articolo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
                
                <div className="flex items-center space-x-2 mb-3">
                  <span className="bg-slate-200 text-slate-600 text-[10px] font-black px-2 py-0.5 rounded-md">
                    #{index + 1}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                  <div className="md:col-span-4 space-y-1.5">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex justify-between">
                      <span>Nome *</span>
                      {inventoryItems.some(inv => inv.Nome.toLowerCase() === item.nome.toLowerCase() && item.nome.trim() !== '') && (
                        <span className="text-emerald-500 font-bold bg-emerald-50 px-1 py-0.5 rounded">Rifornimento (Gia in Magazzino)</span>
                      )}
                    </label>
                    <input
                      type="text"
                      required
                      value={item.nome}
                      onChange={(e) => updateItem(item.id, 'nome', e.target.value)}
                      list="inventory-list"
                      placeholder="Es. Display Box Pokemon"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 font-sans font-medium"
                    />
                  </div>
                  
                  <div className="md:col-span-2 space-y-1.5">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Qty *</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={item.qty || ""}
                      onChange={(e) => updateItem(item.id, 'qty', parseInt(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 font-mono font-semibold"
                    />
                  </div>

                  <div className="md:col-span-3 space-y-1.5">
                    <label className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider block">Costo Lotto €</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.costoMerce || ""}
                      onChange={(e) => updateItem(item.id, 'costoMerce', parseFloat(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 bg-white border border-indigo-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 font-mono font-semibold"
                    />
                  </div>

                  <div className="md:col-span-3 space-y-1.5">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Prezzo Vendita (Unit) € *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={item.prezzoVendita || ""}
                      onChange={(e) => updateItem(item.id, 'prezzoVendita', parseFloat(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-900 font-mono font-semibold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mt-3">
                  <div className="md:col-span-12 space-y-1.5">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Tag / Attributi (Es. carte singole, box, gradate, evento, accessorio)</label>
                    <input
                      type="text"
                      value={item.tag || ""}
                      onChange={(e) => updateItem(item.id, 'tag', e.target.value)}
                      placeholder="Es. carte singole, box, gradate..."
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900"
                    />
                  </div>
                </div>

                {/* Recap Riga */}
                <div className="mt-3 pt-2 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-[10px]">
                  <span 
                    className="text-slate-500 font-medium cursor-help"
                    title={`Spedizione Pro-quota: €${item.spedizioneProQuota.toFixed(2)}\nTasse Pro-quota: €${item.tasseProQuota.toFixed(2)}\nAltri Costi Pro-quota: €${item.altriCostiProQuota.toFixed(2)}`}
                  >
                    Extra Assorbiti: <span className="font-mono text-slate-700 underline decoration-dashed decoration-slate-300 underline-offset-2">€ {item.extraCosti.toFixed(2)}</span>
                  </span>
                  <div className="flex flex-wrap gap-3 sm:gap-4">
                    <span 
                      className="text-slate-500 font-medium cursor-help"
                      title={`Costo Merce Unitario: €${((item.costoMerce || 0) / (item.qty || 1)).toFixed(2)}\nSpedizione Unitario (Pro-quota): €${(item.spedizioneProQuota / (item.qty || 1)).toFixed(2)}\nTasse Unitario (Pro-quota): €${(item.tasseProQuota / (item.qty || 1)).toFixed(2)}\nAltri Costi Unitario (Pro-quota): €${(item.altriCostiProQuota / (item.qty || 1)).toFixed(2)}\n\nTotale Costo Unitario (Break-even): €${item.costoUnitarioBreakEven.toFixed(2)}`}
                    >
                      Break-even (Unit): <span className="font-mono font-bold text-slate-800 underline decoration-dashed decoration-slate-300 underline-offset-2">€ {item.costoUnitarioBreakEven.toFixed(2)}</span>
                    </span>
                    <span className="text-indigo-600 font-bold">
                      Suggerito (Unit): <span className="font-mono text-indigo-700 bg-indigo-100 px-1 py-0.5 rounded">€ {item.costoUnitarioSuggerito.toFixed(2)}</span>
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* LATO DESTRO: Costi Globali e Preordine */}
        <div className="lg:col-span-4 space-y-4">
          {!isPreordine ? (
            <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 space-y-4 shadow-sm">
              <h4 className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider flex items-center gap-1.5">
                Gestione Costi Extra
              </h4>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-indigo-600 uppercase tracking-wider block">Costi Spedizione Totali (€)</label>
                  <input type="number" step="0.01" min="0" value={costoSpedizione || ""} onChange={(e) => setCostoSpedizione(parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 font-mono font-semibold" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-indigo-600 uppercase tracking-wider block">Tasse / Dogana (€)</label>
                  <input type="number" step="0.01" min="0" value={costoTasse || ""} onChange={(e) => setCostoTasse(parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 font-mono font-semibold" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-indigo-600 uppercase tracking-wider block">Altri Costi (€)</label>
                  <input type="number" step="0.01" min="0" value={altriCosti || ""} onChange={(e) => setAltriCosti(parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 font-mono font-semibold" />
                </div>
                <div className="space-y-1.5 pt-2 border-t border-indigo-200/60">
                  <label className="text-[9px] font-bold text-indigo-800 uppercase tracking-wider block">Regola di Ripartizione Costi Extra</label>
                  <select value={tipoRipartizione} onChange={(e) => setTipoRipartizione(e.target.value as "proporzionale" | "uguale")} className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-xl text-[11px] focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 font-medium">
                    <option value="proporzionale">Proporzionale</option>
                    <option value="uguale">Uguale</option>
                  </select>
                </div>
                <div className="space-y-1.5 pt-2 border-t border-indigo-200/60">
                  <label className="text-[9px] font-bold text-indigo-800 uppercase tracking-wider block">Markup Desiderato (%)</label>
                  <input type="number" step="1" min="0" value={markupPercent || ""} onChange={(e) => setMarkupPercent(parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-xl text-xs font-mono font-semibold" />
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-indigo-200 space-y-2">
                <div className="flex justify-between items-center text-xs"><span className="font-bold text-indigo-900">Investimento Totale:</span><span className="font-mono font-black text-indigo-700 bg-white border border-indigo-100 px-2 py-1 rounded">€ {costoTotaleLotto.toFixed(2)}</span></div>
                <div className="flex justify-between items-center text-xs"><span className="font-bold text-indigo-900">Valore Stimato Vendita:</span><span className="font-mono font-black text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded">€ {totaleVenditaPrevista.toFixed(2)}</span></div>
                <div className="flex justify-between items-center text-xs"><span className="font-bold text-indigo-900">Forecast ROI (Utile):</span><span className="font-mono font-black px-2 py-1 rounded border text-emerald-700 bg-emerald-50 border-emerald-100">€ {roi.toFixed(2)}</span></div>
              </div>
            </div>
          ) : null}

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4 shadow-sm">
            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Spedizione e Tempistiche</h4>
            <div className="space-y-3">
              <div className="space-y-1.5 bg-indigo-50/50 p-3 rounded-xl border border-indigo-100">
                <label className="text-[9px] font-bold text-indigo-700 uppercase tracking-wider block">
                  Data Spedizione Presunta (Opzionale)
                </label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={dataSpedizionePresunta}
                    onChange={(e) => setDataSpedizionePresunta(e.target.value)}
                    placeholder="Es. Fine Agosto, 15/09/2026..."
                    className="w-full pr-10 pl-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 font-semibold shadow-sm"
                  />
                  <div className="absolute right-2 flex items-center">
                    <input
                      type="date"
                      onChange={(e) => {
                        if (e.target.value) {
                          const d = new Date(e.target.value);
                          const formatted = d.toLocaleDateString("it-IT");
                          setDataSpedizionePresunta(formatted);
                        }
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer w-7 h-7"
                    />
                    <button
                      type="button"
                      className="p-1 rounded-lg text-indigo-600 hover:bg-indigo-50 transition-colors"
                      title="Seleziona data da calendario"
                    >
                      <Calendar className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {["Immediata", "A breve", "Fine Mese", "Settimana Prox"].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setDataSpedizionePresunta(preset)}
                      className={`px-2 py-0.5 rounded-lg text-[9px] border transition-all ${
                        dataSpedizionePresunta === preset
                          ? "bg-indigo-600 text-white border-indigo-600 font-semibold"
                          : "bg-white hover:bg-indigo-100 hover:text-indigo-700 text-slate-500 border-slate-200"
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                  {dataSpedizionePresunta && (
                    <button
                      type="button"
                      onClick={() => setDataSpedizionePresunta("")}
                      className="px-2 py-0.5 rounded-lg text-[9px] bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 transition-colors font-medium"
                    >
                      Cancella
                    </button>
                  )}
                </div>
              </div>
              
              {isPreordine && (
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                    Data Arrivo Prevista (Opzionale)
                  </label>
                  <input
                    type="date"
                    value={dataArrivo}
                    onChange={(e) => setDataArrivo(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 font-mono font-semibold"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col-reverse sm:flex-row justify-end pt-4 border-t border-slate-100 gap-3">
        <button
          type="button"
          onClick={() => setIsAdding(false)}
          className="w-full sm:w-auto px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all cursor-pointer shadow-sm text-center"
        >
          Annulla
        </button>
        <button
          type="submit"
          disabled={loading}
          className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer shadow-sm text-center"
        >
          {loading ? "Registrazione in corso..." : "Registra Lotto"}
        </button>
      </div>
            </div>
      </form>

<datalist id="inventory-list">
{inventoryItems.map(inv => (<option key={inv.ID_Oggetto} value={inv.Nome} />))}
</datalist>
    </div>
  );
};
