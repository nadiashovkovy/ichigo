// ============================================================================
// audio.js — the game's sound, all synthesised (no sound files):
//   • the Lullaby on a little wooden flute. Kaa-chan hums it on the beach; its first two notes play at
//     every new tomorrow; Ichigo learns to hum it in Level 8.
//   • music, after Toshiro Mayuzumi (see templeBell, below): the title's own, temple bells and shō chords
//     with a shakuhachi and a koto; and a song for each level (written down in songs.js), all on the same
//     instruments, in the same room. The old Japanese scales make it sound as it does.
//   • the sea itself: waves washing in and out wherever there's water.
//   • the tsunami: a rumble as the wave rises, then the crash (cut off by the silence of the white).
//   • Level 2's waves breaking, sand, bucket and crabs.
//   • falling in: a splash, a sinking "bloop" and a few bubbles.
//   • gulls, now and then.
//
// Browsers only allow sound after the player has pressed something, so nothing starts until the
// first key press or tap. M turns all sound off and on; settings (settings.js) can turn the music and
// the sound effects off separately, and set the volume. All remembered in the save.
// Switching the PC off (its power button, pc.js) stops the sound until it's switched on again.
// (Smaller sounds — splashes on the beach, the trip, pouring — are still to come; the places
// they will go are marked "SOUND:" in the code.)
// ============================================================================
import { S } from './state.js';
import { save } from './save.js';
import { SONGS } from './songs.js';

// The Lullaby: five notes rising, two falling, on a yo-scale (D E G A B: no semitones), one beat
// each, the last held for two.
const LULLABY = [293.66, 329.63, 392.0, 440.0, 493.88, 440.0, 392.0];
const BEATS = [1, 1, 1, 1, 1, 1, 2];
const TEMPO = 84;   // beats a minute: slow, a lullaby

let ac = null, master = null, musicOut = null, sfxOut = null, hum = null, noise = null, brown = null, musicBus = null, fx = null;
let powered = true;   // is the PC switched on? (the power button, pc.js)

function start() {   // (on the first key press or tap)
  if (!powered) return;   // (a key pressed while the PC is off mustn't wake the sound)
  if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ac = new AC();
  master = ac.createGain(); master.connect(ac.destination);
  musicOut = ac.createGain(); musicOut.connect(master);   // everything musical (the Lullaby, Kaa-chan's humming, the songs)
  sfxOut = ac.createGain(); sfxOut.connect(master);       // everything else (the sea, the gulls, the wave, falling in)
  applyLevels();
  hum = ac.createGain(); hum.gain.value = 0; hum.connect(musicOut);   // Kaa-chan's humming: louder the closer Ichigo is
  // a second of white noise, for the breath in the flute
  noise = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
  const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  // four seconds of "brown" noise (white noise, smoothed): the deep roar of water
  brown = ac.createBuffer(1, ac.sampleRate * 4, ac.sampleRate);
  const b = brown.getChannelData(0); let last = 0;
  for (let i = 0; i < b.length; i++) { last = (last + .02 * (Math.random() * 2 - 1)) / 1.02; b[i] = last * 3.5; }
  musicBus = ac.createGain(); musicBus.gain.value = 0; musicBus.connect(musicOut);
  // the room it's all played in: an echo, two and a half seconds dying away (a wooden hall), a little of it mixed in
  const hall = ac.createConvolver(), wet = ac.createGain(), ir = ac.createBuffer(2, Math.round(ac.sampleRate * 2.5), ac.sampleRate);
  for (let c = 0; c < 2; c++) { const h = ir.getChannelData(c); let y = 0; for (let i = 0; i < h.length; i++) { const t = i / h.length; y += ((Math.random() * 2 - 1) - y) * (.5 - .4 * t); h[i] = y * (1 - t) ** 3; } }   // (duller as it dies)
  hall.buffer = ir; wet.gain.value = .3; musicBus.connect(hall); hall.connect(wet); wet.connect(musicOut);
  fx = ac.createGain(); fx.connect(sfxOut);
  startSea();
}
addEventListener('keydown', start);
addEventListener('pointerdown', start);
addEventListener('touchstart', start);

// M: sound off and on.
addEventListener('keydown', e => {
  if (e.code !== 'KeyM' || e.repeat || !powered) return;
  S.muted = !S.muted; save(); applyLevels();
});
// Set the volumes from the settings: mute (M), the volume, music on/off, sound effects on/off.
export function applyLevels() {
  if (!ac) return;
  const t = ac.currentTime;
  master.gain.setTargetAtTime(S.muted || !powered ? 0 : S.volume, t, .05);
  musicOut.gain.setTargetAtTime(S.musicOn ? 1 : 0, t, .05);
  sfxOut.gain.setTargetAtTime(S.sfxOn ? 1 : 0, t, .05);
}

// The PC switched off or on (pc.js). Off: the sound dies away in a blink, then its clock is stopped,
// so every note, wave and swell waits where it was, like the game does. On: it carries on from there.
export function soundPower(on) {
  powered = on;
  if (on) start();
  applyLevels();
  if (!on && ac) setTimeout(() => { if (!powered) ac.suspend(); }, 250);   // (once it has faded: cut dead, it would click)
}

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
    note(LULLABY[i], t, len, out || musicOut, vol); t += len;
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
// The music: the levels' songs (written down in songs.js) and the title's theme (titleTheme, further down).
// Not chords, as a Western song would have, but a line at a time with space round it. Scheduled a little
// ahead of time, a step at a time (see music()). First, the instruments.
// ============================================================================
const hz = m => 440 * 2 ** ((m - 69) / 12);   // a MIDI note number, in hertz
const STRINGS = SONGS.sea.strings;

// A koto string, plucked: a burst of noise going round and round a loop as long as the note's wave,
// losing its brightness each time (how a real string rings). Worked out once for each note, and kept.
const strings = new Map();
function stringSound(freq) {
  const id = Math.round(freq * 10);
  if (!strings.has(id)) {
    const rate = ac.sampleRate, n = Math.round(rate * 2.6), buf = ac.createBuffer(1, n, rate), d = buf.getChannelData(0), N = rate / freq - .5, len = Math.floor(N), frac = N - len;
    const loop = new Float32Array(len + 2); let last = 0, top = 0;
    for (let i = 0; i < loop.length; i++) { last = last * .35 + (Math.random() * 2 - 1) * .65; loop[i] = last; }   // (the ivory plectrum: bright, not harsh)
    const keep = Math.pow(.001, 1 / (freq * 2.2));
    for (let i = 0, w = 0; i < n; i++) {   // (frac: the loop isn't a whole number of samples long, or every note would be out of tune)
      const L = loop.length, a = loop[(w - len + L) % L], b = loop[(w - len - 1 + L) % L], v = a * (1 - frac) + b * frac;
      const a2 = d[i - 1] === undefined ? 0 : d[i - 1];
      d[i] = v; loop[w] = keep * (v * .5 + (i ? a2 : v) * .5); w = (w + 1) % L;
      top = Math.max(top, Math.abs(v));
    }
    for (let i = 0; i < n; i++) d[i] *= Math.min(1, (n - i) / (rate * .2)) / (top || 1);
    strings.set(id, buf);
  }
  return strings.get(id);
}
function koto(m, at, vol, out, how = '', step = .4, shift = 0, strings = STRINGS) {   // (shift: semitones higher, for everything in it)
  const one = (n, t, v, press = false) => {
    const src = ac.createBufferSource(), g = ac.createGain(), body = ac.createBiquadFilter();
    src.buffer = stringSound(hz(n + shift)); body.type = 'peaking'; body.frequency.value = 420; body.Q.value = 1; body.gain.value = 5;   // (the paulownia-wood body)
    if (press) { src.playbackRate.setValueAtTime(1, t + .22); src.playbackRate.linearRampToValueAtTime(2 ** (2 / 12), t + .36); src.playbackRate.setValueAtTime(2 ** (2 / 12), t + .6); src.playbackRate.linearRampToValueAtTime(1, t + .8); }
    g.gain.value = v; src.connect(body); body.connect(g); g.connect(out); src.start(t);
  };
  if (how === 'o') { one(m - 12, at, vol * .8); one(m, at + .035, vol); }
  else if (how === 'g') { one(strings[Math.min(strings.length - 1, Math.max(0, strings.indexOf(m)) + 1)], at, vol * .5); one(m, at + .09, vol); }
  else if (how === 'r') { const run = strings.filter(n => n > m).reverse().slice(-7); run.forEach((n, i) => one(n, at + i * .075, vol * (.35 + i * .05))); one(m, at + run.length * .075 + .05, vol * .9); }
  else if (how === 't') { let t = at; for (let i = 0; i < 8; i++) { one(m, t, vol * (.75 - i * .06)); t += step * Math.pow(.78, i); } }
  else one(m, at, vol, how === 'p');
}
// A shakuhachi note: the flute's, but sliding up into pitch on a burst of breath.
function shakuhachi(freq, at, len, out, vol) {
  const o = ac.createOscillator(), o2 = ac.createOscillator(), g = ac.createGain(), g2 = ac.createGain(), vib = ac.createOscillator(), vg = ac.createGain();
  o.type = 'sine'; o2.type = 'triangle';
  for (const [x, k] of [[o, 1], [o2, 2]]) { x.frequency.setValueAtTime(freq * k * .955, at); x.frequency.exponentialRampToValueAtTime(freq * k, at + Math.min(.22, len * .35)); x.frequency.setValueAtTime(freq * k, at + len * .86); x.frequency.exponentialRampToValueAtTime(freq * k * .975, at + len); }   // up into the note, and sagging off its end
  vib.frequency.setValueAtTime(3.4, at); vib.frequency.linearRampToValueAtTime(5.4, at + len);   // the head shaking, slow then quicker (yuri)
  vg.gain.setValueAtTime(0, at + Math.min(.4, len * .4)); vg.gain.linearRampToValueAtTime(freq * .012, at + len * .85); vib.connect(vg); vg.connect(o.frequency); vg.connect(o2.frequency);
  g2.gain.value = .12; o2.connect(g2); g2.connect(g); o.connect(g); g.connect(out);
  g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(vol, at + .14); g.gain.setTargetAtTime(vol * .75, at + .2, len * .4); g.gain.setTargetAtTime(0, at + len * .9, .09);
  const n = ac.createBufferSource(), bp = ac.createBiquadFilter(), ng = ac.createGain();
  n.buffer = noise; n.loop = true; bp.type = 'bandpass'; bp.frequency.value = freq * 2.5; bp.Q.value = 1.6;
  ng.gain.setValueAtTime(0, at); ng.gain.linearRampToValueAtTime(vol * .7, at + .04); ng.gain.setTargetAtTime(vol * .12, at + .07, .09); ng.gain.setTargetAtTime(0, at + len * .9, .08);
  n.connect(bp); bp.connect(ng); ng.connect(out);
  for (const x of [o, o2, vib, n]) { x.start(at); x.stop(at + len + .6); }
}
// A big taiko, struck softly: a deep skin, dropping in pitch, and the thud of the stick.
function taiko(at, hard, out) {
  const o = ac.createOscillator(), g = ac.createGain();
  o.frequency.setValueAtTime(118, at); o.frequency.exponentialRampToValueAtTime(66, at + .16);
  g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(.34 * hard, at + .006); g.gain.exponentialRampToValueAtTime(.0005, at + .9);
  o.connect(g); g.connect(out); o.start(at); o.stop(at + 1);
  const n = ac.createBufferSource(), f = ac.createBiquadFilter(), ng = ac.createGain();
  n.buffer = brown; f.type = 'bandpass'; f.frequency.value = 260; f.Q.value = .8;
  ng.gain.setValueAtTime(.3 * hard, at); ng.gain.exponentialRampToValueAtTime(.001, at + .12);
  n.connect(f); f.connect(ng); ng.connect(out); n.start(at); n.stop(at + .2);
}
// Wooden clappers (hyōshigi), as a play begins.
function clap(at, vol, out) {
  for (const f of [1180, 1890, 2750]) { const o = ac.createOscillator(), g = ac.createGain(); o.type = 'triangle'; o.frequency.value = f; g.gain.setValueAtTime(vol, at); g.gain.exponentialRampToValueAtTime(.0005, at + .09); o.connect(g); g.connect(out); o.start(at); o.stop(at + .1); }
}
// A soft low note under each bar.
function bass(freq, at, len, out) {
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = 'sine'; o.frequency.value = freq;
  g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(.07, at + .3); g.gain.setTargetAtTime(0, at + len * .7, len * .2);
  o.connect(g); g.connect(out); o.start(at); o.stop(at + len + .5);
}

// A shamisen: a string over a tight skin, struck with a plectrum: bright, buzzing, soon gone, the tap of the skin under it.
// soft: a sanshin, its southern cousin, rounder and plucked. how: 'g', 'p' and 'o' as on the koto.
function shamisen(m, at, vol, out, how, shift, strings, soft) {
  const one = (n, t, v) => {
    const src = ac.createBufferSource(), hp = ac.createBiquadFilter(), body = ac.createBiquadFilter(), g = ac.createGain(), len = soft ? 1.1 : .55;
    src.buffer = stringSound(hz(n + shift));
    hp.type = 'highpass'; hp.frequency.value = soft ? 180 : 380; body.type = 'peaking'; body.frequency.value = soft ? 900 : 1700; body.Q.value = 1.1; body.gain.value = soft ? 6 : 10;
    if (how === 'p') { src.playbackRate.setValueAtTime(1, t + .15); src.playbackRate.linearRampToValueAtTime(2 ** (1 / 12), t + .3); src.playbackRate.linearRampToValueAtTime(1, t + .55); }
    g.gain.setValueAtTime(v * (soft ? 1 : .8), t); g.gain.setTargetAtTime(0, t + .06, len / 3);
    src.connect(hp); hp.connect(body); body.connect(g); g.connect(out); src.start(t); src.stop(t + len * 2);
    const n2 = ac.createBufferSource(), f = ac.createBiquadFilter(), ng = ac.createGain();
    n2.buffer = noise; f.type = 'bandpass'; f.frequency.value = soft ? 700 : 1300; f.Q.value = 1.5;
    ng.gain.setValueAtTime(v * (soft ? .25 : .6), t); ng.gain.exponentialRampToValueAtTime(.0005, t + .05); n2.connect(f); f.connect(ng); ng.connect(out); n2.start(t); n2.stop(t + .07);
  };
  if (how === 'o') one(m - 12, at, vol * .7);
  if (how === 'g') { one(strings[Math.min(strings.length - 1, strings.indexOf(m) + 1)], at, vol * .6); at += .1; }
  one(m, at, vol);
}
// A low string stopped with a finger as it's plucked: soft, dark, on tiptoe.
function pizz(freq, at, vol, out) {
  const src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(), o = ac.createOscillator(), og = ac.createGain();
  src.buffer = stringSound(freq * 2); src.playbackRate.value = .5; f.type = 'lowpass'; f.frequency.setValueAtTime(1500, at); f.frequency.exponentialRampToValueAtTime(420, at + .3);
  g.gain.setValueAtTime(vol, at); g.gain.setTargetAtTime(0, at + .05, .13); src.connect(f); f.connect(g); g.connect(out); src.start(at); src.stop(at + 1);
  o.type = 'triangle'; o.frequency.value = freq; og.gain.setValueAtTime(0, at); og.gain.linearRampToValueAtTime(vol * .6, at + .008); og.gain.exponentialRampToValueAtTime(.0005, at + .42); o.connect(og); og.connect(out); o.start(at); o.stop(at + .45);
}
// A glass bell (a wind bell's): clear overtones, quickly thinning.
function glass(freq, at, vol, out) {
  for (const [k, v, d] of [[1, 1, 2.4], [2.76, .35, 1], [5.4, .12, .35]]) { if (freq * k > 14000) continue; const o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = freq * k; g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(vol * v, at + .004); g.gain.exponentialRampToValueAtTime(.0001, at + d); o.connect(g); g.connect(out); o.start(at); o.stop(at + d + .05); }
}
// A bamboo bar, struck with a soft stick.
function bamboo(freq, at, vol, out) {
  for (const [k, v, d] of [[1, 1, .6], [3.9, .22, .12], [.5, .25, .4]]) { const o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = freq * k; g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(vol * v, at + .005); g.gain.exponentialRampToValueAtTime(.0002, at + d); o.connect(g); g.connect(out); o.start(at); o.stop(at + d + .05); }
  const n = ac.createBufferSource(), f = ac.createBiquadFilter(), ng = ac.createGain(); n.buffer = noise; f.type = 'bandpass'; f.frequency.value = 1100; f.Q.value = 2; ng.gain.setValueAtTime(vol * .3, at); ng.gain.exponentialRampToValueAtTime(.0005, at + .04); n.connect(f); f.connect(ng); ng.connect(out); n.start(at); n.stop(at + .05);
}
// A kokyū, bowed: thin, close, wavering.
function kokyu(freq, at, len, out, vol) {
  const o = ac.createOscillator(), f = ac.createBiquadFilter(), g = ac.createGain(), vib = ac.createOscillator(), vg = ac.createGain();
  o.type = 'sawtooth'; o.frequency.setValueAtTime(freq * .97, at); o.frequency.exponentialRampToValueAtTime(freq, at + .12); f.type = 'lowpass'; f.frequency.value = Math.min(2600, freq * 4); f.Q.value = .8;
  vib.frequency.value = 5.6; vg.gain.setValueAtTime(0, at); vg.gain.linearRampToValueAtTime(freq * .011, at + len * .7); vib.connect(vg); vg.connect(o.frequency);
  g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(vol, at + Math.min(.16, len * .3)); g.gain.setTargetAtTime(vol * .7, at + len * .4, len * .3); g.gain.setTargetAtTime(0, at + len * .94, .07);
  o.connect(f); f.connect(g); g.connect(out); for (const x of [o, vib]) { x.start(at); x.stop(at + len + .5); }
}
// A nohkan, the flute of the old plays: high, all breath, its pitch never quite settling, shrieking up at the end of a note.
function nohkan(freq, at, len, out, vol) {
  const o = ac.createOscillator(), g = ac.createGain(), n = ac.createBufferSource(), bp = ac.createBiquadFilter(), ng = ac.createGain();
  o.type = 'triangle'; o.frequency.setValueAtTime(freq * .9, at); o.frequency.exponentialRampToValueAtTime(freq * 1.012, at + Math.min(.16, len * .3)); o.frequency.linearRampToValueAtTime(freq * .99, at + len * .7); o.frequency.exponentialRampToValueAtTime(freq * 1.09, at + len);
  g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(vol, at + .05); g.gain.setTargetAtTime(vol * .6, at + .1, len * .4); g.gain.setTargetAtTime(0, at + len * .95, .04);
  n.buffer = noise; n.loop = true; bp.type = 'bandpass'; bp.frequency.value = freq * 1.5; bp.Q.value = 2.2; ng.gain.setValueAtTime(0, at); ng.gain.linearRampToValueAtTime(vol * 1.1, at + .03); ng.gain.setTargetAtTime(vol * .4, at + .08, .1); ng.gain.setTargetAtTime(0, at + len * .95, .05);
  o.connect(g); g.connect(out); n.connect(bp); bp.connect(ng); ng.connect(out); for (const x of [o, n]) { x.start(at); x.stop(at + len + .4); }
}
// A temple block (mokugyo): a hollow knock. And a shime, the small high drum.
function block(at, vol, out) {
  const o = ac.createOscillator(), g = ac.createGain(); o.frequency.setValueAtTime(620, at); o.frequency.exponentialRampToValueAtTime(470, at + .05);
  g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(vol, at + .003); g.gain.exponentialRampToValueAtTime(.0004, at + .13); o.connect(g); g.connect(out); o.start(at); o.stop(at + .15);
}
function shime(at, hard, out) {
  const o = ac.createOscillator(), g = ac.createGain(), n = ac.createBufferSource(), f = ac.createBiquadFilter(), ng = ac.createGain();
  o.type = 'triangle'; o.frequency.setValueAtTime(390, at); o.frequency.exponentialRampToValueAtTime(300, at + .06); g.gain.setValueAtTime(.12 * hard, at); g.gain.exponentialRampToValueAtTime(.0005, at + .13); o.connect(g); g.connect(out); o.start(at); o.stop(at + .15);
  n.buffer = noise; f.type = 'bandpass'; f.frequency.value = 2100; f.Q.value = .9; ng.gain.setValueAtTime(.09 * hard, at); ng.gain.exponentialRampToValueAtTime(.0005, at + .07); n.connect(f); f.connect(ng); ng.connect(out); n.start(at); n.stop(at + .1);
}
// How each instrument plays a note [step, what, third] of a song's: c = { at, vol, out, len (a step's), shift, strings }.
const early = () => Math.random() * .012;   // (a hair late, as a hand is)
const PLAY = {
  koto: ([i, m, how], c) => koto(m, c.at + (how === 'r' ? 0 : early()), i === 0 ? c.vol : c.vol * .8, c.out, how, c.len * .8, c.shift, c.strings),
  shamisen: ([i, m, how], c) => shamisen(m, c.at + early(), i === 0 ? c.vol : c.vol * .75, c.out, how, c.shift, c.strings, false),
  sanshin: ([i, m, how], c) => shamisen(m, c.at + early(), i === 0 ? c.vol : c.vol * .85, c.out, how, c.shift, c.strings, true),
  pizz: ([i, m], c) => pizz(hz(m + c.shift), c.at + early(), i === 0 ? c.vol : c.vol * .75, c.out),
  glass: ([, m], c) => glass(hz(m + c.shift), c.at + early(), c.vol, c.out),
  bamboo: ([i, m], c) => bamboo(hz(m + c.shift), c.at + early(), i === 0 ? c.vol : c.vol * .7, c.out),
  shakuhachi: ([, m, n], c) => shakuhachi(hz(m + c.shift), c.at, n * c.len, c.out, c.vol),
  flute: ([, m, n], c) => note(hz(m + c.shift), c.at, n * c.len, c.out, c.vol),
  nohkan: ([, m, n], c) => nohkan(hz(m + c.shift), c.at, n * c.len, c.out, c.vol),
  kokyu: ([, m, n], c) => kokyu(hz(m + c.shift), c.at, n * c.len, c.out, c.vol),
  taiko: ([, hard], c) => taiko(c.at, hard * c.vol, c.out),
  shime: ([, hard], c) => shime(c.at, hard * c.vol, c.out),
  block: ([, hard], c) => block(c.at, hard * c.vol, c.out),
};

let step = 0, nextStep = 0, playing = null, songOut = null;
function leaveSong() { if (songOut) { const o = songOut; o.gain.setTargetAtTime(0, ac.currentTime, .5); setTimeout(() => o.disconnect(), 4000); songOut = null; } }   // (one song dies away under the next)
// Call every frame. level: 1 = playing, a little = held quietly under something, 0 = fading away.
// song: one of SONGS, or 'title' (changing song starts the new one from the top).
// shift: how many semitones higher to play it (Level 2's night rises with the tide). tension: 0 to 1, brings in its 'open' and 'seen' parts (Level 4).
export function music(level, song = 'sea', shift = 0, tension = 0) {
  if (!ac) return;
  if (level > 0 && song !== playing) { stopTitle(); leaveSong(); playing = song; step = 0; nextStep = 0; }
  musicBus.gain.setTargetAtTime(level * .6, ac.currentTime, level > 0 ? .4 : .8);
  if (level <= 0) { if (musicBus.gain.value < .01) { step = 0; nextStep = 0; playing = null; stopTitle(); leaveSong(); } return; }   // (faded out: start again from the top next time)
  if (playing === 'title') return titleTheme();
  if (!songOut) { songOut = ac.createGain(); songOut.connect(musicBus); }
  const M = SONGS[playing], len = 60 / M.tempo / 2, out = songOut;   // (len: a step, half a beat)
  if (nextStep < ac.currentTime) nextStep = ac.currentTime + .05;
  while (nextStep < ac.currentTime + .25) {   // schedule what's due in the next quarter second
    const bar = Math.floor(step / M.steps) % M.bars, i = step % M.steps, at = nextStep;
    for (const [who, vol, bars, when] of M.parts) {
      if ((when === 'open' && tension <= 0) || (when === 'seen' && tension < 1)) continue;
      for (const n of bars[bar % bars.length] || []) if (n[0] === i) PLAY[who](n, { at, vol, out, len, shift, strings: M.strings });
    }
    if (i === 0) {
      bass(hz(M.bass[bar % M.bass.length] + shift), at, len * M.steps, out);
      if (bar === 0) templeBell(hz(M.bell + shift), at, .18, out, 8);                                              // each round opens with a temple bell,
      const [chord, from, long] = M.reeds; if (bar === from) sho(chord.map(m => m + shift), at, len * M.steps * long, out, .014);   // and a shō breathes somewhere in the middle
    }
    if (M.clappers && bar === M.bars - 1) for (const [c, v] of [[4, .02], [5.5, .02], [6.5, .022], [7.2, .024], [7.7, .026]]) if (Math.floor(c) === i) clap(at + (c % 1) * len, v, out);   // (the clappers, quickening, before it comes round again)
    nextStep += len; step++;
  }
}

// ============================================================================
// The sea: deep washing noise that swells as each wave comes in and draws back, a hiss of foam on top.
// ============================================================================
let seaBus = null, swell = null, wash = null, nextSwell = 0;
function startSea() {
  seaBus = ac.createGain(); seaBus.gain.value = 0; seaBus.connect(sfxOut);
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
  fx.disconnect(); fx = ac.createGain(); fx.connect(sfxOut);
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

// ============================================================================
// Level 2's small sounds: a wave breaking and running up the sand (size 0..1), sand being piled, the
// bucket filled and tipped out, the lantern's light going out, a crab's claw (or a shell) clicking.
// ============================================================================
export function playWash(size) {
  if (!ac) return;
  const at = ac.currentTime;
  burst(at, 1.6, { from: 250, to: 2200, vol: .35 + .3 * size, attack: .12 });
  burst(at + .15, 1.5, { from: 5000, to: 1800, type: 'highpass', vol: .05 + .05 * size, attack: .2, buf: noise });
}
export function playDig() { if (ac) burst(ac.currentTime, .16, { from: 1500, to: 600, type: 'bandpass', q: .8, vol: .16, buf: noise }); }
export function playScoop() {
  if (!ac) return;
  const at = ac.currentTime, o = ac.createOscillator(), g = ac.createGain();
  burst(at, .2, { from: 1800, to: 900, type: 'bandpass', q: 1, vol: .16, buf: noise });
  o.frequency.setValueAtTime(260, at); o.frequency.exponentialRampToValueAtTime(620, at + .22);   // filling up: the pitch rises
  g.gain.setValueAtTime(.12, at); g.gain.exponentialRampToValueAtTime(.001, at + .26);
  o.connect(g); g.connect(fx); o.start(at); o.stop(at + .3);
}
export function playPour() { if (ac) burst(ac.currentTime, .5, { from: 2200, to: 700, type: 'bandpass', q: .7, vol: .24, attack: .05, buf: noise }); }
// Ichigo asleep: a soft little snore, a rattly breath in and a whistling breath out.
export function playSnore() {
  if (!ac) return;
  const at = ac.currentTime, o = ac.createOscillator(), rattle = ac.createOscillator(), rg = ac.createGain(), f = ac.createBiquadFilter(), g = ac.createGain();
  o.type = 'sawtooth'; o.frequency.setValueAtTime(88, at); o.frequency.linearRampToValueAtTime(112, at + .8);
  rattle.type = 'square'; rattle.frequency.value = 24; rg.gain.value = .03; rattle.connect(rg); rg.connect(g.gain);   // (the rattle: its loudness flutters)
  f.type = 'lowpass'; f.frequency.setValueAtTime(260, at); f.frequency.linearRampToValueAtTime(520, at + .7);
  g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(.06, at + .45); g.gain.linearRampToValueAtTime(0, at + .9);
  const gate = ac.createGain(); gate.gain.setValueAtTime(0, at); gate.gain.linearRampToValueAtTime(1, at + .2); gate.gain.setValueAtTime(1, at + .7); gate.gain.linearRampToValueAtTime(0, at + .95);
  o.connect(f); f.connect(g); g.connect(gate); gate.connect(fx); o.start(at); rattle.start(at); o.stop(at + 1); rattle.stop(at + 1);
  burst(at + .1, .7, { from: 500, to: 1100, type: 'bandpass', q: 1.2, vol: .05, attack: .35, buf: noise });
  burst(at + 1.25, .8, { from: 1500, to: 700, type: 'bandpass', q: 5, vol: .07, attack: .2, buf: noise });
}
// Ichigo, pinched: a small "waa", sliding down.
export function playCry() {
  if (!ac) return;
  for (const [d, top, len] of [[0, 620, .3], [.38, 560, .45]]) {
    const at = ac.currentTime + d, o = ac.createOscillator(), vib = ac.createOscillator(), vg = ac.createGain(), f = ac.createBiquadFilter(), g = ac.createGain();
    o.type = 'triangle'; o.frequency.setValueAtTime(top * .8, at); o.frequency.linearRampToValueAtTime(top, at + .06); o.frequency.exponentialRampToValueAtTime(top * .62, at + len);
    vib.frequency.value = 9; vg.gain.value = 14; vib.connect(vg); vg.connect(o.frequency);
    f.type = 'bandpass'; f.frequency.value = 1000; f.Q.value = .8;
    g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(.14, at + .05); g.gain.exponentialRampToValueAtTime(.001, at + len);
    o.connect(f); f.connect(g); g.connect(fx); o.start(at); vib.start(at); o.stop(at + len); vib.stop(at + len);
  }
}
// Level 3's: a plum eaten; leaves rustling; a plum landing; an empty belly; a yawn; a splash of cold
// water; and cicadas, droning somewhere in the trees.
export function playMunch() { if (!ac) return; for (let i = 0; i < 3; i++) burst(ac.currentTime + i * .13, .09, { from: 1400 - i * 200, to: 500, type: 'bandpass', q: 1.4, vol: .22, buf: noise }); }
export function playRustle() { if (ac) burst(ac.currentTime, .4, { from: 3200, to: 4600, type: 'bandpass', q: .7, vol: .1, attack: .08, buf: noise }); }
export function playThud() { if (!ac) return; const at = ac.currentTime, o = ac.createOscillator(), g = ac.createGain(); o.frequency.setValueAtTime(190, at); o.frequency.exponentialRampToValueAtTime(80, at + .1); g.gain.setValueAtTime(.2, at); g.gain.exponentialRampToValueAtTime(.001, at + .16); o.connect(g); g.connect(fx); o.start(at); o.stop(at + .2); }
export function playGrowl() {
  if (!ac) return;
  const at = ac.currentTime, o = ac.createOscillator(), w = ac.createOscillator(), wg = ac.createGain(), f = ac.createBiquadFilter(), g = ac.createGain();
  o.type = 'sawtooth'; o.frequency.setValueAtTime(62, at); o.frequency.linearRampToValueAtTime(96, at + .3); o.frequency.linearRampToValueAtTime(54, at + .8);
  w.frequency.value = 17; wg.gain.value = 14; w.connect(wg); wg.connect(o.frequency); f.type = 'lowpass'; f.frequency.value = 420;
  g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(.13, at + .15); g.gain.linearRampToValueAtTime(0, at + .85);
  o.connect(f); f.connect(g); g.connect(fx); o.start(at); w.start(at); o.stop(at + .9); w.stop(at + .9);
}
export function playYawn() {
  if (!ac) return;
  const at = ac.currentTime, o = ac.createOscillator(), f = ac.createBiquadFilter(), g = ac.createGain();
  o.type = 'triangle'; o.frequency.setValueAtTime(300, at); o.frequency.linearRampToValueAtTime(460, at + .5); o.frequency.exponentialRampToValueAtTime(210, at + 1.3);
  f.type = 'bandpass'; f.frequency.setValueAtTime(600, at); f.frequency.linearRampToValueAtTime(1100, at + .5); f.frequency.linearRampToValueAtTime(500, at + 1.3); f.Q.value = .8;
  g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(.1, at + .4); g.gain.linearRampToValueAtTime(0, at + 1.3);
  o.connect(f); f.connect(g); g.connect(fx); o.start(at); o.stop(at + 1.4);
}
export function playSplash() { if (ac) { burst(ac.currentTime, .4, { from: 2600, to: 700, type: 'bandpass', q: .7, vol: .45, buf: noise }); burst(ac.currentTime + .05, .5, { from: 500, to: 300, vol: .3 }); } }
// A hammock throwing Ichigo up: a springy boing, higher the harder (k: 0..1). And a wasp's sting.
export function playBoing(k) {
  if (!ac) return;
  const at = ac.currentTime, o = ac.createOscillator(), w = ac.createOscillator(), wg = ac.createGain(), g = ac.createGain();
  o.type = 'triangle'; o.frequency.setValueAtTime(130 + k * 60, at); o.frequency.exponentialRampToValueAtTime(300 + k * 260, at + .22); o.frequency.exponentialRampToValueAtTime(240 + k * 200, at + .5);
  w.frequency.setValueAtTime(24, at); w.frequency.linearRampToValueAtTime(9, at + .5); wg.gain.setValueAtTime(34, at); wg.gain.linearRampToValueAtTime(4, at + .5); w.connect(wg); wg.connect(o.frequency);
  g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(.2, at + .015); g.gain.exponentialRampToValueAtTime(.001, at + .55);
  o.connect(g); g.connect(fx); o.start(at); w.start(at); o.stop(at + .6); w.stop(at + .6);
}
export function playSting() { if (!ac) return; const at = ac.currentTime, o = ac.createOscillator(), f = ac.createBiquadFilter(), g = ac.createGain(); o.type = 'sawtooth'; o.frequency.setValueAtTime(210, at); o.frequency.linearRampToValueAtTime(330, at + .25); f.type = 'bandpass'; f.frequency.value = 1400; f.Q.value = 1; g.gain.setValueAtTime(.16, at); g.gain.exponentialRampToValueAtTime(.001, at + .32); o.connect(f); f.connect(g); g.connect(fx); o.start(at); o.stop(at + .35); }
// Level 4's: a bell rung; a gull woken; a footstep; being seen; a cut at the rope; the door's bolt.
export function playBell() { if (ac) { rin(1150, ac.currentTime, .2, fx); rin(1480, ac.currentTime + .18, .12, fx); } }
export function playSquawk() { if (ac) for (let i = 0; i < 4; i++) gullCry(ac.currentTime + i * .2, 1500 - i * 60, 0, .1); }
export function playStep(vol) { if (ac && vol > .02) burst(ac.currentTime, .12, { from: 260, to: 110, vol: .5 * vol }); }
export function playSmash() { if (ac) { burst(ac.currentTime + .25, .3, { from: 5200, to: 3000, type: 'highpass', vol: .25, buf: noise }); for (const f of [2100, 2900, 3700]) rin(f + Math.random() * 300, ac.currentTime + .25, .05, fx); } }
export function playMeow() { if (!ac) return; const at = ac.currentTime, o = ac.createOscillator(), f = ac.createBiquadFilter(), g = ac.createGain(); o.type = 'sawtooth'; o.frequency.setValueAtTime(520, at); o.frequency.linearRampToValueAtTime(760, at + .16); o.frequency.exponentialRampToValueAtTime(420, at + .6); f.type = 'bandpass'; f.Q.value = 2; f.frequency.setValueAtTime(900, at); f.frequency.linearRampToValueAtTime(2000, at + .2); f.frequency.linearRampToValueAtTime(800, at + .6); g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(.16, at + .08); g.gain.linearRampToValueAtTime(0, at + .62); o.connect(f); f.connect(g); g.connect(fx); o.start(at); o.stop(at + .65); }
export function playSeen() { if (!ac) return; const at = ac.currentTime; for (const [f, d] of [[620, 0], [930, .09]]) { const o = ac.createOscillator(), g = ac.createGain(); o.type = 'square'; o.frequency.value = f; g.gain.setValueAtTime(.09, at + d); g.gain.exponentialRampToValueAtTime(.001, at + d + .3); o.connect(g); g.connect(fx); o.start(at + d); o.stop(at + d + .32); } }
export function playCut() { if (ac) burst(ac.currentTime, .14, { from: 2600, to: 1200, type: 'bandpass', q: 2, vol: .28, buf: noise }); }
export function playBolt() { if (ac) { burst(ac.currentTime, .1, { from: 700, to: 300, vol: .5 }); burst(ac.currentTime + .14, .25, { from: 420, to: 260, type: 'bandpass', q: 3, vol: .35 }); } }
let nextCicada = 0;
// Call every frame: near = how close Ichigo is to the trees, 0..1.
export function cicadas(near) {
  if (!ac || near <= .05 || ac.currentTime < nextCicada) return;
  const at = ac.currentTime, len = 3 + Math.random() * 2, src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(), am = ac.createOscillator(), ag = ac.createGain(), ap = ac.createGain();
  src.buffer = noise; src.loop = true; f.type = 'bandpass'; f.frequency.value = 4200 + Math.random() * 700; f.Q.value = 14;
  am.type = 'square'; am.frequency.setValueAtTime(5, at); am.frequency.linearRampToValueAtTime(8, at + len * .7); ag.gain.value = .35; ap.gain.value = .6; am.connect(ag); ag.connect(ap.gain);   // min-min-min
  g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(.09 * near, at + len * .4); g.gain.linearRampToValueAtTime(0, at + len);
  src.connect(f); f.connect(ap); ap.connect(g); g.connect(fx); src.start(at); am.start(at); src.stop(at + len); am.stop(at + len);
  nextCicada = at + len + 1 + Math.random() * 5;
}
// Level 5's: the wind, all the time (call every frame, 0..1); a gust; thunder, near (1) or far; a rope or a log snapping; the mast creaking.
let windBus = null, windTone = null;
export function windSound(vol) {
  if (!ac) return;
  if (!windBus) { if (vol <= .01) return; windBus = ac.createGain(); windBus.gain.value = 0; windBus.connect(sfxOut); windTone = ac.createBiquadFilter(); windTone.type = 'bandpass'; windTone.Q.value = 1.6; windTone.frequency.value = 420; const src = ac.createBufferSource(); src.buffer = noise; src.loop = true; src.connect(windTone); windTone.connect(windBus); src.start(); }
  const t = ac.currentTime; windBus.gain.setTargetAtTime(vol * .16, t, .35); windTone.frequency.setTargetAtTime(300 + vol * 620 + Math.sin(t * 1.7) * 90 * vol + Math.sin(t * 4.1) * 50 * vol, t, .2);
}
export function playGust(v) { if (ac) { burst(ac.currentTime, 1.6, { from: 500, to: 1500, type: 'bandpass', q: 1.2, vol: .5 * v, attack: .35, buf: noise }); burst(ac.currentTime, 1.4, { from: 160, to: 320, vol: .5 * v, attack: .3 }); } }
export function playThunder(v) { if (!ac) return; const at = ac.currentTime; if (v > .8) burst(at + .05, .25, { from: 5200, to: 900, type: 'highpass', vol: .3, buf: noise }); for (const [d, q] of [[.1, 1], [.42, .7], [.95, .55], [1.6, .3]]) burst(at + d, 1.3, { from: 240, to: 60, vol: .95 * v * q, attack: .05 }); }
export function playSnap() { if (ac) { burst(ac.currentTime, .09, { from: 3800, to: 1500, type: 'bandpass', q: 1.5, vol: .5, buf: noise }); burst(ac.currentTime + .03, .35, { from: 420, to: 130, vol: .6 }); } }
export function playCreak() { if (!ac) return; const at = ac.currentTime, o = ac.createOscillator(), f = ac.createBiquadFilter(), g = ac.createGain(); o.type = 'sawtooth'; o.frequency.setValueAtTime(92, at); o.frequency.linearRampToValueAtTime(128, at + .16); o.frequency.linearRampToValueAtTime(80, at + .36); f.type = 'bandpass'; f.frequency.value = 700; f.Q.value = 5; g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(.12, at + .06); g.gain.linearRampToValueAtTime(0, at + .38); o.connect(f); f.connect(g); g.connect(fx); o.start(at); o.stop(at + .4); }
export function playHiss() { if (ac) { burst(ac.currentTime, 1.1, { from: 6500, to: 2500, type: 'highpass', vol: .22, attack: .03, buf: noise }); burst(ac.currentTime, .5, { from: 600, to: 200, vol: .4 }); } }
export function playClick(pitch = 1) {
  if (!ac) return;
  for (const d of [0, .07]) { const at = ac.currentTime + d, o = ac.createOscillator(), g = ac.createGain();
    o.type = 'triangle'; o.frequency.value = 1500 * pitch; g.gain.setValueAtTime(.07, at); g.gain.exponentialRampToValueAtTime(.001, at + .04); o.connect(g); g.connect(fx); o.start(at); o.stop(at + .05); }
}

// ============================================================================
// Gulls, now and then: a few raspy cries ("kyow, kyow"), somewhere off to one side. They wheel over
// the beach until the sea pulls back (then they stop: the script's warning) and over the sea level.
// ============================================================================
function gullCry(at, pitch, pan, vol) {
  const o = ac.createOscillator(), rasp = ac.createOscillator(), rg = ac.createGain();
  const f = ac.createBiquadFilter(), g = ac.createGain(), p = ac.createStereoPanner ? ac.createStereoPanner() : null;
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(pitch * .75, at); o.frequency.linearRampToValueAtTime(pitch, at + .06); o.frequency.exponentialRampToValueAtTime(pitch * .6, at + .28);   // up, then sliding down
  rasp.frequency.value = 38; rg.gain.value = pitch * .04; rasp.connect(rg); rg.connect(o.frequency);   // the rasp in its throat
  f.type = 'bandpass'; f.frequency.value = pitch * 1.4; f.Q.value = 2.5;
  g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(vol, at + .025); g.gain.exponentialRampToValueAtTime(.001, at + .3);
  o.connect(f); f.connect(g);
  if (p) { p.pan.value = pan; g.connect(p); p.connect(sfxOut); } else g.connect(sfxOut);
  for (const x of [o, rasp]) { x.start(at); x.stop(at + .35); }
}
let nextGull = 0;
// Call every frame: on = gulls about.
export function gulls(on) {
  if (!ac) return;
  const now = ac.currentTime;
  if (!on) { nextGull = now + 3 + Math.random() * 4; return; }   // (when they come back, not straight away)
  if (now < nextGull) return;
  const n = 2 + Math.floor(Math.random() * 3), pitch = 1300 + Math.random() * 500, pan = Math.random() * 1.6 - .8, vol = .025 + Math.random() * .03;
  for (let i = 0; i < n; i++) gullCry(now + .05 + i * (.3 + Math.random() * .08), pitch * (1 - i * .04), pan, vol);
  nextGull = now + 6 + Math.random() * 10;
}


// ============================================================================
// After Toshiro Mayuzumi (the novel: "the soundtrack sounds like Toshiro Mayuzumi"): his Nirvana
// Symphony is built from the sound of Buddhist temple bells, and he drew on gagaku, the old court
// music, with the shō, a mouth organ that holds shimmering clusters of notes and breathes them in
// and out. So: a temple bell (its overtones out of tune with each other, beating slowly as it rings),
// and shō chords swelling and fading. Both are used in the title's theme, and lightly in the sea's music.
// ============================================================================
// A temple bell (bonshō), struck: a soft thud, then a hum and its overtones ringing for a long time.
// Each overtone is a pair of tones a hair apart, so it beats (the bell's slow "wah-wah").
const BELL = [[.5, .55, 1], [1, 1, .85], [1.19, .5, .6], [1.56, .35, .5], [2, .4, .45], [2.66, .22, .3], [3.01, .18, .25], [4.07, .1, .18]];   // [frequency ×, loudness, how long it rings ×]
function templeBell(freq, at, vol, out, len = 10) {
  for (const [k, v, d] of BELL) for (const beat of [-.35, .35]) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = 'sine'; o.frequency.value = freq * k + beat * k;
    g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(vol * v / 2, at + .008); g.gain.exponentialRampToValueAtTime(.0001, at + len * d);
    o.connect(g); g.connect(out); o.start(at); o.stop(at + len * d + .1);
  }
  const n = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();   // the beam striking it
  n.buffer = brown; f.type = 'lowpass'; f.frequency.value = 350;
  g.gain.setValueAtTime(vol * .8, at); g.gain.exponentialRampToValueAtTime(.001, at + .25);
  n.connect(f); f.connect(g); g.connect(out); n.start(at); n.stop(at + .3);
}
// A shō chord: reedy tones (two a hair apart on each note) swelling in over a third of its length,
// held, then breathing out.
function sho(notes, at, len, out, vol = .025) {
  const f = ac.createBiquadFilter(), g = ac.createGain();
  f.type = 'lowpass'; f.frequency.value = 1800; f.Q.value = .4;
  g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(vol, at + len * .35); g.gain.setValueAtTime(vol, at + len * .7); g.gain.linearRampToValueAtTime(0, at + len);
  f.connect(g); g.connect(out);
  for (const m of notes) for (const d of [-3, 3]) {
    const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = hz(m); o.detune.value = d;
    o.connect(f); o.start(at); o.stop(at + len + .1);
  }
}
// A small high bell (a rin): clear, short-ringing.
function rin(freq, at, vol, out) {
  for (const [k, v] of [[1, 1], [2.76, .4], [5.4, .15]]) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = 'sine'; o.frequency.value = freq * k;
    g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(vol * v, at + .003); g.gain.exponentialRampToValueAtTime(.0001, at + 3.5 / k);
    o.connect(g); g.connect(out); o.start(at); o.stop(at + 3.6);
  }
}

// The title's theme, only on the title: 32 seconds, round again. A temple bell struck, a shō chord
// breathing under it; a small bell; a few slow flute notes, far apart; and again, a step lower.
// Each round is scheduled whole when it begins, into its own output (cut off when the title is left).
const TITLE_ROUND = 32;
let titleOut = null, nextRound = 0;
function titleTheme() {
  if (!titleOut) { titleOut = ac.createGain(); titleOut.connect(musicBus); nextRound = ac.currentTime + .1; }
  if (ac.currentTime < nextRound - .2) return;
  const t = nextRound, o = titleOut;
  // (pitched where laptop speakers can carry it: a temple bell's hum is lower still)
  templeBell(hz(57), t, .45, o);                                  // A3
  sho([64, 69, 71, 76, 81], t + .5, 10, o, .042);                 // E A B E A: fourths and fifths, as the court's chords are
  taiko(t + 4, .5, o); taiko(t + 5.6, .7, o);
  koto(64, t + 6.2, .2, o, 'r'); rin(hz(88), t + 8, .07, o);
  for (const [at, m, len] of [[9, 76, 2], [11, 77, .7], [11.7, 76, 1.6], [13.4, 72, .8], [14.2, 71, 3]]) shakuhachi(hz(m), t + at, len, o, .12);
  koto(52, t + 14.4, .22, o, 'o'); koto(64, t + 15.2, .16, o, 'p');
  templeBell(hz(52), t + 17, .4, o);                              // E3
  sho([64, 69, 71, 76, 83], t + 17.5, 10, o, .042);
  koto(69, t + 19, .18, o, 'g'); koto(65, t + 20, .16, o); koto(64, t + 20.8, .2, o, 'o'); koto(59, t + 22.2, .16, o, 'p');
  taiko(t + 21, .5, o); taiko(t + 22.4, .4, o); taiko(t + 22.9, .6, o);
  rin(hz(83), t + 24.5, .065, o);
  for (const [at, m, len] of [[25, 69, 1.2], [26.2, 71, 1], [27.2, 72, .8], [28, 71, 3.4]]) shakuhachi(hz(m), t + at, len, o, .12);
  koto(64, t + 29.4, .17, o, 't', .38);
  nextRound = t + TITLE_ROUND;
}
function stopTitle() { if (titleOut) { titleOut.disconnect(); titleOut = null; } }

// How long ago the sound woke up (seconds; Infinity if it hasn't, or can't). The title uses it: a
// first key press that only woke the sound plays the title's music instead of starting the game.
let wokeAt = null;
addEventListener('keydown', () => { if (ac && wokeAt === null) wokeAt = performance.now(); });
addEventListener('pointerdown', () => { if (ac && wokeAt === null) wokeAt = performance.now(); });
export const soundAge = () => (wokeAt === null ? Infinity : (performance.now() - wokeAt) / 1000);
