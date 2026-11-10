// ⌘`'s cards (Manifold's SpaceSwitcherView): the spaces as cards over the
// window, four to a row and three rows at most, in the popover look, centred
// in the root — the chosen one in a band and a ring of its own colour. This
// only draws: the walk itself (⌘ held, ` stepping, letting go to go there,
// the 0.2 s before the cards show) is whoever calls it.
//
//   const switcher = new SpaceSwitcher({ root })
//   switcher.show(spaces, chosenIndex, { onPick })  // fades in over Motion.fast; onPick(index): a card clicked
//   switcher.choose(index)                          // the highlight moved, at once
//   switcher.hide()                                 // fades out over Motion.fast, then removed
//   switcher.isShown
//
// `spaces` are SpaceCard's (spacecard.js). A thirteenth and later can be
// chosen but isn't drawn: there's no scrolling.

import { h, Motion, animate } from '../core/util.js';
import { SpaceCard } from './spacecard.js';

const GAP = 14;
const PAD = 18;
const PER_ROW = 4;
const ROWS = 3;

/** The switcher's size for `n` cards, and where card `i` is in it. */
export function switcherSize(n) {
  const count = Math.max(n, 1);
  const cols = Math.min(count, PER_ROW), rows = Math.min(Math.ceil(count / PER_ROW), ROWS);
  const { w, h: hgt } = SpaceCard.size;
  return { w: 2 * PAD + cols * w + (cols - 1) * GAP, h: 2 * PAD + rows * hgt + (rows - 1) * GAP };
}
export function switcherCardOrigin(i) {
  const { w, h: hgt } = SpaceCard.size;
  return { x: PAD + (i % PER_ROW) * (w + GAP), y: PAD + Math.floor(i / PER_ROW) * (hgt + GAP) };
}

export class SpaceSwitcher {
  constructor({ root }) {
    this.root = root;
    this.el = null;
    this.cards = [];
    this.chosen = -1;
    this.size = null;
    this.observer = null;
  }

  get isShown() {
    return !!this.el;
  }

  show(spaces, chosenIndex = 0, { onPick } = {}) {
    // One already up is replaced at once.
    this.#drop();
    this.size = switcherSize(spaces.length);
    this.chosen = chosenIndex;
    this.cards = spaces.slice(0, PER_ROW * ROWS).map((space, i) => {
      const card = new SpaceCard(space, { chosen: i === chosenIndex });
      const at = switcherCardOrigin(i);
      card.el.style.left = at.x + 'px';
      card.el.style.top = at.y + 'px';
      card.el.dataset.index = i;
      return card;
    });
    const el = h('div.mf-popover.mf-space-switcher', { style: { width: this.size.w + 'px', height: this.size.h + 'px' } }, this.cards.map((c) => c.el));
    // A press on it isn't a press on what's under it; a card clicked is picked.
    el.addEventListener('pointerdown', (e) => { e.stopPropagation(); e.preventDefault(); });
    el.addEventListener('click', (e) => {
      const card = e.target.closest('.mf-space-card');
      if (card && this.el === el) onPick?.(Number(card.dataset.index));
    });
    this.el = el;
    this.#center();
    this.root.append(el);
    // Kept in the middle as the window's resized under it.
    if (typeof ResizeObserver !== 'undefined') {
      this.observer = new ResizeObserver(() => this.#center());
      this.observer.observe(this.root);
    }
    animate(el, [{ opacity: 0 }, { opacity: 1 }], { duration: Motion.fast, easing: 'linear' });
  }

  /** The highlight moved to `index` (one not drawn: none lit), no animation. */
  choose(index) {
    if (index === this.chosen) return;
    this.chosen = index;
    this.cards.forEach((c, i) => { c.chosen = i === index; });
  }

  hide() {
    const el = this.el;
    if (!el) return;
    this.#release();
    el.style.pointerEvents = 'none';
    // From however far it had faded in.
    const from = getComputedStyle(el).opacity;
    el.getAnimations().forEach((a) => a.cancel());
    animate(el, [{ opacity: from }, { opacity: 0 }], { duration: Motion.fast, easing: 'linear', fill: 'forwards' }).done.then(() => el.remove());
  }

  /** Centred in the root, its origin on a whole point. */
  #center() {
    if (!this.el) return;
    this.el.style.left = Math.round(this.root.clientWidth / 2 - this.size.w / 2) + 'px';
    this.el.style.top = Math.round(this.root.clientHeight / 2 - this.size.h / 2) + 'px';
  }

  #release() {
    this.observer?.disconnect();
    this.observer = null;
    this.el = null;
    this.cards = [];
    this.chosen = -1;
  }

  #drop() {
    const el = this.el;
    this.#release();
    el?.remove();
  }
}
