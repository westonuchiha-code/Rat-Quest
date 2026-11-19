// THE CLIPPING SWEEP: finds flat faces that lie almost on top of one another and face the same way.
//
// Two such faces flicker through each other at a distance (the owner, 2026-11-16, of five things in the Club: a
// barrel's lid, the couch's patches, the drink in the mugs, the rugs, the dartboard). A small gap is not enough: the
// one on top must be drawn in a material made for lying on things (`lyingOn`: a polygon offset, more for each layer
// up), or the thing must be built so that no two of its faces share a plane.
// This builds every level's room and every character's model, and for each pair of faces that are parallel, face the
// same way, are within `GAP` of each other and overlap, asks that the one in front be a layer up from the one behind.
// It HOLDS the count of what is left at nothing: a prop added next year that lies on another and is not cured (by the
// game's own `autoLayer` as the room loads, or at its source) fails here, with where it is and what the two things are.
//   npx vite build --ssr tests/clipsweep.ts --outDir .testdist --emptyOutDir && node .testdist/clipsweep.js
// `SWEEP_ONLY=<level id>` sweeps one level; `SWEEP_ALL=1` lists every finding (not only the first of each kind).
import './../src/core/colorSetup';
import * as THREE from 'three';
import { buildChamber } from '../src/world/chamber';
import { ALL_LEVELS, TEST_ROOMS } from '../src/levels/levels';
import type { LevelDef } from '../src/levels/types';
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
import { Doorway } from '../src/world/doorway';

import { asDecal, autoLayer, decalOf, sweep, LAYER_BUDGET, LAYER_MOST, type Finding } from '../src/render/layering';
import { createPs1Material, lyingOn } from '../src/render/ps1Material';
import { longDropPlan, RAIL } from '../src/levels/longdrop';

/** What a mesh is, as near as can be told: its name, or its parents', or the shape it is made of. */
const what = (m: THREE.Object3D): string => {
  for (let p: THREE.Object3D | null = m; p; p = p.parent) if (p.name) return p.name;
  const g = (m as THREE.Mesh).geometry;
  return g?.type?.replace('Geometry', '') ?? 'mesh';
};

let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}
const all = !!process.env.SWEEP_ALL;
/** What was found, gathered by what the two things are and which way they face: for reading when a check fails. */
const told = (finds: Finding[], near?: (p: THREE.Vector3) => string): string => {
  const kinds = new Map<string, Finding[]>();
  for (const f of finds) {
    const k = `${near ? near(f.at) : ''} ${what(f.front)} over ${what(f.back)}, facing ${[f.n.x, f.n.y, f.n.z].map((q) => Math.round(q)).join()}${f.soft ? ' (see-through)' : ''}`;
    kinds.set(k, [...(kinds.get(k) ?? []), f]);
  }
  return [...kinds.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .map(([k, fs]) => `${fs.length} x${k}: gap ${Math.min(...fs.map((q) => q.gap)).toFixed(4)}, at ${fs.slice(0, all ? 6 : 1).map((q) => `${q.at.x.toFixed(1)},${q.at.y.toFixed(2)},${q.at.z.toFixed(1)}`).join(' and ')}`)
    .join('; ');
};
const faceCount = (root: THREE.Object3D): number => {
  let n = 0;
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh && m.geometry?.attributes?.position) n += (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3;
  });
  return n;
};
const plate = (w: number, d: number, y: number, mat: THREE.Material, x = 0, z = 0): THREE.Mesh => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), mat);
  m.position.set(x, y, z);
  return m;
};

// ---------------------------------------------------------------- the tool itself
{
  const floorMat = createPs1Material({ lit: true });
  const rugMat = createPs1Material({ lit: true });
  const coinMat = createPs1Material({ lit: true });
  const g = new THREE.Group();
  const floor = plate(8, 8, 0, floorMat);
  const rug = plate(2, 2, 0.01, rugMat);
  const coin = plate(0.4, 0.4, 0.02, coinMat);
  const far = plate(1, 1, 0.5, rugMat, 3, 3); // (well clear of the floor: nothing to cure)
  const twin = plate(1, 1, 0.01, floorMat, -3, -3); // (the floor's own material and colour: looks the same whichever is drawn)
  g.add(floor, rug, coin, far, twin);
  const before = sweep(g, 'made');
  check('the sweep finds a rug a hair over a floor, and a coin a hair over the rug: each smaller thing called the one on top', before.length === 3 && before.every((f) => (f.front === rug && f.back === floor) || (f.front === coin && (f.back === rug || f.back === floor))), told(before));
  check('...and not a thing well clear of the floor, nor a patch of the floor\'s own material and colour (whichever of those two is drawn, it looks the same)', !before.some((f) => f.front === far || f.front === twin));
  const done = autoLayer(g);
  const lv = (m: THREE.Mesh): number => (m.userData.layer as number | undefined) ?? 0;
  check('the layering puts the rug one layer up from the floor and the coin two: what lies on a thing that lies on something is over both', lv(floor) === 0 && lv(rug) === 1 && lv(coin) === 2 && done.layeredMeshes === 2 && done.skins === 0 && !done.skipped, `${lv(floor)}/${lv(rug)}/${lv(coin)}`);
  check('...after which the sweep finds nothing: what is on a higher layer is painted on after what is under it, and the order decides', sweep(g, 'made').length === 0);
  const rm = rug.material as THREE.ShaderMaterial;
  const cm = coin.material as THREE.ShaderMaterial;
  check('a flat thing that lies on another is PAINTED ON AFTERWARDS: it writes no depth, is drawn after the room in the order of its layer, and is pulled a hair toward the eye', rm.depthWrite === false && cm.depthWrite === false && rug.renderOrder === 1 && coin.renderOrder === 2 && rm.polygonOffset && rm.polygonOffsetFactor < 0);
  check('...and the coin on the rug is pulled no further than the rug is (the rug wrote no depth: both are one hair over the FLOOR, and the depth buffer still holds the floor)', cm.polygonOffsetFactor === rm.polygonOffsetFactor && (floor.material as THREE.Material).depthWrite !== false, `${rm.polygonOffsetFactor} / ${cm.polygonOffsetFactor}`);
  check('its material is a copy that SHARES its settings with the one it was copied from (the room\'s fog, its lights, its flash reach it too): only how it meets the depth buffer is its own', rm !== rugMat && rm.uniforms === rugMat.uniforms && rm.userData.layerOf === rugMat && rugMat.depthWrite !== false);
  check('...there is one copy of a material for a pull, however many things ask for it; and layering twice changes nothing', decalOf(rugMat) === rm && decalOf(rm) === rm && decalOf(rugMat, 2) !== rm && autoLayer(g).layeredMeshes === 0);
  // A SOLID thing with a face flush against another's.
  {
    const wallMat = createPs1Material({ lit: true });
    const blockMat = createPs1Material({ lit: true });
    const gs = new THREE.Group();
    const wall = new THREE.Mesh(new THREE.BoxGeometry(6, 4, 1), wallMat);
    const block = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), blockMat);
    block.position.set(0, 0, 0.005); // (its front face five thousandths proud of the wall's)
    gs.add(wall, block);
    const found = sweep(gs, 'made');
    const out = autoLayer(gs);
    const skin = block.children[0] as THREE.Mesh | undefined;
    check('a SOLID thing with a face flush against another\'s (a block let into a wall) is found, and keeps its own honest depth: its material is not touched', found.length === 1 && found[0].front === block && block.material === blockMat && blockMat.depthWrite !== false && !blockMat.polygonOffset);
    check('...it is given a SKIN instead: itself again, painted on afterwards (the same shape, no depth written, a hair toward the eye, drawn after the room)', out.skins === 1 && !!skin && skin.geometry === block.geometry && (skin.material as THREE.Material).depthWrite === false && (skin.material as THREE.Material).polygonOffset && skin.renderOrder === 1 && (skin.material as THREE.ShaderMaterial).uniforms === blockMat.uniforms);
    check('...after which the sweep finds nothing there, and a second go gives it no second skin', sweep(gs, 'made').length === 0 && autoLayer(gs).skins === 0 && block.children.length === 1);
    // (A flat thing made by hand to lie on something, in a material that writes depth: painted on afterwards too.)
    const gh = new THREE.Group();
    const hand = plate(1, 1, 0.01, lyingOn(createPs1Material({ lit: true }), 3));
    gh.add(plate(8, 8, 0, createPs1Material({ lit: true })), hand);
    autoLayer(gh);
    check('a flat thing made BY HAND to lie three layers up, in a material that wrote depth (the rug\'s diamonds as they were), is made one that is painted on afterwards on that layer: so it cannot stand nearer the eye than his shadow', (hand.material as THREE.Material).depthWrite === false && hand.renderOrder === 3 && hand.userData.layer === 3);
    const lone = plate(1, 1, 0.01, createPs1Material({ lit: true }));
    asDecal(lone, 2);
    check('`asDecal` does the same for one mesh by hand (the Long Drop\'s runnels, the cave\'s moss)', (lone.material as THREE.Material).depthWrite === false && lone.renderOrder === 2 && lone.userData.layer === 2);
  }
  // (A face that looks straight into something solid is never seen.)
  const g2 = new THREE.Group();
  g2.add(plate(8, 8, 0, floorMat), plate(2, 2, 0.01, createPs1Material({ lit: true })));
  check('a pair looking straight into something solid is let be (the underside of a pillar on a floor): never seen', sweep(g2, 'made').length === 1 && sweep(g2, 'made', () => true).length === 0);
  // (Within ONE mesh: its own surface in one plane is not a pair; two of its faces a hair apart ARE, and cannot be layered.)
  const one = new THREE.BufferGeometry();
  one.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, 1, 1, 0, 1, 0, 0.01, 0, 0, 0.01, 1, 1, 0.01, 1], 3));
  one.setAttribute('color', new THREE.Float32BufferAttribute([1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0], 3));
  const g3 = new THREE.Group();
  const both = new THREE.Mesh(one, createPs1Material({ lit: true }));
  g3.add(both);
  const done3 = autoLayer(g3);
  const left = sweep(g3, 'made');
  check('two faces of ONE mesh a hair apart, of different colours, cannot be cured by layering (one mesh is drawn all at once): the sweep still finds them', done3.layeredMeshes === 0 && left.length === 1 && left[0].front === both && left[0].back === both);
  (both as THREE.Mesh<THREE.BufferGeometry, THREE.Material>).material = new THREE.MeshBasicMaterial({ vertexColors: true, depthWrite: false });
  check('...unless the mesh writes no depth: then its faces go down in the order they were made, every frame alike (the moss)', sweep(g3, 'made').length === 0);
  check(`nothing is put more than ${LAYER_MOST} layers up`, (() => {
    const g4 = new THREE.Group();
    for (let i = 0; i < LAYER_MOST + 4; i++) g4.add(plate(4 - i * 0.2, 4 - i * 0.2, i * 0.004, createPs1Material({ lit: true })));
    autoLayer(g4);
    return g4.children.every((c) => lv(c as THREE.Mesh) <= LAYER_MOST);
  })());
}

// ---------------------------------------------------------------- every level
{
  const only = process.env.SWEEP_ONLY;
  let levels = 0;
  let cured = 0;
  let skins = 0;
  let flats = 0;
  const lying: string[] = [];
  const big: string[] = [];
  const dirty: string[] = [];
  for (const L of [...ALL_LEVELS, ...TEST_ROOMS] as LevelDef[]) {
    if (only && L.id !== only) continue;
    const ch = buildChamber({ solids: L.solids, pit: L.pit, water: L.water ?? [], lava: L.lava, decor: L.decor, movers: L.movers ?? [], pipes: L.pipes, gates: L.gates } as never);
    ch.update(0.4);
    // (Its doors too: the way out, and a hub's doors.)
    const scene = new THREE.Group();
    scene.add(ch.group);
    for (const d of [L.exit, ...(L.courseDoors ?? []).map((c) => c.door)]) if (d) scene.add(new Doorway(d, (L.theme ?? 'sewer') as never).group);
    const near = (p: THREE.Vector3): string => {
      let best = '';
      let bd = 2.5;
      for (const d of L.decor) {
        const q = d as unknown as { x?: number; z?: number; x0?: number; z0?: number; kind: string };
        const dist = Math.hypot((q.x ?? q.x0 ?? 1e9) - p.x, (q.z ?? q.z0 ?? 1e9) - p.z);
        if (dist < bd) {
          bd = dist;
          best = ` [near a ${q.kind}]`;
        }
      }
      return best;
    };
    const inside = (p: THREE.Vector3): boolean => ch.colliders.some((b) => !b.ramp && p.x > b.min.x + 1e-3 && p.x < b.max.x - 1e-3 && p.y > b.min.y + 1e-3 && p.y < b.max.y - 1e-3 && p.z > b.min.z + 1e-3 && p.z < b.max.z - 1e-3);
    // (As the game does when it loads the level: what lies on something is put a layer up. Then: what is left?)
    const done = autoLayer(ch.group, inside);
    // (And, as the game does next, its still dressing gathered: world/chamber.ts gatherStill.)
    ch.gather();
    const after = sweep(scene, L.id, inside);
    levels++;
    cured += done.layeredMeshes;
    skins += done.skins;
    // (THE DEPTH BUFFER MUST HOLD THE TRUE FLOOR: no flat thing that lies on something may write depth from nearer
    // the eye than it is. If one does, the knight's shadow, a hair over the floor, is hidden behind it.)
    ch.group.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh || !m.geometry?.attributes?.position) return;
      const mat = m.material as THREE.Material;
      if (!mat.polygonOffset) return;
      m.geometry.computeBoundingBox();
      const sz = m.geometry.boundingBox!.getSize(new THREE.Vector3());
      if (Math.min(sz.x, sz.y, sz.z) > 1e-3) return;
      flats++;
      if (mat.depthWrite !== false || m.renderOrder < 1) lying.push(`${L.id}: a ${what(m)} at ${m.getWorldPosition(new THREE.Vector3()).toArray().map((q) => q.toFixed(1)).join()}`);
    });
    if (done.skipped) big.push(L.id);
    if (after.length) dirty.push(L.id);
    check(`${L.id}: nothing is left that could flicker (${done.skipped ? 'too big to layer as it loads: it is clean AS BUILT' : `${done.layeredMeshes} things were put a layer up as it loaded`})`, after.length === 0, told(after, near));
    if (done.skipped) check(`...${L.id} has more than ${LAYER_BUDGET} faces, which is why it is not swept as it loads (the sweep of it takes seconds)`, faceCount(ch.group) > LAYER_BUDGET, `${faceCount(ch.group)}`);
  }
  if (!only) {
    check('every level and every try-out room was swept, and the layering as they load has real work to do (hundreds of things lie on others)', levels === ALL_LEVELS.length + TEST_ROOMS.length && levels >= 33 && cured > 300, `${levels} levels, ${cured} things layered`);
    // (The Big Dipper, 2026-11-17: the dream's long ride, 2,260 long. Clean as built, as the Long Drop is.)
    check('only the two long rides (the Long Drop, the Big Dipper) are too big to sweep as they load', big.join() === 'longdrop,bigdipper', big.join());
    check('in every room, every FLAT thing that lies on something (a rug and each of its layers, the dance floor, a patch, a mark on a wall) is painted on afterwards and writes no depth: so the depth buffer holds the true floor, and his shadow shows on a rug (it had vanished on the long rugs and the dance floor: they stood nearer the eye than it)', flats > 300 && lying.length === 0, `${flats} flat things${lying.length ? `; ${lying.slice(0, 4).join('; ')}` : ''}`);
    check('...and solid things with a flush face wear skins', skins > 200, `${skins} skins`);
  }
}

// ---------------------------------------------------------------- what was cured at its source
{
  // A thin pipe's joint bands.
  const thin = buildChamber({ solids: [], pit: [], water: [], decor: [{ kind: 'pipe', a: [0, 1, 0], b: [0, 1, 12], r: 0.05 }], movers: [] } as never);
  const left = sweep(thin.group, 'pipe');
  check('a thin pipe\'s joint bands stand proud of it by more than a hair (they were a hundredth proud, in one mesh with the pipe, and flickered through it)', left.length === 0, told(left));
  // Glowing moss.
  const cave = TEST_ROOMS.find((l) => l.id === 'glowcave')!;
  const room = buildChamber({ solids: cave.solids, pit: cave.pit, water: cave.water ?? [], decor: cave.decor.filter((d) => d.kind === 'moss'), movers: [] } as never);
  const moss: THREE.Mesh[] = [];
  room.group.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh && (m.material as THREE.MeshBasicMaterial).map && (m.material as THREE.Material).depthWrite === false && !(m.material as THREE.Material).transparent) moss.push(m);
  });
  check('the cave\'s moss (lobes lying on one another, threads on the lobes, all one mesh) writes no depth, lies on the rock, and is drawn after the room: so its faces go down in the order they were made', moss.length >= 10 && moss.every((m) => m.renderOrder === 1 && m.userData.layer === 1 && (m.material as THREE.Material).polygonOffset), `${moss.length} clumps`);
  // The Long Drop: its rails and its runnels.
  const drop = longDropPlan();
  const beds = drop.solids.filter((b) => b.ramp && b.x1 - b.x0 > 10);
  const rails = drop.solids.filter((b) => b.ramp && Math.abs(b.x1 - b.x0 - RAIL.wide) < 1e-6);
  const sunk = rails.filter((r) => beds.some((bed) => Math.abs(bed.z1 - r.z1) < 1e-6 && bed.z0 <= r.z0 && r.y0 < bed.ramp!.low - 1e-6));
  check('the Long Drop\'s rails stand ON the bed at their low end, not sunk in it (sunk, a rail that ran to the bed\'s end had its own end in the plane of the bed\'s end)', rails.length >= 8 && sunk.length === 0, `${rails.length} rails, ${sunk.length} sunk`);
  const ld = TEST_ROOMS.find((l) => l.id === 'longdrop')!;
  const runnels = buildChamber({ solids: [], pit: [], water: [], decor: ld.decor.filter((d) => d.kind === 'runnel').slice(0, 2), movers: [] } as never);
  const strips: THREE.Mesh[] = [];
  // (A runnel is a plane in a group tipped down the slope.)
  runnels.group.traverse((o) => (o as THREE.Mesh).isMesh && (o as THREE.Mesh).geometry.type === 'PlaneGeometry' && o.parent!.rotation.x !== 0 && strips.push(o as THREE.Mesh));
  check('a runnel of slime is drawn as a thing that LIES ON the floor (it is a strip a hair over it)', strips.length === 2 && strips.every((m) => (m.material as THREE.Material).polygonOffset && (m.material as THREE.Material).depthWrite === false && m.renderOrder === 1 && m.userData.layer === 1));
}

// ---------------------------------------------------------------- what characters lay on the floor
{
  const npc = (name: string, kind: string): Npc => new Npc({ name, kind, x: 0, z: 0, facing: 0, lines: ['.'] } as never);
  const models: Array<[string, () => THREE.Object3D]> = [
    ['the knight', () => new RatModel().root], ['Dizzy Dave', () => npc('Dizzy Dave', 'pigeon').root], ['Pip', () => npc('Pip', 'mouse').root], ['Finch', () => npc('Finch', 'bird').root],
    ['Mossback Mo', () => npc('Mossback Mo', 'turtle').root], ['Vix', () => npc('Vix', 'fox').root], ['Slink', () => npc('Slink', 'ferret').root], ['Madam Tawny', () => npc('Madam Tawny', 'owl').root], ['Corporal Nib', () => npc('Corporal Nib', 'ant').root],
    ['a beaten stag', () => npc('Sir Hobnail', 'stag').root], ['Lord Grimsqueak', () => npc('Lord Grimsqueak', 'villain').root],
    ['roach', () => new ScuttlerModel().root], ['toad', () => new ToadModel().root], ['ironback', () => new IronbackModel().root], ['bat', () => new BatModel({ x: 0, y: 3.4, z: 0 }, 'rock').root],
    ['guard', () => new GuardModel().root], ['mantis', () => new MantisModel().root], ['stag', () => new StagModel().root], ['hornet', () => new HornetModel().root], ['ant', () => new AntModel().root],
    ['firefly', () => new FireflyModel().root], ['scorpion', () => new ScorpionModel().root], ['broodmother', () => new BroodModel().root], ['wyrm', () => new WyrmModel().root],
  ];
  const bad: string[] = [];
  let flats = 0;
  const shadows = new Map<string, number>();
  for (const [name, make] of models) {
    // (Standing on a floor, as it does in the game; and with everything it can show, shown: a warning ring is hidden
    // until it is wanted.)
    const g = new THREE.Group();
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(8, 8, 8, 8).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial());
    floor.name = 'THE FLOOR';
    const model = make();
    model.traverse((o) => (o.visible = true));
    g.add(floor, model);
    g.updateMatrixWorld(true);
    // Its FLAT things within a hair of the floor: shadows, rings, marks. (A body part that happens to rest there in
    // the pose a model is made in, the ride board, a flier's sting, is not flat and is not there in the game.)
    let dark = 0;
    model.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh || !m.geometry?.attributes?.position) return;
      const b = new THREE.Box3().setFromObject(m);
      if (b.max.y - b.min.y > 0.012 || Math.abs(b.min.y) > 0.06 || b.max.x - b.min.x < 0.2) return;
      flats++;
      const mat = m.material as THREE.MeshBasicMaterial;
      if (!mat.polygonOffset) bad.push(`${name}: ${what(m)}`);
      if (mat.depthWrite === false && mat.color?.getHex() === 0) dark++;
    });
    shadows.set(name, dark);
    const onFloor = sweep(g, name).filter((f) => (f.front === floor || f.back === floor) && new THREE.Box3().setFromObject(f.front === floor ? f.back : f.front).getSize(new THREE.Vector3()).y < 0.012);
    if (onFloor.length) bad.push(`${name}: ${told(onFloor)}`);
  }
  check('every flat thing a character lays on the floor (its shadow, a warning ring, the mark where a sting will land) is drawn as a thing that LIES ON the floor', flats >= 25 && bad.length === 0, `${flats} flat things${bad.length ? `: ${bad.join('; ')}` : ''}`);
  check('nobody casts two shadows: the off-duty ant and the beaten stag are creatures from elsewhere and bring their own (they had that AND the one every character is given, one on the other, twice as dark)', shadows.get('Corporal Nib') === 1 && shadows.get('a beaten stag') === 1 && shadows.get('Pip') === 1 && shadows.get('ant') === 1, [...shadows].filter(([, n]) => n !== 1).map(([k, n]) => `${k} ${n}`).join());
  check('a ring is over its own fill: the scorpion\'s mark', (() => {
    const s = new ScorpionModel() as unknown as { markMat: THREE.Material; fillMat: THREE.Material };
    return s.markMat.polygonOffsetFactor < s.fillMat.polygonOffsetFactor && s.fillMat.polygonOffset;
  })());
  // (`lyingOn` itself.)
  const a = lyingOn(new THREE.MeshBasicMaterial(), 1);
  const b = lyingOn(new THREE.MeshBasicMaterial(), 3);
  check('each layer up is drawn nearer than the one below it', a.polygonOffset && b.polygonOffsetFactor < a.polygonOffsetFactor && b.polygonOffsetUnits < a.polygonOffsetUnits);
}

console.log(failures ? `\n${failures} FAILED` : '\nall passed');
if (failures) process.exit(1);
