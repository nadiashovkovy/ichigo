// ============================================================================
// beachart.js — how Level 1's beach looks (beach.js is how it plays, and Level 0's day, prologue.js, is
// spent on it too): the sand and its shore, the family's house and what stands round it, and Ichigo's
// sandcastle. Drawn pixel by pixel like the rest of the game, in a few flat colours each (RAMP in
// config.js), edged in night-blue ink, shaded with a little dithering.
// Positions are in art pixels (the beach doesn't scroll), except where a comment says game units.
// What doesn't move is drawn once, onto a picture that's kept.
// ============================================================================
import { LW, LH, TOP_PX, PIXEL, P, RAMP } from './config.js';
import { hsh, drawNeedles, drawCarp } from './art.js';
import { dither, pack, pixelBuffer } from './pixel.js';

const Yp = y => Math.round(y / PIXEL + TOP_PX);   // a height in game units, in pixels
const GROUND = Yp(400);                           // the back of the beach

// By day everything is a step lighter than at dusk (which is how it's drawn).
const DAY = new Map([[P.tanD, P.tan], [P.bark, P.tanD], [P.tan, P.sky], [P.sky, P.foam], [P.mauve, P.tanD], [P.violet, P.bark], [P.rosewood, P.tan], [P.plum, P.pine],
  [P.gold, P.foam], [P.dawn, P.brown], [P.rust, P.brown]]);

// ============================================================================
// The sand
// ============================================================================
// Where the shore is on row y (pixels): the sand's right-hand edge, in gentle lobes. back: how far the
// sea has pulled back (game units).
function shoreX(y, back, t) {
  const gy = (y - TOP_PX) * PIXEL; if (gy < 410) return (560 + back) / PIXEL;
  const k = (-40 + Math.sqrt(1600 + 360 * (gy - 410))) / 180, gx = 560 * (1 - k) ** 2 + 1280 * k * (1 - k) + 700 * k * k;
  return (gx + back) / PIXEL + Math.sin(y * .11) * 3 * Math.min(1, (gy - 410) / 40) + Math.sin(y * .05 + t * .9) * 1.6;
}
const backLine = x => GROUND + Math.round(x * .0125 + Math.sin(x * .045) * 1.2);   // the back edge of the beach, from the house to the sea
// The edge of a wave that has run up the front of the beach on row y (Level 0).
const filmX = (y, back, t, wash) => shoreX(y, back, t) - wash * Math.max(0, Math.min(1, (y - 270) / 26)) * (1 + .06 * Math.sin(y * .13 + t * 2));
const sandBuf = pixelBuffer();
const dryKept = new Map();   // the dry sand's pixels, by day and at dusk (it never changes, so it's worked out once)
// Two contours divide the sand into flat bands, a step darker toward us, like the layers of the sea.
const contour = [x => 26 + Math.sin(x * .021) * 5 + Math.sin(x * .057 + 2) * 2, x => 62 + Math.sin(x * .016 + 1) * 7 + Math.sin(x * .049) * 2.5];
// day: daylight, not dusk. wash: how far (pixels) a wave has run up the front of the beach (Level 0).
export function drawSand(g, back, t, { day = false, wash = 0 } = {}) {
  const B = sandBuf.begin(), buf = B.buf, [c0, c1, c2, c3] = RAMP.sand, C = c => pack(day ? DAY.get(c) || c : c);
  const col = { ink: pack(P.outline), white: pack(P.white), mist: pack(P.mist), aqua: pack(P.aqua), lit: C(c0), a: C(c1), b: C(c2), c: C(c3), wet: C(P.mauve), wetD: C(P.violet), shine: C(P.rosewood) };
  let still = dryKept.get(day);
  if (!still) {
    still = new Uint32Array(LW * LH); dryKept.set(day, still);
    for (let y = GROUND - 4; y < LH; y++) for (let x = 0; x < LW; x++) {
      const d = y - backLine(x); if (d < 0) continue;
      const a = contour[0](x), b = contour[1](x);
      still[y * LW + x] = d === 0 ? col.ink : d > 8 && hsh(Math.floor(x / 3) * 3.7 + Math.floor(y / 2) * 11.3) < .006 ? col.c   // (a few grains)
        : d <= 2 ? col.lit : Math.abs(d - a) < .6 || Math.abs(d - b) < .6 ? col.c : d < a ? (dither(x, y) < .5 * (1 - d / a) ? col.a : col.b) : d < b ? col.b : dither(x, y) < .5 ? col.c : col.b;
    }
  }
  for (let y = GROUND - 4; y < LH; y++) {
    const edge = shoreX(y, back, t), dry = shoreX(y, 0, 0) - 18, x1 = Math.min(LW, Math.ceil(edge));
    const film = filmX(y, back, t, wash);   // (the wave's thin edge)
    const calm = Math.max(0, Math.min(x1, Math.floor(Math.min(dry, film)) + 1));
    buf.set(still.subarray(y * LW, y * LW + calm), y * LW);
    for (let x = calm; x < x1; x++) {
      const d = y - backLine(x);
      if (d < 0) continue;
      let v;
      if (d === 0) v = col.ink;
      else if (wash > 0 && x > film) { const f = x - film; v = f < 2 ? col.white : f < 5 ? (hsh(x * 3.1 + y * 7.7 + Math.floor(t * 5)) < .5 ? col.mist : col.aqua) : (Math.floor(x / 7 + t * 3) + y * 3) % 11 === 0 ? col.white : col.aqua; }
      else if (edge - x < 2) v = col.white;                                             // the foam's edge
      else if (edge - x < 4) v = hsh(x * 3.1 + y * 7.7 + Math.floor(t * 4)) < .5 ? col.mist : col.aqua;
      else if (x > dry) v = x - dry < 1 ? col.wetD : Math.floor(y / 2) % 5 === 0 && hsh(Math.floor(x / 8) + y * 2.3) < .35 ? col.shine : col.wet;   // the wet sand, shining with the sky
      else v = still[y * LW + x];
      buf[y * LW + x] = v;
    }
  }
  B.draw(g);
}

// ============================================================================
// What stands on it
// ============================================================================
// castle: how much of it is built (0, 1 the keep, 2 all). nets: hung up to dry. Kept, one picture for each way it can look.
const kept = new Map();
function picture(day, nets, castle) {
  const key = [day, nets, castle].join();
  if (kept.has(key)) return kept.get(key);
  const cv = document.createElement('canvas'); cv.width = LW; cv.height = LH;
  const g = cv.getContext('2d');
  const r = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
  const dot = (x, y, c) => r(x, y, 1, 1, c);
  const line = (x0, y0, x1, y1, w, c) => { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1); for (let i = 0; i <= n; i++) r(Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n), w, w, c); };
  const [wood0, wood1, wood2, wood3] = RAMP.wood, [straw0, straw1, straw2] = RAMP.straw, [s0, s1, s2, s3] = RAMP.sand, [st0, st1, st2, st3] = RAMP.stone;

  // --- a low headland behind the house, one flat shape against the sky
  for (let x = 0; x < 205; x++) {
    const top = Math.round(GROUND - 8 - 22 * Math.max(0, 1 - (x / 190) ** 2) - Math.abs(Math.sin(x * .12)) * 4);
    for (let y = top; y < GROUND + 4; y++) dot(x, y, y === top ? P.outline : y === top + 1 ? P.violet : P.plum);
  }
  // --- the pine, leaning out over the roof
  const trunk = [[17, 262], [13, 238], [16, 210], [26, 184], [34, 158], [33, 140]];
  for (let i = 1; i < trunk.length; i++) { const [x0, y0] = trunk[i - 1], [x1, y1] = trunk[i], n = Math.abs(y1 - y0); for (let k = 0; k <= n; k++) { const q = (i - 1 + k / n) / 5, w = Math.round(9 - q * 5), x = Math.round(x0 + (x1 - x0) * k / n), y = Math.round(y0 + (y1 - y0) * k / n); r(x - 1, y, w + 2, 1, P.outline); r(x, y, w, 1, wood3); r(x + Math.ceil(w * .6), y, Math.floor(w * .4), 1, wood2); } }
  line(24, 190, 6, 172, 3, P.outline); line(25, 190, 7, 173, 1, wood2); line(30, 172, 58, 152, 3, P.outline); line(30, 173, 58, 153, 1, wood2);
  drawNeedles(g, 4, 168, 26, 13, 4.1); drawNeedles(g, 36, 134, 36, 16, 9.7); drawNeedles(g, 64, 150, 26, 12, 2.2);

  // --- the house: a fisherman's house, thatched, on a stone footing
  r(61, 251, 96, 10, P.outline); r(62, 252, 94, 8, st3); r(62, 252, 94, 2, st2);
  for (let x = 66; x < 156; x += 15) { r(x, 252, 1, 4, P.outline); r(x + 7, 256, 1, 4, P.outline); } r(62, 256, 94, 1, P.outline);
  r(66, 210, 86, 42, P.outline);
  for (let x = 67; x < 151; x++) for (let y = 210; y < 251; y++) dot(x, y, (x - 67) % 12 === 0 ? P.outline : (x - 67) % 12 === 1 ? wood1 : y < 222 && dither(x, y) < 1 - (y - 214) / 9 ? wood3 : wood2);   // board walls, in the shade under the eaves
  r(94, 219, 26, 33, P.outline);
  for (let x = 95; x < 119; x++) for (let y = 220; y < 251; y++) dot(x, y, dither(x, y) < (y - 226) / 30 - Math.abs(x - 106) / 40 ? P.dawn : P.rust);   // the doorway, the hearth's light inside
  for (const [x0, w] of [[95, 11], [107, 12]]) { r(x0, 220, w, 13, P.outline); r(x0, 220, w - 1, 12, P.navy); r(x0 + 4, 224, 3, 3, P.foam); r(x0 + 5, 225, 1, 1, P.navy); }   // its curtain (noren), split in two, a crest on each half
  r(125, 219, 22, 18, P.outline); r(126, 220, 20, 16, wood3); r(127, 221, 18, 14, P.gold); r(130, 224, 10, 8, P.foam);   // a paper window, the lamp behind it
  for (const x of [132, 139]) r(x, 221, 1, 14, wood3); r(127, 227, 18, 1, wood3);
  r(90, 251, 34, 5, P.outline); r(91, 252, 32, 2, wood1); r(91, 254, 32, 1, wood2);   // the step
  for (let y = 168; y < 220; y++) {   // the thatch, in three shaggy layers
    const q = (y - 168) / 48, l = Math.round(80 - 35 * q ** .9), w = Math.round(139 + 34 * q ** .9);
    for (let x = l; x <= w; x++) {
      const fringe = 214 + Math.round(hsh(Math.floor(x / 2) * 2.3) * 4); if (y > fringe) continue;
      const rag = Math.round(hsh(Math.floor(x / 3) * 1.7) * 4), lay = (y - 168 + rag) % 16, right = (x - l) / (w - l);
      dot(x, y, x === l || x === w || y === 168 || y === fringe ? P.outline : lay < 2 && y > 176 ? straw2 : lay < 5 && y > 176 && dither(x, y) < .5 ? straw2 : right > .62 && dither(x, y) < (right - .55) * 1.1 ? straw0 : right < .2 && dither(x, y) < .35 ? straw2 : straw1);
    }
  }
  r(73, 160, 73, 9, P.outline); r(74, 161, 71, 7, wood3); r(74, 161, 71, 2, wood2); for (let x = 82; x < 144; x += 18) { r(x - 1, 159, 6, 11, P.outline); r(x, 160, 4, 9, wood1); }   // the ridge, bound with bamboo
  for (const [x, s] of [[76, 1], [143, -1]]) for (const m of [s, -s]) { line(x - m * 8, 150, x + m * 6, 168, 4, P.outline); line(x - m * 8 + 1, 151, x + m * 6 + 1, 168, 2, wood2); }   // crossed rafters at its ends
  // --- round the house: a water jar, and the nets hung on poles to dry
  for (let y = 244; y < 262; y++) { const w = Math.round(8 - Math.abs(y - 252) * .45 + (y > 258 ? -1 : 0)); r(163 - w - 1, y, w * 2 + 2, 1, P.outline); r(163 - w, y, w * 2, 1, wood3); r(163, y, w, 1, wood2); r(163 + Math.floor(w * .5), y, 1, 1, wood1); }
  r(155, 241, 17, 4, P.outline); r(156, 242, 15, 2, wood2);
  if (nets) {
    for (const x of [213, 262]) { r(x - 1, 222, 5, 44, P.outline); r(x, 223, 3, 42, wood2); r(x + 2, 223, 1, 42, wood1); }
    r(209, 224, 60, 3, P.outline); r(210, 225, 58, 1, wood1);
    for (let x = 216; x < 262; x++) { const sag = Math.round(26 + 8 * Math.sin((x - 216) / 46 * Math.PI)); for (let y = 227; y < 227 + sag; y++) if ((x + y) % 7 === 0 || (x - y + 700) % 7 === 0) dot(x, y, st1); if (x % 11 === 0) { r(x - 1, 226 + sag, 4, 3, P.outline); r(x, 226 + sag, 2, 2, wood1); } }   // (with its floats)
  }
  // --- Ichigo's sandcastle: a keep, then two towers, a red rag for a flag
  const wall = (x, y, w, h, teeth) => {
    r(x - 1, y - 1, w + 2, h + 1, P.outline); r(x, y, w, h, s2); r(x + w - 2, y, 2, h, s1); r(x, y, 1, h, s3);
    for (let i = 0; teeth && i < w; i += 4) { r(x + i - 1, y - 4, 4, 3, P.outline); r(x + i, y - 3, 2, 3, s1); }
  };
  if (castle) {
    if (castle > 1) { wall(274, 244, 8, 20, true); wall(294, 244, 8, 20, true); }
    wall(283, 236, 10, 28, true); if (castle > 1) wall(272, 254, 32, 10, false);
    r(284, 253, 8, 11, P.outline); r(285, 255, 6, 9, wood3); if (castle > 1) r(288, 222, 1, 12, P.outline);   // (its gate, and the stick for its flag)
    for (let i = 0; i < 7; i++) { const x = 136 + i * 20, y = 266 + (i % 2) * 4; r(x, y, 4, 2, s3); }   // footprints, from the step to the castle
  }
  // --- left by the tide: a shell and a few stones
  r(351, 292, 7, 3, P.outline); r(352, 291, 5, 1, P.outline); r(352, 292, 5, 2, P.foam); dot(354, 292, P.pink);
  for (const [x, y, w] of [[176, 322, 5], [268, 338, 6], [404, 320, 5], [412, 324, 3]]) { r(x - 1, y, w + 2, 3, P.outline); r(x, y - 1, w, 1, P.outline); r(x, y, w, 2, st2); r(x + 1, y, w - 2, 1, st1); }
  if (day) {   // a step lighter
    const img = g.getImageData(0, 0, LW, LH), v = new Uint32Array(img.data.buffer), to = new Map([...DAY].map(([a, b]) => [pack(a), pack(b)]));
    for (let i = 0; i < v.length; i++) if (to.has(v[i])) v[i] = to.get(v[i]);
    g.putImageData(img, 0, 0);
  }
  kept.set(key, cv); return cv;
}

// A clump of dune grass: blades arching out from its foot, bending in the wind.
function grass(g, x, y, n, tall, seed, t) {
  for (const ink of [true, false]) for (let i = 0; i < n; i++) {
    const a = (i + .5) / n - .5 + (hsh(seed + i) - .5) * .2, h = tall * (.6 + hsh(seed * 3 + i) * .5), sway = Math.sin(t * 1.5 + x * .04 + i * .5) * .12 + .12;
    g.fillStyle = ink ? P.outline : i % 2 ? P.leaf : P.olive;
    for (let k = 0; k < h; k++) { const q = k / h, bx = Math.round(x + (a * 1.1 + sway) * h * q ** 1.7 * 1.2 + a * 5), by = Math.round(y - k * (1 - .32 * Math.abs(a) * q)); g.fillRect(bx - (ink ? 1 : 0), by, ink ? (q < .7 ? 3 : 2) : 1, 1); }
  }
}

// Everything on the sand, over it. t: the time. shadow: how far shadows fall ([right, down], in pixels; none at dusk).
export function drawBeachThings(g, t, { day = false, nets = true, castle = 2, carps = true, smoke = true, shadow = null } = {}) {
  if (shadow) {
    const [dx, dy] = shadow, at = (x0, x1, y) => { g.fillStyle = day ? P.tanD : P.bark; for (let k = 0; k < dy; k++) { const x = Math.round(dx * k / dy); for (let i = x0; i < x1; i++) if (dither(i + x + 512, y + k) < .62) g.fillRect(i + x, y + k, 1, 1); } };
    at(60, 158, 261); at(185, 189, 262); at(14, 24, 262); if (nets) { at(213, 217, 265); at(262, 266, 265); } if (castle > 1) at(272, 304, 264); else if (castle) at(283, 293, 264);
  }
  // the pole, its gilded ball, and the family's carp streamers: a big one and a small one
  g.fillStyle = P.outline; g.fillRect(185, 126, 4, 138); g.fillStyle = P.wood; g.fillRect(186, 127, 2, 136); g.fillStyle = P.ochre; g.fillRect(187, 127, 1, 136);
  g.fillStyle = P.outline; g.fillRect(184, 121, 6, 6); g.fillStyle = P.gold; g.fillRect(185, 122, 4, 4);
  if (carps) { drawCarp(g, 188, 136, 46, 13, P.aqua, P.ocean, t); drawCarp(g, 188, 156, 32, 9, P.aqua, P.deep, t + 1.3); }
  g.drawImage(picture(day, nets, castle), 0, 0);
  if (smoke) for (let i = 0; i < 6; i++) { const k = (t * .11 + i / 6) % 1, x = Math.round(96 + k * 30 + Math.sin(k * 9 + i) * 4), y = Math.round(158 - k * 56), n = Math.round(2 + k * 5); g.fillStyle = P.grey1; for (let a = -n; a <= n; a++) for (let b = -n; b <= n; b++) if (a * a + b * b <= n * n && dither(x + a, y + b) < .45 * (1 - k)) g.fillRect(x + a, y + b, 1, 1); }
  if (castle > 1) for (let i = 0; i < 7; i++) { const d = Math.round(Math.sin(t * 6 - i * .8) * .8); g.fillStyle = P.outline; g.fillRect(289 + i, 221 + d, 1, 6); g.fillStyle = i > 4 ? P.rust : P.red; g.fillRect(289 + i, 222 + d, 1, 4); }   // the flag
  for (const [x, n, h, s] of [[6, 5, 16, 1], [48, 5, 13, 2], [178, 5, 13, 4], [198, 6, 15, 5]]) grass(g, x, backLine(x) + 6, n, h, s * 3.7, t);
}
export function drawBeachFront(g, t) { grass(g, 96, 366, 11, 34, 5.1, t); grass(g, 120, 370, 8, 26, 10.2, t); }

// ============================================================================
// Drawings scratched in the sand (Level 0): strokes, each a list of points (pixels), drawn `len` pixels
// of the way along (Infinity: all of them). Returns where the point has got to.
// ============================================================================
// wash, t: how far a wave has run up, and the time (nothing shows under it).
export function drawInSand(g, strokes, len, day, wash = 0, t = 0) {
  const dark = day ? P.wood : P.brown, light = day ? P.foam : P.sky;
  let left = len, tip = null;
  for (const pts of strokes) for (let i = 0; i + 3 < pts.length && left > 0; i += 2) {
    const [x0, y0, x1, y1] = pts.slice(i, i + 4), n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
    for (let k = 0; k <= n && left > 0; k++, left--) {
      const x = Math.round(x0 + (x1 - x0) * k / n + Math.sin((k + i * 7) * .3) * .6), y = Math.round(y0 + (y1 - y0) * k / n);
      tip = [x, y];
      if (wash > 0 && x > filmX(y, 0, t, wash) - 2) continue;
      g.fillStyle = light; g.fillRect(x, y + 2, 2, 1);   // the sand pushed up along its lower edge, in the light
      g.fillStyle = dark; g.fillRect(x, y, 2, 2);
    }
  }
  return left > 0 ? null : tip;
}
