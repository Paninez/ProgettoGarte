import { Spedizione, Carrello, DettaglioCarrello, GradingItem } from "../../types";

export function getTrackingUrl(trackingCode?: string): string | null {
  if (!trackingCode || trackingCode === "N/A" || trackingCode.trim().length < 4) return null;
  const code = trackingCode.trim();
  if (code.toLowerCase().startsWith("http://") || code.toLowerCase().startsWith("https://")) {
    return code;
  }
  const upper = code.toUpperCase();
  if (upper.endsWith("IT") || upper.startsWith("ZA") || upper.startsWith("ZB") || upper.length === 12 || upper.length === 13) {
    return `https://www.poste.it/cerca/index.html#/risultati-spedizioni/${upper}`;
  }
  if (/^\d{12}$/.test(upper)) {
    return `https://www.brt.it/it/tracking?parcelNumber=${upper}`;
  }
  if (/^\d{24}$/.test(upper)) {
    return `https://inpost.it/trova-il-tuo-pacco?number=${upper}`;
  }
  if (/^\d{9,11}$/.test(upper)) {
    return `https://www.gls-italy.com/it/servizi-per-te/ricerca-spedizione/?spedizione=${upper}`;
  }
  return `https://www.17track.net/it/track#nums=${upper}`;
}

export interface SpedizioniProps {
  onUpdateShipmentStatus: (shipmentId: string, cartId: string, newStatus: string) => Promise<void>;
  onUpdateShipmentTag?: (shipmentId: string, newTag: string) => Promise<void>;
  onUpdateShipmentCost?: (shipmentId: string, newCost: number) => Promise<void>;
  onNavigateToCart: (cartId: string) => void;
  onSaveCart?: (cart: Carrello, dettagli: DettaglioCarrello[], grading?: GradingItem[], silent?: boolean) => Promise<void>;
  onReturnItem?: (shipmentId: string, itemId: string, isGrading: boolean) => Promise<void>;
  onUploadShipmentPhotos?: (shipmentId: string, cartId: string, photos: File[]) => Promise<void>;
}
