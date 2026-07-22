import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService } from '../../../core/services/toast.service';
import { ToasterComponent } from './toaster.component';

/** Composant de démonstration : déclenche des toasts de chaque type. */
@Component({
  selector: 'ui-toaster-demo',
  standalone: true,
  imports: [ToasterComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-wrap gap-2">
      <button class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white" (click)="toast.success('Séance enregistrée', { title: 'Succès' })">Succès</button>
      <button class="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white" (click)="toast.error('Une erreur est survenue', { title: 'Erreur' })">Erreur</button>
      <button class="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white" (click)="toast.info('Synchronisation en cours')">Info</button>
      <button class="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white" (click)="toast.warning('Chrono cible manquant')">Attention</button>
    </div>
    <ui-toaster />
  `,
})
class ToasterDemoComponent {
  protected readonly toast = inject(ToastService);
}

const meta: Meta<ToasterDemoComponent> = {
  title: 'Organisms/Toaster',
  component: ToasterDemoComponent,
  tags: ['autodocs'],
  decorators: [moduleMetadata({ imports: [ToasterComponent] })],
};

export default meta;
type Story = StoryObj<ToasterDemoComponent>;

export const Default: Story = {};
