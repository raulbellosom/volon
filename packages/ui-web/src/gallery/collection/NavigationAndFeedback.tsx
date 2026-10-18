import { CircleCheck, Clock, CloudOff, Copy, MoreHorizontal, PackageOpen, Pencil, Plus, Trash2, Truck } from 'lucide-react';
import { Button } from '../../components/actions/Button.tsx';
import { Card, CardContent } from '../../components/content/Card.tsx';
import { Alert } from '../../components/feedback/Alert.tsx';
import { EmptyState } from '../../components/feedback/EmptyState.tsx';
import { Skeleton, SkeletonText } from '../../components/feedback/Skeleton.tsx';
import { Spinner } from '../../components/feedback/Spinner.tsx';
import { Menu, MenuItem, MenuSeparator, MenuTrigger } from '../../components/navigation/Menu.tsx';
import { Navbar } from '../../components/navigation/Navbar.tsx';
import { Tab, TabList, TabPanel, Tabs } from '../../components/navigation/Tabs.tsx';
import { toast } from '../../components/overlays/Toast.tsx';
import { NAV_ACTIONS, NAV_ITEMS } from '../nav-fixtures.tsx';
import { ShowroomSection, Specimen, SpecimenGrid } from './Showroom.tsx';

export function NavigationSection() {
  return (
    <ShowroomSection id="navegacion" title="Moverse por la app" description="Navbar translúcida con menú lateral en teléfono, pestañas con barra deslizante y menús de acciones.">
      <Specimen title="Navbar" storyId="navegación-navbar--desktop" note="Reduce el viewport para ver el menú lateral">
        <div className="-m-5 overflow-hidden sm:-m-6"><Navbar items={NAV_ITEMS} currentId="deliveries" actions={NAV_ACTIONS} /></div>
      </Specimen>
      <SpecimenGrid>
        <Specimen title="Tabs" storyId="navegación-tabs--overview">
          <Tabs defaultSelectedKey="active">
            <TabList aria-label="Envíos">
              <Tab id="pending" icon={<Clock />} count={2}>Pendientes</Tab>
              <Tab id="active" icon={<Truck />} count={5}>En camino</Tab>
              <Tab id="done" icon={<CircleCheck />}>Entregados</Tab>
            </TabList>
            {['pending', 'active', 'done'].map((id) => (
              <TabPanel key={id} id={id}><p className="text-sm text-text-secondary">Contenido de «{id}». Usa ← → para cambiar.</p></TabPanel>
            ))}
          </Tabs>
        </Specimen>
        <Specimen title="Menu" storyId="navegación-menu--overview">
          <MenuTrigger>
            <Button variant="outline" trailingIcon={<MoreHorizontal />}>Acciones del envío</Button>
            <Menu placement="bottom start">
              <MenuItem id="edit" icon={<Pencil />} shortcut="E">Editar</MenuItem>
              <MenuItem id="copy" icon={<Copy />} description="Crea un borrador igual">Duplicar</MenuItem>
              <MenuSeparator />
              <MenuItem id="cancel" icon={<Trash2 />} tone="danger">Cancelar envío</MenuItem>
            </Menu>
          </MenuTrigger>
        </Specimen>
      </SpecimenGrid>
    </ShowroomSection>
  );
}

export function FeedbackSection() {
  return (
    <ShowroomSection id="retroalimentacion" title="Decir qué pasó y qué sigue" description="Avisos en línea, estados vacíos y de error, carga con skeleton y notificaciones temporales.">
      <SpecimenGrid>
        <Specimen title="Alert" storyId="retroalimentación-alert--tones">
          <Alert tone="info" title="Horario de servicio">Recibimos solicitudes de 12:00 a 20:00.</Alert>
          <Alert tone="success" title="Sucursal verificada" onDismiss={() => undefined}>Ya puedes solicitar envíos.</Alert>
          <Alert tone="warning" title="Alta demanda">La asignación puede tardar más.</Alert>
          <Alert tone="danger" title="No pudimos confirmar el pago" actions={<Button size="sm" variant="outline">Reintentar</Button>} />
        </Specimen>
        <Specimen title="Toast, Spinner y Skeleton" storyId="overlays-toast--tones">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onPress={() => toast({ title: 'Envío creado', description: 'Folio PV-1045', tone: 'success' })}>Toast de éxito</Button>
            <Button variant="outline" size="sm" onPress={() => toast({ title: 'No se pudo guardar', description: 'Revisa tu conexión.', tone: 'danger' })}>Toast de error</Button>
          </div>
          <span className="flex items-center gap-2 text-sm text-text-secondary"><Spinner size="sm" label="Buscando repartidor" />Buscando repartidor…</span>
          <Card variant="outline" aria-busy="true">
            <CardContent className="flex items-center gap-3">
              <Skeleton shape="circle" className="size-10" />
              <SkeletonText lines={2} className="flex-1" />
            </CardContent>
          </Card>
        </Specimen>
        <Specimen title="EmptyState" storyId="retroalimentación-emptystate--variants">
          <EmptyState compact icon={<PackageOpen />} title="Aún no tienes envíos" description="Solicita el primero y síguelo en vivo." actions={<Button size="sm" leadingIcon={<Plus />}>Nuevo envío</Button>} />
        </Specimen>
        <Specimen title="ErrorState" storyId="retroalimentación-emptystate--variants">
          <EmptyState compact tone="danger" icon={<CloudOff />} title="No pudimos cargar los envíos" description="Tus datos están a salvo." actions={<Button size="sm" variant="secondary">Reintentar</Button>} />
        </Specimen>
      </SpecimenGrid>
    </ShowroomSection>
  );
}
