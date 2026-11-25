// THE GAME (2026-11-25): its start, and its first area, Flotsam (src/levels/flotsam.ts). The owner: "start a second
// thing that is just going to be the actual game and we're going to build it from front to back". Held here: a new
// game's knight has a BROKEN SWORD and NO SHIELD; a game file owns only what it has earned; Flotsam has what its
// plan says (a sword up a climb every jump of which can be made, a shield for crumbs there are enough of, a few kinds
// of creature, a Warden on a gate that lifts when he is beaten).
import './../src/core/colorSetup';
import * as THREE from 'three';
import { PlayerController, type PlayerInput } from '../src/player/controller';
import { buildChamber } from '../src/world/chamber';
import { flotsam, FLOTSAM as F } from '../src/levels/flotsam';
const L = flotsam();
const ch = buildChamber({ solids: L.solids, pit: L.pit, water: L.water ?? [], lava: L.lava, decor: [], movers: [] });
const DT = 1 / 60;
const inp = (o: Partial<PlayerInput>): PlayerInput => ({ move: new THREE.Vector3(), run: true, jumpPressed: false, jumpHeld: false, attackPressed: false, dodgePressed: false, guardHeld: false, ...o });
import { Equipment } from '../src/player/equipment';
import { ITEMS, STARTING_GEAR, WASHED_UP_GEAR, gearMods } from '../src/data/equipment';
import { BALANCE } from '../src/data/balance';
import { SHOP } from '../src/data/shop';
import { GAME_ROOMS, TEST_ROOMS, levelById } from '../src/levels/levels';
import { hallDoors } from '../src/levels/hall';
import { Stag } from '../src/enemies/stag';

let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}
function hop(name: string, from: [number, number, number], to: [number, number, number], lead: number): void {
  let best = '';
  for (const jumpAt of [0.2, 0.4, 0.6, 0.8, 1.0, 1.3, 1.6, 2.0, 2.5]) {
    const dx = to[0] - from[0]; const dz = to[2] - from[2]; const d = Math.hypot(dx, dz);
    const dir = new THREE.Vector3(dx / d, 0, dz / d);
    const p = new PlayerController(new THREE.Vector3(from[0] - dir.x * lead, from[1], from[2] - dir.z * lead));
    p.facing = Math.atan2(dir.x, dir.z);
    let jumped = false; let ok = false;
    for (let i = 0; i < 240; i++) {
      const gone = Math.hypot(p.position.x - (from[0] - dir.x * lead), p.position.z - (from[2] - dir.z * lead));
      const press = !jumped && gone >= jumpAt;
      if (press) jumped = true;
      p.update(DT, inp({ move: dir.clone(), jumpPressed: press, jumpHeld: jumped }), ch.colliders);
      if (jumped && p.grounded && Math.abs(p.position.y - to[1]) < 0.1) { ok = true; break; }
    }
    if (ok) { best = `ok (jump after ${jumpAt})`; break; }
  }
  check(`the climb: ${name}`, !!best, best);
}

// ---- Washed up: a broken sword and a bare arm.
{
  const g = gearMods(Object.values(WASHED_UP_GEAR));
  check('washed up: a broken sword bites half as hard and reaches little more than half as far', g.damage === 0.5 && g.reach > 0.5 && g.reach < 0.7);
  check('washed up: no shield, no guard', g.noGuard === true && gearMods(Object.values(STARTING_GEAR)).noGuard === false);
  const p = new PlayerController(new THREE.Vector3(0, 0, 0));
  const floor = ch.colliders;
  p.position.set(0, 0, 20);
  p.gear = g;
  for (let i = 0; i < 30; i++) p.update(DT, inp({ guardHeld: true, run: false }), floor);
  check('...holding GUARD does nothing: he cannot guard', !p.guarding);
  const hp = p.hp;
  const r = p.takeHit(0, 23, 1);
  check('...and a blow from in front lands', r === 'hit' && p.hp === hp - 1, r);
  p.gear = gearMods(Object.values(STARTING_GEAR));
  for (let i = 0; i < 120; i++) p.update(DT, inp({ guardHeld: true, run: false }), floor);
  check('with a shield on his arm he can', p.guarding);
}
{
  const mem = new Map<string, string>();
  const store = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v) };
  const e = new Equipment(store);
  check('the Hall\'s knight has the sword and shield he always had', e.equipped('sword') === 'ratSword' && e.equipped('shield') === 'ratShield');
  e.resetTo(WASHED_UP_GEAR);
  check('a new game: the broken sword and the bare arm, and he owns no other', e.equipped('sword') === 'brokenSword' && e.equipped('shield') === 'noShield' && !e.owns('ratSword') && !e.owns('ratShield'));
  const again = new Equipment(store);
  check('...and read back from its file, still: a game file owns only what it has earned', again.equipped('sword') === 'brokenSword' && !again.owns('ratSword') && !again.owns('ratShield'));
  again.give('ratSword');
  again.equip('ratSword');
  const third = new Equipment(store);
  check('...the sword he finds is kept', third.equipped('sword') === 'ratSword' && third.owns('brokenSword') && !third.owns('ratShield'));
  check('the broken sword and the bare arm are things (they can be shown in the menu)', !!ITEMS.brokenSword && !!ITEMS.noShield && ITEMS.noShield.slot === 'shield');
}

// ---- Flotsam.
{
  check('the game has a first area, and it is not a test room: the Hall has no door to it', GAME_ROOMS[0] === L || GAME_ROOMS[0].id === L.id, GAME_ROOMS[0]?.id);
  check('...found by its name', levelById(L.id)?.id === L.id && !TEST_ROOMS.some((t) => t.id === L.id) && !hallDoors().some((d) => d.to === L.id));
  const crumbs = L.collectibles.filter((c) => c.kind === 'crumb').length + L.crateContents.filter((c) => c === 'crumb').length;
  const price = BALANCE.prices.ratShield.crumbs;
  check(`a shield is sold, for crumbs, and there are more crumbs lying about than it costs (${crumbs} for ${price})`, SHOP.some((s) => s.id === 'ratShield') && price === F.crumbsNeeded && crumbs >= price + 3, `${crumbs}`);
  check('...and somebody keeps a shop here', (L.npcs ?? []).some((n) => n.shop));
  check('three others to talk to', (L.npcs ?? []).filter((n) => !n.shop && (n.lines?.length ?? 0) >= 2).length >= 3, (L.npcs ?? []).map((n) => n.name).join());
  const sword = L.gear.find((g) => g.itemId === 'ratSword');
  check('a whole sword lies on the top deck of the wreck', !!sword && sword.x > F.deck.x0 && sword.x < F.deck.x1 && sword.z > F.deck.z0 && sword.z < F.deck.z1 && sword.y > F.deck.top);
  const kinds = new Set(L.enemies.map((e) => e.type ?? 'scuttler'));
  check('a few kinds of creature: roach, toad, bat, ant, and the Warden', ['scuttler', 'toad', 'bat', 'ant', 'stag'].every((k) => kinds.has(k as never)), [...kinds].join());
  const warden = L.enemies.findIndex((e) => e.type === 'stag');
  const gate = (L.gates ?? []).find((g) => g.foes?.includes(warden));
  check('the Warden holds a gate that lifts when he is beaten, and it stands before the way out', !!gate && Math.abs(gate.z - F.gate.z) < 0.01 && L.exit.z < gate.z);
  // THE WARDEN IS A BOSS: the Stag Knight with his own name, health and poise. (A plain one, 14 health, was dead in six
  // to eight seconds to a knight with the wreck's sword. With these, scripted: a knight who only swings loses to him
  // most times even with the sword; one who sidesteps each blow wins in about 20 s with it, about 43 s with half a one.)
  {
    const w = new Stag(L.enemies[warden] as never);
    const plain = new Stag({ x: 0, z: 0 });
    check('the Warden is a boss: named, with near three times a Stag Knight\'s health and more poise', w.bossName === 'The Warden' && w.maxHp === F.wardenIs.hp && w.hp === w.maxHp && w.maxHp >= plain.maxHp * 2.5 && w.maxPoise > plain.maxPoise, `${w.hp} / ${plain.hp}`);
    check('...and a plain Stag Knight is what he was', plain.bossName === '' && plain.hp === 14);
  }
  check('...and he keeps to his court: he does not come out into the yard', (L.enemies[warden].arena?.z1 ?? 99) < F.wall.z);
  check('nothing else may follow him in there', L.enemies.every((e, i) => i === warden || (e.arena?.z0 ?? -99) > F.wall.z));
  // A NEW GAME's first moment: out of the great pipe, over the pool, and into it. (And out again by a jump at the bank.)
  const pool = (L.water ?? []).find((w) => F.arrive.x > w.x0 && F.arrive.x < w.x1 && F.arrive.z > w.z0 && F.arrive.z < w.z1);
  check('a new game: he comes out of the pipe in the air over the pool', !!pool && F.arrive.y > F.pipe.y && F.arrive.y < F.pipe.y + F.pipe.high && F.arrive.z < 30 - F.pipe.out);
  {
    const p = new PlayerController(new THREE.Vector3(F.arrive.x, F.arrive.y, F.arrive.z));
    p.velocity.set(0, 0, -5.5);
    p.water = L.water ?? [];
    const north = new THREE.Vector3(0, 0, -1);
    let swam = false;
    let out = false;
    for (let i = 0; i < 600 && !out; i++) {
      const press = swam && i % 30 === 0;
      p.update(DT, inp({ move: swam ? north.clone() : new THREE.Vector3(), jumpPressed: press, jumpHeld: press }), ch.colliders);
      swam ||= p.state === 'swim';
      out = swam && p.grounded && p.position.y > -0.05 && p.position.z < F.pool.z;
    }
    check('...he lands in the water, swims to the bank and is out of it with a jump, unhurt', swam && out && p.hp === p.maxHp, `swam ${swam}, out ${out}, at z ${p.position.z.toFixed(1)} y ${p.position.y.toFixed(1)}`);
  }
  check('two lanterns: one on the shore, one before the gate', (L.checkpoints ?? []).length === 2);
  check('he lands on the shore, far from the gate, with it straight ahead', L.spawn.z > 20 && Math.abs(L.spawn.x) < 1 && Math.abs(gate?.x ?? 9) < 1);
  check('nothing bites within nine paces of where he lands', L.enemies.every((e) => Math.hypot(e.x - L.spawn.x, e.z - L.spawn.z) > 9));
}

// ---- The climb to the sword: every jump of it can be made (the real controller, the real room).
const s = F.steps;
const c = (q: readonly number[]): [number, number, number] => [(q[0] + q[2]) / 2, q[4], (q[1] + q[3]) / 2];
hop('floor to step 1', [-6, 0, 12.5], c(s[0]), 0);
hop('step 1 to step 2', c(s[0]), c(s[1]), 0.8);
{
  // The plank between them GLIDES (a mover: it is not in the room's fixed boxes). At rest it is against step 2, a
  // step up; at the far end of its glide it is against step 3, a step under it.
  const m = (L.movers ?? [])[0];
  const P = F.plank;
  check('the plank is a thing that moves: it glides west, as far as its plan says', !!m && Math.abs((m.to?.[0] ?? 0) + P.travel) < 0.01 && Math.abs(m.y - P.top) < 0.5, JSON.stringify(m ?? null).slice(0, 120));
  const gapIn = s[1][0] - P.x1;
  check('the climb: step 2 to the plank at rest (against it, a step up)', Math.abs(gapIn) < 0.7 && P.top - s[1][4] <= 1.15 && P.z0 < s[1][3] && P.z1 > s[1][1], `gap ${gapIn.toFixed(2)}, rise ${(P.top - s[1][4]).toFixed(2)}`);
  const farX0 = P.x0 - P.travel;
  check('the climb: the plank at its far end to step 3 (against it, a step up)', farX0 - s[2][2] < 0.7 && s[2][4] - P.top <= 1.15 && P.z0 < s[2][3] && P.z1 > s[2][1], `gap ${(farX0 - s[2][2]).toFixed(2)}, rise ${(s[2][4] - P.top).toFixed(2)}`);
}
hop('step 3 to step 4', c(s[2]), c(s[3]), 1);
hop('step 4 to step 5', c(s[3]), c(s[4]), 1);
hop('step 5 to the deck', c(s[4]), [F.deck.x0 + 1.5, F.deck.top, -3.5], 1);
hop('deck to the cap board', [F.deck.x1 - 3.5, F.deck.top, -2.8], [(F.capBoard.x0 + F.capBoard.x1) / 2, F.capBoard.top, -2.8], 0);

console.log(failures === 0 ? '\ngame: all passed' : `\ngame: ${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
