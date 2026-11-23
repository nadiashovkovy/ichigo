// ============================================================================
// pixel.js — the pixel-art pipeline.
// The world is drawn onto a small 640×480 canvas (640×360 in full screen); every pixel is then snapped to the
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
// perfect k×k square. (If that would waste much of the window, as when a 640-pixel-wide game doesn't
// quite fit twice over, the zoom isn't rounded down: pixels then differ by one device pixel here and
// there, which is hard to see at these sizes.) The PC's own size follows the screen's size in CSS (--sw, --sh).
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
  if (lo.width !== LW || lo.height !== LH) { lo.width = topC.width = LW; lo.height = topC.height = LH; }
  const edge = 2 * (.016 + .006 + .008);
  const [sx, sy] = full ? [1 + edge, 1 + edge * LW / LH] : setupScale(), margin = full ? 1 : .96;
  const fit = Math.min(innerWidth * margin / (LW * sx), innerHeight * margin / (LH * sy)) * dpr;
  k = fit >= 1 && Math.floor(fit) >= fit * .85 ? Math.floor(fit) : fit;   // whole-number zoom, unless that wastes too much room
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

// Drawing modes: "world" = game units (see config.js); "pixel" = real art pixels (640×480 or 640×360).
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
const OPAQUE = new Set(PAL.map(([r, g, b]) => ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0));   // palette colours, as whole pixels
export function quantize(c2d) {
  const img = c2d.getImageData(0, 0, LW, LH), d = img.data, d32 = new Uint32Array(d.buffer);
  let same = 0;   // (the last pixel found already to be a palette colour: runs of it are skipped at once)
  for (let y = 0; y < LH; y++) for (let x = 0; x < LW; x++) {
    const v = d32[y * LW + x];
    if (v === 0 || v === same) continue;
    if (OPAQUE.has(v)) { same = v; continue; }   // see-through, or already a palette colour (most pixels: checked as one number)
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

// A buffer of pixels to paint into (rectangles of palette colours, in pixel space), then draw onto a
// canvas in one go: far faster than thousands of tiny fillRects. Drawing it as an image keeps any clip
// the canvas has set. (Used for the sky, the seas and Fuji.)
const packed = {};
export const pack = c => packed[c] ?? (packed[c] = ((255 << 24) | (parseInt(c.slice(5, 7), 16) << 16) | (parseInt(c.slice(3, 5), 16) << 8) | parseInt(c.slice(1, 3), 16)) >>> 0);
export function pixelBuffer() {
  const cv = document.createElement('canvas');
  let img = null;
  const b = {
    buf: null,
    begin() {
      if (cv.width !== LW || cv.height !== LH) { cv.width = LW; cv.height = LH; img = null; }
      if (!img) { img = cv.getContext('2d').createImageData(LW, LH); b.buf = new Uint32Array(img.data.buffer); }
      b.buf.fill(0); return b;
    },
    rect(x, y, w, h, c) {   // (whole pixels; clipped to the screen)
      const x0 = Math.max(0, Math.round(x)), x1 = Math.min(LW, Math.round(x + w)), y0 = Math.max(0, Math.round(y)), y1 = Math.min(LH, Math.round(y + h));
      if (x1 <= x0) return;
      const v = pack(c);
      for (let yy = y0; yy < y1; yy++) b.buf.fill(v, yy * LW + x0, yy * LW + x1);
    },
    draw(g, direct = false) {   // direct: put the pixels straight onto g, replacing what's there (faster)
      if (direct) { g.putImageData(img, 0, 0); return; }
      cv.getContext('2d').putImageData(img, 0, 0); g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(cv, 0, 0); g.restore();
    },
  };
  return b;
}

// Blow the finished picture up to fill the monitor's screen.
export function present() {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = false;
  ctx.drawImage(lo, 0, 0, LW, LH, 0, 0, cv.width, cv.height);
}

// Scale2x: doubles a little picture made of letters ('.' = see-through), rounding off its diagonal
// steps instead of just making the pixels bigger. Used to draw the small pictures (lettering, boats,
// gulls, the HUD) at the screen's double detail.
export function scale2x(rows) {
  const h = rows.length, w = rows[0].length, at = (x, y) => (x >= 0 && x < w && y >= 0 && y < h ? rows[y][x] : '.');
  const out = Array.from({ length: h * 2 }, () => []);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const p = at(x, y), a = at(x, y - 1), b = at(x + 1, y), c = at(x - 1, y), d = at(x, y + 1);
    out[2 * y].push(c === a && c !== d && a !== b ? a : p, a === b && a !== c && b !== d ? b : p);
    out[2 * y + 1].push(d === c && d !== b && c !== a ? c : p, b === d && b !== a && d !== c ? d : p);
  }
  return out.map(r => r.join(''));
}
