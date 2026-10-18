import type { Meta, StoryObj } from '@storybook/react-vite';
import { NAV_ACTIONS, NAV_ITEMS } from '../../gallery/nav-fixtures.tsx';
import { Navbar } from './Navbar.tsx';

const meta = {
  title: 'Navegación/Navbar',
  component: Navbar,
  parameters: { layout: 'fullscreen' },
  args: { items: NAV_ITEMS, currentId: 'deliveries' },
} satisfies Meta<typeof Navbar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Desktop: Story = {
  render: (args) => (
    <div className="min-h-[60vh]">
      <Navbar {...args} actions={NAV_ACTIONS} />
      <p className="mx-auto max-w-7xl px-6 py-8 text-sm text-text-secondary">
        Reduce el viewport a teléfono: los enlaces pasan al menú lateral (botón ☰) junto con las acciones. La barra es fija y translúcida.
      </p>
    </div>
  ),
};

export const Phone: Story = {
  ...Desktop,
  globals: { viewport: { value: 'mobile1', isRotated: false } },
};
