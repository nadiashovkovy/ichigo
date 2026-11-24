// ============================================================================
// greatwave.js — Hokusai's "The Great Wave off Kanagawa", drawn by hand in pixels, in code: no image.
//
// Places are written in "print units", as measured off the print with a ruler (1280 wide, 860 tall),
// and turned into pixels by X() and Y(). The print is squarer than the screen, so it's pressed a little
// flatter, and loses a strip of sky at the top and of water at the bottom. Line widths, claws, dots and
// little figures are in pixels.
//
// It's painted back to front, as flat shapes of the palette's colours with an ink line round them. The
// foam is made of fingers (finger) that end in a hook, and of little hooks (curls), as Hokusai's is.
// paintWave(phase) paints the whole picture at one moment of a loop (phase 0 to 1): the claws grasp, the
// boats ride up and down, the water slides. waveLoop plays the moments one after another (the title card, title.js).
// paintWaveAlone(phase) paints just the wave, for the beach.
// ============================================================================
import { LW, LH, P } from './config.js';
import { pack, dither } from './pixel.js';

let SQ = .448, skyline = 38;   // how tall a print unit is, in pixels; the print row at the top of the screen (paintWaveAlone changes them)
const X = x => x * .5, Y = y => (y - skyline) * SQ;
const TAU = Math.PI * 2;
// Scattered numbers from 0 to 1: always the same one for the same n.
const rnd = n => { const s = Math.sin(n * 127.1 + 11.7) * 43758.5453; return s - Math.floor(s); };

// The colours of each material, light to dark.
const INK = P.outline, DARK = P.navy, BLUE = P.deep, PALE = P.pale, FOAM = P.foam, WHITE = P.white;

let buf = null, w0 = 0;   // the picture being painted; how far round the loop it is (0 to 2π)
const N = LW * LH;
const IS_FOAM = new Set([FOAM, WHITE, PALE].map(pack));

// ---------------------------------------------------------------------------
// Brushes (in pixels)
// ---------------------------------------------------------------------------
const dot = (x, y, c) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && x < LW && y >= 0 && y < LH) buf[y * LW + x] = pack(c); };
const at = (x, y) => (x >= 0 && x < LW && y >= 0 && y < LH ? buf[y * LW + x] : 0);

// A smooth curve through the points (in print units): a list of points in pixels, less than one apart.
function curve(pts, closed = false) {
  const p = pts.map(([x, y]) => [X(x), Y(y)]), n = p.length, out = [];
  const get = i => (closed ? p[(i + n) % n] : p[Math.max(0, Math.min(n - 1, i))]);
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const [a, b, c, d] = [get(i - 1), get(i), get(i + 1), get(i + 2)];
    const steps = Math.max(2, Math.ceil(Math.hypot(c[0] - b[0], c[1] - b[1]) * 1.3));
    for (let s = 0; s < steps; s++) {
      const t = s / steps, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map(k => .5 * (2 * b[k] + (c[k] - a[k]) * t + (2 * a[k] - 5 * b[k] + 4 * c[k] - d[k]) * t2 + (3 * b[k] - a[k] - 3 * c[k] + d[k]) * t3)));
    }
  }
  if (!closed) out.push(p[n - 1]);
  return out;
}
// Fill a shape (pixel points, in order round its edge) with a colour, or with colour(x, y).
function fillShape(pts, c) {
  let lo = 1e9, hi = -1e9;
  for (const [, y] of pts) { lo = Math.min(lo, y); hi = Math.max(hi, y); }
  lo = Math.max(0, Math.floor(lo)); hi = Math.min(LH - 1, Math.ceil(hi));
  if (hi < lo) return;
  const fn = typeof c === 'function', v = fn ? 0 : pack(c), rows = Array.from({ length: hi - lo + 1 }, () => []);
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {   // where each edge crosses the middle of each row
    const [ax, ay] = pts[j], [bx, by] = pts[i], y0 = Math.max(lo, Math.ceil(Math.min(ay, by) - .5)), y1 = Math.min(hi, Math.ceil(Math.max(ay, by) - .5) - 1);
    for (let y = y0; y <= y1; y++) rows[y - lo].push(ax + (y + .5 - ay) / (by - ay) * (bx - ax));
  }
  for (let y = lo; y <= hi; y++) {
    const xs = rows[y - lo].sort((p, q) => p - q);
    for (let i = 0; i + 1 < xs.length; i += 2) {
      const a = Math.max(0, Math.ceil(xs[i] - .5)), b = Math.min(LW, Math.ceil(xs[i + 1] - .5));
      if (!fn) buf.fill(v, y * LW + a, Math.max(y * LW + a, y * LW + b));
      else for (let x = a; x < b; x++) { const k = c(x, y); if (k) buf[y * LW + x] = pack(k); }
    }
  }
}
const fill = (pts, c) => fillShape(curve(pts, true), c);                  // round-edged
const sharp = (pts, c) => fillShape(pts.map(([x, y]) => [X(x), Y(y)]), c); // straight-edged
// A patch of pale blue in the foam, its edge broken up into dots (like the print's wiped colour).
function patch(pts) {
  const cx = pts.reduce((a, p) => a + p[0], 0) / pts.length, cy = pts.reduce((a, p) => a + p[1], 0) / pts.length, scaled = k => pts.map(([x, y]) => [cx + (x - cx) * k, cy + (y - cy) * k]);
  fill(scaled(1.06), (x, y) => ((x + y) % 2 && IS_FOAM.has(at(x, y)) ? PALE : null));
  fill(scaled(.86), PALE);
}
// A line one pixel wide, with no doubled-up corners.
function trace(pts, c) {
  const path = [];
  for (let i = 0; i + 1 < pts.length; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
    for (let s = 0; s <= n; s++) {
      const q = [Math.round(x0 + (x1 - x0) * s / n), Math.round(y0 + (y1 - y0) * s / n)], l = path[path.length - 1];
      if (!l || l[0] !== q[0] || l[1] !== q[1]) path.push(q);
    }
  }
  for (let i = 1; i < path.length - 1; i++) {
    const [a, b, d] = [path[i - 1], path[i], path[i + 1]];
    if ((a[0] === b[0] || a[1] === b[1]) && (d[0] === b[0] || d[1] === b[1]) && a[0] !== d[0] && a[1] !== d[1]) path.splice(i, 1);
  }
  for (const [x, y] of path) dot(x, y, c);
}
const line = (pts, c = INK) => trace(curve(pts), c);
const rule = (x0, y0, x1, y1, c = INK) => trace([[X(x0), Y(y0)], [X(x1), Y(y1)]], c);   // a straight one
// A brush stroke that swells to w pixels and tapers at both ends (or, with from, is full at its start).
// only: the colours it may cover (it stays inside them).
function stroke(pts, w, c, { full = 0, only = null } = {}) {
  const p = curve(pts), n = p.length, v = pack(c);
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1), r = Math.max(.5, w / 2 * (full ? Math.min(1, (1 - t) * 1.8) : Math.pow(Math.sin(Math.PI * (.04 + t * .94)), .7)));
    for (let y = Math.floor(p[i][1] - r); y <= p[i][1] + r; y++) for (let x = Math.floor(p[i][0] - r); x <= p[i][0] + r; x++)
      if (x >= 0 && x < LW && y >= 0 && y < LH && (x + .5 - p[i][0]) ** 2 + (y + .5 - p[i][1]) ** 2 <= r * r && (!only || only.has(buf[y * LW + x]))) buf[y * LW + x] = v;
  }
}
// A picture made of letters, centred on x, y (pixels).
function stamp(rows, x, y, key, flip = false) {
  x = Math.round(x) - (rows[0].length >> 1); y = Math.round(y) - (rows.length >> 1);
  rows.forEach((r, j) => { for (let i = 0; i < r.length; i++) { const c = key[r[flip ? r.length - 1 - i : i]]; if (c) dot(x + i, y + j, c); } });
}

// ---------------------------------------------------------------------------
// Foam
// ---------------------------------------------------------------------------
// Fingers of foam, a whole group at a time. Each: [x, y, the way it sets out, the way its tip points
// (degrees: 0 right, 90 down, 180 left, 270 up), length, width]. Each is white, with an ink line round its
// outer edge, its tip and part of its inner edge (its root is open, and melts into the foam), and pale blue
// in the crook of the hook. They grasp: the tips open and close, each a little after the last.
function fingers(list, { grasp = 14, shade = true } = {}) {
  const bent = list.map(([fx, fy, a0, a1, len, w], k) => {
    const move = Math.sin(w0 - fx * .012 - fy * .02 + k * .25), turn = a1 + move * grasp - a0, side = turn > 0 ? 1 : -1;
    const n = Math.ceil(len * 2), mid = [], out = [], inn = [];
    let x = X(fx), y = Y(fy);
    for (let i = 0; i <= n; i++) {
      const t = i / n, a = (a0 + move * 3 + turn * t * t) * Math.PI / 180, r = Math.max(.5, w / 2 * (1 - Math.pow(t, 1.4) * .85));
      const nx = -Math.sin(a) * side, ny = Math.cos(a) * side;   // (toward the inside of the bend)
      mid.push([x, y, r]); out.push([x - nx * (r + .4), y - ny * (r + .4)]); inn.push([x + nx * (r + .4), y + ny * (r + .4)]);
      x += Math.cos(a) * len / n; y += Math.sin(a) * len / n;
    }
    return { mid, out, inn, n };
  });
  // the whole group's white, ringed with ink where it meets anything that isn't foam
  const v = pack(WHITE), k = pack(INK);
  const disc = (x, y, r, f) => { for (let yy = Math.max(0, Math.floor(y - r)); yy <= Math.min(LH - 1, y + r); yy++) for (let xx = Math.max(0, Math.floor(x - r)); xx <= Math.min(LW - 1, x + r); xx++) if ((xx + .5 - x) ** 2 + (yy + .5 - y) ** 2 <= r * r) f(yy * LW + xx); };
  for (const { mid } of bent) for (const [x, y, r] of mid) disc(x, y, r + .85, i => { if (!IS_FOAM.has(buf[i])) buf[i] = k; });
  for (const { mid } of bent) for (const [x, y, r] of mid) disc(x, y, Math.max(.75, r), i => { buf[i] = v; });
  for (const { mid, out, inn, n } of bent) {
    if (shade) for (let i = Math.floor(n * .15); i < n * .7; i++) {   // pale in the crook, inside the finger and just under it
      const [x, y, r] = mid[i], [ax, ay] = inn[i], q = Math.round(y + (ay - y) * .55) * LW + Math.round(x + (ax - x) * .55);
      if (r > 1 && IS_FOAM.has(buf[q])) buf[q] = pack(PALE);
    }
    const tip = mid[n];
    trace([...out.slice(Math.floor(n * .1)), [tip[0], tip[1]]], INK);
    if (n > 14) trace([...inn.slice(Math.floor(n * .5)), [tip[0], tip[1]]], INK);
  }
}
// One little hook inside the foam: the same finger, smaller, with a pale shadow under its bend.
function hook(x, y, a0, a1, len, w) {
  const s = a1 > a0 ? 1 : -1, r = len * .34, m = (a0 + (a1 - a0) * .3) * Math.PI / 180;
  const cx = X(x) + Math.cos(m) * len * .45 - Math.sin(m) * s * r * .9, cy = Y(y) + Math.sin(m) * len * .45 + Math.cos(m) * s * r * .9;
  for (let yy = Math.floor(cy - r); yy <= cy + r; yy++) for (let xx = Math.floor(cx - r); xx <= cx + r; xx++)
    if (((xx + .5 - cx) / r) ** 2 + ((yy + .5 - cy) / r) ** 2 <= 1 && ((xx + .5 - cx - s * r * .5) / r) ** 2 + ((yy + .5 - cy - r * .75) / r) ** 2 > .8 && IS_FOAM.has(at(xx, yy))) dot(xx, yy, PALE);
  fingers([[x, y, a0, a1, len, w]], { grasp: 8 });
}
// Curls scattered over a shape (print units), about gap pixels apart, only on foam and never touching.
function inside(pts, x, y) {
  let k = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) if ((pts[i][1] > y) !== (pts[j][1] > y) && x < (pts[j][0] - pts[i][0]) * (y - pts[i][1]) / (pts[j][1] - pts[i][1]) + pts[i][0]) k = !k;
  return k;
}
const SCATTERED = new Map();   // (worked out once: they're the same in every frame)
function scatter(pts, gap, seed, put, tries = 400) {
  const key = seed + '/' + SQ;
  if (SCATTERED.has(key)) { for (const p of SCATTERED.get(key)) put(...p); return; }
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys), placed = [];
  for (let i = 0; i < tries; i++) {
    const x = x0 + rnd(seed + i * 1.7) * (x1 - x0), y = y0 + rnd(seed + i * 2.9 + 40) * (y1 - y0);
    if (!inside(pts, x, y) || placed.some(([a, b]) => Math.hypot(X(x - a), (y - b) * SQ) < gap)) continue;
    placed.push([x, y, i]);
  }
  SCATTERED.set(key, placed);
  for (const p of placed) put(...p);
}
// Hooks all over a shape, like Hokusai's: most curl one way (lean: 1 right, -1 left), with a few the other.
const curls = (pts, gap, seed, lean = .5, tries) => {
  const list = [];
  scatter(pts, gap, seed, (x, y, i) => list.push([x, y, i]), tries);
  list.sort((a, b) => a[1] - b[1]);   // (nearer ones overlap those behind)
  for (const [x, y, i] of list) {
    const px = Math.round(X(x)), py = Math.round(Y(y));
    if (![[0, 0], [-6, 0], [6, 0], [0, -4], [0, 6]].every(([dx, dy]) => IS_FOAM.has(at(px + dx, py + dy)))) continue;
    const left = rnd(seed + i * 5.1) < lean, a = -50 + rnd(seed + i * 3.3) * 45, len = 8 + rnd(seed + i * 7.7) * 5, end = a + 110 + rnd(seed + i * 2.2) * 70;
    if (left) hook(x, y, 180 - a, 180 - end, len, 3.6); else hook(x, y, a, end, len, 3.6);
  }
};
// Drops of spray on dark water: little diamonds of white, 1 to 4 pixels.
const DROPS = [['w'], ['ww', 'ww'], ['.ww', 'www', 'ww.'], ['.ww.', 'wwww', 'wwww', '.ww.']];
const onWater = new Set([DARK, BLUE].map(pack));
function drops(pts, gap, seed, big = .5, tries = 600) {
  scatter(pts, gap, seed, (x, y, i) => {
    const px = Math.round(X(x)), py = Math.round(Y(y));
    if (![[0, 0], [-2, 0], [2, 0], [0, -2], [0, 2]].every(([dx, dy]) => onWater.has(at(px + dx, py + dy)))) return;
    const r = rnd(seed + i * 4.1); stamp(DROPS[r < .4 ? 0 : r < .9 - big * .3 ? 1 : r < .97 ? 2 : 3], px, py, { w: FOAM });
  }, tries);
}

// ---------------------------------------------------------------------------
// The picture, back to front
// ---------------------------------------------------------------------------
// The sky: warm paper at the top, paling, then Hokusai's grey dusk thickening down to the horizon, all
// blended in dots. It has the faint grain of the woodblock, and a cream cloud with steps and hollows.
const SKY_BANDS = [[0, P.tan], [40, P.sky], [150, P.sky], [330, P.paper], [430, P.paper], [490, P.grey0], [535, P.grey1], [585, P.grey2], [630, P.grey3], [900, P.grey3]];
function sky() {
  const bands = SKY_BANDS.map(([y, c]) => [Y(y), c]);
  for (let y = 0; y < LH; y++) {
    let i = 0; while (i < bands.length - 2 && y >= bands[i + 1][0]) i++;
    const f = (y - bands[i][0]) / (bands[i + 1][0] - bands[i][0]);
    for (let x = 0; x < LW; x++) {
      const bow = Math.abs(x - 430) * .00035 * Math.max(0, (y - 170) / 60);   // (the dusk is deepest behind Fuji)
      const grain = (rnd(y * 3.7 + Math.floor((x + rnd(y) * 60) / (30 + rnd(y + 5) * 50)) * 9.1) - .5) * (y > 170 ? .22 : .1);
      buf[y * LW + x] = pack(dither(x, y) < f + grain - bow ? bands[i + 1][1] : bands[i][1]);
    }
  }
  const CLOUD = [[690, 205], [700, 180], [722, 168], [716, 130], [730, 108], [760, 98], [786, 108], [800, 122], [826, 108], [868, 106], [878, 84], [905, 66], [938, 74], [946, 106], [980, 108], [1010, 122], [1044, 130], [1050, 158], [1020, 172], [985, 176], [960, 190], [940, 205], [968, 222], [985, 244], [940, 262], [1010, 285], [760, 290], [720, 240]];
  fill(CLOUD, (x, y) => (y > Y(215) && dither(x, y) < (y - Y(215)) / 34 ? null : P.paper));
  fill([[135, 165], [160, 140], [200, 138], [235, 112], [300, 108], [345, 110], [300, 160], [200, 200], [160, 190]], P.paper);
}

// Fuji, far off: a small white peak, streaked with blue below, and the dark hills at its foot.
function fuji() {
  sharp([[655, 632], [690, 624], [735, 612], [760, 600], [900, 618], [920, 640], [860, 665], [760, 662], [700, 648]], DARK);
  sharp([[738, 612], [770, 585], [800, 556], [806, 554], [818, 554], [824, 560], [850, 590], [880, 610], [905, 628], [880, 640], [760, 640]], WHITE);
  for (let x = Math.ceil(X(744)); x < X(896); x++) {   // the bare blue slopes, reaching up into the snow in ragged points
    const k = (x - X(744)) / (X(896) - X(744)), reach = 3 + Math.sin(k * Math.PI) * 5, group = Math.floor(x / 4), h = x % 4 === 3 && rnd(group) < .7 ? 0 : reach * (.25 + rnd(group * 1.3) * .9 + rnd(x) * .5 - Math.abs(x % 4 - 1.2) * .25);
    for (let y = Math.round(Y(632) - h); y < Y(640); y++) dot(x, y, DARK);
  }
  for (const x of [700, 716, 728, 742]) { dot(X(x), Y(622) - 1, WHITE); dot(X(x) + 1, Y(626) - 1, WHITE); dot(X(x) + 2, Y(626), WHITE); }
  trace([[738, 612], [770, 585], [800, 556], [806, 553], [818, 553], [826, 560], [850, 590], [880, 610], [908, 624]].map(([x, y]) => [X(x), Y(y)]), INK);
}

// A boat's crew, bent double over the oars: [x, y] of each, the back row first. (The far boat's are smaller.)
const ROWER = ['.....kkkkk..', '...kkbbbbnk.', '..kbbbnnnnnk', '.kkkbnnnnnnk', 'kkwwknnnnnnk', 'kwwwknnnnnk.', 'kwwwknnnnk..', '.kkk.kkkk...'];
const FAR_ROWER = ['....kkkk.', '..kkbbbnk', '.kkkbnnnk', 'kwwknnnnk', 'kwwknnnk.', '.kk.kkk..'];
function crew(list, dy, pic, face) { for (const [x, y] of list) stamp(pic, X(x), Math.round(Y(y)) + dy, { k: INK, w: face, b: BLUE, n: DARK }); }
// A straw mat laid over a boat's rim: from one point to another, so many pixels thick, tied with two
// ropes, its frayed ends hanging down.
function mat(x0, y0, x1, y1, thick, dy) {
  const n = Math.round(X(x1 - x0));
  for (let i = 0; i <= n; i++) {
    const x = X(x0) + i, y = Math.round(Y(y0 + (y1 - y0) * i / n)) + dy, hang = 1 + Math.floor(rnd(x0 + i * 1.7) * 4);
    for (let j = 0; j < thick; j++) dot(x, y + j, rnd(x0 + i * 3.1 + Math.floor(j / 2) * 7) < .14 ? P.wood : j < 2 ? P.tan : rnd(i * 2.3 + j) < .3 ? P.tanD : P.ochre);
    dot(x, y - 1, INK);
    if (i % 4 !== 3) dot(x, y + Math.floor(thick * .55), P.brown);
    if (i % 6 === 0) { dot(x, y, INK); dot(x, y - 2, INK); }
    for (let j = 0; j < hang; j++) dot(x, y + thick + j, i % 3 === 0 ? INK : i % 3 === 1 ? P.brown : P.ochre);
  }
}
const lift = (pts, dy) => pts.map(([x, y]) => [x, y + dy / SQ]);   // (moved dy pixels down)

// The boat by Fuji, its bow rising out of the trough and its stern climbing the far wave.
function farBoat() {
  const dy = Math.round(Math.sin(w0 + 1) * .8);
  fill([[655, 634], [700, 640], [740, 640], [800, 650], [960, 640], [960, 690], [760, 690], [700, 650]], DARK);
  const hull = lift([[708, 596], [730, 606], [762, 622], [800, 636], [850, 638], [890, 630], [940, 616], [1000, 594], [1060, 566], [1105, 530], [1150, 484], [1176, 448], [1182, 456], [1160, 490], [1120, 535], [1070, 575], [1010, 610], [950, 636], [890, 654], [830, 662], [790, 652], [745, 626]], dy);
  fill(hull, P.ochre);
  fill(lift([[712, 600], [740, 620], [790, 648], [830, 658], [890, 648], [950, 630], [1010, 604], [1070, 568], [1120, 528], [1174, 456], [1125, 540], [1070, 578], [1010, 612], [950, 638], [890, 656], [830, 664], [790, 654], [745, 630]], dy), P.wood);
  trace(curve(hull, true), INK);
  mat(782, 630, 908, 622, 8, dy);
  crew([[976, 592], [956, 600], [936, 608]], dy, FAR_ROWER, P.foam);
  crew([[1118, 500], [1104, 510], [1090, 522], [1076, 534], [1060, 546], [1044, 558], [1030, 572], [1118, 516], [1102, 528], [1086, 542], [1068, 556], [1050, 570]], dy, FAR_ROWER, P.foam);
  const s = dy / SQ;
  rule(1108, 490 + s, 1132, 456 + s); rule(1122, 496 + s, 1146, 462 + s); rule(1120, 470 + s, 1140, 474 + s); rule(1132, 456 + s, 1146, 462 + s);
}

// The far wave on the right: white, its inner edge breaking into blue claws.
function farWave() {
  const top = [[1300, 325], [1262, 352], [1236, 378], [1212, 408], [1190, 432], [1160, 470], [1120, 520], [1076, 566], [1030, 600], [960, 634], [890, 656], [830, 664], [770, 658], [720, 648], [668, 634]];
  const under = [[1300, 545], [1262, 566], [1200, 596], [1130, 626], [1050, 652], [1000, 664], [920, 674], [850, 678], [800, 668], [740, 650], [668, 634]];
  fillShape([...curve(top), ...curve(under).reverse()], FOAM);
  fillShape([...curve([[1000, 662], [1030, 640], [1062, 630], [1080, 610], [1112, 596], [1126, 574], [1160, 562], [1172, 540], [1200, 520], [1216, 496], [1240, 470], [1256, 446], [1300, 425]]), ...curve([[1300, 540], [1200, 588], [1130, 618], [1050, 646]])], PALE);
  fillShape([...curve([[1040, 650], [1062, 636], [1092, 622], [1112, 600], [1140, 590], [1160, 568], [1186, 552], [1206, 530], [1228, 510], [1244, 480], [1262, 462], [1300, 445]]), ...curve([[1300, 535], [1200, 582], [1130, 612], [1070, 636]])], BLUE);
  for (const [pts, w] of [[[[1060, 640], [1100, 624], [1160, 596]], 5], [[[1110, 606], [1150, 590], [1200, 566]], 7], [[[1168, 560], [1200, 556], [1250, 530]], 8], [[[1196, 540], [1230, 530], [1280, 490]], 10], [[[1236, 500], [1262, 490], [1300, 455]], 10], [[[1210, 570], [1250, 550], [1300, 525]], 6]]) stroke(pts, w, DARK);
  fingers([[984, 654, 10, 80, 9, 4], [1010, 648, 5, 90, 10, 4], [1034, 634, 10, 100, 11, 5], [1062, 620, 5, 95, 12, 5], [1086, 606, 10, 100, 11, 5], [1106, 586, 0, 90, 13, 5], [1132, 572, 10, 100, 13, 6], [1156, 550, 0, 95, 14, 6], [1176, 528, 10, 105, 14, 6], [1198, 506, 0, 90, 15, 6], [1216, 478, 10, 100, 15, 7], [1238, 452, 0, 95, 15, 7], [1262, 430, 10, 100, 14, 6], [1140, 592, 20, 110, 8, 4], [1206, 528, 20, 100, 9, 4], [1180, 560, 20, 110, 9, 4]], { grasp: 8 });
  for (const [x, y] of [[1224, 436], [1250, 404], [1198, 468], [1172, 500], [1140, 536], [1108, 562], [1072, 590], [1036, 616], [970, 642], [930, 656], [1262, 380]]) hook(x, y, -20, 110, 10, 3.6);
  line(top); line(under);
}

// The slope of water between the waves: pale, with long dark leaves of shadow lying along it.
function slope() {
  const roll = k => Math.sin(w0 + k) * 3;
  fill([[540, 560], [600, 596], [668, 634], [740, 652], [800, 670], [850, 679], [920, 675], [1000, 665], [1050, 653], [1130, 627], [1200, 597], [1310, 545], [1310, 900], [500, 900], [500, 700]], PALE);
  // the bare white of the foreground peak's flank, sweeping down into it in streaks
  for (const [pts, w] of [[[[620, 615], [700, 655], [800, 690], [900, 698], [1010, 690]], 13], [[[600, 600], [660, 660], [740, 710], [840, 760], [930, 775]], 20], [[[760, 672], [840, 700], [920, 735], [1060, 742]], 8], [[[560, 590], [600, 660], [650, 720], [720, 752], [800, 768]], 18], [[[880, 688], [960, 712], [1060, 722], [1120, 712]], 5], [[[1010, 668], [1080, 664], [1180, 640]], 8], [[[950, 684], [1050, 690], [1160, 668]], 6]]) stroke(pts, w, FOAM);
  for (const [k, pts, w, c] of [
    [0, [[648, 646], [676, 690], [716, 730], [780, 760], [860, 776]], 14, BLUE], [0, [[650, 650], [672, 690], [716, 734], [776, 764]], 9, DARK],
    [1, [[698, 658], [730, 694], [780, 730], [840, 762], [900, 778]], 17, BLUE], [1, [[700, 662], [726, 696], [780, 738], [850, 772]], 12, DARK],
    [2, [[834, 718], [870, 732], [910, 756], [960, 772]], 11, DARK], [3, [[904, 724], [950, 736], [1000, 742]], 8, DARK], [3, [[904, 702], [960, 720], [1030, 734], [1084, 730]], 9, BLUE], [3, [[908, 702], [970, 722], [1040, 736]], 5, DARK],
    [4, [[970, 696], [1030, 712], [1100, 714]], 7, DARK], [4, [[1010, 698], [1060, 704], [1120, 696]], 4, BLUE], [5, [[1016, 678], [1080, 688], [1140, 680]], 7, DARK], [5, [[1050, 672], [1100, 674], [1150, 664]], 4, BLUE], [6, [[1080, 660], [1120, 660], [1170, 648]], 5, DARK], [6, [[1100, 646], [1150, 640], [1190, 628]], 5, BLUE], [7, [[1140, 634], [1190, 620], [1240, 596]], 8, BLUE],
    [0, [[604, 660], [628, 700], [660, 734], [720, 756]], 8, BLUE], [0, [[606, 664], [632, 706], [664, 738]], 4, DARK], [1, [[575, 668], [590, 700], [616, 730]], 8, BLUE], [1, [[576, 674], [592, 706], [616, 734]], 4, DARK], [2, [[620, 706], [660, 736], [700, 750]], 5, BLUE],
  ]) stroke(pts.map(([x, y], i) => [x + (i ? roll(k) : 0), y]), w, c);
  fingers([[640, 640, 60, 120, 11, 4], [690, 652, 50, 110, 11, 4], [594, 650, 60, 130, 11, 4], [566, 654, 70, 140, 10, 4], [610, 690, 40, 100, 8, 3], [650, 700, 35, 90, 8, 3]], { grasp: 8 });
  
}

// The near boat, salmon, riding down the trough; and the dark trough itself, and the near wave on the right.
function nearBoat() {
  const dy = Math.round(Math.sin(w0 + 3) * 1.2), s = dy / SQ;
  fill([[503, 666], [512, 655], [524, 648], [545, 660], [570, 700], [600, 740], [660, 770], [760, 785], [900, 800], [960, 800], [900, 900], [600, 900], [540, 780], [506, 710]], DARK);
  for (const [pts, w] of [[[[522, 652], [546, 690], [580, 740], [640, 780]], 7], [[[520, 700], [550, 756], [600, 806], [680, 836], [800, 834]], 5], [[[540, 760], [580, 806], [640, 836]], 4], [[[580, 770], [640, 812], [720, 832]], 3]]) stroke(pts, w, BLUE);
  const hull = lift([[522, 655], [536, 668], [562, 700], [590, 726], [618, 742], [680, 758], [740, 768], [830, 780], [920, 784], [1000, 774], [1060, 742], [1082, 722], [1074, 742], [1010, 786], [950, 806], [880, 824], [790, 830], [712, 826], [650, 794], [600, 764], [556, 718]], dy);
  fill(hull, P.skin);
  fill(lift([[645, 788], [700, 798], [780, 806], [860, 808], [930, 802], [1000, 784], [950, 808], [880, 826], [790, 832], [712, 828]], dy), P.foam);
  line(lift([[534, 672], [560, 708], [590, 734], [618, 750], [680, 766], [740, 776], [830, 788], [900, 790]], dy), P.ochre);
  trace(curve(hull, true), INK);
  line(lift([[648, 788], [700, 798], [780, 806], [860, 808], [930, 803]], dy)); rule(648, 788 + s, 714, 826 + s);
  for (const x of [724, 790, 852, 908]) dot(X(x), Y(x < 800 ? 794 : 798) + dy, INK);
  mat(600, 728, 740, 762, 9, dy);
  crew([[1046, 738], [1018, 746], [990, 752], [962, 758], [1012, 766], [986, 772], [958, 776], [930, 778], [902, 780]], dy, ROWER, P.skin);
}
function nearWave() {
  const roll = k => Math.sin(w0 + k) * 4;
  // the water the boat sits in, deep blue, curving up into the near wave's white lip
  fillShape([...curve([[500, 700], [545, 770], [600, 815], [660, 834], [740, 834], [830, 830], [890, 826]]), [LW / 2, LH]], DARK);
  fill([[503, 690], [530, 750], [580, 800], [650, 828], [740, 836], [880, 824], [880, 900], [560, 900], [500, 760]], DARK);
  for (const [pts, w] of [[[[516, 730], [560, 796], [640, 834], [760, 846]], 4], [[[512, 690], [534, 740], [570, 780], [640, 814]], 5]]) stroke(pts, w, BLUE);
  const lip = [[780, 850], [880, 826], [950, 806], [1010, 782], [1070, 742], [1120, 694], [1180, 644], [1240, 590], [1310, 540]];
  fillShape([...curve(lip), [LW + 2, LH + 2], [X(760), LH + 2]], FOAM);
  fill([[1000, 806], [1050, 772], [1100, 735], [1160, 690], [1220, 630], [1310, 580], [1310, 760], [1180, 770], [1080, 800], [990, 820]], PALE);
  for (const [pts, w] of [[[[1070, 752], [1140, 738], [1220, 728], [1310, 720]], 8], [[[1140, 700], [1200, 688], [1310, 660]], 7]]) stroke(pts, w, FOAM);
  for (const [k, pts, w, c] of [
    [0, [[1160, 700], [1200, 684], [1260, 690], [1310, 684]], 11, BLUE], [0, [[1176, 698], [1220, 690], [1310, 694]], 6, DARK], [1, [[1200, 676], [1240, 662], [1310, 640]], 9, BLUE], [1, [[1220, 672], [1260, 658], [1310, 646]], 4, DARK],
    [2, [[1106, 752], [1150, 742], [1220, 722], [1310, 706]], 12, BLUE], [2, [[1112, 754], [1160, 746], [1220, 738]], 6, DARK], [2, [[1150, 738], [1230, 718], [1310, 716]], 6, DARK],
    [3, [[1050, 790], [1110, 772], [1200, 766], [1310, 750]], 19, BLUE], [3, [[1056, 794], [1120, 782], [1200, 788], [1310, 776]], 12, DARK], [3, [[1120, 766], [1200, 760], [1310, 752]], 5, DARK],
    [4, [[940, 822], [1000, 812], [1080, 808], [1140, 806]], 12, BLUE], [4, [[944, 824], [1000, 818], [1090, 812]], 8, DARK],
  ]) stroke(pts.map(([x, y]) => [x + roll(k), y]), w, c);
  fill([[900, 846], [1000, 838], [1100, 826], [1200, 808], [1310, 800], [1310, 830], [1200, 834], [1080, 850], [900, 870]], PALE);
  stroke([[1180, 826], [1250, 816], [1320, 818]], 6, BLUE);
  line(lip);
}

// The great wave. Its white back and crest; the dark hollow under the crest, striped with blue and flecked
// with spray; the band of foam across its face; and the claws.
const BACK_LINE = [[-10, 360], [20, 350], [55, 334], [110, 299], [150, 256], [190, 211], [222, 188], [250, 166], [276, 143], [310, 127], [345, 103], [392, 87], [440, 83], [456, 75], [498, 75], [522, 82], [533, 95], [560, 99], [585, 114], [600, 129], [614, 134]];
const TUBE = [[614, 134], [640, 200], [700, 250], [690, 330], [600, 300], [556, 296], [532, 318], [515, 345], [508, 380], [504, 410], [508, 440], [520, 474], [545, 524], [575, 566], [610, 592]];
const HOLLOW = [   // the upper hollow's lumpy top edge, down the tube, along the foreground peak, and back under the band of foam
  [290, 238], [298, 226], [312, 230], [317, 246], [324, 230], [336, 224], [343, 242], [350, 222], [364, 215], [376, 226], [380, 238], [372, 210], [384, 202], [394, 212], [372, 198], [366, 184], [382, 180], [396, 186], [400, 202], [412, 188], [424, 200], [428, 217], [434, 204], [446, 200], [454, 216], [438, 184], [446, 176], [460, 186], [468, 190], [468, 170], [482, 166], [494, 180], [500, 200], [494, 208], [512, 208], [518, 222], [512, 232], [504, 238], [530, 234], [538, 246], [547, 254], [544, 268], [554, 280], [552, 296],
  [532, 318], [515, 345], [508, 380], [504, 410], [508, 440], [520, 474], [545, 524], [575, 566], [612, 594], [565, 584], [530, 552], [500, 500], [458, 491], [432, 480], [400, 512], [345, 566], [310, 582],
  [260, 600], [225, 615], [160, 560], [110, 505], [84, 470], [66, 440], [78, 432], [92, 446], [102, 440], [118, 452], [134, 444], [146, 436], [140, 415], [126, 396], [134, 378], [152, 378], [166, 392], [186, 392], [200, 408], [206, 430], [190, 446], [196, 466], [206, 486], [214, 500], [224, 478], [234, 468], [252, 472], [260, 462], [280, 462], [296, 480], [312, 492], [330, 474], [346, 452], [344, 424], [320, 418], [300, 414], [292, 398], [306, 390], [330, 396], [350, 384], [372, 388], [384, 402], [396, 420], [420, 420], [438, 404], [446, 388], [468, 392], [484, 388], [484, 372],
  [468, 364], [444, 366], [424, 366], [410, 356], [430, 344], [424, 334], [400, 334], [384, 346], [370, 344], [360, 326], [380, 316], [392, 306], [376, 298], [352, 298], [334, 296], [312, 290], [296, 270], [290, 250]];

// The calm strip of sea far off at the left edge, behind its back.
function calm() {
  fill([[-10, 296], [30, 308], [70, 308], [112, 298], [90, 330], [40, 360], [-10, 370]], PALE);
  stroke([[-20, 326], [20, 326], [70, 318], [104, 303]], 11, DARK, { full: 1 }); stroke([[-20, 350], [10, 348], [50, 336]], 6, DARK, { full: 1 });
  for (const [x, y] of [[46, 322], [62, 320], [78, 316]]) stamp(DROPS[1], X(x), Y(y), { w: FOAM });
  line([[-10, 296], [30, 308], [70, 308], [112, 298]]);
}
function greatWave(alone = false) {
  fillShape([...curve(BACK_LINE), ...curve(TUBE), ...[[530, 600], [300, 640], [-10, 640]].map(([x, y]) => [X(x), Y(y)])], FOAM);
  if (alone) sharp([[84, 470], [200, 540], [400, 500], [434, 470], [504, 496], [566, 580], [612, 592], [612, 680], [-10, 680], [-10, 580], [60, 520]], DARK);   // (dark water instead of the foreground)
  fill(HOLLOW, DARK);
  const inHollow = new Set([pack(DARK)]);
  for (const [pts, w, full] of [   // the blue stripes: ribs of water, curving up into the crest
    [[[340, 224], [320, 246], [312, 270], [314, 290]], 6], [[[388, 208], [360, 232], [346, 256], [342, 292]], 7], [[[432, 206], [398, 230], [380, 256], [372, 280], [366, 304]], 9], [[[404, 198], [430, 190]], 3],
    [[[510, 212], [470, 226], [440, 250], [424, 280], [416, 312], [410, 340]], 10], [[[518, 226], [488, 232], [462, 250], [446, 272]], 4], [[[448, 186], [470, 182], [496, 188]], 4],
    [[[540, 244], [504, 250], [478, 272], [462, 300], [452, 330], [448, 366]], 10],
    [[[556, 284], [524, 296], [504, 322], [492, 356], [490, 400], [496, 440], [514, 490], [550, 545], [600, 590]], 15],
    [[[454, 390], [458, 420], [476, 460], [512, 504]], 8], [[[352, 388], [366, 426], [390, 456], [424, 482]], 8], [[[424, 420], [440, 446], [462, 474], [492, 500]], 7], [[[396, 420], [400, 440], [414, 470]], 4],
    [[[104, 440], [112, 464], [124, 488], [150, 515]], 6], [[[160, 400], [162, 440], [172, 474], [192, 506], [220, 538], [256, 556]], 11], [[[136, 446], [140, 470], [156, 500]], 4], [[[226, 480], [242, 516], [284, 548], [336, 574]], 9], [[[262, 464], [278, 498], [308, 530], [350, 562]], 11], [[[346, 450], [358, 480], [376, 500], [398, 518]], 7], [[[312, 496], [332, 526], [360, 552]], 6], [[[290, 484], [300, 510], [330, 540]], 3],
  ]) stroke(pts, w, BLUE, { only: inHollow });
  drops(HOLLOW, 6.5, 3, .5, 900);
  // beads of spray running down the ribs
  for (const pts of [[[342, 244], [340, 284]], [[398, 246], [380, 286]], [[440, 262], [418, 330]], [[484, 280], [452, 350]], [[516, 320], [494, 390]], [[174, 476], [214, 530]], [[276, 496], [330, 546]], [[466, 430], [500, 486]]])
    curve(pts).forEach(([x, y], i) => { if (i % 7 === 3 && onWater.has(at(Math.round(x), Math.round(y)))) dot(x + (i % 2), y, WHITE); });
  line(BACK_LINE.slice(0, 18)); line([[556, 296], [532, 318], [515, 345], [508, 380], [504, 410], [508, 440], [520, 474], [545, 524], [575, 566], [610, 592]]);
}

// The claws of the crest, and the foam they grow out of.
const HEAD_FOAM = [[500, 100], [533, 94], [560, 98], [585, 113], [602, 128], [622, 140], [618, 156], [626, 176], [630, 192], [616, 204], [640, 212], [664, 208], [690, 220], [704, 238], [690, 250], [716, 254], [728, 272], [712, 290], [700, 296], [712, 310], [716, 326], [704, 340], [690, 344], [680, 326], [664, 306], [650, 306], [640, 314], [616, 310], [600, 300], [582, 298], [566, 290], [556, 280], [548, 262], [546, 244], [530, 230], [520, 216], [508, 204], [500, 190], [486, 168], [470, 150], [478, 120]];
function crest() {
  fill(HEAD_FOAM, FOAM);
  line(BACK_LINE.slice(16)); line([[616, 206], [640, 212], [664, 208], [690, 220]]);
  curls(HEAD_FOAM, 9, 7, .25, 900);
  // the claws against the sky, hand by hand, from the top of the crest down round to the hollow
  fingers([[586, 116, 20, 100, 14, 6], [604, 130, 5, 100, 20, 8], [620, 152, 25, 130, 13, 6]]);
  fingers([[608, 172, 20, 130, 13, 6], [616, 172, -5, 105, 23, 9], [614, 192, 50, 160, 12, 6]]);
  fingers([[664, 214, 0, 110, 14, 6], [684, 222, -5, 110, 23, 9], [692, 240, 35, 140, 13, 6]]);
  fingers([[700, 250, -10, 60, 16, 6], [708, 262, 0, 115, 26, 9], [712, 278, 35, 140, 17, 7], [696, 288, 60, 160, 13, 6]]);
  fingers([[698, 302, 10, 115, 17, 7], [704, 316, 10, 120, 24, 9], [706, 334, 40, 140, 17, 7]]);
  fingers([[702, 338, 60, 150, 20, 7], [694, 344, 75, 180, 23, 8], [684, 332, 95, 200, 18, 7], [676, 318, 90, 190, 14, 6]]);
  fingers([[652, 308, 70, 165, 17, 7], [636, 314, 75, 185, 22, 8], [618, 310, 85, 190, 18, 7], [602, 302, 90, 200, 19, 7], [582, 298, 85, 190, 14, 6], [564, 290, 95, 200, 12, 6]]);
  // and the ones that hang over the hollow
  fingers([
    [300, 222, 190, 95, 11, 4], [316, 226, 110, 170, 11, 4], [345, 220, 100, 170, 11, 5], [378, 206, 70, 130, 14, 5], [372, 224, 80, 140, 10, 4], [402, 190, 80, 150, 12, 5], [430, 200, 90, 160, 13, 5], [446, 192, 60, 110, 14, 5], [452, 176, 110, 170, 8, 4], [464, 180, 100, 160, 10, 4], [464, 162, 60, 130, 12, 5], [492, 176, 100, 170, 11, 5], [500, 200, 120, 190, 11, 5], [514, 212, 90, 170, 10, 5], [530, 230, 110, 190, 11, 5], [546, 246, 100, 190, 11, 5], [552, 272, 130, 200, 10, 5], [414, 184, 120, 170, 8, 4], [360, 206, 130, 190, 9, 4], [330, 222, 100, 160, 8, 4],
  ], { grasp: 9 });
  curls([[300, 215], [330, 190], [370, 168], [410, 165], [430, 150], [470, 130], [490, 110], [510, 100], [515, 200], [490, 165], [460, 165], [430, 185], [400, 176], [370, 178], [330, 215]], 9, 21, .8, 700);
}

// The band of foam across the wave's face, thick and tangled at the left, and what hangs from it.
function band() {
  for (const b of [[[26, 385], [30, 366], [48, 362], [72, 370], [84, 392], [100, 400], [80, 412], [40, 400]], [[140, 352], [150, 330], [176, 326], [200, 310], [216, 304], [230, 312], [218, 334], [196, 350], [160, 362]], [[190, 350], [220, 350], [250, 368], [246, 400], [216, 402], [196, 384]], [[252, 346], [266, 340], [276, 352], [268, 370], [254, 366]], [[86, 398], [110, 380], [136, 370], [126, 400], [100, 408]], [[232, 410], [262, 400], [280, 408], [276, 434], [250, 440]], [[296, 330], [312, 336], [324, 352], [312, 380], [298, 370]], [[60, 500], [86, 500], [94, 526], [76, 556], [60, 540]], [[0, 540], [26, 546], [30, 580], [0, 590]]]) patch(b);
  fingers([   // over the lower hollow
    [80, 430, 120, 40, 8, 4], [96, 436, 60, 120, 10, 4], [122, 440, 60, 130, 10, 4], [140, 436, 70, 130, 11, 5], [136, 404, 100, 40, 9, 4], [170, 388, 80, 150, 8, 4], [196, 400, 60, 130, 8, 4], [202, 440, 130, 70, 9, 4], [206, 476, 100, 190, 9, 4], [216, 486, 60, 130, 8, 4], [236, 466, 90, 170, 9, 4], [262, 456, 60, 120, 11, 5], [284, 466, 50, 120, 10, 4], [312, 482, 60, 110, 14, 5], [332, 470, 70, 150, 10, 4], [346, 444, 40, 110, 12, 5], [322, 412, 60, 120, 8, 4], [300, 406, 130, 60, 8, 4], [336, 390, 80, 160, 8, 4], [380, 396, 60, 130, 10, 5], [396, 416, 60, 130, 11, 5], [424, 412, 70, 130, 11, 5], [440, 396, 50, 110, 12, 5], [466, 376, 30, 110, 15, 5], [478, 368, 20, 100, 11, 4], [356, 384, 70, 140, 8, 4],
  ], { grasp: 9 });
  fingers([   // and up over the top hollow's floor
    [372, 304, -10, 70, 12, 5], [352, 298, -20, 60, 9, 4], [376, 320, 10, 90, 9, 4], [400, 340, -30, 60, 11, 4], [418, 344, 10, 100, 12, 5], [436, 362, -20, 60, 10, 4], [462, 366, -20, 70, 10, 4],
  ], { grasp: 8 });
  curls([[130, 360], [200, 310], [240, 350], [300, 320], [370, 310], [400, 345], [430, 366], [480, 380], [440, 395], [390, 400], [300, 396], [300, 420], [340, 425], [335, 460], [300, 475], [240, 460], [205, 470], [210, 420], [190, 385], [150, 372]], 8.5, 33, .4, 1200);
  curls([[0, 400], [30, 380], [130, 372], [140, 430], [60, 440], [70, 470], [100, 500], [110, 540], [40, 560], [0, 580]], 8.5, 51, .5, 900);
}

// The boat being tipped down the wave's face at the left, its crew clinging on under the mats.
function leftBoat() {
  const dy = Math.round(Math.sin(w0 + 5) * .8), m = p => lift(p, dy);
  fill([[24, 590], [32, 568], [48, 562], [58, 576], [66, 590], [76, 572], [90, 566], [98, 580], [106, 566], [118, 572], [130, 600], [180, 626], [140, 636], [100, 641], [60, 630], [36, 608]], DARK);
  for (const [pts, w] of [[[[108, 572], [124, 600], [170, 628]], 6], [[[70, 600], [84, 622], [110, 636]], 4], [[[44, 580], [56, 610], [76, 630]], 4]]) stroke(pts, w, BLUE, { only: new Set([pack(DARK)]) });
  drops([[24, 590], [60, 570], [120, 580], [180, 626], [100, 640], [36, 608]], 6.5, 9, .6);
  const prow = m([[37, 408], [44, 412], [74, 450], [108, 494], [98, 490], [76, 476], [58, 478], [48, 440]]);
  fill(prow, P.tan); trace(curve(prow, true), INK); line(m([[42, 414], [70, 456], [98, 488]]));
  const deck = m([[96, 500], [120, 506], [150, 520], [200, 545], [260, 562], [318, 578], [290, 598], [250, 618], [222, 626], [170, 612], [130, 580], [108, 540]]);
  fill(deck, P.sky);
  fill(m([[118, 556], [150, 585], [200, 610], [250, 616], [222, 627], [170, 616], [130, 586]]), P.ochre);
  for (const [a, b, c, d] of [[128, 530, 112, 548], [150, 534, 128, 560], [172, 544, 146, 574], [196, 552, 168, 584], [220, 560, 196, 594], [246, 566, 218, 602]]) { rule(a, b + dy / SQ, c, d + dy / SQ, P.wood); rule(a + 5, b + dy / SQ, c + 5, d + dy / SQ, INK); }
  for (const pts of [[[130, 548], [190, 566], [240, 584]], [[140, 562], [200, 588]]]) line(m(pts), P.ochre);
  trace(curve(deck, true), INK);
  mat(112, 508, 196, 540, 6, dy); mat(196, 540, 276, 562, 5, dy); mat(118, 552, 160, 586, 7, dy); mat(160, 586, 224, 608, 7, dy);
  crew([[280, 584], [258, 596]], dy, ROWER, P.skin);
}

// The foreground: a white peak of water like a second Fuji, and at its left a tangle of foam and dark water.
const PEAK = [[-10, 580], [10, 590], [36, 608], [60, 630], [100, 641], [140, 636], [180, 627], [225, 630], [258, 618], [310, 582], [346, 566], [376, 538], [402, 510], [418, 490], [434, 480], [460, 491], [500, 500], [516, 526], [534, 556], [566, 584], [612, 592], [640, 615], [668, 634], [700, 646]];
function foreground() {
  const flank = [[640, 618], [606, 612], [590, 640], [560, 640], [540, 640], [524, 646], [508, 656], [502, 690], [520, 740], [556, 800], [590, 830], [640, 900]];
  fillShape([...curve(PEAK.slice(0, -2)), ...curve(flank), [-5, LH + 5]], FOAM);
  line(PEAK);
  for (const b of [[[38, 676], [50, 668], [80, 672], [104, 690], [100, 704], [60, 700], [42, 692]], [[150, 680], [154, 664], [170, 660], [184, 676], [188, 706], [174, 730], [150, 740], [160, 704]], [[234, 654], [240, 642], [266, 642], [290, 656], [304, 690], [304, 730], [284, 734], [278, 700], [256, 676]], [[312, 722], [330, 720], [352, 740], [350, 760], [324, 748]], [[300, 770], [340, 776], [400, 760], [400, 790], [350, 800], [310, 794]], [[360, 720], [376, 712], [390, 724], [380, 745], [362, 736]], [[400, 640], [440, 620], [470, 628], [490, 650], [470, 690], [430, 690], [420, 660]], [[380, 690], [400, 690], [430, 710], [450, 730], [420, 740], [390, 726]], [[480, 740], [500, 736], [530, 770], [520, 800], [490, 770]]]) patch(b);
  // the dark water at the bottom left, its ribs and spray
  const pool = [[8, 900], [14, 830], [22, 800], [34, 772], [56, 750], [84, 748], [104, 764], [112, 750], [130, 748], [150, 738], [172, 744], [176, 730], [190, 706], [204, 702], [208, 714], [200, 740], [184, 762], [172, 780], [182, 796], [200, 788], [214, 776], [236, 774], [252, 768], [270, 774], [290, 782], [306, 800], [304, 820], [290, 830], [312, 850], [312, 900]];
  fill(pool, DARK);
  const inPool = new Set([pack(DARK)]);
  for (const [pts, w] of [[[[180, 752], [140, 762], [116, 790], [112, 830], [120, 870]], 7], [[[70, 760], [48, 780], [36, 810], [34, 860]], 5], [[[176, 792], [146, 808], [142, 840], [146, 870]], 5], [[[236, 780], [212, 800], [206, 850]], 5], [[[290, 800], [262, 812], [250, 860]], 5], [[[200, 712], [206, 740], [186, 764]], 5], [[[90, 780], [78, 810], [82, 860]], 4], [[[196, 800], [184, 830], [186, 860]], 4]]) stroke(pts, w, BLUE, { only: inPool });
  drops(pool, 7, 17, .4);
  const blobs = [[[[406, 770], [414, 756], [430, 756], [438, 772], [450, 776], [462, 764], [474, 774], [482, 796], [500, 816], [530, 850], [500, 860], [470, 820], [440, 800], [420, 792]], DARK], [[[464, 768], [484, 770], [506, 800], [524, 850], [490, 840], [474, 800]], BLUE], [[[500, 786], [516, 792], [530, 820], [540, 860], [516, 860]], DARK]];
  for (const [b, c] of blobs) { fill(b, c); trace(curve(b, true), INK); }
  fingers([[60, 742, 110, 180, 9, 4], [92, 748, 70, 140, 11, 5], [112, 744, 80, 150, 9, 4], [142, 738, 80, 160, 9, 4], [100, 762, 100, 180, 9, 4], [178, 768, 60, 140, 10, 4], [196, 782, 80, 160, 8, 4], [222, 770, 80, 150, 8, 4], [246, 764, 80, 150, 9, 4], [276, 772, 80, 160, 9, 4], [300, 798, 100, 190, 10, 4], [298, 826, 100, 190, 9, 4], [420, 756, 60, 130, 10, 4], [448, 770, 70, 140, 9, 4], [476, 776, 60, 120, 11, 4], [506, 786, 60, 120, 11, 4], [512, 662, 100, 170, 10, 4], [524, 648, 60, 120, 10, 4], [506, 700, 90, 160, 8, 4], [36, 766, 140, 200, 8, 4]], { grasp: 9 });
  curls([[60, 690], [140, 670], [160, 720], [200, 690], [240, 650], [300, 700], [330, 660], [370, 620], [420, 590], [446, 560], [460, 600], [500, 620], [520, 650], [498, 690], [510, 740], [530, 780], [500, 780], [450, 750], [400, 800], [330, 810], [300, 780], [230, 760], [190, 780], [170, 735], [110, 740], [60, 740]], 9, 77, .4, 1500);
  for (const pts of [[[526, 548], [536, 566], [548, 576]], [[540, 574], [552, 592], [570, 612]], [[556, 594], [570, 616], [592, 640]], [[590, 604], [606, 616]]]) line(pts);   // the creases where its flank turns
}

// Spray thrown out in front of the crest, thick in the hollow and thinning toward Fuji.
function spray() {
  for (let i = 0; i < 190; i++) {
    const x = 520 + Math.pow(rnd(i * 1.9 + 2), 1.5) * 330, y = 330 + rnd(i * 2.3 + 9) * 280;
    const px = Math.round(X(x)), py = Math.round(Y(y) + Math.sin(w0 + i) * 1.2);
    if (px > 0 && py > 0 && SKYISH.has(at(px, py))) { const r = rnd(i * 5.7); stamp(DROPS[r < .72 ? 0 : r < .95 ? 1 : 2], px, py, { w: WHITE }); }
  }
}
const SKYISH = new Set([P.paper, P.grey0, P.grey1, P.grey2, P.grey3].map(pack));

let far = null;
export function paintWave(phase) {
  w0 = phase * TAU;
  if (!far) { buf = new Uint32Array(N); sky(); fuji(); far = buf; }   // (what never moves is painted once)
  buf = far.slice();
  spray();
  farBoat(); slope(); farWave(); nearBoat(); nearWave();
  calm(); greatWave(); crest(); leftBoat(); band(); foreground();
  return buf;
}

// Only the great wave, see-through all round it, for the beach (beach.js): not pressed flat as it is
// on the title, and without its boat or the water in front of it.
export function paintWaveAlone(phase) {
  const was = [SQ, skyline];
  [SQ, skyline] = [.5, 20];
  w0 = phase * TAU; buf = new Uint32Array(N);
  greatWave(true); crest(); band();
  [SQ, skyline] = was;
  return buf;
}

// A moving picture made of one of these: a loop of so many frames, lasting so many seconds (few enough
// frames to look drawn by hand). Each takes a moment to paint, so they're painted one at a time, one per
// call of ready(), and kept; until all are, the first stands still.
export function waveLoop(paint, count, seconds) {
  const frames = [];
  return {
    ready() {
      if (frames.length === count) return;
      const cv = document.createElement('canvas'); cv.width = LW; cv.height = LH;
      const g = cv.getContext('2d'), img = g.createImageData(LW, LH);
      new Uint32Array(img.data.buffer).set(paint(frames.length / count));
      g.putImageData(img, 0, 0); frames.push(cv);
    },
    at(t) { return frames[frames.length < count ? 0 : Math.floor(t / seconds * count) % count]; },
  };
}
