// ============================================================================
// tide.js — Level 2, The Tide Comes In: the lantern island at night. The tide rises in six sets of
// three waves, and Ichigo (three) piles up sand walls to keep the water off the lantern until
// morning. Then the tide goes out, a sandbar shows, and Ichigo runs across it to the next island
// before the water comes back.
// This file is how it plays; tideart.js draws it; water.js is the water. The island, the waves and the
// sandbar are in levels/level02.json, and the tuning is TIDE in config.js.
// Heights (z) go up: z = 0 is the sea at the lowest tide of the night, at y = TIDE.base.
// ============================================================================
import { W, MOVE, BEACH, TIDE, P } from './config.js';
import { S, parts } from './state.js';
import { input, inLeft, inRight, inRun, inUse } from './input.js';
import { makeWater, flow } from './water.js';
import { say, clearBubbles } from './bubbles.js';
import { showCards } from './cards.js';
import { updateParts } from './player.js';
import { learnWord, keepThing } from './save.js';
import { seaSound, playWash, playDig, playScoop, playPour, playHiss, playClick, playFall } from './audio.js';

const INTRO_CARDS = [
  'ICHIGO SLEEPS NEXT TO THE STONE LANTERN.',
  'IN THE NIGHT, THE TIDE COMES IN.',
  'DOWN ARROW: PILE UP SAND. BUILD WALLS TO KEEP THE WATER AWAY FROM THE LANTERN UNTIL MORNING.',
];
const DAWN_CARDS = [
  'IN THE MORNING THE TIDE GOES OUT. A SANDBAR LEADS TO A BIGGER ISLAND.',
  'CROSS IT BEFORE THE WATER COMES BACK.',
];

// Everything about the level as it plays out. (Exposed on window.ichigo.tide for the test bot.)
// phase: 'wake' → 'calm' ⇄ 'waves' (six sets) → 'ebb' → 'bar' (the sandbar); 'out' = the lantern's
// light going out; 'taken' = the sea taking Ichigo on the sandbar (both end in a new tomorrow).
export const N = {};
const lerp = (a, b, k) => a + (b - a) * k;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = k => { k = clamp(k, 0, 1); return k * k * (3 - 2 * k); };
export const yOf = z => TIDE.base - z;
const centre = () => S.level.lantern;

// ============================================================================
// The ground
// ============================================================================
function islandZ(x) {
  const G = S.level.island;
  if (x <= G[0][0]) return G[0][1];
  for (let i = 1; i < G.length; i++) if (x <= G[i][0]) return lerp(G[i - 1][1], G[i][1], (x - G[i - 1][0]) / (G[i][0] - G[i - 1][0]));
  return G[G.length - 1][1];
}
// The sandbar: low at both ends, humped along its middle; then the green island.
function barZ(x) {
  const { from, to } = S.level.bar;
  if (x < from) return -99;
  if (x > to) return lerp(-9, 42, smooth((x - to) / 190));
  const k = (x - from) / (to - from);
  return -11 + 15 * Math.pow(Math.sin(Math.PI * k), .6) + (3.4 * Math.sin(x * .011) + 1.6 * Math.sin(x * .031)) * Math.min(1, k * 12, (1 - k) * 12);
}
export const onBar = () => N.phase === 'ebb' || N.phase === 'bar' || N.phase === 'taken' || N.done;
export const groundZ = x => (onBar() ? Math.max(islandZ(x), barZ(x)) : islandZ(x));
// Walls: 'slot' i covers TIDE.slot units of sand from slotX(i).
export const slotOf = x => Math.floor((x - TIDE.x0) / TIDE.slot);
export const slotX = i => TIDE.x0 + i * TIDE.slot;
const COLS = TIDE.slot / TIDE.cell;   // columns of water to a slot
export const wallAt = i => (N.walls && N.walls[i]) || 0;   // in blocks
export function wallZ(x) { return wallAt(slotOf(x)) * TIDE.block; }
// What Ichigo and the crabs stand on: the ground and any wall, its steps eased so they clamber rather than jump.
export function topZ(x) {
  let s = 0; for (const d of [-7, -3.5, 0, 3.5, 7]) s += wallZ(x + d);
  return groundZ(x) + s / 5;
}
function setWall(i, h) {
  N.walls[i] = clamp(h, 0, 3);
  for (let k = 0; k < COLS; k++) {
    const c = i * COLS + k;
    if (c < N.w.n) {   // (the sand pushes the water there up and off, rather than swallowing it)
      const was = N.w.wall[c]; N.w.wall[c] = N.walls[i] * TIDE.block;
      if (N.w.d[c] > 0 && N.w.wall[c] > was) { const m = Math.min(N.w.d[c], N.w.wall[c] - was); N.w.d[c] -= m; if (c + 1 < N.w.n) N.w.d[c + 1] += m; }
    }
  }
}
const canWall = i => slotX(i) >= TIDE.walls[0] - TIDE.slot && slotX(i) + TIDE.slot <= TIDE.walls[1] + TIDE.slot && Math.abs(slotX(i) + TIDE.slot / 2 - centre()) > TIDE.slot;

// How deep the water is at x, standing on the ground and any wall there.
export function depthAt(x) {
  if (x < TIDE.x0 || x >= TIDE.x0 + TIDE.cell * TIDE.cells || (onBar() && x > S.level.bar.from)) return Math.max(0, N.tide - groundZ(x));
  return N.w.depthAt(x);
}

// ============================================================================
// The sea: the tide, and the waves (swells) rolling in
// ============================================================================
export const waveX = v => (v.side === 'right' ? W + TIDE.wave.start - v.t * TIDE.wave.speed : -TIDE.wave.start + v.t * TIDE.wave.speed);
// The sea's surface at x: a wave only rolls in on its own side of the island.
export function seaZ(x) {
  let z = N.tide;
  for (const v of N.swells) if ((v.side === 'right') === (x > centre())) { const d = (x - waveX(v)) / TIDE.wave.width; z += v.h * Math.exp(-d * d); }
  return z;
}
function launch(side, h) { for (const s of side === 'both' ? ['left', 'right'] : [side]) N.swells.push({ side: s, h, t: 0, broke: false }); }

// ============================================================================
// Starting, and starting again
// ============================================================================
export function startTide() {
  const G = Array.from({ length: TIDE.cells }, (_, i) => TIDE.x0 + (i + .5) * TIDE.cell);
  Object.assign(N, {
    phase: 'wake', t: 0, set: 0, wave: 0, done: false, light: 0, tide: S.level.sets[0].tide - 2, tideFrom: 0,
    x: 474, v: 0, face: 1, anim: 0, z: 0, hop: 0, hopV: 0, air: false, moving: false, seated: true, idle: 0, boredAt: 0, sulk: 0, stumble: 0, push: 0,
    full: false, digging: false, digSlot: -1, digSound: 0, pouring: 0, deep: 0, wet: 0, lit: true, gone: false,
    walls: new Array(Math.ceil(TIDE.cells / COLS)).fill(0), swells: [], crabs: [], crabsDue: [], barCrabs: [], tries: 0,
    shell: 'lying', shellT: 0, barT: 0, barGo: false, hint: null, hintT: 0, hinted: new Set(), said: false, snap: null,
    w: makeWater(TIDE.x0, TIDE.cell, G.map(islandZ)),
  });
  N.w.d.forEach((_, i) => { N.w.d[i] = Math.max(0, N.tide - N.w.solid(i)); });
  N.z = topZ(N.x);
  parts.length = 0; clearBubbles(); input.jumpBuffer = 0; input.usePressed = false;
  S.deaths = 0; S.levelT = 0; S.camX = 0; S.scene = 'tide'; S.sceneT = 0;
  showCards(INTRO_CARDS);
}

// The calm at the start of a set. What the walls and the water are like now is what a new tomorrow goes back to.
function startCalm() {
  N.phase = 'calm'; N.t = 0; N.wave = 0; N.swells = []; N.tideFrom = N.tide; N.tries = 0;
  N.crabsDue = S.level.sets[N.set].crabs.map((side, i) => ({ side, at: 1.5 + i * 2.5 }));
  N.snap = { walls: [...N.walls], water: N.w.snapshot(), tide: N.tide };
}
export const calmTime = () => S.level.sets[N.set].calm + Math.min(3, N.tries) * TIDE.extraCalm;

// A new tomorrow (called while the dawn print covers the screen).
export function retryTide() {
  N.swells = []; N.crabs = []; N.deep = N.wet = 0; N.lit = true; N.gone = false; N.full = false; N.stumble = 0; N.sulk = 0; N.seated = false; N.idle = 0;
  N.air = false; N.hop = N.hopV = 0; N.v = 0; N.moving = false; parts.length = 0; clearBubbles();
  if (N.phase === 'taken') { startBar(); return; }
  const tries = N.tries + 1;
  N.walls = [...N.snap.walls]; N.w.restore(N.snap.water); N.tide = N.snap.tide;
  N.phase = 'calm'; N.t = 0; N.wave = 0; N.tideFrom = N.tide; N.tries = tries;
  N.crabsDue = S.level.sets[N.set].crabs.map((side, i) => ({ side, at: 1.5 + i * 2.5 }));
  N.x = centre() + 40; N.face = 1; N.z = topZ(N.x);
}
function tomorrow() { S.deaths++; S.tomorrows++; S.scene = 'dawn'; S.sceneT = 0; }

function startBar() {
  N.phase = 'bar'; N.t = 0; N.barT = 0; N.barGo = false; N.tide = TIDE.low; N.x = centre() + 90; N.face = 1; N.z = topZ(N.x);
  N.w.d.fill(0); N.w.v.fill(0);
  N.barCrabs = S.level.bar.crabs.map((x, i) => ({ x, home: x, t: i * 1.3, dir: i % 2 ? 1 : -1, hide: 0 }));
  if (N.shell !== 'kept') N.shell = 'lying';
  N.shellT = 0;
}

function hint(id, text) { if (!N.hinted.has(id) && N.hintT <= 0) { N.hinted.add(id); N.hint = text; N.hintT = 4.5; } }   // (one at a time: a second waits its turn)

// ============================================================================
// Every frame
// ============================================================================
export function updateTide(dt, win) {
  N.t += dt; S.levelT += dt;
  if (N.hintT > 0) N.hintT -= dt;
  const set = S.level.sets[N.set];

  if (N.phase === 'wake') {   // one wave reaches Ichigo's feet and goes back
    if (N.t > .3 && !N.swells.length && !N.said) { launch('right', 66); N.said = 'wave'; }
    if (N.said === 'wave' && N.t > 5.4) { N.said = true; say('ichigo', ['umi'], { note: true, time: 2 }); learnWord('umi'); }
    if (N.t > 7.2) { N.seated = false; startCalm(); }
  } else if (N.phase === 'calm') {
    N.tide = lerp(N.tideFrom, set.tide, smooth(N.t / TIDE.tideTime));
    for (const c of N.crabsDue) if (N.t > c.at && !c.out) { c.out = true; spawnCrab(c.side); }
    if (N.t > calmTime()) { N.phase = 'waves'; N.t = TIDE.wave.gap; for (const c of N.crabs) c.state = 'home'; }
  } else if (N.phase === 'waves') {
    if (N.wave < set.waves.length) { if (N.t >= TIDE.wave.gap) { N.t = 0; launch(...set.waves[N.wave++]); } }
    else if (N.t > TIDE.wave.gap + 1) { N.set++; if (N.set < S.level.sets.length) startCalm(); else { N.phase = 'ebb'; N.t = 0; N.set--; N.tideFrom = N.tide; N.snap = null; } }
  } else if (N.phase === 'ebb') {   // morning: the light comes up and the water drains away
    N.light = clamp(N.t / 4, 0, 1);
    N.tide = lerp(N.tideFrom, TIDE.low, smooth(N.t / TIDE.ebb));
    if (N.t > TIDE.ebb + 1) { const x = N.x; startBar(); N.x = x; N.z = topZ(x); showCards(DAWN_CARDS); }
  } else if (N.phase === 'bar') updateBar(dt);
  else if (N.phase === 'out') { if (N.t > 1.1) { tomorrow(); return; } }
  else if (N.phase === 'taken') { if (N.t > .5) { tomorrow(); return; } }

  updateWater(dt);
  updateIchigo(dt);
  updateCrabs(dt);
  updateParts(dt);
  if (N.phase === 'bar' && N.x > S.level.bar.goal) { N.done = true; N.seated = true; N.v = 0; N.moving = false; parts.length = 0; win(); }
  input.usePressed = false;

  // the camera: still all night, following Ichigo along the sandbar
  const target = onBar() && N.phase !== 'ebb' ? clamp(N.x - W * .38, 0, S.level.length - W) : 0;
  S.camX += (target - S.camX) * Math.min(1, dt * 4);
  // the sea: louder as a wave comes in
  const near = N.swells.reduce((m, v) => Math.max(m, 1 - Math.abs(waveX(v) - (v.side === 'right' ? 720 : 134)) / 260), 0);
  seaSound(.3 + .12 * N.set / 5 + .5 * Math.max(0, near));
}

function updateWater(dt) {
  for (const v of N.swells) {
    v.t += dt;
    const shore = v.side === 'right' ? 716 : 138;
    if (!v.broke && (v.side === 'right' ? waveX(v) < shore : waveX(v) > shore)) {   // it breaks on the shore
      v.broke = true; playWash(v.h / 70);
      for (let i = 0; i < 16; i++) parts.push({ x: shore + (Math.random() - .5) * 50, y: yOf(seaZ(shore) - 4), vx: (v.side === 'right' ? -1 : 1) * (20 + Math.random() * 130), vy: -90 - Math.random() * 190, life: .4 + Math.random() * .4, c: Math.random() < .6 ? P.white : P.aqua, s: Math.random() < .3 ? 2 : 1 });
    }
  }
  N.swells = N.swells.filter(v => v.t < 9);
  const w = N.w;
  flow(w, dt, { sea: seaZ, edge: TIDE.edge, tide: N.tide, seep: TIDE.seep, soak: TIDE.soak });
  // walls wear down where water stands or beats against them, and faster where it pours over
  for (let i = 0; i < N.walls.length; i++) {
    if (N.walls[i] <= 0 || (N.digging && N.digSlot === i)) continue;   // (not the one being piled just now)
    const a = i * COLS, b = a + COLS - 1, base = w.ground[a + 1];
    const lap = Math.max(a > 0 ? w.surface(a - 1) - base : 0, b + 1 < w.n ? w.surface(b + 1) - base : 0);
    const wetL = a > 0 && w.d[a - 1] > 1, wetR = b + 1 < w.n && w.d[b + 1] > 1;
    const against = wetL || wetR ? clamp(lap, 0, N.walls[i] * TIDE.block) / TIDE.block : 0, over = w.d[a + 1] > .5 ? Math.min(12, w.d[a + 1]) : 0;
    const wear = (TIDE.touch * against + TIDE.over * over) * dt;
    if (wear > 0) {
      setWall(i, N.walls[i] - wear < .12 ? 0 : N.walls[i] - wear);
      if (Math.random() < wear * 14) crumble(slotX(i) + TIDE.slot / 2, 1);
    }
    const fast = Math.max(Math.abs(w.v[a]), Math.abs(w.v[b + 1]));
    if ((wetL || wetR) && fast > 70 && Math.random() < .25) {   // spray off the face of it
      const x = Math.abs(w.v[a]) > Math.abs(w.v[b + 1]) ? slotX(i) : slotX(i) + TIDE.slot;
      parts.push({ x, y: yOf(w.surface(w.col(x))), vx: (Math.random() - .5) * 110, vy: -90 - Math.random() * 130, life: .45, c: Math.random() < .6 ? P.white : P.aqua });
    }
  }
  // water over the sand round the lantern puts it out
  if (N.phase === 'calm' || N.phase === 'waves') {
    let most = 0; for (let i = w.col(TIDE.patch[0]); i <= w.col(TIDE.patch[1]); i++) most = Math.max(most, w.d[i]);
    N.wet = most > TIDE.wet ? N.wet + dt : Math.max(0, N.wet - dt * 2);
    if (N.wet > TIDE.wetTime) {
      N.phase = 'out'; N.t = 0; N.lit = false; N.digging = false; playHiss();
      for (let i = 0; i < 14; i++) parts.push({ x: centre() + (Math.random() - .5) * 16, y: yOf(groundZ(centre())) - 50, vx: (Math.random() - .5) * 40, vy: -150 - Math.random() * 120, life: .8, c: Math.random() < .5 ? P.grey1 : P.mist });
    }
  }
}
function crumble(x, n) { for (let i = 0; i < n; i++) parts.push({ x: x + (Math.random() - .5) * 18, y: yOf(topZ(x)) - 2, vx: (Math.random() - .5) * 60, vy: -30 - Math.random() * 60, life: .4, c: Math.random() < .5 ? P.tanD : P.wood, s: Math.random() < .3 ? 2 : 1 }); }

const scoopDepth = () => (Math.abs(N.x - centre()) < TIDE.inner ? TIDE.scoopAt : TIDE.shelf);
// What use would do where Ichigo is: { do: 'pour' | 'scoop' | 'pile' | 'shell', slot } or null.
export function action() {
  if (N.air || N.stumble > 0 || N.shellT > 0 || ['wake', 'out', 'taken'].includes(N.phase) || N.done) return null;
  if (N.phase === 'bar' && N.shell === 'lying' && Math.abs(N.x - S.level.bar.shell) < 26) return { do: 'shell' };
  if (onBar()) return null;
  if (N.full) return { do: 'pour' };
  if (N.w.depthAt(N.x) > scoopDepth()) return { do: 'scoop' };
  const i = pileSlot();
  return i === null ? null : { do: 'pile', slot: i };
}
// The slot in front of Ichigo, where a wall would go (or null: too wet, too close to the lantern, or not on the sand).
export function pileSlot() {
  const i = slotOf(N.x + N.face * 30);
  if (i < 0 || i >= N.walls.length || !canWall(i)) return null;
  let wet = 0; for (let k = -1; k <= COLS; k++) { const c = i * COLS + k; if (c >= 0 && c < N.w.n) wet = Math.max(wet, N.w.d[c]); }
  return wet > TIDE.dry ? null : i;
}

function updateIchigo(dt) {
  const control = !['wake', 'out', 'taken'].includes(N.phase) && !N.done && N.stumble <= 0 && N.shellT <= 0;
  let dir = control ? (inRight() ? 1 : 0) - (inLeft() ? 1 : 0) : 0;
  const wants = control && (dir || inUse() || input.usePressed || input.jumpBuffer > 0);
  // left alone a while, Ichigo sits down, bored; any key gets them up at once
  if (N.seated && wants) { N.seated = false; N.sulk = BEACH.sulk; }
  N.sulk = Math.max(0, N.sulk - dt); N.stumble = Math.max(0, N.stumble - dt); N.pouring = Math.max(0, N.pouring - dt);
  N.idle = wants || N.air || !control ? 0 : N.idle + dt;
  if (!N.seated && N.idle > (N.boredAt || (N.boredAt = BEACH.bored[0] + Math.random() * BEACH.bored[1]))) { N.seated = true; N.boredAt = 0; }

  // --- use ---
  const act = control ? action() : null;
  N.digging = false;
  if (act && act.do === 'pile' && inUse() && !dir && N.walls[act.slot] < 3) {
    N.digging = true; N.digSlot = act.slot; N.seated = false;
    setWall(act.slot, N.walls[act.slot] + TIDE.dig * dt);
    if ((N.digSound -= dt) <= 0) { N.digSound = .32; playDig(); crumble(slotX(act.slot) + TIDE.slot / 2, 3); }
  } else N.digSound = 0;
  if (input.usePressed && act) {
    if (act.do === 'scoop') scoop();
    else if (act.do === 'pour') pour();
    else if (act.do === 'shell') { N.shellT = TIDE.shellTime; N.shell = 'held'; }
  }
  if (N.shellT > 0 && (N.shellT -= dt) <= 0) { N.shell = 'kept'; keepThing('shell'); playClick(1.6); }

  // --- walking ---
  const depth = depthAt(N.x), steep = Math.abs(topZ(N.x + N.face * 6) - topZ(N.x)) > 3.2;
  let speed = N.full || !inRun() ? MOVE.walk : MOVE.run;
  if (N.full) speed *= BEACH.fullSlow;
  if (!N.air && steep && Math.abs(wallZ(N.x + dir * 14) - wallZ(N.x)) > 4) speed = Math.min(speed, MOVE.walk) * TIDE.climb;
  if (depth > 6 && !N.air) speed *= TIDE.wade;
  N.moving = !!dir; if (dir) N.face = dir;
  N.v = dir * speed;
  // the water shoves Ichigo along (not on the sandbar, where it only rises)
  const shove = !onBar() && depth > 7 ? N.w.speedAt(N.x) * TIDE.shove * Math.min(1, depth / 20) : 0;
  N.push += (shove - N.push) * Math.min(1, dt * 8);
  let nx = N.x + (N.v + N.push) * dt;
  const deepAhead = groundZ(nx + (dir || 1) * 4) < N.tide - TIDE.waist;   // (the sea's standing depth, not a passing wave's)
  if (!onBar() && deepAhead && Math.abs(nx - centre()) > Math.abs(N.x - centre())) nx = N.x;
  if (onBar() && N.phase !== 'ebb') nx = Math.max(centre() - 60, nx);
  nx = Math.max(nx, onBar() ? 0 : 150); if (!onBar() || N.phase === 'ebb') nx = Math.min(nx, 704);
  if (depth > 5 && dir && Math.random() < .2) parts.push({ x: N.x + dir * 8, y: yOf(topZ(N.x) + depth), vx: dir * 40 * Math.random(), vy: -50 - Math.random() * 60, life: .35, c: P.white });
  N.x = nx; N.anim += dt * Math.abs(N.v) / 14;

  // --- a tiny hop, as on the beach ---
  if (N.air) { N.hopV -= BEACH.hopGravity * dt; N.hop += N.hopV * dt; if (N.hop <= 0) { N.hop = N.hopV = 0; N.air = false; } }
  if (!control || N.full || N.digging) input.jumpBuffer = 0;
  else if (input.jumpBuffer > 0 && !N.air) { N.air = true; N.hopV = BEACH.hop * 1.15; input.jumpBuffer = 0; }
  input.jumpBuffer = Math.max(0, input.jumpBuffer - dt);
  const z = topZ(N.x); N.z += (z - N.z) * Math.min(1, dt * 16);

  if ((N.phase === 'calm' || N.phase === 'waves') && !N.full && depth > scoopDepth() + .5 && Math.abs(N.x - centre()) < TIDE.inner) hint('bucket', 'DOWN ARROW: SCOOP UP WATER. AGAIN: TIP IT OUT.');
}

// Scoop the water round Ichigo's feet into the bucket.
function scoop() {
  let want = TIDE.scoop; const c = N.w.col(N.x);
  for (let r = 0; r < 5 && want > 0; r++) for (const i of r ? [c - r, c + r] : [c]) {
    if (i < TIDE.edge || i >= N.w.n - TIDE.edge) continue;
    const take = Math.min(N.w.d[i], want / TIDE.cell); N.w.d[i] -= take; want -= take * TIDE.cell;
  }
  N.full = true; playScoop();
  for (let i = 0; i < 5; i++) parts.push({ x: N.x + N.face * 14, y: yOf(N.z) - 6, vx: (Math.random() - .5) * 60, vy: -60 - Math.random() * 60, life: .35, c: P.aqua });
}
// Tip it out, an arm's length in front (so it clears a wall, if there's one there).
function pour() {
  N.full = false; N.pouring = .5; playPour();
  const c = N.w.col(N.x + N.face * TIDE.arm);
  for (const i of [c - 1, c, c + 1]) if (i >= 0 && i < N.w.n) N.w.d[i] += TIDE.scoop / TIDE.cell / 3;
  for (let i = 0; i < 10; i++) parts.push({ x: N.x + N.face * 16, y: yOf(N.z) - 26, vx: N.face * (60 + Math.random() * 60), vy: -60 + Math.random() * 40, life: .5, c: Math.random() < .5 ? P.aqua : P.ocean });
}

// ============================================================================
// Crabs
// ============================================================================
function spawnCrab(side) {
  N.crabs.push({ side, x: side === 'right' ? 700 : 154, dir: side === 'right' ? -1 : 1, state: 'walk', t: 0, bitten: new Set(), anim: 0 });
}
function updateCrabs(dt) {
  if (N.crabs.length) hint('crab', 'CRABS KNOCK WALLS DOWN.');
  for (const c of N.crabs) {
    c.t += dt;
    const out = c.side === 'right' ? 1 : -1;
    if (c.state !== 'home' && Math.abs(c.x - N.x) < TIDE.crab.near && !N.seated) { c.state = 'home'; c.fled = true; playClick(1); }   // it runs from Ichigo
    if (c.state === 'walk') {
      c.x += -out * TIDE.crab.speed * dt; c.dir = -out; c.anim += dt * 7;
      const i = slotOf(c.x);
      if (wallAt(i) > .3 && !c.bitten.has(i)) { c.state = 'pinch'; c.t = 0; c.slot = i; }
      if (out * (c.x - centre()) < 30) c.state = 'home';   // nothing left to knock down
    } else if (c.state === 'pinch') {
      c.anim += dt * 12;
      if (Math.random() < dt * 8) { crumble(c.x, 1); if (Math.random() < .3) playClick(.8); }
      if (c.t > TIDE.crab.pinch) { setWall(c.slot, N.walls[c.slot] - TIDE.crab.bite); crumble(c.x, 8); playDig(); c.bitten.add(c.slot); c.state = 'walk'; c.t = 0; }
    } else { c.dir = out; c.x += out * (c.fled ? TIDE.crab.flee : TIDE.crab.speed * 1.6) * dt; c.anim += dt * 14; }
  }
  N.crabs = N.crabs.filter(c => Math.abs(c.x - centre()) < 300);
}

// ============================================================================
// The sandbar
// ============================================================================
function updateBar(dt) {
  if (N.t > .6) hint('run', 'SHIFT: RUN.  SPACE: HOP.');
  if (N.x > S.level.bar.from + 20 || N.t > 8) N.barGo = true;   // (a moment to look about; then the sea starts back)
  if (N.barGo) { N.barT += dt; N.tide = TIDE.low + TIDE.rise * N.barT; }
  for (const c of N.barCrabs) {
    c.t += dt; c.hide = Math.max(0, c.hide - dt);
    c.x += c.dir * 34 * dt; if ((c.x - c.home) * c.dir > 34) c.dir = -c.dir;
    if (!c.hide && Math.abs(c.x - N.x) < 15 && N.hop < 7 && N.stumble <= 0) {   // bumped into: Ichigo stumbles, and it digs itself in
      N.stumble = TIDE.stumble; c.hide = 3; playClick(1);
      for (let i = 0; i < 8; i++) parts.push({ x: N.x + N.face * 8, y: yOf(N.z) - 2, vx: (Math.random() - .5) * 120, vy: -40 - Math.random() * 80, life: .45, c: P.tanD });
    }
  }
  N.deep = depthAt(N.x) > TIDE.deep ? N.deep + dt : Math.max(0, N.deep - dt);
  if (N.deep > TIDE.deepTime) {
    N.phase = 'taken'; N.t = 0; N.gone = true; playFall();
    for (let i = 0; i < 18; i++) parts.push({ x: N.x, y: yOf(N.tide), vx: (Math.random() - .5) * 200, vy: -130 - Math.random() * 180, life: .8, c: Math.random() < .6 ? P.white : P.aqua });
  }
}
