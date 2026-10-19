import { normalizePublicReference } from '@delivery/contracts';
import { Alert, Button, TextField } from '@delivery/ui-web';
import { Hash, Search } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Form } from 'react-aria-components';
import { useNavigate } from 'react-router';
import { toApiError } from '../../api/api-error.ts';
import { useSession } from '../../session/useSession.ts';
import { problemCopy } from '../../shared/ProblemState.tsx';

export function DeliveryLookup() {
  const navigate = useNavigate();
  const { api } = useSession();
  const [reference, setReference] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const request = useRef(0);
  useEffect(() => () => { request.current += 1; }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    let normalized: string;
    try { normalized = normalizePublicReference(reference); }
    catch { setError('Escribe el folio completo, por ejemplo VL-26-7K9M2Q.'); return; }
    const current = ++request.current;
    setBusy(true);
    setError(null);
    try {
      const delivery = await api.getDeliveryByReference(normalized);
      if (current === request.current) await navigate(`/envios/${encodeURIComponent(delivery.deliveryId)}`);
    } catch (failure) {
      if (current === request.current) setError(problemCopy(toApiError(failure)).description);
    } finally { if (current === request.current) setBusy(false); }
  }

  return (
    <div className="flex flex-col gap-3">
    <Form onSubmit={(event) => void submit(event)} aria-label="Consultar un envío" className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <TextField
        label="Folio del envío"
        description="Lo encuentras en la confirmación. Ejemplo: VL-26-7K9M2Q."
        icon={<Hash />}
        name="publicReference"
        maxLength={32}
        isDisabled={busy}
        isRequired
        value={reference}
        onChange={setReference}
        className="flex-1"
      />
      <Button type="submit" variant="secondary" leadingIcon={<Search />} isPending={busy} className="sm:mb-6">Ver estado</Button>
    </Form>
    {error && <Alert tone="danger" live="assertive" title="No pudimos consultar el envío">{error}</Alert>}
    </div>
  );
}
