import type { Meta, StoryObj } from '@storybook/react-vite';
import { Section } from '../gallery/Showcase.tsx';
import { ThemeToggle } from './ThemeToggle.tsx';
import { useTheme } from './useTheme.ts';

const meta = {
  title: 'Acciones/ThemeToggle',
  component: ThemeToggle,
} satisfies Meta<typeof ThemeToggle>;

export default meta;

function Status() {
  const { preference, resolvedTheme } = useTheme();
  return (
    <p className="text-sm text-text-secondary">
      Preferencia: <strong className="text-text-primary">{preference}</strong> · En pantalla:{' '}
      <strong className="text-text-primary">{resolvedTheme}</strong>
    </p>
  );
}

export const Overview: StoryObj = {
  render: () => (
    <>
      <Section
        title="Selector de tema"
        description="Guarda la elección en el navegador, sigue al sistema en «Sistema» y sincroniza todos los selectores. Las apps incluyen themeInitScript en <head> para evitar parpadeo."
      >
        <ThemeToggle />
        <Status />
      </Section>
      <Section title="Compacto (navbar)">
        <ThemeToggle compact />
      </Section>
    </>
  ),
};
