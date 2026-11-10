// What every tile is doing, shown by its name wherever its name is — its
// bar, its sidebar row, a card — adding ink only when it needs you
// (Manifold's StatusMark, StatusPill, StatusGlyph, Shimmer).
//
// A status is `{state, progress?, kind?, read?, title?, msg?, app?, at?}`:
//   state  'idle' | 'working' | 'done' | 'error' | 'blocked' | 'inactive'
//          | 'connecting' | 'offline' | 'quiet' | 'watching'
//   kind   for 'blocked': 'permission' | 'question' | 'auth'
//   read   for 'done' and 'error': attended to already (then nothing shows)

import { h, Motion, animate } from '../core/util.js';

const NS = 'http://www.w3.org/2000/svg';

const NEEDS = { permission: 'Permission', question: 'Question', auth: 'Sign in' };

/**
 * How a status shows: `{shimmer, dim, pill, glyph}`.
 *   pill   null | {kind: 'needs'|'failed'|'done'|'note'|'progress', text}
 *   glyph  null | a look for `statusGlyph`
 */
export function statusMark(status) {
  const s = status ?? { state: 'idle' };
  const mark = { shimmer: false, dim: false, pill: null, glyph: null };
  switch (s.state) {
    case 'working':
      mark.shimmer = !Motion.reduced;
      if (Motion.reduced) mark.glyph = { look: 'busy' };
      if (s.progress != null) mark.pill = { kind: 'progress', text: `${Math.round(s.progress)}%` };
      break;
    case 'blocked':
      mark.pill = { kind: 'needs', text: NEEDS[s.kind] ?? 'Needs you' };
      break;
    case 'done':
      if (!s.read) mark.pill = { kind: 'done', text: 'Done' };
      break;
    case 'error':
      if (!s.read) mark.pill = { kind: 'failed', text: 'Failed' };
      break;
    case 'inactive':
      mark.dim = true;
      break;
    case 'connecting':
    case 'offline':
    case 'quiet':
    case 'watching':
      mark.glyph = { look: s.state };
      break;
    default:
      break;
  }
  if (s.note) mark.pill = { kind: 'note', text: s.note };
  return mark;
}

/** Whether a status wants attention: done or failed and not yet read, or needing you. */
export function needsAttention(status) {
  if (!status) return false;
  return status.state === 'blocked' || ((status.state === 'done' || status.state === 'error') && !status.read);
}

export function statusTooltip(status) {
  if (!status) return '';
  const first = {
    working: status.progress != null ? `Working, ${Math.round(status.progress)}%` : 'Working',
    done: status.read ? 'Done' : 'Done, not read yet',
    error: status.read ? 'Failed' : 'Failed, not read yet',
    inactive: 'Inactive: the shell ended while idle',
    connecting: 'Connecting to its host',
    offline: "Its host can't be reached: as last seen",
    quiet: 'Its host has been quiet a while',
    watching: 'Another window took over its host: watching',
    blocked: { permission: 'Needs you: permission', question: 'Needs you: a question', auth: 'Needs you: a sign-in' }[status.kind] ?? 'Needs you',
  }[status.state];
  if (!first) return '';
  return [first + (status.app ? ` · ${status.app}` : ''), status.title, status.msg].filter(Boolean).join('\n');
}

// -------------------------------------------------------------------- pill

/** The status in a word, on a capsule: 16 high, its text 6 in from each end. */
export class StatusPill {
  constructor() {
    this.el = h('span.mf-status-pill', { hidden: true });
    /** Classes of the owner's, kept as the pill is dressed. */
    this.extra = '';
    this.kind = null;
    this.compact = false;
  }

  /** `pill`: null, or {kind, text} as `statusMark` gives it. */
  set(pill, compact = this.compact) {
    const key = pill ? `${pill.kind}/${pill.text}/${compact}` : '';
    if (key === this.key) return;
    this.key = key;
    this.pill = pill;
    this.compact = compact;
    this.el.hidden = !pill;
    if (!pill) return;
    this.el.className = `mf-status-pill mf-status-${pill.kind}` + (compact && pill.kind !== 'progress' ? ' mf-compact' : '') + (this.extra ? ' ' + this.extra : '');
    this.el.textContent = compact && pill.kind !== 'progress' ? '' : pill.text;
  }

  /** What it takes of a bar: its word's width and 12, or 8 as a dot. */
  wanted(measure) {
    if (!this.pill) return { w: 0, h: 16 };
    if (this.pill.kind === 'progress') return { w: Math.ceil(measure(this.pill.text, 'figures')) + 2, h: 16 };
    if (this.compact) return { w: 8, h: 16 };
    return { w: Math.ceil(measure(this.pill.text, 'pill')) + 12, h: 16 };
  }
}

/** A pill: a count, an age — a few figures on a grey capsule. */
export function pill(text) {
  return h('span.mf-pill', text);
}

// ------------------------------------------------------------------- glyph

const SIZE = 13;
const R = SIZE / 2 - 1;

function el(tag, attrs) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
}

const CHECK = (() => {
  const k = 0.16 * SIZE, c = SIZE / 2;
  // (y down)
  return `M${c - 1.9 * k} ${c + 0.1 * k}L${c - 0.6 * k} ${c + 1.4 * k}L${c + 2.0 * k} ${c - 1.3 * k}`;
})();

/**
 * A status as a glyph, 13 square, for where a name doesn't carry it: a
 * turning ring, a ring filling, a check on a disc.
 * look: 'working' | 'progress' | 'connecting' | 'busy' | 'needsYou' | 'done'
 *       | 'failed' | 'doneRead' | 'failedRead' | 'offline' | 'quiet'
 *       | 'watching' | 'inactive'
 */
export function statusGlyph({ look, progress = 0 }) {
  const svg = el('svg', { width: SIZE, height: SIZE, viewBox: `0 0 ${SIZE} ${SIZE}`, fill: 'none', class: `mf-glyph mf-glyph-${look}` });
  const c = SIZE / 2;
  const ring = (attrs) => el('circle', { cx: c, cy: c, r: R, ...attrs });
  switch (look) {
    case 'working':
    case 'connecting': {
      // An open ring, three quarters of a turn, turning once in two seconds —
      // by the clock, so every one turns in step.
      const len = 2 * Math.PI * R;
      svg.append(ring({ stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-dasharray': `${len * 0.75} ${len}`, class: 'mf-glyph-spin' }));
      svg.style.setProperty('--mf-spin-phase', `${-((Date.now() / 1000) % 2)}s`);
      break;
    }
    case 'progress': {
      const len = 2 * Math.PI * R, p = Math.min(progress, 100) / 100;
      svg.append(ring({ stroke: 'currentColor', 'stroke-width': 2, opacity: 0.15 }));
      if (p > 0) svg.append(ring({ stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-dasharray': `${len * p} ${len}`, transform: `rotate(-90 ${c} ${c})`, opacity: 0.9 }));
      break;
    }
    case 'busy':
      svg.append(el('circle', { cx: c, cy: c, r: 0.4 * R, fill: 'currentColor', opacity: 0.7 }));
      break;
    case 'needsYou':
      svg.append(ring({ stroke: 'currentColor', 'stroke-width': 1.6 }), el('circle', { cx: c, cy: c, r: 0.42 * R, fill: 'currentColor' }));
      break;
    case 'done':
    case 'failed':
      svg.append(el('circle', { cx: c, cy: c, r: R, fill: 'currentColor', opacity: look === 'done' ? 0.88 : 1 }),
        el('path', { d: CHECK, stroke: 'var(--mf-panel)', 'stroke-width': 1.6, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
      break;
    case 'doneRead':
    case 'failedRead':
      svg.append(el('path', { d: CHECK, stroke: 'currentColor', 'stroke-width': 1.6, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: look === 'doneRead' ? 0.8 : 0.6 }));
      break;
    case 'offline':
      svg.append(ring({ stroke: 'currentColor', 'stroke-width': 1.4, opacity: 0.8 }),
        el('path', { d: `M${c - 0.6 * R} ${c + 0.6 * R}L${c + 0.6 * R} ${c - 0.6 * R}`, stroke: 'currentColor', 'stroke-width': 1.4, 'stroke-linecap': 'round', opacity: 0.8 }));
      break;
    case 'quiet': {
      const seg = (2 * Math.PI * R) / 6;
      svg.append(ring({ stroke: 'currentColor', 'stroke-width': 1.6, 'stroke-linecap': 'round', 'stroke-dasharray': `${seg * 0.55} ${seg * 0.45}` }));
      break;
    }
    case 'watching': {
      const w = 1.05 * R, hh = 0.72 * R;
      svg.append(el('path', {
        d: `M${c - w} ${c}C${c - 0.45 * w} ${c - 1.35 * hh} ${c + 0.45 * w} ${c - 1.35 * hh} ${c + w} ${c}C${c + 0.45 * w} ${c + 1.35 * hh} ${c - 0.45 * w} ${c + 1.35 * hh} ${c - w} ${c}Z`,
        stroke: 'currentColor', 'stroke-width': 1.4, 'stroke-linejoin': 'round',
      }), el('circle', { cx: c, cy: c, r: 0.36 * R, fill: 'currentColor' }));
      break;
    }
    case 'inactive': {
      // A crescent lit at the left: the disc less a disc shifted right and up.
      const id = 'mf-moon-' + Math.random().toString(36).slice(2);
      const mask = el('mask', { id });
      mask.append(el('rect', { x: 0, y: 0, width: SIZE, height: SIZE, fill: 'white' }), el('circle', { cx: c + 0.62 * R + 0.9, cy: c - 0.22 * R, r: R, fill: 'black' }));
      svg.append(mask, el('circle', { cx: c + 0.9, cy: c, r: R, fill: 'currentColor', opacity: 0.85, mask: `url(#${id})` }));
      break;
    }
    default:
      break;
  }
  return svg;
}

/** A block just finished has its glyph land and settle: from 1.45 its size,
 *  down to it with a little overshoot. */
export function landAndSettle(glyph) {
  if (Motion.reduced) return animate(glyph, [{ opacity: 0.2 }, { opacity: 1 }], { duration: Motion.base, easing: 'linear' });
  return animate(glyph, [{ transform: 'scale(1.45)' }, { transform: 'scale(1)' }], { duration: Motion.morph, easing: Motion.settle });
}

// ----------------------------------------------------------------- shimmer

const PERIOD = 3000;
const FADED = 0.3;

/**
 * A name shimmering while its block works: masked so a wide soft band,
 * faded to 30%, sweeps across it in 1.95 s of every 3, the name at full
 * strength between — by the clock, so every working name moves in step and
 * many read as one rhythm.
 */
export class Shimmer {
  constructor(el) {
    this.el = el;
    this.on = false;
    this.width = 0;
  }

  set(on) {
    if (on === this.on) return;
    this.on = on;
    this.layout(true);
  }

  /** Fitted again as the name lays out (its width sets the band). */
  layout(force = false) {
    const w = this.on ? Math.max(this.el.offsetWidth, 1) : 0;
    if (!force && w === this.width) return;
    this.width = w;
    this.anim?.cancel();
    this.anim = null;
    const style = this.el.style;
    if (!this.on) {
      style.maskImage = style.webkitMaskImage = '';
      return;
    }
    if (Motion.reduced) {
      style.maskImage = style.webkitMaskImage = 'linear-gradient(rgba(0,0,0,0.75), rgba(0,0,0,0.75))';
      return;
    }
    const band = Math.min(Math.min(Math.max(0.42 * w, 60), 160) / 2, 0.45 * w); // half the band, in points
    const half = band / (3 * w);
    const stop = (a, at) => `rgba(0,0,0,${a}) ${(at * 100).toFixed(3)}%`;
    const gradient = `linear-gradient(90deg, ${[stop(1, 0), stop(1, 0.5 - half), stop(FADED, 0.5 - half / 3), stop(FADED, 0.5 + half / 3), stop(1, 0.5 + half), stop(1, 1)].join(', ')})`;
    style.maskImage = style.webkitMaskImage = gradient;
    style.maskSize = style.webkitMaskSize = `${3 * w}px 100%`;
    style.maskRepeat = style.webkitMaskRepeat = 'no-repeat';
    // The band's centre from just off the left to just off the right.
    const from = -band - 2 - 1.5 * w, to = w + band + 2 - 1.5 * w;
    const at = (x) => ({ maskPosition: `${x}px 0`, webkitMaskPosition: `${x}px 0` });
    this.anim = this.el.animate(
      [{ ...at(from), offset: 0, easing: 'ease-in-out' }, { ...at(to), offset: 0.65, easing: 'step-end' }, { ...at(to), offset: 1 }],
      { duration: PERIOD * Motion.slowdown, iterations: Infinity });
    this.anim.currentTime = Date.now() % (PERIOD * Motion.slowdown);
  }
}
