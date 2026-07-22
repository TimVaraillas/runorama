import type { Meta, StoryObj } from '@storybook/angular';
import { QuantityStepperComponent } from './quantity-stepper.component';

const meta: Meta<QuantityStepperComponent> = {
  title: 'Atoms/QuantityStepper',
  component: QuantityStepperComponent,
  tags: ['autodocs'],
  argTypes: {
    value: { control: 'number' },
    min: { control: 'number' },
    max: { control: 'number' },
  },
  render: (args) => ({
    props: args,
    template: `<ui-quantity-stepper [value]="value" [min]="min" [max]="max" />`,
  }),
};

export default meta;
type Story = StoryObj<QuantityStepperComponent>;

export const Default: Story = {
  args: { value: 2, min: 1, max: 10 },
};

export const AtMinimum: Story = {
  args: { value: 1, min: 1, max: 10 },
};

export const AtMaximum: Story = {
  args: { value: 10, min: 1, max: 10 },
};
