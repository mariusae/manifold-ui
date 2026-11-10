// Symbols: small monoline marks, by name, drawn in the current colour. The
// names follow SF Symbols' where Manifold uses one; the drawings are this
// toolkit's own (symbols.js). Two marks are Manifold's own — a terminal's
// prompt and a note's turned corner — and unfold under the pointer on a
// tile's bar (see IconHandle).
//
// Anything can stand where a symbol does: register more with
// `registerSymbol`, or give a tile a symbol of `{svg}`, `{url}`, `{text}`
// or an element.

import { symbols as builtin } from './symbols.js';

const NS = 'http://www.w3.org/2000/svg';
const registry = new Map(Object.entries(builtin));

export const Marks = {
  terminal: 'manifold.terminal',
  note: 'manifold.note',
};

/** Adds (or replaces) a symbol: parts on a 16×16 grid, each `{d, fill?, evenodd?, o?}`. */
export function registerSymbol(name, parts) {
  registry.set(name, parts);
}
export function hasSymbol(name) {
  return registry.has(name) || name === Marks.terminal || name === Marks.note;
}
export function symbolNames() {
  return [Marks.terminal, Marks.note, ...registry.keys()];
}

const WEIGHTS = { regular: 0.105, medium: 0.12, semibold: 0.135, bold: 0.15 };

/** The box a mark is drawn in, as a symbol of that size would take. */
export function markBox(size) {
  return { w: Math.round(size * 1.25), h: Math.round(size * 1.1) };
}
export function markStroke(size, weight = 'regular') {
  return size * (WEIGHTS[weight] ?? WEIGHTS.regular);
}

const path = (points, closed = false) => 'M' + points.map(([x, y]) => `${+x.toFixed(3)} ${+y.toFixed(3)}`).join('L') + (closed ? 'Z' : '');

function roundedRect(x, y, w, h, r) {
  return `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`;
}

/**
 * One of Manifold's own marks as strokes in a box (y down): each part at
 * rest (as the mark is drawn) and unfolded — the same points, moved — for a
 * tile's icon to unfold under the pointer. `drawsOn`: drawn on as it
 * unfolds, none of it at rest; `fills`: filled faintly as it unfolds.
 */
export function markParts(name, size, weight = 'regular') {
  const { w, h } = markBox(size);
  const stroke = markStroke(size, weight);
  const u = size / 13;
  if (name === Marks.terminal) {
    const midY = h / 2, inset = stroke / 2 + u;
    const prompt = (f) => [
      path([[inset + u, midY - 4 * u], [inset + 5.2 * u, midY], [inset + u, midY + 4 * u]].map(f)),
      path([[inset + 7.4 * u, midY + 4 * u], [Math.min(w - inset, inset + 13.2 * u), midY + 4 * u]].map(f)),
    ];
    // Unfolded, the prompt smaller, up and in from the window's left.
    const inside = ([x, y]) => [(x - w / 2) * 0.58 + w / 2 - 1.2 * u, (y - midY) * 0.58 + midY - 0.6 * u];
    const [c0, s0] = prompt((p) => p), [c1, s1] = prompt(inside);
    const win = roundedRect(stroke / 2, stroke / 2, w - stroke, h - stroke, 2.4 * u);
    return [{ rest: c0, out: c1 }, { rest: s0, out: s1 }, { rest: win, out: win, drawsOn: true }];
  }
  if (name === Marks.note) {
    const side = 11.6 * u;
    const x0 = Math.round(w / 2 - side / 2) + stroke / 2, y0 = h / 2 - side / 2 + stroke / 2;
    const x1 = x0 + side - stroke, y1 = y0 + side - stroke;
    const page = (f, tip) => {
      const corner = [x1 - f * tip, y1 - f * tip];
      return [
        path([[x0, y0], [x1, y0], [x1, y1 - f], [x1 - f, y1], [x0, y1]], true),
        path([[x1, y1 - f], corner, [x1 - f, y1]]),
        path([[x1, y1 - f], corner, [x1 - f, y1]], true),
      ];
    };
    // Unfolded, the corner turned up half as far again, its tip lifting past the fold.
    const [p0, c0, b0] = page(3.6 * u, 1), [p1, c1, b1] = page(5.8 * u, 1.15);
    return [{ rest: b0, out: b1, fills: true }, { rest: p0, out: p1 }, { rest: c0, out: c1 }];
  }
  return null;
}

function svg(w, h, viewBox) {
  const el = document.createElementNS(NS, 'svg');
  el.setAttribute('width', w);
  el.setAttribute('height', h);
  el.setAttribute('viewBox', viewBox);
  el.setAttribute('fill', 'none');
  el.setAttribute('aria-hidden', 'true');
  el.classList.add('mf-icon');
  return el;
}

/**
 * A symbol as an element, in the current colour.
 * @param {string|object|Node} symbol  a name; or {svg}, {url}, {text}; or an element
 * @param {object} options  size (points, as SF's: 13 is a row's), weight
 */
export function icon(symbol, { size = 13, weight = 'regular' } = {}) {
  if (symbol instanceof Node) return symbol.cloneNode(true);
  if (symbol && typeof symbol === 'object') {
    const box = Math.round(size * 1.23);
    if (symbol.url) {
      const img = document.createElement('img');
      img.className = 'mf-icon mf-icon-image';
      img.src = symbol.url;
      img.width = img.height = box;
      img.draggable = false;
      return img;
    }
    const span = document.createElement('span');
    span.className = 'mf-icon mf-icon-custom';
    span.style.width = span.style.height = box + 'px';
    span.style.fontSize = size + 'px';
    if (symbol.svg) span.innerHTML = symbol.svg;
    else span.textContent = symbol.text ?? '';
    return span;
  }
  const parts = markParts(symbol, size, weight);
  if (parts) {
    const { w, h } = markBox(size);
    const el = svg(w, h, `0 0 ${w} ${h}`);
    el.dataset.symbol = symbol;
    for (const part of parts) {
      if (part.drawsOn || part.fills) continue;
      const p = document.createElementNS(NS, 'path');
      p.setAttribute('d', part.rest);
      p.setAttribute('stroke', 'currentColor');
      p.setAttribute('stroke-width', markStroke(size, weight));
      p.setAttribute('stroke-linecap', 'round');
      p.setAttribute('stroke-linejoin', 'round');
      el.append(p);
    }
    return el;
  }
  const drawn = registry.get(symbol) ?? registry.get('circle.fill') ?? [];
  const box = Math.round(size * 1.23);
  const el = svg(box, box, '0 0 16 16');
  el.dataset.symbol = symbol;
  const sw = 13 * (WEIGHTS[weight] ?? WEIGHTS.regular);
  for (const part of drawn) {
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('d', part.d);
    if (part.fill) {
      p.setAttribute('fill', 'currentColor');
      if (part.evenodd) p.setAttribute('fill-rule', 'evenodd');
    } else {
      p.setAttribute('stroke', 'currentColor');
      p.setAttribute('stroke-width', part.w ?? sw);
      p.setAttribute('stroke-linecap', 'round');
      p.setAttribute('stroke-linejoin', 'round');
    }
    if (part.o != null) p.setAttribute('opacity', part.o);
    el.append(p);
  }
  return el;
}

/** A small borderless button showing a symbol, with a hover ground. */
export function iconButton(symbol, { size = 11, weight = 'semibold', tip, onClick, className } = {}) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'mf-icon-button' + (className ? ' ' + className : '');
  if (tip) b.title = tip;
  b.append(icon(symbol, { size, weight }));
  b.setSymbol = (s) => b.replaceChildren(icon(s, { size, weight }));
  if (onClick) b.addEventListener('click', (e) => { e.stopPropagation(); onClick(e); });
  // A press on it isn't a press on what it's on (a bar, a row).
  b.addEventListener('pointerdown', (e) => e.stopPropagation());
  return b;
}
