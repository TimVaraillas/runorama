import type { Meta, StoryObj } from '@storybook/angular';
import { NutritionEventFormComponent } from './nutrition-event-form.component';

const meta: Meta<NutritionEventFormComponent> = { title: 'Organisms/NutritionEventForm', component: NutritionEventFormComponent, tags: ['autodocs'], argTypes: { save: { action: 'save' }, cancel: { action: 'cancel' } } };
export default meta;
type Story = StoryObj<NutritionEventFormComponent>;
export const NewEvent: Story = { args: { event: null } };
