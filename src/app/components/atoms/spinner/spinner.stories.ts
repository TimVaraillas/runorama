import type { Meta, StoryObj } from '@storybook/angular';
import { SpinnerComponent } from './spinner.component';

const meta: Meta<SpinnerComponent> = {
  title: 'Atoms/Spinner',
  component: SpinnerComponent,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<SpinnerComponent>;

export const Default: Story = { args: { size: 24, thickness: 3, label: 'Chargement' } };
export const Large: Story = { args: { size: 40, thickness: 4, label: 'Import en cours' } };
