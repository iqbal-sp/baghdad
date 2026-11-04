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
 * a new colour. The loop runs while the section is on screen and smoke is still there, and stops
 * IDLE after the last move.
 */

const SCALE = .5;          // canvas px per CSS px: smoke is soft
const IDLE = 9000;         // ms after the last move when the last of the smoke has gone
const TONE = [0.93, 0.80, 0.66];
const STRENGTH = 0.42;     // the most it adds, at full smoke

const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 vUv;
uniform sampler2D uFlow;
uniform vec2 uAspect;
${SMOKE_GLSL}
void main() {
  vec4 field = texture2D(uFlow, vUv);
  float stirred = field.b;
  if (stirred < 0.003) { gl_FragColor = vec4(0.0); return; }
  // The photo's 3 : 2 cropped to the section's shape about its centre, and bent a little by the
  // moving air so the wisps swirl with it.
  vec2 uv = vec2(0.5 + (vUv.x - 0.5) * min(1.0, uAspect.x / 1.5), 0.5 + (vUv.y - 0.5) * min(1.0, 1.5 / uAspect.x));
  float smoke = 0.35 + 0.65 * smokeAt(uv - field.rg * 0.05);
  // Finer wisps over it, so a sweep leaves curling threads of smoke, not a haze: domain-warped
  // noise a few times smaller than the photo's billows, flowing slowly and bent by the air too.
  vec2 p = vUv * uAspect * 3.5 - field.rg * 0.12;
  float t = mod(uTime, 1000.0) * 0.12;
  vec2 q = vec2(fbm(p + vec2(t, -t * 0.5)), fbm(p + vec2(5.2 - t * 0.4, 1.3)));
  float wisps = smoothstep(0.32, 0.78, fbm(p * 1.7 + 2.2 * q));
  float alpha = clamp(smoke * (0.25 + 0.75 * wisps) * stirred, 0.0, 1.0) * ${STRENGTH.toFixed(3)};
  gl_FragColor = vec4(vec3(${TONE.map(c => c.toFixed(3)).join(', ')}) * alpha, alpha);
}
`;

export function startKnowledgeSmoke(scene) {
  if (!scene) return;
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
  const uTime = u('uTime'), uAspect = u('uAspect');
  gl.uniform1i(u('uTex'), 0);
  gl.uniform1i(u('uFlow'), 1);
  const flow = createFlow(gl, { mode: 'trace', hand: .06, calm: 1.2, lay: 10, full: .25, fade: .45 });
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
  let ready = false, visible = false, frame = 0, lastNow = 0, lastMove = -Infinity;

  function render(now) {
    frame = 0;
    const time = now / 1000;
    const dt = Math.min(1 / 30, Math.max(1 / 240, (now - lastNow) / 1000 || 1 / 60));
    lastNow = now;
    const push = pointer.push(dt);
    if (push) lastMove = now;
    const still = now - lastMove > IDLE;

    flow.step(dt, time, push);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    if (still) {
      // All gone: leave nothing behind and stop.
      canvas.style.visibility = 'hidden';
      lastNow = 0;
      return;
    }
    canvas.style.visibility = '';
    gl.useProgram(program);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, flow.texture());
    gl.activeTexture(gl.TEXTURE0);
    gl.uniform2f(uAspect, canvas.width / canvas.height, 1);
    gl.uniform1f(uTime, time);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    if (visible) frame = requestAnimationFrame(render);
    else lastNow = 0;
  }
  const run = () => { if (ready && visible && !frame) frame = requestAnimationFrame(render); };

  scene.addEventListener('pointermove', event => {
    if (event.pointerType === 'touch') return;
    lastMove = performance.now();
    run();
  });
  // The section moves under a still pointer as the page scrolls.
  addEventListener('scroll', () => pointer.reset(), { passive: true });
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
    run();
  });
}
