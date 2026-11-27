// GETTING UP, CHECKED FOR CLIPPING (2026-11-27). The owner: "be extra careful for clipping cuz clipping ruins cut
// scenes like this". Every frame of the game's first moment (src/player/animations.ts `wakePose`, levels/wake.ts) with
// the real model: no part of him goes into the floor; his blade never goes into the floor nor through his own body;
// the half sword lying by him lies ON the floor, clear of him, and is within his reach when his paw closes on it.
import './../src/core/colorSetup';
import * as THREE from 'three';
import { RatModel } from '../src/player/ratModel';
import { WAKE_GRAB } from '../src/player/animations';
import { placeHilt } from '../src/player/wakeHilt';
import { WAKE } from '../src/levels/wake';

let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}
const DT = 1 / 60;
const SECS = 7.5;
const base = {
  state: 'idle' as const, planarSpeed: 0, comboStep: 0, attackTime: 0, dodgeKind: 'roll' as const, dodgeProgress: 0,
  verticalSpeed: 0, flipProgress: 0, armed: true, stowProgress: -1, plungeStage: 0,
};
const at = new THREE.Vector3(WAKE.at.x, 0, WAKE.at.z);
// (As in the game: half a sword, and nothing on his shield arm.)
const rat = new RatModel();
rat.setKit({ broken: true, bare: true });
rat.setTransform(at, WAKE.facing);

/** Every lit mesh of a thing, as world points (skipping what is hidden). */
function points(root: THREE.Object3D): Array<{ name: string; p: THREE.Vector3[] }> {
  root.updateMatrixWorld(true);
  const out: Array<{ name: string; p: THREE.Vector3[] }> = [];
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || !(m.material instanceof THREE.ShaderMaterial)) return;
    for (let q: THREE.Object3D | null = o; q; q = q.parent) if (!q.visible) return;
    const pos = m.geometry.attributes.position;
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i < pos.count; i++) pts.push(new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld));
    let name = '';
    for (let q: THREE.Object3D | null = o; q && !name; q = q.parent) name = q.name;
    out.push({ name: name || 'part', p: pts });
  });
  return out;
}

// Settle him lying, then every frame of getting up.
for (let i = 0; i < 90; i++) rat.update(DT, { ...base, waking: 0 });
let lowest = Infinity;
let lowAt = '';
let bladeLow = Infinity;
let bladeLowAt = '';
const b = new THREE.Vector3();
const t = new THREE.Vector3();
const n = Math.round(SECS / DT);
for (let i = 0; i <= n; i++) {
  const k = i / n;
  rat.update(DT, { ...base, waking: k });
  for (const part of points(rat.root)) {
    for (const p of part.p) {
      if (p.y < lowest) {
        lowest = p.y;
        lowAt = `${(k * 100).toFixed(0)}% through, ${part.name}`;
      }
    }
  }
  if (k >= WAKE_GRAB + 0.02) {
    rat.getBlade(b, t);
    const low = Math.min(b.y, t.y);
    if (low < bladeLow) {
      bladeLow = low;
      bladeLowAt = `${(k * 100).toFixed(0)}% through`;
    }
  }
}
// (Held to a hundredth: at first his ear went 0.16 into the floor lying down, his tail 0.35 and a knee 0.1 getting up.)
check('getting up: no part of him goes into the floor, in any frame (a hundredth at most: the soft edge of a foot)', lowest > -0.012, `lowest ${lowest.toFixed(3)} at ${lowAt}`);
check('...once the half sword is in his paw, neither end of its blade goes into the floor', bladeLow > -0.01, `lowest ${bladeLow.toFixed(3)} at ${bladeLowAt}`);

// HIS PAWS ON THE FLOOR as he pushes up and is on all fours (the owner, 2026-11-27: "It looks like he's pushing up off
// the air right he should be pushing up off the ground": they were 0.25 to 0.37 up).
{
  const r = new RatModel();
  r.setKit({ broken: true, bare: true });
  r.setTransform(at, WAKE.facing);
  const s = new THREE.Vector3();
  const h = new THREE.Vector3();
  const off: string[] = [];
  for (const k of [0.44, 0.5, 0.55]) {
    for (let i = 0; i < 120; i++) r.update(DT, { ...base, waking: k });
    r.paws(s, h);
    // (A paw's middle half a paw up: its underside on the floor.)
    if (Math.abs(s.y - 0.045) > 0.025 || Math.abs(h.y - 0.045) > 0.025) off.push(`${(k * 100).toFixed(0)}%: ${s.y.toFixed(3)} / ${h.y.toFixed(3)}`);
  }
  check('pushing up and on all fours, both his paws are ON the floor (not in the air)', off.length === 0, off.join('; ') || 'at 44%, 50% and 55%');
}

// The half sword on the floor: laid as the game lays it (main.ts `layHilt`).
{
  const r2 = new RatModel();
  r2.setKit({ broken: true, bare: true });
  const h = r2.looseSword();
  placeHilt(h, at, WAKE.facing);
  const box = new THREE.Box3();
  for (const part of points(h)) for (const p of part.p) box.expandByPoint(p);
  check('the half sword on the floor lies ON it: nothing under the floor, and flat (no higher than a hilt is thick)', box.min.y > -0.005 && box.max.y < 0.16, `from ${box.min.y.toFixed(3)} to ${box.max.y.toFixed(3)}`);
  // Clear of him, lying there: no point of it within a finger's breadth of any point of him.
  const r3 = new RatModel();
  r3.setKit({ broken: true, bare: true });
  r3.setTransform(at, WAKE.facing);
  for (let i = 0; i < 90; i++) r3.update(DT, { ...base, waking: 0 });
  const him = points(r3.root).flatMap((part) => part.p);
  const it = points(h).flatMap((part) => part.p);
  let near = Infinity;
  for (const p of it) for (const q of him) near = Math.min(near, p.distanceTo(q));
  check('...and clear of him as he lies there (not under him, not through him)', near > 0.02, `nearest ${near.toFixed(3)}`);
  // In reach when his paw closes on it: his sword paw's hilt then within a few fingers of where the sword lies.
  const r4 = new RatModel();
  r4.setKit({ broken: true, bare: true });
  r4.setTransform(at, WAKE.facing);
  for (let i = 0; i < 90; i++) r4.update(DT, { ...base, waking: 0 });
  for (let k = 0; k <= WAKE_GRAB; k += DT / SECS) r4.update(DT, { ...base, waking: k });
  r4.paws(b, t);
  const centre = box.getCenter(new THREE.Vector3());
  const gap = Math.hypot(b.x - centre.x, b.z - centre.z);
  // (The paw's middle closes on it: the sword lies 0.05 thick, a paw is 0.09 across. At first he took it 0.3 up in the air.)
  check('...and his paw closes ON it when he takes it up (not on the air beside it)', gap < 0.12 && b.y < 0.13, `paw ${gap.toFixed(2)} off it, ${b.y.toFixed(2)} up`);
}

console.log(failures === 0 ? '\nwakeclip: all passed' : `\nwakeclip: ${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
