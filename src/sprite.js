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

const SP = {
  K: '#14131f', H: '#3b4a7a',                      // hair, and the blue sheen on it
  S: '#f1c49b', s: '#c98d66', b: '#e9a487', m: '#a8523f',   // skin, skin shadow, blush, mouth
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
const HEAD = [   // the bowl cut, a little ruffled (after the game's cover)
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
  '......KKKKKKKKKKKKKKKKKSSSSSSSSSSSSKKK......',
  '......KKKKKKKKKKKKKKKSSSSSSSSSSSSSSSKK......',
  '......KKKKKKKKKKKKKKKSSSSSSSSSeESSSS........',
  '......KKKKKKKKKKKKKSSSSSSSSSSSEESSSS........',
  '......KKKKKKKKKKKKSsSSSSSSSSSSEESSSS........',
  '.......KKKKKKKKKKsSsSSSSSSSSSSEESSSS........',
  '.......KKKKKKKKKKssSsSSSSSSbbbSSSSSS........',
  '.........KKKKKKKssSSSSSSSSSbbbSSSSS.........',
  '.........KKKKKKKssSSSSSSSSSSSSmmSs..........',
  '...........KKKKsssSSSSSSSSSSSSSss...........',
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
  '..SSs....KKKKKKKssSSSSSSSSSSSSSSSs...Sss....',
  '..SSSss....KKKKsssSSSSSSSSSSSSSss...Ssss....',
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
const FRAMES = {
  stand: [...HEAD, ...TORSO, ...LEGS.stand],
  step1: [...HEAD, ...TORSO, ...LEGS.step1],
  step2: [...HEAD, ...TORSO, ...LEGS.step2],
  balance: [...HEAD, ...BALANCE, ...LEGS.step1],
  jump: [...HEAD.slice(0, 22), ...JUMP],
  dig1: [...Array(6).fill('.'.repeat(FRAME_W)), ...HEAD, ...DIG1],
  dig2: [...Array(6).fill('.'.repeat(FRAME_W)), ...HEAD, ...DIG2],
};
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

// Ichigo's number: big (6×10 digits, for the full-size sprite) and small (3×5, for the 3/4 one).
const FIFTEEN = ['..##..######', '.###..##....', '####..##....', '..##..#####.', '..##..######', '..##......##',
                 '..##......##', '..##..##..##', '..##..######', '..##...####.'];
const FIFTEEN_SMALL = ['.#.###', '##.#..', '.#.##.', '.#...#', '.#.##.'];

// Add a one-pixel outline around a grid of colours (null = see-through), padding it by a pixel.
function outline(grid) {
  const w = grid[0].length, out = [Array(w).fill(null), ...grid.map(r => [...r]), Array(w).fill(null)], h = out.length;
  const filled = (x, y) => y >= 0 && y < h && x >= 0 && x < w && out[y][x] && out[y][x] !== OUTLINE;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++)
    if (!out[y][x] && (filled(x - 1, y) || filled(x + 1, y) || filled(x, y - 1) || filled(x, y + 1))) out[y][x] = OUTLINE;
  return out;
}
// Shrink a grid of colours to k of its size: each new pixel takes the colour that covers most of
// the old pixels under it (see-through only if that's at least half of them; on a tie, the small
// details win: eye, catchlight, mouth, blush).
const DETAIL = [SP.E, SP.e, SP.m, SP.b];
function small(grid, k = .75) {
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
const cache = new Map();
function picture(frame, scars, mini) {
  const key = frame + scars + mini;
  if (cache.has(key)) return cache.get(key);
  const rows = FRAMES[frame];
  const collar = rows.findIndex(r => r.includes('W'));
  let grid = rows.map(r => [...r].map(ch => ch === '.' ? null : SP[ch]));
  let number = null;
  rows.forEach((r, y) => { const x = r.indexOf('n'); if (x >= 0) number = { x, y }; });
  for (let i = 0; i < Math.min(scars, SCARS.length); i++) for (const [dr, c, col] of SCARS[i])
    for (const [dy, dx] of [[0, 0], [0, 1], [1, 0], [1, 1]]) {
      const y = collar + dr + dy, x = c + dx;
      if (grid[y] && grid[y][x]) grid[y][x] = col === null ? null : (SP[col] || col);
    }
  const k = mini ? .75 : 1;
  if (mini) grid = small(grid, k);
  const pic = { grid: outline(grid), anchor: Math.floor(ANCHOR * k), digits: mini ? FIFTEEN_SMALL : FIFTEEN,
                number: number && { x: Math.floor(number.x * k), y: Math.floor(number.y * k) + 1 } };
  cache.set(key, pic); return pic;
}
const mini = () => PIXEL > 1.1;   // full screen: draw Ichigo at 3/4 size
export const spriteHeight = () => picture('stand', 0, mini()).grid.length;

// x = centre, y = feet, in art pixels. face = 1 (right) or -1 (left).
export function drawSprite(g, frame, x, y, face, scars) {
  const { grid, number, anchor, digits } = picture(frame, scars, mini()), h = grid.length, w = grid[0].length;
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
