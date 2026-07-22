import type { Meta, StoryObj } from '@storybook/angular';
import { PageHeaderComponent } from './page-header.component';

const meta: Meta<PageHeaderComponent> = {
  title: 'Molecules/PageHeader',
  component: PageHeaderComponent,
  tags: ['autodocs'],
  argTypes: {
    title: { control: 'text' },
    subtitle: { control: 'text' },
  },
  render: (args) => ({
    props: args,
    template: `<ui-page-header [title]="title" [subtitle]="subtitle">
      <button actions class="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white">
        Nouvel élément
      </button>
    </ui-page-header>`,
  }),
};

export default meta;
type Story = StoryObj<PageHeaderComponent>;

export const Default: Story = {
  args: { title: 'Produits', subtitle: 'Gérez votre catalogue nutritionnel' },
};

export const WithoutSubtitle: Story = {
  args: { title: 'Séances' },
};
