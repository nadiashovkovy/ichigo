# Level 2 spec: The Tide Comes In

**Script:** `docs/levels-and-script.md`, section "Level 2: The Tide Comes In".
**Branch:** `level-02-tide-comes-in`
**Status:** built; not yet played by Nadia. Drafted by Claude Code from the script (Nadia asked for this, as no spec had arrived yet), and built from this draft. The claude.ai side should check it against its own plans.

## The idea

The lantern island from Level 1's end, at night, all on one screen, seen from the side. The sea really flows: water runs up the sand, stops at walls, spills over low ones and leaves puddles. Ichigo piles walls to keep it off the lantern for six sets of three waves. At dawn the tide goes out, a sandbar appears, and Ichigo runs across it to the next island.

The flow is `cards → a wave at Ichigo's feet ("umi") → six sets of waves → dawn, cards → the sandbar → end panel`. It is one scene (`S.scene = 'tide'`) in one continuous world; only the sandbar scrolls.

## Tasks, in order

### 1. More than one level
- Load every built level's JSON at the start. A level is chosen from the list, or follows the one before it: a key on Level 1's end panel goes on to Level 2 (it used to go to the title). The last built level goes back to the title.
- `levels/level02.json`: the island's shape, the sets of waves, the crabs, the sandbar. `TIDE` in `config.js`: how everything moves.
- Settings' "restart level" restarts Level 2 too. The level list opens on the newest level that's open and built.

### 2. The water (`src/water.js`)
- A row of columns 8 units wide, each with a ground height and a depth of water. Water flows between neighbours toward the lower surface, slowed by friction. A wall is just higher ground.
- The sea sets the surface in the outermost columns: the tide's height plus the waves rolling in.
- Ground lower than the tide fills by itself: walls stop waves, never the tide. That's what makes Ichigo give up the outer ring.
- Puddles soak away slowly. Fixed time step, no randomness: the same play gives the same water.
- The file draws nothing, so it can be run without a browser to tune the waves.

### 3. Walls
- Wall places are 24 units wide, anywhere on the sand. A wall is 0 to 3 blocks of sand high.
- Hold use: Ichigo faces the way they last walked and piles sand into the place in front of them, about a second a block. Not under water. A small ▼ shows the place.
- Walls wear down: a little when a wave hits, faster when water pours over.
- Ichigo clambers over walls slowly, and wades slowly; deep water pushes them along, and they can't walk out past their waist.

### 4. The bucket
- Use while standing in water: scoop it up. Use with a full bucket: tip it out an arm's length in front, over a wall if there's one there.

### 5. Waves and the tide
- Six sets. Each starts calm, with time to build, then brings three waves, each higher. The tide rises between sets. By set 4 it covers the outer sand.
- From set 3 waves come from the left as well (see "Changes from the script").
- Waves are seen coming: a swell with a foam crest rolls in from the edge of the screen.
- The moon crosses the sky once in the night: it's the clock.

### 6. Failing
- Water over the patch of sand round the lantern puts the light out: a new tomorrow. The set starts again with the walls and water as they were when it began, and a few seconds' more calm each time.

### 7. Crabs
- From the second calm, a crab comes up from the sea between sets, climbs the first wall it meets and knocks pieces off, then the next. It goes home when the waves start, or if Ichigo comes close.
- The first one: HINT: CRABS KNOCK WALLS DOWN.

### 8. Dawn and the sandbar
- The light rises from the horizon, the tide drains away and the sandbar shows. Cards. Then the world scrolls: run right.
- The tide comes back. The sandbar is lowest near its two ends, so the water closes in from both. Too deep, and it's a new tomorrow at the start of the sandbar.
- Walking is too slow; running is fast enough, with time for the shell. Crabs to hop over: bumping one stumbles Ichigo for half a second.
- The shell: walk onto it and press use. It costs a second, and goes in the save (`things`).

### 9. Art and sound
- Skies for night and dawn in `art.js`, beside the dusk one. A moon, a red sun. The lantern drawn by one shared function.
- Crab (2 walk frames), shell, wave crest: letter grids. Icon `umi` (a wave).
- A sparse night song that steps up with each set. Sounds: a wave breaking, digging, scooping, pouring, the lantern going out.

### 10. The play-test
- `tests/play_level.py` plays Level 2 after Level 1. `--only 2` goes straight to it.
- A run with no walls must lose; the bot that builds must win.

## Acceptance checks

- [x] Level 2 starts from the level list and after Level 1's end panel.
- [x] Cards, hints and the end panel use the script's text.
- [x] The chin shows the scar, not the plaster.
- [x] A wave reaches Ichigo's feet; Ichigo says *umi*; the word is saved.
- [x] Doing nothing loses in set 1. Walls stop the waves. Outer walls alone lose by set 4 or 5. Inner walls hold to morning.
- [x] Scooping and pouring move water out over a wall.
- [ ] Crabs knock walls down and can be chased off.
- [x] Losing goes to the dawn print, then back to the start of that set.
- [x] The sandbar is lost at a walk and won at a run, with time to pick up the shell.
- [x] Keyboard and touch both work; settings pause everything.
- [x] Level 1 is unchanged: its bot still reaches the lantern.
- [x] `python tests/play_level.py` reports no page errors.

## Changes from the script

- *Waves from the left too, from set 3.* The script has them roll in from the right. With one side only there's one wall to mind and nothing to choose between; and "a smaller ring" needs two sides.
- *Crabs run from Ichigo*, so there's something to do about them besides rebuilding.
- *Crabs on the sandbar* to hop over, or the run is only holding one key down. (They were in the first version of the script.)
- *Two more hints:* the bucket, and running.

## Build notes

**Built:** all ten tasks. New files: `src/tide.js`, `src/tideart.js`, `src/water.js`, `levels/level02.json`. `main.js` now loads every built level and has `begin(n)`; `drawScenery` takes a sky (dusk, night) and how far the dawn has come; `drawChartSea` takes a tone; the lantern is `drawLantern` in `art.js`.

**Tests** (`python tests/play_level.py`, about 5 minutes; `--only 2` for this level): no page errors.
- Doing nothing: the lantern goes out in set 1, then a retry from that set.
- Walking the sandbar: the sea takes Ichigo.
- The building bot: finished, 0 new tomorrows, 253 s of play, with the shell.
- Level 1's bot: 1 fall (2 on `main` before this), reaches the lantern.
- Also run by hand while tuning: one inner wall each side, kept perfect, loses in set 3; one outer wall alone loses in set 1. Real key presses, the touch button, pausing and restarting were checked too.

**Not fully checked:** the acceptance line on crabs. One was seen climbing a wall and knocking pieces off, and they run from the bot, but no test asserts it. "Outer walls alone lose by set 4 or 5" was too kind: a single outer wall that's never repaired loses in set 1. Nobody has listened to the sound yet.

**How the difficulty works:** in sets 1–3 the third wave is much bigger than the first two. One good wall holds set 1. Sets 2 and 3 need two lines (even a worn outer wall helps the one behind it: `TUMBLE` in `water.js`). From set 4 the tide itself covers the outer sand, so only the inner walls matter. Sand can't be piled while water is against it, so repairs wait for the wave to drain.

**Changed while building:**
- *Scooping:* thin water on the outer sand doesn't count; ↓ piles there. Near the lantern ↓ scoops any puddle.
- *Use on the sandbar* picks up the shell (the script only says it costs a second).
- *The chin scar* is the pale line from Level 2 on, as planned in Level 1.
- *Fall marks* (`SCARS`) are added with each new tomorrow here too.
- *Level 1's end panel* goes on to Level 2. Say if you'd rather it went to the title.
- *End panel:* no tally of failures, as in the script. The HUD's tally marks stay.
- *Music:* the script doesn't mention any now. The night has a sparse song that climbs a step each set (from the older script's rising drone).

**Open questions:**
- Four minutes of night: too long for a level this early? Dropping a set is one line in `level02.json` (the song has six steps, in `main.js`).
- Should the crabs run from Ichigo, or is rebuilding enough?
- The shell is saved (`things`) but nothing shows it after it's picked up. Where should it turn up?
- The crab pinch mark in the first script is gone from the new one, so it isn't here.
