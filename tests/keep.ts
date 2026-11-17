// Grimsqueak's Keep and his throne room: in the world behind the Club's last door; each landmark reached only the way it
// is meant to be; the chimney climbed with real wall kicks; the throne room keeps his story and fight; the ending is home.
import * as THREE from 'three';
import { PlayerController, PlayerInput } from '../src/player/controller';
import { makeAabb } from '../src/world/collision';
import { computeReach, maxClimb, maxChimney, unreachable } from '../src/levels/reach';
import { CollectibleTracker } from '../src/world/collectibles';
import { buildChamber } from '../src/world/chamber';
import { TUNING } from '../src/data/tuning';
import type { Box } from '../src/world/layout';
import type { LevelDef } from '../src/levels/types';
import { keep, throne, THRONE, STACK, CHIMNEY_WALL, STACK_BOX, THRONE_COLUMNS, CORBEL, OVER_GATE, CINDER, FLUE, BUTTRESS, RIDE_HUNK, KEEP_WEDGES } from '../src/levels/keep';
import { LEVELS } from '../src/levels/levels';
import { HUB_DOORS } from '../src/levels/junction';
import { STORY } from '../src/story/scenes';
import { compileScene } from '../src/story/scene';
import { TRACK_NAMES } from '../src/audio/music';

const DT = 1 / 60;
let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}
const def = keep();
const room = throne();
const reaches = (d: LevelDef, x: number, y: number, z: number): boolean => computeReach(d).near(x, y + 0.5, z, 0.9, 1, 1);
const LEDGE = { x: -24, y: THRONE, z: -46 };
const TOP = { x: 0, y: STACK, z: -12 };
const FAR = { x: 44, y: 0, z: -24 };

check('the Keep is the last door in the Club, and wants the most wedges', HUB_DOORS.some((d) => d.to === 'keep') && HUB_DOORS.find((d) => d.to === 'keep')!.need === Math.max(...HUB_DOORS.map((d) => d.need)));
check('the throne room is in the Keep\'s world, behind its door', room.id === 'lair' && room.world === 'keep' && (def.courseDoors ?? []).some((d) => d.to === 'lair'));
check('the throne room is not a side area (its door stays shut until he is beaten; the way out goes home)', !room.returnTo && LEVELS.some((l) => l.id === 'lair' && l.world === 'keep'));
check('there is only one lair', LEVELS.filter((l) => l.id === 'lair').length === 1);
check('his fight and his scenes are still there', room.enemies.length === 1 && room.enemies[0].type === 'grimsqueak' && STORY.lair.boss === true && !!STORY.lair.open && !!STORY.lair.after);
check('beating him is the throne room\'s wedge', room.wedges?.length === 1 && room.goals.length === 1 && room.goals[0].type === 'defeat');
check('the ending plays in the Club once the lair is won, starting him at the Club\'s start', STORY.hub?.openAfter === 'lair' && STORY.hub.fromSpawn === true && !!STORY.hub.open);
{
  const hub = LEVELS.find((l) => l.id === 'hub')!;
  const ctx = { x: hub.spawn.x, z: hub.spawn.z, facing: hub.spawn.facing, y: hub.spawn.y, exit: hub.exit, spots: hub.storySpots! };
  const sc = STORY.hub.open!(ctx);
  const c = compileScene(sc, { x: ctx.x, y: ctx.y, z: ctx.z, facing: ctx.facing });
  check('the ending, in the Club, is its own scene (seen once) and runs its full length', sc.id === 'hub.open' && c.total > 30, `${c.total.toFixed(1)}s`);
}
check('the Club has the marks the ending looks at, and Grimsqueak waiting out of sight', ['dave', 'mort', 'wren'].every((k) => !!LEVELS.find((l) => l.id === 'hub')?.storySpots?.[k]) && !!LEVELS.find((l) => l.id === 'hub')?.npcs?.some((n) => n.kind === 'villain' && n.hidden));
check('the Keep has its own music and look', def.music === 'march' && TRACK_NAMES.includes('march') && def.theme === 'keep');
check('a fall into the pit costs a heart, not the walk back', def.fallBack === true);
check('six wedges in the Keep (one in the heart of a fire), one in the throne room', (def.wedges?.length ?? 0) === 6);

check('the Throne Ledge, the Engine Stack and the far end of the Burning Walk can all be reached', reaches(def, LEDGE.x, LEDGE.y, LEDGE.z) && reaches(def, TOP.x, TOP.y, TOP.z) && reaches(def, FAR.x, FAR.y, FAR.z));
const noChimney = { ...def, solids: def.solids.filter((b) => !(b.x0 === CHIMNEY_WALL.x0 && b.x1 === CHIMNEY_WALL.x1 && b.z0 === CHIMNEY_WALL.z0)) };
check('without the chimney\'s wall the Throne Ledge is out of reach', !reaches(noChimney, LEDGE.x, LEDGE.y, LEDGE.z));
const slider = (def.movers ?? []).filter((m) => m.x < -30);
check('one slider runs out to the Engine Stack', slider.length === 1);
check('without it the Stack is out of reach', !reaches({ ...def, movers: (def.movers ?? []).filter((m) => !slider.includes(m)) }, TOP.x, TOP.y, TOP.z));
const stones = def.solids.filter((b) => b.x0 >= 40 && b.x1 <= 46 && b.z1 <= 6 && b.z0 >= -17 && Math.abs(b.y1 - 0.3) < 0.01);
check('four stones cross the lava', stones.length === 4, `${stones.length}`);
check('without them the far end of the Burning Walk is out of reach', !reaches({ ...def, solids: def.solids.filter((b) => !stones.includes(b)) }, FAR.x, FAR.y, FAR.z));
// (The jump checker lets jumps pass over walls, so the gatehouse is checked as heights.)
const gatehouse = def.solids.filter((b) => b.kind === 'wall' && b.z0 === 26 && b.z1 === 28);
check('the gatehouse wall is too tall to climb, so the portcullis is the way in', gatehouse.length === 2 && gatehouse.every((b) => b.y1 > maxClimb() + 1));
check('the Stack is not under the slider\'s path from anywhere else', STACK_BOX.x0 > -10);

// The chimney, with the real controller: kick from wall to wall, pressing jump a few frames after each touch.
const cs = def.solids.map((b) => makeAabb((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, (b.z0 + b.z1) / 2, b.x1 - b.x0, b.y1 - b.y0, b.z1 - b.z0));
const inp = (o: Partial<PlayerInput>): PlayerInput => ({ move: new THREE.Vector3(), run: true, jumpPressed: false, jumpHeld: false, attackPressed: false, dodgeHeld: false, dodgePressed: false, guardHeld: false, stowPressed: false, ...o } as PlayerInput);
function climb(delay: number): number {
  const p = new PlayerController(new THREE.Vector3(-37, 12, -46));
  for (let t = 0; t < 10; t++) p.update(DT, inp({}), cs);
  let dir = -1;
  let wait = -1;
  let top = 0;
  p.update(DT, inp({ move: new THREE.Vector3(0, 0, dir), jumpPressed: true, jumpHeld: true }), cs);
  for (let t = 0; t < 500; t++) {
    const before = p.velocity.z;
    const press = wait === 0;
    if (press) dir = -dir;
    p.update(DT, inp({ move: new THREE.Vector3(0, 0, dir), jumpPressed: press, jumpHeld: true }), cs);
    if (wait > 0) wait--;
    else if (wait === 0) wait = -1;
    if (wait < 0 && !p.grounded && Math.sign(before) === dir && p.velocity.z === 0) wait = delay;
    if (p.position.z > -48 && p.position.z < -44) top = Math.max(top, p.position.y);
  }
  return top;
}
const quick = climb(2);
const late = climb(9);
check('wall kicks carry him up the chimney past the Throne Ledge', quick > THRONE + 1, `highest ${quick.toFixed(2)}`);
check('...pressing a little late still works', late > THRONE + 1, `highest ${late.toFixed(2)}`);
{
  const p = new PlayerController(new THREE.Vector3(-37, 12, -46));
  for (let t = 0; t < 10; t++) p.update(DT, inp({}), cs);
  p.update(DT, inp({ jumpPressed: true, jumpHeld: true }), cs);
  let top = 0;
  for (let t = 0; t < 200; t++) {
    p.update(DT, inp({ jumpPressed: t === 28, jumpHeld: true }), cs);
    top = Math.max(top, p.position.y);
  }
  check('without wall kicks the chimney cannot be climbed', top < THRONE - 4, `top ${top.toFixed(2)}`);
}

// The throne room cannot be climbed out of. (Its last pair of wall columns stood five out from the south wall, and
// the slot between column and wall was a chimney: seven kicks took him over the top of the walls and out of the
// fight. Found 2026-11-15, when the jump checker was taught how wide a chimney he can really climb.)
{
  const cs = room.solids.map((b) => makeAabb((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, (b.z0 + b.z1) / 2, b.x1 - b.x0, b.y1 - b.y0, b.z1 - b.z0));
  const inp = (o: Partial<PlayerInput>): PlayerInput => ({ move: new THREE.Vector3(), run: true, jumpPressed: false, jumpHeld: false, attackPressed: false, dodgeHeld: false, dodgePressed: false, guardHeld: false, stowPressed: false, ...o } as PlayerInput);
  const WALLS = 16;
  const ends = [-26, ...THRONE_COLUMNS.flatMap((z) => [z - 1, z + 1]), 26];
  // The slots along a side wall: from the north wall to the first column, between columns, and on to the south wall.
  const slots: Array<[number, number]> = [];
  for (let i = 0; i + 1 < ends.length; i += 2) if (ends[i + 1] - ends[i] > 0.01) slots.push([ends[i], ends[i + 1]]);
  check('the throne room\'s columns: the last pair stand in the south corners, joined to the end wall', THRONE_COLUMNS[THRONE_COLUMNS.length - 1] + 1 === 26 && room.solids.filter((b) => b.y1 === WALLS && b.x1 - b.x0 === 1 && b.z1 - b.z0 === 2).length === THRONE_COLUMNS.length * 2);
  check('...and no two columns, and no column and an end wall, are near enough to kick up between', slots.every(([a, b]) => b - a > maxChimney() + 0.5), `the narrowest slot is ${Math.min(...slots.map(([a, b]) => b - a))}; a chimney can be ${maxChimney().toFixed(1)}`);
  /** Kicking from column to column (or wall) in a slot, hard against the side wall, as well as a player could. */
  const kicked = (x: number, z0: number, z1: number): number => {
    let best = 0;
    for (const delay of [0, 1, 2, 3, 5, 8]) {
      const p = new PlayerController(new THREE.Vector3(x, 0, Math.min(z0 + 1.5, (z0 + z1) / 2)));
      for (let i = 0; i < 10; i++) p.update(DT, inp({}), cs);
      let dir = -1;
      let wait = -1;
      const mv = (d: number): THREE.Vector3 => new THREE.Vector3(0, 0, d);
      p.update(DT, inp({ move: mv(dir), jumpPressed: true, jumpHeld: true }), cs);
      for (let i = 0; i < 1500; i++) {
        const before = p.velocity.z;
        const press = wait === 0;
        if (press) dir = -dir;
        p.update(DT, inp({ move: mv(dir), jumpPressed: press, jumpHeld: true }), cs);
        best = Math.max(best, p.position.y);
        if (wait > 0) wait--;
        else if (wait === 0) wait = -1;
        if (wait < 0 && !p.grounded && Math.sign(before) === dir && Math.abs(before) > 0.5 && p.velocity.z === 0) wait = delay;
        if (p.grounded && i > 40) break;
      }
    }
    return best;
  };
  const tries = slots.flatMap(([a, b]) => [kicked(19.5, a, b), kicked(-19.5, a, b)]);
  check('played with the real controller: kicking in every slot along both side walls, he gets nowhere near the top of the walls', tries.every((h) => h < WALLS / 2), `the best of ${tries.length} tries got ${Math.max(...tries).toFixed(1)} up; the walls are ${WALLS}`);
  const map = computeReach(room);
  check('...and the jump checker agrees: nothing above the dais can be stood on', map.points.every(([, , h]) => h < 6), `the highest place he can stand is ${Math.max(...map.points.map((q) => q[2])).toFixed(1)} up`);
}

// ======================================================================================================================
// THE THINGS TO FIND, the Cistern's way: three caps and two hunks, each at the end of a piece of movement of its own.
{
  const WALK = 12;
  const purse = (): CollectibleTracker => new CollectibleTracker([{ id: def.id, name: def.name, items: def.collectibles }], null);
  const pick = (t: CollectibleTracker, p: PlayerController): void => void t.tryCollect(def.id, p.position, TUNING.rat.radius, TUNING.rat.height);
  const itemAt = (x: number, z: number) => def.collectibles.find((c) => Math.hypot(c.x - x, c.z - z) < 0.6)!;
  const stand = (x: number, y: number, z: number): PlayerController => {
    const p = new PlayerController(new THREE.Vector3(x, y + 0.01, z));
    for (let i = 0; i < 10; i++) p.update(DT, inp({}), cs);
    return p;
  };
  /** Once he has landed: across the top he is on to the thing itself. */
  const walkTo = (p: PlayerController, x: number, z: number, t: CollectibleTracker, far = 90): void => {
    for (let i = 0; i < far && Math.hypot(x - p.position.x, z - p.position.z) > 0.1; i++) {
      p.update(DT, inp({ move: new THREE.Vector3(x - p.position.x, 0, z - p.position.z).normalize(), run: far > 90 }), cs);
      pick(t, p);
    }
  };
  /** He runs at `to` (x, z) and jumps on frame `d` (again `e` frames later if e >= 0), catching and climbing any edge he meets. */
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
      if ((i > d + 8 && p.grounded) || p.position.y < -3) break;
    }
    return p;
  };
  const caps = def.collectibles.filter((c) => c.kind === 'cap');
  const cheese = def.collectibles.filter((c) => c.kind === 'crumb');
  check('there are three bottle caps and two hunks of cheese and nothing else: five things where there were twenty-six', caps.length === 3 && cheese.length === 2 && def.collectibles.length === 5);
  check('the two hunks are worth what the Keep\'s eighteen crumbs were', purse().worth(def.id, 'crumb').total === 18 && cheese.every((c) => c.worth === 9 && /:hunk:\d\d$/.test(c.id)));
  check('none of it is in a crate or on a floor, and no two are within twelve of each other: there are no trails', def.collectibles.every((c) => c.crate === undefined && c.y > 4) && def.collectibles.every((a) => def.collectibles.every((b) => a === b || Math.hypot(a.x - b.x, a.z - b.z) >= 12)));
  const w = KEEP_WEDGES.find((x) => x.id === 'caps')!;
  check('the wedge for the caps asks for three, and says where each is', w.name === 'Three Bottle Caps' && w.appears?.type === 'collect' && /gate/.test(w.hint) && /cinder/.test(w.hint) && /flue/.test(w.hint));

  // ---- Over the Gate ----
  {
    const cx = (CORBEL.x0 + CORBEL.x1) / 2;
    const cz = (CORBEL.z0 + CORBEL.z1) / 2;
    const made: string[] = [];
    for (const d of [8, 12]) for (const e of [-1, 14]) {
      const t = purse();
      let p = leap(stand(cx, WALK, 12.4), [cx, cz], d, e, t);
      const onCorbel = p.grounded && Math.abs(p.position.y - WALK) < 0.05 && p.position.z > CORBEL.z0 - 0.3;
      if (!onCorbel) continue;
      // (Back to the corbel's north end for what run-up it gives, then on to the gatehouse.)
      walkTo(p, cx, CORBEL.z0 + 0.3, t);
      p = leap(p, [cx, 27], d, e, t);
      const onGate = p.grounded && Math.abs(p.position.y - WALK) < 0.05 && p.position.z > 26 - 0.3;
      if (!onGate) continue;
      walkTo(p, OVER_GATE.x, OVER_GATE.z, t, 900);
      if (t.isCollected(itemAt(OVER_GATE.x, OVER_GATE.z).id) && Math.abs(p.position.y - WALK) < 0.05) made.push(`${d}/${e}`);
    }
    check('OVER THE GATE: off the south end of the battlements to the corbel, off the corbel to the gatehouse, and along its top to the cap over the portcullis; at more than one timing', made.length >= 2, `${made.length} of 4: ${made.join(' ')}`);
    // Without the corbel: his best leap from the battlements comes down in the ward.
    const bare = def.solids.filter((b) => !(b.x0 === CORBEL.x0 && b.x1 === CORBEL.x1 && b.z0 === CORBEL.z0)).map((b) => makeAabb((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, (b.z0 + b.z1) / 2, b.x1 - b.x0, b.y1 - b.y0, b.z1 - b.z0));
    let best = 0;
    for (const e of [10, 16, 22, 28]) {
      const p = stand(cx, WALK, 10);
      for (let i = 0; i < 300; i++) {
        const edge = p.grounded && p.position.z > 13.6;
        p.update(DT, inp({ move: new THREE.Vector3(0, 0, 1), jumpPressed: (edge && i > 3) || i === 40 + e, jumpHeld: true }), bare);
        if (!p.grounded) best = Math.max(best, p.position.y > WALK - 0.5 ? p.position.z : 0);
        if (i > 30 && p.grounded && p.position.y < 1) break;
      }
    }
    check('...and the corbel is the way: it is twelve from the battlements to the gatehouse, and his best leap is still short of it at the wall walk\'s height', 26 - 14 === 12 && best < 26 - 0.5 && CORBEL.z0 - 14 > 5 && 26 - CORBEL.z1 > 5, `his best is at z ${best.toFixed(2)} when he drops below the walk`);
  }

  // ---- The Cinder ----
  {
    const made: string[] = [];
    for (const d of [4, 8]) for (const e of [10, 14, 18]) {
      const t = purse();
      const p = leap(stand(40.6, 0.3, -9), [(CINDER.x0 + CINDER.x1) / 2, (CINDER.z0 + CINDER.z1) / 2], d, e, t);
      if (p.grounded && Math.abs(p.position.y - CINDER.top) < 0.05) {
        walkTo(p, (CINDER.x0 + CINDER.x1) / 2, (CINDER.z0 + CINDER.z1) / 2, t);
        if (t.isCollected(itemAt((CINDER.x0 + CINDER.x1) / 2, (CINDER.z0 + CINDER.z1) / 2).id)) made.push(`${d}/${e}`);
      }
    }
    check('THE CINDER: from the Burning Walk\'s third stone, a jump, a second jump and a caught edge put him on it, and its cap is his; at more than one timing', made.length >= 2, `${made.length} of 6: ${made.join(' ')}`);
    check('...it stands in the lava, four over the stones and three from the nearest: not a step', CINDER.top - 0.3 === 4 && Math.abs(CINDER.x0 - 42 - 3) < 1e-9 && CINDER.top - 0.3 < maxClimb());
  }

  // ---- The Flue ----
  {
    const fx = (FLUE.x0 + FLUE.x1) / 2;
    const fz = (FLUE.z0 + FLUE.z1) / 2;
    /** He runs east along the Stack and jumps `back` short of its edge (again `e` frames later if e >= 0), catching and climbing the Flue's edge if he meets it. */
    const off = (back: number, e: number, t: CollectibleTracker): PlayerController => {
      const p = stand(0, STACK, fz);
      let jumped = -1;
      let hung = 0;
      for (let i = 0; i < 400; i++) {
        const go = jumped < 0 && p.position.x > STACK_BOX.x1 - back;
        if (go) jumped = i;
        hung = p.state === 'hang' ? hung + 1 : 0;
        const dx = fx - p.position.x;
        p.update(DT, inp({ move: new THREE.Vector3(Math.abs(dx) > 0.2 ? Math.sign(dx) : 0, 0, 0), jumpPressed: go || (e >= 0 && jumped >= 0 && i === jumped + e) || hung === 8, jumpHeld: hung === 0 || hung >= 8 }), cs);
        pick(t, p);
        if ((jumped >= 0 && i > jumped + 8 && p.grounded) || p.position.y < -3) break;
      }
      return p;
    };
    const made: string[] = [];
    let one = 0;
    for (const back of [0.3, 0.6, 1]) {
      for (const e of [8, 12, 16, 20, 24, 28]) {
        const t = purse();
        const p = off(back, e, t);
        if (p.grounded && Math.abs(p.position.y - FLUE.top) < 0.05) {
          walkTo(p, fx, fz, t);
          if (t.isCollected(itemAt(fx, fz).id)) made.push(`${back}/${e}`);
        }
      }
      if (off(back, -1, purse()).position.y < 0) one++;
    }
    check('THE FLUE: a running jump off the east edge of the Engine Stack, a second jump and a caught edge put him on it, and its cap is his; at more than one timing', made.length >= 6, `${made.length} of 18: ${made.join(' ')}`);
    check('...one jump alone falls into the pit; it is three over the Stack and six of pit from it', one === 3 && FLUE.top - STACK === 3 && FLUE.x0 - STACK_BOX.x1 === 6);
  }

  // ---- The Buttress ----
  {
    const xm = (BUTTRESS.x0 + BUTTRESS.x1) / 2;
    const land = (BUTTRESS.z0 + BUTTRESS.z1) / 2;
    const kickUp = (delay: number, t: CollectibleTracker): PlayerController => {
      const p = stand(xm, 0, (BUTTRESS.z0 + -48) / 2);
      let dir = -1;
      let wait = -1;
      const mv = (d: number): THREE.Vector3 => new THREE.Vector3(0, 0, d);
      p.update(DT, inp({ move: mv(dir), jumpPressed: true, jumpHeld: true }), cs);
      for (let i = 0; i < 700; i++) {
        const before = p.velocity.z;
        const press = wait === 0;
        if (press) dir = -dir;
        let move = mv(dir);
        if (p.position.y > BUTTRESS.top + 0.15 && wait < 0) {
          const d = land - p.position.z;
          const v = p.velocity.z;
          const stop = (v * v) / (2 * 20);
          move = mv(Math.abs(d) < stop + 0.3 && Math.sign(v) === Math.sign(d) ? -Math.sign(v) : Math.sign(d) * Math.min(1, Math.abs(d) * 3));
        }
        p.update(DT, inp({ move, jumpPressed: press, jumpHeld: true }), cs);
        pick(t, p);
        if (wait > 0) wait--;
        else if (wait === 0) wait = -1;
        if (wait < 0 && !p.grounded && Math.sign(before) === dir && Math.abs(before) > 0.5 && p.velocity.z === 0) wait = delay;
        if (p.grounded && (p.position.y > BUTTRESS.top - 0.1 || (i > 30 && p.position.y < 0.1))) break;
      }
      return p;
    };
    for (const [delay, how] of [[2, 'quickly'], [8, 'a little late']] as Array<[number, string]>) {
      const t = purse();
      const p = kickUp(delay, t);
      check(`THE BUTTRESS, kicking ${how}: up between the north wall and the pier from the floor, he comes out on top of the pier and has its hunk`, p.grounded && Math.abs(p.position.y - BUTTRESS.top) < 0.05 && t.isCollected(itemAt(xm, land).id), `at z ${p.position.z.toFixed(2)}, ${p.position.y.toFixed(2)} up`);
    }
    check('...it is 2.2 off the wall, too tall to climb, and clear of the east wall by more than a kick carries', Math.abs(BUTTRESS.z0 - -48 - 2.2) < 1e-9 && BUTTRESS.top > maxClimb() + 1 && 48 - BUTTRESS.x1 > maxChimney());
  }

  // ---- The Slider's Hunk ----
  {
    /** He rides the slider out from the battlements and jumps for the hunk when the slider's middle is `lead` short of it (a second jump `e` frames on, or none), keeping over the slider as it goes. */
    const ride = (lead: number, e: number): { on: boolean; got: boolean } => {
      const chamber = buildChamber({ solids: def.solids, pit: def.pit, water: def.water ?? [], decor: [], movers: def.movers });
      const lift = chamber.movers[0];
      const p = new PlayerController(new THREE.Vector3(-39.5, WALK + 0.01, -11.5));
      const t = purse();
      let stage = 'waiting';
      let jumpAt = -1;
      let on = false;
      for (let i = 0; i < 60 * 60; i++) {
        chamber.stepMovers(DT, p);
        const lx = (lift.aabb.min.x + lift.aabb.max.x) / 2;
        const o: Partial<PlayerInput> = {};
        const d = lx - p.position.x;
        o.move = new THREE.Vector3(Math.abs(d) > 0.1 ? Math.sign(d) * Math.min(1, Math.abs(d) * 2) : 0, 0, 0);
        o.run = false;
        if (stage === 'waiting') {
          o.move = new THREE.Vector3();
          if (lx < -36.4) stage = 'boarding';
        } else if (stage === 'boarding') {
          if (Math.abs(d) < 0.3 && lx > -36) stage = 'riding';
        } else if (stage === 'riding') {
          if (lx > RIDE_HUNK.x - lead) {
            stage = 'jumping';
            jumpAt = i + 1;
          }
        } else if (stage === 'jumping') {
          o.jumpPressed = i === jumpAt || (e >= 0 && i === jumpAt + e);
          o.jumpHeld = true;
          if (i > jumpAt + 8 && p.grounded) {
            on = Math.abs(p.position.y - lift.aabb.max.y) < 0.05;
            break;
          }
          if (p.position.y < -3) break;
        }
        p.update(DT, inp(o), chamber.colliders);
        pick(t, p);
      }
      return { on, got: t.isCollected(itemAt(RIDE_HUNK.x, RIDE_HUNK.z).id) };
    };
    const made: string[] = [];
    for (const lead of [1.2, 0.6, 0]) for (const e of [12, 18, 24]) if (((r) => r.on && r.got)(ride(lead, e))) made.push(`${lead}/${e}`);
    const single = [1.2, 0.6, 0].filter((lead) => ride(lead, -1).got).length;
    check('THE SLIDER\'S HUNK: riding out from the battlements, a jump and a second jump as he passes under it take the hunk, and he comes down on the slider again; at more than one moment', made.length >= 3, `${made.length} of 9: ${made.join(' ')}`);
    check('...one jump alone does not reach it', single === 0, `${single} of 3`);
    check('...it hangs over the middle of the slider\'s way, over the pit', RIDE_HUNK.x > -35 && RIDE_HUNK.x < -12 && RIDE_HUNK.z > -13 && RIDE_HUNK.z < -10 && RIDE_HUNK.y - WALK > 3);
  }

  // ---- No way past ----
  {
    check('with everything in place the checker can reach every one of them', unreachable(def, computeReach(def)).filter((b) => b.what === 'cap' || b.what === 'crumb').length === 0);
    const lost = (drop: (b: Box) => boolean, opts: { chimney?: number } = {}, movers = true): string[] => {
      const cut = { ...def, solids: def.solids.filter((b) => !drop(b)), movers: movers ? def.movers : [] };
      return unreachable(cut, computeReach(cut, opts)).filter((b) => b.what === 'cap' || b.what === 'crumb').map((b) => def.collectibles.find((c) => Math.hypot(c.x - b.x, c.z - b.z) < 0.01)!.id.split(':').slice(1).join(' '));
    };
    const same = (b: Box, x0: number, x1: number, z0: number, z1: number): boolean => b.x0 === x0 && b.x1 === x1 && b.z0 === z0 && b.z1 === z1;
    const noCorbel = lost((b) => same(b, CORBEL.x0, CORBEL.x1, CORBEL.z0, CORBEL.z1));
    check('without the corbel, the cap over the gate is out of reach, and only that: not from the yard, the ward or the battlements', noCorbel.join() === 'cap 01', noCorbel.join(', '));
    const noStack = lost((b) => same(b, STACK_BOX.x0, STACK_BOX.x1, STACK_BOX.z0, STACK_BOX.z1));
    check('without the Engine Stack, the Flue\'s cap is out of reach, and only that', noStack.join() === 'cap 03', noStack.join(', '));
    const noSlider = lost(() => false, {}, false);
    check('without the slider, its hunk and the Flue\'s cap are out of reach, and no other thing to find', noSlider.join() === 'cap 03,hunk 02', noSlider.join(', '));
    const noKicks = lost(() => false, { chimney: 0 });
    const noPier = lost((b) => same(b, BUTTRESS.x0, BUTTRESS.x1, BUTTRESS.z0, BUTTRESS.z1));
    check('without wall kicks, the Buttress\'s hunk is out of reach, and only that', noKicks.join() === 'hunk 01', noKicks.join(', '));
    const noStones = lost((b) => b.kind === 'stone' && b.x0 >= 38 && b.z1 <= 10 && b.z0 >= -20 && b.y1 < 1);
    check('without the Burning Walk\'s stones, the Cinder\'s cap is out of reach: neither bank is a way onto it', noStones.includes('cap 02'), noStones.join(', '));
    void noPier;
  }
}

console.log(failures === 0 ? 'keep: all pass' : `keep: ${failures} FAIL`);
process.exit(failures ? 1 : 0);
