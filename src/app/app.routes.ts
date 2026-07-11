import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/dashboard/dashboard.page').then((m) => m.DashboardPage),
    title: 'Tableau de bord — Runorama',
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
    path: 'calendar',
    loadComponent: () =>
      import('./pages/calendar/calendar.page').then((m) => m.CalendarPage),
    title: 'Calendrier — Runorama',
  },
  {
    path: '**',
    redirectTo: '',
  },
];
