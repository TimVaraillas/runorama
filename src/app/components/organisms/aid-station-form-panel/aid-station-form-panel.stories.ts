import type { Meta, StoryObj } from '@storybook/angular';
import { AidStationFormPanelComponent } from './aid-station-form-panel.component';

const meta: Meta<AidStationFormPanelComponent> = { title: 'Organisms/AidStationFormPanel', component: AidStationFormPanelComponent, tags: ['autodocs'], argTypes: { save: { action: 'save' }, close: { action: 'close' } } };
export default meta;
type Story = StoryObj<AidStationFormPanelComponent>;
export const Open: Story = { args: { open: true, station: null, products: [], inventoryItems: [], pickupElsewhere: {} } };
