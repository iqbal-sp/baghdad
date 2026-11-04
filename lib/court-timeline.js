import { coverPrevious } from './cover.js';
import { irisLength } from './iris.js';

/**
 * Period II, part I (Figma 253:174): a timeline three screens wide, moved sideways by the page's
 * vertical scroll. The section is the track's travel tall plus a view (styles.css,
 * .court-timeline); while it is pinned, the share scrolled through becomes --shift on the track.
 *
 * It arrives over the Flourishing chapter (lib/cover.js: the map layer the chapter is on, still
 * pinned, is moved up so it rises at UNDER of the scroll, and dims, while this slides over it).
 *
 * What the scroll drives, all from the artboard x at the centre of the screen (START + shift ×
 * TRAVEL):
 * - the year nearest the centre is lit (.is-active), and the line is gold up to it (--progress;
 *   the gold draws on to the next year as the light moves, a CSS transition, its tip glowing
 *   while it does: .is-drawing); once it has reached the last, the track is .is-full, and only
 *   then does the gold run on past it to the arrow (lib/iris.js, --charge);
 * - each year opens once, as it comes within REVEAL of the centre (.is-seen; the entrances
 *   themselves are CSS transitions);
 * - the Samarra bracket draws across from 836 to 892 (--bracket), its count climbing to 56;
 * - inside each fixed frame the image runs DRIFT behind the track (--drift), up to ROOM.
 * The last IRIS px of the section (lib/iris.js) are not the track's: they open part II from 945's
 * node, so the share is taken over the rest.
 * The header rises in and the line draws once the section's top is ENTER up the view
 * (.is-entered). Clicking a year, or ← / → while the track is pinned, scrolls to it.
 * With reduced motion nothing is armed: everything shows, and only the lit year, the gold and the
 * bracket follow the scroll.
 */

const UNDER = .5;
const START = 720;    // artboard x at the screen's centre when the track starts
const LINE = 780;     // artboard x where the line starts (styles.css), clear of the heading
const TRAVEL = 2880;  // artboard px the track moves: from the first screen to the third
const REVEAL = 820;   // a year opens once it is this far (artboard px) from the centre
const DRIFT = .06;    // the image runs this share behind the track, inside its fixed frame
const ROOM = 56;      // artboard px the image reaches past its frame on either side (styles.css)
const ENTER = .75;    // share of the view the section's top has risen through
const BRACKET = { from: 1760, to: 3160, years: 56 };
const NODE = 14;      // the gold stops this short of the lit node
const GO = 1.4;       // seconds Lenis takes to bring a chosen year to the centre
const DRAWN = 1200;   // ms after which the gold has surely reached a newly lit year (styles.css, 1.1s)

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));

export function startCourtTimeline(section, { lenis } = {}) {
  if (!section) return;
  const track = section.querySelector('.court-timeline__track');
  const progress = section.querySelector('.court-timeline__progress');
  const years = [...section.querySelectorAll('.court-timeline__year')];
  const images = years.map(year => year.querySelector('.court-timeline__image'));
  const places = years.map(year => parseFloat(year.style.getPropertyValue('--x')));
  const bracket = section.querySelector('.court-timeline__bracket');
  const count = section.querySelector('.court-timeline__count');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  if (!reduced.matches) section.classList.add('is-armed');
  // The map layer is still pinned as this arrives; moved up, it rises at UNDER of the scroll.
  coverPrevious(section, { under: UNDER, lenis, covered: document.querySelector('.period-map'), pinned: true });
  // Runs on both Lenis's and the window's scroll; the second call in a frame finds nothing moved.
  let lastTop = null, shown = -1, active = -1, drawn = 0;
  const last = years.length - 1;
  const full = on => {
    clearTimeout(drawn);
    track.classList.toggle('is-full', on);
  };

  function render() {
    const box = section.getBoundingClientRect();
    if (box.top === lastTop) return;
    lastTop = box.top;
    const view = window.innerHeight;
    const entered = box.top < view * ENTER;
    if (entered) section.classList.add('is-entered');

    const shift = clamp(-box.top / Math.max(1, box.height - view - irisLength()));
    track.style.setProperty('--shift', shift.toFixed(4));
    const centre = START + shift * TRAVEL;

    let nearest = 0;
    places.forEach((x, i) => {
      if (Math.abs(x - centre) < Math.abs(places[nearest] - centre)) nearest = i;
      if (entered && x - centre < REVEAL) years[i].classList.add('is-seen');
      const drift = reduced.matches ? 0 : clamp((centre - x) * DRIFT, -ROOM, ROOM);
      images[i].style.setProperty('--drift', `${drift.toFixed(1)}px`);
    });
    if (nearest !== active) {
      // The tip glows while the gold draws on to the newly lit year.
      if (active !== -1 && !reduced.matches) track.classList.add('is-drawing');
      active = nearest;
      years.forEach((year, i) => year.classList.toggle('is-active', i === active));
      track.style.setProperty('--progress', `${places[active] - NODE - LINE}px`);
      // The gold past the last year waits until it is drawn up to it (on transitionend, or after
      // DRAWN should the width not have changed).
      full(active === last && reduced.matches);
      if (active === last && !reduced.matches) drawn = setTimeout(() => full(true), DRAWN);
    }

    const span = clamp((centre - BRACKET.from) / (BRACKET.to - BRACKET.from));
    bracket.style.setProperty('--bracket', span.toFixed(4));
    bracket.style.setProperty('--bracket-end', span >= 1 ? '1' : '0');
    bracket.style.setProperty('--bracket-label', clamp(span * 12).toFixed(3));
    const years56 = Math.round(span * BRACKET.years);
    if (years56 !== shown) { shown = years56; count.textContent = String(years56); }
  }

  progress.addEventListener('transitionend', event => {
    if (event.propertyName !== 'width') return;
    track.classList.remove('is-drawing');
    if (active === last) full(true);
  });

  // Bring year i to the centre of the screen.
  function goTo(i) {
    const box = section.getBoundingClientRect();
    const shift = (places[i] - START) / TRAVEL;
    const top = window.scrollY + box.top + shift * (box.height - window.innerHeight - irisLength());
    if (lenis && !reduced.matches) lenis.scrollTo(top, { duration: GO });
    else window.scrollTo({ top, behavior: reduced.matches ? 'instant' : 'smooth' });
  }

  years.forEach((year, i) => year.addEventListener('click', () => goTo(i)));
  window.addEventListener('keydown', event => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    if (event.altKey || event.ctrlKey || event.metaKey || event.target.closest?.('input, textarea, [contenteditable]')) return;
    const box = section.getBoundingClientRect();
    // Only while the track is pinned in view, before the iris.
    if (box.top > 1 || box.bottom - irisLength() < window.innerHeight - 1) return;
    const target = clamp(active + (event.key === 'ArrowRight' ? 1 : -1), 0, years.length - 1);
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
