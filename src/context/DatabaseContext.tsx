import React, { createContext, useContext, Dispatch, SetStateAction } from "react";
import { ProjectFolders } from "../lib/googleApi";
import { 
  OggettoMagazzino, Carrello, DettaglioCarrello, Spedizione, Finanza, 
  GradingGroup, GradingItem, ListinoGradingItem, Operatore, CustomerLoyalty, CustomerLoyaltyHistory, LoyaltyConfig, UtenteRegistrato 
} from "../types";

export interface DatabaseState {
  magazzino: OggettoMagazzino[];
  setMagazzino: Dispatch<SetStateAction<OggettoMagazzino[]>>;
  carrelli: Carrello[];
  setCarrelli: Dispatch<SetStateAction<Carrello[]>>;
  dettagli: DettaglioCarrello[];
  setDettagli: Dispatch<SetStateAction<DettaglioCarrello[]>>;
  spedizioni: Spedizione[];
  setSpedizioni: Dispatch<SetStateAction<Spedizione[]>>;
  finanze: Finanza[];
  setFinanze: Dispatch<SetStateAction<Finanza[]>>;
  gruppiGrading: GradingGroup[];
  setGruppiGrading: Dispatch<SetStateAction<GradingGroup[]>>;
  oggettiInGrading: GradingItem[];
  setOggettiInGrading: Dispatch<SetStateAction<GradingItem[]>>;
  listinoGrading: ListinoGradingItem[];
  setListinoGrading: Dispatch<SetStateAction<ListinoGradingItem[]>>;
  customGlobalTags: string[];
  setCustomGlobalTags: Dispatch<SetStateAction<string[]>>;
  loyaltyProfiles: CustomerLoyalty[];
  setLoyaltyProfiles: Dispatch<SetStateAction<CustomerLoyalty[]>>;
  loyaltyHistory: CustomerLoyaltyHistory[];
  setLoyaltyHistory: Dispatch<SetStateAction<CustomerLoyaltyHistory[]>>;
  loyaltyConfig: LoyaltyConfig;
  setLoyaltyConfig: Dispatch<SetStateAction<LoyaltyConfig>>;
  registeredUsers: UtenteRegistrato[];
  setRegisteredUsers: Dispatch<SetStateAction<UtenteRegistrato[]>>;
  spreadsheetId: string;
  token: string | null;
  driveFolders: ProjectFolders | null;
  dbLoading: boolean;
  setDbLoading: Dispatch<SetStateAction<boolean>>;
  user: any;
  setSafetyLogs: any;
  handleLoadDatabase: (overrideId?: string, background?: boolean) => Promise<void>;
  dbInitialized: boolean;
  addSafetyLog: (msg: string) => void;
  isProd: boolean;
  ownerEmail: string;
  handleUpdateDriveFolders: (folders: ProjectFolders | null) => void;
  currentOperatore: Operatore;
  userRole: "owner" | "moderatore" | "utente";
}

export const DatabaseContext = createContext<DatabaseState | undefined>(undefined);

export function useDatabase() {
  const context = useContext(DatabaseContext);
  if (context === undefined) {
    throw new Error("useDatabase must be used within a DatabaseProvider");
  }
  return context;
}
