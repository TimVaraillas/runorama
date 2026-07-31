import type { Meta, StoryObj } from '@storybook/angular';
import type { NutritionCategory, NutritionProduct } from '../../../core/models';
import { NutritionProductGridComponent } from './nutrition-product-grid.component';

const categories: NutritionCategory[] = [
  { id: 'c1', name: 'Gels' },
  { id: 'c2', name: 'Barres' },
];

const products: NutritionProduct[] = [
  { id: 'p1', categoryId: 'c1', brand: 'Maurten', name: 'Gel 100', unitWeight: 40, energy: 100, carbs: 25, fats: 0, proteins: 0, sodium: 22 },
  { id: 'p2', categoryId: 'c2', brand: 'Clif', name: 'Bar Chocolate', unitWeight: 68, energy: 260, carbs: 44, fats: 6, proteins: 9, sodium: 150 },
  { id: 'p3', categoryId: 'c1', brand: 'SIS', name: 'GO Isotonic', unitWeight: 60, energy: 87, carbs: 22, fats: 0, proteins: 0, sodium: 10 },
];

const meta: Meta<NutritionProductGridComponent> = {
  title: 'Organisms/NutritionProductGrid',
  component: NutritionProductGridComponent,
  tags: ['autodocs'],
  argTypes: {
    edit: { action: 'edit' },
    delete: { action: 'delete' },
  },
  render: (args) => ({
    props: args,
    template: `<ui-nutrition-product-grid
      [products]="products"
      [categories]="categories"
      (edit)="edit($event)"
      (delete)="delete($event)"
    />`,
  }),
};

export default meta;
type Story = StoryObj<NutritionProductGridComponent>;

export const Default: Story = {
  args: { products, categories },
};
