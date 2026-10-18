import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Section } from '../../gallery/Showcase.tsx';
import { Pagination } from './Pagination.tsx';

const meta = {
  title: 'Navegación/Pagination',
  component: Pagination,
  args: { page: 1, pageCount: 12, onPageChange: () => undefined },
} satisfies Meta<typeof Pagination>;

export default meta;
type Story = StoryObj<typeof meta>;

function Demo({ pageCount, totalItems }: { pageCount: number; totalItems?: number }) {
  const [page, setPage] = useState(6);
  return <Pagination page={page} pageCount={pageCount} onPageChange={setPage} {...(totalItems ? { totalItems, pageSize: 10 } : {})} />;
}

export const Overview: Story = {
  render: () => (
    <div className="max-w-3xl">
      <Section title="Con total" description="En teléfono se reduce a «6 / 12» con anterior y siguiente.">
        <Demo pageCount={12} totalItems={118} />
      </Section>
      <Section title="Solo páginas">
        <Demo pageCount={20} />
      </Section>
    </div>
  ),
};
