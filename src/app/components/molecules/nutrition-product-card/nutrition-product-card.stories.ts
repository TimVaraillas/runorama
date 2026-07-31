import type { Meta, StoryObj } from '@storybook/angular';
import type { NutritionProduct } from '../../../core/models';
import { NutritionProductCardComponent } from './nutrition-product-card.component';

const sampleProduct: NutritionProduct = {
  id: 'p1',
  categoryId: 'c1',
  brand: 'Maurten',
  name: 'Gel 100',
  unitWeight: 40,
  energy: 100,
  carbs: 25,
  fats: 0,
  proteins: 0,
  sodium: 22,
};

const meta: Meta<NutritionProductCardComponent> = {
  title: 'Molecules/NutritionProductCard',
  component: NutritionProductCardComponent,
  tags: ['autodocs'],
  argTypes: {
    edit: { action: 'edit' },
    delete: { action: 'delete' },
  },
  render: (args) => ({
    props: args,
    template: `<div class="max-w-xs">
      <ui-nutrition-product-card
        [product]="product"
        [categoryLabel]="categoryLabel"
        (edit)="edit($event)"
        (delete)="delete($event)"
      />
    </div>`,
  }),
};

export default meta;
type Story = StoryObj<NutritionProductCardComponent>;

export const Default: Story = {
  args: { product: sampleProduct, categoryLabel: 'Gels' },
};

export const WithoutCategory: Story = {
  args: { product: sampleProduct, categoryLabel: '' },
};
