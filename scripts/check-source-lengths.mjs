import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const EXCLUDED = new Set(['.git', 'node_modules', '.next', '.turbo', 'dist', 'coverage']);
const EXT = /\.(?:ts|tsx|js|jsx|mjs|cjs)$/;
const errors = [];

async function visit(directory) {
  let entries;
  try { entries = await readdir(directory, { withFileTypes: true }); }
  catch (error) { if (error.code === 'ENOENT') return; throw error; }
  for (const entry of entries) {
    if (EXCLUDED.has(entry.name)) continue;
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) { await visit(file); continue; }
    if (!entry.isFile() || !EXT.test(entry.name)) continue;
    const content = await readFile(file, 'utf8');
    const lines = content.trimEnd().split('\n').length;
    const limit = file.includes(`${path.sep}tests${path.sep}`) ? 400
      : /\.tsx$/.test(entry.name) ? 250
      : /(?:^use[A-Z]|\.(?:controller|use-case|hook)\.)/.test(entry.name) ? 200
      : /\.(?:service|repository|adapter)\./.test(entry.name) ? 300 : 400;
    if (lines > limit) errors.push(`${file}: ${lines} lines (max ${limit})`);
  }
}

for (const directory of ['apps', 'packages', 'scripts']) {
  await visit(path.resolve(directory));
}
if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log('Source length gate passed (hard limit: 400 lines).');
}
