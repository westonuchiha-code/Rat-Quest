# THE GAME (started 2026-11-25). WORK IN PROGRESS

The owner, 2026-11-25:

> "I think now it's time to start actually trying to design the game. So I want to take everything that we currently
> have and incorporate it into the Hub room, The Hub room is now going to be our main test area we can change rooms
> and do whatever we want to in there, then I would like you to start a second thing that is just going to be the
> actual game and we're going to build it from front to back. So first start with the splash menu title card main menu
> all the options and stuff then the start menu. Then we are going to have to come up with the first area and the
> beginning of the little story we're going to tell."

> "the first area should be simple but fun it should introduce people to the Aesthetics of the world and some of the
> characters it should have a few different enemy types and generally teach people how Collectibles work it should
> generally just be a well-designed first level to a 3D platformer of the like Nintendo 64 PlayStation 1 era except
> with a little bit more action hack and slash thrown in there. ... similar to the opening of Mario where you have a
> big area you can run around in ... similar to the beginning of Legend of Zelda Ocarina of Time where you have a
> little area with different people you can talk to and the game sort of lets you equip Yourself by getting a sword
> and a shield and teaching you a little bit about the game works. It should also have a aspects of Dark Souls where
> Dark Souls first level is fighting with a broken sword finding your first sword so you can actually competently
> fight enemies and then pretty quickly being thrown into a boss battle before the game really 'starts' ... don't
> forget that this is a 3D platformer ... floating platforms ... different enemies that you can interact with in
> different ways which we already have we don't have to copy anymore enemies ... try to blend all of these ideas
> together into one cohesive piece of gameplay ... an equilibrium between these sort of gameplay styles."

## TWO THINGS NOW

| | THE GAME | THE HALL (the test area) |
|---|---|---|
| On the title | NEW GAME, CONTINUE, LOAD GAME | TEST HALL |
| Save files | Files 1 to 3 | its own (`HALL_FILE`, 9): nothing done there touches a game |
| Starts in | `GAME_ROOMS[0]` (`src/levels/levels.ts`): Flotsam | the Hall (`src/levels/hall.ts`) |
| He starts with | a BROKEN SWORD and NO SHIELD (`WASHED_UP_GEAR`) | the Rat Sword and Rat Shield, as always |
| What is in it | only what is built for it, in order | every test room, boss room, practice room and character |

In `src/main.ts`: `playing` ('game' or 'hall'), `setPlaying`, `playFile` (a game), `playHall`. A development address
(`#level=...`) is the game if it names one of the game's areas; add `&washedup` to be given the game's starting gear.
A game file is `strict` (`src/player/equipment.ts`): read back, he owns what he has earned and no more.

## THE FRONT END (what is there; all of it made earlier, now pointed at the game)

Boot logo, title card (the game's first area turning slowly behind it), main menu (NEW GAME / CONTINUE / LOAD GAME /
TEST HALL / LEVEL EDITOR / WORKSHOP / OPTIONS), three save files (play, copy, erase), the loading screen, and the
pause ("start") menu with its screens (equipment, items, quests, options, save). (Both since done: see below.)

## THE STORY SO FAR (a proposal: the owner has not said yes to any of it)

He is a knight from somewhere above. A flood takes him down the great pipe; his sword snaps and his shield is lost on
the way. He washes up in FLOTSAM, where a few mice and birds live off what the water brings. The only way on, down
into the Kingdom Below, is the Old Gate, and THE WARDEN stands on it: a knight once, who lets nobody by. Beat him, the
gate lifts, and the title comes up: the game begins.

## AREA ONE: FLOTSAM (`src/levels/flotsam.ts`, tests `tests/game.ts`). A FIRST DRAFT

| Part | What is there | Borrowed from |
|---|---|---|
| The shore | He lands facing the lit gate far off. One roach alone. A trail of crumbs into the yard. Finch. | Dark Souls (weak, a broken sword) |
| The yard | The big open middle. Mort by the fire says what is what. Pip sells a SHIELD for 8 crumbs. | Mario 64's grounds; Kokiri Forest's people; the Deku Shield |
| The wreck | Ledges, a gliding plank and floating boards up to the SWORD. A bat over the last of it. A cap for a running jump off the top. | The Kokiri Sword, got by platforming; Mario 64 |
| The reeds | Two roaches; a toad on a rock that spits at whoever passes, crumbs under it. | "enemies you interact with in different ways" |
| The gate | An ant pikeman (a real fight for a broken sword), a lantern, Wren with advice, and the Warden (the Stag Knight). | Dark Souls: the boss before the game starts |

Nothing is locked: he may walk up to the Warden at once, with half a sword and no shield.

DRESSED A LITTLE (2026-11-25): the pool the pipe lets out into along the south wall (he can swim in it), junk at a
rat's size left along the bank and about the yard (all solid: spools for seats by the fire), wooden boards for the
wreck, roots and slime. THE PLANK REALLY MOVES NOW: it was a `platform` given moving props, which stays put; only a
`lift` moves. As first drawn the climb could not be finished.

THE ARRIVAL, THE PIPE AND THE CARD (2026-11-25): a new game's knight comes out of the great pipe's mouth (a stone
culvert standing out of the south wall, `FLOTSAM.pipe`) in the air over the pool (`FLOTSAM.arrive`), falls in, swims
to the bank and JUMPS out (a sign on the bank says so: pushing at the bank alone does not do it). When the Warden
falls, the gate lifts and THE TITLE CARD comes up for six seconds (`src/ui/titleCard.ts`: it asks nothing and stops
nothing). `#...&showcard` shows it at once, for pictures. The two falls on the south wall now pour INTO the room.

THE WARDEN IS A BOSS (2026-11-25): the Stag Knight given a name, 40 health (a plain one has 14) and more poise
(`FLOTSAM.wardenIs`; `EnemySpec.boss`), with his name and health along the bottom while he is fought. Scripted fights
with each stage of Flotsam's gear (a knight who only swings / one who sidesteps each blow and strikes in the openings):

| He has | Only swings | Sidesteps and strikes |
|---|---|---|
| Half a sword (as he arrives) | loses, every time | wins in about 43 s, 0 to 2 hits taken |
| The wreck's sword | loses two in three | wins in about 20 s, 0 or 1 hit taken |

(Neither scripted player ever raises a shield, so the shield from Pip shows no difference here.)

THE TITLE: the game's own (the no-pad build) has NEW GAME, CONTINUE, LOAD GAME and OPTIONS. TEST HALL, LEVEL EDITOR
and WORKSHOP are on the title of the test build only (`TEST_BUILD` in `src/main.ts`: the pad build, or `#...&tools`).

WHAT IT IS NOT YET: a wrecked boat (the wreck is boards on posts); reeds; a second way round or a shortcut (in a
place this small and open one would be for show: better kept for area two); a played opening scene with a camera;
anything after the gate; sounds or music of its own. NOT PLAYED THROUGH BY HAND.

## AREA TWO: THE SLUICE (`src/levels/sluice.ts`). A FIRST DRAFT, BUILT WITHOUT THE OWNER'S WORD

He was asked twice what lies beyond the Old Gate and said "Continue", so this follows the plan he did approve (a place
built the Dark Souls way, looping back on itself). If he wants something else here, this is one file and one line of
`GAME_ROOMS`.

Flotsam is a yard; this is the first PATH. The near bank (a lantern, one roach, a VAULT behind a LOCKED gate with its
prize showing). The long way west (a cracked wall across it under a toad's ledge). The far bank (an ant and a roach by
the bridge's catch; strike it and the bridge comes down, back to the lantern). In the far corner under two bats, the
KEY: carried in both paws back over the bridge to the vault. A door north; nothing behind it yet.

ONE GAME AREA LEADS TO THE NEXT: at a game room's open door, `src/main.ts` goes to the next of `GAME_ROOMS` (the
last one's door does nothing). THE WAY BACK (2026-11-26): a door in the Sluice's south wall leads to Flotsam (`courseDoors`); he arrives in the
Warden's court. A BOSS BEATEN STAYS BEATEN in that file (`discoveries`, 'beaten:<name>'; `Stag.alreadyBeaten`), so
the Old Gate is open when he comes back and the title card does not come up twice.

A SCRIPTED RUN OF ITS LOOP (2026-11-26, in a browser, no creatures, set down at each part in turn): the catch struck
and the bridge down; the bridge walked on; the key lifted; the vault's gate opened for it and the vault walked into;
the cracked wall under the toad's ledge broken and walked through. Every part works. NOT yet done as ONE walk from
the door with the creatures in it.

DRESSED A LITTLE (2026-11-26). The Sluice: grates in the chasm's east wall pouring into it, chains over it, fire bowls
at the bridge's ends and the way on, banners, junk on both banks, webs in the key's corner. Flotsam: the wreck has
rails, a mast and a rag of sail; barred windows in the walls; a second table by the fire; more junk. SOUND: the
clearing jingle plays under the title card (borrowed; unheard by the one who put it there). Neither area has music or
sounds made for it.

NOT PLAYED BY HAND.
