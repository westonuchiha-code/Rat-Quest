// The door scene timing, level progress, and doors.
import { REVEAL, revealFrame } from '../src/core/revealCutscene';
import { LEVELS_KEY, LevelProgress } from '../src/core/levelProgress';
import { atDoor, doorCamera, doorOn, doorFrameBoxes, DOOR_FRAME, DOOR_REACH } from '../src/world/rooms';
import { LEVELS, TEST_ROOMS } from '../src/levels/levels';
import { ceilingOf, CEILING_CLEAR } from '../src/world/layout';
import { HUB_GUEST_DOORS } from '../src/levels/junction';

let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}

const start = revealFrame(0);
const end = revealFrame(REVEAL.total);
check('the scene starts with a normal camera and no door', start.camBlend === 0 && start.sparkle === 0 && start.fade === 0 && !start.done);
check('and ends with the camera back, the door solid and the scene done', end.camBlend === 0 && end.fade === 1 && end.done);
check('he looks both ways before the camera moves', revealFrame(0.6).lookOffset > 0.3 && revealFrame(1.8).lookOffset < -0.3 && revealFrame(REVEAL.look).faceDoor === 0);
check('the room rumbles in the middle and is still at the ends', revealFrame(2.5).rumble > 0.03 && revealFrame(0.5).rumble === 0 && revealFrame(7).rumble === 0);
check('the camera is on the wall while the door appears', revealFrame(6).camBlend === 1 && revealFrame(REVEAL.panEnd).camBlend === 1);
let ordered = true;
let prev = revealFrame(0);
for (let t = 0.05; t <= REVEAL.total; t += 0.05) {
  const f = revealFrame(t);
  if (f.sparkle < prev.sparkle - 1e-9 || f.fade < prev.fade - 1e-9) ordered = false;
  prev = f;
}
check('sparkles and the door only ever grow', ordered);
check('sparkles come before the door fades in', revealFrame(5).sparkle > 0.5 && revealFrame(5).fade === 0 && revealFrame(7).fade > 0.3);
check('the door fade is slow, not a pop', revealFrame(6.4).fade > 0 && revealFrame(6.4).fade < 0.7 && REVEAL.fadeEnd - REVEAL.sparkleEnd >= 2);

const store = { data: new Map<string, string>(), getItem(k: string) { return this.data.get(k) ?? null; }, setItem(k: string, v: string) { this.data.set(k, v); } };
const lp = new LevelProgress(store);
check('nothing is cleared at first', !lp.cleared('a') && !lp.perfect('a') && lp.last === null);
lp.markCleared('a');
lp.markPerfect('a');
lp.setLast('b');
const again = new LevelProgress(store);
check('clearing, completing and the last level are remembered', again.cleared('a') && again.perfect('a') && !again.cleared('b') && again.last === 'b' && store.data.has(LEVELS_KEY));
again.reset();
check('reset forgets everything', !new LevelProgress(store).cleared('a') && new LevelProgress(store).last === null);
store.data.set(LEVELS_KEY, '{nope');
check('a broken save is ignored', !new LevelProgress(store).cleared('a'));

// Doors on every wall face into the room.
for (const side of ['north', 'south', 'east', 'west'] as const) {
  const d = doorOn(side, 10);
  const fx = Math.sin(d.yaw);
  const fz = Math.cos(d.yaw);
  const inside = Math.hypot(d.x + fx * 2, d.z + fz * 2) < Math.hypot(d.x, d.z);
  check(`the ${side} door faces into the room and works at its foot`, inside && atDoor(d, d.x + fx * 0.6, d.z + fz * 0.6) && !atDoor(d, d.x + fx * 6, d.z + fz * 6));
}
const cam = doorCamera(doorOn('east', 20));
check('the camera for a door stands in front of it, looking at it', cam.pos[0] < 19 && Math.abs(cam.pos[2]) < 0.01 && cam.look[0] > 19);

// A door's stone frame is solid, as drawn: a jamb either side of the opening and a step across its foot. (It was only
// drawn: he walked into the jambs and stood in them.)
for (const side of ['north', 'south', 'east', 'west'] as const) {
  const d = doorOn(side, 20, 3, 20, 2);
  const [left, right, step] = doorFrameBoxes(d);
  const fx = Math.round(Math.sin(d.yaw)), fz = Math.round(Math.cos(d.yaw));
  // Across the door and out from it, for a point in the world.
  const across = (x: number, z: number): number => (x - d.x) * fz - (z - d.z) * fx;
  const out = (x: number, z: number): number => (x - d.x) * fx + (z - d.z) * fz;
  const span = (b: { x0: number; x1: number; z0: number; z1: number }) => {
    const c = [[b.x0, b.z0], [b.x1, b.z1]].map(([x, z]) => [across(x, z), out(x, z)]);
    return { a0: Math.min(c[0][0], c[1][0]), a1: Math.max(c[0][0], c[1][0]), o0: Math.min(c[0][1], c[1][1]), o1: Math.max(c[0][1], c[1][1]) };
  };
  const L = span(left), R = span(right), S = span(step);
  const r = d.width / 2;
  const close = (a: number, b: number): boolean => Math.abs(a - b) < 1e-6;
  check(`a door on the ${side} wall: a jamb either side of the opening, half a unit out from the door, up to where the arch springs`, close(L.a1, -r) && close(R.a0, r) && close(L.a0, -r - DOOR_FRAME.jamb - DOOR_FRAME.stagger) && close(R.a1, r + DOOR_FRAME.jamb + DOOR_FRAME.stagger) && close(L.o1, 0.5) && close(R.o1, 0.5) && L.o0 < 0 && left.y0 === 2 && close(left.y1, 2 + d.height - r) && close(right.y1, left.y1));
  check('...its step runs across the foot of both jambs, a tenth high: he walks up onto it', S.a0 < L.a0 && S.a1 > R.a1 && close(step.y1 - step.y0, 0.1) && close(S.o1, 0.9));
  // Standing where he goes through the door, he is in neither jamb.
  const clear = [-0.9, 0, 0.9].every((a) => [0.35, 1, 1.8].every((o) => {
    const x = d.x + a * fz + o * fx, z = d.z - a * fx + o * fz;
    return atDoor(d, x, z) === (o < DOOR_REACH + 0.6) && [left, right].every((b) => x + 0.3 <= b.x0 + 1e-6 || x - 0.3 >= b.x1 - 1e-6 || z + 0.3 <= b.z0 + 1e-6 || z - 0.3 >= b.z1 - 1e-6);
  }));
  check('...and the opening between them is clear: he can still walk up to the door and through it', clear);
}
{
  // In the game itself: no door's jambs stand in another door's opening, or inside something he must reach.
  const doors = LEVELS.flatMap((l) => [...(l.hub ? [] : [{ l, d: l.exit }]), ...(l.courseDoors ?? []).map((c) => ({ l, d: c.door })), ...(l.hub ? Object.values(HUB_GUEST_DOORS).map((g) => ({ l, d: g.door })) : [])]);
  const bad = doors.filter(({ l, d }) => {
    const jambs = doorFrameBoxes(d).slice(0, 2);
    const hit = (x: number, y: number, z: number, rad: number): boolean => jambs.some((b) => x + rad > b.x0 && x - rad < b.x1 && z + rad > b.z0 && z - rad < b.z1 && y < b.y1 && y + 1 > b.y0);
    return hit(l.spawn.x, l.spawn.y, l.spawn.z, 0.3) || (l.npcs ?? []).some((n) => hit(n.x, n.y ?? 0, n.z, 0.35)) || l.collectibles.some((c) => hit(c.x, c.y - 0.5, c.z, 0.2)) || (l.wedges ?? []).some((w) => hit(w.x, w.y, w.z, 0.3));
  });
  check(`none of the game's ${doors.length} doors has a jamb where he starts, where someone stands, or over something to pick up`, bad.length === 0 && doors.length > 30, bad.map((b) => b.l.id).join(', '));
}

// Every level has a ceiling. (Over the walls there was nothing but the dark; the owner, 2026-11-15: "the ceiling has
// no texture??") It covers everything inside the outer walls, sits on the walls or higher, and is clear of his head
// wherever he can stand.
{
  const all = [...LEVELS, ...TEST_ROOMS];
  const none = all.filter((l) => !ceilingOf(l.solids));
  check(`all ${all.length} levels have a ceiling`, none.length === 0, none.map((l) => l.id).join(', '));
  const wrong = all.filter((l) => {
    const c = ceilingOf(l.solids);
    if (!c) return false;
    const walls = l.solids.filter((b) => b.kind === 'wall' && !b.hidden);
    const outer = walls.filter((b) => b.x0 === c.x0 || b.x1 === c.x1 || b.z0 === c.z0 || b.z1 === c.z1);
    const covers = l.solids.every((b) => b.kind !== 'wall' || b.hidden || (b.x0 >= c.x0 && b.x1 <= c.x1 && b.z0 >= c.z0 && b.z1 <= c.z1));
    const onWalls = outer.every((b) => b.y1 <= c.y + 1e-6) && c.wallTop <= c.y + 1e-6;
    const clear = l.solids.every((b) => outer.includes(b) || b.y1 + CEILING_CLEAR <= c.y + 1e-6);
    return !(covers && onWalls && clear);
  });
  check('each covers its level, is no lower than its outer walls, and is clear of his head (a double jump and his own height) over everything inside them', wrong.length === 0, wrong.map((l) => l.id).join(', '));
  const hub = LEVELS.find((l) => l.hub)!;
  const c = ceilingOf(hub.solids)!;
  check('the Club\'s sits right on top of its walls', c.y === c.wallTop && c.y > 8, `${c.y} up`);
  check('a place with no walls round it has none', ceilingOf(hub.solids.filter((b) => b.kind !== 'wall')) === null);
}

console.log(failures === 0 ? '\nRoom checks passed.' : `\n${failures} room check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
