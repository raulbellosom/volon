import type { Meta, StoryObj } from '@storybook/react-vite';
import { Section, Stack } from '../../gallery/Showcase.tsx';
import { Checkbox, CheckboxGroup } from './Checkbox.tsx';

const meta = {
  title: 'Formularios/Checkbox',
  component: Checkbox,
  args: { children: 'Recibir avisos por WhatsApp' },
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const States: Story = {
  render: () => (
    <>
      <Section title="Estados individuales">
        <Stack>
          <Checkbox>Sin seleccionar</Checkbox>
          <Checkbox defaultSelected>Seleccionado</Checkbox>
          <Checkbox isIndeterminate>Selección parcial (indeterminado)</Checkbox>
          <Checkbox isInvalid>Acepto los términos (requerido)</Checkbox>
          <Checkbox isDisabled>Deshabilitado</Checkbox>
          <Checkbox isDisabled defaultSelected>Deshabilitado y seleccionado</Checkbox>
        </Stack>
      </Section>
      <Section title="Grupo con validación">
        <CheckboxGroup
          label="Tipos de paquete que envías"
          description="Puedes cambiarlo después."
          isRequired
          isInvalid
          errorMessage="Elige al menos un tipo."
        >
          <Checkbox value="food">Comida preparada</Checkbox>
          <Checkbox value="small">Paquete pequeño</Checkbox>
          <Checkbox value="docs">Documentos</Checkbox>
        </CheckboxGroup>
      </Section>
    </>
  ),
};
