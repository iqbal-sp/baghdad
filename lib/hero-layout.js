/**
 * Compact hero (portrait screens: phones and upright tablets, see COMPACT below and the
 * matching @media block in styles.css).
 *
 * The 1440 × 1024 desktop artboard scaled to fit a portrait screen leaves the arch a sliver
 * at the bottom. In compact mode the artboard is scaled to the gilded frame instead (894
 * artboard px wide, centred), the intro text moves below it in one column, and the arch
 * fades out at its foot. This module works out that scale and where the arch sits, from
 * the screen size and the measured height of the text, stacked under the arch:
 *
 *   --hero-scale        artboard → screen scale for the art
 *   --hero-art-bottom   screen y (px) of the artboard's bottom edge, where the arch fades out
 *
 * The leftover height is shared between the sky above the arch (doves, beams) and the gap
 * under it, so the arch and the text stay a group on any phone.
 */

const COMPACT = '(max-aspect-ratio: 4/5)';
const FRAME = { width: 894, top: 46 };  // gilded frame's outer box in artboard px
const SIDE = 10;                        // screen px between the frame and the screen side
const GAP = 28;                         // between the arch's faded foot and the text
const SKY = .7;                         // share of the leftover height given to the sky

export function startHeroLayout(hero) {
  const query = matchMedia(COMPACT);
  const columns = hero.querySelector('.hero__cols');
  let scale = 0;

  function measure() {
    if (!query.matches) {
      scale = 0;
      hero.style.removeProperty('--hero-scale');
      hero.style.removeProperty('--hero-art-bottom');
      return;
    }
    const width = hero.clientWidth;
    const height = hero.clientHeight;
    // 28px, plus whatever a mobile browser's bottom bar can cover (see .hero__cols).
    const pad = parseFloat(getComputedStyle(columns).bottom) || 0;
    const text = columns.offsetHeight;
    const room = height - pad - text - GAP;
    // Fit the frame to the width, but always keep at least 8% of the height as sky.
    scale = Math.min((width - 2 * SIDE) / FRAME.width, (room - height * .08) / (1024 - FRAME.top));
    const arch = (1024 - FRAME.top) * scale;
    const spare = Math.max(0, room - arch);
    const bottom = room - spare * (1 - SKY);
    hero.style.setProperty('--hero-scale', scale.toFixed(4));
    hero.style.setProperty('--hero-art-bottom', `${Math.round(bottom)}px`);
  }

  measure();
  query.addEventListener('change', measure);
  window.addEventListener('resize', measure);
  // The text's height depends on DM Sans.
  document.fonts?.ready.then(measure);

  return {
    /** The art's scale while compact, else 0 (the shared stage scale applies). */
    get scale() { return scale; },
  };
}
