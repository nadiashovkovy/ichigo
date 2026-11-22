// ============================================================================
// dawn.js — after a fall, a new tomorrow dawns as one of Hokusai's Thirty-six Views of Mount Fuji,
// a different print each fall (in turn), recreated in 2×2-pixel cells with the game's own palette:
//   Fine Wind, Clear Morning ("Red Fuji") · Rainstorm Beneath the Summit · Kajikazawa in Kai
//   Province · Ejiri in Suruga Province · Under Mannen Bridge at Fukagawa
// Each comes in from the top like a print being laid down, and lifts off the same way. A small
// title label sits in the corner, as on the prints.
// ============================================================================
import { LW, LH, P } from './config.js';
import { hsh, fujiCells } from './art.js';
import { pixelText } from './text.js';

const C = 2;   // pixels per cell

// The canvas for one print: cell(x, y, colour) paints a cell, if the dawn has reached it yet.
function canvas(g, t, a) {
  const cw = Math.ceil(LW / C), ch = Math.ceil(LH / C);
  const ragged = x => hsh(Math.floor(x / 3) * 1.73) * .06 + (Math.sin(x * .21) + 1) * .02;
  const show = (x, y) => t < .5 ? y / ch < a * 1.15 - ragged(x) : y / ch > (1 - a) * 1.15 - ragged(x);
  const cell = (x, y, c) => {
    x = Math.round(x); y = Math.round(y);
    if (x >= 0 && x < cw && y >= 0 && y < ch && show(x, y)) { g.fillStyle = c; g.fillRect(x * C, y * C, C, C); }
  };
  const line = (x0, y0, x1, y1, c) => {   // a line of cells
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let i = 0; i <= n; i++) cell(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, c);
  };
  const disc = (cx, cy, r, c) => {
    for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++)
      if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) cell(x, y, c);
  };
  // bands of colour from the top, each a list of [down to row, colour]; band edges are stitched
  // together a cell at a time, like the title card's chart
  const bands = (list, from = 0, to = ch) => {
    for (let y = from; y < to; y++) for (let x = 0; x < cw; x++) {
      const b = y + ((x + y) % 2) * 2 - 1;
      cell(x, y, (list.find(([end]) => b < end) || list[list.length - 1])[1]);
    }
  };
  const fuji = (px, top, rows, half, view) => fujiCells((x, r, c) => cell(px + x, top + r, c), rows, half, view);
  return { cw, ch, cell, line, disc, bands, fuji };
}

// --- the five prints ---
const PRINTS = [
  { title: 'FINE WIND, CLEAR MORNING', draw: (k, t) => {
    // Red Fuji: the mountain rust red in the first light, under a deep blue sky full of little clouds
    const { cw, ch, cell, bands, fuji } = k;
    bands([[26, P.navy], [52, P.deep], [80, P.steel], [999, P.pale]]);
    const drift = Math.floor(t * 4);
    for (let i = 0; i < 70; i++) {
      const y0 = Math.round(16 + Math.pow(hsh(i * 2.9), .8) * 52), x0 = Math.floor(hsh(i * 7.3) * (cw + 20)) - 10 + drift - Math.floor(y0 / 6);
      const n = 2 + Math.floor(hsh(i * 3.1) * 4);
      for (let j = 0; j < n; j++) { cell(x0 + j, y0, P.white); if (j > 0 && j < n - 1 && n > 3) cell(x0 + j, y0 - 1, P.white); }
    }
    fuji(Math.round(cw * .6), ch - 74, 74, [Math.round(cw * .75), Math.round(cw * .5)], 'red');
  } },
  { title: 'RAINSTORM BENEATH THE SUMMIT', draw: (k, t) => {
    // the snowy summit in clear sky above a bank of cloud; below, the dark slopes and a red lightning bolt
    const { cw, ch, cell, line, disc, bands, fuji } = k;
    bands([[10, P.navy], [24, P.deep], [44, P.steel], [999, P.pale]]);
    const drift = Math.sin(t * .8) * 1.5;
    for (let i = 0; i < 9; i++) {   // the bank of cumulus, top left
      const cx = cw * (.06 + i * .055) + drift, cy = 40 - Math.sin(i * 1.3) * 6 - (i > 3 && i < 7 ? 5 : 0), r = 6 + hsh(i * 4.7) * 6;
      disc(cx, cy + 2, r, P.grey0); disc(cx, cy, r, P.white);
    }
    fuji(Math.round(cw * .62), 12, ch, [Math.round(cw * .85), Math.round(cw * .55)], 'storm');
    if (Math.sin(t * 9) > -.2 || Math.sin(t * 3.7) > .5) {   // lightning, flickering
      let x = cw * .8, y = ch * .55;   // zigzagging down and across the dark slope
      for (let i = 0; i < 8; i++) { const nx = x - (i % 2 ? 1 : 6), ny = y + (i % 2 ? 4 : 2); line(x, y, nx, ny, P.red); x = nx; y = ny; }
    }
  } },
  { title: 'KAJIKAZAWA IN KAI PROVINCE', draw: (k, t) => {
    // a fisherman on a jutting rock, his lines out into the foaming torrent; Fuji above the mist
    const { cw, ch, cell, line, bands, fuji } = k;
    bands([[6, P.navy], [14, P.deep], [26, P.steel], [999, P.pale]], 0, 62);
    fuji(Math.round(cw * .64), 22, 30, 28, 'grey');
    for (let y = 44; y < 62; y++) for (let x = 0; x < cw; x++)   // mist over its foot, thickening down to the water
      if (y > 50 || hsh(Math.floor(x / 4) * .37 + y * 5.1) < (y - 44) * .2) cell(x, y, y % 3 === 0 && hsh(Math.floor(x / 6) + y) < .6 ? P.white : P.pale);
    for (let y = 62; y < ch; y++) for (let x = 0; x < cw; x++) {   // the torrent: long swells of blue, a line of foam on each crest
      const f = (y - 62) * .3 + Math.sin(x * .07 - t * 1.4 + y * .08) * 1.6 + Math.sin(x * .023 + 1) * 2;
      const band = ((Math.floor(f) % 5) + 5) % 5, foam = f - Math.floor(f) > .78 && band === 4;
      cell(x, y, foam ? P.white : [P.deep, P.navy, P.deep, P.deep, P.steel][band]);
    }
    for (let i = 0; i < 40; i++) {   // spray thrown up round the rock
      const p = (t * .8 + i / 40) % 1, x = cw * .5 + hsh(i * 3.3) * 30 - 8, y = 80 - p * 14 + hsh(i) * 20;
      cell(x, y, P.white);
    }
    const tipX = Math.round(cw * .55), tipY = 60;   // the rock: a steep crag jutting out over the water
    const rockTop = x => x > tipX ? 999 : Math.round(tipY + (tipX - x) * .25 + Math.max(0, tipX * .45 - x) * .9 + Math.sin(x * .5) * 1.2);
    const rockFoot = x => x > tipX - 6 ? Math.round(tipY + 4 + (x - tipX + 6) * 3) : ch;   // the overhang under the tip
    for (let x = 0; x <= tipX; x++) for (let y = rockTop(x); y < Math.min(ch, rockFoot(x)); y++) {
      const edge = y === rockTop(x) || y === Math.min(ch, rockFoot(x)) - 1;
      cell(x, y, edge ? P.outline : (x + Math.floor(y / 2) * 3) % 8 === 0 ? P.outline : (y - rockTop(x)) < 3 ? P.olive : P.brown);
    }
    drawFigure(cell, tipX - 4, tipY - 1, 'fisher');
    drawFigure(cell, tipX - 13, rockTop(tipX - 13) - 1, 'boy');
    for (let i = 0; i < 5; i++) line(tipX + 1, tipY - 8, tipX + 14 + i * 8, tipY + 10 + i * 4, P.outline);   // the lines
  } },
  { title: 'EJIRI IN SURUGA PROVINCE', draw: (k, t) => {
    // a gust on the marsh road: travellers bent into the wind, a tree bowed, papers flying; Fuji a
    // white outline far off
    const { cw, ch, cell, line, bands } = k;
    bands([[5, P.deep], [12, P.steel], [999, P.sky]]);
    const fx = Math.round(cw * .24), fTop = 46, rows = 26, half = 34;   // Fuji, just an outline
    for (let r = 0; r < rows; r++) {
      const hw = Math.max(1, Math.round((r + 1) / rows * half));
      for (let x = -hw; x <= hw; x++) cell(fx + x, fTop + r, Math.abs(x) >= hw - (r === 0 ? 9 : 0) ? P.outline : P.white);
    }
    const ground = x => 72 + Math.round(Math.sin(x * .03) * 3 + x * .04);   // the marsh, a road winding over it
    for (let x = 0; x < cw; x++) for (let y = ground(x); y < ch; y++) {
      const road = Math.abs(y - (ch - 10 - (x - cw * .2) * .3)) < 3;
      cell(x, y, y === ground(x) ? P.outline : road ? P.tan : hsh(x * 3.7 + y * 11.3) < .025 ? P.navy : P.olive);
    }
    for (let i = 0; i < 26; i++) { const x = Math.floor(hsh(i * 3.7) * cw), y = ground(x); line(x, y, x + 2, y - 3 - hsh(i) * 3, P.outline); }   // reeds, bent
    const tx = Math.round(cw * .82), sway = Math.sin(t * 2.2) * 1.5;   // the tree, bowed by the wind
    for (let y = 16; y < ground(tx) + 1; y++) {
      const k2 = (ground(tx) - y) / (ground(tx) - 16), x = tx - Math.round(k2 * k2 * (14 + sway));
      cell(x - 1, y, P.outline); cell(x, y, P.brown); cell(x + 1, y, P.outline);
    }
    for (let i = 0; i < 7; i++) {   // its leaves, in clumps
      const lx = tx - 18 - sway + i * 4 - (i % 2) * 2, ly = 14 + (i % 3) * 3;
      for (let j = 0; j < 7; j++) cell(lx + (j % 4), ly + Math.floor(j / 4), j % 3 ? P.olive : P.navy);
    }
    for (let i = 0; i < 3; i++) { const x = Math.round(cw * (.4 + i * .1)); drawFigure(cell, x, Math.round(ch - 10 - (x - cw * .2) * .3) + 1, 'walker'); }   // travellers on the road
    for (let i = 0; i < 20; i++) {   // papers whirled up out of a traveller's packet, away over the marsh
      const p = (t * .22 + i / 20) % 1, x = cw * (.62 - p * .55) + Math.sin(p * 9 + i) * 4, y = ch * (.78 - p * .7) + Math.cos(p * 7 + i * 2) * 3;
      cell(x, y, P.white); cell(x + ((i + Math.floor(t * 6)) % 2 ? 1 : 0), y + ((i + Math.floor(t * 6)) % 2 ? 0 : 1), P.white);
    }
  } },
  { title: 'UNDER MANNEN BRIDGE AT FUKAGAWA', draw: (k, t) => {
    // the great arch of the bridge over the river, boats beneath it, Fuji small in the distance
    const { cw, ch, cell, bands, fuji } = k;
    bands([[8, P.deep], [22, P.steel], [999, P.pale]], 0, 70);
    fuji(Math.round(cw * .5), 52, 18, 16, 'grey');
    for (let x = 0; x < cw; x++) { cell(x, 69, P.grey3); if (hsh(x * 1.9) < .3) cell(x, 68, P.grey3); }   // the far bank
    for (let y = 70; y < ch; y++) for (let x = 0; x < cw; x++)   // the river, ripples drifting along
      cell(x, y, hsh(Math.floor((x + t * 3 * (y % 2 ? 1 : -1)) / 4) * 3.3 + y * 7.1) < .2 ? P.pale : y < 80 ? P.steel : y % 5 ? P.deep : P.steel);
    for (let i = 0; i < 2; i++) {   // boats under the bridge
      const bx = Math.round(((cw * (.3 + i * .35) + t * (2 + i)) % (cw + 30)) - 15);
      boat(cell, bx, 84 + i * 14, i % 2 === 1);
    }
    const cx = cw / 2, deck = x => 22 + ((x - cx) / (cw * .62)) ** 2 * 60;   // the arch, broad and low
    for (let x = 0; x < cw; x++) {
      const d = Math.round(deck(x));
      cell(x, d, P.outline);                                     // the handrail
      if (x % 4 === 0) cell(x, d + 1, P.outline);                // its posts
      cell(x, d + 2, P.outline); for (let i = 3; i < 7; i++) cell(x, d + i, i === 4 ? P.ochre : P.brown); cell(x, d + 7, P.outline);   // the deck's side
      if (Math.abs(x - cx) > cw * .34 && x % 6 === 0) for (let y = d + 8; y < ch; y++) cell(x, y, x % 10 ? P.brown : P.outline);   // piles, down into the water
    }
    for (let i = 0; i < 4; i++) {   // people crossing
      const px = Math.round(((cw * (.15 + i * .22) + t * (i % 2 ? 2 : -2)) % cw + cw) % cw);
      const d = Math.round(deck(px));
      cell(px, d - 1, P.navy); cell(px, d - 2, P.navy); cell(px, d - 3, i % 2 ? P.ochre : P.outline);
    }
  } },
];

// A small boat on the river, two figures in it.
function boat(cell, x, y, flip) {
  const s = flip ? -1 : 1;
  for (let i = 0; i < 16; i++) { cell(x + s * i, y, P.outline); if (i > 0 && i < 15) cell(x + s * i, y - 1, P.ochre); }
  cell(x + s * 4, y - 2, P.navy); cell(x + s * 4, y - 3, P.outline); cell(x + s * 10, y - 2, P.navy); cell(x + s * 10, y - 3, P.ochre);
  for (let i = 0; i < 6; i++) cell(x + s * (10 + i), y - 3 - i, P.outline);   // a pole
}

// Little people, a few cells tall: a fisherman standing with his rods, a boy sitting by him, a
// traveller bent into the wind under a straw hat.
const FIGURES = {
  fisher: ['..YYY.', '.YYYYY', '...KK.', '..nnnK', '..nnn.', '..nnn.', '..n.n.', '..K.K.'],
  boy:    ['.YYY.', 'YYYYY', '.KKK.', '.nnn.', 'nnnnn'],
  walker: ['..YYY', '.YYYYY', '..KK.', '.nnK.', 'nnn..', '.nnn.', '.n.n.', 'K..K.'],
};
const FIG_COL = { Y: P.ochre, K: P.outline, n: P.navy };
function drawFigure(cell, x, bottom, kind) {
  const rows = FIGURES[kind];
  rows.forEach((row, r) => [...row].forEach((ch, c) => { if (ch !== '.') cell(x + c, bottom - rows.length + 1 + r, FIG_COL[ch]); }));
}

// Draw the dawn for the n-th fall at time t into it.
export function drawDawn(g, t, n) {
  const a = t < .5 ? t / .5 : t > 1.3 ? Math.max(0, 1 - (t - 1.3) / .4) : 1;
  if (a <= 0) return;
  const print = PRINTS[((n % PRINTS.length) + PRINTS.length) % PRINTS.length];
  print.draw(canvas(g, t, a), t);
  if (t > .5 && t < 1.3) {   // the title label, top left, as on the prints
    const w = print.title.length * 6 + 5;
    g.fillStyle = P.outline; g.fillRect(4, 4, w + 2, 13);
    g.fillStyle = P.foam; g.fillRect(5, 5, w, 11);
    pixelText(print.title, 8, 7, P.navy);
  }
}
