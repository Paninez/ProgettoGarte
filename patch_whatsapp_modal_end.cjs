const fs = require('fs');
let content = fs.readFileSync('src/components/carrelli/CartList.tsx', 'utf8');

const target = `                    {c.Telefono && (
                      <div className="text-[11px] text-slate-500">
                        <span className="font-semibold">Telefono:</span> {c.Telefono}
                      </div>
                    )}
                  </div>
                ))
              )}`;

const replacement = `                    {c.Telefono && (
                      <div className="text-[11px] text-slate-500">
                        <span className="font-semibold">Telefono:</span> {c.Telefono}
                      </div>
                    )}
                  </div>
                ))}
                </>
              );
            })()}`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync('src/components/carrelli/CartList.tsx', content);
  console.log("Patched successfully");
} else {
  console.log("Target not found");
}
