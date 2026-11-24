// ============================================================================
// dawn.js — after a fall, a new tomorrow dawns as one of Hokusai's Thirty-six Views of Mount Fuji,
// a different print each fall (each level has its own order), recreated cell by cell with the game's own palette:
//   Fine Wind, Clear Morning ("Red Fuji") · Rainstorm Beneath the Summit · Under Mannen Bridge at
//   Fukagawa · At Sea off Kazusa · Tago Bay near Ejiri · Reflection in Lake at Misaka · Shichiri Beach ·
//   Mishima Pass · The Inume Pass · Umezawa · Lake Suwa
// (Chosen for their land, sea and sky: the ones full of people don't come out well this small.)
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
import { S } from './state.js';
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
  { title: 'FINE WIND, CLEAR MORNING', draw: (k) => {
    // Red Fuji: the mountain rust red in the first light, under a deep blue sky full of little clouds
    const { cw, ch, s, S, bands, fuji } = k;
    bands([[26, P.navy], [52, P.deep], [76, P.steel], [88, P.pale], [96, P.pink], [999, P.dawn]]);
    for (let i = 0; i < 64; i++) {   // the clouds in drifts, smaller and closer together toward the horizon
      const q = hsh(i * 2.9), y = S(14 + q ** .8 * 56), row = Math.floor(q * 9);
      scrap(k, Math.round(((hsh(i * 7.3) * 1.15 + row * .07) % 1.15 - .05) * cw), y, S(9 - q * 4.5 + hsh(i * 3.1) * 5), S(2.4 - q * 1.2));
    }
    fuji(Math.round(cw * .6), ch - S(76), S(76), [Math.round(cw * .75), Math.round(cw * .5)], 'red');
  }, live: (k, t) => {
    const { cw, s, S } = k;
    for (let i = 0; i < 5; i++) scrap(k, Math.round(((hsh(i * 4.3) * cw + t * (3 + i % 3) * s) % (cw + S(20))) - S(10)), S(18 + hsh(i * 6.1) * 22), S(8 + i % 3 * 2), S(2));   // a few more, drifting
  } },
  { title: 'RAINSTORM BENEATH THE SUMMIT', draw: (k) => {
    // the snowy summit in clear sky above banks of cloud; below, the dark slopes and a red lightning bolt
    const { cw, ch, s, S, cell, bands, fuji } = k, X = f => Math.round(cw * f);
    bands([[10, P.navy], [24, P.deep], [44, P.steel], [999, P.pale]]);
    const puff = (x, y) => (dither(x, y) < .35 ? P.foam : P.white);
    for (const [f0, f1, y0, y1] of [[-.1, .26, 46, 64], [-.1, .2, 60, 78]]) lobes(k, X(f0), X(f1), S(y0), S(y1), 'r', puff);
    for (const [f0, f1, y0, y1] of [[.86, 1.1, 40, 54], [.9, 1.1, 52, 70]]) lobes(k, X(f0), X(f1), S(y0), S(y1), 'l', puff);
    // the great heap of cloud, upper left, each billow ringed and shaded underneath
    for (let i = 0; i < 12; i++) {
      const cx = X(.03 + i * .04), cy = S(36 - Math.sin(i * 1.3) * 5 - (i > 4 && i < 9 ? 7 : 0)), r = S(5 + hsh(i * 4.7) * 5);
      for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) { const d = Math.hypot(x, y); if (d <= r) cell(cx + x, cy + y, d > r - 1.2 ? (y < 0 ? P.grey2 : P.grey1) : y > 0 && dither(cx + x, cy + y) < y / r * .8 ? P.grey0 : P.white); }
    }
    fuji(X(.62), S(12), ch, [X(.85), X(.55)], 'storm');
    for (let x = 0; x < cw; x++) {   // the woods on the lowest slopes, a ragged line of treetops against the black
      const top = S(108 + Math.sin(x * .02) * 4) - Math.round(Math.abs(Math.sin(x * .31)) * S(2.5) + hsh(x) * 2);
      for (let y = top; y < ch; y++) cell(x, y, y === top ? P.navy : hsh(x * 1.9 + y * 4.3) < .08 ? P.navy : P.outline);
    }
  }, live: (k, t) => {
    const { cw, ch, s, S, cell } = k;
    if (Math.sin(t * 9) > -.2 || Math.sin(t * 3.7) > .5) {   // lightning, flickering: one bolt, forking as it comes down
      const bolt = (x, y, n, dx, seed, w) => { for (let i = 0; i < n; i++) {
        const nx = x - dx * S(i % 2 ? 1 : 7 + hsh(seed + i) * 4), ny = y + S(i % 2 ? 5 : 2.4), m = Math.ceil(Math.max(Math.abs(nx - x), Math.abs(ny - y)));
        for (let j = 0; j <= m; j++) for (let o = -w; o <= w; o++) cell(x + (nx - x) * j / m + o * .6, y + (ny - y) * j / m + o, Math.abs(o) === w ? P.red : P.dawn);
        if (w > 1 && i === 3) bolt(nx, ny, 5, -.8, seed + 9, 1); if (w > 1 && i === 6) bolt(nx, ny, 4, 1.4, seed + 4, 1);
        x = nx; y = ny; } };
      bolt(cw * .84, ch * .52, 11, 1, 3.3, 2);
    }
  } },
  { title: 'UNDER MANNEN BRIDGE AT FUKAGAWA', draw: (k) => {
    // the great arch of the bridge over the river, a town's trees and roofs on both banks, Fuji small under it
    const { cw, ch, s, S, cell, bands, fuji } = k, X = f => Math.round(cw * f);
    bands([[3, P.navy], [8, P.deep], [22, P.pale], [44, P.foam], [999, P.sky]], 0, S(72));
    for (let i = 0; i < 9; i++) scrap(k, X(hsh(i * 3.7)), S(38 + hsh(i * 5.1) * 18), S(16 + hsh(i) * 14), S(1.2));
    fuji(X(.5), S(50), S(21), [S(26), S(28)], 'day');
    for (let x = 0; x < cw; x++) for (let y = S(69 - Math.abs(Math.sin(x * .035)) * 1.4); y < S(72); y++) cell(x, y, y < S(69) ? P.leaf : P.pine);   // the far bank
    // the river, pale far off and deep blue near, its ripples longer toward us
    for (let y = S(72); y < ch; y++) for (let x = 0; x < cw; x++) { const q = (y / s - 72) / 48; cell(x, y, dither(x, y) < q * 1.6 - .5 ? P.deep : dither(x, y) < q * 2.2 ? P.steel : P.pale); }
    for (let i = 0; i < 130; i++) { const q = hsh(i * 2.3) ** 1.3, y = S(73 + q * 46), n = S(3 + q * 9), x0 = X(hsh(i * 5.9)); for (let j = 0; j < n; j++) cell(x0 + j, y - Math.round(Math.sin(j / n * Math.PI) * s * .5), q > .45 ? (i % 3 ? P.navy : P.pale) : P.foam); }
    // the near banks: stone walls, trees, and the roofs of the town
    for (const side of [-1, 1]) {
      const at = f => X(side < 0 ? f : 1 - f);
      for (const [f, y, r] of [[.02, 62, 6], [.07, 64, 5], [.12, 65, 4.5], [.16, 67, 3.5], [.2, 68, 3]]) clump(k, at(f), S(y), S(r), P.leaf, P.pine, P.grass, f * 71 + side);
      for (const [f, y, w] of [[.04, 67, 13], [.11, 68.5, 10], [.17, 69.5, 7]]) {
        for (let r = 0; r < S(5); r++) { const h = S(w) / 2 + r * .7; for (let x = -h; x <= h; x++) cell(at(f) + x, S(y) + r, r < 1 || Math.abs(x) > h - 1.2 ? P.outline : r < S(1) ? P.grey1 : Math.round(x + 400) % S(2) < 1 ? P.navy : P.slate); }
        for (let r = S(5); r < S(8); r++) for (let x = -S(w) / 2 + 2; x <= S(w) / 2 - 2; x++) cell(at(f) + x, S(y) + r, r < S(5) + 1 ? P.outline : Math.round(x + 400) % S(3) < 1 ? P.brown : P.tan);
      }
      for (let y = S(73); y < S(88); y++) for (let j = 0; j < X(.24) - (y - S(73)) * 1.5; j++) { const x = side < 0 ? j : cw - 1 - j, row = Math.floor(y / S(2.4)), e = (x + row * S(2)) % S(5) < 1 || y % S(2.4) < 1; cell(x, y, e ? P.outline : hsh(Math.floor((x + row * S(2)) / S(5)) * 3.3 + row * 7.1) < .4 ? P.grey2 : P.grey1); }
    }
    // the bridge: railing, deck, and beams, its arch broad and low; piles standing in the river at each end
    const cx = cw / 2, deck = x => S(22) + ((x - cx) / (cw * .62)) ** 2 * 60 * s;
    for (let x = 0; x < cw; x++) {
      const d = Math.round(deck(x)), out = Math.abs(x - cx) / cw;
      if (out > .33 && x % S(8) < S(2)) { const j = x % S(8); for (let y = d + S(8); y < ch; y++) cell(x, y, j === 0 || j === S(2) - 1 ? P.outline : j < S(.8) ? P.ochre : (y > S(100) ? dither(x, y) < .6 : false) ? P.brown : P.wood); }
      if (out > .33) for (const yy of [S(60), S(84)]) if (yy > d + S(10)) for (let y = yy; y < yy + S(1.6); y++) cell(x, y, y === yy || y >= yy + S(1.6) - 1 ? P.outline : P.wood);
      cell(x, d - S(1), P.outline); cell(x, d, P.ochre); cell(x, d + 1, P.outline);                                // the handrail
      if (x % S(6) < 2) for (let y = d + 1; y < d + S(3.4); y++) cell(x, y, x % S(6) ? P.wood : P.outline);      // its posts
      for (let y = d + S(3.4); y < d + S(9); y++) { const q = (y - d - S(3.4)) / S(5.6); cell(x, y, q < .06 || q > .95 ? P.outline : q < .26 ? P.tan : q < .32 ? P.outline : q < .62 ? (dither(x, y) < (q - .3) * 1.2 ? P.wood : P.ochre) : q < .68 ? P.outline : dither(x, y) < (q - .6) * 1.6 ? P.brown : P.wood); }
    }
  }, live: (k, t) => {
    const { cw, s, S, cell } = k;
    for (let i = 0; i < 2; i++) boat(cell, Math.round(((cw * (.3 + i * .35) + t * (2 + i) * s) % (cw + S(30))) - S(15)), S(88 + i * 14), i % 2 === 1, S);   // boats under the bridge
    const cx = cw / 2, deck = x => S(22) + ((x - cx) / (cw * .62)) ** 2 * 60 * s;
    for (let i = 0; i < 4; i++) {   // people crossing, small under their hats
      const px = Math.round(((cw * (.15 + i * .22) + t * (i % 2 ? 2 : -2) * s) % cw + cw) % cw), d = Math.round(deck(px)) - S(1);
      for (let x = 0; x < S(1.6); x++) for (let y = 1; y < S(4); y++) cell(px + x, d - y, y < S(2.4) ? P.navy : P.skin);
      for (let x = -S(1); x < S(2.6); x++) cell(px + x, d - S(4), P.ochre);
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
    for (let i = 0; i < 260; i++) {   // the waves: little arcs, each lit along its crest with a dark hollow under it, bigger toward us
      const q = hsh(i * 3.3) ** .75, y = S(48) + Math.floor(q * (ch - S(48))), x = Math.floor(hsh(i * 5.1) * (cw + 40)) - 20, n = S(2 + q * 7);
      for (let j = 0; j < n; j++) { const up = Math.round(Math.sin(j / (n - 1) * Math.PI) * s * (.3 + q)); cell(x + j, y - up, y < S(62) ? P.white : j > n * .2 && j < n * .6 ? P.white : P.pale); cell(x + j, y - up + 1, y < S(62) ? P.steel : P.sea); if (q > .4) cell(x + j + 1, y - up + 2, P.navy); }
    }
    const hull = (x0, x1, deckY, keelY, bowRise, c, dark) => {   // a hull: deck to keel, its bow sweeping up on the left
      for (let x = x0; x < x1; x++) {
        const f = (x - x0) / (x1 - x0), lift = f < .18 ? Math.round((1 - f / .18) ** 2 * bowRise) : 0;
        const kl = keelY - Math.round(Math.max(0, .12 - f) * 60 * s) - Math.round(Math.max(0, f - .9) * 50 * s);
        for (let y = deckY - lift; y <= kl; y++) {
          const edge = y === deckY - lift || y === kl || x === x0 || x === x1 - 1, d = y - (deckY - lift), q = d / Math.max(1, kl - deckY), plank = d % S(5);
          cell(x, y, edge ? P.outline : d < S(1.4) ? P.tan : d < S(1.4) + 2 ? P.outline : plank === 0 || ((x - x0 + Math.floor(d / S(5)) * S(17)) % S(34) === 0) ? dark : plank < 3 && q < .5 ? P.ember : dither(x, y) < (q - .25) * 1.1 ? dark : c);   // the planking, lit above, dark toward the keel
        }
      }
    };
    // the second ship, behind, with its small sail
    hull(X(.66), X(.98), S(70), S(90), S(6), P.red, P.rust);
    for (let y = S(28); y < S(70); y++) cell(X(.9), y, P.brown);
    for (let y = S(32); y < S(56); y++) for (let x = X(.84); x < X(.9); x++) cell(x, y, x === X(.84) || y === S(32) ? P.outline : P.white);
    // the ship: the cargo heaped on deck, the hull, a dark knob at the bow
    for (let x = X(.5); x < X(.9); x++) { const t = S(64) - Math.round(Math.sin((x - X(.5)) / (X(.4)) * Math.PI) * 4 * s);
      for (let y = t; y < S(72); y++) cell(x, y, y <= t + 1 ? P.outline : hsh(Math.floor(x / 2) * 3 + Math.floor(y / 2) * 7) < .12 ? P.pine : dither(x, y) < (y - t) / S(10) ? P.leaf : P.grass); for (const q of [.2, .45, .7]) if (Math.abs(x - X(.5 + .4 * q)) < 1.5) for (let y = t; y < S(72); y++) cell(x, y, P.ochre); }
    hull(X(.06), X(.9), S(72), S(100), S(14), P.red, P.rust);
    for (let x = X(.04); x < X(.94); x++) { const n = Math.round((Math.sin(x * .09) + Math.sin(x * .23) * .6 + 1.6) * s * .8 + Math.max(0, .16 - x / cw) * 34 * s * .5); for (let j = 0; j < n; j++) cell(x, S(101) - j + Math.round(Math.sin(x * .05) * s), j > n - 2 ? P.white : dither(x, j) < .5 ? P.pale : P.white); }   // foam along the waterline, piled up at the bow
    for (let o = 0; o < S(2); o++) line(X(.07) + o, S(58), X(.1) + o, S(66), P.outline);
    for (let x = X(.3); x < X(.5); x++) for (let y = S(66); y < S(72); y++) cell(x, y, y < S(67) ? P.outline : y < S(68) ? P.tan : (x - X(.3)) % S(6) < 2 ? P.outline : dither(x, y) < .4 ? P.rust : P.red);   // the deckhouse
    // the mast, its yard, and the great white sail billowing out, shaded blue along its curve
    for (let o = 0; o < S(1.5); o++) line(X(.63) + o, S(4), X(.63) + o, S(72), o ? P.wood : P.outline);
    for (let o = 0; o < S(1); o++) line(X(.5), S(7) + o, X(.76), S(5) + o, P.outline);
    for (let y = S(8); y < S(60); y++) {
      const f = (y - S(8)) / S(52), bulge = Math.sin(f * Math.PI) * cw * .07, l = Math.round(X(.53) - bulge), r = X(.62);
      for (let x = l; x <= r; x++) { const q = (x - l) / (r - l); cell(x, y, x === l || x === r || y === S(8) || y === S(60) - 1 ? P.outline : Math.floor(q * 7) !== Math.floor((x + 1 - l) / (r - l) * 7) ? P.grey0 : dither(x, y) < .75 - q * 2.2 ? P.steel : dither(x, y) < .9 - q * 1.6 ? P.pale : P.white); }
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
      const t2 = S(41) + Math.round(Math.sin(x / s * .08 + 2) * 2.4 * s); for (let y = t; y < S(46); y++) cell(x, y, y <= t || y === t2 ? P.outline : hsh(Math.floor(x / 2) * 2.3 + Math.floor(y / 2) * 6.1) < .06 ? P.pine : dither(x, y) < (y < t2 ? (y - t) / S(9) : (y - t2) / S(6)) ? P.leaf : P.grass);
    }
    for (let y = S(46); y < S(64); y++) for (let x = 0; x < cw; x++) cell(x, y, y < S(48) ? P.tan : P.sky);   // the sandy bay
    for (let i = 0; i < 26; i++) {   // trees and villages along the shore
      const fx = .3 + hsh(i * 2.1) * .7, y = S(52 + hsh(i * 3.7) * 8), r = S(2.5 + hsh(i * 5.3) * 2.5);
      if (hsh(i * 7.7) < .3) { for (let x = 0; x < S(6); x++) for (let d = 0; d < S(4); d++) { const in_ = d < S(2) ? Math.abs(x - S(3)) <= S(1) + d : x > 2 && x < S(6) - 2; if (in_) cell(X(fx) + x, y + d, d < 1 || d === S(2) || x === 0 ? P.outline : d < S(2) ? P.olive : P.tan); } }
      else clump(k, X(fx), y, r * 1.5, P.leaf, P.pine, P.grass, i * 4.3);
    }
    for (let x = 0; x < cw; x++) for (let y = S(62); y < S(67); y++) cell(x, y, y < S(64) ? P.wood : P.brown);   // the dark wet shore
    rough(k, S(66), ch, 5.3);
    // the boats: long, pale wood, pointing up into the bay, a rower standing at each
    const boat = (x0, y0, x1, y1, w) => {
      const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
      for (let i = 0; i <= n; i++) {
        const f = i / n, x = Math.round(x0 + (x1 - x0) * f), y = Math.round(y0 + (y1 - y0) * f), half = Math.round(w * Math.min(1, f * 4, (1 - f) * 6));
        for (let d = -half; d <= half; d++) { const q = d / Math.max(1, half), seat = i % S(13) < S(2) && half > S(2); cell(x, y + d, Math.abs(d) === half ? P.outline : q < -.6 ? P.tan : q < -.5 ? P.outline : q < .35 ? (seat ? P.tan : dither(x, y + d) < .4 ? P.brown : P.wood) : q < .45 ? P.outline : dither(x, y + d) < (q - .3) ? P.wood : P.ochre); }
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
    const { cw, ch, s, S, cell, bands, fuji } = k, X = f => Math.round(cw * f);
    bands([[4, P.navy], [10, P.deep], [18, P.pale], [34, P.foam], [999, P.foam]], 0, S(62));
    for (let i = 0; i < 8; i++) scrap(k, X(hsh(i * 3.1)), S(22 + hsh(i * 5.3) * 22), S(18 + hsh(i) * 16), S(1.2));
    fuji(X(.5), S(10), S(48), [S(50), S(56)], 'ochre');
    // green hills coming down to the lake on both sides, one fold behind another, inked, woods along them
    const hill = (f, y, rx, ry, seed) => dome(k, X(f), S(y), cw * rx, S(ry), (x, yy) => (hsh(Math.floor(x / 2) * 2.3 + Math.floor(yy / 2) * 6.1 + seed) < .05 ? P.pine : dither(x, yy) < .25 + .5 * Math.max(0, (yy / s - (y - ry)) / ry) ? P.leaf : P.grass));
    hill(.06, 66, .2, 30, 1); hill(.94, 66, .24, 36, 2); hill(.22, 66, .15, 18, 3); hill(.78, 66, .17, 22, 4); hill(.02, 66, .14, 18, 5); hill(.98, 66, .16, 20, 6);
    for (const [f, y, r] of [[.02, 42, 5], [.06, 38, 5], [.12, 44, 4], [.2, 51, 4], [.26, 52, 3.4], [.3, 56, 3], [.9, 33, 5], [.96, 31, 6], [.86, 38, 4.4], [.8, 46, 4.4], [.74, 48, 4], [.7, 54, 3.4], [.04, 52, 4.4], [.94, 50, 4.6], [.99, 48, 4.6]]) clump(k, X(f), S(y), S(r), P.pine, P.outline, P.leaf, f * 63 + y);
    // the lake, pale far off, deepening toward us
    for (let y = S(60); y < ch; y++) for (let x = 0; x < cw; x++) { const q = (y / s - 60) / 60; cell(x, y, dither(x, y) < q * 1.3 - .75 ? P.deep : dither(x, y) < q * 1.5 - .15 ? P.steel : P.pale); }
    // the reflection: Fuji upside down, white with snow, set a little to the left, broken by ripples
    const deep = S(54);
    fujiCells((x, r, c) => { const y = S(62) + deep - 1 - r, wob = Math.round(Math.sin(y * .35) * s * .5 * (1 - r / deep)); if (Math.floor(y / 2) % 7 && c !== P.outline) cell(X(.36) + x + wob, y, c === P.white ? P.white : c === P.pale ? P.pale : dither(x + 512, y) < .5 ? P.sea : P.steel); }, deep, [S(52), S(48)], 'snowy', Math.max(1, Math.round(s / 2)));
    for (let y = S(59); y < S(66); y++) for (let x = 0; x < cw; x++) { const f = x / cw, e = S(60.5 + Math.sin(f * 30) * .6); if (f < .31 + (y - S(59)) * -.006 || f > .68 + (y - S(59)) * .006) cell(x, y, y < e ? P.leaf : y < e + 2 ? P.outline : P.tan); }
    // the village: thatched roofs, one against another, along the shore
    for (const [f, y, w] of [[.33, 55, 10], [.39, 57, 11], [.45, 56.4, 9], [.5, 57.4, 12], [.56, 56.6, 10], [.62, 57.2, 11], [.67, 55.6, 9]]) {
      for (let r = 0; r < S(5); r++) { const h = S(w) * (.28 + .26 * r / S(5)); for (let x = -h; x <= h; x++) cell(X(f) + x, S(y) + r, r < 1 || Math.abs(x) > h - 1.2 ? P.outline : r < S(1) ? P.brown : (r + Math.floor(hsh(Math.floor(x / 2) + f * 90) * 3)) % S(2) < 1 ? P.olive : P.ochre); }
      for (let r = S(5); r < S(7); r++) for (let x = -S(w) * .36; x <= S(w) * .36; x++) cell(X(f) + x, S(y) + r, r < S(5) + 1 || Math.abs(x) > S(w) * .36 - 1.2 ? P.outline : Math.round(x + 300) % S(2.6) < 1 ? P.brown : P.tan);
    }
    for (const [f, y, r] of [[.3, 60, 3.4], [.36, 61, 2.6], [.42, 61, 2.4], [.53, 61.4, 2.6], [.6, 61.4, 2.4], [.7, 60, 3.4]]) clump(k, X(f), S(y), S(r), P.leaf, P.pine, P.grass, f * 97);
    for (let i = 0; i < 60; i++) { const q = hsh(i * 2.3), y = S(68 + q * 50), n = S(4 + q * 10), x0 = X(hsh(i * 5.9)); for (let j = 0; j < n; j++) cell(x0 + j, y, i % 3 ? P.foam : P.steel); }   // ripples
    // a spit of land in front, a pine on it
    dome(k, X(.93), S(124), cw * .2, S(20), (x, y) => (hsh(Math.floor(x / 2) * 1.9 + Math.floor(y / 2) * 4.7) < .06 ? P.pine : dither(x, y) < .5 ? P.leaf : P.grass));
    for (const [f, y, r] of [[.86, 108, 4], [.92, 104, 6], [.97, 103, 5], [.95, 98, 5], [.89, 101, 4.4]]) clump(k, X(f), S(y), S(r), P.pine, P.outline, P.leaf, f * 41);
  }, live: (k, t) => {
    const { cw, s, S, cell } = k, x = Math.round(cw * .74 - ((t * 2 * s) % (cw * .5)));   // the boat drifting slowly across the still lake
    boat(cell, x, S(100), true, S);
    for (let j = 0; j < S(10); j++) if (j % S(3) < S(2)) cell(x + S(16) + j, S(101) + Math.round(Math.sin(t * 2 + j) * .5), P.white);   // its wake
  } },
  { title: 'SHICHIRI BEACH IN SAGAMI PROVINCE', draw: (k) => {
    // A bay at sunset: an orange sky with towers of pale cloud low in it, little wooded islands of blue
    // rock, surf coming in on a long beach, a green hill spotted with bushes, and Fuji beyond. Nobody there.
    // (Positions: x as a fraction of the width, y in design rows, after the print.)
    const { cw, ch, s, S, cell, line, bands } = k, X = f => Math.round(cw * f);
    bands([[4, P.navy], [7, P.deep], [10, P.pale], [26, P.foam], [36, P.sky], [44, P.skin], [999, P.dawn]], 0, S(59));
    billow(k, [[.13, 55, 3], [.16, 53, 3.4], [.2, 54, 3.6], [.24, 54, 3.4], [.28, 55, 3], [.24, 47, 3.2], [.265, 45, 3], [.25, 50, 3.6], [.285, 51, 2.6], [.33, 55, 3.4], [.35, 52, 3], [.38, 50, 3.8], [.36, 42, 4], [.375, 35, 3.4], [.4, 37, 3.4], [.39, 44, 4.6], [.42, 48, 4.4], [.4, 54, 4.4], [.44, 55, 4]], P.sky, P.dawn);
    // Fuji, the colour of the paper, its lower slopes streaked blue on the left and green on the right
    const fl = ridgeOf(k, [[.5, 55], [.56, 47], [.6, 41], [.64, 34.5], [.668, 29], [.688, 29], [.72, 34], [.77, 40.5], [.83, 46.5], [.915, 52.5]]);
    for (let x = X(.5); x < X(.915); x++) for (let y = fl(x); y < S(53); y++) {
      const f = x / cw, d = (y / s - 34 - hsh(Math.floor(x / 4) * 2.3) * 9) / 15, left = f < .683;
      cell(x, y, y - fl(x) < 2 ? P.outline : dither(x, y) < d * (left ? 1.2 : 1) - (left ? .2 : .25) + (hsh(Math.floor(x / 3) * 1.7 + Math.floor(y / 5) * 9.1) < d * .35 ? .5 : 0) ? (left ? P.deep : P.leaf) : P.foam);
    }
    for (const [f0, f1, y] of [[.86, 1, 43], [.91, 1, 46], [.88, .98, 49], [.93, 1, 51]]) for (let x = X(f0); x < X(f1); x++) cell(x, S(y), P.dawn);   // streaks of evening cloud
    bands([[66, P.foam], [76, P.pale], [91, P.teal], [97, P.pale], [999, P.foam]], S(59), ch);
    for (let x = 0; x < X(.46); x++) cell(x, S(59), P.outline);   // the horizon
    const far = ridgeOf(k, [[.2, 58.6], [.25, 57], [.3, 57.6], [.36, 56.4], [.42, 56], [.48, 54]]);
    for (let x = X(.2); x < X(.48); x++) for (let y = far(x); y < S(59); y++) cell(x, y, y - far(x) < 1 ? P.outline : x / cw < .28 ? P.deep : P.pine);
    const rock = (f0, f1, pts, base) => {   // blue rock, hatched in ink toward the water
      const r = ridgeOf(k, pts);
      for (let x = X(f0); x < X(f1); x++) { const top = r(x), foot = S(base) - Math.round(hsh(Math.floor(x / 3) * 3.3) * S(1.6)); for (let y = top; y < foot; y++) { const q = (y - top) / Math.max(1, foot - top), v = hsh(Math.floor((x + y) / 3) * 2.1 + Math.floor(y / 2) * 7.7); cell(x, y, y - top < 1 || v < q * .55 ? P.outline : dither(x, y) < .25 + q * .4 ? P.navy : P.deep); } }
    };
    const trees = list => { for (const [f, y, r, c] of list) clump(k, X(f), S(y), S(r), c ? P.navy : P.pine, P.outline, c ? P.deep : P.leaf, f * 83 + y); };
    // the two little islands
    rock(.1, .25, [[.1, 67], [.14, 65], [.2, 64], [.25, 66]], 68.5); trees([[.09, 64, 3.4], [.11, 62, 4], [.13, 64, 3.6], [.15, 63, 3.4], [.18, 64, 3], [.21, 63.4, 3], [.23, 64, 2.4], [.085, 69, 2]]);
    rock(.33, .48, [[.33, 70], [.38, 68], [.42, 67], [.48, 70]], 73); trees([[.33, 69, 3.4], [.35, 68.6, 3.4], [.37, 69.4, 3], [.41, 69, 2.6, 1]]);
    // the big one: rock, a path up it, and tall trees standing on top
    rock(.452, .86, [[.452, 63], [.47, 58], [.5, 55], [.56, 56], [.6, 59], [.64, 56], [.7, 57], [.76, 59], [.82, 63], [.86, 68]], 73);
    rock(.48, .62, [[.48, 72], [.53, 70], [.62, 71]], 76.5);
    for (const [a, b, c, d] of [[.475, 57, .466, 44], [.5, 57, .5, 38], [.505, 57, .53, 38], [.55, 57, .553, 42], [.56, 58, .59, 46]]) for (let o = 0; o < 3; o++) line(X(a) + o, S(b), X(c) + o, S(d), o === 1 ? P.steel : P.outline);
    trees([[.425, 49, 4.6], [.455, 50, 4.6], [.44, 44, 5], [.415, 47, 3.6], [.47, 47, 4], [.48, 37, 5], [.495, 33.6, 4], [.5, 41, 4.4], [.53, 35, 5.4], [.55, 32, 4.4], [.545, 40, 4.6], [.568, 36, 3.6], [.58, 46, 5], [.59, 43, 4.4], [.6, 49, 4.6], [.56, 50, 4], [.6, 55, 4.6], [.63, 59, 5], [.6, 60, 4], [.66, 55, 5], [.69, 52, 5], [.71, 54, 4.6], [.67, 60, 4], [.7, 49.4, 3]]);
    for (const y of [56, 57.4, 59, 61]) for (let x = X(.74 + (y - 56) * .02); x < X(.92 - (y - 56) * .006); x++) for (let d = 0; d < 3; d++) cell(x, S(y) + d, d === 0 ? P.outline : P.deep);   // spits of land, far off
    trees([[.76, 61, 4], [.8, 63, 4], [.83, 63, 4], [.88, 62, 5], [.89, 60, 4], [.87, 67, 5], [.92, 67, 5], [.96, 64, 5], [.99, 66, 5.5], [.95, 71, 6], [1, 74, 6], [.9, 73, 5], [.97, 78, 5], [.64, 70, 6], [.66, 64, 5], [.68, 68, 6], [.72, 66, 5], [.75, 65, 5.4], [.66, 76, 6.4], [.7, 76, 6], [.74, 76, 5.4], [.78, 70, 6], [.82, 69, 5], [.77, 78, 5], [.64, 81, 4.6], [.67, 82, 4], [.8, 75, 4]]);
    for (const [f, y] of [[.72, 73], [.735, 71.6], [.755, 72.4], [.7, 81], [.72, 83], [.745, 84.5], [.765, 82]]) for (let r = 0; r < S(2.2); r++) { const h = S(1.9) * Math.sqrt(Math.min(1, (r + 1) / S(1.6))); for (let x = -h; x <= h; x++) cell(X(f) + x, S(y) + r, r < 1 || Math.abs(x) > h - 1.3 ? P.outline : P.foam); }   // the roofs of a village among them
    // the surf: long lines of it, hatched blue underneath
    for (let i = 0; i < 9; i++) { const y = 97.5 + i * 1.9, x0 = X(Math.max(0, .2 - i * .05)), x1 = X(.64 - i * .062); for (let x = x0; x < x1; x++) { const up = Math.round(Math.sin(x * .05 + i * 2) * s * .4), yy = S(y) + up; cell(x, yy, (x + i * 7) % 40 < 34 ? P.outline : P.deep); for (let d = 1; d < S(1.3); d++) cell(x, yy + d, (x + d * 2 + i * 3) % 5 === 0 ? P.deep : P.white); } }
    // the beach and the hill, green fading to bare paper at the bottom
    const land = ridgeOf(k, [[0, 117], [.08, 115], [.16, 113], [.23, 110], [.3, 107.5], [.4, 104.5], [.5, 102.6], [.58, 101.6], [.65, 99.5], [.7, 95], [.75, 88], [.78, 82], [.81, 75], [.84, 71.5], [.87, 71.5], [.895, 74.5], [.92, 79], [1, 81]]);
    for (let x = 0; x < cw; x++) for (let y = land(x); y < ch; y++) { const d = (y - land(x)) / s; cell(x, y, d < .5 ? P.outline : dither(x, y) < Math.max(0, (y / s - 104) / 15) ? P.foam : dither(x, y) < .45 ? P.leaf : P.teal); }
    for (const pts of [[[.75, 101], [.8, 91], [.83, 88], [.9, 89]], [[.88, 82], [.93, 84], [.97, 90], [1, 91]], [[.86, 92], [.92, 94], [.97, 94]]]) { const r = ridgeOf(k, pts); for (let x = X(pts[0][0]); x < X(pts[pts.length - 1][0]); x++) { cell(x, r(x), P.outline); for (let d = 1; d < S(4); d++) if (dither(x, r(x) + d) < .6 * (1 - d / S(4))) cell(x, r(x) + d, P.pine); } }
    trees([[.685, 93, 3.4, 1], [.675, 96, 2.6, 1], [.71, 90, 3], [.6, 98.5, 3.2], [.63, 100, 2.4, 1], [.55, 101.6, 3], [.36, 104.6, 2.8], [.33, 105.4, 3.2], [.3, 107.4, 2.6], [.2, 111.4, 2.4], [.18, 112.6, 2]]);
    trees([[.77, 92.5, 2.6], [.84, 81, 1.8, 1], [.87, 80, 2, 1], [.88, 83, 1.8], [.95, 83, 1.6], [.97, 87, 2], [.85, 87, 2.2, 1], [.89, 88, 2], [.83, 96, 2.2, 1], [.79, 98, 1.8, 1], [.74, 98, 2, 1], [.745, 103, 2.2, 1], [.8, 103, 2.4, 1], [.835, 101, 2, 1], [.76, 107, 2.2, 1], [.7, 110, 2.4, 1], [.73, 111.6, 1.6, 1], [.8, 108.6, 2, 1], [.87, 106, 2.2, 1], [.91, 103, 2, 1], [.935, 100, 2, 1], [.95, 106, 2.2, 1], [.99, 108, 2, 1], [.84, 110, 3.4], [.88, 114.6, 2.6]]);
    for (let i = 0; i < 130; i++) { const f = .25 + hsh(i * 1.9) * .75, y = S(104 + hsh(i * 3.1) * 12); if (y > land(X(f)) + S(2)) { cell(X(f), y, P.outline); cell(X(f) + 1, y, P.outline); } }   // specks of scrub
  }, live: (k, t) => {   // the surf running up the beach
    const { cw, s, S, cell } = k;
    for (let i = 0; i < 9; i++) { const n = S(7), x = Math.round(cw * (.02 + hsh(i * 3.1) * .4)) - Math.round(((t * 5 + i * 2.3) % 6) * s), y = S(97.5 + i * 1.9); for (let j = 0; j < n; j++) if (x + j < cw * (.62 - i * .062)) { const up = Math.round(Math.sin((x + j) * .05 + i * 2) * s * .4); cell(x + j, y + up - 1, P.white); cell(x + j, y + up, P.white); } }
  } },
  { title: 'MISHIMA PASS IN KAI PROVINCE', draw: (k) => {
    // A giant cedar, so tall the print can't hold it, in the middle of the pass; heaps of white cloud
    // boiling up round the foot of Fuji, which is dark blue with a cloud for a hat; green hills.
    // (The print has travellers linking arms round the trunk to measure it. They've gone home.)
    const { cw, ch, s, S, cell, line, bands } = k, X = f => Math.round(cw * f);
    bands([[5, P.navy], [8, P.deep], [11, P.pale], [50, P.foam], [62, P.pale], [74, P.teal], [999, P.teal]]);
    // Fuji: navy, down through blue to nothing, its broad foot coming out of the mist grey-brown
    const f0 = ridgeOf(k, [[.18, 94.5], [.26, 89], [.34, 82], [.42, 73.5], [.5, 65], [.56, 57], [.625, 48.5], [.67, 42], [.7, 35.5], [.725, 31.5], [.745, 32], [.765, 37.5], [.8, 45.5], [.84, 53], [.87, 58], [.9, 62], [1, 68]]);
    for (let x = X(.18); x < cw; x++) for (let y = f0(x); y < S(112); y++) {
      const r = y / s, v = dither(x, y);
      const c = r < 56 ? (v < (r - 40) / 8 ? (v < (r - 48) / 4 ? (v < (r - 52) / 4 ? P.foam : P.pale) : P.deep) : P.navy) : v < (r - 64) / 10 ? (v < (r - 72) / 9 ? (v < (r - 79) / 10 ? P.rosewood : P.bark) : P.grey1) : P.foam;
      const brown = c === P.rosewood ? (dither(x + 2, y + 1) < .6 ? P.brown : P.mauve) : c;
      cell(x, y, y - f0(x) < (r < 60 ? 1 : 2) ? P.outline : r > 38 && r < 62 && hsh(Math.floor(x / 2) * 1.9 + Math.floor(y / 3) * 7.3) < .03 * (1 - Math.abs(x / cw - .725) * 9) ? P.outline : brown);
    }
    const puffs = list => billow(k, list, P.foam, P.outline);
    puffs([[.18, 90, 3.6], [.17, 93, 2.4], [.21, 92, 3], [.24, 91, 3], [.19, 85, 3.8], [.21, 83, 3], [.2, 78, 3.6], [.23, 75, 4], [.215, 73.4, 3.2], [.24, 79, 4], [.25, 85, 4], [.27, 76, 3.8], [.285, 79, 3.4], [.27, 83, 3.6], [.295, 85, 2.6], [.34, 78, 3.2], [.36, 76.6, 3], [.38, 77, 2.2]]);
    puffs([[.29, 65, 3.4], [.31, 63, 4], [.34, 63, 4.4], [.35, 61, 3.4], [.38, 65, 4], [.32, 68, 4], [.36, 69, 4.4], [.39, 69, 3], [.4, 72, 2.8], [.43, 70.4, 2.6], [.45, 69.4, 2]]);
    puffs([[.77, 61, 4], [.785, 59, 3.4], [.81, 62, 4], [.8, 67, 4.4], [.84, 62, 4], [.85, 66, 4], [.83, 70, 4.4], [.86, 70, 3.4], [.83, 75, 3], [.86, 74, 3]]);
    puffs([[.87, 52, 3.8], [.9, 50, 4], [.925, 49.6, 4.2], [.95, 53, 4], [.965, 55, 3], [.88, 56, 3.6], [.92, 57, 4.4], [.95, 59, 3.6], [.9, 61, 3.4], [.98, 60, 3], [.88, 65, 3], [.92, 64, 3]]);
    puffs([[.745, 78, 2.8], [.755, 75, 2.4], [.75, 82, 3], [.765, 79, 2.6], [.76, 85, 2]]);
    for (const [dy, f1] of [[0, 1], [1.8, 1], [3.6, 1]]) for (let x = X(.8); x < X(f1); x++) { const y = S(24.5 + dy + Math.sin((x / cw - .8) * 26) * 1.7 - (x / cw - .8) * 8); for (let d = 1; d < S(1.8); d++) cell(x, y + d, P.foam); cell(x, y, P.outline); cell(x, y + 1, P.outline); }   // the cloud trailing off in the wind
    puffs([[.7, 25.5, 2.4], [.72, 24.6, 2.4], [.755, 24.4, 2.8], [.78, 24, 2.8], [.8, 25.4, 2.6], [.82, 27, 2.4], [.84, 28, 1.8], [.68, 31, 3], [.665, 33, 2.2], [.7, 30, 3], [.73, 29.6, 3.4], [.755, 31, 2.8], [.69, 34, 2.4], [.77, 34.6, 2.6], [.745, 37, 2.8], [.725, 37, 2.2], [.76, 38, 2]]);
    // the green hills
    const grass = (pts, col) => { const r = ridgeOf(k, pts); for (let x = X(pts[0][0]); x < X(pts[pts.length - 1][0]); x++) for (let y = r(x); y < ch; y++) { const d = (y - r(x)) / s; cell(x, y, d < .5 ? P.outline : col(x, y, d)); } };
    const green = fade => (x, y, d) => (dither(x, y) < (d - 4) / fade ? P.foam : dither(x + 1, y + 3) < .4 + (d - 2) / fade ? P.grass : P.leaf);
    grass([[0, 85], [.06, 85.6], [.11, 88.4], [.18, 94], [.24, 96.6], [.32, 99], [.4, 101], [.51, 102]], green(24));
    grass([[.83, 78], [.87, 71], [.91, 66.6], [.95, 64], [1.01, 62]], green(30)); grass([[.87, 86], [.9, 81], [.94, 78], [1.01, 74]], green(26));
    const bush = list => { for (const [f, y, r] of list) clump(k, X(f), S(y), S(r), P.pine, P.outline, P.leaf, f * 71 + y); };
    bush([[.78, 80, 4], [.8, 76.6, 3.6], [.83, 82, 4], [.86, 84, 4.6], [.82, 86, 4], [.88, 88, 4.6], [.91, 92, 5], [.93, 96, 4.6], [.97, 99, 4], [.71, 90, 4], [.73, 86.6, 3], [.69, 95, 4.4], [.67, 99, 4], [.28, 97, 2.6], [.32, 96, 3.2], [.36, 93, 4.4], [.39, 96, 4.6], [.34, 91, 3], [.43, 94, 4.4], [.47, 92, 4.6], [.46, 87, 3.6], [.49, 86, 4.4], [.42, 99, 4], [.48, 98, 4.4]]);
    grass([[.695, 104], [.715, 97], [.745, 90], [.775, 86.6], [.81, 86], [.85, 89], [.885, 94], [.91, 99], [.925, 104]], green(22));
    grass([[.36, 108], [.39, 103.4], [.43, 100.8], [.48, 100], [.53, 101], [.58, 104]], green(18));
    for (let i = 0; i < 190; i++) { const zone = [[.08, .34, 98, 12], [.74, .9, 91, 14], [.9, 1, 68, 8], [.92, 1, 80, 12]][i % 4], f = zone[0] + hsh(i * 2.9) * (zone[1] - zone[0]), y = zone[2] + hsh(i * 5.3) * zone[3]; for (let j = 0; j < 3; j++) cell(X(f) + j, S(y) + (j >> 1), P.outline); }   // tufts of grass
    // the path, bare paper
    const path = ridgeOf(k, [[0, 110], [.3, 108], [.4, 111], [.55, 114], [.65, 108.5], [.72, 109.5], [.8, 110.4], [.88, 109], [.93, 105], [1, 103]]);
    for (let x = 0; x < cw; x++) for (let y = path(x); y < ch; y++) cell(x, y, x / cw > .62 && y - path(x) < 1 ? P.outline : dither(x, y) < .15 ? P.sky : P.foam);
    bush([[.71, 104, 2.4], [.9, 104, 2.6], [.87, 107, 2], [.44, 111, 2.4], [.4, 108, 2.4]]);
    // the cedar: its bark ridged and furrowed, straight up out of the picture
    const edge = (y, seed) => Math.round((hsh(Math.floor(y / S(1.4)) * 2.7 + seed) - .5) * S(.9));
    for (let y = 0; y < S(116); y++) {
      const q = y / s / 116, flare = Math.max(0, q - .82) ** 2 * 1.1, l = X(.512 - flare * .35 - .004 * q) + edge(y, 1), r = X(.613 + .03 * q ** 2 + flare * .5) + edge(y, 9);
      for (let x = l; x <= r; x++) {
        const u = (x - l) / (r - l), wob = Math.sin(y * .045 + Math.floor(u * 9) * 1.9) * .016 + Math.sin(y * .013) * .01, lane = (u + wob) * 8.5, at = lane - Math.floor(lane), dark = hsh(Math.floor(lane) * 3.3 + Math.floor(y / S(4.5)) * 1.7);
        const gone = y > S(110) && hsh(Math.floor(x / 4) * 3.1) * S(7) < y - S(109);   // (its roots, ragged)
        if (gone) continue;
        cell(x, y, x - l < 2 || r - x < 2 ? P.outline : at < (dark < .5 ? .3 : .1) && hsh(x * .9 + y * 2.1) < .85 ? P.outline : dark > .86 && at > .4 && at < .7 && hsh(Math.floor(y / 3) * 1.1 + x) < .6 ? P.pine : dither(x, y) < (u < .2 ? .15 : .45) + u * .2 ? P.leaf : P.teal);
      }
    }
    // its lowest branches: one long one reaching out to the left, dark sprays of leaves hanging from them
    const limb = pts => { for (let i = 1; i < pts.length; i++) { const [a, b] = pts[i - 1], [c, d] = pts[i], w = Math.max(1, S(1.1 - i * .15)); for (let o = -1; o <= w; o++) line(X(a), S(b) + o, X(c), S(d) + o, o < 0 || o === w ? P.outline : P.leaf); } };
    limb([[.5, -3], [.44, 3], [.4, 10], [.36, 17], [.32, 23], [.28, 29], [.21, 33]]); limb([[.36, 17], [.31, 20], [.25, 20]]); limb([[.29, 28], [.275, 34], [.262, 40]]); limb([[.43, 6], [.45, 14], [.46, 22]]);
    const spray = list => { for (const [f, y, r] of list) { clump(k, X(f), S(y), S(r), P.pine, P.outline, P.leaf, f * 103 + y); for (let i = 0; i < 4; i++) clump(k, X(f) + S((hsh(f * 37 + i) - .5) * r * 2.2), S(y + (hsh(y * 7 + i) - .3) * r * 1.4), S(r * .5), P.pine, P.outline, P.grass, f * 17 + i); } };
    spray([[.39, 2, 4.6], [.43, 4, 5], [.46, 8, 4.6], [.48, 3, 5], [.49, 12, 4], [.46, 15, 4], [.43, 14, 3.4], [.47, 21, 3], [.45, 24, 2.4], [.4, 4, 4], [.34, 13, 2.8], [.365, 12, 2.6], [.37, 21, 3], [.39, 18, 2.6], [.26, 18, 2.8], [.285, 18.6, 2.2], [.235, 22, 2.6], [.25, 25, 2], [.22, 30, 2.6], [.205, 34, 2.6], [.23, 35.4, 2], [.285, 28, 2.4], [.3, 26, 2], [.285, 35, 2.4], [.265, 38, 2.2], [.255, 41, 1.8], [.5, 7, 4], [.5, 17, 2.6]]);
    spray([[.56, 1, 5], [.6, 3, 4.6], [.63, 6, 4.6], [.625, 13, 3], [.65, 3, 4.6], [.68, 2, 4.4], [.71, 4, 4.4], [.7, 10, 3.2], [.715, 15, 2.8], [.68, 12, 2], [.74, 4, 3.4], [.75, 9, 2], [.53, 4, 4.4], [.515, 10, 3]]);
  }, live: (k, t) => {   // needles drifting down from the cedar, and a puff of cloud trailing off Fuji's hat
    const { cw, s, S, cell } = k;
    for (let i = 0; i < 12; i++) { const p = (t * .22 + hsh(i * 3.7)) % 1, x = Math.round(cw * (.24 + hsh(i * 2.3) * .46) + Math.sin(t * 2 + i) * 2 * s - p * 5 * s), y = S(16 + hsh(i * 5.1) * 8 + p * 80); cell(x, y, P.pine); cell(x + 1, y, P.pine); cell(x + 1, y + 1, P.leaf); }
    for (let i = 0; i < 3; i++) { const p = (t * .25 + i / 3) % 1, x = cw * (.82 + p * .18), r = s * 1.3 * (1 - p * .6); for (let y = -r; y <= r; y++) for (let d = -r * 1.8; d <= r * 1.8; d++) if ((d / 1.8) ** 2 + y * y <= r * r) cell(x + d, S(27 + Math.sin(p * 6) * 1.2 - p * 1.5) + y, P.foam); }
  } },
  { title: 'THE INUME PASS IN KAI PROVINCE', draw: (k) => {
    // A green hill sweeping up to the right over a sea of white mist, travellers and their packhorses
    // strung along its ridge. Across the mist stands Fuji, brown, black under its snow, in front of a
    // yellow evening sky; dark woods rise out of the mist between.
    const { cw, ch, s, S, cell, line, bands, fuji } = k, X = f => Math.round(cw * f);
    bands([[3, P.navy], [6, P.deep], [9, P.pale], [30, P.foam], [47, P.gold], [52, P.foam], [60, P.gold], [999, P.foam]]);
    for (let i = 0; i < 22; i++) {   // streaks of paper-white cloud across the yellow
      const y = S(34 + hsh(i * 2.3) * 24), x0 = X((hsh(i * 5.1) < .5 ? 0 : .58) + hsh(i * 7.7) * .12), n = X(.14 + hsh(i * 1.3) * .2);
      for (let j = 0; j < n; j++) for (let d = 0; d < Math.max(1, Math.round(s * .8 * Math.sin(Math.PI * j / n))); d++) cell(x0 + j, y + d, P.white);
    }
    fuji(X(.345), S(26), S(50), [S(78), S(96)], 'inume');
    const woods = (x0, x1, y, h, r, inside, edge, fleck, seed) => { const n = Math.round((X(x1) - X(x0)) / S(r * .9)); for (let j = 0; j < 2; j++) for (let i = 0; i <= n; i++) clump(k, X(x0) + (X(x1) - X(x0)) * i / n, S(y + j * h * .5 - Math.sin(Math.PI * i / n) * h), S(r * (.8 + hsh(seed + i * 1.7 + j) * .4)), inside, edge, fleck, seed + i * 2.3 + j * 9); };
    woods(-.02, .16, 63, 6, 4.5, P.navy, P.outline, P.deep, 2);
    woods(-.02, .28, 72, 5, 5.5, P.pine, P.abyss, P.leaf, 12);
    // the mist: paper white, its top edge lobed like cloud, higher in the middle
    const top = x => { const f = x / cw; return S(76 - 13 * Math.exp(-(((f - .56) / .13) ** 2)) - Math.abs(Math.sin(f * 46)) * 1.6 - Math.abs(Math.sin(f * 19 + 1)) * 2); };
    for (let x = 0; x < cw; x++) for (let y = top(x); y < ch; y++) cell(x, y, P.foam);
    // the tall trees standing in it
    const trunk = (a, b, c, d, w) => { for (let o = 0; o < S(w); o++) line(X(a) + o, S(b), X(c) + o, S(d), P.outline); };
    trunk(.475, 78, .465, 56, 1); trunk(.485, 66, .53, 51, 1); trunk(.56, 74, .57, 60, 1); trunk(.49, 80, .48, 64, 1);
    for (const [f, y, r] of [[.43, 53, 6.5], [.465, 56, 5], [.44, 50, 4], [.53, 46, 6.5], [.57, 50, 6], [.505, 49, 4.5], [.55, 61, 6.5], [.6, 64, 6], [.64, 64, 5], [.57, 67, 5.5], [.49, 66, 5], [.47, 70, 6], [.6, 70, 5]]) clump(k, X(f), S(y), S(r), P.pine, P.abyss, P.leaf, f * 31 + y);
    for (const [f, y, r] of [[.39, 83, 7], [.43, 79, 7], [.47, 78, 6], [.52, 74, 7], [.57, 72, 7], [.62, 71, 6], [.46, 85, 7], [.41, 93, 7], [.46, 92, 6], [.51, 88, 6], [.5, 81, 7], [.56, 78, 6]]) clump(k, X(f), S(y), S(r), P.navy, P.outline, P.deep, f * 53 + y);
    // the hill
    const RIDGE = [[0, 103], [.13, 102.5], [.25, 100], [.39, 96], [.5, 90], [.6, 81], [.7, 70], [.78, 60], [.85, 48], [.92, 38], [1, 32]];
    const ridge = x => { const f = x / cw; let i = 1; while (i < RIDGE.length - 1 && RIDGE[i][0] < f) i++; const [f0, y0] = RIDGE[i - 1], [f1, y1] = RIDGE[i]; return S(y0 + (y1 - y0) * (f - f0) / (f1 - f0)); };
    for (let x = 0; x < cw; x++) { const r0 = ridge(x), f = x / cw, deep = 9 + 13 * f; for (let y = r0; y < ch; y++) {
      const d = (y - r0) / s, q = (d - 2) / deep;
      cell(x, y, d < .5 && f > .3 ? P.outline : dither(x, y) < q ? P.foam : d < 3 || dither(x + 2, y + 1) < .45 ? P.leaf : P.grass);
    } }
    const fold = (f0, y0, f1, y1, sag) => { const a = X(f0), b = X(f1), n = b - a; for (let i = 0; i < n; i++) { const q = i / n, y = S(y0 + (y1 - y0) * q * q + sag * Math.sin(Math.PI * q)); cell(a + i, y, P.outline); if (q > .4) cell(a + i, y + 1, P.outline); for (let d = 2; d < S(7); d++) if (dither(a + i, y - d) < .55 * (1 - d / S(7)) * (1 - q * .7)) cell(a + i, y - d, P.grass); } };
    fold(.62, 82, .9, 100, -5); fold(.7, 74, .94, 82, -4); fold(.78, 66, .96, 78, -4); fold(.46, 94, .66, 102, -2); fold(.86, 54, 1, 58, -4);
    for (let i = 0; i < 260; i++) {   // tufts of grass
      const f = .22 + hsh(i * 1.37) * .78, x = X(f), y = ridge(x) + S(5 + hsh(i * 3.71) * (6 + 22 * f));
      if (y < S(112)) { const n = 1 + Math.round(hsh(i * 9.1) * 2); for (let j = 0; j < n; j++) { cell(x + j, y, P.outline); if (j < n - 1) cell(x + j, y - 1, P.pine); } }
    }
    for (const [f, y, r] of [[.65, 91, 5], [.69, 95, 5.5], [.73, 94, 4.5], [.67, 101, 5], [.7, 104, 5], [.61, 107, 4.5], [.65, 108, 5], [.87, 70, 5], [.9, 75, 6], [.92, 66, 5], [.95, 62, 5.5], [.98, 56, 5], [.96, 70, 6], [1, 66, 6], [.86, 88, 5.5], [.9, 92, 6], [.95, 86, 7], [1, 90, 8], [.94, 97, 7], [.98, 102, 8], [.83, 103, 6], [.78, 106, 5], [.87, 106, 6]]) clump(k, X(f), S(y), S(r), P.navy, P.outline, P.deep, f * 67 + y);
    for (let y = S(96); y < S(113); y++) for (let x = X(.88); x < cw; x++) { const q = Math.min(1, (x / cw - .88) * 9) * (1 - Math.abs(y / s - 104) / 9); if (dither(x, y) < q * .7) cell(x, y, dither(x + 1, y + 1) < .5 ? P.deep : P.steel); }   // the valley, deep blue
    drawFigure(cell, X(.83), ridge(X(.835)) + S(.5), 'walker'); drawFigure(cell, X(.805), ridge(X(.81)) + S(.5), 'walker');
  }, live: (k, t) => {   // the travellers and their horses, plodding up the hill
    const { cw, s, S, cell } = k, f = t * .006, at = q => S(103 - (q < .25 ? Math.max(0, q - .1) * 20 : 3 + (q - .25) * 28));
    for (const [q, kind] of [[.13, 'horse'], [.2, 'horse'], [.285, 'walker'], [.32, 'walker']]) drawFigure(cell, Math.round(cw * (q + f)), at(q + f) + (Math.sin(t * 9 + q * 40) > .3 ? -1 : 0), kind);
  } },
  { title: 'UMEZAWA IN SAGAMI PROVINCE', draw: (k) => {
    // Cranes feeding in a pool at first light, two more flying off; green hills in folds, and Fuji dark
    // blue behind, paper-coloured cloud lying over it all in long lobes.
    const { cw, ch, s, S, cell, bands } = k, X = f => Math.round(cw * f);
    bands([[3, P.navy], [6, P.deep], [9, P.pale], [26, P.foam], [40, P.pale], [52, P.steel], [999, P.sea]]);
    for (let r = 0; r < S(54); r++) {   // Fuji: white at the top, down through blue to navy, its woods flecked in ink
      const q = r / S(54), l = S(2 + 116 * q ** 1.12), w = S(2 + 88 * q ** 1.1), cx = X(.695);
      for (let x = -l - Math.round(hsh(r * 1.7) * 2); x <= w + Math.round(hsh(r * 2.9) * 2); x++) {
        const d = q + (hsh(Math.floor(x / 5) * 3.1) - .5) * .05, fl = hsh(Math.floor((cx + x) / 2) * 1.9 + Math.floor(r / 2) * 8.3);
        cell(cx + x, S(13) + r, r === 0 || x <= -l || x >= w ? P.outline : d > .2 && fl < .05 + d * .12 ? P.outline : dither(x + 512, r) < (d - .1) / .2 ? (dither(x + 512, r + 1) < (d - .32) / .3 ? P.navy : P.deep) : dither(x + 512, r) < (d - .04) / .16 ? P.steel : P.white);
      }
    }
    const green = (x, y) => (hsh(Math.floor(x / 2) * 2.3 + Math.floor(y / 2) * 6.1) < .07 ? P.pine : dither(x, y) < .5 + .25 * Math.sin(y / s * .5) ? P.teal : P.leaf);
    const hill = (f, y, rx, ry, col = green) => dome(k, X(f), S(y), cw * rx, S(ry), col);
    const cloud = (f0, f1, y0, y1, round) => lobes(k, X(f0), X(f1), S(y0), S(y1), round, (x, y) => (dither(x, y) < .5 ? P.foam : P.sky));
    hill(.75, 60, .13, 25); hill(.64, 66, .16, 16); hill(.4, 72, .2, 13); hill(.16, 72, .13, 10); hill(.83, 70, .14, 14);
    for (let x = X(.02); x < X(.9); x++) for (let y = S(68); y < S(74); y++) cell(x, y, green(x, y));
    cloud(.85, 1, 26, 40, 'l'); cloud(.8, 1, 39, 52, 'l'); cloud(.52, 1, 57, 66, 'l'); cloud(.7, 1, 63, 74, 'l'); cloud(0, .27, 29, 40, 'r'); cloud(0, .42, 38, 50, 'r'); cloud(0, .16, 48, 62, 'r');
    cloud(0, .86, 69, 80, 'r'); cloud(0, .28, 62, 72, 'r'); cloud(.74, 1, 72, 84, 'l');
    // the near hills, a stream winding between them
    for (let y = S(78); y < ch; y++) for (let x = 0; x < cw; x++) cell(x, y, y < S(90) ? green(x, y) : dither(x, y) < .25 ? P.deep : P.navy);
    for (const [f, y, r] of [[.04, 80, 5], [.1, 77, 5], [.14, 81, 4], [.44, 81, 4], [.4, 84, 4]]) clump(k, X(f), S(y), S(r), P.pine, P.outline, P.leaf, f * 47);
    for (const [f, y, r] of [[.53, 79, 5.5], [.48, 83, 4.5], [.73, 76, 5], [.79, 79, 6], [.72, 83, 4.5], [.95, 87, 6.5], [.9, 81, 5]]) clump(k, X(f), S(y), S(r), P.navy, P.outline, P.deep, f * 61);
    hill(.05, 94, .12, 14); hill(.25, 96, .12, 12); hill(.66, 92, .14, 18); hill(.55, 94, .12, 12); hill(.84, 96, .15, 14); hill(.97, 100, .1, 12); hill(.74, 98, .1, 10);
    for (const [f, y, r] of [[.67, 82, 4], [.56, 86, 3.6], [.7, 92, 4], [.82, 90, 4], [.14, 89, 4], [.3, 88, 3.4]]) clump(k, X(f), S(y), S(r), P.pine, P.outline, P.leaf, f * 83);
    lobes(k, 0, X(.585), S(94), S(110), 'r', (x, y) => (dither(x, y) < .35 ? P.steel : P.sea)); lobes(k, 0, X(.46), S(101), S(116), 'r', (x, y) => (dither(x, y) < .3 ? P.sea : P.steel));
    hill(.64, 106, .11, 6); hill(.86, 104, .16, 9); hill(.74, 108, .09, 6);
    cloud(.72, 1, 104, 124, 'l'); cloud(.38, 1, 112, 126, 'l'); cloud(-.1, .42, 115, 128, 'r');
    for (const [f, y, pose, flip] of [[.29, 104, 'up', true], [.12, 108, 'up', false], [.2, 112, 'down', false], [.4, 112, 'down', true]]) crane(k, X(f), S(y), S(1.15), flip, pose);
  }, live: (k, t) => {   // two cranes, flying off
    const { cw, S } = k;
    for (const [f, y, d] of [[.34, 36, 0], [.41, 30, 1.3]]) crane(k, Math.round(cw * (f + t * .03)), S(y) - Math.round(S(2) * t * .5), S(.8), false, 'fly', Math.sin(t * 7 + d));
  } },
  { title: 'LAKE SUWA IN SHINANO PROVINCE', draw: (k) => {
    // Two old pines, black against the dawn, growing from a blue knoll with an empty thatched hut;
    // behind them a wide pale lake, low blue mountains all round it, and Fuji tiny between them.
    const { cw, ch, s, S, cell, bands } = k, X = f => Math.round(cw * f);
    bands([[2.5, P.navy], [6, P.deep], [10, P.pale], [35, P.foam], [39, P.pink], [44, P.skin], [47, P.foam], [999, P.foam]], 0, S(56));
    for (let i = 0; i < 14; i++) { const y = S(36 + hsh(i * 3.1) * 11), x0 = X(hsh(i * 4.7) * .7), n = X(.15 + hsh(i) * .3); for (let j = 0; j < n; j++) cell(x0 + j, y, P.white); }
    for (let y = S(54); y < ch; y++) for (let x = 0; x < cw; x++) {   // the lake, deepening toward us
      const q = (y / s - 58) / 50; cell(x, y, dither(x, y) < q * 1.3 - .7 ? P.sea : dither(x, y) < q * 1.6 - .25 ? P.steel : dither(x, y) < q * 1.8 + .1 ? P.pale : P.foam);
    }
    const peaks = (pts, base, colour) => { for (let x = X(pts[0][0]); x < X(pts[pts.length - 1][0]); x++) { const f = x / cw; let i = 1; while (i < pts.length - 1 && pts[i][0] < f) i++; const [f0, y0] = pts[i - 1], [f1, y1] = pts[i], top = S(y0 + (y1 - y0) * (f - f0) / (f1 - f0)); for (let y = top; y < S(base); y++) cell(x, y, y - top < 2 ? P.outline : colour(x, y, y - top)); } };
    const blue = (x, y, d) => (hsh(Math.floor(x / 2) * 2.7 + Math.floor(y / 2) * 5.9) < .05 ? P.outline : dither(x, y) < d / S(9) ? P.steel : P.deep);
    peaks([[.28, 54], [.31, 47.5], [.325, 45], [.335, 45], [.35, 48], [.385, 54]], 55, (x, y, d) => (d < S(4) ? P.white : P.leaf));   // Fuji, far off
    peaks([[0, 49], [.05, 50], [.1, 48], [.14, 44], [.165, 41], [.18, 43], [.21, 41.5], [.235, 46], [.28, 49], [.34, 52], [.42, 53], [.5, 55]], 55.5, blue);
    peaks([[.5, 55], [.6, 54], [.68, 51], [.73, 48], [.77, 51], [.85, 49.5], [.92, 45], [.95, 43.5], [1, 43]], 55.5, blue);
    const wood = (x, y) => (hsh(Math.floor(x / 2) * 1.7 + Math.floor(y / 2) * 4.9) < .2 ? P.pine : P.leaf);
    dome(k, X(.04), S(62), cw * .16, S(9), wood); dome(k, X(.2), S(63), cw * .15, S(6), wood); dome(k, X(.02), S(76), cw * .14, S(8), wood);
    for (const [f, y] of [[.06, 58], [.085, 58.4], [.11, 58], [.13, 59], [.03, 69], [.055, 70]]) for (let r = 0; r < S(2); r++) for (let x = -S(1) - r; x <= S(1) + r; x++) cell(X(f) + x, S(y) + r, r ? P.rose : P.outline);   // the roofs of a village
    // the dark shore on the right
    for (let y = S(52); y < S(98); y++) { const q = (y / s - 52) / 46, edge = X(.955 - .19 * Math.min(1, q * 1.35) ** 1.3 + Math.max(0, q - .74) * .9) + Math.round((hsh(Math.floor(y / 3) * 3.3) - .5) * S(2)); for (let x = edge; x < cw; x++) cell(x, y, x - edge < 2 ? P.outline : hsh(Math.floor(x / 3) * 2.1 + Math.floor(y / 2) * 7.3) < .05 + q * .5 * Math.max(0, 1 - (x - edge) / S(22)) ? P.outline : dither(x, y) < .5 ? P.navy : P.deep); }
    for (const [f, y, r] of [[.88, 64, 5], [.92, 58, 6], [.97, 53, 6], [.89, 59, 4]]) clump(k, X(f), S(y), S(r), P.leaf, P.pine, P.grass, f * 37);
    // the knoll
    for (const [f, y, r] of [[.43, 62, 7], [.49, 60, 7], [.47, 70, 8], [.41, 78, 7], [.44, 88, 7], [.385, 93, 6], [.36, 99, 5.5], [.4, 99, 5.5], [.46, 80, 7], [.46, 94, 7]]) clump(k, X(f), S(y), S(r), P.leaf, P.pine, P.pine, f * 91 + y);
    dome(k, X(.57), S(126), cw * .24, S(38), (x, y) => (hsh(Math.floor(x / 3) * 1.9 + Math.floor(y / 2) * 6.7) < .16 ? P.outline : dither(x, y) < Math.max(0, (y / s - 92) / 40) ? P.steel : dither(x, y) < .5 ? P.navy : P.deep));
    dome(k, X(.45), S(124), cw * .1, S(26), (x, y) => (hsh(Math.floor(x / 3) * 1.9 + Math.floor(y / 2) * 6.7) < .16 ? P.outline : dither(x, y) < .5 ? P.navy : P.deep));
    // the hut: straw walls, its thatch shaggy at the eaves
    for (let y = S(66); y < S(88); y++) for (let x = X(.555); x < Math.min(X(.65), X(.6 + .105 * (y / s - 61) / 24)); x++) cell(x, y, x % S(4.5) < 2 || y % S(7) < 1 ? P.rosewood : dither(x, y) < .3 ? P.ochre : P.gold);
    for (let r = 0; r < S(24); r++) { const q = r / S(24), a = X(.565 - .012 * q), b = X(.6 + .105 * q) + Math.round(hsh(r * 5.1) * S(1.5)); for (let x = r < S(12) ? X(.565 - .07 * q * 1.4) : a + X(.035 * q + .02); x < b; x++) { const low = r - S(17) - hsh(Math.floor(x / 2) * 3.1) * S(6); if (low > 0 && x < b - S(5)) continue; cell(X(0) + x, S(60) + r, x > b - 3 || r < 2 ? P.outline : hsh(Math.floor((x - r * .6) / 2) * 2.7) < .25 ? P.rosewood : dither(x, r) < .3 ? P.dawn : P.rose); } }
    for (const f of [.556, .648]) for (let y = S(80); y < S(92); y++) for (let d = 0; d < 3; d++) cell(X(f) + d, y, P.rosewood);
    // the pines
    const limb = (pts, w0, w1, pale = 0) => { for (let i = 1; i < pts.length; i++) { const [f0, y0] = pts[i - 1], [f1, y1] = pts[i], n = Math.max(Math.abs(X(f1) - X(f0)), S(Math.abs(y1 - y0)), 1); for (let j = 0; j <= n; j++) { const q = (i - 1 + j / n) / (pts.length - 1), w = S(w0 + (w1 - w0) * q), x = X(f0 + (f1 - f0) * j / n), y = S(y0 + (y1 - y0) * j / n), knob = Math.round((hsh(Math.floor(y / 4) * 3.7) - .5) * S(1)); for (let d = -w; d <= w; d++) cell(x + d + knob, y, Math.abs(d) >= w - 1 ? P.outline : y / s > pale && pale && hsh(d + y * .3) < .7 ? P.foam : hsh(Math.floor((x + d) / 2) * 2.1 + Math.floor(y / 2) * 3.9) < .45 ? P.outline : P.deep); } } };
    const needles = list => { for (const [f, y, r] of list) { clump(k, X(f), S(y), S(r), P.outline, P.outline, P.leaf, f * 101 + y); for (let i = 0; i < 7; i++) clump(k, X(f) + S((hsh(f * 31 + i) - .5) * r * 2.2), S(y + (hsh(y * 7 + i) - .5) * r * .9), S(r * .42), P.pine, P.outline, P.leaf, f * 13 + i); } };
    limb([[.51, 104], [.485, 88], [.455, 74], [.43, 60], [.405, 48], [.4, 38], [.375, 30], [.385, 20], [.4, 12]], 2.4, 1.3, 88);
    limb([[.395, 34], [.36, 29], [.325, 28], [.32, 22], [.285, 18]], 1.5, .9);
    limb([[.395, 14], [.43, 18], [.47, 22]], .9, .6);
    limb([[.54, 104], [.535, 84], [.53, 70], [.55, 54], [.58, 42], [.605, 31], [.64, 22], [.655, 13], [.67, 7]], 2.6, 1.2, 84);
    limb([[.61, 30], [.67, 29], [.73, 36], [.8, 40], [.86, 48]], 1.3, .7); limb([[.65, 14], [.7, 18], [.75, 22]], .9, .6); limb([[.62, 26], [.59, 22]], .9, .7);
    needles([[.28, 15, 5], [.33, 17, 4], [.31, 12, 3.6], [.36, 12, 4], [.4, 6, 5.5], [.44, 10, 4.6], [.46, 18, 4], [.42, 15, 3.4], [.67, 6, 6], [.72, 11, 4.5], [.76, 20, 4], [.7, 17, 3.6], [.6, 19, 4.4], [.63, 14, 4], [.66, 27, 4.4], [.7, 32, 4], [.76, 36, 4.6], [.82, 41, 4.6], [.86, 47, 3.6], [.79, 35, 3.4]]);
    // tussocks of pink grass along the front
    for (const [f, y, r] of [[.37, 119, 4.6], [.44, 120, 4.6], [.63, 112, 6], [.67, 118, 5.4], [.77, 112, 4.4], [.79, 119, 5], [.56, 119, 4], [.4, 113, 3.8]]) {
      for (let a = 0; a < 46; a++) { const th = Math.PI * (a / 45), n = S(r) * (.75 + hsh(a * 3.1 + f * 90) * .4); for (let j = 0; j < n; j++) cell(X(f) + Math.cos(th) * j * 1.25, S(y) - Math.sin(th) * j * .8, j > n - 2 ? P.rosewood : a % 3 ? P.rose : P.skin); }
    }
  }, live: (k, t) => {   // a small boat under sail, crossing the lake
    const { cw, s, S, cell } = k, x = Math.round(cw * (.17 + t * .018)), y = S(84) + Math.round(Math.sin(t * 2) * s * .4);
    for (let i = 0; i < S(20); i++) { const up = Math.round(S(2.6) * Math.abs(i / S(20) - .45) ** 1.6 * 2.6); for (let d = 0; d < S(2.2) - Math.abs(i / S(20) - .5) * S(2.4); d++) cell(x + i, y - up + d, d < 2 ? P.outline : P.deep); }
    for (let r = 0; r < S(6); r++) for (let i = 0; i < S(4.4); i++) cell(x + S(7.5) + i + Math.round(r * .12), y - S(6.4) + r, i < 1 || r < 1 ? P.outline : P.deep);
  } },
];
// The order they come in, one each fall: a different order on every level, and a different print first.
// (The two great close-ups of the mountain, Red Fuji and the Rainstorm, are kept apart.)
const CLOSE_UPS = ['FINE WIND, CLEAR MORNING', 'RAINSTORM BENEATH THE SUMMIT'];
const orders = new Map();
function orderFor(level) {
  if (!orders.has(level)) {
    const n = PRINTS.length, first = (level * 4 + n - 4) % n;   // (Level 1 starts with Red Fuji, the first in the list; each level after, with another)
    const rest = PRINTS.map((_, i) => i).filter(i => i !== first);
    for (let i = rest.length - 1; i > 0; i--) { const j = Math.floor(hsh(level * 17.3 + i * 5.9) * (i + 1)); [rest[i], rest[j]] = [rest[j], rest[i]]; }   // shuffled, the same way each time
    const order = [first, ...rest], close = i => CLOSE_UPS.includes(PRINTS[order[(i + n) % n]].title);
    for (let i = 0; i < n; i++) if (close(i) && close(i + 1)) { const a = i + 1 < n && i + 1 > 0 ? i + 1 : i, b = (a + 3) % n || 4; [order[a], order[b]] = [order[b], order[a]]; break; }   // side by side (the last comes round to the first): move one along
    orders.set(level, order);
  }
  return orders.get(level);
}

// A ridge line through points ([x as a fraction of the width, y in design rows]), smoothly, with no
// corners: gives the row it's at in each column.
function ridgeOf(k, pts) {
  return x => {
    const f = x / k.cw; let i = 1; while (i < pts.length - 1 && pts[i][0] < f) i++;
    const [f0, y0] = pts[i - 1], [f1, y1] = pts[i], q = Math.max(0, Math.min(1, (f - f0) / (f1 - f0))), m0 = (y1 - (pts[i - 2] || pts[i - 1])[1]) / (f1 - (pts[i - 2] || pts[i - 1])[0]) * (f1 - f0), m1 = ((pts[i + 1] || pts[i])[1] - y0) / ((pts[i + 1] || pts[i])[0] - f0) * (f1 - f0);
    return k.S(y0 * (1 + 2 * q) * (1 - q) ** 2 + m0 * q * (1 - q) ** 2 + y1 * q * q * (3 - 2 * q) + m1 * q * q * (q - 1));
  };
}
// Heaped-up cloud: overlapping puffs ([x as a fraction, y in design rows, radius]), drawn as one shape,
// its edge inked, with the top of each nearer puff drawn in over the ones behind.
function billow(k, list, inside, ink) {
  const { cw, s, S, cell } = k, P0 = list.map(([f, y, r]) => [cw * f, S(y), r * s * 1.32]), on = (x, y) => P0.some(([cx, cy, r]) => (x - cx) ** 2 + ((y - cy) * 1.12) ** 2 <= r * r);
  P0.forEach(([cx, cy, r]) => {
    for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) {
      const d = Math.sqrt((x - cx) ** 2 + ((y - cy) * 1.12) ** 2);
      if (d > r) continue;
      const out = !on(x - 1, y) || !on(x + 1, y) || !on(x, y - 1) || !on(x, y + 1), a = Math.atan2(y - cy, x - cx);
      cell(x, y, out || (d > r - 1.4 && a < -.5 && a > -2.2 - hsh(cx) * .7) ? ink : inside);
    }
  });
}
// A scrap of thin cloud: a flat lens, white, shaded along its foot. n: its length; h: its height.
function scrap(k, x0, y, n, h) {
  for (let j = 0; j < n; j++) { const q = j / n, t = Math.round(h * Math.sin(Math.PI * q) ** .7 * (.75 + .25 * Math.sin(j * .5 + y))); for (let d = 0; d <= t; d++) k.cell(x0 + j, y - d, d === 0 && q > .1 && q < .9 ? P.pale : P.white); }
}
// A rounded hill or lump of ground, edged in ink: col(x, y) colours it.
function dome(k, cx, cy, a, b, col) {
  for (let y = -b; y <= b * .55; y++) for (let x = Math.ceil(-a); x <= a; x++) {
    const q = (x / a) ** 2 + (y / b) ** 2;
    if (q <= 1) k.cell(cx + x, cy + y, y < 0 && (((Math.abs(x) + 1.4) / a) ** 2 + (y / b) ** 2 > 1 || (x / a) ** 2 + ((Math.abs(y) + 1.4) / b) ** 2 > 1) ? P.outline : col(Math.round(cx + x), cy + y));
  }
}
// A crane: cx, its middle; y, its feet (or body, flying); u, its size; pose 'up' (looking round), 'down'
// (feeding) or 'fly' (flap: -1..1, where its wings are).
function crane(k, cx, y, u, flip, pose, flap = 0) {
  const at = (x, yy, c) => k.cell(cx + (flip ? -x : x), y + yy, c);
  const stroke = (pts, w, c) => {   // a tapering curve through three points
    const [[x0, y0], [x1, y1], [x2, y2]] = pts, n = Math.ceil(u * 22);
    for (let i = 0; i <= n; i++) { const q = i / n, a = (1 - q) ** 2, b = 2 * q * (1 - q), d = q * q, r = Math.max(1, w[0] + (w[1] - w[0]) * q); for (let j = -r; j <= r; j++) for (let m = -r; m <= r; m++) if (j * j + m * m <= r * r) at((a * x0 + b * x1 + d * x2) * u + m, (a * y0 + b * y1 + d * y2) * u + j, c); }
  };
  const body = (bx, by, rx, ry) => { for (let j = -ry * u - 1; j <= ry * u + 1; j++) for (let i = -rx * u - 1; i <= rx * u + 1; i++) { const q = (i / (rx * u)) ** 2 + (j / (ry * u)) ** 2, o = (i / (rx * u + 1.4)) ** 2 + (j / (ry * u + 1.4)) ** 2; if (o <= 1) at(bx * u + i, by * u + j, q > 1 ? P.outline : (i + j * 2 + 300) % Math.round(u * 2.6) < 1 && i < 0 ? P.grey0 : P.white); } };
  const head = (hx, hy, dx, dy) => { stroke([[hx, hy], [hx + dx * 2, hy + dy * 2], [hx + dx * 4, hy + dy * 4]], [u * .45, 1], P.ochre); for (let j = -1.2 * u; j <= 1.2 * u; j++) for (let i = -1.3 * u; i <= 1.3 * u; i++) if (i * i + j * j < (1.25 * u) ** 2) at(hx * u + i, hy * u + j, j < -.3 * u && pose !== 'down' ? P.red : pose === 'down' && i > .2 * u ? P.red : P.outline); };
  if (pose === 'fly') {
    stroke([[-5, 0], [-9, .6], [-14, 1.4]], [1, 1], P.outline);
    stroke([[5, 0], [9, -.5], [13, -2]], [u * .7, u * .45], P.outline); head(13.4, -2.2, .9, -.25);
    for (const side of [.55, 1]) stroke([[-1, 0], [-2 * side, -5 * flap * side], [-7 * side, -9 * flap * side]], [u * 1.7, u * .5], side < 1 ? P.grey0 : P.white);
    body(0, 0, 6, 2); stroke([[-3, .4], [-5, .6], [-8, .2]], [u * .9, 1], P.outline);
    return;
  }
  for (const [lx, foot] of [[-1.4, -2.2], [1.6, 2.2]]) { stroke([[lx, -10], [lx + .5, -5], [foot, 0]], [1, 1], P.outline); for (const t of [-1.6, .2, 1.8]) stroke([[foot, 0], [foot + t * .5, .3], [foot + t, .6]], [1, 1], P.outline); }
  for (let i = 0; i < 5; i++) stroke([[-3, -14 + i * .5], [-7, -13 + i * .6], [-10.5 + i * .5, -9.5 + i * .9]], [u * .9, 1], i % 2 ? P.navy : P.outline);   // the tail's black plumes
  body(0, -13, 6.4, 3.8);
  const neck = pose === 'up' ? [[4.5, -14.5], [10, -17], [7.6, -23]] : [[5, -14.5], [12.5, -14], [10, -4.2]];
  stroke(neck, [u * 1.25, u * .65], P.outline);
  if (pose === 'up') { stroke([[8.6, -18.5], [8.7, -20], [8, -21.8]], [u * .3, u * .4], P.white); head(7.8, -23.4, 1, -.15); } else { stroke([[10.6, -9.5], [10.9, -7.5], [10.2, -5.6]], [u * .3, u * .35], P.white); head(9.8, -3.6, .25, .9); }
}
// A bank of cloud or water in lobes: three rounded tongues, one over another, ending on the side
// `round` says ('l' or 'r'), inked along their ends.
function lobes(k, x0, x1, y0, y1, round, col) {
  const at = new Set(), n = 3, h = (y1 - y0) / n, cells = [];
  for (let i = 0; i < n; i++) {
    const short = [.16, 0, .1][i] * (x1 - x0), a = round === 'l' ? x0 + short : x0, b = round === 'r' ? x1 - short : x1, r = h * .72, mid = y0 + h * (i + .5);
    for (let x = Math.round(a); x < b; x++) {
      const e = round === 'l' ? x - a : b - x, half = e < r * 3 ? r * Math.sqrt(Math.max(0, 1 - (1 - e / (r * 3)) ** 2)) : r;
      for (let y = Math.round(mid - half); y < mid + half; y++) { const id = x * 4096 + y; if (!at.has(id)) { at.add(id); cells.push([x, y]); } }
    }
  }
  for (const [x, y] of cells) k.cell(x, y, !at.has((x + (round === 'l' ? -1 : 1)) * 4096 + y) || !at.has(x * 4096 + y + 1) || !at.has(x * 4096 + y - 1) ? P.outline : col(x, y));
}

// A clump of foliage, after the prints: a cluster of round puffs drawn as one shape, its scalloped
// edge in a darker colour, the inside flat, with a few lighter flecks.
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

// Little figures, a few cells tall: a rower, a traveller under a straw hat, a packhorse. (Drawn here at double detail with Scale2x, or four times on
// the finest grids.)
const FIGURES = Object.fromEntries(Object.entries({
  walker: ['..YYY', '.YYYYY', '..KK.', '.nnK.', 'nnn..', '.nnn.', '.n.n.', 'K..K.'],
  // the Inume Pass: a packhorse, its load tied in green cloth over blue
  horse:  ['......bb..', '.gggg.wwww', 'ggggggwwww', 'wbbbbwww..', 'wwwwwwww..', 'w.w...w.w.'],
  // Tago Bay: a rower standing at the oar
  rower:  ['.YY.', '.KK.', 'SnnS', '.nn.', '.nn.', '.n.n'],
}).map(([k, rows]) => [k, scale2x(rows.map(r => r.padEnd(Math.max(...rows.map(q => q.length)), '.')))]));
const FIG_COL = { Y: P.ochre, K: P.outline, n: P.navy, R: P.red, S: P.skin, b: P.deep, g: P.leaf, W: P.white, w: P.wood };
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

// Draw the dawn for the n-th fall on a level at time t into it.
export function drawDawn(g, t, n, level = S.level.number) {
  const a = t < .5 ? t / .5 : t > 1.3 ? Math.max(0, 1 - (t - 1.3) / .4) : 1;
  if (a <= 0) return;
  const i = orderFor(level)[((n % PRINTS.length) + PRINTS.length) % PRINTS.length], print = PRINTS[i], k = canvas(g, t, a), img = still(i);
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
