/**
 * Levels made in the builder. A custom level is a short list of pieces on a grid; `compileCustom` turns it into a real
 * LevelDef (walls around the edge, crates numbered, goals chosen from what is in it). Pure data, so tests can run it.
 */
import { Box, Decor, FireVolume, GateSpec, Kind, LavaVolume, MoverSpec, PipeSpec, WaterVolume, extent } from '../world/layout';
import { seatMovers } from '../world/hangings';
import type { NpcSpec } from '../npc/npc';
import { doorOn } from '../world/rooms';
import { Items } from './builders';
import type { EnemySpec, GoalDef, LevelDef, WedgeDef } from './types';
import type { CollectibleKind } from '../world/collectibles';
import type { NpcKind } from '../npc/npc';
import type { TextureName } from '../render/textures';
import { ThemeId, themeById } from './themes';

export type PieceType =
  | 'floor' | 'tile' | 'grate' | 'platform' | 'plank' | 'stone' | 'wall' | 'pillar'
  | 'water' | 'river' | 'lava' | 'fire' | 'bridge' | 'crate' | 'barrel'
  | 'crumb' | 'cap' | 'relic'
  | 'roach' | 'toad' | 'beetle' | 'bat' | 'guard' | 'mantis' | 'stag' | 'brood' | 'wyrm' | 'npc' | 'pipe' | 'fall' | 'gate'
  | 'plate' | 'lamp' | 'chain' | 'window' | 'slime' | 'web' | 'brazier' | 'speaker' | 'couch' | 'light'
  | 'banner' | 'torch' | 'gauge' | 'crystal' | 'roots'
  | 'stairs' | 'lift' | 'mark' | 'spawn' | 'exit' | 'wedge';
/** The pieces that are enemies (the Broodmother, a boss, among them). */
export const ENEMY_PIECES: PieceType[] = ['roach', 'toad', 'beetle', 'bat', 'guard', 'mantis', 'stag', 'brood', 'wyrm'];

/** What makes a Golden Wedge appear: there from the start, or once that job is done. */
export type WedgeAppears = 'start' | 'defeat' | 'waves' | 'burst' | 'crumb' | 'cap' | 'relic' | 'reach';
export const WEDGE_APPEARS: Array<[WedgeAppears, string]> = [['start', 'there from the start'], ['defeat', 'every enemy beaten'], ['waves', 'every wave beaten'], ['burst', 'every pipe burst'], ['crumb', 'every crumb found'], ['cap', 'every cap found'], ['relic', 'every relic found'], ['reach', 'goal marker reached']];

/** The colours a beacon can be. */
export const LIGHT_COLORS: Record<string, number> = { red: 0xff2a2a, yellow: 0xffd040, blue: 0x3a7aff, green: 0x40ff70, purple: 0xb04aff, white: 0xfff0e0 };
/** Banner cloth: deeper colours than the lights. */
export const BANNER_COLORS: Record<string, number> = { purple: 0x8a3ac0, red: 0xb02a2a, green: 0x3a8a3a, blue: 0x3a5ab8, black: 0x2e2636, gold: 0xc09a2a };
/** Which way a piece on a wall faces, by the wall it is on (the builder's arrow points at the wall). */
const WALL_YAW: Record<'n' | 'e' | 's' | 'w', number> = { n: 0, s: Math.PI, e: -Math.PI / 2, w: Math.PI / 2 };

/** Extra settings a piece can carry. */
export interface PieceProps {
  /** A character's name and what kind of creature he is, and what he says. */
  name?: string;
  kind?: NpcKind;
  /** A beacon's colour name (red, yellow, blue, green, purple, white) and how many times a second it flashes (0 = steady). */
  color?: string;
  flash?: number;
  /** An NPC who starts talking by himself when the rat gets this close (a cutscene). */
  auto?: number;
  /** An NPC that is not in the room until a story scene brings him in. */
  hidden?: boolean;
  lines?: string[];
  /** A crate or barrel can hold one collectible. */
  item?: CollectibleKind;
  /** A crate bound in iron: only a heavy blade breaks it. */
  tough?: boolean;
  /** An enemy that comes back after it is beaten. */
  respawn?: boolean;
  /** A bat: what it hangs from. Rock (a knob of rock, for caves) or chain (hanging from the dark, for halls). */
  perch?: 'rock' | 'chain';
  /** Enemies: 0 or nothing = waiting in the room at the start; 1, 2, 3... = arrives with that wave, after the last is beaten. */
  wave?: number;
  /** A gate: what lifts it. Default: when the goals are done. */
  opens?: 'goals' | 'pipes' | 'plates';
  /** A moving platform: which way it glides ('up' is a lift), how far, how fast and how long it waits at each end. */
  move?: 'up' | 'n' | 'e' | 's' | 'w';
  travel?: number;
  speed?: number;
  pause?: number;
  /** A Golden Wedge: a clue for the quest screen, and what makes it appear. */
  /** A character who keeps a shop. */
  shop?: boolean;
  hint?: string;
  appears?: WedgeAppears;
}

/** What he must do to open the door. With none listed, the level picks goals from what is in it. */
export type CustomGoal =
  | { type: 'collect'; kind: CollectibleKind; count: number | 'all' }
  | { type: 'defeat' }
  | { type: 'burst' }
  /** Beat every wave of enemies. */
  | { type: 'waves' }
  /** Walk to the goal marker. */
  | { type: 'reach' };

/** One thing on the grid. Boxes use x0..x1, z0..z1 and the heights; single things use x0, z0 only. */
export interface Piece {
  t: PieceType;
  x0: number;
  z0: number;
  x1: number;
  z1: number;
  /** Height of the top (floors, platforms, walls) or of the thing's base (crates, enemies, items). */
  top: number;
  /** Height of the bottom, for boxes. Default: 1 under the top for floors, 0 for the rest. */
  bottom?: number;
  /** For 'river': the flow, one of 'n' 's' 'e' 'w'. For 'fall' and 'pipe': the way it faces. */
  dir?: 'n' | 's' | 'e' | 'w';
  props?: PieceProps;
  /** The picture this piece wears, instead of its theme's. */
  skin?: TextureName;
}

export interface CustomLevel {
  name: string;
  /** The room is x -w/2..w/2 and z -d/2..d/2. */
  width: number;
  depth: number;
  wallHeight: number;
  pieces: Piece[];
  blurb?: string;
  music?: 'drift' | 'pump' | 'groove' | 'echo' | 'march';
  goals?: CustomGoal[];
  theme?: ThemeId;
  /** Hang this level on a door of the Club (replacing the placeholder there), and how many wedges open it. */
  hubDoor?: 'west' | 'east';
  hubNeed?: number;
  /** Switch off the ledge grab or the long jump in this level. */
  noGrab?: boolean;
  noLongJump?: boolean;
  /** A fall into the dark costs a heart and puts him back on the last ground he stood on (instead of at the start). */
  fallBack?: boolean;
  /** Where the dark begins and where nothing more can be seen (the level's look decides, left out). */
  fogRange?: [number, number];
}

export const BOX_TYPES: PieceType[] = ['floor', 'tile', 'grate', 'platform', 'plank', 'stone', 'wall', 'pillar'];
const KIND: Partial<Record<PieceType, Kind>> = { floor: 'floor', tile: 'floor', grate: 'stone', platform: 'platform', plank: 'plank', stone: 'stone', wall: 'wall', pillar: 'pillar' };
const FLOW: Record<'n' | 's' | 'e' | 'w', [number, number]> = { n: [0, -1.8], s: [0, 1.8], e: [1.8, 0], w: [-1.8, 0] };

export function emptyCustom(): CustomLevel {
  return {
    name: 'My Level',
    width: 40,
    depth: 40,
    wallHeight: 12,
    pieces: [
      { t: 'floor', x0: -20, z0: -20, x1: 20, z1: 20, top: 0 },
      { t: 'spawn', x0: 0, z0: 14, x1: 0, z1: 14, top: 0 },
      { t: 'exit', x0: 0, z0: -20, x1: 0, z1: -20, top: 0 },
    ],
  };
}

/** Problems a builder should flag before playing. */
export function checkCustom(c: CustomLevel): string[] {
  const out: string[] = [];
  if (!c.pieces.some((p) => p.t === 'spawn')) out.push('Place a start point.');
  if (!c.pieces.some((p) => p.t === 'exit')) out.push('Place an exit door.');
  const spawn = c.pieces.find((p) => p.t === 'spawn');
  if (spawn && !c.pieces.some((p) => BOX_TYPES.includes(p.t) && p.t !== 'wall' && p.t !== 'pillar' && spawn.x0 >= Math.min(p.x0, p.x1) && spawn.x0 <= Math.max(p.x0, p.x1) && spawn.z0 >= Math.min(p.z0, p.z1) && spawn.z0 <= Math.max(p.z0, p.z1))) {
    out.push('The start point is not standing on anything.');
  }
  const count = (t: PieceType): number => c.pieces.filter((p) => p.t === t).length;
  for (const g of c.goals ?? []) {
    if (g.type === 'reach' && count('mark') === 0) out.push('A "reach" goal needs a Goal marker on the map.');
    if (g.type === 'defeat' && !c.pieces.some((p) => ENEMY_PIECES.includes(p.t))) out.push('A "defeat" goal needs an enemy on the map.');
    if (g.type === 'waves' && !c.pieces.some((p) => ENEMY_PIECES.includes(p.t) && (p.props?.wave ?? 0) > 0)) out.push('A "waves" goal needs enemies set to wave 1 or higher.');
    if (g.type === 'burst' && count('pipe') === 0) out.push('A "burst" goal needs a wall pipe on the map.');
    if (g.type === 'collect') {
      const have = count(g.kind);
      if (g.count !== 'all' && g.count > have + c.pieces.filter((p) => p.props?.item === g.kind).length) out.push(`The goal wants more ${g.kind}s than the map has.`);
      if (g.count === 'all' && have === 0 && !c.pieces.some((p) => p.props?.item === g.kind)) out.push(`There are no ${g.kind}s on the map.`);
    }
  }
  for (const g of c.pieces.filter((q) => q.t === 'gate')) {
    if (g.props?.opens === 'pipes' && count('pipe') === 0) out.push('A gate that opens with pipes needs a wall pipe on the map.');
    if (g.props?.opens === 'plates' && count('plate') === 0) out.push('A gate that opens with plates needs a floor plate on the map.');
  }
  return out;
}

const lo = (a: number, b: number): number => Math.min(a, b);
const hi = (a: number, b: number): number => Math.max(a, b);

/** Turns a custom level into a playable one. */
export function compileCustom(c: CustomLevel, id = 'custom'): LevelDef {
  const theme = themeById(c.theme);
  const W = c.width / 2;
  const D = c.depth / 2;
  const solids: Box[] = [
    extent('wall', -W, W, 0, c.wallHeight, -D - 1, -D),
    extent('wall', -W, W, 0, c.wallHeight, D, D + 1),
    extent('wall', W, W + 1, 0, c.wallHeight, -D - 1, D + 1),
    extent('wall', -W - 1, -W, 0, c.wallHeight, -D - 1, D + 1),
  ];
  // The room's own walls wear the theme's wall. (Only the newer themes for now: the older ones have always shown sewer
  // brick here, and the levels made with them were dressed to match.)
  if (theme.id === 'foundry' || theme.id === 'keep') for (let i = 0; i < 4; i++) solids[i] = { ...solids[i], skin: theme.skins.wall };
  const water: WaterVolume[] = [];
  const lava: LavaVolume[] = [];
  const fire: FireVolume[] = [];
  const decor: Decor[] = [];
  const pipes: PipeSpec[] = [];
  const gates: GateSpec[] = [];
  const movers: MoverSpec[] = [];
  const npcs: NpcSpec[] = [];
  const enemies: EnemySpec[] = [];
  const waveSpecs: EnemySpec[][] = [];
  const plates: Array<{ x: number; z: number; y: number }> = [];
  const gatePieces: Array<{ spec: GateSpec; opens: string }> = [];
  const contents: Array<string | null> = [];
  const items = new Items(id);
  let spawn = { x: 0, y: 0, z: 0, facing: Math.PI };
  let exit = doorOn('north', W, 0, D, 0);
  const goals: GoalDef[] = [];
  let markAt: { x: number; y: number; z: number } | null = null;
  const wedgePieces: Piece[] = [];

  const crate = (b: Box): number => {
    solids.push(b);
    contents.push(null);
    return contents.length - 1;
  };

  for (const p of c.pieces) {
    const x0 = lo(p.x0, p.x1);
    const x1 = hi(p.x0, p.x1);
    const z0 = lo(p.z0, p.z1);
    const z1 = hi(p.z0, p.z1);
    const cx = (x0 + x1) / 2;
    const cz = (z0 + z1) / 2;
    const k = KIND[p.t];
    if (k) {
      const bottom = p.bottom ?? (k === 'floor' ? p.top - 1 : k === 'wall' || k === 'pillar' ? 0 : p.top - 0.6);
      const b = extent(k, x0, Math.max(x1, x0 + 0.5), Math.min(bottom, p.top - 0.2), p.top, z0, Math.max(z1, z0 + 0.5));
      // The sewer is the game's own look, which the box kinds already wear; only the others (and tiles and grating) name a picture.
      const themed = theme.id === 'sewer' ? (p.t === 'tile' ? theme.skins.tile : p.t === 'grate' ? theme.skins.grate : undefined) : theme.skins[p.t as keyof typeof theme.skins];
      const skin = p.skin ?? themed;
      solids.push(skin ? { ...b, skin } : b);
      continue;
    }
    switch (p.t) {
      case 'water':
      case 'river': {
        // A river flows its way at 1.8, or at props.speed.
        const base = p.t === 'river' && p.dir ? FLOW[p.dir] : undefined;
        const k = (p.props?.speed ?? 1.8) / 1.8;
        const flow: [number, number] | undefined = base ? [base[0] * k, base[1] * k] : undefined;
        water.push({ x0, x1: Math.max(x1, x0 + 1), z0, z1: Math.max(z1, z0 + 1), y: p.top, ...(flow ? { flow } : {}) });
        // A bed under it, so the rat can climb out.
        solids.push(extent('floor', x0, Math.max(x1, x0 + 1), p.top - 2.4, p.top - 1.35, z0, Math.max(z1, z0 + 1)));
        break;
      }
      case 'lava': {
        lava.push({ x0, x1: Math.max(x1, x0 + 1), z0, z1: Math.max(z1, z0 + 1), y: p.top });
        // A bed under it, so there is always something below.
        solids.push(extent('stone', x0, Math.max(x1, x0 + 1), p.top - 2.4, p.top - 1.35, z0, Math.max(z1, z0 + 1)));
        break;
      }
      case 'fire':
        // A standing fire over its squares, from the floor up: it burns (unless he is fireproof).
        fire.push({ x0, x1: Math.max(x1, x0 + 1), z0, z1: Math.max(z1, z0 + 1), y: p.top });
        break;
      case 'bridge': {
        // Planks with a rope along each side and posts at the ends and every few steps.
        const alongX = x1 - x0 >= z1 - z0;
        const len = alongX ? x1 - x0 : z1 - z0;
        const wide = Math.min(Math.max(1.6, alongX ? z1 - z0 : x1 - x0), 3);
        const bx0 = alongX ? x0 : cx - wide / 2;
        const bx1 = alongX ? x1 : cx + wide / 2;
        const bz0 = alongX ? cz - wide / 2 : z0;
        const bz1 = alongX ? cz + wide / 2 : z1;
        solids.push({ ...extent('plank', bx0, bx1, p.top - 0.3, p.top, bz0, bz1), ...(p.skin ? { skin: p.skin } : {}) });
        for (const side of [-1, 1]) {
          const off = (wide / 2 - 0.05) * side;
          const a: [number, number, number] = alongX ? [bx0, p.top + 0.95, cz + off] : [cx + off, p.top + 0.95, bz0];
          const b: [number, number, number] = alongX ? [bx1, p.top + 0.95, cz + off] : [cx + off, p.top + 0.95, bz1];
          decor.push({ kind: 'pipe', a, b, r: 0.05, color: 0xa08050 });
          const posts = Math.max(2, Math.round(len / 4) + 1);
          for (let k = 0; k < posts; k++) {
            const f = k / (posts - 1);
            const px = alongX ? bx0 + (bx1 - bx0) * f : cx + off;
            const pz = alongX ? cz + off : bz0 + (bz1 - bz0) * f;
            decor.push({ kind: 'post', x: px, z: pz, y: p.top - 0.3, top: p.top + 1.0 });
            solids.push({ ...extent('plank', px - 0.25, px + 0.25, p.top, p.top + 1.0, pz - 0.25, pz + 0.25), hidden: true });
          }
        }
        break;
      }
      case 'web':
        decor.push({ kind: 'web', x: cx, y: p.top, z: cz, yaw: { n: 0, s: Math.PI, e: -Math.PI / 2, w: Math.PI / 2 }[p.dir ?? 'n'], r: 1.6 });
        break;
      case 'banner':
        decor.push({ kind: 'banner', x: cx, z: cz, top: p.top, yaw: WALL_YAW[p.dir ?? 'n'], w: 1.6, h: 3.2, color: BANNER_COLORS[p.props?.color ?? 'purple'] ?? BANNER_COLORS.purple });
        break;
      case 'torch':
        decor.push({ kind: 'torch', x: cx, y: p.top, z: cz, yaw: WALL_YAW[p.dir ?? 'n'] });
        break;
      case 'gauge':
        decor.push({ kind: 'gauge', x: cx, y: p.top, z: cz, yaw: WALL_YAW[p.dir ?? 'n'], r: 0.8 });
        break;
      case 'crystal':
        decor.push({ kind: 'crystal', x: cx, y: p.top, z: cz, size: 1.6, color: LIGHT_COLORS[p.props?.color ?? 'blue'] ?? LIGHT_COLORS.blue });
        solids.push({ ...extent('stone', cx - 0.35, cx + 0.35, p.top, p.top + 1.2, cz - 0.35, cz + 0.35), hidden: true });
        break;
      case 'roots':
        decor.push({ kind: 'roots', x: cx, z: cz, top: c.wallHeight, bottom: p.top });
        break;
      case 'brazier':
        decor.push({ kind: 'brazier', x: cx, y: p.top, z: cz });
        solids.push({ ...extent('stone', cx - 0.4, cx + 0.4, p.top, p.top + 1.1, cz - 0.4, cz + 0.4), hidden: true });
        break;
      case 'light':
        decor.push({ kind: 'light', x: cx, y: p.top, z: cz, color: LIGHT_COLORS[p.props?.color ?? 'red'] ?? 0xff2a2a, flash: p.props?.flash ?? 0 });
        solids.push({ ...extent('stone', cx - 0.17, cx + 0.17, p.top, p.top + 0.75, cz - 0.17, cz + 0.17), hidden: true });
        break;
      case 'speaker':
      case 'couch':
      {
        const yaw = { s: 0, n: Math.PI, e: Math.PI / 2, w: -Math.PI / 2 }[p.dir ?? 's'];
        decor.push({ kind: p.t, x: cx, y: p.top, z: cz, yaw });
        // Solid, matching the model. Parts are laid out facing +z (lx across, lz front-back), then turned.
        const cs = Math.round(Math.cos(yaw));
        const sn = Math.round(Math.sin(yaw));
        const part = (kind: 'plank' | 'stone', lx0: number, lx1: number, y1: number, lz0: number, lz1: number): void => {
          const xs = [lx0 * cs + lz0 * sn, lx1 * cs + lz1 * sn];
          const zs = [-lx0 * sn + lz0 * cs, -lx1 * sn + lz1 * cs];
          solids.push({ ...extent(kind, cx + Math.min(...xs), cx + Math.max(...xs), p.top, p.top + y1, cz + Math.min(...zs), cz + Math.max(...zs)), hidden: true });
        };
        if (p.t === 'speaker') part('stone', -0.85, 0.85, 2.9, -0.6, 0.6);
        else {
          part('plank', -1.3, 1.3, 0.72, -0.225, 0.55); // the seat: stand on it
          part('plank', -1.3, 1.3, 1.45, -0.575, -0.225); // the back
        }
        break;
      }
      case 'crate':
      case 'barrel': {
        const idx = crate(p.t === 'crate' ? { ...extent('rubble', cx - 0.5, cx + 0.5, p.top, p.top + 1, cz - 0.5, cz + 0.5), ...(p.props?.tough ? { tough: true } : {}) } : extent('barrel', cx - 0.5, cx + 0.5, p.top, p.top + 1.1, cz - 0.5, cz + 0.5));
        if (p.props?.item) contents[idx] = items.add(p.props.item, cx, p.top + 0.5, cz, idx);
        break;
      }
      case 'stairs': {
        // The steps climb from the bottom height to the top height, one unit of ground per step, toward the way it faces.
        const dir = p.dir ?? 'n';
        const alongZ = dir === 'n' || dir === 's';
        const len = Math.max(1, Math.round(alongZ ? z1 - z0 : x1 - x0));
        const base = p.bottom ?? 0;
        const rise = (p.top - base) / len;
        for (let k = 0; k < len; k++) {
          const a = k;
          const b = k + 1;
          const top = base + rise * (k + 1);
          if (top <= base + 0.05) continue;
          if (dir === 'n') solids.push(extent('stone', x0, x1, base, top, z1 - b, z1 - a));
          else if (dir === 's') solids.push(extent('stone', x0, x1, base, top, z0 + a, z0 + b));
          else if (dir === 'e') solids.push(extent('stone', x0 + a, x0 + b, base, top, z0, z1));
          else solids.push(extent('stone', x1 - b, x1 - a, base, top, z0, z1));
        }
        break;
      }
      case 'lift': {
        const mv = p.props?.move ?? 'up';
        const dist = Math.max(0.5, p.props?.travel ?? 4);
        const to: [number, number, number] = mv === 'up' ? [0, dist, 0] : mv === 'n' ? [0, 0, -dist] : mv === 's' ? [0, 0, dist] : mv === 'e' ? [dist, 0, 0] : [-dist, 0, 0];
        const themed = theme.id === 'sewer' ? undefined : theme.skins.plank;
        movers.push({ x: cx, z: cz, y: p.top, w: Math.max(1.5, x1 - x0), d: Math.max(1.5, z1 - z0), to, speed: p.props?.speed ?? 2, pause: p.props?.pause ?? 1.5, ...((p.skin ?? themed) ? { skin: p.skin ?? themed } : {}) });
        break;
      }
      case 'lamp':
        decor.push({ kind: 'lamp', x: cx, y: p.top, z: cz });
        break;
      case 'chain':
        decor.push({ kind: 'chain', x: cx, z: cz, top: c.wallHeight, bottom: p.top });
        break;
      case 'window':
        decor.push({ kind: 'window', x: cx, y: p.top, z: cz, yaw: { n: 0, s: Math.PI, e: -Math.PI / 2, w: Math.PI / 2 }[p.dir ?? 'n'] });
        break;
      case 'slime':
        decor.push({ kind: 'slime', x: cx, y: p.top, z: cz, yaw: { n: 0, s: Math.PI, e: -Math.PI / 2, w: Math.PI / 2 }[p.dir ?? 'n'], length: 4 });
        break;
      case 'wedge':
        wedgePieces.push(p);
        break;
      case 'mark':
        markAt = { x: cx, y: p.top, z: cz };
        break;
      case 'crumb':
      case 'cap':
      case 'relic':
        items.add(p.t, cx, p.top + 0.5, cz);
        break;
      case 'roach':
      case 'toad':
      case 'beetle':
      case 'bat':
      case 'guard':
      case 'mantis':
      case 'stag':
      case 'brood':
      case 'wyrm':
        {
          const type = ({ roach: 'scuttler', toad: 'toad', beetle: 'ironback', bat: 'bat', guard: 'guard', mantis: 'mantis', stag: 'stag', brood: 'brood', wyrm: 'wyrm' } as const)[p.t];
          // A boss has the run of the whole room (a little inside its walls); the others keep to a patch round where they stand.
          // (The Wyrm's floor runs right to the walls: it is running its head into one that stuns it.)
          const arena = p.t === 'brood' ? { x0: -c.width / 2 + 2, x1: c.width / 2 - 2, z0: -c.depth / 2 + 2, z1: c.depth / 2 - 2 } : p.t === 'wyrm' ? { x0: -c.width / 2 + 0.1, x1: c.width / 2 - 0.1, z0: -c.depth / 2 + 0.1, z1: c.depth / 2 - 0.1 } : { x0: cx - 7, x1: cx + 7, z0: cz - 7, z1: cz + 7 };
          const spec: EnemySpec = { type, x: cx, z: cz, y: p.top, arena, respawn: p.t === 'brood' || p.t === 'wyrm' ? false : !!p.props?.respawn, ...(p.props?.perch ? { perch: p.props.perch } : {}) };
          // A guard stands at his post facing the way he is set (north by default: towards whoever comes up the room).
          if (p.t === 'guard' || p.t === 'mantis' || p.t === 'stag' || p.t === 'brood' || p.t === 'wyrm') spec.facing = { n: Math.PI, s: 0, e: Math.PI / 2, w: -Math.PI / 2 }[p.dir ?? 's'];
          const w = Math.round(p.props?.wave ?? 0);
          if (w > 0) (waveSpecs[w - 1] ??= []).push(spec);
          else enemies.push(spec);
        }
        break;
      case 'npc':
        {
          const kind = p.props?.kind ?? 'mouse';
          // A list left out gets a stock line; a list given as empty means he says nothing (the story speaks for him).
          const lines = (p.props?.lines ?? []).filter((l) => l.trim());
          npcs.push({
            x: cx, z: cz, y: p.top, facing: Math.PI, kind, auto: p.props?.auto, hidden: p.props?.hidden, shop: p.props?.shop,
            name: (p.props?.name || (kind === 'bird' ? 'FINCH' : kind === 'villain' ? 'LORD GRIMSQUEAK' : kind === 'pigeon' ? 'DIZZY DAVE' : 'PIP')).toUpperCase(),
            lines: lines.length || p.props?.lines?.length === 0 ? lines : kind === 'villain' ? ['Heh heh heh... a rat in my kingdom?'] : kind === 'pigeon' ? ['Coo coo, daddy-o! Wanna groove with the Dave?'] : kind === 'bird' ? ['Chirp! You built this place yourself? Nice work, knight.'] : ['Squeak! You made this place yourself? Nice work, knight.', 'Smash the pipes, beat the beasts, and find the door!'],
          });
        }
        break;
      case 'pipe': {
        const dir = p.dir ?? 'n';
        pipes.push({ x: cx, z: cz, y: p.top, top: p.top + 8, yaw: { n: 0, s: Math.PI, e: -Math.PI / 2, w: Math.PI / 2 }[dir] });
        break;
      }
      case 'fall': {
        const dir = p.dir ?? 'n';
        decor.push({ kind: 'fall', x: cx, y: p.top + 2.5, z: cz, yaw: { n: 0, s: Math.PI, e: -Math.PI / 2, w: Math.PI / 2 }[dir], width: 2.6, bottom: p.top - 0.85 });
        break;
      }
      case 'gate': {
        const spec: GateSpec = { x: cx, z: cz, y: p.top, width: Math.max(2, x1 - x0, z1 - z0), height: 3.5, alongZ: z1 - z0 > x1 - x0 };
        gates.push(spec);
        gatePieces.push({ spec, opens: p.props?.opens ?? 'goals' });
        break;
      }
      case 'plate':
        plates.push({ x: cx, z: cz, y: p.top });
        break;
      case 'spawn':
        spawn = { x: cx, y: p.top, z: cz, facing: Math.PI };
        break;
      case 'exit': {
        // The door goes on the nearest wall of the room.
        const dN = cz + D;
        const dS = D - cz;
        const dE = W - cx;
        const dW = cx + W;
        const m = Math.min(dN, dS, dE, dW);
        exit = m === dN ? doorOn('north', W, cx, D, p.top) : m === dS ? doorOn('south', W, cx, D, p.top) : m === dE ? doorOn('east', W, cz, D, p.top) : doorOn('west', W, cz, D, p.top);
        break;
      }
    }
  }

  for (const g of gatePieces) {
    if (g.opens === 'pipes') g.spec.pipes = pipes.map((_, i) => i);
    else if (g.opens === 'plates') g.spec.plates = plates.map((_, i) => i);
    else g.spec.onGoals = true;
  }
  // Goals: the ones the builder chose, or else what is in the level: beasts to beat, pipes to burst, else just reach the door.
  const kindOne: Record<CollectibleKind, string> = { crumb: 'cheese crumb', cap: 'bottle cap', relic: 'golden relic' };
  const kindName: Record<CollectibleKind, string> = { crumb: 'cheese crumbs', cap: 'bottle caps', relic: 'golden relics' };
  for (const g of c.goals ?? []) {
    if (g.type === 'collect') goals.push({ type: 'collect', kind: g.kind, count: g.count, label: g.count === 'all' ? `Collect every ${kindOne[g.kind]}` : `Collect ${g.count} ${kindName[g.kind]}` });
    else if (g.type === 'defeat') goals.push({ type: 'defeat', label: 'Defeat every enemy' });
    else if (g.type === 'waves') goals.push({ type: 'waves', label: 'Survive every wave' });
    else if (g.type === 'burst') goals.push({ type: 'burst', count: 'all', label: `Burst ${pipes.length === 1 ? 'the pipe' : `the ${pipes.length} pipes`}` });
    else if (markAt) goals.push({ type: 'reach', x: markAt.x, y: markAt.y, z: markAt.z, radius: 1.8, label: 'Reach the goal' });
  }
  const chosen = (c.goals ?? []).length > 0;
  if (!chosen && waveSpecs.length) goals.push({ type: 'waves', label: 'Survive every wave' });
  if (!chosen && pipes.length) goals.push({ type: 'burst', count: 'all', label: `Burst ${pipes.length === 1 ? 'the pipe' : `the ${pipes.length} pipes`}` });
  if (!chosen && enemies.length) goals.push({ type: 'defeat', label: 'Defeat every enemy' });
  if (!goals.length) goals.push({ type: 'reach', x: exit.x + Math.sin(exit.yaw) * 2.2, y: exit.y ?? 0, z: exit.z + Math.cos(exit.yaw) * 2.2, radius: 1.8, label: 'Reach the door' });

  // An open course: Golden Wedges replace the goals. Each one asks for its own job; the first one taken opens the door.
  let wedges: WedgeDef[] | undefined;
  if (wedgePieces.length) {
    const label: Record<WedgeAppears, string> = { start: '', defeat: 'Defeat every enemy', waves: 'Survive every wave', burst: 'Burst every pipe', crumb: 'Collect every cheese crumb', cap: 'Collect every bottle cap', relic: 'Collect every golden relic', reach: 'Reach the goal' };
    wedges = wedgePieces.map((p, i) => {
      const a = p.props?.appears ?? 'start';
      let appears: GoalDef | null = null;
      if (a === 'defeat' || a === 'waves') appears = { type: a, label: label[a] };
      else if (a === 'burst') appears = { type: 'burst', count: 'all', label: label[a] };
      else if (a === 'crumb' || a === 'cap' || a === 'relic') appears = { type: 'collect', kind: a, count: 'all', label: label[a] };
      else if (a === 'reach' && markAt) appears = { type: 'reach', x: markAt.x, y: markAt.y, z: markAt.z, radius: 1.8, label: label[a] };
      const name = (p.props?.name ?? '').trim() || `Golden Wedge ${i + 1}`;
      return { id: `w${i + 1}`, name, hint: (p.props?.hint ?? '').trim() || (appears ? `${label[a]}, and it appears.` : 'Find it and take it.'), x: p.x0, y: p.top, z: p.z0, appears };
    });
    goals.length = 0;
    for (const w of wedges) goals.push(w.appears ?? { type: 'reach', x: w.x, y: w.y, z: w.z, radius: 1.5, label: w.name });
  }

  // Where water or lava runs up to the edge of the room, the outer walls go down past its bed.
  // (They used to stop at floor height, which left a gap along the surface that he could swim out through.)
  const lowest = Math.min(0, ...water.map((w) => w.y - 2.4), ...lava.map((l) => l.y - 2.4));
  for (let i = 0; i < 4; i++) solids[i] = { ...solids[i], y0: lowest };

  return {
    id,
    name: c.name || 'My Level',
    blurb: c.blurb || 'A level you built.',
    music: c.music,
    fog: theme.fog,
    theme: theme.id,
    solids,
    pit: null,
    water,
    lava,
    decor,
    pipes,
    gates,
    // Platforms put with their bodies in the floor are seated on it (see world/hangings.ts).
    movers: seatMovers(movers, solids),
    npcs,
    spawn,
    collectibles: items.list,
    crateContents: contents,
    enemies,
    waves: waveSpecs.filter((w) => w && w.length > 0),
    plates,
    gear: [],
    goals,
    exit,
    ...(wedges ? { wedges } : {}),
    ...(c.noGrab ? { noGrab: true } : {}),
    ...(c.noLongJump ? { noLongJump: true } : {}),
    ...(fire.length ? { fire } : {}),
    ...(c.fallBack ? { fallBack: true } : {}),
    ...(c.fogRange ? { fogRange: c.fogRange } : {}),
  };
}

const KEY = 'ratquest.custom.v1';
export function loadCustom(storage: { getItem(k: string): string | null }): CustomLevel | null {
  try {
    const raw = storage.getItem(KEY);
    return raw ? parseCustom(raw) : null;
  } catch {
    return null;
  }
}
export function saveCustom(storage: { setItem(k: string, v: string): void }, c: CustomLevel): void {
  try {
    storage.setItem(KEY, JSON.stringify(c));
  } catch {
    // storage unavailable: the level stays in memory only
  }
}
/** Reads a level from text, or returns null if it is not one. */
export function parseCustom(text: string): CustomLevel | null {
  try {
    const d = JSON.parse(text) as Partial<CustomLevel>;
    if (!d || !Array.isArray(d.pieces) || typeof d.width !== 'number' || typeof d.depth !== 'number') return null;
    const ok = d.pieces.every((p) => p && typeof p.t === 'string' && [p.x0, p.z0, p.x1, p.z1, p.top].every((n) => typeof n === 'number' && Number.isFinite(n)));
    if (!ok) return null;
    return { name: String(d.name ?? 'My Level'), width: Math.min(120, Math.max(10, d.width)), depth: Math.min(120, Math.max(10, d.depth)), wallHeight: Number(d.wallHeight) || 12, pieces: d.pieces as Piece[], ...(typeof d.blurb === 'string' ? { blurb: d.blurb } : {}), ...(d.music === 'drift' || d.music === 'pump' || d.music === 'groove' || d.music === 'echo' || d.music === 'march' ? { music: d.music } : {}), ...(Array.isArray(d.goals) ? { goals: d.goals } : {}), ...(typeof d.theme === 'string' ? { theme: themeById(d.theme).id } : {}), ...(d.hubDoor === 'west' || d.hubDoor === 'east' ? { hubDoor: d.hubDoor } : {}), ...(typeof d.hubNeed === 'number' ? { hubNeed: Math.max(0, Math.round(d.hubNeed)) } : {}), ...(d.noGrab === true ? { noGrab: true } : {}), ...(d.noLongJump === true ? { noLongJump: true } : {}), ...(d.fallBack === true ? { fallBack: true } : {}), ...(Array.isArray(d.fogRange) && d.fogRange.length === 2 && d.fogRange.every((n) => typeof n === 'number' && Number.isFinite(n)) ? { fogRange: [Math.max(0, d.fogRange[0]), Math.max(d.fogRange[0] + 1, d.fogRange[1])] as [number, number] } : {}) };
  } catch {
    return null;
  }
}
