import type { Meta, StoryObj } from '@storybook/react-vite';
import { LayoutGrid, List, Map } from 'lucide-react';
import { useState } from 'react';
import { Row, Section } from '../../gallery/Showcase.tsx';
import { SegmentedControl } from './SegmentedControl.tsx';

const meta = {
  title: 'Acciones/SegmentedControl',
  component: SegmentedControl,
} satisfies Meta<typeof SegmentedControl>;

export default meta;

const PERIODS = [
  { id: 'today', label: 'Hoy' },
  { id: 'week', label: 'Semana' },
  { id: 'month', label: 'Mes' },
] as const;

const VIEWS = [
  { id: 'list', label: 'Lista', icon: <List /> },
  { id: 'grid', label: 'Tarjetas', icon: <LayoutGrid /> },
  { id: 'map', label: 'Mapa', icon: <Map /> },
] as const;

function Demo() {
  const [period, setPeriod] = useState<(typeof PERIODS)[number]['id']>('today');
  const [view, setView] = useState<(typeof VIEWS)[number]['id']>('list');
  return (
    <>
      <Section title="Texto" description="La píldora seleccionada se desliza entre opciones (salta sin animación con «reducir movimiento»).">
        <SegmentedControl aria-label="Periodo" items={PERIODS} selectedKey={period} onSelectionChange={setPeriod} />
      </Section>
      <Section title="Con íconos y solo íconos">
        <Row>
          <SegmentedControl aria-label="Vista" items={VIEWS} selectedKey={view} onSelectionChange={setView} />
          <SegmentedControl aria-label="Vista" items={VIEWS} selectedKey={view} onSelectionChange={setView} iconOnly size="sm" />
        </Row>
      </Section>
    </>
  );
}

export const Overview: StoryObj = { render: () => <Demo /> };
