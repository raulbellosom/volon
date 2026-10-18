import type { Meta, StoryObj } from '@storybook/react-vite';
import { FOOTER_COLUMNS } from '../../gallery/nav-fixtures.tsx';
import { ThemeToggle } from '../../theme/ThemeToggle.tsx';
import { SiteFooter } from './SiteFooter.tsx';

const meta = {
  title: 'Navegación/SiteFooter',
  component: SiteFooter,
  parameters: { layout: 'fullscreen' },
  args: { columns: FOOTER_COLUMNS },
} satisfies Meta<typeof SiteFooter>;

export default meta;
type Story = StoryObj<typeof meta>;

const legal = (
  <>
    <span>© 2026 Volon. Datos de ejemplo.</span>
    <span>Hecho en Puerto Vallarta</span>
  </>
);

export const Surface: Story = { args: { legal, aside: <ThemeToggle compact /> } };

export const Brand: Story = { args: { legal, tone: 'brand' } };
