// A space's grid: columns of tiles, every tile a card with a bar across its
// top and its content beneath, all of them visible, with room between cards
// and the window's wash showing through (Manifold's GridView). The grid
// lays out what it's shown — columns, widths, heights, the focused tile,
// one maximized — and says what's done to it: a bar clicked or dragged, a
// line between tiles dragged, something dropped.
//
// A tile shrinks in steps, one ladder — its content, its summary card, its
// bar alone — as a presentation of the room it has, not a state of its own.
//
// Things move where moving says something: a tile placed grows in where it
// lands as the edges of the others slide aside for it; one closed goes in a
// puff; one moved goes over the rest from where it was to where it's put;
// what any tile shows is held still as its edges pass, never stretched.

import { h, Motion, animate, setRect, rectContains, rectInset, rectsEqual } from '../core/util.js';
import { TileBar, BAR_HEIGHT } from './tilebar.js';
import { SummaryCard } from './summarycard.js';
import * as Ghost from './ghost.js';

export const GridMetrics = {
  barHeight: BAR_HEIGHT,
  gap: 6,
  inset: 8,
  /** Under this much of its content showing, a tile's summary card stands in for it… */
  summarizeBelow: 80,
  /** …and under this, it's down to its bar alone. */
  collapseBelow: 24,
  /** How far a tile goes before it's taken over the rest on its way. */
  travelsOver: 40,
  minColumnWidth: 120,
  minTileHeight: 24,
};
const M = GridMetrics;

const cardOf = (r, collapsed) => (collapsed ? { x: r.x, y: r.y, w: r.w, h: M.barHeight } : r);

export class Grid {
  /**
   * @param {object} host  what the grid asks and tells (each optional):
   *   focus(id) grow(id) fill(id) squeeze(id) toggleFull(id) closeClicked(id)
   *   menu(id, point) pathMenu(id, point) arrive(id) placeClick(id)
   *   resizedFractions(fractions) resizedHeights(heights)
   *   dragStart(id, event, thing)
   *   departure(id) → 'closed' | 'flown' | 'moved'
   *   summary(id) → SummaryCard content
   *   linkSummary(id, link) openLink(id, link, mods) linkMenu(id, link, point) linkDrag(id, link, event, thing)
   *   toggleSidebar(id) viewButton(id, i)
   */
  constructor(host = {}) {
    this.host = host;
    this.tilesEl = h('div.mf-grid-tiles');
    this.linesEl = h('div.mf-grid-lines');
    this.ring = h('div.mf-focus-ring', { hidden: true });
    this.dropOverlay = h('div.mf-drop-overlay', { hidden: true });
    this.overlay = h('div.mf-grid-overlay');
    this.el = h('div.mf-grid', this.tilesEl, this.linesEl, this.ring, this.dropOverlay, this.overlay);
    this.tiles = new Map(); // id → {id, card, bar, body, summary, spec}
    this.columns = [];
    this.fractions = [];
    this.heights = {};
    this.focused = null;
    this.full = null;
    this.columnLines = [];
    this.rowLines = [];
    this.lastFrames = {};
    this.lastBounds = null;
    this.collapsed = new Set();
    this.summarized = new Set();
    this.placed = new Set();
    this.ringFor = null;
    this.zooming = null;
    this.dragging = false;
    this.dropped = false;
    this.dividerDragging = false;
    this.evening = null;
    this.raised = [];
    this.resize = new ResizeObserver(() => this.layout());
    this.resize.observe(this.el);
  }

  // --------------------------------------------------------------- showing

  /**
   * Shows a space: `state` = {columns: [[id]], fractions, heights, focused,
   * full}; `spec(id)` gives each tile: {shown, content, sidebar?,
   * viewButtons?}. Tiles gone since the last show leave as their departure
   * says; new ones come in where they land.
   */
  show(state, spec) {
    const incoming = new Set(state.columns.flat());
    // Maximized or restored: where the tile was, to grow or shrink from.
    let zoomFrom = null;
    const shownNow = this.el.isConnected && this.el.offsetParent !== null;
    if (state.full !== this.full && shownNow) {
      const id = state.full ?? this.full;
      const t = this.tiles.get(id);
      if (t && incoming.has(id) && !t.card.hidden) zoomFrom = { id, from: this.#shows(t.card) };
    }
    this.zooming = zoomFrom?.id ?? null;
    for (const [id, t] of [...this.tiles]) {
      if (incoming.has(id)) continue;
      if (shownNow && !t.card.hidden) {
        const how = this.host.departure?.(id) ?? 'moved';
        if (how === 'closed') this.#poof(t);
        else if (how === 'moved') this.#fadeAway(t);
      }
      this.#discard(t);
    }
    this.columns = state.columns.map((c) => c.slice());
    this.fractions = state.fractions.length === this.columns.length ? state.fractions.slice() : this.columns.map(() => 1 / Math.max(this.columns.length, 1));
    this.heights = { ...state.heights };
    this.focused = state.focused;
    this.full = state.full ?? null;
    for (const id of incoming) {
      const s = spec(id);
      let t = this.tiles.get(id);
      if (!t) t = this.#make(id);
      t.spec = s;
      if (s.content && s.content.parentNode !== t.body) t.body.replaceChildren(s.content);
      t.bar.sidebar = s.sidebar ?? null;
      t.bar.setViewButtons(s.viewButtons ?? []);
      t.bar.show(s.shown, { focused: id === this.focused, maximized: id === this.full });
      t.card.classList.toggle('mf-focused', id === this.focused);
      // Its summary standing in for it, said afresh with each show.
      if (t.summary && this.summarized.has(id)) {
        const c = this.#summaryContent(t);
        if (c) t.summary.content = c;
      }
    }
    this.#lines();
    this.layout();
    if (zoomFrom) this.#zoom(zoomFrom.id, zoomFrom.from);
  }

  clear() {
    this.show({ columns: [], fractions: [], heights: {}, focused: null, full: null }, () => null);
  }

  #make(id) {
    const grid = this;
    const host = this.host;
    const bar = new TileBar({
      get overlay() { return grid.overlay; },
      // The bar clicked grows the tile a step (acme's colgrow), focused —
      // clicked again, a step more; ⌘-clicked, it fills its column, the
      // others docked; ⌥-clicked, all its column but the others' bars.
      onClick: (p, mods) => {
        host.focus?.(id);
        if (mods.command) return host.fill?.(id);
        if (mods.option) return host.squeeze?.(id);
        host.grow?.(id);
      },
      onPlaceClick: () => { host.focus?.(id); host.placeClick?.(id); },
      onIconClick: (mods, at) => { host.focus?.(id); host.menu?.(id, at); },
      onRightClick: (at) => { host.focus?.(id); host.menu?.(id, at); },
      onPathClick: (at) => { host.focus?.(id); host.pathMenu?.(id, at); },
      onDragStart: (e, thing) => host.dragStart?.(id, e, thing),
      onClose: () => host.closeClicked?.(id),
      onToggleFull: () => host.toggleFull?.(id),
      onToggleSidebar: () => host.toggleSidebar?.(id),
      onViewButton: (i) => host.viewButton?.(id, i),
      linkSummary: (l) => host.linkSummary?.(id, l),
      onOpenLink: (l, mods) => host.openLink?.(id, l, mods),
      onLinkMenu: (l, at) => host.linkMenu?.(id, l, at),
      onLinkDrag: (l, e, thing) => host.linkDrag?.(id, l, e, thing),
    });
    const body = h('div.mf-tile-body');
    const card = h('div.mf-tile', { dataset: { tile: id } }, bar.el, body);
    // A press in a tile's content takes the focus there.
    body.addEventListener('pointerdown', () => { if (this.focused !== id) host.focus?.(id); }, true);
    body.addEventListener('focusin', () => { if (this.focused !== id) host.focus?.(id); });
    const t = { id, card, bar, body, summary: null, spec: null };
    this.tiles.set(id, t);
    this.tilesEl.append(card);
    return t;
  }

  #discard(t) {
    this.tiles.delete(t.id);
    t.bar.destroy();
    t.card.remove();
    delete this.lastFrames[t.id];
    this.collapsed.delete(t.id);
    this.summarized.delete(t.id);
  }

  #summaryContent(t) {
    return this.host.summary?.(t.id) ?? { symbol: t.spec.shown.symbol, title: t.spec.shown.title, lines: t.spec.shown.summary?.lines ?? [], note: t.spec.shown.summary?.note };
  }

  /** A tile's elements, for what flies them about: {card, bar, body}. */
  parts(id) {
    const t = this.tiles.get(id);
    return t ? { card: t.card, bar: t.bar.el, body: t.body } : null;
  }

  bar(id) {
    return this.tiles.get(id)?.bar ?? null;
  }

  /** Where a tile's card is laid out (where it's going, if it glides), in the grid's terms. */
  frame(id) {
    return this.lastFrames[id] ?? null;
  }

  /** Every laid-out tile's card, by id. */
  frames() {
    return { ...this.lastFrames };
  }

  // ---------------------------------------------------------------- layout

  #pushedOut(id) {
    return this.heights[id] === 0;
  }

  #shownTiles(c) {
    return this.columns[c].filter((id) => !this.#pushedOut(id));
  }

  get bounds() {
    return { w: this.el.clientWidth, h: this.el.clientHeight };
  }

  columnFrames() {
    const n = this.columns.length;
    if (!n) return [];
    const { w: W, h: H } = this.bounds;
    const usable = W - 2 * M.inset - (n - 1) * M.gap;
    let x = M.inset;
    return this.fractions.map((f, i) => {
      const w = i === n - 1 ? W - M.inset - x : Math.round(usable * f);
      const r = { x, y: M.inset, w, h: H - 2 * M.inset };
      x += w + M.gap;
      return r;
    });
  }

  /** Each shown tile's frame in a column, bar included, top to bottom; no
   *  tile shorter than its bar. */
  #tileFramesShown(c, f) {
    const tiles = this.#shownTiles(c);
    if (!tiles.length) return [];
    let shares = tiles.map((id) => this.heights[id] ?? 1 / tiles.length);
    const total = shares.reduce((s, x) => s + x, 0);
    if (total > 0) shares = shares.map((s) => s / total);
    const usable = f.h - (tiles.length - 1) * M.gap;
    const hs = shares.map((s) => Math.max(M.barHeight, Math.round(usable * s)));
    // Over by the minimums: taken from the tallest.
    let over = hs.reduce((s, x) => s + x, 0) - usable;
    while (over > 0) {
      let i = 0;
      for (let j = 1; j < hs.length; j++) if (hs[j] > hs[i]) i = j;
      if (!(hs[i] > M.barHeight)) break;
      const take = Math.min(over, hs[i] - M.barHeight);
      hs[i] -= take;
      over -= take;
    }
    let y = f.y;
    return hs.map((hh, i) => {
      const height = i === tiles.length - 1 ? f.y + f.h - y : hh;
      const r = { x: f.x, y, w: f.w, h: height };
      y += height + M.gap;
      return r;
    });
  }

  /** As above for every tile of the column; one pushed out's is null. */
  tileFrames(c, f) {
    const shown = this.#tileFramesShown(c, f);
    let next = 0;
    return this.columns[c].map((id) => (this.#pushedOut(id) ? null : shown[next++] ?? null));
  }

  /** Where an element shows this moment (part way, if it's gliding), in the grid's terms. */
  #shows(el) {
    const r = el.getBoundingClientRect(), o = this.el.getBoundingClientRect();
    return { x: r.left - o.left, y: r.top - o.top, w: r.width, h: r.height };
  }

  layout() {
    const { w: W, h: H } = this.bounds;
    if (!W || !H) return;
    const sameBounds = this.lastBounds && this.lastBounds.w === W && this.lastBounds.h === H;
    // Tiles glide to new places when the grid itself didn't change size (a
    // tile placed, closed, grown, moved or docked); a resize or a divider
    // dragged lays out at once.
    const gliding = !!sameBounds && (!this.dragging || this.dropped) && !this.dividerDragging && !Motion.reduced && this.el.offsetParent !== null;
    this.lastBounds = { w: W, h: H };
    const fullTile = this.full ? this.tiles.get(this.full) : null;
    if (fullTile) {
      // One tile over everything; the rest wait behind it — once it's grown over them.
      if (this.zooming !== this.full) {
        for (const t of this.tiles.values()) if (t !== fullTile) t.card.hidden = true;
        this.linesEl.hidden = true;
      }
      fullTile.card.hidden = false;
      const r = { x: M.inset, y: M.inset, w: W - 2 * M.inset, h: H - 2 * M.inset };
      this.#setCard(fullTile, r, false, false);
      this.ring.hidden = true;
      this.el.classList.add('mf-has-full');
      this.lastFrames = { ...this.lastFrames, [this.full]: r };
      return;
    }
    this.el.classList.remove('mf-has-full');
    this.linesEl.hidden = false;
    const frames = this.columnFrames();
    const frameNow = {};
    const collapsedNow = new Set(), summarizedNow = new Set();
    let traveller = null;
    let rowIndex = 0;
    frames.forEach((f, c) => {
      const tiles = this.tileFrames(c, f);
      let shownIndex = 0;
      this.columns[c].forEach((id, i) => {
        const t = this.tiles.get(id);
        if (!t) return;
        const r = tiles[i];
        if (!r) {
          t.card.hidden = true;
          return;
        }
        t.card.hidden = false;
        const bodyHeight = r.h - M.barHeight;
        // Too little of its content under the bar to be worth showing: its
        // summary card in its place; less than a line of that, the tile is
        // collapsed to its bar.
        const collapsed = bodyHeight < M.collapseBelow;
        const summarized = !collapsed && bodyHeight < M.summarizeBelow;
        if (collapsed) collapsedNow.add(id);
        if (summarized) summarizedNow.add(id);
        const card = cardOf(r, collapsed);
        frameNow[id] = card;
        const was = this.lastFrames[id];
        // Gone to or from its summary card: the one crosses over to the other.
        if (!collapsed && was && summarized !== this.summarized.has(id) && !this.collapsed.has(id)) this.#crossFade(t, summarized);
        if (gliding && was && !rectsEqual(was, card)) {
          const shows = this.#shows(t.card);
          const distance = Math.hypot(card.x + card.w / 2 - (shows.x + shows.w / 2), card.y - shows.y);
          if (distance > M.travelsOver && traveller?.id !== this.focused && (id === this.focused || distance > (traveller?.distance ?? 0))) {
            traveller = { id, distance };
          }
          this.#setCard(t, card, collapsed, summarized);
          this.#slide(t.card, shows, card);
        } else {
          this.#setCard(t, card, collapsed, summarized);
        }
        if (shownIndex > 0 && rowIndex < this.rowLines.length) {
          setRect(this.rowLines[rowIndex].el, { x: r.x, y: r.y - M.gap, w: r.w, h: M.gap });
          rowIndex += 1;
        }
        shownIndex += 1;
      });
    });
    // Tiles placed since the last layout come in where they land.
    const cameIn = new Set();
    if (gliding && Object.keys(this.lastFrames).length) {
      for (const id of Object.keys(frameNow)) {
        if (!this.lastFrames[id] && !this.placed.has(id)) {
          this.#comeIn([this.tiles.get(id).card]);
          cameIn.add(id);
        }
      }
    }
    this.placed = new Set(this.tiles.keys());
    if (traveller) this.#raise(traveller.id);
    const wasFrames = this.lastFrames;
    this.lastFrames = frameNow;
    this.collapsed = collapsedNow;
    this.summarized = summarizedNow;
    // The focus ring: around the focused tile, over everything.
    const card = this.focused && this.zooming == null ? frameNow[this.focused] : null;
    if (card) {
      const shows = this.ring.hidden ? null : this.#shows(this.ring);
      this.ring.hidden = false;
      const at = this.ringAt;
      if (!rectsEqual(at, card)) {
        setRect(this.ring, card);
        this.ringAt = card;
        // With its tile as it glides; to another (the one left focused by a
        // tile closed), from where that one was.
        if (gliding && this.ringFor === this.focused && shows) this.#slide(this.ring, shows, card);
        else if (gliding && this.ringFor != null && wasFrames[this.focused]) this.#slide(this.ring, wasFrames[this.focused], card);
      }
      this.ringFor = this.focused;
      if (cameIn.has(this.focused)) this.#comeIn([this.ring]);
    } else {
      this.ring.hidden = true;
      this.ringFor = null;
      this.ringAt = null;
    }
    this.columnLines.forEach((line, i) => {
      if (frames[i]) setRect(line.el, { x: frames[i].x + frames[i].w, y: 0, w: M.gap, h: H });
    });
  }

  /** A tile's card set where it goes: its bar laid out for its width, its
   *  content sized once, where it ends. */
  #setCard(t, card, collapsed, summarized) {
    setRect(t.card, card);
    t.bar.collapsed = collapsed;
    t.bar.layout(card.w);
    const bh = Math.max(0, card.h - M.barHeight);
    t.body.style.width = card.w + 'px';
    t.body.style.height = bh + 'px';
    t.body.hidden = collapsed || summarized;
    t.card.classList.toggle('mf-collapsed', collapsed);
    if (summarized) {
      const content = this.#summaryContent(t);
      if (!t.summary) {
        t.summary = new SummaryCard(content, { inTile: true, onClick: () => this.host.arrive?.(t.id) });
        t.card.append(t.summary.el);
      } else {
        t.summary.content = content;
      }
      t.summary.el.hidden = false;
      t.summary.el.style.height = bh + 'px';
    } else if (t.summary) {
      t.summary.el.hidden = true;
    }
  }

  // ------------------------------------------------------ coming and going

  /** An element's edges gliding from where it shows to where it's set: what
   *  it shows held at its top left, cut off or uncovered as they pass. */
  #slide(el, from, to, duration = Motion.spatial) {
    el.getAnimations().filter((a) => a.id === 'mf-slide').forEach((a) => a.cancel());
    const a = animate(el, [
      { left: from.x + 'px', top: from.y + 'px', width: from.w + 'px', height: from.h + 'px' },
      { left: to.x + 'px', top: to.y + 'px', width: to.w + 'px', height: to.h + 'px' },
    ], { duration, easing: Motion.travel });
    a.id = 'mf-slide';
    return a;
  }

  /** A tile placed comes in where it lands — growing from smaller, seen at
   *  once — as its neighbours' edges slide aside for it. */
  #comeIn(parts) {
    Ghost.burst(parts, { scale: Motion.reduced ? 1 : 0.86, over: Motion.spatial, fade: Motion.spatial * 0.4, fading: Motion.appear, moving: Motion.travel, coming: true });
  }

  /** A tile moved goes over the rest on its way, as a card picked up and
   *  put down — its ring with it — and back among them there. */
  #raise(id, lift = 10, duration = Motion.spatial) {
    this.#lower();
    const t = this.tiles.get(id);
    if (!t) return;
    const els = [t.card];
    if (this.focused === id) els.push(this.ring);
    for (const el of els) {
      this.raised.push({ el, z: el.style.zIndex });
      el.style.zIndex = String((parseInt(getComputedStyle(el).zIndex, 10) || 0) + lift);
    }
    const n = (this.raisedFor = (this.raisedFor ?? 0) + 1);
    setTimeout(() => { if (this.raisedFor === n) this.#lower(); }, duration);
  }

  #lower() {
    for (const r of this.raised) r.el.style.zIndex = r.z;
    this.raised = [];
  }

  /** What a tile showed (its content, or its summary card) over what it
   *  shows now, fading. */
  #crossFade(t, toSummary) {
    const leaving = toSummary ? t.body : t.summary?.el;
    if (!leaving || leaving.hidden || this.zooming || !this.el.isConnected) return;
    const r = this.#shows(leaving);
    if (r.w <= 20 || r.h <= 1) return;
    const g = Ghost.picture(leaving, this.overlay, r, 15);
    g.style.borderRadius = '0 0 10px 10px';
    g.style.overflow = 'hidden';
    Ghost.fadeOut(g, Motion.spatial, { easing: Motion.disappear });
  }

  /** A tile closed: gone in a puff — its picture swelling a little as it
   *  fades, a small cloud bursting where it was and drifting apart, as the
   *  Dock's poof. With less motion, only faded. */
  #poof(t) {
    if (Motion.reduced) return this.#fadeAway(t);
    const r = this.#shows(t.card);
    const g = Ghost.picture(t.card, this.overlay, r, 30);
    Ghost.burst([g], { scale: 1.05, over: Motion.spatial * 0.5, fading: Motion.appear, moving: Motion.appear });
    Ghost.puff(this.overlay, r);
  }

  /** A tile moved away: a picture of it where it was, shrinking and fading,
   *  as its neighbours' edges slide into the room it leaves. */
  #fadeAway(t) {
    const g = Ghost.picture(t.card, this.overlay, this.#shows(t.card), 30);
    Ghost.burst([g], { scale: Motion.reduced ? 1 : 0.86, over: Motion.spatial * 0.6, fading: Motion.appear, moving: Motion.travel });
  }

  /** Arrived at a tile (a link followed, a tile gone to): its focus ring
   *  swells and glows and settles back, the eye led to where it's gone. */
  markArrival(id) {
    if (id !== this.focused || !this.el.isConnected) return;
    let ring = this.ring;
    if (this.full === id) {
      // A maximized tile has no ring: one for the while.
      const { w, h: hh } = this.bounds;
      ring = h('div.mf-focus-ring');
      setRect(ring, { x: M.inset, y: M.inset, w: w - 2 * M.inset, h: hh - 2 * M.inset });
      this.el.append(ring);
      setTimeout(() => ring.remove(), 600 * Motion.slowdown);
    } else if (this.ring.hidden) {
      return;
    }
    // Swelling isn't travel: kept with less motion, as fades are.
    const glow = (a, w) => `0 0 0 ${(w - 2) / 2}px var(--mf-accent-strong), inset 0 0 0 ${(w - 2) / 2}px var(--mf-accent-strong), 0 0 16px color-mix(in srgb, var(--mf-accent) ${a * 75}%, transparent)`;
    animate(ring, [
      { boxShadow: glow(0, 2), offset: 0, easing: Motion.appear },
      { boxShadow: glow(0.9, 5), offset: 0.3, easing: Motion.settle },
      { boxShadow: glow(0, 2), offset: 1 },
    ], { duration: 600 * Motion.slowdown });
  }

  // ------------------------------------------------------------ maximizing

  /** A tile maximized slides its edges out from its place to the whole
   *  grid, the rest staying under it till it's there; restored, they slide
   *  back in to its place over them. */
  #zoom(id, source) {
    const t = this.tiles.get(id);
    const dest = this.lastFrames[id];
    const done = () => {
      if (this.zooming !== id) return;
      this.zooming = null;
      this.layout();
    };
    if (!t || !dest || source.w <= 1 || source.h <= 1 || rectsEqual(source, dest)) return done();
    if (Motion.reduced) {
      Ghost.fadeIn(t.card, Motion.base).done.then(done);
      return;
    }
    this.#raise(id, 20);
    this.#slide(t.card, source, dest).done.then(done);
  }

  // ---------------------------------------------------------------- lines

  /** The grab areas over the lines between columns and between tiles:
   *  dragged, they move; double-clicked, the two share their room evenly. */
  #lines() {
    const make = (vertical) => {
      const line = { el: h('div.mf-gridline' + (vertical ? '.mf-vertical' : '')), vertical };
      this.linesEl.append(line.el);
      let dragging = false;
      line.el.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        try { line.el.setPointerCapture(e.pointerId); } catch { /* a pointer that can't be held */ }
        dragging = true;
        this.el.classList.add(vertical ? 'mf-resizing-columns' : 'mf-resizing-rows');
      });
      line.el.addEventListener('pointermove', (e) => {
        if (!dragging || this.evening) return;
        const o = this.el.getBoundingClientRect();
        this.dividerDragging = true;
        line.onDrag?.(vertical ? e.clientX - o.left : e.clientY - o.top);
      });
      const end = () => {
        if (!dragging) return;
        dragging = false;
        this.el.classList.remove('mf-resizing-columns', 'mf-resizing-rows');
        // (A double-click's up: what it evens is kept once it's there.)
        if (this.evening || !this.dividerDragging) return;
        this.dividerDragging = false;
        line.onEnd?.();
      };
      line.el.addEventListener('pointerup', end);
      line.el.addEventListener('pointercancel', end);
      line.el.addEventListener('dblclick', () => line.onDoubleClick?.());
      return line;
    };
    const columnCount = Math.max(0, this.columns.length - 1);
    while (this.columnLines.length > columnCount) this.columnLines.pop().el.remove();
    while (this.columnLines.length < columnCount) this.columnLines.push(make(true));
    this.columnLines.forEach((line, i) => {
      line.onDrag = (x) => this.#dragColumnLine(i, x);
      line.onEnd = () => this.host.resizedFractions?.(this.fractions.slice());
      line.onDoubleClick = () => this.evenColumns(i);
    });
    const rows = [];
    this.columns.forEach((_, c) => {
      const shown = this.#shownTiles(c);
      for (let r = 0; r < shown.length - 1; r++) rows.push([c, shown[r], shown[r + 1]]);
    });
    while (this.rowLines.length > rows.length) this.rowLines.pop().el.remove();
    while (this.rowLines.length < rows.length) this.rowLines.push(make(false));
    this.rowLines.forEach((line, i) => {
      const [c, above, below] = rows[i];
      line.onDrag = (y) => this.#dragRowLine(c, above, below, y);
      line.onEnd = () => this.host.resizedHeights?.({ ...this.heights });
      line.onDoubleClick = () => this.evenRows(c, above, below);
    });
  }

  #dragColumnLine(i, x) {
    const frames = this.columnFrames();
    const left = frames[i].x, right = frames[i + 1].x + frames[i + 1].w;
    const split = Math.min(Math.max(x, left + M.minColumnWidth), right - M.minColumnWidth);
    const usable = this.bounds.w - (this.columns.length - 1) * M.gap;
    const pair = this.fractions[i] + this.fractions[i + 1];
    this.fractions[i] = (split - left) / usable;
    this.fractions[i + 1] = pair - this.fractions[i];
    this.layout();
  }

  /** The line between two tiles dragged: the two share their room by where
   *  it is. Pushed past a tile's least height, that tile is pushed out (its
   *  room to the other side; docked when the drag ends), and the line goes
   *  on against the next, until all above or below are out. */
  #dragRowLine(c, a0, b0, y) {
    const column = this.columns[c];
    if (!column) return;
    const ia = column.indexOf(a0), ib = column.indexOf(b0);
    if (ia < 0 || ib < 0) return;
    const aboves = column.slice(0, ia + 1).filter((id) => !this.#pushedOut(id));
    const belows = column.slice(ib).filter((id) => !this.#pushedOut(id));
    const a = aboves[aboves.length - 1], b = belows[0];
    if (a == null || b == null) return;
    const frames = this.tileFrames(c, this.columnFrames()[c]);
    const ra = frames[column.indexOf(a)], rb = frames[column.indexOf(b)];
    if (!ra || !rb) return;
    const top = ra.y, bottom = rb.y + rb.h;
    const n = Math.max(this.#shownTiles(c).length, 1);
    const share = (id) => this.heights[id] ?? 1 / n;
    if (y < top + M.minTileHeight) {
      this.heights[b] = share(b) + share(a);
      this.heights[a] = 0;
      return this.#dragRowLine(c, a0, b0, y);
    }
    if (y > bottom - M.minTileHeight) {
      this.heights[a] = share(a) + share(b);
      this.heights[b] = 0;
      return this.#dragRowLine(c, a0, b0, y);
    }
    const split = Math.min(Math.max(y, top + M.minTileHeight), bottom - M.minTileHeight);
    const pair = share(a) + share(b);
    this.heights[a] = pair * ((split - top) / (bottom - top));
    this.heights[b] = pair - this.heights[a];
    this.layout();
  }

  /** The line after column `i` double-clicked: the two share their width
   *  evenly, the line gliding there. */
  evenColumns(i) {
    if (i + 1 >= this.fractions.length || this.evening) return;
    const pair = this.fractions[i] + this.fractions[i + 1], from = this.fractions[i];
    this.#glideLine((t) => {
      this.fractions[i] = from + (pair / 2 - from) * t;
      this.fractions[i + 1] = pair - this.fractions[i];
    }, () => this.host.resizedFractions?.(this.fractions.slice()));
  }

  evenRows(c, a, b) {
    if (c >= this.columns.length || this.evening) return;
    const n = Math.max(this.#shownTiles(c).length, 1);
    const from = this.heights[a] ?? 1 / n;
    const pair = from + (this.heights[b] ?? 1 / n);
    this.#glideLine((t) => {
      this.heights[a] = from + (pair / 2 - from) * t;
      this.heights[b] = pair - this.heights[a];
    }, () => this.host.resizedHeights?.({ ...this.heights }));
  }

  /** A line moved to where `step` takes it (given 0…1, eased), laid out at
   *  each step as a drag lays out (the tiles sized as it goes, not jumping
   *  and sliding); then `done`, to keep where it ended. */
  #glideLine(step, done) {
    if (Motion.reduced) {
      step(1);
      this.layout();
      return done();
    }
    const start = performance.now(), duration = Math.max(Motion.spatial, 180);
    this.dividerDragging = true;
    const tick = () => {
      const x = Math.min((performance.now() - start) / duration, 1);
      // Eased out: quick, then settling.
      step(1 - Math.pow(1 - x, 3));
      this.layout();
      if (x < 1) {
        this.evening = requestAnimationFrame(tick);
        return;
      }
      this.evening = null;
      this.dividerDragging = false;
      done();
    };
    this.evening = requestAnimationFrame(tick);
  }

  // ----------------------------------------------------------------- drops

  /**
   * Where a drop at `point` (the grid's terms) lands: on a tile's bar (or,
   * with `cover`, the tile) — in its place, it docked under the one dropped;
   * near a column's side — a new column there; else between two tiles (or
   * above the first, below the last) of the column under the pointer.
   * Returns {column, at, rect, newColumn, onto} or null.
   */
  dropTarget(point, { dragged = null, cover = false } = {}) {
    const frames = this.columnFrames();
    const { w: W, h: H } = this.bounds;
    if (!frames.length) return { column: 0, at: 0, rect: { x: 0, y: 0, w: W, h: H }, newColumn: true, onto: null };
    if (this.full) return null;
    if (dragged != null && cover) {
      // ⌥: onto the tile under the pointer, whole — its shape the sign.
      for (let c = 0; c < this.columns.length; c++) {
        for (let i = 0; i < this.columns[c].length; i++) {
          const id = this.columns[c][i];
          const r = this.lastFrames[id];
          if (id === dragged || !r || this.collapsed.has(id)) continue;
          const body = { x: r.x, y: r.y + M.barHeight, w: r.w, h: r.h - M.barHeight };
          if (rectContains(body, point)) return { column: c, at: i, rect: body, newColumn: false, onto: id };
        }
      }
    }
    if (dragged != null) {
      for (let c = 0; c < this.columns.length; c++) {
        for (let i = 0; i < this.columns[c].length; i++) {
          const id = this.columns[c][i];
          const r = this.lastFrames[id];
          if (id === dragged || !r) continue;
          const capsule = rectInset({ x: r.x, y: r.y, w: r.w, h: M.barHeight }, -4);
          if (rectContains(capsule, point)) return { column: c, at: i + 1, rect: capsule, newColumn: false, onto: id };
        }
      }
    }
    for (let c = 0; c < frames.length; c++) {
      const f = frames[c];
      if (!(point.x >= f.x && point.x <= f.x + f.w + M.gap)) continue;
      const edge = Math.min(f.w * 0.2, 80);
      if (point.x < f.x + edge) return { column: c, at: 0, rect: { x: f.x, y: f.y, w: f.w / 2, h: f.h }, newColumn: true, onto: null };
      if (point.x > f.x + f.w - edge) return { column: c + 1, at: 0, rect: { x: f.x + f.w / 2, y: f.y, w: f.w / 2, h: f.h }, newColumn: true, onto: null };
      const tiles = this.tileFrames(c, f);
      for (let i = 0; i < tiles.length; i++) {
        const r = tiles[i];
        if (!r || !(point.y >= r.y && point.y <= r.y + r.h)) continue;
        if (point.y < r.y + r.h / 2) return { column: c, at: i, rect: { x: r.x, y: r.y, w: r.w, h: r.h / 2 }, newColumn: false, onto: null };
        return { column: c, at: i + 1, rect: { x: r.x, y: r.y + r.h / 2, w: r.w, h: r.h / 2 }, newColumn: false, onto: null };
      }
      return { column: c, at: tiles.length, rect: f, newColumn: false, onto: null };
    }
    return null;
  }

  /** The shown tile under a point, its bar too. */
  tileAt(point) {
    for (const [id, r] of Object.entries(this.lastFrames)) if (rectContains(r, point)) return id;
    return null;
  }

  /** Where a dragged thing would land, shown: half a column, for a new
   *  column; half a tile, above or below it. */
  showDrop(rect) {
    if (this.dropOverlay.hidden) {
      setRect(this.dropOverlay, rect);
      this.dropOverlay.hidden = false;
    } else if (!rectsEqual(this.dropRect, rect)) {
      const from = this.#shows(this.dropOverlay);
      setRect(this.dropOverlay, rect);
      if (!Motion.reduced) this.#slide(this.dropOverlay, from, rect, Motion.fast);
    }
    this.dropRect = rect;
  }

  hideDrop() {
    this.dropOverlay.hidden = true;
    this.dropRect = null;
  }

  /** While something's dragged over the grid: what the drop changes glides
   *  once it's dropped, as if nothing were dragged. */
  setDragging(on, dropped = false) {
    this.dragging = on;
    this.dropped = dropped;
    this.el.classList.toggle('mf-dragging', on);
    if (!on) this.hideDrop();
  }

  /** A point in the viewport, in the grid's terms. */
  pointFrom(e) {
    const o = this.el.getBoundingClientRect();
    return { x: e.clientX - o.left, y: e.clientY - o.top };
  }

  destroy() {
    this.resize.disconnect();
    cancelAnimationFrame(this.evening);
    for (const t of [...this.tiles.values()]) this.#discard(t);
    this.el.remove();
  }
}
