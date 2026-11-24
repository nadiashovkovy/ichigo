// ============================================================================
// dawn.js — after a fall, a new tomorrow dawns as one of Hokusai's Thirty-six Views of Mount Fuji,
// a different print each fall (in turn), recreated cell by cell with the game's own palette:
//   Fine Wind, Clear Morning ("Red Fuji") · The Lake at Hakone · At Sea off Kazusa · Lake Suwa ·
//   Rainstorm Beneath the Summit · The Inume Pass · Umezawa · Tago Bay near Ejiri · Under Mannen Bridge
//   at Fukagawa · Reflection in Lake at Misaka
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
  { title: 'THE LAKE AT HAKONE IN SAGAMI PROVINCE', draw: (k) => {
    // The still lake in the mountains: a bare brown hill over yellow ones, cedars standing in clumps
    // round the shore, the blue roofs of the shrine, and Fuji small and white at the far end. Bands of
    // peach-coloured mist with rounded ends lie across everything, edged in ink.
    // (Positions: x as a fraction of the width, y in design rows, after the print.)
    const { cw, ch, s, S, cell, bands } = k, X = f => Math.round(cw * f);
    bands([[3, P.navy], [8, P.deep], [42, P.teal], [999, P.pale]], 0, S(70));
    // Fuji, white, with dark woods at its left foot
    for (let r = 0; r < S(17); r++) { const q = r / S(17), l = S(1.6 + 15 * q ** 1.15), w = S(1.6 + 19 * q ** 1.25); for (let x = -l; x <= w; x++) cell(X(.22) + x, S(38) + r, r === 0 || x === -l || x === w ? P.outline : P.white); }
    clump(k, X(.185), S(50), S(4), P.navy, P.outline, P.deep, 3.1); clump(k, X(.205), S(52.5), S(3), P.navy, P.outline, P.deep, 8.4);
    const slope = (pts, colour) => {   // a hill: its ridge through these points (smoothly), inked; colour(x, d, f): d cells down
      for (let x = X(pts[0][0]); x < X(pts[pts.length - 1][0]); x++) {
        const f = x / cw; let i = 1; while (i < pts.length - 1 && pts[i][0] < f) i++;
        const [f0, y0] = pts[i - 1], [f1, y1] = pts[i], q = (f - f0) / (f1 - f0);
        const ya = (pts[i - 2] || pts[i - 1])[1], yb = (pts[i + 1] || pts[i])[1];   // (a curve through the points, with no corners)
        const top = S(y0 + .5 * q * (y1 - ya + q * (2 * ya - 5 * y0 + 4 * y1 - yb + q * (3 * (y0 - y1) + yb - ya))));
        for (let y = top; y < S(70); y++) cell(x, y, y - top < S(.5) ? P.outline : colour(x, y, y - top));
      }
    };
    const yellow = (x, y) => (hsh(Math.floor(x / 2) * 1.7 + Math.floor(y / 2) * 9.1) < .035 ? P.pine : dither(x, y) < .35 ? P.grass : P.gold);
    slope([[0, 44.5], [.04, 43.5], [.1, 46], [.17, 51], [.2, 53.5], [.26, 53], [.3, 52], [.37, 56.5]], yellow);
    slope([[.33, 53], [.42, 48], [.5, 37], [.57, 25.5], [.63, 18.5], [.7, 14.5], [.78, 17], [.9, 22], [1, 24]], (x, y, d) =>
      (hsh(Math.floor(x / 3) * 3.3 + Math.floor(y / 3) * 7.7) < .02 ? P.outline : dither(x, y) < Math.min(1, Math.max(0, (y / s - 24 + (.62 - x / cw) * 40) / 22)) ? P.gold : d < S(5) ? P.wood : dither(x, y) < .4 ? P.wood : P.brown));
    slope([[.585, 44], [.62, 35], [.67, 31], [.72, 32.5], [.76, 40]], yellow);
    slope([[.72, 31], [.77, 26.5], [.85, 25], [.9, 29], [1, 31]], yellow);
    // a cedar: a tall narrow tree, its branches sweeping down in a ragged edge
    const cedar = (f, bottom, tall, wide, dark) => {
      const cx = X(f), h = S(tall), w = S(wide);
      for (let r = 0; r < h; r++) {
        const q = r / h, saw = 1 - ((r % S(3)) / S(3)) * .35, half = Math.max(0, Math.round(w * q ** .75 * (.65 + .35 * saw)));
        for (let x = -half; x <= half; x++) {
          const v = hsh(Math.floor((cx + x) / 2) * 3.1 + Math.floor((r + Math.abs(x)) / 3) * 5.7);
          cell(cx + x, S(bottom) - h + r, Math.abs(x) === half ? P.pine : v < (dark ? .5 : .26) + (dark ? .4 : .1) * (1 - q) ? P.pine : v > .9 && !dark ? P.grass : P.leaf);
        }
      }
    };
    const grove = (f0, f1, bottom, tall, wide, n, seed, dark) => { for (let x = X(f0); x < X(f1); x++) for (let y = S(bottom - 2 - 1.2 * Math.abs(Math.sin(x / s * .2 + seed))); y < S(bottom + 1); y++) cell(x, y, hsh(x * 1.3 + y * 7.1) < .25 ? P.pine : P.leaf); for (let i = 0; i < n; i++) cedar(f0 + (f1 - f0) * (i + .2 + hsh(seed + i) * .6) / n, bottom + hsh(seed * 3 + i) * 2, tall * (.65 + hsh(seed * 7 + i) * .5), wide, dark); };
    grove(.69, .9, 22, 13, 2.6, 13, 4); grove(.92, 1.02, 28, 11, 2.4, 6, 9); grove(.355, .48, 50, 9, 2.2, 8, 14);
    // mist: a band with a rounded end (left, right, or neither), peach, inked along its edge
    const mist = (f0, f1, y0, y1, round) => {
      const r = S(y1 - y0) / 2, a = X(f0), b = X(f1);
      for (let x = a; x < b; x++) {
        const l = round.includes('l') && x - a < r * 3 ? Math.sqrt(1 - (1 - (x - a) / (r * 3)) ** 2) : 1, q = round.includes('r') && b - x < r * 3 ? Math.sqrt(1 - (1 - (b - x) / (r * 3)) ** 2) : 1;
        const half = r * Math.min(l, q), mid = S(y0) + r;
        for (let y = Math.round(mid - half); y < mid + half; y++) cell(x, y, Math.min(l, q) < .99 && (y - (mid - half) < 1 || mid + half - y <= 1 || (Math.min(l, q) < .3)) ? P.outline : dither(x, y) < .55 ? P.skin : P.sky);
      }
    };
    mist(.72, 1, 28, 34.5, 'l'); mist(.78, 1, 34, 39.5, 'l'); mist(.575, 1, 39.5, 45, 'l'); mist(.66, 1, 44.5, 50, 'l'); mist(.345, 1, 49.5, 58, 'l'); mist(0, 1, 57.5, 68.5, '');
    grove(.02, .11, 59, 13, 2.6, 5, 21); grove(.12, .3, 63, 12, 2.8, 8, 31);
    slope([[.79, 59], [.85, 50], [.92, 46], [1, 48]], yellow); grove(.81, 1, 52, 13, 2.8, 9, 41); mist(.82, 1, 55, 60, 'l'); mist(.78, 1, 64, 69, 'l');
    // the lake, paling to nothing at the near left
    for (let y = S(68); y < S(115); y++) for (let x = 0; x < cw; x++) {
      const d = y / s; if (d < 69 && x < X(.29)) continue;
      const fade = Math.max(0, (d - 97) / 14) * Math.max(0, 1 - x / cw * 1.6);
      cell(x, y, dither(x, y) < fade ? P.foam : dither(x + 1, y + 2) < fade * 1.6 ? P.steel : dither(x, y) < .25 + .2 * Math.sin(y / s * .9) ? P.sea : P.deep);
    }
    // the headlands: lumps of yellow ground, inked, with bushes
    const lump = (f, y, rx, ry, col = yellow) => { const cx = X(f), cy = S(y), a = cw * rx, b = S(ry); for (let j = -b; j <= b; j++) for (let x = -a; x <= a; x++) { const q = (x / a) ** 2 + (j / b) ** 2; if (q <= 1) cell(cx + x, cy + j, ((Math.abs(x) + 1.4) / a) ** 2 + (j / b) ** 2 > 1 || (x / a) ** 2 + ((Math.abs(j) + 1.4) / b) ** 2 > 1 ? P.outline : col(Math.round(cx + x), cy + j)); } };
    grove(-.01, .2, 79, 17, 3.4, 9, 51); grove(.2, .31, 76, 13, 3, 5, 57);
    lump(.2, 78, .13, 9, (x, y) => (dither(x, y) < Math.max(0, Math.min(1, (y / s - 70) / 8)) ? yellow(x, y) : P.wood)); lump(.04, 82, .07, 4); lump(.13, 84, .09, 5);
    for (const [f, y, r] of [[.15, 76, 3], [.195, 78, 4], [.115, 82, 3], [.02, 82, 3.4], [.22, 81, 3]]) clump(k, X(f), S(y), S(r), P.leaf, P.pine, P.grass, f * 40);
    grove(.53, .62, 72, 16, 3, 4, 61); grove(.62, .72, 66, 12, 2.8, 5, 66);
    lump(.6, 73, .065, 3.4); lump(.72, 72.5, .05, 3);
    for (const [f, y, r] of [[.66, 67, 6], [.7, 65, 5], [.74, 66, 4.5], [.64, 71, 4], [.69, 70, 5], [.8, 74, 5], [.84, 76, 6], [.9, 76, 7], [.96, 74, 7], [.99, 64, 6], [.95, 78, 6]]) clump(k, X(f), S(y), S(r), P.leaf, P.pine, P.grass, f * 71);
    lump(.79, 81, .045, 3.4);
    const roof = (f, y, w, h) => { for (let r = 0; r < S(h); r++) for (let x = 0; x < S(w); x++) cell(X(f) + x - Math.round(r * .5), S(y) + r, r < S(.6) ? P.deep : x % S(1.6) < 2 ? P.deep : P.navy); };
    for (let r = 0; r < S(4); r++) for (let x = 0; x < S(5); x++) cell(X(.607) + x, S(66) + r, x % S(1.4) < 2 ? P.grey2 : P.white);
    roof(.605, 63, 8, 4); roof(.85, 66.5, 13, 5); roof(.915, 63.5, 12, 5); roof(.94, 67, 15, 5);
    mist(.795, 1, 81, 89, 'l');
    cedar(.735, 90, 13, 4); cedar(.72, 91, 8, 4); cedar(.755, 91, 8, 4);
    mist(.625, 1, 90, 98, 'l');
    // the cedars in front, black against the water
    grove(.68, .84, 106, 8, 3.2, 7, 71, true); grove(.4, .7, 108, 19, 4, 15, 81, true); cedar(.56, 106, 34, 5.4, true); cedar(.468, 106, 21, 4.6, true); grove(.28, .41, 114, 12, 3, 7, 91);
    mist(.72, 1, 99, 107, 'l'); mist(.375, 1, 106.5, 115, 'l'); mist(0, 1, 114, 121, '');
  }, live: (k, t) => {
    const { cw, s, S, cell } = k;
    for (let i = 0; i < 12; i++) {   // glints drifting on the lake
      const x = Math.round(cw * (.32 + hsh(i * 3.7) * .2) + Math.sin(t * .9 + i) * 3 * s), y = S(74 + hsh(i * 5.3) * 24), n = S(2 + hsh(i) * 3);
      if (Math.sin(t * 2.2 + i * 1.7) > 0) for (let j = 0; j < n; j++) cell(x + j, y, P.white);
    }
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
// The order they come in, one each fall. (The two great close-ups of the mountain, Red Fuji and the
// Rainstorm, are kept apart.)
const ORDER = ['FINE WIND, CLEAR MORNING', 'THE LAKE AT HAKONE IN SAGAMI PROVINCE', 'AT SEA OFF KAZUSA', 'LAKE SUWA IN SHINANO PROVINCE',
  'RAINSTORM BENEATH THE SUMMIT', 'THE INUME PASS IN KAI PROVINCE', 'UMEZAWA IN SAGAMI PROVINCE', 'TAGO BAY NEAR EJIRI', 'UNDER MANNEN BRIDGE AT FUKAGAWA',
  'REFLECTION IN LAKE AT MISAKA'];
PRINTS.sort((a, b) => ORDER.indexOf(a.title) - ORDER.indexOf(b.title));

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
