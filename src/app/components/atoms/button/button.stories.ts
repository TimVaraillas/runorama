import type { Meta, StoryObj } from '@storybook/angular';
import { faDownload, faPlus } from '@fortawesome/free-solid-svg-icons';
import { ButtonComponent } from './button.component';

const meta: Meta<ButtonComponent> = {
  title: 'Atoms/Button',
  component: ButtonComponent,
  tags: ['autodocs'],
  argTypes: {
    color: {
      control: 'select',
      options: ['primary', 'secondary', 'default', 'info', 'warning', 'danger'],
    },
    variant: {
      control: 'inline-radio',
      options: ['full', 'outlined', 'ghost'],
    },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    iconPosition: { control: 'inline-radio', options: ['left', 'right'] },
    disabled: { control: 'boolean' },
  },
  render: (args) => ({
    props: args,
    template: `<ui-button
      [color]="color"
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
  args: { color: 'primary', variant: 'full', size: 'md' },
};

export const Secondary: Story = {
  args: { color: 'secondary', variant: 'full', size: 'md' },
};

export const Outlined: Story = {
  args: { color: 'primary', variant: 'outlined', size: 'md' },
};

export const Ghost: Story = {
  args: { color: 'default', variant: 'ghost', size: 'md' },
};

export const Info: Story = {
  args: { color: 'info', variant: 'full', size: 'md' },
};

export const Warning: Story = {
  args: { color: 'warning', variant: 'full', size: 'md' },
};

export const Danger: Story = {
  args: { color: 'danger', variant: 'full', size: 'md' },
};

export const WithIcon: Story = {
  args: { color: 'primary', variant: 'full', icon: faPlus },
};

export const IconRight: Story = {
  args: { color: 'secondary', variant: 'outlined', icon: faDownload, iconPosition: 'right' },
};

export const Disabled: Story = {
  args: { color: 'primary', variant: 'full', disabled: true },
};
