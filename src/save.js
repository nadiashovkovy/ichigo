// ============================================================================
// save.js — what Ichigo carries between levels and between visits: the words they've learned,
// the marks on their body, how many tomorrows it has taken, whether the wave has been seen, and
// whether the sound is off. Kept in the browser's localStorage under 'ichigo.save'.
// Storage can be blocked (private windows, strict settings): then the game simply doesn't remember.
// ============================================================================
import { S } from './state.js';

const KEY = 'ichigo.save';

export function loadSave() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY) || '{}');
    S.words = Array.isArray(d.words) ? d.words : [];
    S.marks = new Set(Array.isArray(d.marks) ? d.marks : []);
    S.tomorrows = d.tomorrows | 0;
    S.seenWave = !!d.seenWave;
    S.muted = !!d.muted;
  } catch (e) { /* no save, or it can't be read: start fresh */ }
}

export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify({ words: S.words, marks: [...S.marks], tomorrows: S.tomorrows, seenWave: S.seenWave, muted: S.muted }));
  } catch (e) { /* storage blocked: carry on without it */ }
}

// Ichigo learns a word, or gains a mark: remembered at once.
export function learnWord(id) { if (!S.words.includes(id)) { S.words.push(id); save(); } }
export function gainMark(id) { if (!S.marks.has(id)) { S.marks.add(id); save(); } }
