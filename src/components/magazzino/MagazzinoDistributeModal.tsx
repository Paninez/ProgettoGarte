import React, { useState, useMemo } from "react";
import { X, Check, Search, Plus, Minus, ShoppingCart, Sparkles } from "lucide-react";
import { OggettoMagazzino, Carrello, DettaglioCarrello, CustomerLoyalty } from "../../types";
import { TIERS_CONFIG } from "../../lib/loyaltyEngine";

interface MagazzinoDistributeModalProps {
  item: OggettoMagazzino;
  carrelli: Carrello[];
  dettagli: DettaglioCarrello[];
  onClose: () => void;
  onDistribute: (itemId: string, distributions: { cartId: string; clientName?: string; quantity: number; isPaid?: boolean }[]) => Promise<void>;
  loyaltyProfiles?: CustomerLoyalty[];
}

export const MagazzinoDistributeModal: React.FC<MagazzinoDistributeModalProps> = ({ 
  item, 
  carrelli, 
  dettagli, 
  onClose, 
  onDistribute,
  loyaltyProfiles = []
}) => {
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [distributions, setDistributions] = useState<{ id: string; name: string; quantity: number; isNew: boolean; isPaid?: boolean }[]>([]);
  const [newCartName, setNewCartName] = useState("");

  const getClientLoyalty = (name: string, email?: string) => {
    const normEmail = email?.trim().toLowerCase();
    const normName = name.trim().toLowerCase();
    
    let p = loyaltyProfiles.find(profile => {
      const profileEmail = profile.email?.trim().toLowerCase();
      return normEmail && profileEmail && profileEmail === normEmail;
    });
    if (!p) {
      p = loyaltyProfiles.find(profile => {
        const profileName = profile.customerName.trim().toLowerCase();
        return profileName === normName || profile.customerId === normName;
      });
    }
    return p ? { level: p.level, xp: p.xp, tier: p.tier } : { level: 1, xp: 0, tier: "Rookie Collector" as const };
  };

  const getTierColor = (tierName: string) => {
    const t = TIERS_CONFIG.find(x => x.tier === tierName);
    return t ? t.color : "#64748b";
  };

  const reservedInOpenCarts = useMemo(() => {
    let count = 0;
    const openCartIds = new Set(carrelli.filter(c => c.Stato_Carrello === "Aperto" || c.Stato_Carrello === "Pronto_per_Spedizione").map(c => c.ID_Carrello));
    dettagli.forEach(d => {
      if (d.ID_Oggetto === item.ID_Oggetto && openCartIds.has(d.ID_Carrello) && !d.ID_Spedizione) {
        count++;
      }
    });
    return count;
  }, [carrelli, dettagli, item.ID_Oggetto]);

  const totalDistributed = distributions.reduce((acc, curr) => acc + curr.quantity, 0);
  const availableToDistribute = item.Quantità_Disponibile - reservedInOpenCarts - totalDistributed;

  const openCarts = useMemo(() => {
    const filtered = carrelli.filter(c => {
      const matchSearch = c.Nome_Cliente.toLowerCase().includes(search.toLowerCase()) || 
                          (c.Telefono && c.Telefono.toLowerCase().includes(search.toLowerCase()));
      return (c.Stato_Carrello === "Aperto" || c.Stato_Carrello === "Pronto_per_Spedizione") && 
             matchSearch &&
             !distributions.some(d => d.id === c.ID_Carrello);
    });

    // Sort by customer loyalty level (descending) and XP (descending)
    return filtered.sort((a, b) => {
      const aLoyalty = getClientLoyalty(a.Nome_Cliente, a.Email);
      const bLoyalty = getClientLoyalty(b.Nome_Cliente, b.Email);

      if (bLoyalty.level !== aLoyalty.level) {
        return bLoyalty.level - aLoyalty.level;
      }
      return bLoyalty.xp - aLoyalty.xp;
    });
  }, [carrelli, search, distributions, loyaltyProfiles]);

  const handleAddDistribution = (cartId: string, name: string, isNew: boolean) => {
    if (availableToDistribute <= 0) return;
    setDistributions(prev => {
      const existing = prev.find(d => d.id === cartId);
      if (existing) {
        return prev.map(d => d.id === cartId ? { ...d, quantity: d.quantity + 1 } : d);
      }
      return [...prev, { id: cartId, name, quantity: 1, isNew, isPaid: false }];
    });
  };

  const handleTogglePaid = (id: string) => {
    setDistributions(prev => prev.map(d => d.id === id ? { ...d, isPaid: !d.isPaid } : d));
  };

  const handleUpdateQuantity = (id: string, delta: number) => {
    setDistributions(prev => {
      return prev.map(d => {
        if (d.id === id) {
          const newQty = d.quantity + delta;
          if (delta > 0 && availableToDistribute <= 0) return d;
          return { ...d, quantity: Math.max(0, newQty) };
        }
        return d;
      }).filter(d => d.quantity > 0);
    });
  };

  const handleAddNewCart = () => {
    if (!newCartName.trim()) return;
    const tempId = `NEW-${Date.now()}`;
    handleAddDistribution(tempId, newCartName.trim(), true);
    setNewCartName("");
  };

  const handleSubmit = async () => {
    if (distributions.length === 0) {
      alert("Nessun carrello selezionato.");
      return;
    }
    setLoading(true);
    try {
      const formattedDistributions = distributions.map(d => ({
        cartId: d.isNew ? "new" : d.id,
        clientName: d.isNew ? d.name : undefined,
        quantity: d.quantity,
        isPaid: d.isPaid
      }));
      await onDistribute(item.ID_Oggetto, formattedDistributions);
      onClose();
    } catch (err: any) {
      alert("Errore durante la distribuzione: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
              <ShoppingCart className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Distribuisci a Carrelli</h3>
              <p className="text-[11px] text-slate-500 font-medium">Assegna l'oggetto in stock a più ordini</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 flex flex-col space-y-4 overflow-y-auto">
          {/* Item Info */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex justify-between items-center">
            <div>
              <div className="text-xs font-bold text-slate-800">{item.Nome}</div>
              <div className="text-[10px] text-slate-500 font-mono">{item.ID_Oggetto}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Disponibili</div>
              <div className={`text-lg font-bold font-mono ${availableToDistribute === 0 ? "text-rose-600" : "text-indigo-600"}`}>
                {availableToDistribute} <span className="text-xs text-slate-500">/ {item.Quantità_Disponibile}</span>
              </div>
            </div>
          </div>

          {/* Create New Cart */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Aggiungi a un nuovo carrello</label>
            <div className="flex space-x-2">
              <input
                type="text"
                placeholder="Nome del nuovo cliente..."
                value={newCartName}
                onChange={(e) => setNewCartName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddNewCart()}
                className="flex-1 px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 bg-white"
                disabled={availableToDistribute <= 0}
              />
              <button
                type="button"
                onClick={handleAddNewCart}
                disabled={!newCartName.trim() || availableToDistribute <= 0}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-xs font-bold uppercase tracking-wider transition-colors"
              >
                Crea & Aggiungi
              </button>
            </div>
          </div>

          {/* List of Distributions */}
          {distributions.length > 0 && (
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Assegnazioni attuali</label>
              <div className="space-y-2">
                {distributions.map(d => {
                  const cart = carrelli.find(c => c.ID_Carrello === d.id);
                  const email = cart?.Email;
                  const loyalty = getClientLoyalty(d.name, email);

                  return (
                    <div key={d.id} className="flex flex-col p-2.5 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                            {d.name} {d.isNew && <span className="text-[9px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ml-1">Nuovo</span>}
                            {cart?.Telefono && (
                              <span className="text-[10px] text-slate-500 font-mono font-normal ml-1">{cart.Telefono}</span>
                            )}
                            {loyalty && loyalty.level > 1 && (
                              <span className="bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded text-[9px] font-black flex items-center gap-0.5 ml-1">
                                <Sparkles className="w-2.5 h-2.5" /> Lv.{loyalty.level}
                              </span>
                            )}
                          </span>
                          {loyalty && loyalty.level > 1 && (
                            <span className="text-[9px] font-bold mt-0.5" style={{ color: getTierColor(loyalty.tier) }}>
                              {loyalty.tier} ({loyalty.xp} XP)
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-3 bg-white border border-slate-200 rounded-lg p-1">
                          <button onClick={() => handleUpdateQuantity(d.id, -1)} className="p-1 text-slate-500 hover:bg-slate-100 rounded-md">
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="text-xs font-bold font-mono w-6 text-center text-slate-700">{d.quantity}</span>
                          <button onClick={() => handleUpdateQuantity(d.id, 1)} disabled={availableToDistribute <= 0} className="p-1 text-slate-500 hover:bg-slate-100 rounded-md disabled:opacity-50">
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center pt-1 border-t border-indigo-100/50">
                        <label className="flex items-center space-x-2 cursor-pointer text-[11px] text-slate-600 font-bold uppercase tracking-wider select-none">
                          <input 
                            type="checkbox" 
                            checked={!!d.isPaid} 
                            onChange={() => handleTogglePaid(d.id)}
                            className="rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 shadow-sm cursor-pointer h-3.5 w-3.5"
                          />
                          <span>Già pagato</span>
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Search Existing Carts */}
          <div className="space-y-2 pt-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Aggiungi a carrello esistente</label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Cerca carrello aperto..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 bg-white"
              />
            </div>
            <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
              {openCarts.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500">Nessun carrello trovato.</div>
              ) : (
                openCarts.map(cart => {
                  const loyalty = getClientLoyalty(cart.Nome_Cliente, cart.Email);

                  return (
                    <div key={cart.ID_Carrello} className="flex justify-between items-center p-2.5 hover:bg-slate-50 transition-colors">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-800">{cart.Nome_Cliente}</span>
                          {cart.Telefono && (
                            <span className="text-[10px] text-slate-500 font-mono">{cart.Telefono}</span>
                          )}
                          {loyalty.level > 1 && (
                            <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-1.5 py-0.5 rounded text-[9px] font-black flex items-center gap-0.5">
                              <Sparkles className="w-2.5 h-2.5" /> Lv.{loyalty.level}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-0.5">
                          <span className="font-mono">{cart.ID_Carrello}</span>
                          {loyalty.level > 1 && (
                            <>
                              <span>•</span>
                              <span className="font-semibold" style={{ color: getTierColor(loyalty.tier) }}>{loyalty.tier}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleAddDistribution(cart.ID_Carrello, cart.Nome_Cliente, false)}
                        disabled={availableToDistribute <= 0}
                        className="px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-indigo-600 disabled:text-slate-400 disabled:bg-slate-50 rounded-lg text-xs font-bold transition-colors shadow-3xs"
                      >
                        Aggiungi
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end space-x-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-slate-50 transition-colors"
          >
            Annulla
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || distributions.length === 0}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center space-x-2 shadow-md shadow-indigo-100"
          >
            {loading ? <span>Salvataggio...</span> : (
              <>
                <Check className="h-4 w-4" />
                <span>Conferma Assegnazioni</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
