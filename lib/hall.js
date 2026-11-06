import { stageScale } from './iris.js';
import { whenNear } from './offscreen.js';
import { startLetterThrow } from './letter-throw.js';
import { HALL_HOLD } from './catalogue.js';

/**
 * Period III, part I: the three foundations (Figma 359:220). One long hall, three bays of it: the
 * hospital, the college, the library, one after another along the wall.
 *
 * Into it (THROUGH artboard px, not in Figma): the disc's section sticks by its foot (styles.css,
 * .built-to-last__pin) and the camera goes in through its hollow, which holds the first painting
 * (.built-to-last__picture) at PICTURE across. The hall takes over from that picture at the same
 * size and place and under the same light, so nothing changes; from then on it is one zoom.
 * Disc and painting grow together, locked to each other, so the picture stays put in its hollow;
 * the painting then eases to its place in the wall while the disc goes on past the camera, and the
 * hall shows through a circle that grows with the hollow. Then the first entry rises in.
 *
 * Along it (TRAVEL artboard px): the scroll walks the wall from bay to bay, holding at each (HOLD).
 * The text belongs to the view, not the wall: it leaves as the walk starts and the next comes in as
 * it ends, in the dark of the doorway between, so words never slide. The heading rises word by word
 * and the body follows (WORDS, BODY), the same way out as in. The dots follow the camera, each as
 * lit as the camera is near its bay, and a bay just reached takes a single band of light across
 * its gilding, then its brass (.is-here, a CSS animation: once, whatever the scroll does next). The room darkens towards the
 * edges of the view as the walk goes on, and lightens as the next bay arrives: one layer on the
 * view, not on the bays, so there is no edge to it. A column near the camera, in shadow, passes the
 * view faster than the wall (NEAR), for depth.
 *
 * Out of it (THROW artboard px): at the last bay the text and the dots go with the scroll, and past
 * TOSS the closing letter is thrown (lib/letter-throw.js). That alone runs in real time. The hall
 * then stays pinned through the BURN that ends it (lib/catalogue.js).
 *
 * Only transforms, opacity and a clip change per frame, on layers of their own (styles.css), and
 * the images are decoded before the section is reached (preload): what is costly here is repainting
 * a wall this size, or showing a picture before it is ready.
 *
 * Everything else follows the scroll, both ways. With reduced motion there is no way through and no
 * walk: the hall is a pinned section after the disc's, the bays change in steps, and the letter is
 * simply there at the end.
 */

const FRAME = { width: 1440, height: 964 };
const THROUGH = 1500;           // artboard px (.hall, .built-to-last --through)
const TRAVEL = 4600;            // artboard px from the hall opening to the last bay (--hall-travel)
const STEP = 1472.08;           // stage px from one bay to the next: a bay's width less the overlap
const HOLD = .36;               // share of each bay's scroll spent at rest, half at either end
const LAST = 2;                 // the last bay
const HOLLOW = { x: 718.93, y: 558.64, r: 112.5 }; // in the disc's frame, just inside its rim
const REACH = 1.15;             // the circle ends this far past the view's farthest corner
const PICTURE = 362;            // the painting's width in the hollow (.built-to-last__picture)
const ART = { width: 696, y: -200 };  // the painting in the hall: its width, its centre from the stage's
const ENTRY = [.8, 1];          // share of THROUGH the first entry rises over
const TEXT_GONE = .2;           // the text is gone this far (in bays) from its bay
const RISE = 20;                // stage px the text rises by
const WORDS = [.42, .58];       // the heading: last word's start, and how long each word takes
const BODY = [.46, 1];          // the body: when it comes in
const HERE = .012;              // a bay is reached within this much of it, in bays
const DARK = .5;                // the room is at its darkest this far (in bays) from a bay
const NEAR = 1.8;               // the column moves this much faster than the wall
const COLUMN = 562;             // its width on the stage, its shadow included
const THROW = 1200;             // artboard px of the letter's part of the scroll (--hall-travel)
const TOSS = .3;                // share of THROW: the last entry and the dots are gone, and it is thrown

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const span = (t, from, to) => clamp((t - from) / (to - from));
const ease = t => t * t * (3 - 2 * t);
const inOut = t => (t < .5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

export function startHall(section, { lenis } = {}) {
  if (!section) return {};
  const pin = section.querySelector('.hall__pin');
  const stage = section.querySelector('.hall__stage');
  const track = section.querySelector('.hall__track');
  const bays = [...section.querySelectorAll('.hall__bay')];
  // Each heading by the word; it reads as one from aria-label.
  const entries = [...section.querySelectorAll('.hall__entry')].map(entry => {
    const heading = entry.querySelector('h4');
    const text = heading.textContent.trim();
    heading.setAttribute('aria-label', text);
    heading.textContent = '';
    const words = text.split(/\s+/).map((word, index) => {
      if (index) heading.append(' ');
      const box = document.createElement('span');
      box.setAttribute('aria-hidden', 'true');
      box.textContent = word;
      heading.append(box);
      return box;
    });
    entry.style.opacity = '1';
    return { entry, words, body: entry.querySelector('p'), last: null };
  });
  const passage = section.querySelector('.hall__passage');
  const dots = [...section.querySelectorAll('.hall__dots li')];
  const columns = [...section.querySelectorAll('.hall__column')];
  const dotsBox = section.querySelector('.hall__dots');
  const built = document.querySelector('.built-to-last');
  const builtPin = built?.querySelector('.built-to-last__pin');
  const camera = built?.querySelector('.built-to-last__camera');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  section.style.setProperty('--hall-travel', `${TRAVEL + THROW + (reduced ? 0 : HALL_HOLD)}px`);
  if (!reduced) {
    section.classList.add('is-armed');
    section.style.setProperty('--through', `${THROUGH}px`);
    built?.style.setProperty('--through', `${THROUGH}px`);
  }

  // How far along the wall, in bays, for a share of the walk: each bay holds, half a hold at the
  // ends of each move.
  function walked(share) {
    const at = share * LAST;
    if (reduced) return Math.round(at);
    const i = Math.min(Math.floor(at), LAST - 1);
    return i + inOut(clamp((at - i - HOLD / 2) / (1 - HOLD)));
  }

  function through(t) {
    const going = t > 0 && t < 1;
    section.classList.toggle('is-open', t >= 1);
    if (!going) {
      camera.style.transform = '';
      stage.style.transform = '';
      pin.style.clipPath = '';
      return;
    }
    const width = section.clientWidth;
    const view = window.innerHeight;
    const unit = width / FRAME.width;
    const fit = Math.min(unit, view / FRAME.height);
    const top = builtPin.getBoundingClientRect().top;
    const x = width / 2 + (HOLLOW.x - FRAME.width / 2) * unit;
    const y = top + HOLLOW.y * unit;
    const r = HOLLOW.r * unit;
    const end = Math.hypot(Math.max(x, width - x), Math.max(y, view - y)) * REACH / r;
    // A constant rate: slow out of the disc, then the hollow rushes past.
    const zoom = end ** inOut(t);
    camera.style.transformOrigin = `${x.toFixed(1)}px ${(HOLLOW.y * unit).toFixed(1)}px`;
    camera.style.transform = `scale(${zoom.toFixed(4)})`;
    pin.style.clipPath = `circle(${(r * zoom).toFixed(1)}px at ${x.toFixed(1)}px ${y.toFixed(1)}px)`;

    // The painting: at first it grows at the disc's own rate, about the hollow, so the two are one.
    // That rate then falls away and it comes to rest in the wall (the curve's slope at 0 is the
    // disc's: the zoom it has left to do, over twice what the disc will do).
    const from = PICTURE * unit / (ART.width * fit);
    const done = Math.log(zoom) / Math.log(end);
    const settled = 1 - (1 - clamp(done / Math.min(1, 2 * Math.log(1 / from) / Math.log(end)))) ** 2;
    const size = from * (1 / from) ** settled;
    const moved = ease(settled);
    const restY = view / 2 + ART.y * fit;
    const shiftX = (x - width / 2) * (1 - moved);
    const shiftY = y * (1 - moved) + restY * moved - (view / 2 + ART.y * fit * size);
    stage.style.transform = `translate(calc(-50% + ${shiftX.toFixed(2)}px), calc(-50% + ${shiftY.toFixed(2)}px)) scale(${(fit * size).toFixed(5)})`;
  }

  function walk(at, arrive, leave) {
    track.style.transform = `translate3d(${(-at * STEP).toFixed(2)}px, 0, 0)`;
    const near = Math.round(at);
    entries.forEach((item, i) => {
      const shown = (1 - clamp(Math.abs(at - i) / TEXT_GONE)) * (i === 0 ? arrive : 1) * (i === LAST ? 1 - leave : 1);
      if (shown === item.last) return;
      item.last = shown;
      item.entry.style.visibility = shown > 0 ? '' : 'hidden';
      const gap = WORDS[0] / Math.max(1, item.words.length - 1);
      item.words.forEach((word, w) => {
        const rise = ease(span(shown, w * gap, w * gap + WORDS[1]));
        word.style.opacity = rise.toFixed(3);
        word.style.transform = `translate3d(0, ${((1 - rise) * RISE).toFixed(2)}px, 0)`;
      });
      const rise = ease(span(shown, ...BODY));
      item.body.style.opacity = rise.toFixed(3);
      item.body.style.transform = `translate3d(0, ${((1 - rise) * RISE * .6).toFixed(2)}px, 0)`;
    });
    passage.style.opacity = ease(clamp(Math.abs(at - near) / DARK)).toFixed(3);
    dots.forEach((dot, i) => { dot.style.opacity = (.3 + .7 * ease(1 - clamp(Math.abs(at - i)))).toFixed(3); });
    if (!reduced) bays.forEach((bay, i) => bay.classList.toggle('is-here', Math.abs(at - i) < HERE && arrive >= 1));
    // Each stands in a doorway between bays, and is off the view while a bay is at rest.
    columns.forEach((column, i) => {
      const doorway = (i + .5 - at) * STEP * NEAR + FRAME.width / 2;
      column.style.transform = `translate3d(${(doorway - COLUMN / 2).toFixed(1)}px, 0, 0)`;
    });
  }

  function stageFit() { return Math.min(section.clientWidth / FRAME.width, window.innerHeight / FRAME.height); }

  const letter = startLetterThrow({
    canvas: section.querySelector('.hall__sheet'),
    letter: section.querySelector('.hall__letter'),
    shadow: section.querySelector('.hall__letter-shadow'),
    dim: section.querySelector('.hall__dim'),
    fit: stageFit,
    reduced,
  });

  function fit() {
    section.style.setProperty('--hall-scale', stageFit().toFixed(5));
  }

  // Runs on both Lenis's and the window's scroll; the second call in a frame finds nothing moved.
  let lastTop = null, lastT = null, lastAt = null, lastArrive = null, lastDots = null, lastLeave = null;
  function render() {
    if (!section.getClientRects().length) return;
    const box = section.getBoundingClientRect();
    if (box.top === lastTop) return;
    lastTop = box.top;
    const scale = stageScale();
    const length = reduced ? 0 : THROUGH * scale;
    const t = reduced ? 1 : clamp(-box.top / length);
    if (!reduced && t !== lastT) { lastT = t; through(t); }
    const way = TRAVEL * scale - length;
    const at = walked(clamp((-box.top - length) / Math.max(1, way)));
    const arrive = reduced ? 1 : ease(span(t, ...ENTRY));
    const tossed = clamp((-box.top - length - way) / (THROW * scale));
    const leave = ease(span(tossed, 0, TOSS));
    if (at !== lastAt || arrive !== lastArrive || leave !== lastLeave) {
      lastAt = at;
      lastArrive = arrive;
      lastLeave = leave;
      walk(at, arrive, leave);
    }
    if (leave !== lastDots) { lastDots = leave; dotsBox.style.opacity = (1 - leave).toFixed(3); }
    letter.want(tossed >= TOSS);
  }
  function reset() { lastTop = lastT = lastAt = lastArrive = lastDots = lastLeave = null; fit(); render(); }

  // A link lands in the hall, past the way through. Late: the browser scrolls to the anchor on load.
  function arrive() {
    const at = Math.ceil(section.getBoundingClientRect().top + window.scrollY + (reduced ? 0 : THROUGH * stageScale()));
    lenis?.resize();
    if (lenis) lenis.scrollTo(at, { immediate: true, force: true });
    else window.scrollTo({ top: at, behavior: 'instant' });
  }
  if (location.hash === `#${section.id}`) addEventListener('load', () => requestAnimationFrame(arrive), { once: true });

  // Every picture ready before the section comes, so none is decoded in the frame it first shows.
  function preload() {
    const plate = new Image();
    plate.src = 'assets/hall/plaque.webp';
    const near = new Image();
    near.src = 'assets/hall/column.webp';
    for (const image of section.querySelectorAll('img')) image.decode?.().catch(() => {});
  }
  whenNear(built, preload);

  fit();
  lenis?.on('scroll', render);
  addEventListener('scroll', render, { passive: true });
  addEventListener('resize', reset);
  render();
  return {};
}
