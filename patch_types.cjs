const fs = require('fs');
let content = fs.readFileSync('src/types.ts', 'utf8');
content = content.replace(
  'export type Operatore = "Operatore 1" | "Operatore 2" | "Operatore 3";',
  'export type Operatore = "Owner" | "Operatore 1" | "Operatore 2" | "Operatore 3";'
);
fs.writeFileSync('src/types.ts', content);
