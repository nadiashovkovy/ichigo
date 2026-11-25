// ============================================================================
// state.js — the game's shared, changing state. Other files read and change these objects.
// ============================================================================
export const S = {
  scene: 'title',   // 'title' (⇄ 'levels', the list) → 'prologue' (Level 0) → 'beach' (playable, then the wave) → 'white' → 'play' ⇄ 'dawn' (a new tomorrow) → 'end'; Level 2 is 'tide' ⇄ 'dawn' → 'end'
  sceneT: 0,        // seconds since the current scene started
  T: 0,             // seconds since the game started (drives the waves)
  camX: 0,          // camera position along the level
  deaths: 0,        // how many tomorrows this run
  level: null,      // the current level's data (from levels/*.json)
  plats: [],        // the current level's wreckage, built from the level data
  checkpoint: null, // the last carp streamer reached
  levelT: 0,        // seconds since the level started (not reset by a new tomorrow)
  // What Ichigo carries from level to level (kept in the save, see save.js):
  learned: [],      // what Ichigo has learned about the world, in the order learned ('kaachan', 'sea', ...): see LEARNED in icons.js
  marks: new Set(), // permanent marks on Ichigo's body ('chin', ...): see MARKS in sprite.js
  things: new Set(),// what Ichigo has found and kept ('shell', ...): see things.js
  thingsOpen: false, newThing: false,   // the panel of Ichigo's things is up (the game waits); something in it hasn't been looked at yet
  tomorrows: 0,     // every new tomorrow, in every level, ever
  done: new Set(),  // the levels finished (numbers): the next one unlocks
  seenWave: false,  // the wave has been seen once, so it can be skipped
  muted: false,     // all sound off (M)
  // settings (settings.js), kept in the save:
  musicOn: true, sfxOn: true, volume: 1, cardsOn: true,   // music; sound effects; volume (0..1); story cards
  settingsOpen: false,   // the settings panel is up (the game waits)
};
export const parts = [];   // little particles: foam, splashes, bubbles
