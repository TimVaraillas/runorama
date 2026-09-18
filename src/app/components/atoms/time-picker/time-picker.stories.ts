import type { Meta, StoryObj } from '@storybook/angular';
import { TimePickerComponent } from './time-picker.component';

const meta: Meta<TimePickerComponent> = {
  title: 'Atoms/TimePicker',
  component: TimePickerComponent,
  tags: ['autodocs'],
  argTypes: {
    hours: { control: 'number' },
    minutes: { control: 'number' },
    maxHours: { control: 'number' },
    label: { control: 'text' },
    showNow: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
  render: (args) => ({
    props: args,
    template: `<ui-time-picker [hours]="hours" [minutes]="minutes" [maxHours]="maxHours" [label]="label" [showNow]="showNow" [disabled]="disabled" />`,
  }),
};

export default meta;
type Story = StoryObj<TimePickerComponent>;

export const TimeOfDay: Story = {
  args: { hours: 8, minutes: 0, maxHours: 23, label: 'Heure de départ', showNow: true, disabled: false },
};

export const Duration: Story = {
  args: { hours: 10, minutes: 30, maxHours: 99, label: 'Chrono cible', showNow: false, disabled: false },
};

export const Disabled: Story = {
  args: { hours: 8, minutes: 0, maxHours: 23, label: 'Heure de départ', showNow: false, disabled: true },
};
