import type { Meta, StoryObj } from '@storybook/angular';
import { ZoneChipComponent } from './zone-chip.component';

const meta: Meta<ZoneChipComponent> = {
  title: 'Atoms/ZoneChip',
  component: ZoneChipComponent,
  tags: ['autodocs'],
  argTypes: {
    zone: {
      control: 'select',
      options: ['recovery', 'easy', 'endurance', 'tempo', 'threshold', 'vo2', 'anaerobic'],
    },
  },
};

export default meta;
type Story = StoryObj<ZoneChipComponent>;

export const Easy: Story = { args: { zone: 'easy' } };
export const Tempo: Story = { args: { zone: 'tempo' } };
export const Threshold: Story = { args: { zone: 'threshold' } };
export const Vo2: Story = { args: { zone: 'vo2' } };

export const AllZones: Story = {
  render: () => ({
    template: `
      <div class="flex flex-wrap gap-2">
        <ui-zone-chip zone="recovery" />
        <ui-zone-chip zone="easy" />
        <ui-zone-chip zone="endurance" />
        <ui-zone-chip zone="tempo" />
        <ui-zone-chip zone="threshold" />
        <ui-zone-chip zone="vo2" />
        <ui-zone-chip zone="anaerobic" />
      </div>
    `,
  }),
};
