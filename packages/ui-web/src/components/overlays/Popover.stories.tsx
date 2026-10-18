import type { Meta, StoryObj } from '@storybook/react-vite';
import { Info } from 'lucide-react';
import { Dialog, DialogTrigger } from 'react-aria-components';
import { IconButton } from '../actions/IconButton.tsx';
import { Popover } from './Popover.tsx';

const meta = {
  title: 'Overlays/Popover',
  component: Popover,
} satisfies Meta<typeof Popover>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Explanation: Story = {
  render: () => (
    <div className="flex items-center gap-2 text-md">
      Tarifa logística
      <DialogTrigger>
        <IconButton label="¿Cómo se calcula?" icon={<Info />} size="sm" />
        <Popover placement="bottom start" className="max-w-xs p-4">
          <Dialog className="text-sm text-text-secondary outline-none">
            <p className="mb-1 font-semibold text-text-primary">¿Cómo se calcula?</p>
            Cargo base más un tramo por distancia de ruta. Montos de ejemplo; aún no hay tarifas reales.
          </Dialog>
        </Popover>
      </DialogTrigger>
    </div>
  ),
};
