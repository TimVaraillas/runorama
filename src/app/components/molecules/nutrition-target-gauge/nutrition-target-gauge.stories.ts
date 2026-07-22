import type { Meta, StoryObj } from '@storybook/angular';
import { NutritionTargetGaugeComponent } from './nutrition-target-gauge.component';

const meta: Meta<NutritionTargetGaugeComponent> = {
  title: 'Molecules/NutritionTargetGauge',
  component: NutritionTargetGaugeComponent,
  tags: ['autodocs'],
  argTypes: {
    label: { control: 'text' },
    carried: { control: 'number' },
    target: { control: 'number' },
    unit: { control: 'text' },
  },
  render: (args) => ({
    props: args,
    template: `<div class="max-w-xs">
      <ui-nutrition-target-gauge [label]="label" [carried]="carried" [target]="target" [unit]="unit" />
    </div>`,
  }),
};

export default meta;
type Story = StoryObj<NutritionTargetGaugeComponent>;

export const OnTarget: Story = {
  args: { label: 'Énergie', carried: 1000, target: 1000, unit: 'kcal' },
};

export const Under: Story = {
  args: { label: 'Glucides', carried: 60, target: 100, unit: 'g' },
};

export const Over: Story = {
  args: { label: 'Énergie', carried: 1400, target: 1000, unit: 'kcal' },
};

export const NoTarget: Story = {
  args: { label: 'Glucides', carried: 80, target: null, unit: 'g' },
};
