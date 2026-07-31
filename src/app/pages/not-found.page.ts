import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Page 404 affichée lorsque l'URL demandée ne correspond à aucune route connue.
 *
 * Elle informe l'utilisateur que la page est introuvable et lui propose de
 * revenir à l'accueil de l'application.
 */
@Component({
  selector: 'app-not-found-page',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4">
      <div class="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div
          class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="2"
            stroke="currentColor"
            class="h-6 w-6"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
            />
          </svg>
        </div>

        <h1 class="mt-4 text-2xl font-bold text-slate-900">Page introuvable</h1>
        <p class="mt-2 text-sm text-slate-500">
          Désolé, la page que vous recherchez n'existe pas ou a été déplacée.
        </p>

        <div class="mt-6">
          <a
            routerLink="/"
            class="inline-flex w-full items-center justify-center rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Retour à l'accueil
          </a>
        </div>
      </div>
    </div>
  `,
})
export class NotFoundPage {}
