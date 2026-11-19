// THE STILL DRESSING GATHERED (world/chamber.ts gatherStill): fewer meshes, and EXACTLY the same picture. Every room
// is built twice, gathered and not, its clocks run (flames, banners, cones, bulbs), and what each draws is compared at
// several moments: per kind of material, how many corners, and the box round them all.
import './../src/core/colorSetup';
import * as THREE from 'three';
import { CHAMBER_OPTIONS, buildChamber } from '../src/world/chamber';
import { LEVELS, TEST_ROOMS } from '../src/levels/levels';
import { autoLayer } from '../src/render/layering';

let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}

/** A material's kind, the same in two builds of a room (its picture, which way it faces, whether it is lit or layered). */
const kindOf = (m: THREE.Material): string => {
  const u = (m as THREE.ShaderMaterial).uniforms;
  const tex = (u?.tex?.value as THREE.Texture | null | undefined) ?? (m as THREE.MeshBasicMaterial).map;
  // (A texture by its size: a sign's lettering is painted afresh for each build of the room, so its id differs.)
  const img = tex?.image as { width?: number; height?: number } | undefined;
  return [m.type, tex ? `${img?.width ?? 0}x${img?.height ?? 0}` : '', m.side, m.transparent, m.polygonOffsetFactor, m.polygonOffsetUnits, JSON.stringify(u?.color?.value ?? ''), (m as THREE.MeshBasicMaterial).color?.getHexString?.() ?? ''].join('|');
};
/** Per kind of material: how many corners, the sum of where they are, and of how far out they are (the rounding allowed). */
type Seen = Map<string, { n: number; s: [number, number, number]; a: number }>;
function drawn(root: THREE.Object3D): Seen {
  root.updateMatrixWorld(true);
  const per: Seen = new Map();
  const v = new THREE.Vector3();
  root.traverseVisible((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || Array.isArray(m.material)) return;
    const key = kindOf(m.material as THREE.Material);
    const e = per.get(key) ?? { n: 0, s: [0, 0, 0] as [number, number, number], a: 0 };
    const pos = m.geometry.attributes.position;
    const count = m.geometry.index ? m.geometry.index.count : pos.count;
    for (let i = 0; i < count; i++) {
      v.fromBufferAttribute(pos, m.geometry.index ? m.geometry.index.getX(i) : i).applyMatrix4(m.matrixWorld);
      e.s[0] += v.x; e.s[1] += v.y; e.s[2] += v.z;
      e.a += Math.abs(v.x) + Math.abs(v.y) + Math.abs(v.z);
    }
    e.n += count;
    per.set(key, e);
  });
  return per;
}
/**
 * The same, but for rounding: a joined shape is kept in single precision, so each corner may move by a millionth
 * of how far out it is. A flame a tenth of a unit shorter moves the sum by far more than that, however many corners.
 */
function differs(a: Seen, b: Seen): string | null {
  if (a.size !== b.size) return `${a.size} kinds of material against ${b.size}`;
  for (const [k, x] of a) {
    const y = b.get(k);
    if (!y) return `a material missing (${k.slice(0, 40)})`;
    if (x.n !== y.n) return `${x.n} corners against ${y.n} (${k.slice(0, 40)})`;
    const allow = 4e-7 * x.a + 1e-6;
    for (let q = 0; q < 3; q++) if (Math.abs(x.s[q] - y.s[q]) > allow) return `moved by ${Math.abs(x.s[q] - y.s[q]).toFixed(4)}, allowed ${allow.toFixed(4)} (${k.slice(0, 40)})`;
  }
  return null;
}
const meshCount = (root: THREE.Object3D): number => {
  let n = 0;
  root.traverseVisible((o) => { if ((o as THREE.Mesh).isMesh) n++; });
  return n;
};

const rooms = [...new Map([...TEST_ROOMS, ...LEVELS].map((l) => [l.id, l])).values()];
const differ: string[] = [];
let before = 0;
let after = 0;
for (const L of rooms) {
  // (As the game loads a room: layered, then gathered.)
  CHAMBER_OPTIONS.gatherStill = false;
  const plain = buildChamber(L as never);
  autoLayer(plain.group);
  plain.gather();
  CHAMBER_OPTIONS.gatherStill = true;
  const gathered = buildChamber(L as never);
  autoLayer(gathered.group);
  gathered.gather();
  before += meshCount(plain.group);
  after += meshCount(gathered.group);
  for (const t of [0, 0.37, 1.9, 4.2]) {
    plain.update(t);
    gathered.update(t);
    const why = differs(drawn(plain.group), drawn(gathered.group));
    if (why) {
      differ.push(`${L.id} at ${t}s: ${why}`);
      break;
    }
  }
}
CHAMBER_OPTIONS.gatherStill = true;
check(
  `every room (${rooms.length}) draws EXACTLY what it drew before its still dressing was gathered, as its flames, banners and lights move`,
  differ.length === 0,
  differ.join('; ')
);
check('...and is made of fewer meshes over them all', after < before, `${before} meshes to ${after}`);

console.log(failures ? `\n${failures} FAILED` : '\nall passed');
if (failures) process.exit(1);
