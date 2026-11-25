// ============================================================================
// lighthouseart.js — how Level 4 looks (lighthouse.js is how it plays): a clear night on the rocks, and across the
// water a lighthouse whose lamp is an eye. It stands far off, so it's always in sight. The rocks, the shed's rooms,
// the wreck and the boathouse (cut open, so we can see in) never change, so they're painted once, onto one long
// picture that slides by. The eye and its light are drawn over it every frame; so are the rocks in front, that Ichigo hides behind.
// ============================================================================
import { W, LW, LH, TOP, TOP_PX, PIXEL, P, LIGHT, RAMP, toPx } from './config.js';
import { S, parts } from './state.js';
import { lg, beginWorld, pixelSpace, dither, pack, pixelBuffer, scale2x } from './pixel.js';
import { pixelText, LETTER, LINE } from './text.js';
import { drawScenery, drawChartSea, hsh } from './art.js';
import { drawSprite, spriteHeight, markIds, outline, SP } from './sprite.js';
import { drawDawn } from './dawn.js';
import { drawHUD, drawEndFg } from './scenes.js';
import { THINGS } from './things.js';
import { clothAt } from './plumart.js';
import { H, groundY, surfaceY, seaAt, beam, patch, bolted, action, place, insideAt, tunnelAt, shelfUnder } from './lighthouse.js';

const X = x => Math.round((x - S.camX) / PIXEL), Yp = y => Math.round(y / PIXEL + TOP_PX), u = x => Math.round(x / PIXEL);
const C = { K: P.outline, n: P.navy, N: P.night, x: P.slate, i: P.indigo, S: SP.S, s: SP.s, m: SP.m, k: P.ink, w: P.white, W: P.foam, h: P.grey0, H: P.grey1, g: P.grey2, G: P.grey3, o: P.gold, O: P.ochre, B: P.brown, b: P.wood, T: P.tan, t: P.tanD, R: P.red, r: P.rust, Y: SP.Y, y: SP.y, J: SP.R, j: SP.r, a: P.aqua, M: P.mist, p: P.plum, e: P.leaf };
const grid = (rows, ink = true) => { const w = Math.max(...rows.map(r => r.length)), g = rows.map(r => [...r.padEnd(w, '.')].map(ch => (ch === '.' ? null : C[ch]))); return ink ? outline(g) : g; };
function put(g, gr, cx, bottom, flip = false) {
  const w = gr[0].length, x0 = Math.round(cx - w / 2), y0 = Math.round(bottom) - gr.length + 1;
  gr.forEach((row, r) => row.forEach((c, i) => { if (c) { g.fillStyle = c; g.fillRect(x0 + (flip ? w - 1 - i : i), y0 + r, 1, 1); } }));
}

// ============================================================================
// What never changes, painted once
// ============================================================================
let strip = null, front = null, far = null, tower = null, stack = null;
const TW = 300, LAMP = [150, 62];   // the tower's picture: how wide, and where the lamp is on it
// Paint many pixels at once: col(x, y) is each one's colour, or null.
function fill(g, x0, y0, w, h, col) {
  if (w <= 0 || h <= 0) return;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const q = c.getContext('2d'), img = q.createImageData(w, h), buf = new Uint32Array(img.data.buffer);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = col(x0 + x, y0 + y); if (v) buf[y * w + x] = pack(v); }
  q.putImageData(img, 0, 0); g.drawImage(c, x0, y0);
}
// Rock, d pixels down from its surface at (x, y): in layers that follow the surface, like the sea's, each a step
// darker and edged in ink; the moon along its top. (Wet and dark toward the water.)
const LAYERS = [[0, P.steel], [7, P.slate], [21, P.grey3], [40, P.indigo], [62, P.plum], [90, P.outline]];
function rockAt(x, y, d, seed = 0) {
  if (d < 1) return P.outline;
  const wob = Math.sin(x * .043 + seed) * 2.6 + Math.sin(x * .013 + seed * 2) * 3.4, e = d < 8 ? d : d + wob * Math.min(1, (d - 8) / 14);
  let i = 0; while (i < LAYERS.length - 1 && e >= LAYERS[i + 1][0]) i++;
  const into = e - LAYERS[i][0], next = i < LAYERS.length - 1 ? LAYERS[i + 1][0] - e : 99;
  if (i > 0 && into < 1) return P.outline;                                                             // the line along the top of a layer
  if (d < 3) return P.pale;
  if (i > 0 && into < 2.2 && dither(x & 255, y & 255) < .55) return LAYERS[i - 1][1];                    // lit along that edge
  const crack = Math.abs(((x + Math.floor(d * .5) + Math.sin(d * .3 + seed) * 2 + seed * 17) % 61 + 61) % 61 - 30) < .6 && i > 0 && i < 4 && hsh(Math.floor((x + seed * 17) / 61) * 3.1 + i) < .6; if (crack) return P.outline;
  return next < 5 && dither((x + 1) & 255, y & 255) < (5 - next) / 7 ? LAYERS[i + 1][1] : LAYERS[i][1];
}
// A boulder, rounded, its foot on the ground.
function boulder(g, x0, x1, base, h, seed) {
  const cx = (x0 + x1) / 2, rx = (x1 - x0) / 2 + 3, top = new Map();
  for (let x = Math.ceil(cx - rx); x <= cx + rx; x++) { const q = (x - cx) / rx; top.set(x, base - Math.round(h * Math.sqrt(Math.max(0, 1 - q * q)) * (.93 + .07 * Math.sin(q * 5 + seed)))); }
  for (const [x, t] of top) for (let y = t; y <= base + 4; y++) {
    const edge = y === t || (top.get(x - 1) ?? 999) > y || (top.get(x + 1) ?? 999) > y;
    // (its layers lie across it, tilting a little; the side away from the moon is dark)
    const q = (x - cx) / rx, d = Math.max(1, Math.round(y - base + h + (x - cx) * .16 + 2)), dark = q > .25 && dither(x & 255, y & 255) < (q - .25) * 1.1, lit = y - t < 3 || (q < -.5 && y - t < 6 && dither(x & 255, y & 255) < .6);
    g.fillStyle = edge ? P.outline : lit ? (y - t < 2 ? P.pale : P.steel) : dark ? P.plum : rockAt(x, y, Math.max(3, d), seed); g.fillRect(x, y, 1, 1);
  }
}
function planks(g, x0, y0, w, h, cols, vertical = true, seed = 0) {   // boards: light, mid, dark, and ink between
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    const a = vertical ? x - x0 : y - y0, b = vertical ? y : x, board = Math.floor(a / 9), n = hsh(board * 5.3 + Math.floor(b / 7) * 2.9 + seed);
    g.fillStyle = a % 9 === 0 ? P.outline : a % 9 === 1 ? cols[0] : n < .12 ? cols[2] : dither(x & 255, y & 255) < .25 ? cols[2] : cols[1]; g.fillRect(x, y, 1, 1);
  }
}
// The lighthouse, and the headland it stands on.
function paintTower() {
  tower = document.createElement('canvas'); tower.width = TW; tower.height = LH;
  const g = tower.getContext('2d'), r = (x, y, ww, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(ww), Math.round(h)); };
  // the lighthouse, on its own headland across the water: white plaster, round, the moon on its left
  const [lx, ly] = LAMP, base = 218, sea = Yp(392);
  for (let y = ly + 14; y < base; y++) {
    const k = (y - ly - 14) / (base - ly - 14), half = Math.round(16 + 13 * k ** 1.3);
    for (let x = -half; x <= half; x++) {
      const q = x / half, band = k > .42 && k < .52, n = hsh(Math.floor((x + (Math.floor(y / 8) % 2) * 6) / 12) * 3.1 + Math.floor(y / 8) * 7.7);
      const shade = q * .55 + .42 + (n - .5) * .12;
      g.fillStyle = Math.abs(x) === half ? P.outline : y % 8 === 0 && n < .5 && q > -.5 ? (band ? P.rosewood : P.grey2) : dither((lx + x) & 255, y & 255) < (shade - .5) * 2 ? (band ? P.violet : P.slate) : dither((lx + x) & 255, y & 255) < shade * 1.5 ? (band ? P.rust : P.grey2) : band ? P.red : q < -.55 ? P.foam : P.grey0;
      g.fillRect(lx + x, y, 1, 1);
    }
  }
  for (const [k, dx] of [[.25, -4], [.68, 5]]) { const y = Math.round(ly + 14 + (base - ly) * k); r(lx + dx - 4, y - 1, 8, 13, P.outline); r(lx + dx - 3, y, 6, 11, P.night); r(lx + dx - 3, y + 5, 6, 1, P.outline); r(lx + dx, y, 1, 11, P.outline); }   // windows
  r(lx - 11, base - 30, 20, 30, P.outline); planks(g, lx - 10, base - 29, 18, 29, [P.wood, P.brown, P.outline], true, 4); r(lx + 4, base - 15, 2, 3, P.ochre);      // its door
  r(lx - 27, ly + 12, 55, 5, P.outline); r(lx - 26, ly + 13, 53, 3, P.grey2); r(lx - 26, ly + 13, 53, 1, P.grey0);                                                // the gallery, and its rail
  for (let x = -26; x <= 26; x += 6) r(lx + x, ly + 4, 1, 9, P.outline); r(lx - 26, ly + 4, 53, 1, P.outline);
  for (let y = ly - 16; y < ly + 13; y++) for (let x = -17; x <= 17; x++) { g.fillStyle = Math.abs(x) === 17 || y === ly - 16 ? P.outline : Math.abs(x) > 14 ? P.slate : x % 8 === 0 ? P.grey3 : P.night; g.fillRect(lx + x, y, 1, 1); }   // the lamp room
  for (let j = 0; j < 13; j++) { const hw = Math.round(4 + j * 1.35); r(lx - hw - 1, ly - 29 + j, hw * 2 + 3, 1, P.outline); for (let x = -hw; x <= hw; x++) { g.fillStyle = j === 12 ? P.outline : x < -hw * .25 ? P.ember : x > hw * .4 ? P.rosewood : P.red; g.fillRect(lx + x, ly - 29 + j, 1, 1); } }   // its red roof
  r(lx - 2, ly - 36, 5, 8, P.outline); r(lx - 1, ly - 35, 3, 6, P.ochre); r(lx - 1, ly - 40, 3, 5, P.outline);

  // the headland: cliffs, in layers like the rest of the rocks
  const top = x => { const q = Math.abs(x - lx) / 140; return q > 1 ? 999 : Math.round(base - 5 + 34 * q ** 2.2 + 3 * Math.sin(x * .09) * q); };
  fill(g, 0, 200, TW, sea + 4 - 200, (x, y) => { const t = top(x); return y < t ? null : dither(x & 255, y & 255) < .3 ? P.outline : rockAt(x, y, Math.round((y - t) * 1.6), 2); });
}
const TUNNEL = 22;   // how high the tunnels are: just Ichigo under the bucket
// A gap in the wreck's planks, likewise.
const slitAt = (wx, w) => { const ww = Math.round(w * .42 / 2) * 2; return { x: u(wx) - ww / 2, y: Yp(424) - 92, ww, h: 46 }; };
// A hole in the boathouse's thatch.
const holeAt = (wx, w) => { const ww = Math.round(w * .5 / 2) * 2; return { x: u(wx) - ww / 2, y: Yp(424) - 142, ww, h: 24 }; };
// A window of the shed, in pixels on the long picture.
const paneAt = (wx, w) => { const ww = Math.round(w * .36 / 2) * 2; return { x: u(wx) - ww / 2, y: 70, ww, h: 42 }; };
function paint() {
  paintTower();
  const L = S.level, w = u(L.raft + 400), mk = ww => { const c = document.createElement('canvas'); c.width = ww; c.height = LH; return c; };
  strip = mk(w); front = mk(w); far = mk(Math.round(u(L.length) * .4) + LW);
  const g = strip.getContext('2d'), G = x => Yp(groundY(x * PIXEL)), r = (x, y, ww, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(ww), Math.round(h)); };
  const floor = Yp(430), hx0 = u(L.house), hx1 = u(L.rope + 30), hf = Yp(424);

  // the rocks, and the pools in them
  fill(g, u(L.room), 180, w - u(L.room), LH - 180, (() => { const tops = new Map(); return (x, y) => { let t = tops.get(x); if (t === undefined) tops.set(x, t = G(x)); return y < t ? null : rockAt(x, y, y - t); }; })());
  for (const [a, b, sy] of L.stones) {   // stones standing in the water: flat on top, and wider the deeper they go
    const x0 = u(a), x1 = u(b), t0 = Yp(sy);
    fill(g, x0 - 14, t0 - 1, x1 - x0 + 28, LH - t0 + 1, (x, y) => {
      const d = y - t0, spread = Math.min(12, Math.round(d * .16 + 1.6 * Math.sin(y * .23 + a))), l = x0 - spread + (d < 3 ? 3 - d : 0), q = x1 + spread - (d < 3 ? 3 - d : 0);
      if (x < l || x > q || y < t0) return null;
      return x === l || x === q || d === 0 ? P.outline : x - l < 4 && d > 3 && dither(x & 255, y & 255) < .6 ? P.steel : q - x < 9 && dither(x & 255, y & 255) < (9 - (q - x)) / 10 ? P.plum : rockAt(x, y, Math.max(1, Math.round(d * .9)), a);
    });
  }
  for (let i = 0; i < 620; i++) {   // weed hanging over the edge, and limpets
    const wx = L.room + 60 + hsh(i * 3.7) * (L.house - L.room - 90); if (groundY(wx) > 450 || insideAt(wx)) continue; const x = u(wx), y = G(x);
    if (i % 3) { for (let j = 0; j < 4; j++) { g.fillStyle = (i + j) % 2 ? P.pine : P.leaf; g.fillRect(x + j * 2, G(x + j * 2) + 1, 1, 2 + Math.floor(hsh(i + j) * 5)); } } else { g.fillStyle = P.outline; g.fillRect(x - 1, y - 2, 5, 3); g.fillStyle = P.grey1; g.fillRect(x, y - 2, 3, 2); }
  }
  for (const [a, b, py] of L.pools) for (let x = u(a); x < u(b); x++) { const t = Yp(py); for (let y = t; y < G(x); y++) { g.fillStyle = y === t ? P.mist : y === t + 1 ? P.aqua : hsh(Math.floor(x / 6) * 2.3 + y * 5.1) < .1 ? P.steel : dither(x & 255, y) < (y - t) / 14 ? P.navy : P.ocean; g.fillRect(x, y, 1, 1); } }

  // --- the rooms, cut open: the shelf room, the workshop, the kitchen
  const roomR = u(L.room + 2), ceil = 44;
  const WALL = [[P.brown, P.outline, P.night], [P.brown, P.plum, P.outline], [P.wood, P.brown, P.outline], [P.brown, P.plum, P.night]];
  const rooms = L.rooms.filter(q => q.wall);
  rooms.forEach((rm, n) => {
    const x0 = u(rm.from), x1 = u(rm.to), [lit, mid, dark] = WALL[n];
    fill(g, x0, ceil, x1 - x0, floor - ceil, (x, y) => {   // boards, wide and quiet, lighter low down
      const bd = (y - ceil) % 22, seam = ((x + Math.floor((y - ceil) / 22) * 57) % 118), k = .12 + .5 * (y - ceil) / (floor - ceil) - Math.abs(x - (x0 + x1) / 2) / (x1 - x0) * .25;
      return bd === 0 || seam === 0 ? P.night : bd === 1 && dither(x & 255, y & 255) < .5 ? lit : dither(x & 255, y & 255) < k ? lit : dither((x + 1) & 255, (y + 2) & 255) < .4 + k ? mid : dark;
    });
    for (let y = floor - 34; y < floor; y++) for (let x = x0; x < x1; x++) { const v = (x - x0) % 13; g.fillStyle = y === floor - 34 || v === 0 ? P.outline : y < floor - 31 ? P.wood : v === 1 ? P.wood : dither(x & 255, y & 255) < .3 ? P.outline : P.brown; g.fillRect(x, y, 1, 1); }   // a skirting of upright boards
  });
  for (let y = floor; y < LH; y++) for (let x = 0; x < roomR + 6; x++) { const row = Math.floor((y - floor) / 13), st = (x + (row % 2) * 17 + Math.floor(hsh(row * 3.1) * 6)) % 34; g.fillStyle = y === floor || (y - floor) % 13 === 0 || st === 0 ? P.outline : y < floor + 3 ? P.grey1 : st < 3 || (y - floor) % 13 === 1 ? P.grey2 : dither(x & 255, y & 255) < (y - floor - 8) / 40 ? P.plum : P.slate; g.fillRect(x, y, 1, 1); }
  // windows (the light comes in at them: see lights())
  for (const rm of rooms) for (const [wx, w] of rm.windows) { const { x, y, ww, h } = paneAt(wx, w);
    r(x - 3, y - 3, ww + 6, h + 6, P.outline); r(x - 2, y - 2, ww + 4, h + 4, P.wood); r(x, y, ww, h, P.navy);
    for (let j = 0; j < h; j++) for (let i = 0; i < ww; i++) { g.fillStyle = hsh(i * 3.3 + j * 7.1 + wx) < .02 ? P.mist : dither(i, j) < j / h * .5 ? P.slate : j < h * .5 ? P.navy : P.indigo; g.fillRect(x + i, y + j, 1, 1); }
    r(x + (ww >> 1) - 1, y, 2, h, P.wood); r(x, y + (h >> 1) - 1, ww, 2, P.wood); r(x - 5, y + h + 2, ww + 10, 4, P.outline); r(x - 4, y + h + 3, ww + 8, 2, P.ochre); }
  // beams, posts, rafters
  r(0, ceil - 10, roomR + 8, 14, P.outline); for (let x = 0; x < roomR + 6; x++) for (let y = ceil - 9; y < ceil + 3; y++) { g.fillStyle = y < ceil - 6 ? P.ochre : hsh(Math.floor(x / 23) * 3.3 + Math.floor(y / 3)) < .3 ? P.brown : P.wood; g.fillRect(x, y, 1, 1); }
  for (let x = 0; x < roomR + 14; x++) for (let y = ceil - 30; y < ceil - 10; y++) { const k = (y - ceil + 30), lay = (y + Math.round(hsh(Math.floor(x / 3) * 1.7) * 3)) % 9; if (x > roomR + 10 - (19 - k) * .4) continue; g.fillStyle = k === 0 || k === 19 ? P.outline : lay < 1 ? P.outline : lay < 4 && dither(x & 255, y & 255) < .5 ? P.brown : P.olive; g.fillRect(x, y, 1, 1); }   // the edge of the thatch
  for (const wx of [0, 180, 400, 640, 1010, 1190, 1320, 1570, 1840, 2160, 2385, 2655, 2862]) { const x = u(wx); r(x, ceil, 11, floor - ceil, P.outline); r(x + 1, ceil, 9, floor - ceil, P.wood); r(x + 1, ceil, 2, floor - ceil, P.ochre); r(x + 8, ceil, 2, floor - ceil, P.brown); for (let y = ceil + 14; y < floor; y += 31) r(x + 3, y, 4, 1, P.brown); for (let j = 0; j < 14; j++) { r(x - 14 + j, ceil + 3 + j, 4, 2, P.outline); r(x + 21 - j, ceil + 3 + j, 4, 2, P.outline); r(x - 13 + j, ceil + 3 + j, 2, 1, P.wood); r(x + 22 - j, ceil + 3 + j, 2, 1, P.wood); } }
  // shelves
  for (const [a, b, sy] of L.shelves) { const x0 = u(a), ww = u(b - a), y = Yp(sy), low = sy > 360;
    r(x0 - 2, y, ww + 4, 7, P.outline); for (let x = 0; x < ww + 2; x++) { r(x0 - 1 + x, y + 1, 1, 2, P.tan); r(x0 - 1 + x, y + 3, 1, 3, hsh(Math.floor(x / 11) + a) < .3 ? P.wood : P.ochre); }
    if (low) for (const bx of [x0 + 2, x0 + ww - 8]) { r(bx - 1, y + 7, 7, floor - y - 7, P.outline); r(bx, y + 7, 5, floor - y - 8, P.wood); r(bx, y + 7, 1, floor - y - 8, P.ochre); }
    else for (const bx of [x0 + 8, x0 + ww - 14]) for (let j = 0; j < 13; j++) { r(bx - 1, y + 7 + j, Math.max(2, 9 - Math.round(j * .55)), 1, P.outline); r(bx, y + 7 + j, Math.max(1, 6 - Math.round(j * .5)), 1, P.brown); } }
  const lay = (gr, wx, sy) => put(g, gr, u(wx), Yp(sy));   // washed-up things, along the shelves and the floor
  const B1 = grid(['...bb...', '...OO...', '...ee...', '..eeee..', '.eeeeee.', '.ewweee.', '.eweeee.', '.eeeeee.', '.eeeeee.', '.eeeeee.', '.eeeeee.']), B2 = grid(['..bb..', '..aa..', '.aaaa.', 'aMaaaa', 'aMaaaa', 'aaaaaa', 'aaaaaa', '.aaaa.']), BELL = grid(['...oo...', '..oooo..', '.oWoooO.', '.oWoooO.', 'ooWooooO', 'OOOOOOOO', '...BB...']), COIL = grid(['....TTTTTT....', '..TTttttttTT..', '.TtTTTTTTTTtT.', 'TtTttttttttTtT', 'TtTTTTTTTTTTtT', '.TTttttttttTT.', '..TTTTTTTTTT..']);
  const CRATE = grid(Array.from({ length: 26 }, (_, j) => Array.from({ length: 30 }, (_, i) => (j < 2 || j > 23 || i < 2 || i > 27 ? (j === 2 ? 'K' : 'O') : j % 7 === 2 ? 'K' : Math.abs(i - 2 - j * 1.05) < 1.6 ? 'O' : (i * 3 + j) % 11 === 0 ? 'B' : 'b')).join('')));
  const BARREL = grid(Array.from({ length: 34 }, (_, j) => { const h = Math.round(11 + 3 * Math.sin(Math.PI * (j + 2) / 37)); return Array.from({ length: 30 }, (_, i) => { const q = i - 14.5; return Math.abs(q) > h ? '.' : j === 6 || j === 7 || j === 26 || j === 27 ? (q < -4 ? 'H' : 'G') : j === 0 ? 'T' : Math.abs(q) > h - 1 ? 'B' : i % 6 === 0 ? 'K' : q < -4 ? 'O' : q > 6 ? 'B' : 'b'; }).join(''); }));
  const JAR = grid(Array.from({ length: 32 }, (_, j) => { const h = j < 3 ? 8 : j < 5 ? 6 : Math.round(7 + 6 * Math.sin(Math.PI * Math.min(1, (j - 4) / 30) ** .8)); return Array.from({ length: 28 }, (_, i) => { const q = i - 13.5; return Math.abs(q) > h ? '.' : j < 3 ? (q < 0 ? 'O' : 'b') : q < -h * .45 && q > -h * .75 ? 'O' : q > h * .4 ? 'B' : (j > 8 && j < 13 && Math.sin(i * 1.2 + j) > 0) ? 'n' : 'r'; }).join(''); }));
  const FISH = grid(['.....xxxx...x', '..xxaaaaaxxxx', '.xwaaaaaaaax.', 'xKaaaaaaaaxx.', '.xaaHHHHaaxxx', '..xxHHHHxx..x', '....xxxx.....']);
  [[70, 262, THINGS.float.grid], [196, 262, B1], [224, 262, B2], [318, 318, BELL], [360, 318, B1], [386, 318, THINGS.bowl.grid], [412, 318, B2], [632, 300, COIL], [706, 300, BELL], [490, 378, THINGS.sandal.grid], [528, 378, B2], [80, 430, COIL], [170, 430, BARREL], [270, 430, THINGS.sandal.grid], [395, 430, JAR], [640, 430, COIL], [700, 430, JAR],
   [930, 374, COIL], [1040, 318, BELL], [1322, 304, THINGS.float.grid], [1236, 304, COIL], [1372, 366, THINGS.bowl.grid], [1396, 366, B2], [1185, 430, COIL], [1384, 430, BARREL], [900, 430, JAR],
   [1588, 374, THINGS.bowl.grid], [1616, 374, B1], [1742, 322, B1], [1762, 322, B2], [1792, 322, THINGS.bowl.grid], [1822, 322, B1], [1846, 322, B2], [1545, 430, BARREL], [2022, 430, JAR], [2190, 372, B1], [2248, 372, COIL], [2325, 314, THINGS.float.grid], [2525, 300, COIL], [2600, 300, BELL], [2625, 300, B2], [2710, 366, B2], [2755, 366, THINGS.bowl.grid], [2150, 430, COIL], [2838, 430, BARREL], [2868, 430, BARREL]].forEach(([x, y, gr]) => lay(gr, x, y - 1));
  for (let i = 0; i < 6; i++) { const x = 22 + i * 12; r(x, ceil + 4, 1, 52 + (i % 3) * 9, P.ochre); put(g, i % 2 ? B2 : THINGS.float.grid, x, ceil + 66 + (i % 3) * 9); }   // floats, hung from the rafters
  // the workshop: nets and a half-mended boat
  for (let x = u(1215); x < u(1345); x++) { const q = (x - u(1215)) / u(130), sag = Math.round(26 + 12 * Math.sin(q * Math.PI)); for (let y = 0; y < sag; y++) if ((x + y) % 6 === 0 || (x - y + 900) % 6 === 0) { g.fillStyle = P.grey2; g.fillRect(x, ceil + 4 + y, 1, 1); } if (x % 13 === 0) r(x - 1, ceil + 3 + sag, 4, 3, P.ochre); }
  for (let i = 0; i < 3; i++) { const x = u(1030) + i * 18; r(x, ceil + 4, 2, 70, P.outline); r(x - 2, ceil + 30, 6, 4, P.grey1); r(x, ceil + 34, 2, 18 + (i % 2) * 8, i % 2 ? P.wood : P.grey2); }   // tools on the wall
  for (const [wx, y] of [[960, 96]]) { const x = u(wx); r(x - 12, y - 1, 26, 30, P.outline); r(x - 11, y, 24, 28, P.tan); for (let j = 0; j < 5; j++) r(x - 8, y + 4 + j * 5, 12 + (j * 5) % 7, 1, P.bark); r(x + 3, y + 10, 5, 5, P.red); }   // charts of the sea
  // the kitchen: a sunken hearth under a hanging kettle, fish drying, a mat
  const hx = u(1870); for (let i = 0; i < 5; i++) { const x = u(1690) + i * 22; r(x + 6, ceil + 4, 1, 34, P.ochre); for (let j = 0; j < FISH[0].length; j++) for (let k = 0; k < FISH.length; k++) { const c = FISH[k][j]; if (c) { g.fillStyle = c; g.fillRect(x + 3 + k, ceil + 38 + j, 1, 1); } } }
  r(hx - 30, floor - 8, 60, 9, P.outline); r(hx - 29, floor - 7, 58, 7, P.grey2); r(hx - 29, floor - 7, 58, 2, P.grey0); for (let x = -24; x < 24; x++) { g.fillStyle = hsh(x * 3.3) < .4 ? P.ember : hsh(x * 5.1) < .5 ? P.outline : P.rosewood; g.fillRect(hx + x, floor - 4 + Math.floor(hsh(x) * 2), 1, 3); }
  r(hx - 1, ceil, 3, floor - ceil - 52, P.outline); r(hx, ceil, 1, floor - ceil - 52, P.ochre); r(hx - 10, floor - 52, 21, 2, P.outline); for (let j = 0; j < 18; j++) { const h = Math.round(6 + 6 * Math.sin(Math.PI * (j + 3) / 24)); r(hx - h - 1, floor - 50 + j, h * 2 + 3, 1, P.outline); r(hx - h, floor - 50 + j, h * 2 + 1, 1, j < 2 ? P.grey2 : P.night); r(hx - h + 1, floor - 50 + j, 2, 1, P.grey3); }
  r(hx + 12, floor - 46, 6, 3, P.outline);
  for (let x = u(1905); x < u(1925) + 30; x++) for (let y = floor - 3; y < floor; y++) { g.fillStyle = y === floor - 3 ? P.outline : x % 5 < 2 ? P.ochre : P.tan; g.fillRect(x, y, 1, 1); }
  // the loft: a boat, half mended, up on trestles; nets over the beams
  for (let j = 0; j < 30; j++) { const x0 = u(2420) + Math.round(j * j * .03), x1 = u(2650) - Math.round((j / 30) ** 2 * 26); for (let x = x0; x < x1; x++) { const gone = hsh(Math.floor(x / 17) * 3.3 + Math.floor(j / 6) * 5.9) < .16 && j > 5; g.fillStyle = j === 0 || j === 29 || x === x0 || x === x1 - 1 || j % 6 === 0 ? P.outline : gone ? P.night : j < 5 ? P.ochre : x % 41 < 2 ? P.outline : dither(x & 255, j & 255) < j / 44 ? P.brown : P.wood; g.fillRect(x, floor - 46 + j, 1, 1); } }
  for (const wx of [2455, 2600]) { const x = u(wx); for (let j = 0; j < 18; j++) { r(x - 1 - j * .4, floor - 17 + j, 4, 1, P.outline); r(x + 10 + j * .4, floor - 17 + j, 4, 1, P.outline); r(x - j * .4, floor - 17 + j, 2, 1, P.bark); r(x + 11 + j * .4, floor - 17 + j, 2, 1, P.bark); } r(x - 6, floor - 20, 26, 5, P.outline); r(x - 5, floor - 19, 24, 3, P.bark); }
  for (let x = u(2660); x < u(2780); x++) { const q = (x - u(2660)) / u(120), sag = Math.round(14 + 12 * Math.sin(q * Math.PI)); for (let y = 0; y < sag; y++) if ((x + y) % 6 === 0 || (x - y + 900) % 6 === 0) { g.fillStyle = P.grey2; g.fillRect(x, ceil + 4 + y, 1, 1); } if (x % 13 === 0) r(x - 1, ceil + 3 + sag, 4, 3, P.ochre); }
  // the walls between, of stone, cut through: a tunnel along the floor of each, as high as Ichigo under the bucket
  rooms.forEach(({ wall }) => {
    const x0 = u(wall[0]), x1 = u(wall[1]), top = floor - TUNNEL;
    fill(g, x0, ceil, x1 - x0, floor - ceil, (x, y) => {
      if (y >= top) { const d = y - top, e = Math.min(x - x0, x1 - 1 - x); return d === 0 ? P.outline : dither(x & 255, y & 255) < .5 - e * .03 - d * .01 ? P.plum : dither(x & 255, y & 255) < .12 ? P.outline : P.night; }
      const row = Math.floor((y - ceil) / 14), w = 21 + Math.floor(hsh(row * 5.1) * 5), st = ((x - x0 + (row % 2) * 11 + Math.floor(hsh(row * 3.1) * 7)) % w + w) % w, a = (y - ceil) % 14, n = hsh(Math.floor((x - x0 + (row % 2) * 11) / w) * 3.7 + row * 9.1 + wall[0]);
      if (x === x0 || x === x1 - 1 || a === 0 || st === 0) return P.outline;
      if ((a < 2 || a > 12) && (st < 2 || st > w - 2)) return P.outline;                                  // (their corners are rounded)
      if (a < 3 || st < 2) return P.grey2;
      return a > 10 || st > w - 4 ? P.plum : dither(x & 255, y & 255) < .25 + n * .4 ? P.grey3 : P.slate;
    });
    r(x0, top - 9, x1 - x0, 10, P.outline); for (let x = x0 + 1; x < x1 - 1; x++) { r(x, top - 8, 1, 2, P.grey1); r(x, top - 6, 1, 4, hsh(Math.floor(x / 7) + wall[0]) < .3 ? P.grey3 : P.grey2); r(x, top - 2, 1, 2, P.plum); }   // one long stone over it
  });

  // --- the wreck, cut open: a hull lying on the rocks, its planks sprung; the light comes in between them
  const wk = L.rooms.find(q => q.name === 'hull'), w0 = u(wk.from), w1 = u(wk.to), wf = Yp(wk.floor), roof = x => wf - Math.round(112 + 34 * Math.abs((x - (w0 + w1) / 2) / ((w1 - w0) / 2)) ** 2.4);
  fill(g, w0 - 30, wf - 160, w1 - w0 + 60, 168, (x, y) => {
    const t = roof(x), lean = Math.round(Math.max(0, (wf - y)) * .2), l = w0 - lean, q = w1 + lean; if (x < l || x > q || y < t || y > wf + 5) return null;
    const d = y - t, strake = (d + Math.round(hsh(Math.floor(x / 63) * 2.1) * 2)) % 15, rib = ((x - w0) % 46 + 46) % 46, seam = (x + Math.floor(d / 15) * 37) % 91, n = hsh(Math.floor(x / 9) * 3.1 + Math.floor(d / 15) * 7.7);
    if (x === l || x === q || d === 0 || d === 10 || y === wf + 5) return P.outline;
    if (d < 10) return d < 3 ? P.bark : d < 7 ? P.wood : P.brown;                                       // the deck, over
    if (x - l < 9 || q - x < 9) return dither(x & 255, y & 255) < .4 ? P.brown : P.wood;               // stem and stern
    if (rib < 8) return rib === 0 || rib === 7 ? P.outline : rib < 3 ? P.ochre : rib < 5 ? P.wood : P.brown;
    if (strake === 0 || seam === 0) return P.outline;
    if (n < .05) return P.night;                                                                     // a hole
    return strake === 1 && dither(x & 255, y & 255) < .5 ? P.wood : dither(x & 255, y & 255) < .3 + d / 260 ? P.outline : n < .3 ? P.plum : P.brown;
  });
  for (const [wx, w] of wk.windows) { const { x, y, ww, h } = slitAt(wx, w); for (let j = 0; j < h; j++) for (let i = -2; i < ww + 2; i++) { const ed = Math.round(hsh(Math.floor(j / 4) * 3.7 + wx + (i < ww / 2 ? 0 : 9)) * 3), a = i < ww / 2 ? i - ed : ww - 1 - i - ed; g.fillStyle = a < -1 ? 'rgba(0,0,0,0)' : a < 0 ? P.outline : dither(i & 255, j) < .2 ? P.slate : P.navy; if (a >= -1) g.fillRect(x + i, y + j, 1, 1); } }
  { const mx = Math.round((w0 * .62 + w1 * .38)); for (let j = 0; j < 92; j++) { const x = mx + Math.round(j * .34); r(x - 1, roof(mx) - j, 9, 1, P.outline); r(x, roof(mx) - j, 7, 1, j % 19 < 2 ? P.outline : P.wood); r(x, roof(mx) - j, 2, 1, P.ochre); }   // its mast, broken off, a rag of sail
    for (let i = 0; i < 46; i++) { const h = 30 - Math.round(i * .35) + Math.round(hsh(Math.floor(i / 3) * 5.1) * 9); for (let j = 0; j < h; j++) { const x = mx + 30 - i, y = roof(mx) - 78 + j + Math.round(i * .3); g.fillStyle = j === 0 || j === h - 1 ? P.outline : dither(x & 255, y & 255) < i / 70 ? P.slate : P.grey2; g.fillRect(x, y, 1, 1); } }
    for (let i = 0; i < 60; i++) r(mx + 30 - i, roof(mx) - 79 + Math.round(i * .32), 1, 3, P.outline); }
  for (let x = w0 + 20; x < w1 - 10; x += 1) if (hsh(Math.floor(x / 5) * 3.7) < .24) r(x, wf - 1 - Math.floor(hsh(x * 2.3) * 3), 1, 3, hsh(x) < .5 ? P.pine : P.leaf);

  // --- the boathouse, cut open: posts, a thatched roof, nets and oars
  planks(g, hx0, hf - 116, hx1 - hx0, 116, [P.wood, P.brown, P.outline], true, 6);
  for (let y = hf - 116; y < hf; y++) for (let x = hx0; x < hx1; x++) if (dither((x + 2) & 255, (y + 1) & 255) < .34 + (y < hf - 80 ? .22 : 0)) { g.fillStyle = P.outline; g.fillRect(x, y, 1, 1); }
  for (let y = hf - 152; y < hf - 104; y++) { const q = (y - hf + 152) / 48, a = hx0 - 4 - Math.round(q * 16) + 10, b = hx1 + 4 + Math.round(q * 16) - 10; for (let x = a; x < b; x++) { const fr = hf - 108 + Math.round(hsh(Math.floor(x / 2) * 2.3) * 4); if (y > fr) continue; const lay_ = (y + Math.round(hsh(Math.floor(x / 3) * 1.7) * 4)) % 15; g.fillStyle = x === a || x === b - 1 || y === hf - 152 || y === fr ? P.outline : lay_ < 2 ? P.outline : lay_ < 6 && dither(x & 255, y & 255) < .5 ? P.brown : dither(x & 255, y & 255) < .3 ? P.slate : P.olive; g.fillRect(x, y, 1, 1); } }
  for (const [wx, w] of L.rooms.find(q => q.name === 'boat').windows) { const { x, y, ww, h } = holeAt(wx, w); fill(g, x - 3, y - 2, ww + 6, h + 4, (px_, py_) => { const q = Math.hypot((px_ - x - ww / 2) / (ww / 2 + 1), (py_ - y - h / 2) / (h / 2 + 1)) + (hsh(Math.floor(px_ / 2) * 3.1 + wx) - .5) * .3; return q < .8 ? (dither(px_ & 255, py_ & 255) < .25 ? P.slate : P.navy) : q < 1 ? P.outline : null; }); }   // holes in it
  r(hx0 - 2, hf - 158, hx1 - hx0 + 4, 8, P.outline); r(hx0, hf - 157, hx1 - hx0, 6, P.brown);
  for (const x of [hx0, hx0 + 150, hx1 - 8]) { r(x - 1, hf - 110, 10, 110, P.outline); r(x, hf - 110, 8, 110, P.wood); r(x, hf - 110, 2, 110, P.ochre); }
  for (let x = hx0; x < hx1; x++) for (let y = hf; y < hf + 9; y++) { g.fillStyle = y === hf || y === hf + 8 || (x - hx0) % 22 === 0 ? P.outline : y < hf + 3 ? P.ochre : P.wood; g.fillRect(x, y, 1, 1); }   // its floor
  for (let x = 0; x < 80; x++) { const sag = Math.round(22 + 10 * Math.sin(x / 80 * Math.PI)); for (let y = 0; y < sag; y++) if ((x + y) % 7 === 0 || (x - y + 700) % 7 === 0) { g.fillStyle = P.grey2; g.fillRect(hx0 + 30 + x, hf - 100 + y, 1, 1); } if (x % 14 === 0) r(hx0 + 29 + x, hf - 101 + sag, 4, 3, P.ochre); }   // a net
  for (const [x, t] of [[hx0 + 130, 1], [hx0 + 138, 0]]) { for (let i = 0; i < 80; i++) { r(x + i * .12 * (t ? 1 : -1) - 1, hf - 4 - i, 4, 1, P.outline); r(x + i * .12 * (t ? 1 : -1), hf - 4 - i, 2, 1, P.ochre); } }   // oars
  put(g, CRATE, hx0 + 108, hf); put(g, BELL, hx0 + 108, hf - 28); put(g, COIL, hx0 + 60, hf); put(g, THINGS.float.grid, hx0 + 252, hf - 96);
  const cx = u(L.chair); r(cx - 14, hf - 19, 28, 5, P.outline); r(cx - 13, hf - 18, 26, 3, P.wood); for (const x of [-12, 9]) { r(cx + x - 1, hf - 15, 5, 15, P.outline); r(cx + x, hf - 15, 3, 14, P.brown); } r(cx + 10, hf - 52, 6, 36, P.outline); r(cx + 11, hf - 51, 4, 34, P.wood);   // his chair
  const pr = u(L.rope) + 8; r(pr - 3, hf - 24, 8, 24, P.outline); r(pr - 2, hf - 23, 6, 23, P.wood); r(pr - 2, hf - 23, 2, 23, P.ochre);   // the post the raft's tied to

  // --- in front: what Ichigo can hide behind
  const f = front.getContext('2d');
  L.shelters.forEach(([a, b, kind], i) => {
    const x0 = u(a), x1 = u(b), mid = (a + b) / 2, yb = Yp(surfaceY(mid)) + 1;
    if (kind === 'crates3') { for (const ox of [0, 33]) put(f, CRATE, x0 + ox + 6, yb); put(f, CRATE, x0 + 22, yb - 28); }
    else if (kind === 'barrels') { put(f, BARREL, x0 + 12, yb); put(f, i % 2 ? JAR : BARREL, x1 - 12, yb); put(f, BARREL, (x0 + x1) / 2, yb + 1); }
    else if (kind === 'jars') { put(f, JAR, x0 + 12, yb); put(f, i % 2 ? BARREL : JAR, x1 - 12, yb); put(f, JAR, (x0 + x1) / 2, yb + 1); }
    else if (kind === 'crates') { for (const ox of [12, 44]) put(f, CRATE, x0 + ox, yb); put(f, i % 2 ? COIL : CRATE, x0 + 24, yb - 28); }
    else if (kind === 'wreck') {   // the ribs of a wreck
      for (let k = 0; k < 5; k++) { const x = x0 + 3 + k * 12; for (let j = 0; j < 40; j++) { const bx = Math.round(x + Math.sin(j * .06) * 8); f.fillStyle = P.outline; f.fillRect(bx - 1, yb - j, 7, 1); f.fillStyle = j % 9 === 0 ? P.brown : P.wood; f.fillRect(bx, yb - j, 5, 1); f.fillStyle = P.bark; f.fillRect(bx, yb - j, 1, 1); } }
      for (const j of [8, 20, 31]) for (let x = x0; x < x1 + 8; x++) { f.fillStyle = P.outline; f.fillRect(x, yb - j - 1, 1, 8); f.fillStyle = hsh(Math.floor(x / 7) + j) < .3 ? P.brown : P.wood; f.fillRect(x, yb - j, 1, 6); f.fillStyle = P.bark; f.fillRect(x, yb - j, 1, 1); }
    } else if (kind === 'net') {   // a rack of nets, drying
      for (const x of [x0, x1 - 4]) { f.fillStyle = P.outline; f.fillRect(x - 1, yb - 44, 6, 45); f.fillStyle = P.wood; f.fillRect(x, yb - 43, 4, 43); }
      for (let x = x0; x < x1; x++) { f.fillStyle = P.outline; f.fillRect(x, yb - 42, 1, 4); f.fillStyle = P.ochre; f.fillRect(x, yb - 41, 1, 2); for (let y = yb - 38; y < yb - 2; y++) { const m = (x + y) % 5 === 0 || (x - y + 500) % 5 === 0; f.fillStyle = m ? P.steel : dither(x & 255, y & 255) < .62 ? P.plum : P.night; f.fillRect(x, y, 1, 1); } }
    } else { boulder(f, x0 - 4, x1 + 4, yb + 2, 40 + (i % 3) * 3, i * 3.3); }
  });

  // a stack of rock standing in the sea, for the raft to go behind
  stack = mk(u(L.stacks[0][1] - L.stacks[0][0]) + 44);
  { const sw = stack.width, t0 = Yp(LIGHT.sea) - 78, top = x => { const q = (x - sw / 2) / (sw / 2 - 2); return Math.abs(q) > 1 ? 999 : t0 + Math.round(96 * Math.abs(q) ** 3.2 + 6 * Math.sin(q * 4) + 4 * Math.sin(x * .3)); };
    fill(stack.getContext('2d'), 0, t0 - 12, sw, Yp(LIGHT.sea) + 26 - t0, (x, y) => { const t = top(x), q = (x - sw / 2) / (sw / 2); if (y < t) return null; return y === t || top(x - 1) > y || top(x + 1) > y ? P.outline : q > .1 && dither(x & 255, y & 255) < (q - .1) * 1.2 ? P.plum : y - t < 4 ? P.pale : rockAt(x, y, Math.round(y - t0 + 8 + x * .2), 5); }); }

  // far stacks of rock, sliding by more slowly
  const q = far.getContext('2d'), sea = Yp(392);
  for (let x = 0; x < far.width; x++) {
    const k = Math.max(0, Math.sin(x * .011 + 1) * .7 + Math.sin(x * .029) * .4 + Math.sin(x * .0041 + 2) * .5), top = sea - Math.round(k * 46 + (k > .05 ? 2 * Math.sin(x * .09) : 0));
    for (let y = top; y < sea + 3; y++) { if (k < .06) break; q.fillStyle = y === top ? P.outline : y - top < 2 ? P.indigo : dither(x & 255, y & 255) < (y - top) / 50 ? P.night : P.outline; q.fillRect(x, y, 1, 1); }
  }
}

const ZS = [['mmmm', '..m.', '.m..', 'mmmm'], ['mmmmm', '...m.', '..m..', '.m...', 'mmmmm'], ['mmmmmmm', 'mmmmmmm', '....mm.', '...mm..', '..mm...', '.mm....', 'mmmmmmm', 'mmmmmmm']].map(rows => outline(rows.map(r => [...r].map(ch => (ch === '.' ? null : P.foam)))));
// ============================================================================
// Light
// ============================================================================
const lightBuf = pixelBuffer();
// A soft beam from (x0, y0) down to the band x1 ± half at row y1: dots, thicker toward its middle.
function shaft(buf, x0, y0, x1, y1, half, v, strong) {
  for (let y = Math.max(0, y0); y < Math.min(LH, y1); y++) {
    const t = (y - y0) / (y1 - y0), a = x0 + (x1 - half - x0) * t - 9 * (1 - t), b = x0 + (x1 + half - x0) * t + 9 * (1 - t), l = Math.max(0, Math.ceil(Math.min(a, b))), r = Math.min(LW, Math.floor(Math.max(a, b))), mid = (a + b) / 2, hw = Math.max(1, Math.abs(b - a) / 2);
    for (let x = l; x < r; x++) if (dither(x, y) < strong * (1 + .9 * (1 - t) ** 2) * (1.15 - Math.abs(x - mid) / hw)) buf[y * LW + x] = v;
  }
}
// Where the lamp is on the screen: it's far off, so it only slides by slowly.
const lampAt = () => [Math.round(436 - Math.max(0, S.camX - 2500) * .042), LAMP[1]];
const roofOver = r => Yp(r.floor) - (r.name === 'hull' ? 114 : 150);
function lights() {
  const B = lightBuf.begin(), buf = B.buf, L = S.level, b = beam(), out = ['away', 'paddle', 'gone'].includes(H.phase) || H.wet && H.phase === 'caught', red = H.phase === 'caught';
  const FOAM = pack(red ? P.gold : P.foam), SKY = pack(red ? P.ember : P.sky), indoors = H.x < L.room, [lx, ly] = lampAt(), fl = Yp(430);
  if ((b.on || red) && !indoors) {
    const bx = X(b.x), hw = Math.round(b.w / 2 / PIXEL), under = insideAt(b.x), gy = under ? roofOver(under) : out || b.x > L.raft ? Yp(LIGHT.sea) : Math.min(Yp(LIGHT.sea), Yp(surfaceY(Math.max(L.room + 40, b.x))));
    shaft(buf, lx, ly, bx, gy, hw, SKY, b.mode === 'hold' || red ? .36 : .28);
    if (!under) for (let y = gy - 64; y < gy + 14; y++) for (let x = Math.max(0, bx - hw - 10); x < Math.min(LW, bx + hw + 10); x++) { if (y < 0 || y >= LH) continue; const q = (x - bx) / (hw + 4), e = y > gy ? (y - gy) / 14 : (gy - y) / 64, d = q * q * q * q + e * e; if (d < 1 && dither(x, y) < .6 * (1 - d) ** .5) buf[y * LW + x] = FOAM; }   // where it falls
  }
  // indoors: the light coming in at each window, slanting down to the floor and sliding along it
  if (b.on || red) for (const r of L.rooms) {
    if (X(r.to) < -20 || X(r.from) > LW + 20 || (r.wall ? !indoors || insideAt(H.x) !== r : indoors)) continue;
    const pane = r.wall ? paneAt : r.name === 'hull' ? slitAt : holeAt, cam = Math.round(S.camX / PIXEL), foot = Yp(r.floor), xl = Math.max(0, X(r.from) + (r.wall ? 0 : 6)), xr = Math.min(LW, r.wall ? X(r.wall[0]) : X(r.to) - 6);
    for (const w of r.windows) {
      if (!patch(r, w, b.x, r.floor)) continue;
      const p = pane(...w), away = Math.abs(b.x - w[0]) / r.reach, soft = Math.min(1, (1 - away) * 5);
      for (let y = p.y; y < p.y + p.h; y++) for (let x = p.x - cam; x < p.x - cam + p.ww; x++) if (x >= 0 && x < LW && dither(x, y) < .85 * soft && (r.name !== 'boat' || Math.hypot((x - p.x + cam - p.ww / 2) / (p.ww / 2), (y - p.y - p.h / 2) / (p.h / 2)) + (hsh(Math.floor((x + cam) / 2) * 3.1 + w[0]) - .5) * .3 < .8)) buf[y * LW + x] = FOAM;
      for (let y = p.y + (p.h >> 1); y < foot + 7; y++) {
        const q = patch(r, w, b.x, (y - TOP_PX) * PIXEL), c = (q.x - S.camX) / PIXEL, h = q.half / PIXEL, floorK = Math.max(0, 1 - Math.abs(y - foot) / 34);
        for (let x = Math.max(xl, Math.floor(c - h)); x < Math.min(xr, c + h); x++) { const e = Math.min(1, (h - Math.abs(x - c)) / 7); if (dither(x, y) < (.2 + .42 * floorK) * soft * e) buf[y * LW + x] = floorK > .25 ? FOAM : SKY; }
      }
    }
  }
  if (indoors) { const hx = X(1870), hy = fl - 8, R = 74; for (let y = -R; y <= R * .4; y++) for (let x = -R; x <= R; x++) { const q = Math.hypot(x, y * 1.2) / R, px = hx + x, py = hy + y; if (q < 1 && px >= 0 && px < LW && py >= 0 && py < LH && dither(px, py) < (1 - q) * (.3 + .03 * Math.sin(S.T * 7))) buf[py * LW + px] = pack(P.dawn); } }   // firelight
  B.draw(lg);
}
// The lamp: an eye. It looks where its beam falls, narrows to look hard at something, and shuts between sweeps.
function eye() {
  const b = beam(), [x, y] = lampAt(), red = H.phase === 'caught', r = red ? 19 : 16;
  const lid = red ? 0 : b.lid, squint = b.mode === 'hold' && !red ? .2 : 0, dx = Math.round(Math.max(-7, Math.min(7, (X(b.x) - x) / 60)));
  const lg2 = lid * (r * 2 + 1) * .78, up = -r + lg2 + squint * r, dn = r - lid * r * .4 - squint * r;
  for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) {
    const d = Math.hypot(i, j); if (d > r + .3) continue;
    const pd = Math.hypot(i - dx, j - 2), bend = (i * i) / (r * 2.6) * (lid > .05 || squint ? 1 : 0), shut = j < up + bend || j > dn - bend;
    lg.fillStyle = d > r - 1 ? P.outline : shut ? (Math.abs(j - up - bend) < 2 || Math.abs(j - dn + bend) < 1.5 ? P.outline : P.rosewood) : pd < 3 ? P.outline : pd < 7.4 ? (red ? (pd < 5 ? P.rust : P.ember) : pd < 5 ? P.ochre : P.gold) : d > r - 3 ? P.sky : P.white;
    lg.fillRect(x + i, y + j, 1, 1);
  }
  if (lid < .5) for (let k = 0; k < 10; k++) { const a = k * Math.PI / 5 + S.T * .4, n = (red ? 9 : 5) + Math.round(Math.sin(S.T * 5 + k) * 2); for (let i = 0; i < n; i++) { lg.fillStyle = red ? P.gold : P.foam; lg.fillRect(Math.round(x + Math.cos(a) * (r + 3 + i)), Math.round(y + Math.sin(a) * (r + 3 + i)), 1, 1); } }
}

// ============================================================================
// Ichigo, the bucket, and the rest
// ============================================================================
// Hiding: crouched down, the bucket over their head, eyes looking out from under its rim.
const HID = grid(['........hhhh........', '.......YYYYYY.......', '.....YYYYYYYYYY.....', '....YYwYYYYYYYYy....', '....YYwYYYYYYYYy....', '...YYwYYYYYYYYYYy...', '...YYwYYYYYYYYYYy...', '...YYwYYYYYYYYYYy...', '..YYwYYYYYYYYYYYYy..', '..YYwYYYYYYYYYYYYy..', '..YYYYYYYYYYYYYYYy..', '.yyyyyyyyyyyyyyyyyy.', '.yyyyyyyyyyyyyyyyyy.', '...kkkkkkkkkkkkkk...', '...kSSwkSSSSwkSSk...', '....jJJJJJJJJJJj....', '...jJJJJJJJJJJJJj...', '...jJJJJJJJJJJJJj...', '....jjjjjjjjjjjj....']);
const FEET = grid(['SS....SS', 'bb....bb'], true);
function ichigo(ix, feet, sitting) {
  const step = Math.floor(H.anim / 1.6) % 2, running = Math.abs(H.v) > 220;
  if (H.hide) { const low = !!tunnelAt(H.x), b = H.shuffling && step && !low ? 1 : 0;   // (no room to bob in a tunnel)
    if (H.shuffling) put(lg, FEET, ix + (step ? 1 : -1), feet); put(lg, HID, ix, feet - (H.shuffling && !low ? 2 : 0) - b + 1, H.face < 0); return; }
  const frame = sitting ? 'sit' : !H.on ? 'balance' : H.digging > 0 ? 'dig1' : H.moving ? ['stand', 'step1', 'stand', 'step2'][Math.floor(H.anim / 1.6) % 4] : 'stand';
  const hair = !H.on ? [1, H.vy > 120 ? 2 : 0] : H.moving ? [(running ? 1 : 0) + step, step] : [0, 0];
  drawSprite(lg, frame, ix, feet, H.face, Math.min(5, S.deaths), hair, [...markIds(), H.sulk > 0 || H.phase === 'caught' ? 'pout' : null].filter(Boolean));
}
const TALL = grid(['..bb..', '..OO..', '..ee..', '.eeee.', '.eWee.', 'eeWeee', 'eeWeee', 'eeeeee', 'eeeeee', 'eeeeee', 'eeeeee', '.eeee.']);
const CAT = { asleep: grid(['..........O...O..', '..OOOOOOO.OOOOO..', '.OOTOOTOOOOOOOOO.', 'OOTOOTOOOOOkOOkO.', 'OOOOOOOOOOOOpOOO.', 'OTTTOOOOOOOOOOO..', '.OOOTTTTTTTOOOO..', '..OOOOOOOOOOOO...']), up: grid(['...............O..O', '...............OOOO', 'O.............OkOOkO', 'O..OOOOOOOOOOOOOOpOO', 'OO.OTOOTOOTOOOOOOOO.', '.OOOTOOTOOTOOOOOOO..', '..OOOOOOOOOOOOOO....', '...OOTTTTTTTOOO.....', '...O.O......O.O.....', '...O.O......O.O.....', '...O.O......O.O.....']) };
const GULL = { asleep: grid(['....hhhhh....', '..hhWWWWWhh..', '.hWWWWWWWWWh.', 'hWWWHHHHWWWWH', '.HHHHHHHHHHH.', '...o....o....']), up: grid(['.....WWW......', '....WWkWoo....', '....WWWW......', '.hhWWWWWW.....', 'HHHhWWWWW.....', '..HHhWWW......', '....o.o.......']) };
const FLY = [grid(['H...........H', '.HW.......WH.', '..WWW.W.WWW..', '....WWWWW....', '......WkWoo..']), grid(['.....W.W.....', '....WWWWW....', '..WWWWWkWoo..', 'HWW......WWH.'])];
// The cords, and the bells they ring: a post with a cord to pull, and a line running back to a bell on its own post.
function bells() {
  const post = (x, y) => { lg.fillStyle = P.outline; lg.fillRect(x - 3, y - 64, 7, 65); lg.fillStyle = P.wood; lg.fillRect(x - 2, y - 63, 5, 63); lg.fillStyle = P.ochre; lg.fillRect(x - 2, y - 63, 1, 63); };
  for (const c of H.cords) {
    const x0 = X(c.bell), x1 = X(c.x), y0 = Yp(groundY(c.bell)), y1 = Yp(groundY(c.x)); if (x1 < -30 || x0 > LW + 30) continue;
    post(x0, y0); post(x1, y1);
    for (let x = x0; x < x1; x++) { const q = (x - x0) / (x1 - x0), y = Math.round(y0 - 62 + (y1 - y0) * q + Math.sin(q * Math.PI) * 12); lg.fillStyle = P.outline; lg.fillRect(x, y, 1, 2); if (x % 3) { lg.fillStyle = P.ochre; lg.fillRect(x, y, 1, 1); } }
    const pull = c.swing > .93 ? 5 : 0; lg.fillStyle = P.outline; lg.fillRect(x1 + 5, y1 - 62, 3, 32 + pull); lg.fillStyle = P.gold; lg.fillRect(x1 + 6, y1 - 62, 1, 31 + pull); lg.fillStyle = P.outline; lg.fillRect(x1 + 3, y1 - 32 + pull, 7, 7); lg.fillStyle = P.red; lg.fillRect(x1 + 4, y1 - 31 + pull, 5, 5);   // the cord, a red knob on its end
    lg.fillStyle = P.outline; lg.fillRect(x0 - 14, y0 - 62, 24, 5); lg.fillStyle = P.wood; lg.fillRect(x0 - 13, y0 - 61, 22, 3);
    const sw = Math.round(Math.sin(S.T * 16) * 5 * c.swing);
    BELLG.forEach((row, r) => row.forEach((q, i) => { if (q) { lg.fillStyle = q; lg.fillRect(x0 - 16 + i + Math.round(sw * (.4 + r * .08)), y0 - 56 + r, 1, 1); } }));
  }
}
// The shutters: a cord hanging by the window; pulled, slats come down over it.
function shutters() {
  for (const q of S.level.shutters) {
    const x = X(q.x), down = bolted(q.window), fl = Yp(430); if (x < -80 || x > LW + 80) continue;
    const win = S.level.rooms.flatMap(r => r.windows).find(w => w[0] === q.window), p = paneAt(...win), px0 = p.x - Math.round(S.camX / PIXEL), h = down ? p.h : 7;
    lg.fillStyle = P.outline; lg.fillRect(px0 - 2, p.y - 2, p.ww + 4, h + 2); for (let j = 0; j < h - 1; j++) { lg.fillStyle = j % 5 === 4 ? P.outline : j % 5 === 0 ? P.tan : P.ochre; lg.fillRect(px0 - 1, p.y - 1 + j, p.ww + 2, 1); }
    const top = p.y - 4, end = fl - (down ? 44 : 52); lg.fillStyle = P.outline; lg.fillRect(Math.min(px0, x), top - 1, Math.abs(x - px0), 3); lg.fillRect(x - 1, top, 3, end - top); lg.fillStyle = P.gold; lg.fillRect(Math.min(px0, x), top, Math.abs(x - px0), 1); lg.fillRect(x, top, 1, end - top);
    lg.fillStyle = P.outline; lg.fillRect(x - 3, end - 1, 7, 7); lg.fillStyle = down ? P.grey2 : P.red; lg.fillRect(x - 2, end, 5, 5);
  }
}
const BELLG = grid(['....oo....', '...oooo...', '..oWoooO..', '..oWoooO..', '.ooWooooO.', '.oooooooO.', 'OOOOOOOOOO', '....BB....']);
function raft(x, y, bob) {
  for (let i = -34; i <= 34; i++) for (let j = 0; j < 9; j++) { const e = j === 0 || j === 8 || Math.abs(i) === 34, n = hsh(Math.floor(i / 5) * 2.7 + Math.floor(j / 3) * 7.1); lg.fillStyle = e || j === 4 ? P.outline : j < 4 ? (n < .25 ? P.wood : P.tan) : n < .3 ? P.brown : P.wood; lg.fillRect(x + i, y + bob - 4 + j, 1, 1); }
  for (const i of [-22, 22]) { lg.fillStyle = P.outline; lg.fillRect(x + i - 2, y + bob - 5, 6, 11); lg.fillStyle = P.gold; lg.fillRect(x + i - 1, y + bob - 4, 4, 9); }
  for (let j = 0; j < 46; j++) { lg.fillStyle = P.outline; lg.fillRect(x - 29, y + bob - 4 - j, 3, 1); lg.fillStyle = P.wood; lg.fillRect(x - 28, y + bob - 4 - j, 1, 1); if (j > 14 && j < 44) { const w = 16 + Math.round(5 * Math.sin((j - 14) / 30 * Math.PI)); for (let i = 0; i < w; i++) { lg.fillStyle = clothAt(i, 44 - j, j === 15 || j === 43 || i === w - 1); lg.fillRect(x - 26 + i, y + bob - 4 - j, 1, 1); } } }
  const row = H.paddling ? Math.sin(S.T * 8) * 5 : 0;
  for (let i = 0; i < 30; i++) { const px = x + 22 + Math.round(i * .4 + row * (i / 30 - .6)); lg.fillStyle = P.outline; lg.fillRect(px - 1, y + bob + 6 - i, 4, 1); lg.fillStyle = P.ochre; lg.fillRect(px, y + bob + 6 - i, 2, 1); }
}
// How hidden Ichigo is: an eye over their head. Shut: not seen. Open, and filling with red: being seen.
const EYE = ['...KKKKK...', '.KKwwwwwKK.', 'KwwwwKwwwwK', 'KwwwKKKwwwK', 'KwwwwKwwwwK', '.KKwwwwwKK.', '...KKKKK...'], SHUT = ['...........', '...........', 'K.........K', '.KK.....KK.', '..KKKKKKK..', '.K..K.K..K.', '...........'];
function seenEye(x, y) {
  const show = H.seen > 0 || H.danger; if (!show || !['play', 'paddle'].includes(H.phase)) return;
  const open = H.seen > 0, rows = open ? EYE : SHUT, cut = rows.length - Math.round(rows.length * H.seen);
  rows.forEach((r, j) => [...r].forEach((ch, i) => { if (ch === '.') return; for (let q = 0; q < 2; q++) for (let p = 0; p < 2; p++) { lg.fillStyle = ch === 'K' ? (open ? P.outline : P.mist) : j >= cut ? P.ember : P.white; lg.fillRect(x - 11 + i * 2 + q, y - 14 + j * 2 + p, 1, 1); } }));
}
const MARKER = ['KKKKKKK', 'KWWWWWK', '.KWWWK.', '..KWK..', '...K...'];
function marker(x, y) { MARKER.forEach((r, j) => [...r].forEach((ch, i) => { if (ch !== '.') { lg.fillStyle = ch === 'K' ? P.outline : P.white; lg.fillRect(x - 3 + i, y + j, 1, 1); } })); }
function rings() {   // a noise, spreading
  for (const r of H.rings) { const R = Math.round(r.r * r.t / .8 / PIXEL * .6), cx = X(r.x), cy = Yp(r.y); for (let a = 0; a < 90; a++) { const t = a / 90 * Math.PI * 2; if ((a + Math.floor(R / 3)) % 3 === 0) continue; lg.fillStyle = r.t < .45 ? P.mist : P.steel; lg.fillRect(Math.round(cx + Math.cos(t) * R), Math.round(cy + Math.sin(t) * R * .7), 2, 1); } }
}
function moon(B) { const d = (cx, cy, r, c) => { for (let j = -r; j <= r; j++) { const h = Math.round(Math.sqrt(r * r + r * .6 - j * j) || 0); B.rect(cx - h, cy + j, h * 2 + 1, 1, c); } }; const x = 470 - Math.round(S.camX * .02); d(x, 92, 15, P.foam); d(x + 7, 88, 13, P.outline); }

// ============================================================================
export function drawLight() {
  const L = S.level;
  if (!strip || strip.level !== L) { paint(); strip.level = L; }
  beginWorld(); drawScenery(lg, S.camX * .4, S.T, L.fuji, { sky: 'night', behind: moon });
  pixelSpace(lg);
  const cam = Math.round(S.camX / PIXEL), gx = x => Yp(surfaceY(x)), ended = S.scene === 'end', cover = S.scene === 'dawn' && S.sceneT < 1.45;
  lg.drawImage(far, -Math.round(cam * .35), 0);
  if (H.x > L.room) { const [tx] = lampAt(); lg.drawImage(tower, tx - LAMP[0], 0); eye(); }
  lg.drawImage(strip, -cam, 0);
  if (H.x > L.room) bells(); else shutters();
  for (const g of H.sleepers) {
    const x = X(g.x); if (x < -60 || x > LW + 400) continue;
    if (g.kind === 'bottle') { const y = Yp(shelfUnder(g.x)); if (!g.away) put(lg, TALL, x, y - 1); else if (g.t < .42) put(lg, TALL, x + Math.round(g.t * 14), y + Math.round(g.t * g.t * 480)); else if (g.t < 1.2) { lg.fillStyle = P.aqua; for (let i = 0; i < 7; i++) lg.fillRect(x - 8 + i * 4 + (i % 2) * 2, Yp(430) - 2 - (i % 3), 2, 1); } continue; }
    const y = gx(g.x);
    if (g.kind === 'cat') { const aw = g.away > 0, br = Math.round(Math.sin(S.T * 1.8) * .7); if (!aw) { put(lg, CAT.asleep, x, y + 1 - br + br); } else put(lg, CAT.up, x, y + 1); if (!aw && Math.sin(S.T * .9) > .2) put(lg, ZS[0], x + 10 + Math.round(Math.sin(S.T) * 2), y - 14); continue; }
    if (g.away <= 0) put(lg, GULL.asleep, x, y + 1); else { const t = LIGHT.gull.back - g.away; if (t < 4) put(lg, FLY[Math.floor(S.T * 9) % 2], x + t * 90, y - 14 - t * 70); else if (g.away < 1.2) put(lg, GULL.up, x, y + 1); }
  }
  if (place() === 'room') { const hx = X(1870), fl = Yp(430); for (let i = 0; i < 16; i++) { const t = (S.T * (.9 + hsh(i)) + hsh(i * 3.1)) % 1, w = Math.round((1 - t) * 4); lg.fillStyle = t < .35 ? P.gold : t < .7 ? P.ember : P.rosewood; lg.fillRect(hx - 18 + Math.round(hsh(i * 5.7) * 36 + Math.sin(S.T * 4 + i) * 1.5), fl - 7 - Math.round(t * 22 * (.4 + hsh(i * 7.7))), w, 2); } }   // the kitchen fire
  if (!H.chime) { const x = X(L.chime), y = Yp(300); put(lg, THINGS.chime.grid, x + Math.round(Math.sin(S.T * 1.7)), y - 2); if (Math.sin(S.T * 4) > 0) { lg.fillStyle = P.white; lg.fillRect(x + 5, y - 18, 5, 1); lg.fillRect(x + 7, y - 20, 1, 5); } }

  const water = ['away', 'paddle', 'gone'].includes(H.phase) || (H.phase === 'caught' && H.wet), bob = Math.round(Math.sin(S.T * 1.4) * 1.2), afloat = H.raftX > L.raft + 80, ry = afloat ? Yp(LIGHT.sea) + 2 : Math.min(Yp(LIGHT.sea) + 2, Yp(groundY(H.raftX)) - 4);
  const ix = X(H.x) + (water ? 8 : 0), sitting = H.seated || ended, feet = water ? ry - 6 + (afloat ? bob : 0) : Yp(H.y);
  if (!water && !afloat) raft(X(H.raftX), ry, 0);
  if (!water && H.cuts < LIGHT.cuts) { const x0 = X(L.rope) + 8, x1 = X(H.raftX) - 20; for (let x = x0; x < x1; x++) { const q = (x - x0) / (x1 - x0), y = Math.round(Yp(424) - 16 + q * 10 + Math.sin(q * Math.PI) * 5); lg.fillStyle = P.outline; lg.fillRect(x, y - 1, 1, 4); lg.fillStyle = x % 4 < 2 ? P.gold : P.ochre; lg.fillRect(x, y, 1, 2); if (Math.abs(x - (x0 + x1) / 2) < 3 && H.cuts) { lg.fillStyle = P.night; lg.fillRect(x, y, 1, H.cuts > 1 ? 2 : 1); } } }
  if (!cover && !water && H.phase !== 'fell') ichigo(ix, feet, sitting);
  lg.drawImage(front, -cam, 0);
  lights();
  drawChartSea(lg, S.camX, S.T, seaAt, 0, LW, false, 'night');
  if (water || afloat) { raft(X(H.raftX), ry, bob); if (!ended || H.raftX < L.length) ichigo(ix, feet, true); }
  for (const [a] of L.stacks) { const x = X(a) - 22; if (x < LW && x > -stack.width) for (let i = 0; i < stack.width; i++) {   // (its foot is under the water: the swell washes round it)
    const y = Math.round(Yp(LIGHT.sea) + 3 + 7 * Math.sin(i / stack.width * Math.PI) ** .6 + Math.sin(i * .12 - S.T * 1.5) * 1.6), wash = Math.sin(i * .21 + S.T * 1.9) * 1.2 + 3;
    lg.drawImage(stack, i, 0, 1, y, x + i, 0, 1, y); if (i < 4 || i > stack.width - 5) continue;
    lg.fillStyle = P.outline; lg.fillRect(x + i, y - 1, 1, 1); lg.fillStyle = P.foam; lg.fillRect(x + i, y, 1, Math.round(wash)); lg.fillStyle = P.mist; lg.fillRect(x + i, y + Math.round(wash), 1, 1);
  } }
  rings();
  for (const q of parts) if (q.life > .05) { const n = toPx(2 * (q.s || 1)); lg.fillStyle = q.c; lg.fillRect(X(q.x), Math.round(q.y / PIXEL + TOP_PX), n, n); }

  const head = feet - (H.hide ? 20 : sitting || water ? 34 : spriteHeight());
  if (S.scene === 'light') {
    seenEye(ix, head - 8);
    const act = action(); if (act && !H.hide) marker(X(act.x) + (act.do === 'cord' ? 6 : 0), Math.round(Math.min(gx(act.x) - 52, head - 10) + Math.sin(S.T * 5) * 1.5));
  }
  if (H.fade > 0) dots(P.night, H.fade);
  if (H.phase === 'caught') dots(P.white, H.t < .2 ? .5 - H.t * 2.5 : Math.max(0, (H.t - .7) / .8));   // (a flash; then the light fills everything)
  if (S.scene === 'dawn') drawDawn(lg, S.sceneT, S.deaths - 1);
  if (S.scene === 'dawn' && S.sceneT >= 1.45 && !water) ichigo(ix, feet, false);
  if (!ended && !(S.scene === 'dawn' && S.sceneT > .3 && S.sceneT < 1.5)) drawHUD(Math.min(1, (water ? H.raftX : H.x) / L.length));
  if (H.hint && H.hintT > 0 && S.scene === 'light') {
    const lines = ['']; for (const word of H.hint.split(' ')) { const c = lines[lines.length - 1]; if (c && (c + ' ' + word).length > 34) lines.push(word); else lines[lines.length - 1] = c ? c + ' ' + word : word; }
    const w = Math.max(...lines.map(l => l.length)) * LETTER + 16, h = lines.length * LINE + 12, x = Math.round((LW - w) / 2), y = water ? 64 : 350 - h;   // (low down, out of the way; high up, out on the water)
    lg.fillStyle = P.mist; lg.fillRect(x - 1, y - 1, w + 2, h + 2); lg.fillStyle = P.night; lg.fillRect(x, y, w, h);
    lines.forEach((l, i) => pixelText(l, LW / 2, y + 7 + i * LINE, P.mist, 'center'));
  }
  if (ended) drawEndFg(S.sceneT);
}
// The whole screen in dots of a colour: k of them, 0..1 (a fade, or a flash).
const tile = document.createElement('canvas'); tile.width = tile.height = 4;
function dots(col, k) {
  const t = tile.getContext('2d'); t.clearRect(0, 0, 4, 4); t.fillStyle = col;
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) if (dither(x, y) < k) t.fillRect(x, y, 1, 1);
  lg.fillStyle = lg.createPattern(tile, 'repeat'); lg.fillRect(0, 0, LW, LH);
}
