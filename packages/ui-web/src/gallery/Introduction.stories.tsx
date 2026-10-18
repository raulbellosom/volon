import logoDark from '@delivery/branding/assets/logo/logo-tagline-dark.png';
import logoLight from '@delivery/branding/assets/logo/logo-tagline.png';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { ArrowRight } from 'lucide-react';
import { Button } from '../components/actions/Button.tsx';
import { StatusBadge } from '../components/content/StatusBadge.tsx';
import { ThemeToggle } from '../theme/ThemeToggle.tsx';
import { Section } from './Showcase.tsx';

const meta = { title: 'Introducción/Volon UI', parameters: { layout: 'fullscreen' } } satisfies Meta;
export default meta;

const PRINCIPLES = [
  { title: 'La cinta', body: 'Acciones en forma de píldora con puntas redondas, como el trazo del logo. Los controles son suaves (12 px) y los contenedores concéntricos.' },
  { title: 'El pliegue', body: 'Los botones sólidos tienen una franja inferior más oscura, la cara oculta de la cinta. Al presionar se aplana y el botón baja 1 px.' },
  { title: 'Lima es señal', body: 'El lima marca lo vivo, lo seleccionado o el momento de marca. En claro siempre va junto al azul profundo; nunca solo sobre blanco.' },
  { title: 'Rápido, no flotante', body: 'Transiciones de 80 a 280 ms con desaceleración marcada; un pequeño rebote solo en toggles. Todo se desactiva con «reducir movimiento».' },
  { title: 'Todo campo tiene ícono', body: 'Cada input y select muestra un ícono en una ficha que se ilumina al enfocar: se entiende qué se llena antes de leer la etiqueta.' },
  { title: 'Claridad local', body: 'Español de México, de tú, frases cortas. Estados con ícono y texto, nunca solo color. Números tabulares para precios y tiempos.' },
];

export const Overview: StoryObj = {
  render: () => (
    <div className="mx-auto flex max-w-5xl flex-col gap-10 px-6 py-10">
      <header className="flex flex-col gap-6 rounded-2xl bg-surface p-8 shadow-1 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-4">
          <img src={logoLight} alt="Volon — Pídelo de Volon" className="w-64 dark:hidden" />
          <img src={logoDark} alt="Volon — Pídelo de Volon" className="hidden w-64 dark:block" />
          <p className="max-w-md text-md text-text-secondary">
            Sistema de diseño y biblioteca de componentes web. Cambia el tema aquí o con el pincel de la barra superior.
          </p>
        </div>
        <div className="flex flex-col items-start gap-3">
          <ThemeToggle />
          <StatusBadge status="in-transit" />
          <Button variant="accent" size="lg" trailingIcon={<ArrowRight />}>Pídelo de Volon</Button>
        </div>
      </header>
      <Section title="Lenguaje visual" description="Seis ideas que deben reconocerse incluso en un solo botón.">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {PRINCIPLES.map(({ title, body }) => (
            <article key={title} className="rounded-xl border border-border-subtle bg-surface p-5">
              <h3 className="mb-1.5 text-lg font-bold">{title}</h3>
              <p className="text-sm text-text-secondary">{body}</p>
            </article>
          ))}
        </div>
      </Section>
      <Section title="Cómo usar esta galería">
        <ul className="flex max-w-2xl list-disc flex-col gap-2 ps-5 text-md text-text-secondary">
          <li><strong className="text-text-primary">Fundamentos</strong>: color, tipografía, geometría, elevación y movimiento generados desde los tokens.</li>
          <li>Cada componente tiene un <strong className="text-text-primary">Playground</strong> con controles y vistas de estados y variantes.</li>
          <li>Prueba con teclado (Tab, flechas, Escape) y revisa la pestaña <strong className="text-text-primary">Accessibility</strong>.</li>
          <li>Cambia el viewport desde la barra para revisar teléfono, tableta y escritorio.</li>
          <li><strong className="text-text-primary">Cobertura</strong> muestra lo terminado y lo pendiente.</li>
        </ul>
      </Section>
    </div>
  ),
};
