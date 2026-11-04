/**
 * Work nobody sees (not in Figma; nothing on screen changes):
 * - decodeAhead: once a section comes within AHEAD views of the screen, its images are fetched
 *   and decoded off the main thread, so they are ready before they first paint instead of
 *   stalling that frame. The menu's paintings are readied as the pointer nears "Menu".
 * - pauseOffscreen: looping CSS animations hold while their element is out of view
 *   (.is-offscreen) and carry on from where they were when it comes back.
 * - afterLoad / whenNear: work that can wait (the smokes' WebGL set-up, readying later
 *   sections) is held until the page has loaded and the browser is idle, or until its section
 *   comes within AHEAD views, so the first screen is fetched and painted without it.
 */
const AHEAD = 1.5;

function ready(images) {
  for (const image of images) {
    image.loading = 'eager';
    image.decode?.().catch(() => {});
  }
}

/** Runs fn once the page has loaded and the browser is idle (at most IDLE ms later). */
const IDLE = 1500;
export function afterLoad(fn) {
  const go = () => ('requestIdleCallback' in window ? requestIdleCallback(() => fn(), { timeout: IDLE }) : setTimeout(fn, 200));
  if (document.readyState === 'complete') go();
  else addEventListener('load', go, { once: true });
}

/** Runs fn once, when element comes within AHEAD views of the screen. */
export function whenNear(element, fn) {
  if (!element) return;
  const watcher = new IntersectionObserver(entries => {
    if (!entries.some(entry => entry.isIntersecting)) return;
    watcher.disconnect();
    fn();
  }, { rootMargin: `${AHEAD * 100}% ${AHEAD * 100}%` });
  watcher.observe(element);
}

export function decodeAhead(sections, { menu, menuButton } = {}) {
  const watcher = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      watcher.unobserve(entry.target);
      // .is-near also lets a section's CSS background images load (styles.css, .scene--capital).
      entry.target.classList.add('is-near');
      ready(entry.target.querySelectorAll('img'));
    }
  }, { rootMargin: `${AHEAD * 100}% ${AHEAD * 100}%` });
  for (const section of sections) watcher.observe(section);

  if (menu && menuButton) {
    const readyMenu = () => ready(menu.querySelectorAll('img'));
    menuButton.addEventListener('pointerenter', readyMenu, { once: true });
    menuButton.addEventListener('focus', readyMenu, { once: true });
  }
}

export function pauseOffscreen(elements) {
  const watcher = new IntersectionObserver(entries => {
    for (const entry of entries) entry.target.classList.toggle('is-offscreen', !entry.isIntersecting);
  });
  for (const element of elements) watcher.observe(element);
}
