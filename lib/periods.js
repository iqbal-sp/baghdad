/**
 * Periods in the story section.
 *
 * Desktop: hover or focus an image to reveal its period. Only one period is active at a time.
 * Switching lets the outgoing detail fade out before the incoming one enters (--enter-delay),
 * and leaving an image keeps its detail briefly so moving between images does not flicker.
 *
 * Portrait screens (COMPACT): the periods are a slider that nobody hovers or swipes. The page
 * scroll picks the active period (script.js, lib/next-period.js) through createSlider(): the
 * track moves the active card to the front (--slide) and its detail enters under it.
 */

export const COMPACT = '(max-aspect-ratio: 4/5)';
const LINGER_MS = 350;
const SWITCH_DELAY = '.16s';

/**
 * Scroll-driven slider over a host that contains a `.periods` list.
 * select(index) activates that period (null: none) and slides it to the front.
 * `delay` is how long an incoming detail waits while another one is leaving.
 */
export function createSlider(host, { delay = SWITCH_DELAY } = {}) {
  const list = host.querySelector('.periods');
  const periods = [...list.querySelectorAll('.period')];
  let current = null;

  return {
    select(index) {
      if (index === current) return;
      host.style.setProperty('--enter-delay', current !== null && index !== null ? delay : '0s');
      periods.forEach((period, i) => {
        period.classList.toggle('is-active', i === index);
        // Cards the track has moved past fade out, so none lingers at the left edge.
        period.classList.toggle('is-past', index !== null && i < index);
      });
      if (index === null) {
        delete host.dataset.active;
      } else {
        host.dataset.active = '';
        list.style.setProperty('--slide', index);
      }
      current = index;
    },
  };
}

/** Desktop hover/focus; returns the story's slider for portrait screens. */
export function startPeriods(story) {
  const periods = [...story.querySelectorAll('.period')];
  const compact = matchMedia(COMPACT);
  let active = null;
  let releaseTimer = 0;

  function activate(period) {
    // On portrait screens the scroll decides (there is no hover; a tap would only flash it).
    if (compact.matches) return;
    clearTimeout(releaseTimer);
    if (period === active) return;
    story.style.setProperty('--enter-delay', active ? SWITCH_DELAY : '0s');
    active?.classList.remove('is-active');
    active = period;
    period.classList.add('is-active');
    story.dataset.active = '';
  }

  function release() {
    if (compact.matches) return;
    clearTimeout(releaseTimer);
    releaseTimer = setTimeout(() => {
      active?.classList.remove('is-active');
      active = null;
      delete story.dataset.active;
    }, LINGER_MS);
  }

  for (const period of periods) {
    const thumb = period.querySelector('.period__thumb');
    thumb.addEventListener('pointerenter', () => activate(period));
    thumb.addEventListener('pointerleave', release);
    thumb.addEventListener('focus', () => activate(period));
    thumb.addEventListener('blur', release);
  }

  const slider = createSlider(story);
  return {
    /** Portrait screens: the story's active period from the scroll (null: none). Off on desktop. */
    select(index) {
      if (compact.matches) slider.select(index);
    },
  };
}
