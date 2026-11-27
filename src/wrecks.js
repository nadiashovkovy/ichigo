// ============================================================================
// wrecks.js — Level 6, the Ship Graveyard. Old ships sunk on a reef that goes all the way round. The only way out is a
// gap low down in the reef, full of sand, and Ichigo (five, and just able to swim) has nothing to dig with.
//   • On a deck: ← → walk, Space jumps. Walking off an edge is a dive.
//   • In the water: arrow keys swim, any way (Shift: faster, but it uses breath faster). At the top of the water,
//     Space jumps out (onto a deck, if there's one there).
//   • Breath: a bubble over Ichigo, shrinking while they're under. Air is at the top of the sea, and trapped under the
//     keels of the ships (a little boat, upside down, has some too). Out of breath is a new tomorrow, at the last air.
//   • Eels live in the holes in the big ship's hold. One comes out, its eyes first, and pushes Ichigo back.
//   • A big old turtle swims ahead, from air to air, and waits.
//   • The whale's shoulder blade, on the bottom, is something to dig with (↓ to pick it up). ↓ at the sand digs it.
//   • Through the gap, the turtle takes Ichigo on her back.
// The map is a grid of letters in levels/level06.json (see TILES below). This file is how it plays; wrecksart.js draws
// it. Tuning is in WRECKS (config.js).
// ============================================================================
import { W, WRECKS, P, BEACH } from './config.js';
import { S, parts } from './state.js';
import { input, inLeft, inRight, inRun, inUse, inJump } from './input.js';
import { think, clearBubbles } from './bubbles.js';
import { showCards } from './cards.js';
import { updateParts } from './player.js';
import { learn, keepThing } from './save.js';
import { seaSound, playSplash, playThud, playDig, playClick, playSnap, playBubbles, playGasp, playFall } from './audio.js';

const START_CARDS = ['THE REEF GOES ALL THE WAY ROUND. THE ONLY WAY OUT IS A GAP AT THE BOTTOM, AND IT IS FULL OF SAND.', 'ICHIGO NEEDS SOMETHING TO DIG WITH.',
  "ICHIGO CAN SWIM NOW, BUT NOT FOR LONG. THERE IS AIR TRAPPED IN SOME OF THE SHIPS."];
const END_CARDS = ['THE TURTLE TAKES ICHIGO ON HER BACK, TO A LAGOON FULL OF KELP.'];

// The map's letters:
//   .  nothing: air above the sea, water below it      ,  water inside a ship      a  air trapped inside a ship
//   #  a ship's hull        =  its deck        o  a porthole (too small to get through)        r  rock        _  sand on the bottom
//   S  the sand in the gap (it can be dug)     v ^  an eel's hole, in a ceiling or a floor
//   I  where Ichigo starts     B  the whale's shoulder blade     T  a teacup     G  where the turtle waits, past the gap
const SOLID = new Set('#=ro_Sv^');

// Everything about the level as it plays out. (Exposed on window.ichigo.wrecks for the test bot.)
// phase: 'play' → 'ride' (on the turtle's back, at the end); 'over' (out of breath: a new tomorrow).
export const D = {};
const T = WRECKS.tile, clamp = (v, a, b) => Math.max(a, Math.min(b, v)), dist = (a, b, c, d) => Math.hypot(a - c, b - d);
export const SURFACE = 432;                                                        // the top of the sea (game units, on a whole pixel)
export const top0 = () => SURFACE - S.level.surface * T;                          // the top of the map's first row
export const mapW = () => S.level.map[0].length * T, mapH = () => top0() + S.level.map.length * T;
export const col = x => Math.floor(x / T), row = y => Math.floor((y - top0()) / T);
export const at = (c, r) => [c * T, top0() + r * T];                               // a map place (in letters), in game units
// The letter at a place (dug sand is water; past the edges is rock, above the top is sky).
export function tile(c, r) {
  const m = S.level.map; if (c < 0 || c >= m[0].length || r >= m.length) return 'r'; if (r < 0) return '.';
  const ch = m[r][c]; return ch === 'S' && D.dug && D.dug.has(c + ',' + r) ? ',' : ch;
}
export const solidAt = (c, r) => SOLID.has(tile(c, r));
export const waterAt = (c, r) => r >= S.level.surface && !solidAt(c, r) && tile(c, r) !== 'a';
const wet = (x, y) => waterAt(col(x), row(y));
const box = () => WRECKS.box[D.mode];
// Does a box (its middle at x, y; hw, hh half its width and height) overlap anything solid?
function blocked(x, y, hw, hh) {
  for (let r = row(y - hh); r <= row(y + hh - .01); r++) for (let c = col(x - hw); c <= col(x + hw - .01); c++) if (solidAt(c, r)) return true;
  return false;
}
// The top of the water over a place, if it's open to air above (or null: under a ceiling, or not in water).
export function waterline(x, y) {
  const c = col(x); let r = row(y);
  if (!waterAt(c, r)) return null;
  while (waterAt(c, r - 1)) r--;
  return SOLID.has(tile(c, r - 1)) ? null : top0() + r * T;
}
export const turtleAt = i => { const [c, r] = S.level.turtle[i]; return at(c, r); };
const sand = () => { const out = []; S.level.map.forEach((q, r) => [...q].forEach((ch, c) => { if (ch === 'S') out.push([c, r]); })); return out; };

// ============================================================================
// Starting, and starting again
// ============================================================================
export function startWrecks() {
  const m = S.level.map, find = ch => { for (let r = 0; r < m.length; r++) { const c = m[r].indexOf(ch); if (c >= 0) return [c, r]; } return null; };
  const [ic, ir] = find('I'), eels = [];
  m.forEach((q, r) => [...q].forEach((ch, c) => { if (ch === 'v' || ch === '^') eels.push({ c, r, dir: ch === 'v' ? 1 : -1, every: WRECKS.eel.every[eels.length % WRECKS.eel.every.length], t: eels.length * 1.3, hit: false }); }));
  const items = [['B', 'bone'], ['T', 'teacup']].map(([ch, kind]) => { const p = find(ch); if (!p) return null; const [x, y] = at(p[0] + .5, p[1] + 1); return { kind, x, y, taken: kind === 'teacup' && S.things.has('teacup') }; }).filter(Boolean);
  const [tx, ty] = turtleAt(0);
  Object.assign(D, {
    phase: 'play', t: 0, mode: 'deck', x: (ic + .5) * T, y: top0() + (ir + 1) * T - WRECKS.box.deck[1], vx: 0, vy: 0, face: 1, ground: true, anim: 0, moving: false, turn: 1,
    breath: 1, surfaced: false, stun: 0, hold: 0, digT: 0, digging: null, seated: false, idle: 0, boredAt: 0, sulk: 0, dived: false, exhale: 1,
    bone: false, open: false, dug: new Set(), sand: sand().length, eels, items, bubbles: [], hint: null, hintT: 0, hinted: new Set(), fade: S.cut ? 0 : 1, done: 0, ended: false,
    turtle: { x: tx + 300, y: ty + 40, i: 0, face: -1, anim: 0, seen: false }, camY: 0, check: null,
  });
  D.check = { x: D.x, y: D.y, mode: 'deck', turtle: 0 };
  S.noShovel = true;   // (the whale bone goes in the bucket once it's found)
  parts.length = 0; clearBubbles(); input.jumpBuffer = 0; input.usePressed = false;
  S.deaths = 0; S.levelT = 0; S.scene = 'deep'; S.sceneT = 0; S.camX = camFor()[0]; D.camY = camFor()[1];
  showCards(START_CARDS);
}
// A new tomorrow: at the last place there was air, with a full breath. (The sand dug stays dug, and the bone stays found.)
export function retryWrecks() {
  const c = D.check;
  Object.assign(D, { phase: 'play', t: 0, mode: c.mode, x: c.x, y: c.y, vx: 0, vy: 0, breath: 1, stun: 0, hold: 0, digT: 0, digging: null, ground: c.mode === 'deck', surfaced: c.mode === 'swim', fade: 1, seated: false, idle: 0 });
  const tt = D.turtle, i = Math.min(tt.i, c.turtle); [tt.x, tt.y] = turtleAt(i); tt.i = i;
  input.usePressed = false; input.jumpBuffer = 0; parts.length = 0; D.bubbles = []; clearBubbles();
  [S.camX, D.camY] = camFor();
}
function tomorrow() { S.deaths++; S.tomorrows++; S.scene = 'dawn'; S.sceneT = 0; }
export const camFor = () => [clamp(D.x - W * .45, 0, mapW() - W), clamp(D.y - 300, 0, mapH() - 540)];
function hint(id, text, time = 4.5) { if (!D.hinted.has(id) && D.hintT <= 0) { D.hinted.add(id); D.hint = text; D.hintT = time; } }
const puff = (x, y, n, cols, up = 80, wide = 90) => { for (let i = 0; i < n; i++) parts.push({ x: x + (Math.random() - .5) * 16, y, vx: (Math.random() - .5) * wide * 2, vy: -up * (.4 + Math.random()), life: .4 + Math.random() * .45, c: cols[i % cols.length], s: Math.random() < .4 ? 2 : 1 }); };
const WET = [P.foam, P.aqua, P.mist], SAND = [P.sky, P.tan, P.tanD];
const bubble = (x, y, n = 1) => { for (let i = 0; i < n; i++) D.bubbles.push({ x: x + (Math.random() - .5) * 10, y: y - Math.random() * 6, s: Math.random() < .35 ? 2 : 1, t: 0, ph: Math.random() * 6 }); };

// ============================================================================
// Every frame
// ============================================================================
export function updateWrecks(dt, win) {
  D.t += dt; S.levelT += dt; if (D.hintT > 0) D.hintT -= dt;
  D.fade = Math.max(0, D.fade - dt * 1.6); D.sulk = Math.max(0, D.sulk - dt); D.stun = Math.max(0, D.stun - dt); D.hold = Math.max(0, D.hold - dt);
  updateEels(dt);
  if (D.phase === 'play') { updateIchigo(dt); updateTurtle(dt); }
  else if (D.phase === 'ride') updateRide(dt, win);
  else if (D.phase === 'over') { D.vy += (-20 - D.vy) * Math.min(1, dt * 2); D.y += D.vy * dt; if (Math.random() < dt * 6) bubble(D.x, D.y - 10); if (D.t > 1.6) { tomorrow(); return; } }
  for (const b of D.bubbles) { b.t += dt; b.y -= (50 + b.s * 20) * dt; b.x += Math.sin(b.t * 5 + b.ph) * 12 * dt; const wl = waterline(b.x, b.y); if (!wet(b.x, b.y) || (wl !== null && b.y < wl + 2)) b.gone = true; }
  D.bubbles = D.bubbles.filter(b => !b.gone && b.t < 6);
  updateParts(dt);
  input.usePressed = false;
  const [cx, cy] = camFor(); S.camX += (cx - S.camX) * Math.min(1, dt * 5); D.camY += (cy - D.camY) * Math.min(1, dt * 5);
  const under = D.mode === 'swim' && !D.surfaced && D.phase !== 'ride';
  seaSound(under ? .12 : .3 * Math.max(0, 1 - D.camY / 300) + .08);   // (under the water, the sea is far away)
}

// What ↓ would do where Ichigo is: { do: 'take', item } or { do: 'dig', c, r } (or 'nothing', with no bone yet), or null.
export function action() {
  if (D.phase !== 'play' || D.stun > 0) return null;
  for (const it of D.items) if (!it.taken && dist(D.x, D.y, it.x, it.y - 10) < 40) return { do: 'take', item: it };
  const s = sandNear(); if (s) return D.bone ? { do: 'dig', c: s[0], r: s[1] } : { do: 'nothing', c: s[0], r: s[1] };
  return null;
}
// The sand Ichigo can reach: any touching them, or nearly (the nearest, and what's in front before what's behind).
function sandNear() {
  const [hw, hh] = box(), f = D.face, reach = 8; let best = null, bd = 1e9;
  for (let r = row(D.y - hh - reach); r <= row(D.y + hh + reach); r++) for (let c = col(D.x - hw - reach); c <= col(D.x + hw + reach); c++) {
    if (tile(c, r) !== 'S') continue;
    const [x, y] = at(c + .5, r + .5), d = Math.hypot(Math.max(0, Math.abs(x - D.x) - hw - T / 2), Math.max(0, Math.abs(y - D.y) - hh - T / 2)) + (Math.sign(x - D.x) === -f ? 20 : 0);
    if (d <= reach + 20 && d < bd) { bd = d; best = [c, r]; }
  }
  return best;
}

function updateIchigo(dt) {
  const act = action(), dirX = D.stun > 0 || D.hold > 0 ? 0 : (inRight() ? 1 : 0) - (inLeft() ? 1 : 0);
  // ↓: pick something up, or dig
  if (act && act.do === 'take' && input.usePressed) take(act.item);
  const digging = act && act.do === 'dig' && inUse();
  if (act && act.do === 'nothing' && inUse()) hint('notool', 'ICHIGO NEEDS SOMETHING TO DIG WITH.', 3.5);
  if (digging) {
    D.digging = [act.c, act.r]; D.digT += dt; D.face = Math.sign((act.c + .5) * T - D.x) || D.face;
    if (Math.floor(D.digT / .3) !== Math.floor((D.digT - dt) / .3)) { playDig(); const [x, y] = at(act.c + .5, act.r + .5); for (let i = 0; i < 3; i++) parts.push({ x: x - D.face * 10, y, vx: -D.face * (30 + Math.random() * 60), vy: -40 - Math.random() * 40, life: .5, c: SAND[i], s: 1 }); }
    if (D.digT >= WRECKS.dig) { D.dug.add(act.c + ',' + act.r); D.digT = 0; D.digging = null; D.changed = [act.c, act.r]; playThud(); if (D.dug.size >= D.sand) { D.open = true; hint('open', 'THE GAP IS OPEN.', 3); playClick(1.2); } }
  } else { D.digT = 0; D.digging = null; }

  if (D.mode === 'deck') deck(dt, dirX); else swim(dt, dirX, digging);
  input.jumpBuffer = Math.max(0, input.jumpBuffer - dt);

  // breath: it fills in the air, and goes under the water (faster swimming fast)
  const inAir = D.mode === 'deck' || D.surfaced;
  if (inAir) {
    if (!D.wasAir && D.breath < .6 && D.mode === 'swim') playGasp();
    D.breath = Math.min(1, D.breath + dt / WRECKS.refill);
    if ((D.mode === 'deck' && D.ground) || D.surfaced) D.check = { x: D.x, y: D.y, mode: D.mode, turtle: D.turtle.i };
    if (D.surfaced && row(D.y) > S.level.surface && D.dived) hint('pocket', 'AIR, TRAPPED UNDER THE SHIP.', 3);
  } else {
    D.breath -= dt / WRECKS.breath * (inRun() && D.moving ? WRECKS.fastBreath : 1);
    if ((D.exhale -= dt * (D.breath < .3 ? 2.5 : 1)) <= 0) { D.exhale = 1 + Math.random(); bubble(D.x + D.face * 14, D.y - 8, 2 + (D.breath < .3 ? 2 : 0)); playBubbles(.4); }
    if (D.breath < .55) hint('breath', "THE BUBBLE IS ICHIGO'S BREATH. FIND AIR BEFORE IT IS GONE.", 4.5);
    if (D.breath <= 0) { over(); return; }
  }
  D.wasAir = inAir;
  // the end: through the gap, to the turtle
  const tt = D.turtle;
  if (D.open && tt.i === S.level.turtle.length - 1 && dist(D.x, D.y, tt.x, tt.y) < 70) { D.phase = 'ride'; D.t = 0; D.done = 0; D.hintT = 0; playSplash(); }
}
function over() { D.phase = 'over'; D.t = 0; D.vy = 0; D.hintT = 0; playFall(); bubble(D.x, D.y - 10, 8); }
function take(it) {
  it.taken = true; keepThing(it.kind); S.newThing = true; playClick(1.6); D.hintT = 0;
  if (it.kind === 'bone') { D.bone = true; S.noShovel = false; D.hold = 1.8; D.vx = D.vy = 0; hint('bone', "A WHALE'S SHOULDER BLADE. IT WILL DO FOR DIGGING.", 4.5); }
  else hint('cup', 'A TEACUP! TAB: LOOK AT IT.', 4);
}

// On a deck, or in the air over one.
function deck(dt, dir) {
  const Q = WRECKS, wants = dir || inUse() || input.jumpBuffer > 0;
  if (D.seated && wants) { D.seated = false; D.sulk = BEACH.sulk; }
  D.idle = wants || !D.ground ? 0 : D.idle + dt;
  if (!D.seated && D.idle > (D.boredAt || (D.boredAt = BEACH.bored[0] + Math.random() * BEACH.bored[1]))) { D.seated = true; D.boredAt = 0; }
  if (D.seated) dir = 0;
  if (dir) D.face = dir;
  const want = dir * (inRun() ? Q.run : Q.walk);
  if (dir) D.vx += Math.sign(want - D.vx) * Math.min(Math.abs(want - D.vx), Q.accel * (D.ground ? 1 : .7) * dt); else if (D.ground) D.vx -= Math.sign(D.vx) * Math.min(Math.abs(D.vx), Q.stop * dt);
  if (D.ground && input.jumpBuffer > 0 && !D.seated) { D.vy = -Q.jump; D.ground = false; D.hop = true; input.jumpBuffer = 0; }
  if (D.hop && D.vy < 0 && !inJump()) D.vy = Math.max(D.vy, -260);                 // (a short hop, if the key's let go: not climbing out of the water)
  D.vy += Q.gravity * dt;
  const hit = move(D.vx * dt, D.vy * dt);
  if (hit.y) { if (D.vy > 0) { if (!D.ground && D.vy > 300) playThud(); D.ground = true; D.hop = false; } D.vy = 0; } else D.ground = blocked(D.x, D.y + 1, ...box());
  if (hit.x) D.vx = 0;
  D.moving = !!dir && D.ground; D.anim += dt * Math.abs(D.vx) / 14;
  if (wet(D.x, D.y)) {   // into the water
    D.mode = 'swim'; fit(); D.vy *= .3; D.vx *= .5; D.ground = false; D.seated = false; D.dived = true; D.turn = 2;
    playSplash(); puff(D.x, SURFACE, 14, WET, 160, 90); bubble(D.x, D.y, 6);
    hint('swim', 'ARROW KEYS: SWIM.', 4);
  }
}
// In the water.
function swim(dt, dirX, digging) {
  const Q = WRECKS, dirY = D.stun > 0 || D.hold > 0 || digging ? 0 : (inUse() ? 1 : 0) - (inJump() ? 1 : 0), dx = digging ? 0 : dirX;
  const sp = Q.swim * (inRun() ? Q.fast : 1), n = Math.hypot(dx, dirY);
  const tvx = n ? dx / n * sp : 0, tvy = n ? dirY / n * sp : -Q.float * (D.hold > 0 ? 0 : 1);
  const k = Math.min(1, dt * (D.stun > 0 ? .8 : Q.pull));
  D.vx += (tvx - D.vx) * k; D.vy += (tvy - D.vy) * k;
  if (dx) D.face = dx;
  const hit = move(D.vx * dt, D.vy * dt);
  if (hit.x) { if (porthole()) hint('porthole', 'THE PORTHOLE IS TOO SMALL FOR ICHIGO. THE WAY ROUND IS LONGER.', 4); D.vx *= .2; }
  if (hit.y) D.vy *= .2;
  // at the top of the water: floating, with their head out
  const wl = waterline(D.x, D.y);
  D.surfaced = wl !== null && D.y - wl < 16;
  if (wl !== null && D.y < wl + 2) { D.y = wl + 2; if (D.vy < 0) D.vy = 0; }
  if (D.surfaced && input.jumpBuffer > 0 && D.hold <= 0) { D.mode = 'deck'; D.hop = false; D.vy = -Q.climb; D.ground = false; input.jumpBuffer = 0; playSplash(); puff(D.x, D.y, 10, WET, 140, 70); return; }
  if (D.surfaced && D.dived && near(Q.climb)) hint('climb', 'SPACE: CLIMB OUT.', 3.5);
  D.moving = !!(dx || dirY); D.anim += dt * (D.moving ? 1 : .35);
  // which way the swimmer points: up, down, or along
  if (D.moving) D.turn = Math.abs(D.vy) > Math.abs(D.vx) * 1.4 ? (D.vy < 0 ? 0 : 2) : 1;
  else if (!D.surfaced) D.turn = 1;
  if (!wet(D.x, D.y)) { D.mode = 'deck'; fit(); }
}
// Is there a deck near enough to climb out onto?
function near(jump) {
  const reach = jump * jump / (2 * WRECKS.gravity);
  for (const s of [-1, 1]) for (let d = 10; d < 70; d += 10) { const c = col(D.x + s * d), r = row(D.y - reach); for (let rr = r; rr <= row(D.y) - 1; rr++) if (solidAt(c, rr) && !solidAt(c, rr - 1) && !solidAt(c, rr - 2)) return true; }
  return false;
}
const porthole = () => { const [hw, hh] = box(); for (const s of [-1, 1]) for (const y of [D.y - hh + 2, D.y, D.y + hh - 2]) if (tile(col(D.x + s * (hw + 3)), row(y)) === 'o') return true; return false; };
// Move by dx, dy, a little at a time, stopping flush at anything solid.
function move(dx, dy) {
  const [hw, hh] = box(), n = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 4));
  let hx = false, hy = false;
  for (let i = 0; i < n; i++) {
    if (!hx) { const nx = D.x + dx / n; if (blocked(nx, D.y, hw, hh)) { hx = true; for (let s = Math.sign(dx); !blocked(D.x + s, D.y, hw, hh) && Math.abs(s) < 5; s += Math.sign(dx)) D.x += Math.sign(dx); } else D.x = nx; }
    if (!hy) { const ny = D.y + dy / n; if (blocked(D.x, ny, hw, hh)) { hy = true; for (let s = Math.sign(dy); !blocked(D.x, D.y + Math.sign(dy), hw, hh) && Math.abs(s) < 5; s += Math.sign(dy)) D.y += Math.sign(dy); } else D.y = ny; }
  }
  return { x: hx, y: hy };
}
// After changing shape (standing ↔ swimming), step out of anything it now overlaps.
function fit() {
  const [hw, hh] = box(); if (!blocked(D.x, D.y, hw, hh)) return;
  for (let d = 1; d < 30; d++) for (const [ox, oy] of [[d, 0], [-d, 0], [0, -d], [0, d]]) if (!blocked(D.x + ox, D.y + oy, hw, hh)) { D.x += ox; D.y += oy; return; }
}

// ============================================================================
// The eels: each in its hole, coming out on its own clock. (Not while the turtle is going by.)
// ============================================================================
export const eelOut = e => { const E = WRECKS.eel, u = e.t - E.warn; return u < 0 ? 0 : u < .18 ? u / .18 : u < E.out - .18 ? 1 : u < E.out ? (E.out - u) / .18 : 0; };
export const eelWarn = e => e.t < WRECKS.eel.warn && !e.still;
const EEL_LONG = 3.2;   // how far out an eel reaches, in letters of the map
export function eelBox(e) { const k = eelOut(e), [x] = at(e.c, e.r), y = e.dir > 0 ? top0() + (e.r + 1) * T : top0() + e.r * T, len = EEL_LONG * T * k; return { x0: x + 5, x1: x + T - 5, y0: e.dir > 0 ? y : y - len, y1: e.dir > 0 ? y + len : y }; }
function updateEels(dt) {
  const [hw, hh] = box();
  for (const e of D.eels) {
    const [ex, ey] = at(e.c + .5, e.r + .5);
    e.still = e.t < .05 && dist(D.turtle.x, D.turtle.y, ex, ey) < 110; if (e.still) continue;      // (they stay in while she's near)
    e.t += dt; if (e.t > e.every) { e.t -= e.every; e.hit = false; }
    if (eelOut(e) > .3 && !e.hit && D.phase === 'play') {
      const b = eelBox(e);
      if (D.x + hw > b.x0 && D.x - hw < b.x1 && D.y + hh > b.y0 && D.y - hh < b.y1) {
        e.hit = true; const s = Math.sign(D.x - ex) || -D.face; D.vx = s * WRECKS.eel.push; D.vy = e.dir * 70; D.stun = .5; D.breath = Math.max(.02, D.breath - WRECKS.eel.cost);
        playSnap(); bubble(D.x, D.y, 6); hint('eel', 'AN EEL. WAIT FOR IT TO GO BACK IN, THEN GO PAST.', 4);
      }
    }
  }
}

// ============================================================================
// The turtle: on to the next place when Ichigo is near (or ahead of her), and waiting at the whale and the gap.
// ============================================================================
function updateTurtle(dt) {
  const tt = D.turtle, L = S.level.turtle, [gx, gy] = turtleAt(tt.i), d = dist(tt.x, tt.y, gx, gy);
  // (left behind, she hurries along her way to catch up: Ichigo is nearer a place further on than the one she's going to)
  let ahead = 0; L.forEach((_, j) => { const [x, y] = turtleAt(j); if (j > tt.i + 1 && dist(D.x, D.y, x, y) < dist(D.x, D.y, gx, gy) - 60 && dist(D.x, D.y, x, y) < 260) ahead = j; });
  const sp = WRECKS.turtle.speed * (ahead ? 3 : 1);
  if (d > 2) { const k = Math.min(1, sp * dt / d); tt.x += (gx - tt.x) * k; tt.y += (gy - tt.y) * k; if (Math.abs(gx - tt.x) > 3) tt.face = Math.sign(gx - tt.x); tt.anim += dt * 2.2; }
  else { tt.anim += dt * .8; tt.y += Math.sin(D.t * 1.3) * 3 * dt; }
  if (!tt.seen && D.dived && dist(D.x, D.y, tt.x, tt.y) < 320) { tt.seen = true; hint('turtle', 'A TURTLE. SHE IS WAITING.', 3.5); }
  if (tt.i >= L.length - 1 || d > 6) return;
  const wait = (S.level.waits || []).find(([i]) => i === tt.i);
  if (wait && ((wait[1] === 'bone' && !D.bone) || (wait[1] === 'gap' && !D.open))) return;
  const [nx, ny] = turtleAt(tt.i + 1);
  if (ahead || dist(D.x, D.y, tt.x, tt.y) < WRECKS.turtle.near || dist(D.x, D.y, nx, ny) < dist(tt.x, tt.y, nx, ny) - 40) tt.i++;
}

// ============================================================================
// The end: on her back, up into the light.
// ============================================================================
function updateRide(dt, win) {
  const tt = D.turtle, up = Math.min(1, D.t / 3.2);
  tt.face = 1; tt.anim += dt * 2;
  tt.y += ((SURFACE + 14) - tt.y) * Math.min(1, dt * (.4 + up)); tt.x += (12 + 14 * up) * dt;
  D.x = tt.x - 4; D.y = tt.y - 30; D.face = 1; D.mode = 'swim'; D.surfaced = true; D.breath = Math.min(1, D.breath + dt);
  if (D.t > 2.6 && !D.done) { D.done = 1; think('turtle', 3.2); learn('turtle'); }
  if (D.t > 6.4 && D.done === 1) { D.done = 2; showCards(END_CARDS); }
  if (D.t > 7.2 && D.done === 2 && !D.ended) { D.ended = true; parts.length = 0; clearBubbles(); win(); }
}

// ============================================================================
// What to do now: { text, x, y: where to point (or none), ok, warn }, or null.
// ============================================================================
export function prompt() {
  if (D.phase !== 'play') return null;
  const act = action();
  if (D.mode === 'deck' && !D.dived) { const edge = S.level.map[S.level.surface - 1].indexOf('.', 1); return { text: 'WALK OFF THE EDGE: DIVE. ->', x: (edge + .5) * T, y: SURFACE - 30 }; }
  if (act && act.do === 'take') return { text: act.item.kind === 'bone' ? 'DOWN ARROW: PICK IT UP.' : 'DOWN ARROW: TAKE IT.', x: act.item.x, y: act.item.y - 30 };
  if (D.digging) return { text: 'DIGGING.', ok: true };
  if (act && act.do === 'dig') return { text: 'HOLD DOWN ARROW: DIG.', x: (act.c + .5) * T, y: top0() + act.r * T - 10 };
  if (D.mode === 'swim' && !D.surfaced && D.breath < .3) return { text: 'NEARLY OUT OF BREATH! FIND AIR.', warn: true };
  if (D.open && D.turtle.i >= S.level.turtle.length - 2) return { text: 'THE GAP IS OPEN. SWIM THROUGH. ->' };
  return null;
}
// How far through the level Ichigo is (0..1), for the HUD.
export function progress() {
  if (D.phase === 'ride') return 1;
  return Math.min(.96, .7 * Math.min(1, D.x / ((S.level.map[0].length - 20) * T)) + (D.bone ? .1 : 0) + .16 * (D.dug ? D.dug.size / Math.max(1, D.sand) : 0));
}
