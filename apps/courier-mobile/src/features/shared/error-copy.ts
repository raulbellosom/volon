import type { GatewayErrorKind } from '../../ports/courier-gateway.ts';

export interface ErrorCopy {
  readonly title: string;
  readonly description: string;
}

/** Plain-Spanish explanation and next step for each failure a command can have. */
export const ERROR_COPY: Readonly<Record<GatewayErrorKind, ErrorCopy>> = {
  offline: { title: 'Sin conexión', description: 'Revisa tu señal e inténtalo otra vez. No se perdió nada.' },
  'offer-expired': { title: 'La oferta venció', description: 'Se acabó el tiempo para responderla. Espera la siguiente.' },
  conflict: { title: 'Ya no está disponible', description: 'Alguien más la tomó o cambió antes que tú. Revisa las ofertas actualizadas.' },
  'not-found': { title: 'No la encontramos', description: 'Puede que ya no exista. Vuelve a la lista de ofertas.' },
  unavailable: { title: 'El servicio no responde', description: 'Inténtalo de nuevo en unos segundos.' },
};

export const errorCopy = (kind: GatewayErrorKind): ErrorCopy => ERROR_COPY[kind];
