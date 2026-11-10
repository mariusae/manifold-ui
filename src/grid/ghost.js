// Pictures of things on their way: what's seen coming, going and crossing
// over (Manifold's Ghost). A picture here is a copy of the element, held
// where it was, taking no clicks.

import { animate, Motion } from '../core/util.js';

/** A copy of `el` as it shows now (its canvases' drawings too), placed at
 *  `rect` in `host`'s terms (its own place by default). */
export function picture(el, host, rect = null, z = 30) {
  const g = el.cloneNode(true);
  const from = el.querySelectorAll('canvas');
  const to = g.querySelectorAll('canvas');
  from.forEach((c, i) => {
    try {
      to[i].getContext('2d')?.drawImage(c, 0, 0);
    } catch { /* a canvas we can't read stays blank */ }
  });
  g.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id'));
  g.removeAttribute('id');
  g.classList.add('mf-ghost');
  g.getAnimations?.().forEach((a) => a.cancel());
  const o = host.getBoundingClientRect();
  const r = rect ?? (() => {
    const b = el.getBoundingClientRect();
    return { x: b.left - o.left, y: b.top - o.top, w: b.width, h: b.height };
  })();
  Object.assign(g.style, {
    position: 'absolute', left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', height: r.h + 'px',
    zIndex: z, pointerEvents: 'none', margin: 0, transform: 'none', opacity: 1, display: '',
  });
  host.append(g);
  return g;
}

/** Fades a picture out and takes it away. */
export function fadeOut(el, over, { easing = Motion.disappear, delay = 0, removing = true } = {}) {
  const a = animate(el, [{ opacity: 1 }, { opacity: 0 }], { duration: over, delay, easing, fill: 'both' });
  if (removing) a.done.then(() => el.remove());
  return a;
}

export function fadeIn(el, over, { easing = Motion.appear } = {}) {
  return animate(el, [{ opacity: 0 }, { opacity: 1 }], { duration: over, easing });
}

function union(rects) {
  if (!rects.length) return null;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const r of rects) {
    x0 = Math.min(x0, r.left); y0 = Math.min(y0, r.top);
    x1 = Math.max(x1, r.right); y1 = Math.max(y1, r.bottom);
  }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

/**
 * Parts of one thing scaled together about its middle while fading: going
 * (to `scale`, fading out, then removed) or `coming` (from `scale`, fading
 * in over `fade`).
 */
export function burst(parts, { scale, over, fade = over, fading = Motion.appear, moving = Motion.travel, coming = false }) {
  const card = union(parts.map((p) => p.getBoundingClientRect()));
  if (!card) return Promise.resolve();
  const c = { x: card.x + card.w / 2, y: card.y + card.h / 2 };
  const all = [];
  for (const el of parts) {
    const r = el.getBoundingClientRect();
    const o = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    const scaled = `translate(${(c.x - o.x) * (1 - scale)}px, ${(c.y - o.y) * (1 - scale)}px) scale(${scale})`;
    const moved = animate(el, coming ? [{ transform: scaled }, { transform: 'none' }] : [{ transform: 'none' }, { transform: scaled }],
      { duration: over, easing: moving, fill: coming ? 'none' : 'forwards' });
    const faded = animate(el, coming ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 1 }, { opacity: 0 }],
      { duration: fade, easing: fading, fill: coming ? 'none' : 'forwards' });
    all.push(moved.done, faded.done);
    if (!coming) Promise.all([moved.done, faded.done]).then(() => el.remove());
  }
  return Promise.all(all);
}

/**
 * The cloud: soft puffs born over the middle of `r` at once, swelling,
 * drifting out and fading, as the Dock's poof. (Manifold's emitter, by its
 * numbers: some ten puffs born in a moment, each living about a third of a
 * second.)
 */
export function puff(host, r) {
  const side = Math.min(Math.max(Math.min(r.w, r.h) * 0.22, 34), 90);
  const area = { w: Math.min(r.w * 0.5, 260), h: Math.min(r.h * 0.4, 120) };
  const k = side / 64;
  const slow = Motion.slowdown;
  const layer = document.createElement('div');
  layer.className = 'mf-puffs';
  host.append(layer);
  const count = Math.round(260 * 0.04);
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'mf-puff';
    const x = r.x + r.w / 2 + (Math.random() - 0.5) * area.w;
    const y = r.y + r.h / 2 + (Math.random() - 0.5) * area.h;
    const life = (0.36 + (Math.random() - 0.5) * 0.2) * 1000 * slow;
    const speed = (side * 2.4 + (Math.random() - 0.5) * 2 * side * 1.5) / slow;
    const angle = Math.random() * Math.PI * 2;
    const s0 = Math.max(0.05, k * 0.45 + (Math.random() - 0.5) * 2 * k * 0.2);
    const s1 = s0 + (k * 2.1 * life) / 1000 / slow;
    const spin = 0.6 + (Math.random() - 0.5) * 3;
    const dx = (Math.cos(angle) * speed * life) / 1000, dy = (Math.sin(angle) * speed * life) / 1000;
    Object.assign(p.style, { left: x - 32 + 'px', top: y - 32 + 'px' });
    layer.append(p);
    // Its alpha runs down from 0.55 at 2.8 a second: gone in a fifth of one.
    const fadeAt = Math.min(1, (0.55 / 2.8) * 1000 * slow / life);
    animate(p, [
      { transform: `translate(0px, 0px) scale(${s0}) rotate(0rad)`, opacity: 0.55 },
      { transform: `translate(${dx * fadeAt}px, ${dy * fadeAt}px) scale(${s0 + (s1 - s0) * fadeAt}) rotate(${spin * fadeAt * life / 1000}rad)`, opacity: 0, offset: fadeAt },
      { transform: `translate(${dx}px, ${dy}px) scale(${s1}) rotate(${(spin * life) / 1000}rad)`, opacity: 0 },
    ], { duration: life, easing: 'linear', fill: 'forwards' });
  }
  setTimeout(() => layer.remove(), 700 * slow);
}
