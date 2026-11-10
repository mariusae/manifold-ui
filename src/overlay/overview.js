// Overview (Manifold's StateView, ⌘'): every tile of the space at once, in
// place of the grid — as a list, stacked down one scrolling column; as an
// overview, all of them in one grid as Mission Control lays out windows; or
// as summaries, a summary card each (what more than ten shows by itself).
// The cells are the tiles themselves, live, each under its bar; a bar or a
// card clicked is gone to. Opening, each tile becomes its cell where the
// cell is — its outline going there, what it shows scaled to its width —
// and the rest fades in; closing, the reverse.
//
//   const overview = new Overview({ stage })      // stage: the element it fills (the grid's parent)
//   overview.open({ title, tiles, from, mode, onOpen, onClose, onMode })
//     tiles   [{ id, shown, content, summary }] — `shown` as TileBar.show takes it, `content` the
//             tile's live element (or null), `summary` a SummaryCard's content
//     from    { [id]: DOMRect } — where each tile's card is on screen now (may be empty)
//     mode    'list' | 'overview' | 'summaries' | null (null: 'overview', 'summaries' for more than 10)
//     onOpen(id, mods)   a bar or a summary card clicked
//     onClose()          × or Esc: the owner then calls close()
//     onMode(mode)       a mode chosen in the header
//   overview.close({ to, restore }) → Promise     // to: { [id]: DOMRect } where each card will be in the grid;
//                                                 // restore(id, element): each content given back, before anything moves
//   overview.update(tiles)                        // titles and status changed while open: redressed in place
//   overview.isOpen, overview.mode
//
// `open` moves each `content` into its cell; `close` gives every one back.
// Also exported, for whoever wants the arithmetic: `overviewGrid` and
// `overviewFrames`.

import { h, Motion, animate, modifiers, setRect } from '../core/util.js';
import { iconButton } from '../icons/icons.js';
import { TileBar } from '../grid/tilebar.js';
import { SummaryCard } from '../grid/summarycard.js';
import { flatSegments } from './flat.js';

const HEADER = 44;
const MARGIN = 16;
const LIST_HEIGHT = 440;
const LEAST = { w: 240, h: 180 };
const SUMMARY_COLUMN = 340;
const MODES = ['list', 'overview', 'summaries'];
// A picture coming in over the one leaving, inside a morph (linear between keys).
const COMING = [{ opacity: 0, offset: 0 }, { opacity: 0, offset: 0.2 }, { opacity: 1, offset: 0.75 }, { opacity: 1, offset: 1 }];
const GOING = [{ opacity: 1, offset: 0 }, { opacity: 1, offset: 0.2 }, { opacity: 0, offset: 0.75 }, { opacity: 0, offset: 1 }];

/**
 * The overview's cells, as Mission Control fits windows to the screen: as
 * many columns as give the cells the most of the room with all of them in
 * it at once, each the same, from about square to twice as wide as tall; so
 * many that they'd be small, and they keep a least size and the room scrolls.
 * @returns {{columns: number, rows: number, cell: {w: number, h: number}, scrolls: boolean}}
 */
export function overviewGrid(count, room, m = MARGIN) {
  const rowsOf = (columns) => Math.ceil(count / Math.max(columns, 1));
  if (!(count > 0) || !(room.w > 0) || !(room.h > 0)) return { columns: 1, rows: Math.max(count, 0), cell: { w: 400, h: 300 }, scrolls: false };
  let best = { columns: 1, cell: { w: 0, h: 0 } };
  for (let columns = 1; columns <= count; columns++) {
    const rows = rowsOf(columns);
    const w = (room.w - (columns + 1) * m) / columns;
    const hgt = (room.h - (rows + 1) * m) / rows;
    if (!(w > 0) || !(hgt > 0)) continue;
    const cw = Math.min(w, hgt * 2), ch = Math.min(hgt, cw / 1.1);
    if (cw * ch > best.cell.w * best.cell.h) best = { columns, cell: { w: Math.floor(cw), h: Math.floor(ch) } };
  }
  if (best.cell.w >= LEAST.w) return { ...best, rows: rowsOf(best.columns), scrolls: false };
  const columns = Math.max(1, Math.floor((room.w - m) / (LEAST.w + m)));
  return { columns, rows: rowsOf(columns), cell: { w: Math.max(0, Math.floor((room.w - (columns + 1) * m) / columns)), h: LEAST.h }, scrolls: true };
}

/**
 * Where each of `count` cells is in a room `{w, h}` (under the header), by
 * mode, and how tall what they're in is (the room's height, or more: it scrolls).
 * @returns {{frames: {x, y, w, h}[], height: number}}
 */
export function overviewFrames(mode, count, room, m = MARGIN) {
  const W = room.w, H = room.h;
  const frames = [];
  let bottom = m;
  if (mode === 'summaries') {
    // Cards in as many columns as fit, each as tall as a card.
    const columns = Math.max(1, Math.floor((W - m) / (SUMMARY_COLUMN + m)));
    const w = Math.max(0, Math.floor((W - (columns + 1) * m) / columns));
    for (let i = 0; i < count; i++) {
      const r = { x: m + (i % columns) * (w + m), y: m + Math.floor(i / columns) * (SummaryCard.height + m), w, h: SummaryCard.height };
      frames.push(r);
      bottom = r.y + r.h + m;
    }
  } else if (mode === 'list') {
    for (let i = 0; i < count; i++) {
      frames.push({ x: m, y: bottom, w: Math.max(0, W - 2 * m), h: LIST_HEIGHT });
      bottom += LIST_HEIGHT + m;
    }
  } else if (count > 0) {
    const { columns, rows, cell } = overviewGrid(count, room, m);
    // The grid in the middle of the room, each row's cells centred — the last, short one by itself.
    const gridHeight = rows * cell.h + Math.max(rows - 1, 0) * m;
    const top0 = Math.max(m, Math.floor((H - gridHeight) / 2));
    for (let i = 0; i < count; i++) {
      const row = Math.floor(i / columns), col = i % columns;
      const inRow = row === rows - 1 ? count - row * columns : columns;
      const rowWidth = inRow * cell.w + (inRow - 1) * m;
      const r = { x: Math.floor((W - rowWidth) / 2) + col * (cell.w + m), y: top0 + row * (cell.h + m), w: cell.w, h: cell.h };
      frames.push(r);
      bottom = Math.max(bottom, r.y + r.h + m);
    }
  }
  return { frames, height: Math.max(bottom, H) };
}

const countText = (n) => (n === 0 ? 'nothing here' : `${n} block${n === 1 ? '' : 's'}`);
const box = (r) => ({ left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', height: r.h + 'px' });
/** A DOMRect (or an {x, y, w, h}) in the terms of something at `o` on screen. */
const within = (r, o) => ({ x: (r.left ?? r.x) - o.left, y: (r.top ?? r.y) - o.top, w: r.width ?? r.w, h: r.height ?? r.h });

export class Overview {
  constructor({ stage }) {
    this.stage = stage;
    this.el = null;
    this.state = 'closed';
    this.items = [];
    this.host = {};
    this.running = [];
    this.observer = null;
    this.closing = null;
    this.laid = null;
    this._mode = 'overview';
  }

  get isOpen() {
    return this.state === 'open';
  }

  get mode() {
    return this._mode;
  }

  // ------------------------------------------------------------- opening

  open({ title = '', tiles = [], from = {}, mode = null, onOpen, onClose, onMode } = {}) {
    // One already here (or on its way out) is gone at once.
    this.#teardown();
    this.state = 'open';
    this.host = { onOpen, onClose, onMode };
    this._mode = MODES.includes(mode) ? mode : tiles.length > 10 ? 'summaries' : 'overview';

    this.segments = flatSegments({
      items: [
        { symbol: 'list.bullet', tooltip: 'List' },
        { symbol: 'square.grid.2x2', tooltip: 'Overview' },
        { symbol: 'rectangle.3.group', tooltip: 'Summaries' },
      ],
      selected: MODES.indexOf(this._mode),
      onChange: (i) => this.#chooseMode(MODES[i]),
    });
    this.segments.el.classList.add('mf-overview-modes');
    this.titleEl = h('span.mf-overview-title', title);
    this.countEl = h('span.mf-overview-count', countText(tiles.length));
    const close = iconButton('xmark', { size: 9, weight: 'semibold', tip: 'Back to the Space (esc)', className: 'mf-overview-close', onClick: () => this.#leave() });
    this.header = h('div.mf-overview-header', this.titleEl, this.countEl, h('span.mf-overview-spring'), this.segments.el, close);
    this.canvas = h('div.mf-overview-canvas');
    this.scroll = h('div.mf-overview-scroll', this.canvas);
    const el = h('div.mf-overview', { tabIndex: -1 }, this.header, this.scroll);
    // ⎋ leaves — unless a tile's own content has the keys; any other key passes.
    el.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape' || e.defaultPrevented || this.el !== el || this.state !== 'open') return;
      if (e.target.closest?.('.mf-overview-body')) return;
      e.preventDefault();
      e.stopPropagation();
      this.#leave();
    });
    this.el = el;
    this.items = tiles.map((tile) => this.#item(tile));
    this.canvas.append(...this.items.map((item) => item.cell.el));
    this.stage.append(el);
    this.#layout();
    if (typeof ResizeObserver !== 'undefined') {
      this.observer = new ResizeObserver(() => this.#resized());
      this.observer.observe(el);
    }
    el.focus({ preventScroll: true });
    this.#arrive(from);
  }

  /** A tile's cell: its bar (no buttons, unfocused, not to be dragged) over its live content. */
  #item(tile) {
    const item = { id: tile.id, tile, content: null, cell: null, card: null, frame: null, mods: null };
    const open = (mods) => { if (this.state === 'open') this.host.onOpen?.(item.id, mods); };
    const bar = new TileBar({
      onClick: (p, mods) => open(mods),
      onIconClick: (mods) => open(mods),
      // (The bar keeps ⇧-clicks for where a tile is; here they open, as any click.)
      onPathClick: () => open(item.mods ?? { command: false, option: false, shift: true, control: false }),
    });
    bar.showsButtons = false;
    bar.draggable = false;
    bar.show(tile.shown ?? {}, { focused: false });
    bar.el.addEventListener('pointerup', (e) => { item.mods = modifiers(e); }, true);
    const body = h('div.mf-tile-body.mf-overview-body');
    const inner = h('div.mf-overview-inner', bar.el, body);
    item.cell = { el: h('div.mf-overview-cell', { dataset: { tile: tile.id } }, inner), inner, bar, body };
    if (tile.content) {
      item.content = tile.content;
      body.append(tile.content);
    }
    return item;
  }

  /** A tile's summary card, made when summaries are first shown. */
  #card(item) {
    if (item.card) return item.card;
    const summary = new SummaryCard(this.#summaryOf(item.tile), {
      onClick: (e) => { if (this.state === 'open') this.host.onOpen?.(item.id, modifiers(e)); },
    });
    const inner = h('div.mf-overview-inner', summary.el);
    item.card = { el: h('div.mf-overview-cell.mf-overview-card', { dataset: { tile: item.id } }, inner), inner, summary };
    this.canvas.append(item.card.el);
    return item.card;
  }

  #summaryOf(tile) {
    const s = tile.shown ?? {};
    return tile.summary ?? { symbol: s.symbol, title: s.title, place: s.place, status: s.status, lines: s.summary?.lines ?? [], note: s.summary?.note };
  }

  /** What stands for a tile in this mode: its live cell, or its card. */
  #part(item) {
    return this._mode === 'summaries' ? item.card : item.cell;
  }

  // -------------------------------------------------------------- layout

  /** The room under the header: the scrolling part's, were nothing scrolling. */
  #room() {
    return { w: this.el.clientWidth, h: Math.max(0, this.el.clientHeight - HEADER) };
  }

  #layout() {
    if (!this.el) return;
    const room = this.#room();
    this.laid = room;
    const summaries = this._mode === 'summaries';
    const { frames, height } = overviewFrames(this._mode, this.items.length, room);
    this.items.forEach((item, i) => {
      if (summaries) this.#card(item);
      item.cell.el.hidden = summaries;
      if (item.card) item.card.el.hidden = !summaries;
      const part = this.#part(item);
      const r = frames[i];
      item.frame = r;
      setRect(part.el, r);
      // What's in it is as large as it'll be, hung from its top-left: a cell
      // on its way somewhere cuts it off, never squashes it.
      part.inner.style.width = r.w + 'px';
      part.inner.style.height = r.h + 'px';
      if (summaries) part.summary.shimmer?.layout();
      else part.bar.layout(r.w);
    });
    this.canvas.style.height = height + 'px';
  }

  #resized() {
    if (!this.el || this.state !== 'open') return;
    const room = this.#room();
    if (this.laid && this.laid.w === room.w && this.laid.h === room.h) return;
    this.#settle();
    this.#layout();
  }

  #chooseMode(mode) {
    if (this.state !== 'open' || mode === this._mode || !MODES.includes(mode)) return;
    this._mode = mode;
    // Laid out again at once: only the segments' band glides.
    this.#settle();
    this.scroll.scrollTop = 0;
    this.#layout();
    this.host.onMode?.(mode);
  }

  #leave() {
    if (this.state === 'open') this.host.onClose?.();
  }

  /** Titles and status changed while open: bars and cards redressed in place
   *  (tiles it doesn't have are left to the next `open`). */
  update(tiles) {
    if (this.state !== 'open') return;
    const byId = new Map(this.items.map((item) => [item.id, item]));
    for (const tile of tiles ?? []) {
      const item = byId.get(tile.id);
      if (!item) continue;
      item.tile = tile;
      item.cell.bar.show(tile.shown ?? {}, { focused: false });
      if (item.card) item.card.summary.content = this.#summaryOf(tile);
      if (tile.content && tile.content !== item.content) {
        item.content = tile.content;
        item.cell.body.replaceChildren(tile.content);
      }
    }
  }

  // -------------------------------------------------------------- motion

  /** Each cell in view with somewhere to come from or go to: `{item, part, there}`,
   *  `there` in the terms of something at `origin` on screen. None as a list, or with less motion. */
  #flights(rects, origin) {
    if (Motion.reduced || this._mode === 'list' || !rects) return [];
    const top = this.scroll.scrollTop, bottom = top + this.scroll.clientHeight;
    const out = [];
    for (const item of this.items) {
      const r = rects[item.id], f = item.frame;
      if (!r || !f || !(f.w > 0) || !(f.h > 0) || f.y + f.h <= top || f.y >= bottom) continue;
      const there = within(r, origin);
      if (there.w > 0 && there.h > 0) out.push({ item, part: this.#part(item), there });
    }
    return out;
  }

  #run(el, keyframes, options) {
    const a = animate(el, keyframes, options);
    this.running.push(a);
    return a;
  }

  /** Whatever's moving is where it's going, now. */
  #settle() {
    const running = this.running;
    this.running = [];
    for (const a of running) a.cancel();
    if (!this.el) return;
    this.el.classList.remove('mf-morphing');
    for (const el of this.el.querySelectorAll('.mf-flying')) el.classList.remove('mf-flying');
  }

  #grounds() {
    const style = getComputedStyle(this.el);
    return { tile: style.getPropertyValue('--mf-tile-ground').trim() || 'transparent', card: style.getPropertyValue('--mf-stack').trim() || 'transparent' };
  }

  /** Opening: each tile's cell from where its tile is to where the cell is,
   *  what's in it scaled to its width; the rest fades in. */
  #arrive(from) {
    const flights = this.#flights(from, this.canvas.getBoundingClientRect());
    if (!flights.length) {
      this.#run(this.el, [{ opacity: 0 }, { opacity: 1 }], { duration: Motion.base, easing: Motion.appear });
      this.#whenDone();
      return;
    }
    const d = Motion.morph;
    const flying = new Set(flights.map((f) => f.part.el));
    // Over the header, and out of the scrolling part's clip, on the way.
    this.el.classList.add('mf-morphing');
    for (const el of [this.header, ...this.items.map((item) => this.#part(item).el)]) {
      if (!flying.has(el)) this.#run(el, [{ opacity: 0 }, { opacity: 1 }], { duration: d, easing: Motion.appear });
    }
    const grounds = this.#grounds();
    for (const { item, part, there } of flights) {
      const f = item.frame;
      part.el.classList.add('mf-flying');
      this.#run(part.el, [box(there), box(f)], { duration: d, easing: Motion.travel });
      this.#run(part.inner, [{ transform: `scale(${there.w / f.w})` }, { transform: 'scale(1)' }], { duration: d, easing: Motion.travel });
      if (part === item.card) {
        // A card comes in on the way, over the tile's ground becoming its own.
        this.#run(part.summary.el, COMING, { duration: d, easing: 'linear' });
        this.#run(part.el, [{ backgroundColor: grounds.tile }, { backgroundColor: grounds.card }], { duration: d, easing: Motion.travel });
      }
    }
    this.#whenDone();
  }

  #whenDone() {
    const running = this.running;
    Promise.all(running.map((a) => a.done)).then(() => { if (this.running === running) this.#settle(); });
  }

  // ------------------------------------------------------------- closing

  /**
   * Closes. `to`: where each tile's card will be in the grid, for its cell to
   * go back to; `restore(id, element)`: called for every content, before
   * anything moves, to take it back. Resolves once it's gone.
   */
  close({ to = {}, restore } = {}) {
    if (this.state !== 'open') return this.closing ?? Promise.resolve();
    this.#settle();
    this.state = 'closing';
    this.observer?.disconnect();
    this.observer = null;
    const el = this.el;
    const here = el.getBoundingClientRect(), canvasAt = this.canvas.getBoundingClientRect();
    const flights = this.#flights(to, here);
    // Their content back where it lives, first.
    for (const item of this.items) {
      const content = item.content;
      if (!content) continue;
      item.content = null;
      if (restore) restore(item.id, content);
      else if (content.parentNode === item.cell.body) content.remove();
    }
    el.style.pointerEvents = 'none';
    if (!flights.length) {
      this.#run(el, [{ opacity: 1 }, { opacity: 0 }], { duration: Motion.base, easing: Motion.disappear, fill: 'forwards' });
    } else {
      const d = Motion.morph;
      const flying = new Set(flights.map((f) => f.part.el));
      for (const part of [this.header, ...this.items.map((item) => this.#part(item).el)]) {
        if (!flying.has(part)) this.#run(part, [{ opacity: 1 }, { opacity: 0 }], { duration: d, easing: Motion.appear, fill: 'forwards' });
      }
      // The cells that fly, lifted out of the scrolling part (over the header,
      // past its clip) to go; each gone by the time it's there, its tile under it.
      const layer = h('div.mf-overview-flights');
      el.append(layer);
      const dx = canvasAt.left - here.left, dy = canvasAt.top - here.top;
      const grounds = this.#grounds();
      for (const { item, part, there } of flights) {
        const f = { x: item.frame.x + dx, y: item.frame.y + dy, w: item.frame.w, h: item.frame.h };
        part.el.classList.add('mf-flying');
        setRect(part.el, f);
        layer.append(part.el);
        this.#run(part.el, [box(f), box(there)], { duration: d, easing: Motion.travel, fill: 'forwards' });
        this.#run(part.inner, [{ transform: 'scale(1)' }, { transform: `scale(${there.w / f.w})` }], { duration: d, easing: Motion.travel, fill: 'forwards' });
        this.#run(part.el, GOING, { duration: d, easing: 'linear', fill: 'forwards' });
        if (part === item.card) this.#run(part.el, [{ backgroundColor: grounds.card }, { backgroundColor: grounds.tile }], { duration: d, easing: Motion.travel, fill: 'forwards' });
      }
    }
    const done = Promise.all(this.running.map((a) => a.done)).then(() => {
      if (this.el === el) this.#teardown();
    });
    this.closing = done;
    return done;
  }

  /** Gone, whatever it was doing; contents it still holds are let go of. */
  #teardown() {
    const running = this.running;
    this.running = [];
    for (const a of running) a.cancel();
    this.observer?.disconnect();
    this.observer = null;
    for (const item of this.items) {
      if (item.content && item.content.parentNode === item.cell.body) item.content.remove();
      item.cell.bar.destroy();
      item.card?.summary.shimmer?.set(false);
    }
    this.items = [];
    this.el?.remove();
    this.el = null;
    this.header = this.scroll = this.canvas = this.segments = this.titleEl = this.countEl = null;
    this.host = {};
    this.laid = null;
    this.closing = null;
    this.state = 'closed';
  }
}
