// The new dressing: banners, torches, gauges, crystals and roots. They come from the builder as pieces; in the worlds,
// banners hang where the camera sees them, wall pieces sit against a wall, and roots hang clear of his head.
import { compileCustom, type CustomLevel, type Piece } from '../src/levels/custom';
import { LEVELS } from '../src/levels/levels';
import type { Decor } from '../src/world/layout';

let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}
const at = (t: Piece['t'], x: number, z: number, top: number, extra: Partial<Piece> = {}): Piece => ({ t, x0: x, z0: z, x1: x, z1: z, top, ...extra });
const lvl: CustomLevel = {
  name: 't', width: 20, depth: 20, wallHeight: 10,
  pieces: [
    { t: 'floor', x0: -10, z0: -10, x1: 10, z1: 10, top: 0 },
    at('banner', 0, -9.7, 6, { dir: 'n', props: { color: 'red' } }), at('torch', 3, -9.7, 3, { dir: 'n' }), at('gauge', -3, -9.7, 3, { dir: 'n' }),
    at('crystal', 4, 4, 0, { props: { color: 'purple' } }), at('roots', -4, 4, 6),
  ],
};
const def = compileCustom(lvl);
const kinds = new Set(def.decor.map((d) => d.kind));
check('the builder\'s new pieces become the new dressing', ['banner', 'torch', 'gauge', 'crystal', 'roots'].every((k) => kinds.has(k as Decor['kind'])));
check('a crystal cluster is solid (a little)', def.solids.some((b) => b.hidden && b.x0 < 4 && b.x1 > 4 && b.z0 < 4 && b.z1 > 4));
check('a banner keeps its colour', (def.decor.find((d) => d.kind === 'banner') as Extract<Decor, { kind: 'banner' }>).color !== (compileCustom({ ...lvl, pieces: [lvl.pieces[0], at('banner', 0, -9.7, 6, { dir: 'n' })] }).decor.find((d) => d.kind === 'banner') as Extract<Decor, { kind: 'banner' }>).color);

// In the worlds.
const front = (d: { x: number; z: number; yaw: number }, k: number): [number, number] => [d.x + Math.sin(d.yaw) * k, d.z + Math.cos(d.yaw) * k];
const floorBelow = (l: (typeof LEVELS)[number], x: number, z: number, y: number): number => Math.max(-99, ...l.solids.filter((b) => !b.hidden && x > b.x0 && x < b.x1 && z > b.z0 && z < b.z1 && b.y1 <= y + 0.01).map((b) => b.y1));
const wallBehind = (l: (typeof LEVELS)[number], d: { x: number; z: number; yaw: number }, y: number): boolean => {
  const [x, z] = front(d, -0.7);
  return l.solids.some((b) => x >= b.x0 - 0.05 && x <= b.x1 + 0.05 && z >= b.z0 - 0.05 && z <= b.z1 + 0.05 && b.y0 <= y && b.y1 >= y);
};
const tooHigh: string[] = [];
const floating: string[] = [];
const lowRoots: string[] = [];
let banners = 0;
let wallThings = 0;
for (const l of LEVELS) {
  for (const d of l.decor) {
    if (d.kind === 'banner') {
      banners++;
      const [x, z] = front(d, 1.5);
      const f = floorBelow(l, x, z, d.top);
      if (d.top - f > 7.2) tooHigh.push(`${l.id} ${d.x},${d.z} (${(d.top - f).toFixed(1)} up)`);
      if (!wallBehind(l, d, d.top - 1)) floating.push(`${l.id} banner ${d.x},${d.z}`);
    }
    if (d.kind === 'torch' || d.kind === 'gauge') {
      wallThings++;
      if (!wallBehind(l, d, d.y)) floating.push(`${l.id} ${d.kind} ${d.x},${d.z}`);
    }
    if (d.kind === 'roots') {
      const f = floorBelow(l, d.x, d.z, d.bottom);
      if (d.bottom - f < 2.5) lowRoots.push(`${l.id} ${d.x},${d.z}`);
    }
  }
}
check('the worlds are dressed: banners, torches and gauges about', banners >= 20 && wallThings >= 30, `${banners} banners, ${wallThings} torches and gauges`);
check('banners hang low enough for the camera to see them', tooHigh.length === 0, tooHigh.slice(0, 3).join('; '));
check('banners, torches and gauges are all against a wall', floating.length === 0, floating.slice(0, 4).join('; '));
check('roots hang clear of his head', lowRoots.length === 0, lowRoots.join('; '));

console.log(failures === 0 ? 'decor: all pass' : `decor: ${failures} FAIL`);
process.exit(failures ? 1 : 0);
