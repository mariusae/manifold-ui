// A context menu, as the system's (Manifold's context menus are NSMenus):
// frosted, rows 22 high, the highlighted row on an accent band; submenus,
// checkmarks, key hints, section headers. Styles in css/menus.css.
//
//   showMenu(items, { x, y, root = document.body, minWidth }) → { el, close(), closed }
//
//   items: Array<
//       { title, symbol?, key?, checked?, disabled?, colorDot?, action?: () => void, submenu?: items }
//     | { separator: true }
//     | { header: string } >
//
//   - Opens with its top-left at (x, y), in viewport coordinates, kept inside
//     the viewport: flipped to the other side of the point where it would
//     run off, shifted where that won't do, scrolling if taller than the
//     viewport. Mounted in the nearest `.mf-root` of `root` (above it, or
//     else within it), so it wears the theme.
//   - A symbol column is kept when any item has a `symbol`; a checkmark
//     column when any item says `checked` (true or false). `key` is a hint
//     only (e.g. '⌘C'), drawn at the right: the menu doesn't bind it.
//   - The pointer or ↑/↓ highlight (the keys skip separators and disabled
//     items, and wrap); Return or Space runs; → or resting ~0.1 s on an item
//     opens its submenu, ← closes it; Esc closes everything; letters typed
//     choose the item they begin.
//   - A press off the menu closes it and goes no further (a full-viewport
//     catcher takes it). Opened under a press still held, letting go over an
//     item runs it once the press has lasted 200 ms or travelled 4 px.
//   - Running an item: its highlight blinks once, the whole tree closes,
//     then `action()` is called. `closed` resolves when the menu is gone
//     from the page (however it went).
//   - One tree at a time: opening another closes the one that's up.
//
// While a menu is up the keyboard is the menu's (keys go no further); the
// element that had focus keeps it. Every listener goes when the menu does.

import { h, Motion, animate } from '../core/util.js';
import { icon } from '../icons/icons.js';

const MARGIN = 6;          // kept clear of the viewport's edges
const SUBMENU_DELAY = 100; // resting on an item before its submenu opens
const AIM_DELAY = 300;     // …longer, while the pointer heads for an open submenu
const BLINK = 60;          // the chosen item's highlight off, then on, this long each
const HOLD = 200;          // a press this long, or this far, is a drag through the menu
const SLOP = 4;
const TYPE_PAUSE = 1000;   // typed letters start over after this

// Whether a mouse button is down right now, and where it went down: a menu
// opened under a press takes that press's release.
const pointer = { down: false, x: 0, y: 0 };
if (typeof window !== 'undefined') {
  const note = (e) => {
    pointer.down = e.buttons !== 0;
    pointer.x = e.clientX;
    pointer.y = e.clientY;
  };
  for (const type of ['pointerdown', 'pointerup', 'pointercancel']) window.addEventListener(type, note, { capture: true, passive: true });
}

let current = null;

export function showMenu(items, { x = 0, y = 0, root = document.body, minWidth = 0 } = {}) {
  current?.close({ fade: false });
  const tree = new MenuTree(items ?? [], { x, y, root, minWidth });
  current = tree;
  return { el: tree.levels[0].el, close: () => tree.close(), closed: tree.closed };
}

const isItem = (item) => !!item && !item.separator && item.header == null;
const isEnabled = (item) => isItem(item) && !item.disabled;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
/** An animation's end — or, where no frames are drawn to end it (a page in the background), the time it would have taken. */
const ended = (a, ms) => Promise.race([a.done, sleep(ms + 80)]);

class MenuTree {
  constructor(items, { x, y, root, minWidth }) {
    this.doc = root.ownerDocument ?? document;
    this.win = this.doc.defaultView ?? window;
    const mount = root.closest?.('.mf-root') ?? root.querySelector?.('.mf-root') ?? root;
    this.catcher = h('div.mf-menu-catcher');
    mount.append(this.catcher);
    this.levels = [];
    this.state = 'open'; // open → running (an item blinking) → closed
    this.closed = new Promise((resolve) => { this.resolveClosed = resolve; });
    this.opening = pointer.down ? { x: pointer.x, y: pointer.y, at: performance.now(), moved: false } : null;
    this.pressInside = false;
    // Where the pointer was last known to be: the item it opens under isn't
    // highlighted until the pointer moves.
    this.last = { x: pointer.x, y: pointer.y };
    this.typed = { text: '', at: 0 };
    this.listen();
    const level = this.addLevel(items, null, -1, minWidth);
    this.placeRoot(level, x, y);
  }

  // ---------------------------------------------------------------- levels

  addLevel(items, parent, parentIndex, minWidth = 0) {
    const el = h('div.mf-menu', { role: 'menu' });
    if (minWidth) el.style.minWidth = minWidth + 'px';
    const hasSymbols = items.some((i) => isItem(i) && i.symbol);
    const hasChecks = items.some((i) => isItem(i) && i.checked != null);
    el.classList.toggle('mf-has-checks', hasChecks);
    const rows = items.map((item) => {
      if (!item) return h('div');
      if (item.separator) return h('div.mf-menu-separator', { role: 'separator' });
      if (item.header != null) return h('div.mf-menu-header', item.header);
      const row = h('div.mf-menu-item', { role: item.checked != null ? 'menuitemcheckbox' : 'menuitem' },
        hasChecks ? h('span.mf-menu-check', item.checked ? icon('checkmark', { size: 10, weight: 'bold' }) : null) : null,
        hasSymbols ? h('span.mf-menu-symbol', item.symbol ? icon(item.symbol, { size: 12 }) : null) : null,
        item.colorDot ? h('span.mf-menu-dot', { style: { background: item.colorDot } }) : null,
        h('span.mf-menu-title', item.title ?? ''),
        item.key ? h('span.mf-menu-key', item.key) : null,
        item.submenu ? h('span.mf-menu-chevron', icon('chevron.right', { size: 9, weight: 'semibold' })) : null);
      if (item.checked != null) row.setAttribute('aria-checked', String(!!item.checked));
      if (item.disabled) { row.classList.add('mf-disabled'); row.setAttribute('aria-disabled', 'true'); }
      if (item.submenu) row.setAttribute('aria-haspopup', 'menu');
      return row;
    });
    el.append(...rows);
    el.style.visibility = 'hidden';
    this.catcher.append(el);
    const level = { el, items, rows, highlighted: -1, parent, parentIndex, child: null, timer: 0, side: 1 };
    if (parent) parent.child = level;
    this.levels.push(level);
    return level;
  }

  /** The viewport, and where the catcher's own origin is in it (not always 0, 0: a transformed ancestor holds fixed things). */
  frame() {
    const c = this.catcher.getBoundingClientRect();
    const root = this.doc.documentElement;
    return { ox: c.left, oy: c.top, vw: root.clientWidth || this.win.innerWidth, vh: root.clientHeight || this.win.innerHeight };
  }

  fitHeight(level, f) {
    const most = Math.max(60, f.vh - 2 * MARGIN);
    level.el.style.maxHeight = most + 'px';
    return { w: level.el.offsetWidth, h: Math.min(level.el.offsetHeight, most) };
  }

  put(level, f, left, top) {
    level.el.style.left = Math.round(left - f.ox) + 'px';
    level.el.style.top = Math.round(top - f.oy) + 'px';
    level.el.style.visibility = '';
  }

  placeRoot(level, x, y) {
    const f = this.frame();
    const { w, h: height } = this.fitHeight(level, f);
    let left = x;
    if (left + w > f.vw - MARGIN) left = x - w >= MARGIN ? x - w : f.vw - MARGIN - w;
    let top = y;
    if (top + height > f.vh - MARGIN) top = y - height >= MARGIN ? y - height : f.vh - MARGIN - height;
    this.put(level, f, Math.max(MARGIN, left), Math.max(MARGIN, top));
  }

  /** Beside its item: to the right (to the left where there's no room), its first row level with the item. */
  placeSub(level) {
    const f = this.frame();
    const { w, h: height } = this.fitHeight(level, f);
    const p = level.parent.el.getBoundingClientRect();
    const r = level.parent.rows[level.parentIndex].getBoundingClientRect();
    const overlap = 2;
    let left = p.right - overlap;
    level.side = 1;
    if (left + w > f.vw - MARGIN && p.left + overlap - w >= MARGIN) {
      left = p.left + overlap - w;
      level.side = -1;
    }
    left = Math.max(MARGIN, Math.min(left, f.vw - MARGIN - w));
    const top = Math.max(MARGIN, Math.min(r.top - 5, f.vh - MARGIN - height));
    this.put(level, f, left, top);
  }

  openSubmenu(level, index) {
    if (level.child?.parentIndex === index) return level.child;
    if (level.child) this.closeFrom(level.child);
    const item = level.items[index];
    if (!isEnabled(item) || !item.submenu) return null;
    const sub = this.addLevel(item.submenu, level, index);
    this.placeSub(sub);
    return sub;
  }

  /** This level and those opened from it, gone at once. */
  closeFrom(level) {
    const at = this.levels.indexOf(level);
    if (at < 1) return;
    for (const l of this.levels.splice(at)) {
      clearTimeout(l.timer);
      l.el.remove();
    }
    level.parent.child = null;
  }

  /** The level the keys are for: the deepest with something highlighted. */
  active() {
    for (let i = this.levels.length - 1; i >= 0; i--) if (this.levels[i].highlighted >= 0) return this.levels[i];
    return this.levels[0];
  }

  // -------------------------------------------------------------- highlight

  mark(level, index) {
    if (level.highlighted === index) return;
    level.rows[level.highlighted]?.classList.remove('mf-highlighted');
    level.highlighted = index;
    level.rows[index]?.classList.add('mf-highlighted');
  }

  /** The pointer's: the submenu follows after a rest (longer while the pointer heads for the one that's open). */
  hover(level, index, toward = false) {
    // Back on a level: nothing below it is highlighted any more.
    for (let c = level.child; c; c = c.child) { clearTimeout(c.timer); this.mark(c, -1); }
    // And it is still what its parents show open.
    for (let l = level; l.parent; l = l.parent) { clearTimeout(l.parent.timer); this.mark(l.parent, l.parentIndex); }
    if (level.highlighted === index) {
      if (level.child?.parentIndex === index) clearTimeout(level.timer);
      return;
    }
    // Off its items (a separator, its edge) with a submenu open: that item stays lit.
    if (index < 0 && level.child) return;
    this.mark(level, index);
    clearTimeout(level.timer);
    level.timer = setTimeout(() => this.settle(level), (level.child && toward ? AIM_DELAY : SUBMENU_DELAY) * Motion.slowdown);
  }

  /** The submenu shown is the highlighted item's, or none. */
  settle(level) {
    if (this.state !== 'open' || !this.levels.includes(level)) return;
    if (level.child && level.child.parentIndex !== level.highlighted) this.closeFrom(level.child);
    if (level.highlighted >= 0 && !level.child) this.openSubmenu(level, level.highlighted);
  }

  /** The keys': at once, and any submenu of another item closed. */
  choose(level, index) {
    clearTimeout(level.timer);
    if (level.child && level.child.parentIndex !== index) this.closeFrom(level.child);
    this.mark(level, index);
    // Brought into view, in a menu taller than the viewport.
    const row = level.rows[index], m = level.el;
    if (!row || m.scrollHeight <= m.clientHeight) return;
    const top = row.offsetTop, bottom = top + row.offsetHeight;
    if (top - 5 < m.scrollTop) m.scrollTop = top - 5;
    else if (bottom + 5 > m.scrollTop + m.clientHeight) m.scrollTop = bottom + 5 - m.clientHeight;
  }

  move(level, by) {
    const able = level.items.map((item, i) => (isEnabled(item) ? i : -1)).filter((i) => i >= 0);
    if (!able.length) return;
    const at = able.indexOf(level.highlighted);
    const next = at < 0 ? (by > 0 ? 0 : able.length - 1) : (at + by + able.length) % able.length;
    this.choose(level, able[next]);
  }

  /** Into the highlighted item's submenu, its first item highlighted. */
  enter(level) {
    const sub = this.openSubmenu(level, level.highlighted);
    if (!sub) return false;
    clearTimeout(level.timer);
    const first = sub.items.findIndex(isEnabled);
    if (first >= 0) this.choose(sub, first);
    return true;
  }

  // ------------------------------------------------------------------ input

  listen() {
    const on = (target, type, fn, options) => {
      target.addEventListener(type, fn, options);
      return () => target.removeEventListener(type, fn, options);
    };
    const swallow = (e) => {
      e.stopPropagation();
      if (e.type === 'mousedown' || e.type === 'contextmenu') e.preventDefault();
      else if (e.type === 'wheel') {
        const menu = e.target.closest?.('.mf-menu');
        if (!menu || menu.scrollHeight <= menu.clientHeight) e.preventDefault();
      }
    };
    // The catcher's own stay with it (it outlives the menu by the rest of a press).
    this.catcher.addEventListener('pointerdown', (e) => this.onDown(e));
    for (const type of ['pointerup', 'mousedown', 'mouseup', 'click', 'dblclick', 'auxclick', 'contextmenu']) this.catcher.addEventListener(type, swallow);
    this.catcher.addEventListener('wheel', swallow, { passive: false });
    this.unlisten = [
      // A press that found its way round the catcher (something stacked over it) still closes the menu.
      on(this.win, 'pointerdown', (e) => {
        if (this.state !== 'open' || (e.target instanceof this.win.Node && this.catcher.contains(e.target))) return;
        this.opening = null;
        this.close();
      }, true),
      on(this.win, 'pointermove', (e) => this.onMove(e), true),
      on(this.win, 'pointerup', (e) => this.onUp(e), true),
      on(this.win, 'keydown', (e) => this.onKey(e), true),
      on(this.win, 'blur', () => { if (this.state === 'open') this.close(); }),
      on(this.win, 'resize', () => { if (this.state === 'open') this.close({ fade: false }); }),
    ];
  }

  /** The item under an event: by its target, or — the pointer captured elsewhere — by where it is. */
  hit(e) {
    let t = e.target;
    if (!(t instanceof this.win.Element) || !this.catcher.contains(t)) t = this.doc.elementFromPoint(e.clientX, e.clientY);
    const el = t?.closest?.('.mf-menu');
    const level = el ? this.levels.find((l) => l.el === el) : null;
    if (!level) return { level: null, index: -1 };
    const row = t.closest('.mf-menu-item');
    const index = row ? level.rows.indexOf(row) : -1;
    return { level, index: index >= 0 && isEnabled(level.items[index]) ? index : -1 };
  }

  onDown(e) {
    e.stopPropagation();
    this.opening = null;
    if (this.state !== 'open') { e.preventDefault(); return; }
    const { level, index } = this.hit(e);
    if (!level) {
      // Off the menu: it closes, and the press is nobody's.
      e.preventDefault();
      this.close({ press: e });
      return;
    }
    this.pressInside = true;
    this.hover(level, index);
  }

  onMove(e) {
    const o = this.opening;
    if (o && !o.moved && Math.hypot(e.clientX - o.x, e.clientY - o.y) > SLOP) o.moved = true;
    if (this.state !== 'open') return;
    // Only a pointer that moved: rows arriving under a still one aren't chosen by it.
    if (e.clientX === this.last.x && e.clientY === this.last.y) return;
    const dx = e.clientX - this.last.x;
    this.last = { x: e.clientX, y: e.clientY };
    const { level, index } = this.hit(e);
    if (level) {
      this.hover(level, index, !!level.child && dx * level.child.side > 0);
      return;
    }
    // Off every menu: the last one's highlight goes (an item showing its submenu keeps it).
    const deepest = this.levels[this.levels.length - 1];
    if (deepest.highlighted >= 0) {
      clearTimeout(deepest.timer);
      this.mark(deepest, -1);
    }
  }

  onUp(e) {
    if (this.state !== 'open') return;
    const { level, index } = this.hit(e);
    const o = this.opening;
    if (o) {
      // The press that opened it, let go.
      this.opening = null;
      const long = performance.now() - o.at > HOLD;
      const far = o.moved || Math.hypot(e.clientX - o.x, e.clientY - o.y) > SLOP;
      if (!long && !far) return; // a click: the menu stays up
      if (level && index >= 0) this.activate(level, index);
      else if (!level && long && far) this.close(); // dragged off it and let go
      return;
    }
    if (!this.pressInside) return;
    this.pressInside = false;
    if (level && index >= 0) this.activate(level, index);
  }

  onKey(e) {
    e.stopPropagation();
    if (this.state !== 'open') { e.preventDefault(); return; }
    if (e.isComposing) return;
    const level = this.active();
    const handled = () => e.preventDefault();
    switch (e.key) {
      case 'ArrowDown': handled(); this.move(level, 1); return;
      case 'ArrowUp': handled(); this.move(level, -1); return;
      case 'Home': case 'PageUp': handled(); this.mark(level, -1); this.move(level, 1); return;
      case 'End': case 'PageDown': handled(); this.mark(level, -1); this.move(level, -1); return;
      case 'ArrowRight': handled(); if (level.highlighted >= 0) this.enter(level); return;
      case 'ArrowLeft':
        handled();
        if (level.child) this.closeFrom(level.child);
        else if (level.parent) this.closeFrom(level);
        return;
      case 'Enter':
        handled();
        if (level.highlighted >= 0) this.activate(level, level.highlighted, true);
        else this.close();
        return;
      case 'Escape': handled(); this.close(); return;
      case 'Tab': handled(); return;
      default:
    }
    if (e.metaKey || e.ctrlKey || e.altKey || e.key.length !== 1) return;
    handled();
    const now = performance.now();
    const typing = this.typed.text && now - this.typed.at < TYPE_PAUSE * Motion.slowdown;
    if (e.key === ' ' && !typing) {
      if (level.highlighted >= 0) this.activate(level, level.highlighted, true);
      return;
    }
    this.typed = { text: (typing ? this.typed.text : '') + e.key.toLowerCase(), at: now };
    const starts = (text) => level.items.findIndex((item) => isEnabled(item) && String(item.title ?? '').toLowerCase().startsWith(text));
    let found = starts(this.typed.text);
    // The same letter again: no word begins so — start over with it.
    if (found < 0 && this.typed.text.length > 1) {
      this.typed.text = e.key.toLowerCase();
      found = starts(this.typed.text);
    }
    if (found >= 0) this.choose(level, found);
  }

  // ---------------------------------------------------------------- running

  /** An item taken: into its submenu, or run. */
  activate(level, index, byKey = false) {
    const item = level.items[index];
    if (!isEnabled(item)) return;
    if (item.submenu) {
      this.mark(level, index);
      if (byKey) this.enter(level);
      else { clearTimeout(level.timer); this.openSubmenu(level, index); }
      return;
    }
    this.run(level, index);
  }

  async run(level, index) {
    const item = level.items[index], row = level.rows[index];
    this.state = 'running';
    for (const l of this.levels) clearTimeout(l.timer);
    this.mark(level, index);
    // It blinks, as the system's: off, on, gone.
    const blink = BLINK * Motion.slowdown;
    row.classList.remove('mf-highlighted');
    await sleep(blink);
    row.classList.add('mf-highlighted');
    await sleep(blink);
    if (this.state !== 'running') return; // closed from outside meanwhile: not run
    this.close();
    item.action?.();
  }

  /**
   * Gone: nothing of it listens or takes a press from here on (but the rest
   * of the press that closed it, which the catcher stays for); it fades,
   * and then it's out of the page.
   */
  close({ fade = true, press = null } = {}) {
    if (this.state === 'closed') return;
    this.state = 'closed';
    if (current === this) current = null;
    for (const off of this.unlisten) off();
    this.unlisten = [];
    for (const l of this.levels) clearTimeout(l.timer);

    let waiting = 1;
    const gone = () => {
      waiting -= 1;
      if (waiting > 0) return;
      this.catcher.remove();
      this.resolveClosed();
    };
    if (press && press.buttons !== 0) {
      // Its release, and the click that would follow, land on the catcher too.
      waiting += 1;
      let released = false;
      const offs = [];
      const release = () => {
        if (released) return;
        released = true;
        for (const off of offs) off();
        setTimeout(gone, 0);
      };
      for (const type of ['pointerup', 'pointercancel']) {
        this.win.addEventListener(type, release, true);
        offs.push(() => this.win.removeEventListener(type, release, true));
      }
      this.catcher.addEventListener('lostpointercapture', release);
      try { this.catcher.setPointerCapture(press.pointerId); } catch { /* not a live pointer */ }
    } else {
      this.catcher.style.pointerEvents = 'none';
    }
    const menus = this.levels.map((l) => l.el);
    const remove = () => {
      for (const el of menus) el.remove();
      gone();
    };
    if (!fade || !menus.length) { remove(); return; }
    for (const el of menus) el.style.pointerEvents = 'none';
    const fading = menus.map((el) => ended(animate(el, [{ opacity: 1 }, { opacity: 0 }], { duration: Motion.fast, easing: Motion.disappear, fill: 'forwards' }), Motion.fast));
    Promise.all(fading).then(remove);
  }
}
