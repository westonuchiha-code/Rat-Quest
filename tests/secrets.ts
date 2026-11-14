// Gear secrets: three wedges that only the right gear reaches (or, in the dark, makes fair), checked with the real
// controller in the real levels.
import * as THREE from 'three';
import { PlayerController, PlayerInput } from '../src/player/controller';
import { makeAabb } from '../src/world/collision';
import { computeReach } from '../src/levels/reach';
import { ITEMS, NO_GEAR, STARTING_GEAR, gearMods, type GearMods } from '../src/data/equipment';
import { cistern, DRAIN_ROOM_Z1, DRAIN_LID_Z1 } from '../src/levels/cistern';
import { foundry, MOUTH, CRUCIBLE } from '../src/levels/foundry';
import { hollowsDark, DARK_FOG, DARK_STONES, DARK_START, DARK_END } from '../src/levels/hollows';
import type { LevelDef } from '../src/levels/types';

const DT = 1 / 60;
let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}
const inp = (o: Partial<PlayerInput>): PlayerInput => ({ move: new THREE.Vector3(), run: true, jumpPressed: false, jumpHeld: false, attackPressed: false, dodgeHeld: false, dodgePressed: false, guardHeld: false, stowPressed: false, ...o } as PlayerInput);
const wear = (id: string): GearMods => gearMods([...Object.values(STARTING_GEAR).filter((s) => ITEMS[s].slot !== ITEMS[id].slot), id]);
const boxes = (d: LevelDef) => d.solids.map((b) => makeAabb((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, (b.z0 + b.z1) / 2, b.x1 - b.x0, b.y1 - b.y0, b.z1 - b.z0));

// ---- The Cistern's old drain: only a swimmer faster than the current gets up it ----
{
  const def = cistern();
  const cs = boxes(def);
  const north = new THREE.Vector3(0, 0, -1);
  /** Drops into the open end and swims (and jumps, and rolls) north for 40 seconds. Returns how far north he got and if he stood in the room. */
  const tryDrain = (g: GearMods, spam: boolean): { z: number; swimZ: number; inRoom: boolean } => {
    const p = new PlayerController(new THREE.Vector3(-45.5, 0.5, 42));
    p.gear = g;
    p.water = def.water;
    let z = 99;
    let swimZ = 99;
    let inRoom = false;
    for (let t = 0; t < 2400; t++) {
      const press = spam ? t % 7 === 0 : p.position.z < DRAIN_ROOM_Z1 && t % 20 === 0;
      p.update(DT, inp({ move: north, jumpPressed: press, jumpHeld: press, dodgePressed: spam && t % 11 === 5 }), cs);
      z = Math.min(z, p.position.z);
      if (p.swimming) swimZ = Math.min(swimZ, p.position.z);
      if (p.grounded && p.position.z < DRAIN_ROOM_Z1 - 5 && p.position.y > -0.1) inRoom = true;
    }
    return { z, swimZ, inRoom };
  };
  const plain = tryDrain(NO_GEAR, false);
  const mash = tryDrain(NO_GEAR, true);
  const slick = tryDrain(wear('sludgeScarf'), false);
  check('the drain is covered for a long way (a low lid, no room to jump)', DRAIN_LID_Z1 - DRAIN_ROOM_Z1 >= 12);
  check('a plain swimmer never gets up the drain (the current wins)', !plain.inRoom && plain.swimZ > DRAIN_LID_Z1 - 2, `swam to z ${plain.swimZ.toFixed(1)}`);
  check('...not even jumping and rolling all the way (and walking on the lid only leads to a wall)', !mash.inRoom, `swam to z ${mash.swimZ.toFixed(1)}`);
  check('with the Sludge Scarf he swims up it and climbs out into the room', slick.inRoom, `swam to z ${slick.swimZ.toFixed(1)}`);
  const ember = tryDrain(wear('emberHelm'), false);
  check('(the Ember Helm, slow in water, is swept straight back out)', !ember.inRoom && ember.swimZ > DRAIN_LID_Z1 - 2);
}

// ---- The Foundry's Furnace Mouth: only a long jump with the Royal Scarf, off the top of the Crucible ----
{
  const def = foundry();
  const cs = boxes(def);
  const east = new THREE.Vector3(1, 0, 0);
  const z = (MOUTH.z0 + MOUTH.z1) / 2;
  /** Runs east along the top of the Crucible and jumps `edge` short of its east face. */
  const leap = (g: GearMods, long: boolean, edge: number, second = -1): boolean => {
    const p = new PlayerController(new THREE.Vector3(-4.2, CRUCIBLE, z));
    p.gear = g;
    for (let t = 0; t < 5; t++) p.update(DT, inp({}), cs);
    let t = 0;
    while (p.position.x < 5 - edge && t++ < 400) p.update(DT, inp({ move: east }), cs);
    if (long) for (let k = 0; k < 3; k++) p.update(DT, inp({ move: east, run: false }), cs);
    p.update(DT, inp({ move: east, run: !long, jumpPressed: true, jumpHeld: true }), cs);
    for (let k = 0; k < 600; k++) {
      p.update(DT, inp({ move: east, run: !long, jumpPressed: k === second, jumpHeld: true }), cs);
      if (p.grounded && k > 5) return Math.abs(p.position.y - MOUTH.top) < 0.05 && p.position.x > MOUTH.x0;
      if (p.position.y < 0) return false;
    }
    return false;
  };
  const takeoffs = [0.3, 0.6, 0.9, 1.2];
  const royal = takeoffs.filter((e) => leap(wear('royalScarf'), true, e)).length;
  let plainLong = false;
  for (const e of [0.05, 0.1, 0.2, 0.3, 0.6]) if (leap(NO_GEAR, true, e)) plainLong = true;
  let doubleJ = false;
  for (let k = 4; k < 70 && !doubleJ; k += 2) for (const e of [0.05, 0.2]) if (leap(NO_GEAR, false, e, k)) doubleJ = true;
  check('a plain long jump off the Crucible falls short of the Furnace Mouth', !plainLong);
  check('...and so does any double jump', !doubleJ);
  check('a long jump in the Royal Scarf lands on it (from most take-off points)', royal >= 3, `${royal} of ${takeoffs.length}`);
  check('nothing else reaches it (it stands too tall to climb from the bank)', !computeReach(def).near((MOUTH.x0 + MOUTH.x1) / 2, MOUTH.top + 0.5, z, 1, 1, 1));
  check('the wedge says it needs the Royal Scarf (the jump checker leaves it to this test)', def.wedges?.find((w) => w.id === 'mouth')?.gear === 'royalScarf');
}

// ---- The Lightless Way: from the edge of each stone, the next is just past what he can see, and within the lamp's reach ----
{
  const def = hollowsDark();
  const far = DARK_FOG[1];
  const lamp = far * wear('minerHelm').sight;
  const steps: Array<{ x0: number; x1: number; z0: number; z1: number; cx: number; cz: number }> = [
    { ...DARK_START, cx: (DARK_START.x0 + DARK_START.x1) / 2, cz: (DARK_START.z0 + DARK_START.z1) / 2 },
    ...DARK_STONES.map(([x, , zz]) => ({ x0: x - 1.1, x1: x + 1.1, z0: zz - 1.1, z1: zz + 1.1, cx: x, cz: zz })),
    { ...DARK_END, cx: (DARK_END.x0 + DARK_END.x1) / 2, cz: (DARK_END.z0 + DARK_END.z1) / 2 },
  ];
  const seen: string[] = [];
  for (let i = 0; i + 1 < steps.length; i++) {
    const a = steps[i];
    const b = steps[i + 1];
    // From the nearest point of this stone to the middle of the next.
    const nx = Math.max(a.x0, Math.min(a.x1, b.cx));
    const nz = Math.max(a.z0, Math.min(a.z1, b.cz));
    const d = Math.hypot(b.cx - nx, b.cz - nz);
    if (!(d > far && d < lamp)) seen.push(`${i}->${i + 1}: ${d.toFixed(1)}`);
  }
  check('in the dark, each next stone is just past sight, and the lamp shows it', seen.length === 0, seen.join('; ') || `sight ${far}, with the lamp ${lamp.toFixed(1)}`);
  check('it is a side area of the Hollows, and a fall puts him back on the last stone', def.returnTo === 'hollows' && def.fallBack === true);
}

console.log(failures === 0 ? 'secrets: all pass' : `secrets: ${failures} FAIL`);
process.exit(failures ? 1 : 0);
