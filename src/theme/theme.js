// Every colour the toolkit draws its own things in is a theme's: each role
// a shade, one colour in the light and one in the dark. A theme set
// recolours everything at once — as CSS custom properties on the root
// element, which the stylesheet (manifold.css) is written against.
//
// The four here are Manifold's (themes.js, transcribed from its Palette):
// Paper, Newsprint, Classic and Financial Times. `defineTheme` makes
// another from any of them.

import { themes as builtin, withAlpha } from './themes.js';

const registry = new Map(Object.entries(builtin));

export const TINTS = ['theme', 'blue', 'orange', 'purple', 'pink', 'green', 'graphite'];

export function themeNames() {
  return [...registry.keys()];
}
export function getTheme(key) {
  return registry.get(key) ?? registry.get('paper');
}

function merge(base, over) {
  if (over === undefined) return base;
  if (over === null || typeof over !== 'object' || Array.isArray(over) || typeof base !== 'object' || base === null || Array.isArray(base)) return over;
  if ('light' in over && 'dark' in over) return over;
  const out = { ...base };
  for (const [k, v] of Object.entries(over)) out[k] = merge(base[k], v);
  return out;
}

/**
 * A theme of your own: `base`'s roles with `overrides` laid over them (the
 * same shape as themes.js — `{window: {light, dark}, text: {primary: …},
 * chrome: {…}, status: {…}, accent: {…}, backdrop: {light: {stops, pool,
 * tintPool}, dark: {…}}}`). Registered under `key`.
 */
export function defineTheme(key, overrides, base = 'paper') {
  const theme = merge(getTheme(base), { id: key, name: key, ...overrides });
  registry.set(key, theme);
  return theme;
}

// --- colour arithmetic (Manifold's Tints: contrast, and blending until it reads)

function rgb(css) {
  let m = /^#([0-9a-f]{6})$/i.exec(css);
  if (m) {
    const v = parseInt(m[1], 16);
    return [(v >> 16) & 255, (v >> 8) & 255, v & 255, 1];
  }
  m = /rgba?\(([^)]+)\)/.exec(css);
  if (m) {
    const p = m[1].split(',').map((x) => parseFloat(x));
    return [p[0], p[1], p[2], p[3] ?? 1];
  }
  return [128, 128, 128, 1];
}
const hex = ([r, g, b]) => '#' + [r, g, b].map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('').toUpperCase();
const alpha = (css, a) => {
  const [r, g, b, a0] = rgb(css);
  return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${+(a * a0).toFixed(4)})`;
};
function luminance(c) {
  const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
}
function contrast(a, b) {
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
/** `color` blended toward `toward` in small steps until it stands off `ground` by `ratio`. */
function reaching(ratio, color, ground, toward) {
  let c = color;
  for (let f = 0; contrast(c, ground) < ratio && f < 1;) {
    f += 0.04;
    c = color.map((v, i) => v + (toward[i] - v) * f);
  }
  return c;
}

/**
 * A theme's colours for an appearance and tint, as CSS custom properties.
 * @param {string|object} theme  a registered key, or a theme object
 * @param {object} options
 *   dark   the appearance
 *   tint   'theme' (the theme's own accent), one of TINTS, or a CSS colour
 */
export function resolveTheme(theme, { dark = false, tint = 'theme' } = {}) {
  const t = typeof theme === 'string' ? getTheme(theme) : theme;
  const mode = dark ? 'dark' : 'light';
  const pick = (shade, fallback) => (shade ? shade[mode] ?? shade : fallback);
  const text = pick(t.text.primary);
  const secondary = pick(t.text.secondary);
  const panel = pick(t.chrome.panel);

  // The tint: the theme's own accent, the theme's shade of another, or a colour given.
  let tc;
  if (tint === 'theme' || !tint) tc = t;
  else if (t.tints?.[tint]) tc = t.tints[tint];
  else {
    const c = rgb(tint);
    tc = {
      accent: { light: tint, dark: tint },
      accentText: { [mode]: hex(reaching(4.8, c, rgb(panel), dark ? [255, 255, 255] : [0, 0, 0])) },
      accentFill: { [mode]: hex(reaching(4.5, c, [255, 255, 255], [0, 0, 0])) },
    };
  }
  const accent = pick(tc.accent);
  const band = tc.band ? pick(tc.band) : withAlpha(hex(rgb(accent)), dark ? 0.3 : 0.16);
  const bandInactive = tc.band ? alpha(pick(tc.band), 0.6) : withAlpha(hex(rgb(accent)), dark ? 0.2 : 0.1);
  const bar = pick(t.chrome.bar, panel);
  const shadow = t.backdrop?.tileShadow ?? { color: '#000000', opacity: 0.1 };
  const edge = t.backdrop?.tileEdge ? pick(t.backdrop.tileEdge) : null;
  const menu = pick(t.chrome.menu, null);

  return {
    '--mf-window': pick(t.window),
    '--mf-text': text,
    '--mf-text-body': pick(t.text.body, text),
    '--mf-text-strong': pick(t.text.strong, text),
    '--mf-text-secondary': secondary,
    '--mf-text-tertiary': pick(t.text.tertiary, secondary),
    '--mf-hover': pick(t.chrome.hover),
    '--mf-pressed': pick(t.chrome.pressed),
    '--mf-selected': pick(t.chrome.selected),
    '--mf-divider': pick(t.chrome.divider),
    '--mf-panel': panel,
    '--mf-panel-border': pick(t.chrome.panelBorder),
    '--mf-card-border': pick(t.chrome.cardBorder),
    '--mf-scrim': pick(t.chrome.scrim),
    '--mf-handle': pick(t.chrome.handle),
    '--mf-scrubber-knob': pick(t.chrome.scrubberKnob),
    '--mf-sheet-edge': pick(t.chrome.sheetEdge),
    '--mf-sheet-edge-hovered': pick(t.chrome.sheetEdgeHovered),
    '--mf-sheet': pick(t.chrome.sheet?.[0], panel),
    '--mf-stack': pick(t.chrome.stack, panel),
    '--mf-drag-pill': pick(t.chrome.dragPill, panel),
    '--mf-link-behind-1': pick(t.chrome.linkBehind?.[1], panel),
    '--mf-link-behind-2': pick(t.chrome.linkBehind?.[2], panel),
    '--mf-well': pick(t.chrome.well),
    '--mf-pill': pick(t.chrome.pill),
    '--mf-bar': bar,
    '--mf-bar-focused': pick(t.chrome.barFocused, bar),
    '--mf-bar-ink': pick(t.chrome.barInk, secondary),
    // Popovers' ground: the theme's own, else a frost of the panel.
    '--mf-menu': menu ?? alpha(panel, dark ? 0.78 : 0.82),
    '--mf-menu-frost': menu ? 'none' : 'blur(30px) saturate(1.8)',
    '--mf-accent': accent,
    '--mf-accent-text': pick(tc.accentText, accent),
    '--mf-accent-fill': pick(tc.accentFill, accent),
    '--mf-accent-strong': alpha(accent, 0.75),
    '--mf-accent-soft': alpha(accent, 0.45),
    '--mf-band': band,
    '--mf-band-inactive': bandInactive,
    '--mf-drop': alpha(accent, 0.18),
    '--mf-mark': alpha(accent, 0.85),
    '--mf-status-done': pick(t.status.done),
    '--mf-status-attention': pick(t.status.attention),
    '--mf-status-failed': pick(t.status.failed),
    '--mf-line': alpha(text, 0.14),
    '--mf-fill': alpha(text, 0.025),
    '--mf-ground-rest': alpha(text, 0.06),
    '--mf-ground-on': alpha(text, 0.15),
    '--mf-edge-control': alpha(text, 0.3),
    '--mf-edge-control-hovered': alpha(text, 0.5),
    '--mf-code-page': pick(t.code?.page, panel),
    '--mf-code-text': pick(t.code?.text, text),
    '--mf-link': pick(t.code?.link, accent),
    '--mf-text-selection': pick(tc.textSelection ?? t.textSelection, band),
    '--mf-caret': pick(tc.caret ?? t.caret, accent),
    // A soft shadow under each card in the light, none in the dark (where
    // the cards are lighter than the wash already); the theme's hairline
    // round it, if it has one, in both.
    '--mf-tile-shadow': [
      dark ? null : `0 4px 20px ${alpha(shadow.color, shadow.opacity)}`,
      edge ? `0 0 0 0.5px ${edge}` : null,
    ].filter(Boolean).join(', ') || 'none',
    '--mf-shadow-resting': '0 1px 3px rgba(0, 0, 0, 0.18)',
    '--mf-shadow-float': '0 3px 24px rgba(0, 0, 0, 0.16)',
    '--mf-shadow-popover': '0 8px 36px rgba(0, 0, 0, 0.28)',
    '--mf-term-background': pick(t.terminal?.[mode]?.background, pick(t.window)),
    '--mf-term-foreground': pick(t.terminal?.[mode]?.foreground, text),
    ...Object.fromEntries((t.terminal?.[mode]?.ansi ?? []).map((c, i) => [`--mf-ansi-${i}`, c])),
    'color-scheme': dark ? 'dark' : 'light',
  };
}

/** Sets a theme's colours on an element (the toolkit's root). Returns what was set. */
export function applyTheme(el, theme, options = {}) {
  const vars = resolveTheme(theme, options);
  for (const [k, v] of Object.entries(vars)) el.style.setProperty(k, v);
  el.dataset.mfAppearance = options.dark ? 'dark' : 'light';
  return vars;
}

/** The backdrop's wash for a theme in an appearance (see backdrop.js). */
export function washOf(theme, dark) {
  const t = typeof theme === 'string' ? getTheme(theme) : theme;
  return t.backdrop[dark ? 'dark' : 'light'];
}

/** The colours that tell a space from the others, as Arc's and Dia's: the
 *  system's twelve, in the light and in the dark. */
export const spaceColors = {
  red: { light: '#FF3B30', dark: '#FF453A' },
  orange: { light: '#FF9500', dark: '#FF9F0A' },
  yellow: { light: '#FFCC00', dark: '#FFD60A' },
  green: { light: '#34C759', dark: '#30D158' },
  mint: { light: '#00C7BE', dark: '#63E6E2' },
  teal: { light: '#30B0C7', dark: '#40C8E0' },
  cyan: { light: '#32ADE6', dark: '#64D2FF' },
  blue: { light: '#007AFF', dark: '#0A84FF' },
  indigo: { light: '#5856D6', dark: '#5E5CE6' },
  purple: { light: '#AF52DE', dark: '#BF5AF2' },
  pink: { light: '#FF2D55', dark: '#FF375F' },
  brown: { light: '#A2845E', dark: '#AC8E68' },
};
