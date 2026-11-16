/**
 * THE DREAM'S CREATURES: the frightening ones from the waking world, in loud colours, doing nothing at all.
 * The owner, 2026-11-16, of the dream: "maybe like a couple of the normal enemies we already have like maybe some of
 * the scarier ones but have them have like wacky Pomo sort of psychedelic versions that are just kind of chilled out
 * here and sleeping and hanging out and stuff."
 *
 * A dozer is one of the game's own creature models: the same shape he fights elsewhere, its painted colours turned
 * round the colour wheel and made loud, held in a pose of its own. It does not see him, cannot hurt him and cannot be
 * hurt. Asleep, it breathes slowly and Z's drift up from its head; awake, it only stands about and looks round.
 * It is SOLID where it is drawn (`dozerSolids`): he walks round it, or climbs on it.
 */
import * as THREE from 'three';
import { MantisModel } from '../enemies/mantisModel';
import { StagModel } from '../enemies/stagModel';
import { ScorpionModel } from '../enemies/scorpionModel';
import { drawText, textWidth, GLYPH_H } from '../render/pixelFont';
import { extent, type Box } from './layout';
import { getTexture } from '../render/textures';

export interface DozerSpec {
  type: 'mantis' | 'scorpion' | 'stag';
  x: number;
  y: number;
  z: number;
  facing: number;
  /** Awake and standing about (default: asleep). */
  awake?: boolean;
}

/** How far round the colour wheel each one's colours are turned (of a whole turn), and how big its solid is. */
export const DOZER = {
  mantis: { turn: 0.42, half: 0.55, tall: 1.5, lamp: 0 },
  scorpion: { turn: 0.3, half: 0.75, tall: 0.7, lamp: 0xff5ab4 },
  stag: { turn: 0.58, half: 0.7, tall: 1.9, lamp: 0 },
} as const;

/** The solid of one: a box it fills, hidden (the creature is what is drawn). */
export function dozerSolids(d: DozerSpec): Box[] {
  const k = DOZER[d.type];
  return [{ ...extent('stone', d.x - k.half, d.x + k.half, d.y, d.y + k.tall, d.z - k.half, d.z + k.half), hidden: true }];
}

/** A colour turned `turn` of the way round the wheel and made loud: full of colour, and never dark. */
export function dreamColour(r: number, g: number, b: number, turn: number, out: THREE.Color): THREE.Color {
  const hsl = { h: 0, s: 0, l: 0 };
  out.setRGB(r, g, b).getHSL(hsl);
  // (A grey has no colour to turn: it is given one, by how light it is, so that steel comes out as a colour too.)
  const h = (hsl.s < 0.12 ? hsl.l * 0.9 : hsl.h) + turn;
  return out.setHSL(h - Math.floor(h), Math.max(0.78, hsl.s), Math.min(0.72, Math.max(0.42, hsl.l * 0.85 + 0.2)));
}

/** Repaints everything under `root` in the dream's colours. (Things that glow, eyes and the like, are left.) */
export function dreamify(root: THREE.Object3D, turn: number): void {
  const c = new THREE.Color();
  const done = new Set<THREE.BufferGeometry>();
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    const col = m.isMesh ? (m.geometry.attributes.color as THREE.BufferAttribute | undefined) : undefined;
    if (!col || done.has(m.geometry) || !(m.material as THREE.ShaderMaterial).uniforms) return;
    done.add(m.geometry);
    for (let i = 0; i < col.count; i++) {
      dreamColour(col.getX(i), col.getY(i), col.getZ(i), turn, c);
      col.setXYZ(i, c.r, c.g, c.b);
    }
    col.needsUpdate = true;
  });
}

let zTexture: THREE.DataTexture | null = null;
/** A letter Z, in the game's block letters, for a sleeper. */
function zTex(): THREE.DataTexture {
  if (zTexture) return zTexture;
  const W = textWidth('Z') + 2;
  const H = GLYPH_H + 2;
  const data = new Uint8Array(W * H * 4);
  drawText('Z', 1, 1, (x, y) => data.set([255, 255, 255, 255], ((H - 1 - y) * W + x) * 4));
  zTexture = new THREE.DataTexture(data, W, H, THREE.RGBAFormat);
  zTexture.magFilter = THREE.NearestFilter;
  zTexture.minFilter = THREE.NearestFilter;
  zTexture.needsUpdate = true;
  return zTexture;
}

const at = new THREE.Vector3();

export class Dozer {
  readonly root = new THREE.Group();
  private readonly model: MantisModel | StagModel | ScorpionModel;
  private readonly zs: THREE.Sprite[] = [];
  private time = 0;

  /** `pose`: for the model viewer only, to try another of the creature's own states for its sleep. */
  constructor(readonly spec: DozerSpec, private readonly pose?: string) {
    const k = DOZER[spec.type];
    this.model = spec.type === 'mantis' ? new MantisModel() : spec.type === 'stag' ? new StagModel() : new ScorpionModel(k.lamp);
    dreamify(this.model.root, k.turn);
    if (spec.type === 'scorpion') {
      // (A scorpion's colour is in its PICTURES, not painted on it: so its pictures are changed for a plain shell's
      // greys, and each part of it is given a loud colour of its own.)
      const LOUD = [0xff5ab4, 0x3ad8ff, 0xffe84a, 0x7a5cff];
      const seen: THREE.ShaderMaterial[] = [];
      this.model.root.traverse((o) => {
        const m = (o as THREE.Mesh).isMesh ? ((o as THREE.Mesh).material as THREE.ShaderMaterial) : null;
        if (!m?.uniforms?.tex || !m.uniforms.tint || seen.includes(m)) return;
        seen.push(m);
        m.uniforms.tex.value = getTexture('chitin');
        (m.uniforms.tint.value as THREE.Color).setHex(LOUD[(seen.length - 1) % LOUD.length]).multiplyScalar(1.5);
      });
    }
    this.root.add(this.model.root);
    this.time = spec.x * 1.7 + spec.z * 0.9;
    if (!spec.awake) {
      for (let i = 0; i < 3; i++) {
        const z = new THREE.Sprite(new THREE.SpriteMaterial({ map: zTex(), color: [0xffe84a, 0xff5ab4, 0x3ad8ff][i], transparent: true, depthWrite: false }));
        this.root.add(z);
        this.zs.push(z);
      }
    }
    this.update(0);
  }

  update(dt: number): void {
    this.time += dt;
    const t = this.time;
    const s = this.spec;
    const asleep = !s.awake;
    // (Asleep, the clock its body moves by runs slow: it only breathes.)
    const body = asleep ? t * 0.25 : t;
    at.set(s.x, s.y, s.z);
    if (this.model instanceof MantisModel) {
      this.model.setTransform(at, s.facing);
      // Asleep it is slumped forward with its head down and its scythes resting on the ground.
      this.model.update(dt, { state: (this.pose ?? (asleep ? 'stuck' : 'idle')) as 'idle', stateTime: asleep ? 5 : body, walking: 0, arm: 1, held: false, windupTime: 1, air: 0 });
    } else if (this.model instanceof StagModel) {
      this.model.setTransform(at, s.facing);
      // Asleep it is down on one knee, leaning on its hammer.
      this.model.update(dt, { state: (this.pose ?? (asleep ? 'kneel' : 'idle')) as 'idle', stateTime: asleep ? 5 : body, walking: 0 });
    } else {
      this.model.setTransform(at, s.facing);
      // Asleep it lies flat, its tail down along the ground and its lamp turned low.
      this.model.update(dt, { state: asleep ? 'sprawl' : 'idle', stateTime: asleep ? 5 : body, tail: asleep ? { ahead: -0.9, up: 0.45 } : { ahead: 0.5, up: 1.5 }, light: asleep ? 0.25 + 0.12 * Math.sin(t * 1.3) : 1, claw: asleep ? -1 : 0, moving: 0, mark: null });
    }
    // Breathing.
    const breath = Math.sin(t * (asleep ? 1.3 : 2));
    this.model.root.scale.set(1 + 0.012 * breath, 1 + (asleep ? 0.035 : 0.012) * breath, 1 + 0.012 * breath);
    // Z's: one after another up from its head, growing and fading.
    const k = DOZER[s.type];
    this.zs.forEach((z, i) => {
      const life = (t * 0.33 + i / this.zs.length) % 1;
      z.position.set(s.x + Math.sin(s.facing) * k.half * 0.7 + 0.25 * life + 0.12 * Math.sin(life * 9), s.y + k.tall * (asleep ? 0.62 : 1) + 0.25 + life * 1.1, s.z + Math.cos(s.facing) * k.half * 0.7);
      const size = 0.16 + 0.26 * life;
      z.scale.set(size * 0.75, size, 1);
      (z.material as THREE.SpriteMaterial).opacity = Math.sin(life * Math.PI);
    });
  }

  dispose(): void {
    this.root.removeFromParent();
  }
}
