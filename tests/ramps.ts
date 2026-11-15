// Ramps: a slope he can stand, walk and jump on (step one of the slopes the owner asked for, 2026-11-15).
//
// Everything solid in the game was a box square to the axes; a ramp is the first thing that is not. So each thing
// that asks "how high is the ground here" or "is there something in the way" is held to it here: the knight's own
// movement (played with the real controller), the ground under a shadow or a falling ember, the camera's line of
// sight, the jump checker, and the Move Garden's three ramps.
import './../src/core/colorSetup';
import * as THREE from 'three';
import { PlayerController, type PlayerInput } from '../src/player/controller';
import { aabbOf, slopeOf, topAt, topUnder, type Aabb } from '../src/world/collision';
import { MAX_WALK_SLOPE, extent, rampBox, type Box } from '../src/world/layout';
import { sight } from '../src/camera/followCamera';
import { groundFrom } from '../src/world/embers';
import { computeReach } from '../src/levels/reach';
import { compileCustom, emptyCustom } from '../src/levels/custom';
import { garden, GARDEN, RAMPS, RAMP_LANDING } from '../src/levels/garden';
import { buildChamber } from '../src/world/chamber';
import { TUNING } from '../src/data/tuning';
import type { LevelDef } from '../src/levels/types';

const DT = 1 / 60;
let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}
const inp = (o: Partial<PlayerInput>): PlayerInput => ({ move: new THREE.Vector3(), run: true, jumpPressed: false, jumpHeld: false, attackPressed: false, dodgeHeld: false, dodgePressed: false, guardHeld: false, stowPressed: false, ...o } as PlayerInput);
const v = (x: number, z: number): THREE.Vector3 => new THREE.Vector3(x, 0, z);
const R = TUNING.rat.radius;

// ---- The shape itself ----
{
  // Ten long, climbing toward +x from the floor to four up; two wide.
  const r = aabbOf(rampBox('stone', 0, 10, -1, 1, 0, 4, 'e'));
  check('a ramp\'s top is its slope: its low end at one height, its high end at another, evenly between', topAt(r, 0, 0) === 0 && topAt(r, 10, 0) === 4 && Math.abs(topAt(r, 5, 0) - 2) < 1e-9 && Math.abs(topAt(r, 2.5, 0.9) - 1) < 1e-9);
  check('...beside it, the height of its nearest edge', topAt(r, -3, 0) === 0 && topAt(r, 14, 0) === 4 && Math.abs(topAt(r, 5, 7) - 2) < 1e-9);
  check('...and it knows how steep it is', Math.abs(slopeOf(r) - 0.4) < 1e-9 && slopeOf(aabbOf(extent('stone', 0, 1, 0, 1, 0, 1))) === 0);
  check('what he would have to step onto is its top at the uphill edge of his footprint', Math.abs(topUnder(r, 5, 0, 0.3) - 2.12) < 1e-9);
  const w = aabbOf(rampBox('stone', 0, 10, -1, 1, 1, 4, 'w', 0));
  check('one that climbs the other way, from a low end that is itself a step up', topAt(w, 10, 0) === 1 && topAt(w, 0, 0) === 4 && w.min.y === 0 && Math.abs(topAt(w, 5, 0) - 2.5) < 1e-9);
  const n = aabbOf(rampBox('stone', -1, 1, 0, 6, 0, 3, 'n'));
  check('north is -z: a ramp that climbs north is high at its -z end', topAt(n, 0, 0) === 3 && topAt(n, 0, 6) === 0);
}

// ---- Played ----
/** A floor, and on it a ramp climbing toward +x from x = 0 to x = `len`, `rise` high, four wide, with a landing at its top. */
function hill(len: number, rise: number): Aabb[] {
  return [aabbOf(extent('floor', -40, 60, -1, 0, -40, 40)), aabbOf(rampBox('stone', 0, len, -2, 2, 0, rise, 'e')), aabbOf(extent('stone', len, len + 6, 0, rise, -2, 2))];
}
interface Walk { p: PlayerController; air: number; off: number; frames: number }
/** Walks (or runs) him from a place in a direction for a time; counts frames not on the ground, and how far his feet were from the slope. */
function walk(cs: Aabb[], from: THREE.Vector3, move: THREE.Vector3, secs: number, run = true): Walk {
  const p = new PlayerController(from.clone());
  for (let i = 0; i < 20; i++) p.update(DT, inp({}), cs);
  let air = 0;
  let off = 0;
  const frames = Math.round(secs / DT);
  for (let i = 0; i < frames; i++) {
    p.update(DT, inp({ move, run }), cs);
    if (!p.grounded) air++;
    else off = Math.max(off, Math.abs(p.position.y - Math.max(...cs.map((b) => (p.position.x + R > b.min.x && p.position.x - R < b.max.x && p.position.z + R > b.min.z && p.position.z - R < b.max.z ? topAt(b, p.position.x, p.position.z) : -99)))));
  }
  return { p, air, off, frames };
}
for (const [len, rise, name] of [[12, 3, 'a gentle slope (1 up in 4)'], [6, 3, 'a hill (1 up in 2)'], [3, 3, 'the steepest he walks (1 up in 1)']] as Array<[number, number, string]>) {
  const cs = hill(len, rise);
  const up = walk(cs, v(-2, 0), v(1, 0), (len + 4) / TUNING.move.run + 0.6);
  check(`${name}: he runs up it from the floor onto the landing, his feet on the slope all the way`, up.p.grounded && Math.abs(up.p.position.y - rise) < 1e-6 && up.p.position.x > len && up.air === 0 && up.off < 1e-6, `ends ${up.p.position.x.toFixed(1)} along, ${up.p.position.y.toFixed(2)} up; ${up.air} frames in the air`);
  const down = walk(cs, new THREE.Vector3(len + 2, rise, 0), v(-1, 0), (len + 4) / TUNING.move.run + 0.6);
  check('...and runs down it without once leaving the ground (it falls away under him faster than he falls)', down.p.grounded && Math.abs(down.p.position.y) < 1e-6 && down.p.position.x < 0 && down.air === 0 && down.off < 1e-6, `${down.air} frames in the air of ${down.frames}`);
  const slow = walk(cs, v(-1, 0), v(1, 0), (len / 2 + 1) / TUNING.move.walk, false);
  check('...walking, he climbs it too', slow.p.grounded && slow.air === 0 && slow.p.position.y > rise * 0.3 && slow.p.position.y < rise - 0.01, `${slow.p.position.y.toFixed(2)} up`);
  const y0 = slow.p.position.y, x0 = slow.p.position.x;
  for (let i = 0; i < 120; i++) slow.p.update(DT, inp({}), cs);
  // (He takes a moment to stop, as on the flat; then he does not move again.)
  const y1 = slow.p.position.y, x1 = slow.p.position.x;
  for (let i = 0; i < 120; i++) slow.p.update(DT, inp({}), cs);
  check('...and stands still on it where he stops: he does not slide', slow.p.grounded && Math.abs(x1 - x0) < 0.35 && Math.abs(y1 - y0 - (x1 - x0) * (rise / len)) < 1e-6 && slow.p.position.x === x1 && slow.p.position.y === y1 && slow.p.velocity.length() < 1e-6, `he took ${Math.abs(x1 - x0).toFixed(2)} to stop, then did not move`);
}
{
  const cs = hill(6, 3);
  // Across it: along its width, half way up.
  const across = walk(cs, new THREE.Vector3(3, 1.5, -1.5), v(0, 1), 0.4);
  check('he walks across a slope at one height', across.air === 0 && Math.abs(across.p.position.y - 1.5) < 1e-6 && across.p.position.z > 0.3);
  // Off its side, half way up: there is nothing there, and he falls to the floor.
  const side = walk(cs, new THREE.Vector3(3, 1.5, 1), v(0, 1), 1.2);
  check('walking off its side he falls to the floor beside it', side.p.grounded && Math.abs(side.p.position.y) < 1e-6 && side.p.position.z > 2.3 && side.air > 5);
  // Into its side from the floor, half way along: that is a wall a unit and a half high.
  const wall = walk(cs, v(3, 4), v(0, -1), 1.2);
  check('its side is a wall where it stands higher than a step: he does not walk into it', wall.p.grounded && Math.abs(wall.p.position.y) < 1e-6 && Math.abs(wall.p.position.z - (2 + R)) < 0.02, `stopped at z ${wall.p.position.z.toFixed(2)}`);
  // ...but near its foot, where its side is no higher than a step, he steps up onto it.
  const foot = walk(cs, v(0.4, 4), v(0, -1), 0.55);
  check('...near its foot, where its side is lower than a step, he steps up onto it', foot.p.grounded && foot.p.position.z < 1.5 && Math.abs(foot.p.position.y - topAt(cs[1], foot.p.position.x, 0)) < 1e-6);
  // Into its high end from behind: the landing is there in this hill, so take the landing away.
  const bare = [cs[0], cs[1]];
  const back = walk(bare, v(9, 0), v(-1, 0), 1.2);
  check('its high end is a wall as high as it is', back.p.grounded && Math.abs(back.p.position.y) < 1e-6 && Math.abs(back.p.position.x - (6 + R)) < 0.02);
  // A jump over the low end: the air there, inside the ramp's box, is air.
  const p = new PlayerController(new THREE.Vector3(1.5, 0, 5));
  for (let i = 0; i < 10; i++) p.update(DT, inp({}), cs);
  p.update(DT, inp({ move: v(0, -1), jumpPressed: true, jumpHeld: true }), cs);
  let blockedAt = -1;
  for (let i = 0; i < 90 && !p.grounded; i++) {
    const before = p.position.z;
    p.update(DT, inp({ move: v(0, -1), jumpHeld: true }), cs);
    if (!p.grounded && blockedAt < 0 && Math.abs(p.position.z - before) < 1e-6) blockedAt = i;
  }
  check('jumping across its low end he passes through the air over it (the air inside its box is air), and lands on the slope or beyond', blockedAt < 0 && p.grounded && p.position.z < 2, `landed at z ${p.position.z.toFixed(2)}, ${p.position.y.toFixed(2)} up`);
  // Jumping on it, and landing on it.
  const j = new PlayerController(new THREE.Vector3(2, 1, 0));
  for (let i = 0; i < 10; i++) j.update(DT, inp({}), cs);
  j.update(DT, inp({ jumpPressed: true, jumpHeld: true }), cs);
  let peak = 0;
  let landed = -1;
  for (let i = 0; i < 120 && landed < 0; i++) {
    j.update(DT, inp({ jumpHeld: true }), cs);
    peak = Math.max(peak, j.position.y);
    if (j.grounded) landed = i;
  }
  check('he jumps from a slope as high as from the flat, and lands back on it', Math.abs(peak - 1 - 2.43) < 0.06 && landed > 30 && Math.abs(j.position.y - 1) < 1e-6, `rose ${(peak - 1).toFixed(2)}`);
  // Run off the top of the landing's far end: an ordinary ledge, an ordinary fall.
  const far = walk(cs, new THREE.Vector3(10, 3, 0), v(1, 0), 1.6);
  check('off the far end of the landing he falls as off any ledge (he is not held to a floor three units down)', far.p.grounded && Math.abs(far.p.position.y) < 1e-6 && far.air > 15);
  // The edge at its high end can be caught; its sloping sides cannot.
  const grab = (from: THREE.Vector3, move: THREE.Vector3): boolean => {
    const q = new PlayerController(from.clone());
    for (let i = 0; i < 10; i++) q.update(DT, inp({}), bare);
    q.update(DT, inp({ move, jumpPressed: true, jumpHeld: true }), bare);
    for (let i = 0; i < 120; i++) {
      q.update(DT, inp({ move, jumpHeld: true }), bare);
      if (q.state === 'hang') return true;
      if (q.grounded && i > 5) return false;
    }
    return false;
  };
  check('he catches the edge at its high end (three up: a jump and a grab), as on any block', grab(v(7.2, 0), v(-1, 0)));
  check('...but not its sloping side: that is no edge', !grab(v(5, 3.4), v(0, -1)));
}
{
  // Steeper than he walks: it is a wall from below. (Sliding down such a slope is the next step, not this one.)
  const cs = hill(2, 3);
  const up = walk(cs, v(-2, 0), v(1, 0), 1.5);
  check('a slope steeper than one in one cannot be walked up: he stops at its foot', MAX_WALK_SLOPE === 1 && up.p.grounded && up.p.position.y < 0.5 && up.p.position.x < 0.6, `at ${up.p.position.x.toFixed(2)}, ${up.p.position.y.toFixed(2)} up`);
}

// ---- The ground under things, the camera, the jump checker ----
{
  const cs = hill(6, 3);
  const ground = groundFrom(cs);
  check('what falls on a ramp (a drop of fire) lands on its slope, not on the top of its box', Math.abs((ground(2, 9, 0) ?? -1) - 1) < 1e-9 && ground(-3, 9, 0) === 0 && ground(8, 9, 0) === 3);
  // He stands half way up; the view is behind and above him, down the slope. Nothing is in the way.
  const chest = new THREE.Vector3(3, 1.5 + 0.8, 0);
  check('standing on a ramp he is not "inside" it for the camera: a line from his chest back down the slope is clear', sight(chest, new THREE.Vector3(-0.5, 3, 0), cs) === 1 && sight(chest, new THREE.Vector3(3, 3.5, 3.4), cs) === 1);
  const hit = sight(new THREE.Vector3(-2, 0.5, 0), new THREE.Vector3(8, 0.5, 0), cs);
  check('...but a line that goes into the slope meets it where it goes in', Math.abs(-2 + hit * 10 - 1) < 0.02, `at x ${(-2 + hit * 10).toFixed(2)} (the slope is half a unit up at x = 1)`);
  check('...and one over its low end, inside its box but above the slope, passes', sight(new THREE.Vector3(1, 2.5, -5), new THREE.Vector3(1, 2.5, 5), cs) === 1 && sight(new THREE.Vector3(5, 2, -5), new THREE.Vector3(5, 2, 5), cs) < 1);
}
{
  // The jump checker: a prize on a tower nine up, with a ramp, a landing and two more ramps doubling back up to it.
  const tower = (ramps: boolean): LevelDef => {
    const c = emptyCustom();
    // (In the middle of the room, well clear of its walls: nothing to kick up between.)
    c.pieces.push({ t: 'stone', x0: 2, z0: -2, x1: 6, z1: 2, top: 9, bottom: 0 }, { t: 'crumb', x0: 4, z0: 0, x1: 4, z1: 0, top: 9 });
    if (ramps) c.pieces.push({ t: 'ramp', x0: -7, z0: -2, x1: 2, z1: 2, top: 9, bottom: 0, dir: 'e' });
    return compileCustom(c);
  };
  const withRamp = computeReach(tower(true));
  const without = computeReach(tower(false));
  check('the jump checker walks a ramp: a place nine up at the top of one is reached', withRamp.near(4, 9, 0, 1, 0.3, 0.3) && withRamp.near(-2.5, 4.5, 0, 0.6, 0.4, 0.4));
  check('...and without the ramp it is not', !without.near(4, 9, 0, 1, 0.3, 0.3));
  const lv = tower(true);
  const ramp = lv.solids.find((b) => b.ramp);
  check('a ramp piece is one solid with a slope (not a flight of steps), climbing the way it faces', !!ramp && ramp.ramp!.axis === 'x' && ramp.ramp!.up === 1 && ramp.ramp!.low === 0 && ramp.y1 === 9 && ramp.x0 === -7 && ramp.x1 === 2);
}

// ---- The Move Garden's ramps ----
{
  const def = garden();
  const cs = def.solids.map(aabbOf);
  const L = RAMP_LANDING;
  check('the garden has three ramps side by side, each climbing north to the same landing three up', RAMPS.length === 3 && RAMPS.every((r) => def.solids.some((b: Box) => !!b.ramp && b.x0 === r.x0 && b.x1 === r.x1 && b.z0 === L.z1 && b.z1 === L.z1 + r.length && b.y1 === L.top && b.ramp.axis === 'z' && b.ramp.up === -1 && b.ramp.low === 0)) && L.x1 === GARDEN.halfX);
  check('...one up in four, in two and in one, and each board says which', RAMPS.map((r) => L.top / r.length).join() === '0.25,0.5,1' && RAMPS.every((r, i) => r.lines[0] === ['1 UP IN 4', '1 UP IN 2', '1 UP IN 1'][i]) && RAMPS.every((r) => def.decor.some((d) => d.kind === 'sign' && d.lines === r.lines)));
  for (const r of RAMPS) {
    const mid = (r.x0 + r.x1) / 2;
    const up = walk(cs, new THREE.Vector3(mid, 0, L.z1 + r.length + 1.5), v(0, -1), (r.length + 3.5) / TUNING.move.run + 0.4);
    const down = walk(cs, new THREE.Vector3(mid, L.top, L.z1 - 1.5), v(0, 1), (r.length + 3.5) / TUNING.move.run + 0.4);
    check(`the garden's "${r.lines[0]}": he runs up it onto the landing and back down it, never off the ground`, up.p.grounded && Math.abs(up.p.position.y - L.top) < 1e-6 && up.air === 0 && down.p.grounded && Math.abs(down.p.position.y) < 1e-6 && down.air === 0, `${up.air} and ${down.air} frames in the air`);
  }
  let built = true;
  try {
    buildChamber({ solids: def.solids, pit: def.pit, water: def.water, decor: def.decor, movers: [] } as never);
  } catch (e) {
    built = false;
    console.log(String(e));
  }
  check('the garden builds with its ramps drawn', built);
  check('and the jump checker reaches the landing by them', computeReach(def).near((L.x0 + L.x1) / 2, L.top, (L.z0 + L.z1) / 2, 1, 0.3, 0.3));
}

console.log(failures === 0 ? 'ramps: all passed' : `ramps: ${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
