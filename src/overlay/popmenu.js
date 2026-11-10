// Manifold's own menu (PopMenu.swift) — the footer's Tiles and Threads
// menus: a frosted popover 330 wide, a search field at its top with a
// key's hint at its right (a × once something's typed), perhaps a filter
// button showing a row of chips, then rows in sections under small
// headers. Styles in css/menus.css.
//
//   const menu = new PopMenu({
//     root,                      // the element it's put in (the `.mf-root`, or something positioned in it)
//     placeholder = 'Search', hint = '', empty = 'Nothing',
//     chips = null,              // [{ id, title }]: filters, behind a button at the field's right
//     provider,                  // (query, chipsOn: Set<id>) => [{ title?, divided?, items: [item] }]
//     anchors = [],              // elements a press on which doesn't close it (the buttons that open it)
//     onClose,                   // () => void, however it closed
//   })
//   item: { title, subtitle?, symbol?, image?, trailing?, chevron?, dimmed?, keepsOpen?, action }
//       `image` (a URL, or an element) stands in for the symbol; a `subtitle`
//       makes the row two lines (44 high, not 32); `chevron` says it leads
//       somewhere else; `action()` is run after the menu has closed — or,
//       with `keepsOpen`, with the menu left up: returning 'refresh' then
//       fills it again in place.
//
//   menu.open({ left, bottom, maxHeight })   // px from root's left and bottom edges; it grows upward.
//                                            // maxHeight: the most it may take (else min(560, root's height − bottom − 20)).
//                                            // Open already, it is only placed again.
//   menu.close()   menu.isOpen   menu.refresh()   menu.el   menu.query   menu.chipsOn
//
// One "chosen" row serves the pointer and the keys alike: moving over a
// row chooses it, ↑/↓ move it (stopping at the ends), ↩ runs it, ⎋ closes.
// A click runs on the way up. Every refresh — opening, each keystroke, a
// chip — chooses the first row. A press outside (but on an anchor) closes
// it and goes on to what it hit. Nothing animates. Its listeners on the
// document are there only while it's open.

import { h, clamp } from '../core/util.js';
import { icon, iconButton } from '../icons/icons.js';
import { chip } from './flat.js';

const WIDTH = 330, SEARCH = 44, CHIPS = 34, HEADER = 26, ROW = 32, TWO_LINES = 44, MOST = 560;

export class PopMenu {
  constructor({ root, placeholder = 'Search', hint = '', empty = 'Nothing', chips = null, provider = () => [],
    anchors = [], onClose = null } = {}) {
    this.root = root;
    this.empty = empty;
    this.provider = provider;
    this.anchors = anchors;
    this.onClose = onClose;
    this.chips = chips ?? [];
    this.on = new Set();
    this.chipsShown = false;
    this.items = [];
    this.rows = [];
    this.chosen = null;
    this.listHeight = 60;
    this.place = { left: 8, bottom: 12, maxHeight: null };
    this.opened = false;
    this.pressed = false;
    this.last = { x: NaN, y: NaN };

    this.field = h('input.mf-popmenu-field', { type: 'text', placeholder, autocomplete: 'off', autocapitalize: 'off' });
    this.field.spellcheck = false;
    this.field.setAttribute('autocorrect', 'off');
    this.hint = h('span.mf-popmenu-hint', hint);
    this.clear = iconButton('xmark.circle.fill', {
      size: 12, weight: 'regular', tip: 'Clear', className: 'mf-popmenu-clear',
      onClick: () => { this.field.value = ''; this.refresh(); this.field.focus(); },
    });
    this.clear.tabIndex = -1;
    this.filter = this.chips.length ? iconButton('line.3.horizontal.decrease', {
      size: 12, weight: 'medium', tip: 'Filters', className: 'mf-popmenu-filter',
      onClick: () => { this.chipsShown = !this.chipsShown; this.showFilters(); this.layout(); },
    }) : null;
    if (this.filter) this.filter.tabIndex = -1;
    this.chipRow = h('div.mf-popmenu-chips', { hidden: true }, this.chips.map((c) => chip({
      title: c.title,
      onToggle: (on) => {
        if (on) this.on.add(c.id); else this.on.delete(c.id);
        this.showFilters();
        this.refresh();
      },
    })));
    this.list = h('div.mf-popmenu-list', { role: 'listbox' });
    this.scroll = h('div.mf-popmenu-scroll', this.list);
    this.el = h('div.mf-popmenu.mf-popover', { role: 'dialog' },
      h('div.mf-popmenu-search',
        h('span.mf-popmenu-glass', icon('magnifyingglass', { size: 13, weight: 'regular' })),
        this.field, this.hint, this.clear, this.filter),
      this.chipRow, this.scroll);
    this.el.style.width = WIDTH + 'px';

    // Presses stop here, not on what's beneath; the field keeps the keyboard.
    this.el.addEventListener('mousedown', (e) => { if (e.target !== this.field) e.preventDefault(); });
    for (const type of ['pointerdown', 'mousedown', 'mouseup', 'click', 'dblclick', 'auxclick', 'contextmenu']) {
      this.el.addEventListener(type, (e) => {
        e.stopPropagation();
        if (type === 'contextmenu' && e.target !== this.field) e.preventDefault();
      });
    }
    this.field.addEventListener('input', () => this.refresh());
    this.el.addEventListener('keydown', (e) => this.onKey(e));
    // The pointer's row is the chosen one — moved over, not merely under it
    // (rows scrolled by the keys under a still pointer aren't chosen by it).
    this.list.addEventListener('pointermove', (e) => {
      if (e.clientX === this.last.x && e.clientY === this.last.y) return;
      this.last = { x: e.clientX, y: e.clientY };
      const i = this.rowAt(e);
      if (i >= 0) this.choose(i);
    });
    // Run on the way up, by a press that began in the menu.
    this.el.addEventListener('pointerup', (e) => {
      e.stopPropagation();
      const pressed = this.pressed;
      this.pressed = false;
      if (!pressed || e.button !== 0) return;
      const i = this.rowAt(e);
      if (i >= 0) this.run(i);
    });
    this.onPress = (e) => {
      const t = e.target;
      const inside = t instanceof Node && this.el.contains(t);
      // A row is run by a press that began among the rows (not on a chip,
      // whose toggling may have moved a row under the pointer).
      this.pressed = inside && e.button === 0 && this.scroll.contains(t);
      if (inside) return;
      if ((this.anchors ?? []).some((a) => a && t instanceof Node && a.contains(t))) return;
      this.close();
    };
  }

  get isOpen() { return this.opened; }
  /** What's typed, as the provider is given it. */
  get query() { return this.field.value.trim(); }
  /** The ids of the chips that are on. */
  get chipsOn() { return new Set(this.on); }

  open({ left = this.place.left, bottom = this.place.bottom, maxHeight = null } = {}) {
    this.place = { left, bottom, maxHeight };
    if (this.opened) { this.layout(); return; }
    this.opened = true;
    this.pressed = false;
    const doc = this.root.ownerDocument;
    this.returnTo = doc.activeElement;
    this.field.value = '';
    this.chipsShown = this.on.size > 0;
    this.showFilters();
    this.root.append(this.el);
    doc.addEventListener('pointerdown', this.onPress, true);
    this.refresh();
    this.field.focus({ preventScroll: true });
    // And once more, after whatever opened it has had its say about the keyboard.
    setTimeout(() => { if (this.opened) this.field.focus({ preventScroll: true }); }, 0);
  }

  close() {
    if (!this.opened) return;
    this.opened = false;
    const doc = this.root.ownerDocument;
    doc.removeEventListener('pointerdown', this.onPress, true);
    const hadKeyboard = this.el.contains(doc.activeElement);
    this.el.remove();
    // The keyboard back where it was.
    if (hadKeyboard && this.returnTo?.isConnected && this.returnTo !== doc.body) this.returnTo.focus?.({ preventScroll: true });
    this.returnTo = null;
    this.onClose?.();
  }

  /** Made again from the provider, the first row chosen. */
  refresh() {
    const sections = this.provider(this.query, new Set(this.on)) ?? [];
    this.items = [];
    this.rows = [];
    const parts = [];
    let y = 2;
    for (const s of sections) {
      if (!s?.items?.length) continue;
      if (s.divided && y > 2) {
        parts.push(h('div.mf-popmenu-rule', { role: 'separator' }));
        y += 9;
      }
      if (s.title != null && s.title !== '') {
        parts.push(h('div.mf-popmenu-header', s.title));
        y += HEADER;
      }
      for (const item of s.items) {
        const two = !!item.subtitle;
        const row = h('div.mf-popmenu-row', { role: 'option' },
          h('span.mf-popmenu-icon', item.image instanceof Node ? item.image
            : item.image ? h('img', { src: item.image, alt: '' })
              : item.symbol ? icon(item.symbol, { size: 12.5, weight: 'regular' }) : null),
          h('div.mf-popmenu-line',
            h('span.mf-popmenu-title', item.title ?? ''),
            item.trailing ? h('span.mf-popmenu-trailing', item.trailing) : null,
            item.chevron ? h('span.mf-popmenu-chevron', icon('chevron.right', { size: 10, weight: 'semibold' })) : null),
          two ? h('div.mf-popmenu-subtitle', item.subtitle) : null);
        if (two) row.classList.add('mf-two-lines');
        if (item.dimmed) row.classList.add('mf-dimmed');
        parts.push(row);
        this.rows.push(row);
        this.items.push(item);
        y += two ? TWO_LINES : ROW;
      }
    }
    const none = this.items.length === 0;
    if (none) parts.push(h('div.mf-popmenu-empty', this.empty));
    this.list.classList.toggle('mf-is-empty', none);
    this.list.replaceChildren(...parts);
    this.listHeight = none ? 60 : y + 2;
    this.chosen = null;
    this.choose(none ? null : 0);
    const typed = this.field.value !== '';
    this.clear.hidden = !typed;
    this.hint.hidden = typed;
    this.layout();
    this.scroll.scrollTop = 0;
  }

  // ---------------------------------------------------------------- private

  showFilters() {
    const shown = this.chipsShown && this.chips.length > 0;
    this.chipRow.hidden = !shown;
    this.filter?.classList.toggle('mf-shown', shown);
    this.filter?.classList.toggle('mf-on', this.on.size > 0);
  }

  /** Its height for what it shows, at most what there's room for; growing up from its foot. */
  layout() {
    if (!this.opened) return;
    const { left, bottom, maxHeight } = this.place;
    const most = maxHeight ?? Math.min(MOST, this.root.clientHeight - bottom - 20);
    const chips = this.chipsShown && this.chips.length ? CHIPS : 0;
    const height = Math.max(0, Math.min(most, SEARCH + chips + this.listHeight + 8));
    this.el.style.left = left + 'px';
    this.el.style.bottom = bottom + 'px';
    this.el.style.height = height + 'px';
  }

  rowAt(e) {
    const row = e.target instanceof Element ? e.target.closest('.mf-popmenu-row') : null;
    return row ? this.rows.indexOf(row) : -1;
  }

  choose(i) {
    if (i === this.chosen) return;
    if (this.chosen != null) {
      this.rows[this.chosen]?.classList.remove('mf-chosen');
      this.rows[this.chosen]?.removeAttribute('aria-selected');
    }
    this.chosen = i;
    if (i != null) {
      this.rows[i]?.classList.add('mf-chosen');
      this.rows[i]?.setAttribute('aria-selected', 'true');
    }
  }

  /** ↑/↓: by one, stopping at the ends, the row kept in view with a little to spare. */
  move(by) {
    if (!this.items.length) return;
    this.choose(clamp((this.chosen ?? -1) + by, 0, this.items.length - 1));
    const row = this.rows[this.chosen], s = this.scroll;
    const top = row.offsetTop - 6, bottom = row.offsetTop + row.offsetHeight + 6;
    if (top < s.scrollTop) s.scrollTop = Math.max(0, top);
    else if (bottom > s.scrollTop + s.clientHeight) s.scrollTop = bottom - s.clientHeight;
  }

  run(i) {
    const item = this.items[i];
    if (!item) return;
    if (!item.keepsOpen) this.close();
    const said = item.action?.();
    if (item.keepsOpen && said === 'refresh' && this.opened) this.refresh();
  }

  onKey(e) {
    if (e.isComposing) return;
    const take = () => { e.preventDefault(); e.stopPropagation(); };
    switch (e.key) {
      case 'ArrowDown': take(); this.move(1); break;
      case 'ArrowUp': take(); this.move(-1); break;
      case 'Enter': take(); if (this.chosen != null) this.run(this.chosen); break;
      // Closed, even with something typed: not cleared first.
      case 'Escape': take(); this.close(); break;
      default:
    }
  }
}
