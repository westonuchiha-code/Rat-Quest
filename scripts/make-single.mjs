// Inlines the Vite bundle into one HTML file that opens directly from disk (file://).
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const dist = process.env.DIST ?? 'dist';
const outName = process.argv[2] ?? 'ratquest.html';
let html = readFileSync(join(dist, 'index.html'), 'utf8');
const assetsDir = join(dist, 'assets');
for (const name of readdirSync(assetsDir).filter((f) => f.endsWith('.js'))) {
  const js = readFileSync(join(assetsDir, name), 'utf8').replace(/<\/script/gi, '<\\/script');
  const tagPattern = new RegExp(`<script[^>]*src="[^"]*${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*></script>`);
  if (!tagPattern.test(html)) throw new Error(`script tag for ${name} not found`);
  html = html.replace(tagPattern, () => `<script type="module">\n${js}\n</script>`);
}
mkdirSync('dist-single', { recursive: true });
writeFileSync(join('dist-single', outName), html);
console.log('wrote dist-single/' + outName, html.length, 'bytes');
