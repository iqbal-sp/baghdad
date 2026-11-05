import { createDive } from './dive.js';
import { stageScale } from './iris.js';
import { whenNear } from './offscreen.js';

/**
 * Period III opens (Figma 314:3692): the rest of Period II's pin (lib/sky.js leaves ONWARD artboard
 * px for this), so the map it ends on is the one the dive leaves.
 *
 * Period I and II open the same way, and so does this, with its own ending:
 * 1. rest (REST): card III stands forward, as what comes next;
 * 2. dive (DIVE, lib/dive.js): the camera pushes in, the card flies to the chapter's painting and
 *    the ground opens around it, the heading rising in; the mural grows from the corner (MURAL_AT);
 * 3. title (TITLE): over the painting, now the chapter's own, the two lines of the great title
 *    sweep in from opposite sides (FROM) and meet where Figma has them, turned by the painting
 *    (difference blend) as they cross it. Not during the dive: the flying card is above them;
 * 4. read (READ, after a beat): the rest of the frame scrolls into view, its paragraph coming in
 *    word by word as it reaches the view;
 * 5. COVER: part I slides up over the last of it (lib/built-to-last.js).
 *
 * Everything but the mural follows the scroll, both ways. With reduced motion the chapter fades in
 * over the map, as it is. The chapter is 1259 artboard px tall at the page's width, whatever the
 * shared stage's scale, so the card's landing and the read are worked out from the viewport.
 */

const REST = 300;
const DIVE = 2048;
const TITLE = 1100;
const BEAT = 140;
const READ = 560;
const COVER = 1024;             // part I's margin over the chapter (styles.css)
export const ONWARD = REST + DIVE + TITLE + BEAT + READ + COVER;

const FRAME = { width: 1440, height: 1259 };
// Card III (122:18, 120px at 417, 661) as it stands on the map, stepped forward: lifted 4px and
// 1.04× about its centre (.period.is-active in styles.css).
const CARD = { x: 414.6, y: 654.6, size: 124.8 };
const PAINTING = { x: 668, y: 487, size: 772 };   // in the frame (314:3699)
const STAGE = { width: 1440, height: 1024 };      // the story, centred in the view
const CARD_BOX = 1254;                            // .dive__card, unscaled
const MURAL_AT = .7;                              // share of the dive
const FROM = [-1480, 1760];                       // frame px each line starts from, off the screen
const LAG = .07;                                  // the second line starts this much of TITLE later
const INTRO_TOP = 1049;                           // the paragraph's top in the frame
const INTRO_AT = .92;                             // it starts once its top is this far down the view
const INTRO_LENGTH = .5;                          // share of the read it comes in over
const WORD = .4;                                  // share of that each word takes

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const span = (t, from, to) => clamp((t - from) / (to - from));
const out = t => 1 - (1 - t) ** 3;

// The mural in the page, so each stem can draw and each leaf and flower bud, as the story's do:
// budding along their stem in order, from where they meet it (the first point of their first path).
async function inlineMural(holder) {
  const image = holder.querySelector('img');
  const response = await fetch(image.getAttribute('src'));
  if (!response.ok) return;
  const svg = new DOMParser().parseFromString(await response.text(), 'image/svg+xml').documentElement;
  if (svg.nodeName !== 'svg') return;
  let delay = 0, started = 0;
  for (const part of svg.firstElementChild.children) {
    if (part.matches('path[stroke]:not([fill])')) {
      part.setAttribute('pathLength', '1');
      part.classList.add('m-stem');
      part.style.setProperty('--s', String(started));
      part.style.setProperty('--t', '1.9');
      delay = started + .15;
      started += .5;
      continue;
    }
    const [x, y] = (part.matches('path') ? part : part.querySelector('path')).getAttribute('d').match(/-?\d+(\.\d+)?/g).map(Number);
    part.classList.add('m-bud');
    part.style.transformOrigin = `${x}px ${y}px`;
    part.style.setProperty('--d', delay.toFixed(2));
    delay += .09;
  }
  image.replaceWith(document.adoptNode(svg));
}

export function startBrilliance(people, { lenis } = {}) {
  const frames = [...document.querySelectorAll('.period-three')];
  function fit() {
    for (const frame of frames) frame.style.setProperty('--period-three-scale', (frame.clientWidth / FRAME.width).toFixed(6));
  }
  fit();
  addEventListener('resize', fit, { passive: true });

  const section = people?.querySelector('#brilliance');
  const layer = section?.closest('.period-map--end');
  const map = layer?.querySelector('.story');
  if (!map) return {};
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const still = reduced.matches;

  // The painting on screen, once landed, in the story's artboard px.
  const land = ({ width, height, scale }) => {
    const unit = width / FRAME.width;
    return {
      x: STAGE.width / 2 + (PAINTING.x * unit - width / 2) / scale,
      y: STAGE.height / 2 + (PAINTING.y * unit - height / 2) / scale,
      size: PAINTING.size * unit / scale,
    };
  };
  const read = ({ width, height }) => Math.max(0, FRAME.height * width / FRAME.width - height);
  const dive = createDive(layer, {
    story: map,
    period: map.querySelector('.period--3'),
    from: CARD,
    land,
    read,
    card: CARD_BOX,
    reducedMotion: still,
  });

  const display = section.querySelector('.brilliance__display');
  const lines = [...display.children].filter(line => line.matches('span'));
  const mural = section.querySelector('.brilliance__mural');
  const intro = section.querySelector('.brilliance__intro');
  const words = [];
  if (!still) {
    const text = intro.textContent.trim().split(/\s+/);
    intro.textContent = '';
    text.forEach((word, index) => {
      if (index) intro.append(' ');
      const box = document.createElement('span');
      box.className = 'chapter__word';
      box.textContent = word;
      intro.append(box);
      words.push(box);
    });
    whenNear(people, () => inlineMural(mural).catch(() => {}));
  }

  function sweep(t) {
    display.style.visibility = t > 0 ? '' : 'hidden';
    lines.forEach((line, i) => {
      const rest = 1 - out(span(t, i * LAG, 1));
      line.style.transform = `translate3d(${(FROM[i] * rest).toFixed(1)}px, 0, 0)`;
    });
  }

  function arrive(t) {
    const gap = (1 - WORD) / Math.max(1, words.length - 1);
    words.forEach((word, i) => {
      const rise = out(span(t, i * gap, i * gap + WORD));
      word.style.opacity = rise.toFixed(3);
      word.style.transform = `translate3d(0, ${((1 - rise) * .7).toFixed(4)}em, 0)`;
    });
  }

  // Runs on both Lenis's and the window's scroll; the second call in a frame finds nothing moved.
  // Each stage is only written when its own share has changed.
  let lastTop = null, lastDive = null, lastRead = null, lastTitle = null, lastIntro = null;
  function reset() { lastTop = lastDive = lastRead = lastTitle = lastIntro = null; render(); }
  function render() {
    if (!people.getClientRects().length) return;
    const box = people.getBoundingClientRect();
    if (box.top === lastTop) return;
    lastTop = box.top;
    const view = window.innerHeight;
    const width = section.clientWidth;
    const scale = stageScale();
    // Scrolled into the last ONWARD px, in artboard px.
    const into = (-box.top - (box.height - view - ONWARD * scale)) / scale;
    const diveAt = span(into, REST, REST + DIVE);
    const titleFrom = REST + DIVE;
    const readFrom = titleFrom + TITLE + BEAT;
    const readAt = span(into, readFrom, readFrom + READ);
    if (diveAt !== lastDive || readAt !== lastRead) {
      lastDive = diveAt;
      lastRead = readAt;
      dive.render(diveAt, readAt, { width, height: view, scale });
      mural.classList.toggle('is-grown', still || diveAt >= MURAL_AT);
    }
    if (still) return;
    const title = span(into, titleFrom, titleFrom + TITLE);
    if (title !== lastTitle) { lastTitle = title; sweep(title); }
    // The paragraph comes in once it reaches the view, wherever that falls in the read.
    const distance = read({ width, height: view });
    const unit = width / FRAME.width;
    const start = distance > 0 ? clamp((INTRO_TOP * unit - INTRO_AT * view) / distance, 0, 1 - INTRO_LENGTH) : 0;
    const coming = distance > 0 ? span(readAt, start, start + INTRO_LENGTH) : title;
    if (coming !== lastIntro) { lastIntro = coming; arrive(coming); }
  }

  // The frame as Figma has it: the title just met, before the read.
  function goToChapter(immediate = false) {
    const scale = stageScale();
    const top = people.getBoundingClientRect().top + window.scrollY + people.offsetHeight - window.innerHeight;
    const at = Math.ceil(top - (ONWARD - REST - DIVE - TITLE) * scale);
    // At start-up Lenis still has the page's height from before the sections below set theirs.
    lenis?.resize();
    if (lenis) lenis.scrollTo(at, { immediate, force: true, duration: 2.8 });
    else window.scrollTo({ top: at, behavior: 'instant' });
  }

  lenis?.on('scroll', render);
  addEventListener('scroll', render, { passive: true });
  addEventListener('resize', reset);
  if (location.hash === '#brilliance') goToChapter(true);
  render();
  return { goToChapter };
}
