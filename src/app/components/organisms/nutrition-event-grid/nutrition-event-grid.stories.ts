import type { Meta, StoryObj } from '@storybook/angular';
import type { NutritionEvent } from '../../../core/models';
import { createDefaultGoals } from '../../../core/utils/nutrition-goals.util';
import { NutritionEventGridComponent } from './nutrition-event-grid.component';

const events: NutritionEvent[] = [
  { id: 'e1', name: 'Trail des Templiers', date: '2026-10-25', location: 'Millau', distance: 76, elevationGain: 3600, elevationLoss: 3600, targetTimeMinutes: 600, goals: createDefaultGoals(), items: [{ productId: 'p1', quantity: 6 }] },
  { id: 'e2', name: 'Marathon de Paris', date: '2026-04-12', location: 'Paris', distance: 42, elevationGain: 120, targetTimeMinutes: 210, goals: createDefaultGoals(), items: [{ productId: 'p2', quantity: 4 }] },
];

const meta: Meta<NutritionEventGridComponent> = {
  title: 'Organisms/NutritionEventGrid',
  component: NutritionEventGridComponent,
  tags: ['autodocs'],
  argTypes: {
    select: { action: 'select' },
    edit: { action: 'edit' },
    delete: { action: 'delete' },
  },
  render: (args) => ({
    props: args,
    template: `<ui-nutrition-event-grid
      [events]="events"
      (select)="select($event)"
      (edit)="edit($event)"
      (delete)="delete($event)"
    />`,
  }),
};

export default meta;
type Story = StoryObj<NutritionEventGridComponent>;

export const Default: Story = {
  args: { events },
};
