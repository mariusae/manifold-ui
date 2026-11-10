import test from 'node:test';
import assert from 'node:assert/strict';
import * as A from '../src/core/arrangement.js';

const near = (x, y) => assert.ok(Math.abs(x - y) < 1e-9, `${x} ≈ ${y}`);

test('a new tile takes the lower half of the one above, and gives it back', () => {
  const a = A.emptyArrangement();
  A.apply(a, { type: 'place', id: 'a', column: 0, at: 0 });
  A.apply(a, { type: 'place', id: 'b', column: 0, at: 1 });
  near(a.heights.a, 0.5); near(a.heights.b, 0.5);
  A.apply(a, { type: 'place', id: 'c', column: 0, at: 2 });
  near(a.heights.b, 0.25); near(a.heights.c, 0.25);
  assert.deepEqual(a.loans.c, { b: 0.25 });
  A.apply(a, { type: 'remove', id: 'c' });
  near(a.heights.a, 0.5); near(a.heights.b, 0.5);
  assert.equal(a.focused, 'b');
});

test('a new column takes a fair share in proportion and gives it back', () => {
  const a = A.emptyArrangement();
  A.apply(a, { type: 'place', id: 'a', column: 0, at: 0 });
  A.apply(a, { type: 'place', id: 'b', column: 1, at: 0 });
  A.apply(a, { type: 'fractions', fractions: [0.7, 0.3] });
  A.apply(a, { type: 'place', id: 'c', column: 2, at: 0 });
  near(a.fractions[0], 0.7 * 2 / 3); near(a.fractions[2], 1 / 3);
  A.apply(a, { type: 'remove', id: 'c' });
  near(a.fractions[0], 0.7); near(a.fractions[1], 0.3);
});

test('docking and undocking leaves the column as it was', () => {
  const a = A.emptyArrangement();
  for (const [id, at] of [['a', 0], ['b', 1], ['c', 2]]) A.apply(a, { type: 'place', id, column: 0, at });
  const before = { ...a.heights };
  A.apply(a, { type: 'dock', id: 'b' });
  assert.deepEqual(a.columns, [['a', 'c']]);
  assert.equal(a.docked[0].above, 'a');
  near(a.heights.a + a.heights.c, 1);
  A.apply(a, { type: 'undock', id: 'b' });
  assert.deepEqual(a.columns, [['a', 'b', 'c']]);
  for (const k of Object.keys(before)) near(a.heights[k], before[k]);
});

test('a tile docked alone takes its column with it, and comes back as wide', () => {
  const a = A.emptyArrangement();
  A.apply(a, { type: 'place', id: 'a', column: 0, at: 0 });
  A.apply(a, { type: 'place', id: 'b', column: 1, at: 0 });
  A.apply(a, { type: 'fractions', fractions: [0.25, 0.75] });
  A.apply(a, { type: 'dock', id: 'a' });
  assert.deepEqual(a.columns, [['b']]);
  A.apply(a, { type: 'undock', id: 'a' });
  assert.deepEqual(a.columns, [['a'], ['b']]);
  near(a.fractions[0], 0.25);
});

test('covering docks the target under the tile; removing brings it back', () => {
  const a = A.emptyArrangement();
  A.apply(a, { type: 'place', id: 'a', column: 0, at: 0 });
  A.apply(a, { type: 'place', id: 'b', column: 1, at: 0 });
  A.applyAll(a, A.replacing(a, 'a', 'b'));
  assert.deepEqual(a.columns, [['b']]);
  assert.equal(a.docked[0].under, 'b');
  A.apply(a, { type: 'remove', id: 'b' });
  assert.deepEqual(a.columns, [['a']]);
  assert.equal(a.docked.length, 0);
});

test('growing takes from neighbours nearest first, below then above', () => {
  const a = A.emptyArrangement();
  for (const [id, at] of [['a', 0], ['b', 1], ['c', 2]]) A.apply(a, { type: 'place', id, column: 0, at });
  A.apply(a, { type: 'heights', heights: { a: 1 / 3, b: 1 / 3, c: 1 / 3 } });
  A.applyAll(a, A.growing(a, 'b'));
  near(a.heights.b, 1 / 3 + 0.15); near(a.heights.c, 1 / 3 - 0.15); near(a.heights.a, 1 / 3);
  A.applyAll(a, A.growing(a, 'b', 0.15, true));
  assert.deepEqual(a.columns, [['b']]);
  assert.equal(a.docked.length, 2);
});

test('nudging moves a step, or makes a column at the edge', () => {
  const a = A.emptyArrangement();
  for (const [id, at] of [['a', 0], ['b', 1]]) A.apply(a, { type: 'place', id, column: 0, at });
  A.applyAll(a, A.nudging(a, 'b', 'up'));
  assert.deepEqual(a.columns, [['b', 'a']]);
  A.applyAll(a, A.nudging(a, 'b', 'left'));
  assert.deepEqual(a.columns, [['b'], ['a']]);
  assert.equal(A.nudging(a, 'b', 'left'), null);
});
