import type { Meta, StoryObj } from '@storybook/angular';
import { ViewToggleComponent } from './view-toggle.component';

const meta: Meta<ViewToggleComponent> = {
  title: 'Atoms/ViewToggle',
  component: ViewToggleComponent,
  tags: ['autodocs'],
  argTypes: {
    mode: { control: 'inline-radio', options: ['table', 'grid'] },
    modeChange: { action: 'modeChange' },
  },
  render: (args) => ({
    props: args,
    template: `<ui-view-toggle [mode]="mode" (modeChange)="modeChange($event)" />`,
  }),
};

export default meta;
type Story = StoryObj<ViewToggleComponent>;

export const TableSelected: Story = {
  args: { mode: 'table' },
};

export const GridSelected: Story = {
  args: { mode: 'grid' },
};
