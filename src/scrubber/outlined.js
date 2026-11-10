// What most tiles put in their body: a scrolling content, its outline's
// strip at the right, and — when asked for (⌘/) — its sidebar at the left.

import { h } from '../core/util.js';
import { bindScrollStrip } from './strip.js';
import { TileSidebar } from './tilesidebar.js';

/** Wraps a scrollable content element with its outline strip at the right and (toggled) its sidebar at the left. */
export class OutlinedView {
  #shown = false;
  #observer = null;
  #offWidth = null;

  constructor({
    content, outline, tops, policy = 'document', preview = null, emptyText,
    onDragItem = null, onDragItems = null, onMenu = null, cardRoot = null,
  } = {}) {
    this.content = content;
    this.outline = outline;
    content.classList.add('mf-outlined-content');
    // The content is 14 short of the width (the scroll bar's column); the ticks' lane lies over its last 16.
    this.main = h('div.mf-outlined-main', content);
    this.binding = bindScrollStrip(content, { outline, tops, policy, preview, onDragItem, cardRoot });
    this.strip = this.binding.strip;
    this.main.append(this.strip.el);
    this.sidebar = new TileSidebar({ outline, emptyText, onDragItems, onMenu });
    this.el = h('div.mf-outlined', this.main);

    this.#offWidth = TileSidebar.onWidth(() => this.#layout());
    if (typeof ResizeObserver !== 'undefined') {
      this.#observer = new ResizeObserver(() => this.#layout());
      this.#observer.observe(this.el);
    }
  }

  get sidebarShown() {
    return this.#shown;
  }
  set sidebarShown(on) {
    on = !!on;
    if (on === this.#shown) return;
    this.#shown = on;
    // At once: the content is laid out again, nothing glides.
    if (on) this.el.insertBefore(this.sidebar.el, this.main);
    else this.sidebar.el.remove();
    this.#layout();
  }

  toggleSidebar() {
    this.sidebarShown = !this.#shown;
    return this.#shown;
  }

  /** Call when the content or the outline changed. */
  update() {
    this.binding.update();
  }

  destroy() {
    this.#observer?.disconnect();
    this.#offWidth?.();
    this.binding.destroy();
    this.sidebar.destroy();
    this.content.classList.remove('mf-outlined-content');
    this.el.remove();
  }

  #layout() {
    const taken = this.#shown ? this.sidebar.layout(this.el.clientWidth) : 0;
    this.main.style.left = `${taken}px`;
    this.binding.update();
  }
}
