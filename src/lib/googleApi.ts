// Google Sheets & Drive REST API Integration

import { OggettoMagazzino, Carrello, DettaglioCarrello, Spedizione, Finanza, StatoCarrello, UtenteRegistrato, GradingGroup, GradingItem, ListinoGradingItem } from "../types";
import { parseSafeFloat, parseSafeInt, parseSafeBool } from "./dataValidation";
import { extendSession } from "./firebase";


// Helper to check if a fetch response is OK
export class AuthExpiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthExpiredError";
  }
}

async function checkResponse(res: Response, message: string) {
  if (!res.ok) {
    const errorText = await res.text();
    if (res.status === 401) {
      console.warn(`[Google API] Auth expired (${message}):`, errorText);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("google-auth-expired"));
      }
      throw new AuthExpiredError(`Autenticazione scaduta. Effettua nuovamente l'accesso.`);
    }
    console.error(`Error in Google API (${message}):`, errorText);
    throw new Error(`${message}: ${res.status} ${res.statusText} - ${errorText}`);
  }
}

// Queue to serialize write requests to Google API and prevent write-lock/rate-limit collisions
let writeQueueChain: Promise<any> = Promise.resolve();

export function enqueueWrite<T>(op: () => Promise<T>): Promise<T> {
  const result = writeQueueChain.then(async () => {
    // Small delay between write requests to respect API rate limits
    await new Promise((resolve) => setTimeout(resolve, 150));
    return op();
  });
  // Prevent unhandled rejections in queue chain
  writeQueueChain = result.catch(() => {});
  return result;
}

// Robust fetch wrapper with exponential backoff, jitter, and automatic retry for rate limits & timeouts
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  maxRetries: number = 5,
  initialDelayMs: number = 1000
): Promise<Response> {
  let attempt = 0;

  while (true) {
    attempt++;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000); // 25s timeout per request attempt

    try {
      const mergedOptions: RequestInit = {
        cache: "no-store",
        ...options,
        signal: options.signal || controller.signal,
      };

      const response = await fetch(url, mergedOptions);
      clearTimeout(timeoutId);

      if (response.ok) {
        extendSession();
      }
      
      if (!response.ok) {
        const status = response.status;
        const isRateLimit = status === 429;
        const isServerError = status >= 500 && status <= 504;

        let isQuotaError = false;
        if (status === 403) {
          try {
            const clone = response.clone();
            const errText = await clone.text();
            if (
              errText.includes("rateLimitExceeded") ||
              errText.includes("userRateLimitExceeded") ||
              errText.includes("quotaExceeded") ||
              errText.includes("Too Many Requests") ||
              errText.includes("userRateLimit")
            ) {
              isQuotaError = true;
            }
          } catch (e) {
            // ignore clone errors
          }
        }

        if ((isRateLimit || isQuotaError || isServerError) && attempt <= maxRetries) {
          const retryAfterHeader = response.headers.get("Retry-After");
          let delay = initialDelayMs * Math.pow(2, attempt - 1);
          if (retryAfterHeader) {
            const seconds = parseInt(retryAfterHeader, 10);
            if (!isNaN(seconds)) delay = seconds * 1000;
          }
          delay += Math.floor(Math.random() * 500); // jitter
          console.warn(`[Google API] Rate limit / server error ${status} (attempt ${attempt}/${maxRetries}). Retrying in ${Math.round(delay)}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
      }

      return response;
    } catch (err: any) {
      clearTimeout(timeoutId);

      const isAbort = err.name === "AbortError";
      const isNetworkError = !err.response;

      if ((isAbort || isNetworkError) && attempt <= maxRetries) {
        const delay = initialDelayMs * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 500);
        console.warn(`[Google API] Network / Timeout error (attempt ${attempt}/${maxRetries}). Retrying in ${Math.round(delay)}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      throw err;
    }
  }
}

// 1. Create a brand new Google Sheet database with proper structure and header rows
export async function createDatabaseSpreadsheet(token: string, title: string = "Gestionale Magazzino e Spedizioni"): Promise<string> {
  return enqueueWrite(async () => {
    const response = await fetchWithRetry("https://sheets.googleapis.com/v4/spreadsheets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        properties: {
          title: title,
        },
        sheets: [
          { properties: { title: "Magazzino" } },
          { properties: { title: "Clienti_Carrelli" } },
          { properties: { title: "Dettaglio_Carrello" } },
          { properties: { title: "Logistica_Spedizioni" } },
          { properties: { title: "Finanze" } },
          { properties: { title: "Utenti_Registrati" } },
          { properties: { title: "Gruppi_Grading" } },
          { properties: { title: "Oggetti_In_Grading" } },
          { properties: { title: "Listino_Grading" } },
        ],
      }),
    });

    await checkResponse(response, "Creazione Foglio Google fallita");
    const data = await response.json();
    const spreadsheetId = data.spreadsheetId;

    // Initialize header rows
    const headersResponse = await fetchWithRetry(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          valueInputOption: "USER_ENTERED",
          data: [
            {
              range: "Magazzino!A1:V1",
              values: [["ID_Oggetto", "Nome", "Quantità_Disponibile", "Costo_Acquisto", "Prezzo_Vendita", "Is_Preordine", "Acconto_Pagato", "Data_Arrivo_Prevista", "Stato_Preordine", "Is_Carta_Singola", "Espansione", "Rarità", "Condizione", "Lingua", "Gradata", "Archiviata", "Storico_Costi", "Costo_Spedizione_Lotto", "Costo_Dogana_Lotto", "Costo_Accessori_Lotto", "Data_Spedizione_Presunta", "Tag"]],
            },
            {
              range: "Clienti_Carrelli!A1:L1",
              values: [["ID_Carrello", "Nome_Cliente", "Stato_Carrello", "Totale_Pagato", "Telefono", "Email", "Indirizzo_Spedizione", "Tag", "Strike", "Cattivo_Data", "Note", "Data_Ultimo_Messaggio"]],
            },
            {
              range: "Dettaglio_Carrello!A1:H1",
              values: [["ID_Carrello", "ID_Oggetto", "Pagato_Singolarmente", "Prezzo_Registrato", "Pagamento_Posticipato", "Acconto_Pagato", "ID_Spedizione", "Reso"]],
            },
            {
              range: "Logistica_Spedizioni!A1:M1",
              values: [["ID_Spedizione", "ID_Carrello", "Link_Foto_Oggetti", "Data_Spedizione", "Tracking", "Stato_Consegna", "Oggetti_Spediti", "Nome_Cliente", "Indirizzo_Spedizione", "Telefono", "Tag", "Corriere", "Costo_Spedizione"]],
            },
            {
              range: "Finanze!A1:E1",
              values: [["Data", "Tipo", "Importo", "Categoria", "Note"]],
            },
            {
              range: "Utenti_Registrati!A1:C1",
              values: [["Email", "Ruolo", "Data_Registrazione"]],
            },
            {
              range: "Gruppi_Grading!A1:E1",
              values: [["ID_Gruppo_Grading", "Nome_Gruppo", "Compagnia", "Data_Creazione", "Stato_Gruppo"]],
            },
            {
              range: "Oggetti_In_Grading!A1:P1",
              values: [["ID_Oggetto_Grading", "ID_Carrello", "Nome_Carta", "Tipologia_Servizio", "Costo_Cliente", "Costo_Acquisto", "Margine_Lordo", "Link_Foto", "Pagato_Singolarmente", "ID_Gruppo_Grading", "Link_Foto_Ritornata", "Metodo_Consegna", "Pagamento_Posticipato", "Acconto_Pagato", "ID_Spedizione", "Reso"]],
            },
            {
              range: "Listino_Grading!A1:C1",
              values: [["Tipologia_Servizio", "Costo_Cliente", "Costo_Acquisto"]],
            },
            {
              range: "Listino_Grading!A2:C12",
              values: [
                ["SPECIALE PSA ECO", "30", "30"],
                ["PSA ECONOMY", "35", "30"],
                ["PSA STANDARD", "60", "51"],
                ["PSA EXPRESS", "110", "90"],
                ["PSA PRIORITY", "220", "190"],
                ["PSA FIRMATE", "60", "50"],
                ["BGS BASE", "30", "25"],
                ["BGS STANDARD", "50", "43"],
                ["BGS EXPRESS", "110", "90"],
                ["BGS PRIORITY", "220", "190"],
                ["BGS FIRMATA", "150", "150"]
              ],
            },
          ],
        }),
      }
    );

    await checkResponse(headersResponse, "Inizializzazione intestazioni fallita");
    return spreadsheetId;
  });
}

// 2. Fetch sheet rows (skipping headers or parsing them)
export async function fetchSheetRows(
  spreadsheetId: string,
  range: string,
  token: string
): Promise<any[][]> {
  const response = await fetchWithRetry(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=FORMATTED_STRING`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  await checkResponse(response, `Errore nel caricamento del range ${range}`);
  const data = await response.json();
  return data.values || [];
}

// 2b. Fetch multiple sheet rows ranges in a single batch call to prevent rate limiting
export async function fetchSheetRowsBatch(
  spreadsheetId: string,
  ranges: string[],
  token: string
): Promise<any[][][]> {
  const rangesQuery = ranges.map((r) => `ranges=${encodeURIComponent(r)}`).join("&");
  let response;
  try {
    response = await fetchWithRetry(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?${rangesQuery}&valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=FORMATTED_STRING`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
  } catch (err: any) {
    console.error("fetchSheetRowsBatch Network Error:", err, err.cause);
    throw err;
  }
  await checkResponse(response, `Errore nel caricamento batch dei range`);
  const data = await response.json();
  const valueRanges = data.valueRanges || [];
  return valueRanges.map((vr: any) => vr.values || []);
}

// 3. Append row
export async function appendSheetRow(
  spreadsheetId: string,
  range: string,
  rowValues: any[],
  token: string
): Promise<void> {
  return enqueueWrite(async () => {
    const response = await fetchWithRetry(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          values: [rowValues],
        }),
      }
    );
    await checkResponse(response, `Errore durante l'aggiunta della riga in ${range}`);
  });
}

// 3.1 Append multiple rows
export async function appendSheetRows(
  spreadsheetId: string,
  range: string,
  rowsValues: any[][],
  token: string
): Promise<void> {
  return enqueueWrite(async () => {
    const response = await fetchWithRetry(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          values: rowsValues,
        }),
      }
    );
    await checkResponse(response, `Errore durante l'aggiunta di righe multiple in ${range}`);
  });
}

// 4. Update row (range specifies exact row like Magazzino!A5:E5)
let updateBuffer: { spreadsheetId: string, range: string, rowValues: any[], token: string, resolve: () => void, reject: (err: any) => void }[] = [];
let updateBufferTimeout: any = null;

async function flushUpdateBuffer() {
  const currentBuffer = updateBuffer;
  updateBuffer = [];
  updateBufferTimeout = null;

  if (currentBuffer.length === 0) return;

  // Group by spreadsheetId and token
  const grouped = new Map<string, typeof currentBuffer>();
  for (const item of currentBuffer) {
    const key = `${item.spreadsheetId}|${item.token}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(item);
  }

  for (const [key, items] of grouped.entries()) {
    const spreadsheetId = items[0].spreadsheetId;
    const token = items[0].token;

    const data = items.map(item => ({
      range: item.range,
      values: [item.rowValues]
    }));

    try {
      await enqueueWrite(async () => {
        const response = await fetchWithRetry(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            valueInputOption: "USER_ENTERED",
            data: data
          })
        });
        await checkResponse(response, `Errore durante il batch update di ${items.length} righe`);
      });
      items.forEach(item => item.resolve());
    } catch (err) {
      console.error("Batch update failed:", err);
      items.forEach(item => item.reject(err));
    }
  }
}

export async function updateSheetRow(
  spreadsheetId: string,
  range: string,
  rowValues: any[],
  token: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    updateBuffer.push({ spreadsheetId, range, rowValues, token, resolve, reject });
    if (!updateBufferTimeout) {
      updateBufferTimeout = setTimeout(flushUpdateBuffer, 50); // Buffer for 50ms
    }
  });
}

// 4b. Update multiple rows (range specifies range like Dettaglio_Carrello!A2:D100)
export async function updateSheetRows(
  spreadsheetId: string,
  range: string,
  rowsValues: any[][],
  token: string
): Promise<void> {
  return enqueueWrite(async () => {
    const response = await fetchWithRetry(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          values: rowsValues,
        }),
      }
    );
    await checkResponse(response, `Errore durante l'aggiornamento del range ${range}`);
  });
}

// 4c. Clear range of cells in a sheet
export async function clearSheetRange(
  spreadsheetId: string,
  range: string,
  token: string
): Promise<void> {
  return enqueueWrite(async () => {
    const response = await fetchWithRetry(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:clear`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    await checkResponse(response, `Errore durante la pulizia del range ${range}`);
  });
}

// 5. Get sheetId mapping by title for delete operations
export async function getSheetIds(spreadsheetId: string, token: string): Promise<Record<string, number>> {
  let response;
  try {
    response = await fetchWithRetry(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  } catch (err: any) {
    console.error("getSheetIds Network Error:", err, err.cause);
    throw err;
  }
  await checkResponse(response, "Impossibile recuperare metadati foglio");
  const data = await response.json();
  const mapping: Record<string, number> = {};
  if (data.sheets) {
    for (const s of data.sheets) {
      if (s.properties) {
        mapping[s.properties.title] = s.properties.sheetId;
      }
    }
  }
  return mapping;
}

// 6. Delete row by dimension in batchUpdate
export async function deleteSheetRow(
  spreadsheetId: string,
  sheetName: string,
  rowIndex: number, // 0-based index in the absolute sheet
  token: string
): Promise<void> {
  return enqueueWrite(async () => {
    const mapping = await getSheetIds(spreadsheetId, token);
    const sheetId = mapping[sheetName];
    if (sheetId === undefined) {
      throw new Error(`Foglio con nome ${sheetName} non trovato.`);
    }

    const response = await fetchWithRetry(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requests: [
            {
              deleteDimension: {
                range: {
                  sheetId: sheetId,
                  dimension: "ROWS",
                  startIndex: rowIndex,
                  endIndex: rowIndex + 1,
                },
              },
            },
          ],
        }),
      }
    );
    await checkResponse(response, `Errore durante l'eliminazione della riga ${rowIndex} in ${sheetName}`);
  });
}

// 7. Find or Create Folder in Google Drive
export async function findOrCreateDriveFolder(token: string, isProd: boolean = true): Promise<string> {
  let projectId = isProd 
    ? "19Zlvat9kyMK9fmfLRdobH8rA1gr5ALO7" 
    : "1ul4JbUkg3pNcClpEDQNzgwFq_mJnsDtW";

  try {
    const res = await fetchWithRetry(`https://www.googleapis.com/drive/v3/files/${projectId}?fields=id&supportsAllDrives=true`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("not accessible");
  } catch (err) {
    throw new Error("Accesso negato alla cartella principale. Richiedi l'accesso all'Owner.");
  }

  // Check if exists under the projectId parent
  const query = encodeURIComponent(`name='Foto Spedizioni - Gestionale' and '${projectId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`);
  const response = await fetchWithRetry(`https://www.googleapis.com/drive/v3/files?q=${query}&supportsAllDrives=true&includeItemsFromAllDrives=true`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  await checkResponse(response, "Verifica cartella Drive fallita");
  const data = await response.json();
  if (data.files && data.files.length > 0) {
    return data.files[0].id;
  }

  // Create folder nested in projectId
  return enqueueWrite(async () => {
    const createResponse = await fetchWithRetry("https://www.googleapis.com/drive/v3/files?supportsAllDrives=true", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "Foto Spedizioni - Gestionale",
        mimeType: "application/vnd.google-apps.folder",
        parents: [projectId],
      }),
    });
    await checkResponse(createResponse, "Creazione cartella Drive fallita");
    const createdFolder = await createResponse.json();
    return createdFolder.id;
  });
}


const compressImage = async (file: File, maxWidth = 1280, maxHeight = 1280, quality = 0.75): Promise<File> => {
  if (!file.type.startsWith('image/')) return file;
  
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const newName = file.name.replace(/\.[^/.]+$/, "") + ".jpg";
              const compressedFile = new File([blob], newName, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              resolve(file);
            }
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
};

// 8. Upload image to Drive and set "anyone with link can read" permission
export async function uploadImageToDrive(file: File, folderId: string, token: string, customName?: string): Promise<string> {
  const processedFile = await compressImage(file);
  
  return enqueueWrite(async () => {
    const isJpeg = processedFile.type === 'image/jpeg';
    const ext = isJpeg ? 'jpg' : processedFile.name.split('.').pop();
    
    const metadata = {
      name: customName ? `${customName}.${ext}` : processedFile.name,
      parents: [folderId],
    };

    const formData = new FormData();
    formData.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
    formData.append("file", processedFile);


    const uploadResponse = await fetchWithRetry(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id,name,webViewLink",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      }
    );
    await checkResponse(uploadResponse, "Caricamento foto su Drive fallito");
    const uploadedFile = await uploadResponse.json();

    // Make readable by anyone with the link so the image can be displayed in the app
    try {
      const permResponse = await fetchWithRetry(
        `https://www.googleapis.com/drive/v3/files/${uploadedFile.id}/permissions?supportsAllDrives=true`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            role: "reader",
            type: "anyone",
          }),
        }
      );
      if (!permResponse.ok) {
        console.warn("Impossibile impostare i permessi pubblici sulla foto, verrà comunque usato il link originale.");
      }
    } catch (err) {
      console.warn("Errore durante l'impostazione dei permessi sulla foto:", err);
    }

    return uploadedFile.webViewLink;
  });
}

// Type-safe converters for Database rows to Domain Objects

export function rowToOggetto(row: any[]): OggettoMagazzino {
  const nome = row[1]?.toString() || "";
  const isSingleCardExplicit = parseSafeBool(row[9]);
  const isSingleCardInferred = isSingleCardExplicit || nome.includes("[Carta Singola]") || nome.includes("[Singola]") || nome.toLowerCase().includes("carta singola");

  return {
    ID_Oggetto: row[0]?.toString() || "",
    Nome: nome,
    Quantità_Disponibile: parseSafeInt(row[2], 0),
    Costo_Acquisto: parseSafeFloat(row[3], 0),
    Prezzo_Vendita: parseSafeFloat(row[4], 0),
    Is_Preordine: parseSafeBool(row[5]),
    Acconto_Pagato: parseSafeFloat(row[6], 0),
    Data_Arrivo_Prevista: row[7]?.toString() || "",
    Stato_Preordine: (row[8]?.toString() as "In_Attesa" | "Saldato" | "Arrivato") || undefined,
    Is_Carta_Singola: isSingleCardInferred,
    Espansione: row[10]?.toString() || undefined,
    Rarità: row[11]?.toString() || undefined,
    Condizione: (row[12]?.toString() as any) || undefined,
    Lingua: (row[13]?.toString() as any) || undefined,
    Gradata: parseSafeBool(row[14]),
    Archiviata: parseSafeBool(row[15]),
    Storico_Costi: row[16]?.toString() || undefined,
    Costo_Spedizione_Lotto: parseSafeFloat(row[17], 0),
    Costo_Dogana_Lotto: parseSafeFloat(row[18], 0),
    Costo_Accessori_Lotto: parseSafeFloat(row[19], 0),
    Data_Spedizione_Presunta: row[20]?.toString() || "",
    Tag: row[21]?.toString() || "",
  };
}

export function rowToCarrello(row: any[]): Carrello {
  let rawStatus = row[2]?.toString() || "Aperto";
  if (rawStatus === "In Attesa") {
    rawStatus = "Aperto";
  }

  let strike = parseInt(row[8]?.toString() || "0", 10) || 0;
  let cattivoData = row[9]?.toString() || "";
  if (cattivoData.startsWith("'")) cattivoData = cattivoData.substring(1);

  if (cattivoData) {
    const cattivoDate = new Date(cattivoData);
    if (!isNaN(cattivoDate.getTime())) {
      let expirationTime = cattivoDate.getTime();
      if (expirationTime > Date.now() + 2 * 24 * 60 * 60 * 1000) {
        // Legacy future date
      } else {
        expirationTime += 30 * 24 * 60 * 60 * 1000;
      }
      if (Date.now() >= expirationTime) {
        strike = 0;
        cattivoData = "";
      }
    }
  }

  let lastMsg = row[11]?.toString() || "";
  if (lastMsg.startsWith("'")) lastMsg = lastMsg.substring(1);

  return {
    ID_Carrello: row[0]?.toString() || "",
    Nome_Cliente: row[1]?.toString() || "",
    Stato_Carrello: (rawStatus as StatoCarrello) || "Aperto",
    Totale_Pagato: parseSafeFloat(row[3], 0),
    Telefono: row[4]?.toString() || "",
    Email: row[5]?.toString() || "",
    Indirizzo_Spedizione: row[6]?.toString() || "",
    Tag: row[7]?.toString() || "",
    Strike: strike,
    Cattivo_Data: cattivoData,
    Note: row[10]?.toString() || "",
    Data_Ultimo_Messaggio: lastMsg,
  };
}

export function rowToDettaglio(row: any[]): DettaglioCarrello {
  return {
    ID_Carrello: row[0]?.toString() || "",
    ID_Oggetto: row[1]?.toString() || "",
    Pagato_Singolarmente: parseSafeBool(row[2]),
    Prezzo_Registrato: parseSafeFloat(row[3], 0),
    Pagamento_Posticipato: parseSafeBool(row[4]),
    Acconto_Pagato: parseSafeFloat(row[5], 0),
    ID_Spedizione: row[6]?.toString() || "",
    Reso: parseSafeBool(row[7]),
  };
}

export function rowToSpedizione(row: any[]): Spedizione {
  return {
    ID_Spedizione: row[0]?.toString() || "",
    ID_Carrello: row[1]?.toString() || "",
    Link_Foto_Oggetti: row[2]?.toString() || "",
    Data_Spedizione: row[3]?.toString() || "",
    Tracking: row[4]?.toString() || "",
    Stato_Consegna: row[5]?.toString() || "",
    Oggetti_Spediti: row[6]?.toString() || "",
    Nome_Cliente: row[7]?.toString() || "",
    Indirizzo_Spedizione: row[8]?.toString() || "",
    Telefono: row[9]?.toString() || "",
    Tag: row[10]?.toString() || "",
    Corriere: row[11]?.toString() || "",
    Costo_Spedizione: parseSafeFloat(row[12], 0),
  };
}

export function rowToFinanza(row: any[]): Finanza {
  return {
    Data: row[0]?.toString() || "",
    Tipo: row[1]?.toString() === "Uscita" ? "Uscita" : "Entrata",
    Importo: parseSafeFloat(row[2], 0),
    Categoria: row[3]?.toString() || "",
    Note: row[4]?.toString() || "",
  };
}

// 9. Folder Management & File Spostamento
export interface ProjectFolders {
  projectId: string;
  liveId: string;
  backupId: string;
  fotoProdottiId: string;
  fotoCartaAggiuntaId: string;
  carteConsegnateId: string;
  preparazioneSpedizioneId: string;
  ritornoSpedizioneId: string;
  spedizioneClienteId: string;
}

// Helper to find folder by name and parent ID
export async function findFolder(token: string, name: string, parentId?: string): Promise<string | null> {
  let query = `name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  if (parentId) {
    query += ` and '${parentId}' in parents`;
  }
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id)&supportsAllDrives=true&includeItemsFromAllDrives=true`;
  
  const res = await fetchWithRetry(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
  await checkResponse(res, `Ricerca cartella ${name} fallita`);
  const data = await res.json();
  
  if (data.files && data.files.length > 0) {
    for (const file of data.files) {
      const checkRes = await fetchWithRetry(`https://www.googleapis.com/drive/v3/files/${file.id}?fields=id,trashed&supportsAllDrives=true`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (checkRes.ok) {
        const fileData = await checkRes.json();
        if (!fileData.trashed) {
          return file.id;
        }
      }
    }
  }
  return null;
}

// Helper to create folder
export async function createFolder(token: string, name: string, parentId?: string): Promise<string> {
  return enqueueWrite(async () => {
    const body: any = {
      name: name,
      mimeType: "application/vnd.google-apps.folder",
    };
    if (parentId) {
      body.parents = [parentId];
    }
    const res = await fetchWithRetry("https://www.googleapis.com/drive/v3/files?supportsAllDrives=true", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    await checkResponse(res, `Creazione cartella ${name} fallita`);
    const data = await res.json();
    return data.id;
  });
}

// Ensures the Cartella Progetto + Tavole Live + Tavole Backup structure exists under the Owner's directory
export async function createProjectFolderStructure(token: string, isProd: boolean = true): Promise<ProjectFolders> {
  let officialProjectId = isProd 
    ? "19Zlvat9kyMK9fmfLRdobH8rA1gr5ALO7" 
    : "1ul4JbUkg3pNcClpEDQNzgwFq_mJnsDtW";

  try {
    const res = await fetchWithRetry(`https://www.googleapis.com/drive/v3/files/${officialProjectId}?fields=id&supportsAllDrives=true`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
      throw new Error("not accessible");
    }
  } catch (err) {
    throw new Error("Accesso negato alla cartella principale. Richiedi l'accesso all'Owner.");
  }

  const liveName = isProd 
    ? "Tavole Live" 
    : "Tavole Live [DEV]";
  const backupName = isProd 
    ? "Tavole Backup" 
    : "Tavole Backup [DEV]";

  // Subfolders names
  const fProdName = isProd ? "Foto Prodotti" : "Foto Prodotti [DEV]";
  const fCartaAggiuntaName = isProd ? "Foto carte Consegnate dal Cliente" : "Foto carte Consegnate dal Cliente [DEV]";
  const cConsegnateName = isProd ? "Carte Consegnate dal Cliente" : "Carte Consegnate dal Cliente [DEV]";
  const pSpedizioneName = isProd ? "Foto Carte Preparate per Spedizione" : "Foto Carte Preparate per Spedizione [DEV]";
  const rSpedizioneName = isProd ? "Foto Carte Ritornate dal Grading" : "Foto Carte Ritornate dal Grading [DEV]";
  const sClienteName = isProd ? "Foto Pacchi Spedizione Carrello" : "Foto Pacchi Spedizione Carrello [DEV]";

  // 1. Find or create Tavole Live under official projectId
  let liveId = await findFolder(token, liveName, officialProjectId);
  if (!liveId) {
    liveId = await createFolder(token, liveName, officialProjectId);
  }

  // 2. Find or create Tavole Backup
  let backupId = await findFolder(token, backupName, officialProjectId);
  if (!backupId) {
    backupId = await createFolder(token, backupName, officialProjectId);
  }

  // 3. Find or create Foto Prodotti
  let fotoProdottiId = await findFolder(token, fProdName, officialProjectId);
  if (!fotoProdottiId) {
    fotoProdottiId = await createFolder(token, fProdName, officialProjectId);
  }

  // 4. Find or create Foto carte Consegnate dal Cliente
  let fotoCartaAggiuntaId = await findFolder(token, fCartaAggiuntaName, officialProjectId);
  if (!fotoCartaAggiuntaId) {
    fotoCartaAggiuntaId = await createFolder(token, fCartaAggiuntaName, officialProjectId);
  }

  // 5. Find or create Carte Consegnate dal Cliente
  let carteConsegnateId = await findFolder(token, cConsegnateName, officialProjectId);
  if (!carteConsegnateId) {
    carteConsegnateId = await createFolder(token, cConsegnateName, officialProjectId);
  }

  // 6. Find or create Foto Carte Preparate per Spedizione
  let preparazioneSpedizioneId = await findFolder(token, pSpedizioneName, officialProjectId);
  if (!preparazioneSpedizioneId) {
    preparazioneSpedizioneId = await createFolder(token, pSpedizioneName, officialProjectId);
  }

  // 7. Find or create Foto Carte Ritornate dal Grading
  let ritornoSpedizioneId = await findFolder(token, rSpedizioneName, officialProjectId);
  if (!ritornoSpedizioneId) {
    ritornoSpedizioneId = await createFolder(token, rSpedizioneName, officialProjectId);
  }

  // 8. Find or create Foto Pacchi Spedizione Carrello
  let spedizioneClienteId = await findFolder(token, sClienteName, officialProjectId);
  if (!spedizioneClienteId) {
    spedizioneClienteId = await createFolder(token, sClienteName, officialProjectId);
  }

  return {
    projectId: officialProjectId,
    liveId,
    backupId,
    fotoProdottiId,
    fotoCartaAggiuntaId,
    carteConsegnateId,
    preparazioneSpedizioneId,
    ritornoSpedizioneId,
    spedizioneClienteId
  };
}

// Sposta un file (es. Google Sheet) in una cartella specifica di Google Drive
export async function moveFileToFolder(token: string, fileId: string, folderId: string): Promise<void> {
  return enqueueWrite(async () => {
    const getRes = await fetchWithRetry(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=parents&supportsAllDrives=true`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    await checkResponse(getRes, "Lettura genitori file fallita");
    const fileData = await getRes.json();
    const previousParents = (fileData.parents || []).join(",");

    const updateUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?addParents=${folderId}&supportsAllDrives=true${previousParents ? `&removeParents=${previousParents}` : ""}`;
    const patchRes = await fetchWithRetry(updateUrl, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` }
    });
    await checkResponse(patchRes, "Spostamento file fallito");
  });
}

// Carica un backup JSON direttamente nella cartella Tavole Backup di Google Drive
export async function uploadBackupToDriveFolder(
  token: string,
  backupFolderId: string,
  filename: string,
  data: any
): Promise<string> {
  return enqueueWrite(async () => {
    const metadata = {
      name: filename,
      mimeType: "application/json",
      parents: [backupFolderId]
    };

    const fileContent = JSON.stringify(data, null, 2);
    const blob = new Blob([fileContent], { type: "application/json" });

    const formData = new FormData();
    formData.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
    formData.append("file", blob);

    const res = await fetchWithRetry(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id&supportsAllDrives=true",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      }
    );
    await checkResponse(res, "Caricamento backup JSON su Drive fallito");
    const result = await res.json();
    return result.id;
  });
}

// Recupera i file di backup presenti nella cartella Tavole Backup su Google Drive
export async function listBackupsFromDrive(token: string, backupFolderId: string): Promise<any[]> {
  const query = `'${backupFolderId}' in parents and trashed=false and mimeType != 'application/vnd.google-apps.folder'`; // files only, basically
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&orderBy=createdTime desc&fields=files(id,name,createdTime)&supportsAllDrives=true&includeItemsFromAllDrives=true`;
  const res = await fetchWithRetry(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    console.error("Errore nel recupero dei backup di Drive");
    return [];
  }
  const result = await res.json();
  return result.files || [];
}

// Scarica il contenuto di un file di backup JSON da Drive
export async function downloadBackupFromDrive(token: string, fileId: string): Promise<any> {
  const res = await fetchWithRetry(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&supportsAllDrives=true`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  await checkResponse(res, "Scaricamento backup da Google Drive fallito");
  return await res.json();
}

// 10. Eliminazione riga per ID unico (Cerca in colonna A e cancella)
export async function deleteRowByID(
  spreadsheetId: string,
  sheetName: string,
  idValue: string,
  token: string
): Promise<void> {
  const rows = await fetchSheetRows(spreadsheetId, `${sheetName}!A:A`, token);
  const rowIndex = rows.findIndex((row) => row[0]?.toString().toLowerCase().trim() === idValue.toLowerCase().trim());
  if (rowIndex === -1) {
    throw new Error(`ID ${idValue} non trovato nel foglio ${sheetName}.`);
  }
  await deleteSheetRow(spreadsheetId, sheetName, rowIndex, token);
}

// 11. Recupera i metadati di un file da Google Drive (come nome, genitori, link)
export async function getFileMetadata(token: string, fileId: string): Promise<any> {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,parents,webViewLink&supportsAllDrives=true`;
  const res = await fetchWithRetry(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
  await checkResponse(res, `Impossibile recuperare i metadati del file ${fileId}`);
  return await res.json();
}

// 12. Convertitore per Utenti Registrati
export function rowToUtenteRegistrato(row: any[]): UtenteRegistrato {
  return {
    Email: row[0]?.toString() || "",
    Ruolo: (row[1]?.toString().toLowerCase().trim() as "owner" | "moderatore" | "utente") || "utente",
    Data_Registrazione: row[2]?.toString() || "",
  };
}

// 13. Assicura che la scheda Utenti_Registrati esista nel foglio di calcolo
export async function patchOldHeaders(spreadsheetId: string, token: string, providedCcHeaders?: any[][]): Promise<void> {
  const win = (typeof window !== "undefined" ? window : {}) as any;
  if (!win.__headersPatched) win.__headersPatched = {};
  if (win.__headersPatched[spreadsheetId]) {
    return;
  }
  
  try {
    const dataToWrite = [
      {
        range: "Logistica_Spedizioni!A1:M1",
        values: [["ID_Spedizione", "ID_Carrello", "Link_Foto_Oggetti", "Data_Spedizione", "Tracking", "Stato_Consegna", "Oggetti_Spediti", "Nome_Cliente", "Indirizzo_Spedizione", "Telefono", "Tag", "Corriere", "Costo_Spedizione"]],
      },
      {
        range: "Dettaglio_Carrello!A1:H1",
        values: [["ID_Carrello", "ID_Oggetto", "Pagato_Singolarmente", "Prezzo_Registrato", "Pagamento_Posticipato", "Acconto_Pagato", "ID_Spedizione", "Reso"]],
      },
      {
        range: "Oggetti_In_Grading!A1:P1",
        values: [["ID_Oggetto_Grading", "ID_Carrello", "Nome_Carta", "Tipologia_Servizio", "Costo_Cliente", "Costo_Acquisto", "Margine_Lordo", "Link_Foto", "Pagato_Singolarmente", "ID_Gruppo_Grading", "Link_Foto_Ritornata", "Metodo_Consegna", "Pagamento_Posticipato", "Acconto_Pagato", "ID_Spedizione", "Reso"]],
      },
      {
        range: "Magazzino!F1:V1",
        values: [["Is_Preordine", "Acconto_Pagato", "Data_Arrivo_Prevista", "Stato_Preordine", "Is_Carta_Singola", "Espansione", "Rarità", "Condizione", "Lingua", "Gradata", "Archiviata", "Storico_Costi", "Costo_Spedizione_Lotto", "Costo_Dogana_Lotto", "Costo_Accessori_Lotto", "Data_Spedizione_Presunta", "Tag"]],
      }
    ];

    let needsUpdate = true;
    try {
      const ccHeaders = providedCcHeaders || await fetchSheetRows(spreadsheetId, "Clienti_Carrelli!A1:Z1", token);
      if (ccHeaders && ccHeaders.length > 0) {
        const row1 = ccHeaders[0] || [];
        const tagCount = row1.filter((h: any) => h && h.toString().trim().toLowerCase() === "tag").length;
        const hasOldHeaders = row1.includes("Telefono_Cliente") || row1.includes("Email_Cliente");
        const hasExtraCols = row1.length > 8;

        if (tagCount > 1 || hasOldHeaders || hasExtraCols) {
          // Clear any extra header cells beyond column H (I1:Z1)
          const emptyRow = Array(18).fill("");
          dataToWrite.push({
            range: "Clienti_Carrelli!A1:Z1",
            values: [["ID_Carrello", "Nome_Cliente", "Stato_Carrello", "Totale_Pagato", "Telefono", "Email", "Indirizzo_Spedizione", "Tag", "Strike", "Cattivo_Data", ...emptyRow.slice(2)]],
          });
        } else {
          // Se non ha i tag anomali ed è corretta, potremmo anche evitare l'update del tutto.
          // Tuttavia per non complicare la logica su TUTTI i fogli (Spedizioni, Dettaglio, etc)
          // eseguiamo l'update solo 1 volta in background.
        }
      }
    } catch (e) {
      console.warn("Could not check Clienti_Carrelli headers in patchOldHeaders:", e);
    }

    // Skip the write completely since this is legacy and slows down the app.
    // If the user really needs headers reset, they can be done manually.
    // Writing headers on every single load is a massive performance bottleneck.
    if (dataToWrite.length > 4) { // Only write if Clienti_Carrelli was specifically flagged
      await enqueueWrite(async () => {
        await fetchWithRetry(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            valueInputOption: "USER_ENTERED",
            data: dataToWrite,
          }),
        });
      });
    }
    
    win.__headersPatched[spreadsheetId] = true;
  } catch (err) {
    console.error("Failed to patch old headers", err);
  }
}

export async function ensureUtentiRegistratiSheet(spreadsheetId: string, token: string): Promise<boolean> {
  const win = (typeof window !== "undefined" ? window : {}) as any;
  if (!win.__sheetsEnsured) win.__sheetsEnsured = {};
  if (win.__sheetsEnsured[spreadsheetId + "_utenti"]) {
    return false;
  }
  try {
    const mapping = await getSheetIds(spreadsheetId, token);
    if (mapping["Utenti_Registrati"] !== undefined) {
      win.__sheetsEnsured[spreadsheetId + "_utenti"] = true;
      return false; // esiste già
    }

    return await enqueueWrite(async () => {
      // Crea la nuova scheda
      const addSheetResponse = await fetchWithRetry(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            requests: [
              {
                addSheet: {
                  properties: {
                    title: "Utenti_Registrati",
                  },
                },
              },
            ],
          }),
        }
      );
      await checkResponse(addSheetResponse, "Creazione scheda Utenti_Registrati fallita");

      // Scrivi le intestazioni
      const headersResponse = await fetchWithRetry(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            valueInputOption: "USER_ENTERED",
            data: [
              {
                range: "Utenti_Registrati!A1:C1",
                values: [["Email", "Ruolo", "Data_Registrazione"]],
              },
            ],
          }),
        }
      );
      await checkResponse(headersResponse, "Inizializzazione intestazioni Utenti_Registrati fallita");
      win.__sheetsEnsured[spreadsheetId + "_utenti"] = true;
      return true; // creata con successo
    });
  } catch (err) {
    console.warn("Errore durante l'allineamento automatico di Utenti_Registrati:", err);
    return false;
  }
}

export function rowToGradingGroup(row: any[]): GradingGroup {
  return {
    ID_Gruppo_Grading: row[0]?.toString() || "",
    Nome_Gruppo: row[1]?.toString() || "",
    Compagnia: (row[2]?.toString() as "PSA" | "BGS") || "PSA",
    Data_Creazione: row[3]?.toString() || "",
    Stato_Gruppo: (row[4]?.toString() as any) || "In Preparazione",
  };
}

export function rowToGradingItem(row: any[]): GradingItem {
  return {
    ID_Oggetto_Grading: row[0]?.toString() || "",
    ID_Carrello: row[1]?.toString() || "",
    Nome_Carta: row[2]?.toString() || "",
    Tipologia_Servizio: row[3]?.toString() || "",
    Costo_Cliente: parseSafeFloat(row[4], 0),
    Costo_Acquisto: parseSafeFloat(row[5], 0),
    Margine_Lordo: parseSafeFloat(row[6], 0),
    Link_Foto: row[7]?.toString() || "",
    Pagato_Singolarmente: parseSafeBool(row[8]),
    ID_Gruppo_Grading: row[9]?.toString() || "",
    Link_Foto_Ritornata: row[10]?.toString() || "",
    Metodo_Consegna: row[11]?.toString() || "",
    Pagamento_Posticipato: parseSafeBool(row[12]),
    Acconto_Pagato: parseSafeFloat(row[13], 0),
    ID_Spedizione: row[14]?.toString() || "",
    Reso: parseSafeBool(row[15]),
  };
}

export function rowToListinoGradingItem(row: any[]): ListinoGradingItem {
  return {
    Tipologia_Servizio: row[0]?.toString() || "",
    Costo_Cliente: parseSafeFloat(row[1], 0),
    Costo_Acquisto: parseSafeFloat(row[2], 0),
  };
}

export async function ensureGradingSheets(spreadsheetId: string, token: string): Promise<void> {
  const win = (typeof window !== "undefined" ? window : {}) as any;
  if (!win.__sheetsEnsured) win.__sheetsEnsured = {};
  if (win.__sheetsEnsured[spreadsheetId + "_grading"]) {
    return;
  }
  const mapping = await getSheetIds(spreadsheetId, token);
  const requests: any[] = [];

  if (mapping["Gruppi_Grading"] === undefined) {
    requests.push({ addSheet: { properties: { title: "Gruppi_Grading" } } });
  }
  if (mapping["Oggetti_In_Grading"] === undefined) {
    requests.push({ addSheet: { properties: { title: "Oggetti_In_Grading" } } });
  }
  if (mapping["Listino_Grading"] === undefined) {
    requests.push({ addSheet: { properties: { title: "Listino_Grading" } } });
  }

  if (requests.length > 0) {
    await enqueueWrite(async () => {
      const res = await fetchWithRetry(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ requests }),
      });
      await checkResponse(res, "Creazione schede per Grading fallita");
    });
  }

  // Refresh sheet mapping
  const updatedMapping = await getSheetIds(spreadsheetId, token);

  // Initialize headers
  const dataToWrite: any[] = [];

  // Clienti_Carrelli check and update headers to col H
  try {
    const ccHeaders = await fetchSheetRows(spreadsheetId, "Clienti_Carrelli!A1:L1", token);
    if (!ccHeaders || ccHeaders.length === 0 || ccHeaders[0].length < 12 || ccHeaders[0][7] !== "Tag" || ccHeaders[0][8] !== "Strike" || ccHeaders[0][9] !== "Cattivo_Data" || ccHeaders[0][10] !== "Note" || ccHeaders[0][11] !== "Data_Ultimo_Messaggio") {
      dataToWrite.push({
        range: "Clienti_Carrelli!A1:L1",
        values: [["ID_Carrello", "Nome_Cliente", "Stato_Carrello", "Totale_Pagato", "Telefono", "Email", "Indirizzo_Spedizione", "Tag", "Strike", "Cattivo_Data", "Note", "Data_Ultimo_Messaggio"]],
      });
    }
  } catch (err) {
    console.warn("Impossibile verificare intestazioni Clienti_Carrelli:", err);
  }

  if (mapping["Gruppi_Grading"] === undefined) {
    dataToWrite.push({
      range: "Gruppi_Grading!A1:E1",
      values: [["ID_Gruppo_Grading", "Nome_Gruppo", "Compagnia", "Data_Creazione", "Stato_Gruppo"]],
    });
  }

  if (mapping["Oggetti_In_Grading"] === undefined) {
    dataToWrite.push({
      range: "Oggetti_In_Grading!A1:P1",
      values: [["ID_Oggetto_Grading", "ID_Carrello", "Nome_Carta", "Tipologia_Servizio", "Costo_Cliente", "Costo_Acquisto", "Margine_Lordo", "Link_Foto", "Pagato_Singolarmente", "ID_Gruppo_Grading", "Link_Foto_Ritornata", "Metodo_Consegna", "Pagamento_Posticipato", "Acconto_Pagato", "ID_Spedizione", "Reso"]],
    });
  }

  if (mapping["Listino_Grading"] === undefined) {
    dataToWrite.push({
      range: "Listino_Grading!A1:C1",
      values: [["Tipologia_Servizio", "Costo_Cliente", "Costo_Acquisto"]],
    });
    dataToWrite.push({
      range: "Listino_Grading!A2:C12",
      values: [
        ["SPECIALE PSA ECO", "30", "30"],
        ["PSA ECONOMY", "35", "30"],
        ["PSA STANDARD", "60", "51"],
        ["PSA EXPRESS", "110", "90"],
        ["PSA PRIORITY", "220", "190"],
        ["PSA FIRMATE", "60", "50"],
        ["BGS BASE", "30", "25"],
        ["BGS STANDARD", "50", "43"],
        ["BGS EXPRESS", "110", "90"],
        ["BGS PRIORITY", "220", "190"],
        ["BGS FIRMATA", "150", "150"]
      ],
    });
  }

  if (dataToWrite.length > 0) {
    await enqueueWrite(async () => {
      const headersResponse = await fetchWithRetry(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            valueInputOption: "USER_ENTERED",
            data: dataToWrite,
          }),
        }
      );
      await checkResponse(headersResponse, "Inizializzazione intestazioni schede Grading fallita");
    });
  }
  win.__sheetsEnsured[spreadsheetId + "_grading"] = true;
}

// Global queue for safety audit logs to prevent file write race conditions in Google Drive
let logQueue: string[] = [];
let isWritingLog = false;

export async function appendAuditLogToDrive(
  token: string,
  backupFolderId: string,
  logLines: string[]
): Promise<void> {
  if (logLines.length === 0) return;
  
  const CSV_HEADER = "Data_Ora;Tabella;Operazione;ID_Record;Nome_Record;Operatore;Email_Utente;Efficacia;Dettagli_Modifiche";

  // 1. Search for audit_log.csv in backupFolderId
  const query = `'${backupFolderId}' in parents and name='audit_log.csv' and trashed=false`;
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id)&supportsAllDrives=true&includeItemsFromAllDrives=true`;
  const searchRes = await fetchWithRetry(searchUrl, {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  let fileId: string | null = null;
  if (searchRes.ok) {
    const searchData = await searchRes.json();
    if (searchData.files && searchData.files.length > 0) {
      fileId = searchData.files[0].id;
    }
  }
  
  let currentContent = "";
  if (fileId) {
    // 2. Download existing content as text
    try {
      const getRes = await fetchWithRetry(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&supportsAllDrives=true`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (getRes.ok) {
        currentContent = await getRes.text();
      }
    } catch (e) {
      console.warn("Errore nel download di audit_log.csv:", e);
    }
  }
  
  if (!currentContent || !currentContent.trim()) {
    currentContent = CSV_HEADER;
  }

  // 3. Append new CSV lines
  const newContent = currentContent + (currentContent && !currentContent.endsWith("\n") ? "\n" : "") + logLines.join("\n") + "\n";
  const blob = new Blob([newContent], { type: "text/csv; charset=utf-8" });
  
  if (fileId) {
    // 4. Update existing file content
    const updateUrl = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media&supportsAllDrives=true`;
    const updateRes = await fetchWithRetry(updateUrl, {
      method: "PATCH",
      headers: { 
        Authorization: `Bearer ${token}`,
        "Content-Type": "text/csv; charset=utf-8"
      },
      body: blob
    });
    if (!updateRes.ok) {
      throw new Error("Impossibile aggiornare audit_log.csv su Google Drive");
    }
  } else {
    // 5. Create new file named audit_log.csv
    const metadata = {
      name: "audit_log.csv",
      mimeType: "text/csv",
      parents: [backupFolderId]
    };
    
    const formData = new FormData();
    formData.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
    formData.append("file", blob);
    
    const createRes = await fetchWithRetry(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id&supportsAllDrives=true",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      }
    );
    if (!createRes.ok) {
      throw new Error("Impossibile creare audit_log.csv su Google Drive");
    }
  }
}

export async function appendAuditLogToDriveQueue(
  token: string,
  backupFolderId: string,
  message: string
): Promise<void> {
  logQueue.push(message);
  if (isWritingLog) return;
  
  isWritingLog = true;
  // Delay slightly to batch multiple synchronous calls together if they happen in quick succession
  await new Promise((resolve) => setTimeout(resolve, 800));
  
  while (logQueue.length > 0) {
    const linesToSync = [...logQueue];
    logQueue = [];
    try {
      await enqueueWrite(() => appendAuditLogToDrive(token, backupFolderId, linesToSync));
    } catch (err) {
      console.error("Errore salvataggio log audit su Google Drive:", err);
    }
  }
  isWritingLog = false;
}

/**
 * Export courier shipments ready for label creation to Google Sheets tab "Export_Packlink"
 */
export async function exportPacklinkShipmentsToSheet(
  spreadsheetId: string,
  rows: any[][],
  token: string
): Promise<{ rowCount: number; sheetTitle: string }> {
  const sheetTitle = "Export_Packlink";
  
  // 1. Ensure sheet exists
  const mapping = await getSheetIds(spreadsheetId, token);
  if (mapping[sheetTitle] === undefined) {
    await enqueueWrite(async () => {
      const res = await fetchWithRetry(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requests: [{ addSheet: { properties: { title: sheetTitle } } }],
        }),
      });
      await checkResponse(res, `Creazione scheda ${sheetTitle} fallita`);
    });
  }

  // 2. Clear previous data in Export_Packlink tab
  await clearSheetRange(spreadsheetId, `${sheetTitle}!A1:Z5000`, token);

  // 3. Define standard headers
  const headers = [
    "ID_Spedizione",
    "ID_Carrello",
    "Data_Spedizione",
    "Nome_Destinatario",
    "Nome",
    "Cognome",
    "Azienda",
    "Indirizzo",
    "CAP",
    "Citta",
    "Provincia",
    "Nazione",
    "Telefono",
    "Email",
    "Contenuto_Pacco",
    "Peso_Kg",
    "Lunghezza_cm",
    "Larghezza_cm",
    "Altezza_cm",
    "Corriere",
    "Stato_Spedizione",
    "Note_Carrello"
  ];

  const fullData = [headers, ...rows];

  // 4. Write data
  await updateSheetRows(spreadsheetId, `${sheetTitle}!A1:V${fullData.length}`, fullData, token);

  return { rowCount: rows.length, sheetTitle };
}



