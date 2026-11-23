# Ichigo: notes for Claude Code

A fan recreation of *Ichigo: A Child of the Sea*, the game in Gabrielle Zevin's novel *Tomorrow, and Tomorrow, and Tomorrow*. Fifteen levels, one child (Ichigo, they/them) aging from 3 to 10 on the way home across the sea. Plain JavaScript and canvas, no libraries, no build step. Owner: Nadia.

## How we work

The work is split between two Claudes:

- **Claude in claude.ai** (the "Ichigo" project) writes the design: the level script and one build spec per level. These come into the repo as pull requests.
- **You, Claude Code in Nadia's VS Code,** build each level from its spec, run it, and polish it with Nadia.

For each level:

1. Read the level's section in `docs/levels-and-script.md` (the story and what the player does) and its spec in `docs/specs/level-NN.md` (what to build and how to check it).
2. Work on a branch named `level-NN-<short-name>`.
3. Build the spec's tasks in order. The spec's **Acceptance checks** are the definition of done.
4. Run `python tests/play_level.py` before saying a level is done, and look at the screenshots in `tests/screens/`.
5. At the bottom of the spec, fill in its **Build notes** section: what you built, anything you changed from the spec and why, and open questions. That's how the claude.ai side learns what happened before it writes the next spec.

If the spec and the script disagree, the spec wins for code and the script wins for story. If the spec conflicts with how the code already works, follow the code and note it in Build notes.

## Where things are

| Path | What |
|---|---|
| `docs/levels-and-script.md` | All 15 levels: game type, controls, stakes, beats, script. A snapshot of the claude.ai doc. |
| `docs/specs/level-NN.md` | Build spec for one level |
| `levels/levelNN.json` | Level data (wreckage list, sea size, goal). Levels are data, not code. |
| `src/config.js` | Every tuning number and the palette `P`. New tuning goes here. |
| `src/state.js` | Shared state `S` (scene, timers, level, tomorrows) |
| `src/main.js` | Loads the level, runs the loop, switches scenes |
| `src/scenes.js` | Title, beach intro, play, level end, HUD |
| `src/player.js` | Ichigo's movement on rocking wreckage, falling in |
| `src/sprite.js` | Ichigo's pixel frames (letter grids), fall marks (`SCARS`) |
| `src/wreckage.js`, `src/sea.js` | Floating wreckage, the sea's height |
| `src/art.js`, `src/title.js`, `src/dawn.js` | Scenery, title card, the Hokusai print shown at each new tomorrow |
| `src/pixel.js`, `src/text.js` | Pixel pipeline (palette snapping), bitmap font and rainbow cover lettering |
| `src/input.js`, `src/pc.js` | Keyboard and touch; the 1996 PC frame around the game |
| `src/beach.js`, `src/cards.js` | Level 1's playable beach and the wave; story cards |
| `src/audio.js` | All sound, synthesised: the Lullaby, music, sea, gulls, the tsunami, falling in |
| `src/bubbles.js`, `src/icons.js`, `src/people.js`, `src/save.js` | Speech bubbles and their icons; Kaa-chan and Ojii-san (for later levels); the save |
| `tests/play_level.py` | Headless play-test bot (Playwright) |

Run locally: `python3 -m http.server 8000`, then open http://localhost:8000.

## Rules of the game's design

- **Wordless during play.** No text while the player is playing except titles, level cards and the tally of tomorrows. Ichigo speaks only the words they have learned, shown as an icon bubble. Other characters speak in pictogram bubbles.
- **Story cards are the exception** (added at Nadia's request): short click-through text cards *between* moments, while the world waits, to tell the story and say what to do (`src/cards.js`). Level 1 has them at the start of the beach and on the white after the wave. Keep them few and short; any key goes on, Esc skips.
- **Failure is never final.** Every failure is "a new tomorrow": the dawn print, then a retry from the last checkpoint. Never a game-over screen.
- **Every level needs stakes:** a clock, a hazard, a scarce resource.
- **Aging changes play.** Each age gains and loses abilities (see the aging table in the script's Through-lines and in the design doc).
- **Marks stay.** Some marks on Ichigo's body are permanent story marks and carry across levels (separate from the per-level fall marks in `SCARS`). The chin scar from Level 1 is the one that matters at the end.

## Code conventions (match what's here)

- Pixel art rules: every line and edge is whole art pixels. Use `px()`, `onPixel()`, `toPx()` from `config.js`. Colours come only from the palette `P`; `quantize()` snaps drawn art to it.
- Sprites are letter grids (see `sprite.js`): one letter per colour, frames face right, `drawSprite` mirrors and outlines them. New characters follow the same style.
- Comments are plain English explaining *why*, written so Nadia can read them. Keep that voice.
- Keep `window.ichigo` exposing what the test bot needs.
- Don't retune Level 1's feel (`MOVE`, `DECK`, `WRECKAGE`) unless a spec asks for it.
- Commit messages: short, plain, present tense.
