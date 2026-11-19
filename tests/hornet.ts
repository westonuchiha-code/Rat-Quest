// The Hornet Lancer: a great hornet with a lance. It hangs in the air out of the sword's reach and has two attacks,
// both made with the POINT of its lance: a dive onto where he stands (miss, and the lance sticks in the floor: that is
// when to hit it), and a level run at him from further off. A shield stops the point; a perfect guard knocks it out of
// the air. All of it with the real controller, the real combat and the Keep's real courtyard.
import './../src/core/colorSetup';
import * as THREE from 'three';
import { PlayerController, PlayerInput } from '../src/player/controller';
import { Hornet, HORNET, type HornetState } from '../src/enemies/hornet';
import { CombatEvents, resolveCombat } from '../src/combat/combat';
import { buildChamber } from '../src/world/chamber';
import { LEVELS } from '../src/levels/levels';
import { ENEMY_PIECES, compileCustom, emptyCustom } from '../src/levels/custom';
import { TUNING } from '../src/data/tuning';
import { STICKERS } from '../src/data/stickers';
import { stickerIcon } from '../src/ui/icons';
import { GoalTracker } from '../src/levels/goals';
import type { LevelDef } from '../src/levels/types';

const DT = 1 / 60;
const H = HORNET;
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
const canFly = (x: number, y: number, z: number, r: number): boolean =>
  !chamber.colliders.some((b) => !(x + r <= b.min.x || x - r >= b.max.x || z + r <= b.min.z || z - r >= b.max.z) && b.max.y > y + 0.02 && b.min.y < y + 0.5);
const input = (o: Partial<PlayerInput> = {}): PlayerInput => ({ move: new THREE.Vector3(), run: false, jumpPressed: false, jumpHeld: false, attackPressed: false, dodgePressed: false, guardHeld: false, sneakHeld: false, stowPressed: false, ...o } as PlayerInput);
const events = (): CombatEvents => ({ enemyHit: null, enemyKilled: false, playerResult: null, shockwave: false, cratesBroken: [] });
const spec = keep.enemies.find((e) => e.type === 'hornet')!;
/** It, where the Keep puts it. `roll`: its dice (0.9: it always dives; 0.1: it runs at him whenever it is far enough). */
function hornet(roll = 0.9): Hornet {
  const h = new Hornet(spec);
  h.canStand = canStand;
  h.canFly = canFly;
  h.rng = () => roll;
  return h;
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
const tick = (h: Hornet, p: PlayerController): void => h.update(DT, p.position.x, p.position.y, p.position.z, !p.dead);
const dist = (a: { x: number; z: number }, b: { x: number; z: number }): number => Math.hypot(a.x - b.x, a.z - b.z);
/** Plays on, the rat doing `act` each frame, until `stop`. Returns what reached the rat and every state it was in. */
function play(h: Hornet, p: PlayerController, act: (h: Hornet, frame: number) => Partial<PlayerInput>, stop: (h: Hornet, frame: number) => boolean, frames = 3600): { results: string[]; seen: HornetState[]; heard: string[] } {
  const results: string[] = [];
  const seen: HornetState[] = [];
  const heard: string[] = [];
  const ev = events();
  for (let i = 0; i < frames && !stop(h, i); i++) {
    p.update(DT, input(act(h, i)), chamber.colliders);
    tick(h, p);
    heard.push(...h.events.splice(0));
    resolveCombat(p, [h], ev);
    if (ev.playerResult) results.push(ev.playerResult);
    if (seen[seen.length - 1] !== h.state) seen.push(h.state);
  }
  return { results, seen, heard };
}
const still = (): Partial<PlayerInput> => ({});
/** One swing from where he stands. */
function swing(p: PlayerController, h: Hornet): CombatEvents {
  const ev = events();
  let seen = events();
  h.lastSwing = -1;
  p.update(DT, input({ attackPressed: true }), chamber.colliders);
  for (let i = 0; i < 28; i++) {
    resolveCombat(p, [h], ev);
    if (ev.enemyHit) seen = { ...seen, enemyHit: ev.enemyHit, enemyKilled: seen.enemyKilled || ev.enemyKilled };
    p.update(DT, input(), chamber.colliders);
  }
  return seen;
}
const MAX = TUNING.health.max;
/** The open yard in front of its post, for him to stand in. */
const YARD = { x: spec.x, z: spec.z + 7 };

// ---- Where it is, and what it is ----
{
  check(
    'the Keep has one, hanging over the east plate of the courtyard',
    keep.enemies.filter((e) => e.type === 'hornet').length === 1
      && Math.abs(spec.x - 30) < 1
      && spec.z > 28
      && spec.z < 48
      && (spec.y ?? 0) === 0
  );
  const A = spec.arena!;
  check(
    'its patch is a wide one (it hangs a little way off him, and runs on past him)',
    A.x1 - A.x0 >= 2 * H.standOff
      && A.z1 - A.z0 >= 14,
    `${(A.x1 - A.x0).toFixed(0)} by ${(A.z1 - A.z0).toFixed(0)}`
  );
  const h = hornet();
  check(
    'at its post it hangs in the air, higher than a sword reaches, facing the way it was set',
    h.state === 'idle'
      && Math.abs(h.y - H.hover) < 1e-6
      && Math.abs(h.facing - (spec.facing ?? 0)) < 1e-6
      && canFly(h.x, h.y, h.z, h.radius)
  );
  check('it is a piece in the level editor, and what the editor places is one', ENEMY_PIECES.includes('hornet') && (() => {
    const lvl = emptyCustom();
    lvl.pieces.push({ t: 'hornet', x0: 3, z0: -2, x1: 3, z1: -2, top: 0, dir: 'e' });
    const e = compileCustom(lvl).enemies.find((q) => q.type === 'hornet');
    return !!e && e.x === 3 && e.z === -2 && Math.abs((e.facing ?? 9) - Math.PI / 2) < 1e-6 && e.arena!.x1 - e.arena!.x0 > 14 && e.arena!.x0 >= -lvl.width / 2 && e.arena!.x1 <= lvl.width / 2;
  })());
  const st = STICKERS.find((s) => s.id === 'foe:hornet');
  check('it has a sticker, with a picture', !!st && stickerIcon(st.icon).includes('<svg') && stickerIcon(st.icon) !== stickerIcon('nothing-by-that-name'));
}

// ---- It sees him, and hangs off him ----
{
  const h = hornet();
  const far = ratAt(spec.x - H.noticeRange - 3, spec.z + 6);
  for (let i = 0; i < 120; i++) tick(h, far);
  check('from further off than it notices, it stays at its post', h.state === 'idle');
  const p = ratAt(YARD.x, YARD.z);
  const r = play(h, p, still, (q) => q.state === 'hover' && q.stateTime > 1.2);
  check('it sees him, with a start, and comes to hang near him', r.heard.includes('alert') && r.seen.join(' ') === 'alert hover', r.seen.join(' '));
  check(
    '...about its stand-off away, and its own height over the ground he is on',
    Math.abs(dist(h, p.position) - H.standOff) < 1.6
      && Math.abs(h.y - H.hover) < 0.5,
    `${dist(h, p.position).toFixed(1)} off, ${h.y.toFixed(2)} up`
  );
  check(
    '...facing him',
    Math.abs(Math.atan2(Math.sin(Math.atan2(p.position.x - h.x, p.position.z - h.z) - h.facing), Math.cos(Math.atan2(p.position.x - h.x, p.position.z - h.z) - h.facing))) < 0.1
  );
  // Out of the sword's reach: he stands right under it and swings.
  put(p, h.x, h.z + 0.3, h);
  const cut = swing(p, h);
  check('standing right under it, his sword does not reach it', cut.enemyHit === null);
}

// ---- The dive ----
{
  // He stands still for it.
  const h = hornet();
  const p = ratAt(YARD.x, YARD.z);
  play(h, p, still, (q) => q.state === 'diveWind');
  const windStart = { ...h.hold };
  let early = false;
  let wind = 0;
  let pointed = 9;
  const r = play(h, p, still, (q) => {
    if (q.state === 'diveWind') {
      wind += DT;
      if (q.attackActive) early = true;
      const t = { x: p.position.x - q.hold.x, y: p.position.y - q.hold.y, z: p.position.z - q.hold.z };
      const l = Math.hypot(t.x, t.y, t.z);
      pointed = Math.acos(Math.min(1, (q.aim.x * t.x + q.aim.y * t.y + q.aim.z * t.z) / l));
    }
    return q.state === 'stuck';
  });
  void windStart;
  check(
    'its lance swings down to point at him and it hangs there for the length of the tell, harmless',
    Math.abs(wind - H.diveWind) < 0.05
      && !early
      && pointed < 0.02,
    `${wind.toFixed(2)} s, ${pointed.toFixed(3)} rad off him`
  );
  check(
    'then it comes down the line of its lance, and a rat who stood still is struck by the point',
    r.results.join() === 'hit'
      && p.hp === MAX - H.diveDamage,
    `${r.results.join()} hp ${p.hp}`
  );
  check(
    'its point ends on the floor where he stood',
    Math.abs(h.tip.y - 0) < 1e-6
      && Math.hypot(h.tip.x - YARD.x, h.tip.z - YARD.z) < 0.35,
    `${Math.hypot(h.tip.x - YARD.x, h.tip.z - YARD.z).toFixed(2)} from the spot`
  );
}
{
  // He steps off the spot once it is set: the lance goes into the floor.
  const h = hornet();
  const p = ratAt(YARD.x, YARD.z);
  let setAt = null as { x: number; z: number } | null;
  const r = play(h, p, (q) => {
    if (q.state === 'diveWind' && q.stateTime >= H.diveWind * H.diveTrack) {
      setAt ??= { x: p.position.x, z: p.position.z };
      return { move: new THREE.Vector3(1, 0, 0), run: true };
    }
    return q.state === 'dive' ? { move: new THREE.Vector3(1, 0, 0), run: true } : {};
  }, (q) => q.state === 'stuck');
  check('step off the spot it is set on, and its lance misses him', r.results.length === 0 && p.hp === MAX);
  check(
    '...and goes into the floor where he stood, and sticks (it says so)',
    h.state === 'stuck'
      && r.heard.includes('stick')
      && !!setAt
      && Math.hypot(h.tip.x - setAt!.x, h.tip.z - setAt!.z) < 0.05
      && h.tip.y === 0,
    setAt ? `${Math.hypot(h.tip.x - setAt.x, h.tip.z - setAt.z).toFixed(2)} from where he stood` : 'never set'
  );
  check(
    'stuck, it is down where a sword can reach it, and can do nothing',
    h.downed
      && !h.attackActive
      && h.y < 0.9
      && h.y > 0.05,
    `its body ${h.y.toFixed(2)} over the floor`
  );
  // He goes to it and cuts at it: every cut lands, and it stays stuck.
  put(p, h.x + 0.9, h.z, h);
  const first = swing(p, h);
  const second = swing(p, h);
  check(
    'his sword lands on it while it hangs there, twice in the time, and it does not get away',
    first.enemyHit === h
      && second.enemyHit === h
      && h.hp === H.hp - 2
      && h.state === 'stuck',
    `hp ${h.hp}, ${h.state}`
  );
  let stuckFor = 0;
  const h2 = hornet();
  const p2 = ratAt(YARD.x, YARD.z);
  play(h2, p2, (q) => (q.state === 'diveWind' && q.stateTime >= H.diveWind * H.diveTrack) || q.state === 'dive' ? { move: new THREE.Vector3(1, 0, 0), run: true } : {}, (q) => q.state === 'stuck');
  const after = play(h2, p2, still, (q) => {
    if (q.state === 'stuck') stuckFor += DT;
    return q.state === 'hover';
  });
  play(h2, p2, still, (q) => q.state === 'hover' && q.stateTime > 1);
  check(
    'it hangs there for a second and a half, then wrenches its lance out and is back up in the air',
    Math.abs(stuckFor - H.stuck) < 0.05
      && after.seen.join(' ') === 'stuck free hover'
      && after.heard.includes('free')
      && h2.y > 2,
    `${stuckFor.toFixed(2)} s; ${after.seen.join(' ')}; ${h2.y.toFixed(1)} up`
  );
}
{
  // A shield stops the point.
  const h = hornet();
  const p = ratAt(YARD.x, YARD.z);
  const r = play(h, p, (q) => {
    put(p, YARD.x, YARD.z, q);
    return q.state === 'diveWind' || q.state === 'dive' ? { guardHeld: true } : {};
  }, (q) => q.state === 'stuck' || q.state === 'fall');
  check(
    'a shield stops its point (and its lance goes into the floor all the same)',
    r.results.join() === 'blocked'
      && p.hp === MAX
      && h.state === 'stuck',
    `${r.results.join()} ${h.state}`
  );
  // A perfect guard: raised as the point arrives.
  let best = '';
  let down = 0;
  for (let lead = 1; lead <= 12 && best !== 'parried'; lead++) {
    const hh = hornet();
    const pp = ratAt(YARD.x, YARD.z);
    let diving = 0;
    const rr = play(hh, pp, (q) => {
      put(pp, YARD.x, YARD.z, q);
      if (q.state === 'dive') diving++;
      // (The dive takes about half a second: the shield goes up `lead` frames before it ends.)
      return q.state === 'dive' && diving >= 30 - lead ? { guardHeld: true } : {};
    }, (q) => q.state === 'stuck' || q.state === 'fall' || q.state === 'grounded');
    if (rr.results.includes('parried')) {
      best = 'parried';
      play(hh, pp, still, (q) => {
        if (q.state === 'grounded') down += DT;
        return q.state === 'rise';
      });
      check(
        'a perfect guard knocks it out of the air: it falls and lies on the floor, for longer than if it were only struck',
        hh.state === 'rise'
          && Math.abs(down - H.groundedParried) < 0.05
          && pp.hp === MAX,
        `${down.toFixed(2)} s`
      );
    }
  }
  check('...and there is a moment at which the shield can be raised to do it', best === 'parried');
}

// ---- The run (the joust) ----
{
  const h = hornet(0.1);
  const p = ratAt(YARD.x, YARD.z);
  play(h, p, still, (q) => q.state === 'joustWind');
  const from = dist(h, p.position);
  let wind = 0;
  let early = false;
  play(h, p, still, (q) => {
    if (q.state === 'joustWind') {
      wind += DT;
      if (q.attackActive) early = true;
    }
    return q.state === 'joust';
  });
  check(
    'from far enough off it may run at him instead: it comes down to chest height and levels its lance, harmless for the length of the tell',
    from >= H.joustFrom - 0.01
      && Math.abs(wind - H.joustWind) < 0.05
      && !early
      && Math.abs(h.y - H.joustHeight) < 0.02
      && Math.abs(h.aim.y) < 1e-6,
    `from ${from.toFixed(1)}, ${wind.toFixed(2)} s, ${h.y.toFixed(2)} up`
  );
  const start = { x: h.x, z: h.z };
  const heading = h.facing;
  let off = 0;
  const r = play(h, p, still, (q) => {
    // (How far it strays from the straight line it set out on.)
    const dx = q.x - start.x;
    const dz = q.z - start.z;
    if (q.state === 'joust') off = Math.max(off, Math.abs(dx * Math.cos(heading) - dz * Math.sin(heading)));
    return q.state !== 'joust';
  });
  check(
    'it runs straight, through where he stood, and a rat who stood still is struck by the point',
    r.results[0] === 'hit'
      && p.hp === MAX - H.joustDamage
      && off < 0.6,
    `${r.results.join()}; ${off.toFixed(2)} off its line`
  );
  check('...and then pulls up and away, back to its height', h.state === 'climb' && (play(h, p, still, (q) => q.state === 'hover'), h.y > 2));
}
{
  // Step aside: it goes by, and on past.
  const h = hornet(0.1);
  const p = ratAt(YARD.x, YARD.z);
  let stood: { x: number; z: number } | null = null;
  let start: { x: number; z: number } | null = null;
  const r = play(h, p, (q) => {
    if (q.state === 'joustWind' && q.stateTime >= H.joustWind * H.joustTrack) {
      stood ??= { x: p.position.x, z: p.position.z };
      return { move: new THREE.Vector3(0, 0, 1), run: true };
    }
    if (q.state === 'joust') {
      start ??= { x: q.x, z: q.z };
      return { move: new THREE.Vector3(0, 0, 1), run: true };
    }
    return {};
  }, (q) => q.state === 'climb');
  const ran = start ? dist(h, start) : 0;
  const toSpot = start && stood ? dist(start, stood) : 0;
  check('step out of its line once it is set, and it goes by without touching him', r.results.length === 0 && p.hp === MAX);
  check(
    '...and runs on well past where he stood (or to the wall, if that comes first)',
    ran > toSpot + 1.5,
    `ran ${ran.toFixed(1)}, the spot was ${toSpot.toFixed(1)} off`
  );
}
{
  // Jump it.
  const h = hornet(0.1);
  const p = ratAt(YARD.x, YARD.z);
  let jumped = false;
  const r = play(h, p, (q) => {
    const near = q.state === 'joust' && dist(q.tip, p.position) < 3.2;
    const go = near && !jumped;
    if (go) jumped = true;
    return { jumpPressed: go, jumpHeld: near };
  }, (q) => q.state === 'climb');
  check('jump as it comes, and it passes under him', jumped && r.results.length === 0 && p.hp === MAX, r.results.join());
}
{
  // The shield, and the perfect guard.
  const h = hornet(0.1);
  const p = ratAt(YARD.x, YARD.z);
  const r = play(h, p, (q) => {
    put(p, YARD.x, YARD.z, q);
    return q.state === 'joustWind' || q.state === 'joust' ? { guardHeld: true } : {};
  }, (q) => q.state === 'climb' || q.state === 'fall');
  check(
    'a shield stops the run: its point glances off, and it pulls up (no opening)',
    r.results.join() === 'blocked'
      && p.hp === MAX
      && h.state === 'climb',
    `${r.results.join()} ${h.state}`
  );
  let parried = false;
  for (let lead = 1; lead <= 14 && !parried; lead++) {
    const hh = hornet(0.1);
    const pp = ratAt(YARD.x, YARD.z);
    const rr = play(hh, pp, (q) => {
      put(pp, YARD.x, YARD.z, q);
      return q.state === 'joust' && dist(q.tip, pp.position) < 0.45 + lead * 0.2 ? { guardHeld: true } : {};
    }, (q) => q.state === 'climb' || q.state === 'fall');
    if (rr.results.includes('parried') && hh.state === 'fall') parried = true;
  }
  check('a perfect guard on the run knocks it down', parried);
}
{
  // Cut at it as it goes by.
  let hitPassing = false;
  for (let side = 0.9; side <= 1.5 && !hitPassing; side += 0.2) {
    const h = hornet(0.1);
    const p = ratAt(YARD.x, YARD.z);
    let line: { x: number; z: number; f: number } | null = null;
    let swung = false;
    const ev = events();
    for (let i = 0; i < 3600 && h.state !== 'climb' && h.state !== 'fall'; i++) {
      let act: Partial<PlayerInput> = {};
      if (h.state === 'joust') {
        line ??= { x: h.x, z: h.z, f: h.facing };
        // Standing beside its line, facing across it, he swings as its body comes level with him.
        const along = (p.position.x - h.x) * Math.sin(h.facing) + (p.position.z - h.z) * Math.cos(h.facing);
        if (!swung && along < 1.3) {
          swung = true;
          act = { attackPressed: true };
        }
      } else if (h.state === 'joustWind' && h.stateTime >= H.joustWind * H.joustTrack) {
        // (Once it is set, he steps `side` off its line and turns to face the line.)
        const fx = Math.sin(h.facing);
        const fz = Math.cos(h.facing);
        put(p, YARD.x + fz * side, YARD.z - fx * side, { x: YARD.x, z: YARD.z });
      }
      p.update(DT, input(act), chamber.colliders);
      tick(h, p);
      h.events.length = 0;
      resolveCombat(p, [h], ev);
      if (ev.enemyHit === h) hitPassing = true;
    }
    if (hitPassing) check('a cut timed as it goes by lands on it, and knocks it out of the air', h.state === 'fall' && h.hp === H.hp - 1 && p.hp === MAX, `${h.state}, hp ${h.hp}, his ${p.hp}`);
  }
  check('...and there is a place beside its line to stand and do it', hitPassing);
}

// ---- Struck in the air; on the floor; over a pit ----
{
  const h = hornet();
  const p = ratAt(YARD.x, YARD.z);
  play(h, p, still, (q) => q.state === 'hover' && q.stateTime > 0.5);
  h.takeHit(1, p.position.x, p.position.z);
  let down = 0;
  const r = play(h, p, still, (q) => {
    if (q.state === 'grounded') down += DT;
    return q.state === 'hover';
  });
  check(
    'struck in the air, it falls, lies on the floor a second and a half, and gets up again',
    r.seen.join(' ') === 'fall grounded rise hover'
      && r.heard.includes('thud')
      && Math.abs(down - H.grounded) < 0.05,
    `${r.seen.join(' ')}; ${down.toFixed(2)} s`
  );
  // On the floor he can reach it.
  const g = hornet();
  const q = ratAt(YARD.x, YARD.z);
  play(g, q, still, (x) => x.state === 'hover' && x.stateTime > 0.5);
  g.takeHit(1, 0, 0);
  play(g, q, still, (x) => x.state === 'grounded');
  put(q, g.x + 0.9, g.z, g);
  const cut = swing(q, g);
  check('on the floor his sword reaches it', cut.enemyHit === g && g.y === 0);
  // Over a drop there is no floor to land on.
  const lost = hornet();
  lost.canStand = () => false;
  const z = ratAt(YARD.x, YARD.z);
  play(lost, z, still, (x) => x.state === 'hover' && x.stateTime > 0.5);
  lost.takeHit(1, 0, 0);
  const fell = play(lost, z, still, (x) => !x.alive, 600);
  check('knocked down over a drop, it is gone', !lost.alive && fell.heard.includes('lost'));
}

// ---- It keeps out of the walls, and goes home ----
{
  const h = hornet(0.5);
  const p = ratAt(YARD.x, YARD.z);
  let inWall = 0;
  let out = 0;
  let attacks = 0;
  const A = spec.arena!;
  let s = 3;
  const rnd = (): number => ((s = (s * 16807) % 2147483647) / 2147483647);
  h.rng = rnd;
  let tx = YARD.x;
  let tz = YARD.z;
  for (let i = 0; i < 60 * 90; i++) {
    if (i % 150 === 0) {
      tx = spec.x + (rnd() * 2 - 1) * 14;
      tz = 30 + rnd() * 16;
    }
    const dx = tx - p.position.x;
    const dz = tz - p.position.z;
    const d = Math.hypot(dx, dz);
    p.update(DT, input(d > 0.3 ? { move: new THREE.Vector3(dx / d, 0, dz / d), run: true } : {}), chamber.colliders);
    if (p.dead) break;
    tick(h, p);
    if (h.events.includes('diveWind') || h.events.includes('joustWind')) attacks++;
    h.events.length = 0;
    if (h.state !== 'grounded' && h.state !== 'fall' && !canFly(h.x, h.y, h.z, h.radius * 0.9)) inWall++;
    if (h.x < A.x0 - 0.01 || h.x > A.x1 + 0.01 || h.z < A.z0 - 0.01 || h.z > A.z1 + 0.01) out++;
  }
  check(
    'through a minute and a half of him running about the yard, it is never inside a wall nor out of its patch',
    inWall === 0
      && out === 0,
    `${inWall} frames in a wall, ${out} out of its patch`
  );
  check('...and it keeps coming at him', attacks >= 12, `${attacks} attacks begun`);
}
{
  const h = hornet();
  const p = ratAt(YARD.x, YARD.z);
  play(h, p, still, (q) => q.state === 'hover' && q.stateTime > 0.5);
  // He goes off to the far side of the Keep.
  put(p, -40, 40);
  const r = play(h, p, still, (q) => q.state === 'idle', 60 * 20);
  check(
    'when he goes right away it flies back to its post',
    h.state === 'idle'
      && r.seen.includes('return')
      && Math.hypot(h.x - spec.x, h.z - spec.z) < 0.5
      && Math.abs(h.y - H.hover) < 0.3,
    `${r.seen.join(' ')}; ${Math.hypot(h.x - spec.x, h.z - spec.z).toFixed(1)} from its post`
  );
}
{
  // Taking turns: told to wait, it never starts anything.
  const h = hornet();
  const p = ratAt(YARD.x, YARD.z);
  let started = 0;
  let wanted = false;
  for (let i = 0; i < 60 * 12; i++) {
    h.mayAttack = false;
    tick(h, p);
    if (h.ready) wanted = true;
    if (h.attacking) started++;
    h.events.length = 0;
  }
  check('told to wait its turn, it says it is ready and starts nothing', wanted && started === 0);
}

// ---- Its end ----
{
  const h = hornet();
  const p = ratAt(YARD.x, YARD.z);
  play(h, p, (q) => (q.state === 'diveWind' && q.stateTime >= H.diveWind * H.diveTrack) || q.state === 'dive' ? { move: new THREE.Vector3(1, 0, 0), run: true } : {}, (q) => q.state === 'stuck');
  let cuts = 0;
  while (h.alive && cuts < 10) {
    put(p, h.x + 0.9, h.z, h);
    // (If it has got free, wait for the next dive.)
    if (!h.downed) play(h, p, (q) => (q.state === 'diveWind' && q.stateTime >= H.diveWind * H.diveTrack) || q.state === 'dive' ? { move: new THREE.Vector3(1, 0, 0), run: true } : {}, (q) => q.state === 'stuck');
    put(p, h.x + 0.9, h.z, h);
    if (swing(p, h).enemyHit) cuts++;
  }
  check('four cuts kill it; it does not come back', !h.alive && cuts === H.hp && h.state === 'dead' && !h.respawns, `${cuts} cuts`);
  // Killed in the air, it comes down.
  const g = hornet();
  const q = ratAt(YARD.x, YARD.z);
  play(g, q, still, (x) => x.state === 'hover' && x.stateTime > 0.5);
  while (g.alive) g.takeHit(9, 0, 0);
  for (let i = 0; i < 90; i++) tick(g, q);
  check('killed in the air, it drops to the floor', g.state === 'dead' && g.y === 0 && !g.attackActive && !g.attacking);
}

// ---- The others: the first he meets, over the Foundry's dock; and one over the east bank of the Hollows, by the chasm ----
{
  const world = (L: LevelDef): { canStand: typeof canStand; canFly: typeof canFly } => {
    const ch = buildChamber({ solids: L.solids, pit: L.pit, water: L.water ?? [], decor: [], movers: L.movers });
    return {
      canStand: (x, y, z, r) => {
        let floor = false;
        for (const b of ch.colliders) {
          if (x + r <= b.min.x || x - r >= b.max.x || z + r <= b.min.z || z - r >= b.max.z) continue;
          if (b.max.y > y + 0.25 && b.min.y < y + 0.7) return false;
          if (Math.abs(b.max.y - y) <= 0.25 && x >= b.min.x && x <= b.max.x && z >= b.min.z && z <= b.max.z) floor = true;
        }
        return floor;
      },
      canFly: (x, y, z, r) => !ch.colliders.some((b) => !(x + r <= b.min.x || x - r >= b.max.x || z + r <= b.min.z || z - r >= b.max.z) && b.max.y > y + 0.02 && b.min.y < y + 0.5),
    };
  };
  const places: Array<{ id: string; where: string; beasts: number; pit: boolean }> = [
    { id: 'foundry', where: 'over the west end of the Foundry\'s dock', beasts: 6, pit: false },
    { id: 'hollows', where: 'over the east bank of the Hollows', beasts: 7, pit: true },
  ];
  for (const place of places) {
    const L = LEVELS.find((l) => l.id === place.id)!;
    const W = world(L);
    const found = L.enemies.filter((e) => e.type === 'hornet');
    const sp = found[0];
    const A = sp?.arena ?? { x0: 0, x1: 0, z0: 0, z1: 0 };
    check(
      `there is one ${place.where}, hanging in clear air over real floor`,
      found.length === 1
        && W.canStand(sp.x, sp.y ?? 0, sp.z, 0.45)
        && W.canFly(sp.x, (sp.y ?? 0) + H.hover, sp.z, H.radius),
      sp ? `at ${sp.x}, ${sp.z}` : 'none'
    );
    const goals = new GoalTracker(L, () => ({ have: 0, total: 0 }));
    const wedge = L.wedges?.find((w) => w.appears?.type === 'defeat');
    check(
      `...and it is no part of what that level's "beat every beast" wedge asks for: that is still ${place.beasts}, as its hint says`,
      !!sp?.uncounted
        && goals.enemyTotal === place.beasts
        && L.enemies.filter((e) => !e.uncounted).length === place.beasts
        && !!wedge
        && !/hornet|lancer/i.test(wedge.hint),
      `${goals.enemyTotal} counted of ${L.enemies.length}`
    );
    // Somewhere for him to stand: every whole step of its patch that is floor (not lava, not the chasm, not a crate).
    const spots: Array<{ x: number; z: number }> = [];
    for (let x = Math.ceil(A.x0) + 1; x <= A.x1 - 1; x += 2) for (let z = Math.ceil(A.z0) + 1; z <= A.z1 - 1; z += 2) if (W.canStand(x, 0, z, 0.45)) spots.push({ x, z });
    check('...with floor enough under its patch for him to fight it on', spots.length >= 40, `${spots.length} places to stand`);
    // A minute and a half: he stands on one spot after another (one in three at the very edge of the floor).
    const h = new Hornet(sp);
    h.canStand = W.canStand;
    h.canFly = W.canFly;
    let seed = 11;
    const rnd = (): number => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    h.rng = rnd;
    const edge = spots.filter((q) => !W.canStand(q.x - 1.2, 0, q.z, 0.3) || !W.canStand(q.x + 1.2, 0, q.z, 0.3) || !W.canStand(q.x, 0, q.z - 1.2, 0.3) || !W.canStand(q.x, 0, q.z + 1.2, 0.3));
    let at = spots[0];
    let inWall = 0;
    let out = 0;
    let attacks = 0;
    let stuck = 0;
    let under = 0;
    const seen = new Set<string>();
    for (let i = 0; i < 60 * 90; i++) {
      if (i % 170 === 0) at = i % 510 === 0 && edge.length ? edge[Math.floor(rnd() * edge.length)] : spots[Math.floor(rnd() * spots.length)];
      h.update(DT, at.x, 0, at.z, true);
      if (h.events.includes('diveWind') || h.events.includes('joustWind')) attacks++;
      if (h.events.includes('stick')) stuck++;
      h.events.length = 0;
      seen.add(h.state);
      if (h.state !== 'grounded' && h.state !== 'fall' && !W.canFly(h.x, h.y, h.z, h.radius * 0.9)) inWall++;
      if (h.x < A.x0 - 0.01 || h.x > A.x1 + 0.01 || h.z < A.z0 - 0.01 || h.z > A.z1 + 0.01) out++;
      if (h.y < -0.01) under++;
    }
    check(
      '...through a minute and a half of him moving about under it, it is never inside anything solid, nor out of its patch, nor under the floor',
      inWall === 0
        && out === 0
        && under === 0,
      `${inWall} frames in something, ${out} out of its patch, ${under} under the floor`
    );
    check(
      '...and it keeps coming at him, and its lance sticks in that floor when it misses',
      attacks >= 12
        && stuck >= 4
        && h.alive,
      `${attacks} attacks begun, ${stuck} lances stuck; it did ${[...seen].join(' ')}`
    );
    // Knocked out of the air where there is no floor under it (the lava, the chasm), it is gone: and that is a kill.
    const g = new Hornet(sp);
    g.canStand = W.canStand;
    g.canFly = W.canFly;
    g.rng = () => 0.9;
    let over: { x: number; z: number } | null = null;
    for (let x = A.x0 + 0.5; x <= A.x1 && !over; x += 1) for (let z = A.z0 + 0.5; z <= A.z1 && !over; z += 1) {
      if (!W.canStand(x, 0, z, 0.1) && W.canFly(x, 0, z, 0.1) && W.canFly(x, H.hover, z, H.radius)) over = { x, z };
    }
    if (over) {
      g.x = over.x;
      g.z = over.z;
      g.takeHit(1, 0, 0);
      for (let i = 0; i < 120 && g.alive; i++) g.update(DT, at.x, 0, at.z, true);
    }
    for (let i = 0; i < 90; i++) g.update(DT, at.x, 0, at.z, true);
    if (place.pit) check('...struck down where there is no floor under it (the chasm), it is gone for good, down out of sight (which counts as beating it)', !!over && !g.alive && g.events.includes('lost') && g.y < -8, over ? `over ${over.x.toFixed(1)}, ${over.z.toFixed(1)}; it ends ${g.y.toFixed(1)} down` : 'its patch is all floor');
    else check('...and all of its patch is over floor: the first one he meets cannot be lost into the lava', !over, over ? `no floor at ${over.x}, ${over.z}` : '');
    // Struck down right above something that stands on the floor (a crate, a barrel, a stalagmite): that is not a pit.
    let onto: { x: number; z: number } | null = null;
    for (let x = A.x0 + 0.5; x <= A.x1 && !onto; x += 0.5) for (let z = A.z0 + 0.5; z <= A.z1 && !onto; z += 0.5) {
      if (!W.canStand(x, 0, z, 0.1) && !W.canFly(x, 0, z, 0.1) && W.canFly(x, H.hover, z, H.radius)) onto = { x, z };
    }
    if (onto) {
      const c = new Hornet(sp);
      c.canStand = W.canStand;
      c.canFly = W.canFly;
      c.rng = () => 0.9;
      c.x = onto.x;
      c.z = onto.z;
      c.takeHit(1, 0, 0);
      const heard: string[] = [];
      for (let i = 0; i < 60 && c.state !== 'grounded'; i++) {
        c.update(DT, at.x, 0, at.z, true);
        heard.push(...c.events.splice(0));
      }
      check(
        '...struck down right above something standing on the floor (a crate, a barrel, a spike of rock), it comes down on the floor beside it, where he can reach it: it is not lost',
        c.alive
          && c.state === 'grounded'
          && !heard.includes('lost')
          && heard.includes('thud')
          && c.y === 0
          && W.canStand(c.x, 0, c.z, 0.3)
          && Math.hypot(c.x - onto.x, c.z - onto.z) < 3,
        `from over ${onto.x}, ${onto.z} to ${c.x.toFixed(1)}, ${c.z.toFixed(1)}; ${c.state}; heard ${heard.join(' ')}`
      );
      // And killed there, it lies on that floor.
      const d = new Hornet(sp);
      d.canStand = W.canStand;
      d.canFly = W.canFly;
      d.x = onto.x;
      d.z = onto.z;
      while (d.alive) d.takeHit(9, 0, 0);
      for (let i = 0; i < 90; i++) d.update(DT, at.x, 0, at.z, true);
      check(
        '...and killed there, it lies on the floor beside it, not in it or under it',
        d.y === 0
          && W.canStand(d.x, 0, d.z, 0.3),
        `at ${d.x.toFixed(1)}, ${d.z.toFixed(1)}, ${d.y.toFixed(2)} up`
      );
    }
  }
}

console.log(failures === 0 ? '\nhornet: all passed' : `\nhornet: ${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
