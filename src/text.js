// ============================================================================
// text.js — lettering.
//   • pixelText: a hand-made 5×7 bitmap font for small text, drawn at double detail (10×14 pixels,
//     its diagonals rounded off by Scale2x).
//   Lettering keeps its size in pixels on both screens.
//   • drawCover: big titles in the style of the novel's cover — chunky letters (Bungee font),
//     a pastel rainbow, and stacked echoes outlined in black.
// ============================================================================
import { P, RAINBOW } from './config.js';
import { lg, scale2x } from './pixel.js';

let fontsReady = false;
const cache = new Map();
document.fonts.load('40px Bungee').then(() => { fontsReady = true; cache.clear(); }).catch(() => { fontsReady = true; });
setTimeout(() => { if (!fontsReady) { fontsReady = true; cache.clear(); } }, 2500);

// Each letter is 7 rows of 5 bits.
const GLYPHS = {
  A:[14,17,17,31,17,17,17],B:[30,17,17,30,17,17,30],C:[14,17,16,16,16,17,14],D:[30,17,17,17,17,17,30],E:[31,16,16,30,16,16,31],
  F:[31,16,16,30,16,16,16],G:[14,17,16,23,17,17,15],H:[17,17,17,31,17,17,17],I:[14,4,4,4,4,4,14],J:[7,2,2,2,2,18,12],
  K:[17,18,20,24,20,18,17],L:[16,16,16,16,16,16,31],M:[17,27,21,21,17,17,17],N:[17,17,25,21,19,17,17],O:[14,17,17,17,17,17,14],
  P:[30,17,17,30,16,16,16],Q:[14,17,17,17,21,18,13],R:[30,17,17,30,20,18,17],S:[15,16,16,14,1,1,30],T:[31,4,4,4,4,4,4],
  U:[17,17,17,17,17,17,14],V:[17,17,17,17,17,10,4],W:[17,17,17,21,21,21,10],X:[17,17,10,4,10,17,17],Y:[17,17,17,10,4,4,4],
  Z:[31,1,2,4,8,16,31],0:[14,17,19,21,25,17,14],1:[4,12,4,4,4,4,14],2:[14,17,1,2,4,8,31],3:[31,2,4,2,1,17,14],
  4:[2,6,10,18,31,2,2],5:[31,16,30,1,1,17,14],6:[6,8,16,30,17,17,14],7:[31,1,2,4,8,8,8],8:[14,17,17,14,17,17,14],
  9:[14,17,17,15,1,2,12],':':[0,12,12,0,12,12,0],'/':[1,1,2,4,8,16,16],'-':[0,0,0,31,0,0,0],'<':[2,4,8,16,8,4,2],
  '>':[8,4,2,1,2,4,8],'.':[0,0,0,0,0,12,12],'!':[4,4,4,4,4,0,4],',':[0,0,0,0,12,4,8],'%':[24,25,2,4,8,19,3],'(':[2,4,8,8,8,4,2],')':[8,4,2,2,2,4,8],'?':[14,17,1,2,4,0,4],"'":[4,4,8,0,0,0,0],' ':[0,0,0,0,0,0,0]
};
// Each glyph at double detail: 14 rows of 10 letters ('#' = ink).
const BIG = {};
const glyph = ch => BIG[ch] || (BIG[ch] = scale2x((GLYPHS[ch] || GLYPHS[' ']).map(row => [...Array(5)].map((_, b) => row & (16 >> b) ? '#' : '.').join(''))));
export const LETTER = 12, LINE = 18;   // a letter's width with its gap, and a line's height (pixels)
export function pixelText(txt, x, y, col = P.ink, align = 'left', shadow = null) {
  txt = String(txt).toUpperCase();
  const key = txt + col + shadow;
  let c = cache.get(key);
  if (!c) {
    c = document.createElement('canvas'); c.width = txt.length * LETTER + 2; c.height = 16;
    const g = c.getContext('2d');
    const paint = (colour, o) => { g.fillStyle = colour;
      [...txt].forEach((ch, i) => glyph(ch).forEach((row, r) => { for (let b = 0; b < 10; b++) if (row[b] === '#') g.fillRect(i * LETTER + b + o, r + o, 1, 1); })); };
    if (shadow) paint(shadow, 2);
    paint(col, 0);
    cache.set(key, c);
  }
  const w = txt.length * LETTER - 2;
  const ax = align === 'center' ? x - (w >> 1) : align === 'right' ? x - w : x;
  lg.drawImage(c, Math.round(ax), Math.round(y));
}

function hardEdges(c, colours) {   // snap a text canvas to solid pixels (no blur)
  const x = c.getContext('2d'), img = x.getImageData(0, 0, c.width, c.height), d = img.data;
  const pal = colours.map(h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]);
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 110) { d[i + 3] = 0; continue; }
    let best = pal[0], bd = 1e9;
    for (const p of pal) { const e = (d[i] - p[0]) ** 2 + (d[i + 1] - p[1]) ** 2 + (d[i + 2] - p[2]) ** 2; if (e < bd) { bd = e; best = p; } }
    d[i] = best[0]; d[i + 1] = best[1]; d[i + 2] = best[2]; d[i + 3] = 255;
  }
  x.putImageData(img, 0, 0); return c;
}
function coverTitle(txt, size) {
  const key = '§' + txt + size;
  let c = cache.get(key);
  if (c) return c;
  c = document.createElement('canvas');
  const f = `${size}px Bungee, Impact, sans-serif`, m = c.getContext('2d'); m.font = f;
  const w = Math.ceil(m.measureText(txt).width), echoes = 4, step = Math.max(1, Math.round(size / 18));
  c.width = w + echoes * step + 6; c.height = Math.ceil(size * 1.15) + echoes * step + 6;
  const g = c.getContext('2d'); g.font = f; g.textBaseline = 'top'; g.lineJoin = 'round';
  const ox = echoes * step + 3, oy = 3;
  for (let e = echoes; e >= 0; e--) {
    const x = ox - e * step, y = oy + e * step;
    g.lineWidth = Math.max(2, Math.round(size / 14)); g.strokeStyle = '#141414'; g.strokeText(txt, x, y);   // outline in whole pixels
    if (e === 0) { const gr = g.createLinearGradient(x, 0, x + w, 0); RAINBOW.forEach((col, i) => gr.addColorStop(i / 4, col)); g.fillStyle = gr; }
    else g.fillStyle = ['#5cc8c8', '#f08aa6', '#f9e45b', '#a8d88a'][(e - 1) % 4];
    g.fillText(txt, x, y);
  }
  hardEdges(c, ['#141414', ...RAINBOW]);
  cache.set(key, c); return c;
}
export function drawCover(txt, size, x, y, align = 'center') {
  if (!fontsReady) return;
  const c = coverTitle(txt, size);
  lg.drawImage(c, Math.round(align === 'center' ? x - c.width / 2 : x), Math.round(y));
}
