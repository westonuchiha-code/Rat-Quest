# Super Mario 64 (Nintendo EAD, 1996): development history and design process

**Method note (second pass):** Rewritten after reading in full, via the fetch helper: Shmuplations' 1996 strategy-guide interviews (all ~28k chars), Shmuplations Miyamoto x Eno (1996) and Miyamoto x Nagoshi (1999) (keyword-filtered, not read end to end), Shmuplations Mario 20th (grep only; nothing useful on Mario 64 design), Game Developer's MIGS 2007 Koizumi keynote report (all), and Wikipedia's Super Mario 64 page (first ~20k chars: infobox, Development, Release). NOT read: Iwata Asks (host unreachable), Nintendo Life, Source Gaming/Goddard interviews, TCRF, Ukikipedia. Goddard and Kawagoe material below is only via Wikipedia (secondary). Short quotes are verbatim from the translated pages; the Shmuplations text is a fan translation of Japanese strategy-guide interviews.

Primary-source URLs:
- S1 = https://shmuplations.com/mario64/ (two 1996 interviews: Miyamoto solo, and a roundtable with Miyamoto, Tezuka, Koizumi, Yajima, Nishida, Tanimoto)
- S2 = https://shmuplations.com/miyamotoxeno/ (July 1996)
- S3 = https://shmuplations.com/miyamotoxnagoshi/ (1999)
- G1 = https://www.gamedeveloper.com/game-platforms/migs-2007-nintendo-s-koizumi-on-the-path-from-garden-to-i-galaxy-i- (Koizumi, MIGS, 27 Nov 2007, reported by Brandon Boyer and Leigh Alexander)
- W = https://en.wikipedia.org/wiki/Super_Mario_64

## Order of development: movement and camera first, in a test area

### Takeaway
Miyamoto says the project began as a tiny "lego-like blocks" room where Mario and Luigi were tuned with the analogue 3D stick and a camera-change button; once that felt good "we knew we were halfway there". About half of total effort went into this base system; courses and enemies were built last "in a single burst". The rabbit is real but the "garden" is Koizumi's later metaphor, and no source I read gives a duration for the sandbox phase.

### Cited Findings
- Roundtable, Miyamoto on how the project started: "we were working on something really simple—deceptively simple... There was a room made of simple lego-like blocks, and Mario and Luigi could run around in there, climb slopes, jump around". "We were trying to get the controls right with an analogue 3D stick, and once that felt smooth, we knew we were halfway there." — [S1]
- Then "we realized [we] wanted to create a slightly larger area for them to move around in" (interviewer: "I don't know if 'slightly' is the right word"; Miyamoto: "that's how it is with all our developments"). — [S1]
- Hardware did not exist yet: "we developed it in tandem with the N64 hardware", so "at the very beginning, we actually did our work on a large, powerful computer that simulated what we guessed the N64 hardware specs would be". The prototype ran on a machine costing "tens of thousands of dollars"; when the real N64 prototype arrived "it handled the movement and controls almost perfectly. That was the moment we first realized this was going to work, so we quickly dashed off a planning spec sheet". Staff "said they'd been lied to" about the size. — [S1]
- Miyamoto's stated method: "we get the fundamentals solid first, then do as much with that core concept as our time and ambition will allow." The fundamental basis was "being able to move Mario and Luigi around with the 3D control stick, and being able to change the camera view with the press of a button." — [S1]
- On proportion of effort: "We spent about half our time and energy designing the basic system... As for the courses and enemies, those actually came at the very end. They were done in a single burst of energy, just thrown together, almost." — Miyamoto, [S1]
- Wikipedia: production began 7 Sept 1994 and ended 20 May 1996 (cites Nintendo-related source, not checked); "about one year on design and twenty months on production, starting with the virtual camera system"; Miyamoto says team of "around fifteen to twenty people"; "Development began with the characters and the camera system; months were spent selecting a view and layout"; "before levels were created, [the team] tested and refined Mario's animations on a simple grid" (cites Goddard-related source ref 42). — [W]
- Wikipedia: first run "on an SGI Onyx emulator, which only emulated the console's application programming interface and not its hardware"; "The first test scenario for controls and physics involved Mario interacting with a golden rabbit, named 'MIPS'... the rabbit was included in the final game as a Power Star holder." — [W] (secondary; underlying citation not checked)
- Wikipedia: original concept was "the fixed path of an isometric game such as Super Mario RPG", moving to free-roaming 3D, with some linear paths (per Giles Goddard). — [W]
- Origin: Wikipedia says Miyamoto conceived 3D Mario during Star Fox (1993), considered a Super FX "Super Mario FX" with "an entire world in miniature, like miniature trains", and moved the idea to N64 "not for its greater power but because its controller has more buttons". Dylan Cuthbert says Super Mario FX was a chip codename, not a game. — [W]. In S1, the Miyamoto solo interview contains an image caption about a Mario Paint-style tool for a new Super FX chip and says Mario's skin/face animation "came from a prototype for Mario Paint 3D". — [S1]
- Space World Nov 1995 demo was a playable build; Wikipedia says it was ~50% complete. — [W]

### Inferences
- The sandbox was a deliberate gate: nothing scaled up until stick-controlled movement and camera felt good, and the spec sheet was only written after it ran on real hardware.
- "Half the time on the base system, courses in one burst" implies course production was fast because tools and character were finished first.

### Gaps
- No duration found for the test-room phase. The "garden with Mario and a rabbit" as a named stage is not in S1; the MIPS rabbit test is only in Wikipedia (secondary). Wikipedia's "simple grid" and Miyamoto's "lego-like blocks room" are plausibly the same thing, but that identification is mine.
- Nothing from Tezuka on this phase.

## Key people and roles

### Takeaway
Miyamoto directed and produced; Tezuka and Koizumi were assistant directors; Nishida (system programmer) and Koizumi did Mario's movement; Yamada led course design; Kawagoe wrote the camera (Wikipedia); Goddard wrote the title face.

### Cited Findings
- Roundtable roster: Miyamoto Director/Producer; Tezuka Assistant Director; Koizumi Assistant Director; Hajime Yajima Programmer; Yasunari Nishida System Programmer; Yoshinori Tanimoto System Programmer. — [S1]
- "Koizumi created the animation data, and I did the programming" (Nishida). Miyamoto: "That was all done by Nishida and Koizumi." — [S1]
- Course director Yoichi Yamada made quick sketches from Miyamoto's ideas; "Yamada and the other level designers then would refer back to those notes while designing the levels with our software development tools." — Miyamoto, [S1]
- Tanimoto programmed the ripple effect when Mario hits a wall or jumps through a painting. Yajima wanted persistent destructible terrain. — [S1]
- Wikipedia credits: designers Yamada, Yasuhisa Yamamura, Tezuka, Kenta Usui, Naoki Mori, Yoshiki Haruhana, Makoto Miyanaga, Katsuhiko Kanno; programmers include Nishida, Tanimoto, Yajima, Daiki Iwamoto, Toshio Iwawaki, Takumi Kawagoe, Giles Goddard; artists include Shigefumi Hino, Hisashi Nogami, Koizumi, Hideki Fujii, Satoru Takizawa, Tomoaki Kuroume, Yusuke Nakano; Yoichi Kotabe directed character models; Koji Kondo music. Kawagoe's camera drew on his Star Fox 2 camera and cutscene work; Goddard programmed the interactive title-screen Mario face; models made in "N-World", an SGI-based toolkit. Goddard says stress made some programmers quit or move. — [W]
- Koizumi (MIGS 2007): his first step "was Mario's first step – it began with making the character walk"; he made a Mario motion model, textures and a few actions. He recalled Miyamoto acting out animations himself late at night. — [G1]

### Inferences
- Role split: designers (Miyamoto/Tezuka) set direction; animator + system programmer pair (Koizumi/Nishida) iterated Mario directly.

### Gaps
- Not read: Goddard's own interviews; his and Kawagoe's roles are via Wikipedia only. The individual course-to-designer mapping was not found.

## Analog stick, controller, readability for 3D newcomers

### Takeaway
The stick came first and set the pace: slow acceleration was an intentional "change the culture" choice that early show-goers disliked. Jump forgiveness, drop-shadows, landmarks, and a camera that explains itself were the readability tools.

### Cited Findings
- On stick difficulty: at the November 1995 expo "we heard a lot of people say 'I don't know about this, the controls feel really wobbly and slippery...' We weren't about to back down that easily"; "internally, I was a little worried... normally games have a faster pace"; "we really did want to change the culture of gaming... And that's reflected in the controls, and how long it takes to accelerate." Later: "We tightened the springs a bit on Mario, maybe? I don't know." — Miyamoto, [S1]
- Jumping: "Implementing jumping in 3D is really difficult... we had to design the levels so that as long as your jump was 'close enough', you'd make it; it was too hard for the player to judge. This was a design change we made in the middle of the development, when the game was far already very complete. There was a lot of booing from the staff." — Miyamoto, [S1]
- Mario's movement built on a hand-made skeleton: "We tried out a lot of different things using motion capture, but ultimately we ended up doing it all by hand"; hips as the origin of movement, "with the correct sense of weight in the body"; "With 3D, little 'lies' like that can go unnoticed. So we lied a lot!" Reference cited jokingly: Arale-chan. — Miyamoto, [S1]
- Physics: Nishida: "It's not actually 'real' physics... if you rely on the actual laws of physics too much it doesn't really make for a good game." Miyamoto: car-like, human-like and plane-like motion each needed different calculations. — [S1]
- Animation breadth: 193 animation patterns, ~50 rejected (nearly 250 made). Miyamoto: "as players got good at the controls, they'd want to try out more and more button combinations... So we created movements for all button combinations". Koizumi: the crouching trip kick was for small enemies that were never added. — [S1]
- Koizumi on 3D problems (depth perception, getting lost, motion sickness): "We decided to drop a shadow on the ground everywhere in Mario 64... every floating object would have a reference point on the ground"; it "might not be realistic, but it's much easier to play with the shadow directly below". For orientation: "we included large landmarks so players could orient themselves without stopping." (Speaking in 2007 about the series; the landmark remark is not explicitly about Mario 64 only.) — [G1]
- Koizumi: "if Mario couldn't jump, even the lowly Goomba would be unstoppable" and calls the approach "player-based design". — [G1]
- Miyamoto 1999 on the controller: the N64 controller feeling "specifically made for Super Mario 64" is "a problem" because it should serve other games; the "3D stick being the middle" was what was "lacking"; next console should have the stick on the left. — [S3]
- Eno (July 1996) said he thought the B-dash ideal "had finally been fully realized" with the 3D stick (Eno's opinion, not a developer statement). — [S2]
- Wikipedia: Miyamoto wanted Mario to "create the feeling of controlling something that's really alive", inspired by letting his pet hamster loose. — [W] (secondary)

### Inferences
- The "unscored" jump tolerance plus shadows plus landmarks are three layered answers to the same problem (judging 3D space on a TV).

### Gaps
- Nothing found on specific dead-zone/ramp-up numbers or tutorial design for first-time 3D players beyond the above.

## Camera (Lakitu)

### Takeaway
Camera was one of the two first-built pillars, with a button to change view. Koizumi lists the camera types considered; Miyamoto admits in 1996 that many users thought it moved "chaotically". Lakitu rationale and patent anecdote are NOT verified in primary text I read.

### Cited Findings
- "being able to change the camera view with the press of a button" was part of the foundation. — Miyamoto, [S1]
- Koizumi: Miyamoto said "the greatest appeal of working on 3d games is the camera"; "During Mario 64, we had to ask, 'what kind of camera is best suited for this gameplay?'" Types considered: parallel camera (easiest, resembles 2D), tower camera (straight-on side view), follow camera; others for flying and swimming. "Thinking about the camera is game design, too." — [G1]
- Koizumi on later titles: free camera control in Sunshine and Ocarina made "the overall control scheme too complex" and "we divided the group of people that might have enjoyed the game"; Galaxy's goal was to "play without ever having to think about the camera". A "vertical shake cushion" limits camera pitch to reduce motion sickness (described alongside Mario games generally). — [G1]
- Miyamoto (July 1996): "we get a lot of users saying it moves around chaotically on its own and makes the game hard to play, or that they could design a better camera themselves. It turns out people who know absolutely nothing about 3D are the ones who tell me the camera is interesting." Eno called the camera "incredibly excellent" but disliked post-boss/stage-clear framing. — [S2]
- Spectators: Miyamoto notes people watching shout "move the camera over there!" and he is happy onlookers join the creativity. — [S1]
- Wikipedia: camera programmed by Takumi Kawagoe; reviewers criticised the camera; Lakitu operates the camera. — [W]

### Inferences
- The team treated camera as a gameplay variable, not a post-process; the later cost (camera complexity, motion sickness) is documented by Koizumi for Sunshine/OoT rather than as an explicit "regret" about Mario 64.

### Gaps
- Not verified from primary text: Lakitu as Miyamoto's idea, the Sega camera-patent story, Goddard's months of camera experiments (only seen in search summaries earlier). Needs Source Gaming/Pixelatron.
- No explicit "what we'd do differently" quote about the Mario 64 camera found.

## Cut and changed content

### Takeaway
Luigi was in until February 1996 and was cut for memory (and one-controller reasons); Yoshi event, rabbit throw, monkeys, more toys were cut; shipped 15 courses versus a 32-course Space World build.

### Cited Findings
- Luigi: "until February, he was in the game. (laughs) Ultimately, due to memory issues, we had to take him out." A Mario Bros.-style minigame was considered but dropped "because most users probably only have that one controller when they first buy their N64". Two-player Mario/Luigi: "if we had done it wrong, it would have turned into a fighting game or something... we're leaving that challenge for next time." — Miyamoto, [S1]
- Yoshi: "There was originally an event with Yoshi. We weren't satisfied with how it came out, though, so we removed it... it would be a waste not to use the model... so we included him there at the end." — Miyamoto, [S1]
- Enemies: "Normally we'd include about 80 different enemies, but this time we had just under 40"; theme of "neither friend nor foe" creatures. — [S1]
- Race: first version more deterministic ("run up the mountain in a straight line", Tezuka) did not feel like racing so became freeform; original idea was racing a rabbit, too fast/stressful, so a koopa. — [S1]
- Rabbit: "At first Mario was able to throw the rabbit too... If we had another month, we could have added an animation where Mario tosses the rabbit by the ears". Monkeys appeared in more areas in earlier versions (Tezuka). Koizumi wanted more tools/toys (balls, cars). — [S1]
- Wikipedia: Space World Nov 1995 build "featured thirty-two courses. Miyamoto had hoped to create more, possibly up to forty, but was ultimately reduced to fifteen"; Howard Lincoln says Miyamoto's wish to add more helped drive the N64 delay to summer 1996; Yamauchi: "Game creators can finish games quickly if they compromise..." — [W] (secondary; the 32-course claim should be checked against the original Nintendo sources it cites; note a "course" in the Shoshinkai build may not equal a final course).
- Miyamoto: only "about 60%... maybe only 40%" of N64 capability used. Tezuka: staff wanted a sequel mid-development. Castle system "originally something I thought of for Zelda". — [S1]
- Miyamoto (July 1996, regretful): because Mario and Zelda were planned together "my own personal habits and quirks just bled right into it... it became a matter of wanting to jam in every single idea that seemed interesting", leaving "less room for free, open-ended play". Eno felt the retail build was stricter than the Shoshinkai build. — [S2]

### Inferences
- Cuts were driven by hardware (memory), single-controller reality, and time, not by design failure, except the Yoshi event and course rework.

### Gaps
- No primary source found for the numbers "32 planned courses" beyond Wikipedia. The Super FX-era prototype is only supported as a Star Fox-era idea (Wikipedia); no prototype footage/details.

## "Fun by itself" / hakoniwa (miniature garden) philosophy

### Takeaway
Primary quotes confirm "just moving Mario around was fun" and the diorama/sandbox approach; "miniature garden" is Koizumi's own phrase (MIGS 2007).

### Cited Findings
- "One of our big development themes was letting the players move Mario around any way they wanted. We wanted to make a game where just moving Mario around was fun." — Miyamoto, [S1]
- Yajima: the Z-buffer gave "a chance to play around with Mario in a diorama world, in a very free way... we'd make a ghost house course, and then drop Mario in there and see how it felt to move him around there." — [S1]
- Miyamoto on openness: "That was our big gamble. We thought that half the people would just go straight into the castle, and half would hang out and explore outside... We made the game with that latter half of players in mind." — [S1]
- Koizumi on camera/viewpoint flexibility: players explore plains and mountains "much like I used to find so many surprises, as the miniature gardens one finds in boxes in Japan"; later Sunshine aimed to bring "out in every screen the fun of exploring the miniature garden". — [G1]
- Miyamoto: "An eternal theme for me with game design has been to let the players create their own vision... I want a game that allows players to try come up with their own solutions". — [S1]
- Miyamoto wanted onlookers excited: "for a game to sell, it has to excite the people who are watching the player—it has to make you want to say, 'hey, gimme the controller next!'" — [S1]
- Miyamoto on movie ambitions: "we don't want to make movies—because we're making games." — [S1]

### Inferences
- The test-room-first process and the hakoniwa idea are consistent, but no source I read connects the Japanese word "hakoniwa" to Mario 64 development directly; Koizumi's usage is retrospective (2007).

### Gaps
- Not found: Tezuka or Miyamoto using "hakoniwa" about Mario 64 itself.

## Course creation, stars, playtesting

### Takeaway
Courses were designed from tiny notes and sketches and "sculpted" iteratively inside the game, using in-house tools; children playtested the King Bob-omb stage. Star mission decision process is only partly documented.

### Cited Findings
- No blueprints: "There would only be some concept art sketches, and brief notes/memos." Process: Miyamoto and Yamada talk, Yamada sketches, key elements are written down, designers build with "our software development tools". — Miyamoto, [S1]
- Clay analogy: "It was kind of like sculpting a diorama out of clay. First you make a very general shape"; example: King Bob-omb stage had a river; when testing "the river flows too fast and it sweeps him away... so we swap that river out for a desert valley". "So the form remains the same, but we gradually add more and more ideas". — [S1]
- Tezuka: leftover structures "without any purpose" became e.g. "a little doghouse". Miyamoto doubted some staff ideas on paper (e.g. the Koopa race), "but once they were actually created in-game... 'Ok, I see how this works now.'" — [S1]
- Playtesting: "we had children playtest it. We had a row of about 10 middle schoolers, and had them play around on the King Bob-omb's stage for half a day, while we observed from behind." One was Miyamoto's child, trying "dozens of times" to climb an unclimbable hill; afterwards the kids "said it was fun, and that they wanted to play it again." Miyamoto: "if a game was this fun to play even if you weren't getting anywhere, well, it must be alright." Described as "something we don't usually do". — [S1]
- Stars: Wikipedia: 15 courses with seven stars each (six named missions plus a 100-coin star), 15 more hidden stars, total 120. Stars appear after tasks hinted by course names. — [W]
- Opening: Mario speaks more in US version; "We had more time before the American release". — [S1]

### Inferences
- A small, written-note course pipeline plus live in-game revision was the working "level design tool".

### Gaps
- How individual star missions were chosen: no developer statement found. Tool names beyond N-World (Wikipedia) and a vague "software development tools" not found. Course-by-course designer assignments not found.
