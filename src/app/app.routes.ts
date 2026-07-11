import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'sessions',
    pathMatch: 'full',
  },
  {
    path: 'sessions',
    loadComponent: () =>
      import('./pages/sessions/sessions.page').then((m) => m.SessionsPage),
    title: 'Séances — Runorama',
  },
  {
    path: 'sessions/new',
    loadComponent: () =>
      import('./pages/session-form/session-form.page').then((m) => m.SessionFormPage),
    title: 'Nouvelle séance — Runorama',
  },
  {
    path: 'nutrition',
    loadComponent: () =>
      import('./pages/nutrition/nutrition.page').then((m) => m.NutritionPage),
    title: 'Nutrition — Runorama',
  },
  {
    path: '**',
    redirectTo: '',
  },
];
