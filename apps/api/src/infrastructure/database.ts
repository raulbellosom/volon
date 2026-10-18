import { PrismaClient, type Prisma } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import type { QuoteActor } from '../modules/pricing/quote.service.ts';

export function createDatabase(connectionString: string): PrismaClient {
  return new PrismaClient({ adapter: new PrismaPg({
    connectionString, max: 5, connectionTimeoutMillis: 3000,
    idleTimeoutMillis: 10000, options: '-c search_path=app,extensions -c statement_timeout=5000',
  }) });
}

export function withSubject<T>(db: PrismaClient, actor: QuoteActor,
  operation: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT set_config('app.subject_id', ${actor.subjectId}, true)`;
    return operation(tx);
  }, { timeout: 7000 });
}

export async function assertRuntimeRole(db: PrismaClient): Promise<void> {
  const [role] = await db.$queryRaw<{ safe: boolean }[]>`
    SELECT current_user = 'delivery_api' AND NOT rolsuper AND NOT rolbypassrls
      AND NOT rolcreaterole AND NOT rolcreatedb AS safe
    FROM pg_roles WHERE rolname = current_user`;
  if (!role?.safe) throw new Error('Runtime database role is not restricted');
}
