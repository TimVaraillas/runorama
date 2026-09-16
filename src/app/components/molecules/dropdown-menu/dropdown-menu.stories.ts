import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular';
import { DropdownMenuItemComponent } from '../../atoms/dropdown-menu-item/dropdown-menu-item.component';
import { DropdownMenuComponent } from './dropdown-menu.component';

const meta: Meta<DropdownMenuComponent> = {
  title: 'Molecules/DropdownMenu',
  component: DropdownMenuComponent,
  tags: ['autodocs'],
  decorators: [moduleMetadata({ imports: [DropdownMenuItemComponent] })],
  render: () => ({ template: `<ui-dropdown-menu><button trigger class="rounded-md border px-3 py-2 text-sm">Actions</button><ui-dropdown-menu-item>Modifier</ui-dropdown-menu-item><ui-dropdown-menu-item color="danger">Supprimer</ui-dropdown-menu-item></ui-dropdown-menu>` }),
};

export default meta;
type Story = StoryObj<DropdownMenuComponent>;
export const Default: Story = {};
