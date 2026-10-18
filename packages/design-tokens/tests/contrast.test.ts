import assert from 'node:assert/strict';
import test from 'node:test';
import { contrastRatio, relativeLuminance } from '../src/contrast.ts';

test('contrast: luminance extremes and WCAG reference ratios', () => {
  assert.equal(relativeLuminance('#000000'), 0);
  assert.equal(relativeLuminance('#FFFFFF'), 1);
  assert.equal(contrastRatio('#FFFFFF', '#000000'), 21);
  assert.equal(contrastRatio('#0A3DFF', '#0A3DFF'), 1);
});

test('contrast: order independent and matches documented brand pairs', () => {
  assert.equal(contrastRatio('#FFFFFF', '#0A3DFF'), contrastRatio('#0A3DFF', '#FFFFFF'));
  assert.equal(contrastRatio('#FFFFFF', '#0A3DFF').toFixed(2), '6.72');
  assert.equal(contrastRatio('#C6FF3B', '#FFFFFF').toFixed(2), '1.18');
  assert.equal(contrastRatio('#001863', '#F4F6F8').toFixed(2), '14.79');
});

test('contrast: rejects malformed colors', () => {
  for (const value of ['0A3DFF', '#0A3DF', '#GGGGGG', '#0A3DFF00', '']) {
    assert.throws(() => relativeLuminance(value), RangeError, value);
  }
});
