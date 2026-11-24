/**
 * THE HALL AND THE TEST ROOMS (the owner, 2026-11-17: "I want all the levels in the game to be labeled as test rooms ...
 * one big Hub world ... a long hallway where NPCs are all hanging out ... a door to each different test room ... doors
 * to specific boss fights ... each different enemy type to have a room where it spawns that enemy one at a time ...
 * buttons on the floor that spawn the enemy").
 */
import './../src/core/colorSetup';
import { ALL_LEVELS, LEVELS, TEST_ROOMS, levelById, titleBoards } from '../src/levels/levels';
import { HALL, HALL_FIRE, hallDoors } from '../src/levels/hall';
import { PRACTICE, WIDOW_PIT } from '../src/levels/practice';
import { BOARDS_SAY, BOSS_ROOMS, HALL_ID, PRACTICE_ROOMS, ROOMS, roomName } from '../src/levels/testRooms';
import { wayOutOf, type WayOutWorld } from '../src/levels/wayOut';
import { junction } from '../src/levels/junction';
import { SIGN, signPixels } from '../src/world/courseDoors';
import { DOOR_REACH, atDoor } from '../src/world/rooms';
import { PLATE_LEAVE, PLATE_REACH, buttonStep } from '../src/world/plates';
import { wrapText } from '../src/render/pixelFont';
import { FEELS, feelOf, type Feel } from '../src/data/feel';
import * as THREE from 'three';
import { PlayerController, type PlayerInput } from '../src/player/controller';
import { aabbOf, type Aabb } from '../src/world/collision';
import { extent } from '../src/world/layout';
import { TUNING } from '../src/data/tuning';
import { TWEAKS } from '../src/core/tweaks';
import { Scuttler } from '../src/enemies/scuttler';
import { resolveCombat, type CombatEvents } from '../src/combat/combat';
import type { LevelDef } from '../src/levels/types';

let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}
const all = [...ALL_LEVELS, ...TEST_ROOMS];
const hall = levelById(HALL_ID)!;

// ---- The list ----
{
  const ns = ROOMS.map((r) => r.n);
  check(
    'the list of test rooms: each has a number of its own, counting up from 1, and a level that is really there',
    ns.every((n, i) => n === i + 1)
      && ROOMS.every((r) => !!levelById(r.id)),
    ROOMS.filter((r) => !levelById(r.id)).map((r) => r.id).join(' ')
  );
  check(
    'each is NAMED by its number ("Test Room 3"), and what it was called before is kept as a note',
    ROOMS.every((r) => levelById(r.id)!.name === `Test Room ${r.n}` && !!levelById(r.id)!.was && levelById(r.id)!.was !== levelById(r.id)!.name),
    ROOMS.map((r) => `${levelById(r.id)!.name}=${levelById(r.id)!.was}`).join(', ')
  );
  const cistern = levelById('cistern')!;
  const sides = (cistern.courseDoors ?? []).map((d) => levelById(d.to ?? '')!.name);
  check(
    'the areas a room\'s own doors lead to are that room\'s B, C, D...: the Sewers\' four are 3B to 3E, and the doors to them say so',
    sides.join(' ') === 'Test Room 3B Test Room 3C Test Room 3D Test Room 3E'
      && (cistern.courseDoors ?? []).every((d) => d.name === levelById(d.to ?? '')!.name),
    sides.join(' ')
  );
  check(
    'the dream\'s two rides are the Toy Box\'s: 1B and 1C (not the garden\'s, though the garden has a door to one)',
    levelById('milkyway')!.name === 'Test Room 1B'
      && levelById('bigdipper')!.name === 'Test Room 1C'
  );
  const named = all.filter((l) => /^Test Room \d+[A-Z]?$/.test(l.name));
  check(
    'no two levels have the same name, and every level of the game (the Club, the worlds and their areas) and every try-out room is a numbered test room',
    new Set(all.map((l) => l.name)).size === all.length
      && LEVELS.every((l) => named.includes(l)),
    LEVELS.filter((l) => !named.includes(l)).map((l) => l.id).join(' ')
  );
  check('a name is made one way only', roomName(3) === 'Test Room 3' && roomName(3, 1) === 'Test Room 3B' && roomName(10, 2) === 'Test Room 10C');
  check(
    'a room, a boss room or a practice room can be opened from the address by its id (letters, digits and _ only)',
    [...ROOMS, ...BOSS_ROOMS, ...PRACTICE_ROOMS].every((r) => /^\w+$/.test(r.id))
  );
}

// ---- A room's own title board (B6, 2026-11-18): the owner chose BOTH, the old name and the number ----
{
  const rooms = ['toybox', 'milkyway', 'bigdipper', 'longdrop'].map((id) => levelById(id)!);
  const boards = (): Array<{ lines: string[]; h: number }> => rooms.map((l) => l.decor.find((d) => d.kind === 'sign') as unknown as { lines: string[]; h: number });
  const read = (): string => boards().map((b) => b.lines.slice(0, 2).join(' / ')).join(' | ');
  const was = read();
  const heights = boards().map((b) => b.h);
  check(
    'THE FOUR ROOMS\' TITLE BOARDS SAY THEIR OLD NAME AND, UNDER IT, THEIR NUMBER (the owner: "Toy Box, Long Drop is fine, but let it keep its room number"), the rest of the board under that',
    BOARDS_SAY === 'both'
      && was === 'THE TOY BOX / TEST ROOM 1 | THE MILKY WAY / TEST ROOM 1B | THE BIG DIPPER / TEST ROOM 1C | THE LONG DROP / TEST ROOM 5'
      && boards()[0].lines[2] === 'JUMP, THEN ATTACK: SKATE',
    was
  );
  titleBoards(rooms, 'number');
  const num = boards().map((b) => b.lines[0]).join('|');
  const lines = boards().map((b) => b.lines.length).join(',');
  titleBoards(rooms, 'old');
  const old = boards().map((b) => b.lines[0]).join('|');
  const pipe = levelById('garden')!.decor.some((d) => d.kind === 'sign' && d.lines[0] === 'THE PIPE');
  titleBoards(rooms, 'both');
  check(
    '...the switch can say the number only or the old name only (a line shorter), a board naming a thing IN a room (THE PIPE) is not touched, and back to both, as tall as it was',
    num === 'TEST ROOM 1|TEST ROOM 1B|TEST ROOM 1C|TEST ROOM 5'
      && lines === '3,3,3,2'
      && old === 'THE TOY BOX|THE MILKY WAY|THE BIG DIPPER|THE LONG DROP'
      && pipe
      && read() === was
      && boards().every((b, k) => Math.abs(b.h - heights[k]) < 1e-9),
    `${num}; ${lines}`
  );
}

// ---- The Hall ----
{
  const doors = hallDoors();
  check(
    'the Hall is home: a hub with nothing asked of him, a fire to rest at by the way in, and he comes in at its west end looking down it',
    !!hall.hub
      && hall.goals.length === 0
      && hall.enemies.length === 0
      && hall.restSpot === HALL_FIRE
      && hall.spawn.x < -HALL.halfX + 4
      && Math.abs(hall.spawn.facing - Math.PI / 2) < 1e-9
  );
  check(
    'it has a door to every test room, every boss room and every practice room, and each leads somewhere real; none asks for anything',
    doors.length === ROOMS.length + BOSS_ROOMS.length + PRACTICE_ROOMS.length
      && [...ROOMS, ...BOSS_ROOMS, ...PRACTICE_ROOMS].every((r) => doors.some((d) => d.to === r.id && !!levelById(r.id)))
      && doors.every((d) => d.need === 0)
      && hall.courseDoors!.length === doors.length
  );
  const north = doors.filter((d) => d.door.z < 0);
  // ---- Its dressing (B7, 2026-11-18): banners, benches, a bar, tables. Out of everyone's way. ----
  {
    const things = hall.solids.filter((b) => b.y0 >= -0.01 && b.y1 <= 2 && b.y1 > 0.2 && Math.abs(b.x0) < HALL.halfX && Math.abs(b.z0) <= HALL.halfZ && !(b.x0 > HALL.stageX - 4));
    const near = (b: (typeof things)[number], x: number, z: number, r: number): boolean => x > b.x0 - r && x < b.x1 + r && z > b.z0 - r && z < b.z1 + r;
    const inDoor = things.filter((b) => doors.some((d) => near(b, d.door.x, d.door.z, DOOR_REACH + 0.6)));
    check(
      'THE HALL IS DRESSED: banners over the torches, benches between the doors, a bar along the empty east end of the south wall with stools, and two tables',
      hall.decor.filter((d) => d.kind === 'banner').length >= 20
        && hall.decor.some((d) => d.kind === 'keg')
        && hall.decor.filter((d) => d.kind === 'table').length === 2
        && hall.decor.filter((d) => d.kind === 'stool').length >= 10
        && things.filter((b) => b.kind === 'plank' && !b.hidden).length >= 15,
      `${things.length} pieces`
    );
    check('...and none of it stands in or before a doorway', inDoor.length === 0, inDoor.map((b) => `${b.x0.toFixed(1)},${b.z0.toFixed(1)}`).join('; '));
    check('...nor in the middle of the hall, which is left clear to run down', things.every((b) => b.z0 > 1.6 || b.z1 < -1.6));
    // (Standing ON a thing is standing: the bar's keeper on the step behind it.)
    const onSomeone = (hall.npcs ?? []).filter((n) => !n.seated && things.some((b) => near(b, n.x, n.z, 0.35) && (n.y ?? 0) < b.y1 - 0.01));
    check('...nor where anyone stands', onSomeone.length === 0, onSomeone.map((n) => n.name).join(', '));
    const tawny = hall.npcs!.find((n) => n.name === 'Madam Tawny')!;
    const slink = hall.npcs!.find((n) => n.name === 'Slink')!;
    const bar = things.find((b) => b.kind === 'plank' && b.y1 === 1 && b.z0 > 0 && b.x1 - b.x0 > 5)!;
    const stool = things.find((b) => b.hidden && near(b, slink.x, slink.z, 0.01));
    check(
      'MADAM TAWNY KEEPS THE HALL\'S BAR (behind it, between it and the wall, facing the hall, at her work) and SLINK SITS ON A STOOL BEFORE IT, with a thimble, turned to her',
      !!bar
        && tawny.z > bar.z1
        && tawny.z < HALL.halfZ - 0.3
        && tawny.x > bar.x0
        && tawny.x < bar.x1
        && tawny.doing === 'tend'
        && Math.abs(tawny.facing - Math.PI) < 1e-6
        && !!stool
        && !!slink.seated
        && slink.doing === 'drink'
        && slink.z < bar.z0
        && Math.abs(Math.atan2(tawny.x - slink.x, tawny.z - slink.z) - slink.facing) < 1e-6
    );
  }
  const south = doors.filter((d) => d.door.z > 0);
  check(
    'the rooms and the bosses are along one wall (the rooms first, in the order of their numbers, then a gap, then the bosses); the practice rooms along the other',
    north.length === ROOMS.length + BOSS_ROOMS.length
      && south.length === PRACTICE_ROOMS.length
      && ROOMS.every((r, i) => north[i].to === r.id && (i === 0 || north[i].door.x > north[i - 1].door.x))
      && north[ROOMS.length].door.x - north[ROOMS.length - 1].door.x > HALL.step * 1.5
  );
  // Signs.
  const board = SIGN.w / SIGN.dots;
  const gaps = [north, south].flatMap((w) => w.slice(1).map((d, i) => d.door.x - w[i].door.x));
  check(
    'the doors stand far enough apart that no sign overlaps the next (a board is five and a half wide)',
    Math.min(...gaps) >= board + 1,
    `nearest ${Math.min(...gaps).toFixed(1)}, a board ${board}`
  );
  const st = { open: true, got: 0, of: 0 };
  const written = doors.map((d) => signPixels(d, st).lines);
  check(
    'a room\'s sign says its biome (a placeholder), and under it its number: "THE SEWERS" over "TEST ROOM 3"',
    written[2].join('|') === 'THE SEWERS|TEST ROOM 3'
      && written[0].join('|') === 'WACKY|POMO DREAM|TEST ROOM 1',
    `${written[2].join('|')}; ${written[0].join('|')}`
  );
  check(
    'every sign in the Hall can be read whole: its name fits two lines of the board, and so does what is under it',
    doors.every((d) => wrapText(d.name.toUpperCase(), SIGN.lineMax).length <= 2 && wrapText(d.name.toUpperCase(), SIGN.lineMax).every((l) => l.length <= SIGN.lineMax) && (d.under ?? '').length <= SIGN.lineMax),
    doors.filter((d) => wrapText(d.name.toUpperCase(), SIGN.lineMax).length > 2 || (d.under ?? '').length > SIGN.lineMax).map((d) => d.name).join(', ')
  );
  check(
    'a boss room\'s sign says BOSS ROOM, a practice room\'s PRACTICE',
    BOSS_ROOMS.every((b) => doors.find((d) => d.to === b.id)!.under === 'BOSS ROOM')
      && PRACTICE_ROOMS.every((p) => doors.find((d) => d.to === p.id)!.under === 'PRACTICE')
  );
  check(
    'elsewhere a sign is as it was: a door with no words of its own under its name shows the wedges taken',
    signPixels({ name: 'X', need: 0 }, { open: true, got: 3, of: 16 }).lines.join('|') === 'X|3/16'
  );
  // The crowd.
  const club = (junction().npcs ?? []).map((n) => n.name.toUpperCase());
  const here = (hall.npcs ?? []).map((n) => n.name.toUpperCase());
  check(
    'EVERYONE in the Club is in the Hall (all seventeen), each once, and nobody is waiting to be earned or hidden (nor sitting, but Slink on his stool at the bar)',
    club.length >= 17
      && club.every((n) => here.filter((h) => h === n).length === 1)
      && (hall.npcs ?? []).every((n) => !n.when && !n.hidden && (!n.seated || n.name === 'Slink')),
    club.filter((n) => !here.includes(n)).join(', ')
  );
  const npcs = hall.npcs ?? [];
  const blocked = npcs.filter((n) => doors.some((d) => Math.hypot(n.x - d.door.x, n.z - d.door.z) < DOOR_REACH + 1.2 || atDoor(d.door, n.x, n.z)));
  check('nobody stands in a doorway, or near enough one to be in the way of it', blocked.length === 0, blocked.map((n) => n.name).join(', '));
  const lane = npcs.filter((n) => n.y === 0 && Math.abs(n.z) < 1.6 && n.x < HALL.stageX - 3);
  check('the middle of the hall is left clear to run down', lane.length === 0, lane.map((n) => n.name).join(', '));
  let nearest = 99;
  for (let i = 0; i < npcs.length; i++) for (let j = i + 1; j < npcs.length; j++) nearest = Math.min(nearest, Math.hypot(npcs[i].x - npcs[j].x, npcs[i].z - npcs[j].z));
  check(
    'no two of them stand in the same place (each is solid), and all are inside the hall',
    nearest > 1.2
      && npcs.every((n) => Math.abs(n.x) < HALL.halfX - 0.4 && Math.abs(n.z) < HALL.halfZ - 0.4),
    `nearest two ${nearest.toFixed(2)} apart`
  );
  check(
    'everyone has something to say (their words are the Club\'s: placeholders)',
    npcs.every((n) => n.lines.length > 0 && n.lines.every((l) => l.length > 0))
  );
  check('Pip still keeps shop', npcs.some((n) => n.name.toUpperCase() === 'PIP' && n.shop));
}

// ---- Where a way out leads ----
{
  const club = LEVELS.find((l) => l.hub)!;
  const w: WayOutWorld = { home: hall, hub: club, byId: levelById, doorsOf: (l) => l.courseDoors ?? [], isMine: () => false };
  const out = (id: string, from?: string): string => wayOutOf(levelById(id)!, from, w)?.id ?? 'nowhere';
  check(
    'out of a room he comes back to where he CAME IN FROM: the Sewers from the Hall lead to the Hall, from the Club to the Club',
    out('cistern', HALL_ID) === HALL_ID
      && out('cistern', 'hub') === 'hub'
  );
  check(
    '...the Toy Box from the Move Garden leads to the garden; one of its rides, to the Toy Box',
    out('toybox', 'garden') === 'garden'
      && out('milkyway', 'toybox') === 'toybox'
      && out('bigdipper', 'toybox') === 'toybox'
  );
  check(
    'opened by itself (a file that starts in it), a room the Hall has a door to leads to the Hall',
    ['toybox', 'cistern', 'garden', 'longdrop', 'forge', 'lair', 'sump', 'widowpit', 'practice_roach', 'hub'].every((id) => out(id) === HALL_ID),
    ['toybox', 'cistern', 'garden', 'longdrop', 'forge', 'lair', 'sump', 'widowpit', 'practice_roach', 'hub'].map((id) => `${id}>${out(id)}`).join(' ')
  );
  check(
    '...and a side area the Hall has no door to leads to the area it is part of',
    out('pumpworks') === 'cistern'
      && out('milkyway') === 'toybox'
      && out('webs') === 'hollows'
  );
  check(
    'nothing leads out of the Hall, and an old level of the archive leads nowhere (on to the next, as it did)',
    wayOutOf(hall, undefined, w) === null
      && out('caps') === 'nowhere'
  );
  check('EVERY level but the archive\'s has a way out that ends in the Hall', all.filter((l) => l !== hall && (LEVELS.includes(l) || TEST_ROOMS.includes(l))).every((l) => {
    let at: LevelDef | null = l;
    for (let i = 0; i < 6 && at && at !== hall; i++) at = wayOutOf(at, undefined, w);
    return at === hall;
  }));
}

// ---- Boss rooms and practice rooms ----
{
  const pit = levelById('widowpit')!;
  check(
    'the spider fight has a room of its own: the two Widows at the edge of a round of light, he cannot leave it, and its way out (when they are beaten) leads to the Hall',
    pit.enemies.length === 2
      && pit.enemies.every((e) => e.type === 'widow' && Math.abs(Math.abs(e.x) - WIDOW_PIT.r) < 1.5)
      && !!pit.well
      && pit.well.r === WIDOW_PIT.r
      && pit.goals.length === 1
      && pit.goals[0].type === 'defeat'
      && Math.hypot(pit.spawn.x, pit.spawn.z) < WIDOW_PIT.r - 2
  );
  check(
    'the Grimsqueak fight, the Sump Wyrm and the Broodmother each have a door: the rooms they are fought in',
    ['lair', 'sump', 'brood'].every((id) => BOSS_ROOMS.some((b) => b.id === id))
      && levelById('lair')!.enemies.some((e) => e.type === 'grimsqueak')
      && levelById('sump')!.enemies.some((e) => e.type === 'wyrm')
      && levelById('brood')!.enemies.some((e) => e.type === 'brood')
  );
  const kind = { roach: 'scuttler', toad: 'toad', beetle: 'ironback', bat: 'bat', guard: 'guard', mantis: 'mantis', stag: 'stag', hornet: 'hornet', ant: 'ant', firefly: 'firefly', scorpion: 'scorpion' } as const;
  const rooms = PRACTICE_ROOMS.map((p) => ({ p, def: levelById(p.id)! }));
  check(
    'every kind of enemy that is not a boss has a practice room (eleven of them)',
    rooms.length === 11
      && new Set(PRACTICE_ROOMS.map((p) => p.piece)).size === 11
      && rooms.every((r) => !!r.def)
  );
  check(
    'in each: ONE of its creature to begin with, which comes back when it is beaten, and nothing asked of him',
    rooms.every(({ p, def }) => def.enemies.length === 1 && (def.enemies[0].type ?? 'scuttler') === kind[p.piece] && def.enemies[0].respawn === true && def.goals.length === 0 && def.waves.length === 0),
    rooms.filter(({ def }) => def.enemies.length !== 1 || def.enemies[0].respawn !== true).map((r) => r.p.id).join(' ')
  );
  check(
    '...and two BUTTONS on the floor, each of which puts in one more of the same creature (which does not come back), up to six alive',
    rooms.every(({ p, def }) => (def.plates ?? []).length === 2 && def.plates!.every((b) => (b.spawn?.type ?? 'scuttler') === kind[p.piece] && b.spawn?.respawn === false && b.most === PRACTICE.most && Math.hypot(b.spawn!.x - b.x, b.spawn!.z - b.z) > 10))
  );
  check(
    'he does not come in standing on a button, nor on the creature; the creature is put down well away from him',
    rooms.every(({ def }) => def.plates!.every((b) => Math.hypot(b.x - def.spawn.x, b.z - def.spawn.z) > PLATE_LEAVE + 1) && Math.hypot(def.enemies[0].x - def.spawn.x, def.enemies[0].z - def.spawn.z) > 12)
  );
  check('its way out is open from the start and leads to the Hall', rooms.every(({ def }) => def.returnTo === HALL_ID));
  // The button.
  check(
    'a button is pressed when he stands on it, once: standing there it is not pressed again',
    buttonStep(false, 0.3, true) === 'press'
      && buttonStep(true, 0.3, true) === null
      && buttonStep(false, PLATE_REACH + 0.1, true) === null
  );
  check(
    '...it comes back up when he has stepped well off it, and not before; in the air over it is not a press',
    buttonStep(true, PLATE_LEAVE + 0.1, true) === 'release'
      && buttonStep(true, PLATE_LEAVE - 0.1, false) === null
      && buttonStep(false, 0.2, false) === null
      && PLATE_LEAVE > PLATE_REACH + 0.3
  );
  check(
    'a floor plate that opens a gate is as it was: only a plate with a creature to put in comes back up (buttons only in the practice rooms, and the Gauntlet, which puts a roach into each hazard)',
    all.filter((l) => !l.id.startsWith('practice_') && l.id !== 'gauntlet').every((l) => (l.plates ?? []).every((p) => !p.spawn))
  );
}

// ---- Physics per biome ----
{
  const dream = all.filter((l) => feelOf(l).id === 'dream').map((l) => l.id).sort();
  check(
    'the dream\'s way of playing (the tuck, speed for tricks, spins and grabs) is the dream\'s three rooms\' and nobody else\'s',
    dream.join(' ') === 'bigdipper milkyway toybox',
    dream.join(' ')
  );
  // ---- THE DREAM ON FOOT (the owner, 2026-11-17: "it's supposed to feel floatier and more high velocity and
  // hyperactive ... he can jump higher and move faster"; and then: "continue and forget the triple jump for now"). ----
  const floor: Aabb[] = [aabbOf(extent('floor', -200, 200, -1, 0, -200, 200))];
  const inp = (o: Partial<PlayerInput>): PlayerInput => ({ move: new THREE.Vector3(), run: true, jumpPressed: false, jumpHeld: false, attackPressed: false, dodgeHeld: false, dodgePressed: false, guardHeld: false, stowPressed: false, ...o } as PlayerInput);
  const DT = 1 / 60;
  /** A jump (and, `twice`, the second one at the top of it) held all the way: how high he got, and how long he was off the ground. */
  const jump = (feel: Feel, twice = false, riding = false): { high: number; air: number; jumps: number } => {
    const p = new PlayerController(new THREE.Vector3(0, 0, 0));
    p.feel = feel;
    for (let i = 0; i < 10; i++) p.update(DT, inp({}), floor);
    if (riding) p.devRide();
    p.update(DT, inp({ jumpPressed: true, jumpHeld: true }), floor);
    let high = 0;
    let air = 0;
    let jumps = 1;
    let tries = 0;
    for (let i = 0; i < 600 && !(i > 3 && p.grounded); i++) {
      // (At the top of the first: the second, if asked for. At the top of that: once more, which must do nothing.)
      const press = twice && p.velocity.y <= 0 && tries < 2;
      const y0 = p.velocity.y;
      p.update(DT, inp({ jumpPressed: press, jumpHeld: true }), floor);
      if (press) {
        tries++;
        if (p.velocity.y > y0 + 1) jumps++;
      }
      high = Math.max(high, p.position.y);
      air += DT;
    }
    return { high, air, jumps };
  };
  const awake = jump(FEELS.waking);
  const asleep = jump(FEELS.dream);
  check(
    'IN THE DREAM HE JUMPS HIGHER AND FLOATS: a jump is four high where the waking world\'s is two and a half, and he is in the air half as long again',
    Math.abs(awake.high - 2.45) < 0.15
      && asleep.high > 3.8
      && asleep.high < 4.3
      && asleep.air > awake.air * 1.4
      && asleep.air < awake.air * 1.8,
    `${awake.high.toFixed(2)} high in ${awake.air.toFixed(2)}s awake; ${asleep.high.toFixed(2)} in ${asleep.air.toFixed(2)}s in the dream`
  );
  const two = jump(FEELS.dream, true);
  const twoAwake = jump(FEELS.waking, true);
  check(
    '...the jump in the air is higher too; and there are still TWO jumps and no third (he said to leave the triple jump)',
    two.high > twoAwake.high * 1.5
      && two.jumps === 2
      && twoAwake.jumps === 2
      && TUNING.jump.airJumps === 1,
    `${twoAwake.high.toFixed(2)} awake, ${two.high.toFixed(2)} in the dream; ${two.jumps} jumps`
  );
  const top = (feel: Feel): number => {
    const p = new PlayerController(new THREE.Vector3(0, 0, 0));
    p.feel = feel;
    for (let i = 0; i < 180; i++) p.update(DT, inp({ move: new THREE.Vector3(1, 0, 0) }), floor);
    return Math.hypot(p.velocity.x, p.velocity.z);
  };
  check(
    '...and he RUNS faster: a quarter as fast again',
    Math.abs(top(FEELS.dream) / top(FEELS.waking) - TUNING.dream.run) < 0.02
      && TUNING.dream.run >= 1.2,
    `${top(FEELS.waking).toFixed(2)} awake, ${top(FEELS.dream).toFixed(2)} in the dream`
  );
  const hopAwake = jump(FEELS.waking, false, true);
  const hopDream = jump(FEELS.dream, false, true);
  check(
    'ON HIS SHIELD the air is as it was, in the dream as awake: the rides are measured to it (their gaps, their landings, the half pipe\'s launch)',
    hopAwake.high > 1
      && Math.abs(hopAwake.high - hopDream.high) < 1e-6
      && Math.abs(hopAwake.air - hopDream.air) < 1e-6,
    `an ollie ${hopAwake.high.toFixed(2)} high awake, ${hopDream.high.toFixed(2)} in the dream`
  );
  check(
    'the numbers are in one place (TUNING.dream, which the dream\'s line of the table IS), the waking world\'s are all 1, and the Tweaks panel has a slider for each',
    FEELS.dream.foot === TUNING.dream
      && FEELS.waking.foot.run === 1
      && FEELS.waking.foot.jump === 1
      && FEELS.waking.foot.gravity === 1
      && ['dream.run', 'dream.jump', 'dream.gravity'].every((path) => TWEAKS.some((t) => t.path === path))
  );
}


// ---- THE SEWERS PLAY AS THE SEWERS (his "Dark Souls" biome: "you're blocking, you're parrying, you're having more
// difficult fights, you're moving slower through the level"); and in the dream he is STRONGER. ----
{
  const sewer = all.filter((l) => feelOf(l).id === 'sewers').map((l) => l.id).sort();
  check(
    'the Sewers and its four side areas play the sewers\' way, and nowhere else does',
    sewer.join(' ') === 'cistern pumpworks sludgepit sump works',
    sewer.join(' ')
  );
  const floor: Aabb[] = [aabbOf(extent('floor', -200, 200, -1, 0, -200, 200))];
  const inp = (o: Partial<PlayerInput>): PlayerInput => ({ move: new THREE.Vector3(), run: true, jumpPressed: false, jumpHeld: false, attackPressed: false, dodgePressed: false, guardHeld: false, stowPressed: false, ...o } as PlayerInput);
  const DT = 1 / 60;
  const man = (feel: Feel): PlayerController => {
    const p = new PlayerController(new THREE.Vector3(0, 0, 0));
    p.feel = feel;
    for (let i = 0; i < 10; i++) p.update(DT, inp({}), floor);
    return p;
  };
  const top = (feel: Feel): number => {
    const p = man(feel);
    for (let i = 0; i < 180; i++) p.update(DT, inp({ move: new THREE.Vector3(1, 0, 0) }), floor);
    return Math.hypot(p.velocity.x, p.velocity.z);
  };
  check('there he moves slower', Math.abs(top(FEELS.sewers) / top(FEELS.waking) - TUNING.sewers.run) < 0.02 && TUNING.sewers.run < 0.95);
  const cost = (feel: Feel): number => {
    const p = man(feel);
    const hp = p.hp;
    p.takeHit(0, 5, 1);
    return hp - p.hp;
  };
  check('...a blow costs him two hearts where it costs one elsewhere', cost(FEELS.waking) === 1 && cost(FEELS.sewers) === 2 && cost(FEELS.dream) === 1);
  const guarded = man(FEELS.sewers);
  guarded.facing = 0;
  for (let i = 0; i < 30; i++) guarded.update(DT, inp({ guardHeld: true }), floor);
  const before = guarded.hp;
  const how = guarded.takeHit(0, 5, 1);
  check('...and a blow his shield stops costs him nothing there either: blocking is worth twice as much', how === 'blocked' && guarded.hp === before, how);
  /** How many swings of his sword it takes to beat a roach. */
  const swings = (feel: Feel): number => {
    const roach = new Scuttler({ x: 0, z: 1.2 });
    const p = man(feel);
    const events: CombatEvents = { enemyHit: null, enemyKilled: false, playerResult: null, shockwave: false, cratesBroken: [] };
    let n = 0;
    for (let i = 0; i < 60 * 30 && roach.alive; i++) {
      const press = p.state !== 'attack' && i % 4 === 0;
      if (press) n++;
      p.facing = 0;
      p.update(DT, inp({ attackPressed: press }), floor);
      // (Kept in front of him: his swings carry him forward.)
      roach.x = p.position.x;
      roach.z = p.position.z + 1.2;
      resolveCombat(p, [roach], events);
    }
    return roach.alive ? 99 : n;
  };
  // THE RIPOSTE (2026-11-24): after a perfect guard, his next sword blow on that creature, in time, is worth four.
  {
    /** One swing at a roach: what it took off it. `open`: he has just turned its blow. `wait`: seconds before he swings. `other`: it was another creature he turned. */
    const blow = (feel: Feel, open: boolean, wait = 0, other = false): { took: number; rip: boolean; ready: boolean; second: number } => {
      const roach = new Scuttler({ x: 0, z: 1.2 });
      const p = man(feel);
      const events: CombatEvents = { enemyHit: null, enemyKilled: false, playerResult: null, shockwave: false, cratesBroken: [] };
      if (open) p.openRiposte(other ? new Scuttler({ x: 9, z: 9 }) : roach);
      for (let i = 0; i < Math.round(wait / DT); i++) p.update(DT, inp({}), floor);
      const ready = p.riposteReady(roach);
      const hp0 = roach.hp;
      let rip = false;
      let took = 0;
      let second = 0;
      for (let n = 0; n < 2; n++) {
        const was = roach.hp;
        for (let i = 0; i < 90; i++) {
          p.facing = 0;
          p.update(DT, inp({ attackPressed: i === 0 }), floor);
          roach.x = p.position.x;
          roach.z = p.position.z + 1.2;
          resolveCombat(p, [roach], events);
          if (events.riposte) rip = true;
          if (roach.hp < was && p.state !== 'attack') break;
        }
        if (n === 0) took = hp0 - roach.hp;
        else second = was - roach.hp;
      }
      return { took, rip, ready, second };
    };
    const plain = blow(FEELS.sewers, false);
    const ripo = blow(FEELS.sewers, true);
    check(
      'THE RIPOSTE: in the sewers, his sword blow on a creature he has just turned with a perfect guard does four times a blow\'s harm; and the blow after it is a plain one again',
      ripo.ready && ripo.rip && !plain.rip && plain.took > 0 && Math.abs(ripo.took / plain.took - TUNING.sewers.riposte) < 0.6 && ripo.second <= plain.took + 0.01,
      `plain ${plain.took.toFixed(2)}, riposte ${ripo.took.toFixed(2)}, the next ${ripo.second.toFixed(2)}`
    );
    const late = blow(FEELS.sewers, true, TUNING.sewers.riposteFor + 0.2);
    const wrong = blow(FEELS.sewers, true, 0, true);
    const awake = blow(FEELS.waking, true);
    check('...only in time, only on the creature he turned, and only there (the waking world has no riposte)', !late.rip && !late.ready && !wrong.rip && !awake.rip && FEELS.waking.fight.riposte === undefined && FEELS.platform.fight.riposte === undefined);
    // (And a perfect guard is what opens it: the game's own fight, a blow turned as the shield comes up.)
    const g = man(FEELS.sewers);
    g.facing = 0;
    g.update(DT, inp({ guardHeld: true }), floor);
    const foe = new Scuttler({ x: 0, z: 1.2 });
    const turned = g.takeHit(0, 5, 1);
    if (turned === 'parried') g.openRiposte(foe);
    check('a blow caught as his shield comes up is a perfect guard, and opens the riposte', turned === 'parried' && g.riposteReady(foe), turned);
  }
  const w = swings(FEELS.waking);
  const sw = swings(FEELS.sewers);
  const dr = swings(FEELS.dream);
  check(
    '...and his blows do less: a roach takes more swings in the sewers than elsewhere; and FEWER in the dream, where he is stronger',
    sw > w
      && dr < w
      && w < 20,
    `${w} swings awake, ${sw} in the sewers, ${dr} in the dream`
  );
  check(
    'the numbers are the table\'s (TUNING.sewers, TUNING.dream), the waking world\'s are 1 and 1, and each has its slider',
    FEELS.sewers.fight === TUNING.sewers
      && FEELS.sewers.foot === TUNING.sewers
      && FEELS.dream.fight === TUNING.dream
      && FEELS.waking.fight.dealt === 1
      && FEELS.waking.fight.taken === 1
      && TUNING.dream.dealt > 1
      && ['sewers.run', 'sewers.dealt', 'sewers.taken', 'dream.dealt'].every((path) => TWEAKS.some((t) => t.path === path))
  );
  check(
    'nothing in the sewers is easier than the waking world',
    TUNING.sewers.run <= 1
      && TUNING.sewers.dealt <= 1
      && TUNING.sewers.taken >= 1
      && TUNING.sewers.jump <= 1
      && TUNING.sewers.gravity >= 1
  );
}

// ---- THE PLATFORM ROOM (his "3D Mario" biome: "the enemies that you fight you can kind of just ground pound your
// way out of because they're weaker enemies"). ----
{
  const plat = all.filter((l) => feelOf(l).id === 'platform').map((l) => l.id).sort();
  check(
    'the Deep Caves and its five side areas play the platform room\'s way, and nowhere else does',
    plat.join(' ') === 'brood dark faith glimmer hollows webs',
    plat.join(' ')
  );
  check(
    'his run, his jump and gravity are NOT changed there (its ledges and gaps are measured to them); a blow costs him what it does elsewhere',
    TUNING.platform.run === 1
      && TUNING.platform.jump === 1
      && TUNING.platform.gravity === 1
      && TUNING.platform.taken === 1
  );
  const floor: Aabb[] = [aabbOf(extent('floor', -200, 200, -1, 0, -200, 200))];
  const inp = (o: Partial<PlayerInput>): PlayerInput => ({ move: new THREE.Vector3(), run: true, jumpPressed: false, jumpHeld: false, attackPressed: false, dodgePressed: false, guardHeld: false, stowPressed: false, ...o } as PlayerInput);
  const DT = 1 / 60;
  /** A jump and the air attack beside a roach: what the landing's blast leaves it. */
  const pound = (feel: Feel): { alive: boolean; hp: number } => {
    const roach = new Scuttler({ x: 0, z: 1.5 });
    const p = new PlayerController(new THREE.Vector3(0, 0, 0));
    p.feel = feel;
    for (let i = 0; i < 10; i++) p.update(DT, inp({}), floor);
    const events: CombatEvents = { enemyHit: null, enemyKilled: false, playerResult: null, shockwave: false, cratesBroken: [] };
    p.update(DT, inp({ jumpPressed: true, jumpHeld: true }), floor);
    for (let i = 0; i < 240; i++) {
      p.update(DT, inp({ jumpHeld: i < 20, attackPressed: i === 22 }), floor);
      roach.x = 0;
      roach.z = 1.5;
      resolveCombat(p, [roach], events);
      if (i > 30 && p.grounded && p.plungeStage === 0) break;
    }
    return { alive: roach.alive, hp: roach.hp };
  };
  /** A jump and the air attack straight down ONTO a roach: whether he was thrown back up, how high, and what he had left. */
  const stompOn = (feel: Feel): { stomped: boolean; top: number; airJumps: boolean; stuck: boolean; low: number } => {
    const roach = new Scuttler({ x: 0, z: 0.2 });
    const p = new PlayerController(new THREE.Vector3(0, 0, 0));
    p.feel = feel;
    for (let i = 0; i < 10; i++) p.update(DT, inp({}), floor);
    const events: CombatEvents = { enemyHit: null, enemyKilled: false, playerResult: null, shockwave: false, cratesBroken: [] };
    p.update(DT, inp({ jumpPressed: true, jumpHeld: true }), floor);
    let stomped = false;
    let at = 0;
    let top = 0;
    let airJumps = false;
    let stuck = false;
    let low = 99;
    for (let i = 0; i < 240; i++) {
      // (After the stomp: a second jump in the air, to see that he has it.)
      const again = stomped && !airJumps && p.velocity.y < 1;
      const y0 = p.position.y;
      p.update(DT, inp({ jumpHeld: i < 20, attackPressed: i === 22, jumpPressed: again }), floor);
      if (again && p.velocity.y > 4 && p.position.y > y0) airJumps = true;
      roach.x = 0;
      roach.z = 0.2;
      resolveCombat(p, [roach], events);
      if (events.stomped && !stomped) {
        stomped = true;
        at = p.position.y;
        low = at;
      }
      if (stomped) top = Math.max(top, p.position.y - at);
      if (p.plungeStage === 3) stuck = true;
      if (i > 30 && p.grounded && p.plungeStage === 0) break;
    }
    return { stomped, top, airJumps, stuck, low };
  };
  const stompThere = stompOn(FEELS.platform);
  const stompAwake = stompOn(FEELS.waking);
  check(
    'THE STOMP: there, his ground pound landed ON a creature throws him back up off it, higher than a jump, never stuck in the ground, with his air jump to use again',
    stompThere.stomped && stompThere.top > 2.5 && stompThere.airJumps && !stompThere.stuck && stompThere.low < 1.5,
    `from ${stompThere.low.toFixed(2)} over the floor (he has reached it, not bounced off the air above it), up ${stompThere.top.toFixed(2)}, air jump ${stompThere.airJumps}, stuck ${stompThere.stuck}`
  );
  check('...and only there: in the waking world the same dive lands and sticks, as it always did', !stompAwake.stomped && stompAwake.stuck && FEELS.waking.fight.bounce === undefined && FEELS.sewers.fight.bounce === undefined);
  const awake = pound(FEELS.waking);
  const there = pound(FEELS.platform);
  check(
    'his GROUND POUND landing beside a roach ends it there; elsewhere the same blast only hurts it',
    awake.alive
      && awake.hp < TUNING.scuttler.hp
      && !there.alive,
    `awake it is left ${awake.hp}; in the platform room ${there.alive ? there.hp : 'beaten'}`
  );
  check(
    'the numbers are the table\'s, the others\' ground pound is as it was, and each has its slider',
    FEELS.platform.fight === TUNING.platform
      && FEELS.waking.fight.plunge === 1
      && TUNING.sewers.plunge === 1
      && TUNING.dream.plunge === 1
      && ['platform.dealt', 'platform.plunge'].every((path) => TWEAKS.some((t) => t.path === path))
  );
}

console.log(failures === 0 ? '\nhall: all passed' : `\nhall: ${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
