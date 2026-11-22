// ============================================================================
// scenes.js — what's on screen: the title, the beach intro, play, a new tomorrow, the level's end.
// ============================================================================
import { W, H, TOP, LW, LH, TOP_PX, PIXEL, P, px, onPixel, setWidth } from './config.js';
import { S, parts } from './state.js';
import { lg, tg, topC, beginWorld, beginTop, pixelSpace, quantize, cellify } from './pixel.js';
import { pixelText, drawCover } from './text.js';
import { inLeft, inRight } from './input.js';
import { seaY } from './sea.js';
import { drawSky, drawFar, drawFuji, drawSwells, drawSea, drawChartSea, drawLife, drawPix, CELL } from './art.js';
import { floating, drawWreckage, updateWreckage } from './wreckage.js';
import { PL, spawn } from './player.js';
import { drawSprite, SPRITE_H } from './sprite.js';
import { drawTitleArt } from './title.js';
import { drawDawn } from './dawn.js';

const NUMBER_WORDS = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN'];

export function startLevel() {
  S.checkpoint = S.plats[0]; S.deaths = 0;
  for (const p of S.plats) p.flag = 0;
  updateWreckage(S.T, 0, PL); spawn(); S.camX = 0; S.scene = 'play'; S.sceneT = 0;
}

// Title: Hokusai's Great Wave as pixel art, gently moving (see title.js), with the words in the sky.
export function drawTitle() {
  pixelSpace(lg);
  const { x, w } = drawTitleArt(lg, S.T);
  const tx = x + Math.round(w * .725);   // the words, over the sky on the right
  drawCover('ICHIGO', 36, tx, 5);
  pixelText('A CHILD OF THE SEA', tx, 48, P.navy, 'center');
  pixelText('<- -> MOVE', tx, 62, P.ink, 'center');   // short lines, clear of the wave's claws
  pixelText('SHIFT RUN', tx, 71, P.ink, 'center');
  pixelText('SPACE JUMP', tx, 80, P.ink, 'center');
  if (Math.sin(S.T * 4) > -0.3) pixelText('PRESS ANY KEY', tx, 94, P.red, 'center');
}

// Intro: Ichigo digging on the beach by the family house. The great wave (cut from the title
// card's chart) rises out of the sea and rolls in, and the sea climbs over everything.
const greatWave = new Image(); greatWave.src = 'assets/great_wave.png';
// The great wave in the intro, flipped to reach left toward Ichigo: it rises out of the sea on the
// right and rolls in (until 4.4 s), then pitches forward and crashes down as the sea climbs.
function drawIntroWave(g, t) {   // (only the top 62 rows of the cut-out: below that it's foreground sea)
  if (t < 1.4 || !greatWave.width) return;
  const k = Math.min(1, (t - 1.4) / 3), e = k * k * (3 - 2 * k), late = Math.max(0, t - 4.4);
  const rows = 62, w = greatWave.width * CELL, h = rows * CELL, horizon = Math.round(400 / PIXEL + TOP_PX);
  const x = Math.round((LW - e * (LW - 150) - late * 300) / CELL) * CELL;
  const top = Math.round((horizon + 16 - e * h + late * late * 700) / CELL) * CELL;
  pixelSpace(g); g.imageSmoothingEnabled = false;
  g.save(); g.translate(x + w, 0); g.scale(-1, 1); g.drawImage(greatWave, 0, 0, greatWave.width, rows, 0, top, w, h); g.restore();
}
export function drawIntro(t) {
  beginWorld(); drawSky(lg, 0); drawFuji(lg, 0, S.level.fuji);
  const hg = lg.createLinearGradient(0, 375, 0, 420); hg.addColorStop(0, P.pale); hg.addColorStop(1, P.steel);
  lg.fillStyle = hg; lg.fillRect(0, 380, W, H);   // the sea on the horizon
  if (t <= 4.4) { drawIntroWave(lg, t); beginWorld(); }
  drawSwells(lg, 0, S.T);
  const sg = lg.createLinearGradient(0, 400, 0, H); sg.addColorStop(0, P.tan); sg.addColorStop(1, P.tanD);
  lg.fillStyle = sg; lg.beginPath(); lg.moveTo(0, 400); lg.lineTo(560, 410); lg.quadraticCurveTo(640, 430, 700, H); lg.lineTo(0, H); lg.fill();
  lg.fillStyle = P.grey3; lg.fillRect(90, 330, 110, 75); lg.fillStyle = P.outline; lg.fillRect(135, 360, 18, 45);   // family house
  lg.fillStyle = P.olive; lg.beginPath(); lg.moveTo(66, 336); lg.lineTo(145, 276); lg.lineTo(224, 336); lg.fill();
  lg.fillStyle = P.tanD; lg.fillRect(393, 396, 18, 15); lg.fillRect(399, 387, 9, 9);   // sandcastle
  pixelSpace(lg); quantize(lg); cellify(lg);
  beginWorld(); lg.save();   // the sea beside the beach (seen on a wide screen), in cells like the level's
  lg.beginPath(); lg.moveTo(560, 396); lg.lineTo(W + 10, 396); lg.lineTo(W + 10, H); lg.lineTo(700, H); lg.quadraticCurveTo(640, 430, 560, 410); lg.closePath(); lg.clip();
  drawChartSea(lg, 0, S.T, wx => 414 + Math.sin(wx * .02 - S.T * 1.5) * 4);
  lg.restore(); pixelSpace(lg);
  const look = t > 2.6;
  drawSprite(lg, look ? 'stand' : (Math.sin(S.T * 10) > 0 ? 'dig1' : 'dig2'), 430 / PIXEL, 412 / PIXEL + TOP_PX, look ? 1 : -1, 0);
  if (t > 4.4) {   // the sea climbs over everything, all the way to the top of the screen
    beginTop(); const f = Math.min(1, (t - 4.4) / 0.6), wy = H + 30 - f * (H + TOP + 90);
    drawChartSea(tg, 0, S.T, wx => wy + Math.sin(wx * .02 + S.T * 3) * 12);
    drawIntroWave(tg, t);   // the wave stays in front, crashing down into it
    pixelSpace(tg); quantize(tg); lg.drawImage(topC, 0, 0);
  }
}

// Play (also used under the 'dawn' and 'end' overlays).
// Order: sky and distant sea → near sea → wreckage (only the part above the waterline) → Ichigo → HUD.
export function drawPlay() {
  const camX = S.camX, T = S.T;
  beginWorld(); drawSky(lg, camX); drawFar(lg, camX, T, S.level.fuji);
  pixelSpace(lg); quantize(lg); drawLife(lg, camX, T);
  beginTop(); drawSea(tg, camX, T);
  tg.save(); tg.beginPath(); tg.moveTo(-10, -10); tg.lineTo(W + 10, -10);
  for (let sx = W + 10; sx >= -10; sx -= 6) tg.lineTo(sx, seaY(sx + camX, T) + 4);
  tg.closePath(); tg.clip();
  for (const p of S.plats) drawWreckage(tg, p, camX, T);
  tg.restore();
  if (S.scene === 'play' && S.sceneT < 0.5) { tg.globalAlpha = 1 - S.sceneT / 0.5; tg.fillStyle = P.sky; tg.fillRect(0, -TOP, W, H + TOP); tg.globalAlpha = 1; }
  if (S.scene === 'end') drawEndBg(tg, S.sceneT);
  pixelSpace(tg); quantize(tg); lg.drawImage(topC, 0, 0);
  if (S.scene === 'dawn') drawDawn(lg, S.sceneT, S.deaths - 1);   // a new tomorrow: a different Hokusai print each fall (dawn.js)
  const showIchigo = !(S.scene === 'dawn' && S.sceneT < 1.45) && S.scene !== 'end' && !(S.scene === 'play' && S.sceneT < 0.25);
  if (showIchigo) {
    const moving = PL.ground && Math.abs(PL.vu) > 20 && (inLeft() || inRight());
    const wobbly = PL.ground && floating(PL.ground) && Math.abs(PL.ground.ang) > .14;   // arms out to balance
    const frame = !PL.ground ? 'jump' : moving ? ['stand', 'step1', 'stand', 'step2'][Math.floor(PL.anim / 1.6) % 4] : wobbly ? 'balance' : 'stand';
    drawSprite(lg, frame, (PL.x - camX) / PIXEL, PL.y / PIXEL + TOP_PX, PL.face, Math.min(5, S.deaths));
  }
  for (const q of parts) if (q.life > 0.05) { lg.fillStyle = q.c; lg.fillRect(Math.round((q.x - camX) / PIXEL), Math.round(q.y / PIXEL) + TOP_PX, q.s || 1, q.s || 1); }
  if (S.scene !== 'end' && !(S.scene === 'dawn' && S.sceneT > .3 && S.sceneT < 1.5)) drawHUD();   // (hidden while the dawn covers the screen)
  if (S.scene === 'end') drawEndFg(S.sceneT);
}

function drawEndBg(g, t) {
  g.globalAlpha = Math.min(1, t / 1.5); g.fillStyle = P.sky; g.fillRect(0, -TOP, W, H + TOP);
  g.fillStyle = P.navy; g.fillRect(0, 420, W, 120);
  g.globalAlpha = 1;
}
function drawEndFg(t) {
  if (t < 1) return;
  const L = S.level;
  const sea = Math.round((420 + TOP) / PIXEL);   // the sea's surface, in pixels: Ichigo stands just above it
  const head = sea - 4 - SPRITE_H;   // top of Ichigo's head; the words sit above it
  drawCover(`${L.number} / 15`, 30, LW / 2, Math.max(8, head - 100));
  pixelText(`LEVEL ${NUMBER_WORDS[L.number]}: ${L.name}`, LW / 2, head - 44, P.ink, 'center');
  pixelText(S.deaths ? 'TOMORROWS: ' + S.deaths : 'NOT ONE TOMORROW NEEDED', LW / 2, head - 18, P.navy, 'center');
  drawSprite(lg, 'stand', LW / 2, sea - 4, 1, Math.min(5, S.deaths));
  if (t > 2.5 && Math.sin(S.T * 4) > -0.3) pixelText('PRESS ANY KEY', LW / 2, sea + 24, P.foam, 'center', P.ink);
}

// Wordless HUD: tally marks for each tomorrow, and the voyage so far: a little boat (Ichigo in red)
// working its way along a twisted rope toward home.
const HUD_BOAT = ['...K....', '...R....', 'KYYYYYYK', '.KTTTTK.'];
const HOME = ['...K...', '..KOK..', '.KOOOK.', 'KOOOOOK', '.GGGGG.', '.GGKGG.'];   // the family house from the intro: grey walls, olive thatch
function drawHUD() {
  lg.fillStyle = P.ink;
  for (let i = 0; i < Math.min(S.deaths, 30); i++) {
    const gI = Math.floor(i / 5), j = i % 5, bx = 8 + gI * 12;
    if (j < 4) lg.fillRect(bx + j * 2, 7, 1, 7); else for (let s = 0; s < 9; s++) lg.fillRect(bx - 1 + s, 12 - Math.floor(s * .6), 1, 1);
  }
  const goal = S.plats.find(p => p.goal), goalX = goal ? goal.x0 + S.level.goalOffset : S.level.length;
  const pr = Math.min(1, PL.x / goalX), x0 = LW - 80, len = 62;
  for (let x = 0; x < len; x++) {   // the rope, two strands twisting round each other
    lg.fillStyle = x % 4 < 2 ? P.ochre : P.brown; lg.fillRect(x0 + x, 11, 1, 1);
    lg.fillStyle = x % 4 < 2 ? P.brown : P.ochre; lg.fillRect(x0 + x, 12, 1, 1);
  }
  drawPix(lg, HOME, x0 + len + 1, 7);
  drawPix(lg, HUD_BOAT, x0 + Math.round(pr * (len - 8)), 7 + Math.round(Math.sin(S.T * 3) * .6));
  pixelText(`${S.level.number}/15`, LW - 8, 17, P.ink, 'right');
}
