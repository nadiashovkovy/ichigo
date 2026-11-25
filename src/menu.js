// ============================================================================
// menu.js — the list of all levels, opened from the title (L, or click "ALL LEVELS"). Each level
// shows whether it's unlocked: Level 0 (the prologue) and Level 1 always are; each finished level
// unlocks the next (S.done, kept in the save). Levels not built yet say so when chosen.
// Arrows (or W/S) choose, Enter/Space plays, Esc goes back; or click a level.
// Drawn over the game's own dusk sky and sea, in the pixel font.
// ============================================================================
import { P, LW, LH, TOP_PX, PIXEL } from './config.js';
import { S } from './state.js';
import { lg, beginWorld, pixelSpace } from './pixel.js';
import { pixelText, LETTER, LINE } from './text.js';
import { drawScenery, drawChartSea } from './art.js';

export const LEVEL_NAMES = [
  'PROLOGUE', 'THE GREAT WAVE', 'THE TIDE COMES IN', 'THE SLEEPY ISLAND', 'THE LIGHTHOUSE',
  'THE STORM', 'SHIP GRAVEYARD', 'THE KELP GARDEN', 'LANTERN CAVE', 'SINGING ROCKS',
  'WHIRLPOOL STRAIT', "THE FISHERMEN'S ISLAND", 'THE KIND HOUSE', 'THE RAFT HOME', 'THE LAST STORM', 'HOME',
];
export const BUILT = [0, 1, 2, 3, 4, 5];   // the levels that can be played so far
export const unlocked = n => n <= 1 || S.done.has(n - 1);

const M = { sel: 1, note: 0 };   // the chosen level; how long the "not built yet" note has left
export function openMenu() { S.scene = 'levels'; S.sceneT = 0; M.sel = Math.max(...BUILT.filter(unlocked)); M.note = 0; }

// The two columns of the list, and where each row is (pixels).
function layout() {
  const colW = Math.floor((LW - 48) / 2), rowH = LINE + 6, top = Math.max(56, Math.round((LH - 8 * rowH) / 2) + 6);
  return n => ({ x: 24 + (n >= 8 ? colW : 0), y: top + (n % 8) * rowH, w: colW - 6, h: rowH - 2 });
}

// key: the key just pressed; click: where the screen was clicked. play(n): start level n; back(): the title.
export function updateMenu(dt, key, click, play, back) {
  M.note = Math.max(0, M.note - dt);
  const choose = n => { if (!unlocked(n)) return; if (BUILT.includes(n)) play(n); else M.note = 1.6; };
  if (key === 'Escape' || key === 'Backspace') return back();
  if (key === 'ArrowDown' || key === 'KeyS') M.sel = (M.sel + 1) % 16;
  if (key === 'ArrowUp' || key === 'KeyW') M.sel = (M.sel + 15) % 16;
  if (key === 'ArrowRight' || key === 'KeyD' || key === 'ArrowLeft' || key === 'KeyA') M.sel = (M.sel + 8) % 16;
  if (key === 'Enter' || key === 'Space') choose(M.sel);
  if (click) {
    const row = layout();
    for (let n = 0; n < 16; n++) { const r = row(n); if (click.x >= r.x && click.x < r.x + r.w && click.y >= r.y && click.y < r.y + r.h) { M.sel = n; choose(n); } }
  }
}

// A little padlock, 7×8 pixels.
const LOCK = ['..KKK..', '.K...K.', '.K...K.', 'KKKKKKK', 'KGGGGGK', 'KGG.GGK', 'KGGGGGK', 'KKKKKKK'];

export function drawMenu() {
  beginWorld(); drawScenery(lg, S.T * 12, S.T, { view: 'dusk' });   // the game's dusk sky, drifting slowly by
  drawChartSea(lg, S.T * 12, S.T, wx => 430 + Math.sin(wx * .015 - S.T * 1.2) * 5);
  pixelSpace(lg);
  const row = layout(), first = row(0), last = row(15);
  // the panel, like the story cards': night, edged in pale ink
  const px0 = first.x - 10, py0 = first.y - 40, pw = LW - 2 * px0, ph = last.y + last.h - py0 + 34;
  lg.fillStyle = P.mist; lg.fillRect(px0 - 2, py0 - 2, pw + 4, ph + 4);
  lg.fillStyle = P.night; lg.fillRect(px0, py0, pw, ph);
  pixelText('ALL LEVELS', LW / 2, py0 + 12, P.gold, 'center');
  for (let n = 0; n < 16; n++) {
    const r = row(n), open = unlocked(n), sel = n === M.sel;
    if (sel) { lg.fillStyle = P.indigo; lg.fillRect(r.x - 4, r.y - 2, r.w, r.h); }
    const ink = !open ? P.grey3 : sel ? P.gold : BUILT.includes(n) ? P.mist : P.grey1;
    if (open) pixelText(String(n), r.x + 2 * LETTER - 2, r.y + 2, ink, 'right');
    else LOCK.forEach((line, j) => [...line].forEach((ch, i) => { if (ch !== '.') { lg.fillStyle = ch === 'K' ? P.grey1 : P.grey2; lg.fillRect(r.x + 8 + i, r.y + 3 + j, 1, 1); } }));
    let name = LEVEL_NAMES[n]; const room = Math.floor((r.w - 3 * LETTER) / LETTER);
    if (name.length > room) name = name.replace(/^THE /, '');   // (a long name loses its THE)
    pixelText(name.length > room ? name.slice(0, room - 1) + '.' : name, r.x + 3 * LETTER, r.y + 2, ink);
  }
  const foot = py0 + ph - 22;
  if (M.note > 0) pixelText('NOT BUILT YET', LW / 2, foot, P.ember, 'center');
  else pixelText('ENTER: PLAY   ESC: BACK', LW / 2, foot, P.grey1, 'center');
}
