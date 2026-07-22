import type { Meta, StoryObj } from '@storybook/angular';
import { DateRangeFilterComponent } from './date-range-filter.component';

const meta: Meta<DateRangeFilterComponent> = {
  title: 'Atoms/DateRangeFilter',
  component: DateRangeFilterComponent,
  tags: ['autodocs'],
  argTypes: {
    from: { control: 'text' },
    to: { control: 'text' },
    fromAriaLabel: { control: 'text' },
    toAriaLabel: { control: 'text' },
  },
  render: (args) => ({
    props: args,
    template: `<ui-date-range-filter
      [from]="from"
      [to]="to"
      [fromAriaLabel]="fromAriaLabel"
      [toAriaLabel]="toAriaLabel"
    />`,
  }),
};

export default meta;
type Story = StoryObj<DateRangeFilterComponent>;

export const Empty: Story = {
  args: { from: '', to: '' },
};

export const WithRange: Story = {
  args: { from: '2026-01-01', to: '2026-03-31' },
};
