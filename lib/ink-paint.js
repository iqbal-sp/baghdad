/**
 * CSS paint worklet for scene 4's arrival (lib/capital.js, styles.css). Not in Figma.
 *
 * Both painters trace the same front: an arc around the top-right corner of the box, pushed in
 * and out by slow lobes (three sines along the angle that drift with --ink-time and change as the
 * front travels), so its edge undulates like ink spreading through paper.
 * - ink-mask: the scene's mask. Everything inside the front, its edge softened over
 *   --ink-feather, so the scene itself, with all its parts, shows right up to one soft, uneven
 *   edge.
 * - ink-front: over the scene. A soft shadow just ahead of the front onto the plan, and a faint
 *   warm light along it (--ink-glow).
 *
 * Inputs (css px unless noted): --ink-reach (radius of the front from the corner), --ink-amp (how
 * far the lobes push it), --ink-feather, --ink-time (s), --ink-glow (0–1).
 */

const INPUTS = ['--ink-reach', '--ink-amp', '--ink-feather', '--ink-time', '--ink-glow'];

function read(props) {
  const value = name => parseFloat(String(props.get(name))) || 0;
  return {
    reach: value('--ink-reach'),
    amp: value('--ink-amp'),
    feather: value('--ink-feather'),
    time: value('--ink-time'),
    glow: value('--ink-glow'),
  };
}

// The front from the top-right corner of a box `width` wide, as a closed path that also takes in
// the corner itself (and well past it, so blurring never thins the corner).
function trace(ctx, width, { reach, amp, time }, grow = 0) {
  const travel = reach / 900;
  const radius = angle => reach + grow + amp * (
    .55 * Math.sin(angle * 4 + time * .5 + 2.1 + travel * 1.3) +
    .3 * Math.sin(angle * 9 - time * .7 + .4 + travel * 2.1) +
    .15 * Math.sin(angle * 17 + time * .9 + 5.2)
  );
  const pad = reach + amp + 4000;
  ctx.beginPath();
  ctx.moveTo(width + pad, -pad);
  const from = -.25;
  const to = Math.PI / 2 + .25;
  const steps = 96;
  for (let i = 0; i <= steps; i++) {
    const angle = from + (to - from) * i / steps;
    const r = Math.max(0, radius(angle));
    ctx.lineTo(width - r * Math.cos(angle), r * Math.sin(angle));
  }
  ctx.closePath();
}

// Layers of the traced front fill a soft edge (paint worklets draw no shadows, so no blur): each
// a little further out, added together ("lighter"), so coverage ramps from `alpha` inside to 0 at
// `soft` past `grow`, eased (smoothstep spacing) so the ramp has no visible start or end.
const LAYERS = 24;
function softFill(ctx, width, ink, rgb, alpha, soft, grow = 0) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = `rgb(${rgb} / ${alpha / LAYERS})`;
  for (let i = 0; i < LAYERS; i++) {
    const t = (i + .5) / LAYERS;
    trace(ctx, width, ink, grow - soft / 2 + soft * t * t * (3 - 2 * t));
    ctx.fill();
  }
  ctx.restore();
}

// Cut the soft front back out of what is drawn ("destination-out"), with the same ramp as
// softFill: layers from the outermost in, each removing 1/(layers left) of what remains, so what
// is left falls evenly to nothing across `soft` and leaves no hard edge.
function softCut(ctx, width, ink, soft, grow = 0) {
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < LAYERS; i++) {
    const t = 1 - (i + .5) / LAYERS;
    ctx.fillStyle = `rgb(0 0 0 / ${1 / (LAYERS - i)})`;
    trace(ctx, width, ink, grow - soft / 2 + soft * t * t * (3 - 2 * t));
    ctx.fill();
  }
  ctx.restore();
}

registerPaint('ink-mask', class {
  static get inputProperties() { return INPUTS; }

  paint(ctx, size, props) {
    const ink = read(props);
    if (ink.reach <= 0) return;
    softFill(ctx, size.width, ink, '0 0 0', 1, ink.feather);
  }
});

registerPaint('ink-front', class {
  static get inputProperties() { return INPUTS; }

  paint(ctx, size, props) {
    const ink = read(props);
    if (ink.reach <= 0) return;
    // Shade: a wider, softer front reaching ahead onto the plan, with the scene's side cut out.
    softFill(ctx, size.width, ink, '6 1 0', .3, ink.feather * 3, ink.feather * 1.5);
    softCut(ctx, size.width, ink, ink.feather);
    // The barest warm hairline riding the edge (anything wider reads as a second band).
    if (ink.glow > 0) {
      ctx.save();
      ctx.strokeStyle = `rgb(236 204 150 / ${.06 * ink.glow})`;
      ctx.lineWidth = .6;
      trace(ctx, size.width, ink);
      ctx.stroke();
      ctx.restore();
    }
  }
});
