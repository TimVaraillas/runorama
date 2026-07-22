import type { Meta, StoryObj } from '@storybook/angular';
import type { NutritionProduct } from '../../../core/models';
import { InventoryItemComponent, type ResolvedInventoryItem } from './inventory-item.component';

const product: NutritionProduct = {
  id: 'p1',
  categoryId: 'c1',
  brand: 'SIS',
  name: 'GO Isotonic Gel',
  unitWeight: 60,
  energy: 87,
  carbs: 22,
  fats: 0,
  proteins: 0,
  salt: 10,
};

const item: ResolvedInventoryItem = { productId: 'p1', quantity: 4, product };

const meta: Meta<InventoryItemComponent> = {
  title: 'Molecules/InventoryItem',
  component: InventoryItemComponent,
  tags: ['autodocs'],
  argTypes: {
    quantityChange: { action: 'quantityChange' },
    remove: { action: 'remove' },
  },
  render: (args) => ({
    props: args,
    template: `<div class="max-w-2xl">
      <ui-inventory-item
        [item]="item"
        (quantityChange)="quantityChange($event)"
        (remove)="remove()"
      />
    </div>`,
  }),
};

export default meta;
type Story = StoryObj<InventoryItemComponent>;

export const Default: Story = {
  args: { item },
};
