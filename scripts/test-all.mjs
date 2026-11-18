// THE WHOLE TEST SUITE, FAST: every suite built in ONE build (not a hundred), then run four at a time.
//   node scripts/test-all.mjs            (npm run test:all)   all of them
//   node scripts/test-all.mjs hall lifting                    only those
// Prints each suite that fails with its FAIL lines, then the count of PASS and FAIL lines over all. Exit 1 on any failure.
// (The list is package.json's test:sim, so a new suite is still added in one place.)
import { build } from 'vite';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const all = pkg.scripts['test:sim'].match(/for t in ([^;]+);/)[1].trim().split(/\s+/);
const want = process.argv.slice(2);
const names = want.length ? all.filter((n) => want.includes(n)) : all;
const out = path.join(root, '.testdist-all');
const t0 = Date.now();
await build({
  root,
  logLevel: 'error',
  build: { ssr: true, outDir: out, emptyOutDir: true, rollupOptions: { input: Object.fromEntries(names.map((n) => [n, path.join(root, 'tests', `${n}.ts`)])), output: { entryFileNames: '[name].js' } } },
});
const built = Date.now();
const run = (n) => new Promise((resolve) => {
  const p = spawn(process.execPath, [path.join(out, `${n}.js`)], { cwd: root });
  let text = '';
  p.stdout.on('data', (d) => (text += d));
  p.stderr.on('data', (d) => (text += d));
  p.on('close', (code) => resolve({ n, code, text }));
});
const queue = [...names];
const results = [];
const lanes = Math.max(2, Math.min(os.cpus().length, 6));
await Promise.all(Array.from({ length: lanes }, async () => {
  while (queue.length) results.push(await run(queue.shift()));
}));
let pass = 0;
let fail = 0;
const broken = [];
for (const r of results) {
  pass += (r.text.match(/^PASS/gm) ?? []).length;
  const fails = r.text.match(/^FAIL.*$/gm) ?? [];
  fail += fails.length;
  if (r.code !== 0 || fails.length) broken.push(`${r.n} (exit ${r.code})\n  ${(fails.length ? fails : r.text.trim().split('\n').slice(-6)).join('\n  ')}`);
}
if (broken.length) console.log(`FAILED SUITES:\n${broken.join('\n')}`);
console.log(`${names.length} suites: ${pass} pass, ${fail} fail (built in ${((built - t0) / 1000).toFixed(0)} s, ran in ${((Date.now() - built) / 1000).toFixed(0)} s)`);
process.exit(broken.length ? 1 : 0);
