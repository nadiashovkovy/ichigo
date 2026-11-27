# Level 6 spec: Ship Graveyard

**Script:** `docs/levels-and-script.md`, section "Level 6: Ship Graveyard" (see "Changes from the script").
**Status:** first version, to be played and changed with Nadia. There was no spec from the claude.ai side: this one was written while building.

## The idea

Ichigo has just learned to swim, and can't stay under for long. The way out of the reef is under the water, blocked with sand, and there's nothing to dig with. The air is where the ships trapped it.

## How it plays

- **The map** is one place, about three and a half screens wide and two deep, and the camera follows Ichigo down as well as along. It's a grid of letters in `levels/level06.json`, so it can be changed without touching the code (the letters are listed at the top of `src/wrecks.js`).
- **On a deck:** ← → walk, Space jumps. Walking off the edge is the dive.
- **In the water:** the arrow keys swim, any way. Shift swims faster but uses breath faster. Left alone, Ichigo floats up slowly. At the top of the water, Space jumps out, onto a deck if one's near.
- **Breath:** a bubble over Ichigo, shrinking while they're under (ten seconds of it). It fills again at the top of the sea and in the air trapped in the ships. Out of breath is a new tomorrow, at the last place there was air, with the sand dug still dug and the bone still found.
- **The route:** the first ship, its deck out of the water. Then an arch of rock, and a ship upside down with air under its keel (in through its broken deck, from below). Then the big ship's hold, a long way through with three pockets of air in its ceiling and four eels. Then the basin, where the whale lies on the bottom and a little boat lies upside down with air under it. Last comes the reef, with the gap at its foot. Rocks and hulls stick up out of the water between the parts, so the only way on is under.
- **The turtle** waits at the next place there's air, and swims on when Ichigo comes near. If Ichigo gets ahead she hurries to catch up. She waits at the whale until the bone is found, and at the gap until it's open. The eels stay in while she's going past.
- **Eels:** their eyes show in the hole first, then one comes out across the hold and pushes Ichigo back (a little breath goes with it). Wait for it to go back in.
- **Portholes** look like a way through, but they're too small for a five-year-old (it says so, the first time).
- **The whale's shoulder blade:** ↓ picks it up. Ichigo holds it up, and it goes in the bucket where the red shovel was.
- **The gap:** twelve letters of sand. ↓ next to it digs (0.6 s each), which is about three or four trips from the little boat's air.
- **The end:** through the gap, the turtle takes Ichigo on her back, up into the light. That's when Ichigo learns the turtle.
- **What to do now** is on the screen when it matters: walk off the edge, pick it up, hold ↓ to dig, nearly out of breath (in red), the gap is open. Hints, once each, for swimming, breath, air pockets, climbing out, portholes, eels, and no tool yet.
- **Optional:** a teacup in a cabin under the hold. It adds the pine by the house to the way home.

## The journey to it

Level 5's calm, the masts. A night in the cabin of the one ship still above water, its door banging. Learning to swim off its deck, day 1, 5 and 12. A month, and no boats.

## Acceptance checks

- [x] Level 6 starts after Level 5's end panel, and from the list once Level 5 is done.
- [x] Staying under: out of breath, and a new tomorrow with a full breath at the last air.
- [x] No digging without the bone; with it, the gap can be dug clear.
- [x] The level can be won, and the save has the level, the turtle, the bone and the teacup.
- [x] `python tests/play_level.py` reports no page errors, and Levels 1 to 5 still pass.
- [ ] Played and enjoyed by Nadia.

## Changes from the script

- **Ichigo learns the turtle, not *mite* (look)**, because Ichigo is mute and what they learn is about the world. The thought comes on her back at the end, not at the whale. At the whale, Ichigo holds the bone up, but the script's *mite!* isn't said.
- *New:* the turtle hurrying to catch up, the little upside-down boat with air under it, Shift to swim faster, climbing out of the water onto a deck, and the teacup.
- *Story cards* are reworded so they don't repeat the journey's captions.

## Build notes

- Plays in `src/wrecks.js`, drawn in `src/wrecksart.js`, numbers in `WRECKS` (`config.js`), the map, the turtle's stops and the masts in `levels/level06.json`.
- The map is painted once into one big picture (and again round each letter of sand dug away). Moving things are drawn over it, then a sprinkle of the water's colour over anything under the water.
- Swimming is the jump frame turned on its side (`drawTurned` in `sprite.js`), head first: upside down diving, upright going up. The kick is a second frame with the legs a pixel over.
- The whale bone stands in the bucket where the red shovel did (`bone` in `markIds`). `S.noShovel` hides it until it's found, and `begin()` in `main.js` clears it for every other level.
- Level 5 has an end picture now (`endStorm`), for the journey to start on.
- Its own song, `deep`: the in scale, slow threes, and a suikinkutsu (drops into a buried jar) that no other level has. A low pulse comes in under the water, and a heartbeat when breath is nearly gone.

**Open questions:**
- Is ten seconds of breath right? The longest stretch is from the first pool to the air under the upside-down ship (about six seconds of straight swimming).
- Are the eels fair? Their eyes show for 0.8 s before they come out.
- Does the reef look like rock? It's drawn as stones in courses, and might read as a wall.
- The bot takes about 100 seconds. Is the level long enough?
