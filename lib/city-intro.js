/**
 * Scene 3 intro: scene 2's white closes into the dot on the "i" of "city".
 * Not in Figma, added for the page's motion. Over the intro's scroll (t 0–1, from its top entering
 * the bottom of the view to the end of its pin):
 * - the white .city__tittle is clipped to a circle round the dot. It starts large enough to cover
 *   the whole intro (so scene 2's white simply carries on), and shrinks onto the dot by SHRINK;
 *   the title sets that "i" dotless, so the circle is the dot. A gold hairline rides just outside
 *   its edge, fading as it closes, and two ripples spread from the dot when it lands;
 * - the heading opens as the Foundations heading does (lib/heading-reveal.js, without its meta
 *   row): the title letter by letter (the "i" stem rises to meet its dot), then the intro;
 * - the cue fades in last.
 * Then, as the explorer arrives (its drawing progress e, lib/city-draw.js), the dot leaves the
 * "i" just after the intro unpins and falls to the plan's centre (.city__seed, by e .5), swelling a little in flight, and
 * sinks into the palace dome as the plan blooms out of it (e .5–.56).
 * With prefers-reduced-motion the dot and heading are simply there.
 */
import { createHeadingReveal } from './heading-reveal.js';
import { drawProgress } from './city-draw.js';

// Scroll windows within t (280vh: 100vh arriving, 180vh pinned). The intro's top reaches the top
// of the view at t ≈ .36. The heading and cue are done by t .7, leaving ~85vh of calm reading
// before the intro unpins and the dot falls.
const SHRINK = .47;
const HEADING = { start: .31, end: .625 };
const RIPPLE = { start: .43, length: .17 };
const CUE = { start: .625, length: .07 };
const LANDING = .72;
// Gap between the white edge and the gold hairline, in artboard px.
const HALO_GAP = 14;
// How far the white layer reaches up under scene 2 (styles.css), in px.
const TITTLE_BLEED = 3;
// The dot's fall to the plan (windows within the explorer's drawing progress e; it starts just
// after the intro unpins, FALL_AFTER past that point), and the plan's centre on the artboard.
const FALL_AFTER = .03;
const FALL_END = .5;
const SINK = [.5, .56];
const PLAN_CENTRE = [720, 520];

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const smoothstep = t => t * t * (3 - 2 * t);

// The dot of "i" in the title's font: its centre (from the glyph origin, y up from the baseline)
// and radius, in px at that size. Read off a canvas, the dot being the top run of ink rows.
function measureDot(title) {
  const style = getComputedStyle(title);
  const size = 400;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size * 2;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  context.font = `${style.fontWeight} ${size}px ${style.fontFamily}`;
  context.fillText('i', size / 2, size * 1.5);
  const { data } = context.getImageData(0, 0, canvas.width, canvas.height);

  let top = -1;
  let bottom = -1;
  let left = Infinity;
  let right = -Infinity;
  for (let y = 0; y < canvas.height; y++) {
    let ink = false;
    for (let x = 0; x < canvas.width; x++) {
      if (data[(y * canvas.width + x) * 4 + 3] < 128) continue;
      ink = true;
      left = Math.min(left, x);
      right = Math.max(right, x);
    }
    if (ink && top < 0) top = y;
    if (ink) bottom = y;
    else if (top >= 0) break;
  }

  const unit = parseFloat(style.fontSize) / size;
  return {
    x: ((left + right + 1) / 2 - size / 2) * unit,
    y: (size * 1.5 - (top + bottom + 1) / 2) * unit,
    r: Math.max(right - left + 1, bottom - top + 1) / 2 * unit,
  };
}

export function startCityIntro(intro, { explore } = {}) {
  if (!intro) return;
  const viewport = intro.querySelector('.city__intro-viewport');
  const stage = intro.querySelector('.city__intro-stage');
  const title = stage.querySelector('.chapter__title');
  const cue = stage.querySelector('.city__cue');
  const tittle = intro.querySelector('.city__tittle');
  const [edge, ...ripples] = intro.querySelectorAll('.city__halo circle');
  const seed = document.querySelector('.city__seed');
  const planStage = explore?.querySelector('.city__stage');
  const heading = createHeadingReveal(stage);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // #round-city lands with the heading and cue complete (t LANDING), not mid-reveal.
  if (location.hash === '#round-city') {
    requestAnimationFrame(() => {
      const top = intro.getBoundingClientRect().top + window.scrollY;
      const landing = reduced ? top : top - window.innerHeight + LANDING * intro.offsetHeight;
      window.scrollTo({ top: landing, behavior: 'instant' });
    });
  }

  if (reduced) {
    heading.render(1);
    return;
  }

  // The dot's centre and radius on the artboard, once the title is split.
  let dot = null;
  let frame = 0;

  heading.ready.then(({ letters }) => {
    const index = letters.findIndex((letter, i) => letter.textContent === 'i' && letters[i - 1]?.textContent === 'c');
    if (index < 0) return;
    const letter = letters[index];
    const glyph = measureDot(title);
    letter.textContent = 'ı';

    // An empty inline-block sits on the baseline.
    const probe = document.createElement('span');
    probe.style.cssText = 'display: inline-block; width: 0; height: 0;';
    title.append(probe);
    const baseline = title.offsetTop + probe.offsetTop;
    probe.remove();

    dot = {
      x: title.offsetLeft + letter.offsetLeft + glyph.x,
      y: baseline - glyph.y,
      r: glyph.r,
    };
    intro.classList.add('is-live');
    schedule();
  });

  function render() {
    frame = 0;
    const view = window.innerHeight;
    const box = intro.getBoundingClientRect();
    if (box.top > view) return;
    if (box.bottom < 0) {
      seed.style.opacity = '0';
      return;
    }
    const t = clamp((view - box.top) / intro.offsetHeight);

    heading.render(clamp((t - HEADING.start) / (HEADING.end - HEADING.start)));
    cue.style.opacity = smoothstep(clamp((t - CUE.start) / CUE.length)).toFixed(3);
    if (!dot) return;

    // The dot in the viewport element's px.
    const scale = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--stage-scale')) || 1;
    const frameBox = viewport.getBoundingClientRect();
    const stageBox = stage.getBoundingClientRect();
    const x = stageBox.left - frameBox.left + dot.x * scale;
    const y = stageBox.top - frameBox.top + dot.y * scale;
    const r = dot.r * scale;

    // Large enough to reach the frame's farthest corner, then closing onto the dot, gently at
    // both ends.
    const far = Math.hypot(Math.max(x, frameBox.width - x), Math.max(y, frameBox.height - y)) + 2;
    const close = smoothstep(clamp(t / SHRINK));
    const e = planStage ? drawProgress(explore) : 0;
    // e at which the intro unpins (its bottom meets the view's): the explorer overlaps it by a
    // fixed amount, so this is that overlap over the drawing's 2 views of scroll.
    const unpinned = explore ? (box.bottom - explore.getBoundingClientRect().top) / (2 * view) : 0;
    const fallFrom = unpinned + FALL_AFTER;
    const fall = clamp((e - fallFrom) / (FALL_END - fallFrom));
    // Once the dot has left, the "i" keeps no dot of its own.
    const radius = fall > 0 ? 0 : r + (far - r) * (1 - close) ** 2;
    if (planStage) fly(fall, e, { x: frameBox.left + x, y: frameBox.top + y, r }, scale);
    tittle.style.clipPath = `circle(${radius.toFixed(2)}px at ${x.toFixed(2)}px ${(y + TITTLE_BLEED).toFixed(2)}px)`;

    edge.setAttribute('cx', x.toFixed(2));
    edge.setAttribute('cy', y.toFixed(2));
    edge.setAttribute('r', (radius + HALO_GAP * scale).toFixed(2));
    edge.style.opacity = (.7 * clamp((radius / scale - 24) / 120)).toFixed(3);

    ripples.forEach((ripple, i) => {
      const spread = clamp((t - RIPPLE.start - i * .05) / RIPPLE.length);
      ripple.setAttribute('cx', x.toFixed(2));
      ripple.setAttribute('cy', y.toFixed(2));
      ripple.setAttribute('r', (r * (1.6 + spread * (7 + i * 4))).toFixed(2));
      ripple.style.opacity = spread > 0 && spread < 1 ? (.6 * (1 - spread)).toFixed(3) : '0';
    });
  }

  // The dot from the "i" (both points move with their own pinned frames) to the plan's centre:
  // down first, then gliding across into the centre, on a quadratic curve.
  function fly(fall, e, from, scale) {
    const sink = clamp((e - SINK[0]) / (SINK[1] - SINK[0]));
    if (fall <= 0 || sink >= 1) {
      seed.style.opacity = '0';
      return;
    }
    const box = planStage.getBoundingClientRect();
    const to = { x: box.left + PLAN_CENTRE[0] * scale, y: box.top + PLAN_CENTRE[1] * scale };
    const k = smoothstep(fall);
    const bend = { x: from.x, y: to.y };
    const x = (1 - k) ** 2 * from.x + 2 * k * (1 - k) * bend.x + k ** 2 * to.x;
    const y = (1 - k) ** 2 * from.y + 2 * k * (1 - k) * bend.y + k ** 2 * to.y;
    const size = from.r * (1 + .6 * Math.sin(Math.PI * k)) * (1 - smoothstep(sink));
    seed.style.opacity = '1';
    seed.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) scale(${(size / 10).toFixed(4)})`;
  }

  function schedule() { frame ||= requestAnimationFrame(render); }
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  schedule();
}
