/**
 * Warm smoke that rolls across the hero → story seam while the track slides.
 *
 * A full-viewport WebGL canvas draws domain-warped fBm noise inside a soft band
 * that follows the seam (the story's left edge sits at x = 1 − progress). Its
 * strength peaks mid-slide and is zero at rest, so both panels still match
 * Figma when settled. The loop only runs while smoke is visible.
 */

const VERT = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

// highp + a sin-free hash: on Apple GPUs Chrome runs mediump as 16-bit floats, and the
// classic fract(sin(x) * 43758.5) hash then turns into blocky noise that jumps between
// frames — visible as glitching over the hero while scrolling.
const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 uRes;
uniform float uTime;
uniform float uSeam;    // seam x in 0–1 of the width
uniform float uAmount;  // 0 at rest, 1 mid-slide
uniform float uDrift;   // scroll-driven drift so the smoke travels with the slide

// Dave Hoskins' hash12: no trigonometry, stable at any precision.
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
  for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.03 + vec2(17.0, 9.0); a *= 0.5; }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 p = vec2(uv.x * uRes.x / uRes.y, uv.y);
  float t = mod(uTime, 600.0) * 0.06;

  // Domain warping gives the curling, billowing look of smoke.
  vec2 q = vec2(fbm(p * 1.4 + vec2(0.0, t) + uDrift), fbm(p * 1.4 + vec2(5.2, -t)));
  vec2 r = vec2(fbm(p * 1.8 + 3.0 * q + vec2(1.7 - t * 0.7, 9.2)), fbm(p * 1.8 + 3.0 * q + vec2(8.3, 2.8 + t * 0.5)));
  float n = fbm(p * 2.2 + 2.4 * r + vec2(uDrift * 1.6, 0.0));

  // Soft band around the seam, its edges eaten away by the noise.
  float dx = uv.x - uSeam + (q.x - 0.5) * 0.18;
  float band = exp(-dx * dx / (2.0 * 0.15 * 0.15));
  float density = smoothstep(0.32, 0.78, n + band * 0.42 - 0.18) * band * uAmount;

  // Dark warm body (matches the #170601 backgrounds) with amber-lit wisps.
  vec3 body = vec3(0.090, 0.024, 0.004);
  vec3 haze = vec3(0.30, 0.15, 0.07);
  vec3 ember = vec3(0.85, 0.48, 0.22);
  vec3 col = mix(body, haze, smoothstep(0.45, 0.9, n));
  col += ember * pow(clamp(r.x * n, 0.0, 1.0), 3.0) * 0.55;

  float alpha = clamp(density, 0.0, 0.94);
  gl_FragColor = vec4(col * alpha, alpha);
}
`;

function compile(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
  return shader;
}

/** Returns { setProgress(p) } — a no-op when WebGL is unavailable or motion is reduced. */
export function createSmoke(canvas) {
  const off = { setProgress() {} };
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return off;
  const gl = canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false });
  if (!gl) return off;

  let program;
  try {
    program = gl.createProgram();
    gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
  } catch (error) {
    console.warn('Smoke transition disabled:', error);
    return off;
  }
  gl.useProgram(program);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(program, 'aPos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
  const u = name => gl.getUniformLocation(program, name);
  const uRes = u('uRes'), uTime = u('uTime'), uSeam = u('uSeam'), uAmount = u('uAmount'), uDrift = u('uDrift');

  // Smoke is soft, so half resolution is plenty and keeps it cheap.
  const SCALE = .5;
  function size() {
    const w = Math.max(1, Math.round(canvas.clientWidth * SCALE));
    const h = Math.max(1, Math.round(canvas.clientHeight * SCALE));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    gl.viewport(0, 0, w, h);
  }
  addEventListener('resize', size);
  size();

  let progress = 0, frame = 0;
  const start = performance.now();
  const amountAt = p => Math.pow(Math.sin(Math.PI * p), .8);

  function draw(now) {
    const amount = amountAt(progress);
    if (amount < .002) {
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      frame = 0;
      return;
    }
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uTime, (now - start) / 1000);
    gl.uniform1f(uSeam, 1 - progress);
    gl.uniform1f(uAmount, amount);
    gl.uniform1f(uDrift, progress * 1.2);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    frame = requestAnimationFrame(draw);
  }

  return {
    setProgress(p) {
      progress = p;
      if (!frame) frame = requestAnimationFrame(draw);
    },
  };
}
