// ============================================================================
// input.js — keyboard and touch controls.
// ============================================================================
import { canvas } from './pixel.js';
import { LW, LH } from './config.js';

export const keys = {};
const touch = { left: 0, right: 0, run: 0, jump: 0, use: 0 };
// jumpBuffer: a jump pressed slightly early still counts. usePressed: the use button was just pressed
// (cleared by whoever acts on it).
// key: the last key pressed (its code), and click: where the screen was last clicked or tapped (in
// pixels), for the menus; both are cleared every frame by main.js.
export const input = { jumpBuffer: 0, usePressed: false, anyPressed: false, key: null, click: null };

const JUMP_KEYS = ['Space', 'ArrowUp', 'KeyW', 'KeyZ'];
const USE_KEYS = ['ArrowDown', 'KeyS', 'KeyE'];   // "use": dig, fill the bucket, pour it
addEventListener('keydown', e => {
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'Tab'].includes(e.code)) e.preventDefault();
  if (!keys[e.code] && JUMP_KEYS.includes(e.code)) input.jumpBuffer = 0.14;
  if (!keys[e.code] && USE_KEYS.includes(e.code)) input.usePressed = true;
  if (!e.repeat) input.key = e.code;
  keys[e.code] = true; input.anyPressed = true;
});
addEventListener('keyup', e => { keys[e.code] = false; });

export const inLeft = () => keys.ArrowLeft || keys.KeyA || touch.left;
export const inRight = () => keys.ArrowRight || keys.KeyD || touch.right;
export const inRun = () => keys.ShiftLeft || keys.ShiftRight || keys.KeyX || touch.run;
export const inJump = () => JUMP_KEYS.some(k => keys[k]) || touch.jump;
export const inUse = () => USE_KEYS.some(k => keys[k]) || touch.use;

if ('ontouchstart' in window) {   // on-screen buttons for phones and tablets
  document.getElementById('touch').style.display = 'flex';
  document.querySelectorAll('.tb').forEach(b => {
    const k = b.dataset.k;
    const on = e => { e.preventDefault(); if (k === 'jump' && !touch.jump) input.jumpBuffer = 0.14; if (k === 'use' && !touch.use) input.usePressed = true; touch[k] = 1; b.classList.add('on'); input.anyPressed = true; };
    const off = e => { e.preventDefault(); touch[k] = 0; b.classList.remove('on'); };
    b.addEventListener('touchstart', on); b.addEventListener('touchend', off); b.addEventListener('touchcancel', off);
  });
}
canvas.addEventListener('pointerdown', e => {
  const r = canvas.getBoundingClientRect();
  input.click = { x: (e.clientX - r.left) / r.width * LW, y: (e.clientY - r.top) / r.height * LH };
  input.anyPressed = true;
});
