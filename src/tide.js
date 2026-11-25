// ============================================================================
// tide.js — Level 2, The Tide Comes In: the lantern island at night. Ichigo (three) keeps the stone
// lantern lit until morning. The waves are full of sea-fireflies (umi-hotaru, which really do glow blue
// on Japanese shores): each wave leaves some shining on the sand as it drains. Ichigo runs out after it,
// scoops them into the bucket, and gets back up the beach before the next wave. Things from home lie
// furthest out. Then the tide goes out, a sandbar shows, and Ichigo runs across it to the next island.
// This file is how it plays; tideart.js draws it; water.js is the water. The island, the waves and the
// sandbar are in levels/level02.json, and the tuning is TIDE in config.js.
// Heights (z) go up: z = 0 is the sea at the lowest tide of the night, at y = TIDE.base.
// ============================================================================
import { W, MOVE, BEACH, TIDE, P } from './config.js';
import { S, parts } from './state.js';
import { input, inLeft, inRight, inRun, inUse } from './input.js';
import { makeWater, flow } from './water.js';
import { think, clearBubbles } from './bubbles.js';
import { showCards } from './cards.js';
import { updateParts } from './player.js';
import { learn, keepThing } from './save.js';
import { THINGS } from './things.js';
import { seaSound, playWash, playScoop, playPour, playHiss, playClick, playFall, playSnore, playCry } from './audio.js';

const INTRO_CARDS = [
  'THE TIDE IS COMING IN, AND THE LANTERN IS GOING OUT.',
  'THE WAVES ARE FULL OF SEA-FIREFLIES. THEY SHINE ON THE SAND WHEN THE WATER GOES BACK.',
  'DOWN ARROW: SCOOP THEM UP. TAKE THEM TO THE LANTERN. KEEP IT LIT UNTIL MORNING.',
];
const DAWN_CARDS = [
  'IN THE MORNING THE TIDE GOES OUT. A SANDBAR LEADS TO A BIGGER ISLAND.',
  'CROSS IT BEFORE THE WATER COMES BACK.',
];

// Everything about the level as it plays out. (Exposed on window.ichigo.tide for the test bot.)
// phase: 'wake' → 'calm' ⇄ 'waves' (the sets) → 'ebb' → 'bar' (the sandbar); 'out' = the lantern's
// light going out; 'taken' = the sea taking Ichigo on the sandbar; 'under' = a wave taking them in the night (all end in a new tomorrow).
export const N = {};
const lerp = (a, b, k) => a + (b - a) * k;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = k => { k = clamp(k, 0, 1); return k * k * (3 - 2 * k); };
export const yOf = z => TIDE.base - z;
const centre = () => S.level.lantern;
const sideOf = x => (x > centre() ? 'right' : 'left');
const away = side => (side === 'right' ? 1 : -1);   // which way the sea is, on that side

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

// How deep the water is at x.
export function depthAt(x) {
  if (x < TIDE.x0 || x >= TIDE.x0 + TIDE.cell * TIDE.cells || (onBar() && x > S.level.bar.from)) return Math.max(0, N.tide - groundZ(x));
  return N.w.depthAt(x);
}

// ============================================================================
// The sea. Before each wave it draws back on that side of the island; then the wave (a swell) rolls in.
// ============================================================================
export const waveT = v => v.t - TIDE.pull.lead;   // seconds since the wave itself set off (before that, the sea is only drawing back)
export const waveX = v => (v.side === 'right' ? W + TIDE.wave.start - waveT(v) * TIDE.wave.speed : -TIDE.wave.start + waveT(v) * TIDE.wave.speed);
// How far the sea has drawn back on a side (0..1). It comes back in with the wave.
export function drawnBack(side) {
  let k = 0;
  for (const v of N.swells) if (v.side === side) k = Math.max(k, smooth(v.t / TIDE.pull.time) - smooth((waveT(v) - .6) / 1.4));
  return Math.max(0, k);
}
export function restZ(x) { return N.tide - TIDE.pull.depth * drawnBack(sideOf(x)); }   // the sea's surface at x, but for its waves
// The sea's surface at x: a wave only rolls in on its own side of the island.
export function seaZ(x) {
  const side = sideOf(x);
  let z = restZ(x);
  for (const v of N.swells) if (v.side === side && v.t > TIDE.pull.lead) { const d = (x - waveX(v)) / TIDE.wave.width; z += v.h * Math.exp(-d * d); }
  return z;
}
function launch(side, h, t = 0) { for (const s of side === 'both' ? ['left', 'right'] : [side]) N.swells.push({ side: s, h, t, broke: false }); }

// ============================================================================
// Starting, and starting again
// ============================================================================
export function startTide() {
  const G = Array.from({ length: TIDE.cells }, (_, i) => TIDE.x0 + (i + .5) * TIDE.cell);
  Object.assign(N, {
    phase: 'wake', t: 0, set: 0, wave: 0, done: false, light: 0, tide: S.level.sets[0].tide, tideFrom: 0,
    asleep: true, snoreT: .6, x: 455, v: 0, face: 1, anim: 0, z: 0, hop: 0, hopV: 0, air: false, moving: false, seated: true, idle: 0, boredAt: 0, sulk: 0, stumble: 0, push: 0,
    load: 0, scoopT: 0, scooping: 0, pouring: 0, flare: 0, deep: 0, fuel: TIDE.first, lit: true, gone: false,
    glows: [], wetted: new Uint8Array(TIDE.cells), thing: null, held: null, saved: [], tries: 0, swells: [], crabs: [], barCrabs: [], cry: 0, under: 0, kani: false, fire: TIDE.first, blue: 0,
    shell: 'lying', shellT: 0, barT: 0, barGo: false, hint: null, hintT: 0, hinted: new Set(), said: false, snap: null,
    w: makeWater(TIDE.x0, TIDE.cell, G.map(islandZ)),
  });
  N.w.d.forEach((_, i) => { N.w.d[i] = Math.max(0, N.tide - N.w.solid(i)); });
  N.z = groundZ(N.x);
  parts.length = 0; clearBubbles(); input.jumpBuffer = 0; input.usePressed = false;
  S.deaths = 0; S.levelT = 0; S.camX = 0; S.scene = 'tide'; S.sceneT = 0;
  showCards(INTRO_CARDS);
}

// The start of a set. How things are now is what a new tomorrow goes back to.
function startSet() {
  N.phase = 'calm'; N.t = 0; N.wave = 0; N.tideFrom = N.tide; N.tries = 0;
  N.snap = { water: N.w.snapshot(), tide: N.tide, fuel: N.fuel };
  nextThing(); nextCrabs();
}
// The set's crabs come up out of the sand.
function nextCrabs() {
  N.crabs = (S.level.sets[N.set].crabs || []).map((side, i) => ({ side, x: centre() + away(side) * (110 + i * 30), dir: away(side), t: i, hide: 1 }));
}
// What might wash up in this set (unless it's already by the lantern): out at sea until the sand it's on is bared.
function nextThing() {
  const [id, side] = S.level.sets[N.set].thing || [];
  N.held = null;
  N.thing = id && !N.saved.includes(id) ? { id, side, state: 'sea', x: 0 } : null;
}

// A new tomorrow (called while the dawn print covers the screen).
export function retryTide() {
  N.swells = []; N.glows = []; N.wetted.fill(0); N.deep = 0; N.lit = true; N.gone = false; N.load = 0; N.stumble = 0; N.sulk = 0; N.seated = false; N.idle = 0;
  N.air = false; N.hop = N.hopV = 0; N.v = 0; N.push = 0; N.moving = false; parts.length = 0; clearBubbles();
  N.cry = N.under = 0;
  if (N.phase === 'taken') { startBar(); return; }
  if (N.phase === 'under') {   // taken by a wave: the night starts again (what's been saved stays saved)
    N.set = 0; N.tide = S.level.sets[0].tide; N.fuel = N.fire = TIDE.first; N.snap = null;
    N.w.d.forEach((_, i) => { N.w.d[i] = Math.max(0, N.tide - N.w.solid(i)); }); N.w.v.fill(0);
    startSet();
    N.x = centre() + 40; N.face = 1; N.z = groundZ(N.x); return;
  }
  N.w.restore(N.snap.water); N.tide = N.tideFrom = N.snap.tide; N.fuel = Math.max(TIDE.atLeast, N.snap.fuel);
  N.phase = 'calm'; N.t = 0; N.wave = 0; N.tries++;
  nextThing(); nextCrabs();
  N.x = centre() + 40; N.face = 1; N.z = groundZ(N.x);
}
function tomorrow() { S.deaths++; S.tomorrows++; S.scene = 'dawn'; S.sceneT = 0; }

// As it is at the very end: morning, Ichigo sitting on the green island. (A picture in the next level's journey: story.js.)
export function endTide() { startTide(); startBar(); N.light = 1; N.asleep = false; N.x = S.level.bar.goal + 2; N.z = groundZ(N.x); N.seated = true; N.shell = 'kept'; S.camX = Math.max(0, Math.min(S.level.length - W, N.x - W * .38)); }
function startBar() {
  N.phase = 'bar'; N.t = 0; N.barT = 0; N.barGo = false; N.tide = TIDE.low; N.x = centre() + 90; N.face = 1; N.z = groundZ(N.x);
  N.w.d.fill(0); N.w.v.fill(0);
  N.barCrabs = S.level.bar.crabs.map((x, i) => ({ x, home: x, t: i * 1.3, dir: i % 2 ? 1 : -1, hide: 0 }));
  if (N.shell !== 'kept') N.shell = 'lying';
  N.shellT = 0;
}

function hint(id, text, time = 4.5) { if (!N.hinted.has(id) && N.hintT <= 0) { N.hinted.add(id); N.hint = text; N.hintT = time; } }   // (one at a time: a second waits its turn)

// How long a set takes, for the moon (tideart.js).
export const setTime = s => TIDE.calm + (s.waves.length - 1) * s.gap + TIDE.ends;

// ============================================================================
// Every frame
// ============================================================================
export function updateTide(dt, win) {
  N.t += dt; S.levelT += dt;
  if (N.hintT > 0) N.hintT -= dt;
  const set = S.level.sets[N.set];

  if (N.phase === 'wake') {   // one wave reaches Ichigo's feet and goes back, leaving the first lights on the sand
    if (N.t > TIDE.asleep && !N.said) { launch('both', TIDE.wakeWave, TIDE.pull.lead + .4); N.said = 'wave'; }
    if (N.asleep && N.said === 'wave' && (depthAt(N.x + 14) > 1 || N.t > TIDE.asleep + 4.2)) { N.asleep = false; N.sulk = .9; N.woke = N.t; }
    if (!N.asleep && N.t > N.woke + .5) { N.seated = false; startSet(); }
  } else if (N.phase === 'calm') {
    N.tide = lerp(N.tideFrom, set.tide, smooth(N.t / TIDE.calm));
    if (N.t > (N.set ? TIDE.calm : .5)) { N.phase = 'waves'; N.t = set.gap; }
  } else if (N.phase === 'waves') {
    if (N.wave < set.waves.length) { if (N.t >= set.gap) { N.t = 0; launch(...set.waves[N.wave++]); } }
    else if (N.t > TIDE.ends) { if (N.set + 1 < S.level.sets.length) { N.set++; startSet(); } else { N.phase = 'ebb'; N.t = 0; N.tideFrom = N.tide; N.snap = null; N.thing = null; N.held = null; } }
  } else if (N.phase === 'ebb') {   // morning: the light comes up and the water drains away
    N.light = clamp(N.t / 4, 0, 1);
    N.tide = lerp(N.tideFrom, TIDE.low, smooth(N.t / TIDE.ebb));
    if (N.t > TIDE.ebb + 1) { const x = N.x; startBar(); N.x = x; N.z = groundZ(x); N.load = 0; showCards(DAWN_CARDS); }
  } else if (N.phase === 'bar') updateBar(dt);
  else if (N.phase === 'out') { if (N.t > 1.3) { tomorrow(); return; } }
  else if (N.phase === 'taken' || N.phase === 'under') { if (N.t > .5) { tomorrow(); return; } }

  updateWater(dt);
  updateGlows(dt);
  updateThing();
  updateCrabs(dt);
  updateLantern(dt, set);
  updateIchigo(dt);
  updateParts(dt);
  if (N.phase === 'bar' && N.x > S.level.bar.goal) { learn('crab'); N.done = true; N.seated = true; N.v = 0; N.moving = false; parts.length = 0; win(); }
  input.usePressed = false;

  // the camera: still all night, following Ichigo along the sandbar
  const target = onBar() && N.phase !== 'ebb' ? clamp(N.x - W * .38, 0, S.level.length - W) : 0;
  S.camX += (target - S.camX) * Math.min(1, dt * 4);
  // the sea: louder as a wave comes in, and nearly silent as it draws back
  let near = 0; for (const v of N.swells) if (v.t > TIDE.pull.lead) near = Math.max(near, 1 - Math.abs(waveX(v) - (v.side === 'right' ? 720 : 134)) / 260);
  seaSound(.3 + .12 * N.set / 3 + .5 * near - .18 * Math.max(drawnBack('left'), drawnBack('right')));
}

function updateWater(dt) {
  for (const v of N.swells) {
    v.t += dt;
    const shore = centre() + away(v.side) * (300 - N.tide * 4);
    if (!v.broke && v.t > TIDE.pull.lead && (v.side === 'right' ? waveX(v) < shore : waveX(v) > shore)) {   // it breaks on the shore
      v.broke = true; playWash(v.h / 70);
      for (let i = 0; i < 18; i++) parts.push({ x: shore + (Math.random() - .5) * 50, y: yOf(seaZ(shore) - 4), vx: -away(v.side) * (20 + Math.random() * 130), vy: -90 - Math.random() * 190, life: .4 + Math.random() * .4, c: Math.random() < .5 ? P.mist : P.aqua, s: Math.random() < .3 ? 2 : 1 });
    }
  }
  N.swells = N.swells.filter(v => v.t < 10);
  flow(N.w, dt, { sea: seaZ, edge: TIDE.edge, tide: restZ, seep: TIDE.seep, soak: TIDE.soak });
}

// Sea-fireflies: wherever a wave has covered the sand and drained away, some are left shining.
function updateGlows(dt) {
  if (onBar()) { N.glows = []; return; }
  const w = N.w;
  for (const g of N.glows) {
    g.t += dt; if (w.d[g.c] > 6 && g.t > .4) g.t = 99;   // the next wave takes them back
    if (g.n <= 0) g.t = 99;
  }
  N.glows = N.glows.filter(g => g.t < TIDE.glow.life);
  for (let c = TIDE.edge; c < w.n - TIDE.edge; c++) {
    if (w.d[c] > 5) N.wetted[c] = 1;
    else if (N.wetted[c] && w.d[c] < 2) {
      N.wetted[c] = 0;
      const x = w.x0 + (c + .5) * w.cw;
      if (Math.abs(x - centre()) < 62 || x < 20 || x > W - 20) continue;
      if (N.glows.some(g => Math.abs(g.x - x) < TIDE.glow.apart) || N.glows.filter(g => sideOf(g.x) === sideOf(x)).length >= TIDE.glow.most) continue;
      N.glows.push({ x, c, t: 0, n: w.ground[c] < N.tide ? TIDE.glow.far : TIDE.glow.near, seed: c });
    }
  }
}

// Something from home, lying on sand that's only bared when the sea draws back. A wave takes it out
// again; it's back the next time the sea draws back on that side.
function updateThing() {
  const th = N.thing;
  if (!th || N.phase !== 'waves') { if (th && th.state === 'lying') th.state = 'sea'; return; }
  if (th.state === 'sea') {
    if (drawnBack(th.side) < .9) return;
    let x = centre(); while (Math.abs(x - centre()) < 400 && groundZ(x) > N.tide - TIDE.pull.depth * .62) x += away(th.side) * 4;
    if (N.w.depthAt(x) < 2.5) { th.state = 'lying'; th.x = x; hint('thing', 'SOMETHING FROM HOME!', 3); }
  } else if (th.state === 'lying' && N.w.depthAt(th.x) > 8) th.state = 'sea';
}

// Crabs, walking up and down the sand (under it while a wave's over them). A pinch makes Ichigo cry.
function pinched(c, time, hide) {
  if (!N.kani) { N.kani = true; think('crab', 2); learn('crab'); }   // (they learn about crabs the hard way)
  N.stumble = time; N.cry = time; c.hide = hide; playClick(1); playCry();
  for (let i = 0; i < 8; i++) parts.push({ x: N.x + N.face * 8, y: yOf(N.z) - 2, vx: (Math.random() - .5) * 120, vy: -40 - Math.random() * 80, life: .45, c: P.tanD });
}
function updateCrabs(dt) {
  if (onBar()) { N.crabs = []; return; }
  const K = TIDE.crab;
  for (const c of N.crabs) {
    c.t += dt; c.hide = Math.max(N.w.depthAt(c.x) > 4 ? .8 : 0, c.hide - dt);
    if (c.hide) continue;
    const out = away(c.side), far = out * (c.x - centre());
    if (far > K.to || N.w.depthAt(c.x + c.dir * 14) > 2) c.dir = -out; else if (far < K.from) c.dir = out;
    c.x += c.dir * K.speed * dt;
    if (Math.abs(c.x - N.x) < 120) hint('crab', 'SPACE: HOP OVER CRABS.', 3.5);
    if (Math.abs(c.x - N.x) < TIDE.crab.reach && N.hop < TIDE.crab.clear && N.stumble <= 0 && !N.gone) pinched(c, K.cry, K.hide);
  }
}

function updateLantern(dt, set) {
  N.flare = Math.max(0, N.flare - dt);
  const blue = N.phase === 'out' || N.flare > 0 || (N.fire <= 0 && !onBar()) ? 1 : 0;
  N.blue += (blue - N.blue) * Math.min(1, dt * 5);
  if (N.phase !== 'calm' && N.phase !== 'waves') return;
  // its own fire burns down, and then it's all sea-fireflies: the light turns blue (and while they're being poured in)
  N.fire = Math.max(0, N.fire - set.burn * dt);
  N.fuel = Math.max(0, N.fuel - set.burn * (1 - TIDE.kinder * Math.min(3, N.tries)) * dt);
  if (N.fuel <= 0) {
    N.phase = 'out'; N.t = 0; N.lit = false; playHiss();
    for (let i = 0; i < 14; i++) parts.push({ x: centre() + (Math.random() - .5) * 16, y: yOf(groundZ(centre())) - 50, vx: (Math.random() - .5) * 40, vy: -150 - Math.random() * 120, life: .8, c: Math.random() < .5 ? P.grey1 : P.mist });
  }
}

// What use would do where Ichigo is: { do: 'feed' | 'take' | 'scoop' | 'shell', ... } or null.
export function action() {
  if (N.air || N.stumble > 0 || N.shellT > 0 || ['wake', 'out', 'taken', 'under'].includes(N.phase) || N.done) return null;
  if (N.phase === 'bar' && N.shell === 'lying' && Math.abs(N.x - S.level.bar.shell) < 26) return { do: 'shell' };
  if (onBar()) return null;
  if (N.thing && N.thing.state === 'lying' && Math.abs(N.x - N.thing.x) < TIDE.reach) return { do: 'take' };
  if (N.load > 0 && Math.abs(N.x - centre()) < TIDE.by) return { do: 'feed' };
  if (N.load < TIDE.bucket) {
    let best = null; for (const g of N.glows) { const d = Math.abs(g.x - N.x); if (d < TIDE.reach && (!best || d < Math.abs(best.x - N.x))) best = g; }
    if (best) return { do: 'scoop', glow: best };
  }
  return null;
}

function updateIchigo(dt) {
  const control = !['wake', 'out', 'taken', 'under'].includes(N.phase) && !N.done && N.stumble <= 0 && N.shellT <= 0;
  const dir = control ? (inRight() ? 1 : 0) - (inLeft() ? 1 : 0) : 0;
  const wants = control && (dir || inUse() || input.usePressed || input.jumpBuffer > 0);
  // left alone a while, Ichigo sits down, bored; any key gets them up at once
  if (N.seated && wants) { N.seated = false; N.sulk = BEACH.sulk; }
  N.sulk = Math.max(0, N.sulk - dt); N.stumble = Math.max(0, N.stumble - dt); N.cry = Math.max(0, N.cry - dt); N.pouring = Math.max(0, N.pouring - dt);
  N.scoopT = Math.max(0, N.scoopT - dt); N.scooping = Math.max(0, N.scooping - dt);
  N.idle = wants || N.air || !control ? 0 : N.idle + dt;
  if (!N.seated && N.phase !== 'wake' && N.idle > (N.boredAt || (N.boredAt = BEACH.bored[0] + Math.random() * BEACH.bored[1]))) { N.seated = true; N.boredAt = 0; }

  // --- use --- (scooping keeps going while it's held)
  const act = control ? action() : null;
  if (act && act.do === 'scoop' && (inUse() || input.usePressed) && N.scoopT <= 0) {
    act.glow.n--; N.load++; N.scoopT = TIDE.scoop; N.scooping = .2; N.seated = false; playScoop();
    for (let i = 0; i < 6; i++) parts.push({ x: act.glow.x + (Math.random() - .5) * 14, y: yOf(N.z) - 3, vx: (N.x - act.glow.x) * 2 + (Math.random() - .5) * 50, vy: -70 - Math.random() * 70, life: .4, c: Math.random() < .5 ? P.mist : P.aqua });
  } else if (act && input.usePressed) {
    if (act.do === 'feed') feed();
    else if (act.do === 'take') { N.thing.state = 'held'; N.held = N.thing.id; playClick(1.4); }
    else if (act.do === 'shell') { N.shellT = TIDE.shellTime; N.shell = 'held'; }
  }
  // what's been carried as far as the lantern is safe: Ichigo puts it down there
  if (N.held && control && Math.abs(N.x - centre()) < TIDE.by) {
    const id = N.held; N.held = null; N.saved.push(id); N.thing = null; keepThing(id); S.newThing = true; playClick(1.7);
    N.hintT = 0; hint('kept-' + id, THINGS[id].name + '. TAB: LOOK AT IT.', 4);
  }
  if (N.shellT > 0 && (N.shellT -= dt) <= 0) { N.shell = 'kept'; keepThing('shell'); S.newThing = true; playClick(1.6); }

  // --- walking ---
  const depth = depthAt(N.x);
  let speed = inRun() && N.load <= TIDE.canRun ? MOVE.run : MOVE.walk * (1 - TIDE.heavy * N.load);
  if (N.scooping > 0) speed *= .35;
  if (depth > 6 && !N.air) speed *= TIDE.wade;
  N.moving = !!dir; if (dir) N.face = dir;
  N.v = dir * speed;
  // the water shoves Ichigo along (not on the sandbar, where it only rises); a wave knocks them over
  const rush = onBar() ? 0 : N.w.speedAt(N.x);
  const shove = !onBar() && depth > 6 ? rush * TIDE.shove * Math.min(1, depth / 16) : 0;
  N.push += (shove - N.push) * Math.min(1, dt * 8);
  if ((N.phase === 'waves' || N.phase === 'calm') && N.stumble <= 0 && depth > TIDE.knock && -away(sideOf(N.x)) * rush > TIDE.rush) knock();
  // too far under a wave, and it takes them
  N.under = (N.phase === 'waves' || N.phase === 'calm') && depth > TIDE.under ? N.under + dt : Math.max(0, N.under - dt);
  if (N.under > TIDE.underTime) { sweptAway('under'); return; }
  let nx = N.x + (N.v + N.push) * dt;
  const deepAhead = groundZ(nx + (dir || 1) * 4) < restZ(nx) - TIDE.waist;   // (the sea's standing depth, not a passing wave's)
  if (!onBar() && deepAhead && Math.abs(nx - centre()) > Math.abs(N.x - centre())) nx = N.x;
  if (onBar() && N.phase !== 'ebb') nx = Math.max(centre() - 60, nx);
  nx = Math.max(nx, 14); if (!onBar() || N.phase === 'ebb') nx = Math.min(nx, W - 14);
  if (depth > 5 && dir && Math.random() < .2) parts.push({ x: N.x + dir * 8, y: yOf(groundZ(N.x) + depth), vx: dir * 40 * Math.random(), vy: -50 - Math.random() * 60, life: .35, c: P.white });
  else if (!onBar() && N.moving && depth > .4 && Math.random() < .25) parts.push({ x: N.x - dir * 6, y: yOf(N.z) - 1, vx: 0, vy: -20 - Math.random() * 20, life: .5, c: P.aqua });   // (wet sand sparkles where they step)
  N.x = nx; N.anim += dt * Math.abs(N.v) / 14;

  // --- a tiny hop, as on the beach ---
  if (N.air) { N.hopV -= BEACH.hopGravity * dt; N.hop += N.hopV * dt; if (N.hop <= 0) { N.hop = N.hopV = 0; N.air = false; } }
  if (!control) input.jumpBuffer = 0;
  else if (input.jumpBuffer > 0 && !N.air) { N.air = true; N.hopV = TIDE.hop; input.jumpBuffer = 0; }
  input.jumpBuffer = Math.max(0, input.jumpBuffer - dt);
  const z = groundZ(N.x); N.z += (z - N.z) * Math.min(1, dt * 16);

  if (N.load >= 3 && N.phase !== 'wake') hint('feed', 'DOWN ARROW AT THE LANTERN: FEED IT.');
  if (N.phase === 'waves' && N.wave === 2 && N.set === 0 && N.t > .5) hint('run', 'SHIFT: RUN. A FULL BUCKET IS SLOW.');
}

// The sea takes Ichigo (phase: 'under' or 'taken').
function sweptAway(phase) {
  N.phase = phase; N.t = 0; N.gone = true; N.load = 0; N.held = null; N.stumble = N.cry = 0; playFall();
  const y = yOf(groundZ(N.x) + depthAt(N.x));
  for (let i = 0; i < 18; i++) parts.push({ x: N.x, y, vx: (Math.random() - .5) * 200, vy: -130 - Math.random() * 180, life: .8, c: Math.random() < .6 ? P.white : P.aqua });
}
// The snoring, at the very start (it goes on under the story cards, so main.js calls this).
export function snore(dt) { if (N.asleep && N.phase === 'wake' && (N.snoreT -= dt) <= 0) { N.snoreT = 2.6; playSnore(); } }

// Tip the bucket into the lantern.
function feed() {
  N.fuel = Math.min(1, N.fuel + TIDE.feed * N.load); N.flare = .9; N.pouring = .45; N.seated = false;
  const dx = centre() - N.x; if (Math.abs(dx) > 4) N.face = Math.sign(dx);
  for (let i = 0; i < 6 + N.load * 3; i++) parts.push({ x: centre() + (Math.random() - .5) * 16, y: yOf(groundZ(centre())) - 50, vx: (Math.random() - .5) * 130, vy: -60 - Math.random() * 150, life: .5 + Math.random() * .5, c: [P.mist, P.aqua, P.gold][i % 3] });
  N.load = 0; playPour(); playClick(1.2);
}

// A wave catches Ichigo: it tumbles them up the beach, the bucket empties, and the sea takes back what they were carrying.
function knock() {
  N.stumble = TIDE.down; N.air = false; N.hop = 0; N.scooping = 0; playWash(.4);
  for (let i = 0; i < 8 + N.load * 3; i++) parts.push({ x: N.x + (Math.random() - .5) * 20, y: yOf(N.z) - 14, vx: N.push + (Math.random() - .5) * 160, vy: -60 - Math.random() * 140, life: .6, c: N.load && i % 2 ? P.aqua : P.white });
  N.load = 0;
  if (N.held) { N.held = null; if (N.thing) N.thing.state = 'sea'; }
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
    if (!c.hide && Math.abs(c.x - N.x) < TIDE.crab.reach && N.hop < TIDE.crab.clear && N.stumble <= 0) {   // a pinch, and it digs itself in
      pinched(c, TIDE.stumble, 3);
    }
  }
  N.deep = depthAt(N.x) > TIDE.deep ? N.deep + dt : Math.max(0, N.deep - dt);
  if (N.deep > TIDE.deepTime) {
    sweptAway('taken');
  }
}
