// ============================================================================
// icons.js — the little pictures in speech bubbles: the game's only "dialogue" (it's wordless).
// Each icon is a 12×12 letter grid, the same idea as Ichigo's sprite: one letter per colour. An ink
// outline is added around it, and it's drawn at the screen's double detail with Scale2x (like the
// HUD and the gulls), or at single size for something said small.
// Greyed, every colour turns to one of two greys: something remembered, or said to no one.
// ============================================================================
import { P } from './config.js';
import { scale2x } from './pixel.js';

const IC = {
  K: P.outline, k: P.ink,                        // outline; hair
  R: P.red, r: P.rust, p: P.pink, w: P.white,    // strawberry and heart reds, their light
  G: P.leaf, g: P.grass, Y: P.gold,              // leaves, seeds
  S: P.skin, m: P.rose,                          // skin; cheeks and mouths
  I: P.indigo, A: P.foam, T: P.tan,              // Kaa-chan's kimono and apron; paper windows
  O: P.olive, B: P.wood, b: P.brown, a: P.aqua, o: P.ocean, V: P.plum, v: P.violet,   // thatch, timber, the carp streamer
};

export const ICONS = {
  strawberry: [
    '....G..G....',
    '..GGgGGgGG..',
    '...GGgGGG...',
    '..RRRGGRRR..',
    '.RRwRRRRYRR.',
    '.RRRRRYRRRR.',
    '.RYRRRRRRwR.',
    '..RRRRYRRR..',
    '..RRYRRRRR..',
    '...RRRRYR...',
    '....RRRR....',
    '.....RR.....',
  ],
  heart: [
    '............',
    '..RRR..RRR..',
    '.RppRRRRRRR.',
    '.RpRRRRRRRR.',
    '.RRRRRRRRRR.',
    '.RRRRRRRRRR.',
    '..RRRRRRRR..',
    '...RRRRRR...',
    '....RRRR....',
    '.....RR.....',
    '............',
    '............',
  ],
  kaachan: [   // Kaa-chan: hair tied up in a bun, a kind smile, the collar of her indigo kimono
    '....kkkk....',
    '...kkkkkk...',
    '..kkkkkkkk..',
    '.kkkkkkkkkk.',
    '.kkSSSSSSkk.',
    '.kSSSSSSSSk.',
    '.kSkkSSkkSk.',
    '..SSSSSSSS..',
    '..SmSSSSmS..',
    '...SSmmSS...',
    '....SSSS....',
    '..IIIAAIII..',
  ],
  ichigo: [    // Ichigo: the bowl cut, round cheeks, the red jersey's white collar
    '...kkkkkk...',
    '..kkkkkkkk..',
    '.kkkkkkkkkk.',
    '.kkkkkkkkkk.',
    '.kkkkkkkkkk.',
    '.kSSSSSSSSk.',
    '.SSkSSSSkSS.',
    '.SSSSSSSSSS.',
    '.SmSSSSSSmS.',
    '..SSSmmSSS..',
    '...SSSSSS...',
    '..RRRAARRR..',
  ],
  arrow: [
    '............',
    '............',
    '.......R....',
    '.......RR...',
    '.......RRR..',
    '.RRRRRRRRRR.',
    '.RRRRRRRRRR.',
    '.......RRR..',
    '.......RR...',
    '.......R....',
    '............',
    '............',
  ],
  house: [     // the family's thatched house, a carp streamer flying from a pole beside it
    'b.aaaa......',
    'baaoaaa.....',
    'b.aaaa......',
    'b...OOOO....',
    'b..OOOOOO...',
    'b.OOOOOOOO..',
    'bOOOOOOOOOO.',
    'b.BBBBBBBB..',
    'b.BTTBBkkB..',
    'b.BTTBBkkB..',
    'b.BBBBBkkB..',
    'bbbbbbbbbbbb',
  ],
};

ICONS.umi = [   // the sea: a wave curling over, foam on its crest
  '............',
  '....www.....',
  '..wwaaaww...',
  '.waaooowaw..',
  '.waoow..ww..',
  'waaoow......',
  'waoooaw.....',
  'waooooaaw..w',
  'aaoooooaaaaa',
  'ooooooooooaa',
  'oIIooooIIooo',
  'IIIIIIIIIIII',
];

ICONS.kani = [   // a crab, claws up
  '.RR......RR.',
  'RR.R....R.RR',
  'R..R....R..R',
  '.RRR.ww.RRR.',
  '...R.KK.R...',
  '..RRRRRRRR..',
  '.RRpRRRRRRR.',
  'RRRRRRRRRRRR',
  'r.RRRRRRRR.r',
  '.rrRRRRRRrr.',
  'r..r.rr.r..r',
  '..r......r..',
];

ICONS.lighthouse = [   // the lighthouse: its lamp an eye
  '.....RR.....',
  '....RRRR....',
  '...RRRRRr...',
  '...YYKKYY...',
  '...YYKKYY...',
  '..bbbbbbbb..',
  '....wwwa....',
  '....RRRr....',
  '....wwwa....',
  '...wwwwaa...',
  '...RRRRrr...',
  '..wwwwwaaa..',
];

ICONS.wind = [   // the wind: three streaks of it, curling over at their ends
  '.......aaa..',
  '......a...a.',
  '..........a.',
  'aaaaaaaaaa..',
  '............',
  'oooooooooooo',
  '...........o',
  '.aaaaaa...o.',
  '.......a.oo.',
  '.......a....',
  '.....aa.....',
  '............',
];

ICONS.turtle = [   // a sea turtle, swimming
  '............',
  '............',
  '...OOOOO....',
  '..OGgGGgO...',
  '.OGGGgGGGOTT',
  'OGgGGGGgGGTk',
  'OOOOOOOOOOTT',
  '.TTT....TTT.',
  'TT........TT',
  '............',
  '............',
  '............',
];

// What Ichigo learns about the world: the level it's learned in, and the picture that stands for it.
export const LEARNED = {
  kaachan: { level: 1, icon: 'kaachan' },
  sea: { level: 1, icon: 'umi' },
  crab: { level: 2, icon: 'kani' },
  home: { level: 3, icon: 'house' },
  lighthouse: { level: 4, icon: 'lighthouse' },
  wind: { level: 5, icon: 'wind' },
  turtle: { level: 6, icon: 'turtle' },
};

ICONS.plum = [   // a plum, a leaf on its stalk
  '......b.....',
  '.....bGGg...',
  '....bGGGg...',
  '...VVbVV....',
  '..VVVvVVVV..',
  '.VVpVVvVVVV.',
  '.VpVVVvVVVV.',
  '.VVVVVvVVVV.',
  '.VVVVVvVVVv.',
  '..VVVvVVVv..',
  '...VVVVvv...',
  '............',
];
ICONS.rope = [   // a coil of rope
  '............',
  '...TTTTTT...',
  '..TBBBBBBT..',
  '.TB.TTTT.BT.',
  '.TBTBBBBTBT.',
  '.TBTB..BTBT.',
  '.TBTBBBBTBT.',
  '.TB.TTTT.BT.',
  '..TBBBBBBT..',
  '...TTTTTTBT.',
  '........TBT.',
  '.........TT.',
];
ICONS.blanket = [   // a cloth, folded: persimmon red, with a small pattern
  '............',
  '.rRRRRRRRRr.',
  'rRRwRRRwRRRr',
  'RRwwwRwwwRRR',
  'RRRwRRRwRRRR',
  'RRRRRRRRRRRr',
  'rRwRRRwRRRwr',
  'rwwwRwwwRwwr',
  'RRwRRRwRRRwR',
  'RRRRRRRRRRRR',
  'rRRRRRRRRRRr',
  '.rrrrrrrrrr.',
];
ICONS.paddle = [
  '.........TT.',
  '........TBB.',
  '.......TBB..',
  '......TBB...',
  '.....TBB....',
  '....TBB.....',
  '..TTBB......',
  '.TTBBB......',
  'TTBBBB......',
  'TBBBBb......',
  'TBBBb.......',
  '.bbb........',
];

// Add a one-letter outline (K) around a letter grid, padding it by one.
function outlined(rows) {
  const w = rows[0].length + 2, g = ['.'.repeat(w), ...rows.map(r => '.' + r + '.'), '.'.repeat(w)];
  const ink = (x, y) => g[y] && g[y][x] && g[y][x] !== '.' && g[y][x] !== 'K';
  return g.map((r, y) => [...r].map((ch, x) => ch === '.' && (ink(x - 1, y) || ink(x + 1, y) || ink(x, y - 1) || ink(x, y + 1)) ? 'K' : ch).join(''));
}
// How light a colour is (0..1): greyed icons use it to pick between the two greys.
const light = hex => { const n = parseInt(hex.slice(1), 16); return (.3 * (n >> 16) + .59 * ((n >> 8) & 255) + .11 * (n & 255)) / 255; };

const cache = new Map();
function picture(name, big) {
  const key = name + big;
  if (!cache.has(key)) { const o = outlined(ICONS[name]); cache.set(key, big ? scale2x(o) : o); }
  return cache.get(key);
}
// Icon size in pixels, outline included.
export const iconSize = big => (12 + 2) * (big ? 2 : 1);

// Draw an icon with its top-left corner at x, y (in pixels).
export function drawIcon(g, name, x, y, { grey = false, big = true } = {}) {
  drawLetters(g, picture(name, big), x, y, grey);
}
function drawLetters(g, rows, x, y, grey = false) {
  rows.forEach((row, r) => [...row].forEach((ch, c) => {
    if (ch === '.') return;
    const col = IC[ch];
    g.fillStyle = grey ? (light(col) > .55 ? P.grey1 : P.grey2) : col;
    g.fillRect(x + c, y + r, 1, 1);
  }));
}
