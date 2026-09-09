import type { Meta, StoryObj } from '@storybook/angular';
import { PasswordStrengthComponent } from './password-strength.component';

const meta: Meta<PasswordStrengthComponent> = { title: 'Molecules/PasswordStrength', component: PasswordStrengthComponent, tags: ['autodocs'] };
export default meta;
type Story = StoryObj<PasswordStrengthComponent>;
export const Strong: Story = { args: { value: 'TrailRun!2026' } };
export const Weak: Story = { args: { value: 'password' } };
