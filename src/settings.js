// ============================================================================
// settings.js — the settings panel, always within reach: a little gear in the bottom-right corner of
// the screen (click or tap it), or P (or Esc). The game waits while it's open.
// In it: resume; the controls; the list of all levels; restart the level; all sound on/off (as M does),
// music, sound effects and volume; story cards on or off; full screen; quit to the title; erase the save.
// Arrows choose (left and right change a setting too), Enter does it, P or Esc closes; or click.
// Drawn like the story cards and the level list: a night panel edged in pale ink, the pixel font.
// ============================================================================
import { P, LW, LH } from './config.js';
import { S } from './state.js';
import { lg, pixelSpace } from './pixel.js';
import { pixelText, LETTER, LINE } from './text.js';
import { save, eraseSave } from './save.js';
import { applyLevels } from './audio.js';
import { canFullscreen, isFullscreen, toggleFullscreen } from './pc.js';

// The gear, in the bottom-right corner (nothing else is drawn there, and it's drawn last, over
// everything). A round gear of eight square teeth, a ring and a hole in the middle, drawn pixel by
// pixel, pale and outlined in ink so it shows on sand, sea and sky alike.
const GEAR_SIZE = 32, GEAR_MARGIN = 14;   // (in from the corner: the screen's glass is rounded there)
const GEAR = (() => {
  const n = GEAR_SIZE, c = (n - 1) / 2, grid = [];
  for (let y = 0; y < n; y++) {
    grid.push([]);
    for (let x = 0; x < n; x++) {
      const dx = x - c, dy = y - c, r = Math.hypot(dx, dy);
      const k = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * Math.PI / 4;      // the nearest of the eight teeth
      const across = Math.abs(-dx * Math.sin(k) + dy * Math.cos(k));              // how far to the side of its centre line
      const body = r <= 10.5 || (across <= 2.8 && r <= 14.5);                      // square-sided teeth
      grid[y].push(!body ? '.' : r < 3.6 ? 'H' : r < 5.8 ? 'S' : 'W');   // W: the gear; S: a ring round the hole; H: the hole
    }
  }
  return grid.map((row, y) => row.map((ch, x) => {   // ink outline round the edge (outside, and round the hole)
    if (ch !== '.' && ch !== 'H') return ch;
    const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([i, j]) => 'WS'.includes((grid[y + j] || [])[x + i] || '.'));
    return near ? 'K' : ch;
  }).join(''));
})();
const gearBox = () => ({ x: LW - GEAR_SIZE - GEAR_MARGIN, y: LH - GEAR_SIZE - GEAR_MARGIN, w: GEAR_SIZE, h: GEAR_SIZE });
export const onGear = c => { const b = gearBox(); return c && c.x >= b.x - 4 && c.x < b.x + b.w + 4 && c.y >= b.y - 4 && c.y < b.y + b.h + 4; };

const V = { sel: 0, page: 'main', sure: 0 };   // the chosen row; 'main' or 'controls'; erase asked once
const VOLUMES = [.25, .5, .75, 1];
const onOff = b => (b ? 'ON' : 'OFF');

// The rows, for the scene we're in. Each: [label, what Enter does, what left/right do (or nothing)].
// act: the game's own actions (main.js): { levels, title, restart, inLevel }.
function rows(act) {
  const vol = d => { const i = VOLUMES.indexOf(S.volume); S.volume = VOLUMES[Math.max(0, Math.min(3, (i < 0 ? 3 : i) + d))]; applyLevels(); save(); };
  const flip = k => () => { S[k] = !S[k]; applyLevels(); save(); };
  const list = [
    ['RESUME', close],
    ['CONTROLS', () => { V.page = 'controls'; }],
  ];
  if (S.scene !== 'levels') list.push(['ALL LEVELS', () => { close(); act.levels(); }]);
  if (act.inLevel()) list.push(['RESTART LEVEL', () => { close(); act.restart(); }]);
  list.push(
    [`ALL SOUND: ${onOff(!S.muted)}`, flip('muted'), flip('muted')],   // (the same as M)
    [`MUSIC: ${onOff(S.musicOn)}`, flip('musicOn'), flip('musicOn')],
    [`SOUND EFFECTS: ${onOff(S.sfxOn)}`, flip('sfxOn'), flip('sfxOn')],
    [`VOLUME: ${Math.round(S.volume * 100)}%`, () => vol(S.volume >= 1 ? -3 : 1), vol],
    [`STORY CARDS: ${onOff(S.cardsOn)}`, flip('cardsOn'), flip('cardsOn')],
  );
  if (canFullscreen) list.push([`FULL SCREEN: ${onOff(isFullscreen())}`, toggleFullscreen, toggleFullscreen]);
  if (S.scene !== 'title') list.push(['QUIT TO TITLE', () => { close(); act.title(); }]);
  list.push([V.sure ? 'ERASE SAVE: SURE' : 'ERASE SAVE', () => {   // (asks once more before forgetting everything)
    if (!V.sure) { V.sure = 3; return; }
    eraseSave(); V.sure = 0; close(); act.title();
  }]);
  return list;
}

const CONTROLS = [
  ['<- ->', 'WALK'], ['SHIFT', 'RUN'], ['SPACE', 'JUMP (HOLD: HIGHER)'], ['DOWN', 'DIG, PILE, FILL, POUR'],
  ['P', 'SETTINGS'], ['M', 'SOUND ON / OFF'], ['F', 'FULL SCREEN'], ['ESC', 'SKIP STORY CARDS'],
];

export function openSettings() { S.settingsOpen = true; V.sel = 0; V.page = 'main'; V.sure = 0; }
function close() { S.settingsOpen = false; }

// Layout of the panel's rows (pixels).
function layout(n) {
  const rowH = LINE + 4, w = Math.min(LW - 60, 420), h = 46 + n * rowH + 30;
  const x = Math.round((LW - w) / 2), y = Math.max(8, Math.round((LH - h) / 2));
  return { x, y, w, h, row: i => ({ x: x + 16, y: y + 40 + i * rowH, w: w - 32, h: rowH - 2 }) };
}

// key: the key just pressed; click: where the screen was clicked. Called every frame while open.
export function updateSettings(dt, key, click, act) {
  V.sure = Math.max(0, V.sure - dt);
  if (V.page === 'controls') { if (key || click) V.page = 'main'; return; }
  if (key === 'Escape' || key === 'KeyP' || onGear(click)) return close();
  const list = rows(act), L = layout(list.length);
  V.sel = Math.min(V.sel, list.length - 1);
  if (key === 'ArrowDown' || key === 'KeyS') V.sel = (V.sel + 1) % list.length;
  if (key === 'ArrowUp' || key === 'KeyW') V.sel = (V.sel + list.length - 1) % list.length;
  if ((key === 'ArrowLeft' || key === 'KeyA') && list[V.sel][2]) list[V.sel][2](-1);
  if ((key === 'ArrowRight' || key === 'KeyD') && list[V.sel][2]) list[V.sel][2](1);
  if (key === 'Enter' || key === 'Space') list[V.sel][1]();
  if (click) list.forEach((r, i) => { const b = L.row(i); if (click.x >= b.x && click.x < b.x + b.w && click.y >= b.y && click.y < b.y + b.h) { V.sel = i; r[1](); } });
}

function panel(x, y, w, h, title) {
  lg.fillStyle = P.mist; lg.fillRect(x - 2, y - 2, w + 4, h + 4);
  lg.fillStyle = P.night; lg.fillRect(x, y, w, h);
  pixelText(title, LW / 2, y + 12, P.gold, 'center');
}

// The gear, always (lit while the panel is open); and the panel, when it's open.
export function drawSettings(act) {
  pixelSpace(lg);
  if (S.settingsOpen) drawPanel(act);
  // the gear, last of all, so nothing ever covers it (gold while the panel is open)
  const g = gearBox(), open = S.settingsOpen;
  const COL = { K: P.outline, H: P.outline, W: open ? P.gold : P.mist, S: open ? P.ochre : P.grey1 };
  GEAR.forEach((r, j) => [...r].forEach((ch, i) => { if (ch !== '.') { lg.fillStyle = COL[ch]; lg.fillRect(g.x + i, g.y + j, 1, 1); } }));
}
function drawPanel(act) {
  if (V.page === 'controls') {
    const L = layout(CONTROLS.length);
    panel(L.x, L.y, L.w, L.h, 'CONTROLS');
    CONTROLS.forEach(([k, what], i) => { const r = L.row(i); pixelText(k, r.x + 6 * LETTER, r.y + 2, P.gold, 'right'); pixelText(what, r.x + 7 * LETTER, r.y + 2, P.mist); });
    pixelText('PRESS ANY KEY', LW / 2, L.y + L.h - 22, P.grey1, 'center');
    return;
  }
  const list = rows(act), L = layout(list.length);
  panel(L.x, L.y, L.w, L.h, 'SETTINGS');
  list.forEach(([label, , side], i) => {
    const r = L.row(i), sel = i === V.sel;
    if (sel) { lg.fillStyle = P.indigo; lg.fillRect(r.x - 4, r.y - 2, r.w + 8, r.h); }
    pixelText((sel && side ? '< ' : '') + label + (sel && side ? ' >' : ''), LW / 2, r.y + 2, sel ? P.gold : P.mist, 'center');
  });
  pixelText('P: CLOSE', LW / 2, L.y + L.h - 22, P.grey1, 'center');
}
