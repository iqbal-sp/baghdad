import { SMOKE_GLSL, createProgram, loadSmokeTexture } from './smoke-field.js';

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
 * The cursor ripples it (fine pointers only): the pointer lays a short trail of points,
 * and each sends out a thin ring that spreads and fades over a second, bending the smoke
 * slightly and catching a little light, so moving the mouse sweeps soft ripples through it.
 */

// Ripple trail: one point every SPACING ms while the pointer moves, each spent after LIFE ms.
const TRAIL = 16;
const SPACING = 60;
const LIFE = 1000;

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 vUv;
uniform vec4 uStir[${TRAIL}];      // trail points: photo uv (y up), velocity in photo uv per second
uniform float uStirLife[${TRAIL}]; // 1 as a point is laid → 0 once spent
${SMOKE_GLSL}
void main() {
  // Each trail point sends out a thin ring that spreads and fades, like a ripple: it
  // bends the smoke a few pixels outward and catches a little light as it passes. Distances
  // are round (the photo is 3 : 2); overlapping rings never add up past one.
  vec2 offset = vec2(0.0);
  float ripple = 0.0;
  for (int i = 0; i < ${TRAIL}; i++) {
    float life = uStirLife[i];
    if (life <= 0.0) continue;
    vec2 d = (vUv - uStir[i].xy) * vec2(1.5, 1.0);
    float dist = length(d);
    float ring = (dist - (1.0 - life) * 0.11) / 0.012;
    float wave = exp(-ring * ring) * life * life;
    offset += d / max(dist, 0.001) / vec2(1.5, 1.0) * 0.004 * wave;
    // Gently carried the way the cursor went, right on its path.
    offset += uStir[i].zw * 0.012 * exp(-dist * dist / 0.0009) * life;
    ripple += wave;
  }
  float smoke = smokeAt(vUv - offset) * (1.0 + 0.16 * min(ripple, 1.0));
  gl_FragColor = vec4(vec3(min(smoke, 1.0)), 1.0);
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
  const uTime = u('uTime'), uStir = u('uStir'), uStirLife = u('uStirLife');

  image.after(canvas);

  // Soft subject: 60% of CSS pixels keeps the wisps and costs little.
  const SCALE = .6;
  function size() {
    const w = Math.max(1, Math.round(canvas.clientWidth * SCALE));
    const h = Math.max(1, Math.round(canvas.clientHeight * SCALE));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    gl.viewport(0, 0, w, h);
  }
  addEventListener('resize', size);

  let ready = false, active = true, frame = 0;

  // The stir trail, a ring buffer: [u, v, du/s, dv/s] per point and when it was laid.
  const trail = new Float32Array(TRAIL * 4);
  const life = new Float32Array(TRAIL);
  const laidAt = new Float64Array(TRAIL).fill(-Infinity);
  let pointer = null, last = null, next = 0, laid = 0;

  if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
    hero.addEventListener('pointermove', event => { pointer = { x: event.clientX, y: event.clientY }; });
    hero.addEventListener('pointerleave', () => { pointer = last = null; });
  }

  function stir(now) {
    if (pointer && now - laid >= SPACING) {
      const rect = canvas.getBoundingClientRect();
      const u = (pointer.x - rect.left) / rect.width;
      const v = 1 - (pointer.y - rect.top) / rect.height;
      if (last) {
        const dt = Math.max(.016, (now - last.at) / 1000);
        const clampSpeed = value => Math.max(-1.5, Math.min(1.5, value));
        const du = clampSpeed((u - last.u) / dt), dv = clampSpeed((v - last.v) / dt);
        // A resting pointer lays nothing, so the smoke closes up under it.
        if (Math.hypot(du, dv) > .02) {
          trail.set([u, v, du, dv], next * 4);
          laidAt[next] = now;
          next = (next + 1) % TRAIL;
        }
      }
      last = { u, v, at: now };
      laid = now;
    }
    for (let i = 0; i < TRAIL; i++) life[i] = Math.max(0, 1 - (now - laidAt[i]) / LIFE);
    gl.uniform4fv(uStir, trail);
    gl.uniform1fv(uStirLife, life);
  }

  function render(now) {
    gl.uniform1f(uTime, now / 1000);
    stir(now);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
  function loop(now) {
    render(now);
    frame = active ? requestAnimationFrame(loop) : 0;
  }
  const run = () => { if (ready && active && !frame) frame = requestAnimationFrame(loop); };

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
