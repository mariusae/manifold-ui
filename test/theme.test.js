import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveTheme, themeNames, defineTheme, TINTS } from '../src/theme/theme.js';
import { compose } from '../src/backdrop/backdrop.js';
import { themes } from '../src/theme/themes.js';
import { defaultKeymap, keyLabel } from '../src/keys.js';

test('every theme resolves in both appearances and every tint', () => {
  for (const name of themeNames()) {
    for (const dark of [false, true]) {
      for (const tint of [...TINTS, '#8844cc']) {
        const vars = resolveTheme(name, { dark, tint });
        for (const [k, v] of Object.entries(vars)) assert.ok(typeof v === 'string' && v.length, `${name} ${k}`);
        assert.match(vars['--mf-accent'], /^#|^rgb/);
      }
    }
  }
});

test('a theme of your own lies over its base', () => {
  defineTheme('test-theme', { window: { light: '#010203', dark: '#040506' } });
  assert.equal(resolveTheme('test-theme', { dark: true })['--mf-window'], '#040506');
  assert.equal(resolveTheme('test-theme')['--mf-text'], resolveTheme('paper')['--mf-text']);
});

test("the backdrop's day is seeded by the date: the same day, the same pools", () => {
  const wash = themes.paper.backdrop.light;
  const a = compose(wash, { day: 20767 }), b = compose(wash, { day: 20767 }), c = compose(wash, { day: 20768 });
  assert.deepEqual(a, b);
  assert.notDeepEqual(a.pools.map((p) => p.x), c.pools.map((p) => p.x));
  assert.equal(a.stops.length, 4);
  for (const p of a.pools) assert.ok(p.r >= 0.3 && p.r <= 0.6);
});

test('keys: one command a key, and a label for each', () => {
  const map = defaultKeymap();
  assert.ok(map.size > 40);
  for (const key of map.keys()) assert.ok(keyLabel(key).length > 0);
});
