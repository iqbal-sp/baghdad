/**
 * Scene 4 — "A capital that drew the world in" (Figma 172:376, routes 182:75).
 * - Routes: they start, and the dashed branches end, just past the artboard's left or right edge
 *   (x −10 or 1450). On a view wider than the artboard's ratio the stage leaves room beside it
 *   (--spare in styles.css), so each of those ends gets a straight lead out past the edge of the
 *   view. The lines are drawn in with pathLength="1" (styles.css), so a longer lead does not change
 *   how they draw.
 * - Cover as a card (not in Figma): while the scene sticks over the still Round City plan
 *   (styles.css, .capital-cover), it comes in over it like a card laid on top, as the page
 *   scrolls (wipe 0 → 1 over the wrapper's extra height): from below the view, a little to the
 *   right and turned TILT° anticlockwise, so its top right corner leads, it rises and turns level
 *   and lands in place, casting a shadow on the plan that fades as it settles (--sheet-*). Its
 *   parts rise in as they come into view (lib/scenes.js), so they arrive with the card.
 * - Depth (not in Figma): from the start of the card's arrival until the scene has scrolled away,
 *   each painting moves at its own pace (DRIFT: the left and the market rise, the right one
 *   sinks) and lags inside its frame (INNER), meeting its Figma place just as the card has
 *   landed; the side paintings also slide in from their edges while it arrives (styles.css,
 *   --wipe).
 * With prefers-reduced-motion the card does not move or turn; it slides up over the plan as plain
 * scroll.
 */

const ARTBOARD = 1440;
// Leads overshoot the edge, so a scrollbar or rounding never leaves a loose end in view.
const OVERSHOOT = 24;
// The card's turn at the start (degrees, anticlockwise), and how far right of its place it starts
// (share of the view's width). It starts just below the view, its raised corner included.
const TILT = 12;
const SHIFT = .08;

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
// Under way from the first scroll, slowing gently as it lands.
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

function startCover(cover, scene) {
  // Its in-flow place is where the card starts (below the view), so a link lands where it ends.
  const landed = () => cover.getBoundingClientRect().top + window.scrollY + cover.offsetHeight - scene.offsetHeight;
  if (location.hash === `#${scene.id}`) {
    requestAnimationFrame(() => window.scrollTo({ top: landed(), behavior: 'instant' }));
  }

  let frame = 0;
  let last = -1;
  function render() {
    frame = 0;
    const length = Math.max(1, cover.offsetHeight - scene.offsetHeight);
    const wipe = clamp(-cover.getBoundingClientRect().top / length);
    if (wipe === last) return;
    last = wipe;
    const width = cover.clientWidth;
    const height = window.innerHeight;
    const rest = 1 - easeOut(wipe);
    // Turned about its top middle, its top right corner rises by half its width × sin(TILT).
    const drop = height + width / 2 * Math.sin(TILT * Math.PI / 180) + 80;
    cover.classList.toggle('is-wiping', wipe < 1);
    cover.style.setProperty('--wipe', wipe.toFixed(4));
    cover.style.setProperty('--sheet-x', `${(rest * SHIFT * width).toFixed(1)}px`);
    cover.style.setProperty('--sheet-y', `${(rest * drop).toFixed(1)}px`);
    cover.style.setProperty('--sheet-turn', `${(-rest * TILT).toFixed(3)}deg`);
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
  startCover(cover, scene);
  startDepth(cover, scene);
}
