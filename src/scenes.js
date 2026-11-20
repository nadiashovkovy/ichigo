// ============================================================================
// scenes.js — what's on screen: the title, the beach intro, play, a new tomorrow, the level's end.
// ============================================================================
import { W, H, LW, PX, P } from './config.js';
import { S, parts } from './state.js';
import { lg, tg, topC, beginWorld, beginTop, pixelSpace, quantize } from './pixel.js';
import { pixelText, drawCover } from './text.js';
import { inLeft, inRight } from './input.js';
import { seaY } from './sea.js';
import { claws, bubbles, drawSky, drawFar, drawGreatWave, drawSea } from './art.js';
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
export function drawTitle() {
  beginWorld(); drawSky(lg, 0, { x: 640, base: 455, s: 0.42 });
  const hg = lg.createLinearGradient(0, 440, 0, 480); hg.addColorStop(0, P.pale); hg.addColorStop(1, P.steel);
  lg.fillStyle = hg; lg.fillRect(0, 452, W, H);
  drawGreatWave(lg, 760, 560, 0.42, S.T, true);           // the small peak in front of Fuji
  drawGreatWave(lg, 330, 600, 1.15, S.T, false, true);    // the great wave
  for (const [bx, by, r] of [[560, 505, .14], [150, 540, -.1]]) {   // boats in the trough
    lg.save(); lg.translate(bx, by); lg.rotate(r); lg.fillStyle = P.ochre; lg.strokeStyle = P.ink; lg.lineWidth = 3;
    lg.beginPath(); lg.moveTo(-110, -6); lg.lineTo(110, -14); lg.quadraticCurveTo(90, 18, 0, 18); lg.quadraticCurveTo(-90, 18, -110, -6); lg.fill(); lg.stroke();
    lg.fillStyle = P.navy; for (let i = -80; i < 90; i += 22) lg.fillRect(i, -22, 9, 12);
    lg.restore();
  }
  lg.save(); lg.translate(0, 70); drawSea(lg, 0, S.T); lg.restore();
  pixelSpace(lg); quantize(lg);
  drawCover('ICHIGO', 44, 228, 10);
  pixelText('A CHILD OF THE SEA', 228, 64, P.navy, 'center');
  pixelText('<- -> MOVE', 228, 82, P.ink, 'center');
  pixelText('SHIFT RUN   SPACE JUMP', 228, 92, P.ink, 'center');
  if (Math.sin(S.T * 4) > -0.3) pixelText('PRESS ANY KEY', 228, 110, P.red, 'center');
}

// Intro: Ichigo digging on the beach by the family house; the great wave rises and takes everything.
export function drawIntro(t) {
  beginWorld(); drawSky(lg, 0);
  lg.fillStyle = P.pale; lg.fillRect(0, 375, W, H);
  const sg = lg.createLinearGradient(0, 400, 0, H); sg.addColorStop(0, P.tan); sg.addColorStop(1, P.tanD);
  lg.fillStyle = sg; lg.beginPath(); lg.moveTo(0, 400); lg.lineTo(560, 410); lg.quadraticCurveTo(640, 430, 700, H); lg.lineTo(0, H); lg.fill();
  lg.fillStyle = P.grey3; lg.fillRect(90, 330, 110, 75); lg.fillStyle = P.ink; lg.fillRect(135, 360, 18, 45);   // family house
  lg.fillStyle = P.olive; lg.beginPath(); lg.moveTo(66, 336); lg.lineTo(145, 276); lg.lineTo(224, 336); lg.fill();
  lg.fillStyle = P.tanD; lg.fillRect(394, 397, 18, 15); lg.fillRect(399, 388, 9, 9);   // sandcastle
  const k = Math.max(0, Math.min(1, (t - 1.8) / 2.6));
  lg.fillStyle = P.navy; lg.beginPath(); lg.moveTo(640, H);
  for (let x = 640; x <= W; x += 8) lg.lineTo(x, 430 + Math.sin(x * .03 + S.T * 2) * 4 - k * 12);
  lg.lineTo(W, H); lg.fill();
  if (t > 1.8) drawGreatWave(lg, 1000 - k * 700, 540, 0.5 + k * 0.9, S.T, false);
  pixelSpace(lg); quantize(lg);
  const look = t > 2.6;
  drawSprite(lg, look ? 'stand' : (Math.sin(S.T * 10) > 0 ? 'dig1' : 'dig2'), 430 / PX, 412 / PX, look ? 1 : -1, 0);
  if (t > 4.4) {
    beginTop(); const f = Math.min(1, (t - 4.4) / 0.6);
    tg.fillStyle = P.navy; tg.fillRect(0, H - f * H, W, f * H);
    for (let x = 0; x < W; x += 45) claws(tg, x + 20, H - f * H, 2.2);
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
  if (S.scene === 'play' && S.sceneT < 0.5) { tg.globalAlpha = 1 - S.sceneT / 0.5; tg.fillStyle = P.sky; tg.fillRect(0, 0, W, H); tg.globalAlpha = 1; }
  if (S.scene === 'dawn') drawDawn(tg, S.sceneT);
  if (S.scene === 'end') drawEndBg(tg, S.sceneT);
  pixelSpace(tg); quantize(tg); lg.drawImage(topC, 0, 0);
  const showIchigo = !(S.scene === 'dawn' && S.sceneT < 0.9) && S.scene !== 'end' && !(S.scene === 'play' && S.sceneT < 0.25);
  if (showIchigo) {
    const moving = PL.ground && Math.abs(PL.vu) > 20 && (inLeft() || inRight());
    const wobbly = PL.ground && floating(PL.ground) && Math.abs(PL.ground.ang) > .14;   // arms out to balance
    const frame = !PL.ground ? 'jump' : moving ? ['stand', 'step1', 'stand', 'step2'][Math.floor(PL.anim / 1.6) % 4] : wobbly ? 'balance' : 'stand';
    drawSprite(lg, frame, (PL.x - camX) / PX, PL.y / PX, PL.face, Math.min(5, S.deaths));
  }
  for (const q of parts) if (q.life > 0.05) { lg.fillStyle = q.c; lg.fillRect(Math.round((q.x - camX) / PX), Math.round(q.y / PX), 1, 1); }
  if (S.scene !== 'end') drawHUD();
  if (S.scene === 'end') drawEndFg(S.sceneT);
}

// After a fall: the sun rises on a new tomorrow.
function drawDawn(g, t) {
  const a = t < .5 ? t / .5 : t > 1.3 ? Math.max(0, 1 - (t - 1.3) / .4) : 1;
  g.globalAlpha = a; g.fillStyle = P.sky; g.fillRect(0, 0, W, H);
  g.fillStyle = P.red; g.beginPath(); g.arc(W / 2, 330 - Math.min(1, t / 1.2) * 90, 52, 0, 7); g.fill();
  g.fillStyle = P.sky; g.fillRect(0, 330, W, H);
  g.fillStyle = P.navy; for (let i = 0; i < 4; i++) g.fillRect(W / 2 - 130 + i * 15, 340 + i * 15, 260 - i * 30, 6);
  g.globalAlpha = 1;
}
function drawEndBg(g, t) {
  g.globalAlpha = Math.min(1, t / 1.5); g.fillStyle = P.sky; g.fillRect(0, 0, W, H);
  g.fillStyle = P.navy; g.fillRect(0, 420, W, 120); for (let x = 0; x < W; x += 75) claws(g, x + 30, 422, 1.3, 4, 1);
  bubbles(g, 0, W, () => 422, 11, 70, .6);
  g.globalAlpha = 1;
}
function drawEndFg(t) {
  if (t < 1) return;
  const L = S.level;
  drawCover(`${L.number} / 15`, 30, LW / 2, 22);
  pixelText(`LEVEL ${NUMBER_WORDS[L.number]}: ${L.name}`, LW / 2, 70, P.ink, 'center');
  pixelText(S.deaths ? 'TOMORROWS: ' + S.deaths : 'NOT ONE TOMORROW NEEDED', LW / 2, 104, P.navy, 'center');
  drawSprite(lg, 'stand', LW / 2, 132, 1, Math.min(5, S.deaths));
  if (t > 2.5 && Math.sin(S.T * 4) > -0.3) pixelText('PRESS ANY KEY', LW / 2, 160, P.foam, 'center', P.ink);
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
