/**
 * @file loyaltyEngine.ts
 * @description Decoupled Loyalty & Rewards calculation engine for Jana No Sekai.
 * Handles Tier assignment (every €50 = 1 point/token), XP progress, badges,
 * and customer historical spending evaluations independently from cart state logic.
 */

import {
  CustomerLoyalty,
  CustomerLoyaltyHistory,
  LoyaltyBadge,
  LoyaltyMission,
  LoyaltyConfig,
  TierConfig,
  Carrello,
  DettaglioCarrello
} from "../types";

/**
 * Default global configuration for the loyalty engine.
 */
export const DEFAULT_LOYALTY_CONFIG: LoyaltyConfig = {
  xpPerEuro: 10,
  xpMultiplier: 1,
  activeEventName: "Nessun Evento Speciale Attivo",
  doubleXpActive: false
};

/**
 * Complete list of Loyalty Tiers mapped to spending thresholds and active perks.
 */
export const TIERS_CONFIG: TierConfig[] = [
  {
    tier: "Rookie Collector",
    minSpent: 0,
    color: "#a1a1aa", // zinc
    badgeBg: "bg-slate-100 text-slate-700 border-slate-300",
    badgeText: "text-slate-700",
    borderStyle: "border-slate-300",
    iconName: "User",
    perks: ["Nessun beneficio aggiuntivo"]
  },
  {
    tier: "Binder Keeper",
    minSpent: 250,
    color: "#94a3b8", // slate silver
    badgeBg: "bg-slate-200 text-slate-800 border-slate-400",
    badgeText: "text-slate-800",
    borderStyle: "border-slate-400",
    iconName: "FolderHeart",
    perks: ["Badge esclusivo Binder Keeper", "Notifiche arrivo nuovi stock"]
  },
  {
    tier: "Card Hunter",
    minSpent: 750,
    color: "#3b82f6", // blue
    badgeBg: "bg-blue-100 text-blue-800 border-blue-300",
    badgeText: "text-blue-800",
    borderStyle: "border-blue-400",
    iconName: "Search",
    perks: ["Priorità nell'assistenza e supporto cliente", "Badge Card Hunter"]
  },
  {
    tier: "Treasure Seeker",
    minSpent: 1500,
    color: "#10b981", // emerald green
    badgeBg: "bg-emerald-100 text-emerald-800 border-emerald-300",
    badgeText: "text-emerald-800",
    borderStyle: "border-emerald-400",
    iconName: "Compass",
    perks: ["Accesso anticipato 30 minuti ai preordini e drop", "Supporto Prioritario"]
  },
  {
    tier: "Vault Master",
    minSpent: 3000,
    color: "#8b5cf6", // purple
    badgeBg: "bg-purple-100 text-purple-800 border-purple-300",
    badgeText: "text-purple-800",
    borderStyle: "border-purple-400",
    iconName: "Lock",
    perks: [
      "Accesso anticipato 1 ora ai drop esclusivi",
      "Badge esclusivo Vault Master",
      "Assistenza Dedicata VIP"
    ]
  },
  {
    tier: "Legendary Collector",
    minSpent: 6000,
    color: "#f97316", // orange
    badgeBg: "bg-orange-100 text-orange-800 border-orange-300",
    badgeText: "text-orange-800",
    borderStyle: "border-orange-400",
    iconName: "Flame",
    perks: ["Sconto permanente 2% su tutti gli acquisti", "Accesso anticipato 1 ora"]
  },
  {
    tier: "Grail Hunter",
    minSpent: 10000,
    color: "#ef4444", // red
    badgeBg: "bg-rose-100 text-rose-800 border-rose-300",
    badgeText: "text-rose-800",
    borderStyle: "border-rose-400",
    iconName: "Trophy",
    perks: [
      "Spedizione gratuita automatica per ordini sopra 50€",
      "Sconto permanente 2%",
      "Priority Grading Access"
    ]
  },
  {
    tier: "Mythic Collector",
    minSpent: 20000,
    color: "#0284c7", // dark cyan mythic
    badgeBg: "bg-cyan-100 text-cyan-900 border-cyan-400 font-extrabold",
    badgeText: "text-cyan-900",
    borderStyle: "border-cyan-500",
    iconName: "Sparkles",
    perks: [
      "Accesso VIP permanente & riservato",
      "Drop ed edizioni limitate esclusive",
      "Spedizione Gratuita > 50€"
    ]
  },
  {
    tier: "Hall of Fame",
    minSpent: 50000,
    color: "#eab308", // gold
    badgeBg: "bg-amber-100 text-amber-900 border-amber-400 font-black tracking-wider",
    badgeText: "text-amber-900",
    borderStyle: "border-amber-500 shadow-md",
    iconName: "Crown",
    perks: [
      "Profilo dorato con effetto speciale animato",
      "Badge Unico Hall of Fame",
      "Inviti ad eventi esclusivi VIP",
      "Consulenza personalizzata carte rare"
    ]
  }
];

// Available Badges
export const ALL_BADGES: LoyaltyBadge[] = [
  {
    id: "first_purchase",
    name: "First Purchase",
    description: "Effettuato il primo ordine con successo",
    icon: "ShoppingBag",
    category: "orders"
  },
  {
    id: "orders_10",
    name: "10 Orders Master",
    description: "Raggiunta la quota di 10 ordini completati",
    icon: "PackageCheck",
    category: "orders"
  },
  {
    id: "orders_100",
    name: "100 Orders Legend",
    description: "Traguardo epico: 100 ordini completati!",
    icon: "Sparkles",
    category: "orders"
  },
  {
    id: "spent_1000",
    name: "Spent 1000€",
    description: "Ha superato i 1.000€ totali di spesa",
    icon: "Coins",
    category: "spent"
  },
  {
    id: "spent_5000",
    name: "Spent 5000€",
    description: "Ha superato i 5.000€ totali di spesa",
    icon: "CreditCard",
    category: "spent"
  },
  {
    id: "spent_10000",
    name: "Spent 10000€",
    description: "Elite Spender: oltre 10.000€ di spesa",
    icon: "Gem",
    category: "spent"
  },
  {
    id: "early_supporter",
    name: "Early Supporter",
    description: "Cliente storico e sostenitore della prima ora",
    icon: "ShieldCheck",
    category: "special"
  },
  {
    id: "collector_2026",
    name: "Collector Since 2026",
    description: "Iscritto e attivo nell'anno 2026",
    icon: "Calendar",
    category: "special"
  },
  {
    id: "pokemon_master",
    name: "Pokémon Master",
    description: "Acquistati prodotti o carte del mondo Pokémon",
    icon: "Zap",
    category: "tcg"
  },
  {
    id: "one_piece_pirate",
    name: "One Piece Pirate",
    description: "Acquistati prodotti della saga One Piece Card Game",
    icon: "Anchor",
    category: "tcg"
  },
  {
    id: "mtg_planeswalker",
    name: "MTG Planeswalker",
    description: "Collezionista Magic: The Gathering",
    icon: "Flame",
    category: "tcg"
  },
  {
    id: "funko_addict",
    name: "Funko Addict",
    description: "Appassionato e collezionista di Funko Pop",
    icon: "Smile",
    category: "tcg"
  },
  {
    id: "elite_buyer",
    name: "Elite Buyer",
    description: "Raggiunto il Tier Vault Master o superiore",
    icon: "Crown",
    category: "tier"
  },
  {
    id: "lucky_pull",
    name: "Lucky Pull Winner",
    description: "Vincitore di un bonus speciale Lucky Pull",
    icon: "Gift",
    category: "special"
  },
  {
    id: "top_100",
    name: "Top 100 Customer",
    description: "Presente nella top 100 dei clienti più importanti",
    icon: "Medal",
    category: "special"
  }
];

// Available Missions
export const ALL_MISSIONS: LoyaltyMission[] = [
  {
    id: "mission_pokemon_5",
    title: "Allenatore Pokémon",
    description: "Acquista almeno 5 prodotti o carte del mondo Pokémon",
    target: 5,
    rewardXP: 1000,
    rewardTokens: 10,
    category: "tcg"
  },
  {
    id: "mission_orders_3_month",
    title: "Collezionista Seriale",
    description: "Completa 3 ordini negli ultimi 30 giorni",
    target: 3,
    rewardXP: 800,
    rewardTokens: 5,
    category: "orders"
  },
  {
    id: "mission_preorder_1",
    title: "Pioniere Preordini",
    description: "Effettua il tuo primo preordine di un nuovo set",
    target: 1,
    rewardXP: 500,
    rewardTokens: 5,
    category: "preorder"
  },
  {
    id: "mission_grading_1",
    title: "Grading Novice",
    description: "Sottometti almeno 1 carta per la gradazione",
    target: 1,
    rewardXP: 1200,
    rewardTokens: 15,
    category: "grading"
  }
];

/**
 * Formula per calcolare l'XP necessaria a raggiungere un determinato livello
 * Formula: 1000 * L^1.5
 */
export function calculateXPForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.floor(1000 * Math.pow(level - 1, 1.5));
}

/**
 * Calcola il livello corrente in base all'XP accumulata
 */
export function calculateLevelFromXP(xp: number): number {
  if (xp <= 0) return 1;
  let level = 1;
  while (calculateXPForLevel(level + 1) <= xp) {
    level++;
  }
  return level;
}

/**
 * Trova la configurazione Tier per un dato ammontare speso
 */
export function calculateTierFromSpent(spent: number): TierConfig {
  let currentTier = TIERS_CONFIG[0];
  for (const t of TIERS_CONFIG) {
    if (spent >= t.minSpent) {
      currentTier = t;
    }
  }
  return currentTier;
}

/**
 * Calcola la percentuale di avanzamento e l'importo mancante per il prossimo Tier
 */
export function calculateNextTierThreshold(spent: number): {
  nextTier: TierConfig | null;
  neededSpent: number;
  progressPercent: number;
} {
  const currentTier = calculateTierFromSpent(spent);
  const currentIndex = TIERS_CONFIG.findIndex((t) => t.tier === currentTier.tier);

  if (currentIndex >= TIERS_CONFIG.length - 1) {
    return {
      nextTier: null,
      neededSpent: 0,
      progressPercent: 100
    };
  }

  const nextTier = TIERS_CONFIG[currentIndex + 1];
  const range = nextTier.minSpent - currentTier.minSpent;
  const currentProgress = spent - currentTier.minSpent;
  const progressPercent = Math.min(100, Math.max(0, Math.floor((currentProgress / range) * 100)));
  const neededSpent = Math.max(0, nextTier.minSpent - spent);

  return {
    nextTier,
    neededSpent,
    progressPercent
  };
}

/**
 * Calcola gli XP generati da un singolo ordine
 */
export function calculateOrderXP(
  orderValue: number,
  config: LoyaltyConfig = DEFAULT_LOYALTY_CONFIG
): { baseXP: number; orderBonusXP: number; totalXP: number } {
  const multiplier = config.xpMultiplier || 1;
  const baseXP = Math.floor(orderValue * config.xpPerEuro * multiplier);

  // Bonus Ordine Grande
  let orderBonusXP = 0;
  if (orderValue >= 1000) {
    orderBonusXP = 5000;
  } else if (orderValue >= 500) {
    orderBonusXP = 2000;
  } else if (orderValue >= 250) {
    orderBonusXP = 750;
  } else if (orderValue >= 100) {
    orderBonusXP = 250;
  }

  return {
    baseXP,
    orderBonusXP,
    totalXP: baseXP + orderBonusXP
  };
}

/**
 * Calcola i Collector Tokens generati (1 Token ogni 50€ spesi)
 */
export function calculateTokens(orderValue: number): number {
  return Math.floor(orderValue / 50);
}

/**
 * Genera il profilo Loyalty per ciascun cliente analizzando tutti i carrelli con pagamenti o completati
 */
export function processCustomerLoyaltyFromCarts(
  carrelli: Carrello[],
  dettagli: DettaglioCarrello[] = [],
  config: LoyaltyConfig = DEFAULT_LOYALTY_CONFIG,
  existingProfiles: CustomerLoyalty[] = [],
  existingHistory: CustomerLoyaltyHistory[] = []
): { profiles: CustomerLoyalty[]; historyLogs: CustomerLoyaltyHistory[] } {
  // Raggruppa tutti i carrelli per cliente per sommare i pagamenti e calcolare l'XP progressivo
  const customerMap = new Map<string, {
    customerName: string;
    email?: string;
    completedCarts: Carrello[];
    allCarts: Carrello[];
    totalSpent: number;
  }>();

  carrelli.forEach((cart) => {
    // Normalizza chiave cliente (email o nome)
    const key = (cart.Email && cart.Email.trim().toLowerCase()) || cart.Nome_Cliente.trim().toLowerCase();
    if (!key) return;

    if (!customerMap.has(key)) {
      customerMap.set(key, {
        customerName: cart.Nome_Cliente || key,
        email: cart.Email,
        completedCarts: [],
        allCarts: [],
        totalSpent: 0
      });
    }

    const data = customerMap.get(key)!;
    data.allCarts.push(cart);
    
    // Somma tutti i pagamenti effettuati
    data.totalSpent += Number(cart.Totale_Pagato || 0);

    if (cart.Stato_Carrello === "Completato") {
      data.completedCarts.push(cart);
    }
  });

  const newHistoryLogs: CustomerLoyaltyHistory[] = [...existingHistory];

  const updatedProfiles: CustomerLoyalty[] = Array.from(customerMap.entries()).map(([key, data]) => {
    const existing = existingProfiles.find((p) => p.customerId === key);

    const totalSpent = Math.round(data.totalSpent * 100) / 100;
    const totalOrders = data.completedCarts.length;

    // Se il profilo è gestito manualmente dall'admin, preserviamo i suoi valori di livello
    if (existing && existing.isManuallyManaged) {
      return {
        ...existing,
        totalSpent,
        totalOrders,
        nextTierXP: calculateXPForLevel(existing.level + 1),
        updatedAt: new Date().toISOString()
      };
    }

    // Calcolo XP Totale basato sui pagamenti effettuati su tutti i carrelli del cliente
    let calculatedXP = 0;
    data.allCarts.forEach((cart) => {
      const { totalXP } = calculateOrderXP(cart.Totale_Pagato || 0, config);
      calculatedXP += totalXP;
    });

    // Bonus Fedeltà: +1500 XP ogni 10 ordini completati
    const tenOrdersBonus = Math.floor(totalOrders / 10) * 1500;
    calculatedXP += tenOrdersBonus;

    // Se esiste una rettifica manuale XP
    if (existing && existing.xp > calculatedXP) {
      calculatedXP = existing.xp; // Mantieni XP manuali aggiunti
    }

    const level = calculateLevelFromXP(calculatedXP);
    const tierConfig = calculateTierFromSpent(totalSpent);
    
    // Calcola i token fedeltà in modo non cumulativo per evitare raddoppi / inflazione all'infinito.
    // I token totali sono la somma dei token base (€50 spesi = 1 token) + i token assegnati manualmente presenti nello storico.
    const manualTokensFromHistory = (existingHistory || [])
      .filter((h) => h.customerId === key)
      .reduce((sum, h) => sum + (h.tokensEarned || 0), 0);
    const collectorTokens = Math.floor(totalSpent / 50) + manualTokensFromHistory;

    // badge automatici
    const unlockedBadges = new Set<string>(existing?.badges || []);
    if (totalOrders >= 1) unlockedBadges.add("first_purchase");
    if (totalOrders >= 10) unlockedBadges.add("orders_10");
    if (totalOrders >= 100) unlockedBadges.add("orders_100");
    if (totalSpent >= 1000) unlockedBadges.add("spent_1000");
    if (totalSpent >= 5000) unlockedBadges.add("spent_5000");
    if (totalSpent >= 10000) unlockedBadges.add("spent_10000");
    if (tierConfig.minSpent >= 3000) unlockedBadges.add("elite_buyer");

    // controlla tag carte o TCG nei dettagli del carrello del cliente
    const customerCartIds = new Set(data.allCarts.map((c) => c.ID_Carrello));
    const customerDetails = dettagli.filter((d) => customerCartIds.has(d.ID_Carrello));
    if (customerDetails.length > 0) {
      unlockedBadges.add("collector_2026");
    }

    const profile: CustomerLoyalty = {
      customerId: key,
      customerName: data.customerName,
      email: data.email,
      totalSpent,
      totalOrders,
      xp: calculatedXP,
      level,
      tier: tierConfig.tier,
      nextTierXP: calculateXPForLevel(level + 1),
      collectorTokens,
      prestigeLevel: existing?.prestigeLevel || 0,
      badges: Array.from(unlockedBadges),
      completedMissions: existing?.completedMissions || [],
      lastTierUpdate: existing?.tier !== tierConfig.tier ? new Date().toISOString() : (existing?.lastTierUpdate || new Date().toISOString()),
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return profile;
  });

  return {
    profiles: updatedProfiles,
    historyLogs: newHistoryLogs
  };
}
