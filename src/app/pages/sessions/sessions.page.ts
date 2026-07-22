import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { SessionService } from '../../features/sessions/services/session.service';
import { ButtonComponent } from '../../components/atoms/button/button.component';
import { IconComponent } from '../../components/atoms/icon/icon.component';
import { PageHeaderComponent } from '../../components/molecules/page-header/page-header.component';
import { SidePanelComponent } from '../../components/molecules/side-panel/side-panel.component';
import { SessionDetailsComponent } from '../../components/organisms/session-details/session-details.component';
import type { Session } from '../../core/models';
import { faPlus, faChevronRight, faPersonRunning } from '@fortawesome/free-solid-svg-icons';

/**
 * Page : liste et gestion des séances.
 */
@Component({
  selector: 'app-sessions-page',
  standalone: true,
  imports: [ButtonComponent, IconComponent, PageHeaderComponent, SidePanelComponent, SessionDetailsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="space-y-6">
      <ui-page-header title="Mes séances" subtitle="Créez des séances structurées par blocs.">
        <ui-button actions [icon]="faPlus" (clicked)="newSession()">Nouvelle séance</ui-button>
      </ui-page-header>

      @if (sessions(); as list) {
        @if (list.length === 0) {
          <div
            class="flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center"
          >
            <div class="grid h-14 w-14 place-items-center rounded-full bg-brand-50 text-brand-600">
              <ui-icon [icon]="faPersonRunning" size="xl" />
            </div>
            <p class="text-slate-600">Aucune séance pour le moment.</p>
            <ui-button color="secondary" variant="outlined" [icon]="faPlus" (clicked)="newSession()">Créer ma première séance</ui-button>
          </div>
        } @else {
          <div class="grid gap-4 lg:grid-cols-1">
            @for (session of list; track session.id) {
              <button
                type="button"
                class="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-colors hover:border-brand-300 hover:bg-brand-50/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
                (click)="select(session)"
              >
                <div class="min-w-0 flex-1">
                  <h2 class="font-semibold text-slate-900">{{ session.name }}</h2>
                  @if (session.description) {
                    <p class="mt-1 text-sm text-slate-500">{{ session.description }}</p>
                  }
                </div>
                <ui-icon [icon]="faChevronRight" class="text-slate-300" />
              </button>
            }
          </div>
        }
      } @else {
        <p class="text-slate-400">Chargement des séances…</p>
      }
    </section>

    <!-- Panneau latéral de détail -->
    <ui-side-panel [open]="!!selected()" [ariaLabel]="selected()?.name" (close)="close()">
      @if (selected(); as session) {
        <ui-session-details [session]="session" (close)="close()" />
      }
    </ui-side-panel>
  `,
})
export class SessionsPage {
  private readonly service = inject(SessionService);
  private readonly router = inject(Router);

  readonly faPlus = faPlus;
  readonly faChevronRight = faChevronRight;
  readonly faPersonRunning = faPersonRunning;

  readonly sessions = toSignal(
    this.service.list().pipe(catchError(() => of([] as Session[]))),
    { initialValue: undefined },
  );

  /** Séance actuellement affichée dans le panneau latéral. */
  protected readonly selected = signal<Session | null>(null);

  select(session: Session): void {
    this.selected.set(session);
  }

  close(): void {
    this.selected.set(null);
  }

  newSession(): void {
    this.router.navigate(['/sessions/new']);
  }
}
