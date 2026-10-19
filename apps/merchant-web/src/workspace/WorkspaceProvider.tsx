import { createContext, useCallback, useMemo, useState, type ReactNode } from 'react';
import type { MeResponse } from '../api/merchant-api.ts';
import { loadBranchId, saveBranchId } from '../session/session-storage.ts';
import { useSession } from '../session/useSession.ts';
import { useResource, type ResourceState } from '../shared/useResource.ts';

/** One branch the signed-in user may operate, as `/v1/me` reports it. */
export interface BranchOption {
  readonly branchId: string;
  readonly branchName: string;
  readonly merchantId: string;
  readonly merchantName: string;
}

export interface WorkspaceValue {
  readonly me: ResourceState<MeResponse>;
  readonly branches: readonly BranchOption[];
  /** `null` until the user picks one (or when the stored one is no longer allowed). */
  readonly currentBranch: BranchOption | null;
  selectBranch(branchId: string): void;
}

export const WorkspaceContext = createContext<WorkspaceValue | null>(null);

export function branchOptions(me: MeResponse): BranchOption[] {
  return me.memberships.map(({ merchant, branch }) => ({
    branchId: branch.branchId,
    branchName: branch.name,
    merchantId: merchant.merchantId,
    merchantName: merchant.name,
  }));
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { api, session } = useSession();
  const me = useResource(session ? session.accessToken : null, () => api.getMe());
  const [selectedId, setSelectedId] = useState<string | null>(() => loadBranchId());

  const branches = useMemo(() => (me.status === 'ready' ? branchOptions(me.data) : []), [me.status, me.data]);
  // A single branch needs no choice; a stored id only counts while `/v1/me` still lists it.
  const currentBranch = branches.find((branch) => branch.branchId === selectedId) ?? (branches.length === 1 ? branches[0] ?? null : null);

  const selectBranch = useCallback((branchId: string) => {
    saveBranchId(branchId);
    setSelectedId(branchId);
  }, []);

  const value = useMemo<WorkspaceValue>(() => ({ me, branches, currentBranch, selectBranch }), [me, branches, currentBranch, selectBranch]);
  return <WorkspaceContext value={value}>{children}</WorkspaceContext>;
}
