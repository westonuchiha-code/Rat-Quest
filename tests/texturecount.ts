// HOW MUCH OF EACH MODEL HAS A PICTURE ON IT (2026-11-18, the owner: "finding models that don't have textures").
// Not a test: a count. A part is TEXTURED if its material samples a real picture (not the 1x1 white every plain
// material samples). Shares are of the triangles drawn.
//   npx vite build --ssr tests/texturecount.ts --outDir .testdist --emptyOutDir && node .testdist/texturecount.js
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
import { RollerModel } from '../src/enemies/rollerModel';
import { BroodModel } from '../src/enemies/broodModel';
import { WyrmModel } from '../src/enemies/wyrmModel';
import { WidowModel } from '../src/enemies/widowModel';

function share(root: THREE.Object3D): { tris: number; textured: number; plain: Map<string, number> } {
  let tris = 0;
  let textured = 0;
  const plain = new Map<string, number>();
  root.updateMatrixWorld(true);
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || !m.geometry) return;
    for (let p: THREE.Object3D | null = o; p; p = p.parent) if (!p.visible) return;
    const g = m.geometry;
    const t = Math.floor((g.index ? g.index.count : g.attributes.position.count) / 3);
    tris += t;
    const mats = Array.isArray(m.material) ? m.material : [m.material];
    const has = mats.some((mt) => {
      const u = (mt as THREE.ShaderMaterial).uniforms;
      const tex = (u?.tex?.value ?? (mt as THREE.MeshBasicMaterial).map) as THREE.Texture | null;
      const img = tex?.image as { width?: number } | undefined;
      return !!img && (img.width ?? 0) > 1;
    });
    if (has) textured += t;
    else {
      // (Named by where it is and its colour: the plain parts' own names are mostly empty.)
      const col = g.attributes.color ? new THREE.Color(g.attributes.color.getX(0), g.attributes.color.getY(0), g.attributes.color.getZ(0)).getHexString() : 'none';
      const box = new THREE.Box3().setFromObject(o);
      const k = `${o.name || 'part'}#${col}@y${box.getCenter(new THREE.Vector3()).y.toFixed(2)}`;
      plain.set(k, (plain.get(k) ?? 0) + t);
    }
  });
  return { tris, textured, plain };
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
add('Enemies', 'Frost Roller', 'pill bug', () => new RollerModel().root);
add('Bosses', 'The Broodmother', 'spider', () => new BroodModel().root);
add('Bosses', 'The Sump Wyrm', 'wyrm', () => new WyrmModel().root);
add('Bosses', 'Lord Grimsqueak', 'rat king', () => npc('Lord Grimsqueak', 'villain'));


add('Characters', 'Jinx', 'rat', () => npc('Jinx', 'rat'));
add('Characters', 'Sir Hobnail', 'stag', () => npc('Sir Hobnail', 'stag'));
add('Bosses', 'The Widow', 'spider', () => new WidowModel().root);

let group = '';
for (const [g, name, what, make] of rows) {
  if (g !== group) { console.log(`\n${g}`); group = g; }
  try {
    const c = share(make());
    const pct = c.tris ? Math.round((100 * c.textured) / c.tris) : 0;
    const worst = [...c.plain.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, n]) => `${k} ${n}`).join(', ');
    console.log(`  ${name.padEnd(18)} ${what.padEnd(14)} ${String(pct).padStart(3)}% textured of ${String(c.tris).padStart(5)}${pct < 80 ? `   plain: ${worst}` : ''}`);
  } catch (e) {
    console.log(`  ${name.padEnd(18)} could not be built here: ${String(e).slice(0, 90)}`);
  }
}
