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
 * The cursor moves through it like a hand through smoke (fine pointers only). A small flow
 * field (FLOW texels across, half-float, ping-ponged on the GPU) holds the air's velocity and
 * how far it has carried the smoke. Each frame the field is carried along by itself, the
 * pointer drags the air under it towards its own speed along the whole path it moved, a
 * slowly changing noise turns the moving air this way and that, breaking it into eddies, and the velocity dies away while the
 * smoke drifts back into place. The smoke is drawn displaced by that offset, so moving the
 * mouse pushes the wisps aside, they curl in behind it, and settle again over a few seconds,
 * thinning slightly where the air moves fastest. Without half-float render targets the smoke
 * just flows on, untouched.
 */

// Flow field: texels across; the hand's radius (share of the photo's height); how fast the
// air under it takes the pointer's speed, its velocity dies away, and the smoke drifts back
// (per second); the most the smoke is carried (photo uv); how fast the moving air turns
// (radians per second at most).
const FLOW = 160;
const HAND = .07;
const GRIP = 18;
const CALM = 1.4;
const SETTLE = .55;
const REACH = .09;
const SWIRL = 6;

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

// One step of the flow field: rg = air velocity (photo uv per second, y up), ba = how far the
// smoke has been carried (photo uv).
const STEP = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 vUv;
uniform sampler2D uFlow;
uniform float uDt;
uniform float uTime;
uniform vec2 uAspect;   // (width / height, 1): distances in units of the photo's height
uniform vec2 uFrom;     // the pointer's path this frame, photo uv
uniform vec2 uTo;
uniform vec2 uPush;     // the pointer's velocity, photo uv per second
uniform float uGrip;    // 0 while the pointer is still or away

float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

void main() {
  // Carried along by itself (semi-Lagrangian).
  vec2 here = texture2D(uFlow, vUv).rg;
  vec4 field = texture2D(uFlow, vUv - here * uDt);
  vec2 velocity = field.rg * exp(-uDt * ${CALM.toFixed(2)});
  vec2 carried = field.ba;

  // The hand: the air within reach of the pointer's path takes on its speed.
  vec2 pa = (vUv - uFrom) * uAspect;
  vec2 ba = (uTo - uFrom) * uAspect;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-8), 0.0, 1.0);
  vec2 off = pa - ba * h;
  float touch = exp(-dot(off, off) / ${(HAND * HAND).toFixed(5)}) * uGrip;
  velocity += (uPush - velocity) * touch * (1.0 - exp(-uDt * ${GRIP.toFixed(1)}));

  // Moving air breaks into eddies: its direction turns this way or that by a slowly changing
  // noise, which curls the wake without ever adding speed (adding it would feed on itself).
  float turn = (noise(vUv * uAspect * 6.0 + vec2(uTime * 0.2, -uTime * 0.13)) - 0.5) * 2.0 * ${SWIRL.toFixed(1)} * uDt;
  vec2 v = velocity * uAspect;
  v = vec2(v.x * cos(turn) - v.y * sin(turn), v.x * sin(turn) + v.y * cos(turn));
  velocity = v / uAspect;

  // The smoke goes where the air takes it, then drifts back into place.
  carried = (carried + velocity * uDt) * exp(-uDt * ${SETTLE.toFixed(2)});
  float reach = length(carried * uAspect);
  if (reach > ${REACH.toFixed(2)}) carried *= ${REACH.toFixed(2)} / reach;

  gl_FragColor = vec4(velocity, carried);
}
`;

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
  const flow = touchable ? createFlow(gl) : null;
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

  // The pointer, in photo uv (y up), and where it was at the last step.
  let pointer = null, previous = null;
  if (flow) {
    hero.addEventListener('pointermove', event => {
      const rect = canvas.getBoundingClientRect();
      pointer = { u: (event.clientX - rect.left) / rect.width, v: 1 - (event.clientY - rect.top) / rect.height };
    });
    hero.addEventListener('pointerleave', () => { pointer = previous = null; });
  }

  function render(now) {
    const time = now / 1000;
    const dt = Math.min(1 / 30, Math.max(1 / 240, (now - lastNow) / 1000 || 1 / 60));
    lastNow = now;
    if (flow) {
      let push = null;
      if (pointer && previous) {
        const du = (pointer.u - previous.u) / dt, dv = (pointer.v - previous.v) / dt;
        // A resting pointer holds nothing back; the air under it just goes on.
        if (Math.hypot(du, dv) > .01) {
          const cap = Math.min(1, 2.5 / Math.hypot(du, dv));
          push = { from: previous, to: pointer, du: du * cap, dv: dv * cap };
        }
      }
      previous = pointer && { ...pointer };
      flow.step(dt, time, push);
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

/**
 * The flow field: two half-float textures stepped in turn, FLOW texels across. Null when the
 * GPU cannot render to (and filter) half floats.
 */
function createFlow(gl) {
  const half = gl.getExtension('OES_texture_half_float');
  if (!half || !gl.getExtension('OES_texture_half_float_linear')) return null;
  let program;
  try {
    program = createProgram(gl, VERT, STEP);
  } catch (error) {
    console.warn('Hero smoke touch disabled:', error);
    return null;
  }
  const u = name => gl.getUniformLocation(program, name);
  const at = {
    dt: u('uDt'), time: u('uTime'), aspect: u('uAspect'),
    from: u('uFrom'), to: u('uTo'), push: u('uPush'), grip: u('uGrip'),
  };
  gl.uniform1i(u('uFlow'), 1);

  let width = 0, height = 0, aspect = 1, read = null, write = null;

  function target() {
    const texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, half.HALF_FLOAT_OES, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const buffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, buffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    // Starts still: no velocity, nothing carried.
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    const complete = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.activeTexture(gl.TEXTURE0);
    return complete ? { texture, buffer } : null;
  }

  function resize(ratio) {
    const w = FLOW, h = Math.max(1, Math.round(FLOW / ratio));
    aspect = ratio;
    if (w === width && h === height) return;
    for (const old of [read, write]) {
      if (!old) continue;
      gl.deleteTexture(old.texture);
      gl.deleteFramebuffer(old.buffer);
    }
    width = w; height = h;
    read = target();
    write = target();
  }
  resize(16 / 9);
  if (!read || !write) return null;

  return {
    resize,
    texture: () => read.texture,
    step(dt, time, push) {
      gl.useProgram(program);
      gl.bindFramebuffer(gl.FRAMEBUFFER, write.buffer);
      gl.viewport(0, 0, width, height);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, read.texture);
      gl.activeTexture(gl.TEXTURE0);
      gl.uniform1f(at.dt, dt);
      gl.uniform1f(at.time, time);
      gl.uniform2f(at.aspect, aspect, 1);
      gl.uniform2f(at.from, push?.from.u ?? -9, push?.from.v ?? -9);
      gl.uniform2f(at.to, push?.to.u ?? -9, push?.to.v ?? -9);
      gl.uniform2f(at.push, push?.du ?? 0, push?.dv ?? 0);
      gl.uniform1f(at.grip, push ? 1 : 0);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      [read, write] = [write, read];
    },
  };
}
