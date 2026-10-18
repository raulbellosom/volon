import type { Meta, StoryObj } from '@storybook/react-vite';
import { Stack } from '../../gallery/Showcase.tsx';
import { SearchField } from './SearchField.tsx';

const meta = {
  title: 'Formularios/SearchField',
  component: SearchField,
  args: { 'aria-label': 'Buscar envíos', placeholder: 'Buscar por folio o destinatario' },
} satisfies Meta<typeof SearchField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Variants: Story = {
  render: () => (
    <Stack>
      <SearchField aria-label="Buscar" />
      <SearchField label="Buscar sucursal" defaultValue="Marina" description="Escape limpia la búsqueda." />
      <SearchField aria-label="Buscar" size="sm" placeholder="Compacto" />
      <SearchField aria-label="Buscar" isDisabled />
    </Stack>
  ),
};
