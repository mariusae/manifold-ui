// The demo: a small application made with the toolkit. Open it with
// `npm run demo`. `window.ui` is the Manifold, to poke at from the console.

import { Manifold } from '../src/index.js';
import { registerDemoTiles } from './tiles.js';

const ui = new Manifold(document.getElementById('app'), {
  theme: localStorage.getItem('mf.demo.theme') ?? 'paper',
  appearance: localStorage.getItem('mf.demo.appearance') ?? 'auto',
  tint: localStorage.getItem('mf.demo.tint') ?? 'theme',
  newTile: 'terminal',
});
window.ui = ui;
ui.on('theme', ({ theme, tint }) => {
  if (typeof theme === 'string') localStorage.setItem('mf.demo.theme', theme);
  localStorage.setItem('mf.demo.appearance', ui.options.appearance);
  localStorage.setItem('mf.demo.tint', tint);
});
registerDemoTiles(ui);

const GUIDE = `
<h1>A guide to the grid</h1>
<p>This is <b>manifold-ui</b>: a toolkit for interfaces in Manifold’s manner — a sidebar that’s the table of contents of the screen, and a space’s grid beside it, columns of tiles, every one visible, on a wash of soft colour. What a tile <i>is</i> is the application’s; the toolkit is how tiles are shown, moved, sized, linked and gone to. Everything here can be tried as you read.</p>
<h2>Tiles and their bars</h2>
<p>Each tile is a card with a bar across its top: its symbol and title, where it is in grey, its links, its status when it needs you, and maximize and close at the right. As a tile narrows the bar gives things up in order, so the symbol and some of the name always show.</p>
<h3>Clicking the bar</h3>
<ul><li><b>Click</b> it and the tile grows a step — click again, a step more.</li><li><b>⌘-click</b> fills its column, the others docked; <b>⌥-click</b> fills all but the others’ bars. After either, a click on the bar puts the column back as it was.</li><li><b>Click its symbol</b> (or ⌃-click, or right-click the bar) for the tile’s menu; <b>⇧-click</b> for where it is.</li></ul>
<h3>Dragging the bar</h3>
<ul><li>Drag it <b>between two tiles</b> to put it there, <b>near a column’s side</b> for a new column, onto <b>another tile’s bar</b> to take that tile’s place (it’s docked under this one), or onto a <b>space’s square</b> in the sidebar to send it there.</li><li><b>⌥-drag</b> onto a tile and it takes that tile’s place: the outline while you drag is the target’s shape.</li><li><b>⇧-drag</b>, or drag it <b>by its symbol</b> — rest the pointer on the symbol and it swings out of the bar toward you — and it’s not the tile you carry but the thing itself: a pill, with a badge at its corner saying what a drop does there.</li></ul>
<h2>Room goes back where it came from</h2>
<p>A new tile lands below the biggest tile of the active column, taking its lower half. Close it, dock it or move it away, and the tile that made room has its room back — so opening and closing leaves a space as it was, unless you resized meanwhile. A new column takes its width from every column in proportion, and gives it back the same way.</p>
<h3>The lines between tiles</h3>
<p>Drag the line between two tiles or two columns to resize them. Push it past a tile’s least height and that tile is docked, and the line goes on against the next. Double-click a line and the two share their room evenly.</p>
<h3>One ladder</h3>
<p>A tile shrinks in steps: its content; under 80 points, its summary card in its place; under 24, its bar alone. Each is only a presentation of the room it has. <kbd>⇧⌘M</kbd> shrinks one to its summary, and again brings it back.</p>
<h2>Docking</h2>
<p><b>Dock</b> (<kbd>⌘M</kbd>, or the bar’s menu) takes a tile out of the grid to have it out of the way and still going: it flies into its row in the sidebar, under <i>Docked</i>. Go to it again — its row, a link, <kbd>⌃⇥</kbd> — and it goes back where it was, taking its room back from the tiles that took it.</p>
<h2>Going to things</h2>
<p>One rule for every click that names a tile — a sidebar row, a link’s face, a row in a list: plain <b>goes to</b> it where it is; <b>⌘</b> means beside; <b>⌥</b> means over. A tile gone to has its focus ring swell and glow a moment.</p>
<h3>Walking</h3>
<p><kbd>⌃⇥</kbd> (in a browser tab, <kbd>⌥⇥</kbd>) walks the space’s tiles, docked ones too, the latest settled on first: a tap goes back and forth between two; held, each ⇥ moves the ring to the next, a docked tile shown in its column where it would come back. Letting go settles there; Escape leaves things be.</p>
<h3>Spaces</h3>
<p>The strip along the sidebar’s top has every space as a small square. Click one to go there, rest on one to see its tiles, drag one to reorder, right-click for its colour and symbol. <kbd>⌘\`</kbd> (or <kbd>⌥\`</kbd>) switches spaces, the most recent first; held a moment, they come as cards.</p>
<h2>Links</h2>
<p>⇧-drag a tile’s bar onto another tile and the two are <b>linked</b>: each shows the other’s face on its bar, a chevron on the side it points. Several stack up; the pointer on them fans them out along the bar, and resting on one shows its summary card. Click a face to go there.</p>
<h2>Dragging things</h2>
<p>Everything that isn’t a tile moved is a <b>thing</b>: a row from the Library tile, a command from a terminal’s outline, a heading from this one’s. Where it lands decides what’s done with it — on the grid, a tile of its own; on a terminal, its words typed; in a note, a link. Rest the pointer a moment (or hold <kbd>⌃</kbd>) and a palette opens of what else it can be.</p>
<h2>Status</h2>
<p>Every tile can say what it’s doing. While it works its name <b>shimmers</b> — every working name in step. When it needs you, a pill says so in amber, here and in <i>Needs you</i> at the sidebar’s foot; <i>Done</i> and <i>Failed</i> stay until you’ve looked at the tile. Try <code>make test</code>, <code>make fail</code> and <code>ask</code> in the terminal, or the agent.</p>
<h2>Outlines</h2>
<p>A tile’s scroll bar carries its outline: move the pointer to this tile’s right edge, or scroll, and ticks appear — one for each heading, the ones in view lit. They swell under the pointer, each showing its section in a card; click one to go there. <kbd>⌘/</kbd> (or the button in the bar) shows the outline as a sidebar of the tile’s own, with a filter.</p>
<h2>Undo</h2>
<p><kbd>⌘Z</kbd> undoes the space’s last change at your hand — a tile placed, taken off, moved, docked, resized, maximized — a hundred deep per space; <kbd>⇧⌘Z</kbd> redoes.</p>
<h2>The look</h2>
<p>Four themes come with it — Paper, Newsprint, Classic and Financial Times — each in the light and in the dark, with a choice of accent. The <i>Look</i> tile sets them, slows every transition down to be watched, and moves the sun.</p>
<h2>Keys</h2>
<p>Every key is a command by name and can be bound otherwise. A browser keeps some for itself (<kbd>⌘W</kbd>, <kbd>⌘T</kbd>, <kbd>⌃⇥</kbd>), so second keys are given: <kbd>⌥⌘W</kbd> closes a tile, <kbd>⌥⌘T</kbd> makes one, <kbd>⌥⇥</kbd> walks.</p>
<ul><li><kbd>⌃⌘=</kbd> grow · <kbd>⌃⇧⌘=</kbd> fill the column · <kbd>⇧⌘↩</kbd> maximize</li><li><kbd>⌥⌘←↑↓→</kbd> the focus that way · <kbd>⌥⇧⌘←↑↓→</kbd> the tile that way</li><li><kbd>⌘J</kbd> next in the inbox · <kbd>⌘'</kbd> overview · <kbd>⇧⌘/</kbd> the sidebar · <kbd>⌘O</kbd> the library · <kbd>⇧⌘A</kbd> tiles and recently closed · <kbd>⇧⌘T</kbd> reopen</li></ul>
`;

const NOTE = `<h1>Things to try</h1><p>This note is yours to edit: its first heading names it, and the dot after its name says it has edits.</p>
<h2>Arranging</h2><ul><li>Click the Guide’s bar a few times, then ⌘-click it, then click again.</li><li>Drag the terminal by its bar to the right edge of the window.</li><li>Dock the agent (⌘M), then click its row in the sidebar.</li></ul>
<h2>Things</h2><ul><li>Drag a row from the Library onto this note.</li><li>Rest a drag over the terminal until the palette opens.</li><li>⇧-drag the terminal’s bar onto the Guide to link them.</li></ul>
<h2>Elsewhere</h2><p>Hold a tile over another space’s square until it springs open.</p>`;

const lorem = (title, n) => `<h1>${title}</h1>` + Array.from({ length: n }, (_, i) => `<h2>Part ${i + 1}</h2><p>${'The tiles are what you made them; nothing is tidied away. '.repeat(3)}</p><h3>A detail</h3><p>${'Room goes back where it came from. '.repeat(4)}</p>`).join('');

// What can be recalled: the library.
ui.addToLibrary({ id: 'guide', title: 'A Guide to the Grid', subtitle: 'how it all works', symbol: 'book', group: 'Documents', tile: { type: 'doc', place: 'docs/guide.md', data: { html: GUIDE } } });
ui.addToLibrary({ id: 'design', title: 'Design Notes', subtitle: 'a long one, for the outline', symbol: 'doc.plaintext', group: 'Documents', tile: { type: 'doc', place: 'docs/design.md', data: { html: lorem('Design notes', 14) } } });
ui.addToLibrary({ id: 'try', title: 'Things to Try', subtitle: 'a note', symbol: 'manifold.note', group: 'Notes', tile: { type: 'note', data: { html: NOTE } } });
ui.addToLibrary({ id: 'look', title: 'Look', subtitle: 'themes, tint, motion', symbol: 'paintpalette', group: 'Tools', tile: { type: 'look', place: 'themes and motion' } });
ui.addToLibrary({ id: 'agent', title: 'Agent', subtitle: 'a tile with a status', symbol: 'sparkle', group: 'Tools', tile: { type: 'agent' } });
ui.addToLibrary({ id: 'page', title: 'example.com', subtitle: 'a page, its address in its bar', symbol: 'globe', group: 'Tools', tile: { type: 'web', data: { url: 'https://example.com/' } } });
ui.addToLibrary({ id: 'folder', title: 'Library Folder', subtitle: 'rows to drag out', symbol: 'folder', group: 'Tools', tile: { type: 'folder', title: 'Library', place: 'everything to recall' } });

// Three spaces; the first as a column of reading beside a column of doing.
// (Set up quietly: nothing flies about before the window's been seen.)
ui.quietly(() => {
  const main = ui.addSpace({ name: 'manifold-ui', color: 'blue' });
  const guide = ui.recall('guide');
  const term = ui.open({ type: 'terminal', title: 'zsh', place: '~/src/manifold-ui', path: [{ title: '~' }, { title: 'src' }, { title: 'manifold-ui' }], data: { cwd: '~/src/manifold-ui', history: [], replay: ['help', 'ls'] } }, { newColumn: true });
  const note = ui.recall('try', { beside: term });
  const agent = ui.recall('agent', { beside: note });
  ui.recall('look', { beside: guide, focus: false });
  ui.link(note, guide);
  ui.change(main, [{ type: 'fractions', fractions: [0.56, 0.44] }], { undo: false });
  ui.togglePin(guide);

  const docs = ui.addSpace({ name: 'Reading', color: 'orange', symbol: 'book' }, { select: false });
  ui.recall('design', { space: docs });
  ui.recall('folder', { space: docs, newColumn: true });

  const scratch = ui.addSpace({ name: 'Scratch', color: 'green' }, { select: false });
  ui.open({ type: 'terminal', title: 'zsh', place: '~', data: { cwd: '~', history: [], replay: ['seq 60'] } }, { space: scratch });
  ui.recall('page', { space: scratch, newColumn: true });

  ui.goTo(guide);
  main.undo = [];
});
