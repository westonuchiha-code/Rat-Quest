// Lord Grimsqueak's spells (npc/grimsqueakModel.ts): five pieces of casting. The owner, 2026-11-16: "give him some
// magic casting animations (casting one hand fireball, summoning minions from the underworld, lightning hands, healing
// himself, casting aoe attack)". And his teeth: "grimsqueak needs his teeth fixed".
import './../src/core/colorSetup';
import * as THREE from 'three';
import { GrimsqueakModel, GRIM_SPELLS, spellStance, type GrimSpell, type GrimInput } from '../src/npc/grimsqueakModel';

let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}
const KINDS = Object.keys(GRIM_SPELLS) as GrimSpell[];
const base: GrimInput = { low: 0, float: 0.55, bow: 0, still: false, talking: false, mouth: 0, gesture: 'rest', reach: 0 };
const DT = 1 / 60;
check(
  'he has five spells: a fireball, a summoning, lightning, a healing and a blast',
  KINDS.join() === 'fireball,summon,lightning,heal,blast'
    && KINDS.every((k) => GRIM_SPELLS[k].length > 1 && GRIM_SPELLS[k].strike > 0.3 && GRIM_SPELLS[k].strike < GRIM_SPELLS[k].length)
);

// Each begins and ends as he stands at rest, and never jumps between two moments.
{
  const flat = (k: GrimSpell, t: number): number[] => {
    const s = spellStance(k, t);
    return [...s.left.arm, s.left.elbow, ...s.right.arm, s.right.elbow, s.spine, s.head, s.jaw];
  };
  const rest = flat('fireball', 0);
  const ends = KINDS.filter((k) => flat(k, 0).some((v, i) => Math.abs(v - rest[i]) > 1e-9) || flat(k, GRIM_SPELLS[k].length).some((v, i) => Math.abs(v - rest[i]) > 1e-9) || flat(k, GRIM_SPELLS[k].length + 5).some((v, i) => Math.abs(v - rest[i]) > 1e-9));
  check('every spell begins from his rest and comes back to it (and stays there if it is run on)', ends.length === 0, ends.join());
  let worst = 0;
  for (const k of KINDS) for (let t = 0; t < GRIM_SPELLS[k].length; t += DT) worst = Math.max(worst, ...flat(k, t + DT).map((v, i) => Math.abs(v - flat(k, t)[i])));
  check(
    'none of them jumps: from one sixtieth of a second to the next no joint turns far',
    worst < 0.35,
    `most in one frame: ${worst.toFixed(3)} of a turn's radian`
  );
  const moves = KINDS.map((k) => Math.max(...Array.from({ length: 40 }, (_, i) => flat(k, (i / 40) * GRIM_SPELLS[k].length)).map((f) => Math.hypot(...f.map((v, i) => v - rest[i])))));
  check('each of them MOVES him: well away from his rest at some moment', moves.every((m) => m > 1.2), moves.map((m) => m.toFixed(1)).join(' '));
  // No two of them are the same show.
  const sig = KINDS.map((k) => flat(k, GRIM_SPELLS[k].strike + 0.1).map((v) => v.toFixed(1)).join());
  check('no two look alike at the moment of the blow', new Set(sig).size === KINDS.length);
}

// The light of each: nothing shown when he is not casting; something shown at its blow; nothing left on after.
{
  const g = new GrimsqueakModel();
  const fx = (g as unknown as { fx: THREE.Group }).fx;
  const lit = (): number => fx.children.filter((o) => o.visible).length;
  for (let i = 0; i < 30; i++) g.update(DT, base);
  check('standing, none of the spells\' light is showing', lit() === 0);
  const never: string[] = [];
  const stuck: string[] = [];
  const bad: string[] = [];
  for (const k of KINDS) {
    let most = 0;
    for (let t = 0; t <= GRIM_SPELLS[k].length; t += DT) {
      g.update(DT, { ...base, spell: { kind: k, t } });
      if (t > GRIM_SPELLS[k].strike && t < GRIM_SPELLS[k].strike + 0.3) most = Math.max(most, lit());
      fx.traverse((o) => {
        const p = (o as THREE.Mesh).geometry?.attributes.position;
        if (o.visible && ![o.position.x, o.position.y, o.position.z, o.scale.x].every(Number.isFinite)) bad.push(k);
        if (o.visible && p && !Number.isFinite(p.getX(0))) bad.push(k);
      });
    }
    if (most === 0) never.push(k);
    for (let i = 0; i < 5; i++) g.update(DT, base);
    if (lit() !== 0) stuck.push(k);
  }
  check('each spell shows its light at its blow', never.length === 0, never.join());
  check('and when it is over nothing of it is left showing', stuck.length === 0, stuck.join());
  check('nothing of the light is ever put nowhere (no bad numbers)', bad.length === 0, [...new Set(bad)].join());
  // The fireball leaves his claw and goes forward.
  const fire = (g as unknown as { fire: THREE.Group }).fire;
  g.update(DT, { ...base, spell: { kind: 'fireball', t: 0.5 } });
  const held = fire.position.clone();
  for (let t = 0.5; t <= 1.3; t += DT) g.update(DT, { ...base, spell: { kind: 'fireball', t } });
  check(
    'the fireball is in his claw before the throw (up by his shoulder) and well out in front of him after it',
    held.y > 1.2
      && Math.abs(held.z) < 0.9
      && fire.position.z - held.z > 3,
    `from ${held.z.toFixed(2)} to ${fire.position.z.toFixed(2)} ahead`
  );
}

// His teeth: rooted in his snout, not hung under it.
{
  const g = new GrimsqueakModel();
  g.update(DT, base);
  g.root.updateMatrixWorld(true);
  const teeth: THREE.Mesh[] = [];
  g.root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh && m.geometry.type === 'CylinderGeometry' && (m.parent as THREE.Mesh)?.isMesh && (m.parent as THREE.Mesh).geometry.type === 'ConeGeometry') teeth.push(m);
  });
  const snout = teeth[0]?.parent as THREE.Mesh | undefined;
  const box = snout ? new THREE.Box3().setFromBufferAttribute(snout.geometry.attributes.position as THREE.BufferAttribute) : null;
  const rooted = teeth.every((tooth) => {
    const tb = new THREE.Box3().setFromBufferAttribute(tooth.geometry.attributes.position as THREE.BufferAttribute);
    // (In the snout's own space: its top is inside the snout, its end is below the snout's underside there.)
    const top = tooth.position.y + tb.max.y;
    const end = tooth.position.y + tb.min.y * Math.cos(tooth.rotation.x);
    const under = -0.78 * 0.155 * ((0.23 - tooth.position.z) / 0.46);
    return top > under && end < under - 0.04 && !!box && tooth.position.z < box.max.z;
  });
  check(
    'he has two front teeth, each ROOTED in the underside of his snout and hanging below it (they were cards hung in the air under it)',
    teeth.length === 2
      && rooted
      && teeth[0].position.x * teeth[1].position.x < 0
  );
}
console.log(failures === 0 ? '\nGrimsqueak spell checks passed.' : `\n${failures} Grimsqueak spell check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
