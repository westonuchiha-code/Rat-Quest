// 3D editing: pieces placed where the crosshair points, and the right piece picked for deleting.
import { PadShaper, aimPoint, defaultRaise, faces, makePiece, pickPiece, settingsFrom, standsOn, sticksOut } from '../src/levels/place3d';
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

// The piece he is pointing at is the one whose surface the crosshair is on.
{
  // The slab's south side (z = 5, facing him), half way up it.
  const side = aimPoint({ x: 3.5, y: 1, z: 5 }, { x: 0, y: 0, z: 1 }, 6);
  check('pointing at a slab\'s side picks the slab, not the floor in front of it', pickPiece(pieces, eye, toward(3.5, 1, 5), side) === 1, JSON.stringify(side));
  const top = aimPoint({ x: 3.5, y: 2, z: 3.5 }, { x: 0, y: 1, z: 0 }, 8);
  check('...and its top still picks it', pickPiece(pieces, eye, toward(3.5, 2, 3.5), top) === 1);
  const wall = aimPoint({ x: 10, y: 3, z: 0 }, { x: -1, y: 0, z: 0 }, 11);
  check('pointing at the room\'s own wall picks nothing (it is not a piece)', pickPiece(pieces, eye, toward(10, 3, 0), wall) === -1);
  // A crate: the line of sight meets its top before it comes nearest its middle.
  const withCrate: Piece[] = [...pieces, { t: 'crate', x0: 6, z0: 6, x1: 6, z1: 6, top: 0 }];
  const onCrate = aimPoint({ x: 6.1, y: 1, z: 6.3 }, { x: 0, y: 1, z: 0 }, Math.hypot(6.1, 4, 3.7));
  check('pointing at a crate\'s top picks the crate', pickPiece(withCrate, eye, toward(6.1, 1, 6.3), onCrate) === 3);
}

// Copy and Move: the settings that put down another like it.
{
  const again = (p: Piece, under: number, x: number, z: number): Piece => makePiece(p.t, x, under, z, settingsFrom(p, under));
  const same = (a: Piece, b: Piece): boolean => a.t === b.t && a.x0 === b.x0 && a.x1 === b.x1 && a.z0 === b.z0 && a.z1 === b.z1 && a.top === b.top && a.bottom === b.bottom && a.dir === b.dir;
  const cases: Array<[string, Piece, number, number, number]> = [
    ['a slab on the floor', makePiece('platform', 4, 0, -2, { w: 5, d: 2, raise: 1.5, dir: 'n' }), 0, 4, -2],
    ['a slab on a slab', makePiece('platform', 4, 2, -2, { w: 3, d: 3, raise: 1, dir: 'n' }), 2, 4, -2],
    ['stairs', makePiece('stairs', 0, 1, 0, { w: 3, d: 6, raise: 4, dir: 'w' }), 1, 0, 0],
    ['a pool', makePiece('water', 2, 0, 2, { w: 6, d: 4, raise: 0, dir: 'n' }), 0, 2, 2],
    ['a crumb on a ledge', makePiece('crumb', 3, 2, 3, { w: 1, d: 1, raise: 0, dir: 'n' }), 2, 3, 3],
    ['a lamp hung high', makePiece('lamp', -5, 0, 5, { w: 1, d: 1, raise: 6, dir: 'n' }), 0, -5, 5],
    ['a guard facing east', makePiece('guard', 1, 0, 1, { w: 1, d: 1, raise: 0, dir: 'e' }), 0, 1, 1],
  ];
  const off = cases.filter(([, p, under, x, z]) => !same(p, again(p, under, x, z)));
  check('a copied piece put down in the same place is the same piece: size, height and facing', off.length === 0, off.map(([n, p, u, x, z]) => `${n}: ${JSON.stringify(p)} became ${JSON.stringify(again(p, u, x, z))}`).join('; '));
  const moved = makePiece('platform', 10, 3, 10, settingsFrom(cases[0][1], 0));
  check('...and put down on higher ground it stands as far above that', moved.top === 4.5 && moved.x1 - moved.x0 === 5 && moved.z1 - moved.z0 === 2);
  check('what a piece stands on: the slab under a crumb, the floor under a slab, nothing under the floor', standsOn(pieces, { t: 'crumb', x0: 3, z0: 3, x1: 3, z1: 3, top: 2 }) === 2 && standsOn(pieces, pieces[1]) === 0 && standsOn(pieces, pieces[0]) === 0);
  check('only pieces that face a way can be turned', faces('guard') && faces('stairs') && !faces('platform') && !faces('crumb'));
  check('a piece over the edge of the room sticks out; the exit door, which stands in the wall, never does', sticksOut(makePiece('platform', 19.5, 0, 0, { w: 3, d: 3, raise: 1, dir: 'n' }), 40, 40) && !sticksOut(makePiece('platform', 18, 0, 0, { w: 3, d: 3, raise: 1, dir: 'n' }), 40, 40) && !sticksOut(makePiece('exit', 0, 0, 20.5, { w: 1, d: 1, raise: 0, dir: 'n' }), 40, 40));
}

// A controller's d-pad shapes the piece.
{
  const DT = 1 / 60;
  /** Holds the d-pad one way for `secs`, and adds up what it did. */
  const hold = (sh: PadShaper, secs: number, x: number, y: number, lift = false): { width: number; depth: number; raise: number; first: number } => {
    const sum = { width: 0, depth: 0, raise: 0, first: -1 };
    for (let i = 0; i < Math.round(secs * 60); i++) {
      const r = sh.step(DT, x, y, lift);
      if ((r.width || r.depth || r.raise) && sum.first < 0) sum.first = i;
      sum.width += r.width;
      sum.depth += r.depth;
      sum.raise += r.raise;
    }
    return sum;
  };
  const sh = new PadShaper();
  check('with nothing held the d-pad changes nothing', JSON.stringify(hold(sh, 0.5, 0, 0)) === JSON.stringify({ width: 0, depth: 0, raise: 0, first: -1 }));
  const tap = hold(sh, 0.1, 1, 0);
  check('a press to the right makes the piece one wider, at once', tap.width === 1 && tap.first === 0 && tap.depth === 0 && tap.raise === 0);
  hold(sh, 0.1, 0, 0);
  const held = hold(sh, 1, 1, 0);
  check('held, it waits a moment and then goes on widening (a floor can be drawn out without thirty presses)', held.width >= 8 && held.width <= 10 && hold(new PadShaper(), PadShaper.WAIT - 0.02, 1, 0).width === 1, `${held.width} in a second`);
  hold(sh, 0.1, 0, 0);
  check('left makes it narrower; up and down make it deeper and shallower (its footprint, as on a map)', hold(sh, 0.05, -1, 0).width === -1 && (hold(sh, 0.05, 0, 0), hold(sh, 0.05, 0, 1).depth === 1) && (hold(sh, 0.05, 0, 0), hold(sh, 0.05, 0, -1).depth === -1));
  hold(sh, 0.1, 0, 0);
  const up = hold(sh, 0.05, 0, 1, true);
  hold(sh, 0.1, 0, 0);
  const down = hold(sh, 0.05, 0, -1, true);
  hold(sh, 0.1, 0, 0);
  const side = hold(sh, 0.05, 1, 0, true);
  check('switched to height (Select), up and down raise and lower it instead (left and right still widen and narrow)', up.raise === 1 && up.depth === 0 && down.raise === -1 && down.depth === 0 && side.width === 1 && side.raise === 0);
  hold(sh, 0.1, 0, 0);
  const corner = hold(sh, 0.05, 1, 1);
  check('a thumb on a corner does one thing, not two', corner.width === 1 && corner.depth === 0);
  // Switching in the middle of a hold is a new press, of the other thing.
  hold(sh, 0.1, 0, 0);
  const a = hold(sh, 0.05, 0, 1, false);
  const b2 = hold(sh, 0.05, 0, 1, true);
  check('switching while up is held goes from deeper to higher, at once', a.depth === 1 && b2.raise === 1 && b2.depth === 0);
}

// What it places compiles.
const lvl = emptyCustom();
lvl.pieces.push(slab, onTop, crumb, makePiece('stairs', -6, 0, -6, { ...o, raise: 0 }));
let ok = true;
try { compileCustom(lvl); } catch { ok = false; }
check('pieces placed in 3D build a level', ok);

console.log(failures === 0 ? 'place3d: all pass' : `place3d: ${failures} FAIL`);
process.exit(failures ? 1 : 0);
