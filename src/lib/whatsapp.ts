export type WhatsAppDestination = 'web' | 'app';

export function isIOS(): boolean {
  if (typeof window === 'undefined' || !window.navigator) return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export function isMobileDevice(): boolean {
  if (typeof window === 'undefined' || !window.navigator) return false;
  return isIOS() || /Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

export function getWhatsAppPreference(): WhatsAppDestination {
  const pref = localStorage.getItem('whatsapp_preference');
  if (pref === 'app' || pref === 'web') return pref;
  return isMobileDevice() ? 'app' : 'web';
}

export function setWhatsAppPreference(pref: WhatsAppDestination) {
  localStorage.setItem('whatsapp_preference', pref);
}

export function formatPhoneForWhatsApp(phone?: string): string {
  if (!phone) return '';
  const digitsOnly = phone.replace(/\D/g, '');
  if (!digitsOnly) return '';
  return (digitsOnly.startsWith('3') && digitsOnly.length <= 10) ? '39' + digitsOnly : digitsOnly;
}

export function buildWhatsAppUrl(msg: string, phone?: string): string {
  const phoneStr = formatPhoneForWhatsApp(phone);
  const encodedMsg = encodeURIComponent(msg);
  
  // Utilizzando lo schema nativo per dispositivi mobili, evitiamo l'apertura di nuove tab
  // o la navigazione verso api.whatsapp.com, prevenendo il ricaricamento dell'app al ritorno.
  if (isMobileDevice()) {
    return phoneStr 
      ? `whatsapp://send?phone=${phoneStr}&text=${encodedMsg}`
      : `whatsapp://send?text=${encodedMsg}`;
  }
  
  return phoneStr 
    ? `https://api.whatsapp.com/send?phone=${phoneStr}&text=${encodedMsg}`
    : `https://api.whatsapp.com/send?text=${encodedMsg}`;
}

export function sendWhatsAppMessage(msg: string, phone?: string) {
  const url = buildWhatsAppUrl(msg, phone);
  
  if (isMobileDevice()) {
    // Sfruttiamo window.location.href con il custom scheme.
    // In questo modo il browser passa l'intent all'OS senza cambiare pagina web.
    window.location.href = url;
  } else {
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}