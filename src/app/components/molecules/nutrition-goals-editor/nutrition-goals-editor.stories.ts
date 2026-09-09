import type { Meta, StoryObj } from '@storybook/angular';
import { createDefaultGoals } from '../../../core/utils/nutrition-goals.util';
import { NutritionGoalsEditorComponent } from './nutrition-goals-editor.component';

const meta: Meta<NutritionGoalsEditorComponent> = { title: 'Molecules/NutritionGoalsEditor', component: NutritionGoalsEditorComponent, tags: ['autodocs'] };
export default meta;
type Story = StoryObj<NutritionGoalsEditorComponent>;
export const Default: Story = { args: { goals: createDefaultGoals() } };
