import Lenis from './vendor/lenis/lenis.mjs';

/**
 * Hero → story horizontal journey.
 *
 * Lenis smooths the page scroll; vertical progress through `.journey` (0–1):
 * 1. slides the track one viewport to the left,
 * 2. dissolves the hero into the #13100e behind it: a mask on its trailing
 *    edge widens gradually from 0px, then the whole hero dims, so there is
 *    never a seam against the story and the fade does not arrive abruptly,
 * 3. fades the story artboard in and moves each [data-parallax] layer (title
 *    lines, eyebrow, period images) at its own --depth, landing on the Figma
 *    position exactly at progress 1,
 * 4. reveals the texture slowly once the story has settled (CSS transition).
 */

const STAGE = { width: 1440, height: 1024 };
// Hysteresis keeps the texture from flickering around the end of the slide.
const SETTLE_AT = .995;
const UNSETTLE_AT = .9;

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const smoothstep = (edge0, edge1, x) => {
  const t = clamp((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
};
export function startJourney(journey) {
  const viewport = journey.querySelector('.journey__viewport');
  const track = journey.querySelector('.journey__track');
  const hero = journey.querySelector('.panel--hero');
  const heroFade = journey.querySelector('.hero__fade');
  const story = journey.querySelector('.story');
  const stage = story.querySelector('.story__stage');
  const layers = [...story.querySelectorAll('[data-parallax]')].map(element => ({
    element,
    depth: Number(getComputedStyle(element).getPropertyValue('--depth')) || 0,
  }));
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Lenis respects prefers-reduced-motion itself and falls back to native scrolling.
  const lenis = new Lenis({ autoRaf: true, lerp: .08, wheelMultiplier: .9 });

  let width = 0;
  let travel = 1;

  function measure() {
    width = viewport.clientWidth;
    // Use the real maximum scroll so fractional vh heights still reach progress 1.
    const scrollable = document.documentElement.scrollHeight - journey.offsetTop;
    travel = Math.max(1, Math.min(journey.offsetHeight, scrollable) - window.innerHeight);
    const scale = Math.min(width / STAGE.width, viewport.clientHeight / STAGE.height);
    story.style.setProperty('--stage-scale', scale.toFixed(4));
  }

  function render(scroll) {
    const progress = clamp((scroll - journey.offsetTop) / travel);

    track.style.transform = `translate3d(${(-progress * width).toFixed(2)}px, 0, 0)`;
    // The dissolve starts at 0px wide (untouched hero at rest) and eases out to 70% of the viewport.
    const fadeWidth = width * .7 * smoothstep(0, .7, progress);
    hero.style.setProperty('--fade-width', `${fadeWidth.toFixed(1)}px`);
    heroFade.style.opacity = (.5 * smoothstep(.4, 1, progress)).toFixed(3);
    stage.style.opacity = smoothstep(.4, 1, progress).toFixed(3);

    const remaining = reducedMotion ? 0 : 1 - progress;
    for (const { element, depth } of layers) {
      element.style.translate = `${(remaining * width * depth).toFixed(2)}px 0`;
    }

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
  window.addEventListener('resize', () => {
    measure();
    render(lenis.scroll);
  });

  measure();
  if (location.hash === '#story') goToStory(true);
  render(window.scrollY);
}
