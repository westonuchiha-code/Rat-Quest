// The Hollows: each landmark is reached the way it is meant to be, the long jump off the Lip lands on Spider Rock (and
// it is a real leap), and a fall into the chasm costs a heart instead of the walk back from the start.
import * as THREE from 'three';
import { PlayerController, PlayerInput } from '../src/player/controller';
import { makeAabb } from '../src/world/collision';
import { computeReach, maxClimb, maxChimney, unreachable } from '../src/levels/reach';
import { CollectibleTracker } from '../src/world/collectibles';
import { buildChamber } from '../src/world/chamber';
import { TUNING } from '../src/data/tuning';
import type { Box } from '../src/world/layout';
import type { LevelDef } from '../src/levels/types';
import { hollows, hollowsWebs, hollowsFaith, CAPS, HIGH, LIP, ROCK, ROCK_BOX, STONES, NEEDLE, SPIRE, CLEFT, DRIP, BAT_BRIDGE } from '../src/levels/hollows';
import { Bat } from '../src/enemies/bat';
import { resolveCombat, type CombatEvents } from '../src/combat/combat';
import { FEELS } from '../src/data/feel';
import { aabbOf } from '../src/world/collision';
import { LEVELS } from '../src/levels/levels';
import { HUB_DOORS } from '../src/levels/junction';
import { TRACK_NAMES } from '../src/audio/music';

const DT = 1 / 60;
let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}
const def = hollows();
const reaches = (d: LevelDef, x: number, y: number, z: number): boolean => computeReach(d).near(x, y + 0.5, z, 0.9, 1, 1);
const sameBox = (b: { x0: number; x1: number; z0: number; z1: number }, s: { x0: number; x1: number; z0: number; z1: number }): boolean => b.x0 === s.x0 && b.x1 === s.x1 && b.z0 === s.z0 && b.z1 === s.z1;

check(
  'the Hollows is in the world, with its two side areas',
  def.world === 'hollows'
    && hollowsWebs().returnTo === 'hollows'
    && hollowsFaith().returnTo === 'hollows'
    && ['webs', 'faith'].every((id) => LEVELS.some((l) => l.id === id))
);
check('the Club\'s north door leads to the Hollows, for twelve wedges', HUB_DOORS.some((d) => d.to === 'hollows' && d.need === 12));
check('falls in the Hollows cost a heart and put him back (not back at the start)', def.fallBack === true);
check('the Hollows has its own music', def.music === 'echo' && TRACK_NAMES.includes('echo'));
check('Leap of Faith keeps its rules: no grabbing, no long jump', hollowsFaith().noGrab === true && hollowsFaith().noLongJump === true);

// Spider Rock: by the long jump off the Lip, or the slider and a jump. Neither alone is taken away by the other.
const slider = (def.movers ?? []).filter((m) => m.x > 20);
const noSlider = { ...def, movers: (def.movers ?? []).filter((m) => !slider.includes(m)) };
check('there is one slider out to Spider Rock', slider.length === 1);
check('Spider Rock can be reached', reaches(def, 0, ROCK, 3));
check('...by the long jump alone (no slider)', reaches(noSlider, 0, ROCK, 3));
check('...by the slider alone (no long jump in the checker)', reaches({ ...def, noLongJump: true }, 0, ROCK, 3));
check('without a long leap or the slider it cannot be reached', !reaches({ ...noSlider, noLongJump: true }, 0, ROCK, 3));

// The Faith Stones: the middle one is only reached along the stones (or by dropping off the rock).
const mid = STONES[3];
const stonesOff = { ...def, solids: def.solids.filter((b) => !STONES.some((s) => s !== mid && sameBox(b, s)) && !sameBox(b, ROCK_BOX)) };
check('the middle Faith Stone cannot be reached without the stones either side', !reaches(stonesOff, -10, 0, -5));

// The High Hollow: only up the mushrooms.
const capsOff = { ...def, solids: def.solids.filter((b) => !CAPS.slice(1).some((c) => b.x0 >= c.x - 2 && b.x1 <= c.x + 2 && b.z0 >= c.z - 2 && b.z1 <= c.z + 2)) }; // caps and stalks
check('the High Hollow is only reached up the mushrooms', reaches(def, -1, HIGH, -46) && !reaches(capsOff, -1, HIGH, -46));

// Played with the real controller off the end of the Lip.
const cs = def.solids.map((b) => makeAabb((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, (b.z0 + b.z1) / 2, b.x1 - b.x0, b.y1 - b.y0, b.z1 - b.z0));
const inp = (o: Partial<PlayerInput>): PlayerInput => ({ move: new THREE.Vector3(), run: true, jumpPressed: false, jumpHeld: false, attackPressed: false, dodgeHeld: false, dodgePressed: false, guardHeld: false, stowPressed: false, ...o } as PlayerInput);
const north = new THREE.Vector3(0, 0, -1);
/** Runs north along the Lip and leaves it at `edge` (how far before the end), long or plain (plain: a second jump at `second`). */
function offTheLip(long: boolean, edge: number, second = -1): number | null {
  const p = new PlayerController(new THREE.Vector3(0, 16, 34));
  for (let t = 0; t < 5; t++) p.update(DT, inp({}), cs);
  let t = 0;
  while (p.position.z > LIP.z0 + edge && t++ < 400) p.update(DT, inp({ move: north }), cs);
  if (long) for (let k = 0; k < 3; k++) p.update(DT, inp({ move: north, run: false }), cs);
  p.update(DT, inp({ move: north, run: !long, jumpPressed: true, jumpHeld: true }), cs);
  for (let k = 0; k < 400; k++) {
    p.update(DT, inp({ move: north, run: !long, jumpPressed: k === second, jumpHeld: true }), cs);
    if (p.grounded) return p.position.y;
    if (p.position.y < -3) return null;
  }
  return null;
}
const longs = [0.4, 0.8, 1.2, 1.6, 2.0].filter((e) => {
  const y = offTheLip(true, e);
  return y !== null && Math.abs(y - ROCK) < 0.05;
});
check('a long jump off the end of the Lip lands on Spider Rock', longs.length > 0);
check('...from a little way back from the edge too (not pixel-perfect)', longs.length >= 3, `works leaving ${longs.join(', ')} before the end`);
check('it is a real leap: 13 or more out and 6 down', LIP.z0 - ROCK_BOX.z1 >= 13 && 16 - ROCK === 6);

// ======================================================================================================================
// THE THINGS TO FIND, the Cistern's way: two caps and two hunks (and the three relics), each at the end of a piece of
// movement of its own.
{
  const purse = (): CollectibleTracker => new CollectibleTracker([{ id: def.id, name: def.name, items: def.collectibles }], null);
  const pick = (t: CollectibleTracker, p: PlayerController): void => void t.tryCollect(def.id, p.position, TUNING.rat.radius, TUNING.rat.height);
  const itemAt = (x: number, z: number) => def.collectibles.find((c) => Math.hypot(c.x - x, c.z - z) < 0.6)!;
  const stand = (x: number, y: number, z: number): PlayerController => {
    const p = new PlayerController(new THREE.Vector3(x, y + 0.01, z));
    for (let i = 0; i < 10; i++) p.update(DT, inp({}), cs);
    return p;
  };
  /** Once he has landed: across the top he is on to the thing itself. */
  const walkTo = (p: PlayerController, x: number, z: number, t: CollectibleTracker, colliders = cs): void => {
    for (let i = 0; i < 90 && Math.hypot(x - p.position.x, z - p.position.z) > 0.1; i++) {
      p.update(DT, inp({ move: new THREE.Vector3(x - p.position.x, 0, z - p.position.z).normalize(), run: false }), colliders);
      pick(t, p);
    }
  };
  const caps = def.collectibles.filter((c) => c.kind === 'cap');
  const cheese = def.collectibles.filter((c) => c.kind === 'crumb');
  const relics = def.collectibles.filter((c) => c.kind === 'relic');
  check(
    'there are two bottle caps, two hunks of cheese and the three relics, and nothing else: seven things where there were twenty-five',
    caps.length === 2
      && cheese.length === 2
      && relics.length === 3
      && def.collectibles.length === 7
  );
  check(
    'the two hunks are worth what the cave\'s seventeen crumbs were',
    purse().worth(def.id, 'crumb').total === 17
      && cheese.every((c) => (c.worth ?? 1) >= 8 && /:hunk:\d\d$/.test(c.id)),
    cheese.map((c) => c.worth).join('+')
  );
  check(
    'none of it is in a crate or on a floor, and no two are within twelve of each other: there are no trails',
    def.collectibles.every((c) => c.crate === undefined && c.y > 3)
      && def.collectibles.every((a) => def.collectibles.every((b) => a === b || Math.hypot(a.x - b.x, a.z - b.z) >= 12))
  );

  // ---- The Drip Stone: off the side of the Lip at a walk, and back in under it ----
  {
    const zc = (DRIP.z0 + DRIP.z1) / 2;
    /** He goes off the Lip's side (side 1: east) and, `turn` frames after leaving it, steers back the other way. */
    const drop = (side: number, turn: number, steer: boolean, run: boolean): { p: PlayerController; got: boolean } => {
      const t = purse();
      const p = stand(side * 1.5, 16, zc);
      let left = -1;
      for (let i = 0; i < 400; i++) {
        if (left < 0 && !p.grounded) left = i;
        const back = steer && left >= 0 && i >= left + turn;
        p.update(DT, inp({ move: new THREE.Vector3(back ? -side : side, 0, 0), run }), cs);
        pick(t, p);
        if ((left >= 0 && p.grounded) || p.position.y < -3) break;
      }
      if (p.grounded && p.position.y > 0) walkTo(p, 0, zc, t);
      return { p, got: t.isCollected(itemAt(0, zc).id) };
    };
    const lands = (r: { p: PlayerController; got: boolean }): boolean => r.p.grounded && Math.abs(r.p.position.y - DRIP.top) < 0.05 && r.got;
    check(
      'THE DRIP STONE: stepping off the Lip\'s side at a walk and steering straight back under it, he lands on the stone and has its hunk; from either side',
      lands(drop(1, 0, true, false))
        && lands(drop(-1, 0, true, false))
    );
    check(
      '...with a little room in when he turns back: at once, or four or eight frames after leaving the edge; not twelve',
      [0, 4, 8].every((k) => lands(drop(1, k, true, false)))
        && !lands(drop(1, 12, true, false))
    );
    check(
      '...but not at a run (he is carried clear of it), and not without steering back: both go into the dark',
      drop(1, 0, true, true).p.position.y < -3
        && drop(1, 0, false, false).p.position.y < -3
    );
    // Off the tip: the stone is two back from it, more than he can come back under.
    const tip = ((): PlayerController => {
      const p = stand(0, 16, LIP.z0 + 1.5);
      let left = false;
      for (let i = 0; i < 400; i++) {
        left ||= !p.grounded;
        p.update(DT, inp({ move: new THREE.Vector3(0, 0, left ? 1 : -1), run: false }), cs);
        if ((left && p.grounded) || p.position.y < -3) break;
      }
      return p;
    })();
    check('...nor off the Lip\'s tip: the stone is too far back under it', tip.position.y < -3);
    check(
      'it is too high to get onto from the shelf (seven up, over five and a half of chasm), and is inside the Lip\'s edges',
      DRIP.top > maxClimb() + 1
        && 32 - DRIP.z1 > 5.5
        && DRIP.x1 <= LIP.x1 - 0.5
        && DRIP.x0 >= LIP.x0 + 0.5
        && DRIP.z0 > LIP.z0 + 1.9
    );
  }

  // ---- The Cleft: wall kicks, with the pit past the end of the slot ----
  {
    const xm = (CLEFT.x0 + CLEFT.x1) / 2;
    const bz = (CLEFT.b.z0 + CLEFT.b.z1) / 2;
    /** Kicks from wall to wall along z (the Foundry's test has the same): jump pressed `delay` frames after each wall is touched; over `top` he makes for `land`. */
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
    for (const [delay, how] of [[2, 'quickly'], [8, 'a little late']] as Array<[number, string]>) {
      const t = purse();
      const p = kickUp(new THREE.Vector3(xm, 0, CLEFT.a.z1 + 0.4), -1, CLEFT.top, bz, delay, t);
      check(
        `THE CLEFT, kicking ${how}: up between the two fins from the spur, he comes out on top of the thick one and has its cap`,
        p.grounded
          && Math.abs(p.position.y - CLEFT.top) < 0.05
          && t.isCollected(itemAt(xm, bz).id),
        `at z ${p.position.z.toFixed(2)}, ${p.position.y.toFixed(2)} up`
      );
    }
    // A jump and a second jump straight up from the spur: nowhere near.
    const hop = stand(xm, 0, (CLEFT.a.z1 + CLEFT.b.z0) / 2);
    hop.update(DT, inp({ jumpPressed: true, jumpHeld: true }), cs);
    let high = 0;
    for (let i = 0; i < 200; i++) {
      hop.update(DT, inp({ jumpPressed: i === 28, jumpHeld: true }), cs);
      high = Math.max(high, hop.position.y);
    }
    check(
      '...and not without kicking: a jump and a second jump from the spur get nowhere near the top',
      high < CLEFT.top - 3,
      `${high.toFixed(2)} of ${CLEFT.top}`
    );
    const spur = def.solids.find((b) => b.x0 === CLEFT.x0 && b.x1 === CLEFT.x1 && b.z0 === CLEFT.a.z1 && b.z1 === CLEFT.b.z0);
    check(
      'the fins are 2.2 apart, the thin one the taller; the slot\'s floor is a spur level with the path, and past the spur\'s end there is no floor',
      Math.abs(CLEFT.b.z0 - CLEFT.a.z1 - 2.2) < 1e-9
        && CLEFT.a.top > CLEFT.top + 2
        && !!spur
        && spur.y1 === 0
        && CLEFT.x0 === -22
        && !def.solids.some((b) => b.y1 > -3 && b.y1 < 0.5 && b.x0 < CLEFT.x1 + 2 && b.x1 > CLEFT.x1 + 0.1 && b.z0 < CLEFT.b.z0 && b.z1 > CLEFT.a.z1)
    );
  }

  // ---- The Needle: off the moving slider ----
  {
    const nx = (NEEDLE.x0 + NEEDLE.x1) / 2;
    const nz = (NEEDLE.z0 + NEEDLE.z1) / 2;
    /** He rides the slider west from the Root Shelf and jumps for the Needle when the slider's middle is `lead` short of it (a second jump `e` frames on). */
    const ride = (lead: number, e: number): { on: boolean; got: boolean } => {
      const room = buildChamber({ solids: def.solids, pit: def.pit, water: def.water ?? [], decor: [], movers: def.movers });
      const lift = room.movers.find((m) => m.aabb.max.z < 4 && m.aabb.min.z > -1 && m.aabb.min.x > 12)!;
      const p = new PlayerController(new THREE.Vector3(37.5, 10.01, 1.5));
      const t = purse();
      let stage = 'waiting';
      let jumpAt = -1;
      let hung = 0;
      for (let i = 0; i < 60 * 60; i++) {
        room.stepMovers(DT, p);
        const lx = (lift.aabb.min.x + lift.aabb.max.x) / 2;
        const o: Partial<PlayerInput> = {};
        if (stage === 'waiting') {
          // On the shelf until the slider is home; then onto its middle.
          if (lx > 34.4) stage = 'boarding';
        } else if (stage === 'boarding' || stage === 'riding') {
          const d = lx - p.position.x;
          o.move = new THREE.Vector3(Math.abs(d) > 0.1 ? Math.sign(d) * Math.min(1, Math.abs(d) * 2) : 0, 0, 0);
          o.run = false;
          if (stage === 'boarding' && Math.abs(d) < 0.3 && lx < 34) stage = 'riding';
          if (stage === 'riding' && lx < nx + lead) {
            stage = 'jumping';
            jumpAt = i + 1;
          }
        } else if (stage === 'jumping') {
          const dx = nx - p.position.x;
          const dz = nz - p.position.z;
          const far = Math.hypot(dx, dz);
          o.move = far > 0.2 ? new THREE.Vector3(dx / far, 0, dz / far) : new THREE.Vector3();
          hung = p.state === 'hang' ? hung + 1 : 0;
          o.jumpPressed = i === jumpAt || i === jumpAt + e || hung === 8;
          o.jumpHeld = hung === 0 || hung >= 8;
          if (i > jumpAt + 8 && p.grounded) break;
          if (p.position.y < -3) break;
        }
        p.update(DT, inp(o), room.colliders);
        pick(t, p);
      }
      const on = p.grounded && Math.abs(p.position.y - NEEDLE.top) < 0.05;
      if (on) walkTo(p, nx, nz, t, room.colliders);
      return { on, got: t.isCollected(itemAt(nx, nz).id) };
    };
    const tries: string[] = [];
    for (const lead of [1.5, 0.5, -0.5]) for (const e of [14, 20, 26]) if (((r) => r.on && r.got)(ride(lead, e))) tries.push(`${lead}/${e}`);
    check(
      'THE NEEDLE: riding the slider out from the Root Shelf, a jump and a second jump as it passes put him on the Needle, and its cap is his; at more than one moment',
      tries.length >= 6,
      `${tries.length} of 9: ${tries.join(' ')}`
    );
    check(
      '...it is three and a half over the slider and 1.6 off its path, out over the chasm, and too far from Spider Rock to jump to',
      NEEDLE.top - 10 === 3.5
        && Math.abs(NEEDLE.z0 - 3 - 1.6) < 1e-9
        && NEEDLE.x1 < 22
        && NEEDLE.x0 - ROCK_BOX.x1 > maxChimney() + 1
    );
  }

  // ---- The Spire: the leap down from the High Hollow ----
  {
    const sx = (SPIRE.x0 + SPIRE.x1) / 2;
    const sz = (SPIRE.z0 + SPIRE.z1) / 2;
    const leap = (d: number, e: number): { p: PlayerController; got: boolean } => {
      const t = purse();
      const p = stand(0, HIGH, -45.5);
      for (let i = 0; i < 400; i++) {
        const dx = sx - p.position.x;
        const dz = sz - p.position.z;
        const far = Math.hypot(dx, dz);
        // (He runs at it; in the air, near it, he pulls back so as not to go over the top of it.)
        const v = Math.hypot(p.velocity.x, p.velocity.z);
        const brake = !p.grounded && far < (v * v) / (2 * 14) + 0.3;
        const move = far > 0.15 ? new THREE.Vector3(dx / far, 0, dz / far).multiplyScalar(brake ? -1 : 1) : new THREE.Vector3();
        const edge = p.grounded && p.position.x < -4 + d;
        p.update(DT, inp({ move, jumpPressed: (edge && i > 5) || i === e, jumpHeld: true }), cs);
        pick(t, p);
        if (i > 30 && p.grounded && p.position.y < HIGH - 1) break;
        if (p.position.y < -3) break;
      }
      if (p.grounded && Math.abs(p.position.y - SPIRE.top) < 0.05) walkTo(p, sx, sz, t);
      return { p, got: t.isCollected(itemAt(sx, sz).id) };
    };
    const made: string[] = [];
    const short: string[] = [];
    for (const d of [0.3, 0.6, 1]) {
      for (const e of [70, 85, 100]) {
        const r = leap(d, e);
        if (r.p.grounded && Math.abs(r.p.position.y - SPIRE.top) < 0.05 && r.got) made.push(`${d}/${e}`);
      }
      const one = leap(d, -1);
      if (one.p.grounded && one.p.position.y < 0.1 && !one.got) short.push(`${d}`);
    }
    check(
      'THE SPIRE: a running jump off the west end of the High Hollow and a second jump in the air, steered down onto it twelve and a half below, and its hunk is his; at every timing tried',
      made.length === 9,
      `${made.length} of 9: ${made.join(' ')}`
    );
    check('...one jump alone comes down short of it, on the floor', short.length === 3, `${short.length} of 3`);
    check(
      '...it is too tall to climb from the floor, and stands clear of the north wall by more than a kick carries',
      SPIRE.top > maxClimb() + 1
        && SPIRE.z0 - -48 > maxChimney()
    );
  }

  // ---- No way past: with its route's key piece gone, the checker finds no way to that thing (and still finds the others) ----
  {
    check(
      'with everything in place the checker can reach every one of them',
      unreachable(def, computeReach(def)).filter((b) => b.what === 'cap' || b.what === 'crumb' || b.what === 'relic').length === 0
    );
    const lost = (drop: (b: Box) => boolean, opts: { chimney?: number } = {}, movers = true): string[] => {
      const cut = { ...def, solids: def.solids.filter((b) => !drop(b)), movers: movers ? def.movers : [] };
      return unreachable(cut, computeReach(cut, opts)).filter((b) => b.what === 'cap' || b.what === 'crumb' || b.what === 'relic').map((b) => def.collectibles.find((c) => Math.hypot(c.x - b.x, c.z - b.z) < 0.01)!.id.split(':').slice(1).join(' '));
    };
    const same = (b: Box, x0: number, x1: number, z0: number, z1: number): boolean => b.x0 === x0 && b.x1 === x1 && b.z0 === z0 && b.z1 === z1;
    const noSlide = lost(() => false, {}, false);
    check('without the slider, the Needle\'s cap is out of reach, and only that', noSlide.join() === 'cap 01', noSlide.join(', '));
    const noFin = lost((b) => same(b, CLEFT.x0, CLEFT.x1, CLEFT.a.z0, CLEFT.a.z1));
    const noKicks = lost(() => false, { chimney: 0 });
    check(
      'without the Cleft\'s thin fin, or without wall kicks, its cap is out of reach, and only that',
      noFin.join() === 'cap 02'
        && noKicks.join() === 'cap 02',
      `${noFin.join(', ')} / ${noKicks.join(', ')}`
    );
    const noHigh = lost((b) => same(b, -4, 2, -48, -44));
    check(
      'without the High Hollow, the Spire\'s hunk is out of reach, and only that: the top mushroom is no way onto it',
      noHigh.join() === 'hunk 02',
      noHigh.join(', ')
    );
    // (The Lip juts from the Mouth: with the Lip alone gone, a leap off the Mouth's edge still comes down on the stone.
    // With everything he comes in on gone, nothing below reaches it.)
    const noTop = lost((b) => same(b, LIP.x0, LIP.x1, LIP.z0, LIP.z1) || (b.x0 >= -12 && b.x1 <= 32 && b.z0 >= 38 && b.z1 <= 48 && b.y1 > 0.5));
    check(
      'without the Lip and the Mouth it juts from, the Drip Stone\'s hunk is out of reach: nothing below is a way onto it',
      noTop.includes('hunk 01'),
      noTop.join(', ')
    );
  }
}

// ---- THE BAT BRIDGE (2026-11-24): three fluttering bats from the east bank to the larder ledge, crossed by stomping ----
{
  const Bz = BAT_BRIDGE.z;
  const specs = def.enemies.filter((e) => e.type === 'bat' && (e as { flutter?: boolean }).flutter);
  check(
    'three bats that only flutter hang in a line over the chasm from the east bank toward the larder ledge, each higher than the last; they come back, and count toward no goal',
    specs.length === BAT_BRIDGE.bats.length
      && specs.every((e) => e.z === Bz && e.respawn === true && e.uncounted === true && e.x < 22 && e.x > 2)
      && BAT_BRIDGE.bats.every(([x, y], i) => i === 0 || (x < BAT_BRIDGE.bats[i - 1][0] && y > BAT_BRIDGE.bats[i - 1][1]))
  );
  const cs = def.solids.map((b) => aabbOf(b));
  const input = (o: Partial<PlayerInput>): PlayerInput => ({ move: new THREE.Vector3(), run: true, jumpPressed: false, jumpHeld: false, attackPressed: false, dodgePressed: false, guardHeld: false, stowPressed: false, ...o } as PlayerInput);
  /** From the east bank's edge, west: a jump, and a ground pound on each bat in turn. Where he ends, and how many he stomped. */
  const cross = (feel: (typeof FEELS)[keyof typeof FEELS]): { p: PlayerController; stomps: number } => {
    const bats = BAT_BRIDGE.bats.map(([x, y]) => new Bat({ x, y, z: Bz, flutter: true, respawn: true }));
    const p = new PlayerController(new THREE.Vector3(23.2, 0, Bz));
    p.feel = feel;
    p.facing = -Math.PI / 2;
    for (let i = 0; i < 20; i++) p.update(DT, input({}), cs);
    const events: CombatEvents = { enemyHit: null, enemyKilled: false, playerResult: null, shockwave: false, cratesBroken: [] };
    let stomps = 0;
    let next = 0;
    let jumped = false;
    let airUsed = false;
    for (let i = 0; i < 60 * 12; i++) {
      const b = next < bats.length ? { x: BAT_BRIDGE.bats[next][0], y: BAT_BRIDGE.bats[next][1] } : null;
      const tx = b ? b.x : 0;
      const dx = tx - p.position.x;
      const over = !!b && Math.abs(dx) < 0.3;
      // (He runs at the edge and jumps from it; in the air he steers to stand over the next bat, and dives.)
      const jump = !jumped && p.grounded && p.position.x < 22.5;
      if (jump) jumped = true;
      // (Sinking short of the next thing: his air jump.)
      const air = jumped && !p.grounded && !airUsed && !over && p.velocity.y < -2 && p.plungeStage === 0 && p.position.y < (b ? b.y + 1.2 : 3.6);
      if (air) airUsed = true;
      const dive = over && !p.grounded && p.plungeStage === 0 && p.position.y > b!.y + 0.3;
      p.update(DT, input({ move: new THREE.Vector3(Math.max(-1, Math.min(1, dx * 2.5)), 0, 0), jumpPressed: jump || air, jumpHeld: true, attackPressed: dive }), cs);
      resolveCombat(p, bats, events);
      if (events.stomped) {
        stomps++;
        next++;
        airUsed = false;
      }
      if (jumped && p.grounded) break;
      if (p.position.y < -6) break;
    }
    return { p, stomps };
  };
  const there = cross(FEELS.platform);
  check(
    'THE BAT BRIDGE: from the east bank he jumps, ground pounds each bat in turn (thrown up off each, his air jump back), and lands on the larder ledge: the stomp carries him over the chasm',
    there.stomps === BAT_BRIDGE.bats.length && there.p.grounded && Math.abs(there.p.position.y - 3) < 0.05 && Math.abs(there.p.position.x) < 2.2,
    `${there.stomps} stomps; ended at x ${there.p.position.x.toFixed(1)}, y ${there.p.position.y.toFixed(1)}, grounded ${there.p.grounded}`
  );
  const awake = cross(FEELS.waking);
  check('...and it is the stomp that does it: with the waking world\'s ground pound (no bounce) the same crossing does not reach the ledge', awake.stomps === 0 && !(Math.abs(awake.p.position.y - 3) < 0.05 && Math.abs(awake.p.position.x) < 2.2), `ended at x ${awake.p.position.x.toFixed(1)}, y ${awake.p.position.y.toFixed(1)}`);
}

console.log(failures === 0 ? 'hollows: all pass' : `hollows: ${failures} FAIL`);
process.exit(failures ? 1 : 0);
