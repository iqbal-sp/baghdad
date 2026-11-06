/**
 * The letter burns from its centre (not in Figma). One full-view shader, on a canvas over the hall:
 * a hole grows from the middle of the sheet, its edge pushed about by noise so it eats unevenly.
 * Inside the hole is the next section's room, drawn from the same picture at the same place as the
 * page has it, so when the hole fills the view and the canvas goes, nothing changes. Outside it, in
 * order from the hole: a broken line that glows only in stretches, char with pale ash at its lip, and
 * a patchy brown scorch over what has not burned yet. The sheet's edge shades the room below it, and
 * flakes of burnt paper lift off and turn over as they rise. It is meant to be quiet: paper catching
 * slowly, not a fire.
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
  // Round at first, more broken as it grows: a slow tear, smaller bites out of it, and a fine crumble
  // along the edge. All fixed in place, so the edge eats forward and does not swim.
  vec2 unit = at / reach;
  float tear = fbm(unit * 2.6 + 4.) - .5;
  float bite = fbm(unit * 9.5 + 9.) - .5;
  float crumble = noise(unit * 58.) * .6 + noise(unit * 130.) * .4 - .5;
  float grown = smoothstep(0., .3, d);
  float near = smoothstep(0., .08, d);
  float field = d + tear * .2 * grown + bite * .075 * near + crumble * .02 * near;
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
    // The room, seen through a hole in a sheet that lies over it: the sheet's edge shades it a little.
    color = vec4(room.rgb * (1. - .42 * exp(e * 34.)), 1.);
    return;
  }
  // The burning line is not a ring: it glows in stretches, and is dead char in between.
  float stretch = smoothstep(.4, .6, fbm(unit * 6. + 31.));
  float flicker = .86 + .14 * noise(unit * 26. + vec2(time * .8, -time * .5));
  float width = .012 + .022 * (bite + .5);       // how far the char reaches varies along the edge
  vec3 ash = vec3(.34, .31, .28);
  vec3 tone;
  float alpha = 1.;
  if (e < width) {
    float t = e / width;
    tone = ${CHAR} * (.75 + 1.1 * (crumble + .5));
    // Pale ash crumbling at the very lip, where it is dead.
    tone = mix(tone, ash, smoothstep(.52, .7, noise(unit * 74.)) * (1. - smoothstep(.1, .55, t)) * (1. - stretch));
    // The live edge.
    float hot = (1. - smoothstep(0., .26, t)) * stretch * flicker;
    tone = mix(tone, mix(vec3(.82, .22, .05), vec3(1., .66, .3), 1. - smoothstep(0., .1, t)), hot);
  } else {
    // Scorch, patchy, browning the paper before it goes.
    float t = clamp((e - width) / .085 + (bite + tear) * .55, 0., 1.);
    tone = mix(${CHAR}, vec3(.34, .17, .07), smoothstep(0., .55, t));
    alpha = pow(1. - t, 1.5) * .9;
  }
  color = vec4(tone * alpha, alpha);
}`;

// Flakes of burnt paper, lifting off the edge and turning over as they rise, with a few sparks among
// them. Each is a small irregular scrap; a young one still glows round its rim.
const SPARK_V = `#version 300 es
in vec4 seed;
uniform vec2 view, centre;
uniform float reach, p, ratio, scale;
out float life;
out float spin;
out float turn;
out float shape;
out float spark;
float level(float q) { return -.22 + 1.6 * pow(q, 1.35); }
void main() {
  float born = seed.x * .92;
  float span = .12 + .2 * seed.y;
  float age = (p - born) / span;
  gl_Position = vec4(-2.);
  gl_PointSize = 0.;
  life = 0.;
  spin = 0.; turn = 0.; shape = 0.; spark = 0.;
  if (age < 0. || age > 1. || level(born) < .03) return;
  float angle = seed.z * 6.2832;
  vec2 at = centre + vec2(cos(angle), sin(angle)) * level(born) * reach;
  float rise = (pow(age, 1.3)) * (60. + 150. * seed.w) * scale;
  at += vec2(sin(age * 4. + seed.z * 40.) * 26. * age * scale + cos(angle) * age * 30. * scale, -rise);
  life = age;
  spin = seed.y * 6.28 + age * (3. + 7. * seed.w);
  turn = age * (5. + 9. * seed.y) + seed.w * 6.28;
  shape = seed.z * 40.;
  spark = step(.82, seed.w);
  gl_Position = vec4(at.x / view.x * 2. - 1., 1. - at.y / view.y * 2., 0., 1.);
  float size = spark > .5 ? 2.2 : 5. + 9. * seed.y;
  gl_PointSize = size * ratio * max(scale, .75) * (1. - age * .25);
}`;

const SPARK_F = `#version 300 es
precision mediump float;
in float life;
in float spin;
in float turn;
in float shape;
in float spark;
out vec4 color;
void main() {
  vec2 q = (gl_PointCoord - .5) * 2.;
  float fade = 1. - smoothstep(.65, 1., life);
  if (spark > .5) {
    float a = (1. - smoothstep(.2, 1., length(q))) * fade * .8;
    color = vec4(vec3(1., .6, .22) * a, 0.);
    return;
  }
  float c = cos(spin), s = sin(spin);
  q = vec2(c * q.x - s * q.y, s * q.x + c * q.y);
  q.y /= max(.22, abs(cos(turn)));      // turning over
  float a = atan(q.y, q.x);
  float edge = .62 + .2 * sin(a * 3. + shape) + .13 * sin(a * 7. + shape * 1.7);
  float d = length(q);
  float body = 1. - smoothstep(edge - .1, edge, d);
  if (body <= 0.) discard;
  float rim = smoothstep(edge - .34, edge - .06, d) * (1. - smoothstep(.1, .5, life));
  vec3 tone = mix(vec3(.05, .03, .022), vec3(.26, .23, .2), smoothstep(.3, .9, life));
  color = vec4(tone * body * fade, body * fade * .92);
  color.rgb += vec3(1., .42, .1) * rim * body * fade;
}`;

const COUNT = 100;

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
