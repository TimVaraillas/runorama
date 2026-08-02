import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { BadgeComponent, type BadgeTone } from '../badge/badge.component';
import type { ProductModerationStatus } from '../../../core/models/nutrition.model';

interface StatusMeta {
  label: string;
  tone: BadgeTone;
}

const STATUS_META: Record<ProductModerationStatus, StatusMeta> = {
  pending: { label: 'En attente', tone: 'warning' },
  approved: { label: 'Validé', tone: 'success' },
  rejected: { label: 'Refusé', tone: 'danger' },
  archived: { label: 'Archivé', tone: 'neutral' },
};

/**
 * Atom : badge de statut de modération d'un produit communautaire.
 *
 * N'affiche rien pour un produit validé sauf si `showApproved` est vrai (vue
 * administrateur), afin de ne pas surcharger le catalogue public.
 */
@Component({
  selector: 'ui-product-status-badge',
  standalone: true,
  imports: [BadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (meta(); as m) {
      <ui-badge [tone]="m.tone">{{ m.label }}</ui-badge>
    }
  `,
})
export class ProductStatusBadgeComponent {
  /** Statut de modération du produit. */
  readonly status = input<ProductModerationStatus | undefined>(undefined);
  /** Affiche aussi le badge « Validé » (vue administrateur). */
  readonly showApproved = input(false);

  protected readonly meta = computed<StatusMeta | null>(() => {
    const status = this.status();
    if (!status) return null;
    if (status === 'approved' && !this.showApproved()) return null;
    return STATUS_META[status];
  });
}
