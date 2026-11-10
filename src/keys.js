// Keys mean the same thing everywhere, and every one is a command by name
// (see `Manifold.commands`). These are Manifold's own; where a browser keeps
// a key for itself (⌘W, ⌘T, ⌃⇥, ⌘`…) the command is still there to be
// called, and a second key is given that a page can have. An app in a shell
// of its own (Electron, Tauri, an installed web app) gets them all.
//
// A key is written "ctrl+alt+shift+meta+<key>" with <key> from the
// keyboard's layout-independent names: a letter, a digit, = - / ` ' [ ] . ,
// up down left right, enter, tab, escape, space.

import { isMac } from './core/util.js';

const CODES = {
  Equal: '=', Minus: '-', Slash: '/', Backquote: '`', Quote: "'", BracketLeft: '[', BracketRight: ']', Period: '.', Comma: ',',
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', Enter: 'enter', Tab: 'tab', Escape: 'escape', Space: 'space',
  Backslash: '\\', Semicolon: ';',
};

/** An event's key, in the form bindings are written in. */
export function keyOf(e) {
  let k = CODES[e.code];
  if (!k) {
    if (/^Key[A-Z]$/.test(e.code)) k = e.code.slice(3).toLowerCase();
    else if (/^Digit\d$/.test(e.code)) k = e.code.slice(5);
    else return null;
  }
  return (e.ctrlKey ? 'ctrl+' : '') + (e.altKey ? 'alt+' : '') + (e.shiftKey ? 'shift+' : '') + (e.metaKey ? 'meta+' : '') + k;
}

/** Manifold's keys (as on a Mac: ⌘ is meta, ⌥ alt, ⌃ ctrl), with the second
 *  keys a browser tab can have. */
const MAC = [
  // The tile
  ['ctrl+meta+=', 'grow'],
  ['ctrl+shift+meta+=', 'fillColumn'],
  ['ctrl+alt+meta+=', 'fillColumnKeepingBars'],
  ['meta+m', 'dock'], ['alt+meta+m', 'dock'],
  ['shift+meta+m', 'shrinkToSummary'],
  ['shift+meta+enter', 'maximize'],
  ['meta+w', 'closeTile'], ['alt+meta+w', 'closeTile'], ['ctrl+w', 'closeTile'],
  ['shift+meta+t', 'reopen'], ['alt+shift+meta+t', 'reopen'],
  ['meta+/', 'toggleOutline'],
  ['shift+meta+p', 'findInOutline'],
  ['meta+j', 'nextInInbox'],
  // The focus going a way; the tile going a way
  ['alt+meta+up', 'focusUp'], ['alt+meta+down', 'focusDown'], ['alt+meta+left', 'focusLeft'], ['alt+meta+right', 'focusRight'],
  ['alt+meta+]', 'focusNext'], ['alt+meta+[', 'focusPrevious'],
  ['alt+shift+meta+up', 'moveUp'], ['alt+shift+meta+down', 'moveDown'], ['alt+shift+meta+left', 'moveLeft'], ['alt+shift+meta+right', 'moveRight'],
  // The space's tiles, the latest settled on first
  ['ctrl+tab', 'walk'], ['ctrl+shift+tab', 'walkBack'], ['alt+tab', 'walk'], ['alt+shift+tab', 'walkBack'],
  // Spaces
  ['meta+`', 'switchSpace'], ['shift+meta+`', 'switchSpaceBack'], ['alt+`', 'switchSpace'], ['alt+shift+`', 'switchSpaceBack'],
  ['shift+meta+]', 'nextSpace'], ['shift+meta+[', 'previousSpace'],
  ['meta+t', 'newSpace'], ['alt+meta+t', 'newTile'], ['alt+shift+meta+t', 'newTileInColumn'],
  ['shift+meta+w', 'removeSpace'],
  ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => [`meta+${n}`, `space${n}`]),
  // The window
  ['meta+z', 'undo'], ['shift+meta+z', 'redo'],
  ['shift+meta+/', 'toggleSidebar'], ['ctrl+meta+s', 'toggleSidebar'],
  ["meta+'", 'overview'],
  ['shift+meta+a', 'tilesMenu'],
  ['meta+o', 'library'], ['meta+k', 'library'],
];

/** The same elsewhere: Ctrl for ⌘, Alt for ⌥ — and Alt for ⌃ too. */
function elsewhere(key) {
  const parts = key.split('+');
  const k = parts.pop();
  const mods = new Set();
  for (const m of parts) mods.add(m === 'meta' ? 'ctrl' : m === 'ctrl' ? 'alt' : m);
  return ['ctrl', 'alt', 'shift'].filter((m) => mods.has(m)).map((m) => m + '+').join('') + k;
}

export function defaultKeymap() {
  const map = new Map();
  for (const [key, command] of MAC) {
    const k = isMac ? key : elsewhere(key);
    if (!map.has(k)) map.set(k, command);
  }
  return map;
}

/** A key as it's shown beside a menu item: ⌃⌥⇧⌘ and the key. */
export function keyLabel(key) {
  if (!key) return '';
  const parts = key.split('+');
  const k = parts.pop();
  const glyph = isMac ? { ctrl: '⌃', alt: '⌥', shift: '⇧', meta: '⌘' } : { ctrl: 'Ctrl+', alt: 'Alt+', shift: 'Shift+', meta: 'Win+' };
  const name = { up: '↑', down: '↓', left: '←', right: '→', enter: '↩', tab: '⇥', escape: '⎋', space: 'Space' }[k] ?? k.toUpperCase();
  return ['ctrl', 'alt', 'shift', 'meta'].filter((m) => parts.includes(m)).map((m) => glyph[m]).join('') + name;
}
