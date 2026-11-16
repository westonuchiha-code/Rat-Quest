// Jinx: the girl rat at the Club (npc/patrons.ts `class Jinx`; levels/junction.ts). The owner, 2026-11-16: "a girl rat
// ... a notch cut out of one of her ears ... emo hair ... her tail is longer and usually up or curling around and she
// wears a skirt. She also just hangs out in Dave's area for now."
import './../src/core/colorSetup';
import * as THREE from 'three';
import { LEVELS } from '../src/levels/levels';
import { makePatron, patronLook, ratEar, PATRON_KINDS, type PatronCtx } from '../src/npc/patrons';
import { VOICES } from '../src/audio/speech';
import { PUPPET_NPCS } from '../src/cutscene/stage';
import { RatModel } from '../src/player/ratModel';

let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}
const hub = LEVELS.find((l) => l.hub)!;
const her = (hub.npcs ?? []).find((n) => n.kind === 'rat');
const dave = (hub.npcs ?? []).find((n) => n.kind === 'pigeon')!;
check('she is at the Club from the start, up on Dave\'s stage with him and a few steps off, with something to say', !!her && her.name.toUpperCase() === 'JINX' && !her.hidden && her.y === dave.y && Math.hypot(her.x - dave.x, her.z - dave.z) > 3 && Math.hypot(her.x - dave.x, her.z - dave.z) < 8 && her.lines.length >= 3, her ? `${Math.hypot(her.x - dave.x, her.z - dave.z).toFixed(1)} from Dave` : 'not there');
check('she is a kind of her own, with a voice, and a scene can cast her', (PATRON_KINDS as readonly string[]).includes('rat') && patronLook('rat', 'Jinx') === 'jinx' && !!VOICES.rat && (PUPPET_NPCS as readonly string[]).includes('rat'));

const body = makePatron('rat', 'jinx');
const ctx = (time: number, o: Partial<PatronCtx> = {}): PatronCtx => ({ time, talking: false, mouth: 0, headYaw: 0, doing: 'stand', seated: false, turn: 0, ...o });
const meshes: THREE.Mesh[] = [];
body.root.traverse((o) => {
  if ((o as THREE.Mesh).isMesh) meshes.push(o as THREE.Mesh);
});
const pictured = meshes.filter((m) => !!(m.material as THREE.ShaderMaterial).uniforms?.tex?.value?.image && ((m.material as THREE.ShaderMaterial).uniforms.tex.value.image as { width: number }).width > 1);
const tris = meshes.reduce((n, m) => n + (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3, 0);
const names = new Set(pictured.map((m) => (m.material as THREE.ShaderMaterial).uniforms.tex.value.uuid as string));
check('she is TEXTURED: her fur, her hair, her top, her skirt, her stockings and her tail each have a picture of their own', names.size >= 6 && pictured.length >= 20, `${names.size} pictures on ${pictured.length} of ${meshes.length} parts`);
const facesOf = (b: { root: THREE.Object3D }): number => {
  let n = 0;
  b.root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) n += (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3;
  });
  return n;
};
const fox = facesOf(makePatron('fox', 'vix'));
const knight = facesOf(new RatModel());
check('she is made of few faces, as everyone here is: fewer than the knight himself (she has more on than the fox, who has fewer still)', facesOf(body) < knight && fox < facesOf(body), `${facesOf(body)} faces; the knight ${knight}, the fox ${fox}`);

// The notch: one ear's rim has a point drawn well in; the other's has none.
const rimIn = (geo: THREE.BufferGeometry, r: number): number => {
  const p = geo.attributes.position;
  // (How near the middle the nearest point ON THE LEAF'S OWN PLANE comes, among those that are its outer rim.)
  let least = Infinity;
  for (let i = 0; i < p.count; i++) if (Math.abs(p.getZ(i)) < 1e-9) least = Math.min(least, Math.hypot(p.getX(i), p.getY(i) - r));
  return least / r;
};
check('ONE ear has a notch out of its rim: a point of it drawn most of the way in; the other is whole', rimIn(ratEar(0.125, true, 0, 0), 0.125) < 0.5 && Math.abs(rimIn(ratEar(0.125, false, 0, 0), 0.125) - 1) < 1e-6, `${rimIn(ratEar(0.125, true, 0, 0), 0.125).toFixed(2)} of the way out, against ${rimIn(ratEar(0.125, false, 0, 0), 0.125).toFixed(2)}`);

// The tail: long, up, curled.
const tailAt = (time: number, o: Partial<PatronCtx> = {}): THREE.Vector3[] => {
  for (let t = 0; t <= time; t += 1 / 30) body.update(1 / 30, ctx(t, o));
  body.root.updateMatrixWorld(true);
  // (The chain: from the body's last child downward, each a group whose first child is a mesh and which may hold the next.)
  const chain: THREE.Vector3[] = [];
  let g = (body.root.children[0] as THREE.Group).children[(body.root.children[0] as THREE.Group).children.length - 1] as THREE.Object3D | undefined;
  while (g && !(g as THREE.Mesh).isMesh) {
    chain.push(new THREE.Vector3().setFromMatrixPosition(g.matrixWorld));
    const next = g.children.find((c) => !(c as THREE.Mesh).isMesh && c.children.some((k) => (k as THREE.Mesh).isMesh));
    // (And the very end of it: the far end of its last length.)
    if (!next) chain.push(new THREE.Vector3(0, 0.13, 0).applyMatrix4(g.matrixWorld));
    g = next;
  }
  return chain;
};
{
  const chain = tailAt(3);
  const len = chain.slice(1).reduce((n, p, i) => n + p.distanceTo(chain[i]), 0);
  const top = Math.max(...chain.map((p) => p.y));
  const tip = chain[chain.length - 1];
  check('her tail is long (longer than the knight is tall) and UP: it rises from the back of her skirt to over her shoulders', chain.length === 11 && len > 1.0 && top > 1.05 && chain[0].y < 0.6 && chain[0].z < 0, `${chain.length - 1} lengths, ${len.toFixed(2)} long, its highest point ${top.toFixed(2)} up`);
  check('...and it CURLS: its end has come back down and forward from its highest point', tip.y < top - 0.05 && tip.z > Math.min(...chain.map((p) => p.z)) + 0.1, `end ${(top - tip.y).toFixed(2)} below its top`);
  const a = tailAt(1).map((p) => p.y.toFixed(3)).join();
  const b = tailAt(3.2).map((p) => p.y.toFixed(3)).join();
  check('the curl comes and goes: it is not the same a couple of seconds on', a !== b);
  const low = Math.min(...[0.5, 2, 4, 6].flatMap((t) => [tailAt(t), tailAt(t, { seated: true }), tailAt(t, { doing: 'lean' })]).flat().map((p) => p.y));
  check('standing, sitting or leaning, no part of it goes down through the floor', low > 0.05, `lowest ${low.toFixed(2)}`);
}
{
  // She keeps time: her head nods on the beat when she is not talking, and is still of it when she is.
  const nodOf = (talking: boolean): number => {
    const xs: number[] = [];
    for (let t = 0; t < 3; t += 1 / 30) {
      body.update(1 / 30, ctx(t, { talking, mouth: talking ? 0.5 : 0 }));
      xs.push(body.root.children[0].position.y);
    }
    return Math.max(...xs) - Math.min(...xs);
  };
  check('she keeps time with the room (a dip on the beat), and stops to talk', nodOf(false) > 0.004 && nodOf(true) < 1e-6, `${nodOf(false).toFixed(3)} against ${nodOf(true).toFixed(3)}`);
  check('she stands as tall as she is said to (for the marker over her head)', body.height > 1.2 && body.height < 1.6);
}
console.log(failures === 0 ? '\nJinx checks passed.' : `\n${failures} Jinx check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
