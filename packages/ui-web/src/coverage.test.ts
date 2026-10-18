// @vitest-environment node
import { access, readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { coverage } from './coverage.ts';

const componentsRoot = new URL('./components/', import.meta.url);
const exists = (url: URL) => access(url).then(() => true, () => false);

describe('coverage matrix', () => {
  it('has unique component names', () => {
    const names = coverage.map((entry) => entry.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('never marks visual approval from code: «reviewed» needs the product owner', () => {
    expect(coverage.filter((entry) => entry.status === 'reviewed').map((entry) => entry.name)).toEqual([]);
  });

  it('requires source and story for every non-pending entry', async () => {
    for (const entry of coverage.filter((item) => item.status !== 'pending')) {
      expect(entry.source, entry.name).toBeDefined();
      const source = new URL(entry.source ?? '', componentsRoot);
      expect(await exists(source), `${entry.name} source`).toBe(true);
      const story = new URL(source.href.replace(/\.tsx$/, '.stories.tsx'));
      expect(await exists(story), `${entry.name} story`).toBe(true);
    }
  });

  it('only counts as «tested» when each listed test file renders the component', async () => {
    for (const entry of coverage.filter((item) => item.status === 'tested' || item.status === 'reviewed')) {
      expect(entry.tests?.length, `${entry.name} tests`).toBeGreaterThan(0);
      expect(entry.renders?.length, `${entry.name} renders`).toBeGreaterThan(0);
      for (const file of entry.tests ?? []) {
        const content = await readFile(new URL(file, componentsRoot), 'utf8');
        const rendersComponent = (entry.renders ?? []).some((name) => new RegExp(`<${name}[\\s/>]`).test(content));
        expect(rendersComponent, `${entry.name}: ${file} does not render ${entry.renders?.join(' | ')}`).toBe(true);
      }
    }
  });
});
