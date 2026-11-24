// ============================================================================
// dawn.js — after a fall, a new tomorrow dawns as one of Hokusai's Thirty-six Views of Mount Fuji,
// a different print each fall (in turn), recreated cell by cell with the game's own palette:
//   Fine Wind, Clear Morning ("Red Fuji") · Kajikazawa in Kai Province · Goten-yama Hill, Shinagawa on
//   the Tōkaidō · At Sea off Kazusa · Rainstorm Beneath the Summit · Ejiri in Suruga Province · Tago Bay
//   near Ejiri · Under Mannen Bridge at Fukagawa · Reflection in Lake at Misaka
// (All recreated by hand, in code, from the prints: no images.) They share one palette and one look:
// a thin night-blue band at the top of every sky (Hokusai's shading), flat shapes edged in a darker
// colour, tiny people. Each has a small animation of its own (live).
// Each comes in from the top like a print being laid down, and lifts off the same way. A small
// title label sits in the corner, as on the prints. (The two great close-ups of the mountain, Red Fuji
// and the Rainstorm, are kept apart in the order.)
//
// The prints are laid out on a grid 120 "design cells" tall (213 wide; 160 on the old
// 4:3 screen), and drawn in finer cells, one pixel each: s of them to a design cell (3 on the 640×360
// screen, 4 on the old 640×480). Measurements are written in design cells and scaled with S(n);
// cw and ch are the real (fine) grid's size.
// ============================================================================
import { LW, LH, P } from './config.js';
import { hsh, fujiCells } from './art.js';
import { pixelText, LETTER } from './text.js';
import { scale2x, pack, dither } from './pixel.js';   // (pack: a colour as a 32-bit pixel, for painting into ImageData)

const C = 1;   // pixels per cell

// Age: the prints as they are now, not as they left the printer. Each pigment has faded toward its aged
// colour (config.js), some more than others: [aged colour, how much]. Pure white was never printed at
// all: it's the paper, yellowed. The fading is uneven, in soft patches, as ink sank into the paper
// differently; the paper is toned darker toward its edges; and there are fibres and specks in it.
// Mixed in with ordered dithering, so the colours stay the palette's.
const AGE = new Map([
  [P.white, [P.paper, 1]], [P.foam, [P.paper, .5]], [P.sky, [P.paper, .3]], [P.tan, [P.paper, .2]],
  [P.navy, [P.fadeNavy, .5]], [P.deep, [P.fadeBlue, .45]], [P.steel, [P.fadeSky, .35]], [P.pale, [P.fadeSky, .3]],
  [P.teal, [P.fadeSky, .3]], [P.sea, [P.fadeBlue, .35]], [P.red, [P.fadeRed, .5]], [P.rust, [P.fadeRed, .2]],
  [P.grass, [P.fadeGreen, .45]], [P.leaf, [P.fadeGreen, .25]], [P.gold, [P.fadeOchre, .5]], [P.ochre, [P.fadeOchre, .35]],
  [P.outline, [P.fadeInk, .45]], [P.pink, [P.paper, .35]],
]);
// Smooth noise, 0..1: random values on a grid, blended smoothly between (so fading comes in soft patches).
function soft(x, y, seed) {
  const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const h = (i, j) => hsh((x0 + i) * 7.13 + (y0 + j) * 31.7 + seed);
  return (h(0, 0) * (1 - u) + h(1, 0) * u) * (1 - v) + (h(0, 1) * (1 - u) + h(1, 1) * u) * v;
}
const PAPERY = new Set([P.paper, P.foam, P.sky, P.tan, P.white]);
function aged(c, x, y, cw, ch) {
  const fibre = hsh(x * 12.9898 + y * 78.233);
  if (fibre < .006 && PAPERY.has(c)) return fibre < .002 ? P.tanD : P.grey0;   // a fibre or speck in the paper
  if (fibre < .003 && (c === P.navy || c === P.deep)) return P.fadeSky;     // a worn spot in the ink
  const a = AGE.get(c);
  if (!a) return c;
  const patch = soft(x / 28, y / 22, 3.7) * .5 + soft(x / 70, y / 55, 1.3) * .5;   // (soft, cloud-like patches)
  const edge = Math.max(0, 1 - Math.min(x, y, cw - 1 - x, ch - 1 - y) / (cw * .05));
  const f = Math.min(1, a[1] * (.5 + patch) + edge * .45);
  return dither(x, y) < f ? a[0] : c;
}

// The canvas for one print: cell(x, y, colour) paints a cell, if the dawn has reached it yet (or
// always, with all: for painting the still part of a print once into its cache).
let figureScale = 2;   // (the little figures are drawn larger on finer grids: see drawFigure)
function canvas(g, t, a, all = false) {
  const cw = Math.ceil(LW / C), ch = Math.ceil(LH / C), s = ch / 120, S = n => Math.round(n * s);
  figureScale = s > 2.5 ? 4 : 2;
  // painting everything (for a print's cache) goes into a buffer of pixels, put on the canvas at the end (flush): far faster than a rectangle per cell
  const img = all ? g.createImageData(cw, ch) : null, buf = img && new Uint32Array(img.data.buffer);
  const ragged = x => hsh(Math.floor(x / s / 3) * 1.73) * .06 + (Math.sin(x / s * .21) + 1) * .02;
  const show = (x, y) => all || (t < .5 ? y / ch < a * 1.15 - ragged(x) : y / ch > (1 - a) * 1.15 - ragged(x));
  const span = x => {   // the rows of column x the dawn has reached: [from, to)
    const clamp = v => Math.max(0, Math.min(ch, v));
    return t < .5 ? [0, clamp(Math.ceil(ch * (a * 1.15 - ragged(x))))] : [clamp(Math.floor(ch * ((1 - a) * 1.15 - ragged(x))) + 1), ch];
  };
  const cell = (x, y, c) => {
    x = Math.round(x); y = Math.round(y);
    if (x >= 0 && x < cw && y >= 0 && y < ch && show(x, y)) { c = aged(c, x, y, cw, ch); if (buf) buf[y * cw + x] = pack(c); else { g.fillStyle = c; g.fillRect(x * C, y * C, C, C); } }
  };
  const blot = (x, y, c) => {   // a fleck the size of a design cell
    for (let dy = 0; dy < S(1); dy++) for (let dx = 0; dx < S(1); dx++) cell(Math.round(x) + dx, Math.round(y) + dy, c);
  };
  const line = (x0, y0, x1, y1, c) => {   // a line of cells
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let i = 0; i <= n; i++) cell(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, c);
  };
  const disc = (cx, cy, r, c) => {
    for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++)
      if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) cell(x, y, c);
  };
  // bands of colour from the top, each a list of [down to design row, colour], blended into each
  // other in soft dithered gradients, like the wiped bokashi shading of the prints' skies and water
  const bands = (list, from = 0, to = ch) => {
    const Z = 3.5 * s;   // (half the height of each blend)
    for (let y = from; y < to; y++) {
      let i = list.findIndex(([end]) => y < end * s); if (i < 0) i = list.length - 1;
      const end = list[i][0] * s, start = i ? list[i - 1][0] * s : -1e9;
      for (let x = 0; x < cw; x++) {
        let c = list[i][1];
        if (i < list.length - 1 && y > end - Z) { if (dither(x, y) < (y - (end - Z)) / (2 * Z)) c = list[i + 1][1]; }
        else if (i > 0 && y < start + Z) { if (dither(x, y) < (start + Z - y) / (2 * Z)) c = list[i - 1][1]; }
        cell(x, y, c);
      }
    }
  };
  const fuji = (px, top, rows, half, view) => fujiCells((x, r, c) => cell(px + x, top + r, c), rows, half, view, Math.max(1, Math.round(s / 2)));
  return { cw, ch, s, S, cell, blot, line, disc, bands, fuji, span, flush: () => img && g.putImageData(img, 0, 0) };
}

// --- the prints ---
// draw(k) paints the still picture (once, into a cache); live(k, t), if there is one, paints what
// moves, every frame, over it.
const PRINTS = [
  { title: 'FINE WIND, CLEAR MORNING', draw: (k, t) => {
    // Red Fuji: the mountain rust red in the first light, under a deep blue sky full of little clouds
    const { cw, ch, s, S, cell, bands, fuji } = k;
    bands([[26, P.navy], [52, P.deep], [76, P.steel], [88, P.pale], [96, P.pink], [999, P.dawn]]);
    const drift = Math.floor(t * 4 * s);
    for (let i = 0; i < 70; i++) {
      const y0 = S(16 + Math.pow(hsh(i * 2.9), .8) * 52), x0 = Math.floor(hsh(i * 7.3) * (cw + S(20))) - S(10) + drift - Math.floor(y0 / 6);
      const n = S(2 + Math.floor(hsh(i * 3.1) * 4)), thick = S(1);
      for (let j = 0; j < n; j++) {   // a little cloud: a streak, with a cap on the longer ones
        for (let d = 0; d < thick; d++) cell(x0 + j, y0 + d, d === thick - 1 && thick > 1 ? P.pale : P.white);
        if (n > S(3) && j >= thick && j < n - thick) for (let d = 1; d <= thick; d++) cell(x0 + j, y0 - d, P.white);
      }
    }
    fuji(Math.round(cw * .6), ch - S(74), S(74), [Math.round(cw * .75), Math.round(cw * .5)], 'red');
  }, live: (k, t) => {
    const { cw, s, S, cell } = k;
    for (let i = 0; i < 5; i++) {   // a few more little clouds drifting slowly across the morning sky: paper streaks, pale beneath
      const n = S(4 + i % 3), x0 = Math.round(((hsh(i * 4.3) * cw + t * (3 + i % 3) * s) % (cw + S(20))) - S(10)), y0 = S(18 + hsh(i * 6.1) * 40);
      for (let j = 0; j < n; j++) {
        cell(x0 + j, y0, P.white); if (j >= S(1) && j < n - S(1)) cell(x0 + j, y0 - S(1), P.white);
        cell(x0 + j, y0 + S(1), P.pale);
      }
    }
  } },
  { title: 'GOTEN-YAMA HILL, SHINAGAWA ON THE TOKAIDO', draw: (k) => {
    // Cherry-blossom time on Goten-yama: tall thin cherry trees, their blossom in flat scalloped pink
    // clusters, rise from rolling yellow and green mounds. People picnic on a red mat above the
    // blue-grey roofs of Shinagawa (bottom left) and gather by the tea houses (right); a pine stands
    // at the right edge. Beyond, the bay, and Fuji small and blue on the far shore.
    // (Positions: x as a fraction of the width, y in design rows, after the print.)
    const { cw, ch, s, S, cell, line, disc, bands, fuji } = k;
    const X = f => Math.round(cw * f);
    const oval = (cx, cy, rx, ry, col) => {   // col(x, y) → colour, or a colour
      for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++)
        if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) cell(x, y, typeof col === 'function' ? col(x, y) : col);
    };
    // the sky: night-blue at the top, through teal, to a pale cream haze at the horizon
    bands([[4, P.navy], [10, P.deep], [22, P.teal], [36, P.pale], [999, P.foam]], 0, S(56));
    for (const [f0, f1, y] of [[0, .3, 44], [0, .4, 48], [0, .22, 52]])   // long streaks of cloud, low on the left
      for (let x = X(f0); x < X(f1); x++) for (let d = 0; d < S(1.5); d++) cell(x, S(y) + d, P.white);
    for (let y = S(56); y < ch; y++) for (let x = 0; x < cw; x++)   // the bay
      cell(x, y, y < S(58) ? P.pale : y < S(66) ? P.teal : P.sea);
    for (let x = X(.12); x < X(.24); x++) cell(x, S(56), P.tan);   // a sandy spit, far off
    fuji(X(.45), S(43), S(10), S(12), 'blue');
    const shore = x => S(55) - Math.round(Math.max(0, Math.sin((x / cw - .3) * 5)) * 2 * s);   // the far shore, dark green
    for (let x = X(.3); x < cw; x++) for (let y = shore(x); y < S(58); y++) cell(x, y, y === shore(x) ? P.leaf : P.pine);
    for (let x = X(.76); x < cw; x++) {   // trees along the top of the hill on the right
      const top = S(46) + Math.round((Math.sin(x / s * .35) + 1) * 1.5 * s);
      for (let y = top; y < S(60); y++) cell(x, y, y - top < S(1) ? P.leaf : P.pine);
    }
    const ground = x => S(62) + Math.round((1 - x / cw) * 40 * s);   // sunlit yellow ground, falling toward the bay
    for (let x = X(.3); x < cw; x++) for (let y = ground(x); y < ch; y++) cell(x, y, P.gold);
    const mound = (fx, top, fr, ry, base, edge) => {   // a rounded mound, its edge drawn in
      const rx = cw * fr, cy = S(top) + ry * s;
      oval(X(fx), cy, rx, ry * s, (x, y) => ((x - X(fx)) / rx) ** 2 + ((y - cy) / (ry * s)) ** 2 > .88 ? edge : base);
    };
    mound(.56, 64, .12, 22, P.grass, P.leaf);
    mound(.47, 70, .1, 20, P.grass, P.leaf);
    mound(.55, 80, .13, 26, P.gold, P.ochre);
    mound(.62, 92, .14, 24, P.gold, P.ochre);
    mound(.3, 104, .2, 22, P.gold, P.ochre);
    for (const [fx, y, r] of [[.39, 68, 6], [.6, 62, 6], [.36, 92, 5], [.08, 104, 6], [.55, 118, 6], [.8, 74, 5]])   // dark bushes
      for (let j = 0; j < 3; j++) disc(X(fx) + (j - 1) * r * .8 * s, S(y) - (j % 2) * r * .4 * s, r * .6 * s, P.pine);
    for (const [f0, f1, y] of [[0, .14, 96], [.1, .3, 100], [0, .2, 105], [.14, .3, 110]])   // the roofs of Shinagawa: blue-grey tiles, pale ridges
      for (let r = 0; r < S(5); r++) for (let x = X(f0) + r; x < X(f1) + r; x++) cell(x, S(y) + r, r < S(1) ? P.foam : x % S(2) ? P.slate : P.navy);
    for (let r = 0; r < S(5); r++) for (let x = X(.16) - r; x < X(.33) - r; x++) cell(x, S(110) + r, P.red);   // the picnic: a red mat
    drawFigure(cell, X(.19), S(110), 'sitBlue'); drawFigure(cell, X(.25), S(111), 'sitGreen');
    for (const [f0, f1, y] of [[.66, .8, 80], [.84, 1, 84]]) {   // the tea houses: grey awnings on posts
      for (let r = 0; r < S(3); r++) for (let x = X(f0) - r; x < X(f1) + r; x++) cell(x, S(y) + r, r === 0 ? P.grey1 : P.grey2);
      for (let x = X(f0); x < X(f1); x += S(8)) for (let y2 = S(y) + S(3); y2 < S(y) + S(12); y2++) cell(x, y2, P.brown);
    }
    // the cherry trees: thin grey trunks and dark twigs, under flat clusters of pink blossom, their
    // scalloped edges drawn in a deeper pink and a scatter of single white flowers across them
    const trunk = (f0, y0, f1, y1, w) => { for (let o = 0; o < w; o++) line(X(f0) + o, S(y0), X(f1) + o, S(y1), o === w - 1 ? P.brown : P.bark); };
    const blossom = (fx, y, r) => {
      const cx = X(fx), cy = S(y), R = r * s, seed = fx * 13 + y, at = new Set(), cells = [];
      for (const da of [-.7, 0, .6]) line(cx, cy + R * .9, cx + Math.sin(da) * R * .7, cy + R * .9 - Math.cos(da) * R * .9, P.brown);   // twigs, up into it
      for (let j = 0; j < 8; j++) {   // a cluster of puffs
        const a = j * .785 + hsh(seed + j * 1.9) * .6, d = j % 2 ? .55 : .35 + hsh(seed + j * 3.3) * .2;
        const px = cx + Math.cos(a) * d * R, py = cy + Math.sin(a) * d * R * .6, pr = R * (.42 + hsh(seed + j * 5.1) * .18);
        for (let y2 = Math.floor(py - pr * .75); y2 <= py + pr * .75; y2++) for (let x2 = Math.floor(px - pr); x2 <= px + pr; x2++)
          if (((x2 - px) / pr) ** 2 + ((y2 - py) / (pr * .75)) ** 2 <= 1 && !at.has(x2 + ',' + y2)) { at.add(x2 + ',' + y2); cells.push([x2, y2]); }
      }
      for (const [x2, y2] of cells) {
        const edge = !at.has(x2 + 1 + ',' + y2) || !at.has(x2 - 1 + ',' + y2) || !at.has(x2 + ',' + (y2 + 1)) || !at.has(x2 + ',' + (y2 - 1));
        const h = hsh(x2 * 1.71 + y2 * 3.13);
        cell(x2, y2, edge ? P.rose : h < .07 ? P.white : h > .96 ? P.rose : P.pink);   // single flowers, scattered
      }
    };
    const TREES = [   // [trunks: from x, y, to x, y, thickness in design cells], [blossom: x, y, radius]...
      [[.41, 103, .33, 36, 1.5], [.4, 100, .2, 76, 1]], [[.35, 30, 11], [.27, 42, 8], [.31, 60, 8], [.2, 74, 8], [.34, 82, 7]],
      [[.56, 84, .48, 18, 1.5], [.58, 82, .56, 36, 1]], [[.48, 15, 11], [.55, 33, 9]],
      [[.6, 82, .62, 14, 1.5]], [[.64, 12, 11], [.72, 27, 9]],
      [[.69, 78, .68, 46, 1]], [[.69, 46, 8], [.76, 58, 8]],
    ];
    for (let i = 0; i < TREES.length; i += 2) for (const [a, b, c, d, w] of TREES[i]) trunk(a, b, c, d, Math.max(1, S(w)));
    for (let i = 1; i < TREES.length; i += 2) for (const [fx, y, r] of TREES[i]) blossom(fx, y, r);
    for (const [fx, kind, y] of [[.5, 'standBlue', 110], [.58, 'standGreen', 106], [.64, 'standNavy', 104], [.71, 'standBlue', 102], [.77, 'standGreen', 98], [.86, 'standNavy', 92]])
      drawFigure(cell, X(fx), S(y), kind);   // people out under the blossom
    for (let o = 0; o < S(2); o++) line(X(.93) + o, ch, X(.96) + o, S(64), o ? P.wood : P.brown);   // a pine at the right edge
    for (const [dx, y] of [[-.05, 66], [.05, 74], [-.04, 84]]) oval(X(.96 + dx), S(y), 7 * s, 2.6 * s, (x, y2) => y2 < S(y) - s ? P.leaf : P.pine);
  }, live: (k, t) => {
    const { cw, ch, s, blot } = k;
    for (let i = 0; i < 16; i++) {   // petals drifting down and away on the breeze
      const p = (t * .25 + i / 16) % 1, x = cw * (.2 + hsh(i * 2.3) * .6 + p * .3) + Math.sin(p * 8 + i) * 3 * s, y = ch * (.1 + hsh(i * 4.1) * .3 + p * .5);
      blot(x, y, i % 3 ? P.pink : P.white);
    }
  } },
  { title: 'RAINSTORM BENEATH THE SUMMIT', draw: (k, t) => {
    // the snowy summit in clear sky above a bank of cloud; below, the dark slopes and a red lightning bolt
    const { cw, ch, s, S, line, disc, bands, fuji } = k;
    bands([[10, P.navy], [24, P.deep], [44, P.steel], [999, P.pale]]);
    const drift = Math.sin(t * .8) * 1.5 * s;
    for (let i = 0; i < 9; i++) {   // the bank of cumulus, top left
      const cx = cw * (.06 + i * .055) + drift, cy = (40 - Math.sin(i * 1.3) * 6 - (i > 3 && i < 7 ? 5 : 0)) * s, r = (6 + hsh(i * 4.7) * 6) * s;
      disc(cx, cy + S(2), r, P.grey0); disc(cx, cy, r, P.white);
    }
    fuji(Math.round(cw * .62), S(12), ch, [Math.round(cw * .85), Math.round(cw * .55)], 'storm');
  }, live: (k, t) => {
    const { cw, ch, s, S, line } = k;
    if (Math.sin(t * 9) > -.2 || Math.sin(t * 3.7) > .5) {   // lightning, flickering
      let x = cw * .8, y = ch * .55;   // zigzagging down and across the dark slope
      for (let i = 0; i < 8; i++) {
        const nx = x - (i % 2 ? 1 : 6) * s, ny = y + (i % 2 ? 4 : 2) * s;
        for (let o = 0; o < S(1); o++) line(x + o, y, nx + o, ny, o ? P.red : P.dawn);
        x = nx; y = ny;
      }
    }
  } },
  { title: 'EJIRI IN SURUGA PROVINCE', draw: (k) => {
    // a gust on the marsh road: travellers bent into the wind on the dike, a clump of thin trees bowed
    // over, a hat and papers whirled away; Fuji a bare white outline far off, a village on the horizon
    const { cw, ch, s, S, cell, line, bands } = k;
    bands([[3, P.navy], [7, P.deep], [12, P.steel], [20, P.pale], [999, P.sky]]);
    const ground = x => S(72) + Math.round(Math.sin(x / s * .03) * 3 * s + x * .04);
    const fx = Math.round(cw * .24), rows = S(26), half = S(34), fTop = ground(fx) - rows + 1;   // Fuji, just an outline, standing on the marsh
    for (let r = 0; r < rows; r++) {
      const hw = Math.max(1, Math.round((r + 1) / rows * half)), prev = Math.max(1, Math.round(r / rows * half));
      for (let x = -hw; x <= hw; x++) cell(fx + x, fTop + r, Math.abs(x) >= Math.min(hw, prev + 1) - (r === 0 ? S(9) : 0) ? P.outline : P.white);
    }
    for (let x = -half; x <= half; x++) for (let y = fTop + rows; y < ground(fx + x); y++) cell(fx + x, y, Math.abs(x) === half ? P.outline : P.white);   // down to the ground where it dips
    for (let x = Math.round(cw * .42); x < cw; x++) {   // a village and its trees, low on the horizon
      const h = hsh(Math.floor(x / S(5)) * 2.1), top = ground(x) - S(1 + h * 3);
      for (let y = top; y < ground(x); y++) cell(x, y, h < .35 ? (y === top ? P.grey3 : P.grey2) : (y - top) % S(2) ? P.olive : P.leaf);
    }
    const road = x => ch - S(10) - (x - cw * .2) * .3;   // the road along the dike, winding up across the marsh
    for (let x = 0; x < cw; x++) for (let y = ground(x); y < ch; y++) {
      const d = y - road(x), h = hsh(x * 3.7 + y * 11.3), depth = (y - ground(x)) / s;
      const channel = Math.abs(Math.sin(x / s * .05 + y / s * .9)) < .05 && depth > 6 && d < -S(5);   // water lying in the marsh
      cell(x, y, y === ground(x) ? P.outline : Math.abs(d) < S(3) ? (Math.abs(d) >= S(3) - 1 ? P.tanD : h < .04 ? P.tanD : P.tan)
        : channel ? P.pale : h < .03 ? P.pine : h < .12 ? P.leaf : depth < 4 ? P.olive : depth < 10 && h < .5 ? P.olive : P.grass);
    }
    for (let i = 0; i < 46 * s; i++) {   // reeds, bent by the wind, thicker near the road
      const x = Math.floor(hsh(i * 3.7) * cw), y = ground(x) + Math.floor(hsh(i * 5.3) * (ch - ground(x)));
      if (Math.abs(y - road(x)) < S(4)) continue;
      line(x, y, x + S(1.5 + hsh(i * 2) * 1.5), y - S(2 + hsh(i) * 3), hsh(i * 9) < .5 ? P.outline : P.pine);
    }
    for (const [f, top, bend, w] of [[.82, 16, 14, 1], [.88, 26, 11, 1], [.76, 30, 9, .7]]) {   // the trees, bowed by the wind
      const tx = Math.round(cw * f), base = ground(tx), T = S(top);
      for (let y = T; y < base + 1; y++) {
        const k2 = (base - y) / (base - T), x = tx - Math.round(k2 * k2 * S(bend));
        cell(x - 1, y, P.outline); for (let o = 0; o < Math.max(1, S(w)); o++) cell(x + o, y, o ? P.brown : P.wood); cell(x + Math.max(1, S(w)), y, P.outline);
      }
      for (let i = 0; i < 9; i++) {   // leaves streaming off the crown, downwind, in small ragged clumps
        const lx = tx - S(bend) - S(i * 2.2) + S(hsh(f * 5 + i) * 2), ly = T + S(i * .9 + (hsh(f * 3 + i) - .5) * 4), rx = (2.4 - i * .15) * s, ry = 1.2 * s;
        for (let y = Math.floor(-ry); y <= ry; y++) for (let x = Math.floor(-rx); x <= rx; x++)
          if ((x / rx) ** 2 + (y / ry) ** 2 <= 1) cell(lx + x, ly + y, y >= ry - 1 ? P.pine : hsh(f * 9 + i * 7.1 + x * 1.3 + y * 5.7) < .3 ? P.leaf : P.olive);
      }
    }
    for (let i = 0; i < 4; i++) { const x = Math.round(cw * (.36 + i * .09)); drawFigure(cell, x, Math.round(road(x)) + 1, 'walker'); }   // travellers on the road
  }, live: (k, t) => {
    const { cw, ch, s, S, blot, disc } = k;
    for (let i = 0; i < 20; i++) {   // papers whirled up out of a traveller's packet, away over the marsh
      const p = (t * .22 + i / 20) % 1, x = cw * (.62 - p * .55) + Math.sin(p * 9 + i) * 4 * s, y = ch * (.78 - p * .7) + Math.cos(p * 7 + i * 2) * 3 * s;
      const flip = (i + Math.floor(t * 6)) % 2;
      blot(x, y, P.white); blot(x + (flip ? S(1) : 0), y + (flip ? 0 : S(1)), P.white);
    }
    const hx = cw * (.55 - t * .05), hy = ch * .5 - Math.sin(t * 3) * 3 * s;   // a straw hat, tumbling away
    disc(hx, hy, 2.4 * s, P.ochre); disc(hx, hy - s * .6, 1.1 * s, P.tanD);
  } },
  { title: 'UNDER MANNEN BRIDGE AT FUKAGAWA', draw: (k, t) => {
    // the great arch of the bridge over the river, boats beneath it, Fuji small in the distance
    const { cw, ch, s, S, cell, bands, fuji } = k;
    bands([[3, P.navy], [8, P.deep], [22, P.steel], [999, P.pale]], 0, S(70));
    fuji(Math.round(cw * .5), S(52), S(18), S(16), 'grey');
    for (let x = 0; x < cw; x++) {   // the far bank
      for (let y = S(69); y < S(70); y++) cell(x, y, P.grey3);
      if (hsh(Math.floor(x / s) * 1.9) < .3) for (let y = S(68); y < S(69); y++) cell(x, y, P.grey3);
    }
    for (let y = S(70); y < ch; y++) for (let x = 0; x < cw; x++)   // the river, ripples drifting along
      cell(x, y, hsh(Math.floor((x / s + t * 3 * (y % 2 ? 1 : -1)) / 4) * 3.3 + y * 7.1) < .2 ? P.pale : y < S(80) ? P.steel : y % S(5) ? P.deep : P.steel);
    const cx = cw / 2, deck = x => S(22) + ((x - cx) / (cw * .62)) ** 2 * 60 * s;   // the arch, broad and low
    for (let x = 0; x < cw; x++) {
      const d = Math.round(deck(x));
      cell(x, d, P.outline);                                                     // the handrail
      if (x % S(4) === 0) for (let y = d + 1; y < d + S(2); y++) cell(x, y, P.outline);   // its posts
      cell(x, d + S(2), P.outline);                                              // the deck's side
      for (let y = d + S(2) + 1; y < d + S(7); y++) cell(x, y, y >= d + S(4) && y < d + S(5) ? P.ochre : y >= d + S(6) ? P.brown : P.wood);
      cell(x, d + S(7), P.outline);
      if (Math.abs(x - cx) > cw * .34 && x % S(6) < S(1)) for (let y = d + S(8); y < ch; y++) cell(x, y, x % S(6) === 0 ? P.outline : P.wood);   // piles, down into the water
    }
  }, live: (k, t) => {
    const { cw, s, S, cell } = k;
    for (let i = 0; i < 2; i++) {   // boats under the bridge
      const bx = Math.round(((cw * (.3 + i * .35) + t * (2 + i) * s) % (cw + S(30))) - S(15));
      boat(cell, bx, S(84 + i * 14), i % 2 === 1, S);
    }
    const cx = cw / 2, deck = x => S(22) + ((x - cx) / (cw * .62)) ** 2 * 60 * s;
    for (let i = 0; i < 4; i++) {   // people crossing
      const px = Math.round(((cw * (.15 + i * .22) + t * (i % 2 ? 2 : -2) * s) % cw + cw) % cw);
      const d = Math.round(deck(px));
      for (let x = px; x < px + S(1); x++) {
        for (let y = d - S(2); y < d; y++) cell(x, y, P.navy);
        for (let y = d - S(3); y < d - S(2); y++) cell(x, y, i % 2 ? P.ochre : P.outline);
      }
    }
  } },
  { title: 'KAJIKAZAWA IN KAI PROVINCE', draw: (k) => {
    // A fisherman on the tip of a rock leans out over the rapids, his lines fanned down into the
    // water; a boy crouches behind him. The rock, Prussian blue, climbs from the lower left; below,
    // the river churns white. Long lines of current cross the misty water, and Fuji rises pale out of
    // the mist, only its top in blue. A thin band of peach cloud on the horizon.
    const { cw, ch, s, S, cell, line, bands, fuji } = k;
    const X = f => Math.round(cw * f);
    bands([[3, P.navy], [8, P.steel], [14, P.pale], [999, P.foam]]);
    for (const [f0, f1, y] of [[0, .42, 26], [.56, 1, 24], [.12, .5, 29]])   // peach cloud, in thin streaks
      for (let x = X(f0); x < X(f1); x++) cell(x, S(y), P.pink);
    fuji(X(.64), S(14), S(20), [S(30), S(26)], 'mist');
    for (let y = S(34); y < ch; y++) for (let x = 0; x < cw; x++) cell(x, y, P.foam);   // the misty water
    for (const [y, sag] of [[44, 3], [49, 2], [55, 4], [60, 3], [66, 2], [72, 3]])   // long lines of current
      for (let x = 0; x < cw; x++) cell(x, S(y) + Math.round(Math.sin(x / cw * Math.PI) * sag * s), P.deep);
    rough(k, S(70), ch, 3.1, X(.25), cw);   // the rapids, lower right
    // the rock: from the lower left up to its tip, then a cliff falling away beneath it
    const top = x => S(64) - Math.round((x / cw) * 22 * s) + Math.round(Math.sin(x / s * .3) * s + Math.abs(Math.sin(x / s * .11)) * 3 * s);   // rugged
    const cliff = y => X(.58) - Math.round((y - S(56)) / (ch - S(56)) * cw * .3 + Math.abs(Math.sin(y / s * .23)) * 4 * s + hsh(Math.floor(y / S(4))) * 3 * s);   // jagged
    for (let y = S(55); y < ch; y++) for (let x = 0; x < cliff(y); x++) {
      if (y < top(x)) continue;
      const edge = y - top(x) < s || cliff(y) - x <= s, stroke = (x + Math.round(y * 1.6) + Math.round(hsh(Math.floor(y / S(3))) * 9 * s)) % S(9);
      cell(x, y, edge ? P.outline : y - top(x) < S(3) ? P.steel : stroke < s ? P.navy : stroke < 2 * s && hsh(Math.floor(x / s) * 1.3) < .5 ? P.steel : P.deep);   // carved in diagonal strokes
    }
    rough(k, S(96), ch, 7.7, 0, X(.3));   // foam breaking at the rock's foot
    const tx = X(.57), ty = top(tx);
    drawFigure(cell, X(.45), top(X(.45)) - 1, 'boy');
    drawFigure(cell, tx - S(3), ty - 1, 'fisher');
  }, live: (k, t) => {
    const { cw, ch, s, S, line, blot } = k;
    const X = f => Math.round(cw * f), tx = X(.57), ty = S(64) - Math.round(.57 * 22 * s) + Math.round(Math.sin(tx / s * .3) * s + Math.abs(Math.sin(tx / s * .11)) * 3 * s);
    for (const [i, [fx, y]] of [[.72, 96], [.8, 98], [.9, 100], [.98, 96], [1.04, 92]].entries())   // his lines, fanned out, swaying in the current
      line(tx + S(2), ty - S(4), X(fx) + Math.round(Math.sin(t * 1.6 + i) * 2 * s), S(y), P.outline);
    for (let i = 0; i < 14; i++) {   // spray thrown up where the rapids break on the rock
      const p = (t * .7 + i / 14) % 1, x = X(.3 + hsh(i * 2.9) * .45) + Math.round(p * 6 * s), y = S(96 - hsh(i * 5.1) * 22) - Math.round(Math.sin(p * Math.PI) * 9 * s);
      if (p < .85) blot(x, y, i % 3 ? P.white : P.pale);
    }
  } },
  { title: 'AT SEA OFF KAZUSA', draw: (k) => {
    // A great cargo ship, red-hulled, its deck heaped with green, sails out to sea under a white sail
    // billowing from a tall mast; a second ship close behind. The sea darkens from pale at the
    // horizon to deep blue, ruffled with little waves; Fuji is a white speck on the far shore.
    const { cw, ch, s, S, cell, line, bands, fuji } = k;
    const X = f => Math.round(cw * f);
    bands([[4, P.navy], [12, P.deep], [24, P.steel], [36, P.pale], [999, P.foam]], 0, S(46));
    for (let x = 0; x < cw; x++) cell(x, S(45), P.steel);   // the far shore
    fuji(X(.36), S(40), S(5), S(6), 'snowy');
    bands([[52, P.pale], [62, P.steel], [80, P.deep], [999, P.navy]], S(46), ch);   // the sea, darkening toward us
    for (let i = 0; i < 90; i++) {   // little waves
      const y = S(48) + Math.floor(Math.pow(hsh(i * 3.3), .7) * (ch - S(48))), x = Math.floor(hsh(i * 5.1) * cw), n = S(2 + (y / ch) * 3);
      for (let j = 0; j < n; j++) cell(x + j, y - (j === Math.floor(n / 2) ? 1 : 0), y < S(62) ? P.white : P.pale);
    }
    const hull = (x0, x1, deckY, keelY, bowRise, c, dark) => {   // a hull: deck to keel, its bow sweeping up on the left
      for (let x = x0; x < x1; x++) {
        const f = (x - x0) / (x1 - x0), lift = f < .18 ? Math.round((1 - f / .18) ** 2 * bowRise) : 0;
        const kl = keelY - Math.round(Math.max(0, .12 - f) * 60 * s) - Math.round(Math.max(0, f - .9) * 50 * s);
        for (let y = deckY - lift; y <= kl; y++) {
          const edge = y === deckY - lift || y === kl || x === x0 || x === x1 - 1;
          cell(x, y, edge ? P.outline : (y - deckY) % S(4) === 0 || (x - x0) % S(8) === 0 ? dark : c);   // the planking
        }
      }
    };
    // the second ship, behind, with its small sail
    hull(X(.66), X(.98), S(70), S(90), S(6), P.red, P.rust);
    for (let y = S(28); y < S(70); y++) cell(X(.9), y, P.brown);
    for (let y = S(32); y < S(56); y++) for (let x = X(.84); x < X(.9); x++) cell(x, y, x === X(.84) || y === S(32) ? P.outline : P.white);
    // the ship: the cargo heaped on deck, the hull, a dark knob at the bow
    for (let x = X(.5); x < X(.9); x++) { const t = S(64) - Math.round(Math.sin((x - X(.5)) / (X(.4)) * Math.PI) * 4 * s);
      for (let y = t; y < S(72); y++) cell(x, y, y === t ? P.leaf : hsh(x * 3 + y * 7) < .3 ? P.leaf : P.grass); }
    hull(X(.06), X(.9), S(72), S(100), S(14), P.red, P.rust);
    for (let o = 0; o < S(2); o++) line(X(.07) + o, S(58), X(.1) + o, S(66), P.outline);
    for (let x = X(.3); x < X(.5); x++) for (let y = S(66); y < S(72); y++) cell(x, y, (x + y) % S(3) ? P.rust : P.outline);   // the deckhouse
    // the mast, its yard, and the great white sail billowing out, shaded blue along its curve
    for (let o = 0; o < S(1.5); o++) line(X(.63) + o, S(4), X(.63) + o, S(72), o ? P.wood : P.outline);
    for (let o = 0; o < S(1); o++) line(X(.5), S(7) + o, X(.76), S(5) + o, P.outline);
    for (let y = S(8); y < S(60); y++) {
      const f = (y - S(8)) / S(52), bulge = Math.sin(f * Math.PI) * cw * .07, l = Math.round(X(.53) - bulge), r = X(.62);
      for (let x = l; x <= r; x++) cell(x, y, x === l ? P.outline : x - l < S(3) ? P.steel : P.white);
    }
    for (const [x1, y1] of [[.1, 60], [.95, 66], [.42, 70]]) line(X(.63), S(6), X(x1), S(y1), P.outline);   // rigging
  }, live: (k, t) => {
    const { cw, ch, s, S, cell } = k;
    for (let i = 0; i < 24; i++) {   // glints on the little waves, running past the ship
      const y = S(48) + Math.floor(Math.pow(hsh(i * 7.7), .7) * (ch - S(48))), x = Math.round(((hsh(i * 2.1) * cw - t * (4 + (y / ch) * 8) * s) % cw + cw) % cw);
      if (y > S(70) && y < S(101) && x > cw * .05 && x < cw * .9) continue;   // (not over the hull)
      for (let j = 0; j < S(2); j++) cell(x + j, y, P.white);
    }
  } },
  { title: 'TAGO BAY NEAR EJIRI', draw: (k) => {
    // Two long boats are rowed through a heaving sea toward Tago Bay, their rowers standing at the oars.
    // Beyond, the sandy shore and its villages among green trees, and Fuji, huge and deep blue, snow
    // speckled over its upper slopes, its foot in flowing green hills.
    const { cw, ch, s, S, cell, line, disc, bands, fuji } = k;
    const X = f => Math.round(cw * f);
    bands([[6, P.navy], [14, P.deep], [26, P.pale], [999, P.foam]], 0, S(44));
    fuji(X(.66), S(6), S(34), [S(46), S(54)], 'navy');
    for (let x = 0; x < cw; x++) {   // the green hills at its foot, in flowing bands
      const t = S(36) + Math.round(Math.sin(x / s * .05) * 3 * s + Math.sin(x / s * .17) * s);
      for (let y = t; y < S(46); y++) cell(x, y, y === t ? P.leaf : (y + Math.floor(x / S(9))) % S(3) ? P.grass : P.leaf);
    }
    for (let y = S(46); y < S(64); y++) for (let x = 0; x < cw; x++) cell(x, y, y < S(48) ? P.tan : P.sky);   // the sandy bay
    for (let i = 0; i < 26; i++) {   // trees and villages along the shore
      const fx = .3 + hsh(i * 2.1) * .7, y = S(52 + hsh(i * 3.7) * 8), r = S(2.5 + hsh(i * 5.3) * 2.5);
      if (hsh(i * 7.7) < .3) { for (let x = 0; x < S(5); x++) for (let d = 0; d < S(2); d++) cell(X(fx) + x, y + d, d ? P.tanD : P.grey1); }
      else clump(k, X(fx), y, r * 1.5, P.grass, P.leaf, P.gold, i * 4.3);
    }
    for (let x = 0; x < cw; x++) for (let y = S(62); y < S(67); y++) cell(x, y, y < S(64) ? P.wood : P.brown);   // the dark wet shore
    rough(k, S(66), ch, 5.3);
    // the boats: long, pale wood, pointing up into the bay, a rower standing at each
    const boat = (x0, y0, x1, y1, w) => {
      const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
      for (let i = 0; i <= n; i++) {
        const f = i / n, x = Math.round(x0 + (x1 - x0) * f), y = Math.round(y0 + (y1 - y0) * f), half = Math.round(w * Math.min(1, f * 4, (1 - f) * 6));
        for (let d = -half; d <= half; d++) cell(x, y + d, Math.abs(d) === half ? P.outline : d < 0 ? P.gold : P.ochre);
      }
    };
    boat(X(.62), S(70), X(.97), S(108), S(4));
    boat(X(.1), S(56), X(.66), S(114), S(6));
    drawFigure(cell, X(.15), S(60), 'rower'); line(X(.17), S(54), X(.1), S(84), P.outline);   // poling
    drawFigure(cell, X(.68), S(73), 'rower');
    for (const fx of [.38, .48]) drawFigure(cell, X(fx), S(84 + (fx - .38) * 120), 'rower');
  }, live: (k, t) => {
    const { cw, s, S, blot } = k;
    for (let i = 0; i < 18; i++) {   // spray flung up off the crests as the boats ride through
      const p = (t * .6 + i / 18) % 1, x = Math.round(cw * (.05 + hsh(i * 3.7) * .9) + p * 5 * s), y = S(80 + hsh(i * 2.3) * 34) - Math.round(Math.sin(p * Math.PI) * 8 * s);
      if (p < .8) blot(x, y, i % 4 ? P.white : P.pale);
    }
  } },
  { title: 'REFLECTION IN LAKE AT MISAKA', draw: (k) => {
    // Fuji, ochre in summer with snow in its gullies, stands above green hills and a village at the
    // lake's edge; in the still lake its reflection lies upside down, white with snow, and not quite
    // where it should be. A small boat drifts on the lake.
    const { cw, ch, s, S, cell, disc, bands, fuji } = k;
    const X = f => Math.round(cw * f);
    bands([[4, P.navy], [12, P.deep], [24, P.steel], [999, P.pale]], 0, S(60));
    fuji(X(.5), S(14), S(36), [S(36), S(40)], 'ochre');
    // green hills rolling down to the lake on both sides, Fuji between them; dark trees along their ridges
    const ridge = x => { const f = x / cw;
      return f < .45 ? S(34 + f * 50 + Math.sin(f * 30) * 2) : S(62 - (f - .45) * 76 + Math.sin(f * 24) * 2.5); };
    for (let x = 0; x < cw; x++) for (let y = Math.max(0, ridge(x)); y < S(60); y++)
      cell(x, y, y - ridge(x) < s || (y - ridge(x) + Math.round(Math.sin(x / s * .08) * 2 * s)) % S(7) === 0 ? P.leaf : P.grass);   // flowing bands down the slopes
    for (let i = 0; i < 46; i++) {
      const fx = hsh(i * 3.3), top = ridge(X(fx)), y = top + S(hsh(i * 5.7) * 12);
      if (y > S(58)) continue;
      clump(k, X(fx), y, S(2.5 + hsh(i) * 2.5), i % 3 ? P.pine : P.leaf, P.outline, P.leaf, i * 1.9);
    }
    for (let i = 0; i < 7; i++) for (let x = 0; x < S(6); x++) for (let d = 0; d < S(3); d++)   // the village by the water
      cell(X(.42 + i * .035) + x - d, S(54) + d, d === 0 ? P.brown : P.tan);
    for (let y = S(60); y < ch; y++) for (let x = 0; x < cw; x++) cell(x, y, y === S(60) ? P.steel : P.pale);   // the still lake
    // the reflection: Fuji upside down, white with snow, set a little to the left
    const deep = ch - S(62);   // (it hangs down from the shore, its peak near the bottom)
    fujiCells((x, r, c) => cell(X(.34) + x, S(62) + deep - 1 - r, c === P.white ? P.white : P.steel), deep, [S(34), S(30)], 'grey', Math.max(1, Math.round(s / 2)));
    for (let i = 0; i < 4; i++) clump(k, X(.16 + i * .2), S(62), S(3), P.grass, P.leaf, P.gold, i * 6.1);   // islets
  }, live: (k, t) => {
    const { cw, s, S, cell } = k;
    const x = Math.round(cw * .82 - ((t * 2 * s) % (cw * .6)));   // the boat drifting slowly across the still lake
    boat(cell, x, S(100), true, S);
    for (let j = 0; j < S(10); j++) if (j % S(3) < S(2)) cell(x + S(16) + j, S(101) + Math.round(Math.sin(t * 2 + j) * .5), P.white);   // its wake
  } },
];
// The order they come in, one each fall. (The two great close-ups of the mountain, Red Fuji and the
// Rainstorm, are kept apart.)
const ORDER = ['FINE WIND, CLEAR MORNING', 'KAJIKAZAWA IN KAI PROVINCE', 'GOTEN-YAMA HILL, SHINAGAWA ON THE TOKAIDO', 'AT SEA OFF KAZUSA',
  'RAINSTORM BENEATH THE SUMMIT', 'EJIRI IN SURUGA PROVINCE', 'TAGO BAY NEAR EJIRI', 'UNDER MANNEN BRIDGE AT FUKAGAWA',
  'REFLECTION IN LAKE AT MISAKA'];
PRINTS.sort((a, b) => ORDER.indexOf(a.title) - ORDER.indexOf(b.title));

// A clump of foliage, after the prints: a cluster of round puffs drawn as one shape, its scalloped
// edge in a darker colour, the inside flat, with a few lighter flecks (like the blossom on Goten-yama).
// r: its size (cells); seed: so each clump is its own shape.
function clump(k, cx, cy, r, inside, edge, fleck, seed) {
  const at = new Set(), cells = [];
  for (let j = 0; j < 7; j++) {
    const a = j * .9 + hsh(seed + j * 1.9) * .6, d = j ? .45 + hsh(seed + j * 3.3) * .3 : 0;
    const px = cx + Math.cos(a) * d * r, py = cy + Math.sin(a) * d * r * .6, pr = r * (.42 + hsh(seed + j * 5.1) * .2);
    for (let y = Math.floor(py - pr * .8); y <= py + pr * .8; y++) for (let x = Math.floor(px - pr); x <= px + pr; x++)
      if (((x - px) / pr) ** 2 + ((y - py) / (pr * .8)) ** 2 <= 1 && !at.has(x + ',' + y)) { at.add(x + ',' + y); cells.push([x, y]); }
  }
  for (const [x, y] of cells) {
    const rim = !at.has(x + ',' + (y + 1)) || !at.has(x + 1 + ',' + y) || !at.has(x - 1 + ',' + y) || !at.has(x + ',' + (y - 1));
    k.cell(x, y, rim ? edge : hsh(x * 1.71 + y * 3.13) < .06 ? fleck : inside);
  }
}

// A rough sea, after Hokusai: rolling Prussian-blue swells, each crest edged in ink and riding white
// foam that curls forward in little clawed fingers. Rows of swells from the back (top) forward, each
// nearer one bigger, between rows top and bottom and columns x0 to x1. (seed: each print's sea its own.)
function rough(k, top, bottom, seed, x0 = 0, x1 = k.cw) {
  const { s, cell } = k;
  for (let y = top; y < bottom; y++) for (let x = x0; x < x1; x++) cell(x, y, P.deep);
  const n = Math.max(2, Math.round((bottom - top) / (10 * s))), band = (bottom - top) / n;
  for (let i = 0; i < n; i++) {
    const cy = top + (i + .5) * band, amp = (2 + i * 1.2) * s, len = (16 + i * 7) * s, off = hsh(seed + i * 1.3) * len;
    const crest = x => { const f = (((x + off) / len) % 1 + 1) % 1; return { f, y: Math.round(cy - Math.sin(f * Math.PI) * amp) }; };
    for (let x = x0; x < x1; x++) {
      const { f, y } = crest(x);
      for (let yy = y; yy < Math.min(bottom, cy + amp + band); yy++) {   // the swell's face: ink edge, a lit band, then deep blue, streaked
        const d = yy - y;
        const streak = d >= 4 * s && (Math.floor(yy / s) + Math.floor(x / (3 * s))) % 5 === 0;   // (lines of light in the water)
        cell(x, yy, d < s ? P.outline : d < 2 * s ? P.steel : streak ? P.steel : dither(x, yy) < Math.min(1, (d - 2 * s) / (7 * s)) ? P.navy : P.deep);   // lit under the crest, darkening (bokashi)
      }
      if (f > .25 && f < .75) for (let d = 1; d <= Math.round(s * (1 + Math.sin((f - .25) * 2 * Math.PI) * 1.5)); d++) cell(x, y - d, P.white);   // foam riding the crest
    }
    for (let j = 0; j < (x1 - x0) / (5 * s); j++) {   // its claws: fingers of foam reaching forward off the crest
      const x = Math.round(x0 + j * 5 * s + hsh(seed * 3 + i * 7 + j) * 3 * s), { f, y } = crest(x);
      if (f < .35 || f > .7) continue;
      for (let c = 0; c < 3; c++) {
        const fx = x + Math.round(c * s * 1.2), fy = y - Math.round(s * (2.2 + Math.sin(c * 1.7)));
        for (let o = 0; o < Math.max(1, Math.round(s * .8)); o++) { cell(fx + o, fy, P.white); cell(fx + o, fy + 1, P.white); }
        cell(fx, fy - 1, P.outline);
      }
    }
  }
}

// A small boat on the river, two figures in it (sizes in design cells, scaled by S).
function boat(cell, x, y, flip, S) {
  const s = flip ? -1 : 1, len = S(16);
  for (let i = 0; i < len; i++) {
    cell(x + s * i, y, P.outline);
    if (i > 0 && i < len - 1) for (let d = 1; d <= S(1); d++) cell(x + s * i, y - d, P.ochre);
  }
  for (const [at, head] of [[4, P.outline], [10, P.ochre]]) for (let o = 0; o < S(1); o++) {
    for (let d = S(1) + 1; d <= S(2); d++) cell(x + s * (S(at) + o), y - d, P.navy);
    for (let d = S(2) + 1; d <= S(3); d++) cell(x + s * (S(at) + o), y - d, head);
  }
  for (let i = 0; i < S(6); i++) cell(x + s * (S(10) + i), y - S(3) - i, P.outline);   // a pole
}

// Little people, a few cells tall: people at the blossom-viewing, standing or sitting, and a traveller
// bent into the wind under a straw hat. (Drawn here at double detail with Scale2x, or four times on
// the finest grids.)
const person = (name, c) => ({ [name]: ['.KK.', '.SS.', 'xxxx', 'xxxxS', 'xxx.', 'xxx.', 'xxx.', 'xxxx', 'K.K.'].map(r => r.replaceAll('x', c)) });
const FIGURES = Object.fromEntries(Object.entries({
  // people at the blossom-viewing, in blue, green and navy kimono ('x' is the kimono's colour)
  ...person('standBlue', 'b'), ...person('standGreen', 'g'), ...person('standNavy', 'n'),
  sitBlue:  ['.KK..', '.SS..', 'bbbb.', 'bbbbb', 'bbbbbb'],
  sitGreen: ['.KK..', '.SS..', 'gggg.', 'ggggg', 'gggggg'],
  walker: ['..YYY', '.YYYYY', '..KK.', '.nnK.', 'nnn..', '.nnn.', '.n.n.', 'K..K.'],
  // Kajikazawa: the fisherman, leaning out in a red jacket patterned white, and the boy crouched behind
  fisher: ['...KK..', '..RRRS.', '.RWRRRS', 'RRRWR..', '.nn....', '.n.n...', 'n...n..'],
  boy:    ['.KK.', 'RRRS', 'RRRR', 'nnnn'],
  // Tago Bay: a rower standing at the oar
  rower:  ['.YY.', '.KK.', 'SnnS', '.nn.', '.nn.', '.n.n'],
}).map(([k, rows]) => [k, scale2x(rows.map(r => r.padEnd(Math.max(...rows.map(q => q.length)), '.')))]));
const FIG_COL = { Y: P.ochre, K: P.outline, n: P.navy, R: P.red, S: P.skin, b: P.deep, g: P.leaf, W: P.white };
const FIGURES4 = Object.fromEntries(Object.entries(FIGURES).map(([k, rows]) => [k, scale2x(rows)]));
function drawFigure(cell, x, bottom, kind) {
  const rows = (figureScale > 2 ? FIGURES4 : FIGURES)[kind];
  rows.forEach((row, r) => [...row].forEach((ch, c) => { if (ch !== '.') cell(x + c, bottom - rows.length + 1 + r, FIG_COL[ch]); }));
}

// Each print's still picture, painted once per screen size (painting it cell by cell every frame
// would be far too slow).
const caches = new Map();
function still(i) {
  const key = i + ':' + LW + 'x' + LH;
  let c = caches.get(key);
  if (!c) {
    c = document.createElement('canvas'); c.width = LW; c.height = LH;
    const k = canvas(c.getContext('2d'), 0, 1, true);
    PRINTS[i].draw(k, 0); k.flush();
    caches.set(key, c);
  }
  return c;
}
// Paint the prints ahead of time, one at a time, so the first fall doesn't stutter.
export function prepareDawns() { PRINTS.forEach((_, i) => setTimeout(() => still(i), 100 + i * 120)); }

// Draw the dawn for the n-th fall at time t into it.
export function drawDawn(g, t, n) {
  const a = t < .5 ? t / .5 : t > 1.3 ? Math.max(0, 1 - (t - 1.3) / .4) : 1;
  if (a <= 0) return;
  const i = ((n % PRINTS.length) + PRINTS.length) % PRINTS.length, print = PRINTS[i], k = canvas(g, t, a), img = still(i);
  for (let x = 0; x < k.cw; x++) {   // as much of each column as the dawn has reached
    const [y0, y1] = k.span(x);
    if (y1 > y0) g.drawImage(img, x * C, y0 * C, C, (y1 - y0) * C, x * C, y0 * C, C, (y1 - y0) * C);
  }
  if (print.live) print.live(k, t);
  if (t > .5 && t < 1.3) {   // the title label, top left, as on the prints
    const w = print.title.length * LETTER + 10;
    g.fillStyle = P.outline; g.fillRect(8, 8, w + 4, 26);
    g.fillStyle = P.foam; g.fillRect(10, 10, w, 22);
    pixelText(print.title, 16, 14, P.navy);
  }
}

// A print, whole and still, filling the screen (Level 0 shows them, as the game's inspiration).
export const PRINT_TITLES = PRINTS.map(p => p.title);
export function drawPrint(g, i, t = 0) {   // (t: time, for its animation)
  g.drawImage(still(i), 0, 0);
  if (PRINTS[i].live) PRINTS[i].live(canvas(g, 1 + t, 1), 1 + t);
}
