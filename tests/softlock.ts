// The full playthrough check: every place he can get to in every level, he can get back out of. The reach search is
// run forwards from the start and then backwards from the door; anything in the first and not the second is a trap.
import * as THREE from 'three';
import { PlayerController, PlayerInput } from '../src/player/controller';
import { makeAabb } from '../src/world/collision';
import { LEVELS } from '../src/levels/levels';
import { HUB_GUEST_DOORS } from '../src/levels/junction';
import type { LevelDef } from '../src/levels/types';
import { computeReach } from '../src/levels/reach';
import { compileCustom, emptyCustom } from '../src/levels/custom';

let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}

/** Trap points grouped into spots (anything within 1.5 of each other), biggest first. */
function clusters(pts: Array<[number, number, number]>): Array<{ x: number; z: number; h: number; n: number }> {
  const left = pts.slice();
  const out: Array<{ x: number; z: number; h: number; n: number }> = [];
  while (left.length) {
    const group = [left.pop()!];
    for (let g = 0; g < group.length; g++) {
      for (let k = left.length - 1; k >= 0; k--) {
        const [x, z, h] = left[k];
        if (Math.abs(x - group[g][0]) <= 1.5 && Math.abs(z - group[g][1]) <= 1.5 && Math.abs(h - group[g][2]) <= 1.5) group.push(...left.splice(k, 1));
      }
    }
    const avg = (i: number): number => group.reduce((s, p) => s + p[i], 0) / group.length;
    out.push({ x: avg(0), z: avg(1), h: avg(2), n: group.length });
  }
  return out.sort((a, b) => b.n - a.n);
}

for (const def of LEVELS) {
  const t0 = Date.now();
  const r = computeReach(def, { traps: true });
  const spots = clusters(r.traps ?? []);
  const say = spots.slice(0, 6).map((s) => `${s.n} at ${s.x.toFixed(1)},${s.h.toFixed(1)},${s.z.toFixed(1)}`).join('; ');
  check(`${def.id}: nowhere to get stuck`, spots.length === 0, `${r.reached} places, ${Date.now() - t0} ms${say ? ` — ${say}` : ''}`);
}

// ---- Where he is put down: the start of every area, and in front of each door he comes back out of ----
// The real controller stands him there for three seconds: he must land on his feet, out of the lava, and not drop away.
// And from there the way out must be open too (the search run again from that spot, so a door up a one-way ledge is seen).
const idle = { move: new THREE.Vector3(), run: false, jumpPressed: false, jumpHeld: false, attackPressed: false, dodgeHeld: false, dodgePressed: false, guardHeld: false, stowPressed: false } as PlayerInput;
function standAt(def: LevelDef, x: number, y: number, z: number): { ok: boolean; why: string } {
  const cs = [
    ...def.solids.map((b) => makeAabb((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, (b.z0 + b.z1) / 2, b.x1 - b.x0, b.y1 - b.y0, b.z1 - b.z0)),
    ...(def.gates ?? []).map((g) => makeAabb(g.x, (g.y ?? 0) + g.height / 2, g.z, g.alongZ ? 0.3 : g.width, g.height, g.alongZ ? g.width : 0.3)),
  ];
  const p = new PlayerController(new THREE.Vector3(x, y, z));
  p.water = def.water;
  for (let t = 0; t < 180; t++) p.update(1 / 60, idle, cs);
  const q = p.position;
  const lava = (def.lava ?? []).some((l) => q.x > l.x0 - 0.3 && q.x < l.x1 + 0.3 && q.z > l.z0 - 0.3 && q.z < l.z1 + 0.3 && q.y < l.y + 1);
  if (lava) return { ok: false, why: 'in the lava' };
  if (!p.grounded && !p.swimming) return { ok: false, why: `not on his feet (at ${q.y.toFixed(2)})` };
  if (Math.abs(q.y - y) > 0.7 && !p.swimming) return { ok: false, why: `dropped from ${y.toFixed(2)} to ${q.y.toFixed(2)}` };
  if (Math.hypot(q.x - x, q.z - z) > 0.6) return { ok: false, why: `pushed ${Math.hypot(q.x - x, q.z - z).toFixed(2)} aside` };
  return { ok: true, why: '' };
}
const hub = LEVELS.find((l) => l.hub)!;
for (const def of LEVELS) {
  const s = standAt(def, def.spawn.x, def.spawn.y + 0.05, def.spawn.z);
  check(`${def.id}: he starts on his feet`, s.ok, s.why);
}
const arrivals: Array<{ def: LevelDef; name: string; x: number; y: number; z: number }> = [];
for (const def of LEVELS) {
  const doors = [...(def.courseDoors ?? []), ...(def.hub ? Object.entries(HUB_GUEST_DOORS).map(([side, d]) => ({ ...d, name: `the ${side} guest door` })) : [])];
  for (const cd of doors) {
    const d = cd.door;
    arrivals.push({ def, name: cd.name, x: d.x + Math.sin(d.yaw) * 3.2, y: (d.y ?? 0) + 0.05, z: d.z + Math.cos(d.yaw) * 3.2 });
  }
}
check('the Club, every world and the Keep have doors he comes back out of (18 in all: the door to the Glimmer Deep, in the Hollows, made it one more)', arrivals.filter((a) => a.def === hub).length === 6 && ['cistern', 'foundry', 'hollows', 'keep'].every((w) => arrivals.some((a) => a.def.id === w)) && arrivals.length === 18, `${arrivals.length}`);
for (const a of arrivals) {
  const s = standAt(a.def, a.x, a.y, a.z);
  const from = computeReach({ ...a.def, spawn: { ...a.def.spawn, x: a.x, y: a.y, z: a.z } }, { traps: true });
  const stuck = (from.traps ?? []).length;
  check(`${a.def.id}: back out of ${a.name}, he lands on his feet and can go on`, s.ok && from.reached > 50 && stuck === 0, s.why || `${from.reached} places, ${stuck} stuck`);
}

// And it must catch a real trap: a walled yard too tall to climb out of, with steps up the outside to drop in from.
{
  const c = emptyCustom();
  c.pieces.push(
    { t: 'pillar', x0: 10, z0: -14, x1: 24, z1: -13, top: 8 },
    { t: 'pillar', x0: 10, z0: -5, x1: 24, z1: -4, top: 8 },
    { t: 'pillar', x0: 10, z0: -13, x1: 11, z1: -5, top: 8 },
    { t: 'pillar', x0: 23, z0: -13, x1: 24, z1: -5, top: 8 },
    { t: 'stone', x0: 4, z0: -10, x1: 6, z1: -8, top: 2 },
    { t: 'stone', x0: 6, z0: -10, x1: 8, z1: -8, top: 4 },
    { t: 'stone', x0: 8, z0: -10, x1: 10, z1: -8, top: 6 },
  );
  const r = computeReach(compileCustom(c), { traps: true });
  const inYard = (r.traps ?? []).filter(([x, z, h]) => x > 11 && x < 23 && z > -13 && z < -5 && h < 0.5);
  check('a walled yard he can drop into but not climb out of is a trap', inYard.length > 50, `${inYard.length} points`);
  const outside = (r.traps ?? []).filter(([x, z]) => !(x > 10 && x < 24 && z > -14 && z < -4));
  check('nowhere outside the yard is', outside.length === 0, `${outside.length} points`);
  // Fill it in with steps inside too: then it is no trap.
  c.pieces.push({ t: 'stone', x0: 11, z0: -10, x1: 13, z1: -8, top: 3 }, { t: 'stone', x0: 13, z0: -10, x1: 15, z1: -8, top: 6 });
  const r2 = computeReach(compileCustom(c), { traps: true });
  check('with steps up the inside it is not', (r2.traps ?? []).length === 0, `${(r2.traps ?? []).length} points`);
}

console.log(failures ? `\n${failures} FAILED` : '\nall passed');
process.exit(failures ? 1 : 0);
