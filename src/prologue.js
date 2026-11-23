// ============================================================================
// prologue.js — Level 0: before the game begins, what Ichigo is and where it comes from. A few story
// cards (cards.js), each over one of Hokusai's prints, whose look the game borrows: first the Great
// Wave (the title card's), then the five prints of the new mornings (dawn.js), each captioned.
// Then Level 1's beach.
// ============================================================================
import { P, LW, LH } from './config.js';
import { S } from './state.js';
import { lg, pixelSpace } from './pixel.js';
import { pixelText, LETTER } from './text.js';
import { drawTitleArt } from './title.js';
import { drawPrint, PRINT_TITLES } from './dawn.js';
import { showCards, cardIndex, cardsActive } from './cards.js';

const PROLOGUE_CARDS = [
  "ICHIGO: A CHILD OF THE SEA IS A GAME FROM A NOVEL: TOMORROW, AND TOMORROW, AND TOMORROW, BY GABRIELLE ZEVIN.",
  'IN THE NOVEL, TWO FRIENDS, SADIE GREEN AND SAM MASUR, MAKE THEIR FIRST GAME TOGETHER AND RELEASE IT IN 1997. THIS IS IT.',
  'A GREAT WAVE SWEEPS A SMALL CHILD, ICHIGO, OUT TO SEA. ACROSS FIFTEEN LEVELS, ICHIGO GROWS UP WHILE TRYING TO FIND THE WAY HOME.',
  "ITS LOOK COMES FROM HOKUSAI'S WOODBLOCK PRINTS OF THE SEA AND MOUNT FUJI, LIKE THE ONES BEHIND THESE WORDS.",
  'THIS IS A FAN-MADE VERSION OF SADIE AND SAM\'S GAME. IT BEGINS ON A BEACH, ONE EVENING, WHEN ICHIGO IS PLAYING ON THE SAND ALONE.',
];

// then(): what comes after (Level 1's beach).
export function startPrologue(then) {
  S.scene = 'prologue'; S.sceneT = 0;
  showCards(PROLOGUE_CARDS, then);
}

export function drawPrologue() {
  pixelSpace(lg);
  const i = cardsActive() ? cardIndex() : PROLOGUE_CARDS.length - 1;
  let caption;
  if (i === 0) { drawTitleArt(lg, S.T); caption = 'THE GREAT WAVE OFF KANAGAWA'; }
  else { const n = (i - 1) % PRINT_TITLES.length; drawPrint(lg, n, S.T); caption = PRINT_TITLES[n]; }
  // the print's name on a paper label at the bottom left, as on the prints themselves, and "LEVEL 0"
  // on a smaller one above it (the bottom-right corner is the settings gear's)
  caption = 'HOKUSAI: ' + caption;
  const room = Math.floor((LW - 80) / LETTER);   // (clear of the gear)
  if (caption.length > room) caption = caption.slice(0, room - 1) + '.';
  label(caption, LH - 34);
  label('LEVEL 0', LH - 62);
}
function label(text, y) {
  const w = text.length * LETTER + 10;
  lg.fillStyle = P.outline; lg.fillRect(8, y, w + 4, 26);
  lg.fillStyle = P.foam; lg.fillRect(10, y + 2, w, 22);
  pixelText(text, 16, y + 6, P.navy);
}
