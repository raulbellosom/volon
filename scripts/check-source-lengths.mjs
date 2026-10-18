import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { evaluateSourceFile, sourceLineLimit } from './source-file-policy.mjs';

const ROOTS = ['apps', 'packages', 'scripts'];
const IGNORED = new Set(['.git', 'node_modules', '.next', '.turbo', 'dist', 'coverage', 'build']);
const violations = [];

async function checkTree(directory) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') return;
    throw error;
  }

  for (const entry of entries) {
    if (IGNORED.has(entry.name)) continue;
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await checkTree(file);
      continue;
    }
    if (!entry.isFile()) continue;
    const relativePath = path.relative(process.cwd(), file);
    if (sourceLineLimit(relativePath) === null) continue;
    const violation = evaluateSourceFile(relativePath, await readFile(file, 'utf8'));
    if (violation) violations.push(violation);
  }
}

for (const root of ROOTS) await checkTree(path.resolve(root));

if (violations.length > 0) {
  for (const { filePath, lines, limit } of violations) {
    console.error(filePath + ': ' + lines + ' lines (maximum ' + limit + ')');
  }
  process.exitCode = 1;
} else {
  console.log('Source length checks passed: components 250, hooks/controllers 200, services 300, general 400.');
}
