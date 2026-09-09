import type { Meta, StoryObj } from '@storybook/angular';
import type { GpxTrack } from '../../../core/models';
import { TrackMapComponent } from './track-map.component';

const track: GpxTrack = { id: 'track-1', eventId: 'event-1', fileName: 'alpes.gpx', distance: 12, elevationGain: 420, elevationLoss: 380, minAltitude: 800, maxAltitude: 1220, pointCount: 3, bbox: { minLat: 45, minLon: 6, maxLat: 45.1, maxLon: 6.1 }, points: [{ lat: 45, lon: 6, ele: 800, distance: 0, elevationGain: 0, elevationLoss: 0 }, { lat: 45.05, lon: 6.05, ele: 1220, distance: 6, elevationGain: 420, elevationLoss: 0 }, { lat: 45.1, lon: 6.1, ele: 840, distance: 12, elevationGain: 420, elevationLoss: 380 }] };
const meta: Meta<TrackMapComponent> = { title: 'Organisms/TrackMap', component: TrackMapComponent, tags: ['autodocs'], argTypes: { select: { action: 'select' }, addAt: { action: 'addAt' }, moveMarker: { action: 'moveMarker' } } };
export default meta;
type Story = StoryObj<TrackMapComponent>;
export const Default: Story = { args: { track, markers: [], addMode: false } };
