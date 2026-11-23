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
import { B, startBeach, updateBeach, drawBeachScene, drawWhite, WAKE_CARDS } from './beach.js';
import { showCards, cardsActive, updateCards, nextCard, drawCards } from './cards.js';
import { say, updateBubbles } from './bubbles.js';
import { playLullaby, music, seaSound, gulls } from './audio.js';
import { loadSave, save } from './save.js';
import { prepareDawns } from './dawn.js';

// Which level to load. Later this will be chosen by the game's progress.
const LEVEL_FILE = 'levels/level01.json';

async function loadLevel(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Couldn't load ${path} (${res.status})`);
  S.level = await res.json();
  S.plats = buildWreckage(S.level);
  S.checkpoint = S.plats[0];
}

loadSave();   // the words, marks and tomorrows Ichigo carries (save.js)

let last = performance.now(), lastScene = S.scene;
function frame(now) {
  if (!pc.on) {   // the PC is switched off: the game waits, exactly where it was
    last = now; input.anyPressed = false; requestAnimationFrame(frame); return;
  }
  const dt = Math.max(0.004, Math.min(0.033, (now - last) / 1000)); last = now;
  S.T += dt; S.sceneT += dt;
  const pressed = input.anyPressed; input.anyPressed = false;

  // move between scenes
  // (while a story card is up, the world waits: see cards.js)
  const reading = cardsActive();
  if (reading) updateCards(dt, pressed);
  else if (S.scene === 'title' && pressed) startBeach();
  else if (S.scene === 'beach') updateBeach(dt, skipped => { if (skipped) startLevel(); else { S.scene = 'white'; S.sceneT = 0; } });
  else if (S.scene === 'white' && S.sceneT > BEACH.whiteTime) showCards(WAKE_CARDS, startLevel, { paper: true });   // a silence, then the cards on the white
  else if (S.scene === 'end' && pressed && S.sceneT > 2.5) { S.scene = 'title'; S.sceneT = 0; }

  // update the world
  if (!reading && (S.scene === 'play' || S.scene === 'dawn' || S.scene === 'end')) {
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
    const target = Math.max(0, Math.min(S.level.length - W, PL.x - W * 0.38));
    S.camX += (target - S.camX) * Math.min(1, dt * 5);
  }

  updateBubbles(dt);
  if (S.scene !== lastScene) {   // arriving in a scene
    if (S.scene === 'dawn') { playLullaby({ notes: 2, delay: .7 }); save(); }   // a new tomorrow: the Lullaby's first two notes (after the splash)
    if (S.scene === 'end') save();
    lastScene = S.scene;
  }

  // the music and the sea. The music plays on the sea level, held quietly under a new tomorrow's
  // Lullaby; the sea is heard wherever there's water, its waves louder as they grow along the level.
  // (The beach sets its own sea sound; the white is silent.)
  music(S.scene === 'play' ? 1 : S.scene === 'dawn' ? .25 : 0);
  if (S.scene === 'play' || S.scene === 'dawn') seaSound(.45 + .45 * Math.min(1, PL.x / ((S.level.sea && S.level.sea.growOver) || 5200)));
  else if (S.scene === 'end') seaSound(.25);   // a calm night sea
  else if (S.scene === 'title') seaSound(0);
  gulls(S.scene === 'play' || (S.scene === 'beach' && B.phase !== 'recede'));   // (they fall silent when the sea pulls back)

  // draw (the camera moves in whole pixels so nothing shimmers)
  const cam = S.camX; S.camX = Math.round(S.camX / PIXEL) * PIXEL;
  if (S.scene === 'title') drawTitle(); else if (S.scene === 'beach') drawBeachScene(); else if (S.scene === 'white') drawWhite(); else drawPlay();
  S.camX = cam;
  drawCards();
  present();
  requestAnimationFrame(frame);
}

loadLevel(LEVEL_FILE).then(() => { requestAnimationFrame(frame); prepareDawns(); }).catch(err => {
  document.body.insertAdjacentHTML('beforeend', `<pre style="position:fixed;top:10px;left:10px;color:#b8322a">${err.message}\nIf you opened index.html straight from your computer, run a small local server instead (see README).</pre>`);
});

let resized; addEventListener('resize', () => { clearTimeout(resized); resized = setTimeout(prepareDawns, 300); });   // (full screen has its own size of print)

// Handy for testing in the browser console: window.ichigo.S, window.ichigo.PL …
import { keys } from "./input.js";
window.ichigo = { S, PL, input, keys, startLevel, spawn, beach: B, save, cards: { active: cardsActive, next: nextCard } };
