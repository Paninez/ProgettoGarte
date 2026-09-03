import React from "react";
import { Plus, X, Sliders, Flame } from "lucide-react";
import { CustomerLoyalty } from "../../types";
import { TIERS_CONFIG, calculateXPForLevel, calculateLevelFromXP } from "../../lib/loyaltyEngine";

interface LoyaltyModalsProps {
  loyaltyProfiles: CustomerLoyalty[];
  activeProfile: CustomerLoyalty | null;
  onGrantManualXP: (customerId: string, xpAmount: number, tokensAmount: number, reason: string) => void;
  onUpdateProfile?: (updatedProfile: CustomerLoyalty) => void;
  // Manual Modal
  showManualModal: boolean;
  setShowManualModal: (val: boolean) => void;
  targetCustomer: string;
  setTargetCustomer: (id: string) => void;
  manualXP: number;
  setManualXP: (val: number) => void;
  manualTokens: number;
  setManualTokens: (val: number) => void;
  manualReason: string;
  setManualReason: (val: string) => void;
  // Edit Profile Modal
  showEditModal: boolean;
  setShowEditModal: (val: boolean) => void;
  editLevel: number;
  setEditLevel: (val: number) => void;
  editXP: number;
  setEditXP: (val: number) => void;
  editTier: string;
  setEditTier: (val: string) => void;
  editTokens: number;
  setEditTokens: (val: number) => void;
  editPrestige: number;
  setEditPrestige: (val: number) => void;
  editIsManuallyManaged: boolean;
  setEditIsManuallyManaged: (val: boolean) => void;
  editSpent: number;
  setEditSpent: (val: number) => void;
  editOrders: number;
  setEditOrders: (val: number) => void;
  // Create Profile Modal
  showCreateModal: boolean;
  setShowCreateModal: (val: boolean) => void;
  newCustId: string;
  setNewCustId: (val: string) => void;
  newCustName: string;
  setNewCustName: (val: string) => void;
  newCustEmail: string;
  setNewCustEmail: (val: string) => void;
  newCustLevel: number;
  setNewCustLevel: (val: number) => void;
  newCustXP: number;
  setNewCustXP: (val: number) => void;
  newCustTier: string;
  setNewCustTier: (val: string) => void;
  setSelectedCustomerId: (id: string) => void;
  setActiveSubTab: (tab: "leaderboard" | "customer" | "admin") => void;
}

export function LoyaltyModals({
  loyaltyProfiles,
  activeProfile,
  onGrantManualXP,
  onUpdateProfile,
  showManualModal,
  setShowManualModal,
  targetCustomer,
  setTargetCustomer,
  manualXP,
  setManualXP,
  manualTokens,
  setManualTokens,
  manualReason,
  setManualReason,
  showEditModal,
  setShowEditModal,
  editLevel,
  setEditLevel,
  editXP,
  setEditXP,
  editTier,
  setEditTier,
  editTokens,
  setEditTokens,
  editPrestige,
  setEditPrestige,
  editIsManuallyManaged,
  setEditIsManuallyManaged,
  editSpent,
  setEditSpent,
  editOrders,
  setEditOrders,
  showCreateModal,
  setShowCreateModal,
  newCustId,
  setNewCustId,
  newCustName,
  setNewCustName,
  newCustEmail,
  setNewCustEmail,
  newCustLevel,
  setNewCustLevel,
  newCustXP,
  setNewCustXP,
  newCustTier,
  setNewCustTier,
  setSelectedCustomerId,
  setActiveSubTab,
}: LoyaltyModalsProps) {
  return (
    <>
      {/* ================= MODAL: MANUAL ADJUSTMENT ================= */}
      {showManualModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Plus className="h-5 w-5 text-indigo-600" />
                <span>Assegna XP / Tokens Manualmente</span>
              </h3>
              <button
                onClick={() => setShowManualModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Cliente Target</label>
                <select
                  value={targetCustomer}
                  onChange={(e) => setTargetCustomer(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                >
                  <option value="">Seleziona cliente...</option>
                  {loyaltyProfiles.map((p) => (
                    <option key={p.customerId} value={p.customerId}>
                      {p.customerName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Punti XP Aggiuntivi</label>
                <input
                  type="number"
                  value={manualXP}
                  onChange={(e) => setManualXP(Number(e.target.value))}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Collector Tokens Aggiuntivi</label>
                <input
                  type="number"
                  value={manualTokens}
                  onChange={(e) => setManualTokens(Number(e.target.value))}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Causale / Note</label>
                <input
                  type="text"
                  value={manualReason}
                  onChange={(e) => setManualReason(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                />
              </div>
            </div>
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowManualModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Annulla
              </button>
              <button
                onClick={() => {
                  if (targetCustomer) {
                    onGrantManualXP(targetCustomer, manualXP, manualTokens, manualReason);
                    setShowManualModal(false);
                  }
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl cursor-pointer shadow-md"
              >
                Conferma Assegnazione
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: EDIT CUSTOMER LOYALTY PROFILE (GESTIRE I LIVELLI) ================= */}
      {showEditModal && activeProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Sliders className="h-5 w-5 text-amber-500" />
                <span>Gestisci & Modifica Profilo Loyalty</span>
              </h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="text-xs text-slate-500 dark:text-slate-400">
              Stai modificando il profilo di <strong className="text-slate-800 dark:text-white">{activeProfile.customerName}</strong> ({activeProfile.customerId}).
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              {/* Manual Override Toggle */}
              <div className="col-span-2 bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <label className="font-black text-slate-800 dark:text-white block">Stato di Gestione</label>
                  <span className="text-[10px] text-slate-500">Se attivo, il livello/tier non verrà sovrascritto dai carrelli.</span>
                </div>
                <button
                  type="button"
                  onClick={() => setEditIsManuallyManaged(!editIsManuallyManaged)}
                  className={`px-3 py-1.5 rounded-xl font-black text-[11px] transition-all cursor-pointer ${
                    editIsManuallyManaged ? "bg-amber-500 text-slate-950 shadow-sm" : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {editIsManuallyManaged ? "Gestione Manuale ATTIVA" : "Gestione Automatica (Standard)"}
                </button>
              </div>

              {/* Livello */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Livello</label>
                <input
                  type="number"
                  min="1"
                  value={editLevel}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setEditLevel(val);
                    const reqXP = calculateXPForLevel(val);
                    setEditXP(reqXP);
                  }}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                />
              </div>

              {/* Punti XP */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Punti XP Totali</label>
                <input
                  type="number"
                  min="0"
                  value={editXP}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setEditXP(val);
                    const calculatedLvl = calculateLevelFromXP(val);
                    setEditLevel(calculatedLvl);
                  }}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                />
              </div>

              {/* Tier Collezionista */}
              <div className="col-span-2">
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Tier Assegnato</label>
                <select
                  value={editTier}
                  onChange={(e) => setEditTier(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                >
                  {TIERS_CONFIG.map((t) => (
                    <option key={t.tier} value={t.tier}>
                      {t.tier} (Soglia spesa: ≥ €{t.minSpent})
                    </option>
                  ))}
                </select>
              </div>

              {/* Collector Tokens */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Collector Tokens</label>
                <input
                  type="number"
                  min="0"
                  value={editTokens}
                  onChange={(e) => setEditTokens(Number(e.target.value))}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                />
              </div>

              {/* Livello Prestigio */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Livello Prestigio</label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={editPrestige}
                  onChange={(e) => setEditPrestige(Number(e.target.value))}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                />
              </div>

              {/* Spesa Totale Calcolata */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Spesa Storica (€)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editSpent}
                  onChange={(e) => setEditSpent(Number(e.target.value))}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                />
              </div>

              {/* Ordini Totali */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Numero Ordini</label>
                <input
                  type="number"
                  min="0"
                  value={editOrders}
                  onChange={(e) => setEditOrders(Number(e.target.value))}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Annulla
              </button>
              <button
                onClick={() => {
                  if (onUpdateProfile) {
                    const updated: CustomerLoyalty = {
                      ...activeProfile,
                      level: editLevel,
                      xp: editXP,
                      tier: editTier as any,
                      collectorTokens: editTokens,
                      prestigeLevel: editPrestige,
                      isManuallyManaged: editIsManuallyManaged,
                      totalSpent: editSpent,
                      totalOrders: editOrders,
                      nextTierXP: calculateXPForLevel(editLevel + 1),
                      updatedAt: new Date().toISOString(),
                    };
                    onUpdateProfile(updated);
                    setShowEditModal(false);
                  }
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl cursor-pointer shadow-md"
              >
                Salva Modifiche
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: CREATE CUSTOMER LOYALTY PROFILE (CREA NUOVO) ================= */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Plus className="h-5 w-5 text-indigo-600" />
                <span>Registra Nuovo Profilo Loyalty</span>
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Nome Cliente <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Es. Mario Rossi"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  ID Unico Cliente (Email o Nome Normalizzato) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Es. mariorossi@gmail.com oppure mario_rossi"
                  value={newCustId}
                  onChange={(e) => setNewCustId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Email (Opzionale)</label>
                <input
                  type="email"
                  placeholder="Es. mariorossi@gmail.com"
                  value={newCustEmail}
                  onChange={(e) => {
                    setNewCustEmail(e.target.value);
                    if (!newCustId) {
                      setNewCustId(e.target.value);
                    }
                  }}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Livello Iniziale</label>
                  <input
                    type="number"
                    min="1"
                    value={newCustLevel}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setNewCustLevel(val);
                      const reqXP = calculateXPForLevel(val);
                      setNewCustXP(reqXP);
                    }}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">XP Iniziale</label>
                  <input
                    type="number"
                    min="0"
                    value={newCustXP}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setNewCustXP(val);
                      const calculatedLvl = calculateLevelFromXP(val);
                      setNewCustLevel(calculatedLvl);
                    }}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Tier Iniziale</label>
                <select
                  value={newCustTier}
                  onChange={(e) => setNewCustTier(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                >
                  {TIERS_CONFIG.map((t) => (
                    <option key={t.tier} value={t.tier}>
                      {t.tier}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Annulla
              </button>
              <button
                onClick={() => {
                  if (!newCustName || !newCustId) {
                    alert("Nome e ID Cliente sono richiesti!");
                    return;
                  }
                  if (onUpdateProfile) {
                    const email = newCustEmail.trim() || undefined;
                    const customerId = newCustId.trim().toLowerCase();
                    const newProfile: CustomerLoyalty = {
                      customerId,
                      customerName: newCustName.trim(),
                      email,
                      totalSpent: 0,
                      totalOrders: 0,
                      xp: newCustXP,
                      level: newCustLevel,
                      tier: newCustTier as any,
                      nextTierXP: calculateXPForLevel(newCustLevel + 1),
                      collectorTokens: Math.floor(newCustXP / 100),
                      prestigeLevel: 0,
                      badges: [],
                      completedMissions: [],
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                      lastTierUpdate: new Date().toISOString(),
                      isManuallyManaged: true,
                    };
                    onUpdateProfile(newProfile);
                    setShowCreateModal(false);
                    setSelectedCustomerId(newProfile.customerId);
                    setActiveSubTab("customer");
                    setNewCustId("");
                    setNewCustName("");
                    setNewCustEmail("");
                    setNewCustLevel(1);
                    setNewCustXP(0);
                    setNewCustTier("Rookie Collector");
                  }
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl cursor-pointer shadow-md"
              >
                Registra Profilo
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
