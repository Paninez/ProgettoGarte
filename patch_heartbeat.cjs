const fs = require('fs');
let content = fs.readFileSync('src/components/common/AuthHeartbeat.tsx', 'utf8');

const target1 = `    const handleForegroundReturn = () => {
      if (document.visibilityState === "visible") {
        const session = getStoredSession();
        if (session) {
          const remainingMs = session.expiry - Date.now();
          // If session is still valid but has less than 25 minutes left, proactively refresh
          if (remainingMs < EXPIRY_THRESHOLD_MS) {
            performHeartbeat(true);
          }
        }
      }
    };`;

const replacement1 = `    const handleForegroundReturn = () => {
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
    };`;

content = content.replace(target1, replacement1);

const target2 = `      // Check if session is currently valid
      const session = getStoredSession();
      if (!session && !isSessionValid()) {
        if (onSessionExpired) {
          onSessionExpired();
        }
        return;
      }`;

const replacement2 = `      // Check if session is currently valid
      const session = getStoredSession();
      
      try {
        isRefreshingRef.current = true;
        
        // Stricter Firebase token check
        let isFirebaseExpired = false;
        if (user) {
          const idTokenResult = await user.getIdTokenResult();
          const expirationTime = new Date(idTokenResult.expirationTime).getTime();
          isFirebaseExpired = expirationTime < Date.now();
        }

        if (!session && !isSessionValid() && isFirebaseExpired) {
          if (onSessionExpired) {
            onSessionExpired();
          }
          return;
        }

        const result = await refreshAuthSession();`;

content = content.replace(target2, replacement2).replace(`      try {
        isRefreshingRef.current = true;
        const result = await refreshAuthSession();`, '');

fs.writeFileSync('src/components/common/AuthHeartbeat.tsx', content);
