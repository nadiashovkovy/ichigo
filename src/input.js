// ============================================================================
// input.js — keyboard and touch controls.
// ============================================================================
import { canvas } from './pixel.js';

export const keys = {};
const touch = { left: 0, right: 0, run: 0, jump: 0 };
export const input = { jumpBuffer: 0, anyPressed: false };   // jumpBuffer: a jump pressed slightly early still counts

const JUMP_KEYS = ['Space', 'ArrowUp', 'KeyW', 'KeyZ'];
addEventListener('keydown', e => {
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) e.preventDefault();
  if (!keys[e.code] && JUMP_KEYS.includes(e.code)) input.jumpBuffer = 0.14;
  keys[e.code] = true; input.anyPressed = true;
});
addEventListener('keyup', e => { keys[e.code] = false; });

export const inLeft = () => keys.ArrowLeft || keys.KeyA || touch.left;
export const inRight = () => keys.ArrowRight || keys.KeyD || touch.right;
export const inRun = () => keys.ShiftLeft || keys.ShiftRight || keys.KeyX || touch.run;
export const inJump = () => JUMP_KEYS.some(k => keys[k]) || touch.jump;

if ('ontouchstart' in window) {   // on-screen buttons for phones and tablets
  document.getElementById('touch').style.display = 'flex';
  document.querySelectorAll('.tb').forEach(b => {
    const k = b.dataset.k;
    const on = e => { e.preventDefault(); if (k === 'jump' && !touch.jump) input.jumpBuffer = 0.14; touch[k] = 1; b.classList.add('on'); input.anyPressed = true; };
    const off = e => { e.preventDefault(); touch[k] = 0; b.classList.remove('on'); };
    b.addEventListener('touchstart', on); b.addEventListener('touchend', off); b.addEventListener('touchcancel', off);
  });
}
canvas.addEventListener('pointerdown', () => { input.anyPressed = true; });
