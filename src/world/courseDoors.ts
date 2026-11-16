/**
 * Course doors in a hub: a finished stone door in the wall, with a painted sign above it.
 * Open: light round its edge and the sign shows the course's name and wedges taken there.
 * Shut: dark, iron bars across it, and the sign shows how many wedges it wants.
 */
import * as THREE from 'three';
import { Doorway } from './doorway';
import type { CourseDoorDef } from '../levels/types';
import { ceilingOf, type Box } from './layout';
import { DOOR_FRAME, type DoorSpec } from './rooms';
import { GLYPH_H, drawText, textWidth, wrapText } from '../render/pixelFont';

export interface DoorState {
  open: boolean;
  /** Wedges he has in that course, and how many it has (0 when the course is not built yet). */
  got: number;
  of: number;
}

/**
 * A door's sign, as dots. It is painted in block letters a dot to a dot (render/pixelFont.ts), and the board is hung
 * big enough that a dot of it is about a dot of the screen from across the room: so it can be READ. (It used to be
 * smooth lettering thirteen dots high on a board that came out sixty dots wide on the screen: a smear.)
 * `SIGN.dots` dots to a unit of the room, so the board is `w / dots` wide and `h / dots` high.
 */
export const SIGN = { w: 88, h: 40, dots: 16, lineMax: 13 } as const;
const WOOD_EDGE = [0x2a, 0x1a, 0x0c];
const WOOD = [0x4e, 0x32, 0x1a];
const WOOD_GRAIN = [0x44, 0x2a, 0x16];
const INK_SHADOW = [0x1c, 0x10, 0x06];
const CREAM = [0xff, 0xf2, 0xcc];
const GOLD = [0xff, 0xd0, 0x4a];
const ROSE = [0xff, 0xb4, 0x8a];
const DIM = [0xd8, 0xc0, 0x98];
/** A wedge of cheese, seven dots across. */
const WEDGE = ['1111111', '1111111', '0111110', '0110110', '0011100', '0011100', '0001000'];

/** The sign's picture: `SIGN.w` by `SIGN.h` dots, four numbers a dot, its top row first. And what is written on it, line by line. */
export function signPixels(def: { name: string; need: number }, st: DoorState): { data: Uint8Array; lines: string[] } {
  const { w, h } = SIGN;
  const data = new Uint8Array(w * h * 4);
  const put = (x: number, y: number, c: number[]): void => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    data.set([c[0], c[1], c[2], 255], (y * w + x) * 4);
  };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) put(x, y, x < 2 || y < 2 || x >= w - 2 || y >= h - 2 ? WOOD_EDGE : y % 9 === 5 ? WOOD_GRAIN : WOOD);
  for (const [x, y] of [[4, 4], [w - 6, 4], [4, h - 6], [w - 6, h - 6]]) for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) put(x + dx, y + dy, WOOD_EDGE);
  /** A line, centred, in a colour, with a dark dot under and to the right of every dot of it. */
  const write = (text: string, y: number, c: number[], lead = 0): void => {
    const x = Math.round((w - textWidth(text) - lead) / 2) + lead;
    drawText(text, x + 1, y + 1, (px, py) => put(px, py, INK_SHADOW));
    drawText(text, x, y, (px, py) => put(px, py, c));
  };
  const name = wrapText(def.name.toUpperCase(), SIGN.lineMax).slice(0, 2);
  // What is under the name: his wedges of the course's; or what it wants of him; or that it is not built.
  const under = st.open ? (st.of > 0 ? `${st.got}/${st.of}` : 'BEING DUG OUT') : `x ${def.need}`;
  const icon = !(st.open && st.of <= 0);
  const rows = name.length + 1;
  // (Its lines spread down the board: seven dots each, and what is left over shared out as the gaps.)
  const gap = Math.floor((h - 4 - rows * GLYPH_H) / (rows + 1));
  let y = 2 + gap;
  for (const line of name) {
    write(line, y, st.open ? CREAM : DIM);
    y += GLYPH_H + gap;
  }
  const lead = icon ? 10 : 0;
  write(under, y, st.open ? (st.of > 0 ? GOLD : DIM) : ROSE, lead);
  if (icon) {
    const x0 = Math.round((w - textWidth(under) - lead) / 2);
    WEDGE.forEach((row, r) => [...row].forEach((bit, c) => {
      if (bit === '1') put(x0 + c, y + r, GOLD);
    }));
    put(x0 + 3, y + 3, [0x9a, 0x5a, 0x10]);
  }
  return { data, lines: [...name, under] };
}

function signTexture(def: CourseDoorDef, st: DoorState): THREE.DataTexture {
  const { w, h } = SIGN;
  const px = signPixels(def, st).data;
  // (A picture's first row is its bottom one, to the card.)
  const flipped = new Uint8Array(px.length);
  for (let y = 0; y < h; y++) flipped.set(px.subarray(y * w * 4, (y + 1) * w * 4), (h - 1 - y) * w * 4);
  const t = new THREE.DataTexture(flipped, w, h, THREE.RGBAFormat);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.needsUpdate = true;
  return t;
}

/**
 * How much room there is over a door for its sign: from the top of its arch up to the lowest thing that is over the
 * board's place (a roof, a ledge, the room's own ceiling).
 * (The owner, 2026-11-16, of the door to Leap of Faith under the grotto's low roof: its sign showed only the wedge
 * count; the line with its name was up inside the roof, and stuck out of the floor above.)
 */
export function roomOverDoor(solids: readonly Box[], door: DoorSpec): number {
  const top = (door.y ?? 0) + door.height;
  const fx = Math.sin(door.yaw);
  const fz = Math.cos(door.yaw);
  const half = SIGN.w / SIGN.dots / 2;
  // The board's place: along the wall either side of the door's middle, from the wall a little way out.
  const cx = door.x + fx * 0.3;
  const cz = door.z + fz * 0.3;
  const x0 = cx - Math.abs(fz) * half - Math.abs(fx) * 0.3;
  const x1 = cx + Math.abs(fz) * half + Math.abs(fx) * 0.3;
  const z0 = cz - Math.abs(fx) * half - Math.abs(fz) * 0.3;
  const z1 = cz + Math.abs(fx) * half + Math.abs(fz) * 0.3;
  let clear = ceilingOf(solids)?.y ?? Infinity;
  for (const b of solids) {
    if (b.kind === 'wall' || b.x1 <= x0 || b.x0 >= x1 || b.z1 <= z0 || b.z0 >= z1) continue;
    if (b.y0 >= top - 0.01) clear = Math.min(clear, b.y0);
  }
  return clear - top;
}

/** A sign at its full size: this far over the arch, with this much left clear above it. */
/** (`low`, `out`: under a low roof it hangs just over the OPENING, out in front of the arch's stones, which its foot would otherwise be behind.) */
export const SIGN_HANG = { foot: 1.0, low: 0.06, out: 0.24 + (DOOR_FRAME.depth + 0.18) / 2 + 0.1, clear: 0.15, least: 0.5 } as const;
/**
 * Where a door's sign hangs and how big it is, for the room there is over the door: at its full size a unit over the
 * arch where there is room for that; under a low roof, just over the door's opening (out in front of the arch's top
 * stones) and as much smaller as it must be for ALL of it to be under the roof (never under half size: `fits` says whether even that is enough).
 */
export function signFit(room: number): { scale: number; foot: number; out: number; fits: boolean } {
  const high = SIGN.h / SIGN.dots;
  if (room >= SIGN_HANG.foot + high + SIGN_HANG.clear) return { scale: 1, foot: SIGN_HANG.foot, out: 0.12, fits: true };
  const scale = Math.max(SIGN_HANG.least, Math.min(1, (room - SIGN_HANG.low - SIGN_HANG.clear) / high));
  return { scale, foot: SIGN_HANG.low, out: SIGN_HANG.out, fits: SIGN_HANG.low + high * scale + SIGN_HANG.clear <= room + 1e-9 };
}

export class CourseDoors {
  readonly group = new THREE.Group();
  private readonly doors: Doorway[] = [];

  /** `rooms`: how much room there is over each door for its sign (`roomOverDoor`); without it, each hangs at its full size. */
  constructor(defs: CourseDoorDef[], states: DoorState[], theme: 'sewer' | 'mine' | 'cave' | 'dungeon' | 'foundry' | 'keep', rooms: number[] = []) {
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
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(SIGN.w / SIGN.dots, SIGN.h / SIGN.dots), new THREE.MeshBasicMaterial({ map: signTexture(def, st) }));
      // (Its foot a unit over the door's arch; under a low roof, nearer the arch and smaller: see `signFit`.)
      const fit = signFit(rooms[i] ?? Infinity);
      sign.scale.setScalar(fit.scale);
      sign.position.set(0, def.door.height + fit.foot + (SIGN.h / SIGN.dots / 2) * fit.scale, fit.out);
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
