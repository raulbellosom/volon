import type { AccountErrorKind } from '../ports/courier-account.ts';

export interface AccountCopy {
  readonly title: string;
  readonly description: string;
}

/** Plain-Spanish message for each failure of the local identity and availability calls. */
const COPY: Readonly<Record<AccountErrorKind, AccountCopy>> = {
  'invalid-credentials': { title: 'No pudimos iniciar sesión', description: 'Revisa el correo y la contraseña de la cuenta de prueba.' },
  unauthenticated: { title: 'Tu sesión terminó', description: 'Vuelve a iniciar sesión para continuar.' },
  'not-enabled': { title: 'Tu cuenta no está habilitada', description: 'Esta cuenta no tiene un perfil de repartidor activo en el laboratorio. Pide que la habiliten.' },
  'version-conflict': { title: 'Tu disponibilidad cambió en otro lugar', description: 'Mostramos el estado actual del servidor. Revísalo antes de volver a cambiarlo.' },
  'idempotency-conflict': { title: 'Tu disponibilidad cambió en otro lugar', description: 'Mostramos el estado actual del servidor. Revísalo antes de volver a cambiarlo.' },
  invalid: { title: 'El servidor rechazó la solicitud', description: 'Actualiza la pantalla e inténtalo de nuevo.' },
  offline: { title: 'Sin conexión con el laboratorio', description: 'No llegamos al servidor local. Revisa que esté encendido y que el teléfono lo alcance.' },
  timeout: { title: 'El servidor tardó demasiado', description: 'No sabemos si el cambio se aplicó. Reintenta: no se duplicará.' },
  unavailable: { title: 'El servicio no responde', description: 'No sabemos si el cambio se aplicó. Reintenta en unos segundos: no se duplicará.' },
  unexpected: { title: 'Recibimos una respuesta inesperada', description: 'No la mostramos por seguridad. Actualiza e inténtalo de nuevo.' },
};

export const accountCopy = (kind: AccountErrorKind): AccountCopy => COPY[kind];
