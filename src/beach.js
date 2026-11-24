// ============================================================================
// beach.js — Level 1's prologue: the beach before the wave, which the player walks.
// Ichigo (three) digs, trips over the shovel and gets the strawberry plaster, fills the bucket at
// the water's edge and pours it into the hole. On the third pour the water drains away at once: the
// sea is pulling back. Kaa-chan calls Ichigo home, and Hokusai's great wave rises and falls on the
// beach wherever Ichigo is. Then two seconds of white, and the sea level begins.
// Kaa-chan isn't drawn: she's just inside the house. Her humming and her pictogram bubbles come from
// its doorway. (Her sprites, and Ojii-san's, are in people.js for later levels.)
// Nothing the player does changes how it ends.
// Positions are in game units (BEACH in config.js); there's no camera here.
// ============================================================================
import { W, H, TOP, LW, TOP_PX, PIXEL, P, MOVE, BEACH } from './config.js';
import { S, parts } from './state.js';
import { lg, tg, topC, beginWorld, beginTop, pixelSpace, quantize } from './pixel.js';
import { input, inLeft, inRight, inRun, inUse, keys } from './input.js';
import { drawScenery, drawChartSea, CELL, hsh } from './art.js';
import { drawSprite, spriteHeight } from './sprite.js';
import { say, drawBubbles, clearBubbles } from './bubbles.js';
import { humming, seaSound, waveRumble, waveCrash, silence } from './audio.js';
import { save, learnWord, gainMark } from './save.js';
import { updateParts } from './player.js';
import { showCards } from './cards.js';

// The story cards (cards.js): at the start of the beach, over the scene, and on the white after the wave.
const INTRO_CARDS = [
  'ICHIGO LIVES BY THE SEA WITH KAA-CHAN, THEIR MOTHER, IN A HOUSE WITH A STRAW ROOF.',
  'EVERY EVENING, WHILE KAA-CHAN MENDS THE NETS AND HUMS, ICHIGO PLAYS IN THE SAND WITH A BUCKET AND SHOVEL.',
  '<- -> WALK.  SPACE: HOP.  DOWN ARROW: DIG, FILL THE BUCKET, POUR IT OUT.  DIG A HOLE BY THE SANDCASTLE, THEN FILL IT WITH SEA WATER.',
];
export const WAKE_CARDS = [
  'THE SEA CAME FOR THE VILLAGE, AND TOOK EVERYTHING WITH IT.',
  'ICHIGO WAKES ON A PLANK IN THE OPEN SEA. FAR OFF, A STONE LANTERN SHINES ON AN ISLAND.',
  'JUMP FROM WRECK TO WRECK TO REACH IT. DON\'T STAND STILL: WET DECKS TILT, AND ICHIGO SLIDES.',
];

// Everything about the beach as it plays out. (Exposed on window.ichigo.beach for the test bot.)
export const B = {};
export function startBeach() {
  Object.assign(B, {
    phase: 'play', t: 0,   // 'play' → 'trip' (the fall and the plaster) → 'play' → 'recede' (the sea pulls back, the wave)
    x: 436, v: 0, face: -1, anim: 0, side: 0, moving: false, seated: true,   // Ichigo: sitting by the castle until the player does something
    y: 0, vy: 0, air: false, sulk: 0,   // y: how high off the sand, hopping
    full: false, dug: 0, hole: false, holeWater: 0, pours: 0, pouring: 0, digging: false,
    tripped: false, cut: false, plaster: false, pout: false, splash: 0,
    back: 0, waveT: 0, canSkip: S.seenWave, said: 0, called: false, rumbled: false, crashed: false,
  });
  parts.length = 0; clearBubbles(); input.jumpBuffer = 0; input.usePressed = false;
  S.scene = 'beach'; S.sceneT = 0;
  showCards(INTRO_CARDS);
}

const smooth = k => { k = Math.max(0, Math.min(1, k)); return k * k * (3 - 2 * k); };
const mini = () => PIXEL > 1.1;

// What "use" would do where Ichigo stands now (or null).
function action() {
  if (B.phase !== 'play' || B.seated || B.air) return null;
  const atDig = B.x >= BEACH.dig[0] && B.x <= BEACH.dig[1];
  if (!B.full && B.x >= BEACH.water) return 'fill';
  if (B.full && B.hole && atDig) return 'pour';
  if (!B.hole && atDig) return 'dig';
  return null;
}

export function updateBeach(dt, endBeach) {
  B.t += dt;
  const control = B.phase !== 'trip';
  const dir = control ? (inRight() ? 1 : 0) - (inLeft() ? 1 : 0) : 0;
  // Left alone a while, Ichigo sits down, bored. Any key gets them up at once (the lip stays out a moment).
  const wants = control && (dir || inUse() || input.usePressed || input.jumpBuffer > 0);
  if (B.seated && wants) { B.seated = false; B.sulk = BEACH.sulk; }
  B.sulk = Math.max(0, B.sulk - dt);
  B.idle = wants || B.air || B.phase !== 'play' ? 0 : (B.idle || 0) + dt;
  if (!B.seated && B.idle > (B.boredAt || (B.boredAt = BEACH.bored[0] + Math.random() * BEACH.bored[1]))) { B.seated = true; B.boredAt = 0; }

  // --- walking, with Sadie's sideways start ---
  if (dir && !B.moving) { B.moving = true; B.side = MOVE.sideStepTime; }
  if (!dir) { B.moving = false; B.side = 0; B.v = 0; }
  const speed = B.full ? MOVE.walk * BEACH.fullSlow : (inRun() ? MOVE.run : MOVE.walk);   // a full bucket: slower, no running (it would slop)
  if (dir) {
    if (B.side > 0) {   // three short sideways lurches, each a little bigger
      B.side -= dt;
      const f = 1 - Math.max(0, B.side) / MOVE.sideStepTime, i = Math.min(2, Math.floor(f * 3));
      B.v = dir * MOVE.walk * [.35, .6, .9][i] * 1.5 * Math.sin(Math.PI * (f * 3 - i));
    } else B.v = dir * speed;
    B.face = dir;
  }
  const edge = BEACH.edge + B.back;
  B.x = Math.max(BEACH.left, Math.min(edge, B.x + B.v * dt));
  if (B.x >= edge - 1 && dir > 0 && !B.air && B.back < 1 && (B.splash -= dt) < 0) {   // ankle-deep: a little splash
    B.splash = .18;   // SOUND: a small splash
    for (let i = 0; i < 4; i++) parts.push({ x: B.x + B.face * 6, y: BEACH.ground - 2, vx: (Math.random() - .3) * 80, vy: -80 - Math.random() * 90, life: .4, c: Math.random() < .5 ? P.white : P.aqua });
  }
  B.anim += dt * Math.abs(B.v) / 14;

  // --- the trip: the first time Ichigo walks right past the shovel ---
  if (B.phase === 'play' && !B.tripped && B.x > BEACH.trip && dir > 0) {
    B.tripped = true; B.phase = 'trip'; B.t = 0; B.cut = true; B.v = 0; B.moving = false;   // SOUND: thup
    B.y = B.vy = 0; B.air = false;   // (a hop doesn't clear the shovel: it catches their toe)
    for (let i = 0; i < 10; i++) parts.push({ x: B.x + 6, y: BEACH.ground - 2, vx: (Math.random() - .5) * 120, vy: -40 - Math.random() * 90, life: .5, c: P.tanD });
  }
  if (B.phase === 'trip') updateTrip();

  // --- a tiny hop: Ichigo is three, on sand. (Not while digging or pouring, nor with a full bucket: it would slop.) ---
  if (B.air) {
    B.vy -= BEACH.hopGravity * dt; B.y += B.vy * dt;
    if (B.y <= 0) {   // landing: a puff of sand, or a splash at the water's edge
      B.y = B.vy = 0; B.air = false;
      const wet = B.x > BEACH.edge - 12 && B.back < 1;
      for (let i = 0; i < 6; i++) parts.push({ x: B.x, y: BEACH.ground - 2, vx: (Math.random() - .5) * 110, vy: -30 - Math.random() * 60, life: .35, c: !wet ? P.tanD : Math.random() < .5 ? P.white : P.aqua });
    }
  }
  const canHop = control && !B.full && !(B.pouring > 0) && !(action() === 'dig' && inUse());
  if (!canHop || B.phase === 'trip') input.jumpBuffer = 0;
  else if (input.jumpBuffer > 0 && !B.air) { B.air = true; B.vy = BEACH.hop; input.jumpBuffer = 0; }
  input.jumpBuffer = Math.max(0, input.jumpBuffer - dt);   // (a press just before landing still counts)

  // --- use: dig, fill, pour ---
  const act = action();
  B.digging = act === 'dig' && inUse() && !dir;
  if (B.digging) { B.face = -1; B.dug += dt; if (B.dug >= BEACH.digTime) B.hole = true; }   // (facing the castle)
  if (input.usePressed) {
    if (act === 'fill') { B.full = true; for (let i = 0; i < 5; i++) parts.push({ x: B.x + B.face * 14, y: BEACH.ground - 6, vx: (Math.random() - .5) * 60, vy: -60 - Math.random() * 60, life: .35, c: P.aqua }); }   // SOUND: water into the bucket
    if (act === 'pour') pour();
  }
  input.usePressed = false;
  B.pouring = Math.max(0, B.pouring - dt);
  if (B.holeWater > 0) B.holeWater = Math.max(0, B.holeWater - dt / (B.pours >= 3 ? .35 : BEACH.soakTime));

  // --- the sea pulls back, then the wave ---
  if (B.phase === 'recede') {
    const t = B.t;
    B.back = BEACH.recede * smooth(t / 2);   // (the gulls stop: see main.js)
    if (t > 1.8 && !B.called) { B.called = true; say('kaachan', ['ichigo', 'arrow', 'house'], { time: 2.2 }); }   // from the doorway: "Come here. Now."
    B.waveT = t > 2.5 ? 1.4 + (t - 2.5) : 0;
    if (B.waveT > 1.4 && !B.rumbled) { B.rumbled = true; waveRumble(); }   // the wave rising: a rumble building
    if (B.waveT > 4.4 && !B.crashed) { B.crashed = true; waveCrash(); }     // and the crash
    if (B.waveT > 1.4 && !dir) B.face = 1;                                       // Ichigo faces the wave
    const skip = B.canSkip && t > 2.5 && keys.Enter;   // (later playthroughs only; not Space, which hops)
    if (B.waveT >= 5 || skip) { S.seenWave = true; save(); silence(); clearBubbles(); endBeach(skip); return; }   // cut to silence
  }

  // Kaa-chan hums inside as she mends (louder the nearer Ichigo is to the house), until the sea pulls back
  humming(B.phase !== 'recede', Math.max(.12, 1 - Math.abs(B.x - BEACH.kaachan) / 420));
  // the waves on the shore: louder nearer the water; going quiet as the sea pulls back
  seaSound((.25 + .75 * Math.max(0, Math.min(1, (B.x - 200) / 360))) * (1 - B.back / BEACH.recede));
  updateParts(dt);
}

function pour() {
  B.full = false; B.pours++; B.pouring = .5; B.face = -1; B.holeWater = 1;   // SOUND: pouring
  for (let i = 0; i < 8; i++) parts.push({ x: B.x - 14, y: BEACH.ground - 16, vx: -30 - Math.random() * 30, vy: -20 + Math.random() * 40, life: .45, c: Math.random() < .5 ? P.aqua : P.ocean });
  if (B.pours >= 3) { B.phase = 'recede'; B.t = 0; }   // the water drains away at once: the sea is pulling back
}

// The trip, about 5 seconds: Ichigo sits up, lip wobbling; the plaster goes on; "my little
// strawberry" from the house; "Kaa-chan." Then up again.
function updateTrip() {
  const t = B.t;
  B.pout = t > .2 && t < 1.2 && Math.floor(t * 8) % 2 === 0;
  if (t > 1) B.face = -1;                                                                   // Ichigo turns toward the house
  if (t > 2.2 && !B.plaster) { B.plaster = true; gainMark('chin'); }
  if (t > 2.7 && !B.said) { B.said = 1; say('kaachan', ['strawberry', 'heart'], { time: 1.7 }); }          // "My little strawberry."
  if (t > 3.4 && B.said === 1) { B.said = 2; say('ichigo', ['kaachan'], { note: true, time: 1.9 }); learnWord('kaa-chan'); }   // "Kaa-chan."
  if (t > 4.4) { B.phase = 'play'; B.t = 0; B.pout = false; }
}

// ============================================================================
// Drawing
// ============================================================================
// Hokusai's great wave (cut from the title card's chart, in the same colours as the sea) rises out
// of the water behind the beach, its claws grasping, then pitches forward and crashes as the sea
// climbs over everything.
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
const beachSurf = T => wx => 414 + Math.sin(wx * .02 - T * 1.5) * 4;   // the sea along the shore

// The beach and Ichigo's home (in game units; drawn smoothly, then snapped to the palette).
// back: how far the sea has pulled back from the shore, baring wet sand.
function drawBeach(g, back = 0) {
  const shore = (inset = 0) => { g.beginPath(); g.moveTo(0, 400); g.lineTo(560 - inset, 410); g.quadraticCurveTo(640 - inset, 430, 700 - inset, H); g.lineTo(0, H); g.closePath(); };
  g.fillStyle = P.mist; shore(-back); g.fill();     // foam at the water's edge,
  g.fillStyle = P.mauve; shore(6 - back); g.fill(); // a band of wet sand, shining with the dusk sky (wider as the sea pulls back),
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
  // Ichigo's sandcastle: a keep with two towers, crenellated, and a scrap of red for a flag
  g.save(); g.translate(-20, 0);
  g.fillStyle = P.tanD; g.fillRect(386, 398, 34, 14); g.fillRect(386, 386, 8, 12); g.fillRect(412, 386, 8, 12); g.fillRect(397, 380, 12, 18);
  for (const x of [386, 390, 412, 416, 397, 401, 405]) g.fillRect(x, x > 396 && x < 410 ? 376 : 382, 3, 4);
  g.fillStyle = P.wood; g.fillRect(400, 402, 6, 10); g.fillRect(386, 408, 34, 4);       // its gate, and its shadow
  g.fillStyle = P.brown; g.fillRect(402, 366, 1.5, 10); g.fillStyle = P.red; g.fillRect(403.5, 366, 7, 4); g.restore();
}
// The hole Ichigo digs in front of the castle (growing as they dig), and the water poured into it.
function drawHole(g) {
  const k = B.hole ? 1 : Math.min(1, B.dug / BEACH.digTime);
  if (k <= 0) return;
  g.fillStyle = P.ochre; g.beginPath(); g.ellipse(BEACH.hole + 14, 410, 6 * k, 3 * k, 0, 0, 7); g.fill();   // the sand dug out, in a heap
  g.fillStyle = P.brown; g.beginPath(); g.ellipse(BEACH.hole, 414, 10 * k, 3.5 * k, 0, 0, 7); g.fill();
  if (B.holeWater > 0) {
    const w = B.holeWater;
    g.fillStyle = P.ocean; g.beginPath(); g.ellipse(BEACH.hole, 414, 9 * w, 3 * w, 0, 0, 7); g.fill();
    g.fillStyle = P.aqua; g.fillRect(BEACH.hole - 5 * w, 413, 4 * w, 2);
  }
}
// The red shovel lying in the sand (pixels): kicked a little way on when Ichigo trips over it.
const SHOVEL = ['.........hh.', 'RRRRRRRRhhhh', '.........hh.'];
const SHOVEL_C = { R: P.red, h: P.grey2 };
// The ▼ shown over Ichigo when "use" would do something (a picture, not text).
const MARKER = ['KKKKKKK', 'KWWWWWK', '.KWWWK.', '..KWK..', '...K...'];
function drawRows(g, rows, map, x, y) {
  rows.forEach((r, j) => [...r].forEach((ch, i) => { if (ch !== '.') { g.fillStyle = map[ch]; g.fillRect(x + i, y + j, 1, 1); } }));
}

export function drawBeachScene() {
  const t = B.waveT, surf = beachSurf(S.T), back = B.back;
  beginWorld(); drawScenery(lg, 0, S.T, { ...S.level.fuji, x: 330 });   // (Fuji stands between the house and Ichigo, clear of the wave)
  if (t <= 4.4) {   // the sea behind the beach, and the wave rising out of it, its foot hidden in the water
    drawGreatWave(lg, t);
    const { x } = wavePlace(t);
    drawChartSea(lg, 0, S.T, surf, Math.max(0, x - 8), LW);
  }
  beginWorld(); drawBeach(lg, back); drawHole(lg);
  pixelSpace(lg); quantize(lg);
  beginWorld(); lg.save();   // the sea beside the beach (seen on a wide screen), pulled back with the shore
  lg.beginPath(); lg.moveTo(560 + back, 396); lg.lineTo(W + 10, 396); lg.lineTo(W + 10, H); lg.lineTo(700 + back, H); lg.quadraticCurveTo(640 + back, 430, 560 + back, 410); lg.closePath(); lg.clip();
  drawChartSea(lg, 0, S.T, surf, Math.floor((560 + back) / PIXEL), LW);   // (only the columns the clip lets show)
  lg.restore(); pixelSpace(lg);

  const ground = Math.round(BEACH.ground / PIXEL + TOP_PX), X = x => Math.round(x / PIXEL);
  // fish flapping on the bared sand
  if (back > 25) for (let i = 0; i < 3; i++) {
    const fx = X(572 + i * 23), fy = Math.round((416 + i * 7) / PIXEL + TOP_PX), hop = Math.sin(S.T * (9 + i * 2) + i * 2) > .5;
    lg.fillStyle = P.steel; lg.fillRect(fx, fy - (hop ? 2 : 0), 4, 2);
    lg.fillStyle = P.outline; lg.fillRect(hop ? fx + 4 : fx - 1, fy - (hop ? 3 : 0), 1, hop ? 1 : 2);   // the tail flicking
  }
  if (!B.tripped || (B.phase === 'trip' && B.t < 4.2)) drawRows(lg, SHOVEL, SHOVEL_C, X(BEACH.trip + (B.tripped ? 14 : 0)) - 6, ground - 2);   // (lying in the sand until Ichigo picks it up)

  // Ichigo
  const step = Math.floor(B.anim / 1.6) % 2, running = Math.abs(B.v) > 220;
  const sitting = B.seated || (B.phase === 'trip' && B.t < 4.2);
  const frame = sitting ? 'sit' : B.air ? 'balance' : B.pouring > 0 ? 'dig1' : B.digging ? (Math.sin(S.T * 10) > 0 ? 'dig1' : 'dig2')
              : B.moving && B.side > 0 ? 'balance' : B.moving ? ['stand', 'step1', 'stand', 'step2'][Math.floor(B.anim / 1.6) % 4] : 'stand';
  // (hopping, the arms-out pose: the jump one, for the sea, has no bucket)
  const hair = B.air ? [0, B.vy < 0 ? 2 : 0] : B.moving && B.side <= 0 ? [(running ? 1 : 0) + step, step] : [0, 0];
  const marks = [B.plaster ? 'chin-plaster' : B.cut ? 'chin-cut' : null, B.pout || B.sulk > 0 ? 'pout' : null, B.full ? 'water' : null,
                 B.tripped && !(B.phase === 'trip' && B.t < 4.2) ? 'shovel' : null].filter(Boolean);   // (after the fall, Ichigo picks the shovel up)
  const ix = X(B.x), feet = ground - Math.round(B.y / PIXEL);
  drawSprite(lg, frame, ix, feet, B.face, 0, hair, marks);
  if (B.x > BEACH.edge - 12 && back < 1 && !B.air) {   // ankle-deep: the foam over Ichigo's feet
    lg.fillStyle = P.mist; lg.fillRect(ix - 10, ground - 3, 20, 2); lg.fillStyle = P.aqua; lg.fillRect(ix - 9, ground - 1, 18, 2);
  }
  for (const q of parts) if (q.life > .05) { lg.fillStyle = q.c; lg.fillRect(X(q.x), Math.round(q.y / PIXEL + TOP_PX), 2, 2); }
  const head = feet - (sitting ? 46 * (mini() ? .75 : 1) : spriteHeight());
  if (action()) drawRows(lg, MARKER, { K: P.outline, W: P.white }, ix - 3, Math.round(head - 10 + Math.sin(S.T * 5) * 1.5));

  drawBubbles(lg, {
    ichigo: [ix, head],
    kaachan: [X(BEACH.kaachan), Math.round(356 / PIXEL + TOP_PX)],   // (the top of the doorway)
  });

  if (t > 4.4) {   // the wave crashes, and the sea climbs over everything, all the way to the top of the screen
    beginTop(); const f = Math.min(1, (t - 4.4) / 0.6), wy = H + 30 - f * (H + TOP + 90);
    drawGreatWave(tg, t);   // the wave pitching forward,
    drawChartSea(tg, 0, S.T, wx => wy + Math.sin(wx * .02 + S.T * 3) * 12);   // and the sea rising over it
    pixelSpace(tg); quantize(tg); lg.drawImage(topC, 0, 0);
  }
}

// After the wave: two seconds of white, and silence.
export function drawWhite() { pixelSpace(lg); lg.fillStyle = P.white; lg.fillRect(0, 0, LW, 999); }
