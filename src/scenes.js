// ============================================================================
// scenes.js — what's on screen: the title, the beach intro, play, a new tomorrow, the level's end.
// ============================================================================
import { W, H, TOP, LW, LH, TOP_PX, PIXEL, P, px, onPixel, toPx } from './config.js';
import { S, parts } from './state.js';
import { lg, tg, topC, beginWorld, beginTop, pixelSpace, quantize, scale2x } from './pixel.js';
import { pixelText, drawCover } from './text.js';
import { inLeft, inRight } from './input.js';
import { seaY } from './sea.js';
import { drawScenery, drawSea, drawChartSea, drawLife, drawPix, CELL, hsh } from './art.js';
import { floating, drawWreckage, updateWreckage } from './wreckage.js';
import { PL, spawn } from './player.js';
import { drawSprite, spriteHeight } from './sprite.js';
import { drawTitleArt } from './title.js';
import { drawDawn } from './dawn.js';

const NUMBER_WORDS = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN'];

export function startLevel() {
  S.checkpoint = S.plats[0]; S.deaths = 0;
  for (const p of S.plats) p.flag = 0;
  updateWreckage(S.T, 0, PL); spawn(); S.camX = 0; S.scene = 'play'; S.sceneT = 0;
}

// Title: Hokusai's Great Wave as pixel art, gently moving (see title.js), with the words in the sky.
// (Positions in pixels, from the top of the screen.)
export function drawTitle() {
  pixelSpace(lg);
  const { x, w } = drawTitleArt(lg, S.T);
  // The words, over the sky on the right, clear of the wave's claws. (Full screen's shorter chart
  // brings the claws higher, so the words sit further right and closer together there.)
  const wide = LW / LH > 1.5, tx = x + Math.round(w * (wide ? .78 : .725));
  const [cover, ys] = wide ? [60, [8, 82, 106, 124, 142, 166]] : [72, [10, 96, 124, 142, 160, 188]];
  drawCover('ICHIGO', cover, tx, ys[0]);
  pixelText('A CHILD OF THE SEA', tx, ys[1], P.navy, 'center');
  pixelText('<- -> MOVE', tx, ys[2], P.ink, 'center');   // short lines, clear of the wave's claws
  pixelText('SHIFT RUN', tx, ys[3], P.ink, 'center');
  pixelText('SPACE JUMP', tx, ys[4], P.ink, 'center');
  if (Math.sin(S.T * 4) > -0.3) pixelText('PRESS ANY KEY', tx, ys[5], P.red, 'center');
}

// Intro: Ichigo digging on the beach by the family house. Hokusai's great wave (cut from the title
// card's chart, in the same colours as the sea) rises out of the water behind the beach,
// its claws grasping, then pitches forward and crashes as the sea climbs over everything, it too.
const greatWave = new Image(); greatWave.src = 'assets/great_wave.png';
const WAVE_ROWS = 248;   // (the cut-out's rows below this are foreground sea; they stay under the water)
// Where the wave is at time t: its left edge and top, in pixels. It's flipped to face Ichigo.
function wavePlace(t) {
  const k = Math.min(1, Math.max(0, (t - 1.4) / 3)), e = k * k * (3 - 2 * k), late = Math.max(0, t - 4.4);
  const ix = 430 / PIXEL, horizon = (400 + TOP) / PIXEL, h = WAVE_ROWS * CELL;
  return { x: Math.round((ix + 150 - e * 110 - late * 600) / CELL) * CELL, top: Math.round((horizon + 20 - e * (h - 30) + late * late * 1400) / CELL) * CELL, k: e };
}
// Draw the wave, a row of cells at a time so the claws at its crest can sway (as on the title card).
function drawGreatWave(g, t) {
  if (t < 1.4 || !greatWave.width) return;
  const { x, top, k } = wavePlace(t), w = greatWave.width, C = CELL, s = 4;   // (s: the cut-out's cells per cell of a 160-cell chart)
  pixelSpace(g); g.imageSmoothingEnabled = false;
  g.save(); g.translate(x + w * C, 0); g.scale(-1, 1);
  for (let r = 0; r < WAVE_ROWS; r++) {
    const claw = r >= 14 * s && r < 48 * s ? Math.sin(Math.PI * (r - 14 * s) / (34 * s)) : 0;
    const dx = Math.round(Math.sin(S.T * 1.7 - r / s * .45) * .75 * s * claw * k);
    g.drawImage(greatWave, 0, r, w, 1, dx * C, top + r * C, w * C, C);
  }
  g.restore();
}
const introSurf = T => wx => 414 + Math.sin(wx * .02 - T * 1.5) * 4;   // the sea along the shore
// The beach and Ichigo's home (in game units; drawn smoothly, then snapped to the palette).
function drawBeach(g) {
  const shore = (inset = 0) => { g.beginPath(); g.moveTo(0, 400); g.lineTo(560 - inset, 410); g.quadraticCurveTo(640 - inset, 430, 700 - inset, H); g.lineTo(0, H); g.closePath(); };
  g.fillStyle = P.mist; shore(); g.fill();          // foam at the water's edge,
  g.fillStyle = P.mauve; shore(6); g.fill();        // a band of wet sand, shining with the dusk sky,
  g.fillStyle = P.tanD; shore(30); g.fill();        // and the dry beach, dim in the evening light
  g.fillStyle = P.wood;
  for (let i = 0; i < 90; i++) {   // flecks in the sand
    const x = hsh(i * 3.1) * 520, y = 406 + hsh(i * 7.7) * 130;
    if (y > 400 + x * .02) g.fillRect(x, y, 4, 2);
  }
  for (let i = 0; i < 8; i++) g.fillRect(212 + i * 22, 412 + (i % 2) * 5, 5, 3);   // footprints, from the house to the sandcastle
  g.fillStyle = P.olive;   // dune grass along the back of the beach
  for (let x = 0; x < 300; x += 7) { const h = 6 + hsh(x) * 10; g.fillRect(x, 402 - h, 2, h); g.fillRect(x + 2, 402 - h * .6, 2, h * .6); }
  // the family house: a fisherman's house, thatched, on a low stone footing
  g.fillStyle = P.grey3; g.fillRect(84, 398, 122, 8);                                   // footing
  g.fillStyle = P.wood; g.fillRect(90, 340, 110, 58);                                    // wooden walls
  g.fillStyle = P.brown; for (let x = 96; x < 200; x += 10) g.fillRect(x, 340, 2, 58);   // their boards
  g.fillRect(90, 340, 110, 4);                                                           // the beam under the eaves
  g.fillStyle = P.outline; g.fillRect(130, 356, 26, 42);                                 // the doorway
  g.fillStyle = P.navy; g.fillRect(128, 356, 30, 16);                                    // its curtain (noren), split in two
  g.fillStyle = P.foam; g.fillRect(142, 356, 2, 16); g.fillRect(136, 362, 4, 4);
  g.fillStyle = P.tan; g.fillRect(168, 356, 22, 16);                                     // a paper window, latticed
  g.fillStyle = P.brown; g.fillRect(178, 356, 2, 16); g.fillRect(168, 363, 22, 2);
  g.fillStyle = P.olive; g.beginPath(); g.moveTo(62, 346); g.lineTo(104, 292); g.lineTo(186, 292); g.lineTo(228, 346); g.fill();   // the thatch
  g.fillStyle = P.leaf; for (let y = 304; y < 344; y += 10) g.fillRect(104 - (y - 292) * .78 + 4, y, 82 + (y - 292) * 1.56 - 8, 2);   // layered straw
  g.fillStyle = P.brown; g.fillRect(62, 344, 166, 4);                                    // the eaves' dark edge
  g.fillRect(98, 284, 94, 9);                                                            // the ridge beam
  for (const x of [100, 190]) { g.save(); g.translate(x, 288); g.rotate(-.6); g.fillRect(-3, -14, 4, 22); g.rotate(1.2); g.fillRect(-1, -14, 4, 22); g.restore(); }   // crossed rafters at each end
  // a pine beside it, leaning toward the sea
  g.strokeStyle = P.brown; g.lineWidth = 7; g.beginPath(); g.moveTo(256, 404); g.quadraticCurveTo(242, 350, 268, 300); g.stroke();
  for (const [x, y, r] of [[268, 300, 26], [246, 330, 20], [286, 326, 18]]) {
    g.fillStyle = P.pine; g.beginPath(); g.ellipse(x, y, r, r * .42, 0, 0, 7); g.fill();
    g.fillStyle = P.leaf; g.beginPath(); g.ellipse(x - 3, y - 4, r * .7, r * .22, 0, 0, 7); g.fill();
  }
  // the family's boat, pulled up on the sand, an oar across it
  g.fillStyle = P.wood; g.beginPath(); g.moveTo(296, 398); g.lineTo(372, 396); g.quadraticCurveTo(366, 410, 350, 412); g.lineTo(306, 412); g.closePath(); g.fill();
  g.fillStyle = P.ochre; g.fillRect(298, 396, 72, 4);
  g.strokeStyle = P.brown; g.lineWidth = 3; g.beginPath(); g.moveTo(300, 388); g.lineTo(378, 402); g.stroke();
  // Ichigo's sandcastle (just in front of where they dig): a keep with two towers, crenellated, and a scrap of red for a flag
  g.save(); g.translate(-20, 0);
  g.fillStyle = P.tanD; g.fillRect(386, 398, 34, 14); g.fillRect(386, 386, 8, 12); g.fillRect(412, 386, 8, 12); g.fillRect(397, 380, 12, 18);
  for (const x of [386, 390, 412, 416, 397, 401, 405]) g.fillRect(x, x > 396 && x < 410 ? 376 : 382, 3, 4);
  g.fillStyle = P.wood; g.fillRect(400, 402, 6, 10); g.fillRect(386, 408, 34, 4);       // its gate, and its shadow
  g.fillStyle = P.brown; g.fillRect(402, 366, 1.5, 10); g.fillStyle = P.red; g.fillRect(403.5, 366, 7, 4); g.restore();
}
export function drawIntro(t) {
  const surf = introSurf(S.T);
  beginWorld(); drawScenery(lg, 0, S.T, { ...S.level.fuji, x: 330 });   // (Fuji stands between the house and Ichigo, clear of the wave)
  if (t <= 4.4) {   // the wave rising out at sea, its foot hidden in the water (with a line of foam where it meets it)
    drawGreatWave(lg, t);
    const { x } = wavePlace(t);
    drawChartSea(lg, 0, S.T, surf, Math.max(0, x - 8), LW);
  }
  beginWorld(); drawBeach(lg);
  pixelSpace(lg); quantize(lg);
  beginWorld(); lg.save();   // the sea beside the beach (seen on a wide screen)
  lg.beginPath(); lg.moveTo(560, 396); lg.lineTo(W + 10, 396); lg.lineTo(W + 10, H); lg.lineTo(700, H); lg.quadraticCurveTo(640, 430, 560, 410); lg.closePath(); lg.clip();
  drawChartSea(lg, 0, S.T, surf, Math.floor(560 / PIXEL), LW);   // (only the columns the clip lets show)
  lg.restore(); pixelSpace(lg);
  const look = t > 2.6;
  drawSprite(lg, look ? 'stand' : (Math.sin(S.T * 10) > 0 ? 'dig1' : 'dig2'), 430 / PIXEL, 412 / PIXEL + TOP_PX, look ? 1 : -1, 0);
  if (t > 4.4) {   // the wave crashes, and the sea climbs over everything, all the way to the top of the screen
    beginTop(); const f = Math.min(1, (t - 4.4) / 0.6), wy = H + 30 - f * (H + TOP + 90);
    drawGreatWave(tg, t);   // the wave pitching forward,
    drawChartSea(tg, 0, S.T, wx => wy + Math.sin(wx * .02 + S.T * 3) * 12);   // and the sea rising over it
    pixelSpace(tg); quantize(tg); lg.drawImage(topC, 0, 0);
  }
}

// Play (also used under the 'dawn' and 'end' overlays).
// Order: sky and distant sea → near sea → wreckage (only the part above the waterline) → Ichigo → HUD.
export function drawPlay() {
  const camX = S.camX, T = S.T;
  beginWorld(); drawScenery(lg, camX, T, S.level.fuji);   // (all drawn in palette colours already: no need to snap them)
  pixelSpace(lg); drawLife(lg, camX, T);
  beginTop(); drawSea(tg, camX, T);
  tg.save(); tg.beginPath(); tg.moveTo(-10, -10); tg.lineTo(W + 10, -10);
  for (let sx = W + 10; sx >= -10; sx -= 6) tg.lineTo(sx, seaY(sx + camX, T) + 4);
  tg.closePath(); tg.clip();
  for (const p of S.plats) drawWreckage(tg, p, camX, T);
  tg.restore();
  if (S.scene === 'play' && S.sceneT < 0.5) { tg.globalAlpha = 1 - S.sceneT / 0.5; tg.fillStyle = P.night; tg.fillRect(0, -TOP, W, H + TOP); tg.globalAlpha = 1; }
  if (S.scene === 'end') drawEndBg(tg, S.sceneT);
  pixelSpace(tg); quantize(tg); lg.drawImage(topC, 0, 0);
  if (S.scene === 'dawn') drawDawn(lg, S.sceneT, S.deaths - 1);   // a new tomorrow: a different Hokusai print each fall (dawn.js)
  const showIchigo = !(S.scene === 'dawn' && S.sceneT < 1.45) && S.scene !== 'end' && !(S.scene === 'play' && S.sceneT < 0.25);
  if (showIchigo) {
    const moving = PL.ground && Math.abs(PL.vu) > 20 && (inLeft() || inRight());
    const wobbly = PL.ground && floating(PL.ground) && Math.abs(PL.ground.ang) > .14;   // arms out to balance
    const frame = !PL.ground ? 'jump' : moving ? ['stand', 'step1', 'stand', 'step2'][Math.floor(PL.anim / 1.6) % 4] : wobbly ? 'balance' : 'stand';
    // the hair moves with Ichigo: streaming back in the air and lifting as they fall; flicking back and
    // bouncing a little with each step (more when running); swaying as they balance
    const step = Math.floor(PL.anim / 1.6) % 2, running = Math.abs(PL.vu) > 220;
    const hair = !PL.ground ? [1, PL.vy > 150 ? 2 : 0] : moving ? [(running ? 1 : 0) + step, step] : wobbly ? [Math.sin(S.T * 4) > 0 ? 1 : 0, 0] : [0, 0];
    drawSprite(lg, frame, (PL.x - camX) / PIXEL, PL.y / PIXEL + TOP_PX, PL.face, Math.min(5, S.deaths), hair);
  }
  for (const q of parts) if (q.life > 0.05) {   // (a particle's size s is in 2-unit steps)
    const n = toPx(2 * (q.s || 1));
    lg.fillStyle = q.c; lg.fillRect(Math.round((q.x - camX) / PIXEL), Math.round(q.y / PIXEL + TOP_PX), n, n);
  }
  if (S.scene !== 'end' && !(S.scene === 'dawn' && S.sceneT > .3 && S.sceneT < 1.5)) drawHUD();   // (hidden while the dawn covers the screen)
  if (S.scene === 'end') drawEndFg(S.sceneT);
}

function drawEndBg(g, t) {
  g.globalAlpha = Math.min(1, t / 1.5); g.fillStyle = P.indigo; g.fillRect(0, -TOP, W, H + TOP);   // dusk over a calm night sea
  g.fillStyle = P.rosewood; g.fillRect(0, 380, W, 40);
  g.fillStyle = P.abyss; g.fillRect(0, 420, W, 120);
  g.fillStyle = P.aqua; g.fillRect(0, 420, W, px(2));
  g.globalAlpha = 1;
}
function drawEndFg(t) {
  if (t < 1) return;
  const L = S.level;
  const sea = Math.round((420 + TOP) / PIXEL);   // the sea's surface, in pixels: Ichigo stands just above it
  const head = sea - 4 - spriteHeight();   // top of Ichigo's head; the words sit above it
  drawCover(`${L.number} / 15`, 60, LW / 2, Math.max(16, head - 200));
  pixelText(`LEVEL ${NUMBER_WORDS[L.number]}: ${L.name}`, LW / 2, head - 88, P.mist, 'center', P.night);
  pixelText(S.deaths ? 'TOMORROWS: ' + S.deaths : 'NOT ONE TOMORROW NEEDED', LW / 2, head - 36, P.aqua, 'center', P.night);
  drawSprite(lg, 'stand', LW / 2, sea - 4, 1, Math.min(5, S.deaths));
  if (t > 2.5 && Math.sin(S.T * 4) > -0.3) pixelText('PRESS ANY KEY', LW / 2, sea + 40, P.mist, 'center', P.night);
}

// Wordless HUD: tally marks for each tomorrow, and the voyage so far: a little boat (Ichigo in red)
// working its way along a twisted rope toward home. (In pixels: it keeps its size on both screens.)
const HUD_BOAT = scale2x(['...K....', '...R....', 'KYYYYYYK', '.KTTTTK.']);
const HOME = scale2x(['...K...', '..KOK..', '.KOOOK.', 'KOOOOOK', '.GGGGG.', '.GGKGG.']);   // the family house from the intro: grey walls, olive thatch
function drawHUD() {
  lg.fillStyle = P.mist;   // (pale, against the dusk)
  for (let i = 0; i < Math.min(S.deaths, 30); i++) {   // tally marks, struck through in fives
    const gI = Math.floor(i / 5), j = i % 5, bx = 16 + gI * 24;
    if (j < 4) lg.fillRect(bx + j * 4, 14, 2, 14); else for (let s = 0; s < 18; s++) lg.fillRect(bx - 2 + s, 24 - Math.floor(s * .6), 1, 2);
  }
  const goal = S.plats.find(p => p.goal), goalX = goal ? goal.x0 + S.level.goalOffset : S.level.length;
  const pr = Math.min(1, PL.x / goalX), x0 = LW - 160, len = 124;
  for (let x = 0; x < len; x++) for (let y = 0; y < 4; y++) {   // the rope, two strands twisting round each other
    lg.fillStyle = (x + y) % 8 < 4 ? P.ochre : P.brown; lg.fillRect(x0 + x, 22 + y, 1, 1);
  }
  drawPix(lg, HOME, x0 + len + 2, 14);
  drawPix(lg, HUD_BOAT, x0 + Math.round(pr * (len - 16)), 14 + Math.round(Math.sin(S.T * 3) * 1.2));
  pixelText(`${S.level.number}/15`, LW - 16, 34, P.mist, 'right', P.night);
}
