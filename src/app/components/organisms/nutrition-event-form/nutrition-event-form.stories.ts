import type { Meta, StoryObj } from '@storybook/angular';
import type { NutritionEvent } from '../../../core/models';
import { NutritionEventFormComponent } from './nutrition-event-form.component';

const event: NutritionEvent = {
  id: 'e1',
  name: 'Trail des Templiers',
  description: 'Objectif : finir en moins de 10h.',
  date: '2026-10-25',
  location: 'Millau',
  distance: 76,
  elevationGain: 3600,
  elevationLoss: 3600,
  targetTimeMinutes: 600,
  hourlyEnergy: 250,
  hourlyCarbs: 60,
  items: [],
};

const meta: Meta<NutritionEventFormComponent> = {
  title: 'Organisms/NutritionEventForm',
  component: NutritionEventFormComponent,
  tags: ['autodocs'],
  argTypes: {
    save: { action: 'save' },
    cancel: { action: 'cancel' },
  },
  render: (args) => ({
    props: args,
    template: `<div class="max-w-2xl">
      <ui-nutrition-event-form
        [event]="event"
        (save)="save($event)"
        (cancel)="cancel()"
      />
    </div>`,
  }),
};

export default meta;
type Story = StoryObj<NutritionEventFormComponent>;

export const Create: Story = {
  args: { event: null },
};

export const Edit: Story = {
  args: { event },
};
