// @vitest-environment node
import { readFile } from 'node:fs/promises';
import { colorThemes } from '@delivery/design-tokens';
import { describe, expect, it } from 'vitest';
import { buildTokensCss } from './tokens-css.ts';

describe('tokens.css', () => {
  it('is in sync with @delivery/design-tokens (run `pnpm --filter @delivery/ui-web tokens`)', async () => {
    const committed = await readFile(new URL('../src/styles/tokens.css', import.meta.url), 'utf8');
    expect(committed.replace(/\r\n/g, '\n')).toBe(buildTokensCss());
  });

  it('resets Tailwind defaults so only semantic Volon colors exist', () => {
    const css = buildTokensCss();
    expect(css).toContain('--color-*: initial;');
    expect(css).toContain(`--color-action-primary: ${colorThemes.light['action-primary']};`);
    expect(css).toContain(`--color-action-primary: ${colorThemes.dark['action-primary']};`);
  });

  it('declares dark mode both by attribute and by OS preference', () => {
    const css = buildTokensCss();
    expect(css).toContain('[data-theme="dark"] {');
    expect(css).toContain(':root:not([data-theme="light"]) {');
  });
});
