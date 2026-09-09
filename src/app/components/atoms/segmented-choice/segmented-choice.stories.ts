import type { Meta, StoryObj } from '@storybook/angular';
import { SegmentedChoiceComponent, type SegmentedOption } from './segmented-choice.component';

const options: SegmentedOption[] = [
  { value: 'training', label: 'Entraînement' },
  { value: 'race', label: 'Course' },
  { value: 'recovery', label: 'Récupération' },
];

const meta: Meta<SegmentedChoiceComponent> = {
  title: 'Atoms/SegmentedChoice',
  component: SegmentedChoiceComponent,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<SegmentedChoiceComponent>;

export const Default: Story = { args: { options, ariaLabel: 'Type de séance' } };
export const Selected: Story = { args: { options, ariaLabel: 'Type de séance' }, render: (args) => ({ props: args, template: '<ui-segmented-choice [options]="options" ariaLabel="Type de séance" />' }) };
