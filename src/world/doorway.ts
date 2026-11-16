/**
 * The exit door: a stone arch with a heavy door in it, set into the wall. It is not drawn until the level's goals are done;
 * then it grows out of the wall. A thin line of light traces its outline first (dust and sparkles drift off it), then the
 * threshold and the arch's stones push out of the wall one after another, bottom to top, and last the door itself slides out,
 * with warm light spilling from the crack round its edge onto the floor.
 * `setReveal(sparkle, fade, time)`: sparkle 0..1 is the outline lighting up, fade 0..1 is the growing. 1, 1 is a finished door.
 * The stone, timber and iron follow the level's theme, so it looks like it belongs to the room.
 */
import * as THREE from 'three';
import { bakeVertexColor, createPs1Material } from '../render/ps1Material';
import { getTexture } from '../render/textures';
import type { TextureName } from '../render/textures';
import { DOOR_FRAME, type DoorSpec } from './rooms';

type Theme = 'sewer' | 'mine' | 'cave' | 'dungeon' | 'foundry' | 'keep';

interface Look {
  frame: TextureName;
  key: TextureName;
  leaf: TextureName;
  /** Wooden doors get iron bands; the iron door has its own. */
  bands: boolean;
  /** How much lighter than the wall it is made, so the frame stands out from it. */
  bright: number;
}

export const DOOR_LOOKS: Record<Theme, Look> = {
  sewer: { frame: 'concreteSlab', key: 'archTrim', leaf: 'ironDoor', bands: false, bright: 1.7 },
  mine: { frame: 'rubbleWall', key: 'beamSide', leaf: 'planks', bands: true, bright: 1.6 },
  // (Its keystone is the arch's own stone. It was wet rock, the dark stone of the cave's walls: over a pale arch it
  // read as a block of wall stuck on the top of the door. The owner, 2026-11-16.)
  cave: { frame: 'sandstone', key: 'sandstone', leaf: 'planks', bands: true, bright: 1.5 },
  dungeon: { frame: 'stone', key: 'brick', leaf: 'ironDoor', bands: false, bright: 1.5 },
  foundry: { frame: 'rustPlate', key: 'hazardTrim', leaf: 'ironDoor', bands: false, bright: 1.6 },
  keep: { frame: 'keepStone', key: 'archTrim', leaf: 'ironDoor', bands: false, bright: 1.6 },
};

const SPARKLES = 150;
const OUTLINE = 90; // the first sparkles trace the arch, the rest drift inside it
const DEPTH = DOOR_FRAME.depth; // how deep each stone is: it starts this far back inside the wall
const GLOW_LO = 0xffb347;
const GLOW_HI = 0xfff2b8;

function archShape(w: number, h: number): THREE.Shape {
  const r = w / 2;
  const s = new THREE.Shape();
  s.moveTo(-r, 0);
  s.lineTo(r, 0);
  s.lineTo(r, h - r);
  s.absarc(0, h - r, r, 0, Math.PI, false);
  s.lineTo(-r, 0);
  return s;
}

/** A point on the arch's outline, going up the left side, over the top and down the right. */
function outlinePoint(w: number, h: number, f: number): [number, number] {
  const r = w / 2;
  const straight = h - r;
  const arc = Math.PI * r;
  const total = straight * 2 + arc;
  let d = f * total;
  if (d < straight) return [-r, d];
  d -= straight;
  if (d < arc) {
    const a = Math.PI - (d / arc) * Math.PI;
    return [Math.cos(a) * r, straight + Math.sin(a) * r];
  }
  d -= arc;
  return [r, straight - d];
}

const smooth = (a: number, b: number, t: number): number => {
  const k = Math.min(1, Math.max(0, (t - a) / (b - a)));
  return k * k * (3 - 2 * k);
};

/** One stone of the frame: where it ends up, and when in the growing it pushes out. */
interface Block {
  mesh: THREE.Mesh;
  x: number;
  y: number;
  z: number;
  start: number;
  /** A little twist it settles out of as it arrives. */
  twist: number;
}

export class Doorway {
  readonly group = new THREE.Group();
  /** False: a shut door with no light round its edge (a locked course door). */
  lit = true;
  private readonly blocks: Block[] = [];
  private readonly leaf = new THREE.Group();
  private readonly crack: THREE.Mesh;
  private readonly crackMat: THREE.MeshBasicMaterial;
  private readonly slit: THREE.Mesh;
  private readonly slitMat: THREE.MeshBasicMaterial;
  private readonly spill: THREE.Mesh;
  private readonly spillMat: THREE.MeshBasicMaterial;
  private readonly sparkleA: THREE.Points;
  private readonly sparkleB: THREE.Points;
  private readonly base = new Float32Array(SPARKLES * 3);
  private readonly pos = new Float32Array(SPARKLES * 3);
  private readonly pos2 = new Float32Array(SPARKLES * 3);

  constructor(readonly spec: DoorSpec, theme: Theme = 'sewer') {
    const { width: w, height: h } = spec;
    const look = DOOR_LOOKS[theme];
    const r = w / 2;
    const straight = h - r; // height where the arch begins
    const t = DOOR_FRAME.jamb; // how thick the stone frame is, either side of the opening
    const lift = new THREE.Color().setRGB(look.bright, look.bright, look.bright);
    const frameMat = createPs1Material({ tex: getTexture(look.frame), color: lift });
    const keyMat = createPs1Material({ tex: getTexture(look.key), color: lift });
    const leafMat = createPs1Material({ tex: getTexture(look.leaf) });
    const plain = createPs1Material({});

    // ---- The frame: a step, two jambs of stacked stones and an arch of wedge stones. ----
    let order = 0;
    const addBlock = (geo: THREE.BufferGeometry, mat: THREE.ShaderMaterial, x: number, y: number, z: number, rotZ: number, rank: number, shade: number): void => {
      bakeVertexColor(geo, new THREE.Color(shade, shade, shade));
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.z = rotZ;
      this.group.add(mesh);
      this.blocks.push({ mesh, x, y, z, start: rank, twist: (((order++ * 37) % 11) - 5) * 0.012 });
    };
    const jitter = (i: number): number => 0.86 + (((i * 53) % 17) / 17) * 0.2;
    const rows = 4;
    const rowH = straight / rows;
    // The step at the foot comes first.
    const st = DOOR_FRAME.step;
    addBlock(new THREE.BoxGeometry(w + 2 * t + st.extra, st.height, st.depth), frameMat, 0, st.height / 2, st.out, 0, 0, 0.95);
    for (let i = 0; i < rows; i++) {
      for (const sx of [-1, 1]) {
        const stagger = i % 2 ? DOOR_FRAME.stagger : 0; // alternate courses overhang a little, like laid stone
        addBlock(new THREE.BoxGeometry(t + stagger, rowH * 0.97, DEPTH), frameMat, sx * (r + (t + stagger) / 2), rowH * (i + 0.5), DOOR_FRAME.out, 0, 0.06 + (i / rows) * 0.38, jitter(i * 2 + (sx > 0 ? 1 : 0)));
      }
    }
    const wedges = 7;
    for (let i = 0; i < wedges; i++) {
      const theta = Math.PI - ((i + 0.5) * Math.PI) / wedges; // from the left, over the top
      const mid = r + t / 2;
      const key = i === (wedges - 1) / 2;
      const len = ((mid * Math.PI) / wedges) * 1.04;
      const geo = new THREE.BoxGeometry(key ? t * 1.35 : t, key ? len * 1.15 : len, key ? DEPTH + 0.18 : DEPTH);
      addBlock(geo, key ? keyMat : frameMat, Math.cos(theta) * (mid + (key ? t * 0.17 : 0)), straight + Math.sin(theta) * (mid + (key ? t * 0.17 : 0)), key ? 0.24 : 0.15, theta, 0.44 + (i / wedges) * 0.3, jitter(i + 7));
    }

    // ---- The crack of light round the outline, on the flat wall, before anything moves. ----
    const outer = archShape(w + 0.16, h + 0.08);
    outer.holes.push(new THREE.Path(archShape(w, h).getPoints(12)));
    this.crackMat = new THREE.MeshBasicMaterial({ color: 0xffe9a0, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    this.crack = new THREE.Mesh(new THREE.ShapeGeometry(outer, 12), this.crackMat);
    this.crack.position.set(0, -0.02, -0.07);
    this.group.add(this.crack);

    // ---- Light behind the door, seen only as a slit round its edge. ----
    const slitGeo = new THREE.ShapeGeometry(archShape(w, h), 12);
    const sp = slitGeo.attributes.position;
    const sc = new Float32Array(sp.count * 3);
    const lo = new THREE.Color(GLOW_LO);
    const hi = new THREE.Color(GLOW_HI);
    const c = new THREE.Color();
    for (let i = 0; i < sp.count; i++) {
      c.copy(lo).lerp(hi, Math.min(1, Math.max(0, sp.getY(i) / h)));
      sc.set([c.r, c.g, c.b], i * 3);
    }
    slitGeo.setAttribute('color', new THREE.BufferAttribute(sc, 3));
    this.slitMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0 });
    this.slit = new THREE.Mesh(slitGeo, this.slitMat);
    this.slit.position.set(0, 0, -0.06);
    this.group.add(this.slit);

    // ---- The door: an arched slab, a little narrower than the opening so light shows round it. ----
    const lw = w - 0.2;
    const lh = h - 0.06;
    const slabGeo = new THREE.ExtrudeGeometry(archShape(lw, lh), { depth: 0.16, bevelEnabled: false, curveSegments: 10 });
    const up = slabGeo.attributes.uv;
    const pp = slabGeo.attributes.position;
    for (let i = 0; i < up.count; i++) up.setXY(i, pp.getX(i) / lw + 0.5, pp.getY(i) / lh);
    bakeVertexColor(slabGeo, 0xffffff);
    this.leaf.add(new THREE.Mesh(slabGeo, leafMat));
    if (look.bands) {
      for (const by of [0.55, straight - 0.2]) {
        const band = new THREE.BoxGeometry(lw - 0.04, 0.16, 0.05);
        band.translate(0, by, 0.18);
        this.leaf.add(new THREE.Mesh(bakeVertexColor(band, 0x2a2a30), plain));
      }
      const post = new THREE.BoxGeometry(0.06, lh - 0.5, 0.04);
      post.translate(0, (lh - 0.5) / 2 + 0.1, 0.17);
      this.leaf.add(new THREE.Mesh(bakeVertexColor(post, 0x2a2a30), plain));
    }
    // An iron ring pull on the right-hand side.
    const ring = new THREE.TorusGeometry(0.15, 0.03, 5, 10);
    ring.translate(r - 0.5, 1.45, 0.24);
    this.leaf.add(new THREE.Mesh(bakeVertexColor(ring, 0x55555c), plain));
    const stud = new THREE.BoxGeometry(0.16, 0.16, 0.06);
    stud.translate(r - 0.5, 1.62, 0.2);
    this.leaf.add(new THREE.Mesh(bakeVertexColor(stud, 0x404048), plain));
    this.group.add(this.leaf);

    // ---- Light spilling out over the floor in front of the door. ----
    const spillGeo = new THREE.PlaneGeometry(w + 0.2, 2.6, 1, 1);
    spillGeo.rotateX(-Math.PI / 2);
    spillGeo.translate(0, 0.03, 1.4);
    const spc = new Float32Array(4 * 3);
    // Vertices run back-left, back-right, front-left, front-right of the plane: bright at the door, dark at the far edge.
    const bright = new THREE.Color(0xffd890);
    const dark = new THREE.Color(0x000000);
    [bright, bright, dark, dark].forEach((col, i) => spc.set([col.r, col.g, col.b], i * 3));
    spillGeo.setAttribute('color', new THREE.BufferAttribute(spc, 3));
    this.spillMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    this.spill = new THREE.Mesh(spillGeo, this.spillMat);
    this.group.add(this.spill);

    // ---- Dust and sparkles in the door's own space. The first ones trace the outline. ----
    for (let i = 0; i < SPARKLES; i++) {
      let x: number;
      let y: number;
      if (i < OUTLINE) [x, y] = outlinePoint(w + 0.3, h + 0.15, i / OUTLINE);
      else {
        x = (Math.sin(i * 12.9898) * 43758.5453 % 1) * (w - 0.3);
        y = Math.abs(Math.sin(i * 78.233) * 24634.6345 % 1) * (h - 0.4) + 0.2;
        x = ((x % (w - 0.3)) + (w - 0.3)) % (w - 0.3) - (w - 0.3) / 2;
      }
      this.base.set([x, Math.max(0.05, y), 0.25 + (i % 5) * 0.06], i * 3);
    }
    const makePoints = (color: number, size: number, arr: Float32Array): THREE.Points => {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
      const pts = new THREE.Points(
        geo,
        new THREE.PointsMaterial({ color, size, sizeAttenuation: false, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }),
      );
      pts.frustumCulled = false;
      return pts;
    };
    this.sparkleA = makePoints(0xffe3a0, 4, this.pos);
    this.sparkleB = makePoints(0xc8c0a8, 3, this.pos2); // grey dust shaken out of the wall
    this.group.add(this.sparkleA, this.sparkleB);

    this.group.position.set(spec.x, spec.y ?? 0, spec.z);
    this.group.rotation.y = spec.yaw;
    this.setReveal(0, 0, 0);
  }

  /** @param sparkle 0..1 how much of the outline is lit; @param fade 0..1 how far it has grown out of the wall. */
  setReveal(sparkle: number, fade: number, time: number): void {
    this.group.visible = sparkle > 0 || fade > 0;

    // The line of light on the wall, then it is covered as the stones come out.
    this.crackMat.opacity = sparkle * (0.55 + 0.2 * Math.sin(time * 6)) * (1 - smooth(0.05, 0.3, fade));
    this.crack.visible = this.crackMat.opacity > 0.01;

    // Stones push out one after another (the ones with a smaller `start` first), each easing out and settling.
    for (const b of this.blocks) {
      const p = smooth(b.start, b.start + 0.26, fade);
      b.mesh.visible = p > 0;
      const back = (DEPTH + 0.1) * (1 - p);
      b.mesh.position.set(b.x, b.y, b.z - back);
      b.mesh.rotation.y = b.twist * (1 - p) * 6;
    }
    // The door slides out last.
    const lp = smooth(0.62, 0.97, fade);
    this.leaf.visible = lp > 0;
    this.leaf.position.set(0, 0.03, -0.55 * (1 - lp) + 0.02);

    // Light round its edge, and on the floor once it is out.
    const glow = smooth(0.7, 1, fade) * (this.lit ? 1 : 0);
    const pulse = 0.88 + 0.12 * Math.sin(time * 2.2);
    this.slit.visible = glow > 0;
    this.slitMat.opacity = glow;
    this.slitMat.color.setRGB(pulse, pulse, pulse);
    this.spill.visible = glow > 0;
    this.spillMat.opacity = glow * 0.32 * pulse;

    // Dust and sparkles: drift up a little and twinkle; once the door is solid only a few linger.
    const shown = Math.ceil(SPARKLES * sparkle);
    const keep = 1 - 0.75 * smooth(0.6, 1, fade);
    for (let i = 0; i < SPARKLES; i++) {
      const bx = this.base[i * 3];
      const by = this.base[i * 3 + 1];
      const bz = this.base[i * 3 + 2];
      const rise = ((time * 0.35 + i * 0.137) % 1) * 0.35;
      this.pos[i * 3] = bx + Math.sin(time * 1.7 + i) * 0.05;
      this.pos[i * 3 + 1] = by + rise * (i < OUTLINE ? 0.3 : 1);
      this.pos[i * 3 + 2] = bz;
      // Dust falls from the wall as the stones come out.
      this.pos2[i * 3] = bx + Math.cos(time * 2.1 + i * 1.3) * 0.06;
      this.pos2[i * 3 + 1] = Math.max(0.03, by - ((time * 0.6 + i * 0.211) % 1) * 0.7 * Math.min(1, fade * 3));
      this.pos2[i * 3 + 2] = bz + 0.03;
    }
    for (const [pts, phase] of [[this.sparkleA, 0], [this.sparkleB, 2.1]] as const) {
      pts.geometry.setDrawRange(0, shown);
      pts.geometry.attributes.position.needsUpdate = true;
      (pts.material as THREE.PointsMaterial).opacity = sparkle > 0 ? keep * (0.55 + 0.45 * Math.sin(time * 13 + phase)) : 0;
    }
  }
}
