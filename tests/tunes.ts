// The recorded tunes (src/audio/tunes.ts, made by scripts/chip/ from the owner's two sound tools) and what plays where
// (PLAYLISTS in src/audio/music.ts). What is checked: that every name that plays recorded tunes has them, that each
// is an MP3 of a sensible length with room either side of its round, that the places he chose them for play them,
// and that the game has not grown by more than was meant.
import { PLAYLISTS, TRACK_NAMES, trackNamed, type TrackName } from '../src/audio/music';
import { TUNES, JINGLES } from '../src/audio/tunes';
import { TUNE_LEVEL } from '../src/audio/music';
import { ALL_LEVELS, TEST_ROOMS, levelById } from '../src/levels/levels';

let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}
const bytesOf = (b64: string): Uint8Array => Uint8Array.from(Buffer.from(b64, 'base64'));
const lists = Object.entries(PLAYLISTS) as Array<[TrackName, { tunes: string[]; rounds: number }]>;

check('every name that plays recorded tunes is one of the game\'s tracks, has at least one tune, and every tune it names is there', lists.length >= 6 && lists.every(([n, l]) => TRACK_NAMES.includes(n) && l.tunes.length > 0 && l.rounds >= 1 && l.tunes.every((id) => !!TUNES[id])));
check('every recorded tune is played by something (none is carried for nothing)', Object.keys(TUNES).every((id) => lists.some(([, l]) => l.tunes.includes(id))), Object.keys(TUNES).join(' '));
check('every name still has notes under it, for a browser that cannot play the recording', TRACK_NAMES.every((n) => trackNamed(n).lanes.length > 0));
for (const [id, t] of Object.entries(TUNES)) {
  const b = bytesOf(t.b64);
  const mp3 = (b[0] === 0xff && (b[1] & 0xe0) === 0xe0) || (b[0] === 0x49 && b[1] === 0x44 && b[2] === 0x33);
  // (At 80 thousand bits a second: the bytes say how long the sound is, near enough.)
  const seconds = (b.length * 8) / 80000;
  check(`"${t.name}" (${id}): an MP3; a round of ${t.length.toFixed(1)}s (eight bars at ${t.bpm} to the minute); and the sound is longer than the round by its lead-in before and as much after`, mp3 && Math.abs(t.length - (8 * 4 * 60) / t.bpm) < 0.01 && t.lead >= 0.25 && seconds > t.length + t.lead * 2 - 0.15 && seconds < t.length + t.lead * 2 + 0.4, `${seconds.toFixed(2)}s of sound, ${(t.b64.length / 1024).toFixed(0)} KB`);
}
// ---- The jingles: played once each ----
for (const [id, t] of Object.entries(JINGLES)) {
  const b = bytesOf(t.b64);
  check(`the jingle "${t.name}" (${id}) is an MP3 of about its own length (${t.length.toFixed(1)}s), with nothing put before it`, ((b[0] === 0xff && (b[1] & 0xe0) === 0xe0) || (b[0] === 0x49 && b[1] === 0x44 && b[2] === 0x33)) && t.lead === 0 && Math.abs((b.length * 8) / 64000 - t.length) < 0.3);
}
check('a wedge won is SHORT (the owner: "The jingle wedge sound I think is just too long", of one of eight seconds): under three and a half', !!JINGLES.wedge && JINGLES.wedge.length < 3.5, `${JINGLES.wedge?.length}`);
check('a defeat has its slow piece', !!JINGLES.defeat && JINGLES.defeat.length > 8);
const size = [...Object.values(TUNES), ...Object.values(JINGLES)].reduce((s, t) => s + t.b64.length, 0);
check('all of them together add less than two and a quarter megabytes to the game', size < 2.25 * 1024 * 1024, `${(size / 1024 / 1024).toFixed(2)} MB`);

// ---- What he chose for where ----
const plays = (levelId: string): string[] => PLAYLISTS[levelById(levelId)!.music as TrackName]?.tunes ?? [];
check('the Club plays the two boom bap tunes with Dizzy Dave\'s voice, his favourite ("number 2") first, each twice round before the other', plays('hub').join() === 'bap2,bap1' && PLAYLISTS.groove!.rounds === 2);
check('the Milky Way plays the dream\'s own tune, and no longer the Club\'s', levelById('milkyway')!.music === 'dream' && plays('milkyway').join() === 'dream');
check('the Cistern, the Foundry, the Hollows and the Keep play theirs', plays('cistern').join() === 'cistern' && plays('foundry').join() === 'foundry' && plays('hollows').join() === 'hollows' && plays('keep').join() === 'keep');
check('every level of the game and every test room that has music has a name the game knows', [...ALL_LEVELS, ...TEST_ROOMS].every((l) => !l.music || TRACK_NAMES.includes(l.music)));

// (The owner, 2026-11-17: "the music is a little too loud in general ... way louder than everything else".)
check('a recorded tune is played at half its recorded level or less, and the dream\'s, the busiest, lower still', TUNE_LEVEL <= 0.5 && (PLAYLISTS.dream!.level ?? 1) < 1 && Object.values(PLAYLISTS).every((l) => (l!.level ?? 1) <= 1));

console.log(failures === 0 ? 'tunes: all pass' : `tunes: ${failures} FAIL`);
process.exit(failures ? 1 : 0);
