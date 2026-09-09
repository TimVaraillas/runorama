import type { Meta, StoryObj } from '@storybook/angular';
import type { User } from '../../../core/models';
import { UserBadgeComponent } from './user-badge.component';

const user: User = { id: 'u1', email: 'alex@example.com', firstName: 'Alex', lastName: 'Runner', role: 'user' };
const meta: Meta<UserBadgeComponent> = { title: 'Molecules/UserBadge', component: UserBadgeComponent, tags: ['autodocs'] };
export default meta;
type Story = StoryObj<UserBadgeComponent>;
export const Default: Story = { args: { user } };
