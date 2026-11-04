/**
 * Period hover/focus state for the story section.
 *
 * Only one period is active at a time. Switching lets the outgoing detail fade
 * out before the incoming one enters (--enter-delay), and leaving an image keeps
 * its detail briefly so moving between images does not flicker. Off on portrait screens,
 * where every detail is always shown.
 */

const LINGER_MS = 350;
const SWITCH_DELAY = '.16s';

export function startPeriods(story) {
  const periods = [...story.querySelectorAll('.period')];
  // Portrait screens list every period with its detail always shown (styles.css), so there
  // is nothing to reveal; on touch, pointerenter/leave would only flash the dimming on a tap.
  const compact = matchMedia('(max-aspect-ratio: 4/5)');
  let active = null;
  let releaseTimer = 0;

  function activate(period) {
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
}
