import { whenNear } from './offscreen.js';
import { stageScale } from './iris.js';
import { startBurn } from './burn.js';

/**
 * Period III, part II: Knowledge at work (Figma 397:6265). The closing letter burns from its centre
 * (lib/burn.js) and opens on Ibn al-Nadim at work, the lamp where the fire began, so the first thing
 * seen through the hole is another flame. The room is held for a moment and settles into place
 * (not in Figma), then dims, and the title, the ten chapters and the text come in over it.
 *
 * This section sits under the hall, pinned through the burn, and the hall is dropped just after the
 * hole has filled the view. The room's picture is what the canvas draws, at the same place, so the change
 * from one to the other cannot be seen. The room then moves to where the layout wants it.
 *
 * The chapters stand on one wheel (radius R, STEP degrees apart), and it turns into place as one.
 * Each is placed on its own, so only
 * ten small layers move, not a layer the size of the wheel. It has no ends: the cards go round and
 * round. The scroll turns it once it is in place, and at the foot of the page it keeps taking the
 * scroll and keeps turning. It can also be dragged, moved with the arrow keys, or clicked to bring a
 * chapter to the top, and it always comes to rest on a chapter.
 *
 * The scene follows the scroll, both ways. With reduced motion there is no burn and nothing moves
 * in: the section simply follows the hall, and the wheel steps.
 */

export const BURN = 2400;       // artboard px of the burn (--hall-travel, --burn)
const REVEAL = 2400;            // artboard px from the open room to the finished layout
const HANDOVER = .03;           // share of REVEAL the hall stays up behind the full canvas
export const HALL_HOLD = BURN + REVEAL * HANDOVER;  // artboard px the hall is pinned past its walk (--hall-travel, --burn)
const FRAME = { width: 1440, height: 1261 };
const LETTER = { x: 726.01, y: 472.42 };   // the letter's centre on the hall's stage
const HALL = { width: 1440, height: 964 };
const FLAME = { x: .5017, y: .5176, stageX: 726, stageY: 472 };  // in the picture; on the stage
const ROOM = 1470;              // the picture's least width, in stage px
const CLOSE = 1.07;             // how much nearer the room is as it opens
const R = 1203;                 // the wheel's radius in stage px
const STEP = 22;                // degrees between chapters
const FIRST = 7;                // the chapter on top to begin with
const WHEEL = { x: 720, y: 607 };  // the top of the wheel: the middle of the top card
const SPIN = 118;                // degrees the whole wheel turns in by
const SWEEP = [.4, .8];         // share of REVEAL it turns in over
const ROLL = 2400;              // artboard px of scroll that turn the finished wheel, once round
const ROLL_STEP = ROLL / 10;    // artboard px of scroll to a chapter
const FOLLOW = .14;             // share of the way to the goal per 60 fps frame

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const span = (t, from, to) => clamp((t - from) / (to - from));
const ease = t => t * t * (3 - 2 * t);
const out = t => 1 - (1 - t) ** 3;
// Out, a little past the end, and back.
const back = t => 1 + 2.1 * (t - 1) ** 3 + 1.1 * (t - 1) ** 2;
const mix = (a, b, t) => a + (b - a) * t;

export function startCatalogue(section, hall, { lenis } = {}) {
  if (!section) return;
  const pin = section.querySelector('.catalogue__pin');
  const room = section.querySelector('.catalogue__room');
  const picture = section.querySelector('.catalogue__scene');
  const dim = section.querySelector('.catalogue__dim');
  const stage = section.querySelector('.catalogue__stage');
  const title = section.querySelector('.catalogue__title');
  const intro = [...section.querySelector('.catalogue__intro').children];
  const star = section.querySelector('.catalogue__star');
  const cards = [...section.querySelectorAll('.catalogue__card')];
  const wheel = section.querySelector('.catalogue__wheel');
  const dots = [...section.querySelectorAll('.catalogue__dots li')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const burn = reduced ? null : startBurn(hall?.querySelector('.hall__burn'), picture);
  section.style.setProperty('--catalogue-travel', `${BURN + REVEAL + ROLL}px`);
  section.style.setProperty('--burn', `${HALL_HOLD}px`);
  if (!reduced) section.classList.add('is-armed');

  // The title by the word; it reads as one from aria-label.
  title.setAttribute('aria-label', title.textContent.replace(/(Knowledge)(at)/, '$1 $2'));
  const lines = title.innerHTML.split('<br>');
  title.textContent = '';
  const words = [];
  lines.forEach((line, i) => {
    if (i) title.append(document.createElement('br'));
    line.split(' ').forEach((text, w) => {
      if (w) title.append(' ');
      const word = document.createElement('span');
      word.setAttribute('aria-hidden', 'true');
      word.textContent = text;
      title.append(word);
      words.push(word);
    });
  });

  // Each card's face goes into a layer that can lift, with a band of light masked to its carving.
  for (const card of cards) {
    const face = card.querySelector('button');
    const lift = document.createElement('span');
    lift.className = 'catalogue__lift';
    lift.append(...face.children);
    face.append(lift);
    const plate = lift.querySelector('.catalogue__plaque');
    const sheen = document.createElement('span');
    sheen.className = 'catalogue__sheen';
    sheen.style.cssText = plate.style.cssText;
    sheen.style.maskImage = sheen.style.webkitMaskImage = `url("${plate.getAttribute('src')}")`;
    sheen.append(document.createElement('i'));
    plate.after(sheen);
  }

  let view = {}, angle = 0, goal = 0, user = 0, roll = 0, frame = 0, last = 0, idle = 0, reveal = reduced ? 1 : 0, active = 0;
  const wrap = n => ((n % cards.length) + cards.length) % cards.length;
  // The cards go round a whole number of steps, so the wheel has no ends.
  const round = cards.length * STEP;
  const around = degrees => ((degrees + round / 2) % round + round) % round - round / 2;

  function fit() {
    const w = document.documentElement.clientWidth, h = window.innerHeight;
    const f = Math.min(w / FRAME.width, h / 820);
    const height = FRAME.height * f;
    const hallFit = Math.min(w / HALL.width, h / HALL.height);
    const top = Math.max(0, (h - height) / 2);
    const width = Math.max(w * 1.02, ROOM * f);
    view = {
      w, h, f, top,
      left: (w - FRAME.width * f) / 2,
      pan: Math.max(0, height - h),
      width, height: width * 2 / 3,
      fire: [w / 2 + (LETTER.x - HALL.width / 2) * hallFit, h / 2 + (LETTER.y - HALL.height / 2) * hallFit],
    };
    room.style.width = `${width}px`;
    room.style.height = `${view.height}px`;
    if (reduced) section.style.setProperty('--catalogue-travel', `${view.pan / stageScale()}px`);
  }

  // The room's place: on the fire as it opens, in the layout's place once settled (t 1).
  function placeRoom(t) {
    const s = mix(CLOSE, 1, t);
    const x = mix(view.fire[0], view.left + FLAME.stageX * view.f, t) - FLAME.x * view.width * s - drift.x * t;
    const y = mix(view.fire[1], view.top + FLAME.stageY * view.f, t) - FLAME.y * view.height * s - drift.y * t;
    room.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) scale(${s.toFixed(4)})`;
    return [x, y, view.width * s, view.height * s];
  }

  function placeCards() {
    // They come in as one: the whole wheel turns in, slowing, and settles on the chapter on top.
    const spin = reduced ? 0 : SPIN * (1 - back(span(reveal, SWEEP[0], SWEEP[1])));
    const fade = reduced ? 1 : ease(span(reveal, SWEEP[0], SWEEP[0] + .1));
    const at = wrap((angle - spin) / STEP + FIRST - 1);
    dots.forEach((dot, i) => {
      const off = Math.abs(at - i);
      dot.style.opacity = (.3 + .7 * ease(1 - clamp(Math.min(off, cards.length - off)))).toFixed(3);
    });
    cards.forEach((card, i) => {
      const n = i + 1;
      const lean = clamp(goal - angle, -4, 4) * .35;
      const theta = around((n - FIRST) * STEP - angle + spin) + lean * clamp(Math.abs(around((n - FIRST) * STEP - angle)) / (2 * STEP));
      const shown = Math.abs(theta) < 74 && fade > 0;
      card.style.visibility = shown ? '' : 'hidden';
      if (!shown) return;
      const a = theta * Math.PI / 180;
      const near = clamp(1 - Math.abs(theta) / STEP);
      const x = R * Math.sin(a), y = R - R * Math.cos(a) - near * 10;
      card.style.opacity = (fade * (.8 + .2 * near)).toFixed(3);
      card.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) rotate(${theta.toFixed(3)}deg) scale(${(1 + near * .04).toFixed(4)})`;
    });
  }

  function placeStage(q, along = ease(span(q, .74, .96))) {
    const pan = view.pan * along;
    stage.style.transform = `translate3d(${view.left.toFixed(2)}px, ${(view.top - pan).toFixed(2)}px, 0) scale(${view.f.toFixed(5)})`;
    const gap = .14 / Math.max(1, words.length - 1);
    words.forEach((word, i) => {
      const t = out(span(q, .26 + i * gap, .5 + i * gap));
      word.style.opacity = ease(t).toFixed(3);
      word.style.transform = `translate3d(0, ${((1 - t) * 34).toFixed(2)}px, 0)`;
    });
    intro.forEach((part, i) => {
      const t = out(span(q, .66 + i * .04, .86 + i * .04));
      part.style.opacity = ease(t).toFixed(3);
      const turn = part === star ? ` rotate(${((1 - t) * -120).toFixed(1)}deg) scale(${(.5 + .5 * t).toFixed(3)})` : '';
      part.style.transform = `translate3d(0, ${((1 - t) * (part === star ? 0 : 20)).toFixed(2)}px, 0)${turn}`;
    });
  }

  // The room leans away from a fine pointer, a few px, as if the camera were held by hand.
  const drift = { x: 0, y: 0 }, aim = { x: 0, y: 0 };
  let settle = 0, driftFrame = 0;
  function driftTick() {
    driftFrame = 0;
    drift.x += (aim.x - drift.x) * .06;
    drift.y += (aim.y - drift.y) * .06;
    if (settle > 0) placeRoom(settle);
    if (Math.abs(aim.x - drift.x) + Math.abs(aim.y - drift.y) > .05) driftFrame = requestAnimationFrame(driftTick);
  }
  if (!reduced && matchMedia('(hover: hover) and (pointer: fine)').matches) {
    pin.addEventListener('pointermove', event => {
      aim.x = (event.clientX / view.w - .5) * 14;
      aim.y = (event.clientY / view.h - .5) * 8;
      driftFrame ||= requestAnimationFrame(driftTick);
    }, { passive: true });
  }

  let lastTop = null;
  function render() {
    if (!section.getClientRects().length) return;
    const top = section.getBoundingClientRect().top;
    if (top === lastTop) return;
    lastTop = top;
    if (reduced) { placeStage(1, clamp(-top / Math.max(1, view.pan))); return; }
    const scale = stageScale();
    const past = -top;
    const p = clamp(past / (BURN * scale));
    const q = clamp((past - BURN * scale) / (REVEAL * scale));
    reveal = q;
    // The hall comes back behind the canvas while that still fills the view, so whatever it costs
    // to bring back cannot be seen.
    hall?.classList.toggle('is-burnt', q >= HANDOVER);
    settle = ease(span(q, 0, .4));
    const rect = placeRoom(settle);
    if (burn) burn.set(p, q < HANDOVER, view.fire, rect, view.f);
    else if (hall) hall.querySelector('.hall__pin').style.opacity = p > 0 && p < 1 ? (1 - p).toFixed(3) : '';
    dim.style.opacity = ease(span(q, .14, .5)).toFixed(3);
    placeStage(q);
    placeCards();
    section.classList.toggle('is-set', q >= .62);
    // Past the reveal the scroll turns the wheel, for as long as the section lasts.
    const turned = (past - (BURN + REVEAL) * scale) / (ROLL_STEP * scale) * STEP;
    const next = Math.max(0, turned);
    if (next !== roll) { roll = next; move(); if (roll > 0) restSoon(); }
    section.classList.toggle('is-lit', q >= HANDOVER);
  }

  // The wheel. Its angle is what the reader has turned it by (user) plus what the scroll has (roll).
  function tick(now) {
    frame = 0;
    const frames = last ? Math.min(now - last, 100) / (1000 / 60) : 1;
    last = now;
    angle += (goal - angle) * (1 - (1 - FOLLOW) ** frames);
    const settled = Math.abs(goal - angle) < .01;
    if (settled) { angle = goal; last = 0; }
    placeCards();
    if (!settled) frame = requestAnimationFrame(tick);
  }
  function move() {
    goal = user + roll;
    const top = wrap(Math.round(goal / STEP) + FIRST - 1) + 1;
    if (top !== active) {
      active = top;
      cards.forEach((card, i) => card.classList.toggle('is-active', i + 1 === active));
    }
    if (reduced) { angle = goal; placeCards(); return; }
    frame ||= requestAnimationFrame(tick);
  }
  // Comes to rest on a chapter once nothing is turning it.
  function rest() {
    const near = Math.round((user + roll) / STEP) * STEP;
    user += near - (user + roll);
    move();
  }
  function restSoon() {
    clearTimeout(idle);
    idle = setTimeout(rest, 170);
  }
  // The shortest way round to a chapter.
  function go(chapter) {
    const now = wrap(Math.round((user + roll) / STEP) + FIRST - 1) + 1;
    let by = wrap(chapter - now);
    if (by > cards.length / 2) by -= cards.length;
    user += by * STEP + Math.round((user + roll) / STEP) * STEP - (user + roll);
    move();
  }

  let drag = null, moved = false;
  wheel.addEventListener('pointerdown', event => {
    if (event.button) return;
    drag = { x: event.clientX, user, time: event.timeStamp, speed: 0, was: event.clientX };
    moved = false;
    wheel.setPointerCapture(event.pointerId);
  });
  wheel.addEventListener('pointermove', event => {
    if (!drag) return;
    const dx = event.clientX - drag.x;
    if (!moved && Math.abs(dx) < 6) return;
    if (!moved) { moved = true; section.classList.add('is-dragging'); }
    user = drag.user - dx / (R * view.f) * 180 / Math.PI;
    const dt = Math.max(1, event.timeStamp - drag.time);
    drag.speed = (event.clientX - drag.was) / dt;
    drag.time = event.timeStamp;
    drag.was = event.clientX;
    move();
  });
  function drop() {
    if (!drag) return;
    const speed = drag.speed;
    drag = null;
    section.classList.remove('is-dragging');
    if (!moved) return;
    // A flick carries on by one chapter at most, to the nearest chapter.
    user += clamp(-speed * 170 / (R * view.f) * 180 / Math.PI, -STEP, STEP);
    rest();
  }
  wheel.addEventListener('pointerup', drop);
  wheel.addEventListener('pointercancel', drop);
  cards.forEach((card, i) => {
    const face = card.querySelector('button');
    face.addEventListener('click', () => { if (!moved) go(i + 1); });
    face.addEventListener('focus', () => go(i + 1));
  });
  wheel.addEventListener('keydown', event => {
    const by = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (!by) return;
    event.preventDefault();
    go(wrap(active - 1 + by) + 1);
    cards[active - 1].querySelector('button').focus({ preventScroll: true });
  });
  // At the foot of the page there is no scroll left, so the wheel takes it, and goes round for as
  // long as the reader goes on. Scrolling up is left to the page.
  addEventListener('wheel', event => {
    if (reduced || event.deltaY <= 0) return;
    if (window.scrollY < document.documentElement.scrollHeight - window.innerHeight - 1) return;
    user += event.deltaY / (ROLL_STEP * stageScale()) * STEP;
    move();
    restSoon();
  }, { passive: true });

  // Ready before it comes: the shader and the picture it burns through, and the cards.
  whenNear(hall ?? section, () => {
    burn?.prepare();
    for (const image of section.querySelectorAll('img')) { image.loading = 'eager'; image.decode?.().catch(() => {}); }
  });

  function reset() { lastTop = null; fit(); placeRoom(reduced ? 1 : ease(span(reveal, 0, .4))); placeStage(reduced ? 1 : reveal); placeCards(); render(); }

  if (location.hash === `#${section.id}`) addEventListener('load', () => requestAnimationFrame(() => {
    const at = Math.ceil(section.getBoundingClientRect().top + window.scrollY + (reduced ? 0 : (BURN + REVEAL) * stageScale()));
    lenis?.resize();
    if (lenis) lenis.scrollTo(at, { immediate: true, force: true });
    else window.scrollTo({ top: at, behavior: 'instant' });
  }), { once: true });

  move();
  lenis?.on('scroll', render);
  addEventListener('scroll', render, { passive: true });
  addEventListener('resize', reset);
  reset();
}
