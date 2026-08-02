import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { IconComponent } from '../../atoms/icon/icon.component';
import { BadgeComponent } from '../../atoms/badge/badge.component';
import { ProductStatusBadgeComponent } from '../../atoms/product-status-badge/product-status-badge.component';
import { NutrientStatComponent } from '../../atoms/nutrient-stat/nutrient-stat.component';
import type { NutritionProduct } from '../../../core/models';
import { productCapabilities } from '../../../core/utils/product-moderation.util';
import { faAppleWhole, faBoxArchive, faCheck, faPen, faTrash, faXmark } from '@fortawesome/free-solid-svg-icons';
import { faStar as faStarSolid, faNoteSticky as faNoteSolid } from '@fortawesome/free-solid-svg-icons';
import { faStar as faStarRegular, faNoteSticky as faNoteRegular } from '@fortawesome/free-regular-svg-icons';

/**
 * Molecule : carte d'un produit nutritionnel (affichage en grille).
 *
 * Affiche la photo (ou une icône par défaut), le nom, la marque, la catégorie
 * et la composition via des atomes {@link NutrientStatComponent}.
 * Émet `edit` et `delete` pour les actions.
 */
@Component({
  selector: 'ui-nutrition-product-card',
  standalone: true,
  imports: [IconComponent, BadgeComponent, ProductStatusBadgeComponent, NutrientStatComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article
      class="flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-colors hover:border-brand-300"
    >
      <div class="flex items-start gap-3 p-4">
        <div
          class="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50 text-slate-300"
        >
          @if (product().image) {
            <img [src]="product().image" [alt]="product().name" class="h-full w-full object-cover" />
          } @else {
            <ui-icon [icon]="faAppleWhole" size="xl" />
          }
        </div>
        <div class="min-w-0 flex-1">
          <h3 class="truncate font-semibold text-slate-900">{{ product().name }}</h3>
          <p class="truncate text-sm text-slate-500">{{ product().brand }}</p>
          <div class="mt-1.5 flex flex-wrap items-center gap-1.5">
            @if (categoryLabel()) {
              <ui-badge tone="accent">{{ categoryLabel() }}</ui-badge>
            }
            @if (showStatus()) {
              <ui-product-status-badge [status]="product().moderationStatus" [showApproved]="isAdmin()" />
            }
          </div>
        </div>
        <div class="flex shrink-0 items-center gap-1">
          @if (showPersonalActions()) {
            <button
              type="button"
              class="grid h-8 w-8 place-items-center rounded-lg transition-colors"
              [class.text-amber-400]="product().favorite"
              [class.hover:bg-amber-50]="true"
              [class.text-slate-300]="!product().favorite"
              [class.hover:text-amber-400]="!product().favorite"
              (click)="toggleFavorite.emit(product())"
              [attr.aria-pressed]="product().favorite"
              [attr.aria-label]="product().favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'"
              [title]="product().favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'"
            >
              <ui-icon [icon]="product().favorite ? faStarSolid : faStarRegular" size="sm" />
            </button>
            <button
              type="button"
              class="grid h-8 w-8 place-items-center rounded-lg transition-colors hover:bg-brand-50"
              [class.text-brand-500]="product().comment"
              [class.text-slate-300]="!product().comment"
              [class.hover:text-brand-600]="true"
              (click)="editNote.emit(product())"
              [attr.aria-label]="product().comment ? 'Modifier ma note' : 'Ajouter une note'"
              [title]="product().comment ? 'Modifier ma note' : 'Ajouter une note'"
            >
              <ui-icon [icon]="product().comment ? faNoteSolid : faNoteRegular" size="sm" />
            </button>
          }
          @if (caps().canApprove) {
            <button
              type="button"
              class="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-emerald-50 hover:text-emerald-600"
              (click)="approve.emit(product())"
              aria-label="Valider le produit"
              title="Valider"
            >
              <ui-icon [icon]="faCheck" size="sm" />
            </button>
          }
          @if (caps().canReject) {
            <button
              type="button"
              class="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
              (click)="reject.emit(product())"
              aria-label="Refuser le produit"
              title="Refuser"
            >
              <ui-icon [icon]="faXmark" size="sm" />
            </button>
          }
          @if (caps().canArchive) {
            <button
              type="button"
              class="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-amber-50 hover:text-amber-600"
              (click)="archive.emit(product())"
              aria-label="Archiver le produit"
              title="Archiver"
            >
              <ui-icon [icon]="faBoxArchive" size="sm" />
            </button>
          }
          @if (caps().canEdit) {
            <button
              type="button"
              class="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-brand-50 hover:text-brand-600"
              (click)="edit.emit(product())"
              aria-label="Modifier le produit"
            >
              <ui-icon [icon]="faPen" size="sm" />
            </button>
          }
          @if (caps().canDelete) {
            <button
              type="button"
              class="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
              (click)="delete.emit(product())"
              aria-label="Supprimer le produit"
            >
              <ui-icon [icon]="faTrash" size="sm" />
            </button>
          }
        </div>
      </div>

      <div class="mt-auto grid grid-cols-3 gap-2 border-t border-slate-100 p-4">
        <ui-nutrient-stat label="Poids" [value]="product().unitWeight" unit="g" />
        <ui-nutrient-stat label="Énergie" [value]="product().energy" unit="kcal" />
        <ui-nutrient-stat label="Glucides" [value]="product().carbs" unit="g" />
        <ui-nutrient-stat label="Lipides" [value]="product().fats" unit="g" />
        <ui-nutrient-stat label="Protéines" [value]="product().proteins" unit="g" />
        <ui-nutrient-stat label="Sodium" [value]="product().sodium" unit="mg" />
      </div>

      @if (showPersonalActions() && product().comment) {
        <div class="flex items-start gap-2 border-t border-slate-100 bg-amber-50/40 px-4 py-3">
          <ui-icon [icon]="faNoteSolid" size="sm" class="mt-0.5 shrink-0 text-amber-400" />
          <p class="min-w-0 whitespace-pre-line text-xs leading-relaxed text-slate-600">{{ product().comment }}</p>
        </div>
      }
    </article>
  `,
})
export class NutritionProductCardComponent {
  /** Produit à afficher. */
  readonly product = input.required<NutritionProduct>();
  /** Nom de la catégorie à afficher (facultatif). */
  readonly categoryLabel = input<string>('');
  /** Masque les actions d'édition/suppression (lecture seule). */
  readonly readonly = input(false);
  /** Affiche le badge de statut de modération. */
  readonly showStatus = input(false);
  /** Identifiant de l'utilisateur courant (droits d'action). */
  readonly currentUserId = input<string | null>(null);
  /** Vrai si l'utilisateur courant est administrateur. */
  readonly isAdmin = input(false);
  /** Affiche les actions personnelles (favori + note) et l'aperçu de la note. */
  readonly showPersonalActions = input(false);

  readonly edit = output<NutritionProduct>();
  readonly delete = output<NutritionProduct>();
  /** Validation d'un produit (admin). */
  readonly approve = output<NutritionProduct>();
  /** Refus d'un produit (admin). */
  readonly reject = output<NutritionProduct>();
  /** Archivage d'un produit (admin). */
  readonly archive = output<NutritionProduct>();
  /** Bascule le produit dans les favoris de l'utilisateur. */
  readonly toggleFavorite = output<NutritionProduct>();
  /** Demande d'édition de la note personnelle. */
  readonly editNote = output<NutritionProduct>();

  protected readonly faAppleWhole = faAppleWhole;
  protected readonly faPen = faPen;
  protected readonly faTrash = faTrash;
  protected readonly faCheck = faCheck;
  protected readonly faXmark = faXmark;
  protected readonly faBoxArchive = faBoxArchive;
  protected readonly faStarSolid = faStarSolid;
  protected readonly faStarRegular = faStarRegular;
  protected readonly faNoteSolid = faNoteSolid;
  protected readonly faNoteRegular = faNoteRegular;

  /** Capacités d'action sur le produit courant. */
  protected readonly caps = computed(() => {
    if (this.readonly()) {
      return { canEdit: false, canDelete: false, canApprove: false, canReject: false, canArchive: false };
    }
    return productCapabilities(this.product(), this.currentUserId(), this.isAdmin());
  });
}
