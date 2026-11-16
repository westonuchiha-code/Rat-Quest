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
  { id: 'foe:mantis', group: 'Beasts', name: 'Orchid Mantis', icon: 'mantis', blurb: 'It will not stand and be hit: swing at it and it springs back, then leaps. Wait for it. A scythe goes up and glints before each cut, and the second cut may come late. Its wings flare before a leap: step aside and its scythes stick in the floor.' },
  { id: 'foe:stag', group: 'Beasts', name: 'Stag Knight', icon: 'stag', blurb: 'A great beetle with a forge hammer. It does not flinch, so do not trade blows with it. When the hammer goes up glowing red, be somewhere else: a shield will not stop it, and then it is stuck. Close in front it sweeps; stay behind it and it stomps (jump). Five quick blows put it on one knee.' },
  { id: 'foe:hornet', group: 'Beasts', name: 'Hornet Lancer', icon: 'hornet', blurb: 'A great hornet with a lance. It hangs in the air out of your sword\'s reach. When the lance swings down to point at you and its wings whine, move: it dives onto the spot, and a lance that misses sticks in the floor. Hit it while it pulls. From further off it runs at you level: step aside, jump it, or stop it on your shield. A perfect guard knocks it out of the air.' },
  { id: 'foe:ant', group: 'Beasts', name: 'Ant Pikeman', icon: 'ant', blurb: 'A soldier ant with a long pike. It keeps its point between you and it, and thrusts: the pike slides back and its point glints first. Step aside, or stop the point on your shield; a perfect guard beats the pike down to the floor. Get inside the point and it cannot thrust, but it bites: its head goes back with its jaws wide first. Two fight as a pair: one holds you at pike\'s length while the other goes round behind you. Do not stand between them: break one.' },
  { id: 'foe:firefly', group: 'Beasts', name: 'Firefly Bomber', icon: 'firefly', blurb: 'A great firefly whose lantern drips fire. It flies round you out of your sword\'s reach. When it turns to you and its lantern flares white, it is about to fly over and let three drops fall along its line, aimed at where you are going, not where you are: a ring on the floor marks where each will land. Turn off the line. The flames burn for a few seconds and no shield stops them; jump them or wait. After two runs its light is spent and it sinks, dark, to hang low while its lantern fills: that is when to cut it. A double jump can reach it in the air.' },
  { id: 'foe:scorpion', group: 'Beasts', name: 'Lamp Scorpion', icon: 'scorpion', blurb: 'A dark scorpion whose sting is its lamp. When the lamp flares, a ring on the floor shows where the barb will land: get out of the ring, then hit it while the barb is stuck. In the dark between, its lamp is out and so is its sting.' },
  { id: 'foe:wyrm', group: 'Beasts', name: 'The Sump Wyrm', icon: 'wyrm', blurb: 'The great centipede under the Cistern. All of it can be hit, but its head is where it hurts, most of all while it lies stunned. Get out of the line of its charge (no shield stops it) and let it find the wall. A perfect guard on its bite throws its head back. Jump the lash of its tail. When it winds a ring round you, jump out over its body before it tightens.' },
  { id: 'foe:brood', group: 'Beasts', name: 'The Broodmother', icon: 'brood', blurb: 'The great spider of the Hollows. Step out from under the foreleg that goes up; a shield stops a stab, and a perfect guard throws her down. Jump the scissor and the whirl. Run from the pounce, and from her shadow when the thread twangs: a shield stops neither. Hit her while her spikes are stuck in the floor.' },
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
