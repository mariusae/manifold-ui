// Words measured before they're laid out (a bar gives things up in order as
// it narrows, so it has to know what each wants).

let family = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", system-ui, sans-serif';
let ctx = null;
const cache = new Map();

/** The chrome's type, by role (Manifold's UIType). */
export const UIType = {
  heading: '600 15px',
  title: '600 13px',
  row: '400 13px',
  rowStrong: '600 13px',
  hudField: '400 15px',
  field: '400 13px',
  body: '400 12px',
  detail: '400 11.5px',
  caption: '500 11px',
  section: '600 11px',
  label: '500 12px',
  footnote: '400 11px',
  count: '500 10.5px',
  pill: '500 10.5px',
  figures: '400 11px',
  dragTitle: '500 13px',
};

export function setMeasureFamily(f) {
  if (f && f !== family) {
    family = f;
    cache.clear();
  }
}

/** The width of `text` set in a role of UIType (or a CSS font shorthand without the family). */
export function measure(text, role = 'row') {
  const font = UIType[role] ?? role;
  const key = font + '\u0000' + text;
  let w = cache.get(key);
  if (w === undefined) {
    ctx ??= document.createElement('canvas').getContext('2d');
    ctx.font = `${font} ${family}`;
    w = ctx.measureText(text).width;
    if (cache.size > 5000) cache.clear();
    cache.set(key, w);
  }
  return w;
}

/** `text` cut in its middle to fit `width`, as a path keeps its ends. */
export function truncateMiddle(text, width, role = 'detail') {
  if (measure(text, role) <= width) return text;
  let lo = 0, hi = text.length;
  while (lo < hi) {
    const n = (lo + hi + 1) >> 1;
    const head = Math.ceil(n / 2), tail = Math.floor(n / 2);
    const s = text.slice(0, head) + '…' + text.slice(text.length - tail);
    if (measure(s, role) <= width) lo = n;
    else hi = n - 1;
  }
  if (lo === 0) return '…';
  return text.slice(0, Math.ceil(lo / 2)) + '…' + text.slice(text.length - Math.floor(lo / 2));
}
