/**
 * From Period II part I into part II (not in Figma): an iris that opens from the arrow at the end
 * of part I's line.
 *
 * Part I (lib/court-timeline.js) is IRIS artboard px taller than its track's travel, and part II
 * (lib/people.js) starts that much plus a view higher, under it in the flow but above it in the
 * stack: both are pinned through those IRIS px, part I still showing its last screen and part II
 * clipped to a circle (styles.css, .people__pin). Over them, as a share of the scroll (p):
 *
 * - gather (p 0 → GATHER): the track runs on FOCUS past its end, following the line to its arrow
 *   until the arrow is at the centre of the screen, while the gold runs on past 945 to the arrow
 *   and the arrow turns gold and glows (--charge);
 * - open (the rest, --recede 0 → 1): the circle grows from the arrow until it covers the view,
 *   slowly at first, so part II is seen through a porthole before it fills the screen. Its gold
 *   edge (.court-timeline__iris) sits just outside the circle, on part I, and fades as it nears
 *   the corners; part I recedes (dims, and shrinks a little about the screen's centre) and "Next"
 *   gives way, and part II settles from ZOOM. Part II's entrance plays as the circle opens
 *   (ENTER), where it can be seen, and once open the clip is dropped (.is-open).
 *
 * Measured on the arrow itself (.court-timeline__end), after the frame's track transform is set,
 * so the circle stays on it whatever the scale. With reduced motion there is no gather or growth: part II simply shows
 * from halfway through.
 */

export const IRIS = 1200;  // artboard px of scroll the iris takes, gather included
const FOCUS = 624;         // artboard px the track runs on: the arrow (x 4224) to the centre (3600)
const GATHER = .3;         // share of the iris spent bringing the arrow to the centre
const ENTER = .04;         // share of the opening at which part II's entrance plays
const ZOOM = .12;          // part II starts this much larger and settles as it opens

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const ease = t => t * t * (3 - 2 * t);

export function stageScale() {
  return parseFloat(document.documentElement.style.getPropertyValue('--stage-scale')) || 1;
}

// The iris's length in page px.
export function irisLength() {
  return IRIS * stageScale();
}

export function startIris(court, people, { lenis } = {}) {
  if (!court || !people) return;
  const track = court.querySelector('.court-timeline__track');
  const courtPin = court.querySelector('.court-timeline__pin');
  const end = court.querySelector('.court-timeline__end');
  const pin = people.querySelector('.people__pin');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  court.style.setProperty('--iris', `${IRIS}px`);
  people.style.setProperty('--iris', `${IRIS}px`);

  // Runs on both Lenis's and the window's scroll; the second call in a frame finds nothing moved.
  let lastTop = null;

  function render() {
    const box = court.getBoundingClientRect();
    if (box.top === lastTop) return;
    lastTop = box.top;
    const view = window.innerHeight;
    const width = document.documentElement.clientWidth;
    const length = irisLength();
    // Past the end of the track, as a share of the iris.
    const p = clamp((-box.top - (box.height - view - length)) / length);
    const still = reduced.matches;
    const gather = still ? 0 : ease(clamp(p / GATHER));
    const open = still ? (p >= .5 ? 1 : 0) : clamp((p - GATHER) / (1 - GATHER));

    track.style.setProperty('--focus', `${(gather * FOCUS).toFixed(1)}px`);
    track.style.setProperty('--charge', gather.toFixed(4));
    courtPin.style.setProperty('--recede', open.toFixed(4));

    // Both pins are at the top of the view while this runs, so the arrow's place in the view is
    // its place in either.
    const at = end.getBoundingClientRect();
    const x = at.left;
    const y = at.top;
    const far = Math.hypot(Math.max(x, width - x), Math.max(y, view - y)) + 2;
    const from = 6 * stageScale();
    const r = open > 0 ? from + (far - from) * open ** 1.8 : 0;

    for (const target of [courtPin, pin]) {
      target.style.setProperty('--iris-x', `${x.toFixed(1)}px`);
      target.style.setProperty('--iris-y', `${y.toFixed(1)}px`);
      target.style.setProperty('--iris-r', `${r.toFixed(1)}px`);
    }
    courtPin.style.setProperty('--iris-edge', open > 0 && open < 1 ? (1 - ease(clamp((open - .5) / .5))).toFixed(3) : '0');
    pin.style.setProperty('--iris-zoom', (1 + ZOOM * (1 - ease(open))).toFixed(4));

    if (open >= ENTER) people.classList.add('is-entered');
    people.classList.toggle('is-open', open >= 1);
  }

  lenis?.on('scroll', render);
  window.addEventListener('scroll', render, { passive: true });
  window.addEventListener('resize', () => { lastTop = null; render(); });
  reduced.addEventListener('change', () => { lastTop = null; render(); });
  render();
}
