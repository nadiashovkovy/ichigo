// ============================================================================
// cards.js — story cards: short lines of text the player reads and clicks through, at the start of
// the beach and in the white after the wave. They tell the story so far and what to do.
// (The game is otherwise wordless during play: see CLAUDE.md. Cards come between moments, and the
// world waits while one is up.)
// Any key or click shows the whole card at once, then moves on; Esc skips the rest.
// The text types itself out a letter at a time, in the game's bitmap font (text.js).
// ============================================================================
import { P, LW, LH } from './config.js';
import { lg, pixelSpace } from './pixel.js';
import { pixelText, LETTER, LINE } from './text.js';
import { keys } from './input.js';

const SPEED = 45;   // letters a second
const C = { list: [], i: 0, t: 0, done: null, paper: false };

// list: the cards' texts. done: what to do after the last one. paper: drawn on the white of the
// screen (after the wave) instead of in a panel over the scene.
export function showCards(list, done, { paper = false } = {}) {
  Object.assign(C, { list, i: 0, t: 0, done, paper });
}
export const cardsActive = () => C.list.length > 0;

function finish() { const done = C.done; C.list = []; C.done = null; if (done) done(); }
// The next step: show the whole card if it's still typing, else go on to the next card.
export function nextCard() {
  if (!cardsActive()) return;
  if (C.t * SPEED < C.list[C.i].length) { C.t = 99; return; }
  if (++C.i >= C.list.length) finish(); else C.t = 0;
}
// Called every frame while cards are up. pressed: a key or click this frame.
export function updateCards(dt, pressed) {
  C.t += dt;
  if (keys.Escape) { finish(); return; }
  if (pressed && C.t > .25) nextCard();   // (a moment's grace, so the press that opened the card doesn't skip it)
}

// Break a card's text into lines that fit `chars` letters.
function wrap(text, chars) {
  const lines = [''];
  for (const w of text.split(' ')) {
    const cur = lines[lines.length - 1];
    if (cur && (cur + ' ' + w).length > chars) lines.push(w); else lines[lines.length - 1] = cur ? cur + ' ' + w : w;
  }
  return lines;
}

export function drawCards() {
  if (!cardsActive()) return;
  pixelSpace(lg);
  const text = C.list[C.i], pad = 14, w = Math.min(LW - 40, 560), chars = Math.floor((w - pad * 2) / LETTER);
  const lines = wrap(text, chars), h = lines.length * LINE + pad * 2 + 14;
  const x = Math.round((LW - w) / 2), y = C.paper ? Math.round((LH - h) / 2) : 24;
  const ink = C.paper ? P.ink : P.mist;
  if (!C.paper) {   // a dark panel, edged in pale ink, over the sky
    lg.fillStyle = P.mist; lg.fillRect(x - 2, y - 2, w + 4, h + 4);
    lg.fillStyle = P.night; lg.fillRect(x, y, w, h);
  }
  let shown = Math.floor(C.t * SPEED);   // letters typed so far
  lines.forEach((line, r) => {
    const n = Math.max(0, Math.min(line.length, shown)); shown -= line.length + 1;
    if (!n) return;
    lg.save(); lg.beginPath(); lg.rect(x + pad, y + pad + r * LINE - 2, n * LETTER, LINE + 2); lg.clip();   // (only the letters typed so far)
    pixelText(line, x + pad, y + pad + r * LINE, ink);
    lg.restore();
  });
  const typed = C.t * SPEED >= text.length, foot = y + h - pad - 6;
  if (typed && Math.sin(C.t * 6) > -.2) pixelText(C.i < C.list.length - 1 ? '>' : '>>', x + w - pad, foot, ink, 'right');   // press to go on
  if (C.i === 0) pixelText('ESC: SKIP', x + pad, foot, P.grey2);
}
