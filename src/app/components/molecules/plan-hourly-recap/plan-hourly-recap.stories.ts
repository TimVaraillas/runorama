import type { Meta, StoryObj } from '@storybook/angular';
import type { PlanHourlyRecap } from '../../../core/models';
import { PlanHourlyRecapComponent } from './plan-hourly-recap.component';

const rows: PlanHourlyRecap[] = [
  {
    hour: 1,
    nutrients: [
      { key: 'carbs', label: 'Glucides', unit: 'g', planned: 60, target: 60 },
      { key: 'proteins', label: 'Protéines', unit: 'g', planned: 10, target: 10 },
      { key: 'sodium', label: 'Sodium', unit: 'mg', planned: 500, target: 500 },
    ],
  },
  {
    hour: 2,
    nutrients: [
      { key: 'carbs', label: 'Glucides', unit: 'g', planned: 40, target: 60 },
      { key: 'proteins', label: 'Protéines', unit: 'g', planned: 6, target: 10 },
      { key: 'sodium', label: 'Sodium', unit: 'mg', planned: 300, target: 500 },
    ],
  },
  {
    hour: 3,
    nutrients: [
      { key: 'carbs', label: 'Glucides', unit: 'g', planned: 55, target: 60 },
      { key: 'proteins', label: 'Protéines', unit: 'g', planned: 9, target: 10 },
      { key: 'sodium', label: 'Sodium', unit: 'mg', planned: 480, target: 500 },
    ],
  },
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
