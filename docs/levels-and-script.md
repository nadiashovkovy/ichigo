# Ichigo: Levels and Script

*Exported 23 Nov 2026 from the Claude doc: https://claude.ai/artifact/TYjAzR9HUbgTkLrhpk7TZ4 (the doc is the live copy; this is a snapshot).*

## Overview

Ichigo is 15 short levels. A wave takes a three-year-old out to sea, and they get home at ten. Each level is a different small game, built with the same pieces as Level 1: a side-view pixel scene, Ichigo's sprite, a few other sprites, story cards, speech bubbles, the HUD, and a new tomorrow when Ichigo fails. Level 1 as built is the model for everything here.

**How each level is written up**

- **Game, goal, controls, stakes:** what the player does and what can go wrong.
- **On screen:** the backgrounds and sprites the level needs. Kept to what Level 1's art can do: one scene or a scrolling strip, sprites with a few frames, simple animations (bobbing, swaying, flashing).
- **Beats:** the level in order.
- **Learns / marks / objects:** what Ichigo carries forward.
- **Script:** the story cards, speech lines and hints exactly as they appear in the game, plus a few plain stage directions.

**Voice**

The text should sound like Level 1's cards: "THE SEA CAME FOR THE VILLAGE, AND TOOK EVERYTHING WITH IT." "JUMP FROM WRECK TO WRECK TO REACH IT."

- Story cards state what happened and what to do. Short sentences, present tense, capitals (the pixel font). Two to four cards at the start of a level and one to three at the end.
- No metaphors, no telling the player how to feel, no lessons.
- Other characters say short, ordinary things in their bubbles.
- Ichigo only says the words they've learned, as an icon bubble. In the script: **ICHIGO:** \[icon: house\] *uchi*.
- Stage directions describe only what a sprite or background can show: a pose, a frame, an object appearing, a sound. No faces doing subtle things, and no camera moves.

**Level 0: Prologue** *(built)*. Five story cards over Hokusai prints: the game comes from Gabrielle Zevin's novel; Sadie Green and Sam Masur made it in 1997; a wave takes Ichigo out to sea and they grow up over fifteen levels trying to get home; the look comes from Hokusai; this is a fan-made version. Then Level 1's beach.

## Through-lines

Ichigo gets a new sprite about every two levels, learns one word per level, and keeps three permanent marks. The chin scar from Level 1 is the one that matters in Level 15.

| # | Level | Age | Game | Learns | Permanent mark | Gains / loses |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | The Great Wave | 3 | Beach, then platformer on wreckage | Kaa-chan (mama) | Chin cut (plaster, then scar) | Bucket, red shovel |
| 2 | The Tide Comes In | 3 | Build sand walls against the tide | Umi (sea) |  | A shell |
| 3 | The Sleepy Island | 4 | Side-view adventure with the use key | Uchi (home) |  |  |
| 4 | The One-Eyed Lighthouse | 4 | Stealth | Ichigo (their name) |  |  |
| 5 | The Bag of Winds | 5 | Storm on a raft | Kaze (wind) | Rope burn on the wrist | Loses the red shovel |
| 6 | Ship Graveyard | 5 | Swimming and exploring | Mite (look) |  | Whale-bone shovel |
| 7 | The Kelp Garden | 6 | Rope and lever puzzle rooms | Arigatou (thank you) |  | Paper lantern |
| 8 | Lantern Cave | 6 | Rowing and light puzzles | Sayonara (goodbye) |  | Can hum the Lullaby |
| 9 | Singing Rocks | 7 | Rhythm rowing | Iya (no) |  |  |
| 10 | Whirlpool Strait | 7 | Currents, then climbing | Itai (it hurts) | Scar on the left forearm | Loses the boat |
| 11 | The Fishermen's Island | 8 | Survival and building | Dame (not allowed) |  | Raft |
| 12 | The Kind House | 8 → 9 | Chores through four seasons | Mata ne (see you) |  | Indigo sail; can write their name |
| 13 | The Raft Home | 9 | Sailing, seen from above | Kaeru (go home) |  |  |
| 14 | The Last Storm | 9 → 10 | Platformer on wreckage, heavier Ichigo |  |  | Loses the bucket |
| 15 | Home | 10 | Walking | Tadaima (I'm home) |  |  |

Each game uses the ability Ichigo has just gained: carrying a full bucket at 4, swimming at 5, ropes and rowing at 6, climbing at 7, building at 8, sailing at 9. Per-level fall marks (`SCARS`) still reset each level.

## Level 1: The Great Wave *(built)*

Age 3 · *Odyssey*: the shipwreck

**Game:** a short beach with no danger, then the platformer on rocking wreckage.

**Goal:** dig a hole and fill it with sea water; then cross the wreckage to the island with the stone lantern.

**Controls:** ← → walk, Shift run. Beach: ↓ digs, fills the bucket, pours. Sea: Space jumps.

**Stakes:** at sea, decks tilt and Ichigo slides; straw mats sink; waves grow. Falling in is a new tomorrow at the last carp streamer.

**On screen:** the beach at dusk with the thatched house, pine, boat and sandcastle; the Great Wave; the white; the sea level with wreckage, Fuji and the HUD. Kaa-chan is never seen. Her humming and her bubbles come from the doorway.

**Beats**

1. Story cards over the beach.
2. Ichigo walks toward the water and trips: chin cut, strawberry plaster.
3. Dig, fill, pour. The third pour drains away; the sea pulls back; the wave comes.
4. White, two seconds of silence, story cards.
5. The sea crossing. The boat is a resting place.
6. Level complete: Ichigo sits by the lantern.

**Learns:** Kaa-chan. **Mark:** chin cut. **Objects:** bucket, red shovel.

### Script

STORY CARDS:

> ICHIGO LIVES BY THE SEA WITH KAA-CHAN, THEIR MOTHER, IN A HOUSE WITH A STRAW ROOF.

> EVERY EVENING, WHILE KAA-CHAN MENDS THE NETS AND HUMS, ICHIGO PLAYS IN THE SAND WITH A BUCKET AND SHOVEL.

> <- -> WALK. DOWN ARROW: DIG, FILL THE BUCKET, POUR IT OUT. DIG A HOLE BY THE SANDCASTLE, THEN FILL IT WITH SEA WATER.

The Lullaby comes from the house.

Ichigo trips. A red dot on the chin; the plaster appears.

**KAA-CHAN** (from the doorway): \[icon: strawberry\] \[icon: heart\]

**ICHIGO:** \[icon: Kaa-chan\] *kaa-chan*

Third pour. The water drains. The sea pulls back. The gulls stop.

**KAA-CHAN** (from the doorway): \[icon: Ichigo\] \[icon: arrow\] \[icon: house\]

The wave. White. Silence.

STORY CARDS (on the white):

> THE SEA CAME FOR THE VILLAGE, AND TOOK EVERYTHING WITH IT.

> ICHIGO WAKES ON A PLANK IN THE OPEN SEA. FAR OFF, A STONE LANTERN SHINES ON AN ISLAND.

> JUMP FROM WRECK TO WRECK TO REACH IT. DON'T STAND STILL: WET DECKS TILT, AND ICHIGO SLIDES.

**ICHIGO:** \[icon: Kaa-chan, grey\] *kaa-chan?*

End panel: LEVEL ONE DONE · THE GREAT WAVE · ICHIGO FELL IN THE SEA *n* TIMES · LEARNED: \[Kaa-chan\]

## Level 2: The Tide Comes In

Age 3 · *Odyssey*: leaving home

**Game:** a one-screen side view of the lantern island at night. The tide rises in waves; Ichigo builds sand walls to keep it off the patch of sand around the lantern. Then a short run across a sandbar at dawn.

**Goal:** keep the lantern patch dry until morning, then cross the sandbar before the tide comes back.

**Controls:** ← → walk, Shift run. ↓ next to dry sand: dig and pile a wall (hold). ↓ standing in water: scoop it with the bucket and tip it out over the wall.

**Stakes:** waves come in sets of three, each set higher. Each wave knocks a wall down a little. Crabs come out between sets and walk along the walls, knocking pieces off. If water reaches the lantern, it's a new tomorrow at the start of that set. On the sandbar, the water closes in from both sides.

**On screen:** the island from Level 1's end, at night: rock, sand, the lantern lit. Walls as stacked sand blocks in three heights. Crab sprite (2 walk frames). A wave sprite that rolls in from the right. A moon. A sun at dawn. The sandbar as a strip of sand that shrinks.

**Beats**

1. Sets 1–3: learn to pile walls.
2. Crabs appear.
3. Sets 4–6: the water rises past the outer walls; build a smaller ring closer to the lantern.
4. Dawn. The tide goes out and the sandbar appears.
5. The sandbar run. A shell on the way; picking it up costs a second.

**Learns:** Umi. **Objects:** a shell (if picked up).

### Script

STORY CARDS:

> ICHIGO SLEEPS NEXT TO THE STONE LANTERN.

> IN THE NIGHT, THE TIDE COMES IN.

> DOWN ARROW: PILE UP SAND. BUILD WALLS TO KEEP THE WATER AWAY FROM THE LANTERN UNTIL MORNING.

A wave washes up to Ichigo's feet and goes back.

**ICHIGO:** \[icon: wave\] *umi*

First crab: HINT: CRABS KNOCK WALLS DOWN.

Dawn. The water drains off the island.

STORY CARDS:

> IN THE MORNING THE TIDE GOES OUT. A SANDBAR LEADS TO A BIGGER ISLAND.

> CROSS IT BEFORE THE WATER COMES BACK.

Ichigo reaches the island as the sandbar goes under.

End panel: LEVEL TWO DONE · THE TIDE COMES IN · LEARNED: \[wave\]

## Level 3: The Sleepy Island

Age 4 · *Odyssey*: the Lotus-eaters

**Game:** a side-scrolling island, about three screens wide, played like Level 1's beach: walk, and ↓ to use things. No jumping puzzles.

**Goal:** find food that isn't plums, then wake the old sailor so he'll show Ichigo his raft.

**Controls:** ← → walk. ↓: dig, pick up, fill the bucket, pour, eat. A full bucket is slower (Ichigo is four now and can carry it, but not run).

**Stakes:** a hunger icon in the HUD empties over time. Plums fill it at once but make Ichigo sleepy: after each plum the screen dims a step and Ichigo walks slower. Three plums and Ichigo falls asleep under the trees: a new tomorrow on the shore. Clams (dig at the waterline) and oranges (shake the tree twice) fill it slowly.

**On screen:** a warm island: plum trees with purple fruit, three hammocks with sleeping castaways (2-frame breathing), reeds at the east end, the sea at the bottom. Ichigo's age-4 sprite: a little taller.

**Beats**

1. The castaways offer plums.
2. Find clams and oranges.
3. The old sailor won't wake. Cold sea water wakes him for a moment.
4. Three buckets of water, one after another, before he dozes off again.
5. He shows the raft in the reeds. Ichigo leaves; he stays.

**Learns:** Uchi.

### Script

STORY CARDS:

> ICHIGO IS FOUR NOW.

> THE BIG ISLAND HAS PLUM TREES, AND A FEW PEOPLE WHO ARRIVED HERE BY BOAT A LONG TIME AGO. THEY DON'T DO MUCH.

> ICHIGO IS HUNGRY. DOWN ARROW: PICK UP, DIG, EAT.

**WOMAN** (in a hammock, holding out a plum): HAVE ONE. YOU CAN STAY HERE.

If Ichigo eats a plum, the screen dims a step.

If Ichigo walks away instead:

**ICHIGO:** \[icon: house\] *uchi*

**WOMAN:** EVERYONE SAYS THAT AT FIRST.

First splash of water on the old sailor:

**OLD SAILOR:** HUH? WHERE'S MY BOAT? (He falls back asleep.)

Third splash:

**OLD SAILOR:** ALL RIGHT, I'M AWAKE. YOU WANT TO LEAVE? THERE'S A RAFT IN THE REEDS. IT'S YOURS. I'M TOO OLD TO GO.

STORY CARDS:

> ICHIGO PUSHES THE RAFT OUT. THE CURRENT TAKES IT EAST.

> BY NIGHT THERE IS A LIGHTHOUSE AHEAD.

End panel: LEVEL THREE DONE · THE SLEEPY ISLAND · LEARNED: \[house\]

## Level 4: The One-Eyed Lighthouse

Age 4 · *Odyssey*: the Cyclops

**Game:** stealth, side view, one long strip: the lighthouse storeroom, the rocks, the boathouse.

**Goal:** get out of the storeroom, cross the rocks, cut the raft loose in the boathouse, and paddle away.

**Controls:** ← → walk, Shift run, Space jump. ↓ standing still: hide under the bucket. ↓ at the rope: cut it with the shovel (three times).

**Stakes:** the lighthouse beam sweeps the rocks on a steady cycle. The keeper walks a route with a lantern. He has a patch over one eye, so he can't see Ichigo on that side. Running is loud: if Ichigo runs near him, he turns. Caught = the keeper carries Ichigo back to the storeroom (a new tomorrow there).

**On screen:** a tall lighthouse with a turning light, a storeroom with shelves of washed-up things (sandals, a bell, bottles), wet rocks, a boathouse with the raft tied up. The keeper: a big man in a coat with an eye patch (walk, turn, sleep frames). The beam as a pale band that slides across the screen.

**Beats**

1. The keeper finds Ichigo and puts them on a shelf in the storeroom.
2. Out through a gap under the door (only a small child fits).
3. The rocks: the beam, the keeper's route, places to hide.
4. The boathouse: the keeper is asleep. Cut the rope between snores.
5. Paddle out of the beam's reach.

**Learns:** Ichigo (their own name).

### Script

STORY CARDS:

> THE RAFT LANDS ON THE ROCKS BELOW THE LIGHTHOUSE.

> A MAN LIVES THERE ALONE. HE KEEPS EVERYTHING THE SEA WASHES UP.

**KEEPER:** WHAT'S THIS? WHAT'S YOUR NAME?

Ichigo's bubble is empty.

**KEEPER:** NO NAME. THEN YOU GO ON THE SHELF.

STORY CARDS:

> THE KEEPER PUTS ICHIGO IN HIS STOREROOM, AND TAKES THE RAFT TO HIS BOATHOUSE.

> GET THE RAFT BACK. STAY OUT OF THE LIGHT. HE CAN'T SEE ON THE SIDE WITH THE PATCH.

HINT: DOWN ARROW: HIDE UNDER THE BUCKET.

When the keeper catches Ichigo:

**KEEPER:** BACK ON THE SHELF.

The rope parts. The raft slides into the water. The keeper wakes up in the doorway.

**KEEPER:** HEY! WHAT'S YOUR NAME?

**ICHIGO:** \[icon: strawberry\] *ichigo*

**KEEPER:** ICHIGO! COME BACK!

The beam turns down onto the water. The wind picks up.

End panel: LEVEL FOUR DONE · THE ONE-EYED LIGHTHOUSE · LEARNED: \[strawberry\]

## Level 5: The Bag of Winds

Age 5 · *Odyssey*: Aeolus

**Game:** one raft on one screen in a storm. The raft tilts and takes on water; Ichigo keeps it level and dry for three phases, about four minutes.

**Goal:** stay on the raft until the storm ends.

**Controls:** ← → walk along the raft to balance it. Space jumps (over sliding crates). ↓ at the mast: hold the rope through a gust. ↓ in a puddle: bail with the bucket.

**Stakes:** gusts push Ichigo off unless they're holding the rope. Water on deck makes the raft sit lower; too much and a wave washes over it. The raft tilts toward whichever end Ichigo stands on, as the wreckage does in Level 1. A flash of lightning shows the next big wave a second early. Washed off = a new tomorrow at the start of the phase.

**On screen:** a small round island with one pine hung with cloth bags; the wind-keeper (a small old woman); the raft with a short mast; a dark sky; rain as falling pixel lines; a gust shown as foam lines blowing across before it hits; a white flash for lightning.

**Beats**

1. The wind-keeper gives Ichigo a tied bag and a good wind.
2. Ichigo opens the bag.
3. Phase 1, wind: hold the rope through gusts.
4. Phase 2, rain: bail between gusts; crates slide.
5. Phase 3, big waves: lightning, then waves; the last one breaks the raft. The red shovel sinks.

**Learns:** Kaze. **Mark:** rope burn on the wrist. **Loses:** the red shovel.

### Script

STORY CARDS:

> ICHIGO IS FIVE.

> ON A SMALL ISLAND LIVES AN OLD WOMAN WHO KEEPS THE WINDS IN BAGS.

**WIND-KEEPER:** THE BAD WINDS ARE IN THIS ONE. DON'T OPEN IT. I'LL SEND YOU A GOOD ONE.

The sail fills. Mountains and roofs appear on the horizon.

Ichigo takes the shell from the bucket and opens the bag to put it in.

**ICHIGO:** \[icon: wind\] *kaze*

The sky goes dark.

STORY CARDS:

> THE BAD WINDS GET OUT. THE RAFT IS BLOWN BACK OUT TO SEA.

> DOWN ARROW AT THE MAST: HOLD ON. DOWN ARROW IN WATER: BAIL. KEEP THE RAFT LEVEL.

First gust while holding the rope: a red mark appears on Ichigo's wrist and stays.

The last wave. The raft breaks into planks. The red shovel sinks.

STORY CARDS:

> THE STORM CARRIES ICHIGO TO A PLACE WHERE OLD SHIPS HAVE SUNK.

> THE RED SHOVEL IS GONE.

End panel: LEVEL FIVE DONE · THE BAG OF WINDS · LEARNED: \[wind\]

## Level 6: Ship Graveyard

Age 5 · *Odyssey*: none

**Game:** side-view swimming and exploring. Sunken ship decks above the water, hulls below, joined into one map a few screens wide and deep.

**Goal:** find something to dig with, then dig out the sand blocking the gap in the reef.

**Controls:** on deck: ← → walk, Space jump. Walk off an edge to dive. In water: arrow keys swim in any direction. ↓ on sand: dig.

**Stakes:** a breath bubble over Ichigo shrinks underwater; reach an air pocket inside a hull or the surface to refill it. Run out = a new tomorrow at the last air pocket. Eels poke out of portholes on a cycle and push Ichigo back. Some portholes are too small for Ichigo at five, so the route goes round.

**On screen:** grey wrecks, masts above the water, dark hulls below with small lit air pockets, a whale skeleton across the reef, an eel sprite (2 frames), a large old turtle that swims slowly. Darker the deeper you go.

**Beats**

1. Decks and the first dive.
2. The turtle. Following her shows the way to air pockets.
3. The deep hold, with eels.
4. The whale skeleton. Its shoulder blade works as a shovel.
5. Dig the gap clear in three dives.
6. Swim through. The turtle carries Ichigo on.

**Learns:** Mite. **Objects:** whale-bone shovel (it replaces the red one).

### Script

STORY CARDS:

> OLD SHIPS SIT ON THE BOTTOM HERE. SOME STICK OUT OF THE WATER.

> THE ONLY WAY OUT IS A GAP IN THE REEF, AND IT'S FULL OF SAND. ICHIGO NEEDS SOMETHING TO DIG WITH.

> ICHIGO CAN SWIM NOW, BUT NOT FOR LONG. FIND AIR INSIDE THE SHIPS.

HINT: ARROW KEYS: SWIM.

The turtle swims past slowly and waits.

At the whale skeleton, Ichigo picks up the shoulder blade and holds it up toward the turtle.

**ICHIGO:** \[icon: eye\] *mite!*

The last of the sand moves. The gap opens.

STORY CARDS:

> THE TURTLE TAKES ICHIGO ON HER BACK, TO A LAGOON FULL OF KELP.

End panel: LEVEL SIX DONE · SHIP GRAVEYARD · LEARNED: \[eye\]

## Level 7: The Kelp Garden

Age 6 · *Odyssey*: Circe

**Game:** puzzle rooms, side view, one screen each, six rooms in a row. Each room has a tank with a gate; open it with ropes, levers, floats and buckets of water as weights.

**Goal:** open every tank gate, then reach the gardener's house.

**Controls:** ← → walk, Space jump, arrow keys swim. ↓ at a rope or lever: pull it (Ichigo is six now and strong enough). ↓ at water: fill the bucket; ↓ at a hanging basket: pour it in to weigh it down.

**Stakes:** the water in each room rises on a timer, so a lever that's easy to reach at first ends up underwater, and the room takes longer. The gardener walks through the rooms. If she reaches Ichigo, she carries them back to the room's door: a new tomorrow there.

**On screen:** a shallow lagoon with stone tanks, reed gates, ropes over wooden beams, levers, floats. In the tanks: a fish, a crab, an octopus, a seal (each with 2 swim frames). The gardener: a woman with long green-black hair and a basket. Her house, a big shell on stilts.

**Beats**

1. Room 1: one rope, one gate.
2. Rooms 2–3: bucket counterweights; a lever that only works when the water is high.
3. Rooms 4–6: each freed animal helps in the next room (the octopus holds a rope; the seal pushes a float).
4. The shell house. The gardener lets Ichigo go and gives them a lantern.

**Learns:** Arigatou. **Objects:** paper lantern.

### Script

STORY CARDS:

> ICHIGO IS SIX.

> A WOMAN LIVES IN THE LAGOON. SHE KEEPS SEA ANIMALS IN TANKS, AND SHE WOULD LIKE TO KEEP ICHIGO TOO.

> PULL ROPES AND LEVERS TO OPEN THE TANKS. DON'T LET HER CATCH YOU.

**GARDENER:** YOU CAN STAY HERE. YOU'D BE SAFE. NOTHING EVER CHANGES HERE.

When she catches Ichigo:

**GARDENER:** NOT THAT WAY.

Each freed animal swims once around Ichigo, then waits at the next door.

Inside the shell house:

**GARDENER:** YOU LET THEM ALL OUT.

**GARDENER:** ALL RIGHT. IF YOU WANT TO GO HOME, GO THROUGH THE CAVE. TAKE THIS. IT'S DARK IN THERE.

She gives Ichigo a paper lantern.

**ICHIGO:** \[icon: bow\] *arigatou*

STORY CARDS:

> THE SEAL PUSHES A REED BOAT TO THE STEPS. ICHIGO ROWS TOWARD THE CAVE.

End panel: LEVEL SEVEN DONE · THE KELP GARDEN · LEARNED: \[bow\]

## Level 8: Lantern Cave

Age 6 · *Odyssey*: the underworld

**Game:** a dark cave, side view. Ichigo rows the reed boat along the water and gets out onto ledges. The only light is a circle around Ichigo's lantern. Light puzzles, no enemies.

**Goal:** follow the humming to the middle of the cave.

**Controls:** in the boat: ← → row. On foot: ← → walk, Space jump. ↓: pick up or put down the lantern; push a floating lantern into a nook in the wall; turn a mirror.

**Stakes:** Ichigo's lantern burns down (its circle of light shrinks). Relight it from any floating lantern that's been pushed into its nook. If it goes out, the screen goes black: a new tomorrow at the last lit nook.

**On screen:** black rock, dark water, small paper lanterns floating (each a lit square with a flicker), empty nooks in the walls, shell mirrors that reflect a beam. In the middle, a pool under a hole in the roof with one star showing. Ojii-san: an old bald man with big eyebrows, sitting in a small boat, drawn in pale colours.

**Beats**

1. The cave mouth: many floating lanterns drift in.
2. Push lanterns into nooks to light the way and relight Ichigo's.
3. The mirror room: turn three mirrors to send one beam across.
4. The humming gets louder.
5. The pool. Ojii-san. He hums the Lullaby; Ichigo hums it back.

**Learns:** Sayonara. **Gains:** hum (a new button; needed in Level 9).

### Script

STORY CARDS:

> IN FISHING VILLAGES, PEOPLE SET LANTERNS ON THE WATER FOR THE ONES THE SEA HAS TAKEN.

> THE LANTERNS DRIFT INTO THIS CAVE.

> SOMEWHERE INSIDE, SOMEONE IS HUMMING KAA-CHAN'S SONG.

HINT: DOWN ARROW: PUSH A LANTERN INTO A NOOK.

At the pool, Ichigo rows fast toward the humming.

**ICHIGO:** \[icon: Kaa-chan\] *kaa-chan!*

It's an old man in a boat.

STORY CARD:

> IT'S OJII-SAN. HE MADE NETS IN ICHIGO'S VILLAGE. THE WAVE TOOK HIM TOO.

**OJII-SAN:** LITTLE ICHIGO. YOU GOT BIG.

**OJII-SAN:** YOUR MOTHER ISN'T HERE. SHE'S NOT IN THE CAVE.

**OJII-SAN:** SEE THAT STAR? IT SITS RIGHT OVER OUR HARBOR. KEEP IT IN FRONT OF YOU.

**OJII-SAN:** YOU KNOW THIS SONG. HUM IT WITH ME.

HINT: H: HUM.

The player hums the Lullaby back, note by note.

**OJII-SAN:** THAT'S IT.

His boat drifts to the last empty nook.

**ICHIGO:** \[icon: wave of a hand\] *sayonara*

STORY CARDS:

> ICHIGO ROWS OUT THE OTHER SIDE OF THE CAVE AT DAWN.

End panel: LEVEL EIGHT DONE · LANTERN CAVE · LEARNED: \[wave of a hand\]

## Level 9: Singing Rocks

Age 7 · *Odyssey*: the Sirens

**Game:** a rhythm game. The boat moves right on its own through a field of rocks, side view. The player rows on the beat to steer and hums to block out the birds' song.

**Goal:** get through the rocks without sinking the boat.

**Controls:** ← and → are the two oars. Alternate them on the beat to go straight; press one side twice to turn toward it. H: hum.

**Stakes:** cormorants on the rocks sing the Lullaby slightly wrong (one note changed, the beat dragged). The boat drifts toward any bird that's singing. Humming the right tune on the right beat stops the nearest bird for one phrase. Three hits on rocks sink the boat: a new tomorrow at the last buoy.

**On screen:** a flat grey sea, low black rocks, a cormorant on each (sing and still frames), buoys as checkpoints, Ichigo in the boat with two rowing frames. Beat markers along the bottom of the screen, like notes on a track.

**Beats**

1. Tie on with the kelp rope (a short scene).
2. Open water: rowing on the beat alone.
3. The first singing bird. Learn to hum over it.
4. Many birds, two wrong songs at once.
5. The last, biggest rock. Row past it.

**Learns:** Iya.

### Script

STORY CARDS:

> ICHIGO IS SEVEN.

> BIRDS SIT ON THE ROCKS HERE. THEY SING KAA-CHAN'S SONG, BUT NOT QUITE RIGHT.

> BOATS THAT FOLLOW THEIR SONG END UP ON THE ROCKS.

> <- AND -> ARE THE OARS. ROW ON THE BEAT. H: HUM THE REAL SONG TO DROWN THEM OUT.

Ichigo ties themselves to the seat with the rope.

When the boat hits a rock: a crack, a shake. The rope holds.

At the last rock, the big bird sings the Lullaby louder, and the boat starts to turn toward it.

**ICHIGO:** \[icon: crossed-out hand\] *iya!*

The player rows past.

STORY CARDS:

> PAST THE ROCKS, THE SEA RUNS BETWEEN TWO CLIFFS. THE WATER THERE GOES AROUND IN A CIRCLE.

End panel: LEVEL NINE DONE · SINGING ROCKS · LEARNED: \[crossed-out hand\]

## Level 10: Whirlpool Strait

Age 7 · *Odyssey*: Scylla and Charybdis

**Game:** two parts. First, row through the strait seen from above, riding the currents along the cliff. Then climb the cliff in side view, a vertical level.

**Goal:** get through the strait. The boat won't make it; Ichigo has to climb.

**Controls:** part 1: arrow keys row. Part 2: arrow keys climb from hold to hold; Space jumps to a hold out of reach; ↓ on a ledge rests.

**Stakes:** part 1: the whirlpool pulls harder each time round, and the boat ends up in it whatever the player does (the part ends there). Part 2: a grip bar drains while Ichigo hangs from holds and refills on ledges. Octopus arms reach out of caves on a cycle and knock Ichigo off. A fall drops Ichigo to the last ledge with a carp streamer.

**On screen:** part 1: two cliff edges, the whirlpool as rings of foam turning around a dark middle, foam lines showing currents. Part 2: a tall cliff face with holds, ledges and black cave mouths; an octopus arm (3 frames: out, reaching, back); a pine growing out at the top; the whirlpool below.

**Beats**

1. Row the currents. The whirlpool takes the boat; Ichigo jumps for the cliff.
2. Climb three stretches, each with caves.
3. An arm catches Ichigo's left arm and leaves a long scratch.
4. At the top, Ichigo hangs from a pine root over the whirlpool. The grip bar drains slowly; holding on is all the player can do. The whirlpool stops and the boat comes back up in pieces.
5. Ichigo drops onto a plank and swims it to shore.

**Learns:** Itai. **Mark:** scar on the left forearm. **Loses:** the boat.

### Script

STORY CARDS:

> BETWEEN THE CLIFFS, THE SEA GOES AROUND AND DOWN, LIKE WATER IN A DRAIN.

> KEEP THE BOAT CLOSE TO THE CLIFF. SOMETHING LIVES IN THE CAVES THERE, BUT THE WHIRLPOOL IS WORSE.

The boat is pulled in. Ichigo jumps for the cliff.

STORY CARDS:

> THE BOAT IS GONE. CLIMB.

> ARROW KEYS: CLIMB. REST ON LEDGES BEFORE YOUR GRIP RUNS OUT.

The arm catches Ichigo. A red line appears on their left forearm and stays.

**ICHIGO:** \[icon: jagged line\] *itai*

At the pine:

HINT: HOLD ON.

The whirlpool stops. Planks come up.

STORY CARDS:

> WHEN THE WHIRLPOOL STOPS, ICHIGO LETS GO AND SWIMS A PLANK TO THE NEXT ISLAND.

End panel: LEVEL TEN DONE · WHIRLPOOL STRAIT · LEARNED: \[jagged line\]

## Level 11: The Fishermen's Island

Age 8 · *Odyssey*: the Cattle of the Sun

**Game:** survival and building over five days, side view across one island with day and night. Gather, dig, build.

**Goal:** build a raft before the fishing boats come back on the sixth morning, without going hungry.

**Controls:** ← → walk, Space jump, arrows swim. ↓: pick up (wood, reeds, shells, seaweed), dig (clams; fresh water by the reeds), build (at the raft spot, when Ichigo has what the next step needs).

**Stakes:** a hunger icon and a water icon in the HUD. If either runs out, Ichigo sleeps and the day starts again. The racks of drying fish are full, and taking one fills hunger at once. A post beside them shows a picture: a fish, a hand, a cross. The game never stops the player from taking fish. Foraging is enough to finish, just. The save remembers whether fish were taken.

**On screen:** a long beach with fish-drying racks (silver fish on poles), a cold fire pit, dunes, reeds, a rocky end with clams, driftwood scattered about. A sun that crosses the sky; nights darker with a fire. The raft in four stages. Three fishing boats on day six.

**Beats**

1. Day 1: water, a fire, a shelter.
2. Days 2–3: food runs, the raft's logs.
3. Day 4: hot. Working in the sun too long burns Ichigo's shoulders (a sprite change).
4. Day 5: the mast and the last ropes.
5. Day 6: the boats come back.

**Learns:** Dame. **Objects:** raft.

### Script

STORY CARDS:

> ICHIGO IS EIGHT.

> FISHERMEN USE THIS ISLAND TO DRY THEIR CATCH. THEY ARE AWAY FOR FIVE DAYS.

> BUILD A RAFT. FIND FOOD AND WATER. DOWN ARROW: PICK UP, DIG, BUILD.

At the racks, Ichigo looks at the post.

**ICHIGO:** \[icon: crossed-out fish\] *dame*

Each evening, a card shows the day: DAY 2. DAY 3. DAY 4. DAY 5.

Day 6. The boats land. The captain, a big woman with a towel round her head, counts the racks.

If no fish were taken:

**CAPTAIN:** ALL HERE. YOU DIDN'T TAKE ANY? YOU MUST BE STARVING.

**CAPTAIN:** YOU BUILT THAT RAFT YOURSELF? WHERE ARE YOU GOING?

**ICHIGO:** \[icon: house\] *uchi*

**CAPTAIN:** HOME. NORTH, THEN. TAKE THESE FOR THE WAY.

She gives Ichigo a bundle of fish.

If fish were taken:

**CAPTAIN:** SOMEONE'S BEEN AT OUR FISH. HEY! YOU!

Ichigo pushes the raft off.

STORY CARDS (both):

> ICHIGO SAILS NORTH FOR TWO DAYS. A SQUALL BREAKS THE MAST.

> THE RAFT DRIFTS TO A DOCK BELOW A SMALL HOUSE. AN OLD WOMAN LIVES THERE.

End panel: LEVEL ELEVEN DONE · THE FISHERMEN'S ISLAND · LEARNED: \[crossed-out fish\]

## Level 12: The Kind House

Age 8 → 9 · *Odyssey*: Calypso

**Game:** one year in four seasons, side view of a small house, garden, dock and cove. Each day is one short chore; each evening the player picks where Ichigo goes.

**Goal:** by spring, have the raft rebuilt (in the cove) and the sail finished (on Obaa-san's loom).

**Controls:** ← → walk. ↓ does the chore in front of Ichigo: scatter feed, knock persimmons down, stir the dye, mend a net, trace a letter. In the evening, walk left into the house (an evening with Obaa-san) or right to the cove (an evening on the raft).

**Stakes:** there are 12 evenings in the year. Evenings in the cove build the raft. Evenings with Obaa-san add rows to the sail and teach Ichigo to write their name. Both need six. If one falls short by spring, another season goes by with four more evenings (the level's new tomorrow). Chores can be retried.

**On screen:** the house with a persimmon tree, a chicken run, an indigo dye tub, a loom by the window, the dock, the cove with the raft under reeds. The same scene in four palettes (summer green, autumn orange, winter snow, spring blossom). Obaa-san: small, old, blue hands from the dye (sit, walk, weave frames). Ichigo's age-8 sprite, then age 9 in spring.

**Beats**

1. Summer: Ichigo wakes up in the house. Chickens, the dye tub.
2. Autumn: persimmons, nets.
3. Winter: writing lessons. Obaa-san finds the raft in the cove.
4. Spring: strawberries; Ichigo is nine. The sail.

**Learns:** Mata ne. **Objects:** indigo sail. **Gains:** can write their name.

### Script

STORY CARDS:

> THE OLD WOMAN IS OBAA-SAN. SHE LIVES ALONE AND DYES CLOTH BLUE.

> SHE GIVES ICHIGO A BED AND FOOD, AND WORK TO DO.

> EACH DAY, DO A CHORE. EACH EVENING, CHOOSE: STAY WITH OBAA-SAN, OR WORK ON THE RAFT.

**OBAA-SAN:** EAT FIRST. THEN THE CHICKENS.

A card for each season: SUMMER. AUTUMN. WINTER. SPRING.

Winter, by the fire. A writing chore: trace い, ち, ご.

**OBAA-SAN:** I-CHI-GO. THAT'S YOUR NAME.

Winter morning. Obaa-san is standing in the cove next to the raft.

**OBAA-SAN:** I SEE. A RAFT NEEDS A SAIL.

Spring. A bowl of strawberries on the table.

**OBAA-SAN:** YOU'RE NINE TODAY. HERE, THE SAIL IS DONE.

The sail is indigo, with a white wave on it and いちご in the corner.

At the dock:

**OBAA-SAN:** GO NORTH. COME BACK AND SEE ME SOMETIME.

**ICHIGO:** \[icon: waving hand\] \[icon: house\] *mata ne*

STORY CARDS:

> ICHIGO HAS BEEN AWAY FROM HOME FOR SIX YEARS.

End panel: LEVEL TWELVE DONE · THE KIND HOUSE · LEARNED: \[waving hand\] \[house\]

## Level 13: The Raft Home

Age 9 · *Odyssey*: leaving Calypso

**Game:** sailing, seen from above, across one big sea map. Days pass as the raft sails.

**Goal:** sail north to the coast under the star.

**Controls:** ← → steer. ↑ ↓ let the sail out or pull it in. The raft goes fastest with the wind behind it and slowest straight into it, so sometimes it has to zigzag.

**Stakes:** three water jars on the raft; one empties each day. Rain refills them. Reefs (marked by white water) break a jar if the raft hits them. Fog hides the star. Run out of water = a new tomorrow at the last island passed.

**On screen:** the sea from above in the game's blues; the raft with the indigo sail as a small sprite; short foam lines showing which way the wind blows; small islands; reefs; grey fog banks; at night the sea darkens and the star appears at the top of the screen. Water jars in the HUD.

**Beats**

1. Learn to steer and set the sail.
2. The first night: the star.
3. Islands from earlier levels can be seen on the way (the wind-keeper's pine, the lighthouse beam). The turtle swims alongside for a while and shows the way round a reef.
4. Fog for three days. Steer by the wind lines.
5. Mountains and a coast appear. The sky to the south turns dark.

**Learns:** Kaeru.

### Script

STORY CARDS:

> ICHIGO IS NINE.

> HOME IS NORTH. AT NIGHT, OJII-SAN'S STAR SHOWS THE WAY.

> <- -> STEER. UP AND DOWN: SET THE SAIL. THE WHITE LINES ON THE WATER SHOW THE WIND.

Each morning, a card: DAY 1. DAY 2. And so on.

Passing the lighthouse, if the beam touches the raft:

**KEEPER** (far off): ICHIGO? IS THAT YOU?

The fog clears. A coast and a mountain ahead.

**ICHIGO:** \[icon: arrow into house\] *kaeru*

STORY CARDS:

> THERE IS A STORM COMING UP BEHIND THE RAFT.

End panel: LEVEL THIRTEEN DONE · THE RAFT HOME · LEARNED: \[arrow into house\]

## Level 14: The Last Storm

Age 9 → 10 · *Odyssey*: Poseidon's storm

**Game:** Level 1's platformer again, on wreckage in a storm, with what Ichigo has learned since.

**Goal:** cross from the broken raft to the coast.

**Controls:** Level 1's controls, plus: ↓ at a mast or rope: hold on through a gust (Level 5). Arrow keys swim short gaps (Level 6). Arrow keys climb the side of an upturned hull (Level 10).

**Stakes:** Ichigo is heavier now, so small planks tip and sink much more than in Level 1; use the big pieces and keep moving. Ichigo also runs faster and jumps further. Gusts blow from the side. Lightning shows the next big wave a second early. Falling in can be survived by swimming to the next piece if it's close; otherwise a new tomorrow at the last carp streamer.

**On screen:** Level 1's sea level with a storm sky, rain, and the same wreckage types, plus broken masts with ropes and upturned hulls. Some carp streamers are faded. Ichigo's age-9 sprite. The Great Wave at the end, behind Ichigo.

**Beats**

1. The raft breaks.
2. Planks and crates, as in Level 1, but heavier.
3. Masts and ropes in the gusts.
4. Upturned hulls to climb, and swims between them.
5. Lightning section.
6. The wave comes from behind and carries the wreckage toward the coast. Keep running. The bucket falls off.

**Learns:** nothing new; Ichigo shouts their first word. **Loses:** the yellow bucket.

### Script

STORY CARDS:

> THE STORM BREAKS THE RAFT A DAY FROM HOME.

> ICHIGO IS NINE NOW, AND HEAVIER. SMALL PLANKS WILL TIP AND SINK. USE THE BIG PIECES.

> DOWN ARROW AT A ROPE: HOLD ON. ICHIGO CAN SWIM SHORT GAPS AND CLIMB.

At the end, the wave lifts the wreckage. The bucket slips off Ichigo's wrist and falls into the water.

The coast is ahead.

**ICHIGO:** \[icon: Kaa-chan\] *kaa-chan!*

White.

STORY CARDS (on the white):

> ICHIGO WAKES UP ON A BEACH. THE BUCKET IS GONE.

> UP THE BEACH THERE IS A VILLAGE. THE HOUSES ARE NEW.

End panel: LEVEL FOURTEEN DONE · THE LAST STORM

## Level 15: Home

Age 10 · *Odyssey*: the homecoming

**Game:** a short walk through the rebuilt village, side view, about four screens wide. No danger, nothing to fail.

**Goal:** find the house.

**Controls:** ← → walk, Shift run. ↓ next to someone: Ichigo says a word they know (each press picks the next word Ichigo has learned).

**Stakes:** none. The level is the ending.

**On screen:** Level 1's beach in daylight, now with new wooden houses with grey tile roofs. Villagers mending nets and carrying baskets (2–3 simple sprites, reused). A small child playing in the sand with a yellow bucket. The family house rebuilt in the same spot, with carp streamers. Kaa-chan, seen for the first time: the sprite from `people.js`, older (a grey streak). Ichigo's age-10 sprite with all three permanent marks.

**Beats**

1. The beach. The child with the bucket.
2. The village. Nobody knows Ichigo.
3. The house.
4. Kaa-chan comes out. She doesn't know Ichigo either.
5. She cleans their face and sees the chin scar.

**Learns:** Tadaima.

### Script

STORY CARDS:

> ICHIGO IS TEN.

> IT IS THE SAME BEACH. THE VILLAGE HAS BEEN BUILT AGAIN.

The child with the bucket looks up at Ichigo, then goes back to digging.

Villagers, if Ichigo says a word to them:

**FISHERMAN:** ARE YOU LOST?

**WOMAN WITH BASKET:** WHOSE CHILD IS THAT?

**OLD MAN:** KAA-CHAN? WHICH ONE? THERE ARE A LOT OF KAA-CHANS HERE.

If no fish were taken in Level 11, the captain is on the dock:

**CAPTAIN:** IT'S THE RAFT KID. YOU MADE IT.

At the house. Kaa-chan comes out with a basket of washing.

**KAA-CHAN:** OH. ARE YOU HUNGRY? COME HERE, YOUR FACE IS FILTHY.

She kneels and wipes Ichigo's face with a cloth. She stops.

STORY CARD:

> SHE SEES THE SCAR ON ICHIGO'S CHIN. SHE PUT A PLASTER THERE SEVEN YEARS AGO.

**ICHIGO:** \[icon: open door\] *tadaima*

**KAA-CHAN:** OKAERI.

STORY CARDS:

> ICHIGO WAS AWAY FOR SEVEN YEARS, AND CAME HOME AT TEN.

The title: ICHIGO.

## Credits and open questions

**Credits:** the credits scroll over the sea level's background, moving left, past small versions of each level's place in order. The Lullaby plays once on the flute. The total number of new tomorrows is shown at the end, plainly: TOTAL TIMES ICHIGO FELL IN THE SEA: *n*.

**Open questions**

- **Speech in Level 1.** Kaa-chan's bubbles on the beach are icons only. Give them short text now ("MY LITTLE STRAWBERRY." "ICHIGO! COME HERE, NOW!"), or keep Level 1 as it is?
- **Kaa-chan unseen.** In this script she is first seen in Level 15. Keep it that way?
- **Scale.** Adults next to Ichigo: the Level 1 build notes say Ichigo is already taller than the house's doorway. Decide a size for adult sprites before Level 3.
- **Scope.** Levels 3, 9, 12 and 13 need the most new code (a hunger icon, a beat track, a day-and-evening loop, a top-down map). Any of them could be simplified into a side-view walk-and-use level like Level 1's beach.
- **Sequel hook.** Leave out Ichigo II (the sister, Hanami)?
