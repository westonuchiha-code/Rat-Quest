// THE TOY BOX: the dream's skate park (src/levels/toybox.ts), and what the shield can do in it.
// The owner, 2026-11-17: "I want this whole wacky Pomo area to feel like a big playground ... a lot of areas where you
// can just like almost skate around on the shield ... like a half pipe ... things for people to jump off and grind on
// and curved parts and different kinds of ramps and things that send you up high ... different things you can do while
// you're in the air we already have the kick flip so we could do a couple more things like that." And of the tuck:
// "the leaning forward needs to have more of an effect on his momentum ... this is a video game".
// Holds, with the real controller: that he gets on his shield anywhere here and PUSHES along the flat; that the half
// pipe carries him from wall to wall; that the big ramp throws him high and far; that the funbox's rail, the quarter
// pipe and both light rails can be ridden; the spin and the grab, and that tricks landed are speed; and its doors.
import './../src/core/colorSetup';
import * as THREE from 'three';
import { PlayerController, type PlayerInput, type MoveEvent } from '../src/player/controller';
import { aabbOf, topAt, type Aabb } from '../src/world/collision';
import { toyBox, toyBoxPlan, makeToyRide, TOY, HALF, BIG, BOX, QUARTER, COPING, halfDeck, facetsOf } from '../src/levels/toybox';
import { garden } from '../src/levels/garden';
import { TEST_ROOMS, levelById } from '../src/levels/levels';
import { TUNING } from '../src/data/tuning';
import { railAt } from '../src/world/rails';

const DT = 1 / 60;
const R = TUNING.ride;
let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}
const def = toyBox();
const P = toyBoxPlan();
const cs: Aabb[] = def.solids.map((b) => aabbOf(b));
const inp = (o: Partial<PlayerInput>): PlayerInput => ({ move: new THREE.Vector3(), run: true, jumpPressed: false, jumpHeld: false, attackPressed: false, dodgeHeld: false, dodgePressed: false, guardHeld: false, stowPressed: false, ...o } as PlayerInput);
const v = (x: number, z: number): THREE.Vector3 => new THREE.Vector3(x, 0, z);
const ground = (x: number, z: number): number => Math.max(-Infinity, ...cs.filter((b) => x >= b.min.x && x <= b.max.x && z >= b.min.z && z <= b.max.z).map((b) => topAt(b, x, z)));
const speedOf = (p: PlayerController): number => Math.hypot(p.velocity.x, p.velocity.z);
/** A rat at a place, in this level (a skate park, with its rails), settled on the ground. */
function rat(x: number, y: number, z: number): PlayerController {
  const p = new PlayerController(new THREE.Vector3(x, y + 0.01, z));
  p.rails = P.rails;
  p.skateAnywhere = !!def.skate;
  for (let i = 0; i < 10; i++) p.update(DT, inp({}), cs);
  return p;
}
/** Onto his shield where he stands: a jump, and ATTACK in the air; `move` held meanwhile. Gives back true if he is riding when he lands. */
function getOn(p: PlayerController, move: THREE.Vector3): boolean {
  p.update(DT, inp({ move, jumpPressed: true, jumpHeld: true }), cs);
  for (let i = 0; i < 90; i++) {
    p.update(DT, inp({ move, jumpHeld: true, attackPressed: !p.riding && p.velocity.y < 5 }), cs);
    if (p.riding && p.grounded) return true;
  }
  return p.riding;
}

check('it is a room to try, with a door in the Move Garden; it is the dream (its look, its sky) and a SKATE PARK; its doors lead to the dream\'s two rides, and its way out to the garden', TEST_ROOMS.some((l) => l.id === 'toybox') && !!levelById('toybox') && !!garden().courseDoors?.some((d) => d.to === 'toybox') && def.look === 'dream' && def.sky === 'space' && def.skate === true && (def.courseDoors ?? []).map((d) => d.to).sort().join() === 'bigdipper,milkyway' && def.returnTo === 'garden' && def.enemies.length === 0);

// ---- On the flat ----
{
  const p = rat(17.5, 0, -30);
  const on = getOn(p, v(0, 1));
  check('here a jump and ATTACK puts him on his shield over FLAT ground (anywhere else it is the dive)', on && p.riding);
  for (let i = 0; i < 60 * 4.5; i++) p.update(DT, inp({ move: v(0, 1) }), cs);
  const pushed = speedOf(p);
  check('the stick pushed forward PUSHES him along the flat, up to his standing top speed and no faster: he skates', Math.abs(pushed - R.max) < 0.3 && p.riding, `${pushed.toFixed(1)}`);
  for (let i = 0; i < 60; i++) p.update(DT, inp({}), cs);
  check('...and the stick let go, he rolls on, slowing', speedOf(p) < pushed - 1 && speedOf(p) > 4, `${speedOf(p).toFixed(1)}`);
  const q = new PlayerController(new THREE.Vector3(0, 0.01, -10));
  for (let i = 0; i < 10; i++) q.update(DT, inp({}), cs);
  q.update(DT, inp({ jumpPressed: true, jumpHeld: true }), cs);
  for (let i = 0; i < 40; i++) q.update(DT, inp({ jumpHeld: true, attackPressed: q.velocity.y < 5 }), cs);
  check('(one who is NOT in a skate park does not: over flat ground his air attack is the dive)', !q.riding);
}

// ---- The half pipe ----
{
  const deck = halfDeck();
  const wallTop = deck.y + COPING;
  /** Dropped in from the east deck (a run, a jump west out over the wall, ATTACK); then `stick` each step. The height he got to on each crossing. */
  const session = (stick: (p: PlayerController) => THREE.Vector3, secs: number): { peaks: number[]; p: PlayerController; on: boolean; events: MoveEvent[] } => {
    const p = rat(HALF.x + deck.out + 2, deck.y, 0);
    let on = false;
    for (let i = 0; i < 40 && !on; i++) {
      const lip = p.position.x < HALF.x + deck.out + 0.5;
      p.update(DT, inp({ move: v(-1, 0), jumpPressed: p.grounded && lip, jumpHeld: !p.grounded, attackPressed: !p.grounded && p.velocity.y < 3 }), cs);
      on = p.riding;
    }
    const peaks: number[] = [];
    const events: MoveEvent[] = [];
    let side = 1;
    let peak = 0;
    for (let i = 0; i < 60 * secs && p.riding; i++) {
      p.update(DT, inp({ move: stick(p) }), cs);
      if (p.moveEvent) events.push(p.moveEvent);
      const s2 = p.position.x > HALF.x ? 1 : -1;
      if (s2 !== side) { if (peaks.length || peak > 0) peaks.push(peak); peak = 0; side = s2; }
      peak = Math.max(peak, p.position.y);
    }
    return { peaks: peaks.slice(1), p, on, events };
  };
  const coastStart = (): PlayerController => {
    const p = rat(HALF.x + deck.out + 2, deck.y, 0);
    for (let i = 0; i < 40 && !p.riding; i++) {
      const lip = p.position.x < HALF.x + deck.out + 0.5;
      p.update(DT, inp({ move: v(-1, 0), jumpPressed: p.grounded && lip, jumpHeld: !p.grounded, attackPressed: !p.grounded && p.velocity.y < 3 }), cs);
    }
    return p;
  };
  const coast = session(() => v(0, 0), 7);
  check('dropped in from a deck and doing nothing, he rides down the wall, across, and three quarters of the way up the far wall; and back, and again, lower each time: a half pipe', coast.on && coast.peaks.length >= 2 && coast.peaks[0] > wallTop * 0.7 && coast.peaks[1] < coast.peaks[0], `${coast.peaks.map((q) => q.toFixed(1)).join(' ')} of ${wallTop.toFixed(1)}`);
  // PUMPING: the stick pushed the way he is going while he is down in the flat of it. He comes up the far wall
  // fast enough to go over its lip; what is seen is that he does, and comes down on the deck still on his shield.
  {
    const p = coastStart();
    let high = 0;
    let bailed = false;
    let onDeck = false;
    for (let i = 0; i < 60 * 5 && !onDeck && p.riding; i++) {
      p.update(DT, inp({ move: Math.abs(p.position.x - HALF.x) < HALF.flat + 2.5 ? v(Math.sign(p.velocity.x) || -1, 0) : v(0, 0) }), cs);
      if (p.moveEvent === 'bail') bailed = true;
      if (p.position.x < HALF.x) high = Math.max(high, p.position.y);
      if (p.grounded && p.position.x < HALF.x - deck.out - 0.3) onDeck = true;
    }
    check('PUMPED (the stick pushed the way he is going, down in the flat of it), he goes right up the far wall, OVER ITS LIP and onto the deck beyond, still on his shield: he does not come off at the lip (coasting, he got three quarters of the way up)', onDeck && high > wallTop - 0.1 && !bailed && p.riding, `${high.toFixed(1)} up, the lip at ${wallTop.toFixed(1)}`);
  }
  check('its walls curve up to sixty degrees, three and a half high; its decks are a little lower than the wall\'s top (the coping), and each has a ramp up to it that he can walk', wallTop > 3.3 && COPING > 0.3 && facetsOf(HALF.radius, HALF.facets, HALF.turn).length === 6 && [-1, 1].every((s) => Math.abs(ground(HALF.x + s * (deck.out + 1.5), HALF.z1 + HALF.way - 0.5) - deck.y * (0.5 / HALF.way)) < 0.1 && deck.y / HALF.way <= 1));
}

// ---- The big ramp ----
{
  const x = (BIG.x0 + BIG.x1) / 2;
  const cap = def.collectibles.find((c) => c.id === 'toy-cap-big-air')!;
  const fly = (jump: boolean): { far: number; high: number; air: number; riding: boolean; top: number; got: boolean } => {
    let got = false;
    const p = rat(x, BIG.top, BIG.tower.z1 - 3);
    let lipJump = false;
    let high = 0;
    let air = 0;
    let far = 0;
    let top = 0;
    let landed = false;
    const k1 = BIG.kick.z0 + BIG.kick.len;
    for (let i = 0; i < 60 * 12 && !landed; i++) {
      const overSlope = p.position.z > BIG.tower.z1 + 0.3;
      const lip = jump && p.riding && p.grounded && !lipJump && k1 - p.position.z < 0.5 && p.position.z > BIG.kick.z0;
      if (lip) lipJump = true;
      p.update(DT, inp({ move: v(0, 1), jumpPressed: lip || (!p.riding && p.grounded && p.position.z > BIG.tower.z1 - 0.6), jumpHeld: lip || !p.grounded, attackPressed: !p.riding && !p.grounded && overSlope }), cs);
      top = Math.max(top, speedOf(p));
      if (Math.hypot(cap.x - p.position.x, cap.y - (p.position.y + TUNING.rat.height / 2), cap.z - p.position.z) < 1.2) got = true;
      if (p.position.z > k1) {
        if (!p.grounded) { air++; high = Math.max(high, p.position.y); }
        else { landed = true; far = p.position.z - k1; }
      }
    }
    const p2 = p;
    return { far, high, air: air / 60, riding: p2.riding, top, got };
  };
  const a = fly(true);
  check('the big ramp: down its roll-in tucked, off its kicker with a jump, he is thrown HIGH and FAR (twelve up, thirty along, two seconds in the air), and lands riding', a.far > 30 && a.high > 10 && a.air > 1.6 && a.riding, `${a.far.toFixed(0)} far, ${a.high.toFixed(1)} high, ${a.air.toFixed(1)}s in the air, top speed ${a.top.toFixed(1)}`);
  const b = fly(false);
  check('its bottle cap is in the air over the gap, where that jump carries him; one who only rolls off the lip passes under it', a.got && !b.got && b.riding, `jump ${a.high.toFixed(1)} high, roll ${b.high.toFixed(1)}; cap at ${cap.y.toFixed(1)}`);
  check('the way up its tower is a ramp he can walk, against the east kerb', BIG.top / BIG.way.len <= 1 && Math.abs(ground((BIG.way.x0 + BIG.way.x1) / 2, BIG.tower.z1 + BIG.way.len / 2) - BIG.top / 2) < 0.1 && ground((BIG.way.x0 + BIG.way.x1) / 2, BIG.tower.z1 - 1) === BIG.top);
}

// ---- The funbox, the quarter pipe ----
{
  const z = (BOX.z0 + BOX.z1) / 2 + 0.7;
  const p = rat(BOX.x1 + BOX.ramp + 4, 0, z);
  getOn(p, v(-1, 0));
  let ground2 = 0;
  for (let i = 0; i < 60 * 5; i++) {
    p.update(DT, inp({ move: p.grinding ? v(0, 0) : v(-1, 0), stowPressed: p.riding && !p.grinding && p.position.x < BOX.x1 + 0.5 && p.position.x > BOX.x1 - 3 && i % 3 === 0 }), cs);
    if (p.grinding && Math.abs(p.position.y - (BOX.high + BOX.rail.high)) < 0.05) ground2++;
  }
  check('the funbox: up its ramp, the grind button on its table, and he grinds the rail down its top to the far end', ground2 > 15 && p.position.x < BOX.x0, `${(ground2 / 60).toFixed(2)}s on the rail; he is at ${p.position.x.toFixed(1)},${p.position.y.toFixed(1)},${p.position.z.toFixed(1)} riding ${p.riding}`);
}
{
  const foot = TOY.halfZ - QUARTER.deck - facetsOf(QUARTER.radius, QUARTER.facets, QUARTER.turn)[QUARTER.facets - 1].d1;
  const p = rat(8, 0, foot - 16);
  getOn(p, v(0, 1));
  let high = 0;
  let back = false;
  for (let i = 0; i < 60 * 6 && !back; i++) {
    // (A push for a second and a half, and then he lets it carry him.)
    p.update(DT, inp({ move: i < 100 ? v(0, 1) : v(0, 0) }), cs);
    high = Math.max(high, p.position.y);
    if (p.velocity.z < -3 && p.grounded && p.position.z < foot) back = true;
  }
  check('the quarter pipe: ridden at, it carries him up its curve and sends him back the way he came, still riding', back && high > 1.2 && p.riding, `up ${high.toFixed(1)}`);
  check('it stands before the south side with a deck behind its lip, its foot on the floor', Math.abs(ground(8, foot - 0.1)) < 0.01 && ground(8, foot + 0.3) > 0 && ground(8, TOY.halfZ - 1) > 3);
}

// ---- The light rails ----
{
  const told: string[] = [];
  let ok = true;
  P.rails.forEach((c, i) => {
    const a = railAt(c, 0.4);
    const p = rat(a.x - a.tx * 2.2, ground(a.x - a.tx * 2.2, a.z - a.tz * 2.2), a.z - a.tz * 2.2);
    let on = 0;
    for (let f = 0; f < 60 * 14; f++) {
      p.update(DT, inp({ move: p.grinding ? v(0, 0) : v(a.tx, a.tz), jumpPressed: f === 0, jumpHeld: !p.riding, attackPressed: !p.riding && !p.grounded && p.velocity.y < 5, stowPressed: p.riding && !p.grinding && on === 0 && f % 3 === 0 }), cs);
      if (p.grinding) on++;
      else if (on > 0) break;
    }
    const end = railAt(c, c.len);
    const d = Math.hypot(p.position.x - end.x, p.position.z - end.z);
    told.push(`rail ${i + 1}: ${(on / 60).toFixed(1)}s, left it ${d.toFixed(1)} from its end`);
    if (on < 60 * 2 || d > 3) ok = false;
  });
  check('both light rails can be got onto from where they begin (skating along it, the grind button) and ridden to their ends', ok && P.rails.length === 2, told.join('; '));
  check('each begins on something he can stand on, and curves', P.rails.every((c) => Math.abs(ground(c.x[0], c.z[0]) - c.y[0]) < 0.4 && [0.2, 0.4, 0.6, 0.8].some((t) => Math.abs(railAt(c, c.len * t).tx - railAt(c, c.len * (t + 0.15)).tx) > 0.25)), P.rails.map((c) => `${ground(c.x[0], c.z[0]).toFixed(2)}/${c.y[0].toFixed(2)}`).join(' '));
}

// ---- Tricks ----
{
  /** Off the big ramp's kicker, doing in the air what `air` says; what happened when he came down. */
  const trick = (air: (t: number, p: PlayerController) => Partial<PlayerInput>): { events: MoveEvent[]; before: number; after: number; riding: boolean; spun: boolean } => {
    const x = (BIG.x0 + BIG.x1) / 2;
    const z0 = BIG.tower.z1 + BIG.rollIn - 6;
    const p = rat(x, ground(x, z0), z0);
    getOn(p, v(0, 1));
    const events: MoveEvent[] = [];
    let t = -1;
    let before = 0;
    let spun = false;
    const k1 = BIG.kick.z0 + BIG.kick.len;
    for (let i = 0; i < 60 * 8; i++) {
      const lip = p.grounded && t < 0 && k1 - p.position.z < 0.4 && p.position.z > BIG.kick.z0;
      const flying = t >= 0 && !p.grounded;
      if (flying) { t += DT; before = speedOf(p); }
      p.update(DT, inp({ move: v(0, 1), jumpPressed: lip, jumpHeld: lip || !p.grounded, ...(flying ? air(t, p) : {}) }), cs);
      if (lip) t = 0;
      if (p.rideSpinProgress >= 0) spun = true;
      if (p.moveEvent) events.push(p.moveEvent);
      if (t > 0.2 && p.grounded) return { events, before, after: speedOf(p), riding: p.riding, spun };
    }
    return { events, before, after: speedOf(p), riding: p.riding, spun };
  };
  const plain = trick(() => ({}));
  check('a jump with nothing done in it is only a landing: no speed for it', plain.riding && plain.events.includes('rideLand') && !plain.events.includes('trick'), `${plain.before.toFixed(1)} to ${plain.after.toFixed(1)}; ${plain.events.join(' ')}`);
  const gain = plain.after - plain.before; // (what the landing itself gives or takes, tricks or none)
  const spin = trick((t) => ({ attackPressed: t > 0.1 && t < 0.14 }));
  check('ATTACK in the air is a SPIN: he and his shield go right round; landed, it is a trick, and speed', spin.spun && spin.riding && spin.events.includes('trick') && spin.after - spin.before > gain + R.trickBoost - 0.6, `${spin.before.toFixed(1)} to ${spin.after.toFixed(1)}`);
  const grab = trick((t) => ({ guardHeld: t > 0.1 && t < 0.1 + R.grabTime + 0.15 }));
  check('GUARD held in the air is a GRAB: held long enough it is a trick, and speed', grab.riding && grab.events.includes('trick') && grab.after - grab.before > gain + R.trickBoost - 0.6, `${grab.before.toFixed(1)} to ${grab.after.toFixed(1)}`);
  const tap = trick((t) => ({ guardHeld: t > 0.1 && t < 0.16 }));
  check('...a tap of it is not', tap.riding && !tap.events.includes('trick'));
  const three = trick((t) => ({ attackPressed: t > 0.08 && t < 0.12, guardHeld: t > 0.1 && t < 0.6, jumpPressed: t > 0.62 && t < 0.66 }));
  check('a spin, a grab and a kickflip in one air are THREE tricks: three times the speed (past his standing top speed, up to his tucked one)', three.riding && three.events.includes('trick') && three.after > Math.min(R.tuckMax, three.before + gain + R.trickBoost * 3) - 0.8 && three.after > R.max + 4, `${three.before.toFixed(1)} to ${three.after.toFixed(1)}`);
  // Landing half way round a spin: he comes off.
  const p = rat(17.5, 0, -30);
  getOn(p, v(0, 1));
  for (let i = 0; i < 60; i++) p.update(DT, inp({ move: v(0, 1) }), cs);
  p.update(DT, inp({ jumpPressed: true, jumpHeld: true }), cs);
  const ev: MoveEvent[] = [];
  for (let i = 0; i < 120 && ev.length === 0; i++) {
    // (Late in a small hop: the spin is not half done when the floor comes.)
    p.update(DT, inp({ jumpHeld: true, attackPressed: p.velocity.y < -5.5 && p.rideSpinProgress < 0 }), cs);
    if (p.grounded && p.moveEvent) ev.push(p.moveEvent);
    if (p.moveEvent === 'bail') ev.push('bail');
  }
  check('down on the ground half way round a spin, he comes off his shield', ev.includes('bail'), ev.join());
}

// ---- The films' rider: the whole line by itself ----
{
  const p = rat((BIG.x0 + BIG.x1) / 2, BIG.top, BIG.tower.z1 - 3);
  const auto = makeToyRide();
  const ev: MoveEvent[] = [];
  let top = 0;
  for (let i = 0; i < 60 * 16 && !(ev.includes('trick') && !p.riding); i++) {
    const a = auto(p);
    p.update(DT, inp({ move: v(a.x, a.z), jumpPressed: a.jumpPressed, jumpHeld: a.jumpHeld, attackPressed: a.attackPressed, guardHeld: a.guardHeld }), cs);
    if (p.moveEvent) ev.push(p.moveEvent);
    top = Math.max(top, speedOf(p));
  }
  check('the films\' rider does the whole line by itself: down the roll-in tucked, off the kicker, a spin, a grab and a kickflip in one air, landed on the bank (and fast for it), and braked to a stop short of the box\'s side', ev.includes('trick') && !ev.includes('bail') && !p.riding && p.position.z < TOY.halfZ - 2 && top > R.max + 6, `top speed ${top.toFixed(1)}; ${[...new Set(ev)].join(' ')}; stopped at z ${p.position.z.toFixed(0)}`);
}

// ---- Bottle caps, kerbs ----
check('six bottle caps, each where a trick takes him', def.collectibles.length === 6 && def.collectibles.every((c) => c.kind === 'cap' && c.y > 2));
check('tall sides stand all round it (a box): there is nowhere to fall off, and a curved wall cannot throw him out', [[0, TOY.halfZ + 0.5], [0, -TOY.halfZ - 0.5], [TOY.half + 0.5, 0], [-TOY.half - 0.5, 0]].every(([x, z]) => ground(x, z) >= TOY.wall));

console.log(failures ? `\n${failures} FAILED` : '\nall passed');
if (failures) process.exit(1);
