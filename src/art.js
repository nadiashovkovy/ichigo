// ============================================================================
// art.js — Hokusai's Great Wave, in code: claw foam, bubbles, sky, Fuji, the great wave, the sea.
// Everything here draws in 960×540 game units; the pixel pipeline turns it into pixel art.
// ============================================================================
import { W, H, TOP, SEA, P, PIXEL, px, onPixel, scaleGrid, SPRITE_SCALE } from './config.js';
import { seaY } from './sea.js';
import { foam } from './texture.js';

// Seeded "random" number in 0..1, so claws and bubbles stay put from frame to frame.
export const hsh = n => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };

// Hokusai's foam claws: a tapering finger that reaches forward, arches over and curls back into a
// sharp hooked point, with smaller fingers branching off its underside (the print's fractal foam).
// dir = -1 reaches left, +1 reaches right. s = size. n = fingers in all (one main + smaller ones).
// unit = one screen pixel in the current drawing units (used for the thin blue outline).
// fill = the foam colour or texture.
export function claws(g, x, y, s, n = 4, dir = -1, unit = PIXEL, fill = P.foam) {
  // one hooked finger as a filled outline, along a cubic curve from its root to its tip
  const finger = (bx, by, len, w, droop) => {
    const P0 = [bx, by], P1 = [bx + dir * 20 * len, by - (12 - droop) * len],
          P2 = [bx + dir * 34 * len, by + (2 + droop) * len], P3 = [bx + dir * 22 * len, by + (13 + droop) * len];
    const at = (t, k) => { const u = 1 - t; return u * u * u * P0[k] + 3 * u * u * t * P1[k] + 3 * u * t * t * P2[k] + t * t * t * P3[k]; };
    const slope = (t, k) => { const u = 1 - t; return 3 * u * u * (P1[k] - P0[k]) + 6 * u * t * (P2[k] - P1[k]) + 3 * t * t * (P3[k] - P2[k]); };
    const L = [], R = [];
    for (let i = 0; i <= 16; i++) {
      const t = i / 16, dx = slope(t, 0), dy = slope(t, 1), d = Math.hypot(dx, dy) || 1;
      const hw = w * Math.pow(1 - t, .75) / 2 + unit * .15, nx = -dy / d * hw, ny = dx / d * hw;
      const fx = at(t, 0), fy = at(t, 1);
      L.push([fx + nx, fy + ny]); R.push([fx - nx, fy - ny]);
    }
    g.moveTo(L[0][0], L[0][1]); for (const q of L) g.lineTo(q[0], q[1]);
    for (let i = R.length - 1; i >= 0; i--) g.lineTo(R[i][0], R[i][1]);
    g.closePath();
    return t => [at(t, 0), at(t, 1)];
  };
  const len = .85 * s;
  const shape = root => {
    g.beginPath();
    if (root) g.ellipse(x, y + 2 * s, 7 * s, 6 * s, 0, 0, 7);       // the root, where the claw leaves the wave
    const spine = finger(x, y, len, 10 * s, 0);                     // the main finger
    for (let i = 1; i < n; i++) {                                   // smaller fingers off its underside
      const [bx, by] = spine(.12 + i * .16);
      finger(bx - dir * 2 * s, by + 3 * s, len * (.62 - i * .1), 7 * s * (.9 - i * .12), 2 + i * 2);
    }
  };
  g.lineJoin = 'round';
  if (s >= .9) { g.strokeStyle = P.deep; g.lineWidth = unit * 2; shape(false); g.stroke(); }   // thin blue outline around the fingers only
  if (fill !== P.foam) { g.fillStyle = P.steel; shape(true); g.fill(); }                        // textured foam: blue shows through its speckle
  g.fillStyle = fill; shape(true); g.fill();
}

// Run fn(px, py) with the canvas in real-pixel space, where (px, py) is the whole pixel under
// the point (x, y) of the current drawing space. Keeps small details crisp instead of smeared.
function atPixel(g, x, y, fn) {
  const p = g.getTransform().transformPoint(new DOMPoint(x, y));
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); fn(Math.round(p.x), Math.round(p.y)); g.restore();
}

// One crisp bubble: n = 2 is a 2×2 dot, n = 3 a little round 3×3 one (uses the current fill colour).
export function dot(g, x, y, n = 2) {
  atPixel(g, x, y, (px, py) => {
    if (n < 3) { g.fillRect(px, py, n, n); return; }
    const c = g.fillStyle; g.fillStyle = P.pale; g.fillRect(px, py, 3, 3);   // pale-blue corners round it off
    g.fillStyle = c; g.fillRect(px + 1, py, 1, 3); g.fillRect(px, py + 1, 3, 1);
  });
}

// A wavy, roughly horizontal line exactly `thick` pixels thick, drawn one pixel column at a time
// so it never wobbles between thicknesses. yAt(x) gives the line's centre at x (current drawing space).
export function waveLine(g, x0, x1, yAt, thick = 1) {
  const T = g.getTransform(), inv = T.inverse();
  const a = T.transformPoint(new DOMPoint(x0, 0)).x, b = T.transformPoint(new DOMPoint(x1, 0)).x;
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
  let prev = null;
  for (let c = Math.floor(Math.min(a, b)); c < Math.ceil(Math.max(a, b)); c++) {
    const x = inv.transformPoint(new DOMPoint(c + .5, 0)).x;
    const y = Math.round(T.transformPoint(new DOMPoint(x, yAt(x))).y - thick / 2);
    let top = y, bot = y + thick;
    if (prev !== null) { if (y > prev + thick) top = prev + thick; else if (y + thick < prev) bot = prev; }   // no gaps on steep bits
    g.fillRect(c, top, 1, bot - top); prev = y;
  }
  g.restore();
}

// Pixel-drawn foam crests for the near sea, reaching right ("#" foam). Each one sits on the water
// with its top curling forward and over, ending in little hooked tips, like a tiny Hokusai wave.
const CRESTS = [
  ['..####....',
   '.#######..',
   '####..###.',
   '###.#...#.',
   '.##..#....'],
  ['...#####.....',
   '.#########...',
   '#####..####..',
   '####..#..###.',
   '####.#..#..#.',
   '.###..#......'],
];
// Draw a crest with a 1-pixel deep-blue outline; (x, y) is where its base meets the water.
const SCALED_CRESTS = CRESTS.map(rows => scaleGrid(rows));   // redrawn at the world's zoom
export function crest(g, x, y, big, dir = 1) {
  const rows = SCALED_CRESTS[big ? 1 : 0], h = rows.length, w = rows[0].length, s = SPRITE_SCALE;
  const on = (c, r) => r >= 0 && r < h && c >= 0 && c < w && rows[r][c] === '#';
  atPixel(g, x, y, (px, py) => {
    const ax = Math.round(3 * s), put = c => px + (dir > 0 ? c : -c) - (dir > 0 ? ax : -ax), top = py - h + Math.round(2 * s);
    g.fillStyle = P.deep;
    for (let r = -1; r <= h; r++) for (let c = -1; c <= w; c++)
      if (!on(c, r) && (on(c - 1, r) || on(c + 1, r) || on(c, r - 1) || on(c, r + 1)) && r < h) g.fillRect(put(c), top + r, 1, 1);
    g.fillStyle = P.foam;
    for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) if (on(c, r)) g.fillRect(put(c), top + r, 1, 1);
  });
}

// White bubbles/specks scattered on dark water (the print's "snow" on the blue).
export function bubbles(g, x0, x1, yAt, seed, depth, density) {
  g.fillStyle = P.foam;
  const step = 18, k0 = Math.floor(x0 / step), k1 = Math.ceil(x1 / step);
  for (let k = k0; k <= k1; k++) {
    if (hsh(k * 1.37 + seed) > density) continue;
    const bx = k * step + hsh(k * 2.71 + seed) * step, r = hsh(k * 5.17 + seed);
    const by = yAt(bx) + 8 + Math.pow(r, 1.8) * depth;
    dot(g, bx - x0, by, hsh(k * 9.3 + seed) > .75 ? 3 : 2);
  }
}

// Paper sky with the print's grey band at the top, long cream clouds, and Mt Fuji.
// top = how much sky shows above the world (normally TOP).
export function drawSky(g, camX, fuji = { x: 640, base: 385, s: 1 }, top = TOP) {
  const gr = g.createLinearGradient(0, -top, 0, 390); gr.addColorStop(0, P.grey2); gr.addColorStop(.15, P.sky); gr.addColorStop(1, P.tan);
  g.fillStyle = gr; g.fillRect(0, -top, W, H + top);
  g.fillStyle = P.foam;
  for (let i = 0; i < 6; i++) {   // puffy clouds: a heap of round billows on a flat base
    const x = onPixel(((i * 470 - camX * 0.12) % 2820 + 2820) % 2820 - 360), y = onPixel(25 - top + (i * 157) % Math.max(60, 270 + top));   // spread through the visible sky
    const w = 150 + (i * 53) % 130, n = 5 + (i % 3);
    g.save(); g.beginPath(); g.rect(x - 60, y - 120, w + 120, 132); g.clip();   // flat underside
    g.beginPath(); g.roundRect(x - 12, y - 6, w + 24, 18, 9);
    for (let j = 0; j < n; j++) {   // billows overlap, tallest a little left of centre
      const a = j / (n - 1), r = (16 + hsh(i * 7.1 + j) * 14) * (1.25 - Math.abs(a - .4) * 1.1);
      const bx = x + a * w, by = y + 4 - r * .35;
      g.moveTo(bx + r, by); g.arc(bx, by, r, 0, 7);
    }
    g.fill(); g.restore();
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
  drawGreatWave(g, gx, 420, 0.62 * Math.min(1, PIXEL / 2.25), t, true);   // far off: it doesn't grow when the camera zooms in past 2.25
  g.fillStyle = P.deep; g.beginPath(); g.moveTo(0, H);
  const sw = sx => { const wx = sx + camX * .5; return 404 + Math.sin(wx * 0.02 - t) * 10 + Math.sin(wx * 0.007) * 8; };
  for (let sx = 0; sx <= W; sx += 9) g.lineTo(sx, sw(sx));
  g.lineTo(W, H); g.fill();
  g.fillStyle = P.steel; waveLine(g, 0, W, sx => sw(sx) + 9, 1);
  for (let sx = -((camX * .5) % 150); sx < W; sx += 150) crest(g, sx, sw(sx) + 3, false, 1);
  bubbles(g, camX * .5, camX * .5 + W, x => sw(x - camX * .5), 7, 26, .35);
}

// Hokusai's wave: a Prussian-blue body, a lighter face streaked with blue bands and white veins,
// a lip of grasping foam claws, bubbles across the blue, and spray like falling snow.
export function drawGreatWave(g, x, base, s, t, distant, flip) {
  g.save(); g.translate(x, base); g.scale(flip ? -s : s, s);
  const onePx = 1 / Math.abs(g.getTransform().a);   // one art pixel, in this wave's local units
  const shape = () => {
    g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(70, -120, 36, -230); g.quadraticCurveTo(-10, -222, -80, -262);
    g.quadraticCurveTo(-10, -370, 160, -350); g.quadraticCurveTo(320, -320, 440, -130); g.quadraticCurveTo(500, -40, 720, 0);
    g.lineTo(720, 260); g.lineTo(0, 260); g.closePath();
  };
  g.fillStyle = P.navy; shape(); g.fill();
  g.save(); shape(); g.clip();
  g.fillStyle = P.deep; g.beginPath(); g.moveTo(10, 40); g.quadraticCurveTo(90, -120, 40, -240); g.quadraticCurveTo(160, -150, 230, 40); g.closePath(); g.fill();
  for (let i = 0; i < 10; i++) {   // bands of blue with thin white veins, following the curl
    const x0 = 50 + i * 28, x1 = 40 + i * 22;
    g.lineWidth = onePx * (distant ? 2 : 3); g.strokeStyle = i % 3 === 2 ? P.pale : P.steel;
    g.beginPath(); g.moveTo(x0, 40); g.quadraticCurveTo(100 + i * 26, -150 + i * 12, x1, -270 + i * 26); g.stroke();
    if (i % 2 === 0) { g.lineWidth = onePx; g.strokeStyle = P.foam;
      g.beginPath(); g.moveTo(x0 + 9, 40); g.quadraticCurveTo(109 + i * 26, -150 + i * 12, x1 + 9, -262 + i * 26); g.stroke(); }
  }
  g.fillStyle = P.navy; g.beginPath(); g.moveTo(300, 0); g.quadraticCurveTo(400, -110, 440, -130); g.lineTo(720, 0); g.fill();
  g.fillStyle = P.foam;   // bubbles: thick just under the foam, thinning out below
  for (let i = 0; i < (distant ? 70 : 140); i++) {
    const bx = -40 + hsh(i * 3.1) * 520, by = -350 + Math.pow(hsh(i * 7.7), 1.6) * 360 + Math.sin(t * 1.5 + i) * 2;
    dot(g, bx, by, distant ? (hsh(i * 1.9) > .85 ? 2 : 1) : (hsh(i * 1.9) > .75 ? 3 : 2));
  }
  // foam: thick and creamy along the crest, breaking into blue speckle deeper down, as in the print.
  // Each layer is a stroke along the wave's own edge, clipped to the inside of the wave.
  const edge = () => { g.beginPath(); g.moveTo(-80, -262); g.quadraticCurveTo(-10, -370, 160, -350); g.quadraticCurveTo(320, -320, 440, -130); g.quadraticCurveTo(500, -40, 720, 0); };
  g.lineCap = 'round'; g.lineJoin = 'round';
  for (const [w, level] of [[320, .2], [210, .4], [130, .6], [56, .8]]) { g.lineWidth = w; g.strokeStyle = foam(g, level); edge(); g.stroke(); }
  g.restore();
  for (let i = 8; i >= 0; i--) {   // the lip: a row of grasping claws reaching forward, hanging over the curl
    const a = i / 8, u = 1 - a;
    const cx = u * u * -80 + 2 * u * a * -10 + a * a * 160, cy = u * u * -262 + 2 * u * a * -370 + a * a * -350;
    const sz = (2.5 - a * 1.2) * (distant ? .85 : 1);
    claws(g, cx + Math.sin(i * 2.3 + t * 4) * 2, cy + 8, sz, distant ? 3 : 4, -1, onePx, foam(g, .78));
  }
  for (let i = 2; i >= 0; i--) claws(g, -40 + i * 40, -232 + i * 8, 1.5 - i * .25, 3, -1, onePx, foam(g, .78));   // inner fringe
  if (!distant) { g.fillStyle = P.foam; for (let i = 0; i < 34; i++) { const sx = -140 + hsh(i * 4.3) * 440, sy = -310 - hsh(i * 6.1) * 160 + ((t * 18 + i * 13) % 40); dot(g, sx, sy, 2); } }
  g.restore();
}

// The near sea: Prussian blue with the print's bands, foam along the surface, bubbles, and a curling crest on every wave.
export function drawSea(g, camX, t) {
  const gr = g.createLinearGradient(0, SEA - 20, 0, H); gr.addColorStop(0, P.deep); gr.addColorStop(.45, P.navy); gr.addColorStop(1, P.navy);
  g.fillStyle = gr; g.beginPath(); g.moveTo(0, H);
  for (let sx = 0; sx <= W; sx += 6) g.lineTo(sx, seaY(sx + camX, t));
  g.lineTo(W, H); g.fill();
  for (let off = 18, n = 0; off < 120; off += 18, n++) {   // the print's bands, each exactly one pixel thick
    g.fillStyle = n % 2 ? P.steel : P.pale;
    waveLine(g, 0, W, sx => seaY(sx + camX, t - off * 0.01) + off, 1);
  }
  const surface = () => { g.beginPath(); for (let sx = 0; sx <= W; sx += 6) { const y = seaY(sx + camX, t); sx ? g.lineTo(sx, y) : g.moveTo(sx, y); } };
  g.save(); g.beginPath(); g.moveTo(0, H);   // speckled foam churning just under the surface
  for (let sx = 0; sx <= W; sx += 6) g.lineTo(sx, seaY(sx + camX, t));
  g.lineTo(W, H); g.clip();
  for (const [w, level] of [[60, .16], [26, .45]]) { g.lineWidth = w; g.strokeStyle = foam(g, level, -camX, 0); surface(); g.stroke(); }
  g.restore();
  g.fillStyle = P.foam; waveLine(g, 0, W, sx => seaY(sx + camX, t), 2);   // white line along the surface
  bubbles(g, camX, camX + W, x => seaY(x, t), 3, 60, .55);
  const drift = t * 25, k0 = Math.floor((camX + drift - 60) / 105);
  for (let k = k0; k < k0 + 12; k++) {   // crests ride the waves, unevenly spaced, reaching the way the waves travel
    const sx = k * 105 - camX - drift + (hsh(k * 3.3) - .5) * 50;
    if (sx < -60 || sx > W + 60) continue;
    const big = hsh(k * 7.9);
    crest(g, sx, seaY(sx + camX, t) + 3, big > .5, 1);
  }
}

// Carp streamer (koinobori) = checkpoint. It lifts and flies when reached.
export function drawKoinobori(g, x, y, on, t) {
  g.fillStyle = P.ink; g.fillRect(x - px(1) / 2, y - 72, px(1), 72);
  const wav = Math.sin(t * 6) * 4 * on;
  g.save(); g.translate(x, y - 68); g.rotate((1 - on) * 1.3);
  g.fillStyle = on ? P.red : P.grey2;
  g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(-18, -7 + wav, -40, -3 + wav); g.lineTo(-31, 5 + wav); g.lineTo(-40, 12 + wav); g.quadraticCurveTo(-18, 13 + wav, 0, 11); g.closePath(); g.fill();
  g.fillStyle = P.foam; g.fillRect(-9, 3, 6, 6);
  g.restore();
}
