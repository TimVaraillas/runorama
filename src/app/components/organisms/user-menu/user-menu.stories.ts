import { applicationConfig } from '@storybook/angular';
import type { Meta, StoryObj } from '@storybook/angular';
import { of } from 'rxjs';
import { Router } from '@angular/router';
import { AuthService } from '../../../features/auth/services/auth.service';
import { UserMenuComponent } from './user-menu.component';

const meta: Meta<UserMenuComponent> = { title: 'Organisms/UserMenu', component: UserMenuComponent, tags: ['autodocs'], decorators: [applicationConfig({ providers: [{ provide: AuthService, useValue: { currentUser: () => null, logout: () => of(null) } }, { provide: Router, useValue: { navigate: () => Promise.resolve(true) } }] })] };
export default meta;
type Story = StoryObj<UserMenuComponent>;
export const SignedOut: Story = {};
