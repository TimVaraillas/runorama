import type { Meta, StoryObj } from '@storybook/angular';
import type { PlanHourlyRecap } from '../../../core/models';
import { PlanHourlyRecapComponent } from './plan-hourly-recap.component';

const rows: PlanHourlyRecap[] = [
  { hour: 1, carbs: 60, targetCarbs: 60, energy: 250, targetEnergy: 250 },
  { hour: 2, carbs: 40, targetCarbs: 60, energy: 180, targetEnergy: 250 },
  { hour: 3, carbs: 55, targetCarbs: 60, energy: 230, targetEnergy: 250 },
];

const meta: Meta<PlanHourlyRecapComponent> = {
  title: 'Molecules/PlanHourlyRecap',
  component: PlanHourlyRecapComponent,
  tags: ['autodocs'],
  render: (args) => ({
    props: args,
    template: `<div class="max-w-md">
      <ui-plan-hourly-recap [rows]="rows" />
    </div>`,
  }),
};

export default meta;
type Story = StoryObj<PlanHourlyRecapComponent>;

export const Default: Story = {
  args: { rows },
};
