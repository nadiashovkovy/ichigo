// ============================================================================
// config.js — numbers you might want to tweak, all in one place.
// ============================================================================

// Screen. The game "thinks" in 960×540 units but draws a 320×180 pixel picture (3 units = 1 pixel).
export const W = 960, H = 540;
export const LW = 320, LH = 180, PX = 3;
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
