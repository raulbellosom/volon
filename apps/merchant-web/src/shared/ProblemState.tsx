import { Button, EmptyState } from '@delivery/ui-web';
import { CloudOff, KeyRound, RotateCw, SearchX, ServerCrash, ShieldX, TimerOff, TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import type { ApiError, ApiErrorKind } from '../api/api-error.ts';

interface ProblemCopy {
  icon: ReactNode;
  title: string;
  description: string;
  /** Retrying cannot fix permission or not-found answers. */
  retryable: boolean;
}

const COPY: Record<ApiErrorKind, ProblemCopy> = {
  offline: { icon: <CloudOff />, title: 'Sin conexión', description: 'Revisa tu internet e inténtalo de nuevo. No se perdió nada de lo que capturaste.', retryable: true },
  forbidden: {
    icon: <ShieldX />,
    title: 'No tienes acceso',
    description: 'Tu cuenta no tiene permiso para ver esta información. Si crees que es un error, pide acceso a la persona que administra tu comercio.',
    retryable: false,
  },
  'not-found': { icon: <SearchX />, title: 'No lo encontramos', description: 'Puede que el folio esté mal escrito o que pertenezca a otra sucursal.', retryable: false },
  unavailable: { icon: <ServerCrash />, title: 'El servicio no responde', description: 'Estamos teniendo problemas para conectar. Intenta de nuevo en unos minutos.', retryable: true },
  unauthenticated: { icon: <KeyRound />, title: 'Tu sesión terminó', description: 'Vuelve a iniciar sesión para continuar.', retryable: false },
  'quote-expired': { icon: <TimerOff />, title: 'La cotización venció', description: 'Cada cotización vale solo unos minutos. Cotiza de nuevo para continuar.', retryable: false },
  invalid: { icon: <TriangleAlert />, title: 'No pudimos procesar la solicitud', description: 'Revisa los datos e inténtalo otra vez.', retryable: false },
  conflict: { icon: <TriangleAlert />, title: 'La solicitud ya no es válida', description: 'Algo cambió mientras la preparabas. Empieza de nuevo para continuar.', retryable: false },
  unexpected: { icon: <TriangleAlert />, title: 'Algo salió mal', description: 'Recibimos una respuesta inesperada. Intenta de nuevo.', retryable: true },
};

export function problemCopy(error: ApiError): ProblemCopy {
  return COPY[error.kind];
}

export interface ProblemStateProps {
  error: ApiError;
  onRetry?: () => void;
  /** Extra way out, e.g. a link back home. */
  actions?: ReactNode;
  /** Overrides the default title for a screen-specific message. */
  title?: string;
}

/** Full-width error, permission or offline state with the next step. */
export function ProblemState({ error, onRetry, actions, title }: ProblemStateProps) {
  const copy = COPY[error.kind];
  const retry = copy.retryable && onRetry;
  return (
    <div role="alert">
      <EmptyState
        tone={error.kind === 'offline' || error.kind === 'forbidden' ? 'neutral' : 'danger'}
        icon={copy.icon}
        title={title ?? copy.title}
        description={copy.description}
        {...(retry || actions
          ? { actions: <>{retry && <Button variant="secondary" leadingIcon={<RotateCw />} onPress={onRetry}>Reintentar</Button>}{actions}</> }
          : {})}
      />
    </div>
  );
}
