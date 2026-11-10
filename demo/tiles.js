// The demo's tiles. The toolkit doesn't know what a tile is — only how to
// show one, move it about and say how it stands — so these are small
// stand-ins for the kinds of thing an application would put in a grid: a
// terminal, a note, a document, a folder, an agent, a page, and a tile of
// settings for the toolkit's own look.

import { h, Outline, OutlinedView, Flat, themeNames, getTheme, TINTS, Motion, icon } from '../src/index.js';

const el = h;

// ------------------------------------------------------------- terminal

const LISTING = ['README.md', 'package.json', 'demo/', 'src/', 'test/'];

function terminal(tile, ui) {
  const state = tile.data ?? (tile.data = { cwd: '~/src/manifold-ui', history: [] });
  const out = el('div.demo-term-out');
  const input = el('input.demo-term-input', { spellcheck: false, autocapitalize: 'off', placeholder: 'help' });
  const prompt = el('div.demo-term-prompt', el('span.demo-term-ps', '❯'), input);
  const scroll = el('div.demo-term', out, prompt);
  const outline = new Outline();
  const commands = []; // {line, el, status, started, ended}
  const view = new OutlinedView({
    content: scroll, outline, policy: 'recent', emptyText: 'No commands yet',
    tops: () => commands.map((c) => c.el.offsetTop),
    preview: (i) => ({ lines: commands[i]?.output.slice(-4) ?? [], code: true }),
    onDragItem: (i, e) => ui.dragThings([{ title: commands[i].line, symbol: 'manifold.terminal', text: commands[i].line }], e),
  });
  const took = (c) => {
    const s = Math.max(1, Math.round(((c.ended ?? Date.now()) - c.started) / 1000));
    return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
  };
  const sync = () => {
    outline.setItems(commands.map((c, i) => ({
      title: c.line, code: true, failed: c.status > 0, running: c.status == null && i === commands.length - 1,
      detail: c.status == null ? 'running' : `${c.status ? `exit ${c.status} · ` : ''}${took(c)}`,
    })));
    view.update();
    const last = commands[commands.length - 1];
    tile.update({ summary: last ? { lines: [`$ ${last.line}`, ...last.output.slice(-2)], code: true, note: last.status == null ? 'running' : last.status ? `exit ${last.status}` : took(last), tone: last.status == null ? 'running' : last.status ? 'failed' : 'plain' } : { lines: ['No commands yet'] } });
  };
  const print = (c, text, cls = '') => {
    c.output.push(text);
    c.el.append(el('div.demo-term-line' + (cls ? '.' + cls : ''), text));
    scroll.scrollTop = scroll.scrollHeight;
  };
  const finish = (c, status = 0) => {
    c.status = status;
    c.ended = Date.now();
    prompt.hidden = false;
    sync();
    scroll.scrollTop = scroll.scrollHeight;
    if (document.activeElement === document.body) input.focus();
  };
  const run = (line) => {
    const c = { line, output: [], status: null, started: Date.now(), el: el('div.demo-term-command', el('div.demo-term-line.demo-term-cmd', el('span.demo-term-ps', '❯'), ' ' + line)) };
    commands.push(c);
    state.history.push(line);
    out.append(c.el);
    prompt.hidden = true;
    sync();
    const [name, ...args] = line.trim().split(/\s+/);
    if (name === 'help') {
      ['ls — list this folder', 'make test — run the tests (it works, with progress, then is done)', 'make fail — a run that fails',
        'ask — a program that needs you (a permission)', 'sleep N — work for N seconds', 'seq N — print N lines', 'open NAME — recall something from the library', 'clear'].forEach((l) => print(c, l));
      finish(c);
    } else if (name === 'ls') {
      LISTING.forEach((l) => print(c, l));
      finish(c);
    } else if (name === 'seq') {
      for (let i = 1; i <= Math.min(Number(args[0]) || 20, 400); i++) print(c, String(i));
      finish(c);
    } else if (name === 'clear') {
      commands.length = 0;
      out.replaceChildren();
      prompt.hidden = false;
      sync();
    } else if (name === 'open') {
      const entry = ui.library.find((e) => e.title.toLowerCase().includes(args.join(' ').toLowerCase()));
      if (entry) { print(c, `opening ${entry.title}`); ui.recall(entry.id, { beside: tile }); finish(c); } else { print(c, `open: nothing called “${args.join(' ')}”`, 'demo-term-err'); finish(c, 1); }
    } else if (name === 'sleep' || (name === 'make' && (args[0] === 'test' || args[0] === 'fail'))) {
      const total = name === 'sleep' ? (Number(args[0]) || 3) * 1000 : 4200;
      const fails = args[0] === 'fail';
      const start = Date.now();
      let n = 0;
      tile.setStatus({ state: 'working', progress: name === 'make' ? 0 : undefined, app: name, title: line });
      const tick = setInterval(() => {
        const p = Math.min((Date.now() - start) / total, 1);
        if (name === 'make') {
          n += 1;
          print(c, `ok   test/${['arrangement', 'grid', 'links', 'sidebar', 'drag', 'themes'][n % 6]}.test.js  (${(Math.random() * 40 + 4).toFixed(1)} ms)`);
          tile.setStatus({ state: 'working', progress: p * 100, app: 'make', title: line });
        }
        if (p < 1) return;
        clearInterval(tick);
        if (fails) { print(c, 'FAIL test/genie.test.js: expected a funnel, got a card', 'demo-term-err'); print(c, 'make: *** [test] Error 2', 'demo-term-err'); }
        else if (name === 'make') print(c, `PASS  ${n} tests`, 'demo-term-ok');
        tile.setStatus({ state: fails ? 'error' : 'done', app: name, title: line, msg: fails ? 'exit 2' : undefined });
        finish(c, fails ? 2 : 0);
      }, name === 'make' ? 380 : 200);
      view.timers.push(tick);
    } else if (name === 'ask') {
      print(c, 'This will write to ~/src/manifold-ui. Allow?  [y/N]');
      tile.setStatus({ state: 'blocked', kind: 'permission', app: 'ask', title: 'Write to ~/src/manifold-ui?', msg: 'answer y or n here' });
      c.asking = true;
      prompt.hidden = false;
    } else if (name) {
      print(c, `${name}: command not found — try help`, 'demo-term-err');
      finish(c, 127);
    } else {
      commands.pop();
      c.el.remove();
      prompt.hidden = false;
      sync();
    }
  };
  input.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    const line = input.value;
    input.value = '';
    const last = commands[commands.length - 1];
    if (last?.asking) {
      last.asking = false;
      print(last, `> ${line}`);
      const yes = /^y/i.test(line);
      print(last, yes ? 'written.' : 'left alone.');
      tile.setStatus({ state: yes ? 'done' : 'idle', app: 'ask', title: yes ? 'Wrote the files' : undefined });
      return finish(last, yes ? 0 : 1);
    }
    run(line);
  });
  scroll.addEventListener('click', () => { if (!String(getSelection())) input.focus(); });
  view.timers = [];
  for (const line of state.replay ?? []) run(line);
  sync();
  // Shown for the first time: at its foot, as a terminal is.
  const first = new ResizeObserver(() => {
    if (!scroll.clientHeight) return;
    first.disconnect();
    scroll.scrollTop = scroll.scrollHeight;
  });
  first.observe(scroll);
  return {
    element: view.el, outline,
    get sidebarShown() { return view.sidebarShown; },
    toggleSidebar: () => view.toggleSidebar(),
    focusFilter: () => view.sidebar?.focusFilter?.(),
    focus: () => input.focus({ preventScroll: true }),
    path: () => state.cwd.split('/').map((p, i, all) => ({ title: p || '/', symbol: 'folder', action: () => ui.toasts.say(`Would browse ${all.slice(0, i + 1).join('/')}`) })),
    // What a thing dropped here can be: a shell takes what a command line takes.
    dropForms: (things) => [
      { id: 'text', title: 'Text', symbol: 'text.alignleft', detail: things.map((t) => t.text ?? t.title).join(' ') },
      { id: 'reference', title: 'Reference', symbol: 'number', detail: things.map((t) => `manifold:demo/${t.tile ?? t.library ?? 'thing'}`).join(' ') },
    ],
    dropPut: (things, form) => {
      const words = things.map((t) => (form === 'reference' ? `manifold:demo/${t.tile ?? t.library ?? 'thing'}` : `'${t.text ?? t.title}'`)).join(' ');
      input.value += (input.value && !input.value.endsWith(' ') ? ' ' : '') + words;
      input.focus();
    },
    destroy: () => { view.timers.forEach(clearInterval); view.destroy(); },
  };
}

// ----------------------------------------------------------- note, doc

function headingsOutline(page, outline) {
  const heads = [...page.querySelectorAll('h1, h2, h3')];
  outline.setItems(Outline.headings(heads.map((n) => ({ title: n.textContent.trim() || 'Untitled', level: Number(n.tagName[1]) - 1 }))));
  return heads;
}

function sectionLines(head) {
  const lines = [];
  for (let n = head.nextElementSibling; n && !/^H[1-3]$/.test(n.tagName) && lines.length < 4; n = n.nextElementSibling) {
    const t = n.textContent.trim();
    if (t) lines.push(t);
  }
  return lines;
}

function page(tile, ui, { editable }) {
  const body = el('div.demo-page-body', { contentEditable: editable ? 'true' : 'false', spellcheck: false });
  body.innerHTML = tile.data?.html ?? '<h1>Untitled</h1><p></p>';
  const scroll = el('div.demo-page', body);
  const outline = new Outline();
  let heads = [];
  const view = new OutlinedView({
    content: scroll, outline, emptyText: 'No headings',
    tops: () => heads.map((n) => n.offsetTop),
    preview: (i) => ({ lines: heads[i] ? sectionLines(heads[i]) : [] }),
    onDragItem: (i, e) => ui.dragThings([{ title: outline.items[i].title, symbol: 'number', text: outline.items[i].title }], e),
  });
  const sync = () => {
    heads = headingsOutline(body, outline);
    view.update();
    const lines = [...body.querySelectorAll('p, li')].map((n) => n.textContent.trim()).filter(Boolean).slice(0, 3);
    const patch = { summary: { lines } };
    if (editable) patch.title = heads[0]?.textContent.trim() || 'Untitled';
    tile.update(patch);
  };
  if (editable) body.addEventListener('input', () => { tile.dirty = true; sync(); });
  // Once it's in the page and has a size.
  requestAnimationFrame(sync);
  return {
    element: view.el, outline,
    get sidebarShown() { return view.sidebarShown; },
    toggleSidebar: () => view.toggleSidebar(),
    focusFilter: () => view.sidebar?.focusFilter?.(),
    focus: () => { if (editable && !body.contains(document.activeElement)) body.focus({ preventScroll: true }); },
    serialize: () => ({ html: body.innerHTML }),
    menu: () => (editable ? [{ title: 'Save', symbol: 'square.and.arrow.down', disabled: !tile.dirty, action: () => { tile.update({ dirty: false }); ui.toasts.say(`Saved “${tile.title}”`, { seconds: 4 }); } }] : []),
    // A note links what's dropped in it.
    dropForms: (things) => (editable ? [
      { id: 'link', title: 'Link', symbol: 'link', detail: `[${things[0].title}](manifold:…)` },
      { id: 'text', title: 'Text', symbol: 'text.alignleft', detail: things.map((t) => t.text ?? t.title).join(', ') },
    ] : []),
    dropPut: (things, form) => {
      const p = el('p');
      for (const t of things) {
        if (form === 'link') {
          const a = el('span.demo-link', { contentEditable: 'false' }, icon(t.symbol ?? 'link', { size: 11 }), ' ' + t.title);
          a.addEventListener('click', () => { const target = ui.tile(t.tile); if (target) ui.goTo(target); else if (t.library) ui.recall(t.library); });
          p.append(a, ' ');
          if (t.tile && ui.tile(t.tile)) ui.link(tile, ui.tile(t.tile));
        } else {
          p.append((t.text ?? t.title) + ' ');
        }
      }
      body.append(p);
      tile.dirty = true;
      sync();
      scroll.scrollTop = scroll.scrollHeight;
    },
    destroy: () => view.destroy(),
  };
}

// --------------------------------------------------------------- folder

function folder(tile, ui) {
  const list = el('div.demo-list');
  const render = () => {
    list.replaceChildren(...ui.library.map((entry) => {
      const row = el('div.demo-row', icon(entry.symbol ?? 'doc', { size: 13 }), el('span.demo-row-name', entry.title), el('span.demo-row-detail', entry.subtitle ?? entry.group ?? ''));
      // Clicked, by the one rule: plain goes to it, ⌘ beside, ⌥ over. Dragged, it's a thing.
      row.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        let dragged = false;
        const start = { x: e.clientX, y: e.clientY };
        const move = (ev) => {
          if (dragged || Math.hypot(ev.clientX - start.x, ev.clientY - start.y) <= 4) return;
          dragged = true;
          done();
          ui.dragThings([{ title: entry.title, symbol: entry.symbol ?? 'doc', library: entry.id, text: entry.title }], ev);
        };
        const up = (ev) => {
          done();
          const mac = /Mac/.test(navigator.platform);
          const where = ev.altKey ? { over: tile, again: true } : (mac ? ev.metaKey : ev.ctrlKey) ? { beside: tile, again: true } : { beside: tile };
          ui.recall(entry.id, where);
        };
        const done = () => { window.removeEventListener('pointermove', move, true); window.removeEventListener('pointerup', up, true); };
        window.addEventListener('pointermove', move, true);
        window.addEventListener('pointerup', up, true);
      });
      return row;
    }));
    tile.update({ summary: { lines: ui.library.slice(0, 3).map((e) => e.title), note: `${ui.library.length} items` } });
  };
  render();
  return { element: el('div.demo-folder', el('div.demo-hint', 'Click one to go to it (⌘ beside, ⌥ over). Drag one onto the grid, a terminal, a note, or a space’s square.'), list) };
}

// ---------------------------------------------------------------- agent

function agent(tile, ui) {
  const log = el('div.demo-agent-log');
  const actions = el('div.demo-agent-actions');
  const say = (text, cls = '') => { log.append(el('div.demo-agent-line' + (cls ? '.' + cls : ''), text)); log.scrollTop = log.scrollHeight; tile.update({ summary: { lines: [...log.children].slice(-3).map((n) => n.textContent) } }); };
  let timer = null;
  const steps = ['Reading the grid’s layout', 'Porting the loans', 'Checking the dock', 'Writing tests', 'Running them'];
  const work = (from = 0) => {
    let i = from;
    actions.replaceChildren();
    tile.setStatus({ state: 'working', progress: (i / steps.length) * 100, app: 'agent', title: steps[i] });
    timer = setInterval(() => {
      say(`• ${steps[i]}`);
      i += 1;
      if (i === 3 && from < 3) {
        clearInterval(timer);
        say('May I write to test/arrangement.test.js?', 'demo-agent-ask');
        tile.setStatus({ state: 'blocked', kind: 'permission', app: 'agent', title: 'Write test/arrangement.test.js?' });
        actions.replaceChildren(
          Flat.flatButton({ title: 'Allow', primary: true, onClick: () => { say('Allowed.'); work(3); } }),
          Flat.flatButton({ title: 'Deny', onClick: () => { say('Denied: stopped.', 'demo-agent-ask'); tile.setStatus({ state: 'error', app: 'agent', title: 'Stopped', msg: 'permission denied' }); idle(); } }));
        return;
      }
      if (i >= steps.length) {
        clearInterval(timer);
        say('Done: 7 tests pass.', 'demo-agent-done');
        tile.setStatus({ state: 'done', app: 'agent', title: '7 tests pass' });
        return idle();
      }
      tile.setStatus({ state: 'working', progress: (i / steps.length) * 100, app: 'agent', title: steps[i] });
    }, 1100);
  };
  const idle = () => actions.replaceChildren(Flat.flatButton({ title: 'Start a Turn', symbol: 'sparkle', primary: true, onClick: () => { log.replaceChildren(); work(); } }));
  idle();
  say('An agent’s tile reports a status as it goes: its name shimmers while it works, a pill says when it needs you, and Done stays until you’ve looked.');
  return { element: el('div.demo-agent', log, actions), destroy: () => clearInterval(timer) };
}

// ----------------------------------------------------------------- page

function webPage(tile, ui) {
  const frame = el('iframe.demo-web', { sandbox: '' });
  const history = [];
  const show = (address) => {
    const host = address.replace(/^https?:\/\//, '').split('/')[0] || 'page';
    frame.srcdoc = `<body style="font: 15px/1.5 -apple-system, system-ui, sans-serif; margin: 40px; color: #333; background: #fff">
      <h1 style="font-size: 26px">${host}</h1><p>This stands in for <b>${address}</b>.</p>
      <p>A page has no address bar of its own: click the address in the tile’s bar and it becomes a field, there — ⏎ goes, ⎋ leaves it.</p></body>`;
    tile.update({ title: host, place: address, summary: { lines: [address] } });
  };
  const go = (address) => { history.push(address); show(address); };
  go(tile.data?.url ?? 'https://example.com/');
  return {
    element: frame,
    editPlace: () => ({ text: tile.place, placeholder: 'Search or enter an address', commit: (text) => go(/^\w+:\/\//.test(text) ? text : `https://${text}`) }),
    barButtons: () => [
      { symbol: 'chevron.left', tooltip: 'Back', enabled: history.length > 1, action: () => { history.pop(); show(history[history.length - 1]); } },
      { symbol: 'arrow.clockwise', tooltip: 'Reload', enabled: true, action: () => show(tile.place) },
    ],
    serialize: () => ({ url: tile.place }),
  };
}

// ------------------------------------------------------------- the look

function look(tile, ui) {
  const names = themeNames();
  const section = (title, ...controls) => el('div.demo-look-section', el('div.demo-look-label', title), el('div.demo-look-controls', ...controls));
  const theme = Flat.flatSegments({ items: names.map((n) => ({ title: getTheme(n).name })), selected: Math.max(0, names.indexOf(ui.options.theme)), onChange: (i) => ui.setTheme(names[i]) });
  const appearances = ['auto', 'light', 'dark'];
  const appearance = Flat.flatSegments({ items: [{ title: 'Auto' }, { title: 'Light' }, { title: 'Dark' }], selected: appearances.indexOf(ui.options.appearance), onChange: (i) => ui.setAppearance(appearances[i]) });
  const tint = Flat.flatSegments({ items: TINTS.map((t) => ({ title: t[0].toUpperCase() + t.slice(1) })), selected: Math.max(0, TINTS.indexOf(ui.options.tint)), onChange: (i) => ui.setTint(TINTS[i]) });
  const speeds = [1, 4, 10];
  const speed = Flat.flatSegments({ items: [{ title: 'As it is' }, { title: '4× slower' }, { title: '10× slower' }], selected: Math.max(0, speeds.indexOf(Motion.slowdown)), onChange: (i) => { Motion.slowdown = speeds[i]; } });
  const hours = [null, 7, 13, 19, 23];
  const hour = Flat.flatSegments({ items: [{ title: 'Now' }, { title: '7 am' }, { title: '1 pm' }, { title: '7 pm' }, { title: '11 pm' }], selected: 0, onChange: (i) => {
    if (!ui.backdrop) return;
    const d = new Date();
    if (hours[i] != null) d.setHours(hours[i], 0, 0, 0);
    ui.backdrop.clock = hours[i] == null ? null : d;
    ui.backdrop.relight(true);
  } });
  const try_ = el('div.demo-look-controls',
    Flat.flatButton({ title: 'Say Something', onClick: () => ui.toasts.say('A toast rises from the window’s foot.') }),
    Flat.flatButton({ title: 'Something to Undo', onClick: () => ui.toasts.show('Deleted “Untitled”', { action: 'Undo', seconds: 6, countdown: true, onAction: () => ui.toasts.say('Put back.', { seconds: 3 }) }) }),
    Flat.flatButton({ title: 'Overview', symbol: 'square.grid.2x2', onClick: () => ui.run('overview') }),
    Flat.flatButton({ title: ui.sidebarPinned ? 'Let Sidebar Slide Out' : 'Keep Sidebar Shown', symbol: 'sidebar.left', onClick: (e) => { ui.run('toggleSidebar'); } }));
  tile.update({ summary: { lines: ['Theme, appearance, tint', 'Motion, the backdrop’s light'] } });
  return {
    element: el('div.demo-look',
      section('Theme', theme.el), section('Appearance', appearance.el), section('Tint', tint.el),
      section('Motion', speed.el), section('The backdrop’s light', hour.el), section('Try', try_),
      el('div.demo-hint', 'Every colour is a theme’s — the chrome, the texts, the status colours, the wash under the tiles — so a theme recolours all of it at once. The wash is drawn with WebGL: a few pools of light, placed afresh each day and lit by the hour.')),
  };
}

export function registerDemoTiles(ui) {
  ui.registerTileType({ type: 'terminal', name: 'Terminal', symbol: 'manifold.terminal', create: terminal, make: () => ({ title: 'zsh', place: '~/src/manifold-ui' }) });
  ui.registerTileType({ type: 'note', name: 'Note', symbol: 'manifold.note', create: (t, u) => page(t, u, { editable: true }), make: () => ({ title: 'Untitled', data: { html: '<h1>Untitled</h1><p>Write here. Headings become the outline.</p>' } }) });
  ui.registerTileType({ type: 'doc', name: 'Document', symbol: 'doc.plaintext', create: (t, u) => page(t, u, { editable: false }), listed: false });
  ui.registerTileType({ type: 'folder', name: 'Library Folder', symbol: 'folder', create: folder, make: () => ({ title: 'Library', place: 'everything to recall' }) });
  ui.registerTileType({ type: 'agent', name: 'Agent', symbol: 'sparkle', create: agent, make: () => ({ title: 'Agent' }) });
  ui.registerTileType({ type: 'web', name: 'Page', symbol: 'globe', create: webPage, make: () => ({ title: 'example.com', data: { url: 'https://example.com/' } }) });
  ui.registerTileType({ type: 'look', name: 'Look', symbol: 'paintpalette', create: look, make: () => ({ title: 'Look', place: 'themes and motion' }) });
}
