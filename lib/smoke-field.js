/**
 * One smoke for the hero and the hero → story slide.
 *
 * The hero's flowing smoke (lib/hero-smoke.js) and the smoke over the seam (lib/smoke.js)
 * both draw the same atmosphere photo through this same flow, on the same clock and in
 * the same photo coordinates, so where the hero fades the transition carries on the very
 * same bank of smoke instead of cutting it off.
 */

// highp + a sin-free hash: on Apple GPUs Chrome runs mediump as 16-bit floats, and the
// classic fract(sin(x) * 43758.5) hash then turns into blocky noise that jumps between frames.
export const SMOKE_GLSL = `
uniform sampler2D uTex;
uniform float uTime;  // seconds since the page loaded, shared by both canvases

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
  for (int i = 0; i < 4; i++) { v += a * noise(p); p = p * 2.03 + vec2(17.0, 9.0); a *= 0.5; }
  return v;
}

// Smoke brightness (0–1) at a photo uv; colour-dodged over the dark sky it reads as the Figma smoke.
float smokeAt(vec2 uv) {
  vec2 p = uv * vec2(3.0, 2.0);  // the photo is 3 : 2
  float t = mod(uTime, 1000.0) * 0.16;

  // Domain-warped flow: drifts sideways and slightly up, like smoke rising in still air.
  vec2 q = vec2(fbm(p + vec2(t, -t * 0.4)), fbm(p + vec2(5.2 - t * 0.7, 1.3 + t * 0.5)));
  vec2 r = vec2(fbm(p * 1.6 + 2.0 * q + vec2(1.7, 9.2) + t * 0.6),
                fbm(p * 1.6 + 2.0 * q + vec2(8.3, 2.8) - t * 0.45));

  // Bend the photo by up to ±5% of its size and let the whole bank sway ±1% sideways;
  // sampling 12% in from the edges keeps every displaced lookup inside the picture.
  vec2 warp = (r - 0.5) * 0.1 + vec2(sin(t * 0.6) * 0.01, 0.0);
  float smoke = texture2D(uTex, 0.5 + (uv - 0.5) * 0.88 + warp).r;

  // Density breathes around 1 so the average brightness matches the still photo.
  float density = 0.72 + 0.56 * fbm(p * 1.2 + q * 1.5 + vec2(0.0, -t * 1.2));
  return clamp(smoke * density, 0.0, 1.0);
}
`;

export function createProgram(gl, vertex, fragment) {
  const compile = (type, source) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
    return shader;
  };
  const program = gl.createProgram();
  gl.attachShader(program, compile(gl.VERTEX_SHADER, vertex));
  gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragment));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(program, 'aPos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
  return program;
}

/** Loads the atmosphere photo as a greyscale texture; calls onReady once it is on the GPU. */
export function loadSmokeTexture(gl, src, onReady) {
  const source = new Image();
  source.addEventListener('load', () => {
    gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, gl.LUMINANCE, gl.UNSIGNED_BYTE, source);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    onReady();
  });
  source.src = src;
}

/**
 * The photo's box in hero coordinates (CSS px, from the hero's top left). The hero and its
 * photo slide together, so this only changes with the viewport.
 */
export function measureSmoke(hero) {
  const photo = hero.querySelector('img.hero__atmosphere');
  const frame = hero.getBoundingClientRect();
  const rect = photo.getBoundingClientRect();
  const box = { left: rect.left - frame.left, top: rect.top - frame.top, width: rect.width, height: rect.height };
  return { box, src: photo.currentSrc || photo.src };
}
