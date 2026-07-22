import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig, moduleMetadata } from '@storybook/angular';
import { provideRouter, RouterModule } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HeaderComponent } from './header.component';

const meta: Meta<HeaderComponent> = {
  title: 'Organisms/Header',
  component: HeaderComponent,
  tags: ['autodocs'],
  decorators: [
    moduleMetadata({ imports: [RouterModule] }),
    applicationConfig({ providers: [provideRouter([]), provideHttpClient()] }),
  ],
};

export default meta;
type Story = StoryObj<HeaderComponent>;

export const Default: Story = {};
