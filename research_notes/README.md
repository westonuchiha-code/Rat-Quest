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

## Conker's Bad Fur Day: the second pass and the report (2026-11-16)
The first pass (same day, earlier) read Wikipedia and Game Developer and left three notes files. The second pass
checked those notes, read a little more, and wrote `reports/Conker's Bad Fur Day design research.md`. Each notes file
now ends with a dated "Second pass" section. (Rayman 2 had its own second pass the same day: see the next section.)

**What the second pass read**
- Wikipedia's "Conker's Bad Fur Day" again, from its raw text, and checked every quotation the first pass marked READ
  against the pages by machine: all were exact. Also "Conker: Live & Reloaded", "Conker (series)", "Rare", "Rare
  Replay" and "Banjo-Kazooie" again, and new: "Donkey Kong 64" (the collecting Conker turned away from), "Mos Eisley"
  (how the Star Wars cantina, the owner's other reference for the Club, was filled), "Idle animation".
- Game Developer: the 2007 interview with two Rare staff (checked: its "four and a half, five years" IS about
  Conker); an interview with the two makers of Thank Goodness You're Here! (comedy first, the hero as straight man, one button);
  "No Laughing Matter" (Al Lowe, Chuck Jordan, Rhianna Pratchett on comedy in games); the Psychonauts postmortem's
  account of its cutscene editor; an animator's deep dive on Little Kitty, Big City; and blog pieces on
  context-sensitive actions, on wordless (pantomime) scenes, on silent heroes and on overheard lines.
- CritPoints: one essay with a passage on context-sensitive actions.

**What still could not be read**
- **The makers' own words, at first hand.** Chris Seavor's and Chris Marlow's interviews (Kotaku, Nintendo Life,
  Scouse Gamer 88, Splice Today, RareGamer, Retro Gamer, Eurogamer), the 2013 director's commentary and the Rare
  Replay "making of" film (video). Everything they are reported as saying reaches us through Wikipedia.
- **The game itself.** No video could be watched, so nobody here has seen the opening in the pub, the menu, or a
  single pad being used. What is inside the Cock and Plucker is known only from search summaries of fan wikis.
- The Conker wiki, Giant Bomb, TV Tropes, StrategyWiki, GameFAQs, the manual and the official guide (archive.org),
  and the 2001 reviews themselves (IGN, Edge, GameSpot, Next Generation).
- Nothing about Conker or Rare was found on the other reachable sites: shmuplations.com (Japanese developers),
  critpoints.net, glitterberri.com, nintendo.com. iwataasks.nintendo.com was refused.

**For whoever does more:** the sites reachable on 2026-11-16 were en.wikipedia.org, www.gamedeveloper.com,
shmuplations.com, www.nintendo.com, critpoints.net and glitterberri.com (without "www"). Wikipedia's raw text is the
easiest to check quotations against: `curl -G https://en.wikipedia.org/w/index.php --data-urlencode "title=..."
--data-urlencode "action=raw"`. Game Developer has a working site search (`/search?q=...`). shmuplations.com answers
plain `curl` but answered 403 when sent a browser's User-Agent line. The first sites to ask for, if more can be
allowed: www.scousegamer88.com (a three-part interview with Seavor), www.nintendolife.com, kotaku.com,
www.raregamer.co.uk, conker.fandom.com, and YouTube for the commentary.

## Rayman 2: the second pass (2026-11-16)

The first pass (same day, earlier) left three notes files and no report; its researcher was cut off as it finished.
The second pass checked those files, read what the reachable sites hold, appended a "Second pass, 2026-11-16" section
to each notes file, and wrote `reports/Rayman 2 design research.md`.

**The first-pass files:** all three are COMPLETE (each ends with a finished "Ideas" list; the last file written,
`development_world_and_characters.md`, is whole). Every quotation they mark READ was checked against Wikipedia's raw
text and Game Developer's pages and is exact. Three things in them to read with care, all noted in the files: the
"Basis, variety, rhythm" line is Ancel on the FIRST Rayman and on games in general; the level-design award is less
sure than it looks (below); and several of their closing "Ideas" break the owner's standing rules (a camera that
takes itself to a chosen angle, easier obstacles on a ride, a glide, breaks on foot in the Long Drop). The report
says what survives of each.

**What the second pass read**
- Wikipedia, from raw text: "Rayman 2: The Great Escape" in full again; "Rayman 3: Hoodlum Havoc" in full; "Game
  Developers Choice Awards"; "Donald Duck: Goin' Quackers" (built on Rayman 2's engine); "Platformer"; "Nintendo
  Classics"; and looked for, and found no article on, Serge Hascoët, Olivier Palmieri, Pauline Jacquey or Éric
  Chevalier.
- Game Developer: **a 2002 excerpt from Marc Saltzman's "Game Design: Secrets of the Sages" with Michel Ancel on
  Rayman's set pieces ("being chased by a pirate spaceship"), on character and on tuning controls: the only maker's
  statement about this game read in full.** Also the 2011 Ancel interview and the three Rayman Origins design pieces
  again, in full; a 2017 interview with Ubisoft's chief executive (the team was split between Montpellier and
  Paris); and two players' analyses of Rayman Origins and Rayman Legends. Its site search was tried with about
  thirty queries: **it holds no postmortem of Rayman 2.**
- CritPoints (opinion; nothing there is about Rayman 2): "Pacing and Games", a reply on Crash Bandicoot (the camera
  for a run-forward level), "Building Deep Traversal Systems", and a review of The Big Catch: Tacklebox (a 3D
  platformer with no way to stall a fall).
- By search summary only: more of the GamesRadar piece (Palmieri on updrafts, on walking past an edge), a scan of
  the N64 manual (buttons), speedrun notes (the hover, ledges, climbing, the slide into the first boss), and the
  RayWiki on "the General".

**What still could not be read**
- **The level designer's own account**: the GamesRadar retrospective of 28 December 2025 with Olivier Palmieri. It is
  the source of the game's best-known design statements and everything from it here is a search summary.
- Retro Gamer 275 ("The Making of Rayman 2"), the game's digital press kit, the "Q64" interview with Ancel (on the
  RaymanPC forum), a TechRadar retrospective, and the Double Fine "Devs Play" video with Ancel.
- **The levels themselves.** RayWiki, Speed Demos Archive, GameFAQs, StrategyWiki and the N64 manual (archive.org)
  were all refused, and no video could be watched. So no ride or slide was timed, the controls on each ride are
  known only in fragments, and where a crash puts Rayman back was never found. There is no public source code, so
  there are no movement numbers of the kind the Mario 64 research has.
- **One unsettled fact:** Wikipedia's Rayman 2 article says it won "Excellence in Level Design (2001)" at the Game
  Developers Choice Awards; Wikipedia's article on those awards lists only American McGee's Alice for that year. A
  search summary of the organiser's archive (gamechoiceawards.com, refused) suggests several teams were honoured,
  Ancel's among them. Not checked.
- Nothing on Rayman was found on shmuplations.com, glitterberri.com or nintendo.com (a trademark line only).
  iwataasks.nintendo.com failed its certificate check and was left alone.

**The first sites to ask for, if more can be allowed:** www.gamesradar.com, raymanpc.com (the wiki and the forum),
kb.speeddemosarchive.com, archive.org (the manual), discmaster.textfiles.com (the press kit), www.techradar.com.
