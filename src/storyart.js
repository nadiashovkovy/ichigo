// ============================================================================
// storyart.js — the pictures in the journeys between levels (story.js plays them). Each is a small scene that
// moves a little, made of the levels' own sky, sea, Fuji, lantern and raft, and Ichigo. draw(t): as it is t seconds
// in. phase(t): which day it is, for pictures of several days. age(t): how old Ichigo is in it, if not the level's age.
// The rows from 50 to 316 show (the rest is under the bars).
// ============================================================================
import { P, LW, LH, TOP_PX, PIXEL, RAMP } from './config.js';
import { S } from './state.js';
import { lg, beginWorld, pixelSpace, dither, pack, pixelBuffer, quantize } from './pixel.js';
import { drawScenery, drawChartSea, drawLantern, drawFloatingKoinobori, drawPix, FAR_BOAT, hsh } from './art.js';
import { drawSprite, spriteHeight, markIds, outline, SP } from './sprite.js';
import { drawPerson } from './people.js';
import { drawThought } from './bubbles.js';
import { foliage, trunk, clothAt, ORANGE } from './plumart.js';
import { drawWreckage } from './wreckage.js';
import { raft, raftOn, HID, tower, paintTower, TW, LAMP } from './lighthouseart.js';
import { drawZs } from './tideart.js';

const T = () => S.T, Yp = y => Math.round(y / PIXEL + TOP_PX), r = (x, y, w, h, c) => { lg.fillStyle = c; lg.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
const put = (gr, cx, bottom, flip = false, g = lg) => { const w = gr[0].length, x0 = Math.round(cx - w / 2), y0 = Math.round(bottom) - gr.length + 1; gr.forEach((row, j) => row.forEach((c, i) => { if (c) { g.fillStyle = c; g.fillRect(x0 + (flip ? w - 1 - i : i), y0 + j, 1, 1); } })); };
const smooth = k => { k = Math.max(0, Math.min(1, k)); return k * k * (3 - 2 * k); };
const SEA = 418;                                                                     // where the near sea is, in these pictures (game units)
const surf = (y = SEA) => x => y + Math.sin(x * .016 - T() * 1.1) * 3.4 + Math.sin(x * .006 + T() * .7) * 2.4;
const seaRow = (x, y = SEA) => Yp(surf(y)(x * PIXEL));
function scenery(sky, { cam = 0, view = 'day', x = 250, behind = null } = {}) { beginWorld(); drawScenery(lg, cam, T(), { view, x }, { sky, behind }); pixelSpace(lg); }
function nearSea(tone, y = SEA, cam = 0) { drawChartSea(lg, cam, T(), surf(y), 0, LW, false, tone); }
const disc = (B, cx, cy, rad, c) => { for (let j = -rad; j <= rad; j++) { const h = Math.round(Math.sqrt(rad * rad + rad * .6 - j * j) || 0); B.rect(cx - h, cy + j, h * 2 + 1, 1, c); } };
const sun = (x, y, c = P.foam) => B => disc(B, x, y, 14, c);
const moon = (x, y) => B => { disc(B, x, y, 14, P.foam); disc(B, x + 7, y - 4, 12, P.outline); };
const fullMoon = (x, y) => B => { disc(B, x, y, 15, P.foam); disc(B, x - 5, y - 3, 3, P.grey0); disc(B, x + 4, y + 5, 2, P.grey0); };

// Ichigo, with the bucket, and what's carried across from Level 1 (the chin).
const ichigo = (frame, x, feet, face = 1, marks = [], hair = [0, 0], g = lg) => drawSprite(g, frame, Math.round(x), Math.round(feet), face, 0, hair, [...markIds(), ...marks]);
const WALK = ['stand', 'step1', 'stand', 'step2'];
// Asleep: sitting up, eyes shut, as at the start of Level 2, with the same Zs. (hx, hy: the top of their head.)
const asleep = (x, feet, face = 1, g = lg) => ichigo('sit', x, feet, face, ['asleep'], [0, 0], g);
const zs = (hx, hy) => drawZs(hx + 14, hy + 6);

// A close-up: what paint(g) draws (on a small sheet, w × h), at twice the size, its corners smoothed (Scale2x). Returns the sheet.
const small = document.createElement('canvas'), big = document.createElement('canvas');
function closeUp(w, h, paint, x, y) {
  small.width = w; small.height = h; big.width = w * 2; big.height = h * 2;
  const g = small.getContext('2d', { willReadFrequently: true }); paint(g);
  const src = new Uint32Array(g.getImageData(0, 0, w, h).data.buffer), img = big.getContext('2d').createImageData(w * 2, h * 2), out = new Uint32Array(img.data.buffer);
  const at = (i, j) => (i < 0 || j < 0 || i >= w || j >= h ? 0 : src[j * w + i]);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const e = at(i, j), b = at(i, j - 1), d = at(i - 1, j), f = at(i + 1, j), q = at(i, j + 1), p = (j * 2) * w * 2 + i * 2;
    out[p] = d === b && b !== f && d !== q ? d : e; out[p + 1] = b === f && b !== d && f !== q ? f : e; out[p + w * 2] = d === q && d !== b && q !== f ? d : e; out[p + w * 2 + 1] = q === f && d !== q && b !== f ? f : e;
  }
  big.getContext('2d').putImageData(img, 0, 0); lg.drawImage(big, Math.round(x), Math.round(y));
  return src;
}

// Land: its top row at each x (in pixels), and its colours (top edge, light, dark, deep).
const landBuf = pixelBuffer();
const SAND = { day: [P.foam, P.sky, P.tan, P.tanD], late: [P.sky, P.tan, P.tanD, P.ochre], night: [P.steel, P.grey3, P.slate, P.plum], dusk: [P.tan, P.tanD, P.bark, P.mauve], grass: [P.grass, P.leaf, P.wood, P.brown], grassLate: [P.ochre, P.olive, P.wood, P.brown], grassSnow: [P.white, P.foam, P.wood, P.brown], grassNight: [P.leaf, P.pine, P.brown, P.outline], snow: [P.white, P.foam, P.grey0, P.pale], rain: [P.grey0, P.grey1, P.bark, P.grey2] };
// (turf: grass on earth, like the Sleepy Island's, instead of sand)
function land(top, [edge, light, mid, deep], cam = 0, turf = false) {
  const B = landBuf.begin(), buf = B.buf, c = [P.outline, edge, light, mid, deep].map(pack);
  for (let x = 0; x < LW; x++) { const t = Math.round(top(x)); for (let y = Math.max(0, t); y < LH; y++) { const d = y - t, n = hsh(Math.floor((x + cam) / 3) * 12.99 + Math.floor(y / 2) * 78.23); const tall = 5 + Math.floor(hsh(Math.floor((x + cam) / 3) * 2.9) * 4); if (turf && d > 0) { buf[y * LW + x] = d < 2 ? c[1] : d < tall ? c[2] : d === tall ? c[0] : n < .12 ? c[4] : n > .96 ? c[0] : c[3]; continue; } buf[y * LW + x] = d === 0 ? c[0] : d < 3 ? c[1] : n < .02 ? c[4] : dither((x + cam) & 255, y & 255) < (d - 4) / 34 ? (dither((x + cam + 1) & 255, (y + 2) & 255) < (d - 34) / 50 ? c[4] : c[3]) : c[2]; } }
  B.draw(lg);
}
// A light, in dots: thicker toward its middle. And dots of a colour over the whole picture.
const glowBuf = pixelBuffer();
function glow(cx, cy, rx, ry, col, k = .6) { const B = glowBuf.begin(), v = pack(col); for (let y = Math.max(0, cy - ry); y < Math.min(LH, cy + ry); y++) for (let x = Math.max(0, cx - rx); x < Math.min(LW, cx + rx); x++) { const d = Math.hypot((x - cx) / rx, (y - cy) / ry); if (d < 1 && dither(x, y) < (1 - d) * k) B.buf[y * LW + x] = v; } B.draw(lg); }
function veil(col, k) { const B = glowBuf.begin(), v = pack(col); for (let y = 0; y < LH; y++) for (let x = 0; x < LW; x++) if (dither(x, y) < k) B.buf[y * LW + x] = v; B.draw(lg); }
function rain() { for (let i = 0; i < 150; i++) { const h = hsh(i * 3.7), y = (hsh(i * 7.1) * LH + T() * (300 + h * 160)) % LH, x = ((hsh(i * 1.9) * (LW + 80) - y * .22) % LW + LW) % LW; r(x, y, 1, 6, h < .5 ? P.mist : P.pale); r(x - 1, y + 6, 1, 4, h < .5 ? P.mist : P.pale); } }
// Things falling slowly: petals, leaves, snow.
function falling(cols, n, speed, wide, cam = 0) { for (let i = 0; i < n; i++) { const h = hsh(i * 5.3), y = (hsh(i * 2.9) * LH + T() * speed * (.6 + h)) % LH, x = ((hsh(i * 8.7) * LW + Math.sin(T() * (.6 + h) + i) * wide - cam) % LW + LW) % LW; r(x, y, h < .4 ? 3 : 2, 2, cols[i % cols.length]); } }

// The plank Ichigo wakes on; x: its middle, y: the water.
// (the sea's own kind of plank: wreckage.js)
const deck = {};
function plank(x, half, g = lg, y0 = null) {
  const y = (y0 ?? seaRow(x)) - 4, p = deck[half] || (deck[half] = { type: 'plank', w: half * 2 * PIXEL, h: 14, ph: 3.4, ang: 0 });
  g.save(); g.setTransform(1 / PIXEL, 0, 0, 1 / PIXEL, 0, 0); p.cx = x * PIXEL; p.cy = y * PIXEL; p.ang = y0 === null ? Math.sin(T() * 1.1) * .03 : 0; drawWreckage(g, p, 0, T()); g.restore();
}
function wreckage(cam, level = 0) {   // bits of the village, floating
  for (let i = 0; i < 7; i++) {
    const x = ((hsh(i * 3.3) * 900 - cam * (.5 + hsh(i) * .3)) % 900 + 900) % 900 - 120, y = seaRow(x) + 3 + Math.round(hsh(i * 5.1) * 8), w = 16 + Math.round(hsh(i * 7.7) * 30), kind = i % 3;
    if (kind === 0) { r(x - 1, y - 3, w + 2, 6, P.outline); r(x, y - 2, w, 2, P.ochre); r(x, y, w, 2, P.wood); }
    else if (kind === 1) { for (let k = 0; k < w; k++) { r(x + k, y - 6 + Math.round(k * .2), 1, 8, P.outline); r(x + k, y - 5 + Math.round(k * .2), 1, 5, (k + i) % 4 === 0 ? P.brown : P.olive); } }   // thatch
    else { r(x, y - 6, 14, 8, P.outline); r(x + 1, y - 5, 12, 6, P.wood); r(x + 1, y - 4, 12, 1, P.grey1); r(x + 1, y - 1, 12, 1, P.grey1); }                  // a tub
  }
}
// Trees for the seasons, painted once each.
const trees = {};
function tree(season) {
  if (trees[season]) return trees[season];
  const c = document.createElement('canvas'); c.width = 170; c.height = 170; const g = c.getContext('2d');
  trunk(g, [[85, 168], [82, 130], [88, 96], [84, 70]], 13, 6, 3); trunk(g, [[86, 108], [112, 84], [124, 70]], 6, 2, 4); trunk(g, [[84, 112], [60, 88], [46, 78]], 6, 2, 5); trunk(g, [[86, 84], [100, 58]], 4, 2, 6);
  const L = { spring: [P.pink, P.rose, P.mauve], summer: RAMP.leaf, autumn: [P.dawn, P.ember, P.rust] }[season];
  if (L) { foliage(g, 46, 70, 32, 20, 3, L); foliage(g, 124, 66, 32, 20, 7, L); foliage(g, 86, 50, 42, 26, 11, L); }
  else for (const [x, y, w] of [[40, 76, 26], [104, 72, 30], [78, 66, 20], [66, 92, 16]]) for (let i = 0; i < w; i++) { g.fillStyle = P.white; g.fillRect(x + i, y + Math.round(Math.sin(i * .5) * 1.5) - 2, 1, 3); }   // snow on bare branches
  return trees[season] = c;
}
// Seen big: a thatched house's room at night.
let room = null;
function paintRoom() {
  room = document.createElement('canvas'); room.width = LW; room.height = LH; const g = room.getContext('2d'), q = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
  for (let y = 0; y < 246; y++) for (let x = 0; x < LW; x++) { const bd = y % 26, k = 1 - Math.hypot((x - 330) / 380, (y - 160) / 220); q(x, y, 1, 1, bd === 0 || (x + Math.floor(y / 26) * 61) % 131 === 0 ? P.outline : dither(x & 255, y & 255) < k * .9 ? P.wood : dither((x + 1) & 255, y & 255) < .5 ? P.brown : P.plum); }
  // the paper screen, lit from behind
  q(146, 72, 372, 176, P.outline); q(148, 74, 368, 172, P.brown); q(152, 78, 360, 168, P.sky);
  for (let y = 78; y < 246; y++) for (let x = 152; x < 512; x++) { const d = Math.hypot((x - 350) / 190, (y - 180) / 130); q(x, y, 1, 1, dither(x & 255, y & 255) < 1.15 - d * 1.5 ? P.foam : dither((x + 2) & 255, (y + 1) & 255) < d * .8 - .25 ? P.ochre : P.gold); }
  // the straw mats
  for (let y = 246; y < LH; y++) for (let x = 0; x < LW; x++) { const p = x + (y - 246) * .7 * (x < 320 ? 1 : -1) * Math.abs(x - 320) / 320, m = Math.floor((p + 1000) / 152), e = (p + 1000) % 152; q(x, y, 1, 1, y === 246 ? P.outline : e < 5 ? P.pine : (y + m) % 3 === 0 ? P.ochre : dither(x & 255, y & 255) < .35 + (y - 246) / 200 ? P.olive : P.ochre); }
  for (const x of [128, 518]) { q(x - 1, 40, 20, 208, P.outline); q(x, 40, 18, 207, P.wood); q(x, 40, 4, 207, P.ochre); q(x + 14, 40, 4, 207, P.brown); }
  q(0, 58, LW, 16, P.outline); q(0, 59, LW, 13, P.wood); q(0, 59, LW, 3, P.ochre);
  // the doorpost, with two lines cut in it
  for (const y of [204, 212]) q(522, y, 11, 2, P.foam);
}
const shade = document.createElement('canvas');
function shadow(frame, x, bottom) {   // Kaa-chan's shadow on the paper
  shade.width = 90; shade.height = 110; const g = shade.getContext('2d'); drawPerson(g, 'kaachan', frame, 45, 108, -1);
  g.globalCompositeOperation = 'source-in'; g.fillStyle = P.bark; g.fillRect(0, 0, 90, 110); g.globalCompositeOperation = 'source-atop'; g.fillStyle = P.mauve; for (let j = 0; j < 110; j++) for (let i = 0; i < 90; i++) if (dither(i, j) < .3) g.fillRect(i, j, 1, 1); g.globalCompositeOperation = 'source-over';
  lg.imageSmoothingEnabled = false; lg.drawImage(shade, 0, 0, 90, 109, Math.round(x - 90), Math.round(bottom - 218), 180, 218);   // (twice as big as she is: the lamp is behind her)
}
function edges(k = 1) { const B = glowBuf.begin(), v = pack(P.night); for (let y = 0; y < LH; y++) for (let x = 0; x < LW; x++) { const d = Math.max(0, Math.hypot((x - 320) / 350, (y - 184) / 160) - .72) * 3 * k; if (dither(x, y) < d) B.buf[y * LW + x] = v; } B.draw(lg); }   // (a memory: dark at its edges)

// The stone lantern, on a close-up's sheet (cx: its middle, foot: the row it stands on).
function stoneLantern(g, cx, foot, lit) { g.save(); g.setTransform(1 / PIXEL, 0, 0, 1 / PIXEL, 0, 0); drawLantern(g, cx * PIXEL, (foot + 1) * PIXEL, T(), lit); g.restore(); }

// A whale's back coming up out of the sea, x: its middle; k: how far up (0..1).
function whale(x, y, k) {
  for (let i = -190; i <= 150; i++) {
    const q = i < 0 ? i / 190 : i / 150, h = (i < 0 ? Math.cos(q * Math.PI / 2) ** 1.3 : Math.cos(q * Math.PI / 2) ** .6) * 62 * k, fin = i > -96 && i < -70 ? (1 - Math.abs(i + 80) / 16) * 13 * k : 0, top = Math.round(y - h - Math.max(0, fin));
    for (let j = top; j < y + 14; j++) { const d = j - top; lg.fillStyle = d < 1 ? P.outline : d < 3 ? P.steel : dither((x + i) & 255, j & 255) < .55 - d / 60 ? P.slate : dither((x + i + 1) & 255, j & 255) < d / 70 ? P.outline : P.navy; lg.fillRect(Math.round(x + i), j, 1, 1); }
  }
  const ex = Math.round(x + 112), ey = Math.round(y - 14 * k);
  if (k > .5) { r(ex - 4, ey - 4, 9, 8, P.outline); r(ex - 3, ey - 3, 7, 6, P.foam); r(ex - 1, ey - 2, 4, 4, P.outline); r(ex, ey - 2, 1, 1, P.white); }
  for (let n = 0; n < 4; n++) for (let i = 60 + n * 3; i < 138; i += 1) { const yy = Math.round(y + 2 - (9 - n * 5) * k + (i - 60) * .05); if (yy < y + 6 && n) r(x + i, yy, 1, 1, P.slate); }
}
function spout(x, y, t) { if (t < 0 || t > 2.2) return; for (let i = 0; i < 60; i++) { const a = hsh(i * 3.1), life = t - a * .8; if (life < 0 || life > 1.3) continue; const vx = (hsh(i * 7.3) - .5) * 60, yy = y - 70 * life + 62 * life * life; r(x + vx * life, yy, life < .5 ? 3 : 2, 2, i % 3 ? P.mist : P.white); } }

// ============================================================================
// The pictures
// ============================================================================
export const SHOTS = {
  sleeping: (x, feet) => zs(x, feet - 34),                                            // (Zs over Ichigo, in a level drawn as a picture)
  // --- before Level 1's sea
  adrift: { draw(t) {
    const cam = t * 16; scenery('dusk', { cam, view: 'dusk' });
    beginWorld(); drawFloatingKoinobori(lg, 760 - t * 46, surf()(760) + 4, T()); pixelSpace(lg); quantize(lg);
    const bob = Math.round(Math.sin(T() * 1.2) * 2), y0 = 160 + bob, up = t >= 5; nearSea('dusk', 402, cam); wreckage(cam);
    closeUp(130, 62, g => { g.clearRect(0, 0, 130, 62); plank(65, 60, g, 54); if (up) ichigo('sit', 62, 51, Math.floor(t * .7) % 2 ? 1 : -1, t > 6.4 ? ['pout'] : [], [0, 0], g); else asleep(62, 51, 1, g); }, 190, y0);
    if (!up) zs(312, y0 + 34); nearSea_low('dusk');
  } },
  bedtime: { draw(t) {
    if (!room) paintRoom();
    lg.drawImage(room, 0, 0);
    shadow(Math.floor(t * 1.6) % 2 ? 'sit1' : 'sit2', 440, 262);
    for (let x = 152; x < 512; x += 45) r(x, 78, 2, 168, P.brown);
    for (let y = 78; y < 246; y += 42) r(152, y, 360, 2, P.brown);
    r(328, 74, 8, 173, P.outline); r(329, 74, 6, 172, P.wood);
    for (const x of [128, 518]) { r(x - 1, 72, 20, 176, P.outline); r(x, 72, 18, 175, P.wood); r(x, 72, 4, 175, P.ochre); r(x + 14, 72, 4, 175, P.brown); } for (const y of [196, 204]) r(521, y, 12, 2, P.foam);
    // the bed: a mattress on the mats, a pillow, a quilt that rises and falls
    const up = Math.sin(t * 1.5) > 0 ? 1 : 0, sh = spriteHeight();
    closeUp(170, 64, g => {   // (seen from its foot: the pillow, Ichigo's head on it, the quilt)
      const q = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); }; g.clearRect(0, 0, 170, 64);
      for (let j = 0; j < 46; j++) { const w = 40 + Math.round(j * .34); q(85 - w - 1, 17 + j, w * 2 + 2, 1, P.outline); q(85 - w, 17 + j, w * 2, 1, j < 2 ? P.white : P.foam); q(85 + w - 3, 17 + j, 3, 1, P.grey0); }   // the mattress
      for (let j = 0; j < 15; j++) { const w = j < 2 || j > 12 ? 24 : 26; q(85 - w - 1, 14 + j, w * 2 + 2, 1, P.outline); if (j > 0 && j < 14) q(85 - w, 14 + j, w * 2, 1, j > 10 ? P.grey0 : P.white); }                       // the pillow
      g.save(); g.beginPath(); g.rect(0, 0, 170, 31); g.clip(); ichigo('stand', 85, 2 + sh - 1, 1, ['asleep'], [0, 0], g); g.restore();
      for (let j = 0; j < 36; j++) { const y = 27 - up + j, w = 34 + Math.round(j * .36), mound = Math.max(0, 1 - Math.abs(j - 14) / 22); if (y > 63) break; q(85 - w - 1, y, w * 2 + 2, 1, P.outline); for (let i = -w; i < w; i++) { const fold = j < 4, c = fold ? (j === 3 ? P.grey0 : P.white) : clothAt(i + 100, j, false) === P.foam ? P.foam : Math.abs(i) < 15 * mound && dither((i + 100) & 255, j) < .6 ? P.deep : Math.abs(i) > w - 8 || dither((i + 100) & 255, j) < .35 ? P.indigo : P.navy; q(85 + i, y, 1, 1, j === 0 ? P.outline : c); } }
      put(BUCKET, 20, 60, false, g); q(134, 57, 18, 4, P.outline); q(135, 58, 9, 2, P.red); q(144, 58, 7, 1, P.grey1);
    }, 150, 190);
    glow(350, 200, 260, 130, P.gold, .16); edges();
    if (t > 4) zs(332, 196);
  } },
  scared: { draw(t) {
    scenery('dusk', { cam: 120 + t * 10, view: 'dusk' }); nearSea('dusk', 402, 120);
    const bob = Math.round(Math.sin(T() * 1.3) * 2), x0 = 220, y0 = 150 + bob, w = 100, h = 62, pout = t > .8 && Math.floor(t * 5) % 2 ? ['pout'] : [];
    const src = closeUp(w, h, g => { g.clearRect(0, 0, w, h); plank(50, 48, g, 54); ichigo('sit', 46, 51, 1, pout, [Math.sin(t * 2) > .4 ? 1 : 0, 0], g); }, x0, y0);
    // (where the eyes are: five rows above the collar, which is the first long run of white)
    const W4 = pack(SP.W); let collar = -1; for (let i = 0; i < src.length - 4 && collar < 0; i++) if (src[i] === W4 && src[i + 1] === W4 && src[i + 2] === W4 && src[i + 3] === W4) collar = Math.floor(i / w);
    if (collar > 0 && t > 1.2) for (const [n, ex] of [46, 52].entries()) { const q = (t * .7 + n * .5) % 1, px = x0 + ex * 2 + (n ? 1 : -3), py = y0 + (collar - 4) * 2 + q * q * 34; r(px - 1, py - 1, 5, 6, P.outline); r(px, py, 3, 4, P.aqua); r(px, py, 1, 2, P.white); }
    nearSea_low('dusk');
    if (t > 4.5) drawThought(lg, 'house', x0 + 96, y0 + 18);
  } },
  lantern: { draw(t) {
    const cam = 200 + t * 8, hx = 506, hy = Yp(388); scenery('dusk', { cam, view: 'dusk', x: 300 });
    for (let i = -64; i < 64; i++) { const h = Math.round(13 * Math.cos(i / 64 * Math.PI / 2) ** 1.4); r(hx + i, hy - h, 1, h + 2, P.outline); }
    r(hx - 4, hy - 26, 8, 14, P.outline); r(hx - 7, hy - 29, 14, 4, P.outline); if (Math.sin(T() * 3) > -.8) { r(hx - 2, hy - 23, 4, 4, P.gold); glow(hx, hy - 21, 40, 30, P.gold, .7); for (let y = hy + 2; y < hy + 20; y += 2) { const w = 3 + Math.round(Math.abs(Math.sin(y * 1.7 + T() * 2)) * 7); r(hx - w, y, w * 2, 1, P.gold); } }
    nearSea('dusk', SEA, cam); wreckage(cam * 1.4);
    const x = 190, y = seaRow(x); plank(x, 56); if (t < 3) ichigo('sit', x, y - 4, 1); else ichigo('stand', x, y - 4, 1, [], [Math.sin(t * 2.2) > 0 ? 1 : 0, 0]);
  } },

  // --- before Level 2
  // (over Level 2's own island in the morning; at(x): where the ground is there, in pixels)
  boat: { over(t, at) {
    const gone = t > 7, bx = Math.round(40 + t * 62), by = Yp(391) - 8 + Math.round(Math.sin(T() * 1.4));
    lg.save(); lg.beginPath(); for (const [a, w] of [[0, at(330)[0]], [at(530)[0], LW]]) lg.rect(a, 0, w, LH); lg.clip(); drawPix(lg, FAR_BOAT, bx, by, false); lg.restore();   // (behind the island)
    const hop = gone ? 0 : Math.abs(Math.sin(t * 5)) * 16, [x, y] = at(468), face = bx > x ? 1 : -1;
    if (gone) ichigo('sit', x, y, 1, t > 8 ? ['pout'] : []); else ichigo(hop > 5 ? 'jump' : 'balance', x, y - hop, face, [], [0, hop > 5 ? 1 : 0]);
  } },
  rain: { draw(t) {
    scenery('night', { view: 'night', x: 170 }); veil(P.grey3, .5); nearSea('night', 400); const top = x => 296 + 5 * Math.sin(x * .012); land(top, SAND.rain);
    const bite = Math.sin(t * 2.4) > .2, y0 = 172;
    closeUp(150, 70, g => {
      g.clearRect(0, 0, 150, 70); stoneLantern(g, 112, 67, false);
      ichigo('sit', 44, 66, 1, [...(t > 3 ? ['water'] : []), ...(!bite && t > 6 ? ['pout'] : [])], [0, 0], g);
      for (let j = 0; j < 13; j++) { const sx = 55 + Math.round(Math.sin(j * .8 + T() * 2) * 1.5), sy = 46 - (bite ? 3 : 0) + j; g.fillStyle = P.outline; g.fillRect(sx - 1, sy, 4, 1); g.fillStyle = j % 3 ? P.leaf : P.pine; g.fillRect(sx, sy, 2, 1); }   // the seaweed
    }, 180, y0);
    rain(); for (let i = 0; i < 40; i++) { const q = (T() * 2.4 + hsh(i)) % 1, sx = hsh(i * 3.3) * LW, sy = top(sx) + 2 + hsh(i * 5.7) * 18; if (q < .5) { r(sx - q * 8, sy, 2, 1, P.mist); r(sx + q * 8, sy, 2, 1, P.mist); } }
    if (t > 5) drawThought(lg, 'house', 268, y0 + 48);
  } },
  dark: { draw(t) {
    scenery('night', { view: 'night', x: 170, behind: fullMoon(576, 120) }); nearSea('night', 400); const top = x => 296 + 5 * Math.sin(x * .012); land(top, SAND.dusk); veil(P.night, .42);
    glow(404, 226, 210, 130, P.dawn, .34); glow(404, 222, 110, 84, P.gold, .5);
    const walk = smooth((t - 3.6) / 2.2), x = 34 + walk * 40, down = t >= 6, y0 = 172;
    closeUp(150, 70, g => {
      g.clearRect(0, 0, 150, 70); stoneLantern(g, 112, 67, true);
      if (t < 3.6) ichigo('sit', x, 66, Math.floor(t * 1.3) % 2 ? -1 : 1, ['pout'], [0, 0], g); else if (!down) ichigo(WALK[Math.floor(t * 7) % 4], x, 66, 1, [], [0, 0], g); else ichigo('sit', 78, 66, 1, t > 7.4 ? ['asleep'] : [], [0, 0], g);
    }, 180, y0);
    if (down && t > 7.6) zs(336, y0 + 64);
  } },

  // --- before Level 3: four seasons, and a birthday
  seasons: { phase: t => Math.min(3, Math.floor(t / 2.7)), age: () => 3, draw(t, n) {
    const cam = t * 92, s = ['spring', 'summer', 'autumn', 'winter'][n]; scenery(['dawn', 'day', 'late', 'day'][n], { cam: cam * .6, view: n === 3 ? 'snowy' : n === 2 ? 'red' : 'day', x: 420, behind: sun(150 + n * 40, 110 - n * 8, n === 2 ? P.red : P.white) });
    nearSea('day', 404, cam * .7);
    const top = x => 262 + 5 * Math.sin((x + cam) * .013) + 3 * Math.sin((x + cam) * .031);
    for (let i = Math.floor((cam * .8 - 200) / 190); i < (cam * .8 + LW + 200) / 190; i++) { const x = i * 190 + hsh(i) * 60 - cam * .8; lg.drawImage(tree(s), Math.round(x - 85), Math.round(262 - 164)); }
    land(top, n === 3 ? SAND.grassSnow : n === 2 ? SAND.grassLate : SAND.grass, Math.round(cam), true);
    for (let i = Math.floor(cam / 22); i < (cam + LW) / 22; i++) { const x = i * 22 + hsh(i * 3) * 16 - cam, y = top(x); if (n < 3) for (let j = 0; j < 4; j++) r(x + j * 2, y - 2 - hsh(i + j) * 4, 1, 4, n === 0 ? P.grass : n === 1 ? P.leaf : P.ochre); }
    const x = 270; ichigo(WALK[Math.floor(t * 7) % 4], x, top(x) + 2, 1, [], [Math.floor(t * 3.5) % 2, Math.floor(t * 7) % 2]);
    if (n === 0) falling([P.pink, P.rose], 34, 26, 30, cam * .3); else if (n === 2) falling([P.ember, P.dawn, P.rust], 34, 38, 36, cam * .3); else if (n === 3) falling([P.white, P.foam], 90, 34, 16, cam * .3);
  } },
  birthday: { phase: t => (t < 3.6 ? 0 : 1), age: t => (t < 3.6 ? 3 : 4), draw(t, n) {
    scenery(n ? 'dawn' : 'day', { x: 130 }); nearSea('day', 400); land(x => 296 + 2 * Math.sin(x * .03), SAND.grass, 0, true);
    // the tree, close to
    for (let y = 40; y < LH; y++) { const half = 36 + Math.round(Math.max(0, y - 268) * .5) + Math.round(Math.sin(y * .05) * 2); for (let i = -half; i <= half; i++) { const x = 400 + i, n2 = hsh(Math.floor((i + 100) / 4) * 2.3 + Math.floor((y + (i % 3) * 5) / 15) * 5.9); r(x, y, 1, 1, Math.abs(i) === half ? P.outline : i < -half * .55 ? (n2 < .25 ? P.wood : P.bark) : n2 < .1 ? P.outline : n2 < .42 + i / half * .25 ? P.brown : P.wood); } }
    const floor = 306, h3 = 2 * (spriteHeight() - (n ? 2 : 0)) - 2, h4 = h3 + 4 + 8, notch = (y, w, c) => { r(373, y - 2, w + 2, 5, P.outline); r(374, y - 1, w, 3, c); };   // (the new line: a head's width of growing, drawn a little large)
    notch(floor - h3, 26, P.tan); if (n && t > 5) notch(floor - h4, Math.min(34, Math.floor((t - 5) / .5 + 1) * 12), P.foam);
    const cut = n && t > 4.8 && t < 6.6, marks = [];
    closeUp(60, 62, g => { g.clearRect(0, 0, 60, 62); ichigo(cut ? (Math.sin(t * 12) > 0 ? 'dig1' : 'balance') : 'stand', 28, 59, 1, marks, [0, 0], g); }, 250 + (n ? 12 : 12) , floor - 120);
    if (cut) for (let i = 0; i < 8; i++) { const q = (t * 1.6 + hsh(i)) % 1; r(372 - q * 26 * hsh(i * 3), floor - h4 + q * q * 60, 2, 2, i % 2 ? P.tan : P.foam); }
  } },
  // (edges: the dream itself is Level 1's beach, dark round its edges: main.js. draw: waking from it.)
  dream: { edges: () => edges(), draw(t) {
    scenery('night', { view: 'night', x: 180, behind: moon(120, 96) }); nearSea('night', 404); land(x => 270 + 4 * Math.sin(x * .014), SAND.grassNight, 0, true);
    lg.drawImage(tree('summer'), 470, 104); lg.drawImage(tree('summer'), 40, 110); veil(P.night, .22);
    const y0 = 188, awake = t > 1.8;
    closeUp(130, 60, g => {
      g.clearRect(0, 0, 130, 60);
      for (let i = 0; i < 70; i++) { const q = hsh(i * 3.7) * 2 - 1, y = 55 - (1 - q * q) * 6 * hsh(i * 5); g.fillStyle = P.outline; g.fillRect(Math.round(62 + q * 42), Math.round(y), 5, 4); g.fillStyle = i % 2 ? P.pine : P.leaf; g.fillRect(Math.round(63 + q * 42), Math.round(y) + 1, 3, 2); }   // a bed of leaves
      ichigo('sit', 62, 54, awake && t > 2.8 && t < 3.8 ? -1 : 1, [...(awake ? [] : ['asleep']), ...(t > 4 ? ['pout'] : [])], [0, 0], g);
    }, 190, y0);
    if (!awake) zs(316, y0 + 42);
  } },

  // --- before Level 4: on the raft
  // (from the late afternoon Level 3 ends in, its island behind)
  sailing: { phase: t => Math.min(4, Math.floor(t / 2.2)), draw(t, n) {
    const cam = t * 60, sky = ['late', 'night', 'dawn', 'day', 'late'][n], at_ = [1, 2, 3, 0, 1][n], q = (t % 2.2) / 2.2;
    scenery(sky, { cam, view: at_ === 2 ? 'night' : 'day', x: n === 0 || n === 4 ? 560 : 2000, behind: at_ === 2 ? fullMoon(130 + q * 60, 110 - q * 14) : sun(at_ === 1 ? 470 + q * 20 : at_ === 3 ? 200 : 300 + q * 40, at_ === 1 ? 196 + q * 14 : at_ === 3 ? 206 - q * 16 : 92, at_ === 1 || at_ === 3 ? P.red : P.white) });
    if (n === 0) for (let i = 0; i < 240; i++) { const x = Math.round(i - 40 - t * 26), h = Math.round(44 * Math.sin(Math.min(1, (240 - i) / 200) * Math.PI / 2) * (.8 + .2 * Math.sin(i * .07)) + 4 * Math.sin(i * .31)); for (let j = 0; j < h; j++) r(x, Yp(392) - j, 1, 1, j === h - 1 ? P.outline : dither(i & 255, j) < j / h * .7 ? P.leaf : P.pine); }   // the island, going
    const x = 290, y = seaRow(x + cam / PIXEL * 0), tone = at_ === 2 ? 'night' : 'day';
    if (at_ !== 2) for (let i = 0; i < 3; i++) { const p = ((t * .45 + i * .13) % 1), fx = 420 + i * 22 + p * 110, fy = 262 - Math.sin(p * Math.PI) * 46; if (p > .03 && p < .97) { r(fx - 1, fy - 1, 12, 5, P.outline); r(fx, fy, 10, 3, P.aqua); r(fx + 2, fy + 2, 6, 1, P.white); r(fx - 3, fy - 1, 3, 5, P.deep); r(fx + 3, fy - 4, 5, 3, P.mist); } }   // flying fish
    nearSea(tone, SEA, cam); raft(x, y + 2, Math.round(Math.sin(T() * 1.4) * 1.2));
    const feet = y - 4; if (at_ === 2) ichigo('sit', x + 8, feet, 1, ['asleep']); else if (n === 4 || n === 0 || at_ === 0) ichigo(n === 0 ? 'sit' : 'stand', x + 8, feet, t % 2.2 < 1.1 ? 1 : -1, [], [Math.floor(t * 3) % 2, 0]); else ichigo('sit', x + 8, feet, 1);
    if (at_ === 2) zs(x + 8, feet - 34);
  } },
  oranges: { phase: t => Math.floor(Math.min(t, 8.4) / 2.1) % 2, draw(t, n) {
    const cam = t * 30; scenery(n ? 'late' : 'day', { cam, x: 2000, behind: n ? sun(480, 190, P.red) : sun(180, 86, P.white) }); nearSea('day', 404, cam);
    // close to: the raft, the oranges in a row, and one being eaten
    const bob = Math.round(Math.sin(T() * 1.4) * 2), left = t < 7.4 ? Math.max(1, 9 - Math.floor(t / .92)) : t < 9.8 ? 1 : 0, eating = (t < 7.4 && t % .92 < .6) || t > 9.8, y0 = 176 + bob;
    closeUp(170, 66, g => {
      g.clearRect(0, 0, 170, 66);
      for (let i = 0; i < 166; i++) for (let j = 0; j < 9; j++) { const e = j === 0 || j === 8 || i === 0 || i === 165, k = hsh(Math.floor(i / 6) * 2.7 + Math.floor(j / 3) * 7.1); g.fillStyle = e || j === 4 ? P.outline : j < 4 ? (k < .25 ? P.wood : P.tan) : k < .3 ? P.brown : P.wood; g.fillRect(2 + i, 55 + j, 1, 1); }
      ichigo('sit', 46, 56, 1, t > 9.8 || (t > 7.6 && Math.floor(t * 4) % 2) ? ['pout'] : [], [0, 0], g);
      for (let i = 0; i < left; i++) put(ORANGE, 84 + i * 9, 55, false, g);
      if (eating) put(ORANGE, 59, 36 + (Math.sin(t * 9) > 0 ? 1 : 0), false, g);
      for (let i = 0; i < 9 - left - (eating ? 1 : 0); i++) { g.fillStyle = P.dawn; g.fillRect(8 + i * 3, 53 - (i % 2), 2, 2); }   // peel
    }, 150, y0);
    nearSea_low('day');
  } },
  whale: { draw(t) {
    const x = 300, wx = -120 + t * 98, under = Math.exp(-(((wx - x) / 150) ** 2)), k = smooth(t / 1.6) * (1 - smooth((t - 7.2) / 1.4)), lift = Math.round(under * 12);
    scenery('night', { cam: t * 12, view: 'night', x: 480, behind: fullMoon(500, 92) });
    whale(wx, 270, k * (1 - under * .55)); spout(wx + 70, 262 - 56 * k, t - 5); nearSea('night', SEA, t * 12);
    for (let i = -150; i < 130; i += 1) { const px = Math.round(wx + i); if (px > 0 && px < LW && k > .2 && Math.sin(i * .5 + t * 9) > -.3) r(px, seaRow(px) - 1 + (i % 3 === 0 ? 1 : 0), 1, 2, P.mist); }   // the water breaking over it
    const y = seaRow(x) - lift; raft(x, y + 2, 0);
    if (t < 1.3) ichigo('sit', x + 8, y - 4, -1, []); else if (t < 8.6) put(HID, x + 8, y - 3 + (t > 3 && t < 6.5 ? Math.round(Math.sin(t * 22) * .6) : 0)); else ichigo('sit', x + 8, y - 4, 1, []);
  } },
  song: { draw(t) {
    const hx = 470, hy = Yp(392), on = t > 4.6 && Math.floor((t - 4.6) / 1.3) % 2 === 0;
    scenery('night', { cam: t * 10, view: 'night', x: 150, behind: moon(220, 100) });
    if (!tower) paintTower();
    lg.imageSmoothingEnabled = false; lg.drawImage(tower, 0, 0, TW, LH, hx - 58, hy - 125, TW / 2, LH / 2);   // (the lighthouse of the level, half the size: further off)
    { const ex = hx - 58 + LAMP[0] / 2, ey = hy - 125 + LAMP[1] / 2; for (let j = -6; j <= 6; j++) for (let i = -6; i <= 6; i++) if (Math.hypot(i, j) < 6.4) r(ex + i, ey + j, 1, 1, Math.hypot(i, j) > 5.3 ? P.outline : on ? (Math.hypot(i, j) < 2 ? P.outline : P.white) : j === 2 ? P.outline : P.rosewood); }
    if (t > 4.6) { if (on) { const ex = hx + 17, ey = hy - 94; glow(ex, ey, 40, 30, P.foam, .8); for (let i = 8; i < 230; i++) { const y = ey + i * .3, w = 2 + i * .12; for (let j = -w; j < w; j++) if (dither((ex - i) & 255, (y + j) & 255) < .4 * (1 - i / 240)) r(ex - i, y + j, 1, 1, P.sky); } } }
    nearSea('night', 402, t * 10);
    const bob = Math.round(Math.sin(T() * 1.4) * 2), y0 = 150 + bob, sit = t < 6.2;
    closeUp(100, 70, g => {
      g.clearRect(0, 0, 100, 70); raftOn(g, 50, 63);
      ichigo(sit ? 'sit' : 'stand', 58, 59, t < 4.8 ? -1 : 1, t < 4.8 && t % 3 < 1.6 ? ['asleep'] : [], [!sit && Math.sin(t * 2) > 0 ? 1 : 0, 0], g);
    }, 110, y0); nearSea_low('night');
    if (t > .9 && t < 4.6) drawThought(lg, 'house', 226, y0 + 42);
  } },
};
// (a strip of sea across the foot of a close-up)
function nearSea_low(tone) { nearSea(tone, 462, 60); }
const BC = { Y: SP.Y, y: SP.y, w: P.white, h: P.grey1 };
const BUCKET = outline(['..hhhhhh..', '.h......h.', 'yyyyyyyyyy', 'yYwYYYYYYy', '.YwYYYYYy.', '.YYYYYYYy.', '..YYYYYy..', '..yyyyyy..'].map(q => [...q].map(ch => (ch === '.' ? null : BC[ch]))));
