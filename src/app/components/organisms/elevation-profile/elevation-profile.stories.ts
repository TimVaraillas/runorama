import type { Meta, StoryObj } from '@storybook/angular';
import type { GpxTrack, RoutePointMarker } from '../../../core/models';
import { ElevationProfileComponent } from './elevation-profile.component';

const track: GpxTrack = { id: 'track-1', eventId: 'event-1', fileName: 'alpes.gpx', distance: 12, elevationGain: 420, elevationLoss: 380, minAltitude: 800, maxAltitude: 1220, pointCount: 3, bbox: { minLat: 45, minLon: 6, maxLat: 45.1, maxLon: 6.1 }, points: [{ lat: 45, lon: 6, ele: 800, distance: 0, elevationGain: 0, elevationLoss: 0 }, { lat: 45.05, lon: 6.05, ele: 1220, distance: 6, elevationGain: 420, elevationLoss: 0 }, { lat: 45.1, lon: 6.1, ele: 840, distance: 12, elevationGain: 420, elevationLoss: 380 }] };
const markers: RoutePointMarker[] = [{ id: 'aid-1', name: 'Ravitaillement', kind: 'AID_STATION', distanceFromStart: 6, altitude: 1220 }];
const meta: Meta<ElevationProfileComponent> = { title: 'Organisms/ElevationProfile', component: ElevationProfileComponent, tags: ['autodocs'], argTypes: { select: { action: 'select' }, addAt: { action: 'addAt' } } };
export default meta;
type Story = StoryObj<ElevationProfileComponent>;
export const Default: Story = { args: { track, markers, addMode: false } };
export const AddMode: Story = { args: { track, markers, addMode: true } };
