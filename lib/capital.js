/**
 * Scene 4 — "A capital that drew the world in" (Figma 172:376, routes 182:75).
 * - Routes: they start, and the dashed branches end, just past the artboard's left or right edge
 *   (x −10 or 1450). On a view wider than the artboard's ratio the stage leaves room beside it
 *   (--spare in styles.css), so each of those ends gets a straight lead out past the edge of the
 *   view. The lines are drawn in with pathLength="1" (styles.css), so a longer lead does not change
 *   how they draw.
 * - Cover from the corner (not in Figma): while the scene sticks over the still Round City plan
 *   (styles.css, .capital-cover), it comes in from the top-right corner of the view as the page
 *   scrolls, wipe 0 → 1 over the wrapper's extra height: one sweep, the scene itself showing right
 *   up to its edge. Where CSS paint worklets run (.is-ink), the scene is masked by an uneven, soft
 *   front like spreading ink (lib/ink-paint.js, --ink-*), which keeps drifting while it is on
 *   screen; a soft shadow ahead of it and a faint warm light along it are painted over the plan.
 *   Elsewhere the scene opens through a feathered circle (--wipe-r, --wipe-feather) with a gold
 *   arc along its edge (--wipe-front). Each of the scene's parts waits, held, until the front
 *   reaches it, then rises in (lib/scenes.js, styles.css), so the title, paintings and routes come
 *   in one after another as they are uncovered.
 * - Depth (not in Figma): from the start of the opening until the scene has scrolled away, each
 *   painting moves at its own pace (DRIFT: the left and the market rise, the right one sinks) and
 *   lags inside its frame (INNER), meeting its Figma
 *   place just as the scene has opened; the side paintings and the title also slide in while it
 *   opens (styles.css, --wipe).
 * With prefers-reduced-motion the scene is not wiped; it slides up over the plan as plain scroll.
 */

const ARTBOARD = 1440;
// Leads overshoot the edge, so a scrollbar or rounding never leaves a loose end in view.
const OVERSHOOT = 24;
const INK_PAINT = 'lib/ink-paint.js';
// Ink front, as shares of the view's height: how far its lobes push it in and out, and how soft
// its edge is.
const INK_AMP = .06;
const INK_FEATHER = .1;
// Circle fallback: feathered edge as a share of the view's height (px bounds).
const FEATHER = .22;
const FEATHER_MIN = 120;
const FEATHER_MAX = 220;

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
// Under way from the first scroll, slowing gently as it reaches the far side.
const easeOut = t => 1 - (1 - t) ** 1.5;

function withLeads(d, spare) {
  const numbers = d.match(/-?\d+(\.\d+)?/g).map(Number);
  const [startX, startY] = numbers;
  const [endX, endY] = numbers.slice(-2);
  const out = x => (x < 0 ? x - spare : x > ARTBOARD ? x + spare : null);
  let path = d;
  if (out(startX) !== null) path = `M ${out(startX)} ${startY} L ${path.replace(/^M\s*/, '')}`;
  if (out(endX) !== null) path += ` L ${out(endX)} ${endY}`;
  return path;
}

function startRoutes(scene) {
  const paths = [...scene.querySelectorAll('.capital__routes path')].map(path => [path, path.getAttribute('d')]);
  let spare = -1;

  function fit() {
    const scale = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--stage-scale')) || 1;
    const next = Math.max(0, Math.ceil((scene.clientWidth / scale - ARTBOARD) / 2));
    if (next === spare) return;
    spare = next;
    for (const [path, d] of paths) path.setAttribute('d', withLeads(d, spare + OVERSHOOT));
  }

  // The scene's height follows the stage scale, so this also runs when only the scale changes.
  new ResizeObserver(fit).observe(scene);
}

function startWipe(cover, scene) {
  // Its in-flow place is where the wipe starts (nothing shows yet), so a link lands where it ends.
  const wipeEnd = () => cover.getBoundingClientRect().top + window.scrollY + cover.offsetHeight - scene.offsetHeight;
  if (location.hash === `#${scene.id}`) {
    requestAnimationFrame(() => window.scrollTo({ top: wipeEnd(), behavior: 'instant' }));
  }

  // Every part waits (lib/scenes.js skips [data-held]) until the opening reaches it.
  const held = new Set(scene.querySelectorAll('[data-reveal]'));
  for (const part of held) part.dataset.held = '';
  function release(open, done) {
    if (!held.size) return;
    const corner = cover.clientWidth;
    for (const part of held) {
      const box = part.getBoundingClientRect();
      // From the view's top-right corner to the part's nearest point.
      const near = Math.hypot(Math.max(0, corner - box.right, box.left - corner), Math.max(0, box.top));
      if (done || near < open) {
        delete part.dataset.held;
        held.delete(part);
      }
    }
  }

  // The ink front, once its worklet has loaded (it takes over even if the page is still).
  let ink = false;
  CSS.paintWorklet?.addModule(INK_PAINT).then(() => { ink = true; schedule(); })
    .catch(error => console.warn('Ink front disabled:', error));
  let frame = 0;
  let last = -1;

  function renderInk(wipe, time) {
    const width = cover.clientWidth;
    const height = window.innerHeight;
    const amp = height * INK_AMP;
    const feather = height * INK_FEATHER;
    // To the far corner, past its lobes and its feather, so the scene ends wholly unmasked.
    const reach = (Math.hypot(width, height) + amp + feather * 2) * easeOut(wipe);
    // The warm light along the front comes in with the first ink and fades as it leaves the view.
    const glow = Math.max(0, Math.min(1, wipe / .05, (1 - wipe) / .3));
    cover.style.setProperty('--wipe', wipe.toFixed(4));
    cover.style.setProperty('--ink-reach', `${(wipe < 1 ? reach : 0).toFixed(1)}px`);
    cover.style.setProperty('--ink-amp', `${amp.toFixed(1)}px`);
    cover.style.setProperty('--ink-feather', `${feather.toFixed(1)}px`);
    cover.style.setProperty('--ink-time', time.toFixed(3));
    cover.style.setProperty('--ink-glow', glow.toFixed(3));
    // A part rises in once the front, at its furthest in, has passed it.
    release(reach - amp - feather, wipe >= 1);
  }

  function render(now = performance.now()) {
    frame = 0;
    const length = Math.max(1, cover.offsetHeight - scene.offsetHeight);
    const wipe = clamp(-cover.getBoundingClientRect().top / length);
    cover.classList.toggle('is-wiping', wipe < 1);
    cover.classList.toggle('is-ink', ink);
    if (ink) {
      renderInk(wipe, now / 1000);
      // The front keeps drifting while it is on screen, even when the page is still.
      if (wipe > 0 && wipe < 1) schedule();
      return;
    }
    if (wipe === last) return;
    last = wipe;

    const width = window.innerWidth;
    const height = window.innerHeight;
    const feather = clamp(height * FEATHER, FEATHER_MIN, FEATHER_MAX);
    // To the far corner and a feather past it, so the scene ends fully opaque. Eased out: the
    // opening is small at first anyway, and the edge slows as it lands.
    const radius = (Math.hypot(width, height) + feather) * (1 - (1 - wipe) ** 2);
    // The arc fades in over the first 8% and out over the last 25%.
    const front = Math.min(1, wipe / .08, (1 - wipe) / .25);

    cover.style.setProperty('--wipe', wipe.toFixed(4));
    cover.style.setProperty('--wipe-r', `${radius.toFixed(1)}px`);
    cover.style.setProperty('--wipe-feather', `${feather.toFixed(1)}px`);
    cover.style.setProperty('--wipe-front', front.toFixed(3));
    release(radius - feather / 2, wipe >= 1);
  }
  const schedule = () => { frame ||= requestAnimationFrame(render); };
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', () => { last = -1; schedule(); });
  render();
}

// Depth: how fast each layer rises past the page (negative: sinks), in artboard px per viewport
// of scroll, and how far each painting lags inside its frame (it rests 12% large, so 6% of its
// frame's height is spare above and below; styles.css). The side paintings part ways: the left
// one rises, the right one sinks.
const DRIFT = { left: 90, right: -70, hub: 42, title: 16 };
const INNER = 22;
const FRAME_HEIGHT = { left: 468, right: 468, hub: 674 };
const REST_SCALE = 1.12;
// Share of the remaining distance each layer covers per 60 fps frame (eased inertia).
const SMOOTHING = .14;

function startDepth(cover, scene) {
  let frame = 0, last = 0, shift = null;

  function render(time) {
    frame = 0;
    const view = window.innerHeight;
    const box = cover.getBoundingClientRect();
    if (box.bottom < 0 || box.top > view) {
      shift = null;
      last = 0;
      return;
    }
    // Viewports of scroll from where the scene has just fully opened (its Figma places): negative
    // while it opens over the plan, positive as it scrolls on.
    const goal = (-box.top - (cover.offsetHeight - scene.offsetHeight)) / view;
    const elapsed = last ? Math.min(time - last, 100) : 1000 / 60;
    const ease = 1 - (1 - SMOOTHING) ** (elapsed / (1000 / 60));
    last = time;
    // Coming into view it starts where it belongs, so it never slides in from a stale place.
    shift = shift === null ? goal : shift + (goal - shift) * ease;
    if (Math.abs(goal - shift) < .0005) shift = goal;

    for (const [name, speed] of Object.entries(DRIFT)) {
      scene.style.setProperty(`--drift-${name}`, `${(-shift * speed).toFixed(2)}px`);
    }
    for (const [name, height] of Object.entries(FRAME_HEIGHT)) {
      const spare = height * (REST_SCALE - 1) / 2;
      const inner = Math.max(-spare, Math.min(spare, shift * INNER));
      scene.style.setProperty(`--inner-${name}`, `${inner.toFixed(2)}px`);
    }
    if (shift !== goal) schedule();
    else last = 0;
  }
  function schedule() { frame ||= requestAnimationFrame(render); }
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  schedule();
}

export function startCapital(scene) {
  if (!scene) return;
  startRoutes(scene);
  const cover = scene.closest('.capital-cover');
  if (!cover || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  startWipe(cover, scene);
  startDepth(cover, scene);
}
