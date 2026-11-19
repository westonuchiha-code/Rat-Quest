// Lays out over-long one-line check(...) calls: name, condition (one && per line), detail, each on its own line.
// Only newlines and indentation are added, and never inside a string (the scanner tracks '', "", `` and ${}).
import fs from 'node:fs';
function scanArgs(s, open) {
  // From the '(' at `open`: the top-level commas, top-level && positions per argument, and the matching ')'.
  const commas = []; const ands = []; let depth = 0; const tmpl = [];
  let i = open;
  let str = null;
  for (; i < s.length; i++) {
    const c = s[i];
    if (str) {
      if (c === '\\') { i++; continue; }
      if (str === '`' && c === '$' && s[i + 1] === '{') { tmpl.push(depth); depth++; str = null; i++; continue; }
      if (c === str) str = null;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') { str = c; continue; }
    if (c === '/' && s[i + 1] === '/') return null; // a comment on the line: leave it
    if (c === '(' || c === '[' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '}') {
      depth--;
      if (c === '}' && tmpl.length && tmpl[tmpl.length - 1] === depth) { tmpl.pop(); str = '`'; continue; }
      if (depth === 0) return { commas, ands, close: i };
    } else if (c === ',' && depth === 1) commas.push(i);
    else if (c === '&' && s[i + 1] === '&' && depth === 1) { ands.push(i); i++; }
  }
  return null;
}
for (const file of process.argv.slice(2)) {
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  let n = 0;
  const out = lines.map((line) => {
    const m = /^(\s*)check\(/.exec(line);
    if (!m || line.length <= 160 || !line.trimEnd().endsWith(');')) return line;
    const indent = m[1];
    const open = line.indexOf('(');
    const r = scanArgs(line, open);
    if (!r || line.slice(r.close).trim() !== ');') return line;
    const bounds = [open + 1, ...r.commas.map((c) => c + 1), r.close];
    const args = [];
    for (let k = 0; k + 1 < bounds.length; k++) args.push([bounds[k], (k + 1 < bounds.length - 1 ? bounds[k + 1] - 1 : bounds[k + 1])]);
    const inner = indent + '  ';
    const parts = args.map(([a, b], k) => {
      if (k !== 1) return inner + line.slice(a, b).trim();
      // The condition: broken before each top-level && in it.
      const cuts = r.ands.filter((p) => p > a && p < b);
      if (!cuts.length) return inner + line.slice(a, b).trim();
      const bits = [];
      let from = a;
      for (const p of cuts) { bits.push(line.slice(from, p).trim()); from = p + 2; }
      bits.push(line.slice(from, b).trim());
      return inner + bits.join(`\n${inner}  && `);
    });
    n++;
    return `${indent}check(\n${parts.join(',\n')}\n${indent});`;
  });
  fs.writeFileSync(file, out.join('\n'));
  console.log(`${file}: ${n} checks laid out`);
}
