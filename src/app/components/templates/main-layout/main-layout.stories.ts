import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig, moduleMetadata } from '@storybook/angular';
import { Component } from '@angular/core';
import { provideRouter, RouterModule } from '@angular/router';
import { MainLayoutComponent } from './main-layout.component';

/** Contenu de démonstration affiché dans le router-outlet. */
@Component({
  selector: 'ui-main-layout-demo-page',
  standalone: true,
  template: `
    <div class="rounded-xl border border-slate-200 bg-white p-8">
      <h1 class="font-display text-2xl font-bold text-slate-900">Contenu de la page</h1>
      <p class="mt-2 text-sm text-slate-500">
        Cette zone est rendue par le <code>router-outlet</code> de la mise en page.
      </p>
    </div>
  `,
})
class DemoPageComponent {}

const meta: Meta<MainLayoutComponent> = {
  title: 'Templates/MainLayout',
  component: MainLayoutComponent,
  tags: ['autodocs'],
  decorators: [
    moduleMetadata({ imports: [RouterModule] }),
    applicationConfig({
      providers: [provideRouter([{ path: '**', component: DemoPageComponent }])],
    }),
  ],
};

export default meta;
type Story = StoryObj<MainLayoutComponent>;

export const Default: Story = {};
