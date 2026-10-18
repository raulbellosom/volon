import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { axeViolations } from '../../test/axe.ts';
import { Alert } from '../feedback/Alert.tsx';
import { Skeleton, SkeletonText } from '../feedback/Skeleton.tsx';
import { Spinner } from '../feedback/Spinner.tsx';
import { Inbox } from 'lucide-react';
import { EmptyState } from '../feedback/EmptyState.tsx';
import { Badge } from './Badge.tsx';
import { IconChip } from './IconChip.tsx';
import { Card, CardContent, CardFooter, CardHeader } from './Card.tsx';
import { StatusBadge } from './StatusBadge.tsx';

describe('Card', () => {
  it('uses the requested heading level and sectioning element', async () => {
    const { container } = render(
      <Card as="section" aria-labelledby="t">
        <CardHeader title={<span id="t">Sucursal Centro</span>} overline="Sucursal" level={2} />
        <CardContent>Abierta de 12:00 a 20:00</CardContent>
        <CardFooter>Pie</CardFooter>
      </Card>,
    );
    expect(screen.getByRole('heading', { level: 2, name: 'Sucursal Centro' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Sucursal Centro' })).toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe('Badges', () => {
  it('StatusBadge always pairs color with a readable label', () => {
    render(
      <>
        <StatusBadge status="in-transit" />
        <StatusBadge status="failed" label="Cancelada por el comercio" />
      </>,
    );
    expect(screen.getByText('En camino')).toBeInTheDocument();
    expect(screen.getByText('Cancelada por el comercio')).toBeInTheDocument();
  });

  it('Badge hides its icon from assistive tech', () => {
    render(<Badge tone="success" icon={<svg data-testid="icon" />}>Activa</Badge>);
    expect(screen.getByTestId('icon').parentElement).toHaveAttribute('aria-hidden', 'true');
  });
});

describe('Alert', () => {
  it('is silent by default and becomes a live region when requested', () => {
    const { rerender } = render(<Alert title="Zona sin cobertura" />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    rerender(<Alert title="Guardado" tone="success" live="polite" />);
    expect(screen.getByRole('status')).toHaveTextContent('Guardado');
    rerender(<Alert title="Sin conexión" tone="danger" live="assertive" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Sin conexión');
  });

  it('can be dismissed with an accessible close button', async () => {
    const onDismiss = vi.fn();
    render(<Alert title="Aviso" onDismiss={onDismiss} />);
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar aviso' }));
    expect(onDismiss).toHaveBeenCalledOnce();
  });
});

describe('Loading', () => {
  it('Spinner is a named progressbar; skeletons stay hidden from assistive tech', () => {
    const { container } = render(
      <>
        <Spinner label="Cargando envíos" />
        <Skeleton className="h-10" />
        <SkeletonText lines={2} />
      </>,
    );
    expect(screen.getByRole('progressbar', { name: 'Cargando envíos' })).toBeInTheDocument();
    expect(container.querySelectorAll('[aria-hidden="true"]').length).toBeGreaterThanOrEqual(2);
  });
});

describe('IconChip', () => {
  it('is decorative and applies the requested tone and size', () => {
    const { container } = render(<IconChip icon={<svg />} tone="danger" size="lg" />);
    const chip = container.firstElementChild as HTMLElement;
    expect(chip).toHaveAttribute('aria-hidden', 'true');
    expect(chip.className).toContain('bg-feedback-danger-bg');
    expect(chip.className).toContain('size-12');
  });
});

describe('EmptyState', () => {
  it('shows title, help and actions with a decorative icon', async () => {
    const { container } = render(<EmptyState icon={<Inbox />} title="Aún no tienes envíos" description="Solicita el primero." actions={<button type="button">Nuevo envío</button>} />);
    expect(screen.getByText('Aún no tienes envíos')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Nuevo envío' })).toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);
  });
});
