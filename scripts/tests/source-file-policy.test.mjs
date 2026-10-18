import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateSourceFile, sourceLineCount, sourceLineLimit } from '../source-file-policy.mjs';

test('component files are limited to 250 lines, including cross-platform paths', () => {
  assert.equal(sourceLineLimit('apps/merchant-web/src/OrderCard.tsx'), 250);
  assert.equal(sourceLineLimit('apps\\courier-mobile\\src\\OrderCard.tsx'), 250);
});

test('hooks, handlers, use cases and controllers have the stricter 200-line limit', () => {
  assert.equal(sourceLineLimit('apps/web/src/hooks/useOrders.ts'), 200);
  assert.equal(sourceLineLimit('apps/native/src/useLocation.tsx'), 200);
  assert.equal(sourceLineLimit('apps/api/src/quote.controller.ts'), 200);
  assert.equal(sourceLineLimit('apps/api/src/quote.use-case.ts'), 200);
  assert.equal(sourceLineLimit('apps/api/src/quote.handler.ts'), 200);
});

test('services, repositories and adapters have a 300-line limit', () => {
  assert.equal(sourceLineLimit('apps/api/src/quote.service.ts'), 300);
  assert.equal(sourceLineLimit('apps/api/src/delivery.repository.ts'), 300);
  assert.equal(sourceLineLimit('apps/api/src/maps.adapter.ts'), 300);
});

test('generic code has a 400-line limit and non-source files are ignored', () => {
  assert.equal(sourceLineLimit('packages/contracts/src/index.ts'), 400);
  assert.equal(sourceLineLimit('pnpm-lock.yaml'), null);
  assert.equal(sourceLineLimit('packages/data/migrations/0001.sql'), null);
});

test('tests have a 400-line limit, even when written as TSX', () => {
  assert.equal(sourceLineLimit('apps/merchant-web/src/__tests__/Page.tsx'), 400);
  assert.equal(sourceLineLimit('packages/ui/tests/Button.tsx'), 400);
  assert.equal(sourceLineLimit('packages/ui/src/Button.test.tsx'), 400);
});

test('line counting treats LF and CRLF equally and counts blank lines', () => {
  assert.equal(sourceLineCount(''), 0);
  assert.equal(sourceLineCount('one\n'), 1);
  assert.equal(sourceLineCount('one\r\ntwo\r\n'), 2);
  assert.equal(sourceLineCount('one\n\n'), 2);
});

test('boundary limit is accepted, next line fails with actionable report', () => {
  const atLimit = 'x\n'.repeat(250);
  assert.equal(evaluateSourceFile('apps/web/src/Card.tsx', atLimit), null);
  assert.deepEqual(evaluateSourceFile('apps/web/src/Card.tsx', atLimit + 'x'), {
    filePath: pathFor('apps/web/src/Card.tsx'), lines: 251, limit: 250,
  });
});

function pathFor(p) { return p.replaceAll('/', process.platform === 'win32' ? '\\' : '/'); }
