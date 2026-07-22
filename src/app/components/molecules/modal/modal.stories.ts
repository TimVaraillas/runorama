import type { Meta, StoryObj } from '@storybook/angular';
import { ModalComponent } from './modal.component';

const meta: Meta<ModalComponent> = {
  title: 'Molecules/Modal',
  component: ModalComponent,
  tags: ['autodocs'],
  argTypes: {
    open: { control: 'boolean' },
    title: { control: 'text' },
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    dismissible: { control: 'boolean' },
    close: { action: 'close' },
  },
  render: (args) => ({
    props: args,
    template: `<ui-modal
      [open]="open"
      [title]="title"
      [size]="size"
      [dismissible]="dismissible"
      (close)="close()"
    >
      <p>Êtes-vous sûr de vouloir supprimer cet élément ? Cette action est irréversible.</p>
      <div modalFooter>
        <button class="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100" (click)="close()">Annuler</button>
        <button class="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white">Supprimer</button>
      </div>
    </ui-modal>`,
  }),
};

export default meta;
type Story = StoryObj<ModalComponent>;

export const Open: Story = {
  args: { open: true, title: 'Confirmer la suppression', size: 'sm', dismissible: true },
};

export const Large: Story = {
  args: { open: true, title: 'Détails', size: 'lg', dismissible: true },
};
