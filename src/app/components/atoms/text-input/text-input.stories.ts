import type { Meta, StoryObj } from '@storybook/angular';
import { TextInputComponent } from './text-input.component';

const meta: Meta<TextInputComponent> = {
  title: 'Atoms/TextInput',
  component: TextInputComponent,
  tags: ['autodocs'],
  argTypes: {
    type: { control: 'select', options: ['text', 'email', 'password', 'number', 'tel', 'url'] },
  },
};

export default meta;
type Story = StoryObj<TextInputComponent>;

export const Default: Story = {
  args: { label: 'Nom du parcours', placeholder: 'Ultra des Alpes' },
};

export const Email: Story = {
  args: { label: 'Adresse e-mail', type: 'email', placeholder: 'coureur@example.com' },
};
