// The collectibles as they are drawn: the crumb, the cap, the relic, the Golden Wedge and the nacho can. Each is a
// sensible size and its own colours; each floats over a shadow where there is floor to cast one on; they twinkle; and
// taking one throws out sparks that are soon gone. (What taking one does to the count is in collect.ts and wedges.ts.)
import './../src/core/colorSetup';
import * as THREE from 'three';
import { CollectibleTracker, type CollectibleDef, type LevelDef as ItemLevel } from '../src/world/collectibles';
import { CollectibleVisuals, ITEM_LOOK } from '../src/world/collectibleMeshes';
import { WedgeVisuals } from '../src/world/wedges';
import { DropField, nachoCanGeometry } from '../src/world/drops';
import { Sparks, capGeometry, crumbGeometry, relicGeometry, relicRingGeometry, twinkleSize, wedgeGeometry } from '../src/world/itemModels';
import { ps1Uniforms } from '../src/render/ps1Material';
import type { WedgeDef } from '../src/levels/types';

const DT = 1 / 60;
let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}
void ps1Uniforms;

/** A shape's size, how many faces it has, and the colours it is painted (as coarse buckets). */
function survey(g: THREE.BufferGeometry): { w: number; h: number; d: number; faces: number; colours: Set<number>; flat: boolean; whole: boolean } {
  g.computeBoundingBox();
  const b = g.boundingBox!;
  const pos = g.attributes.position;
  const col = g.attributes.color;
  const nor = g.attributes.normal;
  const colours = new Set<number>();
  let flat = !g.index;
  let whole = !!col && !!nor && col.count === pos.count;
  for (let i = 0; i + 2 < pos.count && whole; i += 3) {
    colours.add(Math.round(col.getX(i) * 15) * 256 + Math.round(col.getY(i) * 15) * 16 + Math.round(col.getZ(i) * 15));
    // Every face is flat: one normal and one colour across its three corners.
    for (let k = 1; k < 3; k++) {
      if (Math.abs(nor.getX(i) - nor.getX(i + k)) + Math.abs(nor.getY(i) - nor.getY(i + k)) + Math.abs(nor.getZ(i) - nor.getZ(i + k)) > 1e-4) flat = false;
      if (Math.abs(col.getX(i) - col.getX(i + k)) + Math.abs(col.getY(i) - col.getY(i + k)) + Math.abs(col.getZ(i) - col.getZ(i + k)) > 1e-4) flat = false;
    }
    if (!Number.isFinite(pos.getX(i) + pos.getY(i) + pos.getZ(i))) whole = false;
  }
  return { w: b.max.x - b.min.x, h: b.max.y - b.min.y, d: b.max.z - b.min.z, faces: pos.count / 3, colours, flat, whole };
}

// ---- The shapes ----
{
  const crumb = survey(crumbGeometry());
  const cap = survey(capGeometry());
  const relic = survey(relicGeometry());
  const ring = survey(relicRingGeometry());
  const wedge = survey(wedgeGeometry());
  const can = survey(nachoCanGeometry());
  const all = { crumb, cap, relic, ring, wedge, can };
  check(
    'every shape is whole, painted, and flat-faced (so its faces flash as it turns)',
    Object.values(all).every((s) => s.whole && s.flat),
    Object.entries(all).filter(([, s]) => !s.whole || !s.flat).map(([k]) => k).join(', ')
  );
  check(
    'the crumb is a wedge of cheese about half a unit long, longer than it is tall',
    crumb.w > 0.4
      && crumb.w < 0.6
      && crumb.h > 0.2
      && crumb.h < 0.42
      && crumb.d > 0.3,
    `${crumb.w.toFixed(2)} x ${crumb.h.toFixed(2)} x ${crumb.d.toFixed(2)}`
  );
  check('...yellow, with an orange rind and dark holes (at least five colours)', crumb.colours.size >= 5, `${crumb.colours.size}`);
  check(
    'the cap stands on its edge like a coin: round, and thin front to back',
    cap.w > 0.36
      && cap.w < 0.5
      && cap.h > 0.36
      && cap.h < 0.5
      && cap.d < 0.2,
    `${cap.w.toFixed(2)} x ${cap.h.toFixed(2)} x ${cap.d.toFixed(2)}`
  );
  check('...enamel, a star, steel and cork (at least five colours)', cap.colours.size >= 5, `${cap.colours.size}`);
  check(
    'the relic is a cut gem, taller than the crumb or the cap, with a ring wider than itself',
    relic.h > 0.45
      && relic.h < 0.65
      && relic.w > 0.4
      && ring.w > relic.w * 1.4,
    `${relic.w.toFixed(2)} x ${relic.h.toFixed(2)}, ring ${ring.w.toFixed(2)}`
  );
  check(
    'the Golden Wedge is the size it was (a little over a unit tall and wide), and much the biggest',
    wedge.h > 1.0
      && wedge.h < 1.25
      && wedge.w > 1.0
      && wedge.w < 1.25
      && wedge.h > relic.h * 1.7,
    `${wedge.w.toFixed(2)} x ${wedge.h.toFixed(2)} x ${wedge.d.toFixed(2)}`
  );
  check(
    '...with more shape to it than the old one (chamfered edges, a ridged rind, ten holes)',
    wedge.faces > 150
      && wedge.colours.size >= 7,
    `${wedge.faces} faces, ${wedge.colours.size} colours`
  );
  check('the nacho can is the size it was', can.h > 0.3 && can.h < 0.7);
  const sizes = Object.values(ITEM_LOOK);
  check(
    'rarer things twinkle more often and throw more sparks',
    ITEM_LOOK.crumb.twinkleEvery > ITEM_LOOK.cap.twinkleEvery
      && ITEM_LOOK.cap.twinkleEvery > ITEM_LOOK.relic.twinkleEvery
      && ITEM_LOOK.relic.sparkCount > ITEM_LOOK.cap.sparkCount
      && ITEM_LOOK.cap.sparkCount > ITEM_LOOK.crumb.sparkCount
      && sizes.length === 3
  );
}

// ---- In a level ----
{
  const items: CollectibleDef[] = [
    { id: 'c1', kind: 'crumb', x: 0, y: 0.5, z: 0 },
    { id: 'c2', kind: 'crumb', x: 3, y: 4.5, z: 0 }, // high over a gap: nothing under it
    { id: 'k1', kind: 'cap', x: 6, y: 0.5, z: 0 },
    { id: 'r1', kind: 'relic', x: 9, y: 2.5, z: 0 }, // on a block
  ];
  const level: ItemLevel = { id: 'itemtest', name: 'Item test', items };
  const tracker = new CollectibleTracker([level]);
  const floorAt = (x: number, y: number): number | null => (x > 2 && x < 4 ? null : x > 8 ? 2 : y > 3 ? null : 0);
  const vis = new CollectibleVisuals(level, tracker, { floorAt });
  const kids = (name: (o: THREE.Object3D) => boolean): THREE.Object3D[] => vis.group.children.filter(name);
  const shadows = (): THREE.Mesh[] => kids((o) => o instanceof THREE.Mesh && (o.material as THREE.MeshBasicMaterial).color?.getHex() === 0 && !(o.material as THREE.Material).vertexColors) as THREE.Mesh[];
  check('three of the four have a shadow (the one over the gap has none)', vis.shadowCount === 3 && shadows().length === 3);
  check(
    'each shadow lies on the floor under its item, not at the item',
    shadows().map((s) => `${s.position.x},${s.position.y.toFixed(3)}`).join(' ') === '0,0.025 6,0.025 9,2.025'
  );
  const face = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.3, 0.7, 0));
  // Twinkles: each item flashes now and then, and is dark in between.
  const twinkleOf = (root: THREE.Object3D): THREE.Mesh => root.children.find((c) => c instanceof THREE.Mesh && (c.material as THREE.Material).blending === THREE.AdditiveBlending) as THREE.Mesh;
  const roots = kids((o) => o instanceof THREE.Group && o.children.length >= 2 && o !== vis.sparks.group);
  const lit = roots.map(() => 0);
  let biggest = 0;
  let turned = true;
  for (let i = 0; i < 60 * 12; i++) {
    vis.update(DT, i * DT, face);
    roots.forEach((r, k) => {
      const tw = twinkleOf(r);
      if (tw.visible) {
        lit[k]++;
        biggest = Math.max(biggest, tw.scale.x);
        if (tw.quaternion.angleTo(face) > 1.2) turned = false;
      }
    });
  }
  check(
    'every item twinkles within twelve seconds, and is dark most of the time',
    roots.length === 4
      && lit.every((n) => n > 5 && n < 60 * 12 * 0.4),
    lit.join(', ')
  );
  check('a twinkle is small, and turned to face the camera', biggest > 0.05 && biggest < 0.3 && turned, biggest.toFixed(2));
  check(
    'a twinkle opens and shuts',
    twinkleSize(0) === 0
      && twinkleSize(1) === 0
      && twinkleSize(0.5) > 0.9
      && twinkleSize(0.1) > 0
      && twinkleSize(-1) === 0
      && twinkleSize(2) === 0
  );
  // Taking one: sparks, the pop, and it and its shadow are gone.
  const before = vis.sparks.count;
  tracker.collect('k1');
  vis.collected([items[2]]);
  const thrown = vis.sparks.count;
  vis.update(DT, 13, face);
  const far0 = Math.max(...vis.sparks.group.children.map((c) => Math.hypot(c.position.x - 6, c.position.z)));
  for (let i = 0; i < 12; i++) vis.update(DT, 13 + i * DT, face);
  const far1 = Math.max(...vis.sparks.group.children.map((c) => Math.hypot(c.position.x - 6, c.position.z)));
  check(
    'taking the cap throws out its sparks, and they fly outwards',
    before === 0
      && thrown === ITEM_LOOK.cap.sparkCount
      && far1 > far0 + 0.15
      && far1 < 1.5,
    `${thrown} sparks, ${far0.toFixed(2)} -> ${far1.toFixed(2)}`
  );
  for (let i = 0; i < 60; i++) vis.update(DT, 14 + i * DT, face);
  check(
    'within a second the sparks are gone, and so are the cap and its shadow',
    vis.sparks.count === 0
      && vis.sparks.group.children.length === 0
      && shadows().filter((s) => s.visible).length === 2
      && roots.filter((r) => r.visible).length === 3
  );
  tracker.collect('r1');
  vis.collected([items[3]]);
  check('a relic throws more sparks than a cap', vis.sparks.count === ITEM_LOOK.relic.sparkCount && ITEM_LOOK.relic.sparkCount > thrown);
  // Hidden in a crate: neither it nor its shadow shows.
  vis.hidden = (d) => d.id === 'c1';
  for (let i = 0; i < 30; i++) vis.update(DT, 20 + i * DT, face);
  check(
    'a crumb still in its crate shows neither itself nor a shadow',
    shadows().filter((s) => s.visible).length === 0
      && roots.filter((r) => r.visible).length === 1
  );
  // Without a floor finder there are simply no shadows.
  check('with nothing to say where the floor is, there are no shadows', new CollectibleVisuals(level, tracker).shadowCount === 0);
}

// ---- The Golden Wedge ----
{
  const defs: WedgeDef[] = [
    { id: 'a', name: 'A', hint: '', x: 0, y: 0, z: 0, appears: null },
    { id: 'b', name: 'B', hint: '', x: 5, y: 3, z: 0, appears: null },
  ];
  const vis = new WedgeVisuals(defs);
  const face = new THREE.Quaternion();
  const got = new Set<number>([1]);
  let out = true;
  const run = (frames: number, from = 0): void => {
    for (let i = 0; i < frames; i++) vis.update(DT, from + i * DT, () => out, (i2) => got.has(i2), face);
  };
  run(30);
  const items = (vis as unknown as { items: Array<{ root: THREE.Group; body: THREE.Mesh; rays: THREE.Mesh; shadow: THREE.Mesh; pool: THREE.Mesh; twinkles: THREE.Mesh[] }> }).items;
  check(
    'a wedge in the course shows, with its shadow and its pool of light on the floor at its base',
    items[0].root.visible
      && items[0].shadow.visible
      && items[0].pool.visible
      && Math.abs(items[0].shadow.position.y - 0.025) < 1e-6
      && Math.abs(items[1].shadow.position.y - 3.025) < 1e-6
  );
  check('it hangs over its base and bobs', items[0].root.position.y > 0.7 && items[0].root.position.y < 1.0);
  check(
    'one he already has is a pale ghost: no rays, no pool, no twinkles, and nothing bursts when the level loads',
    (items[1].body.material as THREE.MeshBasicMaterial).transparent
      && !items[1].rays.visible
      && !items[1].pool.visible
      && items[1].twinkles.every((t) => !t.visible)
      && vis.sparks.count === 0
  );
  let twinkled = 0;
  for (let i = 0; i < 60 * 4; i++) {
    vis.update(DT, 1 + i * DT, () => out, (i2) => got.has(i2), face);
    if (items[0].twinkles.some((t) => t.visible)) twinkled++;
  }
  check(
    'a gold one twinkles a good part of the time, the ghost never',
    twinkled > 40
      && twinkled < 60 * 4
      && items[1].twinkles.every((t) => !t.visible),
    `${twinkled} of 240 frames`
  );
  const r0 = items[0].rays.rotation.z;
  run(60, 6);
  check('its rays turn slowly behind it', Math.abs(items[0].rays.rotation.z - r0) > 0.2 && Math.abs(items[0].rays.rotation.z - r0) < 1.2);
  got.add(0);
  run(1, 8);
  check(
    'taking it throws a big ring of sparks, and it turns to its ghost',
    vis.sparks.count >= 20
      && (items[0].body.material as THREE.MeshBasicMaterial).transparent
      && !items[0].rays.visible
      && !items[0].pool.visible,
    `${vis.sparks.count} sparks`
  );
  run(60, 8.1);
  check('the sparks are gone within a second', vis.sparks.count === 0);
  // Hidden (not out yet, or a shy one that has gone): nothing shows, and nothing bursts when it comes back.
  out = false;
  run(5, 10);
  const hidden = !items[0].root.visible && !items[0].shadow.visible && !items[0].pool.visible;
  out = true;
  run(5, 11);
  check('a wedge that is not out shows nothing at all, and coming back it does not burst', hidden && items[0].root.visible && vis.sparks.count === 0);
  vis.dispose();
}

// ---- The nacho can and the sparks ----
{
  const field = new DropField();
  field.spawn('nachoCheese', 2, 3, 1, 2);
  const root = field.group.children[0];
  const shadow = root.children.find((c) => c instanceof THREE.Mesh && (c.material as THREE.MeshBasicMaterial).color?.getHex() === 0) as THREE.Mesh;
  let worst = 0;
  for (let i = 0; i < 120; i++) {
    field.update(DT, i * DT);
    root.updateMatrixWorld(true);
    worst = Math.max(worst, Math.abs(shadow.getWorldPosition(new THREE.Vector3()).y - 1.025));
  }
  check('a can out of a crate hops and lands, and its shadow stays on the floor under it the whole time', !!shadow && worst < 0.001, worst.toFixed(4));
  const s = new Sparks();
  s.burst(0, 0, 0, 0xffffff, 6);
  const a = s.group.children.map((c) => c.position.clone());
  const t = new Sparks();
  t.burst(0, 0, 0, 0xffffff, 6);
  for (let i = 0; i < 6; i++) {
    s.update(DT);
    t.update(DT);
  }
  check(
    'sparks use their own dice: two bursts fly the same way',
    s.group.children.every((c, i) => c.position.distanceTo(t.group.children[i].position) < 1e-9)
      && a.length === 6
  );
}

console.log(failures === 0 ? '\nall passed' : `\n${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
