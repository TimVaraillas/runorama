import type { Meta, StoryObj } from '@storybook/angular';
import { WaypointFormPanelComponent } from './waypoint-form-panel.component';

const meta: Meta<WaypointFormPanelComponent> = { title: 'Organisms/WaypointFormPanel', component: WaypointFormPanelComponent, tags: ['autodocs'], argTypes: { save: { action: 'save' }, delete: { action: 'delete' }, close: { action: 'close' } } };
export default meta;
type Story = StoryObj<WaypointFormPanelComponent>;
export const Open: Story = { args: { open: true, waypoint: null } };
