// A tile's bar, across its top: its symbol and title, where it is in grey,
// its host in a chip when that isn't the space's, its links' faces, its
// status's pill when it needs you, and maximize and close at the right
// (Manifold's TilePill). The bar is the tile's handle: dragged, it moves the
// tile; clicked, the tile grows a step (⌘-click fills its column, ⌥-click
// all of it but the others' bars); ⌃-click, right-click or its symbol opens
// its menu; ⇧-click, where it is. As a tile narrows the bar gives things up
// in order, so the symbol and some of the title always show.

import { h, Motion, animate, modifiers } from '../core/util.js';
import { icon, iconButton, markParts, markBox, markStroke } from '../icons/icons.js';
import { measure, truncateMiddle } from '../core/measure.js';
import { statusMark, statusTooltip, statusGlyph, StatusPill, Shimmer } from '../status/statusmark.js';
import { LinkBadge } from './linkbadge.js';

const NS = 'http://www.w3.org/2000/svg';
export const BAR_HEIGHT = 30;
const MARK_SIZE = 11;
const NAME_MINIMUM = 56;
const LINK_COMPACT = 50;
const LINK_MINIMAL = 30;
const GLYPH = 13;

/**
 * A tile's icon, as a handle: under the pointer it swings out of the bar
 * toward you, hinged at its left edge as a door is, in a little
 * perspective, and grows a fifth — so it shows past the hand that's over it
 * — settling with a slight overshoot, a short shadow falling on the bar
 * from the edge that lifts. A mark of our own unfolds as it swings (a
 * terminal's prompt steps in as a window draws itself round it; a note's
 * corner peels further up). The pose says it can be taken: dragged, it's
 * the thing the tile stands for.
 */
export class IconHandle {
  constructor() {
    this.face = h('div.mf-handle-face');
    this.el = h('div.mf-handle', this.face);
    this.out = false;
    this.swings = 0;
    this.strokes = [];
    this.onIn = null;
  }

  set(out, symbol) {
    if (out === this.out) return;
    this.out = out;
    const reduced = Motion.reduced;
    if (out) this.#dress(symbol);
    const face = this.face;
    const now = getComputedStyle(face);
    const from = { transform: now.transform === 'none' ? 'rotateY(0deg) scale(1)' : now.transform, filter: now.filter === 'none' ? 'drop-shadow(1.5px 1px 1.5px rgba(0,0,0,0))' : now.filter };
    const to = {
      transform: out && !reduced ? 'rotateY(-40deg) scale(1.2)' : 'rotateY(0deg) scale(1)',
      filter: `drop-shadow(1.5px 1px 1.5px rgba(0,0,0,${out ? 0.5 : 0}))`,
    };
    const duration = out ? Motion.spatial : Motion.base;
    const swing = ++this.swings;
    face.hidden = false;
    face.getAnimations().forEach((a) => a.cancel());
    animate(face, [{ transform: from.transform }, { transform: to.transform }], { duration, easing: out ? Motion.settle : Motion.disappear, fill: 'forwards' });
    animate(face, [{ filter: from.filter }, { filter: to.filter }], { duration, easing: 'linear', fill: 'forwards' }).done.then(() => {
      // Only the latest swing's end, and only if it ended in, puts the icon back.
      if (this.out || this.swings !== swing) return;
      face.hidden = true;
      this.onIn?.();
    });
    this.#unfold(out, reduced ? 0 : duration);
  }

  /** The icon drawn in the face, as its own view shows it: a mark of ours
   *  as strokes at rest, anything else as it is. */
  #dress(symbol) {
    cancelAnimationFrame(this.raf);
    this.strokes = [];
    const parts = typeof symbol === 'string' ? markParts(symbol, MARK_SIZE) : null;
    if (!parts) {
      this.face.replaceChildren(icon(symbol, { size: MARK_SIZE }));
      return;
    }
    const { w, h: hh } = markBox(MARK_SIZE);
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('width', w);
    svg.setAttribute('height', hh);
    svg.setAttribute('viewBox', `0 0 ${w} ${hh}`);
    svg.setAttribute('fill', 'none');
    svg.classList.add('mf-icon');
    for (const part of parts) {
      const p = document.createElementNS(NS, 'path');
      p.setAttribute('d', part.rest);
      if (part.fills) {
        p.setAttribute('fill', 'currentColor');
        p.setAttribute('fill-opacity', '0.3');
        p.setAttribute('opacity', '0');
      } else {
        p.setAttribute('stroke', 'currentColor');
        p.setAttribute('stroke-width', markStroke(MARK_SIZE));
        p.setAttribute('stroke-linecap', 'round');
        p.setAttribute('stroke-linejoin', 'round');
      }
      if (part.drawsOn) {
        p.setAttribute('pathLength', '1');
        p.setAttribute('stroke-dasharray', '1 1');
        p.setAttribute('stroke-dashoffset', '1');
      }
      svg.append(p);
      this.strokes.push({ el: p, part, t: 0 });
    }
    this.face.replaceChildren(svg);
  }

  /** The mark's strokes moved between rest and unfolded — the same points, moved. */
  #unfold(out, duration) {
    if (!this.strokes.length) return;
    cancelAnimationFrame(this.raf);
    const numbers = (d) => d.match(/-?\d*\.?\d+/g).map(Number);
    const between = (a, b, t) => {
      const x = numbers(a), y = numbers(b);
      let i = 0;
      return a.replace(/-?\d*\.?\d+/g, () => { const v = x[i] + (y[i] - x[i]) * t; i += 1; return +v.toFixed(3); });
    };
    // Out, it settles past and back (the swing's curve); in, it eases away.
    const settle = (x) => 1 + 2.2 * Math.pow(x - 1, 3) + 1.2 * Math.pow(x - 1, 2);
    const start = performance.now();
    const from = this.strokes.map((s) => s.t);
    const target = out ? 1 : 0;
    const step = () => {
      const x = duration ? Math.min((performance.now() - start) / duration, 1) : 1;
      const e = out ? settle(x) : x * x;
      this.strokes.forEach((s, i) => {
        s.t = from[i] + (target - from[i]) * e;
        s.el.setAttribute('d', between(s.part.rest, s.part.out, s.t));
        const shown = Math.min(Math.max(from[i] + (target - from[i]) * (out ? 1 - (1 - x) * (1 - x) : x * x), 0), 1);
        if (s.part.drawsOn) s.el.setAttribute('stroke-dashoffset', String(1 - shown));
        if (s.part.fills) s.el.setAttribute('opacity', String(shown));
      });
      if (x < 1) this.raf = requestAnimationFrame(step);
    };
    step();
  }
}

/** The host a tile lives on, when that isn't its space's: a quiet capsule after the name. */
function hostWidth(host) {
  return 7 + 12 + 3 + Math.min(120, Math.ceil(measure(host, 'caption')) + 4) + 7;
}

export class TileBar {
  /**
   * @param {object} host  what the bar tells (each optional):
   *   onClick(point, mods), onIconClick(mods, point), onPathClick(point),
   *   onRightClick(point), onDragStart(event, thing), onClose(),
   *   onToggleFull(), onToggleSidebar(), onViewButton(i),
   *   overlay (element for link cards), linkSummary(link), onOpenLink(link, mods),
   *   onLinkMenu(link, point), onLinkDrag(link, event, thing)
   */
  constructor(host = {}) {
    this.host = host;
    this.shown = null;
    this.focused = false;
    this.maximized = false;
    this._collapsed = false;
    this.showsButtons = true;
    this.draggable = true;
    this.width = 0;
    this.pointerIn = false;
    this.viewButtons = [];
    this.ownButtons = [];
    this._sidebar = null;

    this.glass = h('div.mf-bar-glass');
    this.icon = h('span.mf-bar-icon');
    this.handle = new IconHandle();
    this.handle.onIn = () => { this.icon.style.visibility = ''; };
    this.stackBadge = h('span.mf-bar-stack-badge', { hidden: true, title: 'Editing: closing the editor brings the tile under it back' }, icon('doc.fill', { size: 7, weight: 'bold' }));
    this.name = h('span.mf-bar-name');
    this.hostPill = h('span.mf-bar-host', { hidden: true });
    this.subtitle = h('span.mf-bar-place');
    this.glyph = h('span.mf-bar-glyph', { hidden: true });
    this.statusPill = new StatusPill();
    this.statusPill.extra = 'mf-bar-status';
    this.statusPill.el.classList.add('mf-bar-status');
    this.shimmer = new Shimmer(this.name);
    this.close = iconButton('xmark', { size: 9, tip: 'Close', className: 'mf-bar-button', onClick: () => this.host.onClose?.() });
    this.corner = iconButton('arrow.up.left.and.arrow.down.right', { size: 9, tip: 'Maximize', className: 'mf-bar-button', onClick: () => this.host.onToggleFull?.() });
    this.sidebarButton = iconButton('sidebar.left', { size: 10, weight: 'medium', className: 'mf-bar-button', onClick: () => this.host.onToggleSidebar?.() });
    this.sidebarButton.hidden = true;
    this.editor = h('input.mf-bar-editor', { hidden: true, spellcheck: false });
    this.badge = new LinkBadge({
      get overlay() { return host.overlay; },
      summary: (l) => host.linkSummary?.(l),
      onOpen: (l, m) => host.onOpenLink?.(l, m),
      onMenu: (l, p) => host.onLinkMenu?.(l, p),
      onDrag: (l, e, thing) => host.onLinkDrag?.(l, e, thing),
      onFanEdge: (x) => this.#fadeForFan(x),
    });
    this.el = h('div.mf-bar', this.glass, this.handle.el, this.icon, this.stackBadge, this.name, this.hostPill, this.subtitle,
      this.glyph, this.statusPill.el, this.badge.el, this.sidebarButton, this.corner, this.close, this.editor);
    this.#listen();
  }

  // ------------------------------------------------------------ showing

  /**
   * shown: {title, symbol, place?, summary?: {lines, note}, status?, dirty?: true|'stale',
   *         host?, suffix?, stackedOver?, links?: [], editsPlace?}
   */
  show(shown, { focused = false, maximized = false } = {}) {
    const was = this.shown;
    this.shown = shown;
    this.stackBadge.hidden = !shown.stackedOver;
    if (this.maximized !== maximized || !this.cornerSet) {
      this.cornerSet = true;
      this.maximized = maximized;
      this.corner.setSymbol(maximized ? 'arrow.down.right.and.arrow.up.left' : 'arrow.up.left.and.arrow.down.right');
      this.corner.title = maximized ? 'Restore' : 'Maximize';
    }
    if (!was || was.symbol !== shown.symbol) this.icon.replaceChildren(icon(shown.symbol ?? 'circle.fill', { size: MARK_SIZE }));
    const title = (shown.title ?? '') + (shown.suffix ? `  (${shown.suffix})` : '');
    const dirty = shown.dirty ? (shown.dirty === 'stale' ? 'stale' : 'dirty') : '';
    if (this.titleShown !== title || this.dirtyShown !== dirty) {
      this.titleShown = title;
      this.dirtyShown = dirty;
      // Edited and unsaved: a dot after the name, amber when what it shows
      // changed under the edits.
      this.name.replaceChildren(title, dirty ? h(`span.mf-bar-dot.mf-${dirty}`, ' •') : '');
      this.name.title = dirty ? (dirty === 'stale' ? 'Edited, and it changed elsewhere' : 'Edited') : '';
      this.nameWidth = Math.ceil(measure(title + (dirty ? ' •' : ''), 'title'));
    }
    this.#subtitle();
    const hostName = shown.host ?? null;
    if (this.hostShown !== hostName) {
      this.hostShown = hostName;
      this.hostPill.replaceChildren(...(hostName ? [icon('server.rack', { size: 9, weight: 'semibold' }), h('span', hostName)] : []));
      this.hostPill.title = hostName ? `On ${hostName}, not this space's host` : '';
    }
    // The status by the name: a pill only when it needs you, the name
    // shimmering while it works, dim when inactive.
    const mark = statusMark(shown.stackedOver ? { ...(shown.status ?? {}), note: 'Editing' } : shown.status);
    const glyphKey = mark.glyph ? mark.glyph.look : '';
    if (this.glyphShown !== glyphKey) {
      this.glyphShown = glyphKey;
      this.glyph.hidden = !mark.glyph;
      this.glyph.replaceChildren(...(mark.glyph ? [statusGlyph(mark.glyph)] : []));
    }
    this.statusPill.set(mark.pill, false);
    const tip = statusTooltip(shown.status);
    this.glyph.title = tip;
    this.statusPill.el.title = tip;
    this.shimmerOn = mark.shimmer;
    this.name.style.opacity = mark.dim ? '0.6' : '';
    this.badge.setLinks(shown.links ?? []);
    this.el.classList.toggle('mf-edits-place', !!shown.editsPlace);
    if (this.focused !== focused) {
      this.focused = focused;
      this.el.classList.toggle('mf-focused', focused);
    }
    this.layout();
    this.shimmer.set(mark.shimmer);
  }

  /** After the name, in grey: where it is — or, the tile down to its bar,
   *  what its summary says first, its content being out of sight. */
  #subtitle() {
    const s = this.shown;
    if (!s) return;
    let text = s.place ?? '';
    if (this._collapsed && s.summary) {
      const line = [...(s.summary.lines ?? []).slice(0, 2), s.summary.note].filter(Boolean).join(' · ');
      if (line) text = line;
    }
    this.placeText = text;
  }

  /** The tile shrunk to its bar alone: the bar rounded all round. */
  set collapsed(on) {
    if (on === this._collapsed) return;
    this._collapsed = on;
    this.el.classList.toggle('mf-collapsed', on);
    this.#subtitle();
    this.layout();
  }
  get collapsed() {
    return this._collapsed;
  }

  /** The view's own sidebar (an outline), shown or not; null: no button. */
  set sidebar(v) {
    if (v === this._sidebar) return;
    this._sidebar = v;
    this.sidebarButton.classList.toggle('mf-on', v === true);
    this.sidebarButton.title = v === true ? 'Hide Outline' : 'Show Outline';
    this.layout();
  }
  get sidebar() {
    return this._sidebar;
  }

  /** The view's own buttons, before the bar's: [{symbol, tooltip, enabled}]. */
  setViewButtons(buttons) {
    this.viewButtons = buttons ?? [];
    while (this.ownButtons.length < this.viewButtons.length) {
      const i = this.ownButtons.length;
      const b = iconButton('circle', { size: 11, weight: 'medium', className: 'mf-bar-button', onClick: () => this.host.onViewButton?.(i) });
      this.el.insertBefore(b, this.sidebarButton);
      this.ownButtons.push(b);
    }
    this.ownButtons.forEach((b, i) => {
      const spec = this.viewButtons[i];
      if (!spec) { b.hidden = true; return; }
      b.setSymbol(spec.symbol);
      b.title = spec.tooltip ?? '';
      b.disabled = spec.enabled === false;
    });
    this.layout();
  }

  /** What the bar's right end takes now: its buttons. */
  get rightTaken() {
    let w = 10;
    for (const b of [this.close, this.corner, this.sidebarButton]) if (!b.hidden) w += 22;
    const own = this.ownButtons.filter((b) => !b.hidden).length;
    if (own > 0) w += own * 22 + 4;
    return w;
  }

  // ------------------------------------------------------------- layout

  /** Laid out for `width` (where it ends, if its tile is gliding there):
   *  what's at its right rides its right edge; what's at its left stays. */
  layout(width = this.width) {
    this.width = width;
    if (!width || !this.shown) return;
    const hgt = BAR_HEIGHT;
    let x = 10 + 22;
    // Shrinkage: as the bar narrows, what's on it gives way in order, so the
    // name keeps at least a little room — the place goes first (below), then
    // the links shrink, then maximize goes, then the links altogether; the ×
    // and the status stay, and last the name itself is cut.
    const showClose = this.showsButtons;
    let showCorner = this.showsButtons;
    let showSidebar = showCorner && this._sidebar != null;
    let showOwn = showCorner && this.viewButtons.length > 0;
    const ownWidth = this.viewButtons.length * 22 + 4;
    const linkWanted = this.badge.foldedWidth;
    let linkRoom = linkWanted > 0 ? linkWanted + 14 : 0;
    const nameWanted = (this.nameWidth ?? 0) + 4;
    const nameNeed = Math.min(nameWanted, NAME_MINIMUM);
    let showHost = !!this.hostShown;
    const hostW = showHost ? hostWidth(this.hostShown) : 0;
    const glyphShown = !this.glyph.hidden;
    const pillShown = !!this.statusPill.pill;
    let compact = false;
    const pillWidth = () => { this.statusPill.compact = compact; return this.statusPill.wanted(measure).w; };
    const spare = () => {
      let used = x + 10 + linkRoom + (showHost ? hostW + 8 : 0);
      if (showClose) used += 22;
      if (showCorner) used += 22;
      if (showSidebar) used += 22;
      if (showOwn) used += ownWidth;
      if (glyphShown) used += GLYPH + 8;
      if (pillShown) used += pillWidth() + 8;
      return width - used;
    };
    // The view's own buttons go first of all: what the tile is matters more.
    if (spare() < nameNeed && showOwn) showOwn = false;
    if (spare() < nameNeed && linkWanted > 0) linkRoom = Math.min(linkRoom, LINK_COMPACT + 14);
    if (spare() < nameNeed && linkWanted > 0) linkRoom = Math.min(linkRoom, LINK_MINIMAL + 14);
    if (spare() < nameNeed && showSidebar) showSidebar = false;
    // The status's word gives way to a dot in its colour before the name gives way to it.
    if (spare() < nameNeed && pillShown) compact = true;
    if (spare() < nameNeed && showCorner) showCorner = false;
    if (spare() < nameNeed && linkRoom > 0) linkRoom = 0;
    // Last of all, the host's pill.
    if (spare() < nameNeed && showHost) showHost = false;
    const linkGiven = linkRoom > 0 ? linkRoom - 14 : 0;

    let right = width - 10;
    const place = (el, w) => { el.style.right = width - right + 'px'; right -= w; };
    this.close.hidden = !showClose;
    if (showClose) place(this.close, 22);
    this.corner.hidden = !showCorner;
    if (showCorner) place(this.corner, 22);
    this.sidebarButton.hidden = !showSidebar;
    if (showSidebar) place(this.sidebarButton, 22);
    this.ownButtons.forEach((b, i) => { b.hidden = !showOwn || i >= this.viewButtons.length; });
    if (showOwn) {
      right -= 4;
      for (let i = this.viewButtons.length - 1; i >= 0; i--) place(this.ownButtons[i], 22);
    }
    // The links sit before the buttons; the status before them, by the name.
    this.badge.el.hidden = linkGiven < this.badge.foldedWidth || !linkWanted;
    if (!this.badge.el.hidden) {
      // From after the tile's symbol to the buttons: the faces fan out over
      // the title, and a stack of more is scrubbed across it.
      const badgeRight = this.rightTaken + 8;
      const w = Math.max(width - badgeRight - 32, Math.min(this.badge.foldedWidth, 60));
      this.badge.el.style.right = badgeRight + 'px';
      this.badge.el.style.width = w + 'px';
      this.badge.layout(w);
    }
    right -= linkRoom;
    this.statusPill.set(this.statusPill.pill, compact);
    if (pillShown) {
      const w = pillWidth();
      this.statusPill.el.style.width = w + 'px';
      this.statusPill.el.style.right = width - right + 'px';
      right -= w + 8;
    }
    if (glyphShown) {
      this.glyph.style.right = width - right + 'px';
      right -= GLYPH + 8;
    }
    const hostRoom = showHost ? hostW + 8 : 0;
    const nw = Math.max(0, Math.min(nameWanted, right - x - hostRoom));
    this.name.style.left = x - 2 + 'px';
    this.name.style.width = nw + 'px';
    let sx = x - 2 + nw + 8;
    this.hostPill.hidden = !showHost;
    if (showHost) {
      this.hostPill.style.left = sx - 2 + 'px';
      this.hostPill.style.width = hostW + 'px';
      sx += hostW + 6;
    }
    const room = Math.max(0, right - sx);
    const editing = !this.editor.hidden;
    if (editing) {
      // Over the address, where it was; over the name when the address
      // would have too little room.
      const roomy = !this.edit?.overName && room >= 160;
      this.subtitle.hidden = true;
      this.name.style.visibility = roomy ? '' : 'hidden';
      const ex = roomy ? sx - 2 : x - 2;
      this.editor.style.left = ex + 'px';
      this.editor.style.width = Math.max(0, right - ex) + 'px';
    } else {
      this.name.style.visibility = '';
      this.subtitle.hidden = !this.placeText || room < 40;
      this.subtitle.style.left = sx + 'px';
      this.subtitle.style.width = room + 'px';
      if (!this.subtitle.hidden) {
        const cut = truncateMiddle(this.placeText, room, 'detail');
        if (this.subtitle.textContent !== cut) this.subtitle.textContent = cut;
        this.placeWidth = Math.min(room, Math.ceil(measure(cut, 'detail')) + 4);
      }
    }
    this.shimmer.layout();
    if (this.fanEdge != null) this.#fadeForFan(this.fanEdge);
  }

  /** The title, the place and the host's chip, masked to fade out before the
   *  links' fan — only where the fan is over them. */
  #fadeForFan(edgeInBar) {
    this.fanEdge = edgeInBar;
    const fade = 22;
    for (const v of [this.name, this.subtitle, this.hostPill]) {
      const left = parseFloat(v.style.left || '0'), w = parseFloat(v.style.width || '0');
      const edge = edgeInBar == null ? null : edgeInBar - 6 - left;
      // (The name is masked by its shimmer while it works; left to it.)
      if (v === this.name && this.shimmerOn) continue;
      if (edge == null || edge >= w || v.hidden) {
        v.style.maskImage = v.style.webkitMaskImage = '';
        continue;
      }
      const end = Math.max(0, edge), start = Math.max(0, edge - fade);
      v.style.maskImage = v.style.webkitMaskImage = `linear-gradient(90deg, #000 0, #000 ${start}px, transparent ${end}px, transparent 100%)`;
    }
  }

  // ----------------------------------------------------- editing in place

  /** The bar becomes a field for `edit`: {text, placeholder?, overName?,
   *  commit(text), cancel?()} — the text selected to type over. */
  beginEditing(edit) {
    this.edit = edit;
    this.editor.hidden = false;
    this.editor.value = edit.text ?? '';
    this.editor.placeholder = edit.placeholder ?? '';
    this.layout();
    this.editor.focus();
    this.editor.select();
  }

  endEditing(commit = false) {
    const edit = this.edit;
    if (!edit) return;
    this.edit = null;
    this.editor.hidden = true;
    this.layout();
    if (commit) edit.commit?.(this.editor.value);
    else edit.cancel?.();
  }

  get isEditing() {
    return !!this.edit;
  }

  // -------------------------------------------------------------- events

  /** Where the icon takes the pointer (in the bar): clicked, its menu;
   *  dragged, the thing the tile stands for. */
  #onIcon(p) {
    return p.x >= 2 && p.x <= 34 && p.y >= 2 && p.y <= 28;
  }

  #onPlace(p) {
    if (!this.shown?.editsPlace || this.isEditing || this.subtitle.hidden) return false;
    const left = parseFloat(this.subtitle.style.left || '0');
    return p.x >= left - 4 && p.x <= left + (this.placeWidth ?? 0) + 4;
  }

  #listen() {
    const el = this.el;
    const point = (e) => {
      const r = el.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    let down = null;
    el.addEventListener('pointerenter', () => { this.pointerIn = true; el.classList.add('mf-pointer-in'); });
    el.addEventListener('pointerleave', () => { this.pointerIn = false; el.classList.remove('mf-pointer-in'); this.#setHandle(false); });
    el.addEventListener('pointermove', (e) => {
      const p = point(e);
      // The pointer on the icon: its handle folds out, to be taken — unless
      // something's being dragged across it.
      if (!down) this.#setHandle(this.#onIcon(p) && e.buttons === 0 && this.draggable);
      el.classList.toggle('mf-over-place', this.#onPlace(p));
      if (!down || !this.draggable) return;
      if (Math.hypot(e.clientX - down.x, e.clientY - down.y) <= 4) return;
      const onIcon = down.onIcon;
      down = null;
      try { el.releasePointerCapture(e.pointerId); } catch { /* not held */ }
      // Taken: the handle goes back in; what's dragged is the pill.
      this.#setHandle(false);
      this.host.onDragStart?.(e, onIcon);
    });
    el.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || e.target === this.editor) return;
      const p = point(e);
      down = { x: e.clientX, y: e.clientY, onIcon: this.#onIcon(p) };
      try { el.setPointerCapture(e.pointerId); } catch { /* a pointer that can't be held */ }
      e.preventDefault();
    });
    el.addEventListener('pointerup', (e) => {
      if (!down) return;
      down = null;
      const p = point(e);
      const mods = modifiers(e);
      const at = { x: e.clientX, y: e.clientY };
      // Clicks in a row are clicks each (two quick ones grow twice).
      if (mods.control) this.host.onRightClick?.(at);
      else if (mods.shift) this.host.onPathClick?.(at);
      else if (this.#onIcon(p)) this.host.onIconClick?.(mods, at);
      else if (this.#onPlace(p) && !mods.command) this.host.onPlaceClick?.();
      else this.host.onClick?.(p, mods);
    });
    el.addEventListener('pointercancel', () => { down = null; });
    el.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      down = null;
      this.host.onRightClick?.({ x: e.clientX, y: e.clientY });
    });
    this.editor.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.editor.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') this.endEditing(true);
      else if (e.key === 'Escape') this.endEditing(false);
    });
    this.editor.addEventListener('blur', () => this.endEditing(false));
  }

  #setHandle(out) {
    if (this.handle.out === out) return;
    this.handle.set(out, this.shown?.symbol ?? 'circle.fill');
    if (out) this.icon.style.visibility = 'hidden';
  }

  destroy() {
    this.badge.destroy();
    this.shimmer.set(false);
    this.el.remove();
  }
}
