import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { axeViolations } from '../../test/axe.ts';
import { Button } from '../actions/Button.tsx';
import { Dialog as AriaDialog, DialogTrigger as AriaDialogTrigger } from 'react-aria-components';
import { IconButton } from '../actions/IconButton.tsx';
import { AlertDialog } from './AlertDialog.tsx';
import { Drawer } from './Drawer.tsx';
import { Popover } from './Popover.tsx';
import { Tooltip } from './Tooltip.tsx';
import { Dialog, DialogTrigger } from './Dialog.tsx';
import { ToastRegion, dismissToast, toast } from './Toast.tsx';

function DialogExample() {
  return (
    <DialogTrigger>
      <Button>Editar sucursal</Button>
      <Dialog title="Editar sucursal" description="Los cambios aplican a nuevas solicitudes." footer={(close) => <Button onPress={close}>Guardar</Button>}>
        <input aria-label="Nombre" />
      </Dialog>
    </DialogTrigger>
  );
}

describe('Dialog', () => {
  it('opens with a labelled and described dialog, traps focus and restores it on Escape', async () => {
    render(<DialogExample />);
    const trigger = screen.getByRole('button', { name: 'Editar sucursal' });
    await userEvent.click(trigger);
    const dialog = await screen.findByRole('dialog', { name: 'Editar sucursal' });
    expect(dialog).toHaveAccessibleDescription('Los cambios aplican a nuevas solicitudes.');
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
    for (let index = 0; index < 4; index += 1) {
      await userEvent.tab();
      expect(dialog).toContainElement(document.activeElement as HTMLElement);
    }
    expect(await axeViolations(dialog)).toEqual([]);
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    // React Aria restores focus on the next frame; wait for it instead of racing it.
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it('closes from a footer action', async () => {
    render(<DialogExample />);
    await userEvent.click(screen.getByRole('button', { name: 'Editar sucursal' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});

describe('AlertDialog', () => {
  it('ignores Escape, stays pending during async confirm and closes after it resolves', async () => {
    let resolve: () => void = () => undefined;
    const onConfirm = vi.fn(() => new Promise<void>((done) => { resolve = done; }));
    const onOpenChange = vi.fn();
    render(
      <AlertDialog isOpen onOpenChange={onOpenChange} title="¿Cancelar el envío?" confirmLabel="Cancelar envío" tone="danger" onConfirm={onConfirm}>
        El repartidor recibirá un aviso.
      </AlertDialog>,
    );
    expect(screen.getByRole('alertdialog', { name: '¿Cancelar el envío?' })).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(onOpenChange).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar envío' }));
    expect(onConfirm).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: /Cancelar envío/ })).toHaveAttribute('data-pending', 'true');
    await act(async () => resolve());
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });
});

describe('Toast', () => {
  it('renders queued toasts in a labelled region and closes them', async () => {
    render(<ToastRegion />);
    let key = '';
    act(() => { key = toast({ title: 'Envío creado', description: 'Folio PV-1024', tone: 'success' }); });
    expect(await screen.findByText('Envío creado')).toBeInTheDocument();
    expect(screen.getByRole('region')).toBeInTheDocument();
    act(() => dismissToast(key));
    await waitFor(() => expect(screen.queryByText('Envío creado')).not.toBeInTheDocument());
  });
});

describe('Drawer', () => {
  it('opens as a labelled dialog and closes with its close button', async () => {
    const onOpenChange = vi.fn();
    render(<Drawer isOpen onOpenChange={onOpenChange} title="Filtros" side="end">Contenido</Drawer>);
    expect(screen.getByRole('dialog', { name: 'Filtros' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });
});

describe('Popover', () => {
  it('opens from its trigger, closes with Escape and returns focus', async () => {
    render(
      <AriaDialogTrigger>
        <IconButton label="Ayuda" icon={<span />} />
        <Popover><AriaDialog aria-label="Explicación">Cargo base más distancia.</AriaDialog></Popover>
      </AriaDialogTrigger>,
    );
    const trigger = screen.getByRole('button', { name: 'Ayuda' });
    await userEvent.click(trigger);
    expect(await screen.findByRole('dialog', { name: 'Explicación' })).toHaveTextContent('Cargo base');
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
  });
});

describe('Tooltip', () => {
  it('shows on keyboard focus, describes the control and closes with Escape', async () => {
    render(<Tooltip content="Duplicar envío"><IconButton label="Duplicar" icon={<span />} /></Tooltip>);
    await userEvent.tab();
    const tooltip = await screen.findByRole('tooltip');
    expect(tooltip).toHaveTextContent('Duplicar envío');
    expect(screen.getByRole('button', { name: 'Duplicar' })).toHaveAccessibleDescription('Duplicar envío');
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('tooltip')).not.toBeInTheDocument());
  });
});
