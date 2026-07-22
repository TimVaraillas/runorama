import type { Meta, StoryObj } from '@storybook/angular';
import type { NutritionCategory, NutritionEvent, NutritionProduct } from '../../../core/models';
import { NutritionStrategyInventoryComponent } from './nutrition-strategy-inventory.component';

const categories: NutritionCategory[] = [
  { id: 'c1', name: 'Gels' },
  { id: 'c2', name: 'Barres' },
];

const products: NutritionProduct[] = [
  { id: 'p1', categoryId: 'c1', brand: 'Maurten', name: 'Gel 100', unitWeight: 40, energy: 100, carbs: 25, fats: 0, proteins: 0, salt: 22 },
  { id: 'p2', categoryId: 'c2', brand: 'Clif', name: 'Bar Chocolate', unitWeight: 68, energy: 260, carbs: 44, fats: 6, proteins: 9, salt: 150 },
  { id: 'p3', categoryId: 'c1', brand: 'SIS', name: 'GO Isotonic', unitWeight: 60, energy: 87, carbs: 22, fats: 0, proteins: 0, salt: 10 },
];

const event: NutritionEvent = {
  id: 'e1',
  name: 'Trail des Templiers',
  date: '2026-10-25',
  distance: 76,
  targetTimeMinutes: 600,
  hourlyEnergy: 250,
  hourlyCarbs: 60,
  items: [
    { productId: 'p1', quantity: 6 },
    { productId: 'p2', quantity: 3 },
  ],
};

const meta: Meta<NutritionStrategyInventoryComponent> = {
  title: 'Organisms/NutritionStrategyInventory',
  component: NutritionStrategyInventoryComponent,
  tags: ['autodocs'],
  argTypes: {
    applySelection: { action: 'applySelection' },
    setQuantity: { action: 'setQuantity' },
    remove: { action: 'remove' },
  },
  render: (args) => ({
    props: args,
    template: `<div class="max-w-4xl">
      <ui-nutrition-strategy-inventory
        [event]="event"
        [products]="products"
        [categories]="categories"
        (applySelection)="applySelection($event)"
        (setQuantity)="setQuantity($event)"
        (remove)="remove($event)"
      />
    </div>`,
  }),
};

export default meta;
type Story = StoryObj<NutritionStrategyInventoryComponent>;

export const Default: Story = {
  args: { event, products, categories },
};
