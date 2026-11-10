// A space as a card (Manifold's SpaceSwitcherView.Card): its square and
// name, a dot for what most wants you there, its grid in miniature — its
// tiles in their columns at their sizes, each its last picture (else its
// symbol and name), the focused one ringed — and a line under it for its
// host and what's docked. The cards ⌘` shows are these (spaceswitcher.js);
// one alone, in the popover look, is what a space's square shows when the
// pointer rests on it (`spacePeek`).
//
//   const card = new SpaceCard(space, { chosen })   // card.el: 236 × 176, positioned absolutely
//   card.chosen = true                              // a band and a ring of the space's own colour
//   card.space = space                              // redrawn for it
//   spacePeek(space) → element                      // 272 × 212, positioned absolutely by whoever shows it
//
// space = {
//   id, name, color /* a CSS colour */, symbol? /* else its letter */, letter,
//   status?: 'needsYou' | 'failed' | 'done' | 'working',
//   footer? /* "This Mac · 2 docked" */,
//   tiles: [{ id, title, symbol, rect: {x, y, w, h} /* in the unit square, y down */,
//             focused?, tone?: 'attention' | 'failed' | 'done' | 'running', picture? /* url */ }]
// }

import { h } from '../core/util.js';
import { icon } from '../icons/icons.js';

const CARD = { w: 236, h: 176 };
const INSET = 10;
const SQUARE = 20;
const MAP_TOP = INSET + SQUARE + 8;
const BAR = 12;

const STATUS = new Set(['needsYou', 'failed', 'done', 'working']);
const TONES = new Set(['attention', 'failed', 'done', 'running']);

const px = (v) => `${+v.toFixed(2)}px`;

/** The grid in miniature, `w` × `h`: each tile where it is, as much of it as fits. */
function miniMap(space, w, hgt) {
  const tiles = space.tiles ?? [];
  const map = h('div.mf-space-map', { style: { height: hgt + 'px' } });
  if (!tiles.length) {
    map.classList.add('mf-empty-space');
    map.append(h('span', 'Empty'));
    return map;
  }
  for (const t of tiles) {
    const r = t.rect ?? { x: 0, y: 0, w: 1, h: 1 };
    // Its real proportions, inset 1.5: 3 between neighbours.
    const f = { x: r.x * w + 1.5, y: r.y * hgt + 1.5, w: r.w * w - 3, h: r.h * hgt - 3 };
    if (!(f.w > 4) || !(f.h > 3)) continue;
    const bar = Math.min(BAR, f.h);
    const el = h('div.mf-space-tile', { style: { left: px(f.x), top: px(f.y), width: px(f.w), height: px(f.h) } });
    const pictured = !!t.picture && f.h > bar + 4;
    // Its picture, cut to fill, hung from the body's top-left; then its bar's line over the top.
    if (pictured) el.append(h('div.mf-space-tile-body', { style: { top: px(bar) } }, h('img', { src: t.picture, alt: '', draggable: false })));
    el.append(h('div.mf-space-tile-bar', { style: { height: px(bar) } }));
    const symbol = t.symbol ?? 'square.dashed';
    if (f.w > 22) {
      el.append(h('span.mf-space-tile-symbol', { style: { height: px(bar) } }, icon(symbol, { size: 7, weight: 'semibold' })));
      if (f.w > 40) el.append(h('span.mf-space-tile-title', { style: { width: px(f.w - 18) } }, t.title ?? ''));
    }
    if (!t.picture && f.h > 30) el.append(h('div.mf-space-tile-body.mf-space-tile-mark', { style: { top: px(bar) } }, icon(symbol, { size: 14 })));
    // The focused one ringed — where there's another to tell it from; else how it stands.
    if (t.focused && tiles.length > 1) el.classList.add('mf-focused');
    else if (TONES.has(t.tone)) el.classList.add(`mf-tone-${t.tone}`);
    map.append(el);
  }
  return map;
}

/** One space as a card: its square, name, status dot, a miniature of its grid, a footer line. */
export class SpaceCard {
  static size = CARD;

  constructor(space, { chosen = false } = {}) {
    this.el = h('div.mf-space-card');
    this._chosen = false;
    this.chosen = chosen;
    this.space = space;
  }

  get chosen() {
    return this._chosen;
  }

  /** Chosen: a band of the space's colour under it and a ring of it round it. */
  set chosen(v) {
    this._chosen = !!v;
    this.el.classList.toggle('mf-chosen', this._chosen);
  }

  get space() {
    return this._space;
  }

  set space(space) {
    this._space = space;
    const el = this.el;
    el.dataset.space = space.id ?? '';
    el.style.setProperty('--mf-space-color', space.color ?? 'var(--mf-accent)');
    const status = STATUS.has(space.status) ? space.status : null;
    const glyph = space.symbol
      ? icon(space.symbol, { size: 9.5, weight: 'semibold' })
      : h('span.mf-space-letter', space.letter ?? (space.name ?? '').trim().slice(0, 1).toUpperCase());
    // Under the map, a line (host, what's docked) takes 18; none, 6.
    const foot = space.footer ? 18 : 6;
    const mapHeight = CARD.h - MAP_TOP - INSET - foot;
    el.replaceChildren(
      h('span.mf-space-square', glyph),
      h('span.mf-space-name' + (status ? '.mf-with-status' : ''), space.name ?? ''),
      status ? h(`span.mf-space-status.mf-space-status-${status}`) : '',
      miniMap(space, CARD.w - 2 * INSET, mapHeight),
      space.footer ? h('span.mf-space-footer', { style: { top: MAP_TOP + mapHeight + 4 + 'px' } }, space.footer) : '',
    );
  }
}

/** A single card in the popover look, padded 18 all round (272 × 212): what
 *  a space's square shows when the pointer rests on it. Positioned
 *  absolutely; whoever shows it places and removes it. */
export function spacePeek(space) {
  const card = new SpaceCard(space);
  return h('div.mf-popover.mf-space-peek', card.el);
}
