/**
 * Period I scenes (Figma 153:14207 and 158:91). Not in Figma, added for the page's motion:
 * - lift-off: scene 1 waits beneath the pinned chapter (styles.css, .scene-cover) and --uncover
 *   follows the chapter's bottom edge as it lifts away, bringing the scene out of its shade;
 * - cover-up: scene 2 slides up over scene 1's empty bottom, ahead of the page, and settles right
 *   under its painting (styles.css rests it there; --overlap 0 → 1);
 * - each [data-reveal] part rises in once, when enough of it shows: past REVEAL_AT of the view and
 *   UNCOVERED px (or a quarter of a tall part) clear of the lifting chapter and of the screen's
 *   bottom edge (styles.css): plain parts fade up, "words" titles rise word by word, "unveil"
 *   paintings open from their bottom edge, and the "rise" year climbs out of its baseline.
 *   [data-reveal-with="title"] parts (marker, story) go with their scene's title, so the text
 *   always reads in order (marker, title, story by their --delay), even though the lifting
 *   chapter uncovers scene 1 from the bottom up. [data-held] parts wait (scene 4 holds each of
 *   its own until its opening over the Round City plan reaches it, lib/capital.js);
 * - the [data-parallax] painting rises from below past the big year while the scene passes, and
 *   sits exactly where Figma has it when the scene is centred in the view;
 * - the [data-parallax="inner"] painting lags inside its frame, like a view through a window.
 *   Its whole drift happens while the frame itself moves: from the moment the scene starts to
 *   scroll (after the chapter has lifted off) until the frame leaves the top of the view.
 * With prefers-reduced-motion only the lift-off layering remains (it is plain scrolling), and
 * every part stays as in Figma.
 */

// Framed painting drift over the scene's whole pass, in artboard px (±half of it): it rises from
// 120px below its Figma place to 120px above, ≈10% faster than the page.
const DRIFT = 240;
// Inner drift of a painting within its frame, in artboard px (±half of it). It rests 20% larger
// (styles.css), which leaves 71px past the top and bottom edges. Over scene 1's frame travel
// (483 + 640 artboard px) this is ≈11% of the scroll speed: clearly felt, not seasick.
const INNER_DRIFT = 128;
// Share of the remaining distance a painting covers per 60 fps frame (eased inertia).
const SMOOTHING = .16;
// Scene 1's empty bottom that scene 2 slides over (artboard px, painting bottom 1123 → 1249), and
// the scroll it takes (share of the view, from scene 1's bottom reaching the bottom of the view).
const OVERLAP = 126;
const OVERLAP_SCROLL = .5;
// A part starts once its top is above this share of the view…
const REVEAL_AT = .88;
// …and at least this much of it (px, or this share of a taller part) shows below the lifting
// chapter and above the bottom of the view.
const UNCOVERED = 80;
const UNCOVERED_SHARE = .25;

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const smoothstep = t => t * t * (3 - 2 * t);

function splitWords(title) {
  const text = title.textContent.trim();
  title.setAttribute('aria-label', text);
  title.textContent = '';
  text.split(/\s+/).forEach((word, index) => {
    if (index) title.append(' ');
    const span = document.createElement('span');
    span.className = 'scene__word';
    span.setAttribute('aria-hidden', 'true');
    span.style.setProperty('--i', index);
    span.textContent = word;
    title.append(span);
  });
  title.classList.add('is-split');
}

export function startScenes(scenes, journey) {
  if (!scenes.length) return;
  const root = document.documentElement;
  const cover = document.querySelector('.scene-cover');

  // Scene 1 sticks beneath the chapter, so its own anchor would land while it is still covered:
  // go one viewport further, to where the chapter has lifted off.
  if (location.hash === '#new-centre') {
    requestAnimationFrame(() => window.scrollTo({ top: cover.offsetTop + window.innerHeight, behavior: 'instant' }));
  }

  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const coveredScene = cover.firstElementChild;
  const followingScene = cover.nextElementSibling;

  const pending = new Set();
  for (const scene of scenes) {
    scene.classList.add('is-armed');
    for (const part of scene.querySelectorAll('[data-reveal]')) {
      pending.add(part);
      part.addEventListener('transitionend', event => {
        if (event.target === part && event.propertyName === 'clip-path') part.classList.add('is-done');
      });
    }
  }

  // Split once Svetze is in, so the words are measured and set in the real font.
  document.fonts.ready.then(() => {
    for (const title of document.querySelectorAll('.scene [data-reveal="words"]')) splitWords(title);
  });

  const layers = [...document.querySelectorAll('.scene [data-parallax]')].map(element => {
    const inner = element.dataset.parallax === 'inner';
    return {
      element,
      inner,
      scene: element.closest('.scene'),
      // The inner painting moves inside its frame; a framed painting moves as a whole.
      target: inner ? element.firstElementChild : element,
      goal: 0,
      shift: null,
    };
  });

  let frame = 0;
  let last = 0;
  let uncover = -1;
  let overlap = -1;
  let held = '';
  function render(time) {
    frame = 0;
    const height = window.innerHeight;
    // The chapter's bottom edge on screen; scene 1 is hidden above it until the chapter lifts off.
    const edge = journey.getBoundingClientRect().bottom;

    // On <html>: the scene beneath and the chapter's cast shadow both read it. Eased in and out,
    // so the scene starts and settles without a jolt even though the chapter moves 1:1 with scroll.
    const next = smoothstep(clamp(1 - edge / height));
    if (next !== uncover) {
      uncover = next;
      root.style.setProperty('--uncover', uncover.toFixed(4));
    }

    // Scene 2 starts held down by scene 1's empty bottom, so it meets scene 1's edge; it slides
    // up over it once that edge reaches the bottom of the view, and settles under the painting.
    const sceneOne = coveredScene.getBoundingClientRect();
    const covered = smoothstep(clamp((height - sceneOne.bottom) / (height * OVERLAP_SCROLL)));
    // In screen px: scene 1's height is the artboard's 1249 at the current stage scale.
    const hold = (OVERLAP * (sceneOne.height / 1249) * (1 - covered)).toFixed(2);
    if (covered !== overlap || hold !== held) {
      overlap = covered;
      held = hold;
      followingScene.style.translate = `0 ${hold}px`;
      followingScene.style.setProperty('--overlap', overlap.toFixed(4));
    }

    const shown = Math.max(0, edge);
    for (const part of pending) {
      if (part.dataset.revealWith || part.closest('[data-held]')) continue;
      const box = part.getBoundingClientRect();
      const visible = Math.min(box.bottom, height) - Math.max(box.top, shown);
      const need = Math.max(Math.min(UNCOVERED, box.height), box.height * UNCOVERED_SHARE);
      if (box.top < height * REVEAL_AT && visible >= need) {
        part.classList.add('is-in');
        pending.delete(part);
      }
    }
    for (const part of pending) {
      if (!part.dataset.revealWith) continue;
      const lead = part.closest('.scene').querySelector(`.scene__${part.dataset.revealWith}`);
      if (lead?.classList.contains('is-in')) {
        part.classList.add('is-in');
        pending.delete(part);
      }
    }

    // Each painting eases toward where the scroll puts it, so it glides and settles after the page
    // stops instead of being locked to every wheel step. Frame-rate independent; a new scroll after
    // a rest counts as one frame, and a long stall (hidden tab) as a few.
    const elapsed = last ? Math.min(time - last, 100) : 1000 / 60;
    const ease = 1 - (1 - SMOOTHING) ** (elapsed / (1000 / 60));
    last = time;
    let moving = false;
    for (const layer of layers) {
      const { element, inner, scene, target } = layer;
      const box = scene.getBoundingClientRect();
      if (box.bottom < 0 || box.top > height) {
        layer.shift = null;
        continue;
      }
      if (inner) {
        // 0 while the scene is at the top or below it (it sticks there under the lifting chapter),
        // 1 once the frame's bottom has left the top of the view; the painting lags behind.
        const travel = element.getBoundingClientRect().bottom - box.top;
        layer.goal = (clamp(-box.top / travel) - .5) * INNER_DRIFT;
      } else {
        // 0 as the scene's top enters, .5 when it is centred, 1 as its bottom leaves; the framed
        // painting rises from below, ahead of the page.
        layer.goal = (.5 - (height - box.top) / (height + box.height)) * DRIFT;
      }
      // Coming into view it starts where it belongs, so it never slides in from a stale place.
      layer.shift = layer.shift === null ? layer.goal : layer.shift + (layer.goal - layer.shift) * ease;
      if (Math.abs(layer.goal - layer.shift) < .05) layer.shift = layer.goal;
      else moving = true;
      target.style.translate = `0 ${layer.shift.toFixed(2)}px`;
    }
    if (moving) schedule();
    else last = 0;
  }
  function schedule() { frame ||= requestAnimationFrame(render); }
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  schedule();
}
