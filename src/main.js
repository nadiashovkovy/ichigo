// ============================================================================
// main.js — the starting point. Loads the level, then runs the game loop ~60 times a second:
// update everything a little, then draw a frame.
// ============================================================================
import { pc } from './pc.js';   // the PC around the game (keyboard, power button); loaded first so the page is complete before sizing
import { W, PIXEL } from './config.js';
import { S } from './state.js';
import { present } from './pixel.js';
import { input } from './input.js';
import { buildWreckage, updateWreckage } from './wreckage.js';
import { PL, spawn, updatePlayer, updateParts } from './player.js';
import { startLevel, drawTitle, drawIntro, drawPlay } from './scenes.js';
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

let last = performance.now();
function frame(now) {
  if (!pc.on) {   // the PC is switched off: the game waits, exactly where it was
    last = now; input.anyPressed = false; requestAnimationFrame(frame); return;
  }
  const dt = Math.max(0.004, Math.min(0.033, (now - last) / 1000)); last = now;
  S.T += dt; S.sceneT += dt;
  const pressed = input.anyPressed; input.anyPressed = false;

  // move between scenes
  if (S.scene === 'title' && pressed) { S.scene = 'intro'; S.sceneT = 0; }
  else if (S.scene === 'intro' && (S.sceneT > 5.2 || (pressed && S.sceneT > .4))) startLevel();
  else if (S.scene === 'end' && pressed && S.sceneT > 2.5) { S.scene = 'title'; S.sceneT = 0; }

  // update the world
  if (S.scene === 'play' || S.scene === 'dawn' || S.scene === 'end') {
    updateWreckage(S.T, dt, PL);
    if (S.scene === 'play') updatePlayer(dt);
    if (S.scene === 'dawn' && S.sceneT > 0.9 && S.sceneT - dt <= 0.9) spawn();   // respawn while the sun is up
    if (S.scene === 'dawn' && S.sceneT > 1.7) { S.scene = 'play'; S.sceneT = 0; }
    updateParts(dt);
    const target = Math.max(0, Math.min(S.level.length - W, PL.x - W * 0.38));
    S.camX += (target - S.camX) * Math.min(1, dt * 5);
  }

  // draw (the camera moves in whole pixels so nothing shimmers)
  const cam = S.camX; S.camX = Math.round(S.camX / PIXEL) * PIXEL;
  if (S.scene === 'title') drawTitle(); else if (S.scene === 'intro') drawIntro(S.sceneT); else drawPlay();
  S.camX = cam;
  present();
  requestAnimationFrame(frame);
}

loadLevel(LEVEL_FILE).then(() => { requestAnimationFrame(frame); prepareDawns(); }).catch(err => {
  document.body.insertAdjacentHTML('beforeend', `<pre style="position:fixed;top:10px;left:10px;color:#b8322a">${err.message}\nIf you opened index.html straight from your computer, run a small local server instead (see README).</pre>`);
});

let resized; addEventListener('resize', () => { clearTimeout(resized); resized = setTimeout(prepareDawns, 300); });   // (full screen has its own size of print)

// Handy for testing in the browser console: window.ichigo.S, window.ichigo.PL …
import { keys } from "./input.js";
window.ichigo = { S, PL, input, keys, startLevel, spawn };
