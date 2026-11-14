// The old levels are retired: out of the game (menus, counts, the Club), kept in the archive for the parked story, and
// each one that was worth keeping lives on inside a world.
import { ALL_LEVELS, ARCHIVE, LEVELS, levelById } from '../src/levels/levels';

let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}
check('the game is only the Club and the worlds\' areas', LEVELS.every((l) => l.hub || !!l.world), LEVELS.filter((l) => !l.hub && !l.world).map((l) => l.id).join(', '));
check('the thirteen old levels are in the archive', ARCHIVE.length === 13 && ARCHIVE.every((l) => !l.world && !l.hub), ARCHIVE.map((l) => l.id).join(', '));
check('nothing is lost: the game and the archive together are every level', LEVELS.length + ARCHIVE.length === ALL_LEVELS.length);
check('an archived level can still be opened by its id (for the story, or to bring one back)', levelById('sewer')?.id === 'sewer' && levelById('webhollow')?.id === 'webhollow');
// Each old level worth keeping has its new home.
const HOMES: Record<string, string> = { waterworks: 'works', plankpit: 'sludgepit', cellars: 'coalcellars', liftshaft: 'shaft', furnace: 'foundry', webhollow: 'webs', leap: 'faith', davespot: 'hub' };
check('every old level worth keeping lives on in a world', Object.entries(HOMES).every(([, to]) => LEVELS.some((l) => l.id === to)));
check('the plain ones were not carried over (and are not in the game)', ['crates', 'caps', 'hunt', 'waves'].every((id) => !LEVELS.some((l) => l.id === id) && ARCHIVE.some((l) => l.id === id)));

console.log(failures === 0 ? 'archive: all pass' : `archive: ${failures} FAIL`);
process.exit(failures ? 1 : 0);
