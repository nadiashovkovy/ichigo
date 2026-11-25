// ============================================================================
// bubbles.js — speech bubbles:
//   • 'word': Ichigo saying one of the words they've learned, as its picture (icons.js). A round bubble.
//   • 'picto': anyone else, speaking in pictograms, a short line of text, or both. A square bubble with
//     a small tail.
// say() queues a bubble over a character; each speaker has one bubble at a time (a new one replaces
// the old). The scene drawing the characters says where their heads are (drawBubbles' `heads`).
// Drawn in pixels, over everything but the HUD, kept on screen at the edges.
// ============================================================================
import { P, LW, ICHIGO_SPEAKS } from './config.js';
import { drawIcon, drawLetters, iconSize, NOTE } from './icons.js';
import { pixelText, LETTER, LINE } from './text.js';

const bubbles = new Map();   // who → { icons, kind, t, time, grey, big, note }

// who: 'ichigo', 'kaachan', 'ojiisan' ... icons: 1–4 icon names.
// Options: kind ('word' for Ichigo, else 'picto'), time (seconds on screen), grey (greyed out),
// text (a line of speech), small (single-size icons), note (a musical note beside the word as it's spoken).
export function say(who, icons, { kind = who === 'ichigo' ? 'word' : 'picto', time = 2.5, grey = false, small = false, note = false, text = '' } = {}) {
  if (who === 'ichigo' && !ICHIGO_SPEAKS) return;   // (Ichigo is mute)
  bubbles.set(who, { icons, kind, t: 0, time, grey, big: !small, note, lines: text ? wrap(text) : [] });
}
// (broken into lines of 22 letters or so)
function wrap(text) { const out = ['']; for (const w of text.split(' ')) { const c = out[out.length - 1]; if (c && (c + ' ' + w).length > 22) out.push(w); else out[out.length - 1] = c ? c + ' ' + w : w; } return out; }
export function hush(who) { bubbles.delete(who); }
export const saying = who => bubbles.has(who);
export function clearBubbles() { bubbles.clear(); }
export function updateBubbles(dt) {
  for (const [who, b] of bubbles) if ((b.t += dt) > b.time) bubbles.delete(who);
}

// heads: { who: [x, y] }, the top of each speaker's head in pixels (speakers not listed aren't drawn).
export function drawBubbles(g, heads) {
  for (const [who, b] of bubbles) if (heads[who]) drawBubble(g, b, ...heads[who]);
}

function drawBubble(g, b, hx, hy) {
  const s = iconSize(b.big), gap = 2, pad = 3;
  const showNote = b.note && b.t < 1;   // the note, while the word is being said
  const noteW = showNote ? NOTE[0].length + gap : 0;
  const iconsW = b.icons.length ? noteW + b.icons.length * s + (b.icons.length - 1) * gap : 0, textW = b.lines.length ? Math.max(...b.lines.map(l => l.length)) * LETTER + 8 : 0;
  const w = pad * 2 + Math.max(iconsW, textW) + 2, h = pad * 2 + (b.icons.length ? s : 0) + (b.lines.length ? b.lines.length * LINE + 2 : 0) + 2;
  const tail = b.kind === 'word' ? 6 : 5;
  const x = Math.max(2, Math.min(LW - w - 2, Math.round(hx - w / 2))), y = Math.max(2, Math.round(hy - h - tail - 2));
  const tx = Math.max(x + 4, Math.min(x + w - 5, Math.round(hx)));   // where the tail leaves the bubble
  // the bubble: an ink border round white; round corners for a word, square for a pictogram
  const r = b.kind === 'word' ? 2 : 0;
  g.fillStyle = P.outline;
  g.fillRect(x + r, y, w - r * 2, h); g.fillRect(x, y + r, w, h - r * 2);
  if (r) { g.fillRect(x + 1, y + 1, w - 2, h - 2); }
  g.fillStyle = P.white;
  g.fillRect(x + 1 + r, y + 1, w - 2 - r * 2, h - 2); g.fillRect(x + 1, y + 1 + r, w - 2, h - 2 - r * 2);
  if (r) g.fillRect(x + 2, y + 2, w - 4, h - 4);
  if (b.kind === 'word') {   // a word: two little dots trailing down to Ichigo
    for (const [dx, dy, n] of [[0, 1, 3], [1, 4, 2]]) {
      g.fillStyle = P.outline; g.fillRect(tx + dx - 1, y + h + dy - 1, n + 2, n + 2);
      g.fillStyle = P.white; g.fillRect(tx + dx, y + h + dy, n, n);
    }
  } else {                   // a pictogram: a small pointed tail
    for (let i = 0; i < tail; i++) {
      const half = Math.max(0, 3 - i);
      g.fillStyle = P.outline; g.fillRect(tx - half - 1, y + h - 1 + i, half * 2 + 3, 1);
      if (half > 0 && i < tail - 1) { g.fillStyle = P.white; g.fillRect(tx - half, y + h - 1 + i, half * 2 + 1, 1); }
    }
  }
  b.lines.forEach((l, i) => pixelText(l, Math.round(x + w / 2), y + pad + 4 + (b.icons.length ? s : 0) + i * LINE, P.ink, 'center'));
  if (!b.icons.length) return;
  let ix = x + Math.round((w - iconsW) / 2);
  if (showNote) { drawLetters(g, NOTE, ix, y + pad + 1 + Math.round((s - NOTE.length) / 2) + (b.t * 6 % 2 < 1 ? 0 : -1), b.grey); ix += noteW; }
  for (const name of b.icons) { drawIcon(g, name, ix, y + pad + 1, { grey: b.grey, big: b.big }); ix += s + gap; }
}
