import type { Meta, StoryObj } from '@storybook/angular';
import type { NutritionEvent, NutritionProduct } from '../../../core/models';
import { createDefaultGoals } from '../../../core/utils/nutrition-goals.util';
import { ConsumptionPlanComponent } from './consumption-plan.component';

const products: NutritionProduct[] = [
  { id: 'p1', categoryId: 'c1', brand: 'Maurten', name: 'Gel 100', unitWeight: 40, energy: 100, carbs: 25, fats: 0, proteins: 0, sodium: 22 },
  { id: 'p2', categoryId: 'c2', brand: 'Clif', name: 'Bar Chocolate', unitWeight: 68, energy: 260, carbs: 44, fats: 6, proteins: 9, sodium: 150 },
];

const event: NutritionEvent = {
  id: 'e1',
  name: 'Trail des Templiers',
  date: '2026-10-25',
  location: 'Millau',
  distance: 76,
  targetTimeMinutes: 120,
  goals: createDefaultGoals(),
  planSequenceMinutes: 10,
  items: [
    { productId: 'p1', quantity: 6 },
    { productId: 'p2', quantity: 3 },
  ],
  intakes: [
    { id: 'i1', productId: 'p1', startMinute: 20, durationMinutes: 10, quantity: 1 },
    { id: 'i2', productId: 'p2', startMinute: 60, durationMinutes: 20, quantity: 1 },
  ],
};

const meta: Meta<ConsumptionPlanComponent> = {
  title: 'Organisms/ConsumptionPlan',
  component: ConsumptionPlanComponent,
  tags: ['autodocs'],
  argTypes: {
    intakesChange: { action: 'intakesChange' },
    planSequenceChange: { action: 'planSequenceChange' },
  },
  render: (args) => ({
    props: args,
    template: `<div class="h-175">
      <ui-consumption-plan
        [event]="event"
        [products]="products"
        (intakesChange)="intakesChange($event)"
        (planSequenceChange)="planSequenceChange($event)"
      />
    </div>`,
  }),
};

export default meta;
type Story = StoryObj<ConsumptionPlanComponent>;

export const Default: Story = {
  args: { event, products },
};
