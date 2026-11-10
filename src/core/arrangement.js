// A space's grid, as a value: columns of tiles, every tile visible, as acme
// tiles its windows — and the tiles docked out of it. A port of Manifold's
// ArrangementState (ManifoldCore/Blocks.swift, Events.swift, Node.swift):
// the same events, the same arithmetic, so a space laid out here behaves as
// one laid out there.
//
// Room goes back where it came from: a tile keeps what it borrowed as it
// came from the tiles that made room for it (`loans`), and pays each back
// as it goes. A height set by hand forgives the loans of the tiles it sets.
//
// The state is plain data (JSON-safe). Tiles are named by id; what a tile
// *is* belongs to whoever owns the ids.

/** A share so small the grid draws only the tile's bar. */
export const BAR_SLIVER = 0.001;
const SLIVER = 0.04;

export function emptyArrangement() {
  return { columns: [], fractions: [], heights: {}, docked: [], focused: null, full: null, loans: {} };
}

export function cloneArrangement(a) {
  return {
    columns: a.columns.map((c) => c.slice()),
    fractions: a.fractions.slice(),
    heights: { ...a.heights },
    docked: a.docked.map((d) => ({ ...d, gave: { ...d.gave } })),
    focused: a.focused,
    full: a.full,
    loans: Object.fromEntries(Object.entries(a.loans).map(([k, v]) => [k, { ...v }])),
  };
}

const sum = (xs) => xs.reduce((s, x) => s + x, 0);
const equalFractions = (n) => (n === 0 ? [] : Array(n).fill(1 / n));

// ---------------------------------------------------------------- queries

/** Every tile of the space: the grid's, in column order, then the docked. */
export function allTiles(a) {
  return a.columns.flat().concat(a.docked.map((d) => d.id));
}
export function gridTiles(a) {
  return a.columns.flat();
}
export function hasTile(a, id) {
  return locate(a, id) !== null || isDocked(a, id);
}
/** The column (and index in it) holding a tile, or null. */
export function locate(a, id) {
  for (let c = 0; c < a.columns.length; c++) {
    const i = a.columns[c].indexOf(id);
    if (i >= 0) return { column: c, index: i };
  }
  return null;
}
export function isDocked(a, id) {
  return a.docked.some((d) => d.id === id);
}
export function dockedTile(a, id) {
  return a.docked.find((d) => d.id === id) || null;
}
/** A tile's share of its column. */
export function heightOf(a, id) {
  const at = locate(a, id);
  if (!at) return 0;
  return a.heights[id] ?? 1 / a.columns[at.column].length;
}
/** The biggest tile of a column: where a new one takes its lower half. */
export function biggestTile(a, c) {
  if (c < 0 || c >= a.columns.length) return null;
  let best = null;
  for (const id of a.columns[c]) if (best === null || heightOf(a, id) > heightOf(a, best)) best = id;
  return best;
}
/** The column the focus is in (acme's active column), else the last. */
export function focusedColumn(a) {
  if (a.focused) {
    const at = locate(a, a.focused);
    if (at) return at.column;
  }
  return a.columns.length ? a.columns.length - 1 : null;
}

// ------------------------------------------------------------- normalize

export function normalize(a) {
  a.columns = a.columns.filter((c) => c.length > 0);
  if (a.fractions.length !== a.columns.length || a.fractions.some((f) => !(f > 0))) {
    a.fractions = equalFractions(a.columns.length);
  }
  // Every tile has a share, and each column's sum to 1.
  const fixed = {};
  for (const column of a.columns) {
    const shares = column.map((id) => (a.heights[id] != null && a.heights[id] >= 0 ? a.heights[id] : null));
    const known = shares.filter((s) => s !== null);
    const missing = shares.length - known.length;
    const left = Math.max(0, 1 - sum(known));
    let out = shares.map((s) => (s !== null ? s : missing > 0 ? Math.max(left / missing, 0.05) : 0));
    let total = sum(out);
    if (total === 0) {
      out = out.map(() => 1);
      total = out.length;
    }
    column.forEach((id, i) => (fixed[id] = out[i] / total));
  }
  a.heights = fixed;
  if (a.focused && !locate(a, a.focused)) a.focused = null;
  if (!a.focused) a.focused = gridTiles(a)[0] ?? null;
  if (a.full && !locate(a, a.full)) a.full = null;
  const loans = {};
  for (const [borrower, owed] of Object.entries(a.loans)) {
    if (!(borrower in fixed)) continue;
    const kept = Object.fromEntries(Object.entries(owed).filter(([lender]) => lender in fixed));
    if (Object.keys(kept).length) loans[borrower] = kept;
  }
  a.loans = loans;
  return a;
}

// -------------------------------------------------------------- internals

/** A tile gone from where it lent room: nothing owed to it there. */
function forgetLender(a, id) {
  for (const b of Object.keys(a.loans)) {
    if (a.loans[b][id] != null) {
      delete a.loans[b][id];
      if (!Object.keys(a.loans[b]).length) delete a.loans[b];
    }
  }
}

/**
 * A tile gone from column `c` (closed, moved away, docked): its room goes
 * back where it came from — to the tiles it borrowed it from, still beside
 * it, as much as each lent (less, in proportion, if it has less now); the
 * rest to the tile it would have taken room from, the nearest above, else
 * below. What went where, returned.
 */
function giveBack(a, id, c, i) {
  const h = a.heights[id] ?? 0;
  delete a.heights[id];
  const owed = a.loans[id] ?? {};
  delete a.loans[id];
  forgetLender(a, id);
  const column = a.columns[c];
  if (!column.length) return {};
  const lenders = Object.entries(owed).filter(([k, v]) => v > 0 && column.includes(k));
  const total = sum(lenders.map(([, v]) => v));
  const scale = total > h && total > 0 ? h / total : 1;
  let left = h;
  const gave = {};
  // In a set order: every copy of the space pays back alike.
  for (const [k, v] of lenders.sort((x, y) => (x[0] < y[0] ? -1 : 1))) {
    a.heights[k] = (a.heights[k] ?? 0) + v * scale;
    gave[k] = (gave[k] ?? 0) + v * scale;
    left -= v * scale;
  }
  if (!(left > 1e-9)) return gave;
  const at = Math.min(i, column.length);
  const heir = at > 0 ? column[at - 1] : column[Math.min(at, column.length - 1)];
  a.heights[heir] = (a.heights[heir] ?? 0) + left;
  gave[heir] = (gave[heir] ?? 0) + left;
  return gave;
}

/** A column added at the end: its width taken from every column in proportion. */
function appendColumn(a, column) {
  const n = a.columns.length;
  a.columns.push(column);
  if (n > 0 && a.fractions.length === n) {
    const share = 1 / (n + 1);
    a.fractions = a.fractions.map((f) => f * (1 - share)).concat([share]);
  } else {
    a.fractions = equalFractions(n + 1);
  }
}

/** A column put in at `index` with a share `width` (the rest narrowed in proportion). */
function insertColumn(a, column, index, width) {
  const n = a.columns.length;
  const i = Math.min(Math.max(index, 0), n);
  a.columns.splice(i, 0, column);
  if (!(n > 0 && a.fractions.length === n)) {
    a.fractions = equalFractions(n + 1);
    return;
  }
  const share = Math.min(Math.max(width ?? 1 / (n + 1), 0.05), 0.9);
  a.fractions = a.fractions.map((f) => f * (1 - share));
  a.fractions.splice(i, 0, share);
}

function removeColumn(a, c) {
  a.columns.splice(c, 1);
  if (a.fractions.length === a.columns.length + 1) {
    const gone = a.fractions.splice(c, 1)[0];
    a.fractions = gone < 1 && a.fractions.length ? a.fractions.map((f) => f / (1 - gone)) : equalFractions(a.columns.length);
  } else {
    a.fractions = equalFractions(a.columns.length);
  }
}

/** A tile out of the grid into the dock: its room to `heir` (its debts too)
 *  if that's in its column, else back where it came from. */
function dockTile(a, id, wanted, stamp) {
  const at = locate(a, id);
  if (!at) return;
  const { column: c, index: i } = at;
  a.columns[c].splice(i, 1);
  const above = i > 0 ? a.columns[c][i - 1] : null;
  const below = i < a.columns[c].length ? a.columns[c][i] : null;
  const h = a.heights[id] ?? 0;
  let gave;
  let under = null;
  const heirAt = wanted && wanted !== id ? locate(a, wanted) : null;
  if (heirAt && heirAt.column === c) {
    under = wanted;
    a.heights[wanted] = (a.heights[wanted] ?? 0) + (a.heights[id] ?? 0);
    delete a.heights[id];
    const owed = a.loans[id] ?? {};
    delete a.loans[id];
    for (const [lender, v] of Object.entries(owed)) {
      if (lender === wanted) continue;
      (a.loans[wanted] ??= {})[lender] = (a.loans[wanted][lender] ?? 0) + v;
    }
    forgetLender(a, id);
    gave = { [wanted]: h };
  } else {
    gave = giveBack(a, id, c, i);
  }
  let width = null;
  if (!a.columns[c].length) {
    width = a.fractions.length === a.columns.length ? a.fractions[c] : null;
    removeColumn(a, c);
  }
  a.docked = a.docked.filter((d) => d.id !== id);
  a.docked.push({ id, column: c, above, below, height: h, gave, width, at: stamp ?? Date.now(), under });
  if (a.full === id) a.full = null;
  if (a.focused === id) {
    a.focused =
      (wanted && locate(a, wanted) ? wanted : null) ??
      above ??
      below ??
      (a.columns.length ? a.columns[Math.min(c, a.columns.length - 1)][0] ?? null : null);
  }
}

/** A docked tile back where it was: under the tile it was under (else over
 *  the one it was over, else a column of its own where its was), its room
 *  taken back from those that took it, down to a sliver each; what they
 *  can't give, from the tile it's under (half at most). */
function undockTile(a, id) {
  const k = a.docked.findIndex((d) => d.id === id);
  if (k < 0) return;
  const d = a.docked.splice(k, 1)[0];
  let spot = null;
  const aboveAt = d.above ? locate(a, d.above) : null;
  const belowAt = d.below ? locate(a, d.below) : null;
  if (aboveAt) spot = { column: aboveAt.column, index: aboveAt.index + 1 };
  else if (belowAt) spot = { column: belowAt.column, index: belowAt.index };
  if (!spot || !a.columns[spot.column].length) {
    insertColumn(a, [d.id], d.column, d.width);
    a.heights[id] = 1;
    a.focused = id;
    return;
  }
  const { column: c, index: i } = spot;
  const taken = {};
  for (const [lender, v] of Object.entries(d.gave).sort((x, y) => (x[0] < y[0] ? -1 : 1))) {
    if (!a.columns[c].includes(lender)) continue;
    const give = Math.min(v, Math.max(0, (a.heights[lender] ?? 0) - SLIVER));
    if (!(give > 1e-9)) continue;
    a.heights[lender] = (a.heights[lender] ?? 0) - give;
    taken[lender] = (taken[lender] ?? 0) + give;
  }
  // Too little back (the column's changed): half the tile it's under.
  if (sum(Object.values(taken)) < Math.min(d.height, 0.1)) {
    const donor = i > 0 ? a.columns[c][i - 1] : a.columns[c][0];
    const give = (a.heights[donor] ?? 0) / 2;
    a.heights[donor] = (a.heights[donor] ?? 0) - give;
    taken[donor] = (taken[donor] ?? 0) + give;
  }
  a.columns[c].splice(Math.min(i, a.columns[c].length), 0, d.id);
  a.heights[id] = sum(Object.values(taken));
  a.loans[id] = taken;
  a.focused = id;
}

// ----------------------------------------------------------------- events

/**
 * Applies one event to an arrangement, in place. Events:
 *  {type:'place', id, column, at}   column one past the last makes a new column
 *  {type:'move', id, column, at}
 *  {type:'dock', id, heir?}
 *  {type:'undock', id}
 *  {type:'remove', id}
 *  {type:'focus', id}
 *  {type:'fractions', fractions}
 *  {type:'heights', heights}
 *  {type:'full', id}
 *  {type:'moveColumn', from, to}
 *  {type:'restore', state}
 */
export function apply(a, e) {
  switch (e.type) {
    case 'place': {
      if (hasTile(a, e.id)) return a;
      if (e.column >= a.columns.length) {
        appendColumn(a, [e.id]);
        a.heights[e.id] = 1;
      } else {
        const c = Math.max(e.column, 0);
        const i = Math.min(Math.max(e.at, 0), a.columns[c].length);
        // The new tile takes the lower half of the one above it (acme's
        // coladd), or the upper half of the first when it comes first.
        if (!a.columns[c].length) {
          a.heights[e.id] = 1;
        } else {
          const donor = i > 0 ? a.columns[c][i - 1] : a.columns[c][0];
          const h = a.heights[donor] ?? 1 / a.columns[c].length;
          a.heights[donor] = h / 2;
          a.heights[e.id] = h / 2;
          a.loans[e.id] = { [donor]: h / 2 };
        }
        a.columns[c].splice(i, 0, e.id);
      }
      a.focused = e.id;
      break;
    }
    case 'restore': {
      const s = cloneArrangement(e.state);
      Object.assign(a, s);
      break;
    }
    case 'dock':
      dockTile(a, e.id, e.heir ?? null, e.at);
      break;
    case 'undock':
      undockTile(a, e.id);
      break;
    case 'move': {
      // A docked tile dropped into the grid comes out where it's put.
      let target = e.column;
      const k = a.docked.findIndex((d) => d.id === e.id);
      if (k >= 0) {
        a.docked.splice(k, 1);
      } else {
        const at = locate(a, e.id);
        if (!at) return a;
        a.columns[at.column].splice(at.index, 1);
        giveBack(a, e.id, at.column, at.index);
        if (!a.columns[at.column].length) {
          removeColumn(a, at.column);
          if (target > at.column) target -= 1;
        }
      }
      if (target >= a.columns.length) {
        appendColumn(a, [e.id]);
        a.heights[e.id] = 1;
      } else {
        const t = Math.max(target, 0);
        const j = Math.min(Math.max(e.at, 0), a.columns[t].length);
        // The room comes from the tile above the spot, else the first —
        // borrowed, as an opened tile's is: paid back when it goes.
        const donor = j > 0 ? a.columns[t][j - 1] : a.columns[t][0];
        if (donor != null) {
          const h = a.heights[donor] ?? 1 / Math.max(a.columns[t].length, 1);
          a.heights[donor] = h / 2;
          a.heights[e.id] = h / 2;
          a.loans[e.id] = { [donor]: h / 2 };
        } else {
          a.heights[e.id] = 1;
        }
        a.columns[t].splice(j, 0, e.id);
      }
      if (a.fractions.length !== a.columns.length) a.fractions = equalFractions(a.columns.length);
      a.focused = e.id;
      break;
    }
    case 'remove': {
      const k = a.docked.findIndex((d) => d.id === e.id);
      if (k >= 0) {
        a.docked.splice(k, 1);
        return a;
      }
      const at = locate(a, e.id);
      if (!at) return a;
      const { column: c, index: i } = at;
      // A tile docked under it comes back in its place and room.
      let u = -1;
      for (let j = a.docked.length - 1; j >= 0; j--) if (a.docked[j].under === e.id) { u = j; break; }
      if (u >= 0) {
        const d = a.docked.splice(u, 1)[0];
        a.columns[c][i] = d.id;
        a.heights[d.id] = a.heights[e.id] ?? 0;
        delete a.heights[e.id];
        if (a.loans[e.id]) a.loans[d.id] = a.loans[e.id];
        delete a.loans[e.id];
        forgetLender(a, e.id);
        for (const other of a.docked) if (other.under === e.id) other.under = d.id;
        if (a.focused === e.id || !a.focused) a.focused = d.id;
        if (a.full === e.id) a.full = d.id;
        break;
      }
      a.columns[c].splice(i, 1);
      giveBack(a, e.id, c, i);
      let next = a.columns[c].length ? a.columns[c][Math.min(i, a.columns[c].length - 1)] : null;
      if (!a.columns[c].length) {
        removeColumn(a, c);
        next = a.columns.length ? a.columns[Math.min(c, a.columns.length - 1)][0] ?? null : null;
      }
      if (a.focused === e.id) a.focused = next;
      break;
    }
    case 'focus':
      if (e.id && locate(a, e.id)) a.focused = e.id;
      else if (e.id == null) a.focused = null;
      break;
    case 'fractions':
      if (e.fractions.length === a.columns.length && e.fractions.every((f) => f > 0)) {
        const total = sum(e.fractions);
        a.fractions = e.fractions.map((f) => f / total);
      }
      break;
    case 'heights':
      for (const [k, v] of Object.entries(e.heights)) if (locate(a, k) && v >= 0) a.heights[k] = v;
      // Set by hand (a divider dragged, a tile grown): what those tiles
      // owe, or are owed, is forgiven.
      for (const k of Object.keys(e.heights)) {
        delete a.loans[k];
        forgetLender(a, k);
      }
      break;
    case 'full':
      a.full = e.id && locate(a, e.id) ? e.id : null;
      if (a.full) a.focused = a.full;
      break;
    case 'moveColumn': {
      if (e.from < 0 || e.from >= a.columns.length) return a;
      const column = a.columns.splice(e.from, 1)[0];
      const f = a.fractions.length > e.from ? a.fractions.splice(e.from, 1)[0] : 1 / Math.max(a.columns.length, 1);
      const index = Math.min(Math.max(e.to, 0), a.columns.length);
      a.columns.splice(index, 0, column);
      if (a.fractions.length === a.columns.length - 1) a.fractions.splice(index, 0, f);
      break;
    }
    default:
      return a;
  }
  return normalize(a);
}

export function applyAll(a, events) {
  for (const e of events) apply(a, e);
  return a;
}

// ---------------------------------------------------------------- intents
// Changes that take some working out against the current state, lowered to
// events.

/** Events that bring a new tile into column `column`, as acme places a new
 *  window: below the column's biggest tile, taking its lower half (or below
 *  `below`, when given); a column past the end is a new one. */
export function bringing(a, id, column, below = null) {
  const c = Math.max(column ?? 0, 0);
  if (c >= a.columns.length) return [{ type: 'place', id, column: a.columns.length, at: 0 }];
  let anchor = below != null ? a.columns[c].indexOf(below) : -1;
  if (anchor < 0) {
    const b = biggestTile(a, c);
    anchor = b != null ? a.columns[c].indexOf(b) : -1;
  }
  const at = anchor >= 0 ? anchor + 1 : a.columns[c].length;
  return [{ type: 'place', id, column: c, at }];
}

/** Events that bring a new tile into a new column at `index`. */
export function bringingInNewColumn(a, id, index) {
  const events = [{ type: 'place', id, column: a.columns.length, at: 0 }];
  if (index < a.columns.length) events.push({ type: 'moveColumn', from: a.columns.length, to: Math.max(index, 0) });
  return events;
}

/** Heights after a tile grows (acme's colgrow): by `step` of the column
 *  taken from its neighbors nearest first; or, with `whole`, the whole
 *  column, the column's other tiles docked, their room its. */
export function growing(a, id, step = 0.15, whole = false) {
  const at = locate(a, id);
  if (!at || a.columns[at.column].length <= 1) return [];
  const column = a.columns[at.column];
  const i = at.index;
  if (whole) return column.filter((t) => t !== id).map((t) => ({ type: 'dock', id: t })).concat([{ type: 'focus', id }]);
  const h = {};
  for (const t of column) h[t] = heightOf(a, t);
  let want = step;
  // Nearest neighbors first, below then above, each giving down to a sliver.
  const order = [];
  for (let d = 1; order.length < column.length - 1; d++) {
    if (i + d < column.length) order.push(i + d);
    if (i - d >= 0) order.push(i - d);
  }
  for (const j of order) {
    if (!(want > 0)) break;
    const t = column[j];
    const give = Math.min(want, Math.max(0, h[t] - SLIVER));
    h[t] -= give;
    want -= give;
  }
  h[id] += step - want;
  return [{ type: 'heights', heights: h }];
}

/** A tile taking its column but for the others' bars (a bar ⌥-clicked):
 *  each other down to a sliver — its bar alone — still in the grid. */
export function squeezing(a, id) {
  const at = locate(a, id);
  if (!at || a.columns[at.column].length <= 1) return [];
  const column = a.columns[at.column];
  const h = {};
  for (const t of column) h[t] = t === id ? 1 - BAR_SLIVER * (column.length - 1) : BAR_SLIVER;
  return [{ type: 'heights', heights: h }, { type: 'focus', id }];
}

/** A column a tile filled put back: those docked back the last first, and
 *  every share as it was. */
export function unfilling(a, ids, heights, focus) {
  const back = a.docked.map((d) => d.id).filter((id) => ids.includes(id)).reverse();
  return back.map((id) => ({ type: 'undock', id })).concat([{ type: 'heights', heights }, { type: 'focus', id: focus }]);
}

export function docking(a, id) {
  return locate(a, id) ? [{ type: 'dock', id }] : [];
}

/** Events that bring a tile into view and focus, as going to it does: a
 *  maximized other tile gives way, a docked one goes back where it was. */
export function revealing(a, id) {
  const events = isDocked(a, id) ? [{ type: 'undock', id }, { type: 'focus', id }] : [{ type: 'focus', id }];
  if (a.full && a.full !== id) events.unshift({ type: 'full', id: null });
  return events;
}

/** A tile in another's place (⌥-dropped on it, or opened over it): that
 *  one docked under it, its room the tile's. */
export function replacing(a, target, id) {
  const t = locate(a, target);
  if (id === target || !t || !(locate(a, id) || isDocked(a, id))) return [];
  let spot = t.index + 1;
  const mine = locate(a, id);
  if (mine && mine.column === t.column && mine.index < t.index) spot -= 1;
  return [{ type: 'move', id, column: t.column, at: spot }, { type: 'dock', id: target, heir: id }, { type: 'focus', id }];
}

/** A tile moved one step a way (⌥⇧⌘ and an arrow): up or down past the
 *  tile beside it; left or right into the next column, about as far down as
 *  it was, or — at the edge, with others still in its column — a new column
 *  of its own there. Null where it can go no further. */
export function nudging(a, id, way) {
  const at = locate(a, id);
  if (!at) return null;
  const { column: c, index: i } = at;
  const rest = a.columns[c].filter((t) => t !== id);
  if (way === 'up') return i > 0 ? [{ type: 'move', id, column: c, at: i - 1 }, { type: 'focus', id }] : null;
  if (way === 'down') return i < rest.length ? [{ type: 'move', id, column: c, at: i + 1 }, { type: 'focus', id }] : null;
  const t = way === 'left' ? c - 1 : c + 1;
  if (t < 0 || t >= a.columns.length) {
    // A column of its own at the edge, if it isn't one already.
    if (!rest.length) return null;
    const move = { type: 'move', id, column: a.columns.length, at: 0 };
    return way === 'right' ? [move, { type: 'focus', id }] : [move, { type: 'moveColumn', from: a.columns.length, to: 0 }, { type: 'focus', id }];
  }
  // About as far down: before the first tile there whose middle is below this one's.
  const middles = (col) => {
    let y = 0;
    return col.map((p, j) => {
      const h = heightOf(a, p);
      const m = y + h / 2;
      y += h;
      return [j, m];
    });
  };
  const mine = middles(a.columns[c]).find(([j]) => a.columns[c][j] === id)?.[1] ?? 0;
  const spot = middles(a.columns[t]).find(([, m]) => m > mine)?.[0] ?? a.columns[t].length;
  return [{ type: 'move', id, column: t, at: spot }, { type: 'focus', id }];
}

/** The tile a way from another, by where they sit (⌥⌘ and an arrow): the
 *  nearest in that direction whose span overlaps, by layout rects
 *  `{id: {x, y, w, h}}`. */
export function neighbor(rects, id, way) {
  const r = rects[id];
  if (!r) return null;
  let best = null;
  let bestScore = Infinity;
  const mid = { x: r.x + r.w / 2, y: r.y + r.h / 2 };
  for (const [other, o] of Object.entries(rects)) {
    if (other === id) continue;
    const om = { x: o.x + o.w / 2, y: o.y + o.h / 2 };
    let ahead, across, overlap;
    if (way === 'left' || way === 'right') {
      ahead = way === 'left' ? r.x - (o.x + o.w) : o.x - (r.x + r.w);
      across = Math.abs(om.y - mid.y);
      overlap = Math.min(r.y + r.h, o.y + o.h) - Math.max(r.y, o.y);
    } else {
      ahead = way === 'up' ? r.y - (o.y + o.h) : o.y - (r.y + r.h);
      across = Math.abs(om.x - mid.x);
      overlap = Math.min(r.x + r.w, o.x + o.w) - Math.max(r.x, o.x);
    }
    if (ahead < -1) continue;
    const score = ahead * 4 + across - (overlap > 0 ? 10000 : 0) - (way === 'left' || way === 'right' ? (o.y <= mid.y && mid.y <= o.y + o.h ? 5000 : 0) : 0);
    if (score < bestScore) {
      bestScore = score;
      best = other;
    }
  }
  return best;
}
