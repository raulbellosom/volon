import { brandPalette } from '@delivery/branding';
import { ArrowRight, Bell, LayoutGrid, List, Map, MoreHorizontal, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../../components/actions/Button.tsx';
import { IconButton } from '../../components/actions/IconButton.tsx';
import { SegmentedControl } from '../../components/actions/SegmentedControl.tsx';
import { ThemeToggle } from '../../theme/ThemeToggle.tsx';
import { ShowroomSection, Specimen, SpecimenGrid } from './Showroom.tsx';

const SURFACES = ['bg-background', 'bg-surface', 'bg-surface-raised', 'bg-surface-sunken', 'bg-surface-selected'];
const RADII = [['xs', 'rounded-xs'], ['md', 'rounded-md'], ['xl', 'rounded-xl'], ['full', 'rounded-full']] as const;

export function FoundationsSection() {
  return (
    <ShowroomSection id="fundamentos" overline="01 · Fundamentos" title="El ADN visual" description="Paleta de marca, superficies semánticas, tipografía Plus Jakarta Sans y geometría inspirada en la cinta del logo.">
      <SpecimenGrid columns={3}>
        <Specimen title="Paleta de marca" storyId="fundamentos-color--brand" note="Azul eléctrico, lima, azul profundo, gris claro">
          <div className="grid grid-cols-4 gap-2">
            {Object.entries(brandPalette).map(([name, hex]) => (
              <span key={name} className="flex flex-col gap-1.5">
                <span className="h-16 rounded-md border border-border-subtle" style={{ background: hex }} />
                <span className="font-mono text-[11px] text-text-secondary">{hex}</span>
              </span>
            ))}
          </div>
        </Specimen>
        <Specimen title="Tipografía" storyId="fundamentos-tipografía--roles" note="Pesos 400–800, cifras tabulares">
          <p className="text-xs font-bold uppercase tracking-overline text-text-secondary">Pídelo de Volon</p>
          <p className="text-3xl font-extrabold tracking-tight">Envíos de hoy</p>
          <p className="text-md text-text-secondary">El repartidor recogerá en tu sucursal.</p>
          <p className="text-2xl font-extrabold tabular-nums">$1,258.00 · 14:05</p>
        </Specimen>
        <Specimen title="Superficies y radios" storyId="fundamentos-geometría-y-movimiento--spacing-and-radius" note="Cambian con el tema">
          <div className="flex gap-2">{SURFACES.map((surface) => <span key={surface} className={`h-12 flex-1 rounded-md border border-border-subtle ${surface}`} />)}</div>
          <div className="flex items-end gap-3">
            {RADII.map(([name, className]) => (
              <span key={name} className="flex flex-col items-center gap-1">
                <span className={`size-12 border-2 border-action-primary bg-surface-selected ${className}`} />
                <code className="text-[11px] text-text-secondary">{name}</code>
              </span>
            ))}
          </div>
        </Specimen>
      </SpecimenGrid>
    </ShowroomSection>
  );
}

const VIEWS = [
  { id: 'list', label: 'Lista', icon: <List /> },
  { id: 'grid', label: 'Tarjetas', icon: <LayoutGrid /> },
  { id: 'map', label: 'Mapa', icon: <Map /> },
] as const;

export function ActionsSection() {
  const [view, setView] = useState<(typeof VIEWS)[number]['id']>('list');
  return (
    <ShowroomSection id="acciones" overline="02 · Acciones" title="Botones con pliegue" description="Píldoras con la franja inferior de la cinta que se aplana al presionar. Prueba el estado pendiente y el teclado.">
      <SpecimenGrid>
        <Specimen title="Button · variantes" storyId="acciones-button--variants">
          <div className="flex flex-wrap gap-3">
            <Button leadingIcon={<Plus />}>Nuevo envío</Button>
            <Button variant="accent" trailingIcon={<ArrowRight />}>Pídelo de Volon</Button>
            <Button variant="secondary">Ver detalles</Button>
            <Button variant="outline">Editar</Button>
            <Button variant="ghost">Cancelar</Button>
            <Button variant="danger" leadingIcon={<Trash2 />}>Eliminar</Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm">Pequeño</Button>
            <Button size="lg">Grande</Button>
            <Button isPending>Enviando</Button>
            <Button isDisabled>No disponible</Button>
          </div>
        </Specimen>
        <Specimen title="IconButton, SegmentedControl y ThemeToggle" storyId="acciones-segmentedcontrol--overview" note="La píldora seleccionada se desliza">
          <div className="flex flex-wrap items-center gap-2">
            <IconButton label="Notificaciones" icon={<Bell />} />
            <IconButton label="Más opciones" icon={<MoreHorizontal />} variant="outline" />
            <IconButton label="Agregar" icon={<Plus />} variant="primary" />
          </div>
          <SegmentedControl aria-label="Vista" items={VIEWS} selectedKey={view} onSelectionChange={setView} />
          <ThemeToggle />
        </Specimen>
      </SpecimenGrid>
    </ShowroomSection>
  );
}
