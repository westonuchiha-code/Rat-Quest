/**
 * Everything he can wear or carry: a helmet, a sword, a shield and a scarf.
 * The starting things do nothing special. Everything else gives something and costs something (none of it is simply
 * better), so choosing what to wear is choosing how to play: `perk` and `cost` say it in words, `fx` does it.
 */
export type Slot = 'helmet' | 'sword' | 'shield' | 'scarf';

/** What wearing something does. Multipliers default to 1, `hearts` to 0. They multiply together across what he wears. */
export interface GearFx {
  /** Running speed. */
  run?: number;
  /** Swimming speed. */
  swim?: number;
  /** How quickly he stops on the ground when he lets go (lower = slides further). */
  grip?: number;
  /** Wall kick height. */
  wallKick?: number;
  /** Long jump speed. */
  longJump?: number;
  /** Hearts added (or taken away). */
  hearts?: number;
  /** Lava and falls into the dark still throw him back, but cost no heart. */
  fireproof?: boolean;
  /** How far beasts notice him from. */
  notice?: number;
  /** How far he can see in the dark (the fog's distance). */
  sight?: number;
  /** Sword damage. */
  damage?: number;
  /** How fast the sword swings (lower = slower). */
  swing?: number;
  /** The parry window. */
  parry?: number;
  /** Speed with the shield up. */
  guardMove?: number;
  /** How wide the shield's block is. */
  blockArc?: number;
  /** How far the sword reaches (a broken one: not far). */
  reach?: number;
  /** NO SHIELD on his arm: he cannot guard, nor ride on it. */
  noGuard?: boolean;
}

export type GearMods = Required<GearFx>;
export const NO_GEAR: GearMods = { run: 1, swim: 1, grip: 1, wallKick: 1, longJump: 1, hearts: 0, fireproof: false, notice: 1, sight: 1, damage: 1, swing: 1, parry: 1, guardMove: 1, blockArc: 1, reach: 1, noGuard: false };

/** What a set of worn things adds up to. */
export function gearMods(ids: readonly string[]): GearMods {
  const m: GearMods = { ...NO_GEAR };
  for (const id of ids) {
    const fx = ITEMS[id]?.fx;
    if (!fx) continue;
    for (const [k, v] of Object.entries(fx) as Array<[keyof GearFx, number | boolean]>) {
      if (k === 'hearts') m.hearts += v as number;
      else if (k === 'fireproof') m.fireproof = m.fireproof || (v as boolean);
      else if (k === 'noGuard') m.noGuard = m.noGuard || (v as boolean);
      else (m[k] as number) *= v as number;
    }
  }
  return m;
}

export interface ItemDef {
  id: string;
  slot: Slot;
  name: string;
  description: string;
  /** Part colours. Helmet: dome, rim (also the nose guard) and spike. Scarf: cloth and trim. Sword: blade, hilt. Shield: face, trim. */
  colors: Record<string, number>;
  /** What it does for him, and what it costs him, in words (shown in the menu and the shop). */
  perk?: string;
  cost?: string;
  fx?: GearFx;
}

export const ITEMS: Record<string, ItemDef> = {
  tinHelm: {
    id: 'tinHelm', slot: 'helmet', name: 'Tin Helm', description: 'A dented soup-can helmet. Better than nothing.',
    colors: { dome: 0xa9b3bc, rim: 0x77818b, spike: 0xd4aa3c },
  },
  emberHelm: {
    id: 'emberHelm', slot: 'helmet', name: 'Ember Helm', description: 'Forged in the Foundry and still warm to the touch.',
    colors: { dome: 0xc4472f, rim: 0x6b2218, spike: 0xf4d35e },
    perk: 'Lava and falls into the dark throw you back but cost no heart.', cost: 'It hisses in water: you swim slowly.',
    fx: { fireproof: true, swim: 0.6 },
  },
  minerHelm: {
    id: 'minerHelm', slot: 'helmet', name: "Miner's Helm", description: 'A yellow hard hat with a lamp on the front. Someone down here used to dig.',
    colors: { dome: 0xe0b52a, rim: 0x4a3a1c, spike: 0xfff4c0 },
    perk: 'The lamp lets you see much further in dark places.', cost: 'Beasts see the lamp too: they notice you from further away.',
    fx: { sight: 1.7, notice: 1.5 },
  },
  // THE GAME'S START (levels/flotsam.ts): what he has when he is washed up. A new game begins with these two; the Hall's
  // file begins with the Rat Sword and the Rat Shield, as it always did.
  brokenSword: {
    id: 'brokenSword', slot: 'sword', name: 'Broken Sword', description: 'Snapped a hand above the hilt. It was a good sword once.',
    colors: { blade: 0x8f979c, hilt: 0x8a6a2c },
    cost: 'Half the bite, and little more than half the reach.',
    fx: { damage: 0.5, reach: 0.62 },
  },
  ratSword: {
    id: 'ratSword', slot: 'sword', name: 'Rat Sword', description: 'A short blade, sharp enough for roaches.',
    colors: { blade: 0xe2e9ee, hilt: 0xd4aa3c },
  },
  cleaver: {
    id: 'cleaver', slot: 'sword', name: 'Cleaver', description: 'A kitchen cleaver with a knight\'s grip bound on. Heavy.',
    colors: { blade: 0x9aa3a8, hilt: 0x5a3a22 },
    perk: 'Every hit lands twice as hard.', cost: 'Heavy: every swing is slower.',
    fx: { damage: 2, swing: 0.72 },
  },
  noShield: {
    id: 'noShield', slot: 'shield', name: 'Bare Arm', description: 'Nothing on it. Whatever comes, he takes.',
    colors: { face: 0xa5302a, trim: 0xa9b3bc },
    cost: 'No guard at all, and nothing to ride on.',
    fx: { noGuard: true },
  },
  ratShield: {
    id: 'ratShield', slot: 'shield', name: 'Rat Shield', description: 'A kite shield that turns aside bites from the front.',
    colors: { face: 0xa5302a, trim: 0xa9b3bc },
  },
  buckler: {
    id: 'buckler', slot: 'shield', name: 'Buckler', description: 'A little round shield, quick in the hand.',
    colors: { face: 0x3a6a9a, trim: 0xe3b93f },
    perk: 'Twice as long to parry, and you move faster with it raised.', cost: 'Small: it only blocks what comes straight at you.',
    fx: { parry: 2, guardMove: 1.6, blockArc: 0.55 },
  },
  redScarf: {
    id: 'redScarf', slot: 'scarf', name: 'Red Scarf', description: 'Wound twice round the neck. It has been with him a long time.',
    colors: { cloth: 0xb8352c, trim: 0xb8352c },
  },
  mossScarf: {
    id: 'mossScarf', slot: 'scarf', name: 'Moss Scarf', description: 'Soft, damp and a little green. Smells like the drain.',
    colors: { cloth: 0x4f8a4a, trim: 0xd9e8a0 },
    perk: 'Quiet as moss: beasts notice you from half as far.', cost: 'It drags: you run a little slower.',
    fx: { notice: 0.5, run: 0.88 },
  },
  sludgeScarf: {
    id: 'sludgeScarf', slot: 'scarf', name: 'Sludge Scarf', description: 'Dyed in the green water of the Waterworks. Do not ask what is in it.',
    colors: { cloth: 0x7aa832, trim: 0xe9d84a },
    perk: 'Slick: you swim half again as fast.', cost: 'Slippery: you slide when you stop on the ground.',
    fx: { swim: 1.5, grip: 0.4 },
  },
  royalScarf: {
    id: 'royalScarf', slot: 'scarf', name: 'Royal Scarf', description: 'Purple with a gold hem. Fit for a knight of the Kingdom Below.',
    colors: { cloth: 0x6a3a9c, trim: 0xe3b93f },
    perk: 'Wall kicks go higher and long jumps go further.', cost: 'Fine but thin: one heart fewer.',
    fx: { wallKick: 1.15, longJump: 1.2, hearts: -1 },
  },
};

/** What he wears at the start of a new game. */
/** What a NEW GAME begins with (the Hall's file: STARTING_GEAR). */
export const WASHED_UP_GEAR: Record<Slot, string> = { helmet: 'tinHelm', sword: 'brokenSword', shield: 'noShield', scarf: 'redScarf' };
export const STARTING_GEAR: Record<Slot, string> = { helmet: 'tinHelm', sword: 'ratSword', shield: 'ratShield', scarf: 'redScarf' };

export interface PickupDef {
  itemId: string;
  x: number;
  y: number; // centre of the floating item
  z: number;
}
