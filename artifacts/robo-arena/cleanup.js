import { readFileSync, writeFileSync } from 'fs';
let c = readFileSync('src/pages/battle.tsx', 'utf8');
const marker1 = '      {/* Scratch marks */}';
const marker2 = '// \u2500\u2500\u2500 3D: Impact flash';
const start = c.indexOf(marker1);
const end = c.indexOf(marker2);
console.log('start:', start, 'end:', end);
if (start > -1 && end > -1) {
  c = c.slice(0, start) + c.slice(end);
  writeFileSync('src/pages/battle.tsx', c);
  console.log('done');
} else {
  console.log('markers not found');
}
