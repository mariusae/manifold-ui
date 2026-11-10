// A tile's links, on its bar: each linked thing's face — its symbol on a
// small rounded square, a chevron on the side it points (› links to,
// ‹ linked from). Several stack up, the most recent in front and the edges
// of two more behind it; the pointer on them fans them out along the bar,
// and resting on one a moment shows its summary card under the bar. More
// than fit (or than eight), the last is a stack of the rest, scrubbed
// through by the pointer over the title. (Manifold's LinkBadge.)
//
// link: {id, title, symbol, outbound: boolean, breakable?: boolean, embed?: boolean}

import { h, Motion, animate, modifiers } from '../core/util.js';
import { icon } from '../icons/icons.js';
import { SummaryCard } from './summarycard.js';

const CHIP = 22;
const PEEK = 4;
const STEP = 26;
const MOST_SHOWN = 8;
const SCRUB_ROOM = 90;
const PREVIEW_WIDTH = 280;
const PREVIEW_DELAY = 150;

function tooltip(l) {
  if (l.embed) return l.outbound ? `Shows ${l.title}` : `Shown in ${l.title}`;
  return l.outbound ? `Links to ${l.title}` : `Linked from ${l.title}`;
}

class Chip {
  constructor() {
    this.el = h('div.mf-link-face');
    this.depth = -1;
    this.link = null;
  }

  dress(link, depth = 0) {
    const key = `${link?.id}/${link?.symbol}/${link?.outbound}/${depth}`;
    if (key === this.key) return;
    this.key = key;
    this.link = link;
    this.depth = depth;
    this.el.replaceChildren();
    this.el.dataset.depth = depth;
    if (!link || depth > 0) {
      this.el.removeAttribute('title');
      return;
    }
    this.el.title = tooltip(link);
    const sym = h('span.mf-link-symbol', icon(link.symbol, { size: 12 }));
    const chevron = h('span.mf-link-chevron', icon(link.outbound ? 'chevron.right' : 'chevron.left', { size: 8, weight: 'bold' }));
    this.el.append(...(link.outbound ? [sym, chevron] : [chevron, sym]));
  }

  set hovered(on) {
    this.el.classList.toggle('mf-hovered', on);
  }
}

export class LinkBadge {
  static capsuleHeight = CHIP;

  /**
   * @param {object} host
   *   overlay     element the summary card is put in (the grid)
   *   summary     (link) → SummaryCard content, or null
   *   onOpen      (link, modifiers)
   *   onMenu      (link, {x, y})   viewport coordinates
   *   onDrag      (link, event, thing)
   *   onFanEdge   (x in the badge's parent | null)
   */
  constructor(host) {
    this.host = host;
    this.el = h('div.mf-links');
    this.links = [];
    this.chips = [];
    this.fanned = false;
    this.singles = 0;
    this.scrubbed = 0;
    this.stackFront = new Chip();
    this.stackFront.el.classList.add('mf-link-stack-front');
    this.stackBacks = [new Chip(), new Chip()];
    this.scrub = h('div.mf-link-scrub');
    this.preview = null;
    this.previewed = null;
    this.onMove = (e) => this.#track(e);
    this.el.addEventListener('pointermove', (e) => this.#track(e));
    this.scrub.addEventListener('pointermove', (e) => this.#track(e));
    this.#arm(this.scrub, () => this.links[this.singles + this.scrubbed], false);
    this.#arm(this.stackFront.el, () => this.links[this.singles + this.scrubbed], false);
  }

  /** What it wants of the bar, folded. */
  get foldedWidth() {
    return this.links.length ? CHIP + (Math.min(this.links.length, 3) - 1) * PEEK : 0;
  }

  setLinks(links) {
    const same = links.length === this.links.length && links.every((l, i) => l.id === this.links[i].id);
    this.links = links;
    if (same) {
      // Only titles or symbols changed: redressed in place, so nothing jumps.
      this.chips.forEach((c, i) => c.dress(links[i], this.fanned ? 0 : Math.min(i, 2)));
      return;
    }
    this.hidePreview();
    this.scrubbed = 0;
    this.fanned = false;
    this.chips.forEach((c) => c.el.remove());
    this.chips = links.map((l, i) => {
      const c = new Chip();
      c.dress(l, Math.min(i, 2));
      c.el.style.zIndex = String(100 - i);
      this.#arm(c.el, () => this.links[i], true);
      return c;
    });
    this.el.replaceChildren(this.scrub, ...this.stackBacks.map((b) => b.el), this.stackFront.el, ...this.chips.map((c) => c.el));
    this.#place(false);
  }

  /** Clicks, drags and menus on a face (or the stack). */
  #arm(el, link, draggable) {
    let down = null;
    el.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      if (e.ctrlKey && modifiers(e).control) return;
      down = { x: e.clientX, y: e.clientY };
      try { el.setPointerCapture(e.pointerId); } catch { /* a pointer that can't be held */ }
    });
    el.addEventListener('pointermove', (e) => {
      if (!down || !draggable) return;
      if (Math.hypot(e.clientX - down.x, e.clientY - down.y) <= 4) return;
      down = null;
      try { el.releasePointerCapture(e.pointerId); } catch { /* not held */ }
      const l = link();
      this.fold();
      if (l) this.host.onDrag?.(l, e, e.shiftKey);
    });
    el.addEventListener('pointerup', (e) => {
      if (!down) return;
      down = null;
      const r = el.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) return;
      const l = link();
      // Folded and cleared first: the pointer is about to be elsewhere.
      this.fold();
      if (l) this.host.onOpen?.(l, modifiers(e));
    });
    el.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const l = link();
      this.hidePreview();
      if (l) this.host.onMenu?.(l, { x: e.clientX, y: e.clientY });
    });
  }

  /** Laid out in `width` of the bar (its faces ride its right end). */
  layout(width) {
    this.width = width;
    this.#place(false);
  }

  #place(animated) {
    const n = this.links.length;
    const width = this.width ?? 0;
    let singles = n;
    if (this.fanned) {
      const all = CHIP + Math.max(n - 1, 0) * STEP;
      if (!(n <= MOST_SHOWN && all <= width)) {
        const fit = Math.floor((width - CHIP - SCRUB_ROOM) / STEP);
        singles = Math.max(0, Math.min(MOST_SHOWN - 1, fit, n - 1));
      }
    }
    this.singles = singles;
    const overflow = this.fanned && singles < n;
    const duration = animated && !Motion.reduced ? Motion.base : 0;
    const easing = this.fanned ? Motion.appear : Motion.disappear;
    const folded = this.foldedWidth;
    this.chips.forEach((c, i) => {
      const was = parseFloat(c.el.style.right || '0');
      let right, shown;
      if (this.fanned) {
        right = i * STEP;
        shown = i < singles;
        c.dress(this.links[i], 0);
      } else {
        right = folded - CHIP - Math.min(i, 2) * PEEK;
        shown = i < 3;
        c.dress(this.links[i], Math.min(i, 2));
        c.hovered = false;
      }
      // Those hidden while folded slide out from under the stack; folding,
      // they go at once.
      const wasHidden = c.el.hidden;
      c.el.hidden = !shown;
      c.el.style.right = right + 'px';
      if (duration && shown) {
        const from = wasHidden ? folded - CHIP - 2 * PEEK : was;
        if (from !== right) animate(c.el, [{ right: from + 'px' }, { right: right + 'px' }], { duration, easing });
      }
    });
    const rest = n - singles;
    this.stackFront.el.hidden = !overflow;
    this.scrub.hidden = !overflow;
    if (overflow) {
      const at = singles * STEP;
      this.stackFront.el.style.right = at + 'px';
      this.stackFront.dress(this.links[singles + Math.min(this.scrubbed, rest - 1)], 0);
      this.scrub.style.right = at + 'px';
    }
    this.stackBacks.forEach((b, j) => {
      b.el.hidden = !(overflow && rest > j + 1);
      b.el.style.right = singles * STEP + (j + 1) * PEEK + 'px';
      b.dress({ id: 'behind' }, j + 1);
    });
    // Where the fan begins: the title shows up to there, fading out before it.
    let edge = null;
    if (this.fanned && n) {
      let reach = overflow ? singles * STEP + CHIP + (Math.min(rest - 1, 2)) * PEEK : (singles - 1) * STEP + CHIP;
      edge = this.el.offsetLeft + width - reach;
    }
    this.host.onFanEdge?.(edge);
  }

  #faces() {
    const out = this.chips.filter((c) => !c.el.hidden);
    if (!this.stackFront.el.hidden) out.push(this.stackFront);
    return out;
  }

  #track(e) {
    const p = { x: e.clientX, y: e.clientY };
    const within = (el, dx, dy) => {
      const r = el.getBoundingClientRect();
      return p.x >= r.left - dx && p.x <= r.right + dx && p.y >= r.top - dy && p.y <= r.bottom + dy;
    };
    if (!this.fanned) {
      if (e.buttons === 0 && this.#faces().some((c) => within(c.el, 3, 4))) this.fan();
      else return;
    }
    // Folds when the pointer leaves the faces (and, with a stack, the title
    // they're scrubbed over); the gaps between faces don't fold it.
    const faces = this.#faces();
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const el of faces.map((c) => c.el).concat(this.scrub.hidden ? [] : [this.scrub])) {
      const r = el.getBoundingClientRect();
      x0 = Math.min(x0, r.left); x1 = Math.max(x1, r.right); y0 = Math.min(y0, r.top); y1 = Math.max(y1, r.bottom);
    }
    if (p.x < x0 - 6 || p.x > x1 + 6 || p.y < y0 - 8 || p.y > y1 + 8) return this.fold();
    let hovered = null;
    for (const c of this.chips) {
      const on = !c.el.hidden && within(c.el, 2, 4);
      c.hovered = on;
      if (on) hovered = c;
    }
    if (hovered) {
      this.stackFront.hovered = false;
      const r = hovered.el.getBoundingClientRect();
      return this.#hover(this.links.indexOf(hovered.link), r.left + r.width / 2);
    }
    if (!this.scrub.hidden && (within(this.scrub, 0, 4) || within(this.stackFront.el, 2, 4))) {
      // Further back the further left: the title's width in as many bands
      // as there are more, the most recent at the stack.
      const rest = this.links.length - this.singles;
      const front = this.stackFront.el.getBoundingClientRect();
      const area = this.scrub.getBoundingClientRect();
      const t = (front.right - p.x) / Math.max(1, front.right - area.left);
      const k = Math.min(rest - 1, Math.max(0, Math.floor(t * rest)));
      if (k !== this.scrubbed) {
        this.scrubbed = k;
        this.stackFront.dress(this.links[this.singles + k], 0);
      }
      this.stackFront.hovered = true;
      this.#hover(this.singles + k, p.x);
    }
  }

  fan() {
    if (this.fanned || !this.links.length) return;
    this.fanned = true;
    this.#place(true);
    document.addEventListener('pointermove', this.onMove, true);
  }

  fold() {
    if (!this.fanned) return;
    this.fanned = false;
    this.scrubbed = 0;
    this.stackFront.hovered = false;
    document.removeEventListener('pointermove', this.onMove, true);
    this.hidePreview();
    this.#place(true);
  }

  // The card under the bar: after a moment's rest on a face; once one's up,
  // it moves along with the pointer at once.
  #hover(i, x) {
    if (i < 0) return;
    if (this.preview) return this.#showPreview(i, x);
    if (i === this.pending) return;
    this.pending = i;
    clearTimeout(this.previewTimer);
    this.previewTimer = setTimeout(() => this.#showPreview(i, x), PREVIEW_DELAY);
  }

  #showPreview(i, x) {
    const link = this.links[i];
    const overlay = this.host.overlay;
    const content = link && this.host.summary?.(link);
    if (!content || !overlay || !this.fanned) return;
    const fresh = !this.preview;
    if (fresh) {
      this.preview = new SummaryCard(content);
      this.preview.el.classList.add('mf-link-preview');
      overlay.append(this.preview.el);
    } else if (this.previewed !== i) {
      this.preview.content = content;
    }
    this.previewed = i;
    const o = overlay.getBoundingClientRect();
    const bar = this.el.getBoundingClientRect();
    const left = Math.min(Math.max(x - o.left - PREVIEW_WIDTH / 2, 6), o.width - PREVIEW_WIDTH - 6);
    const barBottom = bar.top + bar.height / 2 + 15 - o.top;
    Object.assign(this.preview.el.style, { left: left + 'px', top: barBottom + 8 + 'px', width: PREVIEW_WIDTH + 'px', height: SummaryCard.heightFor(content) + 2 + 'px' });
    if (fresh) animate(this.preview.el, [{ opacity: 0 }, { opacity: 1 }], { duration: Motion.fast, easing: Motion.appear });
  }

  hidePreview() {
    clearTimeout(this.previewTimer);
    this.pending = null;
    this.previewed = null;
    const p = this.preview;
    if (!p) return;
    this.preview = null;
    animate(p.el, [{ opacity: 1 }, { opacity: 0 }], { duration: Motion.fast, easing: Motion.disappear, fill: 'forwards' }).done.then(() => p.el.remove());
  }

  destroy() {
    this.fold();
    this.hidePreview();
    this.el.remove();
  }
}
