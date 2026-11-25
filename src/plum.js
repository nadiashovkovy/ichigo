// ============================================================================
// plum.js — Level 3, The Sleepy Island (the Odyssey's lotus-eaters): a warm island of plum trees, and a
// few people who came here by boat a long time ago and never left. Ichigo is four. There's a raft in the
// reeds, but it has no rope, no paddle and no sail, and the people asleep on the island are lying on them.
//   • Ichigo is hungry. Plums are everywhere and fill them up at once, but make them sleepy: that wears
//     off slowly, and three at once put them to sleep (a new tomorrow). Clams and oranges are only food.
//   • Running under the trees shakes plums down on Ichigo's head (and they spill what they're carrying).
//   • Empty hammocks are bouncy (jump as they land, and Ichigo goes higher), and the treetops can be walked on.
//     A blanket that would do for a sail is up in one, and a kite in another. Wasps fly between them.
//   • The fisherman sleeps in a hammock with a good rope. Water doesn't wake him (he thinks it's rain), but he
//     used to catch crabs, and he'd like to see one.
//   • The old sailor sleeps on his paddle. Cold sea water wakes him, if it keeps coming.
// This file is how it plays; plumart.js draws it. Where things are is in levels/level03.json, and the
// tuning is PLUM in config.js. Positions are in game units, as everywhere.
// ============================================================================
import { W, MOVE, BEACH, PLUM, P } from './config.js';
import { S, parts } from './state.js';
import { input, inLeft, inRight, inRun, inUse, inJump } from './input.js';
import { hsh } from './art.js';
import { say, hush, clearBubbles } from './bubbles.js';
import { showCards } from './cards.js';
import { updateParts } from './player.js';
import { learnWord, keepThing } from './save.js';
import { seaSound, playWash, playScoop, playPour, playDig, playClick, playMunch, playRustle, playThud, playGrowl, playYawn, playSplash, playSnore, playBoing, playSting, cicadas } from './audio.js';

const INTRO_CARDS = [
  'ICHIGO IS FOUR NOW.',
  "THE BIG ISLAND HAS PLUM TREES, AND A FEW PEOPLE WHO ARRIVED HERE BY BOAT A LONG TIME AGO. THEY DON'T DO MUCH.",
  'THERE IS A RAFT IN THE REEDS AT THE FAR END. IT NEEDS A ROPE, A PADDLE AND A SAIL. FIND THEM.',
  'ICHIGO IS HUNGRY. DOWN ARROW: PICK UP, DIG, EAT.',
];
const parts3 = () => [['rope', M.rope === 'kept'], ['paddle', M.paddle], ['blanket', M.blanket]];   // what the raft needs, and whether Ichigo has it
export const raftNeeds = parts3;
// What it still needs, in words.
const stillNeeds = () => { const no = parts3().filter(([, got]) => !got).map(([id]) => 'A ' + (id === 'blanket' ? 'SAIL' : id.toUpperCase())); return no.length > 1 ? no.slice(0, -1).join(', ') + ' AND ' + no[no.length - 1] : no[0]; };
const END_CARDS = ['ICHIGO PUSHES THE RAFT OUT. THE CURRENT TAKES IT EAST.', 'BY NIGHT THERE IS A LIGHTHOUSE AHEAD.'];

// Everything about the level as it plays out. (Exposed on window.ichigo.plum for the test bot.)
// phase: 'play' → 'asleep' (three plums, or too hungry: a new tomorrow) or 'leave' (on the raft, drifting off).
export const M = {};
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const near = (x, r = PLUM.reach) => Math.abs(M.x - x) < r;

// The island's ground: its height (y) at x, smoothly through the points in the level's data.
export function groundY(x) {
  const G = S.level.ground;
  let i = 1; while (i < G.length - 1 && G[i][0] < x) i++;
  const [x0, y0] = G[i - 1], [x1, y1] = G[i], k = clamp((x - x0) / (x1 - x0), 0, 1), e = k * k * (3 - 2 * k);
  return y0 + (y1 - y0) * (e * .6 + k * .4);
}
export const seaAt = x => PLUM.sea + Math.sin(x * .02 - S.T * 1.3) * 2.6 + Math.sin(x * .007 + S.T * .7) * 1.6;   // the sea's surface
const depthAt = x => groundY(x) - PLUM.sea;
const atWater = () => M.x <= S.level.water[0] + 14 || M.x >= S.level.water[1] - 14;
const treeOver = x => S.level.trees.find(([tx, s]) => Math.abs(x - tx) < PLUM.drop.under * s);

// The treetops: each tree's three lumps of leaves (the same ones plumart.js draws), as ellipses in game
// units: [middle x, middle y, half width, half height].
const PX = 4 / 3;
export function lumps(tx, s, orange = false) {
  const lean = (hsh(tx) - .5) * 14 * .4, y = groundY(tx), list = orange ? [[-16, -60, 20, 16], [17, -62, 20, 16], [0, -76, 24, 17]] : [[-24, -72, 21, 13], [25, -74, 21, 13], [lean / s, -88, 27, 16]];
  return list.map(([dx, dy, rx, ry]) => [tx + dx * s * PX, y + dy * s * PX, rx * s * PX * 1.06, ry * s * PX * 1.06]);
}
// The top of the leaves at x: [its height (y), its tree], or null.
function leavesAt(x) {
  let best = null;
  for (const t of [...S.level.trees, [S.level.orange, 1, true]]) {
    if (Math.abs(x - t[0]) > 80 * t[1]) continue;
    for (const [cx, cy, rx, ry] of lumps(t[0], t[1], t[2])) { const d = (x - cx) / rx; if (Math.abs(d) < .97) { const y = cy - ry * Math.sqrt(1 - d * d); if (!best || y < best[0]) best = [y, t]; } }
  }
  return best;
}

// ============================================================================
// Starting, and starting again
// ============================================================================
export function startPlum() {
  Object.assign(M, {
    phase: 'play', t: 0, x: S.level.start, y: 0, v: 0, vy: 0, on: 'ground', sag: 0, row: 0, pressed: 0, push: 0, dents: {}, face: 1, anim: 0, air: false, moving: false, seated: false, idle: 0, boredAt: 0, sulk: 0,
    belly: PLUM.first, shown: PLUM.first, sleep: 0, wear: 0, dim: 0, growlT: 0, empty: 0, safe: 0, bonk: 0, yawn: 0, blink: 0, eating: 0,
    bucket: null, water: 0, pouring: 0, digT: 0, digging: 0,   // bucket: null, 'water' (and how much, 0..3) or 'crab'
    plums: [], rustle: [], dropT: 2, runT: .4, oranges: [], ripe: 3, shaken: 0, regrow: 0, shakeT: 0,
    clams: S.level.clams.map(([a, b], i) => ({ a, b, x: a + (b - a) * .5, t: i * 2 })), crabs: S.level.crabs.map(([a, b], i) => ({ a, b, x: (a + b) / 2, dir: i ? 1 : -1, t: i, hide: 0 })),
    woman: 'asleep', womanT: 0, refused: false,
    fisher: 'asleep', fisherT: 0, gave: false, thanked: false, rope: 'tied',                 // rope: 'tied' → 'lying' → 'kept'
    sailor: 'asleep', awake: 0, splashes: 0, sailorT: 0, paddle: false,
    blanket: false, kite: S.things.has('kite'), wasps: S.level.wasps.map(([x, y, rx, ry], i) => ({ x, y, rx, ry, t: i * 1.7, px: x, py: y })),
    seenRaft: false, raftX: S.level.raft, hint: null, hintT: 0, hinted: new Set(), snoreT: 2, mutterT: 1, done: false,
  });
  M.y = groundY(M.x);
  parts.length = 0; clearBubbles(); input.jumpBuffer = 0; input.usePressed = false;
  S.deaths = 0; S.levelT = 0; S.camX = 0; S.scene = 'plum'; S.sceneT = 0;
  showCards(INTRO_CARDS);
}
// A new tomorrow (called while the dawn print covers the screen): Ichigo wakes on the shore. What they've found they keep.
export function retryPlum() {
  Object.assign(M, { phase: 'play', t: 0, x: S.level.start, v: 0, vy: 0, on: 'ground', sag: 0, row: 0, push: 0, face: 1, air: false, moving: false, seated: false, idle: 0, sulk: 0, belly: PLUM.first, shown: PLUM.first, sleep: 0, wear: 0, dim: 0, empty: 0, bonk: 0,
    safe: 2, yawn: 0, eating: 0, bucket: null, water: 0, pouring: 0, digT: 0, digging: 0, plums: [], rustle: [], dropT: 3 });
  M.y = groundY(M.x); S.camX = 0; parts.length = 0; clearBubbles(); input.usePressed = false;
  if (M.sailor !== 'up') { M.sailor = 'asleep'; M.awake = 0; M.splashes = 0; }
}
function tomorrow() { S.deaths++; S.tomorrows++; S.scene = 'dawn'; S.sceneT = 0; }
function hint(id, text, time = 4.5) { if (!M.hinted.has(id) && M.hintT <= 0) { M.hinted.add(id); M.hint = text; M.hintT = time; } }
const puff = (x, y, n, cols, up = 80, wide = 90) => { for (let i = 0; i < n; i++) parts.push({ x: x + (Math.random() - .5) * 12, y, vx: (Math.random() - .5) * wide * 2, vy: -up * (.4 + Math.random()), life: .35 + Math.random() * .35, c: cols[i % cols.length], s: Math.random() < .3 ? 2 : 1 }); };

// ============================================================================
// Every frame
// ============================================================================
export function updatePlum(dt, win) {
  M.t += dt; S.levelT += dt;
  if (M.hintT > 0) M.hintT -= dt;
  M.shown += (M.belly - M.shown) * Math.min(1, dt * 6); M.dim += (M.sleep - M.dim) * Math.min(1, dt * 1.5);
  M.safe = Math.max(0, M.safe - dt); if (M.yawn > .8 && M.yawn - dt <= .8) playYawn();
  M.yawn = Math.max(0, M.yawn - dt); M.eating = Math.max(0, M.eating - dt); M.bonk = Math.max(0, M.bonk - dt); M.shakeT = Math.max(0, M.shakeT - dt);

  if (M.phase === 'asleep') { if (M.t > 2.6) { tomorrow(); return; } }
  if (M.phase === 'leave') leave(dt, win);
  updateBelly(dt); updateWasps(dt); updatePlums(dt); updateShore(dt); updateSleepers(dt); updateIchigo(dt); updateParts(dt);
  input.usePressed = false;

  S.camX += (clamp(M.phase === 'leave' ? S.level.length - W : M.x - W * .42, 0, S.level.length - W) - S.camX) * Math.min(1, dt * 4.5);
  seaSound(.12 + .3 * Math.max(0, 1 - Math.min(Math.abs(M.x - S.level.water[0]), Math.abs(M.x - S.level.water[1])) / 420));
  cicadas(clamp((M.x - 400) / 300, 0, 1) * clamp((2350 - M.x) / 300, 0, 1));
}

// --- hunger, and sleepiness ---
function updateBelly(dt) {
  if (M.phase !== 'play') return;
  M.belly = Math.max(0, M.belly - dt / PLUM.hungry);
  if (M.belly < PLUM.growl && (M.growlT -= dt) <= 0) { M.growlT = 6; playGrowl(); hint('hungry', 'ICHIGO IS HUNGRY. CLAMS AND ORANGES ARE SAFE TO EAT.'); }
  // empty: too weak to run; and after long enough, Ichigo lies down
  M.empty = M.belly <= 0 ? M.empty + dt : 0;
  if (M.empty > .5) hint('weak', 'TOO HUNGRY TO RUN. EAT SOMETHING.', 4);
  if (M.empty > PLUM.starving) fallAsleep();
  // a plum's sleepiness wears off, one plum at a time
  if (M.sleep > 0 && (M.wear -= dt) <= 0) { M.sleep--; M.wear = PLUM.wears; }
}
function fallAsleep() { M.phase = 'asleep'; M.t = 0; M.hintT = 0; M.seated = true; M.v = 0; M.moving = false; M.bucket = null; M.water = 0; M.digT = 0; playSnore(); }
function eat(food) {
  M.eating = .7; M.seated = false; M.empty = 0; playMunch();
  puff(M.x + M.face * 8, M.y - 34, 7, food === 'plum' ? [P.plum, P.rosewood, P.violet] : food === 'orange' ? [P.dawn, P.gold] : [P.foam, P.pink], 60, 50);
  M.belly = Math.min(1, M.belly + PLUM.eat[food]);
  if (food !== 'plum') return;
  if (!M.sleep) M.wear = PLUM.wears;
  M.sleep++; M.yawn = 1.3;
  if (M.sleep >= PLUM.asleep) fallAsleep();
  else if (M.sleep === 1) hint('sleepy', 'PLUMS MAKE ICHIGO SLEEPY. IT WEARS OFF AFTER A WHILE.', 5);
  else hint('third', 'ONE MORE PLUM NOW, AND ICHIGO FALLS ASLEEP.', 5);
}

// --- the plums ---
function updatePlums(dt) {
  const D = PLUM.drop, tree = M.on !== 'leaves' && M.y > groundY(M.x) - 60 ? treeOver(M.x) : null;
  const low = M.on === 'ground' || (!M.on && M.y > groundY(M.x) - 60);
  if (M.phase === 'play' && low) {   // now and then one falls from the tree Ichigo is under; running shakes them down in the next one along
    const running = Math.abs(M.v) > 220, ahead = M.x + M.v * (D.warn + .38) + (Math.random() - .5) * 20, next = running && treeOver(ahead);
    if (tree && !running) M.dropT -= dt;
    M.runT = running ? M.runT - dt : Math.max(M.runT, .25);
    let x = null, t = tree;
    if (next && M.runT <= 0) { x = ahead; t = next; M.runT = D.run[0] + Math.random() * D.run[1]; }   // (it lands where Ichigo will be, if they keep running: slow down when the leaves rustle)
    else if (tree && M.dropT <= 0) { x = tree[0] + (Math.random() * 2 - 1) * (D.under * tree[1] - 8); M.dropT = D.walk[0] + Math.random() * D.walk[1]; }
    if (x !== null) { M.rustle.push({ x, t: D.warn, tree: t }); playRustle(); }
  }
  for (const r of M.rustle) {
    r.t -= dt; if (Math.random() < .4) parts.push({ x: r.x + (Math.random() - .5) * 26, y: groundY(r.x) - 96 * r.tree[1], vx: (Math.random() - .5) * 30, vy: 10 + Math.random() * 30, life: .6, c: Math.random() < .5 ? P.leaf : P.pine });
    if (r.t <= 0) M.plums.push({ x: r.x, y: groundY(r.x) - 92 * r.tree[1], v: 0, lying: false, t: 0 });
  }
  M.rustle = M.rustle.filter(r => r.t > 0);
  for (const p of M.plums) {
    if (p.eaten) continue;
    p.t += dt;
    const floor = groundY(p.x);
    if (!p.lying) {
      p.v += D.gravity * dt; p.y += p.v * dt;
      if (p.y >= floor - 4) { p.y = floor - 4; if (p.v > 120) { p.v *= -.28; playThud(); } else { p.lying = true; p.t = 0; } }
    }
    // on the head: a bump, and some of what's in the bucket spilt
    const head = M.y - 46;
    if (M.phase === 'play' && !p.lying && p.v > 0 && M.safe <= 0 && Math.abs(p.x - M.x) < PLUM.bonk.near && p.y > head && p.y < head + 24) {
      p.v = -130; p.x += (p.x < M.x ? -1 : 1) * 10; M.bonk = PLUM.bonk.time; M.safe = PLUM.bonk.safe; M.sulk = .9; M.seated = false; M.digT = 0; playThud();
      puff(M.x, head, 6, [P.leaf, P.gold, P.white], 50, 60); spill();
      hint('shake', 'RUNNING SHAKES THE PLUMS DOWN.', 4);
    }
  }
  M.plums = M.plums.filter(p => !p.eaten && !(p.lying && p.t > D.lie));
}

function spill() { if (M.bucket === 'water') { M.water -= PLUM.spill; puff(M.x + M.face * 12, M.y - 22, 6, [P.aqua, P.white], 60, 40); if (M.water <= 0) { M.bucket = null; M.water = 0; } } }

// Wasps, going round and round in the gaps between the treetops. A sting, and Ichigo starts back.
function updateWasps(dt) {
  for (const w of M.wasps) {
    w.t += dt; w.px = w.x + Math.cos(w.t * 1.3) * w.rx; w.py = w.y + Math.sin(w.t * 2.1) * w.ry;
    if (M.phase === 'play' && M.safe <= 0 && Math.abs(w.px - M.x) < PLUM.wasp.near && w.py > M.y - 58 && w.py < M.y + 4) {
      M.bonk = .4; M.safe = 1.2; M.sulk = .9; M.seated = false; M.on = null; M.vy = -PLUM.wasp.up; M.push = (M.x < w.px ? -1 : 1) * PLUM.wasp.push; M.row = 0; M.digT = 0; playSting(); spill();
      puff(M.x, M.y - 30, 6, [P.gold, P.white], 60, 60);
    }
  }
}
// Down on an empty hammock: it throws Ichigo up.
function bounce(x) {
  const B = PLUM.bounce, timed = M.pressed > 0;
  M.row = timed ? M.row + 1 : 0; M.pressed = 0; input.jumpBuffer = 0;
  M.vy = -(timed ? Math.min(B.most, B.timed + B.more * (M.row - 1)) : B.plain) * (1 - .05 * M.sleep);
  M.y = groundY(x) - B.up; M.dents[x] = 1; playBoing(timed ? Math.min(1, .4 + M.row * .2) : .1);
  while (M.bucket === 'water') spill();
  if (!timed) hint('timed', 'JUMP AGAIN JUST AS ICHIGO LANDS, TO GO HIGHER.', 4.5);
  else hint('leaves', 'THE TREETOPS HOLD ICHIGO UP.', 3);
}

// --- the shores: clams breathing under the sand, and crabs; and the orange tree ---
function updateShore(dt) {
  for (const c of M.clams) { c.t += dt; if (c.t > PLUM.clamTime) { c.t = -1.5 - Math.random() * 2; c.x = c.a + Math.random() * (c.b - c.a); } }
  for (const c of M.crabs) {
    c.t += dt; c.hide = Math.max(0, c.hide - dt); if (c.hide) continue;
    c.x += c.dir * PLUM.crab * dt; if (c.x > c.b) c.dir = -1; if (c.x < c.a) c.dir = 1;
  }
  if (M.ripe < 3 && (M.regrow += dt) > PLUM.regrow) { M.ripe++; M.regrow = 0; }
  for (const o of M.oranges) if (!o.lying) { o.v += 620 * dt; o.y += o.v * dt; const f = groundY(o.x) - 5; if (o.y > f) { o.y = f; if (o.v > 120) { o.v *= -.35; playThud(); } else o.lying = true; } }
}

// ============================================================================
// The people
// ============================================================================
function updateSleepers(dt) {
  const L = S.level;
  if ((M.snoreT -= dt) <= 0) { M.snoreT = 3.4; if ((near(L.sailor, 220) && M.sailor === 'asleep') || (near(L.fisherman, 220) && M.fisher === 'asleep')) playSnore(); }
  // the woman: she wakes as Ichigo comes by, and offers a plum
  M.womanT += dt;
  for (const k of Object.keys(M.dents)) M.dents[k] = Math.max(0, M.dents[k] - dt * 2.6);
  if (M.woman === 'asleep' && near(L.woman, 70) && M.on === 'ground' && M.phase === 'play' && M.x > L.woman - 70) { M.woman = 'offers'; M.womanT = 0; say('woman', [], { text: 'HAVE ONE. YOU CAN STAY HERE.', time: 4 }); }
  if (M.woman === 'offers' && Math.abs(M.x - L.woman) > 130) {
    M.woman = 'refused'; M.womanT = 0; hush('woman');
    say('ichigo', ['uchi'], { note: true, time: 2.4 }); learnWord('uchi');
  }
  if (M.woman === 'refused' && M.womanT > 1.8 && !M.refused) { M.refused = true; say('woman', [], { text: 'EVERYONE WALKS ON AT FIRST.', time: 3.5 }); }
  if (M.woman === 'refused' && M.womanT > 6) M.woman = 'done';   // (asleep again)
  // the fisherman, shown a crab: he wakes, gives his rope away, and sits down on the grass to watch the crab
  M.fisherT += dt;
  if (M.fisher === 'up' && M.fisherT > 2.8 && !M.gave) { M.gave = true; say('fisherman', ['rope'], { text: 'YOU NEED A ROPE? TAKE MINE.', time: 2.8 }); }
  if (M.fisher === 'up' && M.fisherT > 5.4) { M.fisher = 'sat'; M.fisherT = 0; M.rope = 'lying'; puff(L.fisherman, groundY(L.fisherman) - 20, 16, [P.leaf, P.grass, P.tan], 60, 120); playRustle(); }
  if (M.fisher === 'sat' && M.fisherT > 2 && !M.thanked) { M.thanked = true; say('fisherman', [], { text: "I'LL SIT HERE A WHILE.", time: 3 }); }
  // the old sailor, dozing off again
  M.sailorT += dt;
  if (M.sailor !== 'up') {
    M.awake = Math.max(0, M.awake - PLUM.sailor.doze * dt);
    M.sailor = M.awake > .9 ? 'half' : 'asleep';
  } else if (M.sailorT > 2.2 && !M.paddle) { M.paddle = true; keepThing('paddle'); S.newThing = true; playClick(1.7); say('sailor', ['paddle'], { time: 3.5, text: "TAKE THE PADDLE. I'M TOO OLD TO GO." }); }
  if (M.phase === 'play' && L.hammocks.some(x => near(x, 60))) hint('bouncy', 'AN EMPTY HAMMOCK IS BOUNCY. SPACE: JUMP.', 4.5);
  // up in the trees
  for (const id of ['blanket', 'kite']) if (!M[id] && near(L[id], 30) && Math.abs(M.y - thingY(id)) < 46) { M[id] = true; keepThing(id); S.newThing = true; playClick(1.7); puff(L[id], M.y - 20, 10, [P.gold, P.white], 90, 80); M.hintT = 0; hint('got' + id, id === 'kite' ? 'A KITE! TAB: LOOK AT IT.' : 'A BLANKET. IT WILL DO FOR A SAIL FOR THE RAFT.', 4); }
  // what they're lying on
  if (M.phase === 'play' && M.fisher === 'asleep' && near(L.fisherman, 40)) hint('hisrope', 'HIS HAMMOCK HANGS ON A GOOD ROPE. HE IS TALKING IN HIS SLEEP.', 4);
  if (M.phase === 'play' && M.sailor === 'asleep' && near(L.sailor, 40)) hint('hispaddle', M.bucket === 'water' ? 'HE IS ASLEEP ON A PADDLE.' : 'HE IS ASLEEP ON A PADDLE. COLD WATER MIGHT WAKE HIM.', 4);
  // the sleepers talk in their sleep: what would wake them
  if ((M.mutterT -= dt) <= 0 && M.phase === 'play' && M.on === 'ground' && M.hintT <= 0) {
    const close = M.fisher === 'asleep' && M.bucket !== 'crab' && near(L.fisherman, 70) ? ['fisherman', 'crab', 'ZZ. CRABS. I USED TO CATCH CRABS.'] : M.sailor === 'asleep' && M.bucket !== 'water' && near(L.sailor, 70) ? ['sailor', 'umi', 'ZZ. THAT SEA IS COLD.'] : null;
    if (close) { M.mutterT = 8; say(close[0], [close[1] === 'crab' ? 'kani' : 'umi'], { text: close[2], time: 3.5 }); } else M.mutterT = .3;
  }
  if (M.phase === 'play' && !M.blanket && M.on === 'ground' && near(L.blanket, 90)) hint('seeblanket', 'A BLANKET, UP IN THE TREE. CAN ICHIGO GET UP THERE?', 4.5);
  if (M.phase === 'play' && !M.bucket && M.crabs.some(c => !c.hide && near(c.x, 60))) hint('seecrab', 'DOWN ARROW BY A CRAB: CATCH IT IN THE BUCKET.', 4);
  if (M.phase === 'play' && M.bucket === 'crab' && M.fisher === 'asleep' && near(L.fisherman, 60)) hint('dropcrab', 'DOWN ARROW: SHOW HIM THE CRAB.', 4);
  if (M.phase === 'play' && M.bucket === 'water' && M.sailor !== 'up' && near(L.sailor, 60)) hint('tipwater', 'DOWN ARROW: TIP THE WATER OVER HIM.', 4);
  if (M.phase === 'play' && !M.bucket && M.x > 2330 && M.sailor !== 'up') hint('fillup', "DOWN ARROW AT THE WATER'S EDGE: FILL THE BUCKET.", 4);
  if (!M.seenRaft && near(L.raft, 190)) M.seenRaft = true;
  const ready = parts3().every(([, got]) => got);
  if (M.phase === 'play' && near(L.raft, 60)) { if (ready) hint('go', 'DOWN ARROW: LEAVE ON THE RAFT.', 5); else hint('need' + parts3().map(q => +q[1]).join(''), 'THE RAFT STILL NEEDS ' + stillNeeds() + '.', 4.5); }
  else if (ready && M.phase === 'play') hint('ready', 'THAT IS EVERYTHING. GO TO THE RAFT IN THE REEDS.', 5);
}
// (what's caught in a treetop sits on the middle of it)
export const thingY = id => { const t = S.level.trees.find(q => q[0] === S.level[id]), [, cy, , ry] = lumps(t[0], t[1])[2]; return cy - ry; };
function splashSailor() {
  const a = PLUM.sailor;
  M.awake = Math.min(a.awake, M.awake + a.splash * M.water / 3); M.splashes++;
  if (M.awake >= a.awake) { M.sailor = 'up'; M.sailorT = 0; say('sailor', [], { text: "ALL RIGHT, I'M AWAKE. YOU WANT TO LEAVE?", time: 2.2 }); }
  else if (M.splashes === 1) say('sailor', [], { text: "HUH? WHERE'S MY BOAT?", time: 2.6 });
  else say('sailor', [], { text: M.awake < 1.4 ? 'IS IT MORNING?' : "I'M UP. I'M UP.", time: 2.4 });
  hint('doze', 'HE DOZES OFF AGAIN. KEEP THE COLD WATER COMING.', 4);
}

// What use would do where Ichigo is, or null: { do, x }.
export function action() {
  if (M.phase !== 'play' || M.on !== 'ground' || M.bonk > 0 || M.eating > .35 || M.digT > 0) return null;
  const L = S.level;
  if (near(L.raft, 34) && parts3().every(([, got]) => got)) return { do: 'raft', x: L.raft };
  const orange = M.oranges.find(o => o.lying && near(o.x, 18)); if (orange) return { do: 'orange', x: orange.x, orange };
  if (M.rope === 'lying' && near(L.fisherman + 29, 40)) return { do: 'rope', x: L.fisherman + 29 };
  if (M.fisher === 'asleep' && near(L.fisherman, 30) && M.bucket) return { do: M.bucket === 'crab' ? 'crab' : 'rain', x: L.fisherman };
  if (M.sailor !== 'up' && near(L.sailor, 30) && M.bucket) return { do: M.bucket === 'crab' ? 'nocrab' : 'splash', x: L.sailor };
  if (M.woman === 'offers' && near(L.woman, 34)) return { do: 'plum', x: L.woman };
  if (near(L.orange, 30) && M.ripe > 0) return { do: 'shake', x: L.orange };
  const clam = M.clams.find(c => c.t > 0 && near(c.x, 18)); if (clam && M.belly < .95) return { do: 'dig', x: clam.x, clam };
  const crab = !M.bucket && M.crabs.find(c => !c.hide && near(c.x, 24)); if (crab) return { do: 'catch', x: crab.x, crab };
  if (atWater()) {
    if (M.bucket === 'crab') return { do: 'free', x: M.x };
    if (!M.bucket || M.water < 3) return { do: 'fill', x: M.x };
  }
  // a plum on the ground (last of all, so it's never eaten by mistake)
  const plum = M.belly < .9 && M.plums.filter(p => p.lying && !p.eaten && near(p.x, 16)).sort((a, b) => Math.abs(a.x - M.x) - Math.abs(b.x - M.x))[0]; if (plum) return { do: 'eat', x: plum.x, plum };
  return null;
}
function use(act) {
  const L = S.level, pour = (x, y, n = 16) => { M.pouring = .45; playSplash(); puff(x, y, n, [P.aqua, P.white, P.mist], 130, 70); M.bucket = null; M.water = 0; };
  M.seated = false;
  if (act.x !== M.x && Math.abs(act.x - M.x) > 4) M.face = Math.sign(act.x - M.x);
  switch (act.do) {
    case 'fill': M.bucket = 'water'; M.water = 3; M.digging = .3; playScoop(); hint('full', 'A FULL BUCKET IS TOO HEAVY TO RUN WITH. HOPPING SPILLS IT.', 4.5); break;
    case 'free': M.bucket = null; { const c = M.crabs[M.x < 1000 ? 0 : 1]; c.hide = 0; c.x = clamp(M.x, c.a, c.b); } playClick(1); break;
    case 'catch': act.crab.hide = 9999; M.bucket = 'crab'; M.held = act.crab; M.digging = .3; playClick(1.2); hint('crab', 'A CRAB. WHO WOULD LIKE TO SEE IT?', 3.5); break;
    case 'crab':   // held out for him to see
      M.bucket = null; M.held = null; M.fisher = 'up'; M.fisherT = 0; M.pouring = .6; playClick(1.4); say('fisherman', ['kani'], { text: "A CRAB! I HAVEN'T SEEN ONE IN YEARS.", time: 2.7 }); break;
    case 'rain': pour(L.fisherman, groundY(L.fisherman) - 44); say('fisherman', [], { text: 'MM. RAIN.', time: 2.5 }); hint('rain', 'WATER DOES NOT WAKE HIM. HE DREAMS OF CRABS.', 4); break;
    case 'nocrab': say('sailor', [], { text: 'ZZ. NO CRABS FOR ME.', time: 2.4 }); break;
    case 'splash': pour(L.sailor, groundY(L.sailor) - 46, 20); break;
    case 'rope': M.rope = 'kept'; keepThing('rope'); S.newThing = true; playClick(1.7); M.hintT = 0; hint('rope', 'A ROPE FOR THE RAFT.', 3.5); break;
    case 'plum': M.woman = 'done'; eat('plum'); break;
    case 'eat': act.plum.eaten = true; eat('plum'); break;
    case 'orange': M.oranges.splice(M.oranges.indexOf(act.orange), 1); eat('orange'); break;
    case 'shake':
      M.shakeT = .4; M.digging = .3; playRustle(); puff(L.orange, groundY(L.orange) - 92, 8, [P.leaf, P.pine, P.grass], -20, 40);
      if (++M.shaken >= PLUM.shakes) { M.shaken = 0; M.ripe--; M.regrow = 0; M.oranges.push({ x: L.orange + (M.x < L.orange ? 1 : -1) * (6 + Math.random() * 14) * (Math.random() < .5 ? -1 : 1) + M.face * 6, y: groundY(L.orange) - 84, v: 0, lying: false }); }
      break;
    case 'raft': M.phase = 'leave'; M.t = 0; M.hintT = 0; M.hint = null; M.seated = true; M.v = 0; M.moving = false; M.x = L.raft; M.bucket = null; M.water = 0; playWash(.4); break;
  }
}
// Away on the raft: the current takes it east, gathering speed, right off the screen; then the cards.
function leave(dt, win) {
  if (M.t > .6) M.raftX += Math.min(PLUM.drift, (M.t - .6) * 26) * dt;
  M.x = M.raftX; M.y = PLUM.sea - 8; M.face = 1;
  if (M.raftX > S.level.length + 80 && !M.done) { M.done = true; parts.length = 0; clearBubbles(); showCards(END_CARDS, win); }
}

// ============================================================================
// Ichigo
// ============================================================================
function updateIchigo(dt) {
  if (M.phase === 'leave') { M.seated = true; return; }
  const control = M.phase === 'play' && M.bonk <= 0;
  const dir = control ? (inRight() ? 1 : 0) - (inLeft() ? 1 : 0) : 0;
  const wants = control && (dir || inUse() || input.usePressed || input.jumpBuffer > 0);
  if (M.seated && wants) { M.seated = false; M.sulk = BEACH.sulk; }
  M.sulk = Math.max(0, M.sulk - dt); M.pouring = Math.max(0, M.pouring - dt); M.digging = Math.max(0, M.digging - dt);
  M.idle = wants || !M.on || !control ? 0 : M.idle + dt;
  if (!M.seated && control && M.idle > (M.boredAt || (M.boredAt = BEACH.bored[0] + Math.random() * BEACH.bored[1]))) { M.seated = true; M.boredAt = 0; }

  // --- use --- (a clam takes a moment's digging, with use held)
  const act = control ? action() : null;
  if (act && act.do === 'dig' && input.usePressed) { M.digT = .001; M.clam = act.clam; M.face = Math.sign(act.x - M.x) || M.face; M.seated = false; playDig(); }
  else if (act && input.usePressed) { if (act.do === 'splash') { splashSailor(); } use(act); }
  if (M.digT > 0) {
    if (!inUse() || dir || M.clam.t < 0) M.digT = 0;
    else {
      const before = M.digT; M.digT += dt; M.digging = .1;
      if (Math.floor(before * 6) !== Math.floor(M.digT * 6)) { playDig(); puff(M.clam.x, groundY(M.clam.x), 4, [P.tanD, P.tan], 70, 60); }
      if (M.digT > PLUM.dig) { M.digT = 0; M.clam.t = -3 - Math.random() * 2; M.clam.x = M.clam.a + Math.random() * (M.clam.b - M.clam.a); eat('clam'); }
    }
  }

  // --- walking ---
  const full = M.bucket === 'water', slow = 1 - PLUM.slow * M.sleep;
  let speed = (M.belly <= 0 ? MOVE.walk * PLUM.weak : inRun() && !full ? MOVE.run : MOVE.walk * (full ? PLUM.full : 1)) * slow;
  if (M.digT > 0 || M.eating > .35) speed = 0;
  if (M.on === 'ground' && depthAt(M.x) > 2) speed *= .6;
  M.moving = !!dir && speed > 0; if (dir) M.face = dir;
  M.v = dir * speed;
  M.push -= M.push * Math.min(1, dt * 4);   // (started back from a wasp)
  let nx = M.x + (M.v + M.push) * dt;
  if (M.on === 'ground' && depthAt(nx) > PLUM.wade && depthAt(nx) > depthAt(M.x)) nx = M.x;
  if (M.on === 'ground' && depthAt(M.x) > 2 && dir && Math.random() < .2) parts.push({ x: M.x + dir * 8, y: seaAt(M.x), vx: dir * 40 * Math.random(), vy: -50 - Math.random() * 60, life: .35, c: P.white });
  nx = clamp(nx, 20, S.level.length - 20);
  if (nx < 110 || nx > 2420) nx = clamp(nx, 110, 2420);   // (no jumping out to sea)
  M.x = nx; M.anim += dt * Math.abs(M.v) / 14;

  // --- jumping, bouncing, landing ---
  // (pressed: how lately jump was pressed, for timing a bounce; holding it makes a jump higher)
  if (input.jumpBuffer > 0 && control) M.pressed = PLUM.bounce.window;
  M.pressed = Math.max(0, M.pressed - dt); M.sag = Math.max(0, M.sag - dt * 18);
  const floor = groundY(M.x), leaves = leavesAt(M.x), was = M.y;
  if (M.on === 'ground') M.y += (floor - M.y) * Math.min(1, dt * 18);
  else if (M.on === 'leaves') {
    if (leaves && leaves[0] < M.y + 16) { M.y += (leaves[0] + 3 + M.sag - M.y) * Math.min(1, dt * 16); if (M.moving && Math.random() < .12) parts.push({ x: M.x, y: M.y + 4, vx: (Math.random() - .5) * 40, vy: 20, life: .7, c: Math.random() < .5 ? P.leaf : P.grass }); }
    else { M.on = null; M.vy = 0; }
  }
  if (M.on && control && M.digT <= 0 && input.jumpBuffer > 0) { M.vy = -PLUM.jump * (1 - .05 * M.sleep); M.on = null; input.jumpBuffer = 0; M.pressed = 0; M.row = 0; M.seated = false; M.rising = true; spill(); }
  else if (!M.on) {
    if (M.rising && !inJump()) { M.rising = false; if (M.vy < -MOVE.shortHop) M.vy = -MOVE.shortHop; }
    M.vy = Math.min(1000, M.vy + MOVE.gravity * dt); M.y += M.vy * dt;
    if (M.vy > 0) {
      const h = S.level.hammocks.find(x => { const top = groundY(x) - PLUM.bounce.up; return Math.abs(M.x - x) < PLUM.bounce.wide && was <= top + 2 && M.y >= top && M.vy > 150; });
      if (h && M.phase === 'play') { M.rising = false; bounce(h); }
      else if (leaves && was <= leaves[0] + 8 && M.y >= leaves[0]) landOnLeaves(leaves);
      else if (M.y >= floor) { if (M.vy > 500) puff(M.x, floor, 5, [P.leaf, P.tan], 40, 60); M.y = floor; M.vy = 0; M.on = 'ground'; M.row = 0; }
    }
  }
  if (!control) input.jumpBuffer = 0;
  input.jumpBuffer = Math.max(0, input.jumpBuffer - dt);
  M.air = !M.on;
}
// Down on a treetop: it gives, and something falls out of it (an orange, off the orange tree).
function landOnLeaves([y, tree]) {
  const hard = M.vy; M.y = y; M.vy = 0; M.on = 'leaves'; M.sag = PLUM.leafSag; M.row = 0; playRustle();
  puff(M.x, y + 6, 7, [P.leaf, P.pine, P.grass], 30, 60);
  if (hard < 260) return;
  if (tree[2]) { if (M.ripe > 0) { M.ripe--; M.regrow = 0; M.oranges.push({ x: M.x + (Math.random() - .5) * 30, y: groundY(tree[0]) - 70, v: 0, lying: false }); } }
  else if (M.plums.length < 14) M.plums.push({ x: M.x + (Math.random() - .5) * 60, y: groundY(tree[0]) - 88 * tree[1], v: 0, lying: false, t: 0 });
}
