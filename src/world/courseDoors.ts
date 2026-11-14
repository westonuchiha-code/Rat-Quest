/**
 * Course doors in a hub: a finished stone door in the wall, with a painted sign above it.
 * Open: light round its edge and the sign shows the course's name and wedges taken there.
 * Shut: dark, iron bars across it, and the sign shows how many wedges it wants.
 */
import * as THREE from 'three';
import { Doorway } from './doorway';
import type { CourseDoorDef } from '../levels/types';

export interface DoorState {
  open: boolean;
  /** Wedges he has in that course, and how many it has (0 when the course is not built yet). */
  got: number;
  of: number;
}

function wedgeIcon(c: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  c.fillStyle = '#ffc93a';
  c.beginPath();
  c.moveTo(x, y + s);
  c.lineTo(x + s * 0.6, y);
  c.quadraticCurveTo(x, y - s * 0.28, x - s * 0.6, y);
  c.closePath();
  c.fill();
  c.fillStyle = '#9a5a10';
  c.fillRect(x - s * 0.12, y + s * 0.25, s * 0.14, s * 0.14);
  c.fillRect(x + s * 0.12, y + s * 0.05, s * 0.12, s * 0.12);
}

function signTexture(def: CourseDoorDef, st: DoorState): THREE.CanvasTexture {
  const cv = document.createElement('canvas');
  cv.width = 160;
  cv.height = 56;
  const c = cv.getContext('2d')!;
  c.fillStyle = '#4a3018';
  c.fillRect(0, 0, 160, 56);
  c.fillStyle = '#9a6c3c';
  c.fillRect(3, 3, 154, 50);
  c.fillStyle = '#8a5e32';
  for (let y = 12; y < 52; y += 10) c.fillRect(3, y, 154, 2);
  c.fillStyle = '#2a1a0c';
  for (const [x, y] of [[8, 8], [148, 8], [8, 44], [148, 44]]) c.fillRect(x, y, 4, 4);
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.font = 'bold 13px monospace';
  c.fillStyle = st.open ? '#fff6d8' : '#e8d4b0';
  c.strokeStyle = '#2a1708';
  c.lineWidth = 3;
  c.strokeText(def.name.toUpperCase(), 80, 18);
  c.fillText(def.name.toUpperCase(), 80, 18);
  c.font = 'bold 16px monospace';
  if (st.open) {
    if (st.of > 0) {
      wedgeIcon(c, 62, 31, 11);
      c.fillStyle = '#ffd866';
      c.strokeText(`${st.got}/${st.of}`, 92, 38);
      c.fillText(`${st.got}/${st.of}`, 92, 38);
    } else {
      c.fillStyle = '#c8b090';
      c.font = 'bold 12px monospace';
      c.fillText('BEING DUG OUT', 80, 38);
    }
  } else {
    wedgeIcon(c, 66, 31, 11);
    c.fillStyle = '#ffb48a';
    c.strokeText(`x ${def.need}`, 94, 38);
    c.fillText(`x ${def.need}`, 94, 38);
  }
  const t = new THREE.CanvasTexture(cv);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class CourseDoors {
  readonly group = new THREE.Group();
  private readonly doors: Doorway[] = [];

  constructor(defs: CourseDoorDef[], states: DoorState[], theme: 'sewer' | 'mine' | 'cave' | 'dungeon' | 'foundry' | 'keep') {
    const ironMat = new THREE.MeshBasicMaterial({ color: 0x2b2a2e });
    defs.forEach((def, i) => {
      const st = states[i];
      const d = new Doorway(def.door, theme);
      d.lit = st.open && st.of > 0;
      this.doors.push(d);
      this.group.add(d.group);
      const local = new THREE.Group();
      local.position.set(def.door.x, def.door.y ?? 0, def.door.z);
      local.rotation.y = def.door.yaw;
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.19), new THREE.MeshBasicMaterial({ map: signTexture(def, st) }));
      sign.position.set(0, def.door.height + 1.7, 0.12);
      local.add(sign);
      if (!d.lit) {
        // Iron bars across a shut door.
        const w = def.door.width * 0.8;
        for (let b = 0; b < 4; b++) {
          const bar = new THREE.Mesh(new THREE.BoxGeometry(0.1, def.door.height * 0.8, 0.1), ironMat);
          bar.position.set(-w / 2 + (b + 0.5) * (w / 4), def.door.height * 0.4, 0.25);
          local.add(bar);
        }
        for (const y of [0.5, def.door.height * 0.65]) {
          const rail = new THREE.Mesh(new THREE.BoxGeometry(w + 0.2, 0.12, 0.12), ironMat);
          rail.position.set(0, y, 0.28);
          local.add(rail);
        }
      }
      this.group.add(local);
    });
  }

  update(time: number): void {
    for (const d of this.doors) d.setReveal(d.lit ? 1 : 0, 1, time);
  }

  dispose(): void {
    this.group.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose();
        const m = o.material as THREE.MeshBasicMaterial;
        m.map?.dispose();
        m.dispose();
      }
    });
  }
}
