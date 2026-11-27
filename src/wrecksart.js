// ============================================================================
// wrecksart.js — how Level 6 looks (wrecks.js is how it plays): a calm morning over a reef full of sunk ships, and
// under the water, darker the deeper it goes: hulls, decks, portholes, rock, sand, a whale's bones on the bottom.
// The map doesn't move, so it's painted once into a picture as big as the level (and again where sand is dug away);
// everything that moves is drawn over it each frame. The camera moves down as well as along.
// ============================================================================
import { LW, LH, TOP_PX, PIXEL, P, WRECKS } from './config.js';
import { S, parts } from './state.js';
import { lg, dither, pack, scale2x, pixelSpace } from './pixel.js';
import { pixelText, LETTER, LINE } from './text.js';
import { drawScenery, hsh } from './art.js';
import { drawSprite, drawTurned, spriteHeight, markIds, outline } from './sprite.js';
import { drawBubbles } from './bubbles.js';
import { drawDawn } from './dawn.js';
import { drawHUD, drawEndFg } from './scenes.js';
import { THINGS } from './things.js';
import { D, SURFACE, top0, tile, solidAt, waterAt, at, eelOut, eelWarn, eelBox, action, prompt, progress } from './wrecks.js';

const T = WRECKS.tile, TP = T / PIXEL;                                               // one letter of the map, in pixels (18)
const r = (x, y, w, h, c) => { lg.fillStyle = c; lg.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
// (screen pixels, for a place in the level)
const X = x => Math.round((x - S.camX) / PIXEL), Y = y => Math.round((y - camY()) / PIXEL + TOP_PX), camY = () => Math.round(D.camY / PIXEL) * PIXEL;

// ============================================================================
// The map, painted once
// ============================================================================
const mapC = document.createElement('canvas'), tintC = document.createElement('canvas');
let painted = null, img = null, buf = null, tintImg = null, tbuf = null;
const SOLID = new Set('#=ro_Sv^');
// How deep a row of pixels is, 0 (the top of the sea) to 1 (the bottom of the map).
const depthOf = y => Math.max(0, Math.min(1, (y - S.level.surface * TP) / ((S.level.map.length - S.level.surface) * TP)));
// The open water: lighter at the top, with slanting light in it; darker and darker going down.
const WATER = [P.sea, P.deep, P.ocean, P.navy, P.abyss, P.night];
function water(x, y) {
  const d = depthOf(y), f = d * (WATER.length - 1.2), i = Math.floor(f), k = f - i;
  let c = dither(x & 255, y & 255) < k ? WATER[Math.min(WATER.length - 1, i + 1)] : WATER[i];
  if (d < .5) { const s = (x + y * .45) % 140; if (s < 16 && dither((x + 1) & 255, y & 255) < (.5 - d) * (1 - Math.abs(s - 8) / 8)) c = WATER[Math.max(0, i - 1)] === c ? P.steel : WATER[Math.max(0, i - 1)]; }   // (light coming down through it)
  return c;
}
// Wood, as planks: lighter near the top of the sea, darker down in it, and darkest inside (behind) a ship.
const WOOD = [[P.tan, P.ochre, P.wood], [P.ochre, P.wood, P.brown], [P.wood, P.brown, P.plum], [P.brown, P.plum, P.outline]];
function planks(x, y, shade, behind) {
  const d = depthOf(y), set = WOOD[Math.min(3, Math.floor(d * 2.6) + (behind ? 1 : 0) + shade)], row = Math.floor(y / 6), j = y % 6, n = hsh(row * 7.3 + Math.floor((x + row * 23) / 34) * 3.1);
  if (j === 5) return P.outline;                                                     // (the seams between)
  if ((x + row * 23) % 34 === 0) return P.outline;                                   // (the ends of planks)
  if (j === 0 && !behind) return set[0];
  if (n < .15) return set[2];
  if (hsh(x * 1.7 + y * 3.9) < .02) return P.grey3;                                  // (nails)
  return dither(x & 255, y & 255) < .2 + d * .3 ? set[2] : set[1];
}
// Rock: stones fitted together, in courses, each lit along its top and dark along its foot, with dark seams between.
function rock(x, y) {
  const d = depthOf(y), above = y < S.level.surface * TP;
  const set = above ? [P.grey0, P.grey1, P.grey2, P.grey3] : d < .4 ? [P.grey2, P.grey3, P.slate, P.abyss] : [P.grey3, P.slate, P.abyss, P.night];
  const hgt = 9 + Math.floor(hsh(Math.floor(y / 11) * 1.7) * 4), course = Math.floor(y / 11), ly = y - course * 11;
  const sx = x + course * 7, wid = 12 + Math.floor(hsh(course * 3.7 + Math.floor(sx / 16) * 1.3) * 8), stone = Math.floor(sx / wid), lx = sx - stone * wid;
  if (ly === 0 || lx === 0) return set[3];
  if (ly === 1 || (lx === 1 && ly < hgt - 2)) return set[0];
  if (ly >= 9) return set[2];
  if (hsh(stone * 5.1 + course * 2.9) < .25) return dither(x & 255, y & 255) < .5 ? set[1] : set[2];   // (a darker stone, here and there)
  return hsh(x * 1.3 + y * 7.1) < .04 ? set[2] : set[1];
}
function sandAt(x, y, loose) {
  const d = depthOf(y), set = loose ? [P.sky, P.tan, P.tanD] : d < .5 ? [P.tan, P.tanD, P.bark] : [P.tanD, P.bark, P.grey3], n = hsh(x * 3.1 + y * 7.7);
  if (loose && (y + Math.round(Math.sin(x * .35) * 1.5)) % 6 === 0) return set[2];   // (ripples in it)
  return n < .1 ? set[2] : dither(x & 255, y & 255) < .3 ? set[1] : set[0];
}
// The colour of one pixel of a letter of the map, at (x, y) in the map's pixels (i, j inside the letter).
function colourOf(ch, c, rr, x, y, i, j) {
  const below = rr >= S.level.surface;
  if (ch === '#' || ch === '=' || ch === 'o' || ch === 'v' || ch === '^') {
    if (ch === 'o') { const dx = i - 8.5, dy = j - 8.5, q = Math.hypot(dx, dy); if (q < 6.5) return q > 5 ? P.outline : q > 3.6 ? (dx + dy < 0 ? P.gold : P.ochre) : dx + dy < -3 ? P.steel : below ? P.abyss : P.navy; }
    if (ch === 'v' || ch === '^') { const dy = ch === 'v' ? 17 - j : j, q = Math.hypot((i - 8.5) / 1.4, dy); if (q < 6) return q > 5 ? P.grey3 : P.outline; }
    if (ch === '=' && j < 2 && !SOLID.has(tile(c, rr - 1))) return j ? P.ochre : P.tan;
    return planks(x, y, 0, false);
  }
  if (ch === 'r') return rock(x, y);
  if (ch === '_') return sandAt(x, y, false);
  if (ch === 'S') return sandAt(x, y, true);
  if (ch === 'a') return planks(x, y, 0, true);
  if (ch === ',') {   // inside a ship, under the water: the planks of its far side, through the water
    if (tile(c, rr - 1) === 'a' && j < 2) return j ? P.aqua : P.mist;                // (the top of the water, under the trapped air)
    const row = Math.floor(y / 6), jj = y % 6, deep = depthOf(y) > .55;
    if (jj === 5 || (x + row * 23) % 34 === 0) return deep ? P.night : P.navy;   // (the seams)
    if (jj === 0) return deep ? P.ocean : P.deep;
    return hsh(row * 7.3 + Math.floor((x + row * 23) / 34) * 3.1) < .2 ? (deep ? P.night : P.navy) : deep ? P.abyss : P.ocean;
  }
  if (!below) return null;                                                          // (the sky)
  return water(x, y);
}
// Paint one letter of the map (and its outline where it meets anything not solid), and its tint for things under the water.
function paint(c, rr) {
  const ch = tile(c, rr), M = S.level.map, w = M[0].length * TP, solid = SOLID.has(ch), wet = waterAt(c, rr);
  const open = (dc, dr) => !SOLID.has(tile(c + dc, rr + dr));
  for (let j = 0; j < TP; j++) for (let i = 0; i < TP; i++) {
    const x = c * TP + i, y = rr * TP + j;
    let col;
    // (outside corners rounded off: those pixels are whatever is beside them)
    const cut = solid && ((i + j < 3 && open(-1, 0) && open(0, -1)) || (TP - 1 - i + j < 3 && open(1, 0) && open(0, -1)) || (i + TP - 1 - j < 3 && open(-1, 0) && open(0, 1)) || (2 * TP - 2 - i - j < 3 && open(1, 0) && open(0, 1)));
    if (cut) col = colourOf(tile(c + (i < TP / 2 ? -1 : 1), rr), c + (i < TP / 2 ? -1 : 1), rr, x, y, i, j);
    else col = colourOf(ch, c, rr, x, y, i, j);
    if (solid && !cut && ((i === 0 && open(-1, 0)) || (i === TP - 1 && open(1, 0)) || (j === 0 && open(0, -1)) || (j === TP - 1 && open(0, 1)))) col = P.outline;
    if (solid && !cut && ((i === 1 && open(-1, 0) && j > 1) || (j === 1 && open(0, -1)))) { const top = j === 1 && open(0, -1); if (top && rr >= S.level.surface && ch !== 'S' && ch !== '_' && hsh(x * .7) < .45) col = P.leaf; }   // (weed along the tops, under water)
    buf[y * w + x] = col ? pack(col) : 0;
    tbuf[y * w + x] = wet && j + rr * TP > S.level.surface * TP + 3 && dither(x & 255, y & 255) < .19 ? pack(depthOf(y) < .35 ? P.sea : depthOf(y) < .7 ? P.ocean : P.navy) : 0;
  }
}
function paintMap() {
  const M = S.level.map, w = M[0].length * TP, h = M.length * TP;
  mapC.width = tintC.width = w; mapC.height = tintC.height = h;
  const g = mapC.getContext('2d'), tg = tintC.getContext('2d');
  img = g.createImageData(w, h); buf = new Uint32Array(img.data.buffer); tintImg = tg.createImageData(w, h); tbuf = new Uint32Array(tintImg.data.buffer);
  for (let rr = 0; rr < M.length; rr++) for (let c = 0; c < M[0].length; c++) paint(c, rr);
  g.putImageData(img, 0, 0); tg.putImageData(tintImg, 0, 0);
  decorate(g);
  painted = S.level;
}
// After a letter of sand is dug away: paint it, and those round it, again.
function repaint([c, rr]) {
  for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) paint(c + dc, rr + dr);
  const x = (c - 1) * TP, y = (rr - 1) * TP;
  mapC.getContext('2d').putImageData(img, 0, 0, x, y, TP * 3, TP * 3); tintC.getContext('2d').putImageData(tintImg, 0, 0, x, y, TP * 3, TP * 3);
}

// ============================================================================
// What stands on the map: masts, the cabin and rail on the first ship, the whale's bones, weed
// ============================================================================
function decorate(g) {
  const q = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), w, h); }, M = S.level.map, surf = S.level.surface * TP;
  // weed growing up off the bottom and the rocks, under the water
  for (let c = 1; c < M[0].length - 1; c++) for (let rr = S.level.surface + 1; rr < M.length; rr++) {
    const ch = M[rr][c]; if (!((ch === '_' || ch === 'r') && !SOLID.has(M[rr - 1][c]) && M[rr - 1][c] !== 'a')) continue;
    for (let k = 0; k < 2; k++) { if (hsh(c * 3.3 + k * 9.1) < .45) continue; const x0 = c * TP + 3 + k * 9, tall = 8 + Math.floor(hsh(c * 7.1 + k) * 26), top = rr * TP;
      for (let j = 0; j < tall; j++) { const x = x0 + Math.round(Math.sin(j * .3 + c) * 2); if (top - j < surf + 6) break; q(x - 1, top - j, 3, 1, P.outline); q(x, top - j, 1, 1, j > tall - 4 ? P.grass : j % 5 ? P.leaf : P.pine); } }
  }
  // the first ship: a rail along its deck, a coil of rope, and its cabin, half gone
  const deckRow = M.findIndex(q2 => q2.includes('=')), deckY = deckRow * TP, deckEnd = M[deckRow].lastIndexOf('=', 30) + 1;
  for (let x = TP; x < deckEnd * TP - 4; x += 12) { q(x - 1, deckY - 12, 4, 12, P.outline); q(x, deckY - 11, 2, 11, P.wood); }
  q(TP, deckY - 13, deckEnd * TP - TP - 4, 3, P.outline); q(TP, deckY - 12, deckEnd * TP - TP - 4, 1, P.ochre);
  { const x = 3 * TP, w = 4 * TP, h = 3 * TP - 4, y = deckY - h;   // the cabin
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const roof = j < 5 && i < w * .6 + j * 2, door = i > w * .55 && i < w * .8 && j > 14, win = i > 8 && i < 20 && j > 14 && j < 26; if (j < 5 && !roof) continue;
      g.fillStyle = i === 0 || i === w - 1 || j === h - 1 || (roof && j === 0) || (door && (i === Math.ceil(w * .55) || j === 15)) ? P.outline : roof ? (j < 2 ? P.olive : P.brown) : door ? P.outline : win ? (j === 15 || i === 9 ? P.outline : P.night) : planks(i + 7, j + 3, 0, false); g.fillRect(x + i, y + j, 1, 1); }
    for (let i = 0; i < 9; i++) q(x + w * .62 + i, y + 15 + Math.round(i * .4), 1, h - 16, i === 0 || i === 8 ? P.outline : P.wood);   // (its door, hanging open)
  }
  { const x = 13 * TP + 4, y = deckY - 5; q(x - 9, y - 1, 19, 6, P.outline); q(x - 8, y, 17, 4, P.gold); q(x - 6, y + 1, 13, 1, P.ochre); q(x - 4, y - 3, 9, 3, P.outline); q(x - 3, y - 2, 7, 1, P.gold); }   // a coil of rope
  // masts, with what's left of their yards and rigging
  for (const [c, from, to, lean] of S.level.masts) {
    const x0 = c * TP + 9, y1 = to * TP, y0 = from * TP, h = y1 - y0;
    for (let j = 0; j < h; j++) { const x = x0 + (h - j) * lean, y = y1 - j; q(x - 2, y, 5, 1, P.outline); q(x - 1, y, 3, 1, y > surf ? P.brown : P.wood); q(x - 1, y, 1, 1, y > surf ? P.wood : P.ochre); }
    const yy = y0 + Math.round(h * .25), xx = x0 + (h * .75) * lean;
    if (from < 0) { for (let i = -22; i <= 22; i++) { q(xx + i, yy + Math.round(i * .08), 1, 4, P.outline); q(xx + i, yy + 1 + Math.round(i * .08), 1, 2, P.wood); }
      for (let j = 0; j < 14; j++) for (let i = 0; i < 18 - j; i++) if (hsh(i * 3.1 + j * 7.7) > .2) q(xx - 18 + i + Math.round(Math.sin(j * .5) * 2), yy + 4 + j, 1, 1, j === 13 - Math.floor(hsh(i) * 3) ? P.outline : i % 7 === 0 ? P.grey0 : P.foam);   // a rag of sail
      for (const end of [-1, 1]) for (let k = 0; k < 40; k++) { const t = k / 40, x = xx + end * 22 + (end * 70 - end * 22) * t, y = yy + (y1 - yy) * t + Math.sin(t * Math.PI) * 10; q(x, y, 1, 1, P.outline); } }   // (its rigging, slack)
  }
  // the whale: its skull, its long spine, its ribs, lying on the bottom
  const [w0, w1] = S.level.whale, floor = 26 * TP, bone = (x, y, w, h) => { q(x - 1, y - 1, w + 2, h + 2, P.outline); q(x, y, w, h, P.foam); q(x, y + h - 1, w, 1, P.grey0); };
  { const x = w0 * TP, y = floor - 14; for (let i = 0; i < 64; i++) { const t = i / 64, hh = Math.round(4 + 12 * Math.sin(Math.min(1, t * 1.4) * Math.PI * .5) * (1 - t * .35)); q(x + i, y - hh - 1, 1, hh + 15, P.outline); q(x + i, y - hh, 1, hh + 13, t < .5 && i % 9 === 0 ? P.grey0 : P.foam); q(x + i, y + 12, 1, 1, P.grey1); } r2(g, x + 48, y - 4, 5, 3, P.outline); }   // (the skull, and its eye)
  for (let i = 0, x = w0 * TP + 66; x < w1 * TP; i++, x += 9) { const y = floor - 9 - Math.round(Math.sin(i * .25) * 2) + (x > w1 * TP - 80 ? Math.round((x - w1 * TP + 80) / 16) : 0), s = Math.max(2, 6 - Math.floor(i / 8)); bone(x, y, s, s - 1);
    if (i < 14) { const tall = 34 - i * 1.4; for (let k = 0; k < tall; k++) { const rx = x + 2 + Math.round(Math.sin(k / tall * Math.PI * .55) * 10), ry = y - k; q(rx - 1, ry, 4, 1, P.outline); q(rx, ry, 2, 1, k % 9 === 8 ? P.grey0 : P.foam); } } }
}
const r2 = (g, x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };

// ============================================================================
// Things that move: the turtle, the eels, Ichigo
// ============================================================================
// The turtle: old, slow, her shell green and worn, a few barnacles on it. Faces right; two strokes of her flippers.
const TC = { o: P.olive, l: P.leaf, p: P.pine, w: P.foam, h: P.grey1, g: P.grey2, k: P.ink };
const tpic = rows => { const w = Math.max(...rows.map(q => q.length)); return outline(scale2x(rows.map(q => q.padEnd(w, '.'))).map(q => [...q].map(ch => (ch === '.' ? null : TC[ch])))); };
const SHELL = [
  '...........oooooooo',
  '........ooollloollloo',
  '......oollllwlllpllllloo',
  '.....olllllllpllllplllllo',
  '....ollllpppppppppppllllllo...hhh',
  '...olllllpllllpllllpllllllo..hgggh',
  '..oooooooooooooooooooooooooohgggkgh',
];
const TURTLE = [
  tpic([...SHELL, '..hgggggggggggggggggggggggggggggggg', '.hgg.....gg..........ggggggggggg', 'hgg..................hgggggggg', 'gg.....................hggggg', '........................hgg']),
  tpic([...SHELL, '..hgggggggggggggggggggggggggggggggg', '..hgg....gg........hgggg', '...hgg............hggggg', '....g............hgggg', '................hggg']),
];
function turtle(x, y, face, anim) {
  const f = TURTLE[Math.floor(anim) % 2], w = f[0].length, h = f.length, x0 = Math.round(x - w / 2), y0 = Math.round(y - h / 2);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const c = f[j][i]; if (c) r(face > 0 ? x0 + i : x0 + w - 1 - i, y0 + j, 1, 1, c); }
}
// An eel: out of its hole, along `dir`, as far as k of its reach; its head at the end, mouth open.
function eel(e) {
  const b = eelBox(e), k = eelOut(e), [hx] = at(e.c + .5, 0), x = X(hx);
  if (eelWarn(e) || k <= 0) { if (eelWarn(e) && Math.sin(S.T * 14) > -.6) { const y = Y(e.dir > 0 ? b.y0 : b.y1) - e.dir * 3; r(x - 3, y, 2, 2, P.gold); r(x + 2, y, 2, 2, P.gold); } return; }
  const y0 = Y(e.dir > 0 ? b.y0 : b.y1), len = Math.round((b.y1 - b.y0) / PIXEL);
  for (let j = 0; j < len; j++) { const y = y0 + e.dir * j, wob = Math.round(Math.sin(j * .35 - S.T * 9) * 2 * Math.min(1, j / 10)), wd = j > len - 7 ? 4 : 3; r(x - wd - 1 + wob, y, wd * 2 + 2, 1, P.outline); r(x - wd + wob, y, wd * 2, 1, P.olive); r(x - wd + wob, y, 2, 1, P.grass); if (j % 4 === 0) r(x + wob, y, 1, 1, P.pine); }
  const hy = y0 + e.dir * (len - 4), wob = Math.round(Math.sin((len - 4) * .35 - S.T * 9) * 2); r(x - 3 + wob, hy - 1, 2, 2, P.gold); r(x + 2 + wob, hy - 1, 2, 2, P.gold); r(x - 2 + wob, hy + e.dir * 3, 5, 1, P.red); r(x - 1 + wob, hy + e.dir * 4, 3, 1, P.white);
}
// Ichigo, however they are: on the deck, in the air, floating at the top of the water, swimming, digging, holding the bone up.
function ichigo() {
  const ix = X(D.x), iy = Y(D.y), scars = Math.min(5, S.deaths), marks = [...markIds(), D.sulk > 0 || D.phase === 'over' || (D.mode === 'swim' && D.breath < .25) ? 'pout' : null, D.phase === 'over' ? 'asleep' : null].filter(Boolean);
  if (D.phase === 'ride') { drawSprite(lg, 'sit', ix, iy + 13, 1, scars, [0, 0], markIds()); return iy - 24; }
  if (D.phase === 'over') { drawTurned(lg, 'jump', ix, iy, 1, D.face, scars, [1, 0], marks); return iy - 16; }
  if (D.hold > 0) { const feet = iy + (D.mode === 'deck' ? 9 : 18); drawSprite(lg, 'jump', ix, feet, D.face, scars, [0, 0], marks); bladeOver(ix, feet - spriteHeight() - 4); return feet - spriteHeight() - 18; }
  if (D.mode === 'deck') {
    const feet = iy + 9, step = Math.floor(D.anim / 1.6) % 2, run = Math.abs(D.vx) > 190;
    const frame = D.seated ? 'sit' : !D.ground ? 'jump' : D.moving ? ['stand', 'step1', 'stand', 'step2'][Math.floor(D.anim / 1.6) % 4] : 'stand';
    drawSprite(lg, frame, ix, feet, D.face, scars, !D.ground ? [1, D.vy > 150 ? 2 : 0] : D.moving ? [(run ? 1 : 0) + step, step] : [0, 0], marks);
    return feet - (D.seated ? 34 : spriteHeight());
  }
  if (D.digging) { const feet = iy + 10; drawSprite(lg, Math.floor(D.digT * 7) % 2 ? 'dig1' : 'dig2', ix, feet, D.face, scars, [1, 0], marks.filter(m => m !== 'bone')); bladeIn(ix + D.face * 20, feet - 6, D.digT); return feet - 40; }
  if (D.surfaced && !(D.moving && D.turn === 1)) {   // treading water, head and shoulders out
    const feet = iy + 27; drawSprite(lg, Math.floor(D.anim * 3) % 2 ? 'balance' : 'stand', ix, feet + Math.round(Math.sin(S.T * 3) * 1.2), D.face, scars, [0, 0], marks); return feet - spriteHeight();
  }
  drawTurned(lg, Math.floor(D.anim * 4) % 2 ? 'kick' : 'jump', ix, iy, D.turn, D.face, scars, [D.moving ? 1 : 0, 0], marks);
  return iy - (D.turn === 1 ? 16 : 26);
}
// The shoulder blade: held up over Ichigo's head, or in their hands, digging.
const BLADE = outline(['.wwwww.', 'wwwwwwm', 'wwwwwmm', '.wwwwm.', '.wwwm..', '..wwm..', '..wm...', '..mm...', '..mm...'].map(q => [...q].map(ch => ({ w: P.foam, m: P.grey1 }[ch] || null))));
function bladeOver(x, y) { BLADE.forEach((row, j) => row.forEach((c, i) => { if (c) r(x - 4 + i, y - BLADE.length + j + Math.round(Math.sin(S.T * 6)), 1, 1, c); })); if (Math.sin(S.T * 5) > .3) { r(x + 6, y - 12, 1, 5, P.white); r(x + 4, y - 10, 5, 1, P.white); } }
function bladeIn(x, y, t) { const tilt = Math.floor(t * 7) % 2; BLADE.forEach((row, j) => row.forEach((c, i) => { if (c) r(x + (D.face > 0 ? i : -i) - 3 + (tilt ? j * .4 * D.face : 0), y - BLADE.length + j + 4, 1, 1, c); })); }

// ============================================================================
export function drawWrecks() {
  if (painted !== S.level) paintMap();
  if (D.changed) { repaint(D.changed); D.changed = null; }
  const ended = S.scene === 'end', cover = S.scene === 'dawn' && S.sceneT < 1.45, story = S.scene === 'story', cy = camY();
  const ox = -Math.round(S.camX / PIXEL), oy = Math.round((top0() - cy) / PIXEL + TOP_PX);
  // the sky, Fuji and the far sea (slid up as the camera goes down), then the map
  pixelSpace(lg); lg.fillStyle = P.night; lg.fillRect(0, 0, LW, LH);
  if (cy / PIXEL < LH) { drawScenery(skyG(), S.camX, S.T, S.level.fuji, { sky: 'day' }); lg.drawImage(sky, 0, -Math.round(cy / PIXEL)); }
  lg.drawImage(mapC, ox, oy);
  surface();
  // what's in the water
  for (const it of D.items) if (!it.taken) item(it);
  for (const e of D.eels) eel(e);
  const tt = D.turtle; turtle(X(tt.x), Y(tt.y), tt.face, tt.anim);
  let head = null;
  if (!cover) head = ichigo();
  for (const b of D.bubbles) { const x = X(b.x), y = Y(b.y); if (b.s > 1) { r(x - 1, y - 1, 4, 4, P.outline); r(x, y, 2, 2, P.mist); r(x, y, 1, 1, P.white); } else r(x, y, 2, 2, P.mist); }
  for (const q of parts) if (q.life > .05) r(X(q.x), Y(q.y), q.s > 1 ? 3 : 2, q.s > 1 ? 3 : 2, q.c);
  lg.drawImage(tintC, ox, oy);   // (a little of the water's colour over whatever's under it)

  if (S.scene === 'deep' && D.phase === 'play' && head !== null) {
    const ix = X(D.x), act = action(), pr = prompt();
    if (D.mode === 'swim' && (!D.surfaced || D.breath < 1)) breath(ix, head - 12);
    if (D.digging) { const [x, y] = at(D.digging[0] + .5, D.digging[1]); bar(X(x), Y(y) - 8, D.digT / WRECKS.dig, P.gold); }
    if (pr && pr.x !== undefined) marker(X(pr.x), Y(pr.y) - 20 + Math.round(Math.sin(S.T * 8) * 3));
    else if (act && act.do === 'nothing') { const [x, y] = at(act.c + .5, act.r); r(X(x) - 1, Y(y) - 12, 3, 7, P.ember); r(X(x) - 1, Y(y) - 4, 3, 2, P.ember); }
    drawBubbles(lg, { ichigo: [ix, head] });
  } else if (D.phase === 'ride' && head !== null) drawBubbles(lg, { ichigo: [X(D.x), head] });
  if (D.fade > 0) dots(D.fade, P.night);
  if (S.scene === 'dawn') drawDawn(lg, S.sceneT, S.deaths - 1);
  if (S.scene === 'dawn' && S.sceneT >= 1.45) ichigo();
  if (!ended && !story && !(S.scene === 'dawn' && S.sceneT > .3 && S.sceneT < 1.5)) drawHUD(progress());
  const now = S.scene === 'deep' && !ended ? prompt() : null;
  if (now) {   // what to do now: gold while it needs doing, green once it's being done, red when it's urgent
    const w = now.text.length * LETTER + 20, x = Math.round((LW - w) / 2), c = now.ok ? P.grass : now.warn ? P.ember : P.gold;
    r(x - 2, 316, w + 4, 30, c); r(x, 318, w, 26, P.night); pixelText(now.text, LW / 2, 324, c, 'center');
  } else if (D.hint && D.hintT > 0 && S.scene === 'deep') {
    const lines = ['']; for (const word of D.hint.split(' ')) { const c = lines[lines.length - 1]; if (c && (c + ' ' + word).length > 34) lines.push(word); else lines[lines.length - 1] = c ? c + ' ' + word : word; }
    const w = Math.max(...lines.map(l => l.length)) * LETTER + 16, h = lines.length * LINE + 12, x = Math.round((LW - w) / 2), y = 350 - h;
    r(x - 1, y - 1, w + 2, h + 2, P.mist); r(x, y, w, h, P.night); lines.forEach((l, i) => pixelText(l, LW / 2, y + 7 + i * LINE, P.mist, 'center'));
  }
  if (ended) drawEndFg(S.sceneT);
}
const sky = document.createElement('canvas'); sky.width = LW; sky.height = LH;
const skyG = () => sky.getContext('2d');
// The top of the open sea: a line of foam, moving a little, where the water meets the air.
function surface() {
  const y0 = Y(SURFACE); if (y0 < -4 || y0 > LH + 4) return;
  const surf = S.level.surface;
  for (let x = 0; x < LW; x++) {
    const wx = S.camX + x * PIXEL, c = Math.floor(wx / T); if (!waterAt(c, surf) || solidAt(c, surf - 1) || tile(c, surf - 1) === 'a') continue;
    const up = Math.round(Math.abs(Math.sin(wx * .021 - S.T * 1.5) * 1.6 + Math.sin(wx * .007 + S.T * .8) * 1.4)), y = y0 - up;
    r(x, y, 1, up + 3, P.sea); r(x, y, 1, 1, P.outline); r(x, y + 1, 1, 1, hsh(Math.floor(wx / 6) + Math.floor(S.T * 3)) < .3 ? P.mist : P.white);
    if (hsh(Math.floor(wx / 9) * 3.1 + Math.floor(S.T * 1.5)) < .25) r(x, y + 3 + Math.round(hsh(x) * 3), 1, 1, P.aqua);
  }
}
// The bone and the teacup, lying where they are, with a glint now and then.
const CUP = THINGS.teacup.grid, BONE = THINGS.bone.grid;
function item(it) {
  const g = it.kind === 'bone' ? BONE : CUP, x = X(it.x) - Math.floor(g[0].length / 2), y = Y(it.y) - g.length;
  g.forEach((row, j) => row.forEach((c, i) => { if (c) r(x + i, y + j, 1, 1, c); }));
  if ((S.T + it.x) % 2.2 < .35) { r(x + 2, y - 3, 1, 5, P.white); r(x, y - 1, 5, 1, P.white); }
}
// Ichigo's breath: a bubble over their head, smaller as it goes; red at the edge when there's hardly any left.
function breath(x, y) {
  const k = Math.max(0, D.breath), rad = 2 + Math.round(k * 7), low = k < .3 && Math.sin(S.T * 14) > 0;
  for (let j = -rad - 1; j <= rad + 1; j++) for (let i = -rad - 1; i <= rad + 1; i++) { const d = Math.hypot(i, j); if (d > rad + .5) continue; r(x + i, y + j, 1, 1, d > rad - .7 ? (low ? P.ember : P.outline) : (i < -rad * .3 && j < -rad * .3) ? P.white : d > rad - 1.8 ? P.aqua : P.sea); }
}
const MARKER = ['KKKKKKK', 'KWWWWWK', '.KWWWK.', '..KWK..', '...K...'];
function marker(x, y) { MARKER.forEach((row, j) => [...row].forEach((ch, i) => { if (ch !== '.') r(x - 10 + i * 3, y + j * 3, 3, 3, ch === 'K' ? P.outline : P.gold); })); }
function bar(x, y, k, col) { r(x - 17, y, 36, 6, P.outline); r(x - 16, y + 1, 34, 4, P.night); r(x - 16, y + 1, 34 * Math.max(0, Math.min(1, k)), 4, col); }
const tile4 = document.createElement('canvas'); tile4.width = tile4.height = 4;
function dots(k, col) { const t = tile4.getContext('2d'); t.clearRect(0, 0, 4, 4); t.fillStyle = col; for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) if (dither(x, y) < k) t.fillRect(x, y, 1, 1); lg.fillStyle = lg.createPattern(tile4, 'repeat'); lg.fillRect(0, 0, LW, LH); }
