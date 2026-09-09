import type { Meta, StoryObj } from '@storybook/angular';
import { ProductStatusBadgeComponent } from './product-status-badge.component';

const meta: Meta<ProductStatusBadgeComponent> = {
  title: 'Atoms/ProductStatusBadge',
  component: ProductStatusBadgeComponent,
  tags: ['autodocs'],
  argTypes: {
    status: { control: 'select', options: ['pending', 'approved', 'rejected', 'archived'] },
  },
};

export default meta;
type Story = StoryObj<ProductStatusBadgeComponent>;

export const Pending: Story = { args: { status: 'pending' } };
export const ApprovedForAdmin: Story = { args: { status: 'approved', showApproved: true } };
export const Rejected: Story = { args: { status: 'rejected' } };
