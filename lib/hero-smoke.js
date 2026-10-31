/**
 * Flowing hero smoke.
 *
 * The hero's atmosphere is a photo of smoke colour-dodged over the sky (Figma 108:13410).
 * A still photo never reads as smoke, so this draws the same photo into a WebGL canvas
 * and bends it with slowly flowing, domain-warped noise: the wisps billow and thicken
 * or thin in place while the picture keeps the Figma composition. The canvas takes the
 * image's place (same box, opacity and blend), and the image stays as the fallback for
 * no WebGL and reduced motion. The loop only runs while the hero is on screen.
 */

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

// highp + a sin-free hash, as in lib/smoke.js (mediump noise turns blocky on Apple GPUs).
const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform sampler2D uTex;
uniform float uTime;
varying vec2 vUv;

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
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * noise(p); p = p * 2.03 + vec2(17.0, 9.0); a *= 0.5; }
  return v;
}

void main() {
  vec2 p = vUv * vec2(3.0, 2.0);  // the photo is 3 : 2
  float t = mod(uTime, 1000.0) * 0.16;

  // Domain-warped flow: drifts sideways and slightly up, like smoke rising in still air.
  vec2 q = vec2(fbm(p + vec2(t, -t * 0.4)), fbm(p + vec2(5.2 - t * 0.7, 1.3 + t * 0.5)));
  vec2 r = vec2(fbm(p * 1.6 + 2.0 * q + vec2(1.7, 9.2) + t * 0.6),
                fbm(p * 1.6 + 2.0 * q + vec2(8.3, 2.8) - t * 0.45));

  // Bend the photo by up to ±5% of its size and let the whole bank sway ±1% sideways;
  // sampling 12% in from the edges keeps every displaced lookup inside the picture.
  vec2 sway = vec2(sin(t * 0.6) * 0.01, 0.0);
  vec2 uv = 0.5 + (vUv - 0.5) * 0.88 + (r - 0.5) * 0.1 + sway;
  float smoke = texture2D(uTex, uv).r;

  // Density breathes around 1 so the average brightness matches the still photo.
  float density = 0.72 + 0.56 * fbm(p * 1.2 + q * 1.5 + vec2(0.0, -t * 1.2));
  gl_FragColor = vec4(vec3(smoke * density), 1.0);
}
`;

function compile(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
  return shader;
}

/** Returns { setActive(onScreen) } — a no-op when WebGL is unavailable or motion is reduced. */
export function startHeroSmoke(hero) {
  const off = { setActive() {} };
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
    program = gl.createProgram();
    gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
  } catch (error) {
    console.warn('Hero smoke disabled:', error);
    return off;
  }
  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(program, 'aPos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
  const uTime = gl.getUniformLocation(program, 'uTime');

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
  const start = performance.now();

  function render(now) {
    gl.uniform1f(uTime, (now - start) / 1000);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
  function loop(now) {
    render(now);
    frame = active ? requestAnimationFrame(loop) : 0;
  }
  const run = () => { if (ready && active && !frame) frame = requestAnimationFrame(loop); };

  const source = new Image();
  source.addEventListener('load', () => {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, gl.LUMINANCE, gl.UNSIGNED_BYTE, source);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    size();
    // First frame now, so the swap from the still photo is seamless.
    render(performance.now());
    image.classList.add('is-replaced');
    ready = true;
    run();
  });
  source.src = image.currentSrc || image.src;

  return {
    setActive(onScreen) {
      active = onScreen;
      run();
    },
  };
}
