const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const target = `      if (email === ownerEmail.toLowerCase().trim() || email === "tuccillostefano@gmail.com") {
        setCurrentOperatore("Operatore 1");
      } else if (email === gestore1Email.toLowerCase().trim()) {
        setCurrentOperatore("Operatore 2");
      } else if (email === gestore2Email.toLowerCase().trim()) {
        setCurrentOperatore("Operatore 3");
      } else {
        // Fallback for unrecognized guest emails
        setCurrentOperatore("Operatore 1");
      }`;

const replacement = `      if (email === ownerEmail.toLowerCase().trim() || email === "tuccillostefano@gmail.com") {
        setCurrentOperatore("Owner");
      } else if (email === gestore1Email.toLowerCase().trim()) {
        setCurrentOperatore("Operatore 1");
      } else if (email === gestore2Email.toLowerCase().trim()) {
        setCurrentOperatore("Operatore 2");
      } else {
        // Fallback for unrecognized guest emails
        setCurrentOperatore("Operatore 3");
      }`;

content = content.replace(target, replacement);

content = content.replace(
  'return (parsed.currentOperatore as Operatore) || "Operatore 1";',
  'return (parsed.currentOperatore as Operatore) || "Owner";'
);
content = content.replace(
  'currentOperatore: "Operatore 1",',
  'currentOperatore: "Owner",'
);

fs.writeFileSync('src/App.tsx', content);
