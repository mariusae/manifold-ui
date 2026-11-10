// The strip at a view's right edge: a scroll bar that is only its knob, and
// left of it, over the content, a lane of ticks — one per heading or command,
// evenly spaced and centred, as claude.ai's conversation outline is. The knob
// says where you are; the ticks say what there is, and which of it is in view.
// Under the pointer the ticks swell as a Dock's icons do, and the one pointed
// at shows a card of what it holds.

import { h, Motion, clamp } from '../core/util.js';

// ------------------------------------------------------------ pure layout

export const StripLayout = {
  /** The scroll bar's column: the room the strip takes of the view's width. */
  width: 14,
  /** The ticks' lane, over the content left of that. */
  lane: 16,
  /** Centre-to-centre distance of ticks. */
  pitch: 12,
  /** Room above and below a scrolling column for a chevron. */
  pad: 14,
  tickWidth: 12,
  /** The four thicknesses a tick comes in (indexed by `heights()`). */
  thickness: [1.5, 3, 4.5, 6],
  /** How much wider a tick is directly under the pointer. */
  swell: 2.2,
  /** The magnification's Gaussian sigma. */
  reach: 24,
  cardWidth: 280,

  /** The span of the view's height the column may take. */
  track(height) {
    const t = Math.min(height, Math.max((height * 2) / 3, 120));
    return { top: Math.round((height - t) / 2), height: t };
  },
  fits(height) {
    return Math.max(1, Math.floor(height / StripLayout.pitch));
  },

  /** Which of `items` ([{level}]) get ticks: indices into `items`. A document
   *  gives up its deepest levels until the rest fit; the recent keeps all. */
  chosen(items, policy, fit) {
    const all = items.map((_, i) => i);
    if (policy !== 'document' || items.length <= fit) return all;
    const deepest = items.reduce((m, it) => Math.max(m, it.level ?? 0), 0);
    const upTo = (l) => all.filter((i) => (items[i].level ?? 0) <= l);
    let level = 0;
    for (let l = 0; l <= deepest; l++) if (upTo(l).length <= fit) level = l;
    let out = upTo(level);
    if (out.length < Math.min(fit, 3) && level < deepest) out = upTo(level + 1);
    return out;
  },

  /** How many ticks a column of `count` shows in `track`, and whether it scrolls. */
  column(count, track) {
    if (count * StripLayout.pitch <= track) return { shows: count, scrolls: false };
    return { shows: Math.max(1, Math.floor((track - 2 * StripLayout.pad) / StripLayout.pitch)), scrolls: true };
  },

  /** The top of a block of `n` ticks, centred in `height`; tick k's centre. */
  top(height, n) {
    return Math.round((height - n * StripLayout.pitch) / 2);
  },
  y(top, k) {
    return top + (k + 0.5) * StripLayout.pitch;
  },

  /** A scrolling column's first tick, moved as little as keeps the lit range
   *  [lo, hi] in its window (larger than the window, its start wins). */
  first(f, [lo, hi], shows, count) {
    if (hi >= f + shows) f = hi - shows + 1;
    if (lo < f) f = lo;
    return Math.min(Math.max(f, 0), Math.max(count - shows, 0));
  },

  /** Each tick's thickness (an index 0…3) from the sizes of what they span:
   *  relative to each other on a log scale, the top and bottom tenth trimmed. */
  heights(sizes) {
    const logs = sizes.map((s) => Math.log(Math.max(s, 1)));
    const sorted = [...logs].sort((a, b) => a - b);
    if (sorted.length <= 1) return sizes.map(() => 1);
    const cut = sorted.length >= 10 ? Math.floor(sorted.length / 10) : 0;
    const lo = sorted[cut], hi = sorted[sorted.length - 1 - cut];
    if (!(hi - lo > 1e-6)) return sizes.map(() => 1);
    return logs.map((l) => Math.min(3, Math.max(0, Math.trunc(((l - lo) / (hi - lo)) * 4))));
  },

  /** Which ticks are lit: those whose stretch (to the next tick, or the end) meets the viewport. */
  lit(starts, total, offset, shown) {
    return starts.map((s, k) => {
      const end = Math.max(k + 1 < starts.length ? starts[k + 1] : total, s + 1);
      return s < offset + shown && end > offset;
    });
  },

  /** A tick's width factor, the pointer `d` from its centre. */
  swollen(d) {
    return 1 + (StripLayout.swell - 1) * Math.exp(-(d * d) / (2 * StripLayout.reach * StripLayout.reach));
  },

  /** A document's items: each from its top to the next at its level or shallower (the last to the end). */
  sections(tops, levels, total) {
    return tops.map((start, i) => {
      let end = total;
      for (let j = i + 1; j < tops.length; j++) {
        if ((levels[j] ?? 0) <= (levels[i] ?? 0)) { end = tops[j]; break; }
      }
      return { start, size: Math.max(end - start, 1) };
    });
  },

  /** Where the card goes (y down): its right edge 18 left of the strip, its
   *  top 16 above the tick's centre, kept inside `frame` ({x, y, w, h}). */
  card({ left, y, height, frame }) {
    const x = Math.max(frame.x + 4, left - StripLayout.cardWidth - 18);
    let top = Math.max(y - 16, frame.y + 30);
    top = Math.min(top, frame.y + frame.h - height - 4);
    return { x, y: top };
  },
};

// ------------------------------------------------------------ the scroll bar

/** The scroll bar: a 14pt column with no track, only a knob that shows
 *  itself when anything moves and goes a second after. */
export class Scrubber {
  static width = 14;
  static pad = 4;
  /** Overlay scroll bars (shown on use, then fading); false: always shown. Ticks follow it too. */
  static overlay = true;

  total = 0;
  offset = 0;
  shown = 0;
  /** (fraction 0…1 of the scrollable range) */
  onScroll = null;

  #drag = null;
  #press = false;
  #over = false;
  #timer = 0;
  #listeners = [];

  constructor({ onScroll = null } = {}) {
    this.onScroll = onScroll;
    this.knob = h('div.mf-scrubber-knob');
    this.knob.style.display = 'none';
    this.el = h('div.mf-scrubber', this.knob);
    const on = (type, fn) => { this.el.addEventListener(type, fn); this.#listeners.push([type, fn]); };
    on('pointerdown', (e) => this.#down(e));
    on('pointermove', (e) => this.#move(e));
    on('pointerup', (e) => this.#up(e));
    on('pointercancel', (e) => this.#up(e, true));
    on('pointerenter', () => { this.#over = true; this.reveal(); });
    on('pointerleave', () => { this.#over = false; this.reveal(); });
  }

  get scrolls() {
    return this.total > 0 && this.shown < this.total;
  }

  set({ total = this.total, offset = this.offset, shown = this.shown } = {}) {
    if (total === this.total && offset === this.offset && shown === this.shown) return;
    this.total = total; this.offset = offset; this.shown = shown;
    this.#place();
    this.reveal();
  }

  /** Shows the knob at once; a second later (the pointer off it, no drag) it fades. */
  reveal() {
    clearTimeout(this.#timer);
    this.knob.style.transition = 'none';
    this.knob.style.opacity = '1';
    if (!Scrubber.overlay || this.#over || this.#drag || this.#press) return;
    this.#timer = setTimeout(() => {
      this.knob.style.transition = `opacity ${300 * Motion.slowdown}ms`;
      this.knob.style.opacity = '0';
    }, 1000);
  }

  destroy() {
    clearTimeout(this.#timer);
    for (const [type, fn] of this.#listeners) this.el.removeEventListener(type, fn);
    this.#listeners = [];
    this.el.remove();
  }

  #place() {
    const { total, offset, shown } = this;
    this.knob.style.display = this.scrolls ? '' : 'none';
    if (!this.scrolls) return;
    // position(at) = pad + at / total · (height − 2·pad): in CSS, so it follows the column's height.
    const span = `(100% - ${2 * Scrubber.pad}px)`;
    this.knob.style.top = `calc(${Scrubber.pad}px + ${span} * ${offset / total})`;
    this.knob.style.height = `max(12px, calc(${span} * ${shown / total}))`;
  }

  #geometry(e) {
    const r = this.el.getBoundingClientRect();
    const span = Math.max(1, r.height - 2 * Scrubber.pad);
    const position = (at) => Scrubber.pad + (at / this.total) * span;
    const top = position(this.offset);
    return { y: e.clientY - r.top, height: r.height, span, top, bottom: top + Math.max(position(this.offset + this.shown) - top, 12) };
  }

  #down(e) {
    if (e.button !== 0 || !this.scrolls) return;
    e.preventDefault();
    e.stopPropagation();
    const g = this.#geometry(e);
    if (g.y >= g.top - 2 && g.y <= g.bottom + 2) this.#begin(g.y);
    else this.#press = true;
    try { this.el.setPointerCapture(e.pointerId); } catch { /* a pointer that's gone */ }
    this.reveal();
  }

  #begin(y) {
    this.#drag = { grab: y, start: this.offset };
    this.#press = false;
    this.knob.classList.add('mf-dragging');
  }

  #move(e) {
    if (!this.#drag && !this.#press) return;
    const g = this.#geometry(e);
    // A press on the track: the first move begins a drag from where it is (no jump).
    if (!this.#drag) this.#begin(g.y);
    const d = this.#drag;
    const range = Math.max(this.total - this.shown, 0);
    const rows = ((g.y - d.grab) / g.span) * this.total;
    const target = clamp(d.start + rows, 0, range);
    this.onScroll?.(target / Math.max(this.total - this.shown, 1));
  }

  #up(e, cancelled = false) {
    if (!this.#drag && !this.#press) return;
    if (this.#press && !cancelled) {
      // A click on the track: straight to that fraction of the range.
      const g = this.#geometry(e);
      this.onScroll?.(clamp((g.y - Scrubber.pad) / Math.max(1, g.height - 2 * Scrubber.pad), 0, 1));
    }
    this.#drag = null;
    this.#press = false;
    this.knob.classList.remove('mf-dragging');
    try { this.el.releasePointerCapture(e.pointerId); } catch { /* already released */ }
    this.reveal();
  }
}

// ------------------------------------------------------------ the strip

const SVG = 'http://www.w3.org/2000/svg';
function chevron(up) {
  // A V, half-width 3.5 and 3.5 high, stroked 1.5 with round ends.
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('width', '10');
  svg.setAttribute('height', '7');
  svg.setAttribute('viewBox', '0 0 10 7');
  svg.setAttribute('fill', 'none');
  svg.classList.add('mf-strip-chevron');
  const p = document.createElementNS(SVG, 'path');
  p.setAttribute('d', up ? 'M1.5 5.25L5 1.75L8.5 5.25' : 'M1.5 1.75L5 5.25L8.5 1.75');
  p.setAttribute('stroke', 'currentColor');
  p.setAttribute('stroke-width', '1.5');
  p.setAttribute('stroke-linecap', 'round');
  p.setAttribute('stroke-linejoin', 'round');
  svg.append(p);
  svg.style.display = 'none';
  return svg;
}

export class OutlineStrip {
  static width = StripLayout.width;
  static lane = StripLayout.lane;

  total = 0;
  offset = 0;
  shown = 0;
  /** [{start, size}], aligned with outline.items; nothing is drawn while the counts differ. */
  items = [];

  #first = 0;
  #litKey = '';
  #cacheKey = null;
  #cacheItems = null;
  #picked = [];
  #heights = [];
  #ticks = [];          // the window's: [{index, y, height, lit}]
  #block = { top: 0, bottom: 0 };
  #more = { above: false, below: false };
  #els = new Map();     // item index → its tick
  #pointerIn = false;
  #at = null;           // the pointer in the strip's coordinates, while in its frame
  #pointer = null;      // its y while on the column (what the ticks swell to)
  #hovered = null;      // the item index of the tick it's at
  #chevron = null;      // 'up' | 'down' while on one
  #revealed = false;
  #fade = 0;
  #gone = 0;
  #press = null;
  #card = null;
  #carded = null;
  #off = [];
  #resize = null;

  constructor({
    outline, policy = 'document', scrolls = true, hasScrollBar = true,
    preview = null, cardRoot = null, onScroll = null, onDragItem = null,
  } = {}) {
    this.outline = outline;
    this.policy = policy;
    this.scrolls = scrolls;
    this.hasScrollBar = hasScrollBar;
    this.preview = preview;
    this.cardRoot = cardRoot;
    this.onScroll = onScroll;
    this.onDragItem = onDragItem;

    this.scrubber = new Scrubber({ onScroll: (f) => this.onScroll?.(f) });
    if (!(scrolls && hasScrollBar)) this.scrubber.el.style.display = 'none';
    this.up = chevron(true);
    this.down = chevron(false);
    this.column = h('div.mf-strip-column', this.up, this.down);
    this.hit = h('div.mf-strip-hit');
    this.hit.style.display = 'none';
    this.el = h('div.mf-strip', this.column, this.hit, this.scrubber.el);
    if (!Scrubber.overlay) this.#show(0);

    const listen = (target, type, fn, options) => {
      target.addEventListener(type, fn, options);
      this.#off.push(() => target.removeEventListener(type, fn, options));
    };
    listen(document, 'pointermove', (e) => this.#moved(e), { passive: true });
    listen(document.documentElement, 'pointerleave', () => this.#left());
    listen(this.hit, 'pointerdown', (e) => this.#down(e));
    listen(this.hit, 'pointerup', (e) => this.#up(e));
    listen(this.hit, 'pointercancel', () => { this.#press = null; });
    if (outline) {
      this.#off.push(outline.on('change', () => this.#relayout()));
      this.#off.push(outline.on('current', () => { if (!this.scrolls) this.#relayout(); }));
    }
    if (typeof ResizeObserver !== 'undefined') {
      this.#resize = new ResizeObserver(() => this.#relayout());
      this.#resize.observe(this.el);
    }
  }

  /** Where the view is and what its items span. Any of them may be left out. */
  set({ total, offset, shown, items } = {}) {
    if (total != null) this.total = total;
    if (offset != null) this.offset = offset;
    if (shown != null) this.shown = shown;
    if (items) this.items = items;
    this.scrubber.set({ total: this.total, offset: this.offset, shown: this.shown });
    this.#relayout();
  }

  /** Shows the ticks (a wheel turned over the view, the pointer in the strip);
   *  a second after, the pointer not in the strip, they fade. */
  revealTicks() {
    clearTimeout(this.#fade);
    clearTimeout(this.#gone);
    this.#gone = 0;
    if (!this.#revealed || this.column.style.opacity !== '1') this.#show(Motion.reduced ? 0 : 150 * Motion.slowdown);
    if (!this.#pointerIn && Scrubber.overlay) this.#fade = setTimeout(() => this.#conceal(), 1000);
  }

  destroy() {
    clearTimeout(this.#fade);
    clearTimeout(this.#gone);
    for (const off of this.#off) off();
    this.#off = [];
    this.#resize?.disconnect();
    this.scrubber.destroy();
    this.#card?.remove();
    this.#card = null;
    this.el.remove();
  }

  /** The ticks drawn now, for whoever wants to look: [{index, y, height, lit}]. */
  get ticks() {
    return this.#ticks.map((t) => ({ ...t }));
  }

  // ---------------------------------------------------------------- showing

  #show(ms) {
    this.#revealed = true;
    this.column.style.transition = ms > 0 ? `opacity ${ms}ms` : 'none';
    this.column.style.opacity = '1';
    this.el.classList.add('mf-revealed');
  }

  #conceal() {
    this.column.style.transition = `opacity ${300 * Motion.slowdown}ms`;
    this.column.style.opacity = '0';
    this.#hideCard();
    // Faded, the ticks take nothing.
    this.#gone = setTimeout(() => {
      this.#gone = 0;
      this.#revealed = false;
      this.el.classList.remove('mf-revealed');
      if (this.#point(null)) this.#draw(false);
    }, 300 * Motion.slowdown);
  }

  // ----------------------------------------------------------------- layout

  #relayout() {
    const o = this.outline;
    const height = this.el.clientHeight;
    const ok = !!o && height > 0 && this.items.length === o.items.length;
    let shows = 0, scrolls = false;
    if (!ok) {
      this.#picked = [];
      this.#heights = [];
      this.#cacheKey = null;
    } else {
      const track = StripLayout.track(height);
      const key = `${o.generation}|${o.filter.join(' ')}|${track.height}|${this.policy}`;
      if (key !== this.#cacheKey || this.items !== this.#cacheItems) {
        this.#cacheKey = key;
        this.#cacheItems = this.items;
        // The pool is what the filter admits; of it, what fits.
        const pool = o.shown;
        const levels = pool.map((i) => ({ level: o.items[i].level ?? 0 }));
        this.#picked = StripLayout.chosen(levels, this.policy, StripLayout.fits(track.height)).map((k) => pool[k]);
        this.#heights = StripLayout.heights(this.#picked.map((i) => this.items[i].size));
      }
      ({ shows, scrolls } = StripLayout.column(this.#picked.length, track.height));
    }
    const picked = this.#picked;
    const n = Math.min(shows, picked.length);

    const lit = this.scrolls
      ? StripLayout.lit(picked.map((i) => this.items[i].start), this.total, this.offset, this.shown)
      : picked.map((i) => i === o.current);
    const lo = lit.indexOf(true), hi = lit.lastIndexOf(true);
    // The column moves only when the lit range does (a chevron's click stays put till then).
    const litKey = `${this.#cacheKey}|${picked.length}|${lo}|${hi}`;
    if (!scrolls) this.#first = 0;
    else if (litKey !== this.#litKey && lo >= 0) this.#first = StripLayout.first(this.#first, [lo, hi], n, picked.length);
    else this.#first = clamp(this.#first, 0, Math.max(picked.length - n, 0));
    this.#litKey = litKey;

    const top = StripLayout.top(height, n);
    this.#ticks = [];
    for (let k = 0; k < n; k++) {
      const at = this.#first + k;
      this.#ticks.push({ index: picked[at], y: StripLayout.y(top, k), height: this.#heights[at], lit: lit[at] });
    }
    this.#block = { top, bottom: top + n * StripLayout.pitch };
    this.#more = { above: scrolls && this.#first > 0, below: scrolls && this.#first + n < picked.length };

    this.#point(this.#pointerIn ? this.#at : null);
    this.#draw(this.#pointer != null);
    if (this.#carded != null) this.#placeCard();
  }

  #onColumn(p) {
    if (!this.#ticks.length || p.x < 0 || p.x >= StripLayout.lane) return false;
    const b = this.#block;
    return p.y >= b.top - (this.#more.above ? StripLayout.pad : 2) && p.y <= b.bottom + (this.#more.below ? StripLayout.pad : 2);
  }

  #chevronAt(p) {
    const b = this.#block;
    if (this.#more.above && p.y >= b.top - 16 && p.y < b.top) return 'up';
    if (this.#more.below && p.y > b.bottom && p.y <= b.bottom + 16) return 'down';
    return null;
  }

  #tickNear(y) {
    let best = null;
    for (const t of this.#ticks) if (!best || Math.abs(t.y - y) < Math.abs(best.y - y)) best = t;
    return best && Math.abs(best.y - y) <= StripLayout.pitch / 2 + 1 ? best : null;
  }

  /** Takes the pointer (in the strip's coordinates, or null); true if what's drawn changes. */
  #point(p) {
    let pointer = null, hovered = null, chev = null;
    if (p && this.#revealed && this.#onColumn(p)) {
      chev = this.#chevronAt(p);
      // On a chevron nothing swells and no card shows.
      if (!chev) {
        pointer = p.y;
        hovered = this.#tickNear(p.y)?.index ?? null;
      }
    }
    const changed = pointer !== this.#pointer || hovered !== this.#hovered || chev !== this.#chevron;
    const was = this.#hovered;
    this.#pointer = pointer;
    this.#hovered = hovered;
    this.#chevron = chev;
    if (hovered !== was) {
      if (hovered == null) this.#hideCard();
      else this.#showCard(hovered);
    }
    return changed;
  }

  // ---------------------------------------------------------------- drawing

  #draw(animated) {
    const time = animated && !Motion.reduced ? Motion.fast : 0;
    this.column.style.setProperty('--mf-strip-time', `${time}ms`);
    const L = StripLayout;
    const seen = new Set();
    for (const t of this.#ticks) {
      seen.add(t.index);
      let el = this.#els.get(t.index);
      if (!el) {
        el = h('div.mf-strip-tick');
        el.dataset.index = t.index;
        this.#els.set(t.index, el);
        this.column.append(el);
      }
      const item = this.outline.items[t.index] ?? {};
      const swell = this.#pointer != null ? L.swollen(Math.abs(this.#pointer - t.y)) : 1;
      const near = (swell - 1) / (L.swell - 1);
      const w = L.tickWidth * swell;
      const th = L.thickness[t.height] ?? L.thickness[1];
      const base = this.#hovered === t.index ? '--mf-text'
        : item.running ? '--mf-accent'
          : item.failed ? '--mf-status-failed'
            : item.you ? '--mf-accent'
              : t.lit ? '--mf-text' : '--mf-text-tertiary';
      const mix = Math.round(near * 70 * 10) / 10;
      const sig = `${t.y}|${w.toFixed(2)}|${th}|${base}|${mix}`;
      if (el._sig !== sig) {
        el._sig = sig;
        el.style.top = `${t.y - th / 2}px`;
        el.style.width = `${+w.toFixed(2)}px`;
        el.style.height = `${th}px`;
        el.style.borderRadius = `${Math.min(Math.min(th, w) / 2, 1.5)}px`;
        el.style.backgroundColor = mix > 0 && base !== '--mf-text'
          ? `color-mix(in srgb, var(--mf-text) ${mix}%, var(${base}))`
          : `var(${base})`;
      }
      el.classList.toggle('mf-lit', !!t.lit);
      el.classList.toggle('mf-hovered', this.#hovered === t.index);
    }
    for (const [index, el] of this.#els) {
      if (!seen.has(index)) { el.remove(); this.#els.delete(index); }
    }

    const b = this.#block, m = this.#more;
    const x = L.lane - 2 - L.tickWidth / 2;       // 8: the middle of a tick at rest
    for (const [el, shown, cy, name] of [[this.up, m.above, b.top - 7, 'up'], [this.down, m.below, b.bottom + 7, 'down']]) {
      el.style.display = shown ? '' : 'none';
      el.style.left = `${x - 5}px`;
      el.style.top = `${cy - 3.5}px`;
      el.classList.toggle('mf-over', this.#chevron === name);
    }

    // What takes the pointer: the block, and a little past it (more where a chevron is).
    if (!this.#ticks.length) this.hit.style.display = 'none';
    else {
      const top = b.top - (m.above ? L.pad : 2), bottom = b.bottom + (m.below ? L.pad : 2);
      this.hit.style.display = '';
      this.hit.style.top = `${top}px`;
      this.hit.style.height = `${bottom - top}px`;
    }
  }

  // ---------------------------------------------------------------- pointer

  #local(e) {
    const r = this.el.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top, w: r.width, h: r.height };
  }

  #moved(e) {
    if (!this.el.isConnected) return;
    const p = this.#local(e);
    // A drag from a pressed tick, past 4pt: the item, carried.
    const press = this.#press;
    if (press && press.tick != null && !press.dragged && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 4) {
      press.dragged = true;
      this.#hideCard();
      try { this.hit.releasePointerCapture(e.pointerId); } catch { /* not held */ }
      this.onDragItem?.(press.tick, e);
    }
    const view = this.el.parentElement;
    const inside = p.x >= 0 && p.x < p.w && p.y >= 0 && p.y < p.h
      && (!view || !(e.target instanceof Node) || view.contains(e.target));
    if (!inside) return this.#left();
    this.#pointerIn = true;
    this.#at = { x: p.x, y: p.y };
    this.revealTicks();
    if (this.#point(this.#at)) this.#draw(true);
  }

  #left() {
    if (!this.#pointerIn) return;
    this.#pointerIn = false;
    this.#at = null;
    if (this.#point(null)) this.#draw(true);
    if (this.#revealed) this.revealTicks();      // starts the second after which they fade
  }

  #down(e) {
    if (e.button !== 0) return;
    const p = this.#local(e);
    if (!this.#onColumn(p)) return;
    e.preventDefault();
    e.stopPropagation();
    const chev = this.#chevronAt(p);
    const tick = chev ? null : this.#tickNear(p.y);
    this.#press = { chevron: chev, tick: tick?.index ?? null, x: e.clientX, y: e.clientY, dragged: false };
    try { this.hit.setPointerCapture(e.pointerId); } catch { /* a pointer that's gone */ }
  }

  #up(e) {
    const press = this.#press;
    this.#press = null;
    if (!press || press.dragged) return;
    if (press.chevron) {
      // The column, by all but two of what it shows.
      const n = this.#ticks.length;
      const step = Math.max(1, n - 2) * (press.chevron === 'up' ? -1 : 1);
      this.#first = clamp(this.#first + step, 0, Math.max(this.#picked.length - n, 0));
      this.#hideCard();
      this.#relayout();
    } else if (press.tick != null) {
      this.#hideCard();
      this.outline.pick(press.tick);
    }
  }

  // ------------------------------------------------------------------- card

  #root() {
    return this.cardRoot ?? this.el.closest('.mf-root') ?? document.body;
  }

  #showCard(index) {
    const item = this.outline.items[index];
    if (!item) return this.#hideCard();
    const card = this.#card ??= h('div.mf-strip-card.mf-float');
    let content = null;
    try { content = this.preview?.(index) ?? null; } catch { content = null; }
    const lines = (content?.lines ?? []).map((l) => String(l)).filter((l) => l.trim() !== '');
    const code = !!(content?.code || item.code);
    card.replaceChildren(
      h('div.mf-strip-card-title', item.title),
      ...(item.detail ? [h('div.mf-strip-card-detail', item.detail)] : []),
      ...(lines.length
        ? [code
          ? h('div.mf-strip-card-body.mf-code', lines.slice(0, 5).map((l) => h('div', l)))
          : h('div.mf-strip-card-body', lines.join(' '))]
        : []),
    );
    const root = this.#root();
    if (card.parentNode !== root) root.append(card);
    this.#carded = index;
    this.#placeCard();
  }

  #placeCard() {
    const card = this.#card, tick = this.#ticks.find((t) => t.index === this.#carded);
    if (!card?.isConnected || !tick) return this.#hideCard();
    const strip = this.el.getBoundingClientRect();
    const root = this.#root();
    const view = { x: 0, y: 0, w: window.innerWidth, h: window.innerHeight };
    let frame = view;
    if (root !== document.body) {
      const r = root.getBoundingClientRect();
      const x = Math.max(r.left, 0), y = Math.max(r.top, 0);
      frame = { x, y, w: Math.min(r.right, view.w) - x, h: Math.min(r.bottom, view.h) - y };
    }
    const at = StripLayout.card({ left: strip.left, y: strip.top + tick.y, height: card.offsetHeight, frame });
    // Fixed, in the viewport's coordinates — or whatever an ancestor's transform has made of them.
    card.style.left = '0px';
    card.style.top = '0px';
    const origin = card.getBoundingClientRect();
    card.style.left = `${Math.round(at.x - origin.left)}px`;
    card.style.top = `${Math.round(at.y - origin.top)}px`;
  }

  #hideCard() {
    this.#carded = null;
    this.#card?.remove();
  }
}

// ------------------------------------------------ bound to a scrolling element

/**
 * Binds a strip to a scrollable element: computes total/offset/shown, hides
 * the native scrollbar, keeps outline.current as it scrolls (the last item
 * whose top ≤ scrollTop + 12, else the first), scrolls on a pick so the item
 * is 8px below the top, and shows the ticks when a wheel turns over it.
 * `tops()` gives each outline item's top, in px, in the scrolled content.
 * The strip's element is the caller's to place (at the view's right edge).
 */
export function bindScrollStrip(scrollEl, { outline, tops, policy = 'document', preview = null, onDragItem = null, cardRoot = null } = {}) {
  let height = -1, generation = -1, cache = [], items = [], hold = null;
  scrollEl.classList.add('mf-scroll-bound');

  const range = () => Math.max(scrollEl.scrollHeight - scrollEl.clientHeight, 0);
  const strip = new OutlineStrip({
    outline, policy, preview, cardRoot, onDragItem,
    onScroll: (f) => { scrollEl.scrollTop = f * range(); sync(); },
  });

  function sync(requery = false) {
    const total = scrollEl.scrollHeight, shown = scrollEl.clientHeight, offset = scrollEl.scrollTop;
    if (!scrollEl.isConnected || shown <= 0) return;      // not laid out yet: nothing is anywhere
    // The tops are asked for again only when the content's height or the outline's items changed.
    if (requery || total !== height || outline.generation !== generation) {
      height = total;
      generation = outline.generation;
      let t = [];
      try { t = tops?.() ?? []; } catch { t = []; }
      cache = Array.from(t, Number);
      const levels = policy === 'recent' ? cache.map(() => 0) : outline.items.map((it) => it.level ?? 0);
      items = cache.length === outline.items.length ? StripLayout.sections(cache, levels, total) : [];
    }
    strip.set({ total, offset, shown, items });
    // A pick's own scroll leaves the pick current (the end of a document can't come to the top).
    if (hold != null && Math.abs(offset - hold) < 1) return;
    hold = null;
    if (!cache.length || cache.length !== outline.items.length) return;
    let current = 0;
    for (let k = 0; k < cache.length; k++) if (cache[k] <= offset + 12) current = k;
    outline.setCurrent(current);
  }

  const onScroll = () => sync();
  const onWheel = (e) => { if (e.deltaY !== 0) strip.revealTicks(); };
  // A wheel turned over the strip itself (it's beside the content, not in it) scrolls the content.
  const onStripWheel = (e) => {
    if (e.deltaY === 0) return;
    const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? scrollEl.clientHeight : 1;
    scrollEl.scrollTop += e.deltaY * unit;
    strip.revealTicks();
  };
  scrollEl.addEventListener('scroll', onScroll, { passive: true });
  scrollEl.addEventListener('wheel', onWheel, { passive: true });
  strip.el.addEventListener('wheel', onStripWheel, { passive: true });

  const offChange = outline.on('change', () => sync());
  const offPick = outline.on('pick', (i) => {
    if (cache.length !== outline.items.length || cache[i] == null) return;
    scrollEl.scrollTop = Math.max(0, cache[i] - 8);
    hold = scrollEl.scrollTop;
    sync();
  });

  let observer = null;
  if (typeof ResizeObserver !== 'undefined') {
    observer = new ResizeObserver(() => sync());
    observer.observe(scrollEl);
  }
  sync(true);

  return {
    strip,
    /** Call when the content or the outline changed (the tops are asked for again). */
    update() { sync(true); },
    destroy() {
      scrollEl.removeEventListener('scroll', onScroll);
      scrollEl.removeEventListener('wheel', onWheel);
      strip.el.removeEventListener('wheel', onStripWheel);
      offChange();
      offPick();
      observer?.disconnect();
      scrollEl.classList.remove('mf-scroll-bound');
      strip.destroy();
    },
  };
}
