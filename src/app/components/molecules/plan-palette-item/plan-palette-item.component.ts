import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { IconComponent } from '../../atoms/icon/icon.component';
import { faAppleWhole, faGripVertical, faDroplet } from '@fortawesome/free-solid-svg-icons';
import type { NutritionProduct } from '../../../core/models';
import { isWaterProduct } from '../../../core/utils/water.util';

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
      <div [class]="iconWrapClass()">
        @if (product().image) {
          <img [src]="product().image" [alt]="product().name" class="h-full w-full object-cover" />
        } @else {
          <ui-icon [icon]="isWater() ? faDroplet : faAppleWhole" />
        }
      </div>
      <div class="min-w-0 flex-1">
        <p class="truncate text-sm font-medium text-slate-800">{{ product().name }}</p>
        <p class="truncate text-xs text-slate-400">
          {{ isWater() ? subtitle() : product().brand }}
        </p>
      </div>
      <span [class]="badgeClass()">
        @if (unlimited()) {
          &infin;
        } @else {
          {{ remaining() }}/{{ carried() }}
        }
      </span>
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
  /** Élément toujours disponible en quantité illimitée (eau). */
  readonly unlimited = input(false);

  protected readonly faAppleWhole = faAppleWhole;
  protected readonly faGripVertical = faGripVertical;
  protected readonly faDroplet = faDroplet;

  /** Vrai si l'élément représente le produit virtuel « Eau ». */
  protected readonly isWater = computed(() => isWaterProduct(this.product()));

  /** Sous-titre affiché pour l'eau (volume par prise). */
  protected readonly subtitle = computed(() => `${this.product().unitWeight} ml / prise`);

  protected readonly containerClass = computed(() => {
    const base = 'flex items-center gap-2.5 rounded-xl px-2.5 py-2 transition-colors';
    if (!this.unlimited() && this.remaining() <= 0) return `${base} opacity-50`;
    return this.isWater()
      ? `${base} bg-sky-50 ring-1 ring-inset ring-sky-100 cursor-grab hover:bg-sky-100 active:cursor-grabbing`
      : `${base} bg-slate-50 cursor-grab hover:bg-brand-50 active:cursor-grabbing`;
  });

  protected readonly iconWrapClass = computed(() => {
    const base =
      'grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-lg';
    return this.isWater() ? `${base} bg-sky-100 text-sky-500` : `${base} bg-white text-slate-300`;
  });

  protected readonly badgeClass = computed(() => {
    const base = 'shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold';
    if (this.isWater()) return `${base} bg-sky-100 text-sky-600`;
    return !this.unlimited() && this.remaining() > 0
      ? `${base} bg-brand-50 text-brand-600`
      : `${base} bg-emerald-50 text-emerald-600`;
  });
}
