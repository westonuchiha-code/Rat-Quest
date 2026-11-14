// Save slots: manual, quick and auto are kept apart, and CONTINUE picks the newest.
import { newestSave, readSave, writeSave, SaveData } from '../src/core/save';

let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}
const mem = () => {
  const d: Record<string, string> = {};
  return { getItem: (k: string) => d[k] ?? null, setItem: (k: string, v: string) => void (d[k] = v) };
};
const at = (t: number, level: string): SaveData => ({ x: 1, y: 0, z: 2, facing: 0, cameraYaw: 0, hp: 3, savedAt: t, levelId: level });

const st = mem();
check('nothing saved yet', newestSave(st) === null);
writeSave(st, at(100, 'sewer'), 'manual');
writeSave(st, at(300, 'cellars'), 'quick');
writeSave(st, at(200, 'hunt'), 'auto');
check('the slots are kept apart', readSave(st, 'manual')?.levelId === 'sewer' && readSave(st, 'quick')?.levelId === 'cellars' && readSave(st, 'auto')?.levelId === 'hunt');
check('CONTINUE picks the newest', newestSave(st)?.slot === 'quick');
writeSave(st, at(400, 'lair'), 'auto');
check('a newer autosave wins', newestSave(st)?.slot === 'auto' && newestSave(st)?.data.levelId === 'lair');
st.setItem('ratquest.autosave.v1', '{broken');
check('a damaged slot is skipped', newestSave(st)?.slot === 'quick');
check('with no storage, saving fails quietly', !writeSave(null, at(1, 'x'), 'quick') && newestSave(null) === null);

console.log(failures === 0 ? 'saves: all pass' : `saves: ${failures} FAIL`);
process.exit(failures ? 1 : 0);
