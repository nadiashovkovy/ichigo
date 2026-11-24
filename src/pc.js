// ============================================================================
// pc.js — the PC monitor around the game: works its power button, and full screen. (It also has the
// chunky mid-90s keyboard that sat under the monitor, whose keys press along with the real ones:
// commented out for now, as are its parts of index.html and css/style.css.)
// ============================================================================
import { soundPower } from './audio.js';

/* (the keyboard, switched off)
// --- the keyboard: a 1990s 101-key layout, in key units (1 = one letter key) ---
// Each key: [x, y, w, h, label, code, grey]. grey = a darker grey keycap (modifiers, function keys...)
const keys = [];
const row = (y, x, list, grey = false) => {   // list of [label, code, width, grey] / numbers for gaps
  for (const k of list) {
    if (typeof k === 'number') { x += k; continue; }
    const [label, code, w = 1, g = grey] = k;
    keys.push([x, y, w, 1, label, code, g]); x += w;
  }
};
const letters = s => [...s].map(c => [c, /[A-Z]/.test(c) ? 'Key' + c : '']);
const digits = [...'1234567890'].map(d => [d, 'Digit' + d]);
const F = n => Array.from({ length: 4 }, (_, i) => ['F' + (n + i), 'F' + (n + i)]);
const G = true;   // grey keycap
// main block (15 units wide); the function row sits apart above it, in groups of four
row(0, 0, [['Esc', 'Escape', 1, G], 1, ...F(1), .5, ...F(5), .5, ...F(9)], G);
row(1.5, 0, [['~', 'Backquote'], ...digits, ['-', 'Minus'], ['=', 'Equal'], ['Backspace', 'Backspace', 2, G]]);
row(2.5, 0, [['Tab', 'Tab', 1.5, G], ...letters('QWERTYUIOP'), ['[', 'BracketLeft'], [']', 'BracketRight'], ['\\', 'Backslash', 1.5]]);
row(3.5, 0, [['Caps Lock', 'CapsLock', 1.75, G], ...letters('ASDFGHJKL'), [';', 'Semicolon'], ["'", 'Quote'], ['Enter', 'Enter', 2.25, G]]);
row(4.5, 0, [['Shift', 'ShiftLeft', 2.25, G], ...letters('ZXCVBNM'), [',', 'Comma'], ['.', 'Period'], ['/', 'Slash'], ['Shift', 'ShiftRight', 2.75, G]]);
row(5.5, 0, [['Ctrl', 'ControlLeft', 1.5, G], 1, ['Alt', 'AltLeft', 1.5, G], ['', 'Space', 7], ['Alt', 'AltRight', 1.5, G], 1, ['Ctrl', 'ControlRight', 1.5, G]]);
// navigation keys and the inverted-T arrows, set well apart
row(0, 15.75, [['Print', 'PrintScreen'], ['Scroll', 'ScrollLock'], ['Pause', 'Pause']], G);
row(1.5, 15.75, [['Insert', 'Insert'], ['Home', 'Home'], ['Pg Up', 'PageUp']], G);
row(2.5, 15.75, [['Delete', 'Delete'], ['End', 'End'], ['Pg Dn', 'PageDown']], G);
row(4.5, 16.75, [['↑', 'ArrowUp']], G);
row(5.5, 15.75, [['←', 'ArrowLeft'], ['↓', 'ArrowDown'], ['→', 'ArrowRight']], G);
// number pad, with its two tall keys
row(1.5, 19.5, [['Num', 'NumLock', 1, G], ['/', 'NumpadDivide', 1, G], ['*', 'NumpadMultiply', 1, G], ['-', 'NumpadSubtract', 1, G]]);
row(2.5, 19.5, [['7', 'Numpad7'], ['8', 'Numpad8'], ['9', 'Numpad9']]);
row(3.5, 19.5, [['4', 'Numpad4'], ['5', 'Numpad5'], ['6', 'Numpad6']]);
row(4.5, 19.5, [['1', 'Numpad1'], ['2', 'Numpad2'], ['3', 'Numpad3']]);
row(5.5, 19.5, [['0', 'Numpad0', 2], ['.', 'NumpadDecimal']]);
keys.push([22.5, 2.5, 1, 2, '+', 'NumpadAdd', G], [22.5, 4.5, 1, 2, 'Enter', 'NumpadEnter', G]);

const board = document.querySelector('.keyboard');
const PAD_X = 1, PAD_Y = .9;   // the case around the keys, in key units
for (const [x, y, w, h, label, code, grey] of keys) {
  const k = document.createElement('i');
  k.className = 'key' + (grey ? ' grey' : '');
  k.innerHTML = `<b>${label}</b>`;   // <b> is the keycap's top; the <i> around it shows its sloped sides
  if (code) k.dataset.code = code;
  k.style.cssText = `left:calc(var(--k)*${x + PAD_X});top:calc(var(--k)*${y + PAD_Y});width:calc(var(--k)*${w});height:calc(var(--k)*${h})`;
  board.appendChild(k);
}
// the status-light panel above the number pad
board.insertAdjacentHTML('beforeend', `<span class="status" style="left:calc(var(--k)*${19.5 + PAD_X});top:calc(var(--k)*${PAD_Y})">
  <span><i></i>Num Lock</span><span><i class="on"></i>Caps Lock</span><span><i></i>Scroll Lock</span></span>`);
*/

// --- full screen (F, or in the settings) ---
// The game looks the same as in the window, just bigger. Esc (or F) leaves full screen.
const page = document.documentElement;
const fsElement = () => document.fullscreenElement || document.webkitFullscreenElement;
const fsSupported = page.requestFullscreen || page.webkitRequestFullscreen;
export const canFullscreen = !!fsSupported;
export const isFullscreen = () => !!fsElement();
export function toggleFullscreen() {
  if (fsElement()) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
  else (page.requestFullscreen || page.webkitRequestFullscreen).call(page);
}
// (Not every browser can: e.g. iPhone Safari can't make a page full screen.)
if (fsSupported) addEventListener('keydown', e => { if (e.code === 'KeyF' && !e.repeat && !e.metaKey && !e.ctrlKey) toggleFullscreen(); });

/* (the keyboard, switched off)
// press the keyboard's keys along with the real ones
const press = (e, down) => board.querySelectorAll(`[data-code="${e.code}"]`).forEach(k => k.classList.toggle('down', down));
addEventListener('keydown', e => press(e, true));
addEventListener('keyup', e => press(e, false));
addEventListener('blur', () => board.querySelectorAll('.down').forEach(k => k.classList.remove('down')));
*/

// --- the power button: switch the monitor off and on, with a CRT animation ---
// Off: the picture collapses to a bright line, then a dot, then fades (a faint afterglow lingers).
// On: the dot blooms back into a line and the picture opens up, flickering as the tube warms up.
// The game pauses while the PC is off (see main.js), and the sound stops (see audio.js).
export const pc = { on: true };
const pcEl = document.querySelector('.pc'), power = document.querySelector('.power'), pictureEl = document.querySelector('.picture');
let busy = false;
power.addEventListener('click', () => {
  if (busy) return;
  busy = true; power.blur();
  const turningOff = pc.on;
  soundPower(!turningOff);   // (as soon as the button is pressed, not when the picture has gone)
  power.setAttribute('aria-pressed', String(!turningOff));
  if (turningOff) pcEl.classList.add('powering-off');
  else { pcEl.classList.remove('off'); pcEl.classList.add('powering-on'); pc.on = true; }
  pictureEl.addEventListener('animationend', () => {
    if (turningOff) { pc.on = false; pcEl.classList.add('off'); }
    pcEl.classList.remove('powering-off', 'powering-on');
    busy = false;
  }, { once: true });
});
