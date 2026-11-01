/**
 * The Round City plan (Figma "Scene 3 — B final", Round City plan v3): an engraved-map
 * reconstruction drawn from code, the same generator as in Figma, so the site and the design
 * match line for line. It is an interpretation of written descriptions, not a survey.
 *
 * roundCityPlan(D) returns { markup, geo } for a plan D px across, centred in a D × D box:
 * - markup: SVG elements grouped into parts (.plan-part.plan-walls / -gates / -mosque / -palace,
 *   plus the residential ring, the central court and the ornament). Lines that light up with
 *   their part use currentColor; styles.css sets the colour and dims inactive parts.
 *   Hooks for the motion: towers (.plan-tower, --i), gate domes (.plan-dome, --i), mosque
 *   columns (.plan-column, --row).
 * - geo: the points and boxes the focus marks, travellers and ripples are placed on.
 */

const GATES = [45, 135, 225, 315];
const C = {
  G: '#c8a15a', MASS: '#2b1309', WALL: '#3d1c0d', ROAD: '#1e0904', COURT: '#211008',
  WATER: '#16303a', WAVE: '#6d93a3', DOME: '#56704f',
};

export function roundCityPlan(D) {
  const c = D / 2, U = D / 2 * .95;
  const f = v => v.toFixed(2);
  const rad = d => d * Math.PI / 180;
  const at = (r, d) => [c + r * U * Math.cos(rad(d)), c + r * U * Math.sin(rad(d))];
  const P = pts => pts.map(([x, y]) => `${f(x)},${f(y)}`).join(' ');
  const gap = (d, tol) => GATES.some(g => Math.abs(((d - g) % 360 + 540) % 360 - 180) < tol);
  const ring = (r, attrs) => `<circle cx="${f(c)}" cy="${f(c)}" r="${f(r * U)}" ${attrs}/>`;
  const donut = (r1, r2, fill) => {
    const a = r1 * U, b = r2 * U;
    return `<path fill-rule="evenodd" fill="${fill}" d="M ${f(c - a)} ${f(c)} a ${f(a)} ${f(a)} 0 1 0 ${f(2 * a)} 0 a ${f(a)} ${f(a)} 0 1 0 ${f(-2 * a)} 0 Z M ${f(c - b)} ${f(c)} a ${f(b)} ${f(b)} 0 1 1 ${f(2 * b)} 0 a ${f(b)} ${f(b)} 0 1 1 ${f(-2 * b)} 0 Z"/>`;
  };
  const sector = (r1, r2, a1, a2) => P([at(r1, a1), at(r1, (a1 + a2) / 2), at(r1, a2), at(r2, a2), at(r2, (a1 + a2) / 2), at(r2, a1)]);
  const line = ([x1, y1], [x2, y2], attrs) => `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" ${attrs}/>`;
  const ln = 'stroke="currentColor"';
  let s = '';

  // Medallion frame: two rings, ticks every 5° (longer every 15°) and four stars.
  s += `<g class="plan-ornament">${ring(1.05, `stroke="${C.G}" stroke-width=".9"`)}${ring(1.035, `stroke="${C.G}" stroke-width=".5" stroke-opacity=".6"`)}`;
  for (let d = 0; d < 360; d += 5) s += line(at(1.035, d), at(d % 15 ? 1.043 : 1.05, d), `stroke="${C.G}" stroke-opacity=".55" stroke-width=".5"`);
  for (const d of [0, 90, 180, 270]) {
    const [x, y] = at(1.0425, d), r = .022 * U, pts = [];
    for (let k = 0; k < 16; k++) { const a = rad(k * 22.5 - 90), rr = k % 2 ? r * .38 : r; pts.push([x + rr * Math.cos(a), y + rr * Math.sin(a)]); }
    s += `<polygon points="${P(pts)}" fill="${C.G}"/>`;
  }
  s += '</g>';

  // Central court, with faint processional ways from each inner gate to the palace.
  s += `<g class="plan-court"><circle cx="${f(c)}" cy="${f(c)}" r="${f(.625 * U)}" fill="${C.COURT}"/>`;
  s += ring(.56, `stroke="${C.G}" stroke-width=".5" stroke-opacity=".35" stroke-dasharray="1 3"`);
  s += ring(.42, `stroke="${C.G}" stroke-width=".4" stroke-opacity=".25" stroke-dasharray="1 4"`);
  for (const a of GATES) s += line(at(.62, a), at(.17, a), `stroke="${C.G}" stroke-opacity=".32" stroke-width=".7" stroke-dasharray="2 4"`);
  s += '</g>';

  // Ring of houses: blocks between radial lanes and two ring streets.
  s += `<g class="plan-ring">${donut(.85, .64, C.ROAD)}`;
  const bands = [[.845, .785], [.775, .715], [.705, .645]];
  for (let d = 0; d < 360; d += 6) {
    if (gap(d + 3, 6.5)) continue;
    bands.forEach(([r1, r2], b) => {
      s += `<polygon points="${sector(r1, r2, d + .7, d + 5.3)}" fill="${C.MASS}" stroke="${C.G}" stroke-opacity=".45" stroke-width=".45"/>`;
      if ((d / 6 + b) % 2 === 0) s += line(at((r1 + r2) / 2, d + .7), at((r1 + r2) / 2, d + 5.3), `stroke="${C.G}" stroke-opacity=".25" stroke-width=".4"`);
    });
  }
  s += '</g>';

  // Walls: water-filled moat, crenellated outer wall, main wall band with towers, inner walls.
  s += `<g class="plan-part plan-walls">${donut(1, .955, C.WATER)}`;
  for (const [base, phase] of [[.97, 0], [.986, 1.6]]) {
    let d = '';
    for (let a = 0; a <= 360; a++) { const [x, y] = at(base + .0045 * Math.sin(rad(a * 60) + phase), a); d += `${a ? 'L' : 'M'} ${f(x)} ${f(y)} `; }
    s += `<path d="${d}" stroke="${C.WAVE}" stroke-opacity=".55" stroke-width=".5"/>`;
  }
  s += ring(1, `${ln} stroke-width=".9"`) + ring(.955, `${ln} stroke-width=".9"`);
  for (let d = 0; d < 360; d += 2.5) if (!gap(d, 5)) {
    const [x, y] = at(.952, d), h = .006 * U;
    s += `<rect x="${f(x - h)}" y="${f(y - h)}" width="${f(2 * h)}" height="${f(2 * h)}" transform="rotate(${d} ${f(x)} ${f(y)})" fill="currentColor" fill-opacity=".8"/>`;
  }
  s += ring(.945, `${ln} stroke-width="1.2"`) + ring(.935, `${ln} stroke-width=".6"`);
  s += donut(.905, .875, C.WALL) + ring(.905, `${ln} stroke-width="1.6"`) + ring(.875, `${ln} stroke-width="1.2"`);
  let tower = 0;
  for (let d = 3; d < 360; d += 6) if (!gap(d, 7)) {
    const [x, y] = at(.905, d);
    s += `<circle class="plan-tower" style="--i:${tower++}" cx="${f(x)}" cy="${f(y)}" r="${f(.02 * U)}" fill="${C.WALL}" ${ln} stroke-width="1.1"/>`;
  }
  s += ring(.85, `${ln} stroke-width=".8"`) + ring(.635, `${ln} stroke-width="2.2"`) + ring(.625, `${ln} stroke-width=".6"`);
  for (let d = 0; d < 360; d += 9) if (!gap(d, 6)) { const [x, y] = at(.632, d); s += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(.011 * U)}" fill="${C.WALL}" ${ln} stroke-width=".8"/>`; }
  s += '</g>';

  // Gates: bridges, arcaded avenues lined with shops, gate complexes with ribbed domes.
  s += '<g class="plan-part plan-gates">';
  GATES.forEach((a, i) => {
    const n = rad(a + 90);
    const side = (r, off) => { const [x, y] = at(r, a); return [x + off * U * Math.cos(n), y + off * U * Math.sin(n)]; };
    const strip = (r1, r2, half, fill, sw) => `<polygon points="${P([side(r1, half), side(r2, half), side(r2, -half), side(r1, -half)])}" fill="${fill}" ${ln} stroke-width="${sw}"/>`;
    s += strip(.955, 1, .018, C.ROAD, .8) + strip(.625, .955, .03, C.ROAD, .9);
    for (let r = .655; r < .84; r += .016) for (const sign of [1, -1]) {
      const [x, y] = side(r, sign * .022);
      s += `<rect x="${f(x - .006 * U)}" y="${f(y - .005 * U)}" width="${f(.012 * U)}" height="${f(.01 * U)}" transform="rotate(${a} ${f(x)} ${f(y)})" fill="${C.MASS}" ${ln} stroke-opacity=".7" stroke-width=".4"/>`;
    }
    s += strip(.87, .955, .055, C.WALL, 1.4) + strip(.935, .955, .03, C.ROAD, .7);
    const [gx, gy] = at(.912, a), r = .034 * U;
    s += `<g class="plan-dome" style="--i:${i}"><circle cx="${f(gx)}" cy="${f(gy)}" r="${f(r)}" fill="${C.DOME}" fill-opacity=".85" ${ln} stroke-width="1"/>`;
    for (let k = 0; k < 8; k++) s += line([gx, gy], [gx + r * Math.cos(rad(k * 45)), gy + r * Math.sin(rad(k * 45))], `${ln} stroke-opacity=".7" stroke-width=".5"`);
    s += `<circle cx="${f(gx)}" cy="${f(gy)}" r="${f(.006 * U)}" fill="currentColor"/></g>`;
  });
  s += '</g>';

  // Mosque: prayer hall with columns and mihrab, open courtyard.
  const mx = c + .135 * U, mw = .22 * U, mh = .25 * U, my = c - mh / 2, hall = mw * .45;
  s += `<g class="plan-part plan-mosque"><rect x="${f(mx)}" y="${f(my)}" width="${f(mw)}" height="${f(mh)}" fill="${C.MASS}" ${ln} stroke-width="1.4"/>`;
  s += `<rect x="${f(mx + hall)}" y="${f(my + .03 * U)}" width="${f(mw - hall - .03 * U)}" height="${f(mh - .06 * U)}" fill="${C.COURT}" ${ln} stroke-width=".7"/>`;
  for (let i = 0; i < 4; i++) for (let j = 0; j < 8; j++) {
    s += `<circle class="plan-column" style="--row:${j}" cx="${f(mx + .018 * U + i * (hall - .03 * U) / 3)}" cy="${f(my + .022 * U + j * (mh - .044 * U) / 7)}" r="${f(.0045 * U)}" fill="currentColor" fill-opacity=".85"/>`;
  }
  s += `<path d="M ${f(mx)} ${f(c - .018 * U)} a ${f(.018 * U)} ${f(.018 * U)} 0 0 0 0 ${f(.036 * U)}" ${ln} stroke-width="1" fill="${C.MASS}"/></g>`;

  // Palace: square with four iwans and a ribbed green dome at the exact centre.
  const p = .11 * U, dome = .052 * U;
  s += `<g class="plan-part plan-palace"><rect x="${f(c - p)}" y="${f(c - p)}" width="${f(2 * p)}" height="${f(2 * p)}" fill="${C.MASS}" ${ln} stroke-width="1.8"/>`;
  for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
    const iw = .045 * U, depth = .03 * U;
    const x = c + dx * (p - depth / 2) - (dx ? depth / 2 : iw / 2), y = c + dy * (p - depth / 2) - (dy ? depth / 2 : iw / 2);
    s += `<rect x="${f(x)}" y="${f(y)}" width="${f(dx ? depth : iw)}" height="${f(dy ? depth : iw)}" fill="${C.ROAD}" ${ln} stroke-width=".7"/>`;
  }
  s += `<rect x="${f(c - .068 * U)}" y="${f(c - .068 * U)}" width="${f(.136 * U)}" height="${f(.136 * U)}" ${ln} stroke-opacity=".8" stroke-width=".7"/>`;
  s += `<circle cx="${f(c)}" cy="${f(c)}" r="${f(dome)}" fill="${C.DOME}" ${ln} stroke-width="1.2"/>`;
  for (let k = 0; k < 16; k++) { const t = rad(k * 22.5); s += line([c + dome * .25 * Math.cos(t), c + dome * .25 * Math.sin(t)], [c + dome * Math.cos(t), c + dome * Math.sin(t)], `${ln} stroke-opacity=".65" stroke-width=".5"`); }
  s += `<circle cx="${f(c)}" cy="${f(c)}" r="${f(dome * .22)}" fill="currentColor"/></g>`;

  return {
    markup: s,
    geo: {
      c, U, at, gates: GATES, dome,
      palace: [c - p, c - p, c + p, c + p],
      mosque: [mx, my, mx + mw, my + mh],
      hall: [mx, my, mx + hall, my + mh],
    },
  };
}
