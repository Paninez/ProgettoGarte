import { Spedizioni } from "./components/Spedizioni";
import { useGoogleDriveSync } from "./hooks/useGoogleDriveSync";
import React, { useState, useEffect, useCallback } from "react";
import { DatabaseContext } from "./context/DatabaseContext";
import { useMagazzinoSync } from "./hooks/useMagazzinoSync";
import { useCarrelliSync } from "./hooks/useCarrelliSync";
import { useSpedizioniSync } from "./hooks/useSpedizioniSync";
import { useDriveUpload } from "./hooks/useDriveUpload";
import { useGradingSync } from "./hooks/useGradingSync";
import { Sidebar } from "./components/common/Sidebar";
import { MobileHeader } from "./components/common/MobileHeader";
import { MobileMenu } from "./components/common/MobileMenu";
import { SettingsModal } from "./components/common/SettingsModal";
import { EnvironmentBanner } from "./components/common/EnvironmentBanner";
import { LoadingScreen } from "./components/common/LoadingScreen";
import { LoginScreen } from "./components/common/LoginScreen";
import { PermissionErrorScreen } from "./components/common/PermissionErrorScreen";
import { ErrorBoundary } from "./components/common/ErrorBoundary";
import { useFinanzeSync } from "./hooks/useFinanzeSync";
import { useSicurezzaSync } from "./hooks/useSicurezzaSync";
import { validateAndSanitizeDataset, verifyBackupIntegrity } from "./lib/dataValidation";
import { User } from "firebase/auth";
import {
  initAuth,
  googleSignIn,
  cancelSignIn,
  clearSession,
  logout
} from "./lib/firebase";
import {
  createDatabaseSpreadsheet,
  fetchSheetRows,
  fetchSheetRowsBatch,
  appendSheetRow,
  appendSheetRows,
  updateSheetRow,
  updateSheetRows,
  clearSheetRange,
  deleteSheetRow,
  rowToOggetto,
  rowToCarrello,
  rowToDettaglio,
  rowToSpedizione,
  rowToFinanza,
  findOrCreateDriveFolder,
  uploadImageToDrive,
  createProjectFolderStructure,
  moveFileToFolder,
  uploadBackupToDriveFolder,
  listBackupsFromDrive,
  downloadBackupFromDrive,
  deleteRowByID,
  getFileMetadata,
  ProjectFolders,
  rowToUtenteRegistrato,
  ensureUtentiRegistratiSheet,
  rowToGradingGroup,
  rowToGradingItem,
  rowToListinoGradingItem,
  ensureGradingSheets,
  appendAuditLogToDriveQueue,
  findFolder,
  createFolder,
  patchOldHeaders,
  getSheetIds,
  fetchWithRetry
} from "./lib/googleApi";
import { logDbChange, FieldDiff } from "./lib/dbAuditLogger";
import {
  OggettoMagazzino,
  Carrello,
  DettaglioCarrello,
  Spedizione,
  Finanza,
  Operatore,
  UtenteRegistrato,
  GradingGroup,
  GradingItem,
  ListinoGradingItem,
  CustomerLoyalty,
  CustomerLoyaltyHistory,
  LoyaltyConfig
} from "./types";
import {
  processCustomerLoyaltyFromCarts,
  DEFAULT_LOYALTY_CONFIG,
  calculateLevelFromXP,
  calculateXPForLevel
} from "./lib/loyaltyEngine";
import Dashboard from "./components/Dashboard";
import Magazzino from "./components/Magazzino";
import Carrelli from "./components/Carrelli";
import Finanze from "./components/Finanze";
import { Sicurezza } from "./components/sicurezza/Sicurezza";
import GradingDashboard from "./components/GradingDashboard";
import { LoyaltyDashboard } from "./components/LoyaltyDashboard";
import { ThemeToggle } from "./components/ThemeToggle";
import { RestorePreviewModal } from "./components/common/RestorePreviewModal";
import { AuthHeartbeat } from "./components/common/AuthHeartbeat";
import {
  Layers,
  LogOut,
  FolderOpen,
  User as UserIcon,
  RefreshCw,
  TrendingUp,
  Package,
  ShoppingCart,
  Database,
  ArrowRight,
  Menu,
  X,
  Archive,
  AlertTriangle, HardDrive, Save,
  FileDown,
  FileUp,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Lock,
  ExternalLink,
  Trash2,
  Award,
  Crown
} from "lucide-react";

// Setup queue processing on window to persist across hot reloads




export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Environment (PROD vs DEV) state
  const [isProd, setIsProd] = useState<boolean>(() => {
    const raw = localStorage.getItem("APP_ENV_PROD");
    return raw ? JSON.parse(raw) : true;
  });

  // 1. Partitioned Storage: DATABASE_STORAGE_STORE (Spreadsheet ID config)
  const [spreadsheetId, setSpreadsheetId] = useState<string>(() => {
    const rawEnv = localStorage.getItem("APP_ENV_PROD");
    const activeIsProd = rawEnv ? JSON.parse(rawEnv) : true;
    return activeIsProd 
      ? "1eLt7exq9KZ33UDuI5l6-hWK0CX88fieFWyHGVhm4o2k" 
      : "1MdN_8g5knPoNYORRbrrkwYnH1HOJ4hrvu5qCTNGEZcs";
  });

  // Google Drive folder structure state
  const [driveFolders, setDriveFolders] = useState<ProjectFolders | null>(() => {
    const rawEnv = localStorage.getItem("APP_ENV_PROD");
    const activeIsProd = rawEnv ? JSON.parse(rawEnv) : true;
    const suffix = activeIsProd ? "_PROD" : "_DEV";
    const rawFolders = localStorage.getItem(`DATABASE_FOLDERS_STORE${suffix}`);
    if (rawFolders) {
      try {
        const parsed = JSON.parse(rawFolders);
        const targetProjectRoot = activeIsProd 
          ? "19Zlvat9kyMK9fmfLRdobH8rA1gr5ALO7" 
          : "1ul4JbUkg3pNcClpEDQNzgwFq_mJnsDtW";
        if (parsed && parsed.projectId === targetProjectRoot) {
          return parsed;
        }
      } catch (e) {}
    }
    return null;
  });

  const [registeredUsers, setRegisteredUsers] = useState<UtenteRegistrato[]>([]);

  // Role based users Gmail configuration
  const [ownerEmail, setOwnerEmail] = useState(() => {
    const raw = localStorage.getItem("APP_STORAGE_CONFIG");
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        return parsed.ownerEmail || "tuccillostefano@gmail.com";
      } catch (e) {}
    }
    return "tuccillostefano@gmail.com";
  });

  const [gestore1Email, setGestore1Email] = useState(() => {
    const raw = localStorage.getItem("APP_STORAGE_CONFIG");
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        return parsed.gestore1Email || "gestore1@gmail.com";
      } catch (e) {}
    }
    return "gestore1@gmail.com";
  });

    const [customGlobalTags, setCustomGlobalTags] = useState<string[]>(() => {
    const raw = localStorage.getItem("APP_STORAGE_CONFIG");
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        return parsed.customGlobalTags || [];
      } catch {}
    }
    return [];
  });

  const [gestore2Email, setGestore2Email] = useState(() => {
    const raw = localStorage.getItem("APP_STORAGE_CONFIG");
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        return parsed.gestore2Email || "gestore2@gmail.com";
      } catch (e) {}
    }
    return "gestore2@gmail.com";
  });

  // Calculate userRole dynamically based on signed in user
  const userRole = React.useMemo(() => {
    if (!user || !user.email) return "utente";
    
    const email = (user.email || "").toLowerCase().trim();
    const ownerEmailConfigured = (ownerEmail || "").toLowerCase().trim();
    const isOwner = email === "tuccillostefano@gmail.com" || (ownerEmailConfigured !== "" && email === ownerEmailConfigured);
    
    console.log("[AUTH DEBUG] Evaluating UserRole:");
    console.log(" -> Raw User Email:", user.email);
    console.log(" -> Cleaned User Email:", email);
    console.log(" -> Configured Owner Email (Clean):", ownerEmailConfigured);
    console.log(" -> Is Match (tuccillostefano@gmail.com or OwnerConfig):", isOwner);

    if (isOwner) return "owner";
    
    // Controlla gli utenti registrati dinamici nel foglio
    const found = (registeredUsers || []).find((u) => (u?.Email || "").toLowerCase().trim() === email);
    if (found) {
      console.log(`[AUTH DEBUG] Dynamic User matched: ${found.Email} -> ${found.Ruolo}`);
      return found.Ruolo;
    }

    if (gestore1Email && email === gestore1Email.toLowerCase().trim()) return "moderatore";
    if (gestore2Email && email === gestore2Email.toLowerCase().trim()) return "moderatore";
    return "utente";
  }, [user, ownerEmail, registeredUsers, gestore1Email, gestore2Email]);

  // Security self-test states
  const [safetyLogs, setSafetyLogs] = useState<string[]>([]);

  // DB States
  const [magazzino, setMagazzino] = useState<OggettoMagazzino[]>([]);
  const [carrelli, setCarrelli] = useState<Carrello[]>([]);
  const [dettagli, setDettagli] = useState<DettaglioCarrello[]>([]);
  const [spedizioni, setSpedizioni] = useState<Spedizione[]>([]);
  const [finanze, setFinanze] = useState<Finanza[]>([]);
  const [gruppiGrading, setGruppiGrading] = useState<GradingGroup[]>([]);
  const [oggettiInGrading, setOggettiInGrading] = useState<GradingItem[]>([]);
  const [listinoGrading, setListinoGrading] = useState<ListinoGradingItem[]>([]);

  // Loyalty & Reputation States
  const [loyaltyConfig, setLoyaltyConfig] = useState<LoyaltyConfig>(() => {
    try {
      const saved = localStorage.getItem("DATABASE_LOYALTY_CONFIG_STORAGE");
      return saved ? JSON.parse(saved) : DEFAULT_LOYALTY_CONFIG;
    } catch {
      return DEFAULT_LOYALTY_CONFIG;
    }
  });

  const [loyaltyProfiles, setLoyaltyProfiles] = useState<CustomerLoyalty[]>(() => {
    try {
      const saved = localStorage.getItem("DATABASE_LOYALTY_PROFILES_STORAGE");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [loyaltyHistory, setLoyaltyHistory] = useState<CustomerLoyaltyHistory[]>(() => {
    try {
      const saved = localStorage.getItem("DATABASE_LOYALTY_HISTORY_STORAGE");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Keep refs of loyaltyProfiles and loyaltyHistory to avoid stale closures in useEffect without triggering infinite loops
  const loyaltyProfilesRef = React.useRef(loyaltyProfiles);
  const loyaltyHistoryRef = React.useRef(loyaltyHistory);

  useEffect(() => {
    loyaltyProfilesRef.current = loyaltyProfiles;
  }, [loyaltyProfiles]);

  useEffect(() => {
    loyaltyHistoryRef.current = loyaltyHistory;
  }, [loyaltyHistory]);

  // Automatically recalculate and synchronize customer loyalty profile metrics when carrelli/dettagli change
  useEffect(() => {
    if (carrelli.length === 0) return;
    const { profiles, historyLogs } = processCustomerLoyaltyFromCarts(
      carrelli,
      dettagli,
      loyaltyConfig,
      loyaltyProfilesRef.current,
      loyaltyHistoryRef.current
    );

    setLoyaltyProfiles(profiles);
    localStorage.setItem("DATABASE_LOYALTY_PROFILES_STORAGE", JSON.stringify(profiles));

    if (historyLogs.length > loyaltyHistoryRef.current.length) {
      setLoyaltyHistory(historyLogs);
      localStorage.setItem("DATABASE_LOYALTY_HISTORY_STORAGE", JSON.stringify(historyLogs));
    }
  }, [carrelli, dettagli, loyaltyConfig]);

  const handleGrantManualXP = (customerId: string, xpAmount: number, tokensAmount: number, reason: string) => {
    const existingProfile = loyaltyProfiles.find((p) => p.customerId === customerId);
    const prevXP = existingProfile ? existingProfile.xp : 0;
    const prevTier = existingProfile ? existingProfile.tier : "Bronzo";

    setLoyaltyProfiles((prevProfiles) => {
      const updated = prevProfiles.map((p) => {
        if (p.customerId === customerId) {
          const newXP = p.xp + xpAmount;
          const newTokens = p.collectorTokens + tokensAmount;
          const newLevel = calculateLevelFromXP(newXP);
          const nextTierXP = calculateXPForLevel(newLevel + 1);

          return {
            ...p,
            xp: newXP,
            collectorTokens: newTokens,
            level: newLevel,
            nextTierXP,
            updatedAt: new Date().toISOString()
          };
        }
        return p;
      });
      localStorage.setItem("DATABASE_LOYALTY_PROFILES_STORAGE", JSON.stringify(updated));
      return updated;
    });

    const newXP = prevXP + xpAmount;

    const newLog: CustomerLoyaltyHistory = {
      id: `HIST-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      customerId,
      xpEarned: xpAmount,
      tokensEarned: tokensAmount,
      previousXP: prevXP,
      newXP: newXP,
      previousTier: prevTier as any,
      newTier: prevTier as any,
      reason: reason || "Rettifica manuale admin",
      createdAt: new Date().toISOString()
    };

    setLoyaltyHistory((prev) => {
      const updated = [newLog, ...prev];
      localStorage.setItem("DATABASE_LOYALTY_HISTORY_STORAGE", JSON.stringify(updated));
      return updated;
    });

    addSafetyLog(`Assegnati manualmente ${xpAmount} XP e ${tokensAmount} Tokens al cliente ID ${customerId}.`);
  };

  const handleUpdateLoyaltyProfile = (updatedProfile: CustomerLoyalty) => {
    setLoyaltyProfiles((prev) => {
      const exists = prev.some((p) => p.customerId === updatedProfile.customerId);
      let updated;
      if (exists) {
        updated = prev.map((p) => p.customerId === updatedProfile.customerId ? updatedProfile : p);
      } else {
        updated = [...prev, updatedProfile];
      }
      localStorage.setItem("DATABASE_LOYALTY_PROFILES_STORAGE", JSON.stringify(updated));
      return updated;
    });
    addSafetyLog(`Aggiornato profilo loyalty del cliente ${updatedProfile.customerName} (Lvl ${updatedProfile.level}, Tier ${updatedProfile.tier}, Gestito: ${updatedProfile.isManuallyManaged ? 'SI' : 'NO'}).`);
  };

  // 2. Partitioned Storage: APP_STORAGE_CONFIG (Application State config)
  const [activeTab, setActiveTab] = useState(() => {
    const appConf = localStorage.getItem("APP_STORAGE_CONFIG");
    if (appConf) {
      try {
        const parsed = JSON.parse(appConf);
        return parsed.activeTab || "dashboard";
      } catch (e) {}
    }
    return "dashboard";
  });

  const [selectedCartId, setSelectedCartId] = useState<string | null>(null);
  const [selectedClosedCartId, setSelectedClosedCartId] = useState<string | null>(null);

  const [currentOperatore, setCurrentOperatore] = useState<Operatore>(() => {
    const appConf = localStorage.getItem("APP_STORAGE_CONFIG");
    if (appConf) {
      try {
        const parsed = JSON.parse(appConf);
        return (parsed.currentOperatore as Operatore) || "Owner";
      } catch (e) {}
    }
    // Migrate old operator if exists
    const oldOp = localStorage.getItem("active_operator") as Operatore;
    if (oldOp) {
      localStorage.removeItem("active_operator");
      return oldOp;
    }
    return "Operatore 1";
  });

  // UI States
  const [dbLoading, setDbLoading] = useState(false);
  const [dbInitialized, setDbInitialized] = useState(false);
  const [dbPermissionError, setDbPermissionError] = useState<{
    type: "sheets" | "drive";
    message: string;
    resourceId: string;
  } | null>(null);
  const [dbInitializing, setDbInitializing] = useState(false);
  const [manualSheetId, setManualSheetId] = useState("");
  const [newRegEmail, setNewRegEmail] = useState("");
  const [newRegRole, setNewRegRole] = useState<"owner" | "moderatore" | "utente">("utente");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Cloud/Drive Backups and Custom confirmation states
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [restorePayload, setRestorePayload] = useState<any | null>(null);
  const [restoreFileName, setRestoreFileName] = useState("");
  const [restoreIsCloud, setRestoreIsCloud] = useState(false);
  const [driveBackups, setDriveBackups] = useState<any[]>([]);
  const [driveBackupsLoading, setDriveBackupsLoading] = useState(false);
  const [spreadsheetMetadata, setSpreadsheetMetadata] = useState<any | null>(null);
  const [spreadsheetMetadataLoading, setSpreadsheetMetadataLoading] = useState(false);

  // 3. Partitioned Storage: DATABASE_BACKUPS_STORAGE (Backup states)
  const [backups, setBackups] = useState<any[]>(() => {
    const raw = localStorage.getItem("DATABASE_BACKUPS_STORAGE");
    return raw ? JSON.parse(raw) : [];
  });

  // Initialize Auth
  useEffect(() => {
    // Safety watchdog timeout so mobile browsers or slow networks never stay stuck on authLoading
    const safetyTimer = setTimeout(() => {
      setAuthLoading(false);
    }, 3500);

    const unsubscribe = initAuth(
      (currentUser, accessToken) => {
        clearTimeout(safetyTimer);
        const email = currentUser.email?.toLowerCase().trim() || "";
        const isOwner = email === "tuccillostefano@gmail.com" || email === ownerEmail.toLowerCase().trim();
        
        if (!isProd && !isOwner) {
          // Force switch back to PROD for non-owners
          handleToggleEnvironment(true);
          setUser(currentUser);
          setToken(accessToken);
          setNeedsAuth(false);
          setAuthLoading(false);
          setIsLoggingIn(false);
          setLoginError("Accesso DEV consentito solo all'owner del progetto. Reindirizzato in PRODUZIONE.");
          return;
        }

        setUser(currentUser);
        setToken(accessToken);
        setNeedsAuth(false);
        setAuthLoading(false);
        setIsLoggingIn(false);
        setLoginError(null);
      },
      () => {
        clearTimeout(safetyTimer);
        setUser(null);
        setToken(null);
        setNeedsAuth(true);
        setAuthLoading(false);
        setIsLoggingIn(false);
      }
    );
    return () => {
      clearTimeout(safetyTimer);
      unsubscribe();
    };
  }, [isProd, ownerEmail]);

  useEffect(() => {
    const handleAuthExpired = () => {
      console.warn("Google Auth expired, forcing logout...");
      logout().then(() => {
        setUser(null);
        setToken(null);
        setNeedsAuth(true);
      });
    };
    window.addEventListener("google-auth-expired", handleAuthExpired);
    return () => window.removeEventListener("google-auth-expired", handleAuthExpired);
  }, []);

  // Auto-assign currentOperatore based on the logged-in email
  useEffect(() => {
    if (user && user.email) {
      const email = (user.email || "").toLowerCase().trim();
      const cleanOwner = (ownerEmail || "").toLowerCase().trim();
      const cleanG1 = (gestore1Email || "").toLowerCase().trim();
      const cleanG2 = (gestore2Email || "").toLowerCase().trim();

      if (email === "tuccillostefano@gmail.com" || (cleanOwner !== "" && email === cleanOwner)) {
        setCurrentOperatore("Owner");
      } else if (cleanG1 !== "" && email === cleanG1) {
        setCurrentOperatore("Operatore 1");
      } else if (cleanG2 !== "" && email === cleanG2) {
        setCurrentOperatore("Operatore 2");
      } else {
        // Fallback for unrecognized guest emails
        setCurrentOperatore("Operatore 3");
      }
    }
  }, [user, ownerEmail, gestore1Email, gestore2Email]);

  const addSafetyLog = useCallback((message: string) => {
    const now = new Date();
    const time = now.toLocaleTimeString("it-IT");
    const dateStr = now.toLocaleDateString("it-IT");
    const fullLogLine = `[${dateStr} ${time}] [Op: ${currentOperatore}] [User: ${user?.email || "N/A"}] ${message}`;
    
    setSafetyLogs((prev) => [`[${time}] ${message}`, ...prev.slice(0, 49)]);
    
    if (token && driveFolders?.backupId) {
      appendAuditLogToDriveQueue(token, driveFolders.backupId, fullLogLine);
    }
  }, [currentOperatore, user?.email, token, driveFolders?.backupId]);

  // Sync APP_STORAGE_CONFIG partition on activeTab, currentOperatore or emails change
  useEffect(() => {
    const rawConf = localStorage.getItem("APP_STORAGE_CONFIG");
    let currentConf = {
      currentOperatore: "Owner",
      activeTab: "dashboard",
      lastBackupHourTimestamp: 0,
      lastBackupDayTimestamp: 0,
      alternateHourSlot: false,
      ownerEmail: "tuccillostefano@gmail.com",
      gestore1Email: "gestore1@gmail.com",
      gestore2Email: "gestore2@gmail.com",
      customGlobalTags: []
    };
    if (rawConf) {
      try {
        currentConf = { ...currentConf, ...JSON.parse(rawConf) };
      } catch (err) {
        // fallback
      }
    }
    currentConf.activeTab = activeTab;
    currentConf.currentOperatore = currentOperatore;
    currentConf.ownerEmail = ownerEmail;
    currentConf.gestore1Email = gestore1Email;
    currentConf.gestore2Email = gestore2Email;
    currentConf.customGlobalTags = customGlobalTags;
    localStorage.setItem("APP_STORAGE_CONFIG", JSON.stringify(currentConf));
  }, [activeTab, currentOperatore, ownerEmail, gestore1Email, gestore2Email, customGlobalTags]);

  // Update DATABASE_STORAGE_STORE partition
  const handleUpdateSpreadsheetId = (id: string | null) => {
    const officialId = isProd 
      ? "1eLt7exq9KZ33UDuI5l6-hWK0CX88fieFWyHGVhm4o2k" 
      : "1MdN_8g5knPoNYORRbrrkwYnH1HOJ4hrvu5qCTNGEZcs";
    setSpreadsheetId(officialId);
  };

  // Update DATABASE_FOLDERS_STORE partition
  const handleUpdateDriveFolders = (folders: ProjectFolders | null) => {
    setDriveFolders(folders);
    const suffix = isProd ? "_PROD" : "_DEV";
    if (folders) {
      localStorage.setItem(`DATABASE_FOLDERS_STORE${suffix}`, JSON.stringify(folders));
      if (isProd) {
        localStorage.setItem("DATABASE_FOLDERS_STORE", JSON.stringify(folders));
      }
    } else {
      localStorage.removeItem(`DATABASE_FOLDERS_STORE${suffix}`);
      if (isProd) {
        localStorage.removeItem("DATABASE_FOLDERS_STORE");
      }
    }
  };

  // Toggle environment and load the corresponding data structures
  const handleToggleEnvironment = (newIsProd: boolean) => {
    setIsProd(newIsProd);
    localStorage.setItem("APP_ENV_PROD", JSON.stringify(newIsProd));
    
    // Always force the official default spreadsheet ID
    const targetSheetId = newIsProd 
      ? "1eLt7exq9KZ33UDuI5l6-hWK0CX88fieFWyHGVhm4o2k" 
      : "1MdN_8g5knPoNYORRbrrkwYnH1HOJ4hrvu5qCTNGEZcs";
    setSpreadsheetId(targetSheetId);

    // Load folder ids and validate that they belong to the official project root folder
    const suffix = newIsProd ? "_PROD" : "_DEV";
    let targetFolders: any = null;
    const rawFolders = localStorage.getItem(`DATABASE_FOLDERS_STORE${suffix}`);
    if (rawFolders) {
      try {
        const parsed = JSON.parse(rawFolders);
        const targetProjectRoot = newIsProd 
          ? "19Zlvat9kyMK9fmfLRdobH8rA1gr5ALO7" 
          : "1ul4JbUkg3pNcClpEDQNzgwFq_mJnsDtW";
        if (parsed && parsed.projectId === targetProjectRoot) {
          targetFolders = parsed;
        }
      } catch (e) {}
    }
    setDriveFolders(targetFolders);

    // Add visual sync log
    const time = new Date().toLocaleTimeString("it-IT");
    setSafetyLogs((prev) => [
      `[${time}] Switch dell'ambiente: ${newIsProd ? "PRODUZIONE (PROD)" : "SVILUPPO (DEV)"}`,
      ...prev.slice(0, 49)
    ]);
  };

  // Backup Engine helpers
  const createBackup = async (
    type: "giornaliero" | "orario_1" | "orario_2" | "manuale",
    label: string,
    customData?: any
  ) => {
    const rawBackup = customData || {
      magazzino,
      carrelli,
      dettagli,
      spedizioni,
      finanze,
      gruppiGrading,
      oggettiInGrading,
      listinoGrading,
      utentiRegistrati: registeredUsers,
      customTags: customGlobalTags,
      loyaltyConfig,
      loyaltyProfiles,
      loyaltyHistory
    };

    if (!rawBackup.config) {
      rawBackup.config = {
        ownerEmail,
        gestore1Email,
        gestore2Email,
        paidShipmentsReminders: (() => {
          try {
            const saved = localStorage.getItem("paid_shipments_reminders");
            return saved ? JSON.parse(saved) : {};
          } catch { return {}; }
        })(),
        whatsappPreference: localStorage.getItem("whatsapp_preference") || "direct",
        theme: localStorage.getItem("app-theme") || "light",
        processedPaypalEmails: (() => {
          try {
            const saved = localStorage.getItem("processed_gmail_paypal_ids");
            return saved ? JSON.parse(saved) : [];
          } catch { return []; }
        })()
      };
    }

    const backupData = validateAndSanitizeDataset(rawBackup);

    const totalRecords = 
      backupData.magazzino.length + 
      backupData.carrelli.length + 
      backupData.dettagli.length +
      backupData.spedizioni.length +
      backupData.finanze.length +
      backupData.gruppiGrading.length +
      backupData.oggettiInGrading.length +
      (backupData.loyaltyProfiles?.length || 0);

    if (totalRecords === 0) {
      return;
    }

    const backupIdStr = `BACKUP-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const newBackup = {
      id: backupIdStr,
      timestamp: Date.now(),
      type,
      label,
      data: backupData,
    };

    setBackups((prev) => {
      let updatedList;
      if (type === "manuale") {
        // Keep other types, and keep manual/emergency ones up to a limit (e.g., 10)
        const manualBackups = prev.filter((b) => b.type === "manuale");
        const otherBackups = prev.filter((b) => b.type !== "manuale");
        
        // Keep the newest 9 manual backups, then add the new one at the beginning
        const slicedManuals = manualBackups.slice(0, 9);
        updatedList = [newBackup, ...slicedManuals, ...otherBackups];
      } else {
        // For other slot-based types, we overwrite the slot
        let filtered = prev.filter((b) => b.type !== type);
        updatedList = [newBackup, ...filtered];
      }
      localStorage.setItem("DATABASE_BACKUPS_STORAGE", JSON.stringify(updatedList));
      return updatedList;
    });

    // Also upload to Google Drive backup folder if connected
    if (token && driveFolders?.backupId) {
      try {
        const cleanLabel = label.replace(/\s+/g, "_").toLowerCase();
        const filename = `${cleanLabel}_${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
        await uploadBackupToDriveFolder(token, driveFolders.backupId, filename, backupData);
        addSafetyLog(`Backup automatico '${label}' salvato su Google Drive (Tavole Backup).`);
      } catch (err: any) {
        if (err?.name === "AuthExpiredError" || err?.message?.includes("Autenticazione scaduta")) {
          console.warn("Salvataggio backup su Google Drive fallito:", err.message);
        } else {
          console.error("Salvataggio backup su Google Drive fallito:", err);
        }
        addSafetyLog(`ERRORE: Salvataggio backup '${label}' su Drive fallito: ${err.message}`);
      }
    }
  };

  const checkAndTriggerAutoBackups = (loadedData: any) => {
    if (!isProd) {
      return; // Skip automatic backup triggers in DEV environment
    }
    const rawConf = localStorage.getItem("APP_STORAGE_CONFIG");
    let currentConf = {
      currentOperatore: currentOperatore,
      activeTab: activeTab,
      lastBackupHourTimestamp: 0,
      lastBackupDayTimestamp: 0,
      alternateHourSlot: false
    };
    if (rawConf) {
      try { currentConf = JSON.parse(rawConf); } catch {}
    }

    const now = Date.now();
    let updated = false;

    // Hourly backup policy check (3600000ms = 1 hour)
    if (now - currentConf.lastBackupHourTimestamp > 3600000) {
      const nextSlot = currentConf.alternateHourSlot ? "orario_2" : "orario_1";
      const slotLabel = nextSlot === "orario_1" ? "Backup Orario (Slot A)" : "Backup Orario (Slot B)";
      
      createBackup(nextSlot, slotLabel, loadedData);
      
      currentConf.lastBackupHourTimestamp = now;
      currentConf.alternateHourSlot = !currentConf.alternateHourSlot;
      updated = true;
    }

    // Daily backup policy check (86400000ms = 24 hours)
    if (now - currentConf.lastBackupDayTimestamp > 86400000) {
      createBackup("giornaliero", "Backup Giornaliero", loadedData);
      currentConf.lastBackupDayTimestamp = now;
      updated = true;
    }

    if (updated) {
      localStorage.setItem("APP_STORAGE_CONFIG", JSON.stringify(currentConf));
    }
  };

  // Restore DB from Backup data with integrity verification & automatic pre-restore safety snapshot
  const handleRestoreBackup = async (backupData: any) => {
    console.log("[handleRestoreBackup] Avvio ripristino backup...");
    console.log("[handleRestoreBackup] Stato attuale - spreadsheetId:", spreadsheetId, "token presente:", !!token);

    if (!spreadsheetId || !token) {
      console.warn("[handleRestoreBackup] Interrotto: spreadsheetId o token mancanti.");
      alert("Collega prima un database Google Sheet.");
      return;
    }

    console.log("[handleRestoreBackup] Verifica integrità backup...");
    const integrity = verifyBackupIntegrity(backupData);
    console.log("[handleRestoreBackup] Risultato integrità:", { valid: integrity.valid, errors: integrity.errors, stats: integrity.stats });

    const sanitized = integrity.sanitized || validateAndSanitizeDataset(backupData);
    console.log("[handleRestoreBackup] Dati sanitizzati pronti:", {
      magazzino: sanitized.magazzino?.length || 0,
      carrelli: sanitized.carrelli?.length || 0,
      dettagli: sanitized.dettagli?.length || 0,
      spedizioni: sanitized.spedizioni?.length || 0,
      finanze: sanitized.finanze?.length || 0,
      gruppiGrading: sanitized.gruppiGrading?.length || 0,
      oggettiInGrading: sanitized.oggettiInGrading?.length || 0,
      listinoGrading: sanitized.listinoGrading?.length || 0,
      utentiRegistrati: sanitized.utentiRegistrati?.length || 0,
    });

    setDbLoading(true);
    try {
      // Ensure all sheet/tables exist before clearing/writing to avoid API errors
      await ensureUtentiRegistratiSheet(spreadsheetId, token);
      await ensureGradingSheets(spreadsheetId, token);

      // 0. Automatic Pre-Destructive Emergency Snapshot
      let snapshotData: any = null;
      try {
        console.log("[handleRestoreBackup] Tentativo di fetch dei dati live per lo snapshot d'emergenza...");
        const ranges = [
          "Magazzino!A2:V",
          "Clienti_Carrelli!A2:L",
          "Dettaglio_Carrello!A2:H",
          "Logistica_Spedizioni!A2:M",
          "Finanze!A2:E",
          "Utenti_Registrati!A2:C",
          "Gruppi_Grading!A2:E",
          "Oggetti_In_Grading!A2:P",
          "Listino_Grading!A2:C"
        ];
        const batchResults = await fetchSheetRowsBatch(spreadsheetId, ranges, token);
        const liveMag = (batchResults[0] || []).map(rowToOggetto).filter((o) => o.ID_Oggetto !== "");
        const liveCar = (batchResults[1] || []).map(rowToCarrello).filter((c) => c.ID_Carrello !== "");
        const liveDet = (batchResults[2] || []).map(rowToDettaglio).filter((d) => d.ID_Carrello !== "");
        const liveSpe = (batchResults[3] || []).map(rowToSpedizione).filter((s) => s.ID_Spedizione !== "");
        const liveFin = (batchResults[4] || []).map(rowToFinanza).filter((f) => f.Data !== "");
        const liveUtenti = (batchResults[5] || []).map(rowToUtenteRegistrato).filter((u) => u.Email !== "");
        const liveGruppi = (batchResults[6] || []).map(rowToGradingGroup).filter((g) => g.ID_Gruppo_Grading !== "");
        const liveGrading = (batchResults[7] || []).map(rowToGradingItem).filter((item) => item.ID_Oggetto_Grading !== "");
        const liveListino = (batchResults[8] || []).map(rowToListinoGradingItem).filter((item) => item.Tipologia_Servizio !== "");

        if (liveMag.length > 0 || liveCar.length > 0) {
          snapshotData = {
            magazzino: liveMag,
            carrelli: liveCar,
            dettagli: liveDet,
            spedizioni: liveSpe,
            finanze: liveFin,
            gruppiGrading: liveGruppi,
            oggettiInGrading: liveGrading,
            listinoGrading: liveListino,
            utentiRegistrati: liveUtenti,
            customTags: customGlobalTags
          };
          console.log("[handleRestoreBackup] Dati live recuperati con successo per lo snapshot.");
        }
      } catch (e: any) {
        console.warn("[handleRestoreBackup] Errore nel recupero dei dati live per lo snapshot, uso i dati dello stato locale:", e);
      }

      if (snapshotData) {
        await createBackup("manuale", "EMERGENZA Pre-Ripristino Snapshot", snapshotData);
        addSafetyLog("Snapshot d'emergenza pre-ripristino creato con successo (da dati live Google Sheet).");
      } else if (magazzino.length > 0 || carrelli.length > 0) {
        await createBackup("manuale", "EMERGENZA Pre-Ripristino Snapshot");
        addSafetyLog("Snapshot d'emergenza pre-ripristino creato con successo (da stato locale).");
      }

      // 1. Restore Magazzino
      if (sanitized.magazzino) {
        await clearSheetRange(spreadsheetId, "Magazzino!A2:V5000", token);
        const magRows = sanitized.magazzino.map((m: any) => [
          m.ID_Oggetto,
          m.Nome,
          m.Quantità_Disponibile,
          m.Costo_Acquisto,
          m.Prezzo_Vendita,
          m.Is_Preordine ? "TRUE" : "FALSE",
          m.Acconto_Pagato || 0,
          m.Data_Arrivo_Prevista || "",
          m.Stato_Preordine || "",
          m.Is_Carta_Singola ? "TRUE" : "FALSE",
          m.Espansione || "",
          m.Rarità || "",
          m.Condizione || "",
          m.Lingua || "",
          m.Gradata ? "TRUE" : "FALSE",
          m.Archiviata ? "TRUE" : "FALSE",
          m.Storico_Costi || "",
          m.Costo_Spedizione_Lotto || 0,
          m.Costo_Dogana_Lotto || 0,
          m.Costo_Accessori_Lotto || 0,
          m.Data_Spedizione_Presunta || "",
          m.Tag || ""
        ]);
        if (magRows.length > 0) {
          await updateSheetRows(spreadsheetId, `Magazzino!A2:V${magRows.length + 1}`, magRows, token);
        }
      }

      // 2. Restore Clienti_Carrelli
      if (sanitized.carrelli) {
        await clearSheetRange(spreadsheetId, "Clienti_Carrelli!A2:L5000", token);
        const carRows = sanitized.carrelli.map((c: any) => [
          c.ID_Carrello,
          c.Nome_Cliente,
          c.Stato_Carrello,
          c.Totale_Pagato,
          c.Telefono || "",
          c.Email || "",
          c.Indirizzo_Spedizione || "",
          c.Tag || "",
          c.Strike || 0,
          c.Cattivo_Data || "",
          c.Note || "",
          c.Data_Ultimo_Messaggio || ""
        ]);
        if (carRows.length > 0) {
          await updateSheetRows(spreadsheetId, `Clienti_Carrelli!A2:L${carRows.length + 1}`, carRows, token);
        }
      }

      // 3. Restore Dettaglio_Carrello
      if (sanitized.dettagli) {
        await clearSheetRange(spreadsheetId, "Dettaglio_Carrello!A2:H5000", token);
        const detRows = sanitized.dettagli.map((d: any) => [
          d.ID_Carrello,
          d.ID_Oggetto,
          d.Pagato_Singolarmente ? "TRUE" : "FALSE",
          d.Prezzo_Registrato,
          d.Pagamento_Posticipato ? "TRUE" : "FALSE",
          d.Acconto_Pagato || 0,
          d.ID_Spedizione || "",
        d.Reso ? "TRUE" : "FALSE"
        ]);
        if (detRows.length > 0) {
          await updateSheetRows(spreadsheetId, `Dettaglio_Carrello!A2:H${detRows.length + 1}`, detRows, token);
        }
      }

      // 4. Restore Logistica_Spedizioni
      if (sanitized.spedizioni) {
        await clearSheetRange(spreadsheetId, "Logistica_Spedizioni!A2:M5000", token);
        const speRows = sanitized.spedizioni.map((s: any) => [
          s.ID_Spedizione,
          s.ID_Carrello,
          s.Link_Foto_Oggetti,
          s.Data_Spedizione,
          s.Tracking || "",
          s.Stato_Consegna,
          s.Oggetti_Spediti || s.Nomi_Oggetti || "",
          s.Nome_Cliente || "",
          s.Indirizzo_Spedizione || "",
          s.Telefono || "",
          s.Tag || "",
          s.Corriere || "",
          s.Costo_Spedizione || 0
        ]);
        if (speRows.length > 0) {
          await updateSheetRows(spreadsheetId, `Logistica_Spedizioni!A2:M${speRows.length + 1}`, speRows, token);
        }
      }

      // 5. Restore Finanze
      if (sanitized.finanze) {
        await clearSheetRange(spreadsheetId, "Finanze!A2:E5000", token);
        const finRows = sanitized.finanze.map((f: any) => [
          f.Data,
          f.Tipo,
          f.Importo,
          f.Categoria,
          f.Note || f.Descrizione || ""
        ]);
        if (finRows.length > 0) {
          await updateSheetRows(spreadsheetId, `Finanze!A2:E${finRows.length + 1}`, finRows, token);
        }
      }

      // 6. Restore Gruppi Grading
      if (sanitized.gruppiGrading) {
        await clearSheetRange(spreadsheetId, "Gruppi_Grading!A2:E5000", token);
        const gruppiRows = sanitized.gruppiGrading.map((g: any) => [
          g.ID_Gruppo_Grading,
          g.Nome_Gruppo,
          g.Compagnia || "",
          g.Data_Creazione,
          g.Stato_Gruppo
        ]);
        if (gruppiRows.length > 0) {
          await updateSheetRows(spreadsheetId, `Gruppi_Grading!A2:E${gruppiRows.length + 1}`, gruppiRows, token);
        }
      }

      // 7. Restore Oggetti In Grading
      if (sanitized.oggettiInGrading) {
        await clearSheetRange(spreadsheetId, "Oggetti_In_Grading!A2:P5000", token);
        const oggettiGradingRows = sanitized.oggettiInGrading.map((o: any) => [
          o.ID_Oggetto_Grading || "",
          o.ID_Carrello || "",
          o.Nome_Carta || o.Nome_Oggetto || "",
          o.Tipologia_Servizio || (o as any).Compagnia_Grading || "",
          o.Costo_Cliente !== undefined ? o.Costo_Cliente : 0,
          o.Costo_Acquisto !== undefined ? o.Costo_Acquisto : 0,
          o.Margine_Lordo !== undefined ? o.Margine_Lordo : 0,
          o.Link_Foto || "",
          o.Pagato_Singolarmente ? "TRUE" : "FALSE",
          o.ID_Gruppo_Grading || "",
          o.Link_Foto_Ritornata || "",
          o.Metodo_Consegna || "",
          o.Pagamento_Posticipato ? "TRUE" : "FALSE",
          o.Acconto_Pagato || 0,
          o.ID_Spedizione || "",
          o.Reso ? "TRUE" : "FALSE"
        ]);
        if (oggettiGradingRows.length > 0) {
          await updateSheetRows(spreadsheetId, `Oggetti_In_Grading!A2:P${oggettiGradingRows.length + 1}`, oggettiGradingRows, token);
        }
      }
      
      // 8. Restore Listino Grading
      if (sanitized.listinoGrading) {
        await clearSheetRange(spreadsheetId, "Listino_Grading!A2:C100", token);
        const listinoRows = sanitized.listinoGrading.map((l: any) => [
          l.Tipologia_Servizio,
          l.Costo_Cliente,
          l.Costo_Acquisto
        ]);
        if (listinoRows.length > 0) {
          await updateSheetRows(spreadsheetId, `Listino_Grading!A2:C${listinoRows.length + 1}`, listinoRows, token);
        }
      }

      // 9. Restore Utenti Registrati
      if (sanitized.utentiRegistrati) {
        await clearSheetRange(spreadsheetId, "Utenti_Registrati!A2:C1000", token);
        const utentiRows = sanitized.utentiRegistrati.map((u: any) => [
          u.Email,
          u.Ruolo,
          u.Data_Registrazione || new Date().toISOString().split("T")[0]
        ]);
        if (utentiRows.length > 0) {
          await updateSheetRows(spreadsheetId, `Utenti_Registrati!A2:C${utentiRows.length + 1}`, utentiRows, token);
        }
      }

      // 10. Restore Custom Global Tags
      if (sanitized.customTags) {
        setCustomGlobalTags(sanitized.customTags);
      }

      // 10b. Restore Loyalty Data
      if (sanitized.loyaltyConfig) {
        setLoyaltyConfig(sanitized.loyaltyConfig);
        localStorage.setItem("DATABASE_LOYALTY_CONFIG_STORAGE", JSON.stringify(sanitized.loyaltyConfig));
      }
      if (sanitized.loyaltyProfiles) {
        setLoyaltyProfiles(sanitized.loyaltyProfiles);
        localStorage.setItem("DATABASE_LOYALTY_PROFILES_STORAGE", JSON.stringify(sanitized.loyaltyProfiles));
      }
      if (sanitized.loyaltyHistory) {
        setLoyaltyHistory(sanitized.loyaltyHistory);
        localStorage.setItem("DATABASE_LOYALTY_HISTORY_STORAGE", JSON.stringify(sanitized.loyaltyHistory));
      }

      // 11. Restore Local Configuration Settings if present in the backup
      if (sanitized.config) {
        const conf = sanitized.config;
        if (conf.ownerEmail) {
          setOwnerEmail(conf.ownerEmail);
        }
        if (conf.gestore1Email) {
          setGestore1Email(conf.gestore1Email);
        }
        if (conf.gestore2Email) {
          setGestore2Email(conf.gestore2Email);
        }
        if (conf.paidShipmentsReminders) {
          try {
            localStorage.setItem("paid_shipments_reminders", JSON.stringify(conf.paidShipmentsReminders));
          } catch (e) {}
        }
        if (conf.whatsappPreference) {
          localStorage.setItem("whatsapp_preference", conf.whatsappPreference);
        }
        if (conf.theme) {
          localStorage.setItem("app-theme", conf.theme);
        }
        if (conf.processedPaypalEmails) {
          try {
            localStorage.setItem("processed_gmail_paypal_ids", JSON.stringify(conf.processedPaypalEmails));
          } catch (e) {}
        }

        // Keep APP_STORAGE_CONFIG in sync in localStorage
        try {
          const rawConf = localStorage.getItem("APP_STORAGE_CONFIG");
          let currentConf = rawConf ? JSON.parse(rawConf) : {};
          if (conf.ownerEmail) currentConf.ownerEmail = conf.ownerEmail;
          if (conf.gestore1Email) currentConf.gestore1Email = conf.gestore1Email;
          if (conf.gestore2Email) currentConf.gestore2Email = conf.gestore2Email;
          if (sanitized.customTags) currentConf.customGlobalTags = sanitized.customTags;
          localStorage.setItem("APP_STORAGE_CONFIG", JSON.stringify(currentConf));
        } catch (e) {}
      }

      alert("Backup ripristinato con successo! L'applicazione verrà ricaricata per applicare tutte le modifiche.");
      window.location.reload();
    } catch (err: any) {
      alert("Errore durante il ripristino del backup: " + err.message);
    } finally {
      setDbLoading(false);
    }
  };

  const handleManualBackup = () => {
    const totalRecords = 
      magazzino.length + 
      carrelli.length + 
      dettagli.length +
      spedizioni.length +
      finanze.length +
      gruppiGrading.length +
      oggettiInGrading.length +
      loyaltyProfiles.length;

    if (totalRecords === 0) {
      alert("Nessun dato caricato da salvare nel backup.");
      return;
    }
    createBackup("manuale", "Backup Manuale");
  };

  const handleExportFullLiveJson = () => {
    const liveDataset = validateAndSanitizeDataset({
      magazzino,
      carrelli,
      dettagli,
      spedizioni,
      finanze,
      gruppiGrading,
      oggettiInGrading,
      listinoGrading,
      utentiRegistrati: registeredUsers,
      customTags: customGlobalTags,
      loyaltyConfig,
      loyaltyProfiles,
      loyaltyHistory,
      config: {
        ownerEmail,
        gestore1Email,
        gestore2Email,
        paidShipmentsReminders: (() => {
          try {
            const saved = localStorage.getItem("paid_shipments_reminders");
            return saved ? JSON.parse(saved) : {};
          } catch { return {}; }
        })(),
        whatsappPreference: localStorage.getItem("whatsapp_preference") || "direct",
        theme: localStorage.getItem("app-theme") || "light",
        processedPaypalEmails: (() => {
          try {
            const saved = localStorage.getItem("processed_gmail_paypal_ids");
            return saved ? JSON.parse(saved) : [];
          } catch { return []; }
        })()
      }
    });

    const exportWrapper = {
      app: "ManagerHub",
      environment: isProd ? "PROD" : "DEV",
      timestamp: Date.now(),
      dateISO: new Date().toISOString(),
      operator: currentOperatore,
      data: liveDataset
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportWrapper, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `managerhub_backup_${isProd ? "PROD" : "DEV"}_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleExportBackup = (backup: any) => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backup.data, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${backup.type}_backup_${new Date(backup.timestamp).toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      console.log("[handleImportBackup] Nessun file selezionato.");
      return;
    }

    console.log(`[handleImportBackup] File selezionato per l'importazione: "${file.name}" (${file.size} byte)`);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        console.log("[handleImportBackup] FileReader ha completato il caricamento del file.");
        const resultString = event.target?.result as string;
        console.log("[handleImportBackup] Primi 250 caratteri del file caricato:", resultString.substring(0, 250));

        const parsed = JSON.parse(resultString);
        console.log("[handleImportBackup] Parsing JSON riuscito. Struttura chiavi principali:", Object.keys(parsed));

        console.log("[handleImportBackup] Apertura anteprima ripristino...");
        setRestorePayload(parsed);
        setRestoreFileName(file.name);
        setRestoreIsCloud(false);
        setIsRestoreModalOpen(true);
      } catch (err: any) {
        if (err?.name === "AuthExpiredError" || err?.message?.includes("Autenticazione scaduta")) {
          console.warn("[handleImportBackup] Errore critico nel processo di importazione:", err.message);
        } else {
          console.error("[handleImportBackup] Errore critico nel processo di importazione:", err);
        }
        alert("Errore nella lettura del file di backup: " + err.message);
      }
    };
    reader.onerror = (errorEvent) => {
      if (errorEvent?.target?.error?.name === "AuthExpiredError" || errorEvent?.target?.error?.message?.includes("Autenticazione scaduta")) {
        console.warn("[handleImportBackup] FileReader ha riscontrato un errore:", errorEvent?.target?.error?.message);
      } else {
        console.error("[handleImportBackup] FileReader ha riscontrato un errore:", errorEvent);
      }
    };
    reader.readAsText(file);
    e.target.value = ""; 
  };

  const handleRestoreCloudBackup = async (fileId: string, fileName: string) => {
    if (!token) {
      alert("Collega prima il database Google Sheet per scaricare i backup.");
      return;
    }

    setDbLoading(true);
    try {
      addSafetyLog(`Avvio scaricamento backup Cloud per anteprima: ${fileName}`);
      const parsed = await downloadBackupFromDrive(token, fileId);
      console.log("[handleRestoreCloudBackup] Scaricamento completato. Apertura anteprima ripristino...");
      setRestorePayload(parsed);
      setRestoreFileName(fileName);
      setRestoreIsCloud(true);
      setIsRestoreModalOpen(true);
    } catch (err: any) {
      alert("Errore durante lo scaricamento del backup da Cloud: " + err.message);
    } finally {
      setDbLoading(false);
    }
  };

  // HardDrive operator choice
  const handleOperatorChange = (op: Operatore) => {
    setCurrentOperatore(op);
  };

  const handleCancelLogin = () => {
    cancelSignIn();
    setIsLoggingIn(false);
    setLoginError("Tentativo di accesso annullato. Tocca 'Accedi con Google' per riprovare.");
  };

  // Login handler
  const handleLogin = async () => {
    setIsLoggingIn(true);
    setLoginError(null);
    try {
      const result = await googleSignIn();
      if (result) {
        const email = result.user.email?.toLowerCase().trim() || "";
        const isOwner = email === "tuccillostefano@gmail.com" || email === ownerEmail.toLowerCase().trim();
        
        if (!isProd && !isOwner) {
          await logout();
          setUser(null);
          setToken(null);
          setNeedsAuth(true);
          setIsLoggingIn(false);
          setLoginError("Accesso all'ambiente di SVILUPPO (DEV) consentito solo all'owner del progetto.");
          return;
        }
        
        setUser(result.user);
        setToken(result.accessToken);
        setNeedsAuth(false);
        setIsLoggingIn(false);
        setLoginError(null);
      }
    } catch (err: any) {
      const errStr = (err?.code || "") + " " + (err?.message || "") + " " + String(err);
      
      if (err?.code !== "auth/popup-closed-by-user" && err?.code !== "auth/cancelled-popup-request") {
        if (err?.name === "AuthExpiredError" || err?.message?.includes("Autenticazione scaduta")) {
          console.warn("Errore di login:", err.message);
        } else {
          console.error("Errore di login:", err);
        }
      }
      
      if (errStr.includes("popup-closed-by-user") || errStr.includes("cancelled-popup-request")) {
        setLoginError("Finestra di accesso Google chiusa prima di completare il login. Se la finestra non compare, apri l'app in una nuova scheda.");
      } else if (err?.code === "auth/popup-timeout" || errStr.includes("popup-timeout")) {
        setLoginError("Il popup di accesso Google ha impiegato troppo tempo o è stato bloccato dal browser dello smartphone. Tocca 'Apri in Nuova Scheda' qui sotto per accedere comodamente.");
      } else if (errStr.includes("network-request-failed") || errStr.includes("popup-blocked") || errStr.includes("auth/network-request-failed")) {
        setLoginError("Popup bloccato dal browser mobile o restrizione iFrame. Tocca 'Apri in Nuova Scheda' qui sotto per accedere senza restrizioni.");
      } else {
        setLoginError("Errore di autenticazione (" + (err.message || err.code || "blocco popup") + "). Apri l'app in una Nuova Scheda per accedere senza restrizioni.");
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Logout handler
  const handleLogout = async () => {
    await logout();
    setUser(null);
    setToken(null);
    setNeedsAuth(true);
    const officialId = isProd 
      ? "1eLt7exq9KZ33UDuI5l6-hWK0CX88fieFWyHGVhm4o2k" 
      : "1MdN_8g5knPoNYORRbrrkwYnH1HOJ4hrvu5qCTNGEZcs";
    handleUpdateSpreadsheetId(officialId);
  };

  // Load Database from Sheets
  const handleLoadDatabase = async (overrideId?: string, background: boolean = false) => {
    let rawId = (overrideId || spreadsheetId || "").trim();
    if (rawId.includes("/d/")) {
      const match = rawId.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (match) rawId = match[1];
    }
    const activeId = rawId;
    if (!activeId || !token) {
      console.warn("[DEBUG] [handleLoadDatabase] Abortito: activeId o token mancanti.");
      return;
    }

    console.log(`[DEBUG] [handleLoadDatabase] Inizio caricamento database. activeId: "${activeId}", background: ${background}`);
    if (!background) {
      setDbLoading(true);
      setDbInitialized(false);
    }
    try {
      const win = (typeof window !== "undefined" ? window : {}) as any;

      const ranges = [
        "Magazzino!A2:V",
        "Clienti_Carrelli!A2:L",
        "Dettaglio_Carrello!A2:H",
        "Logistica_Spedizioni!A2:M",
        "Finanze!A2:E",
        "Utenti_Registrati!A2:C",
        "Gruppi_Grading!A2:E",
        "Oggetti_In_Grading!A2:P",
        "Listino_Grading!A2:C",
        "Clienti_Carrelli!A1:Z1" // Added for headers patch
      ];

      let batchResults: any[][][] = [];
      try {
        batchResults = await fetchSheetRowsBatch(activeId, ranges, token);
      } catch (err: any) {
        console.warn("[DEBUG] fetchSheetRowsBatch fallito, forse mancano schede. Tento di crearle...", err);
        const mapping = await getSheetIds(activeId, token);
        const missingSheets: string[] = [];
        if (mapping["Utenti_Registrati"] === undefined) missingSheets.push("Utenti_Registrati");
        if (mapping["Gruppi_Grading"] === undefined) missingSheets.push("Gruppi_Grading");
        if (mapping["Oggetti_In_Grading"] === undefined) missingSheets.push("Oggetti_In_Grading");
        if (mapping["Listino_Grading"] === undefined) missingSheets.push("Listino_Grading");
        
        if (missingSheets.length > 0) {
          const requests = missingSheets.map(title => ({ addSheet: { properties: { title } } }));
          const res = await fetchWithRetry(`https://sheets.googleapis.com/v4/spreadsheets/${activeId}:batchUpdate`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ requests }),
          });
          if (!res.ok) throw new Error("Creazione schede mancanti fallita");
        }
        
        // Riprova il fetch dopo aver creato le schede
        batchResults = await fetchSheetRowsBatch(activeId, ranges, token);
      }

      const magazzinoRows = batchResults[0] || [];
      const carrelliRows = batchResults[1] || [];
      const dettaglioRows = batchResults[2] || [];
      const spedizioneRows = batchResults[3] || [];
      const finanzaRows = batchResults[4] || [];
      const utentiRows = batchResults[5] || [];
      const gruppiGradingRows = batchResults[6] || [];
      const oggettiInGradingRows = batchResults[7] || [];
      const listinoGradingRows = batchResults[8] || [];
      const ccHeaders = batchResults[9] || [];
      
      // Patch old headers offline using the prefetched header range (NON bloccante)
      patchOldHeaders(activeId, token, ccHeaders).catch(e => console.error("patchOldHeaders background error:", e));

      const loadedMag = magazzinoRows.map(rowToOggetto).filter((o) => o.ID_Oggetto !== "");
            const loadedCarRaw = carrelliRows.map(rowToCarrello).filter((c) => c.ID_Carrello !== "");
      // Deduplica carrelli
      const carrelliMap = new Map<string, Carrello>();
      loadedCarRaw.forEach(c => {
        if (!carrelliMap.has(c.ID_Carrello)) {
          carrelliMap.set(c.ID_Carrello, c);
        } else {
          // Usa il più recente o tieni il primo. Teniamo il primo.
        }
      });
      const loadedCar = Array.from(carrelliMap.values());
            const loadedDet = dettaglioRows.map(rowToDettaglio).filter((d) => d.ID_Carrello !== "");
      const loadedSpe = spedizioneRows.map(rowToSpedizione).filter((s) => s.ID_Spedizione !== "");
      const loadedFin = finanzaRows.map(rowToFinanza).filter((f) => f.Data !== "");
      const loadedUtenti = utentiRows.map(rowToUtenteRegistrato).filter((u) => u.Email !== "");
      const loadedGruppiGrading = gruppiGradingRows.map(rowToGradingGroup).filter((g) => g.ID_Gruppo_Grading !== "");
            const loadedGradingRaw = oggettiInGradingRows.map(rowToGradingItem).filter((item) => item.ID_Oggetto_Grading !== "");
      const gradMap = new Map<string, GradingItem>();
      loadedGradingRaw.forEach(g => {
        if (!gradMap.has(g.ID_Oggetto_Grading)) gradMap.set(g.ID_Oggetto_Grading, g);
      });
      const loadedOggettiInGrading = Array.from(gradMap.values());
      const loadedListinoGrading = listinoGradingRows.map(rowToListinoGradingItem).filter((item) => item.Tipologia_Servizio !== "");

      console.log("[DEBUG] [handleLoadDatabase] Scrittura stati React...");
      setMagazzino(loadedMag);
      setCarrelli((prev) => {
        const pending = (window as any).pendingCarrelliUpdates;
        if (!pending || pending.size === 0) {
          return loadedCar;
        }
        return loadedCar.map((c) => {
          const p = pending.get(c.ID_Carrello);
          if (p) {
            let matches = true;
            for (const key of Object.keys(p) as Array<keyof Carrello>) {
              if (String(c[key]) !== String(p[key])) {
                matches = false;
                break;
              }
            }
            if (matches) {
              console.log(`[DEBUG] Sheet in sync for cart ${c.ID_Carrello}, clearing pending.`);
              pending.delete(c.ID_Carrello);
              return c;
            }
            console.log(`[DEBUG] Preserving optimistic update for cart ${c.ID_Carrello}:`, p);
            return { ...c, ...p };
          }
          return c;
        });
      });
      setDettagli(loadedDet);
      setSpedizioni((prev) => {
        const pending = (window as any).pendingSpedizioniUpdates;
        if (!pending || pending.size === 0) {
          return loadedSpe;
        }
        return loadedSpe.map((s) => {
          const p = pending.get(s.ID_Spedizione);
          if (p) {
            let matches = true;
            for (const key of Object.keys(p) as Array<keyof Spedizione>) {
              if (String(s[key]) !== String(p[key])) {
                matches = false;
                break;
              }
            }
            if (matches) {
              console.log(`[DEBUG] Sheet in sync for shipment ${s.ID_Spedizione}, clearing pending.`);
              pending.delete(s.ID_Spedizione);
              return s;
            }
            console.log(`[DEBUG] Preserving optimistic update for shipment ${s.ID_Spedizione}:`, p);
            return { ...s, ...p };
          }
          return s;
        });
      });
      setFinanze(loadedFin);
      setRegisteredUsers(loadedUtenti);
      setGruppiGrading(loadedGruppiGrading);
      setOggettiInGrading(loadedOggettiInGrading);
      setListinoGrading(loadedListinoGrading);
      setDbInitialized(true);
      console.log("[DEBUG] [handleLoadDatabase] Stati React aggiornati con successo.");

      // Trigger automatic backup policy evaluation
      checkAndTriggerAutoBackups({
        magazzino: loadedMag,
        carrelli: loadedCar,
        dettagli: loadedDet,
        spedizioni: loadedSpe,
        finanze: loadedFin,
        gruppiGrading: loadedGruppiGrading,
        oggettiInGrading: loadedOggettiInGrading,
        listinoGrading: loadedListinoGrading,
        utentiRegistrati: loadedUtenti
      });

    } catch (err: any) {
      if (err?.name === "AuthExpiredError" || err?.message?.includes("Autenticazione scaduta")) {
        console.warn("[DEBUG] [handleLoadDatabase] ERRORE durante il caricamento del database:", err.message);
      } else {
        console.error("[DEBUG] [handleLoadDatabase] ERRORE durante il caricamento del database:", err);
      }
      if (err.message?.includes("403") || err.message?.includes("404")) {
        setDbPermissionError({
          type: "sheets",
          message: err.message || "",
          resourceId: activeId || ""
        });
      } else if (err.message?.toLowerCase().includes("failed to fetch")) {
        alert("Errore di connessione (Failed to fetch). Cause: " + (err.cause ? err.cause.toString() : "Sconosciuta") + " | Stack: " + (err.stack ? err.stack.substring(0, 100) : "Nessuno") + "\n\nPossibili cause: Adblocker, CORS, o permessi mancanti.");
      } else {
        alert("Errore nel caricamento dei dati: " + err.message);
      }
    } finally {
      setDbLoading(false);
    }
  };

  // Reload trigger
  useEffect(() => {
    if (user && token && spreadsheetId) {
      handleLoadDatabase();
    }
  }, [user, token, spreadsheetId]);

  // Sync Google Drive folders automatically on login / startup if not already loaded or mismatched
  useEffect(() => {
    const targetProjectRoot = isProd 
      ? "19Zlvat9kyMK9fmfLRdobH8rA1gr5ALO7" 
      : "1ul4JbUkg3pNcClpEDQNzgwFq_mJnsDtW";
    if (token && (!driveFolders || driveFolders.projectId !== targetProjectRoot)) {
      createProjectFolderStructure(token, isProd)
        .then((folders) => {
          handleUpdateDriveFolders(folders);
          addSafetyLog(`Struttura cartelle 'Progetto Gestionale' [${isProd ? "PROD" : "DEV"}] agganciata su Google Drive.`);
          setDbPermissionError(null);
        })
        .catch((err: any) => {
          if (err?.name === "AuthExpiredError" || err?.message?.includes("Autenticazione scaduta")) {
            console.warn("Errore sincronizzazione cartelle Drive:", err.message);
          } else {
            console.error("Errore sincronizzazione cartelle Drive:", err);
          }
          if (err.message?.includes("403") || err.message?.includes("404") || err.message?.includes("Accesso negato")) {
            setDbPermissionError({
              type: "drive",
              message: err.message || "",
              resourceId: targetProjectRoot
            });
          } else {
            setDbPermissionError({
              type: "drive",
              message: err.message || "Errore sconosciuto",
              resourceId: targetProjectRoot
            });
          }
        });
    }
  }, [token, driveFolders, isProd]);

  // Removed force sheet ID useEffect to allow custom sheets and new sheet creations

  // Fetch active Google Sheet metadata and automatically organize/move it if it's outside Tavole Live
  const {
    fetchSpreadsheetMetadata,
    fetchDriveBackups,
    handleCreateNewDatabase,
    handleConnectExistingDatabase
  } = useGoogleDriveSync({
    token,
    spreadsheetId,
    isProd,
    driveFolders,
    userRole,
    manualSheetId,
    setManualSheetId,
    handleUpdateDriveFolders,
    handleUpdateSpreadsheetId,
    addSafetyLog,
    setSpreadsheetMetadata,
    setSpreadsheetMetadataLoading,
    setDriveBackups,
    setDriveBackupsLoading,
    setDbInitializing
  });

  // Load spreadsheet metadata and auto-organize on startup or folder load
  useEffect(() => {
    if (token && spreadsheetId && driveFolders) {
      fetchSpreadsheetMetadata();
    }
  }, [token, spreadsheetId, driveFolders, fetchSpreadsheetMetadata]);

  // Fetch Drive backups when settings modal opens
  useEffect(() => {
    if (isSettingsOpen && token && driveFolders?.backupId) {
      fetchDriveBackups();
    }
  }, [isSettingsOpen, token, driveFolders, fetchDriveBackups]);

  const handleNavigateToCart = React.useCallback((cartId: string) => {
    setSelectedCartId(cartId);
    setActiveTab("carrelli");
  }, []);

  const handleUpdateLoyaltyConfig = React.useCallback((newConfig: any) => {
    setLoyaltyConfig(newConfig);
    localStorage.setItem("DATABASE_LOYALTY_CONFIG_STORAGE", JSON.stringify(newConfig));
  }, []); // removed setLoyaltyConfig dependency since it's a state setter and stable

  const databaseContextValue = React.useMemo(() => ({
    magazzino, setMagazzino,
    carrelli, setCarrelli,
    dettagli, setDettagli,
    spedizioni, setSpedizioni,
    finanze, setFinanze,
    gruppiGrading, setGruppiGrading,
    oggettiInGrading, setOggettiInGrading,
    listinoGrading, setListinoGrading,
    customGlobalTags, setCustomGlobalTags,
    loyaltyProfiles, setLoyaltyProfiles,
    loyaltyHistory, setLoyaltyHistory,
    loyaltyConfig, setLoyaltyConfig,
    registeredUsers, setRegisteredUsers,
    spreadsheetId, token, driveFolders, dbLoading, setDbLoading, addSafetyLog, isProd, handleUpdateDriveFolders, ownerEmail,
    user, setSafetyLogs, handleLoadDatabase, dbInitialized,
    currentOperatore,
    userRole
  }), [
    magazzino, carrelli, dettagli, spedizioni, finanze, gruppiGrading, 
    oggettiInGrading, listinoGrading, customGlobalTags, loyaltyProfiles, 
    loyaltyHistory, loyaltyConfig, registeredUsers, spreadsheetId, token, 
    driveFolders, dbLoading, isProd, ownerEmail, user, dbInitialized, 
    currentOperatore, userRole, addSafetyLog, handleLoadDatabase, handleUpdateDriveFolders
  ]);

  // BACKEND / ACTIONS IMPLEMENTATIONS

  // Add Item to warehouse
  // RENDER SECTIONS

  // 1. Splash / Loading Screen
  if (authLoading) {
    return (
      <LoadingScreen
        onCancel={() => {
          setAuthLoading(false);
          setNeedsAuth(true);
        }}
      />
    );
  }

  // 2. Authentication Barrier
  if (needsAuth) {
    return (
      <ErrorBoundary>
        <LoginScreen 
          isProd={isProd}
          handleToggleEnvironment={handleToggleEnvironment}
          setLoginError={setLoginError}
          handleLogin={handleLogin}
          loginError={loginError}
          isLoggingIn={isLoggingIn}
          onCancelLogin={handleCancelLogin}
        />
      </ErrorBoundary>
    );
  }

  // 3. Permission Error Barrier (Official Cloud/Database Access Block)
  if (dbPermissionError) {
    return (
      <PermissionErrorScreen 
        isProd={isProd}
        dbPermissionError={dbPermissionError as any}
        user={user as any}
        spreadsheetId={spreadsheetId}
        setDbPermissionError={setDbPermissionError}
        handleToggleEnvironment={handleToggleEnvironment}
        handleLoadDatabase={handleLoadDatabase}
        handleLogout={handleLogout}
      />
    );
  }

  // 4. Main Application Dashboard
  return (
    <DatabaseContext.Provider value={databaseContextValue}>
      <HooksWrapper>
        {({
    handleAddRegisteredUser,
    handleDeleteRegisteredUser,
    handleUpdateRegisteredUserRole,
    runSecuritySelfTests,
    testsRunning,
    testResults,
    handleProceedToShipment,
    handleUpdateShipmentStatus,
    handleReturnItem,
    handleUploadShipmentPhotos,
    handleUpdateShipmentCost,
    handleUpdateShipmentTag,
    handleUploadPhoto,
    handleDeleteCart,
    handleBatchSaveCarts,
    handleSaveCart,
    handleUpdateCartHeader,
    handleUpdateCartPayment,
    handleAddItem,
    handleRestockItem,
    handleEditItem,
    handleBulkUpdateDates,
    handleDeleteItem,
    handleSettlePreorder,
    handleDistributeItemToCarts,
    handleSaveGradingGroup,
    handleAssignCardsToGroup,
    handleUpdateGradingCard,
    handleSaveListino,
    handleAddTransaction
  }: any) => (
          <>
    <AuthHeartbeat
      user={user}
      onTokenRefreshed={(refreshedToken) => {
        setToken(refreshedToken);
      }}
      onSessionExpired={() => {
        handleLogout();
      }}
    />
    <div className="min-h-[100dvh] bg-slate-50/70 flex flex-col text-slate-900 font-sans">
      <EnvironmentBanner isProd={isProd} />
      <div className="flex flex-1 min-h-0 min-w-0">
        {/* SIDEBAR FOR DESKTOP */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        userRole={userRole} 
        user={user} 
        currentOperatore={currentOperatore as string} 
        handleLogout={handleLogout} 
      />

           {/* MOBILE HEADER */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <MobileHeader 
          userRole={userRole} 
          user={user} 
          currentOperatore={currentOperatore as string} 
          activeTab={activeTab} 
        />

        <MobileMenu 
          isSidebarOpen={isSidebarOpen} 
          setIsSidebarOpen={setIsSidebarOpen} 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          dbLoading={dbLoading} 
          handleLoadDatabase={handleLoadDatabase} 
          setIsSettingsOpen={setIsSettingsOpen} 
          userRole={userRole}
          user={user}
          currentOperatore={currentOperatore as string}
          handleLogout={handleLogout}
        />
        {/* MAIN BODY AREA */}
        <main className="flex-1 scroll-container p-3.5 pb-[calc(5rem+env(safe-area-inset-bottom))] sm:p-6 md:p-8 md:pb-8 space-y-6 lg:pb-8">
          {/* Dynamic views based on navigation tab */}
          {dbLoading && magazzino.length === 0 ? (
            <div className="py-24 text-center space-y-3">
              <RefreshCw className="h-8 w-8 text-indigo-600 animate-spin mx-auto" />
              <p className="text-sm font-semibold text-gray-600">Sincronizzazione dei dati con Google Sheets...</p>
            </div>
          ) : (
            <>
              {activeTab === "dashboard" && (
                <Dashboard onNavigate={setActiveTab} />
              )}

              {activeTab === "magazzino" && (
                <React.Profiler id="MagazzinoComponent" onRender={(id, phase, actualDuration, baseDuration) => {
                  console.log(`[Profiler] ${id} - ${phase} | Actual: ${actualDuration.toFixed(2)}ms | Base: ${baseDuration.toFixed(2)}ms`);
                }}>
                  <Magazzino
                    onAddItem={handleAddItem}
                    onEditItem={handleEditItem}
                    onBulkUpdateDates={handleBulkUpdateDates}
                    onDeleteItem={handleDeleteItem}
                    onRestockItem={handleRestockItem}
                    onSettlePreorder={handleSettlePreorder}
                    onDistributeItemToCarts={handleDistributeItemToCarts}
                    loyaltyProfiles={loyaltyProfiles}
                  />
                </React.Profiler>
              )}

              {activeTab === "carrelli" && (
                <Carrelli onSaveCart={handleSaveCart} onUpdateCartHeader={handleUpdateCartHeader} onBatchSaveCarts={handleBatchSaveCarts} onProceedToShipment={handleProceedToShipment} onUpdateShipmentStatus={handleUpdateShipmentStatus} onDeleteCart={handleDeleteCart} onUploadPhoto={handleUploadPhoto} onUpdateCard={handleUpdateGradingCard} selectedCartId={selectedCartId} onSelectCartId={setSelectedCartId} onSelectClosedCartId={setSelectedClosedCartId} onSelectLiveCartId={setSelectedCartId} onNavigate={setActiveTab} token={token} addSafetyLog={addSafetyLog} onUpdateCartPayment={handleUpdateCartPayment} loyaltyProfiles={loyaltyProfiles} />
              )}

              {activeTab === "spedizioni" && (
                <Spedizioni onUpdateShipmentStatus={handleUpdateShipmentStatus} onUpdateShipmentTag={handleUpdateShipmentTag} onUpdateShipmentCost={handleUpdateShipmentCost} onNavigateToCart={handleNavigateToCart} onSaveCart={handleSaveCart} onReturnItem={handleReturnItem} onUploadShipmentPhotos={handleUploadShipmentPhotos} />
              )}
              {activeTab === "grading" && (
                <GradingDashboard onSaveGroup={handleSaveGradingGroup} onAssignCards={handleAssignCardsToGroup} onUpdateCard={handleUpdateGradingCard} onUploadPhoto={handleUploadPhoto} onSaveListino={handleSaveListino} />
              )}

              {activeTab === "finanze" && (
                <Finanze onAddTransaction={handleAddTransaction} />
              )}

              {activeTab === "loyalty" && (
                <LoyaltyDashboard onUpdateConfig={handleUpdateLoyaltyConfig} onGrantManualXP={handleGrantManualXP} onUpdateProfile={handleUpdateLoyaltyProfile} addSafetyLog={addSafetyLog} />
              )}

              {activeTab === "sicurezza" && (
                <Sicurezza spreadsheetId={spreadsheetId} isProd={isProd} user={user} dbLoading={dbLoading} setIsSettingsOpen={setIsSettingsOpen} handleLoadDatabase={handleLoadDatabase} runSecuritySelfTests={runSecuritySelfTests} testsRunning={testsRunning} newRegEmail={newRegEmail} setNewRegEmail={setNewRegEmail} newRegRole={newRegRole} setNewRegRole={setNewRegRole} handleAddRegisteredUser={handleAddRegisteredUser} handleDeleteRegisteredUser={handleDeleteRegisteredUser} handleUpdateRegisteredUserRole={handleUpdateRegisteredUserRole} ownerEmail={ownerEmail} safetyLogs={safetyLogs} testResults={testResults} token={token} backupFolderId={driveFolders?.backupId} />
              )}
            </>
          )}
        </main>
      </div>
    </div>

    {/* SETTINGS AND BACKUPS MODAL OVERLAY */}
      <SettingsModal 
        isSettingsOpen={isSettingsOpen} 
        setIsSettingsOpen={setIsSettingsOpen} 
        driveFolders={driveFolders} 
        createBackup={createBackup} 
        handleExportFullLiveJson={handleExportFullLiveJson} 
        handleImportBackup={handleImportBackup} 
        fetchDriveBackups={fetchDriveBackups} 
        driveBackupsLoading={driveBackupsLoading} 
        driveBackups={driveBackups} 
        handleRestoreCloudBackup={handleRestoreCloudBackup} 
        dbLoading={dbLoading} 
        userRole={userRole} 
        spreadsheetId={spreadsheetId} 
        setSpreadsheetId={setSpreadsheetId} 
        handleLoadDatabase={handleLoadDatabase} 
      />
      {/* Restore Preview Modal */}
      <RestorePreviewModal
        isOpen={isRestoreModalOpen}
        onClose={() => {
          setIsRestoreModalOpen(false);
          setRestorePayload(null);
          setRestoreFileName("");
          setRestoreIsCloud(false);
        }}
        onConfirm={async (data) => {
          setIsRestoreModalOpen(false);
          await handleRestoreBackup(data);
          setRestorePayload(null);
          setRestoreFileName("");
          setRestoreIsCloud(false);
        }}
        backupData={restorePayload}
        fileName={restoreFileName}
        isCloud={restoreIsCloud}
      />
    </div>
          </>
        )}
      </HooksWrapper>
    </DatabaseContext.Provider>
  );
}

function HooksWrapper({ children }: { children: (hooks: any) => React.ReactNode }) {
  const sicurezza = useSicurezzaSync();
  const spedizioni = useSpedizioniSync();
  const drive = useDriveUpload();
  const carrelli = useCarrelliSync();
  const magazzino = useMagazzinoSync();
  const grading = useGradingSync();
  const finanze = useFinanzeSync();
  
  return <>{children({
    ...sicurezza,
    ...spedizioni,
    ...drive,
    ...carrelli,
    ...magazzino,
    ...grading,
    ...finanze
  })}</>;
}
