/**
 * One section covering the one before it (not in Figma). While this section's top comes up from
 * the bottom of the view to the top, the section before it is held back with a translate, so it
 * keeps rising at only `under` of the scroll and this one slides over it instead of both scrolling
 * away together. --arrived (0 → 1) goes on this section (its top-edge shadow fades with it),
 * --covered (0 → 1) on the covered one (it dims beneath). Runs on Lenis's own scroll, in the frame
 * the page moves, so the held section never lags a frame behind. With reduced motion nothing is
 * held: the sections simply scroll. `from` is the element whose previous sibling is covered,
 * when the section sits inside a wrapper.
 */
export function coverPrevious(scene, { under = .5, lenis, from = scene } = {}) {
  const before = from.previousElementSibling;
  const covered = before?.matches('.scene') ? before : before?.querySelector('.scene');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');

  function update() {
    // Measured on `from`: the section itself may be transformed later (scaled away), its wrapper not.
    const top = from.getBoundingClientRect().top;
    const share = reduced.matches ? 0 : Math.min(1, Math.max(0, 1 - top / innerHeight));
    scene.style.setProperty('--arrived', reduced.matches ? '1' : share.toFixed(4));
    if (!covered) return share;
    covered.style.translate = share ? `0 ${(share * innerHeight * (1 - under)).toFixed(1)}px` : '';
    covered.style.setProperty('--covered', share.toFixed(4));
    return share;
  }

  lenis?.on('scroll', update);
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  reduced.addEventListener('change', update);
  update();
  return update;
}
