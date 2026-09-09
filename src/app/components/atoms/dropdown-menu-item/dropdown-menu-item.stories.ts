import type { Meta, StoryObj } from '@storybook/angular';
import { faPen, faTrash } from '@fortawesome/free-solid-svg-icons';
import { DropdownMenuItemComponent } from './dropdown-menu-item.component';

const meta: Meta<DropdownMenuItemComponent> = {
  title: 'Atoms/DropdownMenuItem',
  component: DropdownMenuItemComponent,
  tags: ['autodocs'],
  argTypes: { color: { control: 'select', options: ['default', 'danger'] }, selected: { action: 'selected' } },
};

export default meta;
type Story = StoryObj<DropdownMenuItemComponent>;

export const Edit: Story = { args: { icon: faPen, color: 'default' }, render: (args) => ({ props: args, template: '<ui-dropdown-menu-item [icon]="icon" [color]="color" (selected)="selected($event)">Modifier</ui-dropdown-menu-item>' }) };
export const Delete: Story = { args: { icon: faTrash, color: 'danger' }, render: (args) => ({ props: args, template: '<ui-dropdown-menu-item [icon]="icon" [color]="color" (selected)="selected($event)">Supprimer</ui-dropdown-menu-item>' }) };
