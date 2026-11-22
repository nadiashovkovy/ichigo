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
//   1.5  = zoomed in: the screen shows a 480×360 slice of the
//          world: the bottom of it, where the sea, the wreckage and Ichigo are; the high sky is cropped.
//   2.25 = shows exactly the world's height (720×540).
//   3    = zoomed out: 960×720, with extra sky above the world.
// (Ichigo is always drawn at their own size, about 18×28 art pixels: see sprite.js.)
// ---------------------------------------------------------------------------
export const PIXEL = 2;
export const px = n => n * PIXEL;                                   // n art pixels, in game units
export const onPixel = v => Math.round(v / PIXEL) * PIXEL;          // snap a game-unit position to the pixel grid

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

export const SEA = 430;                 // resting height of the sea surface (in game units, y grows downward)

// The woodblock palette: the colours of the title card's chart of Hokusai's Great Wave (see
// tools/make_title.py), plus Ichigo's jersey, skin and hair. Every pixel of the world is snapped to one of these.
export const P = {
  navy: '#1f3270', deep: '#3f669c', steel: '#7fa3bf', pale: '#a8c4cc', foam: '#f4ecd8', white: '#fdfbf3',
  outline: '#0e1430',                                       // the chart's ink outline, where waves meet the sky
  sky: '#e6cea5', tan: '#dbc8a2', tanD: '#c4a47c',
  grey0: '#d4d0c4', grey1: '#aeaba0', grey2: '#8a8a84', grey3: '#64666a',   // the haze over the far sea, and Fuji
  ochre: '#c9a464', olive: '#7f7b52', brown: '#5a4a2a', red: '#b8322a', ink: '#141414', skin: '#e8b88d'
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
