import type { Meta, StoryObj } from '@storybook/angular';
import type { AidStation } from '../../../core/models';
import { AidStationTableComponent } from './aid-station-table.component';

const stations: AidStation[] = [];
const meta: Meta<AidStationTableComponent> = { title: 'Organisms/AidStationTable', component: AidStationTableComponent, tags: ['autodocs'], argTypes: { select: { action: 'select' }, edit: { action: 'edit' }, delete: { action: 'delete' } } };
export default meta;
type Story = StoryObj<AidStationTableComponent>;
export const Empty: Story = { args: { stations } };
