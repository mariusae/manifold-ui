// Dragging things (Manifold §3.11). There are two kinds of drag. A tile's
// bar (or its row) dragged plainly *moves* it — the arrangement is what
// changes. Everything else dragged is a **thing**, and so is a tile
// ⇧-dragged, or dragged by its bar's icon: shown as a pill — its icon and
// name — wearing at its corner by the pointer a badge with the symbol of
// what dropping does there, changing as you go (⃠ where nothing can be
// done). Rest the pointer a moment (or hold ⌃) and a palette opens there of
// what else it can be, the usual one under the pointer.
//
// Drags here are the toolkit's own (pointer events), not the browser's: the
// pointer is a closed hand from the moment a drag begins to its end, and
// every target says what a drop would do as the drag passes over it.
//
// A target: {
//   el,
//   over(session, event) → null (not taken: what's behind it is asked) |
//                          {forms?: [{id, title, symbol, detail?}]}   the first is the plain one
//   leave?(session),
//   drop(session, event, formId) → boolean,
// }

import { h, Motion } from '../core/util.js';
import { icon } from '../icons/icons.js';

const REST_DELAY = 600;
const PALETTE = { row: 40, width: 280, pad: 6, margin: 28 };
export const REFUSED = 'nosign';

export class Drags {
  constructor(root) {
    this.root = root;
    this.targets = [];
    this.session = null;
  }

  /** Registers a drop target; returns what takes it away again. */
  addTarget(target) {
    this.targets.push(target);
    return () => { this.targets = this.targets.filter((t) => t !== target); };
  }

  get active() {
    return !!this.session;
  }

  /**
   * A drag begun (the pointer already past its 4 points).
   * session: {
   *   kind: 'tile' | 'thing',
   *   things: [{title, symbol, …}]     what's carried (a tile drag: the one tile)
   *   tile?: id, cover?: boolean       a tile drag begun with ⌥ covers what it's dropped on
   *   onEnd?(dropped)
   * }
   */
  begin(session, e) {
    if (this.session) this.#end(false);
    this.session = session;
    session.point = { x: e.clientX, y: e.clientY };
    session.modifiers = { option: e.altKey, shift: e.shiftKey, control: e.ctrlKey, command: e.metaKey };
    this.root.classList.add('mf-drag-under-way');
    this.layer = h('div.mf-drag-layer');
    if (session.kind === 'tile') {
      const t = session.things[0] ?? {};
      this.image = h('div.mf-drag-tile', icon(t.symbol ?? 'circle.fill', { size: 13 }), h('span', t.title ?? ''));
    } else {
      // A few pills one under another, then "and N more".
      const things = session.things;
      const shown = things.length <= 5 ? things : things.slice(0, 4);
      this.image = h('div.mf-drag-pills', shown.map((t, i) => h('div.mf-drag-pill', { style: { top: i * 26 - 12 + 'px' } },
        t.symbol ? icon(t.symbol, { size: 12, weight: 'medium' }) : null, h('span', t.title ?? ''))));
      if (things.length > 5) this.image.append(h('div.mf-drag-pill', { style: { top: 4 * 26 - 12 + 'px' } }, h('span', `and ${things.length - 4} more`)));
      this.badge = h('div.mf-drop-badge', { hidden: true });
      this.image.append(this.badge);
    }
    this.layer.append(this.image);
    this.root.append(this.layer);
    this.onMove = (ev) => this.#move(ev);
    this.onUp = (ev) => this.#up(ev);
    this.onKey = (ev) => this.#key(ev);
    window.addEventListener('pointermove', this.onMove, true);
    window.addEventListener('pointerup', this.onUp, true);
    window.addEventListener('pointercancel', this.onUp, true);
    window.addEventListener('keydown', this.onKey, true);
    window.addEventListener('keyup', this.onKey, true);
    this.#move(e);
  }

  #place(p) {
    if (this.session.kind === 'tile') {
      // Its left edge 24 left of the pointer, level with it.
      this.image.style.transform = `translate(${p.x - 24}px, ${p.y - 16}px)`;
    } else {
      // The pill's right end just left of the pointer, level with it.
      this.image.style.transform = `translate(${p.x - 6}px, ${p.y}px)`;
    }
  }

  /** The target under the pointer that takes the drag: the innermost first,
   *  what one doesn't take going on to what's behind it. */
  #find(e) {
    const under = document.elementFromPoint(e.clientX, e.clientY);
    if (!under) return null;
    const hits = this.targets.filter((t) => t.el.contains(under));
    hits.sort((a, b) => (a.el.contains(b.el) ? 1 : b.el.contains(a.el) ? -1 : 0));
    for (const t of hits) {
      const result = t.over(this.session, e);
      if (result) return { target: t, result };
    }
    return null;
  }

  #move(e) {
    const s = this.session;
    if (!s) return;
    const p = { x: e.clientX, y: e.clientY };
    s.point = p;
    s.modifiers = { option: e.altKey, shift: e.shiftKey, control: e.ctrlKey, command: e.metaKey };
    this.#place(p);
    this.lastEvent = e;
    if (this.palette) return this.#trackPalette(p);
    const found = this.#find(e);
    if (this.current && this.current.target !== found?.target) this.current.target.leave?.(s);
    this.current = found;
    const forms = found?.result.forms ?? [];
    this.#wear(s.kind === 'thing' ? (found ? forms[0]?.symbol ?? null : REFUSED) : null);
    // Resting a moment — or ⌃ held — opens the palette of what else it can be.
    clearTimeout(this.restTimer);
    if (found && forms.length > 1) {
      if (e.ctrlKey) return this.#openPalette(p, found);
      if (!this.rest || Math.hypot(p.x - this.rest.x, p.y - this.rest.y) > 4 || this.rest.target !== found.target) this.rest = { ...p, target: found.target, at: performance.now() };
      const left = Math.max(0, REST_DELAY - (performance.now() - this.rest.at));
      const rest = this.rest;
      this.restTimer = setTimeout(() => { if (this.session === s && this.current?.target === rest.target) this.#openPalette(rest, this.current); }, left);
    } else {
      this.rest = null;
    }
  }

  /** The badge on the pill's upper right corner, by the pointer. */
  #wear(symbol) {
    if (!this.badge) return;
    if (symbol === this.worn) return;
    this.worn = symbol;
    this.badge.hidden = !symbol;
    if (!symbol) return;
    this.badge.classList.toggle('mf-refused', symbol === REFUSED);
    this.badge.replaceChildren(icon(symbol, { size: 10, weight: 'bold' }));
    Object.assign(this.badge.style, { right: '-7px', top: '-23px' });
  }

  // ---- the palette: a row for each form the target takes, the plain one
  // under the pointer, so a drop that doesn't move still does what it would
  // have; moved well away, it closes and the target has the drag again.

  #openPalette(at, found) {
    if (this.palette || !this.session) return;
    clearTimeout(this.restTimer);
    const forms = found.result.forms;
    const el = h('div.mf-drop-palette');
    const rows = forms.map((f) => {
      const row = h('div.mf-drop-row', icon(f.symbol ?? 'circle', { size: 14 }), h('div.mf-drop-row-title', f.title), f.detail ? h('div.mf-drop-row-detail', f.detail) : null);
      el.append(row);
      return row;
    });
    const height = rows.length * PALETTE.row;
    let left = Math.min(Math.max(at.x - 36, 6), window.innerWidth - PALETTE.width - 6) - PALETTE.pad;
    let top = at.y - PALETTE.row / 2 - PALETTE.pad;
    // The rest go below it; above, if they wouldn't fit.
    if (top + height + 2 * PALETTE.pad > window.innerHeight - 6) {
      top = at.y + PALETTE.row / 2 + PALETTE.pad - height - 2 * PALETTE.pad;
      el.style.flexDirection = 'column-reverse';
      el.style.display = 'flex';
    }
    Object.assign(el.style, { left: left + 'px', top: top + 'px' });
    this.root.append(el);
    this.palette = { el, rows, forms, found, anchor: { x: at.x, y: at.y }, lit: 0 };
    rows[0].classList.add('mf-lit');
    this.#wear(null);
  }

  #trackPalette(p) {
    const pal = this.palette;
    const r = pal.el.getBoundingClientRect();
    if (p.x < r.left - PALETTE.margin || p.x > r.right + PALETTE.margin || p.y < r.top - PALETTE.margin || p.y > r.bottom + PALETTE.margin) {
      this.#closePalette();
      this.rest = null;
      return this.#move(this.lastEvent);
    }
    const inside = p.x >= r.left && p.x <= r.right && p.y >= r.top && p.y <= r.bottom;
    let lit = inside ? pal.lit : null;
    pal.rows.forEach((row, i) => {
      const b = row.getBoundingClientRect();
      if (p.x >= b.left && p.x <= b.right && p.y >= b.top && p.y <= b.bottom) lit = i;
    });
    pal.over = lit;
    if (lit != null) pal.lit = lit;
    pal.rows.forEach((row, i) => row.classList.toggle('mf-lit', i === lit));
  }

  #closePalette() {
    this.palette?.el.remove();
    this.palette = null;
  }

  #key(e) {
    if (!this.session) return;
    if (e.type === 'keydown' && e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      return this.#end(false);
    }
    // A modifier pressed or let go: what dropping would do, said again.
    if (['Alt', 'Shift', 'Control', 'Meta'].includes(e.key) && this.lastEvent) {
      const le = this.lastEvent;
      this.#move({ clientX: le.clientX, clientY: le.clientY, altKey: e.altKey, shiftKey: e.shiftKey, ctrlKey: e.ctrlKey, metaKey: e.metaKey });
    }
  }

  #up(e) {
    const s = this.session;
    if (!s) return;
    let dropped = false;
    if (e.type !== 'pointercancel') {
      if (this.palette) {
        // The row under the pointer, else the lit one, else the plain form —
        // put in where the pointer rested.
        const pal = this.palette;
        const form = pal.forms[pal.over ?? pal.lit ?? 0] ?? pal.forms[0];
        const at = { clientX: pal.anchor.x, clientY: pal.anchor.y, altKey: e.altKey, shiftKey: e.shiftKey, ctrlKey: e.ctrlKey, metaKey: e.metaKey };
        dropped = !!pal.found.target.drop(s, at, form.id);
      } else {
        this.#move(e);
        const found = this.current;
        if (found) dropped = !!found.target.drop(s, e, found.result.forms?.[0]?.id ?? null);
      }
    }
    this.#end(dropped);
  }

  #end(dropped) {
    const s = this.session;
    if (!s) return;
    this.session = null;
    clearTimeout(this.restTimer);
    this.#closePalette();
    this.current?.target.leave?.(s);
    this.current = null;
    this.rest = null;
    this.worn = undefined;
    this.badge = null;
    window.removeEventListener('pointermove', this.onMove, true);
    window.removeEventListener('pointerup', this.onUp, true);
    window.removeEventListener('pointercancel', this.onUp, true);
    window.removeEventListener('keydown', this.onKey, true);
    window.removeEventListener('keyup', this.onKey, true);
    this.root.classList.remove('mf-drag-under-way');
    const layer = this.layer;
    this.layer = null;
    if (dropped || Motion.reduced) layer.remove();
    else layer.animate([{ opacity: 1 }, { opacity: 0 }], { duration: Motion.fast }).finished.then(() => layer.remove(), () => layer.remove());
    s.onEnd?.(dropped);
  }

  cancel() {
    this.#end(false);
  }
}

/** Watches a press for becoming a drag: `begin(event)` once the pointer has
 *  gone more than 4 points from where it went down; else `click(event)` on
 *  its release. For rows, cards and anything else that's both clicked and
 *  dragged. */
export function pressOrDrag(el, e, { begin, click }) {
  const start = { x: e.clientX, y: e.clientY };
  const move = (ev) => {
    if (Math.hypot(ev.clientX - start.x, ev.clientY - start.y) <= 4) return;
    done();
    begin?.(ev);
  };
  const up = (ev) => {
    done();
    click?.(ev);
  };
  const done = () => {
    window.removeEventListener('pointermove', move, true);
    window.removeEventListener('pointerup', up, true);
    window.removeEventListener('pointercancel', done, true);
  };
  window.addEventListener('pointermove', move, true);
  window.addEventListener('pointerup', up, true);
  window.addEventListener('pointercancel', done, true);
}
