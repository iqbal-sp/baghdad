/**
 * Back to the three ages after Period I (not in Figma): the dive into Period I, played backwards
 * up to the point of choosing the next age. Period II itself is not built yet, so it ends here.
 *
 * The closing is held (styles.css, .closing-pin) and over --return-length of scroll:
 * 1. it shrinks into card I: a square crop around its painting (CROP artboard px) is scaled down
 *    at a constant zoom rate about the one point that takes it onto card I, while the rest of the
 *    closing is clipped away; behind it, a copy of the story (.period-map, built from the
 *    story's own markup) fades in and its camera pulls back from CAMERA of that zoom to rest,
 *    about card I, until all three cards show;
 * 2. the shrunken closing fades into card I's own painting;
 * 3. card I is marked done (gold badge with a check, gold rule), and card II steps forward with
 *    its detail open, as the age that comes next.
 * Scrolling back plays it in reverse. With reduced motion the closing simply fades to the map.
 */

const CROP = 700;                       // square around the closing's painting, artboard px
const CROP_CENTER = { x: 719.7, y: 793.5 };
const CARD = { x: 573, y: 280, size: 120 };  // story period I thumbnail (122:22)
const STAGE = { width: 1440, height: 1024 };
const CAMERA = .35;
// Shares of the pinned scroll: a beat to finish reading, the shrink, the fade, then the marks.
const SHRINK_FROM = .08;
const SHRINK_TO = .72;
const FADE_TO = .82;
const DONE_AT = .86;
const NEXT_AT = .92;

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const easeInOutCubic = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const smoothstep = (edge0, edge1, x) => {
  const t = clamp((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
};

const CHECK = '<svg viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M2.5 6.2 5 8.6 9.6 3.4" stroke="#170601" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

// A copy of the story to stand behind the closing: same markup, no ids, nothing focusable, none
// of the journey's inline motion, and the hint pointing to what comes next.
function copyStory(source) {
  const map = source.cloneNode(true);
  map.removeAttribute('id');
  map.removeAttribute('aria-labelledby');
  map.removeAttribute('data-active');
  map.classList.remove('panel', 'panel--story', 'is-settled', 'has-arrived');
  map.classList.add('story--map');
  for (const element of map.querySelectorAll('[id]')) element.removeAttribute('id');
  for (const element of map.querySelectorAll('[aria-describedby]')) element.removeAttribute('aria-describedby');
  for (const element of map.querySelectorAll('[tabindex], a, button')) element.setAttribute('tabindex', '-1');
  for (const element of map.querySelectorAll('.is-active')) element.classList.remove('is-active');
  for (const element of map.querySelectorAll('.story__stage, .story__murals, .story__splatter, [data-parallax]')) {
    element.style.removeProperty('transform');
    element.style.removeProperty('opacity');
    element.style.removeProperty('translate');
  }
  const hint = map.querySelector('.story__hint');
  if (hint) {
    const words = [...hint.childNodes].find(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
    if (words) words.textContent = 'Period II · coming next';
  }
  map.querySelector('.period--1 .period__badge')?.insertAdjacentHTML('beforeend', CHECK);
  return map;
}

export function startPeriodMap(pin, { lenis } = {}) {
  const source = document.querySelector('#story');
  if (!pin || !source) return;
  const closing = pin.querySelector('.scene--closing');
  const layer = pin.querySelector('.period-map');
  const camera = layer.querySelector('.period-map__camera');
  const map = copyStory(source);
  camera.append(map);
  const first = map.querySelector('.period--1');
  const second = map.querySelector('.period--2');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let shown = false;

  function clear() {
    closing.style.removeProperty('transform');
    closing.style.removeProperty('transform-origin');
    closing.style.removeProperty('clip-path');
    closing.style.removeProperty('opacity');
    layer.style.opacity = '';
  }

  function render() {
    const view = window.innerHeight;
    const width = pin.clientWidth;
    const scale = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--stage-scale')) || 1;
    const height = closing.offsetHeight;
    const length = Math.max(1, pin.offsetHeight - height);
    // 0 once the closing's bottom reaches the bottom of the view (it sticks there), 1 at the end.
    const progress = clamp((-pin.getBoundingClientRect().top - (height - view)) / length);

    const done = progress >= DONE_AT;
    first.classList.toggle('is-done', done);
    const next = progress >= NEXT_AT;
    second.classList.toggle('is-active', next);
    map.toggleAttribute('data-active', next);

    if (progress <= 0) {
      clear();
      if (shown) { shown = false; map.classList.remove('has-arrived'); }
      return;
    }

    const shrink = easeInOutCubic(clamp((progress - SHRINK_FROM) / (SHRINK_TO - SHRINK_FROM)));
    const fade = smoothstep(SHRINK_TO, FADE_TO, progress);
    const reveal = clamp(shrink * 1.6);
    layer.style.opacity = reveal.toFixed(3);
    if (reveal > .2 && !shown) { shown = true; map.classList.add('has-arrived'); }

    if (reduced.matches) {
      closing.style.opacity = (1 - smoothstep(SHRINK_FROM, FADE_TO, progress)).toFixed(3);
      layer.style.opacity = smoothstep(SHRINK_FROM, FADE_TO, progress).toFixed(3);
      return;
    }

    // Card I on screen (the story stage is centred in the view at the shared scale).
    const card = {
      x: width / 2 + (CARD.x + CARD.size / 2 - STAGE.width / 2) * scale,
      y: view / 2 + (CARD.y + CARD.size / 2 - STAGE.height / 2) * scale,
    };
    // The crop on the stuck closing, in its own box (its top sits height − view above the view).
    const top = view - height;
    const crop = { x: width / 2 + (CROP_CENTER.x - STAGE.width / 2) * scale, y: CROP_CENTER.y * scale, side: CROP * scale };
    const zoom = CARD.size / CROP;
    // The one point a pure scale about takes the crop's centre onto the card's.
    const origin = {
      x: (card.x - zoom * crop.x) / (1 - zoom),
      y: (card.y - zoom * (crop.y + top)) / (1 - zoom) - top,
    };
    closing.style.transformOrigin = `${origin.x.toFixed(2)}px ${origin.y.toFixed(2)}px`;
    closing.style.transform = `scale(${(zoom ** shrink).toFixed(5)})`;
    const cut = easeInOutCubic(clamp(shrink / .7));
    const inset = {
      top: (crop.y - crop.side / 2) * cut,
      right: (width - crop.x - crop.side / 2) * cut,
      bottom: (height - crop.y - crop.side / 2) * cut,
      left: (crop.x - crop.side / 2) * cut,
    };
    closing.style.clipPath = `inset(${inset.top.toFixed(1)}px ${inset.right.toFixed(1)}px ${inset.bottom.toFixed(1)}px ${inset.left.toFixed(1)}px)`;
    closing.style.opacity = (1 - fade).toFixed(3);

    // The map's camera pulls back about card I as the closing lands on it.
    layer.style.setProperty('--map-ox', `${card.x.toFixed(1)}px`);
    layer.style.setProperty('--map-oy', `${card.y.toFixed(1)}px`);
    layer.style.setProperty('--map-zoom', ((1 / zoom) ** (CAMERA * (1 - shrink))).toFixed(4));
  }

  lenis?.on('scroll', render);
  window.addEventListener('scroll', render, { passive: true });
  window.addEventListener('resize', render);
  render();
}
