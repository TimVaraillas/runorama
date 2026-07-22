import type { Meta, StoryObj } from '@storybook/angular';
import type { PlanSequenceMinutes } from '../../../core/models';
import { PlanSequenceSelectComponent } from './plan-sequence-select.component';

const meta: Meta<PlanSequenceSelectComponent> = {
  title: 'Molecules/PlanSequenceSelect',
  component: PlanSequenceSelectComponent,
  tags: ['autodocs'],
  argTypes: {
    valueChange: { action: 'valueChange' },
  },
  render: (args) => ({
    props: args,
    template: `<div class="max-w-xs">
      <ui-plan-sequence-select
        [value]="value"
        [options]="options"
        (valueChange)="valueChange($event)"
      />
    </div>`,
  }),
};

export default meta;
type Story = StoryObj<PlanSequenceSelectComponent>;

export const Default: Story = {
  args: {
    value: 10 as PlanSequenceMinutes,
    options: [5, 10, 15, 20] as PlanSequenceMinutes[],
  },
};
