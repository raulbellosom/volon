import { parseDate, parseTime } from '@internationalized/date';
import { MapPinned, Weight } from 'lucide-react';
import { ComboBox } from '../../components/forms/ComboBox.tsx';
import { CurrencyField } from '../../components/forms/CurrencyField.tsx';
import { DatePicker } from '../../components/forms/DatePicker.tsx';
import { Option } from '../../components/forms/ListBoxItem.tsx';
import { NumberField } from '../../components/forms/NumberField.tsx';
import { OTPField } from '../../components/forms/OTPField.tsx';
import { Slider } from '../../components/forms/Slider.tsx';
import { TimeField } from '../../components/forms/TimeField.tsx';
import { ShowroomSection, Specimen, SpecimenGrid } from './Showroom.tsx';

const COLONIAS = ['Centro', 'Versalles', 'El Pitillal', 'Marina Vallarta', 'Fluvial Vallarta'].map((name) => ({ id: name, name }));

export function AdvancedFormsSection() {
  return (
    <ShowroomSection
      id="formularios-avanzados"
      title="Números, dinero, fechas y códigos"
      description="Formatos es-MX, pesos en centavos enteros, búsqueda con filtro, fechas por segmentos o calendario, rangos y códigos SMS."
    >
      <SpecimenGrid>
        <Specimen title="NumberField y CurrencyField" storyId="formularios-currencyfield--minor-units" note="CurrencyField entrega centavos enteros">
          <NumberField label="Peso" icon={<Weight />} unit="kg" defaultValue={2.5} step={0.5} minValue={0} maxValue={30} />
          <CurrencyField label="Valor declarado" defaultValueMinor={125050} />
        </Specimen>
        <Specimen title="ComboBox" storyId="formularios-combobox--overview" note="Escribe para filtrar">
          <ComboBox label="Colonia de entrega" icon={<MapPinned />} defaultItems={COLONIAS} placeholder="Escribe para buscar">
            {(colonia) => <Option id={colonia.id}>{colonia.name}</Option>}
          </ComboBox>
        </Specimen>
        <Specimen title="DatePicker y TimeField" storyId="formularios-datepicker--states">
          <DatePicker label="Fecha de entrega" defaultValue={parseDate('2026-10-18')} />
          <TimeField label="Hora de recogida" defaultValue={parseTime('14:05')} />
        </Specimen>
        <Specimen title="Slider y OTPField" storyId="formularios-otpfield--states">
          <Slider label="Horario de servicio" defaultValue={[12, 20]} minValue={8} maxValue={23} thumbLabels={['Inicio', 'Fin']} formatOptions={{ style: 'unit', unit: 'hour' }} />
          <OTPField label="Código de verificación" length={6} />
        </Specimen>
      </SpecimenGrid>
    </ShowroomSection>
  );
}
