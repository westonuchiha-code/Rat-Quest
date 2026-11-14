// Gear: owning, wearing, saving, and picking the helmet up off the pillar.
import './../src/core/colorSetup';
import * as THREE from 'three';
import { Equipment, EQUIPMENT_KEY } from '../src/player/equipment';
import { ITEMS } from '../src/data/equipment';
import { chamberPickups } from '../src/world/equipmentLayout';
import { buildChamber } from '../src/world/chamber';
import { PlayerController, PlayerInput } from '../src/player/controller';
import { readSave, SAVE_KEY, writeSave } from '../src/core/save';
import type { StorageLike } from '../src/world/collectibles';

let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}
function memory(): StorageLike & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) };
}

const store = memory();
const eq = new Equipment(store);
check('starts with the tin helm on', eq.equipped('helmet') === 'tinHelm' && eq.equipped('sword') === 'ratSword' && eq.equipped('shield') === 'ratShield');
let calls = 0;
eq.onChange(() => calls++);
check('he starts with the red scarf, and other scarves are separate', eq.equipped('scarf') === 'redScarf' && !eq.owns('mossScarf'));
check('picking up the ember helm adds it but does not put it on', eq.give('emberHelm') && eq.equipped('helmet') === 'tinHelm' && eq.owns('emberHelm'));
check('he can list what he owns for a slot', eq.ownedIn('helmet').join() === 'tinHelm,emberHelm' && eq.ownedIn('sword').join() === 'ratSword');
check('the same item cannot be picked up twice', !eq.give('emberHelm') && calls === 1);
check('unknown items are refused', !eq.give('nope'));
check('he can put the new helm on from the menu', eq.equip('emberHelm') && eq.equipped('helmet') === 'emberHelm');
check('and the old one back', eq.equip('tinHelm') && eq.equipped('helmet') === 'tinHelm');
check('he cannot wear something he does not own', !new Equipment(memory()).equip('emberHelm'));
eq.equip('emberHelm');
const again = new Equipment(store);
check('gear is saved and restored', again.owns('emberHelm') && again.equipped('helmet') === 'emberHelm' && store.data.has(EQUIPMENT_KEY));
again.reset();
check('reset goes back to the starting gear', !again.owns('emberHelm') && again.equipped('helmet') === 'tinHelm');
const broken = memory();
broken.data.set(EQUIPMENT_KEY, '{not json');
check('a broken save is ignored', new Equipment(broken).equipped('helmet') === 'tinHelm');
check('the new helm has different colours', ITEMS.emberHelm.colors.dome !== ITEMS.tinHelm.colors.dome);

// The pickup floats over the top of the highest platform in the room.
const pickup = chamberPickups()[0];
const chamber = buildChamber();
const top = chamber.colliders.reduce((m, b) => (pickup.x >= b.min.x && pickup.x <= b.max.x && pickup.z >= b.min.z && pickup.z <= b.max.z ? Math.max(m, b.max.y) : m), -1);
const highest = chamber.colliders.filter((b) => b.max.y < 7.5 || true).reduce((m, b) => Math.max(m, b.max.y), 0);
check('the helmet floats just above its platform', pickup.y > top && pickup.y - top < 1.2, `top=${top} y=${pickup.y}`);
const highestPlatform = Math.max(...chamber.colliders.filter((b) => b.max.x - b.min.x < 3.1 && b.max.x - b.min.x > 2.9 && b.max.y < 7.5).map((b) => b.max.y));
check('it is on the highest ring platform', Math.abs(top - highestPlatform) < 1e-6, `top=${top} highestPlatform=${highestPlatform} room=${highest}`);

// Standing on that platform he is close enough to take it.
const p = new PlayerController(new THREE.Vector3(pickup.x, top, pickup.z));
const DT = 1 / 60;
for (let i = 0; i < 20; i++) p.update(DT, { move: new THREE.Vector3(), run: false, jumpPressed: false, jumpHeld: false, attackPressed: false, dodgePressed: false, guardHeld: false, stowPressed: false }, chamber.colliders);
const dy = pickup.y - (p.position.y + 1.1 / 2);
check('standing on it he can take the helm', p.grounded && Math.abs(dy) < 1.1, `dy=${dy.toFixed(2)}`);

// Saved games.
const saves = memory();
check('no save at first', readSave(saves) === null);
const data = { x: 1, y: 2, z: 3, facing: 0.5, cameraYaw: 1.5, hp: 4, savedAt: 1234 };
check('a save is written and read back', writeSave(saves, data) && JSON.stringify(readSave(saves)) === JSON.stringify(data));
saves.data.set(SAVE_KEY, '{"x":"no"}');
check('a damaged save is ignored', readSave(saves) === null);
check('no storage means no save, without crashing', !writeSave(null, data) && readSave(null) === null);

console.log(failures === 0 ? '\nEquipment checks passed.' : `\n${failures} equipment check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
