// ============================================================================
// art.js — the scenery: the sky with the title card's cloud, Fuji, the far and near sea of the level,
// the intro's sea (drawn straight in 2×2 cells, like the title card's chart), and the carp streamer.
// Most of it draws in 960×540 game units; the pixel pipeline turns it into pixel art.
// ============================================================================
import { W, H, TOP, TOP_PX, LW, LH, SEA, P, PIXEL, px, onPixel } from './config.js';
import { seaY } from './sea.js';

// Seeded "random" number in 0..1, so things scattered about stay put from frame to frame.
export const hsh = n => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };

// Run fn(px, py) with the canvas in real-pixel space, where (px, py) is the whole pixel under
// the point (x, y) of the current drawing space. Keeps small details crisp instead of smeared.
function atPixel(g, x, y, fn) {
  const p = g.getTransform().transformPoint(new DOMPoint(x, y));
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); fn(Math.round(p.x), Math.round(p.y)); g.restore();
}

// One crisp bubble: n = 2 is a 2×2 dot, n = 3 a little round 3×3 one (uses the current fill colour).
function dot(g, x, y, n = 2) {
  atPixel(g, x, y, (px, py) => {
    if (n < 3) { g.fillRect(px, py, n, n); return; }
    const c = g.fillStyle; g.fillStyle = P.pale; g.fillRect(px, py, 3, 3);   // pale-blue corners round it off
    g.fillStyle = c; g.fillRect(px + 1, py, 1, 3); g.fillRect(px, py + 1, 3, 1);
  });
}

// White bubbles scattered on dark water (the print's "snow" on the blue).
function bubbles(g, x0, x1, yAt, seed, depth, density) {
  g.fillStyle = P.foam;
  const step = 18, k0 = Math.floor(x0 / step), k1 = Math.ceil(x1 / step);
  for (let k = k0; k <= k1; k++) {
    if (hsh(k * 1.37 + seed) > density) continue;
    const bx = k * step + hsh(k * 2.71 + seed) * step, r = hsh(k * 5.17 + seed);
    const by = yAt(bx) + 8 + Math.pow(r, 1.8) * depth;
    dot(g, bx - x0, by, hsh(k * 9.3 + seed) > .75 ? 3 : 2);
  }
}

// A wavy, roughly horizontal line exactly `thick` pixels thick, drawn one pixel column at a time
// so it never wobbles between thicknesses. yAt(x) gives the line's centre at x (current drawing space).
export function waveLine(g, x0, x1, yAt, thick = 1) {
  const T = g.getTransform(), inv = T.inverse();
  const a = T.transformPoint(new DOMPoint(x0, 0)).x, b = T.transformPoint(new DOMPoint(x1, 0)).x;
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
  let prev = null;
  for (let c = Math.floor(Math.min(a, b)); c < Math.ceil(Math.max(a, b)); c++) {
    const x = inv.transformPoint(new DOMPoint(c + .5, 0)).x;
    const y = Math.round(T.transformPoint(new DOMPoint(x, yAt(x))).y - thick / 2);
    let top = y, bot = y + thick;
    if (prev !== null) { if (y > prev + thick) top = prev + thick; else if (y + thick < prev) bot = prev; }   // no gaps on steep bits
    g.fillRect(c, top, 1, bot - top); prev = y;
  }
  g.restore();
}

// Paper sky with the title card's cloud (assets/cloud.png, cut from the chart), a few of them,
// some flipped, drifting by slowly behind the scenery. Every cell of a cloud is 2×2 pixels.
// top = how much sky shows above the world (normally TOP).
const cloud = new Image(); cloud.src = 'assets/cloud.png';
export function drawSky(g, camX, top = TOP) {
  g.fillStyle = P.sky; g.fillRect(0, -top, W, H + top);   // flat paper sky, as in the print
  if (!cloud.width) return;
  const cw = cloud.width * px(2), ch = cloud.height * px(2), cell = px(2), span = 1500;
  g.save(); g.imageSmoothingEnabled = false;
  for (let i = 0; i < 3; i++) {
    const x = Math.round((((i * 520 + 140 - camX * 0.12) % span + span) % span - cw) / cell) * cell;
    const y = Math.round((40 - top + (i * 67) % 90) / cell) * cell;
    if (i % 2) { g.save(); g.translate(x + cw, y); g.scale(-1, 1); g.drawImage(cloud, 0, 0, cw, ch); g.restore(); }
    else g.drawImage(cloud, x, y, cw, ch);
  }
  g.restore();
}

// Mt Fuji, drawn in cells the same way as the title card's (see draw_fuji in tools/make_title.py).
// Each level sees it a different way, after Hokusai's Thirty-six Views of Mount Fuji (levels/*.json,
// "fuji": { "view": ... }):
//   grey  - The Great Wave: grey, a white peak whose snow line is ragged, streaks of snow running down
//   red   - Fine Wind, Clear Morning ("Red Fuji"): rust red, broad and concave, snow only in the
//           gullies at the top, dark forest round its foot
//   storm - Rainstorm Beneath the Summit: brown, darkening to black below, the snowy peak bright above the storm
export const FUJI_VIEWS = {
  grey:  { snow: .5,  streak: .8,  body: P.grey3, fleck: P.grey2, curve: 1 },
  red:   { snow: .12, streak: .34, body: P.red,   fleck: P.brown, curve: 1.5, forest: .86, scatter: true },
  storm: { snow: .16, streak: .3,  body: P.brown, fleck: P.outline, curve: 1.2, scatter: true, dark: .45 },
};
// Calls cell(x, r, colour) for every cell of a Fuji `rows` cells tall and `half` cells wide each side
// at its foot (or [left, right] for a lopsided one); x is measured from the peak, r down from the peak.
export function fujiCells(cell, rows, half, view = 'grey') {
  const v = FUJI_VIEWS[view] || FUJI_VIEWS.grey, [hl, hr] = Array.isArray(half) ? half : [half, half];
  for (let r = 0; r < rows; r++) {
    const k = (r + .5) / rows, flat = v.curve > 1 ? 1.5 : 0, kk = Math.pow(k, v.curve);   // k: 0 at the peak, 1 at the foot
    for (let x = Math.floor(-Math.max(.6, kk * hl + flat)); x < Math.ceil(Math.max(.6, kk * hr + flat)); x++) {
      const m = ((x % 12) + 12) % 12, h = hsh(x * 7.31 + r * 3.17);
      const snow = k < v.snow + (m % 3 === 0 ? .12 : 0) || (m % 4 === 1 && k < v.streak);
      let c = snow ? P.white : (v.scatter ? h < .04 : (x + r) % 5 === 0) ? v.fleck : v.body;
      const edge = v.forest && v.forest + Math.abs(((x % 4) + 4) % 4 - 2) * .012;   // the treeline, in little points
      if (v.dark && !snow && k > v.dark + (h - .5) * .08) c = h < .03 ? P.navy : P.outline;   // the dark lower slopes
      if (v.forest && k > edge) c = (((x + Math.floor(r / 2) * 2) % 4 + 4) % 4 === 0) ? P.navy : P.olive;   // the forest, in rows of trees
      cell(x, r, c);
    }
  }
}
// Fuji on the level's horizon. It slides with the camera a whole cell at a time.
export function drawFuji(g, camX, fuji = {}) {
  const f = { x: 470, base: 392, rows: 26, half: 28, view: 'grey', ...fuji };
  const u = CELL * PIXEL;                                                  // one cell, in world units
  const cx = Math.round((f.x - camX * 0.05) / u);                         // the peak's cell column
  const top = Math.round((f.base + TOP) / u) - f.rows;                     // the peak's cell row (from the screen's top)
  fujiCells((x, r, c) => { g.fillStyle = c; g.fillRect((cx + x) * u, (top + r) * u - TOP, u, u); }, f.rows, f.half, f.view);
}

// Distant swells between the haze and the near sea.
export function drawSwells(g, camX, t) {
  const sw = sx => { const wx = sx + camX * .5; return 400 + Math.sin(wx * 0.02 - t) * 7 + Math.sin(wx * 0.007) * 6; };
  g.fillStyle = P.deep; g.beginPath(); g.moveTo(0, H);
  for (let sx = 0; sx <= W; sx += 8) g.lineTo(sx, sw(sx));
  g.lineTo(W, H); g.fill();
  g.fillStyle = P.outline; waveLine(g, 0, W, sw, 2);
  g.fillStyle = P.pale; waveLine(g, 0, W, sx => sw(sx) + 6, 2);
  g.fillStyle = P.foam; waveLine(g, 0, W, sx => sw(sx) + 3, 2);
  g.fillStyle = P.navy; waveLine(g, 0, W, sx => sw(sx) + 12, 2);
}

// The distant view in the level: Fuji, horizon water, and mid swells.
export function drawFar(g, camX, t, fuji) {
  drawFuji(g, camX, fuji);
  const hg = g.createLinearGradient(0, 375, 0, 420); hg.addColorStop(0, P.pale); hg.addColorStop(1, P.steel);
  g.fillStyle = hg; g.fillRect(0, 380, W, H);
  g.fillStyle = P.deep; g.beginPath(); g.moveTo(0, H);
  const sw = sx => { const wx = sx + camX * .5; return 404 + Math.sin(wx * 0.02 - t) * 10 + Math.sin(wx * 0.007) * 8; };
  for (let sx = 0; sx <= W; sx += 9) g.lineTo(sx, sw(sx));
  g.lineTo(W, H); g.fill();
  g.fillStyle = P.steel; waveLine(g, 0, W, sx => sw(sx) + 9, 1);
  bubbles(g, camX * .5, camX * .5 + W, x => sw(x - camX * .5), 7, 26, .35);
}

// --- little lives on the water, drawn in pixel space after the scenery has been turned into pixels ---
// A tiny picture made of letters (see sprite.js): K ink, Y ochre, T tan, n navy, R red, W white.
const PIX = { K: P.outline, Y: P.ochre, T: P.tan, n: P.navy, R: P.red, W: P.white, G: P.grey3, O: P.olive };
export function drawPix(g, rows, x, y, flip = false) {
  rows.forEach((row, r) => [...row].forEach((ch, c) => {
    if (ch === '.') return;
    g.fillStyle = PIX[ch]; g.fillRect(x + (flip ? row.length - 1 - c : c), y + r, 1, 1);
  }));
}
// A fishing boat far off on the horizon, like the print's, three rowers bent over their oars.
const FAR_BOAT = [
  '.....n...n...n.....',
  'K....n...n...n...K.',
  'KYYYYYYYYYYYYYYYYYK',
  '.KTTTTTTTTTTTTTTTK.',
  '..KKKKKKKKKKKKKKK..',
];
// Gulls, wings up and wings level.
const GULL = [['K...K', '.K.K.', '..K..'], ['.....', 'KK.KK', '..K..']];
// The boat bobs on the horizon (slowly passing as the camera moves); gulls wheel across the sky.
export function drawLife(g, camX, t) {
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
  const span = 1600 / PIXEL, horizon = Math.round((391 + TOP) / PIXEL);
  for (let i = 0; i < 2; i++) {
    const x = Math.round((((i * 900 + 250 - camX * .15 + t * 3) / PIXEL) % span + span) % span) - 20;
    drawPix(g, FAR_BOAT, x, horizon - 4 + Math.round(Math.sin(t * 1.3 + i * 2) * .8), i % 2 === 1);
  }
  for (let i = 0; i < 3; i++) {
    const dir = i % 2 ? -1 : 1, w = LW + 40;
    const x = Math.round(((((i * 157 + 60 - camX * .3 / PIXEL + dir * t * (9 + i * 3)) % w) + w) % w) - 20);
    const y = Math.round(28 + i * 19 + Math.sin(t * .7 + i * 2.1) * 6 - TOP_PX * 0);
    drawPix(g, GULL[Math.floor(t * (3 + i * .7) + i) % 2], x, y);
  }
  g.restore();
}

// The intro's sea, drawn straight in cells of 2×2 pixels like the title card's chart: an ink outline
// along the surface, cream and white foam flecked with light blue just under it, then bands of
// blue that follow the waves down into Prussian blue, with white bubbles. Cells are pinned to the
// world, so they ride the waves.
// surf(wx) = the surface's height at world x (game units). Only columns from x0 to x1 (pixels) are drawn.
export const CELL = 2;
function seaCell(c, d, t) {
  const h = hsh(c * 12.99 + d * 78.23);
  if (d <= 2) return h < .22 ? P.white : h < .36 ? P.pale : P.foam;   // foam along the top
  const b = (d - 3) * .5 + 1.5 * Math.sin(c * .13 + d * .3 - t * .5) + 1.0 * Math.sin(c * .041 + t * .3);
  const band = ((Math.floor(b) % 8) + 8) % 8;
  let col = [P.pale, P.foam, P.steel, P.deep, P.navy, P.deep, P.steel, P.foam][band];
  if ((col === P.navy || col === P.deep) && h < .03) col = P.white;   // bubbles
  return col;
}
export function drawChartSea(g, camX, t, surf, x0 = 0, x1 = LW) {
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
  const cam = Math.round(camX / PIXEL), rows = Math.ceil(LH / CELL);
  const row = c => Math.round((surf((c + .5) * CELL * PIXEL) / PIXEL + TOP_PX) / CELL);   // the surface's cell row in column c
  const c0 = Math.floor((cam + x0) / CELL), c1 = Math.ceil((cam + x1) / CELL);
  const tops = []; for (let c = c0 - 2; c <= c1 + 2; c++) tops.push(row(c));
  const top = c => tops[c - c0 + 2];
  for (let c = c0; c < c1; c++) {
    const r0 = top(c), outlineTo = Math.max(r0, top(c - 1) - 1, top(c + 1) - 1), sx = c * CELL - cam;
    let run = null, start = r0;   // draw each column as runs of one colour
    for (let r = r0; r <= rows; r++) {
      const col = r === rows ? null : r <= outlineTo ? P.outline : seaCell(c, r - r0, t);
      if (col !== run) { if (run) { g.fillStyle = run; g.fillRect(sx, start * CELL, CELL, (r - start) * CELL); } run = col; start = r; }
    }
  }
  g.restore();
}

// The near sea in the level: Prussian blue with the print's bands, cream foam along the surface,
// and white bubbles.
export function drawSea(g, camX, t) {
  const gr = g.createLinearGradient(0, SEA - 20, 0, H); gr.addColorStop(0, P.deep); gr.addColorStop(.45, P.navy); gr.addColorStop(1, P.navy);
  g.fillStyle = gr; g.beginPath(); g.moveTo(0, H);
  for (let sx = 0; sx <= W; sx += 6) g.lineTo(sx, seaY(sx + camX, t));
  g.lineTo(W, H); g.fill();
  for (let off = 18, n = 0; off < 120; off += 18, n++) {   // the print's bands, each exactly one pixel thick
    g.fillStyle = n % 2 ? P.steel : P.pale;
    waveLine(g, 0, W, sx => seaY(sx + camX, t - off * 0.01) + off, 1);
  }
  // just under the surface: clean bands of cream foam and pale and steel blue
  for (const [off, thick, c, lag] of [[5, 6, P.foam, 0], [10, 3, P.pale, .04], [14, 2, P.steel, .08], [24, 2, P.foam, .14]]) {
    g.fillStyle = c; waveLine(g, 0, W, sx => seaY(sx + camX, t - lag) + px(off), thick);
  }
  g.fillStyle = P.foam; waveLine(g, 0, W, sx => seaY(sx + camX, t), 2);   // white line along the surface
  bubbles(g, camX, camX + W, x => seaY(x, t), 3, 60, .55);
}

// Carp streamer (koinobori) = checkpoint. It lifts and flies when reached.
export function drawKoinobori(g, x, y, on, t) {
  g.fillStyle = P.ink; g.fillRect(x - px(1) / 2, y - 72, px(1), 72);
  const wav = Math.sin(t * 6) * 4 * on;
  g.save(); g.translate(x, y - 68); g.rotate((1 - on) * 1.3);
  g.fillStyle = on ? P.red : P.grey2;
  g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(-18, -7 + wav, -40, -3 + wav); g.lineTo(-31, 5 + wav); g.lineTo(-40, 12 + wav); g.quadraticCurveTo(-18, 13 + wav, 0, 11); g.closePath(); g.fill();
  g.fillStyle = P.foam; g.fillRect(-9, 3, 6, 6);
  g.restore();
}
