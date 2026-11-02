/**
 * Period I closing (Figma 215:340). Not in Figma, all of it motion:
 * - it covers the knowledge section as it comes up (lib/cover.js, UNDER);
 * - while it arrives, the sheet is handed up into place: it starts RISE artboard px low and
 *   turned TURN degrees, and comes level as the section's top reaches the top of the view
 *   (eased out, so it settles rather than stops); the painting settles from a PUSH zoom. "833"
 *   stays still on it, an accent of the design;
 * - once it has landed, the painting drifts down in its arch (INNER) as the page scrolls on, and
 *   the wax seal catches the light once (.is-sealed);
 * - with a fine pointer, the sheet leans a few degrees toward the cursor, as if held up to it.
 * The reveals of its text and painting are lib/scenes.js's. With reduced motion only the
 * plain layout remains.
 */
import { coverPrevious } from './cover.js';

const UNDER = .5;
const RISE = 260;
const TURN = -4;
const PUSH = .1;
// Painting drift in its arch after landing, px per viewport; the painting runs 79 px past the
// arch above and below, so it stays well within that.
const INNER = 40;
const INNER_LIMIT = 60;
// Lean toward the cursor, degrees at the sheet's edge.
const LEAN_X = 2.5;
const LEAN_Y = 3.5;
// Share of the remaining lean covered per 60 fps frame.
const SMOOTHING = .1;

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));

export function startClosing(scene, { lenis } = {}) {
  if (!scene) return;
  coverPrevious(scene, { under: UNDER, lenis, from: scene.closest('.closing-pin') ?? scene });
  if (location.hash === `#${scene.id}`) {
    window.addEventListener('load', () => requestAnimationFrame(() => {
      window.scrollTo({ top: scene.getBoundingClientRect().top + window.scrollY, behavior: 'instant' });
    }), { once: true });
  }
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  if (reduced.matches) return;

  const stage = scene.querySelector('.closing__stage');
  const sheet = scene.querySelector('.closing__sheet');
  // Measured on the pin, which is never transformed (lib/period-map.js scales the closing away).
  const anchor = scene.closest('.closing-pin') ?? scene;
  let frame = 0, previous = 0, pointer = null, sealed = false;
  const lean = { x: 0, y: 0 };

  function render(time) {
    frame = 0;
    const view = window.innerHeight;
    const box = anchor.getBoundingClientRect();
    if (box.bottom <= 0 || box.top >= view) {
      previous = 0;
      return;
    }
    // 0 as the section's top enters at the bottom of the view, 1 when it reaches the top.
    const arrive = clamp(1 - box.top / view);
    const rest = (1 - arrive) ** 2.2;
    stage.style.setProperty('--sheet-y', `${(rest * RISE).toFixed(1)}px`);
    stage.style.setProperty('--sheet-turn', `${(rest * TURN).toFixed(3)}deg`);
    stage.style.setProperty('--push', (1 + rest * PUSH).toFixed(4));
    stage.style.setProperty('--inner', `${Math.min(INNER_LIMIT, Math.max(0, -box.top / view) * INNER).toFixed(1)}px`);
    if (!sealed && arrive > .97) {
      sealed = true;
      scene.classList.add('is-sealed');
    }

    const elapsed = previous ? Math.min(time - previous, 100) : 1000 / 60;
    previous = time;
    const ease = 1 - (1 - SMOOTHING) ** (elapsed / (1000 / 60));
    const target = { x: 0, y: 0 };
    if (pointer && finePointer.matches) {
      const bounds = sheet.getBoundingClientRect();
      target.y = clamp((pointer.x - (bounds.left + bounds.width / 2)) / (bounds.width / 2), -1, 1) * LEAN_Y;
      target.x = -clamp((pointer.y - view / 2) / (view / 2), -1, 1) * LEAN_X;
    }
    lean.x += (target.x - lean.x) * ease;
    lean.y += (target.y - lean.y) * ease;
    const leaning = Math.abs(target.x - lean.x) > .005 || Math.abs(target.y - lean.y) > .005;
    if (!leaning) { lean.x = target.x; lean.y = target.y; }
    stage.style.setProperty('--tilt-x', `${lean.x.toFixed(3)}deg`);
    stage.style.setProperty('--tilt-y', `${lean.y.toFixed(3)}deg`);
    if (leaning) schedule();
    else previous = 0;
  }

  function schedule() { frame ||= requestAnimationFrame(render); }
  scene.addEventListener('pointermove', event => {
    if (!finePointer.matches || event.pointerType === 'touch') return;
    pointer = { x: event.clientX, y: event.clientY };
    schedule();
  });
  scene.addEventListener('pointerleave', () => { pointer = null; schedule(); });
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  schedule();
}
