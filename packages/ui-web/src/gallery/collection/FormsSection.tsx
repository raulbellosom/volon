import { Bike, Car, Clock, Mail, MapPin, Phone, Store, Truck } from 'lucide-react';
import { Checkbox, CheckboxGroup } from '../../components/forms/Checkbox.tsx';
import { RadioCard } from '../../components/forms/ChoiceCard.tsx';
import { Option } from '../../components/forms/ListBoxItem.tsx';
import { PasswordField } from '../../components/forms/PasswordField.tsx';
import { Radio, RadioGroup } from '../../components/forms/RadioGroup.tsx';
import { SearchField } from '../../components/forms/SearchField.tsx';
import { Select } from '../../components/forms/Select.tsx';
import { Switch } from '../../components/forms/Switch.tsx';
import { TextField } from '../../components/forms/TextField.tsx';
import { ShowroomSection, Specimen, SpecimenGrid } from './Showroom.tsx';

export function FormsSection() {
  return (
    <ShowroomSection
      id="formularios"
      overline="03 · Formularios"
      title="Todo campo tiene ícono"
      description="La ficha del ícono se ilumina al enfocar y se vuelve roja con error. Texto de 16 px para que iOS no haga zoom; filas de 44 px para el tacto."
    >
      <SpecimenGrid>
        <Specimen title="Campos de texto y Select" storyId="formularios-textfield--states">
          <TextField label="Correo" icon={<Mail />} type="email" placeholder="tu@negocio.mx" isRequired />
          <TextField label="Teléfono" icon={<Phone />} defaultValue="33 1234" isInvalid errorMessage="Escribe 10 dígitos." />
          <Select label="Sucursal" icon={<Store />} defaultSelectedKey="centro">
            <Option id="centro" description="Juárez 120">Sucursal Centro</Option>
            <Option id="marina" description="Paseo de la Marina 245">Sucursal Marina</Option>
          </Select>
          <div className="grid gap-4 sm:grid-cols-2">
            <PasswordField label="Contraseña" />
            <SearchField label="Buscar envío" placeholder="Folio" />
          </div>
          <TextField label="Dirección" icon={<MapPin />} isReadOnly defaultValue="Juárez 120, Centro" />
        </Specimen>
        <Specimen title="Selección con marca" storyId="formularios-checkbox--states" note="Azul profundo + lima (invertido en oscuro)">
          <CheckboxGroup label="Avisos" defaultValue={['whatsapp']}>
            <Checkbox value="whatsapp">WhatsApp</Checkbox>
            <Checkbox value="sms">SMS</Checkbox>
          </CheckboxGroup>
          <RadioGroup label="Horario" orientation="horizontal" defaultValue="noon">
            <Radio value="noon">12–16 h</Radio>
            <Radio value="late">16–20 h</Radio>
          </RadioGroup>
          <Switch defaultSelected>Aceptar envíos automáticamente</Switch>
          <Select label="Recogida" icon={<Clock />} defaultSelectedKey="asap">
            <Option id="asap">Lo antes posible</Option>
            <Option id="later">Programar</Option>
          </Select>
        </Specimen>
        <Specimen title="Tarjetas seleccionables" storyId="formularios-choicecard--overview" className="lg:col-span-2">
          <RadioGroup label="¿En qué se entrega?" layout="cards" defaultValue="moto">
            <RadioCard value="moto" icon={<Bike />} title="Moto" description="Paquetes chicos, hasta 5 kg." />
            <RadioCard value="car" icon={<Car />} title="Auto" description="Hasta 30 kg o varios bultos." />
            <RadioCard value="van" icon={<Truck />} title="Camioneta" description="Aún no disponible en tu zona." isDisabled />
          </RadioGroup>
        </Specimen>
      </SpecimenGrid>
    </ShowroomSection>
  );
}
