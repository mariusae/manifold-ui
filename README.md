# manifold-ui

A toolkit for building [Manifold](../manifold)-style interfaces on the web:
a sidebar that's the table of contents of the screen, and beside it a
space's grid — columns of tiles, every one visible — on a wash of soft
colour. Plain JavaScript modules and one stylesheet; no build step, no
dependencies.

It is the *interface* and its interaction model, not Manifold: there are no
blocks, no graph, no hosts here. What a tile **is** is your application's.
The toolkit is how tiles are shown, placed, sized, moved, docked, linked,
gone to and closed — and that is kept as Manifold has it, down to the
arithmetic (the grid's layout, loans and docking are a port of Manifold's
own `ArrangementState`).

```bash
npm run demo
```

then open <http://localhost:4173/demo/>. The demo is a small application
made with the toolkit; its first tile is a guide to everything you can do.

## Using it

```js
import { Manifold } from 'manifold-ui';
import 'manifold-ui/manifold.css';     // or <link rel="stylesheet" href="…/src/manifold.css">

const ui = new Manifold(document.getElementById('app'), { theme: 'paper' });

// A kind of tile: something that makes an element for a tile.
ui.registerTileType({
  type: 'note',
  name: 'Note',
  symbol: 'manifold.note',
  create(tile, ui) {
    const el = document.createElement('textarea');
    el.value = tile.data?.text ?? '';
    el.oninput = () => tile.update({ dirty: true });
    return { element: el, serialize: () => ({ text: el.value }), focus: () => el.focus() };
  },
  make: () => ({ title: 'Untitled' }),          // what "New Note" makes
});

const space = ui.addSpace({ name: 'Work', color: 'blue' });
const a = ui.open({ type: 'note', title: 'Plan' });
const b = ui.open({ type: 'note', title: 'Scratch' }, { beside: a });   // below it, taking its lower half
ui.open({ type: 'note', title: 'Reference' }, { newColumn: true });

b.setStatus({ state: 'working', progress: 40 });                        // its name shimmers; "40%"
b.setStatus({ state: 'blocked', kind: 'question', title: 'Which one?' }); // an amber pill, and "Needs you"
ui.link(a, b);                                                           // each shows the other's face on its bar
```

### The window: `Manifold`

`new Manifold(container, options)` — `theme`, `appearance` (`auto`/`light`/`dark`),
`tint`, `backdrop` (`{webgl, daylight, place}` or `false`), `sidebar`
(`{width, pinned, tabs}`), `hostLabel`, `keys`, `newTile`, `keepClosed`.

| | |
|---|---|
| `registerTileType(type)` | A kind of tile (below). |
| `addSpace({name, color, symbol})`, `selectSpace(space)`, `removeSpace(space)` | Spaces: the squares in the strip. |
| `open(descriptor, where)` | Bring a tile here. `where`: `{beside}`, `{over}`, `{newColumn}`, `{slot}`, `{docked}`, `{space}`; none: below the biggest tile of the active column. |
| `goTo(tile)` | Go to a tile where it is: its space shown, back from the dock, grown if it's down to its bar, focused. |
| `close(tile)`, `reopen()`, `delete(tile)` | Closed tiles wait in Recently Closed (half an hour) before they're gone. |
| `dock(tile)`, `grow(tile)`, `fill(tile, keepingBars)`, `toggleMaximize(tile)`, `toggleSummary(tile)`, `nudge(way)`, `focusToward(way)` | What the bar, its menu and the keys do. |
| `link(a, b)`, `unlink(id)`, `togglePin(tile)` | Links by hand; pins. |
| `change(space, events)` | Apply arrangement events directly (see `Arrangement`). Undoable. |
| `undo()`, `redo()` | The space's last change at your hand, a hundred deep. |
| `addToLibrary(entry)`, `recall(id, where)` | Things to recall on the screen (below). |
| `dragThings(things, event)` | Begin a drag of things of your own. |
| `setTheme`, `setAppearance`, `setTint` | The look. |
| `run(command)`, `commands`, `keymap` | Every key is a command by name. |
| `serialize()`, `restore(state)` | Everything as data, and back. |
| `on(event, fn)` | `open`, `close`, `delete`, `focus`, `attended`, `space`, `change`, `link`, `drop`, `path`, `theme`… |

### Tiles

A tile's **descriptor** is what the chrome needs to know of it:

```js
{ type, title, symbol, place, path, status, dirty, host, suffix, summary, editsPlace, data }
```

`tile.update(patch)` changes any of it, everywhere it shows (its bar, its
sidebar row, its cards). `tile.setStatus(status)` reports what it's doing:

```js
{ state: 'idle' | 'working' | 'done' | 'error' | 'blocked' | 'inactive',
  progress,                       // 0–100 while working
  kind,                           // blocked on: 'permission' | 'question' | 'auth'
  title, msg, app }               // the words under its name in the sidebar
```

Indicators add ink only when a tile needs you: while it works its name
shimmers (every working name in step); *blocked*, and *done* and *error*
until attended to, are a word in a pill. Focusing a tile attends to it.

A **tile type**'s `create(tile, ui)` returns an element, or a **view**:

```js
{ element,
  focus(), destroy(), serialize(),          // serialize → what goes in tile.data when it's described
  summary(),                                // {lines, note, tone, code, picture, progress}: the tile in a few lines
  menu(),                                   // its own verbs, first in the bar's menu
  barButtons(),                             // [{symbol, tooltip, enabled, action}] before the bar's own
  editPlace(),                              // {text, placeholder, commit(text)}: its place is a field when clicked
  path(),                                   // [{title, symbol, action}] for ⇧-click on the bar
  outline, sidebarShown, toggleSidebar(),   // an outline of its own (below)
  dropForms(things, event), dropPut(things, formId, event) }   // what a thing dropped on it can be
```

### Outlines: the scrubber

A tile's scroll bar carries its outline. `OutlinedView` wraps a scrollable
element with a knob-only scroll bar, a lane of ticks beside it — one per
outline item, the ones in view lit, swelling under the pointer, each
showing a card of what's there — and, toggled from the bar (⌘/), the
outline as a sidebar of the tile's own with a filter:

```js
import { Outline, OutlinedView } from 'manifold-ui';

const outline = new Outline();
const view = new OutlinedView({
  content: scroller, outline,
  tops: () => headings.map((h) => h.offsetTop),          // where each item is
  preview: (i) => ({ lines: firstLinesOf(i) }),          // its card
  policy: 'document',                                    // or 'recent': every item kept (a terminal's commands)
});
outline.setItems(headings.map((h) => ({ title: h.textContent, level })));
// return { element: view.el, outline, get sidebarShown() { return view.sidebarShown }, toggleSidebar: () => view.toggleSidebar() }
```

### The library

Entries to recall: listed in the menu at the sidebar's foot (⌘O), searchable;
chosen, an entry's tile is gone to if it's open already, else brought here.

```js
ui.addToLibrary({ id: 'guide', title: 'Guide', symbol: 'book', group: 'Documents',
                  tile: { type: 'doc', data: { … } } });
ui.recall('guide', { beside: someTile });
```

The kinds of tile there are (every registered type with a `make`) are on
offer from the sidebar's *New …* row and the library menu. Closed tiles are
in *Recently Closed* (⇧⌘A, ⇧⌘T). Pinned tiles keep a row to recall them by.

### Dragging things

A tile's bar dragged plainly moves the tile. Everything else is a **thing**
— and so is a tile ⇧-dragged or dragged by its symbol. A thing shows as a
pill with a badge saying what a drop does there; resting (or ⌃) opens a
palette of what else it can be.

```js
row.onpointerdown = (e) => pressOrDrag(row, e, {
  begin: (ev) => ui.dragThings([{ title: 'report.pdf', symbol: 'doc.richtext', open: { type: 'pdf', data } }], ev),
  click: () => open(),
});
```

On the grid a thing opens as a tile of its own where it lands (`open`,
`library` or `tile` on the thing say how; anything else is emitted as
`drop`), or — a tile's own thing over another tile — links the two. A
tile's view takes things first, through `dropForms`/`dropPut`.

### Themes

Every colour is a theme's, as CSS custom properties (`--mf-*`) on the root
element. Manifold's four are included, transcribed from its palette —
`paper`, `newsprint`, `classic`, `financialTimes` — each in the light and
the dark, with tints (`theme`, `blue`, `orange`, `purple`, `pink`, `green`,
`graphite`, or any CSS colour).

```js
import { defineTheme } from 'manifold-ui';

defineTheme('midnight', {
  accent: { light: '#5B5BD6', dark: '#9E9EFF' },
  window: { light: '#F7F7FB', dark: '#101018' },
  chrome: { panel: { light: '#FFFFFF', dark: '#1B1B26' } },
  backdrop: { dark: { stops: [[0.68, 0.5, 0.22], [0.75, 0.4, 0.2], [0.6, 0.4, 0.16], [0.65, 0.2, 0.1]],
                      pool: { saturation: 0.5, brightness: 0.4 }, tintPool: { saturation: 0.6, brightness: 0.45 } } },
}, 'paper');
ui.setTheme('midnight');
```

Your tiles can draw in the same properties (`var(--mf-text)`,
`var(--mf-tile-ground)`, `var(--mf-accent)`, `var(--mf-term-background)`,
`var(--mf-ansi-0…15)`…) and change with the theme.

The **backdrop** is drawn with WebGL (CSS gradients where there's none): the
theme's wash from the upper left to the lower right and two pools of light,
one the tint's, placed afresh each day by the date's seed and lit by the
hour — a touch warmer while the sun is low, cooler when it's high, a dim
cool blue at night — exactly as Manifold places and lights them.

### Pieces

Everything the window is made of is exported, to use alone: `Grid`,
`TileBar`, `SummaryCard`, `LinkBadge`, `Sidebar`, `Backdrop`,
`OutlineStrip`, `TileSidebar`, `showMenu`, `PopMenu`, `Toasts`,
`HoverCard`, `SpaceSwitcher`, `Overview`, `Drags`, the `Flat` controls,
`icon`, and `Arrangement` — the grid's arithmetic as plain data:

```js
import { Arrangement as A } from 'manifold-ui';

const a = A.emptyArrangement();
A.apply(a, { type: 'place', id: 'x', column: 0, at: 0 });
A.apply(a, { type: 'place', id: 'y', column: 0, at: 1 });   // takes x's lower half, on loan
A.apply(a, { type: 'remove', id: 'y' });                    // …and gives it back
```

## The interaction model

As Manifold's (its README's *Using it* and DESIGN.md §3 are the reference):

- **The grid** — a new tile lands below the biggest tile of the active
  column, taking its lower half; **room goes back where it came from** when
  it goes; a new column takes its width from every column in proportion.
- **The bar** — click grows the tile a step; ⌘-click fills its column (the
  others docked); ⌥-click fills all but the others' bars; a click after
  either puts the column back as it was. Its symbol, ⌃-click or right-click:
  its menu. ⇧-click: where it is. It gives things up in order as it narrows.
- **Dragging the bar** — between two tiles; near a column's side for a new
  column; onto another's bar (or ⌥, onto the tile) to take its place, that
  one docked under it; onto a space's square to send it there, the square
  springing open if you wait.
- **The symbol as a handle** — under the pointer it swings out of the bar
  toward you; dragged from, the tile is a *thing*.
- **Lines** — dragged, they resize; past a tile's least height, the tile is
  docked; double-clicked, the two share evenly.
- **One ladder** — content, summary card (under 80 points), bar alone
  (under 24).
- **Docking** — out of the grid and still going, listed under Docked; gone
  to again, back where it was with its room.
- **Go to** — plain goes, ⌘ beside, ⌥ over; the ring swells on arrival.
- **⌃⇥** walks the tiles, the latest settled on first, previewed in the
  grid itself; **⌘\`** switches spaces, cards after a moment's hold.
- **Links** — faces on the bar, stacked, fanned under the pointer, a card
  after a moment's rest, scrubbed when there are many.
- **Status** — shimmer, pills, *Needs you*; attended by focusing.
- **Undo** — the space as it was, a hundred deep.
- **Motion** — a tile placed grows in from 86% as the others' edges slide
  aside; one closed goes in a puff; one moved goes over the rest; what a
  tile shows is held still as its edges pass, never stretched. With Reduce
  Motion, nothing travels: it fades, or is there at once.

### Where the web differs

- **The pointer isn't moved for you.** Manifold warps the pointer onto a
  tile gone to, back onto a bar that grew, and onto the next ×; a page
  can't.
- **Some keys are the browser's** (⌘W, ⌘T, ⌘N, ⌃⇥, ⌘\`). The commands are
  all there (`ui.run('closeTile')`) and second keys are bound (⌥⌘W, ⌥⌘T,
  ⌥⇥, ⌥\`); rebind any through `ui.keymap`. In a shell of its own
  (Electron, Tauri, an installed web app) the originals work.
- **The genie** — a tile docked flies into its row as one picture drawn
  down to the row's end, over the genie's path and time, not poured in
  strips.
- **Pictures of tiles** are copies of their elements, so a cross-origin
  frame is blank while it flies.
- **Symbols** are the toolkit's own drawings under SF Symbols' names
  (`src/icons/symbols.js`); `registerSymbol` adds more, and a tile's symbol
  may be `{svg}`, `{url}` or `{text}`.

## Layout of the source

```
src/
  manifold.js        the window: spaces, tiles, commands, and how the pieces meet
  model.js           Tile, Space
  keys.js            the keymap
  core/              arrangement (the grid's arithmetic), util, measure
  grid/              grid, tilebar (+ icon handle), linkbadge, summarycard, ghost
  sidebar/           the sidebar: strip, rows, needs-you, footer
  scrubber/          outline, strip (scroll bar + ticks), tilesidebar, outlined
  status/            status marks: pill, glyph, shimmer
  overlay/           menu, popmenu, toast, hovercard, spaceswitcher, overview, flat controls
  drag/              drags: pills, badges, the palette
  backdrop/          the WebGL wash
  theme/             themes (Manifold's palette), theme → CSS properties, daylight
  icons/             symbols and Manifold's two marks
  manifold.css       the stylesheet (imports css/*)
demo/                the demo application
scripts/             serve.js (the demo's server), icons-gen.mjs (draws src/icons/symbols.js)
test/                tests of the arrangement, themes, backdrop and keys (npm test)
```
