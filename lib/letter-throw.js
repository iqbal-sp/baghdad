import { whenNear } from './offscreen.js';

/**
 * The closing letter, thrown (Figma 376:189, 376:217). A throw is an event, not a position, so this
 * is the one thing in the hall that does not follow the scroll: the scroll sets it off (want) and
 * it then runs in real time, however fast or slowly the page is moving. Scrolled back, the letter
 * falls out of the view.
 *
 * It is a sheet, not a card: while it flies it is drawn as a bent mesh in WebGL, lit by how it
 * bends, on a canvas over the room. The launch bows it hard, the air stops it and it snaps the
 * other way, then it swings down to its place with less and less in each swing. All of that is
 * damped oscillators at unrelated rates (pose), which is what keeps it from reading as an ease. The
 * mesh ends exactly flat, in the box the DOM letter has at rest, and the DOM letter fades in over
 * it, so the text at rest is real text. Between throws nothing is drawn.
 *
 * Without WebGL2 the DOM letter takes the same pose, unbent.
 */

const HALF = { x: 340, y: 220 };          // the sheet's half size on the stage
const REST = { x: 726.01, y: 472.42, roll: -1.6 };  // at rest, on the stage (.hall__letter)
const FRAME = { width: 1440, height: 964 };
const CAMERA = 1500;                      // stage px from the wall to the eye
const BELOW = 470;                        // stage px under the view's foot it starts: its half diagonal
const FLAT = 1.75;                        // s: every swing has died by now
const END = 2.05;                         // s: the DOM letter has taken over
const DROP = .62;                         // s: the fall out of the view, scrolled back
const SHADOW = 26;                        // stage px from the sheet to its shadow at rest (Figma)
const TEXTURE = 2;                        // texture px to the DOM letter's

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const span = (t, from, to) => clamp((t - from) / (to - from));
const ease = t => t * t * (3 - 2 * t);
const swing = (s, size, decay, rate, phase = 0) => size * Math.exp(-decay * s) * Math.cos(rate * s + phase);

/** Where the sheet is and how it is bent, s seconds into the throw; `fall` is the way out. */
function pose(s, below, fall = 0) {
  const live = 1 - ease(span(s, FLAT - .55, FLAT));
  // Thrown hard from below: a damped spring started with a speed, not let go from rest.
  const lift = Math.exp(-3.9 * s) * (below * Math.cos(4.3 * s) + ((3.9 * below - 3900) / 4.3) * Math.sin(4.3 * s));
  const drop = fall * fall;
  return {
    x: live * swing(s, -96, 2.1, 3.7, .5),
    y: live * lift + drop * (below + 260),
    z: live * 460 * Math.exp(-5.4 * s),
    roll: REST.roll + live * swing(s, 30, 2.5, 4.9, .35) + drop * 22,
    tilt: live * swing(s, 72, 2.7, 6.1) + drop * 58,
    yaw: live * swing(s, -30, 2.3, 4.1, .9),
    curl: live * swing(s, 2.3, 1.9, 7.2, -.9) + fall * .9 * Math.sin(fall * 7),
    axis: .35 + .8 * Math.sin(2.6 * s),
    twist: live * swing(s, .95, 2.1, 5.9, .6) + fall * .3,
    ripple: live * 54 * Math.exp(-2.1 * s) + fall * 14,
    phase: 15 * s,
  };
}

const VERTEX = `#version 300 es
in vec2 grid;
uniform vec2 half_;
uniform mat3 turn;
uniform vec3 place;
uniform vec2 view;
uniform float camera, curl, axis, twist, ripple, phase;
out vec2 uv;
out vec3 normal;

vec3 shape(vec2 g) {
  vec2 p = g * half_;
  vec2 across = vec2(cos(axis), sin(axis));
  float along = dot(p, across);
  vec2 rest = p - across * along;
  // Bent round a cylinder, so the sheet keeps its length as it bows.
  float k = curl / half_.x;
  float bend = abs(k) < 1e-4 ? along : sin(k * along) / k;
  float rise = abs(k) < 1e-4 ? 0. : (1. - cos(k * along)) / k;
  vec3 q = vec3(across * bend + rest, -rise);
  q.z += twist * p.x * p.y / half_.y;
  // The air runs through it, more towards the trailing edge.
  q.z += ripple * sin(along * .013 + p.y * .008 - phase) * (.3 + .7 * smoothstep(-1., 1., g.y));
  return q;
}

void main() {
  uv = grid * .5 + .5;
  vec3 at = shape(grid);
  vec2 e = vec2(.02, 0.);
  vec3 dx = shape(grid + e.xy) - shape(grid - e.xy);
  vec3 dy = shape(grid + e.yx) - shape(grid - e.yx);
  normal = turn * cross(dx, dy);
  vec3 p = turn * at + place;
  float w = (camera - p.z) / camera;
  vec2 ndc = p.xy / view;
  gl_Position = vec4(ndc.x, -ndc.y, -p.z / 4000. * w, w);
}`;

const FRAGMENT = `#version 300 es
precision highp float;
uniform sampler2D paper;
in vec2 uv;
in vec3 normal;
out vec4 color;
const vec3 light = vec3(-.28, -.5, .82);
const vec3 back = vec3(.74, .65, .5);

void main() {
  vec4 sheet = texture(paper, uv);
  vec3 n = normalize(normal);
  bool behind = n.z < 0.;
  if (behind) n = -n;
  float lit = dot(n, light) / light.z;  // 1 lying flat, so the sheet ends as the image is
  float shade = mix(.42, 1., clamp(lit, 0., 1.)) + max(lit - 1., 0.) * .3;
  vec3 tone = behind ? back * sheet.a : sheet.rgb;
  color = vec4(tone * shade, sheet.a);
}`;

function compile(gl) {
  const program = gl.createProgram();
  for (const [type, source] of [[gl.VERTEX_SHADER, VERTEX], [gl.FRAGMENT_SHADER, FRAGMENT]]) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    gl.attachShader(program, shader);
  }
  gl.linkProgram(program);
  return gl.getProgramParameter(program, gl.LINK_STATUS) ? program : null;
}

// One grid over the sheet, close enough that a bow is a curve.
function mesh(gl, program) {
  const columns = 72, rows = 46;
  const points = [], indices = [];
  for (let j = 0; j <= rows; j++) for (let i = 0; i <= columns; i++) points.push(i / columns * 2 - 1, j / rows * 2 - 1);
  for (let j = 0; j < rows; j++) for (let i = 0; i < columns; i++) {
    const a = j * (columns + 1) + i, b = a + 1, c = a + columns + 1, d = c + 1;
    indices.push(a, b, c, b, d, c);
  }
  gl.bindVertexArray(gl.createVertexArray());
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(points), gl.STATIC_DRAW);
  const grid = gl.getAttribLocation(program, 'grid');
  gl.enableVertexAttribArray(grid);
  gl.vertexAttribPointer(grid, 2, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
  return indices.length;
}

// The letter as it stands in the DOM, words and all, for the texture.
async function paint(letter) {
  const image = letter.querySelector('img');
  await image.decode().catch(() => {});
  const heading = letter.querySelector('h4');
  const body = letter.querySelector('p');
  await Promise.all([heading, body].map(node => document.fonts.load(getComputedStyle(node).font))).catch(() => {});
  const sheet = document.createElement('canvas');
  sheet.width = HALF.x * 2 * TEXTURE;
  sheet.height = HALF.y * 2 * TEXTURE;
  const context = sheet.getContext('2d');
  context.drawImage(image, 0, 0, sheet.width, sheet.height);
  context.scale(TEXTURE, TEXTURE);
  context.globalCompositeOperation = 'multiply';
  context.textAlign = 'center';
  context.textBaseline = 'alphabetic';
  const copy = letter.querySelector('.hall__letter-copy');
  for (const node of [heading, body]) {
    const style = getComputedStyle(node);
    context.font = style.font;
    context.fillStyle = style.color;
    const lines = node.innerHTML.split('<br>').map(line => line.replace(/&nbsp;/g, ' '));
    const height = node.offsetHeight / lines.length;
    const { fontBoundingBoxAscent: up, fontBoundingBoxDescent: down } = context.measureText('x');
    lines.forEach((line, i) => {
      const y = copy.offsetTop + node.offsetTop + height * i + (height - up - down) / 2 + up;
      context.fillText(line, copy.offsetLeft + copy.offsetWidth / 2, y);
    });
  }
  return sheet;
}

export function startLetterThrow({ canvas, letter, shadow, dim, fit: stageFit, reduced }) {
  const gl = reduced ? null : canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: true, depth: true, powerPreference: 'high-performance' });
  const program = gl && compile(gl);
  let uniforms = null, count = 0, ready = false, texture = null;
  let wanted = false, mode = 'idle', s = 0, fall = 0, frame = 0, last = 0;

  function size() {
    if (!gl) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.round(canvas.clientWidth * ratio);
    const height = Math.round(canvas.clientHeight * ratio);
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    gl.viewport(0, 0, width, height);
  }

  // Compiled, uploaded and drawn once ahead of the hall, so the first frame of the throw costs nothing.
  async function prepare() {
    if (!program || ready) return;
    const sheet = await paint(letter);
    gl.useProgram(program);
    count = mesh(gl, program);
    uniforms = Object.fromEntries(['half_', 'turn', 'place', 'view', 'camera', 'curl', 'axis', 'twist', 'ripple', 'phase', 'paper']
      .map(name => [name, gl.getUniformLocation(program, name)]));
    texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sheet);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const wide = gl.getExtension('EXT_texture_filter_anisotropic');
    if (wide) gl.texParameterf(gl.TEXTURE_2D, wide.TEXTURE_MAX_ANISOTROPY_EXT, 8);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);
    gl.uniform2f(uniforms.half_, HALF.x, HALF.y);
    gl.uniform1f(uniforms.camera, CAMERA);
    gl.uniform1i(uniforms.paper, 0);
    size();
    ready = true;
    draw(pose(0, 900));
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    if (wanted && mode === 'idle') launch();
  }

  function draw(p) {
    const view = { x: canvas.clientWidth / 2 / stageFit(), y: canvas.clientHeight / 2 / stageFit() };
    const [a, b, c] = [p.tilt, p.yaw, p.roll].map(degrees => degrees * Math.PI / 180);
    const [sa, ca, sb, cb, sc, cc] = [Math.sin(a), Math.cos(a), Math.sin(b), Math.cos(b), Math.sin(c), Math.cos(c)];
    // Roll, then yaw, then tilt, as CSS's rotateX() rotateY() rotateZ(); by column.
    gl.uniformMatrix3fv(uniforms.turn, false, [
      cb * cc, ca * sc + sa * sb * cc, sa * sc - ca * sb * cc,
      -cb * sc, ca * cc - sa * sb * sc, sa * cc + ca * sb * sc,
      sb, -sa * cb, ca * cb,
    ]);
    gl.uniform3f(uniforms.place, REST.x - FRAME.width / 2 + p.x, REST.y - FRAME.height / 2 + p.y, p.z);
    gl.uniform2f(uniforms.view, view.x, view.y);
    gl.uniform1f(uniforms.curl, p.curl);
    gl.uniform1f(uniforms.axis, p.axis);
    gl.uniform1f(uniforms.twist, p.twist);
    gl.uniform1f(uniforms.ripple, p.ripple);
    gl.uniform1f(uniforms.phase, p.phase);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.drawElements(gl.TRIANGLES, count, gl.UNSIGNED_SHORT, 0);
  }

  function below() { return window.innerHeight / 2 / stageFit() + FRAME.height / 2 + BELOW - REST.y; }

  function show() {
    const p = pose(s, below(), fall);
    const room = ease(clamp(s / .8)) * (1 - ease(fall));
    dim.style.opacity = room.toFixed(3);
    const near = 1 + p.z / CAMERA;
    shadow.style.opacity = (ease(span(s, .15, 1)) * (1 - ease(fall))).toFixed(3);
    shadow.style.transform = `translate3d(${p.x.toFixed(1)}px, ${(p.y + SHADOW + p.z * .4).toFixed(1)}px, 0) rotate(${p.roll.toFixed(2)}deg) scale(${near.toFixed(3)})`;
    if (ready) {
      draw(p);
      // It may have flown a little as the DOM letter, before the shader was ready.
      if (letter.style.transform) letter.style.transform = '';
      letter.style.opacity = fall ? '0' : ease(span(s, FLAT, END)).toFixed(3);
    } else {
      letter.style.opacity = '1';
      letter.style.transform = `perspective(${CAMERA}px) translate3d(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px, ${p.z.toFixed(1)}px) rotateX(${p.tilt.toFixed(2)}deg) rotateY(${p.yaw.toFixed(2)}deg) rotateZ(${p.roll.toFixed(2)}deg)`;
    }
  }

  function tick(now) {
    frame = 0;
    const step = Math.min((now - last) / 1000, .05);
    last = now;
    if (mode === 'flying') {
      s += step;
      if (s >= END) { s = END; mode = 'rest'; }
    } else if (mode === 'falling') {
      fall = Math.min(1, fall + step / DROP);
      if (fall === 1) { mode = 'idle'; s = 0; fall = 0; }
    }
    if (mode === 'idle') {
      canvas.style.visibility = 'hidden';
      letter.style.opacity = '0';
      letter.style.transform = '';
      if (wanted) launch();
      return;
    }
    show();
    if (mode === 'rest') { canvas.style.visibility = 'hidden'; return; }
    frame = requestAnimationFrame(tick);
  }

  function run() {
    canvas.style.visibility = ready ? 'visible' : 'hidden';
    last = performance.now();
    frame ||= requestAnimationFrame(tick);
  }

  function launch() {
    s = 0;
    fall = 0;
    mode = 'flying';
    run();
  }

  function want(on) {
    if (on === wanted) return;
    wanted = on;
    if (reduced) {
      dim.style.opacity = on ? '1' : '0';
      shadow.style.opacity = on ? '1' : '0';
      letter.style.opacity = on ? '1' : '0';
      return;
    }
    if (on && mode === 'idle') launch();
    else if (!on && (mode === 'flying' || mode === 'rest')) {
      mode = 'falling';
      fall = .0001;
      run();
    }
  }

  addEventListener('resize', () => { if (ready) { size(); if (mode === 'flying' || mode === 'falling') show(); } });
  whenNear(letter.closest('.hall') ?? letter, prepare);
  return { want, prepare };
}
