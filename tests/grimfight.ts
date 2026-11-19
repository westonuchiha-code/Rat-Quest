// Lord Grimsqueak's fight with his spells in it (enemies/grimsqueak.ts). The owner gave him five casting animations
// and said "continue" to putting them in the fight. What is held here: the four attacks he had are what they were;
// two are dressed as spells; three new things come only after he has raged, each with an answer of its own.
import { Grimsqueak, GRIM, type GrimEvent, type GrimState } from '../src/enemies/grimsqueak';

let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}
const DT = 1 / 60;
interface Seen { states: GrimState[]; events: GrimEvent[]; bolts: Array<{ kind?: string }>; summons: Array<{ x: number; z: number }> }
/** A fight with the rat standing at (px, pz), run until `until` says stop (or `max` seconds). What was seen on the way. */
function make(): { boss: Grimsqueak; seen: Seen; rat: { x: number; z: number }; run(until: (b: Grimsqueak) => boolean, max?: number): boolean } {
  const boss = new Grimsqueak({ x: 0, z: -6, y: 0 });
  boss.rng = () => 0.3;
  boss.wake();
  const seen: Seen = { states: [], events: [], bolts: [], summons: [] };
  const rat = { x: 0, z: 4 };
  return {
    boss, seen, rat,
    run(until, max = 40) {
      for (let t = 0; t < max; t += DT) {
        boss.update(DT, rat.x, 0, rat.z, true);
        if (seen.states[seen.states.length - 1] !== boss.state) seen.states.push(boss.state);
        seen.events.push(...boss.events.splice(0));
        seen.bolts.push(...boss.spits.splice(0));
        seen.summons.push(...boss.summons.splice(0));
        if (until(boss)) return true;
      }
      return false;
    },
  };
}
/** Strikes him as often as it takes, each time he is open, until his health is at or under `hp`. */
function beatDownTo(f: ReturnType<typeof make>, hp: number): void {
  for (let guard = 0; guard < 60 && f.boss.hp > hp; guard++) {
    f.run((b) => b.open || b.state === 'heal', 60);
    if (f.boss.state === 'heal') return;
    f.boss.takeHit(1, f.rat.x, f.rat.z);
    // (One blow an opening: he is let get up again.)
    f.run((b) => !b.open, 10);
  }
}

// ---------------------------------------------------------------- what he had is what it was
check('the four attacks he had keep their numbers: nothing of the old fight was made easier or harder', JSON.stringify([GRIM.hp, GRIM.volley, GRIM.swoop, GRIM.slam, GRIM.orb, GRIM.poise, GRIM.rage]) === JSON.stringify([16,
  { windup: 0.7, count: 3, rageCount: 5, gap: 0.24, spent: 1.9, boltSpeed: 9.5 },
  { windup: 0.9, track: 0.75, speed: 15, time: 0.62, spent: 1.6, blocked: 2.4, parried: 3.2, reach: 0.7, arc: 1.0, damage: 1, chain: 0.4 },
  { windup: 0.85, fall: 0.25, ringSpeed: 9, ringMax: 10.5, ringWidth: 0.45, ringHeight: 0.45, spent: 2.0, damage: 1 },
  { windup: 1.0, speed: 6.5, faster: 1.25, turn: 1.3, life: 7, returns: 1, rageReturns: 2, damage: 1, hurts: 2, stun: 3.2, batTime: 0.35, catchRadius: 0.75, swingBonus: 0.7 },
  3, { at: 0.5, time: 1.4, haste: 0.8 }]));
{
  const f = make();
  f.run((b) => b.state === 'orbWait', 40);
  const firsts = f.seen.states.filter((s) => s === 'volley' || s === 'swoopWind' || s === 'slamWind' || s === 'orbWind');
  check(
    'unraged, he shows his four attacks in the order he always did, and none of the new ones',
    firsts.join() === 'volley,swoopWind,slamWind,orbWind'
      && !f.seen.states.some((s) => s === 'stormWind' || s === 'storm' || s === 'summon' || s === 'heal'),
    f.seen.states.join(' ')
  );
  check(
    'his volley is three bolts, as it was, and each is a ball of FIRE',
    f.seen.bolts.length === 3
      && f.seen.bolts.every((b) => b.kind === 'fire')
      && f.seen.events.filter((e) => e === 'bolt').length === 3
  );
  check('his slam still sends one ring out along the floor', f.seen.events.filter((e) => e === 'slam').length === 1);
}

// ---------------------------------------------------------------- the summoning
{
  const f = make();
  beatDownTo(f, GRIM.hp * GRIM.rage.at);
  const raged = f.run((b) => b.state === 'rage', 30);
  const then = f.run((b) => b.state !== 'rage', 5);
  check(
    'at half his health he rages, as he did; and the first thing his rage does is a SUMMONING',
    raged
      && then
      && f.boss.state === 'summon'
      && f.boss.phase === 2,
    f.boss.state
  );
  const before = f.seen.summons.length;
  f.run((b) => b.state !== 'summon', 6);
  const made = f.seen.summons.slice(before);
  const out = made.map((m) => Math.hypot(m.x - f.boss.x, m.z - f.boss.z));
  const toward = made.every((m) => (m.x - f.boss.x) * (f.rat.x - f.boss.x) + (m.z - f.boss.z) * (f.rat.z - f.boss.z) > 0);
  check(
    'two come up out of the floor in front of him, between him and the rat, a little apart',
    made.length === GRIM.summon.count
      && made.length === 2
      && out.every((d) => Math.abs(d - GRIM.summon.out) < 0.05)
      && toward
      && Math.hypot(made[0].x - made[1].x, made[0].z - made[1].z) > 1,
    out.map((d) => d.toFixed(2)).join(' ')
  );
  check(
    'they come at the moment the spell\'s gate is open and its hands are up (its blow), and he goes on with the fight after',
    f.seen.events.includes('summon')
      && f.boss.state === 'float'
  );
  // Never again.
  const n = f.seen.summons.length;
  f.run(() => false, 30);
  check('he summons once in a fight and no more', f.seen.summons.length === n && f.seen.states.filter((s) => s === 'summon').length === 1);

  // ---- the storm: the first attack he makes once he has raged ----
  const g = make();
  beatDownTo(g, GRIM.hp * GRIM.rage.at);
  g.run((b) => b.state === 'stormWind', 30);
  check('raged, the next attack he shows is the STORM', g.boss.state === 'stormWind');
  g.run((b) => b.state === 'storm', 5);
  const dir = g.boss.stormDir;
  const on = (along: number, across: number): boolean => g.boss.stormAtRat(g.boss.x + Math.sin(dir) * along + Math.cos(dir) * across, 0, g.boss.z + Math.cos(dir) * along - Math.sin(dir) * across);
  const aimed = Math.hypot(g.rat.x - g.boss.x, g.rat.z - g.boss.z);
  check('its line is laid through where the rat stood: he is on it', g.boss.stormAtRat(g.rat.x, 0, g.rat.z) && aimed > 3, `${aimed.toFixed(1)} from him`);
  check(
    'it is a LINE: on it for its whole length, off it two steps to either side, and past its end',
    on(2, 0)
      && on(GRIM.storm.long - 0.5, 0)
      && on(6, GRIM.storm.wide - 0.1)
      && !on(6, GRIM.storm.wide + 0.3)
      && !on(6, -GRIM.storm.wide - 0.3)
      && !on(GRIM.storm.long + 0.5, 0)
      && !on(-2, 0)
  );
  check(
    'a rat who steps off it in the time between its setting and its letting go is clear: there is time, at a run',
    (GRIM.storm.windup * GRIM.rage.haste * (1 - GRIM.storm.track)) * 6.2 > GRIM.storm.wide + 0.4,
    `${(GRIM.storm.windup * GRIM.rage.haste * (1 - GRIM.storm.track)).toFixed(2)} s; a run covers ${((GRIM.storm.windup * GRIM.rage.haste * (1 - GRIM.storm.track)) * 6.2).toFixed(1)}, the line is ${GRIM.storm.wide} to its edge`
  );
  g.boss.stormTaken();
  check('it hits him once and not again (his shield, or his hurt, takes it)', !g.boss.stormAtRat(g.rat.x, 0, g.rat.z));
  g.run((b) => b.state !== 'storm', 3);
  check('and it ends as his others do: with him spent, down where the sword reaches', g.boss.state === 'spent' && g.boss.open);
}

// ---------------------------------------------------------------- the mending
{
  const f = make();
  beatDownTo(f, GRIM.hp * GRIM.heal.at);
  const got = f.boss.state === 'heal' || f.run((b) => b.state === 'heal', 60);
  const hpAt = f.boss.hp;
  check(
    'nearly beaten, he does not rise from an opening: he stays down and MENDS himself',
    got
      && hpAt <= GRIM.hp * GRIM.heal.at
      && f.seen.events.includes('heal'),
    `at ${hpAt} of ${GRIM.hp}`
  );
  f.run(() => false, 0.6);
  check('he is down on the floor for it, where the sword can reach him', f.boss.lift < 0.15 && f.boss.state === 'heal', `lift ${f.boss.lift.toFixed(2)}`);
  f.run((b) => b.state !== 'heal', 6);
  check(
    'left alone, he has three hearts back, and goes on',
    f.boss.hp === hpAt + GRIM.heal.gives
      && f.seen.events.includes('healed')
      && f.boss.state === 'float',
    `${hpAt} to ${f.boss.hp}`
  );
  // He does it once.
  beatDownTo(f, GRIM.hp * GRIM.heal.at - 1);
  f.run(() => false, 12);
  check('he mends once in a fight and no more', f.seen.states.filter((s) => s === 'heal').length === 1);

  const g = make();
  beatDownTo(g, GRIM.hp * GRIM.heal.at);
  if (g.boss.state !== 'heal') g.run((b) => b.state === 'heal', 60);
  const was = g.boss.hp;
  g.run(() => false, 0.8);
  g.boss.takeHit(1, g.rat.x, g.rat.z);
  g.seen.events.push(...g.boss.events.splice(0));
  check(
    'STRUCK at it, the mending is broken: he loses the blow, gains nothing, and is left open',
    g.boss.hp === was - 1
      && g.seen.events.includes('healBroken')
      && !g.seen.events.includes('healed')
      && g.boss.open
  );
  g.run(() => false, 8);
  check(
    'and a broken mending is not tried again',
    g.boss.hp <= was - 1
      && g.seen.states.filter((s) => s === 'heal').length === 1
      && !g.seen.events.includes('healed')
  );
}

// ---------------------------------------------------------------- he can still be beaten, and it does not hang
{
  const f = make();
  let blows = 0;
  for (let guard = 0; guard < 80 && f.boss.alive; guard++) {
    f.run((b) => b.open || b.state === 'heal' || !b.alive, 60);
    if (!f.boss.alive) break;
    f.boss.takeHit(1, f.rat.x, f.rat.z);
    blows++;
    f.run((b) => !b.open || !b.alive, 10);
  }
  check(
    'struck once at every opening (and at his mending), he is beaten in as many blows as he has hearts',
    !f.boss.alive
      && blows === GRIM.hp,
    `${blows} blows`
  );
  const h = make();
  // (A rat who never strikes him: the fight goes round and round and never stops in any one state.)
  let stuck = 0;
  let last: GrimState = h.boss.state;
  let since = 0;
  for (let t = 0; t < 120; t += DT) {
    h.boss.update(DT, 0, 0, 4, true);
    h.boss.events.length = 0;
    h.boss.spits.length = 0;
    since = h.boss.state === last ? since + DT : 0;
    last = h.boss.state;
    stuck = Math.max(stuck, since);
  }
  check('left alone for two minutes he never hangs in one state', stuck < 9, `longest in one state: ${stuck.toFixed(1)} s`);
}

console.log(failures === 0 ? '\nGrimsqueak fight checks passed.' : `\n${failures} Grimsqueak fight check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
