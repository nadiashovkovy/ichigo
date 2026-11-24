// ============================================================================
// main.js — the starting point. Loads the level, then runs the game loop ~60 times a second:
// update everything a little, then draw a frame.
// ============================================================================
import { pc } from './pc.js';   // the PC around the game (keyboard, power button); loaded first so the page is complete before sizing
import { W, PIXEL, BEACH } from './config.js';
import { S } from './state.js';
import { present } from './pixel.js';
import { input } from './input.js';
import { buildWreckage, updateWreckage } from './wreckage.js';
import { PL, spawn, updatePlayer, updateParts } from './player.js';
import { startLevel, drawTitle, drawPlay } from './scenes.js';
import { openSettings, updateSettings, drawSettings, onGear } from './settings.js';
import { openThings, updateThings, drawThings, onThings } from './things.js';
import { startPrologue, drawPrologue } from './prologue.js';
import { openMenu, updateMenu, drawMenu, BUILT } from './menu.js';
import { N, startTide, updateTide, retryTide, snore } from './tide.js';
import { drawTide } from './tideart.js';
import { B, startBeach, updateBeach, drawBeachScene, drawWhite, WAKE_CARDS } from './beach.js';
import { showCards, cardsActive, updateCards, nextCard, drawCards, clearCards } from './cards.js';
import { say, updateBubbles } from './bubbles.js';
import { playLullaby, music, seaSound, gulls, soundAge } from './audio.js';
import { loadSave, save, learnWord } from './save.js';
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
// Start level n from its beginning.
function begin(n) {
  clearCards();
  useLevel(Math.max(1, n));
  if (n === 0) startPrologue(startBeach);   // Level 0, the prologue, leads into Level 1's beach
  else if (n === 1) startBeach();
  else if (n === 2) startTide();
}
const win = () => { S.scene = 'end'; S.sceneT = 0; };

loadSave();   // the words, marks and tomorrows Ichigo carries (save.js)

let last = performance.now(), lastScene = S.scene;

// What the settings panel can do to the game (settings.js).
const act = {
  levels: () => { clearCards(); openMenu(); },
  title: () => { clearCards(); S.scene = 'title'; S.sceneT = 0; },
  restart: () => { clearCards(); if (S.level.number !== 1) begin(S.level.number); else if (S.scene === 'beach' || S.scene === 'white') startBeach(); else startLevel(); },
  inLevel: () => ['beach', 'white', 'play', 'tide', 'dawn'].includes(S.scene),
};
function frame(now) {
  if (!pc.on) {   // the PC is switched off: the game waits, exactly where it was
    last = now; input.anyPressed = false; requestAnimationFrame(frame); return;
  }
  const dt = Math.max(0.004, Math.min(0.033, (now - last) / 1000)); last = now;
  S.T += dt; S.sceneT += dt;
  const pressed = input.anyPressed; input.anyPressed = false;
  const key = input.key, click = input.click; input.key = input.click = null;
  const toTitle = () => { clearCards(); S.scene = 'title'; S.sceneT = 0; };

  // move between scenes
  // (while the settings or a story card are up, the world waits: see settings.js, cards.js)
  const reading = cardsActive(), wasOpen = S.settingsOpen || S.thingsOpen;
  const canLook = ['beach', 'play', 'tide'].includes(S.scene) && !reading;   // (Ichigo's things: things.js)
  if (S.settingsOpen) updateSettings(dt, key, click, act);
  else if (S.thingsOpen) updateThings(key, click);
  else if (canLook && (key === 'Tab' || key === 'KeyI' || onThings(click))) openThings();
  else if (onGear(click) || key === 'KeyP' || (key === 'Escape' && !reading && S.scene !== 'levels')) openSettings();
  else if (reading) updateCards(dt, pressed);
  else if (S.scene === 'title' && pressed && key !== 'KeyM' && key !== 'KeyF') {   // (M is mute, F full screen: not "any key")
    // Browsers keep a page silent until a key is pressed. If this press is what woke the sound, it
    // starts the title's music; the next one begins. (After that, one press begins.)
    const justWoke = soundAge() < .3 && S.musicOn && !S.muted;
    if (!justWoke) begin(0);
  }
  else if (S.scene === 'levels') updateMenu(dt, key, click, begin, toTitle);
  else if (S.scene === 'beach') updateBeach(dt, skipped => { if (skipped) startLevel(); else { S.scene = 'white'; S.sceneT = 0; } });
  else if (S.scene === 'white' && S.sceneT > BEACH.whiteTime) showCards(WAKE_CARDS, startLevel, { paper: true });   // a silence, then the cards on the white
  else if (S.scene === 'end' && pressed && S.sceneT > 2.5) { if (LEVELS[S.level.number + 1]) begin(S.level.number + 1); else toTitle(); }   // on to the next level, if it's built
  else if (S.scene === 'tide') updateTide(dt, win);
  else if (S.scene === 'dawn' && S.level.number === 2) {   // Level 2's new tomorrow: the same timing as the sea's, below
    if (S.sceneT > .9 && S.sceneT - dt <= .9) retryTide();
    if (S.sceneT > 1.7) { S.scene = 'tide'; S.sceneT = 1; }
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
      // Level 1: a second after play fades in, Ichigo calls for their mother. Small and grey: no one answers.
      if (S.level.number === 1 && S.levelT > 1.5 && S.levelT - dt <= 1.5) say('ichigo', ['kaachan'], { grey: true, small: true, time: 2.5 });
    }
    // Level 1 is all waves: a little way out on them, Ichigo has a word for the sea
    if (S.scene === 'play' && PL.x > 720 && PL.ground && !S.words.includes('umi')) { say('ichigo', ['umi'], { note: true, time: 2 }); learnWord('umi'); }
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
  else music(S.scene === 'play' || S.scene === 'tide' ? 1 : S.scene === 'dawn' ? .25 : S.scene === 'white' && reading ? .6 : 0, tide && !morning ? 'night' : 'sea', tide && !morning ? [0, 3, 5, 9][N.set] : 0);   // (the level list: just the sea)
  if (S.scene === 'play' || (S.scene === 'dawn' && !tide)) seaSound(.45 + .45 * Math.min(1, PL.x / ((S.level.sea && S.level.sea.growOver) || 5200)));
  else if (S.scene === 'end') seaSound(.25);   // a calm night sea
  else if (S.scene === 'levels') seaSound(.3);
  else if (S.scene === 'title') seaSound(0);
  gulls(S.scene === 'play' || (tide && morning) || (S.scene === 'beach' && B.phase !== 'recede'));   // (they fall silent when the sea pulls back)

  // draw (the camera moves in whole pixels so nothing shimmers)
  const cam = S.camX; S.camX = Math.round(S.camX / PIXEL) * PIXEL;
  if (S.scene === 'title') drawTitle(); else if (S.scene === 'levels') drawMenu(); else if (S.scene === 'prologue') drawPrologue(); else if (S.scene === 'beach') drawBeachScene(); else if (S.scene === 'white') drawWhite(); else if (S.level.number === 2) drawTide(); else drawPlay();
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
window.ichigo = { S, PL, input, keys, startLevel, begin, spawn, beach: B, tide: N, save, cards: { active: cardsActive, next: nextCard } };
