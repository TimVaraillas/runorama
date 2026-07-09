import type { Meta, StoryObj } from '@storybook/angular';
import { faRoute, faStopwatch } from '@fortawesome/free-solid-svg-icons';
import { StatCardComponent } from './stat-card.component';

const meta: Meta<StatCardComponent> = {
  title: 'Molecules/StatCard',
  component: StatCardComponent,
  tags: ['autodocs'],
  render: (args) => ({
    props: args,
    template: `<div class="max-w-xs">
      <ui-stat-card [label]="label" [value]="value" [icon]="icon" />
    </div>`,
  }),
};

export default meta;
type Story = StoryObj<StatCardComponent>;

export const Distance: Story = {
  args: { label: 'Volume hebdo', value: '42 km', icon: faRoute },
};

export const Duration: Story = {
  args: { label: 'Temps prévu', value: '3h20', icon: faStopwatch },
};
