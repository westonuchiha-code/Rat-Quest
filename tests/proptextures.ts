// HOW MUCH OF EACH KIND OF PROP HAS A PICTURE ON IT (2026-11-18). Not a test: a count, one of each kind built on its own.
//   npx vite build --ssr tests/proptextures.ts --outDir .testdist --emptyOutDir && node .testdist/proptextures.js
import './../src/core/colorSetup';
import * as THREE from 'three';
import { LEVELS, TEST_ROOMS, ARCHIVE } from '../src/levels/levels';
import { buildChamber } from '../src/world/chamber';
const sample = new Map<string, unknown>();
for (const l of [...TEST_ROOMS, ...LEVELS, ...ARCHIVE]) for (const d of l.decor) if (!sample.has(d.kind)) sample.set(d.kind, d);
const out: string[] = [];
for (const [kind, d] of sample) {
  let ch;
  try { ch = buildChamber({ solids: [], pit: null, water: [], decor: [d], movers: [] } as never); } catch (e) { out.push(`${kind.padEnd(12)} could not build: ${String(e).slice(0, 60)}`); continue; }
  let all = 0, tex = 0, glow = 0;
  ch.group.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || !m.geometry) return;
    const g = m.geometry;
    const t = Math.floor((g.index ? g.index.count : g.attributes.position.count) / 3);
    const mt = m.material as THREE.ShaderMaterial & THREE.MeshBasicMaterial;
    if (mt.transparent || mt.blending === THREE.AdditiveBlending || mt.type === 'MeshBasicMaterial' || mt.type === 'SpriteMaterial') { glow += t; return; }
    all += t;
    const img = (mt.uniforms?.tex?.value ?? mt.map)?.image as { width?: number } | undefined;
    if (img && (img.width ?? 0) > 1) tex += t;
  });
  if (all) out.push(`${kind.padEnd(12)} ${String(Math.round((100 * tex) / all)).padStart(3)}% textured of ${String(all).padStart(5)} (and ${glow} glowing or see-through)`);
}
console.log(out.sort((a, b) => Number(a.split('%')[0].slice(-3)) - Number(b.split('%')[0].slice(-3))).join('\n'));
