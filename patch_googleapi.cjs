const fs = require('fs');
let content = fs.readFileSync('src/lib/googleApi.ts', 'utf8');

const importTarget = `import { parseSafeFloat, parseSafeInt, parseSafeBool } from "./dataValidation";`;
const importAddition = `import { extendSession } from "./firebase";\n`;

content = content.replace(importTarget, importTarget + '\n' + importAddition);

const fetchTarget = `      if (!response.ok) {`;
const fetchAddition = `      if (response.ok) {
        extendSession();
      }
      
      if (!response.ok) {`;

content = content.replace(fetchTarget, fetchAddition);

fs.writeFileSync('src/lib/googleApi.ts', content);
