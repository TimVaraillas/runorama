import type { Meta, StoryObj } from '@storybook/angular';
import { RouteProfilePanelComponent } from './route-profile-panel.component';

const meta: Meta<RouteProfilePanelComponent> = { title: 'Organisms/RouteProfilePanel', component: RouteProfilePanelComponent, tags: ['autodocs'], argTypes: { gpxSelected: { action: 'gpxSelected' }, removeTrack: { action: 'removeTrack' }, selectAidStation: { action: 'selectAidStation' }, addPoint: { action: 'addPoint' }, moveAidStation: { action: 'moveAidStation' }, fileError: { action: 'fileError' } } };
export default meta;
type Story = StoryObj<RouteProfilePanelComponent>;
export const Empty: Story = { args: { track: null, aidStations: [], waypoints: [], loading: false, uploading: false } };
