// ============================================================================
// wreckage.js — the floating pieces of Ichigo's village: building them from level data,
// making them bob and rock on the sea, and drawing them.
// ============================================================================
import { W, H, SEA, TIDE, P, RAMP, WRECKAGE, px, onPixel } from './config.js';
import { S, parts } from './state.js';
import { seaY } from './sea.js';
import { drawKoinobori, drawLantern, hsh } from './art.js';
import { dither } from './pixel.js';

// Turn a level's "wreckage" list into live objects.
export function buildWreckage(level) {
  if (!level.wreckage) return [];   // (not every level is on wreckage)
  return level.wreckage.map((d, i) => ({
    type: d.type, x0: d.x, w: d.w, ...WRECKAGE[d.type],
    range: d.drift || 0, ph: i * 1.7, cp: !!d.checkpoint, goal: !!d.goal,
    cx: d.x + d.w / 2, cy: SEA, ang: 0, av: 0, dy: 0, dv: 0, sink: 0, flag: 0, pcx: d.x + d.w / 2, pcy: SEA, pang: 0
  }));
}
export const floating = p => p.type !== 'rock';
// The island at the end is Level 2's island (tide.js), the same shape and the same height (levels/level01.json has it, further along).
function islandY(x) { const G = S.level.island; let i = 1; while (i < G.length - 1 && G[i][0] < x) i++; const k = Math.max(0, Math.min(1, (x - G[i - 1][0]) / (G[i][0] - G[i - 1][0]))); return TIDE.base - (G[i - 1][1] + (G[i][1] - G[i - 1][1]) * k); }
export const deckY = (p, x) => (floating(p) ? p.cy + (x - p.cx) * Math.tan(p.ang) : islandY(x));   // height of the (tilted) deck at x, or of the island

// rider = Ichigo: { ground, u } — which piece they stand on, and how far from its centre.
export function updateWreckage(t, dt, rider) {
  for (const p of S.plats) {
    p.pcx = p.cx; p.pcy = p.cy; p.pang = p.ang;
    p.cx = p.x0 + p.w / 2 + (p.range ? Math.sin(t * 1.0 + p.ph) * p.range : 0);   // drifting pieces
    if (!floating(p)) { p.cy = S.level.islandTop; p.ang = 0; continue; }
    const half = p.w / 2, on = rider.ground === p && S.scene === 'play';
    // tilt: follow the slope of the wave underneath, plus Ichigo's weight off-centre — on a springy, rocking hinge
    const slope = (seaY(p.cx + half * .8, t) - seaY(p.cx - half * .8, t)) / (p.w * .8);
    const tip = p.tip * Math.min(1, 110 / p.w);   // long pieces tip less than short ones
    const target = Math.atan(slope) * p.follow + (on ? (rider.u / half) * tip : 0);
    p.av += ((target - p.ang) * 26 - p.av * 4.5) * dt;
    p.ang = Math.max(-.7, Math.min(.7, p.ang + p.av * dt));
    // bob: pushed down under Ichigo's weight, springs back up
    p.dv += (((on ? p.weight : 0) - p.dy) * 40 - p.dv * 7) * dt; p.dy += p.dv * dt;
    if (p.sinkRate) p.sink = on ? p.sink + p.sinkRate * dt : Math.max(0, p.sink - 20 * dt);   // straw mats
    p.cy = seaY(p.cx, t) - p.fb + p.dy + p.sink;
    if (p.cp && p === S.checkpoint) p.flag = Math.min(1, p.flag + dt * 2);
  }
}

// A piece's picture, flat, drawn once and kept: tilting it then turns the whole picture, pixel by pixel.
// It's all the village's own wood and straw (RAMP in config.js).
const PAD = 22, pictures = new WeakMap();
function picture(p) {
  if (!pictures.has(p)) pictures.set(p, paint(p));
  return pictures.get(p);
}
function paint(p) {
  const n = Math.round(p.w / px(1)), d = Math.round(p.h / px(1)), cv = document.createElement('canvas'), mid = Math.round(n / 2) + PAD;
  cv.width = mid * 2; cv.height = d + PAD * 2;
  const g = cv.getContext('2d'), R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(mid + x, PAD + y, w, h); };   // (in pixels, from the middle of the deck)
  const l = -Math.round(n / 2), seed = p.ph, [w0, w1, w2, w3] = RAMP.wood, [st0, st1, st2] = RAMP.straw;
  const boards = (bx, by, bw, bh) => {   // one board: lit along its top, dark along its foot, with grain
    R(bx, by, bw, bh, w1); R(bx, by, bw, 1, w0); R(bx, by + bh - 2, bw, 2, w2);
    for (let i = 0; i < bw / 9; i++) { const gx = bx + Math.floor(hsh(seed + i * 3.1 + by) * (bw - 8)), gy = by + 2 + Math.floor(hsh(seed + i * 5.7) * Math.max(1, bh - 5)); R(gx, gy, 4 + Math.floor(hsh(i + seed) * 4), 1, w2); }
  };
  if (p.type === 'plank') {       // decking torn loose: boards end to end, nailed, the ends broken off ragged
    const end = (j, sd) => Math.floor(hsh(seed * 3 + j * 1.9 + sd) * 4);
    for (let j = -1; j <= d; j++) { const e = end(Math.max(0, Math.min(d - 1, j)), 1), f = end(Math.max(0, Math.min(d - 1, j)), 5); R(l + e - 1, j, n - e - f + 2, 1, P.outline); if (j >= 0 && j < d) R(l + e, j, n - e - f, 1, j === 0 ? w0 : j >= d - 2 ? w2 : w1); }
    for (let i = 0; i < n / 9; i++) R(l + 4 + Math.floor(hsh(seed + i * 3.1) * (n - 14)), 2 + Math.floor(hsh(seed + i * 5.7) * (d - 5)), 4 + Math.floor(hsh(i + seed) * 4), 1, w2);
    for (let i = 24; i < n - 8; i += 25) { R(l + i, 0, 1, d, P.outline); for (const k of [-3, 3]) R(l + i + k, 3, 1, 1, P.outline); }
  } else if (p.type === 'crate') {   // a crate: a frame, boards, a brace across it, and rope
    R(l - 1, -1, n + 2, d + 2, P.outline);
    for (let j = 0; j < d; j += 9) boards(l, j, n, Math.min(9, d - j));
    for (let j = 9; j < d; j += 9) R(l, j - 1, n, 1, P.outline);
    for (let i = 0; i < n; i++) { const yy = Math.round(i / n * (d - 6)); R(l + i, yy, 1, 7, P.outline); R(l + i, yy + 1, 1, 5, w2); R(l + i, yy + 1, 1, 1, w1); }
    for (const fx of [l, l + n - 6]) { R(fx - (fx === l ? 0 : 1), 0, 7, d, P.outline); R(fx, 0, 6, d, w1); R(fx, 0, 1, d, w0); R(fx + 5, 0, 1, d, w2); for (const j of [3, d - 5]) R(fx + 2, j, 2, 2, P.outline); }
    R(l, 0, n, 2, w0);
  } else if (p.type === 'roof') {    // a piece of thatched roof, like the house on the beach: straw in shaggy layers under its ridge
    for (let j = 0; j < d + 3; j++) {
      const e = Math.round(7 * j / d), a = l - e, bn = n + e * 2;
      for (let i = 0; i < bn; i++) {
        const rag = Math.round(hsh(Math.floor((a + i) / 3) * 1.7 + seed) * 4), end = d - 1 + Math.round(hsh(Math.floor((a + i) / 2) * 2.3 + seed) * 3);
        if (j > end) continue;
        const lay = (j + rag) % 9, q = i / bn;
        R(a + i, j, 1, 1, i === 0 || i === bn - 1 || j === end ? P.outline : lay < 2 ? st2 : q > .7 && dither(i, j) < .4 ? st0 : dither(i, j) < .22 ? st0 : st1);
      }
    }
    R(l - 4, -3, n + 8, 6, P.outline); R(l - 3, -2, n + 6, 4, w3); R(l - 3, -2, n + 6, 1, w2);
    for (let i = 10; i < n - 4; i += 24) { R(l + i - 1, -4, 6, 8, P.outline); R(l + i, -3, 4, 6, w1); }
  } else if (p.type === 'mat') {     // a straw mat, woven, with a blue cloth edge
    R(l - 1, -1, n + 2, d + 2, P.outline);
    for (let i = 0; i < n; i++) for (let j = 0; j < d; j += 2) R(l + i, j, 1, 2, (Math.floor(i / 3) + j / 2) % 2 ? st1 : j === 0 ? st0 : st0);
    for (let i = 5; i < n; i += 22) R(l + i, 0, 1, d, st2);
    for (const ex of [l, l + n - 5]) { R(ex, 0, 5, d, P.navy); R(ex, 0, 5, 1, P.deep); R(ex + 2, 3, 1, 2, P.foam); }
    R(l, d - 1, n, 1, st2);
  } else if (p.type === 'boat') {    // an oshiokuri boat, as in the print: long, its bow swept up, planked, with thwarts inside
    const bow = 11;
    for (let i = -2; i < n + bow; i++) {
      const q = i / n, top = Math.round(-6 * Math.max(0, (q - .72) / .36) ** 1.6), fl = q < .12 ? (1 - q / .12) ** 2 : q > .78 ? ((q - .78) / .3) ** 1.5 : 0, bot = Math.round(d - (d - 5) * Math.min(1, fl));
      for (let j = top; j <= bot; j++) {
        const k = j - top, edge = k === 0 || j === bot || i === -2 || i === n + bow - 1;
        R(l + i, j, 1, 1, edge ? P.outline : k < 3 ? (k === 1 ? w0 : w1) : k === 3 ? P.outline : k === 11 ? w3 : k < 11 ? (dither(i + 64, j + 64) < .3 + .3 * q ? w1 : w2) : dither(i + 64, j + 64) < .35 ? w3 : w2);
      }
    }
    for (const q of [.16, .4, .64]) { const i = Math.round(n * q); R(l + i - 1, -3, 14, 4, P.outline); R(l + i, -2, 12, 2, w1); R(l + i, -2, 12, 1, w0); }   // the thwarts
    R(l + n - 4, -2, 10, 2, P.red);   // a red band at the bow
  }
  return cv;
}

// Draw one piece, tilted about its centre.
export function drawWreckage(g, p, camX, t) {
  if (p.type === 'rock') return drawIsland(g, p, camX, t);
  const sx = p.cx - camX, w = p.w;
  if (sx > W + w || sx < -w) return;
  g.save(); g.translate(sx, p.cy); g.rotate(p.ang);    // everything below is in the deck's own (tilted) frame
  const pic = picture(p);   // (smoothing off, so it turns as whole pixels)
  g.imageSmoothingEnabled = false; g.drawImage(pic, -pic.width / 2 * px(1), -PAD * px(1), pic.width * px(1), pic.height * px(1));
  if (p.type === 'mat' && p.sink > 1 && Math.random() < .3) parts.push({ x: p.cx + (Math.random() - .5) * w, y: seaY(p.cx, t), vx: 0, vy: -40, life: .4, c: P.foam });
  if (p.cp) drawKoinobori(g, w / 2 - 18, 0, p.flag, t);
  g.restore();
}

// The island at the end: sand on rock, and the stone lantern (the goal), as in Level 2 (tideart.js).
function drawIsland(g, p, camX, t) {
  const G = S.level.island, u = px(1), [, s1, s2, s3] = RAMP.sand, x0 = Math.max(-px(2), onPixel(G[0][0] - camX)), x1 = Math.min(W + px(2), G[G.length - 1][0] - camX);
  for (let sx = onPixel(x0); sx < x1; sx += u) {
    const i = Math.round((sx + camX - G[0][0]) / u), top = onPixel(islandY(sx + camX)), deep = 9 + Math.round(2 * Math.sin(i * .05) + hsh(Math.floor(i / 3)) * 2);
    const R = (a, h, c) => { g.fillStyle = c; g.fillRect(sx, top + a * u, u, h * u); };
    R(-1, 1, P.outline); R(0, 2, s1); R(2, deep - 2, s2); R(deep, 3, s3); R(deep + 3, 140, P.grey3);
    for (let k = 0; k < 8; k++) { const h = hsh(Math.floor(i / 4) * 7.7 + k * 3.1); if (h > .55) R(deep + 5 + k * 6 + Math.floor(h * 5), h > .7 ? 2 : 1, h > .8 ? P.grey2 : P.slate); }   // cracks and ledges in the rock
    if (hsh(Math.floor(i / 3) * 5.3) > .72) R(3 + Math.floor(hsh(i) * 4), 1, s3);
  }
  drawLantern(g, onPixel(S.level.lantern - camX), onPixel(islandY(S.level.lantern)), t);
}
