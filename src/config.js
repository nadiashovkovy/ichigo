// ============================================================================
// config.js — numbers you might want to tweak, all in one place.
// ============================================================================

// ---------------------------------------------------------------------------
// ART STYLE: the game's global style settings. (The art is drawn by code onto a canvas,
// where CSS can't reach it, so these constants do that job.)
//
// The screen is a grid of 640×360 art pixels (16:9). Every line, outline, dot and edge in the art is
// a whole number of these pixels: write sizes of lines as px(n) ("n pixels") and snap positions with
// onPixel().
//
// It shows 853×480 game units of the world: the bottom of the 540-unit-tall world (the sea, the
// wreckage and Ichigo; the high sky is cropped).
// PIXEL is how much of the world one art pixel covers, in game units: 4/3.
// (The game used to have a 4:3 screen as well, 640×480 with PIXEL = 1. Some of the art can still draw
// itself at that size.)
// Pixel art drawn from pictures (Ichigo, lettering, the title card) keeps its size in pixels.
// ---------------------------------------------------------------------------
export const VIEW_H = 480;                                          // game units of height on screen
export const LW = 640, LH = 360;                                    // screen size, in art pixels
export const PIXEL = VIEW_H / LH, W = LW * PIXEL;                   // game units per pixel; screen width in game units
export const px = n => n * PIXEL;                                   // n art pixels, in game units
export const onPixel = v => Math.round(v / PIXEL) * PIXEL;          // snap a game-unit position to the pixel grid
export const toPx = u => Math.max(1, Math.round(u / PIXEL));       // how many whole pixels (at least one) u game units is

// The world (where all the gameplay happens) is 540 game units tall, and the screen always shows its
// bottom (the sea). TOP is the difference: extra sky above the world (positive), or how much of the
// world's high sky is cropped off (negative). World y = 0 is TOP units down the screen.
export const H = 540;
export const TOP = VIEW_H - H;
export const TOP_PX = TOP / PIXEL;                   // the extra sky, in art pixels

export const SEA = 430;                 // resting height of the sea surface (in game units, y grows downward)

// The woodblock palette: the colours of Hokusai's Great Wave on the title card
// (greatwave.js), plus Ichigo's jersey, skin and hair, plus more of the printmaker's pigments
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
  glow: '#5fd8e6',                                          // sea-fireflies (drawn exactly: the world isn't snapped to it)
  // the same pigments, aged: the Hokusai prints (dawn.js) as they are now, nearly two hundred years on.
  // Their whites have yellowed to old paper, and their inks have softened and faded unevenly.
  paper: '#efe2c3', fadeNavy: '#34466e', fadeBlue: '#5d7ba0', fadeSky: '#a0b5bd',
  fadeRed: '#c45c40', fadeGreen: '#93a26c', fadeOchre: '#d3b37c', fadeInk: '#30344a',
};

// Materials: the same few colours for the same stuff everywhere, light to dark. (Use these before
// reaching for another colour: it's what makes the levels, the beach and the islands one place.)
export const RAMP = {
  sand: [P.sky, P.tan, P.tanD, P.bark], wood: [P.tan, P.ochre, P.wood, P.brown], straw: [P.ochre, P.olive, P.brown],
  leaf: [P.grass, P.leaf, P.pine], stone: [P.grey0, P.grey1, P.grey2, P.grey3], cloth: [P.aqua, P.ocean, P.navy], red: [P.red, P.rust],
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
  bored: [5, 5],      // left alone on a deck this long (5 to 10 s), Ichigo sits down, bored (they still slide!)
  sulk: 0.45,         // any key gets them up at once, but their lip stays out this long
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
  bored: [6, 5],      // left alone this long (6 to 11 s), Ichigo sits down in the sand, bored
  sulk: 0.45,         // any key gets them up at once, but their lip stays out this long
  hop: 150,           // a tiny hop: how fast Ichigo leaves the sand,
  hopGravity: 1100,   // and how fast they come down (about 8 pixels high, a quarter of a second)
};

// The lantern island at night, and the sandbar (Level 2, tide.js). Heights (z) go up from `base`, the
// sea's height at the lowest tide of the night: z = 50 is 50 units above it.
export const TIDE = {
  base: 440,          // the screen height (y) of z = 0
  x0: -45, cell: 8, cells: 118, edge: 4,   // the water's columns (water.js): where they start, how wide, how many; the sea fills `edge` of them at each end
  seep: 12,           // how fast the sea fills ground lower than it
  soak: 3.5,          // how fast water left on the sand soaks away
  wave: { speed: 150, width: 55, start: 110 },   // a wave's speed and half-width; how far off screen it starts
  // before each wave the sea draws back: how far down; how long that takes; how long until the wave itself sets off
  pull: { depth: 17, time: 2, lead: 3.6 },
  asleep: .6,        // seconds asleep after the story cards, before the wave that wakes Ichigo sets off
  wakeWave: 115,      // how high it is
  calm: 3,            // seconds at the start of a set, while the tide rises to its new height
  ends: 7,            // seconds after a set's last wave, for it to come in and go out again
  // the sea-fireflies a wave leaves on the sand as it drains: clusters at least this far apart; how long they shine;
  // how many scoops are in one, and in one on sand the sea only bares when it draws back
  glow: { apart: 26, life: 8.5, near: 1, far: 2, most: 14 },
  reach: 24,          // how close Ichigo must be to scoop up a cluster, or pick something up
  scoop: .24,         // seconds for a scoop
  bucket: 6,          // how many scoops the bucket holds
  heavy: .07,         // each scoop in it slows Ichigo by this share of walking speed
  canRun: 2,          // and with more than this many, they can't run
  feed: .065,         // how much of the lantern's light one scoop gives back (1 = all of it)
  first: .55,         // how much light the lantern has at the start of the night
  atLeast: .45,       // and after a new tomorrow, at least this much
  kinder: .12,        // each new tomorrow in a set, the lantern burns this much slower (three times at most)
  by: 52,             // how near the lantern Ichigo must be to feed it
  light: [46, 250],   // how far the lantern's light reaches, nearly out and full
  knock: 15, rush: 30,   // water deeper than this, going faster than this, knocks Ichigo over
  down: 1,            // seconds to get up again
  under: 26, underTime: .12,   // and a wave deeper than this, for this long, takes Ichigo: a new tomorrow, from the start of the night
  wade: .6,           // wading: this share of walking speed
  waist: 24,          // Ichigo can't walk out into water deeper than this
  shove: 1.1,         // how much of the water's speed pushes Ichigo along
  ebb: 5,             // seconds for the tide to go out at dawn
  low: -30,           // how low it goes
  rise: 1.95,         // the sandbar: how fast the tide comes back (units a second)
  deep: 19, deepTime: .35,   // water this deep for this long takes Ichigo: a new tomorrow
  shellTime: 1,       // picking up the shell
  crab: { speed: 34, from: 78, to: 190, cry: 1.2, hide: 4, reach: 10, clear: 4 },   // crabs on the island: how fast, between how near the lantern and how far; how long a pinch makes Ichigo cry; how long the crab then hides; how near it must be to pinch, and how high a hop clears it
  hop: 235,           // how fast Ichigo leaves the sand: higher than on the beach, so crabs are easy to hop over
  stumble: .5,        // a crab on the sandbar
};

// The Sleepy Island (Level 3, plum.js). Positions are in levels/level03.json.
export const PLUM = {
  sea: 470,           // the sea's height (y) round the island
  wade: 12,           // Ichigo can't wade deeper than this
  hungry: 54,         // seconds from a full belly to an empty one
  first: .7,          // how full it is at the start, and after a new tomorrow
  eat: { clam: .4, orange: .45, plum: 1 },   // how much each food fills
  growl: .25,         // below this, Ichigo's belly growls
  weak: .55,          // with an empty belly: this share of walking speed (and no running)
  starving: 22,       // and after this many seconds of it, Ichigo lies down: a new tomorrow
  asleep: 3,          // this many plums at once, and Ichigo falls asleep under the trees: a new tomorrow
  wears: 80,          // seconds for one plum's sleepiness to wear off
  slow: .16,          // each plum slows Ichigo by this share of walking speed
  full: .8,           // and so does a full bucket (and they can't run)
  // plums: how near a tree's middle the fruit hangs; seconds of rustling before one falls; how often one
  // falls by itself when Ichigo is under a tree, and when they run; how fast it falls; how long it lies there
  drop: { under: 62, warn: .65, walk: [4, 5], run: [.9, .8], gravity: 620, lie: 25 },
  bonk: { near: 12, time: .5, safe: 1.4 },   // a falling plum: how near it must be to hit Ichigo's head; how long that stops them; how long before another can
  jump: 640,          // how fast Ichigo leaves the ground (each plum takes a little off)
  // empty hammocks: how far above the ground the cloth is; how near its middle to land on it; how fast they throw
  // Ichigo up: a plain bounce, a well-timed one (jump pressed as they land), and how much more each in a row, up to
  bounce: { up: 25, wide: 46, plain: 620, timed: 860, more: 70, most: 1010, window: .16 },
  leafSag: 5,         // how far a treetop gives under Ichigo
  wasp: { near: 15, push: 190, up: 260 },   // how near a wasp must be to sting; how hard Ichigo starts back
  spill: 1,           // a jump with a full bucket spills this much of it (it holds 3)
  // the old sailor: how much three-thirds of a bucket wakes him; how fast he dozes off again (a second); how awake is awake
  sailor: { splash: 1.25, doze: .045, awake: 3 },
  dig: .7,            // seconds to dig up a clam
  clamTime: 5,        // how long a clam's bubbles show in one place
  shakes: 2,          // shakes of the orange tree before one falls
  regrow: 14,         // seconds for the orange tree to have another ripe
  reach: 26,          // how near to use something
  drift: 85,          // how fast the current takes the raft, at the end
  crab: 30,           // how fast the crabs walk
};

// The Lighthouse (Level 4, lighthouse.js). Positions are in levels/level04.json.
export const LIGHT = {
  sea: 470,
  jump: 600,          // how fast Ichigo leaves the ground
  shuffle: 48,        // how fast they shuffle along under the bucket
  // the beam: how fast it sweeps; seconds the eye is shut between sweeps; how wide the patch of light is; how far
  // each side of Ichigo a sweep goes; how long Ichigo can be in it before they're seen
  beam: { speed: 360, dark: 1.4, width: 250, span: 560, seen: .28 },
  indoors: { dark: 1, span: 400 },   // in the shed, it's at the windows more of the time
  water: { speed: 400, dark: 1.7, width: 260, span: 620, seen: .36 },   // the same, out on the water at the end
  // it turns to look at a noise this fast, and looks for this long (longer for a bell)
  turn: 1500, listen: 2, bell: 4.2,
  // it stops to look at a bucket: this long the first time, longer each time after, up to `most`. (Hiding behind something, Ichigo is forgotten.)
  stare: { first: .6, more: .4, most: 2 },
  wait: .45,          // seconds from a noise until the eye turns
  gull: { run: 92, near: 46, back: 16 },   // how near running, or landing, wakes a gull; seconds until it settles again
  cuts: 3,            // cuts to part the rope
  paddle: 92, drift: 10,
};

// The Storm (Level 5, storm.js). The level's own counts are in levels/level05.json.
export const STORM = {
  half: 150, least: 88, section: 34,   // the raft: half its length; the shortest it gets; how much goes with each log lost
  walk: 150, run: 240, accel: 1500, stop: 1300, slide: 520,   // Ichigo on it; how hard a tilted deck pulls them down it
  jump: 520, gravity: 1900,
  tip: .15, follow: .7,   // how far Ichigo's weight tips it; how much of a wave's slope it takes
  reach: 34,              // how near the mast, or a knot, is near enough
  grips: 3,               // how many times, in each part, Ichigo catches the edge of the raft instead of going overboard; and how long until they're back up
  climb: 1.1,
  lean: .3,               // how far toward a steep wave is far enough (of the raft's half)
  // sailing: drifting; with the sail full; how often a puff of wind comes, how wide, how fast it passes
  sail: { drift: 38, full: 205, every: 3.6, wide: 330, speed: 250 },
  // gusts: seconds between; warning before; how long one blows; how hard; how many in the first part
  gust: { gap: 4.4, warn: 2, blow: 1.4, push: 1750, count: 4 },
  knot: { time: 10, tie: .6 },   // seconds until a loose log is lost; how long tying takes
  // water on the deck: how fast the rain fills it (a full raft goes under), how much each scoop takes, how long one takes
  water: { rain: .032, scoop: .18, time: .42, wave: .17 },
  rainGap: 7.5,           // seconds between gusts in the rain
  // what washes aboard in the rain: how hard the tilt slides it, how fast it comes; and each one's half-width and height
  creature: { slide: 620, push: 250, size: { crab: [11, 13], bream: [12, 12], puffer: [11, 15], octopus: [12, 19], turtle: [19, 16], tuna: [24, 17] } },
  // the big waves: how often; from the lightning until it's here
  wave: { every: 7, warn: 2.4, speed: 330 },
  swim: { speed: 92, drift: 17, kick: 150, kicks: .05, tired: .03, under: .13, rest: .42, every: 4.4, wave: 300, hit: .2 },
};
