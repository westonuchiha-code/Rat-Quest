import * as THREE from 'three';
import { ps1Uniforms } from '../render/ps1Material';
import { HelmetColors, RatModel, ScarfColors } from '../player/ratModel';

const W = 176;
const H = 224;

/**
 * A little live picture of the rat for the equipment screen, drawn on its own small canvas.
 * It turns slowly, idles like the real one, and can try on a helmet before it is equipped.
 */
export class RatPreview {
  readonly canvas = document.createElement('canvas');
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(32, W / H, 0.1, 20);
  private readonly rat = new RatModel();
  private angle = 0.6;
  private time = 0;

  constructor() {
    this.canvas.width = W;
    this.canvas.height = H;
    this.canvas.style.cssText = 'image-rendering:pixelated;display:block;';
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: false, alpha: true });
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(W, H, false);
    this.renderer.setClearColor(0x000000, 0);
    // A round stone plinth to stand on.
    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.56, 0.06, 14), new THREE.MeshBasicMaterial({ color: 0x3a4535 }));
    plinth.position.y = -0.03;
    this.scene.add(plinth, this.rat.root);
    this.rat.setTransform(new THREE.Vector3(0, 0, 0), 0);
    this.camera.position.set(0, 0.62, 2.25);
    this.camera.lookAt(0, 0.5, 0);
  }

  setScarf(colors: ScarfColors): void {
    this.rat.setScarf(colors);
  }

  setSword(colors: { blade: number; hilt: number }): void {
    this.rat.setSword(colors);
  }

  setShield(colors: { face: number; trim: number }): void {
    this.rat.setShield(colors);
  }

  setHelmet(colors: HelmetColors): void {
    this.rat.setHelmet(colors);
  }

  /** Advances and draws the preview. Call every frame while it is visible. */
  tick(dt: number): void {
    this.time += dt;
    this.angle += dt * 0.55;
    this.rat.root.rotation.y = this.angle;
    this.rat.update(dt, {
      state: 'idle', planarSpeed: 0, comboStep: 0, attackTime: 0, dodgeKind: 'roll', dodgeProgress: 0,
      verticalSpeed: 0, flipProgress: 0, armed: true, stowProgress: -1, plungeStage: 0,
    });
    // The game shares its shader settings, so borrow the resolution for this draw and give it back.
    const res = ps1Uniforms.resolution.value;
    const keepX = res.x;
    const keepY = res.y;
    res.set(W, H);
    this.renderer.render(this.scene, this.camera);
    res.set(keepX, keepY);
  }
}
