// The Widow: the boss in the dark at the bottom of the Long Drop (src/enemies/widow.ts).
//
// The owner, 2026-11-16: "it's actually so big that he doesn't even really fit in the arena it's just like a giant
// spider's head connected to a body that goes into the darkness and then you have to deal with like his front four
// legs and ... mandibles ... he'll like slam down one side of the field and sweep across and then slam down the other
// side of the field and sweep across or he'll like bite down on certain parts of the field and you have to like Dodge
// all his attacks." And, of two earlier versions (legs as long as the room; then short legs flinging poison): "it
// doesn't really look like one of the legs ... you kind of have to see the leg move"; "shooting rays of light no ...
// pull the leg forward and slam it down on the ground ... you can't just like sit in the back". So here: everything
// is a leg or her head, she crawls round the rim to him, and there is no back to sit in. All of it with the real
// controller, the real combat and the real arena.
import './../src/core/colorSetup';
import * as THREE from 'three';
import { PlayerController, type PlayerInput } from '../src/player/controller';
import { Widow, WIDOW, type WidowState } from '../src/enemies/widow';
import { WidowModel, BONE } from '../src/enemies/widowModel';
import { resolveCombat, type CombatEvents } from '../src/combat/combat';
import { Director } from '../src/enemies/director';
import { aabbOf } from '../src/world/collision';
import { atDoor } from '../src/world/rooms';
import { longDrop, longDropPlan, WIDOW_OUT } from '../src/levels/longdrop';
import { TUNING } from '../src/data/tuning';

const DT = 1 / 60;
const W = WIDOW;
let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}
const def = longDrop();
const A = longDropPlan().arena;
const cs = def.solids.map(aabbOf);
// (One of her, at the south edge, for looking at each thing she does. The level has two: see "Two of them".)
const spec = { type: 'widow' as const, x: A.x, y: 0, z: A.z + A.r + WIDOW_OUT, arena: { x0: A.x - A.r, x1: A.x + A.r, z0: A.z - A.r, z1: A.z + A.r } };
const pair = def.enemies.filter((e) => e.type === 'widow');
const R = TUNING.rat.radius;
const input = (o: Partial<PlayerInput> = {}): PlayerInput => ({ move: new THREE.Vector3(), run: false, jumpPressed: false, jumpHeld: false, attackPressed: false, dodgeHeld: false, dodgePressed: false, guardHeld: false, stowPressed: false, ...o } as PlayerInput);
const events = (): CombatEvents => ({ enemyHit: null, enemyKilled: false, playerResult: null, shockwave: false, cratesBroken: [] });
const widow = (roll = 0.5): Widow => {
  const w = new Widow(spec);
  w.rng = () => roll;
  return w;
};
/** The rat on the arena's floor: `x` to her left of its middle (she faces north: her left is east), `north` toward the lip. */
function ratAt(x: number, north: number): PlayerController {
  const p = new PlayerController(new THREE.Vector3(A.x + x, 0, A.z - north));
  p.well = def.well ?? null;
  for (let i = 0; i < 12; i++) p.update(DT, input(), cs);
  return p;
}
interface Seen { hits: number; results: string[]; states: WidowState[]; sounds: string[]; struck: number; hitBy: string[] }
/** One tick of the fight: he does `inp`, she does what she does, and the blows are settled. */
function step(w: Widow, p: PlayerController, seen: Seen, inp: Partial<PlayerInput> = {}): CombatEvents {
  const hp = p.hp;
  p.update(DT, input(inp), cs);
  w.update(DT, p.position.x, p.position.y, p.position.z, !p.dead);
  const ev = events();
  resolveCombat(p, [w], ev);
  seen.sounds.push(...w.events.splice(0));
  if (ev.playerResult === 'hit' || ev.playerResult === 'killed') seen.hitBy.push(`${w.state}@${w.stateTime.toFixed(2)}[d${Math.hypot(p.position.x - w.spot.x, p.position.z - w.spot.z).toFixed(1)} mid${Math.hypot(p.position.x - A.x, p.position.z - A.z).toFixed(1)} head${(Math.hypot(p.position.x - w.x, p.position.z - w.z) - w.radius).toFixed(1)} ${inp.move ? 'mv' : inp.attackPressed ? 'atk' : inp.jumpHeld ? 'jmp' : '-'} ${w.raging ? 'R' : ''}]`);
  if (ev.playerResult) seen.results.push(ev.playerResult);
  if (p.hp < hp) seen.hits += hp - p.hp;
  if (ev.enemyHit) seen.struck++;
  if (seen.states[seen.states.length - 1] !== w.state) seen.states.push(w.state);
  return ev;
}
const fresh = (): Seen => ({ hits: 0, results: [], states: [], sounds: [], struck: 0, hitBy: [] });
/** Runs till she is in `state` (he does `act` each tick). */
function until(w: Widow, p: PlayerController, state: WidowState, seen: Seen, act: (i: number) => Partial<PlayerInput> = () => ({}), frames = 1500): boolean {
  for (let i = 0; i < frames && w.state !== state; i++) step(w, p, seen, act(i));
  return w.state === state;
}
const fromMiddle = (x: number, z: number): number => Math.hypot(x - A.x, z - A.z);
const face = (p: PlayerController, x: number, z: number): void => void (p.facing = Math.atan2(x - p.position.x, z - p.position.z));
/** Woken and waiting: ready to choose her first blow. */
function woken(p: PlayerController, roll = 0.5): { w: Widow; seen: Seen } {
  const w = widow(roll);
  const seen = fresh();
  until(w, p, 'idle', seen);
  return { w, seen };
}

/**
 * Keeping to the rules: out of a marked ring once it has stopped following him (the way he first chose, kept to, and
 * never out of the light), and over a sweeping leg as it comes. Null when nothing is asked of him.
 */
let fleeFrom = '';
const fleeDir = new THREE.Vector3();
const sweepGap = (w: Widow, p: PlayerController): number => {
  const h = w.hip(w.side);
  // (Only the foot strikes: he need only mind it if he is about as far from its hip as it is.)
  if (Math.abs(Math.hypot(p.position.x - h.x, p.position.z - h.z) - w.rho) > W.rakeR + 1) return Infinity;
  const mine = Math.atan2(p.position.x - h.x, p.position.z - h.z) - w.facing;
  return Math.abs(Math.atan2(Math.sin(mine - w.angle), Math.cos(mine - w.angle)));
};
function keepRules(w: Widow, p: PlayerController): Partial<PlayerInput> | null {
  const s = w.state;
  if (s === 'sweep' || s === 'sweepWind') return { jumpPressed: s === 'sweep' && p.grounded && sweepGap(w, p) < (w.raging ? W.sweepRateRage : W.sweepRate) * 0.2, jumpHeld: true };
  const track = s === 'slamWind' ? W.slamTrack : s === 'stabWind' ? W.stabTrack : W.biteTrack;
  const marked = ((s === 'slamWind' || s === 'stabWind' || s === 'biteWind') && w.stateTime > w.windTime * track) || s === 'slam' || s === 'stab' || s === 'bite';
  if (!marked) return null;
  const key = `${w.spot.x},${w.spot.z}`;
  if (key !== fleeFrom) {
    fleeFrom = key;
    fleeDir.set(p.position.x - w.spot.x, 0, p.position.z - w.spot.z);
    // (Standing on its very middle, or with the edge of the light behind him: toward the middle of the room.)
    const ahead = (): number => Math.hypot(p.position.x + fleeDir.x * 3.6 - A.x, p.position.z + fleeDir.z * 3.6 - A.z);
    // (...or her head in the way: it is as solid as a wall.)
    const intoHer = (): boolean => Math.hypot(p.position.x + fleeDir.x * 3.6 - w.x, p.position.z + fleeDir.z * 3.6 - w.z) < w.radius + 1.5;
    if (fleeDir.length() < 0.25 || (fleeDir.normalize(), ahead() > A.r - 0.6) || intoHer()) fleeDir.set(A.x - p.position.x, 0, A.z - p.position.z);
    if (fleeDir.length() < 1) fleeDir.set(1, 0, 0);
    fleeDir.normalize();
  }
  return { move: fleeDir.clone(), run: true };
}
const put = (p: PlayerController, x: number, north: number): void => {
  p.position.set(A.x + x, 0, A.z - north);
  p.prevPosition.copy(p.position);
  p.velocity.set(0, 0, 0);
};
/** Strikes at the nearest piece of her in reach, for as long as she is in `state`: how many blows landed, and what they took. */
function strike(w: Widow, p: PlayerController, seen: Seen, state: WidowState): { blows: number; took: number } {
  const hp = w.hp;
  let blows = 0;
  for (let i = 0; i < 300 && w.state === state; i++) {
    const pieces = [...(w.headDown ? [{ x: w.x, z: w.z, r: w.radius }] : []), ...w.parts];
    const near = pieces.sort((a, b) => Math.hypot(a.x - p.position.x, a.z - p.position.z) - a.r - (Math.hypot(b.x - p.position.x, b.z - p.position.z) - b.r))[0];
    if (!near) break;
    face(p, near.x, near.z);
    const toward = new THREE.Vector3(near.x - p.position.x, 0, near.z - p.position.z);
    if (step(w, p, seen, toward.length() > near.r + 1.2 ? { move: toward.normalize(), run: true } : { attackPressed: i % 5 === 0 }).enemyHit === w) blows++;
  }
  return { blows, took: hp - w.hp };
}

// ---- Where she is ----
{
  const w = widow();
  check('the Widow starts just past the south edge of the light in the Long Drop\'s arena, facing its middle', Math.abs(w.theta) < 1e-9 && Math.abs(w.px - A.x) < 1e-9 && Math.abs(w.pz - (A.z + A.r + W.out)) < 1e-9 && Math.abs(Math.abs(w.facing) - Math.PI) < 1e-9 && w.field.r === A.r && WIDOW_OUT === W.out);
  check('the level has two of her, one out past the east edge of the light and one past the west, each facing the middle; both are to be beaten; the way out is at the south edge, between them', pair.length === 2 && pair.every((e) => Math.abs(e.z - A.z) < 1e-9 && Math.abs(Math.abs(e.x - A.x) - (A.r + W.out)) < 1e-9) && pair[0].x !== pair[1].x && def.goals.length === 1 && def.goals[0].type === 'defeat' && Math.abs(def.exit.x - A.x) < 1 && def.exit.z > A.z + A.r - 1);
  {
    // Her face is in the light, where it is seen; while it is up a sword only glances off it.
    const q = ratAt(0, -(A.r - 1.7));
    const o = woken(q);
    face(q, o.w.x, o.w.z);
    const hp = o.w.hp;
    let glanced = false;
    for (let i = 0; i < 40; i++) glanced ||= step(o.w, q, o.seen, { attackPressed: i % 6 === 0 }).glanced === o.w;
    check('her face is in the light at the edge of the floor, where it is seen; while it is up a sword only glances off it, and does her no harm', fromMiddle(o.w.x, o.w.z) - o.w.radius < A.r && glanced && o.w.hp === hp, `${(A.r - (fromMiddle(o.w.x, o.w.z) - o.w.radius)).toFixed(1)} of her head over the floor`);
  }
  const seen = fresh();
  for (let i = 0; i < 60; i++) w.update(DT, A.x, 20, A.z, true);
  check('she sleeps while he is still falling', w.state === 'lurk' && !w.awake);
  const p = ratAt(0, 0);
  step(w, p, seen);
  check('she wakes when he stands on her floor, and the game is told (her scream)', w.state === 'rise' && w.awake && seen.sounds.includes('wake'));
  let early = false;
  for (let i = 0; i < Math.round(W.rise * 60) - 2; i++) {
    step(w, p, seen);
    early ||= w.attacking;
  }
  check('...and nothing comes at him while she rises', !early && seen.hits === 0 && w.state === 'rise');
  check('she is a boss: named, with her health shown, and too heavy to shove', w.bossName === 'The Widow' && w.maxHp === W.hp && w.immovable && !w.respawns);
  // Under the game's own turn-taking (director.ts) she still takes her turns. (She did not, the first time.)
  const q = ratAt(2, -4);
  const o = { w: widow(), seen: fresh() };
  const director = new Director();
  let struck = false;
  for (let i = 0; i < 60 * 8 && !struck; i++) {
    director.update(DT, [o.w], q.position.x, q.position.z);
    step(o.w, q, o.seen);
    struck ||= o.w.state === 'slam';
  }
  check('under the game\'s own turn-taking she takes her turns: her first blow comes within a few seconds of her waking', struck && o.w.ready !== undefined);
}

// ---- How far she reaches ----
{
  // She stays where she is: it is the legs she stands on that strike, and they are long enough for the near two
  // thirds of the room.
  const hit: string[] = [];
  for (const [x, north] of [[0, 0], [6, -4], [-8, -2], [0, -8], [3, -1], [-5, -3]]) {
    const p = ratAt(x, north);
    const { w, seen } = woken(p);
    const hp = p.hp;
    until(w, p, 'slamStuck', seen);
    if (hp - p.hp !== W.slamDamage || Math.hypot(w.spot.x - w.hip(w.side).x, w.spot.z - w.hip(w.side).z) > W.legReach) hit.push(`${x},${north}: ${hp - p.hp}`);
  }
  check('the legs she stands on reach her half of the room, to its middle: wherever he stands still there (under her, the middle, either side), one comes down on him', hit.length === 0, hit.join('; '));
  const far: string[] = [];
  for (const [x, north] of [[0, 11], [6, 9.5], [-7, 9], [0, 4]]) {
    const p = ratAt(x, north);
    const { w, seen } = woken(p);
    for (let i = 0; i < 60 * 8; i++) step(w, p, seen);
    if (w.state !== 'idle' || seen.hits !== 0 || seen.states.includes('slamWind')) far.push(`${x},${north}: ${w.state}`);
  }
  check('the far half is out of their reach, and she does not strike at what she cannot reach: she waits (it is her sister\'s half)', far.length === 0, far.join('; '));
  const p = ratAt(0, 6);
  const w = widow();
  const seen = fresh();
  const at = w.theta;
  let moved = 0;
  for (let i = 0; i < 60 * 20; i++) {
    step(w, p, seen, i % 600 < 300 ? { move: new THREE.Vector3(1, 0, 0), run: true } : { move: new THREE.Vector3(-1, 0, 0.3), run: true });
    moved = Math.max(moved, Math.abs(w.theta - at), Math.abs(w.lean));
    if (p.dead) p.respawn();
  }
  check('she does not move from her place, whatever he does: no crawling, no leaning in', moved === 0);
}

// ---- Two of them ----
{
  // The two in the level, with him in the middle of the room, where both can reach: they take turns.
  const p = ratAt(0, 0);
  const ws = pair.map((e) => {
    const w = new Widow(e);
    w.rng = () => 0.5;
    return w;
  });
  const struckBy = [0, 0];
  let both = 0;
  let hits = 0;
  for (let i = 0; i < 60 * 40; i++) {
    const hp = p.hp;
    p.update(DT, input(keepRules(ws[0], p) ?? keepRules(ws[1], p) ?? {}), cs);
    for (const w of ws) w.update(DT, p.position.x, p.position.y, p.position.z, !p.dead);
    resolveCombat(p, ws, events());
    for (const w of ws) w.events.length = 0;
    ws.forEach((w, k) => (struckBy[k] += w.state === 'slam' && w.stateTime < DT * 1.5 ? 1 : 0));
    if (ws[0].attacking && ws[1].attacking) both++;
    hits += hp - p.hp;
    // (He comes back to the middle between their blows.)
    if (!ws.some((w) => w.attacking) && Math.hypot(p.position.x - A.x, p.position.z - A.z) > 1) p.position.lerp(new THREE.Vector3(A.x, 0, A.z), 0.1);
  }
  check('TWO OF THEM, one each side: they face each other across the room, and between them their legs reach all of its floor', Math.abs(Math.abs(ws[0].theta - ws[1].theta) - Math.PI) < 1e-6 && ws.every((w) => w.reach + W.slamR + 0.5 >= A.r + W.out), `each reaches ${ws[0].reach.toFixed(1)} of the ${(A.r + W.out).toFixed(1)} to the middle`);
  check('...they take turns: with him in the middle, where both can reach, each strikes in its turn and never both at once', both === 0 && struckBy[0] >= 3 && struckBy[1] >= 3, `${struckBy.join(' and ')} slams; ${both} frames with both striking`);
  check('...and one who keeps to the rules comes through forty seconds between the two of them unhurt', hits === 0, `${hits} lost`);
}

// ---- The slam ----
{
  const p = ratAt(4, -5);
  const { w, seen } = woken(p);
  until(w, p, 'slamWind', seen);
  check('her first blow is the slam, and the leg that is pulled up is on the side he stands', w.state === 'slamWind' && w.side === -1 && seen.sounds.includes('slamWind'));
  for (let i = 0; i < 20; i++) step(w, p, seen);
  check('while the leg goes up, the ring it will come down on is on him', Math.hypot(w.spot.x - p.position.x, w.spot.z - p.position.z) < 0.05);
  const before = p.hp;
  until(w, p, 'slamStuck', seen);
  check('standing still, it comes down on him: two hearts', before - p.hp === W.slamDamage && seen.results.includes('hit'), `${before - p.hp}`);
  check('the foot is stuck in the floor where it came down, within a leg\'s reach of its hip: a piece of her in the light', w.parts.length === 1 && Math.hypot(w.parts[0].x - w.spot.x, w.parts[0].z - w.spot.z) < 1e-9 && Math.hypot(w.spot.x - w.hip(w.side).x, w.spot.z - w.hip(w.side).z) <= W.legReach + 1e-6 && w.open);
  for (const how of ['shield', 'jump'] as const) {
    const q = ratAt(4, -5);
    const o = woken(q);
    until(o.w, q, 'slamWind', o.seen);
    face(q, o.w.px, o.w.pz);
    const hp = q.hp;
    let jumped = false;
    until(o.w, q, 'slamStuck', o.seen, () => {
      if (how === 'shield') return { guardHeld: o.w.state === 'slam' || o.w.stateTime > 0.3 };
      const go = !jumped && o.w.state === 'slamWind' && o.w.stateTime > o.w.windTime - 0.2;
      if (go) jumped = true;
      return { jumpPressed: go, jumpHeld: jumped };
    });
    check(how === 'shield' ? 'a shield held up does not stop the slam' : 'a jump does not get him out from under the slam: it comes from above', hp - q.hp === W.slamDamage, `${hp - q.hp}`);
  }
  const q = ratAt(4, -5);
  const o = woken(q);
  until(o.w, q, 'slamStuck', o.seen, () => keepRules(o.w, q) ?? {});
  check('running out of the ring once it has stopped following him does: it is something to get out from under', o.seen.hits === 0 && o.seen.results.length === 0);
  const hit = strike(o.w, q, o.seen, 'slamStuck');
  check('the foot stuck in the floor can be struck, and it hurts her: half of what the blow would do', hit.blows >= 1 && hit.took > 0 && hit.took <= hit.blows * 1.5, `${hit.blows} blows, ${hit.took} off her`);
}

// ---- The rake ----
{
  /** Where the foot is about to be: `ahead` radians on along its sweep, `nearer` that much nearer its hip. */
  const onPath = (w: Widow, ahead: number, nearer = 0): [number, number] => {
    const dir = w.angle * w.side > -0.2 ? -w.side : w.side;
    const h = w.hip(w.side);
    const [dx, dz] = w.dirOf(w.angle + dir * ahead);
    return [h.x + dx * (w.rho - nearer), h.z + dz * (w.rho - nearer)];
  };
  const upTo = (act: 'stand' | 'jump' | 'shield', nearer = 0): { w: Widow; p: PlayerController; seen: Seen; lost: number } => {
    const p = ratAt(4, -5);
    const { w, seen } = woken(p);
    until(w, p, 'sweepWind', seen, () => keepRules(w, p) ?? {});
    const [x, z] = onPath(w, 0.35, nearer);
    p.position.set(x, 0, z);
    p.prevPosition.copy(p.position);
    p.velocity.set(0, 0, 0);
    face(p, w.px, w.pz);
    const before = p.hp;
    until(w, p, 'sweepEnd', seen, () => (act === 'jump' ? keepRules(w, p) ?? {} : act === 'shield' ? { guardHeld: true } : {}));
    return { w, p, seen, lost: before - p.hp };
  };
  const stood = upTo('stand');
  check('THE RAKE: the foot that stuck is pulled free and rakes the floor round across her front, the leg still arched over it: one heart to one who only stands in its way', stood.lost === W.sweepDamage && stood.seen.sounds.includes('sweepWind') && stood.seen.sounds.includes('sweep'), `${stood.lost}`);
  check('...a jump as it comes clears it', upTo('jump').lost === 0);
  check('...a shield held up does not stop it', upTo('shield').lost === W.sweepDamage);
  check('...it is the foot that strikes, not the whole leg: under the arch of it, nearer her, he is not touched', upTo('stand', 6).lost === 0);
  check('...where it stops, the foot rests on the floor: a piece of her to strike', stood.w.state === 'sweepEnd' && stood.w.parts.length === 1 && Math.hypot(stood.w.parts[0].x - stood.w.tip.x, stood.w.parts[0].z - stood.w.tip.z) < 1e-9 && stood.w.open && Math.abs(Math.hypot(stood.w.tip.x - stood.w.hip(stood.w.side).x, stood.w.tip.z - stood.w.hip(stood.w.side).z) - stood.w.rho) < 1e-6);
  const first = stood.w.side;
  stood.seen.states.length = 0;
  until(stood.w, stood.p, 'idle', stood.seen, () => keepRules(stood.w, stood.p) ?? {}, 1500);
  check('then the other leg does the same from the other side, and only then does she rest', stood.w.side === -first && ['slamWind', 'slam', 'slamStuck', 'sweepWind', 'sweep', 'sweepEnd', 'idle'].every((s) => stood.seen.states.includes(s as WidowState)), stood.seen.states.join());
}

// ---- The stab ----
{
  const stabbed = (act: (w: Widow, p: PlayerController) => Partial<PlayerInput>): { w: Widow; p: PlayerController; seen: Seen; lost: number } => {
    const p = ratAt(2, -6);
    const w = widow();
    const seen = fresh();
    // (He keeps out of her slams and rakes, and goes back to his place between her blows: she strikes only at what she can reach.)
    until(w, p, 'stabWind', seen, () => {
      const home = new THREE.Vector3(A.x + 2 - p.position.x, 0, A.z + 6 - p.position.z);
      return keepRules(w, p) ?? ((w.state === 'idle' || w.state === 'sweepEnd') && home.length() > 0.3 ? { move: home.normalize(), run: true } : {});
    }, 4000);
    seen.hits = 0;
    seen.results.length = 0;
    const before = p.hp;
    face(p, w.px, w.pz);
    for (let i = 0; i < 200 && w.state !== 'stabStuck' && w.state !== 'reel'; i++) step(w, p, seen, act(w, p));
    return { w, p, seen, lost: before - p.hp };
  };
  const still = stabbed(() => ({}));
  check('THE STAB: an inner leg comes down on where he stands: one heart if he only stands there', still.lost === W.stabDamage && still.seen.sounds.includes('stab'), `${still.lost}`);
  check('...the foot is stuck in the floor where it came down: a piece of her in the light', still.w.parts.length === 1 && Math.hypot(still.w.parts[0].x - still.w.spot.x, still.w.parts[0].z - still.w.spot.z) < 1e-9);
  const guarded = stabbed((w) => ({ guardHeld: w.state === 'stab' || w.stateTime > 0.2 }));
  check('...a shield held toward her stops it', guarded.lost === 0 && guarded.seen.results.includes('blocked'), guarded.seen.results.join());
  const aside = stabbed((w, p) => keepRules(w, p) ?? {});
  check('...and so does stepping away once it has stopped following him', aside.lost === 0 && aside.seen.results.length === 0);
  const parried = stabbed((w) => ({ guardHeld: w.state === 'stab' || (w.state === 'stabWind' && w.stateTime > w.windTime - 0.05) }));
  check('...a perfect guard throws her down: her head falls into the light and lies there', parried.lost === 0 && parried.seen.results.includes('parried') && parried.w.state === 'reel' && parried.seen.sounds.includes('reel'), `${parried.seen.results.join()}; ${parried.w.state}`);
  for (let i = 0; i < 20; i++) step(parried.w, parried.p, parried.seen);
  check('...within reach of him, and well inside the edge', parried.w.headDown && fromMiddle(parried.w.x, parried.w.z) < A.r - 1.5, `${fromMiddle(parried.w.x, parried.w.z).toFixed(1)} from the middle`);
  const hit = strike(parried.w, parried.p, parried.seen, 'reel');
  check('...and a blow on her head there counts double', hit.blows >= 1 && parried.seen.sounds.includes('crit') && hit.took >= hit.blows * W.headDouble, `${hit.blows} blows, ${hit.took} off her`);
}

// ---- The bite ----
{
  const bitten = (x: number, north: number, act: (w: Widow, p: PlayerController) => Partial<PlayerInput>): { w: Widow; p: PlayerController; seen: Seen; lost: number; bit: boolean } => {
    const p = ratAt(x, north);
    const w = widow();
    const seen = fresh();
    // (He keeps out of everything till her head rears, going back to his place between her blows.)
    until(w, p, 'biteWind', seen, () => {
      const must = keepRules(w, p);
      if (must) return must;
      const home = new THREE.Vector3(A.x + x - p.position.x, 0, A.z - north - p.position.z);
      return (w.state === 'idle' || w.state === 'stabStuck' || w.state === 'sweepEnd') && home.length() > 0.3 ? { move: home.normalize(), run: true } : {};
    }, 3000);
    const bit = w.state === 'biteWind';
    seen.hits = 0;
    seen.results.length = 0;
    const before = p.hp;
    if (bit) until(w, p, 'biteStuck', seen, () => act(w, p));
    return { w, p, seen, lost: before - p.hp, bit };
  };
  const still = bitten(1, -6, () => ({}));
  check('THE BITE, when he is near her: her head rears, the place is marked on him, and she comes out of the dark and bites down on it: two hearts if he stands there', still.bit && still.lost === W.biteDamage && still.seen.sounds.includes('biteWind') && still.seen.sounds.includes('bite'), `${still.lost}`);
  check('...her head lies where it bit, in the light', still.w.headDown && Math.hypot(still.w.x - still.w.spot.x, still.w.z - still.w.spot.z) < 1e-9 && fromMiddle(still.w.x, still.w.z) < A.r);
  const guarded = bitten(1, -6, (w, p) => {
    face(p, w.px, w.pz);
    return { guardHeld: w.state === 'bite' || w.stateTime > 0.3 };
  });
  check('...a shield held up does not stop it', guarded.lost === W.biteDamage);
  const away = bitten(1, -6, (w, p) => keepRules(w, p) ?? {});
  check('...running out of the ring once it has stopped following him does', away.lost === 0 && away.seen.results.length === 0);
  const hit = strike(away.w, away.p, away.seen, 'biteStuck');
  check('...he has time to run back to her head and strike it more than once, and each blow counts double', hit.blows >= 2 && hit.took >= hit.blows * W.headDouble, `${hit.blows} blows, ${hit.took} off her`);
  until(away.w, away.p, 'idle', away.seen);
  for (let i = 0; i < 40; i++) step(away.w, away.p, away.seen);
  check('...then her head goes back up to its place at the edge', away.w.state !== 'idle' || Math.hypot(away.w.x - away.w.home.x, away.w.z - away.w.home.z) < 0.6);
  const far = bitten(0, 0, () => ({}));
  check('her head only comes so far: to one who keeps to the middle of the room it is her legs, never her jaws', !far.bit && far.seen.states.filter((s) => s === 'slamWind').length >= 3 && !far.seen.states.includes('biteWind'));
}

// ---- Angry ----
{
  const p = ratAt(2, -6);
  const w = widow();
  const seen = fresh();
  until(w, p, 'idle', seen);
  w.takeHit((W.hp * (1 - W.rageAt) + 0.5) / W.legPart, 0, 0, 'sword', 0);
  check('below half her health she is angry, and says so', w.raging && w.events.splice(0).includes('rage'));
  let sweeps = 0;
  const runs: number[] = [];
  let stabs = 0;
  let bites = 0;
  let last: WidowState = w.state;
  for (let i = 0; i < 60 * 60 && !(bites >= W.bitesRage && w.state === 'idle'); i++) {
    // (He keeps to the rules, and between her blows goes back to stand near her: in reach of her head.)
    const home = new THREE.Vector3(w.px + Math.sin(w.facing) * 6 - p.position.x, 0, w.pz + Math.cos(w.facing) * 6 - p.position.z);
    step(w, p, seen, keepRules(w, p) ?? ((w.state === 'idle' || w.state === 'withdraw' || w.state === 'sweepEnd' || (w.state === 'stabStuck' && !w.more)) && home.length() > 0.5 ? { move: home.normalize(), run: true } : {}));
    if (p.dead) break;
    if (w.state !== last) {
      if (w.state === 'sweep') sweeps++;
      if (w.state === 'idle' && sweeps > 0) {
        runs.push(sweeps);
        sweeps = 0;
      }
      if (w.state === 'stab') stabs++;
      if (w.state === 'bite') bites++;
      last = w.state;
    }
  }
  check('angry, each leg\'s rake comes back as well: four of them to every pair of slams', runs.length >= 1 && runs.every((n) => n === 4), runs.join());
  check('...she stabs four times running, and bites three', stabs % W.stabsRage === 0 && stabs >= W.stabsRage && bites === W.bitesRage, `${stabs} stabs, ${bites} bites`);
  check('...and one who keeps to the rules (out of the rings, over the sweeps) comes through a whole round of it unhurt', seen.hits === 0, `${seen.hits} lost; ${seen.hitBy.join()}`);
}

// ---- A whole fight ----
{
  const fight = (roll: number, fights: boolean): { won: boolean; died: boolean; seconds: number; lost: number; out: number; headIn: number; by: string } => {
    const p = ratAt(0, 2);
    const w = widow(roll);
    const seen = fresh();
    let out = 0;
    let headIn = 0;
    let i = 0;
    for (; i < 60 * 300 && w.alive && !p.dead; i++) {
      let inp: Partial<PlayerInput> = {};
      const must = fights ? keepRules(w, p) : null;
      if (must) inp = must;
      else if (fights && w.open && !(w.state === 'stabStuck' && w.more)) {
        // Whatever of her is nearest: her head if it is down, or a piece of a leg. (Not a stuck foot while another
        // stab is coming: that is how she catches the greedy.)
        const pieces = [...(w.headDown ? [{ x: w.x, z: w.z, r: w.radius }] : []), ...w.parts];
        const near = pieces.sort((a, b) => Math.hypot(a.x - p.position.x, a.z - p.position.z) - a.r - (Math.hypot(b.x - p.position.x, b.z - p.position.z) - b.r))[0];
        if (near) {
          face(p, near.x, near.z);
          const toward = new THREE.Vector3(near.x - p.position.x, 0, near.z - p.position.z);
          // (He is not greedy: he stops swinging a little before she moves again, so that he is free to get away.)
          const lasts = { slamStuck: W.slamStuck, sweepEnd: W.sweepEnd, stabStuck: W.stabStuck, biteStuck: W.biteStuck, reel: W.reel }[w.state as 'slamStuck'] ?? 1;
          const greedy = lasts - w.stateTime < 0.35;
          inp = toward.length() > near.r + 1.2 ? { move: toward.normalize(), run: true } : greedy ? {} : { attackPressed: i % 5 === 0 };
        }
      } else if (w.state === 'idle' || w.state === 'withdraw') {
        // Between blows he goes to stand in front of her, within reach of her head.
        const home = new THREE.Vector3(w.px + Math.sin(w.facing) * 6.5 - p.position.x, 0, w.pz + Math.cos(w.facing) * 6.5 - p.position.z);
        if (home.length() > 1) inp = { move: home.normalize(), run: true };
      }
      step(w, p, seen, inp);
      out = Math.max(out, fromMiddle(p.position.x, p.position.z));
      if (!w.headDown && w.alive && fromMiddle(w.x, w.z) - w.radius < A.r - R - 2.2 && w.state !== 'bite' && w.state !== 'withdraw' && w.state !== 'biteWind') headIn++;
    }
    return { won: !w.alive, died: p.dead, seconds: i / 60, lost: seen.hits, out, headIn, by: seen.hitBy.join() };
  };
  const runs = [0.1, 0.5, 0.9].map((r) => fight(r, true));
  check('a whole fight, three times over with her waits long, middling and short: one who keeps to the rules and strikes what lies in the light beats her', runs.every((r) => r.won && !r.died), runs.map((r) => `${r.won ? 'won' : r.died ? 'died' : 'ran out'} in ${r.seconds.toFixed(0)} s, ${r.lost} lost${r.by ? ` to ${r.by}` : ''}`).join('; '));
  check('...it is a real fight: over a minute of it, and not a long siege', runs.every((r) => r.seconds > 60 && r.seconds < 240), runs.map((r) => r.seconds.toFixed(0)).join());
  check('...he is never outside her light, and her head is never in it but to bite or when she is thrown down', runs.every((r) => r.out <= A.r - R + 1e-6 && r.headIn === 0), runs.map((r) => `${r.out.toFixed(2)}, ${r.headIn}`).join('; '));
  const idle = fight(0.5, false);
  check('one who stays within her reach and does nothing about her blows (he only walks back to his place after each) is killed, and quickly', idle.died && !idle.won && idle.seconds < 45, `${idle.seconds.toFixed(0)} s`);
  const p = ratAt(0, 2);
  const w = widow();
  const seen = fresh();
  until(w, p, 'slamStuck', seen, () => keepRules(w, p) ?? {});
  const killed = w.takeHit(999, 0, 0, 'sword', 0);
  for (let i = 0; i < 120; i++) step(w, p, seen);
  check('beaten, she lies with her head in the light; no piece of her strikes or stands in his way after', killed && !w.alive && w.state === 'dead' && !w.attackActive && w.parts.length === 0 && fromMiddle(w.x, w.z) < A.r + 1);
  const walker = ratAt(0, 0);
  let reached = false;
  for (let i = 0; i < 400 && !reached; i++) {
    walker.update(DT, input({ move: new THREE.Vector3(def.exit.x - walker.position.x, 0, def.exit.z - walker.position.z).normalize(), run: true }), cs);
    reached = atDoor(def.exit, walker.position.x, walker.position.z);
  }
  check('and he can walk to the way out', reached);
}

// ---- Drawn where she is solid ----
{
  // Her model, through a fight in which he keeps moving round her room: what is drawn of a leg that strikes is where
  // the rules have it striking, every frame.
  const p = ratAt(3, -6);
  const w = widow();
  const m = new WidowModel();
  const seen = fresh();
  let footOff = 0;
  let flatOff = 0;
  let stabOff = 0;
  let headOff = 0;
  let ringOff = 0;
  let under = 0;
  let bad = 0;
  let stretched = 0;
  const count: Record<string, number> = {};
  for (let i = 0; i < 60 * 90; i++) {
    const a = i / 400;
    const walk = new THREE.Vector3(A.x + Math.sin(a) * 7 - p.position.x, 0, A.z + Math.cos(a) * 7 - p.position.z);
    step(w, p, seen, w.state === 'sweep' ? { jumpPressed: p.grounded, jumpHeld: true } : w.state === 'idle' && walk.length() > 0.5 ? { move: walk.normalize(), run: false } : {});
    if (p.dead) p.respawn();
    m.update(DT, w);
    count[w.state] = (count[w.state] ?? 0) + 1;
    const legs = m.legPoints;
    for (const leg of legs) {
      for (const q of [leg.hip, leg.knee, leg.foot]) {
        if (!Number.isFinite(q.x + q.y + q.z)) bad++;
        if (q.y < -1e-6) under++;
      }
      stretched = Math.max(stretched, leg.hip.distanceTo(leg.knee) - BONE, leg.knee.distanceTo(leg.foot) - BONE);
    }
    const s = w.state;
    const outer = legs.find((l) => !l.inner && l.side === w.side)!;
    const inner = legs.find((l) => l.inner && l.side === w.side)!;
    if (s === 'slamStuck') footOff = Math.max(footOff, Math.hypot(outer.foot.x - w.spot.x, outer.foot.z - w.spot.z) + Math.abs(outer.foot.y));
    if (s === 'sweep' || s === 'sweepEnd') {
      const h = w.hip(w.side);
      // (Its foot where the rules have it striking, on the floor; its hip at her shoulder, high; its knee higher than its foot: still a leg.)
      flatOff = Math.max(flatOff, Math.hypot(outer.foot.x - w.tip.x, outer.foot.z - w.tip.z), Math.hypot(outer.hip.x - h.x, outer.hip.z - h.z), outer.foot.y - 0.3, W.hipHigh - 0.5 - outer.hip.y, 1 - outer.knee.y);
    }
    if (s === 'stabStuck') stabOff = Math.max(stabOff, Math.hypot(inner.foot.x - w.spot.x, inner.foot.z - w.spot.z) + Math.abs(inner.foot.y));
    if (s === 'slamWind' || s === 'stabWind' || s === 'biteWind') ringOff = Math.max(ringOff, m.ringAt ? Math.hypot(m.ringAt.x - w.spot.x, m.ringAt.z - w.spot.z) : 99);
    else if (m.ringAt) ringOff = 99;
    headOff = Math.max(headOff, Math.hypot(m.headPosition.x - w.x, m.headPosition.z - w.z));
    if (w.headDown && w.stateTime > 0.3 && m.headPosition.y > w.radius) headOff = 99;
  }
  check('her model, through ninety seconds of her fighting one who keeps moving round her room: a slamming leg\'s foot is drawn stuck in the floor where the rules have it', (count.slamStuck ?? 0) > 20 && footOff < 1e-6, `${footOff.toFixed(4)}`);
  check('...a raking leg is drawn with its foot on the floor where the rules have it striking, and the leg arched up from it to her shoulder: joined to her, never laid flat', (count.sweep ?? 0) > 20 && flatOff < 1e-6, `${flatOff.toFixed(4)}`);
  check('...a stabbing foot is drawn stuck where it struck, and the ring on the floor is where each blow will land and nowhere else', (count.stabStuck ?? 0) > 20 && stabOff < 1e-6 && ringOff < 1e-6, `${stabOff.toFixed(4)}; ring ${ringOff.toFixed(4)}`);
  check('...her head is drawn where the sword meets it, and is down on the floor when the rules say it is down', headOff < 1e-6, `${headOff.toFixed(4)}`);
  check('...no leg is ever stretched past its bones, under the floor, or nowhere', stretched < 0.02 && under === 0 && bad === 0, `stretched ${stretched.toFixed(3)}; ${under} under the floor; ${bad} bad numbers`);
  check('...and all of what she does was seen in that time', ['slamWind', 'slam', 'slamStuck', 'sweep', 'sweepEnd', 'stabWind', 'stabStuck', 'idle'].every((s) => (count[s] ?? 0) > 0), Object.keys(count).join());
}

// ---------------------------------------------------------------- her young, and the pointer to an unseen sister
{
  // Angry, her young come out of the dark. (The owner: "have her send out baby spiders that make you have to keep
  // moving around".)
  const w = widow();
  const p = ratAt(0, 6);
  let guard = 0;
  while (w.young.length === 0 && w.alive && guard++ < 4000) {
    w.update(DT, p.position.x, p.position.y, p.position.z, true);
    w.events.length = 0;
    if (w.hp > w.maxHp * WIDOW.rageAt - 1) w.takeHit(1, p.position.x, p.position.z, 'sword', 0);
  }
  const young = [...w.young];
  const f = w.field;
  const out = young.map((y) => Math.hypot(y.x - f.x, y.z - f.z));
  const toHer = young.map((y) => Math.abs(Math.atan2(Math.sin(Math.atan2(y.x - f.x, y.z - f.z) - w.theta), Math.cos(Math.atan2(y.x - f.x, y.z - f.z) - w.theta))));
  check('turned angry, she sends out her young: two of them, once', young.length === WIDOW.young && young.length === 2 && w.alive, `${young.length} at ${w.hp} of ${w.maxHp}`);
  check('they come out at the edge of the light, on the lit floor, one either side of her', out.every((d) => d < f.r && d > f.r - 2) && toHer.every((a) => a > 0.3 && a < 1) && Math.hypot(young[0].x - young[1].x, young[0].z - young[1].z) > 3, out.map((d) => (f.r - d).toFixed(1)).join(' '));
  w.young.length = 0;
  for (let i = 0; i < 1200; i++) {
    w.update(DT, p.position.x, p.position.y, p.position.z, true);
    w.events.length = 0;
  }
  check('and no more after that', w.young.length === 0);
  check('in the level each of the two Widows has young of her own to send: they count toward nothing (the goal is the Widows)', pair.length === 2 && def.goals.length === 1 && def.goals[0].type === 'defeat');

  // The pointer: while a ring is on the floor a wedge runs from its edge toward HER.
  const v = widow();
  // (He stands on her side of the floor, where her legs reach: the far half is her sister's.)
  const q = ratAt(Math.sign(spec.x - A.x) * 6, 0);
  const model = new WidowModel();
  let shown: { strip: THREE.Mesh; ring: THREE.Mesh } | null = null;
  for (let i = 0; i < 2400 && !shown; i++) {
    v.update(DT, q.position.x, q.position.y, q.position.z, true);
    v.events.length = 0;
    model.update(DT, v);
    const m = model as unknown as { strip: THREE.Mesh; ring: THREE.Mesh };
    if (m.ring.visible && m.strip.visible) shown = m;
  }
  const ok = !!shown && ((): boolean => {
    const { strip, ring } = shown!;
    // Its point: a unit along its own +z, turned and stretched.
    const tip = new THREE.Vector3(0, 0, 1).multiply(strip.scale).applyEuler(strip.rotation).add(strip.position);
    const toHerNow = Math.hypot(v.px - ring.position.x, v.pz - ring.position.z);
    const tipToHer = Math.hypot(v.px - tip.x, v.pz - tip.z);
    const baseOut = Math.hypot(strip.position.x - ring.position.x, strip.position.z - ring.position.z);
    return tipToHer < toHerNow - 1 && Math.abs(baseOut - ring.scale.x) < 0.05 && Math.abs(strip.position.y - ring.position.y) < 1e-6;
  })();
  check('before a blow a POINTER lies on the floor with the ring: from the ring\'s edge toward her, so a blow from the one behind the camera says which side it comes from', ok);
}

console.log(failures === 0 ? 'widow: all passed' : `widow: ${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
