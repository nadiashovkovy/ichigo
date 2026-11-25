// ============================================================================
// lighthouse.js — Level 4, The Lighthouse (the Odyssey's Cyclops): stealth. No one lives here. The lamp
// of the lighthouse is an eye, and it looks for whatever moves.
//   • The beam sweeps past Ichigo, the eye shuts for a moment, and it sweeps back. Seen: a new tomorrow.
//   • ↓ held: Ichigo hides under the bucket. The light stops to look at a bucket, longer each time; one that
//     moves is seen. Behind a rock or a crate, it goes by, and forgets.
//   • Walls with a low tunnel through them: Ichigo only fits under the bucket.
//   • Indoors the light comes in at the windows and slides over the floor. (Some have a shutter, on a cord.)
//   • Noises turn the eye to look: a bottle, the cat, a gull, a splash, a shutter. Or a bell, rung from far off
//     by its cord, to make it look somewhere else.
//   • Four rooms of a shed, the rocks, stones across the water, a wreck, the flats, a headland, the boathouse,
//     where the raft's rope must be cut in the dark; then away on the raft, through the beam.
// This file is how it plays; lighthouseart.js draws it. Places are in levels/level04.json, tuning in LIGHT (config.js).
// ============================================================================
import { W, MOVE, BEACH, LIGHT, P } from './config.js';
import { S, parts } from './state.js';
import { input, inLeft, inRight, inRun, inUse, inJump } from './input.js';
import { think, clearBubbles } from './bubbles.js';
import { showCards } from './cards.js';
import { updateParts } from './player.js';
import { learn, keepThing } from './save.js';
import { seaSound, playWash, playClick, playFall, playBell, playSquawk, playStep, playSmash, playMeow, playSeen, playCut, playBolt, playThud } from './audio.js';

const CARDS = ['THE RAFT WASHES UP BELOW A LIGHTHOUSE. ICHIGO SLEEPS IN A SHED, ON A SHELF, OUT OF THE WET.', 'IN THE NIGHT THE TIDE TAKES THE RAFT. ITS ROPE CATCHES IN THE BOATHOUSE, ACROSS THE ROCKS.', 'NO ONE LIVES HERE NOW. BUT THE LAMP IS LIT, AND IT LOOKS FOR WHATEVER MOVES.', "GET BACK TO THE RAFT. DON'T LET THE LIGHT SEE YOU."];

// Everything about the level as it plays out. (Exposed on window.ichigo.light for the test bot.)
// phase: 'play' → 'away' (the rope parts) → 'paddle' → 'gone'; 'caught' (a new tomorrow), 'fell' (into the sea: one too).
export const H = {};
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const near = (x, r = 26) => Math.abs(H.x - x) < r;

export function groundY(x) {
  const G = S.level.ground;
  let i = 1; while (i < G.length - 1 && G[i][0] < x) i++;
  // (a smooth curve through the points, so there are no corners in the rocks)
  const [x0, y0] = G[i - 1], [x1, y1] = G[i], k = clamp((x - x0) / (x1 - x0), 0, 1), g = j => (j > 0 && j < G.length - 1 ? (G[j + 1][1] - G[j - 1][1]) / (G[j + 1][0] - G[j - 1][0]) : 0) * (x1 - x0);
  const lo = (y1 - y0) === 0 ? 0 : 1, m0 = lo * g(i - 1), m1 = lo * g(i);
  return y0 * (1 + 2 * k) * (1 - k) ** 2 + m0 * k * (1 - k) ** 2 + y1 * k * k * (3 - 2 * k) + m1 * k * k * (k - 1);
}
export const seaAt = x => LIGHT.sea + Math.sin(x * .018 - S.T * 1.2) * 2.6 + Math.sin(x * .007 + S.T * .7) * 1.6;
// The top of what there is to stand on at x: the ground, or a stone in the water.
export function surfaceY(x) { const s = S.level.stones.find(([a, b]) => x > a && x < b); return s ? Math.min(s[2], groundY(x)) : groundY(x); }
// The floor at x for someone whose feet are at y: the ground, or a stone or a shelf they're on or above.
function floorAt(x, y) {
  let f = groundY(x);
  for (const [a, b, sy] of x < S.level.room ? S.level.shelves : S.level.stones) if (x > a && x < b && sy >= y - 2 && sy < f) f = sy;
  return f;
}
export const shelterAt = x => S.level.shelters.find(([a, b]) => x > a && x < b);
const poolAt = x => S.level.pools.find(([a, b, y]) => x > a && x < b && groundY(x) > y + 2);
export const place = () => (H.x < S.level.room ? 'room' : H.x > S.level.house ? 'house' : 'rocks');
// Where x is under a roof (a room of the shed, the wreck, the boathouse), or nothing.
export const insideAt = x => S.level.rooms.find(r => x >= r.from && x < r.to);
// Which room of the shed x is in (or none).
export const roomAt = x => S.level.rooms.find(r => r.wall && x >= r.from && x < r.to);
// The tunnel through a wall of the shed that x is in: only as high as Ichigo under the bucket.
const FIT = 12;                                                                      // how far each side of them Ichigo reaches
export const tunnelAt = x => S.level.rooms.find(r => r.wall && x > r.wall[0] - FIT && x < r.wall[1] + FIT)?.wall;
export const bolted = wx => H.shut.has(wx);                                          // is this window's shutter down?

// ============================================================================
// The light
// ============================================================================
// How the light moves where Ichigo is.
const how = () => (onWater() ? LIGHT.water : place() === 'room' ? { ...LIGHT.beam, ...LIGHT.indoors } : LIGHT.beam);
const onWater = () => ['away', 'paddle', 'gone'].includes(H.phase);
// Where the beam falls: { x, w, on, lid (0 open, 1 shut) }.
export const beam = () => ({ x: H.eye.x, w: (onWater() ? LIGHT.water : LIGHT.beam).width, on: H.eye.mode !== 'dark' && H.eye.lid < .6, lid: H.eye.lid, mode: H.eye.mode, dir: H.eye.dir });
// The light through a window of a room r, at the height y: { x, half }, or null. (As the beam goes by outside, it slides along inside.)
export function patch(r, [wx, w], bx, y) {
  const d = bx - wx; if (Math.abs(d) > r.reach || bolted(wx)) return null;
  const f = clamp((y - r.top) / (r.floor - r.top), 0, 1);
  return { x: wx + d * r.k * f, half: w / 2 * (.7 + .3 * f) };
}
// Is there light at (x, y)?
export function litAt(x, y, b = beam()) {
  if (!b.on || (x < S.level.room && tunnelAt(x))) return false;
  const r = insideAt(x);
  if (!r) return Math.abs(x - b.x) < b.w / 2;
  return r.windows.some(w => { const p = patch(r, w, b.x, y); return p && Math.abs(x - p.x) < p.half; });
}
const lit = () => (H.phase === 'paddle' ? beam().on && Math.abs(H.raftX - H.eye.x) < beam().w / 2 : litAt(H.x, H.y - 14));
export const hiding = () => H.hide;                                                 // under the bucket
const behind = () => (H.phase === 'paddle' ? S.level.stacks.some(([a, b]) => H.raftX > a && H.raftX < b) : !!(H.on && shelterAt(H.x)));
// How hard it looks: faster, the nearer the boathouse.
function power() { let p = 1; for (const [x, k] of S.level.power) if (H.x >= x) p = k; return p; }
// Where the beam must be to light x (through the nearest window, if x is indoors).
function aimAt(x) {
  const r = insideAt(x); if (!r) return Math.max(x, x < S.level.room ? x : S.level.room + 40);
  const open = r.windows.filter(([wx]) => !bolted(wx)); if (!open.length) return x;
  const [wx] = open.reduce((a, b) => (Math.abs(b[0] - x) < Math.abs(a[0] - x) ? b : a));
  return wx + clamp((x - wx) / r.k, -r.reach + 20, r.reach - 20);
}
function newSweep() {
  const e = H.eye, B = how(), x = onWater() ? H.raftX + 60 : H.x;
  e.mode = 'sweep'; e.t = 0; e.stared = false; e.dir = -e.dir || 1;
  let a = x - B.span, b = x + B.span; if (x > S.level.room) a = Math.max(a, S.level.room + 40);
  e.x = e.dir > 0 ? a : b; e.end = e.dir > 0 ? b : a; e.forget = false;
}
function updateEye(dt) {
  const e = H.eye, B = how(); e.t += dt;
  const shut = e.mode === 'dark' || H.phase === 'gone';
  e.lid = clamp(e.lid + (shut ? dt / (H.phase === 'gone' ? 2.4 : .22) : -dt / .16), 0, 1);
  if (H.phase === 'gone') return;
  if (H.ear && (H.ear.wait -= dt) <= 0) { Object.assign(e, { mode: 'turn', goal: aimAt(H.ear.x), hold: H.ear.hold, t: 0, from: H.ear.x }); if (Math.abs(e.x - e.goal) > 1400) e.x = e.goal - Math.sign(e.goal - e.x) * 900; H.ear = null; }
  if (e.mode === 'dark') { if (e.t > B.dark) newSweep(); }
  else if (e.mode === 'turn') { const d = e.goal - e.x; e.x += Math.sign(d) * Math.min(Math.abs(d), LIGHT.turn * dt); if (Math.abs(d) < 4) { e.mode = 'hold'; e.t = 0; } }
  else if (e.mode === 'hold') { if (e.t > e.hold) { if (e.stared && e.from === undefined) e.mode = 'sweep'; else { e.mode = 'dark'; e.from = undefined; } e.t = 0; } }
  else if (e.mode === 'sweep') {
    e.x += e.dir * B.speed * power() * dt;
    if ((e.end - e.x) * e.dir <= 0) { e.mode = 'dark'; e.t = 0; }
    // a bucket: it stops to look
    else if (H.hide && !e.stared && !behind() && ['play', 'paddle'].includes(H.phase) && lit()) {
      const q = LIGHT.stare; e.mode = 'hold'; e.t = 0; e.stared = true; e.hold = Math.min(q.most, q.first + q.more * H.stares); H.stares++; playClick(.45);
      hint('stare', 'IT STOPS TO LOOK AT A BUCKET. STAY STILL.', 4);
    }
  }
  if (behind() && lit()) { if (H.stares > 1) hint('forget', 'BEHIND SOMETHING, IT GOES STRAIGHT BY.', 3.5); H.stares = 0; }
}

// ============================================================================
// Starting, and starting again
// ============================================================================
const freshEye = () => ({ x: 0, end: 0, dir: -1, mode: 'dark', t: 0, lid: 1, hold: 0, goal: 0, stared: false });
export function startLight() {
  Object.assign(H, {
    phase: 'play', t: 0, x: S.level.shelf, y: S.level.shelves[0][2], v: 0, vy: 0, on: 'ground', face: 1, anim: 0, moving: false, seated: true, idle: 0, boredAt: 0, sulk: 0, rising: false,
    hide: false, shuffling: false, seen: 0, stares: 0, eye: freshEye(), ear: null, digging: 0, rings: [], check: -1, shut: new Set(), danger: false,
    sleepers: S.level.sleepers.map(([kind, x]) => ({ kind, x, away: 0, t: 0 })), cords: S.level.cords.map(c => ({ ...c, swing: 0 })),
    chime: S.things.has('chime'), cuts: 0, raftX: S.level.raft, hint: null, hintT: 0, hinted: new Set(), splashT: 0, fade: 1, done: false,
  });
  parts.length = 0; clearBubbles(); input.jumpBuffer = 0; input.usePressed = false;
  S.deaths = 0; S.levelT = 0; S.camX = 0; S.scene = 'light'; S.sceneT = 0;
  showCards(CARDS);
}
// A new tomorrow: from the last place of safety Ichigo reached.
export function retryLight() {
  const paddling = H.check === 'paddle', first = H.check === -1;
  Object.assign(H, { phase: paddling ? 'paddle' : 'play', t: 0, v: 0, vy: 0, on: 'ground', face: 1, moving: false, seated: false, idle: 0, sulk: 0, hide: false, shuffling: false, seen: 0, stares: 0, eye: freshEye(), ear: null, digging: 0, rings: [], cuts: 0, danger: false, fade: 1, splashT: 0 });
  clearBubbles(); parts.length = 0; input.usePressed = false;
  for (const g of H.sleepers) g.away = 0;
  if (paddling) { H.raftX = S.level.raft + 300; H.x = H.raftX; H.seated = true; return; }
  H.x = first ? S.level.shelf : S.level.checkpoints[H.check]; H.y = first ? S.level.shelves[0][2] : surfaceY(H.x); H.raftX = S.level.raft;
  S.camX = clamp(H.x - W * .42, 0, S.level.length - W);
}
function tomorrow() { S.deaths++; S.tomorrows++; S.scene = 'dawn'; S.sceneT = 0; }
function hint(id, text, time = 4.5) { if (!H.hinted.has(id) && H.hintT <= 0) { H.hinted.add(id); H.hint = text; H.hintT = time; } }
const puff = (x, y, n, cols, up = 80, wide = 90) => { for (let i = 0; i < n; i++) parts.push({ x: x + (Math.random() - .5) * 12, y, vx: (Math.random() - .5) * wide * 2, vy: -up * (.4 + Math.random()), life: .35 + Math.random() * .35, c: cols[i % cols.length], s: Math.random() < .3 ? 2 : 1 }); };

// Seen: the eye does not look away.
function caught() {
  if (H.phase === 'caught') return;
  H.wet = onWater(); H.phase = 'caught'; H.t = 0; H.hide = false; H.hintT = 0; H.moving = false; H.v = 0; H.seated = H.wet; playSeen();
}

// ============================================================================
// Every frame
// ============================================================================
export function updateLight(dt, win) {
  H.t += dt; S.levelT += dt; if (H.hintT > 0) H.hintT -= dt;
  H.fade = Math.max(0, H.fade - dt * 1.6); H.sulk = Math.max(0, H.sulk - dt); H.digging = Math.max(0, H.digging - dt);
  for (const r of H.rings) r.t += dt; H.rings = H.rings.filter(r => r.t < .8);
  for (const g of H.sleepers) { g.t += dt; if (g.away > 0) g.away = Math.max(0, g.away - dt); }
  for (const c of H.cords) c.swing = Math.max(0, c.swing - dt / LIGHT.bell);

  if (H.phase === 'caught') { H.eye.x += (aimAt(H.x) - H.eye.x) * Math.min(1, dt * 12); H.eye.lid = 0; if (H.t > 1.5) { tomorrow(); return; } }
  else if (H.phase === 'fell') { if (H.t > .8) { tomorrow(); return; } }
  else updateEye(dt);
  if (H.phase === 'play') updatePlay(dt);
  else if (H.phase === 'away') updateAway(dt);
  else if (H.phase === 'paddle' || H.phase === 'gone') updatePaddle(dt, win);
  updateParts(dt);
  input.usePressed = false;

  const L = S.level, focus = onWater() || (H.phase === 'caught' && H.wet) ? H.raftX + 60 : H.x;
  const hi = H.phase === 'play' && place() === 'room' ? L.room + 60 - W : L.length - W;
  S.camX += (clamp(focus - W * .42, 0, hi) - S.camX) * Math.min(1, dt * 4);
  seaSound(place() === 'room' ? .12 : .34);
}

// ============================================================================
// Ichigo
// ============================================================================
// What use would do where Ichigo is, or null.
export function action() {
  if (H.phase !== 'play' || H.on !== 'ground') return null;
  const L = S.level, r = roomAt(H.x), low = H.y > 400;
  if (H.danger) return null;                                                          // (in the light, ↓ is only ever the bucket)
  const sh = r && low && L.shutters.find(q => near(q.x, 22) && !bolted(q.window)); if (sh) return { do: 'shutter', x: sh.x, window: sh.window };
  const cord = H.cords.find(c => near(c.x, 22) && c.swing <= 0); if (cord) return { do: 'cord', x: cord.x, cord };
  if (near(L.rope, 30) && H.cuts < LIGHT.cuts) return { do: 'cut', x: L.rope };
  return null;
}
// A noise: the eye turns to look where it came from.
function noise(x, { hold = LIGHT.listen, wait = LIGHT.wait, size = 300, y = surfaceY(x) - 20 } = {}) {
  H.rings.push({ x, y, r: size, t: 0 }); H.ear = { x, hold, wait };
  if (hold === LIGHT.listen) hint('heard', 'IT HEARD THAT.', 2);
}
function updatePlay(dt) {
  const L = S.level;
  const act = action();
  if (act && input.usePressed) use(act);
  // under the bucket, as long as ↓ is held (unless it's doing something else)
  const was = H.hide, tunnel = H.on && tunnelAt(H.x); H.hide = !!(was && tunnel) || (inUse() && (!act || was || H.danger) && H.on === 'ground' && H.digging <= 0);   // (in a tunnel there's no room to stand up)
  if (H.hide && !was) { playClick(.6); hint('under', 'A BUCKET THAT MOVES IN THE LIGHT IS SEEN.', 4); }
  if (H.hide) H.seated = false;

  const dir = (inRight() ? 1 : 0) - (inLeft() ? 1 : 0), wants = dir || inUse() || input.usePressed || input.jumpBuffer > 0;
  if (H.seated && wants) { H.seated = false; H.sulk = BEACH.sulk; }
  H.idle = wants || !H.on ? 0 : H.idle + dt;
  if (!H.seated && H.idle > (H.boredAt || (H.boredAt = BEACH.bored[0] + Math.random() * BEACH.bored[1]))) { H.seated = true; H.boredAt = 0; }
  const running = !!dir && inRun() && !H.hide;
  let speed = H.hide ? LIGHT.shuffle : running ? MOVE.run : MOVE.walk;
  const pool = H.on === 'ground' && poolAt(H.x); if (pool) speed *= .6;
  H.moving = !!dir; H.shuffling = H.hide && !!dir; if (dir && !H.hide) H.face = dir;
  H.v = dir * speed;

  // --- walking, and steps too high to walk up ---
  let nx = clamp(H.x + H.v * dt, 30, L.rope + 24);
  const ahead = nx + Math.sign(H.v) * 8;
  if (H.v && groundY(ahead) < H.y - (H.on ? 14 : 4)) { nx = H.x; H.v = 0; if (H.on) hint('jump', 'SPACE: JUMP.', 2.5); }
  // a wall of the shed: through its tunnel, under the bucket, or not at all
  for (const { wall } of L.rooms) if (wall && !(H.hide && H.on && H.y > 420)) { if (H.x <= wall[0] - FIT) nx = Math.min(nx, wall[0] - FIT); else if (H.x >= wall[1] + FIT) nx = Math.max(nx, wall[1] + FIT); }
  if (H.x >= L.room + FIT) nx = Math.max(nx, L.room + FIT);                           // (out is out)
  H.x = nx; H.anim += dt * Math.abs(H.v) / (H.hide ? 7 : 14);

  // --- jumping and landing ---
  const floor = floorAt(H.x, H.y);
  if (H.on) {
    if (floor > H.y + 12) { H.on = null; H.vy = 0; } else H.y += (floor - H.y) * Math.min(1, dt * 20);
    if (input.jumpBuffer > 0 && !H.hide && H.on) { H.vy = -LIGHT.jump; H.on = null; H.rising = true; H.seated = false; input.jumpBuffer = 0; }
  } else {
    if (H.rising && !inJump()) { H.rising = false; if (H.vy < -MOVE.shortHop) H.vy = -MOVE.shortHop; }
    const prev = H.y; H.vy = Math.min(1000, H.vy + MOVE.gravity * dt); H.y += H.vy * dt;
    const f = floorAt(H.x, prev);
    if (H.vy > 0 && H.y >= f) {
      const hard = H.vy; H.y = f; H.vy = 0; H.on = 'ground';
      if (hard > 560) { playThud(); puff(H.x, f, 4, [P.grey2, P.slate], 30, 50); wake(LIGHT.gull.near); if (hard > 880) noise(H.x); }
    }
  }
  input.jumpBuffer = Math.max(0, input.jumpBuffer - dt);
  if (H.y > LIGHT.sea + 4) { H.phase = 'fell'; H.t = 0; H.hide = false; H.hintT = 0; playFall(); puff(H.x, LIGHT.sea, 18, [P.foam, P.aqua, P.mist], 170, 90); return; }

  // --- noises ---
  H.stepN = (H.stepN || 0) + dt * Math.abs(H.v);
  if (running && H.on && H.stepN > 46) { H.stepN = 0; playStep(.5); }
  if (running) wake(LIGHT.gull.run);
  if (pool && dir && (H.splashT -= dt) <= 0) { H.splashT = .7; noise(H.x, { size: 260 }); playWash(.15); puff(H.x, pool[2], 5, [P.aqua, P.mist], 70, 50); hint('pool', 'SPLASHING MAKES A NOISE. JUMP ACROSS.', 3.5); }

  // --- being seen ---
  H.danger = lit(); H.sheltered = behind();
  if (H.danger && !H.sheltered && !(H.hide && !H.shuffling)) { if (H.seen === 0) playSeen(); H.seen = Math.min(1, H.seen + dt / LIGHT.beam.seen); } else H.seen = Math.max(0, H.seen - dt * 1.4);
  if (H.seen >= 1) { caught(); return; }

  // --- where Ichigo has got to ---
  L.checkpoints.forEach((x, i) => { if (H.on && H.x > x && i > H.check && H.seen <= 0 && !tunnelAt(H.x)) H.check = i; });
  if (!H.chime && near(L.chime, 26) && Math.abs(H.y - 300) < 40) { H.chime = true; keepThing('chime'); S.newThing = true; playBell(); hint('chime', 'A WIND CHIME! TAB: LOOK AT IT.', 4); }
  tutor();
}
function tutor() {
  const L = S.level, b = beam(), r = insideAt(H.x);
  if (H.t > 1) hint('hide', 'HOLD DOWN ARROW: HIDE UNDER THE BUCKET.', 5);
  if (r && r.wall) {
    if (b.on && r.windows.some(w => Math.abs(w[0] - b.x) < r.reach)) hint('window', 'THE LIGHT COMES IN AT THE WINDOWS. KEEP OUT OF IT.', 5);
    if (L.shutters.some(q => near(q.x, 60) && !bolted(q.window))) hint('shutter', 'DOWN ARROW AT THE CORD: CLOSE THE SHUTTER.', 4);
    if (H.sleepers.some(g => g.kind === 'bottle' && !g.away && near(g.x, 110) && Math.abs(H.y - shelfUnder(g.x)) < 30)) hint('bottle', 'WALK PAST THE BOTTLES, OR THEY FALL.', 3.5);
    if (H.sleepers.some(g => g.kind === 'cat' && !g.away && near(g.x, 150))) hint('cat', 'A CAT ASLEEP BY THE FIRE. WALK.', 3.5);
    if (H.x > r.wall[0] - 140) hint('tunnel', 'A TUNNEL, AS HIGH AS THE BUCKET. HOLD DOWN ARROW AND GO THROUGH.', 5);
  } else {
    if (!r && b.on && Math.abs(b.x - H.x) < 480) hint('beam', 'HIDE UNDER THE BUCKET, OR BEHIND A ROCK.', 5);
    if (near(L.stones[0][0] - 90, 60)) hint('stones', 'STONES, ACROSS THE WATER. JUMP WHILE IT IS DARK.', 4.5);
    if (near(L.rooms.find(q => q.name === 'hull').from + 30, 70)) hint('hull', 'AN OLD WRECK. WALK IN THE DARK BETWEEN THE LIGHTS.', 5);
    if (H.cords.some(q => near(q.x, 60))) hint('cord', 'DOWN ARROW AT THE CORD: RING A BELL FAR AWAY. THE EYE WILL LOOK AT IT.', 5.5);
    if (H.sleepers.some(g => g.kind === 'gull' && !g.away && near(g.x, 130))) hint('gull', 'A GULL ASLEEP. WALK PAST IT.', 3.5);
    if (near(L.rope, 120)) hint('cut', 'CUT THE ROPE WHILE IT IS DARK. DOWN ARROW.', 6);
  }
}
// Running or landing near something asleep wakes it; near a bottle, knocks it down.
function wake(r) {
  for (const g of H.sleepers) {
    if (g.away || Math.abs(g.x - H.x) > (g.kind === 'bottle' ? r * .55 : r) || (g.kind === 'bottle' && Math.abs(H.y - shelfUnder(g.x)) > 26) || (g.kind === 'cat' && H.y < 380)) continue;
    const y = g.kind === 'bottle' ? shelfUnder(g.x) : surfaceY(g.x);
    g.away = g.kind === 'bottle' ? 1e9 : LIGHT.gull.back; g.t = 0;
    if (g.kind === 'gull') { playSquawk(); puff(g.x, y - 10, 6, [P.foam, P.grey0], 80, 70); }
    else if (g.kind === 'cat') { playMeow(); hint('meow', 'THE CAT IS AWAKE.', 2); }
    else { playSmash(); puff(g.x, 426, 10, [P.teal, P.aqua, P.white], 90, 60); }
    noise(g.x);
  }
}
export const shelfUnder = x => { const q = S.level.shelves.find(([a, b]) => x > a && x < b); return q ? q[2] : groundY(x); };
function use(act) {
  H.seated = false; if (Math.abs(act.x - H.x) > 4) H.face = Math.sign(act.x - H.x);
  if (act.do === 'shutter') { H.shut.add(act.window); H.digging = .25; playBolt(); }
  else if (act.do === 'cord') { act.cord.swing = 1; H.digging = .25; playBell(); noise(act.cord.bell, { hold: LIGHT.bell, wait: .25, size: 420 }); }
  else if (act.do === 'cut') {
    H.digging = .3; H.face = 1; playCut(); puff(S.level.rope, groundY(S.level.rope) - 14, 4, [P.gold, P.ochre], 50, 40);
    if (++H.cuts >= LIGHT.cuts) away(); else noise(S.level.rope, { wait: 1.1 });       // (it hears the rope, and comes to look)
  }
}

// ============================================================================
// Away
// ============================================================================
// The rope parts: the raft goes out from under the boathouse, and the eye comes to look at where it was.
function away() { H.phase = 'away'; H.t = 0; H.hide = false; H.hintT = 0; H.x = H.raftX; H.seated = true; H.moving = false; H.v = 0; H.seen = 0; H.stares = 0; playWash(.5); H.ear = { x: S.level.house - 40, hold: 3.4, wait: .7 }; }
function updateAway(dt) {
  H.raftX += Math.min(80, H.t * 60) * dt; H.x = H.raftX; H.face = H.t < 3 ? -1 : 1;
  if (H.t > 4.4) { H.phase = 'paddle'; H.t = 0; H.check = 'paddle'; H.eye = freshEye(); H.face = 1; }
}
function updatePaddle(dt, win) {
  const L = S.level;
  hint('paddle', 'RIGHT ARROW: PADDLE. HOLD DOWN ARROW: HIDE FROM THE LIGHT.', 6);
  if (L.stacks.some(([a]) => H.raftX > a - 260 && H.raftX < a)) hint('stack', 'THE LIGHT GOES BY ANYTHING BEHIND A ROCK.', 4);
  const was = H.hide; H.hide = H.phase === 'paddle' && inUse(); if (H.hide && !was) playClick(.6);
  H.paddling = H.phase === 'gone' || (inRight() && !H.hide);
  H.raftX += (H.paddling ? LIGHT.paddle : LIGHT.drift) * dt; H.x = H.raftX; H.face = 1; H.anim += dt * (H.paddling ? 1 : 0);
  if (H.paddling && (H.splashT -= dt) <= 0) { H.splashT = .75; playWash(.12); puff(H.raftX + 20, LIGHT.sea, 4, [P.aqua, P.mist], 40, 40); }
  if (H.phase === 'paddle') {
    H.danger = lit(); H.sheltered = behind();
    if (H.danger && !H.hide && !H.sheltered) { if (H.seen === 0) playSeen(); H.seen = Math.min(1, H.seen + dt / LIGHT.water.seen); } else H.seen = Math.max(0, H.seen - dt * 1.2);
    if (H.seen >= 1) { caught(); return; }
    if (H.raftX > L.lee) { H.phase = 'gone'; H.t = 0; H.hide = false; H.danger = false; H.hintT = 0; think('lighthouse', 3.4); learn('lighthouse'); }   // (out of its reach: the eye shuts, and Ichigo knows what it was)
  } else if (H.raftX > L.length + 90 && !H.done) { H.done = true; parts.length = 0; clearBubbles(); win(); }
}
