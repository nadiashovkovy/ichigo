// ============================================================================
// art.js — the scenery: the dusk sky (after the game's cover), Fuji, the far and near sea of the level,
// the intro's sea (drawn straight in 2×2 cells, like the title card's chart), and the carp streamer.
// Most of it draws in game units; the pixel pipeline turns it into pixel art. Thicknesses are given in
// game units too (and turned into whole pixels with toPx), so the art keeps its proportions on both screens.
// ============================================================================
import { W, H, TOP, TOP_PX, LW, LH, SEA, P, PIXEL, px, onPixel, toPx } from './config.js';
import { seaY } from './sea.js';
import { scale2x, pixelBuffer, pack } from './pixel.js';

// Seeded "random" number in 0..1, so things scattered about stay put from frame to frame.
export const hsh = n => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };

// A wavy, roughly horizontal line exactly `thick` pixels thick, drawn one pixel column at a time
// so it never wobbles between thicknesses. yAt(x) gives the line's centre at x (current drawing space).
// (Callers give the thickness as toPx(game units).)
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

// The dusk sky, after the game's cover, pixel by pixel: night blue at the top, through indigo,
// plum and violet, to a rose and ember glow at the horizon (the bands' edges stitched together a cell
// at a time); stars twinkling in the dark (shapes and speeds below are in units of 2 pixels: q); long layered clouds drawn like the cover's line-art, edged
// in night blue, drifting slowly with red flecks among them. top = how much sky shows above the
// world (normally TOP).
const SKY_BANDS = [[.2, P.night], [.42, P.indigo], [.6, P.plum], [.73, P.violet], [.84, P.mauve], [.93, P.rosewood], [9, P.ember]];
// (The sky, Fuji and the far sea are all painted into one buffer of pixels, B, which drawScenery
// then draws in one go.)
const sceneryBuf = pixelBuffer();
function drawSky(B, camX, top, t) {
  const fill = (x, y, w, h, c) => B.rect(x, y, w, h, c);
  const C = CELL, q = 2 / C, cols = Math.ceil(LW / C), horizon = Math.ceil((390 + top) / PIXEL / C), rows = Math.ceil(LH / C);
  const band = f => SKY_BANDS.find(([end]) => f < end)[1];
  for (let r = 0; r < rows; r++) {   // the bands, a row at a time (cell by cell only where two meet)
    const f = r / horizon, a = band(f - .012), b = band(f + .012);
    if (a === b) { fill(0, r * C, cols * C, C, a); continue; }
    for (let c = 0; c < cols; c++) fill(c * C, r * C, C, C, (c + r) % 2 ? a : b);
  }
  for (let i = 0; i < 80; i++) {   // stars, in the dark top of the sky
    const x = Math.floor(hsh(i * 3.1) * cols), y = Math.floor(Math.pow(hsh(i * 7.3), 1.6) * horizon * .55), tw = Math.sin(t * (1 + hsh(i) * 2) + i);
    if (tw < -.4) continue;
    const big = hsh(i * 4.4) < .35 ? 2 : 1;   // stars of two sizes
    const sc = hsh(i * 5.5) < .3 ? P.aqua : P.mist; fill(x * C, y * C, C * big, C * big, sc);
    if (hsh(i * 9.1) < .12 && tw > .6) { fill((x - 2) * C, y * C, C * 5, C, sc); fill(x * C, (y - 2) * C, C, C * 5, sc); }   // a bright one, glinting
  }
  for (let k = 0; k < 4; k++) {   // the clouds: long strata, each with a night-blue edge on top and a warm lit underside
    const y0 = Math.round(horizon * (.32 + k * .15)), drift = (camX * (.05 + k * .03) / PIXEL / C + t * (.4 + k * .2) * q) / q;
    const body = [P.plum, P.violet, P.mauve, P.rosewood][k], lit = [P.violet, P.mauve, P.rosewood, P.ember][k];
    for (let c = 0; c < cols; c++) {
      const u = c / q + drift, th = Math.round((7 * Math.sin(u * .028 + k * 2.1) + 3 * Math.sin(u * .09 + k) + 1) * q);
      if (th < q) continue;
      const yTop = y0 - Math.round(th * .6 + Math.sin(u * .08 + k) * 1.5 * q);
      fill(c * C, yTop * C, C, C, P.night);
      fill(c * C, (yTop + 1) * C, C, Math.max(1, th - 1) * C, body);
      fill(c * C, (yTop + th) * C, C, C, lit);
      if (th > 5 * q && Math.sin(u * .2 + k * 3) > .6) fill(c * C, (yTop + Math.round(th * .5)) * C, C, C, lit);   // a seam of light between the layers
    }
  }
  for (let i = 0; i < 14; i++) {   // red flecks among the clouds, like the cover's
    const x = Math.round(((hsh(i * 4.7) * cols * 1.4 - camX * .08 / PIXEL / C - t * (1 + hsh(i) * 2) * q) % (cols * 1.4) + cols * 1.4) % (cols * 1.4) - cols * .2);
    const y = Math.round(horizon * (.35 + hsh(i * 8.3) * .5)), n = Math.round((3 + Math.floor(hsh(i * 2.9) * 4)) * q);
    for (let j = 0; j < n; j++) fill((x + j) * C, (y - Math.floor(j / (2 * q))) * C, C, C, P.ember);   // a slanting streak, thicker in the middle
    fill((x + Math.round(n * .3)) * C, (y - Math.floor(n * .3 / (2 * q)) + 1) * C, Math.round(n * .4) * C, C, P.ember);
  }
}

// Mt Fuji, drawn in cells the same way as the title card's (see draw_fuji in tools/make_title.py).
// Each level sees it a different way, after Hokusai's Thirty-six Views of Mount Fuji (levels/*.json,
// "fuji": { "view": ... }):
//   grey  - The Great Wave: grey, a white peak whose snow line is ragged, streaks of snow running down
//   red   - Fine Wind, Clear Morning ("Red Fuji"): rust red, broad and concave, snow only in the
//           gullies at the top, dark forest round its foot
//   dusk  - Level 1 at dusk, after the game's cover: indigo, the snow catching the last light
//   blue  - small and far off across water, its body blue in the haze (Goten-yama Hill, in dawn.js)
//   storm - Rainstorm Beneath the Summit: brown, darkening to black below, the snowy peak bright above the storm
export const FUJI_VIEWS = {
  dusk:  { snow: .45, streak: .7,  body: P.indigo, fleck: P.plum, curve: 1 },   // at dusk, as on the cover: indigo, its snow catching the light
  blue:  { snow: .42, streak: .62, body: P.deep, fleck: P.navy, curve: 1 },   // far off across the water, blue in the haze
  grey:  { snow: .5,  streak: .8,  body: P.grey3, fleck: P.grey2, curve: 1 },
  red:   { snow: .12, streak: .34, body: P.red,   fleck: P.rust,  curve: 1.5, forest: .86, scatter: true, shade: P.rust, trees: [P.pine, P.leaf] },
  storm: { snow: .16, streak: .3,  body: P.wood,  fleck: P.brown, curve: 1.2, scatter: true, dark: .45, shade: P.brown },
};
// Calls cell(x, r, colour) for every cell of a Fuji `rows` cells tall and `half` cells wide each side
// at its foot (or [left, right] for a lopsided one); x is measured from the peak, r down from the peak.
// sc: how many cells make one cell of the pattern (the snow streaks, flecks, trees), so it stays bold
// however finely the mountain is drawn.
export function fujiCells(cell, rows, half, view = 'grey', sc = 1) {
  const v = FUJI_VIEWS[view] || FUJI_VIEWS.grey, [hl, hr] = Array.isArray(half) ? half : [half, half];
  for (let r = 0; r < rows; r++) {
    const k = (r + .5) / rows, flat = v.curve > 1 ? 1.5 : 0, kk = Math.pow(k, v.curve);   // k: 0 at the peak, 1 at the foot
    for (let x = Math.floor(-Math.max(.6, kk * hl + flat)); x < Math.ceil(Math.max(.6, kk * hr + flat)); x++) {
      const X = Math.floor(x / sc), R = Math.floor(r / sc);   // (the pattern's cell)
      const m = ((X % 12) + 12) % 12, h = hsh(X * 7.31 + R * 3.17);
      const snow = k < v.snow + (m % 3 === 0 ? .12 : 0) || (m % 4 === 1 && k < v.streak);
      let c = snow ? P.white : (v.scatter ? h < .04 : (X + R) % 5 === 0) ? v.fleck : v.body;
      const edge = v.forest && v.forest + Math.abs(((X % 4) + 4) % 4 - 2) * .012;   // the treeline, in little points
      if (v.shade && !snow && x < -kk * hl * .4 + ((h - .5) * 6 + Math.sin(R * .7) * 2) * sc) c = h < .1 ? v.fleck : v.shade;   // the flank in shadow
      if (v.dark && !snow && k > v.dark + (h - .5) * .08) c = h < .03 ? P.navy : P.outline;   // the dark lower slopes
      const [dark, light] = v.trees || [P.navy, P.olive];
      if (v.forest && k > edge) c = (((X + Math.floor(R / 2) * 2) % 4 + 4) % 4 === 0) ? dark : light;   // the forest, in rows of trees
      cell(x, r, c);
    }
  }
}
// Fuji on the level's horizon. It slides with the camera a whole cell at a time.
function drawFuji(B, camX, fuji = {}) {
  const f = { x: 470, base: 392, rows: 26, half: 28, view: 'grey', ...fuji };   // rows, half: in 4-unit cells (as in levels/*.json)
  const u = CELL * PIXEL, k = 4 / u;                                       // one cell, in world units; cells per 4 units
  f.rows = Math.round(f.rows * k); f.half = Array.isArray(f.half) ? f.half.map(h => Math.round(h * k)) : Math.round(f.half * k);
  const cx = Math.round((f.x - camX * 0.05) / u);                         // the peak's cell column
  const top = Math.round((f.base + TOP) / u) - f.rows;                     // the peak's cell row (from the screen's top)
  fujiCells((x, r, c) => B.rect((cx + x) * CELL, (top + r) * CELL, CELL, CELL, c), f.rows, f.half, f.view, Math.max(1, Math.round(k / 2)));
}

// The distant sea, in the level and the intro, after the river under Mannen Bridge (see dawn.js): water
// in rows of 2×2 cells, the sunset's glow at the horizon, then ocean blue, then dark teal striped with
// ocean blue (the cover's colours). Small waves
// dot it, each an aqua cap (ember in the glow) with a night-blue shadow under it (and, nearer, a raised crest): they drift along, each
// row the opposite way to the one above, and rise and fade away again. Nearer rows have bigger waves
// that move faster, so the water lies flat into the distance; it all slides by at half the camera's speed.
function drawFarSea(B, camX, t) {
  const C = CELL, q = 2 / C, top = Math.round((380 + TOP) / PIXEL / C), rows = Math.ceil(LH / C), cols = Math.ceil(LW / C);   // (q: cells per 2 pixels)
  const base = r => { const d = (r - top) * C * PIXEL; return d < 6 ? P.mauve : d < 20 ? P.ocean : Math.floor((r - top) / q) % 5 ? P.abyss : P.ocean; };   // the glow reflected at the horizon
  for (let r = top; r < rows; r++) B.rect(0, r * C, cols * C, C, base(r));
  for (let r = top; r < rows; r++) {
    const d = (r - top) * C * PIXEL;   // how far below the horizon, in game units
    const len = (3 + d / 6) * q, dir = Math.floor(r / q) % 2 ? 1 : -1, shift = (camX * .5 * (1 + d / 60)) / PIXEL / C + t * (1.5 + d / 14) * q * dir;
    if (r % q) continue;   // (a row of waves every 2 pixels)
    const cap = d < 6 ? (r % 3 ? P.rosewood : P.ember) : P.aqua, shade = P.night;
    for (let n = Math.floor(shift / len) - 1; n * len - shift < cols; n++) {
      const h = hsh(n * 3.3 + r * 7.1);
      if (h > .26) continue;
      const rise = Math.sin(t * (1.1 + h * 2) + h * 40);   // each wave rises and fades in its own time
      if (rise < -.2) continue;
      const x = Math.round(n * len - shift + h * len * .5), l = Math.max(2, Math.round(len * (.5 + h)));
      B.rect(x * C, r * C, l * C, C, cap);
      if (rise > .3 && l >= 4 * q && r > top + 2) { B.rect((x + Math.round(l * .25)) * C, (r - 1) * C, Math.round(l * .5) * C, C, cap); B.rect((x + Math.round(l * .4)) * C, (r - 2) * C, Math.max(1, Math.round(l * .2)) * C, C, cap); }   // the crest, rounded
      if (r + 1 < rows) B.rect((x + 2) * C, (r + 1) * C, Math.max(1, l - 2) * C, C, shade);   // the shadow under it
    }
  }
}

// The scenery behind everything, in the level and the intro: the dusk sky, Fuji, and the far sea.
export function drawScenery(g, camX, t, fuji) {
  const B = sceneryBuf.begin();
  drawSky(B, camX, TOP, t); drawFuji(B, camX, fuji); drawFarSea(B, camX, t);
  B.draw(g);
}

// --- little lives on the water, drawn in pixel space after the scenery has been turned into pixels ---
// A tiny picture made of letters (see sprite.js): K ink, Y ochre, T tan, n navy, R red, W white, M mist.
// The pictures below are drawn small and doubled with Scale2x (see pixel.js) to the screen's detail.
const PIX = { K: P.outline, Y: P.ochre, T: P.tan, n: P.navy, R: P.red, W: P.white, G: P.grey3, O: P.olive, M: P.mist };
export function drawPix(g, rows, x, y, flip = false) {
  rows.forEach((row, r) => [...row].forEach((ch, c) => {
    if (ch === '.') return;
    g.fillStyle = PIX[ch]; g.fillRect(x + (flip ? row.length - 1 - c : c), y + r, 1, 1);
  }));
}
// A fishing boat far off on the horizon, like the print's, three rowers bent over their oars.
const FAR_BOAT = scale2x([
  '.....n...n...n.....',
  'K....n...n...n...K.',
  'KYYYYYYYYYYYYYYYYYK',
  '.KTTTTTTTTTTTTTTTK.',
  '..KKKKKKKKKKKKKKK..',
]);
// Gulls, wings up and wings level.
const GULL = [['M...M', '.M.M.', '..M..'], ['.....', 'MM.MM', '..M..']].map(scale2x);   // (pale, against the dusk)
// The boat bobs at anchor on the horizon (sliding by slowly as the camera moves); gulls wheel across the sky.
export function drawLife(g, camX, t) {
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
  const span = 1600 / PIXEL, horizon = Math.round((391 + TOP) / PIXEL), bw = FAR_BOAT[0].length;
  for (let i = 0; i < 2; i++) {
    const x = Math.round((((i * 900 + 250 - camX * .15) / PIXEL) % span + span) % span) - bw;   // (it stays put out there, bobbing: only the camera moves it)
    drawPix(g, FAR_BOAT, x, horizon - FAR_BOAT.length + 1 + Math.round(Math.sin(t * 1.3 + i * 2) * 1.6), i % 2 === 1);
  }
  for (let i = 0; i < 3; i++) {   // (positions and speeds in game units, from the top of the screen)
    const dir = i % 2 ? -1 : 1, w = LW + 40;
    const x = Math.round(((((i * 314 + 120 - camX * .3 + dir * t * (18 + i * 6)) / PIXEL % w) + w) % w) - 20);
    const y = Math.round((56 + i * 38 + Math.sin(t * .7 + i * 2.1) * 12) / PIXEL);
    drawPix(g, GULL[Math.floor(t * (3 + i * .7) + i) % 2], x, y);
  }
  g.restore();
}

// The sea, in the intro and the level alike, after the game's cover: drawn pixel by pixel,
// pinned to the world, so the cells ride the waves. From the top down:
//   • a crest of pale foam along the surface;
//   • whitewash just under it, in drifting aqua streaks that thin out with depth;
//   • then the water in flat layers, darkening with depth (aqua, ocean blue, indigo, dark teal, night),
//     each edged in a night-blue contour line like the cover's line-art; the layers follow the swell
//     and gently undulate;
//   • thin aqua lines of light drifting through the water, and a few pale bubbles in the deep.
// surf(wx) = the surface's height at world x (game units). Only columns from x0 to x1 (pixels) are drawn.
// The pattern is designed in 4-unit cells: seaCell gets c and d (column, depth) in those, the depth of
// one cell (f), and the cell's own column and row (ci, ri).
export const CELL = 1;   // (pixels per cell: every pixel its own cell, at the screen's full detail; drawChartSea relies on it)
const DEPTH = [P.aqua, P.ocean, P.indigo, P.abyss, P.night];
// above = the layer of the cell above it (it's worked out going down each column, so passed along).
// Only what a cell needs is worked out: the sea is a lot of cells.
function seaCell(c, d, t, i, above, ci, ri) {
  if (d <= 1.4) return hsh(ci * 12.99 + ri * 78.23) < .35 ? P.mist : P.white;               // the crest
  if (d < 6) {
    const lace = hsh(Math.floor(c / 2.5 + t * .9) * 5.1 + Math.floor(d * 1.5) * 9.7);     // whitewash, in streaks drifting along
    if (lace < 1 - d / 6) return d < 3 ? P.mist : P.aqua;
  }
  if (i !== above) return P.night;                                                         // the contour line along a layer's top
  if (i < 3 && hsh(Math.floor(c / 3 + t * (ri % 2 ? .6 : -.5)) * 3.7 + ri * 11.1) < (i < 2 ? .05 : .02)) return i < 1 ? P.white : P.aqua;   // lines of light
  if (i >= 2 && (ci * 7 + ri * 13) % 251 === 0) return P.aqua;                             // bubbles
  return DEPTH[i];
}
// (The sea is written pixel by pixel into a buffer, then drawn in one go: see pixelBuffer.)
const seaBuf = pixelBuffer();
// direct: put the pixels straight onto g (only when nothing on g needs keeping: the level's sea layer,
// freshly cleared).
export function drawChartSea(g, camX, t, surf, x0 = 0, x1 = LW, direct = false) {
  const B = seaBuf.begin(), buf = B.buf;
  const cam = Math.round(camX / PIXEL), rows = Math.ceil(LH / CELL), f = CELL * PIXEL / 4;
  const row = c => Math.round((surf((c + .5) * CELL * PIXEL) / PIXEL + TOP_PX) / CELL);   // the surface's cell row in column c
  const c0 = Math.floor((cam + x0) / CELL), c1 = Math.ceil((cam + x1) / CELL);
  const tops = []; for (let c = c0 - 2; c <= c1 + 2; c++) tops.push(row(c));
  const top = c => tops[c - c0 + 2];
  const NIGHT = pack(P.night), MIST = pack(P.mist);
  for (let c = c0; c < c1; c++) {
    const r0 = top(c), outlineTo = Math.max(r0, top(c - 1) - 1, top(c + 1) - 1), sx = c * CELL - cam;
    if (sx < 0 || sx >= LW) continue;
    let above = -1;
    const wobble = Math.sin(c * f * .07 + t * .4) * 2, ph = c * f * .3 - t * 1.1;   // (the layers' undulation, the part that's the same all down the column)
    for (let r = Math.max(r0, 0); r < rows; r++) {
      const d = (r - r0) * f, i = d < 4 ? 0 : Math.min(DEPTH.length - 1, Math.max(0, Math.floor((d + Math.sin(ph + d * .15) * 1.2 + wobble - 4) / 8)));
      buf[r * LW + sx] = r <= outlineTo ? (r === r0 ? NIGHT : MIST) : pack(seaCell(c * f, d, t, i, above < 0 ? i : above, c, r));
      above = i;
    }
  }
  B.draw(g, direct);
}

// The near sea in the level: the same sea as the intro's (above), on the level's waves.
export function drawSea(g, camX, t) {
  drawChartSea(g, camX, t, wx => seaY(wx, t), 0, LW, true);
}

// Carp streamer (koinobori) = checkpoint. It lifts and flies when reached. (In the cover's aqua and
// ocean blue: red would vanish into the sunset.)
export function drawKoinobori(g, x, y, on, t) {
  g.fillStyle = P.wood; g.fillRect(x - px(2) / 2, y - 72, px(2), 72);   // the pole (pale enough to see against the dusk)
  const wav = Math.sin(t * 6) * 4 * on;
  g.save(); g.translate(x, y - 68); g.rotate((1 - on) * 1.3);
  g.fillStyle = on ? P.aqua : P.grey2;
  g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(-18, -7 + wav, -40, -3 + wav); g.lineTo(-31, 5 + wav); g.lineTo(-40, 12 + wav); g.quadraticCurveTo(-18, 13 + wav, 0, 11); g.closePath(); g.fill();
  g.fillStyle = on ? P.ocean : P.grey3; g.fillRect(-30, 2 + wav, 14, 3); g.fillRect(-22, 6 + wav, 10, 2);   // its scales
  g.fillStyle = P.mist; g.fillRect(-9, 3, 6, 6); g.fillStyle = P.night; g.fillRect(-7, 5, 3, 3);   // its eye
  g.restore();
}
