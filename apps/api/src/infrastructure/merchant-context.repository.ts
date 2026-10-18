import type { PrismaClient } from '@prisma/client';
import type { MerchantContextStore } from '../modules/merchants/merchant-context.handler.ts';
import { withSubject } from './database.ts';

export function createMerchantContextRepository(db: PrismaClient): MerchantContextStore {
  return {
    readMemberships: (actor, merchantId) => withSubject(db, actor, async (tx) => {
      // Branch RLS verifies the subject's current membership AND both enabled flags.
      // Read Merchant in the same SQL statement to avoid mixing authorization snapshots.
      const rows = await tx.$queryRaw<{ merchantId: string; merchantName: string;
        branchId: string; branchName: string }[]>`
        SELECT m.id AS "merchantId", m.name AS "merchantName", b.id AS "branchId", b.name AS "branchName"
        FROM app."Branch" b JOIN app."Merchant" m ON m.id = b."merchantId"
        WHERE (${merchantId ?? null}::text IS NULL OR m.id = ${merchantId ?? null})
        ORDER BY m.id COLLATE "C", b.id COLLATE "C"`;
      return rows.map((row) => ({ merchant: { merchantId: row.merchantId, name: row.merchantName },
        branch: { branchId: row.branchId, name: row.branchName } }));
    }),
  };
}
