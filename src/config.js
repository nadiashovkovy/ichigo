// ============================================================================
// config.js — numbers you might want to tweak, all in one place.
// ============================================================================

// ---------------------------------------------------------------------------
// ART STYLE: the game's global style settings. (The art is drawn by code onto a canvas,
// where CSS can't reach it, so these constants do that job.)
//
// The screen is a grid of art pixels: 320×240 on the PC (4:3, like a 1996 monitor), widening to
// 428×240 (16:9) in full screen. Every line, outline, dot and edge in the art is a whole number of
// these pixels: write sizes of lines as px(n) ("n pixels") and snap positions with onPixel().
//
// PIXEL is how much of the world one art pixel covers, in game units: it's the camera's zoom.
// It only changes how big things look; the screen stays 320×240 (4:3) whatever it is.
//   1.5  = 2× the original size (Ichigo is 24×36 pixels). The screen shows a 480×360 slice of the
//          world: the bottom of it, where the sea, the wreckage and Ichigo are; the high sky is cropped.
//   2.25 = shows exactly the world's height (720×540).
//   3    = zoomed out: 960×720, with extra sky above the world.
// Values that divide evenly into 3 (1.5, 3) keep Ichigo's pixels perfectly even.
// ---------------------------------------------------------------------------
export const PIXEL = 2;
export const px = n => n * PIXEL;                                   // n art pixels, in game units
export const onPixel = v => Math.round(v / PIXEL) * PIXEL;          // snap a game-unit position to the pixel grid
// Hand-drawn pixel art (Ichigo, the sea crests) was drawn for PIXEL = 3; it's redrawn this much bigger
// (on the same pixel grid) so it stays in proportion with the world.
export const SPRITE_SCALE = 3 / PIXEL;

// The screen is always 240 art pixels tall. The world (where all the gameplay happens) is 540 game
// units tall, and the screen always shows its bottom (the sea). TOP is the difference: extra sky above
// the world when zoomed out (positive), or how much of the world's high sky is cropped off when
// zoomed in (negative). World y = 0 is TOP units down the screen.
export const LH = 240, H = 540;
export const TOP = LH * PIXEL - H;
export const TOP_PX = TOP / PIXEL;                     // the extra sky, in art pixels
export const NARROW_LW = 320, WIDE_LW = 428;           // screen width in art pixels: 4:3 and 16:9
export let LW = NARROW_LW, W = LW * PIXEL;             // current screen width: art pixels / game units
export function setWidth(lw) { LW = lw; W = LW * PIXEL; }
export function setWide(wide) { setWidth(wide ? WIDE_LW : NARROW_LW); }
// A hand-drawn pixel grid (rows of letters) redrawn s times bigger on the same pixel grid.
export function scaleGrid(rows, s = SPRITE_SCALE) {
  const h = Math.round(rows.length * s), w = Math.round(rows[0].length * s);
  return Array.from({ length: h }, (_, r) => Array.from({ length: w }, (_, c) => rows[Math.floor(r / s)][Math.floor(c / s)]).join(''));
}

export const SEA = 430;                 // resting height of the sea surface (in game units, y grows downward)

// The woodblock palette: colours matched to Hokusai's Great Wave, plus Ichigo's jersey, skin and hair.
// Every pixel of the world is snapped to one of these.
export const P = {
  navy: '#132a52', deep: '#24466f', steel: '#4f7aa3', pale: '#93b4c9', foam: '#f6f0df',
  sky: '#ebdcbb', tan: '#dcc6a0', tanD: '#c4a47c', grey1: '#b5ad98', grey2: '#8f8a7a', grey3: '#66625a',
  ochre: '#d9b56e', olive: '#7f7b52', brown: '#5a4a2a', red: '#b8322a', ink: '#141414', skin: '#e8b88d'
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
