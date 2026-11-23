// ============================================================================
// bubbles.js — speech bubbles, the game's only "dialogue". The game is wordless, so bubbles hold
// pictures (icons.js), never text:
//   • 'word': Ichigo saying one of the words they've learned. A round bubble.
//   • 'picto': anyone else, speaking in pictograms. A square bubble with a small tail.
// say() queues a bubble over a character; each speaker has one bubble at a time (a new one replaces
// the old). The scene drawing the characters says where their heads are (drawBubbles' `heads`).
// Drawn in pixels, over everything but the HUD, kept on screen at the edges.
// ============================================================================
import { P, LW } from './config.js';
import { drawIcon, drawLetters, iconSize, NOTE } from './icons.js';

const bubbles = new Map();   // who → { icons, kind, t, time, grey, big, note }

// who: 'ichigo', 'kaachan', 'ojiisan' ... icons: 1–4 icon names.
// Options: kind ('word' for Ichigo, else 'picto'), time (seconds on screen), grey (greyed out),
// small (single-size icons), note (a musical note beside the word as it's spoken).
export function say(who, icons, { kind = who === 'ichigo' ? 'word' : 'picto', time = 2.5, grey = false, small = false, note = false } = {}) {
  bubbles.set(who, { icons, kind, t: 0, time, grey, big: !small, note });
}
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
  const w = pad * 2 + noteW + b.icons.length * s + (b.icons.length - 1) * gap + 2, h = pad * 2 + s + 2;
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
  let ix = x + pad + 1;
  if (showNote) { drawLetters(g, NOTE, ix, y + pad + 1 + Math.round((s - NOTE.length) / 2) + (b.t * 6 % 2 < 1 ? 0 : -1), b.grey); ix += noteW; }
  for (const name of b.icons) { drawIcon(g, name, ix, y + pad + 1, { grey: b.grey, big: b.big }); ix += s + gap; }
}
