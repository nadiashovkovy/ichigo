// ============================================================================
// pixel.js — the pixel-art pipeline.
// The world is drawn onto a small 320×180 canvas; every pixel is then snapped to the
// woodblock palette using checkerboard ("ordered") dithering, and the result is blown up
// to the window with hard pixel edges.
// ============================================================================
import { LW, LH, PX, W, H, P } from './config.js';

const cv = document.getElementById('c'), ctx = cv.getContext('2d');
export const canvas = cv;

function layer() { const c = document.createElement('canvas'); c.width = LW; c.height = LH; return c; }
export const lo = layer(), lg = lo.getContext('2d', { willReadFrequently: true });      // main picture
export const topC = layer(), tg = topC.getContext('2d', { willReadFrequently: true });  // sea + wreckage + overlays

let dpr = 1, k = 1, dx = 0, dy = 0;
function resize() {
  dpr = window.devicePixelRatio || 1;
  cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
  cv.style.width = innerWidth + 'px'; cv.style.height = innerHeight + 'px';
  k = Math.min(cv.width / LW, cv.height / LH);
  if (k >= 2) k = Math.floor(k);      // whole-number scaling keeps every pixel the same size
  dx = Math.round((cv.width - LW * k) / 2); dy = Math.round((cv.height - LH * k) / 2);
}
addEventListener('resize', resize); resize();

// Drawing modes: "world" = 960×540 game units; "pixel" = real 320×180 pixels.
export function beginWorld() { lg.setTransform(1 / PX, 0, 0, 1 / PX, 0, 0); }
export function beginTop() { tg.setTransform(1 / PX, 0, 0, 1 / PX, 0, 0); tg.clearRect(0, 0, W, H); }
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
export function quantize(c2d) {
  const img = c2d.getImageData(0, 0, LW, LH), d = img.data;
  for (let y = 0; y < LH; y++) for (let x = 0; x < LW; x++) {
    const i = (y * LW + x) * 4, a = d[i + 3];
    if (a === 0) continue;
    const b = BAYER[((y & 3) << 2) | (x & 3)];
    if (a < 250 && (a / 255) * 16 <= b + 0.5) { d[i + 3] = 0; continue; }   // dithered transparency (fades)
    const off = (b / 16 - 0.47) * SPREAD;
    const r = Math.max(0, Math.min(255, d[i] + off)) >> 3, g = Math.max(0, Math.min(255, d[i + 1] + off)) >> 3, bb = Math.max(0, Math.min(255, d[i + 2] + off)) >> 3;
    const p = PAL[LUT[(r << 10) | (g << 5) | bb]];
    d[i] = p[0]; d[i + 1] = p[1]; d[i + 2] = p[2]; d[i + 3] = 255;
  }
  c2d.putImageData(img, 0, 0);
}

// Blow the finished 320×180 picture up to the window.
export function present() {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = P.tan; ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.drawImage(lo, 0, 0, LW, LH, dx, dy, LW * k, LH * k);
}
