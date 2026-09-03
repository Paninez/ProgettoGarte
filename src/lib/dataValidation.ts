// Data Validation & Format Integrity Safeguards Module

import {
  OggettoMagazzino,
  Carrello,
  DettaglioCarrello,
  Spedizione,
  Finanza,
  UtenteRegistrato,
  GradingGroup,
  GradingItem,
  ListinoGradingItem,
  StatoCarrello,
  CustomerLoyalty,
  CustomerLoyaltyHistory,
  LoyaltyConfig,
} from "../types";

export function parseSafeFloat(val: any, fallback: number = 0): number {
  if (val === null || val === undefined || val === "") return fallback;
  if (typeof val === "number") return isNaN(val) ? fallback : val;
  const str = val.toString().trim().replace(/\s+/g, "").replace(",", ".");
  const num = parseFloat(str);
  return isNaN(num) ? fallback : num;
}

export function parseSafeInt(val: any, fallback: number = 0): number {
  if (val === null || val === undefined || val === "") return fallback;
  if (typeof val === "number") return isNaN(val) ? fallback : Math.floor(val);
  const str = val.toString().trim();
  const num = parseInt(str, 10);
  return isNaN(num) ? fallback : num;
}

export function parseSafeBool(val: any): boolean {
  if (val === true || val === 1) return true;
  if (!val) return false;
  const str = val.toString().trim().toUpperCase();
  return str === "TRUE" || str === "1" || str === "SI" || str === "SÌ" || str === "YES";
}

export function sanitizeString(val: any): string {
  if (val === null || val === undefined) return "";
  return val.toString().trim();
}

export interface ValidatedDataset {
  magazzino: OggettoMagazzino[];
  carrelli: Carrello[];
  dettagli: DettaglioCarrello[];
  spedizioni: Spedizione[];
  finanze: Finanza[];
  gruppiGrading: GradingGroup[];
  oggettiInGrading: GradingItem[];
  listinoGrading: ListinoGradingItem[];
  utentiRegistrati: UtenteRegistrato[];
  customTags?: string[];
  config?: any;
  loyaltyConfig?: LoyaltyConfig;
  loyaltyProfiles?: CustomerLoyalty[];
  loyaltyHistory?: CustomerLoyaltyHistory[];
}

export function sanitizeOggettoMagazzino(raw: any): OggettoMagazzino {
  return {
    ID_Oggetto: sanitizeString(raw.ID_Oggetto || raw.id || raw[0]),
    Nome: sanitizeString(raw.Nome || raw.nome || raw[1]),
    Quantità_Disponibile: parseSafeInt(raw.Quantità_Disponibile ?? raw.quantita ?? raw[2], 0),
    Costo_Acquisto: parseSafeFloat(raw.Costo_Acquisto ?? raw.costo ?? raw[3], 0),
    Prezzo_Vendita: parseSafeFloat(raw.Prezzo_Vendita ?? raw.prezzo ?? raw[4], 0),
    Is_Preordine: parseSafeBool(raw.Is_Preordine ?? raw[5]),
    Acconto_Pagato: parseSafeFloat(raw.Acconto_Pagato ?? raw[6], 0),
    Data_Arrivo_Prevista: sanitizeString(raw.Data_Arrivo_Prevista ?? raw[7]),
    Stato_Preordine: raw.Stato_Preordine || raw[8] || undefined,
    Is_Carta_Singola: parseSafeBool(raw.Is_Carta_Singola ?? raw[9]),
    Espansione: sanitizeString(raw.Espansione ?? raw[10]) || undefined,
    Rarità: sanitizeString(raw.Rarità ?? raw[11]) || undefined,
    Condizione: (raw.Condizione ?? raw[12]) || undefined,
    Lingua: (raw.Lingua ?? raw[13]) || undefined,
    Gradata: parseSafeBool(raw.Gradata ?? raw[14]),
    Archiviata: parseSafeBool(raw.Archiviata ?? raw[15]),
    Storico_Costi: sanitizeString(raw.Storico_Costi ?? raw[16]) || undefined,
    Costo_Spedizione_Lotto: parseSafeFloat(raw.Costo_Spedizione_Lotto ?? raw[17], 0),
    Costo_Dogana_Lotto: parseSafeFloat(raw.Costo_Dogana_Lotto ?? raw[18], 0),
    Costo_Accessori_Lotto: parseSafeFloat(raw.Costo_Accessori_Lotto ?? raw[19], 0),
    Data_Spedizione_Presunta: sanitizeString(raw.Data_Spedizione_Presunta ?? raw[20]),
    Tag: sanitizeString(raw.Tag ?? raw[21]),
  };
}

export function sanitizeCarrello(raw: any): Carrello {
  let rawStatus = sanitizeString(raw.Stato_Carrello || raw.stato || raw[2] || "Aperto");
  
  // Map legacy/invalid status values to official StatoCarrello values
  if (rawStatus === "In Attesa" || rawStatus === "In Lavorazione" || rawStatus === "In Attesa Pagamento") {
    rawStatus = "Aperto";
  } else if (rawStatus === "Saldato" || rawStatus === "Chiuso" || rawStatus === "Spedito") {
    rawStatus = "Completato";
  }

  const validStati = ["Aperto", "Pronto_per_Spedizione", "Spedizione_Ricevuta_da_Consegnare", "Completato"];
  const finalStatus = validStati.includes(rawStatus) ? (rawStatus as StatoCarrello) : "Aperto";

  return {
    ID_Carrello: sanitizeString(raw.ID_Carrello || raw.id || raw[0]),
    Nome_Cliente: sanitizeString(raw.Nome_Cliente || raw.nome || raw[1]),
    Stato_Carrello: finalStatus,
    Totale_Pagato: parseSafeFloat(raw.Totale_Pagato ?? raw.totale ?? raw[3], 0),
    Telefono: sanitizeString(raw.Telefono ?? raw.tel ?? raw[4]),
    Email: sanitizeString(raw.Email ?? raw.email ?? raw[5]),
    Indirizzo_Spedizione: sanitizeString(raw.Indirizzo_Spedizione ?? raw.indirizzo ?? raw[6]),
    Tag: sanitizeString(raw.Tag ?? raw.tag ?? raw[7]),
    Strike: parseSafeInt(raw.Strike ?? raw[8], 0),
    Cattivo_Data: sanitizeString(raw.Cattivo_Data ?? raw[9]),
    Note: sanitizeString(raw.Note ?? raw.note ?? raw[10]),
    Data_Ultimo_Messaggio: sanitizeString(raw.Data_Ultimo_Messaggio ?? raw.data_ultimo_messaggio ?? raw[11]),
  };
}

export function sanitizeDettaglioCarrello(raw: any): DettaglioCarrello {
  return {
    ID_Carrello: sanitizeString(raw.ID_Carrello || raw[0]),
    ID_Oggetto: sanitizeString(raw.ID_Oggetto || raw[1]),
    Pagato_Singolarmente: parseSafeBool(raw.Pagato_Singolarmente ?? raw[2]),
    Prezzo_Registrato: parseSafeFloat(raw.Prezzo_Registrato ?? raw[3], 0),
    Pagamento_Posticipato: parseSafeBool(raw.Pagamento_Posticipato ?? raw[4]),
    Acconto_Pagato: parseSafeFloat(raw.Acconto_Pagato ?? raw[5], 0),
    ID_Spedizione: sanitizeString(raw.ID_Spedizione || raw[6]),
    Reso: parseSafeBool(raw.Reso ?? raw[7]),
  };
}

export function sanitizeSpedizione(raw: any): Spedizione {
  return {
    ID_Spedizione: sanitizeString(raw.ID_Spedizione || raw[0]),
    ID_Carrello: sanitizeString(raw.ID_Carrello || raw[1]),
    Link_Foto_Oggetti: sanitizeString(raw.Link_Foto_Oggetti || raw[2]),
    Data_Spedizione: sanitizeString(raw.Data_Spedizione || raw[3]),
    Tracking: sanitizeString(raw.Tracking || raw[4]),
    Stato_Consegna: sanitizeString(raw.Stato_Consegna || raw[5]),
    Oggetti_Spediti: sanitizeString(raw.Oggetti_Spediti || raw[6]),
    Nome_Cliente: sanitizeString(raw.Nome_Cliente || raw[7]),
    Indirizzo_Spedizione: sanitizeString(raw.Indirizzo_Spedizione || raw[8]),
    Telefono: sanitizeString(raw.Telefono || raw[9]),
    Tag: sanitizeString(raw.Tag || raw[10]),
    Corriere: sanitizeString(raw.Corriere || raw[11]),
    Costo_Spedizione: parseSafeFloat(raw.Costo_Spedizione ?? raw[12], 0),
  };
}

export function sanitizeFinanza(raw: any): Finanza {
  return {
    Data: sanitizeString(raw.Data || raw[0]),
    Tipo: sanitizeString(raw.Tipo || raw[1]) === "Uscita" ? "Uscita" : "Entrata",
    Importo: parseSafeFloat(raw.Importo ?? raw[2], 0),
    Categoria: sanitizeString(raw.Categoria || raw[3]),
    Note: sanitizeString(raw.Note || raw[4]),
  };
}

export function sanitizeGradingGroup(raw: any): GradingGroup {
  return {
    ID_Gruppo_Grading: sanitizeString(raw.ID_Gruppo_Grading || raw[0]),
    Nome_Gruppo: sanitizeString(raw.Nome_Gruppo || raw[1]),
    Compagnia: (sanitizeString(raw.Compagnia || raw[2]) as "PSA" | "BGS") || "PSA",
    Data_Creazione: sanitizeString(raw.Data_Creazione || raw[3]),
    Stato_Gruppo: (sanitizeString(raw.Stato_Gruppo || raw[4]) as any) || "In Preparazione",
  };
}

export function sanitizeGradingItem(raw: any): GradingItem {
  return {
    ID_Oggetto_Grading: sanitizeString(raw.ID_Oggetto_Grading || raw[0]),
    ID_Carrello: sanitizeString(raw.ID_Carrello || raw[1]),
    Nome_Carta: sanitizeString(raw.Nome_Carta || raw[2]),
    Tipologia_Servizio: sanitizeString(raw.Tipologia_Servizio || raw[3]),
    Costo_Cliente: parseSafeFloat(raw.Costo_Cliente ?? raw[4], 0),
    Costo_Acquisto: parseSafeFloat(raw.Costo_Acquisto ?? raw[5], 0),
    Margine_Lordo: parseSafeFloat(raw.Margine_Lordo ?? raw[6], 0),
    Link_Foto: sanitizeString(raw.Link_Foto || raw[7]),
    Pagato_Singolarmente: parseSafeBool(raw.Pagato_Singolarmente ?? raw[8]),
    ID_Gruppo_Grading: sanitizeString(raw.ID_Gruppo_Grading || raw[9]),
    Link_Foto_Ritornata: sanitizeString(raw.Link_Foto_Ritornata || raw[10]),
    Metodo_Consegna: sanitizeString(raw.Metodo_Consegna || raw[11]),
    Pagamento_Posticipato: parseSafeBool(raw.Pagamento_Posticipato ?? raw[12]),
    Acconto_Pagato: parseSafeFloat(raw.Acconto_Pagato ?? raw[13], 0),
    ID_Spedizione: sanitizeString(raw.ID_Spedizione || raw[14]),
    Reso: parseSafeBool(raw.Reso ?? raw[15]),
  };
}

export function sanitizeListinoGradingItem(raw: any): ListinoGradingItem {
  return {
    Tipologia_Servizio: sanitizeString(raw.Tipologia_Servizio || raw[0]),
    Costo_Cliente: parseSafeFloat(raw.Costo_Cliente ?? raw[1], 0),
    Costo_Acquisto: parseSafeFloat(raw.Costo_Acquisto ?? raw[2], 0),
  };
}

export function sanitizeUtenteRegistrato(raw: any): UtenteRegistrato {
  return {
    Email: sanitizeString(raw.Email || raw[0]),
    Ruolo: (sanitizeString(raw.Ruolo || raw[1]) as "owner" | "moderatore" | "utente") || "utente",
    Data_Registrazione: sanitizeString(raw.Data_Registrazione || raw[2]),
  };
}

export function sanitizeCustomerLoyalty(raw: any): CustomerLoyalty {
  return {
    customerId: sanitizeString(raw.customerId || raw.ID_Cliente || ""),
    customerName: sanitizeString(raw.customerName || raw.Nome_Cliente || ""),
    email: raw.email ? sanitizeString(raw.email) : undefined,
    totalSpent: parseSafeFloat(raw.totalSpent, 0),
    totalOrders: parseSafeInt(raw.totalOrders, 0),
    xp: parseSafeInt(raw.xp, 0),
    level: parseSafeInt(raw.level, 1),
    tier: (raw.tier || "Bronzo") as any,
    nextTierXP: parseSafeInt(raw.nextTierXP, 100),
    collectorTokens: parseSafeInt(raw.collectorTokens, 0),
    prestigeLevel: parseSafeInt(raw.prestigeLevel, 0),
    badges: Array.isArray(raw.badges) ? raw.badges.map(sanitizeString) : [],
    completedMissions: Array.isArray(raw.completedMissions) ? raw.completedMissions.map(sanitizeString) : [],
    lastTierUpdate: sanitizeString(raw.lastTierUpdate || ""),
    createdAt: sanitizeString(raw.createdAt || ""),
    updatedAt: sanitizeString(raw.updatedAt || ""),
    isManuallyManaged: parseSafeBool(raw.isManuallyManaged),
  };
}

export function sanitizeCustomerLoyaltyHistory(raw: any): CustomerLoyaltyHistory {
  return {
    id: sanitizeString(raw.id || ""),
    customerId: sanitizeString(raw.customerId || ""),
    orderId: raw.orderId ? sanitizeString(raw.orderId) : undefined,
    orderValue: raw.orderValue !== undefined ? parseSafeFloat(raw.orderValue) : undefined,
    xpEarned: parseSafeInt(raw.xpEarned, 0),
    tokensEarned: parseSafeInt(raw.tokensEarned, 0),
    previousXP: parseSafeInt(raw.previousXP, 0),
    newXP: parseSafeInt(raw.newXP, 0),
    previousTier: (raw.previousTier || "Bronzo") as any,
    newTier: (raw.newTier || "Bronzo") as any,
    reason: sanitizeString(raw.reason || ""),
    createdAt: sanitizeString(raw.createdAt || ""),
  };
}

export function sanitizeLoyaltyConfig(raw: any): LoyaltyConfig {
  return {
    xpPerEuro: parseSafeFloat(raw?.xpPerEuro ?? 10, 10),
    xpMultiplier: parseSafeFloat(raw?.xpMultiplier ?? 1, 1),
    activeEventName: sanitizeString(raw?.activeEventName || ""),
    eventEndDate: raw?.eventEndDate ? sanitizeString(raw.eventEndDate) : undefined,
    doubleXpActive: parseSafeBool(raw?.doubleXpActive ?? false),
  };
}

export function validateAndSanitizeDataset(raw: any): ValidatedDataset {
  if (!raw || typeof raw !== "object") {
    return {
      magazzino: [],
      carrelli: [],
      dettagli: [],
      spedizioni: [],
      finanze: [],
      gruppiGrading: [],
      oggettiInGrading: [],
      listinoGrading: [],
      utentiRegistrati: [],
    };
  }

  const rawMag = raw.magazzino || raw.Magazzino || raw.MAGAZZINO;
  const magazzino = Array.isArray(rawMag)
    ? rawMag.map(sanitizeOggettoMagazzino).filter((item: OggettoMagazzino) => Boolean(item.ID_Oggetto))
    : [];

  const rawCar = raw.carrelli || raw.Carrelli || raw.CARRELLI || raw.clienti_carrelli || raw.Clienti_Carrelli;
  const carrelli = Array.isArray(rawCar)
    ? rawCar.map(sanitizeCarrello).filter((c: Carrello) => Boolean(c.ID_Carrello))
    : [];

  const rawDet = raw.dettagli || raw.Dettagli || raw.DETTAGLI || raw.dettaglio_carrello || raw.Dettaglio_Carrello;
  const dettagli = Array.isArray(rawDet)
    ? rawDet.map(sanitizeDettaglioCarrello).filter((d: DettaglioCarrello) => Boolean(d.ID_Carrello && d.ID_Oggetto))
    : [];

  const rawSpe = raw.spedizioni || raw.Spedizioni || raw.SPEDIZIONI || raw.logistica_spedizioni || raw.Logistica_Spedizioni;
  const spedizioni = Array.isArray(rawSpe)
    ? rawSpe.map(sanitizeSpedizione).filter((s: Spedizione) => Boolean(s.ID_Spedizione || s.ID_Carrello))
    : [];

  const rawFin = raw.finanze || raw.Finanze || raw.FINANZE;
  const finanze = Array.isArray(rawFin)
    ? rawFin.map(sanitizeFinanza)
    : [];

  const rawGrup = raw.gruppiGrading || raw.GruppiGrading || raw.gruppi_grading || raw.Gruppi_Grading;
  const gruppiGrading = Array.isArray(rawGrup)
    ? rawGrup.map(sanitizeGradingGroup).filter((g: GradingGroup) => Boolean(g.ID_Gruppo_Grading))
    : [];

  const rawOggGrad = raw.oggettiInGrading || raw.OggettiInGrading || raw.oggetti_in_grading || raw.Oggetti_In_Grading;
  const oggettiInGrading = Array.isArray(rawOggGrad)
    ? rawOggGrad.map(sanitizeGradingItem).filter((gi: GradingItem) => Boolean(gi.ID_Oggetto_Grading))
    : [];

  const rawListGrad = raw.listinoGrading || raw.ListinoGrading || raw.listino_grading || raw.Listino_Grading;
  const listinoGrading = Array.isArray(rawListGrad)
    ? rawListGrad.map(sanitizeListinoGradingItem).filter((l: ListinoGradingItem) => Boolean(l.Tipologia_Servizio))
    : [];

  const rawUtenti = raw.utentiRegistrati || raw.UtentiRegistrati || raw.utenti_registrati || raw.Utenti_Registrati;
  const utentiRegistrati = Array.isArray(rawUtenti)
    ? rawUtenti.map(sanitizeUtenteRegistrato).filter((u: UtenteRegistrato) => Boolean(u.Email))
    : [];

  const rawTags = raw.customTags || raw.CustomTags || raw.custom_tags || raw.Custom_Tags;
  const customTags = Array.isArray(rawTags)
    ? rawTags.map(sanitizeString).filter(Boolean)
    : undefined;

  const config = raw.config || undefined;

  const rawLoyaltyConfig = raw.loyaltyConfig || undefined;
  const loyaltyConfig = rawLoyaltyConfig ? sanitizeLoyaltyConfig(rawLoyaltyConfig) : undefined;

  const rawLoyaltyProfiles = raw.loyaltyProfiles || undefined;
  const loyaltyProfiles = Array.isArray(rawLoyaltyProfiles)
    ? rawLoyaltyProfiles.map(sanitizeCustomerLoyalty).filter((p) => Boolean(p.customerId))
    : undefined;

  const rawLoyaltyHistory = raw.loyaltyHistory || undefined;
  const loyaltyHistory = Array.isArray(rawLoyaltyHistory)
    ? rawLoyaltyHistory.map(sanitizeCustomerLoyaltyHistory).filter((h) => Boolean(h.id))
    : undefined;

  return {
    magazzino,
    carrelli,
    dettagli,
    spedizioni,
    finanze,
    gruppiGrading,
    oggettiInGrading,
    listinoGrading,
    utentiRegistrati,
    customTags,
    config,
    loyaltyConfig,
    loyaltyProfiles,
    loyaltyHistory,
  };
}

export function verifyBackupIntegrity(backupJson: any): {
  valid: boolean;
  errors: string[];
  stats: Record<string, number>;
  sanitized?: ValidatedDataset;
} {
  const errors: string[] = [];
  if (!backupJson || typeof backupJson !== "object") {
    return { valid: false, errors: ["Il file JSON non contiene un oggetto valido."], stats: {} };
  }

  // Extract data payload if wrapped
  const target = backupJson.data || backupJson;

  const sanitized = validateAndSanitizeDataset(target);
  const stats = {
    Magazzino: sanitized.magazzino.length,
    Carrelli: sanitized.carrelli.length,
    Dettagli: sanitized.dettagli.length,
    Spedizioni: sanitized.spedizioni.length,
    Finanze: sanitized.finanze.length,
    Gruppi_Grading: sanitized.gruppiGrading.length,
    Oggetti_Grading: sanitized.oggettiInGrading.length,
    Listino_Grading: sanitized.listinoGrading.length,
    Utenti: sanitized.utentiRegistrati.length,
    Profili_Loyalty: sanitized.loyaltyProfiles?.length || 0,
    Storico_Loyalty: sanitized.loyaltyHistory?.length || 0,
  };

  const totalRecords = Object.values(stats).reduce((a, b) => a + b, 0);
  if (totalRecords === 0) {
    errors.push("Nessun record valido trovato nel file di backup.");
  }

  return {
    valid: errors.length === 0,
    errors,
    stats,
    sanitized,
  };
}
