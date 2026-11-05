/**
 * Scroll-scrubbed reveal of the chapter heading (progress 0–1, driven by lib/dive.js):
 * - meta row: the hairline draws out from its centre, the stars turn in, and the two
 *   labels slide in from the outer edges,
 * - title: rises letter by letter, left to right,
 * - intro: follows word by word.
 * Letters and words are split into spans once the fonts have loaded. Svetze's kerning is
 * lost across separate boxes, so each letter is nudged back to where the unsplit title set
 * it, and the title still matches Figma.
 */

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const easeOut = t => 1 - (1 - t) ** 3;
// Eased progress of one step that runs from `start` for `length` of the overall progress.
const step = (progress, start, length) => easeOut(clamp((progress - start) / length));

// Timings within the reveal (0–1).
const META = { start: 0, length: .4 };
// The last letter starts at most `spread` after the first, so a longer title staggers tighter
// (Foundations, 11 letters, keeps the full .036).
const TITLE = { start: .12, stagger: .036, spread: .36, length: .28 };
const INTRO = { start: .42, spread: .34, length: .24 };

function splitLetters(title) {
  const text = title.textContent;
  const node = title.firstChild;
  const range = document.createRange();
  const before = [...text].map((_, index) => {
    range.setStart(node, index);
    range.setEnd(node, index + 1);
    return range.getBoundingClientRect().left;
  });

  title.setAttribute('aria-label', text);
  title.textContent = '';
  // Each word's letters are kept together, so a title that wraps (The Flourishing) still breaks
  // only between words: separate letter boxes could otherwise break anywhere.
  let word = null;
  const letters = [...text].map(char => {
    const letter = document.createElement('span');
    letter.className = 'chapter__letter';
    letter.setAttribute('aria-hidden', 'true');
    letter.textContent = char;
    if (char.trim()) {
      if (!word) {
        word = document.createElement('span');
        word.className = 'chapter__letters';
        title.append(word);
      }
      word.append(letter);
    } else {
      word = null;
      title.append(letter);
    }
    return letter;
  });

  // Rects are on the scaled artboard; margins are in em, so they hold at any font size (the
  // portrait layout sizes the title to the screen). Each line is nudged from its own first letter
  // (spaces have no box of their own to tell the line by).
  const scale = title.getBoundingClientRect().height / title.offsetHeight || 1;
  const size = parseFloat(getComputedStyle(title).fontSize) || 1;
  const after = letters.map(letter => letter.getBoundingClientRect());
  let first = 0;
  let shift = 0;
  letters.forEach((letter, index) => {
    if (letter.textContent.trim() && Math.abs(after[index].top - after[first].top) > 1) {
      first = index;
      shift = 0;
    }
    const nudge = (before[index] - before[first] - (after[index].left - after[first].left)) / scale - shift;
    if (Math.abs(nudge) > .05) {
      letter.style.marginLeft = `${(nudge / size).toFixed(5)}em`;
      shift += nudge;
    }
  });
  return letters;
}

function splitWords(intro) {
  const words = intro.textContent.trim().split(/\s+/);
  intro.textContent = '';
  return words.map((text, index) => {
    if (index) intro.append(' ');
    const word = document.createElement('span');
    word.className = 'chapter__word';
    word.textContent = text;
    intro.append(word);
    return word;
  });
}

/** titleRise: how far each letter rises, in em (72px on the 240px Foundations title). */
export function createHeadingReveal(heading, { titleRise = .3 } = {}) {
  const kickers = [...heading.querySelectorAll('.chapter__kicker')];
  const stars = [...heading.querySelectorAll('.chapter__star')];
  const hairline = heading.querySelector('.chapter__hairline');
  let letters = [];
  let words = [];
  let last = -1;

  function render(progress) {
    if (progress === last) return;
    last = progress;

    const meta = step(progress, META.start, META.length);
    // Distances are in em (Figma: 40px on the 28px meta, 72px on the 240px title, 14px on the
    // 20px intro), so the motion keeps its proportions in the portrait layout.
    kickers.forEach((kicker, index) => {
      const from = index ? 40 / 28 : -40 / 28;
      kicker.style.opacity = meta.toFixed(3);
      kicker.style.transform = `translate3d(${((1 - meta) * from).toFixed(4)}em, 0, 0)`;
    });
    const draw = step(progress, META.start + .06, META.length);
    if (hairline) hairline.style.transform = `scaleX(${draw.toFixed(4)})`;
    const turn = step(progress, META.start + .14, META.length - .1);
    for (const star of stars) {
      star.style.opacity = turn.toFixed(3);
      star.style.transform = `rotate(${((1 - turn) * -120).toFixed(1)}deg) scale(${(.3 + .7 * turn).toFixed(3)})`;
    }

    const stagger = Math.min(TITLE.stagger, TITLE.spread / Math.max(1, letters.length - 1));
    letters.forEach((letter, index) => {
      const rise = step(progress, TITLE.start + index * stagger, TITLE.length);
      letter.style.opacity = rise.toFixed(3);
      letter.style.transform = `translate3d(0, ${((1 - rise) * titleRise).toFixed(4)}em, 0) rotate(${((1 - rise) * 6).toFixed(2)}deg)`;
    });

    const gap = words.length > 1 ? INTRO.spread / (words.length - 1) : 0;
    words.forEach((word, index) => {
      const rise = step(progress, INTRO.start + index * gap, INTRO.length);
      word.style.opacity = rise.toFixed(3);
      word.style.transform = `translate3d(0, ${((1 - rise) * .7).toFixed(4)}em, 0)`;
    });
  }

  // Split once Svetze and DM Sans are in, so the measurements are of the real glyphs.
  const ready = document.fonts.ready.then(() => {
    letters = splitLetters(heading.querySelector('.chapter__title'));
    // Period III's intro is below the first screen and comes in as it is read (lib/brilliance.js).
    const intro = heading.querySelector('.chapter__intro');
    words = intro ? splitWords(intro) : [];
    const pending = last;
    last = -1;
    if (pending >= 0) render(pending);
    return { letters, words };
  });

  // `ready` resolves with the split letters and words.
  return { render, ready };
}
