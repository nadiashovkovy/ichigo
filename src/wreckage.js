// ============================================================================
// wreckage.js — the floating pieces of Ichigo's village: building them from level data,
// making them bob and rock on the sea, and drawing them.
// ============================================================================
import { W, H, SEA, P, WRECKAGE, px, onPixel } from './config.js';
import { S, parts } from './state.js';
import { seaY } from './sea.js';
import { drawKoinobori } from './art.js';

// Turn a level's "wreckage" list into live objects.
export function buildWreckage(level) {
  return level.wreckage.map((d, i) => ({
    type: d.type, x0: d.x, w: d.w, ...WRECKAGE[d.type],
    range: d.drift || 0, ph: i * 1.7, cp: !!d.checkpoint, goal: !!d.goal,
    cx: d.x + d.w / 2, cy: SEA, ang: 0, av: 0, dy: 0, dv: 0, sink: 0, flag: 0, pcx: d.x + d.w / 2, pcy: SEA, pang: 0
  }));
}
export const floating = p => p.type !== 'rock';
export const deckY = (p, x) => p.cy + (x - p.cx) * Math.tan(p.ang);   // height of the (tilted) deck at x

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

// Draw one piece, tilted about its centre.
export function drawWreckage(g, p, camX, t) {
  if (p.type === 'rock') return drawIsland(g, p, camX, t);
  const sx = p.cx - camX, w = p.w, h = p.h, x = -w / 2;
  if (sx > W + w || sx < -w) return;
  g.save(); g.translate(sx, p.cy); g.rotate(p.ang);    // everything below is in the deck's own (tilted) frame
  g.lineWidth = px(1); g.strokeStyle = P.ink;
  if (p.type === 'plank') {       // ochre planks, like the boats in the print
    g.fillStyle = P.ochre; g.fillRect(x, 0, w, h); g.strokeRect(x, 0, w, h);
    g.fillStyle = P.olive; for (let i = 30; i < w; i += 33) g.fillRect(x + i, px(1), px(1), h - px(2));
  } else if (p.type === 'crate') {
    g.fillStyle = P.ochre; g.fillRect(x, 0, w, h); g.strokeRect(x, 0, w, h);
    g.strokeStyle = P.olive; g.lineWidth = px(1); g.beginPath();
    g.moveTo(x + 5, 5); g.lineTo(x + w - 5, h - 5); g.moveTo(x + w - 5, 5); g.lineTo(x + 5, h - 5); g.stroke();
  } else if (p.type === 'roof') {
    g.fillStyle = P.grey3; g.beginPath(); g.moveTo(x - 9, h); g.lineTo(x, 0); g.lineTo(x + w, 0); g.lineTo(x + w + 9, h); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = P.grey2; for (let i = 6; i < w; i += 15) g.fillRect(x + i, 6, 6, h - 6);
    g.fillStyle = P.ink; g.fillRect(x - 3, -3, w + 6, 6);
  } else if (p.type === 'mat') {  // woven straw mat
    g.fillStyle = P.olive; g.fillRect(x, 0, w, h); g.strokeRect(x, 0, w, h);
    g.fillStyle = P.ochre; for (let i = 3; i < w; i += 9) g.fillRect(x + i, px(1), px(1), h - px(2));
    if (p.sink > 1 && Math.random() < .3) parts.push({ x: p.cx + (Math.random() - .5) * w, y: seaY(p.cx, t), vx: 0, vy: -40, life: .4, c: P.foam });
  } else if (p.type === 'boat') {  // an oshiokuri boat, as in the print
    g.fillStyle = P.ochre; g.beginPath();
    g.moveTo(x, 0); g.lineTo(x + w + 14, -8); g.quadraticCurveTo(x + w - 10, h, 0, h);
    g.quadraticCurveTo(x + 20, h, x, 0); g.fill(); g.stroke();
    g.fillStyle = P.olive; g.fillRect(x, 6, w, 6);
  }
  if (p.cp) drawKoinobori(g, w / 2 - 18, 0, p.flag, t);
  g.restore();
}

// The island at the end: solid ground, a pine, and the stone lantern (the goal).
function drawIsland(g, p, camX, t) {
  const x = onPixel(p.x0 - camX), y = onPixel(p.cy), w = onPixel(p.w);
  if (x > W + 60 || x + w < -60) return;
  g.lineWidth = px(1); g.strokeStyle = P.ink;
  const rg = g.createLinearGradient(0, y, 0, H); rg.addColorStop(0, P.grey2); rg.addColorStop(1, P.grey3);
  g.fillStyle = rg; g.beginPath();
  g.moveTo(x - 30, H); g.lineTo(x, y + 6); g.quadraticCurveTo(x + 20, y - 4, x + 60, y);
  g.lineTo(x + w, y); g.lineTo(x + w + 40, H); g.fill(); g.stroke();
  g.fillStyle = P.olive; g.fillRect(x + 9, y - 3, w - 9, 6);
  const tx = x + 141;   // the pine's trunk
  g.strokeStyle = P.brown; g.lineWidth = 9; g.beginPath(); g.moveTo(tx, y); g.quadraticCurveTo(tx - 20, y - 60, tx + 10, y - 110); g.stroke();
  g.fillStyle = P.deep;
  for (const [dx, dy, r] of [[-30, -95, 24], [20, -115, 28], [40, -85, 20], [-5, -130, 18]]) { g.beginPath(); g.ellipse(tx + dx, y + dy, r * 1.6, r * .55, 0, 0, 7); g.fill(); }
  const lx = onPixel(x + S.level.goalOffset + 20); g.lineWidth = px(1); g.strokeStyle = P.ink;   // the stone lantern
  g.fillStyle = P.grey1; g.fillRect(lx - 6, y - 39, 12, 39); g.strokeRect(lx - 6, y - 39, 12, 39);
  g.fillRect(lx - 15, y - 63, 30, 24); g.strokeRect(lx - 15, y - 63, 30, 24);
  g.fillStyle = Math.sin(t * 4) > 0 ? P.ochre : P.foam; g.fillRect(lx - 9, y - 57, 18, 12);
  g.fillStyle = P.grey1; g.beginPath(); g.moveTo(lx - 27, y - 63); g.lineTo(lx, y - 81); g.lineTo(lx + 27, y - 63); g.fill(); g.stroke();
}
