import type { Meta, StoryObj } from '@storybook/angular';
import type { RaceStrategy } from '../../../core/models';
import { createDefaultGoals } from '../../../core/utils/nutrition-goals.util';
import { InventoryLocationsComponent } from './inventory-locations.component';

const event: RaceStrategy = { id: 'race-1', name: 'Ultra des Alpes', date: '2026-08-15', goals: createDefaultGoals(), items: [], aidStations: [] };
const meta: Meta<InventoryLocationsComponent> = { title: 'Organisms/InventoryLocations', component: InventoryLocationsComponent, tags: ['autodocs'], argTypes: { allocationChange: { action: 'allocationChange' }, addProduct: { action: 'addProduct' } } };
export default meta;
type Story = StoryObj<InventoryLocationsComponent>;
export const Empty: Story = { args: { event, products: [], canAdd: true } };
