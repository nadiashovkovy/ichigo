// ============================================================================
// title.js — the title card: Hokusai's Great Wave as a chart of cells, like a cross-stitch pattern
// of the print (assets/title_chart.png, made by tools/make_title.py: 213 cells wide, each drawn 3×3
// pixels), filling the screen. It's gently alive, using only its own cells: the claws at the crest
// sway as if grasping, and the sea below the horizon rolls. The words go in its sky (see drawTitle
// in scenes.js).
// ============================================================================
import { LW, LH } from './config.js';

const art = new Image(); art.src = 'assets/title_chart.png';
const SKY = '#dac4a0';   // the chart's paper sky (above it on the PC's taller screen)
const C = 3;             // pixels per cell

// Draw the chart at the bottom of the screen at time t (on full screen's shorter 16:9 a little of
// its sea is cropped off the bottom). Everything moves in whole cells. Returns where it went and how
// wide it is (in pixels), so the words can be placed on it.
export function drawTitleArt(g, t) {
  g.fillStyle = SKY; g.fillRect(0, 0, LW, LH);
  if (!art.complete || !art.width) return { x: 0, y: 0, w: LW };
  const w = art.width, h = art.height;   // in cells
  const x0 = Math.floor((LW - w * C) / 2), y0 = h * C > LH ? Math.round((LH / C - h) * .25) * C : LH - h * C;
  g.save(); g.imageSmoothingEnabled = false;
  // Draw cells a..b of row r shifted dx cells sideways; the cell at the edge it moved away from is
  // stretched to fill the gap.
  const row = (r, a, b, dx) => {
    const y = y0 + r * C;
    if (dx > 0) g.drawImage(art, a, r, 1, 1, x0 + a * C, y, dx * C, C);
    if (dx < 0) g.drawImage(art, b - 1, r, 1, 1, x0 + (b + dx) * C, y, -dx * C, C);
    g.drawImage(art, a, r, b - a, 1, x0 + (a + dx) * C, y, (b - a) * C, C);
  };
  // the sea below the horizon rolls: each row of cells slides a cell side to side, more toward the bottom
  const from = Math.round(h * .6), full = Math.round(h * .9);
  for (let r = 0; r < h; r++) {
    const k = Math.max(0, Math.min(1, (r - from) / (full - from)));
    row(r, 0, w, Math.round(Math.sin(t * 1.1 - r * .1) * .9 * k));
  }
  // the claws at the crest sway a cell back and forth, each finger a little after the one above
  const c0 = Math.round(h * .13), c1 = Math.round(h * .45), ca = Math.round(w * .375), cb = Math.round(w * .66);
  for (let r = c0; r < c1; r++) {
    const k = Math.sin(Math.PI * (r - c0) / (c1 - c0)), dx = Math.round(Math.sin(t * 1.7 - r * .2) * .75 * k);
    if (dx) row(r, ca, cb, dx);
  }
  g.restore();
  return { x: x0, y: y0, w: w * C };
}
