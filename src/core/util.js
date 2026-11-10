// Small things everything else is made of: elements, events, motion.

/** An element: h('div.a.b', {attrs/props/on*}, ...children). */
export function h(spec, props, ...children) {
  const [tag, ...classes] = spec.split('.');
  const el = document.createElement(tag || 'div');
  if (classes.length) el.className = classes.join(' ');
  if (props && (props instanceof Node || typeof props !== 'object' || Array.isArray(props))) {
    children.unshift(props);
    props = null;
  }
  if (props) {
    for (const [k, v] of Object.entries(props)) {
      if (v == null || v === false) continue;
      if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k === 'dataset') Object.assign(el.dataset, v);
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
      else if (k in el && k !== 'list') el[k] = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
  }
  append(el, children);
  return el;
}

export function append(el, children) {
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

export function clear(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
  return el;
}

export class Emitter {
  #handlers = new Map();
  on(type, fn) {
    if (!this.#handlers.has(type)) this.#handlers.set(type, new Set());
    this.#handlers.get(type).add(fn);
    return () => this.off(type, fn);
  }
  off(type, fn) {
    this.#handlers.get(type)?.delete(fn);
  }
  emit(type, detail) {
    for (const fn of [...(this.#handlers.get(type) ?? [])]) fn(detail);
    for (const fn of [...(this.#handlers.get('*') ?? [])]) fn(type, detail);
  }
}

// ------------------------------------------------------------------ motion
// How long things take to move (Manifold's Design.swift): a fade or a reveal
// on hover, a thing appearing (easing out) or going (easing in), and a thing
// travelling across the window — one curve, and one that overshoots a little.

export const Motion = {
  /** Every transition this many times slower, to be watched. */
  slowdown: 1,
  forceReduced: false,
  get fast() { return 120 * this.slowdown; },
  get base() { return 160 * this.slowdown; },
  get spatial() { return 240 * this.slowdown; },
  /** One thing becoming another where it goes. */
  get morph() { return this.spatial * 1.5; },
  hoverIntent: 300,
  lingerAfterExit: 350,
  get reduced() {
    return this.forceReduced || (typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches);
  },
  /** How far a thing travels: d, or nowhere with less motion asked for. */
  distance(d) { return this.reduced ? 0 : d; },
  appear: 'ease-out',
  disappear: 'ease-in',
  travel: 'cubic-bezier(0.2, 0.9, 0.3, 1)',
  settle: 'cubic-bezier(0.2, 0.9, 0.3, 1.15)',
  flight: 'ease-in-out',
};

/** element.animate, the animation returned with a `done` promise that never rejects. */
export function animate(el, keyframes, options) {
  const o = typeof options === 'number' ? { duration: options } : { ...options };
  if (o.duration != null) o.duration = Math.max(0, o.duration);
  const a = el.animate(keyframes, o);
  a.done = a.finished.then(() => true, () => false);
  return a;
}

export const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
export const lerp = (a, b, t) => a + (b - a) * t;

export function rectOf(el, relativeTo) {
  const r = el.getBoundingClientRect();
  if (!relativeTo) return { x: r.left, y: r.top, w: r.width, h: r.height };
  const o = relativeTo.getBoundingClientRect();
  return { x: r.left - o.left, y: r.top - o.top, w: r.width, h: r.height };
}
export function setRect(el, r) {
  el.style.left = r.x + 'px';
  el.style.top = r.y + 'px';
  el.style.width = r.w + 'px';
  el.style.height = r.h + 'px';
}
export const rectContains = (r, p) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
export const rectInset = (r, dx, dy = dx) => ({ x: r.x + dx, y: r.y + dy, w: r.w - 2 * dx, h: r.h - 2 * dy });
export const rectsEqual = (a, b) => !!a && !!b && a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;

let nextId = 0;
/** An id of our own making, unique in this page. */
export function makeId(prefix = 't') {
  nextId += 1;
  return `${prefix}${Date.now().toString(36)}${nextId.toString(36)}`;
}

export const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || '');

/** The modifiers of an event, by Manifold's names: on a Mac ⌘ is `command`;
 *  elsewhere Ctrl stands in for it, and the context click for ⌃-click. */
export function modifiers(e) {
  return {
    command: isMac ? e.metaKey : e.ctrlKey,
    option: e.altKey,
    shift: e.shiftKey,
    control: isMac ? e.ctrlKey : false,
  };
}

/** "5m", "2h", "3d": how long ago, as a row's end says it. */
export function age(then, now = Date.now()) {
  const s = Math.max(0, (now - then) / 1000);
  if (s < 60) return 'now';
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

/** Runs `fn` after the pointer has rested `delay` ms; returns a cancel. */
export function after(delay, fn) {
  const t = setTimeout(fn, delay);
  return () => clearTimeout(t);
}
