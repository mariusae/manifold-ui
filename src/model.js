// What the toolkit holds: tiles, and the spaces they're in. A tile here is
// only what the chrome needs to know of it — its name, its symbol, where it
// is, how it stands — and a view its type makes; what it *is* stays the
// application's (in `data`).

import { Emitter, makeId } from './core/util.js';
import { emptyArrangement } from './core/arrangement.js';

export class Tile extends Emitter {
  /**
   * @param {object} d  a tile's descriptor:
   *   type      a registered tile type's name
   *   title     its name, on its bar and its row
   *   symbol    its symbol (default: its type's)
   *   place     where it is, in grey after the name (a folder, an address)
   *   path      [{title, symbol?, data?}] — where it is, folder by folder, for ⇧-click
   *   status    what it's doing (see status/statusmark.js)
   *   dirty     true (edited, unsaved) | 'stale'
   *   host      the host it's on, when that isn't the space's (a chip on its bar)
   *   suffix    words after the name in brackets ("exited 3")
   *   summary   {lines, note, tone, code, picture, progress} — the tile in a few lines
   *   editsPlace  its place is a field when clicked (a page's address)
   *   data      anything of the application's
   */
  constructor(ui, d) {
    super();
    this.ui = ui;
    this.id = d.id ?? makeId('t');
    this.type = d.type;
    this.title = d.title ?? ui.types.get(d.type)?.name ?? 'Untitled';
    this.symbol = d.symbol ?? null;
    this.place = d.place ?? '';
    this.path = d.path ?? null;
    this.status = d.status ?? null;
    this.dirty = d.dirty ?? false;
    this.host = d.host ?? null;
    this.suffix = d.suffix ?? null;
    this.summary = d.summary ?? null;
    this.editsPlace = d.editsPlace ?? false;
    this.data = d.data ?? null;
    this.library = d.library ?? null;
    this.view = null;
    this.space = null;
    this.seen = Date.now();
  }

  get typeDef() {
    return this.ui.types.get(this.type) ?? {};
  }

  get resolvedSymbol() {
    return this.symbol ?? this.typeDef.symbol ?? 'circle.fill';
  }

  /** Changes what the chrome shows of it (any of the descriptor's fields), everywhere it's shown. */
  update(patch) {
    Object.assign(this, patch);
    this.emit('change', patch);
    this.ui.tileChanged(this);
    return this;
  }

  /** Its status reported: replaces the last. `null` clears it. */
  setStatus(status) {
    const was = this.status?.state;
    this.status = status ? { at: Date.now(), ...status } : null;
    // Done or failed while you're on it: attended to already.
    if (this.status && (this.status.state === 'done' || this.status.state === 'error') && this.status.read == null) {
      this.status.read = this.ui.isAttending(this);
    }
    this.emit('status', { was, now: this.status?.state });
    this.ui.tileChanged(this);
    return this;
  }

  /** What it is in a few lines, for its card: its own, else its type's. */
  summarize() {
    const s = this.view?.summary?.() ?? this.typeDef.summary?.(this) ?? this.summary ?? {};
    return { symbol: this.resolvedSymbol, title: this.title, place: this.place || undefined, status: this.status, ...s };
  }

  /** What survives a close, to make it again. */
  describe() {
    const d = { id: this.id, type: this.type, title: this.title, symbol: this.symbol, place: this.place, path: this.path,
      status: this.status, dirty: this.dirty, host: this.host, suffix: this.suffix, summary: this.summary, editsPlace: this.editsPlace, library: this.library };
    d.data = this.view?.serialize?.() ?? this.data;
    return d;
  }

  focus() { this.ui.goTo(this); return this; }
  close() { this.ui.close(this); }
  dock() { this.ui.dock(this); }
}

export class Space {
  constructor(d = {}) {
    this.id = d.id ?? makeId('s');
    this.name = d.name ?? 'Space';
    this.color = d.color ?? null;
    this.symbol = d.symbol ?? null;
    this.host = d.host ?? null;
    this.arrangement = d.arrangement ?? emptyArrangement();
    /** Tiles kept for good: listed under Pinned, recalled when closed. */
    this.pins = d.pins ?? [];
    this.undo = [];
    this.redo = [];
    /** The tiles settled on, the latest first (⌃⇥ walks them). */
    this.settled = [];
  }

  /** Its letter: the first of its name's last part. */
  get letter() {
    const last = this.name.split('/').pop().replace(/^[\s\p{P}]+/u, '');
    return last ? [...last][0].toUpperCase() : '·';
  }
}

/** A colour for a space that has none chosen: by its id (FNV-1a), one of twelve. */
export function automaticColor(id, names) {
  let hsh = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    hsh ^= id.charCodeAt(i);
    hsh = Math.imul(hsh, 0x01000193) >>> 0;
  }
  return names[hsh % names.length];
}
