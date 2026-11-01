/**
 * Navbar (not in Figma): shown from scene 1 down. The journey (hero → story → Foundations) ends
 * with the chapter lifting off scene 1; the navbar drops in once that chapter's bottom edge is in
 * the top SHOW_AT of the view, so it never sits over the hero, the story or the chapter.
 */

const SHOW_AT = .15;

export function startNavbar(navbar, journey) {
  if (!navbar || !journey) return;
  let frame = 0;
  function render() {
    frame = 0;
    const edge = journey.getBoundingClientRect().bottom;
    navbar.classList.toggle('is-visible', edge <= window.innerHeight * SHOW_AT);
  }
  const schedule = () => { frame ||= requestAnimationFrame(render); };
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  render();
}
