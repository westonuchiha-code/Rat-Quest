/**
 * Made by scripts/assets/pack.mjs from the files in assets/ (see assets/README.md). Do not edit by hand: put a file in
 * assets/, or take one out, and run `npm run assets`.
 */
export interface DroppedTexture { file: string; hash: string; /** Dots a side. */ size: number; /** RGBA, bottom row first, in base64. */ b64: string }
export interface DroppedSound { file: string; hash: string; seconds: number; /** Mono, 22050 a second, 8 bit signed, in base64. */ b64: string }
export interface DroppedMusic { file: string; hash: string; /** What its name is: a room's id, a kind of music, or a jingle. */ what: 'room' | 'kind' | 'jingle'; lead: number; length: number; /** MP3, in base64. */ b64: string }
export interface DroppedVoice { file: string; hash: string; /** Each syllable it has: mono, 22050 a second, 8 bit signed, in base64. */ syllables: Record<string, string> }
export interface DroppedFont { file: string; hash: string; /** As @font-face's format() names it, and its type. */ format: string; mime: string; /** The file, in base64. */ b64: string }
export const DROPPED: { textures: Record<string, DroppedTexture>; sounds: Record<string, DroppedSound>; music: Record<string, DroppedMusic>; fonts: Record<string, DroppedFont>; voices: Record<string, DroppedVoice> } = {
  textures: {

  },
  sounds: {

  },
  music: {

  },
  fonts: {

  },
  voices: {

  },
};
