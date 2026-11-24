# Level 3 spec: The Sleepy Island

**Script:** `docs/levels-and-script.md`, section "Level 3: The Sleepy Island" (see "Changes from the script").
**Branch:** `level-03-sleepy-island`
**Status:** fourth version, to be played and changed with Nadia. There was no spec from the claude.ai side: this one was written while building.

(Renaming it *The Plum Eaters* was tried; Nadia prefers the script's name.)

## The idea

The script's version (walk, dig, pour three buckets on the sailor) is close to Level 2: fetch, carry, fill a meter. So the level is an adventure with the use key, on an island that's fun to play about on: empty hammocks are trampolines, and the treetops can be walked on. There's a raft in the reeds with no rope, no paddle and no sail. Two sleepers are lying on two of them; the third is up a tree. Ichigo is hungry, and the plums are right there.

## How it plays

- **Hungry.** A rice ball in the corner is eaten away over about a minute. Clams (dig where bubbles show in the sand, hold ↓) and oranges (shake the tree twice) take a moment to get. A plum off the ground (↓) fills it at once. Empty: too weak to run; empty for 22 seconds: a new tomorrow.
- **Sleepy.** Each plum makes Ichigo slower, darkens the edges of the screen and lowers the music a semitone. It wears off by itself, 80 seconds a plum (the plum icons drain). Three at once put Ichigo to sleep: a new tomorrow on the shore. What they've found, they keep. A plum each time they're hungry is a plum too many.
- **Plums fall** when Ichigo runs under the trees, and now and then when they walk. The leaves rustle first. One on the head is a bump, and spills a third of a bucket. Nothing is ever eaten except with ↓.
- **Bouncing.** Ichigo can jump properly now. Three hammocks have no one in them. Land on one and it throws them up; press jump as they land and they go higher, three in a row highest of all. A full bucket spills.
- **The treetops** are soft platforms, one-way, all the way across the island. Landing on one shakes a plum (or an orange) out of it. Wasps circle in the gaps: a sting knocks Ichigo back.
- **The blanket** (for a sail) is caught in one treetop. **The kite** is in another: it isn't needed, but it adds the hill behind the house to the way home.
- **The woman** offers a plum. Eat it, or walk on: Ichigo says *uchi* (learned).
- **The fisherman's** hammock hangs on a good rope. Water doesn't wake him ("MM. RAIN."). He used to catch crabs: shown one, carried from the beach in the bucket, he wakes, gives Ichigo the rope, and sits on the grass watching it.
- **The old sailor** sleeps on his paddle. A crab doesn't wake him. Cold water does, if it keeps coming: he dozes off again between buckets. A full bucket is slow, and hopping spills a third of it.
- **Clues.** The second-to-last opening card says what the raft needs, and the corner shows it all along (grey until found). The sleepers talk in their sleep: I USED TO CATCH CRABS; THAT SEA IS COLD. Hints name each step the first time it's possible.
- **The raft:** with all three, ↓, and the current takes it east, right off the screen.

In any order.

## Acceptance checks

- [x] Level 3 starts after Level 2's end panel, and from the list once Level 2 is done.
- [x] Ichigo is a little taller (two pixels of leg; the jersey starts to look short), only from this level on.
- [x] Doing nothing: too hungry, and a new tomorrow. Running under the trees: bumped, nothing eaten. Eating every plum: asleep, and a new tomorrow.
- [x] A plum's sleepiness wears off.
- [x] A new tomorrow keeps the rope and the paddle.
- [x] The level can be won, and the save has *uchi*, the rope, the paddle and the level.
- [x] `python tests/play_level.py` reports no page errors, and Levels 1 and 2 still pass.
- [ ] Played and enjoyed by Nadia.

## Changes from the script

- *The game* (above). The people, the goal (leave), the stakes (three plums) and nearly all the lines are the script's.
- *The raft needs a rope, a paddle and a sail (a blanket).* The rope may be worth remembering in Level 4 (Ichigo cuts it) and Level 5 (the mast).
- *The fisherman* has lines of his own (in `plum.js`). The sailor gains IS IT MORNING? / I'M UP. I'M UP. / ZZ. NO CRABS FOR ME., and his last line is split in two.
- *Cards:* one more at the start, for the raft. (The sailor no longer tells Ichigo about it: he only gives the paddle.)

## Build notes

- Plays in `src/plum.js`, drawn in `src/plumart.js`, numbers in `PLUM` (`config.js`), places in `levels/level03.json`.
- The island is painted once onto one long picture. Hammocks, sleepers and fruit are drawn over it.
- *Grown-ups:* their heads are about the size of Ichigo's; standing, they're a good deal taller. Only the fisherman ever leaves his hammock, and he sits.
- Speech bubbles can carry text now (`say(who, icons, { text })`).
- The music is in the Lullaby's own scale, slow. There are cicadas.

**Tried and dropped:** plums eaten by touching them (annoying: it takes the choice away); a starving Ichigo walking to a plum by themselves; a bucket of sea water on the head to wake up (not clear); bouncing on the sleepers, and tipping a crab into the fisherman's hammock (not something Ichigo would do).

**Open questions:**
- Are plums tempting enough, now they're a choice? (`PLUM.hungry`, `wears`, `eat`)
- Is the bounce's timing right, and the height? (`PLUM.bounce`)
- Are the wasps fair, or in the way?
- Are the bumps on the head fair? (`PLUM.drop`, `bonk`)
- How long does it take a person? Two or three minutes is the aim.
- Should the rope and paddle stay in Ichigo's things after Level 5, when the raft breaks?
