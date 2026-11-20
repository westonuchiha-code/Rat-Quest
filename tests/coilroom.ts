// THE COIL ROOM (levels/coilroom.ts; world/teslaCoil.ts, the beat; world/hazards.ts `teslacoil` and `zapplate`; the
// POWER PLANT tile set, levels/themes.ts; 2026-11-20): a Tesla coil plays a boom-bap beat and zaps the plates on it.
// The beat is steady and readable; the spiral of plates can be climbed by the real rat; a plate shocks him only when
// its lane is hit and he is on it; the coil keys sing.
import './../src/core/colorSetup';
import * as THREE from 'three';
import { PlayerController, PlayerInput } from '../src/player/controller';
import { BAR, COIL, STEP, beatAt, hitsBetween, laneState } from '../src/world/teslaCoil';
import { HAZARD, hurt, sounds, type HazardSpec, type ZapPlateSpec } from '../src/world/hazards';
import { MusicFloor } from '../src/world/musicFloor';
import { levelById } from '../src/levels/levels';
import { buildChamber } from '../src/world/chamber';
import { BALCONY, BIG_COIL, SPIRAL, spiralPlates } from '../src/levels/coilroom';
import { themeById } from '../src/levels/themes';
import { getTexturePixels } from '../src/render/textures';
import { TUNING } from '../src/data/tuning';
import { SFX_NAMES, sfx } from '../src/audio/synth';

let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}
const DT = 1 / 60;
const R = TUNING.rat.radius;
const HT = TUNING.rat.height;
function input(o: Partial<PlayerInput> = {}): PlayerInput {
  return { move: new THREE.Vector3(), run: false, jumpPressed: false, jumpHeld: false, attackPressed: false, dodgePressed: false, guardHeld: false, stowPressed: false, ...o };
}

// ---- The beat ----
check(`a bar of 16 steps at ${COIL.bpm} a minute: a step is a sixteenth (${STEP.toFixed(3)} s), a bar ${BAR.toFixed(2)} s`, Math.abs(STEP - 60 / 90 / 4) < 1e-9 && Math.abs(BAR - 16 * STEP) < 1e-9);
{
  const bar: Record<string, number> = { kick: 0, snare: 0, hat: 0 };
  const notes: number[][] = [];
  for (let b = 0; b < 4; b++) {
    const kicks: number[] = [];
    // (From just before the bar, so its first kick, on the bar's very start, is crossed; a whole number of frames.)
    for (let f = 0; f < Math.round(BAR / DT); f++) {
      const t = b * BAR - 1e-6 + f * DT;
      for (const h of hitsBetween(t, t + DT)) {
        if (b === 0) bar[h.part]++;
        if (h.part === 'kick') kicks.push(h.note);
      }
    }
    notes.push(kicks);
  }
  check('stepped frame by frame, a bar plays 3 kicks, 2 snares (the backbeat) and 4 hats', bar.kick === 3 && bar.snare === 2 && bar.hat === 4, JSON.stringify(bar));
  check('...the kicks sing the bass line, a bar to a line, four bars round', JSON.stringify(notes) === JSON.stringify(COIL.bass.map((b) => [...b])), JSON.stringify(notes));
  // (The first hit, at the very start, is played as the clock crosses it.)
  const shape = (from: number): string => hitsBetween(from - 1e-6, from + BAR - 1e-6).map((h) => `${h.part}@${Math.round((h.at - from) / STEP)}`).join(' ');
  check('...and every bar has the same shape (the parts on the same steps)', shape(BAR * 5) === shape(BAR * 9) && shape(BAR * 5) === shape(0), shape(0));
}
{
  const kickAt = COIL.kick[1] * STEP;
  check('a KICK plate is live for a moment at each kick, and not between', laneState('kick', kickAt + 0.05).live && !laneState('kick', kickAt + COIL.live + 0.05).live && !laneState('kick', kickAt - 0.05).live);
  check('...and glows brighter through the half second before it (the warning), full at the hit', laneState('kick', kickAt - COIL.warn * 0.9).warn < 0.2 && laneState('kick', kickAt - 0.05).warn > 0.85);
  check('a SNARE plate is live on the backbeat (steps 5 and 13), not on the kicks', laneState('snare', 4 * STEP + 0.05).live && laneState('snare', 12 * STEP + 0.05).live && !laneState('snare', kickAt + 0.05).live);
  let safeEver = false;
  let deadAir = 0;
  for (let t = 0; t < BAR; t += 0.005) {
    if (laneState('safe', t).live || laneState('safe', t).warn > 0) safeEver = true;
    if (!laneState('kick', t).live) deadAir += 0.005;
  }
  check('a SAFE plate is never live nor warned', !safeEver);
  check('a kick plate is safe to stand on most of each bar (live only 3 times, a fifth of a second each)', Math.abs(BAR - deadAir - 3 * COIL.live) < 0.03, `${(BAR - deadAir).toFixed(2)} s live a bar`);
  check('beatAt reads the clock back', beatAt(BAR * 2 + 5 * STEP + STEP / 2).bar === 2 && beatAt(BAR * 2 + 5 * STEP + STEP / 2).step === 5);
}

// ---- The room ----
const def = levelById('coilroom')!;
check('the Coil Room is a level, in the POWER PLANT tile set', !!def && def.theme === 'power');
const theme = themeById('power');
const pics = [...new Set(Object.values(theme.skins))].filter((n) => n !== 'planks' && n !== 'ironBars');
check('the power plant set wears its own pictures (tread plate, circuit panels, girders), each a picture and not a flat fill', pics.join() === 'treadPlate,circuitPanel,steelGirder' && pics.every((n) => {
  const px = getTexturePixels(n);
  const d = px.data as Uint8Array | Uint8ClampedArray;
  const seen = new Set<number>();
  for (let i = 0; i < d.length; i += 4 * 7) seen.add((d[i] << 16) | (d[i + 1] << 8) | d[i + 2]);
  return seen.size >= 5;
}), pics.map((n) => {
  const d = getTexturePixels(n).data;
  const seen = new Set<number>();
  for (let i = 0; i < d.length; i += 4 * 7) seen.add((d[i] << 16) | (d[i + 1] << 8) | d[i + 2]);
  return `${n} ${seen.size}`;
}).join(', '));
const room = buildChamber(def as never);
const hz: HazardSpec[] = room.hazards?.specs ?? [];
const coils = hz.filter((h) => h.kind === 'teslacoil');
const plates = hz.filter((h): h is ZapPlateSpec => h.kind === 'zapplate');
check('a great coil in the middle, and a small one for the keys', coils.length === 2 && coils.some((c) => c.kind === 'teslacoil' && !c.keys && c.height === BIG_COIL.height) && coils.some((c) => c.kind === 'teslacoil' && !!c.keys));
check(`${SPIRAL.count} plates spiral up round it: safe, kick, snare, over and over, so a safe one is never more than two away`, plates.length === SPIRAL.count && plates.every((p, i) => p.lane === (['safe', 'kick', 'snare'] as const)[i % 3]));

/** Steps the rat as main.ts does (moving platforms, his update), with the pad he is given. */
function step(p: PlayerController, pad: Partial<PlayerInput>): void {
  room.stepMovers(DT, p);
  p.update(DT, input(pad), room.colliders);
}
// The climb: from each plate to the next, the real rat, a run and a jump (and a second in the air, if he needs it).
{
  const spiral = spiralPlates();
  const failed: string[] = [];
  let doubles = 0;
  const targets = [...spiral.slice(1).map((q) => ({ x: q.x, y: q.y, z: q.z, top: q.y })), { x: 0, y: BALCONY.top, z: -9, top: BALCONY.top }];
  for (let i = 0; i < targets.length; i++) {
    const from = spiral[i];
    const to = targets[i];
    const p = new PlayerController(new THREE.Vector3(from.x, from.y, from.z));
    for (let k = 0; k < 20; k++) step(p, {});
    const go = (): THREE.Vector3 => new THREE.Vector3(to.x - p.position.x, 0, to.z - p.position.z).normalize();
    let landed = false;
    let usedDouble = false;
    for (let k = 0; k < 150 && !landed; k++) {
      const air = !p.grounded;
      // (A second jump only if the first would fall short: falling, and already below the top he wants.)
      const needUp = air && p.velocity.y < 0 && p.position.y < to.top - 0.1 && !usedDouble;
      if (needUp) usedDouble = true;
      step(p, { move: go(), run: true, jumpPressed: k === 6 || needUp, jumpHeld: true });
      if (p.grounded && Math.abs(p.position.y - to.top) < 0.05 && k > 8) landed = true;
      if (p.position.y < from.y - 3) break;
    }
    if (!landed) failed.push(`${i}->${i + 1}`);
    if (usedDouble) doubles++;
  }
  check('the real rat climbs the whole spiral, plate to plate, and onto the balcony at the top', failed.length === 0, failed.length ? `missed ${failed.join(', ')}` : `${targets.length} jumps, ${doubles} with a second jump in the air`);
}
// Shocks: on a kick plate through a bar, shocked; on a safe one, never; hopping as the kick lands, clear.
{
  const kick = plates.find((p) => p.lane === 'kick')!;
  const safe = plates.find((p) => p.lane === 'safe')!;
  const on = (q: ZapPlateSpec, dy = 0) => ({ position: { x: q.x, y: q.y + dy, z: q.z }, prevPosition: { x: q.x, y: q.y, z: q.z }, velocity: { x: 0, y: 0, z: 0 }, grounded: dy === 0, dead: false });
  let kickShocks = 0;
  let safeShocks = 0;
  let hopShocks = 0;
  for (let t = 0; t < BAR; t += DT) {
    if (hurt(hz, on(kick), t, R, HT)?.kind === 'zapplate') kickShocks++;
    if (hurt(hz, on(safe), t, R, HT)) safeShocks++;
    if (hurt(hz, on(kick, 0.6), t, R, HT)) hopShocks++;
  }
  check('standing on a kick plate through a bar: shocked at each kick (frames live, 3 hits)', kickShocks > 3 * 10 && kickShocks < 3 * 16, `${kickShocks} frames`);
  check('...on a safe plate: never; in the air over a kick plate (a hop as it hits): never', safeShocks === 0 && hopShocks === 0);
  // The real rat, standing on a kick plate for a bar, is hurt (as main.ts hurts him: a burn, no roll helps).
  const p = new PlayerController(new THREE.Vector3(kick.x, kick.y, kick.z));
  const hp = p.hp;
  for (let f = 0; f < Math.round(BAR / DT); f++) {
    step(p, {});
    const touch = hurt(hz, p, f * DT, R, HT);
    if (touch) p.takeBurn(touch.x, touch.z, HAZARD.zap.damage);
  }
  check('...and the real rat standing on one for a bar loses health', p.hp < hp, `${hp} -> ${p.hp}`);
}
// The beat is heard from the big coil (not the keys' coil), anywhere across the room, at any height.
{
  const heard: Record<string, number> = {};
  for (let t = 0.001; t < BAR; t += DT) for (const s of sounds(hz, t, t + DT, { x: 6, z: -6 })) heard[s.kind] = (heard[s.kind] ?? 0) + 1;
  check('the coil is heard to play the bar: 3 kicks, 2 snares, 4 hats (once each: the small coil plays only its keys)', heard.kick === 3 && heard.snare === 2 && heard.hat === 4, JSON.stringify(heard));
}
// The coil keys: an octave, each a coil voice; stepped on, they sound.
{
  const pads = room.music?.pads ?? [];
  const keys = pads.filter((p) => p.voice === 'coil');
  check('an octave of coil keys (8 white, 5 black), each singing through the coil', keys.length === 13 && keys.filter((k) => k.black).length === 5);
  const f = new MusicFloor(pads);
  const k = keys.find((q) => q.note === 7)!;
  f.update(DT, { x: 99, y: 0, z: 99 }, false);
  const ev = f.update(DT, { x: k.x, y: k.y, z: k.z }, true);
  check('...stepping on one sounds its note', ev.some((e) => e.kind === 'note' && e.note === 7));
}
check('the coil\'s sounds are ones the game has, and make a sound', (['coilZap', 'coilCrack', 'coilTick'] as const).every((n) => SFX_NAMES.includes(n) && sfx(n).data.some((v) => Math.abs(v) > 0.2)));

console.log(failures ? `\n${failures} FAILED` : '\nall passed');
process.exit(failures ? 1 : 0);
