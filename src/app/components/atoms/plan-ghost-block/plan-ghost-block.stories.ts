import type { Meta, StoryObj } from '@storybook/angular';
import { PlanGhostBlockComponent } from './plan-ghost-block.component';

const meta: Meta<PlanGhostBlockComponent> = {
  title: 'Atoms/PlanGhostBlock',
  component: PlanGhostBlockComponent,
  tags: ['autodocs'],
  argTypes: {
    top: { control: 'number' },
    height: { control: 'number' },
    left: { control: 'text' },
    width: { control: 'text' },
  },
  render: (args) => ({
    props: args,
    template: `<div class="relative h-48 w-64 rounded-xl bg-slate-50">
      <ui-plan-ghost-block [top]="top" [height]="height" [left]="left" [width]="width" />
    </div>`,
  }),
};

export default meta;
type Story = StoryObj<PlanGhostBlockComponent>;

export const Default: Story = {
  args: { top: 24, height: 80, left: '16px', width: 'calc(100% - 32px)' },
};
