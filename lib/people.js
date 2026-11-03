/**
 * Period II, part II (Figma 265:166): the people behind it. An astrolabe disc turned by the
 * page's vertical scroll. The section is TRAVEL artboard px tall plus a view (styles.css,
 * .people); while it is pinned, the share scrolled through turns the disc (--turn) so that each
 * of the five stations, STEP apart, comes up to the top in turn, from the first to the last.
 * Each one holds there for HOLD of its share of the scroll before the disc moves on, easing out
 * of one and into the next.
 *
 * The station nearest the top is under the card in the hand, and the card shows who it is
 * (.is-active on its entry). Every station is sized and lit by how near the top it is: --near
 * is 1 within STEP of it, 0 at two STEPs and −1 at three; --size follows Figma (134 across at
 * 30°, 114 at 60°).
 *
 * It is uncovered by part I rather than covering it: part I (above it) goes on up at the
 * scroll's speed while this, beneath, comes up from behind it at UNDER of that speed, the pin
 * moved up by the rest until it reaches the top; it is in part I's shade until then (--shown,
 * 0 → 1). The entrance plays once the section's top is ENTER up the view (.is-entered). Clicking a
 * station, or ← / → while pinned, scrolls to its turn. With reduced motion nothing is armed and
 * the disc moves from one station to the next in steps.
 */

const UNDER = .5;     // share of the scroll's speed it rises at while part I lifts off it
const TRAVEL = 3200;  // artboard px of scroll the disc turns over (styles.css, --travel)
const STEP = 30;      // degrees between stations
const HOLD = .4;      // share of each station's scroll it holds at the top
const ENTER = .75;    // share of the view the section's top has risen through
const SMALL = 114 / 134;
const GO = 1.4;       // seconds Lenis takes to bring a chosen station to the top

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const ease = t => t * t * (3 - 2 * t);

export function startPeople(section, { lenis } = {}) {
  if (!section) return;
  const pin = section.querySelector('.people__pin');
  const stage = section.querySelector('.people__stage');
  const stations = [...section.querySelectorAll('.people__station')];
  const seats = stations.map(station => station.querySelector('.people__seat'));
  const angles = stations.map(station => parseFloat(station.style.getPropertyValue('--a')));
  const entries = [...section.querySelectorAll('.people__entry')];
  const portrait = section.querySelector('.people__card-portrait');
  const last = stations.length - 1;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  if (!reduced.matches) section.classList.add('is-armed');
  section.style.setProperty('--travel', `${TRAVEL}px`);
  stations.forEach((station, i) => station.style.setProperty('--i', String(i)));

  // Runs on both Lenis's and the window's scroll; the second call in a frame finds nothing moved.
  let lastTop = null, active = -1;

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
    if (box.top < view * ENTER) section.classList.add('is-entered');

    // Coming up from behind part I: until the pin is stuck, it is moved up so it rises slower.
    const under = reduced.matches ? 0 : Math.min(view, Math.max(0, box.top));
    pin.style.translate = under ? `0 ${(-under * (1 - UNDER)).toFixed(1)}px` : '';
    section.style.setProperty('--shown', reduced.matches ? '1' : clamp(1 - box.top / view).toFixed(4));

    const share = clamp(-box.top / Math.max(1, box.height - view));
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

    const now = Math.round(done);
    if (now !== active) show(now);
  }

  function show(i) {
    const first = active === -1;
    active = i;
    entries.forEach((entry, n) => {
      entry.classList.toggle('is-active', n === i);
      entry.setAttribute('aria-hidden', String(n !== i));
    });
    seats.forEach((seat, n) => seat.toggleAttribute('aria-current', n === i));
    // The portrait on the card takes the new one in.
    if (!first && !reduced.matches) {
      portrait.animate([{ scale: .9, opacity: .5 }, { scale: 1, opacity: 1 }], { duration: 700, easing: 'cubic-bezier(.16, 1, .3, 1)' });
    }
  }

  // Bring station i to the top: the middle of its hold.
  function goTo(i) {
    const box = section.getBoundingClientRect();
    const top = window.scrollY + box.top + (i / last) * (box.height - window.innerHeight);
    if (lenis && !reduced.matches) lenis.scrollTo(top, { duration: GO });
    else window.scrollTo({ top, behavior: reduced.matches ? 'instant' : 'smooth' });
  }

  seats.forEach((seat, i) => seat.addEventListener('click', () => goTo(i)));
  window.addEventListener('keydown', event => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    if (event.altKey || event.ctrlKey || event.metaKey || event.target.closest?.('input, textarea, [contenteditable]')) return;
    const box = section.getBoundingClientRect();
    // Only while the disc is pinned in view.
    if (box.top > 1 || box.bottom < window.innerHeight - 1) return;
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
