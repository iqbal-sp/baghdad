import { SMOKE_GLSL, createProgram, loadSmokeTexture } from './smoke-field.js';
import { VERT, createFlow, trackPointer } from './smoke-touch.js';

/**
 * Flowing hero smoke.
 *
 * The hero's atmosphere is a photo of smoke colour-dodged over the sky (Figma 108:13410).
 * A still photo never reads as smoke, so this draws the same photo into a WebGL canvas
 * and bends it with slowly flowing, domain-warped noise (lib/smoke-field.js): the wisps
 * billow and thicken or thin in place while the picture keeps the Figma composition.
 * lib/smoke.js carries the same smoke on over the hero's fading edge as the story slides
 * in. The canvas takes the image's place (same box, opacity and blend), and the image
 * stays as the fallback for no WebGL and reduced motion. The loop only runs while the
 * hero is on screen.
 *
 * The cursor moves through it like a hand through smoke (fine pointers only), through the flow
 * field in lib/smoke-touch.js, which holds the air's velocity and how far it has carried the
 * smoke: the pointer drags the air along its path, the moving air curls into eddies and dies
 * away, and the smoke drifts back into place. The smoke is drawn displaced by that offset, so moving the
 * mouse pushes the wisps aside, they curl in behind it, and settle again over a few seconds,
 * thinning slightly where the air moves fastest. Without half-float render targets the smoke
 * just flows on, untouched.
 */

const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 vUv;
uniform sampler2D uFlow;
uniform float uFlowOn;  // 0 without a flow field
uniform vec2 uAspect;
${SMOKE_GLSL}
void main() {
  vec4 field = texture2D(uFlow, vUv) * uFlowOn;
  // Drawn from where the air has carried it from; thinned a little where the air moves fast,
  // as smoke parts around a hand.
  float speed = length(field.rg * uAspect);
  float smoke = smokeAt(vUv - field.ba) * (1.0 - 0.18 * smoothstep(0.05, 0.6, speed));
  gl_FragColor = vec4(vec3(smoke), 1.0);
}
`;

/** Returns { setProgress(slideProgress) } — a no-op when WebGL is unavailable or motion is reduced. */
export function startHeroSmoke(hero) {
  const off = { setProgress() {} };
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return off;

  const image = hero.querySelector('.hero__atmosphere');
  const canvas = document.createElement('canvas');
  canvas.className = 'hero__atmosphere';
  canvas.setAttribute('aria-hidden', 'true');
  // Opaque is fine: black adds nothing under colour-dodge, exactly like the photo.
  const gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false });
  if (!gl) return off;

  let program;
  try {
    program = createProgram(gl, VERT, FRAG);
  } catch (error) {
    console.warn('Hero smoke disabled:', error);
    return off;
  }
  const u = name => gl.getUniformLocation(program, name);
  const uTime = u('uTime'), uFlowOn = u('uFlowOn'), uAspect = u('uAspect');
  gl.uniform1i(u('uTex'), 0);
  gl.uniform1i(u('uFlow'), 1);

  const touchable = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const flow = touchable ? createFlow(gl, { mode: 'carry' }) : null;
  gl.useProgram(program);
  gl.uniform1f(uFlowOn, flow ? 1 : 0);

  image.after(canvas);

  // Soft subject: 60% of CSS pixels keeps the wisps and costs little.
  const SCALE = .6;
  function size() {
    const w = Math.max(1, Math.round(canvas.clientWidth * SCALE));
    const h = Math.max(1, Math.round(canvas.clientHeight * SCALE));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    flow?.resize(w / h);
  }
  addEventListener('resize', size);

  let ready = false, active = true, frame = 0, lastNow = 0;

  // The pointer, in photo uv (y up).
  const pointer = flow ? trackPointer(hero, canvas) : null;

  function render(now) {
    const time = now / 1000;
    const dt = Math.min(1 / 30, Math.max(1 / 240, (now - lastNow) / 1000 || 1 / 60));
    lastNow = now;
    if (flow) {
      flow.step(dt, time, pointer.push(dt));
      gl.useProgram(program);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, flow.texture());
      gl.activeTexture(gl.TEXTURE0);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(uAspect, canvas.width / canvas.height, 1);
    gl.uniform1f(uTime, time);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
  function loop(now) {
    render(now);
    frame = active ? requestAnimationFrame(loop) : 0;
  }
  const run = () => { if (ready && active && !frame) frame = requestAnimationFrame(loop); };

  gl.activeTexture(gl.TEXTURE0);
  loadSmokeTexture(gl, image.currentSrc || image.src, () => {
    size();
    // First frame now, so the swap from the still photo is seamless.
    render(performance.now());
    image.classList.add('is-replaced');
    ready = true;
    run();
  });

  return {
    setProgress(progress) {
      // The hero is fully off screen once the story has settled.
      active = progress < .999;
      run();
    },
  };
}
