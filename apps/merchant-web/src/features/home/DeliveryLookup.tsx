import { Button, TextField } from '@delivery/ui-web';
import { Hash, Search } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Form } from 'react-aria-components';
import { useNavigate } from 'react-router';

/** Opens a delivery by its id until the branch history endpoint exists. */
export function DeliveryLookup() {
  const navigate = useNavigate();
  const [id, setId] = useState('');

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = id.trim();
    if (value) void navigate(`/envios/${encodeURIComponent(value)}`);
  }

  return (
    <Form onSubmit={submit} aria-label="Consultar un envío" className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <TextField
        label="Folio del envío"
        description="Lo encuentras en la confirmación de la solicitud."
        icon={<Hash />}
        name="deliveryId"
        isRequired
        value={id}
        onChange={setId}
        className="flex-1"
      />
      <Button type="submit" variant="secondary" leadingIcon={<Search />} className="sm:mb-6">Ver estado</Button>
    </Form>
  );
}
