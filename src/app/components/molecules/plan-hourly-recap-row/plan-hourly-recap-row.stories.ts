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
    row: {
      hour: 1,
      nutrients: [
        { key: 'carbs', label: 'Glucides', unit: 'g', planned: 60, target: 60 },
        { key: 'proteins', label: 'Protéines', unit: 'g', planned: 10, target: 10 },
        { key: 'sodium', label: 'Sodium', unit: 'mg', planned: 500, target: 500 },
      ],
    } as PlanHourlyRecap,
  },
};

export const BelowTarget: Story = {
  args: {
    row: {
      hour: 2,
      nutrients: [
        { key: 'carbs', label: 'Glucides', unit: 'g', planned: 35, target: 60 },
        { key: 'proteins', label: 'Protéines', unit: 'g', planned: 4, target: 10 },
        { key: 'sodium', label: 'Sodium', unit: 'mg', planned: 200, target: 500 },
      ],
    } as PlanHourlyRecap,
  },
};
