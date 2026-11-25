// ============================================================================
// songs.js — the music, written down: one song for each level (audio.js has the instruments, and plays them).
//
// What keeps them one game's music: every round opens on a temple bell; the koto and the shakuhachi are in almost
// all of them; a shō breathes somewhere in the middle; they're played in one room (the same echo); and each has
// THE LULLABY in it, its seven notes (five rising, two falling back) bent into that song's own scale.
// What makes each its own: its scale, its metre, its tempo, and one instrument that only it has.
//
//   level 1   sea       miyako-bushi   4 beats, driving      shamisen and small drum: the big sea
//   level 2   night     hirajōshi      3 beats, slow         glass bells: sea-fireflies, and waves in the dark
//             morning   yo             4 beats, walking      the Lullaby itself, at last, on koto and flute
//   between   journey   yo             4 beats, very slow    bits of the Lullaby, coming back to Ichigo
//   level 3   isle      Ryūkyū         3 beats, swaying      sanshin and bamboo: a hammock
//   level 4   prowl     iwato          5 beats, on tiptoe    temple block and bowed kokyū: the eye
//
// A song: tempo (beats a minute; a step is half a beat), steps to a bar, bars to a round, its strings (the scale,
// up the koto), bass (a low note for each bar, in turn), bell and reeds (the shō's notes, and the bar they come in).
// Its parts: [instrument, how loud, bars (in turn; null or [] rests), when]. A note: [step, note, ...], notes as MIDI
// numbers (E2 40, A2 45, E3 52, A3 57, C4 60, E4 64, A4 69, C5 72, E5 76, A5 81); a drum's is [step, how hard].
// Third in a koto's or shamisen's note, how it's played: 'o' with the octave below; 'p' pressed, bent up and let go;
// 'g' a grace note first; 'r' a run down to it; 't' repeated, faster and faster. Third in a held note: how many steps.
// when: 'open' only sounds while the song's tension is up at all, 'seen' only when it's all the way (Level 4's eye).
// ============================================================================
const R = null;   // a bar's rest

export const SONGS = {
  // Level 1, the Great Wave. A koto line with room round it, then the shamisen strumming under it and the drums rolling like the sea.
  sea: {
    tempo: 76, steps: 8, bars: 16, strings: [52, 53, 57, 59, 60, 64, 65, 69, 71, 72, 76, 77, 81], bass: [40, 45, 41, 40], bell: 52, reeds: [[64, 69, 71, 76, 81], 8, 4],
    clappers: true,   // (quickening, before it comes round again)
    parts: [
      ['koto', .26, [
        [[0, 64, 'o'], [3, 65], [4, 64], [6, 59]], [[0, 57, 'g'], [2, 60], [3, 59], [4, 57, 'p']], [[0, 52, 'o'], [2, 59], [3, 64], [4, 69, 'g'], [6, 71]], [[0, 72, 'p'], [3, 71], [4, 69], [5, 65], [6, 64]],
        [[0, 52], [4, 64]], [[0, 57], [3, 60], [4, 59]], [[0, 53], [4, 57], [6, 53]], [[0, 52, 'o'], [5, 64, 'r']],
        [[2, 76, 'r']], [[0, 64, 'p'], [4, 65]], [[0, 72, 'g'], [4, 71]], [[0, 69, 't'], [6, 65]],
        [[0, 64, 'o'], [4, 59]], [[0, 60], [2, 59], [4, 57, 'p']], [[0, 53], [3, 57], [4, 59, 'g']], [[0, 64, 'r'], [4, 52, 'o']]]],
      ['shakuhachi', .1, [R, R, R, R,
        [[0, 71, 3], [3, 72, 1], [4, 76, 4]], [[0, 72, 2], [2, 71, 2], [4, 69, 4]], [[0, 71, 3], [3, 69, 1], [4, 65, 4]], [[0, 64, 7]],
        R, R, R, R,
        [[0, 64, 2], [2, 65, 2], [4, 69, 2], [6, 71, 2]], [[0, 72, 4], [4, 71, 4]], [[0, 69, 2], [2, 65, 1], [3, 64, 5]], R]],   // the Lullaby
      ['shamisen', .15, [R, R, R, R,
        [[0, 52], [3, 64], [4, 59], [6, 64], [7, 65]], [[0, 57], [3, 64], [4, 60], [6, 59]], [[0, 53], [3, 60], [4, 57], [6, 60], [7, 59]], [[0, 52], [3, 59], [4, 52]],
        R, R, R, [[4, 52], [5, 52], [6, 52], [7, 53]],
        [[0, 52], [3, 64], [4, 59], [6, 64], [7, 65]], [[0, 57], [3, 64], [4, 60], [6, 59]], [[0, 53], [2, 57], [3, 60], [4, 59], [6, 57]], [[0, 52], [2, 52, 'g'], [4, 52]]]],
      ['taiko', 1, [[[0, 1]], [[0, .7], [5, .35]], [[0, 1]], [[0, .7], [4, .4], [5, .5], [6, .8]]]],
      ['shime', .7, [R, R, R, [[4, .4], [6, .5], [7, .3]],
        [[0, .5], [2, .3], [3, .25], [4, .5], [6, .35], [7, .25]], [[0, .5], [2, .3], [4, .5], [6, .35]], [[0, .5], [2, .3], [3, .25], [4, .5], [6, .35], [7, .25]], [[0, .5], [4, .5], [5, .3], [6, .4], [7, .5]],
        R, R, R, [[4, .3], [5, .35], [6, .45], [7, .55]],
        [[0, .5], [2, .3], [3, .25], [4, .5], [6, .35], [7, .25]], [[0, .5], [2, .3], [4, .5], [6, .35]], [[0, .5], [2, .3], [3, .25], [4, .5], [6, .35], [7, .25]], [[0, .6], [4, .4]]]],
    ],
  },

  // The journeys between levels, all of them: hardly a song, only bits of the Lullaby, in its own scale, coming back to Ichigo.
  journey: {
    tempo: 48, steps: 8, bars: 8, strings: [50, 52, 55, 57, 59, 62, 64, 67, 69, 71, 74, 76, 79, 81], bass: [38, 43, 40, 38], bell: 50, reeds: [[62, 67, 69, 74], 4, 3],
    parts: [
      ['koto', .18, [[[0, 50, 'o'], [4, 57]], [[0, 55], [3, 62]], [[0, 52], [4, 59], [6, 64]], [[0, 50]], [[0, 50, 'o'], [4, 57], [6, 62]], [[0, 55], [4, 64, 'p']], [[0, 52], [4, 59]], [[0, 50, 'o']]]],
      ['koto', .12, [R, [[4, 74], [6, 76]], R, [[2, 79], [4, 76]], R, R, [[4, 71], [6, 69]], R]],
      ['glass', .04, [R, R, R, [[6, 86]], R, [[2, 83]], R, R]],
    ],
  },

  // Level 2, the tide at night: three slow beats, in and out like the water, and glass bells like the lights in it.
  // (It steps up with each set of waves: see music's `shift`.)
  night: {
    tempo: 58, steps: 6, bars: 16, strings: [52, 53, 57, 59, 60, 64, 65, 69, 71, 72, 76, 77, 81], bass: [45, 41, 40, 45], bell: 57, reeds: [[69, 71, 76, 81], 4, 4],
    parts: [
      ['glass', .1, [
        [[0, 69], [2, 76], [4, 81]], [[0, 72], [3, 77], [4, 76]], [[0, 71], [2, 76], [4, 83]], [[0, 81], [3, 77]],
        [[0, 69], [2, 72], [4, 76]], [[0, 77], [2, 76], [4, 72]], [[0, 71], [3, 72]], [[0, 69]]]],
      ['glass', .03, [R, [[5, 88]], R, [[1, 89], [4, 88]], R, R, [[2, 93]], [[4, 88], [5, 84]]]],   // (and higher, further off)
      ['koto', .17, [[[0, 57, 'o']], R, [[0, 52]], [[3, 53]], [[0, 57, 'o']], R, [[0, 52], [3, 59]], [[3, 64, 'r']]]],
      ['shakuhachi', .06, [R, R, R, R, R, R, R, R, [[0, 69, 2], [2, 71, 2], [4, 72, 2]], [[0, 76, 2], [2, 77, 2], [4, 76, 2]], [[0, 72, 6]], [[0, 71, 5]], R, R, R, R]],   // the Lullaby
      ['taiko', .45, [[[0, .8]], R]],
    ],
  },
  // ...and the morning, out on the sandbar: the Lullaby's own scale, and the Lullaby as Kaa-chan hums it.
  morning: {
    tempo: 69, steps: 8, bars: 16, strings: [50, 52, 55, 57, 59, 62, 64, 67, 69, 71, 74, 76, 79, 81], bass: [38, 43, 40, 45], bell: 62, reeds: [[62, 67, 69, 74], 8, 4],
    parts: [
      ['koto', .22, [
        [[0, 50, 'o'], [2, 57], [4, 62], [6, 64]], [[0, 55], [2, 62], [4, 67], [6, 69]], [[0, 52], [2, 59], [4, 64], [6, 67]], [[0, 57], [3, 64], [4, 62]],
        [[0, 50, 'o'], [2, 57], [4, 62], [6, 69]], [[0, 55], [2, 62], [4, 71], [6, 69]], [[0, 52], [3, 59], [4, 67], [6, 64]], [[0, 50, 'o'], [5, 62, 'r']]]],
      ['flute', .1, [R, R, R, R,
        [[0, 62, 2], [2, 64, 2], [4, 67, 2], [6, 69, 2]], [[0, 71, 2], [2, 69, 2], [4, 67, 4]], [[0, 69, 2], [2, 67, 2], [4, 64, 4]], [[0, 62, 7]],   // the Lullaby
        R, R, R, R, [[0, 74, 4], [4, 71, 4]], [[0, 69, 2], [2, 71, 2], [4, 67, 4]], [[0, 64, 4], [4, 67, 4]], [[0, 62, 7]]]],
      ['glass', .03, [R, R, R, [[6, 86]], R, R, R, R, [[0, 86], [4, 81]], R, [[2, 88], [6, 83]], R, R, R, R, R]],   // (the last of the night's lights)
      ['taiko', .5, [[[0, .7]], R, [[0, .6]], [[4, .35], [6, .5]]]],
    ],
  },

  // Level 3, the Sleepy Island: the southern islands' scale, a sanshin, and bamboo rocking like a hammock. It never quite
  // gets anywhere. (With each plum it's played a semitone lower: `shift`.)
  isle: {
    tempo: 56, steps: 6, bars: 16, strings: [55, 59, 60, 62, 66, 67, 71, 72, 74, 78, 79], bass: [43, 48, 43, 38, 43, 48, 38, 43], bell: 55, reeds: [[62, 67, 71, 74], 4, 4],
    parts: [
      ['bamboo', .2, [
        [[0, 43], [2, 59], [4, 62]], [[0, 48], [2, 60], [4, 67]], [[0, 43], [2, 59], [4, 62]], [[0, 50], [2, 62], [4, 66]],
        [[0, 43], [2, 59], [4, 62]], [[0, 48], [2, 60], [4, 67]], [[0, 50], [2, 62], [4, 66]], [[0, 43], [2, 59]]]],
      ['sanshin', .28, [
        [[0, 67], [3, 71], [5, 72]], [[0, 74, 'g'], [3, 72]], [[0, 71], [2, 67], [3, 66], [5, 67]], [[0, 62]],
        [[0, 67], [3, 71], [4, 72]], [[0, 79], [3, 78], [5, 74]], [[0, 72], [2, 71], [3, 66]], [[0, 67, 'o']],
        [[0, 67]], R, [[3, 62], [5, 66]], [[0, 67]], [[0, 67], [3, 71], [5, 72]], [[0, 74, 'p']], [[0, 72], [2, 71], [3, 66]], [[0, 67, 'o']]]],
      ['flute', .08, [R, R, R, R, R, R, R, R, [[0, 67, 2], [2, 71, 2], [4, 72, 2]], [[0, 74, 2], [2, 78, 2], [4, 74, 2]], [[0, 72, 6]], [[0, 71, 5]], R, R, R, R]],   // the Lullaby
      ['koto', .1, [R, R, R, [[2, 74, 'r']], R, R, R, R]],
    ],
  },

  // Level 4, the Lighthouse: five beats, on tiptoe, in the darkest scale. Low plucked strings and a heartbeat, always.
  // While the eye is open the temple block ticks; when it sees Ichigo, the drums and a bowed shiver come in.
  prowl: {
    tempo: 92, steps: 10, bars: 16, strings: [40, 41, 45, 46, 50, 52, 53, 57, 58, 62, 64, 65, 69, 70, 74, 76], bass: [28, 28, 29, 28], bell: 52, reeds: [[64, 65, 70, 76], 4, 4],
    parts: [
      ['pizz', .4, [
        [[0, 40], [3, 41], [4, 40], [7, 46], [8, 45]], [[0, 40], [3, 41], [4, 45], [8, 46]], [[0, 40], [3, 41], [4, 40], [7, 46], [8, 45]], [[0, 40], [6, 52], [8, 53]],
        [[0, 40], [3, 41], [4, 40], [7, 46], [8, 45]], [[0, 40], [3, 41], [4, 45], [8, 46]], [[0, 38], [3, 40], [4, 41], [7, 40]], [[0, 40], [6, 45], [8, 41]]]],
      ['koto', .25, [R, R, R, [[4, 69, 'p'], [7, 70]], R, R, R, [[2, 74], [5, 70], [7, 69, 'p']], R, R, R, R, R, R, [[2, 65], [5, 64, 'g']], [[0, 52, 'o'], [5, 76, 'r']]]],
      ['kokyu', .075, [R, R, R, R, R, R, R, R, [[0, 64, 2], [2, 65, 2], [4, 69, 2], [6, 70, 2], [8, 74, 2]], [[0, 70, 3], [3, 69, 7]], [[0, 65, 10]], [[0, 64, 8]], R, R, R, R]],   // the Lullaby
      ['taiko', .55, [[[0, .9], [1, .5]], [[0, .8], [1, .4]], [[0, .9], [1, .5]], [[0, .8], [1, .4], [8, .4]]]],
      ['block', .22, [[[0, 1], [2, .5], [4, .8], [6, .5], [8, .7]]], 'open'],
      ['block', .16, [[[1, .5], [3, .5], [5, .5], [7, .5], [9, .6]]], 'seen'],
      ['taiko', .6, [[[2, .5], [4, .8], [5, .5], [6, .9], [8, .7], [9, .9]]], 'seen'],
      ['kokyu', .06, [[[0, 69, 5], [5, 70, 5]], [[0, 70, 5], [5, 69, 5]]], 'seen'],
    ],
  },
};
