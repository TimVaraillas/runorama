import type { Meta, StoryObj } from '@storybook/angular';
import { AvatarComponent } from './avatar.component';

const meta: Meta<AvatarComponent> = {
  title: 'Atoms/Avatar',
  component: AvatarComponent,
  tags: ['autodocs'],
  argTypes: { size: { control: 'select', options: ['sm', 'md', 'lg'] } },
};

export default meta;
type Story = StoryObj<AvatarComponent>;

export const Default: Story = { args: { initials: 'AR', size: 'md' } };
export const Large: Story = { args: { initials: 'JD', size: 'lg' } };
