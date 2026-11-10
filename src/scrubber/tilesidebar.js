// A tile's own sidebar (⌘/): its outline as a list at the tile's left, with
// a field to filter it. One width for every tile's, kept; each tile caps it
// at six tenths of itself. The row of the item you're at is the selected one,
// and follows as the content scrolls.

import { h, clamp, modifiers } from '../core/util.js';
import { icon } from '../icons/icons.js';

const KEY = 'mf.tileSidebarWidth';
const ROW = 24;
let stored = null;
const watchers = new Set();

export class TileSidebar {
  /** The one width, for every tile's sidebar: 220 unless set; 140…560. */
  static get width() {
    if (stored == null) {
      let v = NaN;
      try { v = parseFloat(localStorage.getItem(KEY)); } catch { /* no storage */ }
      stored = Number.isFinite(v) ? clamp(Math.round(v), 140, 560) : 220;
    }
    return stored;
  }
  static set width(w) {
    if (!Number.isFinite(w)) return;
    const v = clamp(Math.round(w), 140, 560);
    if (v === TileSidebar.width) return;
    stored = v;
    try { localStorage.setItem(KEY, String(v)); } catch { /* no storage */ }
    for (const fn of [...watchers]) fn(v);
  }
  /** The width a tile this wide gives it: at most six tenths of the tile. */
  static widthIn(tileWidth) {
    return Math.min(TileSidebar.width, Math.round(tileWidth * 0.6));
  }
  /** Hears the one width change (to lay a tile out again); returns the undoing. */
  static onWidth(fn) {
    watchers.add(fn);
    return () => watchers.delete(fn);
  }

  /** The listed items' indices, in order. */
  rows = [];
  /** The selected items' indices. */
  selected = new Set();
  /** True from focusFilter() until Return or Escape ends it: the current item isn't followed meanwhile. */
  searching = false;

  #anchor = null;
  #lead = null;
  #press = null;
  #tile = 0;
  #off = [];
  #rowEls = new Map();

  constructor({ outline, emptyText = 'No headings', onDragItems = null, onMenu = null, onSearchEnd = null } = {}) {
    this.outline = outline;
    this.emptyText = emptyText;
    this.onDragItems = onDragItems;
    this.onMenu = onMenu;
    this.onSearchEnd = onSearchEnd;

    this.field = h('input.mf-tile-sidebar-input', { type: 'text', placeholder: 'Filter', spellcheck: false, autocomplete: 'off' });
    this.field.setAttribute('aria-label', 'Filter');
    this.clearButton = h('button.mf-tile-sidebar-clear', { type: 'button', tabIndex: -1, title: 'Clear' }, icon('xmark.circle.fill', { size: 11 }));
    this.clearButton.hidden = true;
    this.filterEl = h('div.mf-tile-sidebar-filter', h('span.mf-tile-sidebar-glass', icon('magnifyingglass', { size: 10, weight: 'medium' })), this.field, this.clearButton);
    this.list = h('div.mf-tile-sidebar-list', { tabIndex: 0, role: 'listbox' });
    this.list.setAttribute('aria-multiselectable', 'true');
    this.empty = h('div.mf-tile-sidebar-empty');
    this.handle = h('div.mf-tile-sidebar-resize');
    this.el = h('div.mf-tile-sidebar', this.filterEl, this.list, this.empty, this.handle);

    const listen = (target, type, fn) => {
      target.addEventListener(type, fn);
      this.#off.push(() => target.removeEventListener(type, fn));
    };
    listen(this.field, 'input', () => this.#filtered());
    listen(this.field, 'keydown', (e) => this.#fieldKey(e));
    listen(this.field, 'blur', () => { if (this.searching) this.#endSearch(); });
    listen(this.clearButton, 'click', () => { this.field.value = ''; this.#filtered(); this.field.focus(); });
    listen(this.clearButton, 'pointerdown', (e) => e.preventDefault());
    listen(this.list, 'pointerdown', (e) => this.#down(e));
    listen(this.list, 'pointermove', (e) => this.#move(e));
    listen(this.list, 'pointerup', (e) => this.#up(e));
    listen(this.list, 'pointercancel', () => { this.#press = null; });
    listen(this.list, 'keydown', (e) => this.#listKey(e));
    listen(this.list, 'contextmenu', (e) => this.#menu(e));
    listen(this.handle, 'pointerdown', (e) => this.#resizeDown(e));
    listen(this.handle, 'pointermove', (e) => this.#resizeMove(e));
    listen(this.handle, 'pointerup', (e) => this.#resizeUp(e));
    listen(this.handle, 'pointercancel', (e) => this.#resizeUp(e));

    this.#off.push(outline.on('change', () => this.#render()));
    this.#off.push(outline.on('current', () => this.#markCurrent()));
    this.#off.push(TileSidebar.onWidth(() => { if (this.#tile) this.layout(this.#tile); }));

    this.field.value = outline.filter.join(' ');
    this.#render();
  }

  /** Takes its width of a tile this wide (capped at 60% of it); returns the width taken. */
  layout(tileWidth) {
    this.#tile = tileWidth;
    const w = TileSidebar.widthIn(tileWidth);
    this.el.style.width = `${w}px`;
    return w;
  }

  /** ⇧⌘P: the field takes the keyboard, its text selected; Return picks, Escape leaves. */
  focusFilter() {
    this.searching = true;
    this.field.focus({ preventScroll: true });
    this.field.select();
  }

  destroy() {
    for (const off of this.#off) off();
    this.#off = [];
    this.el.remove();
  }

  // ------------------------------------------------------------------- rows

  #render() {
    const o = this.outline;
    const rows = this.rows = o.shown;
    const flat = o.filter.length > 0;          // filtering, every row is at level 0
    this.#rowEls.clear();
    const els = rows.map((i) => {
      const it = o.items[i];
      const level = flat ? 0 : clamp(it.level ?? 0, 0, 4);
      const cls = ['mf-outline-row', level === 0 ? 'mf-level-0' : '', it.code ? 'mf-code' : '', it.path ? 'mf-path' : '', it.failed ? 'mf-failed' : '', it.running ? 'mf-running' : ''].filter(Boolean).join('.');
      const row = h('div.' + cls, { title: it.title, role: 'option', dataset: { index: i } },
        h('span.mf-outline-mark'),
        h('span.mf-outline-title', it.path ? h('bdi', it.title) : it.title),
        it.detail ? h('span.mf-outline-detail', it.detail) : null);
      row.style.paddingLeft = `${12 + level * 14}px`;
      this.#rowEls.set(i, row);
      return row;
    });
    this.list.replaceChildren(...els);
    this.empty.textContent = flat ? 'Nothing matches' : this.emptyText;
    this.empty.hidden = rows.length > 0;
    this.clearButton.hidden = this.field.value === '';
    this.selected = new Set([...this.selected].filter((i) => this.#rowEls.has(i)));
    if (this.searching && flat) this.#select(rows.length ? [rows[0]] : []);     // the first match, for Return
    else this.#markCurrent(true);
    this.#paint();
  }

  #paint() {
    for (const [i, row] of this.#rowEls) {
      const on = this.selected.has(i);
      row.classList.toggle('mf-selected', on);
      row.setAttribute('aria-selected', on ? 'true' : 'false');
    }
  }

  #select(indices, { reveal = true } = {}) {
    this.selected = new Set(indices);
    this.#lead = indices.length ? indices[indices.length - 1] : null;
    if (indices.length <= 1) this.#anchor = this.#lead;
    this.#paint();
    if (reveal && this.#lead != null) this.#revealRow(this.#lead);
  }

  /** The least scroll that brings a row into view; no animation. */
  #revealRow(i) {
    const row = this.#rowEls.get(i);
    if (!row) return;
    const top = row.offsetTop, list = this.list;
    if (top < list.scrollTop) list.scrollTop = top;
    else if (top + ROW > list.scrollTop + list.clientHeight) list.scrollTop = top + ROW - list.clientHeight;
  }

  /** Selects the row of the item you're at: the nearest listed at or before it. */
  #markCurrent(force = false) {
    if (this.searching && !force) return;
    const c = this.outline.current, rows = this.rows;
    let at = -1;
    if (c != null) for (let r = rows.length - 1; r >= 0; r--) if (rows[r] <= c) { at = r; break; }
    this.#select(at >= 0 ? [rows[at]] : []);
  }

  #rowAt(e) {
    const row = e.target instanceof Element ? e.target.closest('.mf-outline-row') : null;
    return row && this.list.contains(row) ? Number(row.dataset.index) : null;
  }

  // ---------------------------------------------------------------- pointer

  #down(e) {
    if (e.button !== 0) return;
    const i = this.#rowAt(e);
    if (i == null) return;
    const m = modifiers(e);
    this.#press = { i, x: e.clientX, y: e.clientY, plain: !m.command && !m.shift, dragged: false };
    if (m.command) {
      // ⌘: in or out of the selection, going nowhere.
      const next = new Set(this.selected);
      if (next.has(i)) next.delete(i); else next.add(i);
      this.selected = next;
      this.#anchor = this.#lead = i;
      this.#paint();
    } else if (m.shift) {
      const from = this.rows.indexOf(this.#anchor ?? this.#lead ?? i), to = this.rows.indexOf(i);
      const a = Math.min(from < 0 ? to : from, to), b = Math.max(from < 0 ? to : from, to);
      this.selected = new Set([...this.selected, ...this.rows.slice(a, b + 1)]);
      this.#lead = i;
      this.#paint();
    } else if (!this.selected.has(i)) {
      this.#select([i], { reveal: false });
    }
    try { this.list.setPointerCapture(e.pointerId); } catch { /* a pointer that's gone */ }
  }

  #move(e) {
    const p = this.#press;
    if (!p || p.dragged || Math.hypot(e.clientX - p.x, e.clientY - p.y) <= 4) return;
    p.dragged = true;
    try { this.list.releasePointerCapture(e.pointerId); } catch { /* not held */ }
    // The pressed row, and with it the rest of the selection if it's one of them.
    const carried = this.selected.has(p.i) && this.selected.size > 1 ? this.rows.filter((i) => this.selected.has(i)) : [p.i];
    this.onDragItems?.(carried, e);
  }

  #up() {
    const p = this.#press;
    this.#press = null;
    if (!p || p.dragged || !p.plain) return;
    this.#pick(p.i);
  }

  #pick(i) {
    const was = this.searching;
    if (was) this.#endSearch();
    this.#select([i], { reveal: false });
    this.outline.pick(i);
  }

  #menu(e) {
    const i = this.#rowAt(e);
    if (i == null || !this.onMenu) return;
    e.preventDefault();
    this.onMenu(i, { x: e.clientX, y: e.clientY });
  }

  // --------------------------------------------------------------- keyboard

  #step(by, extend = false) {
    const rows = this.rows;
    if (!rows.length) return;
    const at = this.#lead == null ? -1 : rows.indexOf(this.#lead);
    const to = at < 0 ? (by > 0 ? 0 : rows.length - 1) : clamp(at + by, 0, rows.length - 1);
    if (extend && this.#anchor != null && rows.includes(this.#anchor)) {
      const a = rows.indexOf(this.#anchor);
      this.selected = new Set(rows.slice(Math.min(a, to), Math.max(a, to) + 1));
      this.#lead = rows[to];
      this.#paint();
      this.#revealRow(rows[to]);
    } else this.#select([rows[to]]);
  }

  #listKey(e) {
    if (e.target !== this.list) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      this.#step(e.key === 'ArrowDown' ? 1 : -1, e.shiftKey);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const i = this.#lead != null && this.selected.has(this.#lead) ? this.#lead : this.rows.find((r) => this.selected.has(r));
      if (i != null) this.#pick(i);
    }
  }

  #fieldKey(e) {
    if (e.isComposing) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      // From none, the first row; then by one, kept in the list.
      if (this.#lead == null || !this.rows.includes(this.#lead)) { if (this.rows.length) this.#select([this.rows[0]]); }
      else this.#step(e.key === 'ArrowDown' ? 1 : -1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const i = this.rows.find((r) => this.selected.has(r));
      this.#endSearch();
      if (i != null) this.#pick(i);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      if (this.field.value !== '') { this.field.value = ''; this.#filtered(); }
      else this.#endSearch();
    }
  }

  #filtered() {
    this.clearButton.hidden = this.field.value === '';
    this.outline.setFilter(this.field.value);      // the outline says 'change' if its words did
  }

  #endSearch() {
    const was = this.searching;
    this.searching = false;
    if (document.activeElement === this.field) this.field.blur();
    if (!was) return;
    this.#markCurrent();
    this.onSearchEnd?.();
  }

  // ----------------------------------------------------------------- resize

  #resizing = false;

  #resizeDown(e) {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    this.#resizing = true;
    this.handle.classList.add('mf-dragging');
    try { this.handle.setPointerCapture(e.pointerId); } catch { /* a pointer that's gone */ }
  }

  #resizeMove(e) {
    if (!this.#resizing) return;
    // The one width: where the pointer is from the sidebar's left. Every sidebar follows.
    TileSidebar.width = e.clientX - this.el.getBoundingClientRect().left;
  }

  #resizeUp(e) {
    if (!this.#resizing) return;
    this.#resizing = false;
    this.handle.classList.remove('mf-dragging');
    try { this.handle.releasePointerCapture(e.pointerId); } catch { /* already released */ }
  }
}
