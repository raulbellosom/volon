import assert from 'node:assert/strict';
import test from 'node:test';
import { brandPalette } from '@delivery/branding';
import { auditContrast, contrastRequirements } from '../src/contrast-requirements.ts';
import { colorThemes } from '../src/themes.ts';

test('themes: light and dark declare exactly the same semantic tokens', () => {
  assert.deepEqual(Object.keys(colorThemes.dark).sort(), Object.keys(colorThemes.light).sort());
});

test('themes: every declared text and UI pair meets WCAG AA in both themes', () => {
  assert.ok(contrastRequirements.length >= 15);
  for (const [name, theme] of Object.entries(colorThemes)) {
    assert.deepEqual(auditContrast(theme), [], `${name} theme has contrast failures`);
  }
});

test('themes: audit reports a broken pair instead of hiding it', () => {
  const broken = { ...colorThemes.light, 'text-secondary': brandPalette.lime };
  const failures = auditContrast(broken);
  assert.ok(failures.some((failure) => failure.foreground === 'text-secondary'));
  assert.ok(failures.every((failure) => failure.ratio < failure.minimum));
});

test('themes: brand colors drive actions; delivered status is not brand lime', () => {
  assert.equal(colorThemes.light['action-primary'], brandPalette.electricBlue);
  assert.equal(colorThemes.dark['action-primary'], brandPalette.lime);
  assert.notEqual(colorThemes.light['status-delivered-bg'], brandPalette.lime);
});
