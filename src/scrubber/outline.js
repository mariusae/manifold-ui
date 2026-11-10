// An outline: what a view holds, by name — a document's headings, a
// terminal's commands, a PDF's contents. One per view; the strip at its right
// edge (strip.js) and the tile's sidebar (tilesidebar.js) both draw it and
// hear of every change.

import { Emitter } from '../core/util.js';

/**
 * Events: 'change' (the items or the filter changed), 'current' (the item
 * you're at — its index, or null), 'pick' (an index: go there).
 */
export class Outline extends Emitter {
  /** [{ title, level = 0, detail = '', failed, running, code, path, you }] */
  items = [];
  /** The item you're at: an index, or null. Each view sets it. */
  current = null;
  /** Lower-cased words; an item is admitted when it holds every one. */
  filter = [];
  /** Counts the times the items changed (not `current`, not the filter). */
  generation = 0;
  /** Optional (i) => menu items, as overlay/menu.js's showMenu takes them. */
  menuFor = null;
  /** Optional (i) => what a drag of the item carries. */
  dragItem = null;

  setItems(items) {
    this.items = (items ?? []).map((it) => ({
      ...it,
      title: String(it.title ?? ''),
      level: Math.max(0, Math.floor(it.level ?? 0)),
      detail: it.detail == null ? '' : String(it.detail),
      failed: !!it.failed,
      running: !!it.running,
      code: !!it.code,
      path: !!it.path,
      you: !!it.you,
    }));
    this.generation += 1;
    const gone = this.current != null && this.current >= this.items.length;
    if (gone) this.current = null;
    this.emit('change');
    if (gone) this.emit('current', null);
  }

  setCurrent(i) {
    const next = i == null || i < 0 || i >= this.items.length ? null : i;
    if (next === this.current) return;
    this.current = next;
    this.emit('current', next);
  }

  /** The filter, from a field's text: lower-cased, split on whitespace. */
  setFilter(text) {
    const words = String(text ?? '').toLowerCase().split(/\s+/).filter(Boolean);
    if (words.length === this.filter.length && words.every((w, k) => w === this.filter[k])) return;
    this.filter = words;
    this.emit('change');
  }

  admits(i) {
    const it = this.items[i];
    if (!it) return false;
    if (!this.filter.length) return true;
    const hay = (it.title + ' ' + (it.detail ?? '')).toLowerCase();
    return this.filter.every((w) => hay.includes(w));
  }

  /** The indices the filter admits. */
  get shown() {
    const out = [];
    for (let i = 0; i < this.items.length; i++) if (this.admits(i)) out.push(i);
    return out;
  }

  /** Go to an item: it becomes the current one, and the view hears 'pick'. */
  pick(i) {
    if (i == null || i < 0 || i >= this.items.length) return;
    if (this.current !== i) {
      this.current = i;
      this.emit('current', i);
    }
    this.emit('pick', i);
  }

  /** Headings as items: levels normalised so the shallowest present is 0, capped at 4. */
  static headings(list) {
    const levels = (list ?? []).map((it) => Math.floor(it.level ?? 0));
    const base = levels.length ? Math.min(...levels) : 0;
    return (list ?? []).map((it, k) => ({ ...it, level: Math.min(4, Math.max(0, levels[k] - base)) }));
  }
}
