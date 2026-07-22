import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';
import { SearchInputComponent } from '../../atoms/search-input/search-input.component';
import { ViewToggleComponent } from '../../atoms/view-toggle/view-toggle.component';
import { FilterBarComponent } from './filter-bar.component';

const meta: Meta<FilterBarComponent> = {
  title: 'Molecules/FilterBar',
  component: FilterBarComponent,
  tags: ['autodocs'],
  decorators: [
    moduleMetadata({ imports: [SearchInputComponent, ViewToggleComponent] }),
  ],
};

export default meta;
type Story = StoryObj<FilterBarComponent>;

export const Default: Story = {
  render: () => ({
    template: `
      <ui-filter-bar>
        <ui-search-input placeholder="Rechercher un produit…" />
        <ui-view-toggle mode="table" />
      </ui-filter-bar>
    `,
  }),
};
