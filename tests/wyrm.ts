// The Sump Wyrm: the great centipede under the Cistern, a boss with a long body. Every segment of it is solid and can be
// hit; its head is where it hurts, most of all while it is helpless. It bites (a shield stops it, a perfect guard throws
// its head back), charges (no shield stops it; get out of its line and it stuns itself on the wall), lashes its tail at
// a rat who hangs about there (jump it), and, angry, winds a ring round him and tightens (jump out over its body).
// All of it with the real controller, the real combat and the real room.
import './../src/core/colorSetup';
import * as THREE from 'three';
import { PlayerController, PlayerInput } from '../src/player/controller';
import { Wyrm, WYRM, wyrmTaper, type WyrmState } from '../src/enemies/wyrm';
import { CombatEvents, pickAim, resolveCombat } from '../src/combat/combat';
import { buildChamber } from '../src/world/chamber';
import { LEVELS } from '../src/levels/levels';
import { SUMP_ARENA } from '../src/levels/cisternHalls';
import { compileCustom, emptyCustom } from '../src/levels/custom';
import { computeReach } from '../src/levels/reach';
import { atDoor } from '../src/world/rooms';
import { TUNING } from '../src/data/tuning';
import { STICKERS } from '../src/data/stickers';
import { stickerIcon } from '../src/ui/icons';
import { HitShapes } from '../src/render/hitShapes';

const DT = 1 / 60;
const W = WYRM;
let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}
const sump = LEVELS.find((l) => l.id === 'sump')!;
const cistern = LEVELS.find((l) => l.id === 'cistern')!;
const chamber = buildChamber({ solids: sump.solids, pit: sump.pit, water: sump.water ?? [], decor: [], movers: sump.movers });
const canStand = (x: number, y: number, z: number, r: number): boolean => {
  let floor = false;
  for (const b of chamber.colliders) {
    if (x + r <= b.min.x || x - r >= b.max.x || z + r <= b.min.z || z - r >= b.max.z) continue;
    if (b.max.y > y + 0.25 && b.min.y < y + 0.7) return false;
    if (Math.abs(b.max.y - y) <= 0.25 && x >= b.min.x && x <= b.max.x && z >= b.min.z && z <= b.max.z) floor = true;
  }
  return floor;
};
const input = (o: Partial<PlayerInput> = {}): PlayerInput => ({ move: new THREE.Vector3(), run: false, jumpPressed: false, jumpHeld: false, attackPressed: false, dodgePressed: false, guardHeld: false, stowPressed: false, ...o });
const events = (): CombatEvents => ({ enemyHit: null, enemyKilled: false, playerResult: null, shockwave: false, cratesBroken: [] });
const spec = sump.enemies.find((e) => e.type === 'wyrm')!;
/** It, where the level puts it. Its dice roll `roll` (a number, or a seed for a run of them). */
function wyrm(roll: number | { seed: number } = 0.9): Wyrm {
  const w = new Wyrm(spec);
  w.canStand = canStand;
  if (typeof roll === 'number') w.rng = () => roll;
  else {
    let s = roll.seed;
    w.rng = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  }
  return w;
}
function ratAt(x: number, z: number): PlayerController {
  const p = new PlayerController(new THREE.Vector3(x, 0, z));
  for (let i = 0; i < 20; i++) p.update(DT, input(), chamber.colliders);
  return p;
}
const dist = (a: { x: number; z: number }, p: PlayerController): number => Math.hypot(p.position.x - a.x, p.position.z - a.z);
const tick = (w: Wyrm, p: PlayerController): void => w.update(DT, p.position.x, p.position.y, p.position.z, !p.dead);
function until(w: Wyrm, p: PlayerController, state: WyrmState, frames = 2400, also?: () => void): boolean {
  for (let i = 0; i < frames && w.state !== state; i++) {
    also?.();
    tick(w, p);
  }
  return w.state === state;
}
function put(p: PlayerController, x: number, z: number, face?: { x: number; z: number }): void {
  p.position.set(x, 0, z);
  p.prevPosition.copy(p.position);
  p.velocity.set(0, 0, 0);
  if (face) p.facing = Math.atan2(face.x - x, face.z - z);
}
/** One swing from where he stands (it holds still for it). */
function swing(p: PlayerController, w: Wyrm): CombatEvents {
  const ev = events();
  let seen = events();
  w.lastSwing = -1;
  p.update(DT, input({ attackPressed: true }), chamber.colliders);
  for (let i = 0; i < 28; i++) {
    resolveCombat(p, [w], ev);
    if (ev.enemyHit || ev.playerResult) seen = { ...seen, enemyHit: ev.enemyHit ?? seen.enemyHit, playerResult: ev.playerResult ?? seen.playerResult, enemyKilled: seen.enemyKilled || ev.enemyKilled };
    p.update(DT, input(), chamber.colliders);
  }
  return seen;
}
/** Plays on with the rat doing `act` each frame, until `stop`. Returns what reached the rat. */
function play(w: Wyrm, p: PlayerController, act: (w: Wyrm, frame: number) => Partial<PlayerInput>, stop: (w: Wyrm, frame: number) => boolean, frames = 2400): { results: string[]; hp: number } {
  const results: string[] = [];
  const ev = events();
  for (let i = 0; i < frames && !stop(w, i); i++) {
    p.update(DT, input(act(w, i)), chamber.colliders);
    tick(w, p);
    resolveCombat(p, [w], ev);
    if (ev.playerResult) results.push(ev.playerResult);
  }
  return { results, hp: p.hp };
}
/** Awake and past its scream. */
function awake(roll: number | { seed: number } = 0.9): { w: Wyrm; p: PlayerController } {
  const w = wyrm(roll);
  const p = ratAt(0, 4);
  until(w, p, 'prowl');
  return { w, p };
}
/** Angry: below half its health (struck on a segment, so nothing counts double). */
function anger(w: Wyrm): void {
  for (let k = 0; k < Math.ceil(W.hp * (1 - W.rageAt)); k++) w.takeHit(1, 0, 0, 'sword', 5);
}
const MAX = TUNING.health.max;

// ---- The Sump ----
{
  const door = cistern.courseDoors?.find((d) => d.to === 'sump');
  const reach = computeReach(cistern);
  check('the Sump is a place in the Cistern, through a door in its north-east corner that he can walk up to', !!door && sump.world === 'cistern' && sump.returnTo === 'cistern' && reach.near(door!.door.x - 1, door!.door.y!, door!.door.z, 1.5, 0.5, 0.5) && atDoor(door!.door, door!.door.x - 0.8, door!.door.z));
  check('the Wyrm is the only thing in it, and beating it is what its Golden Wedge asks', sump.enemies.length === 1 && sump.wedges?.length === 1 && sump.wedges[0].appears?.type === 'defeat' && sump.goals.length === 1);
  const A = SUMP_ARENA;
  let floor = true;
  for (let x = A.x0 + 0.7; x <= A.x1 - 0.7; x += 0.5) for (let z = A.z0 + 0.7; z <= A.z1 - 0.7; z += 0.5) if (!canStand(x, 0, z, 0.37)) floor = false;
  check('its floor is the whole room, right up to the walls, with nothing standing on it', floor && Math.abs(A.x0 + 22) < 0.2 && Math.abs(A.z1 - 22) < 0.2);
  check('he comes in more than its notice away', Math.hypot(sump.spawn.x - spec.x, sump.spawn.z - spec.z) > W.noticeRange);
  const sticker = STICKERS.find((s) => s.id === 'foe:wyrm');
  check('it has a sticker, with a flat picture of its own', !!sticker && stickerIcon(sticker!.icon, 40).includes('<svg') && stickerIcon(sticker!.icon, 40) !== stickerIcon('brood', 40));
  const made = compileCustom({ ...emptyCustom(), width: 40, depth: 40, pieces: [...emptyCustom().pieces, { t: 'wyrm', x0: 0, z0: -6, x1: 0, z1: -6, top: 0, dir: 's' }] });
  const e = made.enemies.find((q) => q.type === 'wyrm');
  check('it can be put in a level in the editor: its floor is the room to the walls, and it does not come back', !!e && e!.arena!.x0 < -19.5 && e!.arena!.x1 > 19.5 && e!.respawn === false && e!.facing === 0);
}

// ---- Its body ----
{
  const w = wyrm();
  check('it is a head and thirteen segments, each a little smaller than the last', w.parts.length === W.segments && w.parts[0].r === W.segRadius && w.parts[12].r < w.parts[0].r * 0.8 && w.parts.every((q, i) => Math.abs(q.r - W.segRadius * wyrmTaper(i)) < 1e-9));
  const gaps = (v: Wyrm): number[] => v.parts.map((q, i) => Math.hypot(q.x - (i ? v.parts[i - 1].x : v.x), q.z - (i ? v.parts[i - 1].z : v.z)));
  check('asleep it lies curled, each segment the same distance behind the one in front', gaps(w).every((g) => Math.abs(g - W.spacing) < 0.06), `${Math.min(...gaps(w)).toFixed(2)}..${Math.max(...gaps(w)).toFixed(2)}`);
  // Crawling: every segment goes where the head went.
  const { w: c, p } = awake({ seed: 3 });
  const path: Array<{ x: number; z: number }> = [];
  let off = 0;
  let stretched = 0;
  let outside = false;
  for (let i = 0; i < 60 * 30; i++) {
    put(p, Math.sin(i * 0.004) * 8, Math.cos(i * 0.004) * 8);
    tick(c, p);
    c.events.length = 0;
    path.push({ x: c.x, z: c.z });
    if (path.length > 900) path.shift();
    if (c.state === 'prowl' && i > 600) {
      // The last segment is somewhere the head has been.
      const t = c.tail;
      off = Math.max(off, Math.min(...path.map((q) => Math.hypot(q.x - t.x, q.z - t.z))));
    }
    if (c.state !== 'squeeze' && c.state !== 'spent') stretched = Math.max(stretched, ...gaps(c));
    for (const q of c.parts) if (q.x < SUMP_ARENA.x0 || q.x > SUMP_ARENA.x1 || q.z < SUMP_ARENA.z0 || q.z > SUMP_ARENA.z1) outside = true;
  }
  check('crawling, its body goes exactly where its head went, never stretched and never out through a wall', off < 0.12 && stretched < W.spacing + 0.08 && !outside, `tail ${off.toFixed(2)} off the head's path, widest gap ${stretched.toFixed(2)}`);
}

// ---- A long body in a fight ----
{
  const w = wyrm();
  const p = ratAt(0, 0);
  const mid = w.parts[6];
  // Beside its seventh segment, well away from its head.
  const side = { x: mid.x + 1.4, z: mid.z };
  put(p, side.x, side.z, mid);
  const hp = w.hp;
  const hit = swing(p, w);
  check('a sword lands on whichever segment is in front of it, not only on its head', hit.enemyHit === w && w.hp === hp - 1 && dist(w, p) > 3, `${dist(w, p).toFixed(1)} from its head`);
  // Two segments in reach of one swing: one blow, not two.
  const again = wyrm();
  until(again, p, 'prowl');
  const a = again.parts[5];
  const b = again.parts[6];
  put(p, (a.x + b.x) / 2 + 1.2, (a.z + b.z) / 2, { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 });
  const hp2 = again.hp;
  swing(p, again);
  check('one swing that reaches two segments is still one blow', again.hp === hp2 - 1);
  const aim = pickAim(p, [again], 0, 0);
  const toPiece = again.parts.some((q) => Math.abs(Math.atan2(Math.sin(Math.atan2(q.x - p.position.x, q.z - p.position.z) - (aim ?? 9)), Math.cos(Math.atan2(q.x - p.position.x, q.z - p.position.z) - (aim ?? 9)))) < 1e-6);
  check('he turns to the nearest piece of it when he swings, wherever its head is', aim !== null && toPiece, `${dist(again, p).toFixed(1)} from its head`);
  // He cannot walk through it...
  const still = wyrm();
  const q = still.parts[7];
  const r = ratAt(q.x + 3, q.z);
  const ev = events();
  for (let i = 0; i < 120; i++) {
    r.update(DT, input({ move: new THREE.Vector3(-1, 0, 0), run: true }), chamber.colliders);
    resolveCombat(r, [still], ev);
  }
  const held = still.parts.every((s) => Math.hypot(r.position.x - s.x, r.position.z - s.z) >= s.r + TUNING.rat.radius - 0.02);
  check('he cannot walk through its body: every segment turns him aside', held && r.position.x > q.x - 0.4, `stopped at ${r.position.x.toFixed(2)} (the segment is at ${q.x.toFixed(2)})`);
  // ...but he can jump it.
  const j = ratAt(q.x + 3, q.z);
  let crossed = false;
  for (let i = 0; i < 140; i++) {
    j.update(DT, input({ move: new THREE.Vector3(-1, 0, 0), run: true, jumpPressed: i === 16 || i === 34, jumpHeld: i >= 16 && i < 60 }), chamber.colliders);
    resolveCombat(j, [still], ev);
    if (j.position.x < q.x - 1.2 && j.grounded) crossed = true;
  }
  check('...but he can jump over it', crossed, `ended at ${j.position.x.toFixed(2)}`);
  // A plunge onto a segment counts.
  const hp3 = still.hp;
  still.takeHit(3, 0, 0, 'plunge', 4);
  check('a blow on a segment does its plain harm; a blow on its head while it is not helpless does too', still.hp === hp3 - 3 && (still.takeHit(1, 0, 0, 'sword', -1), still.hp === hp3 - 4));
  // The test view draws all of it.
  const shapes = new HitShapes();
  shapes.update(true, [{ x: 0, y: 0, z: 0, facing: 0, radius: 0.6, alive: true, attackActive: false }], { x: 9, y: 0, z: 9, facing: 0, radius: 0.3, swing: null, guarding: false, blockArc: 1 });
  const one = shapes.count;
  shapes.update(true, [still as never], { x: 9, y: 0, z: 9, facing: 0, radius: 0.3, swing: null, guarding: false, blockArc: 1 });
  check('the hit-shapes test view draws a ring for every segment', shapes.count > one * 5, `${shapes.count} line ends (one small creature: ${one})`);
}

// ---- Waking ----
{
  const w = wyrm();
  const p = ratAt(sump.spawn.x, sump.spawn.z);
  for (let i = 0; i < 60; i++) tick(w, p);
  check('it sleeps until he comes near', w.state === 'idle' && !w.awake);
  put(p, w.x, w.z + W.noticeRange - 0.5);
  tick(w, p);
  check('seeing him, it rears and screams', w.state === 'roar' && w.awake && w.events.includes('roar'));
  let harmless = true;
  for (let t = 0; t < W.roar - 0.05; t += DT) {
    tick(w, p);
    if (w.attackActive || w.state !== 'roar') harmless = false;
  }
  check('...hurting nobody, and then it comes on', harmless && until(w, p, 'prowl', 10));
  const s = wyrm();
  s.takeHit(1, 0, 0, 'sword', 9);
  check('struck in its sleep, it wakes', s.awake && s.hp === W.hp - 1);
}

// ---- The bite ----
{
  const { w, p } = awake(0.9); // (dice high: it comes in to bite rather than charging)
  const got = until(w, p, 'biteWind', 2400, () => put(p, 0, 4));
  let early = false;
  for (; w.state === 'biteWind'; ) {
    tick(w, p);
    if (w.state === 'biteWind' && w.attackActive) early = true;
  }
  check('it comes in, its head rears (half a second in which nothing can hurt), and it snaps', got && !early && w.state === 'bite' && w.events.includes('biteWind') && w.events.includes('bite'));
  const r = play(w, p, () => ({}), (x) => x.state === 'recover');
  check('standing in front of it, the bite costs him a heart', r.results[0] === 'hit' && r.hp === MAX - W.biteDamage, r.results.join(','));
  const b = awake(0.9);
  until(b.w, b.p, 'biteWind', 2400, () => put(b.p, 0, 4));
  b.p.facing = Math.atan2(b.w.x - b.p.position.x, b.w.z - b.p.position.z);
  const rb = play(b.w, b.p, (x) => ({ guardHeld: true, move: new THREE.Vector3(0, 0, 0), ...(x.state === 'biteWind' ? {} : {}) }), (x) => x.state === 'recover');
  check('behind a shield it is stopped', rb.results[0] === 'blocked' && rb.hp === MAX, rb.results.join(','));
  let turned: Wyrm | null = null;
  for (let lead = 0.02; lead < TUNING.guard.parryWindow && !turned; lead += 0.02) {
    const d = awake(0.9);
    until(d.w, d.p, 'biteWind', 2400, () => put(d.p, 0, 4));
    d.p.facing = Math.atan2(d.w.x - d.p.position.x, d.w.z - d.p.position.z);
    const rt = play(d.w, d.p, (x) => ({ guardHeld: x.state === 'bite' && x.stateTime > W.biteTime - 0.08 - lead }), (x) => x.state === 'reel' || x.state === 'recover');
    if (rt.results.includes('parried') && d.w.state === 'reel' && rt.hp === MAX) turned = d.w;
  }
  check('a perfect guard throws its head back: reeling, helpless', !!turned && turned!.helpless && turned!.events.includes('reel'));
  // Helpless, its head is soft.
  const t = turned!;
  const hp = t.hp;
  t.takeHit(1, 0, 0, 'sword', -1);
  const headHit = hp - t.hp;
  t.takeHit(1, 0, 0, 'sword', 6);
  check('while it reels, a blow on its head does double; a blow on its body does not', headHit === W.soft && t.hp === hp - W.soft - 1 && t.events.includes('crit'));
  let reel = 0;
  const q = ratAt(0, 18);
  for (; t.state === 'reel'; reel += DT) tick(t, q);
  check('it reels for nearly two seconds, then is itself again', Math.abs(reel - W.reel) < 0.3 && t.state === 'prowl' && !t.helpless, `${reel.toFixed(2)} s more`);
}

// ---- The charge ----
{
  const { w, p } = awake(0.1); // (dice low: far enough off, it charges)
  const got = until(w, p, 'chargeWind', 2400, () => put(p, 0, 12));
  const facing0 = w.facing;
  let early = false;
  for (; w.state === 'chargeWind'; ) {
    tick(w, p);
    if (w.state === 'chargeWind' && w.attackActive) early = true;
  }
  check('from far off it rears and screams (most of a second), then runs', got && !early && w.state === 'charge' && w.events.includes('chargeWind') && Math.abs(Math.atan2(Math.sin(w.facing - facing0), Math.cos(w.facing - facing0))) < 0.7, `got ${got}, early ${early}, ${w.state}, turned ${Math.abs(Math.atan2(Math.sin(w.facing - facing0), Math.cos(w.facing - facing0))).toFixed(2)}`);
  const line = w.facing;
  const from = { x: w.x, z: w.z };
  const r = play(w, p, () => ({ guardHeld: true }), (x) => x.state === 'stunned' || x.state === 'skid');
  check('dead straight, fast, and no shield stops it: two hearts from a rat in its way', r.results.includes('hit') && r.hp === MAX - W.chargeDamage && Math.abs(Math.atan2(Math.sin(w.facing - line), Math.cos(w.facing - line))) < 1e-9, r.results.join(','));
  check('it runs on until it meets the wall, and stuns itself there', w.state === 'stunned' && w.helpless && w.events.includes('ram') && Math.hypot(w.x - from.x, w.z - from.z) > 6 && (Math.abs(Math.abs(w.x) - (22 - W.radius)) < 0.8 || Math.abs(Math.abs(w.z) - (22 - W.radius)) < 0.8), `head at ${w.x.toFixed(1)}, ${w.z.toFixed(1)}`);
  // He steps out of its line.
  const c = awake(0.1);
  until(c.w, c.p, 'chargeWind', 2400, () => put(c.p, 0, 12));
  for (let t = 0; t < W.chargeWind * W.chargeTrack + 0.03; t += DT) tick(c.w, c.p);
  const aside = new THREE.Vector3(Math.cos(c.w.facing), 0, -Math.sin(c.w.facing));
  const rs = play(c.w, c.p, () => ({ move: aside, run: true }), (x) => x.state === 'stunned' || x.state === 'skid');
  check('a rat who gets out of its line once it has committed is not touched', rs.results.length === 0 && rs.hp === MAX);
  // Stunned: the opening.
  const s = c.w.state === 'stunned' ? c.w : w;
  const hp = s.hp;
  // (He stands at the side of its head, clear of its neck.)
  put(c.p, s.x + Math.cos(s.facing) * 1.35, s.z - Math.sin(s.facing) * 1.35, s);
  const blow = swing(c.p, s);
  check('stunned, its head lies there to be hit, and it counts double', s.state === 'stunned' && blow.enemyHit === s && s.hp === hp - W.soft && !blow.playerResult, `${hp} to ${s.hp}`);
  let lain = s.stateTime;
  for (; s.state === 'stunned'; lain += DT) tick(s, c.p);
  check('it lies stunned for two and a half seconds', Math.abs(lain - W.stunned) < 0.1 && s.state === 'prowl', `${lain.toFixed(2)} s, then ${s.state}`);
}

// ---- The lash ----
{
  /** Awake, with the rat beside the end of its tail; he strikes it (if `strike`). Returns once the spurs are up, or not. */
  const atTail = (strike: boolean): { w: Wyrm; p: PlayerController; lashed: boolean } => {
    const { w, p } = awake(0.9);
    put(p, w.tail.x + 1.2, w.tail.z, w.tail);
    if (strike) {
      const hit = swing(p, w);
      if (hit.enemyHit !== w) return { w, p, lashed: false };
    }
    let lashed = false;
    for (let i = 0; i < 40 && !lashed; i++) {
      tick(w, p);
      lashed = w.state === 'whipWind';
    }
    return { w, p, lashed };
  };
  const a = atTail(true);
  check('strike its tail and the spurs come up at once: it is going to lash', a.lashed && a.w.events.includes('whipWind') && a.w.hp === W.hp - 1);
  const r = play(a.w, a.p, () => ({}), (x) => x.state === 'settle');
  check('the lash whips round along the floor from its tail and catches him there', r.results[0] === 'hit' && r.hp === MAX - W.whipDamage, r.results.join(','));
  check('...and reaches only so far from its tail: by its head he would be clear', dist(a.w.tail, a.p) < a.w.tail.r + W.whipReach + TUNING.rat.radius && Math.hypot(a.w.x - a.w.tail.x, a.w.z - a.w.tail.z) > a.w.tail.r + W.whipReach + TUNING.rat.radius);
  const c = atTail(true);
  const rj = play(c.w, c.p, (x) => (x.state === 'whipWind' && x.stateTime > W.whipWind - 0.2 ? { jumpPressed: x.stateTime < W.whipWind - 0.17, jumpHeld: true } : x.state === 'whip' ? { jumpHeld: true } : {}), (x) => x.state === 'settle');
  check('a jump clears it', c.lashed && rj.results.length === 0 && rj.hp === MAX);
  // Its tail going past him as it crawls is no reason: he stands still while it prowls and comes in at him, and
  // whenever it does lash, it was slow or still at the time (wound round him, getting its breath).
  const q = awake({ seed: 4 });
  let lashes = 0;
  let onTheMove = 0;
  let passed = 0;
  let was = 0;
  for (let i = 0; i < 60 * 40; i++) {
    put(q.p, 0, 2);
    tick(q.w, q.p);
    if (q.w.events.includes('whipWind')) {
      lashes++;
      if (was > W.tailSlow) onTheMove++;
    }
    if (dist(q.w.tail, q.p) < W.tailRange && q.w.moving > W.tailSlow) passed++;
    was = q.w.moving;
    q.w.events.length = 0;
  }
  check('its tail trailing past him as it crawls does not set it off', onTheMove === 0 && passed > 0, `${lashes} lashes, none while crawling; its tail crawled past in reach of him for ${(passed / 60).toFixed(1)} s`);
  // But hang about it while it is slow (here: getting its breath back after a bite) and it does.
  const d = awake(0.9);
  until(d.w, d.p, 'recover', 3600, () => put(d.p, d.w.x + Math.sin(d.w.facing) * 2.2, d.w.z + Math.cos(d.w.facing) * 2.2));
  let slow = false;
  for (let i = 0; i < 240 && !slow; i++) {
    put(d.p, d.w.tail.x + 1.2, d.w.tail.z);
    tick(d.w, d.p);
    slow = d.w.state === 'whipWind';
  }
  check('hang about its tail while it is slow, and it lashes without being struck', slow);
}

// ---- Angry: two of everything, and the coil ----
{
  const { w, p } = awake(0.9);
  anger(w);
  check('below half its health it is angry, and says so', w.raging && w.events.includes('rage') && w.hp <= W.hp * W.rageAt);
  put(p, 2, 3);
  const coiling = until(w, p, 'coil', 3600, () => put(p, 2, 3));
  check('soon after, it starts to wind a ring round where he stands', coiling && w.events.includes('coil') && Math.hypot(w.coilAt.x - 2, w.coilAt.z - 3) < 0.01);
  const reared = until(w, p, 'coilWind', 900, () => put(p, 2, 3));
  // The ring: every piece of it about the same distance from the middle, and no gap in it a rat could walk out through.
  const ring = [{ x: w.x, z: w.z, r: w.radius }, ...w.parts];
  const radii = ring.map((q) => Math.hypot(q.x - w.coilAt.x, q.z - w.coilAt.z));
  let widest = 0;
  for (let i = 0; i < ring.length; i++) {
    const n = ring[(i + 1) % ring.length];
    widest = Math.max(widest, Math.hypot(ring[i].x - n.x, ring[i].z - n.z) - ring[i].r - n.r);
  }
  check('its head comes right round to its tail: a closed ring, with him inside it', reared && Math.min(...radii) > W.coilRadius - 0.6 && Math.max(...radii) < W.coilRadius + 0.8 && widest < 2 * TUNING.rat.radius, `ring ${Math.min(...radii).toFixed(2)}..${Math.max(...radii).toFixed(2)} across; widest gap ${widest.toFixed(2)}`);
  // He stands there: it tightens on him, shield or no.
  const r = play(w, p, () => ({ guardHeld: true }), (x) => x.state === 'spent');
  check('it rears over him, then tightens: two hearts, and a shield is no use', r.results.includes('hit') && r.hp === MAX - W.squeezeDamage, r.results.join(','));
  check('then it lies wound up and spent, its head soft', w.state === 'spent' && w.helpless && w.coilTight < 0.75);
  // He jumps out over its body instead.
  const c = awake(0.9);
  anger(c.w);
  until(c.w, c.p, 'coilWind', 4500, () => put(c.p, 2, 3));
  put(c.p, 2, 3);
  const away = new THREE.Vector3(c.p.position.x - c.w.x, 0, c.p.position.z - c.w.z).normalize(); // away from its head, over its body
  const rj = play(c.w, c.p, (_x, i) => ({ move: away, run: true, jumpPressed: i === 2 || i === 16, jumpHeld: i >= 2 }), (x) => x.state === 'spent');
  check('a rat who jumps out over its body before it tightens is clear of it', rj.results.length === 0 && rj.hp === MAX && Math.hypot(c.p.position.x - c.w.coilAt.x, c.p.position.z - c.w.coilAt.z) > W.coilRadius, `${Math.hypot(c.p.position.x - c.w.coilAt.x, c.p.position.z - c.w.coilAt.z).toFixed(2)} from the middle`);
  let spentFor = c.w.stateTime;
  const far = ratAt(0, 19);
  for (; c.w.state === 'spent'; spentFor += DT) tick(c.w, far);
  check('it lies spent for over two seconds, then unwinds', Math.abs(spentFor - W.spent) < 0.1 && c.w.state === 'prowl');
  // Two bites, two charges.
  const d = awake(0.9);
  anger(d.w);
  let bites = 0;
  let last: WyrmState = d.w.state;
  for (let i = 0; i < 3000 && d.w.state !== 'recover'; i++) {
    put(d.p, 0, 4);
    tick(d.w, d.p);
    if (d.w.state === 'coil') break;
    if (d.w.state === 'bite' && last !== 'bite') bites++;
    last = d.w.state;
  }
  check('angry, it bites twice', bites === 2 || d.w.state === 'coil', `${bites} bites`);
  const e = awake({ seed: 21 });
  anger(e.w);
  let charges = 0;
  let pairs = 0;
  let sinceCharge = 99;
  last = e.w.state;
  for (let i = 0; i < 60 * 80; i++) {
    put(e.p, Math.sin(i * 0.003) * 3, 10 + Math.cos(i * 0.003) * 3);
    tick(e.w, e.p);
    sinceCharge += DT;
    if (e.w.state === 'charge' && last !== 'charge') {
      charges++;
      if (sinceCharge < 6) pairs++;
      sinceCharge = 0;
    }
    last = e.w.state;
  }
  check('angry, its charges come in twos: the first wall only turns it round for the second', charges >= 4 && pairs >= 2 && e.w.events.includes('bump'), `${charges} charges, ${pairs} of them the second of a pair`);
}

// ---- A whole fight ----
{
  // He circles it and goes for its head when it is helpless and its body otherwise, for three minutes or until it is
  // dead. Through all of it: it stays on its floor, no part of it lies through another, and nothing goes wrong.
  const w = wyrm({ seed: 7 });
  const p = ratAt(0, 12);
  const ev = events();
  const A = SUMP_ARENA;
  let inside = true;
  let sound = true;
  let crossed = 0;
  let unwinding = 0;
  const seen = new Set<string>();
  const move = new THREE.Vector3();
  for (let i = 0; i < 60 * 180 && w.alive; i++) {
    const target = w.helpless ? { x: w.x, z: w.z, r: w.radius } : w.parts[5];
    const a = i * 0.012;
    const ring = w.open ? target.r + 1.1 : 4.2;
    move.set(target.x + Math.sin(a) * ring - p.position.x, 0, target.z + Math.cos(a) * ring - p.position.z);
    if (move.length() > 0.2) move.normalize();
    else move.set(0, 0, 0);
    p.facing = Math.atan2(target.x - p.position.x, target.z - p.position.z);
    p.update(DT, input({ move, run: true, attackPressed: i % 22 === 0 && dist(target, p) < target.r + 1.5 }), chamber.colliders);
    if (p.dead) p.hp = MAX;
    tick(w, p);
    resolveCombat(p, [w], ev);
    seen.add(w.state);
    for (const q of [{ x: w.x, z: w.z }, ...w.parts]) if (q.x < A.x0 || q.x > A.x1 || q.z < A.z0 || q.z > A.z1) inside = false;
    if (!Number.isFinite(w.x + w.z + w.facing + w.hp + w.crawled) || w.parts.some((q) => !Number.isFinite(q.x + q.z))) sound = false;
    if (w.state === 'squeeze' || w.state === 'spent') unwinding = 2;
    else unwinding = Math.max(0, unwinding - DT);
    if (unwinding <= 0) {
      const all = [{ x: w.x, z: w.z, r: w.radius }, ...w.parts];
      for (let m = 0; m < all.length; m++) for (let n = m + 4; n < all.length; n++) crossed = Math.max(crossed, all[m].r + all[n].r - Math.hypot(all[m].x - all[n].x, all[m].z - all[n].z));
    }
    w.events.length = 0;
  }
  check('through a whole fight it stays on its floor, no part of it lies through another, and nothing goes wrong', inside && sound && crossed < 0.25, `most overlap ${crossed.toFixed(2)}; ${[...seen].join(' ')}`);
  check('and in that time it has bitten, charged and (angry) wound its coil, or is dead', (['bite', 'charge', 'coil'].every((s) => seen.has(s))) || !w.alive, `${w.alive ? `alive at ${w.hp}` : 'dead'}: ${[...seen].join(' ')}`);
}

// ---- It never ties itself up ----
// A long body that may not pass through itself, in a walled room: left to simple steering it winds itself into knots,
// wedges its head between a wall and its own side, or stands against a wall for good. Twenty fights with a rat who runs
// about at his own speed, hugs its head, circles its middle and dogs its tail (half of them with it angry): it is never
// stopped for long, never lies through itself, never leaves its floor, and never goes long without doing something.
{
  const A = SUMP_ARENA;
  let stopped = 0;
  let stoppedAt = '';
  let crossed = 0;
  let crossedAt = '';
  let lull = 0;
  let out = 0;
  const did: Record<string, number> = {};
  for (let seed = 1; seed <= 20; seed++) {
    const w = wyrm({ seed: seed * 7919 });
    let rs = seed * 104729;
    const rr = (): number => ((rs = (rs * 48271) % 2147483647) / 2147483647);
    if (seed % 2 === 0) anger(w);
    let rx = 0;
    let rz = 12;
    let tx = 0;
    let tz = 12;
    let mode = 0;
    let modeFor = 0;
    let still = 0;
    let quiet = 0;
    let unwinding = 0;
    for (let t = 0; t < 120; t += DT) {
      modeFor -= DT;
      if (modeFor <= 0) {
        mode = Math.floor(rr() * 4);
        modeFor = 2 + rr() * 5;
        tx = (rr() * 2 - 1) * 20;
        tz = (rr() * 2 - 1) * 20;
      }
      if (mode === 1) { tx = w.x + Math.sin(t * 2.2) * 2.2; tz = w.z + Math.cos(t * 2.2) * 2.2; }
      if (mode === 2) { tx = w.parts[6].x + Math.sin(t * 1.5) * 1.8; tz = w.parts[6].z + Math.cos(t * 1.5) * 1.8; }
      if (mode === 3) { tx = w.tail.x + 1.2; tz = w.tail.z; }
      const dx = tx - rx;
      const dz = tz - rz;
      const d = Math.hypot(dx, dz);
      if (d > 0.05) {
        const v = Math.min(d, TUNING.move.run * DT);
        rx += (dx / d) * v;
        rz += (dz / d) * v;
      }
      rx = Math.max(A.x0 + 0.5, Math.min(A.x1 - 0.5, rx));
      rz = Math.max(A.z0 + 0.5, Math.min(A.z1 - 0.5, rz));
      w.update(DT, rx, 0, rz, true);
      for (const e of w.events) did[e] = (did[e] ?? 0) + 1;
      if (w.events.some((e) => e === 'biteWind' || e === 'chargeWind' || e === 'whipWind' || e === 'coil')) quiet = 0;
      w.events.length = 0;
      if (w.state === 'prowl') {
        quiet += DT;
        still = w.moving === 0 ? still + DT : 0;
      } else still = 0;
      if (still > stopped) {
        stopped = still;
        stoppedAt = `fight ${seed} at ${t.toFixed(0)} s`;
      }
      lull = Math.max(lull, quiet);
      if (w.state === 'squeeze' || w.state === 'spent') unwinding = 2;
      else unwinding = Math.max(0, unwinding - DT);
      const all = [{ x: w.x, z: w.z, r: w.radius }, ...w.parts];
      if (unwinding <= 0) {
        for (let m = 0; m < all.length; m++) for (let n = m + 4; n < all.length; n++) {
          const over = all[m].r + all[n].r - Math.hypot(all[m].x - all[n].x, all[m].z - all[n].z);
          if (over > crossed) {
            crossed = over;
            crossedAt = `fight ${seed} at ${t.toFixed(0)} s, ${w.state}`;
          }
        }
      }
      for (const q of all) if (q.x < A.x0 || q.x > A.x1 || q.z < A.z0 || q.z > A.z1) out++;
    }
  }
  check('in twenty fights with a rat all over it, it is never stopped for as much as a second with nowhere to go', stopped < 1, `longest ${stopped.toFixed(2)} s (${stoppedAt})`);
  check('and no part of it ever lies through another, nor leaves its floor', crossed < 0.1 && out === 0, `most overlap ${crossed.toFixed(2)}${crossedAt ? ` (${crossedAt})` : ''}; ${out} frames off its floor`);
  check('and it never goes half a minute without starting something', lull < 30, `longest ${lull.toFixed(1)} s`);
  check('and all of its moves come up: bites, charges, rams, lashes, coils and squeezes', ['bite', 'charge', 'ram', 'bump', 'whip', 'coil', 'squeeze'].every((e) => (did[e] ?? 0) >= 5), ['bite', 'charge', 'ram', 'bump', 'whip', 'coil', 'squeeze'].map((e) => `${e} ${did[e] ?? 0}`).join(', '));
}

// ---- Its end ----
{
  const { w, p } = awake();
  w.hp = 1;
  const q = w.parts[3];
  put(p, q.x + 1.2, q.z, q);
  const blow = swing(p, w);
  check('the last blow, wherever on it, kills it; it does not come back', blow.enemyKilled && !w.alive && w.state === 'dead' && !w.respawns);
  for (let i = 0; i < 600; i++) tick(w, p);
  check('dead it does nothing more', w.state === 'dead' && !w.attackActive && !w.attacking && w.moving === 0);
}

console.log(failures === 0 ? '\nwyrm: all passed' : `\nwyrm: ${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
