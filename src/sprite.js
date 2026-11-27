// ============================================================================
// sprite.js — Ichigo, drawn pixel by pixel at the size they're shown (about 20×40 art pixels, plus an
// outline): a sturdy small child, a bit over two heads tall. Bowl cut (a little ruffled, after the game's
// cover), red #15 jersey to the knees, wooden flip-flops, yellow bucket — all from the novel.
// Each frame is a little picture made of letters; each letter is a colour (see SP). Frames face
// right; drawSprite mirrors them. A dark outline is added around every frame automatically.
// ============================================================================
import { P } from './config.js';
import { S } from './state.js';

export const SP = {
  K: '#14131f', H: '#3b4a7a',                      // hair, and the blue sheen on it
  S: '#f1c49b', s: '#c98d66', m: '#a8523f',        // skin, skin shadow, mouth
  c: '#e9a184',                                    // the pink of the cheek
  E: '#14131f', e: '#fdfbf3',                      // eye, and the light in it
  R: '#d2302a', r: '#8c2320', L: '#ec5a44', n: '#d2302a',   // jersey, its shadow, its light ('n' marks where the 15 goes)
  W: P.foam,                                       // collar trim and the number
  B: '#a37b45', D: '#5a4128',                      // wooden flip-flops
  Y: '#f2c53d', y: '#b98b22', h: '#6b6b70',        // the yellow bucket and its handle
  w: P.white,                                      // the glint on the bucket's rim
};
const OUTLINE = '#0b1428';   // the night-blue ink of the cover's line-art
const FRAME_W = 34;          // frame width in art pixels
const ANCHOR = 16;           // the body's centre column (Ichigo's x)

// Rows are padded out to 34 letters (the body sits in the middle 18; arms and bucket can reach past it).
const fit = rows => rows.map(r => r.padEnd(FRAME_W, '.'));
const over = (rows, top, extra) => rows.map((r, y) => (extra[y - top] ? [...r].map((ch, x) => ((extra[y - top][x] ?? '.') === '.' ? ch : extra[y - top][x])).join('') : r));   // lay one picture over another, from row top
const HEAD = fit([   // the bowl cut, full and a little ruffled (after the game's cover); wide eyes, pink cheeks, a small mouth
  '.............KKK.KKK',
  '..........KKKKKKKKKKK.K',
  '.........KKKKKKKKKKKKKKK',
  '.......KKKKKKKKKKKHHHKKKK',
  '......KKKKKKKKKKHHHHKKKKKK',
  '......KKKKKKKKKHHHKKKKKKKKK',
  '.....KKKKKKKKKHHKKKKKKKKKKK',
  '.....KKKKKKKKKKKKKKKKKKKKKK',
  '.....KKKKKKKKKKKKKKKKKKKKKK',
  '.....KKKKKKKKKSKKKSSKKKKKK',
  '.....KKKKKKKKSSSKSSSSKSSKK',
  '......KKKKKKsSSSSSSSSSSSSK',
  '......KKKKKKsSSeESSSSeESSK',
  '......KKKKKssSSEESSSSEESS',
  '.......KKKKsSSSEESSSSEESS',
  '.......KKKKssSccSSSSSSccS',
  '........KK.sssSSSSmmSSSSs',
  '............sssSSSSSSSSs',
  '..............ssSSSSSs',
]);
// the jersey, arms down, the bucket hanging from the front hand
const TORSO = fit([
  '...........rrRWWWWRrr',
  '.........rrRRRRWWRRRRrr',
  '........rrRLLnRRRRRRRRrr',
  '.......rrrRLLRRRRRRRRRrrr',
  '.......rrRRLRRRRRRRRRRRrr',
  '.......rrrRLRRRRRRRRRRrrr',
  '.......SSrRRRRRRRRRRRRrSS',
  '.......SSrRRRRRRRRRRRRrSSs',
  '.......sSrRRRRRRRRRRRRrSSh.hh',
  '........srRRRRRRRRRRRRryyyyyyy',
  '........rrRRRRRRRRRRRRrYweYYYy',
  '........rrRRRRRRRRRRRRrYeYYYYy',
  '........rrRRRRRRRRRRRRrrYeYYy',
  '........rrRRRRRRRRRRRRrrYYYYy',
  '........rrrRRRRRRRRRRrrr',
  '.......rrrrrrRRRRRRrrrrrr',
]);
const LEGS = {
  stand: fit([
    '...........ssss..ssss',
    '...........SSSs..SSSs',
    '...........SSSs..SSSs',
    '............SSs...SSs',
    '...........DBBBB.DBBBB',
    '...........DBBB..DBBB',
  ]),
  step1: fit([
    '..........ssss...ssss',
    '.........SSSs.....SSSs',
    '.........SSSs......SSSs',
    '........SSSs.......SSs',
    '.......DBBBB......DBBBB',
    '.......DBBB.......DBBB',
  ]),
  step2: fit([
    '............ssssssss',
    '...........ssss.SSSs',
    '.........Dsss...SSSs',
    '.........DB......SSs',
    '..........B.....DBBBB',
    '................DBBB',
  ]),
};
// arms out wide, the bucket swinging from one hand
const BALANCE = fit([
  '...........rrRWWWWRrr',
  '.........rrRRRRWWRRRRrr',
  '.....srrrrrRLLnRRRRRRRrrrrs',
  '.SSSSSrrrrRRLLRRRRRRRRrrrrSSSSS',
  '.SSSSSsrrrRRLRRRRRRRRRrrrrsSSSSS',
  '..s......rRRLRRRRRRRRRRr.....h',
  '.........rRRRRRRRRRRRRRr....h.h',
  '.........rRRRRRRRRRRRRRr...h...h',
  '.........rRRRRRRRRRRRRRr..yyyyyyy',
  '........rrRRRRRRRRRRRRRr..YweYYYy',
  '........rrRRRRRRRRRRRRrr..YeYYYYy',
  '........rrRRRRRRRRRRRRrr...YeYYy',
  '........rrRRRRRRRRRRRRrr...YYYYy',
  '........rrRRRRRRRRRRRRrr....yyy',
  '........rrrRRRRRRRRRRrrr',
  '.......rrrrrrRRRRRRrrrrrr',
]);
// in the air: arms flung up, knees bent, the hem flying a little
const JUMP = fit([
  '.......rrrrrrRWWWWRrrrrrr',
  '........rrrRRRRWWRRRRrrr',
  '.........rRRLLnRRRRRRRr',
  '.........rRRLLRRRRRRRRr',
  '.........rRRRLRRRRRRRRr',
  '.........rRRRLRRRRRRRRRr',
  '.........rRRRRRRRRRRRRRr',
  '........rrRRRRRRRRRRRRRr',
  '........rrRRRRRRRRRRRRRrr',
  '........rrRRRRRRRRRRRRRrr',
  '........rrRRRRRRRRRRRRRrr',
  '........rrRRRRRRRRRRRRRrr',
  '.......rrrRRRRRRRRRRRRRrr',
  '.......rrrRRRRRRRRRRRRrrr',
  '.......rrrrrRRRRRRRRrrrrr',
  '........rrr.rrRRRRrr.rrr',
  '.........SSSs.....SSSs',
  '........SSSs.......SSSs',
  '.......DSSs........DBBBB',
  '.......DB..........DBBB',
  '........B',
]);
const ARMS_UP = [   // over the head, from row 9
  '.SS..........................SS',
  '.SSs........................SSs',
  '..SSs.......................SSs',
  '..SSs......................SSs',
  '...SSs.....................SSs',
  '...SSs....................SSs',
  '....SSs..................SSs',
  '.....SSs................SSs',
  '......rrr..............rrr',
  '......rrrr............rrrr',
];
// squatting, scooping sand (below the head)
const DIG1 = fit([
  '...........rrRWWWWRrr',
  '.........rrRRRRWWRRRRrr',
  '........rrRLLnRRRRRRRRrr',
  '.......rrRLLRRRRRRRRRRrrr',
  '.......rRRRLRRRRRRRRRRRrSSs',
  '......rrRRLRRRRRRRRRRRRr.SSs',
  '......rRRRRRRRRRRRRRRRRr..SSs',
  '......rRRRRRRRRRRRRRRRRrr..SSs',
  '.....rrRRRRRRRRRRRRRRRRrr..SSS',
  '......rrrrRRRRRRRRRRrrrr.yyyyyy',
  '.......SSSSsrrrrrrSSSSs.YeYYYy',
  '.......SSSs.......SSSs..YeYYYy',
  '......DBBBBB.....DBBBBB..YYYy',
  '......DBBBB......DBBBB....yy',
]);
const DIG2 = fit([
  '...........rrRWWWWRrr.....SSS',
  '.........rrRRRRWWRRRRrr..SSSS',
  '........rrRLLnRRRRRRRRrr.SSs',
  '.......rrRLLRRRRRRRRRRrrSSs',
  '.......rRRRLRRRRRRRRRRRrSSs',
  '......rrRRLRRRRRRRRRRRRr',
  '......rRRRRRRRRRRRRRRRRr',
  '......rRRRRRRRRRRRRRRRRrr',
  '.....rrRRRRRRRRRRRRRRRRrr',
  '......rrrrRRRRRRRRRRrrrr.yyyyyy',
  '.......SSSSsrrrrrrSSSSs.YeYYYy',
  '.......SSSs.......SSSs..YeYYYy',
  '......DBBBBB.....DBBBBB..YYYy',
  '......DBBBB......DBBBB....yy',
]);
// sitting in the sand (or on the boat's thwart), legs out in front, the bucket in their lap
const SIT = fit([
  '...........rrRWWWWRrr',
  '.........rrRRRRWWRRRRrr',
  '........rrRLLnRRRRRRRRrr',
  '.......rrrRLLRRRRRRRRRrr',
  '.......rrRRLRRRRRRRRRRrr',
  '.......rrrRLRRRRRRRRRRrSS',
  '.......SSrRRRRRRRRRRRRSSS',
  '........SrRRRRRRRRRRRSSh.h',
  '........rRRRRRRRRRRRRyyyyyyy',
  '.......rrRRRRRRRRRRRRYeYYYYy..DB',
  '.......rrRRRRRRRRRRRRYeYYYYy.SDB',
  '......rrrRRRRRRRRRRRRrYYYYySSSDB',
  '......rrrrRRRRRRRRRrrSSSSSSSSSDB',
  '......rrrrrrrrrrrrrrrssssssssssB',
]);
const FRAMES = {
  stand: [...HEAD, ...TORSO, ...LEGS.stand],
  step1: [...HEAD, ...TORSO, ...LEGS.step1],
  step2: [...HEAD, ...TORSO, ...LEGS.step2],
  balance: [...HEAD, ...BALANCE, ...LEGS.step1],
  jump: [...over(HEAD, 9, ARMS_UP), ...JUMP],
  dig1: [...HEAD, ...DIG1],
  dig2: [...HEAD, ...DIG2],
  sit: [...HEAD, ...SIT],
};
// Growing up. From four, Ichigo's legs are two pixels longer (the jersey, which doesn't grow, starts to look short).
function older(frames) {
  const legs = (rows, n = 2) => { const i = rows.length - 4; return [...rows.slice(0, i), ...Array(n).fill(rows[i]), ...rows.slice(i)]; };
  const sit = frames.sit.map(r => { const at = r.includes('D') ? r.indexOf('D') : r.lastIndexOf('B'); return at > 0 ? (r.slice(0, at) + r[at - 1].repeat(2) + r.slice(at)).slice(0, FRAME_W) : r; });   // (legs out in front)
  return { ...frames, stand: legs(frames.stand), step1: legs(frames.step1), step2: legs(frames.step2), balance: legs(frames.balance), jump: legs(frames.jump.slice(0, -1)), sit };
}
const FRAMES4 = older(FRAMES);
// From five, a pixel more of back and of leg: the head is smaller for the rest of them.
function older5(frames) {
  const grow = (rows, at) => [...rows.slice(0, at), rows[at], ...rows.slice(at)], leg = rows => grow(rows, rows.length - 4), back = rows => grow(rows, HEAD.length + 4);
  return { ...frames, stand: leg(back(frames.stand)), step1: leg(back(frames.step1)), step2: leg(back(frames.step2)), balance: leg(back(frames.balance)), jump: back(frames.jump), sit: back(frames.sit), dig1: back(frames.dig1), dig2: back(frames.dig2) };
}
const FRAMES5 = older5(FRAMES4);
// Swimming (Level 6): the jump, turned on its side by drawTurned, legs kicking: in the second frame they're a pixel over.
for (const F of [FRAMES, FRAMES4, FRAMES5]) { const n = F.jump.length; F.kick = F.jump.map((r, i) => (i >= n - 6 ? '.' + r.slice(0, -1) : r)); }
const framesNow = () => { const age = S.as ?? (S.level ? S.level.age : 3); return age >= 5 ? FRAMES5 : age >= 4 ? FRAMES4 : FRAMES; };   // (S.as: younger or older than the level has them, in a journey: story.js)
const HOLDS_BUCKET = ['stand', 'step1', 'step2', 'balance', 'sit'];   // frames where the bucket hangs upright (it can show water, and the shovel)
// The red shovel, standing in the bucket blade up (its handle down inside): drawn from the rim up.
const SPADE = ['RR.', 'RRR', 'RRr', '.Rr', '.R.', '.R.'];
const SPADE_C = { R: P.red, r: P.rust };
// The whale's shoulder blade, from Level 6 on, standing in the bucket in its place: a broad white blade, its knob down inside.
const BLADE = ['wwww', 'wwwm', 'wwmm', '.wm.', '.wm.', '.m..'];
const BLADE_C = { w: P.foam, m: P.grey1 };
// Damage that stays with Ichigo, added one by one with each fall: [rows below the collar, column,
// colour (or null to tear a hole), width, height], in pixels. Measured from the collar so it lands in
// the same place in every frame.
const SCARS = [
  [[9, 11, 'W', 2, 1], [10, 12, 'W', 2, 1], [11, 11, 'W', 1, 1]],        // a salt stain on the jersey
  [[11, 17, 'r', 3, 1], [10, 18, 'r', 1, 3]],                            // a small tear, darned in dark red
  [[-4, 14, 'm', 2, 1], [-3, 15, 'm', 1, 1]],                            // a scratch on the cheek
  [[15, 8, null, 2, 1], [14, 14, null, 1, 2], [15, 15, null, 1, 1], [15, 21, null, 2, 1]],   // the hem torn ragged
  [[6, 7, 'W', 2, 2]],                                                   // a bandage
];
// Permanent marks: they stay with Ichigo from level to level (S.marks, kept in the save), unlike the
// fall marks above. Same [rows below the collar, column, colour, width, height] as SCARS. Some marks
// look different over time: the chin is a red cut, then a strawberry plaster for the rest of Level 1,
// then a pale scar from Level 2 on.
// A few other touches use the same table: Ichigo's lip wobbling, their eyes shut, and water in the bucket.
const MARKS = {
  'chin-cut':     [[-2, 18, P.red, 2, 1]],                               // just fallen on the shovel
  'chin-plaster': [[-2, 17, P.pink, 3, 1], [-1, 17, P.rose, 3, 1], [-2, 18, P.red, 1, 1]],   // Kaa-chan's strawberry plaster (its rose edge keeps it from vanishing into the skin)
  'chin-scar':    [[-2, 18, P.tan, 2, 1]],                               // what's left of it
  'rope':         [[6, 8, P.red, 2, 1, true], [7, 8, P.rust, 2, 1, true], [6, 24, P.red, 2, 1, true], [2, 2, P.red, 1, 3, true]],   // the rope's burn round the wrist (on skin only)
  'asleep':       [[-7, 15, 'S', 2, 3], [-7, 21, 'S', 2, 3], [-5, 14, 'E', 3, 1], [-5, 21, 'E', 3, 1]],   // eyes shut: painted out with skin, and a short lid line put in low down
  'pout':         [[-3, 18, 'S', 2, 1], [-3, 17, 'm', 1, 1], [-4, 18, 'm', 2, 1], [-3, 20, 'm', 1, 1]],   // the lip wobbling (every other frame)
};
// Which permanent marks to draw, from S.marks (the chin shows its plaster in Level 1 and its scar
// after), and the shovel Ichigo carries in the bucket.
export function markIds() {
  const n = S.level ? S.level.number : 1, ids = S.noShovel ? [] : n <= 5 ? ['shovel'] : S.things.has('bone') ? ['bone'] : [];   // (the red one sinks in Level 5; the whale bone is found in Level 6)
  if (S.marks.has('rope') && n >= 5) ids.push('rope');
  if (S.marks.has('chin')) ids.push(S.level && S.level.number === 1 ? 'chin-plaster' : 'chin-scar');
  return ids;
}

const FIFTEEN = ['.#.###', '##.#..', '.#.##.', '.#...#', '.#.##.'];   // Ichigo's number

// Add a one-pixel outline around a grid of colours (null = see-through), padding it by a pixel.
export function outline(grid) {
  const w = grid[0].length, out = [Array(w).fill(null), ...grid.map(r => [...r]), Array(w).fill(null)], h = out.length;
  const filled = (x, y) => y >= 0 && y < h && x >= 0 && x < w && out[y][x] && out[y][x] !== OUTLINE;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++)
    if (!out[y][x] && (filled(x - 1, y) || filled(x + 1, y) || filled(x, y - 1) || filled(x, y + 1))) out[y][x] = OUTLINE;
  return out;
}
// Shrink a grid of colours to k of its size (for the grown-ups, people.js, who are drawn larger): each new pixel takes the colour that covers most of
// the old pixels under it (see-through only if that's at least half of them; on a tie, the small
// details win: eye, catchlight, mouth, eyebrow).
const DETAIL = [SP.E, SP.e, SP.m, P.red, P.pink, P.rose, P.tan, P.rust, SP.K];   // (the chin's marks are details too)
export function small(grid, k = .75) {
  const h = grid.length, w = grid[0].length, H = Math.round(h * k), W = Math.round(w * k), out = [];
  for (let y = 0; y < H; y++) {
    out.push([]);
    for (let x = 0; x < W; x++) {
      const votes = new Map();
      for (let yy = Math.floor(y / k); yy < Math.min(h, Math.ceil((y + 1) / k)); yy++)
        for (let xx = Math.floor(x / k); xx < Math.min(w, Math.ceil((x + 1) / k)); xx++) votes.set(grid[yy][xx], (votes.get(grid[yy][xx]) || 0) + 1);
      let n = 0; for (const v of votes.values()) n += v;
      const score = ([v, c]) => [v !== null && c * 2 >= n ? 1 : 0, c, -(DETAIL.includes(v) ? DETAIL.indexOf(v) : 9)];
      let best = null, bs = null;
      for (const e of votes) { const s = score(e); if (!bs || s[0] > bs[0] || (s[0] === bs[0] && (s[1] > bs[1] || (s[1] === bs[1] && s[2] > bs[2])))) { best = e[0]; bs = s; } }
      out[y].push(best);
    }
  }
  return out;
}

// A frame with its scars painted in and its outline added: a grid of colours (null = see-through).
// Ichigo's hair moving with them: blown back behind them by dx pixels at the crown (less further
// down), and lifted by dy pixels (as they fall, or bounce on a step). It only ever grows outward, so
// it never opens a hole in the bowl cut. (Two empty rows are added on top of every frame, for it to
// lift into.)
function windswept(rows, dx, dy) {
  const g = [Array(FRAME_W).fill('.'), Array(FRAME_W).fill('.'), ...rows.map(r => [...r])];
  const hair = ch => ch === 'K' || ch === 'H', top = g.findIndex(r => r.some(hair));
  if (dx) for (let r = top; r < top + 9; r++) {   // the back of the hair (frames face right, so the left edge) flicks out
    const L = g[r].findIndex(hair), ext = Math.round(dx * (1 - (r - top) / 9) + (r % 3 === 0 ? .4 : 0));
    for (let x = Math.max(0, L - ext); x < L; x++) g[r][x] = 'K';
  }
  if (dy) for (let c = 0; c < FRAME_W; c++) {   // the crown lifts, a strand at a time
    const t = g.findIndex(r => hair(r[c]));
    if (t < 0 || t > top + 2) continue;
    for (let y = t - Math.min(2, dy - (c % 4 === 0 ? 1 : 0)); y < t; y++) g[y][c] = 'K';
  }
  return g.map(r => r.join(''));
}

const cache = new Map();
// marks: ids from MARKS to paint on, plus 'water' for a full bucket.
function picture(frame, scars, [hx, hy] = [0, 0], marks = []) {
  const FR = framesNow(), key = [FR === FRAMES5 ? 5 : FR === FRAMES4 ? 4 : 3, frame, scars, hx, hy, marks.join('+')].join();
  if (cache.has(key)) return cache.get(key);
  const rows = windswept(FR[frame], hx, hy);
  const collar = rows.findIndex(r => r.includes('W'));
  let grid = rows.map(r => [...r].map(ch => ch === '.' ? null : SP[ch]));
  let number = null;
  rows.forEach((r, y) => { const x = r.indexOf('n'); if (x >= 0) number = { x, y }; });
  for (let i = 0; i < Math.min(scars, SCARS.length); i++) for (const [dr, c, col, w, h] of SCARS[i])
    for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) {
      const y = collar + dr + dy, x = c + dx;
      if (grid[y] && grid[y][x]) grid[y][x] = col === null ? null : (SP[col] || col);
    }
  for (const id of marks) for (const [dr, c, col, w, h, skin] of MARKS[id] || [])
    for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) {
      const y = collar + dr + dy, x = c + dx;
      if (grid[y] && grid[y][x] && (!skin || grid[y][x] === SP.S || grid[y][x] === SP.s)) grid[y][x] = SP[col] || col;
    }
  if (HOLDS_BUCKET.includes(frame)) {
    const y = rows.findIndex(r => r.includes('yyyyy')), x0 = rows[y].indexOf('yyyyy'), x1 = rows[y].lastIndexOf('y');   // the bucket's rim
    if (marks.includes('water')) for (let x = x0 + 1; x < x1; x++) grid[y][x] = x === x0 + 2 ? P.aqua : P.sea;   // a full bucket: water inside its rim
    if (marks.includes('shovel')) SPADE.forEach((r, j) => [...r].forEach((ch, i) => {   // the shovel standing in it
      const yy = y - SPADE.length + j, xx = x1 - 3 + i;
      if (ch !== '.' && grid[yy] && xx < grid[yy].length) grid[yy][xx] = SPADE_C[ch];
    }));
    if (marks.includes('bone')) BLADE.forEach((r, j) => [...r].forEach((ch, i) => {   // or the whale bone
      const yy = y - BLADE.length + j, xx = x1 - 4 + i;
      if (ch !== '.' && grid[yy] && xx < grid[yy].length) grid[yy][xx] = BLADE_C[ch];
    }));
  }
  const pic = { grid: outline(grid), anchor: ANCHOR, number: number && { x: number.x, y: number.y + 2 } };   // (the outline adds a row on top)
  cache.set(key, pic); return pic;
}
export const spriteHeight = () => picture('stand', 0).grid.length;

// x = centre, y = feet, in art pixels. face = 1 (right) or -1 (left). hair = [how far it's blown
// back, how far it's lifted], in pixels (see windswept).
// marks: what else to paint on (see MARKS; usually markIds(), plus 'water' when the bucket is full).
export function drawSprite(g, frame, x, y, face, scars, hair, marks) {
  const digits = FIFTEEN, { grid, number, anchor } = picture(frame, scars, hair, marks), h = grid.length, w = grid[0].length;
  const ox = Math.round(x), oy = Math.round(y) - h + 1;   // the outline under the feet hangs one pixel below
  const col = c => face > 0 ? ox + c - anchor : ox + anchor - c;
  for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) {
    const v = grid[r][c];
    if (!v) continue;
    g.fillStyle = v; g.fillRect(col(c), oy + r, 1, 1);
  }
  if (number) {   // the 15 on the chest, outlined in dark red: always reads left to right, whichever way Ichigo faces
    const nx = face > 0 ? col(number.x) : col(number.x + digits[0].length - 1), ny = oy + number.y;
    const ink = (r, c) => digits[r] && digits[r][c] === '#';
    g.fillStyle = SP.r;
    digits.forEach((row, r) => [...row].forEach((ch, c) => {
      if (ch !== '#' && (ink(r - 1, c) || ink(r + 1, c) || ink(r, c - 1) || ink(r, c + 1))) g.fillRect(nx + c, ny + r, 1, 1);
    }));
    g.fillStyle = SP.W;
    digits.forEach((row, r) => [...row].forEach((ch, c) => { if (ch === '#') g.fillRect(nx + c, ny + r, 1, 1); }));
  }
}

// Ichigo turned: turn 1 is on their side, head first the way they face (swimming along); 2 is upside down (diving);
// 0 is as they are. x, y: the middle of them, in pixels. (The 15 isn't drawn: it's on their back now.)
const turned = new Map();
export function drawTurned(g, frame, x, y, turn, face, scars, hair, marks) {
  const { grid } = picture(frame, scars, hair, marks);
  let pic = turned.get(grid) && turned.get(grid)[turn];
  if (!pic) {
    const h = grid.length, w = grid[0].length;
    pic = turn === 1 ? Array.from({ length: w }, (_, r) => Array.from({ length: h }, (_, c) => grid[h - 1 - c][r]))   // a quarter turn, head to the right
      : turn === 2 ? grid.map(r => [...r].reverse()).reverse() : grid;
    // (trimmed to what's drawn, so it turns about its middle)
    const rows = pic.map((r, i) => (r.some(Boolean) ? i : -1)).filter(i => i >= 0), cols = pic[0].map((_, c) => (pic.some(r => r[c]) ? c : -1)).filter(c => c >= 0);
    pic = pic.slice(rows[0], rows[rows.length - 1] + 1).map(r => r.slice(cols[0], cols[cols.length - 1] + 1));
    if (!turned.has(grid)) turned.set(grid, []); turned.get(grid)[turn] = pic;
  }
  const h = pic.length, w = pic[0].length, ox = Math.round(x - w / 2), oy = Math.round(y - h / 2);
  for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) { const v = pic[r][c]; if (v) { g.fillStyle = v; g.fillRect(face > 0 ? ox + c : ox + w - 1 - c, oy + r, 1, 1); } }
}
