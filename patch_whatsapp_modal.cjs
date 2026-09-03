const fs = require('fs');
let content = fs.readFileSync('src/components/carrelli/CartList.tsx', 'utf8');

const targetRegex = /\{whatsAppCartList\.filter\(c => !contactedCartIds\.includes\(c\.ID_Carrello\)\)\.length === 0 \? \([\s\S]*? \) : \([\s\S]*?whatsAppCartList\.filter\(c => !contactedCartIds\.includes\(c\.ID_Carrello\)\)\.map\(\(c, idx\) => \(/;

const addition = `{(() => {
                const remaining = whatsAppCartList.filter(c => !contactedCartIds.includes(c.ID_Carrello));
                if (remaining.length === 0) {
                  return (
                    <div className="text-center py-8 text-slate-500 text-sm">
                      Tutti i clienti in questa lista sono stati contattati o la lista è vuota.
                    </div>
                  );
                }
                
                const nextCart = remaining[0];
                const hasPhone = nextCart.Telefono || phoneInputs[nextCart.ID_Carrello];
                
                return (
                  <>
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-4 shadow-sm flex flex-col gap-3">
                      <div className="text-sm font-bold text-emerald-800">Coda di invio: {remaining.length} da contattare</div>
                      {hasPhone ? (
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => {
                              handleExportWhatsApp(nextCart, false, phoneInputs[nextCart.ID_Carrello]);
                              setContactedCartIds(prev => [...prev, nextCart.ID_Carrello]);
                            }}
                            className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white rounded-xl text-lg font-black uppercase tracking-wide transition-all shadow-md flex items-center justify-center gap-2 animate-pulse cursor-pointer"
                          >
                            <MessageCircle className="h-6 w-6" />
                            Invia a {nextCart.Nome_Cliente}
                          </button>
                          
                          {filterProduct && filterProduct.trim().length > 0 && (
                            <button
                              onClick={() => {
                                handleExportWhatsApp(nextCart, true, phoneInputs[nextCart.ID_Carrello]);
                                setContactedCartIds(prev => [...prev, nextCart.ID_Carrello]);
                              }}
                              className="w-full py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-sm font-bold uppercase transition-all flex items-center justify-center gap-2 cursor-pointer"
                            >
                              Invia solo filtrato a {nextCart.Nome_Cliente}
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="text-xs text-rose-600 font-medium">
                          ⚠️ Il prossimo cliente ({nextCart.Nome_Cliente || 'Senza Nome'}) non ha il numero di telefono. Inseriscilo nella lista sottostante per poter procedere.
                        </div>
                      )}
                    </div>
                    {remaining.map((c, idx) => (`;

if (targetRegex.test(content)) {
  content = content.replace(targetRegex, addition);
  fs.writeFileSync('src/components/carrelli/CartList.tsx', content);
  console.log("Patched successfully");
} else {
  console.log("Could not match target regex");
}
