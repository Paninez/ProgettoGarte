const fs = require('fs');
let content = fs.readFileSync('src/lib/firebase.ts', 'utf8');

const target = `export const saveSession = (`;
const addition = `/**
 * Extends the current valid session in localStorage to keep it active
 * when background network calls succeed.
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

`;
content = content.replace(target, addition + target);
fs.writeFileSync('src/lib/firebase.ts', content);
