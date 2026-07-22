import type { Meta, StoryObj } from '@storybook/angular';
import { NutrientStatComponent } from './nutrient-stat.component';

const meta: Meta<NutrientStatComponent> = {
  title: 'Atoms/NutrientStat',
  component: NutrientStatComponent,
  tags: ['autodocs'],
  argTypes: {
    label: { control: 'text' },
    value: { control: 'number' },
    unit: { control: 'text' },
  },
  render: (args) => ({
    props: args,
    template: `<div class="max-w-40">
      <ui-nutrient-stat [label]="label" [value]="value" [unit]="unit" />
    </div>`,
  }),
};

export default meta;
type Story = StoryObj<NutrientStatComponent>;

export const Carbs: Story = {
  args: { label: 'Glucides', value: 24, unit: 'g' },
};

export const Calories: Story = {
  args: { label: 'Énergie', value: 90, unit: 'kcal' },
};

export const Sodium: Story = {
  args: { label: 'Sodium', value: 200, unit: 'mg' },
};

export const Group: Story = {
  render: () => ({
    template: `
      <div class="grid max-w-md grid-cols-3 gap-2">
        <ui-nutrient-stat label="Glucides" [value]="24" unit="g" />
        <ui-nutrient-stat label="Énergie" [value]="90" unit="kcal" />
        <ui-nutrient-stat label="Sodium" [value]="200" unit="mg" />
      </div>
    `,
  }),
};
