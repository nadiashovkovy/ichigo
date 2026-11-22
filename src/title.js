// ============================================================================
// title.js — the title card: Hokusai's Great Wave as a chart of 2×2-pixel cells, like a
// cross-stitch pattern of the print (made by tools/make_title.py), gently alive: the claws at the
// crest sway as if grasping, the boats rock on the swell, spray falls from the lip into the hollow
// and drifts down over the dark blue, star-shaped sparkles twinkle, the cloud drifts and the sea
// below the horizon rolls.
// There's one picture for the PC's 4:3 screen and a wider one for full screen.
// ============================================================================
import { LW, LH, P } from './config.js';
import { hsh } from './art.js';

const load = src => { const i = new Image(); i.src = src; return i; };
// Each boat is on its own layer (the size of the chart) so it can rock on its own; the wide chart
// crops the bottom boat off the screen, so it has only two.
// The boat by Fuji only ever dips below where it's drawn, so its bow never rises over the mountain.
const boats = (name, list) => list.map(b => ({ img: load(`assets/${name}_boat_${b}.png`), phase: { bottom: 0, fuji: 2.1, left: 4.0 }[b], dipOnly: b === 'fuji' }));
const ARTS = [
  { art: load('assets/title.png'), cloud: load('assets/title_cloud.png'), boats: boats('title', ['left', 'fuji', 'bottom']) },             // 160 cells wide (320 pixels)
  { art: load('assets/title_wide.png'), cloud: load('assets/title_wide_cloud.png'), boats: boats('title_wide', ['left', 'fuji']) },     // 214 cells wide (428 pixels)
];
const SKY = '#e6cea5';   // the art's paper sky (see tools/make_title.py)

// What each cell of a picture is: 1 = open sky or far-sea grey, 2 = dark blue (where white spray
// and sparkles show up), 0 = foam.
function cellKinds(img) {
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
  const g = c.getContext('2d'); g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height).data, kind = new Uint8Array(c.width * c.height);
  for (let i = 0; i < kind.length; i++) {
    const r = d[i * 4], gr = d[i * 4 + 1], b = d[i * 4 + 2];
    kind[i] = (r > gr && gr > b && r - b > 40) || (Math.abs(r - b) < 14 && r < 215 && r > 80) ? 1 : b > r + 40 && r + gr + b < 420 ? 2 : 0;
  }
  return kind;
}

// The columns of cells the boat covers (it's drawn on its own layer, the size of the chart).
function boatSpan(img) {
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
  const g = c.getContext('2d'); g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height).data;
  let a = img.width, b = 0;
  for (let i = 3; i < d.length; i += 4) if (d[i]) { const x = (i >> 2) % img.width; a = Math.min(a, x); b = Math.max(b, x); }
  return [a, b + 1];
}

// A sparkle, in cells around (x, y): it grows from a dot to a plus to a four-pointed star and back.
const SPARKLE = [
  [[0, 0]],
  [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]],
  [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [2, 0], [-2, 0], [0, 2], [0, -2], [1, 1], [-1, 1], [1, -1], [-1, -1]],
];

// Draw the title art at the bottom of the screen (sky above it), at time t, every cell of the chart
// as a 2×2 block. Everything moves in whole cells. Returns where the art went and how wide it is
// (in pixels), so the words can be placed on it.
const C = 2;   // pixels per cell
export function drawTitleArt(g, t) {
  g.fillStyle = SKY; g.fillRect(0, 0, LW, LH);
  const pick = LW > 320 && ARTS[1].art.width ? ARTS[1] : ARTS[0], { art, cloud, boats } = pick;
  if (!art.complete || !art.width) return { x: 0, y: 0, w: LW };
  const kind = pick.kind = pick.kind || cellKinds(art);
  g.imageSmoothingEnabled = false;
  const w = art.width, h = art.height, s = w / 160;   // w, h in cells; positions below are for the 160-cell chart
  const x0 = Math.round((LW - w * C) / 2), y0 = LH - h * C;
  // Draw part of row r (cells a..b) shifted dx cells sideways; the cell at the edge it moved away
  // from is stretched to fill the gap.
  const row = (r, a, b, dx) => {
    const y = y0 + r * C;
    if (dx > 0) g.drawImage(art, a, r, 1, 1, x0 + a * C, y, dx * C, C);
    if (dx < 0) g.drawImage(art, b - 1, r, 1, 1, x0 + (b + dx) * C, y, -dx * C, C);
    g.drawImage(art, a, r, b - a, 1, x0 + (a + dx) * C, y, (b - a) * C, C);
  };
  // the sea below the horizon rolls: each row of cells slides a cell side to side
  const from = Math.round(64 * s), full = Math.round(95 * s);
  for (let r = 0; r < h; r++) {
    const k = Math.max(0, Math.min(1, (r - from) / (full - from)));
    row(r, 0, w, Math.round(Math.sin(t * 1.1 - r * .22) * .9 * k));
  }
  // the claws at the crest sway a cell back and forth, each finger a little after the one above
  const c0 = Math.round(14 * s), c1 = Math.round(48 * s), ca = Math.round(60 * s), cb = Math.min(w, Math.round(106 * s));
  for (let r = c0; r < c1; r++) {
    const k = Math.sin(Math.PI * (r - c0) / (c1 - c0));
    const dx = Math.round(Math.sin(t * 1.7 - r * .45) * .75 * k);
    if (dx) row(r, ca, cb, dx);
  }
  // the boats rock on the swell, each in its own time: bow up, then stern up (each column of cells
  // lifted or lowered a little, more toward the ends), bobbing and drifting with the water
  for (const boat of boats) {
    const { img } = boat;
    if (!img.complete || !img.width) continue;
    const [a, b] = boat.span = boat.span || boatSpan(img), mid = (a + b) / 2, half = (b - a) / 2;
    const p = t * 1.3 + boat.phase, tilt = Math.sin(p) * Math.min(2.2, half / 14);
    const bob = Math.round(Math.sin(p + 1.4) * .7), drift = Math.round(Math.sin(t * 1.1 + boat.phase) * .6);
    for (let x = a; x < b; x++) {
      let dy = Math.round(tilt * (mid - x) / half) + bob;
      if (boat.dipOnly) dy = Math.max(0, dy);
      g.drawImage(img, x, 0, 1, h, x0 + (x + drift) * C, y0 + dy * C, C, h * C);
    }
  }
  if (cloud.complete && cloud.width)   // the cloud drifts
    g.drawImage(cloud, x0 + Math.round(Math.sin(t * .2) * 3) * C, y0, w * C, h * C);
  const at = (cx, cy, ok) => cx >= 0 && cx < w && cy >= 0 && cy < h && ok(kind[cy * w + cx]);
  const cell = (cx, cy) => g.fillRect(x0 + cx * C, y0 + cy * C, C, C);
  g.fillStyle = P.white;
  // spray falling from the lip into the hollow, over the sky and the haze
  for (let i = 0; i < 30 * s; i++) {
    const fall = (t * (4 + hsh(i * 3.3) * 4) + hsh(i * 7.7) * 60) % 60;
    const cx = Math.round((78 + hsh(i * 1.9) * 40 + fall * .3) * s + Math.sin(t * 1.5 + i) * .6), cy = Math.round((32 + hsh(i * 5.1) * 8 + fall) * s);
    if (at(cx, cy, k => k === 1)) cell(cx, cy);
  }
  // flecks of spray drifting slowly down over the dark blue of the wave
  for (let i = 0; i < 45 * s; i++) {
    const fall = (t * (1.5 + hsh(i * 2.7) * 2) + hsh(i * 6.1) * 70) % 70;
    const cx = Math.round((20 + hsh(i * 4.3) * 80) * s), cy = Math.round((20 + hsh(i * 8.9) * 20 + fall) * s);
    if (at(cx, cy, k => k === 2)) cell(cx, cy);
  }
  // sparkles twinkling here and there, over the sky and the dark water
  for (let i = 0; i < 7; i++) {
    const period = 2.4 + hsh(i * 9.7) * 1.8, ph = t / period + hsh(i * 4.1), n = Math.floor(ph), f = ph - n;
    if (f > .6) continue;   // resting between twinkles
    let cx = -1, cy = -1;
    for (let tries = 0; tries < 6 && !at(cx, cy, k => k > 0); tries++) {
      cx = Math.floor(hsh(i * 13.1 + n * 7.3 + tries) * w); cy = Math.floor(hsh(i * 5.9 + n * 3.7 + tries * 1.3) * h * .85);
    }
    if (!at(cx, cy, k => k > 0)) continue;
    const stage = [0, 1, 2, 2, 1, 0][Math.floor(f / .1)];
    for (const [dx, dy] of SPARKLE[stage]) cell(cx + dx, cy + dy);
  }
  return { x: x0, y: y0, w: w * C };
}
