import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs';
import { HeaderComponent } from '../../organisms/header/header.component';
import { ToasterComponent } from '../../organisms/toaster/toaster.component';

/**
 * Template : mise en page principale de l'application.
 * Assemble l'organisme Header et la zone de contenu routé.
 *
 * Les routes marquées `data.fullWidth` occupent toute la largeur disponible
 * (affichage tableau de bord) ; les autres restent centrées et contraintes.
 */
@Component({
  selector: 'ui-main-layout',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, ToasterComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex min-h-screen flex-col">
      <ui-header />
      <main
        [class]="
          fullWidth()
            ? 'flex w-full flex-1 flex-col'
            : 'mx-auto w-full max-w-6xl flex-1 px-4 py-6'
        "
      >
        <router-outlet />
      </main>
      <footer class="border-t bg-slate-50 border-slate-200 py-6 text-center text-sm text-slate-400">
        Runorama — Planifiez votre nutrition sportive.
      </footer>
    </div>
    <ui-toaster />
  `,
})
export class MainLayoutComponent {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  /** `true` lorsque la route active demande un affichage pleine largeur. */
  protected readonly fullWidth = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.isFullWidth()),
      startWith(this.isFullWidth()),
    ),
    { initialValue: false },
  );

  private isFullWidth(): boolean {
    let route = this.route;
    while (route.firstChild) route = route.firstChild;
    return route.snapshot.data['fullWidth'] === true;
  }
}
