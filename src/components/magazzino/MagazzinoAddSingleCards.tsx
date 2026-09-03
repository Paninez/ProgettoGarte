import React, { useState, useRef, useMemo, useEffect } from "react";
import { OggettoMagazzino } from "../../types";
import { Zap, Plus, Trash2, Check, Sparkles, Layers, Award } from "lucide-react";
import { useDatabase } from "../../context/DatabaseContext";

interface MagazzinoAddSingleCardsProps {
  onAddItem: (item: Omit<OggettoMagazzino, "ID_Oggetto">) => Promise<void>;
  setIsAddingSingleCards: (val: boolean) => void;
  setActiveTab?: (tab: string) => void;
}

interface PendingSingleCard {
  id: string;
  nome: string;
  espansione: string;
  rarita: string;
  condizione: "NM" | "EX" | "GD" | "PL" | "PO";
  lingua: "ITA" | "ENG" | "JPN" | "GER" | "FRA" | "ESP";
  qty: number;
  costo: number;
  prezzo: number;
  gradata: boolean;
  tag?: string;
}

export const MagazzinoAddSingleCards: React.FC<MagazzinoAddSingleCardsProps> = ({
  onAddItem,
  setIsAddingSingleCards,
  setActiveTab
}) => {
  const { magazzino: items } = useDatabase();

  // Global batch defaults for ultra-fast typing
  const [defaultEspansione, setDefaultEspansione] = useState("");
  const [defaultLingua, setDefaultLingua] = useState<"ITA" | "ENG" | "JPN" | "GER" | "FRA" | "ESP">("ITA");
  const [defaultCondizione, setDefaultCondizione] = useState<"NM" | "EX" | "GD" | "PL" | "PO">("NM");
  const [defaultTag, setDefaultTag] = useState("carte singole");
  const [defaultTcg, setDefaultTcg] = useState("");

  // Single card input line
  const [nome, setNome] = useState("");
  const [espansione, setEspansione] = useState("");
  const [tcg, setTcg] = useState("");
  const [rarita, setRarita] = useState("");
  const [qty, setQty] = useState(1);
  const [costo, setCosto] = useState<number | "">("");
  const [prezzo, setPrezzo] = useState<number | "">("");
  const [condizione, setCondizione] = useState<"NM" | "EX" | "GD" | "PL" | "PO">("NM");
  const [gradata, setGradata] = useState(false);
  const [tag, setTag] = useState("");

  // Ref to focus back to Name field instantly
  const nameInputRef = useRef<HTMLInputElement>(null);

  // List of cards ready to be saved
  const [pendingCards, setPendingCards] = useState<PendingSingleCard[]>([]);
  const [loading, setLoading] = useState(false);

  // Auto-extract existing expansions from DB
  const existingExpansions = useMemo(() => {
    const exps = new Set<string>();
    items.forEach(item => {
      if (item.Espansione && item.Espansione.trim()) {
        exps.add(item.Espansione.trim());
      }
    });
    return Array.from(exps).sort();
  }, [items]);

  // Base list of popular TCGs
  const popularTCGs = useMemo(() => [
    "Pokémon",
    "Yu-Gi-Oh!",
    "Magic: The Gathering",
    "One Piece",
    "Disney Lorcana",
    "Star Wars: Unlimited",
    "Dragon Ball",
    "Vanguard",
    "Weiss Schwarz"
  ], []);

  // Sync / extract other TCGs from existing DB tags
  const existingTCGs = useMemo(() => {
    const tcgs = new Set<string>(popularTCGs);
    items.forEach(item => {
      if (item.Tag) {
        item.Tag.split(",").forEach(t => {
          const trimmed = t.trim();
          if (trimmed) {
            const formatted = trimmed.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
            if (formatted && 
                !formatted.toLowerCase().includes("carte singole") && 
                !formatted.toLowerCase().includes("gradate") && 
                !formatted.toLowerCase().includes("preordini") &&
                !formatted.toLowerCase().includes("lotto")) {
              tcgs.add(formatted);
            }
          }
        });
      }
    });
    return Array.from(tcgs).sort();
  }, [items, popularTCGs]);

  // Synchronize inputs with defaults whenever defaults change (only if card name is empty to avoid overwriting typed content)
  useEffect(() => {
    if (!nome) {
      setEspansione(defaultEspansione);
    }
  }, [defaultEspansione, nome]);

  useEffect(() => {
    if (!nome) {
      setTcg(defaultTcg);
    }
  }, [defaultTcg, nome]);

  const handleAddCardToPending = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!nome.trim()) {
      alert("Inserisci il nome della carta.");
      return;
    }

    const setFinal = espansione.trim() || defaultEspansione.trim() || "";
    const nameFormatted = setFinal 
      ? `[Carta Singola] ${nome.trim()} - ${setFinal} (${condizione || defaultCondizione})`
      : `[Carta Singola] ${nome.trim()} (${condizione || defaultCondizione})`;

    const tcgClean = tcg.trim();
    const tagsList = ["carte singole"];
    if (tcgClean) {
      tagsList.push(tcgClean.toLowerCase());
    }
    if (tag.trim()) {
      tag.trim().split(",").forEach(t => {
        const cleaned = t.trim().toLowerCase();
        if (cleaned && !tagsList.includes(cleaned)) {
          tagsList.push(cleaned);
        }
      });
    } else if (defaultTag.trim()) {
      defaultTag.trim().split(",").forEach(t => {
        const cleaned = t.trim().toLowerCase();
        if (cleaned && !tagsList.includes(cleaned)) {
          tagsList.push(cleaned);
        }
      });
    }

    const newCard: PendingSingleCard = {
      id: Math.random().toString(),
      nome: nameFormatted,
      espansione: setFinal,
      rarita: rarita.trim(),
      condizione: condizione || defaultCondizione,
      lingua: defaultLingua,
      qty: Number(qty) || 1,
      costo: Number(costo) || 0,
      prezzo: Number(prezzo) || 0,
      gradata: gradata,
      tag: tagsList.join(", "),
    };

    setPendingCards([...pendingCards, newCard]);

    // Reset input fields but keep default set/condition/tcg
    setNome("");
    setRarita("");
    setQty(1);
    setCosto("");
    setPrezzo("");
    setGradata(false);
    setTag("");

    // Re-focus name input
    setTimeout(() => {
      if (nameInputRef.current) {
        nameInputRef.current.focus();
      }
    }, 50);
  };

  const handleRemovePending = (id: string) => {
    setPendingCards(pendingCards.filter((c) => c.id !== id));
  };

  const handleSaveAllBatch = async () => {
    if (pendingCards.length === 0) {
      alert("Nessuna carta nella lista da salvare.");
      return;
    }

    setLoading(true);
    try {
      for (const card of pendingCards) {
        await onAddItem({
          Nome: card.nome,
          Quantità_Disponibile: card.qty,
          Costo_Acquisto: card.costo,
          Prezzo_Vendita: card.prezzo,
          Is_Carta_Singola: true,
          Espansione: card.espansione,
          Rarità: card.rarita,
          Condizione: card.condizione,
          Lingua: card.lingua,
          Gradata: card.gradata,
          Tag: card.tag || "",
        });
      }
      setIsAddingSingleCards(false);
      if (setActiveTab) {
        setActiveTab("inventario");
      }
    } catch (err: any) {
      alert("Errore durante il salvataggio delle carte: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const totalQtyBatch = pendingCards.reduce((acc, c) => acc + c.qty, 0);
  const totalCostoBatch = pendingCards.reduce((acc, c) => acc + c.costo * c.qty, 0);
  const totalPrezzoBatch = pendingCards.reduce((acc, c) => acc + c.prezzo * c.qty, 0);
  const totalUtileBatch = totalPrezzoBatch - totalCostoBatch;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center p-4 sm:p-6 z-[100] overflow-y-auto">
      <div className="bg-slate-900 text-white w-full max-w-6xl p-6 rounded-2xl border border-indigo-500/30 shadow-2xl space-y-6 animate-scale-up my-auto relative">
        <button type="button" onClick={() => setIsAddingSingleCards(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:bg-slate-800 rounded-full z-10">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm uppercase tracking-wider text-slate-100 flex items-center gap-2">
              <span>Inserimento Rapido Carte Singole</span>
              <span className="bg-indigo-500/30 text-indigo-300 text-[10px] font-mono px-2 py-0.5 rounded-full border border-indigo-400/30">
                Modalità Fast Batch
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Aggiungi rapidamente un gran numero di carte singole con preimpostazioni automatiche.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsAddingSingleCards(false)}
          className="text-xs font-bold text-slate-400 hover:text-white px-3 py-1.5 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors self-start sm:self-auto cursor-pointer"
        >
          Chiudi
        </button>
      </div>

      {/* Preset Impostazioni Predefinite */}
      <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/80 grid grid-cols-1 md:grid-cols-5 gap-4">
        <div>
          <label className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider block mb-1">
            Set / Espansione Predefinita
          </label>
          <input
            type="text"
            list="default-expansions-list"
            placeholder="Es. SV8a Terastal Festival, 151, OP-05..."
            value={defaultEspansione}
            onChange={(e) => setDefaultEspansione(e.target.value)}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs font-medium text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-400"
          />
          <datalist id="default-expansions-list">
            {existingExpansions.map((exp) => (
              <option key={exp} value={exp} />
            ))}
          </datalist>
        </div>
        <div>
          <label className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider block mb-1">
            TCG Predefinito
          </label>
          <input
            type="text"
            list="default-tcg-list"
            placeholder="Es. Pokémon, One Piece..."
            value={defaultTcg}
            onChange={(e) => setDefaultTcg(e.target.value)}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs font-medium text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-400"
          />
          <datalist id="default-tcg-list">
            {existingTCGs.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </div>
        <div>
          <label className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider block mb-1">
            Lingua Predefinita
          </label>
          <select
            value={defaultLingua}
            onChange={(e) => setDefaultLingua(e.target.value as any)}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs font-medium text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-400"
          >
            <option value="ITA">Italiano (ITA)</option>
            <option value="ENG">Inglese (ENG)</option>
            <option value="JPN">Giapponese (JPN)</option>
            <option value="GER">Tedesco (GER)</option>
            <option value="FRA">Francese (FRA)</option>
            <option value="ESP">Spagnolo (ESP)</option>
          </select>
        </div>
        <div>
          <label className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider block mb-1">
            Condizione Predefinita
          </label>
          <select
            value={defaultCondizione}
            onChange={(e) => setDefaultCondizione(e.target.value as any)}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs font-medium text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-400"
          >
            <option value="NM">NM - Near Mint</option>
            <option value="EX">EX - Excellent</option>
            <option value="GD">GD - Good</option>
            <option value="PL">PL - Played</option>
            <option value="PO">PO - Poor</option>
          </select>
        </div>
        <div>
          <label className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider block mb-1">
            Tag / Attributi Predefiniti
          </label>
          <input
            type="text"
            placeholder="Es. carte singole, gradate..."
            value={defaultTag}
            onChange={(e) => setDefaultTag(e.target.value)}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs font-medium text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-400"
          />
        </div>
      </div>

      {/* Single Card Input Line */}
      <form onSubmit={handleAddCardToPending} className="bg-slate-800/40 p-4 rounded-xl border border-indigo-500/20 space-y-4">
        <div className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider flex items-center justify-between">
          <span>Digita e premi Invio per aggiungere alla lista rapida</span>
          <span className="text-slate-400 font-normal">Tasto ENTER = Inserisci e passa alla riga successiva</span>
        </div>

        {/* PROMINENT ROW: Nome, Espansione, TCG */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-5">
            <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
              Nome Carta *
            </label>
            <input
              ref={nameInputRef}
              type="text"
              required
              placeholder="Es. Charizard ex Special Art #223"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-semibold text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-400 placeholder-slate-500"
            />
          </div>

          <div className="md:col-span-4">
            <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
              Espansione *
            </label>
            <input
              type="text"
              list="expansions-list"
              required
              placeholder="Es. SV8a Terastal Festival, 151, OP-05..."
              value={espansione}
              onChange={(e) => setEspansione(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-semibold text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-400 placeholder-slate-500"
            />
            <datalist id="expansions-list">
              {existingExpansions.map((exp) => (
                <option key={exp} value={exp} />
              ))}
            </datalist>
          </div>

          <div className="md:col-span-3">
            <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
              TCG *
            </label>
            <input
              type="text"
              list="tcg-list"
              required
              placeholder="Es. Pokémon, One Piece..."
              value={tcg}
              onChange={(e) => setTcg(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-semibold text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-400 placeholder-slate-500"
            />
            <datalist id="tcg-list">
              {existingTCGs.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </div>
        </div>

        {/* SECONDARY ROW: Qty, Costo/Prezzo, Condizione, Rarità, Gradata, Add Button */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end pt-2 border-t border-slate-800/40">
          <div className="md:col-span-2">
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Rarità (Opzionale)
            </label>
            <input
              type="text"
              placeholder="Es. SAR / Full Art"
              value={rarita}
              onChange={(e) => setRarita(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-400"
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Condizione
            </label>
            <select
              value={condizione}
              onChange={(e) => setCondizione(e.target.value as any)}
              className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-400 font-mono"
            >
              <option value="NM">NM - Near Mint</option>
              <option value="EX">EX - Excellent</option>
              <option value="GD">GD - Good</option>
              <option value="PL">PL - Played</option>
              <option value="PO">PO - Poor</option>
            </select>
          </div>

          <div className="md:col-span-1">
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Quantità
            </label>
            <input
              type="number"
              min="1"
              value={qty}
              onChange={(e) => setQty(parseInt(e.target.value) || 1)}
              className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono font-bold text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-400 text-center"
            />
          </div>

          <div className="md:col-span-3">
            <label className="text-[9px] font-bold text-indigo-300 uppercase tracking-wider block mb-1">
              Costo Unit. (€) / Prezzo Unit. (€)
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="Costo"
                value={costo}
                onChange={(e) => setCosto(e.target.value === "" ? "" : parseFloat(e.target.value))}
                className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-400"
              />
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="Prezzo"
                value={prezzo}
                onChange={(e) => setPrezzo(e.target.value === "" ? "" : parseFloat(e.target.value))}
                className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono font-bold text-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
              />
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Tag Extra (Opzionali)
            </label>
            <input
              type="text"
              placeholder="Es. promo, gradata"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-400"
            />
          </div>

          <div className="md:col-span-2 flex items-center justify-between gap-2">
            <label className="flex items-center space-x-1.5 cursor-pointer text-xs text-slate-300 font-medium">
              <input
                type="checkbox"
                checked={gradata}
                onChange={(e) => setGradata(e.target.checked)}
                className="w-4 h-4 text-indigo-500 rounded border-slate-700 focus:ring-indigo-400"
              />
              <span>Gradata</span>
            </label>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-bold text-xs uppercase tracking-wider transition-colors shadow-sm cursor-pointer flex items-center gap-1 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Aggiungi</span>
            </button>
          </div>
        </div>
      </form>

      {/* Pending Batch Table */}
      {pendingCards.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              <span>Anteprima Carte Pronte per l'Inserimento ({pendingCards.length})</span>
            </h4>
            <div className="flex items-center gap-4 text-xs font-mono">
              <span className="text-slate-400">Qty Totale: <strong className="text-slate-100">{totalQtyBatch}</strong></span>
              <span className="text-slate-400">Costo Totale: <strong className="text-slate-100">€{totalCostoBatch.toFixed(2)}</strong></span>
              <span className="text-slate-400">Vendita Stimata: <strong className="text-emerald-400">€{totalPrezzoBatch.toFixed(2)}</strong></span>
              <span className="text-slate-400">Utile Stimato: <strong className="text-emerald-300">€{totalUtileBatch.toFixed(2)}</strong></span>
            </div>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl overflow-x-auto max-h-60 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-700 bg-slate-900/60">
                  <th className="px-4 py-2.5">Nome & Set</th>
                  <th className="px-4 py-2.5 text-center">Condizione</th>
                  <th className="px-4 py-2.5 text-center">Qty</th>
                  <th className="px-4 py-2.5 text-right">Costo Unit.</th>
                  <th className="px-4 py-2.5 text-right">Prezzo Unit.</th>
                  <th className="px-4 py-2.5 text-center">Azione</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {pendingCards.map((card) => (
                  <tr key={card.id} className="hover:bg-slate-700/40 transition-colors">
                    <td className="px-4 py-2.5 font-medium text-slate-200">
                      <div className="flex items-center space-x-2">
                        <span>{card.nome}</span>
                        {card.rarita && (
                          <span className="text-[9px] bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded uppercase font-bold">
                            {card.rarita}
                          </span>
                        )}
                        {card.tag && (
                          <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded uppercase font-bold">
                            {card.tag}
                          </span>
                        )}
                        {card.gradata && (
                          <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded uppercase font-bold flex items-center gap-0.5">
                            <Award className="w-3 h-3" /> Gradata
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className="font-mono font-bold text-indigo-300 bg-indigo-950 px-2 py-0.5 rounded border border-indigo-800/50">
                        {card.condizione}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center font-mono font-bold text-slate-200">{card.qty}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-slate-300">€{card.costo.toFixed(2)}</td>
                    <td className="px-4 py-2.5 text-right font-mono font-bold text-emerald-400">€{card.prezzo.toFixed(2)}</td>
                    <td className="px-4 py-2.5 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemovePending(card.id)}
                        className="text-slate-400 hover:text-red-400 transition-colors p-1"
                        title="Rimuovi carta"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={handleSaveAllBatch}
              disabled={loading}
              className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg flex items-center space-x-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <span>Registrazione in corso...</span>
              ) : (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Salva {pendingCards.length} Carte in Magazzino</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};
