import { ONWARD } from './brilliance.js';
import { stageScale } from './iris.js';
import { copyStory } from './period-map.js';

/**
 * Period II, part III (Figma 290:1975): a century of brilliance, and Period II's end. Not a
 * section of its own: the last TAIL artboard px of part II's pin (lib/people.js leaves them to
 * this), so the scholars can rise from the disc itself. Over them, as the scroll goes on:
 *
 * 1. rise (RISE): the disc sinks where it stopped (--sink) as the hand lowers the card (--drop);
 *    the orbit and the stations' rings fade from the start, slowly (--orbit), and the rest of
 *    part II after them (--part2). Night falls behind (--night): the sky darkens, its stars come
 *    out (--starlight) and Baghdad in 945 comes up below (--painting). The five become stars
 *    where their portraits are, at the same size and light, the stations and the card letting go
 *    of them (--held, --face), so nothing jumps; then they lift off one by one from the top of the
 *    disc down (ORDER: al-Razi from the card first), each on a curve that rises before it turns
 *    in, trailing light, to its place on a pointed arch over the city (SKY), shrinking to a
 *    star's size as its rays and dotted ring come on;
 * 2. words (WORDS): the arch is drawn through them from ١ to ٥ (--drawn), their numerals light,
 *    and the kicker, the title's two lines and the body rise in inside it; LINGER more to read;
 * 3. close (CLOSE, then END to rest): as Period I's closing does into card I (lib/period-map.js),
 *    the whole view is cut to a square about the arch (CROP) and shrinks into card II on a copy
 *    of the three ages behind it, the map's camera pulling back about the card; as it comes down
 *    it turns over into card II's own painting, the story's murals growing in around the map;
 *    card II is marked done and card III steps forward, as what comes next. The pin then goes on
 *    ONWARD artboard px, for the dive into card III (lib/brilliance.js).
 *
 * Everything follows the scroll, both ways. With reduced motion each stage simply shows, and the
 * close is a crossfade to the map.
 */

const RISE = 1100;
const WORDS = 520;
const LINGER = 360;
const CLOSE = 1700;
const END = 260;
export const TAIL = RISE + WORDS + LINGER + CLOSE + END + ONWARD;   // artboard px of part II's pin

// The stars on the arch, in the sky's artboard (Figma 290:1521), and part II's stations they rise
// from: on the disc (centre 720, 1121.5 in part II's artboard, 15 px shorter than this one, both
// set on the bottom of the view) as it stopped, al-Razi at the top (TURNED), and the card's
// portrait (96 across, centred 630) for al-Razi, who is on it.
const SKY = [[423, 540], [492, 330], [720, 120], [948, 330], [1017, 540]];
const DISC = { x: 720, y: 1121.5 + 15, r: 491.5 };
const ANGLES = [-60, -30, 0, 30, 60];
const TURNED = -60;
const FACE = { x: 720, y: 630 + 15, size: 96 };
const STAR = 56;                 // a star's portrait, across
const SMALL = 114 / 134;         // a station's size at 60° from the top (lib/people.js)
const SINK = 220;                // artboard px the disc sinks
const DROP = 420;                // artboard px the card goes down
const ORDER = [4, 3, 2, 1, 0];   // who lifts off first: from the top of the disc down
const FLIGHT = [.04, .085, .45]; // the first lifts at, each next this much later, each flies this long
const TRAIL = .18;               // the light behind a star reaches back this much of its flight

// The close (shares of CLOSE), as in lib/period-map.js.
const CROP = { x: 720, y: 380, side: 760 };   // in the sky's artboard
const CARD = { x: 865, y: 501, size: 120 };   // card II on the story (122:20)
const STAGE = { width: 1440, height: 1024 };
const SHRINK_FROM = .04;
const SHRINK_TO = .8;
const DONE_AT = .84;
const NEXT_AT = .9;
const CUT = .45;
const TURN = .45;
const CAMERA = .35;
const PERSPECTIVE = 800;
const LIFT_TURN = .08;

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const ease = t => t * t * (3 - 2 * t);
const out = t => 1 - (1 - t) ** 3;
const easeInOutCubic = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const span = (t, from, to) => clamp((t - from) / (to - from));

export function startSky(section, { lenis } = {}) {
  const view = section?.querySelector('.people__view');
  const source = document.querySelector('#story');
  if (!view || !source) return;
  const stations = [...section.querySelectorAll('.people__station')];
  const stars = [...section.querySelectorAll('.sky__star')];
  const threads = [...section.querySelectorAll('.sky__thread')];
  const layer = section.querySelector('.period-map--end');
  const camera = layer.querySelector('.period-map__camera');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');

  // The three ages to close into: card I read and turned, card II to turn up and be read.
  const map = copyStory(source, { next: 'Period III · coming next', read: [1, 2] });
  map.classList.add('story--end');
  camera.append(map);
  const [first, second, third] = [1, 2, 3].map(age => map.querySelector(`.period--${age}`));
  first.classList.add('is-done', 'is-turned');
  const turnCard = document.createElement('div');
  turnCard.className = 'period-map__turn';
  const painting = second.querySelector('.period__thumb img').cloneNode();
  painting.alt = '';
  turnCard.append(painting);
  layer.append(turnCard);

  // On the view, where all that reads them is: the end map beside it is left out of the style
  // recalculation each write causes.
  const set = (name, value) => view.style.setProperty(name, value);

  // Where each star is before it lifts: on its station as the disc sinks, at the size and light the
  // station gives it, or, for al-Razi, on the card as it goes down.
  function seat(i, sink, drop) {
    if (Math.abs(ANGLES[i] + TURNED) < 1) return { x: FACE.x, y: FACE.y + drop, size: FACE.size, light: 1 };
    const off = Math.abs(ANGLES[i] + TURNED), a = (ANGLES[i] + TURNED) * Math.PI / 180;
    const near = clamp((60 - off) / 30, -1, 1);
    return {
      x: DISC.x + DISC.r * Math.sin(a),
      y: DISC.y - DISC.r * Math.cos(a) + sink,
      size: 104 * (SMALL + (1 - SMALL) * near),
      light: .55 + .45 * near,
    };
  }

  // A rise that goes up before it turns in: a quadratic curve from s to t.
  function curve(s, t, f) {
    const c = { x: s.x + (t.x - s.x) * .15, y: t.y + (s.y - t.y) * .35 };
    const u = 1 - f;
    return { x: u * u * s.x + 2 * u * f * c.x + f * f * t.x, y: u * u * s.y + 2 * u * f * c.y + f * f * t.y };
  }

  function rise(r) {
    const sink = SINK * ease(span(r, .05, .5));
    const drop = DROP * ease(span(r, 0, .45));
    set('--sink', `${sink.toFixed(1)}px`);
    set('--drop', `${drop.toFixed(1)}px`);
    set('--orbit', (1 - ease(span(r, 0, .24))).toFixed(4));
    set('--part2', (1 - ease(span(r, .1, .45))).toFixed(4));
    set('--night', ease(span(r, .05, .4)).toFixed(4));
    set('--painting', (.35 + .65 * ease(span(r, .45, 1))).toFixed(4));
    set('--starlight', ease(span(r, .2, .7)).toFixed(4));
    const taken = r > 0;
    set('--face', taken ? '0' : '1');
    stations.forEach(station => station.style.setProperty('--held', taken ? '0' : '1'));
    stars.forEach((star, i) => {
      const k = ORDER.indexOf(i);
      const from = FLIGHT[0] + k * FLIGHT[1];
      const f = ease(span(r, from, from + FLIGHT[2]));
      const start = seat(i, sink, drop);
      const target = { x: SKY[i][0], y: SKY[i][1] };
      const at = curve(start, target, f);
      star.style.setProperty('--shown', taken ? '1' : '0');
      star.style.setProperty('--x', `${at.x.toFixed(1)}px`);
      star.style.setProperty('--y', `${at.y.toFixed(1)}px`);
      const scale = start.size / STAR;
      star.style.setProperty('--scale', (scale + (1 - scale) * f).toFixed(4));
      star.style.setProperty('--lit', (start.light + (1 - start.light) * f).toFixed(3));
      star.style.setProperty('--crown', f.toFixed(4));
      // The light behind it, from a little way back along its curve to where it is now.
      const back = curve(start, target, Math.max(0, f - TRAIL));
      const dx = at.x - back.x, dy = at.y - back.y;
      const thread = threads[i];
      thread.style.setProperty('--length', `${Math.hypot(dx, dy).toFixed(1)}px`);
      thread.style.setProperty('--glow', (Math.sin(f * Math.PI) * .9).toFixed(3));
      thread.style.transform = `translate(${back.x.toFixed(1)}px, ${back.y.toFixed(1)}px) rotate(${(Math.atan2(-dx, dy) * 180 / Math.PI).toFixed(2)}deg)`;
    });
  }

  function words(w) {
    set('--drawn', ease(span(w, 0, .7)).toFixed(4));
    set('--numerals', ease(span(w, .1, .5)).toFixed(4));
    set('--in-k3', out(span(w, .25, .6)).toFixed(4));
    set('--in-t3a', out(span(w, .32, .67)).toFixed(4));
    set('--in-t3b', out(span(w, .4, .75)).toFixed(4));
    set('--in-b3', out(span(w, .5, .9)).toFixed(4));
  }

  // The story's murals grow in once the close is under way, as on Period I's map.
  let arrived = false;
  function arrive(on) {
    if (on === arrived) return;
    arrived = on;
    map.classList.toggle('has-arrived', on);
  }

  function clear() {
    for (const prop of ['transform', 'transform-origin', 'clip-path', 'visibility']) view.style.removeProperty(prop);
    layer.style.opacity = '';
    turnCard.style.removeProperty('transform');
    turnCard.style.removeProperty('visibility');
    second.classList.remove('is-turned', 'is-done');
    third.classList.remove('is-active');
    map.removeAttribute('data-active');
  }

  function close(progress) {
    // The end map is not drawn or styled at all until the close (styles.css, .is-awake).
    layer.classList.toggle('is-awake', progress > 0);
    second.classList.toggle('is-done', progress >= DONE_AT);
    const next = progress >= NEXT_AT;
    third.classList.toggle('is-active', next);
    map.toggleAttribute('data-active', next);
    if (progress <= 0) { clear(); arrive(false); return; }
    if (reduced.matches) {
      arrive(true);
      const fade = ease(span(progress, SHRINK_FROM, SHRINK_TO));
      view.style.opacity = (1 - fade).toFixed(3);
      view.style.visibility = fade >= 1 ? 'hidden' : '';
      layer.style.opacity = fade.toFixed(3);
      second.classList.add('is-turned');
      return;
    }
    layer.style.opacity = '1';
    const width = section.clientWidth, height = window.innerHeight, scale = stageScale();
    const run = span(progress, SHRINK_FROM, SHRINK_TO);
    const shrink = easeInOutCubic(run);
    if (run > .1) arrive(true);
    // Card II on screen (the story's stage is centred in the view), and the crop on the view (the
    // sky's artboard is set on its bottom).
    const cardSize = CARD.size * scale;
    const card = {
      x: width / 2 + (CARD.x + CARD.size / 2 - STAGE.width / 2) * scale,
      y: height / 2 + (CARD.y + CARD.size / 2 - STAGE.height / 2) * scale,
    };
    const crop = { x: width / 2 + (CROP.x - STAGE.width / 2) * scale, y: height - (STAGE.height - CROP.y) * scale, side: CROP.side * scale };
    const zoom = CARD.size / CROP.side;
    // The one point a pure scale about takes the crop's centre onto the card's.
    const origin = { x: (card.x - zoom * crop.x) / (1 - zoom), y: (card.y - zoom * crop.y) / (1 - zoom) };
    const size = zoom ** shrink;
    const pivot = { x: origin.x + size * (crop.x - origin.x), y: origin.y + size * (crop.y - origin.y) };
    const turn = clamp((shrink - TURN) / (1 - TURN));
    const angle = turn * 180;
    const lift = 1 + Math.sin(turn * Math.PI) * LIFT_TURN;
    view.style.transformOrigin = '0 0';
    view.style.transform = `translate(${pivot.x.toFixed(2)}px, ${pivot.y.toFixed(2)}px) perspective(${PERSPECTIVE}px) `
      + `rotateY(${Math.min(angle, 90).toFixed(2)}deg) scale(${lift.toFixed(4)}) translate(${(origin.x - pivot.x).toFixed(2)}px, ${(origin.y - pivot.y).toFixed(2)}px) `
      + `scale(${size.toFixed(5)}) translate(${(-origin.x).toFixed(2)}px, ${(-origin.y).toFixed(2)}px)`;
    view.style.visibility = angle >= 90 ? 'hidden' : '';
    const cut = easeInOutCubic(clamp(shrink / CUT));
    view.style.clipPath = `inset(${((crop.y - crop.side / 2) * cut).toFixed(1)}px ${((width - crop.x - crop.side / 2) * cut).toFixed(1)}px `
      + `${((height - crop.y - crop.side / 2) * cut).toFixed(1)}px ${((crop.x - crop.side / 2) * cut).toFixed(1)}px)`;

    // Card II's painting on the same path, from the back; card II itself shows once it has landed.
    const landed = run >= 1;
    second.classList.toggle('is-turned', landed);
    turnCard.style.visibility = angle > 90 && !landed ? 'visible' : '';
    turnCard.style.width = turnCard.style.height = `${cardSize.toFixed(2)}px`;
    turnCard.style.transform = `translate(${(pivot.x - cardSize / 2).toFixed(2)}px, ${(pivot.y - cardSize / 2).toFixed(2)}px) `
      + `perspective(${PERSPECTIVE}px) rotateY(${(angle - 180).toFixed(2)}deg) scale(${(lift * size / zoom).toFixed(4)})`;

    // The map's camera pulls back about card II as the sky lands on it.
    // Written on the camera itself, not as custom properties on the layer, which every element of
    // the map would inherit and have its style recalculated for, on every frame.
    camera.style.transformOrigin = `${card.x.toFixed(1)}px ${card.y.toFixed(1)}px`;
    camera.style.scale = ((1 / zoom) ** (CAMERA * (1 - shrink))).toFixed(4);
  }

  // Runs on both Lenis's and the window's scroll; the second call in a frame finds nothing moved.
  // Each stage is only written when its own share has changed, so the still parts of the scroll
  // (before the tail, a finished rise, the reading) cost next to nothing.
  let lastTop = null, last = {};
  function reset() { lastTop = null; last = {}; render(); }
  function render() {
    const box = section.getBoundingClientRect();
    if (box.top === lastTop) return;
    lastTop = box.top;
    const scale = stageScale();
    // Scrolled into the tail, in artboard px.
    const into = (-box.top - (box.height - window.innerHeight - TAIL * scale)) / scale;
    const still = reduced.matches;
    const span1 = span(into, 0, RISE), r = still ? (span1 > 0 ? 1 : 0) : span1;
    const w = still ? (span1 >= 1 ? 1 : 0) : span(into, RISE, RISE + WORDS);
    const c = span(into, RISE + WORDS + LINGER, RISE + WORDS + LINGER + CLOSE);
    if (r !== last.r) { last.r = r; rise(r); }
    if (w !== last.w) { last.w = w; words(w); }
    if (c !== last.c) {
      last.c = c;
      if (!still) view.style.removeProperty('opacity');
      close(c);
    }
  }

  lenis?.on('scroll', render);
  addEventListener('scroll', render, { passive: true });
  addEventListener('resize', reset);
  reduced.addEventListener('change', reset);
  render();
  return { render };
}
