// The Ant Pikeman: a soldier ant with a long pike. One alone is a fence: it keeps its point between itself and the rat
// and thrusts with it. Two are a trap: one holds him at pike's length while the other goes round behind him, and they
// thrust by turns. Inside its point it cannot thrust; it tips its pike up and bites. All of it with the real
// controller, the real combat, the real turn-taking, and the Keep's real inner ward (a ledge with the pit along it).
import './../src/core/colorSetup';
import * as THREE from 'three';
import { PlayerController, PlayerInput } from '../src/player/controller';
import { ANT, Ant, pairAnts, type AntState } from '../src/enemies/ant';
import { Director } from '../src/enemies/director';
import type { Foe } from '../src/enemies/foe';
import { CombatEvents, resolveCombat } from '../src/combat/combat';
import { buildChamber } from '../src/world/chamber';
import { LEVELS } from '../src/levels/levels';
import { WARD } from '../src/levels/keep';
import { ENEMY_PIECES, compileCustom, emptyCustom } from '../src/levels/custom';
import { TUNING } from '../src/data/tuning';
import { ATTACK_CLIPS } from '../src/player/animations';
import { STICKERS } from '../src/data/stickers';
import { stickerIcon } from '../src/ui/icons';

const DT = 1 / 60;
const N = ANT;
let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}
const keep = LEVELS.find((l) => l.id === 'keep')!;
const chamber = buildChamber({ solids: keep.solids, pit: keep.pit, water: keep.water ?? [], decor: [], movers: keep.movers });
const canStand = (x: number, y: number, z: number, r: number): boolean => {
  let floor = false;
  for (const b of chamber.colliders) {
    if (x + r <= b.min.x || x - r >= b.max.x || z + r <= b.min.z || z - r >= b.max.z) continue;
    if (b.max.y > y + 0.25 && b.min.y < y + 0.7) return false;
    if (Math.abs(b.max.y - y) <= 0.25 && x >= b.min.x && x <= b.max.x && z >= b.min.z && z <= b.max.z) floor = true;
  }
  return floor;
};
const input = (o: Partial<PlayerInput> = {}): PlayerInput => ({ move: new THREE.Vector3(), run: false, jumpPressed: false, jumpHeld: false, attackPressed: false, dodgePressed: false, guardHeld: false, sneakHeld: false, ...o });
const events = (): CombatEvents => ({ enemyHit: null, enemyKilled: false, playerResult: null, shockwave: false, cratesBroken: [] });
const specs = keep.enemies.filter((e) => e.type === 'ant');
/** The Keep's two, where it puts them (or only the first). Their dice: always the middle of what they may roll. */
function antsOf(n = 2): Ant[] {
  return specs.slice(0, n).map((s) => {
    const a = new Ant(s);
    a.canStand = canStand;
    a.rng = () => 0.5;
    return a;
  });
}
function ratAt(x: number, z: number): PlayerController {
  const p = new PlayerController(new THREE.Vector3(x, 0, z));
  for (let i = 0; i < 20; i++) p.update(DT, input(), chamber.colliders);
  return p;
}
function put(p: PlayerController, x: number, z: number, face?: { x: number; z: number }): void {
  p.position.set(x, 0, z);
  p.prevPosition.copy(p.position);
  p.velocity.set(0, 0, 0);
  if (face) p.facing = Math.atan2(face.x - x, face.z - z);
}
const dist = (a: { x: number; z: number }, b: { x: number; z: number }): number => Math.hypot(a.x - b.x, a.z - b.z);
const wrap = (a: number): number => Math.atan2(Math.sin(a), Math.cos(a));
/** How far round him two of them are from each other (0: side by side; pi: he is right between them). */
const apart = (a: Ant, b: Ant, p: { x: number; z: number }): number => Math.abs(wrap(Math.atan2(a.x - p.x, a.z - p.z) - Math.atan2(b.x - p.x, b.z - p.z)));
interface Played { results: string[]; seen: AntState[][]; heard: string[][]; frames: number }
/**
 * Plays on, the rat doing `act` each frame, until `stop`: the pairing, the turn-taking, the rat, the ants, the combat,
 * in the order the game does them. Returns what reached the rat, and for each ant every state it was in and
 * everything it said.
 */
function play(ants: Ant[], p: PlayerController, act: (ants: Ant[], frame: number) => Partial<PlayerInput>, stop: (ants: Ant[], frame: number) => boolean, frames = 3600, director = new Director()): Played {
  const out: Played = { results: [], seen: ants.map(() => []), heard: ants.map(() => []), frames: 0 };
  const ev = events();
  for (let i = 0; i < frames && !stop(ants, i); i++) {
    p.update(DT, input(act(ants, i)), chamber.colliders);
    director.update(DT, ants as unknown as Foe[], p.position.x, p.position.z);
    pairAnts(ants, p.position.x, p.position.z);
    ants.forEach((a, k) => {
      a.update(DT, p.position.x, p.position.y, p.position.z, !p.dead);
      out.heard[k].push(...a.events.splice(0));
      if (out.seen[k][out.seen[k].length - 1] !== a.state) out.seen[k].push(a.state);
    });
    resolveCombat(p, ants, ev);
    if (ev.playerResult) out.results.push(ev.playerResult);
    out.frames++;
  }
  return out;
}
const still = (): Partial<PlayerInput> => ({});
/** One swing from where he stands. */
function swing(p: PlayerController, ants: Ant[]): CombatEvents {
  const ev = events();
  let seen = events();
  for (const a of ants) a.lastSwing = -1;
  p.update(DT, input({ attackPressed: true }), chamber.colliders);
  for (let i = 0; i < 28; i++) {
    resolveCombat(p, ants, ev);
    if (ev.enemyHit) seen = { ...seen, enemyHit: ev.enemyHit, enemyKilled: seen.enemyKilled || ev.enemyKilled };
    p.update(DT, input(), chamber.colliders);
  }
  return seen;
}
const MAX = TUNING.health.max;
const RAT = TUNING.rat.radius;
/** Open floor in the ward west of their post, in the middle of its depth, for him to stand on. */
const SPOT = { x: specs[0].x - 7, z: (WARD.z0 + WARD.z1) / 2 };
/** How far his first cut reaches, middle to middle, at an ant. */
const SWORD = ATTACK_CLIPS[0].reach + N.radius;

// ---- Where they are, and what they are ----
{
  check('the Keep has two, side by side in the inner ward behind the gate, on the way east', specs.length === 2 && specs.every((s) => s.x > 10 && s.x < 36 && s.z > WARD.z0 && s.z < WARD.z1 && (s.y ?? 0) === 0) && dist(specs[0], specs[1]) < N.pairRange);
  check('...each keeps to the ward (the pit is along its north side, the gatehouse wall along its south)', specs.every((s) => !!s.arena && s.arena.z0 >= WARD.z0 && s.arena.z1 <= WARD.z1 && s.arena.x0 >= WARD.x0 && s.arena.x1 <= WARD.x1));
  const [a] = antsOf();
  check('at its post it faces the way it was set, its pike upright (not levelled), standing on the floor', a.state === 'idle' && !a.level && Math.abs(a.facing - (specs[0].facing ?? 9)) < 1e-6 && canStand(a.x, a.y, a.z, a.radius));
  check('it is a piece in the level editor, and what the editor places is one, with floor enough to go round him', ENEMY_PIECES.includes('ant') && (() => {
    const lvl = emptyCustom();
    lvl.pieces.push({ t: 'ant', x0: 3, z0: -2, x1: 3, z1: -2, top: 0, dir: 'e' });
    const e = compileCustom(lvl).enemies.find((q) => q.type === 'ant');
    return !!e && e.x === 3 && e.z === -2 && Math.abs((e.facing ?? 9) - Math.PI / 2) < 1e-6 && e.arena!.x1 - e.arena!.x0 >= 2 * (N.holdRange + 3);
  })());
  const st = STICKERS.find((s) => s.id === 'foe:ant');
  check('it has a sticker, with a picture', !!st && stickerIcon(st.icon).includes('<svg') && stickerIcon(st.icon) !== stickerIcon('nothing-by-that-name'));
  check('its pike reaches further than his sword: where it stands off, its thrust reaches him and his cut does not reach it', N.pikeOut + N.thrustSpeed * N.thrustTime > N.holdRange && N.holdRange > SWORD + 0.5 && N.pikeHeld < N.holdRange, `thrust ${(N.pikeOut + N.thrustSpeed * N.thrustTime).toFixed(2)}, stands off ${N.holdRange}, sword ${SWORD.toFixed(2)}`);
  check('the point is carried at the height of his chest', N.pikeHeight > 0.5 && N.pikeHeight < TUNING.rat.height - 0.2);
  check('with him inside its point it can still reach him with its jaws at any distance his sword reaches it from', N.biteRange > SWORD && N.biteRange < N.crowdRange, `bites inside ${N.biteRange}, sword ${SWORD.toFixed(2)}`);
}

// ---- One alone: it sees him, comes to pike's length, and levels its pike at him ----
{
  const [a] = antsOf(1);
  const far = ratAt(a.x - N.noticeRange - 3, SPOT.z);
  play([a], far, still, () => false, 120);
  check('from further off than it notices, it stays at its post', a.state === 'idle');
  const p = ratAt(SPOT.x, SPOT.z);
  const r = play([a], p, still, (q) => q[0].state === 'hold' && q[0].stateTime > 0.3);
  check('it sees him (it says so), comes on, and stops at pike\'s length', r.heard[0].join() === 'alert' && r.seen[0].join(' ') === 'march hold' && Math.abs(dist(a, p.position) - N.holdRange) < 0.6, `${r.seen[0].join(' ')}; ${dist(a, p.position).toFixed(2)} off`);
  const to = Math.atan2(p.position.x - a.x, p.position.z - a.z);
  check('...facing him, its pike levelled: its point is between them, at chest height, short of him', a.level && Math.abs(wrap(to - a.facing)) < 0.1 && Math.abs(a.tip.y - N.pikeHeight) < 1e-9 && Math.abs(dist(a, a.tip) - N.pikeHeld) < 1e-6 && dist(a.tip, p.position) < dist(a, p.position) && dist(a.tip, p.position) > RAT, `point ${dist(a.tip, p.position).toFixed(2)} from him`);
  put(p, p.position.x, p.position.z, a);
  check('from there his sword does not reach it', swing(p, [a]).enemyHit === null);
}

// ---- The thrust ----
{
  // He stands still for it.
  const [a] = antsOf(1);
  const p = ratAt(SPOT.x, SPOT.z);
  let early = false;
  let wind = 0;
  let back = 9;
  const r = play([a], p, still, (q) => {
    if (q[0].state === 'windup') {
      wind += DT;
      back = Math.min(back, q[0].pike);
      if (q[0].attackActive) early = true;
    }
    return q[0].state === 'recover';
  });
  check('it draws its pike back (it says so) and holds it there for the length of the tell, harmless', r.heard[0].includes('windup') && Math.abs(wind - N.windup) < 0.04 && !early && Math.abs(back - N.pikeBack) < 0.02, `${wind.toFixed(2)} s, point drawn back to ${back.toFixed(2)}`);
  check('then it lunges, and a rat who stood still is struck by the point, for a heart', r.heard[0].includes('thrust') && r.results.join() === 'hit' && p.hp === MAX - N.damage, `${r.results.join()} hp ${p.hp}`);
  check('...by the point: its body never came near him', dist(a, p.position) > N.radius + RAT + 1, `${dist(a, p.position).toFixed(2)} off`);
}
{
  // He steps aside once it is set.
  const [a] = antsOf(1);
  const p = ratAt(SPOT.x, SPOT.z);
  let reach = 0;
  const side = new THREE.Vector3(0, 0, 1);
  const r = play([a], p, (q) => ((q[0].state === 'windup' && q[0].stateTime >= N.windup * N.track) || q[0].state === 'thrust' ? { move: side, run: true } : {}), (q) => {
    reach = Math.max(reach, q[0].pike);
    return q[0].state === 'recover';
  });
  check('step aside once it has stopped following him, and its point goes past him', r.results.length === 0 && p.hp === MAX);
  check('...at the full stretch of its pike', Math.abs(reach - N.pikeOut) < 1e-6);
  // Stretched out: he goes in at its flank and cuts it, twice, before it has its pike back.
  let stretched = 0;
  const [b] = antsOf(1);
  const p2 = ratAt(SPOT.x, SPOT.z);
  play([b], p2, (q) => ((q[0].state === 'windup' && q[0].stateTime >= N.windup * N.track) || q[0].state === 'thrust' ? { move: side, run: true } : {}), (q) => q[0].state === 'recover');
  play([b], p2, (q) => ({ move: new THREE.Vector3(q[0].x - p2.position.x, 0, q[0].z - p2.position.z).normalize(), run: true }), (q) => {
    if (q[0].state === 'recover') stretched += DT;
    return q[0].state !== 'recover';
  });
  check('after a thrust that meets nothing it is stretched out for most of a second, and can do nothing', Math.abs(stretched - N.recover) < 0.05, `${stretched.toFixed(2)} s`);
  put(p, a.x - Math.cos(a.facing) * 0.95, a.z + Math.sin(a.facing) * 0.95, a);
  const cut = swing(p, [a]);
  check('...and at its flank his sword lands, and it staggers (it says so)', cut.enemyHit === a && a.hp === N.hp - 1 && a.state === 'stagger' && a.events.includes('hurt'), `hp ${a.hp}, ${a.state}`);
}
{
  // A shield stops the point; a perfect guard beats the pike down.
  const [a] = antsOf(1);
  const p = ratAt(SPOT.x, SPOT.z);
  const r = play([a], p, (q) => {
    p.facing = Math.atan2(q[0].x - p.position.x, q[0].z - p.position.z);
    return q[0].state === 'windup' || q[0].state === 'thrust' ? { guardHeld: true } : {};
  }, (q) => q[0].state === 'recover');
  let stretched = 0;
  play([a], p, still, (q) => {
    if (q[0].state === 'recover') stretched += DT;
    return q[0].state !== 'recover';
  });
  check('a shield stops its point, and it is stretched out for longer than if it had missed', r.results.join() === 'blocked' && p.hp === MAX && Math.abs(stretched - N.blockedRecover) < 0.05, `${r.results.join()}; ${stretched.toFixed(2)} s`);
  let best = '';
  for (let lead = 0; lead <= 9 && best !== 'parried'; lead++) {
    const [b] = antsOf(1);
    const pp = ratAt(SPOT.x, SPOT.z);
    const rr = play([b], pp, (q) => {
      pp.facing = Math.atan2(q[0].x - pp.position.x, q[0].z - pp.position.z);
      // (The shield goes up `lead` frames before the wind-up ends.)
      return (q[0].state === 'windup' && q[0].stateTime >= N.windup - lead * DT) || q[0].state === 'thrust' ? { guardHeld: true } : {};
    }, (q) => q[0].state === 'recover' || q[0].state === 'reel');
    if (!rr.results.includes('parried')) continue;
    best = 'parried';
    let open = 0;
    const after = play([b], pp, still, (q) => {
      if (q[0].state === 'reel') open += DT;
      return q[0].state !== 'reel';
    });
    check('a perfect guard beats its pike down (it says so): it reels, its pike no longer levelled, for nearly two seconds', after.heard[0].includes('reel') && pp.hp === MAX && Math.abs(open - N.reel) < 0.05 && open > N.blockedRecover + 0.5, `${open.toFixed(2)} s`);
    // And while it reels he walks in and cuts it down: three cuts.
    const [c] = antsOf(1);
    const p3 = ratAt(SPOT.x, SPOT.z);
    play([c], p3, (q) => {
      p3.facing = Math.atan2(q[0].x - p3.position.x, q[0].z - p3.position.z);
      return (q[0].state === 'windup' && q[0].stateTime >= N.windup - lead * DT) || q[0].state === 'thrust' ? { guardHeld: true } : {};
    }, (q) => q[0].state === 'reel');
    let cuts = 0;
    let level = false;
    const kill = play([c], p3, (q, f) => {
      if (q[0].state === 'reel' && q[0].level) level = true;
      const d = dist(q[0], p3.position);
      p3.facing = Math.atan2(q[0].x - p3.position.x, q[0].z - p3.position.z);
      if (d > 1.0) return { move: new THREE.Vector3(q[0].x - p3.position.x, 0, q[0].z - p3.position.z).normalize(), run: true };
      if (f % 20 === 0) {
        cuts++;
        return { attackPressed: true };
      }
      return {};
    }, (q) => !q[0].alive, 240);
    check('...long enough for him to walk in and kill it before it has its pike back', !c.alive && kill.results.length === 0 && !level, `${cuts} cuts begun, ${(kill.frames * DT).toFixed(2)} s, ${kill.seen[0].join(' ')}`);
  }
  check('(a perfect guard was found)', best === 'parried');
}

// ---- Inside its point ----
{
  const [a] = antsOf(1);
  const p = ratAt(SPOT.x, SPOT.z);
  play([a], p, still, (q) => q[0].state === 'hold' && q[0].stateTime > 0.3);
  // He steps in to between its jaws' reach and where its point is, and stays there, a little off its line.
  const at0 = { x: a.x, z: a.z };
  let levelled = 0;
  let ready = false;
  const want = (N.biteRange + N.crowdRange) / 2;
  const r = play([a], p, (q) => {
    const d = dist(q[0], p.position);
    put(p, q[0].x + Math.sin(q[0].facing) * want, q[0].z + Math.cos(q[0].facing) * want, q[0]);
    void d;
    if (q[0].level) levelled++;
    if (q[0].ready) ready = true;
    return {};
  }, () => false, 360);
  check('with him inside its point it tips its pike up (it is not levelled, and cannot thrust)', a.close && !a.level && !ready && !r.heard[0].includes('windup') && levelled < 20, `${levelled} frames levelled; heard ${r.heard[0].join(' ') || 'nothing'}`);
  check('...and gives ground, to get its point back between them', dist(a, at0) > 2 && r.seen[0].every((s) => s === 'hold' || s === 'march'), `backed ${dist(a, at0).toFixed(1)}; ${r.seen[0].join(' ')}`);
  // He lets it go: it levels its pike again.
  const out = play([a], p, still, (q) => q[0].level && q[0].state === 'hold', 600);
  check('let it get its distance and its pike comes down again', a.level && !a.close && out.frames < 300, `${(out.frames * DT).toFixed(2)} s`);
}
{
  // The bite. He walks in on it and stands in front of it.
  const [a] = antsOf(1);
  const p = ratAt(SPOT.x, SPOT.z);
  play([a], p, still, (q) => q[0].state === 'hold' && q[0].stateTime > 0.3);
  put(p, a.x + Math.sin(a.facing) * 1.2, a.z + Math.cos(a.facing) * 1.2, a);
  let wind = 0;
  let early = false;
  const r = play([a], p, still, (q) => {
    if (q[0].state === 'biteWind') {
      wind += DT;
      if (q[0].attackActive) early = true;
    }
    return q[0].state === 'biteRest';
  }, 240);
  check('stand in front of it inside its point and it bites: its jaws go wide for the length of the tell (it says so), harmless, then snap', r.heard[0].join() === 'biteWind,bite' && Math.abs(wind - N.biteWind) < 0.04 && !early && r.seen[0].join(' ') === 'biteWind bite biteRest', `${r.heard[0].join()}; ${wind.toFixed(2)} s; ${r.seen[0].join(' ')}`);
  check('...and a rat who stood there is bitten, for a heart; its pike is up out of the way the whole time', r.results.join() === 'hit' && p.hp === MAX - N.biteDamage && !a.level, `${r.results.join()} hp ${p.hp}`);
  let rest = 0;
  play([a], ratAt(SPOT.x - 20, SPOT.z), still, (q) => {
    if (q[0].state === 'biteRest') rest += DT;
    return q[0].state !== 'biteRest';
  });
  check('after it, it is stretched out over its front feet for a moment', Math.abs(rest - N.biteRest) < 0.05, `${rest.toFixed(2)} s`);
}
{
  // He backs out of it, or stops it on his shield, or is at its flank.
  const outcome = (act: (a: Ant, p: PlayerController) => Partial<PlayerInput>, where = 0): { results: string[]; hp: number; bit: boolean } => {
    const [a] = antsOf(1);
    const p = ratAt(SPOT.x, SPOT.z);
    play([a], p, still, (q) => q[0].state === 'hold' && q[0].stateTime > 0.3);
    put(p, a.x + Math.sin(a.facing + where) * 1.2, a.z + Math.cos(a.facing + where) * 1.2, a);
    const r = play([a], p, (q) => act(q[0], p), (q) => q[0].state === 'biteRest', 200);
    return { results: r.results, hp: p.hp, bit: r.heard[0].includes('bite') };
  };
  const away = outcome((a, p) => (a.state === 'biteWind' || a.state === 'bite' ? { move: new THREE.Vector3(p.position.x - a.x, 0, p.position.z - a.z).normalize(), run: true } : {}));
  check('back away while its jaws are wide and they shut on nothing', away.bit && away.results.length === 0 && away.hp === MAX, away.results.join());
  const shield = outcome((a, p) => {
    p.facing = Math.atan2(a.x - p.position.x, a.z - p.position.z);
    return a.state === 'biteWind' || a.state === 'bite' ? { guardHeld: true } : {};
  });
  check('a shield stops its jaws', shield.results[0] === 'blocked' && shield.hp === MAX, shield.results.join());
}
{
  // Behind it: its abdomen can be cut, and it does not bite what is not in front of it.
  const [a] = antsOf(1);
  const p = ratAt(SPOT.x, SPOT.z);
  play([a], p, still, (q) => q[0].state === 'hold' && q[0].stateTime > 0.3);
  const behind = N.gasterBack + N.gaster + ATTACK_CLIPS[0].reach - 0.15;
  put(p, a.x - Math.sin(a.facing) * behind, a.z - Math.cos(a.facing) * behind, a);
  const mid = dist(a, p.position) - N.radius;
  const cut = swing(p, [a]);
  check('from behind it, his sword finds its abdomen from further off than it could find its middle', cut.enemyHit === a && a.hp === N.hp - 1 && mid > ATTACK_CLIPS[0].reach, `its middle ${mid.toFixed(2)} away, his reach ${ATTACK_CLIPS[0].reach}`);
  const part = a.parts[0];
  check('...which is behind it, where it is drawn', Math.abs(Math.hypot(part.x - a.x, part.z - a.z) - N.gasterBack) < 1e-6 && Math.abs(wrap(Math.atan2(part.x - a.x, part.z - a.z) - a.facing)) > 3.1);
}

// ---- It does not stand to be cut down: struck, it springs back out of his reach ----
{
  const [a] = antsOf(1);
  const p = ratAt(SPOT.x, SPOT.z);
  play([a], p, still, (q) => q[0].state === 'hold' && q[0].stateTime > 0.3);
  // He is at its flank, close, and cuts and cuts: the whole of his three-cut combo, as fast as it goes.
  put(p, a.x - Math.cos(a.facing) * 0.95, a.z + Math.sin(a.facing) * 0.95, a);
  let landed = 0;
  let last: Ant | null = null;
  const ev = events();
  const seen: AntState[] = [];
  const heard: string[] = [];
  let sprang = -1;
  let from = 0;
  for (let f = 0; f < 150; f++) {
    p.update(DT, input({ attackPressed: f % 6 === 0 && f < 80 }), chamber.colliders);
    a.update(DT, p.position.x, p.position.y, p.position.z, true);
    heard.push(...a.events.splice(0));
    if (seen[seen.length - 1] !== a.state) seen.push(a.state);
    if (a.state === 'spring' && sprang < 0) {
      sprang = f * DT;
      from = dist(a, p.position);
    }
    resolveCombat(p, [a], ev);
    if (ev.enemyHit && ev.enemyHit !== last) landed++;
    last = ev.enemyHit as Ant | null;
  }
  check('cut at it up close and it staggers, and then springs back out of his reach (it says so)', seen.includes('stagger') && seen.includes('spring') && heard.includes('spring') && dist(a, p.position) > SWORD + 0.3, `${seen.join(' ')}; ended ${dist(a, p.position).toFixed(2)} off (it sprang from ${from.toFixed(2)})`);
  check('...so getting in is worth two cuts, not a kill: the third of his combo finds it gone', landed === 2 && a.hp === N.hp - 2 && a.alive, `${landed} cuts landed, hp ${a.hp}`);
  check('...and it has its pike levelled at him again', a.level || a.state === 'march' || a.state === 'hold', a.state);
}

// ---- Enough cuts kill it; it comes back to its post when he is gone ----
{
  const [a] = antsOf(1);
  const p = ratAt(SPOT.x, SPOT.z);
  play([a], p, still, (q) => q[0].state === 'hold' && q[0].stateTime > 0.3);
  let hits = 0;
  for (let i = 0; i < 8 && a.alive; i++) {
    put(p, a.x - Math.cos(a.facing) * 0.9, a.z + Math.sin(a.facing) * 0.9, a);
    if (swing(p, [a]).enemyHit === a) hits++;
  }
  check('four cuts kill it', !a.alive && hits === N.hp && N.hp === 4 && a.state === 'dead', `${hits} cuts`);
  check('dead, it does nothing and hurts nothing', !a.attackActive && !a.level && !a.awake && !a.ready);
  const [b] = antsOf(1);
  const p2 = ratAt(SPOT.x, SPOT.z);
  play([b], p2, still, (q) => q[0].state === 'hold' && q[0].stateTime > 0.3);
  put(p2, 0, 40);
  const r = play([b], p2, still, (q) => q[0].state === 'idle', 1500);
  check('when he leaves the ward it shoulders its pike and goes back to its post, to face the way it was set', b.state === 'idle' && r.seen[0].join(' ') === 'return idle' && dist(b, b.home) < 0.3 && Math.abs(wrap(b.facing - (specs[0].facing ?? 0))) < 0.06 && !b.level, r.seen[0].join(' '));
}

// ---- Two: a pair ----
{
  const ants = antsOf();
  const [a, b] = ants;
  // He comes in sight of the nearer one only.
  const p = ratAt(a.x - N.noticeRange + 0.5, SPOT.z);
  check('(he is in sight of one and not the other)', dist(a, p.position) < N.noticeRange && dist(b, p.position) > N.noticeRange);
  const r = play(ants, p, still, (q) => q.every((x) => x.awake), 120);
  check('two near each other are mates, and the one that sees him wakes the other', a.mate === b && b.mate === a && a.awake && b.awake && r.heard[0].includes('alert') && r.heard[1].includes('alert') && r.frames < 10, `${r.frames} frames`);
  check('the nearer is the front, the other the flank', a.role === 'front' && b.role === 'flank');
}
{
  // He stands in the open ward and lets them come.
  const ants = antsOf();
  const [a, b] = ants;
  const p = ratAt(SPOT.x, SPOT.z);
  let pincer = -1;
  let both = 0;
  let together = 0;
  let nearest = 9;
  const starts: number[][] = [[], []];
  const r = play(ants, p, (q, f) => {
    put(p, SPOT.x, SPOT.z);
    p.hp = MAX;
    if (pincer < 0 && apart(q[0], q[1], p.position) > 2.6 && q.every((x) => x.state === 'hold')) pincer = f * DT;
    if (pincer >= 0 && apart(q[0], q[1], p.position) > 2.4) both++;
    if (q[0].attacking && q[1].attacking) together++;
    nearest = Math.min(nearest, dist(q[0], q[1]));
    return {};
  }, () => false, 60 * 24);
  r.heard.forEach((h, k) => {
    void h;
    void k;
  });
  check('they come at him together, and within a few seconds one is in front of him and the other behind, each at pike\'s length', pincer > 0 && pincer < 6 && Math.abs(dist(a, p.position) - N.holdRange) < 0.8 && Math.abs(dist(b, p.position) - N.holdRange) < 0.8, `either side of him after ${pincer.toFixed(1)} s`);
  check('...and they stay either side of him', both / (60 * 24 - pincer * 60) > 0.85, `${((100 * both) / (60 * 24 - pincer * 60)).toFixed(0)}% of the rest of the fight`);
  const thrusts = r.heard.map((h) => h.filter((e) => e === 'thrust').length);
  check('they thrust by turns: both of them, never the two at once', thrusts[0] >= 3 && thrusts[1] >= 3 && Math.abs(thrusts[0] - thrusts[1]) <= 2 && together === 0, `${thrusts.join(' and ')} thrusts; ${together} frames both attacking`);
  check('standing between them he is struck from in front and from behind', r.results.filter((x) => x === 'hit').length >= 4, `${r.results.filter((x) => x === 'hit').length} blows struck him`);
  check('they do not walk through each other', nearest > 2 * N.radius, `nearest ${nearest.toFixed(2)}`);
  void starts;
}
{
  // He turns on the one behind him and walks at it: it becomes the front, and the other goes round.
  const ants = antsOf();
  const p = ratAt(SPOT.x, SPOT.z);
  play(ants, p, () => {
    p.hp = MAX;
    return {};
  }, (q) => apart(q[0], q[1], p.position) > 2.6 && q.every((x) => x.state === 'hold'), 600);
  const flank = ants.find((x) => x.role === 'flank')!;
  const front = ants.find((x) => x.role === 'front')!;
  let swapped = -1;
  let again = -1;
  const r = play(ants, p, (q, f) => {
    p.hp = MAX;
    if (swapped < 0 && flank.role === 'front' && front.role === 'flank') swapped = f * DT;
    if (swapped >= 0 && again < 0 && f * DT > swapped + 0.5 && apart(q[0], q[1], p.position) > 2.4) again = f * DT;
    // (He walks at it until he is inside its point, then stands.)
    const d = dist(flank, p.position);
    return d > 1.9 ? { move: new THREE.Vector3(flank.x - p.position.x, 0, flank.z - p.position.z).normalize() } : {};
  }, () => again >= 0, 900);
  void r;
  check('turn on the one behind and walk at it, and it becomes the one that holds him while the other goes round', swapped >= 0 && swapped < 3, `changed over after ${swapped.toFixed(2)} s`);
  check('...and is behind him again within a few seconds', again > 0 && again - swapped < 5, `${(again - swapped).toFixed(1)} s later`);
}
{
  // He goes for one of them: the moment he is inside its point, the other makes ready.
  const ants = antsOf();
  const p = ratAt(SPOT.x, SPOT.z);
  // (Just after a thrust, so that neither is about to thrust anyway.)
  let thrusts = 0;
  play(ants, p, () => {
    put(p, SPOT.x, SPOT.z);
    p.hp = MAX;
    return {};
  }, (q) => {
    if (q.some((x) => x.state === 'thrust' && x.stateTime < DT * 1.5)) thrusts++;
    return thrusts >= 2 && q.every((x) => x.state === 'hold');
  }, 1200);
  const target = ants.find((x) => x.role === 'front')!;
  const other = ants.find((x) => x !== target)!;
  let inside = -1;
  let answer = -1;
  play(ants, p, (q, f) => {
    p.hp = MAX;
    if (inside < 0 && target.close) inside = f * DT;
    if (inside >= 0 && answer < 0 && other.state === 'windup') answer = f * DT;
    void q;
    const d = dist(target, p.position);
    return d > 1.9 ? { move: new THREE.Vector3(target.x - p.position.x, 0, target.z - p.position.z).normalize(), run: true } : {};
  }, () => answer >= 0, 600);
  check('go for one, and once he is inside its point the other comes round and draws its pike back to thrust at his back, without waiting its turn out', inside >= 0 && answer >= 0 && answer - inside < 1.6, `${(answer - inside).toFixed(2)} s after he got inside`);
}
{
  // Break the pair: with its mate dead, one fights on alone.
  const ants = antsOf();
  const [a, b] = ants;
  const p = ratAt(SPOT.x, SPOT.z);
  play(ants, p, () => {
    p.hp = MAX;
    return {};
  }, (q) => q.every((x) => x.state === 'hold'), 600);
  while (b.alive) b.takeHit(9, p.position.x, p.position.z);
  const r = play(ants, p, () => {
    put(p, SPOT.x, SPOT.z);
    p.hp = MAX;
    return {};
  }, () => false, 600);
  check('kill one and the other fights on alone, in front of him, and still thrusts', a.mate === null && a.role === 'front' && a.alive && r.heard[0].filter((e) => e === 'thrust').length >= 2 && r.heard[1].length === 0, `${r.heard[0].filter((e) => e === 'thrust').length} thrusts`);
}

// ---- The ward is a ledge: whatever he does, they keep to the floor ----
{
  const ants = antsOf();
  let off = 0;
  let frames = 0;
  let stuckIn = 0;
  for (const path of [0, 1, 2]) {
    const q = antsOf();
    const p = ratAt(SPOT.x, SPOT.z);
    play(q, p, (x, f) => {
      const t = f * DT;
      // Round and round by the pit's edge; along the gatehouse wall; and back and forth past them.
      const to = path === 0 ? { x: SPOT.x + 6 + Math.sin(t * 0.9) * 5, z: WARD.z0 + 1.2 + (1 + Math.cos(t * 1.3)) * 1.2 } : path === 1 ? { x: SPOT.x + 6 + Math.sin(t * 0.7) * 7, z: WARD.z1 - 0.8 } : { x: SPOT.x + 7 + Math.sin(t * 0.5) * 9, z: (WARD.z0 + WARD.z1) / 2 + Math.sin(t * 1.7) * 2.5 };
      put(p, to.x, to.z);
      p.hp = MAX;
      for (const a of x) {
        frames++;
        if (!canStand(a.x, a.y, a.z, a.radius * 0.9)) off++;
        if (a.z < WARD.z0 || a.z > WARD.z1) stuckIn++;
      }
      return {};
    }, () => false, 60 * 30);
  }
  void ants;
  check('they never step off the ledge into the pit, or into the gatehouse wall, wherever he leads them', off === 0 && stuckIn === 0 && frames > 5000, `${off} of ${frames} ant-frames off the floor`);
}

// ---- A whole fight, played to win ----
{
  // He guards whatever is thrown at him, and whenever one of them is stretched out he goes in at it.
  const ants = antsOf();
  const p = ratAt(SPOT.x, SPOT.z);
  const r = play(ants, p, (q, f) => {
    const live = q.filter((x) => x.alive);
    if (!live.length) return {};
    const threat = live.find((x) => x.state === 'windup' || x.state === 'thrust' || x.state === 'biteWind' || x.state === 'bite');
    const open = live.find((x) => x.state === 'recover' || x.state === 'biteRest' || x.state === 'reel' || x.state === 'stagger');
    if (threat) {
      p.facing = Math.atan2(threat.x - p.position.x, threat.z - p.position.z);
      return { guardHeld: true };
    }
    const target = open ?? live[0];
    const d = dist(target, p.position);
    p.facing = Math.atan2(target.x - p.position.x, target.z - p.position.z);
    if (d > 1.15) return { move: new THREE.Vector3(target.x - p.position.x, 0, target.z - p.position.z).normalize(), run: true };
    return f % 18 === 0 ? { attackPressed: true } : {};
  }, (q) => q.every((x) => !x.alive) || p.dead, 60 * 90);
  check('a rat who keeps his shield to whichever is striking, and goes in when one is open, beats the pair', ants.every((x) => !x.alive) && !p.dead, `${(r.frames * DT).toFixed(0)} s, hp ${p.hp}, blows ${r.results.join(' ') || 'none'}`);
  check('...and it takes him a while: they are not cut down where they stand', r.frames * DT > 8, `${(r.frames * DT).toFixed(1)} s`);
}

console.log(failures === 0 ? '\nAnt pikeman: all checks passed' : `\nAnt pikeman: ${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
