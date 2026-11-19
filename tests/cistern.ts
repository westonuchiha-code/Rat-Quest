// The Great Cistern, played by the real controller where it matters.
//
// The things to find there (the owner, 2026-11-15): fewer of them, each one earned by a piece of movement, none on a
// trail, and none to be had by jumping past the way it is meant to be got. So for each one: the route is played with
// the real controller (and the thing is picked up at the end of it), and the route's key piece is taken away to see
// that the jump checker can then find no way to it at all.
import './../src/core/colorSetup';
import * as THREE from 'three';
import { PlayerController, PlayerInput } from '../src/player/controller';
import { makeAabb } from '../src/world/collision';
import { buildChamber } from '../src/world/chamber';
import { cistern, CHIMNEY_FLOOR, PERCH, SUMMIT, CLEFT, FLUE, OUTRIGGER, WINCH, DRAIN_ROOF, SPIRAL, CISTERN_WEDGES } from '../src/levels/cistern';
import { computeReach, unreachable, maxChimney } from '../src/levels/reach';
import { CollectibleTracker } from '../src/world/collectibles';
import { TUNING } from '../src/data/tuning';
import type { LevelDef } from '../src/levels/types';
import type { Box } from '../src/world/layout';

const DT = 1 / 60;
let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}
const def = cistern();
const cs = def.solids.map((b) => makeAabb((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, (b.z0 + b.z1) / 2, b.x1 - b.x0, b.y1 - b.y0, b.z1 - b.z0));
const inp = (o: Partial<PlayerInput>): PlayerInput => ({ move: new THREE.Vector3(), run: true, jumpPressed: false, jumpHeld: false, attackPressed: false, dodgeHeld: false, dodgePressed: false, guardHeld: false, stowPressed: false, ...o } as PlayerInput);
/** A fresh purse: what he picks up on a route is seen in it. */
const purse = (): CollectibleTracker => new CollectibleTracker([{ id: def.id, name: def.name, items: def.collectibles }], null);
const pick = (t: CollectibleTracker, p: PlayerController): void => void t.tryCollect(def.id, p.position, TUNING.rat.radius, TUNING.rat.height);
const itemAt = (x: number, z: number) => def.collectibles.find((c) => Math.hypot(c.x - x, c.z - z) < 0.6)!;

// ---- What there is to find ----
{
  const caps = def.collectibles.filter((c) => c.kind === 'cap');
  const cheese = def.collectibles.filter((c) => c.kind === 'crumb');
  check(
    'there are five bottle caps and three hunks of cheese, and nothing else: eight things where there were thirty-two',
    caps.length === 5
      && cheese.length === 3
      && def.collectibles.length === 8
  );
  check(
    'each hunk is worth eight crumbs: the cheese in the Cistern is worth what its twenty-four crumbs were',
    cheese.every((c) => c.worth === 8)
      && purse().worth(def.id, 'crumb').total === 24
      && purse().count(def.id, 'crumb').total === 3
  );
  check(
    'a hunk has a name of its own in a save, so an old save does not find the new ones already picked up',
    cheese.every((c) => /:hunk:\d\d$/.test(c.id))
      && caps.every((c) => /:cap:\d\d$/.test(c.id))
  );
  check(
    'none of it is in a crate, and no two of them are within twelve of each other: there are no trails',
    def.collectibles.every((c) => c.crate === undefined)
      && def.collectibles.every((a) => def.collectibles.every((b) => a === b || Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z) > 12)),
    `nearest two ${Math.min(...def.collectibles.flatMap((a) => def.collectibles.filter((b) => b !== a).map((b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)))).toFixed(1)} apart`
  );
  check(
    'none of it is on the floor: the lowest is well over his head from the ground',
    def.collectibles.every((c) => c.y > 6),
    `lowest ${Math.min(...def.collectibles.map((c) => c.y)).toFixed(1)}`
  );
  const w = CISTERN_WEDGES.find((x) => x.id === 'caps')!;
  check(
    'the wedge for the caps asks for five, and says where each is',
    w.name === 'Five Bottle Caps'
      && w.appears?.type === 'collect'
      && /Teeth/.test(w.hint)
      && /Cleft/.test(w.hint)
      && /Flue/.test(w.hint)
  );
  const t = purse();
  for (const c of caps) t.collect(c.id);
  check(
    'picking up a hunk puts eight in his purse; a cap, one',
    t.worth(def.id, 'cap').have === 5
      && (t.collect(cheese[0].id), t.worth(def.id, 'crumb').have === 8)
      && t.count(def.id, 'crumb').have === 1
  );
}

// ---- Wall kicks: the tower's chimney, the Cleft and the Flue ----
/**
 * Kicks from wall to wall along an axis, pressing jump `delay` frames after each wall is touched. Once over `top` he
 * makes for the middle of the wall he means to land on (`land`), pulling back against his own speed as he comes over it.
 */
function kickUp(start: THREE.Vector3, axis: 'x' | 'z', first: number, top: number, land: number, delay: number, t?: CollectibleTracker): PlayerController {
  const p = new PlayerController(start.clone());
  for (let i = 0; i < 10; i++) p.update(DT, inp({}), cs);
  let dir = first;
  let wait = -1;
  const mv = (d: number): THREE.Vector3 => (axis === 'x' ? new THREE.Vector3(d, 0, 0) : new THREE.Vector3(0, 0, d));
  p.update(DT, inp({ move: mv(dir), jumpPressed: true, jumpHeld: true }), cs);
  for (let i = 0; i < 600; i++) {
    const before = p.velocity[axis];
    const press = wait === 0;
    if (press) dir = -dir;
    let move = mv(dir);
    if (p.position.y > top + 0.15 && wait < 0) {
      const d = land - p.position[axis];
      const v = p.velocity[axis];
      const stop = (v * v) / (2 * 20);
      move = mv(Math.abs(d) < stop + 0.3 && Math.sign(v) === Math.sign(d) ? -Math.sign(v) : Math.sign(d) * Math.min(1, Math.abs(d) * 3));
    }
    p.update(DT, inp({ move, jumpPressed: press, jumpHeld: true }), cs);
    if (t) pick(t, p);
    if (wait > 0) wait--;
    else if (wait === 0) wait = -1;
    if (wait < 0 && !p.grounded && Math.sign(before) === dir && Math.abs(before) > 0.5 && p.velocity[axis] === 0) wait = delay;
    if (p.grounded && (p.position.y > top - 0.1 || (i > 30 && p.position.y < start.y + 0.1))) break;
  }
  return p;
}
/** A jump and a double jump straight up from there, no kicks: how high his feet get. */
function hop(start: THREE.Vector3): number {
  const p = new PlayerController(start.clone());
  for (let i = 0; i < 10; i++) p.update(DT, inp({}), cs);
  p.update(DT, inp({ jumpPressed: true, jumpHeld: true }), cs);
  let top = 0;
  for (let i = 0; i < 200; i++) {
    p.update(DT, inp({ jumpPressed: i === 28, jumpHeld: true }), cs);
    top = Math.max(top, p.position.y);
  }
  return top;
}
{
  // The tower's chimney (as it was): up from its floor to the perch, where a cap is.
  for (const [delay, how] of [[2, 'quickly'], [8, 'a little late (forgiving enough for a phone)']] as Array<[number, string]>) {
    const t = purse();
    const p = kickUp(new THREE.Vector3(0, CHIMNEY_FLOOR, -4.1), 'z', -1, PERCH, -6.2, delay, t);
    check(
      `the tower's chimney, kicking ${how}: he comes out on the perch and has its cap`,
      p.grounded
        && Math.abs(p.position.y - PERCH) < 0.05
        && t.isCollected(itemAt(0, -6.2).id),
      `at ${p.position.z.toFixed(2)}, ${p.position.y.toFixed(2)} up`
    );
  }
  check('without wall kicks the chimney cannot be climbed', hop(new THREE.Vector3(0, CHIMNEY_FLOOR, -4.1)) < PERCH - 1);
  // From the perch, the tower top is a jump and a grab or a double jump away.
  {
    const p = new PlayerController(new THREE.Vector3(0, PERCH, -6.2));
    for (let i = 0; i < 5; i++) p.update(DT, inp({}), cs);
    const south = new THREE.Vector3(0, 0, 1);
    p.update(DT, inp({ move: south, jumpPressed: true, jumpHeld: true }), cs);
    for (let i = 0; i < 200; i++) {
      p.update(DT, inp({ move: south, jumpPressed: i === 20, jumpHeld: true }), cs);
      if (p.state === 'hang') p.update(DT, inp({ jumpPressed: true, jumpHeld: true }), cs);
      if (p.grounded && p.position.y > PERCH + 0.5) break;
    }
    for (let i = 0; i < 40; i++) p.update(DT, inp({}), cs);
    check('from the perch he gets onto the top of the tower', p.grounded && Math.abs(p.position.y - SUMMIT) < 0.05, `y ${p.position.y.toFixed(2)}`);
  }

  // The Cleft: two walls by themselves, from the floor. The cap is on the north one.
  const cleftMid = new THREE.Vector3((CLEFT.x0 + CLEFT.x1) / 2, 0, (CLEFT.northZ1 + CLEFT.southZ0) / 2);
  for (const delay of [2, 5, 8]) {
    const t = purse();
    const p = kickUp(cleftMid, 'z', -1, CLEFT.top, (CLEFT.northZ0 + CLEFT.northZ1) / 2, delay, t);
    check(
      `the Cleft, jump pressed ${delay} frames after each wall: he kicks up from the floor, lands on its north wall and has the cap`,
      p.grounded
        && Math.abs(p.position.y - CLEFT.top) < 0.05
        && p.position.z < CLEFT.northZ1
        && p.position.z > CLEFT.northZ0
        && t.isCollected(itemAt(cleftMid.x, (CLEFT.northZ0 + CLEFT.northZ1) / 2).id),
      `at z ${p.position.z.toFixed(2)}, ${p.position.y.toFixed(2)} up`
    );
  }
  check(
    '...it is ten up: twice what a jump and a double jump get him',
    hop(cleftMid) < CLEFT.top / 2 + 0.2
      && CLEFT.top === 10,
    `a double jump gets ${hop(cleftMid).toFixed(2)}`
  );
  check(
    '...and it stands by itself: further from any other wall than he can kick up between (about eight)',
    [CLEFT.x0 - -48, -26 - CLEFT.x1, CLEFT.northZ0 - -48, -12 - CLEFT.southZ1].every((d) => d > maxChimney() + 0.3),
    `nearest ${Math.min(CLEFT.x0 - -48, -26 - CLEFT.x1).toFixed(1)}; a chimney can be ${maxChimney().toFixed(2)}`
  );

  // The Flue, on the pump house roof: the hall's east wall and a wall four units in from it. The cap is on that wall.
  const roof = cs.find((b) => Math.abs(b.max.y - 8.5) < 1e-6 && b.min.x === 28)!;
  const flueFoot = new THREE.Vector3(46, roof.max.y, (FLUE.z0 + FLUE.z1) / 2);
  for (const delay of [2, 5, 8]) {
    const t = purse();
    const p = kickUp(flueFoot, 'x', 1, FLUE.top, (FLUE.x0 + FLUE.x1) / 2, delay, t);
    check(
      `the Flue, jump pressed ${delay} frames after each wall: he kicks from wall to wall across four units, lands on top and has the cap`,
      p.grounded
        && Math.abs(p.position.y - FLUE.top) < 0.05
        && p.position.x > FLUE.x0 - 0.3
        && p.position.x < FLUE.x1
        && t.isCollected(itemAt((FLUE.x0 + FLUE.x1) / 2, (FLUE.z0 + FLUE.z1) / 2).id),
      `at x ${p.position.x.toFixed(2)}, ${p.position.y.toFixed(2)} up`
    );
  }
  check(
    '...it is seven up from the roof: more than a jump, a double jump and a grab get him',
    hop(flueFoot) - roof.max.y < FLUE.top - roof.max.y - 2
      && 48 - FLUE.x1 === 4,
    `a double jump gets ${(hop(flueFoot) - roof.max.y).toFixed(2)} of ${FLUE.top - roof.max.y}`
  );
}

// ---- The Outrigger: a full double jump north from the spiral's last slab ----
{
  const s = SPIRAL[SPIRAL.length - 1];
  check(
    'the Outrigger is level with the spiral\'s last slab and nine units out from it',
    OUTRIGGER.top === s.top
      && Math.abs(s.z - 1.6 - OUTRIGGER.z1 - 9) < 0.02
      && Math.abs((OUTRIGGER.x0 + OUTRIGGER.x1) / 2 - s.x) < 0.02
  );
  const leap = (second: number, t?: CollectibleTracker): PlayerController => {
    const p = new PlayerController(new THREE.Vector3(s.x, s.top, s.z + 1.3));
    for (let i = 0; i < 10; i++) p.update(DT, inp({}), cs);
    const north = new THREE.Vector3(0, 0, -1);
    let jumped = -1;
    for (let i = 0; i < 300; i++) {
      const edge = p.position.z < s.z - 1.45 && jumped < 0 && p.grounded;
      if (edge) jumped = i;
      p.update(DT, inp({ move: north, jumpPressed: edge || (second > 0 && jumped >= 0 && i === jumped + second), jumpHeld: true }), cs);
      if (p.state === 'hang') p.update(DT, inp({ jumpPressed: true, jumpHeld: true }), cs);
      if (t) pick(t, p);
      if (jumped >= 0 && p.grounded && i > jumped + 5) break;
    }
    // (Landed, he walks to the middle of whatever he is on.)
    for (let i = 0; i < 60 && t && p.grounded; i++) {
      p.update(DT, inp({ move: new THREE.Vector3(0, 0, Math.max(-1, Math.min(1, ((OUTRIGGER.z0 + OUTRIGGER.z1) / 2 - p.position.z) * 3))), run: false }), cs);
      pick(t, p);
    }
    return p;
  };
  for (const second of [22, 34]) {
    const t = purse();
    const p = leap(second, t);
    check(
      `a run, a jump from the slab's edge and a double jump ${second} frames on: he lands on the Outrigger and has the hunk`,
      p.grounded
        && Math.abs(p.position.y - OUTRIGGER.top) < 0.05
        && p.position.z < OUTRIGGER.z1
        && t.worth(def.id, 'crumb').have === 8,
      `at z ${p.position.z.toFixed(2)}`
    );
  }
  const short = leap(0);
  check('one jump alone falls short of it', short.position.y < OUTRIGGER.top - 3, `he comes down at ${short.position.y.toFixed(1)}`);
}

// ---- The Winch: a lift, a perch, a slider and a ledge ----
{
  const W = WINCH;
  const ride = (startWait: number, second: number): { stage: string; took: number; t: CollectibleTracker } => {
    const room = buildChamber({ solids: def.solids, pit: def.pit, water: def.water ?? [], decor: [], movers: def.movers });
    const p = new PlayerController(new THREE.Vector3(34, 0, -20));
    const t = purse();
    let clock = 0;
    const tick = (o: Partial<PlayerInput>): void => {
      room.stepMovers(DT, p);
      p.update(DT, inp(o), room.colliders);
      pick(t, p);
      clock += DT;
    };
    // (He comes to it at some moment in their rounds.)
    while (clock < startWait) tick({});
    const began = clock;
    const mid = (m: { aabb: { min: THREE.Vector3; max: THREE.Vector3 } }, a: 'x' | 'z'): number => (m.aabb.min[a] + m.aabb.max[a]) / 2;
    const lift = room.movers.find((m) => Math.abs(mid(m, 'x') - (W.lift.x0 + W.lift.x1) / 2) < 0.1)!;
    const slider = room.movers.find((m) => m !== lift && Math.abs(mid(m, 'x') - (W.slider.x0 + W.slider.x1) / 2) < 0.1)!;
    const go = (x: number, z: number): THREE.Vector3 => {
      const v = new THREE.Vector3(x - p.position.x, 0, z - p.position.z);
      return v.length() > 0.15 ? v.normalize() : v.set(0, 0, 0);
    };
    const lx = (W.lift.x0 + W.lift.x1) / 2;
    const lz = (W.lift.z0 + W.lift.z1) / 2;
    const px = (W.perch.x0 + W.perch.x1) / 2;
    let stage = 'to the lift';
    let jumpAt = -1;
    for (let i = 0; i < 60 * 90 && stage !== 'on the ledge' && !stage.startsWith('fell'); i++) {
      const o: Partial<PlayerInput> = {};
      const liftTop = lift.aabb.max.y;
      const sz = mid(slider, 'z');
      if (stage === 'to the lift') {
        // He waits beside it until it is down, then hops on (it stands half a unit off the floor).
        if (liftTop < 0.7) {
          o.move = go(lx, lz);
          o.jumpPressed = p.grounded && p.position.y < 0.1 && p.position.x > W.lift.x0 - 1.4 && i % 30 === 0;
          o.jumpHeld = true;
        }
        if (p.grounded && Math.abs(p.position.y - liftTop) < 0.05 && Math.hypot(p.position.x - lx, p.position.z - lz) < 0.6) stage = 'going up';
      } else if (stage === 'going up') {
        if (liftTop > W.perch.top - 0.05) o.move = go(px, lz);
        if (p.position.x > W.perch.x0 + 0.4 && p.grounded && Math.abs(p.position.y - W.perch.top) < 0.05) stage = 'on the perch';
      } else if (stage === 'on the perch') {
        // He stands at its north edge; when the slider is at its near end, he hops across.
        o.move = go(px, W.perch.z0 + 0.4);
        if (sz > (W.slider.z0 + W.slider.z1) / 2 - 0.2 && Math.abs(p.position.z - (W.perch.z0 + 0.4)) < 0.3) {
          stage = 'hopping';
          jumpAt = i + 1;
        }
      } else if (stage === 'hopping') {
        o.move = new THREE.Vector3(0, 0, -1);
        o.jumpPressed = i === jumpAt;
        o.jumpHeld = true;
        if (i > jumpAt + 10 && p.grounded) stage = Math.abs(p.position.y - slider.aabb.max.y) < 0.05 && p.position.z < W.slider.z1 + 0.1 ? 'on the slider' : `fell short of the slider (${p.position.y.toFixed(1)} up)`;
      } else if (stage === 'on the slider') {
        // He stands on it while it goes north; at the far end, a run, a jump and an early double jump up to the ledge.
        o.move = go(px + 0.6, sz);
        if (sz < (W.slider.z0 + W.slider.z1) / 2 - W.slider.travel + 0.1) {
          stage = 'leaping';
          jumpAt = -1;
        }
      } else if (stage === 'leaping') {
        o.move = go(W.ledge.x0 + 1.5, W.ledge.z1 - 3);
        const edge = p.position.z < slider.aabb.min.z + 0.6 && p.grounded && jumpAt < 0;
        if (edge) jumpAt = i;
        o.jumpPressed = edge || (jumpAt >= 0 && i === jumpAt + second) || p.state === 'hang';
        o.jumpHeld = true;
        if (jumpAt >= 0 && i > jumpAt + 10 && p.grounded) {
          if (Math.abs(p.position.y - W.ledge.top) < 0.05) stage = 'on the ledge';
          else if (p.position.y < W.slider.top - 1) stage = `fell from the leap (${p.position.y.toFixed(1)} up)`;
        }
      }
      tick(o);
    }
    // (On the ledge, he walks to the hunk.)
    const hunk = itemAt(45.5, -44.5);
    for (let i = 0; i < 90 && stage === 'on the ledge'; i++) tick({ move: go(hunk.x, hunk.z) });
    return { stage, took: clock - began, t };
  };
  for (const [startWait, second] of [[0, 12], [3.7, 18], [8.1, 12]] as Array<[number, number]>) {
    const r = ride(startWait, second);
    check(
      `the Winch, come to ${startWait} s into its round: up the lift, onto the perch, across to the slider when it comes, north on it and up to the ledge, and he has the hunk`,
      r.stage === 'on the ledge'
        && r.t.worth(def.id, 'crumb').have === 8,
      `${r.stage}; ${r.took.toFixed(0)} s`
    );
  }
  const late = ride(0, 24);
  check(
    '...the jump up to the ledge wants its double jump early: left late he is under the ledge by then, and falls',
    late.stage.startsWith('fell from the leap'),
    late.stage
  );
}

// ---- The old drain's roof: along the top of the Bastion's wall, and a hop off the end of it ----
{
  const wall = cs.find((b) => Math.abs(b.max.y - 6.5) < 1e-6 && b.min.z === 11 && b.max.z === 12)!;
  const t = purse();
  // From the fort's floor inside, by its south wall: a jump and a double jump onto the wall top.
  const p = new PlayerController(new THREE.Vector3(-34, 3, 9.6));
  for (let i = 0; i < 10; i++) p.update(DT, inp({}), cs);
  const south = new THREE.Vector3(0, 0, 1);
  p.update(DT, inp({ move: south, jumpPressed: true, jumpHeld: true }), cs);
  for (let i = 0; i < 200; i++) {
    p.update(DT, inp({ move: p.position.y > wall.max.y - 0.2 ? south.clone().multiplyScalar(Math.max(-1, Math.min(1, (11.5 - p.position.z) * 3))) : south, jumpPressed: i === 18 || p.state === 'hang', jumpHeld: true }), cs);
    if (p.grounded && i > 20) break;
  }
  const onWall = p.grounded && Math.abs(p.position.y - wall.max.y) < 0.05 && p.position.z > 11 && p.position.z < 12;
  check(
    'from the fort\'s floor he gets up onto the top of its south wall',
    onWall,
    `at ${p.position.x.toFixed(1)}, ${p.position.y.toFixed(2)}, ${p.position.z.toFixed(2)}`
  );
  // West along the top of the wall (it is one unit wide), to above the old drain's room.
  let fell = false;
  for (let i = 0; i < 600 && p.position.x > DRAIN_ROOF.x; i++) {
    p.update(DT, inp({ move: new THREE.Vector3(-1, 0, Math.max(-0.5, Math.min(0.5, (11.5 - p.position.z) * 2))).normalize() }), cs);
    if (p.position.y < wall.max.y - 0.1) fell = true;
  }
  check(
    '...walks west along the top of it',
    !fell
      && p.grounded
      && Math.abs(p.position.x - DRAIN_ROOF.x) < 0.3,
    `at ${p.position.x.toFixed(1)}, ${p.position.y.toFixed(2)}`
  );
  // And a hop south off it onto the roof.
  for (let i = 0; i < 20; i++) p.update(DT, inp({}), cs);
  p.update(DT, inp({ move: south, jumpPressed: true, jumpHeld: true }), cs);
  for (let i = 0; i < 240; i++) {
    const to = new THREE.Vector3(DRAIN_ROOF.x - p.position.x, 0, DRAIN_ROOF.z - p.position.z);
    p.update(DT, inp({ move: to.length() > 0.2 ? to.normalize() : to.set(0, 0, 0), jumpHeld: true }), cs);
    pick(t, p);
  }
  check(
    '...and hops off its end onto the roof of the old drain\'s room, and has the hunk',
    p.grounded
      && Math.abs(p.position.y - DRAIN_ROOF.top) < 0.05
      && t.worth(def.id, 'crumb').have === 8,
    `at ${p.position.x.toFixed(1)}, ${p.position.y.toFixed(2)}, ${p.position.z.toFixed(1)}`
  );
}

// ---- No way past: with its route's key piece gone, the checker finds no way to each thing ----
{
  const whole = computeReach(def);
  check('with everything in place the checker can reach every one of them', unreachable(def, whole).length === 0);
  const lost = (drop: (b: Box) => boolean, moverDrop?: (m: NonNullable<LevelDef['movers']>[number]) => boolean): string[] => {
    const cut = { ...def, solids: def.solids.filter((b) => !drop(b)), movers: (def.movers ?? []).filter((m) => !moverDrop?.(m)) };
    return unreachable(cut, computeReach(cut)).filter((b) => b.what === 'cap' || b.what === 'crumb').map((b) => def.collectibles.find((c) => Math.hypot(c.x - b.x, c.z - b.z) < 0.01)!.id.split(':').slice(1).join(' '));
  };
  const id = (x: number, z: number): string => itemAt(x, z).id.split(':').slice(1).join(' ');
  const spiral = (b: Box): boolean => b.kind === 'platform' && Math.hypot((b.x0 + b.x1) / 2, (b.z0 + b.z1) / 2) < 8 && b.y1 < 11.5;
  const bastion = (b: Box): boolean => b.x1 <= -22 && b.z0 >= -12 && b.z1 <= 12 && b.y1 > 0.5;
  const teeth = (b: Box): boolean => b.kind === 'pillar' && b.z0 >= 23 && b.x1 <= -20 && b.x0 >= -40;
  const cases: Array<[string, string[], string[]]> = [
    ['the Cleft\'s south wall (one wall is not a chimney)', lost((b) => b.z0 === CLEFT.southZ0 && b.x0 === CLEFT.x0), [id((CLEFT.x0 + CLEFT.x1) / 2, (CLEFT.northZ0 + CLEFT.northZ1) / 2)]],
    ['the Flue\'s wall', lost((b) => b.x0 === FLUE.x0 && b.y1 === FLUE.top), [id((FLUE.x0 + FLUE.x1) / 2, (FLUE.z0 + FLUE.z1) / 2)]],
    ['the spiral', lost(spiral), [id(0, -6.2), id((OUTRIGGER.x0 + OUTRIGGER.x1) / 2, (OUTRIGGER.z0 + OUTRIGGER.z1) / 2)]],
    ['the Winch\'s slider', lost(() => false, (m) => m.to[2] !== 0), [id(45.5, -44.5)]],
    ['the Winch\'s lift', lost(() => false, (m) => m.to[1] !== 0 && m.x > 35), [id(45.5, -44.5)]],
    ['the Bastion', lost(bastion), [id(-43, 2), id(DRAIN_ROOF.x, DRAIN_ROOF.z)]],
    ['the Teeth', lost(teeth), [id(-25, 24)]],
  ];
  for (const [what, gone, want] of cases) check(`without ${what}: ${want.join(' and ')} cannot be got, and everything else still can`, gone.slice().sort().join(',') === want.slice().sort().join(','), `out of reach: ${gone.join(', ') || 'nothing'}`);
  // The two short cuts the checker found while this was being built, each closed by moving something.
  const old1 = { ...def, solids: [...def.solids.filter((b) => !spiral(b)), { kind: 'platform', x0: -1.9, x1: 1.3, y0: 6.5, y1: 7, z0: 17.2, z1: 20.4 } as Box] };
  check(
    '(a slab hung seven up over the south end of the bridge, where the Outrigger first was, can be got from the grand stairs with no spiral at all: that is why it is not there)',
    computeReach(old1).near(-0.3, 7, 18.8, 1.2, 0.3, 0.3)
  );
  const old2 = { ...def, solids: [...def.solids.filter((b) => !bastion(b)), { kind: 'pillar', x0: -36, x1: -34, y0: 0, y1: 3.5, z0: 30, z1: 32 } as Box] };
  check(
    '(with the second of the Teeth where it used to stand, the old drain\'s roof can be got from it with no Bastion at all: that is why it was moved a unit)',
    computeReach(old2).near(DRAIN_ROOF.x, DRAIN_ROOF.top, DRAIN_ROOF.z, 3, 0.3, 0.3)
  );
}

console.log(failures === 0 ? 'cistern: all pass' : `cistern: ${failures} FAIL`);
process.exit(failures ? 1 : 0);
