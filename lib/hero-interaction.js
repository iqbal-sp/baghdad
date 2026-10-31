/**
 * Hero interactions (all off with reduced motion):
 * - pointer (fine pointers only): the gilded arch tilts toward the cursor, the painting
 *   shifts a little inside its window, a warm lantern light follows the cursor and a
 *   sheen slides over the gold,
 * - scroll: while the hero slides out (journey progress 0 → 1) the painting lags behind
 *   its frame, as if seen through a window.
 * Pointer values are eased in one rAF loop that stops once everything has settled;
 * scroll values come straight from Lenis, which is already smoothed.
 */

const ART = { width: 1440, height: 1024 };
const WINDOW = { x: 15, y: 85 };   // .hero__window origin in artboard px
const FRAME = { x: 1, y: 0 };      // .hero__frame origin in artboard px
const PIVOT = { x: 720, y: 560 };  // centre of the arch, for the tilt direction
// Share of the slide the painting lags behind its frame. The painting reaches ~300px past
// the arch on each side, so 16% (≈230px at the end, when the hero is long off screen)
// plus the 14px pointer shift never shows its edge.
const PAINTING_LAG = .16;

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

/** Returns { setProgress(progress, width, scale) } for lib/journey.js to call on every scroll frame. */
export function startHeroInteraction(hero) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return { setProgress() {} };

  const stage = hero.querySelector('.hero__stage');
  const arch = hero.querySelector('.hero__arch');

  // Tilt (normalised −1…1) eases slowly; the light point follows more closely.
  const target = { nx: 0, ny: 0, x: PIVOT.x, y: PIVOT.y };
  const now = { ...target };
  const scroll = { progress: 0, width: 0, scale: 1 };
  let frame = 0;

  function apply() {
    // The slide in artboard px (the painting lives inside the scaled artboard).
    const lag = scroll.progress * scroll.width / scroll.scale * PAINTING_LAG;
    arch.style.setProperty('--ry', `${(now.nx * 3).toFixed(3)}deg`);
    arch.style.setProperty('--rx', `${(-now.ny * 2).toFixed(3)}deg`);
    arch.style.setProperty('--px', `${(lag - now.nx * 14).toFixed(2)}px`);
    arch.style.setProperty('--py', `${(-now.ny * 10).toFixed(2)}px`);
    arch.style.setProperty('--lx', `${(now.x - WINDOW.x).toFixed(1)}px`);
    arch.style.setProperty('--ly', `${(now.y - WINDOW.y).toFixed(1)}px`);
    arch.style.setProperty('--sx', `${(now.x - FRAME.x).toFixed(1)}px`);
    arch.style.setProperty('--sy', `${(now.y - FRAME.y).toFixed(1)}px`);
  }

  function tick() {
    now.nx += (target.nx - now.nx) * .07;
    now.ny += (target.ny - now.ny) * .07;
    now.x += (target.x - now.x) * .1;
    now.y += (target.y - now.y) * .1;
    apply();
    const settled = Math.abs(target.nx - now.nx) < .001 && Math.abs(target.ny - now.ny) < .001
      && Math.abs(target.x - now.x) < .3 && Math.abs(target.y - now.y) < .3;
    frame = settled ? 0 : requestAnimationFrame(tick);
  }
  const wake = () => { if (!frame) frame = requestAnimationFrame(tick); };

  if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
    hero.addEventListener('pointermove', event => {
      // Pointer → artboard pixels (the artboard is scaled and centred by journey.js).
      const rect = stage.getBoundingClientRect();
      const scale = rect.width / ART.width;
      const x = (event.clientX - rect.left) / scale;
      const y = (event.clientY - rect.top) / scale;
      target.x = x;
      target.y = y;
      target.nx = clamp((x - PIVOT.x) / PIVOT.x, -1, 1);
      target.ny = clamp((y - PIVOT.y) / (ART.height / 2), -1, 1);
      hero.classList.add('is-pointing');
      wake();
    });

    hero.addEventListener('pointerleave', () => {
      target.nx = 0;
      target.ny = 0;
      hero.classList.remove('is-pointing');
      wake();
    });
  }

  return {
    setProgress(progress, width, scale) {
      scroll.progress = progress;
      scroll.width = width;
      scroll.scale = scale;
      // While the pointer loop runs it applies on its next frame anyway.
      if (!frame) apply();
    },
  };
}
