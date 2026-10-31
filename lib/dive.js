import { createHeadingReveal } from './heading-reveal.js';

/**
 * Dive into period I: story → Foundations chapter (Figma 126:13542).
 *
 * Driven by `dive` (0–1, scrolling on after the story has settled) and `read` (0–1, the
 * chapter's last 235 artboard px):
 * 1. the camera pushes into the story (the stage zooms about a vanishing point and fades)
 *    while the period I card flies toward the camera far faster, so the two close in; the
 *    chapter's clip hugs the card, so only the painting is in view,
 * 2. the card grows at a constant zoom rate about that same point and lands exactly on the
 *    chapter's painting (1254px at 93, 577) — the same image file, so no crossfade,
 * 3. as the card settles (≈89% of its final size) the heading rises in and the chapter's
 *    background starts to open around the painting: a feathered veil whose edges drift
 *    apart (top first, sides a beat later) to the whole screen,
 * 4. the chapter's own image then takes over from the card; `read` scrolls the rest into view.
 * Everything moves by transform, opacity or a rectangular clip.
 */

const STAGE = { width: 1440, height: 1024 };
const CARD = { x: 573, y: 280, size: 120 };  // story period I thumbnail (122:22)
const LAND = { x: 93, y: 577, size: 1254 };  // chapter painting (126:14157), as a full square
const READ = 235;                            // chapter height past the 1024px viewport
const ZOOM = LAND.size / CARD.size;
// The card's corner travels on a ray from this point, so a pure zoom about it takes the
// card from CARD to LAND. The camera zooms about it too.
const VANISH = {
  x: (LAND.x - ZOOM * CARD.x) / (1 - ZOOM),
  y: (LAND.y - ZOOM * CARD.y) / (1 - ZOOM),
};
// The camera follows this share of the card's zoom (ending at ZOOM ** .35 ≈ 2.3×).
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

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const smoothstep = (edge0, edge1, x) => {
  const t = clamp((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
};
const easeInOutCubic = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const lerp = (a, b, t) => a + (b - a) * t;

export function createDive(journey, { reducedMotion }) {
  const story = journey.querySelector('.story');
  const stage = story.querySelector('.story__stage');
  const corners = [story.querySelector('.story__murals'), story.querySelector('.story__splatter')];
  const reveal = journey.querySelector('.chapter__reveal');
  const scroller = journey.querySelector('.chapter__scroll');
  const heading = createHeadingReveal(journey.querySelector('.chapter__heading'));
  const card = journey.querySelector('.dive__card');
  const shadow = card.querySelector('.dive__shadow');
  const veil = journey.querySelector('.chapter__veil');
  const [veilTop, veilRight, veilBottom, veilLeft] = ['top', 'right', 'bottom', 'left']
    .map(side => veil.querySelector(`.chapter__veil-side--${side}`));
  let diving = false;

  // Back on the story: drop every inline value so the story's own styles apply again.
  function reset() {
    stage.style.transform = '';
    for (const element of corners) element.style.opacity = '';
    reveal.style.clipPath = '';
    reveal.style.opacity = '';
    veil.style.visibility = '';
  }

  /** viewport: { width, height, scale } — the pinned viewport and the shared artboard scale. */
  function render(dive, read, { width, height, scale }) {
    if ((dive > 0) !== diving) {
      diving = dive > 0;
      journey.classList.toggle('is-diving', diving);
      if (!diving) reset();
    }
    // The card stays on top until the chapter has fully opened, so the veil never shades the
    // painting. Reduced motion has no flying card, so the chapter's own image shows throughout.
    journey.classList.toggle('is-landed', dive >= 1 || (diving && reducedMotion));
    scroller.style.transform = `translate3d(0, ${(-READ * scale * read).toFixed(2)}px, 0)`;
    if (!diving) return;

    if (reducedMotion) {
      reveal.style.opacity = smoothstep(.15, .85, dive).toFixed(3);
      return;
    }

    // Card: constant zoom rate (exponential growth) about VANISH, eased in and out.
    const u = easeInOutCubic(clamp(dive / LAND_AT));
    const grow = ZOOM ** u;
    const size = CARD.size * grow;
    const x = VANISH.x + (CARD.x - VANISH.x) * grow;
    const y = VANISH.y + (CARD.y - VANISH.y) * grow;
    card.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) scale(${(size / LAND.size).toFixed(5)})`;
    shadow.style.opacity = (1 - smoothstep(.1, .5, dive)).toFixed(3);

    // Camera: the story zooms about the same point, more slowly, and fades as it passes.
    // (The stage scales about its centre, so the zoom about VANISH becomes a translate + scale.)
    const zoom = grow ** CAMERA;
    const tx = (1 - zoom) * (VANISH.x - STAGE.width / 2);
    const ty = (1 - zoom) * (VANISH.y - STAGE.height / 2);
    stage.style.transform = `translate(-50%, -50%) scale(${scale}) translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px) scale(${zoom.toFixed(4)})`;
    const storyLeft = 1 - smoothstep(.04, STORY_GONE, dive);
    stage.style.opacity = (Number(stage.style.opacity || 1) * storyLeft).toFixed(3);
    for (const element of corners) element.style.opacity = storyLeft.toFixed(3);

    // The card's box on screen, 1px inside its edges so nothing beside it peeks out.
    const originX = width / 2 - STAGE.width / 2 * scale;
    const originY = height / 2 - STAGE.height / 2 * scale;
    const box = {
      top: originY + y * scale + 1,
      right: originX + (x + size) * scale - 1,
      bottom: originY + (y + size) * scale - 1,
      left: originX + x * scale + 1,
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
      const feather = FEATHER * scale;
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

  return { render };
}
