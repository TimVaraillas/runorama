import type { Meta, StoryObj } from '@storybook/angular';
import { PlanResizeHandleComponent } from './plan-resize-handle.component';

const meta: Meta<PlanResizeHandleComponent> = {
  title: 'Atoms/PlanResizeHandle',
  component: PlanResizeHandleComponent,
  tags: ['autodocs'],
  argTypes: {
    edge: { control: 'inline-radio', options: ['top', 'bottom'] },
    grab: { action: 'grab' },
  },
  render: (args) => ({
    props: args,
    template: `<div class="relative h-24 w-40 rounded-xl bg-secondary-500">
      <ui-plan-resize-handle [edge]="edge" (grab)="grab($event)" />
    </div>`,
  }),
};

export default meta;
type Story = StoryObj<PlanResizeHandleComponent>;

export const Top: Story = {
  args: { edge: 'top' },
};

export const Bottom: Story = {
  args: { edge: 'bottom' },
};
