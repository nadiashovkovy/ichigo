# Level 4 spec: The Lighthouse

**Script:** `docs/levels-and-script.md`, section "Level 4: The Lighthouse" (see "Changes from the script": there is no keeper any more).
**Branch:** `level-04-one-eyed-lighthouse`
**Status:** third version, to be played and changed with Nadia. There was no spec from the claude.ai side: this one was written while building.

## The idea

Stealth, by night, as a small child with a bucket. No one lives here. The lighthouse's lamp is an eye, and it looks for whatever moves.

## How it plays

- **The light** sweeps past Ichigo, the eye shuts for a moment, and it sweeps back. It reaches everywhere in the level, and gets faster toward the boathouse. The lighthouse stands far off across the water, so it's always in sight.
- **Being seen** fills an eye over Ichigo's head, red. Full: the lamp turns red and its light fills the screen, then a new tomorrow.
- **The bucket.** Hold ↓. The light stops to look at a bucket, longer each time. A bucket that moves in the light is seen. Behind a rock or a crate, the light goes straight by, and forgets about the bucket.
- **Noises** turn the eye to look: splashing, landing hard, waking a gull or the cat (by running or landing near), knocking down a bottle, cutting the rope.
- **Bells.** Pulling a cord rings a bell far behind. The eye looks at it for a few seconds.
- **The shed, four rooms.** The light comes in at the windows and slides over the shelves and the floor. The rooms are divided by stone walls, each with a low tunnel along the floor, as high as Ichigo under the bucket: they only fit while hidden (↓ held, then → to shuffle through), and can't stand up inside. *The shelf room. The workshop:* bottles on the high shelves. *The kitchen:* a cat by the fire. *The loft:* two of its three windows have a shutter, on a cord.
- **The rocks:** boulders, a rock pool, gulls.
- **The stones:** across the water, jumping in the dark. Falling in is a new tomorrow.
- **The wreck:** light through the gaps in its planks, in stripes that slide at Ichigo's walking speed. Walk in the dark between them.
- **The flats:** little to hide behind, pools, and two cords.
- **The headland:** gulls asleep, and a fast light.
- **The boathouse:** holes in the roof. Cut the rope three times (↓). The eye hears each cut and comes to look.
- **The water.** → paddles, ↓ hides, and there are two stacks of rock to go behind. Past the light's reach the eye shuts, and the raft goes off the screen.
- **Checkpoints:** each room, and ten more places outdoors.
- **Optional:** a wind chime on the far shelf in the shelf room. It adds the chime under the eaves to the way home.

## Acceptance checks

- [x] Level 4 starts after Level 3's end panel, and from the list once Level 3 is done.
- [x] Never hiding: caught, and a new tomorrow.
- [x] Standing up, Ichigo can't get through a wall; under the bucket, they can.
- [x] A cord, pulled, sends the eye to its bell.
- [x] Running past a gull wakes it.
- [x] Falling in the water is a new tomorrow.
- [x] The level can be won, and the save has the level and *lighthouse*.
- [x] `python tests/play_level.py` reports no page errors, and Levels 1 to 3 still pass.
- [ ] Played and enjoyed by Nadia.

## Changes from the script

- **No keeper, and no one else** (Nadia's call). So no shelf he puts Ichigo on, no name scene, no calling after the raft. Ichigo sleeps in the shed, and the tide takes the raft to the boathouse.
- **Ichigo is mute, in every level, and what they learn is about the world, not words** (Nadia's calls). `LEARNED` in `icons.js` has it all: Kaa-chan and the sea (Level 1), crabs (2), home (3), the lighthouse (4). Each is a picture: a thought over Ichigo's head when it's learned, LEARNED on the end panel, and a row on the Tab screen. In Level 4 it's once the raft is out of the light's reach. (Not *light*: the lantern saved them in Level 2.) In Level 3 the woman now says EVERYONE WALKS ON AT FIRST. **The script's later levels still teach words**, and Level 14's shout and Level 15's *tadaima* depend on speech: for the claude.ai side to rework.
- *New:* windows and shutters, the stones, the wreck, the cords and bells, the gulls and the cat, the sea stacks.
- *Caught* goes back to the last place of safety, not always the storeroom.

## Build notes

- Plays in `src/lighthouse.js`, drawn in `src/lighthouseart.js`, numbers in `LIGHT` (`config.js`), places in `levels/level04.json`.
- The eye is `H.eye`: it sweeps, shuts, turns to a noise, or holds. `litAt(x, y)` says where there is light, indoors and out.
- The rocks, shed, wreck and boathouse are painted once onto one long picture; the lighthouse onto its own, which slides by slowly. The light is dots in a buffer over them.

**Open questions:**
- Is the light too fast, or not fast enough? (`LIGHT.beam`, and `power` in the level)
- Does the light stopping at the bucket add tension, or only waiting? (`LIGHT.stare`)
- Are the stones across the water the right difficulty?
- Humming (Levels 8 and 9): does a mute Ichigo hum?

**Changed after Nadia played the second version:** no people; a stronger light; windows in the shed; about twice as long; Ichigo mute. Then: tunnels instead of doors with a gap under them.
