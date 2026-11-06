/**
 * The letter burns from its centre (not in Figma). One full-view shader, on a canvas over the hall:
 * a hole grows from the middle of the sheet, its edge pushed about by noise so it eats unevenly.
 * Inside the hole is the next section's room, drawn from the same picture at the same place as the
 * page has it, so when the hole fills the view and the canvas goes, nothing changes. Outside it, in
 * order from the hole: a thin hot line, a little char, and a brown scorch that fades away over what
 * has not burned yet, so the paper browns before it goes. A few sparks lift off the edge. It is meant
 * to be quiet: paper catching slowly, not a fire.
 *
 * Everything is a function of the scroll (p, 0 to 1), so it runs both ways; only the embers' flicker
 * keeps time, and that only while the burn is on screen.
 */

const CHAR = 'vec3(.055, .028, .018)';

const QUAD = `#version 300 es
in vec2 corner;
void main() { gl_Position = vec4(corner, 0., 1.); }`;

const FIRE = `#version 300 es
precision highp float;
uniform vec2 view, centre;
uniform vec4 rect;
uniform float reach, level, time, ratio;
uniform sampler2D scene;
out vec4 color;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3. - 2. * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p) {
  float sum = 0., size = .5;
  for (int i = 0; i < 5; i++) { sum += size * noise(p); p = p * 2.03 + 17.1; size *= .5; }
  return sum;
}

void main() {
  vec2 at = vec2(gl_FragCoord.x, view.y * ratio - gl_FragCoord.y) / ratio;
  vec2 off = (at - centre) / reach;
  float d = length(off);
  // Round at first, tearing more as it grows. Ground the noise in place so the edge does not swim.
  float tear = fbm(at / reach * 2.6 + 4.) - .5;
  float fine = fbm(at / reach * 13. + 9.) - .5;
  float grown = smoothstep(0., .3, d);
  float field = d + tear * .2 * grown + fine * .028 * smoothstep(0., .1, d);
  float e = field - level;              // above 0: not burned yet

  vec2 uv = (at - rect.xy) / rect.zw;
  vec4 room = vec4(.09, .024, .004, 1.);
  if (uv.x > 0. && uv.y > 0. && uv.x < 1. && uv.y < 1.) {
    // As the page has it: the picture, its foot fading out, the lamp's glow (.catalogue__room).
    vec3 lit = texture(scene, uv).rgb;
    float r = length((uv - vec2(.5017, .5176)) / vec2(.22, .275));
    vec3 glow = r < .45
      ? mix(vec3(1., .659, .329) * .3, vec3(1., .588, .275) * .1, r / .45)
      : mix(vec3(1., .588, .275) * .1, vec3(0.), clamp((r - .45) / .55, 0., 1.));
    lit = 1. - (1. - lit) * (1. - glow * .9);
    room.rgb = mix(lit, room.rgb, clamp((uv.y - .72) / .28, 0., 1.));
  }

  if (e < 0.) {
    // The room, lit by the fire around the hole.
    float heat = exp(e * 26.);
    color = vec4(room.rgb + vec3(1., .5, .2) * heat * .09, 1.);
    return;
  }
  float flicker = .9 + .1 * noise(at / 14. + vec2(time * .9, -time * .6));
  vec3 tone;
  float alpha;
  if (e < .0035) { tone = mix(vec3(.98, .72, .4), vec3(.86, .36, .1), e / .0035) * flicker; alpha = 1.; }
  else if (e < .011) { tone = mix(vec3(.86, .36, .1), vec3(.3, .07, .02), (e - .0035) / .0075) * flicker; alpha = 1.; }
  else if (e < .03) { tone = mix(vec3(.3, .07, .02), ${CHAR}, (e - .011) / .019); alpha = 1.; }
  else {
    float t = clamp((e - .03) / .11, 0., 1.);
    tone = mix(${CHAR}, vec3(.3, .15, .06), smoothstep(0., .6, t));
    alpha = pow(1. - t, 1.5) * .9;
  }
  color = vec4(tone * alpha, alpha);
}`;

const SPARK_V = `#version 300 es
in vec4 seed;
uniform vec2 view, centre;
uniform float reach, p, ratio, scale;
out float glow;
float level(float q) { return -.22 + 1.6 * pow(q, 1.35); }
void main() {
  float born = seed.x * .9;
  float life = .1 + .14 * seed.y;
  float age = (p - born) / life;
  gl_Position = vec4(-2.);
  gl_PointSize = 0.;
  glow = 0.;
  if (age < 0. || age > 1. || level(born) < .02) return;
  float angle = seed.z * 6.2832;
  float r = level(born) * reach;
  vec2 at = centre + vec2(cos(angle), sin(angle)) * r;
  float rise = age * (50. + 110. * seed.w) * scale;
  at += vec2(sin(age * 3.5 + seed.z * 40.) * 12. * age * scale, -rise);
  glow = (1. - age) * (1. - age) * .55;
  gl_Position = vec4(at.x / view.x * 2. - 1., 1. - at.y / view.y * 2., 0., 1.);
  gl_PointSize = (1. + 1.4 * seed.y) * ratio * (1. - age * .5) * max(scale, .7);
}`;

const SPARK_F = `#version 300 es
precision mediump float;
in float glow;
out vec4 color;
void main() {
  float d = length(gl_PointCoord - .5) * 2.;
  float a = smoothstep(1., .2, d) * glow;
  color = vec4(vec3(1., .62, .22) * a, a);
}`;

const COUNT = 36;

function program(gl, vertex, fragment) {
  const made = gl.createProgram();
  for (const [type, source] of [[gl.VERTEX_SHADER, vertex], [gl.FRAGMENT_SHADER, fragment]]) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    gl.attachShader(made, shader);
  }
  gl.linkProgram(made);
  return gl.getProgramParameter(made, gl.LINK_STATUS) ? made : null;
}

const names = (gl, made, list) => Object.fromEntries(list.map(name => [name, gl.getUniformLocation(made, name)]));

export function startBurn(canvas, picture) {
  const gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, powerPreference: 'high-performance' });
  if (!gl) return null;
  const fire = program(gl, QUAD, FIRE);
  const sparks = program(gl, SPARK_V, SPARK_F);
  if (!fire || !sparks) return null;
  const fireAt = names(gl, fire, ['view', 'centre', 'rect', 'reach', 'level', 'time', 'ratio', 'scene']);
  const sparkAt = names(gl, sparks, ['view', 'centre', 'reach', 'p', 'ratio', 'scale']);

  const quad = gl.createVertexArray();
  gl.bindVertexArray(quad);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(gl.getAttribLocation(fire, 'corner'));
  gl.vertexAttribPointer(gl.getAttribLocation(fire, 'corner'), 2, gl.FLOAT, false, 0, 0);

  const dots = gl.createVertexArray();
  gl.bindVertexArray(dots);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  const seeds = new Float32Array(COUNT * 4);
  let s = 7;
  const random = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  for (let i = 0; i < seeds.length; i++) seeds[i] = random();
  gl.bufferData(gl.ARRAY_BUFFER, seeds, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(gl.getAttribLocation(sparks, 'seed'));
  gl.vertexAttribPointer(gl.getAttribLocation(sparks, 'seed'), 4, gl.FLOAT, false, 0, 0);

  let ready = false;
  async function prepare() {
    if (ready) return;
    picture.loading = 'eager';
    await picture.decode().catch(() => {});
    gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, picture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.enable(gl.BLEND);
    gl.clearColor(0, 0, 0, 0);
    ready = true;
  }

  let frame = 0, state = null;

  function draw(now) {
    frame = 0;
    if (!state || !ready) return;
    const { p, centre, rect, scale } = state;
    const view = [canvas.clientWidth, canvas.clientHeight];
    const ratio = Math.min(devicePixelRatio || 1, 1.5);
    const width = Math.round(view[0] * ratio), height = Math.round(view[1] * ratio);
    if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
    gl.viewport(0, 0, width, height);
    gl.clear(gl.COLOR_BUFFER_BIT);
    const reach = Math.hypot(Math.max(centre[0], view[0] - centre[0]), Math.max(centre[1], view[1] - centre[1]));
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(fire);
    gl.bindVertexArray(quad);
    gl.uniform2f(fireAt.view, view[0], view[1]);
    gl.uniform2f(fireAt.centre, centre[0], centre[1]);
    gl.uniform4f(fireAt.rect, ...rect);
    gl.uniform1f(fireAt.reach, reach);
    gl.uniform1f(fireAt.level, -.22 + 1.6 * p ** 1.35);
    gl.uniform1f(fireAt.time, now / 1000);
    gl.uniform1f(fireAt.ratio, ratio);
    gl.uniform1i(fireAt.scene, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.useProgram(sparks);
    gl.bindVertexArray(dots);
    gl.uniform2f(sparkAt.view, view[0], view[1]);
    gl.uniform2f(sparkAt.centre, centre[0], centre[1]);
    gl.uniform1f(sparkAt.reach, reach);
    gl.uniform1f(sparkAt.p, p);
    gl.uniform1f(sparkAt.ratio, ratio);
    gl.uniform1f(sparkAt.scale, scale);
    gl.drawArrays(gl.POINTS, 0, COUNT);
    frame = requestAnimationFrame(draw);
  }

  return {
    prepare,
    // `held`: past the end, the canvas stays up, full, until the hall behind it has gone.
    set(p, held, centre, rect, scale) {
      const on = p > 0 && held;
      canvas.style.visibility = on ? 'visible' : 'hidden';
      state = on ? { p, centre, rect, scale } : null;
      if (on && !frame) frame = requestAnimationFrame(draw);
    },
  };
}
