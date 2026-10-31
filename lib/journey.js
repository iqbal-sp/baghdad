import Lenis from './vendor/lenis/lenis.mjs';
import { createSmoke } from './smoke.js';

/**
 * Hero → story horizontal journey.
 *
 * Lenis smooths the page scroll; vertical progress through `.journey` (0–1):
 * 1. slides the track one viewport to the left,
 * 2. dissolves the hero's trailing edge into #170601 with a gradient overlay
 *    that widens (scaleX) from 0, then dims the whole hero, so there is never
 *    a seam against the story and the fade does not arrive abruptly,
 * 3. fades the story artboard in and moves each [data-parallax] layer (title
 *    lines, eyebrow, period images) at its own --depth, landing on the Figma
 *    position exactly at progress 1,
 * 4. rolls warm WebGL smoke across the seam mid-slide and fades in the shared
 *    grain, so the two panels never show a hard edge,
 * 5. lets the corner murals grow (stems draw, leaves bud) once the story is ~70% in.
 */

const STAGE = { width: 1440, height: 1024 };
// Hysteresis keeps classes from flickering around their thresholds.
const SETTLE_AT = .995;
const UNSETTLE_AT = .9;
// Murals start creeping out of the corners once the story is mostly in view.
const ARRIVE_AT = .72;
const DEPART_AT = .45;

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const smoothstep = (edge0, edge1, x) => {
  const t = clamp((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
};
/** onProgress(progress, viewportWidth, stageScale) runs on every render (hero depth parallax). */
export function startJourney(journey, { onProgress } = {}) {
  const viewport = journey.querySelector('.journey__viewport');
  const track = journey.querySelector('.journey__track');
  const edgeFade = journey.querySelector('.hero__edge-fade');
  const heroFade = journey.querySelector('.hero__fade');
  const story = journey.querySelector('.story');
  const stage = story.querySelector('.story__stage');
  const grain = journey.querySelector('.journey__grain');
  const smoke = createSmoke(journey.querySelector('.journey__smoke'));
  const layers = [...story.querySelectorAll('[data-parallax]')].map(element => ({
    element,
    depth: Number(getComputedStyle(element).getPropertyValue('--depth')) || 0,
  }));
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Lenis respects prefers-reduced-motion itself and falls back to native scrolling.
  const lenis = new Lenis({ autoRaf: true, lerp: .08, wheelMultiplier: .9 });

  let width = 0;
  let scale = 1;
  let travel = 1;

  function measure() {
    width = viewport.clientWidth;
    // Use the real maximum scroll so fractional vh heights still reach progress 1.
    const scrollable = document.documentElement.scrollHeight - journey.offsetTop;
    travel = Math.max(1, Math.min(journey.offsetHeight, scrollable) - window.innerHeight);
    scale = Math.min(width / STAGE.width, viewport.clientHeight / STAGE.height);
    // Shared by the hero and story artboards.
    journey.style.setProperty('--stage-scale', scale.toFixed(4));
  }

  function render(scroll) {
    const progress = clamp((scroll - journey.offsetTop) / travel);

    // Snap to whole device pixels: fractional offsets make the detailed illustration
    // resample at a new sub-pixel phase every frame, which reads as shimmer/glitching.
    const dpr = window.devicePixelRatio || 1;
    const offset = Math.round(progress * width * dpr) / dpr;
    track.style.transform = `translate3d(${-offset}px, 0, 0)`;
    // The dissolve starts at 0px wide (untouched hero at rest) and eases out to 70% of the viewport.
    edgeFade.style.transform = `scaleX(${(.7 * smoothstep(0, .7, progress)).toFixed(4)})`;
    heroFade.style.opacity = (.5 * smoothstep(.4, 1, progress)).toFixed(3);
    stage.style.opacity = smoothstep(.4, 1, progress).toFixed(3);
    // Grain belongs to the story in Figma (6%); fading it in keeps the hero clean at rest.
    grain.style.opacity = (.06 * smoothstep(.1, .7, progress)).toFixed(4);
    smoke.setProgress(progress);
    onProgress?.(progress, width, scale);

    const remaining = reducedMotion ? 0 : 1 - progress;
    for (const { element, depth } of layers) {
      element.style.translate = `${(remaining * width * depth).toFixed(2)}px 0`;
    }

    if (progress >= ARRIVE_AT) story.classList.add('has-arrived');
    else if (progress < DEPART_AT) story.classList.remove('has-arrived');

    if (progress >= SETTLE_AT) story.classList.add('is-settled');
    else if (progress < UNSETTLE_AT) story.classList.remove('is-settled');
  }

  function goToStory(immediate = false) {
    lenis.scrollTo(journey.offsetTop + travel, { immediate, duration: 2.2 });
  }

  journey.querySelector('.scroll-cue').addEventListener('click', event => {
    event.preventDefault();
    goToStory(reducedMotion);
  });

  // Keyboard users reaching the periods are brought to the settled story.
  story.addEventListener('focusin', () => {
    if (lenis.scroll < journey.offsetTop + travel - 1) goToStory(true);
  });

  lenis.on('scroll', ({ scroll }) => render(scroll));
  let resizeTimer = 0;
  // Keep the same journey progress across resizes (the scroll length changes with the viewport).
  window.addEventListener('resize', () => {
    const progress = clamp((lenis.scroll - journey.offsetTop) / travel);
    measure();
    const scroll = journey.offsetTop + progress * travel;
    // Native scroll first (Lenis syncs to it); Lenis re-measures its limit a moment later.
    window.scrollTo({ top: scroll, behavior: 'instant' });
    render(scroll);
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => lenis.scrollTo(scroll, { immediate: true, force: true }), 300);
  });

  measure();
  if (location.hash === '#story') goToStory(true);
  render(window.scrollY);
}
