// ============================================================================
// art.js — the scenery: the dusk sky (after the game's cover), Fuji, the far and near sea of the level,
// the intro's sea (drawn straight in 2×2 cells, like the title card's chart), and the carp streamer.
// Most of it draws in game units; the pixel pipeline turns it into pixel art. Thicknesses are given in
// game units too (and turned into whole pixels with toPx), so the art keeps its proportions on both screens.
// ============================================================================
import { W, H, TOP, TOP_PX, LW, LH, SEA, P, PIXEL, px, onPixel, toPx, RAMP } from './config.js';
import { seaY } from './sea.js';
import { scale2x, pixelBuffer, pack, dither } from './pixel.js';

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
// Besides the dusk there's the night and the dawn (Level 2): each sky's bands, its clouds (their bodies
// and lit undersides, furthest first, and the line along their tops), and the far sea's colours under it.
const SKIES = {
  dusk:  { bands: [[.2, P.night], [.42, P.indigo], [.6, P.plum], [.73, P.violet], [.84, P.mauve], [.93, P.rosewood], [9, P.ember]],
           body: [P.plum, P.violet, P.mauve, P.rosewood], lit: [P.violet, P.mauve, P.rosewood, P.ember], edge: P.night, stars: true, flecks: true,
           glow: P.mauve, caps: [P.rosewood, P.ember, P.aqua] },
  night: { bands: [[.36, P.night], [.62, P.outline], [.82, P.navy], [.94, P.indigo], [9, P.slate]],
           body: [P.outline, P.navy, P.indigo, P.slate], lit: [P.navy, P.indigo, P.slate, P.steel], edge: P.night, stars: true,
           glow: P.slate, caps: [P.slate, P.steel, P.steel] },
  dawn:  { bands: [[.18, P.navy], [.34, P.deep], [.48, P.steel], [.6, P.pale], [.73, P.sky], [.86, P.gold], [9, P.dawn]],
           body: [P.deep, P.steel, P.pale, P.pink], lit: [P.steel, P.pale, P.pink, P.dawn], edge: P.deep,
           glow: P.dawn, caps: [P.pink, P.gold, P.aqua] },
  // (Level 0's day on the beach: the prints' blue-to-paper sky, and a golden afternoon)
  day:   { bands: [[.16, P.navy], [.3, P.deep], [.5, P.steel], [.76, P.pale], [9, P.foam]],
           body: [P.pale, P.foam, P.white, P.foam], lit: [P.steel, P.pale, P.pale, P.sky], edge: P.deep,
           glow: P.pale, caps: [P.steel, P.white, P.aqua] },
  late:  { bands: [[.2, P.deep], [.38, P.steel], [.54, P.pale], [.72, P.sky], [.88, P.tan], [9, P.ochre]],
           body: [P.steel, P.pale, P.sky, P.tan], lit: [P.pale, P.foam, P.foam, P.gold], edge: P.slate,
           glow: P.ochre, caps: [P.tan, P.gold, P.aqua] },
};
// (The sky, Fuji and the far sea are all painted into one buffer of pixels, B, which drawScenery
// then draws in one go.)
// light: the night turning to dawn (0..1): the dawn's bands rise from the horizon, their edge dithered.
const sceneryBuf = pixelBuffer();
function drawSky(B, camX, top, t, name, light) {
  const fill = (x, y, w, h, c) => B.rect(x, y, w, h, c);
  const C = CELL, q = 2 / C, cols = Math.ceil(LW / C), horizon = Math.ceil((390 + top) / PIXEL / C), rows = Math.ceil(LH / C);
  const SK = SKIES[name], risen = 1 - light * 1.15, soft = .1;   // (rows below `risen`, as a share of the sky, are dawn already)
  const at = (sky, f) => sky.bands.find(([end]) => f < end)[1];
  for (let r = 0; r < rows; r++) {   // the bands, a row at a time (cell by cell only where two meet)
    const f = r / horizon, mix = light > 0 ? Math.max(0, Math.min(1, (f - risen) / soft)) : 0;
    const sky = mix >= 1 ? SKIES.dawn : SK, a = at(sky, f - .012), b = at(sky, f + .012);
    if (mix > 0 && mix < 1) { const d = at(SKIES.dawn, f); for (let c = 0; c < cols; c++) fill(c * C, r * C, C, C, dither(c, r) < mix ? d : a); continue; }
    if (a === b) { fill(0, r * C, cols * C, C, a); continue; }
    for (let c = 0; c < cols; c++) fill(c * C, r * C, C, C, (c + r) % 2 ? a : b);
  }
  for (let i = 0; SK.stars && i < 80; i++) {   // stars, in the dark top of the sky
    const x = Math.floor(hsh(i * 3.1) * cols), y = Math.floor(Math.pow(hsh(i * 7.3), 1.6) * horizon * .55), tw = Math.sin(t * (1 + hsh(i) * 2) + i);
    if (tw < -.4 || (light > 0 && y / horizon > risen)) continue;   // (going out as the dawn reaches them)
    const big = hsh(i * 4.4) < .35 ? 2 : 1;   // stars of two sizes
    const sc = hsh(i * 5.5) < .3 ? P.aqua : P.mist; fill(x * C, y * C, C * big, C * big, sc);
    if (hsh(i * 9.1) < .12 && tw > .6) { fill((x - 2) * C, y * C, C * 5, C, sc); fill(x * C, (y - 2) * C, C, C * 5, sc); }   // a bright one, glinting
  }
  for (let k = 0; k < 4; k++) {   // the clouds: long strata, each with a night-blue edge on top and a warm lit underside
    const y0 = Math.round(horizon * (.32 + k * .15)), drift = (camX * (.05 + k * .03) / PIXEL / C + t * (.4 + k * .2) * q) / q;
    const sky = light > 0 && y0 / horizon > risen + soft ? SKIES.dawn : SK, body = sky.body[k], lit = sky.lit[k];
    for (let c = 0; c < cols; c++) {
      const u = c / q + drift, th = Math.round((7 * Math.sin(u * .028 + k * 2.1) + 3 * Math.sin(u * .09 + k) + 1) * q);
      if (th < q) continue;
      const yTop = y0 - Math.round(th * .6 + Math.sin(u * .08 + k) * 1.5 * q);
      fill(c * C, yTop * C, C, C, sky.edge);
      fill(c * C, (yTop + 1) * C, C, Math.max(1, th - 1) * C, body);
      fill(c * C, (yTop + th) * C, C, C, lit);
      if (th > 5 * q && Math.sin(u * .2 + k * 3) > .6) fill(c * C, (yTop + Math.round(th * .5)) * C, C, C, lit);   // a seam of light between the layers
    }
  }
  for (let i = 0; SK.flecks && i < 14; i++) {   // red flecks among the clouds, like the cover's
    const x = Math.round(((hsh(i * 4.7) * cols * 1.4 - camX * .08 / PIXEL / C - t * (1 + hsh(i) * 2) * q) % (cols * 1.4) + cols * 1.4) % (cols * 1.4) - cols * .2);
    const y = Math.round(horizon * (.35 + hsh(i * 8.3) * .5)), n = Math.round((3 + Math.floor(hsh(i * 2.9) * 4)) * q);
    for (let j = 0; j < n; j++) fill((x + j) * C, (y - Math.floor(j / (2 * q))) * C, C, C, P.ember);   // a slanting streak, thicker in the middle
    fill((x + Math.round(n * .3)) * C, (y - Math.floor(n * .3 / (2 * q)) + 1) * C, Math.round(n * .4) * C, C, P.ember);
  }
}

// Mt Fuji, drawn in cells: see fujiCells.
// Each level sees it a different way, after Hokusai's Thirty-six Views of Mount Fuji (levels/*.json,
// "fuji": { "view": ... }):
//   grey  - The Great Wave: grey, a white peak whose snow line is ragged, streaks of snow running down
//   red   - Fine Wind, Clear Morning ("Red Fuji"): rust red, broad and concave, snow only in the
//           gullies at the top, dark forest round its foot
//   dusk  - Level 1 at dusk, after the game's cover: indigo, the snow catching the last light
//   night - Level 2: a dark shape, its snow pale in the moonlight
//   inume - the Inume Pass: brown, flecked with snow (one of several more for the prints, dawn.js)
//   storm - Rainstorm Beneath the Summit: brown, darkening to black below, the snowy peak bright above the storm
export const FUJI_VIEWS = {
  day:   { snow: .34, streak: .66, body: P.deep, fleck: P.navy, curve: 1, grad: P.steel },   // Level 0's day
  dusk:  { snow: .36, streak: .68, body: P.indigo, fleck: P.plum, curve: 1, snowShade: P.pale },   // at dusk, as on the cover: indigo, its snow catching the light
  night: { snow: .34, streak: .62, body: P.outline, fleck: P.navy, curve: 1, snowShade: P.steel },
  grey:  { snow: .5,  streak: .8,  body: P.grey3, fleck: P.grey2, curve: 1, grad: P.grey2 },
  red:   { ink: true, snow: .1, streak: .36, body: P.red,   fleck: P.rust,  curve: 1.5, forest: .8, scatter: true, shade: P.rust, trees: [P.pine, P.leaf], grad: P.fadeRed },
  storm: { ink: true, snow: .16, streak: .3,  body: P.wood,  fleck: P.brown, curve: 1.2, scatter: true, dark: .45, shade: P.brown, grad: P.fadeOchre },
  navy:  { ink: true, snow: .2,  streak: .5,  body: P.navy,  fleck: P.white, curve: 1, scatter: true, grad: P.fadeBlue },   // Tago Bay: deep blue, snow speckling its upper slopes
  ochre: { ink: true, snow: .14, streak: .42, body: P.ochre, fleck: P.tanD,  curve: 1, shade: P.tanD, grad: P.fadeOchre },   // Misaka: ochre in the sun, snow in its gullies
  inume: { ink: true, snow: .26, streak: .42, body: P.mauve, fleck: P.foam, curve: 1.2, scatter: true, grad: P.brown },   // the Inume Pass: brown, dark under its snow
  snowy: { snow: .62, streak: .95, body: P.deep,  fleck: P.steel, curve: 1 },   // Shichirigahama: almost all snow, streaked blue
};
// Calls cell(x, r, colour) for every cell of a Fuji `rows` cells tall and `half` cells wide each side
// at its foot (or [left, right] for a lopsided one); x is measured from the peak, r down from the peak.
// sc: how many cells make one cell of the pattern (the snow streaks, flecks, trees), so it stays bold
// however finely the mountain is drawn.
export function fujiCells(cell, rows, half, view = 'grey', sc = 1) {
  const v = FUJI_VIEWS[view] || FUJI_VIEWS.grey, [hl, hr] = Array.isArray(half) ? half : [half, half];
  // Ridges run down from the peak, fanning out: `across` is how far across the flank a cell is (-1 to 1),
  // so a ridge is the same `across` all the way down. A smooth wobble along it makes the gullies.
  const wob = u => { const i = Math.floor(u), f = u - i, e = f * f * (3 - 2 * f); return hsh(i * 3.71) * (1 - e) + hsh((i + 1) * 3.71) * e; };
  const n = 9 + Math.min(16, (hl + hr) / sc / 14);   // how many ridges (more on a bigger mountain)
  for (let r = 0; r < rows; r++) {
    const k = (r + .5) / rows, flat = v.curve > 1 ? 1.5 + rows * .012 : rows * .01, kk = Math.pow(k, v.curve);   // k: 0 at the peak, 1 at the foot
    const L = Math.max(.6, kk * hl + flat), R_ = Math.max(.6, kk * hr + flat), x0 = Math.floor(-L), x1 = Math.ceil(R_);
    for (let x = x0; x < x1; x++) {
      const across = x < 0 ? x / L : x / R_, X = Math.floor(x / sc), R = Math.floor(r / sc), h = hsh(X * 7.31 + R * 3.17);
      const g = wob(across * n + 40 + Math.sin(k * 9) * .12), fine = wob(across * n * 2.7 + 90), gully = g * .65 + fine * .35;
      const lee = wob((across + .045) * n + 40 + Math.sin(k * 9) * .12) > g;   // which side of its ridge it's on: the side away from the light is darker
      const line = v.snow + (v.streak - v.snow) * Math.max(0, gully * 1.9 - .62) + (wob(across * n * 6 + 7) - .5) * .05;   // the snow reaches furthest down the gullies
      const snow = v.snow > 0 && k < line;
      let c = snow ? P.white : v.scatter && h < .035 ? v.fleck : v.body;
      if (snow && lee && k > v.snow * .35 && dither(x & 255, r) < .5 * Math.min(1, k / line)) c = v.snowShade || P.pale;
      if (!snow && lee && c === v.body && dither(x & 255, r) < .28 + .3 * (1 - k)) c = v.shade || v.fleck;
      if (v.shade && !snow && across < -.4 + (wob(k * 14 + 3) - .5) * .5 && dither(x & 255, r) < .62) c = v.shade;   // the flank in shadow
      if (v.dark && !snow && dither(x & 255, r) < (k - v.dark + (fine - .5) * .1) / .12) c = h < .03 ? P.navy : P.outline;   // the dark lower slopes
      const [dark, light] = v.trees || [P.navy, P.olive];
      if (v.forest && k > v.forest - .2 * gully) {   // the forest: green coming up the gullies, trees standing dark in it
        const up = (k - v.forest + .2 * gully) / (1 - v.forest + .2), tree = hsh(Math.floor(x / 3) * 5.3 + Math.floor(r / 4) * 9.1) < .12 + up * .3;
        if (dither(x & 255, r) < up * 2) c = tree && (r % 4 > 1 || x % 3 === 1) ? dark : up > .25 && dither((x + 1) & 255, r + 1) < up * .5 ? dark : light;
      }
      if (v.grad && c === v.body && dither(x & 255, r) < Math.max(0, (k - .35) / .65) * .8) c = v.grad;   // the flank fading toward its foot (bokashi), in dithered steps
      if (v.ink && (x === x0 || x === x1 - 1 || r === 0)) c = P.outline;
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
  const water = Math.round((380 + TOP) / u) + Math.ceil(6 / u);            // the first row of open water, below the glow on the horizon (see drawFarSea)
  fujiCells((x, r, c) => { if (top + r < water) B.rect((cx + x) * CELL, (top + r) * CELL, CELL, CELL, c); }, f.rows, f.half, f.view, Math.max(1, Math.round(k / 2)));
}

// The distant sea, in the level and the intro, after the river under Mannen Bridge (see dawn.js): water
// in rows of 2×2 cells, the sunset's glow at the horizon, then ocean blue, then dark teal striped with
// ocean blue (the cover's colours). Small waves
// dot it, each an aqua cap (ember in the glow) with a night-blue shadow under it (and, nearer, a raised crest): they drift along, each
// row the opposite way to the one above, and rise and fade away again. Nearer rows have bigger waves
// that move faster, so the water lies flat into the distance; it all slides by at half the camera's speed.
function drawFarSea(B, camX, t, sky) {
  const C = CELL, q = 2 / C, top = Math.round((380 + TOP) / PIXEL / C), rows = Math.ceil(LH / C), cols = Math.ceil(LW / C);   // (q: cells per 2 pixels)
  const base = r => { const d = (r - top) * C * PIXEL; return d < 6 ? sky.glow : d < 20 ? P.ocean : Math.floor((r - top) / q) % 5 ? P.abyss : P.ocean; };   // the glow reflected at the horizon
  for (let r = top; r < rows; r++) B.rect(0, r * C, cols * C, C, base(r));
  for (let r = top; r < rows; r++) {
    const d = (r - top) * C * PIXEL;   // how far below the horizon, in game units
    const len = (3 + d / 6) * q, dir = Math.floor(r / q) % 2 ? 1 : -1, shift = (camX * .5 * (1 + d / 60)) / PIXEL / C + t * (1.5 + d / 14) * q * dir;
    if (r % q) continue;   // (a row of waves every 2 pixels)
    const cap = d < 6 ? (r % 3 ? sky.caps[0] : sky.caps[1]) : sky.caps[2], shade = P.night;
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

// The scenery behind everything, in the level and the intro: the sky (dusk unless told otherwise),
// Fuji, and the far sea. light: how far a night has turned to dawn (0..1).
// behind(B): paints anything that stands in the sky behind Fuji and the sea (the moon, the sun).
export function drawScenery(g, camX, t, fuji, { sky = 'dusk', light = 0, behind = null } = {}) {
  const B = sceneryBuf.begin();
  drawSky(B, camX, TOP, t, sky, light);
  if (behind) behind(B);
  drawFarSea(B, camX, t, light > .2 ? SKIES.dawn : SKIES[sky]);
  drawFuji(B, camX, fuji);   // (over the glow on the horizon, down to the water: the glow is nearly the sky's colour, and Fuji would seem to float on it)
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
// (Level 2's night has its own tones: the same sea with the light gone out of it.)
const SEA_TONES = {
  dusk:  { white: P.white, mist: P.mist, aqua: P.aqua, line: P.night, depth: [P.aqua, P.ocean, P.indigo, P.abyss, P.night] },
  day:   { white: P.white, mist: P.mist, aqua: P.aqua, line: P.navy, depth: [P.aqua, P.sea, P.deep, P.ocean, P.navy] },
  night: { white: P.mist, mist: P.aqua, aqua: P.steel, line: P.night, depth: [P.deep, P.ocean, P.navy, P.abyss, P.night] },
};
// above = the layer of the cell above it (it's worked out going down each column, so passed along).
// Only what a cell needs is worked out: the sea is a lot of cells.
function seaCell(c, d, t, i, above, ci, ri, K) {
  if (d <= 1.4) return hsh(ci * 12.99 + ri * 78.23) < .35 ? K.mist : K.white;               // the crest
  if (d < 6) {
    const lace = hsh(Math.floor(c / 2.5 + t * .9) * 5.1 + Math.floor(d * 1.5) * 9.7);     // whitewash, in streaks drifting along
    if (lace < 1 - d / 6) return d < 3 ? K.mist : K.aqua;
  }
  if (i !== above) return K.line;                                                         // the contour line along a layer's top
  if (i < 3 && hsh(Math.floor(c / 3 + t * (ri % 2 ? .6 : -.5)) * 3.7 + ri * 11.37) < (i < 2 ? .05 : .02)) return i < 1 ? K.white : K.aqua;   // lines of light
  if (i >= 2 && (ci * 7 + ri * 13) % 251 === 0) return K.aqua;                             // bubbles
  return K.depth[i];
}
// The same water running up over the sand (beachart.js), made of the same layers and lines of light:
// gives colour(x, y, q, qUp, qLeft), where q is how far out from the water's edge the pixel is, 0 (a thin film) to
// 1 (where it meets the sea, and matches it); qUp and qLeft, the same for the pixels above and to the left.
export function seaOverSand(t, surf, tone = 'dusk') {
  const K = SEA_TONES[tone], f = PIXEL / 4;
  const layer = (x, y, q) => {
    const d = Math.max(0, y - Math.round(surf((x + .5) * PIXEL) / PIXEL + TOP_PX)) * f, e = d * q;
    return e < 4 ? 0 : Math.min(K.depth.length - 1, Math.max(0, Math.floor((e + Math.sin(x * f * .3 - t * 1.1 + e * .15) * 1.2 + Math.sin(x * f * .07 + t * .4) * 2 - 4) / 8)));
  };
  return (x, y, q, qUp, qLeft) => {
    const i = layer(x, y, q);
    if (i !== layer(x, y - 1, qUp) || i !== layer(x - 1, y, qLeft)) return K.line;
    return seaCell(x * f, 99, t, i, i, x, y, K);
  };
}
// (The sea is written pixel by pixel into a buffer, then drawn in one go: see pixelBuffer.)
const seaBuf = pixelBuffer();
// direct: put the pixels straight onto g (only when nothing on g needs keeping: the level's sea layer,
// freshly cleared). tone: see SEA_TONES.
export function drawChartSea(g, camX, t, surf, x0 = 0, x1 = LW, direct = false, tone = 'dusk') {
  const K = SEA_TONES[tone], B = seaBuf.begin(), buf = B.buf;
  const cam = Math.round(camX / PIXEL), rows = Math.ceil(LH / CELL), f = CELL * PIXEL / 4;
  const row = c => Math.round((surf((c + .5) * CELL * PIXEL) / PIXEL + TOP_PX) / CELL);   // the surface's cell row in column c
  const c0 = Math.floor((cam + x0) / CELL), c1 = Math.ceil((cam + x1) / CELL);
  const tops = []; for (let c = c0 - 2; c <= c1 + 2; c++) tops.push(row(c));
  const top = c => tops[c - c0 + 2];
  const NIGHT = pack(K.line), MIST = pack(K.mist);
  for (let c = c0; c < c1; c++) {
    const r0 = top(c), outlineTo = Math.max(r0, top(c - 1) - 1, top(c + 1) - 1), sx = c * CELL - cam;
    if (sx < 0 || sx >= LW) continue;
    let above = -1;
    const wobble = Math.sin(c * f * .07 + t * .4) * 2, ph = c * f * .3 - t * 1.1;   // (the layers' undulation, the part that's the same all down the column)
    for (let r = Math.max(r0, 0); r < rows; r++) {
      const d = (r - r0) * f, i = d < 4 ? 0 : Math.min(K.depth.length - 1, Math.max(0, Math.floor((d + Math.sin(ph + d * .15) * 1.2 + wobble - 4) / 8)));
      buf[r * LW + sx] = r <= outlineTo ? (r === r0 ? NIGHT : MIST) : pack(seaCell(c * f, d, t, i, above < 0 ? i : above, c, r, K));
      above = i;
    }
  }
  B.draw(g, direct);
}

// The near sea in the level: the same sea as the intro's (above), on the level's waves.
export function drawSea(g, camX, t) {
  drawChartSea(g, camX, t, wx => seaY(wx, t), 0, LW, true);
}

// Needles on a pine, a flat scalloped clump lit from above. (u: the size of a pixel in this space.)
export function drawNeedles(g, cx, cy, rx, ry, seed, u = 1) {
  const at = new Set(), id = (x, y) => (x + 500) * 1000 + y + 500;
  for (let j = 0; j < 7; j++) {
    const px_ = (hsh(seed + j * 1.7) - .5) * rx * 1.4, py = (hsh(seed + j * 3.3) - .5) * ry * .6, pr = rx * (.36 + hsh(seed + j * 5.9) * .2), ph = ry * (.5 + hsh(seed + j * 7.1) * .2);
    for (let y = Math.floor(py - ph); y <= py + ph * .7; y++) for (let x = Math.floor(px_ - pr); x <= px_ + pr; x++) if (((x - px_) / pr) ** 2 + ((y - py) / ph) ** 2 <= 1) at.add(id(x, y));
  }
  for (const v of at) {
    const x = Math.floor(v / 1000) - 500, y = v % 1000 - 500, has = (i, j) => at.has(id(x + i, y + j));
    g.fillStyle = !has(0, -1) || !has(0, 1) || !has(-1, 0) || !has(1, 0) ? P.outline : !has(0, -4) ? P.leaf : P.pine;
    g.fillRect(cx + x * u, cy + y * u, u, u);
  }
}
// A carp streamer: its mouth at x, y, swimming to the right on the wind (or the left: dir -1). body, scale: its colours.
const carpC = document.createElement('canvas');
export function drawCarp(g0, x0, y0, len, tall, body, scale, t, u0 = 1, dir = 1) {
  // (drawn flat first, then put in place whole: on a tilting pole its pixels would come apart)
  const pad = 8, g = carpC.getContext('2d'), u = 1, x = 0, y = tall + pad;
  carpC.width = len; carpC.height = (tall + pad) * 2;
  for (let i = 0; i < len; i++) {
    const q = i / len, mid = Math.round(Math.sin(t * 5 - i * .22) * 3.2 * q), tail = q > .8, half = Math.round(tall / 2 * (tail ? .5 + (q - .8) * 3.4 : 1 - q * .5 - (i < 2 ? .25 : 0)));
    for (let j = -half; j <= half; j++) {
      if (tail && Math.abs(j) < (q - .8) * 14 - .6) continue;   // (the fork in its tail)
      g.fillStyle = Math.abs(j) === half || i === 0 || i === len - 1 ? P.outline : i < 3 ? P.mist : i < 10 ? (Math.abs(i - 6) < 2 && j === -1 ? P.outline : Math.abs(i - 6) < 3 && Math.abs(j + 1) < 2 ? P.white : body) : j > half * .45 ? P.mist : (i + (Math.abs(j) % 4 < 2 ? 0 : 3)) % 6 < 2 ? scale : body;
      g.fillRect(x + i * u, y + (mid + j) * u, u, u);
    }
  }
  g0.save(); g0.imageSmoothingEnabled = false; g0.translate(x0, y0); g0.scale(dir * u0, u0); g0.drawImage(carpC, 0, -y); g0.restore();
}

// Carp streamer (koinobori) = checkpoint. It lifts and flies when reached.
export function drawKoinobori(g, x, y, on, t) {
  const u = px(1);
  g.fillStyle = P.outline; g.fillRect(x - u * 2, y - 74, u * 4, 74); g.fillStyle = P.wood; g.fillRect(x - u, y - 73, u * 2, 73);
  g.fillStyle = P.ochre; g.fillRect(x - u, y - 73, u, 73);
  g.fillStyle = P.outline; g.fillRect(x - u * 3, y - 78, u * 6, u * 5); g.fillStyle = P.gold; g.fillRect(x - u * 2, y - 78 + u, u * 4, u * 3);
  g.save(); g.translate(x, y - 62); g.rotate(-(1 - on) * 1.3);   // (hanging down until it's reached)
  drawCarp(g, 0, 0, 32, 11, on > .05 ? P.aqua : P.grey2, on > .05 ? P.ocean : P.grey3, t * (.3 + on * .7), u, -1);
  g.restore();
}

// A carp streamer torn loose from the village, floating on the sea (Level 1's opening), head first as it
// drifts left, rocking a little. Scenery only. (x, y: its head, on the surface.)
export function drawFloatingKoinobori(g, x, y, t) {
  g.save(); g.translate(x, y - 5); g.rotate(Math.sin(t * 1.3) * .08);
  g.fillStyle = P.wood; g.fillRect(-8, 1, 12, px(2));   // a stub of its broken pole
  drawCarp(g, 0, 2, 32, 10, P.aqua, P.ocean, t, px(1));
  g.restore();
}

// The stone lantern on the island at the end of Level 1 (and all through Level 2). lx: its middle, y:
// the ground it stands on (game units). lit: whether its light is burning.
export function drawLantern(g, lx, y, t, lit = true) {
  const R = (x, yy, w, h, c) => { g.fillStyle = c; g.fillRect(lx + x * px(1), y + yy * px(1), w * px(1), h * px(1)); };   // (in pixels, from the middle of its foot)
  const [c0, c1, c2, c3] = RAMP.stone;
  const block = (x, yy, w, h) => {   // a block of stone, lit on the left, speckled, inked
    R(x - 1, yy - 1, w + 2, h + 2, P.outline);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const q = i / w, n = hsh(i * 3.1 + j * 7.7 + x); R(x + i, yy + j, 1, 1, j === 0 ? c0 : n < .07 ? c3 : i < 2 ? c0 : q > .72 ? (i === w - 1 ? c3 : c2) : dither(i, j) < (q - .4) * 1.6 ? c2 : c1); }
  };
  block(-9, -4, 18, 4); block(-5, -29, 10, 24);                     // the foot, and the post
  block(-9, -32, 18, 3); block(-11, -47, 22, 14);                   // the shelf, and the box the light's in
  R(-7, -44, 14, 10, P.outline);
  R(-6, -43, 12, 8, !lit ? P.night : Math.sin(t * 4) > 0 ? P.ochre : P.gold);
  if (lit) { R(-3, -41, 6, 6, P.foam); R(-1, -42 - (Math.sin(t * 9) > 0 ? 1 : 0), 2, 4, P.white); }
  for (let j = 0; j < 12; j++) {                                    // the roof, its eaves turned up
    const w = Math.round(2 + j * 1.25 + (j > 8 ? (j - 8) * 1.2 : 0));
    R(-w - 1, -60 + j, w * 2 + 2, 1, P.outline);
    for (let i = -w; i < w; i++) R(i, -60 + j, 1, 1, j > 10 ? c3 : i < -w * .2 ? (i === -w ? c0 : c1) : i > w * .45 ? c3 : c2);
  }
  R(-3, -65, 6, 6, P.outline); R(-2, -64, 4, 5, c1); R(0, -64, 2, 5, c2); R(-1, -66, 2, 2, P.outline);   // the ball on top
  for (const [x, yy] of [[-9, -5], [-8, -5], [-3, -30], [4, -33], [5, -33], [-10, -48], [-9, -48]]) R(x, yy, 1, 2, P.leaf);   // a little moss
}
