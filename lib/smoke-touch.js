import { createProgram } from './smoke-field.js';

/**
 * A hand through smoke: a small flow field on the GPU that a pointer drags along, shared by the
 * hero's smoke (lib/hero-smoke.js) and the knowledge section's (lib/knowledge-smoke.js).
 *
 * Two half-float textures, FLOW texels across, stepped in turn. rg is the air's velocity (uv per
 * second, y up). Each step the field is carried along by itself (semi-Lagrangian); the air within
 * reach of the pointer's path this frame (a capsule from where it was to where it is, Gaussian)
 * is drawn towards the pointer's speed; a slowly changing noise turns the moving air this way and
 * that, so its wake curls into eddies without ever gaining speed (adding speed fed on itself and
 * spread over the whole sky); and the velocity dies away. The other two channels depend on the
 * mode:
 * - 'carry' (ba): how far the air has carried the smoke, drifting back into place and never more
 *   than `reach`. The hero draws its smoke displaced by it.
 * - 'trace' (b): how much smoke the pointer has stirred up there, laid along its path the faster
 *   it moves, carried by the air like the velocity and fading away. The knowledge section shows
 *   smoke only where this is.
 * Null when the GPU cannot render to, and filter, half floats.
 */

export const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

const FLOW = 160;
const DEFAULTS = {
  hand: .07,    // the hand's radius, a share of the height
  grip: 18,     // how fast the air under it takes the pointer's speed (per second)
  calm: 1.4,    // how fast the air's velocity dies away (per second)
  swirl: 6,     // how fast the moving air turns, at most (radians per second)
  settle: .55,  // 'carry': how fast the smoke drifts back (per second)
  reach: .09,   // 'carry': the most it is carried (share of the height)
  lay: 6,       // 'trace': how fast the pointer lays smoke where it passes (per second)
  full: .5,     // 'trace': the pointer speed (heights per second) that lays it fully
  fade: .55,    // 'trace': how fast the smoke fades (per second)
};

const f = value => value.toFixed(5);

function stepShader(mode, o) {
  return `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 vUv;
uniform sampler2D uFlow;
uniform float uDt;
uniform float uTime;
uniform vec2 uAspect;   // (width / height, 1): distances in units of the height
uniform vec2 uFrom;     // the pointer's path this frame, uv
uniform vec2 uTo;
uniform vec2 uPush;     // the pointer's velocity, uv per second
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
  vec2 velocity = field.rg * exp(-uDt * ${f(o.calm)});

  // The hand: the air within reach of the pointer's path takes on its speed.
  vec2 pa = (vUv - uFrom) * uAspect;
  vec2 ba = (uTo - uFrom) * uAspect;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-8), 0.0, 1.0);
  vec2 off = pa - ba * h;
  float touch = exp(-dot(off, off) / ${f(o.hand * o.hand)}) * uGrip;
  velocity += (uPush - velocity) * touch * (1.0 - exp(-uDt * ${f(o.grip)}));

  // Moving air breaks into eddies: its direction turns this way or that by a slowly changing
  // noise, which curls the wake without ever adding speed.
  float turn = (noise(vUv * uAspect * 6.0 + vec2(uTime * 0.2, -uTime * 0.13)) - 0.5) * 2.0 * ${f(o.swirl)} * uDt;
  vec2 v = velocity * uAspect;
  v = vec2(v.x * cos(turn) - v.y * sin(turn), v.x * sin(turn) + v.y * cos(turn));
  velocity = v / uAspect;
${mode === 'carry' ? `
  // The smoke goes where the air takes it, then drifts back into place.
  vec2 carried = (field.ba + velocity * uDt) * exp(-uDt * ${f(o.settle)});
  float reach = length(carried * uAspect);
  if (reach > ${f(o.reach)}) carried *= ${f(o.reach)} / reach;
  gl_FragColor = vec4(velocity, carried);
` : `
  // Smoke stirred up along the pointer's path, more the faster it goes, then fading.
  float sweep = clamp(length(uPush * uAspect) / ${f(o.full)}, 0.0, 1.0);
  float smoke = field.b * exp(-uDt * ${f(o.fade)});
  smoke += (1.0 - smoke) * touch * sweep * (1.0 - exp(-uDt * ${f(o.lay)}));
  gl_FragColor = vec4(velocity, smoke, 0.0);
`}
}
`;
}

/**
 * Returns { resize(aspect), texture(), step(dt, time, push), active() } or null. `push` is
 * { from: {u, v}, to: {u, v}, du, dv } while the pointer moves, else null.
 */
export function createFlow(gl, { mode = 'carry', ...options } = {}) {
  const o = { ...DEFAULTS, ...options };
  const half = gl.getExtension('OES_texture_half_float');
  if (!half || !gl.getExtension('OES_texture_half_float_linear')) return null;
  let program;
  try {
    program = createProgram(gl, VERT, stepShader(mode, o));
  } catch (error) {
    console.warn('Smoke touch disabled:', error);
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
    // Starts still: no velocity, nothing carried or stirred up.
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

/**
 * Tracks a pointer over `element` in the uv of `canvas` (y up), and turns it into each frame's
 * push for createFlow's step: { from, to, du, dv } while it moves, else null.
 */
export function trackPointer(element, canvas) {
  let pointer = null, previous = null;
  element.addEventListener('pointermove', event => {
    if (event.pointerType === 'touch') return;
    const rect = canvas.getBoundingClientRect();
    pointer = { u: (event.clientX - rect.left) / rect.width, v: 1 - (event.clientY - rect.top) / rect.height };
  });
  element.addEventListener('pointerleave', () => { pointer = previous = null; });
  return {
    push(dt) {
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
      return push;
    },
    // Forget where it was (the page scrolled under a still pointer, say), so the next move does
    // not read as a jump from there.
    reset() { pointer = previous = null; },
  };
}
