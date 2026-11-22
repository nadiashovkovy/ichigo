// ============================================================================
// texture.js — Hokusai's foam as a pixel texture: cream foam broken up by fractal blue speckle.
// One tileable noise field is thresholded at different "levels" so denser foam always contains
// the sparser foam (like the print, where foam thickens toward the crest).
// Textures are pinned to real pixels, so they stay crisp at any zoom.
// ============================================================================
import { P } from './config.js';

const N = 96;   // tile size in real pixels

// Tileable value noise in 0..1, three octaves (cells of 8, 4 and 2 pixels): fine, fractal speckle.
const field = (() => {
  const out = new Float32Array(N * N);
  const rnd = (i, j, o) => { const v = Math.sin(i * 127.1 + j * 311.7 + o * 74.7) * 43758.5453; return v - Math.floor(v); };
  for (const [cell, wgt, o] of [[8, .4, 1], [4, .35, 2], [2, .25, 3]]) {
    const m = N / cell;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const gx = x / cell, gy = y / cell, i = Math.floor(gx), j = Math.floor(gy);
      let fx = gx - i, fy = gy - j; fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
      const a = rnd(i % m, j % m, o), b = rnd((i + 1) % m, j % m, o), c = rnd(i % m, (j + 1) % m, o), d = rnd((i + 1) % m, (j + 1) % m, o);
      out[y * N + x] += wgt * (a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy);
    }
  }
  // spread the values out evenly in 0..1 so a level of .3 really means about 30% foam
  const sorted = Array.from(out).sort((p, q) => p - q);
  for (let k = 0; k < out.length; k++) {
    let lo = 0, hi = sorted.length - 1;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (sorted[mid] < out[k]) lo = mid + 1; else hi = mid; }
    out[k] = lo / sorted.length;
  }
  return out;
})();

const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const cache = new Map();
// Foam where the noise is below `level`, a pale-blue fringe just past it, transparent elsewhere.
function tile(level) {
  const key = level.toFixed(2);
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas'); c.width = c.height = N;
  const g = c.getContext('2d'), img = g.createImageData(N, N), foam = hex(P.foam), pale = hex(P.pale);
  for (let k = 0; k < N * N; k++) {
    const v = field[k], col = v < level ? foam : v < level + .15 ? pale : null;
    if (!col) continue;
    img.data.set([col[0], col[1], col[2], 255], k * 4);
  }
  g.putImageData(img, 0, 0);
  const pat = g.createPattern(c, 'repeat');
  cache.set(key, pat);
  return pat;
}

// A foam fill/stroke style for context g. (ax, ay) is a point in g's current drawing space the
// texture is pinned to, so it moves with whatever is being drawn instead of sliding across it.
export function foam(g, level, ax = 0, ay = 0) {
  const pat = tile(level), T = g.getTransform(), o = T.transformPoint(new DOMPoint(ax, ay));
  pat.setTransform(T.inverse().translate(Math.round(o.x), Math.round(o.y)));
  return pat;
}
