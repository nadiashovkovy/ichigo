// ============================================================================
// plumart.js — how Level 3 looks (plum.js is how it plays): a warm afternoon on an island of plum
// trees. The island (its ground, trees and grass) never changes, so it's painted once, onto one long
// picture that slides by; the sleepers, the fruit, the reeds and the sea are drawn over it every frame.
// From back to front: the sky, Fuji and far sea → wooded hills → the island → hammocks and what lies
// about → Ichigo → reeds and grass in front → the sea.
// The sleepier Ichigo is, the darker the edges of the screen, and the heavier their eyelids.
// ============================================================================
import { W, LW, LH, TOP_PX, PIXEL, P, PLUM, RAMP, toPx } from './config.js';
import { S, parts } from './state.js';
import { lg, beginWorld, pixelSpace, dither, scale2x } from './pixel.js';
import { pixelText, LETTER, LINE } from './text.js';
import { drawScenery, drawChartSea, drawLife, hsh } from './art.js';
import { drawSprite, spriteHeight, markIds, outline } from './sprite.js';
import { drawBubbles } from './bubbles.js';
import { drawDawn } from './dawn.js';
import { drawHUD, drawEndFg } from './scenes.js';
import { M, groundY, seaAt, action, thingY, raftNeeds } from './plum.js';
import { drawIcon } from './icons.js';
import { THINGS } from './things.js';

const X = x => Math.round((x - S.camX) / PIXEL);       // a world x, in pixels on screen
const Yp = y => Math.round(y / PIXEL + TOP_PX);        // a world y, in pixels on screen
const u = x => Math.round(x / PIXEL);                  // a world x, in pixels along the island's picture

// --- little pictures (letter grids, like sprite.js) ---
const C = { K: P.outline, V: P.plum, v: P.violet, p: P.mauve, l: P.rose, G: P.leaf, g: P.grass, d: P.dawn, o: P.gold, O: P.ochre, B: P.brown, b: P.wood, T: P.tan, t: P.tanD, R: P.red, r: P.rust, w: P.white, W: P.foam, h: P.grey0, H: P.grey1,
  S: '#f1c49b', s: '#c98d66', m: '#a8523f', c: '#e9a184', k: '#14131f', n: P.navy, D: P.deep, a: P.aqua, x: P.slate, e: P.teal, L: P.sea, q: P.rosewood };
const grid = (rows, ink = true) => { const w = Math.max(...rows.map(r => r.length)), g = rows.map(r => [...r.padEnd(w, '.')].map(ch => (ch === '.' ? null : C[ch]))); return ink ? outline(g) : g; };
function put(g, gr, cx, bottom, flip = false) {
  const w = gr[0].length, x0 = Math.round(cx - w / 2), y0 = Math.round(bottom) - gr.length + 1;
  gr.forEach((row, r) => row.forEach((c, i) => { if (c) { g.fillStyle = c; g.fillRect(x0 + (flip ? w - 1 - i : i), y0 + r, 1, 1); } }));
}
const FRUIT = grid(['..bG.', '.VVb.', 'VlpVv', 'VpVVv', 'VVVVv', '.VVv.']);
const ORANGE = grid(['..Gg.', '.dGd.', 'dooddr', 'dodddr', 'ddddrr', '.dddr.']);
const CRAB = [['RR..........RR', 'R.R..w..w..R.R', '.RR..K..K..RR.', '..R.dRRRRd.R..', '...RRRRRRRR...', '..rRRRRRRRRr..', '.r.rRRRRRRr.r.', 'r..r.rrrr.r..r'],
  ['.RR........RR.', 'R.R..w..w..R.R', 'RR...K..K...RR', '..R.dRRRRd.R..', '...RRRRRRRR...', '.rrRRRRRRRRrr.', 'r..rRRRRRRr..r', '..r..rrrr..r..']].map(r => grid(r));
const CLAWS = grid(['RR..RR', 'R.RR.R', '.R..R.', '.RRRR.']);
const ROPE = grid(['...TTTTTT...', '.TTtttttTTT.', 'TTtT....TtTT', 'TtT......TtT', 'TTtTTTTTTtTT', '.TTttttttTT.', '...TTTTTTT.t', '.........TT.']);
const ZS = [['mmmm', '..m.', '.m..', 'mmmm'], ['mmmmm', '...m.', '..m..', '.m...', 'mmmmm'], ['mmmmmmm', 'mmmmmmm', '....mm.', '...mm..', '..mm...', '.mm....', 'mmmmmmm', 'mmmmmmm']].map(rows => outline(rows.map(r => [...r].map(ch => (ch === '.' ? null : P.foam)))));
// the sleepers' heads, lying back, facing up and right
const HEADS = {
  woman: {
    asleep: ['....kkkkkkk.....', '..kkkkkkkkkkk...', '.kkkkkkkDDkkkk..', '.kkkkkkkkkkkkkk.', 'kkkkkkSSSkSSkkk.', 'kkkkSSSSSSSSSkk.', 'kkkSSSSSSSSSSkk.', 'kkkSkkkSSkkkSSk.', 'kkkSSSSSSSSSSSk.', 'kkkScSSSSSSScSk.', 'kkk.SSSSmmSSS.kk', 'kkk..SSSSSSS..kk', 'kkkk...SSs...kk.', '.kkk.........k..'],
    awake:  ['....kkkkkkk.....', '..kkkkkkkkkkk...', '.kkkkkkkDDkkkk..', '.kkkkkkkkkkkkkk.', 'kkkkkkSSSkSSkkk.', 'kkkkSSSSSSSSSkk.', 'kkkSSSSSSSSSSkk.', 'kkkSSkSSSSkSSSk.', 'kkkSSkSSSSkSSSk.', 'kkkScSSSSSSScSk.', 'kkk.SSSmmmSSS.kk', 'kkk..SSSSSSS..kk', 'kkkk...SSs...kk.', '.kkk.........k..'],
  },
  fisherman: {
    asleep: ['......OOOO......', '....OOTOOTOO....', '..OOTOOTOOTOOO..', '.OTOOTOOTOOTOOO.', 'OOTOOTOOTOOTOOTO', '.BBBBBBBBBBBBBB.', '..SSSSSSSSSSSS..', '..SSkkkSSkkkSS..', '..SsSSSSSSSSsS..', '...SSShhhhSSS...', '....hhhmmhhh....', '.....hhhhhh.....'],
    awake:  ['....kkkkkkkk....', '...kkkkkkkkkk...', '..kkSSSSSSSSkk..', '..kSSSSSSSSSSk..', '..SSkkSSSSkkSS..', '..SSwkSSSSwkSS..', '..SSwkSSSSwkSS..', '..SsSSSSSSSSsS..', '...SShhhhhhSS...', '....hhmmmmhh....', '....hhmmmmhh....', '.....hhhhhh.....'],
  },
  sailor: {
    asleep: ['.....SSSSSS.....', '...SSSSSSSSSS...', '..SSwwSSSSSSSS..', '.xxxxxxxxxxxxxx.', '.xxWxxxWxxxWxxx.', '.SSSSSSSSSSSSSS.', 'wSwwwwSSSwwwwSSw', 'wSSkkkSSSkkkSSSw', 'wSSSSSSSSSSSSSsw', 'wwcSSSssssSSScww', 'wwwwwwwwwwwwwwww', '.wwwwwwmmwwwwww.', '..wwwwwwwwwwww..', '...wwhwwwwhww...', '.....wwhwww.....'],
    half:   ['.....SSSSSS.....', '...SSSSSSSSSS...', '..SSwwSSSSSSSS..', '.xxxxxxxxxxxxxx.', '.xxWxxxWxxxWxxx.', '.SSSSSSSSSSSSSS.', 'wSwwwwSSSwwwwSSw', 'wSSssSSSSSssSSSw', 'wSSkkSSSSSkkSSsw', 'wwcSSSssssSSScww', 'wwwwwwwwwwwwwwww', '.wwwwwwmmwwwwww.', '..wwwwwwwwwwww..', '...wwhwwwwhww...', '.....wwhwww.....'],
    awake:  ['.....SSSSSS.....', '...SSSSSSSSSS...', '..SSwwSSSSSSSS..', '.xxxxxxxxxxxxxx.', '.xxWxxxWxxxWxxx.', '.Swww.SSSSwwwSS.', 'wSSSSSSSSSSSSSSw', 'wSSwkSSSSSwkSSSw', 'wSSwkSSSSSwkSSsw', 'wwcSSSssssSSScww', 'wwwwwwwwwwwwwwww', '.wwwwwmmmmwwwww.', '..wwwwwmmwwwww..', '...wwhwwwwhww...', '.....wwhwww.....'].map(r => r.replace('.Swww.S', '.SwwwSS')),
  },
};
for (const who of Object.values(HEADS)) for (const k of Object.keys(who)) who[k] = grid(who[k]);
// what each is wrapped in: the cloth of the hammock (light, dark, stripe) and of their clothes (light, dark)
const CLOTH = {
  woman: { cloth: [P.foam, P.tan, P.rose], dress: [P.rose, P.rosewood], skin: true },
  fisherman: { cloth: [P.tan, P.tanD, P.ochre], dress: [P.slate, P.navy], skin: true },
  sailor: { cloth: [P.pale, P.steel, P.deep], dress: [P.deep, P.navy], skin: true },
  empty: { cloth: [P.sky, P.tanD, P.tan], dress: [] },   // (plain canvas, with no one in it)
};

// ============================================================================
// The island, painted once
// ============================================================================
let island = null, hills = null;
// Foliage: a heap of round puffs as one shape, inked, lit from the upper left, flecked.
function foliage(g, cx, cy, rx, ry, seed, [light, mid, dark]) {
  const at = new Map(), puffs = [];
  for (let j = 0; j < 11; j++) { const a = j * 2.4 + hsh(seed + j) * .8, d = j ? .35 + hsh(seed + j * 3.3) * .4 : 0, r = .34 + hsh(seed + j * 5.1) * .2; puffs.push([cx + Math.cos(a) * d * rx, cy + Math.sin(a) * d * ry, r * rx, r * ry * 1.15]); }
  const on = (x, y) => puffs.some(([px, py, a, b]) => ((x - px) / a) ** 2 + ((y - py) / b) ** 2 <= 1);
  for (let y = Math.floor(cy - ry * 1.5); y <= cy + ry * 1.5; y++) for (let x = Math.floor(cx - rx * 1.5); x <= cx + rx * 1.5; x++) if (on(x, y)) at.set(x + ',' + y, 1);
  for (const key of at.keys()) {
    const [x, y] = key.split(',').map(Number), has = (i, j) => at.has((x + i) + ',' + (y + j));
    const rim = !has(1, 0) || !has(-1, 0) || !has(0, 1) || !has(0, -1);
    let lit = 0; for (const [px, py, a, b] of puffs) { const q = ((x - px) / a) ** 2 + ((y - py) / b) ** 2; if (q <= 1) lit = Math.max(lit, (1 - q) * .5 + (-(x - px) / a - (y - py) / b) * .35); }   // each puff lit on its upper left
    const k = lit - (y - cy) / ry * .28, n = hsh(Math.floor(x / 2) * 3.7 + Math.floor(y / 2) * 9.1 + seed);
    g.fillStyle = rim ? P.outline : n < .05 ? dark : n > .965 ? light : dither(x & 255, y & 255) < (k - .22) * 2.4 ? light : dither(x & 255, y & 255) < k * 2 + .35 ? mid : dark;
    g.fillRect(x, y, 1, 1);
  }
}
function trunk(g, pts, w0, w1, seed) {   // a trunk or branch through these points, tapering, its bark lit on the left
  const n = pts.length - 1;
  for (let i = 0; i < n; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], len = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let k = 0; k <= len; k++) {
      const q = (i + k / len) / n, w = Math.max(1, Math.round((w0 + (w1 - w0) * q) / 2)), x = Math.round(x0 + (x1 - x0) * k / len), y = Math.round(y0 + (y1 - y0) * k / len);
      for (let d = -w - 1; d <= w; d++) { const e = d === -w - 1 || d === w, h = hsh(Math.floor((x + d) / 2) * 2.3 + Math.floor(y / 4) * 5.9 + seed); g.fillStyle = e ? P.outline : d < -w * .3 ? (h < .2 ? P.wood : P.bark) : h < .25 ? P.outline : h < .6 ? P.brown : P.wood; g.fillRect(x + d, y, 1, 1); }
    }
  }
}
function plumTree(g, x, y, s, seed) {
  const lean = (hsh(seed) - .5) * 14, t = k => Math.round(k * s);
  trunk(g, [[x, y + 3], [x + lean * .3, y - t(22)], [x + lean, y - t(44)], [x + lean * .8, y - t(62)], [x + lean * .6, y - t(80)]], t(11), t(5), seed);
  trunk(g, [[x + lean * .8, y - t(40)], [x + t(16), y - t(58)], [x + t(24), y - t(66)]], t(5), 2, seed + 1);
  trunk(g, [[x + lean * .6, y - t(36)], [x - t(16), y - t(54)], [x - t(26), y - t(64)]], t(5), 2, seed + 2);
  for (const k of [-1, 1]) trunk(g, [[x + k * 2, y - 2], [x + k * t(8), y + 3]], t(5), 2, seed + 4 + k);   // roots
  foliage(g, x - t(24), y - t(72), t(21), t(13), seed + 3, RAMP.leaf); foliage(g, x + t(25), y - t(74), t(21), t(13), seed + 7, RAMP.leaf); foliage(g, x + lean * .4, y - t(88), t(27), t(16), seed + 11, RAMP.leaf);
  for (let i = 0; i < 13; i++) {   // plums
    const a = hsh(seed + i * 2.7) * 6.28, d = .35 + hsh(seed + i * 4.9) * .6; put(g, FRUIT, x + Math.round(Math.cos(a) * d * t(40)), y - t(72) + Math.round(Math.sin(a) * d * t(22)));
  }
}
function paintIsland() {
  const L = S.level, w = u(L.length) + 20;
  island = document.createElement('canvas'); island.width = w; island.height = LH;
  const g = island.getContext('2d'), G = x => Yp(groundY(x * PIXEL));
  // the trees behind, in a row along the back of the island: one flat dark wood, then a lighter one
  for (let x = u(420); x < u(2240); x++) {
    const f = Math.min(1, (x - u(420)) / 90, (u(2240) - x) / 90), top = G(x) - Math.round(f * (30 + 12 * Math.sin(x * .023) + 6 * Math.abs(Math.sin(x * .11)) + 4 * Math.abs(Math.sin(x * .29))));
    for (let y = top; y < G(x) + 2; y++) { g.fillStyle = y - top < 1 ? P.outline : y - top < 4 && hsh(Math.floor(x / 3) * 3.1) < .6 ? P.leaf : dither(x & 255, y) < .25 + (y - top) / 60 ? P.pine : hsh(Math.floor(x / 2) * 1.7 + Math.floor(y / 2) * 5.3) < .12 ? P.leaf : P.pine; g.fillRect(x, y, 1, 1); }
  }
  // the ground: grass on earth, turning to sand at the two shores
  const [s0, s1, s2, s3] = RAMP.sand;
  for (let x = 0; x < w; x++) {
    const wx = x * PIXEL, top = G(x), sandy = Math.max(0, Math.min(1, Math.max((400 - wx) / 130, (wx - 2190) / 120))), turf = 5 + Math.floor(hsh(Math.floor(x / 3) * 2.9) * 4);
    for (let y = top - 1; y < LH; y++) {
      const d = y - top, n = hsh(Math.floor(x / 3) * 7.7 + Math.floor(y / 2) * 3.1);
      let c;
      if (d < 0) c = P.outline;
      else if (dither(x & 255, y) < sandy) c = d < 2 ? s0 : d > 26 ? s3 : n < .05 ? s3 : dither((x + 1) & 255, y) < (d - 6) / 26 ? s2 : s1;
      else if (d < turf) c = d < 2 ? P.grass : n < .3 ? P.pine : P.leaf;
      else if (d < turf + 2) c = P.outline;
      else c = d > 34 ? (n < .3 ? P.grey3 : P.slate) : n < .03 ? P.grey2 : n < .07 ? P.outline : dither(x & 255, y) < (d - 8) / 30 ? P.brown : P.wood;
      g.fillStyle = c; g.fillRect(x, y, 1, 1);
    }
  }
  for (let i = 0; i < 420; i++) {   // tufts of grass, and little flowers, along the top
    const wx = 400 + hsh(i * 3.7) * 1800, x = u(wx), y = G(x), h = 2 + Math.floor(hsh(i * 5.3) * 4);
    for (let j = 0; j < 3; j++) { g.fillStyle = j === 1 ? P.grass : P.leaf; g.fillRect(x + j * 2, y - h + (j === 1 ? 0 : 2), 1, h); }
    if (i % 9 === 0) { g.fillStyle = [P.white, P.pink, P.gold][i % 3]; g.fillRect(x + 1, y - h - 2, 3, 2); g.fillStyle = P.ochre; g.fillRect(x + 2, y - h - 1, 1, 1); }
  }
  for (const [tx, s] of L.trees) plumTree(g, u(tx), G(u(tx)), s, tx);
  // the orange tree: round and dark
  const ox = u(L.orange), oy = G(ox);
  trunk(g, [[ox, oy + 3], [ox + 2, oy - 24], [ox - 1, oy - 46]], 10, 6, 5); for (const k of [-1, 1]) trunk(g, [[ox, oy - 30], [ox + k * 18, oy - 50]], 4, 2, 8 + k);
  foliage(g, ox - 16, oy - 60, 20, 16, 31, [P.leaf, P.pine, P.abyss]); foliage(g, ox + 17, oy - 62, 20, 16, 37, [P.leaf, P.pine, P.abyss]); foliage(g, ox, oy - 76, 24, 17, 41, [P.leaf, P.pine, P.abyss]);

  // hills, further off, sliding by more slowly
  hills = document.createElement('canvas'); hills.width = Math.round(w * .45) + LW; hills.height = LH;
  const h = hills.getContext('2d'), base = Yp(400);
  for (let x = 0; x < hills.width; x++) {
    const end = Math.min(1, Math.max(0, Math.min((x - 190) / 170, (hills.width - LW * .62 - x) / 170))), e = end * end * (3 - 2 * end);
    for (const [amp, f1, ph, cols] of [[86, .0105, 1, [P.leaf, P.pine, P.teal]], [52, .019, 4, [P.grass, P.leaf, P.pine]]]) {
      const top = base - Math.round(e * (amp * (.62 + .38 * Math.sin(x * f1 + ph)) + 4 * Math.abs(Math.sin(x * .13 + ph)) + 3 * Math.abs(Math.sin(x * .31))));
      if (e < .04) continue;
      for (let y = top; y < base + Math.round(8 * Math.min(1, e * 4)); y++) { const n = hsh(Math.floor(x / 4) * 3.3 + Math.floor(y / 3) * 7.9 + ph); h.fillStyle = y === top ? P.outline : y - top < 3 && n < .5 ? cols[0] : n < .1 ? cols[0] : n > .9 ? cols[2] : dither(x & 255, y) < (y - top) / amp * .5 ? cols[2] : cols[1]; h.fillRect(x, y, 1, 1); }
    }
  }
}

// ============================================================================
// Hammocks and sleepers
// ============================================================================
// cx, ground: the middle, on screen (pixels). state: 'asleep', 'awake', 'half'. empty: no one in it (or fallen).
function hammock(g, who, cx, ground, state, { empty = false, half = 50 } = {}) {
  const HALF = half;
  const D = CLOTH[who] || CLOTH.empty, br = empty ? 0 : Math.round(Math.sin(S.T * 1.5 + cx * .01) * .9 + .5), sway = empty ? 0 : Math.round(Math.sin(S.T * .7 + who.length) * 1.4);
  const rope = x => ground - 17 - Math.round(31 * (Math.abs(x) / HALF) ** 1.7);
  const k0 = M.dents[who] || 0, dent = Math.round(9 * k0 * Math.cos((1 - k0) * 16));   // (wobbling, after a bounce)
  const line = x => rope(x) + Math.round(dent * Math.max(0, 1 - (x / HALF) ** 2));
  for (let x = -HALF; x <= HALF; x++) {   // the ropes, to the trees
    if (Math.abs(x) < 33) continue;
    g.fillStyle = P.outline; g.fillRect(cx + x, line(x) - 1, 1, 4); g.fillStyle = who === 'fisherman' ? P.gold : P.tan; g.fillRect(cx + x, line(x), 1, who === 'fisherman' ? 2 : 1);
    if (who === 'fisherman' && x % 3 === 0) { g.fillStyle = P.ochre; g.fillRect(cx + x, line(x) + 1, 1, 1); }
  }
  if (!empty) {   // the body, humped up out of the cloth: belly, knees, feet
    for (let x = -18; x <= 32; x++) {
      const k = (x + 18) / 50, hump = Math.round(5 + 6 * Math.sin(Math.PI * Math.min(1, k * 1.5)) + (k > .6 ? 4 * Math.sin(Math.PI * (k - .6) / .4) : 0) + (k < .6 ? br : 0)), top = line(x) - hump + 3;
      for (let y = top - 1; y < line(x) + 2; y++) { const foot = k > .9; g.fillStyle = y === top - 1 ? P.outline : foot ? (y - top < 2 ? C.S : C.s) : (x + y * 2 + 300) % 13 < 2 ? D.dress[1] : dither((cx + x) & 255, y) < (y - top) / 11 ? D.dress[1] : D.dress[0]; g.fillRect(cx + x + sway, y, 1, 1); }
    }
    g.fillStyle = P.outline; g.fillRect(cx + 33 + sway, line(32) - 5, 1, 6);
    put(g, HEADS[who][state] || HEADS[who].asleep, cx - 25 + sway, line(-24) + 1 - br - (state === 'awake' ? 3 : 0));
    // an arm, hanging over the side; or held out, with a plum
    if (who === 'woman' && state === 'awake') {
      for (let i = 0; i < 16; i++) { const ax = cx - 10 + i + sway, ay = line(-8) - 7 - Math.round(i * .5); g.fillStyle = P.outline; g.fillRect(ax, ay - 1, 1, 6); g.fillStyle = i < 7 ? D.dress[0] : C.S; g.fillRect(ax, ay, 1, 4); }
      put(g, FRUIT, cx + 8 + sway, line(-8) - 13);
    }
  }
  for (let x = -36; x <= 36; x++) {   // the cloth, in front of them
    const t = line(x) - (Math.abs(x) > 30 ? 0 : 1), deep = Math.round((empty ? 5 : 12) * Math.sqrt(Math.max(0, 1 - (x / 37) ** 2)));
    for (let y = t; y <= t + deep; y++) { const q = (y - t) / Math.max(1, deep); g.fillStyle = y === t || y === t + deep ? P.outline : Math.floor((x + 100) / 5) % 4 === 0 ? D.cloth[2] : dither((cx + x) & 255, y) < q * 1.1 - .2 ? D.cloth[1] : D.cloth[0]; g.fillRect(cx + x + sway, y, 1, 1); }
  }
  if (!empty && state === 'asleep') {
    if (who !== 'woman') for (let i = 0; i < 13; i++) { const ax = cx + 2 + sway, ay = line(4) + 6 + i; g.fillStyle = P.outline; g.fillRect(ax - 1, ay, 6, 1); g.fillStyle = i < 6 ? D.dress[0] : C.S; g.fillRect(ax, ay, 4, 1); }
    zs(cx - 16, line(-24) - 18, who.length);
  }
}
function zs(x, y, seed = 0) {
  for (let i = 0; i < 3; i++) { const k = (S.T * .3 + i / 3 + seed * .13) % 1; if (k < .94) put(lg, ZS[Math.min(2, Math.floor(k * 3))], x + k * 18 + Math.sin(k * 9 + i) * 3, y - k * 36); }
}
// The fisherman, sitting on the grass, his hat on, watching the crab walk up and down.
const SITTING = grid([
  '.......OOOOOO.......', '.....OOTOOTOOOO.....', '...OOTOOTOOTOOTOO...', '..OTOOTOOTOOTOOTOO..', '...BBBBBBBBBBBBBB...', '.....SSSSSSSSSS.....', '.....SSkSSSSkSS.....', '.....SSkSSSSkSS.....', '.....SsSSSSSSsS.....', '......hSSmmmSh......', '......hhhhhhhh......', '.......hhhhhh.......',
  '.......xxSSxx.......', '....xxxxxWWxxxxx....', '..xxxxxxxWWxxxxxxx..', '.xxxxxxxxWWxxxxxxxx.', '.xxxxxxxxWWxxxxxxxx.', '.xxxxxxxxxxxxxxxxxx.', 'xxxxnxxxxxxxxxxnxxxx', 'xxxxnxxxxxxxxxxnxxxx', 'xxxxnxxxxxxxxxxnxxxx', 'xxxxnxxxxxxxxxxnxxxx', 'xxxxnxxxxxxxxxxnxxxx', '.xxxxnxxxxxxxxnxxxx.', '.xSSSnxxxxxxxxnSSSx.', '..SSSSnnnnnnnnSSSS..', '..BBBSSBBBBBBSSBBB..', '.BBBBBBBBBBBBBBBBBB.', 'BBBBBBBBBBBBBBBBBBBB', 'BBBBBbbBBBBBBbbBBBBB', 'BbbbbbbbbbbbbbbbbbbB', '.SSSb..........bSSS.']);
function fishermanSitting(cx, ground) {
  put(lg, SITTING, cx - 16, ground + 1);
  const t = S.T * .5, x = cx - 52 + Math.round(Math.sin(t) * 14);
  put(lg, CRAB[Math.abs(Math.cos(t)) > .25 ? Math.floor(S.T * 6) % 2 : 0], x, ground + 1);
}

// ============================================================================
// The raft, the reeds, and what lies about
// ============================================================================
function raft(x, y) {   // three logs and a plank, pixels; y: the water it floats on
  const bob = Math.round(Math.sin(S.T * 1.4) * 1.2);
  for (let i = -34; i <= 34; i++) for (let j = 0; j < 9; j++) { const e = j === 0 || j === 8 || Math.abs(i) === 34, n = hsh(Math.floor(i / 5) * 2.7 + Math.floor(j / 3) * 7.1); lg.fillStyle = e || j === 4 ? P.outline : j < 4 ? (n < .25 ? P.wood : P.tan) : n < .3 ? P.brown : P.wood; lg.fillRect(x + i, y + bob - 4 + j, 1, 1); }
  for (const i of [-22, 22]) { lg.fillStyle = P.outline; lg.fillRect(x + i - 2, y + bob - 5, 6, 11); lg.fillStyle = M.rope === 'kept' ? P.gold : P.brown; lg.fillRect(x + i - 1, y + bob - 4, 4, 9); }
  if (M.phase === 'leave') for (let j = 0; j < 46; j++) {   // the blanket for a sail, on a pole
    lg.fillStyle = P.outline; lg.fillRect(x - 29, y + bob - 4 - j, 3, 1); lg.fillStyle = P.wood; lg.fillRect(x - 28, y + bob - 4 - j, 1, 1);
    if (j > 14 && j < 44) { const w = 16 + Math.round(5 * Math.sin((j - 14) / 30 * Math.PI)); for (let i = 0; i < w; i++) { lg.fillStyle = clothAt(i, 44 - j, j === 15 || j === 43 || i === w - 1); lg.fillRect(x - 26 + i, y + bob - 4 - j, 1, 1); } }
  }
  if (M.phase === 'leave') for (let i = 0; i < 30; i++) { lg.fillStyle = P.outline; lg.fillRect(x + 22 + Math.round(i * .4) - 1, y + bob - 6 - i + 12, 4, 1); lg.fillStyle = P.ochre; lg.fillRect(x + 22 + Math.round(i * .4), y + bob - 6 - i + 12, 2, 1); }
  return bob;
}
function reeds(list, front) {
  for (const [wx, n, tall, seed] of list) for (let i = 0; i < n; i++) {
    const x0 = X(wx + (hsh(seed + i * 3.1) - .5) * n * 7), h = Math.round(tall * (.65 + hsh(seed + i) * .5)), y0 = Yp(Math.max(groundY(wx), PLUM.sea - 2)) + 5, lean = (hsh(seed * 2 + i) - .5) * 10 + Math.sin(S.T * 1.2 + wx * .02 + i * .7) * 2.5;
    if (x0 < -20 || x0 > LW + 20) continue;
    for (let k = 0; k < h; k++) { const q = k / h, x = Math.round(x0 + lean * q * q); lg.fillStyle = P.outline; lg.fillRect(x - 1, y0 - k, 3, 1); lg.fillStyle = front ? (i % 2 ? P.leaf : P.grass) : (i % 2 ? P.pine : P.leaf); lg.fillRect(x, y0 - k, 1, 1); }
    if (i % 3 === 0) { const x = Math.round(x0 + lean), y = y0 - h; lg.fillStyle = P.outline; lg.fillRect(x - 2, y - 8, 5, 10); lg.fillStyle = P.wood; lg.fillRect(x - 1, y - 7, 3, 8); lg.fillStyle = P.ochre; lg.fillRect(x - 1, y - 7, 1, 8); }   // a bulrush's head
  }
}
// The blanket: a persimmon-red cloth, a small white pattern of crosses on it. (i, j: where on it.)
const clothAt = (i, j, edge) => { const a = (((i + (Math.floor(j / 7) % 2) * 4) % 8) + 8) % 8, b = ((j % 7) + 7) % 7; return edge ? P.outline : (a === 3 && b > 1 && b < 5) || (b === 3 && a > 1 && a < 5) ? P.foam : dither((i + 300) & 255, (j + 300) & 255) < j / 60 ? P.rosewood : P.rust; };
// caught on a treetop, hanging down over the leaves and stirring in the wind
function blanket(x, y) {
  for (let i = -14; i <= 14; i++) {
    const top = y - 4 + Math.round(i * i * .035), h = 15 + Math.round(Math.sin(i * .45 + S.T * 1.8) * 1.5 + (i % 7 === 0 ? 1 : 0));
    for (let j = 0; j < h; j++) { lg.fillStyle = clothAt(i, j, j === 0 || j === h - 1 || Math.abs(i) === 14); lg.fillRect(x + i, top + j, 1, 1); }
  }
}
const WASP = [['.mm.mm.', '..mmm..', 'KoKoKo.', 'oKoKoKk', '.oKoK..'], ['.......', 'mmm.mm.', 'KoKoKo.', 'oKoKoKk', '.oKoK..']].map(r => outline(r.map(q => [...q].map(ch => (ch === '.' ? null : ch === 'm' ? P.mist : C[ch])))));
const MARKER = ['KKKKKKK', 'KWWWWWK', '.KWWWK.', '..KWK..', '...K...'];
function marker(x, y) { MARKER.forEach((r, j) => [...r].forEach((ch, i) => { if (ch !== '.') { lg.fillStyle = ch === 'K' ? P.outline : P.white; lg.fillRect(x - 3 + i, y + j, 1, 1); } })); }

// How full Ichigo's belly is (a rice ball that's eaten away as they get hungry), and how many plums they've had.
const BALL = scale2x(['......KKKK......', '.....KwwwwK.....', '....KwwwwwwK....', '...KwwwwwwwwK...', '...KwwwwwwwwK...', '..KwwwwwwwwwwK..', '..KwwwwwwwwwwK..', '.KwwwwwwwwwwwwK.', '.KwwwwnnnnwwwwK.', 'KwwwwwnnnnwwwwwK', 'KwwwwwnnnnwwwwwK', 'KwwwwwnnnnwwwwwK', '.KwwwwnnnnwwwwK.', '..KKKKKKKKKKKK..']);
const PIT = scale2x(['..KK..', '.KVVK.', 'KVlVVK', 'KVVVvK', 'KVVvvK', '.KKKK.']);
function meters() {
  const x0 = 16, y0 = 40, low = M.belly < PLUM.growl, rows = BALL.length, cut = rows - Math.round((rows - 2) * M.shown) - 1;
  if (!(low && Math.sin(S.T * 9) < -.4)) BALL.forEach((r, j) => [...r].forEach((ch, i) => { if (ch === '.') return; const gone = j < cut && ch !== 'K'; lg.fillStyle = ch === 'K' ? (low ? P.red : P.outline) : gone ? P.slate : ch === 'n' ? P.pine : P.white; lg.fillRect(x0 + i, y0 + j, 1, 1); }));
  for (let i = 0; i < PLUM.asleep; i++) {   // the plums eaten: the last of them drains away as it wears off
    const left = i < M.sleep - 1 ? 1 : i === M.sleep - 1 ? (M.phase === 'asleep' ? 1 : Math.max(0, M.wear / PLUM.wears)) : 0, cut = Math.round(PIT.length * (1 - left));
    PIT.forEach((r, j) => [...r].forEach((ch, k) => { if (ch === '.') return; lg.fillStyle = ch === 'K' ? P.outline : j >= cut ? (ch === 'V' ? P.plum : ch === 'l' ? P.rose : P.violet) : P.slate; lg.fillRect(x0 + 42 + i * 15 + k, y0 + 10 + j, 1, 1); }));
  }
}

const RAFTLET = scale2x(['KKKKKKKKKKKK', 'KTTTTKTTTTTK', 'KbbbbKbbbbbK', 'KKKKKKKKKKKK'].map(r => r));
// What the raft needs, in a row under them: grey until it's found.
function needs() {
  const list = raftNeeds();
  RAFTLET.forEach((r, j) => [...r].forEach((ch, i) => { if (ch !== '.') { lg.fillStyle = C[ch]; lg.fillRect(16 + i, 86 + j, 1, 1); } }));   // (a little raft, and what it needs)
  list.forEach(([id, got], i) => { const x = 46 + i * 32; lg.fillStyle = got ? P.gold : P.mist; lg.fillRect(x - 1, 75, 30, 30); lg.fillStyle = P.night; lg.fillRect(x, 76, 28, 28); drawIcon(lg, id, x, 76, { grey: !got }); });
}

// --- sleepiness: the edges of the screen going dark, one picture for each plum ---
const dusk = [];
function drowsy() {
  const k = Math.min(3, M.dim + (M.phase === 'asleep' ? 1 : 0));
  for (let n = 1; n <= 3; n++) {
    if (k < n - .6) continue;
    if (!dusk[n]) {
      const cv = dusk[n] = document.createElement('canvas'); cv.width = LW; cv.height = LH; const g = cv.getContext('2d'); g.fillStyle = [0, P.violet, P.plum, P.night][n];
      for (let y = 0; y < LH; y++) for (let x = 0; x < LW; x++) { const dx = (x - LW / 2) / (LW / 2), dy = (y - LH * .62) / (LH * .62), d = Math.sqrt(dx * dx + dy * dy); if (dither(x, y) < (d - (1.02 - n * .13)) * 1.5) g.fillRect(x, y, 1, 1); }
    }
    lg.drawImage(dusk[n], 0, 0);
  }
  // eyelids: a blink now and then when Ichigo's had two; closing for good after three
  const lid = M.phase === 'asleep' ? Math.min(1, M.t / 2.2) : M.sleep >= 2 ? Math.max(0, Math.sin(S.T * 1.1) - .93) * 9 : 0;
  if (lid > 0) { const h = Math.round(LH * .52 * Math.min(1, lid)); lg.fillStyle = P.night; for (let x = 0; x < LW; x++) { const c = Math.round(Math.sin(Math.PI * x / LW) * 22); lg.fillRect(x, 0, 1, Math.max(0, h - c)); lg.fillRect(x, LH - Math.max(0, h - c), 1, h); } }
}

// ============================================================================
export function drawPlum() {
  const L = S.level;
  if (!island || island.level !== L) { paintIsland(); island.level = L; }
  beginWorld(); drawScenery(lg, S.camX * .6, S.T, L.fuji, { sky: 'late' });
  pixelSpace(lg); drawLife(lg, S.camX * .3, S.T);
  const cam = Math.round(S.camX / PIXEL);
  lg.drawImage(hills, -Math.round(cam * .45), 0);
  reeds([[2410, 9, 46, 3], [2500, 8, 52, 9], [2360, 5, 38, 5]], false);
  lg.drawImage(island, -cam, 0);

  // what hangs and lies about
  const gx = x => Yp(groundY(x));
  for (let i = 0; i < M.ripe; i++) { const [dx, dy] = [[-18, -58], [16, -66], [2, -80]][i]; put(lg, ORANGE, X(L.orange) + dx + (M.shakeT > 0 ? Math.round(Math.sin(S.T * 50)) : 0), gx(L.orange) + dy); }
  const ws = M.woman === 'asleep' || M.woman === 'done' ? 'asleep' : 'awake';
  for (const x of L.hammocks) { const t = L.trees.map(q => q[0]); hammock(lg, x, X(x), gx(x), '', { empty: true, half: Math.round((Math.min(...t.filter(q => q > x)) - Math.max(...t.filter(q => q < x))) / 2 / PIXEL) - 3 }); }   // (from tree to tree)
  hammock(lg, 'woman', X(L.woman), gx(L.woman), ws);
  if (M.fisher !== 'sat') hammock(lg, 'fisherman', X(L.fisherman), gx(L.fisherman), M.fisher === 'up' ? 'awake' : 'asleep');
  else { fishermanSitting(X(L.fisherman), gx(L.fisherman)); if (M.rope === 'lying') put(lg, ROPE, X(L.fisherman) + 22, gx(L.fisherman) + 1); }
  if (M.fisher === 'up') put(lg, CRAB[Math.floor(S.T * 6) % 2], X(L.fisherman) + 4, gx(L.fisherman) + 1);
  const sail = M.sailor === 'up' ? 'awake' : M.sailor === 'half' ? 'half' : 'asleep';
  hammock(lg, 'sailor', X(L.sailor), gx(L.sailor), sail);
  if (!M.paddle) { const px0 = X(L.sailor) + 6, py = gx(L.sailor) - 30; for (let i = 0; i < 40; i++) { lg.fillStyle = P.outline; lg.fillRect(px0 + i, py + Math.round(i * -.28) - 1, 1, i > 28 ? 8 : 4); lg.fillStyle = i > 28 ? P.ochre : P.wood; lg.fillRect(px0 + i, py + Math.round(i * -.28), 1, i > 28 ? 6 : 2); } }   // his paddle, sticking out from under him
  for (const c of M.clams) if (c.t > 0) { const x = X(c.x), y = gx(c.x); lg.fillStyle = P.bark; lg.fillRect(x - 4, y + 1, 9, 2); for (let i = 0; i < 3; i++) { const k = (S.T * 1.2 + i / 3) % 1; lg.fillStyle = P.outline; lg.fillRect(x - 4 + i * 4 - 1, y - Math.round(k * 7) - 1, 4, 4); lg.fillStyle = P.mist; lg.fillRect(x - 4 + i * 4, y - Math.round(k * 7), 2, 2); } }   // a clam's bubbles
  for (const c of M.crabs) if (!c.hide) put(lg, CRAB[Math.floor(c.t * 6) % 2], X(c.x), gx(c.x) + 1);
  for (const o of M.oranges) put(lg, ORANGE, X(o.x), Yp(o.y) + 3);
  for (const p of M.plums) if (!p.eaten) put(lg, FRUIT, X(p.x), Yp(p.lying ? groundY(p.x) : p.y) + (p.lying ? 1 : 3));

  // up in the trees: the blanket, the kite, and the wasps
  if (!M.blanket) blanket(X(L.blanket), Yp(thingY('blanket')));
  if (!M.kite) { const sw = Math.round(Math.sin(S.T * 1.6) * 2); put(lg, THINGS.kite.grid, X(L.kite) + sw, Yp(thingY('kite')) - 2); }
  for (const w of M.wasps) put(lg, WASP[Math.floor(S.T * 24) % 2], X(w.px), Yp(w.py), Math.sin(w.t * 1.3) > 0);

  // the raft (behind the reeds at its front), Ichigo
  const ended = S.scene === 'end', cover = S.scene === 'dawn' && S.sceneT < 1.45, leaving = M.phase === 'leave';
  const rb = Math.round(Math.sin(S.T * 1.4) * 1.2);
  const ix = X(M.x) + (leaving ? 8 : 0), sitting = M.seated || ended, feet = leaving ? Yp(PLUM.sea) - 4 + rb : Yp(M.y);
  if (!cover && !leaving) ichigo(ix, feet, sitting);
  drawChartSea(lg, S.camX, S.T, seaAt, 0, LW, false, 'day');
  raft(X(M.raftX), Yp(PLUM.sea) + 2);   // (on the water)
  if (leaving) ichigo(ix, feet, sitting);
  reeds([[2395, 5, 30, 21], [2490, 6, 34, 33]], true);
  for (const q of parts) if (q.life > .05) { const n = toPx(2 * (q.s || 1)); lg.fillStyle = q.c; lg.fillRect(X(q.x), Math.round(q.y / PIXEL + TOP_PX), n, n); }
  if (S.scene === 'plum') sailorMeter();
  drowsy();
  if (M.sleep > 0 && M.phase === 'play' && M.sleep < 3 && !sitting) { const k = (S.T * .4) % 1; if (M.sleep > 1) put(lg, ZS[k < .5 ? 0 : 1], ix + 12 + k * 8, feet - 46 - k * 16); }
  if (M.phase === 'asleep') zs(ix + 14, feet - 34);

  const head = feet - (sitting ? 34 : spriteHeight());
  if (S.scene === 'plum') {
    const act = action(); if (act) marker(X(act.x), Math.round((act.x === M.x ? head - 10 : Math.min(gx(act.x) - 16, Yp(M.y) - 16)) + Math.sin(S.T * 5) * 1.5) - (['rain', 'crab', 'splash', 'nocrab', 'plum', 'shake'].includes(act.do) ? 44 : 0));
    const heads = { ichigo: [ix, head], woman: [X(L.woman) - 22, gx(L.woman) - 46], sailor: [X(L.sailor) - 22, gx(L.sailor) - 48], fisherman: M.fisher !== 'sat' ? [X(L.fisherman) - 22, gx(L.fisherman) - 46] : [X(L.fisherman) - 16, gx(L.fisherman) - 36] };
    for (const who of Object.keys(heads)) if (heads[who][0] < -50 || heads[who][0] > LW + 50) delete heads[who];   // (no one's heard from off the screen)
    drawBubbles(lg, heads);
  }
  if (S.scene === 'dawn') drawDawn(lg, S.sceneT, S.deaths - 1);
  if (S.scene === 'dawn' && S.sceneT >= 1.45) ichigo(ix, feet, false);
  if (!ended && !(S.scene === 'dawn' && S.sceneT > .3 && S.sceneT < 1.5)) { drawHUD(progress()); meters(); needs(); }
  if (M.hint && M.hintT > 0 && S.scene === 'plum') {
    const lines = ['']; for (const word of M.hint.split(' ')) { const c = lines[lines.length - 1]; if (c && (c + ' ' + word).length > 34) lines.push(word); else lines[lines.length - 1] = c ? c + ' ' + word : word; }
    const w = Math.max(...lines.map(l => l.length)) * LETTER + 16, h = lines.length * LINE + 12, x = Math.round((LW - w) / 2);
    lg.fillStyle = P.mist; lg.fillRect(x - 1, 349 - h, w + 2, h + 2); lg.fillStyle = P.night; lg.fillRect(x, 350 - h, w, h);   // (low down, over the sea: Ichigo may be up in the trees)
    lines.forEach((l, i) => pixelText(l, LW / 2, 357 - h + i * LINE, P.mist, 'center'));
  }
  if (ended) drawEndFg(S.sceneT);
}
// How far through the level Ichigo is: the raft, and what it needs.
const progress = () => (M.seenRaft ? .2 : .2 * Math.min(1, M.x / S.level.raft)) + .2 * raftNeeds().filter(([, got]) => got).length + (M.phase === 'leave' ? .2 : 0);

// How awake the old sailor is: a small bar over him, once he's been splashed.
function sailorMeter() {
  if (M.sailor === 'up' || M.awake <= 0) return;
  const w = 34, x = X(S.level.sailor) - w / 2, y = Yp(groundY(S.level.sailor)) - 74;
  lg.fillStyle = P.outline; lg.fillRect(x - 1, y - 1, w + 2, 6); lg.fillStyle = P.night; lg.fillRect(x, y, w, 4);
  lg.fillStyle = P.aqua; lg.fillRect(x, y, Math.round(w * M.awake / PLUM.sailor.awake), 4);
}
function ichigo(ix, feet, sitting) {
  const step = Math.floor(M.anim / 1.6) % 2, running = Math.abs(M.v) > 220;
  const frame = sitting ? 'sit' : M.air ? (!M.bucket && (M.vy < -300 || M.row) ? 'jump' : 'balance') : M.pouring > 0 ? 'dig1' : M.digging > 0 ? (Math.sin(S.T * 14) > 0 ? 'dig1' : 'dig2') : M.moving ? ['stand', 'step1', 'stand', 'step2'][Math.floor(M.anim / 1.6) % 4] : 'stand';
  const hair = M.air ? [1, M.vy > 120 ? 2 : 0] : M.moving ? [(running ? 1 : 0) + step, step] : [0, 0];
  const shut = M.phase === 'asleep' || M.yawn > 0 || (M.sleep >= 2 && Math.sin(S.T * 1.7) > .8);
  const marks = [...markIds(), M.bucket === 'water' ? 'water' : null, M.sulk > 0 || M.belly <= 0 ? 'pout' : null, shut ? 'asleep' : null].filter(Boolean);
  drawSprite(lg, frame, ix, feet, M.face, Math.min(5, S.deaths), hair, marks);
  if (M.bucket === 'crab' && !sitting) put(lg, CLAWS, ix + M.face * 11 + Math.round(Math.sin(S.T * 12) * .8), feet - 19);
  if (M.bonk > 0) for (let i = 0; i < 3; i++) { const a = S.T * 7 + i * 2.1, x = ix + Math.round(Math.cos(a) * 13), y = feet - 48 + Math.round(Math.sin(a) * 4); lg.fillStyle = P.gold; lg.fillRect(x - 1, y, 3, 1); lg.fillRect(x, y - 1, 1, 3); }   // seeing stars
}
