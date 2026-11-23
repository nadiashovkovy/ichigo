// ============================================================================
// config.js — numbers you might want to tweak, all in one place.
// ============================================================================

// ---------------------------------------------------------------------------
// ART STYLE: the game's global style settings. (The art is drawn by code onto a canvas,
// where CSS can't reach it, so these constants do that job.)
//
// The screen is a grid of art pixels: 640×480 on the PC (4:3, like a 1996 SVGA monitor), and
// 640×360 (16:9) in full screen. Every line, outline, dot and edge in the art is a whole number of
// these pixels: write sizes of lines as px(n) ("n pixels") and snap positions with onPixel().
//
// Both screens show the same 480 game units of height (the bottom of the 540-unit-tall world: the
// sea, the wreckage and Ichigo; the high sky is cropped). Full screen zooms out to fit it into 360
// rows, and shows more of the world to the sides: 853×480 units instead of 640×480.
// PIXEL is how much of the world one art pixel covers, in game units: 1 on the PC, 4/3 in full screen.
// Pixel art drawn from pictures (Ichigo, lettering, the title card) keeps its size in pixels; see
// sprite.js for how Ichigo keeps their size in the world.
// ---------------------------------------------------------------------------
export const VIEW_H = 480;                                          // game units of height on screen
export const NARROW = { LW: 640, LH: 480 }, WIDE = { LW: 640, LH: 360 };   // 4:3 and 16:9, in art pixels
export let LW = NARROW.LW, LH = NARROW.LH;                          // current screen size, in art pixels
export let PIXEL = VIEW_H / LH, W = LW * PIXEL;                     // game units per pixel; screen width in game units
export const px = n => n * PIXEL;                                   // n art pixels, in game units
export const onPixel = v => Math.round(v / PIXEL) * PIXEL;          // snap a game-unit position to the pixel grid
export const toPx = u => Math.max(1, Math.round(u / PIXEL));       // how many whole pixels (at least one) u game units is

// The world (where all the gameplay happens) is 540 game units tall, and the screen always shows its
// bottom (the sea). TOP is the difference: extra sky above the world (positive), or how much of the
// world's high sky is cropped off (negative). World y = 0 is TOP units down the screen.
export const H = 540;
export let TOP = VIEW_H - H;
export let TOP_PX = TOP / PIXEL;                     // the extra sky, in art pixels
export function setWide(wide) {
  ({ LW, LH } = wide ? WIDE : NARROW);
  PIXEL = VIEW_H / LH; W = LW * PIXEL; TOP_PX = TOP / PIXEL;
}

export const SEA = 430;                 // resting height of the sea surface (in game units, y grows downward)

// The woodblock palette: the colours of the title card's chart of Hokusai's Great Wave (see
// tools/make_title.py), plus Ichigo's jersey, skin and hair, plus more of the printmaker's pigments
// (blossom pinks, greens, rust, wood, the orange of dawn) for the other prints (dawn.js). Every pixel
// of the world is snapped to one of these.
export const P = {
  navy: '#1f3270', deep: '#3f669c', steel: '#7fa3bf', pale: '#a8c4cc', foam: '#f4ecd8', white: '#fdfbf3',
  outline: '#0e1430',                                       // the chart's ink outline, where waves meet the sky
  sky: '#e6cea5', tan: '#dbc8a2', tanD: '#c4a47c',
  grey0: '#d4d0c4', grey1: '#aeaba0', grey2: '#8a8a84', grey3: '#64666a',   // the haze over the far sea, and Fuji
  ochre: '#c9a464', olive: '#7f7b52', brown: '#5a4a2a', red: '#b8322a', ink: '#141414', skin: '#e8b88d',
  pink: '#f2c6c8', rose: '#d98c98',                         // cherry blossom, and its shadow
  grass: '#97ab62', leaf: '#5f7f3f', pine: '#2f4a2e',       // spring grass, leaves, dark pine forest
  rust: '#93351f', wood: '#8a6238', dawn: '#e98a4c',        // Red Fuji's shadowed flank, timber and trunks, first light
  teal: '#80b1a2', sea: '#4f8aa6', gold: '#e3c56a',         // a teal spring sky, blue-green bay water, sunlit yellow earth
  slate: '#4b5d7a', bark: '#8c7e6a',                        // blue-grey roof tiles, the grey bark of cherry trees
  // the game's cover: a dusk sea in line-art (the level, the intro and the end of a level)
  night: '#0b1428', indigo: '#373a79', plum: '#352d56', violet: '#4e395d', mauve: '#80595f',   // the sky, from the top down
  rosewood: '#7f383e', ember: '#d8453a',                     // the sunset glow, and the red flecks in the clouds
  ocean: '#1e5e89', abyss: '#123744', aqua: '#afd6df', mist: '#d7eaed',   // the sea, its foam lines; pale light
};

// The novel's cover: pastel rainbow used for big titles.
export const RAINBOW = ['#f08aa6', '#f7b38a', '#f9e45b', '#a8d88a', '#5cc8c8'];

// How Ichigo moves.
export const MOVE = {
  gravity: 2000,      // how fast Ichigo falls
  jump: 720,          // jump strength
  walk: 170,          // walking speed
  run: 300,           // running speed (hold Shift)
  shortHop: 300,      // letting go of jump early cuts the jump to this speed
  airControl: 1300,   // how quickly you can steer in the air
  groundAccel: 2400,  // how quickly Ichigo gets up to speed on a deck
  sideStepTime: 0.4,  // Sadie's walk: starting from standing, Ichigo first takes 3 short sideways steps this long (the beach only, for now)
};

// How slippery the floating wreckage is.
export const DECK = {
  slide: 1500,        // how hard a tilted deck pulls Ichigo toward its low end
  wetFriction: 160,   // how quickly Ichigo stops when you let go (low = slippery)
  grip: 35,           // tilts gentler than this don't make Ichigo slide at all
  graceAfterRespawn: 1.2,   // seconds after a new tomorrow before sliding starts
};

// How each kind of wreckage floats.
//   h: thickness · fb: how far the deck sits above the water · weight: how far Ichigo pushes it down
//   tip: how hard Ichigo's weight tips it · follow: how much it tilts with the wave under it
//   sinkRate (straw mats only): how fast it sinks while Ichigo stands on it
export const WRECKAGE = {
  plank: { h: 16, fb: 10, weight: 5, tip: .30, follow: 1 },
  crate: { h: 46, fb: 26, weight: 3, tip: .14, follow: .6 },
  roof:  { h: 26, fb: 14, weight: 4, tip: .22, follow: .8 },
  mat:   { h: 14, fb: 7,  weight: 3, tip: .26, follow: 1, sinkRate: 12 },
  boat:  { h: 36, fb: 20, weight: 2, tip: .05, follow: .4 },
  rock:  { h: 220, fb: 0, weight: 0, tip: 0, follow: 0 },   // solid island: doesn't float
};

// The beach before the wave (Level 1's prologue, beach.js). Positions are in game units, the same
// coordinates as drawBeach in beach.js; the sea is to the right.
export const BEACH = {
  ground: 412,        // the sand Ichigo walks on
  left: 70,           // as far left as Ichigo goes (the house)
  edge: 560,          // the water's edge: walking further stops Ichigo ankle-deep
  water: 540,         // standing this far right, Ichigo can fill the bucket
  dig: [414, 456],    // where Ichigo can dig, just right of the sandcastle (they face it to dig)
  hole: 408,          // the middle of the hole, in front of the castle's gate
  digTime: 1.5,       // seconds of digging before the hole appears
  soakTime: 3,        // seconds for a pour to soak away into the sand
  trip: 470,          // where the shovel lies: walking right past it, Ichigo trips (once)
  kaachan: 143,       // the house's doorway: Kaa-chan is just inside (her humming and bubbles come from here)
  fullSlow: 0.8,      // a full bucket slows Ichigo to this share of walking speed (and they can't run)
  recede: 80,         // how far out the sea pulls back before the wave
  whiteTime: 2,       // seconds of silent white after the wave
};
