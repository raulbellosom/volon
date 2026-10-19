import { Alert } from '@delivery/ui-web';
import { DEMO_EMAILS } from './demo-fixtures.ts';

/** Sign-in help shown only in demo mode. */
export function DemoAccountsHint() {
  return (
    <Alert tone="info" title="Cuentas de demostración">
      Usa <strong className="whitespace-nowrap">{DEMO_EMAILS.ok}</strong> con cualquier contraseña. Para ver otros estados:{' '}
      <strong className="whitespace-nowrap">{DEMO_EMAILS.forbidden}</strong> o <strong className="whitespace-nowrap">{DEMO_EMAILS.noBranches}</strong>.
    </Alert>
  );
}
