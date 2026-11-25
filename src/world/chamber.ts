import { railCurve, railAt, RAIL_TUBE, type RailCurve } from './rails';
import { rulerStrip, signBoard } from './signs';
import { buildBrazier } from './brazierModel';
import { buildForge, type ForgeMats } from './forgeModels';
import { buildCouch } from './couchModel';
import { buildJunk } from './junkModels';
import { buildStrike, type BuiltStrike } from './strikeModels';
import { buildHazard, BELT_DEPTH, type BuiltHazard } from './hazardModels';
import type { HazardSpec } from './hazards';
import { STRIKE, leversOn, newStrikeable, type Strikeable } from './strikeables';
import { buildBottles, buildBulbs, buildDanceFloor, buildDartboard, buildKeg, buildMugRow, buildRug, buildStool, buildTable } from './tavernModels';
import { PORTRAIT_ASPECT, portraitTexture } from './portraitTexture';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { createPs1Material, bakeVertexColor, ps1Uniforms, MAX_LIGHTS, lyingOn } from '../render/ps1Material';
import { asDecal } from '../render/layering';
import { getTexture, TextureName , blinkTextures } from '../render/textures';
import { JET_SPEED, gasAt, gasWidth } from './gusts';
import { Aabb, makeAabb, topAt } from './collision';
import { mount, seatMovers } from './hangings';
import { buildDrain } from './drain';
import type { Crate } from './crates';
import { newPlatformState, platformStep, type PlatformState } from './platforms';
import type { MusicPad } from './musicFloor';
import { Box, Decor, GateSpec, JunkKind, Kind, LavaVolume, Layout, MoverSpec, PipeSpec, Skin, WaterVolume, buildLayout, ceilingOf, MUSHROOM, BRACKET, mushroomCap, mushroomStem } from './layout';
import { TUNING } from '../data/tuning';

/** A portcullis in the room. `open()` lifts it; once it is up its collider is gone. */
/** How strongly the kingdom's machinery is running, 1 normally. A story scene drops it to 0 for the moment the Engine falters. */
export const storyPower = { value: 1 };

export interface Gate {
  spec: GateSpec;
  open: boolean;
  /** 0 shut .. 1 fully up. */
  lift: number;
}

/** A platform that glides about. Its collider and picture move together. */
export interface Mover {
  spec: MoverSpec;
  aabb: Aabb;
  /** How far it moved in the last step. */
  delta: THREE.Vector3;
  /** Its own state: how it moves is world/platforms.ts. */
  state: PlatformState;
}

/** Someone who can be carried: the rat. (A spring throws him up: his velocity, if it is given.) */
export interface Rider {
  position: THREE.Vector3;
  prevPosition: THREE.Vector3;
  velocity?: THREE.Vector3;
  /** His weight is spread (flat on his belly): thin ice bears him. */
  spread?: boolean;
}

export interface Chamber {
  /** How fast the moving platform under the rat is moving (zero when he is not on one). A jump off it keeps this. */
  carry: THREE.Vector3;
  /** Pools of lava (touching one hurts). */
  lava: LavaVolume[];
  movers: Mover[];
  /** Glides every moving platform forward and carries whoever stands on one. Call once per simulation step. */
  /** True if a crusher (world/platforms.ts 'crush') came down on him this step: the game strikes him. */
  stepMovers(dt: number, rider?: Rider): boolean;
  /** A weight coming down on thin ice at a place (a creature bowling over it): the pane there, if it is whole, gives way at once. True if one did. */
  breakThin(x: number, z: number): boolean;
  group: THREE.Group;
  colliders: Aabb[];
  /** Crates and barrels that can be smashed, in the order they appear in the level. */
  crates: Crate[];
  /** Wall pipes whose joint can be smashed. */
  pipes: Crate[];
  /** Removes a broken crate's collider and hides it. For a pipe: breaks the joint and starts it gushing. */
  breakCrate(crate: Crate): void;
  /** Takes a crate off the floor (he has lifted it: world/lifting.ts): it is solid no longer, and what stood on it falls. */
  liftCrate(crate: Crate): void;
  /** Moves a lifted crate (its middle), turned to `yaw`: only where it is and where it is drawn. */
  moveCrate(crate: Crate, x: number, y: number, z: number, yaw?: number): void;
  /** Stands a crate at a place (its middle), square to the room and solid again. */
  setCrate(crate: Crate, x: number, y: number, z: number): void;
  gates: Gate[];
  /** Starts lifting a gate. */
  openGate(gate: Gate): void;
  /** Starts dropping a lifted gate again (one that `shut`s); it is solid again when it is down. */
  closeGate(gate: Gate): void;
  /** Pools the rat can swim in. */
  water: WaterVolume[];
  /** Hands the nearest coloured lights (lamps, braziers, beacons) to the shader. Call once per frame after update(). */
  /** `extra`: lights that come and go (a patch of flame, a firefly's lantern), besides the room's own. */
  updateLights(time: number, focus: THREE.Vector3, extra?: ReadonlyArray<{ x: number; y: number; z: number; r: number; color: THREE.Color; power: number; flash: number; flicker: number; phase: number }>): void;
  /** Advances water, falls, gushing pipes and gates. Call once per rendered frame with seconds since start. */
  update(time: number): void;
  /**
   * Gathers the room's still dressing into a mesh per material (fewer draw calls, the same picture). Call it once,
   * after layering (render/layering.ts autoLayer): what was put a layer up is left as it is, so nothing flickers.
   */
  gather(): void;
  /** He landed at (x, y, z), this hard (0..1): odds and ends within reach answer it (a matchbox's matches rattle). Which kinds did (for their sounds). */
  thump(x: number, y: number, z: number, strength: number): JunkKind[];
  /** Music underfoot, if the room has any (world/musicFloor.ts): its pads, and a way to show which are lit and pressed. */
  music?: { pads: MusicPad[]; show(lit: readonly number[], down: readonly boolean[], flash: readonly number[], time: number): void };
  /** Things to hit, if the room has any (world/strikeables.ts): their states, a way to show them, and to take one away (broken). */
  strike?: { things: Strikeable[]; show(time: number): void; remove(index: number): void };
  /** Hazards and helpers, if the room has any (world/hazards.ts): what they are, and a way to show them at a time. */
  hazards?: { specs: HazardSpec[]; show(time: number): void };
}

/** The picture each kind wears unless the box says otherwise. */
const DEFAULT_SKIN: Record<Kind, Skin> = {
  floor: 'wetCobbles',
  wall: 'sewerBrick',
  pillar: 'concreteSlab',
  platform: 'mossStone',
  rubble: 'crate',
  plank: 'planks',
  stone: 'concreteSlab',
  barrel: 'planks',
};
// The textures carry the color, so these tints are close to white and only warm or cool each surface a little.
const PALETTE: Record<Kind, number> = {
  floor: 0xe8e4d8,
  wall: 0xd8d8cc,
  pillar: 0xf0ece0,
  platform: 0xe6e6da,
  rubble: 0xf2e6d2,
  plank: 0xf0d8b8,
  stone: 0xe0dcd0,
  barrel: 0xf4d8b0,
};
/** World units one texture tile covers, per picture. */
const TILE: Partial<Record<TextureName, number>> = {
  wetCobbles: 2, sewerBrick: 2.5, concreteSlab: 3, mossStone: 2, planks: 1.5, ceramicTiles: 1.5, drainGrate: 1.2,
  rustPlate: 2.5, rubbleWall: 4, mineBrick: 2, roughRock: 3, wetRock: 3, mossRock: 3, dirt: 2.5, mudFloor: 2.5,
  caveRock: 4, caveFloor: 4, iceBrick: 2.5, iceSheet: 5,
  // (The dream's road: one rainbow across its whole width. `ROAD.wide` in levels/milkyway.ts is this.)
  rainbowRoad: 7, pomoTiles: 4, dreamStatic: 4,
  hazardTrim: 1, archTrim: 2, beamSide: 1.5, ironDoor: 3, gravelRail: 2, clay: 2.5, sandstone: 3,
  // (The furnace's set. A brick is 0.75 long; a sheet of tread plate and a casting are each 1.5 square.)
  fireBrick: 6, deckPlate: 3, castIron: 3, girder: 2, castingSand: 3, coalLumps: 1.5,
};
const MOSS = 0xc8f0a8; // tops of platforms pick up a green tint
const PIT_BOTTOM = 0x1d2a1d;
const WATER = 0xf0fff0; // vertex tint over the sludge texture
const UP = new THREE.Vector3(0, 1, 0);

/**
 * Stretches texture coordinates over each box face by world size, so every face gets the same texel density.
 * One tile covers `tile` world units. Faces are picked by normal: top/bottom use x and z, sides use the other axes.
 */
export function applyWorldUvs(geo: THREE.BufferGeometry, tile: number): void {
  const pos = geo.attributes.position;
  const nrm = geo.attributes.normal;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const nx = Math.abs(nrm.getX(i));
    const ny = Math.abs(nrm.getY(i));
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    let u: number;
    let v: number;
    if (ny > 0.5) {
      u = x;
      v = z;
    } else if (nx > 0.5) {
      u = z;
      v = y;
    } else {
      u = x;
      v = y;
    }
    uv[i * 2] = u / tile;
    uv[i * 2 + 1] = v / tile;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}

/** Gives every upward-facing vertex a new color, for mossy tops. */
function tintUpFaces(geo: THREE.BufferGeometry, color: number): void {
  const nrm = geo.attributes.normal;
  const col = geo.attributes.color;
  const c = new THREE.Color(color);
  for (let i = 0; i < nrm.count; i++) {
    if (nrm.getY(i) > 0.5) {
      const k = 0.75 + 0.25 * ((i * 37) % 7) / 6;
      col.setXYZ(i, c.r * k, c.g * k, c.b * k);
    }
  }
}

/** Switches for how a room is built (`&nogather` turns the gathering off, to compare). */
export const CHAMBER_OPTIONS = { gatherStill: true };
/** Dressing that never moves of itself (its flames and candle flames excepted: they are on the room's clocks). Not a
 * row of thimbles on a bar: their feet lie a hair over the counter, and gathered they would flicker into it. */
const STILL_KINDS = new Set<string>(['torch', 'stool', 'table', 'rug', 'junk', 'keg', 'bottles', 'dartboard', 'couch', 'lamp', 'speaker', 'brazier', 'sign']);
/**
 * THE STILL DRESSING GATHERED (2026-11-19: the Hall drew its 30 torches, 14 stools and the rest as 700-odd meshes,
 * each a draw call): every still mesh of the dressing in `roots` is put, where it stands in the room, into one mesh
 * per material. Left as they are: what is `moving` (on one of the room's clocks) or under something that is, what is
 * tagged (userData: whatever layering put a layer up is), hidden, see-through or of more than one material.
 * tests/gather.ts: the same picture; tests/clipsweep.ts: nothing flickers.
 */
function gatherStill(group: THREE.Group, roots: THREE.Object3D[], moving: Set<THREE.Object3D>): void {
  group.updateMatrixWorld(true);
  const toGroup = group.matrixWorld.clone().invert();
  // (By material, and by what each corner carries: only shapes alike in that can be joined.)
  const sig = (g: THREE.BufferGeometry): string => Object.keys(g.attributes).sort().map((k) => `${k}${g.attributes[k].itemSize}`).join();
  const byMat = new Map<string, { mat: THREE.Material; geos: THREE.BufferGeometry[]; meshes: THREE.Mesh[]; order: number }>();
  const under = (o: THREE.Object3D): boolean => {
    for (let q: THREE.Object3D | null = o; q && q !== group; q = q.parent) if (moving.has(q) || !q.visible || Object.keys(q.userData).length) return true;
    return false;
  };
  for (const root of roots) {
    root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh || Array.isArray(m.material) || m.children.length || under(m)) return;
      const mat = m.material as THREE.Material;
      // (A cylinder's side and caps are kept as parts of its shape, but with one material they are drawn as one: no matter.)
      if (mat.transparent || (m as unknown as { isInstancedMesh?: boolean }).isInstancedMesh || Object.keys(m.geometry.morphAttributes).length) return;
      const g = (m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone()).applyMatrix4(m.matrixWorld.clone().premultiply(toGroup));
      g.clearGroups();
      if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
      if (!g.attributes.color) return void g.dispose();
      const key = `${mat.uuid}|${m.renderOrder}|${sig(g)}`;
      const e = byMat.get(key) ?? { mat, geos: [], meshes: [], order: m.renderOrder };
      e.geos.push(g);
      e.meshes.push(m);
      byMat.set(key, e);
    });
  }
  for (const e of byMat.values()) {
    if (e.meshes.length < 2) {
      for (const g of e.geos) g.dispose();
      continue;
    }
    const joined = mergeGeometries(e.geos);
    for (const g of e.geos) g.dispose();
    if (!joined) continue;
    const one = new THREE.Mesh(joined, e.mat);
    one.renderOrder = e.order;
    one.name = 'gathered';
    group.add(one);
    for (const m of e.meshes) m.parent?.remove(m);
  }
}

/** One geometry from many, all non-indexed with the same attributes. */
function mergeAll(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const flat = parts.map((p) => {
    const g = p.index ? p.toNonIndexed() : p;
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    return g;
  });
  const out = mergeGeometries(flat) ?? new THREE.BufferGeometry();
  for (const p of parts) p.dispose();
  return out;
}

/** A ribbon of flowing sludge along a list of centre points, `width` wide, facing the camera side `side`. */
function ribbon(points: THREE.Vector3[], across: THREE.Vector3, width: number, uvScale: number): THREE.BufferGeometry {
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  let run = 0;
  points.forEach((p, i) => {
    if (i > 0) run += p.distanceTo(points[i - 1]);
    const a = p.clone().addScaledVector(across, -width / 2);
    const b = p.clone().addScaledVector(across, width / 2);
    pos.push(a.x, a.y, a.z, b.x, b.y, b.z);
    uv.push(0, run / uvScale, width / uvScale, run / uvScale);
    if (i > 0) {
      const k = i * 2;
      idx.push(k - 2, k - 1, k, k - 1, k + 1, k);
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** A gush of sludge from a broken pipe: a stream that arcs out and falls, and a pool that spreads under it. */
interface Gush {
  stream: THREE.Mesh;
  puddle: THREE.Mesh;
  age: number;
}

/** How far a pillar's capital overhangs its shaft, all round. */
export const PILLAR_LIP = 0.3;

export function buildChamber(layout: Layout = buildLayout()): Chamber {
  const group = new THREE.Group();
  const colliders: Aabb[] = [];

  // One material per picture, shared by every box that wears it.
  const mats = new Map<TextureName, THREE.ShaderMaterial>();
  const mat = (name: TextureName): THREE.ShaderMaterial => {
    let m = mats.get(name);
    if (!m) {
      m = createPs1Material({ tex: getTexture(name) });
      mats.set(name, m);
    }
    return m;
  };
  let portraitMaterial: THREE.ShaderMaterial | null = null;
  const portraitMat = (): THREE.ShaderMaterial => (portraitMaterial ??= createPs1Material({ tex: portraitTexture() }));
  const floorMat = mat('wetCobbles');
  const waterMat = createPs1Material({ tex: getTexture('sludge') });
  const trimMat = mat('archTrim');
  const plainMat = createPs1Material({ lit: true });
  /** Plain colour for a thing that LIES ON another surface, `level` layers up (see `lyingOn`): one material a layer. */
  const plainLayers: THREE.ShaderMaterial[] = [];
  const plainOn = (level: number): THREE.ShaderMaterial => (plainLayers[level] ??= lyingOn(createPs1Material({ lit: true }), level));
  let couchPatchOn: THREE.ShaderMaterial | null = null;
  let ironMaterial: THREE.ShaderMaterial | null = null;
  /** Wrought iron for things that stand in the room (a fire bowl): its picture, lifted, so that it is iron and not a black shape in a dark hall. */
  const ironMat = (): THREE.ShaderMaterial => (ironMaterial ??= createPs1Material({ tex: getTexture('wroughtIron'), color: new THREE.Color().setRGB(1.5, 1.48, 1.45) }));
  let charMaterial: THREE.ShaderMaterial | null = null;
  /** The burnt inside of a fire bowl: on both faces, so the bowl is never seen through. */
  const charMat = (): THREE.ShaderMaterial => (charMaterial ??= createPs1Material({ tex: getTexture('charred'), side: THREE.DoubleSide }));
  let coalMaterial: THREE.ShaderMaterial | null = null;
  /** The coals in a fire bowl: their picture, unlit, so the fire between the lumps glows in the dark. */
  const coalMat = (): THREE.ShaderMaterial => (coalMaterial ??= createPs1Material({ tex: getTexture('coals'), lit: false }));
  const darkMat = createPs1Material({});
  let forgeMaterials: ForgeMats | null = null;
  /** What the furnace's things are made of (forgeModels.ts). */
  const forgeMats = (): ForgeMats => (forgeMaterials ??= {
    brick: mat('fireBrick'), cast: mat('castIron'), iron: ironMat(), wood: mat('planks'), bark: mat('ashWood'), endGrain: mat('beamEnd'),
    leather: createPs1Material({ tex: getTexture('turtleSkin'), side: THREE.DoubleSide }), sand: mat('castingSand'), coal: mat('coalLumps'), coals: coalMat(), char: charMat(), flame: darkMat, glow: () => createPs1Material({}),
  });
  /** For things in the sky (a planet): their own colours, unlit, and not faded by the room's fog. */
  const skyMat = new THREE.MeshBasicMaterial({ vertexColors: true, fog: false });
  const skyMatBoth = new THREE.MeshBasicMaterial({ vertexColors: true, fog: false, side: THREE.DoubleSide });
  /** Things that turn slowly on their own (radians a second). */
  const spinners: Array<{ o: THREE.Object3D; rate: number }> = [];
  const railBeads: Array<{ o: THREE.Object3D; c: RailCurve; at: number }> = [];
  /** Flowers that nod, and butterflies: moved by the room's clock. */
  const nodders: Array<{ o: THREE.Object3D; phase: number; lean: number }> = [];
  const flutterers: Array<{ o: THREE.Group; wings: THREE.Object3D[]; cx: number; cy: number; cz: number; r: number; phase: number; rate: number }> = [];
  // (The game's own material, unlit: a plain three.js one comes out pale here, its colours brightened twice.)
  let petalMat: THREE.ShaderMaterial | null = null;
  /** Cloth seen from both sides (banners). */
  const clothMat = createPs1Material({ lit: true, side: THREE.DoubleSide, tex: getTexture('weave') });
  let cheeseMat: THREE.ShaderMaterial | null = null;
  /** Lit by the room and textured (2026-11-18: the torch's stick, the banner's rod, the shelves were flat colour). */
  const litMats = new Map<TextureName, THREE.ShaderMaterial>();
  const lit = (name: TextureName): THREE.ShaderMaterial => {
    let m = litMats.get(name);
    if (!m) litMats.set(name, (m = createPs1Material({ lit: true, tex: getTexture(name) })));
    return m;
  };
  /** Repeat a shape's own UVs this many times across and along (a long pipe's picture is not one stretched smear). */
  const tiled = <G extends THREE.BufferGeometry>(g: G, su: number, sv: number): G => {
    const uv = g.attributes.uv;
    if (uv) for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
    return g;
  };
  /** A colour lifted toward white, for a texture that carries its own darks under it. */
  const lifted = (c: number, k = 0.55): number => new THREE.Color(c).lerp(new THREE.Color(0xffffff), k).getHex();
  // Falling and gushing sludge scroll their own texture, fast.
  const fallMat = createPs1Material({ tex: getTexture('sludge'), side: THREE.DoubleSide });
  const fallOffset = fallMat.uniforms.uvOffset.value as THREE.Vector2;

  const crates: Crate[] = [];
  const pipes: Crate[] = [];
  const addMesh = (geo: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number): THREE.Mesh => {
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.set(x, y, z);
    group.add(mesh);
    return mesh;
  };

  for (const b of layout.solids as Box[]) {
    const w = b.x1 - b.x0;
    const h = b.y1 - b.y0;
    const d = b.z1 - b.z0;
    const cx = (b.x0 + b.x1) / 2;
    const cy = (b.y0 + b.y1) / 2;
    const cz = (b.z0 + b.z1) / 2;
    const aabb = makeAabb(cx, cy, cz, w, h, d);
    if (b.ramp) aabb.ramp = b.ramp; // its top is a slope: see collision.ts
    if (b.slick) aabb.slick = true; // ice: no grip on its top
    if (b.vert) aabb.vert = true; // the lip of a pipe's wall: a fast rider goes straight up off it
    if (b.kind === 'pillar' && !b.hidden) aabb.lip = PILLAR_LIP; // its capital overhangs: see below
    colliders.push(aabb);
    if (b.hidden) continue; // collider only

    if (b.kind === 'rubble' && b.prop) {
      // A POT or a ROCK: small things to pick up and throw (world/lifting.ts). Drawn inside its box.
      const r = Math.min(w, d) / 2;
      const mesh = new THREE.Group();
      mesh.position.set(cx, cy, cz);
      group.add(mesh);
      if (b.prop === 'pot') {
        // A clay pot: a round belly drawn in at the foot and at the neck, a rolled rim, a dark mouth. Fired clay,
        // with a darker band round its shoulder.
        const profile: Array<[number, number]> = [[0.5, -0.5], [0.78, -0.3], [0.96, 0.02], [0.84, 0.3], [0.54, 0.4], [0.62, 0.5]];
        const belly = new THREE.LatheGeometry(profile.map(([pr, py]) => new THREE.Vector2(pr * r * 0.98, py * h)), 9);
        bakeVertexColor(belly, 0xe0b48c, false);
        const body = new THREE.Mesh(belly, mat('clay'));
        mesh.add(body);
        const band = new THREE.CylinderGeometry(r * 0.9, r * 0.97, h * 0.07, 9, 1, true).translate(0, h * 0.2, 0);
        const mouth = new THREE.CircleGeometry(r * 0.56, 9).rotateX(-Math.PI / 2).translate(0, h * 0.44, 0);
        const foot = new THREE.CircleGeometry(r * 0.49, 9).rotateX(Math.PI / 2).translate(0, -h / 2, 0);
        mesh.add(new THREE.Mesh(bakeVertexColor(mergeAll([band]), 0x8a4a2c), plainMat));
        mesh.add(new THREE.Mesh(bakeVertexColor(mergeAll([mouth, foot]), 0x2a1a12), plainMat));
      } else if (b.prop === 'key') {
        // A KEY (world/locks.ts): gold, standing on its bit, its bow a ring at the top. Big enough to read across a room.
        const gold = 0xf2c84a;
        const bow = new THREE.TorusGeometry(r * 0.62, r * 0.17, 6, 12).translate(0, h * 0.26, 0);
        const shaft = new THREE.CylinderGeometry(r * 0.13, r * 0.13, h * 0.6, 6).translate(0, -h * 0.14, 0);
        const bitA = new THREE.BoxGeometry(r * 0.5, h * 0.09, r * 0.16).translate(r * 0.3, -h * 0.4, 0);
        const bitB = new THREE.BoxGeometry(r * 0.36, h * 0.09, r * 0.16).translate(r * 0.24, -h * 0.26, 0);
        mesh.add(new THREE.Mesh(bakeVertexColor(mergeAll([bow, shaft, bitA, bitB]), gold), plainMat));
      } else {
        // A rock: a rough lump, flat underneath, no two sides alike. The cave's own rock.
        const lump = new THREE.IcosahedronGeometry(1, 1);
        const lp = lump.attributes.position;
        for (let i = 0; i < lp.count; i++) {
          const x = lp.getX(i);
          const y = lp.getY(i);
          const z = lp.getZ(i);
          // (Knocked about by a pattern of its own corners, the same every time: it must not change from load to load.)
          const k = 0.86 + 0.14 * Math.sin(x * 5.1 + z * 3.3) * Math.cos(y * 4.2 + x * 1.7);
          lp.setXYZ(i, x * k * r * 0.98, Math.max(-1, y * k * 1.05) * (h / 2) * 0.98, z * k * r * 0.98);
        }
        lump.computeVertexNormals();
        bakeVertexColor(lump, 0xffffff, false);
        mesh.add(new THREE.Mesh(lump, mat('roughRock')));
      }
      crates.push({ type: b.prop, index: crates.length, x: cx, y: cy, z: cz, half: r, alive: true, aabb, mesh, lastSwing: -1, home: { x: cx, y: cy, z: cz } });
      continue;
    }

    if (b.kind === 'barrel') {
      // A barrel: bulging staves, two iron hoops, a lid. Its collider stays the box.
      const r = Math.min(w, d) / 2;
      // (Drawn inside its box all the way round: its bulge and its hoops used to stand a little proud of it.)
      // (Its staves: open at both ends. Its head is a thing of its own, set down inside them: a barrel drawn as a
      // closed can with a lid laid a hair over its top had two tops in one place, and they flickered.)
      const R0 = r * 0.86;
      const body = new THREE.CylinderGeometry(R0, R0, h, 10, 4, true);
      const p = body.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const yy = p.getY(i) / (h / 2);
        const bulge = 1 + 0.12 * (1 - yy * yy);
        p.setX(i, p.getX(i) * bulge);
        p.setZ(i, p.getZ(i) * bulge);
      }
      body.computeVertexNormals();
      bakeVertexColor(body, b.skin ? 0xffffff : PALETTE.barrel);
      const mesh = addMesh(body, mat(b.skin ?? 'planks'), cx, cy, cz);
      const parts: THREE.BufferGeometry[] = [];
      for (const yy of [-0.3, 0.3]) {
        const hoop = new THREE.CylinderGeometry(r * 0.99, r * 0.99, 0.1, 10, 1, true);
        hoop.translate(0, yy * h, 0);
        parts.push(hoop);
      }
      const hoopGeo = bakeVertexColor(mergeAll(parts), 0x3a3a40);
      const hoops = new THREE.Mesh(hoopGeo, plainMat);
      mesh.add(hoops);
      // Its head: boards, set a little down inside the staves, whose ends stand round it as a rim (the chime).
      const SINK = Math.min(0.07, h * 0.08);
      const INNER = R0 * 0.9;
      const START = -Math.PI / 2; // (the head's ten sides turned to the staves' ten)
      const head = new THREE.CircleGeometry(INNER, 10, START);
      head.rotateX(-Math.PI / 2);
      head.translate(0, h / 2 - SINK, 0);
      bakeVertexColor(head, b.skin ? 0xd8d8d8 : 0xd2b890, false);
      mesh.add(new THREE.Mesh(head, mat(b.skin ?? 'planks')));
      const chime = new THREE.RingGeometry(INNER, R0, 10, 1, START);
      chime.rotateX(-Math.PI / 2);
      chime.translate(0, h / 2, 0);
      const wall = new THREE.CylinderGeometry(INNER, INNER, SINK, 10, 1, true);
      wall.scale(-1, 1, 1); // (inside out: it is its inner face that is seen)
      wall.translate(0, h / 2 - SINK / 2, 0);
      const foot = new THREE.CircleGeometry(R0, 10, START);
      foot.rotateX(Math.PI / 2);
      foot.translate(0, -h / 2, 0);
      mesh.add(new THREE.Mesh(bakeVertexColor(mergeAll([chime, wall, foot]), 0x6a4a30), plainMat));
      crates.push({ type: 'barrel', index: crates.length, x: cx, y: cy, z: cz, half: r, alive: true, aabb, mesh, lastSwing: -1 });
      continue;
    }

    // Big surfaces are cut into small squares. Vertex snapping moves each corner by up to half a pixel, and on one
    // huge polygon that nudges the whole floor and its texture as he walks. Small squares keep the wobble local.
    const cut = (len: number): number => (b.kind === 'rubble' ? 1 : Math.min(24, Math.max(1, Math.ceil(len / 2.5))));
    // A pillar's drawn shaft stops under its capital. If it ran all the way up, its top face and the capital's top face
    // would sit in the same plane and flicker into each other. The collider still reaches the full height.
    const shaft = b.kind === 'pillar' && h > 1.2 ? 0.4 : 0;
    const geo = new THREE.BoxGeometry(w, h - shaft, d, cut(w), cut(h - shaft), cut(d));
    if (b.ramp) {
      // A ramp is drawn as what is solid of it: the box, pressed down under its slope. Each corner keeps its place on
      // the ground and its share of the height, but of the height the slope has THERE, not of the whole box's.
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const share = (pos.getY(i) + h / 2) / h;
        const top = topAt(aabb, cx + pos.getX(i), cz + pos.getZ(i));
        pos.setY(i, b.y0 + share * (top - b.y0) - cy);
      }
      geo.computeVertexNormals();
    }
    const skin = b.skin ?? DEFAULT_SKIN[b.kind];
    if (b.kind !== 'rubble') applyWorldUvs(geo, TILE[skin] ?? 2); // crates keep one whole picture per face
    bakeVertexColor(geo, b.skin && b.kind !== 'rubble' ? 0xeeeeee : PALETTE[b.kind]);
    if (b.kind === 'platform' && !b.skin) tintUpFaces(geo, MOSS);
    const mesh = addMesh(geo, mat(skin), cx, cy - shaft / 2, cz);
    if (b.kind === 'rubble') {
      if (b.tough) {
        // Bound in iron: dark straps round it both ways, corner plates and studs, so it reads as too much for a rat sword.
        const parts: THREE.BufferGeometry[] = [];
        const e = 0.03;
        for (const t of [-0.3, 0.3]) {
          parts.push(new THREE.BoxGeometry(w + e * 2, h * 0.09, d + e * 2).translate(0, t * h, 0));
          parts.push(new THREE.BoxGeometry(w * 0.09, h + e * 2, d + e * 2).translate(t * w, 0, 0));
          parts.push(new THREE.BoxGeometry(w + e * 2, h + e * 2, d * 0.09).translate(0, 0, t * d));
        }
        const iron = new THREE.Mesh(bakeVertexColor(mergeAll(parts), 0x34363c), plainMat);
        mesh.add(iron);
        const studs: THREE.BufferGeometry[] = [];
        for (const sx of [-0.3, 0.3]) for (const sy of [-0.3, 0.3]) for (const sz of [-1, 1]) {
          studs.push(new THREE.BoxGeometry(w * 0.07, h * 0.07, 0.05).translate(sx * w, sy * h, sz * (d / 2 + e + 0.02)));
          studs.push(new THREE.BoxGeometry(0.05, h * 0.07, d * 0.07).translate(sz * (w / 2 + e + 0.02), sy * h, sx * d));
        }
        mesh.add(new THREE.Mesh(bakeVertexColor(mergeAll(studs), 0xb8a060), plainMat));
      }
      crates.push({ type: 'crate', index: crates.length, x: cx, y: cy, z: cz, half: w / 2, alive: true, aabb, mesh, lastSwing: -1, tough: b.tough });
    }

    // Pillars get a capital on top. It is drawn only (the solid shape is the shaft) and sits flush with the top of the
    // pillar; the collider's `lip` says how far it overhangs, so that a rat hanging from the top hangs from its edge.
    if (b.kind === 'pillar') {
      const capGeo = new THREE.BoxGeometry(w + PILLAR_LIP * 2, 0.4, d + PILLAR_LIP * 2);
      applyWorldUvs(capGeo, 2);
      bakeVertexColor(capGeo, PALETTE.pillar);
      addMesh(capGeo, trimMat, cx, b.y1 - 0.2, cz); // flush with the top, so standing on the pillar does not sink into it
      const baseGeo = new THREE.BoxGeometry(w + 0.4, 0.5, d + 0.4);
      applyWorldUvs(baseGeo, 2);
      bakeVertexColor(baseGeo, PALETTE.pillar);
      addMesh(baseGeo, trimMat, cx, b.y0 + 0.25, cz);
    }
  }

  // ---- Moving platforms. ----
  const movers: Mover[] = [];
  const moverMeshes: THREE.Mesh[] = [];
  /** A swinging platform's two chains, by its place among the movers. */
  const swingChains = new Map<number, THREE.Mesh[]>();
  // (Seated on the floor under them, if they were put with their bodies in it: see hangings.ts. Levels do this
  // themselves when they are compiled; this is for a layout that has not been.)
  for (const spec of seatMovers(layout.movers ?? [], layout.solids)) {
    const thick = spec.thick ?? 0.5;
    const geo = new THREE.BoxGeometry(spec.w, thick, spec.d, Math.max(1, Math.ceil(spec.w / 2.5)), 1, Math.max(1, Math.ceil(spec.d / 2.5)));
    // (A spring is striped as a warning is; one that crumbles is rubble; the rest are planks, as before.)
    const skin = spec.skin ?? (spec.motion === 'spring' || spec.motion === 'crush' ? 'hazardTrim' : spec.motion === 'crumble' ? (spec.thin ? 'iceBlock' : 'rubbleWall') : DEFAULT_SKIN.plank);
    applyWorldUvs(geo, TILE[skin] ?? 2);
    bakeVertexColor(geo, 0xeeeeee);
    const mesh = addMesh(geo, mat(skin), spec.x, spec.y - thick / 2, spec.z);
    moverMeshes.push(mesh);
    // (A swinging platform hangs on two chains from its pivot: drawn here, stretched to it each step.)
    if (spec.motion === 'swing' || spec.motion === 'drop') {
      const chains = [0, 1].map(() => {
        const g = new THREE.CylinderGeometry(0.04, 0.04, 1, 5, 1);
        g.translate(0, 0.5, 0);
        const m = new THREE.Mesh(bakeVertexColor(g, 0x6a6a72), lit('wroughtIron'));
        group.add(m);
        return m;
      });
      swingChains.set(moverMeshes.length - 1, chains);
    }
    const mv: Mover = { spec, aabb: makeAabb(spec.x, spec.y - thick / 2, spec.z, spec.w, thick, spec.d), delta: new THREE.Vector3(), state: newPlatformState() };
    if (spec.slick) mv.aabb.slick = true;
    movers.push(mv);
    colliders.push(mv.aabb);
  }
  const breakThin = (x: number, z: number): boolean => {
    for (const m of movers) {
      if (!m.spec.thin || m.state.stage !== 'still' || x < m.aabb.min.x || x > m.aabb.max.x || z < m.aabb.min.z || z > m.aabb.max.z) continue;
      m.state.stage = 'shaking';
      m.state.stageTime = 1e3;
      return true;
    }
    return false;
  };
  const carry = new THREE.Vector3();
  const stepMovers = (dt: number, rider?: Rider): boolean => {
    carry.set(0, 0, 0);
    if (!movers.length) return false;
    let crushed = false;
    const r = TUNING.rat.radius;
    movers.forEach((m, i) => {
      const a = m.aabb;
      // (Whether he stood on it as this step began: a ride, a sink, a crumble and a spring answer to that.)
      const was = !!rider && Math.abs(rider.position.y - a.max.y) < 0.12 && rider.position.x > a.min.x - 0.05 && rider.position.x < a.max.x + 0.05 && rider.position.z > a.min.z - 0.05 && rider.position.z < a.max.z + 0.05;
      // (Thin ice does not feel him on his belly.)
      // (A bridge let down comes down when its catch is struck: its levers are on.)
      const let_go = m.spec.motion === 'drop' && leversOn(strikeThings, m.spec.levers ?? []);
      const now = platformStep(m.spec, m.state, dt, was && !(m.spec.thin && rider?.spread), TUNING.physics.gravity, let_go);
      const [ox, oy, oz] = now.offset;
      const thick = m.spec.thick ?? 0.5;
      const nx = m.spec.x + ox;
      const ny = m.spec.y + oy;
      const nz = m.spec.z + oz;
      const dx = nx - (a.min.x + a.max.x) / 2;
      const dy = ny - a.max.y;
      const dz = nz - (a.min.z + a.max.z) / 2;
      m.delta.set(dx, dy, dz);
      // He rides it if his feet are on its top and his middle is over it.
      let riding = false;
      if (rider) {
        const p = rider.position;
        riding = Math.abs(p.y - a.max.y) < 0.12 && p.x > a.min.x - 0.05 && p.x < a.max.x + 0.05 && p.z > a.min.z - 0.05 && p.z < a.max.z + 0.05;
      }
      // A crate, a pot or a rock standing on it goes with it (one set down on a moving platform does not hang in the
      // air when the platform goes: BACKLOG B3d, 2026-11-17). (One standing on THAT is not carried: nothing stacks
      // on a platform in the game's own rooms.)
      const onIt = crates.filter((c) => c.alive && !c.lifted && Math.abs(c.aabb.min.y - a.max.y) < 0.05 && c.x > a.min.x && c.x < a.max.x && c.z > a.min.z && c.z < a.max.z);
      a.min.set(nx - m.spec.w / 2, ny - thick, nz - m.spec.d / 2);
      a.max.set(nx + m.spec.w / 2, ny, nz + m.spec.d / 2);
      const mesh = moverMeshes[i];
      mesh.position.set(nx + now.shake[0], ny - thick / 2, nz + now.shake[1]);
      mesh.visible = now.shown;
      const chains = swingChains.get(i);
      if (chains) {
        // From each end of the platform (across the way it swings) up to the pivot over where it hangs still.
        const pivot = new THREE.Vector3(m.spec.x + m.spec.to[0], m.spec.y + m.spec.to[1], m.spec.z + m.spec.to[2]);
        const across = m.spec.along === 'z' ? new THREE.Vector3(m.spec.w / 2 - 0.15, 0, 0) : new THREE.Vector3(0, 0, m.spec.d / 2 - 0.15);
        chains.forEach((c, k) => {
          const end = new THREE.Vector3(nx, ny, nz).addScaledVector(across, k ? 1 : -1);
          const top = pivot.clone().addScaledVector(across, (k ? 1 : -1) * 0.4);
          const dir = top.clone().sub(end);
          c.position.copy(end);
          c.scale.set(1, dir.length(), 1);
          c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
        });
      }
      // (A spring squashes down from its top as it throws him.)
      mesh.scale.y = 1 - 0.45 * now.squash;
      mesh.position.y = ny - (thick * mesh.scale.y) / 2;
      if (!now.solid) {
        // Gone (a crumbled one): nothing there to stand on, until it comes back.
        a.min.set(nx, -1e4, nz);
        a.max.set(nx, -1e4 + 1e-3, nz);
        m.delta.set(0, 0, 0);
        return;
      }
      if (now.launch > 0 && rider?.velocity && was) {
        rider.velocity.y = now.launch;
        rider.position.y += 0.02;
        rider.prevPosition.y += 0.02;
      }
      for (const c of onIt) moveCrate(c, c.x + dx, c.y + dy, c.z + dz, (c.mesh as unknown as THREE.Object3D | null)?.rotation.y ?? 0);
      if (!rider) return;
      const p = rider.position;
      if (riding) {
        carry.set(dx / dt, dy / dt, dz / dt);
        p.x += dx; p.y += dy; p.z += dz;
        rider.prevPosition.x += dx; rider.prevPosition.y += dy; rider.prevPosition.z += dz;
      } else if (p.x + r > a.min.x && p.x - r < a.max.x && p.z + r > a.min.z && p.z - r < a.max.z && p.y < a.max.y - 0.02 && p.y + TUNING.rat.height > a.min.y + 0.02) {
        // It slid into him: if it came up under his feet it lifts him onto the top, otherwise it shoves him along.
        if (dy > 0 && a.max.y - p.y < 0.5) {
          rider.prevPosition.y += a.max.y - p.y;
          p.y = a.max.y;
        } else if (dy < -1e-6) {
          // (A crusher slamming down on him strikes him, as well as pushing him out.)
          if (now.falling) crushed = true;
          // It is coming down on him (a lift settling onto the floor he stands on): he is pushed out from under it,
          // the shortest way that is not into a wall, quickly but not in one jump.
          const exits: Array<[number, number]> = [[a.min.x - r - p.x, 0], [a.max.x + r - p.x, 0], [0, a.min.z - r - p.z], [0, a.max.z + r - p.z]];
          const free = exits.filter(([ex, ez]) => !colliders.some((b) => !movers.some((o) => o.aabb === b) && p.x + ex + r > b.min.x && p.x + ex - r < b.max.x && p.z + ez + r > b.min.z && p.z + ez - r < b.max.z && b.max.y > p.y + TUNING.physics.stepHeight && b.min.y < p.y + TUNING.rat.height));
          const [ex, ez] = (free.length ? free : exits).sort((u, v) => Math.hypot(u[0], u[1]) - Math.hypot(v[0], v[1]))[0];
          const need = Math.hypot(ex, ez);
          // (A crusher slamming down puts him out at once: left to the controller he would be shoved out the nearest
          // way, wall or no wall.)
          const go = Math.min(need + 0.01, now.falling ? need + 0.01 : 7 * dt) / Math.max(1e-6, need);
          p.x += ex * go; p.z += ez * go;
          rider.prevPosition.x += ex * go; rider.prevPosition.z += ez * go;
        } else {
          p.x += dx; p.z += dz;
          rider.prevPosition.x += dx; rider.prevPosition.z += dz;
        }
      }
    });
    // THIN ICE CRACKS SPREAD: a pane that has gone starts the panes beside it going (so feet that broke one cannot
    // outrun the breaking: the whole lid goes, pane by pane, outward from where he trod).
    for (const m of movers) {
      if (!m.spec.thin || (m.state.stage !== 'falling' && m.state.stage !== 'gone')) continue;
      for (const o of movers) {
        if (!o.spec.thin || o.state.stage !== 'still') continue;
        if (Math.abs(o.spec.x - m.spec.x) <= (o.spec.w + m.spec.w) / 2 + 0.05 && Math.abs(o.spec.z - m.spec.z) <= (o.spec.d + m.spec.d) / 2 + 0.05) {
          o.state.stage = 'shaking';
          o.state.stageTime = 0;
        }
      }
    }
    return crushed;
  };

  // ---- The ceiling: over everything inside the outer walls; and the walls carried on up to it where it is higher. ----
  const ceiling = ceilingOf(layout.solids as Box[]);
  if (ceiling) {
    const skin = (ceiling.skin ?? DEFAULT_SKIN.wall) as TextureName;
    const tile = TILE[skin] ?? 2;
    const w = ceiling.x1 - ceiling.x0;
    const d = ceiling.z1 - ceiling.z0;
    const cx = (ceiling.x0 + ceiling.x1) / 2;
    const cz = (ceiling.z0 + ceiling.z1) / 2;
    const cuts = (len: number): number => Math.min(32, Math.max(1, Math.ceil(len / 3)));
    // (Seen from underneath only: from above, as in the level builder, it is not there.)
    const roof = new THREE.PlaneGeometry(w, d, cuts(w), cuts(d));
    roof.rotateX(Math.PI / 2);
    roof.translate(cx, ceiling.y, cz);
    applyWorldUvs(roof, tile);
    bakeVertexColor(roof, 0x9c9c92, false);
    addMesh(roof, mat(skin), 0, 0, 0);
    const band = ceiling.y - ceiling.wallTop;
    if (band > 0.05) {
      const side = (len: number, x: number, z: number, yaw: number): void => {
        const g = new THREE.PlaneGeometry(len, band, cuts(len), Math.max(1, Math.ceil(band / 3)));
        g.rotateY(yaw);
        g.translate(x, ceiling.wallTop + band / 2, z);
        applyWorldUvs(g, tile);
        bakeVertexColor(g, 0xb4b4aa, false);
        addMesh(g, mat(skin), 0, 0, 0);
      };
      side(w, cx, ceiling.z0, 0);
      side(w, cx, ceiling.z1, Math.PI);
      side(d, ceiling.x0, cz, Math.PI / 2);
      side(d, ceiling.x1, cz, -Math.PI / 2);
    }
  }
  /**
   * How an end of a string of lights at (x, y, z) is held: 0 if it is at a wall (made fast to it), otherwise how far
   * up it is to what it hangs from.
   */
  const bulbHang = (x: number, y: number, z: number): number => {
    const AT = 0.6;
    for (const b of colliders) if (b.max.y > y && b.min.y < y && x > b.min.x - AT && x < b.max.x + AT && z > b.min.z - AT && z < b.max.z + AT) return 0;
    return Math.max(0, roofOver(x, y, z) - y);
  };
  /** What a hanging thing at (x, y, z) hangs from: the underside of whatever is over it, or the ceiling. */
  const roofOver = (x: number, y: number, z: number): number => {
    let best = ceiling ? ceiling.y : y + 8;
    for (const b of colliders) if (b.min.y > y && b.min.y < best && x > b.min.x && x < b.max.x && z > b.min.z && z < b.max.z) best = b.min.y;
    return best;
  };

  // ---- Decor: drawn only. ----
  const falls: THREE.Mesh[] = [];
  const cones: Array<{ mesh: THREE.Mesh; base: number; dz: number }> = [];
  /** Everything that gives off coloured light: lamps, braziers and beacons. */
  const lightDefs: Array<{ x: number; y: number; z: number; r: number; color: THREE.Color; power: number; flash: number; flicker: number; phase: number }> = [];
  /** The bright and dim bulb of each flashing beacon, shown by turns. */
  const bulbs: Array<{ on: THREE.Mesh; off: THREE.Mesh; flash: number; phase: number }> = [];
  const flames: Array<{ mesh: THREE.Mesh; base: number; phase: number }> = [];
  /** Things that sway (banners, roots): a pivot that rocks about its own axis. */
  /** What a glowing mushroom's cap is made of: its own colours, unlit. */
  let mushroomGlow: THREE.MeshBasicMaterial | null = null;
  let mushroomStemMat: THREE.ShaderMaterial | null = null;
  let mossGlow: THREE.MeshBasicMaterial | null = null;
  /** A soft round glow, to hang in the air round a thing that shines: brightest at its middle, dying away to nothing at its rim. */
  let haloTex: THREE.DataTexture | null = null;
  const haloTexture = (): THREE.DataTexture => {
    if (!haloTex) {
      const S = 32;
      const data = new Uint8Array(S * S * 4);
      for (let j = 0; j < S; j++) {
        for (let i = 0; i < S; i++) {
          const r = Math.hypot(i - S / 2 + 0.5, j - S / 2 + 0.5) / (S / 2);
          const k = Math.max(0, 1 - r) ** 2.6;
          data.set([255 * k, 255 * k, 255 * k, 255], (j * S + i) * 4);
        }
      }
      haloTex = new THREE.DataTexture(data, S, S, THREE.RGBAFormat);
      haloTex.magFilter = THREE.NearestFilter;
      haloTex.minFilter = THREE.NearestFilter;
      haloTex.needsUpdate = true;
    }
    return haloTex;
  };
  /** A jet's puffs, and what each needs to be put in its place as time goes: see the `jet` decor. */
  const jets: Array<{ puffs: THREE.Sprite[]; from: THREE.Vector3; dir: THREE.Vector3; length: number; width: number; color: THREE.Color; every: number; on: number; delay: number }> = [];
  let iceMat: THREE.ShaderMaterial | null = null;
  /** A puff of gas: white, soft, thinning to nothing at its rim. */
  let puffTex: THREE.DataTexture | null = null;
  const puffTexture = (): THREE.DataTexture => {
    if (!puffTex) {
      const S = 32;
      const data = new Uint8Array(S * S * 4);
      for (let j = 0; j < S; j++) {
        for (let i = 0; i < S; i++) {
          const r = Math.hypot(i - S / 2 + 0.5, j - S / 2 + 0.5) / (S / 2);
          data.set([255, 255, 255, Math.round(255 * Math.max(0, 1 - r) ** 1.15)], (j * S + i) * 4);
        }
      }
      puffTex = new THREE.DataTexture(data, S, S, THREE.RGBAFormat);
      puffTex.magFilter = THREE.NearestFilter;
      puffTex.minFilter = THREE.NearestFilter;
      puffTex.needsUpdate = true;
    }
    return puffTex;
  };
  const halo = (x: number, y: number, z: number, size: number, color: THREE.Color, strength: number): void => {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTexture(), color: color.clone().multiplyScalar(strength), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    sprite.position.set(x, y, z);
    sprite.scale.set(size, size, 1);
    group.add(sprite);
  };
  const swayers: Array<{ obj: THREE.Object3D; axis: 'x' | 'z'; amount: number; speed: number; phase: number }> = [];
  /** Eyes in the dark: each pair is shut for a while of its `period`, and blinks once while open. */
  const blinkers: Array<{ obj: THREE.Object3D; period: number; phase: number }> = [];
  /** Gauge needles: they sit at a reading and tremble. */
  const needles: Array<{ obj: THREE.Object3D; base: number; phase: number }> = [];
  /** Story machinery that moves: each is called every frame with the time. */
  const animators: Array<(time: number) => void> = [];
  /** Music underfoot (world/musicFloor.ts): its pads, and how each is drawn. */
  const musicPads: MusicPad[] = [];
  const musicLooks: Array<{ body: THREE.Object3D; glow: THREE.MeshBasicMaterial; rest: number; was?: number }> = [];
  /** Things to hit (world/strikeables.ts): their states, looks and solids, in level order. */
  const strikeThings: Strikeable[] = [];
  const strikeLooks: BuiltStrike[] = [];
  const strikeSolids: Aabb[] = [];
  /** Hazards and helpers (world/hazards.ts), in level order, and their looks. */
  const hazardSpecs: HazardSpec[] = [];
  const hazardLooks: BuiltHazard[] = [];
  const allHazards = (layout.decor ?? []).filter((d): d is HazardSpec => d.kind === 'belt' || d.kind === 'blade' || d.kind === 'spikes' || d.kind === 'fan' || d.kind === 'flamejet' || d.kind === 'teslacoil' || d.kind === 'zapplate' || d.kind === 'floatzone' || d.kind === 'mud' || d.kind === 'launcher');
  /** Odds and ends that answer a thump near them (a matchbox's matches rattle): see `thump`. */
  const knockables: Array<{ what: JunkKind; x: number; y: number; z: number; yaw: number; knock: (strength: number, time: number, awayX: number, awayZ: number) => void }> = [];
  let clock = 0;
  const foam: Array<{ mesh: THREE.Mesh; phase: number }> = [];
  // Wall hangings are stood flat against their walls and kept clear of the floor first (see hangings.ts).
  // (The still dressing is noted as it is built, to be gathered at the end: see `gatherStill`.)
  const stillRoots: THREE.Object3D[] = [];
  for (const d of layout.decor ?? []) {
    const n0 = group.children.length;
    buildDecor(mount(d, colliders));
    if (STILL_KINDS.has(d.kind)) stillRoots.push(...group.children.slice(n0));
  }

  function buildDecor(d: Decor): void {
    if (d.kind === 'pipe') {
      const from = new THREE.Vector3(...d.a);
      const to = new THREE.Vector3(...d.b);
      const len = from.distanceTo(to);
      const parts: THREE.BufferGeometry[] = [tiled(new THREE.CylinderGeometry(d.r, d.r, len, 8, 1), Math.max(1, Math.round(d.r * 4)), Math.max(1, Math.round(len / 1.5)))];
      bakeVertexColor(parts[0], lifted(d.color ?? 0x8a5a3c, 0.15));
      // Bands every few units, like the joints of a real pipe.
      for (let t = 2; t < len; t += 5) {
        // (Proud of the pipe by more than a hair, however thin the pipe: a band a hair proud flickers through it.)
        const br = Math.max(d.r * 1.25, d.r + 0.04);
        const band = new THREE.CylinderGeometry(br, br, 0.25, 8, 1);
        band.translate(0, t - len / 2, 0);
        bakeVertexColor(band, lifted(0x4a3a30, 0.15));
        parts.push(band);
      }
      const m = new THREE.Mesh(mergeAll(parts), lit('tin'));
      m.position.copy(from).lerp(to, 0.5);
      m.quaternion.setFromUnitVectors(UP, to.clone().sub(from).normalize());
      group.add(m);
    } else if (d.kind === 'hole') {
      // A drain: a dark round mouth with bars across it and bricks laid round it, on a wall that faces `yaw` (see drain.ts).
      const drain = buildDrain(d.r, !!d.gap, plainMat, darkMat).group;
      drain.position.set(d.x, d.y, d.z);
      drain.rotation.y = d.yaw;
      group.add(drain);
    } else if (d.kind === 'mark') {
      // Flat chalky shapes a hair off the wall: a little sword, point down (deeper), inside a diamond.
      const mark = new THREE.Group();
      const s = d.size;
      const col = d.color ?? 0x8f9478;
      const piece = (g: THREE.BufferGeometry, x: number, y: number, rot = 0): void => {
        bakeVertexColor(g, col, false);
        const m = new THREE.Mesh(g, darkMat);
        m.position.set(x, y, 0);
        m.rotation.z = rot;
        mark.add(m);
      };
      if (d.glyph === 'crown') {
        // The royal mark: a band, three spikes standing on it, and a ring round the lot.
        piece(new THREE.RingGeometry(s * 0.9, s, 14), 0, 0);
        piece(new THREE.PlaneGeometry(s * 1.0, s * 0.16), 0, -s * 0.32);
        for (const sx of [-1, 0, 1]) {
          const h = sx === 0 ? s * 0.62 : s * 0.46;
          const spike = new THREE.CircleGeometry(1, 3, Math.PI / 2);
          spike.scale(s * 0.17, h * 0.67, 1); // a tall narrow triangle
          piece(spike, sx * s * 0.34, -s * 0.24 + h * 0.33);
          piece(new THREE.CircleGeometry(s * 0.07, 6), sx * s * 0.34, -s * 0.24 + h + s * 0.06); // a bead on its tip
        }
      } else {
      piece(new THREE.RingGeometry(s * 0.84, s, 4), 0, 0); // four sides: a diamond
      piece(new THREE.PlaneGeometry(s * 0.1, s * 1.15), 0, -s * 0.05); // the blade, point down
      piece(new THREE.PlaneGeometry(s * 0.5, s * 0.1), 0, s * 0.28); // the guard
      piece(new THREE.CircleGeometry(s * 0.1, 6), 0, s * 0.62); // the pommel
      }
      mark.position.set(d.x + Math.sin(d.yaw) * 0.03, d.y, d.z + Math.cos(d.yaw) * 0.03);
      mark.rotation.y = d.yaw;
      group.add(mark);
    } else if (d.kind === 'sign') {
      const board = signBoard(d.lines, d.w, d.h);
      board.position.set(d.x + Math.sin(d.yaw) * 0.04, d.y, d.z + Math.cos(d.yaw) * 0.04);
      board.rotation.y = d.yaw;
      group.add(board);
      if (d.post !== undefined) {
        // Standing in the open: a post under it, and a plain back to the board.
        const post = new THREE.BoxGeometry(0.14, d.y - d.post, 0.14);
        bakeVertexColor(post, 0x4a3320);
        const pm = new THREE.Mesh(post, plainMat);
        pm.position.set(d.x - Math.sin(d.yaw) * 0.05, (d.y + d.post) / 2, d.z - Math.cos(d.yaw) * 0.05);
        group.add(pm);
        const back = new THREE.PlaneGeometry(d.w, d.h);
        bakeVertexColor(back, 0x4a3320);
        const bm = new THREE.Mesh(back, plainMat);
        bm.position.set(d.x - Math.sin(d.yaw) * 0.01, d.y, d.z - Math.cos(d.yaw) * 0.01);
        bm.rotation.y = d.yaw + Math.PI;
        group.add(bm);
      }
    } else if (d.kind === 'ruler') {
      const strip = rulerStrip(d.length, d.width, !!d.pole);
      if (d.flat) {
        // Laid on the floor: its zero at x, z; it runs the way `yaw` points, and reads from its zero end.
        const lie = new THREE.Group();
        lie.position.set(d.x, d.y + 0.03, d.z);
        lie.rotation.y = d.yaw;
        strip.rotation.x = -Math.PI / 2;
        strip.rotation.z = Math.PI;
        lie.add(strip);
        group.add(lie);
      } else {
        strip.position.set(d.x + Math.sin(d.yaw) * 0.04, d.y, d.z + Math.cos(d.yaw) * 0.04);
        strip.rotation.y = d.yaw;
        group.add(strip);
      }
    } else if (d.kind === 'shelf') {
      const sh = new THREE.Group();
      const plank = (w: number, h: number, dp: number, x: number, y: number, color: number): void => {
        const g = new THREE.BoxGeometry(w, h, dp);
        bakeVertexColor(g, lifted(color, 0.6), false);
        const m = new THREE.Mesh(g, mat('planks'));
        m.position.set(x, y, 0.22);
        sh.add(m);
      };
      for (const sx of [-1, 1]) plank(0.12, d.height, 0.42, (sx * d.width) / 2, d.height / 2, 0x4a3320);
      const rows = Math.max(2, Math.round(d.height / 0.75));
      for (let i = 0; i <= rows; i++) plank(d.width, 0.07, 0.42, 0, 0.06 + (i * (d.height - 0.1)) / rows, i % 2 ? 0x6a4a2c : 0x5c4026);
      plank(d.width, d.height, 0.03, 0, d.height / 2, 0x241a12);
      sh.children[sh.children.length - 1].position.z = 0.02;
      sh.position.set(d.x, d.y, d.z);
      sh.rotation.y = d.yaw;
      group.add(sh);
    } else if (d.kind === 'grate') {
      const gr = new THREE.Group();
      const dark = new THREE.Mesh(new THREE.PlaneGeometry(d.size, d.size), new THREE.MeshBasicMaterial({ color: 0x020406 }));
      gr.add(dark);
      const glowDisc = new THREE.Mesh(new THREE.CircleGeometry(d.size * 0.32, 10), new THREE.MeshBasicMaterial({ color: 0x143c46 }));
      glowDisc.position.z = 0.004;
      gr.add(glowDisc);
      const core = new THREE.Mesh(new THREE.CircleGeometry(d.size * 0.13, 8), new THREE.MeshBasicMaterial({ color: 0x2f7480 }));
      core.position.z = 0.008;
      gr.add(core);
      for (let i = 0; i <= 5; i++) {
        const bar = new THREE.BoxGeometry(d.size, 0.06, 0.04);
        bakeVertexColor(bar, 0x2a2c30, false);
        const bm = new THREE.Mesh(bar, darkMat);
        bm.position.set(0, -d.size / 2 + (i * d.size) / 5, 0.02);
        gr.add(bm);
      }
      for (const sx of [-1, 1]) {
        const rim = new THREE.BoxGeometry(0.08, d.size + 0.08, 0.05);
        bakeVertexColor(rim, 0x2a2c30, false);
        const rm = new THREE.Mesh(rim, darkMat);
        rm.position.set((sx * d.size) / 2, 0, 0.02);
        gr.add(rm);
      }
      gr.rotation.x = -Math.PI / 2;
      gr.position.set(d.x, d.y + 0.02, d.z);
      group.add(gr);
    } else if (d.kind === 'engine') {
      // Lines of cold light far below, drawn without fog so they show through the dark like a city seen from a height.
      const eng = new THREE.Group();
      const lit = (color: number): THREE.MeshBasicMaterial => new THREE.MeshBasicMaterial({ color, fog: false });
      const dim = lit(0x12343c);
      const mid = lit(0x1d5560);
      const heartMat = lit(0x3f9aa6);
      for (const [r0, r1, m, seg] of [[0.93, 1, dim, 28], [0.62, 0.66, mid, 22], [0.36, 0.4, dim, 16], [0.15, 0.19, mid, 10]] as Array<[number, number, THREE.Material, number]>) {
        eng.add(new THREE.Mesh(new THREE.RingGeometry(d.r * r0, d.r * r1, seg), m));
      }
      for (let k = 0; k < 12; k++) {
        const spoke = new THREE.Mesh(new THREE.PlaneGeometry(d.r * 0.8, d.r * 0.012), dim);
        const a = (k / 12) * Math.PI * 2;
        spoke.position.set(Math.cos(a) * d.r * 0.56, Math.sin(a) * d.r * 0.56, 0);
        spoke.rotation.z = a;
        eng.add(spoke);
      }
      // Teeth round the great wheel.
      for (let k = 0; k < 28; k++) {
        const a = (k / 28) * Math.PI * 2;
        const tooth = new THREE.Mesh(new THREE.PlaneGeometry(d.r * 0.07, d.r * 0.05), dim);
        tooth.position.set(Math.cos(a) * d.r * 1.03, Math.sin(a) * d.r * 1.03, 0);
        tooth.rotation.z = a;
        eng.add(tooth);
      }
      const heart = new THREE.Mesh(new THREE.CircleGeometry(d.r * 0.1, 10), heartMat);
      heart.position.z = 0.05;
      eng.add(heart);
      // The kingdom's lamps: small warm points scattered round the engine.
      const lampMat = lit(0xc8963c);
      let sd = 7;
      const rnd = (): number => ((sd = (sd * 16807) % 2147483647) / 2147483647);
      const lamps: THREE.Mesh[] = [];
      for (let k = 0; k < 46; k++) {
        const a = rnd() * Math.PI * 2;
        const rr = d.r * (1.15 + rnd() * 1.1);
        const lm = new THREE.Mesh(new THREE.PlaneGeometry(d.r * 0.02, d.r * 0.02), lampMat);
        lm.position.set(Math.cos(a) * rr, Math.sin(a) * rr, 0.02 + rnd() * 3);
        eng.add(lm);
        lamps.push(lm);
      }
      // The pulse: a ring of brighter light that runs outward from the heart every few seconds.
      const pulseMat = new THREE.MeshBasicMaterial({ color: 0x8fe0e8, fog: false, transparent: true, opacity: 0 });
      const pulse = new THREE.Mesh(new THREE.RingGeometry(0.93, 1, 28), pulseMat);
      pulse.position.z = 0.1;
      eng.add(pulse);
      eng.rotation.x = -Math.PI / 2;
      eng.position.set(d.x, d.y, d.z);
      group.add(eng);
      animators.push((time) => {
        const p = storyPower.value;
        const ph = (time % 4.5) / 1.8;
        pulse.visible = ph < 1 && p > 0.5;
        pulse.scale.setScalar(Math.max(0.01, ph) * d.r);
        pulseMat.opacity = 0.7 * (1 - ph) * p;
        heartMat.color.setHex(0x3f9aa6).multiplyScalar(p * (0.85 + 0.15 * Math.sin(time * 2.3)));
        lampMat.color.setHex(0xc8963c).multiplyScalar(0.25 + 0.75 * p);
        eng.rotation.z = 0; // the wheel itself is too vast to be seen turning
      });
    } else if (d.kind === 'machine') {
      const mc = new THREE.Group();
      const part = (g: THREE.BufferGeometry, color: number, x: number, y: number, z: number): THREE.Mesh => {
        bakeVertexColor(g, color, false);
        const m = new THREE.Mesh(g, darkMat);
        m.position.set(x, y, z);
        mc.add(m);
        return m;
      };
      part(new THREE.BoxGeometry(3.4, 3.2, 1.3, 3, 3, 1), 0x3a3d44, 0, 1.6, 0.65); // the body
      part(new THREE.BoxGeometry(3.8, 0.3, 1.6), 0x24262b, 0, 0.15, 0.8); // its footing
      part(new THREE.BoxGeometry(3.6, 0.22, 1.45), 0x55452e, 0, 3.3, 0.72); // a brass band round the top
      const boiler = part(new THREE.CylinderGeometry(0.8, 0.8, 2.2, 8), 0x4a4038, -0.4, 4.4, 0.8); // the boiler on top
      boiler.rotation.z = Math.PI / 2;
      for (const px of [-1.2, 1.3]) part(new THREE.CylinderGeometry(0.22, 0.22, 9, 6), 0x6a6a72, px, 8.5, 0.5); // pipes up into the dark
      // The hopper the cheese goes into, with a wedge on its lip.
      const hopper = part(new THREE.CylinderGeometry(0.7, 0.3, 0.8, 4, 1, true), 0x55452e, 1.05, 2.0, 1.75);
      hopper.rotation.y = Math.PI / 4;
      const cheese = part(new THREE.CylinderGeometry(0.3, 0.3, 0.22, 3, 1, false, 0, Math.PI * 0.7), 0xe8b93a, 1.05, 2.5, 1.75);
      // The wheel on its face, and the window with the cold light of the engine behind it.
      const wheel = new THREE.Group();
      wheel.position.set(-0.75, 1.75, 1.33);
      mc.add(wheel);
      const rimG = new THREE.RingGeometry(0.55, 0.7, 10);
      bakeVertexColor(rimG, 0x7a6a44, false);
      wheel.add(new THREE.Mesh(rimG, darkMat));
      for (let k = 0; k < 4; k++) {
        const sp = new THREE.PlaneGeometry(1.2, 0.09);
        bakeVertexColor(sp, 0x7a6a44, false);
        const sm = new THREE.Mesh(sp, darkMat);
        sm.rotation.z = (k / 4) * Math.PI;
        wheel.add(sm);
      }
      const winMat = new THREE.MeshBasicMaterial({ color: 0x4fb4c0 });
      const win = new THREE.Mesh(new THREE.CircleGeometry(0.32, 8), winMat);
      win.position.set(0.7, 1.0, 1.31);
      mc.add(win);
      const frameG = new THREE.RingGeometry(0.32, 0.42, 8);
      bakeVertexColor(frameG, 0x55452e, false);
      const frame = new THREE.Mesh(frameG, darkMat);
      frame.position.set(0.7, 1.0, 1.32);
      mc.add(frame);
      mc.position.set(d.x, d.y, d.z);
      mc.rotation.y = d.yaw;
      group.add(mc);
      let spin = 0;
      let last = -1;
      animators.push((time) => {
        const p = storyPower.value;
        const dtm = last < 0 ? 0 : Math.min(0.1, Math.max(0, time - last));
        last = time;
        spin += dtm * 2.4 * p;
        wheel.rotation.z = -spin;
        winMat.color.setHex(0x4fb4c0).multiplyScalar(p * (0.8 + 0.2 * Math.sin(time * 7)));
        // The wedge slides down into the hopper and another takes its place.
        const c = (spin * 0.35) % 1;
        cheese.position.y = 2.5 - 0.5 * c;
        cheese.scale.setScalar(1 - 0.6 * c);
        // Stalled, the whole thing shudders.
        mc.position.x = d.x + (p < 0.5 ? Math.sin(time * 61) * 0.025 : 0);
        mc.position.y = d.y + (p < 0.5 ? Math.sin(time * 47) * 0.02 : 0);
      });
    } else if (d.kind === 'portrait') {
      // A dark painting gone dull with age: a pale-eyed mouse head under a spiked crown. One flat picture (see portraitTexture.ts).
      const pt = new THREE.Group();
      const s = d.size;
      const canvas = new THREE.PlaneGeometry(s * PORTRAIT_ASPECT.w, s * PORTRAIT_ASPECT.h);
      bakeVertexColor(canvas, 0xffffff, false);
      pt.add(new THREE.Mesh(canvas, portraitMat()));
      pt.position.set(d.x + Math.sin(d.yaw) * 0.06, d.y, d.z + Math.cos(d.yaw) * 0.06);
      pt.rotation.y = d.yaw;
      group.add(pt);
    } else if (d.kind === 'lamp') {
      // A lantern hung by a rod from whatever is over it: an iron cap and frame round panes of warm light.
      // (It used to be a bright block floating in the air, hung from nothing.)
      const iron = 0x2c2c32;
      const parts: THREE.BufferGeometry[] = [];
      const piece = (g: THREE.BufferGeometry, x: number, y: number, z: number): void => {
        g.translate(x, y, z);
        parts.push(g);
      };
      const top = roofOver(d.x, d.y + 0.6, d.z);
      const rod = new THREE.BoxGeometry(0.05, Math.max(0.05, top - (d.y + 0.52)), 0.05);
      piece(rod, 0, (top + d.y + 0.52) / 2 - d.y, 0);
      piece(new THREE.BoxGeometry(0.22, 0.05, 0.22), 0, top - d.y - 0.025, 0); // the plate it is fixed to
      const ring = new THREE.TorusGeometry(0.07, 0.02, 4, 6);
      piece(ring, 0, 0.48, 0);
      const cap = new THREE.ConeGeometry(0.4, 0.22, 4, 1);
      cap.rotateY(Math.PI / 4);
      piece(cap, 0, 0.33, 0);
      piece(new THREE.BoxGeometry(0.56, 0.05, 0.56), 0, 0.2, 0); // the cap's brim
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) piece(new THREE.BoxGeometry(0.05, 0.42, 0.05), sx * 0.22, -0.02, sz * 0.22);
      piece(new THREE.BoxGeometry(0.52, 0.06, 0.52), 0, -0.25, 0); // the floor of it
      piece(new THREE.BoxGeometry(0.1, 0.1, 0.1), 0, -0.32, 0); // a knob underneath
      addMesh(bakeVertexColor(mergeAll(parts), lifted(iron, 0.45)), lit('wroughtIron'), d.x, d.y, d.z);
      // The light itself: the panes, a little inside the frame.
      const panes = new THREE.BoxGeometry(0.4, 0.4, 0.4);
      bakeVertexColor(panes, 0xfff0b0, false);
      addMesh(panes, darkMat, d.x, d.y - 0.02, d.z);
      lightDefs.push({ x: d.x, y: d.y - 0.5, z: d.z, r: 10, color: new THREE.Color(0xffc860), power: 0.8, flash: 0, flicker: 0.06, phase: d.x * 1.3 + d.z });
    } else if (d.kind === 'light') {
      // A little post with a bulb on top; it glows in its colour, and flashes if it is a warning light.
      // (A bare one is only its light.)
      if (!d.bare) {
        const post = new THREE.BoxGeometry(0.16, 0.5, 0.16);
        bakeVertexColor(post, lifted(0x3a3a42, 0.45));
        addMesh(post, lit('wroughtIron'), d.x, d.y + 0.25, d.z);
        const cap = new THREE.BoxGeometry(0.34, 0.1, 0.34);
        bakeVertexColor(cap, lifted(0x4a4a54, 0.45));
        addMesh(cap, lit('wroughtIron'), d.x, d.y + 0.53, d.z);
        const bright = new THREE.CylinderGeometry(0.15, 0.17, 0.3, 7, 1);
        bakeVertexColor(bright, d.color, false);
        const dim = new THREE.CylinderGeometry(0.15, 0.17, 0.3, 7, 1);
        bakeVertexColor(dim, new THREE.Color(d.color).multiplyScalar(0.25), false);
        const onM = addMesh(bright, darkMat, d.x, d.y + 0.73, d.z);
        const offM = addMesh(dim, darkMat, d.x, d.y + 0.73, d.z);
        offM.visible = d.flash > 0;
        if (d.flash > 0) bulbs.push({ on: onM, off: offM, flash: d.flash, phase: d.x * 0.7 + d.z * 0.3 });
      }
      lightDefs.push({ x: d.x, y: d.y + 0.9, z: d.z, r: 11, color: new THREE.Color(d.color), power: 1, flash: d.flash, flicker: 0, phase: d.x * 0.7 + d.z * 0.3 });
    } else if (d.kind === 'web') {
      // Spokes and rings of thin pale thread, on a wall facing yaw.
      const pts: number[] = [];
      const spokes = 8;
      const rings = [0.32, 0.62, 1];
      for (let k = 0; k < spokes; k++) {
        const a = (k / spokes) * Math.PI * 2;
        pts.push(0, 0, 0, Math.cos(a) * d.r, Math.sin(a) * d.r, 0);
      }
      for (const rr of rings) {
        for (let k = 0; k < spokes; k++) {
          const a0 = (k / spokes) * Math.PI * 2;
          const a1 = ((k + 1) / spokes) * Math.PI * 2;
          // Threads sag a little between the spokes.
          const sag = 0.82;
          pts.push(Math.cos(a0) * d.r * rr, Math.sin(a0) * d.r * rr, 0, Math.cos((a0 + a1) / 2) * d.r * rr * sag, Math.sin((a0 + a1) / 2) * d.r * rr * sag, 0);
          pts.push(Math.cos((a0 + a1) / 2) * d.r * rr * sag, Math.sin((a0 + a1) / 2) * d.r * rr * sag, 0, Math.cos(a1) * d.r * rr, Math.sin(a1) * d.r * rr, 0);
        }
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
      const web = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0xd8d8cc, fog: false }));
      web.position.set(d.x, d.y, d.z);
      web.rotation.y = d.yaw;
      group.add(web);
    } else if (d.kind === 'brazier') {
      // A fire bowl on its stand (brazierModel.ts): stone foot, iron stem and bowl, burnt inside, coals, the fire.
      const b = buildBrazier({ stone: mat('cutStone'), iron: ironMat(), char: charMat(), coals: coalMat(), flame: darkMat });
      b.group.position.set(d.x, d.y, d.z);
      // (Each stands turned a little differently, so a row of them does not look stamped out.)
      b.group.rotation.y = (d.x * 1.3 + d.z * 0.7) % (Math.PI * 2);
      group.add(b.group);
      const phase = d.x * 3.1 + d.z * 1.7;
      for (const f of b.flames) flames.push({ mesh: f.mesh, base: f.base, phase: phase + f.phase });
      lightDefs.push({ x: d.x, y: d.y + 1.6, z: d.z, r: 9, color: new THREE.Color(0xff8a30), power: 0.95, flash: 0, flicker: 0.2, phase });
    } else if (d.kind === 'banner') {
      // Hung from a rod; the cloth is a swallow-tailed shape, gold trim down each side and a gold diamond in the middle.
      const pivot = new THREE.Group();
      pivot.position.set(d.x + Math.sin(d.yaw) * 0.12, d.top, d.z + Math.cos(d.yaw) * 0.12);
      pivot.rotation.y = d.yaw;
      group.add(pivot);
      const rod = new THREE.CylinderGeometry(0.05, 0.05, d.w + 0.5, 5, 1);
      rod.rotateZ(Math.PI / 2);
      bakeVertexColor(rod, lifted(0x6b5a3a));
      pivot.add(new THREE.Mesh(rod, lit('ashWood')));
      // (Its gold, knobs, trim and diamond, all one mesh, 2026-11-19: it was five, in each of the Hall's thirty banners.)
      const gold: THREE.BufferGeometry[] = [];
      for (const s of [-1, 1]) {
        const knob = new THREE.SphereGeometry(0.09, 5, 4);
        bakeVertexColor(knob, 0xc9a23a);
        gold.push(knob.translate(s * (d.w / 2 + 0.25), 0, 0));
      }
      const shape = new THREE.Shape();
      const hw = d.w / 2;
      shape.moveTo(-hw, 0);
      shape.lineTo(hw, 0);
      shape.lineTo(hw, -d.h);
      shape.lineTo(0, -d.h + d.w * 0.45);
      shape.lineTo(-hw, -d.h);
      shape.closePath();
      const cloth = new THREE.ShapeGeometry(shape);
      bakeVertexColor(cloth, d.color);
      pivot.add(new THREE.Mesh(cloth, clothMat));
      for (const s of [-1, 1]) {
        const trim = new THREE.PlaneGeometry(d.w * 0.08, d.h * 0.86);
        bakeVertexColor(trim, 0xc9a23a);
        gold.push(trim.translate(s * hw * 0.78, -d.h * 0.43, 0.01));
      }
      const diamond = new THREE.PlaneGeometry(d.w * 0.34, d.w * 0.34);
      diamond.rotateZ(Math.PI / 4);
      bakeVertexColor(diamond, 0xe3b93f);
      gold.push(diamond.translate(0, -d.h * 0.4, 0.015));
      pivot.add(new THREE.Mesh(mergeAll(gold), plainMat));
      swayers.push({ obj: pivot, axis: 'x', amount: 0.035, speed: 0.9, phase: d.x * 0.7 + d.z * 1.3 });
    } else if (d.kind === 'torch') {
      // An iron bracket out from the wall, a stick tilted out, and the flame.
      const out = (k: number): [number, number] => [d.x + Math.sin(d.yaw) * k, d.z + Math.cos(d.yaw) * k];
      const plate = new THREE.BoxGeometry(0.28, 0.4, 0.06);
      bakeVertexColor(plate, 0xbfbcc4);
      const [px, pz] = out(0.04);
      const pm = addMesh(plate, lit('wroughtIron'), px, d.y - 0.1, pz);
      pm.rotation.y = d.yaw;
      const arm = new THREE.BoxGeometry(0.08, 0.08, 0.36);
      bakeVertexColor(arm, 0xc8c4cc);
      const [ax, az] = out(0.2);
      const am = addMesh(arm, lit('wroughtIron'), ax, d.y - 0.1, az);
      am.rotation.y = d.yaw;
      const stick = new THREE.CylinderGeometry(0.06, 0.045, 0.6, 5, 1);
      bakeVertexColor(stick, lifted(0x5a4028));
      const [sx, sz] = out(0.36);
      const sm = addMesh(stick, lit('ashWood'), sx, d.y + 0.15, sz);
      sm.rotation.set(Math.cos(d.yaw) * 0.25, 0, -Math.sin(d.yaw) * 0.25);
      const flame = new THREE.ConeGeometry(0.17, 0.5, 6, 1);
      bakeVertexColor(flame, 0xffb030, false);
      const col = flame.attributes.color;
      for (let i = 0; i < col.count; i++) {
        const top = flame.attributes.position.getY(i) > 0.1;
        col.setXYZ(i, 1, top ? 0.95 : 0.5, top ? 0.45 : 0.08);
      }
      const [fx, fz] = out(0.44);
      const fm = addMesh(flame, darkMat, fx, d.y + 0.65, fz);
      flames.push({ mesh: fm, base: d.y + 0.65, phase: d.x * 2.3 + d.z * 1.1 });
      lightDefs.push({ x: fx, y: d.y + 0.8, z: fz, r: 8, color: new THREE.Color(0xff9a40), power: 0.85, flash: 0, flicker: 0.25, phase: d.x * 2.3 + d.z * 1.1 });
    } else if (d.kind === 'gauge') {
      // A brass rim, a pale face with a red zone, and a needle that shivers round its reading.
      const g = new THREE.Group();
      g.position.set(d.x + Math.sin(d.yaw) * 0.08, d.y, d.z + Math.cos(d.yaw) * 0.08);
      g.rotation.y = d.yaw;
      group.add(g);
      const rim = new THREE.CylinderGeometry(d.r / 2, d.r / 2, 0.12, 10, 1);
      rim.rotateX(Math.PI / 2);
      bakeVertexColor(rim, lifted(0xb08a3a, 0.3));
      g.add(new THREE.Mesh(rim, lit('tin')));
      const face = new THREE.CircleGeometry(d.r * 0.42, 10);
      bakeVertexColor(face, 0xe8e2c8, false);
      const fm = new THREE.Mesh(face, darkMat);
      fm.position.z = 0.065;
      g.add(fm);
      const red = new THREE.CircleGeometry(d.r * 0.42, 6, -0.2, 0.9);
      bakeVertexColor(red, 0xc03a2a, false);
      const rm = new THREE.Mesh(red, darkMat);
      rm.position.z = 0.068;
      g.add(rm);
      const needleG = new THREE.Group();
      needleG.position.z = 0.075;
      const needle = new THREE.BoxGeometry(0.03, d.r * 0.36, 0.01);
      needle.translate(0, d.r * 0.16, 0);
      bakeVertexColor(needle, 0x1a1a1a, false);
      needleG.add(new THREE.Mesh(needle, darkMat));
      g.add(needleG);
      const stub = new THREE.CylinderGeometry(0.06, 0.06, d.r * 0.5, 6, 1);
      stub.translate(0, -d.r * 0.5, -0.02);
      bakeVertexColor(stub, 0x6a6a72);
      g.add(new THREE.Mesh(stub, plainMat));
      needles.push({ obj: needleG, base: 0.9 - ((d.x * 7 + d.z * 3) % 1.4), phase: d.x + d.z * 2 });
    } else if (d.kind === 'planet') {
      // A ball in bands of two colours, a few flat faces a band, lit of itself; and its ring, if it has one. It
      // turns slowly (see `update`).
      const a = new THREE.Color(d.color);
      const b2 = new THREE.Color(d.band);
      const ball = new THREE.SphereGeometry(d.r, 10, 7).toNonIndexed();
      const pos = ball.attributes.position;
      const col = new Float32Array(pos.count * 3);
      for (let i = 0; i < pos.count; i += 3) {
        // (Each face one colour, by how high its middle is: bands; darker toward the far side from the "sun".)
        const my = (pos.getY(i) + pos.getY(i + 1) + pos.getY(i + 2)) / 3 / d.r;
        const mx = (pos.getX(i) + pos.getX(i + 1) + pos.getX(i + 2)) / 3 / d.r;
        const c = (Math.floor((my + 1) * 3.5) % 2 === 0 ? a : b2).clone().multiplyScalar(0.72 + 0.28 * mx);
        for (let k = 0; k < 3; k++) col.set([c.r, c.g, c.b], (i + k) * 3);
      }
      ball.setAttribute('color', new THREE.BufferAttribute(col, 3));
      const globe = new THREE.Group();
      globe.position.set(d.x, d.y, d.z);
      globe.rotation.z = d.tilt ?? 0.3;
      const body = new THREE.Mesh(ball, skyMat);
      globe.add(body);
      if (d.ring) {
        const ring = new THREE.RingGeometry(d.r * 1.25, d.r * d.ring.out, 20, 1);
        ring.rotateX(-Math.PI / 2);
        bakeVertexColor(ring, d.ring.color, false);
        globe.add(new THREE.Mesh(ring, skyMatBoth));
      }
      group.add(globe);
      spinners.push({ o: body, rate: 0.05 + 0.03 * ((d.x * 7 + d.z * 3) % 5) / 5 });
    } else if (d.kind === 'lightrail') {
      // A light rail: a thin tube along the very line that is ridden (world/rails.ts), in bands of the rainbow, lit of
      // itself; and three bright beads that run down it the way he will go, so that it is seen to be a thing that
      // carries, and which way.
      const c = railCurve(d);
      const SIDES = 6;
      const R = RAIL_TUBE.r;
      // (Its middle is this far under the line he rides, straight down from it across the rail: its top is under his shield.)
      const DOWN = RAIL_TUBE.r + RAIL_TUBE.under;
      const n = c.s.length;
      const pos = new Float32Array(n * SIDES * 3);
      const col = new Float32Array(n * SIDES * 3);
      const BANDS = [0xff3b6b, 0xff9a2a, 0xffe84a, 0x4dff8a, 0x3ad8ff, 0x9a6bff];
      const tint = new THREE.Color();
      for (let i = 0; i < n; i++) {
        const q = railAt(c, c.s[i]);
        // (Round the way it goes: across the ground, and up.)
        const k = 1 / Math.sqrt(1 + q.slope * q.slope);
        const ux = -q.tx * q.slope * k, uy = k, uz = -q.tz * q.slope * k;
        tint.setHex(BANDS[Math.floor(c.s[i] / 0.9) % BANDS.length]);
        for (let j = 0; j < SIDES; j++) {
          const a2 = (j / SIDES) * Math.PI * 2;
          const o = (i * SIDES + j) * 3;
          pos[o] = c.x[i] - ux * DOWN + (q.tz * Math.cos(a2) + ux * Math.sin(a2)) * R;
          pos[o + 1] = c.y[i] - uy * DOWN + uy * Math.sin(a2) * R;
          pos[o + 2] = c.z[i] - uz * DOWN + (-q.tx * Math.cos(a2) + uz * Math.sin(a2)) * R;
          col.set([tint.r, tint.g, tint.b], o);
        }
      }
      const idx: number[] = [];
      for (let i = 0; i < n - 1; i++) for (let j = 0; j < SIDES; j++) {
        const a2 = i * SIDES + j, b2 = i * SIDES + ((j + 1) % SIDES);
        idx.push(a2, b2, a2 + SIDES, b2, b2 + SIDES, a2 + SIDES);
      }
      const tube = new THREE.BufferGeometry();
      tube.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      tube.setAttribute('color', new THREE.BufferAttribute(col, 3));
      tube.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * SIDES * 2), 2));
      tube.setIndex(idx);
      tube.computeVertexNormals();
      group.add(new THREE.Mesh(tube.toNonIndexed(), skyMatBoth));
      const bead = new THREE.OctahedronGeometry(0.26, 0);
      bakeVertexColor(bead, 0xffffff, false);
      for (let b = 0; b < 3; b++) {
        const m = new THREE.Mesh(bead, skyMat);
        group.add(m);
        railBeads.push({ o: m, c, at: b / 3 });
      }
    } else if (d.kind === 'flowers') {
      // A bed of flowers. The turf lies on the floor (painted on after it, as a rug is); each flower is a thin green
      // stem with one leaf and a flat five-petalled head tipped toward the sky, a dot in its middle. They nod.
      const rnd = ((): (() => number) => {
        let a = (d.seed ?? 1) * 9301 + Math.floor(d.x * 31 + d.z * 17) + 49297;
        return () => ((a = (a * 233280 + 49297) % 2147483647) / 2147483647);
      })();
      const turf = new THREE.PlaneGeometry(d.w, d.d, 1, 1);
      turf.rotateX(-Math.PI / 2);
      bakeVertexColor(turf, 0x2fa84a, false);
      const pm = (petalMat ??= createPs1Material({ side: THREE.DoubleSide }));
      const lawn = addMesh(turf, pm, d.x, d.y + 0.02, d.z);
      asDecal(lawn, 1);
      const LOUD = [0xff5ab4, 0xffe84a, 0x3ad8ff, 0xffffff, 0xff8a2a, 0xbfa0ff, 0xff3a5a];
      const n = Math.max(6, Math.round(d.w * d.d * 2.6));
      for (let i = 0; i < n; i++) {
        const fx = d.x + (rnd() - 0.5) * (d.w - 0.3);
        const fz = d.z + (rnd() - 0.5) * (d.d - 0.3);
        const tall = 0.28 + rnd() * 0.3;
        const col = LOUD[Math.floor(rnd() * LOUD.length)];
        const heart = col === 0xffe84a ? 0xff8a2a : 0xffe84a;
        const flower = new THREE.Group();
        flower.position.set(fx, d.y + 0.02, fz);
        flower.rotation.y = rnd() * Math.PI * 2;
        const stem = new THREE.BoxGeometry(0.025, tall, 0.025);
        stem.translate(0, tall / 2, 0);
        bakeVertexColor(stem, 0x1f8a3a, false);
        const leaf = new THREE.ConeGeometry(0.05, 0.16, 3);
        leaf.rotateZ(-1.1);
        leaf.translate(0.08, tall * 0.42, 0);
        bakeVertexColor(leaf, 0x3ac85a, false);
        // (2026-11-19: the four parts, stem, leaf, petals and middle, are one mesh: a quarter of the draw calls, the same flower.)
        const head = new THREE.Object3D();
        head.position.y = tall;
        head.rotation.x = -0.5;
        const R = 0.085 + rnd() * 0.04;
        const petals = new THREE.CircleGeometry(R, 5);
        bakeVertexColor(petals, col, false);
        // (Its middle is a darker shade of itself, so the five petals show.)
        const pc = petals.attributes.color as THREE.BufferAttribute;
        const dark = new THREE.Color(col).multiplyScalar(0.72);
        pc.setXYZ(0, dark.r, dark.g, dark.b);
        const eye = new THREE.CircleGeometry(R * 0.36, 5);
        eye.translate(0, 0, 0.004);
        bakeVertexColor(eye, heart, false);
        // (A flower's face is to the sky and a little toward wherever it leans.)
        head.rotateX(-Math.PI / 2 + 0.5);
        head.updateMatrix();
        petals.applyMatrix4(head.matrix);
        eye.applyMatrix4(head.matrix);
        flower.add(new THREE.Mesh(mergeAll([stem, leaf, petals, eye]), pm));
        group.add(flower);
        nodders.push({ o: flower, phase: rnd() * 6.3, lean: 0.06 + rnd() * 0.07 });
      }
    } else if (d.kind === 'butterflies') {
      // Butterflies: two wings each, a pair of colours of its own, wandering about the place and never still.
      const pm = (petalMat ??= createPs1Material({ side: THREE.DoubleSide }));
      const PAIRS: Array<[number, number]> = [[0xff5ab4, 0xffe84a], [0x3ad8ff, 0xffffff], [0xbfa0ff, 0xff5ab4], [0xffe84a, 0xff8a2a], [0x5aff8a, 0x3ad8ff]];
      for (let i = 0; i < d.count; i++) {
        const [a, b] = PAIRS[(i + Math.floor(Math.abs(d.x * 3 + d.z))) % PAIRS.length];
        const fly = new THREE.Group();
        const wings: THREE.Object3D[] = [];
        for (const side of [-1, 1]) {
          const wing = new THREE.BufferGeometry();
          // (A wing: a big upper part and a small lower one, hinged along the body.)
          wing.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0.07, side * 0.13, 0, 0.11, side * 0.1, 0, -0.01, 0, 0, 0.07, side * 0.1, 0, -0.01, 0, 0, -0.06, 0, 0, -0.06, side * 0.1, 0, -0.01, side * 0.07, 0, -0.1]), 3));
          const ca = new THREE.Color(a);
          const cb = new THREE.Color(b);
          wing.setAttribute('color', new THREE.BufferAttribute(new Float32Array([ca, cb, ca, ca, ca, cb, cb, ca, cb].flatMap((q) => [q.r, q.g, q.b])), 3));
          wing.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(18), 2));
          const m = new THREE.Mesh(wing, pm);
          fly.add(m);
          wings.push(m);
        }
        const body = new THREE.BoxGeometry(0.018, 0.018, 0.15);
        bakeVertexColor(body, 0x1a1420, false);
        fly.add(new THREE.Mesh(body, pm));
        group.add(fly);
        flutterers.push({ o: fly, wings, cx: d.x, cy: d.y, cz: d.z, r: d.r, phase: i * 2.4 + d.x, rate: 0.5 + 0.25 * ((i * 37) % 5) / 5 });
      }
    } else if (d.kind === 'crystal') {
      // A few long four-sided crystals leaning out from one root, glowing in their colour.
      const c = new THREE.Color(d.color);
      const tip = c.clone().lerp(new THREE.Color(0xffffff), 0.45);
      const spikes = [
        { a: 0, lean: 0.05, s: 1 },
        { a: 1.2, lean: 0.45, s: 0.7 },
        { a: 2.6, lean: 0.4, s: 0.6 },
        { a: 4.1, lean: 0.5, s: 0.75 },
        { a: 5.3, lean: 0.35, s: 0.5 },
      ];
      for (const sp of spikes) {
        const h = d.size * sp.s;
        const geo = new THREE.ConeGeometry(h * 0.16, h, 4, 1);
        geo.translate(0, h / 2, 0);
        bakeVertexColor(geo, c, false);
        const cl = geo.attributes.color;
        for (let i = 0; i < cl.count; i++) {
          const k = geo.attributes.position.getY(i) / h;
          cl.setXYZ(i, c.r + (tip.r - c.r) * k, c.g + (tip.g - c.g) * k, c.b + (tip.b - c.b) * k);
        }
        const m = addMesh(geo, darkMat, d.x, d.y, d.z);
        m.rotation.set(Math.cos(sp.a) * sp.lean, sp.a, Math.sin(sp.a) * sp.lean);
      }
      lightDefs.push({ x: d.x, y: d.y + d.size * 0.6, z: d.z, r: 6 + d.size * 1.5, color: c, power: 0.75, flash: 0, flicker: 0.08, phase: d.x * 1.7 + d.z });
    } else if (d.kind === 'mushroom') {
      // A mushroom that glows. A pale stem; a cap that is a low, nearly flat dome with a turned-down rim, bright on its
      // crown, deep in its colour at the rim, a few pale spots on it; under it, dark gills. Flat-faced.
      // (A big one is solid, stem and cap: see MUSHROOM. So it stands straight, and its cap is flat enough to stand
      // on where the solid of it is. A small one, which he brushes through, has a lean to it.)
      const c = new THREE.Color(d.color);
      const h = d.size;
      const r = mushroomCap(d.x, d.z, h, d.cap);
      const lean = h >= MUSHROOM.solid ? 0 : 0.12 * Math.sin(d.x * 5.3 + d.z * 2.9);
      const thick = mushroomStem(h, d.stem);
      // (Its stem goes up into the hollow of its cap. Its cap is shaped by its own width: see MUSHROOM.)
      const stemTop = h - r * 0.3;
      const stem = new THREE.CylinderGeometry(thick * 0.58, thick, stemTop, 5, Math.max(1, Math.round(stemTop / 2.5)));
      stem.translate(0, stemTop / 2, 0);
      // (Its picture runs from its top down to the ground, twice round a thick one.)
      const suv = stem.attributes.uv;
      for (let i = 0; i < suv.count; i++) suv.setXY(i, suv.getX(i) * (thick > 0.25 ? 2 : 1), 1 - suv.getY(i));
      bakeVertexColor(stem, new THREE.Color(0xffffff).lerp(c, 0.35), false);
      const stalk = addMesh(stem, (mushroomStemMat ??= createPs1Material({ lit: true, tex: getTexture('mushroomStem') })), d.x, d.y, d.z);
      stalk.rotation.set(lean, d.x * 2.3, lean * 0.6);
      // (Its cap: a row of rings from its crown down and out to its rim, then in underneath.)
      const DEEP = 0.351;
      const prof: Array<[number, number]> = [[0, 0], [0.5, 0.032], [0.85, 0.117], [1, 0.266], [0.93, DEEP], [0.2, 0.309]];
      const pts = prof.map(([rr, down]) => new THREE.Vector2(Math.max(0.001, rr * r), h - down * r));
      let cap: THREE.BufferGeometry = new THREE.LatheGeometry(pts, 7);
      cap = cap.toNonIndexed();
      cap.computeVertexNormals();
      // (Its picture, `mushroomCap`: fibres, warts and gills, in greys; twice round it, so they are fine.)
      const cuv = cap.attributes.uv;
      for (let i = 0; i < cuv.count; i++) cuv.setX(i, cuv.getX(i) * 2);
      const q = cap.attributes.position;
      const cols = new Float32Array(q.count * 3);
      // (Brighter than they were before the picture went on: the picture takes some of it back.)
      const crown = c.clone().lerp(new THREE.Color(0xffffff), 0.4).multiplyScalar(1.15);
      const rim = c.clone().multiplyScalar(0.8);
      const under = c.clone().multiplyScalar(0.55);
      // (Which way the faces were wound: its first face is on its crown, and that one looks up.)
      const outward = cap.attributes.normal.getY(0) < 0 ? -1 : 1;
      for (let i = 0; i < q.count; i += 3) {
        // (Each face one colour, by how high on the cap it is and whether it looks up or down.)
        const fy = 1 - (h - (q.getY(i) + q.getY(i + 1) + q.getY(i + 2)) / 3) / (DEEP * r);
        const up = cap.attributes.normal.getY(i) * outward > -0.2;
        const col = !up ? under : rim.clone().lerp(crown, Math.max(0, Math.min(1, (fy - 0.3) / 0.7)) ** 1.5);
        for (let j = 0; j < 3; j++) cols.set([col.r, col.g, col.b], (i + j) * 3);
      }
      cap.setAttribute('color', new THREE.BufferAttribute(cols, 3));
      const top = new THREE.Mesh(cap, (mushroomGlow ??= new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, map: getTexture('mushroomCap') })));
      top.position.set(d.x, d.y, d.z);
      top.rotation.copy(stalk.rotation);
      group.add(top);
      halo(d.x, d.y + h - r * 0.2, d.z, r * 5, c, 0.34);
      // (The tall one of a stand lights the place: a pool of its colour on the rock, the small ones round it in it.
      // Only the nearest few lights are drawn, so not every mushroom is one.)
      // (A very tall one lights no further than a tall one: its light is up at its cap.)
      if (h >= 1.5) lightDefs.push({ x: d.x, y: d.y + h - r * 0.4, z: d.z, r: 4.5 + Math.min(h, 3) * 1.5, color: c, power: 0.85, flash: 0, flicker: 0.05, phase: d.x * 1.3 + d.z * 0.7 });
    } else if (d.kind === 'bracket') {
      // A shelf mushroom out of a wall: flat on top (it is stood on), eight-cornered, a thick turned-down lip, dark
      // gills under it running back to the wall. Bright in its middle, deep in its colour at its lip. It glows.
      // (Built growing out along +z from the origin, then turned.)
      const c = new THREE.Color(d.color);
      const w = d.wide;
      const dp = d.deep;
      const t = dp * BRACKET.thick;
      const k = BRACKET.cut;
      const rim: Array<[number, number]> = [[-w, 0], [-w, dp * (1 - k)], [-w * (1 - k), dp], [w * (1 - k), dp], [w, dp * (1 - k)], [w, 0]];
      const pos: number[] = [];
      const col: number[] = [];
      const uvs: number[] = [];
      const crown = c.clone().lerp(new THREE.Color(0xffffff), 0.45).multiplyScalar(1.15);
      const edge = c.clone().multiplyScalar(0.85);
      const under = c.clone().multiplyScalar(0.5);
      const dark = c.clone().multiplyScalar(0.3);
      // (Its picture is the mushrooms' own, `mushroomCap`: down it from crown to rim to gills.)
      const put = (x: number, y: number, z: number, cc: THREE.Color, v: number): void => {
        pos.push(x, y, z);
        col.push(cc.r, cc.g, cc.b);
        uvs.push((x / (2 * w) + 0.5) * 2, v);
      };
      for (let i = 0; i + 1 < rim.length; i++) {
        const [ax, az] = rim[i];
        const [bx, bz] = rim[i + 1];
        // Its top.
        put(0, 0, dp * 0.4, crown, 0); put(ax, 0, az, edge, 0.6); put(bx, 0, bz, edge, 0.6);
        // Its lip, turned down.
        put(ax, 0, az, edge, 0.6); put(ax * 0.96, -t * 0.4, az * 0.96, under, 0.75); put(bx * 0.96, -t * 0.4, bz * 0.96, under, 0.75);
        put(ax, 0, az, edge, 0.6); put(bx * 0.96, -t * 0.4, bz * 0.96, under, 0.75); put(bx, 0, bz, edge, 0.6);
        // Its gills: in and down to the wall.
        put(ax * 0.96, -t * 0.4, az * 0.96, under, 0.8); put(0, -t, 0, dark, 1); put(bx * 0.96, -t * 0.4, bz * 0.96, under, 0.8);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
      geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(col), 3));
      geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvs), 2));
      geo.computeVertexNormals();
      const shelf = new THREE.Mesh(geo, (mushroomGlow ??= new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, map: getTexture('mushroomCap') })));
      shelf.position.set(d.x, d.y, d.z);
      shelf.rotation.y = d.yaw;
      group.add(shelf);
      const ox = Math.sin(d.yaw);
      const oz = Math.cos(d.yaw);
      halo(d.x + ox * dp * 0.5, d.y - t * 0.3, d.z + oz * dp * 0.5, Math.max(w, dp) * 3.4, c, 0.3);
      lightDefs.push({ x: d.x + ox * dp * 0.7, y: d.y + 0.5, z: d.z + oz * dp * 0.7, r: 5, color: c, power: 0.8, flash: 0, flicker: 0.05, phase: d.x * 1.3 + d.z * 0.7 + d.y });
    } else if (d.kind === 'moss') {
      // A clump of glowing moss: two or three ragged lobes of it lying on the rock, each bright at its heart and dying
      // away to its edge; from a clump on a wall, threads hanging, a bead of light at the end of each.
      const c = new THREE.Color(d.color);
      const hash = (n: number): number => {
        const v = Math.sin(n * 127.1 + d.x * 311.7 + d.y * 19.3 + d.z * 74.7) * 43758.5453;
        return v - Math.floor(v);
      };
      const heart = c.clone().lerp(new THREE.Color(0xffffff), 0.2);
      const body = c.clone().multiplyScalar(0.8);
      const edge = c.clone().multiplyScalar(0.1);
      const pos: number[] = [];
      const col: number[] = [];
      const uv: number[] = [];
      const put = (x: number, y: number, z: number, k: THREE.Color): void => {
        pos.push(x, y, z);
        col.push(k.r, k.g, k.b);
        uv.push(x / 0.9 + d.x, y / 0.9 + d.y);
      };
      const N = 11;
      for (let l = 0; l < 4; l++) {
        const la = hash(l * 7 + 1) * Math.PI * 2;
        const off = l === 0 ? 0 : d.size * (0.55 + 0.35 * hash(l * 7 + 2));
        const cx = Math.cos(la) * off * 1.15;
        const cy = Math.sin(la) * off * 0.55;
        const R = d.size * (l === 0 ? 0.75 : 0.34 + 0.22 * hash(l * 7 + 3));
        const at = (i: number, k: number): [number, number] => {
          const a = ((i % N) / N) * Math.PI * 2;
          const rr = R * k * (0.4 + 0.6 * hash(l * 31 + (i % N)));
          return [cx + Math.cos(a) * rr * 1.2, cy + Math.sin(a) * rr * 0.8];
        };
        for (let i = 0; i < N; i++) {
          const [mx0, my0] = at(i, 0.48);
          const [mx1, my1] = at(i + 1, 0.48);
          const [rx0, ry0] = at(i, 1);
          const [rx1, ry1] = at(i + 1, 1);
          const z = 0.002 * l;
          put(cx, cy, z, heart); put(mx0, my0, z, body); put(mx1, my1, z, body);
          put(mx0, my0, z, body); put(rx0, ry0, z, edge); put(rx1, ry1, z, edge);
          put(mx0, my0, z, body); put(rx1, ry1, z, edge); put(mx1, my1, z, body);
        }
      }
      for (let t = 0; t < (d.flat ? 0 : d.threads ?? 0); t++) {
        const x = (hash(t * 13 + 5) - 0.5) * d.size * 1.7;
        const y0 = -d.size * 0.15 * hash(t * 13 + 6);
        const len = d.size * (0.5 + 1.1 * hash(t * 13 + 7));
        const w = 0.022;
        const dim = c.clone().multiplyScalar(0.35);
        put(x - w, y0, 0.03, dim); put(x - w, y0 - len, 0.03, c); put(x + w, y0 - len, 0.03, c);
        put(x - w, y0, 0.03, dim); put(x + w, y0 - len, 0.03, c); put(x + w, y0, 0.03, dim);
        const b = 0.065;
        put(x - b, y0 - len - b, 0.035, heart); put(x, y0 - len - b * 2, 0.035, heart); put(x + b, y0 - len - b, 0.035, heart);
        put(x - b, y0 - len - b, 0.035, heart); put(x + b, y0 - len - b, 0.035, heart); put(x, y0 - len, 0.035, heart);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      // (Its lobes lie on one another and on the rock. It writes no depth and is drawn after the room: so its faces
      // go down in the order they were made, lobe on lobe, thread on lobe, and none can flicker through another.)
      mossGlow ??= lyingOn(new THREE.MeshBasicMaterial({ map: getTexture('glowMoss'), vertexColors: true, depthWrite: false }), 1);
      const patch = new THREE.Mesh(geo, mossGlow);
      asDecal(patch, 1);
      const nx = d.flat ? 0 : Math.sin(d.yaw);
      const nz = d.flat ? 0 : Math.cos(d.yaw);
      patch.position.set(d.x + nx * 0.02, d.y + (d.flat ? 0.02 : 0), d.z + nz * 0.02);
      if (d.flat) patch.rotation.set(-Math.PI / 2, 0, d.yaw);
      else patch.rotation.y = d.yaw;
      group.add(patch);
      if (d.light) {
        const up = d.flat ? 0.5 : 0;
        halo(d.x + nx * 0.3, d.y + up * 0.4, d.z + nz * 0.3, d.size * 4.5, c, 0.22);
        lightDefs.push({ x: d.x + nx * 0.8, y: d.y + up, z: d.z + nz * 0.8, r: 3.5 + d.size * 2.2, color: c, power: 0.7, flash: 0, flicker: 0.04, phase: d.x * 0.9 + d.z * 1.7 });
      }
    } else if (d.kind === 'icicle' || d.kind === 'iceSpike') {
      // Clear ice: an icicle hanging (one four-sided spike, its point down), or a spike of it standing (one tall, two
      // short ones leaning from its foot). Lit like the room and glinting as he moves round it.
      iceMat ??= createPs1Material({ lit: true, shine: 0.7, tex: getTexture('iceClear') });
      const one = (r: number, length: number): THREE.BufferGeometry => {
        const g = new THREE.ConeGeometry(r, length, 4, 2).toNonIndexed();
        g.translate(0, length / 2, 0);
        g.computeVertexNormals();
        return bakeVertexColor(g, 0xffffff, false);
      };
      const hash = (n: number): number => {
        const v = Math.sin(n * 91.7 + d.x * 311.7 + d.z * 74.7) * 43758.5453;
        return v - Math.floor(v);
      };
      if (d.kind === 'icicle') {
        const m = addMesh(one(d.r, d.length), iceMat, d.x, d.top ?? roofOver(d.x, 3, d.z), d.z);
        // (Point down, and each turned its own way.)
        m.rotation.set(Math.PI, hash(1) * Math.PI, 0);
      } else {
        const tall = addMesh(one(d.size * 0.2, d.size), iceMat, d.x, d.y, d.z);
        tall.rotation.y = hash(1) * Math.PI;
        for (const [k, a] of [[0.52, hash(2) * Math.PI * 2], [0.36, hash(2) * Math.PI * 2 + 2.2 + hash(3)]] as Array<[number, number]>) {
          const m = addMesh(one(d.size * 0.14, d.size * k), iceMat, d.x + Math.cos(a) * d.size * 0.12, d.y, d.z + Math.sin(a) * d.size * 0.12);
          m.rotation.set(Math.sin(a) * 0.3, hash(4) * Math.PI, -Math.cos(a) * 0.3);
        }
      }
    } else if (d.kind === 'forge') {
      // One of the furnace's things (forgeModels.ts): its shapes, its fire with the room's other fires, its lights, its moving parts.
      const f = buildForge(d, forgeMats(), ceiling ? ceiling.y : d.y + 12);
      group.add(f.group);
      for (const fl of f.flames) flames.push({ mesh: fl.mesh, base: fl.base, phase: fl.phase + d.x * 3.1 + d.z * 1.7 });
      for (const L of f.lights) lightDefs.push(L);
      if (f.update) animators.push(f.update);
    } else if (d.kind === 'vent') {
      // A steam vent: its grille lies on the floor (painted on after it, as a rug is), and steam comes up out of it.
      const size = d.size ?? 1.2;
      const plate = new THREE.PlaneGeometry(size, size);
      plate.rotateX(-Math.PI / 2);
      bakeVertexColor(plate, 0xffffff, false);
      asDecal(addMesh(plate, mat('steamVent'), d.x, d.y + 0.02, d.z), 1);
      const puffs: THREE.Sprite[] = [];
      for (let i = 0; i < 7; i++) {
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTexture(), color: 0xf2ece4, opacity: 0, depthWrite: false, transparent: true }));
        group.add(sp);
        puffs.push(sp);
      }
      const height = d.height ?? 3.2;
      jets.push({ puffs, from: new THREE.Vector3(d.x, d.y + 0.1, d.z), dir: new THREE.Vector3(0, 1, 0), length: height, width: size * 1.5, color: new THREE.Color(0xf2ece4), every: d.every ?? 0, on: d.on ?? 0, delay: d.delay ?? 0 });
    } else if (d.kind === 'jet') {
      // A jet of gas: a row of soft puffs, each put in its place as time goes (see `update`).
      const dir = new THREE.Vector3(...d.dir).normalize();
      const puffs: THREE.Sprite[] = [];
      for (let i = 0; i < 9; i++) {
        // (Fog, not light: each puff a soft white ball that hides what is behind it a little, and thins away.)
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTexture(), color: d.color ?? 0xdcefff, opacity: 0, depthWrite: false, transparent: true }));
        group.add(sp);
        puffs.push(sp);
      }
      jets.push({ puffs, from: new THREE.Vector3(d.x, d.y, d.z), dir, length: d.length, width: d.width ?? d.length * 0.55, color: new THREE.Color(d.color ?? 0xdcefff), every: d.every ?? 0, on: d.on ?? 0, delay: d.delay ?? 0 });
    } else if (d.kind === 'stalactite') {
      // A spike of rock hanging from the roof: five-sided, thick at its root and spreading into the rock there, then
      // narrowing by stages to a point, with a slight crook in it. Lit like the rock, so the lights of the place catch it.
      const top = roofOver(d.x, 4, d.z);
      const hash = (n: number): number => {
        const v = Math.sin(n * 91.7 + d.x * 311.7 + d.z * 74.7) * 43758.5453;
        return v - Math.floor(v);
      };
      const rings: Array<[number, number]> = [[0, 1.45], [0.1, 1], [0.42, 0.62], [0.76, 0.27], [1, 0.02]];
      const SIDES = 5;
      const turn = hash(1) * Math.PI * 2;
      const ring = rings.map(([t, k], j) => {
        const bend = j < 2 ? 0 : d.r * 0.5 * (t - 0.1);
        const ox = Math.cos(turn) * bend * (0.6 + hash(j + 3) * 0.8);
        const oz = Math.sin(turn) * bend * (0.6 + hash(j + 9) * 0.8);
        return Array.from({ length: SIDES }, (_, i) => {
          const a = (i / SIDES) * Math.PI * 2 + turn;
          return new THREE.Vector3(ox + Math.cos(a) * d.r * k, -t * d.length, oz + Math.sin(a) * d.r * k);
        });
      });
      const pos: number[] = [];
      const uv: number[] = [];
      const tile = TILE[d.skin ?? 'caveRock'] ?? 3;
      const girth = (Math.PI * 2 * d.r) / tile;
      for (let j = 0; j + 1 < ring.length; j++) {
        for (let i = 0; i < SIDES; i++) {
          const a = ring[j][i];
          const b = ring[j][(i + 1) % SIDES];
          const c2 = ring[j + 1][(i + 1) % SIDES];
          const e = ring[j + 1][i];
          const u0 = (i / SIDES) * girth;
          const u1 = ((i + 1) / SIDES) * girth;
          for (const [v, u] of [[a, u0], [c2, u1], [b, u1], [a, u0], [e, u0], [c2, u1]] as Array<[THREE.Vector3, number]>) {
            pos.push(v.x, v.y, v.z);
            uv.push(u, v.y / tile);
          }
        }
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      geo.computeVertexNormals();
      bakeVertexColor(geo, 0xeeeeee);
      // (Each face its own light: darker the more it looks down, and all of it darker toward the point.)
      const cl = geo.attributes.color;
      for (let i = 0; i < cl.count; i++) {
        const k = 1 - 0.3 * Math.min(1, -geo.attributes.position.getY(i) / d.length);
        cl.setXYZ(i, cl.getX(i) * k, cl.getY(i) * k, cl.getZ(i) * k);
      }
      addMesh(geo, mat(d.skin ?? 'caveRock'), d.x, top, d.z);
    } else if (d.kind === 'roots') {
      // Three or four thin, kinked roots hanging from the ceiling; they sway a little.
      const pivot = new THREE.Group();
      pivot.position.set(d.x, d.top, d.z);
      group.add(pivot);
      const len = d.top - d.bottom;
      const n = 4;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + d.x;
        let x = Math.cos(a) * 0.25;
        let z = Math.sin(a) * 0.25;
        let y = 0;
        const segs = 4;
        const l = len * (0.6 + 0.4 * ((i * 37 + Math.floor(d.z)) % 5) / 4);
        for (let k = 0; k < segs; k++) {
          const sl = l / segs;
          const r0 = 0.07 * (1 - k / segs) + 0.015;
          const geo = new THREE.CylinderGeometry(r0 * 0.7, r0, sl, 4, 1);
          bakeVertexColor(geo, lifted(k % 2 ? 0x5a3d24 : 0x4a3220, 0.4));
          const m = new THREE.Mesh(geo, lit('ashWood'));
          const nx = x + Math.sin(a * 3 + k * 1.7) * 0.18;
          const nz = z + Math.cos(a * 2 + k * 2.1) * 0.18;
          m.position.set((x + nx) / 2, y - sl / 2, (z + nz) / 2);
          m.rotation.set((nz - z) / sl, 0, -(nx - x) / sl);
          pivot.add(m);
          x = nx;
          z = nz;
          y -= sl;
        }
      }
      swayers.push({ obj: pivot, axis: 'z', amount: 0.05, speed: 0.6, phase: d.x * 1.1 + d.z * 0.7 });
    } else if (d.kind === 'speaker' || d.kind === 'couch') {
      // Parts are laid out facing +z, then turned about the piece's centre.
      const cs = Math.cos(d.yaw);
      const sn = Math.sin(d.yaw);
      const part = (geo: THREE.BufferGeometry, color: number, lx: number, ly: number, lz: number, skin: THREE.Material = plainMat, lift = 0.4): THREE.Mesh => {
        bakeVertexColor(geo, skin === plainMat ? color : lifted(color, lift));
        const m = addMesh(geo, skin, d.x + lx * cs + lz * sn, d.y + ly, d.z - lx * sn + lz * cs);
        m.rotation.y = d.yaw;
        return m;
      };
      if (d.kind === 'speaker') {
        part(tiled(new THREE.BoxGeometry(1.7, 2.8, 1.2), 3, 4), 0x4a4a56, 0, 1.4, 0, lit('weave'), 0); // the cabinet, its grille cloth
        part(new THREE.BoxGeometry(1.5, 0.12, 1.0), 0x5a5a68, 0, 2.86, 0, lit('tin')); // a dented top
        const woofer = part(new THREE.CylinderGeometry(0.62, 0.5, 0.25, 10, 1), 0x8a6a4a, 0, 0.95, 0.66, lit('card')); // a paper cone
        woofer.rotation.x = Math.PI / 2;
        const dust = part(new THREE.CylinderGeometry(0.2, 0.2, 0.3, 8, 1), 0x1a1a1e, 0, 0.95, 0.74);
        dust.rotation.x = Math.PI / 2;
        const tweet = part(new THREE.CylinderGeometry(0.28, 0.24, 0.16, 8, 1), 0x4a4a54, 0, 2.2, 0.62, lit('tin'));
        tweet.rotation.x = Math.PI / 2;
        part(new THREE.BoxGeometry(0.08, 1.1, 0.04), 0x101014, -0.45, 1.8, 0.62).rotation.z = 0.5; // a crack
        part(new THREE.BoxGeometry(0.05, 0.9, 0.05), 0xc84a3a, 0.9, 0.5, 0.3); // a dangling wire
        cones.push({ mesh: woofer, base: 1, dz: 0.5 }, { mesh: dust, base: 1, dz: 0.9 });
      } else {
        // The couch (couchModel.ts): old cloth, cushions, a patch, rips, a pillow, a blanket over one arm.
        const couch = buildCouch({ cloth: mat('couchFabric'), patch: mat('couchPatch'), blanket: mat('knitBlanket'), plain: plainMat, patchOn: (couchPatchOn ??= lyingOn(createPs1Material({ tex: getTexture('couchPatch') }))), plainOn });
        couch.position.set(d.x, d.y, d.z);
        couch.rotation.y = d.yaw;
        group.add(couch);
      }
    } else if (d.kind === 'table' || d.kind === 'stool' || d.kind === 'mugs' || d.kind === 'keg') {
      // The Club's tables, stools and bar things (tavernModels.ts).
      const mats = { wood: mat('planks'), plain: plainMat, glow: new THREE.MeshBasicMaterial({ color: 0xffd36a }), cork: mat('cork'), tin: mat('tin') };
      const piece = d.kind === 'table' ? buildTable(mats, { mugs: d.mugs, candle: d.candle, cards: d.cards }) : d.kind === 'stool' ? buildStool(mats) : d.kind === 'mugs' ? buildMugRow(mats, d.count, d.gap) : buildKeg(mats);
      piece.position.set(d.x, d.y, d.z);
      if (d.kind !== 'stool') piece.rotation.y = d.yaw;
      group.add(piece);
      // (A candle's flame shivers.)
      piece.traverse((o) => {
        if (o.userData.flame) swayers.push({ obj: o, axis: 'z', amount: 0.22, speed: 7, phase: d.x + d.z });
      });
    } else if (d.kind === 'floorkey' || d.kind === 'chime') {
      // Music underfoot (world/musicFloor.ts): a key or a pad, and a glow over it that lights as it sounds.
      const key = d.kind === 'floorkey';
      const h = key ? (d.black ? 0.16 : 0.07) : 0.1;
      const w = key ? d.w : d.r * 2;
      const dd = key ? d.d : d.r * 2;
      const geo = key ? new THREE.BoxGeometry(w - 0.06, h, dd - 0.06) : new THREE.CylinderGeometry(d.r, d.r * 1.05, h, 16, 1);
      const col = key ? (d.black ? 0x22222a : 0xf2efe6) : d.color;
      bakeVertexColor(geo, col);
      const body = addMesh(geo, plainMat, d.x, d.y + h / 2, d.z);
      const glowGeo = key ? new THREE.PlaneGeometry(w - 0.1, dd - 0.1) : new THREE.CircleGeometry(d.r * 0.9, 16);
      glowGeo.rotateX(-Math.PI / 2);
      const glowMat = new THREE.MeshBasicMaterial({ color: key ? (d.black ? 0x7a9aff : 0xffe28a) : d.color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
      const glow = new THREE.Mesh(glowGeo, glowMat);
      glow.position.set(d.x, d.y + h + 0.012, d.z);
      group.add(glow);
      musicPads.push(key ? { kind: 'key', x: d.x, y: d.y + h, z: d.z, w: d.w, d: d.d, note: d.note, black: d.black, ...(d.voice ? { voice: d.voice } : {}) } : { kind: 'chime', x: d.x, y: d.y + h, z: d.z, w: d.r * 1.8, d: d.r * 1.8, note: d.note, puzzle: d.puzzle, slot: d.slot });
      musicLooks.push({ body, glow: glowMat, rest: d.y + h / 2 });
    } else if (d.kind === 'belt' || d.kind === 'blade' || d.kind === 'spikes' || d.kind === 'fan' || d.kind === 'flamejet' || d.kind === 'teslacoil' || d.kind === 'zapplate' || d.kind === 'floatzone' || d.kind === 'mud' || d.kind === 'launcher') {
      // Hazards and helpers (world/hazards.ts, hazardModels.ts): drawn here; main.ts has them act on him. A belt, a zap
      // plate and a coil are solid. (A coil is told of every plate, to throw its bolts at them.)
      const built = buildHazard(d, { iron: lit('wroughtIron'), plain: plainMat, copper: lit('copperCoil'), tread: lit('treadPlate') }, allHazards);
      group.add(built.group);
      hazardSpecs.push(d);
      hazardLooks.push(built);
      if (d.kind === 'belt') colliders.push(makeAabb(d.x, d.y - BELT_DEPTH / 2, d.z, d.w, BELT_DEPTH, d.d));
      if (d.kind === 'zapplate') colliders.push(makeAabb(d.x, d.y - 0.15, d.z, d.w, 0.3, d.d));
      if (d.kind === 'teslacoil') colliders.push(makeAabb(d.x, d.y + d.height / 2, d.z, d.r * 2.4, d.height, d.r * 2.4));
    } else if (d.kind === 'bell') {
      // A bell (world/strikeables.ts, strikeModels.ts): struck with the sword, and a music pad (world/musicFloor.ts).
      const B = STRIKE.bell;
      const t = newStrikeable('bell', d.x, d.y + B.hang, d.z, B.w, B.h, B.d);
      t.pad = musicPads.length;
      const built = buildStrike(d, { stone: lit('cutStone'), iron: lit('wroughtIron'), plain: plainMat });
      built.group.position.set(d.x, d.y, d.z);
      group.add(built.group);
      musicPads.push({ kind: 'bell', x: d.x, y: d.y + B.hang, z: d.z, w: B.w, d: B.d, note: d.note, puzzle: d.puzzle, slot: d.slot });
      musicLooks.push({ body: new THREE.Object3D(), glow: built.group.userData.glow as THREE.MeshBasicMaterial, rest: 0 });
      // (Solid: the frame and the bell in it, one box, turned with it.)
      const across = Math.abs(Math.sin(d.yaw)) > 0.5;
      const aabb = makeAabb(d.x, d.y + B.frame / 2, d.z, across ? 0.9 : 1.6, B.frame, across ? 1.6 : 0.9);
      colliders.push(aabb);
      strikeThings.push(t);
      strikeLooks.push(built);
      strikeSolids.push(aabb);
    } else if (d.kind === 'lever' || d.kind === 'crackwall' || d.kind === 'crackfloor') {
      // Things to hit (world/strikeables.ts, strikeModels.ts): drawn, solid, and struck by main.ts.
      const L = STRIKE.lever;
      const t = d.kind === 'lever' ? { ...newStrikeable('lever', d.x, d.y, d.z, L.w, L.h, L.d), ...(d.timer ? { timer: d.timer, left: 0 } : {}) }
        : d.kind === 'crackwall' ? newStrikeable('crackwall', d.x, d.y, d.z, d.w, d.h, d.d, d.hits)
        : newStrikeable('crackfloor', d.x, d.y - 0.4, d.z, d.w, 0.4, d.d);
      const built = buildStrike(d, { stone: lit('cutStone'), iron: lit('wroughtIron'), plain: plainMat });
      built.group.position.set(d.x, d.y, d.z);
      group.add(built.group);
      // (A lever's solid is its base only: the handle is struck, not stood on.)
      const solidH = d.kind === 'lever' ? 0.35 : t.h;
      const aabb = makeAabb(t.x, t.y + solidH / 2, t.z, t.w, solidH, t.d);
      colliders.push(aabb);
      strikeThings.push(t);
      strikeLooks.push(built);
      strikeSolids.push(aabb);
    } else if (d.kind === 'junk') {
      // Household junk at a rat's size (junkModels.ts). A candle lights the room round it, and its flame shivers.
      const built = buildJunk(d.what, {
        tin: mat('tin'), wood: lit('ashWood'), card: lit('card'), wax: lit('wax'), thread: lit('thread'),
        cheese: (cheeseMat ??= createPs1Material({ lit: true, tex: getTexture('cheese'), side: THREE.DoubleSide })),
        plain: plainMat, glow: new THREE.MeshBasicMaterial({ color: 0xffd36a }),
      });
      built.group.position.set(d.x, d.y, d.z);
      built.group.rotation.y = d.yaw;
      group.add(built.group);
      if (built.sway) swayers.push({ obj: built.sway, axis: 'x', amount: 0.14, speed: 1.3, phase: d.x * 0.9 + d.z });
      if (built.tick) animators.push(built.tick);
      if (built.knock) knockables.push({ what: d.what, x: d.x, y: d.y, z: d.z, yaw: d.yaw, knock: built.knock });
      if (built.flame) {
        swayers.push({ obj: built.flame, axis: 'z', amount: 0.25, speed: 7, phase: d.x + d.z });
        lightDefs.push({ x: d.x, y: d.y + 1.2, z: d.z, r: 6, color: new THREE.Color(0xffb060), power: 0.7, flash: 0, flicker: 0.2, phase: d.x * 1.7 + d.z });
      }
    } else if (d.kind === 'rug' || d.kind === 'dancefloor' || d.kind === 'bulbs' || d.kind === 'bottles' || d.kind === 'dartboard') {
      // More of the Club's dressing (tavernModels.ts): all of it only drawn.
      const mats = { wood: mat('planks'), plain: plainMat, glow: plainMat, layer: plainOn, cork: mat('cork'), tin: mat('tin') };
      const piece = d.kind === 'rug' ? buildRug(mats, { r: d.r, w: d.w, d: d.d, colors: d.colors })
        : d.kind === 'dancefloor' ? buildDanceFloor(d.nx, d.nz, d.tile, d.colors)
        : d.kind === 'bulbs' ? buildBulbs(d.x1 - d.x, d.z1 - d.z, d.sag, d.count, [bulbHang(d.x, d.y, d.z), bulbHang(d.x1, d.y, d.z1)])
        : d.kind === 'bottles' ? buildBottles(mats, d.width) : buildDartboard(mats);
      piece.position.set(d.x, d.y, d.z);
      if (d.kind === 'rug' || d.kind === 'bottles' || d.kind === 'dartboard') piece.rotation.y = d.yaw;
      group.add(piece);
    } else if (d.kind === 'runnel' || d.kind === 'sleepers') {
      // Things that lie on a slope down the line x (the downhill level): a runnel of slime; a track's sleepers.
      const len = Math.hypot(d.z1 - d.z0, d.y1 - d.y0);
      const tip = Math.atan2(d.y0 - d.y1, d.z1 - d.z0); // how far it is tipped down toward +z
      const lie = new THREE.Group();
      lie.position.set(d.x, d.y0, d.z0);
      lie.rotation.x = tip;
      if (d.kind === 'runnel') {
        // (A strip of sludge a hair over the floor, its picture running down it.)
        const geo = new THREE.PlaneGeometry(d.w, len, 1, Math.max(1, Math.ceil(len / 2.5)));
        geo.rotateX(-Math.PI / 2);
        geo.translate(0, 0.02, len / 2);
        const uv = geo.attributes.uv;
        for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (d.w / 2), uv.getY(i) * (len / 2));
        bakeVertexColor(geo, 0xb8e0a0, false);
        const strip = new THREE.Mesh(geo, mat('sludge'));
        asDecal(strip, 1); // (it LIES ON the floor: painted on after it. See render/layering.ts)
        lie.add(strip);
      } else {
        const parts: THREE.BufferGeometry[] = [];
        for (let u = d.gap / 2; u < len; u += d.gap) {
          const plank = new THREE.BoxGeometry(d.w, 0.08, 0.34);
          plank.translate(0, 0.045, u);
          parts.push(plank);
        }
        if (parts.length) {
          const geo = mergeAll(parts);
          applyWorldUvs(geo, 1.2);
          bakeVertexColor(geo, 0x9a8468);
          lie.add(new THREE.Mesh(geo, mat('planks')));
        }
      }
      group.add(lie);
    } else if (d.kind === 'weed') {
      // A weed out of a crack: a fan of blades, a paler one in the middle, a seed head. It sways.
      const weed = new THREE.Group();
      weed.position.set(d.x, d.y, d.z);
      const blades = 6;
      for (let i = 0; i < blades; i++) {
        const tall = d.size * (0.7 + 0.3 * ((i * 37) % 10) / 10);
        const blade = new THREE.ConeGeometry(d.size * 0.11, tall, 3);
        blade.translate(0, tall / 2, 0);
        blade.scale(1, 1, 0.35);
        bakeVertexColor(blade, i % 3 === 0 ? 0x86b04a : 0x4f8a3a);
        const m = new THREE.Mesh(blade, plainMat);
        m.rotation.set(0.45 + 0.12 * (i % 2), (i / blades) * Math.PI * 2, 0, 'YXZ');
        weed.add(m);
      }
      const stalk = new THREE.ConeGeometry(d.size * 0.05, d.size * 1.25, 3);
      stalk.translate(0, d.size * 0.62, 0);
      bakeVertexColor(stalk, 0x6a9a44);
      weed.add(new THREE.Mesh(stalk, plainMat));
      const head = new THREE.OctahedronGeometry(d.size * 0.13);
      bakeVertexColor(head, 0xd8c860);
      const top = new THREE.Mesh(head, plainMat);
      top.position.y = d.size * 1.25;
      weed.add(top);
      group.add(weed);
      swayers.push({ obj: weed, axis: 'z', amount: 0.07, speed: 1.3, phase: d.x * 1.7 + d.z * 0.9 });
    } else if (d.kind === 'arena') {
      // The floor of a round room in the dark: cobbles, lit in the middle, fading to nothing at the edge.
      const rings: Array<[number, number]> = [[0, 1.12], [0.35, 1], [0.62, 0.72], [0.82, 0.3], [1, 0]];
      const parts: THREE.BufferGeometry[] = [];
      for (let i = 0; i + 1 < rings.length; i++) {
        const ring = new THREE.RingGeometry(Math.max(1e-3, rings[i][0] * d.r), rings[i + 1][0] * d.r, 40, 1);
        ring.rotateX(-Math.PI / 2);
        parts.push(ring);
      }
      const geo = mergeAll(parts);
      applyWorldUvs(geo, 2);
      const pos = geo.attributes.position;
      const col = new Float32Array(pos.count * 3);
      for (let i = 0; i < pos.count; i++) {
        const f = Math.min(1, Math.hypot(pos.getX(i), pos.getZ(i)) / d.r);
        let k = 0;
        while (k + 2 < rings.length && f > rings[k + 1][0]) k++;
        const [f0, b0] = rings[k];
        const [f1, b1] = rings[k + 1];
        const b = b0 + ((b1 - b0) * (f - f0)) / (f1 - f0);
        col.set([b, b * 0.95, b * 0.82], i * 3);
      }
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
      addMesh(geo, floorMat, d.x, d.y + 0.01, d.z);
    } else if (d.kind === 'eyes') {
      // Eyes out in the dark, in pairs, looking in: white, unlit, and no fog dims them. Each blinks in its own time.
      const eyeMat = new THREE.MeshBasicMaterial({ color: 0xf4f6ff, side: THREE.DoubleSide });
      const rnd = (n: number): number => {
        const v = Math.sin(n * 127.1 + 311.7) * 43758.5453;
        return v - Math.floor(v);
      };
      for (let i = 0; i < d.count; i++) {
        const a = ((i + rnd(i) * 0.8) / d.count) * Math.PI * 2;
        const r = d.r0 + (d.r1 - d.r0) * rnd(i + 50);
        const size = 0.1 + 0.12 * rnd(i + 100);
        const pair = new THREE.Group();
        for (const side of [-1, 1]) {
          const eye = new THREE.Mesh(new THREE.PlaneGeometry(size, size * 0.7), eyeMat);
          eye.position.x = side * size * 1.25;
          pair.add(eye);
        }
        pair.position.set(d.x + Math.sin(a) * r, d.y + 0.3 + d.high * rnd(i + 150) * rnd(i + 200), d.z + Math.cos(a) * r);
        pair.lookAt(d.x, d.y + 1, d.z);
        group.add(pair);
        blinkers.push({ obj: pair, period: 2.4 + 4.5 * rnd(i + 250), phase: 9 * rnd(i + 300) });
      }
    } else if (d.kind === 'fall') {
      buildFall(d);
    } else if (d.kind === 'chain') {
      const parts: THREE.BufferGeometry[] = [];
      for (let y = d.top, i = 0; y > d.bottom; y -= 0.2, i++) {
        // (2026-11-19: a link's bar is three-sided, not four: a quarter fewer triangles, and the ring still six-sided.
        // Four-sided rings, half the triangles, read as diamonds up close: tried and not kept.)
        const link = new THREE.TorusGeometry(0.09, 0.03, 3, 6);
        link.rotateY(i % 2 ? Math.PI / 2 : 0);
        link.rotateZ(Math.PI / 2);
        link.translate(0, y - d.top, 0);
        parts.push(link);
      }
      if (parts.length) addMesh(bakeVertexColor(mergeAll(parts), lifted(0x5a5a62, 0.45)), lit('wroughtIron'), d.x, d.top, d.z); // a chain with no length draws nothing
    } else if (d.kind === 'post') {
      const post = new THREE.BoxGeometry(0.5, d.top - d.y, 0.5);
      applyWorldUvs(post, 1.5);
      bakeVertexColor(post, 0xe8c8a0);
      addMesh(post, mat('beamSide'), d.x, (d.y + d.top) / 2, d.z);
      const cap = new THREE.BoxGeometry(0.7, 0.3, 0.7);
      applyWorldUvs(cap, 1);
      bakeVertexColor(cap, 0xd0b090);
      addMesh(cap, mat('beamEnd'), d.x, d.top - 0.15, d.z);
    } else if (d.kind === 'window') {
      const frame = new THREE.BoxGeometry(1.5, 1.5, 0.2);
      applyWorldUvs(frame, 1);
      bakeVertexColor(frame, 0xd8d4c4);
      const fm = addMesh(frame, trimMat, d.x, d.y, d.z);
      fm.rotation.y = d.yaw;
      const back = new THREE.PlaneGeometry(1.1, 1.1);
      bakeVertexColor(back, 0x0a0d0a, false);
      const bm = new THREE.Mesh(back, darkMat);
      bm.position.set(0, 0, 0.11);
      fm.add(bm);
      const bars = new THREE.PlaneGeometry(1.1, 1.1);
      bakeVertexColor(bars, 0xffffff, false);
      const barsM = new THREE.Mesh(bars, mat('ironBars'));
      barsM.position.set(0, 0, 0.13);
      fm.add(barsM);
    } else if (d.kind === 'slime') {
      const parts: THREE.BufferGeometry[] = [];
      const n = Math.max(2, Math.round(d.length * 1.6));
      for (let i = 0; i < n; i++) {
        const off = (i / (n - 1) - 0.5) * 1.4;
        const len = d.length * (0.4 + 0.6 * Math.abs(Math.sin(i * 2.7 + 1)));
        const drip = new THREE.CylinderGeometry(0.12, 0.05, len, 5, 1);
        drip.translate(off, -len / 2, 0);
        parts.push(drip);
        const blob = new THREE.SphereGeometry(0.12, 5, 4);
        blob.translate(off, -len, 0);
        parts.push(blob);
      }
      const top = new THREE.BoxGeometry(1.8, 0.25, 0.12);
      parts.push(top);
      const g = bakeVertexColor(mergeAll(parts), 0x7af04a, false);
      const m = addMesh(g, darkMat, d.x, d.y, d.z);
      m.rotation.y = d.yaw;
    } else if (d.kind === 'arch') {
      // The curved underside: a block with a half-circle bite, sitting on the jambs.
      const span = d.x1 - d.x0;
      const r = span / 2;
      const s = new THREE.Shape();
      s.moveTo(-r, 0);
      s.absarc(0, 0, r, Math.PI, 0, true);
      s.lineTo(r, r);
      s.lineTo(-r, r);
      s.lineTo(-r, 0);
      const g = new THREE.ExtrudeGeometry(s, { depth: d.thick, bevelEnabled: false, curveSegments: 10 });
      g.translate(0, 0, -d.thick / 2);
      applyWorldUvs(g, TILE[d.skin ?? 'sewerBrick'] ?? 2.5);
      bakeVertexColor(g, 0xd8d8cc);
      const m = addMesh(g, mat(d.skin ?? 'sewerBrick'), (d.x0 + d.x1) / 2, d.y, d.z);
      if (d.alongZ) {
        m.rotation.y = Math.PI / 2;
        m.position.set(d.z, d.y, (d.x0 + d.x1) / 2);
      }
    }
  }

  /** A grate in a wall, pouring a curtain of sludge that arcs out and drops into the water below. */
  function buildFall(d: Extract<Decor, { kind: 'fall' }>): void {
    const out = new THREE.Vector3(Math.sin(d.yaw), 0, Math.cos(d.yaw));
    const across = new THREE.Vector3().crossVectors(UP, out).normalize();
    // The grate: a stone frame, a dark mouth and bars in front of it.
    const fw = d.width + 0.7;
    const frame = new THREE.BoxGeometry(fw, 1.6, 0.3);
    applyWorldUvs(frame, 1);
    bakeVertexColor(frame, 0xd8d4c4);
    const fm = addMesh(frame, trimMat, d.x, d.y + 0.55, d.z);
    fm.rotation.y = d.yaw;
    const mouth = new THREE.PlaneGeometry(d.width, 1.1);
    bakeVertexColor(mouth, 0x0d1a0d, false);
    const mm = new THREE.Mesh(mouth, darkMat);
    mm.position.set(0, 0, 0.16);
    fm.add(mm);
    const bars = new THREE.PlaneGeometry(d.width, 1.1);
    bakeVertexColor(bars, 0xffffff, false);
    const bm = new THREE.Mesh(bars, mat('drainGrate'));
    bm.position.set(0, 0, 0.18);
    fm.add(bm);
    // The curtain: pours out of the bottom of the grate, curving down like water does.
    const drop = Math.max(0.5, d.y - d.bottom);
    const pts: THREE.Vector3[] = [];
    const N = 12;
    for (let i = 0; i <= N; i++) {
      const s = i / N;
      const fallen = drop * s;
      const forward = 0.25 + 0.9 * Math.sqrt(s);
      pts.push(new THREE.Vector3(d.x, d.y, d.z).addScaledVector(out, forward).add(new THREE.Vector3(0, -fallen, 0)));
    }
    const g = ribbon(pts, across, d.width, 2);
    bakeVertexColor(g, 0xd8ffd0, false);
    const fallMesh = new THREE.Mesh(g, fallMat);
    group.add(fallMesh);
    falls.push(fallMesh);
    // Foam where it lands: a few pale discs that swell and shrink.
    const land = pts[pts.length - 1];
    for (let i = 0; i < 4; i++) {
      const disc = new THREE.CircleGeometry(0.5 + i * 0.25, 9);
      disc.rotateX(-Math.PI / 2);
      bakeVertexColor(disc, 0xc8ffb8, false);
      const m = addMesh(disc, darkMat, land.x + across.x * (i - 1.5) * d.width * 0.25, d.bottom + 0.03 + i * 0.005, land.z + across.z * (i - 1.5) * d.width * 0.25);
      foam.push({ mesh: m, phase: i * 1.7 });
    }
  }

  // ---- Breakable wall pipes ----
  const pipeParts: Array<{ joint: THREE.Object3D; broken: THREE.Object3D; spec: PipeSpec; gush: Gush | null }> = [];
  const PIPE_R = 0.38;
  const JOINT_LO = 0.45;
  const JOINT_HI = 1.55;
  (layout.pipes ?? []).forEach((spec, index) => {
    const y = spec.y ?? 0;
    const pipeMat = plainMat;
    const back = new THREE.Vector3(-Math.sin(spec.yaw), 0, -Math.cos(spec.yaw));
    const stack: THREE.BufferGeometry[] = [];
    const lower = new THREE.CylinderGeometry(PIPE_R, PIPE_R, JOINT_LO, 8, 1);
    lower.translate(0, JOINT_LO / 2, 0);
    stack.push(lower);
    const upperLen = spec.top - y - JOINT_HI;
    const upper = new THREE.CylinderGeometry(PIPE_R, PIPE_R, upperLen, 8, 1);
    upper.translate(0, JOINT_HI + upperLen / 2, 0);
    stack.push(upper);
    // At the top it bends into the wall.
    const elbow = new THREE.CylinderGeometry(PIPE_R, PIPE_R, 1, 8, 1);
    elbow.rotateX(Math.PI / 2);
    elbow.rotateY(spec.yaw);
    elbow.translate(back.x * 0.5, spec.top - y, back.z * 0.5);
    stack.push(elbow);
    for (const by of [0.1, JOINT_HI + 0.1, spec.top - y - 0.3]) {
      const band = new THREE.CylinderGeometry(PIPE_R * 1.2, PIPE_R * 1.2, 0.2, 8, 1);
      band.translate(0, by, 0);
      stack.push(band);
    }
    const body = bakeVertexColor(mergeAll(stack), 0x7a8a7a);
    addMesh(body, pipeMat, spec.x, y, spec.z);
    // The joint: rusty, with two bright green seals, bulging a little. This is what a sword breaks.
    const jparts: THREE.BufferGeometry[] = [];
    const jointLen = JOINT_HI - JOINT_LO;
    const jbody = new THREE.CylinderGeometry(PIPE_R * 1.12, PIPE_R * 1.12, jointLen, 8, 1);
    bakeVertexColor(jbody, 0x9a6a3a);
    jparts.push(jbody);
    for (const sy of [-jointLen / 2 + 0.08, jointLen / 2 - 0.08]) {
      const seal = new THREE.CylinderGeometry(PIPE_R * 1.3, PIPE_R * 1.3, 0.14, 8, 1);
      seal.translate(0, sy, 0);
      bakeVertexColor(seal, 0x6aff4a, false);
      jparts.push(seal);
    }
    const valve = new THREE.TorusGeometry(0.22, 0.05, 4, 8);
    valve.translate(0, 0, PIPE_R * 1.12 + 0.12);
    valve.rotateY(spec.yaw);
    bakeVertexColor(valve, 0xc84a2a);
    jparts.push(valve);
    const joint = addMesh(mergeAll(jparts), plainMat, spec.x, y + (JOINT_LO + JOINT_HI) / 2, spec.z);
    // The broken look: jagged stubs, hidden until it breaks.
    const bparts: THREE.BufferGeometry[] = [];
    for (const [cy, flip] of [[JOINT_LO + 0.08, 1], [JOINT_HI - 0.08, -1]] as const) {
      const stub = new THREE.CylinderGeometry(PIPE_R * 1.05, PIPE_R * 1.05, 0.16, 8, 1, true);
      const sp = stub.attributes.position;
      for (let i = 0; i < sp.count; i++) if (sp.getY(i) * flip > 0) sp.setY(i, sp.getY(i) + flip * 0.12 * ((i * 7) % 3));
      stub.translate(0, cy - (JOINT_LO + JOINT_HI) / 2, 0);
      bparts.push(stub);
    }
    const broken = addMesh(bakeVertexColor(mergeAll(bparts), 0x5a3a22), createPs1Material({ lit: true, side: THREE.DoubleSide }), spec.x, y + (JOINT_LO + JOINT_HI) / 2, spec.z);
    broken.visible = false;
    // Solid all the way up, so he cannot walk through it.
    const aabb = makeAabb(spec.x, (y + spec.top) / 2, spec.z, PIPE_R * 2, spec.top - y, PIPE_R * 2);
    colliders.push(aabb);
    pipes.push({ type: 'pipe', index, x: spec.x, y: y + 0.95, z: spec.z, half: 0.45, alive: true, aabb, mesh: joint, lastSwing: -1 });
    pipeParts.push({ joint, broken, spec, gush: null });
  });

  function startGush(i: number): void {
    const pp = pipeParts[i];
    const s = pp.spec;
    const y = s.y ?? 0;
    const out = new THREE.Vector3(Math.sin(s.yaw), 0, Math.cos(s.yaw));
    const across = new THREE.Vector3().crossVectors(UP, out).normalize();
    // Out of the break it spurts forward, then drops to the floor.
    const pts: THREE.Vector3[] = [];
    const start = new THREE.Vector3(s.x, y + JOINT_HI - 0.15, s.z);
    for (let k = 0; k <= 12; k++) {
      const t = k / 12;
      const fwd = 0.2 + 1.6 * t;
      const yy = JOINT_HI - 0.15 + 0.35 * t - 1.9 * t * t;
      pts.push(start.clone().setY(y + Math.max(0.02, yy)).addScaledVector(out, fwd));
    }
    const g = ribbon(pts, across, 0.45, 1.2);
    bakeVertexColor(g, 0xd8ffd0, false);
    const stream = new THREE.Mesh(g, fallMat);
    stream.scale.setScalar(0.01);
    stream.position.set(0, 0, 0);
    group.add(stream);
    const pd = new THREE.CircleGeometry(1, 12);
    pd.rotateX(-Math.PI / 2);
    bakeVertexColor(pd, 0xffffff, false);
    const land = pts[pts.length - 1];
    const puddle = addMesh(pd, waterMat, land.x, y + 0.02, land.z);
    puddle.scale.setScalar(0.01);
    pp.gush = { stream, puddle, age: 0 };
  }

  // ---- Gates ----
  const gates: Gate[] = [];
  const gateMeshes: Array<{ bars: THREE.Object3D; aabb: Aabb; baseY: number }> = [];
  for (const spec of layout.gates ?? []) {
    const y = spec.y ?? 0;
    const g = new THREE.Group();
    const parts: THREE.BufferGeometry[] = [];
    const n = Math.max(3, Math.round(spec.width / 0.45));
    for (let i = 0; i < n; i++) {
      const x = -spec.width / 2 + (i + 0.5) * (spec.width / n);
      const bar = new THREE.CylinderGeometry(0.07, 0.07, spec.height, 6, 1);
      bar.translate(x, spec.height / 2, 0);
      bakeVertexColor(bar, 0x2a8a5a);
      parts.push(bar);
      const spike = new THREE.ConeGeometry(0.13, 0.32, 5);
      spike.rotateX(Math.PI);
      spike.translate(x, -0.12, 0);
      bakeVertexColor(spike, 0xd8b850);
      parts.push(spike);
    }
    for (const yy of [0.5, spec.height - 0.5]) {
      const rail = new THREE.BoxGeometry(spec.width, 0.18, 0.18);
      rail.translate(0, yy, 0);
      bakeVertexColor(rail, 0x6a4a2a);
      parts.push(rail);
    }
    const bars = new THREE.Mesh(mergeAll(parts), plainMat);
    g.add(bars);
    g.position.set(spec.x, y, spec.z);
    if (spec.alongZ) g.rotation.y = Math.PI / 2;
    group.add(g);
    const w = spec.alongZ ? 0.3 : spec.width;
    const dd = spec.alongZ ? spec.width : 0.3;
    const aabb = makeAabb(spec.x, y + spec.height / 2, spec.z, w, spec.height, dd);
    colliders.push(aabb);
    gates.push({ spec, open: false, lift: 0 });
    gateMeshes.push({ bars: g, aabb, baseY: y });
  }

  // ---- The void under the room, if there is one: a dark bottom. ----
  if (layout.pit) {
    const p = layout.pit;
    const bottomGeo = new THREE.BoxGeometry(p.x1 - p.x0, 0.2, p.z1 - p.z0);
    bakeVertexColor(bottomGeo, PIT_BOTTOM, false);
    addMesh(bottomGeo, floorMat, (p.x0 + p.x1) / 2, p.y0 + 0.1, (p.z0 + p.z1) / 2);
  }

  // ---- Pools of sludge. Still pools share one material; a flowing one gets its own so it can drift its way. ----
  const sheets: Array<{ geo: THREE.PlaneGeometry; base: Float32Array }> = [];
  const currents: Array<{ offset: THREE.Vector2; flow: [number, number] }> = [];
  for (const vol of layout.water) {
    const w = vol.x1 - vol.x0;
    const d = vol.z1 - vol.z0;
    const geo = new THREE.PlaneGeometry(w, d, Math.min(40, Math.ceil(w * 2)), Math.min(40, Math.ceil(d * 2)));
    geo.rotateX(-Math.PI / 2);
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * w) / 4.67, (uv.getY(i) * d) / 4.67); // about 3 tiles across 14 units
    bakeVertexColor(geo, WATER, false);
    const col = geo.attributes.color;
    const base = geo.attributes.position.array.slice() as Float32Array;
    for (let i = 0; i < col.count; i++) {
      const k = 0.8 + 0.2 * Math.sin(base[i * 3] * 2.1) * Math.cos(base[i * 3 + 2] * 1.7);
      // (Meltwater: the sheet's own picture, lit bluer and brighter, so that open water does not pass for ice.)
      const [cr, cg, cb] = vol.cold ? [1.3, 2.0, 2.8] : [1, 1, 1];
      col.setXYZ(i, col.getX(i) * k * cr, col.getY(i) * k * cg, col.getZ(i) * k * cb);
    }
    let m = waterMat;
    if (vol.flow) {
      m = createPs1Material({ tex: getTexture('sludge') });
      currents.push({ offset: m.uniforms.uvOffset.value as THREE.Vector2, flow: vol.flow });
    }
    if (vol.cold) m = createPs1Material({ tex: getTexture('iceSheet') });
    addMesh(geo, m, (vol.x0 + vol.x1) / 2, vol.y, (vol.z0 + vol.z1) / 2);
    sheets.push({ geo, base });
  }

  // ---- Lava: a glowing, slowly drifting surface (it is never lit, so it always looks hot). ----
  // ---- Standing fires: a bed of coals, and tongues of flame that lick and sway. They light the room around them. ----
  const pyres: Array<{ mesh: THREE.Mesh; x: number; y: number; z: number; h: number; phase: number }> = [];
  for (const f of layout.fire ?? []) {
    const fx = (f.x0 + f.x1) / 2;
    const fz = (f.z0 + f.z1) / 2;
    const bed = new THREE.BoxGeometry(f.x1 - f.x0, 0.24, f.z1 - f.z0, 3, 1, 3);
    bakeVertexColor(bed, 0x2a1c18, false);
    {
      // Coals: every other corner of the bed glows.
      const col = bed.attributes.color;
      for (let i = 0; i < col.count; i++) if ((i * 7) % 3 === 0 && bed.attributes.position.getY(i) > 0) col.setXYZ(i, 1, 0.4, 0.08);
    }
    addMesh(bed, darkMat, fx, f.y + 0.12, fz);
    const n = Math.max(2, Math.round((f.x1 - f.x0) / 1.1));
    const m = Math.max(2, Math.round((f.z1 - f.z0) / 1.1));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < m; j++) {
        const edge = i === 0 || j === 0 || i === n - 1 || j === m - 1;
        const hh = (edge ? 2.6 : 4.2) + ((i * 5 + j * 3) % 4) * 0.45;
        const cone = new THREE.ConeGeometry(0.62, hh, 5, 2);
        bakeVertexColor(cone, 0xffb030, false);
        const col = cone.attributes.color;
        for (let k = 0; k < col.count; k++) {
          const u = cone.attributes.position.getY(k) / hh + 0.5; // 0 at the root, 1 at the tip
          col.setXYZ(k, 1, 0.3 + 0.65 * u, 0.04 + 0.4 * u * u);
        }
        const x = f.x0 + ((i + 0.5) / n) * (f.x1 - f.x0);
        const z = f.z0 + ((j + 0.5) / m) * (f.z1 - f.z0);
        const mesh = addMesh(cone, darkMat, x, f.y + hh / 2, z);
        pyres.push({ mesh, x, y: f.y, z, h: hh, phase: i * 2.3 + j * 4.1 });
      }
    }
    lightDefs.push({ x: fx, y: f.y + 2.2, z: fz, r: 16, color: new THREE.Color(0xff7a20), power: 1.3, flash: 0, flicker: 0.3, phase: fx * 1.3 + fz * 0.7 });
  }

  const lavaMat = createPs1Material({ tex: getTexture('magmaRock') });
  const lavaOffset = lavaMat.uniforms.uvOffset.value as THREE.Vector2;
  for (const vol of layout.lava ?? []) {
    const w = vol.x1 - vol.x0;
    const d = vol.z1 - vol.z0;
    const geo = new THREE.PlaneGeometry(w, d, Math.max(1, Math.ceil(w / 2.5)), Math.max(1, Math.ceil(d / 2.5)));
    geo.rotateX(-Math.PI / 2);
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * w) / 4, (uv.getY(i) * d) / 4);
    bakeVertexColor(geo, 0xffd090, false);
    addMesh(geo, lavaMat, (vol.x0 + vol.x1) / 2, vol.y, (vol.z0 + vol.z1) / 2);
  }

  const waterOffset = waterMat.uniforms.uvOffset.value as THREE.Vector2;
  let lastTime = -1;

  const update = (time: number): void => {
    clock = time;
    for (const sp of spinners) sp.o.rotation.y = time * sp.rate;
    for (const rb of railBeads) {
      const q = railAt(rb.c, ((time * 9 + rb.at * rb.c.len) % rb.c.len + rb.c.len) % rb.c.len);
      rb.o.position.set(q.x, q.y - RAIL_TUBE.r - RAIL_TUBE.under, q.z);
      rb.o.rotation.y = time * 3;
    }
    blinkTextures(time);
    for (const n of nodders) n.o.rotation.z = n.lean * Math.sin(time * 1.3 + n.phase);
    for (const f of flutterers) {
      // (Round and about: two slow circles of different sizes laid over each other, and up and down as it goes.)
      const a = time * f.rate + f.phase;
      const x = f.cx + (Math.cos(a) * 0.65 + Math.cos(a * 2.3 + 1) * 0.35) * f.r;
      const z = f.cz + (Math.sin(a * 1.1) * 0.65 + Math.sin(a * 1.9 + 2) * 0.35) * f.r;
      const y = f.cy + 0.25 * Math.sin(a * 3.1) + 0.12 * Math.sin(time * 9 + f.phase);
      f.o.rotation.y = Math.atan2(x - f.o.position.x, z - f.o.position.z);
      f.o.position.set(x, y, z);
      const flap = 0.2 + 1.05 * Math.abs(Math.sin(time * 11 + f.phase));
      f.wings[0].rotation.z = -flap;
      f.wings[1].rotation.z = flap;
    }
    const dt = lastTime < 0 ? 0 : Math.min(0.1, Math.max(0, time - lastTime));
    lastTime = time;
    stepFalling(dt);
    // Jets: each puff runs out along the jet, growing and thinning, and starts again at its mouth. A jet that comes
    // in bursts lets go only the puffs that leave its mouth while it is on.
    for (const j of jets) {
      const run = j.length / JET_SPEED;
      j.puffs.forEach((sp, i) => {
        const t = (((time / run + i / j.puffs.length) % 1) + 1) % 1;
        // (Whether there is gas here now is asked of the same rule that says whether it pushes him: world/gusts.ts.)
        const on = gasAt(j, time, j.length * t);
        const left = time - t * run;
        // (Thick for most of its way, thinning quickly at its end.)
        const k = on ? Math.min(1, t / 0.05) * (1 - t * t * t) * 0.8 : 0;
        sp.visible = k > 0.004;
        // (It billows: each puff strays a little from the line as it goes, its own way.)
        const stray = j.width * 0.16 * t;
        sp.position.copy(j.from).addScaledVector(j.dir, j.length * t);
        sp.position.x += Math.sin(i * 2.4 + left * 1.7) * stray;
        sp.position.y += Math.cos(i * 1.9 + left * 2.3) * stray;
        sp.position.z += Math.sin(i * 3.1 + left * 1.3) * stray;
        const w = gasWidth(j, j.length * t);
        sp.scale.set(w, w, 1);
        (sp.material as THREE.SpriteMaterial).opacity = k;
      });
    }
    // Two crossing waves plus a small ripple. Amplitude stays under the floor top, so the water never pokes through.
    for (const { geo, base } of sheets) {
      const posAttr = geo.attributes.position;
      for (let i = 0; i < posAttr.count; i++) {
        const x = base[i * 3];
        const z = base[i * 3 + 2];
        const y =
          0.035 * (Math.sin(x * 0.9 + time * 1.6) + Math.cos(z * 1.3 - time * 1.1)) +
          0.015 * Math.sin((x + z) * 2.7 + time * 3.1);
        posAttr.setY(i, y);
      }
      posAttr.needsUpdate = true;
    }
    waterOffset.set(time * 0.03, time * 0.02);
    lavaOffset.set(time * 0.02, time * 0.012);
    for (const p of pyres) {
      // Each tongue stretches, shrinks and leans on its own beat.
      const k = 0.78 + 0.22 * Math.sin(time * 7.3 + p.phase) + 0.1 * Math.sin(time * 13.1 + p.phase * 2);
      p.mesh.scale.set(1 + 0.12 * Math.sin(time * 5 + p.phase), k, 1 + 0.12 * Math.cos(time * 6 + p.phase));
      p.mesh.position.set(p.x + 0.1 * Math.sin(time * 4.1 + p.phase), p.y + (p.h * k) / 2, p.z + 0.1 * Math.cos(time * 3.3 + p.phase));
      p.mesh.rotation.y = time * 1.7 + p.phase;
    }
    // The speaker cones thump on the kick of the groove (86 BPM, a kick every other beat).
    {
      const ph = (time * 86) / 60 / 2;
      const thump = Math.exp(-((ph % 1) * 7));
      for (const c of cones) c.mesh.scale.set(1 + c.dz * thump * 0.12, 1 + c.dz * thump, 1 + c.dz * thump * 0.12);
    }
    for (const a of animators) a(time);
    for (const b of blinkers) {
      const u = ((time + b.phase) % b.period) / b.period;
      b.obj.visible = u > 0.22;
      b.obj.scale.y = u > 0.6 && u < 0.6 + 0.1 / b.period ? 0.15 : 1;
    }
    for (const s of swayers) s.obj.rotation[s.axis] = Math.sin(time * s.speed + s.phase) * s.amount + Math.sin(time * s.speed * 2.3 + s.phase * 1.7) * s.amount * 0.3;
    for (const n of needles) n.obj.rotation.z = n.base + Math.sin(time * 23 + n.phase) * 0.03 + Math.sin(time * 1.3 + n.phase) * 0.12;
    for (const f of flames) {
      const k = 0.85 + 0.3 * Math.sin(time * 9 + f.phase) * Math.cos(time * 5.3 + f.phase * 2);
      f.mesh.scale.set(0.9 + 0.1 * k, k, 0.9 + 0.1 * k);
      f.mesh.position.y = f.base + (k - 1) * 0.5;
    }
    // The texture moves with the current. Plane u runs along x, v runs against z.
    for (const c of currents) c.offset.set((-time * c.flow[0]) / 4.67, (time * c.flow[1]) / 4.67);
    // v runs from the top of the curtain down, so a falling pattern needs the offset to go negative.
    fallOffset.set(0, -time * 1.6);
    for (const f of foam) {
      const k = 0.85 + 0.25 * Math.sin(time * 5 + f.phase);
      f.mesh.scale.set(k, 1, k);
    }
    for (const pp of pipeParts) {
      if (!pp.gush) continue;
      pp.gush.age += dt;
      const a = pp.gush.age;
      // It bursts out hard, then settles into a steady gush that pulses a little.
      const reach = Math.min(1, a / 0.25) * (1 + 0.06 * Math.sin(time * 9));
      const s = pp.spec;
      const sy = (s.y ?? 0) + JOINT_HI - 0.15;
      pp.gush.stream.position.set(s.x * (1 - reach), sy * (1 - reach), s.z * (1 - reach));
      pp.gush.stream.scale.setScalar(reach);
      pp.gush.puddle.scale.setScalar(Math.min(1.6, 0.2 + a * 0.7));
    }
    gates.forEach((gt, i) => {
      // (Shut again: down quicker than it went up; solid again once it is down.)
      if (!gt.open && gt.lift > 0) {
        gt.lift = Math.max(0, gt.lift - dt / 0.7);
        const gm = gateMeshes[i];
        const k = gt.lift * gt.lift * (3 - 2 * gt.lift);
        gm.bars.position.y = gm.baseY + k * (gt.spec.height - 0.4);
        if (gt.lift <= 0 && !colliders.includes(gm.aabb)) colliders.push(gm.aabb);
        return;
      }
      if (!gt.open || gt.lift >= 1) return;
      gt.lift = Math.min(1, gt.lift + dt / 1.6);
      const gm = gateMeshes[i];
      const k = gt.lift * gt.lift * (3 - 2 * gt.lift);
      gm.bars.position.y = gm.baseY + k * (gt.spec.height - 0.4);
      if (gt.lift >= 1) {
        const ci = colliders.indexOf(gm.aabb);
        if (ci >= 0) colliders.splice(ci, 1);
      }
    });
  };

  const breakCrate = (crate: Crate): void => {
    crate.alive = false;
    if (crate.type === 'pipe') {
      const pp = pipeParts[crate.index];
      pp.joint.visible = false;
      pp.broken.visible = true;
      startGush(crate.index);
      return;
    }
    const i = colliders.indexOf(crate.aabb);
    if (i >= 0) colliders.splice(i, 1);
    if (crate.mesh) crate.mesh.visible = false;
    dropAbove(crate);
  };

  const liftCrate = (crate: Crate): void => {
    const i = colliders.indexOf(crate.aabb);
    if (i >= 0) colliders.splice(i, 1);
    crate.lifted = true;
    const k = falling.findIndex((f) => f.crate === crate);
    if (k >= 0) falling.splice(k, 1);
    dropAbove(crate);
  };
  const moveCrate = (crate: Crate, x: number, y: number, z: number, yaw = 0): void => {
    const hx = (crate.aabb.max.x - crate.aabb.min.x) / 2;
    const hy = (crate.aabb.max.y - crate.aabb.min.y) / 2;
    const hz = (crate.aabb.max.z - crate.aabb.min.z) / 2;
    crate.x = x;
    crate.y = y;
    crate.z = z;
    crate.aabb.min.set(x - hx, y - hy, z - hz);
    crate.aabb.max.set(x + hx, y + hy, z + hz);
    const m = crate.mesh as unknown as THREE.Object3D | null;
    if (m) {
      m.position.set(x, y, z);
      m.rotation.y = yaw;
    }
  };
  const setCrate = (crate: Crate, x: number, y: number, z: number): void => {
    moveCrate(crate, x, y, z, 0);
    crate.lifted = false;
    if (crate.alive && !colliders.includes(crate.aabb)) colliders.push(crate.aabb);
  };

  // Whatever was stacked on a broken crate falls to the next thing below it.
  const falling: Array<{ crate: Crate; vy: number }> = [];
  const dropAbove = (under: Crate): void => {
    const top = under.aabb.max.y;
    for (const c of crates) {
      if (!c.alive || c.lifted || c === under || falling.some((f) => f.crate === c)) continue;
      const resting = Math.abs(c.aabb.min.y - top) < 0.06 && c.aabb.min.x < under.aabb.max.x - 0.05 && c.aabb.max.x > under.aabb.min.x + 0.05 && c.aabb.min.z < under.aabb.max.z - 0.05 && c.aabb.max.z > under.aabb.min.z + 0.05;
      if (resting) {
        falling.push({ crate: c, vy: 0 });
        dropAbove(c);
      }
    }
  };
  /** The height of the highest thing under a crate that is not the crate itself. */
  const floorUnder = (c: Crate): number => {
    let best = -Infinity;
    for (const b of colliders) {
      if (b === c.aabb || falling.some((f) => f.crate.aabb === b)) continue;
      if (b.min.x >= c.aabb.max.x - 0.05 || b.max.x <= c.aabb.min.x + 0.05 || b.min.z >= c.aabb.max.z - 0.05 || b.max.z <= c.aabb.min.z + 0.05) continue;
      if (b.max.y <= c.aabb.min.y + 0.05 && b.max.y > best) best = b.max.y;
    }
    return best;
  };
  const stepFalling = (dt: number): void => {
    for (let k = falling.length - 1; k >= 0; k--) {
      const f = falling[k];
      const c = f.crate;
      if (!c.alive) {
        falling.splice(k, 1);
        continue;
      }
      f.vy -= 22 * dt;
      const ground = floorUnder(c);
      let dy = f.vy * dt;
      let landed = false;
      if (c.aabb.min.y + dy <= ground) {
        dy = ground - c.aabb.min.y;
        landed = true;
      }
      c.aabb.min.y += dy;
      c.aabb.max.y += dy;
      c.y += dy;
      const m = c.mesh as unknown as THREE.Object3D | null;
      if (m) m.position.y += dy;
      if (landed) {
        falling.splice(k, 1);
        // Things that stood on this one have not moved relative to it; nothing more to do.
      }
    }
  };

  const openGate = (gate: Gate): void => {
    gate.open = true;
  };
  const closeGate = (gate: Gate): void => {
    gate.open = false;
  };

  const ranked: typeof lightDefs = [];
  /** `extra`: lights that come and go (a patch of flame, a firefly's lantern), besides the room's own. */
  const updateLights = (time: number, focus: THREE.Vector3, extra: ReadonlyArray<(typeof lightDefs)[number]> = []): void => {
    for (const b of bulbs) {
      const on = Math.sin(time * Math.PI * 2 * b.flash + b.phase) > -0.1;
      b.on.visible = on;
      b.off.visible = !on;
    }
    // The nearest few lights win; the rest are not sent to the shader.
    ranked.length = 0;
    ranked.push(...lightDefs, ...extra);
    ranked.sort((a, b) => (a.x - focus.x) ** 2 + (a.y - focus.y) ** 2 + (a.z - focus.z) ** 2 - ((b.x - focus.x) ** 2 + (b.y - focus.y) ** 2 + (b.z - focus.z) ** 2));
    for (let i = 0; i < MAX_LIGHTS; i++) {
      const L = ranked[i];
      const pos = ps1Uniforms.lightPos.value[i];
      const col = ps1Uniforms.lightCol.value[i];
      if (!L) {
        col.set(0, 0, 0);
        continue;
      }
      let k = L.power;
      if (L.flash > 0) k *= Math.sin(time * Math.PI * 2 * L.flash + L.phase) > -0.1 ? 1 : 0.12;
      if (L.flicker > 0) k *= 1 - L.flicker + L.flicker * Math.sin(time * 11 + L.phase) * Math.cos(time * 7.3 + L.phase * 2);
      pos.set(L.x, L.y, L.z, L.r);
      col.set(L.color.r * k, L.color.g * k, L.color.b * k);
    }
  };

  /** Gathers the still dressing (`gatherStill`): called by the game AFTER the room is layered (render/layering.ts). */
  const gather = (): void => {
    if (!CHAMBER_OPTIONS.gatherStill || stillRoots.length === 0) return;
    // Whatever any of the room's own clocks moves, shows or hides is left as it is.
    const moving = new Set<THREE.Object3D>();
    const add = (o: THREE.Object3D | null | undefined): void => void (o && moving.add(o));
    for (const x of spinners) add(x.o);
    for (const x of railBeads) add(x.o);
    for (const x of nodders) add(x.o);
    for (const x of flutterers) { add(x.o); x.wings.forEach(add); }
    for (const x of cones) add(x.mesh);
    for (const x of bulbs) { add(x.on); add(x.off); }
    for (const x of flames) add(x.mesh);
    for (const x of swayers) add(x.obj);
    for (const x of blinkers) add(x.obj);
    for (const x of needles) add(x.obj);
    for (const x of foam) add(x.mesh);
    for (const x of pyres) add(x.mesh);
    gatherStill(group, stillRoots, moving);
    stillRoots.length = 0;
  };
  /** He landed at (x, y, z), this hard (0..1): whatever answers a thump within reach does. Which kinds did. */
  const thump = (x: number, y: number, z: number, strength: number): JunkKind[] => {
    const heard: JunkKind[] = [];
    for (const k of knockables) {
      const d = Math.hypot(k.x - x, k.z - z);
      if (d > 2.5 || Math.abs(k.y - y) > 1.5) continue;
      // (Which way is away from him, in the thing's own turned space.)
      const ax = d > 1e-6 ? (k.x - x) / d : 1;
      const az = d > 1e-6 ? (k.z - z) / d : 0;
      const c = Math.cos(k.yaw);
      const sn = Math.sin(k.yaw);
      k.knock(strength * (1 - d / 2.5), clock, ax * c - az * sn, ax * sn + az * c);
      heard.push(k.what);
    }
    return heard;
  };
  const music = musicPads.length ? {
    pads: musicPads,
    show: (lit: readonly number[], down: readonly boolean[], flash: readonly number[], time: number): void => {
      musicLooks.forEach((m, i) => {
        // (A coil key just played: the nearest keyboard coil throws a bolt to it.)
        const pad = musicPads[i];
        if (pad.voice === 'coil' && lit[i] > 0.97 && (m.was ?? 0) <= 0.97) {
          const coil = hazardLooks.map((b, k) => [b, hazardSpecs[k]] as const).filter(([b]) => !!b.arcTo).sort((a, b2) => Math.hypot(a[1].x - pad.x, a[1].z - pad.z) - Math.hypot(b2[1].x - pad.x, b2[1].z - pad.z))[0];
          coil?.[0].arcTo?.(pad.x, pad.y + 0.05, pad.z, time);
        }
        m.was = lit[i];
        // Pressed: it goes down a little. Sounding: it glows, fading. Solved: its puzzle's pads flash.
        m.body.position.y = m.rest - (down[i] ? 0.035 : 0);
        const f = flash[i] > 0 ? 0.5 + 0.5 * Math.sin(time * 18) : 0;
        m.glow.opacity = Math.min(1, Math.max(lit[i] * 0.9, f * 0.8));
      });
    },
  } : undefined;
  const strike = strikeThings.length ? {
    things: strikeThings,
    show: (time: number): void => strikeLooks.forEach((b, i) => b.show(strikeThings[i], time)),
    remove: (index: number): void => {
      strikeThings[index].gone = true;
      const i = colliders.indexOf(strikeSolids[index]);
      if (i >= 0) colliders.splice(i, 1);
    },
  } : undefined;
  const hazards = hazardSpecs.length ? { specs: hazardSpecs, show: (time: number): void => hazardLooks.forEach((b) => b.show(time)) } : undefined;
  return { hazards, strike, music, thump, gather, group, colliders, crates, pipes, breakCrate, liftCrate, moveCrate, setCrate, gates, openGate, closeGate, water: layout.water, update, updateLights, movers, stepMovers, breakThin, carry, lava: layout.lava ?? [] };
}
