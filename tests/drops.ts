// Crate drops and the item inventory.
import { CONSUMABLES, CRATE_DROPS, rollCrateDrop } from '../src/data/consumables';
import { Inventory, INVENTORY_KEY } from '../src/player/inventory';
import { DropField, nachoCanGeometry } from '../src/world/drops';

let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}
const store = { data: new Map<string, string>(), getItem(k: string) { return this.data.get(k) ?? null; }, setItem(k: string, v: string) { this.data.set(k, v); } };

check('a certain drop always drops', rollCrateDrop(() => 0.99) === (CRATE_DROPS[0].chance >= 1 ? 'nachoCheese' : null));
check('a drop that misses gives nothing', CRATE_DROPS.every((d) => d.chance > 0) && rollCrateDrop(() => 1) === null);

const inv = new Inventory(store);
check('starts empty', inv.list().length === 0);
check('adds and counts', inv.add('nachoCheese') && inv.add('nachoCheese') && inv.count('nachoCheese') === 2);
check('stack limit holds', !inv.add('nachoCheese', CONSUMABLES.nachoCheese.maxStack) && inv.count('nachoCheese') === 2);
check('unknown items are refused', !inv.add('mystery'));
check('is saved and restored', new Inventory(store).count('nachoCheese') === 2 && store.data.has(INVENTORY_KEY));
check('removing uses one', inv.remove('nachoCheese') && inv.count('nachoCheese') === 1 && inv.remove('nachoCheese') && !inv.remove('nachoCheese'));
inv.add('nachoCheese');
inv.reset();
check('reset empties it', inv.list().length === 0 && new Inventory(store).list().length === 0);
store.data.set(INVENTORY_KEY, '{oops');
check('a broken save is ignored', new Inventory(store).list().length === 0);

const geo = nachoCanGeometry();
geo.computeBoundingBox();
const h = geo.boundingBox!.max.y - geo.boundingBox!.min.y;
check('the can model is a sensible size', h > 0.3 && h < 0.7, `h=${h.toFixed(2)}`);

const field = new DropField();
field.spawn('nachoCheese', 2, 3, 0, 1);
check('a spawned drop is lying there', field.remaining === 1);
check('it cannot be taken the instant it pops out', field.collect(2, 0, 3, 0.9, 0.7).length === 0);
for (let i = 0; i < 90; i++) field.update(1 / 60, i / 60);
check('far away does not take it', field.collect(8, 0, 8, 0.9, 0.7).length === 0 && field.remaining === 1);
const got = field.collect(2.3, 0, 3, 0.9, 0.7);
check('walking into it takes it', got.join() === 'nachoCheese');
check('it cannot be taken twice', field.collect(2.3, 0, 3, 0.9, 0.7).length === 0);
for (let i = 0; i < 40; i++) field.update(1 / 60, 2 + i / 60);
check('the pop finishes and it is gone', field.group.children.length === 0);
field.spawn('nachoCheese', 0, 0, 0, 1);
field.clear();
check('clear removes everything', field.remaining === 0 && field.group.children.length === 0);

console.log(failures === 0 ? '\nDrop checks passed.' : `\n${failures} drop check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
