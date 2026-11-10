// The window: a sidebar that's the table of contents of the screen, and a
// space's grid beside it — columns of tiles, every one visible — on a wash
// of soft colour. This is the toolkit's front door: it holds the spaces and
// their tiles, shows one space at a time, and carries Manifold's
// interaction model — how tiles are placed, grown, docked, moved, linked,
// gone to and closed.
//
// What a tile *is* is yours: register a type (`registerTileType`) that
// makes an element for a tile, and open tiles of it.

import { Emitter, h, Motion, animate, modifiers, age as ageOf, isMac } from './core/util.js';
import * as A from './core/arrangement.js';
import { Tile, Space, automaticColor } from './model.js';
import { Grid, GridMetrics } from './grid/grid.js';
import * as Ghost from './grid/ghost.js';
import { Backdrop } from './backdrop/backdrop.js';
import { applyTheme, washOf, getTheme, spaceColors } from './theme/theme.js';
import { setMeasureFamily } from './core/measure.js';
import { Drags, pressOrDrag } from './drag/drag.js';
import { Sidebar } from './sidebar/sidebar.js';
import { HoverCard } from './overlay/hovercard.js';
import { showMenu } from './overlay/menu.js';
import { PopMenu } from './overlay/popmenu.js';
import { Toasts } from './overlay/toast.js';
import { flatButton } from './overlay/flat.js';
import { SpaceSwitcher } from './overlay/spaceswitcher.js';
import { spacePeek } from './overlay/spacecard.js';
import { Overview } from './overlay/overview.js';
import { statusMark, needsAttention } from './status/statusmark.js';
import { defaultKeymap, keyOf, keyLabel } from './keys.js';

const SIDEBAR = { width: 232, min: 180, max: 480, inset: 6, slack: 8, hideDelay: 100 };
const UNDO_DEPTH = 100;
/** How much of a tile gone to is shown, grown to it: its content's height, at most, and as a part of the column. */
const GLIMPSE = { points: 160, share: 1 / 4 };
const SUMMARY_POINTS = 60;
const GENIE = () => Motion.spatial * 2.2;

export class Manifold extends Emitter {
  /**
   * @param {HTMLElement} container  what the window fills
   * @param {object} options
   *   theme        'paper' | 'newsprint' | 'classic' | 'financialTimes' | a theme of your own
   *   appearance   'auto' | 'light' | 'dark'
   *   tint         'theme' | 'blue' | 'orange' | 'purple' | 'pink' | 'green' | 'graphite' | a CSS colour
   *   backdrop     {webgl: true, daylight: true, place: {latitude, longitude}} | false
   *   sidebar      {width: 232, pinned: true, tabs: [{id, symbol, tooltip}]}
   *   hostLabel    what the space's host is called under its name ("This Mac")
   *   keys         false for none; a Map of key → command to add to (or override) the defaults
   *   keepClosed   how long a closed tile waits in Recently Closed before it's gone (ms; 30 minutes)
   *   newTile      a tile type's name: what the sidebar's "New …" row and ⌥⌘T make (default: the first registered)
   */
  constructor(container, options = {}) {
    super();
    this.options = { theme: 'paper', appearance: 'auto', tint: 'theme', hostLabel: isMac ? 'This Mac' : 'This Computer', keepClosed: 30 * 60 * 1000, ...options };
    this.types = new Map();
    this.tiles = new Map();
    this.spaces = [];
    this.current = null;
    this.links = [];
    this.library = [];
    this.closed = []; // {tile, spaceId, at, timer}
    this.departures = new Map();
    this.spaceTrail = [];
    this.commands = this.#commands();
    this.keymap = this.options.keys === false ? new Map() : new Map([...defaultKeymap(), ...(this.options.keys ?? [])]);

    this.root = h('div.mf-root', { tabIndex: -1 });
    container.append(this.root);
    this.stage = h('div.mf-stage');
    this.slides = [h('div.mf-stage-slide'), h('div.mf-stage-slide', { hidden: true })];
    this.grids = [new Grid(this.#gridHost()), new Grid(this.#gridHost())];
    this.slides.forEach((s, i) => s.append(this.grids[i].el));
    this.shownGrid = 0;
    this.emptyState = h('div.mf-empty', { hidden: true });
    this.stage.append(...this.slides, this.emptyState);

    const sb = { width: SIDEBAR.width, pinned: true, tabs: [], ...(this.options.sidebar ?? {}) };
    this.sidebarWidth = sb.width;
    this.sidebarPinned = sb.pinned;
    this.sidebarTabs = sb.tabs;
    this.sidebarTab = sb.tabs[0]?.id ?? null;
    this.sidebarShown = sb.pinned;
    this.sidebar = new Sidebar(this.#sidebarHost());
    this.resizeHandle = h('div.mf-sidebar-resize');
    this.sidebarFrame = h('div.mf-sidebar-frame', this.sidebar.el, this.resizeHandle);
    this.root.append(this.stage, this.sidebarFrame);

    this.drags = new Drags(this.root);
    this.toasts = new Toasts({ stage: this.stage, stack: this.sidebar.toastStack, sidebarShown: () => this.sidebarShown, revealSidebar: () => this.#showSidebar(true) });
    this.switcher = new SpaceSwitcher({ root: this.root });
    this.overview = new Overview({ stage: this.stage });

    this.#theme();
    this.#frame();
    this.#listen();
    this.#dragTargets();
    this.media = matchMedia('(prefers-color-scheme: dark)');
    this.media.addEventListener('change', () => { if (this.options.appearance === 'auto') this.#theme(); });
    this.minute = setInterval(() => this.#renderSidebar(), 60000);
  }

  get grid() {
    return this.grids[this.shownGrid];
  }

  // ----------------------------------------------------------------- look

  get dark() {
    const a = this.options.appearance;
    return a === 'dark' || (a === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  }

  #theme() {
    const dark = this.dark;
    const vars = applyTheme(this.root, this.options.theme, { dark, tint: this.options.tint });
    setMeasureFamily(getComputedStyle(this.root).getPropertyValue('--mf-font').trim());
    if (this.options.backdrop !== false) {
      const wash = washOf(this.options.theme, dark), tint = vars['--mf-accent'];
      if (!this.backdrop) {
        this.backdrop = new Backdrop({ wash, tint, ...(this.options.backdrop ?? {}) });
        this.root.prepend(this.backdrop.el);
      } else {
        this.backdrop.set({ wash, tint });
      }
    }
    if (this.spaces.length) this.render();
    this.emit('theme', { theme: this.options.theme, dark, tint: this.options.tint });
  }

  /** Another theme, by name (or a theme object from `defineTheme`). */
  setTheme(theme) { this.options.theme = theme; this.#theme(); }
  /** 'auto' | 'light' | 'dark' */
  setAppearance(appearance) { this.options.appearance = appearance; this.#theme(); }
  /** 'theme' | one of the tints | a CSS colour */
  setTint(tint) { this.options.tint = tint; this.#theme(); }

  /** A space's colour as CSS, in the appearance shown. */
  colorOf(space) {
    const names = Object.keys(spaceColors);
    const c = space.color ?? automaticColor(space.id, names);
    return spaceColors[c]?.[this.dark ? 'dark' : 'light'] ?? c;
  }

  // ---------------------------------------------------- types, the library

  /**
   * A kind of tile.
   * type: {
   *   type      its name
   *   name      as a menu says it ("Note")
   *   symbol    its tiles' symbol
   *   create(tile, ui) → element | view
   *       a view: {element, destroy?(), focus?(), serialize?() → data,
   *                summary?() → {lines, note, tone, code, picture, progress},
   *                outline?, sidebarShown?, toggleSidebar?(),      an outline of its own (see scrubber/outlined.js)
   *                barButtons?() → [{symbol, tooltip, enabled, action()}],
   *                menu?() → menu items, the tile's own verbs first in its bar's menu
   *                dropForms?(things, event) → [{id, title, symbol, detail}], dropPut?(things, formId, event),
   *                editPlace?() → {text, placeholder, commit(text)} }
   *   summary?(tile)   what a tile of it says in a few lines, when its view doesn't
   *   make?(ui) → descriptor    a new one, from nothing (for "New …")
   *   listed    false to leave it out of the kinds on offer
   * }
   */
  registerTileType(type) {
    this.types.set(type.type, type);
    return this;
  }

  /**
   * Something to recall on the screen: listed in the library (⌘O, the
   * sidebar's foot), brought here when chosen — or gone to, if a tile of it
   * is open already.
   * entry: {id, title, symbol?, subtitle?, group?, tile: descriptor | () → descriptor}
   */
  addToLibrary(entry) {
    this.library = this.library.filter((e) => e.id !== entry.id).concat([entry]);
    return this;
  }

  removeFromLibrary(id) {
    this.library = this.library.filter((e) => e.id !== id);
  }

  /** The tile showing a library entry, if one is open. */
  tileOf(libraryId) {
    for (const t of this.tiles.values()) if (t.library === libraryId && t.space) return t;
    return null;
  }

  /** Opens a library entry: goes to its tile if there's one, else brings it here. */
  recall(id, where = {}) {
    const entry = this.library.find((e) => e.id === id);
    if (!entry) return null;
    const open = this.tileOf(id);
    if (open && !where.again) return this.goTo(open);
    const d = typeof entry.tile === 'function' ? entry.tile() : entry.tile;
    return this.open({ title: entry.title, symbol: entry.symbol, ...d, library: id, id: undefined }, where);
  }

  // --------------------------------------------------------------- spaces

  /** A new space: {name, color, symbol, host}. Shown, unless `select: false`. */
  addSpace(d = {}, { select = true, after = null } = {}) {
    const space = new Space(d);
    const i = after ? this.spaces.indexOf(after) + 1 : this.spaces.length;
    this.spaces.splice(i, 0, space);
    if (select || !this.current) this.selectSpace(space);
    else this.render();
    this.emit('space-added', space);
    return space;
  }

  space(id) {
    return this.spaces.find((s) => s.id === id) ?? null;
  }

  /** Shows a space: its grid comes in as the strip has it — from the right
   *  for one further along, from the left for one before. */
  selectSpace(space, { animated = true } = {}) {
    if (!space || space === this.current) return;
    const was = this.current;
    this.#endWalk(false);
    this.#closeOverview(false);
    HoverCard.hide();
    this.current = space;
    this.spaceTrail = [space.id, ...this.spaceTrail.filter((id) => id !== space.id)];
    const dir = was ? (this.spaces.indexOf(space) > this.spaces.indexOf(was) ? 1 : -1) : 0;
    const slide = animated && was && !Motion.reduced && this.stage.offsetWidth > 0;
    const out = this.shownGrid, into = 1 - out;
    // A slide in flight is finished at once when another begins.
    for (const s of this.slides) s.getAnimations().forEach((a) => a.finish());
    this.shownGrid = into;
    this.slides[into].hidden = false;
    this.#renderGrid();
    const done = () => {
      this.slides[out].hidden = true;
      this.grids[out].clear();
    };
    if (slide) {
      const W = this.stage.offsetWidth;
      animate(this.slides[into], [{ transform: `translateX(${dir * W}px)` }, { transform: 'none' }], { duration: Motion.spatial, easing: Motion.travel });
      animate(this.slides[out], [{ transform: 'none' }, { transform: `translateX(${-dir * W}px)` }], { duration: Motion.spatial, easing: Motion.travel }).done.then(done);
      this.sidebar.slide(dir, () => this.#renderSidebar());
    } else {
      done();
      if (was && Motion.reduced) Ghost.fadeIn(this.slides[into], Motion.base);
      this.#renderSidebar();
    }
    this.#attend();
    this.emit('space', space);
  }

  /** Removes a space, and the tiles only it kept — to Recently Closed, with Undo. */
  removeSpace(space = this.current) {
    if (!space) return;
    const i = this.spaces.indexOf(space);
    const tiles = A.allTiles(space.arrangement).map((id) => this.tiles.get(id)).filter(Boolean);
    this.spaces.splice(i, 1);
    if (this.current === space) {
      this.current = null;
      const next = this.spaces[Math.min(i, this.spaces.length - 1)] ?? null;
      if (next) this.selectSpace(next, { animated: false });
      else { this.grid.clear(); this.render(); }
    } else {
      this.render();
    }
    for (const t of tiles) t.space = null;
    const timer = setTimeout(() => tiles.forEach((t) => this.#destroy(t)), this.options.keepClosed);
    this.toasts.show(`Removed “${space.name}” to Recently Closed`, {
      action: 'Undo', seconds: 6, countdown: true,
      onAction: () => {
        clearTimeout(timer);
        this.spaces.splice(Math.min(i, this.spaces.length), 0, space);
        for (const t of tiles) t.space = space;
        this.selectSpace(space);
      },
    });
    this.emit('space-removed', space);
  }

  renameSpace(space, name) {
    space.name = name;
    this.render();
  }

  // ---------------------------------------------------------------- tiles

  /**
   * Brings a tile into a space (Manifold's "Bring here").
   * @param {object} descriptor  see `Tile`
   * @param {object} where
   *   space      default: the one shown
   *   beside     a tile: below it, taking its lower half
   *   over       a tile: in its place and room, that tile docked under it until this one's taken off
   *   newColumn  true (at the right), or a column's index
   *   slot       {column, at, newColumn} — as a drop says it
   *   docked     true: straight to the dock
   *   focus      false to leave the focus where it is
   * With none: below the biggest tile of the active column, taking its lower half.
   */
  open(descriptor, where = {}) {
    const space = where.space ?? this.current ?? this.addSpace({ name: 'Space' });
    if (!this.types.has(descriptor.type)) throw new Error(`manifold-ui: no tile type “${descriptor.type}”`);
    const tile = descriptor instanceof Tile ? descriptor : new Tile(this, descriptor);
    this.tiles.set(tile.id, tile);
    tile.space = space;
    const a = space.arrangement;
    const focused = a.focused;
    let events;
    const besideId = (where.beside ?? where.over)?.id;
    if (where.slot) {
      const { column, at, newColumn } = where.slot;
      if (newColumn || column >= a.columns.length) events = A.bringingInNewColumn(a, tile.id, column);
      else {
        const below = at > 0 && at - 1 < a.columns[column].length ? a.columns[column][at - 1] : null;
        events = below ? A.bringing(a, tile.id, column, below) : [{ type: 'place', id: tile.id, column, at: 0 }];
      }
    } else if (where.newColumn != null && where.newColumn !== false) {
      events = A.bringingInNewColumn(a, tile.id, where.newColumn === true ? a.columns.length : where.newColumn);
    } else if (besideId && A.locate(a, besideId)) {
      events = A.bringing(a, tile.id, A.locate(a, besideId).column, besideId);
    } else {
      events = A.bringing(a, tile.id, A.focusedColumn(a) ?? 0);
    }
    if (a.full) events.unshift({ type: 'full', id: null });
    this.change(space, events);
    if (where.over && A.locate(a, where.over.id)) this.change(space, A.replacing(a, where.over.id, tile.id), { undo: false });
    if (where.docked) {
      this.departures.set(tile.id, 'flown');
      this.change(space, [{ type: 'dock', id: tile.id }, ...(focused ? [{ type: 'focus', id: focused }] : [])], { undo: false });
    } else if (where.focus === false && focused) {
      this.change(space, [{ type: 'focus', id: focused }], { undo: false });
    } else if (space === this.current) {
      this.#settle(tile);
      this.#focusView(tile);
    }
    this.emit('open', tile);
    return tile;
  }

  tile(id) {
    return this.tiles.get(id) ?? null;
  }

  /** The focused tile of the space shown. */
  get focused() {
    return this.current ? this.tiles.get(this.current.arrangement.focused) ?? null : null;
  }

  #view(tile) {
    if (tile.view) return tile.view;
    const made = tile.typeDef.create?.(tile, this) ?? h('div');
    tile.view = made instanceof Node ? { element: made } : made;
    return tile.view;
  }

  #focusView(tile) {
    if (!tile || this.walk) return;
    requestAnimationFrame(() => {
      if (this.focused !== tile) return;
      if (tile.view?.focus) tile.view.focus();
      else if (!tile.view?.element.contains(document.activeElement)) this.root.focus({ preventScroll: true });
    });
  }

  /** A tile changed what it says of itself: shown again wherever it is. */
  tileChanged(tile) {
    if (this.rendering) return;
    cancelAnimationFrame(this.changedFrame);
    this.changedFrame = requestAnimationFrame(() => this.render());
    if (this.overviewShown) this.overview.update(this.#overviewTiles());
  }

  /** Whether a tile is the one you're on, the window in front. */
  isAttending(tile) {
    return tile === this.focused && tile.space === this.current && document.hasFocus() && !this.walk;
  }

  /** Done and failed are dismissed when the tile is attended: it becomes
   *  the focused one while the window is in front. */
  #attend() {
    const t = this.focused;
    if (!t) return;
    t.seen = Date.now();
    if (t.status && (t.status.state === 'done' || t.status.state === 'error') && !t.status.read && document.hasFocus()) {
      t.status.read = true;
      t.emit('attended');
      this.emit('attended', t);
    }
  }

  #settle(tile) {
    const s = tile.space;
    if (!s) return;
    s.settled = [tile.id, ...s.settled.filter((id) => id !== tile.id)].slice(0, 24);
  }

  // ------------------------------------------------- changing a space

  /**
   * Applies arrangement events to a space (see core/arrangement.js) and
   * shows the result. A change at your hand is kept to undo (⌘Z), a
   * hundred deep per space.
   */
  change(space, events, { undo = true } = {}) {
    if (!space || !events?.length) return;
    if (undo) {
      space.undo.push(A.cloneArrangement(space.arrangement));
      if (space.undo.length > UNDO_DEPTH) space.undo.shift();
      space.redo = [];
    }
    A.applyAll(space.arrangement, events);
    this.render();
    this.emit('change', { space, events });
  }

  undo() {
    if (this.toasts.undoNewest()) return;
    const s = this.current;
    if (!s?.undo.length) return;
    s.redo.push(A.cloneArrangement(s.arrangement));
    this.#restore(s, s.undo.pop());
  }

  redo() {
    const s = this.current;
    if (!s?.redo.length) return;
    s.undo.push(A.cloneArrangement(s.arrangement));
    this.#restore(s, s.redo.pop());
  }

  /** The space put back as it was — but for tiles gone for good since. */
  #restore(space, state) {
    const here = (id) => this.tiles.get(id)?.space === space || this.closed.some((c) => c.tile.id === id && c.spaceId === space.id);
    state.columns = state.columns.map((c) => c.filter(here));
    state.docked = state.docked.filter((d) => here(d.id));
    const back = new Set(A.allTiles(state));
    // Closed since, and back with the undo.
    for (const c of [...this.closed]) if (back.has(c.tile.id)) this.#unclose(c);
    for (const id of A.allTiles(space.arrangement)) if (!back.has(id)) this.#shelve(this.tiles.get(id), space);
    A.apply(space.arrangement, { type: 'restore', state });
    this.render();
  }

  render() {
    this.rendering = true;
    try {
      this.#renderGrid();
      this.#renderSidebar();
    } finally {
      this.rendering = false;
    }
  }

  #arrangementShown() {
    const s = this.current;
    if (!s) return A.emptyArrangement();
    // A walk under way is previewed in the grid itself: a docked tile shown
    // in its column where it would come back, the others parting for it.
    if (this.walk && this.walk.space === s) {
      const id = this.walk.places[this.walk.index];
      const a = A.cloneArrangement(s.arrangement);
      if (A.isDocked(a, id) || (a.full && a.full !== id)) A.applyAll(a, A.revealing(a, id));
      else A.apply(a, { type: 'focus', id });
      return a;
    }
    return s.arrangement;
  }

  #renderGrid() {
    const a = this.#arrangementShown();
    this.#empty(a);
    if (this.overviewShown) return;
    this.grid.show(a, (id) => this.#spec(this.tiles.get(id)));
    this.departures.clear();
  }

  #spec(tile) {
    const view = this.#view(tile);
    const links = this.links.filter((l) => l.from === tile.id || l.to === tile.id).sort((x, y) => y.at - x.at).map((l) => {
      const other = this.tiles.get(l.from === tile.id ? l.to : l.from);
      return other ? { id: l.id, title: other.title, symbol: other.resolvedSymbol, outbound: l.from === tile.id, tile: other.id, breakable: true } : null;
    }).filter(Boolean);
    const sum = tile.summarize();
    return {
      shown: {
        title: tile.title, symbol: tile.resolvedSymbol, place: tile.place, status: tile.status, dirty: tile.dirty, host: tile.host, suffix: tile.suffix,
        summary: { lines: sum.lines ?? [], note: sum.note }, links, editsPlace: tile.editsPlace || !!view.editPlace,
      },
      content: view.element,
      sidebar: view.toggleSidebar ? !!view.sidebarShown : null,
      viewButtons: view.barButtons?.() ?? [],
    };
  }

  /** With no tiles — or no space at all — the window says so, and offers a way on. */
  #empty(a) {
    const none = !this.current;
    const bare = !!this.current && !A.gridTiles(a).length;
    this.emptyState.hidden = !(none || bare);
    if (this.emptyState.hidden) return;
    const key = none ? 'none' : 'bare:' + this.current.id + ':' + a.docked.length;
    if (this.emptyKey === key) return;
    this.emptyKey = key;
    const kind = this.#newType();
    this.emptyState.replaceChildren(
      h('div.mf-empty-heading', none ? 'No spaces' : a.docked.length ? 'Everything here is docked' : 'Nothing here yet'),
      h('div.mf-empty-buttons',
        none ? flatButton({ title: 'New Space', symbol: 'plus', primary: true, onClick: () => this.commands.newSpace() })
          : kind ? flatButton({ title: `New ${kind.name ?? kind.type}`, symbol: kind.symbol, primary: true, onClick: () => this.commands.newTile() }) : null,
        this.library.length ? flatButton({ title: 'Library…', symbol: 'books.vertical', onClick: () => this.commands.library() }) : null),
      h('div.mf-empty-note', none ? 'A space is a grid of tiles you arrange: what’s in it is what you put there.' : 'A tile brought in stays until you take it off, and nothing is tidied away.'),
    );
  }

  // ------------------------------------------------------- what tiles do

  /** Takes the focus to a tile of the space shown. */
  focus(tile) {
    const s = tile?.space;
    if (!s || s !== this.current) return;
    if (s.arrangement.focused !== tile.id) {
      this.change(s, [{ type: 'focus', id: tile.id }, ...(s.arrangement.full && s.arrangement.full !== tile.id ? [{ type: 'full', id: null }] : [])], { undo: false });
      this.emit('focus', tile);
    }
    this.#settle(tile);
    this.#attend();
  }

  /**
   * Goes to a tile where it already is (Manifold's "Go to"): its space
   * shown, a docked tile back where it was, one squeezed down to its bar
   * grown a little, and it's focused — its ring swelling a moment.
   */
  goTo(tile) {
    const s = tile?.space;
    if (!s) return tile;
    this.#closeOverview(true);
    if (s !== this.current) this.selectSpace(s);
    const a = s.arrangement;
    const was = a.focused;
    const docked = A.isDocked(a, tile.id);
    const row = docked && this.sidebarShown ? this.sidebar.rowRect(tile.id) : null;
    const events = this.#showingSome(A.revealing(a, tile.id), a);
    if (docked || was !== tile.id || (a.full && a.full !== tile.id) || events.length > 1) this.change(s, events, { undo: docked });
    if (row) this.#undockFlight(tile, row);
    this.#settle(tile);
    this.#attend();
    this.#focusView(tile);
    if (was !== tile.id) setTimeout(() => this.grid.markArrival(tile.id), 80 + (row ? GENIE() : 0));
    this.emit('focus', tile);
    return tile;
  }

  /** A column as the grid lays it out: what a share comes to in points, and back. */
  #metrics(id, a) {
    const at = A.locate(a, id);
    if (!at) return null;
    const shown = a.columns[at.column];
    const sum = shown.reduce((s, t) => s + A.heightOf(a, t), 0);
    const usable = this.grid.bounds.h - 2 * GridMetrics.inset - (shown.length - 1) * GridMetrics.gap;
    return {
      shown, sum, usable, index: at.index,
      body: (share) => usable * (share / sum) - GridMetrics.barHeight,
      share: (body) => ((body + GridMetrics.barHeight) / usable) * sum,
    };
  }

  /** Events that leave a tile focused, grown to a glimpse if it's too short
   *  for its content — taken from its neighbours as growing takes it. */
  #showingSome(events, a) {
    const after = A.cloneArrangement(a);
    A.applyAll(after, events);
    const f = after.focused;
    const m = f && !after.full ? this.#metrics(f, after) : null;
    if (!m || m.shown.length <= 1 || !(m.sum > 0) || !(m.usable > 0)) return events;
    if (m.body(A.heightOf(after, f)) >= GridMetrics.summarizeBelow) return events;
    const target = Math.min(GLIMPSE.points, m.usable * GLIMPSE.share);
    return events.concat(A.growing(after, f, m.share(target) - A.heightOf(after, f)));
  }

  /** Whether a tile is down to its summary: its content too short for itself. */
  isSummarized(tile) {
    const a = tile.space?.arrangement;
    const m = a && !a.full ? this.#metrics(tile.id, a) : null;
    if (!m || m.shown.length <= 1) return false;
    const body = m.body(A.heightOf(a, tile.id));
    return body >= GridMetrics.collapseBelow && body < GridMetrics.summarizeBelow;
  }

  /** A tile down to its summary — its room to its nearest neighbour showing
   *  its content — or, already there, back to the height it had. */
  toggleSummary(tile = this.focused) {
    const s = tile?.space, a = s?.arrangement;
    const m = a && !a.full ? this.#metrics(tile.id, a) : null;
    if (!m || m.shown.length <= 1 || !(m.usable > 0)) return;
    const mine = A.heightOf(a, tile.id);
    this.unshrunk ??= new Map();
    let want;
    if (this.isSummarized(tile)) {
      if (!this.unshrunk.has(tile.id)) return void this.goTo(tile);
      want = this.unshrunk.get(tile.id);
      this.unshrunk.delete(tile.id);
    } else {
      want = m.share(SUMMARY_POINTS);
      this.unshrunk.set(tile.id, mine);
    }
    const delta = want - mine;
    const others = m.shown.filter((id) => id !== tile.id);
    const showing = (id) => m.body(A.heightOf(a, id)) >= GridMetrics.summarizeBelow;
    let nearest = null;
    for (let d = 1; d < Math.max(m.shown.length, 2) && !nearest; d++) {
      for (const j of [m.index + d, m.index - d]) if (m.shown[j] && showing(m.shown[j])) { nearest = m.shown[j]; break; }
    }
    const other = (delta < 0 ? nearest : null) ?? others.reduce((best, id) => (best == null || A.heightOf(a, id) > A.heightOf(a, best) ? id : best), null);
    if (other == null || !(A.heightOf(a, other) - delta > 0)) return;
    this.change(s, [{ type: 'heights', heights: { [tile.id]: want, [other]: A.heightOf(a, other) - delta } }]);
  }

  /** A bar clicked: its tile grows a step, as acme's does — or, just
   *  filled, its column goes back as it was. */
  grow(tile = this.focused) {
    const s = tile?.space;
    if (!s || this.#unfill(tile)) return;
    this.change(s, A.growing(s.arrangement, tile.id));
  }

  /** A tile filling its column — the others docked, or (keepingBars) down
   *  to their bars — the column as it was kept, for a click on its bar to
   *  put back. */
  fill(tile = this.focused, keepingBars = false) {
    const s = tile?.space, a = s?.arrangement;
    const at = a && A.locate(a, tile.id);
    if (!at) return;
    const events = keepingBars ? A.squeezing(a, tile.id) : A.growing(a, tile.id, 0.15, true);
    if (!events.length) return;
    const column = a.columns[at.column].slice();
    const before = Object.fromEntries(column.map((id) => [id, A.heightOf(a, id)]));
    if (!keepingBars) for (const id of column) if (id !== tile.id) this.departures.set(id, 'flown');
    this.change(s, events);
    const left = a.columns[A.locate(a, tile.id).column].slice();
    this.columnFill = { space: s, tile: tile.id, before, docked: column.filter((id) => A.isDocked(a, id)), after: left, afterHeights: Object.fromEntries(left.map((id) => [id, A.heightOf(a, id)])) };
  }

  #unfill(tile) {
    const f = this.columnFill;
    if (!f || f.tile !== tile.id) return false;
    this.columnFill = null;
    const a = tile.space.arrangement;
    const at = A.locate(a, tile.id);
    if (f.space !== tile.space || !at) return false;
    const column = a.columns[at.column];
    if (column.length !== f.after.length || column.some((id, i) => id !== f.after[i])) return false;
    if (!f.after.every((id) => Math.abs(A.heightOf(a, id) - (f.afterHeights[id] ?? -1)) < 1e-6)) return false;
    if (!f.docked.every((id) => A.isDocked(a, id))) return false;
    this.change(tile.space, A.unfilling(a, f.docked, f.before, tile.id));
    return true;
  }

  toggleMaximize(tile = this.focused) {
    const s = tile?.space;
    if (!s) return;
    this.change(s, [{ type: 'full', id: s.arrangement.full === tile.id ? null : tile.id }]);
  }

  /** Takes a tile out of the grid to have it out of the way and still going:
   *  its room goes back where it came from, and it's listed under Docked. */
  dock(tile = this.focused) {
    const s = tile?.space, a = s?.arrangement;
    if (!a || !A.locate(a, tile.id)) return;
    const from = s === this.current ? this.grid.parts(tile.id)?.card : null;
    const picture = from && !Motion.reduced && !from.hidden ? Ghost.picture(from, this.root, this.#inRoot(from.getBoundingClientRect()), 45) : null;
    this.departures.set(tile.id, 'flown');
    this.change(s, [...(a.full === tile.id ? [{ type: 'full', id: null }] : []), ...A.docking(a, tile.id)]);
    if (picture) this.#fly(picture, this.#dockTarget(tile), { row: tile.id });
    this.#focusView(this.focused);
  }

  /** Closes a tile: off its space, and into Recently Closed for a while —
   *  with Undo said, if it had something to lose. */
  close(tile = this.focused) {
    const s = tile?.space;
    if (!s) return;
    const loses = tile.dirty || tile.status?.state === 'working';
    this.departures.set(tile.id, 'closed');
    this.#shelve(tile, s);
    this.change(s, [...(s.arrangement.full === tile.id ? [{ type: 'full', id: null }] : []), { type: 'remove', id: tile.id }]);
    if (loses) this.toasts.show(`Closed “${tile.title}”`, { action: 'Undo', seconds: 6, countdown: true, onAction: () => this.reopen(tile) });
    this.#focusView(this.focused);
    this.emit('close', tile);
  }

  /** Off its space and kept a while, to reopen. */
  #shelve(tile, space) {
    if (!tile) return;
    tile.space = null;
    const entry = { tile, spaceId: space.id, at: Date.now() };
    entry.timer = setTimeout(() => {
      this.closed = this.closed.filter((c) => c !== entry);
      if (!this.spaces.some((sp) => sp.pins.includes(tile.id))) this.#destroy(tile);
      this.#renderSidebar();
    }, this.options.keepClosed);
    this.closed = [entry, ...this.closed.filter((c) => c.tile !== tile)].slice(0, 100);
  }

  #unclose(entry) {
    clearTimeout(entry.timer);
    this.closed = this.closed.filter((c) => c !== entry);
    entry.tile.space = this.space(entry.spaceId);
  }

  /** Reopens the last thing closed (or `tile`), where it's asked for. */
  reopen(tile = null, where = {}) {
    const entry = tile ? this.closed.find((c) => c.tile === tile) : this.closed[0];
    // (A pinned tile outlives its stay in Recently Closed: recalled all the same.)
    const t = entry?.tile ?? (tile && !tile.space && this.tiles.has(tile.id) ? tile : null);
    if (!t) return null;
    if (entry) this.#unclose(entry);
    const space = where.space ?? (entry && this.space(entry.spaceId)) ?? this.current;
    if (!space) return null;
    if (space !== this.current) this.selectSpace(space);
    return this.open(t, { ...where, space });
  }

  /** Deletes a tile, with nothing asked: off every space at once, and a
   *  toast with Undo while a bar along its foot counts down. */
  delete(tile = this.focused) {
    const s = tile?.space;
    if (!s) return;
    const loses = tile.dirty || tile.status?.state === 'working';
    const state = A.cloneArrangement(s.arrangement);
    const pinned = s.pins.includes(tile.id);
    this.departures.set(tile.id, 'closed');
    tile.space = null;
    s.pins = s.pins.filter((id) => id !== tile.id);
    this.change(s, [{ type: 'remove', id: tile.id }], { undo: false });
    this.toasts.show(`Deleted “${tile.title}”`, {
      action: 'Undo', seconds: loses ? 6 : 4, countdown: true,
      then: () => this.#destroy(tile),
      onAction: () => {
        tile.space = s;
        if (pinned) s.pins.push(tile.id);
        A.apply(s.arrangement, { type: 'restore', state });
        this.render();
      },
    });
    this.emit('delete', tile);
  }

  #destroy(tile) {
    if (tile.space) return;
    tile.view?.destroy?.();
    tile.view = null;
    this.tiles.delete(tile.id);
    this.links = this.links.filter((l) => l.from !== tile.id && l.to !== tile.id);
    for (const sp of this.spaces) sp.pins = sp.pins.filter((id) => id !== tile.id);
    this.emit('destroy', tile);
  }

  /** Keeps a tile in its space for good: listed under Pinned, a row to
   *  recall it by when it's closed. */
  togglePin(tile) {
    const s = tile.space ?? this.current;
    if (!s) return;
    s.pins = s.pins.includes(tile.id) ? s.pins.filter((id) => id !== tile.id) : [...s.pins, tile.id];
    this.render();
  }

  /** A link by hand: one edge, read both ways; both tiles show the other's face on their bar. */
  link(from, to) {
    if (!from || !to || from === to) return;
    this.links = this.links.filter((l) => !((l.from === from.id && l.to === to.id) || (l.from === to.id && l.to === from.id)));
    const l = { id: `l${Date.now().toString(36)}${this.links.length}`, from: from.id, to: to.id, at: Date.now() };
    this.links.push(l);
    this.render();
    this.emit('link', { from, to });
    return l;
  }

  unlink(id) {
    this.links = this.links.filter((l) => l.id !== id);
    this.render();
  }

  /** A tile to another space: there, docked (or where `where` says); ⌥ leaves it to the type to copy. */
  moveToSpace(tile, space, where = { docked: true }) {
    const from = tile.space;
    if (!from || from === space) return;
    this.departures.set(tile.id, 'moved');
    this.change(from, [{ type: 'remove', id: tile.id }]);
    tile.space = space;
    this.open(tile, { ...where, space, ...(where.docked ? { focus: false } : {}) });
  }

  /** Moves the focus a way ('up' 'down' 'left' 'right'), by where the tiles sit. */
  focusToward(way) {
    const t = this.focused;
    const id = t && A.neighbor(this.grid.frames(), t.id, way);
    if (id) this.goTo(this.tiles.get(id));
  }

  focusStep(by) {
    const a = this.current?.arrangement;
    const all = a ? A.gridTiles(a) : [];
    if (all.length < 2) return;
    const i = all.indexOf(a.focused);
    this.goTo(this.tiles.get(all[(i + by + all.length) % all.length]));
  }

  /** Moves the focused tile a step a way. */
  nudge(way) {
    const s = this.current, t = this.focused;
    const events = t && A.nudging(s.arrangement, t.id, way);
    if (events) this.change(s, events);
  }

  /** The tiles whose status wants attention, by space, in the grid's order then the docked. */
  inbox() {
    const out = [];
    for (const s of this.spaces) {
      for (const id of A.gridTiles(s.arrangement).concat(s.arrangement.docked.map((d) => d.id).reverse())) {
        const t = this.tiles.get(id);
        if (t && needsAttention(t.status)) out.push(t);
      }
    }
    return out;
  }

  // ------------------------------------------------------------- the grid

  #gridHost() {
    const tile = (id) => this.tiles.get(id);
    return {
      focus: (id) => this.focus(tile(id)),
      grow: (id) => this.grow(tile(id)),
      fill: (id) => this.fill(tile(id), false),
      squeeze: (id) => this.fill(tile(id), true),
      toggleFull: (id) => this.toggleMaximize(tile(id)),
      closeClicked: (id) => this.close(tile(id)),
      arrive: (id) => this.goTo(tile(id)),
      menu: (id, at) => this.#tileMenu(tile(id), at),
      pathMenu: (id, at) => this.#pathMenu(tile(id), at),
      placeClick: (id) => {
        const t = tile(id), edit = t.view?.editPlace?.();
        if (edit) this.grid.bar(id)?.beginEditing(edit);
      },
      resizedFractions: (fractions) => this.change(this.current, [{ type: 'fractions', fractions }]),
      // A line between tiles dragged: the shares as it left them; a tile
      // pushed to nothing, docked.
      resizedHeights: (heights) => {
        const gone = Object.keys(heights).filter((k) => heights[k] === 0).sort();
        for (const id of gone) this.departures.set(id, 'flown');
        const kept = Object.fromEntries(Object.entries(heights).filter(([, v]) => v > 0));
        this.change(this.current, gone.map((id) => ({ type: 'dock', id })).concat([{ type: 'heights', heights: kept }]));
      },
      dragStart: (id, e, thing) => this.#dragTile(tile(id), e, thing),
      departure: (id) => this.departures.get(id) ?? (tile(id)?.space ? 'moved' : 'closed'),
      summary: (id) => tile(id)?.summarize(),
      linkSummary: (id, l) => tile(l.tile)?.summarize(),
      openLink: (id, l, mods) => this.#openBy(tile(l.tile), mods, tile(id)),
      linkMenu: (id, l, at) => this.#linkMenu(tile(id), l, at),
      linkDrag: (id, l, e, thing) => this.#dragTile(tile(l.tile), e, thing || tile(l.tile)?.space !== this.current),
      toggleSidebar: (id) => { tile(id).view?.toggleSidebar?.(); this.render(); },
      viewButton: (id, i) => { tile(id).view?.barButtons?.()[i]?.action?.(); this.render(); },
    };
  }

  /** One rule for the modifiers, wherever a click opens a tile: plain goes
   *  to it; ⌘ means beside — below the tile clicked in; ⌥ means over. */
  #openBy(tile, mods, from = this.focused) {
    if (!tile) return;
    if (!tile.space) return this.reopen(tile, mods.option && from ? { over: from } : mods.command && from ? { beside: from } : {});
    if ((mods.option || mods.command) && from && from.space === this.current && tile.space === this.current && tile !== from) {
      const a = this.current.arrangement;
      if (mods.option) return this.change(this.current, A.replacing(a, from.id, tile.id));
      const at = A.locate(a, from.id);
      if (at) return this.change(this.current, [{ type: 'move', id: tile.id, column: at.column, at: at.index + 1 }]);
    }
    this.goTo(tile);
  }

  // --------------------------------------------------------- the sidebar

  #frame() {
    const W = this.sidebarWidth;
    this.sidebarFrame.style.width = W + 'px';
    this.sidebarFrame.classList.toggle('mf-floating', !this.sidebarPinned);
    this.stage.style.left = (this.sidebarPinned ? W + SIDEBAR.inset : 0) + 'px';
    this.sidebarFrame.hidden = !this.sidebarShown;
  }

  /** The sidebar beside the content, or sliding out over it when the pointer goes to the window's left edge. */
  setSidebarPinned(pinned) {
    if (pinned === this.sidebarPinned) return;
    this.sidebarPinned = pinned;
    const W = this.sidebarWidth;
    const from = this.stage.offsetLeft, to = pinned ? W + SIDEBAR.inset : 0;
    if (pinned) {
      this.sidebarShown = true;
      this.sidebarFrame.getAnimations().forEach((a) => a.cancel());
    }
    this.#frame();
    if (!Motion.reduced) animate(this.stage, [{ left: from + 'px' }, { left: to + 'px' }], { duration: Motion.base, easing: Motion.appear });
    if (!pinned) this.#hideSidebar(true);
    this.#renderSidebar();
    this.emit('sidebar', { pinned });
  }

  #showSidebar(animated) {
    clearTimeout(this.hideTimer);
    if (this.sidebarShown) return;
    this.sidebarShown = true;
    this.sidebarFrame.hidden = false;
    this.sidebarFrame.getAnimations().forEach((a) => a.cancel());
    this.#renderSidebar();
    if (animated) {
      animate(this.sidebarFrame, [{ transform: `translateX(${-Motion.distance(24)}px)`, opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: Motion.base, easing: Motion.appear });
    }
  }

  #hideSidebar(force = false) {
    clearTimeout(this.hideTimer);
    if (this.sidebarPinned || !this.sidebarShown) return;
    if (!force && (this.drags.active || this.resizing || this.popmenu?.isOpen || this.pointerInSidebar)) return;
    this.sidebarShown = false;
    HoverCard.hide();
    animate(this.sidebarFrame, [{ transform: 'none', opacity: 1 }, { transform: `translateX(${-Motion.distance(24)}px)`, opacity: 0 }], { duration: Motion.fast, easing: Motion.disappear, fill: 'forwards' })
      .done.then((ok) => { if (ok && !this.sidebarShown) { this.sidebarFrame.hidden = true; this.sidebarFrame.getAnimations().forEach((a) => a.cancel()); } });
  }

  #sidebarHost() {
    const tileOf = (row) => this.tiles.get(row.tile ?? row.id);
    return {
      onTab: (id) => { this.sidebarTab = id; this.pushed = null; this.emit('tab', id); this.#renderSidebar(); },
      onPin: () => this.setSidebarPinned(!this.sidebarPinned),
      onSpaceClick: (id) => this.selectSpace(this.space(id)),
      onSpaceMenu: (id, at) => this.#spaceMenu(this.space(id), at),
      onNewSpace: () => this.commands.newSpace(),
      onSpaceReorder: (id, before) => {
        const s = this.space(id);
        this.spaces = this.spaces.filter((x) => x !== s);
        const i = before ? this.spaces.findIndex((x) => x.id === before) : this.spaces.length;
        this.spaces.splice(i < 0 ? this.spaces.length : i, 0, s);
        this.#renderSidebar();
      },
      spacePeek: (id) => (id === this.current?.id ? null : spacePeek(this.#spaceCard(this.space(id)))),
      onRowClick: (row, mods) => {
        HoverCard.hide();
        if (row.kind === 'action') return row.id === 'new' ? this.commands.newTile() : this.emit('row-action', row);
        this.#openBy(tileOf(row), mods);
      },
      onRowMenu: (row, at) => this.#rowMenu(row, tileOf(row), at),
      onRowAccessory: (row, which, e) => {
        if (which === 'chevron') return this.#kindsMenu(e.currentTarget?.getBoundingClientRect?.() ?? e.target.getBoundingClientRect());
        const t = tileOf(row);
        if (!t) return;
        if (which === 'delete') this.delete(t);
        else this.close(t);
      },
      onRowDrag: (row, e, thing) => {
        const t = tileOf(row);
        if (t) this.#dragTile(t, e, thing || !t.space, { fromRow: true });
      },
      rowHover: (row) => {
        const t = tileOf(row);
        return t ? { summary: t.summarize(), picture: t.summarize().picture } : null;
      },
      onSectionMenu: (row, at) => { if (row.id === 'docked' && this.current) this.#spaceMenu(this.current, at, true); },
      onSectionDoubleClick: (row) => { if (row.id === 'docked') this.#renameSpace(this.current); },
      onNeedsYou: (item) => this.goTo(this.tiles.get(item.rowId)),
      onSwipe: (dir) => this.#stepSpace(dir),
      onFooter: (which) => (which === 'left' ? this.commands.library() : this.commands.tilesMenu()),
      onBack: () => { this.pushed = null; this.#renderSidebar(); },
    };
  }

  /** What most wants you in a space: needs you, then failed, done, working. */
  #spaceStatus(space) {
    let best = null;
    const rank = { needsYou: 4, failed: 3, done: 2, working: 1 };
    for (const id of A.allTiles(space.arrangement)) {
      const st = this.tiles.get(id)?.status;
      if (!st) continue;
      const s = st.state === 'blocked' ? 'needsYou' : st.state === 'error' && !st.read ? 'failed' : st.state === 'done' && !st.read ? 'done' : st.state === 'working' ? 'working' : null;
      if (s && (!best || rank[s] > rank[best])) best = s;
    }
    return best;
  }

  #row(tile, extra = {}) {
    const st = tile.status;
    const remark = st ? [st.title, st.msg].filter(Boolean).join(' · ') : '';
    return {
      kind: 'tile', id: tile.id, title: tile.title, symbol: tile.resolvedSymbol, status: st,
      detail: [remark, tile.suffix].filter(Boolean).join(' · ') || undefined,
      age: st?.at && st.state !== 'idle' ? ageOf(st.at) : undefined,
      dirty: tile.dirty, accessories: ['delete', 'close'], ...extra,
    };
  }

  #renderSidebar() {
    if (!this.sidebarShown && !this.sidebarPinned) return;
    const s = this.current;
    const a = s?.arrangement;
    const shownA = s ? this.#arrangementShown() : null;
    const rows = [];
    if (s) {
      const pinned = new Set(s.pins);
      const docked = new Set(a.docked.map((d) => d.id));
      const focused = shownA.focused;
      const row = (id, extra = {}) => this.#row(this.tiles.get(id), { focused: id === focused && !docked.has(id), docked: docked.has(id), maximized: a.full === id, ...extra });
      if (s.pins.length) {
        rows.push({ kind: 'section', id: 'pinned', title: 'Pinned' });
        for (const id of s.pins) {
          const t = this.tiles.get(id);
          if (!t) continue;
          if (A.hasTile(a, id)) rows.push(row(id));
          else rows.push(this.#row(t, { id: 'recall:' + id, tile: id, recall: true, dimmed: true, accessories: [] }));
        }
      }
      rows.push({ kind: 'section', id: 'on-screen', title: 'On Screen' });
      let first = true;
      for (const column of a.columns) {
        const ids = column.filter((id) => !pinned.has(id));
        if (!ids.length) continue;
        if (!first) rows.push({ kind: 'divider' });
        first = false;
        for (const id of ids) rows.push(row(id));
      }
      const kind = this.#newType();
      if (kind) rows.push({ kind: 'action', id: 'new', title: `New ${kind.name ?? kind.type}`, symbol: 'plus', tooltip: `New ${kind.name ?? kind.type}`, accessories: this.#kinds().length > 1 ? ['chevron'] : [] });
      const dockedRows = a.docked.filter((d) => !pinned.has(d.id) && !d.under).slice().reverse();
      if (dockedRows.length) {
        rows.push({ kind: 'section', id: 'docked', title: 'Docked', count: dockedRows.length });
        for (const d of dockedRows) rows.push(row(d.id));
      }
    }
    const needsYou = [];
    for (const sp of this.spaces) {
      for (const id of A.gridTiles(sp.arrangement).concat(sp.arrangement.docked.map((d) => d.id).reverse())) {
        const t = this.tiles.get(id);
        if (t?.status?.state !== 'blocked') continue;
        needsYou.push({ spaceId: sp.id, rowId: t.id, title: t.title, symbol: t.resolvedSymbol, color: this.colorOf(sp), letter: sp.letter, spaceSymbol: sp.symbol, pill: statusMark(t.status).pill });
      }
    }
    let pushed = null;
    if (this.pushed === 'closed') {
      const closedRows = this.closed.map((c) => this.#row(c.tile, { id: 'closed:' + c.tile.id, tile: c.tile.id, dimmed: true, accessories: [], age: ageOf(c.at), detail: c.tile.place || this.space(c.spaceId)?.name }));
      pushed = { title: 'Recently Closed', subtitle: `${closedRows.length} closed`, rows: closedRows.length ? closedRows : [{ kind: 'action', id: 'nothing', title: 'Nothing here', symbol: 'circle.dotted' }] };
    }
    this.sidebar.update({
      tabs: this.sidebarTabs, tab: this.pushed ? null : this.sidebarTab, pinned: this.sidebarPinned,
      spaces: this.spaces.map((sp, i) => ({
        id: sp.id, name: sp.name, color: this.colorOf(sp), symbol: sp.symbol, letter: sp.letter, status: this.#spaceStatus(sp), current: sp === s,
        hostBreak: i > 0 && (sp.host ?? null) !== (this.spaces[i - 1].host ?? null),
      })),
      space: s ? { id: s.id, name: s.name, hostLabel: s.host ?? this.options.hostLabel, hostSymbol: s.host ? 'server.rack' : 'desktopcomputer' } : null,
      rows, needsYou, pushed,
      footer: { left: this.library.length ? { symbol: 'books.vertical', title: 'Library', tooltip: 'The Library' } : null, right: { symbol: 'chevron.down', tooltip: 'Tiles and Recently Closed' } },
    });
  }

  /** A space as its card shows it: its square, and a miniature of its grid. */
  #spaceCard(space) {
    const a = space.arrangement;
    const tiles = [];
    let x = 0;
    a.columns.forEach((column, c) => {
      const w = a.fractions[c] ?? 1 / a.columns.length;
      let y = 0;
      for (const id of column) {
        const hh = A.heightOf(a, id);
        const t = this.tiles.get(id);
        const st = t?.status?.state;
        if (t) tiles.push({
          id, title: t.title, symbol: t.resolvedSymbol, rect: { x, y, w, h: hh }, focused: a.focused === id,
          tone: st === 'blocked' ? 'attention' : st === 'error' && !t.status.read ? 'failed' : st === 'done' && !t.status.read ? 'done' : st === 'working' ? 'running' : undefined,
          picture: t.summarize().picture,
        });
        y += hh;
      }
      x += w;
    });
    const docked = a.docked.length;
    return { id: space.id, name: space.name, color: this.colorOf(space), symbol: space.symbol, letter: space.letter, status: this.#spaceStatus(space),
      footer: [space.host, docked ? `${docked} docked` : null].filter(Boolean).join(' · ') || undefined, tiles };
  }

  #stepSpace(dir) {
    const i = this.spaces.indexOf(this.current) + dir;
    if (i < 0 || i >= this.spaces.length) return;
    this.selectSpace(this.spaces[i]);
  }

  // ---------------------------------------------------------------- menus

  #menu(items, at) {
    HoverCard.hide();
    return showMenu(items.filter(Boolean), { x: at.x, y: at.y + 4, root: this.root });
  }

  #key(command) {
    for (const [key, c] of this.keymap) if (c === command) return keyLabel(key);
    return undefined;
  }

  #tileMenu(tile, at) {
    const s = tile.space, a = s.arrangement;
    const maximized = a.full === tile.id;
    const at2 = A.locate(a, tile.id);
    const own = tile.view?.menu?.() ?? [];
    const summarized = this.isSummarized(tile);
    const canSummarize = !maximized && at2 && a.columns[at2.column].length > 1;
    const hasStatus = tile.status && tile.status.state !== 'idle';
    this.#menu([
      { title: maximized ? 'Restore' : 'Maximize', symbol: maximized ? 'arrow.down.right.and.arrow.up.left' : 'arrow.up.left.and.arrow.down.right', key: this.#key('maximize'), action: () => this.toggleMaximize(tile) },
      { title: 'Grow', symbol: 'arrow.up.and.down', key: this.#key('grow'), action: () => this.grow(tile) },
      maximized && at2 && a.columns[at2.column].length > 1 ? { title: 'Close Column', symbol: 'rectangle.stack.badge.minus', action: () => this.closeColumn(tile) } : null,
      { title: 'Fill the Column', symbol: 'rectangle.expand.vertical', key: this.#key('fillColumn'), action: () => this.fill(tile) },
      canSummarize ? { title: summarized ? 'Show Content' : 'Shrink to Summary', symbol: summarized ? 'rectangle.expand.vertical' : 'rectangle.compress.vertical', key: this.#key('shrinkToSummary'), action: () => this.toggleSummary(tile) } : null,
      { separator: true },
      { title: s.pins.includes(tile.id) ? 'Unpin' : 'Pin in Space', symbol: 'pin', action: () => this.togglePin(tile) },
      tile.view?.outline ? { title: 'Find in Outline…', symbol: 'list.bullet.rectangle', key: this.#key('findInOutline'), action: () => this.commands.findInOutline(tile) } : null,
      at2 ? { title: 'Dock', symbol: 'dock.arrow.down.rectangle', key: this.#key('dock'), action: () => this.dock(tile) } : null,
      { separator: true },
      ...own, own.length ? { separator: true } : null,
      hasStatus ? { title: 'Clear Status', symbol: 'eraser', action: () => tile.setStatus(null) } : null,
      hasStatus ? { separator: true } : null,
      { title: 'Close Tile', symbol: 'xmark', key: this.#key('closeTile'), action: () => this.close(tile) },
      { title: 'Delete', symbol: 'trash', action: () => this.delete(tile) },
    ], at);
  }

  /** ⇧-click: where the tile is, folder by folder up to the root. */
  #pathMenu(tile, at) {
    const path = tile.view?.path?.() ?? tile.path;
    if (!path?.length) return;
    this.#menu(path.slice().reverse().map((p) => ({ title: p.title, symbol: p.symbol ?? 'folder', action: () => (p.action ? p.action() : this.emit('path', { tile, part: p })) })), at);
  }

  #linkMenu(tile, l, at) {
    const other = this.tiles.get(l.tile);
    this.#menu([
      { title: 'Go To', symbol: 'arrow.right', action: () => this.goTo(other) },
      { title: 'Show Beside', symbol: 'square.split.2x1', action: () => this.#openBy(other, { command: true }, tile) },
      { title: 'Show Over', symbol: 'rectangle.stack', action: () => this.#openBy(other, { option: true }, tile) },
      { separator: true },
      l.breakable !== false ? { title: 'Remove Link', symbol: 'link', action: () => this.unlink(l.id) } : null,
    ], at);
  }

  #rowMenu(row, tile, at) {
    if (!tile) return;
    const s = tile.space ?? this.current;
    const docked = tile.space && A.isDocked(tile.space.arrangement, tile.id);
    const hasStatus = tile.status && tile.status.state !== 'idle';
    this.#menu([
      s ? { title: s.pins.includes(tile.id) ? 'Unpin' : 'Pin in Space', symbol: 'pin', action: () => this.togglePin(tile) } : null,
      { separator: true },
      hasStatus ? { title: 'Clear Status', symbol: 'eraser', action: () => tile.setStatus(null) } : null,
      hasStatus ? { separator: true } : null,
      ...(tile.space ? [
        docked ? { title: 'Put Back', symbol: 'arrow.uturn.backward', action: () => this.goTo(tile) } : null,
        { title: 'Close Tile', symbol: 'xmark', action: () => this.close(tile) },
      ] : [
        { title: 'Go To', symbol: 'arrow.right', action: () => this.#openBy(tile, {}) },
        { title: 'Show Beside', symbol: 'square.split.2x1', action: () => this.#openBy(tile, { command: true }) },
        { title: 'Show Over', symbol: 'rectangle.stack', action: () => this.#openBy(tile, { option: true }) },
      ]),
    ], at);
  }

  #spaceMenu(space, at, brief = false) {
    const colors = Object.keys(spaceColors);
    const symbols = ['folder', 'terminal', 'hammer', 'book', 'doc', 'globe', 'server.rack', 'cpu', 'chart.bar', 'bubble.left.and.bubble.right', 'star', 'bolt', 'music.note', 'sparkle'];
    const set = (patch) => { Object.assign(space, patch); this.render(); };
    this.#menu([
      brief ? null : { title: 'Colour', symbol: 'paintpalette', submenu: [
        ...colors.map((c) => ({ title: c[0].toUpperCase() + c.slice(1), colorDot: spaceColors[c][this.dark ? 'dark' : 'light'], checked: space.color === c, action: () => set({ color: c }) })),
        { separator: true }, { title: 'Automatic', checked: !space.color, action: () => set({ color: null }) }] },
      brief ? null : { title: 'Symbol', symbol: 'star', submenu: [
        { title: `Letter (${space.letter})`, checked: !space.symbol, action: () => set({ symbol: null }) }, { separator: true },
        ...symbols.map((sy) => ({ title: sy.split('.')[0].replace(/^./, (ch) => ch.toUpperCase()), symbol: sy, checked: space.symbol === sy, action: () => set({ symbol: sy }) }))] },
      brief ? null : { separator: true },
      brief ? null : { title: `New Space After “${space.name}”`, symbol: 'plus', action: () => this.commands.newSpace(space) },
      { title: 'Rename Space…', symbol: 'pencil', action: () => this.#renameSpace(space) },
      { separator: true },
      { title: 'Remove Space', symbol: 'xmark', key: this.#key('removeSpace'), action: () => this.removeSpace(space) },
    ], at);
  }

  #renameSpace(space) {
    if (!space) return;
    const name = (this.options.prompt ?? ((m, v) => window.prompt(m, v)))('Name This Space', space.name);
    if (name) this.renameSpace(space, name);
  }

  #kinds() {
    return [...this.types.values()].filter((t) => t.listed !== false && (t.make || t.create));
  }

  #newType() {
    return this.types.get(this.options.newTile) ?? this.#kinds()[0] ?? null;
  }

  #make(kind, where = {}) {
    const d = kind.make?.(this) ?? { type: kind.type, title: kind.name ?? kind.type };
    return this.open({ type: kind.type, ...d }, where);
  }

  /** Another kind…: the kinds of tile there are, to make one of. */
  #kindsMenu(rect) {
    this.#menu(this.#kinds().map((k) => ({ title: `New ${k.name ?? k.type}`, symbol: k.symbol, action: () => this.#make(k) })), { x: rect.left, y: rect.bottom });
  }

  /** The searchable menus at the sidebar's foot: the space's tiles and what
   *  was recently closed; the library. */
  #popmenu(which) {
    if (this.popmenu?.isOpen) {
      const same = this.popmenuWhich === which;
      this.popmenu.close();
      if (same) return;
    }
    if (!this.sidebarShown) this.#showSidebar(true);
    const tilesProvider = (q) => {
      const words = q.toLowerCase().split(/\s+/).filter(Boolean);
      const match = (t) => words.every((w) => `${t.title} ${t.place} ${t.typeDef.name ?? t.type}`.toLowerCase().includes(w));
      const a = this.current?.arrangement;
      const here = a ? A.allTiles(a).map((id) => this.tiles.get(id)).filter((t) => t && match(t)).sort((x, y) => (y === this.focused) - (x === this.focused) || y.seen - x.seen) : [];
      const item = (t, extra = {}) => ({ title: t.title, symbol: t.resolvedSymbol, subtitle: t.place || undefined, action: () => this.goTo(t), ...extra });
      const closed = this.closed.filter((c) => match(c.tile)).slice(0, q ? 20 : 5);
      return [
        { title: q ? 'Search Results' : 'Tiles', items: here.map((t) => item(t, { trailing: a && A.isDocked(a, t.id) ? 'Docked' : undefined })) },
        { title: 'Recently Closed', items: closed.map((c) => item(c.tile, { dimmed: true, trailing: ageOf(c.at), action: () => this.reopen(c.tile) })) },
        q ? null : { divided: true, items: [{ title: 'All Recently Closed', symbol: 'clock.arrow.circlepath', trailing: String(this.closed.length), chevron: true, action: () => { this.pushed = 'closed'; this.#renderSidebar(); } }] },
      ].filter((s) => s && s.items.length);
    };
    const libraryProvider = (q) => {
      const words = q.toLowerCase().split(/\s+/).filter(Boolean);
      const groups = new Map();
      for (const e of this.library) {
        if (!words.every((w) => `${e.title} ${e.subtitle ?? ''} ${e.group ?? ''}`.toLowerCase().includes(w))) continue;
        const g = q ? 'Search Results' : e.group ?? 'Library';
        if (!groups.has(g)) groups.set(g, []);
        const open = this.tileOf(e.id);
        groups.get(g).push({ title: e.title, subtitle: e.subtitle, symbol: e.symbol ?? this.types.get((typeof e.tile === 'function' ? {} : e.tile)?.type)?.symbol ?? 'doc', trailing: open ? 'Open' : undefined, action: () => this.recall(e.id) });
      }
      const out = [...groups].map(([title, items]) => ({ title, items }));
      if (!q) out.push({ divided: true, items: this.#kinds().map((k) => ({ title: `New ${k.name ?? k.type}`, symbol: k.symbol ?? 'plus', dimmed: true, action: () => this.#make(k) })) });
      return out;
    };
    this.popmenuWhich = which;
    this.popmenu = new PopMenu({
      root: this.root, placeholder: 'Search', hint: this.#key(which === 'library' ? 'library' : 'tilesMenu') ?? '',
      empty: which === 'library' ? 'Nothing in the library' : 'No tiles',
      provider: which === 'library' ? libraryProvider : tilesProvider,
      anchors: [this.sidebar.footerButton('left'), this.sidebar.footerButton('right')].filter(Boolean),
      onClose: () => { this.sidebar.setFooterOpen(null); this.#focusView(this.focused); if (!this.pointerInSidebar) this.#scheduleHide(); },
    });
    this.sidebar.setFooterOpen(which === 'library' ? 'left' : 'right');
    const r = this.root.getBoundingClientRect(), f = this.sidebarFrame.getBoundingClientRect();
    this.popmenu.open({ left: Math.max(8, f.left - r.left + 6), bottom: 38 + SIDEBAR.inset + 4, maxHeight: Math.min(560, r.height - 38 - SIDEBAR.inset - 24) });
  }

  // ---------------------------------------------------------------- drags

  #inRoot(r) {
    const o = this.root.getBoundingClientRect();
    return { x: r.left - o.left, y: r.top - o.top, w: r.width, h: r.height };
  }

  /** A tile dragged by its bar moves; ⇧-dragged, or by its icon, it's the thing it stands for. */
  #dragTile(tile, e, thing, { fromRow = false } = {}) {
    if (!tile) return;
    HoverCard.hide();
    const things = [{ title: tile.title, symbol: tile.resolvedSymbol, tile: tile.id, ...(tile.view?.dragThing?.() ?? {}) }];
    if (thing || e.shiftKey) return this.drags.begin({ kind: 'thing', things, source: tile }, e);
    this.grid.setDragging(true);
    this.drags.begin({
      kind: 'tile', things, tile: tile.id, cover: e.altKey, fromRow,
      onEnd: () => { requestAnimationFrame(() => this.grid.setDragging(false)); this.#spring(null); this.#scheduleHide(); },
    }, e);
  }

  /** Begins a drag of things of your own (rows of a list, an outline's
   *  item): [{title, symbol, open?: descriptor, text?, data?}]. Where it
   *  lands decides what's done with it. */
  dragThings(things, e) {
    HoverCard.hide();
    this.drags.begin({ kind: 'thing', things, onEnd: () => { this.#spring(null); this.#scheduleHide(); } }, e);
  }

  #dragTargets() {
    // The grid: a tile moved to a slot (or over a tile); a thing opened where
    // it lands, or linked to the tile it's over — after the tile's own view
    // has had its say.
    let viewUnder = null;
    this.drags.addTarget({
      el: this.stage,
      over: (s, e) => {
        const grid = this.grid;
        const p = grid.pointFrom(e);
        if (e.clientX - this.root.getBoundingClientRect().left < 8) this.#showSidebar(true);
        const a = this.current?.arrangement;
        if (!a || this.overviewShown) return null;
        if (s.kind === 'tile') {
          const slot = grid.dropTarget(p, { dragged: s.tile, cover: s.cover || e.altKey });
          if (!slot) { grid.hideDrop(); return null; }
          grid.showDrop(slot.rect);
          s.slot = slot;
          return { forms: [] };
        }
        const under = grid.tileAt(p);
        const tile = under && this.tiles.get(under);
        viewUnder = null;
        const own = tile?.view?.dropForms?.(s.things, e) ?? [];
        if (own.length) {
          viewUnder = tile;
          grid.showDrop(grid.frame(under));
          return { forms: own };
        }
        const tiles = s.things.every((t) => t.tile);
        const onto = tile && tiles && !s.things.some((t) => t.tile === under) ? tile : null;
        const slot = grid.dropTarget(p, { dragged: null });
        const link = onto ? { id: 'linkTile', title: `Link “${onto.title}” to It`, symbol: 'link', detail: 'an edge from the tile to it' } : null;
        const open = slot ? { id: 'open', title: 'Open as a Tile', symbol: 'plus', detail: 'a tile of its own' } : null;
        const forms = (onto ? [link, open] : [open, link]).filter(Boolean);
        if (!forms.length) { grid.hideDrop(); return null; }
        s.slot = slot;
        s.onto = onto;
        grid.showDrop(forms[0].id === 'linkTile' ? grid.frame(onto.id) : slot.rect);
        return { forms };
      },
      leave: () => this.grid.hideDrop(),
      drop: (s, e, form) => {
        const grid = this.grid, space = this.current;
        grid.hideDrop();
        if (s.kind === 'tile') {
          const slot = s.slot, tile = this.tiles.get(s.tile);
          if (!slot || !tile) return false;
          grid.setDragging(true, true);
          if (tile.space !== space) {
            // Dragged here from another space (one sprung open under the drag).
            this.moveToSpace(tile, space, slot.onto ? { over: this.tiles.get(slot.onto) } : { slot });
          } else if (slot.onto) {
            this.change(space, A.replacing(space.arrangement, slot.onto, tile.id));
          } else if (slot.newColumn || slot.column >= space.arrangement.columns.length) {
            const a = space.arrangement, n = a.columns.length;
            const events = [{ type: 'move', id: tile.id, column: n, at: 0 }];
            const alone = A.locate(a, tile.id) && a.columns[A.locate(a, tile.id).column].length === 1;
            const from = alone ? A.locate(a, tile.id).column : -1;
            const last = alone ? n - 1 : n;
            const to = alone && slot.column > from ? slot.column - 1 : slot.column;
            if (to < last) events.push({ type: 'moveColumn', from: last, to: Math.max(to, 0) });
            this.change(space, events);
          } else {
            this.change(space, [{ type: 'move', id: tile.id, column: slot.column, at: slot.at }]);
          }
          this.#settle(tile);
          return true;
        }
        if (viewUnder && form !== 'open' && form !== 'linkTile') {
          viewUnder.view.dropPut?.(s.things, form, e);
          return true;
        }
        if (form === 'linkTile' && s.onto) {
          for (const t of s.things) if (t.tile) this.link(this.tiles.get(t.tile), s.onto);
          return true;
        }
        if (form === 'open' && s.slot) {
          let slot = s.slot;
          for (const t of s.things) {
            const made = this.#openThing(t, { slot });
            // Several land each under the one before.
            if (made && A.locate(space.arrangement, made.id)) {
              const at = A.locate(space.arrangement, made.id);
              slot = { column: at.column, at: at.index + 1, newColumn: false };
            }
          }
          return true;
        }
        return false;
      },
    });
    // The strip: a tile or a row dropped on a space's square goes there,
    // docked; held there a moment, the square flashes twice and the space
    // opens under the drag, as a folder in the Finder springs open.
    this.drags.addTarget({
      el: this.sidebarFrame,
      over: (s, e) => {
        const id = this.sidebar.squareAt(e.clientX, e.clientY);
        const space = id && id !== this.current?.id ? this.space(id) : null;
        this.#spring(space);
        if (!space) return null;
        return { forms: [{ id: 'send', title: `Send to “${space.name}”`, symbol: s.kind === 'tile' || s.things.every((t) => t.tile) ? 'dock.arrow.down.rectangle' : 'plus' }] };
      },
      leave: () => this.#spring(null),
      drop: (s, e) => {
        const space = this.springing?.space;
        this.#spring(null);
        if (!space) return false;
        let did = false;
        for (const t of s.things) {
          const tile = t.tile && this.tiles.get(t.tile);
          if (tile?.space && tile.space !== space) {
            this.#flyToSquare(tile, space);
            this.moveToSpace(tile, space, { docked: true });
            did = true;
          } else if (!tile) {
            this.selectSpace(space);
            this.#openThing(t, { newColumn: true });
            did = true;
          }
        }
        return did;
      },
    });
  }

  /** A thing opened as a tile of its own where it lands: a tile gone to (or
   *  moved there, from the dock); a closed one brought back; a descriptor
   *  made. What else a thing may be is the application's (`drop`). */
  #openThing(t, where) {
    const tile = t.tile && this.tiles.get(t.tile);
    if (tile?.space === this.current) {
      if (A.isDocked(this.current.arrangement, tile.id) && where.slot && !where.slot.newColumn) {
        this.change(this.current, [{ type: 'move', id: tile.id, column: where.slot.column, at: where.slot.at }]);
      } else {
        this.goTo(tile);
      }
      return tile;
    }
    if (tile && !tile.space) return this.reopen(tile, where);
    if (tile) return this.goTo(tile);
    if (t.library) return this.recall(t.library, where);
    if (t.open) return this.open(typeof t.open === 'function' ? t.open() : t.open, where);
    this.emit('drop', { thing: t, where });
    return null;
  }

  #spring(space) {
    if (this.springing?.space === space) return;
    clearTimeout(this.springing?.timer);
    this.springing = null;
    this.sidebar.setDropSquare(space?.id ?? null);
    if (!space) return;
    const entry = { space };
    entry.timer = setTimeout(async () => {
      await this.sidebar.flashSquare(space.id);
      if (this.springing !== entry || !this.drags.active) return;
      this.springing = null;
      this.sidebar.setDropSquare(null);
      this.selectSpace(space);
      this.grid.setDragging(true);
    }, 500);
    this.springing = entry;
  }

  // -------------------------------------------------------------- flights
  // A tile docked flies into its row in the sidebar, and back out of it,
  // so where it went is seen. (Manifold pours the tile's picture down a
  // funnel in strips, as the Dock's genie does; here the picture is drawn
  // down to the row's end in one piece — the same path and time.)

  #dockTarget(tile) {
    const row = this.sidebarShown ? this.sidebar.rowRect(tile.id) : null;
    if (!row) {
      // The sidebar put away: the window's left edge, level with the tile's middle.
      const f = this.grid.frame(tile.id) ?? { y: 100, h: 40 };
      return { x: 2, y: (f.y ?? 100) + (f.h ?? 40) / 2 - 10, w: 6, h: 20 };
    }
    const r = this.#inRoot(row);
    const w = Math.min(r.w, r.h * 1.4);
    return { x: r.x + r.w - w - 6, y: r.y, w, h: r.h };
  }

  #fly(picture, to, { out = false, row = null, from = null } = {}) {
    const d = GENIE();
    const r = from ?? { x: parseFloat(picture.style.left), y: parseFloat(picture.style.top), w: parseFloat(picture.style.width), h: parseFloat(picture.style.height) };
    picture.classList.add('mf-genie');
    Object.assign(picture.style, { position: 'absolute', left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', height: r.h + 'px', transformOrigin: '0 0', zIndex: 45 });
    const there = `translate(${to.x - r.x}px, ${to.y - r.y}px) scale(${to.w / r.w}, ${to.h / r.h})`;
    const tint = h('div', { style: { position: 'absolute', inset: 0, background: 'var(--mf-accent)', opacity: 0, zIndex: 99, pointerEvents: 'none' } });
    picture.append(tint);
    const frames = out
      ? [{ transform: there, opacity: 0 }, { transform: there, opacity: 1, offset: 0.12 }, { transform: 'none', opacity: 1 }]
      : [{ transform: 'none', opacity: 1 }, { transform: there, opacity: 1, offset: 0.88 }, { transform: there, opacity: 0 }];
    animate(tint, out ? [{ opacity: 0.22 }, { opacity: 0.22, offset: 0.6 }, { opacity: 0 }] : [{ opacity: 0 }, { opacity: 0.16, offset: 0.4 }, { opacity: 0.22 }], { duration: d, fill: 'forwards' });
    if (row) (out ? this.sidebar.dockLeave : this.sidebar.dockArrive)?.call(this.sidebar, row, d);
    return animate(picture, frames, { duration: d, easing: 'cubic-bezier(0.45, 0, 0.3, 1)', fill: 'forwards' }).done.then(() => picture.remove());
  }

  /** A docked tile gone to: back out of its row into its place. */
  #undockFlight(tile, rowRect) {
    const parts = this.grid.parts(tile.id);
    const frame = this.grid.frame(tile.id);
    if (!parts || !frame || Motion.reduced) return;
    const g = this.grid.el.getBoundingClientRect(), o = this.root.getBoundingClientRect();
    const dest = { x: frame.x + g.left - o.left, y: frame.y + g.top - o.top, w: frame.w, h: frame.h };
    const r = this.#inRoot(rowRect);
    const w = Math.min(r.w, r.h * 1.4);
    const from = { x: r.x + r.w - w - 6, y: r.y, w, h: r.h };
    parts.card.getAnimations().forEach((a) => a.finish());
    const picture = Ghost.picture(parts.card, this.root, dest, 45);
    // The real tile out of sight meanwhile, there when it lands.
    parts.card.style.visibility = 'hidden';
    this.grid.ring.style.visibility = 'hidden';
    this.#fly(picture, from, { out: true, from: dest }).then(() => {
      parts.card.style.visibility = '';
      this.grid.ring.style.visibility = '';
    });
  }

  #flyToSquare(tile, space) {
    const card = tile.space === this.current ? this.grid.parts(tile.id)?.card : null;
    const sq = this.sidebar.squareRect(space.id);
    if (!card || !sq || Motion.reduced || card.hidden) return;
    this.departures.set(tile.id, 'flown');
    this.#fly(Ghost.picture(card, this.root, this.#inRoot(card.getBoundingClientRect()), 45), this.#inRoot(sq));
  }

  // ----------------------------------------------- walking, and switching

  /** ⌃⇥: the space's tiles, docked ones too, the latest settled on first.
   *  Let go quickly and it goes to the one before, so a tap goes back and
   *  forth between two; held, each ⇥ moves the focus ring to the next, a
   *  docked one shown in its column where it would come back; letting go
   *  settles there (Escape leaves things be). */
  #walkStep(by, e) {
    const s = this.current;
    if (!s) return;
    if (!this.walk) {
      const a = s.arrangement;
      const all = A.gridTiles(a).concat(a.docked.filter((d) => !d.under).map((d) => d.id).reverse());
      const places = [...new Set([a.focused, ...s.settled, ...all].filter((id) => id && A.hasTile(a, id)))].slice(0, 24);
      if (places.length < 2) return;
      const start = places[0] === a.focused ? 0 : -1;
      this.walk = { space: s, places, index: start, key: e?.ctrlKey ? 'Control' : e?.altKey ? 'Alt' : null };
      if (!this.walk.key) {
        // From a menu, nothing held: one step, gone to at once.
        this.walk.index = (start + by + places.length) % places.length;
        return this.#endWalk(true);
      }
    }
    const n = this.walk.places.length;
    this.walk.index = (((this.walk.index + by) % n) + n) % n;
    this.render();
  }

  #endWalk(settle) {
    const w = this.walk;
    if (!w) return;
    this.walk = null;
    const tile = this.tiles.get(w.places[w.index]);
    if (settle && tile && w.space === this.current) {
      const was = w.space.arrangement.focused;
      this.goTo(tile);
      if (was === tile.id) this.render();
    } else {
      this.render();
    }
  }

  /** ⌘`: the spaces, the most recently settled on first — a tap goes back
   *  to the space before; held a moment, the spaces come as cards. */
  #switchStep(by, e) {
    if (this.spaces.length < 2) return;
    if (!this.switching) {
      const order = [...new Set([this.current?.id, ...this.spaceTrail, ...this.spaces.map((s) => s.id)])].map((id) => this.space(id)).filter(Boolean);
      this.switching = { order, index: 0, key: e?.metaKey ? 'Meta' : e?.altKey ? 'Alt' : e?.ctrlKey ? 'Control' : null };
      if (!this.switching.key) return this.selectSpace(order[((by % order.length) + order.length) % order.length]);
      this.switching.timer = setTimeout(() => {
        const sw = this.switching;
        if (sw) this.switcher.show(sw.order.map((s) => this.#spaceCard(s)), sw.index, { onPick: (i) => { sw.index = i; this.#endSwitch(true); } });
      }, 200);
    }
    const n = this.switching.order.length;
    this.switching.index = (((this.switching.index + by) % n) + n) % n;
    if (this.switcher.isShown) this.switcher.choose(this.switching.index);
  }

  #endSwitch(go) {
    const sw = this.switching;
    if (!sw) return;
    this.switching = null;
    clearTimeout(sw.timer);
    this.switcher.hide();
    if (go) this.selectSpace(sw.order[sw.index]);
  }

  // ------------------------------------------------------------- overview

  #overviewTiles() {
    const a = this.current?.arrangement;
    if (!a) return [];
    return A.allTiles(a).map((id) => this.tiles.get(id)).filter(Boolean).map((t) => ({ id: t.id, shown: this.#spec(t).shown, content: this.#view(t).element, summary: t.summarize() }));
  }

  /** Overview: every tile in the space at once; ⎋ comes back. */
  toggleOverview() {
    if (this.overviewShown) return this.#closeOverview(true);
    const s = this.current;
    if (!s) return;
    this.#endWalk(false);
    const from = {};
    for (const id of Object.keys(this.grid.frames())) {
      const card = this.grid.parts(id)?.card;
      if (card && !card.hidden) from[id] = card.getBoundingClientRect();
    }
    const tiles = this.#overviewTiles();
    this.slides[this.shownGrid].hidden = true;
    this.overviewShown = true;
    this.overview.open({
      title: s.name, tiles, from, mode: this.overviewMode ?? null,
      onOpen: (id, mods) => { this.#closeOverview(false); this.#openBy(this.tiles.get(id), mods); },
      onClose: () => this.#closeOverview(true),
      onMode: (mode) => { this.overviewMode = mode; },
    });
  }

  #closeOverview(animated) {
    if (!this.overviewShown) return;
    this.overviewShown = false;
    // The tiles' content goes back into the grid as it's shown again; the
    // cards go back to where their tiles are.
    this.slides[this.shownGrid].hidden = false;
    this.#renderGrid();
    const to = {};
    if (animated) {
      for (const id of Object.keys(this.grid.frames())) {
        const card = this.grid.parts(id)?.card;
        if (card && !card.hidden) to[id] = card.getBoundingClientRect();
      }
    }
    const done = this.overview.close({ to, restore: () => {} });
    if (animated && !Motion.reduced) Ghost.fadeIn(this.slides[this.shownGrid], Motion.morph);
    this.#focusView(this.focused);
    return done;
  }

  // ----------------------------------------------------- keys and commands

  #commands() {
    const c = {
      grow: () => this.grow(),
      fillColumn: () => this.fill(this.focused, false),
      fillColumnKeepingBars: () => this.fill(this.focused, true),
      dock: () => this.dock(),
      shrinkToSummary: () => this.toggleSummary(),
      maximize: () => this.toggleMaximize(),
      closeTile: () => this.close(),
      deleteTile: () => this.delete(),
      reopen: () => this.reopen(),
      toggleOutline: () => { this.focused?.view?.toggleSidebar?.(); this.render(); },
      findInOutline: (tile = this.focused) => {
        const v = tile?.view;
        if (!v?.toggleSidebar) return;
        if (!v.sidebarShown) v.toggleSidebar();
        this.render();
        v.focusFilter?.();
      },
      nextInInbox: () => {
        const inbox = this.inbox();
        if (!inbox.length) return;
        const i = inbox.indexOf(this.focused);
        this.goTo(inbox[(i + 1) % inbox.length]);
      },
      focusUp: () => this.focusToward('up'), focusDown: () => this.focusToward('down'), focusLeft: () => this.focusToward('left'), focusRight: () => this.focusToward('right'),
      focusNext: () => this.focusStep(1), focusPrevious: () => this.focusStep(-1),
      moveUp: () => this.nudge('up'), moveDown: () => this.nudge('down'), moveLeft: () => this.nudge('left'), moveRight: () => this.nudge('right'),
      walk: (e) => this.#walkStep(1, e), walkBack: (e) => this.#walkStep(-1, e),
      switchSpace: (e) => this.#switchStep(1, e), switchSpaceBack: (e) => this.#switchStep(-1, e),
      nextSpace: () => this.#stepSpace(1), previousSpace: () => this.#stepSpace(-1),
      newSpace: (after = this.current) => {
        const space = this.addSpace({ name: `Space ${this.spaces.length + 1}` }, { after: after instanceof Space ? after : this.current });
        const kind = this.#newType();
        if (kind) this.#make(kind, { space });
        return space;
      },
      newTile: () => { const k = this.#newType(); return k && this.#make(k, this.focused ? { beside: this.focused } : {}); },
      newTileInColumn: () => { const k = this.#newType(); return k && this.#make(k, { newColumn: true }); },
      removeSpace: () => this.removeSpace(),
      undo: () => this.undo(), redo: () => this.redo(),
      toggleSidebar: () => this.setSidebarPinned(!this.sidebarPinned),
      overview: () => this.toggleOverview(),
      tilesMenu: () => this.#popmenu('tiles'),
      library: () => this.#popmenu('library'),
    };
    for (let n = 1; n <= 9; n++) c[`space${n}`] = () => this.selectSpace(n === 9 ? this.spaces[this.spaces.length - 1] : this.spaces[n - 1]);
    return c;
  }

  /** Runs `fn` with nothing moving: for setting a window up before it's seen. */
  quietly(fn) {
    const was = Motion.forceReduced;
    Motion.forceReduced = true;
    try {
      return fn();
    } finally {
      Motion.forceReduced = was;
    }
  }

  /** Runs a command by name. */
  run(command, ...args) {
    return this.commands[command]?.(...args);
  }

  #scheduleHide() {
    clearTimeout(this.hideTimer);
    if (this.sidebarPinned || !this.sidebarShown) return;
    this.hideTimer = setTimeout(() => this.#hideSidebar(), SIDEBAR.hideDelay);
  }

  #listen() {
    const doc = this.root.ownerDocument;
    this.onKeyDown = (e) => {
      if (!this.root.isConnected) return;
      if (e.key === 'Escape') {
        if (this.walk) { e.preventDefault(); e.stopPropagation(); return this.#endWalk(false); }
        if (this.switching) { e.preventDefault(); e.stopPropagation(); return this.#endSwitch(false); }
      }
      // ⌘ held alone a moment shows the spaces' numbers.
      if (e.key === (isMac ? 'Meta' : 'Control')) {
        clearTimeout(this.numbersTimer);
        this.numbersTimer = setTimeout(() => this.sidebar.showNumbers(true), 250);
        return;
      }
      clearTimeout(this.numbersTimer);
      this.sidebar.showNumbers(false);
      const key = keyOf(e);
      const command = key && this.keymap.get(key);
      if (!command || !this.commands[command]) return;
      // An editor undoes its own text: the space's takes ⌘Z when no field does.
      if ((command === 'undo' || command === 'redo') && e.target.closest?.('input, textarea, [contenteditable=""], [contenteditable="true"]')) return;
      e.preventDefault();
      e.stopPropagation();
      this.commands[command](e);
    };
    this.onKeyUp = (e) => {
      clearTimeout(this.numbersTimer);
      this.sidebar.showNumbers(false);
      if (this.walk && e.key === this.walk.key) this.#endWalk(true);
      if (this.switching && e.key === this.switching.key) this.#endSwitch(true);
    };
    this.onBlur = () => { this.#endWalk(true); this.#endSwitch(true); clearTimeout(this.numbersTimer); this.sidebar.showNumbers(false); };
    this.onFocus = () => { this.#attend(); this.#renderSidebar(); };
    doc.addEventListener('keydown', this.onKeyDown, true);
    doc.addEventListener('keyup', this.onKeyUp, true);
    window.addEventListener('blur', this.onBlur);
    window.addEventListener('focus', this.onFocus);

    // The sidebar sliding out over the content when the pointer goes to the
    // window's left edge, and away again when it's gone past it.
    this.root.addEventListener('pointermove', (e) => {
      if (this.sidebarPinned) return;
      const o = this.root.getBoundingClientRect();
      const x = e.clientX - o.left;
      const f = this.sidebarFrame.getBoundingClientRect();
      this.pointerInSidebar = this.sidebarShown && e.clientX <= f.right + SIDEBAR.slack && e.clientX >= f.left - SIDEBAR.slack;
      if (x <= 6) this.#showSidebar(true);
      else if (this.sidebarShown && e.clientX > f.right + SIDEBAR.slack) this.#scheduleHide();
      else if (this.pointerInSidebar) clearTimeout(this.hideTimer);
    });
    this.root.addEventListener('pointerleave', (e) => {
      if (this.sidebarPinned) return;
      this.pointerInSidebar = false;
      const o = this.root.getBoundingClientRect();
      if (e.clientX <= o.left + 1) this.#showSidebar(true);
      else this.#scheduleHide();
    });

    // Its right edge dragged resizes it.
    this.resizeHandle.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      try { this.resizeHandle.setPointerCapture(e.pointerId); } catch { /* a pointer that can't be held */ }
      this.resizing = true;
      this.resizeHandle.classList.add('mf-dragging');
      const move = (ev) => {
        const left = this.sidebarFrame.getBoundingClientRect().left;
        this.sidebarWidth = Math.min(Math.max(Math.round(ev.clientX - left), SIDEBAR.min), SIDEBAR.max);
        this.#frame();
      };
      const up = () => {
        this.resizing = false;
        this.resizeHandle.classList.remove('mf-dragging');
        this.resizeHandle.removeEventListener('pointermove', move);
        this.resizeHandle.removeEventListener('pointerup', up);
        this.resizeHandle.removeEventListener('pointercancel', up);
        this.emit('sidebar', { width: this.sidebarWidth });
      };
      this.resizeHandle.addEventListener('pointermove', move);
      this.resizeHandle.addEventListener('pointerup', up);
      this.resizeHandle.addEventListener('pointercancel', up);
    });
  }

  // ------------------------------------------------------------ the state

  /** Everything as data: the spaces, their arrangements, their tiles as
   *  described (each view asked to `serialize`), the links, the look. */
  serialize() {
    return {
      version: 1,
      current: this.current?.id ?? null,
      spaces: this.spaces.map((s) => ({ id: s.id, name: s.name, color: s.color, symbol: s.symbol, host: s.host, pins: s.pins, arrangement: A.cloneArrangement(s.arrangement) })),
      tiles: [...this.tiles.values()].filter((t) => t.space).map((t) => ({ ...t.describe(), space: t.space.id })),
      links: this.links,
      sidebar: { width: this.sidebarWidth, pinned: this.sidebarPinned },
      look: { theme: typeof this.options.theme === 'string' ? this.options.theme : undefined, appearance: this.options.appearance, tint: this.options.tint },
    };
  }

  /** Puts back what `serialize` gave (the tile types registered first). */
  restore(state) {
    for (const t of this.tiles.values()) { t.space = null; t.view?.destroy?.(); }
    this.tiles.clear();
    this.grids.forEach((g) => g.clear());
    this.spaces = state.spaces.map((d) => new Space({ ...d, arrangement: A.cloneArrangement(d.arrangement) }));
    for (const d of state.tiles) {
      if (!this.types.has(d.type)) continue;
      const t = new Tile(this, d);
      t.space = this.space(d.space);
      if (t.space) this.tiles.set(t.id, t);
    }
    for (const s of this.spaces) {
      const here = (id) => this.tiles.get(id)?.space === s;
      s.arrangement.columns = s.arrangement.columns.map((c) => c.filter(here));
      s.arrangement.docked = s.arrangement.docked.filter((d) => here(d.id));
      A.normalize(s.arrangement);
    }
    this.links = (state.links ?? []).filter((l) => this.tiles.has(l.from) && this.tiles.has(l.to));
    if (state.sidebar) { this.sidebarWidth = state.sidebar.width ?? this.sidebarWidth; this.sidebarPinned = state.sidebar.pinned ?? true; this.sidebarShown = this.sidebarPinned; this.#frame(); }
    if (state.look) Object.assign(this.options, Object.fromEntries(Object.entries(state.look).filter(([, v]) => v != null)));
    this.current = null;
    this.#theme();
    const first = this.space(state.current) ?? this.spaces[0];
    if (first) this.selectSpace(first, { animated: false });
    else this.render();
  }

  destroy() {
    const doc = this.root.ownerDocument;
    doc.removeEventListener('keydown', this.onKeyDown, true);
    doc.removeEventListener('keyup', this.onKeyUp, true);
    window.removeEventListener('blur', this.onBlur);
    window.removeEventListener('focus', this.onFocus);
    clearInterval(this.minute);
    this.drags.cancel();
    for (const c of this.closed) clearTimeout(c.timer);
    for (const t of this.tiles.values()) t.view?.destroy?.();
    this.grids.forEach((g) => g.destroy());
    this.sidebar.destroy?.();
    this.backdrop?.destroy();
    HoverCard.hide();
    this.root.remove();
  }

  /** Takes a tile's column off the space (a maximized tile's menu). */
  closeColumn(tile) {
    const s = tile.space, a = s.arrangement;
    const at = A.locate(a, tile.id);
    if (!at) return;
    const column = a.columns[at.column].slice();
    for (const id of column) { this.departures.set(id, 'closed'); this.#shelve(this.tiles.get(id), s); }
    this.change(s, [...(a.full ? [{ type: 'full', id: null }] : []), ...column.map((id) => ({ type: 'remove', id }))]);
  }
}

export { pressOrDrag };
