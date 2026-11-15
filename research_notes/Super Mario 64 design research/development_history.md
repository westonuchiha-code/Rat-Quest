# Super Mario 64 (Nintendo EAD, 1996): development history and design process

**STATUS WARNING FOR THE REPORT WRITER:** In this session WebFetch was blocked for every host I tried (shmuplations.com, nintendolife.com, iwataasks.nintendo.com, sourcegaming.info, gamedeveloper.com, en.wikipedia.org all refused/unresolvable; proxy 403). Only WebSearch worked, and it returns model-written summaries of pages, not page text. Everything below is therefore from search-result summaries, NOT from reading the primary pages. No claim here was verified against the full source text, and exact quotes are mostly unavailable. The key primary sources (Shmuplations 1996 interview translation, Source Gaming/Pixelatron Giles Goddard interview, Iwata Asks Mario 25th) need to be fetched once those hosts are allowed in the session network settings. Treat all findings as leads, not confirmed facts.

## Order of development: Mario's movement and camera first, in a test area

### Takeaway
Search summaries of the 1996 Japanese strategy-guide roundtable (translated on Shmuplations) say Miyamoto described the project starting from a small test room built of simple blocks where Mario (and Luigi) could run, climb slopes and jump, tuned before the game was built around it. The "garden with a rabbit/MIPS" account and the time spent on it were NOT found in anything I could access.

### Cited Findings
- Miyamoto, asked how the project started, answered that there was a room made of simple lego-like blocks where Mario and Luigi could run around, climb slopes and jump; the team used it to tweak movement, then built a game around it (search-summary paraphrase, not a verbatim quote) — [Search result summarising Shmuplations/TCRF](https://shmuplations.com/mario64/); see also [TCRF Early Development](https://tcrf.net/Prerelease:Super_Mario_64_(Nintendo_64)/Early_Development)
- TCRF notes it is unknown which "deceptively simple" stage Miyamoto means; other test stages in the leaked iQue source contain slopes, so it may be one of those (secondary, per summary) — [TCRF Early Development](https://tcrf.net/Prerelease:Super_Mario_64_(Nintendo_64)/Early_Development)
- Asked about nuance of Mario's movement, Miyamoto credited Nishida and Koizumi (summary) — [Shmuplations](https://shmuplations.com/mario64/)
- Miyamoto told designers to create as many movements as possible, reportedly leading to nearly 250 animation patterns, 193 used (summary, unattributed to a page; verify) — [Shmuplations](https://shmuplations.com/mario64/)
- One summary says development ran nearly three years: about one year design and twenty months production, starting with designing the virtual camera system (unverified) — [Wikipedia](https://en.wikipedia.org/wiki/Super_Mario_64)
- Miyamoto reportedly conceived 3D Mario while working on Star Fox (1993), and the castle was originally conceived for a 3D Zelda (summary of Wikipedia) — [Wikipedia](https://en.wikipedia.org/wiki/Super_Mario_64)
- Early-development and 1994 prototype material is catalogued at [TCRF 1994](https://tcrf.net/Prerelease:Super_Mario_64_(Nintendo_64)/1994) (not read)

### Inferences
- Consistent with a "build and tune the character in a sandbox first" workflow, but the exact duration is unknown.

### Gaps
- No source found/read for the rabbit (MIPS) garden account, its duration, or exact words of Tezuka/Koizumi on it. The word "garden" and the rabbit link are unverified. Possibly commonly conflated with the later MIPS rabbit in-game character.
- Unclear whether Tezuka said anything on this; the search tool found none.

## Key people and roles

### Takeaway
Only partial: Miyamoto (director/producer), Koizumi (animation of Mario's 3D models, Miyamoto protégé), Nishida (credited with movement nuance), Goddard (programmer: camera experiments, Mario face).

### Cited Findings
- Koizumi began on Mario 64 animating the 3D models with no precedent for many actions (Washington Post interview, per summary) — [search result](https://en.wikipedia.org/wiki/Super_Mario_64)
- Goddard: Mario face demo made with painted ping-pong balls and an SGI Indy camera; Miyamoto asked for it to be playable in-game; also worked on SGI Onyx emulators before N64 hardware existed and months of camera experiments (summary of expanded Pixelatron interview, not opened) — [Source Gaming](https://sourcegaming.info/2017/07/02/gilesinterview/); [Nintendo Life](https://www.nintendolife.com/news/2018/04/marios_stretchy_face_in_mario_64_started_out_as_an_experiment_with_ping_pong_balls)
- Camera code is said to be mostly by Takumi Kawagoe (also Ocarina of Time camera), per Ukikipedia (fan wiki, secondary) — [Ukikipedia Camera](https://www.ukikipedia.net/wiki/Camera)

### Inferences
- None.

### Gaps
- Roles of Tezuka, Yamada and individual course designers: not found.

## Analog stick, controller, readability for 3D newcomers

### Takeaway
One Miyamoto quote surfaced (via summary): 3D jumping is hard, so levels were designed to forgive near-misses.

### Cited Findings
- "Implementing jumping in 3D is really difficult... We had to design the levels so that as long as your jump was 'close enough', you'd make it." — Miyamoto, 1996 (as quoted in a search summary) — [Shmuplations](https://shmuplations.com/mario64/)

### Inferences
- Level geometry was tuned to the jump, not the other way round.

### Gaps
- Nothing found on analog-stick design reasoning or newcomer readability.

## Camera (Lakitu)

### Takeaway
Per Goddard summaries, Miyamoto was unsure how a 3D camera should work; the Lakitu cameraman gave it an in-game explanation; a Sega camera patent scare occurred mid-development.

### Cited Findings
- Miyamoto was not sure at first how a camera should work in 3D; the team settled on a system, and Lakitu supplied the in-game justification; Goddard credits Miyamoto with the Lakitu news-camera idea — [Source Gaming](https://sourcegaming.info/2017/07/02/gilesinterview/)
- Goddard reportedly recalled staff warning mid-development that Sega held a relevant patent (details cut off in the summary) — [Zeli summary](https://zeli.app/story/50036287)

### Inferences
- None.

### Gaps
- What they would do differently, problems encountered: not found; need Goddard/Kawagoe full text.

## Cut and changed content

### Takeaway
Two-player Mario/Luigi was reportedly planned and cut for memory reasons; evidence is mainly fan/secondary.

### Cited Findings
- Playable Luigi implemented early then removed for memory reasons, with a Miyamoto interview cited (secondhand); Space World 1995 footage reportedly shows Luigi; leaked source has a "Luigi" model and "2P camera" — [GamesRadar](https://www.gamesradar.com/after-28-years-the-first-footage-of-a-playable-luigi-in-super-mario-64-has-surfaced-like-a-bigfoot-sighting/); [TheGamer](https://www.thegamer.com/playable-luigi-things-cut-before-super-mario-64-release/)
- Textures were heavily optimised for the RDP 4KB texture cache (summary) — [TheGamer](https://www.thegamer.com/playable-luigi-things-cut-before-super-mario-64-release/)

### Inferences
- None.

### Gaps
- Planned vs shipped course counts, Super FX-era prototype: nothing found (Super FX is SNES hardware; the Star Fox lineage link is the only connection seen).

## "Fun by itself" / hakoniwa philosophy; course creation, stars, playtesting

### Takeaway
No usable findings.

### Cited Findings
- None verified.

### Inferences
- None.

### Gaps
- Not found: hakoniwa statements, course designers/tools, star counts and mission decisions, Miyamoto watching children play. Suggested fetches once network allows: shmuplations.com/mario64, Iwata Asks Mario 25th vol. 2, Source Gaming Goddard interview, Game Developer retrospective, TCRF pages above.
