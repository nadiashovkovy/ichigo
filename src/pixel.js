// ============================================================================
// pixel.js — the pixel-art pipeline.
// The world is drawn onto a small 320×240 canvas; every pixel is then snapped to the
// woodblock palette using checkerboard ("ordered") dithering, and the result is blown up
// to the window with hard pixel edges.
// ============================================================================
import { LW, LH, PIXEL, W, H, TOP, P, setWide } from './config.js';

const cv = document.getElementById('c'), ctx = cv.getContext('2d');
export const canvas = cv;

function layer() { const c = document.createElement('canvas'); c.width = LW; c.height = LH; return c; }
export const lo = layer(), lg = lo.getContext('2d', { willReadFrequently: true });      // main picture
export const topC = layer(), tg = topC.getContext('2d', { willReadFrequently: true });  // sea + wreckage + overlays

let dpr = 1, k = 1;
// The game sits in the screen of the PC drawn around it (index.html + css/style.css).
// Pick the biggest whole-number zoom k (device pixels per art pixel) at which the whole PC fits
// the window, then size the screen to exactly LW·k × LH·k device pixels, so every art pixel is a
// perfect k×k square. The PC's own size follows the screen's size in CSS (--sw, --sh).
const root = document.documentElement, setup = document.querySelector('.pc');
function setScreen(sw, sh) { root.style.setProperty('--sw', sw + 'px'); root.style.setProperty('--sh', sh + 'px'); }
// How big the whole PC (monitor and keyboard) is, relative to its screen, measured from the page.
function setupScale() {
  setScreen(LW, LH);
  let r = setup.getBoundingClientRect(), L = r.left, T = r.top, R = r.right, B = r.bottom;
  for (const el of setup.querySelectorAll('.keyboard')) {   // tipped back in 3D, so measured on its own
    const q = el.getBoundingClientRect(); L = Math.min(L, q.left); T = Math.min(T, q.top); R = Math.max(R, q.right); B = Math.max(B, q.bottom);
  }
  return [(R - L) / LW, (B - T) / LH];
}
function resize() {
  dpr = window.devicePixelRatio || 1;
  // In full screen (see src/pc.js) the monitor's casing fills the display, so the screen only needs
  // room for its bezel all round: 1.6% + the .6% dark rim of the screen's width (see style.css),
  // plus a little casing showing beyond it.
  const full = root.classList.contains('full');
  setWide(full);   // 16:9 in full screen, 4:3 on the PC
  if (lo.width !== LW) lo.width = topC.width = LW;
  const edge = 2 * (.016 + .006 + .008);
  const [sx, sy] = full ? [1 + edge, 1 + edge * LW / LH] : setupScale(), margin = full ? 1 : .96;
  const fit = Math.min(innerWidth * margin / (LW * sx), innerHeight * margin / (LH * sy)) * dpr;
  k = fit >= 1 ? Math.floor(fit) : fit;   // whole-number zoom, unless the window is tiny
  cv.width = Math.round(LW * k); cv.height = Math.round(LH * k);
  const sw = cv.width / dpr, sh = cv.height / dpr;
  cv.style.width = sw + 'px'; cv.style.height = sh + 'px';
  setScreen(sw, sh);
  // Centring the monitor can leave the screen on a half pixel, which would blur the game. Nudge the
  // canvas onto the nearest whole device pixel.
  cv.style.transform = '';
  const r = cv.getBoundingClientRect(), fx = r.left * dpr - Math.round(r.left * dpr), fy = r.top * dpr - Math.round(r.top * dpr);
  cv.style.transform = `translate(${-fx / dpr}px, ${-fy / dpr}px)`;
}
addEventListener('resize', resize); resize();

// Drawing modes: "world" = 960×540 game units; "pixel" = real 320×240 art pixels.
// (World y = 0 sits TOP units down the screen; the space above it is extra sky.)
export function beginWorld() { lg.setTransform(1 / PIXEL, 0, 0, 1 / PIXEL, 0, TOP / PIXEL); }
export function beginTop() { tg.setTransform(1 / PIXEL, 0, 0, 1 / PIXEL, 0, TOP / PIXEL); tg.clearRect(0, -TOP, W, H + TOP); }
export function pixelSpace(g) { g.setTransform(1, 0, 0, 1, 0, 0); }

// --- snap to palette with ordered dithering ---
const PAL = Object.values(P).map(h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]);
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const LUT = new Uint8Array(32768);   // lookup table: any colour → nearest palette colour
for (let r = 0; r < 32; r++) for (let g = 0; g < 32; g++) for (let b = 0; b < 32; b++) {
  let best = 0, bd = 1e9; const R = r * 8 + 4, G = g * 8 + 4, B = b * 8 + 4;
  PAL.forEach(([pr, pg, pb], i) => { const d = (R - pr) ** 2 * 1.2 + (G - pg) ** 2 * 1.6 + (B - pb) ** 2; if (d < bd) { bd = d; best = i; } });
  LUT[(r << 10) | (g << 5) | b] = best;
}
const SPREAD = 16;   // how strongly gradients dither
const EXACT = new Set(PAL.map(([r, g, b]) => (r << 16) | (g << 8) | b));   // palette colours are left as they are
export function quantize(c2d) {
  const img = c2d.getImageData(0, 0, LW, LH), d = img.data;
  for (let y = 0; y < LH; y++) for (let x = 0; x < LW; x++) {
    const i = (y * LW + x) * 4, a = d[i + 3];
    if (a === 0) continue;
    const b = BAYER[((y & 3) << 2) | (x & 3)];
    if (a < 250 && (a / 255) * 16 <= b + 0.5) { d[i + 3] = 0; continue; }   // dithered transparency (fades)
    if (EXACT.has((d[i] << 16) | (d[i + 1] << 8) | d[i + 2])) { d[i + 3] = 255; continue; }
    const off = (b / 16 - 0.47) * SPREAD;
    const r = Math.max(0, Math.min(255, d[i] + off)) >> 3, g = Math.max(0, Math.min(255, d[i + 1] + off)) >> 3, bb = Math.max(0, Math.min(255, d[i + 2] + off)) >> 3;
    const p = PAL[LUT[(r << 10) | (g << 5) | bb]];
    d[i] = p[0]; d[i + 1] = p[1]; d[i + 2] = p[2]; d[i + 3] = 255;
  }
  c2d.putImageData(img, 0, 0);
}

// Square a picture off into the title card's chart look: every 2×2 block of pixels becomes one
// colour (the most common one in the block; on a tie, the darkest, so thin outlines survive).
export function cellify(c2d) {
  const img = c2d.getImageData(0, 0, LW, LH), d = new Uint32Array(img.data.buffer);
  const lum = v => (v & 255) + ((v >> 8) & 255) + ((v >> 16) & 255);
  for (let y = 0; y < LH - 1; y += 2) for (let x = 0; x < LW - 1; x += 2) {
    const i = y * LW + x, q = [d[i], d[i + 1], d[i + LW], d[i + LW + 1]];
    let best = q[0], bn = 0;
    for (const v of q) {
      const n = q.filter(u => u === v).length;
      if (n > bn || (n === bn && lum(v) < lum(best))) { best = v; bn = n; }
    }
    d[i] = d[i + 1] = d[i + LW] = d[i + LW + 1] = best;
  }
  c2d.putImageData(img, 0, 0);
}

// Blow the finished 320×240 picture up to fill the monitor's screen.
export function present() {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = false;
  ctx.drawImage(lo, 0, 0, LW, LH, 0, 0, cv.width, cv.height);
}
