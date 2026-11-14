// 3D editing: pieces placed where the crosshair points, and the right piece picked for deleting.
import { makePiece, pickPiece, defaultRaise } from '../src/levels/place3d';
import { compileCustom, emptyCustom } from '../src/levels/custom';
import type { Piece } from '../src/levels/custom';

let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}
const o = { w: 3, d: 2, raise: 1, dir: 'e' as const };

const slab = makePiece('platform', 4.3, 0, -2.2, o);
check('a slab is centred on the point, on the grid', slab.x0 === 3 && slab.x1 === 6 && slab.z0 === -3 && slab.z1 === -1, JSON.stringify(slab));
check('...raised above the floor', slab.top === 1 && slab.bottom === undefined);
const onTop = makePiece('platform', 4, 1, -2, o);
check('a slab on a slab stands on it, not through it', onTop.top === 2 && onTop.bottom === 1);
const crumb = makePiece('crumb', 2.6, 1, 3.4, { ...o, raise: 0 });
check('a crumb sits on the grid point on the surface', crumb.x0 === 3 && crumb.z0 === 3 && crumb.x1 === 3 && crumb.top === 1);
check('stairs climb from the surface', (() => { const s = makePiece('stairs', 0, 2, 0, { ...o, raise: 0 }); return s.bottom === 2 && s.top === 5 && s.dir === 'e'; })());
check('a pool sinks into the surface', makePiece('water', 0, 0, 0, o).top === -0.85);
check('a pillar starts tall', defaultRaise('pillar') === 3 && defaultRaise('crumb') === 0);

// Picking.
const pieces: Piece[] = [
  { t: 'floor', x0: -10, z0: -10, x1: 10, z1: 10, top: 0 },
  { t: 'platform', x0: 2, z0: 2, x1: 5, z1: 5, top: 2 },
  { t: 'crumb', x0: -3, z0: 0, x1: -3, z1: 0, top: 0 },
];
const eye = { x: 0, y: 5, z: 10 };
const toward = (x: number, y: number, z: number) => {
  const dx = x - eye.x, dy = y - eye.y, dz = z - eye.z, l = Math.hypot(dx, dy, dz);
  return { x: dx / l, y: dy / l, z: dz / l };
};
check('looking at the slab top picks the slab', pickPiece(pieces, eye, toward(3.5, 2, 3.5), { x: 3.5, y: 2, z: 3.5, dist: 8 }) === 1);
check('looking at bare floor picks the floor', pickPiece(pieces, eye, toward(-6, 0, 6), { x: -6, y: 0, z: 6, dist: 8 }) === 0);
check('looking at a crumb picks the crumb, not the floor under it', pickPiece(pieces, eye, toward(-3, 0.4, 0), { x: -3.2, y: 0, z: -0.5, dist: 12 }) === 2);
check('looking at nothing picks nothing', pickPiece(pieces, eye, toward(0, 30, -50), null) === -1);

// What it places compiles.
const lvl = emptyCustom();
lvl.pieces.push(slab, onTop, crumb, makePiece('stairs', -6, 0, -6, { ...o, raise: 0 }));
let ok = true;
try { compileCustom(lvl); } catch { ok = false; }
check('pieces placed in 3D build a level', ok);

console.log(failures === 0 ? 'place3d: all pass' : `place3d: ${failures} FAIL`);
process.exit(failures ? 1 : 0);
