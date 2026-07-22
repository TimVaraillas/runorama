import type { Meta, StoryObj } from '@storybook/angular';
import type { NutritionProduct } from '../../../core/models';
import type { ResolvedInventoryItem } from '../../molecules/inventory-item/inventory-item.component';
import { InventoryItemListComponent } from './inventory-item-list.component';

const p1: NutritionProduct = { id: 'p1', categoryId: 'c1', brand: 'Maurten', name: 'Gel 100', unitWeight: 40, energy: 100, carbs: 25, fats: 0, proteins: 0, salt: 22 };
const p2: NutritionProduct = { id: 'p2', categoryId: 'c2', brand: 'Clif', name: 'Bar Chocolate', unitWeight: 68, energy: 260, carbs: 44, fats: 6, proteins: 9, salt: 150 };

const items: ResolvedInventoryItem[] = [
  { productId: 'p1', quantity: 6, product: p1 },
  { productId: 'p2', quantity: 3, product: p2 },
];

const meta: Meta<InventoryItemListComponent> = {
  title: 'Organisms/InventoryItemList',
  component: InventoryItemListComponent,
  tags: ['autodocs'],
  argTypes: {
    setQuantity: { action: 'setQuantity' },
    remove: { action: 'remove' },
  },
  render: (args) => ({
    props: args,
    template: `<div class="max-w-2xl">
      <ui-inventory-item-list
        [items]="items"
        (setQuantity)="setQuantity($event)"
        (remove)="remove($event)"
      />
    </div>`,
  }),
};

export default meta;
type Story = StoryObj<InventoryItemListComponent>;

export const WithItems: Story = {
  args: { items },
};

export const Empty: Story = {
  args: { items: [] },
};
