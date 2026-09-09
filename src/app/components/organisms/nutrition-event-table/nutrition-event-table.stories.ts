import type { Meta, StoryObj } from '@storybook/angular';
import { NutritionEventTableComponent } from './nutrition-event-table.component';

const meta: Meta<NutritionEventTableComponent> = { title: 'Organisms/NutritionEventTable', component: NutritionEventTableComponent, tags: ['autodocs'], argTypes: { select: { action: 'select' }, edit: { action: 'edit' }, delete: { action: 'delete' } } };
export default meta;
type Story = StoryObj<NutritionEventTableComponent>;
export const Empty: Story = { args: { events: [], showOwner: false } };
