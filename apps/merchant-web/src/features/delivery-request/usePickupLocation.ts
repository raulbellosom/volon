import type { MerchantApi, PickupLocationResponse } from '../../api/merchant-api.ts';
import { useResource, type ResourceState } from '../../shared/useResource.ts';

/**
 * Pickup coordinates of the selected branch, from its server record. Reloads when the branch
 * changes and ignores answers for a previous branch. The branch id is only a selector: the API
 * decides whether this user may read it (404 otherwise).
 */
export function usePickupLocation(api: MerchantApi, branchId: string): ResourceState<PickupLocationResponse> {
  return useResource(branchId, () => api.getPickupLocation(branchId));
}
