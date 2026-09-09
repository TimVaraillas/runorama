import type { Meta, StoryObj } from '@storybook/angular';
import { ConfirmDeleteModalComponent } from './confirm-delete-modal.component';

const meta: Meta<ConfirmDeleteModalComponent> = {
  title: 'Molecules/ConfirmDeleteModal',
  component: ConfirmDeleteModalComponent,
  tags: ['autodocs'],
  argTypes: { confirm: { action: 'confirm' }, cancel: { action: 'cancel' } },
};

export default meta;
type Story = StoryObj<ConfirmDeleteModalComponent>;

export const Open: Story = { args: { open: true, itemName: 'Trail des Templiers', entityLabel: 'la stratégie' } };
export const Deleting: Story = { args: { open: true, itemName: 'Trail des Templiers', deleting: true } };
