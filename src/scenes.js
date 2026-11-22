// ============================================================================
// scenes.js — what's on screen: the title, the beach intro, play, a new tomorrow, the level's end.
// ============================================================================
import { W, H, TOP, LW, LH, TOP_PX, PIXEL, P, px, onPixel, setWidth, SPRITE_SCALE } from './config.js';
import { S, parts } from './state.js';
import { lg, tg, topC, beginWorld, beginTop, pixelSpace, quantize } from './pixel.js';
import { pixelText, drawCover } from './text.js';
import { inLeft, inRight } from './input.js';
import { seaY } from './sea.js';
import { claws, crest, bubbles, drawSky, drawFar, drawGreatWave, drawSea } from './art.js';
import { floating, drawWreckage, updateWreckage } from './wreckage.js';
import { PL, spawn } from './player.js';
import { drawSprite } from './sprite.js';

const NUMBER_WORDS = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN'];

export function startLevel() {
  S.checkpoint = S.plats[0]; S.deaths = 0;
  for (const p of S.plats) p.flag = 0;
  updateWreckage(S.T, 0, PL); spawn(); S.camX = 0; S.scene = 'play'; S.sceneT = 0;
}

// Title: composed like the print — the great wave on the left curling right, a small Fuji in the trough.
// Laid out in a 720×540 frame for the 4:3 screen, scaled (k) to fill the screen at any zoom. On a
// wider screen it's centred (dx) with the sky and sea running out to the sides.
export function drawTitle() {
  const k = LH * PIXEL / 540, dx = (W / k - 720) / 2, dpx = Math.round((LW - 320) / 2), screenLW = LW;
  beginWorld(); lg.translate(0, -TOP); lg.scale(k, k);   // now in the frame: top-left of the screen, 720×540
  setWidth(LW / k);   // so the sky and sea fill the frame's whole width (restored below)
  drawSky(lg, 0, { x: 480 + dx, base: 341, s: 0.315 }, 0);
  const hg = lg.createLinearGradient(0, 330, 0, 360); hg.addColorStop(0, P.pale); hg.addColorStop(1, P.steel);
  lg.fillStyle = hg; lg.fillRect(0, 339, W, H);
  drawGreatWave(lg, 570 + dx, 420, 0.315, S.T, true);          // the small peak in front of Fuji
  drawGreatWave(lg, 248 + dx, 450, 0.86, S.T, false, true);    // the great wave
  for (const [bx, by, r] of [[420, 379, .14], [112, 405, -.1]]) {   // boats in the trough
    lg.save(); lg.translate(bx + dx, by); lg.rotate(r); lg.scale(.75, .75);
    lg.fillStyle = P.ochre; lg.strokeStyle = P.ink; lg.lineWidth = 1 / Math.abs(lg.getTransform().a) / Math.cos(r);   // one pixel
    lg.beginPath(); lg.moveTo(-110, -6); lg.lineTo(110, -14); lg.quadraticCurveTo(90, 18, 0, 18); lg.quadraticCurveTo(-90, 18, -110, -6); lg.fill(); lg.stroke();
    lg.fillStyle = P.navy; for (let i = -80; i < 90; i += 22) lg.fillRect(i, -21, 9, 12);
    lg.restore();
  }
  lg.save(); lg.translate(0, -55); drawSea(lg, 0, S.T); lg.fillStyle = P.navy; lg.fillRect(0, H - 3, W, 60); lg.restore();   // (sea raised, so fill below it)
  setWidth(screenLW);
  pixelSpace(lg); quantize(lg);
  const tx = 228 + dpx;   // the words, over the sky on the right
  drawCover('ICHIGO', 44, tx, 10);
  pixelText('A CHILD OF THE SEA', tx, 64, P.navy, 'center');
  pixelText('<- -> MOVE', tx, 82, P.ink, 'center');
  pixelText('SHIFT RUN   SPACE JUMP', tx, 92, P.ink, 'center');
  if (Math.sin(S.T * 4) > -0.3) pixelText('PRESS ANY KEY', tx, 110, P.red, 'center');
}

// Intro: Ichigo digging on the beach by the family house; the great wave rises and takes everything.
export function drawIntro(t) {
  beginWorld(); drawSky(lg, 0);
  lg.fillStyle = P.pale; lg.fillRect(0, 375, W, H);
  const sg = lg.createLinearGradient(0, 400, 0, H); sg.addColorStop(0, P.tan); sg.addColorStop(1, P.tanD);
  lg.fillStyle = sg; lg.beginPath(); lg.moveTo(0, 400); lg.lineTo(560, 410); lg.quadraticCurveTo(640, 430, 700, H); lg.lineTo(0, H); lg.fill();
  lg.fillStyle = P.grey3; lg.fillRect(90, 330, 110, 75); lg.fillStyle = P.ink; lg.fillRect(135, 360, 18, 45);   // family house
  lg.fillStyle = P.olive; lg.beginPath(); lg.moveTo(66, 336); lg.lineTo(145, 276); lg.lineTo(224, 336); lg.fill();
  lg.fillStyle = P.tanD; lg.fillRect(393, 396, 18, 15); lg.fillRect(399, 387, 9, 9);   // sandcastle
  const k = Math.max(0, Math.min(1, (t - 1.8) / 2.6));
  lg.fillStyle = P.navy; lg.beginPath(); lg.moveTo(640, H);
  for (let x = 640; x <= W; x += 8) lg.lineTo(x, 430 + Math.sin(x * .03 + S.T * 2) * 4 - k * 12);
  lg.lineTo(W, H); lg.fill();
  if (t > 1.8) drawGreatWave(lg, W + 40 - k * (W - 260), 540, 0.5 + k * 0.9, S.T, false);   // rolls in from just off the right edge
  pixelSpace(lg); quantize(lg);
  const look = t > 2.6;
  drawSprite(lg, look ? 'stand' : (Math.sin(S.T * 10) > 0 ? 'dig1' : 'dig2'), 430 / PIXEL, 412 / PIXEL + TOP_PX, look ? 1 : -1, 0);
  if (t > 4.4) {
    beginTop(); const f = Math.min(1, (t - 4.4) / 0.6);
    const wy = H - f * (H + TOP);   // the wall of water rises all the way to the top of the screen
    tg.fillStyle = P.navy; tg.fillRect(0, wy, W, H - wy);
    for (let x = 0; x < W; x += 45) claws(tg, x + 20, wy, 2.2);
    pixelSpace(tg); quantize(tg); lg.drawImage(topC, 0, 0);
  }
}

// Play (also used under the 'dawn' and 'end' overlays).
// Order: sky and distant sea → near sea → wreckage (only the part above the waterline) → Ichigo → HUD.
export function drawPlay() {
  const camX = S.camX, T = S.T;
  beginWorld(); drawSky(lg, camX); drawFar(lg, camX, T);
  pixelSpace(lg); quantize(lg);
  beginTop(); drawSea(tg, camX, T);
  tg.save(); tg.beginPath(); tg.moveTo(-10, -10); tg.lineTo(W + 10, -10);
  for (let sx = W + 10; sx >= -10; sx -= 6) tg.lineTo(sx, seaY(sx + camX, T) + 4);
  tg.closePath(); tg.clip();
  for (const p of S.plats) drawWreckage(tg, p, camX, T);
  tg.restore();
  if (S.scene === 'play' && S.sceneT < 0.5) { tg.globalAlpha = 1 - S.sceneT / 0.5; tg.fillStyle = P.sky; tg.fillRect(0, -TOP, W, H + TOP); tg.globalAlpha = 1; }
  if (S.scene === 'dawn') drawDawn(tg, S.sceneT);
  if (S.scene === 'end') drawEndBg(tg, S.sceneT);
  pixelSpace(tg); quantize(tg); lg.drawImage(topC, 0, 0);
  const showIchigo = !(S.scene === 'dawn' && S.sceneT < 0.9) && S.scene !== 'end' && !(S.scene === 'play' && S.sceneT < 0.25);
  if (showIchigo) {
    const moving = PL.ground && Math.abs(PL.vu) > 20 && (inLeft() || inRight());
    const wobbly = PL.ground && floating(PL.ground) && Math.abs(PL.ground.ang) > .14;   // arms out to balance
    const frame = !PL.ground ? 'jump' : moving ? ['stand', 'step1', 'stand', 'step2'][Math.floor(PL.anim / 1.6) % 4] : wobbly ? 'balance' : 'stand';
    drawSprite(lg, frame, (PL.x - camX) / PIXEL, PL.y / PIXEL + TOP_PX, PL.face, Math.min(5, S.deaths));
  }
  for (const q of parts) if (q.life > 0.05) { lg.fillStyle = q.c; lg.fillRect(Math.round((q.x - camX) / PIXEL), Math.round(q.y / PIXEL) + TOP_PX, 1, 1); }
  if (S.scene !== 'end') drawHUD();
  if (S.scene === 'end') drawEndFg(S.sceneT);
}

// After a fall: the sun rises on a new tomorrow.
function drawDawn(g, t) {
  const a = t < .5 ? t / .5 : t > 1.3 ? Math.max(0, 1 - (t - 1.3) / .4) : 1;
  g.globalAlpha = a; g.fillStyle = P.sky; g.fillRect(0, -TOP, W, H + TOP);
  g.fillStyle = P.red; g.beginPath(); g.arc(W / 2, 330 - Math.min(1, t / 1.2) * 90, 52, 0, 7); g.fill();
  g.fillStyle = P.sky; g.fillRect(0, 330, W, H);
  g.fillStyle = P.navy; for (let i = 0; i < 4; i++) g.fillRect(onPixel(W / 2 - 130) + i * 15, 339 + i * 15, 258 - i * 30, 6);
  g.globalAlpha = 1;
}
function drawEndBg(g, t) {
  g.globalAlpha = Math.min(1, t / 1.5); g.fillStyle = P.sky; g.fillRect(0, -TOP, W, H + TOP);
  g.fillStyle = P.navy; g.fillRect(0, 420, W, 120); for (let x = 0; x < W; x += 75) crest(g, x + 30, 423, true, 1);
  bubbles(g, 0, W, () => 422, 11, 70, .6);
  g.globalAlpha = 1;
}
function drawEndFg(t) {
  if (t < 1) return;
  const L = S.level;
  const sea = Math.round((420 + TOP) / PIXEL);   // the sea's surface, in pixels: Ichigo stands just above it
  const head = sea - 4 - Math.round(18 * SPRITE_SCALE);   // top of Ichigo's head; the words sit above it
  drawCover(`${L.number} / 15`, 30, LW / 2, Math.max(8, head - 100));
  pixelText(`LEVEL ${NUMBER_WORDS[L.number]}: ${L.name}`, LW / 2, head - 44, P.ink, 'center');
  pixelText(S.deaths ? 'TOMORROWS: ' + S.deaths : 'NOT ONE TOMORROW NEEDED', LW / 2, head - 18, P.navy, 'center');
  drawSprite(lg, 'stand', LW / 2, sea - 4, 1, Math.min(5, S.deaths));
  if (t > 2.5 && Math.sin(S.T * 4) > -0.3) pixelText('PRESS ANY KEY', LW / 2, sea + 24, P.foam, 'center', P.ink);
}

// Wordless HUD: tally marks for each tomorrow, and a line showing the voyage so far.
function drawHUD() {
  lg.fillStyle = P.ink;
  for (let i = 0; i < Math.min(S.deaths, 30); i++) {
    const gI = Math.floor(i / 5), j = i % 5, bx = 8 + gI * 12;
    if (j < 4) lg.fillRect(bx + j * 2, 7, 1, 7); else for (let s = 0; s < 9; s++) lg.fillRect(bx - 1 + s, 12 - Math.floor(s * .6), 1, 1);
  }
  const goal = S.plats.find(p => p.goal), goalX = goal ? goal.x0 + S.level.goalOffset : S.level.length;
  const pr = Math.min(1, PL.x / goalX);
  lg.fillStyle = P.grey3; lg.fillRect(LW - 74, 10, 66, 1);
  lg.fillStyle = P.red; lg.fillRect(LW - 74 + Math.round(pr * 64), 8, 3, 5);
  pixelText(`${S.level.number}/15`, LW - 8, 15, P.ink, 'right');
}
