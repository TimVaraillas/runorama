import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';
import { DividerComponent } from './divider.component';

const meta: Meta<DividerComponent> = {
  title: 'Atoms/Divider',
  component: DividerComponent,
  tags: ['autodocs'],
  decorators: [moduleMetadata({ imports: [DividerComponent] })],
  argTypes: {
    variant: {
      control: 'select',
      options: ['solid', 'dashed', 'dotted', 'gradient'],
    },
    label: { control: 'text' },
    spacing: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<DividerComponent>;

export const Solid: Story = { args: { variant: 'solid' } };
export const Dashed: Story = { args: { variant: 'dashed' } };
export const Dotted: Story = { args: { variant: 'dotted' } };
export const Gradient: Story = { args: { variant: 'gradient' } };
export const WithLabel: Story = { args: { variant: 'gradient', label: 'Produits emportés' } };

export const AllVariants: Story = {
  render: () => ({
    template: `
      <div class="max-w-xl rounded-xl border border-slate-200 bg-white p-6">
        <p class="text-sm text-slate-500">solid</p>
        <ui-divider variant="solid" />
        <p class="text-sm text-slate-500">dashed</p>
        <ui-divider variant="dashed" />
        <p class="text-sm text-slate-500">dotted</p>
        <ui-divider variant="dotted" />
        <p class="text-sm text-slate-500">gradient</p>
        <ui-divider variant="gradient" />
        <p class="text-sm text-slate-500">gradient + label</p>
        <ui-divider variant="gradient" label="Produits emportés" />
        <p class="text-sm text-slate-500">solid + label</p>
        <ui-divider variant="solid" label="Résumé" />
      </div>
    `,
  }),
};
