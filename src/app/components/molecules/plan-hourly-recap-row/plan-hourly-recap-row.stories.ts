import type { Meta, StoryObj } from '@storybook/angular';
import type { PlanHourlyRecap } from '../../../core/models';
import { PlanHourlyRecapRowComponent } from './plan-hourly-recap-row.component';

const meta: Meta<PlanHourlyRecapRowComponent> = {
  title: 'Molecules/PlanHourlyRecapRow',
  component: PlanHourlyRecapRowComponent,
  tags: ['autodocs'],
  render: (args) => ({
    props: args,
    template: `<div class="max-w-md">
      <ui-plan-hourly-recap-row [row]="row" />
    </div>`,
  }),
};

export default meta;
type Story = StoryObj<PlanHourlyRecapRowComponent>;

export const OnTarget: Story = {
  args: {
    row: { hour: 1, carbs: 60, targetCarbs: 60, energy: 250, targetEnergy: 250 } as PlanHourlyRecap,
  },
};

export const BelowTarget: Story = {
  args: {
    row: { hour: 2, carbs: 35, targetCarbs: 60, energy: 150, targetEnergy: 250 } as PlanHourlyRecap,
  },
};
