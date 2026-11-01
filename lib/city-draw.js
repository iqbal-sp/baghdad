/**
 * Scene 3 explorer entrance: the plan is drawn with a compass. Not in Figma, added for the
 * page's motion. Driven by scroll (drawProgress, e 0–1, from the explorer's top entering the
 * bottom of the view to one view's height into its pin; the pin starts at e .5, and the steps
 * take over at DONE, .8 of a view into it):
 * - the white dot of the intro's "i" falls to the plan's centre (lib/city-intro.js, e .1–.5),
 * - the palace and the mosque bloom out from it, with a gold ring spreading from the dome,
 * - then, outward, the central court, the ring of houses, the walls with their gates and the
 *   medallion frame are each swept in clockwise from the top: a bright gold line is drawn round
 *   the ring with a pen at its tip, the part appears behind the pen, and the line then fades,
 * - the progress ring sweeps in the same way and the compass star turns into place,
 * - the parts list slides in item by item, and the corner splatter fades in with the drawing,
 * - at DONE the step is replayed (lib/city.js), so the "01" medallion pops, the panel opens and
 *   the walls' details start, all with their usual CSS animations.
 * Each part is revealed through a clipPath: a growing circle at the centre, a pie wedge for the
 * sweeps. The clips are dropped once the drawing is complete.
 */

export const DONE = .9;

// Windows within e: [start, end].
const BLOOM = [.48, .58];
const SWEEPS = [
  { part: 'court', radius: .625, at: [.55, .66] },
  { part: 'ring', radius: .85, at: [.6, .71] },
  { part: 'walls', also: 'gates', radius: 1, at: [.66, .78] },
  { part: 'ornament', radius: 1.05, at: [.73, .82] },
];
const RING_SWEEP = [.76, .88];
const LIST = { start: .74, stagger: .02, length: .08 };
// The splatter in the corner arrives with the drawing, not ahead of it.
const SPLATTER = [.45, .6];
// How long a drawn line takes to fade back once its sweep is done, in e.
const FADE = .06;
// e runs over (1 + ENTRY) views of scroll: arriving, then ENTRY views into the pin.
export const ENTRY = 1;
// The steps start where the drawing is done, this share of a view into the pin (styles.css gives
// the explorer that much more height).
export const STEPS_AFTER = DONE * (1 + ENTRY) - 1;

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const easeInOut = t => t < .5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;
const easeOut = t => 1 - (1 - t) ** 3;
const within = (e, [start, end]) => clamp((e - start) / (end - start));
const f = v => v.toFixed(2);

// e for the explorer's current position.
export function drawProgress(explore) {
  const view = window.innerHeight;
  const top = explore.getBoundingClientRect().top;
  return clamp((view - top) / (view * (1 + ENTRY)));
}

export function createCityDrawing(explore, { c, U, gold }) {
  const lens = explore.querySelector('.city__lens');
  const plan = lens.querySelector('.city__plan');
  const ring = explore.querySelector('.city__ring');
  const compass = ring.querySelector('.city__compass');
  const listItems = [explore.querySelector('.city__parts-label'), ...explore.querySelectorAll('.city__part')];
  const splatter = explore.querySelector('.city__splatter');

  // Clip paths (plan px) and the construction lines with their pens, drawn above the plan.
  const R = 1.2 * U;
  let defs = `<clipPath id="city-draw-centre" clipPathUnits="userSpaceOnUse"><circle cx="${f(c)}" cy="${f(c)}" r="0"/></clipPath>`;
  let lines = `<circle class="city__bloom" cx="${f(c)}" cy="${f(c)}" r="0" stroke="${gold}"/>`;
  for (const { part, radius } of SWEEPS) {
    defs += `<clipPath id="city-draw-${part}" clipPathUnits="userSpaceOnUse"><path d=""/></clipPath>`;
    lines += `<g class="city__construct" data-part="${part}"><circle cx="${f(c)}" cy="${f(c)}" r="${f(radius * U)}" stroke="${gold}" pathLength="1" transform="rotate(-90 ${f(c)} ${f(c)})"/>`;
    lines += `<g class="city__pen"><circle cx="${f(c)}" cy="${f(c - radius * U)}" r="8" fill="${gold}" fill-opacity=".22"/><circle cx="${f(c)}" cy="${f(c - radius * U)}" r="2.8" fill="${gold}"/></g></g>`;
  }
  lens.querySelector('defs').insertAdjacentHTML('beforeend', defs);
  plan.insertAdjacentHTML('beforeend', `<g class="city__drawing">${lines}</g>`);

  const centreClip = lens.querySelector('#city-draw-centre circle');
  const bloom = plan.querySelector('.city__bloom');
  const centreParts = ['palace', 'mosque'].map(name => plan.querySelector(`.plan-${name}`));
  const sweeps = SWEEPS.map(sweep => ({
    ...sweep,
    clip: lens.querySelector(`#city-draw-${sweep.part} path`),
    targets: [sweep.part, sweep.also].filter(Boolean).map(name => plan.querySelector(`.plan-${name}`)),
    line: plan.querySelector(`.city__construct[data-part="${sweep.part}"] > circle`),
    pen: plan.querySelector(`.city__construct[data-part="${sweep.part}"] .city__pen`),
  }));

  // A pie wedge from 12 o'clock, clockwise through `turn` (0–1) of a full circle.
  const wedge = turn => {
    if (turn <= 0) return 'M 0 0';
    if (turn >= 1) return `M ${f(c - R)} ${f(c - R)} h ${f(2 * R)} v ${f(2 * R)} h ${f(-2 * R)} Z`;
    const a = (turn * 360 - 90) * Math.PI / 180;
    return `M ${f(c)} ${f(c)} L ${f(c)} ${f(c - R)} A ${f(R)} ${f(R)} 0 ${turn > .5 ? 1 : 0} 1 ${f(c + R * Math.cos(a))} ${f(c + R * Math.sin(a))} Z`;
  };

  const clipped = new Set([...centreParts, ...sweeps.flatMap(sweep => sweep.targets)]);
  let drawn = null;
  function setClips(on) {
    if (drawn === !on) return;
    drawn = !on;
    for (const el of clipped) {
      if (!on) { el.removeAttribute('clip-path'); continue; }
      const sweep = sweeps.find(s => s.targets.includes(el));
      el.setAttribute('clip-path', `url(#city-draw-${sweep ? sweep.part : 'centre'})`);
    }
    plan.querySelector('.city__drawing').style.display = on ? '' : 'none';
  }

  let last = -1;
  function render(e) {
    if (e === last) return;
    last = e;
    setClips(e < 1);
    explore.classList.toggle('is-drawing', e < DONE);

    const open = easeOut(within(e, BLOOM));
    centreClip.setAttribute('r', f(.4 * U * open));
    bloom.setAttribute('r', f(.06 * U + .5 * U * open));
    bloom.style.opacity = open > 0 && open < 1 ? f(.8 * (1 - open)) : '0';

    for (const sweep of sweeps) {
      const turn = easeInOut(within(e, sweep.at));
      sweep.clip.setAttribute('d', wedge(turn));
      sweep.line.style.strokeDashoffset = f(1 - turn);
      const fade = clamp((e - sweep.at[1]) / FADE);
      sweep.line.style.opacity = turn > 0 ? f(1 - fade) : '0';
      sweep.pen.style.opacity = turn > 0 && turn < 1 ? '1' : '0';
      sweep.pen.setAttribute('transform', `rotate(${f(turn * 360)} ${f(c)} ${f(c)})`);
    }

    const ringTurn = easeInOut(within(e, RING_SWEEP));
    ring.style.setProperty('--sweep', `${f(ringTurn * 360)}deg`);
    ring.classList.toggle('is-sweeping', ringTurn < 1);
    compass.style.rotate = `${f((1 - ringTurn) * -180)}deg`;
    compass.style.scale = f(.3 + .7 * ringTurn);
    compass.style.opacity = f(ringTurn);

    splatter.style.opacity = f(easeOut(within(e, SPLATTER)));

    const gap = LIST.stagger;
    listItems.forEach((item, i) => {
      const slide = easeOut(clamp((e - LIST.start - i * gap) / LIST.length));
      item.style.opacity = f(slide);
      item.style.translate = `${f((1 - slide) * -32)}px 0`;
    });
  }

  return { render };
}
