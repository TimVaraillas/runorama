import type { Meta, StoryObj } from '@storybook/angular';
import type { NutritionCategory, NutritionProduct } from '../../../core/models';
import { NutritionProductTableComponent } from './nutrition-product-table.component';

const categories: NutritionCategory[] = [
  { id: 'c1', name: 'Gels' },
  { id: 'c2', name: 'Barres' },
];

const products: NutritionProduct[] = [
  { id: 'p1', categoryId: 'c1', brand: 'Maurten', name: 'Gel 100', unitWeight: 40, energy: 100, carbs: 25, fats: 0, proteins: 0, salt: 22 },
  { id: 'p2', categoryId: 'c2', brand: 'Clif', name: 'Bar Chocolate', unitWeight: 68, energy: 260, carbs: 44, fats: 6, proteins: 9, salt: 150 },
  { id: 'p3', categoryId: 'c1', brand: 'SIS', name: 'GO Isotonic', unitWeight: 60, energy: 87, carbs: 22, fats: 0, proteins: 0, salt: 10 },
];

const meta: Meta<NutritionProductTableComponent> = {
  title: 'Organisms/NutritionProductTable',
  component: NutritionProductTableComponent,
  tags: ['autodocs'],
  argTypes: {
    mode: { control: 'inline-radio', options: ['manage', 'picker'] },
    edit: { action: 'edit' },
    delete: { action: 'delete' },
    toggleSelect: { action: 'toggleSelect' },
  },
  render: (args) => ({
    props: args,
    template: `<ui-nutrition-product-table
      [products]="products"
      [categories]="categories"
      [mode]="mode"
      [selectedIds]="selectedIds"
      (edit)="edit($event)"
      (delete)="delete($event)"
      (toggleSelect)="toggleSelect($event)"
    />`,
  }),
};

export default meta;
type Story = StoryObj<NutritionProductTableComponent>;

export const Manage: Story = {
  args: { products, categories, mode: 'manage' },
};

export const Picker: Story = {
  args: { products, categories, mode: 'picker', selectedIds: new Set(['p1']) },
};
