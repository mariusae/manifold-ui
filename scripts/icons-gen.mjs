// Generates src/icons/symbols.js: node scripts/icons-gen.mjs
// Every drawing below is original: composed from lines, arcs, circles and
// rounded rects on a 16×16 grid. No path data comes from any icon library.
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const OUT = process.argv[2] ?? new URL('../src/icons/symbols.js', import.meta.url).pathname;

// ---- geometry helpers -------------------------------------------------
const f = (n) => { const s = String(+(Math.round(n * 100) / 100).toFixed(2)); return s === '-0' ? '0' : s; };
const P = (x, y) => `${f(x)} ${f(y)}`;
const C = (cx, cy, r) => `M${P(cx - r, cy)}A${f(r)} ${f(r)} 0 1 0 ${P(cx + r, cy)}A${f(r)} ${f(r)} 0 1 0 ${P(cx - r, cy)}Z`;
const R = (x, y, w, h, r) => `M${P(x + r, y)}H${f(x + w - r)}A${f(r)} ${f(r)} 0 0 1 ${P(x + w, y + r)}V${f(y + h - r)}A${f(r)} ${f(r)} 0 0 1 ${P(x + w - r, y + h)}H${f(x + r)}A${f(r)} ${f(r)} 0 0 1 ${P(x, y + h - r)}V${f(y + r)}A${f(r)} ${f(r)} 0 0 1 ${P(x + r, y)}Z`;
const poly = (pts, closed = true) => 'M' + pts.map(([x, y]) => P(x, y)).join('L') + (closed ? 'Z' : '');
const rad = (deg) => (deg * Math.PI) / 180;
const polar = (cx, cy, r, deg) => [cx + r * Math.cos(rad(deg)), cy + r * Math.sin(rad(deg))];
// Arc of a circle from angle a0 to a1 (degrees, clockwise on screen), as its own subpath.
const arc = (cx, cy, r, a0, a1) => `M${P(...polar(cx, cy, r, a0))}A${f(r)} ${f(r)} 0 ${Math.abs(a1 - a0) > 180 ? 1 : 0} ${a1 > a0 ? 1 : 0} ${P(...polar(cx, cy, r, a1))}`;

// A plus of half-width a and arm length L, turned by `deg`, as a polygon (for knock-outs).
function cross(cx, cy, a, L, deg) {
  const pts = [[a, -L], [a, -a], [L, -a], [L, a], [a, a], [a, L], [-a, L], [-a, a], [-L, a], [-L, -a], [-a, -a], [-a, -L]];
  const c = Math.cos(rad(deg)), s = Math.sin(rad(deg));
  return poly(pts.map(([x, y]) => [cx + x * c - y * s, cy + x * s + y * c]));
}
// The outline of a polyline stroked at width w (mitred joins, square caps), as a polygon (for knock-outs).
function outline(pts, w) {
  const h = w / 2, n = pts.length;
  const dirs = [];
  for (let i = 0; i < n - 1; i++) {
    const dx = pts[i + 1][0] - pts[i][0], dy = pts[i + 1][1] - pts[i][1], l = Math.hypot(dx, dy);
    dirs.push([dx / l, dy / l]);
  }
  const q = pts.map((p) => [...p]);
  q[0] = [pts[0][0] - dirs[0][0] * h, pts[0][1] - dirs[0][1] * h];
  q[n - 1] = [pts[n - 1][0] + dirs[n - 2][0] * h, pts[n - 1][1] + dirs[n - 2][1] * h];
  const nrm = ([x, y]) => [-y, x];
  const side = (sgn) => q.map((p, i) => {
    if (i === 0 || i === n - 1) { const m = nrm(dirs[i === 0 ? 0 : n - 2]); return [p[0] + sgn * h * m[0], p[1] + sgn * h * m[1]]; }
    const n1 = nrm(dirs[i - 1]), n2 = nrm(dirs[i]);
    let m = [n1[0] + n2[0], n1[1] + n2[1]]; const l = Math.hypot(...m); m = [m[0] / l, m[1] / l];
    const k = h / (m[0] * n1[0] + m[1] * n1[1]);
    return [p[0] + sgn * k * m[0], p[1] + sgn * k * m[1]];
  });
  return poly([...side(1), ...side(-1).reverse()]);
}
// A cog's rim: n teeth, tips at radius rt (half-angle at), roots at rr (half-angle ar).
function cog(cx, cy, n, rt, rr, at, ar) {
  let d = '', first;
  for (let i = 0; i < n; i++) {
    const th = -90 + (i * 360) / n;
    const a = polar(cx, cy, rr, th - ar), b = polar(cx, cy, rt, th - at), c = polar(cx, cy, rt, th + at), e = polar(cx, cy, rr, th + ar);
    if (i === 0) { first = a; d += 'M' + P(...a); } else d += `A${f(rr)} ${f(rr)} 0 0 1 ${P(...a)}`;
    d += 'L' + P(...b) + 'L' + P(...c) + 'L' + P(...e);
  }
  return d + `A${f(rr)} ${f(rr)} 0 0 1 ${P(...first)}Z`;
}

const s = (...d) => ({ d: d.join('') });                      // stroked
const fl = (...d) => ({ d: d.join(''), fill: true });         // filled
const eo = (...d) => ({ d: d.join(''), fill: true, evenodd: true });
const dots = (r, ...pts) => pts.map(([x, y]) => C(x, y, r)).join('');

// ---- shared pieces ----------------------------------------------------
const RING = C(8, 8, 6.5);
const DISC = C(8, 8, 7);
const WINDOW = R(1.5, 2.5, 13, 11, 2);
const PAGE = 'M9 1.5H5A1.5 1.5 0 0 0 3.5 3V13A1.5 1.5 0 0 0 5 14.5H11A1.5 1.5 0 0 0 12.5 13V5Z';
const FOLD = 'M9 1.5V4A1 1 0 0 0 10 5H12.5';
const HEX = 'M8 1.5L13.5 4.75V11.25L8 14.5L2.5 11.25V4.75Z';
const HEX_Y = 'M2.5 4.75L8 8L13.5 4.75M8 8V14.5';
const EYE = 'M1.5 8C3 5 5.5 3.5 8 3.5S13 5 14.5 8C13 11 10.5 12.5 8 12.5S3 11 1.5 8Z';
const PIN = 'M5 2H11M6 2V6L4 9.5H12L10 6V2';
const PIN_BODY = 'M5 2H11H10V6L12 9.5H4L6 6V2Z';
const TRAY_BOX = 'M4.5 6.5H4A1.5 1.5 0 0 0 2.5 8V12.5A1.5 1.5 0 0 0 4 14H12A1.5 1.5 0 0 0 13.5 12.5V8A1.5 1.5 0 0 0 12 6.5H11.5';

// ---- the symbols ------------------------------------------------------
const symbols = {
  // Block kinds
  'doc': [s(PAGE, FOLD)],
  'doc.plaintext': [s(PAGE, FOLD, 'M6 7.5H10M6 9.75H10M6 12H8.5')],
  'doc.richtext': [s(PAGE, FOLD, 'M10 7H10.5M10 9H10.5M6 12H10.5'), fl(R(5.5, 6.5, 3, 3, 0.6))],
  'doc.fill': [fl('M4.5 1H8.5V4.5A2 2 0 0 0 10.5 6.5H13V13.5A1.5 1.5 0 0 1 11.5 15H4.5A1.5 1.5 0 0 1 3 13.5V2.5A1.5 1.5 0 0 1 4.5 1Z', 'M9.75 1.25L13 5.25H10.5A0.75 0.75 0 0 1 9.75 4.5Z')],
  'folder': [s('M1.5 4.5A1.5 1.5 0 0 1 3 3H6L7.5 4.5H13A1.5 1.5 0 0 1 14.5 6V11.5A1.5 1.5 0 0 1 13 13H3A1.5 1.5 0 0 1 1.5 11.5Z')],
  'globe': [s(RING, 'M8 1.5A3 6.5 0 0 0 8 14.5A3 6.5 0 0 0 8 1.5M1.5 8H14.5')],
  'photo': [s(R(1.5, 3, 13, 10, 1.5), 'M1.5 11L4.5 8.5L7 10.5L10.5 6.5L14.5 10.5'), fl(C(5, 6, 1.1))],
  'magnifyingglass': [s(C(7, 7, 4.5), 'M10.5 10.5L14 14')],
  'plus.forwardslash.minus': [s('M2 5H6M4 3V7M10.5 2.5L5.5 13.5M10 11H14')],
  'arrow.triangle.branch': [s('M8 14.5V10L4 6.5V4.5M8 10L12 6.5V4.5'), fl('M4 1.5L6 4.75H2Z', 'M12 1.5L14 4.75H10Z')],
  'arrow.triangle.pull': [s('M4 14.5V5M12.5 14.5V8A2.5 2.5 0 0 0 10 5.5'), fl('M4 1.5L6 4.75H2Z', 'M7 5.5L10.25 3.5V7.5Z')],
  'gauge.medium': [s('M3.4 13.6A6.5 6.5 0 1 1 12.6 13.6M8 9L10.5 5.5'), fl(C(8, 9, 1.2))],
  'sparkle': [s('M8 1.5Q8.75 7.25 14.5 8Q8.75 8.75 8 14.5Q7.25 8.75 1.5 8Q7.25 7.25 8 1.5Z'), fl('M8 1.5Q8.75 7.25 14.5 8Q8.75 8.75 8 14.5Q7.25 8.75 1.5 8Q7.25 7.25 8 1.5Z')],
  'square.split.2x1': [s(WINDOW, 'M8 2.5V13.5')],
  'text.alignleft': [s('M2 3.5H14M2 6.5H10M2 9.5H14M2 12.5H8.5')],
  'text.line.first.and.arrowtriangle.forward': [s('M7.5 4.5H14M2 8.5H14M2 12.5H14'), fl('M1.75 2.5L5.25 4.5L1.75 6.5Z')],
  'list.bullet.rectangle': [s(WINDOW, 'M7 6H11.5M7 10H11.5'), fl(dots(0.9, [4.5, 6], [4.5, 10]))],
  'list.bullet.indent': [s('M5.5 4H14M8.5 8H14M8.5 12H14'), fl(dots(1, [2.5, 4], [5.5, 8], [5.5, 12]))],
  'list.bullet': [s('M6 4H14M6 8H14M6 12H14'), fl(dots(1, [2.5, 4], [2.5, 8], [2.5, 12]))],
  'slider.horizontal.3': [s('M2 4H8.5M12.5 4H14M2 8H3.5M7.5 8H14M2 12H7M11 12H14', C(10.5, 4, 1.5), C(5.5, 8, 1.5), C(9, 12, 1.5))],
  'bubble.left.and.bubble.right': [s('M4.5 8.5L3 10.5V8.5A1.5 1.5 0 0 1 1.5 7V3.5A1.5 1.5 0 0 1 3 2H9A1.5 1.5 0 0 1 10.5 3.5V4.75', 'M8 7H13A1.5 1.5 0 0 1 14.5 8.5V11A1.5 1.5 0 0 1 13 12.5V14.5L11 12.5H8A1.5 1.5 0 0 1 6.5 11V8.5A1.5 1.5 0 0 1 8 7Z')],
  'text.bubble': [s('M3 2H13A1.5 1.5 0 0 1 14.5 3.5V10A1.5 1.5 0 0 1 13 11.5H7L4 14.5V11.5H3A1.5 1.5 0 0 1 1.5 10V3.5A1.5 1.5 0 0 1 3 2Z', 'M4.5 5.5H11.5M4.5 8H9')],
  'shippingbox': [s(HEX, HEX_Y, 'M5.25 3.1L10.75 6.4V9')],
  'server.rack': [s(R(2, 2.5, 12, 4.5, 1.5), R(2, 9, 12, 4.5, 1.5), 'M9 4.75H11.25M9 11.25H11.25'), fl(dots(0.8, [4.75, 4.75], [4.75, 11.25]))],
  'desktopcomputer': [s(R(1.5, 2.5, 13, 8.5, 1.5), 'M8 11V13.5M5 13.5H11')],
  'terminal': [s(WINDOW, 'M4.5 6L7 8L4.5 10M8.5 10.5H11.5')],
  'book': [s('M8 4.5C6.5 3 4 2.75 1.5 3V12C4 11.75 6.5 12 8 13.5C9.5 12 12 11.75 14.5 12V3C12 2.75 9.5 3 8 4.5ZM8 4.5V13.5')],
  'books.vertical': [s('M2 2.5H5V13.5H2ZM5 4.5H8V13.5H5', 'M9.5 4.6L11.9 3.9L14.5 12.8L12.1 13.5Z')],
  'chart.bar': [s('M2 13.5H14V5.5H10M6 13.5V2.5H10V13.5M6 8H2V13.5')],
  'calendar': [s(R(2, 3, 12, 11, 2), 'M2 7H14M5 1.5V4M11 1.5V4'), fl(dots(0.8, [5.5, 10.5], [8, 10.5], [10.5, 10.5]))],
  'tag': [s('M3.5 2H8L13.94 7.94A1.5 1.5 0 0 1 13.94 10.06L10.06 13.94A1.5 1.5 0 0 1 7.94 13.94L2 8V3.5A1.5 1.5 0 0 1 3.5 2Z'), fl(C(5.5, 5.5, 1))],
  'person': [s(C(8, 4.75, 2.75), 'M2.5 14A5.5 4.5 0 0 1 13.5 14')],
  'lock': [s(R(3, 6.5, 10, 7.5, 1.5), 'M5.5 6.5V4.5A2.5 2.5 0 0 1 10.5 4.5V6.5'), fl(C(8, 10.25, 0.9))],
  'hammer': [s('M7 2L9 4L4 9L2 7Z', 'M6.5 6.5L13.5 13.5')],
  'paperplane': [s('M14.5 1.5L1.5 6.5L6.5 9.5L9.5 14.5ZM14.5 1.5L6.5 9.5')],
  'bolt': [s('M9 1.5L3.5 9H8L7 14.5L12.5 7H8Z')],
  'star': [s(poly([-90, -54, -18, 18, 54, 90, 126, 162, 198, 234].map((a, i) => polar(8, 8.6, i % 2 ? 2.8 : 6.8, a))))],
  'play': [s('M4 2.5L12.5 8L4 13.5Z')],
  'pause': [s(R(3.5, 2.5, 3, 11, 0.75), R(9.5, 2.5, 3, 11, 0.75))],
  'stop': [s(R(3, 3, 10, 10, 2))],
  'music.note': [s('M7.5 12V3L13 1.75V5L7.5 6.25'), fl(C(5.25, 12, 2.25))],
  'video': [s(R(1.5, 4, 9, 8, 1.5), 'M10.5 7.25L14.5 4.75V11.25L10.5 8.75')],
  'map': [s('M1.5 4L5.5 2.5L10.5 4.5L14.5 3V12L10.5 13.5L5.5 11.5L1.5 13ZM5.5 2.5V11.5M10.5 4.5V13.5')],
  'envelope': [s(R(1.5, 3, 13, 10, 1.5), 'M2 4.5L8 9L14 4.5')],
  'cube': [s(HEX, HEX_Y)],
  'cpu': [s(R(4, 4, 8, 8, 1.5), 'M6 1.5V4M10 1.5V4M6 12V14.5M10 12V14.5M1.5 6H4M1.5 10H4M12 6H14.5M12 10H14.5'), fl(R(6.5, 6.5, 3, 3, 0.5))],
  'tablecells': [s(R(1.5, 2, 13, 12, 2), 'M1.5 6H14.5M1.5 10H14.5M8 2V14')],
  'checklist': [s('M2 3.5L3.5 5L6 2M2 8L3.5 9.5L6 6.5M8.5 3.5H14M8.5 8H14M8.5 12.5H14', C(4, 12.5, 1.5))],
  'curlybraces': [s('M6 2.5H5.5A1.5 1.5 0 0 0 4 4V6.5A1.5 1.5 0 0 1 2.5 8A1.5 1.5 0 0 1 4 9.5V12A1.5 1.5 0 0 0 5.5 13.5H6', 'M10 2.5H10.5A1.5 1.5 0 0 1 12 4V6.5A1.5 1.5 0 0 0 13.5 8A1.5 1.5 0 0 0 12 9.5V12A1.5 1.5 0 0 1 10.5 13.5H10')],
  'number': [s('M6.5 2.5L5 13.5M11 2.5L9.5 13.5M3 6H13.5M2.5 10H13')],

  // Chrome
  'xmark': [s('M3.5 3.5L12.5 12.5M12.5 3.5L3.5 12.5')],
  'xmark.circle.fill': [eo(DISC, cross(8, 8, 0.7, 4.1, 45))],
  'arrow.up.left.and.arrow.down.right': [s('M2.5 6.5V2.5H6.5M2.5 2.5L7 7M13.5 9.5V13.5H9.5M13.5 13.5L9 9')],
  'arrow.down.right.and.arrow.up.left': [s('M2.5 2.5L7 7M7 3.5V7H3.5M13.5 13.5L9 9M9 12.5V9H12.5')],
  'sidebar.left': [s(WINDOW, 'M6 2.5V13.5')],
  'sidebar.right': [s(WINDOW, 'M10 2.5V13.5')],
  'chevron.right': [s('M6 3L11 8L6 13')],
  'chevron.left': [s('M10 3L5 8L10 13')],
  'chevron.down': [s('M3 6L8 11L13 6')],
  'chevron.up': [s('M3 10L8 5L13 10')],
  'chevron.up.chevron.down': [s('M5 6L8 3L11 6M5 10L8 13L11 10')],
  'plus': [s('M8 3V13M3 8H13')],
  'minus': [s('M3 8H13')],
  'trash': [s('M2.5 4H13.5M6 4V3A1 1 0 0 1 7 2H9A1 1 0 0 1 10 3V4M4 4L4.5 12.5A1.5 1.5 0 0 0 6 14H10A1.5 1.5 0 0 0 11.5 12.5L12 4M6.75 6.5V11M9.25 6.5V11')],
  'pin': [s(PIN, 'M8 9.5V14.5')],
  'pin.fill': [s(PIN, 'M8 9.5V14.5'), fl(PIN_BODY)],
  'dock.arrow.down.rectangle': [s(WINDOW, 'M8 4.75V8.75M6.25 7L8 8.75L9.75 7M5 11H11')],
  'arrow.up.and.down': [s('M8 2V14M5 5L8 2L11 5M5 11L8 14L11 11')],
  'rectangle.expand.vertical': [s(R(3.5, 5.5, 9, 5, 1.25), 'M6 3.5L8 1.5L10 3.5M6 12.5L8 14.5L10 12.5')],
  'rectangle.compress.vertical': [s(R(3.5, 5.5, 9, 5, 1.25), 'M6 1.5L8 3.5L10 1.5M6 14.5L8 12.5L10 14.5')],
  'rectangle.stack.badge.minus': [s('M5 2H10M3.5 4H11.5M13.5 8.75V7.5A1.5 1.5 0 0 0 12 6H3A1.5 1.5 0 0 0 1.5 7.5V11.5A1.5 1.5 0 0 0 3 13H8.75'), eo(C(12.5, 12.5, 2.5), R(11, 12, 3, 1, 0.25))],
  'rectangle.stack': [s(R(1.5, 6.5, 13, 7.5, 1.5), 'M3.5 4.25H12.5M5 2H11')],
  'pencil': [s('M2.5 13.5L3.25 10.25L10.5 3A1.77 1.77 0 0 1 13 5.5L5.75 12.75ZM9 4.5L11.5 7')],
  'eye': [s(EYE, C(8, 8, 2))],
  'eye.slash': [s(EYE, C(8, 8, 2), 'M3 2L13 14')],
  'link': [s('M7 9A3 3 0 0 0 11.25 9.25L13.25 7.25A3 3 0 0 0 9 3L8 4', 'M9 7A3 3 0 0 0 4.75 6.75L2.75 8.75A3 3 0 0 0 7 13L8 12')],
  'clock': [s(RING, 'M8 4.5V8L10.5 9.5')],
  'clock.arrow.circlepath': [s('M3.5 8A5.5 5.5 0 1 1 5.1 11.9M1.5 6L3.5 8.25L5.5 6M9 5V8L11 9.5')],
  'checkmark': [s('M3 8.5L6.5 12L13 4.5')],
  'checkmark.circle.fill': [eo(DISC, outline([[4.75, 8.25], [7, 10.5], [11.25, 5.5]], 1.3))],
  'exclamationmark.triangle': [s('M8 2L14.5 13.5H1.5ZM8 6.5V9.5'), fl(C(8, 11.5, 0.8))],
  'exclamationmark.circle': [s(RING, 'M8 4.5V8.5'), fl(C(8, 11, 0.8))],
  'questionmark.circle': [s(RING, 'M6 6.5A2 2 0 1 1 8 8.5V9.5'), fl(C(8, 11.5, 0.8))],
  'info.circle': [s(RING, 'M8 7.5V11.5'), fl(C(8, 5, 0.8))],
  'arrow.clockwise': [s('M13.6 9A5.7 5.7 0 1 1 12.5 4.5M12.5 1.5V4.5H9.5')],
  'arrow.left': [s('M13.5 8H2.5M7 3.5L2.5 8L7 12.5')],
  'arrow.right': [s('M2.5 8H13.5M9 3.5L13.5 8L9 12.5')],
  'arrow.up': [s('M8 13.5V2.5M3.5 7L8 2.5L12.5 7')],
  'arrow.down': [s('M8 2.5V13.5M3.5 9L8 13.5L12.5 9')],
  'arrow.up.right': [s('M4 12L12 4M5.5 4H12V10.5')],
  'arrow.uturn.backward': [s('M2.5 6H10A3.5 3.5 0 0 1 10 13H6.5M5.5 3L2.5 6L5.5 9')],
  'ellipsis': [fl(dots(1.25, [3, 8], [8, 8], [13, 8]))],
  'gearshape': [s(cog(8, 8, 8, 6.5, 4.9, 8, 13), C(8, 8, 2))],
  'square.and.arrow.down': [s(TRAY_BOX, 'M8 1.5V10.5M5.75 8.25L8 10.5L10.25 8.25')],
  'square.and.arrow.up': [s('M5.5 6.5H4A1.5 1.5 0 0 0 2.5 8V12.5A1.5 1.5 0 0 0 4 14H12A1.5 1.5 0 0 0 13.5 12.5V8A1.5 1.5 0 0 0 12 6.5H10.5', 'M8 10V1.5M5.5 4L8 1.5L10.5 4')],
  'doc.on.doc': [s('M4.5 10.5H4A1.5 1.5 0 0 1 2.5 9V3A1.5 1.5 0 0 1 4 1.5H8A1.5 1.5 0 0 1 9.5 3V3.5', R(6.5, 5.5, 7, 9, 1.5))],
  'point.3.connected.trianglepath.dotted': [s(C(8, 3.5, 1.5), C(3.5, 12, 1.5), C(12.5, 12, 1.5)), fl(dots(0.7, [6.2, 6.9], [5.3, 8.6], [9.8, 6.9], [10.7, 8.6], [6.8, 12], [9.2, 12]))],
  'tray': [s('M1.5 9.5L3.5 3.5A1.5 1.5 0 0 1 5 2.5H11A1.5 1.5 0 0 1 12.5 3.5L14.5 9.5V12A1.5 1.5 0 0 1 13 13.5H3A1.5 1.5 0 0 1 1.5 12Z', 'M1.5 9.5H5.5V10A1.5 1.5 0 0 0 7 11.5H9A1.5 1.5 0 0 0 10.5 10V9.5H14.5')],
  'tray.and.arrow.down': [s('M4 6.5H3.5L1.5 10V12.5A1.5 1.5 0 0 0 3 14H13A1.5 1.5 0 0 0 14.5 12.5V10L12.5 6.5H12', 'M1.5 10H5.5A2.5 2.5 0 0 0 10.5 10H14.5', 'M8 1.5V7.5M5.75 5.25L8 7.5L10.25 5.25')],
  'nosign': [s(RING, 'M3.4 3.4L12.6 12.6')],
  'moon': [s('M14 9A6 6 0 1 1 7 2A5.5 5.5 0 0 0 14 9Z')],
  'sun.max': [s(C(8, 8, 2.75), 'M8 1.5V3M8 13V14.5M1.5 8H3M13 8H14.5M3.4 3.4L4.45 4.45M11.55 11.55L12.6 12.6M3.4 12.6L4.45 11.55M11.55 4.45L12.6 3.4')],
  'circle.lefthalf.filled': [s(RING), fl('M8 1.5A6.5 6.5 0 0 0 8 14.5Z')],
  'paintpalette': [s('M8 1.5A6.5 6.5 0 1 0 8 14.5C9.25 14.5 9.75 13.5 9.25 12.5C8.75 11.25 9.5 10 11 10H12.5A2 2 0 0 0 14.5 8A6.5 6.5 0 0 0 8 1.5Z'), fl(dots(0.85, [4.75, 9], [5.5, 5.75], [8.5, 4.25], [11.5, 6]))],
  'keyboard': [s(R(1.5, 3.5, 13, 9, 1.5), 'M5 9.5H11'), fl(dots(0.7, [4.25, 6.5], [6.75, 6.5], [9.25, 6.5], [11.75, 6.5]))],
  'square.grid.2x2': [s(R(2, 2, 5, 5, 1.25), R(9, 2, 5, 5, 1.25), R(2, 9, 5, 5, 1.25), R(9, 9, 5, 5, 1.25))],
  'rectangle.3.group': [s(R(1.5, 2.5, 13, 5, 1.25), R(1.5, 9.5, 5.5, 4, 1.25), R(9, 9.5, 5.5, 4, 1.25))],
  'command': [s('M6 6V4A2 2 0 1 0 4 6H12A2 2 0 1 0 10 4V12A2 2 0 1 0 12 10H4A2 2 0 1 0 6 12Z')],
  'line.3.horizontal': [s('M2.5 4.5H13.5M2.5 8H13.5M2.5 11.5H13.5')],
  'line.3.horizontal.decrease': [s('M2 4.5H14M4.5 8H11.5M6.5 11.5H9.5')],
  'circle': [s(RING)],
  'circle.fill': [fl(DISC)],
  'circle.dotted': [s([0, 1, 2, 3, 4, 5, 6, 7].map((k) => arc(8, 8, 6.5, k * 45 - 9, k * 45 + 9)).join(''))],
  'record.circle': [s(RING), fl(C(8, 8, 3.25))],
  'hand.raised': [s('M5.5 9.5V4.5A1 1 0 0 1 7.5 4.5V8M7.5 4.5V3A1 1 0 0 1 9.5 3V8M9.5 4A1 1 0 0 1 11.5 4V8', 'M11.5 6A1 1 0 0 1 13.5 6V10A4.5 4.5 0 0 1 9 14.5H8.75C7.25 14.5 6 13.75 5.25 12.5L2.9 8.9A1.05 1.05 0 0 1 4.65 7.75L5.5 9')],
  'key': [s(C(5.25, 10.75, 3.25), 'M7.5 8.5L13.5 2.5M10.5 5.5L12.25 7.25M12.5 3.5L14.25 5.25')],
  'bell': [s('M2.5 11C3.75 10 4.25 8.75 4.25 7V5.75A3.75 3.75 0 0 1 11.75 5.75V7C11.75 8.75 12.25 10 13.5 11Z', 'M6.5 13A1.5 1.5 0 0 0 9.5 13')],
  'bookmark': [s('M4 3A1.5 1.5 0 0 1 5.5 1.5H10.5A1.5 1.5 0 0 1 12 3V14.5L8 11L4 14.5Z')],
  'flag': [s('M3 2V14.5M3 2.5C5 1.5 6.75 1.5 8.25 2.5S11.5 3.5 13.5 2.5V9C11.5 10 9.75 10 8.25 9S5 8 3 9')],
  'scissors': [s(C(4, 4.5, 2), C(4, 11.5, 2), 'M5.6 5.75L14 11.5M5.6 10.25L14 4.5')],
  'wand.and.stars': [s('M2 14L7.5 8.5M9 7L10 6', 'M12.5 1.75V5.25M10.75 3.5H14.25M5 2.5V4.5M4 3.5H6M12.5 9.5V11.5M11.5 10.5H13.5')],
  'text.cursor': [s('M8 3V13M5.5 1.5C7 1.5 8 2 8 3C8 2 9 1.5 10.5 1.5M5.5 14.5C7 14.5 8 14 8 13C8 14 9 14.5 10.5 14.5')],
  'rectangle.on.rectangle': [s('M3.5 9.5H3A1.5 1.5 0 0 1 1.5 8V4A1.5 1.5 0 0 1 3 2.5H9A1.5 1.5 0 0 1 10.5 4V4.5', R(5.5, 6.5, 9, 7, 1.5))],
  'square.dashed': [s('M2.5 5V4.5A2 2 0 0 1 4.5 2.5H5M11 2.5H11.5A2 2 0 0 1 13.5 4.5V5M13.5 11V11.5A2 2 0 0 1 11.5 13.5H11M5 13.5H4.5A2 2 0 0 1 2.5 11.5V11', 'M7.25 2.5H8.75M13.5 7.25V8.75M8.75 13.5H7.25M2.5 8.75V7.25')],
  'plus.circle': [s(RING, 'M8 5V11M5 8H11')],
  'minus.circle': [s(RING, 'M5 8H11')],
  'inset.filled.rectangle': [s(WINDOW), fl(R(4, 5, 8, 6, 0.75))],
  'eraser': [s('M9.5 2L13.5 6L6.5 13L2.5 9ZM5.5 6L9.5 10M9.5 14H14')],
};

// ---- emit -------------------------------------------------------------
const part = (p) => `{ d: ${JSON.stringify(p.d)}${p.fill ? ', fill: true' : ''}${p.evenodd ? ', evenodd: true' : ''}${p.o != null ? `, o: ${p.o}` : ''} }`;
const sections = { 'doc': 'Block kinds', 'xmark': 'Chrome' };
let out = `// Symbols: this toolkit's own monoline drawings, under the names SF Symbols
// gives the marks Manifold uses. Hand-drawn from simple geometry (lines, arcs,
// circles, rounded rects); nothing here is Apple's artwork or any library's.
//
// Each symbol: drawn on a 16×16 grid, stroke-based. \`d\` is SVG path data.
// A part is stroked with currentColor (stroke-width set by the renderer, ~1.3,
// round caps and joins, fill none) unless it has \`fill: true\` (filled with
// currentColor, no stroke); \`evenodd: true\` fills by the even-odd rule, for a
// glyph knocked out of a filled shape. Optional \`o\` = opacity for a part.
//
// Strokes keep 1.5 units clear of the box's edge, so they aren't clipped.

export const symbols = {
`;
for (const [name, parts] of Object.entries(symbols)) {
  if (sections[name]) out += `${name === 'doc' ? '' : '\n'}  // ${sections[name]}\n`;
  out += `  ${JSON.stringify(name)}: [${parts.map(part).join(', ')}],\n`;
}
out += '};\n';
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, out);
console.log(`wrote ${Object.keys(symbols).length} symbols to ${OUT}`);
