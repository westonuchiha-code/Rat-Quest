// THE TOY BOX: the dream's skate park (src/levels/toybox.ts), and what the shield can do in it.
// The owner, 2026-11-17: "I want this whole wacky Pomo area to feel like a big playground ... a lot of areas where you
// can just like almost skate around on the shield ... like a half pipe ... things for people to jump off and grind on
// and curved parts and different kinds of ramps and things that send you up high ... different things you can do while
// you're in the air we already have the kick flip so we could do a couple more things like that." And of the tuck:
// "the leaning forward needs to have more of an effect on his momentum ... this is a video game".
// Holds, with the real controller: that he gets on his shield anywhere here and PUSHES along the flat; that the half
// pipe carries him from wall to wall; that the big ramp throws him high and far; that the funbox's rail, the quarter
// pipe and both light rails can be ridden; the spin and the grab, and that tricks landed are speed; and its doors.
import { FEELS } from '../src/data/feel';
import './../src/core/colorSetup';
import * as THREE from 'three';
import { PlayerController, type PlayerInput, type MoveEvent } from '../src/player/controller';
import { topAt, type Aabb } from '../src/world/collision';
import { buildChamber } from '../src/world/chamber';
import { BOWL, SPINE, LAUNCHER, toyBox, toyBoxPlan, makeToyRide, TOY, HALF, BIG, BOX, QUARTER, COPING, halfDeck, facetsOf } from '../src/levels/toybox';
import { garden } from '../src/levels/garden';
import { TEST_ROOMS, levelById } from '../src/levels/levels';
import { TUNING } from '../src/data/tuning';
import { railAt, RAIL_TUBE } from '../src/world/rails';
import { fallCost } from '../src/player/standing';
import { LEVELS, ARCHIVE } from '../src/levels/levels';

const DT = 1 / 60;
const R = TUNING.ride;
let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}
const def = toyBox();
const P = toyBoxPlan();
// (What is solid is taken as THE GAME takes it, from the chamber it builds: not made here from the level's boxes. The
// lip of the pipe was tested with boxes made here, which had its mark, and worked; the game's had not, and did not.)
const cs: Aabb[] = buildChamber({ solids: def.solids, pit: def.pit, water: def.water ?? [], decor: [], movers: def.movers }).colliders;
const inp = (o: Partial<PlayerInput>): PlayerInput => ({ move: new THREE.Vector3(), run: true, jumpPressed: false, jumpHeld: false, attackPressed: false, dodgeHeld: false, dodgePressed: false, guardHeld: false, stowPressed: false, ...o } as PlayerInput);
const v = (x: number, z: number): THREE.Vector3 => new THREE.Vector3(x, 0, z);
const ground = (x: number, z: number): number => Math.max(-Infinity, ...cs.filter((b) => x >= b.min.x && x <= b.max.x && z >= b.min.z && z <= b.max.z).map((b) => topAt(b, x, z)));
const speedOf = (p: PlayerController): number => Math.hypot(p.velocity.x, p.velocity.z);
/** A rat at a place, in this level (a skate park, with its rails), settled on the ground. */
function rat(x: number, y: number, z: number): PlayerController {
  const p = new PlayerController(new THREE.Vector3(x, y + 0.01, z));
  p.feel = FEELS.dream;
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
  {
    // FROM A STANDSTILL: on his shield where he stands (a jump straight up, ATTACK), then the stick forward.
    const q = rat(17.5, 0, -30);
    q.update(DT, inp({ jumpPressed: true, jumpHeld: true }), cs);
    for (let i = 0; i < 80 && !(q.riding && q.grounded); i++) q.update(DT, inp({ jumpHeld: true, attackPressed: !q.riding && q.velocity.y < 5 }), cs);
    const stood = q.riding && speedOf(q) < 0.5;
    for (let i = 0; i < 120; i++) q.update(DT, inp({ move: v(0, 1) }), cs);
    check('from a STANDSTILL on his shield, the stick forward gets him going: he is not stepped off it before the push has taken hold', stood && q.riding && speedOf(q) > 6, `${speedOf(q).toFixed(1)} after two seconds`);
  }
  check('...and the stick let go, he rolls on, slowing', speedOf(p) < pushed - 1 && speedOf(p) > 4, `${speedOf(p).toFixed(1)}`);
  const q = new PlayerController(new THREE.Vector3(0, 0.01, -10));
  q.feel = FEELS.dream;
  for (let i = 0; i < 10; i++) q.update(DT, inp({}), cs);
  q.update(DT, inp({ jumpPressed: true, jumpHeld: true }), cs);
  for (let i = 0; i < 40; i++) q.update(DT, inp({ jumpHeld: true, attackPressed: q.velocity.y < 5 }), cs);
  check('(one who is NOT in a skate park does not: over flat ground his air attack is the dive)', !q.riding);
}

// ---- The half pipe ----
{
  const deck = halfDeck();
  const wallTop = deck.y + COPING;
  /**
   * DROPPED IN: on his shield on the east deck (a jump and ATTACK: it is a skate park), a push toward the lip, and over
   * it. He rolls in off the lip and down the wall. (At first the drop was a running jump out over the wall: with the
   * decks flush that carries him clear over the wall to land on the flat, and a flat landing keeps none of his fall.)
   */
  const dropIn = (dt: number): PlayerController => {
    const p = rat(HALF.x + deck.out + 3, deck.y, 0);
    p.update(dt, inp({ move: v(-1, 0), jumpPressed: true, jumpHeld: true }), cs);
    for (let i = 0; i < 4 / dt && !(p.riding && p.position.x < HALF.x + deck.out - 0.1); i++) p.update(dt, inp({ move: v(-1, 0), jumpHeld: !p.riding, attackPressed: !p.riding && !p.grounded && p.velocity.y < 5 }), cs);
    return p;
  };
  /** Dropped in; then `stick` each step. The height he got to on each crossing. */
  const session = (stick: (p: PlayerController) => THREE.Vector3, secs: number): { peaks: number[]; p: PlayerController; on: boolean; events: MoveEvent[] } => {
    const p = dropIn(DT);
    const on = p.riding;
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
  const coastStart = (): PlayerController => dropIn(DT);
  const coast = session(() => v(0, 0), 7);
  check('dropped in from a deck and doing nothing, he rides down the wall, across, and three quarters of the way up the far wall; and back, and again, lower each time: a half pipe', coast.on && coast.peaks.length >= 2 && coast.peaks[0] > wallTop * 0.7 && coast.peaks[1] < coast.peaks[0], `${coast.peaks.map((q) => q.toFixed(1)).join(' ')} of ${wallTop.toFixed(1)}`);
  // THE LIP (the owner, 2026-11-17: "when riding up a half pipe ramp you should disconnect up at the top like in Tony
  // Hawk's Pro Skater and come back down into the pipe"). `stick`: what he holds. What he does at the far lip.
  const atTheLip = (dt: number, stick: (p: PlayerController) => THREE.Vector3): { high: number; back: boolean; bailed: boolean; out: boolean; air: number; riding: boolean } => {
    const p = dropIn(dt);
    let high = 0;
    let bailed = false;
    let flew = 0;
    let back = false;
    let out = false;
    for (let i = 0; i < 6 / dt && !back && p.riding; i++) {
      p.update(dt, inp({ move: stick(p) }), cs);
      if (p.moveEvent === 'bail') bailed = true;
      if (p.position.x < HALF.x - HALF.flat) {
        high = Math.max(high, p.position.y);
        if (!p.grounded && p.position.y > wallTop) flew += dt;
        if (p.position.x < HALF.x - deck.out - 0.2 && p.grounded) out = true;
        if (flew > 0 && p.grounded && p.position.x > HALF.x - deck.out) back = true;
      }
    }
    return { high, back, bailed, out, air: flew, riding: p.riding };
  };
  {
    const a = atTheLip(DT, (p) => (Math.abs(p.position.x - HALF.x) < HALF.flat + 2.5 ? v(Math.sign(p.velocity.x) || -1, 0) : v(0, 0)));
    check('PUMPED (the stick pushed the way he is going, down in the flat of it), at the far lip he goes STRAIGHT UP off it, a good way over it, and comes back down INTO the pipe on the wall he left, still riding: not out onto the deck, and not thrown off', a.back && !a.out && !a.bailed && a.riding && a.high > wallTop + 1 && a.air > 0.4, `${a.high.toFixed(1)} up (the lip is at ${wallTop.toFixed(1)}), ${a.air.toFixed(2)}s over it`);
    const b = atTheLip(DT, () => v(-1, 0));
    check('...and the same with the stick held toward the far wall the whole time, higher', b.back && !b.out && !b.bailed && b.riding && b.high >= a.high - 0.2, `${b.high.toFixed(1)} up, ${b.air.toFixed(2)}s`);
  }
  // AT EVERY SPEED. (Sent at the far wall from the flat. At some speeds the wall let go of him a moment before its lip,
  // and he went out over the deck instead of up: found by a film of the real game, at 13; in a sweep, at 16.)
  {
    const told: string[] = [];
    let ok = true;
    for (let speed = 12; speed <= 30; speed += 0.5) for (const fps of [60, 30]) {
      const dt = 1 / fps;
      const p = rat(HALF.x, 0, 0);
      p.devRide();
      p.velocity.set(-speed, 0, 0);
      let high = 0;
      let back = false;
      let sunk = 0;
      for (let i = 0; i < 8 / dt && p.riding && !back; i++) {
        p.update(dt, inp({}), cs);
        high = Math.max(high, p.position.y);
        sunk = Math.max(sunk, ground(p.position.x, p.position.z) - p.position.y);
        if (high > wallTop + 0.5 && p.grounded) back = p.position.x > HALF.x - deck.out;
      }
      if (!back || !p.riding || sunk > 0.05 || high < wallTop + 1) { ok = false; told.push(`${speed} at ${fps} fps: ${high.toFixed(1)} up${back ? '' : ', NOT BACK'}${sunk > 0.05 ? ', in the wall' : ''}`); }
    }
    check('sent at the far wall at EVERY speed from 12 to 30, at sixty frames a second and at thirty: he goes up off its lip and comes back down into the pipe, riding', ok, told.join('; '));
  }
  // AT A PHONE'S FRAME RATE. (The owner, 2026-11-17: "it's okay going down but then when you're trying to go back up the
  // other side your character just like phases through the wall". At thirty frames a second and under, a rider holding
  // the stick toward the far wall was put INSIDE it near its top, and thrown off. Every test here had run at sixty.)
  {
    const told: string[] = [];
    let ok = true;
    for (const fps of [60, 30, 24, 20]) {
      const dt = 1 / fps;
      const p = dropIn(dt);
      let sunk = 0;
      for (let i = 0; i < fps * 3 && p.riding; i++) {
        p.update(dt, inp({ move: v(-1, 0) }), cs);
        sunk = Math.max(sunk, ground(p.position.x, p.position.z) - p.position.y);
      }
      const a = atTheLip(dt, () => v(-1, 0));
      told.push(`${fps}: ${sunk.toFixed(2)} in, ${a.high.toFixed(1)} up${a.bailed ? ', THROWN OFF' : ''}${a.back ? '' : ', NOT BACK'}`);
      if (sunk > 0.05 || a.bailed || !a.back || a.out || !a.riding) ok = false;
    }
    check('at thirty frames a second, at twenty-four, at twenty (a phone\'s), as at sixty: holding the stick toward the far wall he rides up it, off its lip and back down into the pipe, never inside the wall, never thrown off', ok, told.join('; '));
  }
  // THE LIP IS AN EDGE TO GRIND ("and they should also count as an edge that you can grind on").
  {
    const told: string[] = [];
    let ok = true;
    for (const side of [1, -1]) {
      // Along the deck beside its lip, skating north; the grind button.
      const p = rat(HALF.x + side * (deck.out + 0.6), deck.y, HALF.z1 - 3);
      getOn(p, v(0, -1));
      let on = 0;
      let lipX = 0;
      for (let i = 0; i < 60 * 6; i++) {
        p.update(DT, inp({ move: p.grinding ? v(0, 0) : v(0, -1), stowPressed: p.riding && !p.grinding && on === 0 && i % 3 === 0 }), cs);
        if (p.grinding) { on++; lipX = p.position.x; }
        else if (on > 0) break;
      }
      told.push(`${side > 0 ? 'east' : 'west'} lip: ${(on / 60).toFixed(1)}s, at x ${lipX.toFixed(2)} (the lip is at ${(HALF.x + side * deck.out).toFixed(2)})`);
      if (on < 45 || Math.abs(lipX - (HALF.x + side * deck.out)) > 0.15) ok = false;
    }
    check('the lip of each wall is an edge he can GRIND: skating along the deck beside it, the grind button puts his shield on the lip and it carries him along it', ok, told.join('; '));
    // And from INSIDE the pipe: carving along high on the wall, the grind button takes him up onto the lip.
    const p = rat(HALF.x + deck.out - 0.5, wallTop - 0.75, HALF.z1 - 3);
    p.devRide();
    p.velocity.set(0, 0, -9);
    let on = 0;
    for (let i = 0; i < 60 * 3; i++) {
      p.update(DT, inp({ move: v(0, 0), stowPressed: !p.grinding && on === 0 && i % 2 === 0 }), cs);
      if (p.grinding) on++;
    }
    check('...and from inside the pipe: going along high on the wall, within reach of the lip, the grind button takes him up onto it', on > 30, `${(on / 60).toFixed(1)}s`);
  }
  check('the top of each wall of the pipe, and of the quarter pipe, is marked as a lip IN THE GAME\'S OWN SOLIDS (its top two facets: six in all; and the bowl\'s four walls, eight more)', cs.filter((b) => b.vert && b.ramp).length === 14);
  check('its walls curve up to sixty degrees, three and a half high; its decks are FLUSH with the walls\' tops ("the tops of the half pipes should be more flush"), and each has a ramp up to it that he can walk', wallTop > 3.3 && COPING === 0 && [-1, 1].every((sd) => Math.abs(ground(HALF.x + sd * (deck.out + 0.05), 0) - ground(HALF.x + sd * (deck.out - 0.02), 0)) < 0.05) && facetsOf(HALF.radius, HALF.facets, HALF.turn).length === 6 && [-1, 1].every((s) => Math.abs(ground(HALF.x + s * (deck.out + 1.5), HALF.z1 + HALF.way - 0.5) - deck.y * (0.5 / HALF.way)) < 0.1 && deck.y / HALF.way <= 1));
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
  check('a light rail is drawn UNDER the line he rides (a thin tube, its top a hair below his shield): his shield sits on it, not in it', RAIL_TUBE.r <= 0.16 && RAIL_TUBE.under > 0 && RAIL_TUBE.under < 0.1);
  check('each begins on something he can stand on, and curves', P.rails.every((c) => Math.abs(ground(c.x[0], c.z[0]) - c.y[0]) < 0.4 && [0.2, 0.4, 0.6, 0.8].some((t) => Math.abs(railAt(c, c.len * t).tx - railAt(c, c.len * (t + 0.15)).tx) > 0.25)), P.rails.map((c) => `${ground(c.x[0], c.z[0]).toFixed(2)}/${c.y[0].toFixed(2)}`).join(' '));
}

// ---- The sword, on the shield (the owner, 2026-11-17: "you should be able to swing your sword on attack while you're
// riding your shield") ----
{
  const p = rat(17.5, 0, -30);
  getOn(p, v(0, 1));
  for (let i = 0; i < 90; i++) p.update(DT, inp({ move: v(0, 1) }), cs);
  const before = speedOf(p);
  const heading = Math.atan2(p.velocity.x, p.velocity.z);
  const id = p.swingId;
  let hit = false;
  p.update(DT, inp({ move: v(0, 1), attackPressed: true }), cs);
  for (let i = 0; i < 40; i++) {
    p.update(DT, inp({ move: v(0, 1) }), cs);
    hit ||= p.attackActive;
  }
  check('ATTACK on his shield is a swing of the sword: it can hit, as a swing does; he rides on at the speed he had, the way he was going, still on his shield', p.swingId === id + 1 && hit && p.riding && speedOf(p) >= before - 0.3 && Math.abs(Math.atan2(p.velocity.x, p.velocity.z) - heading) < 0.05 && p.state === 'ride', `${before.toFixed(1)} then ${speedOf(p).toFixed(1)}`);
  // In the air on the shield: a swing too, not the dive, and not a spin.
  p.update(DT, inp({ move: v(0, 1), jumpPressed: true, jumpHeld: true }), cs);
  for (let i = 0; i < 6; i++) p.update(DT, inp({ jumpHeld: true }), cs);
  const id2 = p.swingId;
  p.update(DT, inp({ jumpHeld: true, attackPressed: true }), cs);
  let hit2 = false;
  let spun = false;
  for (let i = 0; i < 50 && !p.grounded; i++) {
    p.update(DT, inp({ jumpHeld: true }), cs);
    hit2 ||= p.attackActive;
    spun ||= p.rideSpinProgress >= 0;
  }
  check('...and in the air on it: a swing, not the dive and not a spin; he comes down riding', p.swingId === id2 + 1 && hit2 && !spun && p.riding && p.state === 'ride');
}

// ---- THE BOWL AND THE SPINE (2026-11-17: "more to ride"). The game's own solids, the real controller, at sixty frames
// a second and at thirty. ----
{
  const bf = facetsOf(BOWL.radius, BOWL.facets, BOWL.turn);
  const top = bf[bf.length - 1].h1;
  const inner = BOWL.flat + bf[bf.length - 1].d1;
  check('the bowl: a square floor, a curved wall on each of its four sides rising to one height, a deck all round level with the lips, its corners filled, and a ramp up to the deck', [[1, 0], [-1, 0], [0, 1], [0, -1]].every(([sx, sz]) => Math.abs(ground(BOWL.x + sx * (inner - 0.01), BOWL.z + sz * (inner - 0.01)) - top) < 0.05 && Math.abs(ground(BOWL.x + sx * (inner + 1), BOWL.z + sz * (inner + 1)) - top) < 1e-6) && ground(BOWL.x, BOWL.z) === 0 && [[1, 1], [1, -1], [-1, 1], [-1, -1]].every(([sx, sz]) => Math.abs(ground(BOWL.x + sx * (BOWL.flat + 1), BOWL.z + sz * (BOWL.flat + 1)) - top) < 1e-6) && Math.abs(ground((BOWL.way.x0 + BOWL.way.x1) / 2, BOWL.z - inner - BOWL.deck - 0.01) - top) < 0.05 && ground((BOWL.way.x0 + BOWL.way.x1) / 2, BOWL.z - inner - BOWL.deck - BOWL.way.len + 0.01) < 0.05, `walls ${top.toFixed(2)} high`);
  /** Dropped in off one deck toward the far wall, pumping in the flat: what he does at that wall's lip. */
  const across = (dt: number, dx: number, dz: number): { up: number; back: boolean; bailed: boolean; riding: boolean } => {
    // (Dropped in as into the half pipe: onto his shield on the deck, the stick held until he is over the lip.)
    const p = rat(BOWL.x - dx * (inner + 1.6), top, BOWL.z - dz * (inner + 1.6));
    p.update(dt, inp({ move: v(dx, dz), jumpPressed: true, jumpHeld: true }), cs);
    for (let i = 0; i < 4 / dt && !(p.riding && (p.position.x - BOWL.x) * dx + (p.position.z - BOWL.z) * dz > -(inner - 0.1)); i++) p.update(dt, inp({ move: v(dx, dz), jumpHeld: !p.riding, attackPressed: !p.riding && !p.grounded && p.velocity.y < 5 }), cs);
    let up = 0;
    let flew = false;
    let back = false;
    let bailed = false;
    for (let i = 0; i < 7 / dt && !back && p.riding; i++) {
      const along = (p.position.x - BOWL.x) * dx + (p.position.z - BOWL.z) * dz;
      const going = p.velocity.x * dx + p.velocity.z * dz;
      p.update(dt, inp({ move: Math.abs(along) < BOWL.flat + 1.5 ? v(Math.sign(going || 1) * dx, Math.sign(going || 1) * dz) : v(0, 0) }), cs);
      if (p.moveEvent === 'bail') bailed = true;
      if (along > BOWL.flat) {
        up = Math.max(up, p.position.y - top);
        if (!p.grounded && p.position.y > top + 0.5) flew = true;
        if (flew && p.grounded && along < inner + 0.1) back = true;
      }
    }
    return { up, back, bailed, riding: p.riding };
  };
  const walls: Array<[number, number, string]> = [[1, 0, 'east'], [-1, 0, 'west'], [0, 1, 'south'], [0, -1, 'north']];
  const runs = walls.flatMap(([dx, dz, name]) => [1 / 60, 1 / 30].map((dt) => ({ name, dt, r: across(dt, dx, dz) })));
  const bad = runs.filter(({ r }) => !(r.up > 1 && r.back && !r.bailed && r.riding));
  check('dropped in off a deck and pumped across the floor, at EACH of its four walls he goes up off the lip, more than his own height over it on the first pass, and comes back down into the bowl, still riding (sixty frames a second and thirty)', bad.length === 0, runs.map(({ name, dt, r }) => `${name} ${Math.round(1 / dt)}: ${r.up.toFixed(1)} up${r.back ? '' : ', not back'}${r.bailed ? ', BAILED' : ''}`).join('; '));

  // The spine.
  const sf = facetsOf(SPINE.radius, SPINE.facets, SPINE.turn);
  const sOut = sf[sf.length - 1].d1;
  const sTop = sf[sf.length - 1].h1;
  const zMid = (SPINE.z0 + SPINE.z1) / 2;
  check('the spine: two curved walls back to back, a ridge and no deck: as high at its middle as its walls, and floor a little way either side', Math.abs(ground(SPINE.x - 0.01, zMid) - sTop) < 0.05 && Math.abs(ground(SPINE.x + 0.01, zMid) - sTop) < 0.05 && ground(SPINE.x - sOut - 0.5, zMid) === 0 && ground(SPINE.x + sOut + 0.5, zMid) === 0, `${sTop.toFixed(2)} high`);
  const over = (dt: number, dir: 1 | -1): { over: boolean; high: number; bailed: boolean; riding: boolean; landed: number } => {
    const p = rat(SPINE.x - dir * (sOut + 9), 0, zMid);
    getOn(p, v(dir, 0));
    let high = 0;
    let bailed = false;
    let landed = NaN;
    let crossed = false;
    for (let i = 0; i < 5 / dt && p.riding && Number.isNaN(landed); i++) {
      p.update(dt, inp({ move: v(dir, 0) }), cs);
      if (p.moveEvent === 'bail') bailed = true;
      high = Math.max(high, p.position.y);
      if ((p.position.x - SPINE.x) * dir > 0.3) crossed = true;
      if (crossed && p.grounded) landed = (p.position.x - SPINE.x) * dir;
    }
    return { over: crossed, high, bailed, riding: p.riding, landed };
  };
  const overs = ([1, -1] as const).flatMap((dir) => [1 / 60, 1 / 30].map((dt) => ({ dir, dt, r: over(dt, dir) })));
  const badOver = overs.filter(({ r }) => !(r.over && r.high > sTop + 0.5 && !r.bailed && r.riding && r.landed > 0));
  check('ridden at with the stick forward, he goes up one side, OVER the ridge through the air, and comes down beyond it still riding: from either side, at sixty frames a second and thirty', badOver.length === 0, overs.map(({ dir, dt, r }) => `${dir > 0 ? 'eastward' : 'westward'} ${Math.round(1 / dt)}: ${r.high.toFixed(1)} high, down ${Number.isNaN(r.landed) ? 'nowhere' : r.landed.toFixed(1) + ' beyond'}${r.bailed ? ', BAILED' : ''}`).join('; '));
}

// ---- THE LAUNCHER ----
{
  const z = (LAUNCHER.z0 + LAUNCHER.z1) / 2;
  const tip = LAUNCHER.x0 + LAUNCHER.len;
  /** Come at at a given speed (0: from a standing push-off, twelve back). What it does with him, and whether he then rides on to a stop. */
  const at = (speed: number, dt: number): { up: number; far: number; riding: boolean; bailed: boolean } => {
    const p = rat(LAUNCHER.x0 - (speed ? 3 : 12), 0, z);
    if (speed) {
      p.devRide();
      p.velocity.set(speed, 0, 0);
    } else getOn(p, v(1, 0));
    let high = 0;
    let bailed = false;
    let flew = false;
    let far = 0;
    for (let i = 0; i < 8 / dt && p.riding; i++) {
      // (The stick forward until he is in the air; then let go, and braked once he is down.)
      p.update(dt, inp({ move: far ? v(-1, 0) : flew ? v(0, 0) : v(1, 0) }), cs);
      // (At his tucked top speed there is not room in any park to brake from: what is asked of that run is that he
      // LANDS riding. Slower, that he can brake to a stop in the lane as well.)
      if (p.moveEvent === 'bail' && !(speed >= 30 && far)) bailed = true;
      high = Math.max(high, p.position.y);
      if (!p.grounded && p.position.x > tip) flew = true;
      if (flew && p.grounded && !far) far = p.position.x - tip;
    }
    return { up: high - LAUNCHER.rise, far, riding: far > 0, bailed };
  };
  const runs = [0, 16, 24, 30].flatMap((sp) => [1 / 60, 1 / 30].map((dt) => ({ sp, r: at(sp, dt) })));
  check('the launcher: from a standing push-off, at his standing top speed and tucked, it throws him off its tip and he lands riding, inside the park (and, short of his tucked top speed, can brake to a stop in the lane beyond): higher and further the faster he comes (sixty frames a second and thirty)', runs.every(({ r }) => r.riding && !r.bailed && r.far > 3) && runs[6].r.up > runs[2].r.up + 2 && runs[6].r.far > runs[2].r.far + 10, runs.filter((_, i) => i % 2 === 0).map(({ sp, r }) => `${sp || 'push-off'}: ${r.up.toFixed(1)} over its tip, ${r.far.toFixed(1)} on${r.bailed ? ', BAILED' : ''}`).join('; '));
}

// ---- Tricks ----
{
  /** Off the big ramp's kicker, doing in the air what `air` says; what happened when he came down. */
  const trick = (air: (t: number, p: PlayerController) => Partial<PlayerInput>): { events: MoveEvent[]; before: number; after: number; riding: boolean; spun: boolean } => {
    const x = (BIG.x0 + BIG.x1) / 2;
    // (Far enough up the roll-in that the hop onto his shield, which is higher and longer in the dream, comes down
    // on the slope and not past its foot.)
    const z0 = BIG.tower.z1 + BIG.rollIn - 13;
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
  const spin = trick((t) => ({ dodgePressed: t > 0.1 && t < 0.14 }));
  check('the ROLL button in the air is a SPIN: he and his shield go right round; landed, it is a trick, and speed', spin.spun && spin.riding && spin.events.includes('trick') && spin.after - spin.before > gain + R.trickBoost - 0.6, `${spin.before.toFixed(1)} to ${spin.after.toFixed(1)}`);
  const grab = trick((t) => ({ guardHeld: t > 0.1 && t < 0.1 + R.grabTime + 0.15 }));
  check('GUARD held in the air is a GRAB: held long enough it is a trick, and speed', grab.riding && grab.events.includes('trick') && grab.after - grab.before > gain + R.trickBoost - 0.6, `${grab.before.toFixed(1)} to ${grab.after.toFixed(1)}`);
  const tap = trick((t) => ({ guardHeld: t > 0.1 && t < 0.16 }));
  check('...a tap of it is not', tap.riding && !tap.events.includes('trick'));
  const three = trick((t) => ({ dodgePressed: t > 0.08 && t < 0.12, guardHeld: t > 0.1 && t < 0.6, jumpPressed: t > 0.62 && t < 0.66 }));
  check('a spin, a grab and a kickflip in one air are THREE tricks: three times the speed (past his standing top speed, up to his tucked one)', three.riding && three.events.includes('trick') && three.after > Math.min(R.tuckMax, three.before + gain + R.trickBoost * 3) - 0.8 && three.after > R.max + 4, `${three.before.toFixed(1)} to ${three.after.toFixed(1)}`);
  // Landing half way round a spin: he comes off.
  const p = rat(17.5, 0, -30);
  getOn(p, v(0, 1));
  for (let i = 0; i < 60; i++) p.update(DT, inp({ move: v(0, 1) }), cs);
  p.update(DT, inp({ jumpPressed: true, jumpHeld: true }), cs);
  const ev: MoveEvent[] = [];
  for (let i = 0; i < 120 && ev.length === 0; i++) {
    // (Late in a small hop: the spin is not half done when the floor comes.)
    p.update(DT, inp({ jumpHeld: true, dodgePressed: p.velocity.y < -5.5 && p.rideSpinProgress < 0 }), cs);
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
    p.update(DT, inp({ move: v(a.x, a.z), jumpPressed: a.jumpPressed, jumpHeld: a.jumpHeld, attackPressed: a.attackPressed, guardHeld: a.guardHeld, dodgePressed: a.dodgePressed }), cs);
    if (p.moveEvent) ev.push(p.moveEvent);
    top = Math.max(top, speedOf(p));
  }
  check('the films\' rider does the whole line by itself: down the roll-in tucked, off the kicker, a spin, a grab and a kickflip in one air, landed on the bank (and fast for it), and braked to a stop short of the box\'s side', ev.includes('trick') && !ev.includes('bail') && !p.riding && p.position.z < TOY.halfZ - 2 && top > R.max + 6, `top speed ${top.toFixed(1)}; ${[...new Set(ev)].join(' ')}; stopped at z ${p.position.z.toFixed(0)}`);
}

// ---- A fall costs nothing in the dream ----
// (The owner, 2026-11-17: "adding fall damage to this area really just takes away from the fun there's no upside to it,
// so maybe we could just make it a flag for the wacky Pomo levels in general and any downhill levels".)
{
  const all = [...LEVELS, ...ARCHIVE, ...TEST_ROOMS];
  const dream = all.filter((l) => l.look === 'dream');
  check('in every dream level (the Toy Box, the Milky Way, the Big Dipper) a fall costs NOTHING: he is put back, and that is all', dream.length === 3 && dream.every((l) => l.fallFree === true && fallCost(l, false) === 0));
  const costly = all.filter((l) => l.fallBack || l.fallDepth !== undefined).filter((l) => !l.fallFree).map((l) => l.id);
  check('in the waking world a fall he is put back from still costs a heart (the Hollows, the Keep), but for one in the Ember Helm', costly.includes('hollows') && costly.includes('keep') && costly.every((id) => fallCost(levelById(id)!, false) === 1 && fallCost(levelById(id)!, true) === 0), costly.join(' '));
}

// ---- Bottle caps, kerbs ----
check('six bottle caps, each where a trick takes him', def.collectibles.length === 6 && def.collectibles.every((c) => c.kind === 'cap' && c.y > 2));
check('tall sides stand all round it (a box): there is nowhere to fall off, and a curved wall cannot throw him out', [[0, TOY.halfZ + 0.5], [0, -TOY.halfZ - 0.5], [TOY.half + 0.5, 0], [-TOY.half - 0.5, 0]].every(([x, z]) => ground(x, z) >= TOY.wall));

console.log(failures ? `\n${failures} FAILED` : '\nall passed');
if (failures) process.exit(1);
