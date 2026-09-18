import type { Meta, StoryObj } from '@storybook/angular';
import { DatePickerComponent } from './date-picker.component';

const meta: Meta<DatePickerComponent> = {
  title: 'Atoms/DatePicker',
  component: DatePickerComponent,
  tags: ['autodocs'],
  argTypes: {
    value: { control: 'text' },
    min: { control: 'text' },
    max: { control: 'text' },
    label: { control: 'text' },
    showToday: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
  render: (args) => ({
    props: args,
    template: `<ui-date-picker [value]="value" [min]="min" [max]="max" [label]="label" [showToday]="showToday" [disabled]="disabled" />`,
  }),
};

export default meta;
type Story = StoryObj<DatePickerComponent>;

export const Default: Story = {
  args: { value: '2026-09-18', min: '', max: '', label: 'Date', showToday: true, disabled: false },
};

export const Empty: Story = {
  args: { value: '', min: '', max: '', label: 'Date', showToday: true, disabled: false },
};

export const Bounded: Story = {
  args: {
    value: '2026-09-18',
    min: '2026-09-01',
    max: '2026-09-30',
    label: 'Date (septembre uniquement)',
    showToday: false,
    disabled: false,
  },
};

export const Disabled: Story = {
  args: { value: '2026-09-18', min: '', max: '', label: 'Date', showToday: false, disabled: true },
};
