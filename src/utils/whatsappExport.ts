import { Carrello, DettaglioCarrello, GradingItem, GradingGroup, OggettoMagazzino, CustomerLoyalty } from "../types";
import { WhatsAppDestination } from "../lib/whatsapp";
import { formatStatoHuman } from "./formatters";
import { parseSafeFloat } from "../lib/dataValidation";
import { calculateTierFromSpent, calculateLevelFromXP, TIERS_CONFIG } from "../lib/loyaltyEngine";

export const generateWhatsAppMessage = (
  c: Carrello,
  dettagli: DettaglioCarrello[],
  oggettiInGrading: GradingItem[],
  magazzino: OggettoMagazzino[],
  gruppiGrading: GradingGroup[],
  isFiltering: boolean,
  filterProduct: string,
  term: string,
  activeClientName?: string,
  loyaltyProfiles?: CustomerLoyalty[],
  allCarts?: Carrello[]
) => {
  const fullCartId = c.ID_Carrello;
  let msg = `🌸 *Jana No Sekai* — *Riepilogo Ordine*\n`;
  msg += `----------------------------------------\n`;
  
  const clientName = activeClientName || c.Nome_Cliente;
  
  let loyaltyTag = "";
  if (loyaltyProfiles && loyaltyProfiles.length > 0) {
    const clientLoyalty = loyaltyProfiles.find(p => 
      (p.email && p.email.toLowerCase() === (c.Email || "").toLowerCase()) ||
      (p.customerName && p.customerName.toLowerCase() === (clientName || "").toLowerCase())
    );
    const customerCompletedCarts = (allCarts || []).filter(item => 
      item.Stato_Carrello === "Completato" &&
      ((c.Email && item.Email && item.Email.toLowerCase() === c.Email.toLowerCase()) ||
       (item.Nome_Cliente && item.Nome_Cliente.toLowerCase() === (clientName || "").toLowerCase()))
    );
    const calculatedSpent = customerCompletedCarts.reduce((acc, item) => acc + Number(item.Totale_Pagato || 0), 0);
    const historicalSpent = clientLoyalty?.totalSpent ?? calculatedSpent;
    const currentTier = clientLoyalty?.tier 
      ? TIERS_CONFIG.find(t => t.tier === clientLoyalty.tier) || calculateTierFromSpent(historicalSpent)
      : calculateTierFromSpent(historicalSpent);
    const level = clientLoyalty?.level ?? calculateLevelFromXP(clientLoyalty?.xp ?? Math.floor(historicalSpent * 10));

    const getTierEmoji = (tierName: string): string => {
      switch (tierName) {
        case "Rookie Collector": return "⚪";
        case "Binder Keeper": return "📁";
        case "Card Hunter": return "🔍";
        case "Treasure Seeker": return "🧭";
        case "Vault Master": return "🔒";
        case "Legendary Collector": return "🔥";
        case "Grail Hunter": return "🏆";
        case "Mythic Collector": return "✨";
        case "Hall of Fame": return "👑";
        default: return "⭐";
      }
    };
    const tierEmoji = getTierEmoji(currentTier.tier);
    loyaltyTag = ` [ *${currentTier.tier}* Lvl *${level}* ${tierEmoji} ]`;
  }

  msg += clientName ? `Ciao *${clientName}*${loyaltyTag}! 👋\n` : `Ciao!${loyaltyTag} 👋\n`;
  msg += isFiltering 
    ? `Ecco gli articoli correlati a "*${filterProduct}*" per il tuo ordine:\n\n`
    : `Ecco il riepilogo del tuo ordine:\n\n`;
  
  const normalizeString = (str: string): string => {
    if (!str) return "";
    return str
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/['’]/g, "")
      .replace(/[\s\u00a0]+/g, " ")
      .trim();
  };

  const cartDettagli = dettagli.filter((d) => d.ID_Carrello === c.ID_Carrello && !d.ID_Spedizione);
  const cartGrading = oggettiInGrading.filter((g) => g.ID_Carrello === c.ID_Carrello && !g.ID_Spedizione);
  
  let toPay = 0;
  
  let matchedOggetti: { d: DettaglioCarrello; m: OggettoMagazzino | undefined }[] = [];
  const prodQueries = isFiltering && filterProduct ? filterProduct.split(',').map(q => normalizeString(q)).filter(Boolean) : [];

  cartDettagli.forEach(d => {
    const m = magazzino.find(mag => mag.ID_Oggetto === d.ID_Oggetto);
    if (!isFiltering) {
      matchedOggetti.push({ d, m });
    } else {
      const name = normalizeString(m?.Nome || "");
      const id = normalizeString(d.ID_Oggetto || "");
      const itemMatches = prodQueries.some(query => {
        const queryTerms = query.split(" ").filter(Boolean);
        return queryTerms.every(term => name.includes(term) || id.includes(term));
      });
      if (itemMatches) {
        matchedOggetti.push({ d, m });
      }
    }
  });
  
  if (matchedOggetti.length > 0) {
    msg += isFiltering ? `📦 *ARTICOLI TROVATI ("${filterProduct}"):*\n\n` : `📦 *OGGETTI NEL CARRELLO:*\n\n`;
    
    const groupedStandard: Record<string, { count: number; name: string; paid: boolean; price: number; acconto: number; dataSped: string }> = {};
    matchedOggetti.forEach(({ d, m }) => {
      const name = m ? m.Nome : 'Articolo';
      const dataSped = m?.Data_Spedizione_Presunta || "";
      const price = parseSafeFloat(d.Prezzo_Registrato);
      const acconto = parseSafeFloat(d.Acconto_Pagato);
      const key = `${name}_${d.Pagato_Singolarmente}_${price}_${dataSped}`;
      
      if (!groupedStandard[key]) {
        groupedStandard[key] = { count: 0, name, paid: d.Pagato_Singolarmente, price, acconto: 0, dataSped };
      }
      groupedStandard[key].count++;
      if (!d.Pagato_Singolarmente) {
        toPay += price;
        if (acconto > 0) {
          toPay -= acconto;
          groupedStandard[key].acconto += acconto;
        }
      }
    });

    const byDate: Record<string, any[]> = {};
    Object.values(groupedStandard).forEach((g: any) => {
      const dateKey = g.dataSped || "Immediata";
      if (!byDate[dateKey]) byDate[dateKey] = [];
      byDate[dateKey].push(g);
    });

    // 1. Disponibilità Immediata
    if (byDate["Immediata"] && byDate["Immediata"].length > 0) {
      msg += `*Disponibilità immediata:*\n`;
      byDate["Immediata"].forEach(g => {
        let priceStr = g.paid ? 'Pagato ✅' : `Non pagato ❌ (€${(g.price * g.count).toFixed(2)})`;
        if (!g.paid && g.acconto > 0) {
          const remaining = Math.max(0, g.price * g.count - g.acconto);
          priceStr = `Pagato parzialmente 🟡 (Rimangono €${remaining.toFixed(2)} • Acconto: €${g.acconto.toFixed(2)})`;
        }
        msg += `- *${g.name}* x${g.count} - ${priceStr}\n`;
      });
      msg += `\n`;
    }

    // 2. Disponibilità Future (ordinate per data, se possibile)
    const futureDates = Object.keys(byDate).filter(k => k !== "Immediata").sort();
    futureDates.forEach(date => {
      msg += `*Disponibilità dal ${date}:*\n`;
      byDate[date].forEach(g => {
        let priceStr = g.paid ? 'Pagato ✅' : `Non pagato ❌ (€${(g.price * g.count).toFixed(2)})`;
        if (!g.paid && g.acconto > 0) {
          const remaining = Math.max(0, g.price * g.count - g.acconto);
          priceStr = `Pagato parzialmente 🟡 (Rimangono €${remaining.toFixed(2)} • Acconto: €${g.acconto.toFixed(2)})`;
        }
        msg += `- *${g.name}* x${g.count} - ${priceStr}\n`;
      });
      msg += `\n`;
    });
  }
  
  let matchedGrading: GradingItem[] = [];
  cartGrading.forEach(g => {
    if (!isFiltering) {
      matchedGrading.push(g);
    } else {
      const name = normalizeString(g.Nome_Carta || (g as any).Nome_Oggetto || "");
      const desc = normalizeString((g as any).Descrizione || "");
      const id = normalizeString(g.ID_Oggetto_Grading || "");
      const itemMatches = prodQueries.some(query => {
        const queryTerms = query.split(" ").filter(Boolean);
        return queryTerms.every(term => name.includes(term) || desc.includes(term) || id.includes(term));
      });
      if (itemMatches) {
        matchedGrading.push(g);
      }
    }
  });
  
  if (matchedGrading.length > 0) {
    msg += isFiltering ? `🔍 *SERVIZIO GRADING ("${filterProduct}"):*\n` : `🔍 *SERVIZIO GRADING:*\n`;
    
    const groupedGrading: Record<string, { count: number; name: string; paid: boolean; price: number; acconto: number; serv: string; stato: string }> = {};
    matchedGrading.forEach(g => {
      const name = g.Nome_Carta || (g as any).Nome_Oggetto || 'Oggetto Grading';
      const group = (gruppiGrading as any) ? (gruppiGrading as any).find((gr: any) => gr.ID_Gruppo_Grading === g.ID_Gruppo_Grading) : null;
      
      const details: string[] = [];
      if (g.Tipologia_Servizio) details.push(`Servizio: ${g.Tipologia_Servizio}`);
      if (group?.Stato_Gruppo) details.push(`Stato: ${formatStatoHuman(group.Stato_Gruppo)}`);
      
      const detailsStr = details.length > 0 ? ` (${details.join(' • ')})` : '';
      
      const price = parseSafeFloat(g.Costo_Cliente);
      const acconto = parseSafeFloat(g.Acconto_Pagato);
      
      const key = `${name}_${g.Tipologia_Servizio}_${g.Pagato_Singolarmente}_${price}_${group?.Stato_Gruppo || ''}`;
      if (!groupedGrading[key]) {
        groupedGrading[key] = { count: 0, name, paid: g.Pagato_Singolarmente, price, acconto: 0, serv: detailsStr, stato: group?.Stato_Gruppo || '' };
      }
      groupedGrading[key].count++;
      if (!g.Pagato_Singolarmente) {
        toPay += price;
        if (acconto > 0) {
          toPay -= acconto;
          groupedGrading[key].acconto += acconto;
        }
      }
    });

    Object.values(groupedGrading).forEach((g: any) => {
      let priceStr = g.paid ? 'Pagato ✅' : `Non pagato ❌ (€${(g.price * g.count).toFixed(2)})`;
      if (!g.paid && g.acconto > 0) {
        const remaining = Math.max(0, g.price * g.count - g.acconto);
        priceStr = `Pagato parzialmente 🟡 (Rimangono €${remaining.toFixed(2)} • Acconto: €${g.acconto.toFixed(2)})`;
      }
      msg += `- *${g.name}* x${g.count}${g.serv} - ${priceStr}\n`;
    });
    msg += `\n`;
  }
  
  if (toPay > 0) {
    msg += `----------------------------------------\n`;
    msg += `💰 *TOTALE ANCORA DA PAGARE:* €${toPay.toFixed(2)}\n`;
  }
  
  msg += `\nPer qualsiasi dubbio o domanda contattami.\nGrazie mille! ✨`;
  return msg;
};
