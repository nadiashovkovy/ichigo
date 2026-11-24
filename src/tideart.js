// ============================================================================
// tideart.js — how Level 2 looks (tide.js is how it plays): the lantern island under the moon, the
// lantern's light on the sand, waves and sea-fireflies; then dawn, the sandbar, and the green island.
// From back to front: the sky, moon and far sea → the island and its lantern → things on the sand, and
// Ichigo → water on the sand → the near sea, as high as the tide (so the island shrinks as it rises).
// ============================================================================
import { W, TOP, LW, LH, TOP_PX, PIXEL, P, TIDE, px, onPixel, toPx } from './config.js';
import { S, parts } from './state.js';
import { lg, tg, topC, beginWorld, beginTop, pixelSpace, quantize, scale2x, dither } from './pixel.js';
import { pixelText, LETTER } from './text.js';
import { drawScenery, drawChartSea, drawLantern, drawLife, hsh } from './art.js';
import { drawSprite, spriteHeight, markIds, outline } from './sprite.js';
import { drawBubbles } from './bubbles.js';
import { drawDawn } from './dawn.js';
import { drawHUD, drawEndFg } from './scenes.js';
import { N, yOf, groundZ, seaZ, restZ, waveX, waveT, action, onBar, setTime } from './tide.js';
import { THINGS } from './things.js';

const X = x => Math.round((x - S.camX) / PIXEL);            // a world x, in pixels on screen
const Y = z => Math.round(yOf(z) / PIXEL + TOP_PX);         // a height, in pixels on screen

// --- little pictures (letter grids, like sprite.js) ---
const C = { R: P.red, r: P.rust, o: P.dawn, w: P.white, K: P.outline, T: P.tan, p: P.pink, b: P.wood, m: P.mist, a: P.aqua };
const pic = rows => outline(rows.map(r => [...r].map(ch => (ch === '.' ? null : C[ch]))));
const CRAB = [   // two walking frames
  ['RR..........RR', 'R.R..w..w..R.R', '.RR..K..K..RR.', '..R.oRRRRo.R..', '...RRRRRRRR...', '..rRRRRRRRRr..', '.r.rRRRRRRr.r.', 'r..r.rrrr.r..r'],
  ['.RR........RR.', 'R.R..w..w..R.R', 'RR...K..K...RR', '..R.oRRRRo.R..', '...RRRRRRRR...', '.rrRRRRRRRRrr.', 'r..rRRRRRRr..r', '..r..rrrr..r..'],
].map(pic);
const SHELL = pic(['..Tbp..', '.TpbTp.', 'TpTbTbT', 'TbTKKpT', '.TpwwT.', '..TTT..']);
// the crest of a wave rolling in: foam curling over to the left, claws reaching (after Hokusai's)
const CREST = scale2x([
  '.......wwwww......',
  '....wwwwmmmwww....',
  '..wwwmmaaammwww...',
  '.ww.mwaaaaaammww..',
  'ww.w.wwaaaaaaammw.',
  'w.w..w.waaaaaaaamm',
  '..w.w...aaaaaaaaaa',
]).map(r => [...r].map(ch => (ch === '.' ? null : C[ch])));
function drawGrid(g, grid, cx, bottom, flip = false) {
  const w = grid[0].length, x0 = Math.round(cx - w / 2), y0 = Math.round(bottom) - grid.length + 1;
  grid.forEach((row, r) => row.forEach((c, i) => { if (c) { g.fillStyle = c; g.fillRect(x0 + (flip ? w - 1 - i : i), y0 + r, 1, 1); } }));
}
const MARKER = ['KKKKKKK', 'KWWWWWK', '.KWWWK.', '..KWK..', '...K...'];
function drawMarker(x, y) {
  MARKER.forEach((r, j) => [...r].forEach((ch, i) => { if (ch !== '.') { lg.fillStyle = ch === 'K' ? P.outline : P.white; lg.fillRect(x - 3 + i, y + j, 1, 1); } }));
}

// --- the sky: the moon is the clock, crossing from right to left over the sets ---
function nightGone() {   // 0..1
  const sets = S.level.sets;
  if (N.phase === 'wake') return 0;
  if (onBar()) return 1;
  let all = 0, done = 0;
  sets.forEach((s, i) => { const t = setTime(s); all += t; if (i < N.set) done += t; });
  if (N.phase === 'calm') done += N.t;
  else if (N.phase === 'waves') done += TIDE.calm + Math.max(0, N.wave - 1) * sets[N.set].gap + N.t;
  return Math.min(1, done / all);
}
let shownGone = 0;
function moonAt() { const k = shownGone; return { x: Math.round(LW * (.9 - .8 * k)), y: Math.round(120 - 84 * Math.sin(Math.PI * k)), r: 17 }; }
function disc(B, cx, cy, r, c) { for (let j = -r; j <= r; j++) { const h = Math.round(Math.sqrt(r * r + r * .6 - j * j) || 0); B.rect(cx - h, cy + j, h * 2 + 1, 1, c); } }
function behind(B) {
  if (N.light < .6) {
    const m = moonAt(), y = m.y + Math.round(N.light * 200);
    disc(B, m.x, y, m.r + 2, P.indigo); disc(B, m.x, y, m.r, P.foam);   // a ring of haze, then the moon
    for (const [dx, dy, r] of [[-5, -4, 4], [6, 3, 5], [-3, 8, 3]]) disc(B, m.x + dx, y + dy, r, P.grey0);   // its seas
  }
  if (N.light > .3) {   // the red sun, rising behind where the green island is
    const k = Math.min(1, (N.light - .3) / .7), cx = Math.round(LW * .74 - S.camX * .02), cy = Math.round((392 + TOP) / PIXEL) - Math.round(k * 34 + Math.min(16, N.barT * 1.2));
    disc(B, cx, cy, 30, P.red);
  }
}
// moonlight on the far sea: pale dashes under the moon
function drawGlints() {
  if (N.light > .3) return;
  const m = moonAt(), top = Math.round((384 + TOP) / PIXEL);
  for (let i = 0; i < 26; i++) {
    const y = top + i * 3, w = 3 + Math.floor(hsh(i * 3.3) * 10 + i * .3), dx = Math.round((hsh(i * 5.1) - .5) * (14 + i * 1.6));
    if (Math.sin(S.T * (1.2 + hsh(i) * 1.6) + i * 2) < -.1) continue;
    lg.fillStyle = i % 3 ? P.pale : P.mist; lg.fillRect(m.x + dx - (w >> 1), y, w, 1);
  }
}

// --- the island: sand on rock, a column of pixels at a time ---
const NIGHT = { top: P.tan, sand: P.tanD, sandD: P.bark, wet: P.mauve, rock: P.grey3, rockD: P.slate, rockL: P.grey2 };
const DAY = { top: P.sky, sand: P.tan, sandD: P.tanD, wet: P.ochre, rock: P.grey2, rockD: P.grey3, rockL: P.grey1 };
// (beyond the lantern's light, the sand is dark)
const DARK = { top: P.bark, sand: P.mauve, sandD: P.violet, wet: P.violet, rock: P.slate, rockD: P.plum, rockL: P.grey3 };
const BLUE = { top: P.pale, sand: P.steel, sandD: P.slate, wet: P.deep, rock: P.grey3, rockD: P.slate, rockL: P.grey2 };   // (lit by sea-fireflies)
let shownReach = 150;
export const reachOfLight = () => (N.lit ? TIDE.light[0] + (TIDE.light[1] - TIDE.light[0]) * N.fuel : N.phase === 'out' ? 34 * Math.max(0, 1 - N.t) : 0) + N.flare * 40;
function drawGround(g) {
  const morning = N.light > .55, sea = Y(N.tide) + 6, green = onBar() ? S.level.bar.to + 70 : 1e9;
  for (let sx = 0; sx < LW; sx++) {
    const x = S.camX + (sx + .5) * PIXEL, z = groundZ(x), y = Y(z), wx = Math.floor(x / PIXEL);
    if (y > sea + 4) continue;
    const lit = morning ? 1 : (shownReach - Math.abs(x - S.level.lantern)) / 46 + .5, c = morning ? DAY : lit > 0 ? (dither(sx, (wx * 7) & 3) < N.blue ? BLUE : NIGHT) : DARK;
    // the sand lies thin on the island's rock, and thickens into the sandbar
    const bar = onBar() && x < green ? Math.max(0, Math.min(1, (x - S.level.bar.from + 190) / 190)) : 0, deep = 9 + Math.round(2 * Math.sin(wx * .05) + hsh(Math.floor(wx / 3)) * 2 + bar * bar * 40);
    g.fillStyle = P.outline; g.fillRect(sx, y - 1, 1, 1);
    const isle = x >= green;
    g.fillStyle = isle ? P.grass : c.top; g.fillRect(sx, y, 1, 2);
    g.fillStyle = isle ? P.leaf : c.sand; g.fillRect(sx, y + 2, 1, deep - 2);
    g.fillStyle = isle ? P.tanD : c.sandD; g.fillRect(sx, y + deep, 1, 3);
    g.fillStyle = isle ? P.wood : c.rock; g.fillRect(sx, y + deep + 3, 1, LH);
    for (let k = 0; k < 8; k++) {   // cracks and ledges in the rock; flecks in the sand
      const h = hsh(Math.floor(wx / 4) * 7.7 + k * 3.1), yy = y + deep + 5 + k * 6 + Math.floor(h * 5);
      if (h > .55) { g.fillStyle = h > .8 ? c.rockL : c.rockD; g.fillRect(sx, yy, 1, h > .7 ? 2 : 1); }
    }
    const f = hsh(Math.floor(wx / 3) * 5.3); if (f > .72) { g.fillStyle = isle ? P.pine : c.sandD; g.fillRect(sx, y + 3 + Math.floor(f * 40) % 6, 1, 1); }
    if (lit > 0 && lit < 1) for (let yy = y; yy < Math.min(LH, sea + 8); yy++) if (dither(sx, yy) > lit) { g.fillStyle = yy < y + 2 ? DARK.top : yy < y + deep ? DARK.sand : yy < y + deep + 3 ? DARK.sandD : DARK.rock; g.fillRect(sx, yy, 1, 1); }   // the edge of the light
    if (z < N.tide + 7) { g.fillStyle = c.wet; g.fillRect(sx, y, 1, 4); }   // wet sand at the water's edge
  }
}
// The green island the sandbar leads to: a wooded hill, plum trees along its edge.
function drawGreenIsland(g) {
  const x = S.level.bar.to - S.camX;
  if (x > W + 300) return;
  const base = yOf(0) + 20;
  for (const [dx, w, h, col] of [[330, 260, 176, P.pine], [190, 170, 112, P.leaf], [480, 200, 130, P.leaf]]) {
    g.fillStyle = col; g.beginPath(); g.moveTo(x + dx - w, base); g.quadraticCurveTo(x + dx - w * .45, base - h * 1.02, x + dx, base - h); g.quadraticCurveTo(x + dx + w * .5, base - h, x + dx + w, base); g.fill();
    g.fillStyle = col === P.pine ? P.leaf : P.grass;   // tufts of treetops
    for (let i = 0; i < 26; i++) { const k = hsh(i * 3.7 + dx) * 2 - 1, v = hsh(i * 9.1 + dx); g.fillRect(onPixel(x + dx + k * w * .55), onPixel(base - h * (1 - Math.abs(k) * .75) * (.4 + v * .55)), px(5 + Math.floor(v * 6)), px(2)); }
  }
  for (const [dx, s] of [[110, 1], [230, 1.2], [330, .9]]) {   // plum trees
    const tx = x + dx, ty = yOf(groundZ(S.level.bar.to + dx)) + 3;
    g.strokeStyle = P.brown; g.lineWidth = 7 * s; g.beginPath(); g.moveTo(tx, ty); g.quadraticCurveTo(tx - 10 * s, ty - 36 * s, tx + 4 * s, ty - 62 * s); g.stroke();
    for (const [ex, ey, er] of [[-20, -58, 22], [20, -62, 24], [0, -80, 22]]) { g.fillStyle = P.pine; g.beginPath(); g.ellipse(tx + ex * s, ty + ey * s, er * s * 1.2, er * s * .7, 0, 0, 7); g.fill(); g.fillStyle = P.leaf; g.beginPath(); g.ellipse(tx + (ex - 3) * s, ty + (ey - 4) * s, er * s * .85, er * s * .42, 0, 0, 7); g.fill(); }
    for (let i = 0; i < 9; i++) { g.fillStyle = i % 3 ? P.plum : P.rosewood; g.fillRect(onPixel(tx + (hsh(i * 2.3 + dx) - .5) * 70 * s), onPixel(ty - (46 + hsh(i * 5.9 + dx) * 44) * s), px(3), px(3)); }
  }
}

// --- the water ---
const tone = () => (N.light > .5 ? 'dusk' : 'night');
const chop = wx => Math.sin(wx * .03 - S.T * 1.6) * 1.8 + Math.sin(wx * .011 + S.T * .9) * 1.4;
// The sea's resting height as it's drawn: one side draws back further than the other, so the sea in
// front of the island slopes smoothly from one to the other.
function restSeen(wx) {
  const c = S.level.lantern, k = Math.max(0, Math.min(1, (wx - c + 190) / 380)), m = k * k * (3 - 2 * k);
  return restZ(c - 200) * (1 - m) + restZ(c + 200) * m;
}
// The near sea, in front of everything: the sea's own surface off the island; in front of the island, the tide.
function nearSea(wx) {
  const w = N.w, i = Math.floor((wx - w.x0) / w.cw);
  if (onBar() || i < 0 || i >= w.n) return yOf(seaZ(wx) + chop(wx));
  // (near the shore a passing wave's height fades into the tide's, so the sea in front has no step in it:
  // the wave itself is drawn running up the sand, below)
  const rest = restSeen(wx), f = Math.max(0, Math.min(1, (rest - w.ground[i]) / 26)), k = f * f * (3 - 2 * f);
  const j = Math.max(0, Math.min(w.n - 2, Math.floor((wx - w.x0) / w.cw - .5))), m = Math.max(0, Math.min(1, (wx - w.x0) / w.cw - .5 - j));
  const z = Math.max(rest, w.surface(j) + (w.surface(j + 1) - w.surface(j)) * m);
  return yOf(rest + (z - rest) * k + chop(wx));
}
// The water running up the sand and standing in puddles (drawn only above the ground).
function drawLandWater() {
  const w = N.w;
  if (onBar() && N.phase !== 'ebb') return;
  let any = false; for (let i = 0; i < w.n; i++) if (w.d[i] > .7 && w.surface(i) > restZ(w.x0 + (i + .5) * w.cw) + 1.5) { any = true; break; }
  if (!any) return;
  const x0 = X(w.x0), x1 = X(w.x0 + w.n * w.cw);
  lg.save(); lg.beginPath(); lg.moveTo(x0, -10);
  for (let sx = x0; sx < x1; sx++) lg.lineTo(sx, Y(groundZ(S.camX + (sx + .5) * PIXEL)) + .5);
  lg.lineTo(x1, -10); lg.closePath(); lg.clip();
  drawChartSea(lg, S.camX, S.T, wx => {
    const f = (wx - w.x0) / w.cw - .5, i = Math.max(0, Math.min(w.n - 2, Math.floor(f))), k = f - i, a = w.d[i] > .7, b = w.d[i + 1] > .7;
    if (!a && !b) return yOf(groundZ(wx)) + 14;   // dry: hidden under the ground
    const sa = a ? w.surface(i) : Math.min(w.surface(i + 1), w.solid(i)), sb = b ? w.surface(i + 1) : Math.min(w.surface(i), w.solid(i + 1));
    return yOf(sa + (sb - sa) * Math.max(0, Math.min(1, k)));
  }, Math.max(0, x0), Math.min(LW, x1), false, tone());
  lg.restore();
}
// The waves rolling in: a curling crest riding on each swell until it breaks.
function drawCrests() {
  for (const v of N.swells) {
    if (waveT(v) < 0) continue;
    const out = v.side === 'right' ? 1 : -1, x = waveX(v), shore = S.level.lantern + out * (285 - N.tide * 4);
    if (v.side === 'right' ? x < shore : x > shore) continue;
    const grid = CREST.slice(0, Math.max(6, Math.round(CREST.length * Math.min(1, v.h / 58))));
    // (riding the water itself where the wave has reached the columns of water, a little behind where it would be in the open sea)
    const w = N.w; let at = x, z = seaZ(x);
    if (x > w.x0 + 36 && x < w.x0 + w.n * w.cw - 36) { z = -99; for (let i = w.col(x - 20); i <= w.col(x + 20); i++) { const wx = w.x0 + (i + .5) * w.cw, q = -nearSea(wx); if (q > z) { z = q; at = wx; } } z = TIDE.base + z; }
    drawGrid(lg, grid, X(at) + (v.side === 'right' ? -4 : 4), Y(z) + 3 + Math.round(Math.sin(S.T * 9)), v.side === 'left');
  }
}

// ============================================================================
export function drawTide() {
  const gone = nightGone(); shownGone += (gone - shownGone) * (Math.abs(gone - shownGone) > .2 ? 1 : .06);   // (the moon never jumps)
  if (N.phase === 'wake') shownGone = gone;
  beginWorld(); drawScenery(lg, S.camX, S.T, S.level.fuji, { sky: 'night', light: N.light, behind });
  pixelSpace(lg); drawGlints();
  if (N.light > .8) drawLife(lg, S.camX, S.T);   // (gulls, in the morning)

  beginTop();
  if (onBar()) drawGreenIsland(tg);
  pixelSpace(tg); drawGround(tg);
  beginTopKeep();
  shownReach += (reachOfLight() - shownReach) * .08;
  const lx = onPixel(S.level.lantern - S.camX); if (lx > -60) drawLantern(tg, lx, onPixel(yOf(groundZ(S.level.lantern))), S.T, N.phase !== 'out' && N.lit && N.light < .9 && (N.fuel > .18 || onBar() || Math.sin(S.T * 23) + Math.sin(S.T * 9) > -.6));   // (nearly out, it flickers)
  pixelSpace(tg);
  if (S.scene === 'tide' && S.sceneT < .5 && S.levelT < 1) { tg.globalAlpha = 1 - S.sceneT / .5; tg.fillStyle = P.night; tg.fillRect(0, 0, LW, LH); tg.globalAlpha = 1; }
  quantize(tg); lg.drawImage(topC, 0, 0);

  drawBlueLight(); drawLying(); drawGlows();
  const ended = S.scene === 'end', cover = S.scene === 'dawn' && S.sceneT < 1.45;
  const ix = X(N.x), sitting = N.seated || N.stumble > 0 || ended || N.shellT > 0;
  // sitting on a slope, Ichigo sinks in as far as its lower side (or there'd be a gap under them)
  const feet = (sitting ? Math.max(Y(N.z), Y(groundZ(N.x - 15)), Y(groundZ(N.x + 15))) : Y(N.z)) - Math.round(N.hop / PIXEL);
  if (!cover && !N.gone) drawIchigo(ix, feet, sitting);
  drawLandWater();
  drawChartSea(lg, S.camX, S.T, nearSea, 0, LW, false, tone());
  drawCrests(); drawSparkles(); drawMeter();
  for (const q of parts) if (q.life > .05) { const n = toPx(2 * (q.s || 1)); lg.fillStyle = q.c; lg.fillRect(X(q.x), Math.round(q.y / PIXEL + TOP_PX), n, n); }

  const head = feet - (sitting ? Math.round(46 * .75) : spriteHeight());
  if (S.scene === 'tide') {
    const act = action(), bob = Math.round(Math.sin(S.T * 5) * 1.5);
    if (act) drawMarker(act.do === 'scoop' ? X(act.glow.x) : act.do === 'take' ? X(N.thing.x) : ix, act.do === 'scoop' ? Y(groundZ(act.glow.x)) - 16 + bob : act.do === 'take' ? Y(groundZ(N.thing.x)) - 24 + bob : head - 10 + bob);
    if (N.asleep) drawZs(ix + 14, head + 6);
    drawBubbles(lg, { ichigo: [ix, head] });
  }
  if (S.scene === 'dawn') drawDawn(lg, S.sceneT, S.deaths - 1);
  if (S.scene === 'dawn' && S.sceneT >= 1.45 && !N.gone) drawIchigo(ix, feet, false);
  if (!ended && !(S.scene === 'dawn' && S.sceneT > .3 && S.sceneT < 1.5)) drawHUD(onBar() ? .75 + .25 * Math.min(1, N.x / S.level.bar.goal) : .75 * shownGone);
  if (N.hint && N.hintT > 0 && S.scene === 'tide') {   // (on a small dark panel, like the story cards')
    const w = N.hint.length * LETTER + 16, x = Math.round((LW - w) / 2);
    lg.fillStyle = P.mist; lg.fillRect(x - 1, 55, w + 2, 30); lg.fillStyle = P.night; lg.fillRect(x, 56, w, 28);
    pixelText(N.hint, LW / 2, 63, P.mist, 'center');
  }
  if (ended) drawEndFg(S.sceneT);
}
function beginTopKeep() { tg.setTransform(1 / PIXEL, 0, 0, 1 / PIXEL, 0, TOP / PIXEL); }   // (game units on the top layer, keeping what's drawn)

function drawIchigo(ix, feet, sitting) {
  const step = Math.floor(N.anim / 1.6) % 2, running = Math.abs(N.v) > 220;
  const frame = sitting ? 'sit' : N.air ? 'balance' : N.pouring > 0 ? 'dig1' : N.scooping > 0 ? (N.scooping > .1 ? 'dig2' : 'dig1')
              : N.moving ? ['stand', 'step1', 'stand', 'step2'][Math.floor(N.anim / 1.6) % 4] : Math.abs(N.push) > 18 ? 'balance' : 'stand';
  const hair = N.air ? [0, N.hopV < 0 ? 2 : 0] : N.moving ? [(running ? 1 : 0) + step, step] : [0, 0];
  const marks = [...markIds().filter(m => N.scooping <= 0 || m !== 'shovel'), N.load ? 'water' : null, N.sulk > 0 || (N.cry > 0 && Math.sin(S.T * 16) > -.4) ? 'pout' : null, N.asleep || N.cry > 0 ? 'asleep' : null].filter(Boolean);
  drawSprite(lg, frame, ix, feet, N.face, Math.min(5, S.deaths), hair, marks);
  if (N.cry > 0) for (let i = 0; i < 4; i++) {   // tears, two each side, falling
    const k = (S.T * 1.9 + i * .27) % 1; lg.fillStyle = i % 2 ? P.white : P.aqua;
    lg.fillRect(ix + N.face * 7 + (i % 2 ? 1 : -1) * Math.round(5 + k * 7), feet - 24 + Math.round((k * k * 22) - k * 8), 2, 2);
  }
  // the light in the bucket: more of it, the more they've scooped
  for (let i = 0; i < N.load * 3; i++) {
    const a = hsh(i * 7.3), k = (S.T * (.5 + a * .5) + a * 5) % 1;
    lg.fillStyle = k < .4 ? P.mist : P.glow; lg.fillRect(ix + N.face * 12 + Math.round((hsh(i * 3.1) - .5) * 12), feet - 18 - Math.round(k * (4 + N.load * 2)), k < .6 ? 2 : 1, 1);
  }
  if (N.load === TIDE.bucket && Math.sin(S.T * 8) > 0) { lg.fillStyle = P.glow; for (const [dx, dy] of [[0, -12], [-9, -5], [9, -5]]) lg.fillRect(ix + N.face * 12 + dx, feet - 20 + dy, 2, 2); }
  if (N.held) drawGrid(lg, THINGS[N.held].grid, ix - N.face * 12, feet - 12);   // what they're carrying, under the other arm
  if (N.shellT > 0) drawGrid(lg, SHELL, ix + N.face * 12, feet - 30);   // held up to their ear
}
// Asleep: Zs drift up from Ichigo's head, growing and swaying, one after another.
const ZS = [['mmmm', '..m.', '.m..', 'mmmm'], ['mmmmm', '...m.', '..m..', '.m...', 'mmmmm'], ['mmmmmmm', 'mmmmmmm', '....mm.', '...mm..', '..mm...', '.mm....', 'mmmmmmm', 'mmmmmmm']].map(pic);
function drawZs(x, y) {
  for (let i = 0; i < 3; i++) {
    const k = (S.T * .38 + i / 3) % 1;
    if (k > .94) continue;
    drawGrid(lg, ZS[Math.min(2, Math.floor(k * 3))], x + k * 20 + Math.sin(k * 9 + i) * 3, y - k * 44);
  }
}
// What's lying on the sand: things washed up, things saved (round the lantern), the sandbar's crabs and shell.
function glint(x, y) { if (Math.sin(S.T * 4) > 0) { lg.fillStyle = P.white; lg.fillRect(x - 2, y, 5, 1); lg.fillRect(x, y - 2, 1, 5); } }
function drawLying() {
  N.saved.forEach((id, i) => { const x = S.level.lantern + [-30, 30, -46, 46][i % 4]; if (X(x) > -20) drawGrid(lg, THINGS[id].grid, X(x), Y(groundZ(x)) + 1); });
  for (const c of N.crabs) if (!c.hide) drawGrid(lg, CRAB[Math.floor(c.t * 6) % 2], X(c.x), Y(groundZ(c.x)) + 1);
  const th = N.thing;
  if (th && th.state === 'lying') { drawGrid(lg, THINGS[th.id].grid, X(th.x), Y(groundZ(th.x)) + 1); glint(X(th.x) + 6, Y(groundZ(th.x)) - 12); }
  if (N.phase === 'bar' || N.phase === 'taken') {
    for (const c of N.barCrabs) if (!c.hide) drawGrid(lg, CRAB[Math.floor(c.t * 6) % 2], X(c.x), Y(groundZ(c.x)) + 1);
    const sh = S.level.bar.shell;
    if (N.shell === 'lying') { drawGrid(lg, SHELL, X(sh), Y(groundZ(sh)) + 1); glint(X(sh) + 5, Y(groundZ(sh)) - 9); }
  }
}
// Sea-fireflies on the sand: a blue light, dithered out at its edges, with bright specks twinkling in it.
function drawGlows() {
  for (const g of N.glows) {
    const left = 1 - g.t / TIDE.glow.life, k = Math.min(1, g.t * 2.5, left * 2.2) * (left < .25 ? .6 + .4 * Math.sin(S.T * 14) : 1);
    const cx = X(g.x), r = g.n > 1 ? 17 : 12, big = g.n > 1;
    for (let dx = -r; dx <= r; dx++) {
      const y = Y(groundZ(g.x + dx * PIXEL)), q = (1 - (dx / r) ** 2) * k;
      for (let j = -6; j < 5; j++) if (dither(cx + dx, y + j) < q * (j < 0 ? .5 + j * .08 : 1 - j * .13)) { lg.fillStyle = j < -2 ? P.sea : j < 3 ? P.glow : P.sea; lg.fillRect(cx + dx, y + j, 1, 1); }
    }
    for (let i = 0; i < (big ? 9 : 5); i++) {
      if (Math.sin(S.T * (3 + hsh(i + g.seed) * 4) + i * 2.1) < .1 - k * .5) continue;
      const dx = Math.round((hsh(g.seed * 3.1 + i * 5.7) - .5) * r * 1.6), y = Y(groundZ(g.x + dx * PIXEL));
      lg.fillStyle = i % 2 ? P.white : P.mist; lg.fillRect(cx + dx, y - Math.round(hsh(i * 9.1 + g.seed) * 3), i % 3 ? 1 : 2, 1);
    }
  }
}
// In the water, they flash where it moves: along a wave, and at the edge running up the sand.
function drawSparkles() {
  if (onBar()) return;
  const w = N.w, tick = Math.floor(S.T * 9);
  for (let i = 1; i < w.n - 1; i++) {
    const x = w.x0 + (i + .5) * w.cw, z = seaZ(x), wave = z - restZ(x), run = w.d[i] > 1 ? Math.abs(w.v[i]) : 0;
    const e = Math.min(1, Math.max(wave > 3 ? wave / 30 : 0, run > 25 ? run / 110 : 0));
    for (let k = 0; k < 7; k++) {
      if (hsh(i * 13.7 + k * 5.3 + tick * 3.9) > e * .5) continue;
      const top = w.d[i] > 1 ? Math.max(w.surface(i), i < 4 || i >= w.n - 4 ? z : -99) : z, px_ = X(x) + Math.round((hsh(i * 3.3 + k) - .5) * 7), py = Y(top) + 1 + Math.floor(hsh(k * 7.7 + i + tick) ** 2 * 18);
      lg.fillStyle = k % 3 ? P.glow : P.mist; lg.fillRect(px_, py, k % 2 ? 2 : 1, 1);
    }
  }
}
// The lantern full of sea-fireflies: its window blue, with specks moving in it, and a soft blue halo. (Going out, it fades.)
function drawBlueLight() {
  const k = N.blue * (N.phase === 'out' ? Math.max(0, 1 - N.t / 1.2) : 1);
  if (k < .05 || N.light > .5 || onBar()) return;
  const cx = X(S.level.lantern), cy = Y(groundZ(S.level.lantern)) - 38, r = Math.round((14 + 22 * N.fuel + N.flare * 16) * k);
  for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {   // the halo, dithered out
    const d = Math.hypot(x, y) / r;
    if (d < 1 && dither(cx + x, cy + y) < (1 - d) * .42 * k) { lg.fillStyle = d < .5 ? P.glow : P.sea; lg.fillRect(cx + x, cy + y, 1, 1); }
  }
  for (let y = -5; y < 4; y++) for (let x = -6; x < 6; x++) if (dither(x + 8, y + 8) < k * 1.1) { lg.fillStyle = hsh(x * 3.1 + y * 7.7 + Math.floor(S.T * 5)) < .12 ? P.white : Math.abs(x) > 4 || y < -3 ? P.sea : P.glow; lg.fillRect(cx + x, cy + y, 1, 1); }
}
// How much light the lantern has left: a small bar over its roof, red when it's nearly out.
function drawMeter() {
  if (S.scene !== 'tide' || !(N.phase === 'calm' || N.phase === 'waves' || N.phase === 'out')) return;
  const w = 34, x = X(S.level.lantern) - w / 2, y = Y(groundZ(S.level.lantern)) - 72, low = N.fuel < .25;
  if (low && Math.sin(S.T * 10) < -.3) return;
  lg.fillStyle = P.outline; lg.fillRect(x - 1, y - 1, w + 2, 6);
  lg.fillStyle = P.night; lg.fillRect(x, y, w, 4);
  lg.fillStyle = low ? P.ember : N.blue > .5 ? P.glow : P.gold; lg.fillRect(x, y, Math.max(1, Math.round(w * N.fuel)), 4);
}
