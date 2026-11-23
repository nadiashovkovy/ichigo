// ============================================================================
// audio.js — the game's only music so far: the Lullaby, played on a little synthesised wooden
// flute (no sound files). Kaa-chan hums it on the beach; its first two notes play at every new
// tomorrow; Ichigo learns to hum it in Level 8.
//
// Browsers only allow sound after the player has pressed something, so nothing starts until the
// first key press or tap. M turns the sound off and on (remembered in the save).
// (The rest of the sound — the sea, splashes, gulls — waits for the Sound milestone; the places it
// will go are marked "SOUND:" in the code.)
// ============================================================================
import { S } from './state.js';
import { save } from './save.js';

// The Lullaby: five notes rising, two falling, on a yo-scale (D E G A B: no semitones), one beat
// each, the last held for two.
const LULLABY = [293.66, 329.63, 392.0, 440.0, 493.88, 440.0, 392.0];
const BEATS = [1, 1, 1, 1, 1, 1, 2];
const TEMPO = 84;   // beats a minute: slow, a lullaby

let ac = null, master = null, hum = null, noise = null;

function start() {   // (on the first key press or tap)
  if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ac = new AC();
  master = ac.createGain(); master.gain.value = S.muted ? 0 : 1; master.connect(ac.destination);
  hum = ac.createGain(); hum.gain.value = 0; hum.connect(master);   // Kaa-chan's humming: louder the closer Ichigo is
  // a second of white noise, for the breath in the flute
  noise = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
  const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
}
addEventListener('keydown', start);
addEventListener('pointerdown', start);
addEventListener('touchstart', start);

// M: sound off and on.
addEventListener('keydown', e => {
  if (e.code !== 'KeyM' || e.repeat) return;
  S.muted = !S.muted; save();
  if (master) master.gain.setTargetAtTime(S.muted ? 0 : 1, ac.currentTime, .05);
});

// One flute note: a sine tone with a slow attack and a gentle vibrato, plus a breath of filtered noise.
function note(freq, at, len, out, vol = .18) {
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = 'sine'; o.frequency.value = freq;
  const vib = ac.createOscillator(), vg = ac.createGain();   // vibrato, fading in as the note is held
  vib.frequency.value = 5; vg.gain.setValueAtTime(0, at); vg.gain.linearRampToValueAtTime(freq * .006, at + len * .6);
  vib.connect(vg); vg.connect(o.frequency);
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(vol, at + .12);              // the slow attack of a breath
  g.gain.setTargetAtTime(vol * .7, at + .12, len * .5);
  g.gain.setTargetAtTime(0, at + len * .92, .08);             // and its release
  o.connect(g); g.connect(out);
  const n = ac.createBufferSource(), bp = ac.createBiquadFilter(), ng = ac.createGain();   // the breath
  n.buffer = noise; n.loop = true;
  bp.type = 'bandpass'; bp.frequency.value = freq * 2; bp.Q.value = 3;
  ng.gain.setValueAtTime(0, at); ng.gain.linearRampToValueAtTime(vol * .25, at + .06); ng.gain.setTargetAtTime(vol * .05, at + .1, .1);
  ng.gain.setTargetAtTime(0, at + len * .92, .06);
  n.connect(bp); bp.connect(ng); ng.connect(out);
  for (const s of [o, vib, n]) { s.start(at); s.stop(at + len + .5); }
}

// Play the Lullaby: all seven notes, or just the first few (notes: 2 at a new tomorrow).
// Returns how long it lasts, in seconds.
export function playLullaby({ notes = LULLABY.length, tempo = TEMPO, out = null, vol } = {}) {
  if (!ac) return 0;
  const beat = 60 / tempo; let t = ac.currentTime + .05;
  for (let i = 0; i < notes; i++) {
    const len = (i === notes - 1 && notes < LULLABY.length ? 2 : BEATS[i]) * beat;   // (the last note played is always held)
    note(LULLABY[i], t, len, out || master, vol); t += len;
  }
  return t - ac.currentTime;
}

// Kaa-chan humming as she mends: the whole phrase, over and over with a pause between, while
// `on`; `vol` (0..1) is how near Ichigo is. Called every frame on the beach.
let nextHum = 0;
export function humming(on, vol) {
  if (!ac) return;
  hum.gain.setTargetAtTime(on ? vol * .9 : 0, ac.currentTime, on ? .2 : .08);
  if (on && ac.currentTime >= nextHum) nextHum = ac.currentTime + playLullaby({ out: hum }) + 1.6;
}
export function stopHumming() { if (ac) hum.gain.setTargetAtTime(0, ac.currentTime, .08); }
