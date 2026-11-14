// The Broodmother: the great spider of the Hollows, a boss, fought in her own pit. Every attack says what it is before
// it comes: a foreleg goes up before each stab (a shield stops it, a step aside avoids it, a perfect guard throws her
// down); the scissor runs along the floor (jump it); the pounce and the drop from her thread cannot be blocked (be
// somewhere else) and leave her in a heap. Below half her health she is angry. All of it with the real controller, the
// real combat, and the real pit.
import './../src/core/colorSetup';
import * as THREE from 'three';
import { PlayerController, PlayerInput } from '../src/player/controller';
import { Brood, BROOD, type BroodState } from '../src/enemies/brood';
import { CombatEvents, resolveCombat } from '../src/combat/combat';
import { buildChamber } from '../src/world/chamber';
import { LEVELS } from '../src/levels/levels';
import { PIT_ARENA } from '../src/levels/hollows';
import { computeReach } from '../src/levels/reach';
import { atDoor } from '../src/world/rooms';
import { TUNING } from '../src/data/tuning';
import { STICKERS } from '../src/data/stickers';
import { stickerIcon } from '../src/ui/icons';

const DT = 1 / 60;
const B = BROOD;
let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}
const pit = LEVELS.find((l) => l.id === 'brood')!;
const hollows = LEVELS.find((l) => l.id === 'hollows')!;
const chamber = buildChamber({ solids: pit.solids, pit: pit.pit, water: pit.water ?? [], decor: [], movers: pit.movers });
/** The game's own rule for where a creature can stand. */
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
const spec = pit.enemies.find((e) => e.type === 'brood')!;
/** Her, where the level puts her (facing +z, the way he comes in). Her dice all roll `roll`. */
function brood(roll = 0.9): Brood {
  const b = new Brood(spec);
  b.canStand = canStand;
  b.rng = () => roll;
  return b;
}
function ratAt(x: number, z: number, face?: Brood): PlayerController {
  const p = new PlayerController(new THREE.Vector3(x, 0, z));
  for (let i = 0; i < 20; i++) p.update(DT, input(), chamber.colliders);
  if (face) p.facing = Math.atan2(face.x - x, face.z - z);
  return p;
}
const gap = (b: Brood, p: PlayerController): number => Math.hypot(p.position.x - b.x, p.position.z - b.z);
const tick = (b: Brood, p: PlayerController): void => b.update(DT, p.position.x, p.position.y, p.position.z, !p.dead);
function until(b: Brood, p: PlayerController, state: BroodState, frames = 1200): boolean {
  for (let i = 0; i < frames && b.state !== state; i++) tick(b, p);
  return b.state === state;
}
/** Puts the rat `d` from her, `around` radians from her front, facing her. */
function place(p: PlayerController, b: Brood, d: number, around = 0): void {
  const a = b.facing + around;
  p.position.set(b.x + Math.sin(a) * d, 0, b.z + Math.cos(a) * d);
  p.prevPosition.copy(p.position);
  p.velocity.set(0, 0, 0);
  p.facing = Math.atan2(b.x - p.position.x, b.z - p.position.z);
}
/** One swing at her from where the rat stands (she stands still for it unless `act`). */
function swingAt(p: PlayerController, b: Brood, act = false): CombatEvents {
  const ev = events();
  let seen = events();
  b.lastSwing = -1;
  p.update(DT, input({ attackPressed: true }), chamber.colliders);
  for (let i = 0; i < 28; i++) {
    if (act) tick(b, p);
    resolveCombat(p, [b], ev);
    if (ev.enemyHit || ev.playerResult) seen = { ...seen, enemyHit: ev.enemyHit ?? seen.enemyHit, playerResult: ev.playerResult ?? seen.playerResult, enemyKilled: seen.enemyKilled || ev.enemyKilled };
    p.update(DT, input(), chamber.colliders);
  }
  return seen;
}
/** Plays on with the rat doing `act` each frame, until `stop`. Returns what reached the rat. */
function play(b: Brood, p: PlayerController, act: (b: Brood, frame: number) => Partial<PlayerInput>, stop: (b: Brood, frame: number) => boolean, frames = 1500): { results: string[]; hp: number } {
  const results: string[] = [];
  const ev = events();
  for (let i = 0; i < frames && !stop(b, i); i++) {
    p.update(DT, input(act(b, i)), chamber.colliders);
    tick(b, p);
    resolveCombat(p, [b], ev);
    if (ev.playerResult) results.push(ev.playerResult);
  }
  return { results, hp: p.hp };
}
/** Awake and past her scream, with the rat `d` in front of her. */
function awake(roll = 0.9, d = 3.2): { b: Brood; p: PlayerController } {
  const b = brood(roll);
  const p = ratAt(b.x, b.z + d, b);
  until(b, p, 'chase');
  place(p, b, d);
  return { b, p };
}
const MAX = TUNING.health.max;

// ---- Her pit ----
{
  const door = hollows.courseDoors?.find((d) => d.to === 'brood');
  const reach = computeReach(hollows);
  check('the Brood Pit is a place in the Hollows, through a door on the gallery\'s north ledge that he can walk up to', !!door && pit.world === 'hollows' && pit.returnTo === 'hollows' && reach.near(door!.door.x + 1, door!.door.y, door!.door.z, 1.5, 0.5, 0.5) && atDoor(door!.door, door!.door.x + 0.8, door!.door.z));
  check('she is the only thing in it, and beating her is what its Golden Wedge asks', pit.enemies.length === 1 && pit.wedges?.length === 1 && pit.wedges[0].appears?.type === 'defeat' && pit.goals.length === 1);
  const A = PIT_ARENA;
  let floor = true;
  for (let x = A.x0 + B.radius; x <= A.x1 - B.radius; x += 0.5) for (let z = A.z0 + B.radius; z <= A.z1 - B.radius; z += 0.5) if (!canStand(x, 0, z, B.radius)) floor = false;
  check('the floor she fights on is all floor: nothing stands on it, and she can stand anywhere in it', floor && spec.x > A.x0 && spec.x < A.x1 && spec.z > A.z0 && spec.z < A.z1);
  check('he comes in more than her notice away, so the fight starts when he walks towards her', Math.hypot(pit.spawn.x - spec.x, pit.spawn.z - spec.z) > B.noticeRange);
  const sticker = STICKERS.find((s) => s.id === 'foe:brood');
  check('she has a sticker, with a flat picture of her own', !!sticker && stickerIcon(sticker!.icon, 40).includes('<svg') && stickerIcon(sticker!.icon, 40) !== stickerIcon('scuttler', 40));
}

// ---- Lurking, and the scream ----
{
  const b = brood();
  const p = ratAt(pit.spawn.x, pit.spawn.z);
  for (let i = 0; i < 60; i++) tick(b, p);
  check('she lurks in the middle until he comes near', b.state === 'idle' && !b.awake && b.x === spec.x && b.z === spec.z);
  place(p, b, B.noticeRange - 0.5);
  tick(b, p);
  check('seeing him, she screams', b.state === 'roar' && b.awake && b.events.includes('roar'));
  let harmless = true;
  for (let t = 0; t < B.roar - 0.05; t += DT) {
    tick(b, p);
    if (b.attackActive || b.state !== 'roar') harmless = false;
  }
  check('...for a second and more, hurting nobody, before the fight is on', harmless && until(b, p, 'chase', 10));
  const c = brood();
  const q = ratAt(c.x, c.z + 2.5, c);
  c.lastSwing = -1;
  const hit = swingAt(q, c);
  check('struck while she lurks, she wakes at once', hit.enemyHit === c && c.awake && c.hp === B.hp - 1);
}

// ---- The stabs ----
{
  const { b, p } = awake();
  const got = until(b, p, 'stabWind', 300);
  const arm = b.arm;
  let early = false;
  let tracked = 0;
  for (let t = 0; b.state === 'stabWind'; t += DT) {
    tick(b, p);
    if (b.attackActive) early = true;
    tracked = b.stabAt;
  }
  check('in front of her, a foreleg goes up: a wind-up of six tenths of a second in which nothing can hurt', got && !early && b.state === 'stab' && b.events.includes('stabWind'));
  check('the stab comes down where he stood', Math.abs(tracked - gap(b, p)) < 0.3, `aimed ${tracked.toFixed(2)} off, he is ${gap(b, p).toFixed(2)} off`);
  const r = play(b, p, () => ({}), (x) => x.state === 'stabStuck');
  check('standing there, it costs him a heart', r.results[0] === 'hit' && r.hp === MAX - B.stabDamage, r.results.join(','));
  check('then the other leg: two stabs, and then both spikes are in the floor', b.state === 'stabStuck' && b.arm !== arm && b.open);
  const before = b.hp;
  place(p, b, 2.3);
  const blow = swingAt(p, b, true);
  check('that is the opening: a sword lands, and she does not hit back for it', blow.enemyHit === b && b.hp === before - 1 && !blow.playerResult);
  for (let t = 0; t < B.stabStuck; t += DT) tick(b, p);
  check('she pulls them free and comes on again', b.state === 'chase');
}
{
  const { b, p } = awake();
  const r = play(b, p, () => ({ guardHeld: true }), (x) => x.state === 'stabStuck');
  check('behind a shield both stabs are stopped, and it costs him nothing', r.results.filter((x) => x === 'blocked').length === 2 && r.hp === MAX, r.results.join(','));
  const c = awake();
  until(c.b, c.p, 'stabWind', 300);
  for (let t = 0; t < B.stabWind * B.stabTrack + 0.02; t += DT) tick(c.b, c.p);
  // She has committed: he steps out from under it, sideways.
  const side = new THREE.Vector3(Math.cos(c.b.facing), 0, -Math.sin(c.b.facing));
  const rs = play(c.b, c.p, () => ({ move: side, run: true }), (x) => x.state === 'stabWind' && x.stateTime > 0.05 && x.windTime === B.stabGap);
  check('or he steps out from under it once she has committed: the spike comes down beside him', rs.results.length === 0 && rs.hp === MAX);
  let turned: Brood | null = null;
  for (let lead = 0.02; lead < TUNING.guard.parryWindow && !turned; lead += 0.02) {
    const d = awake();
    const rt = play(d.b, d.p, (x) => ({ guardHeld: x.state === 'stab' && x.stateTime > B.stabTime - 0.08 - lead }), (x) => x.state === 'kneel' || x.state === 'stabStuck');
    if (rt.results.includes('parried') && d.b.state === 'kneel' && rt.hp === MAX) turned = d.b;
  }
  check('a perfect guard on a stab throws her down, her legs from under her', !!turned && turned!.events.includes('kneel') && turned!.open);
}

// ---- The scissor ----
{
  const { b, p } = awake(0.1, 2.8);
  const got = until(b, p, 'sweepWind', 300);
  const r = play(b, p, () => ({}), (x) => x.state === 'recover');
  check('close in front of her she may open both forelegs wide and shut them along the floor: a heart from a rat who stands there', got && r.results[0] === 'hit' && r.hp === MAX - B.sweepDamage);
  const c = awake(0.1, 2.8);
  until(c.b, c.p, 'sweepWind', 300);
  const rj = play(c.b, c.p, (x) => (x.state === 'sweepWind' && x.stateTime > B.sweepWind - 0.22 ? { jumpPressed: x.stateTime < B.sweepWind - 0.19, jumpHeld: true } : x.state === 'sweep' ? { jumpHeld: true } : {}), (x) => x.state === 'recover');
  check('it runs along the floor: a jump clears it', rj.results.length === 0 && rj.hp === MAX);
  const d = awake(0.1, 2.8);
  until(d.b, d.p, 'sweepWind', 300);
  place(d.p, d.b, B.radius + B.sweepReach + TUNING.rat.radius + 0.4);
  const rf = play(d.b, d.p, () => ({}), (x) => x.state === 'recover');
  check('and it reaches only so far: a step back out of it is as good', rf.results.length === 0);
}

// ---- The pounce ----
{
  const { b, p } = awake(0.1, 8);
  const got = until(b, p, 'crouch', 400);
  const from = { x: b.x, z: b.z };
  const where = { x: p.position.x, z: p.position.z };
  until(b, p, 'leap', 200);
  let highest = 0;
  let untouchable = true;
  const hp0 = b.hp;
  for (let i = 0; i < 200 && b.state === 'leap'; i++) {
    tick(b, p);
    highest = Math.max(highest, b.air);
    if (b.air > 1 && Math.abs(b.y - p.position.y) < 0.9) untouchable = false;
  }
  check('from far off she sinks down, then springs: up over three units, and down where he was', got && Math.hypot(from.x - b.x, from.z - b.z) > 5 && Math.hypot(b.x - where.x, b.z - where.z) < 0.6 && highest > 3, `landed ${Math.hypot(b.x - where.x, b.z - where.z).toFixed(2)} from where he stood, ${highest.toFixed(2)} high`);
  check('in the air she is out of reach of his sword and does not shoulder him aside', untouchable && b.hp === hp0);
  const c = awake(0.1, 8);
  const rs = play(c.b, c.p, () => ({ guardHeld: true }), (x) => x.state === 'stuck');
  check('where she lands costs two hearts, and a shield does not stop it', rs.results.includes('hit') && rs.hp === MAX - B.slamDamage, rs.results.join(','));
  const d = awake(0.1, 8);
  until(d.b, d.p, 'leap', 600);
  const away = new THREE.Vector3(Math.cos(d.b.facing), 0, -Math.sin(d.b.facing));
  const rr = play(d.b, d.p, () => ({ move: away, run: true }), (x) => x.state === 'stuck');
  check('be somewhere else: a rat who runs the moment she springs is clear of it', rr.results.length === 0 && rr.hp === MAX && gap(d.b, d.p) > B.radius + B.slamReach, `${gap(d.b, d.p).toFixed(2)} away when she lands`);
  let open = 0;
  for (; d.b.state === 'stuck'; open += DT) tick(d.b, d.p);
  check('and then she lies in a heap for a good while: the best opening there is', Math.abs(open - B.stuck) < 0.05 && d.b.state === 'chase');
}

// ---- The whirl ----
{
  const { b, p } = awake();
  place(p, b, 2.6, Math.PI);
  const face = b.facing;
  // He keeps behind her as she turns.
  let whirled = false;
  for (let i = 0; i < 600 && !whirled; i++) {
    place(p, b, 2.6, Math.PI);
    tick(b, p);
    whirled = b.state === 'whirlWind';
  }
  check('he can get behind her; but stay there three quarters of a second and she winds up a whirl', whirled && Math.abs(Math.atan2(Math.sin(b.facing - face), Math.cos(b.facing - face))) < 2.6);
  const r = play(b, p, () => ({}), (x) => x.state === 'settle');
  check('round she goes, legs out low, and it catches him behind her', r.results[0] === 'hit' && r.hp === MAX - B.whirlDamage);
  const off = Math.abs(Math.atan2(Math.sin(Math.atan2(p.position.x - b.x, p.position.z - b.z) - b.facing), Math.cos(Math.atan2(p.position.x - b.x, p.position.z - b.z) - b.facing)));
  check('and she ends it facing him', off < 0.2 && b.whirled === 0);
  const c = awake();
  for (let i = 0; i < 600 && c.b.state !== 'whirlWind'; i++) {
    place(c.p, c.b, 2.6, Math.PI);
    tick(c.b, c.p);
  }
  const rj = play(c.b, c.p, (x) => (x.state === 'whirlWind' && x.stateTime > B.whirlWind - 0.2 ? { jumpPressed: x.stateTime < B.whirlWind - 0.17, jumpHeld: true } : x.state === 'whirl' ? { jumpHeld: true } : {}), (x) => x.state === 'settle');
  check('a jump clears the whirl too', rj.results.length === 0 && rj.hp === MAX);
}

// ---- Poise ----
{
  const { b, p } = awake();
  place(p, b, 2.2);
  for (let k = 0; k < B.poise - 1; k++) b.takeHit(1, p.position.x, p.position.z);
  const stood = b.state !== 'kneel';
  b.takeHit(1, p.position.x, p.position.z);
  check('she does not flinch; but seven blows close together and her legs go from under her', stood && b.state === 'kneel' && b.open && b.events.includes('kneel'));
  let down = 0;
  for (; b.state === 'kneel'; down += DT) tick(b, p);
  check('she is down for two and a half seconds, then up with her poise back', Math.abs(down - B.kneel) < 0.05 && b.poise === B.poise && b.events.includes('rise'));
  const c = awake();
  for (let k = 0; k < B.poise - 1; k++) c.b.takeHit(1, 0, 0);
  for (let t = 0; t < B.poiseBack + 0.1; t += DT) c.b.update(DT, c.b.x, 0, c.b.z + 40, true);
  c.b.takeHit(1, 0, 0);
  check('left alone four seconds she has it all back', c.b.state !== 'kneel' && c.b.poise === B.poise - 1);
  const d = awake();
  d.b.takeHit(1, 0, 0, 'plunge');
  check('a plunge onto her counts for three', d.b.poise === B.poise - B.plungePoise);
  place(d.p, d.b, 0.6);
  const bx = d.b.x;
  const ev = events();
  resolveCombat(d.p, [d.b], ev);
  check('she is not shouldered aside: where their bodies meet, it is the rat who gives way', d.b.x === bx && gap(d.b, d.p) >= B.radius + TUNING.rat.radius - 0.01);
}

// ---- Angry: the third stab, and the thread ----
{
  const { b, p } = awake();
  const half = Math.ceil(B.hp * (1 - B.rageAt));
  // (One at a time, slowly, so her poise does not come into it.)
  for (let k = 0; k < half; k++) {
    b.takeHit(1, 0, 0);
    for (let t = 0; t < B.poiseBack + 0.1 && k < half - 1; t += DT) b.update(DT, b.x, 0, b.z + 40, true);
  }
  check('below half her health she is angry, and says so', b.raging && b.events.includes('rage') && b.hp <= B.hp * B.rageAt);
  until(b, p, 'chase', 400);
  place(p, b, 3.2);
  const up = until(b, p, 'climb', 600);
  check('soon after, she goes up her thread', up && b.events.includes('climb'));
  until(b, p, 'hang', 200);
  const hp0 = b.hp;
  place(p, b, 1.5);
  const miss = swingAt(p, b);
  check('up there she cannot be reached', b.aloft && b.air === B.hangHeight && !miss.enemyHit && b.hp === hp0 && !b.takeHit(1, 0, 0) && b.hp === hp0);
  // He runs; she follows across the roof, but not as fast.
  const run = new THREE.Vector3(1, 0, 0);
  let lost = 0;
  let marked = true;
  for (let i = 0; i < 60 && b.state === 'hang'; i++) {
    p.update(DT, input({ move: run, run: true }), chamber.colliders);
    tick(b, p);
    lost = gap(b, p);
    if (!b.shadow.on || b.shadow.x !== b.x || b.shadow.z !== b.z) marked = false;
  }
  check('she follows him across the roof, slower than he runs; her shadow on the floor is right under her', lost > 0.6 && marked && B.hangSpeed < TUNING.move.run, `${lost.toFixed(2)} behind after a second`);
}
{
  const drop = (act: (b: Brood) => Partial<PlayerInput>): { r: { results: string[]; hp: number }; b: Brood; p: PlayerController; tell: number } => {
    const { b, p } = awake();
    for (let k = 0; k < Math.ceil(B.hp * (1 - B.rageAt)); k++) {
      b.takeHit(1, 0, 0);
      for (let t = 0; t < B.poiseBack + 0.1; t += DT) b.update(DT, b.x, 0, b.z + 40, true);
    }
    until(b, p, 'chase', 400);
    place(p, b, 3.2);
    until(b, p, 'hang', 900);
    // He stands still under her until the thread twangs.
    const r0 = play(b, p, () => ({}), (x) => x.state === 'dropTell');
    let tell = 0;
    const ev = events();
    const results = [...r0.results];
    for (; b.state === 'dropTell' || b.state === 'drop' || b.state === 'slam'; tell += DT) {
      p.update(DT, input(act(b)), chamber.colliders);
      tick(b, p);
      resolveCombat(p, [b], ev);
      if (ev.playerResult) results.push(ev.playerResult);
    }
    return { r: { results, hp: p.hp }, b, p, tell };
  };
  const under = drop(() => ({ guardHeld: true }));
  check('over him she stops, the thread twangs (half a second), and she drops: two hearts from a rat still under her, shield or no', under.b.events.includes('twang') && under.b.events.includes('drop') && under.r.results.includes('hit') && under.r.hp === MAX - B.slamDamage, under.r.results.join(','));
  const ran = drop(() => ({ move: new THREE.Vector3(1, 0, 0), run: true }));
  check('a rat who runs when it twangs is out from under her', ran.r.results.length === 0 && ran.r.hp === MAX && gap(ran.b, ran.p) > B.radius + B.slamReach, `${gap(ran.b, ran.p).toFixed(2)} away when she lands`);
  let heap = 0;
  for (; ran.b.state === 'stuck'; heap += DT) tick(ran.b, ran.p);
  check('and she lies there longer than after a pounce', Math.abs(heap - B.dropStuck) < 0.05 && B.dropStuck > B.stuck && ran.b.air === 0 && ran.b.y === 0);
  // Angry, the stabs come in threes.
  const c = ran.b;
  const q = ran.p;
  place(q, c, 3.2);
  until(c, q, 'stabWind', 900);
  let stabs = 0;
  let last: BroodState = c.state;
  for (let i = 0; i < 400 && c.state !== 'stabStuck'; i++) {
    tick(c, q);
    if (c.state === 'stab' && last !== 'stab') stabs++;
    last = c.state;
  }
  check('angry, there are three stabs, not two', stabs === B.stabsRage);
}

// ---- A whole fight ----
{
  // He runs rings round her for two and a half minutes (or until she is dead), going in to swing whenever she is open. She must stay on her floor
  // through all of it, wherever her pounces and drops take her, and never go wrong.
  const b = brood();
  let seed = 7;
  b.rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const p = ratAt(pit.spawn.x, pit.spawn.z - 6, b);
  const ev = events();
  const A = PIT_ARENA;
  let inside = true;
  let onFloor = true;
  let sound = true;
  const seen = new Set<string>();
  const move = new THREE.Vector3();
  for (let i = 0; i < 60 * 150 && b.alive; i++) {
    const a = i * 0.011;
    const ring = b.open ? 1.9 : 3.6;
    const want = { x: b.x + Math.sin(a) * ring, z: b.z + Math.cos(a) * ring };
    move.set(want.x - p.position.x, 0, want.z - p.position.z);
    if (move.length() > 0.2) move.normalize();
    else move.set(0, 0, 0);
    p.facing = Math.atan2(b.x - p.position.x, b.z - p.position.z);
    p.update(DT, input({ move, run: true, attackPressed: b.open && gap(b, p) < 2.6 && i % 18 === 0 }), chamber.colliders);
    if (p.dead) p.hp = MAX;
    tick(b, p);
    resolveCombat(p, [b], ev);
    seen.add(b.state);
    if (b.x < A.x0 + B.radius - 0.01 || b.x > A.x1 - B.radius + 0.01 || b.z < A.z0 + B.radius - 0.01 || b.z > A.z1 - B.radius + 0.01) inside = false;
    if (b.air === 0 && !canStand(b.x, 0, b.z, B.radius)) onFloor = false;
    if (!Number.isFinite(b.x + b.z + b.facing + b.air + b.hp)) sound = false;
    b.events.length = 0;
  }
  check('through a whole fight she stays on her floor and nothing goes wrong', inside && onFloor && sound, [...seen].join(' '));
  check('and in that time she has stabbed, pounced and (angry) been up her thread', ['stab', 'leap', 'hang'].every((s) => seen.has(s)) || !b.alive, [...seen].join(' '));
}

// ---- Her end ----
{
  const { b, p } = awake();
  b.hp = 1;
  place(p, b, 2.2);
  const blow = swingAt(p, b);
  check('the last blow kills her, on the floor, and she does not come back', blow.enemyKilled && !b.alive && b.state === 'dead' && b.air === 0 && !b.respawns);
  for (let i = 0; i < 600; i++) tick(b, p);
  check('dead she does nothing more', b.state === 'dead' && !b.attackActive && !b.attacking);
}

console.log(failures === 0 ? '\nbrood: all passed' : `\nbrood: ${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
