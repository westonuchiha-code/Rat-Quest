// How many triangles each character is made of. Not a test: a count, asked for by the owner (2026-11-16).
//   npx vite build --ssr tests/polycount.ts --outDir .testdist --emptyOutDir && node .testdist/polycount.js
// "Drawn" is what shows when the character is first built (a model also carries parts that are hidden until wanted:
// the knight's shield under his feet, his weapons on his back, a regular's mug or cards). "All" counts every part.
import './../src/core/colorSetup';
import * as THREE from 'three';
import { RatModel } from '../src/player/ratModel';
import { Npc } from '../src/npc/npc';
import { ScuttlerModel } from '../src/enemies/scuttlerModel';
import { ToadModel } from '../src/enemies/toadModel';
import { IronbackModel } from '../src/enemies/ironbackModel';
import { BatModel } from '../src/enemies/batModel';
import { GuardModel } from '../src/enemies/guardModel';
import { MantisModel } from '../src/enemies/mantisModel';
import { StagModel } from '../src/enemies/stagModel';
import { HornetModel } from '../src/enemies/hornetModel';
import { AntModel } from '../src/enemies/antModel';
import { FireflyModel } from '../src/enemies/fireflyModel';
import { ScorpionModel } from '../src/enemies/scorpionModel';
import { BroodModel } from '../src/enemies/broodModel';
import { WyrmModel } from '../src/enemies/wyrmModel';

function count(root: THREE.Object3D): { drawn: number; all: number; parts: number } {
  let drawn = 0;
  let all = 0;
  let parts = 0;
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || !m.geometry) return;
    const g = m.geometry;
    const tris = Math.floor((g.index ? g.index.count : g.attributes.position.count) / 3);
    all += tris;
    parts++;
    let shown = true;
    for (let p: THREE.Object3D | null = o; p; p = p.parent) if (!p.visible) shown = false;
    if (shown) drawn += tris;
  });
  return { drawn, all, parts };
}

const rows: Array<[string, string, string, () => THREE.Object3D]> = [];
const add = (group: string, name: string, what: string, make: () => THREE.Object3D): void => void rows.push([group, name, what, make]);
const npc = (name: string, kind: string, extra: object = {}): THREE.Object3D => new Npc({ name, kind, x: 0, z: 0, facing: 0, lines: ['.'], ...extra } as never).root;

add('The hero', 'The knight', 'rat', () => new RatModel().root);
add('Friends', 'Dizzy Dave', 'pigeon', () => npc('Dizzy Dave', 'pigeon'));
add('Friends', 'Pip', 'mouse', () => npc('Pip', 'mouse'));
add('Friends', 'Mellow Mort', 'mouse', () => npc('Mellow Mort', 'mouse'));
add('Friends', 'Finch', 'bird', () => npc('Finch', 'bird'));
add('Friends', 'Wren', 'bird', () => npc('Wren', 'bird'));
add('Club regulars', 'Mossback Mo', 'turtle', () => npc('Mossback Mo', 'turtle'));
add('Club regulars', 'Pebble', 'turtle', () => npc('Pebble', 'turtle'));
add('Club regulars', 'Vix', 'fox', () => npc('Vix', 'fox'));
add('Club regulars', 'Ash', 'fox', () => npc('Ash', 'fox'));
add('Club regulars', 'Slink', 'ferret', () => npc('Slink', 'ferret'));
add('Club regulars', 'Biscuit', 'ferret', () => npc('Biscuit', 'ferret'));
add('Club regulars', 'Madam Tawny', 'owl', () => npc('Madam Tawny', 'owl'));
add('Club regulars', 'Professor Snow', 'owl', () => npc('Professor Snow', 'owl'));
add('Club regulars', 'Corporal Nib', 'ant, off duty', () => npc('Corporal Nib', 'ant'));
add('Enemies', 'Roach', 'scuttler', () => new ScuttlerModel().root);
add('Enemies', 'Toad', 'toad', () => new ToadModel().root);
add('Enemies', 'Ironback', 'beetle', () => new IronbackModel().root);
add('Enemies', 'Flitter', 'bat (with the rock it roosts on)', () => new BatModel({ x: 0, y: 3.4, z: 0 }, 'rock').root);
add('Enemies', 'Keep Guard', 'rat', () => new GuardModel().root);
add('Enemies', 'Orchid Mantis', 'mantis', () => new MantisModel().root);
add('Enemies', 'Stag Knight', 'stag beetle', () => new StagModel().root);
add('Enemies', 'Hornet Lancer', 'hornet', () => new HornetModel().root);
add('Enemies', 'Ant Pikeman', 'ant', () => new AntModel().root);
add('Enemies', 'Firefly Bomber', 'firefly', () => new FireflyModel().root);
add('Enemies', 'Lamp Scorpion', 'scorpion', () => new ScorpionModel().root);
add('Bosses', 'The Broodmother', 'spider', () => new BroodModel().root);
add('Bosses', 'The Sump Wyrm', 'wyrm', () => new WyrmModel().root);
add('Bosses', 'Lord Grimsqueak', 'rat king', () => npc('Lord Grimsqueak', 'villain'));

let group = '';
let total = 0;
for (const [g, name, what, make] of rows) {
  if (g !== group) {
    console.log(`\n${g}`);
    group = g;
  }
  try {
    const c = count(make());
    total += c.drawn;
    console.log(`  ${name.padEnd(18)} ${what.padEnd(14)} drawn ${String(c.drawn).padStart(5)}   all ${String(c.all).padStart(5)}   in ${c.parts} parts`);
  } catch (e) {
    console.log(`  ${name.padEnd(18)} could not be built here: ${String(e).slice(0, 90)}`);
  }
}
console.log(`\n${rows.length} characters; ${total} triangles if every one of them stood in one room.`);
