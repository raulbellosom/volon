export interface MerchantSummary {
  readonly merchantId: string;
  readonly name: string;
}

export interface BranchSummary {
  readonly branchId: string;
  readonly name: string;
}

export interface MerchantMembership {
  readonly merchant: MerchantSummary;
  readonly branch: BranchSummary;
}

export interface MeResponse {
  readonly subjectId: string;
  readonly memberships: readonly MerchantMembership[];
}

export interface MerchantBranchesResponse {
  readonly merchant: MerchantSummary;
  readonly branches: readonly BranchSummary[];
}

export class InvalidMerchantContext extends Error {}

function record(value: unknown, keys: readonly string[]): asserts value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).length !== keys.length || keys.some((key) => !Object.hasOwn(value, key))) {
    throw new InvalidMerchantContext('Invalid context shape');
  }
}

function identifier(value: unknown): asserts value is string {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(value)) {
    throw new InvalidMerchantContext('Invalid identifier');
  }
}

function summary(value: unknown, key: 'merchantId' | 'branchId'): { id: string; name: string } {
  record(value, [key, 'name']);
  const id = value[key];
  identifier(id);
  if (typeof value.name !== 'string' || value.name.length === 0) {
    throw new InvalidMerchantContext('Invalid name');
  }
  return { id, name: value.name };
}

function merchant(value: unknown): MerchantSummary {
  const row = summary(value, 'merchantId');
  return Object.freeze({ merchantId: row.id, name: row.name });
}

function branch(value: unknown): BranchSummary {
  const row = summary(value, 'branchId');
  return Object.freeze({ branchId: row.id, name: row.name });
}

/** Closed response validators also create a detached, immutable public projection. */
export function parseMeResponse(value: unknown): MeResponse {
  record(value, ['subjectId', 'memberships']);
  if (typeof value.subjectId !== 'string'
    || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.subjectId)
    || !Array.isArray(value.memberships)) throw new InvalidMerchantContext('Invalid identity context');
  const memberships = value.memberships.map((item: unknown) => {
    record(item, ['merchant', 'branch']);
    return Object.freeze({ merchant: merchant(item.merchant), branch: branch(item.branch) });
  });
  return Object.freeze({ subjectId: value.subjectId, memberships: Object.freeze(memberships) });
}

export function parseMerchantBranchesResponse(value: unknown): MerchantBranchesResponse {
  record(value, ['merchant', 'branches']);
  if (!Array.isArray(value.branches) || value.branches.length === 0) {
    throw new InvalidMerchantContext('Empty merchant context');
  }
  return Object.freeze({ merchant: merchant(value.merchant),
    branches: Object.freeze(value.branches.map(branch)) });
}
