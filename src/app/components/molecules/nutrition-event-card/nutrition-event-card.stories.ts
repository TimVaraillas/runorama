import type { Meta, StoryObj } from '@storybook/angular';
import type { RaceStrategy } from '../../../core/models';
import { createDefaultGoals } from '../../../core/utils/nutrition-goals.util';
import { NutritionEventCardComponent } from './nutrition-event-card.component';

const event: RaceStrategy = { id: 'race-1', name: 'Trail des Templiers', date: '2026-10-25', location: 'Millau', category: 'race', distance: 76, elevationGain: 3600, elevationLoss: 3600, targetTimeMinutes: 600, goals: createDefaultGoals(), items: [{ productId: 'gel-1', quantity: 6 }] };

const meta: Meta<NutritionEventCardComponent> = { title: 'Molecules/NutritionEventCard', component: NutritionEventCardComponent, tags: ['autodocs'], argTypes: { select: { action: 'select' }, edit: { action: 'edit' }, delete: { action: 'delete' } } };
export default meta;
type Story = StoryObj<NutritionEventCardComponent>;
export const Default: Story = { args: { event, selected: false } };
export const Selected: Story = { args: { event, selected: true } };
