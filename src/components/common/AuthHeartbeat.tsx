import React, { useEffect, useRef, useCallback } from "react";
import { User } from "firebase/auth";
import { isSessionValid, refreshAuthSession, getStoredSession } from "../../lib/firebase";

interface AuthHeartbeatProps {
  user: User | null;
  /**
   * Interval in milliseconds between background heartbeat pings.
   * Defaults to 10 minutes (600,000 ms).
   */
  intervalMs?: number;
  /**
   * Optional callback when token / session is refreshed.
   */
  onTokenRefreshed?: (token: string) => void;
  /**
   * Optional callback when session is detected as expired during a heartbeat check.
   */
  onSessionExpired?: () => void;
}

const DEFAULT_HEARTBEAT_INTERVAL = 10 * 60 * 1000; // 10 minutes
const MIN_REFRESH_GAP_MS = 2 * 60 * 1000; // 2 minutes throttle between refresh calls
const EXPIRY_THRESHOLD_MS = 25 * 60 * 1000; // Refresh if remaining session validity < 25 min

/**
 * Invisible component that silently pings the Firebase session to refresh the token periodically
 * when the app is in the foreground, ensuring active user sessions do not expire unexpectedly.
 */
export const AuthHeartbeat: React.FC<AuthHeartbeatProps> = ({
  user,
  intervalMs = DEFAULT_HEARTBEAT_INTERVAL,
  onTokenRefreshed,
  onSessionExpired,
}) => {
  const lastRefreshTimeRef = useRef<number>(Date.now());
  const isRefreshingRef = useRef<boolean>(false);

  const performHeartbeat = useCallback(
    async (force: boolean = false) => {
      if (!user) return;

      // Only ping if app is in foreground and online
      if (typeof document !== "undefined" && document.visibilityState === "hidden" && !force) {
        return;
      }
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        return;
      }

      const now = Date.now();
      if (!force && now - lastRefreshTimeRef.current < MIN_REFRESH_GAP_MS) {
        return;
      }

      if (isRefreshingRef.current) {
        return;
      }

      // Check if session is currently valid
      const session = getStoredSession();
      
      try {
        isRefreshingRef.current = true;
        
        // Safe Firebase token check
        let isFirebaseExpired = false;
        if (user && typeof user.getIdTokenResult === "function") {
          try {
            const idTokenResult = await user.getIdTokenResult().catch(() => null);
            if (idTokenResult?.expirationTime) {
              const expirationTime = new Date(idTokenResult.expirationTime).getTime();
              isFirebaseExpired = expirationTime < Date.now();
            }
          } catch {
            isFirebaseExpired = false;
          }
        }

        if (!session && !isSessionValid() && isFirebaseExpired) {
          if (onSessionExpired) {
            onSessionExpired();
          }
          return;
        }

        const result = await refreshAuthSession();


        lastRefreshTimeRef.current = Date.now();

        if (result.success && result.token) {
          if (onTokenRefreshed) {
            onTokenRefreshed(result.token);
          }
        } else if (!result.success) {
          console.warn("AuthHeartbeat: Silent session ping did not succeed.");
        }
      } catch (error) {
        console.error("AuthHeartbeat error during ping:", error);
      } finally {
        isRefreshingRef.current = false;
      }
    },
    [user, onTokenRefreshed, onSessionExpired]
  );

  // 1. Periodic background timer while mounted and user logged in
  useEffect(() => {
    if (!user) return;

    // Initial check on mount
    performHeartbeat(false);

    const intervalId = setInterval(() => {
      performHeartbeat(false);
    }, intervalMs);

    return () => {
      clearInterval(intervalId);
    };
  }, [user, intervalMs, performHeartbeat]);

  // 2. Proactive refresh on window focus / tab visibility change / user activity
  useEffect(() => {
    if (!user) return;

    const handleForegroundReturn = () => {
      if (document.visibilityState === "visible") {
        const session = getStoredSession();
        if (session) {
          const remainingMs = session.expiry - Date.now();
          // If session is still valid but has less than 25 minutes left, proactively refresh
          if (remainingMs < EXPIRY_THRESHOLD_MS) {
            performHeartbeat(true);
          }
        } else {
          // Stricter check: If session appears expired upon re-focusing, force a heartbeat 
          // to either revive it or officially trigger the expiration callback.
          performHeartbeat(true);
        }
      }
    };

    const handleUserActivity = () => {
      const session = getStoredSession();
      if (session) {
        const remainingMs = session.expiry - Date.now();
        // If user is actively typing/clicking and less than threshold remaining, refresh
        if (remainingMs < EXPIRY_THRESHOLD_MS && Date.now() - lastRefreshTimeRef.current > MIN_REFRESH_GAP_MS) {
          performHeartbeat(false);
        }
      }
    };

    window.addEventListener("focus", handleForegroundReturn);
    document.addEventListener("visibilitychange", handleForegroundReturn);
    window.addEventListener("pointerdown", handleUserActivity, { passive: true });
    window.addEventListener("keydown", handleUserActivity, { passive: true });
    window.addEventListener("touchstart", handleUserActivity, { passive: true });

    return () => {
      window.removeEventListener("focus", handleForegroundReturn);
      document.removeEventListener("visibilitychange", handleForegroundReturn);
      window.removeEventListener("pointerdown", handleUserActivity);
      window.removeEventListener("keydown", handleUserActivity);
      window.removeEventListener("touchstart", handleUserActivity);
    };
  }, [user, performHeartbeat]);

  return null;
};

export default AuthHeartbeat;
