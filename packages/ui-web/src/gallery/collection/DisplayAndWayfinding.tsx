import { Clock, Copy, Flame, Hash, Inbox, Pencil, Printer, Truck, User } from 'lucide-react';
import { ButtonGroup } from '../../components/actions/ButtonGroup.tsx';
import { Button } from '../../components/actions/Button.tsx';
import { IconButton } from '../../components/actions/IconButton.tsx';
import { Link, LinkButton } from '../../components/actions/Link.tsx';
import { ToggleButton } from '../../components/actions/ToggleButton.tsx';
import { Accordion, AccordionItem } from '../../components/content/Accordion.tsx';
import { AvatarGroup, Avatar } from '../../components/content/Avatar.tsx';
import { Divider } from '../../components/content/Divider.tsx';
import { DescriptionList } from '../../components/data/DescriptionList.tsx';
import { Stat } from '../../components/data/Stat.tsx';
import { Progress } from '../../components/feedback/Progress.tsx';
import { Breadcrumbs } from '../../components/navigation/Breadcrumbs.tsx';
import { Sidebar, SidebarItem, SidebarSection } from '../../components/navigation/Sidebar.tsx';
import { Stepper } from '../../components/navigation/Stepper.tsx';
import { Tooltip } from '../../components/overlays/Tooltip.tsx';
import { ShowroomSection, Specimen, SpecimenGrid } from './Showroom.tsx';

const PEOPLE = ['Ana López', 'Luis Pérez', 'Marta Ruiz', 'Jorge Díaz', 'Sofía Gil'].map((name) => ({ name }));

export function DisplaySection() {
  return (
    <ShowroomSection id="presentacion" title="Cifras, personas y detalles" description="Indicadores con tendencia, avatares con respaldo de iniciales, progreso, listas de detalle y secciones plegables.">
      <SpecimenGrid columns={3}>
        <Specimen title="Stat y Progress" storyId="datos-stat--grid">
          <Stat icon={<Truck />} label="Entregas hoy" value="128" delta={{ value: '+12%', direction: 'up', sentiment: 'positive', period: 'vs. ayer' }} />
          <Progress label="Capacidad del turno" value={72} />
        </Specimen>
        <Specimen title="Avatar, Tooltip y Divider" storyId="contenido-avatar--overview">
          <div className="flex items-center gap-3">
            <Avatar name="Luis Pérez" status="busy" size="lg" />
            <AvatarGroup people={PEOPLE} max={3} />
          </div>
          <Divider label="o" />
          <div className="flex gap-2">
            <Tooltip content="Duplicar envío"><IconButton label="Duplicar" icon={<Copy />} variant="outline" /></Tooltip>
            <Tooltip content="Imprimir guía"><IconButton label="Imprimir" icon={<Printer />} variant="outline" /></Tooltip>
          </div>
        </Specimen>
        <Specimen title="DescriptionList" storyId="datos-descriptionlist--layouts">
          <DescriptionList layout="stacked" items={[{ term: 'Folio', description: 'PV-1042', icon: <Hash /> }, { term: 'Destinatario', description: 'Ana López', icon: <User /> }, { term: 'Ventana', description: '14:00 – 15:00', icon: <Clock /> }]} />
        </Specimen>
        <Specimen title="Accordion" storyId="contenido-accordion--faq" className="md:col-span-2 xl:col-span-3">
          <Accordion defaultExpandedKeys={['a']}>
            <AccordionItem id="a" title="¿Qué puedo enviar?">Comida preparada empaquetada y bienes pequeños.</AccordionItem>
            <AccordionItem id="b" title="¿Cómo se calcula el costo?">Cargo base más tramo por distancia de ruta.</AccordionItem>
          </Accordion>
        </Specimen>
      </SpecimenGrid>
    </ShowroomSection>
  );
}

const STEPS = [{ id: 'a', label: 'Sucursal' }, { id: 'b', label: 'Horario' }, { id: 'c', label: 'Pago' }, { id: 'd', label: 'Revisión' }];

export function WayfindingSection() {
  return (
    <ShowroomSection id="orientacion" title="Saber dónde estás y qué sigue" description="Migas de pan, pasos de un proceso, barra lateral contraíble, enlaces y grupos de botones.">
      <SpecimenGrid>
        <Specimen title="Breadcrumbs y Stepper" storyId="navegación-stepper--interactive">
          <Breadcrumbs items={[{ id: 'a', label: 'Envíos', href: '#envios' }, { id: 'b', label: 'Nuevo envío' }]} />
          <Stepper aria-label="Alta de sucursal" steps={STEPS} currentIndex={1} />
        </Specimen>
        <Specimen title="Sidebar" storyId="navegación-sidebar--desktop-and-collapsed" note="Contraíble; en teléfono va dentro de un Drawer">
          <div className="-m-5 flex h-56 overflow-hidden sm:-m-6">
            <Sidebar aria-label="Ejemplo de navegación" className="h-full">
              <SidebarSection title="Operación">
                <SidebarItem href="#envios" label="Envíos" icon={<Truck />} isCurrent count={3} />
                <SidebarItem href="#bandeja" label="Incidencias" icon={<Inbox />} />
              </SidebarSection>
            </Sidebar>
          </div>
        </Specimen>
        <Specimen title="Link, ToggleButton y ButtonGroup" storyId="acciones-buttongroup--overview" className="lg:col-span-2">
          <p className="text-md">Consulta la <Link href="#guia">guía de empaque</Link> o los <Link href="https://example.com" external>términos</Link>.</p>
          <div className="flex flex-wrap items-center gap-3">
            <ButtonGroup aria-label="Acciones del envío" variant="attached">
              <Button variant="outline" leadingIcon={<Pencil />}>Editar</Button>
              <Button variant="outline" leadingIcon={<Copy />}>Duplicar</Button>
            </ButtonGroup>
            <ToggleButton icon={<Flame />} defaultSelected>Solo urgentes</ToggleButton>
            <LinkButton href="#envios" variant="secondary">Ver todos</LinkButton>
          </div>
        </Specimen>
      </SpecimenGrid>
    </ShowroomSection>
  );
}
