import { SMOKE_GLSL, createProgram, loadSmokeTexture } from './smoke-field.js';
import { VERT, createFlow, trackPointer } from './smoke-touch.js';

/**
 * Smoke swept up by the cursor in "How knowledge took root" (not in Figma).
 *
 * At rest there is none: the canvas is transparent and hidden, so the section keeps every one of
 * its colours. As a fine pointer moves, it stirs up smoke along its path (lib/smoke-touch.js,
 * 'trace'), more the faster it goes; the air it drags carries that smoke on, curling it in its
 * wake, and it fades over a few seconds. What shows is the hero's own smoke (same photo and flow,
 * lib/smoke-field.js) threaded with finer wisps, only where it has been stirred up, in a pale warm tone added in screen
 * blend beneath the section's content, so it reads as a breath of smoke in the room rather than
 * a new colour.
 *
 * It also draws the cursor's light (in place of the CSS glow, .knowledge__lantern, which is
 * hidden once this runs: .has-smoke-light), at the place and strength lib/knowledge.js eases
 * (--lantern-x, --lantern-y, --lantern-opacity on the stage), as a small Gaussian with dither so
 * it fades out without rings, and the smoke near it is lit by it: warmer and brighter close to
 * the light, paler away from it, so the light and the sweep read as one.
 *
 * The loop runs while the section is on screen and either smoke is still there (IDLE after the
 * last move) or the light is on.
 */

const SCALE = .5;          // canvas px per CSS px: smoke is soft
const IDLE = 9000;         // ms after the last move when the last of the smoke has gone
const TONE = [0.93, 0.80, 0.66];
const STRENGTH = 0.2;     // the most it adds, at full smoke
const LIGHT = [1.0, 0.58, 0.25];  // the lantern's rgb(255 148 64)
const GLOW = 0.15;         // the light's peak (alpha, before --lantern-opacity), as the CSS glow
const REACH = 120;         // the light's reach in artboard px (--lantern-reach); its sigma is .4 of it

const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 vUv;
uniform sampler2D uFlow;
uniform vec2 uAspect;
uniform vec3 uLight;   // the light: uv (y up) and strength (--lantern-opacity)
uniform float uSigma;  // its spread, in units of the height
${SMOKE_GLSL}
void main() {
  vec4 field = texture2D(uFlow, vUv);
  float stirred = field.b;

  // The light: a Gaussian, so it thins out with no edge, and a wider one that lights the smoke.
  vec2 d = (vUv - uLight.xy) * uAspect;
  float r2 = dot(d, d);
  float glow = exp(-r2 / (2.0 * uSigma * uSigma)) * uLight.z * ${GLOW.toFixed(3)};
  float lit = exp(-r2 / (2.0 * 6.0 * uSigma * uSigma)) * uLight.z;
  vec3 light = vec3(${LIGHT.map(c => c.toFixed(3)).join(', ')});
  vec3 color = light * glow;
  float alpha = glow;

  if (stirred > 0.003) {
  // The photo's 3 : 2 cropped to the section's shape about its centre, and bent a little by the
  // moving air so the wisps swirl with it.
  vec2 uv = vec2(0.5 + (vUv.x - 0.5) * min(1.0, uAspect.x / 1.5), 0.5 + (vUv.y - 0.5) * min(1.0, 1.5 / uAspect.x));
  float smoke = 0.35 + 0.65 * smokeAt(uv - field.rg * 0.05);
  // Finer wisps over it, so a sweep leaves curling threads of smoke, not a haze: domain-warped
  // noise a few times smaller than the photo's billows, flowing slowly and bent by the air too.
  vec2 p = vUv * uAspect * 3.5 - field.rg * 0.12;
  float t = mod(uTime, 1000.0) * 0.12;
  vec2 q = vec2(fbm(p + vec2(t, -t * 0.5)), fbm(p + vec2(5.2 - t * 0.4, 1.3)));
  float wisps = smoothstep(0.22, 0.88, fbm(p * 1.7 + 2.2 * q));
  // Lit by the light: warmer and brighter near it.
  float puff = clamp(smoke * (0.45 + 0.55 * wisps) * stirred, 0.0, 1.0) * ${STRENGTH.toFixed(3)} * (1.0 + 0.6 * lit);
  color += mix(vec3(${TONE.map(c => c.toFixed(3)).join(', ')}), light, 0.55 * lit) * puff;
  alpha += puff;
  }

  // Dither by a fraction of a level where anything shows, so the faint falloff has no steps.
  color += (hash(gl_FragCoord.xy + floor(uTime * 60.0) * 7.0) - 0.5) / 255.0 * step(0.002, alpha);
  alpha = clamp(alpha, 0.0, 1.0);
  gl_FragColor = vec4(clamp(color, 0.0, alpha), alpha);
}
`;

export function startKnowledgeSmoke(scene) {
  if (!scene) return;
  const stage = scene.querySelector('.knowledge__stage');
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  const canvas = document.createElement('canvas');
  canvas.className = 'knowledge__smoke';
  canvas.setAttribute('aria-hidden', 'true');
  const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false });
  if (!gl) return;
  let program;
  try {
    program = createProgram(gl, VERT, FRAG);
  } catch (error) {
    console.warn('Knowledge smoke disabled:', error);
    return;
  }
  const u = name => gl.getUniformLocation(program, name);
  const uTime = u('uTime'), uAspect = u('uAspect'), uLight = u('uLight'), uSigma = u('uSigma');
  gl.uniform1i(u('uTex'), 0);
  gl.uniform1i(u('uFlow'), 1);
  const flow = createFlow(gl, { mode: 'trace', hand: .07, calm: 1.2, lay: 5, full: .35, fade: .5 });
  if (!flow) return;
  gl.useProgram(program);

  // First in the section: beneath its content, over its ground.
  scene.prepend(canvas);
  canvas.style.visibility = 'hidden';

  function size() {
    const w = Math.max(1, Math.round(canvas.clientWidth * SCALE));
    const h = Math.max(1, Math.round(canvas.clientHeight * SCALE));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    flow.resize(w / h);
  }

  const pointer = trackPointer(scene, canvas);
  let ready = false, visible = false, frame = 0, lastNow = 0, lastMove = -Infinity, lastPlace = '';

  function render(now) {
    frame = 0;
    const time = now / 1000;
    const dt = Math.min(1 / 30, Math.max(1 / 240, (now - lastNow) / 1000 || 1 / 60));
    lastNow = now;
    const push = pointer.push(dt);
    if (push) lastMove = now;
    const still = now - lastMove > IDLE;
    const shine = parseFloat(stage.style.getPropertyValue('--lantern-opacity')) || 0;

    flow.step(dt, time, push);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    if (still && !shine) {
      // All gone: leave nothing behind and stop.
      canvas.style.visibility = 'hidden';
      lastNow = 0;
      return;
    }
    // The light, from the stage's artboard px to this canvas's uv.
    const box = canvas.getBoundingClientRect();
    const frameBox = stage.getBoundingClientRect();
    const k = frameBox.width / 1440;
    const lx = parseFloat(stage.style.getPropertyValue('--lantern-x')) || 0;
    const ly = parseFloat(stage.style.getPropertyValue('--lantern-y')) || 0;
    gl.useProgram(program);
    gl.uniform3f(uLight,
      (frameBox.left + lx * k - box.left) / box.width,
      1 - (frameBox.top + ly * k - box.top) / box.height,
      shine);
    gl.uniform1f(uSigma, REACH * .4 * k / box.height);
    canvas.style.visibility = '';
    gl.useProgram(program);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, flow.texture());
    gl.activeTexture(gl.TEXTURE0);
    gl.uniform2f(uAspect, canvas.width / canvas.height, 1);
    gl.uniform1f(uTime, time);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    // Runs on while smoke is left or the light is still moving (it follows the pointer, eased,
    // and fades as the pointer leaves). Once it has settled under a still pointer with no smoke
    // left, the last frame stays shown until something moves again.
    const place = `${lx} ${ly} ${shine}`;
    const settled = still && place === lastPlace;
    lastPlace = place;
    if (visible && !settled) frame = requestAnimationFrame(render);
    else lastNow = 0;
  }
  const run = () => { if (ready && visible && !frame) frame = requestAnimationFrame(render); };

  scene.addEventListener('pointermove', event => {
    if (event.pointerType === 'touch') return;
    lastMove = performance.now();
    run();
  });
  // The light eases out as the pointer leaves.
  scene.addEventListener('pointerleave', run);
  // The section moves under a still pointer as the page scrolls, and the light follows it there.
  addEventListener('scroll', () => { pointer.reset(); run(); }, { passive: true });
  addEventListener('resize', () => { if (ready) size(); });
  new IntersectionObserver(entries => {
    visible = entries.some(entry => entry.isIntersecting);
    run();
  }).observe(scene);

  gl.activeTexture(gl.TEXTURE0);
  const photo = document.querySelector('img.hero__atmosphere');
  loadSmokeTexture(gl, photo?.currentSrc || photo?.src || 'assets/hero/atmosphere.avif', () => {
    size();
    ready = true;
    // From here the light is drawn here, with the smoke.
    scene.classList.add('has-smoke-light');
    run();
  });
}
