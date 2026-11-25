# The three inspirations, refreshed (2026-11-25)

The owner asked for a refresher on Ocarina of Time (movement, combat, exploration), Dark Souls (how its world
physically fits together; level and enemy design; some combat) and Mario 64 and later 3D Marios (movement and
platforming), "because those are the big inspirations for this game".

## How far to trust this

Three research passes ran on a cheaper model. **Almost no web page would open in this session** (the sites are not on
the environment's allowed list), so the passes worked from search-result summaries and from the model's own memory of
the games. Every claim below carries one of these marks:

- **[CODE]** read directly from the Super Mario 64 decompilation (github.com/n64decomp/sm64). Exact.
- **[SEARCH]** from a search-result summary that points at the URL given. The page itself was not read.
- **[RECALLED]** the model's own knowledge of the game. Unverified. Usually right on what a mechanic IS, unreliable on
  numbers.

To get proper sourcing, these hosts would need allowing: iwataasks.nintendo.com, www.nintendo.co.uk, zeldawiki.wiki,
zeldaspeedruns.com, tasvideos.org, ukikipedia.net, darksouls.wiki.fextralife.com, darksouls.fandom.com.
The comparisons with Rat Quest's own numbers at the end are Fable's arithmetic, from `src/data/tuning.ts`.

---

## 1. Ocarina of Time

**Movement**
- No jump button: an early build had one and it was dropped for the AUTO-JUMP. [SEARCH: zeldadungeon.net/?p=12425,
  citing Iwata Asks] Running off an edge at speed hops the gap; at a shallow angle he drops. The usual reading is that
  it takes jump timing out of a game about fighting and puzzles. [RECALLED]
- Locked on, the stick becomes sidehops and a backflip: short hops that also reach ledges just out of range. A
  speedrun source rates the roll below the sidehop for getting about. [SEARCH: tasvideos.org OoT resources]
- Ledge grab, climbing, swimming and block pushing all happen by walking into the thing. The A button's on-screen
  label changes with what it would do (Open, Climb, Grab, Roll): the label is the tutorial. [RECALLED]

**Lock-on (Z-targeting)**
- Invented after the team watched a ninja and samurai stage show: one opponent engages while the others hold back.
  Osawa pictured a chain and weight tying Link to his target, which is why he circles it facing in. [SEARCH: Iwata
  Asks, OoT 3D, vol. 2, "Let's Go to Toei Kyoto Studio Park"; siliconera.com 2011-06-16]
- With a lock, moving and facing come apart: the stick strafes, the camera holds the target, the screen letterboxes
  to say the lock is on. With nothing to lock, the same button recentres the camera. [SEARCH: zeldawiki.wiki
  Z-Targeting]
- "The other enemies wait their turn" is the design INTENT (Koizumi: flag one opponent, put the rest on hold). No
  code-level source was found for it as a hard rule. [SEARCH: goombastomp.com/?p=199684]

**Combat**
- Sword strength 1 / 2 / 4 for the three swords; the targeted stab and jump attack do about double a plain slash.
  [SEARCH: zeldawiki.wiki Weapon_Strength; figures for jump and spin disagree between guides]
- The shield is a HELD block, not a timed parry. Shields differ by what destroys or beats them (wood burns, a Like
  Like eats one). [SEARCH: zeldadungeon.net/wiki/Shield] So Rat Quest's timed parry is an addition to this model, not
  a copy of it.
- Enemies are a tell, an opening, and a punishment for greed: Stalfos guards and circles and is open as it lunges;
  Iron Knuckle swings slow and huge and is open after each; a Deku Scrub's shot is batted back at it. [RECALLED]

**Items and world**
- Each dungeon item is both a weapon and a key (hookshot, bow, bombs, boomerang, hammer). The dungeon hands it over,
  a safe room has him use it on a switch, a later room mixes it with enemies or timing. [RECALLED]
- Dungeons: a central hub room, small keys and locked doors, a boss key, and loops that open back to the entrance.
  [RECALLED]

## 2. Dark Souls

**The world as one place**
- Miyazaki: because everything connects, it had to look natural walking from one area to the next; a seamless map was
  harder to design, and building the connections and hidden routes was the fun of it. He likes the player to CLIMB
  into places: the vertical travel is deliberate. [SEARCH: gamebanshee.com/kwpxf relaying Edge/4Gamer/Game Informer;
  the Design Works interview on fextralife]
- Firelink Shrine is the hub and nearly everything early returns to it: the Parish elevator drops to Firelink; the
  Burg's ladders cut ahead to the bridge and the Parish; the Burg goes down through the Depths to Blighttown; Darkroot
  circles back into the Parish; New Londo gives a back way to Blighttown. [SEARCH: gamepressure and gamesradar
  walkthroughs; the Boss Keys transcript]
- You can SEE where you will go: from high in the Burg and Parish, the places below and Anor Londo above. The
  geometry is honest at the scale of areas (you can walk to what you see) and cheats on exact size and overlap; the
  later areas are loosely joined, which is the common complaint about the second half. [RECALLED]

**Shortcuts and bonfires**
- Kinds of shortcut: a door that opens only from the far side; an elevator; a ladder kicked down; a gate unlocked
  from the other side; a hidden wall. [RECALLED, with the Burg/Parish examples from the walkthroughs]
- Resting refills the heal and brings back the creatures, but what he OPENED stays open. So a shortcut is a permanent
  shortening of a dangerous road, which is why opening one feels like the reward. The distance between two bonfires
  is the tension budget of a run. [RECALLED]

**Levels and enemies**
- The Burg teaches by where things are put, ending with a demon on a bridge and then a dragon that cannot be fought
  head on. [SEARCH: gamedeveloper.com "Training day in the Souls series"]
- Enemies are placed puzzles, not roaming mobs: fixed posts, short ranges at which they notice him, ambushes, mixed
  groups that force a choice of whom to deal with first. Each kind teaches one thing. Traps are rhythms that can be
  read by watching one cycle. Loot sits where it costs a risk to fetch. [RECALLED]

**Combat**
- One resource, stamina, pays for attacking, blocking, rolling and running, so every choice trades against the rest.
  [RECALLED]
- Parry windows in the first game: 6 frames for small shields, 8 for the buckler and parrying dagger, with 14 to 19
  frames of recovery if it misses. [SEARCH: fextralife Stability page] A parry leaves about a second to riposte.
  [SEARCH: darksouls.fandom.com Parry_and_Riposte] No riposte damage figure could be verified.
- Roll invulnerability by weight: sources disagree, so no figure is given here.
- What players call UNFAIR is being hurt by something they had no way to learn about first (the Anor Londo archers,
  the Bed of Chaos), not being hurt by something hard. [RECALLED]

## 3. Mario 64, and what came after

All speeds are game units per frame at 30 frames a second. Mario is about 160 units tall.

**The move set, as numbers** [CODE]
| Move | Upward launch | Forward | Note |
|---|---|---|---|
| Jump | 42 + a quarter of his speed | speed x 0.8 | height grows with run speed |
| Double jump | 52 + a quarter of his speed | x 0.8 | within about 5 frames of landing |
| Triple jump | 69 | x 0.8 | only if his speed is over 20 |
| Backflip | 62 | set to -16 | crouch, then jump |
| Side flip | 62 | set to 8 | turn sharply, then jump |
| Wall kick | 62 | at least 24 | within 5 frames of touching the wall |
| Long jump | 30 | x 1.5, to 48 at most | HALF gravity: low, flat and far |
| Dive | - | +15, to 48 at most | in the air, moving faster than 28 |
| Ground pound | hovers, then falls at 50 | - | the hover is the commitment |

- Gravity 4 a frame, falling no faster than 75. Letting go of jump while rising faster than 20 divides his upward
  speed by FOUR. [CODE]
- On the ground: top speed 32 (48 absolute), gained at 1.1 a frame less a little as he speeds up; he turns toward
  the stick at about 11 degrees a frame: a deliberate lag. [CODE]
- In the air he can bend a jump but not reverse it: steering is far weaker than on the ground. [CODE]
- There is NO coyote time and no buffered jump in Mario 64. [CODE]

**How it was made**
- Miyamoto found the game dull halfway through, and what fixed it was changing how Mario TURNS. The team tuned his
  movement in a small test garden before there was a game round it. [SEARCH: Iwata Asks (Skyward Sword vol. 7; Mario
  25th); nintendolife.com 2011-11]

**Levels**
- One connected course serves several stars, so what is learned on one carries to the next; a landmark (the
  mountain) is visible from nearly everywhere; the castle is a hub with doors that need a count of stars. [RECALLED]
- 3D Land and 3D World build each level in four steps: introduce a thing safely, develop it, twist it, conclude.
  [SEARCH: mcvuk.com on the Game Maker's Toolkit video, citing Hayashida]
- Sunshine's hover, Galaxy's spin, Odyssey's cap-throw chain and Bowser's Fury: not researched successfully. Only
  recalled in outline, so left out.

---

## What this means for Rat Quest

### Where the knight already stands (Fable's arithmetic)
Measured in his own body heights, so the two games can be compared:

| | Mario 64 | The knight |
|---|---|---|
| Run speed | 6 heights a second | 5.6 heights a second |
| Jump height | 1.5 to 2.1 heights (more when running) | 2.3 heights, the same at any speed |
| Second jump | about 3 heights in all | about 4.3 heights in all |
| Letting go early | upward speed divided by 4 | halved |
| Wall kick window | 0.17 s | 0.16 s |
| Forgiveness off a ledge | none | 0.1 s, and a jump remembered for 0.12 s |
| Turning | 330 degrees a second, felt as weight | nearly instant |

| | Dark Souls | The knight |
|---|---|---|
| Parry window | 0.2 s (small shield), 0.27 s (buckler) | 0.16 s |
| Time to riposte | about 1 s | 1.3 s (sewers only) |

So his platforming is already in Mario's range and kinder at the edges; his parry is TIGHTER than Dark Souls' and his
riposte window longer.

### What is worth taking, in order of how much it would give
1. **Shortcuts that open from the far side** (Dark Souls). The parts for it now exist: a locked gate, a key, a weight
   plate, a lever, a checkpoint. What is missing is a gate that opens only from one side, and a ladder or bridge that
   is kicked down. With those, a real level can loop back to its own lantern. This is the largest single gain for
   level building.
2. **Enemies as placed puzzles** (Dark Souls, Ocarina). Fixed posts and ambushes by design: one above with something
   to throw, one behind a corner, a mixed pair that forces a choice. The creatures exist; this is a rule for placing
   them, and each first meeting should be somewhere safe to learn it.
3. **Teach, then test, then twist** (3D World; Ocarina's item rooms). Every new part gets a safe first use, then a
   dangerous one, then a combination. A rule for building rooms, to add to KIT.md's "decide its goal on purpose".
4. **Jump height that grows with run speed** (Mario 64). One line of arithmetic: a quarter of his speed added to the
   launch. It makes momentum worth having, which the platform room and the dream would both feel.
5. **A sharper early cut on the jump** (Mario 64 divides by four; the knight halves). Finer control of short hops.
   One number, worth trying on a slider.
6. **Seeing where you will go** (Dark Souls). Rooms that show the next landmark, or the lantern he is working back
   toward, through a gap or across a pit.
7. **One at a time while locked on** (Ocarina's intent). The game has a director for who may attack; worth checking
   that it leans this way in the sewers, where fights are meant to be duels.
8. **The lock-on's sidehops** (Ocarina). Locked on, the roll could become a quick sidehop or backflip chosen by the
   stick: a dodge with a direction, to answer a particular tell.

### What NOT to take
- **Ocarina's auto-jump.** The knight's game is half Mario; his jump is a skill the player should own.
- **Mario 64's lack of forgiveness.** The 0.1 s off a ledge and the remembered jump are better than the original.
- **A stamina bar** (Dark Souls). It would fight the Mario half of the game, where free movement is the point. The
  sewers already get their weight another way: slower, weaker blows, and hits that cost double.
- **Hazards the player cannot learn about first.** The audit of every creature's tells was for exactly this.

### Open question for the owner
Dark Souls' world is ONE place folded round a hub; Mario 64's is a hub with separate courses behind doors. Rat Quest
today is the second (the Club, and doors). The two can be joined: separate biomes behind doors, but each biome built
inside itself the Dark Souls way, looping back to its own entrance through shortcuts. That would be Fable's
recommendation, and it is the owner's call.
