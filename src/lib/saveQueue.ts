if (typeof window !== 'undefined') {
  window.cartSaveQueue = window.cartSaveQueue || [];
  window.isSavingCart = window.isSavingCart || false;
}

export async function processSaveQueue() {
  if (typeof window === 'undefined' || window.isSavingCart) return;
  window.isSavingCart = true;
  while (window.cartSaveQueue.length > 0) {
    const task = window.cartSaveQueue.shift();
    if (task) {
      try {
        await task();
      } catch (e: any) {
        if (e?.name === "AuthExpiredError" || e?.message?.includes("Autenticazione scaduta")) {
          console.warn("Error saving cart:", e.message);
        } else {
          console.error("Error saving cart:", e);
        }
      }
    }
  }
  window.isSavingCart = false;
}

declare global {
  interface Window {
    cartSaveQueue: (() => Promise<void>)[];
    isSavingCart: boolean;
  }
}
