// Fails when a production bundle carries demo fixtures or local backend secrets.
// Run after `vite build`; reads only `dist/` and the git-ignored `.env.local` (values never printed).
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const DIST = path.resolve(import.meta.dirname, '../dist');
const FORBIDDEN = ['demo.test', 'quote_demo', 'Comercio demo', 'Modo demostración', 'demo-token'];

async function localSecrets() {
  try {
    const file = await readFile(path.resolve(import.meta.dirname, '../../../.env.local'), 'utf8');
    return file.split(/\r?\n/)
      .map((line) => /^(SUPABASE_PUBLISHABLE_KEY|SYNTHETIC_USER_PASSWORD)=(.+)$/.exec(line.trim())?.[2])
      .filter((value) => value && value.length >= 8);
  } catch {
    return [];
  }
}

async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => {
    const full = path.join(directory, entry.name);
    return entry.isDirectory() ? files(full) : [full];
  }));
  return nested.flat();
}

const secrets = await localSecrets();
const problems = [];
for (const file of (await files(DIST)).filter((name) => /\.(js|css|html)$/.test(name))) {
  const content = await readFile(file, 'utf8');
  for (const text of FORBIDDEN) if (content.includes(text)) problems.push(`${path.relative(DIST, file)}: demo text «${text}»`);
  if (secrets.some((secret) => content.includes(secret))) problems.push(`${path.relative(DIST, file)}: a local backend secret`);
}

if (problems.length > 0) {
  console.error(problems.join('\n'));
  process.exitCode = 1;
} else {
  console.log('Merchant bundle verified: no demo fixtures or local secrets.');
}
