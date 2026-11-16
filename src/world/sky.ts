/**
 * The sky of the dream: a dome of stars all round him, however far he looks.
 *
 * (The owner, 2026-11-16: "he's like surfing on the Milky Way in outer space ... stars and planets ... everything
 * could be like crazy colors".) A great ball drawn from the inside, always centred on the view, painted once: deep
 * violet, clouds of pink and blue-green, the Milky Way as a band of dust and thick stars right round it, and stars of
 * four colours everywhere. Nothing in it is near enough to reach: the planets are things in the level (decor
 * `planet`), not part of this.
 */
import * as THREE from 'three';

/** A small steady source of numbers, so the sky is the same every time. */
function dice(seed: number): () => number {
  let s = seed;
  return () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
}

/** Paints the sky's picture: twice as wide as it is high, wrapped once round the dome. */
export function paintSpace(canvas: HTMLCanvasElement): void {
  const W = canvas.width;
  const H = canvas.height;
  const g = canvas.getContext('2d')!;
  const rand = dice(4242);
  const deep = g.createLinearGradient(0, 0, 0, H);
  deep.addColorStop(0, '#070318');
  deep.addColorStop(0.5, '#160a36');
  deep.addColorStop(1, '#05020f');
  g.fillStyle = deep;
  g.fillRect(0, 0, W, H);
  // Clouds: soft blots of colour, drawn twice (once a picture's width over) so that they meet at the seam.
  const cloud = (x: number, y: number, r: number, color: string): void => {
    for (const dx of [-W, 0, W]) {
      const blot = g.createRadialGradient(x + dx, y, 0, x + dx, y, r);
      blot.addColorStop(0, color);
      blot.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = blot;
      g.fillRect(x + dx - r, y - r, r * 2, r * 2);
    }
  };
  const tints = ['rgba(255,60,190,0.20)', 'rgba(40,220,230,0.16)', 'rgba(130,90,255,0.20)', 'rgba(255,170,60,0.10)'];
  for (let k = 0; k < 26; k++) cloud(rand() * W, H * (0.15 + rand() * 0.7), H * (0.12 + rand() * 0.22), tints[k % tints.length]);
  // The Milky Way: a band right round the sky, waving a little, of dust and of stars thick together.
  const band = (x: number): number => H * (0.5 + 0.16 * Math.sin((x / W) * Math.PI * 2) + 0.05 * Math.sin((x / W) * Math.PI * 6 + 1));
  for (let k = 0; k < 220; k++) {
    const x = rand() * W;
    cloud(x, band(x) + (rand() - 0.5) * H * 0.1, H * (0.03 + rand() * 0.06), k % 3 ? 'rgba(255,236,200,0.07)' : 'rgba(255,120,220,0.07)');
  }
  const starTints = ['#ffffff', '#fff4b0', '#a8f0ff', '#ffb0e8'];
  const star = (x: number, y: number, size: number, color: string): void => {
    g.fillStyle = color;
    g.fillRect(Math.round(x), Math.round(y), size, size);
    if (size >= 3) {
      // (A big one has four points.)
      g.fillRect(Math.round(x) - size, Math.round(y) + 1, size * 3, 1);
      g.fillRect(Math.round(x) + 1, Math.round(y) - size, 1, size * 3);
    }
  };
  for (let k = 0; k < 2600; k++) {
    const x = rand() * W;
    star(x, band(x) + (rand() + rand() + rand() - 1.5) * H * 0.09, rand() < 0.9 ? 1 : 2, starTints[k % 4]);
  }
  for (let k = 0; k < 1500; k++) star(rand() * W, rand() * H, rand() < 0.86 ? 1 : rand() < 0.8 ? 2 : 3, starTints[k % 4]);
}

/** The dome itself: hidden until a level asks for a sky. Keep it centred on the view (`follow`) before each picture is drawn. */
export class SkyDome {
  readonly mesh: THREE.Mesh;
  private painted = false;
  private readonly material = new THREE.MeshBasicMaterial({ side: THREE.BackSide, fog: false, depthWrite: false, depthTest: false });

  constructor() {
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(150, 32, 16), this.material);
    this.mesh.renderOrder = -100;
    this.mesh.frustumCulled = false;
    this.mesh.visible = false;
  }

  /** Shows the sky a level asks for, or none. */
  show(sky: 'space' | undefined): void {
    this.mesh.visible = !!sky;
    if (!sky || this.painted) return;
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 1024;
    paintSpace(canvas);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.magFilter = THREE.NearestFilter;
    this.material.map = tex;
    this.material.needsUpdate = true;
    this.painted = true;
  }

  follow(eye: THREE.Vector3): void {
    if (this.mesh.visible) this.mesh.position.copy(eye);
  }
}
