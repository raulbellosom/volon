import { Clock, Filter, Info, PanelBottom, Pencil, Store, Trash2 } from 'lucide-react';
import { Dialog as AriaDialog, DialogTrigger } from 'react-aria-components';
import { Button } from '../../components/actions/Button.tsx';
import { IconButton } from '../../components/actions/IconButton.tsx';
import { Option } from '../../components/forms/ListBoxItem.tsx';
import { Select } from '../../components/forms/Select.tsx';
import { TextField } from '../../components/forms/TextField.tsx';
import { AlertDialog } from '../../components/overlays/AlertDialog.tsx';
import { Dialog } from '../../components/overlays/Dialog.tsx';
import { Drawer } from '../../components/overlays/Drawer.tsx';
import { Popover } from '../../components/overlays/Popover.tsx';
import { ShowroomSection, Specimen, SpecimenGrid } from './Showroom.tsx';

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function OverlaysSection() {
  return (
    <ShowroomSection
      id="overlays"
      title="Capas que respetan el foco"
      description="Todos atrapan el foco, cierran con Escape y lo devuelven al botón que los abrió. En teléfono, los modales se abren como hoja desde abajo."
    >
      <SpecimenGrid columns={3}>
        <Specimen title="Dialog con ícono" storyId="overlays-dialog--sizes">
          <DialogTrigger>
            <Button leadingIcon={<Pencil />}>Editar sucursal</Button>
            <Dialog
              icon={<Pencil />}
              title="Editar sucursal"
              description="Los cambios aplican a nuevas solicitudes."
              footer={(close) => <><Button variant="ghost" onPress={close}>Cancelar</Button><Button onPress={close}>Guardar</Button></>}
            >
              <div className="flex flex-col gap-5">
                <TextField label="Nombre" icon={<Store />} defaultValue="Sucursal Centro" />
                <Select label="Horario" icon={<Clock />} defaultSelectedKey="noon"><Option id="noon">12:00 – 20:00</Option></Select>
              </div>
            </Dialog>
          </DialogTrigger>
        </Specimen>
        <Specimen title="AlertDialog" storyId="overlays-alertdialog--confirmations" note="Confirmación asíncrona con estado pendiente">
          <DialogTrigger>
            <Button variant="danger" leadingIcon={<Trash2 />}>Cancelar envío</Button>
            <AlertDialog title="¿Cancelar el envío PV-1024?" confirmLabel="Cancelar envío" cancelLabel="Mantener" tone="danger" onConfirm={() => wait(1000)}>
              El repartidor recibirá un aviso. No se puede deshacer.
            </AlertDialog>
          </DialogTrigger>
        </Specimen>
        <Specimen title="Drawer y Popover" storyId="overlays-drawer--sides">
          <div className="flex flex-wrap items-center gap-2">
            <DialogTrigger>
              <Button variant="outline" leadingIcon={<Filter />}>Filtros</Button>
              <Drawer side="end" title="Filtros" footer={(close) => <Button onPress={close}>Aplicar</Button>}>
                <Select label="Zona" icon={<Store />} defaultSelectedKey="all"><Option id="all">Todas</Option></Select>
              </Drawer>
            </DialogTrigger>
            <DialogTrigger>
              <Button variant="outline" leadingIcon={<PanelBottom />}>Hoja</Button>
              <Drawer side="bottom" title="Acciones rápidas">Contenido de la hoja inferior.</Drawer>
            </DialogTrigger>
            <DialogTrigger>
              <IconButton label="¿Cómo se calcula la tarifa?" icon={<Info />} variant="secondary" />
              <Popover className="max-w-xs p-4">
                <AriaDialog className="text-sm text-text-secondary outline-none">Cargo base más tramo por distancia. Montos de ejemplo.</AriaDialog>
              </Popover>
            </DialogTrigger>
          </div>
        </Specimen>
      </SpecimenGrid>
    </ShowroomSection>
  );
}
