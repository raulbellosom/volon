import { randomUUID } from 'node:crypto';
import { createApi } from './app.ts';
import { readConfig } from './config.ts';
import { createDatabase, assertRuntimeRole } from './infrastructure/database.ts';
import { createQuoteRepository } from './infrastructure/quote.repository.ts';
import { createSyntheticRouteAdapter } from './infrastructure/synthetic-route.adapter.ts';
import { createSupabaseAuthenticator } from './infrastructure/supabase-auth.adapter.ts';
import { createHttpServer } from './http/server.ts';

const config = readConfig();
const db = createDatabase(config.databaseUrl);
await assertRuntimeRole(db);
const api = createApi({
  ...createQuoteRepository(db), resolveRoute: createSyntheticRouteAdapter(db),
  authenticate: createSupabaseAuthenticator(config.supabaseUrl, config.publishableKey),
  now: () => new Date(), newQuoteId: randomUUID, ttlMilliseconds: 600000,
});
const server = createHttpServer(async (request) => {
  if (request.method === 'GET' && new URL(request.url).pathname === '/health') {
    try {
      await assertRuntimeRole(db);
      return Response.json({ status: 'ok' }, { headers: { 'cache-control': 'no-store' } });
    } catch { return Response.json({ status: 'unavailable' }, { status: 503, headers: { 'cache-control': 'no-store' } }); }
  }
  return api(request);
});
server.listen(config.port, '0.0.0.0', () => console.log(`API local sintética lista en puerto ${config.port}.`));

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    const deadline = setTimeout(() => process.exit(1), 10000);
    deadline.unref();
    server.close(() => { void db.$disconnect().finally(() => process.exit(0)); });
    server.closeIdleConnections();
  });
}
