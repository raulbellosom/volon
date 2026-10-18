import type { Meta, StoryObj } from '@storybook/react-vite';
import { AlignJustify, Copy, LayoutGrid, Pencil, Printer } from 'lucide-react';
import { Section } from '../../gallery/Showcase.tsx';
import { Button } from './Button.tsx';
import { ButtonGroup } from './ButtonGroup.tsx';
import { ToggleButton } from './ToggleButton.tsx';

const meta = {
  title: 'Acciones/ButtonGroup',
  component: ButtonGroup,
  args: { 'aria-label': 'Acciones', children: null },
} satisfies Meta<typeof ButtonGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
  render: () => (
    <>
      <Section title="Unidos" description="Acciones relacionadas y de igual peso formando una sola píldora.">
        <ButtonGroup aria-label="Acciones del envío" variant="attached">
          <Button variant="outline" leadingIcon={<Pencil />}>Editar</Button>
          <Button variant="outline" leadingIcon={<Copy />}>Duplicar</Button>
          <Button variant="outline" leadingIcon={<Printer />}>Imprimir</Button>
        </ButtonGroup>
      </Section>
      <Section title="Con ToggleButton" description="Para selección exclusiva entre vistas prefiere SegmentedControl.">
        <ButtonGroup aria-label="Filtros rápidos" variant="attached">
          <ToggleButton icon={<AlignJustify />} label="Compacto" />
          <ToggleButton icon={<LayoutGrid />} label="Tarjetas" defaultSelected />
        </ButtonGroup>
      </Section>
      <Section title="Separados" description="Se ajustan en varias líneas en pantallas angostas.">
        <ButtonGroup aria-label="Acciones" variant="spaced">
          <Button>Guardar</Button>
          <Button variant="secondary">Guardar y crear otro</Button>
          <Button variant="ghost">Cancelar</Button>
        </ButtonGroup>
      </Section>
    </>
  ),
};
