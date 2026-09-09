import type { Meta, StoryObj } from '@storybook/angular';
import { AidStationFormComponent } from './aid-station-form.component';

const meta: Meta<AidStationFormComponent> = { title: 'Organisms/AidStationForm', component: AidStationFormComponent, tags: ['autodocs'], argTypes: { save: { action: 'save' }, cancel: { action: 'cancel' } } };
export default meta;
type Story = StoryObj<AidStationFormComponent>;
export const Empty: Story = { args: { station: null, products: [], inventoryItems: [], pickupElsewhere: {} } };
