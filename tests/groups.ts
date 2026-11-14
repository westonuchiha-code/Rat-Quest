// Builder groups and shapes: box-select, quarter turns, and every shape builds a sound level piece set.
import { piecesInBox, groupCentre, turnQuarter } from '../src/levels/groupOps';
import { STAMPS } from '../src/levels/stamps';
import { compileCustom, emptyCustom, checkCustom } from '../src/levels/custom';
import type { Piece } from '../src/levels/custom';
import { unreachable } from '../src/levels/reach';

let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}

const ps: Piece[] = [
  { t: 'platform', x0: 0, z0: 0, x1: 4, z1: 2, top: 1 },
  { t: 'crumb', x0: 3, z0: 5, x1: 3, z1: 5, top: 0 },
  { t: 'crumb', x0: 20, z0: 20, x1: 20, z1: 20, top: 0 },
  { t: 'spawn', x0: 1, z0: 1, x1: 1, z1: 1, top: 0 },
];
check('a box picks the pieces whose middle is inside it', piecesInBox(ps, -1, -1, 6, 6).join() === '0,1');
check('the start is never boxed', !piecesInBox(ps, -5, -5, 5, 5).includes(3));
const g = [JSON.parse(JSON.stringify(ps[0])), JSON.parse(JSON.stringify(ps[1]))] as Piece[];
const c = groupCentre(g);
check('the centre is a grid point', Number.isInteger(c.x) && Number.isInteger(c.z), JSON.stringify(c));
const before = JSON.stringify(g);
turnQuarter(g, c.x, c.z);
check('a quarter turn swaps width and depth', g[0].x1 - g[0].x0 === 2 && g[0].z1 - g[0].z0 === 4, JSON.stringify(g[0]));
check('...and keeps everything on the grid', g.every((p) => [p.x0, p.x1, p.z0, p.z1].every(Number.isInteger)));
for (let k = 0; k < 3; k++) turnQuarter(g, c.x, c.z);
check('four quarter turns come back to the start', JSON.stringify(g) === before);
const st: Piece[] = [{ t: 'stairs', x0: 0, z0: 0, x1: 4, z1: 6, top: 3, dir: 'n' }];
turnQuarter(st, 2, 3);
check('turning stairs turns their facing', st[0].dir === 'e');

// Every shape, placed in an empty room, builds, and (apart from the tower's top prize) everything in it can be reached.
for (const s of STAMPS) {
  const lvl = emptyCustom();
  lvl.width = 50;
  lvl.depth = 50;
  for (const p of lvl.pieces) if (p.t === 'floor') Object.assign(p, { x0: -25, z0: -25, x1: 25, z1: 25 });
  lvl.pieces.push(...s.make(0, 0, 0));
  let ok = true;
  let bad = '';
  try {
    const def = compileCustom(lvl);
    const probs = unreachable(def).filter((p) => !(s.id === 'tower' && p.what === 'relic'));
    bad = probs.map((p) => `${p.what} ${p.x},${p.y},${p.z}`).join('; ');
  } catch (e) {
    ok = false;
    bad = String(e);
  }
  check(`shape "${s.label}" builds and can be climbed`, ok && !bad && checkCustom(lvl).length === 0, bad || checkCustom(lvl).join(' '));
}

console.log(failures === 0 ? 'groups: all pass' : `groups: ${failures} FAIL`);
process.exit(failures ? 1 : 0);
