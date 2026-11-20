// ============================================================================
// art.js — Hokusai's Great Wave, in code: claw foam, bubbles, sky, Fuji, the great wave, the sea.
// Everything here draws in 960×540 game units; the pixel pipeline turns it into pixel art.
// ============================================================================
import { W, H, SEA, P } from './config.js';
import { seaY } from './sea.js';

// Seeded "random" number in 0..1, so claws and bubbles stay put from frame to frame.
export const hsh = n => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };

// Hokusai's foam: each clump is a "hand" whose fingers reach forward and curl back into hooked tips,
// with blue showing between the fingers. dir = -1 reaches left, +1 reaches right.
// unit = one screen pixel in the current drawing units (used for the thin blue outline).
export function claws(g, x, y, s, n = 4, dir = -1, unit = 3) {
  const fingers = [];
  for (let i = 0; i < n; i++) {
    const sy = y - 3 * s + i * 6.5 * s, sx = x + dir * 5 * s;
    fingers.push([sx, sy, x + dir * (20 + i * 2) * s, sy - 3 * s, x + dir * (15 + i * 1.5) * s, y + (5 + i * 6) * s]);
  }
  const paint = (col, grow) => {
    g.fillStyle = col; g.strokeStyle = col; g.lineCap = 'round';
    g.beginPath(); g.ellipse(x, y, 9 * s + grow, 6 * s + grow, 0, 0, 7); g.fill();                  // the palm
    if (s < .7) { g.beginPath(); g.arc(x + dir * 8 * s, y + 3 * s, 4 * s + grow, 0, 7); g.fill(); return; }
    g.lineWidth = Math.max(unit, 2.6 * s) + grow * 2;
    for (const [sx, sy, cx, cy, tx, ty] of fingers) {                                             // the fingers
      g.beginPath(); g.moveTo(sx, sy); g.quadraticCurveTo(cx, cy, tx, ty); g.stroke();
      g.beginPath(); g.arc(tx - dir * 2.2 * s, ty + 1.2 * s, Math.max(unit * .8, 2.3 * s) + grow, 0, 7); g.fill();  // hooked tip
    }
  };
  if (s >= .9) paint(P.deep, unit);   // thin blue outline keeps each claw separate, as in the print
  paint(P.foam, 0);
}

// White bubbles/specks scattered on dark water (the print's "snow" on the blue).
export function bubbles(g, x0, x1, yAt, seed, depth, density, unit = 3) {
  g.fillStyle = P.foam;
  const step = 18, k0 = Math.floor(x0 / step), k1 = Math.ceil(x1 / step);
  for (let k = k0; k <= k1; k++) {
    if (hsh(k * 1.37 + seed) > density) continue;
    const bx = k * step + hsh(k * 2.71 + seed) * step, r = hsh(k * 5.17 + seed);
    const by = yAt(bx) + 8 + Math.pow(r, 1.8) * depth;
    const sz = hsh(k * 9.3 + seed) > .8 ? unit * 2 : unit;
    g.fillRect(bx - x0, by, sz, sz);
  }
}

// Paper sky with the print's grey band at the top, long cream clouds, and Mt Fuji.
export function drawSky(g, camX, fuji = { x: 640, base: 385, s: 1 }) {
  const gr = g.createLinearGradient(0, 0, 0, 390); gr.addColorStop(0, P.grey2); gr.addColorStop(.2, P.sky); gr.addColorStop(1, P.tan);
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  g.fillStyle = P.foam;
  for (let i = 0; i < 6; i++) {
    const x = ((i * 470 - camX * 0.12) % 2820 + 2820) % 2820 - 360, y = 60 + (i * 61) % 150;
    g.beginPath(); g.roundRect(x, y, 200 + (i * 53) % 160, 15, 8); g.fill();
    g.beginPath(); g.roundRect(x + 40, y - 12, 90, 14, 7); g.fill();
  }
  g.save(); g.translate(fuji.x - camX * 0.05, fuji.base); g.scale(fuji.s, fuji.s);
  const fg = g.createLinearGradient(0, -145, 0, 0); fg.addColorStop(0, P.grey1); fg.addColorStop(1, P.grey3);
  g.fillStyle = fg; g.beginPath(); g.moveTo(-230, 0); g.lineTo(-33, -145); g.lineTo(33, -145); g.lineTo(230, 0); g.fill();
  g.fillStyle = P.foam; g.beginPath(); g.moveTo(-33, -145); g.lineTo(33, -145); g.lineTo(60, -123);
  for (let i = 0; i <= 8; i++) g.lineTo(60 - i * 15, -123 + (i % 2 ? 12 : 0)); g.fill();
  g.restore();
}

// The distant sea: horizon water, a great wave looming far off, and mid swells.
export function drawFar(g, camX, t) {
  const hg = g.createLinearGradient(0, 375, 0, 420); hg.addColorStop(0, P.pale); hg.addColorStop(1, P.steel);
  g.fillStyle = hg; g.fillRect(0, 375, W, H);
  const gx = ((900 - camX * 0.12) % 2200 + 2200) % 2200 - 500;
  drawGreatWave(g, gx, 420, 0.62, t, true);
  g.fillStyle = P.deep; g.beginPath(); g.moveTo(0, H);
  const sw = sx => { const wx = sx + camX * .5; return 404 + Math.sin(wx * 0.02 - t) * 10 + Math.sin(wx * 0.007) * 8; };
  for (let sx = 0; sx <= W; sx += 9) g.lineTo(sx, sw(sx));
  g.lineTo(W, H); g.fill();
  g.strokeStyle = P.steel; g.lineWidth = 4; g.beginPath();
  for (let sx = 0; sx <= W; sx += 9) { const y = sw(sx) + 9; sx ? g.lineTo(sx, y) : g.moveTo(sx, y); } g.stroke();
  for (let sx = -((camX * .5) % 150); sx < W; sx += 150) claws(g, sx, sw(sx) + 2, .85, 3, 1);
  bubbles(g, camX * .5, camX * .5 + W, x => sw(x - camX * .5), 7, 26, .35);
}

// Hokusai's wave: a Prussian-blue body, a lighter face streaked with blue bands and white veins,
// a lip of grasping foam claws, bubbles across the blue, and spray like falling snow.
export function drawGreatWave(g, x, base, s, t, distant, flip) {
  g.save(); g.translate(x, base); g.scale(flip ? -s : s, s);
  const px = 3 / s;   // one screen pixel, in this wave's local units
  const shape = () => {
    g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(70, -120, 36, -230); g.quadraticCurveTo(6, -300, -80, -262);
    g.quadraticCurveTo(-10, -370, 160, -350); g.quadraticCurveTo(320, -320, 440, -130); g.quadraticCurveTo(500, -40, 720, 0);
    g.lineTo(720, 260); g.lineTo(0, 260); g.closePath();
  };
  g.fillStyle = P.navy; shape(); g.fill();
  g.save(); shape(); g.clip();
  g.fillStyle = P.deep; g.beginPath(); g.moveTo(10, 40); g.quadraticCurveTo(90, -120, 40, -240); g.quadraticCurveTo(160, -150, 230, 40); g.closePath(); g.fill();
  for (let i = 0; i < 10; i++) {   // bands of blue with thin white veins, following the curl
    const x0 = 50 + i * 28, x1 = 40 + i * 22;
    g.lineWidth = 8; g.strokeStyle = i % 3 === 2 ? P.pale : P.steel;
    g.beginPath(); g.moveTo(x0, 40); g.quadraticCurveTo(100 + i * 26, -150 + i * 12, x1, -270 + i * 26); g.stroke();
    if (i % 2 === 0) { g.lineWidth = Math.max(2, px); g.strokeStyle = P.foam;
      g.beginPath(); g.moveTo(x0 + 9, 40); g.quadraticCurveTo(109 + i * 26, -150 + i * 12, x1 + 9, -262 + i * 26); g.stroke(); }
  }
  g.fillStyle = P.navy; g.beginPath(); g.moveTo(300, 0); g.quadraticCurveTo(400, -110, 440, -130); g.lineTo(720, 0); g.fill();
  g.fillStyle = P.foam;   // bubbles: thick just under the foam, thinning out below
  for (let i = 0; i < (distant ? 70 : 140); i++) {
    const bx = -40 + hsh(i * 3.1) * 520, by = -350 + Math.pow(hsh(i * 7.7), 1.6) * 360 + Math.sin(t * 1.5 + i) * 2;
    const sz = hsh(i * 1.9) > .85 ? px * 2 : px;
    g.fillRect(bx, by, sz, sz);
  }
  g.restore();
  g.strokeStyle = P.foam; g.lineWidth = 16; g.lineCap = 'round';   // foam cap riding the crest
  g.beginPath(); g.moveTo(-60, -268); g.quadraticCurveTo(-10, -366, 160, -352); g.quadraticCurveTo(260, -340, 330, -280); g.stroke();
  for (let i = 8; i >= 0; i--) {   // the lip: a row of grasping claws reaching forward, hanging over the curl
    const a = i / 8, u = 1 - a;
    const cx = u * u * -80 + 2 * u * a * -10 + a * a * 160, cy = u * u * -262 + 2 * u * a * -370 + a * a * -350;
    const sz = (2.5 - a * 1.2) * (distant ? .85 : 1);
    claws(g, cx + Math.sin(i * 2.3 + t * 4) * 2, cy + 8, sz, distant ? 3 : 4, -1, px);
  }
  for (let i = 2; i >= 0; i--) claws(g, -40 + i * 40, -232 + i * 8, 1.5 - i * .25, 3, -1, px);   // inner fringe
  if (!distant) { g.fillStyle = P.foam; for (let i = 0; i < 34; i++) { const sx = -140 + hsh(i * 4.3) * 440, sy = -310 - hsh(i * 6.1) * 160 + ((t * 18 + i * 13) % 40); g.fillRect(sx, sy, px * (hsh(i) > .7 ? 2 : 1), px * (hsh(i) > .7 ? 2 : 1)); } }
  g.restore();
}

// The near sea: Prussian blue with the print's bands, foam along the surface, bubbles, and claws on every crest.
export function drawSea(g, camX, t) {
  const gr = g.createLinearGradient(0, SEA - 20, 0, H); gr.addColorStop(0, P.deep); gr.addColorStop(.45, P.navy); gr.addColorStop(1, P.navy);
  g.fillStyle = gr; g.beginPath(); g.moveTo(0, H);
  for (let sx = 0; sx <= W; sx += 6) g.lineTo(sx, seaY(sx + camX, t));
  g.lineTo(W, H); g.fill();
  g.lineWidth = 4;
  for (let off = 18, n = 0; off < 120; off += 18, n++) {
    g.strokeStyle = n % 2 ? P.steel : P.pale; g.beginPath();
    for (let sx = 0; sx <= W; sx += 9) { const y = seaY(sx + camX, t - off * 0.01) + off; sx ? g.lineTo(sx, y) : g.moveTo(sx, y); }
    g.stroke();
  }
  g.strokeStyle = P.foam; g.lineWidth = 6; g.beginPath();
  for (let sx = 0; sx <= W; sx += 6) { const y = seaY(sx + camX, t); sx ? g.lineTo(sx, y) : g.moveTo(sx, y); }
  g.stroke();
  bubbles(g, camX, camX + W, x => seaY(x, t), 3, 60, .55);
  const drift = t * 25, k0 = Math.floor((camX + drift - 60) / 105);
  for (let k = k0; k < k0 + 12; k++) {   // claws ride the waves, unevenly spaced, reaching the way the waves travel
    const sx = k * 105 - camX - drift + (hsh(k * 3.3) - .5) * 50;
    if (sx < -60 || sx > W + 60) continue;
    const big = hsh(k * 7.9);
    claws(g, sx, seaY(sx + camX, t) + 1, .95 + big * .6, big > .5 ? 4 : 3, 1);
  }
}

// Carp streamer (koinobori) = checkpoint. It lifts and flies when reached.
export function drawKoinobori(g, x, y, on, t) {
  g.fillStyle = P.ink; g.fillRect(x - 1.5, y - 72, 3, 72);
  const wav = Math.sin(t * 6) * 4 * on;
  g.save(); g.translate(x, y - 68); g.rotate((1 - on) * 1.3);
  g.fillStyle = on ? P.red : P.grey2;
  g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(-18, -7 + wav, -40, -3 + wav); g.lineTo(-31, 5 + wav); g.lineTo(-40, 12 + wav); g.quadraticCurveTo(-18, 13 + wav, 0, 11); g.closePath(); g.fill();
  g.fillStyle = P.foam; g.fillRect(-9, 3, 5, 5);
  g.restore();
}
