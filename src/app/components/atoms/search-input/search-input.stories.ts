import type { Meta, StoryObj } from '@storybook/angular';
import { SearchInputComponent } from './search-input.component';

const meta: Meta<SearchInputComponent> = {
  title: 'Atoms/SearchInput',
  component: SearchInputComponent,
  tags: ['autodocs'],
  argTypes: {
    value: { control: 'text' },
    placeholder: { control: 'text' },
    ariaLabel: { control: 'text' },
  },
  render: (args) => ({
    props: args,
    template: `<div class="max-w-sm">
      <ui-search-input
        [value]="value"
        [placeholder]="placeholder"
        [ariaLabel]="ariaLabel"
      />
    </div>`,
  }),
};

export default meta;
type Story = StoryObj<SearchInputComponent>;

export const Empty: Story = {
  args: { value: '', placeholder: 'Rechercher un produit…' },
};

export const WithValue: Story = {
  args: { value: 'Gel énergétique', placeholder: 'Rechercher un produit…' },
};
