// What the owner found walking round the Club, 2026-11-16, and what holds each fix in place:
//   flat things flickering through what they lie on (a barrel's top, the couch's patches, the drink in the mugs, the
//   rugs, the dartboard); door signs that could not be read; his shadow standing out in the air past the edge of what
//   he is on; strings of lights ending in mid air; a lamp post hung over the fire; turtle shells like bumps; the view
//   that would not look up; and being thrown from one corner of the hearth to the other.
import './../src/core/colorSetup';
import * as THREE from 'three';
import { PlayerController, PlayerInput } from '../src/player/controller';
import { FollowCamera } from '../src/camera/followCamera';
import { lyingOn, createPs1Material } from '../src/render/ps1Material';
import { buildMug, buildRug, buildDartboard, buildBulbs } from '../src/world/tavernModels';
import { buildCouch } from '../src/world/couchModel';
import { buildChamber } from '../src/world/chamber';
import { shadowSpokes, groundAt } from '../src/world/shadow';
import { makeAabb } from '../src/world/collision';
import { SIGN, signPixels } from '../src/world/courseDoors';
import { GLYPH_H, hasGlyph, textWidth, wrapText } from '../src/render/pixelFont';
import { shellGeometry } from '../src/npc/patrons';
import { levelById } from '../src/levels/levels';
import { TUNING } from '../src/data/tuning';
import { SHARPS, SHARP_DEFAULT, SHARP_ROWS, pictureSize } from '../src/render/picture';

const DT = 1 / 60;
let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}
const inp = (o: Partial<PlayerInput>): PlayerInput => ({ move: new THREE.Vector3(), run: true, jumpPressed: false, jumpHeld: false, attackPressed: false, dodgeHeld: false, dodgePressed: false, guardHeld: false, stowPressed: false, ...o } as PlayerInput);
const hub = levelById('hub')!;
const room = buildChamber({ solids: hub.solids, pit: hub.pit, water: hub.water, decor: hub.decor, movers: [] } as never);
const plain = (): THREE.ShaderMaterial => createPs1Material({ lit: true });
const layers: THREE.ShaderMaterial[] = [];
const layer = (n: number): THREE.ShaderMaterial => (layers[n] ??= lyingOn(plain(), n));
const mats = { wood: plain(), plain: plain(), glow: plain(), layer };
/** Every triangle of a thing, in the thing's own frame: its three corners and which way it faces. */
function faces(root: THREE.Object3D): Array<{ a: THREE.Vector3; b: THREE.Vector3; c: THREE.Vector3; n: THREE.Vector3; mesh: THREE.Mesh }> {
  root.updateMatrixWorld(true);
  const out: Array<{ a: THREE.Vector3; b: THREE.Vector3; c: THREE.Vector3; n: THREE.Vector3; mesh: THREE.Mesh }> = [];
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry;
    const p = g.attributes.position;
    const flip = (m.material as THREE.Material).side === THREE.BackSide;
    for (let i = 0; i < p.count; i += 3) {
      const [a, b, c] = [0, 1, 2].map((k) => new THREE.Vector3().fromBufferAttribute(p, i + k).applyMatrix4(m.matrixWorld));
      const n = b.clone().sub(a).cross(c.clone().sub(a)).normalize();
      if (flip) n.negate();
      out.push({ a, b, c, n, mesh: m });
    }
  });
  return out;
}
const offset = (m: THREE.Object3D): number => {
  const mat = (m as THREE.Mesh).material as THREE.Material;
  return mat.polygonOffset ? -mat.polygonOffsetFactor : 0;
};

// ---- A thing that lies on another ----
{
  const a = lyingOn(plain(), 1);
  const b = lyingOn(plain(), 3);
  check(
    'a material for a thing that lies on another is drawn a hair toward the eye, more for each layer up',
    a.polygonOffset
      && b.polygonOffset
      && a.polygonOffsetFactor < 0
      && b.polygonOffsetFactor < a.polygonOffsetFactor
      && b.polygonOffsetUnits < a.polygonOffsetUnits
  );
}

// ---- The mug: a cup, with what is in it inside it ----
{
  for (const full of [true, false]) {
    const up = faces(buildMug(mats, full)).filter((f) => f.n.y > 0.9);
    const mid = (f: { a: THREE.Vector3; b: THREE.Vector3; c: THREE.Vector3 }): THREE.Vector3 => f.a.clone().add(f.b).add(f.c).divideScalar(3);
    const rim = Math.max(...up.map((f) => mid(f).y));
    const inside = up.filter((f) => Math.hypot(mid(f).x, mid(f).z) < 0.05);
    const level = Math.max(...inside.map((f) => mid(f).y));
    check(
      `a mug (${full ? 'full' : 'empty'}) is open at its mouth: what is in it lies a finger and more under its rim, and nothing lies flat within a hair of anything else`,
      inside.length > 0
        && rim - level >= 0.025
        && inside.every((f) => Math.abs(mid(f).y - level) < 1e-6),
      `rim ${rim.toFixed(3)}, inside ${level.toFixed(3)}`
    );
  }
}

// ---- The barrel: its head set down inside its staves ----
{
  const def = { solids: [{ kind: 'floor', x0: -3, x1: 3, y0: -1, y1: 0, z0: -3, z1: 3 }, { kind: 'barrel', x0: -0.45, x1: 0.45, y0: 0, y1: 1.1, z0: -0.45, z1: 0.45 }], pit: null, water: [], decor: [], movers: [] };
  const ch = buildChamber(def as never);
  const barrel = ch.crates.find((c) => c.type === 'barrel')!;
  const up = faces(barrel.mesh as unknown as THREE.Object3D).filter((f) => f.n.y > 0.9);
  const mid = (f: { a: THREE.Vector3; b: THREE.Vector3; c: THREE.Vector3 }): THREE.Vector3 => f.a.clone().add(f.b).add(f.c).divideScalar(3);
  const heights = [...new Set(up.map((f) => mid(f).y.toFixed(3)))].map(Number).sort((x, y) => x - y);
  const inner = up.filter((f) => Math.hypot(mid(f).x, mid(f).z) < 0.3);
  check(
    'a barrel has ONE top in its middle, its head, set down inside its staves; and the staves\' ends round it stand higher, as a rim',
    inner.length >= 8
      && new Set(inner.map((f) => mid(f).y.toFixed(3))).size === 1
      && heights.length === 2
      && heights[1] - heights[0] >= 0.03
      && Math.abs(heights[1] - 1.1) < 1e-6,
    `tops at ${heights.join(' and ')}`
  );
}

// ---- The rugs, the dartboard, the couch's patches: every layer in a material of its own layer ----
{
  for (const [name, rug] of [['round rug', buildRug(mats, { r: 2.3, colors: [0x6a2a3a, 0x8a3a4a, 0xd8b060] })], ['runner', buildRug(mats, { w: 2.4, d: 8.4, colors: [0x6a2a3a, 0x8a3a4a, 0xd8b060] })]] as Array<[string, THREE.Group]>) {
    const parts = rug.children.map((m) => ({ y: m.position.y, off: offset(m), box: new THREE.Box3().setFromObject(m) }));
    // (Two pieces that overlap, seen from above, must be on different layers: the higher one the higher layer.)
    let wrong = 0;
    for (const a of parts) for (const b of parts) {
      if (a === b || a.y > b.y) continue;
      const over = a.box.min.x < b.box.max.x - 0.05 && b.box.min.x < a.box.max.x - 0.05 && a.box.min.z < b.box.max.z - 0.05 && b.box.min.z < a.box.max.z - 0.05;
      if (over && a.y < b.y - 1e-9 && !(b.off > a.off)) wrong++;
    }
    check(
      `the ${name}: every piece of it lies on the floor in a material that says so, and a piece over another is a layer up from it`,
      parts.length >= 4
        && parts.every((p) => p.off > 0)
        && wrong === 0,
      `${parts.length} pieces, ${wrong} wrong`
    );
  }
  const board = buildDartboard(mats);
  const discs = board.children.filter((c) => (c as THREE.Mesh).isMesh).map((m) => ({ z: m.position.z, off: offset(m) })).sort((a, b) => a.z - b.z);
  check(
    'the dartboard: each ring painted on it is a layer up from the one it lies on',
    discs.length === 6
      && discs.every((d, i) => i === 0 || (d.z > discs[i - 1].z && d.off > discs[i - 1].off)),
    discs.map((d) => d.off).join()
  );
  const patchOn = lyingOn(plain());
  const couch = buildCouch({ cloth: plain(), patch: plain(), blanket: plain(), plain: plain(), patchOn, plainOn: layer });
  const sewn: Record<string, number[]> = { patch: [], rip: [], stitch: [] };
  couch.traverse((o) => {
    if (o.name in sewn) sewn[o.name].push(offset(o));
  });
  check(
    'the couch: its patches, the slits of its rips and the stitches over one are each sewn ON the cloth, in a material that says so, the stitches a layer over the slit',
    sewn.patch.length === 2
      && sewn.patch.every((v) => v > 0)
      && sewn.rip.length >= 2
      && sewn.rip.every((v) => v > 0)
      && sewn.stitch.length === 5
      && sewn.stitch.every((v) => v > Math.max(...sewn.rip)),
    JSON.stringify(sewn)
  );
}

// ---- The door signs can be read ----
{
  const doors = (hub.courseDoors ?? []).filter((d) => d.name);
  check(
    'every door of the Club has a name the block letters can write, in one line or two, on its board',
    doors.length >= 3
      && doors.every((d) => [...d.name].every(hasGlyph) && wrapText(d.name.toUpperCase(), SIGN.lineMax).length <= 2 && wrapText(d.name.toUpperCase(), SIGN.lineMax).every((l) => textWidth(l) <= SIGN.w - 8)),
    doors.map((d) => wrapText(d.name.toUpperCase(), SIGN.lineMax).join(' / ')).join('; ')
  );
  check(
    'a long name breaks at a space, as evenly as it can',
    wrapText('THE GREAT CISTERN', 13).join('|') === 'THE GREAT|CISTERN'
      && wrapText('THE FOUNDRY', 13).join('|') === 'THE FOUNDRY'
  );
  const px = signPixels({ name: 'The Great Cistern', need: 0 }, { open: true, got: 3, of: 16 });
  const shut = signPixels({ name: 'The Hollows', need: 12 }, { open: false, got: 0, of: 0 });
  const bright = (d: Uint8Array): number => {
    let n = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i] > 200 && d[i + 1] > 160) n++;
    return n;
  };
  check(
    'a sign carries its door\'s name and, under it, his wedges of the course\'s (open) or what it wants of him (shut), in pale letters on dark wood',
    px.lines.join('|') === 'THE GREAT|CISTERN|3/16'
      && shut.lines.join('|') === 'THE HOLLOWS|x 12'
      && bright(px.data) > 150
      && bright(shut.data) > 80
      && px.data.length === SIGN.w * SIGN.h * 4
  );
  // A dot of the board is a dot of the screen, and more, from fourteen off: the game's picture is 240 high and its view 55 degrees.
  const dotsAt = (far: number): number => 120 / Math.tan((55 * Math.PI) / 360) / far / SIGN.dots;
  check(
    'the board is hung big enough to read from across the room: a dot of it is a dot of the screen from fourteen units off, a letter seven of them high',
    dotsAt(14) >= 1
      && GLYPH_H === 7
      && SIGN.w / SIGN.dots >= 5,
    `${dotsAt(14).toFixed(2)} screen dots to a dot at 14; the board ${(SIGN.w / SIGN.dots).toFixed(1)} by ${(SIGN.h / SIGN.dots).toFixed(1)}`
  );
}

// ---- His shadow is cut where the ground ends ----
{
  const floor = makeAabb(0, -0.5, 0, 20, 1, 20);
  const post = makeAabb(0, 1, 0, 0.3, 2, 0.3);
  const R = 0.34;
  const open = shadowSpokes([floor], 3, 0, 3, R, 12);
  check('on open floor the shadow is whole', open.every((v) => v === 1));
  const on = shadowSpokes([floor, post], 0, 2, 0, R, 12);
  check(
    'standing on a post narrower than his shadow, the shadow is cut to the post\'s top: no spoke of it runs out past the edge into the air',
    on.every((v, i) => v < 1 && groundAt([floor, post], Math.cos((i / 12) * Math.PI * 2) * R * v, 2, Math.sin((i / 12) * Math.PI * 2) * R * v) && Math.max(Math.abs(Math.cos((i / 12) * Math.PI * 2) * R * v), Math.abs(Math.sin((i / 12) * Math.PI * 2) * R * v)) <= 0.15 + 1e-6),
    on.map((v) => v.toFixed(2)).join()
  );
  const a = makeAabb(-1, 0.5, 0, 2, 1, 2);
  const b = makeAabb(1, 0.5, 0, 2, 1, 2);
  check('across the seam between two blocks that are flush, it is whole', shadowSpokes([a, b], 0, 1, 0, R, 12).every((v) => v === 1));
  const edge = shadowSpokes([floor, a], -0.1, 1, 0, R, 12);
  check(
    'at the edge of a ledge, the side of it over the drop is cut and the side on the ledge is whole',
    edge[0] < 0.5
      && edge[6] === 1,
    edge.map((v) => v.toFixed(2)).join()
  );
}

// ---- The strings of lights are held up ----
{
  const strings = hub.decor.filter((d) => d.kind === 'bulbs');
  const wall = (x: number, y: number, z: number): boolean => room.colliders.some((c) => c.max.y > y && c.min.y < y && x > c.min.x - 0.6 && x < c.max.x + 0.6 && z > c.min.z - 0.6 && z < c.max.z + 0.6);
  const free = strings.flatMap((s) => [[s.x, s.y, s.z], [s.x1, s.y, s.z1]]).filter(([x, y, z]) => !wall(x, y, z));
  check(
    'the Club has strings of lights, and some of their ends are out in the room, at no wall',
    strings.length >= 4
      && free.length >= 4,
    `${free.length} ends at no wall`
  );
  // (As built: over each such end there is a wire going up from it to the roof.)
  const ups: Array<{ x: number; z: number; y0: number; y1: number }> = [];
  room.group.updateMatrixWorld(true);
  room.group.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || !(m.geometry instanceof THREE.CylinderGeometry)) return;
    const box = new THREE.Box3().setFromObject(m);
    if (box.max.y - box.min.y > 1.5 && box.max.x - box.min.x < 0.1 && box.max.z - box.min.z < 0.1) ups.push({ x: (box.min.x + box.max.x) / 2, z: (box.min.z + box.max.z) / 2, y0: box.min.y, y1: box.max.y });
  });
  check(
    'every end that is at no wall hangs from the roof by a wire of its own: none ends in mid air',
    free.every(([x, y, z]) => ups.some((u) => Math.hypot(u.x - x, u.z - z) < 0.05 && Math.abs(u.y0 - y) < 0.05 && u.y1 > y + 1.5)),
    `${ups.length} wires up`
  );
  const held = buildBulbs(4, 0, 0.5, 4, [0, 2]);
  const lone = buildBulbs(4, 0, 0.5, 4);
  check('an end made fast to a wall has no wire up; one hung has', held.children.length === lone.children.length + 2);
}

// ---- The fire's glow is only light ----
{
  const glow = hub.decor.filter((d) => d.kind === 'light' && Math.hypot(d.x, d.z) < 1);
  check(
    'the light over the Club\'s fire is only light: no post or bulb is drawn of it, and nothing is solid in the air there',
    glow.length === 1
      && glow[0].kind === 'light'
      && glow[0].bare === true
      && !hub.solids.some((b) => b.y0 >= 2 && b.x0 < 1 && b.x1 > -1 && b.z0 < 1 && b.z1 > -1)
  );
  check('the other lights of the Club still have their posts', hub.decor.filter((d) => d.kind === 'light' && !d.bare).length >= 4);
}

// ---- The turtle's shell: eight-sided, in flat plates ----
{
  const g = shellGeometry(0x4f5a32, 0x6f7a3e, 0x8a8450);
  const p = g.attributes.position;
  const c = g.attributes.color;
  const light = new THREE.Color(0x6f7a3e);
  // The plates: every light triangle is flat with its neighbours of the same plate; count the planes they lie in.
  const planes = new Set<string>();
  let lightTris = 0;
  for (let i = 0; i < p.count; i += 3) {
    if (Math.abs(c.getX(i) / light.r - c.getY(i) / light.g) > 0.02 || c.getX(i) < light.r * 0.85) continue;
    lightTris++;
    const [a, b, d] = [0, 1, 2].map((k) => new THREE.Vector3().fromBufferAttribute(p, i + k));
    const n = b.clone().sub(a).cross(d.clone().sub(a)).normalize();
    planes.add([n.x, n.y, n.z].map((v) => Math.round(v * 20) + 0).join());
  }
  check(
    'a turtle\'s shell is seventeen flat plates: one octagon in the middle of his back, eight round it, eight below',
    planes.size === 17
      && lightTris === 8 + 16 * 4,
    `${planes.size} plates, ${lightTris} faces of them`
  );
  // Its outline from behind: eight corners, an eighth of a turn apart.
  let widest = 0;
  for (let i = 0; i < p.count; i++) widest = Math.max(widest, Math.hypot(p.getX(i) / 0.37, p.getY(i) / 0.4));
  const corners = new Set<number>();
  for (let i = 0; i < p.count; i++) if (Math.hypot(p.getX(i) / 0.37, p.getY(i) / 0.4) > widest - 1e-4) corners.add(Math.round((Math.atan2(p.getY(i) / 0.4, p.getX(i) / 0.37) * 180) / Math.PI));
  check(
    '...and from behind its outline has eight corners, an eighth of a turn apart: an octagon, not a round',
    corners.size === 8
      && [...corners].every((a) => (((a - 22.5) % 45) + 45) % 45 < 1.5 || (((a - 22.5) % 45) + 45) % 45 > 43.5),
    [...corners].sort((x, y) => x - y).join()
  );
}

// ---- Looking up ----
{
  const C = TUNING.camera;
  const floor = [makeAabb(0, -0.5, 0, 60, 1, 60)];
  const view = (pitch: number): { y: number; elev: number; up: number; below: number } => {
    const cam = new THREE.PerspectiveCamera(55, 4 / 3, 0.1, 200);
    const f = new FollowCamera(cam);
    f.pitch = pitch;
    const focus = new THREE.Vector3(0, 0, 0);
    for (let i = 0; i < 120; i++) f.update(DT, focus, 0, false, 0, 0, floor, { x: 0, z: 0 });
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
    // (How far under the middle of the picture his chest is, as an angle.)
    const toChest = new THREE.Vector3(0, C.targetHeight, 0).sub(cam.position).normalize();
    return { y: cam.position.y, elev: Math.asin(dir.y), up: f.lookingUp, below: Math.asin(dir.y) - Math.asin(toChest.y) };
  };
  const low = view(C.minPitch);
  const mid = view(C.minPitch - C.lookUp / 2);
  const full = view(C.minPitch - C.lookUp);
  check('at its lowest place behind him the view looks down a little, as it always did', low.up === 0 && low.elev < 0 && Math.abs(low.below) < 0.01);
  check(
    'pushed on past that, it LOOKS UP: the further the stick, the higher it looks, to well above level',
    mid.up > 0.4
      && mid.up < 0.6
      && full.up === 1
      && mid.elev > low.elev + 0.15
      && full.elev > mid.elev + 0.15
      && full.elev > 0.3,
    `${(low.elev * 57.3).toFixed(0)}, ${(mid.elev * 57.3).toFixed(0)}, ${(full.elev * 57.3).toFixed(0)} degrees`
  );
  check(
    '...it is never under the floor: it stays clear of the ground beneath it',
    full.y >= C.floorClear - 1e-6
      && mid.y >= C.floorClear - 1e-6,
    `${full.y.toFixed(2)} up at its lowest`
  );
  check(
    '...and he is still in the picture, at the foot of it: his chest no further under its middle than half the view is high',
    full.below < (55 * Math.PI) / 360
      && full.below > 0.2,
    `${(full.below * 57.3).toFixed(0)} degrees under the middle`
  );
  // The stick takes it there and back, and no further.
  const cam = new THREE.PerspectiveCamera(55, 4 / 3, 0.1, 200);
  const f = new FollowCamera(cam);
  for (let i = 0; i < 300; i++) f.update(DT, new THREE.Vector3(), 0, false, 0, -1, floor, { x: 0, z: 0 });
  const down = f.pitch;
  for (let i = 0; i < 300; i++) f.update(DT, new THREE.Vector3(), 0, false, 0, 1, floor, { x: 0, z: 0 });
  check(
    'the right stick tilts it all the way to looking up and all the way back to looking down on him, and stops at each',
    Math.abs(down - (C.minPitch - C.lookUp)) < 1e-9
      && Math.abs(f.pitch - C.maxPitch) < 1e-9
      && f.lookingUp === 0
  );
}

// ---- He is never thrown along a thing he is pressed against ----
{
  const sides: Array<[number, number, number, number]> = [[0, 1, 0, -1], [0, -1, 0, 1], [1, 0, -1, 0], [-1, 0, 1, 0]];
  let worst = 0;
  let where = '';
  let runs = 0;
  for (const [sx, sz, mx, mz] of sides) {
    // (Along each face of the hearth, and exactly at its corners; pushed straight at it with the least push across.)
    for (const along of [-2.3, -2, -1.999999, -1, 0, 1, 1.999999, 2, 2.3]) {
      for (const cross of [0, 1.2e-16, -1.2e-16, 1e-9, -1e-9, 0.01, -0.01, 0.3, -0.3]) {
        const x0 = sx !== 0 ? sx * 4 : along;
        const z0 = sz !== 0 ? sz * 4 : along;
        const p = new PlayerController(new THREE.Vector3(x0, 0, z0));
        for (let i = 0; i < 10; i++) p.update(DT, inp({}), room.colliders);
        const move = new THREE.Vector3(mx + (mx === 0 ? cross : 0), 0, mz + (mz === 0 ? cross : 0));
        for (let i = 0; i < 80; i++) {
          const bx = p.position.x;
          const bz = p.position.z;
          p.update(DT, inp({ move: move.clone() }), room.colliders);
          const went = Math.hypot(p.position.x - bx, p.position.z - bz);
          if (went > worst) {
            worst = went;
            where = `from ${x0},${z0} pushing ${move.x.toExponential(1)},${move.z.toExponential(1)}`;
          }
        }
        runs++;
      }
    }
  }
  check(
    'pressed against the Club\'s hearth anywhere along it, at its corners too, with any least push across: no step ever moves him further than he runs in one (he was thrown from one corner of it to the other)',
    worst <= TUNING.move.run * DT * 1.3 + 1e-6,
    `${runs} approaches; the furthest in a step ${worst.toFixed(3)} (${where})`
  );
  // And one who is put INSIDE a thing is put out at its nearer face, not its far one.
  const box = [makeAabb(0, -0.5, 0, 40, 1, 40), makeAabb(0, 1, 0, 6, 2, 2)];
  const p = new PlayerController(new THREE.Vector3(2.8, 0, 0.2));
  p.update(DT, inp({ move: new THREE.Vector3(-1, 0, 0) }), box);
  check(
    'one who is somehow inside a long thing, near one end of it, is put out at that end, not the length of it away',
    p.position.x > 3
      && p.position.x < 3.4,
    `x ${p.position.x.toFixed(2)}`
  );
}

// ---- The picture: every dot of it a whole number of the screen's dots ----
{
  const screens: Array<[number, number, number]> = [[1920, 1080, 1], [2560, 1440, 1], [3840, 2160, 1], [1552, 900, 1], [1366, 768, 1], [1280, 720, 1.5], [412, 915, 2.625], [900, 400, 3], [320, 240, 1]];
  let ok = true;
  const said: string[] = [];
  for (const [w, h, dpr] of screens) {
    for (const sharp of SHARPS) {
      const rows = SHARP_ROWS[sharp];
      const p = pictureSize(w, h, rows, dpr);
      const W = Math.round(w * dpr);
      const H = Math.round(h * dpr);
      // A whole number of screen dots to a dot; it covers the box and runs no more than a dot of its own over it;
      // and it has the rows asked for (unless the screen itself has fewer).
      if (!Number.isInteger(p.n) || p.n < 1 || p.iw * p.n < W || (p.iw - 1) * p.n >= W || p.ih * p.n < H || (p.ih - 1) * p.n >= H) ok = false;
      if (Math.min(p.iw, p.ih) < Math.min(rows, Math.min(W, H))) ok = false;
      if (Math.abs(p.cssW * dpr - p.iw * p.n) > 1e-6 || Math.abs(p.cssH * dpr - p.ih * p.n) > 1e-6) ok = false;
    }
    said.push(`${w}x${h}: ${SHARPS.map((sh) => pictureSize(w, h, SHARP_ROWS[sh], dpr).ih).join('/')}`);
  }
  check(
    'on every screen tried, at every sharpness, each dot of the picture is a whole number of the screen\'s dots, the picture covers its box and no more than a dot over, and it has at least the rows asked for',
    ok,
    said.join('; ')
  );
  const hd = SHARPS.map((sh) => pictureSize(1920, 1080, SHARP_ROWS[sh]));
  check(
    'on a 1080 screen: chunky is 270 rows at four dots to a dot (it was 240 at four and a half), crisp 360 at three, sharp 540 at two, and HD is the screen\'s own 1080',
    hd.map((p) => `${p.ih}x${p.n}`).join() === '270x4,360x3,540x2,1080x1'
  );
  check(
    'the game starts at HD (his choice), and HD is never stretched on a screen up to twice 1080 high: one screen dot to a dot; on a 4K one, exactly two',
    SHARP_DEFAULT === 'hd'
      && [[1920, 1080], [2560, 1440], [1552, 900], [1366, 768]].every(([w, h]) => pictureSize(w, h, SHARP_ROWS.hd).n === 1)
      && pictureSize(3840, 2160, SHARP_ROWS.hd).n === 2
  );
  check(
    'chunky is the least and the first: the size it always was',
    SHARPS[0] === 'chunky'
      && SHARP_ROWS.chunky === 240
      && SHARP_ROWS.crisp > SHARP_ROWS.chunky
      && SHARP_ROWS.sharp > SHARP_ROWS.crisp
  );
}

console.log(failures ? `\n${failures} FAILED` : '\nall passed');
if (failures) process.exit(1);
