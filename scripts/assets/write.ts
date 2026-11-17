/** Writes ASSETS.md (npm run assets). */
import '../../src/core/colorSetup';
import fs from 'node:fs';
import path from 'node:path';
import { assetsDoc } from './inventory';

const root = process.cwd();
const doc = assetsDoc((p) => fs.readFileSync(path.join(root, p), 'utf8'), (d) => fs.readdirSync(path.join(root, d)).sort());
fs.writeFileSync(path.join(root, 'ASSETS.md'), doc);
console.log(`ASSETS.md: ${doc.split('\n').length} lines`);
