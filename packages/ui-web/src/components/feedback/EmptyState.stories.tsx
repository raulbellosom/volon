import type { Meta, StoryObj } from '@storybook/react-vite';
import { CloudOff, PackageOpen, Plus, RefreshCw, SearchX } from 'lucide-react';
import { Button } from '../actions/Button.tsx';
import { Card } from '../content/Card.tsx';
import { EmptyState } from './EmptyState.tsx';

const meta = {
  title: 'Retroalimentación/EmptyState',
  component: EmptyState,
  args: { icon: <PackageOpen />, title: 'Aún no tienes envíos' },
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Variants: Story = {
  render: () => (
    <div className="grid max-w-5xl gap-5 md:grid-cols-3">
      <Card>
        <EmptyState icon={<PackageOpen />} title="Aún no tienes envíos" description="Solicita tu primer envío y síguelo en tiempo real." actions={<Button leadingIcon={<Plus />}>Nuevo envío</Button>} />
      </Card>
      <Card>
        <EmptyState icon={<SearchX />} tone="neutral" title="Sin resultados" description="Prueba con otro folio o quita algunos filtros." actions={<Button variant="outline">Limpiar filtros</Button>} />
      </Card>
      <Card>
        <EmptyState icon={<CloudOff />} tone="danger" title="No pudimos cargar los envíos" description="Revisa tu conexión. Tus datos están a salvo." actions={<Button variant="secondary" leadingIcon={<RefreshCw />}>Reintentar</Button>} />
      </Card>
    </div>
  ),
};
