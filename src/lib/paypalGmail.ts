// Helper library to scan Gmail for PayPal payment notification emails and automatically match them to Carts

import { Carrello } from "../types";
import { fetchWithRetry } from "./googleApi";

export interface PayPalEmailPayment {
  id: string;
  internalDate: number;
  dateStr: string;
  subject: string;
  from: string;
  snippet: string;
  fullText?: string;
  amount: number;
  currency: string;
  payerName: string;
  payerEmail: string;
  transactionId: string;
  note: string;
  matchedCartId?: string;
  matchedCartName?: string;
  matchScore?: number; // 0 to 100
  matchReason?: string;
  isAlreadyProcessed?: boolean;
}

// Decode Base64URL string from Gmail payload
function decodeBase64Url(str: string): string {
  try {
    const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
    return decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
  } catch (e) {
    try {
      return atob(str.replace(/-/g, "+").replace(/_/g, "/"));
    } catch {
      return "";
    }
  }
}

// Recursively get body text from Gmail payload
function getBodyText(payload: any): string {
  let body = "";
  if (!payload) return body;

  if (payload.body && payload.body.data) {
    body += decodeBase64Url(payload.body.data) + "\n";
  }

  if (payload.parts && Array.isArray(payload.parts)) {
    for (const part of payload.parts) {
      body += getBodyText(part);
    }
  }

  return body;
}

// LocalStorage key for storing processed email message IDs and PayPal Transaction IDs
const PROCESSED_EMAILS_KEY = "paypal_processed_emails_v2";

export function getProcessedEmailRecords(): Set<string> {
  try {
    const raw = localStorage.getItem(PROCESSED_EMAILS_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch (e) {
    return new Set();
  }
}

export function saveProcessedEmailRecord(msgId: string, transactionId?: string): void {
  try {
    const set = getProcessedEmailRecords();
    if (msgId) set.add(msgId);
    if (transactionId) set.add(transactionId);
    localStorage.setItem(PROCESSED_EMAILS_KEY, JSON.stringify(Array.from(set)));
  } catch (e) {
    console.warn("Failed to save processed email record to localStorage:", e);
  }
}

// Parse email content into structured PayPal payment
export function parsePayPalEmail(msg: any): PayPalEmailPayment | null {
  const headers = msg.payload?.headers || [];
  const subjectHeader = headers.find((h: any) => h.name.toLowerCase() === "subject");
  const fromHeader = headers.find((h: any) => h.name.toLowerCase() === "from");

  const subject = subjectHeader ? subjectHeader.value : "";
  const from = fromHeader ? fromHeader.value : "";
  const snippet = msg.snippet || "";
  const internalDate = parseInt(msg.internalDate || "0", 10);
  const dateStr = internalDate ? new Date(internalDate).toLocaleDateString("it-IT") : "";

  const bodyText = getBodyText(msg.payload);
  const fullText = snippet + " " + subject + " " + bodyText;

  const fromClean = from.toLowerCase();
  const subjectClean = subject.toLowerCase();
  const snippetClean = snippet.toLowerCase();

  // 1. Strict Sender Verification
  // Real PayPal notifications always come from PayPal's official domains.
  const hasPayPalSender = 
    fromClean.includes("paypal.com") || 
    fromClean.includes("paypal.it") || 
    fromClean.includes("paypal.ch") ||
    fromClean.includes("paypal-communication.com") || 
    fromClean.includes("@paypal");

  // 2. Explicit Positive Markers (Incoming Payment Received)
  const positiveTerms = [
    "hai ricevuto",
    "ti ha inviato",
    "ha inviato un pagamento",
    "pagamento ricevuto",
    "notifica di pagamento",
    "payment received",
    "sent you a payment",
    "sent you money",
    "has sent you",
    "fondi ricevuti",
    "denaro ricevuto",
    "ricevuto un pagamento",
    "ti ha spedito un pagamento"
  ];
  const hasPositiveSubject = positiveTerms.some((term) => subjectClean.includes(term));
  const hasPositiveSnippet = positiveTerms.some((term) => snippetClean.includes(term));

  // 3. Explicit Negative/Exclusion Markers (Sent Payments, Invoices, Refunds, Security, Agreements)
  const negativePhrases = [
    "hai inviato un pagamento",
    "hai inviato denaro",
    "hai pagato",
    "ricevuta del tuo pagamento",
    "ricevuta per il pagamento",
    "you sent a payment",
    "your payment to",
    "addebito",
    "autorizzazione",
    "richiesta di denaro",
    "richiesta di pagamento",
    "ti ha inviato una richiesta",
    "ha inviato una richiesta",
    "money request",
    "sent you a request",
    "rimborso inviato",
    "rimborso effettuato",
    "hai emesso un rimborso",
    "refund sent",
    "modifiche alle",
    "aggiornamento delle",
    "condizioni d'uso",
    "accordo",
    "contratto",
    "sicurezza",
    "dispositivo",
    "accesso",
    "codice di",
    "codice di verifica",
    "conferma il tuo",
    "imposta un",
    "crea un",
    "sondaggio",
    "offerte",
    "pubblicità",
    "trasferisci",
    "trasferimento",
    "conto bancario",
    "ricevuta relativa al tuo",
    "paga con un clic"
  ];
  const hasNegativePhrase = negativePhrases.some((term) => 
    subjectClean.includes(term) || snippetClean.includes(term)
  );

  // Determine if it is a valid payment notification
  const isPayPalPayment = hasPayPalSender && (hasPositiveSubject || hasPositiveSnippet) && !hasNegativePhrase;

  if (!isPayPalPayment) {
    // Only log if it mentions PayPal to avoid spamming for regular non-PayPal emails
    if (fromClean.includes("paypal") || subjectClean.includes("paypal")) {
      console.log(`[DEBUG] [parsePayPalEmail] Email PayPal scartata (Falso Positivo): "${subject}" (Da: ${from})`);
    }
    return null;
  }

  // Helper to extract amount from string (prioritizes decimals and handles integers)
  const extractAmount = (text: string): { amount: number; currency: string } | null => {
    const amountRegexes = [
      /(?:€|EUR)\s*([0-9]{1,3}(?:[\.\s][0-9]{3})*(?:,[0-9]{2})|[0-9]+(?:,[0-9]{2}))/i,
      /(?:€|EUR)\s*([0-9]{1,3}(?:[\.\s][0-9]{3})*|[0-9]+)/i,
      /([0-9]{1,3}(?:\.[0-9]{3})*(?:,[0-9]{2})|[0-9]+(?:,[0-9]{2}))\s*(?:€|EUR)/i,
      /([0-9]{1,3}(?:\.[0-9]{3})*|[0-9]+)\s*(?:€|EUR)/i,
      /\$([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})|[0-9]+(?:\.[0-9]{2}))/i,
      /\$([0-9]{1,3}(?:,[0-9]{3})*|[0-9]+)/i
    ];

    for (const regex of amountRegexes) {
      const match = text.match(regex);
      if (match && match[1]) {
        let rawVal = match[1].replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
        const val = parseFloat(rawVal);
        if (!isNaN(val) && val > 0) {
          const currency = regex.toString().includes("\\$") ? "USD" : "EUR";
          return { amount: val, currency };
        }
      }
    }
    return null;
  };

  // Extract Amount: Check subject first (usually contains the exact payment amount and prevents body confusion)
  let amount = 0;
  let currency = "EUR";
  const parsedAmt = extractAmount(subject) || extractAmount(snippet) || extractAmount(bodyText);
  if (parsedAmt) {
    amount = parsedAmt.amount;
    currency = parsedAmt.currency;
  }

  // Extract Transaction ID
  let transactionId = "";
  const txRegexes = [
    /(?:Transaction ID|ID transazione|Codice transazione|Numero transazione|ID della transazione|Codice della transazione|Transazione)\s*[:#]?\s*([A-Z0-9]{12,20})/i,
    /ID\s*[:#]?\s*([A-Z0-9]{17})/i // PayPal standard 17-character transaction ID
  ];

  for (const rx of txRegexes) {
    const txMatch = fullText.match(rx);
    if (txMatch && txMatch[1]) {
      transactionId = txMatch[1];
      break;
    }
  }

  // Extract Payer Name
  let payerName = "";
  // Check common subject formats first:
  // "Mario Rossi ti ha inviato un pagamento" or "Mario Rossi ti ha inviato €10,00"
  const startSubjectMatch = subject.match(/^([A-Za-zÀ-ÖØ-öø-ÿ\s'-]{2,35})\s+(?:ti ha inviato|ha inviato|ti ha spedito)/i);
  const endSubjectMatch = subject.match(/(?:da|from|by)\s+([A-Za-zÀ-ÖØ-öø-ÿ\s'-]{2,35})/i);

  if (startSubjectMatch && startSubjectMatch[1]) {
    payerName = startSubjectMatch[1].trim();
  } else if (endSubjectMatch && endSubjectMatch[1]) {
    payerName = endSubjectMatch[1].trim();
  }

  // Clean payerName from any noise terms (e.g. "PayPal", "un pagamento")
  if (payerName) {
    const noise = ["paypal", "un pagamento", "pagamento", "denaro", "servizio", "completato"];
    if (noise.some(n => payerName.toLowerCase() === n)) {
      payerName = "";
    }
  }

  // Extract Payer Email
  let payerEmail = "";
  const specificEmailMatch = fullText.match(/(?:Email dell'acquirente|Indirizzo email dell'acquirente|Email di invio|Payer Email|Email dell'utente|Da:)\s*[:#]?\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
  if (specificEmailMatch && specificEmailMatch[1]) {
    payerEmail = specificEmailMatch[1];
  } else {
    const allEmails = fullText.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g);
    if (allEmails) {
      const nonPayPalEmails = allEmails.filter(
        (e) => !e.toLowerCase().includes("paypal") && !e.toLowerCase().includes("google")
      );
      if (nonPayPalEmails.length > 0) {
        payerEmail = nonPayPalEmails[0];
      }
    }
  }

  // Extract Note / Memo
  let note = "";
  const noteMatch = fullText.match(/(?:Nota|Note|Messaggio|Message|Causale)\s*[:#]?\s*(.+?)(?:\r|\n|<|$)/i);
  if (noteMatch && noteMatch[1]) {
    note = noteMatch[1].trim();
  }

  console.log(`[DEBUG] [parsePayPalEmail] Rilevato pagamento valido! Soggetto: "${subject}", Importo: ${amount} ${currency}, ID Transazione: "${transactionId}", Payer: "${payerName}" <${payerEmail}>`);

  return {
    id: msg.id,
    internalDate,
    dateStr,
    subject,
    from,
    snippet,
    fullText,
    amount,
    currency,
    payerName,
    payerEmail,
    transactionId,
    note
  };
}

// Search Gmail for PayPal payment emails
export async function searchPayPalEmails(
  accessToken: string,
  query: string = 'subject:"Hai ricevuto denaro"',
  maxResults: number = 20
): Promise<PayPalEmailPayment[]> {
  const listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=${maxResults}`;
  
  const response = await fetchWithRetry(listUrl, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gmail API Error: ${response.status} - ${errText}`);
  }

  const data = await response.json();
  const messagesList = data.messages || [];

  const payments: PayPalEmailPayment[] = [];

  for (const msgRef of messagesList) {
    try {
      const msgUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msgRef.id}?format=full`;
      const msgRes = await fetchWithRetry(msgUrl, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (msgRes.ok) {
        const msgData = await msgRes.json();
        const payment = parsePayPalEmail(msgData);
        if (payment) {
          payments.push(payment);
        }
      }
    } catch (e) {
      console.warn("Failed to fetch Gmail message details:", msgRef.id, e);
    }
  }

  return payments;
}

// Match PayPal payment emails with Carts list with strict threshold rules to prevent false positives
export function matchPaymentsWithCarts(
  payments: PayPalEmailPayment[],
  carts: Carrello[]
): PayPalEmailPayment[] {
  const processedRecords = getProcessedEmailRecords();

  return payments.map((p) => {
    const isAlreadyProcessed =
      processedRecords.has(p.id) ||
      (p.transactionId ? processedRecords.has(p.transactionId) : false);

    let bestCart: Carrello | null = null;
    let maxScore = 0;
    let matchReason = "";

    const combinedText = (p.fullText || `${p.note} ${p.subject} ${p.snippet}`).toLowerCase();
    const pEmail = p.payerEmail.toLowerCase().trim();
    const pName = p.payerName.toLowerCase().trim();

    for (const cart of carts) {
      let score = 0;
      let reasons: string[] = [];

      // 1. Exact Cart ID match in email text/note (Highest confidence: 100 points)
      if (cart.ID_Carrello && combinedText.includes(cart.ID_Carrello.toLowerCase().trim())) {
        score += 100;
        reasons.push(`ID Carrello "${cart.ID_Carrello}" trovato nella mail`);
      }

      // 2. Exact Email match (High confidence: 95 points)
      if (cart.Email && pEmail) {
        const cEmail = cart.Email.toLowerCase().trim();
        if (cEmail && (cEmail === pEmail || combinedText.includes(cEmail))) {
          score += 95;
          reasons.push(`Email cliente "${cart.Email}" corrisponde al mittente`);
        }
      }

      // 3. Client Name Match
      if (cart.Nome_Cliente) {
        const cName = cart.Nome_Cliente.toLowerCase().trim();

        if (cName.length >= 3) {
          // Exact full name match in text or payer name
          if (cName === pName || combinedText.includes(cName)) {
            score += 90;
            reasons.push(`Nome completo "${cart.Nome_Cliente}" corrisponde esattamente`);
          } else {
            // Split into significant name words (exclude short/common words)
            const stopWords = new Set(["de", "del", "della", "di", "da", "san", "santa", "lo", "la", "il", "van", "von"]);
            const nameTokens = cName
              .split(/\s+/)
              .map((t) => t.trim())
              .filter((t) => t.length >= 3 && !stopWords.has(t));

            if (nameTokens.length >= 2) {
              const matchedTokens = nameTokens.filter(
                (token) => pName.includes(token) || combinedText.includes(token)
              );
              if (matchedTokens.length === nameTokens.length) {
                // All non-stopwords matched
                score += 80;
                reasons.push(`Tutti i termini del nome "${cart.Nome_Cliente}" trovati nella mail`);
              } else if (matchedTokens.length >= 2) {
                score += 55;
                reasons.push(`Parole chiave del nome "${matchedTokens.join(" ")}" trovate nella mail`);
              } else if (matchedTokens.length === 1) {
                // Single token match (e.g. only "Rossi" or only "Mario") - Low score, avoids auto-match
                score += 15;
                reasons.push(`Parziale corrispondenza del nome (${matchedTokens[0]})`);
              }
            } else if (nameTokens.length === 1) {
              const singleToken = nameTokens[0];
              if (pName.includes(singleToken) || combinedText.includes(singleToken)) {
                score += 40;
                reasons.push(`Corrispondenza singola parola nome "${cart.Nome_Cliente}"`);
              }
            }
          }
        }
      }

      // 4. Exact Phone match (70 points)
      if (cart.Telefono) {
        const cPhone = cart.Telefono.replace(/[^0-9]/g, "");
        if (cPhone.length >= 8 && combinedText.replace(/[^0-9]/g, "").includes(cPhone)) {
          score += 70;
          reasons.push(`Numero di telefono "${cart.Telefono}" trovato nella mail`);
        }
      }

      // 5. Cart Tag match (30 points)
      if (cart.Tag) {
        const cTag = cart.Tag.toLowerCase().trim();
        if (cTag.length >= 3 && combinedText.includes(cTag)) {
          score += 30;
          reasons.push(`Tag carrello "${cart.Tag}" presente nella mail`);
        }
      }

      // 6. Amount match bonus (+10 points if exact amount matches total/remaining)
      if (p.amount > 0 && cart.Totale_Pagato !== undefined) {
        if (Math.abs(p.amount - (cart.Totale_Pagato || 0)) < 0.1) {
          score += 10;
          reasons.push(`Importo di €${p.amount.toFixed(2)} coincide col totale pagato`);
        }
      }

      if (score > maxScore) {
        maxScore = score;
        bestCart = cart;
        matchReason = reasons.join(" • ");
      }
    }

    // STRICT THRESHOLD: Require score >= 65 to auto-assign cart
    // Scores below 65 are considered uncertain/unmatched to prevent wrong associations.
    if (bestCart && maxScore >= 65) {
      return {
        ...p,
        isAlreadyProcessed,
        matchedCartId: bestCart.ID_Carrello,
        matchedCartName: bestCart.Nome_Cliente,
        matchScore: Math.min(100, maxScore),
        matchReason
      };
    }

    // Return without matchedCartId if confidence is low, forcing manual selection
    return {
      ...p,
      isAlreadyProcessed,
      matchedCartId: undefined,
      matchedCartName: undefined,
      matchScore: maxScore > 0 ? maxScore : 0,
      matchReason: maxScore > 0 ? matchReason : "Nessun carrello associato con sufficiente sicurezza"
    };
  });
}

// Mark Gmail message as read or add processed label
export async function markGmailMessageProcessed(
  accessToken: string,
  messageId: string
): Promise<void> {
  const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`;
  await fetchWithRetry(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      removeLabelIds: ["UNREAD"]
    })
  });
}
