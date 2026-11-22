// ============================================================================
// sprite.js — Ichigo as a 12×18 pixel sprite. Bowl cut, red #15 jersey to the knees,
// wooden flip-flops, yellow bucket — all from the novel.
// Each frame is a little picture made of letters; each letter is a colour (see SP).
// ============================================================================
import { P, scaleGrid, SPRITE_SCALE } from './config.js';

const SP = { K: P.ink, S: P.skin, s: '#c99872', R: P.red, r: '#8a2420', W: P.foam, B: P.brown, Y: '#e0b43a', y: '#9c7a24' };
const HEAD = ['...KKKKK....', '..KKKKKKK...', '.KKKKKKKKK..', '.KKKKKKKKKK.', '.KKKSSSSSS..', '.KKSSSSKSS..', '.KKSSSSSSS..', '..KSSSSSs...'];
const BODY = ['...rRRRRr...', '..SRRWWRRSy.', '..SRRWWRRSy.', '..SRRRRRRSYy', '...RRRRRR.Yy', '..RRRRRRRR..', '..rRRRRRRr..'];
const FRAMES = {
  stand:   [...HEAD, ...BODY, '...SS..SS...', '...SS..SS...', '..BBB..BBB..'],
  step1:   [...HEAD, ...BODY, '..SS...SS...', '.SS.....SS..', '.BBB....BBB.'],
  step2:   [...HEAD, ...BODY, '....SSSS....', '....SS.SS...', '...BBB.BBB..'],
  balance: [...HEAD, '...rRRRRr...', 'SSSRRWWRRSSS', '...RRWWRR.yY', '..RRRRRRRRYy', '...RRRRRR...', '..RRRRRRRR..', '..rRRRRRRr..', '..SS....SS..', '..SS....SS..', '.BBB....BBB.'],
  jump:    [...HEAD, '.S.rRRRRr.S.', '.SSRRWWRRSS.', '..RRRWWRRRy.', '..RRRRRRRRYy', '...RRRRRR.Yy', '..RRRRRRRR..', '..rRRRRRRr..', '...SSSSS....', '...BB..BB...', '............'],
  dig1:    ['............', ...HEAD, '...rRRRRr...', '..SRRWWRRS..', '..SRRWWRRRS.', '..RRRRRRRR.y', '..rRRRRRRr.y', '...SS..SS.YY', '..BBB..BBB..'],
  dig2:    ['............', ...HEAD, '...rRRRRr...', '..SRRWWRRSSy', '..SRRWWRRR.y', '..RRRRRRRR.Y', '..rRRRRRRr.Y', '...SS..SS...', '..BBB..BBB..'],
};
// Damage that stays with Ichigo, added one by one with each fall: [row, col, colour (or null to tear a hole)]
const SCARS = [[[15, 3, 'W']], [[11, 4, '#1f3b6b'], [11, 5, '#1f3b6b']], [[6, 4, 'R']], [[14, 3, null], [14, 6, null], [14, 8, null]], [[9, 2, 'W']]];

// A frame with its scars painted in ('.' = see-through), redrawn at the world's zoom (see SPRITE_SCALE).
const cache = new Map();
function picture(frame, scars) {
  const key = frame + scars;
  if (cache.has(key)) return cache.get(key);
  const extra = {};
  for (let i = 0; i < Math.min(scars, SCARS.length); i++) for (const [r, c, col] of SCARS[i]) extra[r + ',' + c] = col;
  // The white patch on the jersey's chest stands in for the "15" when Ichigo is small. When there's
  // room (drawn at 1.5× or more), the jersey is plain red there and the real number is painted on top.
  const roomForNumber = SPRITE_SCALE >= 1.5;
  let chest = null;   // the patch's centre, in the frame's letters
  FRAMES[frame].forEach((row, r) => [...row].forEach((ch, c) => {
    if (ch !== 'W') return;
    chest = chest || { r0: r, r1: r, c0: c, c1: c };
    chest.r1 = Math.max(chest.r1, r); chest.c0 = Math.min(chest.c0, c); chest.c1 = Math.max(chest.c1, c);
  }));
  const cols = [];   // colour per letter of the scarred frame
  const rows = FRAMES[frame].map((row, r) => [...row].map((ch, c) => {
    const e = extra[r + ',' + c];
    if (e === null || ch === '.') return '.';
    const base = ch === 'W' && roomForNumber ? 'R' : ch;
    cols.push(e ? (SP[e] || e) : SP[base]); return String.fromCharCode(48 + cols.length - 1);
  }).join(''));
  const s = SPRITE_SCALE;
  const number = roomForNumber && chest ? { x: (chest.c0 + chest.c1 + 1) / 2 * s, y: (chest.r0 + chest.r1 + 1) / 2 * s } : null;
  const pic = { rows: scaleGrid(rows), cols, number };
  cache.set(key, pic); return pic;
}

// Ichigo's number, in white pixels (3×5 digits).
const FIFTEEN = ['.#.###', '##.#..', '.#.###', '.#...#', '.#.###'];

// x = centre, y = feet, in real pixels. face = 1 (right) or -1 (left).
export function drawSprite(g, frame, x, y, face, scars) {
  const { rows, cols } = picture(frame, scars), w = rows[0].length;
  const ox = Math.round(x) - (w >> 1), oy = Math.round(y) - rows.length;
  for (let r = 0; r < rows.length; r++) for (let c = 0; c < w; c++) {
    const ch = rows[r][c];
    if (ch === '.') continue;
    g.fillStyle = cols[ch.charCodeAt(0) - 48];
    g.fillRect(face > 0 ? ox + c : ox + w - 1 - c, oy + r, 1, 1);
  }
  const n = picture(frame, scars).number;
  if (n) {   // the 15 on the chest: always reads left to right, whichever way Ichigo faces
    const cx = face > 0 ? n.x : w - n.x, nx = ox + Math.round(cx - FIFTEEN[0].length / 2), ny = oy + Math.round(n.y - FIFTEEN.length / 2);
    g.fillStyle = SP.W;
    FIFTEEN.forEach((row, r) => [...row].forEach((ch, c) => { if (ch === '#') g.fillRect(nx + c, ny + r, 1, 1); }));
  }
}
