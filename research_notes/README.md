# Research notes: where they stand (2026-11-15)

The owner asked for in-depth research on Super Mario 64, on Dark Souls with Kingdom Hearts 2, and on Ocarina of Time
(START-HERE.md, "Research the owner has asked for"). Nine researchers went out, three to a project, twice.

**The first pass** could open no site at all (this session's network rules refused them), so it rested on search
summaries. **The second pass** had twelve sites allowed and read the pages themselves. Each notes file now says, claim
by claim, what was read in full (with a short exact quote and the address) and what is still second-hand or unverified.
The reports in `reports/` are written from these notes, one per project, each ending with what it means for this game.

## What was actually read
- **Mario 64:** the 1996 strategy-guide interviews with the team (shmuplations.com/mario64, in full), Miyamoto's 1996
  talk with Kenji Eno and 1999 talk with Nagoshi, Game Developer's report of Koizumi's 2007 talk, Wikipedia, and the
  game's decompiled source (movement numbers, the star doors, the punch and kick, three bosses, every star's name).
- **Dark Souls:** the Design Works interview with Miyazaki and the artists (in full, on the Fextralife wiki), that
  wiki's pages for the areas, the bosses, stamina, equip load, poise and Estus, four CritPoints essays, three Game
  Developer pieces, and Wikipedia on Dark Souls and the games that followed it.
- **Kingdom Hearts 2:** about twenty pages of khwiki.com, the most useful being a fan translation of the Japanese
  Ultimania guide (form speeds, glide and high jump by level, the seconds of safety in each dodge, and the hidden
  "revenge value" that makes a boss break out of a combo), with CritPoints and Wikipedia.
- **Ocarina of Time:** Iwata Asks for Ocarina 3D (volumes 2 to 5, on nintendo.com), the 1998 "1101" interviews
  translated on glitterberri.com, Miyamoto's 1999 interview on shmuplations, the speedrunners' measured movement
  speeds, the game's decompiled source (the Stalfos and the player), Game Developer and Wikipedia.

## What could not be read
The service refused to allow some sites, and some that were allowed would not answer: mariowiki.com, ukikipedia.net,
iwataasks.nintendo.com (the nintendo.com mirror was read instead), nintendolife.com, eurogamer.net, khinsider.com,
kh13.com, zeldadungeon.net, zeldawiki.wiki, soulslore.wikidot.com, amara.org, goombastomp.com, tcrf.net. No video
could be watched, so Game Maker's Toolkit (Boss Keys among it), Matthewmatosis and the GDC talks are known only by
what others wrote about them. Each notes file lists its own gaps at the end.

## How to read a page from here (for whoever does more)
The WebFetch tool cannot reach any site from this environment; `curl` through the proxy can, for the allowed sites.
Allowed now: shmuplations.com, en.wikipedia.org, www.khwiki.com, darksouls.wiki.fextralife.com, www.gamedeveloper.com,
glitterberri.com, critpoints.net, www.zeldaspeedruns.com, www.nintendo.com, raw.githubusercontent.com. More sites
are added in the environment's network settings (on a computer; the phone app could not show the request).

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
| A wall kick | 3.0 high (the source sets a lower speed first, then overwrites it with this one) | 2.5 |
| Time to press jump after touching a wall | 5 frames (0.17 s) | 0.16 s |
| Letting go of jump early | cuts his rise to a quarter | cuts it to a half |
| Grace after running off an edge | none found in the source read | 0.1 s |

What stands out (our reading, not a source's): our knight gets much higher for his size than Mario does, and gets
there with no run-up, anywhere, at any time. Every one of Mario's high jumps has to be earned: by speed, by a second
landing, by a crouch or a turn, or by a wall. That bears on the owner's complaint that he "can just jump over stuff":
it is the levels' walls that have been wrong so far, but the height of the double jump is the other half of it.
Nothing in the game has been changed on the strength of this.
