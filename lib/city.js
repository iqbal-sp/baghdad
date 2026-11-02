import { roundCityPlan } from './round-city-plan.js';
import { createCityDrawing, drawProgress, DONE, STEPS_AFTER } from './city-draw.js';

/**
 * Scene 3 explorer (Figma "Scene 3 — B final · Explore 01–04"). The plan stays pinned while
 * the page scrolls through four steps, outside in: walls, gates, mosque, palace. Each step:
 * - lights its part of the plan and dims the rest; for the mosque and the palace the camera
 *   zooms ZOOM× onto that building (and pans between them), the lens edge fades in, and the
 *   buildings' close-up detail (.plan-detail) appears,
 * - grows the progress ring by a quarter, turns the compass star 45°, and moves the ring's head,
 * - for the gates, closes focus brackets in on each one,
 * - runs its own details (moat shimmer and towers, gate domes and travellers), styled in
 *   styles.css; the close-ups have none, the zoom is their motion,
 * - swaps the explanation panel and marks its part in the list. The parts are buttons: choosing
 *   one scrolls to its step.
 * Before the steps, the plan is drawn in (lib/city-draw.js) over the explorer's arrival and the
 * first .8 of a view of its pin; the steps share the rest.
 */

const STEPS = ['walls', 'gates', 'mosque', 'palace'];
const LENS = 600;
const PLAN = 570;
const OFFSET = (LENS - PLAN) / 2;
const ZOOM = 4.5;
// Pinned scroll after the last step, in viewports (see range below): --capital-rest plus
// --capital-wipe, read from styles.css (vh) so the two can never disagree.
const HOLD_PARTS = ['--capital-rest', '--capital-wipe'];
const RING = { cx: 720, cy: 520, r: 330 };
const GOLD = '#c8a15a';
const GOLD_LIGHT = '#ecd09a';
const BG = '#170601';

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const f = v => v.toFixed(2);

function ringMarkup() {
  const { cx, cy, r } = RING;
  const length = 2 * Math.PI * r;
  let s = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="rgb(255 235 202 / .12)"/>`;
  s += `<circle class="city__arc" cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${GOLD}" stroke-width="1.5" stroke-linecap="round" transform="rotate(-90 ${cx} ${cy})" style="--ring-length:${f(length)}"/>`;
  [-90, 0, 90, 180].forEach((a, i) => {
    const t = a * Math.PI / 180, x1 = cx + (r - 6) * Math.cos(t), y1 = cy + (r - 6) * Math.sin(t), x2 = cx + (r + 6) * Math.cos(t), y2 = cy + (r + 6) * Math.sin(t);
    s += `<line class="city__tick" data-step="${i}" x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke="${GOLD}"/>`;
  });
  s += `<g class="city__head"><circle cx="${cx}" cy="${cy - r}" r="7" fill="${GOLD}" fill-opacity=".18"/><circle cx="${cx}" cy="${cy - r}" r="3.2" fill="${GOLD_LIGHT}"/></g>`;
  // Compass star above the ring (18px, 8 points).
  const sx = cx, sy = cy - r - 18, pts = [];
  for (let k = 0; k < 16; k++) { const a = (k * 22.5 - 90) * Math.PI / 180, rr = k % 2 ? 9 * .38 : 9; pts.push(`${f(sx + rr * Math.cos(a))},${f(sy + rr * Math.sin(a))}`); }
  s += `<g class="city__compass"><polygon points="${pts.join(' ')}" fill="${GOLD}"/></g>`;
  return s;
}

function lensMarkup() {
  const { markup, geo } = roundCityPlan(PLAN);
  const { c, U, at, gates } = geo;
  // The close-ups centre the camera on their building's box (lens px).
  const cameras = Object.fromEntries(['mosque', 'palace'].map(name => {
    const [x1, y1, x2, y2] = geo[name];
    const x = OFFSET + (x1 + x2) / 2, y = OFFSET + (y1 + y2) / 2;
    return [name, `translate(${LENS / 2}px, ${LENS / 2}px) scale(${ZOOM}) translate(${f(-x)}px, ${f(-y)}px)`];
  }));
  // Plan px → lens px, unzoomed.
  const toLens = ([x, y]) => [OFFSET + x, OFFSET + y];

  // Per-step details, in plan px (inside the camera, so they zoom and are clipped with the plan).
  const fx = {
    walls: `<circle class="city__shimmer" cx="${f(c)}" cy="${f(c)}" r="${f(.9775 * U)}" fill="none" stroke="${GOLD_LIGHT}" stroke-width="2" stroke-linecap="round" pathLength="1000" transform="rotate(-80 ${f(c)} ${f(c)})"/>`,
    gates: gates.map(a => [0, 1].map(k => `<g transform="rotate(${a} ${f(c)} ${f(c)})"><g class="city__traveller" style="--k:${k};--travel:${f(-.2 * U)}px"><circle cx="${f(c + .84 * U)}" cy="${f(c)}" r="6" fill="${GOLD_LIGHT}" fill-opacity=".18"/><circle cx="${f(c + .84 * U)}" cy="${f(c)}" r="2.6" fill="${GOLD_LIGHT}"/></g></g>`).join('')).join(''),
    mosque: '',
    palace: '',
  };

  // Focus marks, in lens px (outside the clip, so they can sit past the rim).
  const brackets = ([x1, y1, x2, y2], pad, len) => {
    x1 -= pad; y1 -= pad; x2 += pad; y2 += pad;
    return `M ${f(x1)} ${f(y1 + len)} L ${f(x1)} ${f(y1)} L ${f(x1 + len)} ${f(y1)} M ${f(x2 - len)} ${f(y1)} L ${f(x2)} ${f(y1)} L ${f(x2)} ${f(y1 + len)} M ${f(x2)} ${f(y2 - len)} L ${f(x2)} ${f(y2)} L ${f(x2 - len)} ${f(y2)} M ${f(x1 + len)} ${f(y2)} L ${f(x1)} ${f(y2)} L ${f(x1)} ${f(y2 - len)}`;
  };
  const path = d => `<path class="city__brackets" d="${d}" fill="none" stroke="${GOLD}" stroke-width="1.5" stroke-linecap="square"/>`;
  const gateHalf = .075 * U;
  const marks = {
    walls: '',
    gates: gates.map(a => { const [x, y] = toLens(at(.912, a)); return path(brackets([x - gateHalf, y - gateHalf, x + gateHalf, y + gateHalf], 2, 8)); }).join(''),
    mosque: '',
    palace: '',
  };

  const R = LENS / 2;
  let s = `<defs><clipPath id="city-lens"><circle cx="${R}" cy="${R}" r="${R}"/></clipPath>`;
  s += `<radialGradient id="city-lens-edge"><stop offset=".88" stop-color="${BG}" stop-opacity="0"/><stop offset="1" stop-color="${BG}" stop-opacity=".85"/></radialGradient></defs>`;
  // fill="none": the plan's outline circles carry only a stroke (as in Figma's SVG root).
  s += `<g clip-path="url(#city-lens)"><g class="city__camera"><g class="city__plan" fill="none" transform="translate(${OFFSET} ${OFFSET})">${markup}`;
  for (const name of STEPS) s += `<g class="city__fx" data-part="${name}">${fx[name]}</g>`;
  s += `</g></g><circle class="city__lens-edge" cx="${R}" cy="${R}" r="${R}" fill="url(#city-lens-edge)"/></g>`;
  s += `<circle class="city__lens-rim" cx="${R}" cy="${R}" r="${R - .5}" fill="none" stroke="${GOLD}" stroke-opacity=".4"/>`;
  for (const name of STEPS) s += `<g class="city__mark" data-part="${name}" fill="none">${marks[name]}</g>`;
  return { markup: s, cameras, c, U };
}

function splitWords(heading) {
  const words = heading.textContent.trim().split(/\s+/);
  heading.setAttribute('aria-label', heading.textContent.trim());
  heading.textContent = '';
  words.forEach((word, i) => {
    if (i) heading.append(' ');
    const span = document.createElement('span');
    span.className = 'city__word';
    span.setAttribute('aria-hidden', 'true');
    span.style.setProperty('--i', i);
    span.textContent = word;
    heading.append(span);
  });
}

export function startCity(explore, { lenis } = {}) {
  if (!explore) return;
  const ring = explore.querySelector('.city__ring');
  const lens = explore.querySelector('.city__lens');
  const parts = [...explore.querySelectorAll('.city__part')];
  const panels = [...explore.querySelectorAll('.city__panel')];
  ring.innerHTML = ringMarkup();
  const { markup, cameras, c, U } = lensMarkup();
  lens.innerHTML = markup;
  explore.querySelectorAll('.city__heading').forEach(splitWords);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const drawing = reduced ? null : createCityDrawing(explore, { c, U, gold: GOLD_LIGHT });

  const cameraGroup = lens.querySelector('.city__camera');
  const planParts = Object.fromEntries(STEPS.map(name => [name, lens.querySelector(`.plan-${name}`)]));
  const fx = [...lens.querySelectorAll('.city__fx')];
  const marks = [...lens.querySelectorAll('.city__mark')];
  const ticks = [...ring.querySelectorAll('.city__tick')];
  const head = ring.querySelector('.city__head');
  const compass = ring.querySelector('.city__compass');

  let step = -1;
  // Re-applies the current step from scratch, so its CSS animations (brackets, panel, details)
  // play again once the plan has been drawn.
  function replay() {
    const current = step;
    step = -1;
    explore.removeAttribute('data-step');
    for (const el of [...fx, ...marks, ...panels]) el.classList.remove('is-active');
    void explore.offsetWidth;
    setStep(current);
  }

  function setStep(next) {
    if (next === step) return;
    step = next;
    const name = STEPS[step];
    const zoomed = step >= 2;
    explore.dataset.step = step;
    explore.toggleAttribute('data-zoomed', zoomed);
    cameraGroup.style.transform = cameras[name] || 'none';
    for (const key of STEPS) planParts[key].classList.toggle('is-active', key === name);
    for (const el of [...fx, ...marks]) el.classList.toggle('is-active', el.dataset.part === name);
    parts.forEach((part, i) => {
      if (i === step) part.setAttribute('aria-current', 'step');
      else part.removeAttribute('aria-current');
    });
    panels.forEach((panel, i) => { panel.classList.toggle('is-active', i === step); panel.toggleAttribute('aria-hidden', i !== step); });
    ring.style.setProperty('--progress', (step + 1) / 4);
    ticks.forEach((tick, i) => tick.classList.toggle('is-passed', i <= step));
    head.style.transform = `rotate(${90 * (step + 1)}deg)`;
    compass.style.transform = `rotate(${45 * step}deg)`;
  }

  // Scroll through the explorer (its height minus the pinned viewport), from where the drawing is
  // done, is split into four steps. The end of it (hold) is no step: the plan rests on Palace, then
  // stays there while scene 4 opens over it (styles.css, .capital-cover).
  const rootStyle = getComputedStyle(document.documentElement);
  const hold = HOLD_PARTS.reduce((sum, name) => sum + (parseFloat(rootStyle.getPropertyValue(name)) || 0) / 100, 0);
  const entry = () => window.innerHeight * STEPS_AFTER;
  const range = () => Math.max(1, explore.offsetHeight - window.innerHeight * (1 + hold) - entry());
  let frame = 0;
  let drawn = false;
  function render() {
    frame = 0;
    const travelled = -explore.getBoundingClientRect().top - entry();
    setStep(Math.min(3, Math.floor(clamp(travelled / range(), 0, .9999) * 4)));
    if (!drawing) return;
    const e = drawProgress(explore);
    drawing.render(e);
    if (e >= DONE && !drawn) replay();
    drawn = e >= DONE;
  }
  const schedule = () => { frame ||= requestAnimationFrame(render); };
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);

  // Choosing a part scrolls to the middle of its step.
  parts.forEach((part, i) => part.addEventListener('click', () => {
    const top = explore.getBoundingClientRect().top + window.scrollY + entry() + range() * (i + .5) / 4;
    if (lenis) lenis.scrollTo(top, { duration: 1.2 });
    else window.scrollTo({ top, behavior: 'smooth' });
  }));

  render();
}
