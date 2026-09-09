import type { Meta, StoryObj } from '@storybook/angular';
import { RatingInputComponent } from './rating-input.component';

const meta: Meta<RatingInputComponent> = {
  title: 'Atoms/RatingInput',
  component: RatingInputComponent,
  tags: ['autodocs'],
  argTypes: { size: { control: 'select', options: ['sm', 'md', 'lg'] } },
};

export default meta;
type Story = StoryObj<RatingInputComponent>;

export const Default: Story = { args: { label: 'Note', showValue: true, size: 'md' } };
export const Large: Story = { args: { label: 'Évaluation', showValue: false, size: 'lg' } };
