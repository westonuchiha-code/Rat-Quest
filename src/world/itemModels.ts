/**
 * The things he collects, as shapes: the cheese crumb, the bottle cap, the golden relic, the Golden Wedge, and the bits
 * of dressing they share (a shadow on the floor, a twinkle, the sparks of a pickup).
 *
 * They are small on the screen, so each is built to be known by its outline and two or three blocks of colour, and to
 * glint: every face is flat, and the material flashes a face as it turns to the light.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { createPs1Material } from '../render/ps1Material';

type V3 = [number, number, number];
type Paint = number | ((x: number, y: number, z: number, n: THREE.Vector3) => number);

/** Makes a shape faceted (every face flat, with its own normal) and paints each face one colour, chosen by where its middle is and which way it faces. */
export function facet(geo: THREE.BufferGeometry, color: Paint): THREE.BufferGeometry {
  const g = geo.index ? geo.toNonIndexed() : geo;
  if (g.attributes.uv) g.deleteAttribute('uv');
  g.computeVertexNormals();
  const pos = g.attributes.position;
  const nor = g.attributes.normal;
  const cols = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  const n = new THREE.Vector3();
  for (let i = 0; i + 2 < pos.count; i += 3) {
    const x = (pos.getX(i) + pos.getX(i + 1) + pos.getX(i + 2)) / 3;
    const y = (pos.getY(i) + pos.getY(i + 1) + pos.getY(i + 2)) / 3;
    const z = (pos.getZ(i) + pos.getZ(i + 1) + pos.getZ(i + 2)) / 3;
    n.fromBufferAttribute(nor, i);
    c.set(typeof color === 'number' ? color : color(x, y, z, n));
    for (let k = 0; k < 3; k++) cols.set([c.r, c.g, c.b], (i + k) * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  return g;
}

function merge(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const merged = mergeGeometries(parts);
  for (const p of parts) p.dispose();
  return merged;
}

/** Triangles, wound so each faces away from a point inside the shape. */
function shell(tris: V3[][], inside: V3): THREE.BufferGeometry {
  const pos: number[] = [];
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const n = new THREE.Vector3();
  const mid = new THREE.Vector3();
  const centre = new THREE.Vector3(...inside);
  for (const t of tris) {
    a.set(...t[0]);
    b.set(...t[1]);
    c.set(...t[2]);
    n.subVectors(b, a).cross(mid.subVectors(c, a));
    mid.copy(a).add(b).add(c).divideScalar(3).sub(centre);
    for (const v of n.dot(mid) < 0 ? [a, c, b] : [a, b, c]) pos.push(v.x, v.y, v.z);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  return g;
}

/** A flat many-sided disc lying on a surface: at `at`, facing along `normal`, lifted a hair off it. */
function stud(at: V3, normal: V3, r: number, sides: number, color: number, lift = 0.004): THREE.BufferGeometry {
  const n = new THREE.Vector3(...normal).normalize();
  const g = new THREE.CircleGeometry(r, sides);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), n));
  g.translate(at[0] + n.x * lift, at[1] + n.y * lift, at[2] + n.z * lift);
  return facet(g, color);
}

/** The material the lit collectibles share: flat faces that flash as they turn. */
export function itemMaterial(shine = 0.75): THREE.ShaderMaterial {
  return createPs1Material({ lit: true, shine });
}

// ---------------------------------------------------------------------------------------------------------------------
// Cheese crumb: a doorstop wedge of holey yellow cheese, about 0.45 long. Orange rind on its tall back, a slope down to a
// blunt nose with a bite out of it, and big dark holes in its sides and top.

const CHEESE = { body: 0xffd23a, light: 0xffe680, deep: 0xf0b01e, rind: 0xe07a1c, rindDark: 0xb85a12, hole: 0xb06a0a, holeRim: 0xffe9a0 };

export function crumbGeometry(): THREE.BufferGeometry {
  // Seen from above: a wedge with a bowed back (the rind) and a blunt nose. x runs nose-wards.
  const BACK = -0.2;
  const NOSE = 0.24;
  const HALF = 0.19;
  const top = (x: number): number => 0.25 - 0.17 * ((x - BACK) / (NOSE - BACK)); // tall at the rind, low at the nose
  // Outline, counter-clockwise from the back-left corner: three points across the bowed back, then the nose (blunt, two points).
  const outline: Array<[number, number]> = [[BACK, -HALF], [BACK - 0.035, 0], [BACK, HALF], [NOSE - 0.03, 0.04], [NOSE, -0.01], [NOSE - 0.06, -0.06]];
  const tris: V3[][] = [];
  const lo = (p: [number, number]): V3 => [p[0], 0, p[1]];
  const hi = (p: [number, number]): V3 => [p[0], top(p[0]), p[1]];
  for (let i = 0; i < outline.length; i++) {
    const a = outline[i];
    const b = outline[(i + 1) % outline.length];
    tris.push([lo(a), lo(b), hi(b)], [lo(a), hi(b), hi(a)]); // a wall
    if (i >= 1 && i < outline.length - 1) tris.push([lo(outline[0]), lo(a), lo(b)], [hi(outline[0]), hi(a), hi(b)]); // floor and top, as fans
  }
  const body = facet(shell(tris, [0, 0.08, 0]), (x, _y, _z, n) => {
    if (n.y > 0.7) return CHEESE.light; // the cut top
    if (n.y < -0.7) return CHEESE.deep;
    if (x < BACK + 0.02 && n.x < -0.5) return CHEESE.rind; // the back
    return CHEESE.body;
  });
  // A darker band of rind round the top edge of the back.
  const band = facet(new THREE.BoxGeometry(0.03, 0.035, HALF * 2 + 0.02).translate(BACK - 0.012, top(BACK) - 0.012, 0), CHEESE.rindDark);
  // Holes: each a dark many-sided disc with a pale crescent of rim beside it, big enough to read from across a room.
  const holes: THREE.BufferGeometry[] = [];
  const hole = (at: V3, normal: V3, r: number): void => {
    // (On a wall the dark sits a little low in its rim, so it reads as deep; on the top it sits in the middle.)
    const low = Math.abs(normal[1]) < 0.5 ? 0.006 : 0;
    holes.push(stud(at, normal, r * 1.22, 7, CHEESE.holeRim, 0.003), stud([at[0] + low, at[1] - low, at[2]], normal, r, 7, CHEESE.hole, 0.007));
  };
  // The side walls run from the back corners to the nose: their outward normals.
  const side = (s: number): V3 => {
    const dx = NOSE - 0.045 - BACK;
    const dz = (s > 0 ? 0.04 : -0.06) - s * HALF;
    return [-dz * s, 0, dx * s].map((v) => v / Math.hypot(dx, dz)) as V3;
  };
  const onSide = (s: number, u: number, y: number): V3 => {
    const x = BACK + u * (NOSE - 0.045 - BACK);
    const z = s * HALF + u * ((s > 0 ? 0.04 : -0.06) - s * HALF);
    return [x, y, z];
  };
  hole(onSide(1, 0.22, 0.12), side(1), 0.052);
  hole(onSide(1, 0.6, 0.065), side(1), 0.034);
  hole(onSide(-1, 0.35, 0.1), side(-1), 0.046);
  hole(onSide(-1, 0.72, 0.05), side(-1), 0.028);
  const slope: V3 = [0.17 / (NOSE - BACK), 1, 0];
  hole([-0.07, top(-0.07), 0.05], slope, 0.05);
  hole([0.08, top(0.08), -0.02], slope, 0.03);
  // Leaning back a little so the cut top shows, and centred on its middle.
  return merge([body, band, ...holes]).translate(0, -0.11, 0).rotateZ(0.22).rotateX(-0.18);
}

// ---------------------------------------------------------------------------------------------------------------------
// Bottle cap: a crown cap standing on its edge so it turns like a coin. Red enamel face with a white star, a crimped
// silver skirt, and a cork-lined underside.

const CAP = { enamel: 0xd03a2c, enamelDark: 0xa82a22, star: 0xfff4e0, steel: 0xc8d0d8, steelDark: 0x7a828c, steelLight: 0xf0f4f8, cork: 0xe8c080 };

export function capGeometry(): THREE.BufferGeometry {
  const R = 0.17;
  const H = 0.075;
  const FLUTES = 11;
  // The skirt: a flared band whose lower edge is crimped in and out.
  const skirt = new THREE.CylinderGeometry(R, R * 1.2, H, FLUTES * 2, 1, true);
  {
    const pos = skirt.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      if (pos.getY(i) > 0) continue;
      const ang = Math.atan2(pos.getZ(i), pos.getX(i));
      const k = Math.round((ang / (Math.PI * 2)) * FLUTES * 2);
      const r = R * (k % 2 === 0 ? 1.26 : 1.06);
      pos.setXYZ(i, Math.cos(ang) * r, pos.getY(i), Math.sin(ang) * r);
    }
  }
  const parts = [
    facet(skirt, (x, _y, z) => (Math.round((Math.atan2(z, x) / (Math.PI * 2)) * FLUTES * 2 + 0.5) % 2 === 0 ? CAP.steel : CAP.steelDark)),
    // The face: a bright bevel round the edge, the enamel, and a five-pointed star on it.
    facet(new THREE.CircleGeometry(R, FLUTES * 2).rotateX(-Math.PI / 2).translate(0, H / 2, 0), CAP.steelLight),
    facet(new THREE.CircleGeometry(R * 0.84, 12).rotateX(-Math.PI / 2).translate(0, H / 2 + 0.004, 0), (x, _y, z) => (x + z > 0.02 ? CAP.enamel : CAP.enamelDark)),
    // The underside: steel, with a disc of cork in it.
    // (Bright steel and pale cork: it turns like a coin, so its back is seen as much as its face.)
    facet(new THREE.CircleGeometry(R * 1.05, FLUTES * 2).rotateX(Math.PI / 2).translate(0, -H / 2 + 0.012, 0), CAP.steelLight),
    facet(new THREE.CircleGeometry(R * 0.8, 10).rotateX(Math.PI / 2).translate(0, -H / 2 + 0.008, 0), CAP.steel),
    facet(new THREE.CircleGeometry(R * 0.56, 10).rotateX(Math.PI / 2).translate(0, -H / 2 + 0.004, 0), CAP.cork),
  ];
  const star = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const r = R * (i % 2 === 0 ? 0.6 : 0.26);
    if (i === 0) star.moveTo(Math.sin(a) * r, Math.cos(a) * r);
    else star.lineTo(Math.sin(a) * r, Math.cos(a) * r);
  }
  parts.push(facet(new THREE.ShapeGeometry(star).rotateX(-Math.PI / 2).translate(0, H / 2 + 0.008, 0), CAP.star));
  // Up on its edge, face to the front, tipped back a touch.
  return merge(parts).rotateX(Math.PI / 2).rotateX(-0.16);
}

// ---------------------------------------------------------------------------------------------------------------------
// Golden relic: a cut gem of gold, eight-sided, with a flat table on top and a long point below; and a thin ring of gold
// that turns round it the other way.

const RELIC = { gold: 0xffc21a, pale: 0xfff3b0, amber: 0xe88a0c, deep: 0xb86a08, ring: 0xffd860 };

export function relicGeometry(): THREE.BufferGeometry {
  const gem = new THREE.LatheGeometry([[0.001, -0.33], [0.25, 0.03], [0.25, 0.07], [0.135, 0.19], [0.001, 0.19]].map(([r, y]) => new THREE.Vector2(r, y)), 8);
  return facet(gem, (x, y, z, n) => {
    const side = Math.round((Math.atan2(z, x) / (Math.PI * 2)) * 8 + 8) % 2;
    if (n.y > 0.9) return RELIC.pale; // the table
    if (y > 0.07) return side ? RELIC.pale : RELIC.gold; // the crown
    if (y > 0.02) return RELIC.deep; // the girdle
    return side ? RELIC.amber : RELIC.gold; // the long point
  });
}

/** The ring round a relic: thin, and square in section so its faces flash. */
export function relicRingGeometry(): THREE.BufferGeometry {
  return facet(new THREE.TorusGeometry(0.4, 0.02, 4, 14), (_x, _y, _z, n) => (Math.abs(n.z) > 0.5 ? RELIC.ring : RELIC.amber));
}

// ---------------------------------------------------------------------------------------------------------------------
// The Golden Wedge: the prize. A wedge of golden cheese standing on its point, chamfered so its edges catch the light,
// with a thick rind across its bowed top and deep holes in both faces. It is painted (not lit), so it glows the same in
// the dark and through fog, and can be seen from across a course.

const WEDGE = { top: 0xffdc5a, gold: 0xffc428, deep: 0xf09a14, edge: 0xfff2b0, under: 0xd8861c, rind: 0xd8861c, rindLight: 0xf0a83a, rindDark: 0xa8601a, hole: 0x9a5a10, holeRim: 0xffeeb0 };

/** The wedge's outline, seen face-on: the point at the bottom, the bowed top. */
function wedgeOutline(grow = 0): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(0, -0.55 - grow);
  s.lineTo(0.5 + grow, 0.28);
  s.quadraticCurveTo(0, 0.5 + grow, -0.5 - grow, 0.28);
  s.lineTo(0, -0.55 - grow);
  return s;
}

/**
 * The wedge as one painted shape. `tint(part)` picks the colours, so the pale ghost of a wedge already taken is the
 * same shape in other paint.
 */
export function wedgeGeometry(): THREE.BufferGeometry {
  const D = 0.3;
  const body = new THREE.ExtrudeGeometry(wedgeOutline(), { depth: D, bevelEnabled: true, bevelSize: 0.035, bevelThickness: 0.035, bevelSegments: 1, curveSegments: 6 });
  body.translate(0, 0, -D / 2);
  const parts: THREE.BufferGeometry[] = [
    facet(body, (_x, y, _z, n) => {
      if (Math.abs(n.z) > 0.95) return y > 0.12 ? WEDGE.top : y > -0.2 ? WEDGE.gold : WEDGE.deep; // the two faces, lighter towards the top
      if (Math.abs(n.z) > 0.3) return n.y > -0.2 ? WEDGE.edge : WEDGE.deep; // the chamfers: bright above, deep below
      return n.y > 0.5 ? WEDGE.rind : WEDGE.under; // the cut sides and the top
    }),
  ];
  // The rind: a thick band lying along the bowed top, standing proud of both faces, ridged.
  const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0.54, 0.29, 0), new THREE.Vector3(0, 0.535, 0), new THREE.Vector3(-0.54, 0.29, 0));
  const N = 7;
  for (let i = 0; i < N; i++) {
    const a = curve.getPoint(i / N);
    const b = curve.getPoint((i + 1) / N);
    const len = a.distanceTo(b) + 0.01;
    const slab = new THREE.BoxGeometry(len, 0.085, D + 0.16);
    slab.rotateZ(Math.atan2(b.y - a.y, b.x - a.x));
    slab.translate((a.x + b.x) / 2, (a.y + b.y) / 2 + 0.01, 0);
    parts.push(facet(slab, (_x, _y, _z, n) => (n.y > 0.5 ? (i % 2 ? WEDGE.rindLight : WEDGE.rind) : Math.abs(n.z) > 0.5 ? WEDGE.rind : WEDGE.rindDark)));
  }
  // Holes in both faces: a pale rim, and the dark of the hole set a little low in it so it reads as deep.
  const face = D / 2 + 0.035;
  for (const side of [1, -1]) {
    for (const [x, y, r] of [[-0.14, 0.09, 0.105], [0.17, 0.02, 0.07], [0.04, -0.2, 0.08], [0.2, 0.2, 0.04], [-0.07, -0.36, 0.045]] as const) {
      const sx = x * side;
      parts.push(stud([sx, y, face * side], [0, 0, side], r * 1.2, 9, WEDGE.holeRim, 0.004), stud([sx, y - r * 0.12, face * side], [0, 0, side], r, 9, WEDGE.hole, 0.008));
    }
  }
  return merge(parts);
}

// ---------------------------------------------------------------------------------------------------------------------
// Dressing they share.

/** A four-pointed star, flat, one unit from tip to middle: a twinkle. Faces +z. */
export function twinkleGeometry(): THREE.BufferGeometry {
  const s = new THREE.Shape();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const r = i % 2 === 0 ? 1 : 0.16;
    if (i === 0) s.moveTo(Math.sin(a) * r, Math.cos(a) * r);
    else s.lineTo(Math.sin(a) * r, Math.cos(a) * r);
  }
  return new THREE.ShapeGeometry(s);
}

/** A burst of thin rays round a middle, flat: the glory behind the Golden Wedge. Faces +z. */
export function raysGeometry(count = 10, inner = 0.55, outer = 1.5): THREE.BufferGeometry {
  const pos: number[] = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const w = (Math.PI / count) * 0.42;
    const far = outer * (i % 2 ? 0.72 : 1);
    pos.push(Math.sin(a - w) * inner, Math.cos(a - w) * inner, 0, Math.sin(a + w) * inner, Math.cos(a + w) * inner, 0, Math.sin(a) * far, Math.cos(a) * far, 0);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  return g;
}

/** A round shadow to lie on the floor under something that floats. One unit across; scale it. */
export function shadowGeometry(): THREE.BufferGeometry {
  return new THREE.CircleGeometry(0.5, 10).rotateX(-Math.PI / 2);
}

export function shadowMaterial(): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.32, depthWrite: false });
}

export function glowMaterial(color: number, opacity = 1): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
}

/** How big a twinkle is, `t` of the way through its flash (0..1): it snaps open and closes. */
export function twinkleSize(t: number): number {
  return t <= 0 || t >= 1 ? 0 : Math.sin(t * Math.PI) ** 0.6;
}

/**
 * The sparks of a pickup: a few twinkles thrown out in a ring from where the thing was, rising a little, shrinking to
 * nothing. One of these serves a whole level: `burst` starts some, `update` moves them.
 */
export class Sparks {
  readonly group = new THREE.Group();
  private readonly geo = twinkleGeometry();
  private readonly live: Array<{ mesh: THREE.Mesh; vx: number; vy: number; vz: number; age: number; life: number; size: number }> = [];
  private readonly mats = new Map<number, THREE.MeshBasicMaterial>();
  private seed = 1;

  /** `count` sparks of `color` from (x, y, z), flying out at about `speed`. */
  burst(x: number, y: number, z: number, color: number, count = 6, speed = 2.2, size = 0.16): void {
    let mat = this.mats.get(color);
    if (!mat) {
      mat = glowMaterial(color);
      this.mats.set(color, mat);
    }
    for (let i = 0; i < count; i++) {
      // (Its own dice, so a pickup looks the same every time and nothing here touches the game's.)
      this.seed = (this.seed * 1103515245 + 12345) % 2147483648;
      const r = this.seed / 2147483648;
      const a = ((i + r * 0.6) / count) * Math.PI * 2;
      const mesh = new THREE.Mesh(this.geo, mat);
      mesh.position.set(x, y, z);
      this.group.add(mesh);
      this.live.push({ mesh, vx: Math.cos(a) * speed, vy: speed * (0.5 + r * 0.8), vz: Math.sin(a) * speed, age: 0, life: 0.34 + r * 0.16, size: size * (0.7 + r * 0.6) });
    }
  }

  get count(): number {
    return this.live.length;
  }

  /** `face`: the camera's turn, so each spark is seen flat-on. */
  update(dt: number, face?: THREE.Quaternion): void {
    for (let i = this.live.length - 1; i >= 0; i--) {
      const s = this.live[i];
      s.age += dt;
      if (s.age >= s.life) {
        this.group.remove(s.mesh);
        this.live.splice(i, 1);
        continue;
      }
      const k = s.age / s.life;
      const drag = 1 - k * 0.8;
      s.mesh.position.x += s.vx * drag * dt;
      s.mesh.position.y += (s.vy * drag - 2.5 * k) * dt;
      s.mesh.position.z += s.vz * drag * dt;
      s.mesh.scale.setScalar(s.size * (1 - k * k));
      if (face) s.mesh.quaternion.copy(face);
      s.mesh.rotateZ(s.age * 6);
    }
  }

  dispose(): void {
    this.geo.dispose();
    for (const m of this.mats.values()) m.dispose();
  }
}
