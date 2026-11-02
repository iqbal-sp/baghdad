import { SMOKE_GLSL, createProgram, loadSmokeTexture, measureSmoke } from './smoke-field.js';

/**
 * Warm smoke that rolls across the hero → story seam while the track slides.
 *
 * A full-viewport canvas over both panels. Thick billowing smoke (domain-warped fBm)
 * rolls in around the seam and drifts with the slide, lit like the hero's own smoke.
 * Over the hero's fading edge the hero's smoke itself carries on (lib/smoke-field.js:
 * same photo, flow, clock and place), so it never just stops where the hero dissolves,
 * and a dense core always covers the seam itself. Its strength peaks mid-slide and is
 * zero at rest, so both panels still match Figma when settled. The loop only runs while
 * smoke is visible.
 */

const VERT = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 uRes;
uniform vec4 uBox;     // the hero's photo in canvas px: left, bottom, width, height (y up)
uniform float uSeam;   // seam x in canvas px
uniform float uFade;   // width of the hero's edge fade in canvas px
uniform float uDim;    // how far the whole hero has faded (0–.5)
uniform float uAhead;  // how far the hero's smoke reaches into the story, in canvas px
uniform float uAmount; // 0 at rest, 1 mid-slide
uniform float uCover;  // how solidly the core hides the seam
uniform float uDrift;  // scroll-driven drift so the billows travel with the slide
uniform float uWarm;   // 1 at the start of the slide (smoke takes the hero's warm colour) → 0
${SMOKE_GLSL}
// Curling, billowing smoke: domain warping gives the curling, billowing look.
float billows(vec2 p, float t) {
  vec2 q = vec2(fbm(p * 1.4 + vec2(0.0, t) + uDrift), fbm(p * 1.4 + vec2(5.2, -t)));
  vec2 r = vec2(fbm(p * 1.8 + 3.0 * q + vec2(1.7 - t * 0.7, 9.2)), fbm(p * 1.8 + 3.0 * q + vec2(8.3, 2.8 + t * 0.5)));
  return fbm(p * 2.2 + 2.4 * r + vec2(uDrift * 1.6, 0.0));
}

void main() {
  vec2 uv = (gl_FragCoord.xy - uBox.xy) / uBox.zw;
  float n = billows(vec2(gl_FragCoord.x / uRes.y, gl_FragCoord.y / uRes.y), mod(uTime, 600.0) * 0.06);

  // A wide soft band around the seam, its edges eaten away by the billows, and a dense
  // core that only wavers a little, so it never leaves the seam and the panels' edge never shows.
  float seam = (gl_FragCoord.x - uSeam) / uRes.x;
  float dx = seam + (n - 0.5) * 0.14;
  float band = exp(-dx * dx / (2.0 * 0.26 * 0.26));
  float dc = seam + (n - 0.5) * 0.03;
  float core = 1.0 - smoothstep(0.03, 0.1, abs(dc));
  float body = smoothstep(0.2, 0.78, n + band * 0.5 - 0.12) * band;

  // Behind the seam the hero's photo smoke carries on over its fading edge (stops as in
  // .hero__edge-fade); past the seam it trails a little way into the story. Dimmed with
  // the hero on both sides and flat on the seam, so it leaves no crease there.
  float behind = uSeam - gl_FragCoord.x;
  float ahead = behind / uAhead;
  float carry = (behind > 0.0 ? smoothstep(uFade, 0.0, behind) : exp(-ahead * ahead)) * (1.0 - uDim);

  // Lit like the hero's smoke, but held back so it smoulders rather than glows: the photo
  // smoke colour-dodged over the dark sky, and the billows' tops dodged over a dim warm
  // glow, rising gently so they stay soft.
  float smoke = smokeAt(uv) * carry;
  float wisps = smoothstep(0.3, 0.95, n) * body * 0.8;
  // Early in the slide the smoke sits over the hero's warm edge (redder low down, where
  // its glow is), so it starts from that colour and darkens to the story's as the hero leaves.
  vec3 hero = mix(vec3(0.200, 0.058, 0.016), vec3(0.120, 0.034, 0.009), smoothstep(0.0, 0.8, gl_FragCoord.y / uRes.y));
  vec3 sky = mix(vec3(0.090, 0.024, 0.004), hero, uWarm);
  vec3 glow = vec3(0.110, 0.042, 0.014);
  vec3 lit = mix(sky, min(vec3(1.0), sky / max(1.0 - smoke, 0.001)), 0.6)
           + min(vec3(1.0), glow / (1.0 - wisps)) - glow;

  // Under the billows a soft veil fills the band, so the hero's warmth and the story's
  // dark never meet in an edge while the smoke is thick.
  float veil = band * 0.65;
  float alpha = clamp(max(max(max(body, veil), carry) * uAmount, core * uCover), 0.0, 1.0);
  gl_FragColor = vec4(lit * alpha, alpha);
}
`;

/**
 * Returns { setProgress(progress, slide) } — a no-op when WebGL is unavailable or motion is reduced.
 * slide: { shift, fade, dim } — the track's offset in px, the edge fade's width (0–1 of the
 * viewport) and the hero fade's opacity, as lib/journey.js sets them.
 */
export function createSmoke(canvas, hero) {
  const off = { setProgress() {} };
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return off;
  const gl = canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false, depth: false });
  if (!gl) return off;

  let program;
  try {
    program = createProgram(gl, VERT, FRAG);
  } catch (error) {
    console.warn('Smoke transition disabled:', error);
    return off;
  }
  const u = name => gl.getUniformLocation(program, name);
  const uTime = u('uTime'), uBox = u('uBox'), uSeam = u('uSeam');
  const uFade = u('uFade'), uDim = u('uDim'), uAhead = u('uAhead'), uAmount = u('uAmount');
  const uRes = u('uRes'), uCover = u('uCover'), uDrift = u('uDrift'), uWarm = u('uWarm');

  // Smoke is soft, so half resolution is plenty and keeps it cheap.
  const SCALE = .5;
  let field = measureSmoke(hero);
  function size() {
    const w = Math.max(1, Math.round(canvas.clientWidth * SCALE));
    const h = Math.max(1, Math.round(canvas.clientHeight * SCALE));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    gl.viewport(0, 0, w, h);
    field = measureSmoke(hero);
  }
  addEventListener('resize', size);
  size();

  let ready = false, progress = 0, slide = { shift: 0, fade: 0, dim: 0 }, frame = 0;
  const smoothstep = (a, b, x) => {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };
  // Thick almost from the first scroll, so the story's edge never shows beside the hero,
  // and held until the story is mostly in.
  const amountAt = p => smoothstep(0, .08, p) * (1 - smoothstep(.65, 1, p));
  // The core is solid as soon as the seam is on screen, and gone only as it leaves.
  const coverAt = p => Math.min(1, p / .03, (1 - p) / .03);

  function draw(now) {
    const amount = amountAt(progress);
    const cover = Math.max(0, coverAt(progress));
    // Hidden at rest, so the page never pays for blending an empty canvas.
    const idle = amount < .01 && cover < .01;
    canvas.style.visibility = idle ? 'hidden' : '';
    if (idle) {
      frame = 0;
      return;
    }
    const k = canvas.width / canvas.clientWidth;
    const { box } = field;
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uTime, now / 1000);
    gl.uniform4f(uBox, (box.left - slide.shift) * k, (canvas.clientHeight - box.top - box.height) * k, box.width * k, box.height * k);
    gl.uniform1f(uSeam, canvas.width - slide.shift * k);
    gl.uniform1f(uFade, Math.max(1, slide.fade * canvas.width));
    gl.uniform1f(uDim, slide.dim);
    gl.uniform1f(uAhead, canvas.width * .22);
    gl.uniform1f(uAmount, amount);
    gl.uniform1f(uCover, cover);
    gl.uniform1f(uDrift, progress * 1.2);
    gl.uniform1f(uWarm, 1 - smoothstep(0, .45, progress));
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    frame = requestAnimationFrame(draw);
  }

  loadSmokeTexture(gl, field.src, () => {
    ready = true;
    if (!frame) frame = requestAnimationFrame(draw);
  });

  return {
    setProgress(p, next) {
      progress = p;
      slide = next;
      if (ready && !frame) frame = requestAnimationFrame(draw);
    },
  };
}
