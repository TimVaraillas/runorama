import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from '../../organisms/header/header.component';
import { ToasterComponent } from '../../organisms/toaster/toaster.component';

/**
 * Template : mise en page principale de l'application.
 * Assemble l'organisme Header et la zone de contenu routé.
 */
@Component({
  selector: 'ui-main-layout',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, ToasterComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex min-h-screen flex-col">
      <ui-header />
      <main class="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <router-outlet />
      </main>
      <footer class="border-t border-slate-200 py-6 text-center text-sm text-slate-400">
        Runorama — Créez et planifiez vos séances de course à pied.
      </footer>
    </div>
    <ui-toaster />
  `,
})
export class MainLayoutComponent {}
