// ============================================================================
// story.js — the journeys between levels: before each level's play, a few moving pictures with a caption under
// each, about how Ichigo is getting on (what they eat, where they sleep, what they miss, how long it has been,
// how they've grown). Pictures are drawn in storyart.js.
// Any key or click shows the whole caption, then goes on to the next picture; left alone, it goes on by itself.
// Esc, or a click on SKIP, skips the lot. (Story cards turned off in the settings turns these off too.)
// ============================================================================
import { P, LW, LH } from './config.js';
import { S } from './state.js';
import { lg, lo, pixelSpace, dither } from './pixel.js';
import { pixelText, LETTER, LINE } from './text.js';
import { drawSkip, onSkip } from './cards.js';
import { seaSound, playLullaby, playWash, playMunch, playCry, playCut, playSplash, playClick, playThud } from './audio.js';
import { SHOTS } from './storyart.js';

// For each level: its pictures, in order. [picture, caption, how long it stays up at least (seconds), sounds]. A sound: [when, what].
// (The first and last are the levels themselves, just as they end and begin: setPlaces in main.js.)
const STORIES = {
  beach: [   // (before Level 1's beach; its journey proper comes after the wave)
    ['beach', 'ICHIGO LIVES BY THE SEA WITH KAA-CHAN, THEIR MOTHER, IN A HOUSE WITH A STRAW ROOF.', 6.5, []],
    ['beach', 'EVERY EVENING, WHILE KAA-CHAN MENDS THE NETS AND HUMS, ICHIGO PLAYS IN THE SAND WITH A BUCKET AND SHOVEL.', 7.5, []],
  ],
  1: [
    ['adrift', 'ICHIGO WAKES ON A PLANK. THE ONLY THING THEY KNOW IS MOUNT FUJI, AND IT IS VERY FAR AWAY.', 9, [[.3, () => playWash(.3)], [5, () => playWash(.2)]]],
    ['bedtime', "THE NIGHT BEFORE THE WAVE, ICHIGO WAS IN BED, WATCHING KAA-CHAN'S SHADOW GO BACK AND FORTH.", 9.5, []],
    ['scared', 'ICHIGO IS THREE, AND HAS NEVER BEEN ANYWHERE ALONE. ICHIGO IS SCARED, AND WANTS TO GO HOME.', 8.5, [[1.2, () => playCry()]]],
    ['lantern', 'TOWARD EVENING THERE IS A LIGHT, FAR OFF. SOMEONE MUST HAVE LIT IT.', 8, []],
    ['start1', 'PIECES OF THE VILLAGE ARE FLOATING ALL THE WAY TO IT.', 5.5, []],
  ],
  2: [
    ['end1', 'ICHIGO GETS TO THE ISLAND. THE LANTERN IS LIT, BUT NO ONE IS THERE. ICHIGO WAITS.', 7, []],
    ['boat', 'IN THE MORNING A BOAT GOES BY. ICHIGO JUMPS AND WAVES. IT IS TOO FAR AWAY TO SEE A CHILD.', 9.5, []],
    ['rain', 'IT RAINS ALL THE NEXT DAY. ICHIGO EATS SEAWEED, AND DRINKS OUT OF THE BUCKET. THE SEAWEED IS TOO SALTY.', 8.5, [[1.5, () => playMunch()], [4.2, () => playMunch()]]],
    ['dark', 'THE THIRD NIGHT, SOMETHING SPLASHES IN THE DARK. ICHIGO MOVES CLOSER TO THE LANTERN.', 10, [[1, () => playSplash()]]],
    ['start2', 'BY MIDNIGHT THE SEA IS COMING UP THE SAND.', 4.5, []],
  ],
  3: [
    ['end2', 'THERE IS A STREAM HERE, AND SHADE. ICHIGO STAYS.', 6.5, []],
    ['seasons', 'ICHIGO EATS SHELLFISH AND BERRIES, AND SLEEPS IN THE LEAVES. SPRING GOES BY, SUMMER, AUTUMN, WINTER.', 11.5, []],
    ['birthday', 'THE FIRST DAY, ICHIGO CUT A LINE IN A TREE, AS HIGH AS THEIR HEAD. NOW IT IS TOO LOW. ICHIGO IS FOUR.', 10, [[5, () => playCut()], [5.5, () => playCut()], [6, () => playCut()]]],
    ['dream', 'SOME NIGHTS ICHIGO DREAMS THAT KAA-CHAN IS CALLING THEM IN TO SUPPER. THEN ICHIGO WAKES UP, AND IT IS STILL NIGHT.', 11.5, [[1, () => playLullaby({ notes: 5, vol: .12 })]]],
    ['start3', 'ONE EVENING ICHIGO WALKS ROUND TO THE FAR SIDE OF THE ISLAND. SOMEONE IS LYING IN THE TREES.', 6.5, []],
  ],
  4: [
    ['sailing', 'THE CURRENT TAKES THE RAFT EAST, DAY AND NIGHT. ICHIGO LOOKS FOR MOUNT FUJI, TO KNOW WHICH WAY HOME IS.', 11, [[2, () => playSplash()], [6.6, () => playSplash()]]],
    ['oranges', 'THERE ARE NINE ORANGES, AND ICHIGO EATS ONE A DAY. ICHIGO MEANS TO KEEP THE LAST ONE. ON THE NINTH DAY ICHIGO EATS IT.', 12, [[1, () => playMunch()], [3, () => playMunch()], [5, () => playMunch()], [9.8, () => playMunch()]]],
    ['whale', 'SOMETHING VERY BIG SWIMS UNDER THE RAFT. ICHIGO STAYS UNDER THE BUCKET UNTIL IT IS GONE.', 10.5, [[2.6, () => playWash(.9)], [5.4, () => playWash(.5)]]],
    ['song', 'IT HAS BEEN MORE THAN A YEAR. ICHIGO TRIES TO REMEMBER WHAT COLOR THE CURTAIN IN THE DOORWAY WAS, AT HOME.', 10.5, []],
    ['ashore', 'THE RAFT RUNS ONTO THE ROCKS ACROSS FROM A LIGHTHOUSE. ITS LIGHT HAS GONE OUT. THERE IS A SHED.', 8, [[.4, () => playWash(.5)]]],
    ['start4', 'ICHIGO SLEEPS ON A SHELF, OUT OF THE WET.', 5, []],
  ],
  5: [
    ['leaving', 'BY MORNING THE LIGHTHOUSE IS OUT OF SIGHT.', 7, []],
    ['logs', 'ICHIGO TIES ON EVERY LOG THAT FLOATS BY. THE RAFT GETS BIGGER, AND SO DOES ICHIGO. ICHIGO IS FIVE.', 11.5, [[2.2, () => playClick(.8)], [4.9, () => playClick(.8)], [7.6, () => playClick(.8)]]],
    ['bird', 'A BIRD RIDES ON THE RAFT FOR FOUR DAYS. ICHIGO GIVES IT HALF OF EVERY FISH.', 9.5, [[2.4, () => playMunch()], [4.4, () => playMunch()]]],
    ['start5', 'THEN IT FLIES EAST, AND THE WIND GOES THE SAME WAY.', 7, []],
  ],
  6: [
    ['end5', 'THE SEA IS FLAT AGAIN. THE MASTS ARE FROM OLD SHIPS THAT SANK ON A REEF.', 7.5, []],
    ['cabin', 'ONE OF THE SHIPS STILL HAS ITS DECK ABOVE THE WATER. ICHIGO SLEEPS IN ITS CABIN. THE DOOR BANGS ALL NIGHT.', 10, [[1.8, () => playThud()], [4.2, () => playThud()], [6.6, () => playThud()], [9, () => playThud()]]],
    ['swimming', 'EVERY DAY ICHIGO LETS GO OF THE DECK A LITTLE LONGER. ON THE TWELFTH DAY, ICHIGO CAN SWIM.', 11, [[.8, () => playSplash()], [4.4, () => playSplash()], [8, () => playSplash()]]],
    ['start6', 'A MONTH GOES BY. NO BOATS COME INTO THE REEF.', 6.5, []],
  ],
};

const SPEED = 45, BAR = 22, BAND = 72, TOP_ROW = 50;   // letters a second; the dark bars above and below the picture, in pixels; which row of the picture is at its top
export const V = { n: 0, i: 0, t: 0, read: 0, then: null, phase: 0, fade: 1, leaving: 0, heard: 0, bars: 1 };
let places = {};   // the levels as they end and begin (main.js): { name: { enter(), draw(t) } }, and level(n)
export const setPlaces = p => { places = p; };
const before = document.createElement('canvas'); before.width = LW; before.height = LH;   // the last picture, going in dots under the new one

export const storyActive = () => S.scene === 'story' && !!V.then;
const levelOf = n => (n === 'beach' ? 1 : n);
// Before level n (or 'beach'). then(): what comes after it.
export function startStory(n, then) {
  if (!S.cardsOn || !STORIES[n]) { then(); return; }
  Object.assign(V, { n, i: 0, t: 0, read: 0, then, phase: 0, fade: 0, leaving: 0, heard: 0 });
  before.getContext('2d').drawImage(lo, 0, 0);                                        // (it comes up through whatever was on the screen)
  V.bars = places[STORIES[n][0][0]] ? 0 : 1;                                          // (a level as it ended: the bars slide in over it)
  S.scene = 'story'; S.sceneT = 0; S.camX = 0; enter();
}
function enter() { const at = places[STORIES[V.n][V.i][0]]; S.still = null; S.as = null; if (at) at.enter(); else { places.level(levelOf(V.n)); S.camX = 0; } }
export function clearStory() { V.then = null; S.as = null; S.still = null; }   // (leaving for the title or the level list)
function finish(cut = false) { const then = V.then; clearStory(); places.level(levelOf(V.n)); S.cut = cut; if (then) then(); }   // (cut: straight from the last picture, which is the level itself)
function keep() { before.getContext('2d').drawImage(lo, 0, 0); V.fade = 0; }
// The next step: the whole caption if it's still typing, else the next picture.
export function nextStory() {
  if (!storyActive() || V.leaving) return;
  const [, text] = STORIES[V.n][V.i];
  if (V.read * SPEED < text.length) { V.read = 99; return; }
  onward();
}
function onward() {
  if (V.i + 1 >= STORIES[V.n].length) { V.leaving = .001; return; }
  const same = STORIES[V.n][V.i][0] === STORIES[V.n][V.i + 1][0];                     // (another caption over the same picture: it just goes on)
  if (!same) keep(); V.i++; V.t = V.read = V.phase = V.heard = 0; if (!same) enter();
}
// Every frame. pressed: a key or click; click: where.
export function updateStory(dt, pressed, click, key) {
  if (!storyActive()) return;
  if (key === 'Escape' || onSkip(click)) { finish(); return; }
  if (V.leaving) { V.leaving += dt; V.t += dt; V.bars = places[STORIES[V.n][V.i][0]] ? Math.max(0, 1 - V.leaving / .7) : 1; if (V.leaving > .75) finish(!!places[STORIES[V.n][V.i][0]]); return; }
  V.bars = Math.min(1, V.bars + (V.t > .6 ? dt / .9 : 0));
  const [, text, time, sounds] = STORIES[V.n][V.i];
  V.t += dt; if (V.bars >= 1) V.read += dt; V.fade = Math.min(1, V.fade + dt / .7);
  while (V.heard < sounds.length && V.t > sounds[V.heard][0]) sounds[V.heard++][1]();
  if (pressed && V.t > .3) nextStory();
  else if (V.t > Math.max(time, 4.5 + text.length / 14)) onward();
  seaSound(.22);
}

const tile = document.createElement('canvas'), left = document.createElement('canvas'); tile.width = tile.height = 4; left.width = LW; left.height = LH;
// Dots of a colour over everything: k of them (0..1).
function dots(g, k, col) {
  const t = tile.getContext('2d'); t.clearRect(0, 0, 4, 4); t.fillStyle = col;
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) if (dither(x, y) < k) t.fillRect(x, y, 1, 1);
  g.fillStyle = g.createPattern(tile, 'repeat'); g.fillRect(0, 0, LW, LH);
}
const shot = document.createElement('canvas'); shot.width = LW; shot.height = LH;
export function drawStory() {
  if (!V.n || !STORIES[V.n]) return;
  const [name, text] = STORIES[V.n][V.i], at = places[name], pic = at || SHOTS[name], b = V.bars * V.bars * (3 - 2 * V.bars);
  const phase = pic.phase ? pic.phase(V.t) : 0;                                      // (a picture of several days: it dissolves from one to the next)
  if (phase !== V.phase) { V.phase = phase; keep(); }
  S.as = pic.age ? pic.age(V.t) : null;
  pic.draw(V.t, phase); pixelSpace(lg);
  // the picture, moved up between the bars (as far as they've come)
  const sg = shot.getContext('2d'), up = Math.round((TOP_ROW - BAR) * b); sg.drawImage(lo, 0, 0);
  if (up) { lg.fillStyle = P.night; lg.fillRect(0, 0, LW, LH); lg.drawImage(shot, 0, -up); }
  if (V.fade < 1) { const g = left.getContext('2d'); g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, LW, LH); g.drawImage(before, 0, 0); g.globalCompositeOperation = 'destination-out'; dots(g, V.fade, '#000'); lg.drawImage(left, 0, 0); }
  lg.fillStyle = P.night; lg.fillRect(0, 0, LW, Math.round(BAR * b)); lg.fillRect(0, LH - Math.round(BAND * b), LW, Math.round(BAND * b) + 1);
  if (V.bars < 1) return;
  // the caption
  const lines = ['']; for (const w of text.split(' ')) { const c = lines[lines.length - 1]; if (c && (c + ' ' + w).length > 43) lines.push(w); else lines[lines.length - 1] = c ? c + ' ' + w : w; }
  let shown = Math.floor(V.read * SPEED); const x = 24, y = LH - BAND + 11;
  lines.forEach((line, r) => {
    const n = Math.max(0, Math.min(line.length, shown)); shown -= line.length + 1; if (!n) return;
    lg.save(); lg.beginPath(); lg.rect(x, y + r * LINE - 2, n * LETTER, LINE + 2); lg.clip(); pixelText(line, x, y + r * LINE, P.mist); lg.restore();
  });
  if (V.read * SPEED >= text.length && Math.sin(V.read * 6) > -.2) { const last = lines[lines.length - 1]; pixelText('>', x + (last.length + 1) * LETTER, y + (lines.length - 1) * LINE, P.gold); }
  drawSkip('ESC: SKIP');
}
V.enter = enter;   // (for tests)
