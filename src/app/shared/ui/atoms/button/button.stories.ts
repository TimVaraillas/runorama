import type { Meta, StoryObj } from '@storybook/angular';
import { faDownload, faPlus } from '@fortawesome/free-solid-svg-icons';
import { ButtonComponent } from './button.component';

const meta: Meta<ButtonComponent> = {
  title: 'Atoms/Button',
  component: ButtonComponent,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'ghost', 'danger'],
    },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    iconPosition: { control: 'inline-radio', options: ['left', 'right'] },
    disabled: { control: 'boolean' },
  },
  render: (args) => ({
    props: args,
    template: `<ui-button
      [variant]="variant"
      [size]="size"
      [disabled]="disabled"
      [icon]="icon"
      [iconPosition]="iconPosition"
    >Démarrer</ui-button>`,
  }),
};

export default meta;
type Story = StoryObj<ButtonComponent>;

export const Primary: Story = {
  args: { variant: 'primary', size: 'md' },
};

export const Secondary: Story = {
  args: { variant: 'secondary', size: 'md' },
};

export const Ghost: Story = {
  args: { variant: 'ghost', size: 'md' },
};

export const Danger: Story = {
  args: { variant: 'danger', size: 'md' },
};

export const WithIcon: Story = {
  args: { variant: 'primary', icon: faPlus },
};

export const IconRight: Story = {
  args: { variant: 'secondary', icon: faDownload, iconPosition: 'right' },
};

export const Disabled: Story = {
  args: { variant: 'primary', disabled: true },
};
