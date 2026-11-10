// The card that comes up beside a thing the pointer rests on — a sidebar
// row, a shelf item, a host (Manifold's HoverCard): one card shared by the
// whole page, drawn above everything in its root and never taking a click.
//
//   HoverCard.request({ key, anchor, content, root?, above? })
//     key      what the card is for; asking again for the key that is up
//              leaves the card exactly as it is
//     anchor   an element or a DOMRect (viewport coordinates)
//     content  { summary?, title?, detail?, body?, picture?, live?, width? }
//              — or a function giving that (or null: no card), called only
//              when the card is about to show
//                summary  SummaryCard content: shown plain under the picture,
//                         in place of title, detail and body
//                picture  a url; live: an element lent to the card (scaled
//                         to its width) — either makes the card 480 wide,
//                         without them it is 320
//     root     the .mf-root to draw in (default: the anchor's nearest one)
//     above    centred over the anchor instead of beside it
//   HoverCard.hide()        at once, without a fade
//   HoverCard.key           what the card that is up is for, or null
//
// Timing: the first card after 0.45 s of rest, fading in over 0.12 s; while
// one is up (or within 0.4 s of one going) the next comes after 0.08 s with
// no fade, as tooltips do down a list, and the one that is up stays until
// it is replaced. It goes when the page loses focus.
//
// Placement: 8 right of the anchor, centred on it, kept 8 inside the
// viewport; to the anchor's left when it would run off the right.

import { h, Motion, animate, clamp } from '../core/util.js';
import { truncateMiddle } from '../core/measure.js';
import { SummaryCard } from '../grid/summarycard.js';

const DELAY = 450;
const WARM_DELAY = 80;
const WARM_FOR = 400;
const PAD = 12;

let card = null;        // the element that is up
let shown = null;       // its request
let pending = null;     // the request waiting on its delay
let timer = 0;
let hiddenAt = -Infinity;
let lent = null;        // a live element, to hand back
let watching = false;

const rectOf = (anchor) => (anchor instanceof Element ? anchor.getBoundingClientRect() : anchor);

function rootOf(req) {
  if (req.root) return req.root;
  const near = req.anchor instanceof Element ? req.anchor.closest('.mf-root') : null;
  return near ?? document.querySelector('.mf-root') ?? document.body;
}

function onBlur() {
  HoverCard.hide();
}
function watch(on) {
  if (on === watching || typeof window === 'undefined') return;
  watching = on;
  if (on) window.addEventListener('blur', onBlur);
  else window.removeEventListener('blur', onBlur);
}

function take() {
  if (lent) {
    if (lent.el.parentNode === lent.box) lent.el.remove();
    lent.el.style.transform = lent.transform;
    lent.el.style.transformOrigin = lent.origin;
    lent = null;
  }
  card?.remove();
  card = null;
}

function place(el, req) {
  const r = rectOf(req.anchor);
  if (!r) return;
  const w = el.offsetWidth, ht = el.offsetHeight;
  const vw = document.documentElement.clientWidth, vh = document.documentElement.clientHeight;
  let x = r.right + 8;
  let y = clamp(r.top + r.height / 2 - ht / 2, 8, Math.max(8, vh - ht - 8));
  if (x + w > vw - 8) x = Math.max(8, r.left - w - 8);
  if (req.above) {
    x = clamp(r.left + r.width / 2 - w / 2, 8, Math.max(8, vw - w - 8));
    y = Math.max(8, r.top - 8 - ht);
  }
  el.style.left = Math.round(x) + 'px';
  el.style.top = Math.round(y) + 'px';
}

function build(c, width) {
  const el = h('div.mf-hovercard.mf-float', { style: { width: width + 'px' } });
  const pictured = !!(c.picture || c.live);
  if (c.live) {
    el.append(h('div.mf-hovercard-live', { style: { maxHeight: 0.72 * width + 'px' } }));
  } else if (c.picture) {
    const img = h('img', { src: c.picture, alt: '', draggable: false });
    // A picture that arrives late is laid into the card, which is placed again.
    img.addEventListener('load', () => { if (card === el && shown) place(el, shown); });
    el.append(h('div.mf-hovercard-picture', { style: { maxHeight: 0.7 * width + 'px' } }, img));
  }
  if (c.summary) {
    // Its own thumbnail goes when the card has the picture already.
    const content = pictured ? { ...c.summary, picture: undefined } : c.summary;
    const summary = new SummaryCard(content, { plain: true });
    summary.el.style.height = SummaryCard.heightFor(content) + 'px';
    el.append(summary.el);
  } else {
    const inner = width - 2 * PAD - 4;
    const text = h('div.mf-hovercard-text');
    text.append(h('div.mf-hovercard-title', truncateMiddle(String(c.title ?? ''), inner, 'title')));
    if (c.detail) text.append(h('div.mf-hovercard-detail', truncateMiddle(String(c.detail), inner, 'detail')));
    if (c.body && !pictured) text.append(h('div.mf-hovercard-body', String(c.body)));
    el.append(text);
  }
  return el;
}

function show(req, fade) {
  let c = req.content;
  if (typeof c === 'function') c = c();
  const r = rectOf(req.anchor);
  // Nothing to say, or nothing left to say it beside.
  if (!c || !r || (req.anchor instanceof Element && !req.anchor.isConnected)) {
    HoverCard.hide();
    return;
  }
  take();
  const width = c.width ?? (c.picture || c.live ? 480 : 320);
  const el = build(c, width);
  rootOf(req).append(el);
  if (c.live) {
    // Lent to the card for as long as it's up, scaled to its width.
    const box = el.firstChild;
    lent = { el: c.live, box, transform: c.live.style.transform, origin: c.live.style.transformOrigin };
    box.append(c.live);
    const lw = c.live.offsetWidth, lh = c.live.offsetHeight;
    if (lw > 0 && Math.abs(lw - width) > 0.5) {
      const s = width / lw;
      c.live.style.transformOrigin = '0 0';
      c.live.style.transform = `scale(${s})`;
      box.style.height = Math.min(0.72 * width, lh * s) + 'px';
    }
  }
  card = el;
  shown = req;
  place(el, req);
  if (fade) animate(el, [{ opacity: 0 }, { opacity: 1 }], { duration: Motion.fast, easing: Motion.appear });
}

export const HoverCard = {
  /** What the card that is up is for (a request's key), or null. */
  get key() {
    return card && shown ? shown.key ?? null : null;
  },

  request(req) {
    if (!req || req.anchor == null) return;
    // The same thing's card, up already: left as it is.
    if (card && shown && req.key != null && shown.key === req.key) {
      clearTimeout(timer);
      pending = null;
      return;
    }
    if (pending && req.key != null && pending.key === req.key) {
      pending = req;
      return;
    }
    clearTimeout(timer);
    const warm = !!card || performance.now() - hiddenAt < WARM_FOR * Motion.slowdown;
    pending = req;
    watch(true);
    timer = setTimeout(() => {
      const p = pending;
      pending = null;
      if (p) show(p, !warm);
    }, (warm ? Math.min(DELAY, WARM_DELAY) : DELAY) * Motion.slowdown);
  },

  hide() {
    clearTimeout(timer);
    pending = null;
    if (card) hiddenAt = performance.now();
    take();
    shown = null;
    watch(false);
  },
};
