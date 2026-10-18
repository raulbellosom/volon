import type { Meta, StoryObj } from '@storybook/react-vite';
import { ArrowRight, Bike, Car, Clock, MapPin, MessageSquareText, Package, Phone, Store, User } from 'lucide-react';
import { Form } from 'react-aria-components';
import { Button } from '../components/actions/Button.tsx';
import { Card, CardContent, CardFooter, CardHeader } from '../components/content/Card.tsx';
import { Alert } from '../components/feedback/Alert.tsx';
import { Checkbox } from '../components/forms/Checkbox.tsx';
import { RadioCard } from '../components/forms/ChoiceCard.tsx';
import { Option } from '../components/forms/ListBoxItem.tsx';
import { RadioGroup } from '../components/forms/RadioGroup.tsx';
import { Select } from '../components/forms/Select.tsx';
import { TextField } from '../components/forms/TextField.tsx';

const meta = { title: 'Patrones/Formulario de ejemplo', parameters: { layout: 'fullscreen' } } satisfies Meta;
export default meta;

/** Generic composition check with synthetic data; not a business screen or a real flow. */
export const DeliveryRequest: StoryObj = {
  render: () => (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <Card as="section" aria-label="Nuevo envío">
        <CardHeader icon={<Package />} overline="Ejemplo sintético" title="Nuevo envío" description="Composición de campos de Volon UI; no está conectado a ningún servicio." level={2} />
        <Form onSubmit={(event) => event.preventDefault()} className="contents">
          <CardContent className="flex flex-col gap-6">
            <Select label="Sucursal de recogida" icon={<Store />} defaultSelectedKey="centro" isRequired>
              <Option id="centro" description="Juárez 120">Sucursal Centro</Option>
              <Option id="marina" description="Paseo de la Marina 245">Sucursal Marina</Option>
            </Select>
            <div className="grid gap-5 sm:grid-cols-2">
              <TextField label="Destinatario" icon={<User />} isRequired placeholder="Nombre y apellido" />
              <TextField label="Teléfono" icon={<Phone />} type="tel" isRequired placeholder="10 dígitos" />
            </div>
            <TextField label="Dirección de entrega" icon={<MapPin />} isRequired placeholder="Calle, número y colonia" />
            <RadioGroup label="Vehículo" layout="cards" defaultValue="moto">
              <RadioCard value="moto" icon={<Bike />} title="Moto" description="Hasta 5 kg" />
              <RadioCard value="car" icon={<Car />} title="Auto" description="Hasta 30 kg" />
            </RadioGroup>
            <Select label="Horario de recogida" icon={<Clock />} defaultSelectedKey="asap">
              <Option id="asap">Lo antes posible</Option>
              <Option id="later">Programar</Option>
            </Select>
            <TextField label="Indicaciones" icon={<MessageSquareText />} multiline placeholder="Opcional" />
            <Checkbox>Avisar al destinatario por WhatsApp</Checkbox>
            <Alert tone="info" title="Cotización">El precio se calcula en el servidor con la ruta real; aquí no hay tarifas.</Alert>
          </CardContent>
          <CardFooter>
            <Button variant="ghost">Cancelar</Button>
            <Button type="submit" trailingIcon={<ArrowRight />}>Cotizar envío</Button>
          </CardFooter>
        </Form>
      </Card>
    </div>
  ),
};
