import type { Meta, StoryObj } from '@storybook/angular';
import { FilterableSelectComponent, type FilterableSelectOption } from './filterable-select.component';

const options: FilterableSelectOption[] = [
  { value: 'gel', label: 'Gel énergétique' },
  { value: 'drink', label: 'Boisson isotonique' },
  { value: 'bar', label: 'Barre céréales' },
];

const meta: Meta<FilterableSelectComponent> = {
  title: 'Atoms/FilterableSelect',
  component: FilterableSelectComponent,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<FilterableSelectComponent>;

export const Default: Story = { args: { options, placeholder: 'Choisir un produit' } };
export const Selected: Story = { args: { options, value: 'drink', placeholder: 'Choisir un produit' } };
