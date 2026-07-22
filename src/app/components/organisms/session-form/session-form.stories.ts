import type { Meta, StoryObj } from '@storybook/angular';
import type { Session } from '../../../core/models';
import { SessionFormComponent } from './session-form.component';

const session: Session = {
  id: 's1',
  name: 'Séance seuil 3×2 km',
  description: 'Travail au seuil anaérobie.',
  blocks: [
    {
      name: 'Corps de séance',
      repeat: 3,
      exercises: [{ distance: 2000, instruction: 'Au seuil' }],
    },
  ],
};

const meta: Meta<SessionFormComponent> = {
  title: 'Organisms/SessionForm',
  component: SessionFormComponent,
  tags: ['autodocs'],
  argTypes: {
    save: { action: 'save' },
    cancel: { action: 'cancel' },
  },
  render: (args) => ({
    props: args,
    template: `<div class="max-w-3xl">
      <ui-session-form
        [session]="session"
        (save)="save($event)"
        (cancel)="cancel()"
      />
    </div>`,
  }),
};

export default meta;
type Story = StoryObj<SessionFormComponent>;

export const Create: Story = {
  args: { session: null },
};

export const Edit: Story = {
  args: { session },
};
