// ============================================================================
// stormart.js — how Level 5 looks (storm.js is how it plays): a fair morning, Fuji and the land getting nearer; then
// the storm, in dots from the same sky to a black one, with rain, foam, lightning and waves; and the first light after it.
// ============================================================================
import { W, LW, LH, TOP_PX, PIXEL, P, STORM, toPx } from './config.js';
import { S, parts } from './state.js';
import { lg, lo, beginWorld, pixelSpace, dither, pack, pixelBuffer } from './pixel.js';
import { pixelText, LETTER, LINE } from './text.js';
import { drawScenery, drawChartSea, hsh } from './art.js';
import { drawSprite, spriteHeight, markIds, outline } from './sprite.js';
import { drawBubbles } from './bubbles.js';
import { drawDawn } from './dawn.js';
import { drawHUD, drawEndFg } from './scenes.js';
import { THINGS } from './things.js';
import { clothAt } from './plumart.js';
import { CREST, CRAB } from './tideart.js';
import { R, MAST, seaAt, deckAt, action, prompt, gusting, warned, onRaft, pinX, plankX, mastX } from './storm.js';

const X = x => Math.round((x - S.camX) / PIXEL), Yp = y => Math.round(y / PIXEL + TOP_PX), r = (x, y, w, h, c) => { lg.fillStyle = c; lg.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
const smooth = k => { k = Math.max(0, Math.min(1, k)); return k * k * (3 - 2 * k); };
const C = { K: P.outline, B: P.brown, b: P.wood, O: P.ochre, T: P.tan, g: P.grey2, G: P.grey3, R: P.red, r: P.rust, h: P.grey1 };
const grid = rows => outline(rows.map(q => [...q].map(ch => (ch === '.' ? null : C[ch]))));
const put = (gr, cx, bottom, flip = false, g = lg) => { const w = gr[0].length, x0 = Math.round(cx - w / 2), y0 = Math.round(bottom) - gr.length + 1; gr.forEach((row, j) => row.forEach((c, i) => { if (c) { g.fillStyle = c; g.fillRect(x0 + (flip ? w - 1 - i : i), y0 + j, 1, 1); } })); };

// ============================================================================
// The sky, Fuji, and the land
// ============================================================================
const stormy = document.createElement('canvas'), tile = document.createElement('canvas'); stormy.width = LW; stormy.height = LH; tile.width = tile.height = 4;
const FUJI = { rows: 26, half: 28 };
function dotTile(k, col) { const t = tile.getContext('2d'); t.clearRect(0, 0, 4, 4); t.fillStyle = col; for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) if (dither(x, y) < k) t.fillRect(x, y, 1, 1); return t; }
function dots(g, k, col) { dotTile(k, col); g.fillStyle = g.createPattern(tile, 'repeat'); g.fillRect(0, 0, LW, LH); }
// How near the land is (0..1).
const near = () => Math.max(0, Math.min(1, R.dist / S.level.sail.goal));
function scenery() {
  const k = near(), cam = S.camX * .25, x = S.level.fuji.x + cam * .05, grown = { rows: Math.round(FUJI.rows * (1 + k * .75)), half: Math.round(FUJI.half * (1 + k * .75)) };   // (Fuji stays put on the screen, and grows)
  const day = () => { beginWorld(); drawScenery(lg, cam, S.T, { view: 'day', x, ...grown }, { sky: 'day' }); pixelSpace(lg); land(k); };
  const dark = () => { beginWorld(); drawScenery(lg, cam, S.T, { view: R.light > .3 ? 'day' : 'night', ...(R.dark < 1 ? { x, ...grown } : { x: R.light > .3 ? x : 5000 }) }, { sky: 'storm', light: R.light }); pixelSpace(lg); if (R.dark < 1) land(k); };   // (lost in the rain, until it gets light)
  if (R.dark <= 0) { day(); return; }
  if (R.dark >= 1) { dark(); return; }
  dark(); const g = stormy.getContext('2d'); g.globalCompositeOperation = 'source-over'; g.drawImage(lo, 0, 0); g.globalCompositeOperation = 'destination-in'; dots(g, R.dark, '#000'); g.globalCompositeOperation = 'source-over';
  day(); lg.drawImage(stormy, 0, 0);
}
// Hills coming up on the right, with roofs and smoke, as the raft nears them.
function land(k) {
  const s = smooth((k - .38) / .62); if (s <= 0) return;
  const base = Yp(391), x0 = Math.round(LW - 300 * s);
  for (let x = x0; x < LW; x++) {
    const q = (x - x0) / 300, h = Math.round(s * (16 + 46 * Math.sin(Math.min(1, q * 1.3) * Math.PI / 2) ** 1.6 + 7 * Math.sin(x * .05) + 3 * Math.sin(x * .17)) * Math.min(1, q * 7)); if (h < 1) continue;
    for (let y = base - h; y <= base; y++) { const d = y - base + h, n = hsh(Math.floor(x / 3) * 3.7 + Math.floor(y / 2) * 9.1); lg.fillStyle = d === 0 ? P.outline : d < 3 ? P.leaf : n < .2 ? P.pine : dither(x & 255, y & 255) < .5 - d / 90 ? P.leaf : P.pine; lg.fillRect(x, y, 1, 1); }
    if (x % 2) r(x, base, 1, 2, P.tan);
  }
  if (s > .35) for (const [dx, up, w] of [[96, 6, 15], [124, 9, 18], [160, 7, 14], [196, 13, 17], [228, 9, 15]]) {
    const x = Math.round(x0 + dx * s + 20), y = Math.round(base - up * s), w2 = Math.round(w * s), h = Math.round(8 * s);
    r(x - w2 / 2, y - h, w2, h, P.outline); r(x - w2 / 2 + 1, y - h, w2 - 2, h - 1, P.tan); for (let j = 0; j < Math.round(9 * s); j++) { const hw = Math.round((j + 2) * .95); r(x - hw, y - h - Math.round(9 * s) + j, hw * 2, 1, j === 0 ? P.outline : P.olive); r(x - hw, y - h - Math.round(9 * s) + j, 1, 1, P.outline); r(x + hw - 1, y - h - Math.round(9 * s) + j, 1, 1, P.outline); }
    if (dx % 64 < 34) for (let j = 0; j < 16; j++) { const sx = x + Math.round(Math.sin(j * .4 - S.T * 1.4) * (1 + j * .25) + j * .4); if ((j + Math.floor(S.T * 3)) % 4) r(sx, y - h - 11 - j * 2, 2, 2, j < 8 ? P.grey0 : P.foam); }
  }
}

// ============================================================================
// The raft
// ============================================================================
// Logs lashed side by side, seen from the side; `half` long each way, tilted by `ang`. (The same wood as ever: lighthouseart.js.)
export function bigRaft(g, cx, cy, half, ang, { sail = 0, mast = true, loose = null, ropes = true } = {}) {
  const cos = Math.cos(ang), tan = Math.tan(ang), q = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), w, h); };
  const n = Math.round(half * cos);
  for (let i = -n; i <= n; i++) {
    const log = Math.floor((i + 400) / 46), y = Math.round(cy + i * tan), e = Math.abs(i) === n, lift = loose && Math.sign(i) === loose.side && Math.abs(i) > n - 30 ? Math.round((Math.abs(i) - n + 30) * .16 * Math.sin(S.T * 9) - (Math.abs(i) - n + 30) * .1) : 0;
    for (let j = 0; j < 10; j++) { const k = hsh(Math.floor((i + 400) / 5) * 2.7 + Math.floor(j / 3) * 7.1 + log); g.fillStyle = e || j === 0 || j === 9 || j === 5 || (i + 400) % 46 === 0 ? P.outline : j < 5 ? (k < .25 ? P.wood : j === 1 ? P.foam : P.tan) : k < .3 ? P.brown : P.wood; g.fillRect(Math.round(cx + i), y - 4 + j + lift, 1, 1); }
    if ((i + 400) % 46 > 36 && (i + 400) % 46 < 44 && i % 2) for (let j = 6; j < 9; j++) { g.fillStyle = P.tan; g.fillRect(Math.round(cx + i), y - 4 + j + lift, 1, 1); }   // a log's sawn end, under
  }
  if (ropes) for (let u = -half + 18; u <= half - 14; u += 34) { const x = cx + u * cos, y = cy + u * cos * tan; q(x - 2, y - 5, 6, 12, P.outline); q(x - 1, y - 4, 4, 10, P.gold); q(x - 1, y - 2, 4, 1, P.ochre); q(x - 1, y + 2, 4, 1, P.ochre); }
  if (loose) { const u = loose.side * (half - 18), x = cx + u * cos, y = cy + u * cos * tan; for (let j = 0; j < 18; j++) { q(x + Math.sin(S.T * 12 + j * .5) * j * .4 + loose.side * j * .5 - 1, y - 6 - j * .5, 3, 2, P.outline); q(x + Math.sin(S.T * 12 + j * .5) * j * .4 + loose.side * j * .5, y - 6 - j * .5, 1, 1, P.gold); } }
  if (!mast) return;
  const top = 66, lean = -Math.sin(ang);
  for (let j = 0; j < top; j++) { const x = cx - lean * j * -1, y = cy - 4 - j; q(x - 1, y, 5, 1, P.outline); q(x, y, 3, 1, P.wood); q(x, y, 1, 1, P.ochre); }
  q(cx - 4, cy - 14, 11, 4, P.outline); q(cx - 3, cy - 13, 9, 2, P.gold);                                // the rope, coiled round its foot
  if (sail !== null) {   // the blanket: hanging (0), or full one way or the other
    for (let j = 0; j < 40; j++) {
      const bulge = Math.sin((j + 2) / 42 * Math.PI), x0 = cx + lean * -1 * (top - 6 - j) * -1 + (sail >= 0 ? 3 : 0), w = 24 + Math.round(Math.abs(sail) * bulge * 18 + Math.sin(S.T * 3 + j * .2) * (1 - Math.abs(sail)) * 1.6), y = cy - 4 - top + 6 + j;
      for (let i = 0; i < w; i++) { const sx = Math.round(x0 + (sail < -.05 ? -i : i) + Math.abs(sail) * bulge * 4 * Math.sign(sail)); g.fillStyle = clothAt(i, j, j === 0 || j === 39 || i === w - 1 || i === 0); g.fillRect(sx, y, 1, 1); }
    }
    q(cx - 8, cy - top, 40, 4, P.outline); q(cx - 7, cy - top + 1, 38, 2, P.wood);
  }
}
// What washes aboard in the rain, smallest first (storm.js has their sizes): a crab, a sea bream, a pufferfish, an
// octopus, a sea turtle, a tuna. Each faces left, as it comes, and has two frames. (The crab is Level 2's.)
const C2 = { ...C, W: P.white, a: P.aqua, s: P.steel, d: P.deep, n: P.navy, l: P.leaf, p: P.pine, o: P.olive, k: P.pink, e: P.rose, f: P.foam, y: P.gold };
const pic = rows => { const w = Math.max(...rows.map(q => q.length)); return outline(rows.map(q => [...q.padEnd(w, '.')].map(ch => (ch === '.' ? null : C2[ch])))); };
const CREATURES = {
  crab: CRAB,
  bream: [[
    '.....RRRRR.......',
    '...RRRRRRRRR...rr',
    '..RRkRRRRRRRR.rRr',
    '.RWKRRRRRRRRRRRr.',
    'RRRRRRRRRRRRRRRr.',
    '.Rkkkkkkkkkkkr.rr',
    '...kkkkkkkkk...rr',
  ], [
    '.....RRRRR.......',
    '...RRRRRRRRR.....',
    '..RRkRRRRRRRR..rr',
    '.RWKRRRRRRRRRRRRr',
    'RRRRRRRRRRRRRRRRr',
    '.Rkkkkkkkkkkkr..rr',
    '...kkkkkkkkk.....',
  ]].map(pic),
  puffer: [[
    '...O..O..O...',
    '.O.TTTTTTT.O.',
    '..TTOTTTOTTT.',
    'OTWKTTTTTTTTOO',
    '.TKKTTOTTTOTTO',
    'OTTTTTTTTTTTO.',
    '.fffffffffffTO',
    '..fffffffff.O.',
    '.O..O..O..O...',
  ], [
    '....O..O..O..',
    '..OTTTTTTTO..',
    '.OTTOTTTOTTTO',
    '.TWKTTTTTTTTT.O',
    'OTKKTTOTTTOTTO.',
    '.TTTTTTTTTTTTO',
    'OfffffffffffT.',
    '..fffffffff.O.',
    '..O..O..O..O..',
  ]].map(pic),
  octopus: [[
    '.....RRRRRR.....',
    '...RRRRRRRRRR...',
    '..RRRRRRRRRRRR..',
    '..RRrRRRRRRrRR..',
    '..RRRRRRRRRRRR..',
    '..RWKRRRRRRWKR..',
    '...RRRRrrRRRR...',
    '..RRRRRRRRRRRR..',
    '.RR.RR.RR.RR.RR.',
    'RR..R..RR..R..RR',
    'R..RR..R...RR..R',
    'RR.R..RR....R.RR',
  ], [
    '.....RRRRRR.....',
    '...RRRRRRRRRR...',
    '..RRRRRRRRRRRR..',
    '..RRrRRRRRRrRR..',
    '..RRRRRRRRRRRR..',
    '..RWKRRRRRRWKR..',
    '...RRRRrrRRRR...',
    '..RRRRRRRRRRRR..',
    '.RR.RR.RR.RR.RR.',
    '.R..RR..R..RR..R',
    'RR...R.RR...R.RR',
    'R...RR..R..RR...',
  ]].map(pic),
  turtle: [[
    '..........oooooooo.........',
    '.......ooollollolloo.......',
    '.....oollllollllollloo.....',
    '....olllllooooooollllloo...',
    '.TT.ollllopllllpolllllloo..',
    'TTTTolllloplllllpollllllloT',
    'WKTTTooooooooooooooooooooTT',
    'TTTTT.TTTTTTTTTTTTTTTTTT...',
    '.TT..TTTT..........TTTT....',
    '....TTTT............TTT....',
  ], [
    '..........oooooooo.........',
    '.......ooollollolloo.......',
    '.....oollllollllollloo.....',
    '....olllllooooooollllloo...',
    '.TT.ollllopllllpolllllloo..',
    'TTTTolllloplllllpollllllloT',
    'WKTTTooooooooooooooooooooTT',
    'TTTTT.TTTTTTTTTTTTTTTTTT...',
    '..TTTTT..........TTTTT.....',
    '...TT...............TT.....',
  ]].map(pic),
  tuna: [[
    '............nnnn.................',
    '..........nnnnnnn.........yy....n',
    '.....nnnnnnnnnnnnnnnnnnnnnnyynnnn.',
    '...nnnnnnnnnnnnnnnnnnnnnnnnnnnnn..',
    '.nnWKnnnnnnnnnnnnnnnnnnnnnnnnnnn..',
    'nnnKKddddddddddddddddddddddddnnnn.',
    'nssssssssssssssssssssssssssssss.nn',
    '.sssssssssssssssssssssssssssss...n',
    '..ffffffffffffffffffffffffffs.....',
    '....fffffffffffffffffffyy.........',
    '.......ffff......................',
  ], [
    '............nnnn.................',
    '..........nnnnnnn.........yy.....',
    '.....nnnnnnnnnnnnnnnnnnnnnnyynnnnn',
    '...nnnnnnnnnnnnnnnnnnnnnnnnnnnnn.n',
    '.nnWKnnnnnnnnnnnnnnnnnnnnnnnnnnn..',
    'nnnKKddddddddddddddddddddddddnnn..',
    'nssssssssssssssssssssssssssssssnnn',
    '.sssssssssssssssssssssssssssss..nn',
    '..ffffffffffffffffffffffffffs.....',
    '....fffffffffffffffffffyy.........',
    '.......ffff......................',
  ]].map(pic),
};
const MARKER = ['KKKKKKK', 'KWWWWWK', '.KWWWK.', '..KWK..', '...K...'];
function marker(x, y) { MARKER.forEach((q, j) => [...q].forEach((ch, i) => { if (ch !== '.') { lg.fillStyle = ch === 'K' ? P.outline : P.white; lg.fillRect(x - 3 + i, y + j, 1, 1); } })); }
function bar(x, y, k, col) { r(x - 17, y, 36, 6, P.outline); r(x - 16, y + 1, 34, 4, P.night); r(x - 16, y + 1, 34 * Math.max(0, Math.min(1, k)), 4, col); }

function ichigo(ix, feet) {
  const step = Math.floor(R.anim / 1.6) % 2, running = Math.abs(R.vu) > 190, wob = Math.abs(R.ang) > .22 && !R.moving;
  const frame = R.hang ? 'jump' : R.seated ? 'sit' : R.air ? 'balance' : R.scooping > 0 ? (R.scooping > .2 ? 'dig1' : 'dig2') : R.tying > 0 ? (Math.sin(S.T * 12) > 0 ? 'dig1' : 'dig2') : R.holding ? 'balance' : R.stun > 0 ? 'balance' : R.moving ? ['stand', 'step1', 'stand', 'step2'][Math.floor(R.anim / 1.6) % 4] : wob ? 'balance' : 'stand';
  const wind = gusting() ? 2 : warned() ? 1 : R.full > .5 ? 1 : 0, hair = R.air ? [1, R.hopV < 0 ? 2 : 0] : R.moving ? [(running ? 1 : 0) + step, step] : wind ? [Math.min(1, wind), Math.sin(S.T * 14) > 0 ? 1 : 0] : [0, 0];
  drawSprite(lg, frame, ix, feet, R.face, Math.min(5, S.deaths), hair, [...markIds().filter(m => !(m === 'shovel' && R.scooping > 0)), R.sulk > 0 || (R.phase === 'turn' && R.t > 4) || R.phase === 'over' ? 'pout' : null].filter(Boolean));
  if (R.holding) { const mx = X(deckAt(MAST).x) + 1; for (let k = 0; k < 14; k++) { const q = k / 13, x = Math.round(ix + (mx - ix) * q), y = Math.round(feet - 22 + Math.sin(q * Math.PI) * 2 - q * 3); r(x - 1, y - 1, 3, 4, P.outline); r(x, y, 2, 2, P.gold); } }
}

// ============================================================================
// Weather
// ============================================================================
function rain(k, slant) {
  const n = Math.round(210 * k);
  for (let i = 0; i < n; i++) { const h = hsh(i * 3.7), fall = 420 + h * 220, y = (hsh(i * 7.1) * LH + S.T * fall) % LH, x = ((hsh(i * 1.9) * LW - S.T * fall * slant - y * slant) % LW + LW) % LW; lg.fillStyle = h < .4 ? P.mist : P.steel; for (let j = 0; j < 9; j++) lg.fillRect(Math.round(x - j * slant), Math.round(y + j), 1, 1); }
}
// Foam blown across the water and the air ahead of a gust, then all through it.
function foam() {
  const g = R.gust; if (!g) return;
  const on = g.t > STORM.gust.warn, k = on ? 1 : g.t / STORM.gust.warn;
  for (let i = 0; i < (on ? 60 : 34); i++) {
    const h = hsh(i * 5.3), v = (on ? 900 : 560) * (.7 + h * .6), x = LW + 120 - ((S.T * v + hsh(i * 2.1) * 1600) % (LW + 260)), low = hsh(i * 8.7), sx = S.camX + x * PIXEL, y = on ? 40 + low * 236 : Yp(seaAt(sx)) - 3 + Math.round(low * 26), w = Math.round((on ? 26 : 16) + h * 30);
    if (!on && x < LW * (1 - k * 1.15)) continue;   // (it comes in from the right as it nears)
    for (let j = 0; j < w; j++) if (j % 7 !== 6) r(x + j, y + Math.round(Math.sin(j * .16 + i) * 1.5), 1, h < .5 ? 2 : 1, h < .6 ? P.white : P.mist);
  }
}
// A puff of fair wind, behind: the water darkened and wrinkled under it, and a few streaks in the air.
function puffs() {
  for (const p of R.puffs) { const x0 = X(p.x - p.w / 2), x1 = X(p.x + p.w / 2);
    for (let i = 0; i < 16; i++) { const x = x0 + hsh(i * 3.1) * (x1 - x0), y = Yp(seaAt(S.camX + x * PIXEL)) + 2 + hsh(i * 5.9) * 24, w = 8 + hsh(i * 7.7) * 16; r(x, y, w, 1, i % 3 ? P.white : P.navy); }
    for (let i = 0; i < 7; i++) { const x = x0 + hsh(i * 9.1) * (x1 - x0), y = 120 + hsh(i * 4.3) * 110, w = 22 + hsh(i) * 26; for (let j = 0; j < w; j++) if (j % 6 !== 5) r(x + j, y + Math.round(Math.sin(j * .18 + i + S.T * 3) * 2), 1, 1, P.white); }
  }
}
function lightning() {
  if (R.bolt > 0) {
    let x = 420 + hsh((R.boltN || 1) * 3.7) * 190, y = 0; const seed = (R.boltN || 1) * 7.3;
    for (let i = 0; i < 16 && y < Yp(388); i++) { const nx = x + (hsh(seed + i) - .5) * 46, ny = y + 12 + hsh(seed + i * 2) * 12, n = Math.max(1, ny - y); for (let j = 0; j < n; j++) { const bx = x + (nx - x) * j / n; r(bx - 2, y + j, 5, 1, P.slate); r(bx - 1, y + j, 3, 1, P.white); } if (i === 6) for (let j = 0; j < 40; j++) r(nx + j * .7 + Math.sin(j) * 2, ny + j, 2, 1, P.mist); x = nx; y = ny; }
  }
  if (R.flash > 0) dots(lg, R.flash > .38 ? .62 : R.flash > .3 ? .1 : R.flash * .9, P.white);
}
// A breaking wave's crest: foam and claws all along the top of it (after Hokusai's).
function crests() {
  for (const w of R.waves) {
    const cx = X(w.x), top = Yp(seaAt(w.x)); if (cx < -140 || cx > LW + 140) continue;
    if (w.kind === 'swell') { for (let i = -70; i < 90; i++) { const x = cx + i, y = Yp(seaAt(S.camX + x * PIXEL)); if (Math.sin(i * .4 + S.T * 4) > .2) r(x, y + 5 + Math.abs(i) * .05, 1, 1, P.steel); } continue; }
    const big = w.kind === 'last' ? 3 : w.h > 60 ? 2 : 1;
    for (let k = 0; k < big * 2; k++) { const x = cx - 10 + k * 17 - big * 6, y = Yp(seaAt(S.camX + x * PIXEL)) + 5; CREST.forEach((row, j) => row.forEach((c, i) => { if (c) { lg.fillStyle = c; const s = big > 1 ? 2 : 1; lg.fillRect(x - 20 * s + i * s, y - 13 * s + j * s + Math.round(Math.sin(S.T * 7 + k) * 1.5), s, s); } })); }
    for (let i = -60 * big; i < 50 * big; i++) { const x = cx + i, y = Yp(seaAt(S.camX + x * PIXEL)); if (hsh(Math.floor(i / 3) + Math.floor(S.T * 8)) < .7) r(x, y - 1, 1, 3, P.white); if (i < 0 && hsh(i * 3.3 + Math.floor(S.T * 9)) < .3) r(x, y + 3 + hsh(i) * 14, 2, 1, P.mist); }
  }
}

// ============================================================================
export function drawStorm() {
  const ended = S.scene === 'end', cover = S.scene === 'dawn' && S.sceneT < 1.45, story = S.scene === 'story', raft = onRaft(), tone = R.dark > .5 && R.light < .5 ? 'storm' : 'day';
  scenery();
  if (R.bolt > 0) lightning();
  masts();
  if (R.phase === 'sail' || R.phase === 'turn') { gull(); puffs(); }
  if (R.dark > .6 && R.light < .6) rain(.35 * (1 - R.light), .5);

  let ix, feet, head;
  if (raft) {
    const cx = X(R.x), cy = Yp(R.y), sail = R.sail ? (R.phase === 'turn' && R.t > 4 ? -Math.min(1, (R.t - 4) / 2) : R.dark >= 1 ? (gusting() ? -1 : -.45 + Math.sin(S.T * 5) * .15) : Math.max(R.full, .08)) : null;
    bigRaft(lg, cx, cy, R.hw / PIXEL, R.ang, { sail, loose: R.loose });
    if (R.water > .02) { const mid = R.pool / PIXEL, w = 14 + R.water * (R.hw / PIXEL) * 1.5; for (let i = Math.round(mid - w); i < mid + w; i++) { if (Math.abs(i) > R.hw / PIXEL - 3) continue; const h = Math.round((1 + R.water * 7) * Math.sqrt(Math.max(0, 1 - ((i - mid) / w) ** 2)) + Math.sin(i * .5 + S.T * 6) * .6), y = Math.round(cy + i * Math.tan(R.ang)) - 4; r(cx + i, y - h, 1, h, P.sea); r(cx + i, y - h, 1, 1, i % 5 ? P.aqua : P.white); } }
    const p = deckAt(R.u); ix = X(p.x) + (R.hang ? R.hang.side * 9 : 0); feet = Yp(p.y) - 5 - Math.round(R.hop / PIXEL) + (R.hang ? 30 - Math.round(Math.max(0, R.hang.t - .8) * 60) : 0); head = feet - (R.seated ? 34 : spriteHeight());
    for (const c of R.creatures) { const q = deckAt(c.u), f = CREATURES[c.kind], hop = c.kind === 'bream' || c.kind === 'tuna' ? Math.round(Math.abs(Math.sin(c.step * 1.6)) * 3) : 0; put(f[Math.floor(c.step) % 2], X(q.x), Yp(q.y) - 5 - hop, c.v > 0); }   // (the fish flop along)
    if (!cover && R.phase !== 'over') ichigo(ix, feet);
    if (R.pinwheel === 'sea' && R.phase === 'sail') { const x = X(pinX()), y = Yp(seaAt(pinX())) + 3; if (x > -20 && x < LW + 20) { put(THINGS.pinwheel.grid, x, y + Math.round(Math.sin(S.T * 2) * 1.5)); if (Math.sin(S.T * 4) > 0) { r(x + 8, y - 16, 5, 1, P.white); r(x + 10, y - 18, 1, 5, P.white); } } }
  } else if (R.phase === 'broken' || (R.phase === 'over' && R.was === 'broken')) {
    const t = R.t; if (t < 4.2) { const y = Yp(seaAt(R.x - 30)); if (t > .8) swimmer(X(R.x - 30), y + Math.round(Math.max(0, 1.4 - t) * 20)); ix = X(R.x); head = 0; }
  } else {
    for (let i = 0; i < S.level.swim.planks.length; i++) piece(X(plankX(i)), Yp(seaAt(plankX(i))) + 1, 26, (seaAt(plankX(i) + 20) - seaAt(plankX(i) - 20)) / 40, i);
    const mx = mastX(), my = Yp(seaAt(mx)), sl = (seaAt(mx + 40) - seaAt(mx - 40)) / 80;
    bigRaft(lg, X(mx), my - 2, 46, Math.atan(sl) * .8, { sail: null });
    ix = X(R.x);
    if (R.phase === 'calm' || ended) { feet = my - 6; ix = X(R.phase === 'calm' ? R.x : mx - 30); head = feet - 34; if (!cover) { R.moving = R.holding = false; R.scooping = R.tying = 0; R.air = false; R.vu = 0; R.anim = 0; ichigo(ix, feet + Math.round(sl * -30 * 0)); } }
    else { const y = Yp(seaAt(R.x)); head = y - 34; if (!cover && R.phase !== 'over') swimmer(ix, y); }
  }
  drawChartSea(lg, S.camX, S.T, seaAt, 0, LW, false, tone);
  crests();
  if (R.phase === 'swim' && R.under > .3) { const y = Yp(seaAt(R.x)) + 16; for (let j = -8; j < 9; j++) for (let i = -10; i < 11; i++) if (i * i + j * j < 90 && dither(ix + i & 255, y + j & 255) < .4) r(ix + i, y + j, 1, 1, j < -2 ? P.outline : P.red); for (let i = 0; i < 4; i++) { const k = (S.T * 1.4 + i / 4) % 1; r(ix + Math.sin(i * 2 + S.T * 3) * 6, y - k * 18, 2, 2, P.mist); } }
  if (R.phase === 'broken' && R.shovel && R.t > 1) sinking();
  for (const b of R.bits) { const x = X(b.x), y = Yp(b.y); if (b.kind === 'sail') for (let j = 0; j < 22; j++) for (let i = 0; i < 24; i++) { const sx = x + i + Math.round(Math.sin(b.t * 9 + j * .3) * 5), sy = y + j + Math.round(Math.sin(b.t * 7 + i * .25) * 4); r(sx, sy, 1, 1, clothAt(i, j, i === 0 || j === 0 || i === 23 || j === 21)); } else piece(x, y, 22, Math.sin(b.t * 5) * .6, Math.floor(b.x)); }
  if (R.dark > .6 && R.light < .6) { rain((R.phase === 'wind' || R.phase === 'turn' || R.phase === 'torn' ? .25 : 1) * (1 - R.light), gusting() ? 1.3 : .6); foam(); }
  if (R.flash > 0) lightning();
  for (const q of parts) if (q.life > .05) { const n = toPx(2 * (q.s || 1)); r(X(q.x), Math.round(q.y / PIXEL + TOP_PX), n, n, q.c); }

  if (S.scene === 'storm') {
    const act = action(), pr = prompt();
    if (act && act.do === 'take') { const q = deckAt(act.u); marker(X(q.x), Math.round(head - 10 + Math.sin(S.T * 5) * 1.5)); }
    if (pr && pr.u !== null && pr.u !== undefined) { const q = deckAt(pr.u), x = X(q.x), y = Math.round(Yp(q.y) - (pr.u === MAST ? 98 : 74) + Math.sin(S.T * 8) * 3); MARKER.forEach((row, j) => [...row].forEach((ch, i) => { if (ch !== '.') r(x - 10 + i * 3, y + j * 3, 3, 3, ch === 'K' ? P.outline : P.gold); })); }   // where to go, in gold
    if (past_() && raft) for (let i = 0; i < STORM.grips; i++) { const x = 16 + i * 16, y = 40; r(x, y, 12, 12, P.outline); r(x + 1, y + 1, 10, 10, i < R.grip ? P.gold : P.grey3); r(x + 4, y + 4, 4, 4, i < R.grip ? P.ochre : P.night); }   // how many times they can still catch the edge (coils of rope)
    if (R.loose) { const q = deckAt(R.loose.u), x = X(q.x), y = Yp(q.y) - 26; if (R.tying <= 0 && Math.sin(S.T * 10) > -.3) { r(x - 5, y - 8, 11, 14, P.outline); r(x - 4, y - 7, 9, 12, P.ember); r(x - 1, y - 5, 3, 5, P.white); r(x - 1, y + 2, 3, 2, P.white); } if (R.tying > 0) bar(x, y - 18, R.tying / STORM.knot.tie, P.gold); }
    if (raft && R.water > .05) bar(X(R.x) - 1, Yp(R.y) + 34, R.water, R.water > .7 && Math.sin(S.T * 12) > 0 ? P.ember : P.aqua);
    if (R.phase === 'swim') bar(ix, head - 6, R.strength, R.strength < .3 ? P.ember : P.gold);
    drawBubbles(lg, { ichigo: [ix, head] });
  }
  if (R.fade > 0) dots(lg, R.fade, P.night);
  if (S.scene === 'dawn') drawDawn(lg, S.sceneT, S.deaths - 1);
  if (S.scene === 'dawn' && S.sceneT >= 1.45 && raft) ichigo(ix, feet);
  if (!ended && !story && !(S.scene === 'dawn' && S.sceneT > .3 && S.sceneT < 1.5)) drawHUD(progress());
  const now = S.scene === 'storm' && !ended ? prompt() : null;
  if (now) {   // what to do now: gold while it needs doing, green once it's being done
    const w = now.text.length * LETTER + 20, x = Math.round((LW - w) / 2), c = now.ok ? P.grass : P.gold;
    r(x - 2, 316, w + 4, 30, c); r(x, 318, w, 26, P.night); pixelText(now.text, LW / 2, 324, c, 'center');
  } else if (R.hint && R.hintT > 0 && S.scene === 'storm') {
    const lines = ['']; for (const word of R.hint.split(' ')) { const c = lines[lines.length - 1]; if (c && (c + ' ' + word).length > 34) lines.push(word); else lines[lines.length - 1] = c ? c + ' ' + word : word; }
    const w = Math.max(...lines.map(l => l.length)) * LETTER + 16, h = lines.length * LINE + 12, x = Math.round((LW - w) / 2), y = 350 - h;
    r(x - 1, y - 1, w + 2, h + 2, P.mist); r(x, y, w, h, P.night); lines.forEach((l, i) => pixelText(l, LW / 2, y + 7 + i * LINE, P.mist, 'center'));
  }
  if (ended) drawEndFg(S.sceneT);
}
const past_ = () => ['wind', 'torn', 'rain', 'waves'].includes(R.phase);
const progress = () => ({ sail: .3 * near(), turn: .28, wind: .3 + .12 * Math.min(1, R.gusts / STORM.gust.count), torn: .42, rain: .42 + .16 * Math.min(1, R.t / S.level.rain.time), waves: .58 + .17 * R.waveN / S.level.waves.length, broken: .75, swim: .75 + .24 * Math.max(0, Math.min(1, (R.x - R.swimX) / S.level.swim.goal)), calm: 1 }[R.phase === 'over' ? R.was : R.phase] || 0);

// Ichigo in the water: head and arms, the rest under it.
function swimmer(x, y) {
  if (R.phase === 'swim' && R.under > .6) return;
  const cling = R.phase === 'swim' && R.cling !== null, f = cling ? 'balance' : R.tumble > 0 || R.phase === 'broken' ? 'jump' : Math.floor(R.anim * 3.2) % 2 ? 'balance' : 'stand';
  drawSprite(lg, f, x, y + 24 + Math.round(R.under * 26) + (cling ? -4 : Math.round(Math.sin(S.T * 4) * 1.5)), R.face, Math.min(5, S.deaths), [1, R.tumble > 0 ? 2 : 0], [...markIds(), R.strength < .3 || R.phase === 'broken' ? 'pout' : null].filter(Boolean));
}
// A bit of the raft: two logs and a turn of rope.
function piece(x, y, half, sl, seed) {
  for (let i = -half; i <= half; i++) for (let j = 0; j < 8; j++) { const e = Math.abs(i) === half || j === 0 || j === 7 || j === 4, k = hsh(Math.floor((i + 90) / 5) * 2.7 + j + seed); r(x + i, y - 4 + j + Math.round(i * sl), 1, 1, e ? P.outline : j < 4 ? (k < .25 ? P.wood : P.tan) : k < .3 ? P.brown : P.wood); }
  r(x - 12, y - 5 - Math.round(12 * sl), 5, 10, P.outline); r(x - 11, y - 4 - Math.round(12 * sl), 3, 8, P.gold);
}
// The red shovel, going down, turning over.
function sinking() {
  const k = (R.t - 1) / 3, x = X(R.x + 26) + Math.round(Math.sin(R.t * 2) * 6), y = Yp(seaAt(R.x + 26)) + 4 + Math.round(k * 46), tilt = Math.sin(R.t * 1.6);
  for (let i = -9; i < 10; i++) { const sx = x + Math.round(i * Math.cos(tilt)), sy = y + Math.round(i * Math.sin(tilt)); if (k > .7 && dither(sx & 255, sy & 255) < (k - .7) * 3) continue; r(sx - 1, sy - 1, i < -1 ? 6 : 3, i < -1 ? 6 : 3, P.outline); r(sx, sy, i < -1 ? 4 : 1, i < -1 ? 4 : 1, i < -1 ? P.red : P.grey2); }
  for (let i = 0; i < 5; i++) { const q = (R.t * .8 + i / 5) % 1; r(x + Math.sin(i * 3 + R.t * 2) * 7, y - q * 26, 2, 2, P.mist); }
}
// The masts of old ships, sticking up out of the water as it gets light.
function masts() {
  if (R.phase !== 'calm' && S.scene !== 'end') return;
  const k = smooth(R.light); if (k <= 0 && S.scene !== 'end') return;
  for (const [x, h, lean, yard] of [[392, 64, .12, 1], [430, 40, -.2, 0], [486, 84, .06, 1], [520, 52, .3, 0], [566, 70, -.1, 1], [604, 44, .18, 1]]) {
    const y0 = Yp(392); for (let j = 0; j < h; j++) { if (dither(x + j & 255, j & 255) > k * 1.2) continue; r(x + j * lean - 1, y0 - j, 4, 1, P.outline); r(x + j * lean, y0 - j, 2, 1, P.brown); }
    if (yard) for (let i = -14; i < 15; i++) if (dither(x + i & 255, i + 40) < k * 1.2) r(x + h * .72 * lean + i, y0 - h * .72 + Math.round(i * (lean + .1)), 1, 3, P.outline);
    for (let j = 0; j < h * .5; j++) if (j % 4 && dither(j & 255, x & 255) < k) r(x + h * lean - j * .5, y0 - h + j * 1.6, 1, 1, P.slate);
  }
}
// The bird, going on ahead.
const BIRD = [['H...........H', '.HW.......WH.', '..WWW.W.WWW..', '....WWWWW....', '......WkWoo..'], ['.....W.W.....', '....WWWWW....', '..WWWWWkWoo..', 'HWW......WWH.']].map(rows => outline(rows.map(q => [...q].map(ch => ({ H: P.grey1, W: P.foam, k: P.ink, o: P.gold }[ch] || null)))));
function gull() { if (R.phase !== 'sail' || near() > .9) return; const x = 470 + Math.sin(S.T * .5) * 50 + near() * 90, y = 130 + Math.sin(S.T * .9) * 12; put(BIRD[Math.floor(S.T * 5) % 2], x, y); }
