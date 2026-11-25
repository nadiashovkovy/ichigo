// ============================================================================
// storm.js — Level 5, The Storm (the Odyssey's bag of winds: home in sight, and blown away from it). One raft, bigger
// than it was. It tilts with the waves and with Ichigo's weight, as the wreckage in Level 1 does.
//   • Sailing: puffs of wind come up from behind. ↓ at the mast, as one passes, pulls the sail in, and the raft flies. Land comes nearer.
//   • The wind turns. Gusts off the land: ↓ at the mast holds on. Between them, logs come loose: ↓ there ties them.
//   • Rain: water fills the raft. ↓ in it bails. Sea creatures wash aboard, each bigger than the last, and slide down the deck: jump them.
//   • Big waves, each shown by lightning. One with a white crest breaks over the raft: hold on. A smooth one is steep: run up toward it.
//   • The last one breaks the raft. Swim to what's left of it: ↓ dives under the breakers, and planks are for resting.
// The raft loses its sail, then a log, then everything. Overboard is a new tomorrow, at the start of the part it happened in.
// This file is how it plays; stormart.js draws it. Tuning is in STORM (config.js).
// ============================================================================
import { W, SEA, BEACH, STORM, P } from './config.js';
import { S, parts } from './state.js';
import { input, inLeft, inRight, inRun, inUse, inJump } from './input.js';
import { think, clearBubbles } from './bubbles.js';
import { showCards } from './cards.js';
import { updateParts } from './player.js';
import { learn, keepThing, gainMark } from './save.js';
import { seaSound, windSound, playWash, playClick, playFall, playThud, playScoop, playPour, playThunder, playSnap, playGust, playCreak } from './audio.js';

const START_CARDS = ['THE WIND IS BLOWING EAST. SAIL WITH IT.', 'DOWN ARROW AT THE MAST: PULL THE SAIL IN. DO IT AS THE WIND COMES UP FROM BEHIND, AND LET GO AFTER.'];
const TURN_CARDS = ['THE WIND HAS TURNED. IT BLOWS OFF THE LAND NOW, AND IT IS GETTING STRONGER.', 'STAY ON THE RAFT UNTIL THE STORM IS OVER.', 'BEFORE EACH GUST, FOAM BLOWS ACROSS. GO TO THE MAST AND HOLD DOWN ARROW UNTIL IT PASSES.'];
const RAIN_CARDS = ['THE SAIL IS GONE, AND NOW IT RAINS. STAND IN THE WATER AND HOLD DOWN ARROW: BAIL.', 'THE WAVES WASH FISH AND CRABS ABOARD. SPACE: JUMP OVER THEM.'];
// What washes aboard, and what it's called in the line that says to jump it.
const NAMES = { crab: 'A CRAB', bream: 'A FISH', puffer: 'A PUFFERFISH', octopus: 'AN OCTOPUS', turtle: 'A TURTLE', tuna: 'A TUNA' };
const WAVE_CARDS = ['LIGHTNING SHOWS EACH BIG WAVE. WHITE ON TOP: GO TO THE MAST AND HOLD DOWN ARROW.', 'NO WHITE: RUN TO THE RIGHT END OF THE RAFT, OR IT TIPS OVER.'];
const SWIM_CARDS = ['THE RAFT IS IN PIECES. THE MAST IS STILL FLOATING. SWIM TO IT.', 'DOWN ARROW: DIVE UNDER A WAVE. STOP AT A PLANK: REST. SPACE: KICK.'];
const END_CARDS = ['THE WIND STOPS BEFORE MORNING. THE RED SHOVEL IS GONE.'];

// Everything about the level as it plays out. (Exposed on window.ichigo.storm for the test bot.)
// phase: 'sail' → 'turn' → 'wind' → 'torn' → 'rain' → 'waves' → 'broken' → 'swim' → 'calm'; 'over' (a new tomorrow).
export const R = {};
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, k) => a + (b - a) * k, smooth = k => { k = clamp(k, 0, 1); return k * k * (3 - 2 * k); };
export const ORDER = ['sail', 'turn', 'wind', 'torn', 'rain', 'waves', 'broken', 'swim', 'calm'];
const past = p => ORDER.indexOf(R.phase === 'over' ? R.was : R.phase) >= ORDER.indexOf(p);
export const onRaft = () => !['swim', 'calm', 'broken'].includes(R.phase === 'over' ? R.was : R.phase);
export const MAST = 0;                                                               // where along the raft the mast is

// The height of the sea: a swell, rougher as the storm comes, and the big waves in it (each steep in front, long behind).
export function seaAt(x) {
  const A = 4 + R.rough * 13;
  let y = SEA + Math.sin(x * .0115 - S.T * 1.35) * A + Math.sin(x * .028 + S.T * 1.05) * A * .36;
  for (const w of R.waves) { const d = x - w.x, k = d < 0 ? d / w.front : d / w.behind; y -= w.h * Math.exp(-k * k); }
  return y;
}
export const deckAt = u => ({ x: R.x + u * Math.cos(R.ang), y: R.y + u * Math.sin(R.ang) });   // a place on the deck
export const gusting = () => R.gust && R.gust.t > STORM.gust.warn;
export const warned = () => R.gust && R.gust.t <= STORM.gust.warn;

// ============================================================================
// Starting, and starting again
// ============================================================================
const fresh = () => ({ t: 0, v: 0, y: SEA - 6, ang: 0, av: 0, u: -70, vu: 0, hop: 0, hopV: 0, air: false, face: 1, anim: 0, moving: false, seated: false, idle: 0, boredAt: 0, sulk: 0, holding: false, tying: 0, scooping: 0, water: 0, pool: 0, gust: null, gustIn: 2.4, creatures: [], waves: [], waveIn: 2.2, bolt: 0, flash: 0, stun: 0, under: 0, strength: 1, tumble: 0, cling: null, done: 0, hang: null, grip: STORM.grips, after: 0 });
export function startStorm() {
  Object.assign(R, fresh(), {
    phase: 'sail', was: 'sail', x: 400, v: STORM.sail.drift, hw: STORM.half, sail: true, rough: .1, dark: 0, light: 0, dist: 0, puffs: [], puffIn: 1.6, full: 0, knots: [0, 0], loose: null, lost: [], gusts: 0, waveN: 0, nextCreature: 0,
    pinwheel: S.things.has('pinwheel') ? 'kept' : 'sea', burnt: false, check: 'sail', plank: -1, bits: [], hint: null, hintT: 0, hinted: new Set(), fade: S.cut ? 0 : 1, shovel: true, swimX: 0, ended: false,
  });
  S.noShovel = false;
  parts.length = 0; clearBubbles(); input.jumpBuffer = 0; input.usePressed = false;
  S.deaths = 0; S.levelT = 0; S.scene = 'storm'; S.sceneT = 0; S.camX = camFor();
  showCards(START_CARDS);
}
// A new tomorrow: the start of the part Ichigo was in.
export function retryStorm() {
  Object.assign(R, fresh(), { phase: R.check, fade: 1 });
  R.loose = null; R.knots = [0, 0]; input.usePressed = false; parts.length = 0; clearBubbles();
  if (R.check === 'wind') R.gusts = 0;
  if (R.check === 'rain') R.nextCreature = 0;
  if (R.check === 'waves') R.waveN = 0;
  if (R.check === 'swim') R.x = R.swimX + (R.plank >= 0 ? S.level.swim.planks[R.plank] : 0);
  else R.hw = R.hwAt;
  S.camX = camFor();
}
function tomorrow() { S.deaths++; S.tomorrows++; S.scene = 'dawn'; S.sceneT = 0; }
const camFor = () => R.x - W * (R.phase === 'swim' || R.phase === 'calm' ? .4 : .5);
function hint(id, text, time = 4.5) { if (!R.hinted.has(id) && R.hintT <= 0) { R.hinted.add(id); R.hint = text; R.hintT = time; } }
const puff = (x, y, n, cols, up = 80, wide = 90) => { for (let i = 0; i < n; i++) parts.push({ x: x + (Math.random() - .5) * 16, y, vx: (Math.random() - .5) * wide * 2, vy: -up * (.4 + Math.random()), life: .4 + Math.random() * .45, c: cols[i % cols.length], s: Math.random() < .4 ? 2 : 1 }); };
const WET = [P.foam, P.aqua, P.mist];
function go(phase) { R.phase = phase; R.t = 0; if (['wind', 'rain', 'waves', 'swim'].includes(phase)) { R.check = phase; R.hwAt = R.hw; R.grip = STORM.grips; } }
// Off the edge (side: which): Ichigo catches hold of it, a few times in each part; then it's overboard.
function slip(side) {
  if (R.hang || R.phase === 'over') return;
  const p = deckAt(side * R.hw); puff(p.x, p.y, 18, WET, 150, 110); playWash(.5);
  if (--R.grip < 0) { over(); return; }
  R.hang = { side, t: 0 }; R.holding = false; R.vu = 0; R.air = false; R.hop = 0; R.stun = 0; R.scooping = 0; R.tying = 0;
}
function over() {
  if (R.phase === 'over') return;
  R.was = R.phase; R.phase = 'over'; R.t = 0; R.holding = false; R.hintT = 0; playFall();
  const p = past('swim') ? { x: R.x, y: seaAt(R.x) } : deckAt(R.u); puff(p.x, p.y, 20, WET, 180, 110);
}

// ============================================================================
// Every frame
// ============================================================================
export function updateStorm(dt, win) {
  R.t += dt; S.levelT += dt; if (R.hintT > 0) R.hintT -= dt;
  R.fade = Math.max(0, R.fade - dt * 1.6); R.sulk = Math.max(0, R.sulk - dt); R.flash = Math.max(0, R.flash - dt); R.bolt = Math.max(0, R.bolt - dt); R.stun = Math.max(0, R.stun - dt);
  for (const w of R.waves) w.x -= w.v * dt;
  R.waves = R.waves.filter(w => w.x > R.x - 1500);
  const storm = past('wind') && R.phase !== 'calm' && !(R.phase === 'over' && R.was === 'calm');
  const rough = R.phase === 'sail' ? .1 : R.phase === 'turn' ? .1 + .25 * smooth((R.t - 2.5) / 4) : R.phase === 'calm' ? .5 * (1 - smooth(R.t / 5)) + .08 : past('waves') ? .62 : past('rain') ? .5 : .38;
  R.rough += (rough - R.rough) * Math.min(1, dt * .9);
  R.dark = storm || R.phase === 'calm' ? 1 : R.phase === 'turn' ? smooth((R.t - 2.6) / 4) : R.phase === 'over' ? R.dark : 0;

  if (R.phase === 'sail') updateSail(dt);
  else if (R.phase === 'turn') updateTurn(dt);
  else if (R.phase === 'wind') { gusts(dt, STORM.gust.gap); knots(dt); if (R.gusts >= STORM.gust.count && !R.gust) { go('torn'); R.loose = null; playSnap(); } }
  else if (R.phase === 'torn') { if (R.sail && R.t > .5) { R.sail = false; R.bits.push({ kind: 'sail', x: R.x, y: R.y - 60, vx: -260, vy: -120, t: 0 }); playSnap(); } hint('torn', 'THE SAIL IS GONE.', 2.5); if (R.t > 3) { go('rain'); showCards(RAIN_CARDS); } }
  else if (R.phase === 'rain') updateRain(dt);
  else if (R.phase === 'waves') updateWaves(dt);
  else if (R.phase === 'broken') updateBroken(dt);
  else if (R.phase === 'swim') updateSwim(dt);
  else if (R.phase === 'calm') updateCalm(dt, win);
  else if (R.phase === 'over' && R.t > 1.1) { tomorrow(); return; }

  if (onRaft()) { updateRaft(dt); if (R.phase !== 'over') updateIchigo(dt); }
  for (const b of R.bits) { b.t += dt; b.x += b.vx * dt; b.y += b.vy * dt; if (b.kind === 'sail') { b.vx -= 260 * dt; b.vy += Math.sin(b.t * 6) * 160 * dt; } else { b.vy += 260 * dt; b.vx *= 1 - dt; } }
  R.bits = R.bits.filter(b => b.t < 4);
  updateParts(dt);
  input.usePressed = false;
  S.camX += (camFor() - S.camX) * Math.min(1, dt * 5);
  seaSound(.34 + R.rough * .7); windSound(storm ? (gusting() ? 1 : warned() ? .62 : .4) : R.phase === 'turn' ? .4 * R.dark : R.full > .3 ? .12 : .04);
}

// The raft: rides the sea, tilts with its slope, with Ichigo's weight, and with the water in it.
function updateRaft(dt) {
  const n = R.hw * .8, slope = (seaAt(R.x + n) - seaAt(R.x - n)) / (2 * n), swell = R.waves.some(w => w.kind === 'swell' && Math.abs(w.x - R.x) < 520);
  const target = Math.atan(slope) * (swell ? 1 : STORM.follow) + (R.phase === 'over' ? 0 : (R.u / R.hw) * STORM.tip * (R.hw / STORM.half) ** .4) + (R.pool / R.hw) * R.water * .16 - (gusting() ? .1 : 0);
  R.av += ((target - R.ang) * 30 - R.av * 6) * dt; R.ang = clamp(R.ang + R.av * dt, -.5, .5);
  const y = (seaAt(R.x) * 2 + seaAt(R.x - R.hw * .6) + seaAt(R.x + R.hw * .6)) / 4 - 15 + R.water * 14;
  R.y += (y - R.y) * Math.min(1, dt * 12);
  R.pool += (clamp(Math.sin(R.ang) * R.hw * 4, -R.hw * .8, R.hw * .8) - R.pool) * Math.min(1, dt * 2.2);   // (the water runs to the low end)
  if (R.phase === 'sail' || R.phase === 'turn') R.x += R.v * dt; else R.x -= 16 * dt;
}

// ============================================================================
// Ichigo, on the raft
// ============================================================================
// What use would do where Ichigo is, or null.
export function action() {
  if (!onRaft() || R.hang || R.air || R.stun > 0 || R.phase === 'over') return null;
  if (R.phase === 'sail' && R.pinwheel === 'sea' && R.u > R.hw - 60 && Math.abs(pinX() - (R.x + R.hw + 14)) < 46) return { do: 'take', u: R.hw - 8 };
  if (R.loose && Math.abs(R.u - R.loose.u) < STORM.reach + 6) return { do: 'tie', u: R.loose.u };
  if (Math.abs(R.u - MAST) < STORM.reach) { if (past('wind') || R.phase === 'sail') return { do: 'hold', u: MAST }; }
  if (R.water > .04 && Math.abs(R.u - R.pool) < 26 + R.water * 50) return { do: 'bail', u: R.pool };
  return null;
}
export const pinX = () => R.x - R.dist + S.level.sail.pinwheel + 300;                // where the pinwheel floats
function updateIchigo(dt) {
  R.after = Math.max(0, R.after - dt);
  if (R.hang) {   // hanging on to the edge; up again when there's a moment to
    R.hang.t += dt; R.u = R.hang.side * (R.hw + 1); R.face = -R.hang.side; input.jumpBuffer = 0;
    const w = coming(); if (R.hang.t > STORM.climb && !gusting() && !(w && Math.abs(w.x - R.x) < 150)) { R.u = R.hang.side * (R.hw - 24); R.vu = 0; R.hang = null; playThud(); }
    return;
  }
  const act = action(), was = R.holding;
  R.holding = !!(act && act.do === 'hold' && inUse());
  if (R.holding && !was) playCreak();
  if (act && act.do === 'tie' && inUse()) { R.tying += dt; if (R.tying > STORM.knot.tie) { R.loose = null; R.tying = 0; playClick(.8); hint('tied', 'TIED.', 1.2); } } else R.tying = 0;
  if (act && act.do === 'take' && input.usePressed) { R.pinwheel = 'kept'; keepThing('pinwheel'); S.newThing = true; playClick(1.7); hint('pin', 'A PINWHEEL! TAB: LOOK AT IT.', 4); }
  if (R.scooping > 0) { R.scooping -= dt; if (R.scooping <= 0) { R.water = Math.max(0, R.water - STORM.water.scoop); playPour(); const p = deckAt(R.u); puff(p.x - R.face * 26, p.y - 14, 7, WET, 60, 60); } }
  else if (act && act.do === 'bail' && inUse() && !R.holding) { R.scooping = STORM.water.time; playScoop(); }

  const busy = R.holding || R.tying > 0 || R.scooping > 0 || R.stun > 0, dir = busy ? 0 : (inRight() ? 1 : 0) - (inLeft() ? 1 : 0), wants = dir || inUse() || input.jumpBuffer > 0;
  if (R.seated && wants) { R.seated = false; R.sulk = BEACH.sulk; }
  R.idle = wants || R.air || past('wind') ? 0 : R.idle + dt;
  if (!R.seated && R.idle > (R.boredAt || (R.boredAt = BEACH.bored[0] + Math.random() * BEACH.bored[1]))) { R.seated = true; R.boredAt = 0; }
  if (dir) R.face = dir;
  R.moving = !!dir && !R.air;
  const want = dir * (inRun() ? STORM.run : STORM.walk);
  if (dir) R.vu += Math.sign(want - R.vu) * Math.min(Math.abs(want - R.vu), STORM.accel * (R.air ? .7 : 1) * dt); else if (!R.air) R.vu -= Math.sign(R.vu) * Math.min(Math.abs(R.vu), STORM.stop * dt * (R.stun > 0 ? .2 : 1));
  if (R.holding) { R.vu = 0; R.u += (MAST - 9 * R.face - R.u) * Math.min(1, dt * 10); }
  else {
    const pull = STORM.slide * Math.sin(R.ang); if (!R.air && Math.abs(pull) > 60 && !R.seated) R.vu += pull * dt * 1.6;
    if (gusting()) { R.vu -= STORM.gust.push * dt * (R.air ? 1.25 : 1); if (R.seated) R.seated = false; }
    R.u += R.vu * dt;
  }
  R.anim += dt * Math.abs(R.vu) / 14;
  if (R.air) {
    if (R.rising && !inJump()) { R.rising = false; R.hopV = Math.min(R.hopV, 230); }
    R.hopV -= STORM.gravity * dt; R.hop += R.hopV * dt; if (R.hop <= 0) { R.hop = R.hopV = 0; R.air = false; R.av += R.u / R.hw * .5; playThud(); const p = deckAt(R.u); puff(p.x, p.y, 4, WET, 40, 60); }
  } else if (input.jumpBuffer > 0 && !busy) { R.air = true; R.rising = true; R.hopV = STORM.jump; input.jumpBuffer = 0; R.seated = false; }
  input.jumpBuffer = Math.max(0, input.jumpBuffer - dt);
  if (!past('wind')) R.u = clamp(R.u, -R.hw + 8, R.hw - 8);                          // (in fair weather no one falls off)
  else if (Math.abs(R.u) > R.hw + 7) slip(Math.sign(R.u));
}

// ============================================================================
// Fair wind
// ============================================================================
function updateSail(dt) {
  const L = S.level.sail, Q = STORM.sail;
  if ((R.puffIn -= dt) <= 0) { R.puffs.push({ x: R.x - W * .62, w: Q.wide }); R.puffIn = Q.every; }
  for (const p of R.puffs) p.x += (Q.speed + R.v * .6) * dt;
  R.puffs = R.puffs.filter(p => p.x - p.w / 2 < R.x + W);
  const here = R.puffs.some(p => Math.abs(p.x - R.x) < p.w / 2), want = here && R.holding ? Q.full : here ? Q.drift * 1.9 : R.holding ? Q.drift * .6 : Q.drift;
  if (here && R.holding && R.full < .2) { playGust(.35); }
  R.full += ((here && R.holding ? 1 : here ? .35 : 0) - R.full) * Math.min(1, dt * 4);
  R.v += (want - R.v) * Math.min(1, dt * (want > R.v ? 2.2 : .5));
  R.dist += R.v * dt;
  if (R.v > 130 && Math.random() < dt * 16) parts.push({ x: R.x + R.hw, y: seaAt(R.x + R.hw) - 2, vx: 30 + Math.random() * 60, vy: -60 - Math.random() * 80, life: .4, c: Math.random() < .5 ? P.white : P.aqua });
  if (R.pinwheel === 'sea' && pinX() - R.x < 560 && pinX() > R.x) hint('pinsee', 'SOMETHING RED IS FLOATING AHEAD. DOWN ARROW AT THE FRONT: PICK IT UP.', 5);
  if (R.pinwheel === 'sea' && pinX() < R.x + R.hw - 60) R.pinwheel = 'past';
  if (R.dist > L.goal * .62) hint('land', 'THERE ARE ROOFS, AND SMOKE.', 4);
  if (R.dist > L.goal) { go('turn'); R.hintT = 0; R.puffs = []; }
}
// The wind drops; then it comes back, the other way.
function updateTurn(dt) {
  R.full += (0 - R.full) * Math.min(1, dt * 2); R.v += ((R.t < 3 ? 0 : -70 * smooth((R.t - 3) / 3)) - R.v) * Math.min(1, dt * 1.2); R.dist += R.v * dt; R.holding = false;
  if (R.t > 4.2 && !R.done) { R.done = 1; playThunder(.3); }
  if (R.t > 7.4) { go('wind'); R.gustIn = 2.2; R.done = 0; showCards(TURN_CARDS); }
}

// ============================================================================
// The storm
// ============================================================================
function gusts(dt, gap) {
  const G = STORM.gust;
  if (R.gust) {
    const was = R.gust.t; R.gust.t += dt;
    if (was <= G.warn && R.gust.t > G.warn) { playGust(1); }
    if (gusting() && R.holding && !R.burnt) { R.burnt = true; gainMark('rope'); hint('burn', "THE ROPE BURNS ICHIGO'S WRIST.", 3); }
    if (R.gust.t > G.warn + G.blow) { R.gust = null; R.gustIn = gap; R.gusts++; if (R.phase === 'wind' && S.level.knots.includes(R.gusts)) loosen(); }
  } else if ((R.gustIn -= dt) <= 0) { R.gust = { t: 0 }; playGust(.3); }
}
// A log works loose at one end: tied in time, it stays; or it goes, and the raft is shorter.
function loosen() { const side = R.gusts % 2 ? 1 : -1; if (R.hw - STORM.section < STORM.least) return; R.loose = { side, u: side * (R.hw - 24), t: 0 }; playCreak(); }
function knots(dt) {
  if (!R.loose) return;
  R.loose.t += dt;
  if (R.loose.t > STORM.knot.time) { loseLog(R.loose.side); R.loose = null; hint('lostlog', 'A LOG IS GONE. THE RAFT IS SHORTER.', 3); }
}
function loseLog(side) {
  const p = deckAt(side * R.hw); R.bits.push({ kind: 'log', x: p.x, y: p.y, vx: side * 60 - 60, vy: -40, t: 0 });
  R.hw = Math.max(STORM.least, R.hw - STORM.section); R.hwAt = R.hw; playSnap(); puff(p.x, p.y, 14, WET, 130, 80);
}
function updateRain(dt) {
  const Q = S.level.rain;
  gusts(dt, STORM.rainGap);
  R.water += STORM.water.rain * dt;
  const next = Q.creatures[R.nextCreature];
  if (next && R.t > next[0]) { R.nextCreature++; const [w, h] = STORM.creature.size[next[1]]; R.creatures.push({ kind: next[1], w, h, u: R.hw + 4, v: -STORM.creature.push, step: 0, hit: false }); playWash(.4 + w / 60); const p = deckAt(R.hw); puff(p.x, p.y, 10 + w, WET, 150, 90); }
  updateCreatures(dt);
  if (R.water >= 1) { R.water = .55; slip(-1); if (R.phase === 'over') return; }   // (a wave goes right over it)
  if (R.t > Q.time && !R.gust) { if (R.hw - STORM.section >= STORM.least) loseLog(1); go('waves'); R.creatures = []; R.water = Math.min(R.water, .3); R.waveIn = 2.6; showCards(WAVE_CARDS); }
}
// Each slides down the deck as it tilts, and goes back over the side. Bigger ones are wider and taller, so the jump has to
// be earlier and higher, and they knock Ichigo further.
function updateCreatures(dt) {
  for (const c of R.creatures) {
    c.v += STORM.creature.slide * Math.sin(R.ang) * dt - (gusting() ? 160 * dt : 0); if (Math.abs(c.v) < 60) c.v -= 90 * dt;
    c.u += c.v * dt; c.step += Math.abs(c.v) * dt / 14;
    if (!c.hit && Math.abs(c.u - R.u) < c.w + 7 && R.hop < c.h - 2 && !R.hang && R.phase !== 'over') { c.hit = true; playThud(); if (!R.holding) { R.stun = .4; R.vu = Math.sign(c.v) * (170 + c.w * 3); }   // (holding the rope, it only bumps past)
      const p = deckAt(R.u); puff(p.x, p.y - 10, 6, WET, 80, 80); }
    if (Math.abs(c.u) > R.hw + c.w) { c.gone = true; const p = deckAt(c.u); puff(p.x, seaAt(p.x), 10, WET, 120, 70); }
  }
  R.creatures = R.creatures.filter(c => !c.gone);
}
// Lightning, then the wave it showed.
export const coming = () => R.waves.find(w => !w.passed);
function updateWaves(dt) {
  const L = S.level.waves, Q = STORM.wave;
  R.water = Math.min(1, R.water + STORM.water.rain * .35 * dt);
  if (!coming() && (R.waveIn -= dt) <= 0 && R.waveN < L.length) {
    const kind = L[R.waveN++], big = { break: [72, 130, 300], swell: [128, 185, 420], last: [190, 190, 420] }[kind];
    R.flash = .5; R.bolt = .55; R.boltN = R.waveN; playThunder(1);
    R.waves.push({ kind, x: R.x + Q.speed * Q.warn + 60, v: Q.speed, h: big[0], front: big[1], behind: big[2] });
    R.waveIn = Q.every - Q.warn;
  }
  for (const w of R.waves) if (!w.passed) {
    if (w.x < R.x + (w.kind === 'last' ? 30 : 12)) {
      w.passed = true; R.water = Math.min(.95, R.water + STORM.water.wave);
      if (w.kind === 'break') { puff(R.x, R.y - 20, 36, WET, 190, 260); playWash(1); if (!R.holding) { slip(-1); if (R.phase === 'over') return; } }
      if (w.kind === 'swell') { playWash(.6); R.after = 2; if (R.u < R.hw * STORM.lean && !R.hang) { R.av -= 3; slip(-1); if (R.phase === 'over') return; } }
      if (w.kind === 'last') { go('broken'); playSnap(); playWash(1); R.flash = .4; puff(R.x, R.y - 10, 50, [...WET, P.wood, P.tan], 260, 300); for (let i = 0; i < 9; i++) R.bits.push({ kind: 'log', x: R.x + (i - 4) * 34, y: R.y, vx: (i - 4) * 46, vy: -160 - 40 * (i % 3), t: 0 }); R.sinkT = 0; return; }
    }
  }
}
// The raft in pieces; the red shovel going down.
function updateBroken(dt) {
  R.hintT = 0; R.sinkT += dt;
  if (R.t > 4.2) { R.swimX = R.x; R.plank = -1; R.waves = []; R.strength = 1; go('swim'); R.waveIn = 3.6; R.v = 0; R.shovel = false; S.noShovel = true; showCards(SWIM_CARDS); }
}

// ============================================================================
// Swimming
// ============================================================================
export const plankX = i => R.swimX + S.level.swim.planks[i] + Math.sin(S.T * .6 + i * 2) * 10;
export const mastX = () => R.swimX + S.level.swim.goal;
function updateSwim(dt) {
  const Q = STORM.swim, L = S.level.swim, dir = (inRight() ? 1 : 0) - (inLeft() ? 1 : 0);
  R.tumble = Math.max(0, R.tumble - dt);
  const dive = inUse() && R.tumble <= 0; R.under += ((dive ? 1 : 0) - R.under) * Math.min(1, dt * 7);
  // a plank, if one's in reach and Ichigo isn't swimming away from it
  R.cling = null; L.planks.forEach((_, i) => { if (Math.abs(R.x - plankX(i)) < 34 && !dive && R.tumble <= 0) { if (i > R.plank) R.plank = i; if (!dir) R.cling = i; } });
  if (dir) R.face = dir;
  R.moving = !!dir && !R.cling;
  if (R.cling !== null) { R.x += (plankX(R.cling) - 8 - R.x) * Math.min(1, dt * 6); R.v = 0; R.strength = Math.min(1, R.strength + Q.rest * dt); hint('rest', 'RESTING. WAVES GO BY.', 2); }
  else {
    if (input.jumpBuffer > 0 && R.under < .4 && R.tumble <= 0) { R.v += (dir || 1) * Q.kick; R.strength -= Q.kicks; input.jumpBuffer = 0; playWash(.15); puff(R.x - (dir || 1) * 16, seaAt(R.x), 8, WET, 90, 50); }
    const want = R.tumble > 0 ? -300 * R.tumble : dir * Q.speed * (R.under > .5 ? .8 : 1) - Q.drift;
    R.v += (want - R.v) * Math.min(1, dt * (R.tumble > 0 ? 6 : 3)); R.x = Math.max(R.swimX - 160, R.x + R.v * dt); R.anim += dt * (dir ? 1 : .4);
    R.strength -= (R.under > .5 ? Q.under : Q.tired * (dir ? 1 : .6)) * dt;
  }
  input.jumpBuffer = Math.max(0, input.jumpBuffer - dt);
  // the breakers
  if ((R.waveIn -= dt) <= 0) { R.waveIn = Q.every; R.waves.push({ kind: 'break', x: R.x + W * .72, v: Q.wave, h: 44, front: 80, behind: 190 }); }
  for (const w of R.waves) if (!w.passed && w.x < R.x + 18) {
    w.passed = true; playWash(.5); puff(R.x, seaAt(R.x), 16, WET, 130, 120);
    if (R.under < .55 && R.cling === null) { R.tumble = .85; R.strength -= Q.hit; hint('tumble', 'IT CARRIES ICHIGO BACK.', 2); }
  }
  if (Math.random() < dt * .12) { R.flash = .3; R.bolt = .35; R.boltN = Math.floor(Math.random() * 9); playThunder(.5); }
  if (R.strength <= 0) { over(); return; }
  if (R.x > mastX() - 70) { go('calm'); R.waves = []; R.under = 0; R.seated = true; R.hintT = 0; }
}
// The wind stops, and it gets light. There are masts sticking out of the water.
function updateCalm(dt, win) {
  R.x += (mastX() - 30 - R.x) * Math.min(1, dt * 2); R.light = smooth((R.t - 2) / 6); R.seated = R.t > 1.6; R.face = R.t > 6 ? 1 : R.t > 4 ? -1 : 1;
  if (R.t > 3 && !R.done) { R.done = 1; think('wind', 3); learn('wind'); }
  if (R.t > 8.6 && R.done === 1) { R.done = 2; showCards(END_CARDS); }
  if (R.t > 9.4 && R.done === 2 && !R.ended) { R.ended = true; parts.length = 0; clearBubbles(); win(); }
}

// ============================================================================
// What to do now: { text, u: where on the raft (or null), ok: it's being done }, or null. Shown every time, not only the first.
// ============================================================================
export function prompt() {
  if (R.phase === 'over') return null;
  const go_ = (u, what, there) => (Math.abs(R.u - u) < STORM.reach ? { text: there, u } : { text: `${what} ${u > R.u ? '->' : '<-'}`, u });
  if (R.hang) return { text: `HANGING ON. ${R.grip} LEFT.`, u: null, warn: true };
  if (R.phase === 'sail') {
    const p = R.puffs.find(q => q.x < R.x + q.w / 2 && q.x > R.x - q.w / 2 - 200); if (!p || R.dist > S.level.sail.goal * .5) return null;
    if (R.holding) return Math.abs(p.x - R.x) < p.w / 2 ? { text: 'GOOD. KEEP HOLDING.', u: null, ok: true } : null;
    return go_(MAST, 'WIND BEHIND. GO TO THE MAST.', 'HOLD DOWN ARROW: CATCH THE WIND.');
  }
  if (['wind', 'rain'].includes(R.phase)) {
    if (R.gust) return R.holding ? { text: 'KEEP HOLDING.', u: null, ok: true } : go_(MAST, 'A GUST! GO TO THE MAST.', 'HOLD DOWN ARROW!');
    const c = R.creatures.find(q => !q.hit && Math.abs(q.u - R.u) < 130 + q.w && Math.sign(q.v) === Math.sign(R.u - q.u)); if (c) return { text: `${NAMES[c.kind]}! SPACE: JUMP.`, u: null, warn: true };
    if (R.loose) return R.tying > 0 ? { text: 'TYING IT.', u: null, ok: true } : go_(R.loose.u, 'A LOOSE LOG! GO TO IT.', 'HOLD DOWN ARROW: TIE IT.');
  }
  if (R.phase === 'waves') {
    const w = coming();
    if (w && w.kind === 'swell') return R.u > R.hw * STORM.lean ? { text: 'GOOD. STAY AT THIS END.', u: null, ok: true } : { text: 'A STEEP WAVE! GO TO THE RIGHT END. ->', u: R.hw * .7 };
    if (w) return R.holding ? { text: 'KEEP HOLDING.', u: null, ok: true } : go_(MAST, 'A WHITE WAVE! GO TO THE MAST.', 'HOLD DOWN ARROW!');
  }
  if (['rain', 'waves'].includes(R.phase) && R.water > .22) return R.scooping > 0 ? { text: 'BAILING.', u: null, ok: true } : Math.abs(R.u - R.pool) < 26 + R.water * 50 ? { text: 'HOLD DOWN ARROW: BAIL.', u: R.pool } : { text: `WATER! GO TO IT. ${R.pool > R.u ? '->' : '<-'}`, u: R.pool };
  if (R.phase === 'swim') {
    const w = R.waves.find(q => !q.passed && q.x - R.x < 240 && q.x > R.x);
    if (w && R.cling === null) return R.under > .55 ? { text: 'GOOD. STAY UNDER.', u: null, ok: true } : { text: 'A BREAKER! HOLD DOWN ARROW: DIVE.', u: null, warn: true };
    if (R.cling !== null) return R.strength < .95 ? { text: 'RESTING.', u: null, ok: true } : { text: 'RESTED. SWIM ON. ->', u: null };
    if (R.strength < .4) return { text: 'TIRED. STOP AT A PLANK.', u: null, warn: true };
  }
  return null;
}
