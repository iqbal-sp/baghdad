/**
 * Knowledge (Figma 206:66 → 206:109).
 * - Depth: the far/mid/near arcs move at 40/110/200 artboard px per viewport of scroll, from the
 *   moment the section starts to come up into view: below their Figma places while it arrives,
 *   on them when its top reaches the top of the view, above them after. Stars stay at the moving
 *   circles' intersections, and the painting drifts inside its arch the other way.
 * - Light: the exported lit lines and glow follow a fine pointer in stage coordinates, and each
 *   star brightens as the light nears it (--near).
 * - Arrival: the section slides up over scene 4, which drifts on beneath it at a fraction of the
 *   scroll (UNDER, --covered); the list's panel opens as it comes into view, then each row rises
 *   in.
 * Motion stops offscreen, at rest, and with reduced motion enabled.
 */
import { coverPrevious } from './cover.js';

// While this section covers it, scene 4 keeps rising at this share of the scroll (0 would hold
// it still, 1 would let it scroll away as usual).
const UNDER = .5;
const LANTERN_STRENGTH = .85;
const POINTER_EASING = .12;
// Distance (stage px) at which a star starts to brighten under the cursor's light.
const STAR_REACH = 260;
// Painting drift inside its arch, px per viewport, kept within the 4% its 1.08 scale leaves.
const INNER = 30;
const INNER_LIMIT = 654 * .04 - 1;
const CIRCLES = {
  left: { x: -34.5, y: 1635.5, r: 753.5, speed: 110 },
  right: { x: 1322.5, y: 1648.5, r: 753.5, speed: 110 },
  near: { x: 617.5, y: 1424.5, r: 753.5, speed: 200 },
  far: { x: 720, y: 88, r: 753, speed: 40 },
};

// Where two circles cross, each lifted by its speed × shift.
function crossing(a, b, shift, side) {
  const ay = a.y - a.speed * shift;
  const by = b.y - b.speed * shift;
  const dx = b.x - a.x, dy = by - ay;
  const distance = Math.hypot(dx, dy);
  const along = (a.r ** 2 - b.r ** 2 + distance ** 2) / (2 * distance);
  const across = Math.sqrt(Math.max(0, a.r ** 2 - along ** 2));
  return {
    x: a.x + along * dx / distance + side * across * dy / distance,
    y: ay + along * dy / distance - side * across * dx / distance,
  };
}

export function startKnowledge(scene, { lenis } = {}) {
  if (!scene) return;
  // Native hash navigation can run before the shared stage has its final scale.
  if (location.hash === `#${scene.id}`) {
    const jump = () => document.fonts.ready.then(() => requestAnimationFrame(() => {
      window.scrollTo({ top: scene.getBoundingClientRect().top + window.scrollY, behavior: 'instant' });
    }));
    if (document.readyState === 'complete') jump();
    else window.addEventListener('load', jump, { once: true });
  }
  const stage = scene.querySelector('.knowledge__stage');
  const list = scene.querySelector('.knowledge__points');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  // The panel opens as soon as it shows; each row then rises in as a group as soon as it enters,
  // rather than waiting separately for each child's text box near the bottom of the viewport.
  // Checked against their boxes on scroll, not with an IntersectionObserver: the panel is
  // clipped shut until it opens, and an observer counts that clip, so nothing would ever show.
  const points = [...scene.querySelectorAll('.knowledge__point')];
  const waiting = new Set([list, ...points]);
  function reveal() {
    for (const target of waiting) {
      if (target.getBoundingClientRect().top < innerHeight * .88) {
        target.classList.add('is-in');
        waiting.delete(target);
      }
    }
  }

  // Scene 4 is held back while this section slides up over it: it rises at UNDER of the scroll,
  // so it is covered rather than scrolled away (lib/cover.js).
  const cover = coverPrevious(scene, { under: UNDER, lenis });

  const entranceObserver = new IntersectionObserver(entries => {
    if (entries.some(entry => entry.isIntersecting)) {
      scene.classList.add('is-entered');
      entranceObserver.disconnect();
    }
  }, { threshold: .08 });
  entranceObserver.observe(scene);
  const stars = ['far', 'right', 'left'].map((name, index) => {
    const side = index === 2 ? -1 : 1;
    return {
      element: scene.querySelector(`.knowledge__star--${index + 1}`),
      circle: CIRCLES[name], side,
      origin: crossing(CIRCLES.near, CIRCLES[name], 0, side),
      point: null,
    };
  });
  let frame = 0, previous = 0, depth = null, light = 0;
  let pointer = null, cursor = null;

  function render(time) {
    frame = 0;
    cover();
    reveal();
    const box = scene.getBoundingClientRect();
    if (reduced.matches || box.bottom <= 0 || box.top >= innerHeight) {
      previous = 0;
      depth = null;
      light = 0;
      pointer = null;
      cursor = null;
      stage.style.setProperty('--lantern-opacity', '0');
      return;
    }
    const elapsed = previous ? Math.min(time - previous, 100) : 1000 / 60;
    const ease = 1 - .84 ** (elapsed / (1000 / 60));
    previous = time;
    // Viewports scrolled past the section's top reaching the top of the view: −1 as it comes into
    // view, 0 at its Figma places, rising after.
    const target = -box.top / innerHeight;
    depth = depth === null ? target : depth + (target - depth) * ease;
    if (Math.abs(target - depth) < .0002) depth = target;
    stage.style.setProperty('--arc-far-y', `${(-CIRCLES.far.speed * depth).toFixed(2)}px`);
    stage.style.setProperty('--arc-mid-y', `${(-CIRCLES.left.speed * depth).toFixed(2)}px`);
    stage.style.setProperty('--arc-near-y', `${(-CIRCLES.near.speed * depth).toFixed(2)}px`);
    stage.style.setProperty('--inner-scholars', `${Math.max(-INNER_LIMIT, Math.min(INNER_LIMIT, INNER * depth)).toFixed(2)}px`);
    for (const star of stars) {
      star.point = crossing(CIRCLES.near, star.circle, depth, star.side);
      star.element.style.translate = `${star.point.x - star.origin.x}px ${star.point.y - star.origin.y}px`;
    }
    const lightTarget = pointer && finePointer.matches ? LANTERN_STRENGTH : 0;
    light += (lightTarget - light) * ease;
    if (Math.abs(lightTarget - light) < .001) light = lightTarget;
    let cursorMoving = false;
    if (pointer) {
      const bounds = stage.getBoundingClientRect();
      const scale = bounds.width / 1440;
      const target = { x: (pointer.x - bounds.left) / scale, y: (pointer.y - bounds.top) / scale };
      const follow = 1 - (1 - POINTER_EASING) ** (elapsed / (1000 / 60));
      // Start at the entry point while still transparent, then follow the pointer
      // with a frame-rate-independent ease instead of snapping on every event.
      cursor ??= { ...target };
      cursor.x += (target.x - cursor.x) * follow;
      cursor.y += (target.y - cursor.y) * follow;
      cursorMoving = Math.hypot(target.x - cursor.x, target.y - cursor.y) > .1;
      if (!cursorMoving) cursor = target;
      stage.style.setProperty('--lantern-x', `${cursor.x.toFixed(2)}px`);
      stage.style.setProperty('--lantern-y', `${cursor.y.toFixed(2)}px`);
    }
    stage.style.setProperty('--lantern-opacity', light.toFixed(3));
    for (const { element, point } of stars) {
      const near = cursor ? Math.max(0, 1 - Math.hypot(point.x - cursor.x, point.y - cursor.y) / STAR_REACH) : 0;
      element.style.setProperty('--near', (near * near * light / LANTERN_STRENGTH).toFixed(3));
    }
    if (depth !== target || light !== lightTarget || cursorMoving) schedule();
    else {
      previous = 0;
      if (!light) cursor = null;
    }
  }

  function schedule() {
    if (!reduced.matches) frame ||= requestAnimationFrame(render);
  }
  scene.addEventListener('pointermove', event => {
    if (!finePointer.matches || reduced.matches || event.pointerType === 'touch') return;
    pointer = { x: event.clientX, y: event.clientY };
    schedule();
  });
  scene.addEventListener('pointerleave', () => { pointer = null; schedule(); });
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  reduced.addEventListener('change', () => {
    cancelAnimationFrame(frame);
    frame = previous = 0;
    depth = pointer = cursor = null;
    light = 0;
    for (const name of ['--arc-far-y', '--arc-mid-y', '--arc-near-y', '--inner-scholars', '--lantern-opacity']) stage.style.removeProperty(name);
    for (const { element } of stars) {
      element.style.removeProperty('translate');
      element.style.removeProperty('--near');
    }
    if (reduced.matches) {
      scene.classList.add('is-entered');
      for (const target of waiting) target.classList.add('is-in');
      waiting.clear();
    }
    cover();
    schedule();
  });
  schedule();
}
