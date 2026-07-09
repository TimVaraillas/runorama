import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IconComponent } from '../../atoms/icon/icon.component';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';

/**
 * Molecule : carte de statistique.
 * Combine une icône (atom), un label et une valeur pour les tableaux de bord.
 */
@Component({
  selector: 'ui-stat-card',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      @if (icon(); as ic) {
        <div class="grid h-11 w-11 place-items-center rounded-lg bg-brand-50 text-brand-600">
          <ui-icon [icon]="ic" size="lg" />
        </div>
      }
      <div class="min-w-0">
        <p class="truncate text-sm text-slate-500">{{ label() }}</p>
        <p class="text-xl font-semibold text-slate-900">{{ value() }}</p>
      </div>
    </div>
  `,
})
export class StatCardComponent {
  readonly label = input.required<string>();
  readonly value = input.required<string | number>();
  readonly icon = input<IconDefinition | null>(null);
}
