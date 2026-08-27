import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/landing.page').then((m) => m.LandingPage),
    title: 'Runorama — Planifiez votre nutrition sportive',
    canActivate: [guestGuard],
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/auth/login.page').then((m) => m.LoginPage),
    title: 'Connexion — Runorama',
  },
  {
    path: 'register',
    loadComponent: () => import('./pages/auth/register.page').then((m) => m.RegisterPage),
    title: 'Inscription — Runorama',
  },
  {
    path: 'registration-success',
    loadComponent: () =>
      import('./pages/auth/registration-success.page').then((m) => m.RegistrationSuccessPage),
    title: 'Inscription confirmée — Runorama',
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./pages/auth/forgot-password.page').then((m) => m.ForgotPasswordPage),
    title: 'Mot de passe oublié — Runorama',
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./pages/auth/reset-password.page').then((m) => m.ResetPasswordPage),
    title: 'Réinitialiser le mot de passe — Runorama',
  },
  {
    path: 'verify-email',
    loadComponent: () =>
      import('./pages/auth/verify-email.page').then((m) => m.VerifyEmailPage),
    title: 'Confirmation de l’adresse e-mail — Runorama',
  },
  {
    path: 'profile',
    loadComponent: () => import('./pages/profile/profile.page').then((m) => m.ProfilePage),
    title: 'Mon profil — Runorama',
    canActivate: [authGuard],
  },
  {
    path: 'nutrition',
    loadComponent: () =>
      import('./pages/nutrition/nutrition-layout.page').then((m) => m.NutritionLayoutPage),
    title: 'Nutrition — Runorama',
    canActivate: [authGuard],
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
    path: '404',
    loadComponent: () => import('./pages/not-found.page').then((m) => m.NotFoundPage),
    title: 'Page introuvable — Runorama',
  },
  {
    path: '**',
    redirectTo: '404',
  },
];
