// The Widow: the boss in the dark at the bottom of the Long Drop (src/enemies/widow.ts).
//
// The owner, 2026-11-16: "it's actually so big that he doesn't even really fit in the arena it's just like a giant
// spider's head connected to a body that goes into the darkness and then you have to deal with like his front four
// legs and ... mandibles ... he'll like slam down one side of the field and sweep across and then slam down the other
// side of the field and sweep across or he'll like bite down on certain parts of the field and you have to like Dodge
// all his attacks." All of it here with the real controller, the real combat and the real arena.
import './../src/core/colorSetup';
import * as THREE from 'three';
import { PlayerController, type PlayerInput } from '../src/player/controller';
import { Widow, WIDOW, type WidowState } from '../src/enemies/widow';
import { WidowModel } from '../src/enemies/widowModel';
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
const spec = def.enemies.find((e) => e.type === 'widow')!;
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
  if (ev.playerResult === 'hit' || ev.playerResult === 'killed') seen.hitBy.push(`${w.state}@${w.stateTime.toFixed(2)}`);
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
 * Keeping to the rules: off the line of a slam once it has stopped following him, over a sweep as it comes, and out of
 * a marked place once it has stopped following him (the way he first chose, kept to, and never out of the light).
 * Null when nothing is asked of him.
 */
let fleeFrom = '';
const fleeDir = new THREE.Vector3();
function keepRules(w: Widow, p: PlayerController): Partial<PlayerInput> | null {
  const s = w.state;
  if (s === 'slamWind' && w.stateTime > w.windTime * W.slamTrack) {
    // Straight off the line, to whichever side of it keeps him in the light.
    const [dx, dz] = w.dirOf(w.angle);
    const off = new THREE.Vector3(dz, 0, -dx);
    if (Math.hypot(p.position.x + off.x * 3 - A.x, p.position.z + off.z * 3 - A.z) > A.r - 0.6) off.negate();
    return { move: off, run: true };
  }
  if (s === 'sweep' || s === 'sweepWind') {
    const h = w.hip(w.side);
    const mine = Math.atan2(p.position.x - h.x, p.position.z - h.z) - w.facing;
    const gap = Math.abs(Math.atan2(Math.sin(mine - w.angle), Math.cos(mine - w.angle)));
    return { jumpPressed: s === 'sweep' && p.grounded && gap < (w.raging ? W.sweepRateRage : W.sweepRate) * 0.2, jumpHeld: true };
  }
  const stab = (s === 'stabWind' && w.stateTime > w.windTime * W.stabTrack) || s === 'stab';
  const bite = (s === 'biteWind' && w.stateTime > w.windTime * W.biteTrack) || s === 'bite';
  if (stab || bite) {
    const key = `${w.spot.x},${w.spot.z}`;
    if (key !== fleeFrom) {
      fleeFrom = key;
      fleeDir.set(p.position.x - w.spot.x, 0, p.position.z - w.spot.z);
      // (Standing on its very middle, or with the edge of the light behind him: toward the middle of the room.)
      const ahead = (): number => Math.hypot(p.position.x + fleeDir.x * 3.4 - A.x, p.position.z + fleeDir.z * 3.4 - A.z);
      if (fleeDir.length() < 0.25 || (fleeDir.normalize(), ahead() > A.r - 0.6)) fleeDir.set(A.x - p.position.x, 0, A.z - p.position.z);
      if (fleeDir.length() < 1) fleeDir.set(1, 0, 0);
      fleeDir.normalize();
    }
    return { move: fleeDir.clone(), run: true };
  }
  return null;
}

// ---- Where she is ----
{
  const w = widow();
  check('the Widow is in the Long Drop\'s arena: her place is just past the south edge of its light, and she faces up the room', Math.abs(spec.x - A.x) < 1e-9 && Math.abs(spec.z - (A.z + A.r + WIDOW_OUT)) < 1e-9 && Math.abs(w.facing - Math.PI) < 1e-9 && w.field.r === A.r && Math.abs(w.field.z - A.z) < 1e-9);
  check('the level asks for her to be beaten, and its way out is at the side of the light: not where she is, and not behind him as he faces her (where the view is)', def.goals.length === 1 && def.goals[0].type === 'defeat' && Math.abs(def.exit.z - A.z) < 1 && def.exit.x > A.x + A.r - 1 && fromMiddle(def.exit.x, def.exit.z) < A.r);
  check('she waits with her head back in the dark, further out than his sword can reach from the edge of the light', fromMiddle(w.x, w.z) - w.radius - (A.r - R) > 3, `${(fromMiddle(w.x, w.z) - w.radius - (A.r - R)).toFixed(1)} beyond where he can stand`);
  // He cannot wake her from above, and cannot reach her before she wakes.
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
}

// ---- In the game ----
{
  // The game lets enemies strike by turns (director.ts), and only those that say they are ready get one. With that
  // rule running every tick, as it does in the game, she still fights. (She did not, the first time she was put in.)
  const p = ratAt(2, 6);
  const w = widow();
  const seen = fresh();
  const director = new Director();
  let struck = false;
  for (let i = 0; i < 60 * 8 && !struck; i++) {
    director.update(DT, [w], p.position.x, p.position.z);
    step(w, p, seen);
    struck ||= w.state === 'slam';
  }
  check('under the game\'s own turn-taking she takes her turns: her first blow comes within a few seconds of her waking', struck && w.ready !== undefined && seen.states.includes('slamWind'), seen.states.join());
}

// ---- The slam and the sweep ----
{
  // He stands to her right (she faces north, so that is east) and does nothing: the first blow is a slam, from that side.
  const p = ratAt(5, 2);
  const { w, seen } = woken(p);
  until(w, p, 'slamWind', seen);
  check('her first blow is the slam, and the leg that goes up is on the side he stands', w.state === 'slamWind' && w.side === -1 && w.hip(w.side).x > w.px && seen.sounds.includes('slamWind'));
  // The line it will come down on follows him, then holds.
  const lineOff = (): number => {
    const h = w.hip(w.side);
    const [dx, dz] = w.dirOf(w.angle);
    return Math.abs((p.position.x - h.x) * dz - (p.position.z - h.z) * dx);
  };
  for (let i = 0; i < 20; i++) step(w, p, seen);
  check('while the leg goes up, the line it will come down on is on him', lineOff() < 0.05, `${lineOff().toFixed(3)} off him`);
  until(w, p, 'slam', seen);
  const before = p.hp;
  until(w, p, 'slamStuck', seen);
  check('standing still, it comes down on him: two hearts', before - p.hp === W.slamDamage && seen.results.includes('hit'), `${before - p.hp}`);
  check('the leg lies along the floor across the room: a row of solid pieces of her, all in the light', w.parts.length > 12 && w.parts.every((q) => fromMiddle(q.x, q.z) <= A.r + 0.8) && w.open);  // Wherever he stands still, a slam finds him: in the lane straight in front of her as much as out at the sides.
  const safe: string[] = [];
  for (const [x, north] of [[0, 0], [0, -8], [3, 6.4], [-3, 6.4], [1.5, 10], [-9, -2], [10, 3], [0, 11.5]]) {
    const q = ratAt(x, north);
    const o = woken(q);
    const hp = q.hp;
    until(o.w, q, 'slamStuck', o.seen);
    if (hp - q.hp !== W.slamDamage) safe.push(`${x},${north}`);
  }
  check('wherever he stands still, the slam finds him: straight in front of her as much as out at the sides, near her or far', safe.length === 0, `safe at ${safe.join('; ')}`);
}
{
  // A shield does not stop it, and a jump does not get him out of it.
  for (const how of ['shield', 'jump'] as const) {
    const p = ratAt(5, 2);
    const { w, seen } = woken(p);
    until(w, p, 'slamWind', seen);
    face(p, w.px, w.pz);
    const before = p.hp;
    let jumped = false;
    until(w, p, 'slamStuck', seen, () => {
      if (how === 'shield') return { guardHeld: w.state === 'slam' || w.stateTime > 0.3 };
      const go = !jumped && w.state === 'slamWind' && w.stateTime > w.windTime - 0.2;
      if (go) jumped = true;
      return { jumpPressed: go, jumpHeld: jumped };
    });
    check(how === 'shield' ? 'a shield held up does not stop the slam' : 'a jump does not get him out from under the slam: it comes from above', before - p.hp === W.slamDamage, `${before - p.hp}; ${seen.results.join()}`);
  }
  // Stepping off the line once she has committed to it does.
  const p = ratAt(5, 2);
  const { w, seen } = woken(p);
  until(w, p, 'slamWind', seen);
  const before = p.hp;
  until(w, p, 'slamStuck', seen, () => (w.stateTime > w.windTime * W.slamTrack ? { move: new THREE.Vector3(1, 0, 0), run: true } : {}));
  check('running off the line once it has stopped following him does: it is something to step out from under', p.hp === before && seen.hits === 0);
  // The leg lying there can be hit, and it hurts her.
  const hp = w.hp;
  const near = w.parts.slice().sort((a, b) => Math.hypot(a.x - p.position.x, a.z - p.position.z) - Math.hypot(b.x - p.position.x, b.z - p.position.z))[0];
  let struck = false;
  for (let i = 0; i < 40 && w.state === 'slamStuck' && !struck; i++) {
    face(p, near.x, near.z);
    const toward = new THREE.Vector3(near.x - p.position.x, 0, near.z - p.position.z);
    const ev = step(w, p, seen, toward.length() > 1.3 ? { move: toward.normalize(), run: true } : { attackPressed: i % 6 === 0 });
    struck ||= ev.enemyHit === w;
  }
  check('the leg lying on the floor can be struck, and it hurts her: half of what the blow would do', struck && hp - w.hp > 0 && hp - w.hp <= 1.5, `${hp - w.hp} off her`);
}
{
  // The sweep: from where the leg lies, right across the floor to the other side. Wherever he stands, it finds him.
  // (The leg came down from her right, on the line through where he stood, and sweeps away to her left: these are
  // all on the side of that line it sweeps over.)
  const places: Array<[number, number]> = [[-4, 8], [0, 0], [-7, -3], [1, -9], [-2, 11], [-9, 2]];
  const missed: string[] = [];
  const caught: string[] = [];
  for (const [x, north] of places) {
    for (const jump of [false, true]) {
      const p = ratAt(5, 2);
      const { w, seen } = woken(p);
      // (Out from under the slam, then to his place to wait for the sweep.)
      until(w, p, 'slamStuck', seen, () => (w.state === 'slamWind' && w.stateTime > w.windTime * W.slamTrack ? { move: new THREE.Vector3(1, 0, 0), run: true } : {}));
      p.position.set(A.x + x, 0, A.z - north);
      p.prevPosition.copy(p.position);
      p.velocity.set(0, 0, 0);
      const before = p.hp;
      let jumped = false;
      until(w, p, 'sweepEnd', seen, () => {
        if (!jump || w.state !== 'sweep') return {};
        // (He jumps as it comes: when it is a fifth of a second off him.)
        const h = w.hip(w.side);
        const mine = Math.atan2(p.position.x - h.x, p.position.z - h.z) - w.facing;
        const gap = Math.abs(Math.atan2(Math.sin(mine - w.angle), Math.cos(mine - w.angle)));
        const go = !jumped && gap < W.sweepRate * 0.2;
        if (go) jumped = true;
        return { jumpPressed: go, jumpHeld: jumped };
      });
      const hurt = before - p.hp;
      if (!jump && hurt !== W.sweepDamage) missed.push(`${x},${north}: ${hurt}`);
      if (jump && hurt !== 0) caught.push(`${x},${north}: ${hurt}`);
    }
  }
  check('THE SWEEP crosses the whole floor: wherever he stands still (near her, in the middle, at the far edge, either side), it takes a heart', missed.length === 0, missed.join('; '));
  check('...and a jump as it comes clears it, wherever he is', caught.length === 0, caught.join('; '));
  // A shield does not stop it either.
  const p = ratAt(5, 2);
  const { w, seen } = woken(p);
  until(w, p, 'slamStuck', seen, () => (w.state === 'slamWind' && w.stateTime > w.windTime * W.slamTrack ? { move: new THREE.Vector3(1, 0, 0), run: true } : {}));
  p.position.set(A.x - 3, 0, A.z);
  face(p, w.hip(w.side).x, w.hip(w.side).z);
  const before = p.hp;
  until(w, p, 'sweepEnd', seen, () => ({ guardHeld: w.state === 'sweep' }));
  check('...a shield held up does not stop it', before - p.hp === W.sweepDamage);
  {
    // Behind the leg (on its own side of the line it came down on) its sweep does not come: the other leg's does.
    const q = ratAt(5, 2);
    const o = woken(q);
    until(o.w, q, 'slamStuck', o.seen, () => (o.w.state === 'slamWind' && o.w.stateTime > o.w.windTime * W.slamTrack ? { move: new THREE.Vector3(1, 0, 0), run: true } : {}));
    q.position.set(A.x + 11, 0, A.z);
    q.prevPosition.copy(q.position);
    const hp0 = q.hp;
    until(o.w, q, 'sweepEnd', o.seen);
    const afterFirst = hp0 - q.hp;
    until(o.w, q, 'slamWind', o.seen);
    // (So far out to the side the other leg cannot come down on him; its sweep comes all the way.)
    until(o.w, q, 'sweepEnd', o.seen);
    check('one who gets behind the leg, far out to the side, is out of its sweep: the other leg, from the other side, sweeps him up', afterFirst === 0 && hp0 - q.hp === W.sweepDamage, `${afterFirst} from the first, ${hp0 - q.hp} in all`);
  }
  // ...and then the other leg, from the other side: slam, and sweep back.
  const first = w.side;
  seen.states.length = 0;
  until(w, p, 'idle', seen, () => ({}), 1200);
  check('then the other leg does the same from the other side, and only then does she rest', w.side === -first && ['slamWind', 'slam', 'slamStuck', 'sweepWind', 'sweep', 'sweepEnd', 'idle'].every((s) => seen.states.includes(s as WidowState)), seen.states.join());
}

// ---- The stab ----
{
  const stabbed = (act: (w: Widow, p: PlayerController) => Partial<PlayerInput>): { w: Widow; p: PlayerController; seen: Seen; lost: number } => {
    const p = ratAt(2, 3);
    const w = widow();
    const seen = fresh();
    // (Her round is slam, stab, bite: he keeps out of the slams, and waits for the stab.)
    until(w, p, 'stabWind', seen, () => {
      if (w.state === 'slamWind' && w.stateTime > w.windTime * W.slamTrack) return { move: new THREE.Vector3(w.side, 0, 0), run: true };
      if (w.state === 'sweep' || w.state === 'sweepWind') return { jumpPressed: p.grounded, jumpHeld: true };
      return {};
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
  const aside = stabbed((w) => (w.stateTime > w.windTime * W.stabTrack ? { move: new THREE.Vector3(0, 0, -1), run: true } : {}));
  check('...and so does stepping away once it has stopped following him', aside.lost === 0 && aside.seen.results.length === 0);
  const parried = stabbed((w) => ({ guardHeld: w.state === 'stab' || (w.state === 'stabWind' && w.stateTime > w.windTime - 0.05) }));
  check('...a perfect guard throws her down: her head falls into the light and lies there', parried.lost === 0 && parried.seen.results.includes('parried') && parried.w.state === 'reel' && parried.seen.sounds.includes('reel'), `${parried.seen.results.join()}; ${parried.w.state}`);
  {
    const { w, p, seen } = parried;
    for (let i = 0; i < 20; i++) step(w, p, seen);
    check('...within reach of him, and well inside the edge', w.headDown && fromMiddle(w.x, w.z) < A.r - 1.5, `${fromMiddle(w.x, w.z).toFixed(1)} from the middle`);
    const hp = w.hp;
    let struck = 0;
    for (let i = 0; i < 200 && w.state === 'reel' && !struck; i++) {
      face(p, w.x, w.z);
      const toward = new THREE.Vector3(w.x - p.position.x, 0, w.z - p.position.z);
      const far = toward.length() > w.radius + 1.2;
      const ev = step(w, p, seen, far ? { move: toward.normalize(), run: true } : { attackPressed: i % 6 === 0 });
      if (ev.enemyHit === w) struck = hp - w.hp;
    }
    check('...and a blow on her head there counts double', struck > 0 && seen.sounds.includes('crit') && Math.abs(struck / W.headDouble - Math.round(struck / W.headDouble)) < 1e-9 && struck >= 2, `${struck} off her`);
  }
}

// ---- The bite ----
{
  const bitten = (x: number, north: number, act: (w: Widow, p: PlayerController) => Partial<PlayerInput>): { w: Widow; p: PlayerController; seen: Seen; lost: number; bit: boolean } => {
    const p = ratAt(x, north);
    const w = widow();
    const seen = fresh();
    let bit = true;
    // (He keeps out of everything till her head rears.)
    until(w, p, 'biteWind', seen, () => {
      if (w.state === 'slamWind' && w.stateTime > w.windTime * W.slamTrack) return { move: new THREE.Vector3(w.side, 0, 0), run: true };
      if ((w.state === 'stabWind' && w.stateTime > w.windTime * W.stabTrack) || w.state === 'stab') return { move: new THREE.Vector3(-Math.sign(p.position.x - A.x) || 1, 0, 0), run: true };
      if (w.state === 'sweep' || w.state === 'sweepWind') return { jumpPressed: p.grounded, jumpHeld: true };
      return {};
    }, 2400);
    if (w.state !== 'biteWind') bit = false;
    seen.hits = 0;
    seen.results.length = 0;
    const before = p.hp;
    if (bit) until(w, p, 'biteStuck', seen, () => act(w, p));
    return { w, p, seen, lost: before - p.hp, bit };
  };
  const still = bitten(1, -4, () => ({}));
  check('THE BITE: her head rears, the place is marked on him, and she comes out of the dark and bites down on it: two hearts if he stands there', still.bit && still.lost === W.biteDamage && still.seen.sounds.includes('biteWind') && still.seen.sounds.includes('bite'), `${still.lost}`);
  check('...her head lies where it bit, in the light', still.w.headDown && Math.hypot(still.w.x - still.w.spot.x, still.w.z - still.w.spot.z) < 1e-9 && fromMiddle(still.w.x, still.w.z) < A.r);
  const guarded = bitten(1, -4, (w, p) => {
    face(p, w.px, w.pz);
    return { guardHeld: w.state === 'bite' || w.stateTime > 0.3 };
  });
  check('...a shield held up does not stop it', guarded.lost === W.biteDamage);
  const away = bitten(1, -4, (w) => (w.stateTime > w.windTime * W.biteTrack || w.state === 'bite' ? { move: new THREE.Vector3(0, 0, -1), run: true } : {}));
  check('...running out of the ring once it has stopped following him does', away.lost === 0 && away.seen.results.length === 0);
  {
    // Her head, lying there, is the great opening.
    const { w, p, seen } = away;
    const hp = w.hp;
    let blows = 0;
    for (let i = 0; i < Math.round(W.biteStuck * 60) + 30 && w.state === 'biteStuck'; i++) {
      face(p, w.x, w.z);
      const toward = new THREE.Vector3(w.x - p.position.x, 0, w.z - p.position.z);
      const ev = step(w, p, seen, toward.length() > w.radius + 1.2 ? { move: toward.normalize(), run: true } : { attackPressed: i % 5 === 0 });
      if (ev.enemyHit === w) blows++;
    }
    check('...he has time to run back to it and strike it more than once, and each blow counts double', blows >= 2 && hp - w.hp >= blows * W.headDouble, `${blows} blows, ${hp - w.hp} off her`);
    until(w, p, 'idle', seen);
    for (let i = 0; i < 30; i++) step(w, p, seen, {});
    check('...then her head goes back into the dark, out of reach', fromMiddle(w.x, w.z) - w.radius - (A.r - R) > 2.5 || w.state !== 'idle', `${(fromMiddle(w.x, w.z) - w.radius - (A.r - R)).toFixed(1)}`);
  }
  // Her head cannot reach the far side of the room.
  const far = bitten(0, 11, () => ({}));
  check('her head cannot reach the far side of the room: one who stays there is never bitten (her legs can reach him)', !far.bit && far.seen.states.filter((s) => s === 'stabWind').length >= 2 && !far.seen.states.includes('biteWind'), far.seen.states.slice(0, 30).join());
}

// ---- Angry ----
{
  const p = ratAt(2, 3);
  const w = widow();
  const seen = fresh();
  until(w, p, 'idle', seen);
  w.takeHit((W.hp * (1 - W.rageAt) + 0.5) / W.legPart, 0, 0, 'sword', 0);
  check('below half her health she is angry, and says so', w.raging && w.events.splice(0).includes('rage'));
  // Through one round of hers, with him keeping out of all of it by the rules above.
  const dodge = (): Partial<PlayerInput> => keepRules(w, p) ?? {};
  seen.states.length = 0;
  let sweeps = 0;
  let stabs = 0;
  let bites = 0;
  let last: WidowState = w.state;
  for (let i = 0; i < 60 * 45 && !(bites >= W.bitesRage && w.state === 'idle'); i++) {
    step(w, p, seen, dodge());
    if (w.state !== last) {
      if (w.state === 'sweep') sweeps++;
      if (w.state === 'stab') stabs++;
      if (w.state === 'bite') bites++;
      last = w.state;
    }
  }
  check('angry, each leg\'s sweep comes back as well: four sweeps to a pair of slams', sweeps === 4, `${sweeps}`);
  check('...she stabs four times running, and bites three', stabs === W.stabsRage && bites === W.bitesRage, `${stabs} stabs, ${bites} bites`);
  check('...and one who keeps to the rules (off the line, over the sweep, out of the ring) comes through a whole round of it unhurt', seen.hits === 0, `${seen.hits} lost; ${seen.hitBy.join()}`);
}

// ---- A whole fight ----
{
  // He fights her by the rules: keeps out of what is marked, jumps the sweeps, and strikes whatever of her lies in the light.
  const fight = (roll: number, fights: boolean): { won: boolean; died: boolean; seconds: number; lost: number; out: number; headIn: number; by: string } => {
    const p = ratAt(0, 2);
    const w = widow(roll);
    const seen = fresh();
    let out = 0;
    let headIn = 0;
    let i = 0;
    for (; i < 60 * 240 && w.alive && !p.dead; i++) {
      const s = w.state;
      let inp: Partial<PlayerInput> = {};
      const must = fights ? keepRules(w, p) : null;
      if (!fights) inp = {};
      else if (must) inp = must;
      else if (w.open && !(w.state === 'stabStuck' && w.more)) {
        // Whatever of her is nearest: her head if it is down, or a piece of a leg. (Not a foot stuck in the floor
        // while another stab is coming: that is how she catches the greedy.)
        const pieces = [...(w.headDown ? [{ x: w.x, z: w.z, r: w.radius }] : []), ...w.parts];
        const near = pieces.sort((a, b) => Math.hypot(a.x - p.position.x, a.z - p.position.z) - a.r - (Math.hypot(b.x - p.position.x, b.z - p.position.z) - b.r))[0];
        if (near) {
          face(p, near.x, near.z);
          const toward = new THREE.Vector3(near.x - p.position.x, 0, near.z - p.position.z);
          inp = toward.length() > near.r + 1.2 ? { move: toward.normalize(), run: true } : { attackPressed: i % 5 === 0 };
        }
      } else if (s === 'idle' || s === 'withdraw') {
        // Between blows he comes back toward the middle, a little to her side of it: within reach of her head.
        const home = new THREE.Vector3(A.x - p.position.x, 0, A.z + 3 - p.position.z);
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
  check('...it is a real fight: over a minute of it, and not a long siege', runs.every((r) => r.seconds > 60 && r.seconds < 200), runs.map((r) => r.seconds.toFixed(0)).join());
  check('...he is never outside her light, and her head is never in it but to bite or when she is thrown down', runs.every((r) => r.out <= A.r - R + 1e-6 && r.headIn === 0), runs.map((r) => `${r.out.toFixed(2)}, ${r.headIn}`).join('; '));
  const idle = fight(0.5, false);
  check('one who only stands there is killed, and quickly: she is not to be waited out', idle.died && !idle.won && idle.seconds < 40, `${idle.seconds.toFixed(0)} s`);
  // When she dies she lies with her head in the light, and nothing more comes.
  const p = ratAt(0, 2);
  const w = widow();
  const seen = fresh();
  until(w, p, 'slamStuck', seen, () => (w.state === 'slamWind' && w.stateTime > w.windTime * W.slamTrack ? { move: new THREE.Vector3(w.side, 0, 0), run: true } : {}));
  const killed = w.takeHit(999, 0, 0, 'sword', 0);
  for (let i = 0; i < 120; i++) step(w, p, seen);
  check('beaten, she lies with her head in the light; no piece of her strikes or stands in his way after', killed && !w.alive && w.state === 'dead' && !w.attackActive && w.parts.length === 0 && fromMiddle(w.x, w.z) < A.r + 1, `${fromMiddle(w.x, w.z).toFixed(1)}`);
  // The way out, behind where he landed.
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
  // Her model, through a fight: every frame, what is drawn of a leg that strikes is where the rules have it striking.
  const p = ratAt(4, 1);
  const w = widow();
  const m = new WidowModel();
  const seen = fresh();
  let slamOff = 0;
  let kneeUp = 0;
  let stabOff = 0;
  let headOff = 0;
  let under = 0;
  let bad = 0;
  let stretched = 0;
  let frames = 0;
  const count: Record<string, number> = {};
  for (let i = 0; i < 60 * 70; i++) {
    step(w, p, seen, w.state === 'sweep' || w.state === 'sweepWind' ? { jumpPressed: p.grounded && w.state === 'sweep', jumpHeld: true } : {});
    if (p.dead) {
      p.respawn();
      p.position.set(A.x + 4, 0, A.z - 1);
    }
    m.update(DT, w);
    frames++;
    count[w.state] = (count[w.state] ?? 0) + 1;
    const legs = m.legPoints;
    for (const leg of legs) {
      for (const q of [leg.hip, leg.knee, leg.foot]) {
        if (!Number.isFinite(q.x + q.y + q.z)) bad++;
        if (q.y < -1e-6) under++;
      }
      stretched = Math.max(stretched, leg.hip.distanceTo(leg.knee) - (W.legLen / 2 + 0.01), leg.knee.distanceTo(leg.foot) - (W.legLen / 2 + 0.01));
    }
    const s = w.state;
    if (s === 'slamStuck' || s === 'sweepWind' || s === 'sweep' || s === 'sweepEnd') {
      const leg = legs.find((l) => !l.inner && l.side === w.side)!;
      const h = w.hip(w.side);
      const [dx, dz] = w.dirOf(w.angle);
      slamOff = Math.max(slamOff, Math.hypot(leg.foot.x - (h.x + dx * W.legLen), leg.foot.z - (h.z + dz * W.legLen)), Math.hypot(leg.hip.x - h.x, leg.hip.z - h.z));
      // (Its knee is on the line too, and low: the leg LIES there.)
      kneeUp = Math.max(kneeUp, leg.knee.y, Math.abs((leg.knee.x - h.x) * dz - (leg.knee.z - h.z) * dx));
    }
    if (s === 'stabStuck') {
      const leg = legs.find((l) => l.inner && l.side === w.side)!;
      stabOff = Math.max(stabOff, Math.hypot(leg.foot.x - w.spot.x, leg.foot.z - w.spot.z) + Math.abs(leg.foot.y));
    }
    headOff = Math.max(headOff, Math.hypot(m.headPosition.x - w.x, m.headPosition.z - w.z));
    if (w.headDown && w.stateTime > 0.3 && m.headPosition.y > w.radius) headOff = 99;
  }
  check('her model, through seventy seconds of her fighting: a leg that lies on the floor is drawn on the line it strikes along, from its hip to its far end, and lies low', slamOff < 1e-6 && kneeUp < 1.4, `off its line ${slamOff.toFixed(4)}; knee at most ${kneeUp.toFixed(2)} up or aside`);
  check('...a stabbing foot is drawn stuck where it struck', (count.stabStuck ?? 0) > 20 && stabOff < 1e-6, `${stabOff.toFixed(4)}`);
  check('...her head is drawn where the sword meets it, and is down on the floor when the rules say it is down', headOff < 1e-6 && (count.biteStuck ?? 0) > 20, `${headOff.toFixed(4)}`);
  check('...no leg is ever stretched past its bones, under the floor, or nowhere', stretched < 0.02 && under === 0 && bad === 0, `stretched ${stretched.toFixed(3)}; ${under} under the floor; ${bad} bad numbers; ${frames} frames`);
  check('...and all of what she does was seen in that time', ['slamWind', 'slam', 'slamStuck', 'sweep', 'sweepEnd', 'stabWind', 'stabStuck', 'biteWind', 'biteStuck', 'withdraw', 'idle'].every((s) => (count[s] ?? 0) > 0), Object.keys(count).join());
}

console.log(failures === 0 ? 'widow: all passed' : `widow: ${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
