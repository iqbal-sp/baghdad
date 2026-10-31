/**
 * Hero pointer interactions (fine pointers only, off with reduced motion):
 * - the gilded arch tilts toward the cursor and the painting shifts inside its
 *   window (parallax),
 * - a warm lantern light follows the cursor over the painting,
 * - a soft sheen slides over the gold where the cursor is.
 * Values are eased in one rAF loop that stops once everything has settled.
 */

const ART = { width: 1440, height: 1024 };
const WINDOW = { x: 15, y: 85 };   // .hero__window origin in artboard px
const FRAME = { x: 1, y: 0 };      // .hero__frame origin in artboard px
const PIVOT = { x: 720, y: 560 };  // centre of the arch, for the tilt direction

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

export function startHeroInteraction(hero) {
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  if (!fine.matches || reduced.matches) return;

  const stage = hero.querySelector('.hero__stage');
  const arch = hero.querySelector('.hero__arch');

  // Tilt (normalised −1…1) eases slowly; the light point follows more closely.
  const target = { nx: 0, ny: 0, x: PIVOT.x, y: PIVOT.y };
  const now = { ...target };
  let frame = 0;

  function apply() {
    arch.style.setProperty('--ry', `${(now.nx * 3).toFixed(3)}deg`);
    arch.style.setProperty('--rx', `${(-now.ny * 2).toFixed(3)}deg`);
    arch.style.setProperty('--px', `${(-now.nx * 14).toFixed(2)}px`);
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
