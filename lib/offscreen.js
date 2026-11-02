/**
 * Work nobody sees (not in Figma; nothing on screen changes):
 * - decodeAhead: once a section comes within AHEAD views of the screen, its images are fetched
 *   and decoded off the main thread, so they are ready before they first paint instead of
 *   stalling that frame. The menu's paintings are readied as the pointer nears "Menu".
 * - pauseOffscreen: looping CSS animations hold while their element is out of view
 *   (.is-offscreen) and carry on from where they were when it comes back.
 */
const AHEAD = 1.5;

function ready(images) {
  for (const image of images) {
    image.loading = 'eager';
    image.decode?.().catch(() => {});
  }
}

export function decodeAhead(sections, { menu, menuButton } = {}) {
  const watcher = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      watcher.unobserve(entry.target);
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
