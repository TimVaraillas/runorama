import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  faBookOpen,
  faChartLine,
  faPersonRunning,
  faRoute,
} from '@fortawesome/free-solid-svg-icons';
import { ButtonComponent } from '../components/atoms/button/button.component';
import { IconComponent } from '../components/atoms/icon/icon.component';

/** Un atout du produit mis en avant sur la page de garde. */
interface Feature {
  icon: typeof faBookOpen;
  title: string;
  description: string;
}

/**
 * Page de garde présentée aux visiteurs non connectés.
 *
 * Présente brièvement Runorama et invite à créer un compte ou à se connecter.
 */
@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [RouterLink, ButtonComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="mx-auto flex max-w-4xl flex-col items-center px-4 text-center pt-10 pb-18">
      <span
        class="inline-flex items-center gap-2 rounded-full bg-brand-50 px-4 py-1.5 text-sm font-semibold text-brand-600"
      >
        <ui-icon [icon]="faPersonRunning" />
        Nutrition sportive d'endurance
      </span>

      <h1 class="mt-6 font-display text-4xl font-bold text-slate-900 sm:text-6xl">
        Planifiez votre nutrition,<br />
        <span class="text-brand-600">course après course.</span>
      </h1>

      <p class="mt-6 max-w-2xl text-lg text-slate-600">
        Runorama vous aide à construire des stratégies alimentaires précises pour vos trails et
        ultras : catalogue de produits, plan horaire des apports et logistique des ravitaillements,
        le tout au même endroit.
      </p>

      <div class="mt-8 flex flex-col gap-3 sm:flex-row">
        <a routerLink="/register">
          <ui-button color="primary" size="lg">Créer un compte</ui-button>
        </a>
        <a routerLink="/login">
          <ui-button color="primary" variant="outlined" size="lg">Se connecter</ui-button>
        </a>
      </div>
    </section>

    <section class="mx-auto grid max-w-5xl gap-6 px-4 pb-20 sm:grid-cols-3">
      @for (feature of features; track feature.title) {
        <div class="rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm">
          <span
            class="grid h-12 w-12 place-items-center rounded-xl bg-secondary-50 text-secondary-500"
          >
            <ui-icon [icon]="feature.icon" size="xl" />
          </span>
          <h2 class="mt-4 font-display text-lg font-bold text-slate-900">{{ feature.title }}</h2>
          <p class="mt-2 text-sm text-slate-600">{{ feature.description }}</p>
        </div>
      }
    </section>
  `,
})
export class LandingPage {
  protected readonly faPersonRunning = faPersonRunning;

  protected readonly features: Feature[] = [
    {
      icon: faBookOpen,
      title: 'Catalogue de produits',
      description:
        'Constituez votre bibliothèque de gels, barres et boissons avec leurs valeurs nutritionnelles.',
    },
    {
      icon: faChartLine,
      title: 'Plan horaire des apports',
      description:
        'Répartissez glucides, sodium et hydratation heure par heure et suivez vos cibles.',
    },
    {
      icon: faRoute,
      title: 'Logistique des ravitaillements',
      description:
        "Organisez sacs de départ, assistances et drop bags pour ne rien oublier le jour J.",
    },
  ];
}
