// ============================================================================
// dawn.js — after a fall, a new tomorrow dawns as one of Hokusai's Thirty-six Views of Mount Fuji,
// a different print each fall (in turn), recreated cell by cell with the game's own palette:
//   Fine Wind, Clear Morning ("Red Fuji") · Goten-yama Hill, Shinagawa on the Tōkaidō · Rainstorm
//   Beneath the Summit · Ejiri in Suruga Province · Under Mannen Bridge at Fukagawa
// Each comes in from the top like a print being laid down, and lifts off the same way. A small
// title label sits in the corner, as on the prints. (The two great close-ups of the mountain, Red Fuji
// and the Rainstorm, are kept apart in the order.)
//
// The prints are laid out on a grid 120 "design cells" tall (160 wide on the PC's 4:3 screen, 213 in
// full screen), and drawn in finer cells, one pixel each: s of them to a design cell (4 on the PC's
// 640×480, 3 on full screen's 640×360). Measurements are written in design cells and scaled with S(n);
// cw and ch are the real (fine) grid's size.
// ============================================================================
import { LW, LH, P } from './config.js';
import { hsh, fujiCells } from './art.js';
import { pixelText, LETTER } from './text.js';
import { scale2x, pack } from './pixel.js';   // (pack: a colour as a 32-bit pixel, for painting into ImageData)

const C = 1;   // pixels per cell

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
    if (x >= 0 && x < cw && y >= 0 && y < ch && show(x, y)) { if (buf) buf[y * cw + x] = pack(c); else { g.fillStyle = c; g.fillRect(x * C, y * C, C, C); } }
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
  // bands of colour from the top, each a list of [down to design row, colour]; band edges are
  // stitched together a cell at a time, like the title card's chart
  const bands = (list, from = 0, to = ch) => {
    for (let y = from; y < to; y++) for (let x = 0; x < cw; x++) {
      const b = y + ((x + y) % 2) * 2 - 1;
      cell(x, y, (list.find(([end]) => b < end * s) || list[list.length - 1])[1]);
    }
  };
  const fuji = (px, top, rows, half, view) => fujiCells((x, r, c) => cell(px + x, top + r, c), rows, half, view, Math.max(1, Math.round(s / 2)));
  return { cw, ch, s, S, cell, blot, line, disc, bands, fuji, span, flush: () => img && g.putImageData(img, 0, 0) };
}

// --- the five prints ---
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
    bands([[5, P.deep], [12, P.steel], [20, P.pale], [999, P.sky]]);
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
    bands([[8, P.deep], [22, P.steel], [999, P.pale]], 0, S(70));
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
];

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
}).map(([k, rows]) => [k, scale2x(rows.map(r => r.padEnd(Math.max(...rows.map(q => q.length)), '.')))]));
const FIG_COL = { Y: P.ochre, K: P.outline, n: P.navy, R: P.red, S: P.skin, b: P.deep, g: P.leaf };
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
