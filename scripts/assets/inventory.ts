/**
 * THE ASSET INVENTORY: builds ASSETS.md from the game's own data, so the list cannot drift from the game.
 *
 * The owner, 2026-11-17: "all of the assets, little cut scenes and videos that we have, all of that kind of stuff, even
 * things like fonts may change in the future so they all need to be well organized, kept track of and easily
 * replaceable."
 *
 * `assetsDoc(read, list)` returns the whole document. `scripts/assets/write.ts` writes it (npm run assets);
 * `tests/assets.ts` fails when the file in the project is not what this would write now.
 * Every table here is read from the code that the game runs (the lists of sounds, tunes, textures, levels...), not kept
 * by hand. What IS by hand is the few lines over each table that say where the thing lives and how to replace it.
 */
import { ALL_LEVELS, TEST_ROOMS } from '../../src/levels/levels';
import { BOSS_ROOMS, PRACTICE_ROOMS, ROOMS } from '../../src/levels/testRooms';
import { FEELS, feelOf } from '../../src/data/feel';
import { SFX_NAMES } from '../../src/audio/synth';
import { RECORDED } from '../../src/audio/recorded';
import { JINGLES, TUNES } from '../../src/audio/tunes';
import { PLAYLISTS, TRACK_NAMES } from '../../src/audio/music';
import { VOICES } from '../../src/audio/speech';
import { ROBOT_VOICES } from '../../src/audio/robotVoices';
import { CUTSCENES } from '../../src/cutscene/scenes';
import { STORY } from '../../src/story/scenes';
import { STICKERS } from '../../src/data/stickers';
import { ITEMS } from '../../src/data/equipment';
import { CONSUMABLES } from '../../src/data/consumables';
import { TEXTURE_NAMES } from '../../src/render/textures';
import { THEMES } from '../../src/levels/themes';
import { FONTS } from '../../src/ui/fonts';
import { TWEAKS } from '../../src/core/tweaks';
import type { LevelDef } from '../../src/levels/types';

/** Reads a file of the project (a path from its root) as text; and lists a folder's files. */
export type Read = (path: string) => string;
export type List = (dir: string) => string[];

/** Every kind of creature: what it is called in a level, the files that are its mind and its body. */
export const CREATURES: Array<{ type: string; mind: string; body: string; name?: string }> = [
  { type: 'scuttler', mind: 'src/enemies/scuttler.ts', body: 'src/enemies/scuttlerModel.ts' },
  { type: 'toad', mind: 'src/enemies/toad.ts', body: 'src/enemies/toadModel.ts' },
  { type: 'bat', mind: 'src/enemies/bat.ts', body: 'src/enemies/batModel.ts' },
  { type: 'mantis', mind: 'src/enemies/mantis.ts', body: 'src/enemies/mantisModel.ts' },
  { type: 'ant', mind: 'src/enemies/ant.ts', body: 'src/enemies/antModel.ts' },
  { type: 'guard', mind: 'src/enemies/guard.ts', body: 'src/enemies/guardModel.ts' },
  { type: 'hornet', mind: 'src/enemies/hornet.ts', body: 'src/enemies/hornetModel.ts' },
  { type: 'firefly', mind: 'src/enemies/firefly.ts', body: 'src/enemies/fireflyModel.ts' },
  { type: 'scorpion', mind: 'src/enemies/scorpion.ts', body: 'src/enemies/scorpionModel.ts' },
  { type: 'roller', name: 'Frost Roller', mind: 'src/enemies/roller.ts', body: 'src/enemies/rollerModel.ts' },
  { type: 'ironback', mind: 'src/enemies/ironback.ts', body: 'src/enemies/ironbackModel.ts' },
  { type: 'stag', mind: 'src/enemies/stag.ts', body: 'src/enemies/stagModel.ts' },
  { type: 'wyrm', mind: 'src/enemies/wyrm.ts', body: 'src/enemies/wyrmModel.ts' },
  { type: 'brood', mind: 'src/enemies/brood.ts', body: 'src/enemies/broodModel.ts' },
  { type: 'widow', name: 'The Widow', mind: 'src/enemies/widow.ts', body: 'src/enemies/widowModel.ts' },
  { type: 'grimsqueak', name: 'Lord Grimsqueak', mind: 'src/enemies/grimsqueak.ts', body: 'src/npc/grimsqueakModel.ts' },
];

/** Which file draws each kind of friendly character. */
const NPC_BODY: Record<string, string> = {
  mouse: 'src/npc/npc.ts', bird: 'src/npc/npc.ts', pigeon: 'src/npc/npc.ts', villain: 'src/npc/grimsqueakModel.ts',
  turtle: 'src/npc/patrons.ts', fox: 'src/npc/patrons.ts', ferret: 'src/npc/patrons.ts', owl: 'src/npc/patrons.ts', rat: 'src/npc/patrons.ts',
  ant: 'src/enemies/antModel.ts', stag: 'src/enemies/stagModel.ts',
};

const table = (head: string[], rows: string[][]): string => [`| ${head.join(' | ')} |`, `| ${head.map(() => '---').join(' | ')} |`, ...rows.map((r) => `| ${r.map((c) => c.replace(/\|/g, '/')).join(' | ')} |`)].join('\n');
const code = (s: string): string => `\`${s}\``;
const secs = (n: number): string => `${n.toFixed(1)} s`;

export function assetsDoc(read: Read, list: List): string {
  const all: LevelDef[] = [...ALL_LEVELS, ...TEST_ROOMS];
  const out: string[] = [];
  const say = (...lines: string[]): void => void out.push(...lines);

  // Which file makes each level: the one that names its id.
  const levelFiles = list('src/levels').filter((f) => f.endsWith('.ts'));
  const sources = new Map(levelFiles.map((f) => [f, read(`src/levels/${f}`)]));
  const fileOf = (id: string): string => {
    const hits = [...sources].filter(([, text]) => text.includes(`id: '${id}'`) || text.includes(`, '${id}')`));
    const own = hits.find(([f]) => f !== 'testRooms.ts' && f !== 'levels.ts') ?? hits[0];
    return own ? `src/levels/${own[0]}` : id.startsWith('practice_') ? 'src/levels/practice.ts' : '?';
  };

  say('# ASSETS: everything in the game that can be replaced, and where it is', '');
  say('**This file is written by a script. Do not edit it by hand: run `npm run assets` and it is written again from the', 'game\'s own lists.** A test (`tests/assets.ts`) fails when it is out of date, so it cannot fall behind the game.', '');
  say('The owner, 2026-11-17: "all of the assets, little cut scenes and videos that we have, all of that kind of stuff, even', 'things like fonts may change in the future so they all need to be well organized, kept track of and easily', 'replaceable."', '');
  say('**Nothing here is final.** Every model, picture, sound, tune, scene, name and number is a placeholder that can be', 'swapped. Each part below says WHERE the thing lives and HOW to replace it.', '');
  say('**How this game holds its assets:** almost nothing is a file that is loaded. Models are built in code from simple', 'shapes; textures are painted in code, dot by dot; most sounds are made in code or squashed from a short recording', 'and stored as text inside the game. That is why the whole game is one .html file. So "replace an asset" usually', 'means "change the code that makes it", in the file named for it.', '');

  // ---------------------------------------------------------------- levels
  say('## 1. Test rooms (levels)', '');
  say('The list of rooms and what their doors say: `src/levels/testRooms.ts`. A room is opened by `#level=<id>`.', 'To rename a biome, change `door` there. To add a room: build it, add it to `src/levels/levels.ts`, add a line to the list.', '');
  const areaRows = all
    .filter((l) => /^Test Room /.test(l.name))
    .sort((a, b) => a.name.localeCompare(b.name, 'en', { numeric: true }))
    .map((l) => [l.name, code(l.id), ROOMS.find((r) => r.id === l.id)?.door ?? '', l.was ?? '', feelOf(l).id, l.theme ?? 'sewer', l.music ?? 'drift', code(fileOf(l.id))]);
  say(table(['Room', 'id', 'Door says', 'Was called', 'Plays as', 'Look', 'Music', 'Made in'], areaRows), '');
  say('**The Hall** (`hall`, the hub): `src/levels/hall.ts`. **Boss rooms:** ' + BOSS_ROOMS.map((b) => `${b.door} (${code(b.id)}, ${code(fileOf(b.id))})`).join('; ') + '.', '');
  say('**Practice rooms** (all made by `src/levels/practice.ts`): ' + PRACTICE_ROOMS.map((p) => `${p.door} (${code(p.id)})`).join(', ') + '.', '');
  const old = all.filter((l) => !/^Test Room /.test(l.name) && l.id !== 'hall' && !l.id.startsWith('practice_') && !BOSS_ROOMS.some((b) => b.id === l.id));
  say(`**Old levels, kept but not behind any door** (${old.length}; open one with \`#level=<id>\`): ` + old.map((l) => `${l.name} (${code(l.id)})`).join(', ') + '.', '');

  // ---------------------------------------------------------------- how it plays
  say('## 2. How each biome plays (physics)', '');
  say('One table: `src/data/feel.ts`. The numbers every place shares: `src/data/tuning.ts` (and prices and door costs in', `\`src/data/balance.ts\`). ${TWEAKS.length} of those numbers have a slider in the Tweaks panel (\`src/core/tweaks.ts\`).`, '');
  say(table(['Biome feel', 'Meant to be like', 'Run', 'Jump', 'Gravity', 'Tuck', 'Speed from tricks', 'Spin and grab'], Object.values(FEELS).map((f) => [f.name, f.like, `x${f.foot.run}`, `x${f.foot.jump}`, `x${f.foot.gravity}`, f.ride.tuck ? 'yes' : 'no', f.ride.trickSpeed ? 'yes' : 'no', f.ride.airTricks ? 'yes' : 'no'])), '');

  // ---------------------------------------------------------------- the hero
  say('## 3. The hero', '');
  say(table(['What', 'Where'], [
    ['His body, built from shapes; his scarf, helmet, sword and shield', code('src/player/ratModel.ts')],
    ['His poses and sword swings', code('src/player/animations.ts')],
    ['How he moves (running, jumping, riding)', code('src/player/controller.ts')],
    ['His look in the dream (loud colours, long scarf)', '`look: \'dream\'` on a level; drawn in ' + code('src/player/ratModel.ts')],
    ['His gear, by name and colour', code('src/data/equipment.ts')],
  ]), '');
  say('To replace his model: change `RatModel` in `ratModel.ts` (the game asks it only for a pose each frame).', '');

  // ---------------------------------------------------------------- creatures
  say('## 4. Creatures (enemies and bosses)', '');
  say('Each has a MIND (how it fights) and a BODY (how it is drawn) in separate files, so either can be replaced alone.', 'Which body goes with which mind is in `addEnemy` in `src/main.ts`. In the dream the same creatures wear loud colours', '(`dreamify`, `src/world/dozers.ts`).', '');
  say(table(['Creature', 'Called in a level', 'Its mind', 'Its body', 'Practice room'], CREATURES.map((c) => {
    const st = STICKERS.find((s) => s.id === `foe:${c.type}`);
    const piece = { scuttler: 'roach', ironback: 'beetle' }[c.type] ?? c.type;
    const room = PRACTICE_ROOMS.find((p) => p.piece === piece)?.id ?? BOSS_ROOMS.find((b) => all.find((l) => l.id === b.id)?.enemies.some((e) => (e.type ?? 'scuttler') === c.type))?.id ?? '';
    return [st?.name ?? c.name ?? c.type, code(c.type), code(c.mind), code(c.body), room ? code(room) : ''];
  })), '');

  // ---------------------------------------------------------------- characters
  say('## 5. Characters (friendly)', '');
  say('Who is where and what they say is written in the level that holds them (the Club\'s cast: `src/levels/junction.ts`;', 'the Hall takes that cast whole and stands them about: `src/levels/hall.ts`). Their bodies are built by kind.', 'Their talk-box faces: `src/npc/portrait.ts` (kept blocky on purpose). Their voices: part 8.', '');
  const people = new Map<string, { kind: string; where: Set<string> }>();
  for (const l of all) for (const n of l.npcs ?? []) {
    const key = n.name.toUpperCase();
    const p = people.get(key) ?? { kind: n.kind ?? 'mouse', where: new Set<string>() };
    p.where.add(l.name);
    people.set(key, p);
  }
  say(table(['Character', 'Kind', 'Body built in', 'Voice', 'Appears in'], [...people].sort((a, b) => a[0].localeCompare(b[0])).map(([name, p]) => [name, p.kind, code(NPC_BODY[p.kind] ?? '?'), `${VOICES[p.kind as keyof typeof VOICES]?.bank ?? '?'} at ${VOICES[p.kind as keyof typeof VOICES]?.pitch ?? '?'}`, [...p.where].slice(0, 4).join(', ') + (p.where.size > 4 ? ` and ${p.where.size - 4} more` : '')])), '');

  // ---------------------------------------------------------------- scenery
  say('## 6. Scenery and props', '');
  const kinds = [...new Set([...read('src/world/layout.ts').matchAll(/kind: '([a-zA-Z]+)'/g)].map((m) => m[1]))].sort();
  const worldFiles = list('src/world').filter((f) => f.endsWith('.ts'));
  const models = worldFiles.filter((f) => /Models?\.ts$/.test(f));
  say(`A level asks for a prop by its kind (\`decor\`, in \`src/world/layout.ts\`); \`src/world/chamber.ts\` draws it. There are ${kinds.length} kinds:`, kinds.map(code).join(', ') + '.', '');
  say('Props with a model file of their own: ' + models.map((f) => code(`src/world/${f}`)).join(', ') + '. Doors: `src/world/doorway.ts`; their signs:', '`src/world/courseDoors.ts`. The sky and its planets: `src/world/sky.ts`. Things to pick up: `src/world/collectibleMeshes.ts`,', '`src/world/itemModels.ts`, `src/world/wedges.ts`. The dream\'s sleeping creatures: `src/world/dozers.ts`.', '');
  say('To replace a prop: change the code under its kind in `chamber.ts` (or its model file). What is drawn must stay the', 'size of what is solid: the solid boxes are given by the level, not by the model.', '');

  // ---------------------------------------------------------------- textures
  say('## 7. Textures and looks', '');
  say(`All ${TEXTURE_NAMES.length} textures are painted in code, dot by dot: \`src/render/textures.ts\` (one entry each, by name). To replace`, 'one, repaint its entry. (The game cannot load a picture FILE as a texture yet: `getTexture` there is where that would be added.) The names:', TEXTURE_NAMES.map(code).join(', ') + '.', '');
  say('A level\'s LOOK is a theme: which texture each kind of surface wears (`src/levels/themes.ts`).', '');
  say(table(['Theme', 'What it is', 'Floor', 'Wall', 'Platform', 'Stone'], THEMES.map((t) => [code(t.id), t.label, t.skins.floor, t.skins.wall, t.skins.platform, t.skins.stone])), '');
  say('How everything is shaded (the PS1 look: wobble, banding, fog): `src/render/ps1Material.ts`. How sharp the picture', 'is: `src/render/picture.ts`.', '');

  // ---------------------------------------------------------------- sound
  say('## 8. Sound', '');
  say('**Claude cannot hear.** Sounds are made and checked by measurement (how loud, how long, how bright); only the owner\'s', 'ears can say whether one is right.', '');
  say('### Sound effects', '');
  const map = JSON.parse(read('recordings/map.json')) as Record<string, { file?: string }>;
  const recorded = SFX_NAMES.filter((n) => RECORDED[n]);
  say(`${SFX_NAMES.length} effects, each known by a name (\`SFX_NAMES\` in \`src/audio/synth.ts\`). ${recorded.length} are RECORDED (a short piece of a`, `recording, squashed, stored in \`src/audio/recorded.ts\`); the other ${SFX_NAMES.length - recorded.length} are MADE IN CODE (a recipe in \`synth.ts\`).`, '', '**To replace an effect with a recording:** put the sound file in `recordings/`, add or change its entry in', '`recordings/map.json` (which file, from when to when, pitch), run `python3 scripts/make-recorded.py`. To go back to', 'the made-up sound, delete the entry and run it again. To change a made-up sound, change its recipe in `synth.ts`.', '');
  say(table(['Effect', 'Comes from'], recorded.map((n) => [code(n), `recorded: ${code('recordings/' + (map[n]?.file ?? '?'))}`])), '');
  say('Made in code: ' + SFX_NAMES.filter((n) => !RECORDED[n]).map(code).join(', ') + '.', '');
  say('The owner\'s three sound tools (kept whole in the project): ' + list('recordings/tools').map((f) => code(`recordings/tools/${f}`)).join(', ') + '. They are driven by', 'the scripts in `scripts/chip/` (`sfx.mjs` for effects, `voices.mjs` and `robot.mjs` for voices, `songs.mjs` and `make.mjs` for music).', '');

  say('### Voices', '');
  say('Characters "speak" in syllables cut from one recording each (`recordings/voices.json`, built by', '`scripts/make-recorded.py`); which recording and at what pitch each KIND of character uses: `VOICES` in', '`src/audio/speech.ts`. To give a character a voice of his own, record him, add a bank, point his kind at it.', '');
  say(table(['Kind of character', 'Recording used', 'Pitch'], Object.entries(VOICES).map(([k, v]) => [k, v.bank, String(v.pitch)])), '');
  say(`**Robot voices** (the Robot Voice Box). They SPEAK only in the dream. ${Object.keys(ROBOT_VOICES).length} voices (${Object.keys(ROBOT_VOICES).join(', ')}), each with cries for`, 'attack, hurt and die: `src/audio/robotVoices.ts`, made by `node scripts/chip/robot.mjs`. Which creature has which', 'voice: `src/audio/dreamVoices.ts`.', '');

  say('### Music', '');
  say('**The sound of this game is hip-hop: boom bap, gritty, scratches.** Songs are WRITTEN as notes in', '`scripts/chip/songs.mjs`, RENDERED through the owner\'s tools by `node scripts/chip/make.mjs <folder>`, and PUT IN THE', 'GAME by `node scripts/chip/embed.mjs <folder> <ids...>`, which writes `src/audio/tunes.ts`. Which tune plays where:', '`PLAYLISTS` in `src/audio/music.ts`; a level asks for a kind of music by name (`music:` on the level).', '');
  say(table(['In the game', 'Name', 'Tempo', 'One round'], [...Object.entries(TUNES).map(([id, t]) => [code(id), t.name, `${t.bpm} bpm`, secs(t.length)]), ...Object.entries(JINGLES).map(([id, t]) => [code(id) + ' (jingle)', t.name, `${t.bpm} bpm`, secs(t.length)])]), '');
  say(table(['A level asks for', 'It gets', 'Levels that ask for it'], TRACK_NAMES.map((n) => [code(n), PLAYLISTS[n] ? PLAYLISTS[n]!.tunes.map(code).join(' then ') : 'the old made-in-code track', String(all.filter((l) => (l.music ?? 'drift') === n).length)])), '');
  const songs = [...read('scripts/chip/songs.mjs').matchAll(/\bid: '([a-z0-9]+)',(?: dream: true,)? name: (?:"([^"]+)"|'([^']+)')/g)].map((m) => ({ id: m[1], name: m[2] ?? m[3] }));
  const waiting = songs.filter((s) => !TUNES[s.id] && !JINGLES[s.id]);
  say(`**Written but NOT in the game** (${waiting.length}): ` + waiting.map((s) => `${s.name} (${code(s.id)})`).join(', ') + '.', '');

  // ---------------------------------------------------------------- scenes
  say('## 9. Cutscenes', '');
  say('Each is a list of who stands where, what they do and where the camera is, second by second: `src/cutscene/scenes.ts`', '(played by `src/cutscene/cutscene.ts`). To see one: pause, SCENES; or `#level=hub&scene=<id>`. To replace one, rewrite', 'its entry; to add one, add an entry.', '');
  say(table(['Scene', 'id', 'Set in', 'Length'], CUTSCENES.map((c) => [c.name, code(c.id), code(c.level), secs(c.length)])), '');
  say(`**The old story** (parked: do not un-park it): ${Object.keys(STORY).length} levels' scenes in \`src/story/scenes.ts\`, played by \`src/story/scene.ts\`.`, '');

  // ---------------------------------------------------------------- fonts
  say('## 10. Fonts', '');
  say('Every typeface is named in ONE file: `src/ui/fonts.ts`. Change a line there and everything that uses it changes.', 'A test fails if a font is named anywhere else.', '');
  say(table(['Font', 'Used for', 'Now'], [['game', 'the HUD, menus, talk box, shop, photo mode', FONTS.game], ['title', 'the title screen and the save-file screen', FONTS.title], ['label', 'small print on the title and save-file screens; the letters on button pictures', FONTS.label], ['logo', 'the name under the studio mark', FONTS.logo], ['tools', 'the level builder and Tweaks', FONTS.tools]]), '');
  say('The block letters on door signs and boards in the world are not a font: they are drawn from the game\'s own letter', 'shapes, `src/render/pixelFont.ts`.', '');

  // ---------------------------------------------------------------- pictures
  say('## 11. Pictures in the menus', '');
  const groups = [...new Set(STICKERS.map((s) => s.group))];
  say(table(['What', 'Where'], [
    ['Little pictures (gear, hearts, tabs, stickers)', code('src/ui/icons.ts') + ' (drawn in code)'],
    ['Button pictures (Xbox, PlayStation, Switch, Steam Deck, keys)', code('src/ui/glyphs.ts')],
    ['Faces in the talk box', code('src/npc/portrait.ts')],
    [`The sticker book: ${STICKERS.length} stickers (${groups.map((g) => `${STICKERS.filter((s) => s.group === g).length} ${g}`).join(', ')})`, code('src/data/stickers.ts')],
    ['The title screen and the studio mark', code('src/ui/boot.ts')],
    ['The painting on the wall', code('src/world/portraitTexture.ts')],
  ]), '');

  // ---------------------------------------------------------------- words
  say('## 12. Words and names', '');
  say(table(['What', 'Where'], [
    ['Room numbers and what the doors say', code('src/levels/testRooms.ts')],
    ['What characters say', 'in each level\'s file, on the character (`lines`)'],
    ['Sign boards in a level', 'in each level\'s file (`kind: \'sign\'`)'],
    [`Gear (${Object.keys(ITEMS).length}) and food (${Object.keys(CONSUMABLES).length}): names and descriptions`, code('src/data/equipment.ts') + ', ' + code('src/data/consumables.ts')],
    ['Sticker names and blurbs', code('src/data/stickers.ts')],
    ['Menu words', code('src/ui/menu.ts') + ', ' + code('src/ui/boot.ts')],
  ]), '');

  // ---------------------------------------------------------------- films
  say('## 13. Films and pictures of the game', '');
  say('**The films and pictures sent to the owner are NOT kept in the project** (they are large, and are made again from', 'the game). What IS kept is how to make them:', '');
  say(table(['Script', 'What it does'], list('scripts/film').sort().map((f) => [code(`scripts/film/${f}`), read(`scripts/film/${f}`).split('\n').find((l) => /^(\/\/|#) [A-Z]/.test(l))?.replace(/^(\/\/|#) /, '') ?? ''])), '');
  say('Anything that moves is shown as a film, not as stills. A film gets a tune of its own, rendered with', '`scripts/chip/make.mjs`.', '');

  say('## 14. Keeping this list true', '');
  say('- `npm run assets` writes this file again. `tests/assets.ts` fails if it is stale, if a creature or prop file named', '  here is missing, or if a font is named outside `src/ui/fonts.ts`.', '- A new creature goes in `CREATURES` in `scripts/assets/inventory.ts`; everything else is picked up by itself.', '');
  return out.join('\n');
}
