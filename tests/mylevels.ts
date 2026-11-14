// The player's own levels: kept in a library, wedges compile into an open course, hub doors can be claimed.
import { MyLevels } from '../src/levels/library';
import { compileCustom, emptyCustom, parseCustom, CustomLevel } from '../src/levels/custom';
import { GoalTracker } from '../src/levels/goals';

let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}
const mem = () => {
  const d: Record<string, string> = {};
  return { getItem: (k: string) => d[k] ?? null, setItem: (k: string, v: string) => void (d[k] = v), d };
};

const st = mem();
const lib = new MyLevels(st);
const a = emptyCustom();
a.name = 'First';
const idA = lib.put(null, a);
const idB = lib.put(null, { ...emptyCustom(), name: 'Second' });
check('new levels get their own ids', idA === 'my-1' && idB === 'my-2');
a.name = 'First, changed';
lib.put(idA, a);
check('saving again keeps the same slot', lib.list().length === 2 && lib.get('my-1')?.level.name === 'First, changed');
check('the library is saved and comes back', new MyLevels(st).list().map((m) => m.level.name).join() === 'First, changed,Second');
lib.remove(idB);
check('a level can be deleted', new MyLevels(st).list().length === 1);
check('a new id never reuses a taken number', lib.put(null, emptyCustom()) === 'my-2');
st.d['ratquest.mylevels.v1'] = 'nope';
check('a broken library is ignored', new MyLevels(st).list().length === 0);

// Hub doors: one level per door.
const lib2 = new MyLevels(mem());
const x = lib2.put(null, { ...emptyCustom(), hubDoor: 'west', hubNeed: 2 });
lib2.put(null, { ...emptyCustom(), hubDoor: 'west' });
check('only the newest level keeps a hub door', !lib2.get(x)?.level.hubDoor);
check('hub door settings survive text', parseCustom(JSON.stringify({ ...emptyCustom(), hubDoor: 'east', hubNeed: 3 }))?.hubNeed === 3);

// Wedges in a built level.
const c: CustomLevel = emptyCustom();
c.pieces.push(
  { t: 'wedge', x0: 5, z0: 5, x1: 5, z1: 5, top: 0, props: { name: 'Easy one' } },
  { t: 'wedge', x0: -5, z0: 5, x1: -5, z1: 5, top: 0, props: { appears: 'defeat' } },
  { t: 'wedge', x0: -5, z0: -5, x1: -5, z1: -5, top: 0, props: { appears: 'cap', hint: 'Caps!' } },
  { t: 'roach', x0: 8, z0: 0, x1: 8, z1: 0, top: 0 },
  { t: 'cap', x0: 3, z0: 3, x1: 3, z1: 3, top: 0 },
);
const def = compileCustom(c, 'my-9');
check('wedge pieces make an open course', def.wedges?.length === 3);
check('names, clues and defaults', def.wedges![0].name === 'Easy one' && def.wedges![1].name === 'Golden Wedge 2' && def.wedges![2].hint === 'Caps!');
check('the goals are what the wedges ask', def.goals.length === 3 && def.goals[1].type === 'defeat' && def.goals[2].type === 'collect');
const counts = { crumb: { have: 0, total: 0 }, cap: { have: 0, total: 1 }, relic: { have: 0, total: 0 } };
const g = new GoalTracker(def, (k) => counts[k]);
check('the first wedge is out, the others wait', g.wedgeOut(0) && !g.wedgeOut(1, 1) && !g.wedgeOut(2));
counts.cap.have = 1;
check('the cap wedge appears with the cap', g.wedgeOut(2));
check('a level without wedges is not an open course', !compileCustom(emptyCustom()).wedges);

console.log(failures === 0 ? 'mylevels: all pass' : `mylevels: ${failures} FAIL`);
process.exit(failures ? 1 : 0);
