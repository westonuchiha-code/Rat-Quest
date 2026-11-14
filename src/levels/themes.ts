/**
 * Looks for whole levels. A theme says which picture each kind of piece wears (unless the piece picks its own) and the
 * colour of the fog, which is also the colour of the far dark.
 */
import type { TextureName } from '../render/textures';

export type ThemeId = 'sewer' | 'mine' | 'cave' | 'dungeon' | 'foundry' | 'keep';

/** The roles the builder's boxes can play. */
export type Role = 'floor' | 'tile' | 'grate' | 'platform' | 'plank' | 'stone' | 'wall' | 'pillar';

export interface Theme {
  id: ThemeId;
  label: string;
  fog: number;
  skins: Record<Role, TextureName>;
}

export const THEMES: Theme[] = [
  {
    id: 'sewer', label: 'Sewer (green, wet brick)', fog: 0x0b1410,
    skins: { floor: 'wetCobbles', tile: 'ceramicTiles', grate: 'drainGrate', platform: 'mossStone', plank: 'planks', stone: 'concreteSlab', wall: 'sewerBrick', pillar: 'concreteSlab' },
  },
  {
    id: 'mine', label: 'Mine (earth and timber)', fog: 0x1c140c,
    skins: { floor: 'dirt', tile: 'gravelRail', grate: 'ironBars', platform: 'dirtRoots', plank: 'planks', stone: 'rubbleWall', wall: 'mineBrick', pillar: 'beamSide' },
  },
  {
    id: 'cave', label: 'Cave (rock and moss)', fog: 0x0e1420,
    skins: { floor: 'mudFloor', tile: 'sandstone', grate: 'drainGrate', platform: 'mossRock', plank: 'planks', stone: 'wetRock', wall: 'roughRock', pillar: 'stalagmite' },
  },
  {
    id: 'dungeon', label: 'Dungeon (grey stone)', fog: 0x15151c,
    skins: { floor: 'floor', tile: 'ceramicTiles', grate: 'ironBars', platform: 'stone', plank: 'planks', stone: 'stone', wall: 'brick', pillar: 'stone' },
  },
  {
    id: 'foundry', label: 'Foundry (iron, soot and magma)', fog: 0x1e0d07,
    skins: { floor: 'rustPlate', tile: 'concreteSlab', grate: 'ironBars', platform: 'rustPlate', plank: 'planks', stone: 'magmaRock', wall: 'mineBrick', pillar: 'rustPlate' },
  },
  {
    id: 'keep', label: 'Keep (castle stone and royal carpet)', fog: 0x130c1a,
    skins: { floor: 'stone', tile: 'royalCarpet', grate: 'ironBars', platform: 'keepStone', plank: 'planks', stone: 'keepStone', wall: 'keepStone', pillar: 'keepStone' },
  },
];

export const themeById = (id: string | undefined): Theme => THEMES.find((t) => t.id === id) ?? THEMES[0];
