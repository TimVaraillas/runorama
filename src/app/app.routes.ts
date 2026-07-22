import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'nutrition',
    pathMatch: 'full',
  },
  // NOTE : la partie sportive (séances d'entraînement) est temporairement masquée
  // car elle n'est pas encore fonctionnelle. Restaurer ces routes pour la réactiver.
  // {
  //   path: 'sessions',
  //   loadComponent: () =>
  //     import('./pages/sessions/sessions.page').then((m) => m.SessionsPage),
  //   title: 'Séances — Runorama',
  // },
  // {
  //   path: 'sessions/new',
  //   loadComponent: () =>
  //     import('./pages/session-form/session-form.page').then((m) => m.SessionFormPage),
  //   title: 'Nouvelle séance — Runorama',
  // },
  {
    path: 'nutrition',
    loadComponent: () =>
      import('./pages/nutrition/nutrition-layout.page').then((m) => m.NutritionLayoutPage),
    title: 'Nutrition — Runorama',
    children: [
      { path: '', redirectTo: 'products', pathMatch: 'full' },
      {
        path: 'products',
        loadComponent: () =>
          import('./pages/nutrition/products/nutrition-products.page').then(
            (m) => m.NutritionProductsPage,
          ),
        title: 'Produits — Runorama',
      },
      {
        path: 'strategies',
        loadComponent: () =>
          import('./pages/nutrition/strategies/nutrition-strategies.page').then(
            (m) => m.NutritionStrategiesPage,
          ),
        title: 'Stratégies alimentaires — Runorama',
      },
      {
        path: 'strategies/:id',
        loadComponent: () =>
          import('./pages/nutrition/strategies/nutrition-strategy-inventory.page').then(
            (m) => m.NutritionStrategyInventoryPage,
          ),
        title: 'Inventaire — Runorama',
      },
    ],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
