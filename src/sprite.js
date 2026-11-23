// ============================================================================
// sprite.js — Ichigo, drawn pixel by pixel at full size (about 36×56 art pixels, plus an outline).
// Bowl cut (a little ruffled, after the game's cover), red #15 jersey to the knees, wooden
// flip-flops, yellow bucket — all from the novel.
// Each frame is a little picture made of letters; each letter is a colour (see SP). Frames face
// right; drawSprite mirrors them. A dark outline is added around every frame automatically.
// In full screen (where each pixel covers 4/3 as much of the world) Ichigo is shrunk to 3/4 size
// to keep their size in the world: see small().
// ============================================================================
import { P, PIXEL } from './config.js';
import { S } from './state.js';

export const SP = {
  K: '#14131f', H: '#3b4a7a',                      // hair, and the blue sheen on it
  S: '#f1c49b', s: '#c98d66', m: '#a8523f',        // skin, skin shadow, mouth
  E: '#14131f', e: '#fdfbf3',                      // eye, and the light in it
  R: '#d2302a', r: '#8c2320', L: '#ec5a44', n: '#d2302a',   // jersey, its shadow, its light ('n' marks where the 15 goes)
  W: P.foam,                                       // collar trim and the number
  B: '#a37b45', D: '#5a4128',                      // wooden flip-flops
  Y: '#f2c53d', y: '#b98b22', h: '#6b6b70',        // the yellow bucket and its handle
};
const OUTLINE = '#0b1428';   // the night-blue ink of the cover's line-art
const FRAME_W = 44;          // frame width in art pixels
const ANCHOR = 22;           // the body's centre column (Ichigo's x)

// Every row is 44 letters wide (the body sits in the middle 36; arms and bucket can reach past it).
const HEAD = [   // the bowl cut, a little ruffled (after the game's cover); the face puzzled: a slanting eyebrow, a wavy mouth
  '..............KKKKK..KKKK...................',
  '............KKKKKKKKKKKKKKK.................',
  '..........KKKKKKKKKKKKKKHHKKKK..............',
  '.........KKKKKKKKKKKKKKKKKKKKKKK............',
  '........KKKKKKKKKKKKKHHHHHHHKKK.............',
  '.......KKKKKKKKKKKKHHHHHHHHHKKKKK...........',
  '......KKKKKKKKKKKKHHHHHKKKKKKKKKK...........',
  '......KKKKKKKKKKKKHHHKKKKKKKKKKKKKK.........',
  '......KKKKKKKKKKKKKKKKKKKKKKKKKKKKK.........',
  '......KKKKKKKKKKKKKKKKKKKKKKKKKKKKKK........',
  '......KKKKKKKKKKKKKKKKKKKKKKKKKKKKKK........',
  '......KKKKKKKKKKKKKKKKKKKKKKKKKKKKKK........',
  '......KKKKKKKKKKKKKKKKKKKKKKKKKKKKKK........',
  '......KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK.......',
  '......KKKKKKKKKKKKKKKKKSSSSSSSSKKSSKKK......',
  '......KKKKKKKKKKKKKKKSSSSSSSSKKSSSSSKK......',
  '......KKKKKKKKKKKKKKKSSSSSSSSSeESSSS........',
  '......KKKKKKKKKKKKKSSSSSSSSSSSEESSSS........',
  '......KKKKKKKKKKKKSsSSSSSSSSSSEESSSS........',
  '.......KKKKKKKKKKsSsSSSSSSSSSSEESSSS........',
  '.......KKKKKKKKKKssSsSSSSSSSSSSSSSSS........',
  '.........KKKKKKKssSSSSSSSSSSSSSSSSS.........',
  '.........KKKKKKKssSSSSSSSSSSmSmSSs..........',
  '...........KKKKsssSSSSSSSSSSSmSms...........',
  '..............ssssSSSSSSSSSSSSSss...........',
  '...............ssssSSSSSSSSSSSs.............',
  '.................ssSSSSSSs..................',
  '..................ssSSSSss..................',
];
// the jersey, arms down, the bucket hanging from the front hand
const TORSO = [
  '.............rRRRRWWWWWWRRRRr...............',
  '...........rrRRRRRRWWWWRRRRRRrr.............',
  '...........rrRLLnRRRRRRRRRRRRrr.............',
  '.........rrRRLLLRRRRRRRRRRRRRRRrr...........',
  '.........rrRLLLRRRRRRRRRRRRRRRRrr...........',
  '........rrRRLLRRRRRRRRRRRRRRRRRRrr..........',
  '........rrRRLLRRRRRRRRRRRRRRRRRRrr..........',
  '........rrrRLLRRRRRRRRRRRRRRRRRrrr..........',
  '........SrrRRRRRRRRRRRRRRRRRRRRrrS..........',
  '........SSrrRRRRRRRRRRRRRRRRRRrrSS..........',
  '........SSrrRRRRRRRRRRRRRRRRRRrrSS..........',
  '........SSSrRRRRRRRRRRRRRRRRRRrSSS..........',
  '........SSSSRRRRRRRRRRRRRRRRRRSSSSh.........',
  '.........SSSRRRRRRRRRRRRRRRRRRSSSShhhhhh....',
  '..........rrRRRRRRRRRRRRRRRRRRrr..h.....hh..',
  '..........rrRRRRRRRRRRRRRRRRRRrr..h.......h.',
  '..........rrRRRRRRRRRRRRRRRRRRrr..yyyyyyyyy.',
  '..........rrRRRRRRRRRRRRRRRRRRrr..YeYYYYYYy.',
  '..........rrRRRRRRRRRRRRRRRRRRrr..YeYYYYYYy.',
  '..........rrrRRRRRRRRRRRRRRRRrrr...YeYYYYy..',
  '..........rrrrrRRRRRRRRRRRRrrrrr...YYYYYYy..',
  '...........rrrrrRRRRRRRRRRrrrrr.....yyyyy...',
];
const LEGS = {
  stand: [
    '..............SSss....SSss..................',
    '..............SSss....SSss..................',
    '..............SSss....SSss..................',
    '..............SSss....SSss..................',
    '............DDBBBB..DDBBBB..................',
    '............DDBBB...DDBBB...................',
  ],
  step1: [
    '............SSss......SSss..................',
    '...........SSss........SSss.................',
    '...........SSss........SSss.................',
    '..........SSss..........SSss................',
    '........DDBBBB..........DDBBBB..............',
    '........DDBBB............DBBBB..............',
  ],
  step2: [
    '................SSssSS......................',
    '................SSssS.S.....................',
    '................SSss.S.Ss...................',
    '................SSss..SSss..................',
    '..............DDBBBB..DDBBBB................',
    '..............DDBBB....DBBBB................',
  ],
};
// arms out wide, the bucket swinging from one hand
const BALANCE = [
  '.............rRRRRWWWWWWRRRRr...............',
  '...........rrRRRRRRWWWWRRRRRRrr.............',
  '...........rrRLLnRRRRRRRRRRRRrr.............',
  '..........rrRRLLRRRRRRRRRRRRRRRrr...........',
  '...SSSSSssrrRRLLRRRRRRRRRRRRRRRrrrssSSSSS...',
  '..SSSSSSssrrRRLLRRRRRRRRRRRRRRRRrrssSSSSSS..',
  '..ss......rrRRLLRRRRRRRRRRRRRRRRrr.....h....',
  '..ss......rrRRLLRRRRRRRRRRRRRRRrr.....h.h...',
  '..........rrRRRRRRRRRRRRRRRRRRRrr....h...h..',
  '..........rrRRRRRRRRRRRRRRRRRRrr....yyyyyyy.',
  '..........rrRRRRRRRRRRRRRRRRRRrr....YeYYYYy.',
  '..........rrRRRRRRRRRRRRRRRRRRrr....YeYYYYy.',
  '..........rrRRRRRRRRRRRRRRRRRRrr.....YeYYy..',
  '..........rrRRRRRRRRRRRRRRRRRRrr......yyy...',
  '..........rrRRRRRRRRRRRRRRRRRRrr......yyyyy.',
  '..........rrRRRRRRRRRRRRRRRRRRrr.......yy...',
  '..........rrRRRRRRRRRRRRRRRRRRrr............',
  '..........rrRRRRRRRRRRRRRRRRRRrr............',
  '..........rrRRRRRRRRRRRRRRRRRRrr............',
  '..........rrrRRRRRRRRRRRRRRRRrrr............',
  '..........rrrrrRRRRRRRRRRRRrrrrr............',
  '...........rrrrrRRRRRRRRRRrrrrr.............',
];
// arms flung up (below the top of the head)
const JUMP = [
  '..SSs....KKKKKKKssSSSSSSSSSSmSmSSs...Sss....',
  '..SSSss....KKKKsssSSSSSSSSSSSmSms...Ssss....',
  '...SSss.......ssssSSSSSSSSSSSSSss..SSss.....',
  '.....SSss......ssssSSSSSSSSSSSs..SSss.......',
  '.....SSss........ssSSSSSSs.......SSss.......',
  '.......SSs........ssSSSSss.....SSss.........',
  '.......SSSrrRRRRWWWWWWRRRRr....SSss.........',
  '.........SrrRRRRRWWWWRRRRRRr..SSs...........',
  '..........rrRRLLnRRRRRRRRRRRRRrr............',
  '..........rrRRLLRRRRRRRRRRRRRRrr............',
  '..........rrRRLLRRRRRRRRRRRRRRrr............',
  '..........rrRRLLRRRRRRRRRRRRRRrr............',
  '..........rrRRLLRRRRRRRRRRRRRRrr............',
  '..........rrRRLLRRRRRRRRRRRRRRrr............',
  '..........rrRRRRRRRRRRRRRRRRRRrr............',
  '..........rrRRRRRRRRRRRRRRRRRRrr............',
  '..........rrRRRRRRRRRRRRRRRRRRrr............',
  '..........rrRRRRRRRRRRRRRRRRRRrr............',
  '..........rrRRRRRRRRRRRRRRRRRRrr............',
  '..........rrRRRRRRRRRRRRRRRRRRrr............',
  '..........rrRRRRRRRRRRRRRRRRRRrr............',
  '..........rrrRRRRRRRRRRRRRRRRrrr............',
  '..........rrrrrRRRRRRRRRRRRrrrrr............',
  '...........rrrrrRRRRRRRRRRrrrrr.............',
  '............SSssSSSSssss....................',
  '............SSssSSSSssss....................',
  '..........DDBBBB....DDBBBB..................',
  '..........DDBBB......DBBBB..................',
  '............................................',
  '............................................',
  '............................................',
  '............................................',
];
// squatting, scooping sand (below the head)
const DIG1 = [
  '.............rRRRRWWWWWWRRRRr...............',
  '...........rrRRRRRRWWWWRRRRRRrr.............',
  '...........rrRLLnRRRRRRRRRRRRrr.............',
  '.........rrRRLLLRRRRRRRRRRRRRRRr............',
  '.........rrRLLLRRRRRRRRRRRRRRRRRSSss........',
  '........rrRRLLRRRRRRRRRRRRRRRRRRSSss........',
  '........rrRRLLRRRRRRRRRRRRRRRRRr....SSs.....',
  '........rrRRLLRRRRRRRRRRRRRRRRrr....SSSs....',
  '........rrRRRRRRRRRRRRRRRRRRRRrr.....SSSSS..',
  '.......rrRRRRRRRRRRRRRRRRRRRRRRrr......SSS..',
  '.......rRRRRRRRRRRRRRRRRRRRRRRRRr...........',
  '......rrRRRRRRRRRRRRRRRRRRRRRRRRrr..........',
  '......rrrrrRRRRRRRRRRRRRRRRRRrrrrrYYYYYYY...',
  '.......rrrrrRRRRRRRRRRRRRRRRrrrrrrYYYYYYYY..',
  '........SSssSSSS......SSssSSSS....YYYYYYYy..',
  '........SSssSSS.......SSssSSSS.....YYYYyy...',
  '......DDBBBBBB........DDBBBBBB......yyyyy...',
  '......DDBBBBB..........DBBBBB........yy.....',
];
const DIG2 = [
  '.............rRRRRWWWWWWRRRRr........SSS....',
  '...........rrRRRRRRWWWWRRRRRRrr....SSSSS....',
  '...........rrRLLnRRRRRRRRRRRRrr....SSs......',
  '.........rrRRLLLRRRRRRRRRRRRRRRr.SSss.......',
  '.........rrRLLLRRRRRRRRRRRRRRRRRSSSss.......',
  '........rrRRLLRRRRRRRRRRRRRRRRRRSSs.........',
  '........rrRRLLRRRRRRRRRRRRRRRRRr............',
  '........rrRRLLRRRRRRRRRRRRRRRRrr............',
  '........rrRRRRRRRRRRRRRRRRRRRRrr............',
  '.......rrRRRRRRRRRRRRRRRRRRRRRRrr...........',
  '.......rRRRRRRRRRRRRRRRRRRRRRRRRr...........',
  '......rrRRRRRRRRRRRRRRRRRRRRRRRRrr..........',
  '......rrrrrRRRRRRRRRRRRRRRRRRrrrrrYYYYYYY...',
  '.......rrrrrRRRRRRRRRRRRRRRRrrrrrrYYYYYYYY..',
  '........SSssSSSS......SSssSSSS....YYYYYYYy..',
  '........SSssSSS.......SSssSSSS.....YYYYyy...',
  '......DDBBBBBB........DDBBBBBB......yyyyy...',
  '......DDBBBBB..........DBBBBB........yy.....',
];
// sitting in the sand (or on the boat's thwart), legs out in front, the bucket in their lap
const SIT = [
  '.............rRRRRWWWWWWRRRRr...............',
  '...........rrRRRRRRWWWWRRRRRRrr.............',
  '...........rrRLLnRRRRRRRRRRRRrr.............',
  '.........rrRRLLLRRRRRRRRRRRRRRRrr...........',
  '.........rrRLLLRRRRRRRRRRRRRRRRrr...........',
  '........rrRRLLRRRRRRRRRRRRRRRRRRrr..........',
  '........rrRRLLRRRRRRRRRRRRRRRRRRrr..........',
  '........rrrRLLRRRRRRRRRRRRRRRRRRrSS.........',
  '........rrRRRRRRRRRRRRRRRRRRRRRRSSSS........',
  '.......rrRRRRRRRRRRRRRRRRRRRRRRSSShhhhh.....',
  '.......rrRRRRRRRRRRRRRRRRRRRRRrSSyyyyyyyy...',
  '......rrRRRRRRRRRRRRRRRRRRRRRRrSSYeYYYYYy...',
  '......rrrRRRRRRRRRRRRRRRRRRRRrrSSYeYYYYYy...',
  '......rrrrrRRRRRRRRRRRRRRRRRRrrrSYYYYYYy....',
  '.......rrrrrrRRRRRRRRRRRRRRRrrSSSyyyyyySSBB.',
  '........rrrrrrrrrrrrrrrrrrrrrSSSSSSSSSSsDBB.',
];
const FRAMES = {
  stand: [...HEAD, ...TORSO, ...LEGS.stand],
  step1: [...HEAD, ...TORSO, ...LEGS.step1],
  step2: [...HEAD, ...TORSO, ...LEGS.step2],
  balance: [...HEAD, ...BALANCE, ...LEGS.step1],
  jump: [...HEAD.slice(0, 22), ...JUMP],
  dig1: [...Array(6).fill('.'.repeat(FRAME_W)), ...HEAD, ...DIG1],
  dig2: [...Array(6).fill('.'.repeat(FRAME_W)), ...HEAD, ...DIG2],
  sit: [...HEAD, ...SIT],
};
const HOLDS_BUCKET = ['stand', 'step1', 'step2', 'balance', 'sit'];   // frames where the bucket hangs upright (it can show water)
// Damage that stays with Ichigo, added one by one with each fall: [rows below the collar, column,
// colour (or null to tear a hole)], each mark a 2×2 block. Measured from the collar so it lands in
// the same place in every frame.
const SCARS = [
  [[16, 14, 'W'], [18, 16, 'W']],             // a salt stain on the jersey
  [[6, 24, '#1f3b6b'], [6, 26, '#1f3b6b']],   // a patch
  [[-8, 30, 'r']],                            // a scratch on the cheek
  [[20, 14, null], [20, 22, null], [20, 28, null]],   // the hem torn ragged
  [[8, 12, 'W']],                             // a bandage
];
// Permanent marks: they stay with Ichigo from level to level (S.marks, kept in the save), unlike the
// fall marks above. Same [rows below the collar, column, colour] as SCARS, plus an optional size
// (width, height; 2×2 if left out). Some marks look different over time: the chin is a red cut, then
// a strawberry plaster for the rest of Level 1, then a pale scar from Level 2 on.
// A few other touches use the same table: Ichigo's lip wobbling, and water in the bucket.
const MARKS = {
  'chin-cut':     [[-4, 27, P.red]],                                   // just fallen on the shovel
  'chin-plaster': [[-4, 26, P.pink, 3, 2], [-3, 26, P.rose, 3, 1], [-4, 28, P.red, 1, 1]],   // Kaa-chan's strawberry plaster (its rose edge keeps it from vanishing into the skin)
  'chin-scar':    [[-3, 27, P.tan, 2, 1]],                             // what's left of it
  'pout':         [[-6, 28, 'S', 3, 1], [-6, 29, 'm', 1, 1], [-5, 28, 'm', 1, 1], [-5, 29, 'S', 1, 1], [-5, 30, 'm', 1, 1], [-5, 31, 'S', 1, 1]],   // the lip wobbling (every other frame)
};
// Which permanent marks to draw, from S.marks. The chin shows its plaster in Level 1 and its scar after.
export function markIds() {
  const ids = [];
  if (S.marks.has('chin')) ids.push(S.level && S.level.number === 1 ? 'chin-plaster' : 'chin-scar');
  return ids;
}

// Ichigo's number: big (6×10 digits, for the full-size sprite) and small (3×5, for the 3/4 one).
const FIFTEEN = ['..##..######', '.###..##....', '####..##....', '..##..#####.', '..##..######', '..##......##',
                 '..##......##', '..##..##..##', '..##..######', '..##...####.'];
const FIFTEEN_SMALL = ['.#.###', '##.#..', '.#.##.', '.#...#', '.#.##.'];

// Add a one-pixel outline around a grid of colours (null = see-through), padding it by a pixel.
export function outline(grid) {
  const w = grid[0].length, out = [Array(w).fill(null), ...grid.map(r => [...r]), Array(w).fill(null)], h = out.length;
  const filled = (x, y) => y >= 0 && y < h && x >= 0 && x < w && out[y][x] && out[y][x] !== OUTLINE;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++)
    if (!out[y][x] && (filled(x - 1, y) || filled(x + 1, y) || filled(x, y - 1) || filled(x, y + 1))) out[y][x] = OUTLINE;
  return out;
}
// Shrink a grid of colours to k of its size: each new pixel takes the colour that covers most of
// the old pixels under it (see-through only if that's at least half of them; on a tie, the small
// details win: eye, catchlight, mouth, eyebrow).
const DETAIL = [SP.E, SP.e, SP.m, P.red, P.pink, P.rose, P.tan, SP.K];   // (the chin's marks are details too)
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
  if (dx) for (let r = top; r < top + 11; r++) {   // the back of the hair (frames face right, so the left edge) flicks out
    const L = g[r].findIndex(hair), ext = Math.round(dx * (1 - (r - top) / 11) + (r % 3 === 0 ? .4 : 0));
    for (let x = Math.max(0, L - ext); x < L; x++) g[r][x] = 'K';
  }
  if (dy) for (let c = 0; c < FRAME_W; c++) {   // the crown lifts, a strand at a time
    const t = g.findIndex(r => hair(r[c]));
    if (t < 0 || t > top + 3) continue;
    for (let y = t - Math.min(2, dy - (c % 4 === 0 ? 1 : 0)); y < t; y++) g[y][c] = 'K';
  }
  return g.map(r => r.join(''));
}

const cache = new Map();
// marks: ids from MARKS to paint on, plus 'water' for a full bucket.
function picture(frame, scars, mini, [hx, hy] = [0, 0], marks = []) {
  const key = [frame, scars, mini, hx, hy, marks.join('+')].join();
  if (cache.has(key)) return cache.get(key);
  const rows = windswept(FRAMES[frame], hx, hy);
  const collar = rows.findIndex(r => r.includes('W'));
  let grid = rows.map(r => [...r].map(ch => ch === '.' ? null : SP[ch]));
  let number = null;
  rows.forEach((r, y) => { const x = r.indexOf('n'); if (x >= 0) number = { x, y }; });
  for (let i = 0; i < Math.min(scars, SCARS.length); i++) for (const [dr, c, col] of SCARS[i])
    for (const [dy, dx] of [[0, 0], [0, 1], [1, 0], [1, 1]]) {
      const y = collar + dr + dy, x = c + dx;
      if (grid[y] && grid[y][x]) grid[y][x] = col === null ? null : (SP[col] || col);
    }
  for (const id of marks) for (const [dr, c, col, w = 2, h = 2] of MARKS[id] || [])
    for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) {
      const y = collar + dr + dy, x = c + dx;
      if (grid[y] && grid[y][x]) grid[y][x] = SP[col] || col;
    }
  if (marks.includes('water') && HOLDS_BUCKET.includes(frame)) {   // a full bucket: water showing inside its rim
    const y = rows.findIndex(r => r.includes('yyyyy')), x0 = rows[y].indexOf('yyyyy'), x1 = rows[y].lastIndexOf('y');
    for (let x = x0 + 1; x < x1; x++) grid[y][x] = x === x0 + 2 ? P.aqua : P.sea;
  }
  const k = mini ? .75 : 1;
  if (mini) grid = small(grid, k);
  const pic = { grid: outline(grid), anchor: Math.floor(ANCHOR * k), digits: mini ? FIFTEEN_SMALL : FIFTEEN,
                number: number && { x: Math.floor(number.x * k), y: Math.floor(number.y * k) + 1 } };
  cache.set(key, pic); return pic;
}
const mini = () => PIXEL > 1.1;   // full screen: draw Ichigo at 3/4 size
export const spriteHeight = () => picture('stand', 0, mini()).grid.length;

// x = centre, y = feet, in art pixels. face = 1 (right) or -1 (left). hair = [how far it's blown
// back, how far it's lifted], in pixels (see windswept).
// marks: what else to paint on (see MARKS; usually markIds(), plus 'water' when the bucket is full).
export function drawSprite(g, frame, x, y, face, scars, hair, marks) {
  const { grid, number, anchor, digits } = picture(frame, scars, mini(), hair, marks), h = grid.length, w = grid[0].length;
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
