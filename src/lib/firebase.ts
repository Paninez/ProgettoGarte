import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  signInWithPopup,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  browserPopupRedirectResolver,
  Unsubscribe
} from "firebase/auth";
import firebaseConfig from "../../firebase-applet-config.json";

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
// Request Google Sheets, Drive, Gmail, and Calendar scopes
provider.addScope("https://www.googleapis.com/auth/spreadsheets");
provider.addScope("https://www.googleapis.com/auth/drive.file");
provider.addScope("https://www.googleapis.com/auth/forms.body.readonly");
provider.addScope("https://www.googleapis.com/auth/forms.responses.readonly");
provider.addScope("https://www.googleapis.com/auth/gmail.readonly");
provider.addScope("https://www.googleapis.com/auth/gmail.modify");
provider.addScope("https://www.googleapis.com/auth/calendar.events");
provider.setCustomParameters({ prompt: "select_account" });

// Session storage keys for persistent authentication
export const SESSION_KEYS = {
  UID: "firebase_auth_user_uid",
  TOKEN: "firebase_cached_access_token",
  EXPIRY: "firebase_cached_access_token_expiry",
  USER: "firebase_auth_user_data",
} as const;

// Avoid standard re-entrant login issues
let isSigningIn = false;
let cachedAccessToken: string | null = null;

export interface StoredSession {
  uid: string;
  token: string;
  expiry: number;
  user?: Partial<User> | null;
}

/**
 * Checks whether the stored session in localStorage is currently valid and unexpired.
 */
export const isSessionValid = (): boolean => {
  try {
    const uid = localStorage.getItem(SESSION_KEYS.UID);
    const token = localStorage.getItem(SESSION_KEYS.TOKEN);
    const expiryStr = localStorage.getItem(SESSION_KEYS.EXPIRY);

    if (!uid || !token || !expiryStr) {
      return false;
    }

    const expiryTime = parseInt(expiryStr, 10);
    if (isNaN(expiryTime) || Date.now() >= expiryTime) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
};

/**
 * Retrieves the stored session if valid, otherwise clears any stale credentials.
 */
export const getStoredSession = (): StoredSession | null => {
  if (!isSessionValid()) {
    clearSession();
    return null;
  }

  try {
    const uid = localStorage.getItem(SESSION_KEYS.UID)!;
    const token = localStorage.getItem(SESSION_KEYS.TOKEN)!;
    const expiry = parseInt(localStorage.getItem(SESSION_KEYS.EXPIRY)!, 10);
    const rawUserData = localStorage.getItem(SESSION_KEYS.USER);
    const user = rawUserData ? JSON.parse(rawUserData) : null;

    cachedAccessToken = token;
    return { uid, token, expiry, user };
  } catch {
    clearSession();
    return null;
  }
};

/**
 * Persists the user UID, access token, and expiration timestamp in localStorage.
 */
export const extendSession = (durationMs: number = 55 * 60 * 1000) => {
  try {
    if (isSessionValid()) {
      const expiry = Date.now() + durationMs;
      localStorage.setItem(SESSION_KEYS.EXPIRY, expiry.toString());
    }
  } catch (err) {
    console.warn("Failed to extend session:", err);
  }
};

export const saveSession = (
  user: User | { uid: string; email?: string | null; displayName?: string | null; photoURL?: string | null },
  accessToken: string,
  durationMs: number = 55 * 60 * 1000 // 55 minutes
) => {
  try {
    const expiry = Date.now() + durationMs;
    cachedAccessToken = accessToken;

    localStorage.setItem(SESSION_KEYS.UID, user.uid);
    localStorage.setItem(SESSION_KEYS.TOKEN, accessToken);
    localStorage.setItem(SESSION_KEYS.EXPIRY, expiry.toString());

    // Cache basic serializable user profile for instant reload rendering
    const userProfile = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
    };
    localStorage.setItem(SESSION_KEYS.USER, JSON.stringify(userProfile));
  } catch (err) {
    console.warn("Failed to persist session to localStorage:", err);
  }
};

/**
 * Clears in-memory and localStorage session credentials.
 */
export const clearSession = () => {
  cachedAccessToken = null;
  try {
    localStorage.removeItem(SESSION_KEYS.UID);
    localStorage.removeItem(SESSION_KEYS.TOKEN);
    localStorage.removeItem(SESSION_KEYS.EXPIRY);
    localStorage.removeItem(SESSION_KEYS.USER);
  } catch (err) {
    console.warn("Failed to clear localStorage session:", err);
  }
};

/**
 * Enhanced wrapper around Firebase Auth state observer that checks local session timestamps
 * on page reload, visibility change, and window re-focus, preventing redundant re-authentication.
 */
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
): Unsubscribe => {
  let lastDispatchedUid: string | null = null;
  let lastDispatchedToken: string | null = null;

  const notifySuccessIfChanged = (currentUser: any, token: string) => {
    if (!currentUser || !token) return;
    if (lastDispatchedUid === currentUser.uid && lastDispatchedToken === token) {
      return;
    }
    lastDispatchedUid = currentUser.uid;
    lastDispatchedToken = token;
    cachedAccessToken = token;
    if (onAuthSuccess) {
      onAuthSuccess(currentUser as User, token);
    }
  };

  const notifyFailureIfChanged = () => {
    lastDispatchedUid = null;
    lastDispatchedToken = null;
    clearSession();
    if (onAuthFailure) {
      onAuthFailure();
    }
  };

  // 1. Initial check on startup / page reload from localStorage
  const validSession = getStoredSession();
  if (validSession && validSession.user && validSession.token) {
    notifySuccessIfChanged(validSession.user, validSession.token);
  }

  // 2. Check for redirect result (important for mobile devices)
  getRedirectResult(auth, browserPopupRedirectResolver)
    .then((result) => {
      if (result) {
        const credential = GoogleAuthProvider.credentialFromResult(result);
        if (credential?.accessToken) {
          saveSession(result.user, credential.accessToken);
          notifySuccessIfChanged(result.user, credential.accessToken);
        }
      }
    })
    .catch((err) => {
      if (err?.code !== "auth/popup-closed-by-user" && err?.code !== "auth/cancelled-popup-request") {
        console.warn("Redirect auth check warning:", err);
      }
    });

  // 3. Firebase auth state listener
  const unsubscribeAuth = onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      const session = getStoredSession();
      if (session && session.uid === user.uid) {
        notifySuccessIfChanged(user, session.token);
      } else if (cachedAccessToken) {
        saveSession(user, cachedAccessToken);
        notifySuccessIfChanged(user, cachedAccessToken);
      } else if (!isSigningIn) {
        // Stored token was missing or expired
        if (!validSession) {
          notifyFailureIfChanged();
        }
      }
    } else {
      // User is null in Firebase
      if (!isSigningIn) {
        if (!isSessionValid()) {
          notifyFailureIfChanged();
        }
      }
    }
  });

  // 4. App re-focus and visibility change observer
  const handleAppRefocus = () => {
    if (document.visibilityState === "hidden") {
      return;
    }

    if (isSigningIn) {
      return;
    }

    // Verify if existing session is still within valid timestamp
    if (isSessionValid()) {
      const session = getStoredSession();
      const currentUser = auth.currentUser || session?.user;
      if (session && currentUser && session.uid === currentUser.uid) {
        notifySuccessIfChanged(currentUser, session.token);
      } else if (session && !currentUser) {
        cachedAccessToken = session.token;
      }
    } else {
      // Session has expired while the app was in background / inactive
      if (lastDispatchedUid !== null) {
        notifyFailureIfChanged();
      }
    }
  };

  window.addEventListener("focus", handleAppRefocus);
  document.addEventListener("visibilitychange", handleAppRefocus);

  return () => {
    unsubscribeAuth();
    window.removeEventListener("focus", handleAppRefocus);
    document.removeEventListener("visibilitychange", handleAppRefocus);
  };
};

export const cancelSignIn = () => {
  isSigningIn = false;
};

export const googleSignIn = async (timeoutMs: number = 45000): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    
    // Create timeout race promise to prevent indefinite hanging on mobile devices
    const timeoutPromise = new Promise<never>((_, reject) => {
      const timer = setTimeout(() => {
        const timeoutError: any = new Error("Il popup di accesso Google ha impiegato troppo tempo o è stato bloccato dal browser.");
        timeoutError.code = "auth/popup-timeout";
        reject(timeoutError);
      }, timeoutMs);

      // Clean up timeout if window closes or completes
      if (typeof window !== "undefined") {
        window.addEventListener("focus", () => {
          // If window regains focus, we don't immediately cancel, but let popup finish
        }, { once: true });
      }
    });

    const signInPromise = signInWithPopup(auth, provider, browserPopupRedirectResolver);

    const result = await Promise.race([signInPromise, timeoutPromise]);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error("Impossibile recuperare il token di accesso dall'autenticazione Google.");
    }

    const accessToken = credential.accessToken;
    saveSession(result.user, accessToken);

    return { user: result.user, accessToken };
  } catch (error: any) {
    if (
      error?.code !== "auth/popup-closed-by-user" &&
      error?.code !== "auth/cancelled-popup-request" &&
      error?.code !== "auth/popup-timeout"
    ) {
      console.error("Sign in error:", error);
    }
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  const session = getStoredSession();
  return session ? session.token : cachedAccessToken;
};

/**
 * Silently refreshes the current Firebase user token and extends the active session window.
 */
export const refreshAuthSession = async (): Promise<{ success: boolean; token?: string }> => {
  try {
    const currentUser = auth.currentUser;
    if (currentUser) {
      // Ping Firebase auth to silently refresh the ID token
      await currentUser.getIdToken(true).catch(() => {});
    }

    // If stored Google OAuth access token exists for this user, extend its valid window
    const session = getStoredSession();
    if (session && (!currentUser || session.uid === currentUser.uid)) {
      extendSession();
      return { success: true, token: session.token };
    } else if (cachedAccessToken) {
      if (currentUser) saveSession(currentUser, cachedAccessToken);
      return { success: true, token: cachedAccessToken };
    }

    return { success: false };
  } catch (err) {
    console.warn("Auth session heartbeat refresh error:", err);
    return { success: false };
  }
};

export const logout = async () => {
  try {
    await auth.signOut();
  } finally {
    clearSession();
  }
};
