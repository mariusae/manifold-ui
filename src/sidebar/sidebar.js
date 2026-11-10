// The sidebar (Manifold's SidebarView in its Spaces organisation): the
// organisation tabs and the pin button, the strip of space squares, the
// shown space's name and host, its rows — Pinned, On Screen, Docked — the
// "Needs you" block and the footer. A pure view over a model: it fills its
// parent (the window's sidebar frame, which is someone else's: so are the
// traffic lights, the slide-out and the resize handle), draws what it is
// given and reports what is done to it.
//
//   const sidebar = new Sidebar(host);
//   frame.append(sidebar.el);
//   sidebar.update(model);            // as often as the model changes: diffed in place
//
// model = {
//   tabs: [{ id, symbol, tooltip, badge? }], tab: id | null,
//   pinned: boolean,
//   spaces: [{ id, name, color, symbol?, letter, status?, current, hostBreak? }],
//                                     // status: 'needsYou' | 'failed' | 'done' | 'working'
//   space: { id, name, hostLabel, hostSymbol = 'desktopcomputer', hostAttention? } | null,
//                                     // hostAttention: true, or words (" · connecting…") — the label turns amber
//   rows: [
//     { kind: 'section', id, title, count? },
//     { kind: 'divider' },
//     { kind: 'tile', id, title, symbol, status?, detail?, age?, focused?, docked?, dimmed?,
//       dirty? /* true | 'stale' */, maximized?, badge?, recall?, count?,
//       accessories? /* 'delete' | 'close' | 'chevron' | { which, symbol, tooltip } */, draggable? = true },
//     { kind: 'action', id, title, symbol, tooltip?, accessories? },
//   ],
//   needsYou: [{ spaceId, rowId, title, symbol, color, letter, spaceSymbol?, pill }],
//   pushed: null | { title, subtitle, rows },      // a back header and its own rows, in place of the space's
//   footer: { left: { symbol, title, count?, tooltip? } | null, right: { symbol = 'chevron.down', tooltip? } | null },
// }
//
// host (every callback optional) = {
//   onTab(id), onPin(),
//   onSpaceClick(id), onSpaceMenu(id, {x, y}), onNewSpace(),
//   onSpaceReorder(id, beforeId | null),   // null: to the end (of its host's squares)
//   spacePeek(id) → element | null,        // shown beside the sidebar after 0.3 s on a square
//   onRowClick(row, mods), onRowMenu(row, {x, y}), onRowAccessory(row, which, event),
//   onRowDrag(row, pointerEvent, thing),   // once, when a pressed row has moved more than 4; the gesture is the host's from there
//   rowHover(row) → HoverCard content | null,
//   hostHover(space) → HoverCard content | null,
//   onSectionMenu(row, {x, y}), onSectionDoubleClick(row),
//   onNeedsYou(item), onSwipe(dir), onFooter(which, buttonEl), onBack(),
// }
//
// Besides update(): slide(dir, apply) for a space change; showNumbers(on);
// setFooterOpen(which) / footerButton(which); for drags run from outside,
// squareAt / squareRect / setDropSquare / flashSquare and rowAt / rowRect /
// setDropRow / dockArrive / dockLeave; `toastStack`, an element above the
// "Needs you" block for someone else's toasts; destroy().

import { h, clear, Motion, animate, clamp, modifiers, isMac } from '../core/util.js';
import { measure } from '../core/measure.js';
import { icon, iconButton } from '../icons/icons.js';
import { statusMark, statusTooltip, statusGlyph, StatusPill, Shimmer, pill as countPill } from '../status/statusmark.js';
import { HoverCard } from '../overlay/hovercard.js';

const NS = 'http://www.w3.org/2000/svg';

// The strip (SpaceStripView).
const SIDE = 24, GAP = 6, INSET = 20, WRAP = 8;
const FLASH_STEP = 80;
const DRAG_SLOP = 4;
const PLUS = Symbol('plus');

// The swipe (SidebarView.swipe).
const SWIPE = 70, SWIPE_REST = 150;

const NEEDS_MOST = 5;
const GENIE = 2.2; // a docking flight lasts Motion.spatial × this

const ACCESSORIES = {
  delete: { symbol: 'trash', tooltip: 'Delete' },
  close: { symbol: 'xmark', tooltip: 'Close Tile' },
  chevron: { symbol: 'chevron.down', tooltip: 'Another Kind… (⌘N)' },
};

const symbolKey = (s) => (s == null ? '' : typeof s === 'string' ? s : s instanceof Node ? s : JSON.stringify(s));
const toggle = (el, name, on) => el.classList.toggle(name, !!on);

/** A square's glyph: its symbol, or its letter. */
function glyphOf(symbol, letter, size) {
  return symbol ? icon(symbol, { size, weight: 'semibold' }) : document.createTextNode(letter || '·');
}

export class Sidebar {
  #host;
  #model = null;
  #destroyed = false;
  #W = 0;
  #observer = null;
  #timers = new Set();
  #tracking = null;

  // The header.
  #tabs = new Map();
  #tabOrder = '';

  // The strip.
  #spaces = [];
  #squares = new Map();
  #plusRect = null;
  #plusEl;
  #stripHover = null;
  #stripPress = null;
  #dropSquare = null;
  #reorder = null;
  #flashes = new Set();
  #peek = null;
  #peekId = null;
  #peekTimer = 0;
  #peekLeaving = null;

  // The rows.
  #mode;
  #rows = new Map();
  #views = new WeakMap();
  #hoverRow = null;
  #rowPress = null;
  #pointer = null;
  #dropRow = null;
  #thumbTimer = 0;
  #arriving = null;

  // The rest.
  #needs = [];
  #needsSig = null;
  #needsAll = false;
  #footerSig = { left: null, right: null };
  #swiped = 0;
  #swipeDone = false;
  #swipeTimer = 0;
  #slide = null;
  #own = { sig: {} };

  constructor(host = {}) {
    this.#host = host;

    // Header: the tabs, ending 6 before the pin button.
    this.tabs = h('div.mf-sidebar-tabs');
    this.pin = iconButton('sidebar.left', { size: 13, weight: 'regular', className: 'mf-sidebar-pin', onClick: () => this.#host.onPin?.() });
    this.pin.tabIndex = -1;
    this.header = h('div.mf-sidebar-header', this.tabs, this.pin);

    // The strip.
    this.#plusEl = h('div.mf-strip-plus', this.#dashedEdge(), icon('plus', { size: 11, weight: 'semibold' }));
    this.strip = h('div.mf-sidebar-strip', this.#plusEl);

    // The page: what slides when the space changes.
    this.name = h('div.mf-sidebar-name');
    this.hostIcon = h('span.mf-sidebar-host-icon');
    this.hostLabel = h('span.mf-sidebar-host-label');
    this.hostEl = h('span.mf-sidebar-host', this.hostIcon, this.hostLabel);
    this.head = h('div.mf-sidebar-head', this.name, h('div.mf-sidebar-hostline', this.hostEl));
    this.back = iconButton('chevron.left', { size: 12, weight: 'regular', tip: 'Back to Spaces', className: 'mf-sidebar-back', onClick: () => this.#host.onBack?.() });
    this.back.tabIndex = -1;
    this.pushedTitle = h('div.mf-sidebar-pushed-title');
    this.pushedSubtitle = h('div.mf-sidebar-pushed-subtitle');
    this.pushedHead = h('div.mf-sidebar-pushed', { hidden: true }, this.back, this.pushedTitle, this.pushedSubtitle);
    this.list = h('div.mf-sidebar-list');
    this.thumb = h('div.mf-sidebar-thumb');
    this.page = h('div.mf-sidebar-page', this.head, this.pushedHead, h('div.mf-sidebar-listwrap', this.list, this.thumb));
    this.body = h('div.mf-sidebar-body', this.page);

    // The stack at the bottom.
    this.toastStack = h('div.mf-sidebar-toasts');
    this.needs = h('div.mf-sidebar-needs', { hidden: true });
    this.footerLeft = h('button.mf-sidebar-footer-button.mf-footer-left', { type: 'button', tabIndex: -1, hidden: true });
    this.footerRight = h('button.mf-sidebar-footer-button.mf-footer-right', { type: 'button', tabIndex: -1, hidden: true });
    this.footer = h('div.mf-sidebar-footer', this.footerLeft, this.footerRight);

    this.el = h('div.mf-sidebar', this.header, this.strip, this.body, this.toastStack, this.needs, this.footer);

    const on = (el, type, fn, options) => el.addEventListener(type, fn, options);
    on(this.el, 'contextmenu', this.#onContextMenu);
    on(this.el, 'wheel', this.#onWheel, { passive: true });
    on(this.strip, 'pointermove', this.#onStripHover);
    on(this.strip, 'pointerleave', () => { if (!this.#reorder) this.#setStripHover(null); });
    on(this.strip, 'pointerdown', this.#onStripDown);
    on(this.list, 'pointermove', this.#onListMove);
    on(this.list, 'pointerleave', this.#onListLeave);
    on(this.list, 'pointerdown', this.#onListDown);
    on(this.list, 'dblclick', this.#onListDoubleClick);
    on(this.list, 'scroll', this.#onScroll, { passive: true });
    on(this.hostEl, 'pointerenter', this.#onHostEnter);
    on(this.hostEl, 'pointerleave', () => HoverCard.hide());
    on(this.needs, 'click', this.#onNeedsClick);
    on(this.footerLeft, 'click', () => this.#host.onFooter?.('left', this.footerLeft));
    on(this.footerRight, 'click', () => this.#host.onFooter?.('right', this.footerRight));
    window.addEventListener('blur', this.#onBlur);

    if (typeof ResizeObserver !== 'undefined') {
      this.#observer = new ResizeObserver(() => this.#resized());
      this.#observer.observe(this.el);
    }
  }

  // ---------------------------------------------------------------- update

  /** Shows `model`, changing only what differs from what is shown. */
  update(model) {
    if (this.#destroyed) return;
    const m = this.#model = model ?? {};
    this.#updateHeader(m);
    this.#updateStrip(m.spaces ?? []);
    this.#updatePage(m);
    this.#updateNeeds(m.needsYou ?? []);
    this.#updateFooter(m.footer ?? {});
    this.#rehover();
  }

  #updateHeader(m) {
    const tabs = m.tabs ?? [];
    const chosen = m.pushed ? null : m.tab ?? null;
    const order = tabs.map((t) => t.id).join('\u0000');
    if (order !== this.#tabOrder) {
      this.#tabOrder = order;
      this.#tabs.clear();
      clear(this.tabs);
      for (const t of tabs) {
        const el = h('button.mf-sidebar-tab', { type: 'button', tabIndex: -1 });
        el.addEventListener('click', () => this.#host.onTab?.(t.id));
        const v = { el, badge: null, sig: {} };
        this.#tabs.set(t.id, v);
        this.tabs.append(el);
      }
    }
    for (const t of tabs) {
      const v = this.#tabs.get(t.id);
      if (!v) continue;
      if (this.#changed(v, 'symbol', symbolKey(t.symbol))) {
        v.el.querySelector('.mf-icon')?.remove();
        v.el.prepend(icon(t.symbol, { size: 13, weight: 'medium' }));
      }
      if (this.#changed(v, 'tip', t.tooltip ?? '')) v.el.title = t.tooltip ?? '';
      toggle(v.el, 'mf-chosen', t.id === chosen);
      const n = Number(t.badge) || 0;
      if (this.#changed(v, 'badge', n)) {
        if (n > 0) {
          v.badge ??= v.el.appendChild(h('span.mf-sidebar-tab-badge'));
          v.badge.textContent = n > 99 ? '99+' : String(n);
          v.badge.hidden = false;
        } else if (v.badge) v.badge.hidden = true;
      }
    }
    toggle(this.pin, 'mf-pinned', m.pinned);
    this.pin.title = m.pinned ? 'Let Sidebar Slide Out (⇧⌘/)' : 'Keep Sidebar Shown (⇧⌘/)';
  }

  #updatePage(m) {
    const pushed = m.pushed ?? null;
    const mode = pushed ? 'pushed' : 'space:' + (m.space?.id ?? '');
    const turned = this.#mode !== undefined && mode !== this.#mode;
    this.#mode = mode;
    if (turned) HoverCard.hide();
    this.head.hidden = !!pushed;
    this.pushedHead.hidden = !pushed;
    if (pushed) {
      this.#text(this.pushedTitle, pushed.title);
      this.#text(this.pushedSubtitle, pushed.subtitle);
    } else {
      const s = m.space ?? {};
      this.#text(this.name, s.name);
      const symbol = s.id == null ? null : s.hostSymbol ?? 'desktopcomputer';
      if (this.#changed(this.#own, 'hostSymbol', symbolKey(symbol))) {
        clear(this.hostIcon);
        if (symbol) this.hostIcon.append(icon(symbol, { size: 11, weight: 'regular' }));
      }
      this.#text(this.hostLabel, (s.hostLabel ?? '') + (typeof s.hostAttention === 'string' ? s.hostAttention.replace(/^(?! ·)/, ' · ') : ''));
      toggle(this.hostEl, 'mf-attention', s.hostAttention);
      this.hostEl.hidden = s.id == null;
    }
    this.#updateRows(pushed ? pushed.rows ?? [] : m.rows ?? []);
    if (turned) this.list.scrollTop = 0;
  }

  #changed(view, key, value) {
    if (view.sig[key] === value) return false;
    view.sig[key] = value;
    return true;
  }
  #text(el, text) {
    const s = text == null ? '' : String(text);
    if (el.textContent !== s) el.textContent = s;
  }

  // ---------------------------------------------------------------- strip

  #dashedEdge() {
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'mf-strip-plus-edge');
    svg.setAttribute('width', SIDE);
    svg.setAttribute('height', SIDE);
    const rect = document.createElementNS(NS, 'rect');
    for (const [k, v] of Object.entries({ x: 0.5, y: 0.5, width: SIDE - 1, height: SIDE - 1, rx: 6, fill: 'none', 'stroke-width': 1, 'stroke-dasharray': '3 2' })) rect.setAttribute(k, v);
    svg.append(rect);
    return svg;
  }

  #updateStrip(spaces) {
    // Squares don't change under a square being moved: held till it's let go.
    if (this.#reorder) {
      this.#reorder.deferred = spaces;
      return;
    }
    let group = 0;
    this.#spaces = spaces.map((s, i) => {
      if (i > 0 && s.hostBreak) group += 1;
      return { ...s, group };
    });
    const seen = new Set();
    for (const s of this.#spaces) {
      let v = this.#squares.get(s.id);
      if (!v) {
        const glyph = h('span.mf-strip-glyph');
        const number = h('span.mf-strip-number');
        v = { id: s.id, el: h('div.mf-strip-square', glyph, number), glyph, number, dot: null, rect: null, sig: {} };
        this.#squares.set(s.id, v);
        this.strip.insertBefore(v.el, this.#plusEl);
      }
      seen.add(s.id);
      if (this.#changed(v, 'color', s.color ?? '')) v.el.style.setProperty('--c', s.color || 'var(--mf-text-secondary)');
      if (this.#changed(v, 'glyph', s.symbol ? symbolKey(s.symbol) : 'letter:' + (s.letter ?? ''))) {
        v.glyph.replaceChildren(glyphOf(s.symbol, s.letter, 11.5));
      }
      if (this.#changed(v, 'status', s.status ?? '')) {
        if (s.status) {
          v.dot ??= v.el.appendChild(h('span.mf-strip-dot'));
          v.dot.dataset.status = s.status;
          v.dot.hidden = false;
        } else if (v.dot) v.dot.hidden = true;
      }
      toggle(v.el, 'mf-current', s.current);
    }
    for (const [id, v] of this.#squares) {
      if (seen.has(id)) continue;
      v.el.remove();
      this.#squares.delete(id);
    }
    if (typeof this.#stripHover !== 'symbol' && this.#stripHover != null && !seen.has(this.#stripHover)) this.#setStripHover(null);
    if (this.#peekId != null && !seen.has(this.#peekId)) this.#hidePeek(true);
    this.#applyDropSquare();
    this.#layoutStrip();
  }

  /** The squares left to right, wrapping, the + last (SpaceStripView.layout). */
  #layoutStrip() {
    const width = this.#W || this.el.clientWidth || 232;
    let x = INSET, y = (36 - SIDE) / 2;
    const put = (w, wanted) => {
      let lead = wanted;
      if (x > INSET && x + lead + w > width - WRAP) {
        x = INSET;
        y += SIDE + GAP;
        lead = 0;
      }
      x += lead;
      const r = { x, y: Math.round(y), w, h: SIDE };
      x += w + GAP;
      return r;
    };
    const n = this.#spaces.length;
    this.#spaces.forEach((s, i) => {
      const v = this.#squares.get(s.id);
      const r = put(SIDE, i > 0 && s.group !== this.#spaces[i - 1].group ? 7 : 0);
      if (!v.rect || v.rect.x !== r.x || v.rect.y !== r.y) {
        v.el.style.left = r.x + 'px';
        v.el.style.top = r.y + 'px';
      }
      v.rect = r;
      // ⌘1…⌘8 by place, ⌘9 the last.
      const number = i < 8 ? i + 1 : i === n - 1 ? Math.min(n, 9) : null;
      if (this.#changed(v, 'number', number)) {
        v.number.textContent = number ?? '';
        toggle(v.number, 'mf-none', number == null);
      }
    });
    const p = put(SIDE, 2);
    if (!this.#plusRect || this.#plusRect.x !== p.x || this.#plusRect.y !== p.y) {
      this.#plusEl.style.left = p.x + 'px';
      this.#plusEl.style.top = p.y + 'px';
    }
    this.#plusRect = p;
    const height = p.y + SIDE + 6;
    if (this.#changed(this.#own, 'stripHeight', height)) this.strip.style.height = height + 'px';
  }

  /** What of the strip is at a point: a space's id, PLUS, or null. Each takes 3 more than its square, so neighbours touch. */
  #itemAt(clientX, clientY) {
    const o = this.strip.getBoundingClientRect();
    const x = clientX - o.left, y = clientY - o.top;
    const inside = (r) => r && x >= r.x - GAP / 2 && x < r.x + r.w + GAP / 2 && y >= r.y - GAP / 2 && y < r.y + r.h + GAP / 2;
    for (const s of this.#spaces) if (inside(this.#squares.get(s.id)?.rect)) return s.id;
    return inside(this.#plusRect) ? PLUS : null;
  }

  #setStripHover(item) {
    if (item === this.#stripHover) return;
    const el = (it) => (it === PLUS ? this.#plusEl : this.#squares.get(it)?.el);
    if (this.#stripHover != null) el(this.#stripHover)?.classList.remove('mf-hovered');
    this.#stripHover = item;
    if (item != null) el(item)?.classList.add('mf-hovered');
    if (item != null && item !== PLUS) this.#wantPeek(item);
    else this.#hidePeek();
  }

  #onStripHover = (e) => {
    if (this.#reorder) return;
    // A drag from elsewhere passing over lights nothing of its own accord.
    if (e.buttons !== 0 && !this.#stripPress) return this.#setStripHover(null);
    this.#setStripHover(this.#itemAt(e.clientX, e.clientY));
  };

  #onStripDown = (e) => {
    if (e.button !== 0 || (isMac && e.ctrlKey)) return;
    this.#stripPress = { item: this.#itemAt(e.clientX, e.clientY), x: e.clientX, y: e.clientY };
    this.#track(this.#onStripMove, this.#onStripUp);
  };

  #onStripMove = (e) => {
    const p = this.#stripPress;
    if (!p) return;
    if (this.#reorder) return this.#moveReorder(e);
    if (p.item == null || p.item === PLUS || !this.#squares.has(p.item)) return;
    if (Math.hypot(e.clientX - p.x, e.clientY - p.y) > DRAG_SLOP) this.#beginReorder(e);
  };

  #onStripUp = (e) => {
    this.#untrack();
    const p = this.#stripPress;
    this.#stripPress = null;
    if (!p) return;
    if (this.#reorder) return this.#endReorder(e.type === 'pointerup');
    if (e.type !== 'pointerup') return;
    // A click is of what's under the pointer as it's let go, not of what was pressed.
    const item = this.#itemAt(e.clientX, e.clientY);
    if (item == null) return;
    this.#hidePeek(true);
    if (item === PLUS) this.#host.onNewSpace?.();
    else this.#host.onSpaceClick?.(item);
  };

  // A square moved among its host's: lifted under the pointer, its slot left
  // hollow, the others taking their new places at once.

  #beginReorder(e) {
    const p = this.#stripPress;
    const v = this.#squares.get(p.item);
    const o = this.strip.getBoundingClientRect();
    this.#setStripHover(null);
    this.#hidePeek(true);
    HoverCard.hide();
    const copy = v.el.cloneNode(true);
    copy.classList.remove('mf-hovered', 'mf-drop', 'mf-lit');
    copy.style.left = copy.style.top = '0';
    const lift = h('div.mf-strip-lift', copy);
    this.strip.append(lift);
    v.el.classList.add('mf-hollow');
    this.strip.classList.add('mf-reordering');
    this.#reorder = {
      id: p.item, lift,
      dx: p.x - (o.left + v.rect.x), dy: p.y - (o.top + v.rect.y),
      from: this.#spaces.map((s) => s.id),
      deferred: null,
    };
    this.#moveReorder(e);
  }

  #moveReorder(e) {
    const r = this.#reorder;
    const o = this.strip.getBoundingClientRect();
    const x = e.clientX - o.left - r.dx, y = e.clientY - o.top - r.dy;
    r.lift.style.transform = `translate(${x}px, ${y}px)`;
    // Its slot: the nearest, centre to centre, of its own host's squares.
    const at = this.#spaces.findIndex((s) => s.id === r.id);
    const group = this.#spaces[at].group;
    let best = at, nearest = Infinity;
    this.#spaces.forEach((s, i) => {
      if (s.group !== group) return;
      const q = this.#squares.get(s.id).rect;
      const d = Math.hypot(q.x - x, q.y - y);
      if (d < nearest) {
        nearest = d;
        best = i;
      }
    });
    if (best === at) return;
    const [moved] = this.#spaces.splice(at, 1);
    this.#spaces.splice(best, 0, moved);
    this.#layoutStrip();
  }

  #endReorder(commit) {
    const r = this.#reorder;
    this.#reorder = null;
    r.lift.remove();
    this.#squares.get(r.id)?.el.classList.remove('mf-hollow');
    this.strip.classList.remove('mf-reordering');
    const changed = this.#spaces.some((s, i) => s.id !== r.from[i]);
    if (!commit || !changed) {
      this.#updateStrip(r.deferred ?? this.#model?.spaces ?? []);
      return;
    }
    // Before the next of its host's squares, or at their end. The squares
    // stay as dropped until the host shows its own order.
    const at = this.#spaces.findIndex((s) => s.id === r.id);
    const next = this.#spaces[at + 1];
    this.#host.onSpaceReorder?.(r.id, next && next.group === this.#spaces[at].group ? next.id : null);
  }

  // The peek: a card for the square the pointer has rested on.

  #wantPeek(id) {
    if (!this.#host.spacePeek || id === this.#peekId) return;
    clearTimeout(this.#peekTimer);
    // With one up already, the next square's takes its place at once.
    if (this.#peek?.isConnected && !this.#peekLeaving) return this.#showPeek(id, false);
    this.#peekId = id;
    this.#peekTimer = setTimeout(() => this.#showPeek(id, true), Motion.hoverIntent * Motion.slowdown);
  }

  #showPeek(id, fade) {
    const v = this.#squares.get(id);
    const content = v && !this.#destroyed ? this.#host.spacePeek?.(id) : null;
    if (!content) return this.#hidePeek(true);
    HoverCard.hide();
    this.#peekLeaving?.cancel();
    this.#peekLeaving = null;
    this.#peekId = id;
    this.#peek ??= h('div.mf-sidebar-peek');
    const el = this.#peek;
    el.replaceChildren(content);
    if (!el.isConnected) (this.el.closest('.mf-root') ?? document.body).append(el);
    const side = this.el.getBoundingClientRect(), q = v.el.getBoundingClientRect();
    const vw = document.documentElement.clientWidth, vh = document.documentElement.clientHeight;
    // (What's shown may be placed absolutely, leaving the wrapper no size of its own.)
    const w = content.offsetWidth || el.offsetWidth || 272, ht = content.offsetHeight || el.offsetHeight || 212;
    el.style.left = Math.round(Math.max(8, Math.min(side.right + 8, vw - 8 - w))) + 'px';
    el.style.top = Math.round(clamp(q.top - 6, 8, Math.max(8, vh - 8 - ht))) + 'px';
    if (fade) animate(el, [{ opacity: 0 }, { opacity: 1 }], { duration: Motion.fast, easing: Motion.appear });
  }

  #hidePeek(atOnce = false) {
    clearTimeout(this.#peekTimer);
    this.#peekId = null;
    const el = this.#peek;
    if (!el || !el.isConnected) return;
    if (atOnce) {
      this.#peekLeaving?.cancel();
      this.#peekLeaving = null;
      el.remove();
      return;
    }
    if (this.#peekLeaving) return;
    const a = this.#peekLeaving = animate(el, [{ opacity: 1 }, { opacity: 0 }], { duration: Motion.fast, easing: Motion.disappear, fill: 'forwards' });
    a.done.then((ended) => {
      if (this.#peekLeaving !== a) return;
      this.#peekLeaving = null;
      a.cancel();
      if (ended) el.remove();
    });
  }

  /** The space whose square (and the 3 round it) is at a point, or null. */
  squareAt(clientX, clientY) {
    const item = this.#itemAt(clientX, clientY);
    return item == null || item === PLUS ? null : item;
  }

  squareRect(spaceId) {
    return this.#squares.get(spaceId)?.el.getBoundingClientRect() ?? null;
  }

  /** The square a drag would drop on, lit and ringed in the accent — never the current space's. */
  setDropSquare(spaceId) {
    this.#dropSquare = spaceId ?? null;
    this.#applyDropSquare();
  }
  #applyDropSquare() {
    for (const s of this.#spaces) {
      this.#squares.get(s.id)?.el.classList.toggle('mf-drop', s.id === this.#dropSquare && !s.current);
    }
  }

  /** A square about to spring open: lit, as it was, lit, as it was — 0.08 s each. */
  flashSquare(spaceId) {
    return new Promise((resolve) => {
      if (!this.#squares.has(spaceId) || this.#destroyed) return resolve();
      const flash = { resolve };
      this.#flashes.add(flash);
      let step = 0;
      const tick = () => {
        const el = this.#squares.get(spaceId)?.el;
        if (step >= 4 || !el) {
          el?.classList.remove('mf-lit');
          this.#flashes.delete(flash);
          return resolve();
        }
        el.classList.toggle('mf-lit', step % 2 === 0);
        step += 1;
        this.#after(FLASH_STEP * Motion.slowdown, tick);
      };
      tick();
    });
  }

  /** The ⌘-number badges on the squares. */
  showNumbers(on) {
    toggle(this.strip, 'mf-numbers', on);
  }

  // ----------------------------------------------------------------- rows

  #updateRows(rows) {
    const list = this.list;
    const shown = [];
    const seen = new Set();
    let dividers = 0;
    for (const row of rows) {
      const key = row.kind === 'divider' ? `divider:${dividers++}` : `${row.kind}:${row.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      let v = this.#rows.get(key);
      if (!v) {
        v = this.#makeRow(row, key);
        this.#rows.set(key, v);
      }
      v.row = row;
      if (v.kind === 'section') this.#patchSection(v, row);
      else if (v.kind !== 'divider') this.#patchItem(v, row);
      shown.push(v);
    }
    // What's gone goes first, so what stays isn't moved to step round it.
    for (const [key, v] of this.#rows) {
      if (seen.has(key)) continue;
      v.shimmer?.set(false);
      v.el.remove();
      this.#rows.delete(key);
      if (this.#hoverRow === v) {
        this.#hoverRow = null;
        HoverCard.hide();
      }
    }
    let at = list.firstChild;
    for (const v of shown) {
      if (v.el === at) at = at.nextSibling;
      else list.insertBefore(v.el, at);
    }
    this.#fitShimmers();
    if (this.#dropRow != null) this.#applyDropRow();
    if (this.#arriving && this.#rows.has('tile:' + this.#arriving.rowId)) {
      const a = this.#arriving;
      this.#arriving = null;
      if (performance.now() - a.at < 500) this.dockArrive(a.rowId, a.duration);
    }
  }

  #makeRow(row, key) {
    const kind = row.kind;
    let v;
    if (kind === 'divider') {
      v = { el: h('div.mf-sidebar-row.mf-sidebar-divider') };
    } else if (kind === 'section') {
      const title = h('span.mf-sidebar-section-title');
      v = { el: h('div.mf-sidebar-row.mf-sidebar-section', title), title, count: null };
    } else {
      const symbol = h('span.mf-sidebar-row-symbol');
      const iconBox = h('span.mf-sidebar-row-icon', symbol);
      const title = h('span.mf-sidebar-row-title');
      const name = h('span.mf-sidebar-row-name', title);
      const age = h('span.mf-sidebar-row-age', { hidden: true });
      const glyph = h('span.mf-sidebar-row-glyph', { hidden: true });
      const pill = new StatusPill();
      const buttons = h('span.mf-sidebar-row-buttons');
      const el = h(`div.mf-sidebar-row.mf-sidebar-item.mf-sidebar-${kind}`, h('div.mf-sidebar-band'), iconBox, name, age, glyph, pill.el, buttons);
      v = { el, iconBox, symbol, name, title, age, glyph, pill, buttons, dot: null, badge: null, count: null, detail: null, max: null, shimmer: new Shimmer(name), shimmerOn: false };
    }
    Object.assign(v, { key, kind, row, sig: {} });
    this.#views.set(v.el, v);
    return v;
  }

  #patchSection(v, row) {
    this.#text(v.title, row.title);
    const count = row.count == null ? '' : String(row.count);
    if (this.#changed(v, 'count', count)) {
      if (count) {
        v.count ??= v.el.appendChild(countPill(''));
        v.count.textContent = count;
        v.count.hidden = false;
      } else if (v.count) v.count.hidden = true;
    }
  }

  #patchItem(v, row) {
    const tile = v.kind === 'tile';
    const mark = statusMark(tile ? row.status : null);
    const two = tile && !!row.detail;
    const el = v.el;
    toggle(el, 'mf-two-line', two);
    toggle(el, 'mf-selected', tile && row.focused);
    toggle(el, 'mf-docked', tile && row.docked);
    toggle(el, 'mf-dimmed', tile && (row.dimmed || row.recall));
    toggle(el, 'mf-inactive', mark.dim);
    // With less motion asked for, a working name holds still, a little faint.
    toggle(el, 'mf-still', tile && row.status?.state === 'working' && !mark.shimmer);
    if (this.#changed(v, 'tip', (!tile && row.tooltip) || '')) el.title = (!tile && row.tooltip) || '';

    if (this.#changed(v, 'symbol', symbolKey(row.symbol))) {
      clear(v.symbol);
      if (row.symbol) v.symbol.append(icon(row.symbol, { size: 12, weight: 'regular' }));
    }
    if (this.#changed(v, 'badge', !!(tile && row.badge))) {
      if (tile && row.badge) {
        v.badge ??= v.iconBox.appendChild(h('span.mf-sidebar-row-badge', icon('doc.fill', { size: 6.5, weight: 'bold' })));
        v.badge.hidden = false;
      } else if (v.badge) v.badge.hidden = true;
    }

    this.#text(v.title, row.title);
    const dirty = tile && row.dirty ? (row.dirty === 'stale' ? 'stale' : 'dirty') : '';
    if (this.#changed(v, 'dirty', dirty)) {
      if (dirty) {
        v.dot ??= v.name.appendChild(h('span.mf-sidebar-row-dot', ' •'));
        v.dot.hidden = false;
        toggle(v.dot, 'mf-stale', dirty === 'stale');
      } else if (v.dot) v.dot.hidden = true;
    }

    const age = tile && row.age ? String(row.age) : '';
    if (this.#changed(v, 'age', age)) {
      v.age.textContent = age;
      v.age.hidden = !age;
    }
    const look = mark.glyph ? `${mark.glyph.look}/${mark.glyph.progress ?? ''}` : '';
    if (this.#changed(v, 'glyph', look)) {
      v.glyph.hidden = !look;
      clear(v.glyph);
      if (look) v.glyph.append(statusGlyph(mark.glyph));
    }
    v.pill.set(mark.pill);
    if (this.#changed(v, 'pill', v.pill.key ?? '')) {
      v.pill.el.style.width = mark.pill ? v.pill.wanted(measure).w + 'px' : '';
    }
    const tip = tile ? statusTooltip(row.status) : '';
    if (this.#changed(v, 'statusTip', tip)) {
      v.pill.el.title = tip;
      v.glyph.title = tip;
    }
    const count = tile && row.count != null ? String(row.count) : '';
    if (this.#changed(v, 'count', count)) {
      if (count) {
        v.count ??= el.insertBefore(countPill(''), v.buttons);
        v.count.textContent = count;
        v.count.hidden = false;
      } else if (v.count) v.count.hidden = true;
    }

    const accessories = row.accessories ?? [];
    if (this.#changed(v, 'accessories', JSON.stringify(accessories))) {
      clear(v.buttons);
      for (const a of accessories) {
        const which = typeof a === 'string' ? a : a.which;
        const look = { ...ACCESSORIES[which], ...(typeof a === 'object' ? a : null) };
        const b = iconButton(look.symbol ?? 'ellipsis', {
          size: 11, weight: 'medium', tip: look.tooltip,
          onClick: (e) => {
            HoverCard.hide();
            this.#host.onRowAccessory?.(v.row, which, e);
          },
        });
        b.tabIndex = -1;
        v.buttons.append(b);
      }
      toggle(el, 'mf-has-buttons', accessories.length);
    }

    // The second line: what its status says; a maximized tile's mark before it.
    const detail = two ? String(row.detail) : '';
    if (this.#changed(v, 'detail', detail)) {
      if (two) {
        v.detail ??= el.appendChild(h('div.mf-sidebar-row-detail'));
        v.detail.textContent = detail;
        v.detail.hidden = false;
      } else if (v.detail) v.detail.hidden = true;
    }
    const max = two && !!row.maximized;
    if (this.#changed(v, 'max', max)) {
      if (max) {
        v.max ??= el.appendChild(h('span.mf-sidebar-row-max', icon('arrow.up.left.and.arrow.down.right', { size: 10, weight: 'regular' })));
        v.max.hidden = false;
      } else if (v.max) v.max.hidden = true;
      toggle(el, 'mf-maximized', max);
    }
    v.shimmerOn = mark.shimmer;
  }

  /** Each working name's shimmer fitted to the name as it now lies. */
  #fitShimmers() {
    if (!this.el.isConnected) return;
    for (const v of this.#rows.values()) {
      if (!v.shimmer) continue;
      v.shimmer.set(v.shimmerOn);
      if (v.shimmerOn) v.shimmer.layout();
    }
  }

  #viewOf(target) {
    const el = target instanceof Element ? target.closest('.mf-sidebar-row') : null;
    return (el && this.#views.get(el)) || null;
  }
  /** The row at `target`, if it's one that answers the pointer. */
  #itemOf(target) {
    const v = this.#viewOf(target);
    return v && (v.kind === 'tile' || v.kind === 'action') && this.#rows.get(v.key) === v ? v : null;
  }

  // One row is under the pointer at a time: its band, its buttons, and —
  // after a rest — its card.
  #setRowHover(v) {
    if (v === this.#hoverRow) return;
    const was = this.#hoverRow;
    this.#hoverRow = v;
    was?.el.classList.remove('mf-hovered');
    v?.el.classList.add('mf-hovered');
    // The buttons take room from the name.
    for (const x of [was, v]) if (x?.shimmerOn && x.el.isConnected) x.shimmer.layout();
    if (v && v.kind === 'tile' && this.#host.rowHover) {
      HoverCard.request({ key: 'row:' + v.row.id, anchor: v.el, content: () => (this.#hoverRow === v ? this.#host.rowHover(v.row) : null) });
    } else {
      HoverCard.hide();
    }
  }

  /** The hover again, for where the pointer was last seen: rows may have moved under it. */
  #rehover() {
    const p = this.#pointer;
    if (!p) return;
    const under = document.elementFromPoint(p.x, p.y);
    this.#setRowHover(under && this.list.contains(under) ? this.#itemOf(under) : null);
  }

  #onListMove = (e) => {
    this.#pointer = { x: e.clientX, y: e.clientY };
    if (e.buttons !== 0 && !this.#rowPress) return this.#setRowHover(null);
    this.#setRowHover(this.#itemOf(e.target));
  };

  #onListLeave = () => {
    this.#pointer = null;
    this.#setRowHover(null);
  };

  #onListDown = (e) => {
    if (e.button !== 0 || (isMac && e.ctrlKey)) return;
    const v = this.#itemOf(e.target);
    if (!v) return;
    this.#rowPress = { v, x: e.clientX, y: e.clientY };
    this.#track(this.#onRowMove, this.#onRowUp);
  };

  #onRowMove = (e) => {
    const p = this.#rowPress;
    if (!p || Math.hypot(e.clientX - p.x, e.clientY - p.y) <= DRAG_SLOP) return;
    const row = p.v.row;
    if (p.v.kind !== 'tile' || row.draggable === false || !this.#host.onRowDrag) return;
    // A drag: the host's from here, and no click at its end.
    this.#untrack();
    this.#rowPress = null;
    this.#pointer = null;
    this.#setRowHover(null);
    HoverCard.hide();
    this.#host.onRowDrag(row, e, e.shiftKey);
  };

  #onRowUp = (e) => {
    this.#untrack();
    const p = this.#rowPress;
    this.#rowPress = null;
    if (!p || e.type !== 'pointerup') return;
    if (this.#itemOf(e.target) !== p.v) return;
    HoverCard.hide();
    this.#host.onRowClick?.(p.v.row, modifiers(e));
  };

  #onListDoubleClick = (e) => {
    const v = this.#viewOf(e.target);
    if (v?.kind === 'section') this.#host.onSectionDoubleClick?.(v.row);
  };

  #onContextMenu = (e) => {
    e.preventDefault();
    const at = { x: e.clientX, y: e.clientY };
    if (this.strip.contains(e.target)) {
      const item = this.#itemAt(e.clientX, e.clientY);
      if (item == null || item === PLUS) return;
      this.#hidePeek(true);
      this.#host.onSpaceMenu?.(item, at);
      return;
    }
    const v = this.#viewOf(e.target);
    if (!v || !this.list.contains(v.el)) return;
    if (v.kind === 'tile') {
      HoverCard.hide();
      this.#host.onRowMenu?.(v.row, at);
    } else if (v.kind === 'section') {
      this.#host.onSectionMenu?.(v.row, at);
    }
  };

  #onScroll = () => {
    this.#showThumb();
    HoverCard.hide();
    this.#rehover();
  };

  /** The scroller: a thumb over the rows while they scroll, gone soon after. */
  #showThumb() {
    const { scrollTop, scrollHeight, clientHeight } = this.list;
    clearTimeout(this.#thumbTimer);
    if (scrollHeight <= clientHeight + 0.5) {
      this.thumb.classList.remove('mf-on');
      return;
    }
    const length = Math.max(24, (clientHeight - 4) * clientHeight / scrollHeight);
    const top = 2 + (clientHeight - 4 - length) * clamp(scrollTop / (scrollHeight - clientHeight), 0, 1);
    this.thumb.style.height = length + 'px';
    this.thumb.style.transform = `translateY(${top}px)`;
    this.thumb.classList.add('mf-on');
    this.#thumbTimer = setTimeout(() => this.thumb.classList.remove('mf-on'), 700);
  }

  #onHostEnter = () => {
    const space = this.#model?.space;
    if (!space || !this.#host.hostHover) return;
    HoverCard.request({ key: 'host:' + space.id, anchor: this.hostEl, content: () => this.#host.hostHover(space) });
  };

  /** The row (as the model gave it) at a point: tile rows only. */
  rowAt(clientX, clientY) {
    const o = this.list.getBoundingClientRect();
    if (clientX < o.left || clientX >= o.right || clientY < o.top || clientY >= o.bottom) return null;
    for (const v of this.#rows.values()) {
      if (v.kind !== 'tile') continue;
      const r = v.el.getBoundingClientRect();
      if (clientY >= r.top && clientY < r.bottom) return v.row;
    }
    return null;
  }

  rowRect(rowId) {
    return this.#rows.get('tile:' + rowId)?.el.getBoundingClientRect() ?? null;
  }

  /** The row a drag would drop on: its band in the accent. */
  setDropRow(rowId) {
    if (this.#dropRow != null) this.#rows.get('tile:' + this.#dropRow)?.el.classList.remove('mf-drop-on');
    this.#dropRow = rowId ?? null;
    this.#applyDropRow();
  }
  #applyDropRow() {
    if (this.#dropRow != null) this.#rows.get('tile:' + this.#dropRow)?.el.classList.add('mf-drop-on');
  }

  /**
   * The landing mark on a row a tile is docking into: a band in the accent
   * coming up and going, over 1.6 × `duration` (the flight's: 0.528 s
   * unless given). If the row isn't shown yet, it's made as the row arrives.
   */
  dockArrive(rowId, duration = Motion.spatial * GENIE) {
    if (!this.#rows.has('tile:' + rowId)) {
      this.#arriving = { rowId, duration, at: performance.now() };
      return;
    }
    this.#landing(rowId, [{ opacity: 0, offset: 0 }, { opacity: 0.22, offset: 0.5 }, { opacity: 0.22, offset: 0.75 }, { opacity: 0, offset: 1 }], 1.6 * duration);
  }

  /** The mark on a row its tile is leaving, going out over 0.6 × `duration`. */
  dockLeave(rowId, duration = Motion.spatial * GENIE) {
    this.#landing(rowId, [{ opacity: 0.22, offset: 0 }, { opacity: 0.22, offset: 0.2 }, { opacity: 0, offset: 1 }], 0.6 * duration);
  }

  #landing(rowId, keyframes, duration) {
    const v = this.#rows.get('tile:' + rowId);
    if (!v || Motion.reduced || this.#destroyed) return;
    const mark = h('div.mf-sidebar-landing');
    v.el.insertBefore(mark, v.el.firstChild);
    animate(mark, keyframes, { duration, easing: 'linear' }).done.then(() => mark.remove());
  }

  // ----------------------------------------------------------- needs you

  #updateNeeds(items) {
    this.#needs = items;
    if (items.length <= NEEDS_MOST) this.#needsAll = false;
    const sig = JSON.stringify([this.#needsAll, items.map((i) => [i.spaceId, i.rowId, i.title, i.symbol, i.color, i.letter, i.spaceSymbol, i.pill])]);
    if (sig === this.#needsSig) return;
    this.#needsSig = sig;
    const el = clear(this.needs);
    el.hidden = !items.length;
    if (!items.length) return;
    el.append(h('div.mf-sidebar-needs-head',
      h('span.mf-sidebar-needs-title', 'Needs you'),
      items.length > 1 ? h('span.mf-sidebar-needs-count', String(items.length)) : null));
    const shown = this.#needsAll ? items : items.slice(0, NEEDS_MOST);
    shown.forEach((item, i) => {
      const square = h('span.mf-sidebar-needs-square', glyphOf(item.spaceSymbol, item.letter, 8.5));
      square.style.setProperty('--c', item.color || 'var(--mf-text-secondary)');
      const pill = new StatusPill();
      pill.set(item.pill ?? { kind: 'needs', text: 'Needs you' });
      pill.el.style.width = pill.wanted(measure).w + 'px';
      el.append(h('div.mf-sidebar-needs-row', { dataset: { i } },
        square,
        h('span.mf-sidebar-needs-symbol', item.symbol ? icon(item.symbol, { size: 11, weight: 'regular' }) : null),
        h('span.mf-sidebar-needs-name', item.title ?? ''),
        pill.el));
    });
    if (items.length > NEEDS_MOST) {
      el.append(h('div.mf-sidebar-needs-more', this.#needsAll ? 'Fewer' : `${items.length - NEEDS_MOST} more…`));
    }
  }

  #onNeedsClick = (e) => {
    if (e.target.closest('.mf-sidebar-needs-more')) {
      this.#needsAll = !this.#needsAll;
      this.#updateNeeds(this.#needs);
      return;
    }
    const row = e.target.closest('.mf-sidebar-needs-row');
    const item = row && this.#needs[Number(row.dataset.i)];
    if (item) this.#host.onNeedsYou?.(item);
  };

  // --------------------------------------------------------------- footer

  #updateFooter(footer) {
    const left = footer.left ?? null, right = footer.right ?? null;
    const l = left ? JSON.stringify([symbolKey(left.symbol), left.title, left.count, left.tooltip]) : '';
    if (l !== this.#footerSig.left) {
      this.#footerSig.left = l;
      const b = clear(this.footerLeft);
      b.hidden = !left;
      if (left) {
        b.title = left.tooltip ?? '';
        b.append(h('span.mf-sidebar-footer-symbol', left.symbol ? icon(left.symbol, { size: 12, weight: 'regular' }) : null),
          h('span.mf-sidebar-footer-title', left.title ?? ''),
          ...(left.count ? [countPill(String(left.count))] : []));
      }
    }
    const r = right ? JSON.stringify([symbolKey(right.symbol), right.tooltip]) : '';
    if (r !== this.#footerSig.right) {
      this.#footerSig.right = r;
      const b = clear(this.footerRight);
      b.hidden = !right;
      if (right) {
        b.title = right.tooltip ?? '';
        b.append(icon(right.symbol ?? 'chevron.down', { size: 11, weight: 'semibold' }));
      }
    }
  }

  /** The footer button whose menu is open ('left' | 'right' | null), drawn pressed. */
  setFooterOpen(which) {
    toggle(this.footerLeft, 'mf-open', which === 'left');
    toggle(this.footerRight, 'mf-open', which === 'right');
  }

  footerButton(which) {
    return which === 'left' ? this.footerLeft : which === 'right' ? this.footerRight : null;
  }

  // ------------------------------------------------- swipe, slide, resize

  // Two fingers sideways anywhere over the sidebar: one step for each
  // gesture, once it has gone 70. Not taken: the rows still scroll.
  #onWheel = (e) => {
    clearTimeout(this.#swipeTimer);
    this.#swipeTimer = setTimeout(() => {
      this.#swiped = 0;
      this.#swipeDone = false;
    }, SWIPE_REST);
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY) * 1.5) return;
    this.#swiped += e.deltaX;
    if (this.#swipeDone || Math.abs(this.#swiped) <= SWIPE) return;
    this.#swipeDone = true;
    // Fingers moving left (the content going right) is the next space.
    this.#host.onSwipe?.(this.#swiped > 0 ? 1 : -1);
  };

  /**
   * A space change: what the name, host line and rows showed slides out by
   * half the width, fading, as what `apply()` makes them show (it calls
   * update) slides in from the other side — `dir` +1 toward a later space.
   */
  slide(dir, apply) {
    this.#endSlide();
    HoverCard.hide();
    const width = this.el.clientWidth;
    if (Motion.reduced || !this.el.isConnected || !width || this.#destroyed) {
      apply?.();
      return;
    }
    // The old page as it stands, a copy that takes no part in anything.
    const scroll = this.list.scrollTop;
    const ghost = this.page.cloneNode(true);
    ghost.classList.add('mf-sidebar-ghost');
    for (const el of ghost.querySelectorAll('.mf-hovered')) el.classList.remove('mf-hovered');
    this.body.append(ghost);
    const copy = ghost.querySelector('.mf-sidebar-list');
    if (copy) copy.scrollTop = scroll;
    apply?.();
    const d = (dir < 0 ? -1 : 1) * width / 2;
    const options = { duration: Motion.spatial, easing: Motion.travel, fill: 'both' };
    const out = animate(ghost, [{ transform: 'translateX(0)', opacity: 1 }, { transform: `translateX(${-d}px)`, opacity: 0 }], options);
    const into = animate(this.page, [{ transform: `translateX(${d}px)`, opacity: 0 }, { transform: 'translateX(0)', opacity: 1 }], options);
    const slide = this.#slide = { ghost, out, into };
    out.done.then(() => { if (this.#slide === slide) this.#endSlide(); });
  }

  /** A slide in flight is finished at once. */
  #endSlide() {
    const s = this.#slide;
    if (!s) return;
    this.#slide = null;
    s.out.cancel();
    s.into.cancel();
    s.ghost.remove();
    this.#fitShimmers();
  }

  #resized() {
    const width = this.el.clientWidth;
    if (!width || this.#destroyed) return;
    const first = !this.#W;
    if (width === this.#W) return;
    this.#W = width;
    if (!this.#reorder) this.#layoutStrip();
    this.#fitShimmers();
    if (!first) HoverCard.hide();
  }

  // ------------------------------------------------------------ plumbing

  #onBlur = () => {
    this.#pointer = null;
    this.#setRowHover(null);
    if (!this.#reorder) this.#setStripHover(null);
  };

  /** A press followed wherever it goes, until it's let go. */
  #track(move, up) {
    this.#untrack();
    this.#tracking = { move, up };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  }
  #untrack() {
    const t = this.#tracking;
    if (!t) return;
    this.#tracking = null;
    window.removeEventListener('pointermove', t.move);
    window.removeEventListener('pointerup', t.up);
    window.removeEventListener('pointercancel', t.up);
  }

  #after(delay, fn) {
    const t = setTimeout(() => {
      this.#timers.delete(t);
      fn();
    }, delay);
    this.#timers.add(t);
  }

  destroy() {
    if (this.#destroyed) return;
    this.#destroyed = true;
    this.#untrack();
    window.removeEventListener('blur', this.#onBlur);
    this.#observer?.disconnect();
    for (const t of this.#timers) clearTimeout(t);
    this.#timers.clear();
    clearTimeout(this.#thumbTimer);
    clearTimeout(this.#swipeTimer);
    clearTimeout(this.#peekTimer);
    for (const f of this.#flashes) f.resolve();
    this.#flashes.clear();
    if (this.#reorder) this.#reorder.lift.remove();
    this.#reorder = null;
    this.#endSlide();
    this.#peekLeaving?.cancel();
    this.#peek?.remove();
    if (this.#hoverRow || String(HoverCard.key ?? '').startsWith('host:')) HoverCard.hide();
    for (const v of this.#rows.values()) v.shimmer?.set(false);
    this.#rows.clear();
    this.#squares.clear();
    this.el.remove();
  }
}
