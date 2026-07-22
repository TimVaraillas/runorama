import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';
import { CdkDrag, CdkDropList } from '@angular/cdk/drag-drop';
import type { PositionedIntake } from '../../../core/models';
import { PlanTimelineBlockComponent } from './plan-timeline-block.component';

const intake: PositionedIntake = {
  id: 'i1',
  productId: 'p1',
  startMinute: 30,
  durationMinutes: 10,
  quantity: 1,
  product: { id: 'p1', categoryId: 'c1', brand: 'Maurten', name: 'Gel 100', unitWeight: 40, energy: 100, carbs: 25, fats: 0, proteins: 0, salt: 22 },
  top: 0,
  height: 80,
  lane: 0,
  endMinute: 40,
  overlapped: false,
};

const meta: Meta<PlanTimelineBlockComponent> = {
  title: 'Organisms/PlanTimelineBlock',
  component: PlanTimelineBlockComponent,
  tags: ['autodocs'],
  decorators: [moduleMetadata({ imports: [CdkDropList, CdkDrag] })],
  argTypes: {
    dragging: { control: 'boolean' },
    remove: { action: 'remove' },
    resizeStart: { action: 'resizeStart' },
  },
  render: (args) => ({
    props: args,
    template: `<div cdkDropList class="relative h-24 w-56 rounded-xl bg-slate-50">
      <ui-plan-timeline-block
        cdkDrag
        [intake]="intake"
        [dragging]="dragging"
        (remove)="remove()"
        (resizeStart)="resizeStart($event)"
      />
    </div>`,
  }),
};

export default meta;
type Story = StoryObj<PlanTimelineBlockComponent>;

export const Default: Story = {
  args: { intake, dragging: false },
};

export const Dragging: Story = {
  args: { intake, dragging: true },
};
