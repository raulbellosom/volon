import type { CourierOffer } from './courier.ts';

/**
 * Local simulation of the delivery steps. It is NOT an authorized backend transition: the API only
 * knows `requested` today. `specState` names the proposed Delivery state it would map to.
 */
export const WORKFLOW_STAGES = [
  { id: 'accepted', label: 'Oferta aceptada', specState: 'assigned', action: 'Voy a recoger' },
  { id: 'to_pickup', label: 'Camino a recogida', specState: 'en_route_pickup', action: 'Llegué al comercio' },
  { id: 'at_pickup', label: 'En el comercio', specState: 'at_pickup', action: 'Recogí el paquete' },
  { id: 'picked_up', label: 'Paquete recogido', specState: 'picked_up', action: 'Voy al destino' },
  { id: 'to_dropoff', label: 'Camino al destino', specState: 'in_transit', action: 'Entregué el paquete' },
  { id: 'delivered', label: 'Entrega completada', specState: 'delivered', action: null },
] as const;

export type WorkflowStage = (typeof WORKFLOW_STAGES)[number]['id'];

export interface ActiveDelivery {
  readonly assignmentId: string;
  readonly offer: CourierOffer;
  readonly stage: WorkflowStage;
  /** Simulated server time of the last step. */
  readonly updatedAt: string;
}

export function stageIndex(stage: WorkflowStage): number {
  return WORKFLOW_STAGES.findIndex((item) => item.id === stage);
}

/** The step after `stage`, or `null` once delivered. Steps are never skipped. */
export function nextStage(stage: WorkflowStage): WorkflowStage | null {
  return WORKFLOW_STAGES[stageIndex(stage) + 1]?.id ?? null;
}

export function stageInfo(stage: WorkflowStage) {
  return WORKFLOW_STAGES[stageIndex(stage)] ?? WORKFLOW_STAGES[0];
}
