// ============================================================================
// people.js — the other people on the beach: Kaa-chan (Ichigo's mother) and Ojii-san (the old
// net-maker). They come back in Levels 8 and 15.
// Drawn the same way as Ichigo (sprite.js): letter grids, one letter per colour, facing right,
// mirrored when they face left, with the same ink outline. Their heads and faces are drawn letter by
// letter below; their clothes are laid out with a few helpers (rows of kimono, a bench), because a
// grown-up is a lot of rows of indigo cloth.
// Kaa-chan stands about 1.6× Ichigo's height.
// ============================================================================
import { P, PIXEL } from './config.js';
import { SP, outline, small } from './sprite.js';

const PC = {
  K: SP.K, H: SP.H, S: SP.S, s: SP.s, m: SP.m, E: SP.E, e: SP.e,   // hair, skin, face: as Ichigo's
  I: P.indigo, N: P.navy, A: P.foam, a: P.grey0, O: P.ochre,       // Kaa-chan's work kimono, white apron, its ties
  G: P.wood, g: P.brown, W: P.white, w: P.grey1,                   // geta (wooden sandals); Ojii-san's white hair
  J: P.slate, j: P.navy, T: P.brown, t: P.ink,                     // Ojii-san's jacket, trousers
  B: P.ochre, b: P.wood, n: P.ochre,                               // the bench; the net
};

// --- drawing letters onto a blank sheet ---
const sheet = (w, h) => Array.from({ length: h }, () => Array(w).fill('.'));
function paste(sh, rows, x, y) {
  rows.forEach((r, j) => [...r].forEach((ch, i) => { if (ch !== '.' && sh[y + j] && x + i >= 0 && x + i < sh[0].length) sh[y + j][x + i] = ch; }));
}
function rect(sh, x, y, w, h, ch) {
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (sh[j] && i >= 0 && i < sh[0].length) sh[j][i] = ch;
}

// ============================================================================
// KAA-CHAN: dark hair tied back in a bun, an indigo work kimono, a white apron over it.
// ============================================================================
const KW = 44, KC = 22;   // frame width; the body's centre column
// Her head, facing right. Down: looking at her mending. Up: looking up, smiling. Alarm: eyes wide, mouth open.
const KAA_FACE = {
  down: [
    '........KKKKKK......',
    '......KKKKKKKKKK....',
    '..KK.KKKKKKHHKKKK...',
    '.KKKKKKKKKHHKKKKKK..',
    '.KKKKKKKKKKKKKKKKKK.',
    '..KKKKKKKKKKKKKKKKK.',
    '...KKKKKKKKKKKKKSSS.',
    '....KKKKKKKKKSSSSSSS',
    '....KKKKKKKsSSSSSSSS',
    '.....KKKKKKsSSSSEESS',
    '.....KKKKKsSSSSSSSSS',
    '......KKKKsSSSSSSSSS',
    '......KKKssSSSSSSmS.',
    '.......KKssSSSSSSS..',
    '.........ssSSSSSS...',
    '..........ssSSSS....',
    '...........sSSS.....',
    '...........sSSS.....',
  ],
  up: [
    '........KKKKKK......',
    '......KKKKKKKKKK....',
    '..KK.KKKKKKHHKKKK...',
    '.KKKKKKKKKHHKKKKKK..',
    '.KKKKKKKKKKKKKKKKKK.',
    '..KKKKKKKKKKKKKKKKK.',
    '...KKKKKKKKKKKKKSSS.',
    '....KKKKKKKKKSSSSSSS',
    '....KKKKKKKsSSSSSEeS',
    '.....KKKKKKsSSSSSEES',
    '.....KKKKKsSSSSSSSSS',
    '......KKKKsSSSSSSSSS',
    '......KKKssSSSSmSSmS',
    '.......KKssSSSSSmm..',
    '.........ssSSSSSS...',
    '..........ssSSSS....',
    '...........sSSS.....',
    '...........sSSS.....',
  ],
  alarm: [
    '........KKKKKK......',
    '......KKKKKKKKKK....',
    '..KK.KKKKKKHHKKKK...',
    '.KKKKKKKKKHHKKKKKK..',
    '.KKKKKKKKKKKKKKKKKK.',
    '..KKKKKKKKKKKKKKKKK.',
    '...KKKKKKKKKKKKKKKK.',
    '....KKKKKKKKKSSSKKSS',
    '....KKKKKKKsSSSSEeES',
    '.....KKKKKKsSSSSEEES',
    '.....KKKKKsSSSSSSSSS',
    '......KKKKsSSSSSSSSS',
    '......KKKssSSSSSSmmS',
    '.......KKssSSSSSSmm.',
    '.........ssSSSSSS...',
    '..........ssSSSS....',
    '...........sSSS.....',
    '...........sSSS.....',
  ],
};
const HEAD_X = KC - 12;   // where the head grid sits, so the neck is over the body's centre

// The kimono from the shoulders down to `to` rows (the hem is row 64), the apron over its front.
function kimono(sh, y0, to = 65) {
  for (let r = 0; r < to; r++) {
    const hw = r < 3 ? 6 + r : r < 22 ? 9 : r < 28 ? 8 : 8 + Math.round((r - 28) / 18);   // half-width: shoulders, waist, a little flare
    const L = KC - hw, R = KC + hw;
    rect(sh, L, y0 + r, R - L, 1, 'I');
    rect(sh, L, y0 + r, 2, 1, 'N');                                   // the back, in shadow
    if (r >= 22 && r < 27) rect(sh, L + 2, y0 + r, R - L - 2, 1, 'O'); // the apron's ties round the waist
    if (r >= 6 && r < 58 && !(r >= 22 && r < 27)) {                  // the white apron, down the front
      const a0 = KC + 1 - (r > 26 ? 1 : 0);
      rect(sh, a0, y0 + r, R - a0, 1, 'A'); sh[y0 + r][a0] = 'a';
    }
    if (r >= to - 2 && to === 65) rect(sh, L, y0 + r, R - L, 1, 'N');  // the hem
  }
  for (let r = 0; r < 7; r++) { sh[y0 + r][KC + 1 + Math.floor(r / 2)] = 'A'; sh[y0 + r][KC + 2 + Math.floor(r / 2)] = 'a'; }   // the white collar of the under-kimono, crossing at the front
}
// A sleeve hanging from the shoulder, the hand showing at its cuff; dx swings it forward or back.
function sleeve(sh, y0, dx = 0) {
  for (let r = 2; r < 34; r++) {
    const swing = Math.round(dx * r / 34), wid = r < 20 ? 6 : 8;
    rect(sh, KC - 3 + swing - (r >= 20 ? 1 : 0), y0 + r, wid, 1, 'I');
    sh[y0 + r][KC - 3 + swing - (r >= 20 ? 1 : 0)] = 'N';
  }
  rect(sh, KC - 4 + dx, y0 + 33, 9, 1, 'N');                    // the sleeve's lower edge
  rect(sh, KC + 2 + dx, y0 + 28, 3, 5, 'S'); rect(sh, KC + 2 + dx, y0 + 32, 2, 1, 's');   // the hand
}
// Feet in white tabi socks and wooden geta: front and back foot offsets.
function feet(sh, y0, front = 0, back = 0) {
  for (const [dx, far] of [[back, true], [front, false]]) {
    const x = KC + dx - 3;
    rect(sh, x, y0, 6, 2, far ? 'a' : 'A'); rect(sh, x, y0 + 2, 7, 1, 'G'); rect(sh, x + 1, y0 + 3, 2, 1, 'g'); rect(sh, x + 4, y0 + 3, 2, 1, 'g');
  }
}
// An arm stretched out in front, from the shoulder to the hand, its wide sleeve hanging below it.
// (x, y: the hand; from the shoulder at sx, sy.)
function reach(sh, sx, sy, x, y) {
  const n = Math.max(Math.abs(x - sx), Math.abs(y - sy));
  for (let i = 0; i <= n; i++) {
    const px = Math.round(sx + (x - sx) * i / n), py = Math.round(sy + (y - sy) * i / n);
    rect(sh, px, py, 1, 4, 'I');
    if (i > 3 && i < n - 2) rect(sh, px, py + 4, 1, Math.min(7, 2 + i), i % 7 === 0 ? 'N' : 'I');   // the sleeve hanging down
    sh[py][px] = 'N';
  }
  rect(sh, x, y, 4, 3, 'S'); sh[y + 2][x] = 's';
}
// The net in her lap, a mesh of ochre twine (see-through between the knots): x, y, width, height.
function net(sh, x, y, w, h) {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if ((i + j) % 3 === 0 || (i - j + 99) % 3 === 0) sh[y + j][x + i] = 'n';
}

const KH = 18;   // head rows
function kaaStand(face, { front = 0, back = 0, swing = 0, arm = null } = {}) {
  const sh = sheet(KW, KH + 65 + 4);
  kimono(sh, KH); paste(sh, KAA_FACE[face], HEAD_X, 0);
  if (arm) reach(sh, KC + 1, KH + 3, arm[0], arm[1]); else sleeve(sh, KH, swing);
  feet(sh, KH + 65, front, back);
  return sh;
}
// Kneeling (seiza): sitting back on her heels, knees forward. arm: reaching toward Ichigo's face.
function kaaKneel(arm) {
  const top = KH + 27, sh = sheet(KW, top + 13);
  kimono(sh, KH, 27); paste(sh, KAA_FACE.up, HEAD_X, 0);
  for (let r = 0; r < 13; r++) {   // her folded legs: the kimono over her thighs, rounded at the knee
    const R = KC + 13 - (r < 3 ? 3 - r : 0) - (r > 9 ? r - 9 : 0);
    rect(sh, KC - 10, top + r, R - (KC - 10), 1, r === 12 ? 'N' : 'I'); rect(sh, KC - 10, top + r, 2, 1, 'N');
    if (r < 5) rect(sh, KC + 1, top + r, R - KC - 1, 1, 'A');        // the apron over her lap
  }
  rect(sh, KC - 12, top + 9, 4, 3, 'A'); rect(sh, KC - 12, top + 12, 4, 1, 'a');   // the soles of her tabi, under her
  if (arm) reach(sh, KC + 1, KH + 3, KC + 15, top - 8);
  else { sleeve(sh, KH - 6, 3); }
  return sh;
}
// Sitting on the house step, mending the net in her lap. hand: which way the needle hand is (0, 1).
function kaaSit(face, hand) {
  const lap = KH + 27, sh = sheet(KW, lap + 21);
  kimono(sh, KH, 27); paste(sh, KAA_FACE[face], HEAD_X, 0);
  rect(sh, KC - 9, lap, 24, 7, 'I'); rect(sh, KC - 9, lap, 2, 7, 'N'); rect(sh, KC - 9, lap + 6, 24, 1, 'N');   // thighs, forward
  for (let r = 0; r < 14; r++) rect(sh, KC + 8, lap + 7 + r, 7, 1, r === 13 ? 'N' : 'I');                   // shins, down to the sand
  feet(sh, lap + 17, 9, 9);
  net(sh, KC - 2, lap - 2, 19, 6); net(sh, KC + 14, lap + 4, 4, 14);   // the net across her lap, hanging over her knees
  // her hands working the needle
  if (hand) { reach(sh, KC + 1, KH + 3, KC + 9, lap - 6); }
  else { reach(sh, KC + 1, KH + 3, KC + 5, lap - 3); }
  return sh;
}

// ============================================================================
// OJII-SAN: bald, a white fringe, eyebrows big enough to read from across the beach, sitting on a
// bench in a blue-grey work jacket.
// ============================================================================
const OW = 46, OC = 20;
const OJI_FACE = {
  doze: [
    '.......SSSSSS......',
    '.....SSSSSSSSSS....',
    '....SWWSSSSSSSSS...',
    '...SWSSSSSSSSSSSS..',
    '...SSSSSSSSSSSSSS..',
    '..wSSSSSSSSSSSSSSS.',
    '.WwSSSSSSSSSWWWWWW.',
    '.WWsSSSSSSWWWWWWWWW',
    '.WWssSSSSSSSWWWWWW.',
    '.WWsSSSSSSSSssssSS.',
    '..WsSSSSSSSSSSSSSSS',
    '..WWsSSSSSSSSSSSSSS',
    '...WsSSSSSSSSSSSSS.',
    '....ssSSSSSWWWWWS..',
    '.....ssSSSSWWWW....',
    '......ssSSSSSS.....',
    '.......ssSSSS......',
    '........sSSS.......',
  ],
  peek: [
    '.......SSSSSS......',
    '.....SSSSSSSSSS....',
    '....SWWSSSSSSSSS...',
    '...SWSSSSSSSSWWWW..',
    '...SSSSSSSSWWWWWWWW',
    '..wSSSSSSSSSWWWWWW.',
    '.WwSSSSSSSSSSSSSSS.',
    '.WWsSSSSSSSSSSEeSS.',
    '.WWssSSSSSSSSSEESS.',
    '.WWsSSSSSSSSssssSS.',
    '..WsSSSSSSSSSSSSSSS',
    '..WWsSSSSSSSSSSSSSS',
    '...WsSSSSSSSSSSSSS.',
    '....ssSSSSSWWWWWS..',
    '.....ssSSSSWWWW....',
    '......ssSSSSSS.....',
    '.......ssSSSS......',
    '........sSSS.......',
  ],
};
function ojiSit(face, breathe) {
  const OH = 18, sh = sheet(OW, 62), b = breathe ? 1 : 0;   // breathing: head and chest rise a pixel
  const seat = 44;                                         // the top of the bench
  rect(sh, 2, seat + 2, 40, 3, 'B'); rect(sh, 2, seat + 4, 40, 1, 'b');   // the bench: a plank on two legs
  rect(sh, 5, seat + 5, 3, 13, 'b'); rect(sh, 36, seat + 5, 3, 13, 'b');
  for (let r = 0; r < 26; r++) {                           // the jacket, a little hunched
    const L = OC - 8 + (r < 3 ? 3 - r : 0) - (r > 14 ? 1 : 0), R = OC + 8 + (r > 16 ? 1 : 0);
    rect(sh, L, OH - b + r, R - L, 1, 'J'); rect(sh, L, OH - b + r, 2, 1, 'j');
  }
  for (let r = 0; r < 8; r++) { sh[OH - b + r][OC + 2 + (r >> 1)] = 'W'; }   // the collar's white edge
  rect(sh, OC - 9, OH + 26 - b, 18, 1, 'j');               // the jacket's hem
  rect(sh, OC - 8, seat - 2, 22, 5, 'T');                  // trousered thighs on the bench,
  for (let r = 0; r < 14; r++) rect(sh, OC + 9, seat + 3 + r, 6, 1, 'T');   // shins down to the sand
  rect(sh, OC + 8, seat + 16, 9, 1, 'G'); rect(sh, OC + 9, seat + 17, 2, 1, 'g'); rect(sh, OC + 14, seat + 17, 2, 1, 'g');   // geta
  for (let r = 0; r < 18; r++) rect(sh, OC - 2 + Math.round(r * .5), OH + 3 - b + r, 5, 1, r % 6 === 0 ? 'j' : 'J');   // his arm, resting
  rect(sh, OC + 7, OH + 20 - b, 5, 4, 'S'); sh[OH + 23 - b][OC + 7] = 's';                                         // the hand on his knee
  paste(sh, OJI_FACE[face], OC - 10, 0 + 1 - b);
  return sh;
}

// ============================================================================
const LETTERS = {
  kaachan: {
    anchor: KC,
    frames: {
      stand: () => kaaStand('up'),
      walk1: () => kaaStand('up', { front: 4, back: -4, swing: -2 }),
      walk2: () => kaaStand('up', { front: -2, back: 2, swing: 2 }),
      alarm: () => kaaStand('alarm', { arm: [KC + 16, KH - 4] }),
      kneel: () => kaaKneel(false),
      reach: () => kaaKneel(true),
      sit1: () => kaaSit('down', 0),
      sit2: () => kaaSit('down', 1),
      look: () => kaaSit('up', 0),
    },
  },
  ojiisan: { anchor: OC, frames: { doze1: () => ojiSit('doze', 0), doze2: () => ojiSit('doze', 1), peek: () => ojiSit('peek', 0) } },
};

const cache = new Map();
function picture(who, frame, mini) {
  const key = who + frame + mini;
  if (cache.has(key)) return cache.get(key);
  const L = LETTERS[who], rows = L.frames[frame]();
  let grid = rows.map(r => r.map(ch => ch === '.' ? null : PC[ch]));
  // (trim empty rows off the bottom so the feet sit on the ground)
  while (grid.length && grid[grid.length - 1].every(v => !v)) grid.pop();
  if (mini) grid = small(grid);
  const pic = { grid: outline(grid), anchor: Math.floor(L.anchor * (mini ? .75 : 1)) };
  cache.set(key, pic); return pic;
}
const mini = () => PIXEL > 1.1;   // full screen: 3/4 size, like Ichigo

// How tall a frame is, in pixels (for placing speech bubbles over their heads).
export const personHeight = (who, frame) => picture(who, frame, mini()).grid.length;

// x = centre, y = feet, in pixels; face = 1 (right) or -1 (left).
export function drawPerson(g, who, frame, x, y, face = 1) {
  const { grid, anchor } = picture(who, frame, mini()), h = grid.length;
  const ox = Math.round(x), oy = Math.round(y) - h + 1;
  for (let r = 0; r < h; r++) for (let c = 0; c < grid[r].length; c++) {
    const v = grid[r][c];
    if (!v) continue;
    g.fillStyle = v; g.fillRect(face > 0 ? ox + c - anchor : ox + anchor - c, oy + r, 1, 1);
  }
}

// The net, dropped from Kaa-chan's lap when she stands: a small heap of twine (pixels, top-left x, y).
const NET = (() => { const sh = sheet(20, 6); net(sh, 0, 0, 20, 6); rect(sh, 0, 5, 20, 1, 'n'); return sh; })();
export function drawNet(g, x, y) {
  g.fillStyle = PC.n;
  NET.forEach((r, j) => r.forEach((ch, i) => { if (ch !== '.') g.fillRect(x + i, y + j, 1, 1); }));
}
