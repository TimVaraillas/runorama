import type { Meta, StoryObj } from '@storybook/angular';
import type { LogisticItem } from '../../../core/models';
import { LogisticItemListComponent } from './logistic-item-list.component';

const meta: Meta<LogisticItemListComponent> = {
  title: 'Molecules/LogisticItemList',
  component: LogisticItemListComponent,
  tags: ['autodocs'],
  argTypes: { itemsChange: { action: 'itemsChange' } },
};

export default meta;
type Story = StoryObj<LogisticItemListComponent>;
export const Empty: Story = { args: { items: [] as LogisticItem[], title: 'À récupérer', emptyLabel: 'Aucun élément' } };
