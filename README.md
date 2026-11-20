# Ichigo: A Child of the Sea

A recreation of *Ichigo*, the video game Sam and Sadie make in Gabrielle Zevin's novel *Tomorrow, and Tomorrow, and Tomorrow*.

A small child is swept out to sea by a great wave and has to find their way home across 15 levels, growing older along the way. This repository holds **Level 1: The Great Wave**: run, jump and keep your balance on the floating, rocking wreckage of Ichigo's village. It's drawn as pixel art based on Hokusai's *The Great Wave off Kanagawa*.

## Play it

**Online:** https://claude.ai/artifact/8j3zwyD5k6sW9Jh3pypqQC

**On your computer:** browsers won't run this game straight from a file (opening `index.html` by double-clicking shows an error), so start a tiny local web server in this folder:

```
python3 -m http.server 8000
```

Then open <http://localhost:8000> in your browser. (Any local server works, for example the "Live Server" extension in VS Code.)

**Controls:** ← → move · Shift run · Space jump (hold for higher). Touch screens get on-screen buttons.

## What's where

```
index.html            the page: a canvas, touch buttons, and one line that starts the game
css/style.css         page styling (the game itself is drawn on the canvas)
levels/level01.json   Level 1 as data: where each piece of wreckage floats, the checkpoints, wave size
src/
  main.js             starting point: loads the level, runs the game loop (update, then draw)
  config.js           ★ numbers to tweak: palette, movement, slipperiness, how each wreckage floats
  state.js            shared game state (current scene, camera, tomorrows, the level)
  pixel.js            the pixel-art pipeline: 320×180 canvas, palette snapping, dithering, scaling up
  text.js             lettering: 5×7 bitmap font, and cover-style rainbow titles
  input.js            keyboard and touch controls
  sea.js              the height of the sea at any point and moment
  art.js              Hokusai in code: claw foam, bubbles, sky, Mt Fuji, the great wave, the near sea
  wreckage.js         floating wreckage: bobbing, rocking under Ichigo's weight, drawing
  player.js           Ichigo: walking, running, jumping, sliding on tilted decks, falling in
  sprite.js           Ichigo's 12×18 pixel sprite frames and the scars they collect
  scenes.js           title, beach intro, play, sunrise (a new tomorrow), level end, HUD
tests/play_level.py   automated play-test: a bot plays Level 1 and reports where it fell in
```

## Changing things

- **Feel:** edit `src/config.js`. For example, make the decks less slippery by lowering `DECK.slide` or raising `DECK.wetFriction`, or jump higher by raising `MOVE.jump`.
- **Level layout:** edit `levels/level01.json`. Each piece of wreckage is one line:
  ```json
  { "type": "plank", "x": 1110, "w": 170, "checkpoint": true }
  ```
  - `type`: `plank`, `crate`, `roof`, `mat` (sinks while you stand on it), `boat`, or `rock` (the solid island at the end)
  - `x`: where its left end is · `w`: how long it is
  - `checkpoint: true`: carries a carp-streamer flag · `drift: 70`: floats back and forth this far · `goal: true`: the island with the lantern
  - Gaps up to about 120 can be cleared with a walking jump, and up to about 200 with a running jump.
- **New level:** copy `level01.json` to `level02.json`, change it, and point `LEVEL_FILE` in `src/main.js` at it.

## Testing

```
pip install playwright && playwright install chromium
python tests/play_level.py
```

The bot walks, runs before wide gaps, jumps near the end of each piece, and balances while it waits for drifting planks. It prints any code errors, where it fell in, and whether it reached the lantern, and saves screenshots to `tests/screens/`. Run it after changing a level to check the level can still be finished.

## Design

The full design (story, the 15 levels, aging, art direction) lives in the claude.ai project as `claude/ichigo-game-design.md`; background research on the novel is in `ichigo-background.md`.

Art is original, drawn in code from Hokusai's print, which is in the public domain. Title lettering is inspired by the novel's cover and uses the Bungee font (SIL Open Font License).
