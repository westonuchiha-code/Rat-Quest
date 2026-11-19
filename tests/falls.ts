// WHAT HE FOUND PLAYING, 2026-11-16 (three things, sent while other work was going on), and what holds each fix:
//   - "if it's a long fall it's a jittery ... towards the end of the Fall": he was DRAWN eased toward where he was
//     (the easing that walks him up stairs), lagged behind a fast fall, and was snapped down to it over and over.
//   - "When coming back up from falling down you can sometimes be standing Off the ledge": the last ground he stood
//     on could be a place where his middle was past the edge.
//   - the sign over the door to Leap of Faith, under the grotto's low roof: its name was up inside the roof; and the
//     dark block on top of that door's arch (a keystone of the cave's wall stone).
import './../src/core/colorSetup';
import * as THREE from 'three';
import { PlayerController, type PlayerInput } from '../src/player/controller';
import { aabbOf, makeAabb, type Aabb } from '../src/world/collision';
import { drawnHeight, safeToReturnTo, DRAW_SNAP, SAFE_MARGIN } from '../src/player/standing';
import { roomOverDoor, signFit, SIGN, SIGN_HANG } from '../src/world/courseDoors';
import { DOOR_LOOKS } from '../src/world/doorway';
import { DOOR_FRAME } from '../src/world/rooms';
import { LEVELS, TEST_ROOMS, levelById } from '../src/levels/levels';
import { TUNING } from '../src/data/tuning';

const DT = 1 / 60;
let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}
const inp = (o: Partial<PlayerInput>): PlayerInput => ({ move: new THREE.Vector3(), run: true, jumpPressed: false, jumpHeld: false, attackPressed: false, dodgeHeld: false, dodgePressed: false, guardHeld: false, stowPressed: false, sneak: false, ...o } as PlayerInput);

// ---------------------------------------------------------------- a long fall
{
  // The real controller, stepped off a ledge sixty up.
  const cs: Aabb[] = [makeAabb(0, 59.5, 0, 4, 1, 4), makeAabb(0, -0.5, 0, 40, 1, 40)];
  const p = new PlayerController(new THREE.Vector3(1.5, 60, 0));
  for (let i = 0; i < 10; i++) p.update(DT, inp({}), cs);
  const ys: number[] = [];
  const states = new Set<string>();
  let frames = 0;
  for (; frames < 400; frames++) {
    p.update(DT, inp({ move: new THREE.Vector3(1, 0, 0) }), cs);
    if (!p.grounded && p.position.y < 59) {
      ys.push(p.position.y);
      states.add(p.state);
    }
    if (p.grounded && p.position.y < 1) break;
  }
  const steps = ys.slice(1).map((y, i) => ys[i] - y);
  const steady = steps.every((s, i) => s > 0 && (i === 0 || s >= steps[i - 1] - 1e-6));
  check(
    'the RULES of a long fall are smooth: sixty units down he falls further every frame than the frame before, up to his fastest, never back and never a skip; he is "falling" the whole way',
    ys.length > 100
      && steady
      && states.size === 1
      && states.has('fall')
      && Math.abs(steps[steps.length - 1] - TUNING.physics.maxFall * DT) < 1e-6,
    `${ys.length} frames; last step ${steps[steps.length - 1].toFixed(3)}; states ${[...states].join()}`
  );

  // How he is DRAWN over that fall, at a phone's forty frames a second and at sixty: the old way, and now.
  const drawn = (fps: number, loose: boolean): { worst: number; snaps: number } => {
    const dt = 1 / fps;
    let y = 60;
    let v = 0;
    let was = 60;
    let worst = 0;
    let snaps = 0;
    let lagBefore = 0;
    for (let t = 0; t < 2.6; t += dt) {
      v = Math.min(TUNING.physics.maxFall, v + TUNING.physics.gravity * TUNING.physics.fallGravityMultiplier * dt);
      y -= v * dt;
      was = drawnHeight(was, y, loose, dt);
      const lag = was - y;
      worst = Math.max(worst, lag);
      // (A snap: the lag built up and then went to nothing in one frame.)
      if (lagBefore > 0.25 && lag < 1e-9) snaps++;
      lagBefore = lag;
    }
    return { worst, snaps };
  };
  const old40 = drawn(40, false);
  const old60 = drawn(60, false);
  check(
    'WHAT WAS WRONG: drawn with the walking ease, he lagged behind a fast fall (a third of a unit above where he was) and was snapped down to it again and again: dozens of times in one long fall at sixty frames a second, once he was falling fast. That is the jitter, and why it came toward the END of a long fall',
    old60.worst > 0.3
      && old60.snaps >= 20
      && old40.snaps >= 1
      && old40.worst > 0.2,
    `at 40 a second: up to ${old40.worst.toFixed(2)} behind, ${old40.snaps} snaps; at 60: ${old60.worst.toFixed(2)}, ${old60.snaps} snaps`
  );
  const now40 = drawn(40, true);
  const now60 = drawn(60, true);
  check(
    'NOW: in the air he is drawn exactly where he is, every frame, at any frame rate: no lag and nothing to snap',
    now40.worst < 1e-9
      && now60.worst < 1e-9
      && now40.snaps === 0
      && now60.snaps === 0
  );
  // The ease is still there for what it is for: walking up a step.
  let was = 0;
  const path: number[] = [];
  for (let i = 0; i < 20; i++) path.push((was = drawnHeight(was, 0.35, false, DT)));
  check(
    '...and walking he is still eased onto a step (up a third of a unit over several frames, not in one): the stairs are as they were',
    path[0] > 0.05
      && path[0] < 0.2
      && path[4] < 0.33
      && Math.abs(path[19] - 0.35) < 0.002
      && path.every((y, i) => i === 0 || y > path[i - 1])
  );
  check(
    `...a new place more than ${DRAW_SNAP} away is gone to at once, as before; and with no time gone by nothing moves`,
    drawnHeight(0, 5, false, DT) === 5
      && drawnHeight(0, 0.3, false, 0) === 0
  );
}

// ---------------------------------------------------------------- where he is put back
{
  // A block four across, alone over a drop; and the real controller walked off its edge as slowly as it goes.
  const block = makeAabb(0, 4.5, 0, 4, 1, 4);
  const cs: Aabb[] = [block, makeAabb(0, -20.5, 0, 60, 1, 60)];
  const p = new PlayerController(new THREE.Vector3(0, 5, 0));
  for (let i = 0; i < 10; i++) p.update(DT, inp({}), cs);
  let lastGrounded = 0;
  let lastSafe = 0;
  for (let i = 0; i < 600 && p.position.y > 4; i++) {
    p.update(DT, inp({ move: new THREE.Vector3(0.3, 0, 0), run: false }) /* (a light push on the stick: there is no sneak any more) */, cs);
    if (p.grounded) {
      lastGrounded = p.position.x;
      if (safeToReturnTo(cs, p.position.x, p.position.y, p.position.z)) lastSafe = p.position.x;
    }
  }
  check(
    'WHAT WAS WRONG: he still counts as standing with his middle PAST the edge (his round foot overlaps it), and that was taken as the last ground he stood on: put back there, he stood on nothing beside the ledge',
    lastGrounded > block.max.x,
    `his middle was at ${lastGrounded.toFixed(2)} when he last stood; the edge is at ${block.max.x}`
  );
  check(
    `NOW: the last place taken as safe has ground under his middle and for ${SAFE_MARGIN} round it on every side: nearly half a unit in from the edge`,
    lastSafe <= block.max.x - SAFE_MARGIN + 1e-9
      && lastSafe > block.max.x - SAFE_MARGIN - 0.2,
    `${lastSafe.toFixed(2)}`
  );
  check(
    'the middle of a floor is safe; right at an edge is not; a corner is not; in the air beside it is not; nor is a place whose "ground" is far under his feet',
    safeToReturnTo(cs, 0, 5, 0)
      && !safeToReturnTo(cs, 1.8, 5, 0)
      && !safeToReturnTo(cs, 1.8, 5, 1.8)
      && !safeToReturnTo(cs, 2.5, 5, 0)
      && !safeToReturnTo(cs, 0, 6, 0)
  );
  // In the real levels that put him back: wherever a place is safe, his whole foot is on something.
  let tried = 0;
  let bad = 0;
  for (const L of LEVELS.filter((l) => l.fallBack)) {
    const ls = L.solids.map((b) => aabbOf(b));
    for (const b of L.solids.filter((q) => q.kind !== 'wall' && q.x1 - q.x0 < 12 && q.z1 - q.z0 < 12).slice(0, 60)) {
      for (const [x, z] of [[b.x1 - 0.1, (b.z0 + b.z1) / 2], [b.x0 + 0.1, (b.z0 + b.z1) / 2], [(b.x0 + b.x1) / 2, b.z1 - 0.1], [(b.x0 + b.x1) / 2, b.z0 + 0.1]]) {
        if (!safeToReturnTo(ls, x, b.y1, z)) continue;
        tried++;
        // (Safe though a tenth from this block's edge: then something else at the same height is beside it.)
        const r = TUNING.rat.radius;
        if (![[r, 0], [-r, 0], [0, r], [0, -r]].every(([dx, dz]) => ls.some((q) => x + dx >= q.min.x && x + dx <= q.max.x && z + dz >= q.min.z && z + dz <= q.max.z && Math.abs(q.max.y - b.y1) < 0.31))) bad++;
      }
    }
  }
  check(
    'in the levels that put him back (the Hollows, the Keep): no place a tenth from the edge of a small platform is taken as safe unless there is more floor beside it',
    LEVELS.filter((l) => l.fallBack).length >= 2
      && bad === 0,
    `${tried} such places are safe, all with floor beside them`
  );
}

// ---------------------------------------------------------------- the sign over a door
{
  const high = SIGN.h / SIGN.dots;
  // (A door is known here by where it LEADS: what is written on it is "Test Room 8D" now, and may change again.)
  const all: Array<{ level: string; name: string; to: string | null; room: number; fit: ReturnType<typeof signFit> }> = [];
  for (const L of [...LEVELS, ...TEST_ROOMS]) for (const cd of L.courseDoors ?? []) {
    const room = roomOverDoor(L.solids, cd.door);
    all.push({ level: L.id, name: cd.name, to: cd.to, room, fit: signFit(room) });
  }
  const poke = all.filter((d) => !d.fit.fits || d.fit.foot + high * d.fit.scale > d.room - SIGN_HANG.clear + 1e-9);
  check(
    'EVERY door\'s sign, in every level, is wholly under whatever is over the door (a roof, a ledge, the ceiling), with a little to spare',
    all.length >= 20
      && poke.length === 0,
    `${all.length} doors${poke.length ? `; pokes through: ${poke.map((d) => `${d.level} ${d.name}`).join(', ')}` : ''}`
  );
  const faith = all.find((d) => d.to === 'faith')!;
  check(
    'the door to Leap of Faith, under the grotto\'s roof, has two and a bit units over it: its sign (two and a half high at full size, hung a unit up) did not fit; it is hung just over the opening now, smaller, out in front of the arch\'s top stones',
    faith.room > 2
      && faith.room < 2.5
      && faith.fit.scale < 1
      && faith.fit.scale >= 0.7
      && faith.fit.foot < 0.2
      && faith.fit.out > DOOR_FRAME.out + DOOR_FRAME.depth / 2,
    `room ${faith.room.toFixed(2)}, at ${Math.round(faith.fit.scale * 100)}% size`
  );
  const small = all.filter((d) => d.fit.scale < 1);
  check(
    '...and so is any other with a low roof (the Coal Cellars\' door in the Foundry); every door with room for it has its sign at full size, a unit over the arch, against the wall',
    small.length >= 2
      && small.some((d) => d.to === 'coalcellars')
      && all.filter((d) => d.fit.scale === 1).every((d) => d.fit.foot === SIGN_HANG.foot && d.fit.out < 0.2)
      && all.filter((d) => d.fit.scale === 1).length >= 16,
    small.map((d) => `${d.name} ${Math.round(d.fit.scale * 100)}%`).join(', ')
  );
  check(
    'no sign is made smaller than half size (it must still be read), and with less room than that takes `fits` says so; a little short of room to hang a unit up, it hangs low at its full size; shorter still, low and smaller',
    signFit(1).scale === SIGN_HANG.least
      && !signFit(1).fits
      && signFit(10).scale === 1
      && signFit(high + SIGN_HANG.foot + SIGN_HANG.clear).foot === SIGN_HANG.foot
      && signFit(high + SIGN_HANG.foot).foot === SIGN_HANG.low
      && signFit(2).scale < 1
      && signFit(2).fits
  );
  check(
    'a cave doorway\'s keystone is the arch\'s own stone (it was the dark wet rock of the cave\'s walls: on a pale arch, a block of wall stuck on top of the door)',
    DOOR_LOOKS.cave.key === DOOR_LOOKS.cave.frame
      && DOOR_LOOKS.cave.key !== 'wetRock'
      && levelById('hollows')?.theme === 'cave'
  );
}

console.log(failures ? `\n${failures} FAILED` : '\nall passed');
if (failures) process.exit(1);
