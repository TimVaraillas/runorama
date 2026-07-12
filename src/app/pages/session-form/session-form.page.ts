import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { SessionService } from '../../features/sessions/services/session.service';
import { ToastService } from '../../core/services/toast.service';
import { IconComponent } from '../../components/atoms/icon/icon.component';
import { SessionFormComponent } from '../../components/organisms/session-form/session-form.component';
import type { Session } from '../../core/models';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';

/**
 * Page : création d'une nouvelle séance.
 */
@Component({
  selector: 'app-session-form-page',
  standalone: true,
  imports: [RouterLink, IconComponent, SessionFormComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="mx-auto max-w-3xl space-y-6">
      <div class="space-y-2">
        <a
          routerLink="/sessions"
          class="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-brand-600"
        >
          <ui-icon [icon]="faArrowLeft" size="sm" />
          Retour aux séances
        </a>
        <h1 class="font-display text-2xl font-bold text-slate-900">Nouvelle séance</h1>
        <p class="text-slate-500">Composez votre séance en blocs et exercices.</p>
      </div>

      <ui-session-form (save)="onSave($event)" (cancel)="onCancel()" />
    </section>
  `,
})
export class SessionFormPage {
  private readonly service = inject(SessionService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly faArrowLeft = faArrowLeft;

  protected readonly saving = signal(false);

  onSave(payload: Partial<Session>): void {
    this.saving.set(true);
    this.service.create(payload).subscribe({
      next: () => this.router.navigate(['/sessions']),
      error: () => {
        this.toast.error("Impossible d'enregistrer la séance. Veuillez réessayer.");
        this.saving.set(false);
      },
    });
  }

  onCancel(): void {
    this.router.navigate(['/sessions']);
  }
}
