export interface OggettoMagazzino {
  ID_Oggetto: string;
  Nome: string;
  Quantità_Disponibile: number;
  Costo_Acquisto: number;
  Prezzo_Vendita: number;
  
  // Preordini
  Is_Preordine?: boolean;
  Acconto_Pagato?: number;
  Data_Arrivo_Prevista?: string;
  Stato_Preordine?: "In_Attesa" | "Saldato" | "Arrivato";
  Data_Spedizione_Presunta?: string;

  // Carte Singole
  Is_Carta_Singola?: boolean;
  Espansione?: string;
  Rarità?: string;
  Condizione?: "NM" | "EX" | "GD" | "PL" | "PO";
  Lingua?: "ITA" | "ENG" | "JPN" | "GER" | "FRA" | "ESP";
  Gradata?: boolean;
  Archiviata?: boolean;
  Storico_Costi?: string;
  Costo_Spedizione_Lotto?: number;
  Costo_Dogana_Lotto?: number;
  Costo_Accessori_Lotto?: number;
  Tag?: string;
}

export type StatoCarrello = "Aperto" | "Pronto_per_Spedizione" | "Spedizione_Ricevuta_da_Consegnare" | "Completato";

export interface Carrello {
  ID_Carrello: string;
  Nome_Cliente: string;
  Stato_Carrello: StatoCarrello;
  Totale_Pagato: number;
  Telefono?: string;
  Email?: string;
  Indirizzo_Spedizione?: string;
  Tag?: string;
  Strike?: number;
  Cattivo_Data?: string;
  Note?: string;
  Note_Interne?: string;
  Data_Ultimo_Messaggio?: string;
}

export interface DettaglioCarrello {
  ID_Carrello: string;
  ID_Oggetto: string;
  Pagato_Singolarmente: boolean;
  Pagamento_Posticipato?: boolean;
  Acconto_Pagato?: number;
  Prezzo_Registrato: number;
  ID_Spedizione?: string;
  Reso?: boolean;
}

export interface Spedizione {
  ID_Spedizione: string;
  ID_Carrello: string;
  Link_Foto_Oggetti: string; // Comma separated URLs if multiple
  Data_Spedizione: string;
  Tracking: string;
  Stato_Consegna: string;
  Oggetti_Spediti?: string; // Comma separated list of Item IDs or Names
  Corriere?: string;
  Costo_Spedizione?: number;
  Nome_Cliente?: string;
  Indirizzo_Spedizione?: string;
  Telefono?: string;
  Tag?: string;
}

export interface Finanza {
  Data: string;
  Tipo: "Entrata" | "Uscita";
  Importo: number;
  Categoria: string; // e.g. "Acquisto Stock", "Spedizione", "Vendita", "Altro"
  Note: string;
}

export type Operatore = "Owner" | "Operatore 1" | "Operatore 2" | "Operatore 3";

export interface UtenteRegistrato {
  Email: string;
  Ruolo: "owner" | "moderatore" | "utente";
  Data_Registrazione: string;
}

export interface GradingGroup {
  ID_Gruppo_Grading: string;
  Nome_Gruppo: string;
  Compagnia?: string;
  Data_Creazione: string;
  Stato_Gruppo: "In Preparazione" | "Spedito" | "Ritornato" | "Chiuso";
}

export interface GradingItem {
  ID_Oggetto_Grading: string;
  ID_Carrello: string;
  Nome_Carta: string;
  Tipologia_Servizio: string;
  Costo_Cliente: number;
  Costo_Acquisto: number;
  Margine_Lordo: number;
  Link_Foto: string;
  Pagato_Singolarmente: boolean;
  Pagamento_Posticipato?: boolean;
  Acconto_Pagato?: number;
  ID_Gruppo_Grading?: string;
  Link_Foto_Ritornata?: string;
  Metodo_Consegna?: string; // "Consegna" | "Spedizione" | "Ritiro a mano"
  ID_Spedizione?: string;
  Reso?: boolean;
}

export interface ListinoGradingItem {
  Tipologia_Servizio: string;
  Costo_Cliente: number;
  Costo_Acquisto: number;
}

// LOYALTY & REPUTATION SYSTEM TYPES
export type TierName =
  | "Rookie Collector"
  | "Binder Keeper"
  | "Card Hunter"
  | "Treasure Seeker"
  | "Vault Master"
  | "Legendary Collector"
  | "Grail Hunter"
  | "Mythic Collector"
  | "Hall of Fame";

export interface TierConfig {
  tier: TierName;
  minSpent: number;
  color: string;
  badgeBg: string;
  badgeText: string;
  borderStyle: string;
  iconName: string;
  perks: string[];
}

export interface LoyaltyBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: "orders" | "spent" | "special" | "tcg" | "tier";
}

export interface LoyaltyMission {
  id: string;
  title: string;
  description: string;
  target: number;
  rewardXP: number;
  rewardTokens: number;
  category: "orders" | "spent" | "tcg" | "preorder" | "grading";
}

export interface CustomerLoyalty {
  customerId: string; // Email or normalized customer name
  customerName: string;
  email?: string;
  totalSpent: number;
  totalOrders: number;
  xp: number;
  level: number;
  tier: TierName;
  nextTierXP: number;
  collectorTokens: number;
  prestigeLevel: number;
  badges: string[]; // Badge IDs
  completedMissions: string[];
  lastTierUpdate: string;
  createdAt: string;
  updatedAt: string;
  isManuallyManaged?: boolean;
}

export interface CustomerLoyaltyHistory {
  id: string;
  customerId: string;
  orderId?: string;
  orderValue?: number;
  xpEarned: number;
  tokensEarned: number;
  previousXP: number;
  newXP: number;
  previousTier: TierName;
  newTier: TierName;
  reason: string;
  createdAt: string;
}

export interface LoyaltyConfig {
  xpPerEuro: number;
  xpMultiplier: number; // 1x, 2x, 3x
  activeEventName: string;
  eventEndDate?: string;
  doubleXpActive: boolean;
}


