import type { Meta, StoryObj } from '@storybook/angular';
import { NumberInputComponent } from './number-input.component';

const meta: Meta<NumberInputComponent> = {
  title: 'Atoms/NumberInput',
  component: NumberInputComponent,
  tags: ['autodocs'],
  argTypes: {
    value: { control: 'number' },
    min: { control: 'number' },
    max: { control: 'number' },
    step: { control: 'number' },
    unit: { control: 'text' },
    label: { control: 'text' },
    placeholder: { control: 'text' },
  },
  render: (args) => ({
    props: args,
    template: `<div class="max-w-xs">
      <ui-number-input [value]="value" [min]="min" [max]="max" [step]="step" [unit]="unit" [label]="label" [placeholder]="placeholder" />
    </div>`,
  }),
};

export default meta;
type Story = StoryObj<NumberInputComponent>;

export const Default: Story = {
  args: { value: 42.5, min: 0, step: 0.1, unit: 'km', label: 'Distance', placeholder: '' },
};

export const Integer: Story = {
  args: { value: 100, min: 1, step: 1, unit: 'm D+ / km', label: 'Coefficient de montée', placeholder: '' },
};

export const Bounded: Story = {
  args: { value: 15, min: 0, max: 30, step: 1, unit: '%', label: 'Facteur (0 à 30)', placeholder: '' },
};

export const Empty: Story = {
  args: { value: null as unknown as number, min: 0, step: 1, unit: 'min', label: 'Temps d\u2019arrêt', placeholder: 'Ex : 5' },
};
