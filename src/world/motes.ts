/**
 * Motes: the air of each world. A field of small glowing points that drifts around the rat (wrapping round him as he
 * moves, so it never runs out): embers rising in the Foundry, spores floating in the Hollows, dust falling in the Keep,
 * a faint mist over the Cistern. Additive points, so dimmer is fainter; they fade with distance (the game's fog is its
 * own shader, so they fade themselves).
 *
 * The drift itself is plain maths (stepMotes), so tests can run it without a browser.
 */
import * as THREE from 'three';

export interface MoteStyle {
  count: number;
  color: number;
  /** World units across. */
  size: number;
  /** Rising (+) or falling (-) speed. */
  rise: number;
  /** How much they wander sideways. */
  drift: number;
  /** How strongly they flicker (0 steady, 1 a lot). */
  flicker: number;
  /** How bright, 0..1. */
  bright: number;
  /** Heights above his feet they live in. */
  low: number;
  high: number;
}

export const MOTES: Record<string, MoteStyle | null> = {
  foundry: { count: 120, color: 0xff8a2a, size: 0.24, rise: 0.9, drift: 0.35, flicker: 0.8, bright: 1, low: -2, high: 10 },
  cave: { count: 100, color: 0x8ae8d0, size: 0.18, rise: 0.08, drift: 0.25, flicker: 0.35, bright: 0.95, low: -1, high: 7 },
  // (Not a theme of its own: a level asks for it by `motes`. Fine snow, sifting down.)
  ice: { count: 150, color: 0xeaf6ff, size: 0.11, rise: -0.55, drift: 0.3, flicker: 0.15, bright: 0.8, low: -1, high: 9 },
  // (Asked for by `motes`: the dream's road in the sky. Stars round him, hardly moving, twinkling.)
  stars: { count: 170, color: 0xfff4c8, size: 0.2, rise: 0.02, drift: 0.05, flicker: 0.95, bright: 1, low: -8, high: 12 },
  keep: { count: 110, color: 0xc9b8e0, size: 0.13, rise: -0.22, drift: 0.12, flicker: 0.1, bright: 0.45, low: -1, high: 9 },
  sewer: { count: 60, color: 0xbfe6c0, size: 0.13, rise: 0.05, drift: 0.18, flicker: 0.2, bright: 0.3, low: -1, high: 5 },
  mine: null,
  dungeon: null,
};

/** How far round him the field reaches (it wraps at this distance). */
export const MOTE_RANGE = 12;

export interface Mote {
  x: number;
  y: number;
  z: number;
  phase: number;
}

/** Moves the motes for one frame and wraps them round the centre, so the field always surrounds him. */
export function stepMotes(motes: Mote[], style: MoteStyle, dt: number, time: number, cx: number, cy: number, cz: number): void {
  const R = MOTE_RANGE;
  const span = style.high - style.low;
  for (const m of motes) {
    m.x += Math.sin(time * 0.7 + m.phase * 6.3) * style.drift * dt;
    m.z += Math.cos(time * 0.6 + m.phase * 4.1) * style.drift * dt;
    m.y += style.rise * dt;
    // Wrap round him: keep each mote inside the box centred on where he is.
    if (m.x < cx - R) m.x += 2 * R;
    else if (m.x > cx + R) m.x -= 2 * R;
    if (m.z < cz - R) m.z += 2 * R;
    else if (m.z > cz + R) m.z -= 2 * R;
    if (m.y < cy + style.low) m.y += span;
    else if (m.y > cy + style.high) m.y -= span;
  }
}

/** How bright one mote is now: its flicker, and fading out towards the edge of the field. */
export function moteBrightness(m: Mote, style: MoteStyle, time: number, cx: number, cz: number): number {
  const d = Math.hypot(m.x - cx, m.z - cz) / MOTE_RANGE;
  const edge = Math.max(0, 1 - d * d);
  const flick = 1 - style.flicker * (0.5 + 0.5 * Math.sin(time * (3 + m.phase * 5) + m.phase * 20));
  return style.bright * edge * flick;
}

export class MoteField {
  readonly points: THREE.Points;
  private style: MoteStyle | null = null;
  private motes: Mote[] = [];
  private readonly geo = new THREE.BufferGeometry();
  private readonly mat: THREE.PointsMaterial;
  private readonly base = new THREE.Color();

  constructor() {
    this.mat = new THREE.PointsMaterial({ size: 0.08, sizeAttenuation: true, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    this.points = new THREE.Points(this.geo, this.mat);
    this.points.frustumCulled = false;
    this.points.visible = false;
  }

  /** The air for a level's look (none for some). Scatters the motes round where he stands. */
  setTheme(theme: string | undefined, hub: boolean, at: THREE.Vector3): void {
    const style = hub ? null : (MOTES[theme ?? 'sewer'] ?? null);
    this.style = style;
    this.points.visible = !!style;
    if (!style) return;
    let seed = 99;
    const r = (): number => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
    this.motes = Array.from({ length: style.count }, () => ({
      x: at.x + (r() * 2 - 1) * MOTE_RANGE,
      y: at.y + style.low + r() * (style.high - style.low),
      z: at.z + (r() * 2 - 1) * MOTE_RANGE,
      phase: r(),
    }));
    this.geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(style.count * 3), 3));
    this.geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(style.count * 3), 3));
    this.mat.size = style.size;
    this.base.set(style.color);
  }

  update(dt: number, time: number, at: THREE.Vector3): void {
    const s = this.style;
    if (!s) return;
    stepMotes(this.motes, s, dt, time, at.x, at.y, at.z);
    const pos = this.geo.getAttribute('position') as THREE.BufferAttribute;
    const col = this.geo.getAttribute('color') as THREE.BufferAttribute;
    for (let i = 0; i < this.motes.length; i++) {
      const m = this.motes[i];
      pos.setXYZ(i, m.x, m.y, m.z);
      const b = moteBrightness(m, s, time, at.x, at.z);
      col.setXYZ(i, this.base.r * b, this.base.g * b, this.base.b * b);
    }
    pos.needsUpdate = true;
    col.needsUpdate = true;
  }
}
