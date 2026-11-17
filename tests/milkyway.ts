// THE MILKY WAY (src/levels/milkyway.ts): the dream, as a try-out room. A rainbow road downhill through space.
// The owner, 2026-11-16: "he's like surfing on the Milky Way in outer space like some kind of downhill like rainbow
// road ... slide down on his shield ... stars and planets ... he could be like neon pink and green ... his scarf is
// like crazy exaggerated".
// Holds: that it is a try-out room and how he gets to it; that the road can be RIDDEN top to bottom with the real
// controller (every gap crossed, every bottle cap taken, landing on the Moon); that a slow rider needs the jump off
// the board at a gap; that off the side is a fall he is put back from; and that the dream's look is only looks.
import './../src/core/colorSetup';
import * as THREE from 'three';
import { PlayerController, type PlayerInput } from '../src/player/controller';
import { aabbOf, topAt, slopeOf, type Aabb } from '../src/world/collision';
import { CollectibleTracker } from '../src/world/collectibles';
import { buildChamber } from '../src/world/chamber';
import { milkyWay, milkyWayPlan, wayAt, ROAD, LENGTHS, MOON, FALL_DEPTH, WAY_PRIZES, CAP_UP, makeAutoRide } from '../src/levels/milkyway';
import { garden, GARDEN } from '../src/levels/garden';
import { LEVELS, ARCHIVE, TEST_ROOMS, levelById } from '../src/levels/levels';
import { STREAMER, RatModel, DREAM_LOOK } from '../src/player/ratModel';
import { MOTES } from '../src/world/motes';
import { getTexturePixels, getTexture, blinkTextures } from '../src/render/textures';
import { Dozer, DOZER, dreamColour } from '../src/world/dozers';
import { TUNING } from '../src/data/tuning';
import { standsOn } from '../src/enemies/footing';

const DT = 1 / 60;
let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}
const def = milkyWay();
const P = milkyWayPlan();
const cs: Aabb[] = def.solids.map((b) => aabbOf(b));
const inp = (o: Partial<PlayerInput>): PlayerInput => ({ move: new THREE.Vector3(), run: true, jumpPressed: false, jumpHeld: false, attackPressed: false, dodgeHeld: false, dodgePressed: false, guardHeld: false, stowPressed: false, sneak: false, ...o } as PlayerInput);
const v = (x: number, z: number): THREE.Vector3 => new THREE.Vector3(x, 0, z);
const R = TUNING.rat.radius;
const ground = (x: number, z: number): number => Math.max(-Infinity, ...cs.filter((b) => x >= b.min.x && x <= b.max.x && z >= b.min.z && z <= b.max.z).map((b) => topAt(b, x, z)));

// ---------------------------------------------------------------- what it is
{
  check('the Milky Way is a try-out room: found by its name, among the test rooms, and in none of the game\'s lists', levelById('milkyway')?.id === 'milkyway' && TEST_ROOMS.some((l) => l.id === 'milkyway') && ![...LEVELS, ...ARCHIVE].some((l) => l.id === 'milkyway'));
  const g = garden();
  const door = g.courseDoors?.find((d) => d.to === 'milkyway');
  const gs = g.solids.map((b) => aabbOf(b));
  const others = [g.exit, ...(g.courseDoors ?? []).filter((d) => d !== door).map((d) => d.door)];
  check('a door in the Move Garden\'s north wall leads to it: open from the start, floor to stand on before it, well clear of the garden\'s other doors', !!door && door.need === 0 && Math.abs(door.door.z + (GARDEN.halfZ - 0.08)) < 0.01 && standsOn(gs, door.door.x, 0, door.door.z + 1.6, 0.6) && standsOn(gs, door.door.x, 0, door.door.z + 4, 0.6) && others.every((o) => Math.hypot(o.x - door.door.x, o.z - door.door.z) > 10));
  check('it has a sky and no roof or walls: a dome of stars (`sky`), stars drifting round him (`motes`), nothing in it called a wall', def.sky === 'space' && def.motes === 'stars' && !!MOTES.stars && !def.solids.some((b) => b.kind === 'wall'));
  const planets = def.decor.filter((d) => d.kind === 'planet') as Array<{ x: number; y: number; z: number; r: number; color: number; band: number }>;
  check('planets hang about the road, each its own two colours, none within reach of it: every one is further off than its own size and then some from the nearest of the road', planets.length >= 6 && planets.every((p) => p.color !== p.band) && planets.every((p) => {
    const w = wayAt(Math.max(0, Math.min(P.moon.z1, p.z)));
    return Math.hypot(p.x - w.x, p.y - w.y, p.z - Math.max(0, Math.min(P.moon.z1, p.z))) > p.r + 12;
  }), `${planets.length} planets`);
  check('every planet is near enough to be SEEN (the view reaches two hundred): from somewhere on the road it is closer than that', planets.every((p) => P.lengths.some((l) => Math.hypot(p.x - l.x, p.y - l.y0, p.z - l.z0) - p.r < 190 || Math.hypot(p.x - l.x, p.y - l.y1, p.z - l.z1) - p.r < 190)));
  let built = true;
  try {
    buildChamber({ solids: def.solids, pit: def.pit, water: def.water, decor: def.decor, movers: [] } as never);
  } catch (e) {
    built = false;
    console.log(String(e));
  }
  check('it builds (its planets too); there is nothing to fight, and its way out stands on the Moon and leads back to the garden', built && def.enemies.length === 0 && def.goals.length === 0 && def.returnTo === 'garden' && Math.abs(ground(def.exit.x, def.exit.z - 1)) < 1e-9 && def.exit.z > P.moon.z0 + 10);
}

// ---------------------------------------------------------------- the road
{
  const roads = cs.filter((b) => b.ramp);
  check('four lengths of road and an easing-out, each a slope down to the south as steep as a ride needs (the air attack over anything gentler is a dive, not the shield)', LENGTHS.length === 4 && roads.length === 5 && roads.slice(0, 4).every((b) => Math.abs(slopeOf(b) - ROAD.slope) < 1e-6) && ROAD.slope >= TUNING.ride.minSlope && slopeOf(roads[4]) < ROAD.slope);
  check('the road is one rainbow wide: its picture is as wide as it is, so there is one of each colour across it', ROAD.wide === 7 && roads.every((b) => Math.abs(b.max.x - b.min.x - ROAD.wide) < 1e-9));
  // The picture itself: the same either side of the middle line, a white kerb at each edge, seven colours between.
  {
    const px = getTexturePixels('rainbowRoad');
    const S = px.size;
    const at = (x: number, y: number): number => (px.data[(y * S + x) * 4] << 16) | (px.data[(y * S + x) * 4 + 1] << 8) | px.data[(y * S + x) * 4 + 2];
    const hue = (c: number): number => {
      const r = (c >> 16) / 255;
      const g = ((c >> 8) & 255) / 255;
      const b = (c & 255) / 255;
      const mx = Math.max(r, g, b);
      const mn = Math.min(r, g, b);
      if (mx - mn < 0.15) return -1;
      const h = mx === r ? ((g - b) / (mx - mn) + 6) % 6 : mx === g ? (b - r) / (mx - mn) + 2 : (r - g) / (mx - mn) + 4;
      return Math.round(h * 60);
    };
    // A row clear of the arrowheads; across half the tile from the seam (the road's middle) to its edge.
    const row = 20;
    const hues = new Set<number>();
    for (let x = 0; x < S / 2; x++) {
      const h = hue(at(x, row));
      if (h >= 0) hues.add(Math.round(h / 40));
    }
    let mirrored = 0;
    for (let x = 0; x < S / 2; x++) if (Math.abs(hue(at(x, row)) - hue(at(S - 1 - x, row))) <= 12) mirrored++;
    const edge = at(S / 2, row);
    check('...the picture is laid out from the road\'s middle outward and is the same either side; it has at least six different colours between the middle and the kerb, and the kerb is white', mirrored >= S / 2 - 3 && hues.size >= 6 && (edge >> 16) > 230 && ((edge >> 8) & 255) > 200 && (edge & 255) > 230, `${hues.size} colours, ${mirrored} of ${S / 2} dots mirrored`);
  }
  // Each gap: the next length starts under the line of the one before, by more than a ride at speed falls in crossing it.
  const hz = TUNING.ride.max * Math.cos(Math.atan(ROAD.slope));
  const gaps = LENGTHS.slice(0, -1).map((s, i) => {
    const a = P.lengths[i];
    const b = P.lengths[i + 1];
    const wide = b.z0 - a.z1;
    const line = a.y1 - wide * ROAD.slope;
    const t = wide / hz;
    return { wide, under: line - b.y0, falls: 0.5 * TUNING.physics.gravity * TUNING.physics.fallGravityMultiplier * t * t, side: Math.abs(b.x - a.x) };
  });
  check('three gaps, six or seven across, the next length set to one side of the last: at the road\'s speed he falls about two under its line in crossing one, and the next length starts over three under it (and less than a length\'s thickness more, so a slow rider meets its end and not the sky)', gaps.length === 3 && gaps.every((g) => g.wide >= 6 && g.wide <= 7 && g.under > g.falls + 0.8 && g.side >= 2.5 && g.side < ROAD.wide - 1), gaps.map((g) => `${g.wide} across: falls ${g.falls.toFixed(2)}, next is ${g.under.toFixed(2)} under`).join('; '));
  check('nothing he rides or stands on is below where the game sends a faller back from (six under zero): the Moon is the level\'s zero', cs.every((b) => b.max.y >= -1e-9) && Math.abs(ground(0, P.moon.z0 + 5)) < 1e-9 && P.headY > 100);
}

// ---------------------------------------------------------------- ridden
interface Run { p: PlayerController; seconds: number; fastest: number; got: Set<string>; lowestUnder: number; landed: number[]; rode: boolean; bailed: boolean }
/**
 * A ride from the head pad: a hop off its edge and ATTACK, then he steers at the middle of the length ahead. `jump`:
 * whether he jumps off the board at the lip of each gap. `brakeTo`: he keeps his speed down to this by braking.
 */
function ride(opts: { jump?: boolean; brakeTo?: number; frames?: number; steer?: (p: PlayerController) => number | null } = {}): Run {
  const p = new PlayerController(new THREE.Vector3(0, P.headY, -3));
  const bag = new CollectibleTracker([{ id: def.id, name: def.name, items: def.collectibles }], null);
  const got = new Set<string>();
  let rode = false;
  let seconds = 0;
  let fastest = 0;
  let lowestUnder = 0;
  let bailed = false;
  const landed: number[] = [];
  let wasAir = false;
  const jumped = new Set<number>();
  for (let i = 0; i < 12; i++) p.update(DT, inp({}), cs);
  for (let i = 0; i < (opts.frames ?? 4200); i++) {
    rode ||= p.riding;
    const getOn = { move: v(0, 1), run: false, jumpPressed: p.grounded && p.position.z > -0.6, jumpHeld: false, attackPressed: !p.grounded && p.position.z > 0.3 };
    let input: Partial<PlayerInput> = getOn;
    if (rode) {
      const z = p.position.z;
      const here = P.lengths.find((l) => z >= l.z0 - 0.5 && z <= l.z1);
      const next = P.lengths.find((l) => l.z0 > z);
      // He leans toward the middle of the length he is on; near its end, toward the next one's.
      // (For the last of a length he keeps to the strip it shares with the next, which is set to one side: he must
      // not ride off the side of his own before its end.)
      const aimX = opts.steer?.(p) ?? (here && next && here.z1 - z < 16 ? (here.x + next.x) / 2 : (here ?? next)?.x ?? 0);
      const going = Math.atan2(p.velocity.x, p.velocity.z);
      const want = Math.max(-0.35, Math.min(0.35, (aimX - p.position.x) / 5));
      const speed = Math.hypot(p.velocity.x, p.velocity.z);
      // (One press, in the last stride before the lip of a length that ends in a gap.)
      const li = here ? P.lengths.indexOf(here) : -1;
      const lip = !!here && li < LENGTHS.length - 1 && here.z1 - z < 0.7 && here.z1 - z >= 0 && p.grounded && !jumped.has(li);
      if (lip && opts.jump) jumped.add(li);
      const brake = opts.brakeTo !== undefined && speed > opts.brakeTo && p.grounded;
      input = { run: false, move: p.grounded ? v(Math.max(-0.8, Math.min(0.8, (want - going) * 4)), brake ? -1 : 0) : v(0, 0), jumpPressed: !!opts.jump && lip, jumpHeld: !!opts.jump && !p.grounded };
      seconds += DT;
      fastest = Math.max(fastest, speed);
    }
    p.update(DT, inp(input), cs);
    if (p.moveEvent === 'bail') bailed = true;
    if (process.env.WAY_TRACE && rode) for (const c of def.collectibles) if (Math.abs(p.position.z - c.z) < 0.14) console.log(`TRACE at the middle of a gap: x ${p.position.x.toFixed(2)} (cap ${c.x.toFixed(2)}), feet ${p.position.y.toFixed(2)} (cap ${c.y.toFixed(2)})`);
    for (const c of bag.tryCollect(def.id, p.position, R, TUNING.rat.height)) got.add(c.id);
    if (rode) {
      const w = wayAt(p.position.z);
      lowestUnder = Math.max(lowestUnder, w.y - p.position.y);
      if (wasAir && p.grounded) landed.push(P.lengths.findIndex((l) => p.position.z >= l.z0 && p.position.z <= l.z1));
      wasAir = !p.grounded;
    }
    if (p.position.y < -3) break;
    if (rode && p.position.z > P.moon.z0 + 2 && p.grounded && Math.hypot(p.velocity.x, p.velocity.z) < 0.5) break;
  }
  return { p, seconds, fastest, got, lowestUnder, landed, rode, bailed };
}
{
  const run = ride();
  const onMoon = run.p.grounded && Math.abs(run.p.position.y) < 0.05 && run.p.position.z > P.moon.z0 && Math.abs(run.p.position.x) < MOON.half;
  check('RIDDEN, top to bottom, with the real controller: a hop off the pad and ATTACK puts him on his shield; steering at the middle of each length ahead and never jumping, he crosses all three gaps and comes to rest on the Moon', run.rode && onMoon && run.landed.filter((i) => i >= 1 && i <= 3).length >= 3, `${run.seconds.toFixed(1)} s, top speed ${run.fastest.toFixed(1)}, ends at ${run.p.position.x.toFixed(1)}, ${run.p.position.y.toFixed(2)}, ${run.p.position.z.toFixed(1)}; landed on lengths ${run.landed.join()}`);
  check('...at the road\'s top speed, in about a quarter of a minute: a short ride, for a try-out', run.fastest > TUNING.ride.max - 1 && run.seconds > 12 && run.seconds < 40, `${run.seconds.toFixed(1)} s`);
  check('...taking NO bottle cap: rolled off the end of a length without a jump he passes well under each', run.got.size === 0 && def.collectibles.length === 3 && def.collectibles.every((c) => c.kind === 'cap'), [...run.got].join());
  check('...and never further under the road\'s line than the gaps put him (well short of the depth he is put back from)', run.lowestUnder < 6 && FALL_DEPTH > 20, `${run.lowestUnder.toFixed(2)} at the most`);
  const withJumps = ride({ jump: true });
  check('with a JUMP OFF THE BOARD at the lip of each gap he makes it too, and takes all three bottle caps: each hangs over the middle of its gap, down the middle of the strip the two lengths share, up where that jump carries him (they are all there is to find, and each is earned by a jump)', withJumps.p.grounded && Math.abs(withJumps.p.position.y) < 0.05 && withJumps.p.position.z > P.moon.z0 && WAY_PRIZES.every((id) => withJumps.got.has(id)) && CAP_UP > 1 && def.collectibles.every((c, i) => c.x === (LENGTHS[i].x + LENGTHS[i + 1].x) / 2), `ends at ${withJumps.p.position.y.toFixed(2)}, ${withJumps.p.position.z.toFixed(1)}; took ${[...withJumps.got].join() || 'none'}`);
  // Slow: braked to well under the road's speed, no jump: he does not clear the first gap.
  const slow = ride({ brakeTo: 7, frames: 1500 });
  const fellAt = slow.p.position.z;
  check('a SLOW rider who does not jump does not clear a gap: braked to under half the road\'s speed he drops short of the next length and falls (the gaps are something, not nothing)', slow.rode && (slow.p.position.y < wayAt(fellAt).y - 6 || slow.p.position.y < -3) && fellAt < P.lengths[1].z0 + 3, `at z ${fellAt.toFixed(1)}, ${(wayAt(fellAt).y - slow.p.position.y).toFixed(1)} under the road`);
  const slowJump = ride({ brakeTo: 10.5, jump: true, frames: 1100 });
  check('...and one who is slow but JUMPS at the lip lands the first gap', slowJump.landed.includes(1), `landed on lengths ${slowJump.landed.join()}; at z ${slowJump.p.position.z.toFixed(1)}`);
  // Off the side.
  const off = ride({ steer: () => 40, frames: 700 });
  check('there are no walls: steered off the side of the road he falls, further than the depth at which he is put back on the last ground he stood on, a heart the poorer (`fallDepth`)', off.rode && wayAt(off.p.position.z).y - off.p.position.y > FALL_DEPTH - 5 && def.fallDepth === FALL_DEPTH && !def.fallBack, `${(wayAt(off.p.position.z).y - off.p.position.y).toFixed(1)} under the road when the frames ran out`);
}

// ---------------------------------------------------------------- the dream's look
{
  // (The Big Dipper, 2026-11-17, is the dream too: its long ride.)
  check('in the dream he wears another look (`look`), and nowhere else: no level of the game asks for it, and of the try-out rooms only the dream\'s two', def.look === 'dream' && [...LEVELS, ...ARCHIVE, ...TEST_ROOMS.filter((l) => l.id !== 'milkyway' && l.id !== 'bigdipper')].every((l) => l.look === undefined));
  const rat = new RatModel();
  const dream = new RatModel(DREAM_LOOK);
  const paintOf = (r: RatModel): number[] => {
    const out: number[] = [];
    r.root.traverse((o) => {
      const m = o as THREE.Mesh;
      const c = m.isMesh ? m.geometry.attributes.color : null;
      if (c) for (let i = 0; i < c.count; i += 7) out.push(Math.round(c.getX(i) * 255), Math.round(c.getY(i) * 255), Math.round(c.getZ(i) * 255));
    });
    return out;
  };
  const shapeOf = (r: RatModel): number => {
    let n = 0;
    r.root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) n += m.geometry.attributes.position.count;
    });
    return n;
  };
  const own = paintOf(rat);
  const shape = shapeOf(rat);
  rat.wearColours(dream);
  const worn = paintOf(rat);
  const changed = worn.filter((c, i) => c !== own[i]).length / worn.length;
  /** How strong the colours are: the mean of (brightest channel - dullest), 0..255. */
  const loud = (p: number[]): number => {
    let s = 0;
    for (let i = 0; i < p.length; i += 3) s += Math.max(p[i], p[i + 1], p[i + 2]) - Math.min(p[i], p[i + 1], p[i + 2]);
    return s / (p.length / 3);
  };
  check('wearing the dream\'s colours changes most of his paint and makes it far louder; it changes nothing of his SHAPE (the same points in the same places)', changed > 0.6 && loud(worn) > loud(own) * 1.8 && shapeOf(rat) === shape && worn.join() === paintOf(dream).join(), `${Math.round(changed * 100)}% of his paint changed; loudness ${loud(own).toFixed(0)} to ${loud(worn).toFixed(0)}`);
  rat.wearColours(null);
  check('...and taking them off puts his own paint back exactly, every part (even two parts of one shape)', paintOf(rat).join() === own.join());
  rat.wearColours(dream);
  rat.wearColours(dream);
  rat.wearColours(null);
  check('...whatever order they are put on and off in', paintOf(rat).join() === own.join());
  // After a helmet has been put on anew (which makes it a new part), both dressed alike still pair up.
  rat.setHelmet({ dome: 0xa9b3bc, rim: 0x77818b, spike: 0xd4aa3c });
  dream.setHelmet({ dome: 0xff8a2a, rim: 0x7a3cff, spike: 0xffffff });
  const before = paintOf(rat);
  rat.wearColours(dream);
  const after = paintOf(rat);
  check('a helmet put on anew is a new part of him: with the dream\'s rat dressed the same way first, every part still takes its paint (one ear stayed brown when it was not)', after.join() === paintOf(dream).join() && after.filter((c, i) => c !== before[i]).length / after.length > 0.6);
  rat.wearColours(null);
  // The scarf: in the dream it is THE STREAMER, a ribbon that flies. (The owner, of the short scarf stretched and
  // held out stiff: "it just sort of looks like he's got a second tail coming out of his neck".)
  const ribbon = (rat as unknown as { streamer: THREE.Mesh }).streamer;
  const idle = { state: 'idle', planarSpeed: 0, comboStep: 0, attackTime: 0, dodgeKind: 'roll', dodgeProgress: 0, verticalSpeed: 0, flipProgress: 0, armed: false, stowProgress: -1, plungeStage: 0 } as never;
  rat.setTransform(new THREE.Vector3(0, 0, 0), 0);
  rat.update(1 / 60, idle);
  const offBefore = ribbon.visible;
  rat.setScarfLong(3.2);
  const shapes: string[] = [];
  let stretched = 0;
  let low = Infinity;
  let behind = -Infinity;
  for (let i = 0; i < 180; i++) {
    rat.update(1 / 60, idle);
    const pts = rat.streamerPoints();
    for (let q = 1; q < pts.length; q++) stretched = Math.max(stretched, Math.abs(pts[q].distanceTo(pts[q - 1]) - STREAMER.length / (STREAMER.points - 1)));
    low = Math.min(low, ...pts.map((q) => q.y));
    if (i >= 60) behind = Math.max(behind, pts[pts.length - 1].z - pts[0].z);
    if (i % 12 === 0) shapes.push(pts.map((q) => q.y.toFixed(2)).join());
  }
  const end = rat.streamerPoints()[STREAMER.points - 1].clone();
  const start = rat.streamerPoints()[0].clone();
  const onInDream = ribbon.visible;
  // He turns round on the spot: its end is left where it was for a moment, and then comes round behind him again.
  rat.setTransform(new THREE.Vector3(0, 0, 0), Math.PI);
  rat.update(1 / 60, idle);
  const lag = rat.streamerPoints()[STREAMER.points - 1].distanceTo(end);
  for (let i = 0; i < 120; i++) rat.update(1 / 60, idle);
  const round = rat.streamerPoints()[STREAMER.points - 1].z - rat.streamerPoints()[0].z;
  rat.setScarfLong(1);
  rat.update(1 / 60, idle);
  check('his scarf in the dream is a STREAMER: a ribbon out behind him longer than he is tall, there in the dream and put away again after', !offBefore && onInDream && !ribbon.visible && STREAMER.length > 1.2 && start.distanceTo(end) > STREAMER.length * 0.6, `${STREAMER.length} long; its end ${start.distanceTo(end).toFixed(2)} from his neck`);
  check('it flies BEHIND him and never hangs: its end is behind his neck, and no point of it comes down near the floor', behind < -0.5 && low > 0.45, `end ${(-behind).toFixed(2)} behind; lowest point ${low.toFixed(2)} up`);
  check('it flutters: no two looks at it a fifth of a second apart find it the same shape; and it is cloth, not elastic (no length of it stretches)', new Set(shapes).size === shapes.length && stretched < 1e-6, `${shapes.length} looks, ${new Set(shapes).size} shapes`);
  check('when he turns it is left behind for a moment (it is in the room, not stuck to his back) and then streams out behind him the new way', lag < 0.6 && round > 0.5, `moved ${lag.toFixed(2)} in the first frame of the turn; then ${round.toFixed(2)} behind him the other way`);
}

// ---------------------------------------------------------------- the second pass: static, flowers, butterflies, sleepers
{
  const def = milkyWay();
  const P = milkyWayPlan();
  const half = ROAD.wide / 2;
  const fuzz = def.solids.filter((b) => b.skin === 'dreamStatic');
  check('its kerbs are in the dream\'s STATIC, every one of them, and nothing he rides on is', fuzz.length >= 8 && fuzz.every((b) => b.y1 - Math.max(b.y0, b.y1 - MOON.kerb - ROAD.deep) > 2) && !def.solids.some((b) => b.skin === 'dreamStatic' && b.ramp));
  // The static: many colours, mostly dark, and it WINKS.
  const px = getTexturePixels('dreamStatic');
  const cols = new Set<number>();
  let bright = 0;
  for (let i = 0; i < px.data.length; i += 4) {
    cols.add((px.data[i] << 16) | (px.data[i + 1] << 8) | px.data[i + 2]);
    if (px.data[i] + px.data[i + 1] + px.data[i + 2] > 380) bright++;
  }
  check('the static is a busy noise of many colours, mostly dark, a bright dot here and there', cols.size >= 10 && bright / (px.data.length / 4) > 0.03 && bright / (px.data.length / 4) < 0.2, `${cols.size} colours, ${((bright / (px.data.length / 4)) * 100).toFixed(0)}% bright`);
  const tex = getTexture('dreamStatic');
  const before = Uint8Array.from(tex.image.data as Uint8Array);
  blinkTextures(1);
  const first = Uint8Array.from(tex.image.data as Uint8Array);
  blinkTextures(1.02);
  const tooSoon = (tex.image.data as Uint8Array).every((v, i) => v === first[i]);
  blinkTextures(2);
  blinkTextures(3);
  const diff = (a: Uint8Array, b: Uint8Array): number => {
    let n = 0;
    for (let i = 0; i < a.length; i += 4) if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2]) n++;
    return n;
  };
  const now = Uint8Array.from(tex.image.data as Uint8Array);
  check('it WINKS: a few dozen of its dots change a few times a second, and the ones that changed before go back (it never fills up with bright)', diff(before, first) > 10 && diff(before, first) <= 46 && tooSoon && diff(before, now) <= 46 && diff(first, now) > 10, `${diff(before, first)} dots changed; after three winks ${diff(before, now)} differ from the first picture`);

  const beds = def.decor.filter((d) => d.kind === 'flowers') as Array<Extract<(typeof def.decor)[number], { kind: 'flowers' }>>;
  const flies = def.decor.filter((d) => d.kind === 'butterflies') as Array<Extract<(typeof def.decor)[number], { kind: 'butterflies' }>>;
  const cs = def.solids.map(aabbOf);
  const onFloor = beds.every((b) => [[-1, -1], [1, -1], [-1, 1], [1, 1]].every(([sx, sz]) => standsOn(cs, b.x + sx * (b.w / 2 - 0.1), b.y, b.z + sz * (b.d / 2 - 0.1), 0.05)));
  check('there are beds of flowers either side of the head pad and down both sides of the Moon: each lies wholly on floor, and none is on the road', beds.length === 4 && onFloor && beds.every((b) => Math.abs(b.x) - b.w / 2 >= half - 1e-6), beds.map((b) => `${b.x.toFixed(1)},${b.z.toFixed(0)}`).join(' '));
  check('butterflies fly over every bed, well clear of the floor', flies.length >= 4 && beds.every((b) => flies.some((f) => Math.abs(f.x - b.x) < b.w && Math.abs(f.z - b.z) < b.d)) && flies.every((f) => f.count >= 2 && f.y - 0.5 > (Math.abs(f.z) < 20 ? P.headY : 0)));

  const dz = def.dozers ?? [];
  const kinds = new Set(dz.map((d) => d.type));
  check('the waking world\'s terrors are here: a mantis, a scorpion and a Stag Knight, some asleep and some standing about', dz.length >= 5 && kinds.has('mantis') && kinds.has('scorpion') && kinds.has('stag') && dz.some((d) => !d.awake) && dz.some((d) => d.awake), dz.map((d) => `${d.type}${d.awake ? ' (awake)' : ''}`).join(', '));
  check('none of them is a creature of the fight: the level has no enemies at all, and nothing here can hurt him', def.enemies.length === 0);
  const solidOf = (d: (typeof dz)[number]): boolean => def.solids.some((b) => b.hidden && Math.abs((b.x0 + b.x1) / 2 - d.x) < 1e-6 && Math.abs((b.z0 + b.z1) / 2 - d.z) < 1e-6 && Math.abs(b.y0 - d.y) < 1e-6 && Math.abs(b.y1 - b.y0 - DOZER[d.type].tall) < 1e-6 && Math.abs((b.x1 - b.x0) / 2 - DOZER[d.type].half) < 1e-6);
  check('each is SOLID where it is drawn, stands on floor, and is well off the road (a rider down the middle meets none of them)', dz.every(solidOf) && dz.every((d) => standsOn(def.solids.filter((b) => !b.hidden).map(aabbOf), d.x, d.y, d.z, 0.3)) && dz.every((d) => Math.abs(d.x) - DOZER[d.type].half > half + 1.4), dz.map((d) => (Math.abs(d.x) - DOZER[d.type].half - half).toFixed(1)).join(' '));
  check('and each is in a bed of flowers', dz.every((d) => beds.some((b) => Math.abs(d.x - b.x) < b.w / 2 && Math.abs(d.z - b.z) < b.d / 2)));
  // A dozer's colours are loud, and it is put together without a page to draw on.
  const c = new THREE.Color();
  const dull = [[0.1, 0.12, 0.14], [0.4, 0.3, 0.2], [0.5, 0.5, 0.5], [0.9, 0.9, 0.9], [0.05, 0.3, 0.1]].filter(([r, g, b]) => {
    dreamColour(r, g, b, 0.42, c);
    const hsl = { h: 0, s: 0, l: 0 };
    c.getHSL(hsl);
    return hsl.s < 0.75 || hsl.l < 0.4 || hsl.l > 0.75;
  });
  check('the dream\'s colours are LOUD: any colour at all, dark, dull or grey, comes out full of colour and never dark', dull.length === 0);
  let made = 0;
  for (const d of dz) {
    const one = new Dozer(d);
    for (let i = 0; i < 30; i++) one.update(1 / 30);
    let meshes = 0;
    one.root.traverse((o) => { if ((o as THREE.Mesh).isMesh) meshes++; });
    if (meshes > 10 && one.root.children.filter((o) => (o as THREE.Sprite).isSprite).length === (d.awake ? 0 : 3)) made++;
  }
  check('each is made from the creature\'s own model; the sleepers have their three Z\'s and the wakers none', made === dz.length, `${made} of ${dz.length}`);
  let built = true;
  try {
    const ch = buildChamber({ solids: def.solids, pit: def.pit, water: def.water, decor: def.decor, movers: [] } as never);
    ch.update(0.5);
    ch.update(0.6);
  } catch (e) {
    built = false;
    console.log(String(e));
  }
  check('the place builds with all of it, and its clock runs (flowers nod, butterflies fly, the static winks)', built);
}

// ---- The rider for the films (`&autoride`): by itself, from the head of the road to the moon ----
{
  const d = milkyWay();
  const plan = milkyWayPlan();
  const solids = d.solids.map((b) => aabbOf(b));
  const p = new PlayerController(new THREE.Vector3(d.spawn.x, d.spawn.y + 0.01, d.spawn.z));
  const auto = makeAutoRide();
  let rode = false;
  let fell = false;
  let frames = 0;
  for (; frames < 6000; frames++) {
    const a = auto(p);
    p.update(DT, inp({ move: new THREE.Vector3(a.x, 0, a.z), run: a.run, jumpPressed: a.jumpPressed, jumpHeld: a.jumpHeld, attackPressed: a.attackPressed }), solids);
    rode ||= p.riding;
    if (p.position.y < wayAt(Math.max(0, Math.min(plan.moon.z1, p.position.z))).y - 12) fell = true;
    if (fell || (rode && p.position.z > plan.moon.z0 + 2 && p.grounded)) break;
  }
  check('the films\' rider rides the whole road by itself: on his shield from the lip, over every gap, to the moon', rode && !fell && p.position.z > plan.moon.z0 + 2, `${(frames / 60).toFixed(1)}s, ended at z ${p.position.z.toFixed(1)}`);
}

console.log(failures ? `\n${failures} FAILED` : '\nall passed');
if (failures) process.exit(1);
