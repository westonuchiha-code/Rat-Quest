# Enemy ideas (2026-11-20)

The owner, the same day: "you can even ... come up with a few different enemy designs." One of these is built (the
SPARK BEETLE, `src/enemies/sparkBeetle.ts`, in the Coil Room; see `docs/KIT.md`). The rest are designs only, for Fable
to take, change or drop. Each is made to use a part from Test Rooms 12-18, so that the rooms' parts become fights as
well as obstacles, and each is drawn from a creature a rat would meet under a house.

The game already has: roach (scuttler), toad, ironback, bat, guard, mantis, stag beetle, brood, wyrm, hornet, ant,
firefly, the Widow, scorpion, roller, and Grimsqueak. None of these copy one of those.

Each design says: what it is, how it fights, how you beat it, which existing code it could be built on, and what it
asks of the rest of the game. The rule for all of them: **no easier game**. Each one adds a thing to read, not a thing
that hurts less.

---

## 1. The Spark Beetle (BUILT)
A beetle with a copper coil in its back, charged on the coil's snare. Glows up the half beat before; blades glance
off it then; it bursts all round it on the snare; soft the rest of the bar. Built on the roach (it wraps
`Scuttler`). Fight it in the Coil Room. Ideas to grow it: a beetle on a different lane (the KICK, so the two kinds
are soft at different times and he has to choose); one that, killed, leaves its coil as a lit pickup that charges a
dead zap plate.

## 2. The Bellringer (a moth)
**What.** A big dusty moth that lives among the Music Room's bells (Test Room 13, `world/musicFloor.ts`). It flutters
from bell to bell and RINGS each with its body: a note.
**How it fights.** It plays a short tune of three or four notes on the bells, then dives at him. The dive is the
LAST NOTE of the tune, so the tune tells you when it comes. Its dust, shaken off on a dive, darkens the air for a
moment.
**How you beat it.** Ring the same tune back on the bells (`strike(pad)`) before it dives, and it is stunned, falls,
and can be hit. Ring a wrong note and it dives at once.
**Built on.** The hornet's flying (`hornet.ts`); the music floor's puzzles already know "did he play this order"
(`ORDERS` / `echo`).
**Asks of the game.** Nothing new from the controller. A dust cloud (a decor fog, timed).

## 3. The Piston Weevil
**What.** A long-snouted weevil that lives in the Press (Test Room 16) and BRACES itself between crusher and floor.
**How it fights.** It charges in a straight line, snout down, like a ram; it hits hard and is armoured from the
front (the ironback's rule, `deflects` from the front).
**How you beat it.** Lure it under a crusher (`platforms.ts` `crushAt`): a crusher that comes down on it pins it
for two seconds, belly up. Then it can be hit from any side. It learns: a second time it stops short of the crusher's
shadow, so he has to time the lure.
**Built on.** The roller's straight charge (`roller.ts`) or the stag; a pin state.
**Asks of the game.** The crusher already tells main.ts when it comes down (`stepMovers` returns crushed); the
weevil only needs the crusher's place and its `crushAt` to know when it is pinned.

## 4. The Mudskipper (a mud newt)
**What.** A flat newt that SWIMS IN THE MUD (the Gauntlet's mud, `Zones`, Test Room 15). Only its eyes show.
**How it fights.** It follows him under the mud and snaps at his feet when he is IN the mud (where he is slow). Out
of the mud it does not follow: it waits, eyes up, at the edge.
**How you beat it.** It must come up to snap. Jump as it rises (a ripple tells you), and come down on it with the
plunge. Or lead it to the mud's edge and hit it as it surfaces.
**Built on.** The toad (`toad.ts`), kept to the mud's box.
**Asks of the game.** An enemy that may move only inside a zone (the Mud spec's box). A ripple decor.

## 5. The Chain Spider (a small one, not the Widow)
**What.** A small spider that hangs from the Workshop's SWING platforms (`swingAt`, Test Room 12) on a thread.
**How it fights.** It rides the swing, and drops on him as the swing passes over. On the ground it scuttles back
toward the chain and climbs up again.
**How you beat it.** Hit it on the ground before it climbs back, or cut its thread with a swing as the platform
swings low (the thread is a target). On a swing, he and the spider ride together: a fight on a moving floor.
**Built on.** The roach for the ground; the Widow's thread code for the hanging.
**Asks of the game.** A creature that rides a mover (crates already ride them, `lifting.ts`).

## 6. The Fuse Mite (swarm)
**What.** Tiny red mites that run along the Coil Room's (or the Yard's) wires and LEVERS. A swarm of five or six.
**How it fights.** They do not bite. They run to the nearest lever (`strikeables.ts`) and THROW IT BACK: a timed
lever (`timer`) is undone, a gate closes. They are a race, not a danger.
**How you beat it.** Scatter them with a spin before they reach the lever; or ring a bell (they flee from noise);
or hit the lever first and outrun its timer.
**Built on.** The brood (`brood.ts`) for the swarm.
**Asks of the game.** A creature that can flip a lever (call the same code the sword does).

## 7. The Cinder Toad
**What.** A toad that sits on the Gauntlet's FLAME JETS (`flamejet`) and soaks up their fire.
**How it fights.** While a jet under it burns, it glows and spits a slow ball of fire (fireproof gear turns it, as
it turns the jet). Between burns it is cold and grey and only hops.
**How you beat it.** Hit it cold. Or knock it off its jet (a throw: a pot or a rock, `throwables.ts`), and it is cold
for good.
**Built on.** The toad, with the Spark Beetle's trick (a clock it reads its state from: the jet's on and off).
**Asks of the game.** A thrown thing that knocks a creature off its seat (throwing already knocks creatures down).

## 8. The Crack Worm
**What.** A pale worm that lives behind the Yard's CRACKED WALLS and under its cracked floors (`crackwall`,
`crackfloor`, Test Room 14).
**How it fights.** It bursts out of a cracked wall when he passes (breaking it), lashes once, and goes back into
another crack in the room. Every crack is a door for it.
**How you beat it.** Break the cracks yourself first, so it has fewer places to hide: when none are left, it has to
fight in the open. A puzzle and a fight at once.
**Built on.** The wyrm (`wyrm.ts`) for its coming out and going back.
**Asks of the game.** A creature that can break a crack (the strike code's `break`).

---

## Which to build next
My pick: **the Bellringer** (2). The Music Room's bells and its ORDER puzzles are already there and already tested,
so it is mostly a flier and a rule. And it is the one most like this game's rhythm idea: a fight you win by
listening and playing back. Second: **the Piston Weevil** (3), which turns the Press from a run into an arena.
