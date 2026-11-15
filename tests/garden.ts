// The Move Garden: a test room for feeling the jump numbers (src/levels/garden.ts).
//
// What a board says must be so: each ledge is as high as its board says, and (as the game is) the move on the board
// is what gets him onto it, and the move before it does not. Each chimney is as wide and as high as its board says,
// and is climbed by kicks and by nothing else. Then the same room is played under each of the jump sets, to see what
// each of them changes: that table is what the sets are for.
import './../src/core/colorSetup';
import * as THREE from 'three';
import { PlayerController, PlayerInput } from '../src/player/controller';
import { makeAabb, aabbOf } from '../src/world/collision';
import { atDoor } from '../src/world/rooms';
import { MAX_WALK_SLOPE } from '../src/world/layout';
import { garden, GARDEN, STEPS, STEP_SIZE, CHIMNEYS, CHIMNEY_WALL, chimneyFaces, POLE, STRIP, RUN, type Chimney, type Step } from '../src/levels/garden';
import { ALL_LEVELS, ARCHIVE, LEVELS, TEST_ROOMS, levelById } from '../src/levels/levels';
import { buildChamber } from '../src/world/chamber';
import { JUMP_SETS, Tweaks, readTweak, defaultTweak, TWEAKS, type TweakSet } from '../src/core/tweaks';
import { TUNING } from '../src/data/tuning';

const DT = 1 / 60;
let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}
const def = garden();
const cs = def.solids.map((b) => makeAabb((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, (b.z0 + b.z1) / 2, b.x1 - b.x0, b.y1 - b.y0, b.z1 - b.z0));
const inp = (o: Partial<PlayerInput>): PlayerInput => ({ move: new THREE.Vector3(), run: true, jumpPressed: false, jumpHeld: false, attackPressed: false, dodgeHeld: false, dodgePressed: false, guardHeld: false, stowPressed: false, ...o } as PlayerInput);
const W = -GARDEN.halfX;
const WEST = new THREE.Vector3(-1, 0, 0);
const NORTH = new THREE.Vector3(0, 0, -1);

// ---- It is a test room, and no part of the game ----
{
  check('the garden is a test room: found by its name, and in none of the game\'s lists or counts', levelById('garden')?.id === 'garden' && TEST_ROOMS.some((l) => l.id === 'garden') && ![...LEVELS, ...ARCHIVE, ...ALL_LEVELS].some((l) => l.id === 'garden'));
  check('there is nothing in it to pick up, fight or win, and its door leads back to the Club', def.collectibles.length === 0 && def.enemies.length === 0 && def.goals.length === 0 && !def.wedges && def.returnTo === 'hub' && !!levelById('hub')?.hub);
  let built = true;
  try {
    buildChamber({ solids: def.solids, pit: def.pit, water: def.water, decor: def.decor, movers: [] } as never);
  } catch (e) {
    built = false;
    console.log(String(e));
  }
  check('it builds (its boards and rulers too)', built);
}

// ---- What a board says is what is there ----
{
  const signs = def.decor.filter((d) => d.kind === 'sign');
  const rulers = def.decor.filter((d) => d.kind === 'ruler');
  for (const s of STEPS) {
    const box = def.solids.find((b) => b.x0 === W && Math.abs((b.z0 + b.z1) / 2 - s.z) < 1e-6 && b.y1 === s.top);
    const sign = signs.find((d) => Math.abs(d.z - s.z) < 1e-6 && Math.abs(d.x - (W + STEP_SIZE)) < 1e-6);
    check(`the step ${s.top} up: it is that high, 2.6 square and joined to the wall, and its board (on its own front, under its top) says so`, !!box && Math.abs(box.x1 - box.x0 - STEP_SIZE) < 1e-6 && Math.abs(box.z1 - box.z0 - STEP_SIZE) < 1e-6 && !!sign && sign.lines[0] === `${s.top} UP` && sign.lines[1] === s.move && sign.y + sign.h / 2 < s.top && sign.y - sign.h / 2 > 0);
  }
  check('the steps are five clear of one another, and ten or more from the room\'s other walls and from the chimneys', STEPS.every((s, i) => i === 0 || Math.abs(STEPS[i - 1].z - s.z - STEP_SIZE - 5) < 1e-6) && GARDEN.halfZ - (STEPS[0].z + STEP_SIZE / 2) >= 10 && Math.min(...STEPS.map((s) => s.z - STEP_SIZE / 2)) - chimneyFaces(CHIMNEYS[0]).z1 >= 6.5);
  for (const c of CHIMNEYS) {
    const f = chimneyFaces(c);
    const west = def.solids.find((b) => b.x0 === c.x && b.x1 === f.west && b.y1 === c.westTop && b.z0 === f.z0);
    const east = def.solids.find((b) => b.x0 === f.east && Math.abs(b.x1 - (f.east + CHIMNEY_WALL)) < 1e-6 && b.y1 === c.eastTop && b.z0 === f.z0);
    const sign = signs.find((d) => d.lines === c.lines);
    const ruler = rulers.find((d) => !d.flat && !d.pole && Math.abs(d.x - f.mid) < 1e-6 && d.z === -GARDEN.halfZ);
    const says = c.lines.join(' ');
    const lowTop = Math.min(c.westTop, c.eastTop);
    check(`the chimney "${c.lines[0]}": two walls ${c.gap} apart, the room's wall behind with a ruler on it, and its board says how wide and how high`, !!west && !!east && !!sign && !!ruler && ruler.width < c.gap && ruler.length >= Math.max(c.westTop, c.eastTop) && (c.id === 'one' ? says.includes(`${lowTop} UP`) : says.includes(`${c.gap} WIDE`) && says.includes(`${lowTop} UP`)), `${(f.east - f.west).toFixed(1)} apart`);
  }
  // Whatever he could kick between is joined on, or further apart than a kick carries him.
  const outer = CHIMNEYS.map((c) => ({ x0: c.x, x1: chimneyFaces(c).east + CHIMNEY_WALL }));
  // (How far a kick carries him before he is back down to where he kicked from: twice its rise time, at its push.)
  const carry = (2 * TUNING.moves.wallKickUp / TUNING.physics.gravity) * TUNING.moves.wallKickPush;
  check('the chimneys are further apart than a kick carries him, the first is joined to the west wall, and the last is as far from the east wall', outer[0].x0 === W && outer.every((o, i) => i === 0 || o.x0 - outer[i - 1].x1 > carry + 0.5) && GARDEN.halfX - outer[outer.length - 1].x1 > carry + 0.5, `a kick carries ${carry.toFixed(1)}; the least gap is ${Math.min(GARDEN.halfX - outer[outer.length - 1].x1, ...outer.slice(1).map((o, i) => o.x0 - outer[i].x1)).toFixed(1)}`);
  check('the pole and the strip are in the open: nothing solid within three of either', [[POLE.x, POLE.z], [STRIP.x, STRIP.z], [STRIP.x, STRIP.z - STRIP.length]].every(([x, z]) => def.solids.every((b) => b.y1 <= 0 || x < b.x0 - 3 || x > b.x1 + 3 || z < b.z0 - 3 || z > b.z1 + 3)));
  check('every board\'s writing is two short lines at most: the game is drawn coarsely, and small writing cannot be read', signs.every((d) => d.lines.length >= 1 && d.lines.length <= 2 && d.lines.every((l) => l.length <= 16)));
}

// ---- Playing it ----
/** His feet at the top of a jump in the open (and of a double jump, the second pressed at the top of the first). */
function apex(double: boolean): number {
  const p = new PlayerController(new THREE.Vector3(POLE.x + 1, 0, POLE.z));
  for (let i = 0; i < 10; i++) p.update(DT, inp({}), cs);
  p.update(DT, inp({ jumpPressed: true, jumpHeld: true }), cs);
  let top = 0;
  let pressed = false;
  for (let i = 0; i < 240; i++) {
    const press = double && !pressed && p.velocity.y <= 0.3;
    if (press) pressed = true;
    p.update(DT, inp({ jumpPressed: press, jumpHeld: true }), cs);
    top = Math.max(top, p.position.y);
    if (p.grounded) break;
  }
  return top;
}

/**
 * Runs at a step from the floor in front of it and jumps: from `back` away from its face, the second jump (if he may)
 * pressed `at` frames after the first. Catching the edge counts only if he may grab. True if he ends standing on it.
 */
function tryStep(s: Step, double: boolean, grab: boolean, back: number, at: number): boolean {
  const p = new PlayerController(new THREE.Vector3(W + STEP_SIZE + back + 2.5, 0, s.z));
  for (let i = 0; i < 5; i++) p.update(DT, inp({}), cs);
  let jumped = -1;
  for (let i = 0; i < 260; i++) {
    const press = jumped < 0 ? p.position.x <= W + STEP_SIZE + back : double && i - jumped === at;
    if (press && jumped < 0) jumped = i;
    if (p.state === 'hang') {
      if (!grab) return false;
      p.update(DT, inp({ jumpPressed: true, jumpHeld: true }), cs);
      continue;
    }
    p.update(DT, inp({ move: WEST, jumpPressed: press, jumpHeld: true }), cs);
    if (jumped >= 0 && i > jumped + 3 && p.grounded && p.state !== 'climb') break;
  }
  for (let i = 0; i < 50; i++) p.update(DT, inp({}), cs);
  return p.grounded && Math.abs(p.position.y - s.top) < 0.05;
}
/** Whether any fair try gets him onto the step (every take-off place and every moment for the second jump). */
function reaches(s: Step, double: boolean, grab: boolean): boolean {
  for (let back = 0.4; back <= 4.4; back += 0.2) {
    if (!double) {
      if (tryStep(s, false, grab, back, 0)) return true;
    } else for (let at = 10; at <= 44; at += 2) if (tryStep(s, true, grab, back, at)) return true;
  }
  return false;
}
/** The least that gets him onto a step: 0 one jump, 1 a jump and a grab, 2 a double jump, 3 a double jump and a grab, 4 nothing. */
const MOVES = ['one jump', 'a jump and a grab', 'a double jump', 'a double jump and a grab', 'no jump at all'];
function least(s: Step): number {
  if (reaches(s, false, false)) return 0;
  if (reaches(s, false, true)) return 1;
  if (reaches(s, true, false)) return 2;
  if (reaches(s, true, true)) return 3;
  return 4;
}

/**
 * Kicks from wall to wall up a chimney from its floor, jump pressed `delay` frames after each wall is touched; once
 * over the top he makes for the middle of the wall he means to land on. Comes back with how high he got and whether
 * he is standing on top.
 */
function climb(c: Chimney, delay: number): { top: number; landed: boolean; kicks: number } {
  const f = chimneyFaces(c);
  const landOnEast = c.eastTop <= c.westTop;
  const goal = Math.min(c.westTop, c.eastTop);
  let land = landOnEast ? f.east + CHIMNEY_WALL / 2 : c.x + CHIMNEY_WALL / 2;
  let over = false;
  const p = new PlayerController(new THREE.Vector3(f.mid, 0, (f.z0 + f.z1) / 2));
  for (let i = 0; i < 10; i++) p.update(DT, inp({}), cs);
  // The first wall is the one he will not land on (so the last kick sends him to the one he will), where they differ.
  let dir = landOnEast ? -1 : 1;
  let wait = -1;
  let top = 0;
  let kicks = 0;
  const mv = (d: number): THREE.Vector3 => new THREE.Vector3(d, 0, 0);
  p.update(DT, inp({ move: mv(dir), jumpPressed: true, jumpHeld: true }), cs);
  for (let i = 0; i < 900; i++) {
    const before = p.velocity.x;
    const press = wait === 0;
    if (press) {
      dir = -dir;
      kicks++;
    }
    let move = mv(dir);
    if (p.position.y > goal + 0.15 && wait < 0) {
      // Over the top: he makes for the wall he is flying towards (where either will do), steering on where he will
      // be in a third of a second, not where he is, so that he does not sail over it.
      if (!over && c.westTop === c.eastTop) land = p.velocity.x > 0 ? f.east + CHIMNEY_WALL / 2 : c.x + CHIMNEY_WALL / 2;
      over = true;
      const ahead = land - (p.position.x + p.velocity.x * 0.33);
      move = mv(Math.max(-1, Math.min(1, ahead * 2.5)));
    }
    if (p.state === 'hang') {
      p.update(DT, inp({ jumpPressed: true, jumpHeld: true }), cs);
      continue;
    }
    p.update(DT, inp({ move, jumpPressed: press && !over, jumpHeld: true }), cs);
    top = Math.max(top, p.position.y);
    if (wait > 0) wait--;
    else if (wait === 0) wait = -1;
    if (wait < 0 && !p.grounded && Math.sign(before) === dir && Math.abs(before) > 0.5 && p.velocity.x === 0) wait = delay;
    if (p.grounded && p.state !== 'climb' && (p.position.y > goal - 0.1 || (i > 40 && p.position.y < 0.1))) break;
  }
  for (let i = 0; i < 40; i++) p.update(DT, inp({}), cs);
  return { top, landed: p.grounded && Math.abs(p.position.y - goal) < 0.05, kicks };
}
/** The best of a quick, a middling and a late press. */
function climbs(c: Chimney): { top: number; landed: boolean; kicks: number } {
  let best = { top: 0, landed: false, kicks: 0 };
  for (const delay of [2, 5, 8]) {
    const r = climb(c, delay);
    if ((r.landed && !best.landed) || (r.landed === best.landed && r.top > best.top)) best = r;
  }
  return best;
}
/**
 * The "one wall kick" ledge: a jump at the tall wall, ONE kick off it, and then whatever it takes to end on the ledge
 * across the gap: nothing more (he lands on it), a catch of its edge, or a double jump on the way over. Comes back
 * with the least of those that does it (0, 1, 2), or 3 if one kick is not enough; and how much height the kick gave.
 */
const AFTER = ['lands on it', 'catches its edge', 'needs a double jump on the way over', 'one kick is not enough'];
function oneKick(): { least: number; gain: number } {
  const c = CHIMNEYS.find((x) => x.id === 'one')!;
  const f = chimneyFaces(c);
  let least = 3;
  let gain = 0;
  for (const double of [false, true]) {
    for (const delay of [1, 3, 5, 8]) {
      for (const from of [0.6, 1.2, 1.8, 2.4]) {
        const p = new PlayerController(new THREE.Vector3(f.west + from, 0, (f.z0 + f.z1) / 2));
        for (let i = 0; i < 10; i++) p.update(DT, inp({}), cs);
        let touched = -1;
        let kicked = -1;
        let kickY = 0;
        let peak = 0;
        let doubled = false;
        let hung = false;
        p.update(DT, inp({ move: WEST, jumpPressed: true, jumpHeld: true }), cs);
        for (let i = 0; i < 300; i++) {
          const before = p.velocity.x;
          if (p.state === 'hang') {
            hung = true;
            p.update(DT, inp({ jumpPressed: true, jumpHeld: true }), cs);
            continue;
          }
          const kick = kicked < 0 && touched >= 0 && i - touched === delay;
          const second = double && kicked >= 0 && !doubled && i > kicked + 4 && p.velocity.y <= 0.3;
          if (kick) {
            kicked = i;
            kickY = p.position.y;
          }
          if (second) doubled = true;
          p.update(DT, inp({ move: kicked < 0 ? WEST : new THREE.Vector3(1, 0, 0), jumpPressed: kick || second, jumpHeld: true }), cs);
          if (kicked >= 0 && !doubled && !hung && !p.grounded) peak = Math.max(peak, p.position.y - kickY);
          if (touched < 0 && !p.grounded && before < -0.5 && p.velocity.x === 0) touched = i;
          if (i > 20 && p.grounded && p.state !== 'climb') break;
        }
        for (let i = 0; i < 40; i++) p.update(DT, inp({}), cs);
        gain = Math.max(gain, peak);
        if (p.grounded && Math.abs(p.position.y - c.eastTop) < 0.05) least = Math.min(least, doubled ? 2 : hung ? 1 : 0);
      }
    }
    if (least < 3) break;
  }
  return { least, gain };
}

/** Without a kick: a jump and a double jump at the chimney's landing wall, catching its edge if he can. */
function withoutKicks(c: Chimney): boolean {
  const f = chimneyFaces(c);
  const landOnEast = c.eastTop <= c.westTop;
  const goal = Math.min(c.westTop, c.eastTop);
  for (let at = 10; at <= 44; at += 2) {
    const p = new PlayerController(new THREE.Vector3(landOnEast ? f.east - 0.5 : f.west + 0.5, 0, (f.z0 + f.z1) / 2));
    for (let i = 0; i < 10; i++) p.update(DT, inp({}), cs);
    const move = new THREE.Vector3(landOnEast ? 1 : -1, 0, 0);
    // (Jump pressed while he is clear of the wall, so that it is a jump and not a kick.)
    for (let i = 0; i < 220; i++) {
      if (p.state === 'hang') {
        p.update(DT, inp({ jumpPressed: true, jumpHeld: true }), cs);
        continue;
      }
      p.update(DT, inp({ move: i < 2 ? new THREE.Vector3() : move, jumpPressed: i === 0 || i === at, jumpHeld: true }), cs);
      if (i > 5 && p.grounded && p.state !== 'climb') break;
    }
    for (let i = 0; i < 40; i++) p.update(DT, inp({}), cs);
    if (p.grounded && Math.abs(p.position.y - goal) < 0.05) return true;
  }
  return false;
}

/** How far a jump carries him along the strip from its line: a running jump, with a double jump, and a long jump. */
function leap(kind: 'run' | 'double' | 'long'): number {
  const p = new PlayerController(new THREE.Vector3(STRIP.x, 0, STRIP.z + 6));
  for (let i = 0; i < 5; i++) p.update(DT, inp({}), cs);
  let jumped = -1;
  let pressed = false;
  for (let i = 0; i < 400; i++) {
    const first = jumped < 0 && p.position.z <= STRIP.z;
    const second = kind === 'double' && jumped >= 0 && !pressed && p.velocity.y <= 0.3;
    if (first) jumped = i;
    if (second) pressed = true;
    // (A long jump: the run button let go as jump is pressed.)
    p.update(DT, inp({ move: NORTH, run: !(kind === 'long' && first), jumpPressed: first || second, jumpHeld: true }), cs);
    if (jumped >= 0 && i > jumped + 3 && p.grounded) break;
  }
  return STRIP.z - p.position.z;
}

/** The three chimneys that are climbed kick after kick (the fourth is the one-kick ledge). */
const TALL = CHIMNEYS.filter((c) => c.id !== 'one');
interface Row { set: TweakSet; jump: number; double: number; one: { least: number; gain: number }; steps: number[]; climbs: Array<{ top: number; landed: boolean; kicks: number }>; free: boolean[]; run: number; dbl: number; long: number }
function play(set: TweakSet): Row {
  const t = new Tweaks(null);
  t.useSet(set, JUMP_SETS);
  const row: Row = { set, jump: apex(false), double: apex(true), one: oneKick(), steps: STEPS.map(least), climbs: TALL.map(climbs), free: CHIMNEYS.map(withoutKicks), run: leap('run'), dbl: leap('double'), long: leap('long') };
  t.useSet(JUMP_SETS[0], JUMP_SETS);
  return row;
}

// ---- As the game is ----
const asIs = play(JUMP_SETS[0]);
{
  check('as the game is, a jump gets his feet 2.4 up, a double jump 4.6, and one wall kick lifts him 2.8', Math.abs(asIs.jump - 2.43) < 0.05 && Math.abs(asIs.double - 4.6) < 0.1 && Math.abs(asIs.one.gain - 2.8) < 0.1, `${asIs.jump.toFixed(2)}, ${asIs.double.toFixed(2)} and ${asIs.one.gain.toFixed(2)}`);
  const BOARD = ['ONE JUMP', 'JUMP, GRAB', 'DOUBLE JUMP', 'DOUBLE, GRAB'];
  STEPS.forEach((s, i) => check(`the step ${s.top} up: its board says "${s.move}", and that is what it needs and no less: ${MOVES[i]}`, s.move === BOARD[i] && asIs.steps[i] === i, `the least that gets him there: ${MOVES[asIs.steps[i]]}`));
  TALL.forEach((c, i) => check(`the chimney "${c.lines[0]}": kicks take him to the top, where he lands`, asIs.climbs[i].landed, `${asIs.climbs[i].kicks} kicks, ${asIs.climbs[i].top.toFixed(2)} up`));
  check('the "one wall kick" ledge: one kick off the tall wall and a catch of its edge gets him onto it', asIs.one.least === 1, `after the kick he ${AFTER[asIs.one.least]}`);
  check('...and none of the four is got up without a kick: a jump, a double jump and a grab do not do it', asIs.free.every((x) => !x));
  check('a running jump from the line carries him about six along the strip, a double jump about ten, and the strip is long enough for a long jump', asIs.run > 5.6 && asIs.run < 7.2 && asIs.dbl > 9 && asIs.dbl < 12 && asIs.long > asIs.run && asIs.long < STRIP.length, `${asIs.run.toFixed(1)}, ${asIs.dbl.toFixed(1)}, long jump ${asIs.long.toFixed(1)}`);
}

// ---- The sets ----
{
  const t = new Tweaks(null);
  check('with nothing changed, the set in use is "As it is"', t.activeSet(JUMP_SETS)?.id === 'asis');
  for (const s of JUMP_SETS) {
    t.useSet(s, JUMP_SETS);
    const paths = Object.keys(s.values);
    check(`the set "${s.name}": its sliders are where it puts them, every other jump slider is at its default, and it is the set shown as in use`, paths.every((p) => readTweak(p) === s.values[p]) && TWEAKS.filter((x) => (x.group === 'Jumping' || x.group === 'Moves') && !paths.includes(x.path)).every((x) => readTweak(x.path) === defaultTweak(x.path)) && t.activeSet(JUMP_SETS) === s && t.count() === paths.length);
  }
  t.set('jump.doubleVelocity', 7.3);
  check('a jump slider moved by hand to somewhere of its own: no set is shown as in use', t.activeSet(JUMP_SETS) === null);
  t.useSet(JUMP_SETS[0], JUMP_SETS);
  check('..."As it is" puts it back', t.count() === 0 && TUNING.jump.doubleVelocity === defaultTweak('jump.doubleVelocity'));
  check('every set\'s sliders are real ones, and within what the sliders allow', JUMP_SETS.every((s) => Object.entries(s.values).every(([p, v]) => TWEAKS.some((x) => x.path === p && v >= x.min && v <= x.max))));
}

const rows = [asIs, ...JUMP_SETS.slice(1).map(play)];
console.log('\n      What each set does in the garden (played by the real controller):');
for (const r of rows) {
  console.log(`      ${r.set.name}`);
  console.log(`        a jump ${r.jump.toFixed(2)} up, a double jump ${r.double.toFixed(2)}, one wall kick lifts him ${r.one.gain.toFixed(2)}; along the floor: ${r.run.toFixed(1)}, ${r.dbl.toFixed(1)} with a double jump, ${r.long.toFixed(1)} a long jump`);
  console.log(`        steps: ${STEPS.map((s, i) => `${s.top} by ${MOVES[r.steps[i]]}`).join('; ')}`);
  console.log(`        chimneys: ${TALL.map((c, i) => `${c.gap} wide: ${r.climbs[i].landed ? `${r.climbs[i].kicks} kicks` : `no (${r.climbs[i].top.toFixed(1)} up)`}`).join('; ')}; the one-kick ledge: after the kick he ${AFTER[r.one.least]}${r.free.some((x) => x) ? ' [something here is got up WITHOUT a kick]' : ''}`);
}
{
  const by = (id: string): Row => rows.find((r) => r.set.id === id)!;
  const kicksOf = (r: Row, id: string): number => r.climbs[TALL.findIndex((c) => c.id === id)].kicks;
  // (Under the other sets it is enough that the kicks take him over the top: this test's own steering was made for
  // the game as it is, and a stronger kick can carry it past the wall it means to land on.)
  check('under every set, every chimney is still climbed by kicks and by nothing else', rows.every((r) => r.climbs.every((c, i) => c.landed || c.top > Math.min(TALL[i].westTop, TALL[i].eastTop) + 0.3) && r.free.every((x) => !x)));
  check('"Stronger wall kick": the same jumps; one kick lifts him a unit more, no more kicks are needed up any chimney, and the one-kick ledge is landed on with no catch', Math.abs(by('kick').double - asIs.double) < 0.01 && by('kick').one.gain > asIs.one.gain + 0.9 && TALL.every((c) => kicksOf(by('kick'), c.id) <= kicksOf(asIs, c.id)) && by('kick').one.least === 0, `${kicksOf(by('kick'), 'wide')} kicks for ${kicksOf(asIs, 'wide')}; after one kick he ${AFTER[by('kick').one.least]}`);
  check('"Smaller double jump": a double jump reaches about 3.4, so the highest step cannot be jumped onto at all and the next needs a grab', Math.abs(by('double').double - 3.4) < 0.1 && by('double').steps[2] === 3 && by('double').steps[3] === 4 && by('double').steps[0] === 0 && by('double').steps[1] === 1, `double jump ${by('double').double.toFixed(2)}`);
  check('"Mario\'s proportions": a double jump reaches about 3, so neither of the two highest steps can be jumped onto', Math.abs(by('mario').double - 2.95) < 0.1 && by('mario').steps[2] === 4 && by('mario').steps[3] === 4, `double jump ${by('mario').double.toFixed(2)}`);
  const kickOf = (r: Row): number => r.one.gain;
  check('"Both" and "Mario\'s proportions": one wall kick climbs more than a whole double jump reaches (as Mario\'s does); as the game is, it is the other way round', ['both', 'mario'].every((id) => kickOf(by(id)) > by(id).double) && kickOf(asIs) < asIs.double, `as it is: a kick ${kickOf(asIs).toFixed(2)}, a double jump ${asIs.double.toFixed(2)}; both: ${kickOf(by('both')).toFixed(2)} and ${by('both').double.toFixed(2)}; Mario's: ${kickOf(by('mario')).toFixed(2)} and ${by('mario').double.toFixed(2)}`);
  // What each set's note says it does is what it does (the numbers in the notes, against the room).
  const said = (r: Row, what: RegExp): number => Number(what.exec(r.set.note)?.[1] ?? NaN);
  check('each set\'s note gives its double jump and its wall kick as they measure here, to a tenth', rows.every((r) => {
    const d = said(r, /double jump (?:that )?reaches (\d+(?:\.\d+)?)/);
    const k = said(r, /wall kick (?:that )?climbs (\d+(?:\.\d+)?)/);
    return (Number.isNaN(d) || Math.abs(d - r.double) < 0.1) && (Number.isNaN(k) || Math.abs(k - r.one.gain) < 0.1) && !(Number.isNaN(d) && Number.isNaN(k));
  }), rows.map((r) => `${r.set.id}: ${r.double.toFixed(2)}, ${r.one.gain.toFixed(2)}`).join('; '));
  check('after all of that the sliders are back where the game has them', TWEAKS.every((x) => readTweak(x.path) === defaultTweak(x.path)));
}

// ---- The run: riding the shield ----
{
  const rs = def.solids.map(aabbOf);
  const T = RUN.top;
  const signs = def.decor.filter((d) => d.kind === 'sign');
  const slopeOfRun = T.y / (RUN.slope.x1 - RUN.slope.x0);
  const slopeOfChute = T.y / (RUN.chute.z1 - RUN.chute.z0);
  const slopeOfUp = T.y / (RUN.up.z1 - RUN.up.z0);
  check('the run is a slope he can stand on, the way up to it one he can walk, and the chute one he cannot', slopeOfRun <= MAX_WALK_SLOPE && slopeOfRun >= TUNING.ride.minSlope && slopeOfUp <= MAX_WALK_SLOPE && slopeOfChute > MAX_WALK_SLOPE, `run ${slopeOfRun}, way up ${slopeOfUp}, chute ${slopeOfChute}`);
  check('each of them has a board that says what it is for', ['THE RUN', 'TOO STEEP', 'JUMP'].every((l) => signs.some((d) => d.lines[0] === l)) && signs.find((d) => d.lines[0] === 'THE RUN')?.lines[1] === 'JUMP, ATTACK');
  const drive = (from: THREE.Vector3, frames: number, at: (i: number, p: PlayerController) => Partial<PlayerInput>, each?: (p: PlayerController) => void): { p: PlayerController; events: string[] } => {
    const p = new PlayerController(from.clone());
    const events: string[] = [];
    for (let i = 0; i < 20; i++) p.update(DT, inp({}), rs);
    for (let i = 0; i < frames; i++) {
      p.update(DT, inp(at(i, p)), rs);
      if (p.moveEvent) events.push(p.moveEvent);
      each?.(p);
    }
    return { p, events };
  };
  const midZ = (RUN.slope.z0 + RUN.slope.z1) / 2;
  /** Onto his shield on the run: he runs onto it, jumps, and in the air over it presses ATTACK. */
  const getOn = (p: PlayerController): Partial<PlayerInput> => {
    const on = p.position.x < RUN.slope.x1 - 0.5;
    return { move: WEST, run: true, jumpPressed: p.grounded && on, jumpHeld: !p.grounded, attackPressed: !p.grounded && on && p.velocity.y < 4 };
  };
  // The way up: from the floor at its foot he walks to the top.
  const walked = drive(new THREE.Vector3((RUN.up.x0 + RUN.up.x1) / 2, 0, RUN.up.z0 - 1.5), 260, () => ({ move: new THREE.Vector3(0, 0, 1), run: true }));
  check('he walks up the way up, from the floor to the top of the run', Math.abs(walked.p.position.y - T.y) < 0.01 && walked.p.grounded && !walked.p.riding, `y ${walked.p.position.y.toFixed(2)}`);
  // The run: he runs at it, sneaks as he comes onto it, and rides. Holding nothing after, he goes over the kicker.
  let fastest = 0;
  let airPastKicker = 0;
  let doorFrames = 0;
  let rodeToFloor = false;
  // (Once he is down past it he brakes: the room is not long enough to roll to a stop in from that speed.)
  const EAST = new THREE.Vector3(1, 0, 0);
  const brakePast = (p: PlayerController): Partial<PlayerInput> => (p.grounded && p.position.x < RUN.kicker.x0 - 1 ? { move: EAST, run: false } : { run: false });
  const ridden = drive(new THREE.Vector3(T.x1 - 2.5, T.y, midZ), 420, (i, p) => (p.riding ? brakePast(p) : getOn(p)), (p) => {
    if (p.riding) fastest = Math.max(fastest, Math.hypot(p.velocity.x, p.velocity.z));
    if (p.riding && p.grounded && p.position.y < 0.01 && p.position.x < RUN.slope.x0 && p.position.x > RUN.kicker.x1) rodeToFloor = true;
    if (p.riding && !p.grounded && p.position.x < RUN.kicker.x0) airPastKicker = Math.max(airPastKicker, p.position.y);
    if (p.grounded && atDoor(def.exit, p.position.x, p.position.z)) doorFrames++;
  });
  check('THE RUN: a jump, and ATTACK in the air over it, and he rides his shield down it and out across the floor', ridden.events.includes('ride') && rodeToFloor && fastest > TUNING.move.run * 1.5, `fastest ${fastest.toFixed(1)}; ${ridden.events.join()}`);
  check('...the kicker throws him into the air, higher than its own top, and he comes down still on it', airPastKicker > RUN.kicker.y + 0.35 && ridden.events.includes('rideLand') && !ridden.events.includes('bail'), `${airPastKicker.toFixed(2)} up past the kicker; ${ridden.events.join()}`);
  check('...and going straight he is never at the door: he is in the air past it, or beside it', doorFrames === 0, `${doorFrames} frames at the door`);
  // Off the kicker, JUMP and then JUMP AGAIN is the kickflip, and there is air enough to land it.
  let popped = false;
  let flipped = false;
  const tricked = drive(new THREE.Vector3(T.x1 - 2.5, T.y, midZ), 420, (i, p) => {
    if (!p.riding) return getOn(p);
    if (flipped && p.grounded) return brakePast(p);
    if (!popped && p.grounded && p.position.x < RUN.kicker.x0 + 0.5 && p.position.x > RUN.kicker.x0) {
      popped = true;
      return { run: false, jumpPressed: true, jumpHeld: true };
    }
    if (popped && !flipped && !p.grounded && p.velocity.y < 6) {
      flipped = true;
      return { run: false, jumpPressed: true, jumpHeld: true };
    }
    return { run: false, jumpHeld: popped && !p.grounded };
  });
  check('...JUMP at its top and JUMP AGAIN in the air: a kickflip, landed', tricked.events.includes('ollie') && tricked.events.includes('kickflip') && tricked.events.includes('trick') && !tricked.events.includes('bail'), tricked.events.join());
  // The rail and the kerb: riding down the middle neither is in reach; steered to one, STOW grinds it to its end.
  const grindRun = (toward: number, line: number, top: number): { ground: number; from: number; to: number; events: string[]; missed: boolean } => {
    let pressed = false;
    let ground = 0;
    let from = 0;
    let to = 0;
    let wrong = 0;
    // (He rides half a unit to its near side, as a player would: steering at that line, and straight along it.)
    const beside = line - toward * 0.5;
    const r = drive(new THREE.Vector3(T.x1 - 2.5, T.y, midZ), 520, (i, p) => {
      if (!p.riding) return getOn(p);
      if (p.grinding) return { run: false };
      // (Past its end he brakes.)
      if (p.grounded && p.position.x < RUN.rail.x0 - 0.3) return { move: EAST, run: false };
      if (toward === 0) {
        const press = !pressed && p.position.x < RUN.rail.x1 - 0.5;
        if (press) pressed = true;
        return { run: false, stowPressed: press };
      }
      // Which way he is going, as an angle off due west (+ toward the south), and which way he wants to be going.
      const going = Math.atan2(p.velocity.z, -p.velocity.x);
      const want = Math.max(-0.45, Math.min(0.45, (beside - p.position.z) / 5));
      const turn = Math.max(-0.8, Math.min(0.8, (want - going) * 4));
      const steer = p.grounded && p.position.x < RUN.kicker.x0 - 6;
      const press = !pressed && p.position.x < RUN.rail.x1 - 0.5 && Math.abs(p.position.z - line) < TUNING.grind.reach - 0.15 && Math.abs(going) < 0.3;
      if (press) pressed = true;
      return { run: false, stowPressed: press, move: steer ? new THREE.Vector3(0, 0, turn) : new THREE.Vector3() };
    }, (p) => {
      if (!p.grinding) return;
      ground++;
      if (!from) from = p.position.x;
      to = p.position.x;
      if (Math.abs(p.position.z - line) > 1e-6 || Math.abs(p.position.y - top) > 1e-6) wrong++;
    });
    return { ground, from, to, events: r.events, missed: wrong > 0 };
  };
  const middle = grindRun(0, 0, 0);
  check('GRIND: riding down the middle of the way, neither the rail nor the kerb is in reach of him', !middle.events.includes('grind') && Math.abs(midZ - RUN.rail.z) > TUNING.grind.reach && Math.abs(midZ - RUN.kerb.z0) > TUNING.grind.reach, middle.events.join());
  const onRail = grindRun(-1, RUN.rail.z, RUN.rail.y);
  check('...steered to the rail, STOW puts him on it and he grinds it to its end', onRail.events.includes('grind') && !onRail.missed && onRail.to < RUN.rail.x0 + 0.5 && onRail.events.includes('grindEnd') && !onRail.events.includes('bail'), `${onRail.ground} frames, x ${onRail.from.toFixed(1)} to ${onRail.to.toFixed(1)}; ${onRail.events.join()}`);
  const onKerb = grindRun(1, RUN.kerb.z0, RUN.kerb.y);
  check('...steered to the kerb, STOW hops him onto its edge and he grinds that to its end', onKerb.events.includes('grind') && !onKerb.missed && onKerb.to < RUN.kerb.x0 + 0.5 && onKerb.events.includes('grindEnd') && !onKerb.events.includes('bail'), `${onKerb.ground} frames, x ${onKerb.from.toFixed(1)} to ${onKerb.to.toFixed(1)}; ${onKerb.events.join()}`);
  check('...and a board says so', signs.some((d) => d.lines[0] === 'GRIND' && d.lines[1] === 'JUMP, THEN STOW'));
  // The chute: he runs off the top onto it and is on his shield whether he chose it or not, down to the floor.
  let slidFrom = 0;
  let outOnTheFloor = false;
  let inTheAir = 0;
  const chuted = drive(new THREE.Vector3((RUN.chute.x0 + RUN.chute.x1) / 2, T.y, T.z0 + 2), 200, (i, p) => (p.sliding ? {} : { move: p.position.z > RUN.chute.z0 ? NORTH : new THREE.Vector3(), run: true }), (p) => {
    if (p.sliding && p.grounded) slidFrom = Math.max(slidFrom, p.position.y);
    if (p.position.z < RUN.chute.z1 - 0.4 && p.position.z > RUN.chute.z0 && !p.grounded) inTheAir++;
    if (p.grounded && p.position.y < 0.01 && p.position.z < RUN.chute.z0) outOnTheFloor = true;
  });
  check('TOO STEEP: he runs onto the chute, loses his footing and slides on his hide from its top to the floor, on it all the way, and gets up at its foot', chuted.events.includes('slip') && !chuted.events.includes('ride') && slidFrom > T.y - 1.5 && inTheAir === 0 && outOnTheFloor && chuted.events.includes('slideEnd') && !chuted.p.sliding, `slid from ${slidFrom.toFixed(2)}; ${inTheAir} frames in the air; ${chuted.events.join()}`);
  // ...or on his shield: a jump from the top, out over it, and ATTACK in the air.
  const surfed = drive(new THREE.Vector3((RUN.chute.x0 + RUN.chute.x1) / 2, T.y, T.z0 + 2), 120, (i, p) => (p.riding ? { run: false } : { move: NORTH, run: true, jumpPressed: p.grounded && p.position.z < T.z0 + 0.9, jumpHeld: !p.grounded, attackPressed: !p.grounded && p.position.z < T.z0 - 0.3 }));
  check('...or he jumps out over it and presses ATTACK, and goes down it on his shield', surfed.events.includes('ride') && !surfed.events.includes('slip') && surfed.events.includes('rideLand'), surfed.events.join());
  const climbed = drive(new THREE.Vector3((RUN.chute.x0 + RUN.chute.x1) / 2, 0, RUN.chute.z0 - 3), 200, (i) => ({ move: new THREE.Vector3(0, 0, 1), run: true, jumpPressed: i % 45 === 20, jumpHeld: i % 45 >= 20 }));
  check('...and from the floor he cannot get up it', climbed.p.position.y < T.y - 2, `y ${climbed.p.position.y.toFixed(2)}`);
  // The rail from his own feet: running beside it, a jump and STOW in the air brings him down onto it on his shield.
  const fromFeet = (run: boolean): { events: string[]; on: number } => {
    let on = 0;
    const r = drive(new THREE.Vector3(RUN.rail.x1 + 9, 0, RUN.rail.z + 0.5), 200, (i, p) => (p.riding ? { run: false } : { move: WEST, run, jumpPressed: p.grounded && p.position.x < RUN.rail.x1 - 1, jumpHeld: true, stowPressed: !p.grounded && p.velocity.y < 1 }), (p) => {
      if (p.grinding) on++;
    });
    return { events: r.events, on };
  };
  const ranAtIt = fromFeet(true);
  check('GRIND from his own feet: running beside the rail, a jump and STOW in the air puts his shield under him and he comes down onto the rail', ranAtIt.events.includes('ride') && ranAtIt.events.includes('grind') && ranAtIt.on > 20 && !ranAtIt.events.includes('bail'), `${ranAtIt.on} frames on it; ${ranAtIt.events.join()}`);
  const walkedAtIt = fromFeet(false);
  check('...too slow (at a walk), nothing happens: he comes down on his feet', !walkedAtIt.events.includes('ride') && !walkedAtIt.events.includes('grind') && walkedAtIt.on === 0, walkedAtIt.events.join());
}

console.log(failures === 0 ? '\nAll garden checks passed.' : `\n${failures} garden check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
