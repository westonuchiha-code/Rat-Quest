# Play-testing notes

You are going to play everything anyway, so this is not a checklist. It is only the few places where something
was built or tuned without a hand on the controls, and a number may want moving. Most numbers can be changed live
in the pause menu's Tweaks panel; the section to look in is given in brackets.

**Things I could not check at all**
- **Sound.** Claude cannot hear. Every effect made this week, the music's level, and the shield's scrape are unheard.
- **Your phone.** The rides were tested at 30, 24 and 20 frames a second, but not on the phone itself. Nor whether
  the game still opens quickly with a long song dropped into `assets/music`.

**Numbers that were guessed** (if any feels off, it is a slider, not a rebuild)
- The dream on foot: run, jump height and fall speed (Tweaks, "The dream").
- The Sewers and the Deep Caves: how slow he is, how hard blows land, the ground pound (Tweaks, "The sewers", "The platform room").
- Lifting: whether STOW (triangle) is the right button, the size of a crate over his head, how much a throw hurts
  (Tweaks, "Lifting").
- On the shield: the tuck, how high a pipe's lip launches him, the trick buttons, and whether the camera should
  follow behind him while he rides (Tweaks, "Riding" and "Camera").

**The odds and ends** (household junk at a rat's size, in the Hall, the Club and 17 rooms: `src/levels/oddments.ts`)
- Whether any stands somewhere you use: moving or removing one is one line in that file.
- Land beside them: a matchbox's matches rattle, a die tips, a marble rolls and rocks back, a cotton reel rocks, a
  teacup rattles and its tea slops, a spoon taps, a sardine tin's lid wobbles, a chess pawn rocks, a battery
  rolls a little. Whether each is too much or too little
  is one number in `src/world/junkModels.ts`.
- Their little sounds (a knock for wood, bone and glass, a tink for tin and china), unheard: `src/main.ts`, by the
  landing sound.
- Left alone they do things too: candles drip, the teacup steams, a marble glints, a battery sparks.

**Things to hit** (the Yard, Test Room 14; and the Music Room's prize gate)
- A cracked wall takes three blows (a heavy blade, two): one number, `STRIKE.wallHits` in `src/world/strikeables.ts`.
- The lever's clunk, the stone's crack and its fall: unheard.
- The cellar under the cracked floor is 2 deep: a jump and a second in the air get him out. Whether that is a chore.
- Solve the Music Room's echo puzzle: the gate in the east wall lifts.
- The BELL ECHO across the middle of the Music Room: strike the white bell, listen, strike the tune back on the four
  bells. The west gate lifts. The bell sound (`bellNote`) is unheard: whether it sounds like a bell at all.

**Hazards** (the Gauntlet, Test Room 15)
- The blades: whether a run through the corridor is too tight or too loose (a third of the moments get through).
  `BLADES` in `src/levels/gauntlet.ts`, the blade's size `HAZARD.blade` in `src/world/hazards.ts`.
- The spikes: up 1.2 seconds in every 3 after half a second's warning. Whether the warning reads.
- The fan: how fast it lifts him and where he hovers (`HAZARD.fan`). Whether steering off it onto the ledge is easy.
- The blade's swish and the spikes' snap: unheard.
- The buttons in front of each bay put a roach in: watch the belt carry it, the blades and spikes strike it, the
  fan blow it off. Whether a creature should be lifted by a fan as he is (it is not: they have no fall of their own).

**Crushers and flame jets** (the Press, Test Room 16)
- A crusher's warning shake is half a second; a blow is 2 hearts. Whether the corridor of three is fair.
- Riding a crusher up to the ledge: it waits 3 seconds up for him to step off.
- The flame jets: a 0.6 s blue pilot before each. The roar is unheard.

**Decisions only you can make, when you get to them**
- The Forge (Test Room 7) is a try-out of a new look for the Foundry. A yes means the Foundry gets re-dressed to match.
- The Hall's door names past the first four are placeholders.
- Fifteen written tunes are waiting to be heard (ASSETS.md, part 8); none goes in without your yes.

**What the robot already shook out** (so you do not need to go looking for these)
Four scripted runs through all 38 rooms, running into walls, jumping, swinging and rolling for about 80 seconds a
room, found nothing: no going through walls, no getting stuck, no falling out of a room. (The third, 2026-11-19,
after the new odds and ends and the cheaper flowers: one graze, for one moment mid-jump, against Vix in the Hall. The
fourth, 2026-11-20, with the odds and ends in 17 rooms and their reactions: nothing at all.)
A shorter version now runs with every test run (tests/chaos.ts: 40 seconds of random hands in each room, no browser). What it cannot tell is
anything that LOOKS or FEELS wrong to a person. That is the part only you can do.
