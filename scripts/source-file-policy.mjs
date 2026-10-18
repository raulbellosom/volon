import path from 'node:path';

const SOURCE_FILE = /\.(?:ts|tsx|mts|cts|js|jsx|mjs|cjs)$/;
const TEST_FILE = /\.(?:test|spec)\.(?:ts|tsx|mts|cts|js|jsx|mjs|cjs)$/;
const SMALL_MODULE = /\.(?:controller|use-case|hook|handler)\.(?:ts|tsx|mts|cts|js|jsx|mjs|cjs)$/;
const SERVICE_MODULE = /\.(?:service|repository|adapter|module)\.(?:ts|tsx|mts|cts|js|jsx|mjs|cjs)$/;

/** Policies are based on the real file name, not the absolute parent directory. */
export function sourceLineLimit(filePath) {
  const segments = filePath.split(/[\\/]+/);
  const filename = segments.at(-1) ?? '';
  if (!SOURCE_FILE.test(filename)) return null;
  if (segments.some((segment) => segment === 'tests' || segment === '__tests__') || TEST_FILE.test(filename)) {
    return 400;
  }
  if (/^use[A-Z]/.test(filename) || SMALL_MODULE.test(filename)) return 200;
  if (/\.(?:tsx|jsx)$/.test(filename)) return 250;
  if (SERVICE_MODULE.test(filename)) return 300;
  return 400;
}

/** A final newline is a terminator; other blank lines count toward the limit. */
export function sourceLineCount(content) {
  if (content.length === 0) return 0;
  const normalized = content.replace(/\r\n?/g, '\n');
  const lastLineRemoved = normalized.endsWith('\n') ? normalized.slice(0, -1) : normalized;
  return lastLineRemoved.split('\n').length;
}

export function evaluateSourceFile(filePath, content) {
  const limit = sourceLineLimit(filePath);
  if (limit === null) return null;
  const lines = sourceLineCount(content);
  if (lines <= limit) return null;
  return { filePath: path.normalize(filePath), lines, limit };
}
