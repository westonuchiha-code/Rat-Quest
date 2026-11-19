// The Foundry: each landmark can only be reached the way it is meant to be, and the Slag Run's widest gap can be made
// with a real double jump (with some room for timing).
import * as THREE from 'three';
import { PlayerController, PlayerInput } from '../src/player/controller';
import { makeAabb } from '../src/world/collision';
import { computeReach, maxClimb, maxChimney, unreachable } from '../src/levels/reach';
import { CollectibleTracker } from '../src/world/collectibles';
import { TUNING } from '../src/data/tuning';
import type { Box } from '../src/world/layout';
import type { LevelDef } from '../src/levels/types';
import { foundry, foundryShaft, foundryCellars, BEAMS, CRUCIBLE, RUN, FINS, STACK, HEAPS_TOP, TRAY, CLINKERS, CLINKER, FOUNDRY_WEDGES } from '../src/levels/foundry';
import { LEVELS } from '../src/levels/levels';
import { HUB_DOORS } from '../src/levels/junction';

const DT = 1 / 60;
let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}
const def = foundry();
const reaches = (d: LevelDef, x: number, y: number, z: number): boolean => computeReach(d).near(x, y + 0.5, z, 0.9, 1, 1);
const TOP = { x: 0, y: CRUCIBLE, z: -6 };
const LADLE = { x: 26, y: RUN, z: -27.5 };
const STORE = { x: 43, y: 0, z: 12 };

check(
  'the Foundry is in the world, with its two side areas',
  def.world === 'foundry'
    && foundryShaft().returnTo === 'foundry'
    && foundryCellars().returnTo === 'foundry'
    && LEVELS.some((l) => l.id === 'shaft')
    && LEVELS.some((l) => l.id === 'coalcellars')
);
check('the Club\'s east door leads to the Foundry, for five wedges', HUB_DOORS.some((d) => d.to === 'foundry' && d.need === 5));
check(
  'it has six wedges here (one a secret) and six in its side areas (one a secret)',
  (def.wedges?.length ?? 0) === 6
    && (foundryShaft().wedges?.length ?? 0) + (foundryCellars().wedges?.length ?? 0) === 6
);
check(
  'the top of the Crucible, the Ladle and the storehouse can all be reached',
  reaches(def, TOP.x, TOP.y, TOP.z)
    && reaches(def, LADLE.x, LADLE.y, LADLE.z)
    && reaches(def, STORE.x, STORE.y, STORE.z)
);

// Without the pistons the Crucible cannot be climbed; without the last one, the top shelf is a dead end.
const pistons = (def.movers ?? []).filter((m) => Math.abs(m.x) < 10 && m.z < 3 && m.z > -15);
check('the Crucible has three pistons', pistons.length === 3, `${pistons.length}`);
const last = pistons.reduce((a, b) => (a.to[1] > b.to[1] ? a : b));
check(
  'without the pistons the Crucible cannot be climbed',
  !reaches({ ...def, movers: (def.movers ?? []).filter((m) => !pistons.includes(m)) }, TOP.x, TOP.y, TOP.z)
);
check(
  'without the last piston the top is out of reach from the top shelf',
  !reaches({ ...def, movers: (def.movers ?? []).filter((m) => m !== last) }, TOP.x, TOP.y, TOP.z)
);

// Without the beams the Ladle cannot be reached: it is too tall to climb from the bank.
const isBeam = (b: { x0: number; x1: number; y1: number }): boolean => BEAMS.some((m) => m.x0 === b.x0 && m.x1 === b.x1) && Math.abs(b.y1 - RUN) < 0.01;
check('without the beams the Ladle is out of reach', !reaches({ ...def, solids: def.solids.filter((b) => !isBeam(b)) }, LADLE.x, LADLE.y, LADLE.z));

// With the gate shut, the storehouse (and the door to the cellars) is out of reach.
const gate = def.gates?.[0];
check('the storehouse gate opens on the pipes', !!gate && (gate.pipes?.length ?? 0) === 3);
// (The jump checker lets jumps pass over walls, so this is checked as heights: the walls and the roof over them are taller
// than his best climb, and the roof itself can't be reached.)
const store = def.solids.filter((b) => b.x0 >= 38 && b.x1 <= 48 && b.z0 >= 4 && b.z1 <= 16 && !b.hidden);
const roof = store.find((b) => b.x1 - b.x0 > 5 && b.z1 - b.z0 > 5);
// (Since its things to find were redone there IS a way onto the roof, and one only: up the Stack beside it.)
const noStackDef = { ...def, solids: def.solids.filter((b) => !(b.x0 === STACK.x0 && b.x1 === STACK.x1 && b.z0 === STACK.z0)) };
check(
  'the storehouse has a roof too high to climb onto: without the Stack beside it, nothing reaches it',
  !!roof
    && roof.y0 > maxClimb()
    && !reaches(noStackDef, 43, roof.y1, 6)
    && reaches(def, 43, roof.y1, 6)
);
check('its walls rise to the roof, leaving only the gate', store.filter((b) => b.kind === 'wall').every((b) => b.y1 >= (roof?.y0 ?? 99) - 0.01));

// The widest gap on the Slag Run, played with the real controller: run off one beam, double jump, land on the next.
const cs = def.solids.map((b) => makeAabb((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, (b.z0 + b.z1) / 2, b.x1 - b.x0, b.y1 - b.y0, b.z1 - b.z0));
const inp = (o: Partial<PlayerInput>): PlayerInput => ({ move: new THREE.Vector3(), run: true, jumpPressed: false, jumpHeld: false, attackPressed: false, dodgeHeld: false, dodgePressed: false, guardHeld: false, stowPressed: false, ...o } as PlayerInput);
function hop(from: number, to: number, second: number): boolean {
  const a = BEAMS[from];
  const b = BEAMS[to];
  const p = new PlayerController(new THREE.Vector3(a.x0 + 0.5, RUN, -27.5));
  for (let t = 0; t < 5; t++) p.update(DT, inp({}), cs);
  const east = new THREE.Vector3(1, 0, 0);
  let jumped = -1;
  for (let t = 0; t < 300; t++) {
    const go = jumped < 0 && p.position.x > a.x1 - 0.35;
    if (go) jumped = t;
    const again = jumped >= 0 && t === jumped + second;
    p.update(DT, inp({ move: east, jumpPressed: go || again, jumpHeld: true }), cs);
    if (jumped >= 0 && t > jumped + 5 && p.grounded) return Math.abs(p.position.y - RUN) < 0.05 && p.position.x > b.x0;
    if (p.position.y < RUN - 3) return false;
  }
  return false;
}
const widest = BEAMS.length - 2;
const ok = [];
for (let k = 4; k <= 40; k++) if (hop(widest, widest + 1, k)) ok.push(k);
check('the widest gap (9) can be crossed with a double jump', ok.length > 0);
check('...with some room in when the second jump is pressed', ok.length >= 6, `works pressing it ${ok[0]}-${ok[ok.length - 1]} frames after the first`);

// ======================================================================================================================
// THE THINGS TO FIND, the Cistern's way: three caps and two hunks, each at the end of a piece of movement of its own.
{
  const cs = def.solids.map((b) => {
    const a = makeAabb((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, (b.z0 + b.z1) / 2, b.x1 - b.x0, b.y1 - b.y0, b.z1 - b.z0);
    return a;
  });
  const inp = (o: Partial<PlayerInput>): PlayerInput => ({ move: new THREE.Vector3(), run: true, jumpPressed: false, jumpHeld: false, attackPressed: false, dodgeHeld: false, dodgePressed: false, guardHeld: false, stowPressed: false, sneak: false, ...o } as PlayerInput);
  const purse = (): CollectibleTracker => new CollectibleTracker([{ id: def.id, name: def.name, items: def.collectibles }], null);
  const pick = (t: CollectibleTracker, p: PlayerController): void => void t.tryCollect(def.id, p.position, TUNING.rat.radius, TUNING.rat.height);
  const itemAt = (x: number, z: number) => def.collectibles.find((c) => Math.hypot(c.x - x, c.z - z) < 0.6)!;
  const caps = def.collectibles.filter((c) => c.kind === 'cap');
  const cheese = def.collectibles.filter((c) => c.kind === 'crumb');
  check(
    'there are three bottle caps and two hunks of cheese and nothing else: five things where there were twenty-seven',
    caps.length === 3
      && cheese.length === 2
      && def.collectibles.length === 5
  );
  check(
    'the two hunks are worth what the hall\'s nineteen crumbs were',
    purse().worth(def.id, 'crumb').total === 19
      && cheese.every((c) => (c.worth ?? 1) >= 9 && /:hunk:\d\d$/.test(c.id)),
    cheese.map((c) => c.worth).join('+')
  );
  check(
    'none of it is in a crate or on a floor, and no two are within twelve of each other: there are no trails',
    def.collectibles.every((c) => c.crate === undefined && c.y > 4)
      && def.collectibles.every((a) => def.collectibles.every((b) => a === b || Math.hypot(a.x - b.x, a.z - b.z) >= 12)),
    `lowest ${Math.min(...def.collectibles.map((c) => c.y)).toFixed(1)}`
  );
  const w = FOUNDRY_WEDGES.find((x) => x.id === 'caps')!;
  check(
    'the wedge for the caps asks for three, and says where each is',
    w.name === 'Three Bottle Caps'
      && w.appears?.type === 'collect'
      && /Fins/.test(w.hint)
      && /Stack/.test(w.hint)
      && /Heaps/.test(w.hint)
  );

  /** Kicks from wall to wall along z (the Cistern's test has the same): jump pressed `delay` frames after each wall is touched; over `top` he makes for `land`. */
  const kickUp = (start: THREE.Vector3, first: number, top: number, land: number, delay: number, t?: CollectibleTracker): PlayerController => {
    const p = new PlayerController(start.clone());
    for (let i = 0; i < 10; i++) p.update(DT, inp({}), cs);
    let dir = first;
    let wait = -1;
    const mv = (d: number): THREE.Vector3 => new THREE.Vector3(0, 0, d);
    p.update(DT, inp({ move: mv(dir), jumpPressed: true, jumpHeld: true }), cs);
    for (let i = 0; i < 700; i++) {
      const before = p.velocity.z;
      const press = wait === 0;
      if (press) dir = -dir;
      let move = mv(dir);
      if (p.position.y > top + 0.15 && wait < 0) {
        const d = land - p.position.z;
        const v = p.velocity.z;
        const stop = (v * v) / (2 * 20);
        move = mv(Math.abs(d) < stop + 0.3 && Math.sign(v) === Math.sign(d) ? -Math.sign(v) : Math.sign(d) * Math.min(1, Math.abs(d) * 3));
      }
      p.update(DT, inp({ move, jumpPressed: press, jumpHeld: true }), cs);
      if (t) pick(t, p);
      if (wait > 0) wait--;
      else if (wait === 0) wait = -1;
      if (wait < 0 && !p.grounded && Math.sign(before) === dir && Math.abs(before) > 0.5 && p.velocity.z === 0) wait = delay;
      if (p.grounded && (p.position.y > top - 0.1 || (i > 30 && p.position.y < start.y + 0.1))) break;
    }
    return p;
  };
  /** A jump and a second jump straight up from there, no kicks: how high his feet get. */
  const hopUp = (start: THREE.Vector3): number => {
    const p = new PlayerController(start.clone());
    for (let i = 0; i < 10; i++) p.update(DT, inp({}), cs);
    p.update(DT, inp({ jumpPressed: true, jumpHeld: true }), cs);
    let top = 0;
    for (let i = 0; i < 200; i++) {
      p.update(DT, inp({ jumpPressed: i === 28, jumpHeld: true }), cs);
      top = Math.max(top, p.position.y);
    }
    return top;
  };
  /**
   * From a standing start he runs at `to` (x, z) and jumps on frame `d` (again `e` frames later if e >= 0), catching
   * and climbing any edge he meets. Where he ends up standing.
   */
  const leap = (p: PlayerController, to: [number, number], d: number, e: number, t?: CollectibleTracker): PlayerController => {
    let hung = 0;
    for (let i = 0; i < 260; i++) {
      const dx = to[0] - p.position.x;
      const dz = to[1] - p.position.z;
      const far = Math.hypot(dx, dz);
      const move = far > 0.2 ? new THREE.Vector3(dx / far, 0, dz / far) : new THREE.Vector3();
      hung = p.state === 'hang' ? hung + 1 : 0;
      p.update(DT, inp({ move, jumpPressed: i === d || (e >= 0 && i === d + e) || hung === 8, jumpHeld: i >= d && (hung === 0 || hung >= 8) }), cs);
      if (t) pick(t, p);
      if (i > d + 8 && p.grounded) break;
    }
    return p;
  };
  const stand = (x: number, y: number, z: number): PlayerController => {
    const p = new PlayerController(new THREE.Vector3(x, y + 0.01, z));
    for (let i = 0; i < 10; i++) p.update(DT, inp({}), cs);
    return p;
  };

  // ---- The Fins ----
  const finsMid = (FINS.x0 + FINS.x1) / 2;
  for (const [delay, how] of [[2, 'quickly'], [8, 'a little late']] as Array<[number, string]>) {
    const t = purse();
    const p = kickUp(new THREE.Vector3(finsMid, 0, FINS.a.z1 + 0.4), -1, FINS.top, (FINS.b.z0 + FINS.b.z1) / 2, delay, t);
    check(
      `THE FINS, kicking ${how}: up between the two walls from the floor, he comes out on top of the thicker one and has its cap`,
      p.grounded
        && Math.abs(p.position.y - FINS.top) < 0.05
        && t.isCollected(itemAt(finsMid, (FINS.b.z0 + FINS.b.z1) / 2).id),
      `at z ${p.position.z.toFixed(2)}, ${p.position.y.toFixed(2)} up`
    );
  }
  check(
    '...and not without kicking: a jump and a second jump from the floor between them get nowhere near the top',
    hopUp(new THREE.Vector3(finsMid, 0, 6.1)) < FINS.top - 3,
    `${hopUp(new THREE.Vector3(finsMid, 0, 6.1)).toFixed(2)} of ${FINS.top}`
  );
  check(
    'the Fins are a chimney he can kick up (2.2 apart), further from the hall\'s wall than a kick carries, the thin one taller than the thick (so he lands on the thick), and the landing thick enough to come down on',
    Math.abs(FINS.b.z0 - FINS.a.z1 - 2.2) < 1e-9
      && FINS.x0 - -48 > maxChimney()
      && FINS.a.top > FINS.top + 2
      && FINS.b.z1 - FINS.b.z0 >= 2.4
  );

  // ---- The Stack ----
  const stackMid = (STACK.x0 + STACK.x1) / 2;
  for (const [delay, how] of [[2, 'quickly'], [8, 'a little late']] as Array<[number, string]>) {
    const t = purse();
    const p = kickUp(new THREE.Vector3(stackMid, 0, STACK.z0 - 0.4), 1, STACK.roof, STACK.face - 2.5, delay, t);
    const onRoof = p.grounded && Math.abs(p.position.y - STACK.roof) < 0.05 && p.position.z < STACK.face;
    // Across the roof to the cap.
    if (onRoof) for (let i = 0; i < 240 && !t.isCollected(itemAt(STACK.cap.x, STACK.cap.z).id); i++) {
      const dx = STACK.cap.x - p.position.x;
      const dz = STACK.cap.z - p.position.z;
      p.update(DT, inp({ move: new THREE.Vector3(dx, 0, dz).normalize() }), cs);
      pick(t, p);
    }
    check(
      `THE STACK, kicking ${how}: up between the wall and the Storehouse, out onto the Storehouse roof, and across it to the cap`,
      onRoof
        && t.isCollected(itemAt(STACK.cap.x, STACK.cap.z).id),
      `on the roof at z ${p.position.z.toFixed(2)}, ${p.position.y.toFixed(2)} up`
    );
  }
  check(
    '...and the roof is over anything a jump, a second jump and a caught edge can climb',
    STACK.roof > maxClimb() + 0.5
      && hopUp(new THREE.Vector3(stackMid, 0, STACK.face + 1.1)) < STACK.roof - 1.5,
    `${STACK.roof} against ${maxClimb().toFixed(2)}`
  );
  check('the Stack stands 2.2 off the Storehouse, five from the hall\'s wall', Math.abs(STACK.z0 - STACK.face - 2.2) < 1e-9 && 48 - STACK.x1 >= 5);

  // ---- The Heaps ----
  {
    const piles = def.solids.filter((b) => b.kind === 'pillar' && b.x0 >= 33 && b.z1 <= -40).sort((a, b) => a.y1 - b.y1);
    const t = purse();
    let p = stand((piles[0].x0 + piles[0].x1) / 2 - 3, 0, (piles[0].z0 + piles[0].z1) / 2);
    let ok = true;
    for (const pile of piles) {
      // (Each hop at whichever of a few timings lands it: one jump, or a jump and a second.)
      let landed: PlayerController | null = null;
      for (const [d, e] of [[10, -1], [10, 14], [14, 10], [6, 18]] as Array<[number, number]>) {
        const q = new PlayerController(p.position.clone());
        for (let i = 0; i < 4; i++) q.update(DT, inp({}), cs);
        const r = leap(q, [(pile.x0 + pile.x1) / 2, (pile.z0 + pile.z1) / 2], d, e, t);
        if (r.grounded && Math.abs(r.position.y - pile.y1) < 0.05) {
          landed = r;
          break;
        }
      }
      if (!landed) {
        ok = false;
        break;
      }
      p = landed;
    }
    check(
      'THE HEAPS: four piles hopped one after another, each higher, and the cap is on the last',
      piles.length === 4
        && ok
        && t.isCollected(itemAt(HEAPS_TOP.x, HEAPS_TOP.z).id),
      `ended ${p.position.y.toFixed(2)} up`
    );
    check('...and the last pile is too high to get onto from the floor', HEAPS_TOP.top > maxClimb() + 0.3);
  }

  // ---- The Drip Tray ----
  {
    let made = 0;
    let got = 0;
    for (let e = 12; e <= 30; e += 2) {
      const t = purse();
      const p = leap(stand((TRAY.x0 + TRAY.x1) / 2, RUN, -27.5), [(TRAY.x0 + TRAY.x1) / 2, (TRAY.z0 + TRAY.z1) / 2], 16, e, t);
      if (p.grounded && Math.abs(p.position.y - TRAY.top) < 0.05) made++;
      if (t.isCollected(itemAt((TRAY.x0 + TRAY.x1) / 2, (TRAY.z0 + TRAY.z1) / 2).id)) got++;
    }
    check(
      'THE DRIP TRAY: from the run\'s first beam, a running jump, a second jump and a caught edge put him on it, at more than one timing; and its hunk is his',
      made >= 3
        && got >= 3,
      `${made} of 10 timings`
    );
    check(
      '...it is three and a half over the beam and four and more off it: not a step, and the lava is under the gap',
      TRAY.top - RUN === 3.5
        && TRAY.z0 - -25 >= 4.39
    );
  }

  // ---- The Clinkers ----
  {
    let best = 0;
    let got = false;
    for (const d of [8, 12, 16]) for (const e of [-1, 12, 18]) {
      const t = purse();
      let p = stand(31.5, 0, CLINKERS[0][1]);
      let n = 0;
      for (const [x, z, top] of CLINKERS) {
        p = leap(p, [x, z], d, e, t);
        if (p.grounded && Math.abs(p.position.y - top) < 0.05) n++;
        else break;
      }
      best = Math.max(best, n);
      got ||= n === 3 && t.isCollected(itemAt(CLINKERS[2][0], CLINKERS[2][1]).id);
    }
    check(
      'THE CLINKERS: from the east bank, three lumps in the lava jumped one after another, each further out and higher; the hunk is on the last',
      best === 3
        && got,
      `${best} of 3`
    );
    check('...each is a real jump (four or more of lava between) and none can be walked or stepped to', CLINKERS.every(([x, z, top], i) => {
      const from = i === 0 ? [30, z, 0] : CLINKERS[i - 1];
      const gap = Math.hypot(x - from[0], z - from[1]) - CLINKER - (i === 0 ? 0 : CLINKER);
      return gap >= 3.4 && top - from[2] > 1.2;
    }));
  }

  // ---- No way past: with its route's key piece gone, the checker finds no way to that thing (and still finds the others) ----
  {
    check(
      'with everything in place the checker can reach every one of them',
      unreachable(def, computeReach(def)).filter((b) => b.what === 'cap' || b.what === 'crumb').length === 0
    );
    const lost = (drop: (b: Box) => boolean, opts: { chimney?: number } = {}): string[] => {
      const cut = { ...def, solids: def.solids.filter((b) => !drop(b)) };
      return unreachable(cut, computeReach(cut, opts)).filter((b) => b.what === 'cap' || b.what === 'crumb').map((b) => def.collectibles.find((c) => Math.hypot(c.x - b.x, c.z - b.z) < 0.01)!.id.split(':').slice(1).join(' '));
    };
    const same = (b: Box, x0: number, x1: number, z0: number, z1: number): boolean => b.x0 === x0 && b.x1 === x1 && b.z0 === z0 && b.z1 === z1;
    const noFin = lost((b) => same(b, FINS.x0, FINS.x1, FINS.a.z0, FINS.a.z1));
    check('without the Fins\' second wall, their cap is out of reach, and only theirs', noFin.join() === 'cap 01', noFin.join(', '));
    const noStack = lost((b) => same(b, STACK.x0, STACK.x1, STACK.z0, STACK.z1));
    check('without the Stack, the cap on the Storehouse roof is out of reach, and only that', noStack.join() === 'cap 02', noStack.join(', '));
    const lower = (b: Box): boolean => b.kind === 'pillar' && b.x0 >= 33 && b.z1 <= -40 && b.y1 < HEAPS_TOP.top;
    const noPiles = lost(lower);
    const noPilesNoKicks = lost(lower, { chimney: 0 });
    check(
      'the highest heap has TWO ways up, and both are movement: the piles; or, with the piles gone, a wall kick between it and the hall\'s wall (two off it). With neither, it is out of reach',
      noPiles.length === 0
        && noPilesNoKicks.includes('cap 03'),
      `without the piles: ${noPiles.join(', ') || 'still got'}; without kicks as well: ${noPilesNoKicks.join(', ')}`
    );
    const noBeam = lost((b) => b.x0 === BEAMS[0].x0 && b.x1 === BEAMS[0].x1 && Math.abs(b.y1 - RUN) < 0.01);
    check(
      'without the run\'s first beam, the Drip Tray\'s hunk is out of reach (the Hopper is too far from it, and nothing else is near)',
      noBeam.includes('hunk 01'),
      noBeam.join(', ')
    );
    const noLumps = lost((b) => CLINKERS.slice(0, 2).some(([x, z]) => Math.abs((b.x0 + b.x1) / 2 - x) < 0.01 && Math.abs((b.z0 + b.z1) / 2 - z) < 0.01));
    check(
      'without the first two Clinkers, the hunk on the third is out of reach, and only that: not from the dock, nor the island',
      noLumps.join() === 'hunk 02',
      noLumps.join(', ')
    );
  }
}

console.log(failures === 0 ? 'foundry: all pass' : `foundry: ${failures} FAIL`);
process.exit(failures ? 1 : 0);
