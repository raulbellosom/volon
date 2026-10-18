// @vitest-environment node
import { access } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { coverage } from './coverage.ts';

const componentsRoot = new URL('./components/', import.meta.url);

describe('coverage matrix', () => {
  it('has unique component names', () => {
    const names = coverage.map((entry) => entry.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('only marks a component beyond pending when its source, test and story exist', async () => {
    for (const entry of coverage.filter((item) => item.status !== 'pending')) {
      expect(entry.source, entry.name).toBeDefined();
      const source = new URL(entry.source ?? '', componentsRoot);
      await expect(access(source), `${entry.name} source`).resolves.toBeUndefined();
      const folder = new URL('./', source);
      const story = new URL(entry.source?.split('/').pop()?.replace('.tsx', '.stories.tsx') ?? '', folder);
      await expect(access(story), `${entry.name} story`).resolves.toBeUndefined();
    }
  });
});
