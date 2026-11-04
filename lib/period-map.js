import { createDive } from './dive.js';

/**
 * Back to the three ages after Period I (not in Figma): the dive into Period I, played backwards
 * up to the point of choosing the next age, then on into it: Period II opens from card II with
 * the same dive as Period I (lib/dive.js).
 *
 * The closing is held (styles.css, .closing-pin) and over --return-length of scroll:
 * 1. behind it a copy of the story (.period-map, built from the story's own markup) stands ready;
 * 2. it shrinks into card I, ground and all, so its frame keeps the hand cut where it was: a
 *    square crop of its paper (CROP artboard px, just inside the paper's edges, about the centre
 *    of its content) is scaled down at a constant zoom rate about the one point that takes it
 *    onto card I, the rest of the closing clipped away by CUT of the shrink, while the heading,
 *    painting and paragraph shrink within the paper to FIT (--fit), so the card keeps all of them
 *    with a margin; the map's camera pulls back from CAMERA of that zoom to rest, about card I,
 *    until all three cards show;
 * 3. from TURN of the shrink, about 2.5 cards wide, the card turns over as it comes down, like a
 *    card tossed onto a table: the closing turns edge-on, then card I's own painting
 *    (.period-map__turn, a stand-in that follows the same path) turns up from behind it and lands
 *    on card I, lifted by LIFT at the middle of the turn;
 * 4. card I is marked done (gold badge with a check, gold rule), and card II steps forward with
 *    its detail open, as the age that comes next.
 * Then, still pinned, the map rests for REST viewports and DIVE viewports dive into card II: the
 * map's camera pushes in, the card flies to the Flourishing chapter's painting (Figma 226:451)
 * and the chapter opens around it; its last READ artboard px then scroll into view.
 * Scrolling back plays it in reverse. With reduced motion the closing simply fades to the map,
 * and the map to the chapter.
 */

// The paper runs 297.7–1142.4 across the frame (sheet.avif's opaque page), the content 327–1242.5
// down it, centred on 719.75; FIT leaves it about 72 px above and below in the square.
const CROP = 840;
const CROP_CENTER = { x: 719.75, y: 784.75 };
const FIT = .76;
const CARD = { x: 573, y: 280, size: 120 };  // story period I thumbnail (122:22)
const STAGE = { width: 1440, height: 1024 };
const CAMERA = .35;
// Shares of the pinned scroll: a beat to finish reading, the shrink (with the turn), the marks.
const SHRINK_FROM = .08;
const SHRINK_TO = .8;
const DONE_AT = .84;
const NEXT_AT = .9;
// Shares of the shrink's zoom (TURN .45 is ~2.6 cards wide).
const CUT = .45;
const TURN = .45;
const PERSPECTIVE = 800;                // screen px
const LIFT = .08;
// After the return, in viewport heights (styles.css, .closing-pin --onward-length), then READ.
const REST = .3;
const DIVE = 2;
const READ = 90;                        // chapter height (1114) past the 1024px viewport

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const easeInOutCubic = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const smoothstep = (edge0, edge1, x) => {
  const t = clamp((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
};

const CHECK = '<svg viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M2.5 6.2 5 8.6 9.6 3.4" stroke="#170601" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

// A copy of the story to stand behind a closing: same markup, no ids, nothing focusable, none of
// the journey's inline motion, the hint pointing to what comes next (`next`), and a check ready
// in the badge of each age already read (`read`). Period II's end uses one too (lib/sky.js).
export function copyStory(source, { next = 'Period II · coming next', read = [1] } = {}) {
  const map = source.cloneNode(true);
  map.removeAttribute('id');
  map.removeAttribute('aria-labelledby');
  map.removeAttribute('data-active');
  map.classList.remove('panel', 'panel--story', 'is-settled', 'has-arrived');
  map.classList.add('story--map');
  for (const element of map.querySelectorAll('[id]')) element.removeAttribute('id');
  for (const element of map.querySelectorAll('[aria-describedby]')) element.removeAttribute('aria-describedby');
  for (const element of map.querySelectorAll('[tabindex], a, button')) element.setAttribute('tabindex', '-1');
  for (const element of map.querySelectorAll('.is-active, .is-flying')) element.classList.remove('is-active', 'is-flying');
  for (const element of map.querySelectorAll('.story__stage, .story__murals, .story__splatter, [data-parallax]')) {
    element.style.removeProperty('transform');
    element.style.removeProperty('opacity');
    element.style.removeProperty('translate');
  }
  const hint = map.querySelector('.story__hint');
  if (hint) {
    const words = [...hint.childNodes].find(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
    if (words) words.textContent = next;
  }
  for (const age of read) map.querySelector(`.period--${age} .period__badge`)?.insertAdjacentHTML('beforeend', CHECK);
  return map;
}

export function startPeriodMap(pin, { lenis } = {}) {
  const source = document.querySelector('#story');
  if (!pin || !source) return {};
  const closing = pin.querySelector('.scene--closing');
  const layer = pin.querySelector('.period-map');
  const camera = layer.querySelector('.period-map__camera');
  const map = copyStory(source);
  camera.append(map);
  const first = map.querySelector('.period--1');
  const second = map.querySelector('.period--2');
  // Card I's painting, turning up from the back of the shrinking closing.
  const turnCard = document.createElement('div');
  turnCard.className = 'period-map__turn';
  const painting = first.querySelector('.period__thumb img').cloneNode();
  painting.alt = '';
  turnCard.append(painting);
  layer.append(turnCard);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const dive = createDive(layer, {
    story: map,
    period: second,
    // Card II (122:20, 120px at 865, 501) as it stands here, stepped forward: lifted 4px and
    // 1.04× about its centre (.period.is-active in styles.css).
    from: { x: 862.6, y: 494.6, size: 124.8 },
    land: { x: 353, y: 671, size: 735 },   // chapter painting (227:470), as a full square
    read: READ,
    reducedMotion: reduced.matches,
  });
  let shown = false;

  function clear() {
    closing.style.removeProperty('transform');
    closing.style.removeProperty('transform-origin');
    closing.style.removeProperty('clip-path');
    closing.style.removeProperty('opacity');
    closing.style.removeProperty('visibility');
    closing.style.removeProperty('--fit');
    layer.style.opacity = '';
    turnCard.style.removeProperty('transform');
    turnCard.style.removeProperty('visibility');
    first.classList.remove('is-turned');
  }

  // Runs on both Lenis's and the window's scroll; the second call in a frame finds the pin where
  // the first left it and stops there.
  // Nothing is written while what it follows stays where it was (the dive's and the read's shares,
  // the closing's progress), so the map, which is large, is not restyled on every frame of the page.
  let lastTop = null, lastDive = null, lastRead = null, lastProgress = null;

  function render() {
    const pinTop = pin.getBoundingClientRect().top;
    if (pinTop === lastTop) return;
    lastTop = pinTop;
    const view = window.innerHeight;
    const width = pin.clientWidth;
    // Set inline by lib/journey.js, so reading it costs no style recalculation.
    const scale = parseFloat(document.documentElement.style.getPropertyValue('--stage-scale')) || 1;
    const height = closing.offsetHeight;
    const onward = (REST + DIVE) * view + READ * scale;
    const length = Math.max(1, pin.offsetHeight - height - onward);
    // Scrolled since the closing's bottom reached the bottom of the view (it sticks there).
    const held = -pinTop - (height - view);
    // 0 then, 1 once the closing has come down onto card I.
    const progress = clamp(held / length);
    const past = held - length - REST * view;
    const diveAt = clamp(past / (DIVE * view));
    const readAt = clamp((past - DIVE * view) / (READ * scale));
    if (diveAt !== lastDive || readAt !== lastRead) {
      lastDive = diveAt;
      lastRead = readAt;
      dive.render(diveAt, readAt, { width, height: view, scale });
    }
    if (progress === lastProgress) return;
    lastProgress = progress;

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

    const run = clamp((progress - SHRINK_FROM) / (SHRINK_TO - SHRINK_FROM));
    const shrink = easeInOutCubic(run);
    if (run > .1 && !shown) { shown = true; map.classList.add('has-arrived'); }

    if (reduced.matches) {
      closing.style.opacity = (1 - smoothstep(SHRINK_FROM, SHRINK_TO, progress)).toFixed(3);
      closing.style.visibility = progress >= SHRINK_TO ? 'hidden' : '';
      layer.style.opacity = smoothstep(SHRINK_FROM, SHRINK_TO, progress).toFixed(3);
      first.classList.add('is-turned');
      return;
    }

    // The map stands ready behind.
    layer.style.opacity = '1';

    // Card I on screen (the story stage is centred in the view at the shared scale).
    const cardSize = CARD.size * scale;
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
    const size = zoom ** shrink;
    // Where the crop's centre is now, in the closing's own box: the turn's axis.
    const pivot = { x: origin.x + size * (crop.x - origin.x), y: origin.y + size * (crop.y - origin.y) };

    // The turn, 0 → 180° over the end of the zoom, so it lands as the card does: the closing takes
    // the first half, the card the second.
    const turn = clamp((shrink - TURN) / (1 - TURN));
    const angle = turn * 180;
    const lift = 1 + Math.sin(turn * Math.PI) * LIFT;
    closing.style.transformOrigin = '0 0';
    closing.style.transform = `translate(${pivot.x.toFixed(2)}px, ${pivot.y.toFixed(2)}px) perspective(${PERSPECTIVE}px) `
      + `rotateY(${Math.min(angle, 90).toFixed(2)}deg) scale(${lift.toFixed(4)}) translate(${(origin.x - pivot.x).toFixed(2)}px, ${(origin.y - pivot.y).toFixed(2)}px) `
      + `scale(${size.toFixed(5)}) translate(${(-origin.x).toFixed(2)}px, ${(-origin.y).toFixed(2)}px)`;
    closing.style.opacity = angle >= 90 ? '0' : '';
    // Turned away, it must not catch the pointer over the chapter beneath.
    closing.style.visibility = angle >= 90 ? 'hidden' : '';
    const cut = easeInOutCubic(clamp(shrink / CUT));
    const inset = {
      top: (crop.y - crop.side / 2) * cut,
      right: (width - crop.x - crop.side / 2) * cut,
      bottom: (height - crop.y - crop.side / 2) * cut,
      left: (crop.x - crop.side / 2) * cut,
    };
    closing.style.setProperty('--fit', (1 - (1 - FIT) * cut).toFixed(4));
    closing.style.clipPath = `inset(${inset.top.toFixed(1)}px ${inset.right.toFixed(1)}px ${inset.bottom.toFixed(1)}px ${inset.left.toFixed(1)}px)`;

    // Card I's painting on the same path, from the back; card I itself shows once it has landed.
    const landed = run >= 1;
    first.classList.toggle('is-turned', landed);
    turnCard.style.visibility = angle > 90 && !landed ? 'visible' : '';
    turnCard.style.width = turnCard.style.height = `${cardSize.toFixed(2)}px`;
    turnCard.style.transform = `translate(${(pivot.x - cardSize / 2).toFixed(2)}px, ${(pivot.y + top - cardSize / 2).toFixed(2)}px) `
      + `perspective(${PERSPECTIVE}px) rotateY(${(angle - 180).toFixed(2)}deg) scale(${(lift * size / zoom).toFixed(4)})`;

    // The map's camera pulls back about card I as the closing lands on it.
    // Written on the camera itself, not as custom properties on the layer, which every element of
    // the map would inherit and have its style recalculated for, on every frame.
    camera.style.transformOrigin = `${card.x.toFixed(1)}px ${card.y.toFixed(1)}px`;
    camera.style.scale = ((1 / zoom) ** (CAMERA * (1 - shrink))).toFixed(4);
  }

  // Where the chapter has just opened (the start of its read), as for #foundations.
  function goToChapter(immediate = false) {
    const view = window.innerHeight;
    const scale = parseFloat(document.documentElement.style.getPropertyValue('--stage-scale')) || 1;
    const top = pin.getBoundingClientRect().top + window.scrollY;
    // Rounded up: the page scrolls by whole (or half) pixels, and a hair short is not yet landed.
    const at = Math.ceil(top + pin.offsetHeight - view - READ * scale);
    if (lenis) lenis.scrollTo(at, { immediate, force: true, duration: 2.8 });
    else window.scrollTo({ top: at, behavior: 'instant' });
  }

  lenis?.on('scroll', render);
  window.addEventListener('scroll', render, { passive: true });
  window.addEventListener('resize', () => { lastTop = lastDive = lastRead = lastProgress = null; render(); });
  if (location.hash === '#flourishing') goToChapter(true);
  render();
  return { goToChapter };
}
