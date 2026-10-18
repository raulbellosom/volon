import { colorThemes, contrastRequirements } from '@delivery/design-tokens';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Logo } from '../../components/brand/Logo.tsx';
import { ToastRegion } from '../../components/overlays/Toast.tsx';
import { coverage } from '../../coverage.ts';
import { ThemeToggle } from '../../theme/ThemeToggle.tsx';
import { brandScope } from '../../utils/brand-scope.ts';
import { cx } from '../../utils/cx.ts';
import { ContentSection, DataSection } from './ContentAndData.tsx';
import { FormsSection } from './FormsSection.tsx';
import { ActionsSection, FoundationsSection } from './FoundationsAndActions.tsx';
import { FeedbackSection, NavigationSection } from './NavigationAndFeedback.tsx';
import { OverlaysSection } from './OverlaysSection.tsx';
import { SECTIONS } from './Showroom.tsx';

const meta = { title: 'Introducción/Colección completa', parameters: { layout: 'fullscreen' } } satisfies Meta;
export default meta;

const ready = coverage.filter((entry) => entry.status !== 'pending').length;
const STATS = [
  { value: String(ready), label: 'componentes listos' },
  { value: String(new Set(coverage.map((entry) => entry.family)).size), label: 'familias' },
  { value: String(Object.keys(colorThemes.light).length), label: 'tokens de color por tema' },
  { value: String(contrastRequirements.length * 2), label: 'pares de contraste AA verificados' },
];

const TOC_LINK = cx(
  'rounded-full px-3 py-1.5 text-sm font-semibold whitespace-nowrap text-text-secondary outline-none',
  'transition-colors hover:bg-surface-hover hover:text-text-primary focus-visible:focus-ring',
);

function Hero() {
  return (
    <header className={cx(brandScope, 'overflow-hidden rounded-2xl px-6 py-10 text-text-primary sm:px-10 sm:py-14')}>
      <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex max-w-xl flex-col gap-5">
          <Logo variant="tagline" size="xl" onBrand />
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">Volon UI, colección completa</h1>
          <p className="text-lg text-text-secondary">
            Cada pieza que construimos, viva y funcional en una sola página. Interactúa, usa el teclado y cambia el tema para revisarla.
          </p>
          <ThemeToggle />
        </div>
        <dl className="grid grid-cols-2 gap-x-8 gap-y-6">
          {STATS.map((stat) => (
            <div key={stat.label} className="flex flex-col-reverse gap-1">
              <dt className="text-sm text-text-secondary">{stat.label}</dt>
              <dd className="text-4xl font-extrabold tabular-nums text-accent">{stat.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </header>
  );
}

/** Showroom of everything built so far; synthetic data only. */
export const Overview: StoryObj = {
  render: () => (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
      <ToastRegion />
      <Hero />
      <nav aria-label="Secciones (móvil)" className="sticky top-0 z-(--z-sticky) -mx-4 mt-6 overflow-x-auto bg-background/90 px-4 py-2 backdrop-blur lg:hidden">
        <ul className="flex gap-1">{SECTIONS.map((section) => <li key={section.id}><a href={`#${section.id}`} className={TOC_LINK}>{section.label}</a></li>)}</ul>
      </nav>
      <div className="mt-10 grid gap-10 lg:grid-cols-[200px_1fr]">
        <nav aria-label="Secciones" className="hidden lg:block">
          <ul className="sticky top-6 flex flex-col gap-1">
            {SECTIONS.map((section, index) => (
              <li key={section.id}>
                <a href={`#${section.id}`} className={cx(TOC_LINK, 'flex gap-3')}>
                  <span className="tabular-nums text-text-link">{String(index + 1).padStart(2, '0')}</span>{section.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <main className="min-w-0">
          <FoundationsSection />
          <ActionsSection />
          <FormsSection />
          <ContentSection />
          <DataSection />
          <NavigationSection />
          <FeedbackSection />
          <OverlaysSection />
        </main>
      </div>
    </div>
  ),
};
