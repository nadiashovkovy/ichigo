// ============================================================================
// save.js — what Ichigo carries between levels and between visits: the words they've learned,
// the marks on their body, the things they've kept, how many tomorrows it has taken, whether the wave has been seen, and
// whether the sound is off, and which levels are finished. Kept in the browser's localStorage under 'ichigo.save'.
// Storage can be blocked (private windows, strict settings): then the game simply doesn't remember.
// ============================================================================
import { ICHIGO_SPEAKS } from './config.js';
import { S } from './state.js';

const KEY = 'ichigo.save';

export function loadSave() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY) || '{}');
    S.words = Array.isArray(d.words) ? d.words : [];
    S.marks = new Set(Array.isArray(d.marks) ? d.marks : []);
    S.things = new Set(Array.isArray(d.things) ? d.things : []);
    S.tomorrows = d.tomorrows | 0;
    S.done = new Set(Array.isArray(d.done) ? d.done : []);
    S.seenWave = !!d.seenWave;
    S.muted = !!d.muted;
    if (d.settings) Object.assign(S, { musicOn: d.settings.music !== false, sfxOn: d.settings.sfx !== false, cardsOn: d.settings.cards !== false, volume: typeof d.settings.volume === 'number' ? d.settings.volume : 1 });
  } catch (e) { /* no save, or it can't be read: start fresh */ }
}

export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify({ words: S.words, marks: [...S.marks], things: [...S.things], tomorrows: S.tomorrows, done: [...S.done], seenWave: S.seenWave, muted: S.muted,
      settings: { music: S.musicOn, sfx: S.sfxOn, volume: S.volume, cards: S.cardsOn } }));
  } catch (e) { /* storage blocked: carry on without it */ }
}

// Forget everything (settings → erase save): back to a first visit, sound settings kept.
export function eraseSave() {
  try { localStorage.removeItem(KEY); } catch (e) { /* storage blocked */ }
  Object.assign(S, { words: [], marks: new Set(), things: new Set(), tomorrows: 0, done: new Set(), seenWave: false });
  save();
}

// Ichigo learns a word, gains a mark, or keeps something they found: remembered at once.
export function learnWord(id) { if (ICHIGO_SPEAKS && !S.words.includes(id)) { S.words.push(id); save(); } }
export function keepThing(id) { if (!S.things.has(id)) { S.things.add(id); save(); } }
export function gainMark(id) { if (!S.marks.has(id)) { S.marks.add(id); save(); } }
