// Toasts (ToastView.swift): a word at the foot of the window about
// something just done — and, often, one action that undoes it. Styles in
// css/toast.css.
//
//   const toasts = new Toasts({
//     stage,                       // the element the window's one toast is centred in, 14 above its foot
//     stack = null,                // the element (in the sidebar's foot) that holds the stacked ones, or null
//     sidebarShown = () => false,  // whether the sidebar is showing now
//     revealSidebar = () => {},    // brings it out, for a toast that must be seen there
//   })
//   toasts.say(text, { seconds = 6 })     // words that only tell: no button (a × under the pointer)
//   toasts.show(text, { action = 'Undo', seconds = 8, countdown = false, then = null, onAction = null })
//       `action`: the button's name ('' or 'OK': none); `onAction()`: what it does.
//       `countdown`: the time left shown as a shading that draws back to the left.
//       `then()`: what waits on its time (a deletion) — done when the time is up
//       or the toast is put away or replaced, at once (not after the fade);
//       not done if the action is taken.
//   toasts.hide()            // the newest, put away (its `then` done)
//   toasts.nudge()           // the newest shaken: said again, it didn't take
//   toasts.undoNewest()      // ⌘Z: the newest counting "Undo" toast's action; false if there's none
//   toasts.finishPending()   // every waiting `then` done now (the page going away)
//   toasts.isHidden
//
// Where one goes: into the sidebar's stack if the sidebar is showing, or
// if it waits to do something (a `then`: each such must be seen, so the
// sidebar is brought out for it); else it is the one at the window's foot,
// taking the place of whatever was there (whose `then` is done at once).
// In the stack the oldest is on top, 6 apart; words said again replace
// their toast there, unless either waits to do something.
//
// Time: a toast stays `seconds`, held while the pointer is on it — it
// then has at least half a second after the pointer leaves — and fades
// out over Motion.fast. It rises (8px, fading in over Motion.base) only
// when it arrives, not when its words are changed in place.

import { h, Motion, animate } from '../core/util.js';
import { iconButton } from '../icons/icons.js';
import { flatButton } from './flat.js';

/** An animation's end — or, where no frames are drawn to end it (a page in the background), the time it would have taken. */
const ended = (a, ms) => Promise.race([a.done, new Promise((r) => setTimeout(r, ms + 80))]);

/** `text` with its middle left out, the longest that fits (`fits(s)` says). */
function cutMiddle(text, fits) {
  const chars = Array.from(text);
  let lo = 0, hi = chars.length - 1, best = '…';
  while (lo <= hi) {
    const n = (lo + hi) >> 1;
    const head = Math.ceil(n / 2), tail = n - head;
    const s = chars.slice(0, head).join('').trimEnd() + '…' + chars.slice(chars.length - tail).join('').trimStart();
    if (fits(s)) { best = s; lo = n + 1; } else hi = n - 1;
  }
  return best;
}

/** One toast: hidden · running · held (the pointer on it) · leaving (fading out). */
class Toast {
  constructor({ compact = false } = {}) {
    this.compact = compact;
    this.bar = h('div.mf-toast-bar');
    this.track = h('div.mf-toast-track', { hidden: true }, this.bar);
    this.label = h('span.mf-toast-label');
    this.button = flatButton({ title: '', onClick: () => this.act() });
    this.dismiss = iconButton('xmark', { size: 9, weight: 'semibold', tip: 'Dismiss', className: 'mf-toast-dismiss', onClick: () => this.hide() });
    this.el = h('div.mf-toast.mf-float', { hidden: true, role: 'status' }, this.track, this.label, this.button, this.dismiss);
    if (compact) this.el.classList.add('mf-compact');
    this.text = '';
    this.name = '';
    this.action = null;
    this.then = null;
    this.hidden = true;
    this.leaving = false;
    this.counting = false;
    this.total = 0;
    this.remaining = 0;
    this.runningSince = null;
    this.pointerOn = false;
    this.timer = 0;
    this.countdown = null;
    this.fade = null;
    /** Each show, counted: a fade-out begun before the latest one ends without hiding it. */
    this.shows = 0;
    /** Gone: for a stack of them to let it go. */
    this.onGone = null;
    this.el.addEventListener('mouseenter', () => {
      this.pointerOn = true;
      if (!this.hidden && !this.leaving) this.freeze();
    });
    this.el.addEventListener('mouseleave', () => {
      this.pointerOn = false;
      if (!this.hidden && !this.leaving && !this.timer) this.run();
    });
  }

  /** Waiting to do something when its time's up. */
  get isPending() { return this.then != null; }
  /** Whether ⌘Z is its button's: an Undo, counting down or waiting. */
  get undoes() { return !this.hidden && !this.leaving && this.name === 'Undo' && (this.isPending || this.counting); }

  show(text, { action = 'Undo', seconds = 8, countdown = false, then = null, onAction = null } = {}) {
    // One waiting on its time: done now, as this takes its place.
    this.finishPending();
    this.shows += 1;
    const arriving = this.hidden;
    this.text = String(text ?? '');
    // "OK" only put it away: no button for that (it goes by itself, or ×).
    this.name = !action || action === 'OK' ? '' : action;
    this.button.setTitle(this.name);
    this.button.hidden = !this.name;
    this.el.classList.toggle('mf-no-action', !this.name);
    this.action = onAction;
    this.then = then;
    clearTimeout(this.timer);
    this.timer = 0;
    this.runningSince = null;
    // Shown again while fading out: it stays.
    this.fade?.cancel();
    this.fade = null;
    this.leaving = false;
    this.hidden = false;
    this.el.hidden = false;
    this.fit();
    if (arriving) {
      this.pointerOn = this.el.matches(':hover');
      this.rise();
    }
    this.counting = !!countdown;
    this.track.hidden = !this.counting;
    this.countdown?.cancel();
    this.countdown = null;
    this.total = this.remaining = Math.max(0, Number(seconds) || 0);
    if (!this.pointerOn) this.run(); else this.freeze();
  }

  /** Its words, all of them its tooltip; at the window's foot, cut in the middle past what there's room for. */
  fit() {
    const label = this.label;
    label.title = this.text;
    label.textContent = this.text;
    if (this.compact) return;
    const fits = () => label.scrollWidth <= label.clientWidth;
    if (label.clientWidth > 0 && !fits()) label.textContent = cutMiddle(this.text, (s) => { label.textContent = s; return fits(); });
  }

  /** The time left running down from here: its end to come, the bar shrinking to nothing by then. */
  run() {
    this.runningSince = performance.now();
    clearTimeout(this.timer);
    this.timer = setTimeout(() => { this.timer = 0; this.hide(); }, this.remaining * 1000);
    if (!this.counting) return;
    this.countdown?.cancel();
    this.bar.style.transform = 'scaleX(0.0001)';
    this.countdown = this.bar.animate(
      [{ transform: `scaleX(${this.remaining / Math.max(this.total, 0.01)})` }, { transform: 'scaleX(0)' }],
      { duration: this.remaining * 1000, easing: 'linear' });
  }

  /** Held where it is (the pointer on it): at least half a second left once the pointer goes. */
  freeze() {
    clearTimeout(this.timer);
    this.timer = 0;
    if (this.runningSince != null) this.remaining = Math.max(0.5, this.remaining - (performance.now() - this.runningSince) / 1000);
    this.runningSince = null;
    if (!this.counting) return;
    this.countdown?.cancel();
    this.countdown = null;
    this.bar.style.transform = `scaleX(${this.remaining / Math.max(this.total, 0.01)})`;
  }

  /** What waits on its time, done now. */
  finishPending() {
    const t = this.then;
    if (!t) return;
    this.then = null;
    t();
  }

  /** Coming up from the foot as it fades in (only fading, with less motion asked for). */
  rise() {
    animate(this.el, [
      { opacity: 0, transform: `translateY(${Motion.distance(8)}px)` },
      { opacity: 1, transform: 'translateY(0)' },
    ], { duration: Motion.base, easing: Motion.appear });
  }

  /** Said again while it's up: a shake, as a refused password's field gives (a blink, with less motion). */
  nudge() {
    if (this.hidden) return;
    const frames = Motion.reduced
      ? [1, 0.5, 1].map((o) => ({ opacity: o }))
      : [0, -7, 7, -5, 5, -2, 0].map((x) => ({ transform: `translateX(${x}px)` }));
    animate(this.el, frames, { duration: 320 * Motion.slowdown, easing: 'ease-out' });
  }

  /** Put away: what waits on its time done now — not after the fade. */
  hide() {
    clearTimeout(this.timer);
    this.timer = 0;
    this.runningSince = null;
    this.countdown?.cancel();
    this.countdown = null;
    this.bar.style.transform = 'scaleX(0.0001)';
    this.finishPending();
    if (this.hidden || this.leaving) return;
    this.leaving = true;
    const leaving = this.shows;
    const a = animate(this.el, [{ opacity: 0 }], { duration: Motion.fast, fill: 'forwards' });
    this.fade = a;
    ended(a, Motion.fast).then(() => {
      // Shown again meanwhile (its action said something): it stays.
      if (this.shows !== leaving) return;
      this.hidden = true;
      this.leaving = false;
      this.pointerOn = false;
      this.el.hidden = true;
      a.cancel();
      this.fade = null;
      this.onGone?.();
    });
  }

  /** Its action taken (Undo): what waited on its time isn't done. */
  act() {
    const a = this.action;
    this.then = null;
    this.hide();
    a?.();
  }
}

export class Toasts {
  constructor({ stage, stack = null, sidebarShown = () => false, revealSidebar = () => {} } = {}) {
    this.stage = stage;
    this.stack = stack;
    this.sidebarShown = sidebarShown;
    this.revealSidebar = revealSidebar;
    /** The one at the window's foot. */
    this.window = new Toast();
    this.dock = h('div.mf-toast-dock', this.window.el);
    stage.append(this.dock);
    /** The sidebar's, oldest first. */
    this.stacked = [];
    stack?.classList.add('mf-toast-stack');
  }

  get sidebarToasts() { return this.stacked.filter((t) => !t.hidden); }
  /** The newest up. */
  get latest() {
    const s = this.sidebarToasts;
    return s[s.length - 1] ?? (this.window.hidden ? null : this.window);
  }
  get isHidden() { return this.latest == null; }

  /** Words that only tell: no button (they go by themselves, or ×). */
  say(text, { seconds = 6 } = {}) {
    this.show(text, { action: '', seconds });
  }

  show(text, { action = 'Undo', seconds = 8, countdown = false, then = null, onAction = null } = {}) {
    const options = { action, seconds, countdown, then, onAction };
    // One that waits to do something is never put in another's place: each
    // its own, stacked in the sidebar — brought out for it if it's away.
    const pending = then != null;
    if (pending && this.stack && !this.sidebarShown()) this.revealSidebar();
    if (!this.stack || !(pending || this.sidebarShown())) {
      this.window.show(text, options);
      return;
    }
    // The same words again, up already: that one's, not another (unless
    // either waits to do something: "Deleted “Untitled”" twice is two).
    if (!pending) this.sidebarToasts.find((t) => t.text === String(text ?? '') && !t.isPending)?.hide();
    const t = new Toast({ compact: true });
    t.onGone = () => {
      t.el.remove();
      this.stacked = this.stacked.filter((x) => x !== t);
    };
    this.stacked.push(t);
    this.stack.append(t.el);
    t.show(text, options);
  }

  hide() { this.latest?.hide(); }
  nudge() { this.latest?.nudge(); }

  /** ⌘Z while an Undo's toast counts down: that undone, as its button would. False if none's up. */
  undoNewest() {
    const all = [...this.sidebarToasts, this.window];
    for (let i = all.length - 1; i >= 0; i--) {
      if (!all[i].undoes) continue;
      all[i].act();
      return true;
    }
    return false;
  }

  /** Every `then` that waits, done now. */
  finishPending() {
    this.window.finishPending();
    for (const t of this.stacked) t.finishPending();
  }
}
