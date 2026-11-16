// The Lamp Scorpion (src/enemies/scorpion.ts, scorpionModel.ts): a cave scorpion whose sting is its lamp.
//
// The light is the tell: it strikes only with its lamp lit. The sting: tail reared, lamp flaring, a ring on the floor
// where the barb will come down, which follows him and then is set; then the barb is stuck in the floor (the opening).
// The claws, for a rat who stands in its face. Two blows close together and its lamp goes out and it darts away,
// doing nothing until it is lit again. A perfect guard throws it down sprawled. All with the real controller and the
// real combat; and the model draws the barb, the ring and the lamp where and as the rules have them.
import './../src/core/colorSetup';
import * as THREE from 'three';
import { PlayerController, PlayerInput } from '../src/player/controller';
import { Scorpion, SCORPION, type ScorpionState } from '../src/enemies/scorpion';
import { ScorpionModel, TAIL_LINKS, tailJoints } from '../src/enemies/scorpionModel';
import { CombatEvents, resolveCombat } from '../src/combat/combat';
import { Director } from '../src/enemies/director';
import type { Foe } from '../src/enemies/foe';
import { makeAabb } from '../src/world/collision';
import { TUNING } from '../src/data/tuning';
import { glowCave, GLOWCAVE } from '../src/levels/glowcave';
import { getTexturePixels } from '../src/render/textures';
import { ENEMY_PIECES, compileCustom, emptyCustom } from '../src/levels/custom';

const DT = 1 / 60;
const S = SCORPION;
let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}
const floor = [makeAabb(0, -0.5, 0, 120, 1, 120)];
const input = (o: Partial<PlayerInput> = {}): PlayerInput => ({ move: new THREE.Vector3(), run: false, jumpPressed: false, jumpHeld: false, attackPressed: false, dodgePressed: false, guardHeld: false, sneakHeld: false, ...o } as PlayerInput);
const events = (): CombatEvents => ({ enemyHit: null, enemyKilled: false, playerResult: null, shockwave: false, cratesBroken: [] });
const MAX = TUNING.health.max;
const WIDE = { x0: -50, x1: 50, z0: -50, z1: 50 };

function rat(x: number, z: number, face?: { x: number; z: number }): PlayerController {
  const p = new PlayerController(new THREE.Vector3(x, 0, z));
  for (let i = 0; i < 20; i++) p.update(DT, input(), floor);
  if (face) p.facing = Math.atan2(face.x - x, face.z - z);
  return p;
}
/** One at the middle of an open floor, facing +z, its dice always the middle of what it may roll. */
function scorpion(over: Partial<{ x: number; z: number; color: number }> = {}): Scorpion {
  const s = new Scorpion({ x: 0, z: 0, arena: WIDE, ...over });
  s.rng = () => 0.5;
  return s;
}
interface Played { results: string[]; seen: ScorpionState[]; heard: string[]; frames: number; hits: number; kills: number }
/** Plays on, the rat doing `act` each frame, until `stop`. What reached the rat, every state it was in, all it said. */
function play(ss: Scorpion[], p: PlayerController, act: (s: Scorpion, frame: number) => Partial<PlayerInput>, stop: (s: Scorpion, frame: number) => boolean, frames = 1800, each?: (s: Scorpion, frame: number) => void, director: Director | null = null): Played {
  const out: Played = { results: [], seen: [], heard: [], frames: 0, hits: 0, kills: 0 };
  const ev = events();
  const s = ss[0];
  for (let i = 0; i < frames && !stop(s, i); i++) {
    p.update(DT, input(act(s, i)), floor);
    director?.update(DT, ss as unknown as Foe[], p.position.x, p.position.z);
    for (const q of ss) q.update(DT, p.position.x, p.position.y, p.position.z, !p.dead);
    out.heard.push(...s.events.splice(0));
    if (out.seen[out.seen.length - 1] !== s.state) out.seen.push(s.state);
    resolveCombat(p, ss, ev);
    out.heard.push(...s.events.splice(0));
    if (ev.playerResult) out.results.push(ev.playerResult);
    if (ev.enemyHit) out.hits++;
    if (ev.enemyKilled) out.kills++;
    each?.(s, i);
    out.frames++;
  }
  return out;
}
const still = (): Partial<PlayerInput> => ({});
const dist = (a: { x: number; z: number }, b: { x: number; z: number }): number => Math.hypot(a.x - b.x, a.z - b.z);

// ---- It sees him, and stalks: lamp low, at a little more than a sword's length ----
{
  const s = scorpion();
  const far = rat(0, S.noticeRange + 4);
  const a = play([s], far, still, () => false, 120);
  check('far off it does not stir: it sits with its lamp glowing low', a.seen.join() === 'idle' && s.light > 0.2 && s.light < 0.5 && s.lit, `${a.seen.join()}; lamp ${s.light.toFixed(2)}`);
  const p = rat(0, 7);
  const b = play([s], p, still, (q) => q.state === 'stingWind', 900);
  check('nearer, it sees him (it says so) and comes on, to stalk him', b.heard[0] === 'alert' && b.seen.includes('stalk'));
  check('...it does not sting from across the room: by the time its tail rears it has come within its sting\'s reach of him, and is facing him', s.state === 'stingWind' && dist(s, p.position) <= S.stingReach + 0.31 && Math.abs(Math.atan2(Math.sin(Math.atan2(p.position.x - s.x, p.position.z - s.z) - s.facing), Math.cos(Math.atan2(p.position.x - s.x, p.position.z - s.z) - s.facing))) < 0.5, `${dist(s, p.position).toFixed(2)} off`);
}

// ---- The sting: the tell, the ring, the blow, the barb stuck ----
{
  const s = scorpion();
  const p = rat(0, 2.2, { x: 0, z: 0 });
  play([s], p, still, (q) => q.state === 'stingWind', 900);
  // The tell, tick by tick.
  let tell = 0;
  let ringFromTheFirst = true;
  let onHim = 0;
  let onHimSoon = 0;
  let fills: number[] = [];
  let lampAtEnd = 0;
  let tipHigh = 0;
  const a = play([s], p, still, (q) => q.state !== 'stingWind', 300, (q) => {
    if (q.state !== 'stingWind') return;
    tell += DT;
    const m = q.mark;
    if (!m || Math.abs(m.r - S.stingR) > 1e-9) ringFromTheFirst = false;
    else {
      onHim = Math.max(onHim, dist(m, p.position));
      if (q.stateTime > 0.15) onHimSoon = Math.max(onHimSoon, dist(m, p.position));
      fills.push(m.fill);
    }
    lampAtEnd = q.light;
    tipHigh = Math.max(tipHigh, q.tail.up);
  });
  check('the tell is as long as it says, and it says so as it begins', Math.abs(tell - S.stingWind) < DT * 1.5 && s.state === 'sting' && a.heard.includes('sting'), `${tell.toFixed(2)} s`);
  check('...from its first moment there is a ring on the floor, as wide as the blow will be, on where he stands; and it fills as the tell runs out', ringFromTheFirst && onHim < 0.4 && onHimSoon < 0.1 && fills[0] < 0.1 && fills[fills.length - 1] > 0.95 && fills.every((f, i) => i === 0 || f >= fills[i - 1]), `furthest from his middle ${onHim.toFixed(2)} at first, ${onHimSoon.toFixed(2)} after a moment`);
  check('...its tail rears high over its back and its lamp flares to more than twice what it was', tipHigh > 1.9 && lampAtEnd > 1.35, `barb ${tipHigh.toFixed(2)} up, lamp ${lampAtEnd.toFixed(2)}`);
  const b = play([s], p, still, (q) => q.state !== 'sting', 60);
  check('the barb comes down on him: one heart', b.results.join() === 'hit' && p.hp === MAX - S.stingDamage, `${b.results.join()}; ${p.hp} hearts`);
  check('...and is in the floor, in the middle of where the ring was (it says so): the tail stretched out along the ground', s.state === 'stuck' && b.heard.includes('stuck'));
  let stuck = 0;
  let turned = 0;
  const f0 = s.facing;
  let atRing = Infinity;
  play([s], p, still, (q) => q.state !== 'stuck', 300, (q) => {
    if (q.state !== 'stuck') return;
    stuck += DT;
    turned = Math.max(turned, Math.abs(q.facing - f0));
    if (stuck > 0.15) atRing = Math.min(atRing, -Math.hypot(q.tail.ahead - q.aimDist, q.tail.up - 0.06));
  });
  check('it stays stuck for most of a second, not turning, its barb where it struck: the opening', Math.abs(stuck - S.stingStuck) < DT * 1.5 && turned < 1e-9 && -atRing < 0.02, `${stuck.toFixed(2)} s`);
}

// ---- The ring follows him, then is set; the blow lands on the ring and nowhere else ----
{
  // He walks across in front of it all through the tell: the ring is on him while it follows, and stops when it is set.
  const s = scorpion();
  const p = rat(-0.6, 2.0, { x: 0, z: 0 });
  play([s], p, still, (q) => q.state === 'stingWind', 900);
  let followed = 0;
  let setAt: { x: number; z: number } | null = null;
  let moved = 0;
  // (Across its front: at a right angle to the line from it to him, as that line was when its tail went up.)
  const across = new THREE.Vector3(p.position.z - s.z, 0, -(p.position.x - s.x)).normalize();
  const a = play([s], p, () => ({ move: across, run: false }), (q) => q.state === 'stuck', 300, (q) => {
    const m = q.mark;
    if (!m) return;
    if (q.state === 'stingWind' && q.stateTime < S.stingTrack) followed = Math.max(followed, dist(m, p.position));
    else if (!setAt) setAt = { x: m.x, z: m.z };
    else moved = Math.max(moved, dist(m, setAt));
  });
  check('the ring follows a rat who walks across its front, for the first part of the tell: it is never off him', followed < 0.3, `furthest behind him ${followed.toFixed(2)}`);
  check('...then it is set: it does not move again', !!setAt && moved < 1e-6 && a.frames > 10);
  // He stands still until the ring is set, and only then runs: from a standstill, he is out in time.
  for (const side of [-1, 1]) {
    const s2 = scorpion();
    const p2 = rat(0, 2.0, { x: 0, z: 0 });
    play([s2], p2, still, (q) => q.state === 'stingWind', 900);
    const b = play([s2], p2, (q) => (q.state === 'stingWind' && q.stateTime < S.stingTrack ? {} : { move: new THREE.Vector3(side, 0, 0), run: true }), (q) => q.state === 'stuck', 300);
    check(`a rat who stands in the ring until it is set and THEN runs (to its ${side < 0 ? 'left' : 'right'}) is out of it in time: the tell is fair`, b.results.length === 0 && p2.hp === MAX, b.results.join());
  }
  // Beside the ring, he is not touched: the blow is the ring, not the whole of its front.
  const s3 = scorpion();
  const p3 = rat(0, 2.0, { x: 0, z: 0 });
  play([s3], p3, still, (q) => q.state === 'stingWind' && q.stateTime >= S.stingTrack, 900);
  const m3 = s3.mark!;
  const out = S.stingR + TUNING.rat.radius + 0.08;
  p3.position.set(m3.x + out, 0, m3.z);
  p3.prevPosition.copy(p3.position);
  const c = play([s3], p3, still, (q) => q.state === 'stuck', 300);
  check('a rat a hand outside the ring when the barb comes down is not touched', c.results.length === 0 && p3.hp === MAX);
  const s4 = scorpion();
  const p4 = rat(0, 2.0, { x: 0, z: 0 });
  play([s4], p4, still, (q) => q.state === 'stingWind' && q.stateTime >= S.stingTrack, 900);
  const m4 = s4.mark!;
  p4.position.set(m4.x + S.stingR + TUNING.rat.radius - 0.08, 0, m4.z);
  p4.prevPosition.copy(p4.position);
  const d = play([s4], p4, still, (q) => q.state === 'stuck', 300);
  check('...and one a hand inside it is', d.results.join() === 'hit');
  // A jump does not clear it (it comes from above), a shield stops it.
  const s5 = scorpion();
  const p5 = rat(0, 2.0, { x: 0, z: 0 });
  play([s5], p5, still, (q) => q.state === 'stingWind', 900);
  let stuckFor = 0;
  const e = play([s5], p5, () => ({ guardHeld: true }), (q) => q.state === 'recover', 400, (q) => {
    if (q.state === 'stuck') stuckFor += DT;
  });
  check('a shield held up stops the barb, and it is stuck the longer for it', e.results.join() === 'blocked' && p5.hp === MAX && Math.abs(stuckFor - S.stingBlocked) < DT * 1.5, `${e.results.join()}; stuck ${stuckFor.toFixed(2)} s`);
}

// ---- Hit it while it is stuck: two blows, and its lamp goes out and it is gone ----
{
  const s = scorpion();
  const p = rat(0, 2.0, { x: 0, z: 0 });
  play([s], p, still, (q) => q.state === 'stingWind', 900);
  // He steps out of the ring to its side, and when the barb is in the floor, cuts at it.
  const a = play([s], p, (q, i) => {
    if (q.state === 'stingWind' || q.state === 'sting') return { move: new THREE.Vector3(1, 0, -0.5).normalize(), run: true };
    const to = new THREE.Vector3(q.x - p.position.x, 0, q.z - p.position.z);
    const far = to.length();
    return far > 1.15 ? { move: to.normalize(), run: true } : { move: to.normalize().multiplyScalar(0.01), attackPressed: i % 4 === 0 };
  }, (q) => q.state === 'douse', 600);
  check('stuck, it can be cut: the first blow staggers it, and at the second, close on the first, its lamp goes out and it darts away (it says so)', a.hits === S.douseAfter && s.hp === S.hp - S.douseAfter && s.state === 'douse' && a.heard.includes('douse') && a.heard.filter((h) => h === 'hurt').length === S.douseAfter && a.results.length === 0, `${a.hits} blows; ${a.heard.join()}`);
  const from = { x: s.x, z: s.z };
  const fromRat = dist(s, p.position);
  let struck = 0;
  let lampMax = 0;
  let litEver = false;
  let after = 0;
  const b = play([s], p, still, (q) => q.state !== 'douse' && q.state !== 'dark', 600, (q) => {
    if (q.state !== 'douse' && q.state !== 'dark') return;
    after += DT;
    if (q.attackActive || q.attacking) struck++;
    if (after > 0.25) lampMax = Math.max(lampMax, q.light);
    litEver ||= q.lit;
  });
  check('unlit, it runs: well clear of him in under half a second, and it goes on round him in the dark for a second and more', after > S.douseTime + S.dark - DT * 2 && after < S.douseTime + S.dark + DT * 2, `${after.toFixed(2)} s unlit; it began ${fromRat.toFixed(2)} from him`);
  check('...its lamp is out all that while, and it does nothing: no sting without its lamp', lampMax < 0.02 && struck === 0 && !litEver && b.results.length === 0, `lamp at most ${lampMax.toFixed(3)}`);
  check('...then its lamp lights again somewhere else (it says so) and it is stalking him once more', b.heard.includes('relight') && s.state === 'stalk' && dist(s, from) > 2.5 && s.lit, `${dist(s, from).toFixed(2)} from where it was cut`);
  // A single blow, and no second close on it: it only staggers, and comes on.
  const s2 = scorpion();
  const p2 = rat(0.9, 0.5, { x: 0, z: 0 });
  s2.state = 'stuck';
  let one = false;
  const c = play([s2], p2, () => {
    const press = !one;
    one = true;
    return { attackPressed: press };
  }, () => false, 150);
  check('one blow alone does not put its lamp out: it staggers, and is back to stalking', c.hits === 1 && c.seen.includes('stagger') && !c.seen.includes('douse') && s2.lit);
}

// ---- The claws, for a rat who stands in its face ----
{
  const s = scorpion();
  const p = rat(0, 1.25, { x: 0, z: 0 });
  s.state = 'stalk';
  let wind = 0;
  let wide = 0;
  const a = play([s], p, still, (q) => q.state === 'recover', 300, (q) => {
    if (q.state === 'snapWind') {
      wind += DT;
      wide = Math.max(wide, q.claw);
    }
  });
  check('close in front of it, its claws open wide (a short tell: it says so) and snap shut on him: one heart', a.seen.join().startsWith('snapWind,snap') && Math.abs(wind - S.snapWind) < DT * 1.5 && wide > 0.9 && a.results.join() === 'hit' && p.hp === MAX - S.snapDamage && a.heard.includes('snapWind') && a.heard.includes('snap'), `${a.seen.join()}; tell ${wind.toFixed(2)} s; ${a.results.join()}`);
  const s2 = scorpion();
  const p2 = rat(0, 1.25, { x: 0, z: 0 });
  s2.state = 'stalk';
  const b = play([s2], p2, () => ({ guardHeld: true }), (q) => q.state === 'stalk' && q.stateTime > 0.05, 300);
  check('a shield stops them', b.results.join() === 'blocked' && p2.hp === MAX);
  // Beside it or behind it, they do not reach.
  for (const [name, x, z] of [['beside', 1.25, 0], ['behind', 0, -1.25]] as Array<[string, number, number]>) {
    const s3 = scorpion();
    const p3 = rat(x, z, { x: 0, z: 0 });
    s3.state = 'snapWind';
    const c = play([s3], p3, still, (q) => q.state === 'recover', 120);
    check(`a rat ${name} it when they shut is not touched: its claws are its front`, c.results.length === 0 && p3.hp === MAX);
  }
  // It does not snap again at once.
  const s4 = scorpion();
  const p4 = rat(0, 1.25, { x: 0, z: 0 });
  s4.state = 'stalk';
  let snaps = 0;
  let last = '';
  play([s4], p4, () => ({ guardHeld: true }), () => false, Math.round((S.snapWind + S.snapTime + S.snapBlocked + S.snapCooldown * 0.6) / DT), (q) => {
    if (q.state === 'snapWind' && last !== 'snapWind') snaps++;
    last = q.state;
  });
  check('it does not snap again at once: there is a breath between', snaps === 1, `${snaps} snaps`);
}

// ---- A perfect guard throws it down sprawled ----
{
  let best = '';
  let w: { s: Scorpion; p: PlayerController } | null = null;
  for (let lead = 0; lead <= 9 && best !== 'parried'; lead++) {
    const s = scorpion();
    const p = rat(0, 2.0, { x: 0, z: 0 });
    play([s], p, still, (q) => q.state === 'stingWind', 900);
    const r = play([s], p, (q) => ((q.state === 'stingWind' && q.stateTime >= S.stingWind - lead * DT) || q.state === 'sting' ? { guardHeld: true } : {}), (q) => q.state === 'sprawl' || q.state === 'stuck', 300);
    if (r.results.includes('parried')) {
      best = 'parried';
      w = { s, p };
    }
  }
  check('(a perfect guard of the sting was found)', best === 'parried' && !!w);
  if (w) {
    const { s, p } = w;
    check('a perfect guard of the sting throws it down sprawled (it says so), and he is not hurt', s.state === 'sprawl' && p.hp === MAX);
    // Sprawled it does not run: every blow lands.
    let down = 0;
    const a = play([s], p, (q, i) => {
      const to = new THREE.Vector3(q.x - p.position.x, 0, q.z - p.position.z);
      const far = to.length();
      return far > 1.15 ? { move: to.normalize(), run: true } : { move: to.normalize().multiplyScalar(0.01), attackPressed: i % 4 === 0 };
    }, (q) => q.state !== 'sprawl', 600, (q) => {
      if (q.state === 'sprawl') down += DT;
    });
    check('sprawled, it lies there and takes it: more blows than would have put its lamp out, and it does not run', a.hits > S.douseAfter && !a.seen.includes('douse') && (s.state === 'dead' || Math.abs(down - S.sprawl) < 0.4), `${a.hits} blows in ${down.toFixed(2)} s; ${a.seen.join()}`);
  }
}

// ---- It dies of five blows; and it never strikes unlit ----
{
  const s = scorpion();
  const p = rat(0, 2.2, { x: 0, z: 0 });
  let unlitStrike = 0;
  let dimSting = 0;
  // He fights it the way it asks: out of the ring, cut while it is stuck, shield up when it is in his face.
  const a = play([s], p, (q, i) => {
    const to = new THREE.Vector3(q.x - p.position.x, 0, q.z - p.position.z);
    const far = to.length();
    if (q.state === 'stingWind' || q.state === 'sting') return { move: new THREE.Vector3(to.z, 0, -to.x).normalize(), run: true };
    if (q.state === 'snapWind' || q.state === 'snap') return { guardHeld: true };
    if (q.state === 'stuck' || q.state === 'stagger') return far > 1.15 ? { move: to.normalize(), run: true } : { move: to.normalize().multiplyScalar(0.01), attackPressed: i % 4 === 0 };
    return {};
  }, (q) => !q.alive, 60 * 90, (q) => {
    if (q.attackActive && !q.lit) unlitStrike++;
    if (q.state === 'sting' && q.attackActive && q.light < 1.2) dimSting++;
  });
  check('fought as it asks (out of the ring, cut while it is stuck, shield up in its face) it dies of five blows, in a few openings and not one', !s.alive && a.hits === S.hp && a.kills === 1 && a.seen.filter((x) => x === 'stuck').length >= 3, `${a.hits} blows, ${a.seen.filter((x) => x === 'stuck').length} stings, ${a.seen.filter((x) => x === 'douse').length} times dark, ${(a.frames * DT).toFixed(1)} s; he has ${p.hp} hearts`);
  check('...and in all that it never struck unlit, and never stung but with its lamp flaring', unlitStrike === 0 && dimSting === 0);
  const dead = play([s], p, still, () => false, 120);
  check('dead, its lamp dies and it does nothing more (and it does not come back unless a level says so)', s.light < 0.4 && !s.attackActive && dead.results.length === 0 && !s.respawns && s.state === 'dead');
}

// ---- Two take turns ----
{
  const a = scorpion({ x: -2.2, z: 0 });
  const b = scorpion({ x: 2.2, z: 0 });
  const p = rat(0, 1.6);
  let both = 0;
  let stings = 0;
  let lastA = '';
  let lastB = '';
  play([a, b], p, still, () => false, 60 * 20, () => {
    const sa = a.state === 'stingWind' || a.state === 'sting';
    const sb = b.state === 'stingWind' || b.state === 'sting';
    if (sa && sb) both++;
    if (a.state === 'stingWind' && lastA !== 'stingWind') stings++;
    if (b.state === 'stingWind' && lastB !== 'stingWind') stings++;
    lastA = a.state;
    lastB = b.state;
    p.hp = MAX;
  }, new Director());
  check('two of them take turns to sting: both do, and never the two at once', stings >= 4 && both === 0, `${stings} stings in 20 s`);
}

// ---- A colour is only looks ----
{
  const run = (color?: number): string => {
    const s = scorpion({ color });
    const p = rat(0, 6);
    let path = '';
    play([s], p, (_q, i) => ({ move: new THREE.Vector3(Math.sin(i / 70), 0, Math.cos(i / 70)), run: false }), () => false, 60 * 15, (q, i) => {
      p.hp = MAX;
      if (i % 20 === 0) path += `${q.state}:${q.x.toFixed(3)},${q.z.toFixed(3)},${q.light.toFixed(2)};`;
    });
    return path;
  };
  check('one with a colour of its own fights exactly as a plain one: the same fight, step for step', run() === run(0xffb03a) && run().includes('stingWind'));
}

// ---- The model draws what the rules have ----
{
  const joints = tailJoints([S.tailRoot.ahead, S.tailRoot.up], [S.rest.ahead, S.rest.up], TAIL_LINKS);
  const lens = joints.slice(1).map((q, i) => Math.hypot(q[0] - joints[i][0], q[1] - joints[i][1]));
  const turns = joints.slice(2).map((q, i) => {
    const a0 = Math.atan2(joints[i + 1][1] - joints[i][1], joints[i + 1][0] - joints[i][0]);
    const a1 = Math.atan2(q[1] - joints[i + 1][1], q[0] - joints[i + 1][0]);
    return Math.atan2(Math.sin(a1 - a0), Math.cos(a1 - a0));
  });
  check('its tail is as long as the rules say, in links that do not stretch; every link turned the same from the last, curling up and over forward; its point where it is asked', Math.abs(TAIL_LINKS.reduce((x, y) => x + y, 0) - S.tailLength) < 1e-9 && lens.every((l, i) => Math.abs(l - TAIL_LINKS[i]) < 1e-9) && turns.every((t) => Math.abs(t - turns[0]) < 1e-6 && t < 0) && Math.hypot(joints[joints.length - 1][0] - S.rest.ahead, joints[joints.length - 1][1] - S.rest.up) < 1e-3);
  check('every place the rules put its barb is within its tail\'s reach of its root', [S.rest, S.rear, S.tucked, S.limp, { ahead: S.stingReach, up: 0.06 }, { ahead: S.stingMin, up: 0.06 }].every((t) => Math.hypot(t.ahead - S.tailRoot.ahead, t.up - S.tailRoot.up) < S.tailLength));

  // A whole fight, drawn: at every frame the barb's point, the ring and the lamp are where and as the rules have them.
  const s = scorpion();
  const m = new ScorpionModel();
  const p = rat(0, 2.2, { x: 0, z: 0 });
  let tipOff = 0;
  let under = 0;
  let ringOff = 0;
  let ringWrong = 0;
  let lampWhenOut = 0;
  let lampWhenFlared = 1;
  let feetOff = 0;
  const seen = new Set<string>();
  const pos = new THREE.Vector3();
  play([s], p, (q, i) => {
    const to = new THREE.Vector3(q.x - p.position.x, 0, q.z - p.position.z);
    const far = to.length();
    if (q.state === 'stingWind' || q.state === 'sting') return i % 240 < 120 ? { move: new THREE.Vector3(to.z, 0, -to.x).normalize(), run: true } : {};
    if (q.state === 'stuck' || q.state === 'stagger') return far > 1.15 ? { move: to.normalize(), run: true } : { move: to.normalize().multiplyScalar(0.01), attackPressed: i % 4 === 0 };
    return {};
  }, (q) => !q.alive, 60 * 60, (q) => {
    p.hp = MAX;
    m.setTransform(pos.set(q.x, q.y, q.z), q.facing);
    m.update(DT, { state: q.state, stateTime: q.stateTime, tail: q.tail, light: q.light, claw: q.claw, moving: q.moving, mark: q.mark ? { ahead: q.aimDist, r: q.mark.r, fill: q.mark.fill } : null });
    seen.add(q.state);
    const parts = m.parts();
    const tip = q.tip;
    tipOff = Math.max(tipOff, Math.hypot(parts.tip.x - tip.x, parts.tip.y - Math.max(0.03, tip.y), parts.tip.z - tip.z));
    for (const j of parts.tail) if (j.y < -0.001) under++;
    if (q.state === 'stalk' && q.moving < 0.2 && q.stateTime > 0.5) for (const f of parts.feet) feetOff = Math.max(feetOff, Math.abs(f.y));
    const mark = q.mark;
    if (!!mark !== !!parts.mark) ringWrong++;
    if (mark && parts.mark) ringOff = Math.max(ringOff, Math.hypot(parts.mark.at.x - mark.x, parts.mark.at.z - mark.z), Math.abs(parts.mark.r - mark.r), Math.abs(parts.mark.fill - Math.max(0.05, mark.fill)));
    const bright = Math.max(parts.lamp.r, parts.lamp.g, parts.lamp.b);
    if (q.state === 'dark' && q.stateTime > 0.3) lampWhenOut = Math.max(lampWhenOut, bright);
    if (q.state === 'sting') lampWhenFlared = Math.min(lampWhenFlared, bright);
  });
  check('(the drawn fight went through its states)', ['stalk', 'stingWind', 'sting', 'stuck', 'stagger', 'douse', 'dark', 'dead'].every((x) => seen.has(x)), [...seen].join());
  check('the point of its barb is drawn where the rules have it, at every frame of a fight', tipOff < 0.01, `at most ${tipOff.toFixed(4)} off`);
  check('...no joint of its tail is ever under the floor, and as it stands its feet are on it', under === 0 && feetOff < 0.04, `${under} joints under; feet at most ${feetOff.toFixed(3)} off the floor`);
  check('...the ring is drawn when and where the rules have it, as wide and as full', ringWrong === 0 && ringOff < 1e-3, `${ringWrong} frames wrong; at most ${ringOff.toFixed(5)} off`);
  check('...its lamp is drawn dark when it is out and bright when it flares', lampWhenOut < 0.2 && lampWhenFlared > 0.9, `out ${lampWhenOut.toFixed(2)}, flared ${lampWhenFlared.toFixed(2)}`);
  const hue = (c: THREE.Color): number => c.getHSL({ h: 0, s: 0, l: 0 }).h;
  const amber = new ScorpionModel(0xffb03a);
  amber.update(1, { state: 'stalk', stateTime: 1, tail: S.rest, light: 1, claw: 0, moving: 0, mark: null });
  const plain = new ScorpionModel();
  plain.update(1, { state: 'stalk', stateTime: 1, tail: S.rest, light: 1, claw: 0, moving: 0, mark: null });
  check('one given a colour has its lamp that colour; a plain one\'s is a scorpion\'s own blue-green', Math.abs(hue(amber.parts().lamp) - hue(new THREE.Color(0xffb03a))) < 0.03 && Math.abs(hue(plain.parts().lamp) - 0.45) < 0.06);
}

// ---- In the Glow Cave ----
{
  const def = glowCave();
  const ss = def.enemies.filter((e) => e.type === 'scorpion');
  const bugs = def.enemies.filter((e) => e.type === 'firefly');
  const inside = (x: number, z: number): boolean => def.solids.some((b) => b.kind !== 'floor' && x > b.x0 - 0.7 && x < b.x1 + 0.7 && z > b.z0 - 0.7 && z < b.z1 + 0.7 && b.y1 > 0.2 && b.y0 < 1);
  check('two of them live in the Glow Cave, each a lamp of its own colour, and neither a colour the glow bugs have', ss.length === 2 && new Set(ss.map((e) => e.color ?? 0x4dffc8)).size === 2 && ss.every((e) => !bugs.some((b) => b.color === e.color)), ss.map((e) => (e.color ?? 0x4dffc8).toString(16)).join());
  check('...each starts on open floor, clear of ledges and stems, with the floor of the room for its patch', ss.every((e) => (e.y ?? 0) === 0 && !inside(e.x, e.z) && !!e.arena && e.arena.x0 >= -GLOWCAVE.halfX && e.arena.x1 <= GLOWCAVE.halfX && e.arena.z0 >= -GLOWCAVE.halfZ && e.arena.z1 <= GLOWCAVE.halfZ));
  check('...they are there to be fought, not a goal, and do not come back', def.goals.length === 0 && ss.every((e) => !e.respawn));
}

// ---- Its pictures, and its place in the level editor ----
{
  const m = new ScorpionModel();
  const tex = new Set<string>();
  let plain = 0;
  m.root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const mat = mesh.material as THREE.ShaderMaterial & { uniforms?: { tex?: { value: THREE.Texture } } };
    if (!mat.uniforms?.tex) return;
    const t = mat.uniforms.tex.value;
    if (t.image.width <= 1) plain++;
    else tex.add(`${t.image.width}`);
    if (!mesh.geometry.attributes.uv) plain++;
  });
  check('every piece of it the room lights wears a picture, and has the picture\'s places on it: none is plain colour', plain === 0 && tex.size >= 2, `${plain} plain`);
  for (const [name, size] of [['scorpShell', 64], ['scorpTail', 32], ['scorpClaw', 32], ['scorpLamp', 32]] as Array<['scorpShell' | 'scorpTail' | 'scorpClaw' | 'scorpLamp', number]>) {
    const px = getTexturePixels(name);
    let lo = 255;
    let hi = 0;
    for (let i = 0; i < px.size * px.size; i++) {
      const v = Math.max(px.data[i * 4], px.data[i * 4 + 1], px.data[i * 4 + 2]);
      lo = Math.min(lo, v);
      hi = Math.max(hi, v);
    }
    check(`${name}: its picture is there, the size it should be, with light and dark in it`, px.size === size && hi - lo > 90, `${lo}..${hi}`);
  }
  const lamp = getTexturePixels('scorpLamp');
  let grey = true;
  for (let i = 0; i < lamp.size * lamp.size; i++) if (lamp.data[i * 4] !== lamp.data[i * 4 + 1] || lamp.data[i * 4] !== lamp.data[i * 4 + 2]) grey = false;
  check('its lamp\'s picture is in greys: the lamp gives it its colour', grey);
  check('it is a piece in the level editor, and what the editor places is one, facing the way it is set, with floor enough to come round him', ENEMY_PIECES.includes('scorpion') && (() => {
    const lvl = emptyCustom();
    lvl.pieces.push({ t: 'scorpion', x0: 3, z0: -2, x1: 3, z1: -2, top: 0, dir: 'e' });
    const e = compileCustom(lvl).enemies.find((q) => q.type === 'scorpion');
    return !!e && e.x === 3 && e.z === -2 && Math.abs((e.facing ?? 9) - Math.PI / 2) < 1e-6 && e.arena!.x1 - e.arena!.x0 >= 2 * (S.darkRing + 2);
  })());
}

console.log(failures === 0 ? '\nscorpion: all passed' : `\nscorpion: ${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
