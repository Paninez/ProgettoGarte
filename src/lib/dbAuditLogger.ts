/**
 * @file dbAuditLogger.ts
 * @description Database audit logger exporting structured CSV logs to Google Drive (`audit_log.csv`)
 * and human-readable console entries for UI debugging.
 */

import { appendAuditLogToDriveQueue } from "./googleApi";

export interface FieldDiff {
  field: string;
  oldValue: any;
  newValue: any;
}

export interface DbAuditParams {
  table: string; // e.g. "Magazzino", "Clienti_Carrelli", "Dettaglio_Carrello", "Logistica_Spedizioni", "Finanze", "Grading"
  operation: "INSERIMENTO" | "MODIFICA" | "ELIMINAZIONE" | "SALDO_PREORDINE" | "RIPRISTINO_BACKUP" | "RESO_SPEDIZIONE";
  recordId: string;
  recordName?: string;
  operator: string;
  userEmail?: string;
  diffs?: FieldDiff[];
  details?: Record<string, any>;
  rawNote?: string;
}

export function escapeCsvField(val: any): string {
  const str = String(val ?? "");
  if (str.includes(";") || str.includes('"') || str.includes("\n") || str.includes("\r") || str.includes(",")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Creates a database audit entry in CSV format and streams it asynchronously to `audit_log.csv` on Google Drive.
 */
export function logDbChange(
  token: string | null,
  backupFolderId: string | undefined,
  params: DbAuditParams,
  setSafetyLogs?: (updater: (prev: string[]) => string[]) => void
): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString("it-IT");
  const timeStr = now.toLocaleTimeString("it-IT");
  const timestamp = `${dateStr} ${timeStr}`;

  let detailsText = "";
  let efficacyLabel = "EFFETTIVA";
  let bodyForUi = "";

  if (params.diffs) {
    const changedFields = params.diffs.filter((d) => {
      const oldS = String(d.oldValue ?? "").trim();
      const newS = String(d.newValue ?? "").trim();
      return oldS !== newS;
    });

    if (changedFields.length > 0) {
      efficacyLabel = "EFFETTIVA";
      detailsText = changedFields
        .map((d) => `[${d.field}]: "${d.oldValue ?? "VUOTO"}" ➔ "${d.newValue ?? "VUOTO"}"`)
        .join(" | ");
      bodyForUi = `✅ MODIFICA EFFETTIVA (${changedFields.length} campi alterati):\n    ` + 
        changedFields.map((d) => `• [${d.field}]: "${d.oldValue ?? "VUOTO"}" ➔ "${d.newValue ?? "VUOTO"}"`).join("\n    ");
    } else {
      efficacyLabel = "NON_EFFETTIVA";
      detailsText = "I dati inviati sono identici allo stato precedente nel database. Nessuna variazione.";
      bodyForUi = `⚠️ MODIFICA NON EFFETTIVA: I dati inviati sono identici allo stato precedente nel database. Nessuna riga effettivamente variata.`;
    }
  } else if (params.details) {
    efficacyLabel = "NUOVO_INSERIMENTO";
    detailsText = Object.entries(params.details)
      .filter(([_, v]) => v !== undefined && v !== null && v !== "")
      .map(([k, v]) => `${k}: "${v}"`)
      .join(" | ");
    bodyForUi = `ℹ️ NUOVA REGISTRAZIONE: ${detailsText}`;
  } else if (params.rawNote) {
    efficacyLabel = "OPERAZIONE";
    detailsText = params.rawNote;
    bodyForUi = `ℹ️ Dettagli Operazione: ${params.rawNote}`;
  }

  // Construct standard CSV Row
  const csvRow = [
    escapeCsvField(timestamp),
    escapeCsvField(params.table.toUpperCase()),
    escapeCsvField(params.operation),
    escapeCsvField(params.recordId),
    escapeCsvField(params.recordName || ""),
    escapeCsvField(params.operator),
    escapeCsvField(params.userEmail || ""),
    escapeCsvField(efficacyLabel),
    escapeCsvField(detailsText)
  ].join(";");

  // Construct UI console card string
  const uiLog = `[${timestamp}] [DB-AUDIT] [${params.table.toUpperCase()}] [Op: ${params.operation}] [Operatore: ${params.operator}]` +
    (params.userEmail ? ` [User: ${params.userEmail}]` : "") +
    `\n  📍 Target Record: "${params.recordId}"` + (params.recordName ? ` (${params.recordName})` : "") +
    `\n  ${bodyForUi}` +
    `\n--------------------------------------------------------------------------------`;

  if (setSafetyLogs) {
    setSafetyLogs((prev) => [uiLog, ...prev.slice(0, 99)]);
  }

  if (token && backupFolderId) {
    appendAuditLogToDriveQueue(token, backupFolderId, csvRow);
  }

  return csvRow;
}

