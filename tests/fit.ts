// Things sit where they are drawn. Wall hangings (slime, webs, banners, torches, gauges, windows) are flat against
// their walls and clear of the floor; a lift rests on the floor at the bottom of its run instead of sinking into it; a
// floor button's pad never shares a plane with its frame. All four were reported by the owner from the Cistern.
import './../src/core/colorSetup';
import * as THREE from 'three';
import { LEVELS } from '../src/levels/levels';
import { compileCustom, type CustomLevel, type Piece } from '../src/levels/custom';
import { buildChamber } from '../src/world/chamber';
import { makeAabb, type Aabb } from '../src/world/collision';
import { lowestPoint, mount, seatMovers, wallBehind } from '../src/world/hangings';
import { PLATE, buildPlate, pressPlate } from '../src/world/plates';
import { buildDrain } from '../src/world/drain';
import type { Box, Decor, MoverSpec } from '../src/world/layout';
import { PlayerController, type PlayerInput } from '../src/player/controller';
import { pinnedUnder } from '../src/world/crush';
import { TUNING } from '../src/data/tuning';

let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}
const box = (b: Box): Aabb => makeAabb((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, (b.z0 + b.z1) / 2, b.x1 - b.x0, b.y1 - b.y0, b.z1 - b.z0);
const solid = (kind: Box['kind'], x0: number, x1: number, y0: number, y1: number, z0: number, z1: number): Box => ({ kind, x0, x1, y0, y1, z0, z1 });

// ---- Wall hangings ----
{
  // A wall whose face is x = -10, a floor at 0, and a ledge 3 high along the wall.
  const solids = [solid('floor', -12, 12, -1, 0, -12, 12), solid('wall', -11, -10, 0, 10, -12, 12), solid('platform', -10, -8, 0, 3, 2, 12)];
  const cs = solids.map(box);
  type Slime = Extract<Decor, { kind: 'slime' }>;
  const put: Slime = { kind: 'slime', x: -9.5, y: 7, z: -4, yaw: Math.PI / 2, length: 4 }; // half a unit off the wall, as the levels do it
  const on = mount(put, cs) as Slime;
  check('a slime put half a unit off a wall is drawn flat against it', Math.abs(on.x - -10) < 0.08 && on.x > -10 && on.z === put.z && on.y === put.y, `${(on.x + 10).toFixed(2)} out from the wall (it was put 0.50 out)`);
  const inward = mount({ ...put, yaw: -Math.PI / 2 }, cs) as Slime;
  check('whichever way its arrow was pointed, it ends up on the same wall, facing out from it', Math.abs(inward.x - on.x) < 1e-9 && Math.abs(Math.sin(inward.yaw) - 1) < 1e-9 && Math.abs(Math.sin(on.yaw) - 1) < 1e-9);
  check('over open floor its drips are as long as they were made', on.length === 4 && (lowestPoint(on) ?? 0) > 0.1);
  const overLedge = mount({ ...put, z: 6 }, cs) as Slime;
  check('over a ledge its drips stop short of the ledge', overLedge.length < 4 && (lowestPoint(overLedge) ?? 0) >= 3 + 0.14, `drips end ${((lowestPoint(overLedge) ?? 0) - 3).toFixed(2)} above the ledge (unshortened they would run ${(3 - (7 - 4 - 0.12)).toFixed(2)} into it)`);
  type Banner = Extract<Decor, { kind: 'banner' }>;
  const banner = mount({ kind: 'banner', x: -9.7, z: 6, top: 5, yaw: Math.PI / 2, w: 1.6, h: 3.2, color: 0xff0000 }, cs) as Banner;
  check('a banner over a ledge is cut to hang clear of it', banner.h < 3.2 && banner.top - banner.h >= 3.14 && Math.abs(banner.x - -10) < 1e-9, `${banner.h.toFixed(2)} long`);
  type Web = Extract<Decor, { kind: 'web' }>;
  const web = mount({ kind: 'web', x: -9.9, y: 1, z: -6, yaw: -Math.PI / 2, r: 1.6 }, cs) as Web;
  check('a cobweb low on a wall is made small enough to stay off the floor', web.r < 1 && web.y - web.r >= 0.14 && web.x - -10 < 0.05, `radius ${web.r.toFixed(2)}`);
  type Win = Extract<Decor, { kind: 'window' }>;
  const win = mount({ kind: 'window', x: -9.5, y: 5, z: -8, yaw: -Math.PI / 2 }, cs) as Win;
  check('a window whose arrow pointed into the wall is turned to face the room', Math.abs(Math.sin(win.yaw) - 1) < 1e-9 && win.x - -10 < 0.05);
  const loose = mount({ ...put, x: 0 }, cs) as Slime;
  check('one with no wall near it is left where it was', loose.x === 0 && loose.yaw === put.yaw);
  check('anything that is not a wall hanging is left alone', mount({ kind: 'lamp', x: 1, y: 3, z: 1 }, cs).kind === 'lamp');

  // Built: the slime's own shape, in the room.
  const room = buildChamber({ solids, pit: null, water: [], decor: [{ ...put, z: 6 }] });
  let low = Infinity;
  let nearWall = Infinity;
  let farWall = -Infinity;
  room.group.updateMatrixWorld(true);
  room.group.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || Math.abs(m.position.y - 7) > 1e-6 || Math.abs(m.position.z - 6) > 1e-6) return;
    const b = new THREE.Box3().setFromObject(m);
    low = Math.min(low, b.min.y);
    nearWall = Math.min(nearWall, b.min.x);
    farWall = Math.max(farWall, b.max.x);
  });
  check('built in a room, the slime is against the wall and above the ledge', nearWall < -9.9 && farWall < -9.75 && low >= 3.1, `it lies between ${(nearWall + 10).toFixed(2)} and ${(farWall + 10).toFixed(2)} from the wall's face; lowest ${(low - 3).toFixed(2)} above the ledge`);

  // Every world.
  let count = 0;
  let wereOff = 0;
  const lost: string[] = [];
  const low2: string[] = [];
  for (const def of LEVELS) {
    const colliders = def.solids.map(box);
    for (const d of def.decor ?? []) {
      const m = mount(d, colliders);
      const bottom = lowestPoint(m);
      if (bottom === null) continue;
      count++;
      const h = d as Extract<Decor, { kind: 'slime' }>;
      const top = d.kind === 'banner' ? d.top : h.y;
      const w = wallBehind(colliders, h.x, top - (d.kind === 'banner' || d.kind === 'slime' ? 0.15 : 0), h.z, h.yaw, 0.5);
      if (!w.found) {
        lost.push(`${def.id}: ${d.kind} at ${h.x}, ${h.z}`);
        continue;
      }
      if (Math.hypot(h.x - w.x, h.z - w.z) > 0.25) wereOff++;
      const mm = m as typeof h;
      if (Math.hypot(mm.x - w.x, mm.z - w.z) > 0.08) lost.push(`${def.id}: ${d.kind} still ${Math.hypot(mm.x - w.x, mm.z - w.z).toFixed(2)} off its wall`);
      if (bottom < w.floor + 0.1) low2.push(`${def.id}: ${d.kind} at ${h.x}, ${h.z} reaches ${(w.floor - bottom).toFixed(2)} into the floor`);
    }
  }
  check('in every world, every wall hanging has a wall behind it and is drawn against it', lost.length === 0 && count > 40, lost.slice(0, 4).join('; ') || `${count} hangings; ${wereOff} of them had been put more than a quarter of a unit off their walls`);
  check('and none of them reaches down into the floor', low2.length === 0, low2.slice(0, 4).join('; '));
}

// ---- Lifts ----
{
  const solids = [solid('floor', -10, 10, -1, 0, -10, 10), solid('platform', 4, 10, 0, 6, -10, 10)];
  const lift: MoverSpec = { x: 0, z: 0, y: 0, w: 3, d: 3, to: [0, 6, 0] };
  const [seated] = seatMovers([lift], solids);
  check('a lift put at floor level is seated on the floor: its underside on it, not its top', seated.y === 0.5 && seated.y - (seated.thick ?? 0.5) === 0, `its top starts ${seated.y} up (it was 0, with its whole body under the floor)`);
  check('it still stops at the same height at the top of its run', seated.y + seated.to[1] === 6);
  check('one already clear of the floor is left alone', seatMovers([{ ...lift, y: 2 }], solids)[0].y === 2 && seatMovers([seated], solids)[0] === seated);
  const slider: MoverSpec = { x: -6, z: 0, y: 0, w: 2, d: 2, to: [6, 0, 0] };
  check('a slider put in the floor rides on top of it all the way', seatMovers([slider], solids)[0].y === 0.5 && seatMovers([slider], solids)[0].to[0] === 6);
  const overGap: MoverSpec = { x: 0, z: 0, y: 6, w: 2, d: 2, to: [2, 0, 0] }; // level with the ledge it runs up to, over open air
  check('a slider level with a ledge, over open air, is left level with it', seatMovers([overGap], solids)[0] === overGap);
  // Through the level compiler, and built.
  const lvl: CustomLevel = { name: 't', width: 20, depth: 20, wallHeight: 10, pieces: [{ t: 'floor', x0: -10, z0: -10, x1: 10, z1: 10, top: 0 }, { t: 'lift', x0: -1.5, z0: -1.5, x1: 1.5, z1: 1.5, top: 0, props: { move: 'up', travel: 5 } } as Piece, { t: 'spawn', x0: 5, z0: 5, x1: 5, z1: 5, top: 0 } as Piece] };
  const def = compileCustom(lvl);
  const m = (def.movers ?? [])[0];
  check('a level\'s lift comes out of the compiler seated', !!m && m.y === 0.5 && m.y + m.to[1] === 5);
  const room = buildChamber({ solids: def.solids, pit: def.pit, water: def.water ?? [], decor: [], movers: def.movers });
  let lowest = Infinity;
  let highest = -Infinity;
  for (let i = 0; i < 60 * 20; i++) {
    room.stepMovers(1 / 60);
    lowest = Math.min(lowest, room.movers[0].aabb.min.y);
    highest = Math.max(highest, room.movers[0].aabb.max.y);
  }
  check('built and run up and down, its underside never goes below the floor, and its top reaches where it was sent', lowest > -1e-6 && Math.abs(highest - 5) < 1e-6, `lowest ${lowest.toFixed(3)}, highest ${highest.toFixed(3)}`);
  // Standing where it comes down: he is pushed out from under it, and ends beside it on the floor.
  {
    const under = new PlayerController(new THREE.Vector3(0.6, 0, 0.2));
    const rm = buildChamber({ solids: def.solids, pit: def.pit, water: def.water ?? [], decor: [], movers: def.movers });
    const still: PlayerInput = { move: new THREE.Vector3(), run: false, jumpPressed: false, jumpHeld: false, attackPressed: false, dodgePressed: false, guardHeld: false, stowPressed: false };
    let inside = 0;
    let longest = 0;
    // (He walks under it once it has gone up.)
    for (let i = 0; i < 600 && rm.movers[0].aabb.min.y < 3; i++) rm.stepMovers(1 / 60);
    for (let i = 0; i < 60 * 16; i++) {
      rm.stepMovers(1 / 60, under);
      under.update(1 / 60, still, rm.colliders);
      const a = rm.movers[0].aabb;
      const r = TUNING.rat.radius;
      const in2 = under.position.x + r > a.min.x + 0.02 && under.position.x - r < a.max.x - 0.02 && under.position.z + r > a.min.z + 0.02 && under.position.z - r < a.max.z - 0.02 && under.position.y < a.max.y - 0.05 && under.position.y + TUNING.rat.height > a.min.y + 0.05;
      inside = in2 ? inside + 1 : 0;
      longest = Math.max(longest, inside);
    }
    const a = rm.movers[0].aabb;
    check('a rat standing where a lift comes down is pushed out from under it', longest < 30 && under.position.y < 0.01 && (Math.abs(under.position.x) > 1.5 + TUNING.rat.radius - 0.03 || Math.abs(under.position.z) > 1.5 + TUNING.rat.radius - 0.03) && a.min.y >= -1e-6, `inside it for ${(longest / 60).toFixed(2)} s at most; he ends at ${under.position.x.toFixed(2)}, ${under.position.z.toFixed(2)}`);
  }
  // Every world.
  const sunk: string[] = [];
  let lifts = 0;
  for (const d of LEVELS) {
    for (const mv of d.movers ?? []) {
      lifts++;
      if (seatMovers([mv], d.solids)[0] !== mv) sunk.push(`${d.id}: the platform at ${mv.x}, ${mv.z}`);
    }
  }
  check('in every world, no moving platform has its body in the floor anywhere along its run', sunk.length === 0 && lifts > 5, sunk.join('; ') || `${lifts} platforms`);
}

// ---- Floor buttons ----
{
  const [pad, frame] = buildPlate(3, 2, -4);
  const P = PLATE;
  const top = (m: THREE.Mesh): number => new THREE.Box3().setFromObject(m).max.y;
  const frameTop = top(frame);
  const up = top(pad);
  check('a floor button\'s pad stands proud of its frame', up - frameTop >= 0.03 && Math.abs(frameTop - (2 + P.frameTop)) < 1e-6, `${(up - frameTop).toFixed(2)} above it`);
  // The frame is a ring: none of it lies under the pad, so the pad shares a plane with nothing at any height.
  const pos = frame.geometry.attributes.position;
  let under = 0;
  for (let i = 0; i < pos.count; i++) if (Math.max(Math.abs(pos.getX(i)), Math.abs(pos.getZ(i))) < P.pad / 2 - 1e-6) under++;
  check('its frame goes round the pad, not under it', under === 0 && pos.count > 0);
  const mat = pad.material;
  pressPlate(pad, 2);
  const down = top(pad);
  check('pressed, the pad drops inside the frame: below the frame\'s top, above the floor, level with neither', frameTop - down >= 0.03 && down - 2 >= 0.03 && pad.material !== mat, `${(frameTop - down).toFixed(2)} below the frame's top, ${(down - 2).toFixed(2)} above the floor (it used to drop to exactly the frame's height)`);
}

// ---- A ledge with no room to pull up onto it is not caught; and only a moving platform crushes ----
{
  const input = (o: Partial<PlayerInput> = {}): PlayerInput => ({ move: new THREE.Vector3(), run: false, jumpPressed: false, jumpHeld: false, attackPressed: false, dodgePressed: false, guardHeld: false, stowPressed: false, ...o });
  const fwd = new THREE.Vector3(0, 0, 1);
  /** He jumps at a block 3 high (its face at z = 0.7), with `extra` near it. Says whether he caught its edge, and how his fall ended. */
  const jumpAt = (extra: Aabb[]): { caught: boolean; onTop: boolean; p: PlayerController } => {
    const colliders = [makeAabb(0, -0.5, 0, 40, 1, 40), makeAabb(0, 1.5, 1.5, 2, 3, 1.6), ...extra];
    const p = new PlayerController(new THREE.Vector3(0, 0, -0.6));
    for (let i = 0; i < 5; i++) p.update(1 / 60, input(), colliders);
    p.update(1 / 60, input({ move: fwd, jumpPressed: true, jumpHeld: true }), colliders);
    let caught = false;
    let onTop = false;
    for (let i = 0; i < 240; i++) {
      // Once he has hold of it he pulls himself up; once he is up (or back on the floor) he stands still.
      const hanging = p.state === 'hang';
      const done = onTop || (caught && p.grounded) || (i > 60 && p.grounded);
      p.update(1 / 60, input(hanging ? { jumpPressed: true } : done ? {} : { move: fwd.clone().multiplyScalar(0.5), jumpHeld: true }), colliders);
      if (p.state === 'hang' || p.state === 'climb') caught = true;
      if (p.grounded && Math.abs(p.position.y - 3) < 0.01) onTop = true;
    }
    return { caught, onTop, p };
  };
  const open = jumpAt([]);
  check('with nothing over it, he catches the edge of a block and pulls himself up', open.caught && open.onTop);
  // Another platform over the block, a rat's height less a bit above its top: room to hang, none to climb.
  const low = jumpAt([makeAabb(0, 3.9 + 0.25, 1.5, 2, 0.5, 1.6)]);
  check('with another platform too low over it, he does not catch the edge at all (he used to, and hauled himself up into it)', !low.caught && !low.onTop && low.p.grounded && low.p.position.y < 0.01, `ended at height ${low.p.position.y.toFixed(2)}`);
  // The same platform out over the edge, above where his head would be as he comes up.
  const over = jumpAt([makeAabb(0, 3.6 + 0.25, 0.2, 2, 0.5, 1)]);
  check('nor with one out over the edge, above where he would hang', !over.caught && over.p.position.y < 0.01);
  // High enough to stand under: he catches it as usual.
  const high = jumpAt([makeAabb(0, 4.3 + 0.25, 1.5, 2, 0.5, 1.6)]);
  check('with the platform a full rat\'s height above, he catches it and stands under it', high.caught && high.onTop);

  // The crush rule: his body in the underside of a block counts only while a moving platform is carrying him.
  const ceiling = makeAabb(0, 2.25, 0, 4, 0.5, 4); // its underside at 2
  const lift = makeAabb(0, 0.75, 0, 2, 0.5, 2); // its top at 1
  const riding = new THREE.Vector3(0, 1.2, 0); // on the lift, his head 0.3 into the ceiling
  check('carried up into a ceiling by a lift, he is crushed', pinnedUnder(riding, [ceiling, lift], [lift], new THREE.Vector3(0, 2, 0)));
  check('standing in the same place with no platform moving under him, he is not', !pinnedUnder(riding, [ceiling, lift], [lift], new THREE.Vector3()) && !pinnedUnder(riding, [ceiling], [], new THREE.Vector3(0, 2, 0)));
  check('with room over his head, a lift carrying him crushes nobody', !pinnedUnder(new THREE.Vector3(0, 0.5, 0), [ceiling, lift], [lift], new THREE.Vector3(0, 2, 0)));

  // How many such places the worlds have: one platform's underside less than a rat's height above another's top,
  // the two overlapping in plan. He will not catch an edge there now; before, each was a place to be hurt.
  let tight = 0;
  const where: string[] = [];
  for (const def of LEVELS) {
    let n = 0;
    const tops = def.solids.filter((b) => !b.hidden && b.kind !== 'wall');
    for (const a of tops) {
      for (const b of def.solids) {
        if (a === b || b.hidden) continue;
        const gap = b.y0 - a.y1;
        if (gap < 0.05 || gap > TUNING.rat.height + 0.05) continue;
        if (Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0) > 0.3 && Math.min(a.z1, b.z1) - Math.max(a.z0, b.z0) > 0.3) n++;
      }
    }
    tight += n;
    if (n) where.push(`${def.id} ${n}`);
  }
  check('(for the record: the places in the worlds where one thing sits less than a rat\'s height above another)', tight >= 0, where.join(', ') || 'none');
}

// ---- Drains in the walls: barred and bricked round, so they do not look like a way in ----
{
  const plain = new THREE.MeshBasicMaterial();
  const drain = buildDrain(2, false, plain, plain);
  drain.group.updateMatrixWorld(true);
  const reach = (m: THREE.Mesh): number => {
    const b = new THREE.Box3().setFromObject(m);
    return Math.max(Math.hypot(b.min.x, b.min.y), Math.hypot(b.max.x, b.max.y), Math.hypot(b.min.x, b.max.y), Math.hypot(b.max.x, b.min.y));
  };
  const uprights = drain.bars.filter((b) => new THREE.Box3().setFromObject(b).getSize(new THREE.Vector3()).y > 0.5);
  const widest = Math.max(...uprights.map((b, i) => (i ? b.position.x - uprights[i - 1].position.x : 0)));
  check('a drain has iron bars across its mouth, too close together to walk between', uprights.length >= 3 && widest < 0.7 && drain.bars.length > uprights.length, `${uprights.length} uprights, ${widest.toFixed(2)} apart, and a crossbar`);
  check('the bars stay inside the mouth and stand in front of the dark', drain.bars.every((b) => reach(b) <= 2.06 && b.position.z > drain.mouth.position.z + 0.03));
  const tones = new Set(drain.bricks.map((b) => (b.geometry.attributes.color.array as Float32Array).slice(0, 3).join()));
  check('round it is a ring of separate bricks, of more than one shade, standing proud of the wall', drain.bricks.length >= 12 && tones.size >= 3 && drain.bricks.every((b) => Math.hypot(b.position.x, b.position.y) > 2 && b.position.z > 0.02), `${drain.bricks.length} bricks, ${tones.size} shades`);
  const tunnel = buildDrain(1.35, true, plain, plain);
  tunnel.group.updateMatrixWorld(true);
  // Low in the middle, a rat's width of nothing.
  const blocked = tunnel.bars.some((b) => {
    const box = new THREE.Box3().setFromObject(b);
    return box.min.x < 0.15 && box.max.x > -0.15 && box.min.y < -0.6;
  });
  const whole = drain.bars.some((b) => {
    const box = new THREE.Box3().setFromObject(b);
    return box.min.x < 0.15 && box.max.x > -0.15 && box.min.y < -1.2;
  });
  check('the tunnel a rat came in by has one bar broken off short: room at the bottom for a rat', !blocked && whole && tunnel.bars.length >= 4);
  const holes = LEVELS.flatMap((l) => (l.decor ?? []).filter((d) => d.kind === 'hole'));
  check('(every drain in the worlds is drawn this way)', holes.length >= 2, `${holes.length} drains`);
}

console.log(failures === 0 ? '\nall passed' : `\n${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
