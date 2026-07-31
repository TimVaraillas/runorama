import type { Meta, StoryObj } from '@storybook/angular';
import type { NutritionCategory, NutritionProduct } from '../../../core/models';
import { NutritionProductFormComponent } from './nutrition-product-form.component';

const categories: NutritionCategory[] = [
  { id: 'c1', name: 'Gels' },
  { id: 'c2', name: 'Barres' },
];

const product: NutritionProduct = {
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

const meta: Meta<NutritionProductFormComponent> = {
  title: 'Organisms/NutritionProductForm',
  component: NutritionProductFormComponent,
  tags: ['autodocs'],
  argTypes: {
    save: { action: 'save' },
    cancel: { action: 'cancel' },
  },
  render: (args) => ({
    props: args,
    template: `<div class="max-w-2xl">
      <ui-nutrition-product-form
        [product]="product"
        [categories]="categories"
        (save)="save($event)"
        (cancel)="cancel()"
      />
    </div>`,
  }),
};

export default meta;
type Story = StoryObj<NutritionProductFormComponent>;

export const Create: Story = {
  args: { product: null, categories },
};

export const Edit: Story = {
  args: { product, categories },
};
