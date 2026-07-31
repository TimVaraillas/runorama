import type { Meta, StoryObj } from '@storybook/angular';
import type { NutritionProduct } from '../../../core/models';
import { PlanPaletteItemComponent } from './plan-palette-item.component';

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

const meta: Meta<PlanPaletteItemComponent> = {
  title: 'Molecules/PlanPaletteItem',
  component: PlanPaletteItemComponent,
  tags: ['autodocs'],
  argTypes: {
    carried: { control: 'number' },
    remaining: { control: 'number' },
  },
  render: (args) => ({
    props: args,
    template: `<div class="max-w-xs">
      <ui-plan-palette-item [product]="product" [carried]="carried" [remaining]="remaining" />
    </div>`,
  }),
};

export default meta;
type Story = StoryObj<PlanPaletteItemComponent>;

export const Remaining: Story = {
  args: { product, carried: 6, remaining: 4 },
};

export const AllPlaced: Story = {
  args: { product, carried: 6, remaining: 0 },
};
