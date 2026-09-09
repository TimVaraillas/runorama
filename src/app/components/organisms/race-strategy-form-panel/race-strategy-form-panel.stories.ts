import type { Meta, StoryObj } from '@storybook/angular';
import { RaceStrategyFormPanelComponent } from './race-strategy-form-panel.component';

const meta: Meta<RaceStrategyFormPanelComponent> = { title: 'Organisms/RaceStrategyFormPanel', component: RaceStrategyFormPanelComponent, tags: ['autodocs'], argTypes: { save: { action: 'save' }, close: { action: 'close' } } };
export default meta;
type Story = StoryObj<RaceStrategyFormPanelComponent>;
export const Open: Story = { args: { open: true, event: null } };
