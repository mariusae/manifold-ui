// A tile in a few lines: its symbol, title and place, how it stands, up to
// three lines of what's in it, a picture, its progress (Manifold's
// SummaryCard). The same summary is everywhere a tile is shown small — in
// its own body when it's too short for its content, under a link's face,
// beside a sidebar row.
//
// content: {
//   symbol, title, place?,
//   note?, tone?: 'plain'|'running'|'done'|'failed'|'attention',
//   lines?: string[], code?: boolean,
//   picture?: url, progress?: 0…100, age?: string, status?: (see statusmark)
// }

import { h, clear } from '../core/util.js';
import { icon } from '../icons/icons.js';
import { statusMark, StatusPill, Shimmer, pill } from '../status/statusmark.js';
import { measure } from '../core/measure.js';

const QUIET = new Set(['running', 'working', 'searching']);

export class SummaryCard {
  static height = 88;
  static width = 280;

  /** A card's height for its content: 88 at most, and always with a picture. */
  static heightFor(content) {
    if (content.picture) return SummaryCard.height;
    const lines = Math.min(content.lines?.length ?? 0, 3);
    return Math.min(SummaryCard.height, 10 + 21 + lines * 16 + 8);
  }

  /**
   * @param {object} content
   * @param {object} options
   *   inTile  standing in for a tile's content, under its bar: lines only,
   *           on the tile's ground, square under the bar and rounded below
   *   plain   no fill, edge or shadow of its own (inside a hover card)
   */
  constructor(content, { inTile = false, plain = false, onClick = null } = {}) {
    this.el = h('div.mf-summary');
    this.inTile = inTile;
    this.plain = plain;
    if (inTile) this.el.classList.add('mf-in-tile');
    if (plain) this.el.classList.add('mf-plain');
    this.onClick = onClick;
    // Where it stands in for a tile it's clicked to go there — on the press.
    this.el.addEventListener('pointerdown', (e) => {
      if (!this.onClick || e.button !== 0) return;
      e.stopPropagation();
      this.onClick(e);
    });
    this.content = content;
  }

  get content() {
    return this._content;
  }

  set content(c) {
    this._content = c;
    this.render();
  }

  set chosen(on) {
    this.el.classList.toggle('mf-chosen', !!on);
  }

  render() {
    const c = this._content ?? {};
    const el = clear(this.el);
    el.classList.toggle('mf-clickable', !!this.onClick);
    this.shimmer?.set(false);
    const mark = statusMark(c.status);
    const head = h('div.mf-summary-head');
    if (c.symbol) head.append(h('span.mf-summary-symbol', icon(c.symbol, { size: 13, weight: 'medium' })));
    const title = h('span.mf-summary-title', h('span.mf-summary-name', c.title ?? ''), c.place ? h('span.mf-summary-place', c.place) : null);
    head.append(title);
    // At the title's right: what it last did, its status, how long ago.
    const statusPill = new StatusPill();
    statusPill.set(mark.pill);
    let note = c.note;
    let tone = c.tone ?? 'plain';
    if (mark.pill || mark.shimmer) {
      tone = 'plain';
      if (note && QUIET.has(note.toLowerCase())) note = null;
    }
    if (note) head.append(h(`span.mf-summary-note.mf-tone-${tone}`, note));
    if (mark.pill) {
      statusPill.el.style.width = statusPill.wanted(measure).w + 'px';
      head.append(statusPill.el);
    }
    if (c.age) head.append(pill(c.age));
    const text = h('div.mf-summary-text', head);
    const lines = (c.lines ?? []).slice(0, 3);
    if (lines.length) {
      text.append(h('div.mf-summary-lines' + (c.code ? '.mf-code' : ''), lines.map((l) => h('div.mf-summary-line', l))));
    }
    el.append(text);
    if (c.picture && !this.inTile) el.append(h('img.mf-summary-picture', { src: c.picture, draggable: false, alt: '' }));
    if (c.progress != null) {
      el.append(h('div.mf-summary-progress', h('div.mf-summary-progress-bar', { style: { width: `max(2px, ${Math.min(Math.max(c.progress, 0), 100)}%)` } })));
    }
    if (mark.shimmer) {
      this.shimmer = new Shimmer(title);
      // Fitted once it's in the page and has a width.
      requestAnimationFrame(() => this.shimmer?.set(true));
    } else {
      this.shimmer = null;
    }
  }
}
