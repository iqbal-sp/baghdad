/**
 * Navbar (not in Figma): shown from scene 1 down. The journey (hero → story → Foundations) ends
 * with the chapter lifting off scene 1; the navbar drops in once that chapter's bottom edge is in
 * the top SHOW_AT of the view, so it never sits over the hero, the story or the chapter.
 *
 * It steps aside again for the way into Period II: from the moment the three ages' map comes up
 * behind Period I's closing (lib/period-map.js marks it .has-arrived), through the dive into The
 * Flourishing, until Period II's timeline reaches the top SHOW_AT of the view. It steps aside the
 * same way at Period II's end: from the moment its map comes up behind part III (lib/sky.js marks
 * it .has-arrived) to the end of the page.
 */

const SHOW_AT = .15;

export function startNavbar(navbar, journey, { returnPin, resume, end } = {}) {
  if (!navbar || !journey) return;
  let frame = 0;
  // lib/period-map.js and lib/sky.js build the maps at start-up, so they are looked up when first needed.
  let map = null, endMap = null;
  function render() {
    frame = 0;
    const view = window.innerHeight;
    const edge = journey.getBoundingClientRect().bottom;
    map ||= returnPin?.querySelector('.story--map');
    endMap ||= end?.querySelector('.story--end');
    // Only a map that is shown counts: on portrait screens those sections are not laid out yet
    // (display: none), and their scripts, measuring nothing, mark the maps arrived.
    const arrived = (element, holder) => Boolean(element?.classList.contains('has-arrived')) && holder?.getClientRects().length > 0;
    const aside = (arrived(map, returnPin) && resume && resume.getBoundingClientRect().top > view * SHOW_AT)
      || arrived(endMap, end);
    navbar.classList.toggle('is-visible', edge <= view * SHOW_AT && !aside);
  }
  const schedule = () => { frame ||= requestAnimationFrame(render); };
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  render();
}
