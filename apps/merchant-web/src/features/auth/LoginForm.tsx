import { Alert, Button, PasswordField, TextField } from '@delivery/ui-web';
import { LogIn, Mail } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Form } from 'react-aria-components';
import { type ApiError, toApiError } from '../../api/api-error.ts';
import { useSession } from '../../session/useSession.ts';

function signInMessage(error: ApiError): { title: string; body: string } {
  if (error.kind === 'unauthenticated') return { title: 'No pudimos iniciar sesión', body: 'Revisa tu correo y contraseña e inténtalo de nuevo.' };
  if (error.kind === 'offline') return { title: 'Sin conexión', body: 'Revisa tu internet e inténtalo de nuevo.' };
  return { title: 'El servicio de acceso no responde', body: 'Intenta de nuevo en unos minutos.' };
}

/** Email and password sign-in; on success the caller decides where to go. */
export function LoginForm({ onSignedIn }: { onSignedIn: () => void }) {
  const { signIn } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await signIn(email.trim(), password);
      onSignedIn();
    } catch (failure) {
      setError(toApiError(failure));
      setPending(false);
    }
  }

  const message = error ? signInMessage(error) : null;
  return (
    <Form onSubmit={submit} className="flex flex-col gap-5" aria-label="Iniciar sesión">
      {message && <Alert tone="danger" live="assertive" title={message.title}>{message.body}</Alert>}
      <TextField
        label="Correo electrónico"
        icon={<Mail />}
        type="email"
        name="email"
        autoComplete="username"
        isRequired
        value={email}
        onChange={setEmail}
      />
      <PasswordField label="Contraseña" name="password" isRequired value={password} onChange={setPassword} />
      <Button type="submit" size="lg" fullWidth isPending={pending} leadingIcon={<LogIn />}>
        Iniciar sesión
      </Button>
    </Form>
  );
}
