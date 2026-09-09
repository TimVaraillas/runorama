import type { Meta, StoryObj } from '@storybook/angular';
import type { GpxDiscrepancies } from '../../../core/models';
import { GpxReconciliationModalComponent } from './gpx-reconciliation-modal.component';

const discrepancies: GpxDiscrepancies = {
  distance: { gpx: 43.2, event: 42, deltaPct: 2.86 },
  elevationGain: { gpx: 2150, event: 2000, deltaPct: 7.5 },
  elevationLoss: null,
};

const meta: Meta<GpxReconciliationModalComponent> = {
  title: 'Molecules/GpxReconciliationModal',
  component: GpxReconciliationModalComponent,
  tags: ['autodocs'],
  argTypes: { confirm: { action: 'confirm' }, close: { action: 'close' } },
};

export default meta;
type Story = StoryObj<GpxReconciliationModalComponent>;
export const Open: Story = { args: { open: true, discrepancies } };
