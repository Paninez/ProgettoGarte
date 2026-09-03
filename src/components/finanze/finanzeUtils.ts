import { Finanza } from "../../types";

export interface FinanzeProps {
  onAddTransaction?: (transaction: Finanza) => Promise<void>;
}

export type TabType = "Tutti" | "Entrata" | "Uscita";

export const formatDate = (dateString: string) => {
  if (!dateString) return "-";
  try {
    const [year, month, day] = dateString.split("-");
    if (year && month && day) {
      return `${day.padStart(2, "0")}/${month.padStart(2, "0")}/${year}`;
    }
    return dateString;
  } catch {
    return dateString;
  }
};
