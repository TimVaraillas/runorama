import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/dashboard/dashboard.page').then((m) => m.DashboardPage),
    title: 'Tableau de bord — Runorama',
  },
  {
    path: 'workouts',
    loadComponent: () =>
      import('./pages/workouts/workouts.page').then((m) => m.WorkoutsPage),
    title: 'Séances — Runorama',
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
