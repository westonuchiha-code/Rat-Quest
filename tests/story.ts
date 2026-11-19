// The campaign order and unlocking, the scene engine, and the Level 1 scenes.
import { CAMPAIGN, campaignNumber, isUnlocked, nextInOrder } from '../src/levels/campaign';
import { ALL_LEVELS as LEVELS } from '../src/levels/levels';
import { NECK_LIMIT, compileScene, headingTo, sceneFrame } from '../src/story/scene';
import { SEWER, STORY, STORY_KEY, StorySeen } from '../src/story/scenes';

let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}

// ---- Campaign ----
const order = LEVELS.map((l) => l.id);
check('the campaign is fourteen rooms', CAMPAIGN.length === 14 && new Set(CAMPAIGN).size === 14);
check('every campaign room exists as a level', CAMPAIGN.every((id) => order.includes(id)));
check('the levels are played in campaign order', CAMPAIGN.every((id, i) => order[i] === id), order.join(' '));
check('it starts in the sewer and ends at the lair and then Dave', order[0] === 'sewer' && order[12] === 'lair' && order[13] === 'davespot');
check(
  'bonus rooms come after the campaign',
  order.indexOf('pumpworks') >= 14
    && campaignNumber('pumpworks') === 0
    && campaignNumber('sewer') === 1
    && campaignNumber('davespot') === 14
);
const none = (): boolean => false;
check('at first only the first level is open', order.filter((id) => isUnlocked(id, order, none)).join() === 'sewer');
const done = new Set(['sewer', 'caps']);
const open = order.filter((id) => isUnlocked(id, order, (x) => done.has(x)));
check('clearing a level opens the next one only', open.join() === 'sewer,caps,hunt', open.join());
check('a cleared level stays open whatever came before', isUnlocked('leap', order, (x) => x === 'leap') && !isUnlocked('crates', order, (x) => x === 'sewer'));
check('a builder level is never locked', isUnlocked('custom', order, none));
check(
  'each level leads to the next and the last leads round',
  nextInOrder('sewer', order) === 'caps'
    && nextInOrder('lair', order) === 'davespot'
    && nextInOrder(order[order.length - 1], order) === 'sewer'
);

// ---- No way out of a pool: wherever water or lava meets the edge of its volume there is more liquid or something solid beyond ----
{
  const leaks: string[] = [];
  for (const lv of LEVELS) {
    const pools = [...lv.water.map((w) => ({ ...w, what: 'water' })), ...(lv.lava ?? []).map((l) => ({ ...l, what: 'lava' }))];
    // A swimmer's body sits from a little under the surface to a little over it.
    const blocked = (x: number, y: number, z: number): boolean =>
      lv.solids.some((b) => b.kind !== 'rubble' && b.kind !== 'barrel' && x > b.x0 && x < b.x1 && z > b.z0 && z < b.z1 && b.y0 <= y - 0.1 && b.y1 >= y + 0.5) ||
      pools.some((p) => x > p.x0 && x < p.x1 && z > p.z0 && z < p.z1 && Math.abs(p.y - y) < 0.01);
    for (const p of pools) {
      for (let k = 0.5; k < Math.max(p.x1 - p.x0, p.z1 - p.z0); k += 1) {
        const pts: Array<[number, number]> = [];
        if (p.x0 + k < p.x1) pts.push([p.x0 + k, p.z0 - 0.3], [p.x0 + k, p.z1 + 0.3]);
        if (p.z0 + k < p.z1) pts.push([p.x0 - 0.3, p.z0 + k], [p.x1 + 0.3, p.z0 + k]);
        // (Lava is never swum in: touching it throws him out. So a lava pool may run right to the edge of a drop.)
        const drop = (x: number, z: number): boolean => p.what === 'lava' && !lv.solids.some((b) => x > b.x0 && x < b.x1 && z > b.z0 && z < b.z1 && b.y1 <= p.y + 0.5);
        for (const [x, z] of pts) if (!blocked(x, p.y, z) && !drop(x, z)) leaks.push(`${lv.id} ${p.what} at ${x.toFixed(1)},${z.toFixed(1)}`);
      }
    }
  }
  check('no pool has a gap at its edge to swim out through', leaks.length === 0, `${leaks.length} gaps: ${leaks.slice(0, 4).join('; ')}`);
}

// ---- The scene engine ----
const at = { x: 0, y: 0, z: 0, facing: 0 };
const s = compileScene({
  id: 't',
  beats: [
    { dur: 0, cover: 1, bars: 1, cam: { pos: [5, 1, 5], look: [0, 1, 0] }, cut: true },
    { dur: 2, cover: 0 },
    { dur: 2, walkTo: [4, 0] },
    { dur: 1, head: [0.8, 0.2], gesture: 'touchScarf' },
    { dur: 1, headAt: [4, -10] },
    { dur: 1, cam: 'game', bars: 0, head: [0, 0] },
  ],
}, at);
check('a scene lasts as long as its beats', s.total === 7);
const f0 = sceneFrame(s, 0);
check('a beat of no length sets the opening state at once', f0.cover === 1 && f0.bars === 1 && f0.camBlend === 1 && f0.camPos[0] === 5);
check('the dark lifts steadily', Math.abs(sceneFrame(s, 1).cover - 0.5) < 1e-9 && sceneFrame(s, 2).cover === 0);
const mid = sceneFrame(s, 3);
check(
  'he walks at a steady pace and faces where he is going',
  Math.abs(mid.x - 2) < 1e-9
    && Math.abs(mid.speed - 2) < 1e-9
    && Math.abs(mid.facing - Math.PI / 2) < 1e-6
);
check('he stands still between walks', sceneFrame(s, 1).speed === 0 && sceneFrame(s, 4.5).speed === 0 && sceneFrame(s, 4.5).x === 4);
check(
  'a gesture eases in and out inside its beat',
  sceneFrame(s, 4.01).gestureWeight < 0.05
    && sceneFrame(s, 4.5).gestureWeight === 1
    && sceneFrame(s, 4.99).gestureWeight < 0.05
    && sceneFrame(s, 3).gesture === null
);
check('his head keeps its turn until told otherwise', Math.abs(sceneFrame(s, 5).headYaw - 0.8) < 1e-9);
check('looking at something behind him stops at the neck limit', Math.abs(Math.abs(sceneFrame(s, 6).headYaw) - NECK_LIMIT) < 1e-9);
const end = sceneFrame(s, 7);
check(
  'it ends with the game camera, no bars, head straight, and done',
  end.camBlend === 0
    && end.bars === 0
    && end.cover === 0
    && end.headYaw === 0
    && end.done
    && !sceneFrame(s, 6.9).done
);
check('time past the end holds the last frame', sceneFrame(s, 99).x === 4 && sceneFrame(s, 99).done && sceneFrame(s, -1).cover === 1);
check('headings use the game convention', headingTo(0, 0, 0, 1) === 0 && Math.abs(headingTo(0, 0, 1, 0) - Math.PI / 2) < 1e-9);
let smoothRun = true;
let prev = sceneFrame(s, 2);
for (let t = 2.02; t <= 7; t += 0.02) {
  const f = sceneFrame(s, t);
  if (Math.hypot(f.x - prev.x, f.z - prev.z) > 0.06 || Math.abs(f.headYaw - prev.headYaw) > 0.1) smoothRun = false;
  prev = f;
}
check('nothing jumps from one frame to the next', smoothRun);

// ---- Level 1 ----
const sewer = LEVELS[0];
const ctx = { x: sewer.spawn.x, z: sewer.spawn.z, facing: sewer.spawn.facing, y: 0, exit: { x: sewer.exit.x, z: sewer.exit.z }, spots: {} };
const opening = compileScene(STORY.sewer.open!(ctx), { ...ctx });
const o0 = sceneFrame(opening, 0);
check('the opening starts in the dark with him out of sight inside the tunnel wall', o0.cover === 1 && o0.z > 20 && o0.camBlend === 1);
check(
  'the tunnel mouth and the wall mark are in the room',
  sewer.decor.some((d) => d.kind === 'hole' && d.x === SEWER.tunnel.x)
    && sewer.decor.some((d) => d.kind === 'mark')
);
let inside = true;
let touched = false;
let lookedLeft = false;
let lookedRight = false;
for (let t = 0; t <= opening.total; t += 0.05) {
  const f = sceneFrame(opening, t);
  if (f.z < 20 && (Math.abs(f.x) > 19.5 || (Math.abs(f.x) < 7.5 && Math.abs(f.z) < 7.5))) inside = false;
  if (f.gesture === 'touchScarf' && f.gestureWeight > 0.9) touched = true;
  if (f.headYaw > 0.8) lookedLeft = true;
  if (f.headYaw < -0.8) lookedRight = true;
}
check('he stays on the floor, clear of the walls and the pool', inside);
check(
  'he does not walk through a crate',
  sewer.solids.filter((b) => b.kind === 'rubble').every((b) => !(SEWER.tunnel.x > b.x0 - 0.5 && SEWER.tunnel.x < b.x1 + 0.5 && b.z1 > SEWER.stop.z - 0.5))
);
check('he looks both ways and touches his scarf', touched && lookedLeft && lookedRight);
const oe = sceneFrame(opening, opening.total);
check(
  'he ends facing the way deeper in, with the camera handed back',
  Math.abs(oe.facing - headingTo(oe.x, oe.z, sewer.exit.x, sewer.exit.z)) < 1e-6
    && oe.camBlend === 0
    && oe.bars === 0
    && oe.cover === 0
);
check('the opening is short', opening.total > 8 && opening.total < 20, `${opening.total.toFixed(1)}s`);

const door = { ...ctx, x: sewer.exit.x - 1.2, z: sewer.exit.z, facing: Math.PI / 2 };
const leaving = compileScene(STORY.sewer.exit!(door), { ...door });
let back = 0;
for (let t = 0; t <= leaving.total; t += 0.05) back = Math.max(back, Math.abs(sceneFrame(leaving, t).headYaw));
const le = sceneFrame(leaving, leaving.total);
check('at the door he looks back over his shoulder, then faces the door again', back > 1.2 && le.headYaw === 0 && Math.abs(le.facing - Math.PI / 2) < 1e-6);
check('he does not move from the door, and the scene holds for the fade', Math.abs(le.x - door.x) < 1e-9 && leaving.def.hold === true && leaving.total < 6);

// ---- The cast, memories and keepsakes ----
const m = compileScene({
  id: 'm',
  beats: [
    { dur: 1, gesture: 'pickUp' },
    { dur: 1, gesture: 'pickUp', prop: 'hand' },
    { dur: 0, set: 'gap', memory: 1, cast: { friend: { at: [0, -300, 4], face: Math.PI, scarf: true }, young: { at: [1, -300, 4], scarf: false } } },
    { dur: 1, cast: { friend: { walkTo: [0, 0], hop: 1 } } },
    { dur: 1, cast: { friend: { gesture: 'cheer', scarf: false }, young: { scarf: true } } },
    { dur: 0, set: null, memory: 0, cast: { friend: { hide: true }, young: { hide: true } } },
    { dur: 1, prop: 'gone' },
  ],
}, at);
check(
  'a gesture held over two beats does not drop at the join',
  sceneFrame(m, 0.99).gestureWeight === 1
    && sceneFrame(m, 1.01).gestureWeight === 1
    && sceneFrame(m, 0.02).gestureWeight < 0.1
    && sceneFrame(m, 1.98).gestureWeight < 0.1
);
check(
  'the keepsake goes from the ground to his paw and is put away',
  sceneFrame(m, 0.5).prop === 'ground'
    && sceneFrame(m, 1.5).prop === 'hand'
    && sceneFrame(m, 4.5).prop === 'gone'
);
check('nobody else is about before the memory', !sceneFrame(m, 1.5).cast.friend?.visible && sceneFrame(m, 1.5).set === null);
const mid2 = sceneFrame(m, 2.5);
check(
  'in the memory the set is up and the cast is in place',
  mid2.set === 'gap'
    && mid2.memory === 1
    && mid2.cast.friend.visible
    && mid2.cast.young.visible
    && mid2.cast.young.x === 1
);
check(
  'a jump rises in the middle and lands on the floor',
  mid2.cast.friend.air
    && Math.abs(mid2.cast.friend.y - -299) < 1e-9
    && Math.abs(mid2.cast.friend.z - 2) < 1e-9
    && sceneFrame(m, 3).cast.friend.y === -300
    && !sceneFrame(m, 3.5).cast.friend.air
);
check(
  'the scarf changes necks',
  mid2.cast.friend.scarf
    && !mid2.cast.young.scarf
    && !sceneFrame(m, 3.5).cast.friend.scarf
    && sceneFrame(m, 3.5).cast.young.scarf
);
check(
  'afterwards the set and the cast are gone',
  sceneFrame(m, 4.5).set === null
    && !sceneFrame(m, 4.5).cast.friend.visible
    && sceneFrame(m, 4.5).memory === 0
);

// Every level's scenes: they compile from the level's own data, end cleanly, and stay short.
let scenesOk = true;
let count = 0;
const notes: string[] = [];
for (const [id, st] of Object.entries(STORY)) {
  const lv = LEVELS.find((l) => l.id === id);
  if (!lv) { scenesOk = false; notes.push(`${id}: no such level`); continue; }
  const c = { x: lv.spawn.x, z: lv.spawn.z, facing: lv.spawn.facing, y: lv.spawn.y, exit: { x: lv.exit.x, z: lv.exit.z }, spots: lv.storySpots ?? {} };
  const defs = [st.open?.(c), st.exit?.(c), st.after?.({ ...c, spots: { ...c.spots, foe: { x: 0, y: 0, z: 0 } } })];
  for (const part of [st.find, st.near]) {
    if (!part) continue;
    const sp = lv.storySpots?.[part.spot];
    if (!sp) { scenesOk = false; notes.push(`${id}: no spot ${part.spot}`); continue; }
    defs.push(part.scene({ ...c, x: sp.x + 1.2, z: sp.z + 1.2, y: sp.y }));
  }
  for (const def of defs) {
    if (!def) continue;
    count++;
    const sc = compileScene(def, { x: c.x, y: c.y, z: c.z, facing: c.facing });
    const last = sceneFrame(sc, sc.total);
    const bad = !def.id.startsWith(`${id}.`) || sc.total > 45 || last.memory !== 0 || last.set !== null || last.cover !== 0 || Object.values(last.cast).some((a) => a.visible) || (!def.hold && (last.camBlend !== 0 || last.bars !== 0));
    let nan = false;
    for (let t = 0; t <= sc.total; t += 0.1) {
      const f = sceneFrame(sc, t);
      if (![f.x, f.z, f.facing, ...f.camPos, ...f.camLook].every(Number.isFinite)) nan = true;
    }
    if (bad || nan) { scenesOk = false; notes.push(`${def.id} ${sc.total.toFixed(1)}s`); }
  }
}
check('every story scene compiles, ends cleanly and is short', scenesOk && count >= 6, notes.join('; ') || `${count} scenes`);
const capsLv = LEVELS.find((l) => l.id === 'caps')!;
const kc = capsLv.solids.filter((b) => b.kind === 'rubble');
check(
  'the compass crate in Cap Collector stands on its spot and holds a cap',
  kc.length === 3
    && Math.abs((kc[0].x0 + kc[0].x1) / 2 - capsLv.storySpots!.keepsake.x) < 1e-9
    && capsLv.crateContents[0] !== null
    && capsLv.collectibles.filter((d) => d.kind === 'cap').length === 8
);
const crLv = LEVELS.find((l) => l.id === 'crates')!;
const cr9 = crLv.solids.filter((b) => b.kind === 'rubble')[9];
check(
  'the whistle crate in Crate Search is one of the crumb crates',
  Math.abs((cr9.x0 + cr9.x1) / 2 - crLv.storySpots!.keepsake.x) < 1e-9
    && (crLv.crateContents[9] ?? '').includes('crumb')
);
const leapLv = LEVELS.find((l) => l.id === 'leap')!;
const goal = leapLv.goals[0] as { x: number; z: number; radius: number };
const stoneAt = leapLv.storySpots!.stone;
const nearR = STORY.leap.near!.r;
check('landing on the goal platform does not set the memory off', Math.hypot(stoneAt.x - goal.x, stoneAt.z - (goal.z + 2.4)) > nearR && stoneAt.z < goal.z);
check('but walking up to the door does, before the door takes him', Math.hypot(stoneAt.x - leapLv.exit.x, stoneAt.z - (leapLv.exit.z + 1.9)) < nearR);
const ww = LEVELS.find((l) => l.id === 'waterworks')!;
check(
  'the Waterworks has the cheese tunnel, the royal mark and the grate',
  ww.decor.some((d) => d.kind === 'grate')
    && ww.decor.filter((d) => d.kind === 'mark' && d.glyph === 'crown').length >= 2
    && !!ww.storySpots?.tunnel
);
const wo = compileScene(STORY.waterworks.open!({ x: ww.spawn.x, z: ww.spawn.z, facing: ww.spawn.facing, y: 0, exit: ww.exit, spots: ww.storySpots! }), { x: ww.spawn.x, y: 0, z: ww.spawn.z, facing: ww.spawn.facing });
let guardsSeen = false;
let guardsIn = true;
for (let t = 0; t <= wo.total; t += 0.1) {
  const g = sceneFrame(wo, t).cast.guardA;
  if (g?.visible) {
    guardsSeen = true;
    if (g.x > ww.storySpots!.tunnel.x + 2 || g.z < 24 || g.z > 50) guardsIn = false;
  }
}
check('the collectors cross the landing into the tunnel and are gone by the end', guardsSeen && guardsIn && !sceneFrame(wo, wo.total).cast.guardA.visible);
const pp = LEVELS.find((l) => l.id === 'plankpit')!;
check(
  'Finch has his one line in Plank Pit, and the lantern lies by the planks',
  pp.npcs![0].lines.length === 1
    && pp.npcs![0].lines[0].includes('trustworthy')
    && !!pp.storySpots?.keepsake
    && STORY.plankpit.near!.prop === 'lantern'
);
const ce = LEVELS.find((l) => l.id === 'cellars')!;
const co = compileScene(STORY.cellars.open!({ x: ce.spawn.x, z: ce.spawn.z, facing: ce.spawn.facing, y: 0, exit: ce.exit, spots: ce.storySpots! }), { x: ce.spawn.x, y: 0, z: ce.spawn.z, facing: ce.spawn.facing });
let shrugged = 0;
let lookedShelf = false;
for (let t = 0; t <= co.total; t += 0.05) {
  const n = sceneFrame(co, t).npc.pip;
  if (n) shrugged = Math.max(shrugged, n.shrug);
  if (n && Array.isArray(n.lookAt)) lookedShelf = true;
}
const pipNpc = ce.npcs!.find((n) => n.name.toLowerCase() === 'pip')!;
check(
  'in the Cellars Pip stands by bare shelves, looks at them, and shrugs',
  ce.decor.filter((d) => d.kind === 'shelf').length === 2
    && Math.abs(pipNpc.x - ce.storySpots!.pip.x) < 1e-9
    && lookedShelf
    && shrugged === 1
    && sceneFrame(co, co.total).npc.pip.lookAt === null
    && sceneFrame(co, co.total).npc.pip.shrug === 0
);
const ls = LEVELS.find((l) => l.id === 'liftshaft')!;
const onLanding = ls.solids.some((b) => b.kind === 'platform' && ls.storySpots!.edge.x > b.x0 && ls.storySpots!.edge.x < b.x1 && ls.storySpots!.edge.z > b.z0 && ls.storySpots!.edge.z < b.z1 && b.y1 === 5);
check(
  'the Lift Shaft has the Deep Engine far below, and he stands on the landing to see it',
  ls.decor.some((d) => d.kind === 'engine' && d.y < -30)
    && onLanding
);
const fu = LEVELS.find((l) => l.id === 'furnace')!;
const fo = compileScene(STORY.furnace.open!({ x: fu.spawn.x, z: fu.spawn.z, facing: fu.spawn.facing, y: 0, exit: fu.exit, spots: fu.storySpots! }), { x: fu.spawn.x, y: 0, z: fu.spawn.z, facing: fu.spawn.facing });
let lowPower = 1;
let dark = 0;
let shook = 0;
for (let t = 0; t <= fo.total; t += 0.05) {
  const f = sceneFrame(fo, t);
  lowPower = Math.min(lowPower, f.power);
  dark = Math.max(dark, f.cover);
  shook = Math.max(shook, f.shake);
}
const foEnd = sceneFrame(fo, fo.total);
check(
  'in the Furnace the machine stalls, the light goes, the hall shakes, and it catches again',
  fu.decor.some((d) => d.kind === 'machine')
    && lowPower === 0
    && dark > 0.5
    && dark < 0.8
    && shook > 0
    && foEnd.power === 1
    && foEnd.cover === 0
    && foEnd.shake === 0
);
const wh = LEVELS.find((l) => l.id === 'webhollow')!;
const wk = wh.storySpots!.keepsake;
const wn = compileScene(STORY.webhollow.near!.scene({ x: wk.x - 2, z: wk.z + 2, facing: 0, y: 4, exit: wh.exit, spots: wh.storySpots! }), { x: wk.x - 2, y: 4, z: wk.z + 2, facing: 0 });
let sat = false;
let leaned = false;
let fireSet = false;
for (let t = 0; t <= wn.total; t += 0.05) {
  const f = sceneFrame(wn, t);
  if (f.set === 'campfire') fireSet = true;
  if (f.cast.friend?.gesture === 'sitReach' && f.cast.young?.gesture === 'sit') sat = true;
  if (f.cast.young?.gesture === 'sitLean') leaned = true;
}
check(
  'in Web Hollow the pack hangs in a web by the door, with the portrait near',
  wh.decor.some((d) => d.kind === 'portrait')
    && STORY.webhollow.near!.prop === 'pack'
    && Math.hypot(wk.x - wh.exit.x, wk.z - (wh.exit.z + 1.9)) < STORY.webhollow.near!.r
);
check(
  'the campfire memory: he sets the scarf straight, the knight leans to him, and it is the longest memory',
  fireSet
    && sat
    && leaned
    && wn.total > 20
    && wn.total < 30,
  `${wn.total.toFixed(1)}s`
);
// ---- Level 13 and the ending ----
const la = LEVELS.find((l) => l.id === 'lair')!;
const laCtx = { x: la.spawn.x, z: la.spawn.z, facing: la.spawn.facing, y: 0, exit: la.exit, spots: la.storySpots! };
const lo = compileScene(STORY.lair.open!(laCtx), { x: laCtx.x, y: 0, z: laCtx.z, facing: laCtx.facing });
const said: string[] = [];
let stopped = false;
let turnedAway = false;
for (let t = 0; t <= lo.total; t += 0.05) {
  const f = sceneFrame(lo, t);
  if (f.say && said[said.length - 1] !== f.say.line) said.push(f.say.line);
  const g = f.npc['lord grimsqueak'];
  if (g?.still) stopped = true;
  if (g && (g.bow ?? 0) > 0.5) turnedAway = true;
}
check(
  'in the lair he has exactly his four short lines, in order',
  said.length === 4
    && said[0].startsWith('Many have come')
    && said[1] === 'That scarf...'
    && said[2] === 'Still wearing it?'
    && said[3] === 'Go home, old friend.',
  said.join(' | ')
);
check(
  'each line stays up long enough to be typed out and read',
  lo.keys.filter((k) => k.beat.say).every((k) => k.beat.dur >= k.beat.say!.line.length / 22 + 1)
);
check(
  'he stops when he sees the scarf, turns away, and is gone from the dais when the fight starts',
  stopped
    && turnedAway
    && sceneFrame(lo, lo.total).npc['lord grimsqueak'].gone === true
    && sceneFrame(lo, lo.total).say === null
);
check(
  'the lair is won by beating him, he has no talk lines of his own, and he is the only enemy',
  la.goals.length === 1
    && la.goals[0].type === 'defeat'
    && la.enemies.length === 1
    && la.enemies[0].type === 'grimsqueak'
    && la.npcs![0].lines.length === 0
    && STORY.lair.boss === true
);
const aft = compileScene(STORY.lair.after!({ ...laCtx, x: 2, z: 0, spots: { ...laCtx.spots, foe: { x: 0, y: 0, z: -3 } } }), { x: 2, y: 0, z: 0, facing: 0 });
const aMid = sceneFrame(aft, 0.5).npc['lord grimsqueak'];
const aEnd = sceneFrame(aft, aft.total);
let drifted = false;
let quake = 0;
for (let t = 0; t <= aft.total; t += 0.05) {
  const f = sceneFrame(aft, t);
  const g = f.npc['lord grimsqueak'];
  if (g?.pos && g.pos[2] < -15 && g.pos[2] > -22 && !g.gone) drifted = true;
  quake = Math.max(quake, f.shake);
}
check(
  'after the fight he is where he fell, then floats off under the throne, and the floor shakes',
  !!aMid.pos
    && aMid.pos[2] === -3
    && aMid.gone === false
    && drifted
    && aEnd.npc['lord grimsqueak'].gone === true
    && quake > 0
    && aEnd.power === 1
);
const ds = LEVELS.find((l) => l.id === 'davespot')!;
const dCtx = { x: ds.spawn.x, z: ds.spawn.z, facing: ds.spawn.facing, y: 0, exit: ds.exit, spots: ds.storySpots! };
const fin = compileScene(STORY.davespot.open!(dCtx), { x: dCtx.x, y: 0, z: dCtx.z, facing: dCtx.facing });
let vista = false;
let daveStopped = false;
let pawOut = false;
let pawTaken = false;
let silent = true;
for (let t = 0; t <= fin.total; t += 0.05) {
  const f = sceneFrame(fin, t);
  if (f.set === 'vista') vista = true;
  if (f.npc['dizzy dave']?.still) daveStopped = true;
  if (f.gesture === 'reachPaw' && f.gestureWeight > 0.9) pawOut = true;
  if ((f.npc['lord grimsqueak']?.reach ?? 0) === 1 && pawOut) pawTaken = true;
  if (f.say) silent = false;
}
const finEnd = sceneFrame(fin, fin.total).npc;
check(
  'the ending: Dave stops, the kingdom is shown steady, a paw is held out and taken, and nobody speaks',
  daveStopped
    && vista
    && pawOut
    && pawTaken
    && silent
);
check(
  'it leaves Grimsqueak on the ground beside him and Dave dancing again',
  finEnd['lord grimsqueak'].gone === false
    && finEnd['lord grimsqueak'].low === 1
    && finEnd['dizzy dave'].still === false
    && fin.def.sheathe === true
);
check(
  "in Dave's Spot Grimsqueak is not in the room until then, and the ending waits for the lair",
  ds.npcs!.some((n) => n.kind === 'villain' && n.hidden === true)
    && STORY.davespot.openAfter === 'lair'
    && STORY.davespot.openEvenIfCleared === true
);
check('the training hall has the royal mark', LEVELS.find((l) => l.id === 'waves')!.decor.some((d) => d.kind === 'mark' && d.glyph === 'crown'));

const store = { data: new Map<string, string>(), getItem(k: string) { return this.data.get(k) ?? null; }, setItem(k: string, v: string) { this.data.set(k, v); } };
const seen = new StorySeen(store);
seen.mark('sewer.open');
check('a scene that has been shown is remembered', new StorySeen(store).seen('sewer.open') && !new StorySeen(store).seen('x') && store.data.has(STORY_KEY));
seen.reset();
store.data.set(STORY_KEY, '{nope');
check('a new game forgets them, and a broken save is ignored', !seen.seen('sewer.open') && !new StorySeen(store).seen('sewer.open'));

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILED`);
if (failures > 0) process.exit(1);
