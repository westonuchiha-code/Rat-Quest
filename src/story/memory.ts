/**
 * Where memories are staged: a few small sets built far below the level, and the two rats who play in them,
 * the knight as he was ('young') and his old partner ('friend'). A scene cuts the camera down here, tinted warm,
 * and cuts back. Also the small keepsakes he finds that set a memory off.
 */
import * as THREE from 'three';
import { createPs1Material } from '../render/ps1Material';
import { RatModel } from '../player/ratModel';
import { STAGE } from './scenes';

const flat = createPs1Material({});
const glow = (color: number, opacity = 1): THREE.MeshBasicMaterial => new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, fog: false });

function tint(geo: THREE.BufferGeometry, color: number): THREE.BufferGeometry {
  const c = new THREE.Color(color);
  const n = geo.attributes.position.count;
  const cols = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) cols.set([c.r, c.g, c.b], i * 3);
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  return geo;
}

/** A plain block from its extents, top face at `top`. */
function slab(x0: number, x1: number, z0: number, z1: number, top: number, bottom: number, color: number): THREE.Mesh {
  const m = new THREE.Mesh(tint(new THREE.BoxGeometry(x1 - x0, top - bottom, z1 - z0, 4, 1, 4), color), flat);
  m.position.set((x0 + x1) / 2, (top + bottom) / 2, (z0 + z1) / 2);
  return m;
}

/** Two figures before a far-off lit doorway. Seen from behind. */
function doorwaySet(): THREE.Group {
  const g = new THREE.Group();
  g.add(slab(-6, 6, -9, 5, 0, -0.5, 0x2c2a30));
  g.add(slab(-6, 6, -9.6, -9, 7, 0, 0x17161c));
  const door = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 3.5), glow(0xffeebb));
  door.position.set(0, 1.75, -8.97);
  g.add(door);
  const arch = new THREE.Mesh(new THREE.CircleGeometry(1.1, 10, 0, Math.PI), glow(0xffeebb));
  arch.position.set(0, 3.5, -8.97);
  g.add(arch);
  // Light from the doorway lying along the floor towards them.
  const spill = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 8), glow(0xffe6a0, 0.16));
  spill.rotation.x = -Math.PI / 2;
  spill.position.set(0, 0.02, -5);
  g.add(spill);
  return g;
}

/** Two ledges with a drop between them. Seen from the side. */
function gapSet(): THREE.Group {
  const g = new THREE.Group();
  g.add(slab(-3, 3, 1.1, 6, 0, -6, 0x34322f));
  g.add(slab(-3, 3, -6, -1.1, 0, -6, 0x34322f));
  g.add(slab(-4.6, -4, -7, 7, 7, -6, 0x191a1e));
  const haze = new THREE.Mesh(new THREE.PlaneGeometry(6, 2.2), glow(0x0a0a0c));
  haze.rotation.x = -Math.PI / 2;
  haze.position.set(0, -3, 0);
  g.add(haze);
  return g;
}

/** A quiet corner with one warm light: for the scarf, and later the campfire. */
function cornerSet(fire: boolean): THREE.Group {
  const g = new THREE.Group();
  g.add(slab(-5, 5, -3, 4, 0, -0.5, 0x2e2a28));
  g.add(slab(-5, 5, -3.6, -3, 6, 0, 0x1a1718));
  if (fire) {
    for (let i = 0; i < 3; i++) {
      const log = new THREE.Mesh(tint(new THREE.CylinderGeometry(0.05, 0.05, 0.5, 5), 0x4a3320), flat);
      log.rotation.z = Math.PI / 2;
      log.rotation.y = (i * Math.PI) / 3;
      log.position.set(1.0, 0.05, 0.75);
      g.add(log);
    }
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.34, 5), glow(0xffa030));
    flame.position.set(1.0, 0.24, 0.75);
    flame.name = 'flame';
    g.add(flame);
    const core = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.2, 4), glow(0xfff0a0));
    core.position.set(1.0, 0.19, 0.75);
    core.name = 'flame';
    g.add(core);
  } else {
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.16, 6, 5), glow(0xffd890));
    lamp.position.set(0, 2.5, -2.6);
    g.add(lamp);
  }
  return g;
}

/** The kingdom seen from high above once the Engine runs true: every ring lit and steady, every lamp burning. */
function vistaSet(): THREE.Group {
  const g = new THREE.Group();
  const disc = new THREE.Group();
  const R = 9;
  const ring = (r0: number, r1: number, color: number, seg: number): void => void disc.add(new THREE.Mesh(new THREE.RingGeometry(R * r0, R * r1, seg), glow(color)));
  ring(0.93, 1, 0x2f8a96, 28);
  ring(0.62, 0.66, 0x3fa4b0, 22);
  ring(0.36, 0.4, 0x2f8a96, 16);
  ring(0.15, 0.19, 0x3fa4b0, 10);
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    const spoke = new THREE.Mesh(new THREE.PlaneGeometry(R * 0.8, R * 0.014), glow(0x2a7a86));
    spoke.position.set(Math.cos(a) * R * 0.56, Math.sin(a) * R * 0.56, 0);
    spoke.rotation.z = a;
    disc.add(spoke);
  }
  const heart = new THREE.Mesh(new THREE.CircleGeometry(R * 0.1, 10), glow(0x9fe8f0));
  heart.position.z = 0.05;
  disc.add(heart);
  let sd = 11;
  const rnd = (): number => ((sd = (sd * 16807) % 2147483647) / 2147483647);
  for (let k = 0; k < 90; k++) {
    const a = rnd() * Math.PI * 2;
    const rr = R * (1.12 + rnd() * 1.6);
    const lamp = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.22), glow(rnd() < 0.8 ? 0xf0b84a : 0xffe0a0));
    lamp.position.set(Math.cos(a) * rr, Math.sin(a) * rr, 0.02 + rnd() * 1.5);
    disc.add(lamp);
  }
  disc.rotation.x = -Math.PI / 2;
  g.add(disc);
  return g;
}

export type KeepsakeKind = 'compass' | 'charm' | 'lantern' | 'pack';

/** A wedge of cheese, for a tax collector to carry. */
export function buildCheese(): THREE.Group {
  const g = new THREE.Group();
  const wedge = new THREE.Mesh(tint(new THREE.CylinderGeometry(0.13, 0.13, 0.1, 3, 1, false, 0, Math.PI * 0.7), 0xe8b93a), flat);
  wedge.position.set(0, -0.02, 0.06);
  g.add(wedge);
  return g;
}

/** A small thing from the old days, sized to sit in a paw. */
export function buildKeepsake(kind: KeepsakeKind): THREE.Group {
  const g = new THREE.Group();
  if (kind === 'compass') {
    const body = new THREE.Mesh(tint(new THREE.CylinderGeometry(0.06, 0.06, 0.025, 8), 0xb08a3a), flat);
    g.add(body);
    const face = new THREE.Mesh(tint(new THREE.CylinderGeometry(0.047, 0.047, 0.027, 8), 0xe6dcc0), flat);
    g.add(face);
    const needle = new THREE.Mesh(tint(new THREE.BoxGeometry(0.012, 0.03, 0.075), 0xa5302a), flat);
    g.add(needle);
  } else if (kind === 'pack') {
    // A small travelling pack: worn leather, a buckled flap, one strap hanging loose.
    g.add(new THREE.Mesh(tint(new THREE.BoxGeometry(0.15, 0.13, 0.08), 0x6e4b2c), flat));
    const flap = new THREE.Mesh(tint(new THREE.BoxGeometry(0.16, 0.06, 0.09), 0x553820), flat);
    flap.position.y = 0.045;
    g.add(flap);
    const buckle = new THREE.Mesh(tint(new THREE.BoxGeometry(0.03, 0.03, 0.01), 0xb08a3a), flat);
    buckle.position.set(0, 0.02, 0.046);
    g.add(buckle);
    const strap = new THREE.Mesh(tint(new THREE.BoxGeometry(0.02, 0.16, 0.012), 0x553820), flat);
    strap.position.set(0.06, -0.1, -0.03);
    strap.rotation.z = 0.25;
    g.add(strap);
  } else if (kind === 'lantern') {
    // A small travelling lantern, its glass gone and its frame bent.
    const base = new THREE.Mesh(tint(new THREE.CylinderGeometry(0.05, 0.055, 0.02, 6), 0x5a4a30), flat);
    base.position.y = -0.05;
    g.add(base);
    const cap = new THREE.Mesh(tint(new THREE.ConeGeometry(0.06, 0.045, 6), 0x5a4a30), flat);
    cap.position.y = 0.06;
    cap.rotation.z = 0.25;
    g.add(cap);
    for (let i = 0; i < 3; i++) {
      const bar = new THREE.Mesh(tint(new THREE.BoxGeometry(0.008, 0.1, 0.008), 0x3a3026), flat);
      bar.position.set(Math.cos(i * 2.1) * 0.042, 0, Math.sin(i * 2.1) * 0.042);
      bar.rotation.z = i === 1 ? 0.3 : 0;
      g.add(bar);
    }
    const ring = new THREE.Mesh(tint(new THREE.TorusGeometry(0.022, 0.005, 4, 6), 0x3a3026), flat);
    ring.position.y = 0.095;
    g.add(ring);
  } else {
    // A little carved wooden whistle on a loop of red thread.
    const wood = new THREE.Mesh(tint(new THREE.BoxGeometry(0.035, 0.035, 0.11), 0x8a6a40), flat);
    g.add(wood);
    const notch = new THREE.Mesh(tint(new THREE.BoxGeometry(0.037, 0.012, 0.025), 0x3a2a18), flat);
    notch.position.set(0, 0.014, 0.02);
    g.add(notch);
    const loop = new THREE.Mesh(tint(new THREE.TorusGeometry(0.035, 0.007, 4, 8), 0xb8352c), flat);
    loop.position.set(0, 0, -0.085);
    loop.rotation.y = Math.PI / 2;
    g.add(loop);
  }
  return g;
}

export class MemoryStage {
  readonly group = new THREE.Group();
  /** The cast, by the names scenes use. */
  readonly cast: Record<string, RatModel>;
  private readonly sets: Record<string, THREE.Group>;
  private shown: string | null = null;

  constructor() {
    this.group.position.set(STAGE.x, STAGE.y, STAGE.z);
    this.sets = { doorway: doorwaySet(), gap: gapSet(), gift: cornerSet(false), campfire: cornerSet(true), vista: vistaSet() };
    for (const s of Object.values(this.sets)) {
      s.visible = false;
      this.group.add(s);
    }
    // The knight as he was: the same rat, a little smaller, no sword or shield yet, and no scarf until it is given.
    const young = new RatModel();
    young.setDress({ gear: false, scarf: false });
    // His partner: grey-violet fur and a dark tunic, bare-headed, and wearing the red scarf that is his to give.
    const friend = new RatModel({ fur: 0x6e5e80, furDark: 0x574a68, cream: 0xcfc4d8, tunic: 0x3a2c50, tunicDark: 0x281e3a });
    friend.setDress({ gear: false, helmet: false });
    for (const r of [young, friend]) r.root.scale.setScalar(0.9);
    // Two of the king's tax collectors: grey rats in royal purple with dark helmets, each carrying a wedge of cheese.
    const guards = [0, 1].map(() => {
      const g = new RatModel({ fur: 0x7a7480, furDark: 0x5e5964, tunic: 0x4a2f6a, tunicDark: 0x35204e, scarf: 0x2a2030 });
      g.setHelmet({ dome: 0x4a4458, rim: 0x2e2a38, spike: 0x8a6aa0 });
      g.setDress({ gear: false });
      g.setHeld(buildCheese());
      return g;
    });
    this.cast = { young, friend, guardA: guards[0], guardB: guards[1] };
    for (const r of Object.values(this.cast)) r.root.visible = false;
  }

  /** The rats are not children of the stage (they are placed in world space), so they are added to the scene themselves. */
  addTo(scene: THREE.Scene): void {
    scene.add(this.group);
    for (const r of Object.values(this.cast)) scene.add(r.root);
  }

  show(set: string | null, time = 0): void {
    if (set !== this.shown) {
      if (this.shown) this.sets[this.shown].visible = false;
      this.shown = set && this.sets[set] ? set : null;
      if (this.shown) this.sets[this.shown].visible = true;
    }
    if (this.shown === 'campfire') {
      this.sets.campfire.traverse((o) => {
        if (o.name === 'flame') o.scale.set(1, 0.85 + 0.25 * Math.abs(Math.sin(time * 9 + o.position.y * 20)), 1);
      });
    }
  }

  hideCast(): void {
    for (const r of Object.values(this.cast)) r.root.visible = false;
  }
}
