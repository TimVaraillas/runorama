import type { Meta, StoryObj } from '@storybook/angular';
import { NutritionEventFormPanelComponent } from './nutrition-event-form-panel.component';

const meta: Meta<NutritionEventFormPanelComponent> = { title: 'Organisms/NutritionEventFormPanel', component: NutritionEventFormPanelComponent, tags: ['autodocs'], argTypes: { save: { action: 'save' }, close: { action: 'close' } } };
export default meta;
type Story = StoryObj<NutritionEventFormPanelComponent>;
export const Open: Story = { args: { open: true, event: null } };
