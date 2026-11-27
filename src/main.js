// ============================================================================
// main.js — the starting point. Loads the level, then runs the game loop ~60 times a second:
// update everything a little, then draw a frame.
// ============================================================================
import { pc } from './pc.js';   // the PC around the game (keyboard, power button); loaded first so the page is complete before sizing
import { W, PIXEL, BEACH, TOP_PX } from './config.js';
import { S, parts } from './state.js';
import { present } from './pixel.js';
import { input } from './input.js';
import { buildWreckage, updateWreckage, deckY } from './wreckage.js';
import { PL, spawn, updatePlayer, updateParts } from './player.js';
import { startLevel, drawTitle, drawPlay } from './scenes.js';
import { openSettings, updateSettings, drawSettings, onGear } from './settings.js';
import { openThings, updateThings, drawThings, onThings } from './things.js';
import { startPrologue, drawPrologue } from './prologue.js';
import { openMenu, updateMenu, drawMenu, BUILT } from './menu.js';
import { N, startTide, endTide, yOf, groundZ, updateTide, retryTide, snore } from './tide.js';
import { drawTide } from './tideart.js';
import { M as plum, startPlum, groundY as plumGround, updatePlum, retryPlum } from './plum.js';
import { drawPlum } from './plumart.js';
import { H as light, startLight, surfaceY, updateLight, retryLight } from './lighthouse.js';
import { drawLight } from './lighthouseart.js';
import { V as story, setPlaces, startStory, updateStory, drawStory, storyActive, nextStory, clearStory } from './story.js';
import { R as storm, startStorm, updateStorm, retryStorm, endStorm, gusting, warned } from './storm.js';
import { drawStorm } from './stormart.js';
import { D as wrecks, startWrecks, updateWrecks, retryWrecks } from './wrecks.js';
import { drawWrecks } from './wrecksart.js';
import { B, startBeach, setBeach, updateBeach, drawBeachScene, drawWhite, WAKE_CARDS, SEA_CARDS } from './beach.js';
import { showCards, cardsActive, updateCards, nextCard, drawCards, clearCards, onSkip } from './cards.js';
import { say, think, updateBubbles } from './bubbles.js';
import { playLullaby, humming, music, seaSound, gulls, soundAge } from './audio.js';
import { SHOTS } from './storyart.js';
import { loadSave, save, learn } from './save.js';
import { prepareDawns } from './dawn.js';

// Every built level's data, loaded at the start: LEVELS[n] (Level 0, the prologue, has none).
const LEVELS = {};
async function loadLevels() {
  await Promise.all(BUILT.filter(n => n > 0).map(async n => {
    const path = `levels/level${String(n).padStart(2, '0')}.json`, res = await fetch(path);
    if (!res.ok) throw new Error(`Couldn't load ${path} (${res.status})`);
    LEVELS[n] = await res.json();
  }));
  useLevel(1);
}
function useLevel(n) {   // the level everything else sees as S.level
  if (S.level === LEVELS[n]) return;
  S.level = LEVELS[n];
  S.plats = buildWreckage(S.level);
  S.checkpoint = S.plats[0];
}
// Start level n from its beginning: the journey to it (story.js), then the level. (Level 1's journey comes after the wave.)
function begin(n, { story = true } = {}) {
  clearCards(); clearStory(); S.cut = false; S.noShovel = false;
  useLevel(Math.max(1, n));
  if (n === 0) startPrologue(startShore);   // Level 0, the prologue, leads into Level 1's beach
  else if (n === 1) startShore();
  else { const start = { 2: startTide, 3: startPlum, 4: startLight, 5: startStorm, 6: startWrecks }[n]; if (story) startStory(n, start); else start(); }
}
const startShore = () => startStory('beach', startBeach);   // Level 1's beach, its story first
const startSea = () => { startLevel(); showCards(SEA_CARDS); };   // Level 1's sea, after its journey
// The levels as they end and begin, for the journeys between them to start and finish on (story.js): enter() puts the
// level in that state (without its cards, and keeping Ichigo's marks from it), draw(t) draws it, t seconds in.
const set = (n, start, then = () => {}) => () => { const { cardsOn, deaths } = S; S.cardsOn = false; useLevel(n); start(); then(); Object.assign(S, { cardsOn, scene: 'story' }); if (S.still === 'end') S.deaths = deaths; parts.length = 0; };
const atGoal = () => { const g = S.plats.find(p => p.goal); updateWreckage(S.T, .016, PL); Object.assign(PL, { ground: g, x: g.x0 + S.level.goalOffset + 1, face: 1, sitting: true }); PL.y = deckY(g, PL.x); S.camX = Math.max(0, Math.min(S.level.length - W, PL.x - W * .38)); };
const DREAM = 6;   // seconds of the dream before Ichigo wakes
const as = (kind, f) => () => { S.still = kind; f(); };
setPlaces({
  level: useLevel,
  start1: { enter: as('start', set(1, startLevel)), draw() { updateWreckage(S.T, .016, PL); PL.x = PL.ground.cx; PL.y = PL.ground.cy; drawPlay(); } },
  end1: { enter: as('end', set(1, startLevel, atGoal)), draw(t) { atGoal(); PL.face = t > 3.5 && t < 5.5 ? -1 : 1; drawPlay(); } },
  boat: { enter: as('start', set(2, startTide, () => Object.assign(N, { light: .79, gone: true, lit: false, asleep: false }))), draw(t) { drawTide(); SHOTS.boat.over(t, x => [Math.round((x - S.camX) / PIXEL), Math.round(yOf(groundZ(x)) / PIXEL + TOP_PX)]); } },
  start2: { enter: as('start', set(2, startTide)), draw: () => drawTide() },
  end2: { enter: as('end', set(2, endTide)), draw(t) { N.face = t > 3 && t < 4.6 ? -1 : 1; drawTide(); } },
  // (Kaa-chan hums inside; Ichigo looks up from the castle now and then)
  beach: { enter: as('start', set(1, setBeach)), draw() { B.face = S.T % 5 > 4 ? 1 : -1; humming(true, .5); drawBeachScene(); } },
  // (the dream: Level 1's own beach at dusk, Ichigo three again, running in; then the night they wake in)
  dream: {
    phase: t => (t < DREAM ? 0 : 1), age: t => (t < DREAM ? 3 : 4),
    enter: as('start', set(1, () => { setBeach(); Object.assign(B, { seated: false, tripped: true, plaster: true, cut: true }); say('kaachan', ['ichigo', 'arrow', 'house'], { time: 4.6 }); })),
    draw(t) { if (t >= DREAM) { useLevel(3); SHOTS.dream.draw(t - DREAM); return; } const k = Math.max(0, Math.min(1, (t - 1.3) / 4.2)); Object.assign(B, { x: 452 - 262 * k, face: -1, moving: k > 0 && k < 1, side: 0, v: k > 0 && k < 1 ? -230 : 0, anim: t * 15 }); drawBeachScene(); SHOTS.dream.edges(); },
  },
  start3: { enter: as('start', set(3, startPlum)), draw(t) { const k = Math.min(1, t / 2.2); Object.assign(plum, { x: S.level.start - 56 * (1 - k), moving: k < 1, v: k < 1 ? 60 : 0, anim: t * 9, face: 1 }); plum.y = plumGround(plum.x); drawPlum(); } },
  ashore: { enter: as('start', set(4, startLight, () => { Object.assign(light, { seated: false, fade: 0, raftX: 3330 }); S.camX = 2790; })), draw(t) { const k = Math.max(0, Math.min(1, (t - 1.6) / 4.4)); Object.assign(light, { x: 3290 - 250 * k, face: t < 1.6 ? 1 : -1, moving: k > 0 && k < 1, v: k > 0 && k < 1 ? -60 : 0, anim: t * 9 }); light.y = surfaceY(light.x); drawLight(); } },
  end5: { enter: as('end', set(5, startStorm, endStorm)), draw(t) { storm.face = t > 2.6 && t < 4.4 ? -1 : 1; drawStorm(); } },
  start6: { enter: as('start', set(6, startWrecks, () => { wrecks.fade = 0; })), draw(t) { wrecks.face = t > 1.8 && t < 3.6 ? -1 : 1; drawWrecks(); } },
  start5: { enter: as('start', set(5, startStorm, () => { storm.fade = 0; storm.u = -70; storm.seated = false; })), draw(t) { storm.u = -70; storm.face = t > 1.5 && t < 3 ? -1 : 1; drawStorm(); } },
  start4: { enter: as('asleep', set(4, startLight, () => { light.fade = 0; light.seated = true; })), draw(t) { S.still = t > 3.4 ? 'start' : 'asleep'; drawLight(); if (t < 3.4) SHOTS.sleeping(Math.round(light.x / PIXEL), Math.round(light.y / PIXEL + TOP_PX)); } },
});
const win = () => { S.scene = 'end'; S.sceneT = 0; };

loadSave();   // the words, marks and tomorrows Ichigo carries (save.js)

let last = performance.now(), lastScene = S.scene;

// What the settings panel can do to the game (settings.js).
const act = {
  levels: () => { clearCards(); clearStory(); openMenu(); },
  title: () => { clearCards(); clearStory(); S.scene = 'title'; S.sceneT = 0; },
  restart: () => { clearCards(); if (S.level.number !== 1) begin(S.level.number, { story: S.scene === 'story' }); else if (S.scene === 'story' && story.n === 'beach') startShore(); else if (S.scene === 'beach' || S.scene === 'white') startBeach(); else startSea(); },
  inLevel: () => ['beach', 'white', 'play', 'story', 'tide', 'plum', 'light', 'storm', 'deep', 'dawn'].includes(S.scene),
};
function frame(now) {
  if (!pc.on) {   // the PC is switched off: the game waits, exactly where it was
    last = now; input.anyPressed = false; requestAnimationFrame(frame); return;
  }
  const dt = Math.max(0.004, Math.min(0.033, (now - last) / 1000)); last = now;
  S.T += dt; S.sceneT += dt; if (S.scene !== 'story' && S.sceneT > 1) S.cut = false;
  const pressed = input.anyPressed; input.anyPressed = false;
  const key = input.key, click = input.click; input.key = input.click = null;
  const toTitle = () => { clearCards(); clearStory(); S.scene = 'title'; S.sceneT = 0; };

  // move between scenes
  // (while the settings or a story card are up, the world waits: see settings.js, cards.js)
  const reading = cardsActive(), wasOpen = S.settingsOpen || S.thingsOpen;
  const canLook = ['beach', 'play', 'tide', 'plum', 'light', 'storm', 'deep'].includes(S.scene) && !reading;   // (Ichigo's things: things.js)
  if (S.settingsOpen) updateSettings(dt, key, click, act);
  else if (S.thingsOpen) updateThings(key, click);
  else if (canLook && (key === 'Tab' || key === 'KeyI' || onThings(click))) openThings();
  else if (onGear(click) || key === 'KeyP' || (key === 'Escape' && !reading && S.scene !== 'story' && S.scene !== 'beach' && S.scene !== 'levels')) openSettings();
  else if (reading) updateCards(dt, pressed, click, key);
  else if (S.scene === 'story') updateStory(dt, pressed, click, key);
  else if (S.scene === 'title' && pressed && key !== 'KeyM' && key !== 'KeyF') {   // (M is mute, F full screen: not "any key")
    // Browsers keep a page silent until a key is pressed. If this press is what woke the sound, it
    // starts the title's music; the next one begins. (After that, one press begins.)
    const justWoke = soundAge() < .3 && S.musicOn && !S.muted;
    if (!justWoke) begin(0);
  }
  else if (S.scene === 'levels') updateMenu(dt, key, click, begin, toTitle);
  else if (S.scene === 'beach') updateBeach(dt, skipped => { if (skipped) startStory(1, startSea); else { S.scene = 'white'; S.sceneT = 0; } }, key === 'Escape' || onSkip(click));
  else if (S.scene === 'white' && S.sceneT > BEACH.whiteTime) showCards(WAKE_CARDS, () => startStory(1, startSea), { paper: true });   // a silence, then the cards on the white
  else if (S.scene === 'end' && pressed && S.sceneT > 2.5) { if (LEVELS[S.level.number + 1]) begin(S.level.number + 1); else toTitle(); }   // on to the next level, if it's built
  else if (S.scene === 'tide') updateTide(dt, win);
  else if (S.scene === 'dawn' && S.level.number === 2) {   // Level 2's new tomorrow: the same timing as the sea's, below
    if (S.sceneT > .9 && S.sceneT - dt <= .9) retryTide();
    if (S.sceneT > 1.7) { S.scene = 'tide'; S.sceneT = 1; }
  }

  else if (S.scene === 'plum') updatePlum(dt, win);
  else if (S.scene === 'dawn' && S.level.number === 3) {
    if (S.sceneT > .9 && S.sceneT - dt <= .9) retryPlum();
    if (S.sceneT > 1.7) { S.scene = 'plum'; S.sceneT = 1; }
  }

  else if (S.scene === 'light') updateLight(dt, win);
  else if (S.scene === 'dawn' && S.level.number === 4) {
    if (S.sceneT > .9 && S.sceneT - dt <= .9) retryLight();
    if (S.sceneT > 1.7) { S.scene = 'light'; S.sceneT = 1; }
  }

  else if (S.scene === 'storm') updateStorm(dt, win);
  else if (S.scene === 'dawn' && S.level.number === 5) {
    if (S.sceneT > .9 && S.sceneT - dt <= .9) retryStorm();
    if (S.sceneT > 1.7) { S.scene = 'storm'; S.sceneT = 1; }
  }

  else if (S.scene === 'deep') updateWrecks(dt, win);
  else if (S.scene === 'dawn' && S.level.number === 6) {
    if (S.sceneT > .9 && S.sceneT - dt <= .9) retryWrecks();
    if (S.sceneT > 1.7) { S.scene = 'deep'; S.sceneT = 1; }
  }

  if (S.scene === 'tide' && !S.settingsOpen && !S.thingsOpen) snore(dt);   // (asleep under the opening cards too)

  // update the world
  const waiting = reading || wasOpen || S.settingsOpen || S.thingsOpen;
  if (!waiting && S.level.number === 1 && (S.scene === 'play' || S.scene === 'dawn' || S.scene === 'end')) {
    updateWreckage(S.T, dt, PL);
    if (S.scene === 'play') updatePlayer(dt);
    if (S.scene === 'dawn' && S.sceneT > 0.9 && S.sceneT - dt <= 0.9) spawn();   // respawn while the sun is up
    if (S.scene === 'dawn' && S.sceneT > 1.7) { S.scene = 'play'; S.sceneT = 0; }
    updateParts(dt);
    if (S.scene !== 'end') {
      S.levelT += dt;
    }
    // Level 1 is all waves: a little way out on them, Ichigo has learned the sea
    if (S.scene === 'play' && PL.x > 720 && PL.ground && !S.learned.includes('sea')) { think('sea', 2); learn('sea'); }
    const target = Math.max(0, Math.min(S.level.length - W, PL.x - W * 0.38));
    S.camX += (target - S.camX) * Math.min(1, dt * 5);
  }

  if (waiting) { input.jumpBuffer = 0; input.usePressed = false; }   // (a key that turned a card mustn't also make Ichigo hop or dig)
  if (!waiting) updateBubbles(dt);
  if (S.scene !== lastScene) {   // arriving in a scene
    if (S.scene === 'dawn') { playLullaby({ notes: 2, delay: .7 }); save(); }   // a new tomorrow: the Lullaby's first two notes (after the splash)
    if (S.scene === 'end') { S.done.add(S.level.number); save(); }   // (unlocking the next level)
    lastScene = S.scene;
  }

  // the music and the sea. The music plays on the sea level, held quietly under a new tomorrow's
  // Lullaby; the sea is heard wherever there's water, its waves louder as they grow along the level.
  // (The beach sets its own sea sound; the white is silent.)
  const tide = S.level.number === 2 && (S.scene === 'tide' || S.scene === 'dawn'), morning = N.light > .5;   // (Level 2's night song climbs the scale, a step with each set)
  const menus = S.scene === 'title' || S.scene === 'levels' || S.scene === 'prologue';
  // The title's theme on the title and on through Level 0's cards; the sea's music under the cards on
  // the white after the wave (after its silence), on into the sea level.
  if (S.scene === 'title' || S.scene === 'prologue') music(1, 'title');
  else if (S.scene === 'story') music(story.n === 'beach' ? 0 : .85, 'journey');   // (before the beach, there's only Kaa-chan's humming)
  else if (S.level.number === 3 && (S.scene === 'plum' || S.scene === 'dawn')) music(S.scene === 'dawn' ? .25 : 1, 'isle', -plum.sleep);   // (Level 3's: a semitone lower for each plum)
  else if (S.level.number === 4 && (S.scene === 'light' || S.scene === 'dawn')) music(S.scene === 'dawn' ? .25 : 1, 'prowl', 0, light.phase === 'caught' || light.seen > 0 ? 1 : light.eye.lid < .5 && light.phase !== 'gone' ? .5 : 0);   // (Level 4's listens to the eye: a block ticks while it's open)
  else if (S.level.number === 5 && (S.scene === 'storm' || S.scene === 'dawn')) {   // (the fair wind; nothing, as it drops; the storm; nothing again)
    const was = storm.phase === 'over' ? storm.was : storm.phase, fair = was === 'sail', hush = (was === 'turn' && storm.t < 4.4) || was === 'calm' || was === 'broken';
    music(hush ? 0 : S.scene === 'dawn' ? .25 : 1, fair ? 'sail' : 'storm', 0, gusting() || storm.waves.some(w => !w.passed) ? 1 : warned() ? .5 : 0);
  }
  else if (S.level.number === 6 && (S.scene === 'deep' || S.scene === 'dawn')) {   // (under the water a low pulse; nearly out of breath, a heartbeat)
    const under = wrecks.mode === 'swim' && !wrecks.surfaced && wrecks.phase === 'play';
    music(S.scene === 'dawn' ? .25 : 1, 'deep', 0, under ? (wrecks.breath < .3 ? 1 : .5) : 0);
  }
  else music(S.scene === 'play' || S.scene === 'tide' ? 1 : S.scene === 'dawn' ? .25 : S.scene === 'white' && reading ? .6 : 0, tide ? (morning ? 'morning' : 'night') : 'sea', tide && !morning ? [0, 3, 5, 9][N.set] : 0);   // (the level list: just the sea)
  if (S.scene === 'play' || (S.scene === 'dawn' && S.level.number === 1)) seaSound(.45 + .45 * Math.min(1, PL.x / ((S.level.sea && S.level.sea.growOver) || 5200)));
  else if (S.scene === 'end') seaSound(.25);   // a calm night sea
  else if (S.scene === 'levels') seaSound(.3);
  else if (S.scene === 'title') seaSound(0);
  gulls(S.scene === 'play' || (S.scene === 'storm' && storm.phase === 'sail') || (S.scene === 'deep' && wrecks.camY < 120) || (tide && morning) || (S.scene === 'beach' && B.phase !== 'recede'));   // (they fall silent when the sea pulls back)

  // draw (the camera moves in whole pixels so nothing shimmers)
  const cam = S.camX; S.camX = Math.round(S.camX / PIXEL) * PIXEL;
  if (S.scene === 'title') drawTitle(); else if (S.scene === 'levels') drawMenu(); else if (S.scene === 'prologue') drawPrologue(); else if (S.scene === 'story') drawStory(); else if (S.scene === 'beach') drawBeachScene(); else if (S.scene === 'white') drawWhite(); else if (S.level.number === 2) drawTide(); else if (S.level.number === 3) drawPlum(); else if (S.level.number === 4) drawLight(); else if (S.level.number === 5) drawStorm(); else if (S.level.number === 6) drawWrecks(); else drawPlay();
  S.camX = cam;
  drawCards();
  drawThings(canLook);
  drawSettings(act);   // (the gear in the corner, always; the panel when it's open)
  present();
  requestAnimationFrame(frame);
}

loadLevels().then(() => { requestAnimationFrame(frame); prepareDawns(); }).catch(err => {
  document.body.insertAdjacentHTML('beforeend', `<pre style="position:fixed;top:10px;left:10px;color:#b8322a">${err.message}\nIf you opened index.html straight from your computer, run a small local server instead (see README).</pre>`);
});

let resized; addEventListener('resize', () => { clearTimeout(resized); resized = setTimeout(prepareDawns, 300); });   // (made again at the new size)

// Handy for testing in the browser console: window.ichigo.S, window.ichigo.PL …
import { keys } from "./input.js";
window.ichigo = { plum, light, storm, wrecks, story, S, PL, input, keys, startLevel, begin, spawn, beach: B, tide: N, save, cards: { active: () => cardsActive() || storyActive(), next: () => (cardsActive() ? nextCard() : nextStory()) } };
