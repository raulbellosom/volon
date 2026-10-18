import type { Meta, StoryObj } from '@storybook/react-vite';
import { Ban, CircleDollarSign, MapPinned, Package } from 'lucide-react';
import { Section } from '../../gallery/Showcase.tsx';
import { Accordion, AccordionItem } from './Accordion.tsx';

const meta = {
  title: 'Contenido/Accordion',
  component: Accordion,
  args: { children: null },
} satisfies Meta<typeof Accordion>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FAQ: Story = {
  render: () => (
    <div className="flex max-w-2xl flex-col gap-8">
      <Section title="Una abierta a la vez" description="Enter o Espacio abren y cierran; el título es un botón dentro de un encabezado.">
        <Accordion defaultExpandedKeys={['what']}>
          <AccordionItem id="what" icon={<Package />} title="¿Qué puedo enviar?" subtitle="Comida y paquetes chicos">
            Comida preparada empaquetada y bienes pequeños. Ver la lista de artículos restringidos antes de solicitar.
          </AccordionItem>
          <AccordionItem id="where" icon={<MapPinned />} title="¿Dónde opera el servicio?">
            En una microzona de Puerto Vallarta durante el piloto. La cobertura exacta se confirma al cotizar.
          </AccordionItem>
          <AccordionItem id="cost" icon={<CircleDollarSign />} title="¿Cómo se calcula el costo?">
            Cargo base más un tramo por distancia de ruta. Aquí no hay tarifas reales.
          </AccordionItem>
          <AccordionItem id="blocked" icon={<Ban />} title="Artículos restringidos (no disponible)" isDisabled>—</AccordionItem>
        </Accordion>
      </Section>
      <Section title="Varias abiertas">
        <Accordion allowsMultipleExpanded defaultExpandedKeys={['a', 'b']}>
          <AccordionItem id="a" title="Datos de la sucursal">Nombre, dirección y teléfono.</AccordionItem>
          <AccordionItem id="b" title="Horario de recogida">De 12:00 a 20:00.</AccordionItem>
        </Accordion>
      </Section>
    </div>
  ),
};
