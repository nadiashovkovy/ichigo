// ============================================================================
// tideart.js — how Level 2 looks (tide.js is how it plays): the lantern island under the moon, sand
// walls, waves, crabs; then dawn, the sandbar, and the green island.
// From back to front: the sky, moon and far sea → the island, its walls and lantern → Ichigo and the
// crabs → water on the sand → the near sea, as high as the tide (so the island shrinks as it rises).
// ============================================================================
import { W, TOP, LW, LH, TOP_PX, PIXEL, P, TIDE, px, onPixel, toPx } from './config.js';
import { S, parts } from './state.js';
import { lg, tg, topC, beginWorld, beginTop, pixelSpace, quantize, scale2x } from './pixel.js';
import { pixelText, LETTER } from './text.js';
import { drawScenery, drawChartSea, drawLantern, drawLife, hsh } from './art.js';
import { drawSprite, spriteHeight, markIds, outline } from './sprite.js';
import { drawBubbles } from './bubbles.js';
import { drawDawn } from './dawn.js';
import { drawHUD, drawEndFg } from './scenes.js';
import { N, yOf, groundZ, topZ, wallAt, slotOf, slotX, seaZ, waveX, action, onBar, calmTime } from './tide.js';

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

// --- the sky: the moon is the clock, crossing from right to left over the six sets ---
function nightGone() {   // 0..1
  const sets = S.level.sets.length;
  if (N.phase === 'wake') return 0;
  if (onBar()) return 1;
  const calm = calmTime(), waves = TIDE.wave.gap * 3 + 1, set = N.phase === 'calm' ? N.t : N.phase === 'waves' ? calm + Math.max(0, N.wave - 1) * TIDE.wave.gap + N.t : 0;
  return Math.min(1, (N.set + Math.min(1, set / (calm + waves))) / sets);
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
function drawGround(g) {
  const c = N.light > .55 ? DAY : NIGHT, sea = Y(N.tide) + 6, green = onBar() ? S.level.bar.to + 70 : 1e9;
  for (let sx = 0; sx < LW; sx++) {
    const x = S.camX + (sx + .5) * PIXEL, z = groundZ(x), y = Y(z), wx = Math.floor(x / PIXEL);
    if (y > sea + 4) continue;
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
    if (z < N.tide + 7) { g.fillStyle = c.wet; g.fillRect(sx, y, 1, 4); }   // wet sand at the water's edge
  }
}
// The walls: courses of sand blocks, three high. A worn wall has crumbled from the top.
function drawWalls(g) {
  const c = N.light > .55 ? DAY : NIGHT, course = Math.round(TIDE.block / PIXEL), wide = Math.round(TIDE.slot / PIXEL);
  for (let i = 0; i < N.walls.length; i++) {
    const h = wallAt(i); if (h <= .04) continue;
    const x0 = X(slotX(i)), tall = Math.max(1, Math.round(h * course)), l = wallAt(i - 1), r = wallAt(i + 1);
    for (let k = 0; k < wide; k++) {
      const base = Y(groundZ(slotX(i) + (k + .5) * PIXEL)) + 2;
      // the corners are rounded, and a crumbling top is ragged
      const edge = Math.min(l < h - .3 ? k : 9, r < h - .3 ? wide - 1 - k : 9);
      const frac = h % 1, ragged = frac > .05 && frac < .95 ? Math.floor(hsh(k * 3.7 + i * 11) * 3) : 0;
      const top = base - 2 - tall + (edge === 0 ? 3 : edge === 1 ? 1 : 0) + ragged;
      if (top >= base) continue;
      g.fillStyle = P.outline; g.fillRect(x0 + k, top - 1, 1, 1);
      g.fillStyle = edge === 0 ? P.tanD : P.tan; g.fillRect(x0 + k, top, 1, base - top);
      g.fillStyle = P.sky; g.fillRect(x0 + k, top, 1, 1);
      for (let b = 1; b <= 3; b++) {   // the joints between blocks
        const jy = base - 2 - b * course; if (jy > top + 1) { g.fillStyle = P.tanD; g.fillRect(x0 + k, jy, 1, 1); }
        if (k === (b % 2 ? 6 : 12)) { const ya = Math.max(top + 2, base - 2 - b * course), yb = base - 2 - (b - 1) * course; if (yb > ya) { g.fillStyle = P.tanD; g.fillRect(x0 + k, ya, 1, yb - ya); } }
      }
    }
    for (const [sx, n] of [[x0 - 1, l], [x0 + wide, r]]) if (n < h - .1) { const b = Y(groundZ(slotX(i) + (sx < x0 ? 0 : TIDE.slot))) + 1; g.fillStyle = P.outline; g.fillRect(sx, b - tall + 1, 1, Math.max(0, tall - 1)); }
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
// The near sea, in front of everything: the sea's own surface off the island; in front of the island, the tide.
function nearSea(wx) {
  const w = N.w, i = Math.floor((wx - w.x0) / w.cw);
  if (onBar() || i < 0 || i >= w.n) return yOf(seaZ(wx) + chop(wx));
  // (near the shore a passing wave's height fades into the tide's, so the sea in front has no step in it:
  // the wave itself is drawn running up the sand, below)
  const f = Math.max(0, Math.min(1, (N.tide - w.ground[i]) / 26)), k = f * f * (3 - 2 * f);
  const j = Math.max(0, Math.min(w.n - 2, Math.floor((wx - w.x0) / w.cw - .5))), m = Math.max(0, Math.min(1, (wx - w.x0) / w.cw - .5 - j));
  const z = Math.max(N.tide, w.surface(j) + (w.surface(j + 1) - w.surface(j)) * m);
  return yOf(N.tide + (z - N.tide) * k + chop(wx));
}
// The water running up the sand and standing in puddles (drawn only above the ground).
function drawLandWater() {
  const w = N.w;
  if (onBar() && N.phase !== 'ebb') return;
  let any = false; for (let i = 0; i < w.n; i++) if (w.d[i] > .7 && w.surface(i) > N.tide + 1.5) { any = true; break; }
  if (!any) return;
  const x0 = X(w.x0), x1 = X(w.x0 + w.n * w.cw);
  lg.save(); lg.beginPath(); lg.moveTo(x0, -10);
  for (let sx = x0; sx < x1; sx++) lg.lineTo(sx, Y(solidAt(S.camX + (sx + .5) * PIXEL)) + .5);
  lg.lineTo(x1, -10); lg.closePath(); lg.clip();
  drawChartSea(lg, S.camX, S.T, wx => {
    const f = (wx - w.x0) / w.cw - .5, i = Math.max(0, Math.min(w.n - 2, Math.floor(f))), k = f - i, a = w.d[i] > .7, b = w.d[i + 1] > .7;
    if (!a && !b) return yOf(solidAt(wx)) + 14;   // dry: hidden under the ground
    const sa = a ? w.surface(i) : Math.min(w.surface(i + 1), w.solid(i)), sb = b ? w.surface(i + 1) : Math.min(w.surface(i), w.solid(i + 1));
    return yOf(sa + (sb - sa) * Math.max(0, Math.min(1, k)));
  }, Math.max(0, x0), Math.min(LW, x1), false, tone());
  lg.restore();
}
const solidAt = x => groundZ(x) + wallAt(slotOf(x)) * TIDE.block;
// The waves rolling in: a curling crest riding on each swell until it breaks.
function drawCrests() {
  for (const v of N.swells) {
    const x = waveX(v), shore = v.side === 'right' ? 704 : 150;
    if (v.side === 'right' ? x < shore : x > shore) continue;
    const grid = CREST.slice(0, Math.max(6, Math.round(CREST.length * Math.min(1, v.h / 58))));
    drawGrid(lg, grid, X(x) + (v.side === 'right' ? -4 : 4), Y(seaZ(x)) + 3 + Math.round(Math.sin(S.T * 9)), v.side === 'left');
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
  const lx = onPixel(S.level.lantern - S.camX); if (lx > -60) drawLantern(tg, lx, onPixel(yOf(groundZ(S.level.lantern))), S.T, N.lit && N.light < .9);
  pixelSpace(tg); drawWalls(tg);
  if (S.scene === 'tide' && S.sceneT < .5 && S.levelT < 1) { tg.globalAlpha = 1 - S.sceneT / .5; tg.fillStyle = P.night; tg.fillRect(0, 0, LW, LH); tg.globalAlpha = 1; }
  quantize(tg); lg.drawImage(topC, 0, 0);

  drawCreatures();
  const ended = S.scene === 'end', cover = S.scene === 'dawn' && S.sceneT < 1.45;
  const ix = X(N.x), feet = Y(N.z) - Math.round(N.hop / PIXEL), sitting = N.seated || N.stumble > 0 || ended || N.shellT > 0;
  if (!cover && !N.gone) drawIchigo(ix, feet, sitting);
  drawLandWater();
  drawChartSea(lg, S.camX, S.T, nearSea, 0, LW, false, tone());
  drawCrests();
  for (const q of parts) if (q.life > .05) { const n = toPx(2 * (q.s || 1)); lg.fillStyle = q.c; lg.fillRect(X(q.x), Math.round(q.y / PIXEL + TOP_PX), n, n); }

  const head = feet - (sitting ? Math.round(46 * .75) : spriteHeight());
  if (S.scene === 'tide') {
    const act = action(), bob = Math.round(Math.sin(S.T * 5) * 1.5);
    if (act && act.do === 'pile') { if (wallAt(act.slot) < 3 && !N.moving) drawMarker(X(slotX(act.slot) + TIDE.slot / 2), Y(solidAt(slotX(act.slot) + TIDE.slot / 2)) - 12 + bob); }
    else if (act) drawMarker(ix, head - 10 + bob);
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
  const frame = sitting ? 'sit' : N.air ? 'balance' : N.pouring > 0 ? 'dig1' : N.digging ? (Math.sin(S.T * 10) > 0 ? 'dig1' : 'dig2')
              : N.moving ? ['stand', 'step1', 'stand', 'step2'][Math.floor(N.anim / 1.6) % 4] : Math.abs(N.push) > 18 ? 'balance' : 'stand';
  const hair = N.air ? [0, N.hopV < 0 ? 2 : 0] : N.moving ? [(running ? 1 : 0) + step, step] : [0, 0];
  const marks = [...markIds().filter(m => !N.digging || m !== 'shovel'), N.full ? 'water' : null, N.sulk > 0 ? 'pout' : null].filter(Boolean);
  drawSprite(lg, frame, ix, feet, N.face, Math.min(5, S.deaths), hair, marks);
  if (N.shellT > 0) drawGrid(lg, SHELL, ix + N.face * 12, feet - 30);   // held up to their ear
}
function drawCreatures() {
  for (const c of N.crabs) drawGrid(lg, CRAB[Math.floor(c.anim) % 2], X(c.x), Y(topZ(c.x)) + 1 - (c.state === 'pinch' && Math.sin(S.T * 18) > 0 ? 1 : 0));
  if (N.phase === 'bar' || N.phase === 'taken') {
    for (const c of N.barCrabs) if (!c.hide) drawGrid(lg, CRAB[Math.floor(c.t * 6) % 2], X(c.x), Y(groundZ(c.x)) + 1);
    const sh = S.level.bar.shell;
    if (N.shell === 'lying') { drawGrid(lg, SHELL, X(sh), Y(groundZ(sh)) + 1); if (Math.sin(S.T * 3) > .4) { lg.fillStyle = P.white; const gx = X(sh) + 5, gy = Y(groundZ(sh)) - 9; lg.fillRect(gx - 2, gy, 5, 1); lg.fillRect(gx, gy - 2, 1, 5); } }   // (a glint)
  }
}
