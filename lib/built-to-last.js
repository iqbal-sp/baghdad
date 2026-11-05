import { coverPrevious } from './cover.js';

/**
 * Period III, part I (Figma 335:4367): built to last. It slides up over the chapter (lib/cover.js:
 * the end map, still pinned, is moved up so it rises at UNDER of the scroll, and dims). Not in
 * Figma: as it comes, the disc turns into place from right to left, and what is on it, the picture
 * in its hollow (the hall's first painting: lib/hall.js) and the words round its edge, the other way, all arriving where Figma has them
 * as the section's top reaches the top of the view. It follows the scroll, both ways. The section
 * then sticks by its foot while the camera goes through the hollow into the hall (lib/hall.js).
 *
 * Also not in Figma: the relief letters, which Figma fades out away from two soft ellipses, come
 * up about a fine pointer as it moves over the section, in Figma's own emboss, and fade away again
 * when it leaves. With reduced motion everything simply stays in place.
 */

const UNDER = .5;
const TURN = 180;        // degrees the disc and what is on it start from, either way
const FOLLOW = .1;       // share of the way to the pointer the letters' glimpse moves per 60 fps frame
const START = .3;        // share of the section's arrival the turn starts at: the disc coming into view

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
// Gentle, so most of the turn is still to come while the disc is in view.
const out = t => 1 - (1 - t) ** 2;

// The pointer's place in the frame, as the mask's centre (styles.css), eased after it.
function revealLetters(section) {
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  const letters = section.querySelector('.built-to-last__embossed--full');
  let pointerX = 0, pointerY = 0, goalX = 0, goalY = 0, x = 0, y = 0, frame = 0, last = 0, shown = false;

  function aim() {
    const box = letters.getBoundingClientRect();
    const unit = box.width / letters.offsetWidth;
    goalX = (pointerX - box.left) / unit;
    goalY = (pointerY - box.top) / unit;
  }

  function place() {
    letters.style.setProperty('--x', `${x.toFixed(1)}px`);
    letters.style.setProperty('--y', `${y.toFixed(1)}px`);
  }

  function tick(time) {
    frame = 0;
    const frames = last ? Math.min(time - last, 100) / (1000 / 60) : 1;
    last = time;
    const toward = 1 - (1 - FOLLOW) ** frames;
    x += (goalX - x) * toward;
    y += (goalY - y) * toward;
    const settled = Math.abs(goalX - x) + Math.abs(goalY - y) < .2;
    if (settled) { x = goalX; y = goalY; last = 0; }
    place();
    if (!settled) schedule();
  }
  function schedule() { frame ||= requestAnimationFrame(tick); }

  section.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse') return;
    pointerX = event.clientX;
    pointerY = event.clientY;
    aim();
    // Coming back, it fades in where the pointer is, not where it was last.
    if (!shown) {
      shown = true;
      x = goalX;
      y = goalY;
      place();
      letters.classList.add('is-shown');
    }
    schedule();
  }, { passive: true });
  section.addEventListener('pointerleave', () => {
    shown = false;
    letters.classList.remove('is-shown');
  }, { passive: true });
  // The page moves under a still pointer.
  addEventListener('scroll', () => {
    if (!shown) return;
    aim();
    schedule();
  }, { passive: true });
}

export function startBuiltToLast(section, { lenis } = {}) {
  if (!section) return;
  coverPrevious(section, { under: UNDER, lenis, covered: document.querySelector('.period-map--end'), pinned: true });
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  revealLetters(section);
  const disc = section.querySelector('.built-to-last__seal-crop');
  const contents = section.querySelectorAll('.built-to-last__picture, .built-to-last__curved-copy');

  // Runs on both Lenis's and the window's scroll; the second call in a frame finds nothing moved.
  let last = null;
  function render() {
    const arrived = clamp(1 - section.getBoundingClientRect().top / window.innerHeight);
    if (arrived === last) return;
    last = arrived;
    const left = TURN * (1 - out(clamp((arrived - START) / (1 - START))));
    disc.style.rotate = `${left.toFixed(2)}deg`;
    for (const part of contents) part.style.rotate = `${(-left).toFixed(2)}deg`;
  }

  lenis?.on('scroll', render);
  addEventListener('scroll', render, { passive: true });
  addEventListener('resize', () => { last = null; render(); });
  render();
}
