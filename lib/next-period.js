import { COMPACT, createSlider } from './periods.js';

/**
 * Portrait screens: after period I's last scene, the story's slider comes back and moves on to
 * the next age by itself. The section pins for a while; on arrival period I is still the active
 * card (where the reader has been), and a little further down the track slides period II to the
 * front and its detail enters under it. Scrolling back reverses it. The periods are cloned from
 * the story, so their content lives in one place. On desktop the section is not displayed.
 */

// Pin progress (0–1) past which period II takes over; a small band keeps it from flickering.
const NEXT_AT = .32;
const BACK_AT = .26;

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));

export function startNextPeriod(section, story) {
  const compact = matchMedia(COMPACT);
  const list = story.querySelector('.periods').cloneNode(true);
  // The clone is read, not used: its images are decorative here and its ids must stay unique.
  list.querySelectorAll('[id]').forEach(element => { element.id = `next-${element.id}`; });
  list.querySelectorAll('.period__thumb').forEach(thumb => {
    thumb.removeAttribute('aria-describedby');
    thumb.setAttribute('tabindex', '-1');
    thumb.setAttribute('aria-hidden', 'true');
  });
  list.querySelectorAll('[data-parallax]').forEach(element => {
    element.removeAttribute('data-parallax');
    element.style.removeProperty('translate');
  });
  section.querySelector('.story__title').after(list);

  // The incoming detail waits for most of the slide before it enters.
  const slider = createSlider(section, { delay: '.55s' });
  let next = false;
  let frame = 0;

  function update() {
    frame = 0;
    if (!compact.matches) return;
    const rect = section.getBoundingClientRect();
    const pinned = clamp(-rect.top / Math.max(1, rect.height - innerHeight));
    if (!next && pinned >= NEXT_AT) next = true;
    else if (next && pinned < BACK_AT) next = false;
    slider.select(next ? 1 : 0);
  }

  const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  compact.addEventListener('change', schedule);
  update();
}
