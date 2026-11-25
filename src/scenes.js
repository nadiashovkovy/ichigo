// ============================================================================
// scenes.js — what's on screen: the title, play, a new tomorrow, the level's end. (The beach before
// the wave is in beach.js.)
// ============================================================================
import { W, H, TOP, LW, LH, TOP_PX, PIXEL, P, px, onPixel, toPx } from './config.js';
import { S, parts } from './state.js';
import { lg, tg, topC, beginWorld, beginTop, pixelSpace, quantize, scale2x } from './pixel.js';
import { pixelText, drawCover, LETTER, LINE } from './text.js';
import { inLeft, inRight } from './input.js';
import { seaY } from './sea.js';
import { drawScenery, drawSea, drawLife, drawPix, drawFloatingKoinobori } from './art.js';
import { floating, drawWreckage, updateWreckage } from './wreckage.js';
import { PL, spawn } from './player.js';
import { drawSprite, spriteHeight, markIds } from './sprite.js';
import { drawBubbles, clearBubbles } from './bubbles.js';
import { drawIcon, iconSize, LEARNED } from './icons.js';
import { drawTitleArt } from './title.js';
import { drawDawn } from './dawn.js';

const NUMBER_WORDS = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN'];

export function startLevel() {
  S.checkpoint = S.plats[0]; S.deaths = 0; S.levelT = 0; clearBubbles();
  for (const p of S.plats) p.flag = 0;
  updateWreckage(S.T, 0, PL); spawn(); S.camX = 0; S.scene = 'play'; S.sceneT = 0;
}

// Title: Hokusai's Great Wave as pixel art, gently moving (see title.js), with the words in the sky.
// (Positions in pixels, from the top of the screen.)
export function drawTitle() {
  pixelSpace(lg);
  const { x, w } = drawTitleArt(lg, S.T);
  // The words, over the sky on the right, clear of the wave's claws. (The 16:9 screen's shorter chart
  // brings the claws higher, so the words sit further right and closer together there.)
  const wide = LW / LH > 1.5, tx = x + Math.round(w * (wide ? .78 : .725));
  const [cover, ys] = wide ? [60, [8, 82, 106, 124, 142, 166]] : [72, [10, 96, 124, 142, 160, 188]];
  drawCover('ICHIGO', cover, tx, ys[0]);
  pixelText('A CHILD OF THE SEA', tx, ys[1], P.navy, 'center');
  if (Math.sin(S.T * 4) > -0.3) pixelText('PRESS ANY KEY', tx, ys[3], P.red, 'center');   // (short lines, clear of the wave's claws)
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
  // Level 1: a carp streamer torn loose from the village floats past in the first seconds, still bright
  if (S.level.number === 1 && S.levelT < 8) { const x = W + 60 - (S.levelT - .5) / 6 * (W + 160); drawFloatingKoinobori(tg, x - camX, seaY(x, T), T); }
  tg.restore();
  if (S.scene === 'play' && S.sceneT < 0.5) { tg.globalAlpha = 1 - S.sceneT / 0.5; tg.fillStyle = P.night; tg.fillRect(0, -TOP, W, H + TOP); tg.globalAlpha = 1; }
  pixelSpace(tg); quantize(tg); lg.drawImage(topC, 0, 0);
  if (S.scene === 'dawn') drawDawn(lg, S.sceneT, S.deaths - 1);   // a new tomorrow: a different Hokusai print each fall (dawn.js)
  const showIchigo = !(S.scene === 'dawn' && S.sceneT < 1.45) && !(S.scene === 'play' && S.sceneT < 0.25);
  if (showIchigo) {
    const moving = PL.ground && Math.abs(PL.vu) > 20 && (inLeft() || inRight());
    const wobbly = PL.ground && floating(PL.ground) && Math.abs(PL.ground.ang) > .14;   // arms out to balance
    const frame = PL.sitting || S.scene === 'end' ? 'sit' : !PL.ground ? 'jump' : moving ? ['stand', 'step1', 'stand', 'step2'][Math.floor(PL.anim / 1.6) % 4] : wobbly ? 'balance' : 'stand';
    // the hair moves with Ichigo: streaming back in the air and lifting as they fall; flicking back and
    // bouncing a little with each step (more when running); swaying as they balance
    const step = Math.floor(PL.anim / 1.6) % 2, running = Math.abs(PL.vu) > 220;
    const hair = PL.sitting || S.scene === 'end' ? [0, 0] : !PL.ground ? [1, PL.vy > 150 ? 2 : 0] : moving ? [(running ? 1 : 0) + step, step] : wobbly ? [Math.sin(S.T * 4) > 0 ? 1 : 0, 0] : [0, 0];
    // (sitting on the boat a while, Ichigo looks back the way they came)
    const face = PL.sitting && PL.ground && PL.ground.type === 'boat' && PL.idle > 5 ? -1 : PL.face;
    drawSprite(lg, frame, (PL.x - camX) / PIXEL, PL.y / PIXEL + TOP_PX, face, Math.min(5, S.deaths), hair, PL.sulk > 0 ? [...markIds(), 'pout'] : markIds());   // (lip out: made to get up)
    const sh = PL.sitting ? Math.round(46 * (PIXEL > 1.1 ? .75 : 1)) : spriteHeight();
    drawBubbles(lg, { ichigo: [Math.round((PL.x - camX) / PIXEL), Math.round(PL.y / PIXEL + TOP_PX) - sh] });
  }
  for (const q of parts) if (q.life > 0.05) {   // (a particle's size s is in 2-unit steps)
    const n = toPx(2 * (q.s || 1));
    lg.fillStyle = q.c; lg.fillRect(Math.round((q.x - camX) / PIXEL), Math.round(q.y / PIXEL + TOP_PX), n, n);
  }
  if (S.scene !== 'end' && !(S.scene === 'dawn' && S.sceneT > .3 && S.sceneT < 1.5)) {
    const goal = S.plats.find(p => p.goal), goalX = goal ? goal.x0 + S.level.goalOffset : S.level.length;
    drawHUD(Math.min(1, PL.x / goalX));
  }   // (hidden while the dawn covers the screen)
  if (S.scene === 'end') drawEndFg(S.sceneT);
}

// The level's end: the world stays, Ichigo sitting by the lantern; a panel
// like the story cards' (night, edged in pale ink) says which level is done, how it went, and any
// thing Ichigo learned. All in the pixel font.
export function drawEndFg(t) {
  if (t < 1) return;
  const L = S.level, learned = S.learned.filter(id => LEARNED[id].level === L.number);   // (what this level teaches)
  const lines = [
    [`LEVEL ${NUMBER_WORDS[L.number]} DONE`, P.gold],
    [L.name.toUpperCase(), P.mist],
  ];
  if (L.number === 1) lines.push(null, [S.deaths ? `ICHIGO FELL IN THE SEA ${S.deaths === 1 ? 'ONCE' : S.deaths + ' TIMES'}` : 'ICHIGO NEVER FELL IN', P.aqua]);
  const s = iconSize(true), w = Math.min(LW - 40, 440), pad = 16;
  const h = pad * 2 + lines.length * LINE + (learned.length ? s + 12 : 0) + 30, x = Math.round((LW - w) / 2), y = 28;
  lg.fillStyle = P.mist; lg.fillRect(x - 2, y - 2, w + 4, h + 4);
  lg.fillStyle = P.night; lg.fillRect(x, y, w, h);
  lines.forEach((ln, i) => ln && pixelText(ln[0], LW / 2, y + pad + i * LINE, ln[1], 'center'));
  let yy = y + pad + lines.length * LINE + 6;
  if (learned.length) {   // what was learned, in pictures
    const label = 'LEARNED:', lw = label.length * LETTER + 8, total = lw + learned.length * (s + 6);
    let xx = Math.round(LW / 2 - total / 2);
    pixelText(label, xx, yy + (s - 14) / 2, P.mist); xx += lw;
    for (const id of learned) { drawIcon(lg, LEARNED[id].icon, xx, yy); xx += s + 6; }
    yy += s + 12;
  }
  if (t > 2.5 && Math.sin(S.T * 4) > -0.3) pixelText('PRESS ANY KEY', LW / 2, y + h - pad - 10, P.grey1, 'center');
}

// Wordless HUD: tally marks for each tomorrow, and the voyage so far: a little boat (Ichigo in red)
// working its way along a twisted rope toward home. (In pixels: it keeps its size on both screens.)
const HUD_BOAT = scale2x(['...K....', '...R....', 'KYYYYYYK', '.KTTTTK.']);
const HOME = scale2x(['...K...', '..KOK..', '.KOOOK.', 'KOOOOOK', '.GGGGG.', '.GGKGG.']);   // the family house from the intro: grey walls, olive thatch
// pr: how far through the level Ichigo is (0..1).
export function drawHUD(pr) {
  lg.fillStyle = P.mist;   // (pale, against the dusk)
  for (let i = 0; i < Math.min(S.deaths, 30); i++) {   // tally marks, struck through in fives
    const gI = Math.floor(i / 5), j = i % 5, bx = 16 + gI * 24;
    if (j < 4) lg.fillRect(bx + j * 4, 14, 2, 14); else for (let s = 0; s < 18; s++) lg.fillRect(bx - 2 + s, 24 - Math.floor(s * .6), 1, 2);
  }
  const x0 = LW - 160, len = 124;
  for (let x = 0; x < len; x++) for (let y = 0; y < 4; y++) {   // the rope, two strands twisting round each other
    lg.fillStyle = (x + y) % 8 < 4 ? P.ochre : P.brown; lg.fillRect(x0 + x, 22 + y, 1, 1);
  }
  drawPix(lg, HOME, x0 + len + 2, 14);
  drawPix(lg, HUD_BOAT, x0 + Math.round(pr * (len - 16)), 14 + Math.round(Math.sin(S.T * 3) * 1.2));
  pixelText(`${S.level.number}/15`, LW - 16, 34, P.mist, 'right', P.night);
}
