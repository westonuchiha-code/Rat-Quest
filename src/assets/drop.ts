/**
 * DROP-IN FILES: what the game does with a picture, a sound or a song that was put in `assets/` (assets/README.md).
 *
 * The owner, 2026-11-17: every asset is to be "easily replaceable". Almost every asset here is made by code, so to
 * replace one meant editing that code. Now a FILE dropped into a folder, named for the thing it replaces, takes that
 * thing's place: the packer (scripts/assets/pack.mjs) puts the file inside the game (`dropped.ts`), and the three
 * places that make a texture, a sound effect and a tune ask here first.
 *
 * Nothing is dropped in as the game stands: `DROPPED` is empty, and everything is the game's own.
 */
import { DROPPED } from './dropped';

/** The bytes of a base64 text. */
export function bytesOf(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** A picture dropped in for the texture of this name: its dots (RGBA, bottom row first), or null. */
export function droppedTexture(name: string): { size: number; data: Uint8Array } | null {
  const d = DROPPED.textures[name];
  return d ? { size: d.size, data: bytesOf(d.b64) } : null;
}

/** A recording dropped in for the sound effect of this name: its samples (-1..1, mono, 22050 a second), or null. */
export function droppedSound(name: string): { data: Float32Array; rate: number } | null {
  const d = DROPPED.sounds[name];
  if (!d) return null;
  const b = bytesOf(d.b64);
  const data = new Float32Array(b.length);
  for (let i = 0; i < b.length; i++) data[i] = ((b[i] << 24) >> 24) / 127;
  return { data, rate: 22050 };
}

/** A song as the game plays one: an MP3, where a round begins in it and how long a round is. */
export interface DropTune { name: string; lead: number; length: number; bpm: number; b64: string }

/** The id a dropped song goes by among the game's tunes: its name with an @ before it. */
export const dropId = (name: string): string => `@${name}`;

/** A dropped song by its tune id (`@cistern`), or undefined. */
export function droppedTune(id: string): DropTune | undefined {
  const d = id.startsWith('@') ? DROPPED.music[id.slice(1)] : undefined;
  return d ? { name: d.file, lead: d.lead, length: d.length, bpm: 0, b64: d.b64 } : undefined;
}

/**
 * The song dropped in for this place, if there is one: a file named for the ROOM (its level id) first, else one named
 * for the KIND of music the room asks for. Its tune id, or null.
 */
export function droppedSongFor(kind: string, room?: string): string | null {
  if (room && DROPPED.music[room]?.what === 'room') return dropId(room);
  if (DROPPED.music[kind]?.what === 'kind') return dropId(kind);
  return null;
}

/** A dropped jingle of this name (`wedge`, `defeat`), or undefined. */
export function droppedJingle(id: string): DropTune | undefined {
  const d = DROPPED.music[id];
  return d?.what === 'jingle' ? { name: d.file, lead: 0, length: d.length, bpm: 0, b64: d.b64 } : undefined;
}

/**
 * A VOICE dropped in for a kind of character (assets/voices/turtle/ or turtle.wav): its recording of this syllable
 * (-1..1, mono, 22050 a second), or null. A kind with a voice of its own is not given another's.
 */
export function droppedSyllable(kind: string, syllable: string): { data: Float32Array; rate: number } | null {
  const b64 = DROPPED.voices[kind]?.syllables[syllable];
  if (!b64) return null;
  const b = bytesOf(b64);
  const data = new Float32Array(b.length);
  for (let i = 0; i < b.length; i++) data[i] = ((b[i] << 24) >> 24) / 127;
  return { data, rate: 22050 };
}
/** Whether a kind of character has a voice dropped in. */
export const hasDroppedVoice = (kind: string): boolean => !!DROPPED.voices[kind];
