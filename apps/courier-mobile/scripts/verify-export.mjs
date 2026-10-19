// Fails when an exported bundle carries local-lab configuration. Expo inlines EXPO_PUBLIC_* values
// from .env files into the bundle, so a production export must not contain the local key or URLs,
// even though the mode gate would block them at runtime.
// Usage: node scripts/verify-export.mjs <distDir>
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const dist = path.resolve(process.argv[2] ?? 'dist');
const FORBIDDEN = [/sb_publishable_[A-Za-z0-9_-]{8,}/, /sb_secret_[A-Za-z0-9_-]{8,}/, /service_role/, /127\.0\.0\.1:(56321|3100)/, /localhost:(56321|3100)/, /10\.0\.2\.2:(56321|3100)/];

async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => {
    const full = path.join(directory, entry.name);
    return entry.isDirectory() ? files(full) : [full];
  }));
  return nested.flat();
}

const problems = [];
for (const file of (await files(dist)).filter((name) => /\.(js|hbc|html|json|map)$/.test(name))) {
  const content = (await readFile(file)).toString('latin1');
  for (const pattern of FORBIDDEN) if (pattern.test(content)) problems.push(`${path.relative(dist, file)}: matches ${pattern}`);
}

if (problems.length > 0) {
  console.error('Export contains local-lab configuration. Remove EXPO_PUBLIC_COURIER_* from .env files before exporting:');
  console.error(problems.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Export verified (${path.basename(dist)}): no local-lab keys or URLs.`);
}
