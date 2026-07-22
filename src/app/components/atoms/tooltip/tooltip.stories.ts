import type { Meta, StoryObj } from '@storybook/angular';
import { TooltipComponent } from './tooltip.component';

const meta: Meta<TooltipComponent> = {
  title: 'Atoms/Tooltip',
  component: TooltipComponent,
  tags: ['autodocs'],
  argTypes: {
    text: { control: 'text' },
    position: {
      control: 'inline-radio',
      options: ['top', 'right', 'bottom', 'left'],
    },
  },
  render: (args) => ({
    props: args,
    template: `<div class="flex items-center justify-center p-20">
      <ui-tooltip [text]="text" [position]="position">
        <button class="rounded-md bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700">
          Survolez-moi
        </button>
      </ui-tooltip>
    </div>`,
  }),
};

export default meta;
type Story = StoryObj<TooltipComponent>;

export const Top: Story = {
  args: { text: 'Info-bulle en haut', position: 'top' },
};

export const Right: Story = {
  args: { text: 'Info-bulle à droite', position: 'right' },
};

export const Bottom: Story = {
  args: { text: 'Info-bulle en bas', position: 'bottom' },
};

export const Left: Story = {
  args: { text: 'Info-bulle à gauche', position: 'left' },
};

export const LongText: Story = {
  args: {
    text: 'Une info-bulle avec un texte plus long qui illustre le comportement du wrapping.',
    position: 'top',
  },
};
