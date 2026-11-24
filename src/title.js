// ============================================================================
// title.js — the title card: Hokusai's Great Wave, drawn in pixels (greatwave.js), filling the screen
// and gently alive: the claws at the crest grasp, the boats ride up and down, the water rolls. The
// words go in its sky (see drawTitle in scenes.js).
// ============================================================================
import { LW } from './config.js';
import { paintWave, waveLoop } from './greatwave.js';

const picture = waveLoop(paintWave, 20, 4.4);

// Draw the title card at time t. Returns where it went and how wide it is (in pixels), so the words
// can be placed on it.
export function drawTitleArt(g, t) {
  picture.ready();
  g.drawImage(picture.at(t), 0, 0);
  return { x: 0, y: 0, w: LW };
}
