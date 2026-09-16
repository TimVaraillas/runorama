import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Template : disposition « tableau de bord » d'une page de détail.
 *
 * Trois zones projetées :
 * - `sidenav` : menu latéral, pleine hauteur à gauche ;
 * - `header` : en-tête (bandeau supérieur de la colonne de contenu) ;
 * - contenu principal : slot par défaut, sous l'en-tête.
 */
@Component({
  selector: 'ui-dashboard-layout',
  standalone: true,
  host: { class: 'flex flex-1 flex-col' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="flex flex-1 flex-col lg:flex-row lg:items-stretch">
      <ng-content select="[sidenav]" />
      <div class="flex min-w-0 flex-1 flex-col px-4 py-6 lg:px-6">
        <ng-content select="[header]" />
        <ng-content />
      </div>
    </section>
  `,
})
export class DashboardLayoutComponent {}
