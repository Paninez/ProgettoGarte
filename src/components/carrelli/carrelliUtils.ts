import {
  Carrello,
  DettaglioCarrello,
  GradingItem,
  CustomerLoyalty
} from "../../types";

export function getDirectImageUrl(url: string): string {
  if (!url) return "";
  const trimmed = url.trim();
  if (trimmed.startsWith("blob:") || trimmed.startsWith("data:")) {
    return trimmed;
  }
  if (trimmed.includes("drive.google.com")) {
    let fileId = "";
    const fileDMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (fileDMatch && fileDMatch[1]) {
      fileId = fileDMatch[1];
    } else {
      const idParamMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (idParamMatch && idParamMatch[1]) {
        fileId = idParamMatch[1];
      }
    }
    if (fileId) {
      return `https://lh3.googleusercontent.com/d/${fileId}`;
    }
  }
  return trimmed;
}

export interface CarrelliProps {
  onSaveCart: (
    cart: Carrello,
    items: Omit<DettaglioCarrello, "ID_Carrello">[],
    gradingItems?: GradingItem[]
  ) => Promise<void>;
  onUpdateCartHeader?: (
    updatedCart: Carrello,
    silent?: boolean
  ) => Promise<void>;
  onBatchSaveCarts?: (
    updates: {
      cart: Carrello;
      items: Omit<DettaglioCarrello, "ID_Carrello">[];
      gradingItems?: GradingItem[];
    }[]
  ) => Promise<void>;
  onProceedToShipment: (
    cartId: string,
    shipmentType: string,
    tracking: string,
    selectedIndexes: number[],
    selectedGradingIds?: string[],
    photos?: File[],
    shippingCost?: number,
    activeCartItems?: Omit<DettaglioCarrello, "ID_Carrello">[],
    activeGradingItems?: GradingItem[]
  ) => Promise<void>;
  onUpdateShipmentStatus: (shipmentId: string, cartId: string, newStatus: string) => Promise<void>;
  onDeleteCart?: (cartId: string) => Promise<void>;
  showClosedOnly?: boolean;
  userRole?: "owner" | "moderatore" | "utente";
  onUploadPhoto: (file: File, folderType?: string, customName?: string, subFolderName?: string) => Promise<string>;
  onUpdateCard?: (cardId: string, updates: Partial<GradingItem>) => Promise<void>;
  selectedCartId?: string | null;
  onSelectCartId?: (id: string | null) => void;
  onSelectClosedCartId?: (id: string | null) => void;
  onSelectLiveCartId?: (id: string | null) => void;
  onNavigate?: (tab: string) => void;
  token?: string | null;
  addSafetyLog?: (msg: string) => void;
  onUpdateCartPayment?: (cartId: string, addedAmount: number, transactionNote?: string) => Promise<void>;
  loyaltyProfiles?: CustomerLoyalty[];
}

export const getCartItemPaidStates = (
  cartDettagli: DettaglioCarrello[],
  cartGrading: GradingItem[],
  cartTotalePagato?: number
) => {
  const items = [
    ...cartDettagli.map((d) => ({
      type: "dettaglio" as const,
      ref: d,
      price: d.Prezzo_Registrato || 0,
      pagatoSingolarmente: !!d.Pagato_Singolarmente,
      accontoPagato: d.Acconto_Pagato || 0,
      isPaid: !!d.Pagato_Singolarmente,
    })),
    ...cartGrading.map((g) => ({
      type: "grading" as const,
      ref: g,
      price: g.Costo_Cliente || 0,
      pagatoSingolarmente: !!g.Pagato_Singolarmente,
      accontoPagato: g.Acconto_Pagato || 0,
      isPaid: !!g.Pagato_Singolarmente,
    })),
  ];

  let accontoPool = cartTotalePagato !== undefined ? cartTotalePagato : items.reduce(
    (sum, item) => sum + (!item.pagatoSingolarmente ? item.accontoPagato : 0),
    0
  );

  items.forEach((item) => {
    if (!item.isPaid && item.price > 0 && item.accontoPagato >= item.price) {
      item.isPaid = true;
      accontoPool -= item.price;
    }
  });

  items.forEach((item) => {
    if (!item.isPaid && item.price > 0 && accontoPool >= item.price) {
      item.isPaid = true;
      accontoPool -= item.price;
    }
  });

  return items;
};
