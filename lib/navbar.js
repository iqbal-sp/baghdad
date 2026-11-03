/**
 * Navbar (not in Figma): shown from scene 1 down. The journey (hero → story → Foundations) ends
 * with the chapter lifting off scene 1; the navbar drops in once that chapter's bottom edge is in
 * the top SHOW_AT of the view, so it never sits over the hero, the story or the chapter.
 *
 * It steps aside again for the way into Period II: from the moment the three ages' map comes up
 * behind Period I's closing (lib/period-map.js marks it .has-arrived), through the dive into The
 * Flourishing, until Period II's timeline reaches the top SHOW_AT of the view.
 */

const SHOW_AT = .15;

export function startNavbar(navbar, journey, { returnPin, resume } = {}) {
  if (!navbar || !journey) return;
  let frame = 0;
  // lib/period-map.js builds the map at start-up, so it is looked up when first needed.
  let map = null;
  function render() {
    frame = 0;
    const view = window.innerHeight;
    const edge = journey.getBoundingClientRect().bottom;
    map ||= returnPin?.querySelector('.story--map');
    const aside = Boolean(map?.classList.contains('has-arrived'))
      && resume && resume.getBoundingClientRect().top > view * SHOW_AT;
    navbar.classList.toggle('is-visible', edge <= view * SHOW_AT && !aside);
  }
  const schedule = () => { frame ||= requestAnimationFrame(render); };
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  render();
}
