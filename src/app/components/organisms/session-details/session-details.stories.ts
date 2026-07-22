import type { Meta, StoryObj } from '@storybook/angular';
import type { Session } from '../../../core/models';
import { SessionDetailsComponent } from './session-details.component';

const session: Session = {
  id: 's1',
  name: 'Séance seuil 3×2 km',
  description: 'Travail au seuil anaérobie avec récupération active.',
  blocks: [
    {
      name: 'Échauffement',
      repeat: 1,
      exercises: [{ duration: 1200, instruction: 'Footing progressif', target: { intensity: 'Endurance', pulse: [120, 140] } }],
    },
    {
      name: 'Corps de séance',
      description: 'Récupération 2 min entre les répétitions.',
      repeat: 3,
      exercises: [
        { distance: 2000, instruction: 'Au seuil', target: { intensity: 'Seuil', pace: [15, 16], pulse: 165, zone: 4 } },
        { duration: 120, instruction: 'Récupération', target: { intensity: 'Récupération' } },
      ],
    },
    {
      name: 'Retour au calme',
      repeat: 1,
      exercises: [{ duration: 600, instruction: 'Footing lent' }],
    },
  ],
};

const meta: Meta<SessionDetailsComponent> = {
  title: 'Organisms/SessionDetails',
  component: SessionDetailsComponent,
  tags: ['autodocs'],
  argTypes: {
    close: { action: 'close' },
  },
  render: (args) => ({
    props: args,
    template: `<div class="h-150 max-w-2xl overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
      <ui-session-details [session]="session" (close)="close()" />
    </div>`,
  }),
};

export default meta;
type Story = StoryObj<SessionDetailsComponent>;

export const Default: Story = {
  args: { session },
};
