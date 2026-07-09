import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { StatCardComponent } from '../../components/molecules/stat-card/stat-card.component';
import { ButtonComponent } from '../../components/atoms/button/button.component';
import {
  faDumbbell,
  faCalendarCheck,
  faStopwatch,
  faRoute,
  faPlus,
} from '@fortawesome/free-solid-svg-icons';

/**
 * Page : tableau de bord.
 * Vue d'ensemble de l'activité d'entraînement.
 */
@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [RouterLink, StatCardComponent, ButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="space-y-8">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 class="font-display text-2xl font-bold text-slate-900">Tableau de bord</h1>
          <p class="text-slate-500">Suivez et planifiez votre entraînement de course à pied.</p>
        </div>
        <a routerLink="/sessions">
          <ui-button [icon]="faPlus">Nouvelle séance</ui-button>
        </a>
      </div>

      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ui-stat-card label="Séances créées" value="0" [icon]="faDumbbell" />
        <ui-stat-card label="Séances planifiées" value="0" [icon]="faCalendarCheck" />
        <ui-stat-card label="Volume hebdo" value="0 km" [icon]="faRoute" />
        <ui-stat-card label="Temps prévu" value="0h00" [icon]="faStopwatch" />
      </div>

      <div class="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
        <p class="text-slate-500">
          Commencez par créer une séance, puis planifiez-la sur votre calendrier.
        </p>
      </div>
    </section>
  `,
})
export class DashboardPage {
  readonly faDumbbell = faDumbbell;
  readonly faCalendarCheck = faCalendarCheck;
  readonly faStopwatch = faStopwatch;
  readonly faRoute = faRoute;
  readonly faPlus = faPlus;
}
