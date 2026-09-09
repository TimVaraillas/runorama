import type { Meta, StoryObj } from '@storybook/angular';
import type { AidConsumption, NutritionProduct, RaceStrategyItem } from '../../../core/models';
import { AidConsumptionListComponent } from './aid-consumption-list.component';

const meta: Meta<AidConsumptionListComponent> = {
  title: 'Molecules/AidConsumptionList',
  component: AidConsumptionListComponent,
  tags: ['autodocs'],
  argTypes: { consumptionsChange: { action: 'consumptionsChange' } },
};

export default meta;
type Story = StoryObj<AidConsumptionListComponent>;

export const Empty: Story = { args: { consumptions: [] as AidConsumption[], products: [] as NutritionProduct[], inventoryItems: [] as RaceStrategyItem[] } };
