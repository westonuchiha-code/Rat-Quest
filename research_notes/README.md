# Research notes: where they stand (2026-11-15)

The owner asked for in-depth research on Super Mario 64, on Dark Souls with Kingdom Hearts 2, and on Ocarina of Time
(START-HERE.md, "Research the owner has asked for"). Nine researchers were sent out at once, three to a project.

**It is NOT done.** This session's network rules refused every site they tried to read (the interview translations,
Iwata Asks, the wikis, Game Developer, Wikipedia). Only the search tool answered, and it gives summaries, not pages.
So almost everything in these folders is second-hand: a search summary of a page nobody here has read. Each file says
so at its top and marks what is unverified. No reports have been written from them, on purpose: a report built on
this would look like research and not be.

**The one solid part** is `Super Mario 64 design research/movement_and_camera.md`: the game's decompiled source on
GitHub could be read, so its numbers (jump speeds, gravity, the windows for chained jumps and wall kicks, the camera's
distances) are first-hand.

## To finish it
1. Allow these sites in the environment's network settings (the session must be opened at claude.ai on a computer, or
   in a newer Claude app: the phone app this was run from could not show the request):
   shmuplations.com, iwataasks.nintendo.com, www.nintendo.com, en.wikipedia.org, www.mariowiki.com, ukikipedia.net,
   www.gamedeveloper.com, www.khwiki.com, www.khinsider.com, www.kh13.com, darksouls.wiki.fextralife.com,
   soulslore.wikidot.com, www.eurogamer.net, www.zeldadungeon.net, zeldawiki.wiki, www.zeldaspeedruns.com,
   critpoints.net, glitterberri.com, amara.org, www.nintendolife.com
2. Send the researchers out again with the same briefs. Each notes file lists, under its Gaps, the pages to read first.
3. Then write one report per project into `reports/`, each ending with what it means for this game.

## Mario 64's movement beside ours (from its source; the comparison is ours)
Mario is 160 units tall and the game steps 30 times a second; our knight is 1.1 tall. In body heights:

| | Mario 64 | Our knight |
|---|---|---|
| Top running speed | 6.0 a second | 5.6 a second |
| Gravity going up | 22.5 a second, each second | 16.4 |
| One jump, standing | 1.4 high | 2.3 |
| One jump, at a full run | 1.95 high (a jump is higher the faster he runs) | 2.3 (speed makes no difference) |
| Second jump | 2.8 high: a SECOND JUMP FROM THE GROUND, pressed within 5 frames (0.17 s) of landing the first | 4.3 high in all: a jump in the air, any time |
| Third jump | 3.7 high, and only above two thirds of top speed | none |
| Backflip, side flip | 3.0 high, from a crouch or a sharp turn | none |
| A wall kick | 3.0 high (one place in the source says 2.1) | 2.5 |
| Time to press jump after touching a wall | 5 frames (0.17 s) | 0.16 s |
| Letting go of jump early | cuts his rise to a quarter | cuts it to a half |
| Grace after running off an edge | none found in the source read | 0.1 s |

What stands out (our reading, not a source's): our knight gets much higher for his size than Mario does, and gets
there with no run-up, anywhere, at any time. Every one of Mario's high jumps has to be earned: by speed, by a second
landing, by a crouch or a turn, or by a wall. That bears on the owner's complaint that he "can just jump over stuff":
it is the levels' walls that have been wrong so far, but the height of the double jump is the other half of it.
Nothing in the game has been changed on the strength of this.
