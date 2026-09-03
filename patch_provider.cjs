const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');
content = content.replace(
  'currentOperatore\n    }}>',
  'currentOperatore,\n      userRole\n    }}>'
);
fs.writeFileSync('src/App.tsx', content);
