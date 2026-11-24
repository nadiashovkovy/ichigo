// ============================================================================
// prologue.js — Level 0: before the game begins, what Ichigo is and where it comes from, on a few story
// cards (cards.js). Behind them is the last day on Ichigo's beach, from first light to dusk, a time of
// day to each card: shadows swing round, the nets and the carp streamers go up, the sandcastle is built.
// Each card is also drawn in the sand with a stick, and the tide takes the drawing before the next.
// The last card is the dusk Level 1 begins at, with Ichigo already there, so the game just goes on from it.
// ============================================================================
import { W, H, P, LW, LH, PIXEL } from './config.js';
import { S } from './state.js';
import { lg, lo, beginWorld, pixelSpace } from './pixel.js';
import { pixelText, LETTER } from './text.js';
import { drawScenery, drawChartSea } from './art.js';
import { drawSand, drawBeachThings, drawBeachFront, drawInSand } from './beachart.js';
import { setBeach, drawBeachScene } from './beach.js';
import { showCards, cardIndex, cardsActive } from './cards.js';
import { seaSound, playWash, playDig } from './audio.js';

const PROLOGUE_CARDS = [
  "ICHIGO: A CHILD OF THE SEA IS A GAME FROM A NOVEL: TOMORROW, AND TOMORROW, AND TOMORROW, BY GABRIELLE ZEVIN.",
  'IN THE NOVEL, TWO FRIENDS, SADIE GREEN AND SAM MASUR, MAKE THEIR FIRST GAME TOGETHER AND RELEASE IT IN 1997. THIS IS IT.',
  'A GREAT WAVE SWEEPS A SMALL CHILD, ICHIGO, OUT TO SEA. ACROSS FIFTEEN LEVELS, ICHIGO GROWS UP WHILE TRYING TO FIND THE WAY HOME.',
  "ITS LOOK COMES FROM HOKUSAI'S WOODBLOCK PRINTS OF THE SEA AND MOUNT FUJI.",
  'THIS IS A FAN-MADE VERSION OF SADIE AND SAM\'S GAME. IT BEGINS ON A BEACH, ONE EVENING, WHEN ICHIGO IS PLAYING ON THE SAND ALONE.',
];

// --- the drawings: strokes of points, in pixels on the sand
const ring = (cx, cy, rx, ry = rx, from = 0, to = 1) => { const p = []; for (let i = 0; i <= 14; i++) { const a = (from + (to - from) * i / 14) * Math.PI * 2; p.push(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry); } return p; };
const curl = (x, y, s) => [x, y, x + 12 * s, y - 14 * s, x + 26 * s, y - 24 * s, x + 42 * s, y - 25 * s, x + 52 * s, y - 17 * s, x + 50 * s, y - 8 * s, x + 43 * s, y - 8 * s, x + 42 * s, y - 14 * s];   // a wave, curling over
const child = (x, y, s = 1) => [ring(x, y - 22 * s, 7 * s, 6 * s), [x, y - 16 * s, x, y - 5 * s], [x - 8 * s, y - 13 * s, x + 8 * s, y - 13 * s], [x - 6 * s, y, x, y - 5 * s, x + 6 * s, y]];
const DRAWINGS = [
  // an open book, a wave on its page
  [[280, 304, 244, 298, 200, 304, 200, 340, 244, 334, 280, 340, 316, 334, 360, 340, 360, 304, 316, 298, 280, 304, 280, 340], [212, 314, 262, 312], [212, 322, 262, 320], [212, 330, 250, 328], curl(296, 332, .8)],
  // two friends at a computer
  [[262, 300, 298, 300, 298, 326, 262, 326, 262, 300], [280, 326, 280, 332], [264, 334, 296, 334], curl(268, 320, .42), ...child(222, 336, 1.1), ...child(338, 336, 1.1)],
  // a wave and a child; islands; a house
  [curl(196, 336, 1.5), ...child(266, 322, .7), ring(296, 334, 5, 3), ring(314, 326, 5, 3), ring(332, 334, 5, 3), ring(350, 326, 5, 3), [368, 338, 368, 318, 396, 318, 396, 338, 368, 338], [362, 320, 382, 302, 402, 320]],
  // Fuji, the sun, and the sea
  [[214, 336, 262, 300, 272, 300, 320, 336], [250, 309, 258, 314, 266, 308, 274, 314, 283, 308], ring(344, 306, 9, 8), curl(330, 340, .9), curl(176, 340, .7)],
  [],
];
// --- the day: a light for each card. sun: where it is ([x, y] in pixels), or none.
const DAY = [
  { sky: 'dawn',  view: 'day',  tone: 'dusk', day: false, nets: false, carps: false, castle: 0, smoke: true,  shadow: [-64, 22], sun: [566, 224, P.red] },
  { sky: 'day',   view: 'day',  tone: 'day',  day: true,  nets: true,  carps: true,  castle: 0, smoke: false, shadow: [-34, 22], sun: [548, 150, P.white] },
  { sky: 'day',   view: 'day',  tone: 'day',  day: true,  nets: true,  carps: true,  castle: 0, smoke: false, shadow: [-6, 12] },
  { sky: 'late',  view: 'day',  tone: 'day',  day: true,  nets: true,  carps: true,  castle: 1, smoke: false, shadow: [40, 22], sun: [420, 176, P.foam] },
];
const START = 2, SPEED = 190, WASH = 2.3;   // seconds before the stick starts; pixels a second; how long the tide takes to come and go
const V = { card: -1, t0: 0, scratch: 0, washed: false };
const before = document.createElement('canvas');   // how the screen looked as the last card ended, fading out in dots

// then(): what comes after (Level 1's beach).
export function startPrologue(then) {
  S.scene = 'prologue'; S.sceneT = 0; V.card = -1;
  showCards(PROLOGUE_CARDS, then);
}

const surf = T => wx => 414 + Math.sin(wx * .02 - T * 1.5) * 4;   // (the beach's own sea: beach.js)
function drawDay(L, t, card) {
  const T = S.T;
  beginWorld();
  drawScenery(lg, 0, T, { ...S.level.fuji, view: L.view, x: 330 }, { sky: L.sky, behind: B => {
    if (!L.sun) return;
    const [x, y, c] = L.sun, r = 15; for (let j = -r; j <= r; j++) { const h = Math.round(Math.sqrt(r * r + r * .6 - j * j) || 0); B.rect(x - h, y + j, h * 2 + 1, 1, c); }
  } });
  drawChartSea(lg, 0, T, surf(T), 464, LW, false, L.tone);
  beginWorld(); lg.save(); lg.beginPath(); lg.rect(550, 402, W, H); lg.clip();
  drawChartSea(lg, 0, T, surf(T), Math.floor(550 / PIXEL), LW, false, L.tone);
  lg.restore(); pixelSpace(lg);
  // the tide, running up the beach and back as a card begins: it takes the drawing before it
  const k = card > 0 ? Math.max(0, Math.min(1, t / WASH)) : 1, wash = 330 * Math.sin(Math.PI * k) ** 1.3;
  drawSand(lg, 0, T, { day: L.day, wash });
  return { k, wash };
}
export function drawPrologue() {
  pixelSpace(lg);
  const i = cardsActive() ? cardIndex() : PROLOGUE_CARDS.length - 1;
  if (i !== V.card) {   // a new card
    if (V.card >= 0) { before.width = LW; before.height = LH; before.getContext('2d').drawImage(lo, 0, 0); }
    V.fade = V.card >= 0; V.card = i; V.t0 = S.T; V.washed = false;
    if (i === DAY.length) setBeach();
  }
  const t = S.T - V.t0;
  if (i >= DAY.length) drawBeachScene();   // dusk: Level 1's beach, just as it begins
  else {
    const L = DAY[i], { k, wash } = drawDay(L, t, i);
    if (i > 0 && !V.washed && t > .2) { V.washed = true; playWash(.35); }
    if (i > 0 && k < .5) drawInSand(lg, DRAWINGS[i - 1], Infinity, L.day, wash, S.T);
    drawBeachThings(lg, S.T, L);
    const len = (t - (i ? START : .8)) * SPEED, tip = len > 0 ? drawInSand(lg, DRAWINGS[i], len, L.day) : null;
    if (tip) {   // the stick, scratching
      const [x, y] = tip, lean = Math.round(Math.sin(t * 9) * 2);
      for (let j = 0; j < 30; j++) { const sx = x + Math.round(j * .5) + (j > 15 ? lean : 0), sy = y - j; lg.fillStyle = P.outline; lg.fillRect(sx - 1, sy, 4, 1); }
      for (let j = 0; j < 29; j++) { const sx = x + Math.round(j * .5) + (j > 15 ? lean : 0), sy = y - j; lg.fillStyle = P.wood; lg.fillRect(sx, sy, 2, 1); if (j % 9 === 4) { lg.fillStyle = P.brown; lg.fillRect(sx, sy, 2, 1); } }
      if (S.T > V.scratch) { V.scratch = S.T + .28; playDig(); }
    }
    drawBeachFront(lg, S.T);
  }
  if (V.fade && t < .8) fadeOut(t / .8);
  seaSound(.22);
  const w = 7 * LETTER + 10;   // "LEVEL 0", on a paper label (the bottom-right corner is the settings gear's)
  if (i < DAY.length) { lg.fillStyle = P.outline; lg.fillRect(8, LH - 34, w + 4, 26); lg.fillStyle = P.foam; lg.fillRect(10, LH - 32, w, 22); pixelText('LEVEL 0', 16, LH - 28, P.navy); }
}
// What was on the screen, going a dot at a time (each 4×4 square losing its dots in the same scattered order).
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const left = document.createElement('canvas'), tile = document.createElement('canvas'); tile.width = tile.height = 4;
function fadeOut(k) {
  const tg = tile.getContext('2d'); tg.clearRect(0, 0, 4, 4); tg.fillStyle = '#000';
  for (let j = 0; j < 16; j++) if (BAYER[j] / 16 < k) tg.fillRect(j % 4, j >> 2, 1, 1);
  left.width = LW; left.height = LH;
  const g = left.getContext('2d'); g.drawImage(before, 0, 0);
  g.globalCompositeOperation = 'destination-out'; g.fillStyle = g.createPattern(tile, 'repeat'); g.fillRect(0, 0, LW, LH);
  lg.drawImage(left, 0, 0);
}
