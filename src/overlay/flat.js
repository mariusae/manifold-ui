// The flat controls (Manifold's Flat.swift; styles in css/flat.css): a
// capsule button, a text field's box, a row of segments, a chip, a
// checkbox and a slider. Plain elements, made by functions; nothing here
// keeps a listener outside its own element except while a slider is dragged.
//
//   flatButton({ title, symbol, primary, toggles, on, disabled, spins, tip, onClick }) → <button>
//       A capsule 24 high. `primary`: filled in the accent, white words.
//       `toggles`: a click turns it on and off (on is a deeper grey, not the
//       accent); `onClick(event, on)`. The element also has `.on` (get/set),
//       `.setOn(v)`, `.setTitle(s)`, `.setSymbol(name)`, `.setSpins(v)`,
//       `.setDisabled(v)`. A click on it leaves the keyboard where it was.
//
//   flatField({ placeholder, glyph = 'magnifyingglass', value, width, onChange, onCommit, onEscape })
//       → { el, input, value (get/set), clear(), focus() }
//       A box 28 high (160 wide unless `width`), its edge in the accent
//       while its field has the keyboard, a × to clear it once there's
//       something in it. `glyph: null` for none. `onChange(value)` as it's
//       typed or cleared; `onCommit(value)` on Return; Esc empties it first
//       (and stays), and only when empty calls `onEscape(event)`.
//
//   flatSegments({ items: [{ title?, symbol?, tooltip? }], selected = 0, onChange })
//       → { el, select(i), selected (get) }
//       One of a few. Chosen on mouse-down; `onChange(i)` for clicks only,
//       not for `select(i)`. The chosen capsule glides from the old segment
//       to the new over Motion.base (not with less motion asked for).
//
//   chip({ title, on, onToggle }) → <button>   (fires on mouse-down; `.on`, `.setOn(v)`)
//   chipGroup({ titles, selected = 0, onChange }) → { el, select(i), selected }   (exactly one on)
//
//   flatCheckbox({ title, checked, disabled, onChange }) → { el, checked (get/set), setDisabled(v) }
//   flatSlider({ min = 0, max = 1, value, step = 0, continuous = true, disabled, width, onChange })
//       → { el, value (get/set), setDisabled(v) }
//       `continuous: false` reports once, on release. Arrow keys step it.

import { h, Motion, animate, clamp } from '../core/util.js';
import { icon } from '../icons/icons.js';

/** A press that doesn't take the keyboard from whatever has it (as AppKit's buttons don't). */
const keepFocus = (e) => { if (e.button === 0) e.preventDefault(); };

// --------------------------------------------------------------- button

export function flatButton({ title = '', symbol = null, primary = false, toggles = false, on = false, disabled = false,
  spins = false, tip = null, onClick = null } = {}) {
  const b = h('button.mf-button', { type: 'button' });
  if (primary) b.classList.add('mf-button-primary');
  if (tip) b.title = tip;
  let isOn = !!(toggles && on);
  const draw = () => {
    b.replaceChildren();
    if (symbol) b.append(h('span.mf-button-symbol', icon(symbol, { size: 11, weight: 'medium' })));
    if (title) b.append(h('span.mf-button-title', title));
    b.classList.toggle('mf-symbol-only', !title);
    b.classList.toggle('mf-spins', !!(spins && symbol));
    if (!title && tip) b.setAttribute('aria-label', tip);
  };
  const showOn = () => {
    b.classList.toggle('mf-on', isOn);
    if (toggles) b.setAttribute('aria-pressed', String(isOn));
  };
  draw();
  showOn();
  b.disabled = !!disabled;
  b.addEventListener('mousedown', keepFocus);
  b.addEventListener('click', (e) => {
    if (b.disabled) return;
    if (toggles) { isOn = !isOn; showOn(); }
    onClick?.(e, isOn);
  });
  Object.defineProperty(b, 'on', { get: () => isOn, set: (v) => b.setOn(v) });
  b.setOn = (v) => { isOn = !!v; showOn(); };
  b.setTitle = (s) => { title = s ?? ''; draw(); };
  b.setSymbol = (s) => { symbol = s; draw(); };
  b.setSpins = (v) => { spins = !!v; draw(); };
  b.setDisabled = (v) => { b.disabled = !!v; };
  return b;
}

// ----------------------------------------------------------------- chip

export function chip({ title = '', on = false, onToggle = null } = {}) {
  const b = h('button.mf-chip', { type: 'button' }, title);
  let isOn = !!on;
  const show = () => { b.classList.toggle('mf-on', isOn); b.setAttribute('aria-pressed', String(isOn)); };
  show();
  const toggle = () => { isOn = !isOn; show(); onToggle?.(isOn); };
  // On the way down, as a link: it never looks pressed.
  b.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    toggle();
  });
  // The keyboard's (a click with no press behind it).
  b.addEventListener('click', (e) => { if (e.detail === 0) toggle(); });
  Object.defineProperty(b, 'on', { get: () => isOn, set: (v) => b.setOn(v) });
  b.setOn = (v) => { isOn = !!v; show(); };
  return b;
}

/** Chips in place of a segmented control: exactly one on. */
export function chipGroup({ titles = [], selected = 0, onChange = null } = {}) {
  let at = selected;
  const chips = titles.map((t, i) => chip({
    title: t,
    on: i === at,
    onToggle: () => {
      const was = at;
      api.select(i);
      if (was !== i) onChange?.(i);
    },
  }));
  const el = h('div.mf-chip-group', { role: 'group' }, chips);
  const api = {
    el,
    get selected() { return at; },
    select(i) {
      at = clamp(i, 0, Math.max(0, chips.length - 1));
      chips.forEach((c, j) => c.setOn(j === at));
    },
  };
  return api;
}

// ---------------------------------------------------------------- field

export function flatField({ placeholder = '', glyph = 'magnifyingglass', value = '', width = null,
  onChange = null, onCommit = null, onEscape = null } = {}) {
  const input = h('input.mf-field-input', {
    type: 'text', placeholder, value, autocomplete: 'off', autocapitalize: 'off',
  });
  input.spellcheck = false;
  input.setAttribute('autocorrect', 'off');
  const clearButton = h('button.mf-field-clear', { type: 'button', title: 'Clear', tabIndex: -1 }, icon('xmark', { size: 10, weight: 'semibold' }));
  const el = h('div.mf-field',
    glyph ? h('span.mf-field-glyph', icon(glyph, { size: 12, weight: 'regular' })) : null,
    input, clearButton);
  if (!glyph) el.classList.add('mf-no-glyph');
  if (width != null) el.style.width = typeof width === 'number' ? width + 'px' : width;
  const update = () => el.classList.toggle('mf-has-text', input.value !== '');
  const clear = () => {
    if (input.value === '') return;
    input.value = '';
    update();
    onChange?.('');
  };
  update();
  input.addEventListener('input', () => { update(); onChange?.(input.value); });
  input.addEventListener('keydown', (e) => {
    if (e.isComposing) return;
    if (e.key === 'Escape') {
      if (input.value !== '') {
        e.preventDefault();
        e.stopPropagation();
        clear();
      } else onEscape?.(e);
    } else if (e.key === 'Enter') {
      onCommit?.(input.value, e);
    }
  });
  // A click anywhere in the box is the field's.
  el.addEventListener('mousedown', (e) => {
    if (e.target === input) return;
    e.preventDefault();
    if (!clearButton.contains(e.target)) input.focus();
  });
  clearButton.addEventListener('click', () => { clear(); input.focus(); });
  return {
    el,
    input,
    get value() { return input.value; },
    /** Set from outside: no `onChange`. */
    set value(v) { input.value = v ?? ''; update(); },
    clear,
    focus() { input.focus(); },
  };
}

// ------------------------------------------------------------- segments

// e = 1 − (1 − t)³, as a curve.
const EASE_OUT_CUBIC = 'cubic-bezier(0.3333, 1, 0.6667, 1)';

export function flatSegments({ items = [], selected = 0, onChange = null } = {}) {
  const band = h('div.mf-segments-band');
  const segments = items.map((item, i) => {
    const b = h('button.mf-segment', { type: 'button', role: 'radio', tabIndex: -1 });
    if (item.tooltip) b.title = item.tooltip;
    if (item.symbol && !item.title) {
      b.classList.add('mf-symbol');
      b.append(h('span.mf-segment-label', icon(item.symbol, { size: 12, weight: 'regular' })));
      if (item.tooltip) b.setAttribute('aria-label', item.tooltip);
    } else {
      b.append(h('span.mf-segment-size', item.title ?? ''), h('span.mf-segment-label', item.title ?? ''));
    }
    // Chosen on the way down, not up.
    b.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      choose(i);
    });
    b.addEventListener('click', (e) => { if (e.detail === 0) choose(i); });
    return b;
  });
  const el = h('div.mf-segments', { role: 'radiogroup' }, band, segments);
  let at = -1;
  let gliding = null;

  const show = () => segments.forEach((s, i) => {
    s.classList.toggle('mf-on', i === at);
    s.setAttribute('aria-checked', String(i === at));
    s.tabIndex = i === at ? 0 : -1;
  });
  const rectOfSegment = (i) => ({ x: segments[i].offsetLeft, w: segments[i].offsetWidth });
  /** Where the chosen capsule shows now: its segment's, or on its way. */
  const bandNow = (i) => {
    if (gliding) {
      const b = band.getBoundingClientRect(), o = el.getBoundingClientRect();
      return { x: b.left - o.left, w: b.width };
    }
    return rectOfSegment(i);
  };
  const glide = (from, to) => {
    gliding?.cancel();
    band.style.left = to.x + 'px';
    band.style.width = to.w + 'px';
    el.classList.add('mf-gliding');
    const a = animate(band, [{ left: from.x + 'px', width: from.w + 'px' }, { left: to.x + 'px', width: to.w + 'px' }],
      { duration: Motion.base, easing: EASE_OUT_CUBIC });
    gliding = a;
    a.done.then(() => {
      if (gliding !== a) return;
      gliding = null;
      el.classList.remove('mf-gliding');
    });
  };
  const select = (i) => {
    if (i === at || !segments[i]) return;
    const moves = at >= 0 && el.isConnected && !Motion.reduced && segments[at].offsetWidth > 0;
    const from = moves ? bandNow(at) : null;
    at = i;
    show();
    if (from) glide(from, rectOfSegment(i));
  };
  const choose = (i) => {
    if (i === at) return;
    select(i);
    onChange?.(i);
  };
  el.addEventListener('keydown', (e) => {
    const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!d || !segments.length) return;
    e.preventDefault();
    const next = clamp(at + d, 0, segments.length - 1);
    choose(next);
    segments[next].focus();
  });
  select(clamp(selected, 0, Math.max(0, segments.length - 1)));
  return { el, select, get selected() { return at; } };
}

// ------------------------------------------------------------- checkbox

export function flatCheckbox({ title = '', checked = false, disabled = false, onChange = null } = {}) {
  const box = h('span.mf-checkbox-box', icon('checkmark', { size: 9, weight: 'bold' }));
  const el = h('span.mf-checkbox', { role: 'checkbox', tabIndex: 0 }, box, title ? h('span.mf-checkbox-title', title) : null);
  let on = !!checked, off = !!disabled;
  const show = () => {
    el.classList.toggle('mf-on', on);
    el.classList.toggle('mf-disabled', off);
    el.setAttribute('aria-checked', String(on));
    el.setAttribute('aria-disabled', String(off));
    el.tabIndex = off ? -1 : 0;
  };
  const toggle = () => {
    if (off) return;
    on = !on;
    show();
    onChange?.(on);
  };
  show();
  el.addEventListener('mousedown', keepFocus);
  el.addEventListener('click', toggle);
  el.addEventListener('keydown', (e) => {
    if (e.key !== ' ' && e.key !== 'Enter') return;
    e.preventDefault();
    toggle();
  });
  return {
    el,
    get checked() { return on; },
    /** Set from outside: no `onChange`. */
    set checked(v) { on = !!v; show(); },
    setDisabled(v) { off = !!v; show(); },
  };
}

// --------------------------------------------------------------- slider

export function flatSlider({ min = 0, max = 1, value = min, step = 0, continuous = true, disabled = false, width = null,
  onChange = null } = {}) {
  const el = h('div.mf-slider', { role: 'slider', tabIndex: 0 },
    h('div.mf-slider-track', h('div.mf-slider-fill')), h('div.mf-slider-knob'));
  if (width != null) el.style.width = typeof width === 'number' ? width + 'px' : width;
  const KNOB = 13;
  let v = min, off = !!disabled;
  const snap = (x) => {
    let s = clamp(x, min, max);
    if (step > 0) s = clamp(min + Math.round((s - min) / step) * step, min, max);
    return s;
  };
  const show = () => {
    el.style.setProperty('--mf-slider-at', String(max > min ? (v - min) / (max - min) : 0));
    el.setAttribute('aria-valuemin', min);
    el.setAttribute('aria-valuemax', max);
    el.setAttribute('aria-valuenow', v);
    el.setAttribute('aria-disabled', String(off));
    el.classList.toggle('mf-disabled', off);
    el.tabIndex = off ? -1 : 0;
  };
  const set = (x, report) => {
    const next = snap(x);
    if (next === v) return false;
    v = next;
    show();
    if (report) onChange?.(v);
    return true;
  };
  v = snap(value);
  show();

  el.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || off) return;
    e.preventDefault();
    const r = el.getBoundingClientRect();
    const knobAt = r.left + KNOB / 2 + (max > min ? (v - min) / (max - min) : 0) * (r.width - KNOB);
    // Taken by the knob: it keeps its place under the pointer; elsewhere, it comes to the pointer.
    const grab = Math.abs(e.clientX - knobAt) <= KNOB / 2 ? e.clientX - knobAt : 0;
    const valueAt = (x) => min + clamp((x - grab - r.left - KNOB / 2) / Math.max(1, r.width - KNOB), 0, 1) * (max - min);
    const before = v;
    set(valueAt(e.clientX), continuous);
    try { el.setPointerCapture(e.pointerId); } catch { /* not a live pointer */ }
    const move = (m) => set(valueAt(m.clientX), continuous);
    const end = () => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', end);
      el.removeEventListener('pointercancel', end);
      el.removeEventListener('lostpointercapture', end);
      if (!continuous && v !== before) onChange?.(v);
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    el.addEventListener('lostpointercapture', end);
  });
  el.addEventListener('keydown', (e) => {
    if (off) return;
    const d = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    set(v + d * (step > 0 ? step : (max - min) / 20), true);
  });
  return {
    el,
    get value() { return v; },
    /** Set from outside: no `onChange`. */
    set value(x) { set(x, false); },
    setDisabled(x) { off = !!x; show(); },
  };
}
