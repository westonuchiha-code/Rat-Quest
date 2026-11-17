/**
 * THE HALL AND THE TEST ROOMS (the owner, 2026-11-17: "I want all the levels in the game to be labeled as test rooms ...
 * one big Hub world ... a long hallway where NPCs are all hanging out ... a door to each different test room ... doors
 * to specific boss fights ... each different enemy type to have a room where it spawns that enemy one at a time ...
 * buttons on the floor that spawn the enemy").
 */
import './../src/core/colorSetup';
import { ALL_LEVELS, LEVELS, TEST_ROOMS, levelById } from '../src/levels/levels';
import { HALL, HALL_FIRE, hallDoors } from '../src/levels/hall';
import { PRACTICE, WIDOW_PIT } from '../src/levels/practice';
import { BOSS_ROOMS, HALL_ID, PRACTICE_ROOMS, ROOMS, roomName } from '../src/levels/testRooms';
import { wayOutOf, type WayOutWorld } from '../src/levels/wayOut';
import { junction } from '../src/levels/junction';
import { SIGN, signPixels } from '../src/world/courseDoors';
import { DOOR_REACH, atDoor } from '../src/world/rooms';
import { PLATE_LEAVE, PLATE_REACH, buttonStep } from '../src/world/plates';
import { wrapText } from '../src/render/pixelFont';
import { feelOf } from '../src/data/feel';
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
  check('the list of test rooms: each has a number of its own, counting up from 1, and a level that is really there', ns.every((n, i) => n === i + 1) && ROOMS.every((r) => !!levelById(r.id)), ROOMS.filter((r) => !levelById(r.id)).map((r) => r.id).join(' '));
  check('each is NAMED by its number ("Test Room 3"), and what it was called before is kept as a note', ROOMS.every((r) => levelById(r.id)!.name === `Test Room ${r.n}` && !!levelById(r.id)!.was && levelById(r.id)!.was !== levelById(r.id)!.name), ROOMS.map((r) => `${levelById(r.id)!.name}=${levelById(r.id)!.was}`).join(', '));
  const cistern = levelById('cistern')!;
  const sides = (cistern.courseDoors ?? []).map((d) => levelById(d.to ?? '')!.name);
  check('the areas a room\'s own doors lead to are that room\'s B, C, D...: the Sewers\' four are 3B to 3E, and the doors to them say so', sides.join(' ') === 'Test Room 3B Test Room 3C Test Room 3D Test Room 3E' && (cistern.courseDoors ?? []).every((d) => d.name === levelById(d.to ?? '')!.name), sides.join(' '));
  check('the dream\'s two rides are the Toy Box\'s: 1B and 1C (not the garden\'s, though the garden has a door to one)', levelById('milkyway')!.name === 'Test Room 1B' && levelById('bigdipper')!.name === 'Test Room 1C');
  const named = all.filter((l) => /^Test Room \d+[A-Z]?$/.test(l.name));
  check('no two levels have the same name, and every level of the game (the Club, the worlds and their areas) and every try-out room is a numbered test room', new Set(all.map((l) => l.name)).size === all.length && LEVELS.every((l) => named.includes(l)), LEVELS.filter((l) => !named.includes(l)).map((l) => l.id).join(' '));
  check('a name is made one way only', roomName(3) === 'Test Room 3' && roomName(3, 1) === 'Test Room 3B' && roomName(10, 2) === 'Test Room 10C');
  check('a room, a boss room or a practice room can be opened from the address by its id (letters, digits and _ only)', [...ROOMS, ...BOSS_ROOMS, ...PRACTICE_ROOMS].every((r) => /^\w+$/.test(r.id)));
}

// ---- The Hall ----
{
  const doors = hallDoors();
  check('the Hall is home: a hub with nothing asked of him, a fire to rest at by the way in, and he comes in at its west end looking down it', !!hall.hub && hall.goals.length === 0 && hall.enemies.length === 0 && hall.restSpot === HALL_FIRE && hall.spawn.x < -HALL.halfX + 4 && Math.abs(hall.spawn.facing - Math.PI / 2) < 1e-9);
  check('it has a door to every test room, every boss room and every practice room, and each leads somewhere real; none asks for anything', doors.length === ROOMS.length + BOSS_ROOMS.length + PRACTICE_ROOMS.length && [...ROOMS, ...BOSS_ROOMS, ...PRACTICE_ROOMS].every((r) => doors.some((d) => d.to === r.id && !!levelById(r.id))) && doors.every((d) => d.need === 0) && hall.courseDoors!.length === doors.length);
  const north = doors.filter((d) => d.door.z < 0);
  const south = doors.filter((d) => d.door.z > 0);
  check('the rooms and the bosses are along one wall (the rooms first, in the order of their numbers, then a gap, then the bosses); the practice rooms along the other', north.length === ROOMS.length + BOSS_ROOMS.length && south.length === PRACTICE_ROOMS.length && ROOMS.every((r, i) => north[i].to === r.id && (i === 0 || north[i].door.x > north[i - 1].door.x)) && north[ROOMS.length].door.x - north[ROOMS.length - 1].door.x > HALL.step * 1.5);
  // Signs.
  const board = SIGN.w / SIGN.dots;
  const gaps = [north, south].flatMap((w) => w.slice(1).map((d, i) => d.door.x - w[i].door.x));
  check('the doors stand far enough apart that no sign overlaps the next (a board is five and a half wide)', Math.min(...gaps) >= board + 1, `nearest ${Math.min(...gaps).toFixed(1)}, a board ${board}`);
  const st = { open: true, got: 0, of: 0 };
  const written = doors.map((d) => signPixels(d, st).lines);
  check('a room\'s sign says its biome (a placeholder), and under it its number: "THE SEWERS" over "TEST ROOM 3"', written[2].join('|') === 'THE SEWERS|TEST ROOM 3' && written[0].join('|') === 'WACKY|POMO DREAM|TEST ROOM 1', `${written[2].join('|')}; ${written[0].join('|')}`);
  check('every sign in the Hall can be read whole: its name fits two lines of the board, and so does what is under it', doors.every((d) => wrapText(d.name.toUpperCase(), SIGN.lineMax).length <= 2 && wrapText(d.name.toUpperCase(), SIGN.lineMax).every((l) => l.length <= SIGN.lineMax) && (d.under ?? '').length <= SIGN.lineMax), doors.filter((d) => wrapText(d.name.toUpperCase(), SIGN.lineMax).length > 2 || (d.under ?? '').length > SIGN.lineMax).map((d) => d.name).join(', '));
  check('a boss room\'s sign says BOSS ROOM, a practice room\'s PRACTICE', BOSS_ROOMS.every((b) => doors.find((d) => d.to === b.id)!.under === 'BOSS ROOM') && PRACTICE_ROOMS.every((p) => doors.find((d) => d.to === p.id)!.under === 'PRACTICE'));
  check('elsewhere a sign is as it was: a door with no words of its own under its name shows the wedges taken', signPixels({ name: 'X', need: 0 }, { open: true, got: 3, of: 16 }).lines.join('|') === 'X|3/16');
  // The crowd.
  const club = (junction().npcs ?? []).map((n) => n.name.toUpperCase());
  const here = (hall.npcs ?? []).map((n) => n.name.toUpperCase());
  check('EVERYONE in the Club is in the Hall (all seventeen), each once, and nobody is waiting to be earned or hidden', club.length >= 17 && club.every((n) => here.filter((h) => h === n).length === 1) && (hall.npcs ?? []).every((n) => !n.when && !n.hidden && !n.seated), club.filter((n) => !here.includes(n)).join(', '));
  const npcs = hall.npcs ?? [];
  const blocked = npcs.filter((n) => doors.some((d) => Math.hypot(n.x - d.door.x, n.z - d.door.z) < DOOR_REACH + 1.2 || atDoor(d.door, n.x, n.z)));
  check('nobody stands in a doorway, or near enough one to be in the way of it', blocked.length === 0, blocked.map((n) => n.name).join(', '));
  const lane = npcs.filter((n) => n.y === 0 && Math.abs(n.z) < 1.6 && n.x < HALL.stageX - 3);
  check('the middle of the hall is left clear to run down', lane.length === 0, lane.map((n) => n.name).join(', '));
  let nearest = 99;
  for (let i = 0; i < npcs.length; i++) for (let j = i + 1; j < npcs.length; j++) nearest = Math.min(nearest, Math.hypot(npcs[i].x - npcs[j].x, npcs[i].z - npcs[j].z));
  check('no two of them stand in the same place (each is solid), and all are inside the hall', nearest > 1.2 && npcs.every((n) => Math.abs(n.x) < HALL.halfX - 0.4 && Math.abs(n.z) < HALL.halfZ - 0.4), `nearest two ${nearest.toFixed(2)} apart`);
  check('everyone has something to say (their words are the Club\'s: placeholders)', npcs.every((n) => n.lines.length > 0 && n.lines.every((l) => l.length > 0)));
  check('Pip still keeps shop', npcs.some((n) => n.name.toUpperCase() === 'PIP' && n.shop));
}

// ---- Where a way out leads ----
{
  const club = LEVELS.find((l) => l.hub)!;
  const w: WayOutWorld = { home: hall, hub: club, byId: levelById, doorsOf: (l) => l.courseDoors ?? [], isMine: () => false };
  const out = (id: string, from?: string): string => wayOutOf(levelById(id)!, from, w)?.id ?? 'nowhere';
  check('out of a room he comes back to where he CAME IN FROM: the Sewers from the Hall lead to the Hall, from the Club to the Club', out('cistern', HALL_ID) === HALL_ID && out('cistern', 'hub') === 'hub');
  check('...the Toy Box from the Move Garden leads to the garden; one of its rides, to the Toy Box', out('toybox', 'garden') === 'garden' && out('milkyway', 'toybox') === 'toybox' && out('bigdipper', 'toybox') === 'toybox');
  check('opened by itself (a file that starts in it), a room the Hall has a door to leads to the Hall', ['toybox', 'cistern', 'garden', 'longdrop', 'forge', 'lair', 'sump', 'widowpit', 'practice_roach', 'hub'].every((id) => out(id) === HALL_ID), ['toybox', 'cistern', 'garden', 'longdrop', 'forge', 'lair', 'sump', 'widowpit', 'practice_roach', 'hub'].map((id) => `${id}>${out(id)}`).join(' '));
  check('...and a side area the Hall has no door to leads to the area it is part of', out('pumpworks') === 'cistern' && out('milkyway') === 'toybox' && out('webs') === 'hollows');
  check('nothing leads out of the Hall, and an old level of the archive leads nowhere (on to the next, as it did)', wayOutOf(hall, undefined, w) === null && out('caps') === 'nowhere');
  check('EVERY level but the archive\'s has a way out that ends in the Hall', all.filter((l) => l !== hall && (LEVELS.includes(l) || TEST_ROOMS.includes(l))).every((l) => {
    let at: LevelDef | null = l;
    for (let i = 0; i < 6 && at && at !== hall; i++) at = wayOutOf(at, undefined, w);
    return at === hall;
  }));
}

// ---- Boss rooms and practice rooms ----
{
  const pit = levelById('widowpit')!;
  check('the spider fight has a room of its own: the two Widows at the edge of a round of light, he cannot leave it, and its way out (when they are beaten) leads to the Hall', pit.enemies.length === 2 && pit.enemies.every((e) => e.type === 'widow' && Math.abs(Math.abs(e.x) - WIDOW_PIT.r) < 1.5) && !!pit.well && pit.well.r === WIDOW_PIT.r && pit.goals.length === 1 && pit.goals[0].type === 'defeat' && Math.hypot(pit.spawn.x, pit.spawn.z) < WIDOW_PIT.r - 2);
  check('the Grimsqueak fight, the Sump Wyrm and the Broodmother each have a door: the rooms they are fought in', ['lair', 'sump', 'brood'].every((id) => BOSS_ROOMS.some((b) => b.id === id)) && levelById('lair')!.enemies.some((e) => e.type === 'grimsqueak') && levelById('sump')!.enemies.some((e) => e.type === 'wyrm') && levelById('brood')!.enemies.some((e) => e.type === 'brood'));
  const kind = { roach: 'scuttler', toad: 'toad', beetle: 'ironback', bat: 'bat', guard: 'guard', mantis: 'mantis', stag: 'stag', hornet: 'hornet', ant: 'ant', firefly: 'firefly', scorpion: 'scorpion' } as const;
  const rooms = PRACTICE_ROOMS.map((p) => ({ p, def: levelById(p.id)! }));
  check('every kind of enemy that is not a boss has a practice room (eleven of them)', rooms.length === 11 && new Set(PRACTICE_ROOMS.map((p) => p.piece)).size === 11 && rooms.every((r) => !!r.def));
  check('in each: ONE of its creature to begin with, which comes back when it is beaten, and nothing asked of him', rooms.every(({ p, def }) => def.enemies.length === 1 && (def.enemies[0].type ?? 'scuttler') === kind[p.piece] && def.enemies[0].respawn === true && def.goals.length === 0 && def.waves.length === 0), rooms.filter(({ def }) => def.enemies.length !== 1 || def.enemies[0].respawn !== true).map((r) => r.p.id).join(' '));
  check('...and two BUTTONS on the floor, each of which puts in one more of the same creature (which does not come back), up to six alive', rooms.every(({ p, def }) => (def.plates ?? []).length === 2 && def.plates!.every((b) => (b.spawn?.type ?? 'scuttler') === kind[p.piece] && b.spawn?.respawn === false && b.most === PRACTICE.most && Math.hypot(b.spawn!.x - b.x, b.spawn!.z - b.z) > 10)));
  check('he does not come in standing on a button, nor on the creature; the creature is put down well away from him', rooms.every(({ def }) => def.plates!.every((b) => Math.hypot(b.x - def.spawn.x, b.z - def.spawn.z) > PLATE_LEAVE + 1) && Math.hypot(def.enemies[0].x - def.spawn.x, def.enemies[0].z - def.spawn.z) > 12));
  check('its way out is open from the start and leads to the Hall', rooms.every(({ def }) => def.returnTo === HALL_ID));
  // The button.
  check('a button is pressed when he stands on it, once: standing there it is not pressed again', buttonStep(false, 0.3, true) === 'press' && buttonStep(true, 0.3, true) === null && buttonStep(false, PLATE_REACH + 0.1, true) === null);
  check('...it comes back up when he has stepped well off it, and not before; in the air over it is not a press', buttonStep(true, PLATE_LEAVE + 0.1, true) === 'release' && buttonStep(true, PLATE_LEAVE - 0.1, false) === null && buttonStep(false, 0.2, false) === null && PLATE_LEAVE > PLATE_REACH + 0.3);
  check('a floor plate that opens a gate is as it was: only a plate with a creature to put in comes back up', all.filter((l) => !l.id.startsWith('practice_')).every((l) => (l.plates ?? []).every((p) => !p.spawn)));
}

// ---- Physics per biome ----
{
  const dream = all.filter((l) => feelOf(l).id === 'dream').map((l) => l.id).sort();
  check('the dream\'s way of playing (the tuck, speed for tricks, spins and grabs) is the dream\'s three rooms\' and nobody else\'s', dream.join(' ') === 'bigdipper milkyway toybox', dream.join(' '));
}

console.log(failures === 0 ? '\nhall: all passed' : `\nhall: ${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
