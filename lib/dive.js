import { createHeadingReveal } from './heading-reveal.js';
import { COMPACT } from './periods.js';

/**
 * Dive into a period: a story card → its chapter. Period I dives from the story into
 * Foundations (Figma 126:13542, lib/journey.js); Period II from card II of the map after the
 * Period I closing into The Flourishing (226:451, lib/period-map.js); Period III from card III of
 * the map after Period II into Enduring Brilliance (314:3692, lib/brilliance.js). Same motion for all.
 *
 * Driven by `dive` (0–1, scrolling on after the story has settled) and `read` (0–1, the
 * chapter's height past the 1024px viewport):
 * 1. the camera pushes into the story (the stage zooms about a vanishing point and fades)
 *    while the period card flies toward the camera far faster, so the two close in; the
 *    chapter's clip hugs the card, so only the painting is in view,
 * 2. the card grows at a constant zoom rate about that same point and lands exactly on the
 *    chapter's painting (`land`, as a full square) — the same image file, so no crossfade,
 * 3. as the card settles (≈89% of its final size) the heading rises in and the chapter's
 *    background starts to open around the painting: a feathered veil whose edges drift
 *    apart (top first, sides a beat later) to the whole screen,
 * 4. the chapter's own image then takes over from the card; `read` scrolls the rest into view.
 * Everything moves by transform, opacity or a rectangular clip.
 *
 * Desktop works in artboard px (`from`, `land`). With `compact` (Period I only), portrait screens
 * (COMPACT) have no artboard: the story card sits in the period slider and the chapter is laid
 * out in screen px, so the start and landing boxes are measured from the layout (the story and
 * the chapter both fill the pinned viewport), the same zoom runs in screen px, and the chapter
 * fits one screen, so there is nothing left to read. Period III's chapter is scaled to the page's
 * width rather than the shared stage, so its `land` and `read` are functions of the viewport:
 * `land` still answers in the story's artboard px, `read` in screen px, and `card` gives the flying
 * card's own box width.
 */

const STAGE = { width: 1440, height: 1024 };
// The camera follows this share of the card's zoom (for Period I ending at ZOOM ** .35 ≈ 2.3×).
const CAMERA = .35;
// The story has faded out by here; from then on the veil (story colour) can stand in for
// the hard clip.
const STORY_GONE = .4;
// Halfway through the dive (the card ≈89% of its final size) the heading and the window start to open.
const OPEN_AT = .5;
// The heading's staggered reveal (lib/heading-reveal.js) runs from OPEN_AT to here.
const HEADING_DONE = .86;
// Soft edge of the opening window, artboard px (matches --feather in styles.css).
const FEATHER = 180;
// The side edges start opening this share of the way after the top edge.
const SIDE_DELAY = .14;
// The card flies until here; the rest of the dive opens the clip around it.
const LAND_AT = .65;
// Portrait screens: the veil's soft edge in screen px (matches --feather there).
const FEATHER_COMPACT = 96;

// Layout position of an element within an ancestor on its offsetParent chain (transforms ignored).
function offsetWithin(element, ancestor) {
  let x = 0;
  let y = 0;
  for (let node = element; node && node !== ancestor; node = node.offsetParent) {
    x += node.offsetLeft;
    y += node.offsetTop;
  }
  return { x, y };
}

// A pure zoom about `vanish` takes the `from` box to the `land` box; `px` is the flying card's
// own box width, which is scaled to the card's size.
function zoomBetween(from, land, px) {
  const zoom = land.size / from.size;
  return {
    from,
    land,
    px,
    zoom,
    vanish: { x: (land.x - zoom * from.x) / (1 - zoom), y: (land.y - zoom * from.y) / (1 - zoom) },
  };
}

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const smoothstep = (edge0, edge1, x) => {
  const t = clamp((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
};
const easeInOutCubic = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const lerp = (a, b, t) => a + (b - a) * t;

/**
 * root: the pinned viewport holding the story and the chapter (it takes .is-diving / .is-landed).
 * story: the story (or its copy) the dive leaves; period: its card the painting flies from.
 * from: that card on the story artboard; land: the chapter's painting as a full square;
 * read: the chapter's height past the 1024px viewport (all artboard px).
 */
export function createDive(root, { story, period, from, land, read: READ, card: cardBox = land.size, reducedMotion, compact: portrait = false }) {
  // The card's corner travels on a ray from the vanishing point, so a pure zoom about it takes
  // the card from `from` to `land`. The camera zooms about it too.
  const DESKTOP = typeof land === 'function' ? null : zoomBetween(from, land, cardBox);
  const compact = portrait ? matchMedia(COMPACT) : null;
  const thumb = period.querySelector('.period__thumb');
  const chapter = root.querySelector('.chapter');
  const chapterImage = chapter?.querySelector('.chapter__image');
  // Portrait screens: the measured boxes, cleared on resize (measure()).
  let measured = null;
  const stage = story.querySelector('.story__stage');
  const corners = [story.querySelector('.story__murals'), story.querySelector('.story__splatter')];
  const reveal = root.querySelector('.chapter__reveal');
  const scroller = root.querySelector('.chapter__scroll');
  const heading = createHeadingReveal(root.querySelector('.chapter__heading'));
  const card = root.querySelector('.dive__card');
  const shadow = card.querySelector('.dive__shadow');
  const veil = root.querySelector('.chapter__veil');
  const [veilTop, veilRight, veilBottom, veilLeft] = ['top', 'right', 'bottom', 'left']
    .map(side => veil.querySelector(`.chapter__veil-side--${side}`));
  let diving = false;

  // Back on the story: drop every inline value so the story's own styles apply again.
  function reset() {
    stage.style.transform = '';
    stage.style.opacity = '';
    for (const element of corners) element.style.opacity = '';
    reveal.style.clipPath = '';
    reveal.style.opacity = '';
    veil.style.visibility = '';
  }

  // The story card in the slider and the chapter's painting (its square starts at the box's top
  // left), in screen px: the story panel and the chapter both fill the viewport when settled.
  function geometry(viewport) {
    if (!compact?.matches) return DESKTOP ?? zoomBetween(from, land(viewport), cardBox);
    measured ||= zoomBetween(
      { ...offsetWithin(thumb, story), size: thumb.offsetWidth },
      { ...offsetWithin(chapterImage, chapter), size: chapterImage.offsetWidth },
      card.offsetWidth || land.size,
    );
    return measured;
  }

  /** viewport: { width, height, scale } — the pinned viewport and the shared artboard scale. */
  function render(dive, read, viewport) {
    const { width, height, scale } = viewport;
    if ((dive > 0) !== diving) {
      diving = dive > 0;
      root.classList.toggle('is-diving', diving);
      period.classList.toggle('is-flying', diving);
      if (!diving) reset();
    }
    // The card stays on top until the chapter has fully opened, so the veil never shades the
    // painting. Reduced motion has no flying card, so the chapter's own image shows throughout.
    root.classList.toggle('is-landed', dive >= 1 || (diving && reducedMotion));
    const small = Boolean(compact?.matches);
    // Portrait screens fit the chapter in one viewport, so there is nothing left to read.
    const reading = typeof READ === 'function' ? READ(viewport) : READ * scale;
    scroller.style.transform = small ? '' : `translate3d(0, ${(-reading * read).toFixed(2)}px, 0)`;
    if (!diving) return;
    const { from: FROM, zoom: ZOOM, vanish: VANISH, px: CARD_PX } = geometry(viewport);

    if (reducedMotion) {
      reveal.style.opacity = smoothstep(.15, .85, dive).toFixed(3);
      return;
    }

    // Card: constant zoom rate (exponential growth) about VANISH, eased in and out.
    const u = easeInOutCubic(clamp(dive / LAND_AT));
    const grow = ZOOM ** u;
    const size = FROM.size * grow;
    const x = VANISH.x + (FROM.x - VANISH.x) * grow;
    const y = VANISH.y + (FROM.y - VANISH.y) * grow;
    card.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) scale(${(size / CARD_PX).toFixed(5)})`;
    shadow.style.opacity = (1 - smoothstep(.1, .5, dive)).toFixed(3);

    // Camera: the story zooms about the same point, more slowly, and fades as it passes.
    // (The stage scales about its centre, so the zoom about VANISH becomes a translate + scale.)
    const zoom = grow ** CAMERA;
    if (small) {
      // The compact stage fills the panel with its origin at the top left (screen px).
      stage.style.transform = `translate(${(VANISH.x * (1 - zoom)).toFixed(2)}px, ${(VANISH.y * (1 - zoom)).toFixed(2)}px) scale(${zoom.toFixed(4)})`;
    } else {
      const tx = (1 - zoom) * (VANISH.x - STAGE.width / 2);
      const ty = (1 - zoom) * (VANISH.y - STAGE.height / 2);
      stage.style.transform = `translate(-50%, -50%) scale(${scale}) translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px) scale(${zoom.toFixed(4)})`;
    }
    const storyLeft = 1 - smoothstep(.04, STORY_GONE, dive);
    // (The story is fully in by now: the journey has set its opacity to 1, the map has none.)
    stage.style.opacity = storyLeft.toFixed(3);
    for (const element of corners) element.style.opacity = storyLeft.toFixed(3);

    // The card's box on screen, 1px inside its edges so nothing beside it peeks out.
    const unit = small ? 1 : scale;
    const originX = small ? 0 : width / 2 - STAGE.width / 2 * scale;
    const originY = small ? 0 : height / 2 - STAGE.height / 2 * scale;
    const box = {
      top: originY + y * unit + 1,
      right: originX + (x + size) * unit - 1,
      bottom: originY + (y + size) * unit - 1,
      left: originX + x * unit + 1,
    };

    if (dive < STORY_GONE) {
      // While the story is still visible: a hard clip hugs the card, so only the painting shows.
      const px = value => `${Math.max(0, value).toFixed(1)}px`;
      reveal.style.clipPath = `inset(${px(box.top)} ${px(width - box.right)} ${px(height - box.bottom)} ${px(box.left)})`;
      veil.style.visibility = '';
    } else {
      // The story has faded, so the veil colour matches what is behind it. Its opaque edges
      // hug the card while it flies, then drift out past the screen as it settles. Each
      // panel is clear at its inner edge and opaque `feather` px further out.
      reveal.style.clipPath = 'none';
      const t = clamp((dive - OPEN_AT) / (1 - OPEN_AT));
      const lead = easeInOutCubic(t);
      const follow = easeInOutCubic(clamp((t - SIDE_DELAY) / (1 - SIDE_DELAY)));
      const feather = small ? FEATHER_COMPACT : FEATHER * scale;
      const top = lerp(box.top + feather, -1, lead);
      const bottom = lerp(box.bottom - feather, height + 1, follow);
      const left = lerp(box.left + feather, -1, follow);
      const right = lerp(box.right - feather, width + 1, follow);
      veil.style.visibility = t >= 1 ? 'hidden' : 'visible';
      veilTop.style.transform = `translate3d(0, ${(top - height - feather).toFixed(1)}px, 0)`;
      veilBottom.style.transform = `translate3d(0, ${bottom.toFixed(1)}px, 0)`;
      veilLeft.style.transform = `translate3d(${(left - width - feather).toFixed(1)}px, 0, 0)`;
      veilRight.style.transform = `translate3d(${right.toFixed(1)}px, 0, 0)`;
    }

    // Heading: meta row, then the title letter by letter, then the intro word by word.
    heading.render(clamp((dive - OPEN_AT) / (HEADING_DONE - OPEN_AT)));
  }

  return {
    render,
    /** The layout changed (resize): measure the portrait boxes again on the next frame. */
    measure() { measured = null; },
  };
}
