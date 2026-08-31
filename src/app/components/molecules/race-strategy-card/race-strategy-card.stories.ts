import type { Meta, StoryObj } from '@storybook/angular';
import type { NutritionEvent } from '../../../core/models';
import { createDefaultGoals } from '../../../core/utils/nutrition-goals.util';
import { RaceStrategyCardComponent } from './race-strategy-card.component';

const sampleEvent: NutritionEvent = {
  id: 'e1',
  name: 'Trail des Templiers',
  date: '2026-10-25',
  location: 'Millau',
  distance: 76,
  elevationGain: 3600,
  elevationLoss: 3600,
  targetTimeMinutes: 600,
  goals: createDefaultGoals(),
  items: [
    { productId: 'p1', quantity: 6 },
    { productId: 'p2', quantity: 3 },
  ],
};

const meta: Meta<RaceStrategyCardComponent> = {
  title: 'Molecules/NutritionEventCard',
  component: RaceStrategyCardComponent,
  tags: ['autodocs'],
  argTypes: {
    selected: { control: 'boolean' },
    select: { action: 'select' },
    edit: { action: 'edit' },
    delete: { action: 'delete' },
  },
  render: (args) => ({
    props: args,
    template: `<div class="max-w-sm">
      <ui-race-strategy-card
        [event]="event"
        [selected]="selected"
        (select)="select($event)"
        (edit)="edit($event)"
        (delete)="delete($event)"
      />
    </div>`,
  }),
};

export default meta;
type Story = StoryObj<RaceStrategyCardComponent>;

export const Default: Story = {
  args: { event: sampleEvent, selected: false },
};

export const Selected: Story = {
  args: { event: sampleEvent, selected: true },
};
