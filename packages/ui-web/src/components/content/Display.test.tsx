import { fireEvent, render, screen, within } from '@testing-library/react';
import { Clock, Truck } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import { axeViolations } from '../../test/axe.ts';
import { DescriptionList } from '../data/DescriptionList.tsx';
import { Stat } from '../data/Stat.tsx';
import { Progress } from '../feedback/Progress.tsx';
import { Avatar, AvatarGroup, initials } from './Avatar.tsx';
import { Divider } from './Divider.tsx';

describe('Avatar', () => {
  it('derives initials and announces name plus availability', async () => {
    expect(initials('Ana María López')).toBe('AL');
    expect(initials('  luis ')).toBe('L');
    const { container } = render(<Avatar name="Ana María López" status="online" />);
    expect(screen.getByRole('img', { name: 'Ana María López · Disponible' })).toHaveTextContent('AL');
    expect(await axeViolations(container)).toEqual([]);
  });

  it('falls back to initials when the photo fails to load', () => {
    const { container } = render(<Avatar name="Jorge Díaz" src="/no-existe.png" />);
    fireEvent.error(container.querySelector('img') as HTMLImageElement);
    expect(screen.getByRole('img', { name: 'Jorge Díaz' })).toHaveTextContent('JD');
  });

  it('AvatarGroup collapses extra people into +N with a readable label', () => {
    render(<AvatarGroup max={2} people={[{ name: 'Ana Ruiz' }, { name: 'Luis Gil' }, { name: 'Sofía Paz' }, { name: 'Iván Sol' }]} />);
    const group = screen.getByRole('group', { name: '4 personas' });
    expect(within(group).getByRole('img', { name: 'y 2 más' })).toHaveTextContent('+2');
  });
});

describe('Divider', () => {
  it('is a separator, or decorative lines around a visible label', () => {
    const { rerender } = render(<Divider orientation="vertical" />);
    expect(screen.getByRole('separator')).toHaveAttribute('aria-orientation', 'vertical');
    rerender(<Divider label="o" />);
    expect(screen.queryByRole('separator')).not.toBeInTheDocument();
    expect(screen.getByText('o')).toBeInTheDocument();
  });
});

describe('Progress', () => {
  it('exposes value and formatted text; indeterminate omits the value', () => {
    const { rerender } = render(<Progress label="Subiendo guía" value={40} />);
    const bar = screen.getByRole('progressbar', { name: 'Subiendo guía' });
    expect(bar).toHaveAttribute('aria-valuenow', '40');
    expect(screen.getByText('40%')).toBeInTheDocument();
    rerender(<Progress label="Buscando repartidor" isIndeterminate />);
    expect(screen.getByRole('progressbar', { name: 'Buscando repartidor' })).not.toHaveAttribute('aria-valuenow');
  });
});

describe('Stat', () => {
  it('reads label, value and the trend direction in words', () => {
    render(<Stat label="Entregas hoy" value="128" icon={<Truck />} delta={{ value: '+12%', direction: 'up', sentiment: 'positive', period: 'vs. ayer' }} />);
    expect(screen.getByText('Entregas hoy').tagName).toBe('DT');
    expect(screen.getByText('128').tagName).toBe('DD');
    expect(screen.getByText(/subió/)).toBeInTheDocument();
    expect(screen.getByText('vs. ayer')).toBeInTheDocument();
  });
});

describe('DescriptionList', () => {
  it('pairs every term with its description and keeps long values readable', async () => {
    const { container } = render(
      <DescriptionList
        items={[
          { term: 'Folio', description: 'PV-1042' },
          { term: 'Ventana', description: '14:00 – 15:00', icon: <Clock /> },
          { term: 'Indicaciones', description: 'Tocar el timbre del departamento 4B y avisar en recepción del edificio Torre Mar' },
        ]}
      />,
    );
    expect(container.querySelectorAll('dt')).toHaveLength(3);
    expect(container.querySelectorAll('dd')).toHaveLength(3);
    expect(screen.getByText('PV-1042').previousElementSibling).toHaveTextContent('Folio');
    expect(await axeViolations(container)).toEqual([]);
  });
});
