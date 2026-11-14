// Where the new beasts live: an ironback always has a wall in reach to ram (so it can be flipped that way), and a bat's
// roost is clear air from the floor up (nothing in the way of its drop). And they are where the plan put them.
import { LEVELS } from '../src/levels/levels';
import { IRONBACK } from '../src/enemies/ironback';
import { BAT } from '../src/enemies/bat';
import type { LevelDef } from '../src/levels/types';

let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}

const solidAt = (def: LevelDef, x: number, y0: number, y1: number, z: number, r: number): boolean =>
  def.solids.some((b) => x + r > b.x0 && x - r < b.x1 && z + r > b.z0 && z - r < b.z1 && b.y1 > y0 && b.y0 < y1);
const floorAt = (def: LevelDef, x: number, y: number, z: number): boolean =>
  def.solids.some((b) => x > b.x0 && x < b.x1 && z > b.z0 && z < b.z1 && Math.abs(b.y1 - y) < 0.3);
const lava = (def: LevelDef, x: number, z: number): boolean => (def.lava ?? []).some((l) => x > l.x0 && x < l.x1 && z > l.z0 && z < l.z1);

const count: Record<string, { ironback: number; bat: number; chains: number }> = {};
for (const def of LEVELS) {
  for (const e of def.enemies) {
    if (e.type !== 'ironback' && e.type !== 'bat') continue;
    const c = (count[def.id] ??= { ironback: 0, bat: 0, chains: 0 });
    const y = e.y ?? 0;
    if (e.type === 'ironback') {
      c.ironback++;
      // Walk out in eight directions over its own floor: is there a wall before the floor ends (or lava)?
      let wall = false;
      for (let k = 0; k < 8 && !wall; k++) {
        const a = (k / 8) * Math.PI * 2;
        for (let d = 0.5; d <= IRONBACK.ramRange[1] + 2; d += 0.25) {
          const x = e.x + Math.sin(a) * d;
          const z = e.z + Math.cos(a) * d;
          if (solidAt(def, x, y + 0.25, y + 0.7, z, 0.2)) {
            wall = d >= IRONBACK.ramRange[0] - 1;
            break;
          }
          if (!floorAt(def, x, y, z) || lava(def, x, z)) break;
        }
      }
      check(`${def.id}: the ironback at ${e.x},${e.z} has a wall it can be made to ram`, wall);
    } else {
      c.bat++;
      if (e.perch === 'chain') c.chains++;
      const clear = !solidAt(def, e.x, y + 0.3, y + BAT.roostHeight + 0.5, e.z, BAT.radius);
      check(`${def.id}: the bat at ${e.x},${e.z} roosts in clear air over its floor`, clear && floorAt(def, e.x, y, e.z));
    }
  }
}
const want: Record<string, { ironback: number; bat: number; chains: number }> = {
  foundry: { ironback: 1, bat: 0, chains: 0 },
  coalcellars: { ironback: 1, bat: 0, chains: 0 },
  hollows: { ironback: 0, bat: 2, chains: 0 },
  webs: { ironback: 0, bat: 1, chains: 0 },
  keep: { ironback: 1, bat: 2, chains: 2 },
};
check('ironbacks in the Foundry, the Coal Cellars and the Keep; bats in the Hollows, the Web Hollow and the Keep (on chains)', JSON.stringify(count, Object.keys(want)) === JSON.stringify(want, Object.keys(want)) && Object.keys(count).every((k) => k in want), JSON.stringify(count));
const hollows = LEVELS.find((l) => l.id === 'hollows')!;
check('the gallery bats keep to their ledge (it is a long way down)', hollows.enemies.filter((e) => e.type === 'bat').every((e) => e.arena && e.arena.x0 >= -48 && e.arena.x1 <= -34));
const foundry = LEVELS.find((l) => l.id === 'foundry')!;
check('the Slag Crew is still six beasts', foundry.enemies.length === 6);

console.log(failures ? `\n${failures} FAILED` : '\nall passed');
process.exit(failures ? 1 : 0);
