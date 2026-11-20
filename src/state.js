// ============================================================================
// state.js — the game's shared, changing state. Other files read and change these objects.
// ============================================================================
export const S = {
  scene: 'title',   // 'title' → 'intro' → 'play' ⇄ 'dawn' (a new tomorrow) → 'end'
  sceneT: 0,        // seconds since the current scene started
  T: 0,             // seconds since the game started (drives the waves)
  camX: 0,          // camera position along the level
  deaths: 0,        // how many tomorrows this run
  level: null,      // the current level's data (from levels/*.json)
  plats: [],        // the current level's wreckage, built from the level data
  checkpoint: null, // the last carp streamer reached
};
export const parts = [];   // little particles: foam, splashes, bubbles
