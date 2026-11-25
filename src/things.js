// ============================================================================
// things.js — what Ichigo carries, and what it tells them about the way home. A panel, opened with Tab
// (or I, or the bucket in the bottom-left corner); the game waits while it's up.
//   • the things Ichigo has found, one by one, each with a plain line about it;
//   • what they've learned about the world;
//   • THE WAY HOME: Ichigo's own drawing. Each thing from home adds the piece of it that it reminds
//     them of; pieces still missing are only dots. The row of islands along the bottom is the levels.
// A new level's things only need adding to THINGS (and, if they say something about home, to PIECES).
// ============================================================================
import { P, LW, LH } from './config.js';
import { S } from './state.js';
import { lg, pixelSpace, scale2x } from './pixel.js';
import { pixelText, LETTER, LINE } from './text.js';
import { drawIcon, iconSize, LEARNED } from './icons.js';

const C = { K: P.outline, Y: P.gold, y: P.ochre, R: P.red, r: P.rust, w: P.white, f: P.foam, b: P.wood, B: P.brown, a: P.aqua, o: P.ocean, n: P.navy, T: P.tan, t: P.tanD, p: P.pink, g: P.teal, s: P.sea, h: P.grey1, m: P.mist, d: P.deep };
// Pictures: letter grids. Small ones lie on the sand; the panel shows them doubled.
export const THINGS = {
  bucket: { name: 'THE YELLOW BUCKET', text: 'KAA-CHAN BOUGHT IT FOR THE BEACH.', always: true, pic: ['...KKKKKK...', '..K......K..', '.K........K.', 'KKKKKKKKKKKK', 'KYYwYYYYYYyK', '.KYwYYYYYyK.', '.KYwYYYYYyK.', '.KYYYYYYYyK.', '..KYYYYYyK..', '..KKKKKKKK..'] },
  shovel: { name: 'THE RED SHOVEL', text: 'FOR DIGGING.', always: true, pic: ['...KKKK...', '..KRRRRK..', '...KKKK...', '....KR....', '....KRK...', '....KRK...', '..KKKRKKK.', '..KRRRRrK.', '..KRRRRrK.', '...KRRrK..', '....KKK...'] },
  bowl: { name: 'A RICE BOWL', text: 'FUJI IS PAINTED ON IT. FUJI CAN BE SEEN FROM HOME.', pic: ['KKKKKKKKKKKKK', 'KfffffffffffK', 'KmmmmmfmmmmmK', '.KmmmdwdmmmK.', '.KmmdddddmmK.', '..KdddddddK..', '...KKfffKK...', '....KKKKK....'] },
  streamer: { name: 'A CARP STREAMER', text: 'THE SAME ONE FLIES ON THE POLE NEXT TO THE HOUSE.', pic: ['.KK..........KK', 'KaaKKKKKKKKKKoK', 'KaKwKaoaoaoaaoK', 'KaKKKoaoaoaooK.', 'KaaaaaoaoaoaaoK', '.KKKKKKKKKKKKoK', '.............KK'] },
  float: { name: 'A GLASS FLOAT', text: 'IT HAS A STAR ON IT. SO DO ALL THE BOATS IN THE HARBOR AT HOME.', pic: ['...KKKKK...', '.KKggwggKK.', '.KgwwYgggK.', 'KgwggYgggsK', 'KgYYYYYYYsK', 'KggYYYYYgsK', 'KggYYgYYgsK', '.KgYgggYsK.', '.KKsgggsKK.', '...KKKKK...'] },
  sandal: { name: "KAA-CHAN'S SANDAL", text: 'SHE LEAVES HER SANDALS BY THE DOOR.', pic: ['...KKKKKKKKKK..', '.KKTTTTTRTTTTKK', 'KTTTTTRRTTTTTTK', 'KTTTRRTTTTTTTTK', 'KTTTTTRRTTTTTtK', '.KKTTTTTRTTTtKK', '...KKKKKKKKKK..'] },
  shell: { name: 'A SHELL', text: 'FROM THE SANDBAR. IT SOUNDS LIKE THE SEA.', pic: ['...KKKK...', '..KTbpTK..', '.KTpbTpTK.', 'KTpTbTbTpK', 'KTbTKKpTTK', '.KTpwwTbK.', '..KTTTTK..', '...KKKK...'] },
  blanket: { name: 'A BLANKET', text: 'IT WAS UP IN A PLUM TREE. IT WILL DO FOR A SAIL.', pic: ['.KKKKKKKKKKK.', 'KrRRRRRRRRRrK', 'KRRfRRRfRRRRK', 'KRfffRfffRRRK', 'KRRfRRRfRRRRK', 'KrRRRRRRRRRrK', 'KRfRRRfRRRfRK', 'KfffRfffRfffK', 'KRfRRRfRRRfRK', 'KrrrrrrrrrrrK', '.KKKKKKKKKKK.'] },
  kite: { name: 'A KITE', text: 'ICHIGO AND KAA-CHAN FLEW ONE LIKE IT FROM THE HILL BEHIND THE HOUSE.', pic: ['.....KK.....', '....KRRK....', '...KRRRRK...', '..KRRwwRRK..', '.KRRwwwwRRK.', 'KRRRwnnwRRRK', '.KRRwwwwRRK.', '..KRRwwRRK..', '...KRRRRK...', '....KRRK....', '.....KK.....', '......KK....', '.....KK.KK..'] },
  chime: { name: 'A WIND CHIME', text: 'IT SOUNDS LIKE THE ONE UNDER THE EAVES AT HOME.', pic: ['.....K.....', '...KKmKK...', '..KmmwmmK..', '.KmwmRmmmK.', '.KmwRRRmmK.', '.KmmmRmmaK.', '..KKKKKKK..', '.....K.....', '....KKK....', '....KfK....', '....KRK....', '....KfK....', '....KKK....'] },
  rope: { name: 'A ROPE', text: 'THE FISHERMAN GAVE IT TO ICHIGO, FOR A CRAB.', pic: ['...KKKKKK...', '..KTTTTTTK..', '.KTyKKKKyTK.', 'KTyKTTTTKyTK', 'KTKTyKKyTKTK', 'KTKTyKKyTKTK', 'KTyKTTTTKyTK', '.KTyKKKKyTK.', '..KTTTTTTTK.', '...KKKKKKTK.', '.........KK.'] },
  paddle: { name: 'A PADDLE', text: 'THE OLD SAILOR GAVE IT TO ICHIGO. HE DOES NOT NEED IT.', pic: ['.........KK.', '........KTbK', '.......KTbK.', '......KTbK..', '.....KTbK...', '....KTbK....', '..KKTbK.....', '.KTTbbK.....', 'KTTbbbK.....', 'KTbbbBK.....', '.KbbBK......', '..KKK.......'] },
};
for (const th of Object.values(THINGS)) { th.big = scale2x(th.pic); th.grid = th.pic.map(r => [...r].map(ch => (ch === '.' ? null : C[ch]))); }
const ORDER = Object.keys(THINGS);
const SLOTS = 12, COLS = 4, CELL = 52;
const has = id => THINGS[id].always || S.things.has(id);
const found = () => ORDER.filter(has);

const V = { sel: 0 };
export function openThings() { S.thingsOpen = true; const f = found(); V.sel = S.newThing ? f.length - 1 : Math.min(V.sel, f.length - 1); S.newThing = false; }
const PX = 24, PY = 18, PW = LW - 48, PH = LH - 36;
const slot = i => ({ x: PX + 16 + (i % COLS) * (CELL + 4), y: PY + 40 + Math.floor(i / COLS) * (CELL + 4), w: CELL, h: CELL });
const inside = (c, b) => c && c.x >= b.x && c.x < b.x + b.w && c.y >= b.y && c.y < b.y + b.h;

// The bucket in the bottom-left corner that opens the panel (a red dot: something new in it).
// (The same size as the settings' gear, in the other corner.)
const ICON = scale2x(['.....KKKKKK.....', '...KKhhhhhhKK...', '..KhhKKKKKKhhK..', '.KhK........KhK.', '.KhK........KhK.', 'KKKKKKKKKKKKKKKK', 'KYYwYYYYYYYYYyyK', 'KKKKKKKKKKKKKKKK',
  '.KYYwYYYYYYYyyK.', '.KYYwYYYYYYYyyK.', '.KYYwYYYYYYYyyK.', '..KYwYYYYYYYyK..', '..KYYYYYYYYyyK..', '..KYYYYYYYYyyK..', '...KYYYYYYyyK...', '...KKKKKKKKKK...']);
const iconBox = { x: 14, y: LH - 32 - 14, w: 32, h: 32 };
export const onThings = c => inside(c, { x: iconBox.x - 4, y: iconBox.y - 4, w: iconBox.w + 8, h: iconBox.h + 8 });

export function updateThings(key, click) {
  const f = found(), n = f.length;
  if (key === 'Tab' || key === 'KeyI' || key === 'Escape' || key === 'Enter' || key === 'Space' || onThings(click)) { S.thingsOpen = false; return; }
  const step = { ArrowRight: 1, KeyD: 1, ArrowLeft: -1, KeyA: -1, ArrowDown: COLS, KeyS: COLS, ArrowUp: -COLS, KeyW: -COLS }[key] || 0;
  if (step && V.sel + step >= 0 && V.sel + step < n) V.sel += step;
  for (let i = 0; i < n; i++) if (inside(click, slot(i))) { V.sel = i; return; }
  if (click && !inside(click, { x: PX, y: PY, w: PW, h: PH })) S.thingsOpen = false;
}

function letters(rows, x, y) { rows.forEach((r, j) => [...r].forEach((ch, i) => { if (ch !== '.') { lg.fillStyle = C[ch]; lg.fillRect(x + i, y + j, 1, 1); } })); }

export function drawThings(inLevel) {
  pixelSpace(lg);
  if (inLevel) {
    letters(ICON, iconBox.x, iconBox.y);
    if (S.newThing && Math.sin(S.T * 6) > -.5) { lg.fillStyle = P.outline; lg.fillRect(iconBox.x + 25, iconBox.y + 2, 10, 10); lg.fillStyle = P.ember; lg.fillRect(iconBox.x + 26, iconBox.y + 3, 8, 8); }
  }
  if (!S.thingsOpen) return;
  lg.fillStyle = P.mist; lg.fillRect(PX - 2, PY - 2, PW + 4, PH + 4);
  lg.fillStyle = P.night; lg.fillRect(PX, PY, PW, PH);
  pixelText("ICHIGO'S THINGS", PX + 16, PY + 14, P.gold);
  const f = found();
  for (let i = 0; i < SLOTS; i++) {
    const b = slot(i), sel = i === V.sel;
    lg.fillStyle = sel ? P.gold : P.indigo; lg.fillRect(b.x, b.y, b.w, b.h);
    lg.fillStyle = f[i] ? (sel ? P.deep : P.navy) : P.outline; lg.fillRect(b.x + 2, b.y + 2, b.w - 4, b.h - 4);
    if (f[i]) { const p = THINGS[f[i]].big; letters(p, b.x + Math.round((b.w - p[0].length) / 2), b.y + Math.round((b.h - p.length) / 2)); }
  }
  // the one chosen, and its line
  const th = THINGS[f[V.sel]], ty = PY + 40 + 3 * (CELL + 4) + 8;
  pixelText(th.name, PX + 16, ty, P.gold);
  wrap(th.text, Math.floor((PW - 32) / LETTER)).forEach((line, i) => pixelText(line, PX + 16, ty + LINE * (i + 1), P.mist));
  // what Ichigo has learned, along the bottom
  let x = PX + 16; const wy = PY + PH - 36, s = iconSize(true);
  pixelText('LEARNED:', x, wy + 8, P.grey1); x += 9 * LETTER;
  for (const id of S.learned) { drawIcon(lg, LEARNED[id].icon, x, wy); x += s + 6; }
  pixelText('TAB: CLOSE', PX + PW - 44, wy + 8, P.grey1, 'right');
  drawWayHome(slot(COLS - 1).x + CELL + 20, PY + 14);
}
function wrap(text, n) { const out = ['']; for (const w of text.split(' ')) { const c = out[out.length - 1]; if (c && (c + ' ' + w).length > n) out.push(w); else out[out.length - 1] = c ? c + ' ' + w : w; } return out; }

// ============================================================================
// The way home: a three-year-old's drawing, in crayon on paper. Each piece is a list of strokes
// (colour, then points), drawn thick and wobbly; a missing piece is a few dots along the same lines.
// ============================================================================
const PIECES = [
  { thing: 'bowl', lines: [[P.deep, 150, 72, 196, 22, 208, 22, 258, 72], [P.grey1, 184, 35, 191, 41, 199, 35, 207, 42, 219, 35]] },                      // Fuji
  { thing: 'float', lines: [[P.ochre, 128, 12, 128, 28], [P.ochre, 120, 20, 136, 20], [P.ochre, 122, 14, 134, 26], [P.ochre, 134, 14, 122, 26]] },        // the star over the harbor
  { thing: 'streamer', lines: [[P.brown, 178, 108, 178, 56], [P.sea, 178, 58, 196, 60, 206, 56, 206, 68, 196, 65, 178, 68]] },                            // the pole by the house
  { thing: 'sandal', lines: [[P.olive, 204, 90, 226, 72, 248, 90, 204, 90], [P.wood, 208, 90, 208, 110, 244, 110, 244, 90], [P.red, 222, 110, 222, 98, 232, 98, 232, 110]] },   // the house, its door
  { thing: 'kite', lines: [[P.leaf, 186, 108, 214, 84, 244, 66, 274, 58, 306, 62]] },                                                        // the hill behind the house
  { thing: 'chime', lines: [[P.teal, 208, 90, 208, 94, 204, 98, 212, 98, 208, 94], [P.teal, 208, 98, 208, 102]] },                                         // the chime under the eaves
  { thing: 'shell', lines: [[P.sea, 12, 92, 24, 84, 36, 92, 48, 84, 60, 92, 72, 84, 84, 92], [P.sea, 60, 106, 72, 98, 84, 106, 96, 98, 108, 106, 120, 98, 132, 106]] },   // the sea between
];
function stroke(x0, y0, [col, ...pts], solid) {
  for (let i = 0; i + 3 < pts.length; i += 2) {
    const dx = pts[i + 2] - pts[i], dy = pts[i + 3] - pts[i + 1], n = Math.max(Math.abs(dx), Math.abs(dy), 1);
    for (let k = 0; k <= n; k++) {
      const w = Math.round(Math.sin((pts[i] + k) * .35 + i) * .8), x = x0 + Math.round(pts[i] + dx * k / n), y = y0 + Math.round(pts[i + 1] + dy * k / n) + (solid ? w : 0);
      if (solid) { lg.fillStyle = col; lg.fillRect(x, y, 2, 2); } else if (k % 7 === 0) { lg.fillStyle = P.grey0; lg.fillRect(x, y, 2, 2); }
    }
  }
}
function drawWayHome(x, y) {
  const w = PX + PW - 16 - x, h = 190;
  pixelText('THE WAY HOME', x, y, P.gold);
  y += 26; lg.fillStyle = P.foam; lg.fillRect(x, y, w, h - 26);
  lg.save(); lg.beginPath(); lg.rect(x, y, w, h - 26); lg.clip();
  for (const pc of PIECES) for (const l of pc.lines) stroke(x + 4, y + 2, l, has(pc.thing));
  // the islands along the way: one for each level; filled when it's done, red where Ichigo is
  for (let n = 1; n <= 15; n++) {
    const ix = x + 14 + (n - 1) * Math.floor((w - 28) / 14.6), iy = y + 136 + Math.round(Math.sin(n * 1.9) * 7);
    const here = S.level && S.level.number === n, col = here ? P.red : S.done.has(n) ? P.deep : P.grey1;
    lg.fillStyle = col; lg.fillRect(ix - 3, iy - 4, 7, 9); lg.fillRect(ix - 4, iy - 3, 9, 7);
    if (!here && !S.done.has(n)) { lg.fillStyle = P.foam; lg.fillRect(ix - 2, iy - 2, 5, 5); }
  }
  lg.restore();
}
