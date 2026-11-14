/** Everything in the sticker book that is not gear or a level. Found things are recorded by id in Discoveries. */
export interface StickerDef {
  id: string;
  group: 'Characters' | 'Beasts' | 'Finds' | 'Gear' | 'Places';
  name: string;
  blurb: string;
  /** Which little picture to draw (see stickerIcon in ui/icons.ts). */
  icon: string;
}

export const STICKERS: StickerDef[] = [
  { id: 'char:knight', group: 'Characters', name: 'The Rat Knight', icon: 'knight', blurb: 'Small, brave and silent. Squeaks when he jumps and swings. Has worn that red scarf a long time.' },
  { id: 'char:grimsqueak', group: 'Characters', name: 'Lord Grimsqueak', icon: 'grimsqueak', blurb: 'Floats over the Kingdom Below and claims every crumb of it. Has a very grand laugh.' },
  { id: 'char:dave', group: 'Characters', name: 'Dizzy Dave', icon: 'dave', blurb: 'A pigeon with shades and a swinging chain. Believes you need rhythm to survive the tunnels. Dig?' },
  { id: 'char:mort', group: 'Characters', name: 'Mellow Mort', icon: 'mort', blurb: 'On that couch since Tuesday. Prefers the beat to the drips.' },
  { id: 'char:wren', group: 'Characters', name: 'Wren', icon: 'wren', blurb: 'A songbird who would like to sing over Dave\'s beat. Says he is dizzy from the speaker, not the dancing.' },
  { id: 'char:pip', group: 'Characters', name: 'Pip', icon: 'pip', blurb: 'Keeps the only counter in the Kingdom Below. Crumbs and caps buy scarves, helms, a cleaver and his nacho cheese.' },
  { id: 'char:finch', group: 'Characters', name: 'Finch', icon: 'finch', blurb: 'A cheery goldfinch who warns about sludge, lifts and spiders. Probably.' },
  { id: 'foe:scuttler', group: 'Beasts', name: 'Giant Cockroach', icon: 'scuttler', blurb: 'Circles at arm\'s length, then bites or charges. Watch for the wind-up.' },
  { id: 'foe:toad', group: 'Beasts', name: 'Toad', icon: 'toad', blurb: 'Spits globs, hops away, and pounces when you crowd it. Lies winded afterwards.' },
  { id: 'foe:ironback', group: 'Beasts', name: 'Ironback', icon: 'ironback', blurb: 'Its iron shell turns your sword. Get round behind it, or flip it: let it ram a wall, catch the ram on a perfect guard, or plunge onto it.' },
  { id: 'foe:guard', group: 'Beasts', name: 'Keep Guard', icon: 'guard', blurb: 'One of the king\'s rats, behind a shield. Your sword rings off it, and he answers. Wait for his thrust: step aside, block it, or turn it with a perfect guard. A plunge breaks his guard too.' },
  { id: 'foe:bat', group: 'Beasts', name: 'Flitter', icon: 'bat', blurb: 'Roosts out of reach and wakes to footsteps (sneak past). Only low enough to hit at the bottom of its swoop.' },
  { id: 'find:crumb', group: 'Finds', name: 'Cheese Crumb', icon: 'crumb', blurb: 'The kingdom\'s small change. Collect enough to open the way.' },
  { id: 'find:cap', group: 'Finds', name: 'Bottle Cap', icon: 'cap', blurb: 'Shiny and hard to spot. Hidden in corners and on high ledges.' },
  { id: 'find:relic', group: 'Finds', name: 'Golden Relic', icon: 'relic', blurb: 'Very rare. Somebody left these here on purpose.' },
];

export const STICKER_GROUPS = ['Characters', 'Beasts', 'Finds', 'Gear', 'Places'] as const;

/** Which sticker a talk-box name belongs to. */
export function charIdFor(name: string): string | null {
  const n = name.toLowerCase();
  if (n.includes('grimsqueak')) return 'char:grimsqueak';
  if (n.includes('dave')) return 'char:dave';
  if (n.includes('mort')) return 'char:mort';
  if (n.includes('wren')) return 'char:wren';
  if (n.includes('pip')) return 'char:pip';
  if (n.includes('finch')) return 'char:finch';
  return null;
}
