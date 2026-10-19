import type { ShiftStatus } from '../../domain/courier.ts';
import type { IconName } from '../../ui/Button.tsx';
import type { PillTone } from '../../ui/StatusPill.tsx';

export const SHIFT_COPY: Readonly<Record<ShiftStatus, { title: string; pill: string; tone: PillTone; icon: IconName }>> = {
  offline: { title: 'Fuera de turno', pill: 'No disponible (simulado)', tone: 'neutral', icon: 'moon-outline' },
  available: { title: 'Listo para recibir ofertas', pill: 'Disponible (simulado)', tone: 'success', icon: 'radio-button-on-outline' },
  busy: { title: 'Tienes una entrega', pill: 'Con entrega (simulado)', tone: 'progress', icon: 'bicycle-outline' },
};
