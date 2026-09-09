import type { Meta, StoryObj } from '@storybook/angular';
import type { PositionedAidStation } from '../../../core/models';
import { PlanAidStationMarkerComponent } from './plan-aid-station-marker.component';

const marker: PositionedAidStation = { id: 'aid-1', name: 'Courmayeur', kind: 'AID_STATION', types: ['WATER_POINT', 'FOOD'], minute: 180, top: 160, distanceFromStart: 42.5, consumptionCount: 2 };
const meta: Meta<PlanAidStationMarkerComponent> = { title: 'Molecules/PlanAidStationMarker', component: PlanAidStationMarkerComponent, tags: ['autodocs'], argTypes: { select: { action: 'select' } } };
export default meta;
type Story = StoryObj<PlanAidStationMarkerComponent>;
export const Default: Story = { args: { marker } };
