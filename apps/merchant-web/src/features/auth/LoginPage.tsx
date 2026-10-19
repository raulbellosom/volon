import { Alert, Card, Logo, ThemeToggle } from '@delivery/ui-web';
import { BadgeCheck, MapPinned, ReceiptText } from 'lucide-react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { DemoBanner } from '../../app/DemoBanner.tsx';
import { isDemoMode } from '../../app/services.ts';
import { DemoAccountsHint } from '../../demo/DemoAccountsHint.tsx';
import { useSession } from '../../session/useSession.ts';
import { LoginForm } from './LoginForm.tsx';

const PROMISES = [
  { icon: <ReceiptText />, text: 'Ves el costo del envío y su desglose antes de pedirlo.' },
  { icon: <MapPinned />, text: 'Envíos locales desde cada una de tus sucursales.' },
  { icon: <BadgeCheck />, text: 'La logística se cobra aparte y siempre la ves antes de confirmar.' },
];

function returnPath(state: unknown): string {
  if (typeof state === 'object' && state !== null && 'from' in state && typeof state.from === 'string' && state.from.startsWith('/')) {
    return state.from === '/acceso' ? '/' : state.from;
  }
  return '/';
}

export function LoginPage() {
  const { session, signOutReason } = useSession();
  const navigate = useNavigate();
  const { state } = useLocation();
  const target = returnPath(state);
  if (session) return <Navigate to={target} replace />;

  return (
    <div className="flex min-h-dvh flex-col bg-background text-text-primary">
      {isDemoMode && <DemoBanner />}
      <div className="grid flex-1 gap-6 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card variant="brand" as="section" aria-label="Volon para comercios" className="hidden justify-between gap-10 p-10 lg:flex">
          <Logo variant="tagline" size="lg" onBrand />
          <div className="flex max-w-md flex-col gap-6">
            <h2 className="text-4xl font-extrabold tracking-tight">Tus envíos locales, sin vueltas.</h2>
            <ul className="flex flex-col gap-4">
              {PROMISES.map(({ icon, text }) => (
                <li key={text} className="flex items-start gap-3 text-md">
                  <span aria-hidden="true" className="mt-0.5 flex [&_svg]:size-5">{icon}</span>
                  {text}
                </li>
              ))}
            </ul>
          </div>
          <p className="text-sm opacity-80">Panel para comercios · Puerto Vallarta</p>
        </Card>
        <div className="flex flex-col">
          <div className="flex items-center justify-between">
            <Logo size="sm" className="lg:invisible" />
            <ThemeToggle compact />
          </div>
          <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-8 py-10">
            <div className="flex flex-col gap-2">
              <h1 className="text-3xl font-extrabold tracking-tight">Inicia sesión</h1>
              <p className="text-md text-text-secondary">Entra con la cuenta que te dio tu comercio para solicitar y seguir envíos.</p>
            </div>
            {signOutReason === 'expired' && (
              <Alert tone="warning" title="Tu sesión terminó">Por seguridad, vuelve a iniciar sesión para continuar.</Alert>
            )}
            {isDemoMode && <DemoAccountsHint />}
            <LoginForm onSignedIn={() => void navigate(target, { replace: true })} />
          </main>
        </div>
      </div>
    </div>
  );
}
