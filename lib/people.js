import { irisLength, stageScale } from './iris.js';
import { TAIL } from './sky.js';

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
 * length higher, pinned through the iris, so the turn is taken over the scroll after it. The
 * entrance follows the iris too (enter, called with how far the circle has grown): each piece
 * comes in over its own share of the opening (ENTRANCE), as the circle reaches it. The arch is
 * drawn after, once the circle is open, over the next DRAW px: up from its feet to the apex, then
 * the finial on to it, before the disc starts to turn. The section's last TAIL px are part III's
 * (lib/sky.js), so the turn is taken before them. Clicking a
 * station, or ← / → while pinned, scrolls to its turn. With reduced motion nothing is armed and
 * the disc moves from one station to the next in steps.
 */

const TRAVEL = 3200;  // artboard px of scroll the disc turns over (styles.css, --travel)
const DRAW = 520;     // artboard px of scroll, once the iris is open, the arch is drawn over
const FINIAL = .8;    // share of the drawing after which the finial drops on to the apex
const STEP = 30;      // degrees between stations
const HOLD = .3;      // share of each station's scroll it holds at the top
const SMALL = 114 / 134;
const GO = 1.4;       // seconds Lenis takes to bring a chosen station to the top
const FADE = .5;      // an entry on the card is gone this far (in stations) from the top
const SLIDE = 16;     // artboard px an entry slides as it goes from the top to FADE away
// The card's portraits sit on a wheel whose arc between neighbours is the portrait's width (96)
// and a little more, so the round portraits pass with a gap between them.
const WHEEL = 112 / (STEP * Math.PI / 180);

// Share of the iris's growth (its radius over its last) each piece comes in over: the card's
// portrait, just below the circle's centre, is uncovered first, then what is above it.
const ENTRANCE = {
  card: [0, .35],
  body: [.04, .36],
  t2: [.08, .42],
  t1: [.14, .5],
  kicker: [.2, .56],
  disc: [.1, .65],
};
const SEATS = [.25, .05, .3];  // the stations: first one's start, then each one later, and length
const SETTLE = 24;             // degrees the disc turns into place as it comes up

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const ease = t => t * t * (3 - 2 * t);
const out = t => 1 - (1 - t) ** 3;

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
  section.style.setProperty('--travel', `${TRAVEL + DRAW + TAIL}px`);
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
    const draw = DRAW * stageScale();
    // The arch is drawn first, then the disc turns over the rest.
    if (reduced.matches) {
      section.style.removeProperty('--in-arch');
      section.style.removeProperty('--in-finial');
    } else {
      const drawn = clamp((-box.top - iris) / draw);
      section.style.setProperty('--in-arch', ease(clamp(drawn / FINIAL)).toFixed(4));
      section.style.setProperty('--in-finial', ease(clamp((drawn - FINIAL) / (1 - FINIAL))).toFixed(4));
    }
    const lead = iris + draw;
    const share = clamp((-box.top - lead) / Math.max(1, box.height - view - lead - TAIL * stageScale()));
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
    const lead = irisLength() + DRAW * stageScale();
    const top = window.scrollY + box.top + lead + (i / last) * (box.height - window.innerHeight - lead - TAIL * stageScale());
    if (lenis && !reduced.matches) lenis.scrollTo(top, { duration: GO });
    else window.scrollTo({ top, behavior: reduced.matches ? 'instant' : 'smooth' });
  }

  seats.forEach((seat, i) => seat.addEventListener('click', () => goTo(i)));
  window.addEventListener('keydown', event => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    if (event.altKey || event.ctrlKey || event.metaKey || event.target.closest?.('input, textarea, [contenteditable]')) return;
    const box = section.getBoundingClientRect();
    // Only while the disc is pinned in view, the iris open, before part III.
    if (box.top > 1 - irisLength() || box.bottom - TAIL * stageScale() < window.innerHeight - 1) return;
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

  // The entrance at `grown` (0 → 1) of the iris; with reduced motion everything is left as it is.
  function enter(grown) {
    const props = [...Object.keys(ENTRANCE).map(name => `--in-${name}`), '--settle'];
    if (reduced.matches) {
      props.forEach(prop => section.style.removeProperty(prop));
      stations.forEach(station => station.style.removeProperty('--in-seat'));
      return;
    }
    for (const [name, [from, to]] of Object.entries(ENTRANCE)) {
      section.style.setProperty(`--in-${name}`, out(clamp((grown - from) / (to - from))).toFixed(4));
    }
    const [first, each, length] = SEATS;
    stations.forEach((station, i) => {
      station.style.setProperty('--in-seat', out(clamp((grown - first - i * each) / length)).toFixed(4));
    });
    const [from, to] = ENTRANCE.disc;
    section.style.setProperty('--settle', `${((1 - out(clamp((grown - from) / (to - from)))) * SETTLE).toFixed(2)}deg`);
  }

  return { enter };
}
