# Level 5 spec: The Storm

**Script:** `docs/levels-and-script.md`, section "Level 5: The Bag of Winds" (see "Changes from the script").
**Status:** first version, to be played and changed with Nadia. There was no spec from the claude.ai side: this one was written while building.

## The idea

Home in sight, and blown away from it. One raft, bigger than it was, that tilts with the waves and with Ichigo's weight. It loses its sail, then a log, then everything.

## How it plays

- **Fair wind.** Puffs of wind come up from behind, wrinkling the water. ↓ held at the mast as one passes pulls the sail in, and the raft flies. Fuji grows; then hills, roofs and smoke come up on the right. Nothing can go wrong.
- **The wind turns.** It drops, the sky goes dark in dots, and it comes back off the land.
- **Wind.** Foam blows across, then a gust: ↓ at the mast holds on. Anywhere else, it takes Ichigo off. Between gusts, logs come loose at the ends: ↓ there ties them (nine seconds), or the raft is shorter. Four gusts, then the sail tears off.
- **Rain.** Water fills the raft and runs to its low end: ↓ in it bails. Sea creatures wash aboard and slide down the deck, each bigger than the last: a crab, a sea bream, a pufferfish, an octopus, a sea turtle, a tuna. Jump them (holding the rope, they only bump past; a bigger one knocks Ichigo further). Gusts still come. Full: overboard. At the end a log goes.
- **Big waves.** Lightning shows each one. A white crest breaks over the raft: hold on. A smooth one is steep: be at the right end as it arrives, or the raft tips. Each leaves water to bail. The fifth breaks the raft.
- **The shovel** sinks.
- **Swimming** to the mast: ↓ dives under the breakers, which carry Ichigo back; Space kicks; a plank is for resting (stop at it). Tired out is a new tomorrow, at the last plank.
- **Calm.** The wind stops and it gets light. Masts stick up out of the water.
- **What to do now** is always on the screen: a line in a gold box, green once it's being done, and a gold arrow over the place to go.
- **Catching the edge:** going off the raft, Ichigo catches hold and climbs back, three times in each part (the coils of rope at the top left).
- **A new tomorrow** is at the start of the part it happened in.
- **Marks:** the rope's burn, on the wrist, from the first gust held. **Loses:** the red shovel (and the rope, paddle and blanket, which were the raft). **Learns:** the wind.
- **Optional:** a pinwheel, floating past in the fair wind: ↓ at the front of the raft. It adds the pinwheel on the fence to the way home.

## The journey to it

The lighthouse out of sight by morning; logs tied on through a year, and Ichigo five; a bird that rides along, and flies east.

## Acceptance checks

- [x] Level 5 starts after Level 4's end panel, and from the list once Level 4 is done.
- [x] Not holding on: overboard, and a new tomorrow at the start of the wind.
- [x] A steep wave tips the raft over unless Ichigo is toward it.
- [x] The level can be won, and the save has the level, the wind, the rope's mark and the pinwheel.
- [x] `python tests/play_level.py` reports no page errors, and Levels 1 to 4 still pass.
- [ ] Played and enjoyed by Nadia.

## Changes from the script

- **No wind-keeper and no bag** (Nadia's call): the wind turns by itself. So *The Bag of Winds* is *The Storm*.
- *New:* the fair wind at the start, loose logs, the two kinds of wave, and the swim at the end.
- *Ichigo says nothing* (they're mute).
- *Crates* are sea creatures, washed aboard (Nadia's call, after barrels in the first version).

## Build notes

- Plays in `src/storm.js`, drawn in `src/stormart.js`, numbers in `STORM` (`config.js`), counts in `levels/level05.json`.
- Age five: a pixel more of back and of leg (`older5` in `sprite.js`).
- `S.noShovel` hides the shovel once it has sunk; after Level 5 it's gone from Ichigo's things, with the raft's parts (`LOST` in `things.js`).
- Two songs: `sail` and `storm`, with a nohkan no other level has.

**Open questions:**
- Is each part the right length? (The bot takes about three minutes in all.)
- Is it clear which wave is which?
- Is the swim too easy, if Ichigo rests at every plank?

**Changed after Nadia played the first version** ("I don't understand how to beat level 5"): the prompts and arrows, cards before each part, catching the edge, longer warnings, a raft that tilts less and rides higher, and one plain rule for each kind of wave.

**Changed after the second play:** the barrels are sea creatures that get bigger (sizes in `STORM.creature`, the order in `level05.json`; the crab is Level 2's), and the level is shorter: a shorter sail, four gusts (two loose logs), 34 seconds of rain, five big waves, three planks.
