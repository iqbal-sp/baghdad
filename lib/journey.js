import Lenis from './vendor/lenis/lenis.mjs';
import { createSmoke } from './smoke.js';
import { createDive } from './dive.js';

/**
 * Hero → story → period I journey.
 *
 * Lenis smooths the page scroll. The scroll through `.journey` is split into segments
 * (sizes in viewport heights): slide 1.4, rest on the story .3, dive 2, then the
 * chapter's last 235 artboard px (read). The slide progress (0–1):
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
 * The dive and read progress drive lib/dive.js (zoom into period I and its chapter).
 */

const STAGE = { width: 1440, height: 1024 };
// Hysteresis keeps classes from flickering around their thresholds.
const SETTLE_AT = .995;
const UNSETTLE_AT = .9;
// Murals start creeping out of the corners once the story is mostly in view.
const ARRIVE_AT = .72;
const DEPART_AT = .45;
// Scroll segments in viewport heights; the read segment is whatever scroll is left.
const SLIDE = 1.4;
const REST = .3;
const DIVE = 2;

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
  const dive = createDive(journey, { reducedMotion });

  // Lenis respects prefers-reduced-motion itself and falls back to native scrolling.
  const lenis = new Lenis({ autoRaf: true, lerp: .08, wheelMultiplier: .9 });

  let width = 0;
  let height = 0;
  let scale = 1;
  let travel = 1;
  // Segment lengths in px.
  let slide = 1;
  let rest = 0;
  let diveLength = 1;
  let read = 1;

  function measure() {
    width = viewport.clientWidth;
    height = viewport.clientHeight;
    scale = Math.min(width / STAGE.width, height / STAGE.height);
    // Shared by every artboard; the journey's CSS height depends on it, so set it first.
    journey.style.setProperty('--stage-scale', scale.toFixed(4));
    // Use the real maximum scroll so fractional vh heights still reach the end.
    const scrollable = document.documentElement.scrollHeight - journey.offsetTop;
    travel = Math.max(1, Math.min(journey.offsetHeight, scrollable) - window.innerHeight);
    slide = SLIDE * height;
    rest = REST * height;
    diveLength = DIVE * height;
    read = Math.max(1, travel - slide - rest - diveLength);
  }

  const storyAt = () => journey.offsetTop + slide;
  const chapterAt = () => storyAt() + rest + diveLength;

  function render(scroll) {
    const offset = scroll - journey.offsetTop;
    const progress = clamp(offset / slide);

    // Snap to whole device pixels: fractional offsets make the detailed illustration
    // resample at a new sub-pixel phase every frame, which reads as shimmer/glitching.
    const dpr = window.devicePixelRatio || 1;
    const shift = Math.round(progress * width * dpr) / dpr;
    track.style.transform = `translate3d(${-shift}px, 0, 0)`;
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

    const diving = clamp((offset - slide - rest) / diveLength);
    const reading = clamp((offset - slide - rest - diveLength) / read);
    dive.render(diving, reading, { width, height, scale });
  }

  function goToStory(immediate = false) {
    lenis.scrollTo(storyAt(), { immediate, duration: 2.2 });
  }

  function goToChapter(immediate = false) {
    lenis.scrollTo(chapterAt(), { immediate, duration: 2.8 });
  }

  journey.querySelector('.scroll-cue').addEventListener('click', event => {
    event.preventDefault();
    goToStory(reducedMotion);
  });

  // Keyboard users reaching the periods are brought to the settled story (anywhere in its rest is fine).
  story.addEventListener('focusin', () => {
    if (lenis.scroll < storyAt() - 1 || lenis.scroll > storyAt() + rest + 1) goToStory(true);
  });

  // Choosing period I dives into its chapter.
  story.querySelector('.period--1 .period__thumb').addEventListener('click', () => goToChapter(reducedMotion));

  lenis.on('scroll', ({ scroll }) => render(scroll));
  let resizeTimer = 0;
  // Keep the same place in the journey across resizes (segment lengths change with the viewport).
  window.addEventListener('resize', () => {
    const offset = lenis.scroll - journey.offsetTop;
    const marks = [0, slide, slide + rest, slide + rest + diveLength, travel];
    const index = Math.max(0, Math.min(3, marks.findLastIndex(mark => offset >= mark)));
    const within = clamp((offset - marks[index]) / Math.max(1, marks[index + 1] - marks[index]));
    measure();
    const next = [0, slide, slide + rest, slide + rest + diveLength, travel];
    const scroll = journey.offsetTop + next[index] + within * (next[index + 1] - next[index]);
    // Native scroll first (Lenis syncs to it); Lenis re-measures its limit a moment later.
    window.scrollTo({ top: scroll, behavior: 'instant' });
    render(scroll);
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => lenis.scrollTo(scroll, { immediate: true, force: true }), 300);
  });

  measure();
  if (location.hash === '#story') goToStory(true);
  if (location.hash === '#foundations') goToChapter(true);
  render(window.scrollY);
}
