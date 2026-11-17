// The combat rework: turn-taking, the roach's two attacks and hop-back, the toad's pounce, the parry window and input buffers.
import './../src/core/colorSetup';
import * as THREE from 'three';
import { PlayerController, PlayerInput } from '../src/player/controller';
import { Scuttler } from '../src/enemies/scuttler';
import { Toad, TOAD } from '../src/enemies/toad';
import { Director } from '../src/enemies/director';
import { Scorpion } from '../src/enemies/scorpion';
import { Guard } from '../src/enemies/guard';
import { Mantis } from '../src/enemies/mantis';
import { Ant } from '../src/enemies/ant';
import type { Foe } from '../src/enemies/foe';
import { buildChamber } from '../src/world/chamber';
import { TUNING } from '../src/data/tuning';

const DT = 1 / 60;
const S = TUNING.scuttler;
let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}

// ---- The director: one attacker at a time, two in a crowd ----
{
  const fake = (x: number, z: number): Foe => ({ x, z, alive: true, ready: true, attacking: false, mayAttack: false } as unknown as Foe);
  const three = [fake(3, 0), fake(0, 3), fake(-3, 0)];
  const d = new Director();
  d.update(DT, three, 0, 0);
  check('of three waiting enemies one may attack', three.filter((e) => e.mayAttack).length === 1);
  const first = three.find((e) => e.mayAttack)!;
  check('the nearest goes first', Math.hypot(first.x, first.z) === 3);
  (first as { attacking: boolean }).attacking = true;
  d.update(DT, three, 0, 0);
  check('while one attacks, nobody else may', three.filter((e) => e !== first && e.mayAttack).length === 0);
  (first as { attacking: boolean }).attacking = false;
  d.update(DT, three, 0, 0);
  check('there is a breath between attacks', three.filter((e) => e.mayAttack).length === 0);
  for (let i = 0; i < 60; i++) d.update(DT, three, 0, 0);
  check('then the next may go', three.filter((e) => e.mayAttack).length === 1);

  const four = [fake(3, 0), fake(0, 3), fake(-3, 0), fake(0, -3)];
  const d4 = new Director();
  d4.update(DT, four, 0, 0);
  const lead = four.find((e) => e.mayAttack) as unknown as { attacking: boolean; ready: boolean };
  lead.attacking = true;
  lead.ready = false; // an enemy mid-attack is not waiting any more
  for (let i = 0; i < 60; i++) d4.update(DT, four, 0, 0);
  check('with four in the fight two may attack at once', four.filter((e) => e.mayAttack || e.attacking).length === 2);

  const far = fake(40, 0);
  d.update(DT, [far], 0, 0);
  check('one far from the rat does as it likes', far.mayAttack);
  // The one he is LOCKED ON to (2026-11-16: "the enemy you are locked on to fights harder").
  {
    const trio = [fake(2, 0), fake(0, 4), fake(-6, 0)];
    const locked = trio[2]; // the FURTHEST of the three
    const dl = new Director();
    dl.update(DT, trio, 0, 0, locked);
    check('locked on to one of three, THAT one has first claim on the attack, though it is the furthest off', locked.mayAttack && trio.filter((e) => e.mayAttack).length === 1);
    // How long each must wait after an attack: the locked one comes again sooner.
    const breath = (lock: boolean): number => {
      const two = [fake(2, 0), fake(0, 4)];
      const dd = new Director();
      dd.update(DT, two, 0, 0, lock ? two[0] : null);
      (two[0] as { attacking: boolean }).attacking = true;
      dd.update(DT, two, 0, 0, lock ? two[0] : null);
      (two[0] as { attacking: boolean }).attacking = false;
      let frames = 0;
      for (; frames < 200; frames++) {
        dd.update(DT, two, 0, 0, lock ? two[0] : null);
        if (two[0].mayAttack) break;
      }
      return frames * DT;
    };
    const plain = breath(false);
    const duel = breath(true);
    check('...and it waits a shorter breath before it comes again: under half the wait of one he is not locked on to. Locking on is a duel, and the one he duels presses him harder (never easier)', duel < plain * 0.5 && duel > 0.2 && plain > 0.6, `${duel.toFixed(2)} s against ${plain.toFixed(2)} s`);
    const busy = [fake(2, 0), fake(0, 4)];
    const db = new Director();
    (busy[1] as { ready: boolean }).ready = false;
    db.update(DT, busy, 0, 0, busy[1]);
    check('a locked-on enemy that is not ready does not hold the others up: the nearest waiting one goes', busy[0].mayAttack && !busy[1].mayAttack);
    const away = [fake(2, 0), fake(30, 0)];
    const da = new Director();
    da.update(DT, away, 0, 0, away[1]);
    check('...nor does one locked on to from across the room', away[0].mayAttack);
  }
}

// ---- Locked on to one, the others wait at his SIDES ("enemies moving to your sides when you're locked on to one", 2026-11-17) ----
{
  const wrapA = (a: number): number => Math.atan2(Math.sin(a), Math.cos(a));
  const fight = (lock: boolean): { side: number; front: number; attacks: number; lockedAttacks: number; atOnce: number } => {
    // Three roaches that start bunched in FRONT of him, the way they arrive down a corridor.
    const pack = [new Scuttler({ x: 0, z: 5, hunt: true }), new Scuttler({ x: 1.2, z: 5.5, hunt: true }), new Scuttler({ x: -1.2, z: 5.5, hunt: true })];
    let seed = 7;
    for (const e of pack) e.rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const d = new Director();
    const out = { side: 0, front: 0, attacks: 0, lockedAttacks: 0, atOnce: 0 };
    const was = pack.map((e) => e.state);
    for (let i = 0; i < 60 * 40; i++) {
      d.update(DT, pack, 0, 0, lock ? pack[0] : null);
      for (const e of pack) e.update(DT, 0, 0, 0, true, false);
      pack.forEach((e, k) => {
        if (e.state === 'windup' && was[k] !== 'windup') { out.attacks++; if (k === 0) out.lockedAttacks++; }
        was[k] = e.state;
      });
      out.atOnce = Math.max(out.atOnce, pack.filter((e) => e.attacking).length);
      if (i < 60 * 4) continue; // give them a moment to get there
      const front = Math.atan2(pack[0].x, pack[0].z);
      for (const e of pack.slice(1)) {
        if (e.state !== 'chase' || e.mode !== 'circle') continue;
        const off = Math.abs(wrapA(Math.atan2(e.x, e.z) - front));
        if (Math.abs(off - Math.PI / 2) < 0.5) out.side++;
        if (off < 0.6) out.front++;
      }
    }
    return out;
  };
  const free = fight(false);
  const duel = fight(true);
  check('locked on to one roach of three, the two that wait spend their waiting at his SIDES, far more than a crowd he is not locked on to does (they also charge through him and back, which is why it is not all of it)', duel.side > free.side * 1.7 && duel.side > 900, `${duel.side} frames against ${free.side}`);
  check('...and not bunched in front of him with the one he is fighting', duel.front < duel.side * 0.1, `${duel.front} frames in front`);
  check('they still take their turns from there: the ones at his sides attack too, and never two at once', duel.attacks - duel.lockedAttacks >= 3 && duel.atOnce === 1, `${duel.attacks} attacks, ${duel.lockedAttacks} by the locked one`);
  check('nothing got easier: there are at least as many attacks in the same time as with no lock', duel.attacks >= free.attacks, `${duel.attacks} against ${free.attacks}`);
  // Two take a hand each; nobody crosses in front of him to get to his place.
  const three = [new Scuttler({ x: 0, z: 5, hunt: true }), new Scuttler({ x: 3, z: 2, hunt: true }), new Scuttler({ x: -3, z: 2, hunt: true })];
  const d3 = new Director();
  d3.update(DT, three, 0, 0, three[0]);
  check('the one already on his right is sent to his right hand and the one on his left to his left', Math.abs(three[1].flank! - Math.PI / 2) < 0.01 && Math.abs(three[2].flank! + Math.PI / 2) < 0.01 && three[0].flank === null);
  d3.update(DT, three, 0, 0, null);
  check('the lock let go, they are free to circle as they like again', three.every((e) => e.flank === null));
}

// ---- The same for the other creatures that wait their turn round him on foot (2026-11-17, BACKLOG A9's rest) ----
{
  type Walker = Foe & { x: number; z: number; flank: number | null; rng: () => number; update(dt: number, x: number, y: number, z: number, alive: boolean): void };
  const kinds: [string, (x: number, z: number) => Walker][] = [
    ['scorpion', (x, z) => new Scorpion({ x, z, hunt: true }) as unknown as Walker],
    ['guard', (x, z) => new Guard({ x, z, hunt: true }) as unknown as Walker],
    ['mantis', (x, z) => new Mantis({ x, z, hunt: true }) as unknown as Walker],
    ['ant', (x, z) => new Ant({ x, z, hunt: true }) as unknown as Walker],
  ];
  const wrapA = (a: number): number => Math.atan2(Math.sin(a), Math.cos(a));
  for (const [kind, make] of kinds) {
    const fight = (lock: boolean): { side: number; looked: number; attacks: number; atOnce: number } => {
      // Three, bunched in FRONT of him; he stands still (a test of where they go, not of the fight).
      const pack = [make(0, 5), make(1.2, 5.5), make(-1.2, 5.5)];
      let seed = 11;
      for (const e of pack) e.rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
      const d = new Director();
      const out = { side: 0, looked: 0, attacks: 0, atOnce: 0 };
      const was = pack.map((e) => e.attacking);
      for (let i = 0; i < 60 * 40; i++) {
        d.update(DT, pack, 0, 0, lock ? pack[0] : null);
        for (const e of pack) e.update(DT, 0, 0, 0, true);
        pack.forEach((e, k) => {
          if (e.attacking && !was[k]) out.attacks++;
          was[k] = !!e.attacking;
        });
        out.atOnce = Math.max(out.atOnce, pack.filter((e) => e.attacking).length);
        if (i < 60 * 5) continue;
        const front = Math.atan2(pack[0].x, pack[0].z);
        for (const e of pack.slice(1)) {
          if (e.attacking) continue;
          out.looked++;
          if (Math.abs(Math.abs(wrapA(Math.atan2(e.x, e.z) - front)) - Math.PI / 2) < 0.6) out.side++;
        }
      }
      return out;
    };
    const free = fight(false);
    const duel = fight(true);
    check(`${kind}: locked on to one of three, the two that wait spend most of their waiting at his SIDES`, duel.side > duel.looked * 0.5 && duel.side > free.side * 1.5, `${duel.side} of ${duel.looked} frames, against ${free.side} of ${free.looked} with no lock`);
    check(`${kind}: ...and the turns are not changed by it: never more at once than with no lock, and no fewer attacks`, duel.atOnce <= Math.max(1, free.atOnce) && duel.attacks >= free.attacks * 0.9, `${duel.attacks} attacks (${free.attacks} with no lock), at most ${duel.atOnce} at once`);
  }
}

// ---- The roach: approaches, circles, picks bite or charge by distance, hops back from a swing ----
{
  const e = new Scuttler({ x: 0, z: 6, hunt: true });
  e.rng = () => 0.5;
  const modes = new Set<string>();
  let wrong = '';
  let attacks = 0;
  const charges: number[] = [];
  let prev = e.state;
  for (let i = 0; i < 60 * 30; i++) {
    e.update(DT, 0, 0, 0, true, false);
    if (e.state === 'chase') modes.add(e.mode);
    if (e.state === 'windup' && prev !== 'windup') {
      attacks++;
      const dist = Math.hypot(e.x, e.z);
      const want = dist <= S.bite.range ? 'bite' : 'charge';
      if (e.attack !== want) wrong = `${e.attack} at ${dist.toFixed(2)}`;
      if (e.attack === 'charge') charges.push(i);
      if (Math.abs(e.windupTime - S[e.attack].windup) > 1e-9) wrong = 'windupTime';
    }
    prev = e.state;
    // Keep the rat from being hit: this test is about choices, so put it back out of the way after each lunge.
    if (e.state === 'recover' && e.stateTime > 0.2) e.x = e.x;
  }
  check('it runs in, then circles at arm\'s length', modes.has('approach') && modes.has('circle'));
  check('it attacks, and picks bite or charge by how far away he is', attacks >= 3 && wrong === '', wrong || `${attacks} attacks`);
  check('a charge has a longer tell than a bite', S.charge.windup > S.bite.windup && S.charge.recover > S.bite.recover);
}
{
  const e = new Scuttler({ x: 0, z: 2, hunt: true });
  e.rng = () => 0; // always below the hop-back chance
  for (let i = 0; i < 4; i++) e.update(DT, 0, 0, 0, true, false);
  e.update(DT, 0, 0, 0, true, true); // a swing starts
  check('seeing a swing coming from close by, it may spring back', e.mode === 'hop' && e.state === 'chase', `${e.state}/${e.mode}`);
}

// ---- The toad: the second time he comes close, it crouches and pounces onto him, then lies winded ----
{
  const t = new Toad({ x: 0, z: 0 });
  t.rng = () => 0.1; // below pounceChance
  const seen: string[] = [];
  let activeEarly = false;
  let landed = false;
  for (let i = 0; i < 60 * 6 && !landed; i++) {
    const before = t.state;
    t.update(DT, 0, 0, 2.2, true);
    if (t.state !== before) seen.push(t.state);
    if (t.state === 'pounce' && t.stateTime < TOAD.pounceTime * 0.5 && t.attackActive) activeEarly = true;
    if (before === 'pounce' && t.state === 'recover') landed = true;
  }
  check('close in, it crouches, then pounces, then lies winded', ['crouch', 'pounce', 'recover'].every((s, i) => seen.indexOf(s) >= 0 && (i === 0 || seen.indexOf(s) > seen.indexOf(['crouch', 'pounce', 'recover'][i - 1]))), seen.join('>'));
  check('it comes down where he stood', landed && Math.hypot(t.x - 0, t.z - 2.2) < 0.35, `${t.x.toFixed(2)},${t.z.toFixed(2)}`);
  check('it only hurts as it comes down, not at the start of the jump', !activeEarly);
  t.lungeLanded(false, true);
  let winded = 0;
  while (t.state === 'recover' && winded < 60 * 6) { t.update(DT, 0, 0, 8, true); winded++; }
  check('a parried pounce leaves it winded for longer', winded * DT >= TOAD.pounceParried - 0.1, `${(winded * DT).toFixed(2)} s`);
}
{
  const t = new Toad({ x: 0, z: 0 });
  t.rng = () => 0.9; // above pounceChance: hops away first
  let hopped = false;
  for (let i = 0; i < 60 * 2 && !hopped; i++) {
    t.update(DT, 0, 0, 2, true);
    if (t.state === 'hop') hopped = true;
  }
  check('the first time he comes close it may hop away instead', hopped);
}

// ---- The knight: parry window and input buffers ----
const chamber = buildChamber();
const input = (o: Partial<PlayerInput> = {}): PlayerInput => ({ move: new THREE.Vector3(), run: false, jumpPressed: false, jumpHeld: false, attackPressed: false, dodgePressed: false, guardHeld: false, stowPressed: false, ...o });
const landed = (): PlayerController => {
  const p = new PlayerController(new THREE.Vector3(0, 0, 14));
  for (let i = 0; i < 30; i++) p.update(DT, input(), chamber.colliders);
  return p;
};
{
  const p = landed();
  for (let i = 0; i < 4; i++) p.update(DT, input({ guardHeld: true }), chamber.colliders);
  const fx = p.position.x + Math.sin(p.facing);
  const fz = p.position.z + Math.cos(p.facing);
  check('a hit just after the shield goes up is parried', p.takeHit(fx, fz, 1) === 'parried');
  const q = landed();
  for (let i = 0; i < 30; i++) q.update(DT, input({ guardHeld: true }), chamber.colliders);
  check('a hit on a shield held a while is only blocked', q.takeHit(q.position.x + Math.sin(q.facing), q.position.z + Math.cos(q.facing), 1) === 'blocked');
  const r = landed();
  for (let i = 0; i < 4; i++) r.update(DT, input({ guardHeld: true }), chamber.colliders);
  check('a hit from behind is not caught', r.takeHit(r.position.x - Math.sin(r.facing), r.position.z - Math.cos(r.facing), 1) === 'hit');
}
{
  // Find when a dodge ends by itself, then press attack a little before that: the swing should start as soon as it can.
  const run = (pressAt: number): { dodgeTicks: number; swung: boolean } => {
    const p = landed();
    p.update(DT, input({ dodgePressed: true, move: new THREE.Vector3(0, 0, -1) }), chamber.colliders);
    let n = 1;
    let swung = false;
    while (p.state === 'dodge' && n < 200) {
      p.update(DT, input({ attackPressed: n === pressAt }), chamber.colliders);
      n++;
    }
    for (let i = 0; i < 8; i++) {
      p.update(DT, input(), chamber.colliders);
      if (p.state === 'attack') swung = true;
    }
    return { dodgeTicks: n, swung };
  };
  const base = run(-1);
  check('without a press, he does not swing after a dodge', !base.swung);
  const early = run(base.dodgeTicks - 6);
  check('an attack pressed a moment before the dodge ends is remembered and swings', early.swung);
  const tooEarly = run(2);
  check('one pressed long before is forgotten', !tooEarly.swung || base.dodgeTicks * DT < TUNING.buffer.attack + 0.1);
}

console.log(failures === 0 ? 'combat2: all pass' : `combat2: ${failures} FAIL`);
process.exit(failures ? 1 : 0);
