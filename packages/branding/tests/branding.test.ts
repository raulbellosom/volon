import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { brand, brandPalette, logoFiles } from '../src/index.ts';

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const packageRoot = new URL('../', import.meta.url);

test('branding: official commercial name has no accent and keeps the tagline', () => {
  assert.equal(brand.displayName, 'Volon');
  assert.equal(brand.tagline, 'Pídelo de Volon');
  assert.equal(brand.locale, 'es-MX');
});

test('branding: palette uses six-digit uppercase hex colors', () => {
  assert.deepEqual(Object.keys(brandPalette), ['electricBlue', 'lime', 'deepBlue', 'lightGray']);
  for (const [name, hex] of Object.entries(brandPalette)) assert.match(hex, /^#[0-9A-F]{6}$/, name);
});

test('branding: every logo variant points to an existing PNG inside the package', async () => {
  assert.equal(Object.keys(logoFiles).length, 8);
  for (const [variant, file] of Object.entries(logoFiles)) {
    assert.match(file, /^assets\/logo\/[a-z-]+\.png$/, variant);
    const header = (await readFile(new URL(file, packageRoot))).subarray(0, 8);
    assert.deepEqual(header, PNG_SIGNATURE, variant);
  }
});
