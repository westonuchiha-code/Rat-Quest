// Furniture: the couch and the fire bowl. What is DRAWN of each must match what is SOLID of it (the owner found the
// knight standing inside both), and each must have the detail he asked for.
import './../src/core/colorSetup';
import * as THREE from 'three';
import { buildCouch } from '../src/world/couchModel';
import { buildBrazier } from '../src/world/brazierModel';
import { BRAZIER, COUCH, inBrazierFire, type Box, type Decor } from '../src/world/layout';
import { compileCustom, emptyCustom } from '../src/levels/custom';
import { PlayerController, type PlayerInput } from '../src/player/controller';
import { makeAabb } from '../src/world/collision';
import { TUNING } from '../src/data/tuning';
import { TEXTURE_NAMES, TEXTURE_SETS, getTexturePixels } from '../src/render/textures';

let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}
const m = new THREE.MeshBasicMaterial();
/** The box round every part of a model with one of these names. */
function boxOf(root: THREE.Object3D, ...names: string[]): THREE.Box3 {
  root.updateMatrixWorld(true);
  const b = new THREE.Box3();
  root.traverse((o) => {
    if (o instanceof THREE.Mesh && (names.length === 0 || names.includes(o.name))) b.expandByObject(o);
  });
  return b;
}
const count = (root: THREE.Object3D, name: string): number => {
  let n = 0;
  root.traverse((o) => void (o instanceof THREE.Mesh && o.name === name && n++));
  return n;
};
const near = (a: number, b: number, tol = 0.011): boolean => Math.abs(a - b) <= tol;

// ---- The couch ----
{
  const couch = buildCouch({ cloth: m, patch: m, blanket: m, plain: m });
  const C = COUCH;
  const seat = boxOf(couch, 'seat');
  const back = boxOf(couch, 'back');
  const arm = boxOf(couch, 'arm');
  const pillow = boxOf(couch, 'pillow');
  check('the seat cushions\' tops are the seat he stands on, and they fill the space between the arms', near(seat.max.y, C.seat) && near(seat.min.x, -C.armIn, 0.02) && near(seat.max.x, C.armIn, 0.02) && near(seat.max.z, C.front, 0.02) && near(seat.min.z, C.seatBack, 0.02), `top ${seat.max.y.toFixed(3)}`);
  check('the back is as high and as deep as its solid', near(back.max.y, C.backTop) && near(back.min.z, C.back) && near(back.max.z, C.seatBack) && near(back.max.x, C.half));
  check('the arms are as high and as wide as their solids, rolled along the top', near(arm.max.y, C.armTop) && near(arm.max.x, C.armOut) && near(arm.min.x, -C.armOut) && near(arm.max.z, C.front, 0.03), `top ${arm.max.y.toFixed(3)}`);
  check('the pillow on the seat is where its solid is', near(pillow.max.y, C.pillow.top) && near(pillow.min.x, C.pillow.x0, 0.03) && near(pillow.max.x, C.pillow.x1, 0.03) && near(pillow.min.z, C.pillow.z0, 0.03) && near(pillow.max.z, C.pillow.z1, 0.03));
  // The solids a couch piece makes, and that nothing is drawn far outside them.
  const lv = emptyCustom();
  lv.pieces.push({ t: 'couch', x0: 0, z0: 0, x1: 0, z1: 0, top: 0, dir: 's' });
  const solids = compileCustom(lv).solids.filter((b) => b.kind === 'plank' && b.hidden && Math.abs((b.x0 + b.x1) / 2) < 1.4 && Math.abs((b.z0 + b.z1) / 2) < 0.7);
  check('a couch is five solid things: its seat, its back, two arms and the pillow', solids.length === 5, `${solids.length}`);
  const overlap = (a: Box, b: Box): boolean => a.x0 < b.x1 - 1e-6 && a.x1 > b.x0 + 1e-6 && a.y0 < b.y1 - 1e-6 && a.y1 > b.y0 + 1e-6 && a.z0 < b.z1 - 1e-6 && a.z1 > b.z0 + 1e-6;
  check('...no two of them overlapping', solids.every((a, i) => solids.every((b, j) => i >= j || !overlap(a, b))));
  const inside = (p: THREE.Vector3, grow: number): boolean => solids.some((b) => p.x >= b.x0 - grow && p.x <= b.x1 + grow && p.y >= b.y0 - grow && p.y <= b.y1 + grow && p.z >= b.z0 - grow && p.z <= b.z1 + grow);
  let worst = 0;
  let worstName = '';
  const v = new THREE.Vector3();
  couch.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    const pos = o.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
      for (const g of [0, 0.02, 0.04, 0.06, 0.08, 0.1, 0.12, 0.2]) {
        if (inside(v, g)) {
          if (g > worst) {
            worst = g;
            worstName = o.name;
          }
          break;
        }
        if (g === 0.2) {
          worst = 9;
          worstName = o.name;
        }
      }
    }
  });
  check('nothing of it is drawn more than a hand\'s breadth outside what is solid (the blanket, the stuffing and the back cushions stand a little proud)', worst <= 0.12, `the furthest out is ${worstName}, within ${worst}`);
  check('it is an old couch: two patches, two rips and a sewn-up tear, stuffing coming out, piping, a foot that is a brick', count(couch, 'patch') === 2 && count(couch, 'rip') === 3 && count(couch, 'stitch') >= 4 && count(couch, 'stuffing') >= 6 && count(couch, 'piping') >= 4 && count(couch, 'foot') === 4);
  check('...and a cosy one: two seat cushions, two back cushions, a pillow, and a blanket over one arm with a fringe', count(couch, 'seat') === 2 && count(couch, 'backCushion') === 2 && count(couch, 'pillow') === 1 && count(couch, 'blanket') >= 8 && boxOf(couch, 'blanket').max.x < 0);
  // Its cloth: warm, and not one flat colour.
  const px = getTexturePixels('couchFabric');
  let r = 0, g = 0, b = 0;
  const seen = new Set<number>();
  for (let i = 0; i < px.data.length; i += 4) {
    r += px.data[i];
    g += px.data[i + 1];
    b += px.data[i + 2];
    seen.add((px.data[i] << 16) | (px.data[i + 1] << 8) | px.data[i + 2]);
  }
  const n = px.data.length / 4;
  check('its cloth is a warm colour (more red than green, more green than blue), and worn and stained: many shades, not one', r / n > g / n + 25 && g / n > b / n && seen.size > 30, `average ${Math.round(r / n)}, ${Math.round(g / n)}, ${Math.round(b / n)}; ${seen.size} colours`);
}

// ---- The fire bowl ----
{
  const char = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
  const b = buildBrazier({ stone: m, iron: m, char, coals: m, flame: m });
  const all = boxOf(b.group);
  const flames = new THREE.Box3();
  for (const f of b.flames) flames.expandByObject(f.mesh);
  const solidRim = BRAZIER.rim;
  check('the fire bowl stands on the floor, with three tongues of flame rising from its coals', near(all.min.y, 0) && b.flames.length === 3 && flames.min.y > BRAZIER.coals - 0.1 && flames.max.y > solidRim + 0.6);
  // Everything but the flames: no wider than the bowl (its ring handles hang a little outside it).
  const body = new THREE.Box3();
  b.group.updateMatrixWorld(true);
  b.group.traverse((o) => void (o instanceof THREE.Mesh && !b.flames.some((f) => f.mesh === o) && body.expandByObject(o)));
  const reach = Math.max(-body.min.x, body.max.x, -body.min.z, body.max.z);
  check('nothing of it but the flames stands above its rim, and nothing is wider than its bowl', near(body.max.y, solidRim, 0.02) && reach <= BRAZIER.bowl + 0.01, `${body.max.y.toFixed(2)} high, ${reach.toFixed(2)} out`);
  // It is a plain thing: a foot, a stem, a bowl, its inside, the coals and the fire. (The first one made had more
  // than thirty parts; the owner: "almost too much ... a little less detailed".)
  let parts = 0;
  let inner: THREE.Mesh | null = null;
  b.group.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    parts++;
    if (o.material === char) inner = o;
  });
  check('it is made of a few plain shapes: a dozen parts at most', parts <= 12, `${parts}`);
  // The inside of the bowl closes it: from straight above, every way down into the bowl meets it (or the coals).
  const ray = new THREE.Raycaster();
  let open = 0;
  for (let k = 0; k < 40; k++) {
    const a = k * 0.61, r = 0.05 + (k % 8) * 0.07;
    ray.set(new THREE.Vector3(Math.cos(a) * r, 3, Math.sin(a) * r), new THREE.Vector3(0, -1, 0));
    const hit = ray.intersectObjects(b.group.children.filter((o) => !b.flames.some((f) => f.mesh === o)), false)[0];
    if (!hit || hit.point.y < BRAZIER.coals - 0.2) open++;
  }
  check('looking down into the bowl nothing shows through it: its burnt inside and its coals fill it', !!inner && open === 0, `${open} of 40 lines down go through`);
  const lv = emptyCustom();
  lv.pieces.push({ t: 'brazier', x0: 0, z0: 0, x1: 0, z1: 0, top: 0 });
  const solids = compileCustom(lv).solids.filter((s) => s.hidden && Math.abs((s.x0 + s.x1) / 2) < 0.01 && Math.abs((s.z0 + s.z1) / 2) < 0.01);
  check('it is two solid things, one on the other: its foot and stem, and its bowl, which is wider', solids.length === 2 && solids[0].y1 === BRAZIER.bowlFrom && solids[1].y0 === BRAZIER.bowlFrom && solids[1].y1 === BRAZIER.rim && near((solids[0].x1 - solids[0].x0) / 2, BRAZIER.foot) && (solids[1].x1 - solids[1].x0) / 2 > BRAZIER.foot && (solids[1].x1 - solids[1].x0) / 2 <= BRAZIER.bowl);
}

// ---- Its fire burns ----
// (The owner, 2026-11-15: he could stand on the bowl, in the fire, and be offered a rest there. "It's fire so you
// shouldn't be able to just stand in it.")
{
  const decor: Decor[] = [{ kind: 'brazier', x: 4, y: 0.4, z: -2 }];
  const rim = 0.4 + BRAZIER.rim;
  check('standing on the bowl, he is in the fire', inBrazierFire(decor, 4, rim, -2)?.x === 4 && !!inBrazierFire(decor, 4.3, rim, -2.3));
  check('...and so is anyone jumping through the flames above it, as high as they stand', !!inBrazierFire(decor, 4, rim + 0.8, -2) && !inBrazierFire(decor, 4, rim + 1.2, -2));
  check('beside it on the floor he is not: he can warm himself, and rest', !inBrazierFire(decor, 4 + BRAZIER.bowl + 0.3, 0.4, -2) && !inBrazierFire(decor, 4, 0.4, -2 + 0.9) && !inBrazierFire(decor, 4.9, 0, -2));
  check('nor with his feet only on the rim\'s outer edge, clear of the coals', !inBrazierFire(decor, 4 + BRAZIER.bowl, rim, -2));
  check('a level with no fire bowl has no such fire', inBrazierFire([], 0, 1, 0) === null && inBrazierFire(undefined, 0, 1, 0) === null);
  // Played: he is dropped onto a bowl and left alone. He is burned once, thrown clear of it, and not burned again.
  // (The game does this each step, in lavaStep: in the fire, he takes the burn and is thrown up and off.)
  const lv = emptyCustom();
  lv.pieces.push({ t: 'brazier', x0: 0, z0: 0, x1: 0, z1: 0, top: 0 });
  const def = compileCustom(lv);
  const cs = def.solids.map((q) => makeAabb((q.x0 + q.x1) / 2, (q.y0 + q.y1) / 2, (q.z0 + q.z1) / 2, q.x1 - q.x0, q.y1 - q.y0, q.z1 - q.z0));
  const inp = (o: Partial<PlayerInput>): PlayerInput => ({ move: new THREE.Vector3(), run: true, jumpPressed: false, jumpHeld: false, attackPressed: false, dodgeHeld: false, dodgePressed: false, guardHeld: false, stowPressed: false, ...o } as PlayerInput);
  const drop = (move: THREE.Vector3): { burns: number; stoodIn: number; end: THREE.Vector3; hp: number } => {
    const p = new PlayerController(new THREE.Vector3(0, BRAZIER.rim + 0.6, 0));
    let burns = 0;
    let stoodIn = 0;
    for (let i = 0; i < 300; i++) {
      p.update(1 / 60, inp({ move }), cs);
      const bowl = inBrazierFire(def.decor, p.position.x, p.position.y, p.position.z);
      if (bowl) {
        if (p.grounded) stoodIn++;
        const r = p.takeBurn(bowl.x, bowl.z, 1);
        if (r === 'hit' || r === 'killed') {
          burns++;
          p.velocity.y = Math.max(p.velocity.y, 5);
        }
      }
    }
    return { burns, stoodIn, end: p.position.clone(), hp: p.hp };
  };
  const still = drop(new THREE.Vector3());
  check('dropped onto a bowl and left alone: burned once, thrown clear of it onto the floor, and not burned again', still.burns === 1 && still.hp === TUNING.health.max - 1 && still.end.y < 0.05 && Math.hypot(still.end.x, still.end.z) > BRAZIER.bowl + 0.3, `${still.burns} burn(s); he ends ${Math.hypot(still.end.x, still.end.z).toFixed(2)} from its middle, ${still.end.y.toFixed(2)} up`);
  check('...he never gets to stand in it: a few frames at most before the fire has him', still.stoodIn <= 3, `${still.stoodIn} frames`);
}

// ---- The pictures made for them are not offered for building rooms with ----
{
  const props = ['wroughtIron', 'cutStone', 'charred', 'coals', 'couchFabric', 'couchPatch', 'knitBlanket'];
  const offered = Object.values(TEXTURE_SETS).flat() as string[];
  check('the pictures things are made of exist, and are not in the level builder\'s lists', props.every((p) => (TEXTURE_NAMES as readonly string[]).includes(p) && !offered.includes(p)));
}

console.log(failures === 0 ? 'furniture: all passed' : `furniture: ${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
