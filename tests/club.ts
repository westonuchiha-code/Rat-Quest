// The Club's tables and regulars (src/levels/junction.ts, src/npc/patrons.ts, src/world/tavernModels.ts).
//
// The owner, 2026-11-15: more props, characters who are DOING something, new animals, former enemies as regulars, a
// room that gains people as the world is cleared but is "a full world that gains extras over time".
import './../src/core/colorSetup';
import * as THREE from 'three';
import { clubTables, junction } from '../src/levels/junction';
import { STOOL, TABLE } from '../src/world/layout';
import { makePatron, patronLook, SEAT, type Doing, type PatronKind } from '../src/npc/patrons';
import { Npc } from '../src/npc/npc';
import { VOICES } from '../src/audio/speech';
import { buildStool, buildTable } from '../src/world/tavernModels';

let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}

const def = junction();
const t = clubTables();
const tables = t.decor.filter((d) => d.kind === 'table');
const stools = t.decor.filter((d) => d.kind === 'stool');

// ---- Furniture: what is drawn is what is solid ----
{
  check('the Club has three tables, with stools round them', tables.length === 3 && stools.length >= 7, `${tables.length} tables, ${stools.length} stools`);
  check('every table and every stool is in the room\'s own lists: drawn, and solid', [...tables, ...stools].every((d) => def.decor.includes(d) || def.decor.some((e) => e.kind === d.kind && e.x === d.x && e.z === d.z)) && t.solids.every((s) => def.solids.some((b) => b.x0 === s.x0 && b.z0 === s.z0 && b.y1 === s.y1)));
  const mats = { wood: new THREE.MeshBasicMaterial(), plain: new THREE.MeshBasicMaterial(), glow: new THREE.MeshBasicMaterial() };
  const table = new THREE.Box3().setFromObject(buildTable(mats, {}));
  const stool = new THREE.Box3().setFromObject(buildStool(mats));
  check('a table is drawn as tall and as wide as the numbers its solid is made from', Math.abs(table.max.y - TABLE.h) < 0.03 && Math.abs(table.max.x - TABLE.r) < 0.03 && Math.abs(table.min.y) < 1e-6, `${table.max.y.toFixed(2)} high, ${table.max.x.toFixed(2)} out`);
  check('...and so is a stool', Math.abs(stool.max.y - STOOL.h) < 0.03 && stool.max.x <= STOOL.r * 1.1 && Math.abs(stool.min.y) < 1e-6, `${stool.max.y.toFixed(2)} high`);
  check('the solid of each is inside what is drawn (no corner to catch on that is not there)', TABLE.solid < TABLE.r && TABLE.solid > TABLE.r * 0.65 && STOOL.solid <= STOOL.r);
  check('a seat is as high as a stool', SEAT === STOOL.h);
  // Nothing the room already had is under a table or a stool, and the fire, the doors and the way in are clear.
  const before = def.solids.filter((b) => !t.solids.some((s) => s.x0 === b.x0 && s.z0 === b.z0 && s.y1 === b.y1) && b.y1 > 0.05 && b.y0 < 0.9);
  const hits = t.solids.filter((s) => before.some((b) => s.x0 < b.x1 && s.x1 > b.x0 && s.z0 < b.z1 && s.z1 > b.z0));
  check('no table or stool stands in anything that was there already', hits.length === 0, `${hits.length} in the way`);
  check('none is in the way in from the south door, or within three of the fire', t.solids.every((s) => !(Math.abs((s.x0 + s.x1) / 2) < 3 && s.z1 > 12) && Math.hypot((s.x0 + s.x1) / 2, (s.z0 + s.z1) / 2) > 3));
}

// ---- The regulars ----
{
  const here = t.npcs.filter((n) => !n.when);
  const later = t.npcs.filter((n) => n.when);
  check('the room is full from the first minute: four regulars at two tables, whatever has or has not been done', here.length === 4 && here.filter((n) => n.kind === 'turtle').length === 2 && here.filter((n) => n.kind === 'fox').length === 2);
  check('...and it gains an extra: an ant off duty, once the Hollows are cleared', later.length === 1 && later[0].kind === 'ant' && later[0].when?.cleared === 'hollows');
  check('everyone at a table is doing something, and has something to say', t.npcs.every((n) => !!n.doing && n.doing !== 'stand' && n.lines.length >= 2));
  check('two of one kind are two different people', patronLook('turtle', 'Mossback Mo') !== patronLook('turtle', 'Pebble') && patronLook('fox', 'Vix') !== patronLook('fox', 'Ash'));
  check('each sits on a stool that is there, facing the table, and the one he talks to is across it', here.every((n) => {
    const stool = stools.find((s) => Math.abs(s.x - n.x) < 1e-6 && Math.abs(s.z - n.z) < 1e-6);
    const table = tables.find((d) => Math.hypot(d.x - n.x, d.z - n.z) < 1.4);
    if (!stool || !table || !n.seated || !n.partner) return false;
    const toTable = Math.atan2(table.x - n.x, table.z - n.z);
    const off = Math.atan2(Math.sin(toTable - n.facing), Math.cos(toTable - n.facing));
    const other = here.find((o) => o !== n && Math.hypot(o.x - n.partner![0], o.z - n.partner![1]) < 1e-6);
    return Math.abs(off) < 1e-6 && !!other;
  }));
  check('the pair at a table take turns: one is 0 and the other 1', tables.every((d) => {
    const at = here.filter((n) => Math.hypot(d.x - n.x, d.z - n.z) < 1.4);
    return at.length === 0 || (at.length === 2 && at[0].turn !== at[1].turn);
  }));
  check('all of them are in the room\'s own list of characters, with the six who were there before', t.npcs.every((n) => (def.npcs ?? []).some((m) => m.name === n.name)) && ['Dizzy Dave', 'Pip', 'Mellow Mort', 'Wren', 'Finch', 'Lord Grimsqueak'].every((name) => (def.npcs ?? []).some((m) => m.name.toUpperCase() === name.toUpperCase())), `${(def.npcs ?? []).length} in all`);
  check('every kind of character has a voice', (def.npcs ?? []).every((n) => !!VOICES[n.kind ?? 'mouse']));
}

// ---- Their bodies ----
{
  const kinds: PatronKind[] = ['turtle', 'fox'];
  const doings: Doing[] = ['stand', 'drink', 'chat', 'lean', 'cards'];
  let built = 0;
  let bad = '';
  for (const kind of kinds) {
    for (const name of kind === 'turtle' ? ['Mossback Mo', 'Pebble'] : ['Vix', 'Ash']) {
      for (const doing of doings) {
        for (const seated of [false, true]) {
          const body = makePatron(kind, patronLook(kind, name));
          for (let i = 0; i < 240; i++) body.update(1 / 60, { time: i / 60, talking: i > 200, mouth: i > 200 ? 0.8 : 0, headYaw: 0.5, doing, seated, turn: 1 });
          body.root.updateMatrixWorld(true);
          const box = new THREE.Box3().setFromObject(body.root);
          // (His feet are on the floor, or he is on his stool; nothing of him is under the floor; he is a sensible size.)
          const ok = Number.isFinite(box.max.y) && box.min.y > -0.02 && box.max.y > 0.8 && box.max.y < 2.1 && box.max.x - box.min.x < 1.8;
          if (!ok) bad += `${name} ${doing}${seated ? ' seated' : ''}: ${box.min.y.toFixed(2)}..${box.max.y.toFixed(2)}; `;
          built++;
        }
      }
    }
  }
  check('both builds, both looks, at every thing they do, standing and seated: feet on the floor, nothing under it, a sensible size', bad === '', bad || `${built} looked at`);
  // A turtle's neck comes out when he talks; a fox's ears and tail move.
  const mo = makePatron('turtle', 'mo');
  const headY = (talking: boolean): number => {
    for (let i = 0; i < 180; i++) mo.update(1 / 60, { time: i / 60, talking, mouth: talking ? 0.7 : 0, headYaw: 0, doing: 'stand', seated: false, turn: 0 });
    mo.root.updateMatrixWorld(true);
    return new THREE.Box3().setFromObject(mo.root).max.y;
  };
  const quiet = headY(false);
  const speaking = headY(true);
  check('a turtle pushes his neck out when he has something to say', speaking > quiet + 0.03, `${quiet.toFixed(2)} quiet, ${speaking.toFixed(2)} talking`);
  // Through the game's own character class: they build, they update, and one who is busy does not swing round.
  for (const spec of t.npcs) {
    const n = new Npc({ ...spec });
    for (let i = 0; i < 120; i++) n.update(1 / 60, spec.x + 2, 0, spec.z + 2, i > 60);
    check(`${spec.name} (${spec.kind}) is built by the game's own character class, stays facing his table when spoken to, and has a marker over his head`, Math.abs(Math.atan2(Math.sin(n.root.rotation.y - spec.facing), Math.cos(n.root.rotation.y - spec.facing))) < 1e-6 && n.inRange(spec.x + 1, 0, spec.z + 1));
  }
}

console.log(failures === 0 ? 'club: all passed' : `club: ${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
