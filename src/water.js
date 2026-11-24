// ============================================================================
// water.js — water that really flows, for Level 2 (tide.js): seen from the side, a row of narrow
// columns, each with a height of ground and a depth of water standing on it. Water runs from each
// column to its neighbour toward whichever surface is lower, gathering speed and losing it to
// friction. A sand wall is simply higher ground, so water stops at it, spills over it, or pools
// behind it without anything here knowing about walls.
// Heights (z) go UP, unlike the screen's y: see TIDE.base in config.js.
// Nothing is random and the time step is fixed, so the same play always gives the same water. Nothing
// is drawn here either, so the waves can be tried out without a browser.
// ============================================================================
const STEP = 1 / 120;       // the fixed time step (seconds)
const GRAVITY = 500;        // how hard a slope in the surface pulls the water along
const FRICTION = 1.1;       // how quickly moving water slows (a share of its speed, each second)
const THIN = 9;             // and how much more a thin film drags on the sand
const TUMBLE = 2;           // and how much more it loses tumbling over a wall (so even a worn wall helps the one behind it)
const TOP_SPEED = 260;      // the fastest water goes (so nothing can blow up)

// x0: the left end; cw: a column's width; ground: each column's height.
export function makeWater(x0, cw, ground) {
  const n = ground.length;
  const w = {
    x0, cw, n, ground: Float64Array.from(ground), wall: new Float64Array(n), d: new Float64Array(n), v: new Float64Array(n + 1), left: 0,
    col: x => Math.max(0, Math.min(n - 1, Math.floor((x - x0) / cw))),
    solid: i => w.ground[i] + w.wall[i],
    surface: i => w.ground[i] + w.wall[i] + w.d[i],
    // how deep the water is at x, and how fast it's going
    depthAt: x => w.d[w.col(x)],
    speedAt: x => { const i = w.col(x); return (w.v[i] + w.v[i + 1]) / 2; },
    snapshot: () => ({ wall: w.wall.slice(), d: w.d.slice(), v: w.v.slice() }),
    restore: s => { w.wall.set(s.wall); w.d.set(s.d); w.v.set(s.v); },
  };
  return w;
}

// Let the water run for dt seconds. sea(x): the sea's surface at x, which fills the columns at both
// ends (`edge` columns of them). tide(x): the sea's resting height there; ground lower than it fills by itself, at `seep` a second.
// soak: how fast water above the tide soaks away into the sand. onStep(dt) is called every small step.
export function flow(w, dt, { sea, edge, tide, seep, soak, onStep }) {
  w.left = Math.min(w.left + dt, .1);
  while (w.left >= STEP) { w.left -= STEP; step(w, STEP, sea, edge, tide, seep, soak); if (onStep) onStep(STEP); }
}
const out = new Float64Array(512);
function step(w, dt, sea, edge, tide, seep, soak) {
  const { n, cw, d, v, wall } = w;
  for (let i = 0; i < n; i++) if (i < edge || i >= n - edge) d[i] = Math.max(0, sea(w.x0 + (i + .5) * cw) - w.solid(i));
  // the water's speed across each boundary between columns
  for (let i = 1; i < n; i++) {
    const a = w.surface(i - 1), b = w.surface(i);
    // water can't climb out of a column that's dry, or over ground higher than its surface
    if ((a > b && (d[i - 1] <= 0 || a <= w.solid(i))) || (b > a && (d[i] <= 0 || b <= w.solid(i - 1)))) { v[i] = 0; continue; }
    const depth = Math.max(d[i - 1], d[i]);
    v[i] += (a - b) / cw * GRAVITY * dt;
    const tumble = wall[i - 1] > 0 || wall[i] > 0 ? TUMBLE : 0;
    v[i] -= v[i] * Math.min(1, (FRICTION + THIN / (1 + depth) + tumble) * dt);
    v[i] = Math.max(-TOP_SPEED, Math.min(TOP_SPEED, v[i]));
  }
  // how much each column would give away: never more than it has
  out.fill(0, 0, n);
  for (let i = 1; i < n; i++) if (v[i] > 0) out[i - 1] += v[i] * d[i - 1] * dt / cw; else out[i] -= v[i] * d[i] * dt / cw;
  const before = Float64Array.from(d);
  for (let i = 1; i < n; i++) {
    const from = v[i] > 0 ? i - 1 : i, to = v[i] > 0 ? i : i - 1;
    let m = Math.abs(v[i]) * before[from] * dt / cw;
    if (out[from] > before[from] && out[from] > 0) m *= before[from] / out[from];
    d[from] -= m; d[to] += m;
  }
  for (let i = edge; i < n - edge; i++) {
    if (d[i] < 0) d[i] = 0;
    const level = w.surface(i), rest = tide(w.x0 + (i + .5) * cw);
    if (w.solid(i) < rest && level < rest) d[i] = Math.min(rest - w.solid(i), d[i] + seep * dt);        // the tide gets in everywhere
    else if (d[i] > 0 && level > rest) d[i] = Math.max(0, d[i] - soak * dt);                           // puddles soak away
  }
}
