// ============================================================================
// sprite.js — Ichigo as a 12×18 pixel sprite. Bowl cut, red #15 jersey to the knees,
// wooden flip-flops, yellow bucket — all from the novel.
// Each frame is a little picture made of letters; each letter is a colour (see SP).
// ============================================================================
import { P } from './config.js';

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

// x = centre, y = feet, in real pixels. face = 1 (right) or -1 (left).
export function drawSprite(g, frame, x, y, face, scars) {
  const rows = FRAMES[frame], ox = Math.round(x) - 6, oy = Math.round(y) - rows.length;
  const extra = {};
  for (let i = 0; i < Math.min(scars, SCARS.length); i++) for (const [r, c, col] of SCARS[i]) extra[r + ',' + c] = col;
  for (let r = 0; r < rows.length; r++) for (let c = 0; c < 12; c++) {
    const ch = rows[r][c], e = extra[r + ',' + c];
    if (e === null || ch === '.') continue;
    g.fillStyle = e ? (SP[e] || e) : SP[ch];
    g.fillRect(face > 0 ? ox + c : ox + 11 - c, oy + r, 1, 1);
  }
}
