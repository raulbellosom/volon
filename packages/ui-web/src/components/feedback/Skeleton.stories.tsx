import type { Meta, StoryObj } from '@storybook/react-vite';
import { Card, CardContent } from '../content/Card.tsx';
import { Skeleton, SkeletonText } from './Skeleton.tsx';

const meta = {
  title: 'Retroalimentación/Skeleton',
  component: Skeleton,
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const DeliveryCardLoading: Story = {
  render: () => (
    <div aria-busy="true" aria-label="Cargando envío" className="grid max-w-3xl gap-4 md:grid-cols-2">
      {[0, 1].map((key) => (
        <Card key={key}>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <Skeleton shape="circle" className="size-10" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton shape="text" className="w-2/5" />
                <Skeleton shape="text" className="h-3 w-1/4" />
              </div>
              <Skeleton className="h-6.5 w-24 rounded-full" />
            </div>
            <SkeletonText lines={3} />
          </CardContent>
        </Card>
      ))}
    </div>
  ),
};
