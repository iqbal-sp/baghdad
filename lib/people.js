import { irisLength } from './iris.js';

/**
 * Period II, part II (Figma 265:166): the people behind it. An astrolabe disc turned by the
 * page's vertical scroll. The section is TRAVEL artboard px tall plus a view (styles.css,
 * .people); while it is pinned, the share scrolled through turns the disc (--turn) so that each
 * of the five stations, STEP apart, comes up to the top in turn, from the first to the last.
 * Each one holds there for HOLD of its share of the scroll before the disc moves on, easing out
 * of one and into the next.
 *
 * The station nearest the top is under the card in the hand, and the card shows who it is. The
 * card follows the turn itself rather than switching at a moment: its portraits sit on a small
 * wheel (WHEEL) turned with the disc, so the next face comes in from the right along the arc as
 * the last goes out to the left, and each entry shows by how near its station is to the top
 * (--o, gone FADE away) and slides with it (--x, SLIDE). Every station is sized and lit by how near the top it is: --near
 * is 1 within STEP of it, 0 at two STEPs and −1 at three; --size follows Figma (134 across at
 * 30°, 114 at 60°).
 *
 * It is opened from part I by an iris (lib/iris.js): the section starts a view and the iris's
 * length higher, pinned through the iris, so the turn is taken over the scroll after it. The iris
 * also plays the entrance (.is-entered) as it opens. Clicking a
 * station, or ← / → while pinned, scrolls to its turn. With reduced motion nothing is armed and
 * the disc moves from one station to the next in steps.
 */

const TRAVEL = 3200;  // artboard px of scroll the disc turns over (styles.css, --travel)
const STEP = 30;      // degrees between stations
const HOLD = .3;      // share of each station's scroll it holds at the top
const SMALL = 114 / 134;
const GO = 1.4;       // seconds Lenis takes to bring a chosen station to the top
const FADE = .5;      // an entry on the card is gone this far (in stations) from the top
const SLIDE = 16;     // artboard px an entry slides as it goes from the top to FADE away
// The card's portraits sit on a wheel whose arc between neighbours is the portrait's width (96)
// and a little more, so the round portraits pass with a gap between them.
const WHEEL = 112 / (STEP * Math.PI / 180);

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const ease = t => t * t * (3 - 2 * t);

export function startPeople(section, { lenis } = {}) {
  if (!section) return;
  const stage = section.querySelector('.people__stage');
  const stations = [...section.querySelectorAll('.people__station')];
  const seats = stations.map(station => station.querySelector('.people__seat'));
  const angles = stations.map(station => parseFloat(station.style.getPropertyValue('--a')));
  const entries = [...section.querySelectorAll('.people__entry')];
  const faces = [...section.querySelectorAll('.people__card-portrait img')];
  const last = stations.length - 1;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  if (!reduced.matches) section.classList.add('is-armed');
  section.style.setProperty('--travel', `${TRAVEL}px`);
  stations.forEach((station, i) => station.style.setProperty('--i', String(i)));

  // Runs on both Lenis's and the window's scroll; the second call in a frame finds nothing moved.
  let lastTop = null, lastDone = null, active = -1;

  // How far the turn has gone, in stations (0 → last), for a share of the scroll.
  function turned(share) {
    const at = share * last;
    if (reduced.matches) return Math.round(at);
    const i = Math.min(Math.floor(at), last - 1);
    const t = at - i;
    // Half a hold at either end of each move.
    return i + ease(clamp((t - HOLD / 2) / (1 - HOLD)));
  }

  function render() {
    const box = section.getBoundingClientRect();
    if (box.top === lastTop) return;
    lastTop = box.top;
    const view = window.innerHeight;
    const iris = irisLength();
    const share = clamp((-box.top - iris) / Math.max(1, box.height - view - iris));
    const done = turned(share);
    // Station i is at the top when the disc has turned back by its own angle.
    const turn = -(angles[0] + done * STEP);
    stage.style.setProperty('--turn', `${turn.toFixed(3)}deg`);

    stations.forEach((station, i) => {
      const off = Math.abs(angles[i] + turn);
      const near = clamp((2 * STEP - off) / STEP, -1, 1);
      station.style.setProperty('--near', near.toFixed(3));
      station.style.setProperty('--size', (SMALL + (1 - SMALL) * near).toFixed(3));
    });

    if (done !== lastDone) card(done);
    const now = Math.round(done);
    if (now !== active) show(now);
  }

  // The card at `done` stations turned: each portrait and entry by its distance from the top
  // (positive: still to come, on the right; negative: gone, on the left).
  function card(done) {
    lastDone = done;
    faces.forEach((face, n) => {
      const away = n - done;
      const shown = Math.abs(away) < 1.2;
      face.style.visibility = shown ? 'visible' : 'hidden';
      if (!shown) return;
      const a = away * STEP * Math.PI / 180;
      face.style.translate = `${(WHEEL * Math.sin(a)).toFixed(2)}px ${(WHEEL * (1 - Math.cos(a))).toFixed(2)}px`;
    });
    entries.forEach((entry, n) => {
      const away = n - done;
      const o = ease(clamp(1 - Math.abs(away) / FADE));
      entry.style.setProperty('--o', o.toFixed(3));
      entry.style.setProperty('--x', `${(away * SLIDE / FADE).toFixed(2)}px`);
      entry.style.visibility = o > 0 ? 'visible' : 'hidden';
    });
  }

  function show(i) {
    active = i;
    entries.forEach((entry, n) => entry.setAttribute('aria-hidden', String(n !== i)));
    seats.forEach((seat, n) => seat.toggleAttribute('aria-current', n === i));
  }

  // Bring station i to the top: the middle of its hold.
  function goTo(i) {
    const box = section.getBoundingClientRect();
    const iris = irisLength();
    const top = window.scrollY + box.top + iris + (i / last) * (box.height - window.innerHeight - iris);
    if (lenis && !reduced.matches) lenis.scrollTo(top, { duration: GO });
    else window.scrollTo({ top, behavior: reduced.matches ? 'instant' : 'smooth' });
  }

  seats.forEach((seat, i) => seat.addEventListener('click', () => goTo(i)));
  window.addEventListener('keydown', event => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    if (event.altKey || event.ctrlKey || event.metaKey || event.target.closest?.('input, textarea, [contenteditable]')) return;
    const box = section.getBoundingClientRect();
    // Only while the disc is pinned in view, the iris open.
    if (box.top > 1 - irisLength() || box.bottom < window.innerHeight - 1) return;
    const target = clamp(active + (event.key === 'ArrowRight' ? 1 : -1), 0, last);
    if (target === active) return;
    event.preventDefault();
    goTo(target);
  });

  lenis?.on('scroll', render);
  window.addEventListener('scroll', render, { passive: true });
  window.addEventListener('resize', () => { lastTop = null; render(); });
  reduced.addEventListener('change', () => {
    section.classList.toggle('is-armed', !reduced.matches);
    lastTop = null;
    render();
  });
  render();
}
