import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { IconComponent } from '../../atoms/icon/icon.component';
import { faAppleWhole, faGripVertical } from '@fortawesome/free-solid-svg-icons';
import type { NutritionProduct } from '../../../core/models';

/**
 * Molecule : vignette d'un produit dans la palette du plan de consommation.
 *
 * Affiche le produit et le reste d'unités à placer sur le parcours. Purement
 * présentationnel : le glisser-déposer est géré par le composant parent.
 */
@Component({
  selector: 'ui-plan-palette-item',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <div
      [class]="containerClass()"
      [attr.aria-disabled]="remaining() <= 0"
    >
      <ui-icon [icon]="faGripVertical" class="text-slate-300" />
      <div
        class="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-lg bg-white text-slate-300"
      >
        @if (product().image) {
          <img [src]="product().image" [alt]="product().name" class="h-full w-full object-cover" />
        } @else {
          <ui-icon [icon]="faAppleWhole" />
        }
      </div>
      <div class="min-w-0 flex-1">
        <p class="truncate text-sm font-medium text-slate-800">{{ product().name }}</p>
        <p class="truncate text-xs text-slate-400">{{ product().brand }}</p>
      </div>
      <span [class]="badgeClass()">{{ remaining() }}/{{ carried() }}</span>
    </div>
  `,
})
export class PlanPaletteItemComponent {
  /** Produit représenté. */
  readonly product = input.required<NutritionProduct>();
  /** Nombre d'unités emportées (inventaire). */
  readonly carried = input.required<number>();
  /** Nombre d'unités restant à placer sur le parcours. */
  readonly remaining = input.required<number>();

  protected readonly faAppleWhole = faAppleWhole;
  protected readonly faGripVertical = faGripVertical;

  protected readonly containerClass = computed(() => {
    const base = 'flex items-center gap-2.5 rounded-xl px-2.5 py-2 transition-colors';
    return this.remaining() > 0
      ? `${base} bg-slate-50 cursor-grab hover:bg-brand-50 active:cursor-grabbing`
      : `${base} opacity-50`;
  });

  protected readonly badgeClass = computed(() => {
    const base = 'shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold';
    return this.remaining() > 0
      ? `${base} bg-brand-50 text-brand-600`
      : `${base} bg-emerald-50 text-emerald-600`;
  });
}
