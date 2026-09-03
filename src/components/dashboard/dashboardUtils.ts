import { OggettoMagazzino } from "../../types";

export interface DashboardProps {
  onNavigate: (tab: string) => void;
  userRole?: string;
}

export interface DashboardStats {
  valoreVenditaMagazzino: number;
  valoreCostoMagazzino: number;
  utile: number;
  forecastEntrate: number;
  topPerformers: OggettoMagazzino[];
  deadStock: OggettoMagazzino[];
  itemSalesCount: Record<string, number>;
  itemRevenue: Record<string, number>;
  cartStats: {
    totaleCarrelli: number;
    carrelliAperti: number;
    totaleOggettiAcquistati: number;
    mediaOggettiPerCarrello: number;
    spesaTotaleCarrelli: number;
    spesaMediaPerCarrello: number;
  };
}

export interface MonthlyFinancialPoint {
  name: string;
  dataObj: Date;
  Entrate: number;
  Uscite: number;
  Utile: number;
}

export const formatCurrency = (val?: number | string | null) => {
  const num = typeof val === "number" && !isNaN(val) ? val : Number(val) || 0;
  return `€${num.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const calculateROI = (cost?: number | string | null, price?: number | string | null) => {
  const c = typeof cost === "number" && !isNaN(cost) ? cost : Number(cost) || 0;
  const p = typeof price === "number" && !isNaN(price) ? price : Number(price) || 0;
  if (c === 0) return "100";
  return (((p - c) / c) * 100).toFixed(0);
};
