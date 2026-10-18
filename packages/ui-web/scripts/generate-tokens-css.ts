import { writeFile } from 'node:fs/promises';
import { buildTokensCss } from './tokens-css.ts';

const target = new URL('../src/styles/tokens.css', import.meta.url);
await writeFile(target, buildTokensCss(), 'utf8');
console.log('tokens.css regenerated from @delivery/design-tokens');
