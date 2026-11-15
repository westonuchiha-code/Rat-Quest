/**
 * Plays the sounds from synth.ts and the tracks from music.ts through the browser's audio.
 * The chain is deliberately simple, like a console's sound chip: a limited pool of voices, one shared reverb, a master volume.
 * Browsers only allow sound after the player has pressed something, so `unlock()` is called from the first press.
 */
import { INSTRUMENT_BASE_HZ, InstrumentName, Sample, SfxName, instrument, midiHz, sfx } from './synth';
import { CALM, Mood, Scheduled, TrackName, layerGain, notesBetween, stepSeconds, trackNamed, waterCutoff } from './music';
import { VoicePool } from './voices';

const KEY = 'ratquest.audio.v1';

interface StorageLike {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
}

/** Sounds heard over and over get a slightly different pitch each time, so they never sound stamped out. Value: how far, as a fraction. */
export const VARY: Partial<Record<SfxName, number>> = {
  hit: 0.07, kill: 0.04, swing: 0.08, dodge: 0.06, hurt: 0.04, block: 0.05, crate: 0.09, barrel: 0.08, plank: 0.2, pipe: 0.05,
  cap: 0.03, splash: 0.08, splat: 0.1, spit: 0.08, croak: 0.1, lunge: 0.08, shock: 0.04, softStep: 0.12, cloth: 0.1, whoosh: 0.08,
  chitinTap: 0.15, plateKnock: 0.1, broodHurt: 0.08, wyrmSnap: 0.05, spikeHit: 0.05, hornetHurt: 0.08, antClick: 0.1, antSnap: 0.05, antHurt: 0.08, ironBonk: 0.05, batDie: 0.08, boltBurst: 0.06,
};
/** A run of crumbs climbs a scale, one step per crumb, and starts again after a pause. */
export const CRUMB_STREAK = { window: 1400, steps: [0, 2, 4, 5, 7, 9, 11, 12] };

/**
 * The speed to play a sound at when the caller did not say: a small random change for the everyday sounds,
 * and a rising note for crumbs collected one after another. `rand` is 0..1.
 */
export function playRate(name: SfxName, nowMs: number, streak: { n: number; at: number }, rand: number = Math.random()): number {
  if (name === 'crumb') {
    streak.n = nowMs - streak.at < CRUMB_STREAK.window ? Math.min(streak.n + 1, CRUMB_STREAK.steps.length - 1) : 0;
    streak.at = nowMs;
    return 2 ** (CRUMB_STREAK.steps[streak.n] / 12);
  }
  const v = VARY[name];
  return v ? 1 + (rand * 2 - 1) * v : 1;
}

export interface PlayOptions {
  /** 0..1 */
  vol?: number;
  /** Playback speed: 1 normal, 2 an octave up. */
  rate?: number;
  /** How much goes to the reverb, 0..1. */
  verb?: number;
  /** When all voices are busy, higher priority sounds win. Default 5. */
  priority?: number;
  /** A single-voice channel (a talking character): a new sound here fades the one before it out quickly, so syllables never pile up. */
  slot?: string;
}

interface MusicRun {
  name: TrackName;
  bus: GainNode;
  /** One volume per lane, so the drums can come and go with the fight. */
  lanes: GainNode[];
  /** Muffles the whole track under water. */
  filter: BiquadFilterNode;
  start: number;
  nextStep: number;
  timer: number;
}

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private sfxBus!: GainNode;
  private musicBus!: GainNode;
  private verb!: ConvolverNode;
  private verbIn!: GainNode;
  private readonly buffers = new Map<string, AudioBuffer>();
  private readonly pool = new VoicePool(24);
  private readonly active = new Map<number, { src: AudioBufferSourceNode; gain: GainNode }>();
  private readonly loops = new Map<string, { src: AudioBufferSourceNode; gain: GainNode }>();
  private music: MusicRun | null = null;
  private readonly slots = new Map<string, number>();
  private wantedTrack: TrackName | null = null;
  private duckLevel = 1;
  private sfxVol = 0.8;
  private musicVol = 0.6;
  /** Counters for the #debug readout. */
  stats = { played: 0, notes: 0, refused: 0 };
  /** Set by #nosound, and by tests. */
  disabled = false;

  constructor(private readonly storage: StorageLike | null) {
    try {
      const raw = storage?.getItem(KEY);
      if (raw) {
        const d = JSON.parse(raw) as { sfx?: number; music?: number };
        if (typeof d.sfx === 'number') this.sfxVol = Math.min(1, Math.max(0, d.sfx));
        if (typeof d.music === 'number') this.musicVol = Math.min(1, Math.max(0, d.music));
      }
    } catch {
      // keep the defaults
    }
  }

  get ready(): boolean {
    return !!this.ctx && this.ctx.state === 'running';
  }

  sfxVolume(): number {
    return this.sfxVol;
  }
  musicVolume(): number {
    return this.musicVol;
  }
  setSfxVolume(v: number): void {
    this.sfxVol = Math.min(1, Math.max(0, v));
    if (this.sfxBus) this.sfxBus.gain.value = this.sfxVol;
    this.persist();
  }
  setMusicVolume(v: number): void {
    this.musicVol = Math.min(1, Math.max(0, v));
    this.applyMusicVolume();
    this.persist();
  }
  private persist(): void {
    try {
      this.storage?.setItem(KEY, JSON.stringify({ sfx: this.sfxVol, music: this.musicVol }));
    } catch {
      // volumes just are not remembered
    }
  }
  private applyMusicVolume(): void {
    if (this.musicBus && this.ctx) this.musicBus.gain.setTargetAtTime(this.musicVol * 0.7 * this.duckLevel, this.ctx.currentTime, 0.15);
  }

  /** Turns the music down while a menu or a conversation is open (1 = full). */
  duck(level: number): void {
    this.duckLevel = level;
    this.applyMusicVolume();
  }

  /** True once a press has started the sound. */
  get started(): boolean {
    return this.disabled || !!this.ctx;
  }

  /** Starts the audio. Safe to call from every press: it only does anything the first time, and resumes if it was suspended. */
  unlock(): void {
    if (this.disabled) return;
    if (!this.ctx) {
      const C = (globalThis as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext ?? (globalThis as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!C) {
        this.disabled = true;
        return;
      }
      try {
        this.ctx = new C();
      } catch {
        this.disabled = true;
        return;
      }
      const ctx = this.ctx;
      try {
      this.master = ctx.createGain();
      this.master.gain.value = 0.9;
      // A gentle limiter so a pile of sounds cannot clip.
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -10;
      comp.ratio.value = 6;
      this.master.connect(comp).connect(ctx.destination);
      this.sfxBus = ctx.createGain();
      this.sfxBus.gain.value = this.sfxVol;
      this.sfxBus.connect(this.master);
      this.musicBus = ctx.createGain();
      this.musicBus.gain.value = this.musicVol * 0.7 * this.duckLevel;
      this.musicBus.connect(this.master);
      // One shared reverb, like the console's: a short burst of decaying, grainy noise.
      this.verb = ctx.createConvolver();
      this.verb.buffer = this.makeImpulse(ctx, 1.3);
      this.verbIn = ctx.createGain();
      this.verbIn.gain.value = 0.5;
      this.verbIn.connect(this.verb);
      this.verb.connect(this.master);
      } catch {
        // If the sound set-up fails for any reason, the game carries on silently.
        this.disabled = true;
        return;
      }
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    if (this.wantedTrack && !this.music) this.startMusic(this.wantedTrack);
  }

  private makeImpulse(ctx: AudioContext, seconds: number): AudioBuffer {
    // The buffer must run at the same rate as the context, or the browser refuses it.
    const rate = ctx.sampleRate;
    const n = Math.floor(seconds * rate);
    const buf = ctx.createBuffer(1, n, rate);
    const d = buf.getChannelData(0);
    let seed = 12345;
    let low = 0;
    for (let i = 0; i < n; i++) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      const noise = seed / 4294967296 * 2 - 1;
      low += (noise - low) * 0.12;
      d[i] = Math.round(low * 24) / 24 * (1 - i / n) ** 2.5;
    }
    return buf;
  }

  private bufferFor(key: string, s: Sample): AudioBuffer | null {
    if (!this.ctx) return null;
    let b = this.buffers.get(key);
    if (!b) {
      b = this.ctx.createBuffer(1, s.data.length, s.rate);
      b.copyToChannel(s.data as Float32Array<ArrayBuffer>, 0);
      this.buffers.set(key, b);
    }
    return b;
  }

  /** Plays a sound once. */
  /** The last few sounds asked for, newest last (for the debug readout: "which sound was that?"). */
  readonly recent: SfxName[] = [];

  play(name: SfxName, o: PlayOptions = {}): void {
    this.recent.push(name);
    if (this.recent.length > 6) this.recent.shift();
    let opts = o;
    if (o.rate === undefined) {
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      const rate = playRate(name, now, this.streak);
      if (rate !== 1) opts = { ...o, rate };
    }
    this.playSample(name, sfx(name), opts);
  }

  /** Crumbs picked up in quick succession: how many so far, and when the last one was. */
  private readonly streak = { n: 0, at: -1e9 };

  /** Plays any sample once (a voice syllable, say). `key` names it so its buffer is made only once. */
  playSample(key: string, s: Sample, o: PlayOptions = {}): void {
    if (this.disabled || !this.ctx || this.ctx.state !== 'running' || this.sfxVol <= 0) return;
    const ctx = this.ctx;
    const buf = this.bufferFor(key, s);
    if (!buf) return;
    const rate = o.rate ?? 1;
    const dur = s.data.length / s.rate / rate;
    const v = this.pool.take(ctx.currentTime, dur, o.priority ?? 5);
    if (v.id === 0) {
      this.stats.refused++;
      return;
    }
    if (v.cut !== null) this.cut(v.cut);
    if (o.slot) {
      const prev = this.slots.get(o.slot);
      if (prev !== undefined && prev !== v.id) this.cut(prev);
      this.slots.set(o.slot, v.id);
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = rate;
    const g = ctx.createGain();
    g.gain.value = Math.max(0, Math.min(1, o.vol ?? 1));
    src.connect(g).connect(this.sfxBus);
    const send = o.verb ?? 0.12;
    if (send > 0) {
      const sg = ctx.createGain();
      sg.gain.value = send;
      g.connect(sg).connect(this.verbIn);
    }
    this.active.set(v.id, { src, gain: g });
    src.onended = () => {
      this.active.delete(v.id);
      this.pool.release(v.id);
    };
    src.start();
    this.stats.played++;
  }

  private cut(id: number): void {
    const a = this.active.get(id);
    if (!a || !this.ctx) return;
    a.gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.01);
    try {
      a.src.stop(this.ctx.currentTime + 0.05);
    } catch {
      // already stopped
    }
    this.active.delete(id);
  }

  /** Keeps a looping sound (water, a gushing pipe) going at the volume given. Call every frame; 0 fades it out. */
  loop(name: SfxName, vol: number): void {
    if (this.disabled || !this.ctx || this.ctx.state !== 'running') return;
    const ctx = this.ctx;
    let l = this.loops.get(name);
    if (!l) {
      if (vol <= 0.01) return;
      const s = sfx(name);
      const buf = this.bufferFor(name, s);
      if (!buf) return;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const g = ctx.createGain();
      g.gain.value = 0;
      src.connect(g).connect(this.sfxBus);
      const sg = ctx.createGain();
      sg.gain.value = 0.25;
      g.connect(sg).connect(this.verbIn);
      src.start();
      l = { src, gain: g };
      this.loops.set(name, l);
    }
    l.gain.gain.setTargetAtTime(Math.max(0, Math.min(1, vol)), ctx.currentTime, 0.2);
  }

  /** Stops every loop (for a level change). */
  stopLoops(): void {
    if (!this.ctx) return;
    for (const l of this.loops.values()) {
      l.gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
      try {
        l.src.stop(this.ctx.currentTime + 0.5);
      } catch {
        // already stopped
      }
    }
    this.loops.clear();
  }

  // ---- Music ----

  /** Switches to a track (fading), or to silence with null. */
  playTrack(name: TrackName | null): void {
    this.wantedTrack = name;
    if (this.disabled || !this.ctx || this.ctx.state !== 'running') return;
    if (this.music?.name === name) return;
    this.stopMusic();
    if (name) this.startMusic(name);
  }

  private mood: Mood = { ...CALM };

  /** What is happening in the game, so the music can follow it: drums come in for a fight, the sound goes dull under water. */
  setMood(m: Mood): void {
    const next = { combat: Math.max(0, Math.min(1, m.combat)), water: Math.max(0, Math.min(1, m.water)) };
    if (Math.abs(next.combat - this.mood.combat) < 0.02 && Math.abs(next.water - this.mood.water) < 0.02 && next.combat !== 0 === (this.mood.combat !== 0)) return;
    this.mood = next;
    if (this.music) this.applyMood(this.music, false);
  }

  private applyMood(run: MusicRun, instant: boolean): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    const rate = instant ? 0.001 : 0.5;
    trackNamed(run.name).lanes.forEach((lane, i) => run.lanes[i].gain.setTargetAtTime(layerGain(lane, this.mood), t, rate));
    run.filter.frequency.setTargetAtTime(waterCutoff(this.mood), t, instant ? 0.001 : 0.25);
  }

  private stopMusic(): void {
    const m = this.music;
    if (!m || !this.ctx) return;
    window.clearInterval(m.timer);
    m.bus.gain.setTargetAtTime(0, this.ctx.currentTime, 0.4);
    const bus = m.bus;
    window.setTimeout(() => bus.disconnect(), 2500);
    this.music = null;
  }

  private startMusic(name: TrackName): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const bus = ctx.createGain();
    bus.gain.value = 0;
    bus.gain.setTargetAtTime(1, ctx.currentTime, 0.8);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 0.7;
    filter.connect(bus);
    bus.connect(this.musicBus);
    const lanes = trackNamed(name).lanes.map(() => {
      const g = ctx.createGain();
      g.connect(filter);
      return g;
    });
    const run: MusicRun = { name, bus, lanes, filter, start: ctx.currentTime + 0.15, nextStep: 0, timer: 0 };
    this.applyMood(run, true);
    this.music = run;
    const tick = (): void => this.pumpMusic(run);
    run.timer = window.setInterval(tick, 100);
    tick();
  }

  /** Schedules the notes that fall in the next third of a second. */
  private pumpMusic(run: MusicRun): void {
    const ctx = this.ctx;
    if (!ctx || this.music !== run) return;
    const track = trackNamed(run.name);
    const sd = stepSeconds(track);
    const horizon = (ctx.currentTime + 0.35 - run.start) / sd;
    if (horizon <= run.nextStep) return;
    for (const ev of notesBetween(track, run.nextStep, horizon)) this.playNote(run, ev, sd);
    run.nextStep = Math.ceil(horizon);
  }

  private playNote(run: MusicRun, ev: Scheduled, stepDur: number): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const track = trackNamed(run.name);
    const lane = track.lanes[ev.lane];
    const at = run.start + ev.absStep * stepDur;
    if (at < ctx.currentTime - 0.05) return;
    const s = instrument(lane.inst as InstrumentName);
    const buf = this.bufferFor(`inst:${lane.inst}`, s);
    if (!buf) return;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = s.loop;
    if (s.loop) src.playbackRate.value = midiHz(ev.note.midi) / INSTRUMENT_BASE_HZ;
    const g = ctx.createGain();
    const peak = lane.gain * ev.note.vel;
    const hold = Math.max(0.03, ev.note.len * stepDur);
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(peak, at + Math.max(0.004, lane.attack));
    g.gain.setValueAtTime(peak, at + Math.max(lane.attack, hold));
    g.gain.linearRampToValueAtTime(0, at + Math.max(lane.attack, hold) + Math.max(0.03, lane.release));
    src.connect(g).connect(run.lanes[ev.lane]);
    if (lane.verb > 0) {
      const sg = ctx.createGain();
      sg.gain.value = lane.verb;
      g.connect(sg).connect(this.verbIn);
    }
    src.start(at);
    src.stop(at + Math.max(lane.attack, hold) + Math.max(0.03, lane.release) + 0.05);
    this.stats.notes++;
  }
}

/** Distance to a volume (0 near, 1 far) for fading a sound with how far away it is. */
export function nearness(dist: number, range: number): number {
  return Math.max(0, Math.min(1, 1 - dist / range));
}

