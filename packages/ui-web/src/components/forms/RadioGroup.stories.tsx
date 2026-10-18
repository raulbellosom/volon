import type { Meta, StoryObj } from '@storybook/react-vite';
import { Section } from '../../gallery/Showcase.tsx';
import { Radio, RadioGroup } from './RadioGroup.tsx';

const meta = {
  title: 'Formularios/RadioGroup',
  component: RadioGroup,
  args: { label: 'Tamaño del paquete', defaultValue: 'small', children: null },
} satisfies Meta<typeof RadioGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
  render: () => (
    <>
      <Section title="Vertical" description="Las flechas mueven la selección; Tab sale del grupo.">
        <RadioGroup label="Tamaño del paquete" defaultValue="small" description="Determina el tipo de vehículo.">
          <Radio value="small">Chico · cabe en una mochila</Radio>
          <Radio value="medium">Mediano · hasta 10 kg</Radio>
          <Radio value="large" isDisabled>Grande · no disponible en el piloto</Radio>
        </RadioGroup>
      </Section>
      <Section title="Horizontal con error">
        <RadioGroup label="¿Quién paga el envío?" orientation="horizontal" isRequired isInvalid errorMessage="Elige una opción.">
          <Radio value="merchant">Mi comercio</Radio>
          <Radio value="customer">Mi cliente</Radio>
        </RadioGroup>
      </Section>
    </>
  ),
};
