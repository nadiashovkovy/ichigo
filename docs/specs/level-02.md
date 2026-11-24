# Level 2 spec: The Tide Comes In

**Script:** `docs/levels-and-script.md`, section "Level 2: The Tide Comes In" (it still describes the first version: see "Changes from the script").
**Branch:** `level-02-tide-comes-in`
**Status:** second version, rough, being played and changed with Nadia. The first (sand walls, commit `24b06d8`) looked right but was dull to play; Nadia chose this instead.

## The idea

The lantern island from Level 1's end, at night, all on one screen. The waves are full of sea-fireflies (*umi-hotaru*, which really do glow blue on Japanese shores). Each wave leaves some shining on the sand as it drains. Ichigo runs out after it, scoops them into the bucket, and gets back before the next wave, to feed the lantern. It has to stay lit until morning. Things from home lie furthest out. At dawn the tide goes out, a sandbar appears, and Ichigo runs across it to the next island.

## How it plays

- **Start.** Ichigo is asleep by the lantern, eyes shut, Zs rising, snoring softly (it goes on under the cards). A wave up both sides wakes them.
- **A wave.** The sea draws back on one side for a few seconds, baring the sand; then the wave rolls in, runs up the beach and drains. Sides alternate from the start. The last wave of the night comes from both.
- **Sea-fireflies.** Left wherever a wave covered the sand and drained. They fade, or the next wave takes them. A cluster on sand that's only bared when the sea draws back holds two scoops, not one.
- **The bucket.** Holds six scoops (hold ↓). Each slows Ichigo; with more than two they can't run. ↓ at the lantern feeds it.
- **The lantern.** Its light is a bar over its roof and a pool of light on the sand. It burns warm until its own fire is used up, then blue. It's blue while it's being fed, and for a moment after it goes out. Out = a new tomorrow at the start of that set.
- **Being caught.** Knee-deep in a wave: tumbled up the beach, bucket emptied, anything carried lost to the sea (it washes up again). Deeper: the wave takes Ichigo, and it's a new tomorrow **from the start of the night** (Nadia's call). What's already been saved stays saved.
- **Crabs.** A few, from set 2. A pinch makes Ichigo sit and cry for a moment. Hop over them.
- **Things from home.** One a set, on the furthest sand: a rice bowl, a carp streamer, a glass float, Kaa-chan's sandal. Carried as far as the lantern, it's kept.
- **The tide** rises between the four sets, so there's less beach each time. The moon is the clock: about two minutes.
- **Dawn and the sandbar**: as in the first version.

## Ichigo's things (`src/things.js`)

Tab, I, or the bucket in the bottom-left corner. What Ichigo has found, each with a plain line; their words; and THE WAY HOME, Ichigo's own drawing: each thing from home adds the piece it reminds them of (the bowl: Fuji; the float: the star that all the harbor's boats carry; the streamer: the pole; the sandal: the house and its door; the shell: the sea). A row of fifteen islands is the levels. Later levels only need to add to `THINGS` and `PIECES`.

The star on the float is meant to pay off in Level 8, when Ojii-san points out the star over the harbor.

## Acceptance checks

- [x] Level 2 starts after Level 1's end panel. (Choosing it in the list: not exercised by the test.)
- [x] The chin shows the scar, not the plaster.
- [x] Doing nothing loses in set 1. Only taking the nearest sea-fireflies loses in set 2. Going out for more wins.
- [x] A wave far out takes Ichigo, and the night starts again.
- [x] A crab pinches; Ichigo cries and learns *kani*.
- [x] Losing goes to the dawn print.
- [x] The sandbar is lost at a walk and won at a run, with time for the shell.
- [x] `python tests/play_level.py` reports no page errors, and Level 1's bot still reaches the lantern.
- [ ] Played and enjoyed by Nadia.

## Changes from the script

- *Sand walls are gone*, and the bucket carries light, not water. Four sets, not six.
- *Words* (Nadia's call): Ichigo learns **umi in Level 1**, a little way out on the waves, and **kani (crab) in Level 2**.
- *Cards* reworded to match; hints for feeding the lantern, running and hopping.
- *The inventory* is new, and changes the through-lines: later levels' objects could each tell something about home.

## Other changes made on this branch

- *Level 1's beach* redrawn (`src/beachart.js`): inked and dithered like the rest of the game. No boat; nets drying, carp streamers on a pole by the house.
- *Dawn prints:* Goten-yama, Kajikazawa and Ejiri are out (people don't come out well this small). The Lake at Hakone, the Inume Pass, Umezawa and Lake Suwa are in. Ten in all.
- *Level 0* (`src/prologue.js`): the last day on Ichigo's beach, from first light to dusk, a time of day to each card, with a drawing in the sand for each that the tide takes before the next. The last card is Level 1's first frame. (A version with the Great Wave being printed block by block was tried and dropped.)
- *Colour and detail, evened out:* `RAMP` in `config.js` is the same few colours for the same material everywhere (sand, wood, straw, leaves, stone, cloth). The beach was toned down to it; the wreckage, Level 1's island (now the same sand on rock as Level 2's), the lantern, the carp streamers and Fuji were redrawn up to it.
- *The older prints* (Red Fuji, Rainstorm, Kazusa, Tago Bay, Mannen Bridge, Misaka) were repainted with the newer ones' inked edges and shading.

## Build notes

Numbers are in `TIDE` (`config.js`); the waves, tides and burn rates in `levels/level02.json`. `water.js` now takes the sea's resting height as a function of x, since the two sides draw back separately.

**Open questions:**
- The lantern bar stays near full for a bot that plays well. Is it tense enough for a person?
- Restarting the whole night when a wave takes Ichigo, but only the set when the lantern goes out: right way round?
- Should the things from home do anything else, and should the whole drawing be needed by Level 13?
