// Save files: three games side by side. Each game's things live under its own keys; settings are shared; a game saved
// before there were files is File 1; copy and erase; and every store reads the new file when the file changes.
import { FileStore, fileKey, fileSummary, copyFile, eraseFile, formatPlayed, lastFile, setLastFile, readMeta, writeMeta, GAME_KEYS, FILE_COUNT } from '../src/core/slots';
import { writeSave } from '../src/core/save';
import { Equipment } from '../src/player/equipment';
import { Inventory } from '../src/player/inventory';
import { Discoveries } from '../src/core/stickers';
import { LevelProgress } from '../src/core/levelProgress';
import { Wallet } from '../src/core/wallet';
import { StorySeen } from '../src/story/scenes';
import { CollectibleTracker } from '../src/world/collectibles';

let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}

const mem = new Map<string, string>();
const base = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) };
const save = (x: number, at: number, levelId = 'hollows') => ({ x, y: 0, z: 0, facing: 0, cameraYaw: 0, hp: 5, savedAt: at, levelId });

check('three files', FILE_COUNT === 3);
check('File 1 keeps the keys the game always used (an older save simply is File 1)', fileKey(1, 'ratquest.save.v1') === 'ratquest.save.v1');
check(
  'Files 2 and 3 have their own keys',
  fileKey(2, 'ratquest.save.v1') === 'ratquest.f2.save.v1'
    && fileKey(3, 'ratquest.equipment.v1') === 'ratquest.f3.equipment.v1'
);
check('settings, controls and his own levels are shared by every file',
  ['ratquest.bindings', 'ratquest.audio.v1', 'ratquest.display', 'ratquest.rumble', 'ratquest.glyphs', 'ratquest.mylevels.v1', 'ratquest.tweaks.v1'].every((k) => fileKey(2, k) === k));
check(
  'every one of a game\'s own stores is in a file',
  ['save', 'quicksave', 'autosave', 'collectibles', 'equipment', 'inventory', 'levels', 'story', 'wallet', 'stickers', 'meta'].every((k) => GAME_KEYS.includes(`ratquest.${k}.v1` as never))
);

// ---- The file store ----
const files = new FileStore(base, 2);
writeSave(files, save(4, 1000), 'auto');
files.setItem('ratquest.display', '{"x":1}');
check('a game\'s things go to the file\'s keys', mem.has('ratquest.f2.autosave.v1') && !mem.has('ratquest.autosave.v1'));
check('a setting goes straight through', mem.get('ratquest.display') === '{"x":1}');

// ---- What the file screen shows ----
mem.clear();
check('a fresh device: every file is empty', [1, 2, 3].every((n) => fileSummary(base, n).empty));
// Before a file is played, the game writes a few things at start-up (the sticker book's first page): still empty.
new Discoveries(new FileStore(base, 1)).add('char:knight');
check('a file with only start-up odds and ends is still empty', fileSummary(base, 1).empty);
// An old game (saved before files existed): it is File 1.
mem.set('ratquest.autosave.v1', JSON.stringify(save(1, 5000, 'foundry')));
mem.set('ratquest.save.v1', JSON.stringify(save(1, 3000, 'cistern')));
mem.set('ratquest.stickers.v1', JSON.stringify(['char:knight', 'wedge:cistern:a', 'wedge:cistern:b', 'place:hub', 'wedge:foundry:c']));
const f1 = fileSummary(base, 1);
check(
  'an older game shows as File 1: where (newest save), wedges',
  !f1.empty
    && f1.levelId === 'foundry'
    && f1.savedAt === 5000
    && f1.wedges === 3,
  JSON.stringify(f1)
);
check('the other files are still empty', fileSummary(base, 2).empty && fileSummary(base, 3).empty);
writeMeta(new FileStore(base, 1), { played: 3 * 3600 + 5 * 60 + 12 });
check(
  'time played is kept per file',
  readMeta(new FileStore(base, 1)).played === 11112
    && fileSummary(base, 1).played === 11112
    && readMeta(new FileStore(base, 2)).played === 0
);
check('time played reads short', formatPlayed(30) === 'under a minute' && formatPlayed(42 * 60) === '42m' && formatPlayed(11112) === '3h 05m');

// ---- Copy and erase ----
copyFile(base, 1, 3);
const f3 = fileSummary(base, 3);
check('copying makes the same game in another file', !f3.empty && f3.wedges === 3 && f3.played === 11112 && f3.levelId === 'foundry');
check(
  'the copy has its own keys (playing one does not change the other)',
  mem.get('ratquest.f3.save.v1') === mem.get('ratquest.save.v1')
    && mem.has('ratquest.f3.stickers.v1')
);
writeSave(new FileStore(base, 2), save(9, 9000, 'keep'), 'quick');
copyFile(base, 2, 3);
check(
  'copying over a file replaces all of it (nothing of the old game is left)',
  fileSummary(base, 3).levelId === 'keep'
    && fileSummary(base, 3).wedges === 0
    && !mem.has('ratquest.f3.save.v1')
);
eraseFile(base, 3);
check('erasing empties a file', fileSummary(base, 3).empty && ![...mem.keys()].some((k) => k.startsWith('ratquest.f3.')));
check('and leaves the others alone', !fileSummary(base, 1).empty && !fileSummary(base, 2).empty);
const keep = mem.get('ratquest.display');
eraseFile(base, 1);
check('erasing File 1 leaves the shared settings', fileSummary(base, 1).empty && mem.get('ratquest.display') === keep);

// ---- Which file was played last ----
check('no file chosen yet: File 1', lastFile(base) === 1);
setLastFile(base, 3);
check('the last file is remembered', lastFile(base) === 3);
mem.set('ratquest.file', '9');
check('a nonsense number means File 1', lastFile(base) === 1);

// ---- Switching files: every store reads the new file ----
mem.clear();
const store = new FileStore(base, 1);
const eq = new Equipment(store);
const inv = new Inventory(store);
const disc = new Discoveries(store);
const prog = new LevelProgress(store);
const story = new StorySeen(store);
const tracker = new CollectibleTracker([{ id: 'lv', name: 'Lv', items: [{ id: 'lv:c1', kind: 'crumb', x: 0, y: 0, z: 0 }] }] as never, store);
const wallet = new Wallet(store, () => ({ crumbs: tracker.count('lv', 'crumb').have, caps: 0 }));
eq.give('cleaver');
inv.add('nachoCheese', 2);
disc.add('wedge:cistern:a');
prog.markCleared('cistern');
story.mark('hub.open');
tracker.collect('lv:c1');
const all = (): boolean[] => [eq.owns('cleaver'), inv.count('nachoCheese') === 2, disc.has('wedge:cistern:a'), prog.cleared('cistern'), story.seen('hub.open'), tracker.isCollected('lv:c1')];
check('File 1: the game as played', all().every(Boolean), JSON.stringify(all()));
let told = 0;
eq.onChange(() => told++);
store.file = 2;
for (const s of [eq, inv, disc, prog, story, tracker, wallet]) s.reload();
check('File 2: none of File 1\'s game', all().every((v) => !v), JSON.stringify(all()));
check('switching writes nothing into the new file', ![...mem.keys()].some((k) => k.startsWith('ratquest.f2.')));
check('the game hears that the gear changed (so it can dress him again)', told === 1);
store.file = 1;
for (const s of [eq, inv, disc, prog, story, tracker, wallet]) s.reload();
check('back to File 1: all of it is there again', all().every(Boolean), JSON.stringify(all()));

console.log(failures ? `\n${failures} FAILED` : '\nall passed');
process.exit(failures ? 1 : 0);
