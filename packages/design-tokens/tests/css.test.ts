import assert from 'node:assert/strict';
import test from 'node:test';
import { colorThemes, toCssVariables, typography } from '../src/index.ts';

test('css: emits Tailwind 4 compatible --color-* variables for every token', () => {
  const css = toCssVariables(colorThemes.light);
  assert.ok(css.startsWith(':root {\n'));
  assert.match(css, /--color-action-primary: #0A3DFF;/);
  assert.equal(css.match(/--color-/g)?.length, Object.keys(colorThemes.light).length);
});

test('css: custom selector supports dark mode scoping', () => {
  assert.match(toCssVariables(colorThemes.dark, '[data-theme="dark"]'), /^\[data-theme="dark"\] \{/);
});

test('typography: brand font with system fallback and approved weights', () => {
  assert.equal(typography.fontFamilySans, "'Plus Jakarta Sans', system-ui, sans-serif");
  assert.deepEqual([typography.weightRegular, typography.weightSemibold, typography.weightExtrabold], [400, 600, 800]);
});
