// manifold-ui — a toolkit for Manifold-style interfaces on the web: a
// sidebar that's the table of contents of the screen, a space's grid of
// tiles beside it, and the interaction model that goes with them.
//
//   import { Manifold } from 'manifold-ui';
//   import 'manifold-ui/manifold.css';
//
//   const ui = new Manifold(document.body, { theme: 'paper' });
//   ui.registerTileType({ type: 'note', name: 'Note', symbol: 'manifold.note', create: (tile) => makeNoteElement(tile) });
//   ui.addSpace({ name: 'Work' });
//   ui.open({ type: 'note', title: 'Hello' });
//
// The window is `Manifold`; everything it's made of is here too, to be used
// on its own.

export { Manifold } from './manifold.js';
export { Tile, Space } from './model.js';

// The grid's arithmetic, as a value: columns, shares, loans, the dock.
export * as Arrangement from './core/arrangement.js';

// Pieces of the window.
export { Grid, GridMetrics } from './grid/grid.js';
export { TileBar, IconHandle, BAR_HEIGHT } from './grid/tilebar.js';
export { SummaryCard } from './grid/summarycard.js';
export { LinkBadge } from './grid/linkbadge.js';
export { Sidebar } from './sidebar/sidebar.js';
export { Backdrop } from './backdrop/backdrop.js';

// A tile's outline: its scroll bar with ticks, and its own sidebar.
export { Outline } from './scrubber/outline.js';
export { OutlineStrip, Scrubber, bindScrollStrip } from './scrubber/strip.js';
export { TileSidebar } from './scrubber/tilesidebar.js';
export { OutlinedView } from './scrubber/outlined.js';

// Status: what every tile is doing.
export { statusMark, statusGlyph, statusTooltip, needsAttention, StatusPill, Shimmer, landAndSettle } from './status/statusmark.js';

// Floating things.
export { showMenu } from './overlay/menu.js';
export { PopMenu } from './overlay/popmenu.js';
export { Toasts } from './overlay/toast.js';
export { HoverCard } from './overlay/hovercard.js';
export { SpaceSwitcher } from './overlay/spaceswitcher.js';
export { SpaceCard, spacePeek } from './overlay/spacecard.js';
export { Overview } from './overlay/overview.js';
export * as Flat from './overlay/flat.js';

// Dragging things.
export { Drags, pressOrDrag } from './drag/drag.js';

// The look.
export { themeNames, getTheme, defineTheme, resolveTheme, applyTheme, washOf, spaceColors, TINTS } from './theme/theme.js';
export { themes } from './theme/themes.js';
export { cast as daylightCast } from './theme/daylight.js';
export { icon, iconButton, registerSymbol, hasSymbol, symbolNames, Marks } from './icons/icons.js';

// Keys, measures, small things.
export { defaultKeymap, keyOf, keyLabel } from './keys.js';
export { Motion, Emitter, h } from './core/util.js';
export { UIType, measure } from './core/measure.js';
