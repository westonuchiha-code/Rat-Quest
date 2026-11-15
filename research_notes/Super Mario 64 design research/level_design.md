# Super Mario 64 level design (research notes, second pass)

Sourcing note: mariowiki.com, goombastomp.com, tcrf.net and iwataasks.nintendo.com could not be read in either pass. Pages actually read in full or in relevant part: Shmuplations 1996 interviews, English Wikipedia (Super Mario 64, Sunshine, Galaxy, Odyssey, Bowser's Fury), Game Developer (two articles), CritPoints post, and the n64decomp/sm64 source on GitHub (primary data from the game's own code and text tables). Goomba Stomp opinions below are from first-pass search summaries only (page not read), flagged as such.

## 1. Structure, hub and star gating

### Takeaway
Peach's Castle is a hub of paintings and star-gated doors; 15 courses x 7 stars (6 missions + 100-coin star) plus 15 hidden stars = 120, but only 70 are needed to reach Bowser's final stage, so 50 are optional. Door thresholds 8, 30, 50, 70 are verified from the game's code; 1 and 3 are likely but not fully verified; 12 is not verified.

### Cited Findings
- "Each of the fifteen courses has seven Power Stars (six from named missions and one gained by collecting 100 coins in the level), and an additional fifteen are hidden as secrets and as bonuses, for a total of 120 Power Stars." — [Wikipedia, Super Mario 64](https://en.wikipedia.org/wiki/Super_Mario_64)
- Castle has three floors (lobby, main tower, basement) plus moat and courtyard; paintings are portals; "The final level is blocked by 'endless stairs'... Mario can ascend them after collecting seventy Power Stars." — [Wikipedia](https://en.wikipedia.org/wiki/Super_Mario_64)
- Verified in the decomp: castle_inside level script places star doors with bhvParam 8 (two door halves), 30, 50 and 70; model IDs exist for 0-, 1- and 3-star doors as well (MODEL_CASTLE_DOOR_0_STARS / _1_STAR / _3_STARS) but I did not find the placements. — [castle_inside/script.c](https://raw.githubusercontent.com/n64decomp/sm64/master/levels/castle_inside/script.c), [model_ids.h](https://raw.githubusercontent.com/n64decomp/sm64/master/include/model_ids.h)
- The door check compares the player's total course-star count with the required number: `numStars >= requiredNumStars`. — [interaction.c](https://raw.githubusercontent.com/n64decomp/sm64/master/src/game/interaction.c)
- Key doors (basement and upstairs) are separate from star doors and open with keys won from Bowser stages (bparam 0x01 / 0x02). — [castle_inside/script.c](https://raw.githubusercontent.com/n64decomp/sm64/master/levels/castle_inside/script.c); "Mario unlocks three doors... with keys obtained by defeating Bowser in hidden worlds" — [Wikipedia](https://en.wikipedia.org/wiki/Super_Mario_64)
- Secret/bonus stars in the text table: Bowser in the Dark World / Fire Sea / Sky, The Princess's Secret Slide, Cavern of the Metal Cap, Tower of the Wing Cap, Vanish Cap Under the Moat, Wing Mario Over the Rainbow, The Secret Aquarium, plus "Castle Secret Stars" (these are the "15" with the castle's hidden stars; per-item star counts not verified here). — [text/us/courses.h](https://raw.githubusercontent.com/n64decomp/sm64/master/text/us/courses.h)
- Game Developer's Nathan Savant: "The game progresses through a numerical lock system, each battle with Bowser being a reward for reaching a certain number of stars. The final door unlocks at 70 stars, leaving the remaining 50 stars as accessory, only required for completionists." (opinion/analysis) — [Game Developer, Mario: 64 v Odyssey](https://www.gamedeveloper.com/design/mario-64-v-odyssey)
- Miyamoto: the castle system "was originally something I thought of for Zelda". — [Shmuplations](https://shmuplations.com/mario64/)

### Inferences
- Using the verified thresholds: 8/120 = 6.7%, 30 = 25%, 50 = 41.7%, 70 = 58.3% of all stars (my arithmetic). Of the 105 course stars, only 70 are required to finish, so a player may skip about a third of all stars, and with 15 courses x 6-7 stars, can pick the stars they like in any course. This is my inference; I found no developer quote explicitly about letting players skip hard stars (a Wikipedia line says Miyamoto, about Sunshine, wished he had let players skip the secret courses: [Wikipedia, Sunshine](https://en.wikipedia.org/wiki/Super_Mario_Sunshine)).
- Thresholds then work as pacing: early gates (1/3/8) open after the first one or two courses; later jumps of 18-20 stars force breadth.

### Gaps
- 1-, 3- and 12-star thresholds not directly read (decomp door objects for 1/3-star are in files I could not fetch; 12 not found). MarioWiki unreadable.
- No developer quote about skipping hard stars.

## 2. Course case studies

### Takeaway
Each course has six named missions plus the 100-coin star; the names show the missions are largely different goals in one shared space (a mountain, a fortress, a clock). Layout descriptions are thin because MarioWiki/Goomba Stomp were unreadable; star names below are verified exact text from the decomp.

### Cited Findings (all star names from [text/us/courses.h](https://raw.githubusercontent.com/n64decomp/sm64/master/text/us/courses.h))
- 1 Bob-omb Battlefield: Big Bob-omb on the Summit / Footrace with Koopa the Quick / Shoot to the Island in the Sky / Find the 8 Red Coins / Mario Wings to the Sky / Behind Chain Chomp's Gate (+100 coins).
- 2 Whomp's Fortress: Chip Off Whomp's Block / To the Top of the Fortress / Shoot into the Wild Blue / Red Coins on the Floating Isle / Fall onto the Caged Island / Blast Away the Wall.
- 4 Cool, Cool Mountain: Slip Slidin' Away / Li'l Penguin Lost / Big Penguin Race / Frosty Slide for 8 Red Coins / Snowman's Lost His Head / Wall Kicks Will Work.
- 6 Hazy Maze Cave: Swimming Beast in the Cavern / Elevate for 8 Red Coins / Metal-Head Mario Can Move! / Navigating the Toxic Maze / A-maze-ing Emergency Exit / Watch for Rolling Rocks.
- 9 Dire, Dire Docks: Board Bowser's Sub / Chests in the Current / Pole-Jumping for Red Coins / Through the Jet Stream / The Manta Ray's Reward / Collect the Caps...
- 12 Tall, Tall Mountain: Scale the Mountain / Mystery of the Monkey Cage / Scary 'Shrooms, Red Coins / Mysterious Mountainside / Breathtaking View from Bridge / Blast to the Lonely Mushroom.
- 14 Tick Tock Clock: Roll into the Cage / The Pit and the Pendulums / Get a Hand / Stomp on the Thwomp / Timed Jumps on Moving Bars / Stop Time for Red Coins.
- 15 Rainbow Ride: Cruiser Crossing the Rainbow / The Big House in the Sky / Coins Amassed in a Maze / Swingin' in the Breeze / Tricky Triangles! / Somewhere over the Rainbow.
- Other courses (same source): 3 Jolly Roger Bay, 5 Big Boo's Haunt, 7 Lethal Lava Land, 8 Shifting Sand Land, 10 Snowman's Land, 11 Wet-Dry World, 13 Tiny-Huge Island, each with six named stars.
- Pattern across lists: every course has an "8 red coins" mission (red-coin star names appear in all fifteen; e.g. BoB "Find the 8 Red Coins"); the first mission is usually the boss/landmark star; one mission is typically a "reach the unreachable spot" star (cannon/wing cap: "Shoot to the Island in the Sky", "Shoot into the Wild Blue", "Blast to the Lonely Mushroom").
- Bob-omb Battlefield: mountain with the King Bob-omb at the summit; Miyamoto describes the initial design: a river in the middle you cross to reach the boss area "atop a big hill that you have to wind round and round as you ascend"; the river was replaced with a desert-valley-like gap because the current swept Mario away (too hard). — [Shmuplations](https://shmuplations.com/mario64/)
- Same course: Game Developer notes first star is at the mountain top with Big Bob-omb whose fight "teaches you the mechanic you'll need to beat the game's recurring boss, Bowser", with chain chomp, goombas and rolling boulders on the way up. — [Game Developer, Mario: 64 v Odyssey](https://www.gamedeveloper.com/design/mario-64-v-odyssey)
- Koopa race: an early version was a fixed straight-line run up the mountain; "it just didn't feel like you were actually racing", so it became freeform with balls to dodge; racing a rabbit would be "too harsh", so a slow-talking koopa. — [Shmuplations](https://shmuplations.com/mario64/)
- Opinion (secondhand summary of Goomba Stomp "Level By Level", pages not read): Tall Tall Mountain "arguably the most linear in the game" with stars that "feel like clones of Star 1"; its 100-coin star "incredibly tedious". Hazy Maze Cave's 100-coin: backtracking and dead ends. Dire Dire Docks: sparse coins force searching every corner, parts feel like reused Jolly Roger Bay. Whomp's Fortress: compact layout and blue-coin enemies make 100 coins easier. — [Goomba Stomp series](https://goombastomp.com/super-mario-64-course-14-tick-tock-clock/) (index URL from search results; individual-course quotes via search summary, unverified)
- Game Developer: Savant charted the type of challenge per star: "the game starts off being primarily about exploration, learning to navigate the game, and ends primarily being about testing advanced skills. Jumps become more difficult, levels more punishing, simply progressing through Rainbow Ride is a difficult experience." (opinion) — [Game Developer](https://www.gamedeveloper.com/design/mario-64-v-odyssey)

### Inferences
- Mission names that name a landmark ("Big Bob-omb on the Summit", "To the Top of the Fortress", "The Big House in the Sky") show the course is built around one readable centre with missions as different routes to or from it. Many names are a verb plus a place, which is good practice for goal-per-landmark design.
- The cannon/wing "shoot" star recurring across courses is a repeated verb that teaches a mechanic once and then reuses it.

### Gaps
- No verified data on course dimensions, vertical extents, or how each mission modifies the level (object spawns, water level, etc.). The decomp level folders (levels/bob, wf, ccm, ttc, ttm, rr) contain this but I did not parse them. Layout descriptions for Whomp's Fortress, Cool Cool Mountain, Tick Tock Clock (e.g. clock-hand speed changes by entering when the hand is at 12, 3, 6, 9) and Rainbow Ride are not sourced.

## 3. Design process and philosophy (developers' own words)

### Takeaway
Movement first, courses last and in a burst; courses were sculpted like dioramas from sketches and notes, tested by dropping Mario in; levels allow for "close enough" jumps.

### Cited Findings
- "We spent about half our time and energy designing the basic system... As for the courses and enemies, those actually came at the very end. They were done in a single burst of energy, just thrown together, almost." — Miyamoto, [Shmuplations](https://shmuplations.com/mario64/)
- Yajima: the Z-buffer "gave us, as designers, a chance to play around with Mario in a diorama world, in a very free way... we'd make a ghost house course, and then drop Mario in there and see how it felt to move him around there." — [Shmuplations](https://shmuplations.com/mario64/)
- No blueprint maps: "only some concept art sketches, and brief notes/memos"; Miyamoto talked ideas with course director Yoichi Yamada, who sketched them. "It was kind of like sculpting a diorama out of clay. First you make a very general shape." — [Shmuplations](https://shmuplations.com/mario64/)
- Tezuka: leftover terrain "without any purpose... let's just make it a little doghouse." — [Shmuplations](https://shmuplations.com/mario64/)
- Jump design: "we had to design the levels so that as long as your jump was 'close enough', you'd make it... a design change we made in the middle of the development... There was a lot of booing from the staff." — Miyamoto, [Shmuplations](https://shmuplations.com/mario64/) and [Game Developer](https://www.gamedeveloper.com/design/how-nintendo-devs-grappled-with-making-the-first-3d-i-mario-i-game)
- Safe play space: about 10 middle schoolers played King Bob-omb's stage for half a day; "if a game was this fun to play even if you weren't getting anywhere, well, it must be alright". On the castle grounds: "We thought that half the people would just go straight into the castle, and half would hang out and explore outside... We made the game with that latter half of players in mind." — Miyamoto, [Shmuplations](https://shmuplations.com/mario64/)
- "One of our big development themes was letting the players move Mario around any way they wanted. We wanted to make a game where just moving Mario around was fun." — Miyamoto, [Shmuplations](https://shmuplations.com/mario64/)
- Enemies: "Normally we'd include about 80 different enemies, but this time we had just under 40", many neither friend nor foe, so the player feels "wow, what is this mysterious place". — Miyamoto, [Shmuplations](https://shmuplations.com/mario64/)
- Miyamoto: "An eternal theme for me with game design has been to let the players create their own vision... I want a game that allows players to try come up with their own solutions and playstyles." — [Shmuplations](https://shmuplations.com/mario64/)
- Prototype origin: a room of simple blocks where Mario and Luigi ran and climbed slopes. — [Shmuplations](https://shmuplations.com/mario64/)
- Early build (Space World 1995) "featured thirty-two courses. Miyamoto had hoped to create more, possibly up to forty, but was ultimately reduced to fifteen." — [Wikipedia](https://en.wikipedia.org/wiki/Super_Mario_64). Production: Sept 1994 to May 1996; team of "around fifteen to twenty people" — [Wikipedia](https://en.wikipedia.org/wiki/Super_Mario_64).
- Designers credited include Yoichi Yamada, Yasuhisa Yamamura, Takashi Tezuka, Kenta Usui and others. — [Wikipedia](https://en.wikipedia.org/wiki/Super_Mario_64)
- Game Developer framing: "Nintendo took cues from puzzle box toy design... Stars play the role of the articulation points you find on a puzzle box... The levels were designed as 3D dioramas... rather than exploring a natural environment, Mario was running around on a toy." (analyst opinion) — [Game Developer](https://www.gamedeveloper.com/design/mario-64-v-odyssey)
- The term "hakoniwa"/miniature garden: Wikipedia's text uses Miyamoto's "an entire world in miniature, like miniature trains"; a Time Extension piece reports a Japanese interview describing levels as "garden dioramas" (secondary, from search summary only). — [Wikipedia](https://en.wikipedia.org/wiki/Super_Mario_64), [Time Extension](https://www.timeextension.com/news/2025/04/a-rare-shigeru-miyamoto-interview-about-the-making-of-mario-64-has-just-surfaced-online)

### Inferences
- The "river swept Mario away, so swap it for a valley" anecdote shows the workflow: block out the shape, drop the player in, change terrain until the movement feels right, then add detail.

### Gaps
- Hayashida/Koizumi GDC-style talks not found; Iwata Asks on Mario 64 not readable.

## 4. Coins, collectibles and teaching

### Takeaway
Coins double as health and guidance; the 100-coin star is the most criticized collectible. Little sourced on introduction order of moves.

### Cited Findings
- Yellow coin refills 1 health segment, red coin = 2, blue = 5 (blue coin value matches "worth five coins"); one extra life per 50 coins at course end; 1-up mushrooms hidden in trees and poles, some chase Mario. — [Wikipedia](https://en.wikipedia.org/wiki/Super_Mario_64)
- Every course has a red-coin star (8 red coins); red coin star names listed in section 2. — [courses.h](https://raw.githubusercontent.com/n64decomp/sm64/master/text/us/courses.h)
- Wikipedia on stars: some "only appear after completing certain tasks, often hinted at by the name of the course". — [Wikipedia](https://en.wikipedia.org/wiki/Super_Mario_64)
- Critic Celia Wagar (CritPoints, opinion): rates 64's level design 5/5, praises "almost never only one path forwards", but "I don't like the way mario 64 levels... are filled with so much unnecessary stuff. I don't like the 100 coin challenges. I don't like the scavenging for the stars." — [CritPoints](https://critpoints.net/2015/09/30/mario-galaxy-relative-to-sunshine64/)
- 1Up.com via Wikipedia: the hub "provides a safe tutorial and a level selector, and is now a staple of the 3D platformer genre." N64 Magazine: it felt like "an enormous playground", but hints and tips slightly hurt exploration. — [Wikipedia](https://en.wikipedia.org/wiki/Super_Mario_64)
- Hidden/secret courses: caps unlocked by three switches in secret areas, giving Wing, Metal, Vanish caps used in course missions. — [Wikipedia](https://en.wikipedia.org/wiki/Super_Mario_64)

### Inferences
- A repeated structure (landmark boss star, race, red coins, shoot-to-island, 100 coins) means a player learns the "grammar" of a course quickly; the 100-coin star is the only mission that is purely a hunt.

### Gaps
- No sourced analysis of the order in which moves are introduced (wall kicks required vs optional; "Wall Kicks Will Work" in CCM is a named star but the requirement frequency is unverified). Hidden shortcuts and "wrong way" handling not sourced.

## 5. Later 3D Mario games: what changed

### Cited Findings
- Sunshine: 120 Shine Sprites, hub Delfino Plaza reached via portals; Miyamoto (2002) "regretted that Super Mario Sunshine 'turned out to be difficult for the average user'" and wished he had let players skip the secret courses. (Blue-coin mechanics not retrieved.) — [Wikipedia, Sunshine](https://en.wikipedia.org/wiki/Super_Mario_Sunshine)
- Galaxy: Koizumi believed 3D difficulty came from depth misperception, getting lost and motion sickness; camera solutions "resulted in systems that were too cumbersome or at least intimidating for players"; hub is the Comet Observatory with domes; stars earned by missions, bosses or reaching an area. — [Wikipedia, Galaxy](https://en.wikipedia.org/wiki/Super_Mario_Galaxy). Critic opinion that Galaxy levels are "more straightforward with more of a defined sequence" — [CritPoints](https://critpoints.net/2015/09/30/mario-galaxy-relative-to-sunshine64/)
- Odyssey: "return to the exploration-based level design featured in Super Mario 64"; requires a minimum number of Power Moons per kingdom "though these may be obtained from any source, making major objectives largely optional". — [Wikipedia, Odyssey](https://en.wikipedia.org/wiki/Super_Mario_Odyssey). Game Developer: moons are "no longer articulation points on a puzzle box" but treasures found while exploring; Cascade Kingdom's first moon is about 50 feet from the start; "power moons are not the destination, but objects along the road." — [Game Developer](https://www.gamedeveloper.com/design/mario-64-v-odyssey)
- Bowser's Fury: open-ended sandbox, collect 100 Cat Shines, one seamless world; basic game about four hours. — [Wikipedia, Bowser's Fury](https://en.wikipedia.org/wiki/Bowser%27s_Fury)

### Gaps
- Sunshine's blue coins (243 total) and Galaxy's star counts not retrieved from a source in this pass.
