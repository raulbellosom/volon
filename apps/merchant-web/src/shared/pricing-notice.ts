import { isDemoMode } from '../app/services.ts';

/**
 * Where the amounts on screen come from. Every build that can quote today uses synthetic
 * routes, so no wording may suggest a real commercial rate («precio garantizado», «tarifa»).
 */
export function pricingSource(isDevelopment: boolean = import.meta.env.DEV): string {
  if (isDemoMode) return 'Montos ficticios del modo demostración';
  if (isDevelopment) return 'Montos de prueba del servidor local, calculados con una ruta sintética; no son una tarifa comercial';
  return 'Montos en MXN calculados por el servidor';
}
