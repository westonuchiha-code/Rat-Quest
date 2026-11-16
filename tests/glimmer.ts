// THE GLIMMER DEEP (src/levels/glimmer.ts): the glowing cave as a real level, a side area of the Hollows.
// The owner's list, 2026-11-16: "a real level for the glowing cave (it is only a try-out room)".
// Holds: that it is part of the game and how he gets to it; that the Caps are a course (each a running jump from
// the last, played with the real controller) and the ONLY way to the High Shelf; that the Rift can be got out of;
// what its two wedges ask; and that its three finds are each got by moving, not by walking up to them.
import './../src/core/colorSetup';
import * as THREE from 'three';
import { PlayerController, PlayerInput } from '../src/player/controller';
import { makeAabb } from '../src/world/collision';
import { mushroomTop } from '../src/world/layout';
import { glimmerDeep, GLIMMER, LANDING, RIFT, FAR_BANK, HIGH_SHELF, CAPS, CAP_WIDE, RIFT_STEPS, SPIRE, GLIMMER_PRIZES, GLIMMER_WEDGES } from '../src/levels/glimmer';
import { LEVELS, TEST_ROOMS, levelById } from '../src/levels/levels';
import { buildChamber } from '../src/world/chamber';
import { standsOn } from '../src/enemies/footing';
import { STICKERS } from '../src/data/stickers';

const DT = 1 / 60;
let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}
const def = glimmerDeep();
const cs = def.solids.map((b) => makeAabb((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, (b.z0 + b.z1) / 2, b.x1 - b.x0, b.y1 - b.y0, b.z1 - b.z0));
const inp = (o: Partial<PlayerInput>): PlayerInput => ({ move: new THREE.Vector3(), run: true, jumpPressed: false, jumpHeld: false, attackPressed: false, dodgeHeld: false, dodgePressed: false, guardHeld: false, stowPressed: false, sneak: false, ...o } as PlayerInput);
interface Stop { x: number; z: number; top: number; r: number }
/**
 * He runs from `from` at `to` and jumps on frame `d` (and again `e` frames later, if e >= 0). Where he comes down:
 * on `to` (within its radius, at its height) or not.
 */
const hop = (from: Stop, to: Stop, d: number, e: number, back = 0.6): { ok: boolean; high: number; end: THREE.Vector3 } => {
  const far = Math.hypot(to.x - from.x, to.z - from.z);
  const p = new PlayerController(new THREE.Vector3(from.x - ((to.x - from.x) / far) * back, from.top + 0.01, from.z - ((to.z - from.z) / far) * back));
  for (let i = 0; i < 20; i++) p.update(DT, inp({}), cs);
  let high = p.position.y;
  for (let i = 0; i < 300; i++) {
    const dx = to.x - p.position.x;
    const dz = to.z - p.position.z;
    const dist = Math.hypot(dx, dz);
    const move = dist > 0.25 ? new THREE.Vector3(dx / dist, 0, dz / dist) : new THREE.Vector3();
    p.update(DT, inp({ move, jumpPressed: i === d || (e >= 0 && i === d + e), jumpHeld: i >= d }), cs);
    high = Math.max(high, p.position.y);
    if (i > d + 5 && p.grounded) return { ok: Math.abs(p.position.y - to.top) < 0.03 && Math.hypot(p.position.x - to.x, p.position.z - to.z) < to.r, high, end: p.position.clone() };
  }
  return { ok: false, high, end: p.position.clone() };
};
/** How many jump timings (of those tried) land a hop with one jump, and with two. */
const ways = (from: Stop, to: Stop, back = 0.6): { one: number; two: number } => {
  let one = 0;
  let two = 0;
  for (let d = 0; d <= 30; d++) {
    if (hop(from, to, d, -1, back).ok) one++;
    for (let e = 8; e <= 56; e += 6) if (hop(from, to, d, e, back).ok) two++;
  }
  return { one, two };
};
/**
 * The highest he can get his feet from a standing place, going at something `toward` (x, z): every way tried. He
 * starts a little back from it or right against it, jumps, and jumps again at every moment (clear of a wall that is
 * the second jump; against one it is a kick off it, which is tried too); an edge he passes he catches, and hauls
 * himself up.
 */
const reachUp = (x: number, y: number, z: number, toward: [number, number]): number => {
  let best = y;
  const dir = new THREE.Vector3(toward[0] - x, 0, toward[1] - z).normalize();
  for (const back of [0, 0.5, 1, 1.5, 2.2]) {
    for (let e = 4; e <= 52; e += 2) {
      const p = new PlayerController(new THREE.Vector3(x - dir.x * back, y + 0.01, z - dir.z * back));
      for (let i = 0; i < 10; i++) p.update(DT, inp({}), cs);
      if (!p.grounded) continue;
      let hung = 0;
      for (let i = 0; i < 260; i++) {
        hung = p.state === 'hang' ? hung + 1 : 0;
        p.update(DT, inp({ move: dir, jumpPressed: i === 0 || i === e || hung === 8, jumpHeld: hung === 0 || hung >= 8 }), cs);
        if (p.grounded && i > 10) best = Math.max(best, p.position.y);
      }
    }
  }
  return best;
};

// ---------------------------------------------------------------- it is part of the game
{
  const hollows = levelById('hollows')!;
  const door = hollows.courseDoors?.find((d) => d.to === 'glimmer');
  check('the Glimmer Deep is a level of the GAME, in the Hollows: in the game\'s list, not the test rooms\', and the way out of it leads back to the Hollows', LEVELS.some((l) => l.id === 'glimmer') && !TEST_ROOMS.some((l) => l.id === 'glimmer') && def.world === 'hollows' && def.returnTo === 'hollows' && levelById('glimmer')?.name === 'The Glimmer Deep');
  const hs = hollows.solids.map((b) => makeAabb((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, (b.z0 + b.z1) / 2, b.x1 - b.x0, b.y1 - b.y0, b.z1 - b.z0));
  const others = [hollows.exit, ...(hollows.courseDoors ?? []).filter((d) => d !== door).map((d) => d.door)];
  check('a door in the Hollows\' east wall leads to it: open from the start, on the cave\'s own floor with floor to stand on before it, and well clear of the other doors', !!door && door.need === 0 && (door.door.y ?? 0) === 0 && door.door.x > 47 && standsOn(hs, door.door.x - 1.4, 0, door.door.z, 0.4) && standsOn(hs, door.door.x - 3, 0, door.door.z, 0.4) && others.every((o) => Math.hypot(o.x - door.door.x, o.z - door.door.z) > 8));
  check('the try-out room is still there, for trying things in', TEST_ROOMS.some((l) => l.id === 'glowcave'));
  let built = true;
  try {
    buildChamber({ solids: def.solids, pit: def.pit, water: def.water, decor: def.decor, movers: [] } as never);
  } catch (e) {
    built = false;
    console.log(String(e));
  }
  check('it builds; it is a dark place with no lamp in it, lit only by what grows there (as the try-out settled)', built && (def.ambient ?? 1) < 0.6 && !def.decor.some((d) => d.kind === 'lamp' || d.kind === 'torch' || d.kind === 'brazier' || d.kind === 'light') && def.decor.filter((d) => d.kind === 'mushroom').length > 40 && def.decor.filter((d) => d.kind === 'moss').length > 35);
  check('he comes in on the Landing, on floor, facing the Rift, with nothing that has seen him: every creature starts further off than it notices him from, or down in the Rift out of his sight', standsOn(cs, def.spawn.x, LANDING, def.spawn.z, 0.4) && def.spawn.y === LANDING && def.spawn.z > RIFT.z1 + 3 && def.enemies.every((e) => (e.y ?? 0) < LANDING - 3 || Math.hypot(e.x - def.spawn.x, e.z - def.spawn.z) > 14));
}

// ---------------------------------------------------------------- the Caps
const caps: Stop[] = CAPS.map(([x, z, top]) => ({ x, z, top: mushroomTop(x, RIFT.floor, z, top - RIFT.floor + CAP_WIDE * 0.032, CAP_WIDE), r: CAP_WIDE * 0.72 }));
{
  check('four Caps grow out of the Rift\'s floor, their tops stepping up from just over the Landing to just under the High Shelf, each nearly two higher than the last', caps.length === 4 && caps.every((c, i) => Math.abs(c.top - CAPS[i][2]) < 0.02) && caps[0].top - LANDING > 1.5 && caps[0].top - LANDING < 2.3 && caps.every((c, i) => i === 0 || (c.top - caps[i - 1].top > 1.6 && c.top - caps[i - 1].top < 2.2)) && HIGH_SHELF.y - caps[3].top > 1.6 && HIGH_SHELF.y - caps[3].top < 2.2, caps.map((c) => c.top.toFixed(2)).join(', '));
  // The course, stop by stop: the Landing's lip, the four Caps, the Shelf's edge.
  const lip: Stop = { x: -12, z: RIFT.z1 + 0.5, top: LANDING, r: 1 };
  const shelf: Stop = { x: HIGH_SHELF.x0 + 1.2, z: caps[3].z - 0.5, top: HIGH_SHELF.y, r: 1.4 };
  const course = [lip, ...caps, shelf];
  const tally = course.slice(0, -1).map((s, i) => ways(s, course[i + 1], i === 0 ? 3 : 0.6));
  check('THE CAPS ARE A COURSE: from the Landing\'s lip to the first, from each to the next and from the last to the High Shelf, every hop can be made, and with ONE jump (a running jump: no second jump is needed anywhere on it)', tally.every((t) => t.one >= 3), tally.map((t) => `${t.one} one-jump timings, ${t.two} two-jump`).join('; '));
  check('...and none of them is a step: jumping the moment he sets off (no run) fails at every hop but the first, which has the Landing to run on', course.slice(1, -1).every((s, i) => !hop(s, course[i + 2], 0, -1).ok), course.slice(1, -1).map((s, i) => (hop(s, course[i + 2], 0, -1).ok ? 'lands' : 'falls')).join());
  // THE ONLY WAY UP: not from the Far Bank under the Shelf, not from the Landing, not from the Rift.
  const fromBank = reachUp(HIGH_SHELF.x0 - 0.5, FAR_BANK, -8, [HIGH_SHELF.x0 + 2, -8]);
  const fromLanding = reachUp(HIGH_SHELF.x0 - 0.5, LANDING, 16, [HIGH_SHELF.x0 + 2, 16]);
  check('the High Shelf cannot be climbed to from the ground: not from the Far Bank under it (seven up), nor from the Landing (nine and a half), by any jump, second jump or caught edge', fromBank < HIGH_SHELF.y - 0.5 && fromLanding < HIGH_SHELF.y - 0.5 && HIGH_SHELF.y - FAR_BANK >= 7, `gets to ${fromBank.toFixed(2)} from the bank (at ${FAR_BANK}) and ${fromLanding.toFixed(2)} from the Landing (at ${LANDING}); the Shelf is at ${HIGH_SHELF.y}`);
  // Nor from anything that stands on the Far Bank near it: every ledge and every mushroom he can stand on within ten
  // of the Shelf's edge, tried with the real controller at every timing of one jump and of two.
  const tops: Stop[] = def.solids.filter((b) => b.y1 > FAR_BANK + 0.5 && b.y1 < HIGH_SHELF.y - 0.5 && b.x1 > HIGH_SHELF.x0 - 10 && b.x1 <= HIGH_SHELF.x0 && b.z1 <= RIFT.z0).map((b) => ({ x: Math.min(b.x1 - 0.4, (b.x0 + b.x1) / 2 + 2), z: (b.z0 + b.z1) / 2, top: b.y1, r: 1 }));
  const sneaks = tops.filter((t) => {
    const edge: Stop = { x: HIGH_SHELF.x0 + 1.2, z: t.z, top: HIGH_SHELF.y, r: 2 };
    const w2 = ways(t, edge, 0.3);
    return w2.one + w2.two > 0 || reachUp(t.x, t.top, t.z, [HIGH_SHELF.x0 + 2, t.z]) > HIGH_SHELF.y - 0.5;
  });
  check('...nor from anything that stands on the Far Bank near it (its ledges, its mushrooms tall enough to stand on): tried from each with the real controller', tops.length >= 1 && sneaks.length === 0, `${tops.length} places tried${sneaks.length ? `; a way up from ${sneaks.map((t) => `${t.x.toFixed(1)},${t.z.toFixed(1)} (top ${t.top.toFixed(1)})`).join(' and ')}` : ''}`);
  const w = GLIMMER_WEDGES.find((x) => x.id === 'shelf')!;
  check('the first wedge, The High Shelf, stands on the Shelf, on floor, there from the start', w.appears === null && w.y === HIGH_SHELF.y && standsOn(cs, w.x, w.y, w.z, 0.4) && w.x > HIGH_SHELF.x0 + 2);
}

// ---------------------------------------------------------------- the Rift
{
  check('the Rift splits the cave from wall to wall: ten across, seven deep, and its floor is not below where the game sends a faller back from (six under zero: the first lay-out had it at seven under, and he could not stand on it); the Far Bank beyond it is a little higher than the Landing', RIFT.z1 - RIFT.z0 === 10 && LANDING - RIFT.floor === 7 && FAR_BANK - LANDING > 2 && FAR_BANK - LANDING < 3 && RIFT.floor >= 0 && standsOn(cs, 0, RIFT.floor, 7, 0.4) && standsOn(cs, 0, FAR_BANK, -6, 0.4) && !standsOn(cs, 0, LANDING, 7, 0.4));
  // Out of it: up the three steps and onto each bank, with the real controller.
  const steps: Stop[] = RIFT_STEPS.map(([z0, z1, top]) => ({ x: -GLIMMER.halfX + 2, z: (z0 + z1) / 2, top, r: 2.4 }));
  const floor: Stop = { x: -GLIMMER.halfX + 6.5, z: steps[0].z, top: RIFT.floor, r: 2 };
  const up = [floor, ...steps];
  const climbs = up.slice(0, -1).map((s, i) => ways(s, up[i + 1], 1.2));
  check('HE CAN GET OUT OF IT: three steps of rock at its west end, each two up, each a jump from the last', steps.length === 3 && steps.every((s, i) => s.top - (i ? steps[i - 1].top : RIFT.floor) === 2) && climbs.every((c) => c.one + c.two >= 3), climbs.map((c) => `${c.one}+${c.two}`).join('; '));
  const toLanding = reachUp(steps[0].x, steps[0].top, steps[0].z + 1, [steps[0].x, RIFT.z1 + 2]);
  const toBank = reachUp(steps[2].x, steps[2].top, steps[2].z - 0.8, [steps[2].x, RIFT.z0 - 2]);
  check('...and from the steps both banks are a climb he can make: the Landing from the first step (five up, by the second jump and a caught edge), the Far Bank from the last (three and a half)', toLanding > LANDING - 0.05 && toBank > FAR_BANK - 0.05, `to ${toLanding.toFixed(2)} and ${toBank.toFixed(2)}`);
  const straight = reachUp(0, RIFT.floor, RIFT.z1 - 0.6, [0, RIFT.z1 + 2]);
  check('...but not straight up its sides: seven is more than he can climb', straight < LANDING - 0.5, `gets to ${straight.toFixed(2)}`);
  const scorps = def.enemies.filter((e) => e.type === 'scorpion');
  const bugs = def.enemies.filter((e) => e.type === 'firefly');
  check('two Lamp Scorpions keep its floor (one its own blue-green, one amber): each made on that floor, kept to it and clear of the steps, the Caps\' stems not in its way at the start', scorps.length === 2 && scorps.every((s) => s.y === RIFT.floor && standsOn(cs, s.x, RIFT.floor, s.z, 0.6) && s.arena!.x0 > -GLIMMER.halfX + 4 && s.arena!.z0 > RIFT.z0 && s.arena!.z1 < RIFT.z1 && s.arena!.x1 < HIGH_SHELF.x0) && scorps[0].color === undefined && scorps[1].color !== undefined);
  const lamps = GLIMMER_WEDGES.find((x) => x.id === 'lamps')!;
  check('the second wedge, Lamps Out, asks for those two and no more: they are the only creatures that count, and they do not come back', lamps.appears?.type === 'defeat' && def.enemies.filter((e) => !e.uncounted).length === 2 && def.enemies.filter((e) => !e.uncounted).every((e) => e.type === 'scorpion' && e.respawn === false) && lamps.y === RIFT.floor && standsOn(cs, lamps.x, lamps.y, lamps.z, 0.4));
  check('three glow bugs fly over the Far Bank, each its own colour, there to be fought and counting toward nothing; their air is in from the walls, short of the Rift and of the Shelf', bugs.length === 3 && new Set(bugs.map((b) => b.color)).size === 3 && bugs.every((b) => b.uncounted && b.y === FAR_BANK && b.arena!.z1 < RIFT.z0 && b.arena!.x1 < HIGH_SHELF.x0 && b.arena!.x0 > -GLIMMER.halfX && b.arena!.z0 > -GLIMMER.halfZ));
  check('two wedges in all, each with a goal of its own', GLIMMER_WEDGES.length === 2 && def.wedges === GLIMMER_WEDGES && def.goals.length === 2 && def.goals[0].type === 'reach' && def.goals[1].type === 'defeat');
}

// ---------------------------------------------------------------- what is to be found
{
  const by = (id: string) => def.collectibles.find((c) => c.id === id)!;
  check('three things to find and no more: two bottle caps and a relic (fewer, each earned by moving)', def.collectibles.length === 3 && def.collectibles.filter((c) => c.kind === 'cap').length === 2 && def.collectibles.filter((c) => c.kind === 'relic').length === 1 && def.crateContents.length === 0);
  // The one in the air: taken on the hop from the third Cap to the fourth, and by no hop from the floor.
  const air = by(GLIMMER_PRIZES.air);
  let taken = 0;
  for (let d = 0; d <= 30; d++) {
    const from = caps[2];
    const to = caps[3];
    const far = Math.hypot(to.x - from.x, to.z - from.z);
    const p = new PlayerController(new THREE.Vector3(from.x - ((to.x - from.x) / far) * 0.6, from.top + 0.01, from.z - ((to.z - from.z) / far) * 0.6));
    for (let i = 0; i < 20; i++) p.update(DT, inp({}), cs);
    let got = false;
    for (let i = 0; i < 200 && !(i > d + 5 && p.grounded); i++) {
      const dx = to.x - p.position.x;
      const dz = to.z - p.position.z;
      const dist = Math.hypot(dx, dz) || 1;
      p.update(DT, inp({ move: new THREE.Vector3(dx / dist, 0, dz / dist), jumpPressed: i === d, jumpHeld: i >= d }), cs);
      if (Math.hypot(p.position.x - air.x, p.position.z - air.z) < 0.9 && Math.abs(p.position.y + 0.55 - air.y) < 1.0) got = true;
    }
    if (got) taken++;
  }
  check('the bottle cap in the air hangs on the line of the hop from the third Cap to the fourth, where that jump carries him: most timings that make the hop take it', taken >= 8 && air.y > caps[3].top + 1 && air.y - RIFT.floor > 14, `${taken} of 31 timings pass through it; it hangs at ${air.y.toFixed(2)}`);
  const deep = by(GLIMMER_PRIZES.deep);
  check('the second is at the bottom of the Rift, in the pocket behind the last Cap\'s foot, where the scorpions are: got by going down, and coming back up', deep.y < RIFT.floor + 1 && standsOn(cs, deep.x, RIFT.floor, deep.z, 0.3) && deep.x > caps[3].x + 2 && deep.x < HIGH_SHELF.x0);
  const relic = by(GLIMMER_PRIZES.spire);
  const spireTop = mushroomTop(SPIRE.x, FAR_BANK, SPIRE.z, SPIRE.tall, 1.3);
  const upSpire = reachUp(SPIRE.x, FAR_BANK, SPIRE.z + 2.2, [SPIRE.x, SPIRE.z]);
  const oneJump = ((): number => {
    const p = new PlayerController(new THREE.Vector3(SPIRE.x, FAR_BANK + 0.01, SPIRE.z + 2.2));
    for (let i = 0; i < 10; i++) p.update(DT, inp({}), cs);
    let top = FAR_BANK;
    for (let i = 0; i < 120; i++) {
      p.update(DT, inp({ jumpPressed: i === 0, jumpHeld: true }), cs);
      top = Math.max(top, p.position.y);
    }
    return top;
  })();
  check('the relic is on the Spire, the tall pink mushroom of the Far Bank: five and a half up, which the second jump and a caught edge reach and one jump does not come near', relic.kind === 'relic' && Math.abs(relic.y - spireTop - 0.8) < 1e-6 && spireTop - FAR_BANK > 5.2 && upSpire > spireTop - 0.05 && oneJump < spireTop - 2, `he gets to ${upSpire.toFixed(2)}; its top is ${spireTop.toFixed(2)}; one jump tops out at ${oneJump.toFixed(2)}`);
}

// ---------------------------------------------------------------- the scorpion's sticker
{
  const st = STICKERS.find((s) => s.id === 'foe:scorpion');
  check('the Lamp Scorpion has its sticker now that a real level has one (it was left out on purpose while it lived only in a try-out room)', !!st && st.group === 'Beasts' && st.name === 'Lamp Scorpion' && st.blurb.length > 40);
}

console.log(failures ? `\n${failures} FAILED` : '\nall passed');
if (failures) process.exit(1);
