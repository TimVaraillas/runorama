import type { Meta, StoryObj } from '@storybook/angular';
import { faBolt, faHeart, faPersonRunning } from '@fortawesome/free-solid-svg-icons';
import { IconComponent } from './icon.component';

const meta: Meta<IconComponent> = {
  title: 'Atoms/Icon',
  component: IconComponent,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'select', options: ['xs', 'sm', 'md', 'lg', 'xl'] },
    fixedWidth: { control: 'boolean' },
  },
  render: (args) => ({
    props: args,
    template: `<ui-icon [icon]="icon" [size]="size" [fixedWidth]="fixedWidth" class="text-brand-600" />`,
  }),
};

export default meta;
type Story = StoryObj<IconComponent>;

export const Default: Story = {
  args: { icon: faPersonRunning, size: 'md' },
};

export const Large: Story = {
  args: { icon: faBolt, size: 'xl' },
};

export const AllSizes: Story = {
  render: () => ({
    props: { faHeart },
    template: `
      <div class="flex items-center gap-4 text-brand-600">
        <ui-icon [icon]="faHeart" size="xs" />
        <ui-icon [icon]="faHeart" size="sm" />
        <ui-icon [icon]="faHeart" size="md" />
        <ui-icon [icon]="faHeart" size="lg" />
        <ui-icon [icon]="faHeart" size="xl" />
      </div>
    `,
  }),
};
