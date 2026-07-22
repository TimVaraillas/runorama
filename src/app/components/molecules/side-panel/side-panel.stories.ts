import type { Meta, StoryObj } from '@storybook/angular';
import { SidePanelComponent } from './side-panel.component';

const meta: Meta<SidePanelComponent> = {
  title: 'Molecules/SidePanel',
  component: SidePanelComponent,
  tags: ['autodocs'],
  argTypes: {
    open: { control: 'boolean' },
    size: { control: 'inline-radio', options: ['xs', 'md', 'lg', 'xl'] },
    ariaLabel: { control: 'text' },
    close: { action: 'close' },
  },
  render: (args) => ({
    props: args,
    template: `<ui-side-panel
      [open]="open"
      [size]="size"
      [ariaLabel]="ariaLabel"
      (close)="close()"
    >
      <div class="p-6">
        <h2 class="font-display text-xl font-bold text-slate-900">Panneau latéral</h2>
        <p class="mt-2 text-sm text-slate-500">
          Contenu projeté du panneau. Cliquez sur le fond ou appuyez sur Échap pour fermer.
        </p>
      </div>
    </ui-side-panel>`,
  }),
};

export default meta;
type Story = StoryObj<SidePanelComponent>;

export const Open: Story = {
  args: { open: true, size: 'md', ariaLabel: 'Panneau de démonstration' },
};
