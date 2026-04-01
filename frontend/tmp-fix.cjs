const fs = require('node:fs');

const file = 'd:/github/clinical-mdr/frontend/src/pages/(base)/mdr/tfl-designer/index.tsx';
const lines = fs.readFileSync(file, 'utf8').split('\n');
const newLines = [...lines.slice(0, 488), ...lines.slice(647)];
fs.writeFileSync(file, newLines.join('\n'));
console.log('Fixed index.tsx lines');
