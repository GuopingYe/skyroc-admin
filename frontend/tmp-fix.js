const fs = require('fs');
const file = 'd:/github/clinical-mdr/frontend/src/pages/(base)/mdr/tfl-designer/index.tsx';
const lines = fs.readFileSync(file, 'utf8').split('\n');
// Keep lines up to 488 (index 0 to 487)
// Skip lines 489 to 647 (index 488 to 646)
// Keep line 648 onwards
const newLines = [...lines.slice(0, 488), ...lines.slice(647)];
fs.writeFileSync(file, newLines.join('\n'));
console.log('Fixed index.tsx lines');
