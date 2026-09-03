const fs = require('fs');
let content = fs.readFileSync('src/lib/whatsapp.ts', 'utf8');

const target1 = `export function buildWhatsAppUrl(msg: string, phone?: string): string {
  const phoneStr = formatPhoneForWhatsApp(phone);
  const encodedMsg = encodeURIComponent(msg);
  
  return phoneStr 
    ? \`https://api.whatsapp.com/send?phone=\${phoneStr}&text=\${encodedMsg}\`
    : \`https://api.whatsapp.com/send?text=\${encodedMsg}\`;
}`;

const replace1 = `export function buildWhatsAppUrl(msg: string, phone?: string): string {
  const phoneStr = formatPhoneForWhatsApp(phone);
  const encodedMsg = encodeURIComponent(msg);
  
  // Utilizzando lo schema nativo per dispositivi mobili, evitiamo l'apertura di nuove tab
  // o la navigazione verso api.whatsapp.com, prevenendo il ricaricamento dell'app al ritorno.
  if (isMobileDevice()) {
    return phoneStr 
      ? \`whatsapp://send?phone=\${phoneStr}&text=\${encodedMsg}\`
      : \`whatsapp://send?text=\${encodedMsg}\`;
  }
  
  return phoneStr 
    ? \`https://api.whatsapp.com/send?phone=\${phoneStr}&text=\${encodedMsg}\`
    : \`https://api.whatsapp.com/send?text=\${encodedMsg}\`;
}`;

const target2 = `export function sendWhatsAppMessage(msg: string, phone?: string) {
  const url = buildWhatsAppUrl(msg, phone);
  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}`;

const replace2 = `export function sendWhatsAppMessage(msg: string, phone?: string) {
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
}`;

content = content.replace(target1, replace1).replace(target2, replace2);
fs.writeFileSync('src/lib/whatsapp.ts', content);
