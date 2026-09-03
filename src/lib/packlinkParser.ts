import { Spedizione, Carrello } from "../types";

export interface ParsedAddress {
  rawAddress: string;
  fullName: string;
  firstName: string;
  lastName: string;
  company: string;
  street: string;
  postalCode: string;
  city: string;
  province: string;
  country: string;
  phone: string;
  email: string;
  content: string;
  weight: number;
  length: number;
  width: number;
  height: number;
  isValid: boolean;
  warnings: string[];
}

export interface ShippingValidationResult {
  isComplete: boolean;
  hasName: boolean;
  hasStreet: boolean;
  hasCap: boolean;
  hasCity: boolean;
  hasProvince: boolean;
  hasPhone: boolean;
  missingFields: string[];
  summaryBadge: string;
  parsed: ParsedAddress;
}

/**
 * Checks whether a cart requires courier delivery based on its tags and status
 */
export function isCartRequiringCourier(cart: Carrello): boolean {
  if (!cart) return false;
  const tag = (cart.Tag || "").toLowerCase();
  const stato = (cart.Stato_Carrello || "").toLowerCase();
  return (
    tag.includes("spedizione richiesta") ||
    tag.includes("corriere") ||
    tag.includes("spedizione con corriere") ||
    tag.includes("pronto per spedire") ||
    stato === "pronto_per_spedizione"
  );
}

/**
 * Comprehensive shipping data completeness check for Italian Courier delivery
 */
export function getShippingValidation(
  customerName?: string,
  rawAddress?: string,
  phone?: string,
  email?: string
): ShippingValidationResult {
  const parsed = parseAddressAndCustomer(customerName, rawAddress, phone, email);
  const missingFields: string[] = [];

  const hasName = !!(parsed.fullName && parsed.fullName.trim().length > 0);
  if (!hasName) missingFields.push("Destinatario mancante");

  const hasPhone = !!(phone && phone.trim().length >= 5);
  if (!hasPhone) missingFields.push("Telefono mancante");

  const hasStreet = !!(parsed.street && parsed.street.trim().length > 0 && parsed.street !== parsed.rawAddress || parsed.street.length >= 4);
  if (!hasStreet) missingFields.push("Via/Civico mancante");

  const hasCap = !!(parsed.postalCode && /^\d{5}$/.test(parsed.postalCode));
  if (!hasCap) missingFields.push("CAP a 5 cifre mancante");

  const hasCity = !!(parsed.city && parsed.city.trim().length > 0);
  if (!hasCity) missingFields.push("Città mancante");

  const hasProvince = !!(parsed.province && /^[A-Za-z]{2}$/.test(parsed.province));
  if (!hasProvince) missingFields.push("Provincia mancante");

  const isComplete = missingFields.length === 0;

  let summaryBadge = "Completo";
  if (!isComplete) {
    if (!rawAddress || !rawAddress.trim()) {
      summaryBadge = "Indirizzo Mancante";
    } else if (!hasCap && !hasProvince) {
      summaryBadge = "Manca CAP e Prov.";
    } else if (!hasCap) {
      summaryBadge = "Manca CAP";
    } else if (!hasProvince) {
      summaryBadge = "Manca Provincia";
    } else if (!hasPhone) {
      summaryBadge = "Manca Telefono";
    } else if (!hasName) {
      summaryBadge = "Manca Destinatario";
    } else {
      summaryBadge = "Dati Incompleti";
    }
  }

  return {
    isComplete,
    hasName,
    hasStreet,
    hasCap,
    hasCity,
    hasProvince,
    hasPhone,
    missingFields,
    summaryBadge,
    parsed,
  };
}

/**
 * Intelligent Italian Address & Contact Parser for Packlink PRO / Zapier
 */
export function parseAddressAndCustomer(
  customerName?: string,
  rawAddress?: string,
  phone?: string,
  email?: string,
  content?: string
): ParsedAddress {
  const warnings: string[] = [];
  const cleanName = (customerName || "").trim();
  const cleanAddress = (rawAddress || "").trim();
  const cleanPhone = (phone || "").trim();
  const cleanEmail = (email || "").trim();
  const cleanContent = (content || "").trim() || "Carte Collezionabili / Gadget";

  // 1. Split First & Last Name
  let firstName = "";
  let lastName = "";
  if (cleanName) {
    const parts = cleanName.split(/\s+/);
    if (parts.length === 1) {
      firstName = parts[0];
      lastName = parts[0]; // fallback for single word names
    } else {
      firstName = parts[0];
      lastName = parts.slice(1).join(" ");
    }
  } else {
    warnings.push("Nome destinatario mancante");
  }

  // 2. Parse Address Components
  let postalCode = "";
  let province = "";
  let city = "";
  let street = "";

  if (!cleanAddress) {
    warnings.push("Indirizzo non inserito");
  } else {
    // Flatten newlines into commas for unified regex matching
    const singleLine = cleanAddress.replace(/[\r\n]+/g, ", ");

    // Extract 5-digit Italian CAP
    const capMatch = singleLine.match(/\b\d{5}\b/);
    if (capMatch) {
      postalCode = capMatch[0];
    } else {
      warnings.push("CAP a 5 cifre non identificato");
    }

    // Extract Province: (RM) or isolated 2-letter uppercase word
    const provMatch = singleLine.match(/\(([A-Za-z]{2})\)/) || singleLine.match(/\b([A-Z]{2})\b(?!\d)/);
    if (provMatch) {
      province = provMatch[1].toUpperCase();
    } else {
      warnings.push("Provincia (es. RM, MI, NA) non identificata");
    }

    // Attempt City extraction: look around CAP or province
    if (capMatch) {
      const capIndex = singleLine.indexOf(capMatch[0]);
      const beforeCap = singleLine.substring(0, capIndex).trim().replace(/,\s*$/, "");
      const afterCap = singleLine.substring(capIndex + 5).trim().replace(/^,\s*/, "");

      street = beforeCap;

      // Extract city from afterCap, stripping out (PROV) or PROV
      let potentialCity = afterCap;
      if (province) {
        potentialCity = potentialCity
          .replace(new RegExp(`\\(?${province}\\)?`, "i"), "")
          .replace(/,\s*$/, "")
          .trim();
      }
      // Remove any country mention like "Italia" or "IT"
      potentialCity = potentialCity.replace(/\b(Italia|Italy|IT)\b/gi, "").trim();

      if (potentialCity) {
        city = potentialCity.replace(/^[-,\s]+|[-,\s]+$/g, "");
      }
    } else {
      // Fallback: split by comma
      const segments = singleLine.split(",").map((s) => s.trim()).filter(Boolean);
      if (segments.length >= 2) {
        street = segments[0];
        city = segments.slice(1).join(" ");
      } else {
        street = singleLine;
      }
    }

    if (!city) {
      warnings.push("Città non identificata con certezza");
    }
    if (!street) {
      warnings.push("Via / Civico non identificati");
    }
  }

  const isValid = warnings.length === 0;

  return {
    rawAddress: cleanAddress,
    fullName: cleanName,
    firstName,
    lastName,
    company: "",
    street: street || cleanAddress,
    postalCode,
    city,
    province,
    country: "IT",
    phone: cleanPhone,
    email: cleanEmail,
    content: cleanContent,
    weight: 0.5, // Standard parcel 500g
    length: 20, // 20cm
    width: 15, // 15cm
    height: 5, // 5cm
    isValid,
    warnings,
  };
}

/**
 * Generates standard CSV for Packlink PRO import
 */
export function formatPacklinkCsv(
  shipments: Spedizione[],
  carrelli: Carrello[],
  customPackages?: Record<string, { weight: number; length: number; width: number; height: number }>
): string {
  // Packlink PRO standard CSV headers
  const headers = [
    "Riferimento Spedizione",
    "Nome Destinatario",
    "Cognome Destinatario",
    "Azienda",
    "Indirizzo",
    "CAP",
    "Citta",
    "Provincia",
    "Nazione",
    "Telefono",
    "Email",
    "Peso (kg)",
    "Lunghezza (cm)",
    "Larghezza (cm)",
    "Altezza (cm)",
    "Descrizione Contenuto",
    "Note / Riferimento Carrello",
  ];

  const escapeCsv = (val: any) => {
    if (val === undefined || val === null) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = shipments.map((s) => {
    const cart = carrelli.find((c) => c.ID_Carrello === s.ID_Carrello);
    const parsed = parseAddressAndCustomer(
      cart?.Nome_Cliente || s.Nome_Cliente,
      cart?.Indirizzo_Spedizione || s.Indirizzo_Spedizione,
      cart?.Telefono || s.Telefono,
      cart?.Email,
      s.Oggetti_Spediti
    );

    const customPkg = customPackages?.[s.ID_Spedizione];
    const weight = customPkg?.weight ?? parsed.weight;
    const length = customPkg?.length ?? parsed.length;
    const width = customPkg?.width ?? parsed.width;
    const height = customPkg?.height ?? parsed.height;

    return [
      escapeCsv(s.ID_Spedizione),
      escapeCsv(parsed.firstName),
      escapeCsv(parsed.lastName),
      escapeCsv(parsed.company),
      escapeCsv(parsed.street),
      escapeCsv(parsed.postalCode),
      escapeCsv(parsed.city),
      escapeCsv(parsed.province),
      escapeCsv(parsed.country),
      escapeCsv(parsed.phone),
      escapeCsv(parsed.email),
      escapeCsv(weight),
      escapeCsv(length),
      escapeCsv(width),
      escapeCsv(height),
      escapeCsv(parsed.content),
      escapeCsv(`Carrello ${s.ID_Carrello} - ${s.Nome_Cliente}`),
    ].join(",");
  });

  // UTF-8 BOM + Header + Rows
  return "\uFEFF" + [headers.map(escapeCsv).join(","), ...rows].join("\r\n");
}
