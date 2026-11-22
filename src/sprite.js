// ============================================================================
// sprite.js — Ichigo, drawn pixel by pixel at full size (about 18×28 art pixels, plus an outline).
// Bowl cut, red #15 jersey to the knees, wooden flip-flops, yellow bucket — all from the novel.
// Each frame is a little picture made of letters; each letter is a colour (see SP). Frames face
// right; drawSprite mirrors them. A dark outline is added around every frame automatically.
// ============================================================================
import { P } from './config.js';

const SP = {
  K: '#1b1a26', H: '#3d4260',                      // hair, and its shine
  S: '#f1c49b', s: '#c98d66', b: '#f1c49b', E: '#1b1a26',   // skin, skin shadow, blush, eye
  R: '#c8352b', r: '#8c2320', L: '#e8604a', n: '#c8352b',   // jersey, its shadow, its light ('n' marks where the 15 goes)
  W: P.foam,                                       // collar trim and the number
  B: '#a37b45', D: '#5a4128',                      // wooden flip-flops
  Y: '#f2c53d', y: '#b98b22', h: '#6b6b70',        // the yellow bucket and its handle
};
const OUTLINE = P.outline;   // the same navy ink that outlines the waves and boats
export const SPRITE_W = 22, SPRITE_H = 30;          // frame size in art pixels, outline included
const ANCHOR = 11;                                  // the body's centre column (Ichigo's x)

// Every row is 22 letters wide (the body sits in the middle 18; arms and bucket can reach past it).
const HEAD = [
  '.......KKKKKK.........',
  '.....KKKKKKKKKK.......',
  '....KKKKKKHHHHKK......',
  '...KKKKKKHHKKKKKK.....',
  '...KKKKKKKKKKKKKKK....',
  '...KKKKKKKKKKKKKKK....',
  '...KKKKKKKKKKKKKKK....',
  '...KKKKKKKKSSSSSSSK...',
  '...KKKKKKKSSSSSESS....',
  '...KKKKKKsSSSSSESS....',
  '....KKKKsSSSSSbSSS....',
  '.....KKKsSSSSSSSs.....',
  '.......ssSSSSSSs......',
  '.........sSSs.........',
];
// the jersey, arms down, bucket in the front hand
const TORSO = [
  '......rRRWWWRRr.......',
  '.....rRLnRRRRRRr......',
  '....rRLRRRRRRRRRr.....',
  '....rRLRRRRRRRRRr.....',
  '....SrRRRRRRRRRrS.....',
  '....SrRRRRRRRRRrS.....',
  '....SSRRRRRRRRRSSh....',
  '.....rRRRRRRRRRr.hYYYY',
  '.....rRRRRRRRRRr..YYYy',
  '.....rRRRRRRRRRr..YYYy',
  '.....rrrRRRRRrrr...yy.',
];
const LEGS = {
  stand: ['.......Ss..Ss.........', '.......Ss..Ss.........', '......DBB.DBB.........'],
  step1: ['......Ss...Ss.........', '.....Ss.....Ss........', '....DBB.....DBB.......'],
  step2: ['........SsS...........', '........Ss.Ss.........', '.......DBB.DBB........'],
  tuck:  ['......SsSSss..........', '......DBB.DBB.........', '......................'],
};
const FRAMES = {
  stand: [...HEAD, ...TORSO, ...LEGS.stand],
  step1: [...HEAD, ...TORSO, ...LEGS.step1],
  step2: [...HEAD, ...TORSO, ...LEGS.step2],
  balance: [...HEAD,   // arms out wide, the bucket swinging from one hand
    '......rRRWWWRRr.......',
    '.....rRLnRRRRRRr......',
    '.SSSsrRLRRRRRRRRrsSSS.',
    '.s...rRLRRRRRRRRr..hh.',
    '.....rRRRRRRRRRr..YYYY',
    '.....rRRRRRRRRRr..YYYy',
    '.....rRRRRRRRRRr..YYYy',
    '.....rRRRRRRRRRr...yy.',
    '.....rRRRRRRRRRr......',
    '.....rRRRRRRRRRr......',
    '.....rrrRRRRRrrr......',
    ...LEGS.step1],
  jump: [...HEAD.slice(0, 11),   // arms flung up
    '.Ss..KKKsSSSSSSSs.Ss..',
    '..Ss...ssSSSSSSs.Ss...',
    '...Ss....sSSs...Ss....',
    '....SrRRWWWRRr.Ss.....',
    '.....rRLnRRRRRRr......',
    '.....rRLRRRRRRRr......',
    '.....rRLRRRRRRRr......',
    '.....rRRRRRRRRRr......',
    '.....rRRRRRRRRRr......',
    '.....rRRRRRRRRRr......',
    '.....rRRRRRRRRRr......',
    '.....rrrRRRRRrrr......',
    '......SsSSss..........',
    '.....DBB..DBB.........',
    '......................',
    '......................'],
  dig1: ['......................', '......................', '......................', ...HEAD,   // squatting, scooping sand
    '......rRRWWWRRr.......',
    '.....rRLnRRRRRRr......',
    '....rRLRRRRRRRRRSs....',
    '....rRLRRRRRRRRr..Ss..',
    '....rRRRRRRRRRRr...SS.',
    '...rRRRRRRRRRRRRr.....',
    '...rrrRRRRRRRRrrrYYYY.',
    '....SsSS...SsSS..YYYy.',
    '...DBBB....DBBB...yy..'],
  dig2: ['......................', '......................', '......................', ...HEAD,
    '......rRRWWWRRr...SS..',
    '.....rRLnRRRRRRr.Ss...',
    '....rRLRRRRRRRRRSs....',
    '....rRLRRRRRRRRr......',
    '....rRRRRRRRRRRr......',
    '...rRRRRRRRRRRRRr.....',
    '...rrrRRRRRRRRrrrYYYY.',
    '....SsSS...SsSS..YYYy.',
    '...DBBB....DBBB...yy..'],
};
// Damage that stays with Ichigo, added one by one with each fall: [rows below the collar, column,
// colour (or null to tear a hole)]. Measured from the collar so it lands in the same place in every frame.
const SCARS = [
  [[8, 7, 'W'], [9, 8, 'W']],               // a salt stain on the jersey
  [[3, 12, '#1f3b6b'], [3, 13, '#1f3b6b']], // a patch
  [[-4, 15, 'r']],                          // a scratch on the cheek
  [[10, 7, null], [10, 11, null], [10, 14, null]],   // the hem torn ragged
  [[4, 6, 'W']],                            // a bandage
];

// A frame with its scars painted in and its outline added: a grid of colours (null = see-through).
const cache = new Map();
function picture(frame, scars) {
  const key = frame + scars;
  if (cache.has(key)) return cache.get(key);
  const rows = FRAMES[frame];
  const collar = rows.findIndex(r => r.includes('W'));
  const grid = rows.map(r => [...r].map(ch => ch === '.' ? null : SP[ch]));
  let number = null;
  rows.forEach((r, y) => { const x = r.indexOf('n'); if (x >= 0) number = { x, y }; });
  for (let i = 0; i < Math.min(scars, SCARS.length); i++) for (const [dr, c, col] of SCARS[i]) {
    const y = collar + dr;
    if (grid[y] && grid[y][c]) grid[y][c] = col === null ? null : (SP[col] || col);
  }
  // pad by one pixel all round, then outline every empty pixel that touches the body
  const h = grid.length + 2, w = SPRITE_W, out = [];
  for (let y = 0; y < h; y++) {
    out.push([]);
    for (let x = 0; x < w; x++) out[y].push((grid[y - 1] && grid[y - 1][x]) || null);
  }
  const filled = (x, y) => y >= 0 && y < h && x >= 0 && x < w && out[y][x] && out[y][x] !== OUTLINE;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++)
    if (!out[y][x] && (filled(x - 1, y) || filled(x + 1, y) || filled(x, y - 1) || filled(x, y + 1))) out[y][x] = OUTLINE;
  const pic = { grid: out, number: number && { x: number.x, y: number.y + 1 } };
  cache.set(key, pic); return pic;
}

// Ichigo's number, in cream pixels (3×5 digits).
const FIFTEEN = ['.#.###', '##.#..', '.#.##.', '.#...#', '.#.##.'];

// x = centre, y = feet, in art pixels. face = 1 (right) or -1 (left).
export function drawSprite(g, frame, x, y, face, scars) {
  const { grid, number } = picture(frame, scars), h = grid.length;
  const ox = Math.round(x), oy = Math.round(y) - h + 1;   // the outline under the feet hangs one pixel below
  const col = c => face > 0 ? ox + c - ANCHOR : ox + ANCHOR - c;
  for (let r = 0; r < h; r++) for (let c = 0; c < SPRITE_W; c++) {
    const v = grid[r][c];
    if (!v) continue;
    g.fillStyle = v; g.fillRect(col(c), oy + r, 1, 1);
  }
  if (number) {   // the 15 on the chest: always reads left to right, whichever way Ichigo faces
    const nx = face > 0 ? col(number.x) : col(number.x + FIFTEEN[0].length - 1);
    g.fillStyle = SP.W;
    FIFTEEN.forEach((row, r) => [...row].forEach((ch, c) => { if (ch === '#') g.fillRect(nx + c, oy + number.y + r, 1, 1); }));
  }
}
