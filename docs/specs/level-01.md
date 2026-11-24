# Level 1 spec: The Great Wave (update)

**Script:** `docs/levels-and-script.md`, section "Level 1: The Great Wave".
**Branch:** `level-01-beach-prologue`
**Status:** ready to build

## Why this update

Level 1's platforming on the sea is done and stays as it is. This update makes the **beach before the wave playable** and adds the systems every later level needs:

- the chin cut and strawberry plaster, the mark that brings Ichigo home in Level 15;
- Kaa-chan and Ojii-san, who come back in Levels 8 and 15;
- word and pictogram bubbles, the game's only "dialogue";
- a save that carries words and marks between levels;
- the Lullaby, which Ichigo learns to hum in Level 8.

Today the flow is `title → intro (5.2 s wave cutscene) → play`. After this update it's `title → beach (playable) → wave (cutscene) → white → play`.

## Tasks, in order

### 1. A "use" button

- Add an `inUse()` input in `src/input.js`: ArrowDown, KeyS or KeyE, plus a new touch button (`data-k="use"`, label `●`) in `index.html` next to run and jump.
- On the beach, jump is only a tiny hop (they're three and on sand; it keeps the beach calm): a few pixels, with a puff of sand. No hopping while digging, pouring, tripping or carrying a full bucket.

### 2. The beach scene (`S.scene = 'beach'`)

Reuse `drawBeach()` and the beach scenery from `drawIntro()` in `src/scenes.js`. Put the beach logic in a new file, `src/beach.js`, so `scenes.js` doesn't grow much.

**Ground.** Flat sand at y ≈ 412 (game units, the same coordinates as `drawBeach`). Ichigo can walk from about x = 70 (the house) to the water's edge at about x = 560. Walking past 560 stops them ankle-deep with a small splash. Walk speed is `MOVE.walk`, and Shift runs as usual. Use the existing `stand / step1 / step2` frames, and the hair movement already in `drawPlay()`.

**Sadie's walk.** When the player starts walking from standing, Ichigo first takes 3 short sideways steps (about 0.4 s, speeding up) before moving at full speed. Put the timing in `config.js` (for example `MOVE.sideStepTime`). Use it only on the beach for now. If it feels good, the play scene can get it later.

**Things on the beach** (positions are approximate; match them to the art):

| Thing | Where | What "use" does nearby |
|---|---|---|
| Sandcastle and dig spot | x ≈ 360–420 | Hold to dig (the existing `dig1/dig2` frames). After about 1.5 s a hole appears in the sand in front of the castle. |
| Water's edge | x ≥ 540 | Fill the bucket. It now shows blue water. |
| The hole (once dug) | dig spot | With a full bucket, pour it in. |
| Kaa-chan | house step, x ≈ 143 | Nothing; she glances up and smiles. |
| Ojii-san | bench by the boat, x ≈ 300 | Nothing; he opens one eye and raises his enormous eyebrows. |

- When "use" would do something, show a small pixel ▼ marker above Ichigo, as a picture, not text.
- **A full bucket** slows Ichigo to 80% of walking speed and stops them running. Running with it would slop water, which a three-year-old wouldn't plan around.

**The pours.** First and second pour: the water sits in the hole, then soaks away over about 3 s. Third pour: the water drains away at once. That's the cue the sea is pulling back (task 5).

### 3. The trip, the cut, the plaster

- **Trigger:** the first time Ichigo walks right past x ≈ 470. Filling the bucket requires going to the water, so this always happens. The script's fallback isn't needed.
- **Sequence** (player control off, about 5 s in all):
  1. Ichigo trips over the shovel: a new `sit` frame and a small puff of sand. Draw a 2×2 red dot on the chin, and make the lip wobble (alternate 2 mouth pixels) for 1 s.
  2. Kaa-chan gets up, walks to Ichigo (about 1.5 s), kneels, and puts on the plaster: 3×2 pixels, `P.pink` with one `P.red` fleck, over the dot. She taps Ichigo's nose (one frame of her hand at the face).
  3. Kaa-chan's pictogram bubble: [strawberry][heart]. Then Ichigo's word bubble: [Kaa-chan's face].
  4. She walks back to the step and sits. Control returns.
- Add `'chin'` to `S.marks` and `'kaa-chan'` to `S.words` (task 6).

### 4. Kaa-chan and Ojii-san sprites

Build them in the same letter-grid style as `sprite.js`. Put them in a new `src/people.js`, reusing `outline()` (export it from `sprite.js`) and the same mirroring.

- **Kaa-chan:** an adult about 1.6× Ichigo's height when standing. Dark hair tied back, an indigo work kimono (`P.indigo`/`P.navy`) with a white apron (`P.foam`). Frames: `sit` (mending, 2 frames, hands moving), `walk` (2 frames), `kneel`, `stand`, `alarm` (standing, arm out toward the house).
- **Ojii-san:** sitting on a bench, bald, with eyebrows big enough to read at this size (2–3 px of `P.white`). Frames: `doze` (2 frames, breathing), `peek` (one eye open, brows up).
- Colours only from the palette `P`, or the skin and hair colours `sprite.js` already uses.

### 5. The sea pulls back, then the wave

The third pour starts this. Player control stays on throughout; nothing the player does changes the outcome.

1. **0–2 s:** the shoreline slides back (animate `drawBeach`'s shore shape and the wet-sand band about 80 units out). 2–3 small fish (4×2 px, `P.steel`) flip on the bared sand.
2. **About 1 s in:** Kaa-chan stands, mid-stitch. Her net drops (draw it falling off her lap). She looks past Ichigo, then switches to `alarm`, with a pictogram bubble: [Ichigo's face][arrow][house].
3. **About 2.5 s:** the existing wave sequence (`wavePlace` / `drawGreatWave`, from its `t = 1.4` onward). Draw Ichigo **where the player left them**, not at the fixed x = 430, facing the wave. Kaa-chan is drawn running toward Ichigo.
4. When the sea covers the screen (the current `t > 4.4` crash), go to **white**: fill the screen with `P.white` for 2 s, no sound. Then `startLevel()`.

Pressing a key can skip steps 3–4 only on later playthroughs, once the save has `seenWave: true`. The beach itself is never skipped; it lasts about a minute.

### 6. Words, marks, save

- In `state.js`, add `S.words` (an array of word ids, in the order learned) and `S.marks` (a Set of permanent mark ids).
- Add `src/save.js` that reads and writes `localStorage['ichigo.save']` as `{ words, marks, tomorrows, seenWave }`, wrapped in try/catch so a blocked storage doesn't break the game. Save when a word or mark is gained, at each new tomorrow, and at level end.
- **Permanent marks** are drawn by `drawSprite` alongside the existing per-fall `SCARS`, in a new `MARKS` table with the same `[row from collar, column, colour]` format. For now there's one: `chin`. In Level 1 it shows as the plaster; from Level 2 on it's a pale 2-pixel line (`P.tan`). Pass the plaster-or-scar choice in, for example with `S.level.number === 1`.
- The fall marks (`SCARS`) stay per-level and unchanged.

### 7. Word and pictogram bubbles (`src/bubbles.js`, `src/icons.js`)

The system every later level will use.

- `say(who, icons, { kind, time })` queues a bubble over a character. `kind` is `'word'` (Ichigo: round bubble) or `'picto'` (anyone else: square bubble with a small tail). Show 1–4 icons in a row, for 2.5 s by default. One bubble per speaker at a time.
- Draw bubbles in pixel space on top of everything except the HUD, in `P.white` with a `P.outline` border. Keep them on screen at the edges.
- **Icons** are 12×12 letter grids in `icons.js`, the same idea as the sprites. Level 1 needs: `strawberry`, `heart`, `kaachan` (a woman's face), `ichigo` (Ichigo's face), `arrow`, `house` (with a carp streamer). Each icon can also be drawn greyed out (every colour mapped to `P.grey1` / `P.grey2`) for "small and grey".
- Word bubbles can also show a small musical note to the left of the icons when the word is spoken. That's where the voice sound will go later.

### 8. The Lullaby (`src/audio.js`)

A tiny WebAudio synth, no files:

- A soft flute-like tone: a sine wave plus a little breath noise, slow attack.
- `playLullaby({ notes, tempo })` plays the full phrase: five notes rising, two falling, D4 E4 G4 A4 B4 – A4 G4 (a yo-scale feel), one beat each, the last held for two beats.
- `playLullaby({ notes: 2 })` plays just the first two notes. Play that at every new tomorrow, as the dawn print appears.
- Kaa-chan hums the full phrase in a loop, quietly, while she's mending on the beach. It fades with distance from her.
- Audio starts only after the first key press (browser autoplay rules). Add a mute toggle on `M` and remember it in the save.

### 9. Opening of the sea level, and the boat

- **"Kaa-chan?":** 1 s after play fades in, Ichigo's word bubble shows a greyed, smaller [kaachan] icon.
- **Carp streamer:** one streamer (`drawKoinobori`) floats past on the sea surface in the first screen, drifting right to left over about 6 s. It's scenery only; you can't stand on it.
- **The boat:** when Ichigo is on the boat and the player hasn't pressed anything for 1 s, use the new `sit` frame (bucket in their lap). After 5 s without input, Ichigo turns to face left (back the way they came). Any input stands them back up. The boat barely tips, so sitting doesn't slide.

### 10. The play-test

Update `tests/play_level.py`:

- Before Level 1, the bot plays the beach: walk right to the water (sit through the trip), fill, walk back, dig, pour, and repeat until the third pour. Then wait through the wave and the white.
- New screenshots: `beach_start`, `trip_plaster` (with the bubble), `sea_pulls_back`, `wave_over_beach`, `kaa_chan_question` (the first seconds of play), `boat_sit`.
- Report the save's contents at the end. Expect `words: ['kaa-chan']` and `marks: ['chin']`.
- Keep a `--skip-beach` flag that sets the save's `seenWave` and jumps straight to play, so platforming tests stay fast.

## Acceptance checks

- [ ] From the title, a key press goes to the playable beach, not straight to the cutscene.
- [ ] On the beach Ichigo walks with Sadie's sideways start, can only do a tiny hop, and can dig, fill and pour with the use button, on keyboard and on the touch button.
- [ ] The trip always happens once, before the first fill. The plaster stays on the chin for the rest of Level 1, including after falls and in the end card.
- [ ] Kaa-chan and Ojii-san are drawn in the game's pixel style with outlines and palette colours, and react when Ichigo is near.
- [ ] Bubbles show pictures only. There's no text on screen during the beach or play apart from the HUD.
- [ ] The third pour makes the sea pull back, then the wave comes with Ichigo where the player left them, then 2 s of white, then play.
- [ ] "Kaa-chan?" appears greyed at the start of play, and a carp streamer drifts past.
- [ ] Ichigo sits on the boat after a short wait and looks back after 5 s.
- [ ] The Lullaby plays on the beach and its first two notes play at each new tomorrow. `M` mutes.
- [ ] After a full run, the save holds `kaa-chan` and `chin`, and the tomorrows count.
- [ ] Level 1's platforming feels unchanged: the bot still finishes with about 4 falls.
- [ ] `python tests/play_level.py` reports no page errors, at both the 4:3 PC size and full screen.

## Notes

- **House roof:** the script's Level 1 says tile roofs, but the code's house is thatched. Keep the thatch. The rebuilt village in Level 15 gets tile roofs, which helps make it feel unfamiliar. The script has been updated to match.
- **Sound beyond the Lullaby** (sea ambience, splashes, gulls stopping) waits for the Sound milestone. Leave a comment where each sound will go.

## Build notes

**Kaa-chan and Ojii-san are not on the beach (Nadia's call after the first build).** Their sprites were built (task 4, `src/people.js`, kept for Levels 8 and 15), but the beach doesn't draw them. Kaa-chan is just inside the house: her humming and her pictogram bubbles come from the doorway (`BEACH.kaachan`). In the trip, the plaster simply appears on Ichigo's chin at about 2.2 s; Ichigo turns toward the house, and the bubbles follow. There's no walk over, kneel, nose tap or dropped net. Ojii-san and his bench are gone. The script's beach beats with them on screen need rewriting to match.

**After the first build (Nadia's requests):**
- *A tiny hop on the beach* replaces "can't jump" (task 1 and its acceptance check are updated): `BEACH.hop` and `BEACH.hopGravity`. It teaches the jump key somewhere safe; before, the first jump was over open sea. Hopping over the shovel still trips Ichigo. Space no longer skips the wave on later playthroughs (Enter still does), since Space hops. The controls card says SPACE: HOP.
- *Sitting never takes control away.* Ichigo still sits down bored, but any key (move, jump, use) gets them up and acts at once, on the beach and on the sea. The 0.45 s stubborn wait is gone; only the lip stays out that long (`sulk`).
- *Always 16:9*, with only the monitor around the game: no 4:3 size and no keyboard. The play-test runs once now, so the "both sizes" notes here are out of date.
- *The PC's power button* also stops the sound.
- *Story cards* (`src/cards.js`), which break the old "wordless" rule on purpose; CLAUDE.md now says so. Three cards open the beach: who Ichigo is, Kaa-chan, and the controls and goal (dig a hole, fill it with sea water). Three more come on the white after the wave: the village is gone, the lantern island, how to cross. The white is still 2 s of silence before them. Any key goes on, Esc skips. The world waits while a card is up. The script's beats may want rewriting around them.
- *Level 0, a prologue* (`src/prologue.js`), comes before the beach: four story cards: what Ichigo is (a game from Gabrielle Zevin's novel, made by Sadie and Sam), the premise, and that this is a fan-made version. Each card sits over a Hokusai print (the Great Wave, then dawn prints), with a caption.
- *The title* no longer lists the keys. It shows PRESS ANY KEY and "L: ALL LEVELS" (or click it), and has its own music: slower and higher, the flute playing the Lullaby. It plays on through the list and Level 0. Browsers only allow sound after the first key press, so on a first visit the title is silent until a key starts Level 0. Back at the title later, you hear it.
- *All levels* (`src/menu.js`): 0–15 with names. Locked levels are greyed with a padlock. 0 and 1 are always open; finishing a level unlocks the next (`done` in the save). Unlocked but unbuilt levels say NOT BUILT YET.
- *The level-complete screen* now keeps the level's world, with Ichigo sitting by the lantern. A panel in the story cards' style shows LEVEL ONE DONE, the level's name, how many times Ichigo fell in, and the words learned (as icons; levels list them in `"learns"` in their JSON). It uses only the pixel font: no cover lettering, and no "tomorrows" wording. (The new-tomorrow prints and the tally in the HUD stay as they were.)
- *More Hokusai prints* at each new tomorrow: nine now, not five. Four were added: Kajikazawa, At Sea off Kazusa, Tago Bay near Ejiri and Reflection in Lake at Misaka. They're recreated by hand in code like the first five (`dawn.js`), from the Met's scans as reference, with no images shipped. Shichirigahama and Fujimigahara were tried and cut as not good enough. All nine share one look: the same palette, a thin night-blue band at the top of every sky, flat shapes with darker edges, and tiny people. Each has a small animation: clouds drifting, lines swaying with spray, glints on the waves, spray round the boats, a boat drifting, plus the first five's petals, lightning, papers and boats. New shared helpers: `rough()` (a Hokusai sea), `clump()` (scalloped foliage), and four more Fuji views in `art.js`. They're also *aged*, to look like the prints as they are now: eight faded pigments in `P` (aged paper, faded Prussian blue, vermilion, green, ochre, ink), used only by the prints and kept out of the world's palette snapping. Whites become paper; inks fade unevenly in soft patches; the paper tones toward its edges; there are fibres and specks. Skies, water and Fuji's flanks use dithered *bokashi* gradients instead of hard bands.
- *Sound:* music on the sea level (koto-like pluck and bass in the Lullaby's scale, with flute lines); the sea, wherever there's water (quiet as it pulls back); gulls now and then, stopping when the sea pulls back; a rumble and crash for the wave, cut by the white; a splash, bloop and bubbles for falling in. All synthesised in `audio.js`.

**Built (all 10 tasks).** Flow is now `title → beach → white → play`. New files: `src/beach.js` (the beach, the trip, the pull-back and the wave; the wave and beach drawing moved here from `scenes.js`, so `scenes.js` got shorter), `src/people.js`, `src/bubbles.js`, `src/icons.js`, `src/audio.js`, `src/save.js`. Beach positions and timings are in `BEACH` in `config.js`; Sadie's walk is `MOVE.sideStepTime`.

**Test results** (`python tests/play_level.py`, which now runs once at 4:3 and once in full screen): no page errors at either size. The beach bot trips, fills, digs and pours three times, and the wave and white follow. The save ends with `words: ['kaa-chan']`, `marks: ['chin']`, `seenWave: true`. The bot reaches the lantern every time.

**Changes from the spec, and why**
- *Falls:* the bot now falls 0–1 times, not "about 4". Baseline first: the unchanged `main` gives 1–2 falls, so 4 was already out of date. With the boat rest turned off, this branch also gives 1 fall. The 0 in the full test comes from the 6.5 s the bot now rests on the boat, which changes where the drifting planks are when it moves on. Platforming code is unchanged, except that sitting Ichigo doesn't slide.
- *Plaster:* 3×2 `P.pink` with one `P.red` fleck vanished into the skin, so its lower row is `P.rose`.
- *`MARKS` format:* `[row, column, colour, width, height]`, size optional (2×2 like `SCARS`). The chin has three ids: `chin-cut`, `chin-plaster`, `chin-scar`. `markIds()` in `sprite.js` picks plaster vs scar from `S.level.number`. The same table holds the lip wobble (`pout`). `drawSprite` takes a `marks` list; `'water'` there shows water in the bucket.
- *Skipping the wave* (later playthroughs) is on Enter, Space or Esc, not any key: the player still moves Ichigo during the wave, and an arrow key shouldn't skip it.
- *The start:* Ichigo begins sitting by the castle (the script's "sits in the sand … digs") and stands at the first step.
- *Tomorrows:* `S.deaths` stays per level for the HUD; a new `S.tomorrows` counts every tomorrow ever and is what the save holds.
- *Test bot:* the venv here had a newer Playwright than the installed browsers; `CHROME_PATH` pointing at the installed headless Chromium works.

**Screenshots worth looking at:** `tests/screens/trip_plaster.png` (the bubble over the house), `sea_pulls_back.png`, `wave_over_beach.png`, `kaa_chan_question.png`, `boat_sit.png` (and `_wide` versions).

**Open questions**
- *Scale, for when the adults come back:* Ichigo is already taller than the house's doorway, and Kaa-chan at 1.6× is nearly as tall as the house wall.
- *The greyed Kaa-chan face* (grey1/grey2 only) looks a little skull-like at small size, because of the dark eye sockets. Maybe allow `P.grey0` for skin?
- *No on-screen hint for the use key* other than the ▼ marker (which suggests ↓). The title still lists only move, run, jump.
- *Kaa-chan's poses* in `people.js` (kneel, the net in her lap) are a first pass and could use an art pass before Level 8.
- *The fish* on the bared sand are 4×2 as specified, and hard to spot.
- *Sound* other than the Lullaby is marked `SOUND:` in the code (splash, thup, gulls stopping, pouring).
