// ============================================================================
// audio.js — the game's sound, all synthesised (no sound files):
//   • the Lullaby on a little wooden flute. Kaa-chan hums it on the beach; its first two notes play at
//     every new tomorrow; Ichigo learns to hum it in Level 8.
//   • the sea level's music: a slow koto-like pluck over a soft bass, the flute coming and going.
//   • the sea itself: waves washing in and out wherever there's water.
//   • the tsunami: a rumble as the wave rises, then the crash (cut off by the silence of the white).
//   • falling in: a splash, a sinking "bloop" and a few bubbles.
//
// Browsers only allow sound after the player has pressed something, so nothing starts until the
// first key press or tap. M turns the sound off and on (remembered in the save).
// (Smaller sounds — splashes on the beach, the trip, pouring, the gulls — are still to come; the places
// they will go are marked "SOUND:" in the code.)
// ============================================================================
import { S } from './state.js';
import { save } from './save.js';

// The Lullaby: five notes rising, two falling, on a yo-scale (D E G A B: no semitones), one beat
// each, the last held for two.
const LULLABY = [293.66, 329.63, 392.0, 440.0, 493.88, 440.0, 392.0];
const BEATS = [1, 1, 1, 1, 1, 1, 2];
const TEMPO = 84;   // beats a minute: slow, a lullaby

let ac = null, master = null, hum = null, noise = null, brown = null, musicBus = null, fx = null;

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
  // four seconds of "brown" noise (white noise, smoothed): the deep roar of water
  brown = ac.createBuffer(1, ac.sampleRate * 4, ac.sampleRate);
  const b = brown.getChannelData(0); let last = 0;
  for (let i = 0; i < b.length; i++) { last = (last + .02 * (Math.random() * 2 - 1)) / 1.02; b[i] = last * 3.5; }
  musicBus = ac.createGain(); musicBus.gain.value = 0; musicBus.connect(master);
  fx = ac.createGain(); fx.connect(master);
  startSea();
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
export function playLullaby({ notes = LULLABY.length, tempo = TEMPO, out = null, vol, delay = 0 } = {}) {
  if (!ac) return 0;
  const beat = 60 / tempo; let t = ac.currentTime + .05 + delay;
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


// ============================================================================
// The sea level's music. D yo-scale like the Lullaby, slow: a koto-like pluck playing broken chords,
// eight to a bar, over a soft bass note; every so often the flute plays a line from the Lullaby.
// 16 bars, then round again. Scheduled a little ahead of time, a step at a time (see music()).
// ============================================================================
const hz = m => 440 * 2 ** ((m - 69) / 12);   // a MIDI note number, in hertz
// (G1 31, A1 33, B1 35, D2 38, G2 43, A2 45, B2 47, D3 50, E3 52, G3 55, A3 57, B3 59, D4 62, E4 64, G4 67, A4 69, B4 71, D5 74)
const ARPS = [   // one bar of broken chord each: D, then B, G, A
  [50, 57, 62, 64, 69, 64, 62, 57],
  [47, 52, 59, 62, 64, 62, 59, 52],
  [43, 50, 55, 57, 62, 57, 55, 50],
  [45, 52, 57, 59, 64, 59, 57, 52],
];
const BASS = [38, 35, 31, 33];   // D2, B1, G1, A1: under each chord
// The flute's lines, [step, note, length in steps], one per bar; null = the flute rests.
const LINES = [
  null, null, null, null,
  [[0, 69, 3], [3, 71, 1], [4, 74, 4]], [[0, 71, 2], [2, 69, 2], [4, 67, 4]], [[0, 69, 3], [3, 67, 1], [4, 64, 4]], [[0, 62, 8]],
  null, null, null, null,
  [[0, 62, 2], [2, 64, 2], [4, 67, 2], [6, 69, 2]], [[0, 71, 4], [4, 69, 4]], [[0, 67, 8]], null,
];
const MUSIC_TEMPO = 72, STEP = 60 / MUSIC_TEMPO / 2;   // eighth notes

// A plucked string: a bright attack that dulls quickly as it rings.
function pluck(freq, at, vol, out) {
  const o = ac.createOscillator(), o2 = ac.createOscillator(), f = ac.createBiquadFilter(), g = ac.createGain();
  o.type = 'triangle'; o.frequency.value = freq;
  o2.type = 'sawtooth'; o2.frequency.value = freq * 1.003;   // (a hair out of tune: a string's shimmer)
  f.type = 'lowpass'; f.frequency.setValueAtTime(freq * 8, at); f.frequency.exponentialRampToValueAtTime(freq * 1.5, at + .4);
  g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(vol, at + .005); g.gain.exponentialRampToValueAtTime(.0001, at + 1.6);
  o.connect(f); o2.connect(f); f.connect(g); g.connect(out);
  for (const x of [o, o2]) { x.start(at); x.stop(at + 1.7); }
}
// A soft low note under each bar.
function bass(freq, at, len, out) {
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = 'sine'; o.frequency.value = freq;
  g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(.16, at + .08); g.gain.setTargetAtTime(0, at + len * .7, len * .2);
  o.connect(g); g.connect(out); o.start(at); o.stop(at + len + .5);
}

let step = 0, nextStep = 0;
// Call every frame. level: 1 = playing, a little = held quietly under something, 0 = fading away.
export function music(level) {
  if (!ac) return;
  musicBus.gain.setTargetAtTime(level * .6, ac.currentTime, level > 0 ? .4 : .8);
  if (level <= 0) { if (musicBus.gain.value < .01) { step = 0; nextStep = 0; } return; }   // (faded out: start again from the top next time)
  if (nextStep < ac.currentTime) nextStep = ac.currentTime + .05;
  while (nextStep < ac.currentTime + .25) {   // schedule what's due in the next quarter second
    const bar = Math.floor(step / 8) % 16, i = step % 8, chord = bar % 4;
    if (!(bar >= 8 && bar < 12 && i % 2)) pluck(hz(ARPS[chord][i]), nextStep, i === 0 ? .11 : .07, musicBus);   // (sparser in bars 9–12)
    if (i === 0) bass(hz(BASS[chord]), nextStep, STEP * 8, musicBus);
    for (const [at, m, len] of LINES[bar] || []) if (at === i) note(hz(m), nextStep, len * STEP, musicBus, .1);
    nextStep += STEP; step++;
  }
}

// ============================================================================
// The sea: deep washing noise that swells as each wave comes in and draws back, a hiss of foam on top.
// ============================================================================
let seaBus = null, swell = null, wash = null, nextSwell = 0;
function startSea() {
  seaBus = ac.createGain(); seaBus.gain.value = 0; seaBus.connect(master);
  const src = ac.createBufferSource(); src.buffer = brown; src.loop = true;
  wash = ac.createBiquadFilter(); wash.type = 'lowpass'; wash.frequency.value = 400;
  swell = ac.createGain(); swell.gain.value = .3;
  src.connect(wash); wash.connect(swell); swell.connect(seaBus); src.start();
  const hiss = ac.createBufferSource(), hp = ac.createBiquadFilter(), hg = ac.createGain();   // the foam
  hiss.buffer = noise; hiss.loop = true; hp.type = 'highpass'; hp.frequency.value = 3000; hg.gain.value = .04;
  hiss.connect(hp); hp.connect(hg); hg.connect(swell); hiss.start();
}
// Call every frame: vol 0..1, how much sea there is to hear. instant: cut it at once (the white).
export function seaSound(vol, instant = false) {
  if (!ac) return;
  if (instant) { seaBus.gain.cancelScheduledValues(ac.currentTime); seaBus.gain.setValueAtTime(0, ac.currentTime); return; }
  seaBus.gain.setTargetAtTime(vol * .55, ac.currentTime, .5);
  const now = ac.currentTime;
  if (now >= nextSwell) {   // the next wave: in over a second or two, then drawing back
    const up = 1.2 + Math.random() * 1.2, down = 1.8 + Math.random() * 1.6, peak = .6 + Math.random() * .4;
    swell.gain.cancelScheduledValues(now); swell.gain.setValueAtTime(swell.gain.value, now);
    swell.gain.linearRampToValueAtTime(peak, now + up); swell.gain.linearRampToValueAtTime(.2, now + up + down);
    wash.frequency.cancelScheduledValues(now); wash.frequency.setValueAtTime(wash.frequency.value, now);
    wash.frequency.exponentialRampToValueAtTime(700 + peak * 700, now + up); wash.frequency.exponentialRampToValueAtTime(300, now + up + down);
    nextSwell = now + up + down * .8;
  }
}

// ============================================================================
// The tsunami: a low rumble building as the wave rises, then the crash.
// ============================================================================
function burst(at, len, { from = 200, to = 200, q = .7, type = 'lowpass', vol = .5, attack = .01, buf = brown } = {}) {
  const src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
  src.buffer = buf; src.loop = true;
  f.type = type; f.Q.value = q; f.frequency.setValueAtTime(from, at); f.frequency.exponentialRampToValueAtTime(to, at + len * .6);
  g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(vol, at + attack); g.gain.setTargetAtTime(0, at + attack, len / 3);
  src.connect(f); f.connect(g); g.connect(fx); src.start(at); src.stop(at + len + 1);
  return g;
}
export function waveRumble() {   // (about 3 seconds before the crash)
  if (!ac) return;
  const at = ac.currentTime, src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
  src.buffer = brown; src.loop = true;
  f.type = 'lowpass'; f.frequency.setValueAtTime(90, at); f.frequency.exponentialRampToValueAtTime(500, at + 3.2);
  g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(.9, at + 3.1);
  src.connect(f); f.connect(g); g.connect(fx); src.start(at); src.stop(at + 6);
}
export function waveCrash() {
  if (!ac) return;
  const at = ac.currentTime;
  burst(at, 3, { from: 300, to: 5000, vol: 1.1, attack: .08 });                    // the water coming down
  burst(at + .05, 2.5, { from: 6000, to: 1500, type: 'highpass', vol: .25, buf: noise });   // the spray
  const o = ac.createOscillator(), g = ac.createGain();                            // the thump of it hitting the beach
  o.frequency.setValueAtTime(70, at); o.frequency.exponentialRampToValueAtTime(28, at + 1.2);
  g.gain.setValueAtTime(.8, at); g.gain.exponentialRampToValueAtTime(.001, at + 1.5);
  o.connect(g); g.connect(fx); o.start(at); o.stop(at + 1.6);
}
// Cut to silence: everything stops at once (the white after the wave).
export function silence() {
  if (!ac) return;
  fx.disconnect(); fx = ac.createGain(); fx.connect(master);
  seaSound(0, true); stopHumming();
  musicBus.gain.cancelScheduledValues(ac.currentTime); musicBus.gain.setValueAtTime(0, ac.currentTime);
}

// ============================================================================
// Falling in: a splash, a "bloop" sinking in pitch, and a few bubbles rising.
// ============================================================================
export function playFall() {
  if (!ac) return;
  const at = ac.currentTime;
  burst(at, .35, { from: 2500, to: 700, type: 'bandpass', q: .8, vol: .5, buf: noise });   // the splash
  const o = ac.createOscillator(), g = ac.createGain();                                   // the bloop
  o.type = 'sine'; o.frequency.setValueAtTime(520, at + .05); o.frequency.exponentialRampToValueAtTime(85, at + .45);
  g.gain.setValueAtTime(0, at + .05); g.gain.linearRampToValueAtTime(.35, at + .07); g.gain.exponentialRampToValueAtTime(.001, at + .55);
  o.connect(g); g.connect(fx); o.start(at + .05); o.stop(at + .6);
  for (let i = 0; i < 5; i++) {                                                           // bubbles
    const t = at + .4 + i * .09 + Math.random() * .05, b = ac.createOscillator(), bg = ac.createGain();
    b.type = 'sine'; b.frequency.setValueAtTime(500 + i * 120 + Math.random() * 80, t); b.frequency.exponentialRampToValueAtTime(900 + i * 200, t + .05);
    bg.gain.setValueAtTime(.08, t); bg.gain.exponentialRampToValueAtTime(.001, t + .06);
    b.connect(bg); bg.connect(fx); b.start(t); b.stop(t + .08);
  }
}
