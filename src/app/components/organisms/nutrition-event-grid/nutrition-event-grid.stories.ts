import type { Meta, StoryObj } from '@storybook/angular';
import { NutritionEventGridComponent } from './nutrition-event-grid.component';

const meta: Meta<NutritionEventGridComponent> = { title: 'Organisms/NutritionEventGrid', component: NutritionEventGridComponent, tags: ['autodocs'], argTypes: { select: { action: 'select' }, edit: { action: 'edit' }, delete: { action: 'delete' } } };
export default meta;
type Story = StoryObj<NutritionEventGridComponent>;
export const Empty: Story = { args: { events: [] } };
