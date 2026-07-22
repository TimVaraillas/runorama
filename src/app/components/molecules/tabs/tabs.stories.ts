import type { Meta, StoryObj } from '@storybook/angular';
import { faListUl, faBorderAll, faChartLine } from '@fortawesome/free-solid-svg-icons';
import { TabsComponent } from './tabs.component';

const meta: Meta<TabsComponent> = {
  title: 'Molecules/Tabs',
  component: TabsComponent,
  tags: ['autodocs'],
  render: (args) => ({
    props: args,
    template: `<ui-tabs [tabs]="tabs" [active]="active" />`,
  }),
};

export default meta;
type Story = StoryObj<TabsComponent>;

export const Default: Story = {
  args: {
    active: 'products',
    tabs: [
      { id: 'products', label: 'Produits', icon: faBorderAll },
      { id: 'events', label: 'Stratégies', icon: faListUl },
      { id: 'stats', label: 'Statistiques', icon: faChartLine },
    ],
  },
};

export const WithoutIcons: Story = {
  args: {
    active: 'events',
    tabs: [
      { id: 'products', label: 'Produits' },
      { id: 'events', label: 'Stratégies' },
    ],
  },
};
