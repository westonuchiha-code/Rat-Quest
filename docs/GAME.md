# THE GAME. READ THE FIRST SECTION FIRST

## WHAT THE GAME IS RIGHT NOW (the owner, 2026-11-27). THIS OVERRULES EVERYTHING BELOW IT

> "none of those levels that we were building in the test rooms are real levels so we're building the first level
> right now that's what we're doing. So where he wakes up right now is just going to be an empty room we're just going
> to make a big empty room using the sewer textures and we're going to work on the cutscene right now ... that room
> will eventually be the whole first level but right now it's just a room he wakes up in so we can stay focused and
> then we're going to build the game slowly out one level at a time I don't want to rush through building the whole
> level at once relying on your placements and stuff I want to describe exactly how I want the level and you can help
> me put it that way or I will build the level myself in the level editor and you are just going to have to create the
> rooms. ... right now the only things we should be working on in the main game are the Title screen the intro cut
> scene and him waking up. Everything else we do if we want to experiment with rooms and stuff they can happen in the
> test room and the test room is where everything else belongs ... none of that stuff is officially in the game yet
> until we put it in an actual level"

> "he should wake up with a half sword and no Shield he should have to find the shield in the first level but again
> we'll get get to that when we get there ... when he's fighting the beetle maybe it's three hits he gets hit once and
> his shield flies off he gets hit a second time and his sword breaks and when he gets hit a third time then it fades to
> Black and that's where he wakes up with his half ... a sword"

On the story (do not ask him again): "think of Mario ... it doesn't really matter who the night is all we need to know is
that he's a rat that he's a knight and that he's there to ... collect Collectibles beat these levels fight some bad
guys clear some rooms ... a dungeon delving night ... and even that shouldn't be super spelled out." NO narration, no
text-dialogue intro, no popping out of a pipe.

THE GAME NOW: the title screen; THE INTRO CUTSCENE (to build: below); HIM WAKING UP in ONE EMPTY ROOM (`src/levels/
wake.ts`, `GAME_ROOMS`), with half a sword and no shield. NOTHING goes into that room unless he says what. Flotsam and
the Sluice are TEST ROOMS 22 and 23 now (everything written about them below is history).

THE INTRO CUTSCENE, as he described it (to be built): a sewer tunnel, slime water on the floor; he walks, shield on his
back, sword sheathed; a light flickers; skittering; two cockroaches; a short close-quarters fight in quick cuts like
Final Fantasy 8's opening duel (the sword sparking off the wall; he jumps and stabs one through; dodges and takes out
the other); a shadow falls; he turns, surprised; the big beetle with the hammer (the Stag Knight). THREE BLOWS: the
first knocks his shield flying, the second breaks his sword, the third: black. He wakes up deep in the sewers.

GETTING UP (done, 2026-11-27; made FACE DOWN the same day at his word): `wakePose` in `src/player/animations.ts` (face down, head to one side; pushing up on his arms;
hands and knees; one knee; hunched; standing and looking about), about seven seconds; the controls are his once he
stands (pushing the stick hurries him). `#...&wakeup` plays it, for filming.
THE HILT (2026-11-27, his idea): he wakes with nothing in his paws; his half sword lies on the floor by his sword paw
(`WAKE_HILT`), and on one knee he reaches down and takes it up (`WAKE_GRAB`, about two thirds of the way through).
CLIPPING (2026-11-27, the owner: "be extra careful for clipping cuz clipping ruins cut scenes like this"):
`tests/wakeclip.ts` measures EVERY frame of getting up with the real model and the game's gear. It found, where the films
had not: his ear 0.16 into the floor lying down, his tail 0.35 and a knee 0.1 getting up, the blade into the floor as he
took it, and the half sword laid on its edge (taller than a hilt, and under the floor). All mended: nothing of him goes
more than a hundredth into the floor in any frame, the blade never does, the sword lies flat ON the floor clear of him,
and his paw is down at it when he takes it. A foot that moves along the floor between two poses is lifted as it goes.
HIS PAWS ON THE FLOOR (2026-11-27, the owner: "It looks like he's pushing up off the air"): they were 0.25 to 0.37 up as
he pushed himself up, and 0.3 up when he "took" the sword. His arms were found by a search (arm, chest and hip angles)
that puts both paws on the floor pushing up and on all fours, and his sword paw down ON the hilt as he takes it; and
the check holds both (`RatModel.paws`). A paw that swings from one place to another bends its elbow as it goes.
THE RUB (2026-11-27, the owner: "after he gets fully upright he kind of tilts his head down and like rubs a part of his
head ... like he's 'oh ... what was that that hurt' ... he's not actually saying anything"): once he is up (`WAKE_UP`, 72%
of it), head down and to one side, his free paw to his helmet and round it a few times (`WAKE_RUB`, `WAKE_RUB_FROM` to
`WAKE_RUB_TO`), then a look about him. Ten and a half seconds in all now (`WAKE_SECS` in main.ts). The paw was placed
on the helmet by the same kind of search (`RatModel.headAt`), and the check holds it on the helmet, never inside it.
EVERY NEW ANIMATION FOR A CUTSCENE GETS A CHECK LIKE THIS (no part in the floor, through a wall, or through another).

---

## HISTORY: THE GAME AS FIRST STARTED (2026-11-25 to 26). SUPERSEDED

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

THE TITLE (changed 2026-11-27): both builds he tests with (the pad one and the no-pad one) have TEST HALL, LEVEL
EDITOR and WORKSHOP on the title. Only THE FINAL BUILD (`ratquest-final.html`, `--mode final`) has the game alone:
NEW GAME, CONTINUE, LOAD GAME and OPTIONS, and no tools in the pause menu.

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

## THE ROBOT PLAYER (2026-11-26): `&autoplay` (`src/dev/gameBot.ts`)

The owner asked for "one continuous scripted playthrough": new game, sword, shield, Warden, the Sluice's loop. The
robot plays both areas by itself with the pad and nothing else, and says what it is doing on the console ("BOT ...").
To watch it: open the game with `#boot&title&autoplay` and choose NEW GAME. `&botfrom=<step name>` begins it at a
later step; `&god` makes him unhurtable. It rolls aside when a blow is coming and strikes in between; it steps round
things it walks into; it can fall off the climb and go round again; it can die, and carries on from the lantern.

WHAT ITS FIRST RUNS FOUND (all fixed):
- CRUMBS PICKED UP IN THE GAME'S AREAS COUNTED FOR NOTHING. The collectibles tracker and the purse listed the old
  worlds and the test rooms, not `GAME_ROOMS`: the shield could never have been bought. (`src/main.ts`.)
- A matchbox at the foot of the wreck stood in the way of the first step; a battery in front of Pip's stall wedged
  him half off the floor, where he could not talk. Both moved.
- THE WARDEN KEPT HIS WOUNDS when the knight died: he fell in three and a half seconds on the third try. Now a boss
  is whole again when the knight who was fighting him comes back (`Stag.recover`).
- The half sword reaches about 60% as far: a player (or a robot) who stands where he would with a whole one hits
  nothing. Not a bug: but the first roach killed the robot once before it stood closer.

- NOTHING GAVE A HEART BACK in either area. Now each has A FIRE TO REST AT (`restSpot`, the Hall's own rule: jump
  beside it, hearts filled, the game saved): Mort's fire in Flotsam, and one by the first lantern in the Sluice.
- THE ROBOT ITSELF had to learn to fight as the game asks: it was swinging while a blow was being wound up, and a
  knight in the middle of a swing cannot dodge. It now goes away from a creature that is winding up, dodges back if
  the blow is live and near, and strikes when it is done ("hit and run"), locked on.

THE WHOLE THING, FROM NEW GAME, NO CHEATS (2026-11-26; filmed, `deliver/robot-plays-both-areas-3x-speed.mp4`): out of
the pipe; the three crumbs; the first roach with half a sword; the climb and the plank; the sword at 58 seconds; the
yard; the shield from Pip at 97 (eight crumbs spent); a rest at Mort's fire; the lantern; the Warden beaten in one
life, 36 seconds; the Old Gate; a rest at the Sluice's fire; the long way and the cracked wall; ONE DEATH, to the ant
and the roach together by the catch; up again at the far lantern, the pair beaten; the catch, the bridge, the bats,
the key over the bridge, the vault, the prize. Five minutes fifty-two of play.

WHAT THE FINISHED RUN SHOWS (no cheats, from the fire in Flotsam on, with the sword and the shield): the Warden, whole,
beaten in one life in about 28 seconds for 1 or 2 hearts; the Sluice's whole loop walked with its creatures in it; one
death, to the ant and the roach together by the catch, and the long way round walked again after it.
WITH HALF A SWORD AND NO SHIELD the robot cannot get past the ant before the gate: ten deaths. (A scripted player in
the fight harness can; this robot is not that good.) So as it stands the sword is needed in practice, not only useful.

## SOUND FOR THE GAME'S AREAS (2026-11-26)

AMBIENT, IN THE GAME (`src/audio/ambience.ts`, `LevelDef.sound`): Flotsam keeps the drain's bed and drips, with a toad
croaking somewhere off and the wreck's boards creaking; the Sluice has the water louder, the bridge's chains, and iron
far below. Made of sounds the game had. UNHEARD by the one who set the levels.

TWO TUNES, NOT IN THE GAME (his rule: he hears a tune before it goes in). `scripts/chip/songs.mjs`: `wash` "Washed
Up" (Flotsam: 80, Dm7, the game's drip, a toad's croak and a plank on the beat) and `sluice` "Long Way Round" (the
Sluice: 88, Gm7, lower, chains and a far clank). Boom bap, swung, crunched, a bass riff, scratches at the phrase
ends, to the brief in START-HERE.md. Sent as `music-wash.mp3` and `music-sluice.mp3`. Until he says yes, Flotsam
plays the Cistern's tune he chose and the Sluice the `echo` track.
